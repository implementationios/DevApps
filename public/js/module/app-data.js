AppData = (function (Events) {

  var AppData = {};

  $.extend(true, AppData, Events, {
    init: function () {
      this.bouquets = [];
      this.services = [];
      this.channels = [];
      this.catchupGroups = [];
      this.catchupsRecorded = [];
      this.bouquetsHome = [];
      this.vodCategories = [];
      this.EPG_API_KEY = CONFIG.app.epgApiKey;
      this.EPG_API_TOKEN = CONFIG.app.epgApiToken;
      this.EPG_DAYS_OFFSET = CONFIG.app.epgDaysOffset;
      this.BASE_URL = CONFIG.app.drmURL;
      this.IMAGE_URL_VOD_POSTER_LIST = CONFIG.app.imageUrlVodPosterList;
      this.IMAGE_URL_VOD_POSTER_INFO = CONFIG.app.imageUrlVodPosterInfo
      this.IMAGE_URL_VOD_ORIGINAL_IMAGE = CONFIG.app.imageUrlVodOriginalImage;
      this.allVods = [];
      this.vodRecommendedId = -1;
      this.vodRecommended = [];
      this.epgRowsOnInit = CONFIG.app.newEpgRowsOnInit;
      this.OsmsCache = [];
    },

    clearData: function (clearAll) {
      this.bouquets = [];
      
      // Si clearAll es true (logout/cambio de usuario), limpiar completamente incluyendo EPG
      if (clearAll) {
        this.services = [];
        this._preservedEPG = null;
        this.channels = [];
        this.catchupGroups = [];
        this.catchupsRecorded = [];
        this.bouquetsHome = [];
        this.vodCategories = [];
        this.allVods = [];
        this.vodRecommendedId = -1;
        this.vodRecommended = [];
        return;
      }
      
      // Preservar EPG cargada ANTES de limpiar services (solo para refresh, no para logout)
      var preservedEPG = {};
      if (this.services && this.services.length > 0) {
        this.services.forEach(function(service) {
          if (service.epgItems != null && service.epgItems.length > 0) {
            preservedEPG[service.id] = service.epgItems;
            console.log('clearData: Preservando EPG del servicio ' + service.id + ' (' + service.epgItems.length + ' eventos)');
          }
        });
      }
      
      // Verificar si ya hay EPG cargada (desde loading)
      var hasEPGData = Object.keys(preservedEPG).length > 0;
      
      if (!hasEPGData) {
        this.services = [];
        console.log('clearData: Limpiando services (no hay EPG cargada)');
      } else {
        // Si hay EPG, preservar services pero limpiar otros datos
        console.log('clearData: Preservando services (EPG ya cargada: ' + Object.keys(preservedEPG).length + ' servicios)');
        // NO limpiar services si hay EPG, solo limpiar otros datos
      }
      
      this.channels = [];
      this.catchupGroups = [];
      this.catchupsRecorded = [];
      this.bouquetsHome = [];
      this.vodCategories = [];
      this.allVods = [];
      this.vodRecommendedId = -1;
      this.vodRecommended = [];
      
      // Guardar EPG preservada para restaurarla después si es necesario
      this._preservedEPG = preservedEPG;
    },

    isEPGAlreadyLoaded: function () {
      if (!this.services || this.services.length === 0) {
        return false;
      }

      var loadedCount = 0;
      var channelsWithEpgStream = 0;
      var maxCheck = Math.min(this.epgRowsOnInit || 7, this.services.length);
      
      for (var i = 0; i < maxCheck; i++) {
        // Solo considerar canales que DEBERÍAN tener EPG
        if (this.services[i].epgStreamId !== 0 && 
            this.services[i].epgStreamId !== null && 
            this.services[i].epgStreamId !== "0") {
          channelsWithEpgStream++;
          if (this.services[i].epgItems != null && 
              Array.isArray(this.services[i].epgItems) && 
              this.services[i].epgItems.length > 0) {
            loadedCount++;
          }
        }
      }

      // Si no hay canales con epgStreamId válido, no consideramos la EPG cargada
      if (channelsWithEpgStream === 0) {
        console.log('isEPGAlreadyLoaded: No hay canales con EPG disponible para cargar');
        return false;
      }

      // Si al menos el 50% de los canales esperados con EPG tienen datos, consideramos que está cargada
      var isLoaded = loadedCount >= Math.ceil(channelsWithEpgStream / 2);
      
      console.log('isEPGAlreadyLoaded: ' + (isLoaded ? 'EPG detectada' : 'EPG NO detectada') + 
                  ' (' + loadedCount + ' de ' + channelsWithEpgStream + ' canales con EPG disponible tienen datos cargados)');
      
      return isLoaded;
    },

    getDataForServicesTV: function (callback) {
      if (this.bouquets && this.bouquets.length > 0 && this.services && this.services.length > 0) {
        console.log('getDataForServicesTV: Utilizando bouquets y servicios de la caché de memoria');
        var self = this;
        self.bouquetsHome = self.prepareServicesAndBouquetsData(function (data) {
          data.sort(function (a, b) {
            return a.priority - b.priority;
          });
          callback(data);
        });
        return;
      }

      this.bouquets = [];
      
      // Usar EPG preservada de clearData() si existe, sino preservar antes de refrescar
      var preservedEPG = this._preservedEPG || {};
      if (Object.keys(preservedEPG).length === 0 && this.services && this.services.length > 0) {
        this.services.forEach(function(service) {
          if (service.epgItems != null && service.epgItems.length > 0) {
            preservedEPG[service.id] = service.epgItems;
            console.log('getDataForServicesTV: Preservando EPG del servicio ' + service.id + ' (' + service.epgItems.length + ' eventos)');
          }
        });
      }
      
      // Solo limpiar services si no hay EPG preservada
      // Si hay EPG preservada, services ya fue preservado en clearData()
      if (Object.keys(preservedEPG).length === 0) {
        this.services = [];
      }
      this.bouquetsHome = [];
      // Limpiar referencia temporal después de usarla
      var tempPreservedEPG = preservedEPG;
      this._preservedEPG = null;

      var self = this;

      // Antes: getBouquets -> (al terminar) getAvailableStreams, en serie.
      // Ahora: ambas peticiones no dependen entre sí (el cruce ocurre después,
      // en prepareServicesAndBouquetsData), así que se lanzan en paralelo
      // para ahorrar una vuelta completa de red antes de empezar la EPG.
      function requestBouquets() {
        return new Promise(function (resolve, reject) {
          cv.getBouquets(function (bouquets) { resolve(bouquets); }, function (err) { reject(err); });
        });
      }
      function requestStreams() {
        return new Promise(function (resolve, reject) {
          cv.getAvailableStreams(function (services) { resolve(services); }, function (err) { reject(err); });
        });
      }

      Promise.all([requestBouquets(), requestStreams()]).then(function (results) {
        self.bouquets = results[0];
        self.services = results[1];

        // translate bouquets title
        self.bouquets.forEach(function (bouquet, index) {
          self.bouquets[index].name = __(bouquet.name);
        });

        // Restaurar EPG preservada
        if (Object.keys(tempPreservedEPG).length > 0) {
          console.log('getDataForServicesTV: Restaurando EPG preservada a ' + Object.keys(tempPreservedEPG).length + ' servicios');
          self.services.forEach(function(service) {
            if (tempPreservedEPG[service.id]) {
              service.epgItems = tempPreservedEPG[service.id];
              console.log('getDataForServicesTV: EPG restaurada para servicio ' + service.id + ' (' + tempPreservedEPG[service.id].length + ' eventos)');
            }
          });
        }

        self.bouquetsHome = self.prepareServicesAndBouquetsData(function (data) {
          // ordenar los bouquets segun la prioridad
          data.sort(function (a, b) {
            return a.priority - b.priority;
          })
          callback(data);
        });
      }).catch(function (err) {
        console.error('getDataForServicesTV: error cargando bouquets/streams en paralelo', err);
        callback([]);
      });
    },

    getCatchupGroups: function (callback) {
      var self = this;
      cv.getCatchupGroups(function (catchupGroups) {
        // Ordenar catchupGroups por el valor de lcn
        catchupGroups.sort(function (a, b) {
          return a.lcn - b.lcn;
        });

        self.catchupGroups = catchupGroups;

        self.catchupGroups = self.sortByLcn(self.catchupGroups);

        self.getCatchupEvents(callback);
      }, function () {
        callback([]);
      });
    },

    getCatchupEvents: function (callback) {
      var self = this;
      var catchupGroupsCount = this.catchupGroups.length;

      if (catchupGroupsCount <= 0) {
        callback(self.catchupGroups);
        return;
      }

      // Antes: fan-out sin límite (una petición por grupo, todas a la vez) y el
      // callback final se disparaba solo cuando el ÚLTIMO índice del array
      // resolvía, no cuando TODOS terminaban (podía devolver datos incompletos
      // si un grupo anterior tardaba más que el último). Ahora: mismo patrón de
      // lotes de 5 en paralelo que ya se usa para la EPG, y el callback solo se
      // dispara cuando todos los lotes terminaron de verdad.
      var indices = [];
      for (var i = 0; i < catchupGroupsCount; i++) { indices.push(i); }
      var batchSize = 5;

      function downloadCatchupGroupEvents(idx) {
        var catchupGroup = self.catchupGroups[idx];
        return new Promise(function (resolve) {
          cv.getCatchupEvents(catchupGroup.epgStreamId, function (events) {
            events.forEach(function (event, evIndex) {
              events[evIndex].catchupGroupId = catchupGroup.catchupGroupId;
              events[evIndex].startDate = event.start != null ? moment(new Date(event.start)).utc(true) : null;
              events[evIndex].endDate = event.start != null ? moment(new Date(event.start)).utc(true).add(event.duration, "seconds") : null;
            });
            self.catchupGroups[idx].events = events;
            resolve();
          }, function () {
            // Si falla un grupo puntual, no bloquear el resto del lote/lineup.
            self.catchupGroups[idx].events = self.catchupGroups[idx].events || [];
            resolve();
          });
        });
      }

      function processNextBatch(batchIndex) {
        if (batchIndex >= indices.length) {
          callback(self.catchupGroups);
          return Promise.resolve();
        }

        var batchIndices = indices.slice(batchIndex, batchIndex + batchSize);
        var promises = batchIndices.map(function (idx) {
          return downloadCatchupGroupEvents(idx);
        });

        return Promise.all(promises).then(function () {
          return processNextBatch(batchIndex + batchSize);
        }).catch(function (err) {
          console.error("Error en procesamiento de lote de catchup, continuando:", err);
          return processNextBatch(batchIndex + batchSize);
        });
      }

      processNextBatch(0);
    },

    getCatchupsRecorded: function (callback) {

      var self = this;

      this.catchupsRecorded = [];

      cv.getCatchupsRecorded(function (catchupsRecorded) {
        self.catchupsRecorded = self.prepareDataForCatchupsRecorded(catchupsRecorded);
        callback(self.catchupsRecorded);
      }, function () {
        callback([]);
      });

    },

    getVOD: function (callback) {

      var self = this;

      this.vodCategories = [];
      this.allVods = [];
      this.vodRecommendedId = -1;
      this.vodRecommended = []

      cv.getVOD(function (library) {
        // filter only category group type 5 and type 6 and get only categories
        library = library.length > 0 ? library[0] : [];
        var groupsType5 = library.categoryGroups != null ? library.categoryGroups.filter(function (item) { return item.type == 5 || item.type == 6; }) : [];
        groupsType5.forEach(function (groups) {
          self.vodCategories = self.vodCategories.concat(groups.categories);
        });

        var vodRecommended = library.categoryGroups != null ? library.categoryGroups.filter(function (item) { return item.type == 6; }) : [];
        if (vodRecommended.length > 0) {
          self.vodRecommendedId = vodRecommended[0].id
        }

        //self.vodCategories = self.vodCategories != null && self.vodCategories.length > 0 ? self.vodCategories[0] : [];

        self.vodCategories.forEach(function (category, index) {
          self.vodCategories[index].name = __(category.name);
        });

        self.callGetVODContent(0, [], callback);

      }, function () {
        callback([]);
      });

    },

    callGetVODContent: function (offset, allVods, callback) {
      var self = this;

      if (offset > 1000) {
        callback(self.prepareDataForVOD(allVods));
        return;
      }

      cv.getVODContent(offset, function (vods) {
        if (vods != null && vods.length > 0) {
          allVods = allVods.concat(vods);
          self.callGetVODContent((offset + 100), allVods, callback);
        } else {
          callback(self.prepareDataForVOD(allVods));
        }
      }, function () {
        callback(self.prepareDataForVOD(allVods));
      });
    },

    prepareDataForVOD: function (vods) {
      var self = this;
      var filtered = [];

      this.vodCategories.forEach(function (category, index, arrray) {
        filtered = vods.filter(function (vod) {
          return vod.categories.indexOf(category.id) >= 0;
        });

        // set vod images
        filtered.forEach(function (vod, index) {
          if (vod.image1Id != null) {
            filtered[index].posterListURL = self.IMAGE_URL_VOD_POSTER_LIST.replace("%base_url%", self.BASE_URL).replace("%image_id%", vod.image1Id);
            filtered[index].posterInfoURL = self.IMAGE_URL_VOD_POSTER_INFO.replace("%base_url%", self.BASE_URL).replace("%image_id%", vod.image1Id);
          }

          if (vod.image2Id != null) {
            filtered[index].extraImageURL = self.IMAGE_URL_VOD_ORIGINAL_IMAGE.replace("%base_url%", self.BASE_URL).replace("%image_id%", vod.image2Id)
          }

          if (vod.image3Id != null) {
            filtered[index].backgroundImageURL = self.IMAGE_URL_VOD_ORIGINAL_IMAGE.replace("%base_url%", self.BASE_URL).replace("%image_id%", vod.image3Id);
          }

          filtered[index].baseImageUrl = self.IMAGE_URL_VOD_ORIGINAL_IMAGE.replace("%base_url%", self.BASE_URL).replace("%image_id%", "{id}");
        });

        self.vodCategories[index].vods = filtered;
        self.allVods = [].concat(self.allVods, filtered);
      });

      var series = vods.filter(function (vod) { return vod.isSeries });
      if (series.length > 0 && this.vodCategories.length > 0) {

        series.sort(function (a, b) {
          return a.name != null ? ((a.name > b.name) ? 1 : ((a.name < b.name) ? -1 : 0)) : 0;
        });

        this.vodCategories.push({ id: 0, name: __("Séries"), vods: series });
        self.allVods = self.allVods.concat(series);
      }

      if (this.vodRecommended >= 0) {
        var filtered = this.vodCategories.filter(function (category) { return category.id == self.vodRecommendedId });
        if (filtered.length > 0) {
          this.vodRecommended = filtered[0].vods;
        }
      }
      this.vodCategories = this.vodCategories.filter(function (category) { return category.id != self.vodRecommendedId });

      this.vodCategories.sort(function (a, b) {
        return a.name != null ? ((a.name > b.name) ? 1 : ((a.name < b.name) ? -1 : 0)) : 0;
      });
      return this.vodCategories;
    },

    getVodRecommended: function () {
      return this.vodRecommended;
    },

    prepareDataForCatchupsRecorded: function (catchupsRecorded) {

      var self = this;

      var catchups = catchupsRecorded.filter(function (catchup) {
        return catchup.mode == 4 && catchup.catchupId > 0 && !catchup.deleted;
      });

      catchups.forEach(function (item, index, array) {
        var filtered = self.catchupGroups.filter(function (group) { return group.events != null && group.events.filter(function (event) { return event.id == item.catchupId }).length > 0; });
        if (filtered.length > 0) {
          filtered = filtered[0];
          var events = filtered.events.filter(function (event) { return event.id == item.catchupId });

          catchups[index].event = events[0];
          catchups[index].image = filtered.img;
          catchups[index].lcn = filtered.lcn;
          catchups[index].catchupName = filtered.name;
        }
      });

      catchups = catchups.filter(function (catchup) { return catchup.event != null });
      catchups.sort(function (a, b) {
        return a.startDate != null ? ((a.startDate > b.startDate) ? 1 : ((a.startDate < b.startDate) ? -1 : 0)) : 0;
      });

      return catchups;
    },

    prepareServicesAndBouquetsData: function (callback) {

      var self = this;

      self.channels = this.services;
      // 1. sort services by lcn (channel number)
      self.channels.sort(function (a, b) {
        if (a.lcn > b.lcn) {
          return 1;
        }
        if (a.lcn < b.lcn) {
          return -1;
        }

        return 0;
      });
      // 2. filter services without lcn.
      //var tvChannelsNoNumber = channels.filter(channel => channel.lcn == 0);
      var tvChannelsNoNumber = self.channels.filter(function (channel) {
        return channel.lcn == 0;
      });

      // 3. create list "channels" ordered by channel number and channels without number at the end of list
      //channels = channels.filter(channel => channel.lcn != 0);
      self.channels = self.channels.filter(function (channel) {
        return channel.lcn != 0;
      });

      self.channels = self.channels.concat(tvChannelsNoNumber);

      // 4. Iterate bouquets list and set 'services filtered by bouquet' to items property.
      this.bouquets.forEach(function (bouquet, index, array) {
        //var filtered = self.services.filter(channel => channel.bouquetIds.includes(bouquet.bouquetId));
        var filtered = self.services.filter(function (channel) {
          return channel.bouquetIds.indexOf(bouquet.bouquetId) >= 0;
        });
        self.bouquets[index].items = filtered;
      });
      // 5. create a bouquet with title "Channels" and set "channels" to items property, append to bouquets list
      var bouquetAllChannels = [{
        bouquetId: "106",
        description: "",
        items: self.channels,
        name: __("ServicesAndTVTVChannels"),
        priority: "1",
      }]

      var list = bouquetAllChannels.concat(this.bouquets);
      //list = list.filter(bouquet => bouquet.items.length > 0);
      list = list.filter(function (bouquet) {
        return bouquet.items.length > 0;
      });

      //this.bouquets = this.bouquets.unshift(bouquetAllChannels);
      // 6. Return boquets list
      console.log(list);
      callback(list);
    },

    getServicesTVFavoritedAsChannels: function () {
      var favorites = User.getServicesTVFavorited();
      var bouquetFavorites = null;
      var self = this;
      if (favorites.length > 0) {
        var servicesTVFavorited = [];
        favorites.forEach(function (lcn, index, array) {
          var channel = self.channels.filter(function (channel) {
            return channel.lcn == lcn;
          });

          if (channel != null && channel.length > 0) {
            servicesTVFavorited.push(channel[0]);
          }
        });

        if (servicesTVFavorited.length > 0) {
          bouquetFavorites = {
            bouquetId: "-1",
            description: "",
            items: servicesTVFavorited,
            name: __("ServicesAndTVFavorites"),
            priority: "1",
          }
        }
      }
      return bouquetFavorites;
    },

    getServiceTV: function (id) {
      //var filtered = this.services.filter(channel => channel.id == id);
      var filtered = this.services.filter(function (channel) {
        return channel.id == id;
      });
      if (filtered.length > 0) {
        return filtered[0];
      }
      return false;
    },

    getServiceTVByStreamId: function (streamId) {
      //var filtered = this.services.filter(channel => channel.id == id);
      var filtered = this.services.filter(function (channel) {
        return channel.epgStreamId == streamId;
      });
      if (filtered.length > 0) {
        return filtered[0];
      }
      return false;
    },

    getServiceTVByChannelNumber: function (number) {
      var filtered = this.services.filter(function (channel) {
        return channel.lcn == number;
      });
      if (filtered.length > 0) {
        return filtered[0];
      } else {
        var lessDiff = 0;
        var lessId = 0;
        $.each(this.services, function (i, service) {
          if (Math.abs(service.lcn - number) < lessDiff || lessDiff == 0) {
            lessDiff = Math.abs(service.lcn - number);
            lessId = service.id;
          }
        });

        if (lessId > 0) {
          filtered = this.getServiceTV(lessId);
          if (filtered != false) {
            return filtered;
          }
        }
      }
      return false;
    },

    getBouquetById: function (id) {
      //var filtered = this.services.filter(channel => channel.id == id);
      var filtered = this.bouquets.filter(function (channel) {
        return channel.bouquetId == id;
      });
      if (filtered.length > 0) {
        return filtered[0];
      }
      return false;
    },

    getNextPrevServiceTV: function (channel, addIndex) {

      var index = this.channels.indexOf(channel);
      var newIndex = index + addIndex;

      if (newIndex >= this.channels.length) {
        newIndex = 0;
      } else if (newIndex < 0) {
        newIndex = this.channels.length - 1;
      }

      return this.channels[newIndex];
    },

    getCatchup: function (id) {
      var filtered = this.catchupGroups.filter(function (catchup) {
        return catchup.epgStreamId == id;
      });

      if (filtered.length > 0) {
        return filtered[0];
      }
      return false;
    },

    getCatchupByEventId: function (id) {
      var result = false;
      $.each(this.catchupGroups, function (i, group) {
        if (typeof group.events != 'undefined') {
          $.each(group.events, function (j, event) {
            if (event.id == id) {
              result = event;
              return;
            }
          });
        }
      });

      return result;
    },

    getCatchupEvent: function (group, id) {
      var groups = this.catchupGroups.filter(function (catchup) {
        return catchup.epgStreamId == group;
      });

      if (groups.length > 0) {
        var filtered = groups[0].events.filter(function (event) {
          return event.eventId == id;
        });

        return filtered.length > 0 ? filtered[0] : false;
      }
      return false;
    },

    getCatchupGroup: function (groupId) {

      var groups = this.catchupGroups.filter(function (catchup) {
        return catchup.catchupGroupId == groupId;
      });

      return (groups.length > 0 ? groups[0] : false);
    },

    getVODItem: function (id, callback) {
      var self = this;
      var vod = this.allVods.filter(function (vod) {
        return vod.id == id;
      });

      if (vod == null || vod.length == 0 || vod[0] == null) {
        if (typeof callback != 'undefined') {
          callback(false);
          return;
        } else {
          return false;
        }
      }

      vod = vod[0];

      if (typeof callback == 'undefined') {
        return vod;
      }

      var index = self.allVods.indexOf(vod);

      if (vod.isSeries) {
        if (vod.seasons == null || vod.seasons.length == 0) {

          cv.getVodSeriesInfo(vod.id, function (data) {
            self.allVods[index].seasons = data.seasons;
            // self.vodCategories[indexCategory].vods[indexVod].seasons = data.seasons;
            console.log(data);
            console.log("=========================================");
            callback(self.allVods[index]);
          }, function () {
            self.allVods[index].seasons = [];
            console.log("ERROR");
            console.log("=========================================");

            callback(self.allVods[index]);
          });
        } else {
          callback(vod);
        }
      } else {
        callback(vod);
      }
    },

    getFirstCategory: function (categories) {
      var filtered = [];
      var self = this;
      categories.forEach(function (categoryId) {
        if (filtered.length == 0) {
          filtered = self.vodCategories.filter(function (item) { return categoryId == item.id });
        }
      });

      if (filtered.length > 0) {
        return filtered[0];
      }

      return null;
    },

    getCategoryById: function (id) {
      var filtered = this.vodCategories.filter(function (category) {
        return category.id == id;
      });

      if (filtered.length > 0) {
        return filtered[0];
      }

      return null;
    },

    downloadChannelEPG: function(channel, index) {
      var self = this;
      return new Promise(function(resolve) {
        if (!channel) {
          console.warn('downloadChannelEPG: Canal no existe en índice ' + index);
          resolve();
          return;
        }

        if (channel.epgItems != null && channel.epgItems.length > 0) {
          console.log("Canal " + index + " ya tiene EPG cargada (" + channel.epgItems.length + " eventos)");
          resolve();
          return;
        }

        var epgStreamId = channel.epgStreamId;
        if (epgStreamId === 0 || epgStreamId === null || epgStreamId === "0" || !epgStreamId) {
          // Punto 33: esto NO es una falla -- el canal simplemente no tiene
          // EPG configurada. Se distingue de una falla real (timeout/error
          // de red más abajo) con epgLoadFailed para poder mostrarle al
          // usuario un mensaje distinto ("sin programación" vs "no se pudo
          // cargar, reintenta más tarde") en vez de tratarlos igual.
          channel.epgItems = []; // Marcar como procesado
          channel.epgLoadFailed = false;
          resolve();
          return;
        }

        var url = self.getEPGURL(epgStreamId);
        if (!url || url.length === 0) {
          channel.epgItems = [];
          channel.epgLoadFailed = false;
          resolve();
          return;
        }

        var resolved = false;
        var todayDate = getTodayDate();

        // Timeout de seguridad individual de 30 segundos
        var safetyTimeout = setTimeout(function() {
          if (!resolved) {
            resolved = true;
            console.warn("EPG Download TIMEOUT (30s) para canal " + index + " (id: " + channel.id + ")");
            channel.epgItems = []; // Marcar como vacío
            channel.epgLoadFailed = true;
            resolve();
          }
        }, 30000);

        cv.getEPG(url, function (data) {
          if (resolved) return;
          resolved = true;
          clearTimeout(safetyTimeout);

          var eventsFiltered = [];
          if (data && Array.isArray(data)) {
            data.forEach(function (event) {
              var startDate = event.start != null ? moment(event.start).utc(true) : null;
              var endDate = event.end != null ? moment(event.end).utc(true) : null;

              // Antes se medía Math.abs(startDate - todayDate) <= epgHoursLimit,
              // es decir la distancia se calculaba siempre desde el INICIO del
              // evento, en ambos sentidos. Con canales que usan bloques largos
              // (p.ej. 12hs, como "multiplustv"), un evento recién terminado
              // ya tenía su startDate a >epgHoursLimit horas de "ahora" por su
              // propia duración, y se descartaba casi apenas terminaba -- por
              // eso el canal parecía no tener nunca eventos pasados. Ahora se
              // usan diffs con signo: cuánto falta para que empiece (positivo
              // si es futuro) contra el límite, y cuánto pasó desde que
              // terminó (positivo si ya terminó) contra el mismo límite, por
              // separado. Un evento que ya terminó se mantiene visible como
              // "pasado" hasta epgHoursLimit horas después de su endDate, sin
              // importar cuánto haya durado.
              if (startDate != null && endDate != null) {
                var hoursUntilStart = startDate.diff(todayDate, "hours", true);
                var hoursSinceEnd = todayDate.diff(endDate, "hours", true);

                // Si la marca tiene epgPast habilitado (columna "Antes"), no
                // recortamos el pasado por epgHoursLimit -- se guarda todo
                // evento ya terminado que haya venido en la respuesta del
                // CDN (el límite real termina siendo pastDays/epgDaysOffset,
                // que es lo que se le pide al servidor). Si epgPast está
                // apagado, se mantiene el corte de siempre.
                var pastOk = CONFIG.app.epgPast || hoursSinceEnd <= CONFIG.app.epgHoursLimit;

                if (hoursUntilStart <= CONFIG.app.epgHoursLimit && pastOk) {
                  event.startDate = startDate;
                  event.endDate = endDate;
                  eventsFiltered.push(event);
                }
              }
            });
          }

          channel.epgItems = eventsFiltered;
          // Respuesta recibida y procesada correctamente (aunque venga
          // vacía: eso es "sin programación", no una falla de carga).
          channel.epgLoadFailed = false;
          resolve();
        }, function (error) {
          if (resolved) return;
          resolved = true;
          clearTimeout(safetyTimeout);

          console.log("ERROR load EPG (" + index + ") (" + url + ") " + error);
          channel.epgItems = [];
          channel.epgLoadFailed = true;
          resolve();
        }, { ignoreAbort: true });
      });
    },

    getEPGByBouquet: function (callback, index, onProgress) {
      if (this.services.length <= 0) {
        callback(this.services);
        return;
      }

      var self = this;
      var totalToLoad = Math.min(this.services.length, this.epgRowsOnInit || this.services.length);
      var startIndex = (typeof index === 'number' && index >= 0) ? index : 0;

      // Crear un array de índices a cargar a partir del startIndex
      var indices = [];
      for (var i = startIndex; i < totalToLoad; i++) {
        indices.push(i);
      }

      // onProgress es opcional (compatibilidad con llamadas existentes que no
      // lo pasan). Se invoca una vez por lote terminado, no por polling, con
      // (canalesConEpgCargados, totalACargar) para alimentar una barra de
      // progreso real sin costo de setInterval.
      var loadedSoFar = 0;
      var notifyProgress = (typeof onProgress === 'function') ? onProgress : function () {};

      var batchSize = 5;

      function processNextBatch(batchIndex) {
        if (batchIndex >= indices.length) {
          console.log("Carga paralela de EPG finalizada para todos los lotes");
          self.epgLoaded(callback);
          return Promise.resolve();
        }

        var batchIndices = indices.slice(batchIndex, batchIndex + batchSize);
        console.log("Procesando lote EPG: canales " + batchIndices.join(", "));

        var promises = batchIndices.map(function(idx) {
          return self.downloadChannelEPG(self.services[idx], idx);
        });

        return Promise.all(promises).then(function() {
          loadedSoFar += batchIndices.length;
          notifyProgress(Math.min(loadedSoFar, indices.length), indices.length);
          // Procesar el siguiente lote y retornar la promesa para evitar advertencias de Bluebird
          return processNextBatch(batchIndex + batchSize);
        }).catch(function(err) {
          console.error("Error en procesamiento de lote EPG, continuando:", err);
          loadedSoFar += batchIndices.length;
          notifyProgress(Math.min(loadedSoFar, indices.length), indices.length);
          return processNextBatch(batchIndex + batchSize);
        });
      }

      return processNextBatch(0);
    },

    epgLoaded: function (callback) {
      // rebuild bouquets data with services with epg items and send to home to refresh data displayed
      console.log("EPG loaded");
      console.log(this.services);

      callback(this.services);
    },

    sortByLcn: function (list) {
      list.sort(function (a, b) {
        if (a.lcn > b.lcn) {
          return 1;
        }
        if (a.lcn < b.lcn) {
          return -1;
        }

        return 0;
      });

      return list;
    },

    getEPGURL: function (streamId) {

      var epgCdnUrl = User.epgCdnUrl;
      var operatorName = User.operatorName;


      if (epgCdnUrl.length > 0 && operatorName) {
        var accessToken = CryptoJS.SHA256(this.EPG_API_KEY + operatorName + this.EPG_API_KEY + streamId + this.EPG_API_KEY).toString();

        return epgCdnUrl + "/?pid=guest.home.login&requestMode=download&d=epg"
          + "&apiToken=" + this.EPG_API_TOKEN
          + "&accessToken=" + accessToken
          + "&operator=" + operatorName
          + "&epgStreamId=" + streamId
          + "&pastDays=" + this.EPG_DAYS_OFFSET
          + "&unzipped=true"
          + "&oldMode=true";
      }

      return "";
    },

    getTopLevelVodM3u8Url: function (vodId, callback) {
      cv.getTopLevelVodM3u8Url(vodId, function (url) {
        callback(url);
      }, function () {
        callback("");
      });
    },

    getTopLevelCatchupM3u8Url: function (catchupId, callback) {
      cv.getTopLevelCatchupM3u8Url(catchupId, function (url) {
        callback(url);
      }, function () {
        callback("");
      });
    },

    getTopLevelStreamM3u8Url: function (streamId, callback) {
      cv.getTopLevelStreamM3u8Url(streamId, function (url) {
        callback(url);
      }, function () {
        callback("");
      });
    },

    getLiveEvent: function (serviceTV) {
      if (serviceTV.epgItems && serviceTV.epgItems.length > 0) {
        var todayDate = getTodayDate();
        var lives = serviceTV.epgItems.filter(function (event) {
          if (event.startDate && event.endDate) {
            return todayDate.isBetween(event.startDate, event.endDate)
          }
          return false;
        });

        return lives.length > 0 ? lives[0] : null;
      }
      return null;
    },

    getNextEvent: function (serviceTV, live) {
      if (serviceTV.epgItems && serviceTV.epgItems.length > 0) {
        var next = serviceTV.epgItems.filter(function (event) {
          return event.startDate && event.endDate && event.startDate >= live.endDate;
        });

        return next.length > 0 ? next[0] : null;
      }
      return null;
    },

    recordCatchup: function (catchupId, callback) {
      cv.recordOrDeleteCatchup(catchupId, false, function (response) {
        callback(response);
      }, function () {
        callback(false);
      });
    },

    deleteCatchup: function (catchupId, callback) {
      var catchupRecorded = this.getCatchupRecorded(catchupId);
      if (catchupRecorded !== false) {
        cv.recordOrDeleteCatchup(catchupRecorded.recordingTaskId, true, function (response) {
          callback(response);
        }, function () {
          callback(false);
        });
      } else {
        callback(false);
      }
    },

    getCatchupRecordingsMinutesUsed: function () {
      var duration = 0;
      this.catchupsRecorded.forEach(function (catchup, index, array) {
        duration += catchup.event.duration;
      });

      return (duration / 60);
    },

    canRecordCatchup: function (eventId) {
      var catchup = this.getCatchupByEventId(eventId);

      if (catchup !== false) {
        var toUse = this.getCatchupRecordingsMinutesUsed() + (catchup.duration / 60);
        return toUse <= (CONFIG.app.catchupRecordingHoursLimit * 60);
      }

      return false;
    },

    isCatchupRecorded: function (catchupId) {
      var results = this.catchupsRecorded.filter(function (catchup) {
        return catchup.catchupId == catchupId;
      });

      if (results.length > 0) {
        return results[0];
      }

      return false;
    },

    getCatchupRecorded: function (catchupId) {
      var result = this.catchupsRecorded.filter(function (catchup) {
        return catchup.catchupId = catchupId;
      });

      return result.length > 0 ? result[0] : false;
    },

    getSimilarVOD: function (id) {

      var mainVod = this.getVODItem(id);
      var similar = [];
      var similarIds = [];

      $.each(this.vodCategories, function (x, category) {
        $.each(category.vods, function (y, vod) {
          $.each(vod.categories, function (z, categoryId) {
            if (mainVod.id != vod.id && categoryId != 2 && mainVod.categories.indexOf(categoryId) >= 0 && similarIds.indexOf(vod.id) < 0) {
              similarIds.push(vod.id);
              similar.push(vod);
            }
          });
        });
      });

      return similar;
    },

    getNextEpisode: function (serie, currentSeasonId, currentEpisodeId) {
      var season = serie.seasons.filter(function (season) { return season.id == currentSeasonId });

      if (season.length > 0) {
        season = season[0];
      } else {
        return null;
      }

      var episode = season.episodes.filter(function (episode) { return episode.id == currentEpisodeId });

      if (episode.length > 0) {
        episode = episode[0];
      } else {
        return null;
      }

      var currentEpisodeNumber = episode.episodeNumber;
      var nextEpisode = season.episodes.filter(function (episode) { return episode.episodeNumber == (currentEpisodeNumber + 1) });

      if (nextEpisode.length > 0) {
        var next = nextEpisode[0];
        next.seasonId = currentSeasonId;
        return next;
      } else {
        var currentSeasonNumber = season.seasonNumber;
        var nextSeason = serie.seasons.filter(function (season) { return season.seasonNumber == (currentSeasonNumber + 1) });

        if (nextSeason.length > 0 && nextSeason[0].episodes != null && nextSeason[0].episodes.length > 0) {
          var next = nextSeason[0].episodes[0];
          next.seasonId = nextSeason[0].id;
          return next;
        }
      }

      return null;
    },

    getVodObject: function (id) {
      var category = this.vodCategories.filter(function (category) { return category.id == 6; })

      if (category.length > 0) {
        category = category[0];

        var vod = category.vods.filter(function (vod) { return vod.id == id; });

        if (vod.length > 0) {
          return vod[0];
        }
      } else {
        var vods = this.allVods.filter(function (vod) { return vod.id == id; });
        if (vods != null && vods.length > 0) {
          return vods[0];
        }
      }

      return null;
    },

    getNextCatchup: function (prevEventId) {
      var result = false;
      $.each(this.catchupGroups, function (i, group) {
        if (typeof group.events != 'undefined') {
          $.each(group.events, function (j, event) {
            if (event.eventId == prevEventId) {
              if ((j - 1) >= 0 && (j - 1) < group.events.length) {
                result = group.events[j - 1];
              }
              return;
            }
          });
        }
      });

      return result;
    },

    getAds: function (callback) {
      // Llamar a la función de `cv` para obtener los anuncios
      cv.getAds(function (ads) {
          console.log("Ads fetched from CV:", ads);

          // Filtrar los anuncios que coincidan con el tipo de anuncio deseado
          var filteredAds = ads.filter(function (ad) {
              return ad && ad.targetKey === "html5";
          });

          // Procesar los anuncios recibidos
          var processedAds = filteredAds.map(function (ad) {
              return {
                  actionUrl: ad.actionUrl || null, // URL opcional para clics
                  activationTime: ad.activationTime ? new Date(ad.activationTime) : null, // Fecha de activación
                  groupId: ad.adGroupId,
                  id: ad.adId,
                  file: ad.advertFile, // Archivo del anuncio
                  cdnGroupId: ad.cdnGroupId, // ID del grupo CDN
                  dismissTime: ad.dismissTimeS || 0, // Tiempo antes de permitir descartar
                  displayTime: ad.displayTimeS || 0, // Tiempo de visualización
                  expiryTime: ad.expiryTime ? new Date(ad.expiryTime) : null,
                  genericData: ad.genericData || null, // Datos genéricos opcionales
                  isGeneral: ad.isGeneral || false, // Indica si es un anuncio general o específico
                  locationKey: ad.locationKey || null, // Clave de ubicación
                  locationType: ad.locationType, // Tipo de ubicación (1 = home)
                  name: ad.name, // Nombre del anuncio
                  targetKey: ad.targetKey, // Clave de destino (html5, etc.)
                  targetType: ad.targetType, // Tipo de destino (1 = URL, etc.)
                  text: ad.text || null, // Texto del anuncio
                  type: ad.type // Tipo de anuncio (1 = imagen, etc.)
              };
          });

          console.log("Processed Ads:", processedAds);

          // Retornar los datos procesados a través del callback
          callback(processedAds);
      }, function (error) {
          console.error("Error fetching ads:", error);

          // En caso de error, devolver un array vacío
          callback([]);
      });
    },

    getAllServices: function () {
      return this.services;
    },

    getSimpleEpgByChannel: function (id, callback) {
      var index = -1;
      var filtered = this.services.filter(function (channel, i) {
        if (channel.id == id) {
          index = i;
          return channel;
        }
      });

      if (index >= 0) {
        this.getSimpleEpgByChannelIndex(index, callback);
      }
    },

    getSimpleEpgByChannelIndex: function (index, callback) {
      // if (this.services.length <= 0) {
      //     callback(this.services);
      //     return;
      // }

      var self = this;
      var startDate = null;
      var endDate = null;
      var todayDate = getTodayDate();
      var eventsFiltered = [];
      
      // Verificar que el canal existe
      if (!this.services || index < 0 || index >= this.services.length) {
        console.warn('getSimpleEpgByChannelIndex: Índice inválido o canal no existe (index: ' + index + ')');
        callback();
        return;
      }
      
      var channel = this.services[index];
      var epgStreamId = channel.epgStreamId;
      
      // Verificar si epgItems ya está definido (ya se procesó este canal)
      if (typeof channel.epgItems !== 'undefined') {
        console.log('getSimpleEpgByChannelIndex: EPG ya cargada para canal ' + channel.id + ' (index: ' + index + ', eventos: ' + (channel.epgItems ? channel.epgItems.length : 0) + ')');
        callback();
        return;
      }
      
      // Verificar si el canal tiene un epgStreamId válido
      if (epgStreamId === 0 || epgStreamId === null || epgStreamId === "0" || !epgStreamId) {
        console.log('getSimpleEpgByChannelIndex: Canal ' + channel.id + ' (index: ' + index + ') no tiene EPG disponible (epgStreamId=' + epgStreamId + '), marcando como procesado');
        channel.epgItems = []; // Marcar como procesado para evitar intentos futuros
        callback();
        return;
      }
      
      // Verificar si este canal debería haberse cargado en loading.js
      // Si está dentro del rango epgRowsOnInit y no tiene EPG, probablemente no tiene eventos disponibles
      var shouldHaveBeenLoaded = index < (this.epgRowsOnInit || 7);
      if (shouldHaveBeenLoaded) {
        console.log('getSimpleEpgByChannelIndex: Canal ' + channel.id + ' (index: ' + index + ') debería haberse cargado en loading pero no tiene EPG, probablemente no tiene eventos disponibles. Marcando como procesado.');
        channel.epgItems = []; // Marcar como procesado para evitar descargas innecesarias
        callback();
        return;
      }
      
      var url = self.getEPGURL(epgStreamId);
      console.log('getSimpleEpgByChannelIndex: Descargando EPG para canal ' + channel.id + ' (index: ' + index + ', epgStreamId: ' + epgStreamId + ') - Canal fuera del rango inicial de carga');
      console.log("Load EPG for ", url);

      // Diagnóstico: esta carga diferida (se dispara al navegar hacia abajo
      // en epg.js y llegar a un canal fuera del rango precargado) NO tenía
      // ningún timeout, a diferencia de downloadChannelEPG (carga inicial
      // masiva, que sí tiene uno de 30s). Si esta petición nunca resolvía
      // (red lenta, request colgado, etc.), el callback nunca se llamaba y
      // epg.js quedaba con this.loading trabado para siempre -- arriba/abajo
      // dejaban de responder hasta reiniciar la app. Se usa un timeout más
      // corto (10s) que el de la carga masiva porque acá el usuario está
      // esperando activamente con el control remoto, no es una carga de
      // fondo; App.throbber() ya está visible mientras tanto (ver
      // drawNewRow en epg.js) así que no es una espera "muda".
      var resolved = false;
      var safetyTimeout = setTimeout(function () {
        if (resolved) return;
        resolved = true;
        console.warn('getSimpleEpgByChannelIndex: TIMEOUT (10s) para canal ' + channel.id + ' (index: ' + index + ')');
        channel.epgItems = [];
        callback();
      }, 10000);

      cv.getEPG(url, function (data) {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimeout);

        // eventsFiltered = data.filter(function(event) {
        //     startDate = event.start != null ? moment(event.start).utc(true) : null;
        //     endDate = event.end != null ? moment(event.end).utc(true) : null;

        //     if (startDate != null && endDate != null && startDate.isSame(todayDate, "day")) {
        //         //getTimeDifference(startDate, todayDate, "hours") <= 24) {
        //         event.startDate = startDate;
        //         event.endDate = endDate;
        //         //eventsFiltered.push(event);
        //         return event;
        //     }
        // });

        data.forEach(function (event) {
          startDate = event.start != null ? moment(event.start).utc(true) : null;
          endDate = event.end != null ? moment(event.end).utc(true) : null;

          // Mismo fix que downloadChannelEPG: diffs con signo por separado
          // para inicio (futuro) y fin (pasado), en vez de Math.abs sobre el
          // inicio, y mismo bypass de epgPast -- ver comentario detallado allá.
          if (startDate != null && endDate != null) {
            var hoursUntilStart = startDate.diff(todayDate, "hours", true);
            var hoursSinceEnd = todayDate.diff(endDate, "hours", true);
            var pastOk = CONFIG.app.epgPast || hoursSinceEnd <= CONFIG.app.epgHoursLimit;

            if (hoursUntilStart <= CONFIG.app.epgHoursLimit && pastOk) {
              event.startDate = startDate;
              event.endDate = endDate;
              eventsFiltered.push(event);
            }
          }
        });

        if (index < self.services.length) {
          self.services[index].epgItems = eventsFiltered;
          console.log('getSimpleEpgByChannelIndex: EPG cargada para canal ' + channel.id + ' (index: ' + index + ', eventos: ' + eventsFiltered.length + ')');
        }

        callback();

        // if ((index + 1) >= self.services.length || index >= 7) {
        //     self.epgLoaded(callback);
        // } else {
        //     self.getEPGByBouquet(callback, index + 1);
        // }
      }, function (error) {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimeout);

        console.log("ERROR load EPG (" + index + ") (" + url + ")" + error);

        if (error != "abort") {
          self.services[index].epgItems = [];
        }

        callback();
        // if ((index + 1) >= self.services.length) {
        //     self.epgLoaded(callback);
        // } else {
        //     self.getEPGByBouquet(callback, index + 1);
        // }
      });
    },

    getServiceTVByCatchupObj: function(catchupObj) {
      if (catchupObj) {
        var group = AppData.getCatchupGroup(catchupObj.catchupGroupId);
        if (group && group.epgStreamId) {
          var serviceTVObj = AppData.getServiceTVByStreamId(group.epgStreamId);
          if (serviceTVObj) {
            return serviceTVObj;
          }
        }
      }

      return null;
    },

    getLocalTimeFromServer: function(callback) {
      var tz = "";
      try {
        if (window.Intl && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions) {
          tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        }
      } catch (e) {
        tz = "";
      }

      // Detectar si estamos en un entorno de desarrollo local o Heroku
      // Si estamos en un servidor estático (como cPanel, Apache o Nginx de la empresa),
      // evitamos llamar a /api/server-time que devolverá 404 y causará demoras o errores de CORS en Smart TVs.
      var hostname = (window.location && window.location.hostname) || "";
      var isLocal = /(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.|^$)/.test(hostname);
      var isHeroku = /herokuapp\.com/.test(hostname);

      if (!isLocal && !isHeroku) {
        console.log("Static server detected, bypassing /api/server-time");
        // Devolver la hora local del dispositivo usando moment
        var localMoment = moment();
        callback({
          localTime: localMoment.format("YYYY-MM-DD HH:mm:ss"),
          datetime: localMoment.toISOString(),
          timeServer: localMoment.toISOString(),
          utcOffset: localMoment.utcOffset()
        });
        return;
      }

      cv.performRequest(
        "/api/server-time?timezone=" + encodeURIComponent(tz),
        [],
        function(result) {
          console.log("Server time fetched:", result);
          callback(result);
        },
        function(error) {
          console.log("Server time fetched ERROR:", error);
          callback("");
        });
    },

    getOsms: function (callbackSuccess, callbackError) {
      var self = this;
      
      // Si solo se pasa un callback, se usa como callbackSuccess
      // y en error se llama con array vacío
      var hasErrorCallback = typeof callbackError === 'function';
      
      // Llamada al método getOsms definido en el objeto cv
      cv.getOsms(
        function (osms) {
          // Validación de respuesta
          if (!Array.isArray(osms)) {
            console.error("Error: El parámetro 'osms' no es un arreglo:", osms);
            self.OsmsCache = []; // Guardar en caché
            
            if (hasErrorCallback) {
              callbackError("Error: La respuesta no es un array válido.");
            } else {
              callbackSuccess([]); // Si no hay callbackError, retorna array vacío
            }
            return;
          }
          
          // Guardar en caché (datos crudos)
          self.OsmsCache = osms || [];
          
          // Procesar datos: mapear y formatear
          var processedOsms = osms.map(function(osm) {
            return {
              id: osm.id,
              licenseKey: osm.licenseKey,
              time: osm.time ? new Date(osm.time) : null,
              message: osm.message
            };
          });
          
          console.log("Mensajes OSM obtenidos correctamente:", processedOsms);
          
          // Retornar datos procesados
          callbackSuccess(processedOsms);
        },
        function (error) {
          // Manejo de errores
          console.error("Error al obtener los mensajes OSM:", error);
          self.OsmsCache = []; // Limpiar caché en caso de error
          
          if (hasErrorCallback) {
            callbackError("Error al obtener los mensajes OSM.");
          } else {
            callbackSuccess([]); // Si no hay callbackError, retorna array vacío
          }
        }
      );
    },

  });

  AppData.init();

  return AppData;
})(Events);
