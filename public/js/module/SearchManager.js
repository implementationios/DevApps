/**
 * SearchManager - Módulo para gestionar la búsqueda de contenido
 * Maneja la búsqueda de canales, VOD, catchups y programación EPG (en vivo/
 * próxima) con mejoras de performance y UX, más historial de búsquedas
 * recientes persistido en localStorage.
 */
SearchManager = (function () {
  var SearchManager = {};

  // Configuración
  var DEBOUNCE_DELAY = 300; // ms
  var MIN_QUERY_LENGTH = 1; // Longitud mínima de búsqueda

  var RECENT_SEARCHES_KEY = "epg_search_recent_v1";
  var MAX_RECENT_SEARCHES = 8;
  var MIN_RECENT_QUERY_LENGTH = 2; // no vale la pena guardar búsquedas de 1 letra

  // Variables internas
  var debounceTimer = null;
  var searchCallbacks = {
    onError: null
  };
  var recentSearchesMemoryFallback = []; // usado si localStorage no está disponible

  /**
   * Inicializa el SearchManager
   * @param {Object} callbacks - Callbacks para eventos
   * @param {Function} callbacks.onError - Callback cuando hay error
   */
  SearchManager.init = function (callbacks) {
    if (callbacks) {
      searchCallbacks.onError = callbacks.onError;
    }
  };

  /**
   * Obtiene todos los catchups aplanados desde catchupGroups
   * Corrige el bug donde catchups era un array de arrays
   * @returns {Array} Array plano de eventos catchup
   */
  function getAllCatchups() {
    if (!AppData.catchupGroups || AppData.catchupGroups.length === 0) {
      return [];
    }

    var allCatchups = [];
    AppData.catchupGroups.forEach(function (group) {
      // Validar que el grupo tenga events y sea un array
      if (group.events && Array.isArray(group.events)) {
        group.events.forEach(function (event) {
          // Asegurar que cada evento tenga la información necesaria
          if (event && event.name) {
            allCatchups.push(event);
          }
        });
      }
    });

    return allCatchups;
  }

  /**
   * Obtiene el título de un evento de EPG. El feed puede traer el título
   * dentro de "languages[0].title" o directamente en "title" (mismo campo
   * que usa EPGCards.js para pintar la card del evento).
   * @param {Object} event - Evento de epgItems
   * @returns {String} Título del evento o cadena vacía
   */
  function getEpgEventTitle(event) {
    if (!event) return "";
    if (event.languages && event.languages.length > 0 && event.languages[0].title) {
      return event.languages[0].title;
    }
    if (event.title) return event.title;
    return "";
  }

  /**
   * Para cada canal con EPG, busca el evento EN VIVO (ahora) y, si no hay o
   * además del actual, el PRÓXIMO evento. Esto permite responder búsquedas
   * del tipo "qué canal está dando tal programa" o "en qué canal sigue tal
   * programa", algo que antes no existía (solo se buscaba en VOD/catchup y
   * nombre/LCN de canal, nunca en la programación en vivo).
   * @returns {Array} Array de { service: Object, event: Object, isLive: Boolean }
   */
  function getEpgSearchCandidates() {
    var candidates = [];
    var services = AppData.services || [];
    if (services.length === 0) return candidates;

    var now = getTodayDate();

    services.forEach(function (service) {
      if (!service || !service.epgItems || service.epgItems.length === 0) return;

      var liveEvent = null;
      var nextEvent = null;

      for (var i = 0; i < service.epgItems.length; i++) {
        var ev = service.epgItems[i];
        if (!ev || !ev.startDate || !ev.endDate) continue;

        if (!liveEvent && now.isSameOrAfter(ev.startDate) && now.isBefore(ev.endDate)) {
          liveEvent = ev;
        } else if (!nextEvent && ev.startDate.isAfter(now)) {
          // epgItems viene ordenado cronológicamente, así que el primer
          // evento futuro que encontramos ya es el más próximo.
          nextEvent = ev;
        }

        if (liveEvent && nextEvent) break;
      }

      if (liveEvent) {
        candidates.push({ service: service, event: liveEvent, isLive: true });
      }
      if (nextEvent) {
        candidates.push({ service: service, event: nextEvent, isLive: false });
      }
    });

    return candidates;
  }

  /**
   * Calcula la relevancia de un resultado de búsqueda
   * @param {String} text - Texto a buscar
   * @param {String} query - Query de búsqueda
   * @returns {Number} Puntuación de relevancia (mayor = más relevante)
   */
  function calculateRelevance(text, query) {
    if (!text || !query) return 0;

    var lowerText = text.toLowerCase();
    var lowerQuery = query.toLowerCase();
    var score = 0;

    // Coincidencia exacta (mayor prioridad)
    if (lowerText === lowerQuery) {
      score += 1000;
    }
    // Empieza con la query (alta prioridad)
    else if (lowerText.indexOf(lowerQuery) === 0) {
      score += 500;
    }
    // Contiene la query (prioridad media)
    else if (lowerText.indexOf(lowerQuery) !== -1) {
      score += 100;
    }

    // Bonus por coincidencia de palabras completas
    var queryWords = lowerQuery.split(/\s+/).filter(function (word) {
      return word.length > 0;
    });
    var textWords = lowerText.split(/\s+/);

    queryWords.forEach(function (queryWord) {
      textWords.forEach(function (textWord) {
        if (textWord === queryWord) {
          score += 50;
        } else if (textWord.indexOf(queryWord) === 0) {
          score += 25;
        }
      });
    });

    // Penalizar resultados más largos (preferir coincidencias más cortas)
    score -= Math.floor(text.length / 10);

    return score;
  }

  /**
   * Calcula la relevancia cuando la búsqueda coincide por LCN (número de canal)
   * @param {Number} lcn - LCN del servicio
   * @param {String} query - Query de búsqueda
   * @returns {Number} Puntuación de relevancia (0 si no aplica)
   */
  function calculateRelevanceLcn(lcn, query) {
    if (lcn == null || lcn === "" || !query) return 0;
    var lcnStr = String(lcn);
    var queryStr = query.trim();
    if (queryStr.length === 0) return 0;
    // Coincidencia exacta por número (ej: "101" con lcn 101)
    var queryNum = Number(queryStr);
    if (queryStr === String(queryNum) && lcn === queryNum) {
      return 600;
    }
    // LCN empieza con la query (ej: "10" con lcn 101)
    if (lcnStr.indexOf(queryStr) === 0) {
      return 400;
    }
    // LCN contiene la query
    if (lcnStr.indexOf(queryStr) !== -1) {
      return 150;
    }
    return 0;
  }

  /**
   * Normaliza un resultado para tener una estructura consistente
   * @param {Object} item - Item a normalizar
   * @param {String} type - Tipo de contenido (service, vod, catchup, epg)
   * @returns {Object} Item normalizado
   */
  function normalizeResult(item, type) {
    if (!item || !item.name) {
      return null;
    }

    var normalized = {
      id: item.id,
      name: item.name,
      type: type,
      relevance: 0
    };

    // Obtener logo/metadata según el tipo
    switch (type) {
      case "service":
        normalized.logo = item.img || "";
        normalized.isLive = true; // un canal "es" su transmisión en vivo
        break;
      case "vod":
        normalized.logo = item.backgroundImageURL || item.img || "";
        normalized.isSeries = !!item.isSeries;
        break;
      case "catchup":
        normalized.logo = item.imageUrl || item.img || "";
        normalized.catchupGroupId = item.catchupGroupId;
        break;
      default:
        normalized.logo = item.img || item.imageUrl || item.backgroundImageURL || "";
    }

    return normalized;
  }

  /**
   * Normaliza un candidato de EPG (canal + evento en vivo/próximo) a la
   * misma estructura que el resto de resultados. A diferencia de un
   * resultado "service" (donde name = nombre del canal), acá name = título
   * del programa (lo que efectivamente matcheó la búsqueda), y se guarda
   * el nombre del canal aparte para mostrarlo como subtítulo en la card.
   * @param {Object} candidate - { service, event, isLive }
   * @returns {Object|null}
   */
  function normalizeEpgResult(candidate) {
    var title = getEpgEventTitle(candidate.event);
    if (!title) return null;

    return {
      id: candidate.service.id,
      name: title,
      channelName: candidate.service.name || "",
      type: "epg",
      relevance: 0,
      logo: candidate.service.img || "",
      isLive: !!candidate.isLive,
      eventStart: candidate.event.startDate,
      eventEnd: candidate.event.endDate
    };
  }

  /**
   * Filtra y ordena los resultados de búsqueda
   * @param {String} query - Query de búsqueda
   * @returns {Array} Array de resultados ordenados por relevancia
   */
  SearchManager.search = function (query) {
    // Limpiar timer anterior
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    return new Promise(function (resolve, reject) {
      debounceTimer = setTimeout(function () {
        try {
          var results = performSearch(query);
          resolve(results);
        } catch (error) {
          console.error("Error en búsqueda:", error);
          if (searchCallbacks.onError) {
            searchCallbacks.onError(error);
          }
          reject(error);
        }
      }, DEBOUNCE_DELAY);
    });
  };

  /**
   * Ejecuta la búsqueda sin debounce (para uso interno)
   * @param {String} query - Query de búsqueda
   * @returns {Array} Array de resultados ordenados por relevancia
   */
  function performSearch(query) {
    var results = [];

    // Validar query
    if (!query || typeof query !== "string") {
      return results;
    }

    var trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return results;
    }

    var lowerQuery = trimmedQuery.toLowerCase();

    // Obtener datos
    var services = AppData.services || [];
    var vods = AppData.allVods || [];
    var catchups = getAllCatchups();
    var epgCandidates = getEpgSearchCandidates();

    // Filtrar y calcular relevancia para cada tipo
    var allResults = [];

    // Filtrar Canales (por nombre y por LCN)
    services.forEach(function (service) {
      if (!service) return;
      var matchByName = service.name && service.name.toLowerCase().indexOf(lowerQuery) !== -1;
      var lcnRelevance = calculateRelevanceLcn(service.lcn, trimmedQuery);
      var matchByLcn = lcnRelevance > 0;
      if (matchByName || matchByLcn) {
        var normalized = normalizeResult(service, "service");
        if (normalized) {
          var nameRelevance = matchByName ? calculateRelevance(service.name, trimmedQuery) : 0;
          normalized.relevance = Math.max(nameRelevance, lcnRelevance);
          allResults.push(normalized);
        }
      }
    });

    // Filtrar VOD
    vods.forEach(function (vod) {
      if (vod && vod.name) {
        var lowerName = vod.name.toLowerCase();
        if (lowerName.indexOf(lowerQuery) !== -1) {
          var normalized = normalizeResult(vod, "vod");
          if (normalized) {
            normalized.relevance = calculateRelevance(vod.name, trimmedQuery);
            allResults.push(normalized);
          }
        }
      }
    });

    // Filtrar Catchups
    catchups.forEach(function (catchup) {
      if (catchup && catchup.name) {
        var lowerName = catchup.name.toLowerCase();
        if (lowerName.indexOf(lowerQuery) !== -1) {
          var normalized = normalizeResult(catchup, "catchup");
          if (normalized) {
            normalized.relevance = calculateRelevance(catchup.name, trimmedQuery);
            allResults.push(normalized);
          }
        }
      }
    });

    // Filtrar programación EPG en vivo/próxima (título del programa)
    epgCandidates.forEach(function (candidate) {
      var title = getEpgEventTitle(candidate.event);
      if (!title) return;
      if (title.toLowerCase().indexOf(lowerQuery) === -1) return;
      var normalized = normalizeEpgResult(candidate);
      if (normalized) {
        normalized.relevance = calculateRelevance(title, trimmedQuery) + (normalized.isLive ? 20 : 0);
        allResults.push(normalized);
      }
    });

    // Ordenar por relevancia (mayor a menor)
    allResults.sort(function (a, b) {
      return b.relevance - a.relevance;
    });

    return allResults;
  }

  /**
   * Búsqueda inmediata sin debounce (útil para casos especiales)
   * @param {String} query - Query de búsqueda
   * @returns {Array} Array de resultados ordenados por relevancia
   */
  SearchManager.searchImmediate = function (query) {
    try {
      return performSearch(query);
    } catch (error) {
      console.error("Error en búsqueda inmediata:", error);
      if (searchCallbacks.onError) {
        searchCallbacks.onError(error);
      }
      return [];
    }
  };

  /**
   * Limpia el timer de debounce
   */
  SearchManager.clearDebounce = function () {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  // ============================================
  // HISTORIAL DE BÚSQUEDAS RECIENTES
  // ============================================
  // Persistido en localStorage; si no está disponible (algunos WebViews de
  // TV lo restringen), se degrada a un array en memoria que dura mientras
  // la app esté abierta, sin romper la función.

  function readRecentFromStorage() {
    try {
      var raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return recentSearchesMemoryFallback.slice();
    }
  }

  function writeRecentToStorage(list) {
    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
    } catch (e) {
      recentSearchesMemoryFallback = list.slice();
    }
  }

  /**
   * @returns {Array<String>} búsquedas recientes, más nueva primero
   */
  SearchManager.getRecentSearches = function () {
    return readRecentFromStorage();
  };

  /**
   * Agrega una query al historial (dedupe case-insensitive, la mueve al
   * frente si ya existía). Ignora queries vacías o muy cortas.
   * @param {String} query
   */
  SearchManager.addRecentSearch = function (query) {
    if (!query || typeof query !== "string") return;
    var trimmed = query.trim();
    if (trimmed.length < MIN_RECENT_QUERY_LENGTH) return;

    var list = readRecentFromStorage();
    var lowerTrimmed = trimmed.toLowerCase();
    list = list.filter(function (q) {
      return String(q).toLowerCase() !== lowerTrimmed;
    });
    list.unshift(trimmed);
    if (list.length > MAX_RECENT_SEARCHES) {
      list = list.slice(0, MAX_RECENT_SEARCHES);
    }
    writeRecentToStorage(list);
  };

  /**
   * Borra todo el historial de búsquedas recientes.
   */
  SearchManager.clearRecentSearches = function () {
    writeRecentToStorage([]);
  };

  return SearchManager;
})();
