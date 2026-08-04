var Osms = (function () {
  var AppData = null;
  var cachedElements = {};
  var currentOsms = [];
  var currentDetailOsm = null;
  var osmsCache = []; // Cache de mensajes OSM

  var module = {
    init: function (appDataInstance) {
      AppData = appDataInstance;
      this.initializeDOM();
      this.bindEvents();
      return this;
    },

    // Inicializar referencias DOM
    initializeDOM: function() {
      this.$osmsContainer = $("#osmsList");
      this.$osmsDialog = $("#osmsDialog");
      this.$osmsDetailContainer = $("#osmsDetailContainer");
      this.$videoContainer = $("#divVideoContainer");
      this.$lastFocusedOsmItem = null;
      this.$lastFocused = null;
    },

    // Bindear eventos globales
    bindEvents: function() {
      var self = this;

      // Event listener para cerrar dialog desde footer
      $("#closeOsmsDialogFooter").off("click").on("click", function() {
        self.closeOsmsDialog();
      });

      // Prevenir scroll del fondo cuando el diálogo está abierto
      $(document).off("wheel.osms touchmove.osms").on("wheel.osms touchmove.osms", function(e) {
        if (!self.$osmsDialog.hasClass("hidden")) {
          // Prevenir scroll solo si el evento no viene del diálogo
          if (!$(e.target).closest(".dialog-osms").length) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      });
    },

    // Cleanup al destruir
    destroy: function() {
      $(document).off("keydown.osms wheel.osms touchmove.osms");
      cachedElements = {};
      currentOsms = [];
      currentDetailOsm = null;
      this.hideAllContainers();
    },

    // Ocultar todos los contenedores
    hideAllContainers: function() {
      if (this.$osmsDialog) this.$osmsDialog.addClass("hidden");
      if (this.$osmsDetailContainer) this.$osmsDetailContainer.addClass("hidden");
      $("body").removeClass("no-scroll");
      $("#viewport").removeClass("no-scroll");
      $("html").removeClass("no-scroll");
    },

    // Obtener y actualizar mensajes OSM (reemplaza getDataForOsms)
    getAndUpdateOsms: function(callback) {
      var self = this;
      
      if (!AppData || typeof AppData.getOsms !== 'function') {
        console.error("AppData no inicializado correctamente para OSM.");
        osmsCache = [];
        this.updateCounter([]);
        if (typeof callback === 'function') callback([]);
        return;
      }

      AppData.getOsms(
        function (osms) {
          console.log("Mensajes OSM obtenidos correctamente:", osms);
          osmsCache = osms || [];
          
          // Actualizar contador
          self.updateCounter(osms);
          
          if (typeof callback === 'function') callback(osms);
        },
        function (error) {
          console.error("Error al obtener los mensajes OSM:", error);
          osmsCache = [];
          self.updateCounter([]);
          if (typeof callback === 'function') callback([]);
        }
      );
    },

    // Obtener cache de mensajes
    getCache: function() {
      return osmsCache;
    },

    // Obtener y renderizar OSMs (mantener para compatibilidad)
    getDataForOsms: function (callback) {
      var self = this;

      if (!AppData || typeof AppData.getOsms !== 'function') {
        console.error("AppData no inicializado correctamente para OSM.");
        if (typeof callback === 'function') callback();
        return;
      }

      // Usar getOsms con un solo callback (se comportará como getOSMS anterior)
      AppData.getOsms(function (osms) {
        console.log("OSMs received:", osms);

        // Validar y procesar OSMs
        var validOsms = self.validateAndProcessOsms(osms);

        if (validOsms.length > 0) {
          self.renderOsmsList(validOsms);
        } else {
          self.showNoMessagesState();
        }

        if (typeof callback === 'function') callback();
      });
      // No se pasa callbackError, la función manejará el error internamente
    },

    // Validar y procesar OSMs
    validateAndProcessOsms: function(osms) {
      if (!Array.isArray(osms)) {
        console.error("El parámetro 'osms' no es un arreglo:", osms);
        return [];
      }

      // Calcular la fecha límite: 30 días atrás desde hoy
      var now = new Date();
      var thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 días en milisegundos

      return osms.filter(function(osm) {
        // Validaciones básicas
        if (!osm || typeof osm !== 'object' || !osm.id || !(osm.message || osm.message === '')) {
          return false;
        }
        
        // Filtrar por fecha: solo mensajes con fecha inferior a 30 días (más recientes que hace 30 días)
        if (osm.time) {
          var messageDate = new Date(osm.time);
          // Solo incluir mensajes que sean más recientes que hace 30 días
          return messageDate >= thirtyDaysAgo;
        }
        
        // Si no tiene fecha, no incluirlo
        return false;
      }).map(function(osm) {
        return {
          id: osm.id,
          licenseKey: osm.licenseKey || null,
          time: osm.time ? new Date(osm.time) : null,
          message: osm.message || ''
        };
      });
    },

    // Renderizar lista de OSMs
    renderOsmsList: function(osms) {
      var self = this;

      // Aplicar filtro de 30 días antes de renderizar
      var filteredOsms = this.validateAndProcessOsms(osms);
      
      currentOsms = filteredOsms;
      this.$osmsContainer.empty();
      $(".osm-item.item-focus").removeClass("item-focus");

      // Crear elementos de la lista solo con mensajes filtrados
      filteredOsms.forEach(function(osm, index) {
        var $item = self.createOsmItem(osm, index);
        self.$osmsContainer.append($item);
      });

      // Establecer foco en el primer elemento
      this.setInitialFocus();

      // Mostrar dialog
      this.showOsmsDialog();
    },

    // Crear elemento individual de OSM
    createOsmItem: function(osm, index) {
      var self = this;
      var cacheKey = 'osm_item_' + osm.id;

      // Verificar cache
      if (cachedElements[cacheKey]) {
        var $cachedItem = cachedElements[cacheKey].clone(true);
        $cachedItem.attr('data-index', index);
        return $cachedItem;
      }

      // Crear preview del mensaje
      var preview = this.createMessagePreview(osm.message);

      // Formatear fecha
      var formattedDate = this.formatDate(osm.time);

      var $item = $("<div>", {
        class: "osm-item focusable",
        "data-id": osm.id,
        "data-index": index,
        html: "<div class='osm-date'>" + formattedDate + "</div>" +
              "<div class='osm-preview'>" + preview + "</div>"
      });

      // Bindear evento click
      $item.on("click", function() {
        self.showOsmsDetail(osm);
      });

      // Bindear evento de foco
      $item.on("focus", function() {
        self.$lastFocusedOsmItem = $item;
        $(".osm-item.item-focus").removeClass("item-focus");
        $item.addClass("item-focus");
      });

      // Cachear elemento
      cachedElements[cacheKey] = $item.clone(true);

      return $item;
    },

    // Crear preview del mensaje
    createMessagePreview: function(message) {
      if (!message || message.trim() === '') {
        return __("OsmsNoMessagesFound");
      }

      var maxLength = 50;
      return message.length > maxLength ?
             message.slice(0, maxLength) + "..." :
             message;
    },

    // Formatear fecha
    formatDate: function(date) {
      if (!date) {
        return __("OsmsDetailDateLabel");
      }

      try {
        return new Date(date).toLocaleString();
      } catch (e) {
        console.error("Error formatting date:", e);
        return __("OsmsDetailDateLabel");
      }
    },

    // Establecer foco inicial
    setInitialFocus: function() {
      var $firstItem = this.$osmsContainer.find(".osm-item:first");
      if ($firstItem.length) {
        $firstItem.addClass("item-focus");
        Focus.to($firstItem);
        $(".dialog-osms-body").scrollTop(0);
      }
    },

    // Mostrar dialog principal
    showOsmsDialog: function() {
      this.$osmsDialog.removeClass("hidden");
      $("body").addClass("no-scroll");
      $("#viewport").addClass("no-scroll");
      $("html").addClass("no-scroll");
      $("#OsmsDialogTitle").html(__("OsmsDialogTitle"));
      $("#closeOsmsDialogFooter").html(__("OsmsCloseButton"));
    },

    // Mostrar estado sin mensajes
    showNoMessagesState: function() {
      this.$osmsContainer.html("<p>" + __("OsmsNoMessagesAvailable") + "</p>");
      this.showOsmsDialog();
    },

    // Mostrar estado de error
    showErrorState: function() {
      this.$osmsContainer.html("<p>" + __("OsmsErrorLoadingMessages") + "</p>");
      this.showOsmsDialog();
    },

    // Mostrar detalle de OSM
    showOsmsDetail: function(osm) {
      if (!osm || typeof osm !== "object") {
        console.error(__("OsmsErrorMessageNotFound"), osm);
        alert(__("OsmsErrorMessageNotFound"));
        return;
      }

      currentDetailOsm = osm;

      var detailHTML = this.createDetailHTML(osm);
      this.$osmsDetailContainer.html(detailHTML).removeClass("hidden");

      this.bindDetailEvents();
      Focus.to($("#closeOsmsDetail"));
    },

    // Crear HTML del detalle
    createDetailHTML: function(osm) {
      var formattedDate = this.formatDate(osm.time);
      var message = osm.message || __("OsmsNoMessagesFound");

      return "<div class='osms-detail'>" +
             "<h4>" + __("OsmsDetailTitle") + "</h4>" +
             "<p><strong>" + __("OsmsDetailDateLabel") + "</strong> " + formattedDate + "</p>" +
             "<p><strong>" + __("OsmsDetailMessageLabel") + "</strong> " + message + "</p>" +
             "<button id='closeOsmsDetail' class='focusable'>" + __("OsmsCloseButton") + "</button>" +
             "</div>";
    },

    // Bindear eventos del detalle
    bindDetailEvents: function() {
      var self = this;

      $("#closeOsmsDetail").off("click").on("click", function() {
        self.closeOsmsDetail();
      });
    },

    // Cerrar detalle de OSM
    closeOsmsDetail: function() {
      this.$osmsDetailContainer.addClass("hidden");
      currentDetailOsm = null;

      // Restaurar foco
      if (this.$lastFocusedOsmItem && this.$lastFocusedOsmItem.length) {
        Focus.to(this.$lastFocusedOsmItem);
      } else {
        var $firstItem = this.$osmsContainer.find(".osm-item:first");
        if ($firstItem.length) {
          Focus.to($firstItem);
        }
      }
    },

    // Cerrar dialog principal
    closeOsmsDialog: function() {
      this.hideAllContainers();
      this.$osmsContainer.empty();
      $(".item-focus").removeClass("item-focus");

      currentOsms = [];
      currentDetailOsm = null;

      // Restaurar foco a elemento anterior
      this.restorePreviousFocus();
    },

    // Restaurar foco anterior
    restorePreviousFocus: function() {
      var $fallback = $(".other-option[data-other-id='6']");
      // Solo restaurar foco al botón de OSM si está visible (no tiene clase hidden)
      if ($fallback.length && !$fallback.hasClass("hidden") && $fallback.is(":visible")) {
        Focus.to($fallback);
      } else if (this.$lastFocused && this.$lastFocused.length) {
        Focus.to(this.$lastFocused);
      } else if (this.$videoContainer && this.$videoContainer.length) {
        Focus.to(this.$videoContainer);
      }
    },

    // Actualizar contador de mensajes OSM
    // notifyIfNew: si es true y se detectan mensajes nuevos, muestra el
    // toast (ver showNewMessageToast). Se deja en false/undefined para la
    // carga inicial (getOSMSData en home.js) -- el toast es para avisar de
    // mensajes que llegan DURANTE la sesión (polling), no para el lote que
    // ya estaba esperando cuando se abrió la app.
    updateCounter: function(osms, notifyIfNew) {
      if (!osms || !Array.isArray(osms)) {
        this.hideCounter();
        return;
      }

      // Filtrar mensajes válidos (últimos 30 días)
      var now = new Date();
      var thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      var validMessages = osms.filter(function(osm) {
        if (!osm || !osm.time) return false;
        var messageDate = new Date(osm.time);
        return messageDate >= thirtyDaysAgo;
      });

      var currentCount = validMessages.length;
      
      // Si no hay mensajes, ocultar contador
      if (currentCount === 0) {
        this.hideCounter();
        Storage.set('lastOsmCount', 0);
        Storage.set('lastOsmMessageTime', null);
        return;
      }

      // Obtener estado anterior guardado
      var lastCount = parseInt(Storage.get('lastOsmCount')) || 0;
      var lastMessageTime = Storage.get('lastOsmMessageTime');
      
      // Encontrar el mensaje más reciente
      validMessages.sort(function(a, b) {
        var dateA = new Date(a.time);
        var dateB = new Date(b.time);
        return dateB - dateA;
      });
      
      var newestMessage = validMessages[0];
      var newestMessageTime = newestMessage.time;
      var newestMessageDate = new Date(newestMessageTime);

      // Determinar si hay mensajes nuevos
      var hasNewMessages = false;
      
      if (lastCount === 0) {
        // Primera vez o no había mensajes antes
        hasNewMessages = currentCount > 0;
      } else {
        // Comparar cantidad y fecha
        if (currentCount > lastCount) {
          // La cantidad subió = hay mensajes nuevos
          hasNewMessages = true;
        } else if (currentCount === lastCount && lastMessageTime) {
          // Misma cantidad, pero verificar si el último mensaje es más reciente
          var lastDate = new Date(lastMessageTime);
          hasNewMessages = newestMessageDate > lastDate;
        } else {
          // La cantidad bajó o es igual y la fecha no cambió = no hay nuevos
          hasNewMessages = false;
        }
      }

      // Mostrar contador
      this.showCounter(currentCount, hasNewMessages);

      if (notifyIfNew && hasNewMessages) {
        this.showNewMessageToast(newestMessage);
      }

      // Guardar estado actual
      Storage.set('lastOsmCount', currentCount);
      Storage.set('lastOsmMessageTime', newestMessageTime);
    },

    // Punto 30: consulta periódica de mensajes nuevos. Se guarda el
    // intervalo en la instancia para poder cancelarlo desde
    // Scene_Home.destroyScene() y no dejarlo corriendo en segundo plano
    // (mismo criterio que ya se usa para timeIntervalApp en home.js).
    startPolling: function(intervalMs) {
      var self = this;
      this.stopPolling();
      var interval = intervalMs || (5 * 60 * 1000); // 5 min por defecto
      this._pollTimer = setInterval(function() {
        self.pollForNewMessages();
      }, interval);
    },

    stopPolling: function() {
      if (this._pollTimer) {
        clearInterval(this._pollTimer);
        this._pollTimer = null;
      }
    },

    pollForNewMessages: function() {
      var self = this;
      if (!AppData || typeof AppData.getOsms !== 'function') {
        return;
      }

      // No interrumpir con un toast si el usuario ya tiene el diálogo de
      // OSM abierto -- ya está mirando los mensajes.
      if (this.$osmsDialog && !this.$osmsDialog.hasClass("hidden")) {
        return;
      }

      AppData.getOsms(
        function(osms) {
          osmsCache = osms || [];
          self.updateCounter(osms, true);
        },
        function(error) {
          console.error("Error consultando mensajes OSM nuevos (polling):", error);
        }
      );
    },

    // Punto 30: toast no modal de "llegó un mensaje nuevo". No usa
    // Focus.to() ni clase "focusable" a propósito: el control remoto debe
    // seguir navegando lo que el usuario tenía enfocado, sin interrupciones
    // (ej. mientras mira el mini-player).
    showNewMessageToast: function(message) {
      if (this._toastTimer) {
        clearTimeout(this._toastTimer);
        this._toastTimer = null;
      }
      $(".osms-toast").remove();

      var text = (typeof __ === 'function' && __("OsmsNewMessageToast")) || "Tienes un nuevo mensaje";
      var $toast = $(
        "<div class='osms-toast'>" +
          "<span class='osms-toast-icon'>&#128233;</span>" +
          "<span class='osms-toast-text'>" + text + "</span>" +
        "</div>"
      );
      $("body").append($toast);

      // Doble rAF para asegurar que el navegador pintó el estado inicial
      // (opacity:0) antes de agregar la clase que dispara la transición de
      // entrada; si no, en algunos motores la transición no se ve.
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          $toast.addClass("osms-toast-visible");
        });
      });

      this._toastTimer = setTimeout(function() {
        $toast.removeClass("osms-toast-visible");
        setTimeout(function() { $toast.remove(); }, 350);
      }, 6000);
    },

    // Mostrar contador en el botón OSM
    showCounter: function(count, hasNewMessages) {
      var $osmButton = $(".other-option[data-other-id='6']");
      
      if ($osmButton.length === 0) return;
      
      // Remover contador anterior si existe
      $osmButton.find(".osm-counter-badge").remove();
      
      // Crear badge con contador
      var $badge = $('<span class="osm-counter-badge' + (hasNewMessages ? ' has-new' : '') + '">' + count + '</span>');
      $osmButton.append($badge);
      
      if (hasNewMessages) {
        $osmButton.addClass("has-new-messages");
      } else {
        $osmButton.removeClass("has-new-messages");
      }
    },

    // Ocultar contador
    hideCounter: function() {
      var $osmButton = $(".other-option[data-other-id='6']");
      if ($osmButton.length === 0) return;
      
      $osmButton.find(".osm-counter-badge").remove();
      $osmButton.removeClass("has-new-messages");
    },

    // Marcar mensajes como vistos
    markAsSeen: function() {
      if (osmsCache && osmsCache.length > 0) {
        var now = new Date();
        var thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        var validMessages = osmsCache.filter(function(osm) {
          if (!osm || !osm.time) return false;
          var messageDate = new Date(osm.time);
          return messageDate >= thirtyDaysAgo;
        });

        if (validMessages.length > 0) {
          // Ordenar por fecha
          validMessages.sort(function(a, b) {
            var dateA = new Date(a.time);
            var dateB = new Date(b.time);
            return dateB - dateA;
          });

          var newestMessage = validMessages[0];
          
          // Guardar estado actual (sin indicador de nuevos)
          Storage.set('lastOsmCount', validMessages.length);
          Storage.set('lastOsmMessageTime', newestMessage.time);
          
          // Actualizar contador sin el indicador de "nuevos"
          this.showCounter(validMessages.length, false);
        }
      }
    },

    // Abrir lista de mensajes (unifica el flujo)
    openMessagesList: function() {
      var self = this;
      var cachedMessages = this.getCache();
      
      if (cachedMessages && cachedMessages.length > 0) {
        // Marcar como vistos
        this.markAsSeen();
        // Renderizar lista
        this.renderOsmsList(cachedMessages);
      } else {
        // Si no hay cache, obtener datos primero
        this.getAndUpdateOsms(function(osms) {
          if (osms && osms.length > 0) {
            self.markAsSeen();
            self.renderOsmsList(osms);
          } else {
            self.showNoMessagesState();
          }
        });
      }
    },
  };

  return module;
})();
