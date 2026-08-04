/**
 *
 * Módulo simple de EPG en formato cards
 * Compatible con TVs Samsung/LG 2019 (ES5)
 *
 * Interfaz idéntica a EPG tradicional para fácil integración
 */

var EPGCards = (function(Events) {
    var EPGCards = {}; 

    $.extend(true, EPGCards, Events, {

      // ============================================
      // PROPIEDADES (igual que EPG tradicional)
      // ============================================
      items: [],                    // Canales con EPG (referencia a AppData.services)
      epgLoaded: false,             // Flag de carga
      $lastEpgFocused: null,        // Último elemento con foco
      homeObject: null,             // Referencia a Scene_Home
      currentServiceFocused: null,  // Servicio actual con foco
      currentEpgItemFocused: null,  // Evento EPG actual con foco

      // DOM (selectores cacheados para mejor rendimiento)
      $epgContainer: null,
      $epgGrid: null,
      $epgTimeHeader: null,
      $defaultFocus: null,
      $channelsGrid: null,          // Cachear selector frecuente
      $body: null,                  // Cachear selector frecuente

      // Cache de fecha actual (invalidar cada segundo)
      cachedNow: null,
      cachedNowTime: 0,

      // Intervalo para actualizar eventos en transmisión
      updateIntervalId: null,

      // Offset para navegar más allá de "Más Tarde" por canal (solo afecta la 3ra columna)
      laterOffsetByChannel: null,

      // Offset para navegar más atrás en "Antes" por canal (solo afecta la 1ra columna cuando epgPast está habilitado)
      beforeOffsetByChannel: null,

      // Offset global para "Más Tarde" cuando se desea que toda la columna se mueva en bloque
      laterOffsetGlobal: 0,

      // ============================================
      // MÉTODOS PÚBLICOS (igual que EPG tradicional)
      // ============================================

      init: function() {
        this.items = [];
        this.epgLoaded = false;
        this.$lastEpgFocused = null;
        this.currentServiceFocused = null;
        this.currentEpgItemFocused = null;
        this.$epgContainer = $("#epgCardsModal");
        this.$epgGrid = $("#epgCardsGrid");
        this.$epgTimeHeader = $("#epgCardsTimeHeader");
        this.$defaultFocus = $("#divVideoContainer");
        this.$channelsGrid = $("#channelsGrid");
        this.$body = $('body');
        this.cachedNow = null;
        this.cachedNowTime = 0;
        this.updateIntervalId = null;
        this.laterOffsetByChannel = {};
        this.beforeOffsetByChannel = {};
      },

      /**
       * Obtiene la fecha actual con cache (invalidar cada segundo para mejor rendimiento)
       */
      _getNow: function() {
        var currentTime = Date.now();
        // Invalidar cache cada segundo
        if (!this.cachedNow || (currentTime - this.cachedNowTime) > 1000) {
          this.cachedNow = getTodayDate();
          this.cachedNowTime = currentTime;
        }
        return this.cachedNow;
      },

      /**
       * Escapa HTML para prevenir XSS
       */
      _escapeHtml: function(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      },

      isEmpty: function() {
        return !this.items || this.items.length === 0;
      },

      isShowed: function() {
        return this.$epgContainer && this.$epgContainer.is(":visible");
      },

      draw: function(servicesWithEPG) {
        console.log('EPGCards.draw: INICIANDO');
        console.log('EPGCards.draw: CONFIG.app.brand =', CONFIG.app.brand);
        console.log('EPGCards.draw: CONFIG.app.epgPast =', CONFIG.app.epgPast);
        console.log('EPGCards.draw: epgPast efectivo =', CONFIG.app.epgPast);
        // Usar AppData.services directamente
        this.items = servicesWithEPG || AppData.services || [];
        this.epgLoaded = this.items.length > 0;

        // Renderizar cards
        this._renderCards();
      },

      show: function() {
        if (!this.$epgContainer || this.$epgContainer.length === 0) {
          this.init();
        }

        this._applyTheme();

        // Si no hay items pero AppData tiene servicios, usarlos
        if (this.isEmpty() && AppData.services && AppData.services.length > 0) {
          this.draw(AppData.services);
        }

        // Asegurar que EPGDetails esté inicializado en el contenedor
        if (this.$epgContainer && this.$epgContainer.find(".epg-dialog-details").length === 0) {
          EPGDetails.init(this.$epgContainer);
        }

        this.$channelsGrid.hide();
        this.$epgContainer.css('display', 'block');
        this.$epgContainer.addClass('active');
        this.$body.addClass('no-scroll');

        // Iniciar actualización periódica de eventos en transmisión
        this._startUpdateInterval();

        // Enfocar primer elemento
        this._focusFirst();
      },

      hide: function() {
        if (!this.$epgContainer) return;

        // Detener actualización periódica
        this._stopUpdateInterval();

        this.$epgContainer.css('display', 'none');
        this.$epgContainer.removeClass('active');
        if (this.$body) {
          this.$body.removeClass('no-scroll');
        }
        if (this.$channelsGrid) {
          this.$channelsGrid.show();
        }
      },

      reset: function() {
        // Detener actualización periódica
        this._stopUpdateInterval();

        // NO limpiar items si AppData tiene EPG preservada
        var hasEPG = AppData.services && AppData.services.some(function(s) {
          return s.epgItems && s.epgItems.length > 0;
        });

        if (!hasEPG) {
          this.items = [];
          this.epgLoaded = false;
        }

        this.$lastEpgFocused = null;
        this.currentServiceFocused = null;
        this.currentEpgItemFocused = null;
        this.hide();

        if (this.$epgGrid) {
          this.$epgGrid.html('');
        }
      },

      navigate: function(direction) {
        console.log('EPGCards.navigate: dirección=' + direction);

        if (!this.epgLoaded || !this.isShowed()) {
          console.log('EPGCards.navigate: no cargado o no visible (epgLoaded=' + this.epgLoaded + ', isShowed=' + this.isShowed() + ')');
          return;
        }

        if (EPGDetails.isShowed()) {
          console.log('EPGCards.navigate: delegando a EPGDetails');
          EPGDetails.navigate(direction);
          return;
        }

        var $focused = Focus.focused;
        if (!$focused || !$focused.length) {
          console.log('EPGCards.navigate: no hay elemento enfocado, intentando recuperar');
          // Intentar recuperar el último foco guardado
          if (this.$lastEpgFocused && this.$lastEpgFocused.length > 0) {
            $focused = this.$lastEpgFocused;
            Focus.to($focused);
            console.log('EPGCards.navigate: foco recuperado desde último elemento');
          } else {
            // Si no hay último foco, enfocar el primer elemento disponible
            var $firstElement = this.$epgGrid.find(".epg-program-card, .epg-channel-info, .epg-action-button-small").first();
            if ($firstElement.length > 0) {
              Focus.to($firstElement);
              this.$lastEpgFocused = $firstElement;
              console.log('EPGCards.navigate: foco recuperado desde primer elemento');
            }
            return;
          }
        }

        console.log('EPGCards.navigate: elemento enfocado=', $focused.attr('class'), 'channel-index=', $focused.data('channel-index'), 'event-index=', $focused.data('event-index'));

        var $focusTo = null;

        // Cachear clase del elemento para evitar múltiples verificaciones
        var focusedClass = $focused.attr('class') || '';
        var isProgramCard = focusedClass.indexOf('epg-program-card') !== -1;
        var isChannelInfo = focusedClass.indexOf('epg-channel-info') !== -1;

        if (direction === "up") {
          console.log('EPGCards.navigate: dirección UP');
          $focusTo = this._getCardAbove($focused);
          if (!$focusTo || !$focusTo.length) {
            console.log('EPGCards.navigate: no hay elemento arriba, manteniendo foco actual');
            // Mantener el foco en el elemento actual en lugar de volver a video
            this.ensureItemVisibility($focused);
            return;
          }
        } else if (direction === "down") {
          console.log('EPGCards.navigate: dirección DOWN');
          $focusTo = this._getCardBelow($focused);
          if (!$focusTo || !$focusTo.length) {
            console.log('EPGCards.navigate: no hay elemento abajo, manteniendo foco actual');
            // Mantener el foco en el elemento actual
            this.ensureItemVisibility($focused);
            return;
          }
        } else if (direction === "left") {
          console.log('EPGCards.navigate: dirección LEFT');
          // Si es un programa, ir al programa anterior en la misma fila
          if (isProgramCard) {
            var chIdxBack = $focused.data('channel-index');
            var currentSlot = $focused.data('slot');

            // Si estamos en "Antes" y la paginación está habilitada, paginar hacia eventos más antiguos (offset +1)
            // LEFT desde "Antes" = eventos más antiguos (aumentar offset) - solo si hay más eventos antiguos
            // Requiere: epgPast habilitado (para mostrar la columna) Y epgPagesPastEnabled habilitado (para paginar)
            if (CONFIG.app.epgPast && CONFIG.app.epgPagesPastEnabled && currentSlot === 'before') {
              var nowForNav = this._getNow();
              var pastEvents = this._computePast(this.items[chIdxBack], nowForNav);
              var isGlobalPast = CONFIG.app && CONFIG.app.epgCardsPastGlobal;
              var currentOffset = isGlobalPast ? this._getBeforeOffsetGlobal() : this._getBeforeOffset(chIdxBack);
              var proposedOffset = currentOffset + 1;

              // Solo paginar si existe realmente un evento más antiguo
              if (pastEvents && proposedOffset >= 0 && proposedOffset < pastEvents.length) {
                if (isGlobalPast) {
                  this._setBeforeOffsetGlobal(proposedOffset);
                } else {
                  this._setBeforeOffset(chIdxBack, proposedOffset);
                }
                var anchorTopBackLeft = this._captureFocusRowTop($focused);
                this._renderCards();
                $focusTo = this.$epgGrid.find('.epg-program-card[data-channel-index="' + chIdxBack + '"][data-slot="before"]').first();
                // IMPORTANTE: al paginar, mantener foco en "Antes" y salir
                if ($focusTo && $focusTo.length > 0) {
                  this.$lastEpgFocused = $focusTo;
                  Focus.to($focusTo);
                  // Con epgCardsPastGlobal activo, _renderCards() recalcula la
                  // columna "Antes" de TODAS las filas a la vez, y si otra
                  // fila (arriba de la enfocada) cambia de alto, la fila
                  // enfocada se desplaza en la pantalla aunque su propio
                  // contenido no cambió. _compensateRowDrift() anula ese
                  // desplazamiento (sin saltos visibles) y ensureItemVisibility
                  // sólo corrige si, además, la fila no estaba visible.
                  this._compensateRowDrift($focusTo, anchorTopBackLeft);
                  this.ensureItemVisibility($focusTo, true);
                  return;
                }
              }
              // Si no hay más eventos antiguos para paginar, continuar con la navegación normal (ir al canal)
            }

            // Si estamos en "Más Tarde" y hay offset aplicado, retroceder la paginación
            if (currentSlot === 'later') {
              var isGlobalLater = CONFIG.app && CONFIG.app.epgCardsLaterGlobal;
              var currentLaterOffset = isGlobalLater ? this._getLaterOffsetGlobal() : this._getLaterOffset(chIdxBack);
              if (currentLaterOffset > 0) {
                var newOffset = currentLaterOffset - 1;
                if (isGlobalLater) {
                  this._setLaterOffsetGlobal(newOffset);
                } else {
                  this._setLaterOffset(chIdxBack, newOffset);
                }
                var lastChannelIndex2 = $focused.data('channel-index');
                var anchorTopLaterLeft = this._captureFocusRowTop($focused);
                this._renderCards();
                $focusTo = this.$epgGrid.find('.epg-program-card[data-channel-index="' + lastChannelIndex2 + '"][data-slot="later"]').first();
                // IMPORTANTE: al paginar hacia atrás, mantener foco en "Más Tarde" y salir
                if ($focusTo && $focusTo.length > 0) {
                  this.$lastEpgFocused = $focusTo;
                  Focus.to($focusTo);
                  // Con epgCardsLaterGlobal activo, _renderCards() recalcula la
                  // columna "Más Tarde" de TODAS las filas a la vez y otras
                  // filas pueden cambiar de alto. _compensateRowDrift() anula
                  // ese desplazamiento (sin saltos visibles) y
                  // ensureItemVisibility sólo corrige si además la fila no
                  // estaba visible.
                  this._compensateRowDrift($focusTo, anchorTopLaterLeft);
                  this.ensureItemVisibility($focusTo, true);
                  return;
                }
              }
            }

            // Incluye .epg-program-slot-empty además de .epg-program-card:
            // si la columna inmediatamente anterior existe pero está vacía
            // ("—"), hay que poder pararse ahí en vez de saltarla (antes,
            // al no matchear el selector, jQuery devolvía vacío como si no
            // hubiera nada a la izquierda).
            $focusTo = $focused.prev(".epg-program-card, .epg-program-slot-empty").length > 0 ? $focused.prev(".epg-program-card, .epg-program-slot-empty") : null;
            // Si no hay programa anterior, ir a la sección del canal
            if (!$focusTo || !$focusTo.length) {
              var channelIndex = $focused.data('channel-index');
              if (channelIndex !== undefined && channelIndex !== null) {
                $focusTo = this.$epgGrid.find('.epg-channel-info[data-channel-index="' + channelIndex + '"]').first();
              }
            }
          }
        } else if (direction === "right") {
          console.log('EPGCards.navigate: dirección RIGHT');
          // Si es la sección del canal, ir al primer programa
          if (isChannelInfo) {
            var channelIndex = $focused.data('channel-index');
            if (channelIndex !== undefined && channelIndex !== null) {
              $focusTo = this.$epgGrid.find('.epg-program-card[data-channel-index="' + channelIndex + '"]').first();
            }
          } else if (isProgramCard) {
            var currentSlot = $focused.data('slot');
            var chIdx = $focused.data('channel-index');

            // Bloquear navegación hacia eventos futuros ("Más Tarde") si la bandera está habilitada
            // - Impide entrar a la columna "Más Tarde" desde "Ahora"
            // - Impide paginar más a la derecha estando ya en "Más Tarde"
            if (CONFIG.app && CONFIG.app.epgDisableLaterNavigation) {
              if (currentSlot === 'later') {
                this.ensureItemVisibility($focused);
                return;
              }
            }

            // Si estamos en "Antes" con offset > 0 y la paginación está habilitada,
            // reducir el offset para ver eventos más recientes antes de ir a "Ahora"
            // Esto permite "volver atrás" en la paginación cuando estás en "Antes"
            // Requiere: epgPast habilitado (para mostrar la columna) Y epgPagesPastEnabled habilitado (para paginar)
            if (CONFIG.app.epgPast && CONFIG.app.epgPagesPastEnabled && currentSlot === 'before') {
              var isGlobalPastRight = CONFIG.app && CONFIG.app.epgCardsPastGlobal;
              var currentOffset = isGlobalPastRight ? this._getBeforeOffsetGlobal() : this._getBeforeOffset(chIdx);
              if (currentOffset > 0) {
                // Reducir offset para volver a eventos más recientes
                var proposedOffset = currentOffset - 1;
                if (isGlobalPastRight) {
                  this._setBeforeOffsetGlobal(proposedOffset);
                } else {
                  this._setBeforeOffset(chIdx, proposedOffset);
                }
                var anchorTopBackRight = this._captureFocusRowTop($focused);
                this._renderCards();
                $focusTo = this.$epgGrid.find('.epg-program-card[data-channel-index="' + chIdx + '"][data-slot="before"]').first();
                // IMPORTANTE: al paginar, mantener foco en "Antes" y salir
                if ($focusTo && $focusTo.length > 0) {
                  this.$lastEpgFocused = $focusTo;
                  Focus.to($focusTo);
                  // Ver comentario equivalente más arriba (paginación LEFT de
                  // "Antes") sobre _compensateRowDrift().
                  this._compensateRowDrift($focusTo, anchorTopBackRight);
                  this.ensureItemVisibility($focusTo, true);
                  return;
                }
              }
              // Si offset es 0, continuar con la navegación normal (ir a "Ahora")
            }

            // Card siguiente en la misma fila (solo si no se paginó "Antes").
            // Incluye .epg-program-slot-empty, mismo motivo que en LEFT.
            $focusTo = $focused.next(".epg-program-card, .epg-program-slot-empty").length > 0 ? $focused.next(".epg-program-card, .epg-program-slot-empty") : null;

            // Si la bandera está habilitada, impedir moverse desde "Ahora" hacia "Más Tarde"
            if (CONFIG.app && CONFIG.app.epgDisableLaterNavigation && currentSlot === 'now') {
              if ($focusTo && $focusTo.length > 0 && $focusTo.data('slot') === 'later') {
                this.ensureItemVisibility($focused);
                return;
              }
            }

            // Si estamos en "Más Tarde" y no hay más a la derecha, paginar "Más Tarde"
            if ((!$focusTo || !$focusTo.length) && currentSlot === 'later') {
              var nowForNav = this._getNow();
              var comp = this._computeNowAndFuture(this.items[chIdx], nowForNav);
              var baseLater = comp.liveIdx >= 0 ? (comp.liveIdx + 2) : 1;

              var isGlobalLaterRight = CONFIG.app && CONFIG.app.epgCardsLaterGlobal;
              var currentLaterOffsetRight = isGlobalLaterRight ? this._getLaterOffsetGlobal() : this._getLaterOffset(chIdx);
              var proposedOffset = currentLaterOffsetRight + 1;
              var proposedLaterIdx = baseLater + proposedOffset;

              // Solo paginar si existe realmente un evento más tarde
              if (comp.list && proposedLaterIdx >= 0 && proposedLaterIdx < comp.list.length) {
                if (isGlobalLaterRight) {
                  this._setLaterOffsetGlobal(proposedOffset);
                } else {
                  this._setLaterOffset(chIdx, proposedOffset);
                }
                var anchorTopLaterRight = this._captureFocusRowTop($focused);
                this._renderCards();
                $focusTo = this.$epgGrid.find('.epg-program-card[data-channel-index="' + chIdx + '"][data-slot="later"]').first();
                // Ver comentario equivalente más arriba (paginación LEFT de
                // "Más Tarde") sobre _compensateRowDrift(). Caso reportado:
                // al paginar "Más Tarde" repetidamente con epgCardsLaterGlobal
                // activo, cada re-render desplazaba la fila enfocada (por
                // cambios de alto en otras filas) y se veía un salto de scroll
                // en cada tecla; esto lo compensa sin saltos visibles.
                if ($focusTo && $focusTo.length > 0) {
                  this.$lastEpgFocused = $focusTo;
                  Focus.to($focusTo);
                  this._compensateRowDrift($focusTo, anchorTopLaterRight);
                  this.ensureItemVisibility($focusTo, true);
                  return;
                }
              } else {
                $focusTo = $focused;
              }
            }
          }
        }

        if ($focusTo && $focusTo.length > 0) {
          console.log('EPGCards.navigate: moviendo foco a', $focusTo.attr('class'), 'channel-index=', $focusTo.data('channel-index'));
          this.$lastEpgFocused = $focusTo;
          Focus.to($focusTo);

          // Asegurar que el elemento esté visible. En movimientos verticales no tocar scroll horizontal,
          // y en movimientos horizontales dentro de la misma fila no tocar scroll vertical (mismo criterio
          // que en los 4 puntos de paginación de "Antes"/"Más Tarde" más arriba).
          this.ensureItemVisibility($focusTo, direction === "up" || direction === "down", direction === "left" || direction === "right");

          // Verificar inmediatamente que el foco se mantuvo (sin setTimeout para mejor rendimiento)
          if (!Focus.focused || !Focus.focused.length || !Focus.focused.is($focusTo)) {
            console.log('EPGCards.navigate: foco perdido después del scroll, recuperando');
            Focus.to($focusTo);
            this.$lastEpgFocused = $focusTo;
          }
        } else {
          console.log('EPGCards.navigate: no se encontró elemento para mover foco, manteniendo foco actual');
          // Asegurar visibilidad del elemento actual
          this.ensureItemVisibility($focused);
        }
      },

      /**
       * Asegura que el elemento esté visible en el viewport del contenedor
       * Hace scroll automático si el elemento está fuera de la vista (vertical y horizontal)
       */
      ensureItemVisibility: function($el) {
        var skipHorizontal = false;
        var skipVertical = false;
        if (arguments.length > 1) {
          skipHorizontal = !!arguments[1];
        }
        if (arguments.length > 2) {
          skipVertical = !!arguments[2];
        }
        if (!this.$epgGrid || !$el || !$el.length) {
          return;
        }

        // ============================================
        // SCROLL VERTICAL (del contenedor principal)
        // ============================================
        // skipVertical se usa sólo para movimientos horizontales simples
        // (izq/der dentro de la misma fila, sin re-renderizar nada): ahí sí
        // es seguro asumir que la fila no se desplazó verticalmente, porque
        // no se tocó el DOM de ninguna otra fila. NO se usa en los puntos de
        // paginación de "Antes"/"Más Tarde" -- ver _compensateRowDrift(),
        // que corrige el desplazamiento real que puede producir
        // epgCardsPastGlobal/epgCardsLaterGlobal sin depender de este chequeo
        // basado en márgenes (que sólo corrige de forma reactiva y notoria).
        if (!skipVertical) {
          // Obtener la fila del canal (puede ser el elemento mismo o su contenedor)
          var $channelRow = $el.closest('.epg-channel-row');
          if (!$channelRow.length) {
            $channelRow = $el.closest('.epg-channel-info').parent('.epg-channel-row');
          }
          if (!$channelRow.length) {
            $channelRow = $el;
          }

          var elementTop = $channelRow.position().top;
          var elementBottom = elementTop + $channelRow.outerHeight();
          var containerHeight = this.$epgGrid.height();
          var currentScrollTop = this.$epgGrid.scrollTop();

          var scrollOffset = 0;
          var margin = 100; // Margen en píxeles para dejar espacio arriba/abajo

          // Si el elemento está arriba del viewport
          if (elementTop < margin) {
            scrollOffset = elementTop - margin;
          }
          // Si el elemento está abajo del viewport
          else if (elementBottom > (containerHeight - margin)) {
            scrollOffset = (elementBottom - containerHeight) + margin;
          }

          // Si hay que hacer scroll vertical, hacerlo instantáneamente (sin animación para mejor rendimiento)
          if (scrollOffset !== 0) {
            var newScrollTop = Math.max(0, currentScrollTop + scrollOffset);
            this.$epgGrid.scrollTop(newScrollTop);
          }
        }

        // ============================================
        // SCROLL HORIZONTAL (del contenedor de programas)
        // ============================================
        // Si el elemento es un programa, verificar si está visible en el contenedor horizontal
        if (!skipHorizontal && $el.hasClass('epg-program-card')) {
          var $programsContainer = $el.closest('.epg-programs-container');
          if ($programsContainer.length > 0) {
            if ($programsContainer.hasClass('epg-programs-three-cols')) {
              return;
            }
            var eventLeft = $el.position().left;
            var eventWidth = $el.outerWidth();
            var eventRight = eventLeft + eventWidth;
            var containerWidth = $programsContainer.width();
            var currentScrollLeft = $programsContainer.scrollLeft();

            var horizontalScrollOffset = 0;
            var horizontalMargin = 50; // Margen horizontal

            // Si el programa está a la izquierda del viewport
            if (eventLeft < horizontalMargin) {
              horizontalScrollOffset = eventLeft - horizontalMargin;
            }
            // Si el programa está a la derecha del viewport
            else if (eventRight > (containerWidth - horizontalMargin)) {
              horizontalScrollOffset = (eventRight - containerWidth) + horizontalMargin;
            }

            // Si hay que hacer scroll horizontal, hacerlo instantáneamente (sin animación para mejor rendimiento)
            if (horizontalScrollOffset !== 0) {
              var newScrollLeft = Math.max(0, currentScrollLeft + horizontalScrollOffset);
              $programsContainer.scrollLeft(newScrollLeft);
            }
          }
        }
      },

      /**
       * Captura la posición vertical (relativa al viewport de $epgGrid) de la
       * fila del canal enfocado, para poder compensar después el desplazamiento
       * que produce _renderCards() al paginar "Antes"/"Más Tarde" en modo
       * global (epgCardsPastGlobal/epgCardsLaterGlobal), donde otras filas
       * pueden cambiar de alto sin que la fila enfocada haya cambiado.
       */
      _captureFocusRowTop: function($el) {
        if (!$el || !$el.length) {
          return null;
        }
        var $row = $el.closest('.epg-channel-row');
        return $row.length ? $row.position().top : null;
      },

      /**
       * Ajusta scrollTop para que la fila de $newEl quede exactamente en la
       * misma posición de pantalla que tenía antes del re-render (anchorTopBefore).
       * Así, si otras filas cambiaron de alto por la paginación global, el
       * usuario no ve ningún salto: la fila enfocada permanece fija en su
       * lugar. Si además la fila no estaba del todo visible antes de paginar,
       * el ensureItemVisibility() que se llama después de esto se encarga de
       * corregirlo.
       */
      _compensateRowDrift: function($newEl, anchorTopBefore) {
        if (anchorTopBefore === null || anchorTopBefore === undefined || !$newEl || !$newEl.length) {
          return;
        }
        var $row = $newEl.closest('.epg-channel-row');
        if (!$row.length) {
          return;
        }
        var delta = $row.position().top - anchorTopBefore;
        if (delta !== 0) {
          this.$epgGrid.scrollTop(this.$epgGrid.scrollTop() + delta);
        }
      },

      onFocus: function($el) {
        if (!this.epgLoaded) {
          return;
        }

        if (!$el || !$el.length) {
          $el = Focus.focused;
        }

        if (!$el || !$el.length || $el.attr("id") === "divVideoContainer") {
          return;
        }

        if (EPGDetails.isShowed()) {
          return;
        }

        // Normalizar $el al contenedor focusable (si el usuario hizo click/enter en un hijo).
        // Incluye .epg-program-slot-empty: ahora es un destino de foco
        // legítimo (celda "—" navegable), si no se agrega acá closest()
        // no la encuentra y la función corta sin actualizar el panel de
        // información (queda mostrando datos del foco anterior).
        if (!$el.hasClass('epg-program-card') && !$el.hasClass('epg-action-button-small') && !$el.hasClass('epg-channel-info') && !$el.hasClass('epg-program-slot-empty')) {
          $el = $el.closest('.epg-program-card, .epg-action-button-small, .epg-channel-info, .epg-program-slot-empty');
        }

        if (!$el || !$el.length) {
          return;
        }

        // Obtener datos del card enfocado
        var channelIndex = $el.data("channel-index");
        var eventIndex = $el.data("event-index");

        if (channelIndex === undefined || channelIndex === null) {
          return;
        }

        // Obtener canal
        if (channelIndex >= 0 && channelIndex < this.items.length) {
          this.currentServiceFocused = this.items[channelIndex];

          // Obtener evento si existe
          if (eventIndex !== undefined && eventIndex !== null &&
              this.currentServiceFocused.epgItems &&
              eventIndex >= 0 && eventIndex < this.currentServiceFocused.epgItems.length) {
            this.currentEpgItemFocused = this.currentServiceFocused.epgItems[eventIndex];
          } else {
            this.currentEpgItemFocused = null;
          }
        }

        this.$lastEpgFocused = $el;
      },

      onEnter: function($el, callbackForPlay) {
        console.log('EPGCards.onEnter: llamado');

        if (!this.epgLoaded || !this.isShowed()) {
          console.log('EPGCards.onEnter: no cargado o no visible');
          return;
        }

        if (!$el || !$el.length) {
          $el = Focus.focused;
        }

        // Normalizar $el al contenedor focusable (si el usuario hizo click/enter en un hijo)
        // Esto replica el comportamiento de EPG donde siempre se trabaja con el elemento que tiene los data-*
        if ($el && $el.length && !$el.hasClass('epg-program-card') && !$el.hasClass('epg-action-button-small') && !$el.hasClass('epg-channel-info') && !$el.hasClass('epg-program-slot-empty')) {
          $el = $el.closest('.epg-program-card, .epg-action-button-small, .epg-channel-info, .epg-program-slot-empty');
        }

        // Si después de normalizar sigue sin ser válido, usar Focus.focused y normalizar también
        if (!$el || !$el.length) {
          $el = Focus.focused;
          if ($el && $el.length && !$el.hasClass('epg-program-card') && !$el.hasClass('epg-action-button-small') && !$el.hasClass('epg-channel-info') && !$el.hasClass('epg-program-slot-empty')) {
            $el = $el.closest('.epg-program-card, .epg-action-button-small, .epg-channel-info, .epg-program-slot-empty');
          }
        }

        console.log('EPGCards.onEnter: elemento=', $el.attr('class'), 'channel-index=', $el.data('channel-index'), 'event-index=', $el.data('event-index'));

        // Si EPGDetails está abierto, manejar Enter ahí
        if (EPGDetails.isShowed()) {
          console.log('EPGCards.onEnter: EPGDetails ya está abierto');
          // Cuando EPGDetails está abierto, usar Focus.focused en lugar de $el
          // porque $el puede ser undefined o incorrecto cuando viene desde home.js
          var $focusedInDetails = Focus.focused;
          if (!$focusedInDetails || !$focusedInDetails.length) {
            $focusedInDetails = $el;
          }
          console.log('EPGCards.onEnter: delegando a EPGDetails.onEnter con elemento=', $focusedInDetails.attr('class'));
          EPGDetails.onEnter($focusedInDetails);
          return;
        }

        // SIEMPRE recalcular currentServiceFocused y currentEpgItemFocused desde $el normalizado
        // Esto replica el comportamiento de EPG donde siempre se obtiene el evento exacto desde el elemento
        console.log('EPGCards.onEnter: estableciendo foco desde elemento normalizado');
        var channelIndex = $el.data("channel-index");
        var eventIndex = $el.data("event-index");

        if (channelIndex !== undefined && channelIndex !== null && channelIndex >= 0 && channelIndex < this.items.length) {
          this.currentServiceFocused = this.items[channelIndex];

          if (eventIndex !== undefined && eventIndex !== null &&
              this.currentServiceFocused.epgItems &&
              eventIndex >= 0 && eventIndex < this.currentServiceFocused.epgItems.length) {
            this.currentEpgItemFocused = this.currentServiceFocused.epgItems[eventIndex];
            console.log('EPGCards.onEnter: evento encontrado', this.currentEpgItemFocused);
          } else {
            this.currentEpgItemFocused = null;
            console.log('EPGCards.onEnter: no hay evento en índice', eventIndex);
          }
        } else {
          console.log('EPGCards.onEnter: channelIndex inválido o fuera de rango', channelIndex);
        }

        // Si no hay servicio enfocado, no hacer nada
        if (!this.currentServiceFocused) {
          console.log('EPGCards.onEnter: no hay servicio enfocado');
          return;
        }

        // Verificar si es un botón de "Ver Canal En Vivo"
        if ($el.hasClass("epg-action-button") || $el.hasClass("epg-action-button-small")) {
          console.log('EPGCards.onEnter: es botón de ver canal en vivo');
          // Reproducir canal en vivo
          if (callbackForPlay && typeof callbackForPlay === 'function') {
            callbackForPlay("service", this.currentServiceFocused.id, this.currentServiceFocused.url, this.currentServiceFocused);
            this.hide();
            if (nbPlayer && nbPlayer.requestFullscreen) {
              nbPlayer.requestFullscreen();
            }
          }
          return;
        }

        // Si hay evento enfocado, mostrar detalles
        if (this.currentEpgItemFocused) {
          console.log('EPGCards.onEnter: mostrando EPGDetails para evento');
          var now = this._getNow();
          var metadata = null;

          // Si el evento ya terminó => catchup (usar comparación directa como EPG)
          if (this.currentEpgItemFocused.endDate < now) {
            console.log('EPGCards.onEnter: evento pasado, buscando catchup');
            // En EPG/catchup hay dos IDs posibles según backend/modelo:
            // - catchupGroups.events[].id  (id interno de catchup)
            // - catchupGroups.events[].eventId (id del evento EPG: event_id/eventId)
            // Intentamos ambos antes de hacer fallback a "service" (que muestra el vivo).
            var catchup = false;

            // 1) Intento por id interno (si existe catchupId en el evento EPG)
            if (this.currentEpgItemFocused && this.currentEpgItemFocused.catchupId && this.currentEpgItemFocused.catchupId > 0) {
              console.log('EPGCards.onEnter: buscando catchup por catchupId=', this.currentEpgItemFocused.catchupId);
              catchup = AppData.getCatchupByEventId(this.currentEpgItemFocused.catchupId);
              console.log('EPGCards.onEnter: resultado búsqueda por catchupId:', catchup ? 'encontrado' : 'no encontrado');
            }

            // 2) Intento por event_id / eventId (requiere epgStreamId del canal)
            if ((!catchup || catchup === false) && this.currentServiceFocused && this.currentServiceFocused.epgStreamId) {
              var eventEpgId = null;
              if (typeof this.currentEpgItemFocused.event_id !== 'undefined' && this.currentEpgItemFocused.event_id !== null) {
                eventEpgId = this.currentEpgItemFocused.event_id;
              } else if (typeof this.currentEpgItemFocused.eventId !== 'undefined' && this.currentEpgItemFocused.eventId !== null) {
                eventEpgId = this.currentEpgItemFocused.eventId;
              }

              if (eventEpgId !== null) {
                console.log('EPGCards.onEnter: buscando catchup por event_id=', eventEpgId, 'epgStreamId=', this.currentServiceFocused.epgStreamId);
                catchup = AppData.getCatchupEvent(this.currentServiceFocused.epgStreamId, eventEpgId);
                console.log('EPGCards.onEnter: resultado búsqueda por event_id:', catchup ? 'encontrado' : 'no encontrado');
              } else {
                console.log('EPGCards.onEnter: no se encontró event_id/eventId en el evento');
              }
            } else if (!catchup || catchup === false) {
              console.log('EPGCards.onEnter: no se puede buscar por event_id (epgStreamId no disponible o catchupId ya falló)');
            }

            metadata = {
              'type': 'catchup-event',
              'item': catchup ? catchup : null
            };
          }

          // Si no es catchup => service
          if (!metadata || metadata.item == null) {
            metadata = {
              'type': 'service',
              'item': this.currentServiceFocused
            };

            // Si es evento futuro, agregar item2 (usar comparación directa como EPG)
            if (this.currentEpgItemFocused.startDate > now) {
              console.log('EPGCards.onEnter: evento futuro');
              metadata.item2 = this.currentEpgItemFocused;
            } else if (this.currentEpgItemFocused.endDate < now) {
              // Si es evento pasado pero no tiene catchup disponible, pasar el evento como item2
              // para que EPGDetails lo muestre en lugar del evento en vivo
              console.log('EPGCards.onEnter: evento pasado sin catchup disponible, mostrando evento pasado');
              metadata.item2 = this.currentEpgItemFocused;
            } else {
              console.log('EPGCards.onEnter: evento en vivo');
            }
          }

          console.log('EPGCards.onEnter: metadata=', metadata);

          // Asegurar que EPGDetails esté inicializado en el contenedor
          if (this.$epgContainer && this.$epgContainer.find(".epg-dialog-details").length === 0) {
            console.log('EPGCards.onEnter: inicializando EPGDetails');
            EPGDetails.init(this.$epgContainer);
          }

          // Mostrar EPGDetails (usar EPGDetails directamente, no window.EPGDetails)
          if (EPGDetails && typeof EPGDetails.show === 'function') {
            console.log('EPGCards.onEnter: llamando EPGDetails.show');
            EPGDetails.show(this.$epgContainer, metadata, this.homeObject, $el);
          } else {
            console.error('EPGCards.onEnter: EPGDetails no está disponible o no tiene método show');
          }
        } else {
          console.log('EPGCards.onEnter: no hay evento enfocado, reproduciendo canal en vivo');
          // Si no hay evento, reproducir canal en vivo
          if (callbackForPlay && typeof callbackForPlay === 'function') {
            callbackForPlay("service", this.currentServiceFocused.id, this.currentServiceFocused.url, this.currentServiceFocused);
            this.hide();
            if (nbPlayer && nbPlayer.requestFullscreen) {
              nbPlayer.requestFullscreen();
            }
          }
        }
      },

      onReturn: function(callback) {
        if (EPGDetails.isShowed()) {
          EPGDetails.close();
          return true;
        }

        this.hide();
        if (callback && typeof callback === 'function') {
          callback();
        }
        return true;
      },

      // ============================================
      // MÉTODOS PRIVADOS
      // ============================================

      _applyTheme: function() {
        var app = (typeof CONFIG !== "undefined" && CONFIG.app) ? CONFIG.app : {};
        var channelBg = app.epgCardsChannelActiveBg;
        var programBg = app.epgCardsProgramLiveBg;
        if (this.$epgContainer && this.$epgContainer.length) {
          this.$epgContainer[0].style.setProperty("--epg-cards-channel-active-bg", channelBg);
          this.$epgContainer[0].style.setProperty("--epg-cards-program-live-bg", programBg);
        }
      },

      _getLaterOffset: function(channelIndex) {
        if (!this.laterOffsetByChannel) this.laterOffsetByChannel = {};
        return this.laterOffsetByChannel[channelIndex] || 0;
      },

      _setLaterOffset: function(channelIndex, value) {
        if (!this.laterOffsetByChannel) this.laterOffsetByChannel = {};
        this.laterOffsetByChannel[channelIndex] = Math.max(0, value || 0);
      },

      _getLaterOffsetGlobal: function() {
        return this.laterOffsetGlobal || 0;
      },

      _setLaterOffsetGlobal: function(value) {
        this.laterOffsetGlobal = Math.max(0, value || 0);
      },

      _getBeforeOffset: function(channelIndex) {
        if (!this.beforeOffsetByChannel) this.beforeOffsetByChannel = {};
        return this.beforeOffsetByChannel[channelIndex] || 0;
      },

      _setBeforeOffset: function(channelIndex, value) {
        if (!this.beforeOffsetByChannel) this.beforeOffsetByChannel = {};
        this.beforeOffsetByChannel[channelIndex] = Math.max(0, value || 0);
      },

      // Mismo mecanismo que _getLaterOffsetGlobal/_setLaterOffsetGlobal, pero
      // para "Antes" (epgCardsPastGlobal): un único offset compartido por
      // todas las filas en vez de uno por canal, para que al paginar hacia
      // atrás en un canal todas las filas se muevan juntas.
      _getBeforeOffsetGlobal: function() {
        return this.beforeOffsetGlobal || 0;
      },

      _setBeforeOffsetGlobal: function(value) {
        this.beforeOffsetGlobal = Math.max(0, value || 0);
      },

      _computeNowAndFuture: function(channel, now) {
        var list = [];
        if (channel && channel.epgItems && channel.epgItems.length > 0) {
          for (var e = 0; e < channel.epgItems.length; e++) {
            var ev = channel.epgItems[e];
            if (!ev || !ev.endDate) continue;
            if (now.isAfter && now.isAfter(ev.endDate)) continue;
            if (ev.endDate.valueOf && now.valueOf && ev.endDate.valueOf() < now.valueOf()) continue;
            list.push({ event: ev, eventIndex: e });
          }
        }

        var liveIdx = -1;
        for (var k = 0; k < list.length; k++) {
          var ev2 = list[k].event;
          if (ev2.startDate && ev2.endDate && now.isBetween && now.isBetween(ev2.startDate, ev2.endDate, null, '[]')) {
            liveIdx = k;
            break;
          }
        }

        return { list: list, liveIdx: liveIdx };
      },

      _computePast: function(channel, now) {
        var list = [];
        if (channel && channel.epgItems && channel.epgItems.length > 0) {
          for (var e = 0; e < channel.epgItems.length; e++) {
            var ev = channel.epgItems[e];
            if (!ev || !ev.endDate) continue;

            // Usar la misma lógica que _computeNowAndFuture pero al revés
            // Si el evento ya terminó (endDate < now), incluirlo
            if (now.isAfter && now.isAfter(ev.endDate)) {
              list.push({ event: ev, eventIndex: e });
            } else if (ev.endDate.valueOf && now.valueOf && ev.endDate.valueOf() < now.valueOf()) {
              list.push({ event: ev, eventIndex: e });
            }
          }
        }
        // Ordenar por fecha descendente (más reciente primero)
        list.sort(function(a, b) {
          var aEnd = a.event.endDate.valueOf ? a.event.endDate.valueOf() : 0;
          var bEnd = b.event.endDate.valueOf ? b.event.endDate.valueOf() : 0;
          return bEnd - aEnd; // Descendente
        });
        return list;
      },

      _getSlotElementForChannel: function(channelIndex, slot) {
        if (channelIndex === undefined || channelIndex === null) return null;
        if (!slot) return this._getFocusableElementForChannel(channelIndex);

        // Antes esto solo buscaba .epg-program-card, así que si la MISMA
        // columna existía para este canal pero estaba vacía (celda "—"),
        // no la encontraba acá y caía a los fallbacks de abajo -- saltando
        // a otra columna aunque la que querías sí existiera, solo que sin
        // evento. Ahora las celdas vacías también son focusables
        // (.epg-program-slot-empty, con data-channel-index/data-slot), así
        // que se busca cualquiera de las dos clases: si la columna existe
        // (con o sin evento) se respeta esa misma posición.
        var $slotCard = this.$epgGrid.find('.epg-program-card[data-channel-index="' + channelIndex + '"][data-slot="' + slot + '"], .epg-program-slot-empty[data-channel-index="' + channelIndex + '"][data-slot="' + slot + '"]').first();
        if ($slotCard && $slotCard.length) return $slotCard;

        var $fallback = this.$epgGrid.find('.epg-program-card[data-channel-index="' + channelIndex + '"][data-slot="now"]').first();
        if ($fallback && $fallback.length) return $fallback;

        // Si epgPast está habilitado, incluir "Antes" en el fallback
        if (CONFIG.app.epgPast) {
          $fallback = this.$epgGrid.find('.epg-program-card[data-channel-index="' + channelIndex + '"][data-slot="before"]').first();
          if ($fallback && $fallback.length) return $fallback;
        }

        $fallback = this.$epgGrid.find('.epg-program-card[data-channel-index="' + channelIndex + '"][data-slot="next"]').first();
        if ($fallback && $fallback.length) return $fallback;
        $fallback = this.$epgGrid.find('.epg-program-card[data-channel-index="' + channelIndex + '"][data-slot="later"]').first();
        if ($fallback && $fallback.length) return $fallback;

        // Ningún slot de programa existe para este canal (canal sin EPG):
        // antes esto caía directo al logo del canal (.epg-channel-info).
        // Se reutiliza _getFocusableElementForChannel(), que ya prioriza
        // correctamente el botón "Ver Canal En Vivo" antes que el logo.
        return this._getFocusableElementForChannel(channelIndex);
      },

      _renderCards: function() {
        console.log('EPGCards._renderCards: INICIANDO RENDERIZADO VIRTUAL');

        if (!this.$epgGrid || !this.$epgGrid.length) {
          this.init();
        }

        // Asegurar cabecera fuera del scroll (Opción A)
        if (!this.$epgTimeHeader || !this.$epgTimeHeader.length) {
          this.$epgTimeHeader = $("#epgCardsTimeHeader");
        }

        if (!this.items || this.items.length === 0) {
          this.$epgGrid.html('<div class="epg-card-no-data"><div class="epg-card-no-data-message">' + __("EPGLoading") + '</div></div>');
          return;
        }

        // Determinar índice enfocado actual para la ventana virtual
        var focusedIndex = 0;
        if (this.currentServiceFocused) {
          for (var idx = 0; idx < this.items.length; idx++) {
            if (this.items[idx] && this.items[idx].id === this.currentServiceFocused.id) {
              focusedIndex = idx;
              break;
            }
          }
        }

        // Rango de filas virtuales (visibles + buffer)
        var bufferBefore = 3;
        var bufferAfter = 8;
        var renderStart = 0;
        var renderEnd = this.items.length;

        if (this.items.length > 12) {
          renderStart = Math.max(0, focusedIndex - bufferBefore);
          renderEnd = Math.min(this.items.length, focusedIndex + bufferAfter);

          if (renderStart === 0) {
            renderEnd = Math.min(this.items.length, bufferBefore + bufferAfter);
          } else if (renderEnd === this.items.length) {
            renderStart = Math.max(0, this.items.length - (bufferBefore + bufferAfter));
          }
        }

        // Guardar la ventana realmente pintada para que _getCardAbove/_getCardBelow
        // puedan saber si un canal vecino ya está en el DOM sin tener que
        // reconstruir todo de nuevo (ver uso de _renderedStart/_renderedEnd).
        this._renderedStart = renderStart;
        this._renderedEnd = renderEnd;

        var html = '';
        var self = this;
        var now = this._getNow();

        // Renderizar cabecera (fuera del scroll)
        if (this.$epgTimeHeader && this.$epgTimeHeader.length) {
          var epgPastEnabled = CONFIG.app.epgPast;
          console.log('EPGCards._renderCards: epgPast configurado como:', epgPastEnabled, 'CONFIG.app.epgPast:', CONFIG.app.epgPast);
          var headerHtml = '';
          headerHtml += '<div class="epg-time-header' + (epgPastEnabled ? ' epg-time-header-four-cols' : '') + '">';
          headerHtml += '<div class="epg-time-header-spacer"></div>';

          // Agregar "Antes" solo si epgPast está habilitado (i18n)
          if (epgPastEnabled) {
            headerHtml += '<div class="epg-time-label">' + __("EPGSlotBefore") + '</div>';
            console.log('EPGCards._renderCards: agregando columna "Antes" a la cabecera');
          }

          headerHtml += '<div class="epg-time-label">' + __("EPGSlotNow") + '</div>';
          headerHtml += '<div class="epg-time-label">' + __("EPGSlotNext") + '</div>';
          headerHtml += '<div class="epg-time-label">' + __("EPGSlotLater") + '</div>';
          headerHtml += '</div>';
          this.$epgTimeHeader.html(headerHtml);
        }

        // Contenedor principal de cuadrícula EPG (solo filas, el header está fuera)
        html += '<div class="epg-grid-container">';

        // Obtener configuración de epgPast una sola vez antes del loop
        var epgPastEnabled = CONFIG.app.epgPast || false;
        console.log('EPGCards._renderCards: epgPastEnabled (antes del loop) =', epgPastEnabled);

        // Renderizar cada canal como fila (solo los que pertenecen a la ventana virtual)
        for (var channelIndex = renderStart; channelIndex < renderEnd; channelIndex++) {
          var channel = this.items[channelIndex];
          if (!channel) continue;

          // Determinar si el canal tiene programa activo (en vivo)
          var hasActiveProgram = false;
          if (channel.epgItems && channel.epgItems.length > 0) {
            for (var i = 0; i < channel.epgItems.length; i++) {
              var event = channel.epgItems[i];
              if (event && event.startDate && event.endDate && now.isBetween) {
                if (now.isBetween(event.startDate, event.endDate, null, '[]')) {
                  hasActiveProgram = true;
                  break;
                }
              }
            }
          }

          // Fila de canal
          html += '<div class="epg-channel-row">';

          // Sección del canal (izquierda) - con degradado si tiene programa activo
          var channelInfoClass = 'epg-channel-info focusable';
          if (hasActiveProgram) {
            channelInfoClass += ' active';
          }
          html += '<div class="' + channelInfoClass + '" ' +
                  'data-focus-type="channel" ' +
                  'data-channel-index="' + channelIndex + '" ' +
                  'data-service-id="' + (channel.id || '') + '">';

          // Número de canal
          html += '<span class="epg-channel-number">' + self._escapeHtml(channel.lcn || '') + '</span>';

          // Logo del canal (elemento principal en la columna)
          if (channel.img) {
            var imgStyle = '';
            if (channel.backgroundColor) {
              imgStyle = ' style="background-color: #' + channel.backgroundColor + '"';
            }
            html += '<img class="epg-channel-logo" src="' + channel.img + '" onerror="imgOnError(this)" alt="' + self._escapeHtml(channel.name || '') + '"' + imgStyle + ' />';
          } else {
            html += '<span class="epg-channel-name epg-channel-name-only">' + self._escapeHtml(channel.name || '') + '</span>';
          }

          // Nombre del canal (secundario, debajo del logo)
          if (channel.img) {
            html += '<span class="epg-channel-name">' + self._escapeHtml(channel.name || '') + '</span>';
          }
          html += '</div>'; // cierra epg-channel-info

          // Contenedor de programas: 3 o 4 columnas según configuración
          // epgPastEnabled ya está definido fuera del loop
          var containerClass = epgPastEnabled ? 'epg-programs-four-cols' : 'epg-programs-three-cols';
          html += '<div class="epg-programs-container ' + containerClass + '">';

          var computed = self._computeNowAndFuture(channel, now);
          var eventsNowAndFuture = computed.list;
          var liveIdx = computed.liveIdx;

          // Calcular evento pasado solo si epgPast está habilitado
          var cardBefore = null;
          if (epgPastEnabled) {
            var pastEvents = self._computePast(channel, now);
            console.log('EPGCards._renderCards: epgPast habilitado, eventos pasados encontrados:', pastEvents.length, 'para canal', channelIndex);
            // "Antes" puede paginar hacia atrás usando offset
            // - Por canal (modo clásico)
            // - Global (todas las filas se mueven juntas) cuando epgCardsPastGlobal=true
            var beforeOffset = (CONFIG.app && CONFIG.app.epgCardsPastGlobal)
              ? self._getBeforeOffsetGlobal()
              : self._getBeforeOffset(channelIndex);
            var beforeIdx = beforeOffset;
            if (beforeIdx >= 0 && beforeIdx < pastEvents.length) {
              cardBefore = pastEvents[beforeIdx];
              console.log('EPGCards._renderCards: evento pasado seleccionado (offset=' + beforeOffset + '):', cardBefore.event.languages ? cardBefore.event.languages[0].title : cardBefore.event.title);
            } else if (pastEvents.length > 0) {
              // Si el offset está fuera de rango, usar el primero (más reciente)
              cardBefore = pastEvents[0];
              console.log('EPGCards._renderCards: evento pasado seleccionado (fallback al primero):', cardBefore.event.languages ? cardBefore.event.languages[0].title : cardBefore.event.title);
            } else {
              console.log('EPGCards._renderCards: no se encontraron eventos pasados para canal', channelIndex);
            }
          } else {
            console.log('EPGCards._renderCards: epgPast deshabilitado');
          }

          if (eventsNowAndFuture.length > 0 || cardBefore) {

            var cardNow = liveIdx >= 0 ? eventsNowAndFuture[liveIdx] : null;
            var cardNext = liveIdx >= 0 && liveIdx + 1 < eventsNowAndFuture.length ? eventsNowAndFuture[liveIdx + 1] : (eventsNowAndFuture.length > 0 ? eventsNowAndFuture[0] : null);
            if (liveIdx < 0) {
              cardNow = null;
              cardNext = eventsNowAndFuture.length > 0 ? eventsNowAndFuture[0] : null;
            }
            // "Más Tarde" puede paginar hacia la derecha usando offset
            // - Por canal (modo clásico)
            // - Global (todas las filas se mueven juntas) cuando epgCardsLaterGlobal=true
            var baseLaterIdx = liveIdx >= 0 ? (liveIdx + 2) : 1;
            var laterOffset = (CONFIG.app && CONFIG.app.epgCardsLaterGlobal)
              ? self._getLaterOffsetGlobal()
              : self._getLaterOffset(channelIndex);
            var laterIdx = baseLaterIdx + laterOffset;
            var cardLater = (laterIdx >= 0 && laterIdx < eventsNowAndFuture.length) ? eventsNowAndFuture[laterIdx] : null;

            // Crear array de slots según configuración (claves fijas para data-slot, i18n solo en cabecera)
            var slots = [];
            var slotKeys = [];

            if (epgPastEnabled) {
              slots = [cardBefore, cardNow, cardNext, cardLater];
              slotKeys = ['before', 'now', 'next', 'later'];
            } else {
              slots = [cardNow, cardNext, cardLater];
              slotKeys = ['now', 'next', 'later'];
            }

            slots.forEach(function(slot, slotIndex) {
              var label = slotKeys[slotIndex];
              if (!slot) {
                // Antes esta celda no tenía data-channel-index ni clase
                // "focusable", así que arriba/abajo (y también izquierda/
                // derecha) no podían aterrizar acá directamente -- la
                // navegación vertical caía siempre a otra columna (o al
                // botón "Ver Canal En Vivo" si el canal no tenía nada), lo
                // que hacía perder la columna en la que estabas y a veces
                // se sentía como que la navegación se trababa. Ahora es un
                // destino de foco legítimo (sin evento real, pero navegable
                // como el resto), igual que las celdas "sin EPG" del diseño
                // clásico.
                html += '<div class="epg-program-slot epg-program-slot-empty focusable" data-channel-index="' + channelIndex + '" data-slot="' + label + '"><span class="epg-slot-empty-label">&#8212;</span></div>';
                return;
              }
              var event = slot.event;
              var eventIndex = slot.eventIndex;

              var isLive = false;
              if (event.startDate && event.endDate && now.isBetween) {
                isLive = now.isBetween(event.startDate, event.endDate, null, '[]');
              }

              var progress = 0;
              if (isLive && event.startDate && event.endDate) {
                var totalDuration = getTimeDifference(event.startDate, event.endDate, 'seconds');
                var elapsed = getTimeDifference(event.startDate, now, 'seconds');
                if (totalDuration > 0) {
                  progress = Math.round((elapsed / totalDuration) * 100);
                }
              }

              var eventTitle = '';
              if (event.languages && event.languages.length > 0) {
                eventTitle = event.languages[0].title || '';
              } else if (event.title) {
                eventTitle = event.title;
              }

              var startTime = '';
              var endTime = '';
              if (event.startDate && event.startDate.format) {
                startTime = getStringDate(event.startDate, 'HH:mm');
              }
              if (event.endDate && event.endDate.format) {
                endTime = getStringDate(event.endDate, 'HH:mm');
              }

              var cardClass = 'epg-program-card focusable epg-program-slot';
              if (isLive) {
                cardClass += ' live';
              }
              // Agregar clase para eventos pasados
              if (label === 'before') {
                cardClass += ' past';
              }

              html += '<div class="' + cardClass + '" ' +
                      'data-focus-type="event" ' +
                      'data-channel-index="' + channelIndex + '" ' +
                      'data-event-index="' + eventIndex + '" ' +
                      'data-service-id="' + (channel.id || '') + '" data-slot="' + label + '">';

              html += '<div class="epg-program-title">' + self._escapeHtml(eventTitle || __("EPGProgramming")) + '</div>';
              // html += '<div class="epg-program-meta">' + __("EPGProgramming") + '</div>';
              html += '<div class="epg-program-time">' + startTime + (endTime ? ' - ' + endTime : '') + '</div>';

              if (isLive && progress > 0) {
                html += '<div class="epg-program-progress" style="width: ' + progress + '%"></div>';
              }

              if (!isLive) {
                html += '<button class="epg-program-menu" aria-label="' + __("EPGMenu") + '">&#8942;</button>';
              }

              html += '</div>';
            });
          } else {
            // Sin eventos - mostrar mensaje que ocupa todas las columnas.
            // Punto 33: distinguir "el canal no tiene EPG configurada" (dato
            // legítimo) de "se intentó cargar y falló por red/timeout"
            // (channel.epgLoadFailed, seteado en downloadChannelEPG) -- un
            // usuario que ve "sin programación" en un canal que normalmente
            // sí tiene guía puede pensar que es un dato permanente, cuando en
            // realidad alcanza con reintentar.
            var epgNoDataTitle = channel.epgLoadFailed ? __("EPGLoadErrorTitle") : __("EPGNoInfoTitle");
            var epgNoDataMessage = channel.epgLoadFailed ? __("EPGLoadErrorMessage") : __("EPGNoProgrammationMessage");
            var epgNoDataIcon = channel.epgLoadFailed ? '⚠️' : '📡';
            html += '<div class="epg-program-slot epg-program-slot-empty epg-card-no-data' + (channel.epgLoadFailed ? ' epg-card-load-error' : '') + '" style="grid-column: 1 / -1;">';
            html += '<div class="epg-card-no-data-icon">' + epgNoDataIcon + '</div>';
            html += '<div class="epg-card-no-data-title">' + epgNoDataTitle + '</div>';
            html += '<div class="epg-card-no-data-message">' + epgNoDataMessage + '</div>';
            html += '<button class="epg-action-button-small focusable" ' +
                    'data-focus-type="button" data-channel-index="' + channelIndex + '" data-service-id="' + (channel.id || '') + '">&#9654;&#65039; ' + __("EPGWatchLiveChannel") + '</button>';
            html += '</div>';
          }

          html += '</div>'; // cierra epg-programs-container

          html += '</div>'; // cierra epg-channel-row
        }

        html += '</div>'; // cierra epg-grid-container

        // Usar DocumentFragment para renderizado más rápido
        var fragment = document.createDocumentFragment();
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }

        // .empty() resetea el scrollTop del contenedor a 0, sin importar si
        // esta llamada a _renderCards() es por paginar "Antes"/"Más Tarde"
        // en la MISMA fila (donde no hace falta ningún scroll) o por un
        // cambio real de canal. ensureItemVisibility() corre después y, al
        // ver el scroll en 0, "corregía" con un salto vertical que en el
        // caso de paginación era innecesario -- la fila nunca se movió, solo
        // se perdió la posición de scroll por el redibujado completo. Se
        // guarda y se restaura para que _renderCards() sea neutral respecto
        // al scroll, y ensureItemVisibility() solo actúe cuando el foco
        // realmente cambió de fila.
        var savedScrollTop = this.$epgGrid.scrollTop();
        this.$epgGrid.empty().append(fragment);
        this.$epgGrid.scrollTop(savedScrollTop);

        // Marcar primer elemento como focusable (ya no necesario, pero mantener por compatibilidad)
        var $firstCard = this.$epgGrid.find(".epg-channel-info, .epg-program-card").first();
        if ($firstCard.length > 0) {
          $firstCard.addClass("first-focus");
        }
      },

      _focusFirst: function() {
        var self = this;

        // Pequeño delay para asegurar que el DOM esté completamente renderizado
        setTimeout(function() {
          // Buscar canal actual si hay playback
          var serviceId = null;
          try {
            if (self.homeObject && self.homeObject.playbackMetadata && self.homeObject.playbackMetadata.type === "service") {
              serviceId = self.homeObject.playbackMetadata.id;
            } else if (self.homeObject && self.homeObject.lastServiceIdPlayed) {
              serviceId = self.homeObject.lastServiceIdPlayed;
            }
          } catch (e) {}

          if (serviceId && self.items) {
            for (var i = 0; i < self.items.length; i++) {
              if (self.items[i] && self.items[i].id == serviceId) {
                self.currentServiceFocused = self.items[i];
                self._renderCards(); // Re-renderizar alrededor de este canal
                break;
              }
            }
          }

          var $defaultFocus = self._getCurrentChannelCard();

          if ($defaultFocus && $defaultFocus.length > 0) {
            self.$lastEpgFocused = $defaultFocus;
            Focus.to($defaultFocus);
            self.ensureItemVisibility($defaultFocus);
            return;
          }

          // Si hay último foco guardado, usarlo
          if (self.$lastEpgFocused && self.$lastEpgFocused.length > 0) {
            var lastChannelIndex = self.$lastEpgFocused.data('channel-index');
            if (lastChannelIndex !== undefined && lastChannelIndex >= 0 && lastChannelIndex < self.items.length) {
              self.currentServiceFocused = self.items[lastChannelIndex];
              self._renderCards();
              var slot = self.$lastEpgFocused.data('slot');
              var $element = self._getSlotElementForChannel(lastChannelIndex, slot);
              if ($element && $element.length > 0) {
                Focus.to($element);
                self.ensureItemVisibility($element);
                return;
              }
            }
          }

          // Enfocar el primer elemento útil del primer canal (evento en vivo)
          if (self.items && self.items.length > 0) {
            self.currentServiceFocused = self.items[0];
            self._renderCards();
            var $firstElement = self._getFocusableElementForChannel(0);
            if ($firstElement && $firstElement.length > 0) {
              Focus.to($firstElement);
              self.ensureItemVisibility($firstElement);
              return;
            }
          }

          // Fallback: enfocar primer elemento disponible
          var $firstCard = self.$epgGrid.find(".epg-program-card, .epg-channel-info, .epg-action-button-small").first();
          if ($firstCard.length > 0) {
            Focus.to($firstCard);
            self.ensureItemVisibility($firstCard);
          }
        }, 50);
      },

      /**
       * Obtiene el elemento enfocable correcto para un canal específico
       * - Si tiene eventos: retorna el evento en vivo o el primer evento
       * - Si no tiene eventos: retorna el botón "Ver Canal En Vivo" o la sección del canal
       */
      _getFocusableElementForChannel: function(channelIndex) {
        console.log('_getFocusableElementForChannel: buscando canal índice=' + channelIndex);

        if (channelIndex < 0 || channelIndex >= this.items.length) {
          console.log('_getFocusableElementForChannel: índice fuera de rango');
          return null;
        }

        var channel = this.items[channelIndex];
        if (!channel) {
          console.log('_getFocusableElementForChannel: canal no existe');
          return null;
        }

        // Cachear selector base para este canal (optimización)
        var channelSelector = '[data-channel-index="' + channelIndex + '"]';

        // Si el canal tiene eventos, buscar el evento en vivo
        if (channel.epgItems && channel.epgItems.length > 0) {
          console.log('_getFocusableElementForChannel: canal tiene ' + channel.epgItems.length + ' eventos');
          var now = this._getNow();
          var liveEventIndex = -1;

          // Buscar evento en vivo
          for (var i = 0; i < channel.epgItems.length; i++) {
            var event = channel.epgItems[i];
            if (event && event.startDate && event.endDate && now.isBetween) {
              if (now.isBetween(event.startDate, event.endDate, null, '[]')) {
                liveEventIndex = i;
                break;
              }
            }
          }

          // Si hay evento en vivo, enfocarlo; sino, el primer evento
          var eventIndex = liveEventIndex >= 0 ? liveEventIndex : 0;
          console.log('_getFocusableElementForChannel: buscando evento índice=' + eventIndex + ' (live=' + liveEventIndex + ')');

          // Optimizar búsqueda combinando selectores (usar nueva clase epg-program-card)
          var $liveEvent = this.$epgGrid.find(
            channelSelector + '.epg-program-card[data-event-index="' + eventIndex + '"]'
          ).first();

          if ($liveEvent && $liveEvent.length > 0) {
            console.log('_getFocusableElementForChannel: encontrado evento');
            return $liveEvent;
          } else {
            console.log('_getFocusableElementForChannel: evento no encontrado en DOM');
          }
        } else {
          console.log('_getFocusableElementForChannel: canal sin eventos, buscando botón');
        }

        // Si no tiene eventos, buscar el botón "Ver Canal En Vivo" (optimizado)
        var $button = this.$epgGrid.find(
          channelSelector + '.epg-action-button-small'
        ).first();

        if ($button && $button.length > 0) {
          console.log('_getFocusableElementForChannel: encontrado botón');
          return $button;
        } else {
          console.log('_getFocusableElementForChannel: botón no encontrado');
        }

        // Fallback: retornar la sección del canal (optimizado)
        var $fallback = this.$epgGrid.find(channelSelector + '.epg-channel-info').first();
        console.log('_getFocusableElementForChannel: usando fallback, resultado=', $fallback ? 'encontrado' : 'null');
        return $fallback;
      },

      _getCurrentChannelCard: function() {
        if (!this.homeObject) return null;

        var serviceId = null;
        try {
          if (this.homeObject.playbackMetadata && this.homeObject.playbackMetadata.type === "service") {
            serviceId = this.homeObject.playbackMetadata.id;
          } else if (this.homeObject.lastServiceIdPlayed) {
            serviceId = this.homeObject.lastServiceIdPlayed;
          }
        } catch (e) {
          return null;
        }

        if (!serviceId || !this.items) return null;

        // Buscar índice del canal actual
        for (var i = 0; i < this.items.length; i++) {
          if (this.items[i] && this.items[i].id == serviceId) {
            // Usar el helper para obtener el elemento correcto (evento en vivo o botón)
            return this._getFocusableElementForChannel(i);
          }
        }

        return null;
      },

      _getCardAbove: function($current) {
        var channelIndex = $current.data("channel-index");
        var slot = $current.data("slot");

        if (channelIndex === undefined || channelIndex === null) {
          console.log('_getCardAbove: channelIndex no encontrado');
          return null;
        }

        if (channelIndex <= 0) {
          console.log('_getCardAbove: ya está en el primer canal');
          return null;
        }

        var prevChannelIndex = channelIndex - 1;

        console.log('_getCardAbove: canal actual=' + channelIndex + ', buscando elemento en canal=' + prevChannelIndex);

        // Actualizar el servicio enfocado (referencia para futuros recalculos
        // de la ventana virtual)
        this.currentServiceFocused = this.items[prevChannelIndex];

        // Antes: se llamaba _renderCards() (reconstruye TODO el HTML de la
        // ventana virtual) en cada pulsación de flecha, aunque la fila destino
        // ya estuviera pintada dentro del buffer. Ahora solo se re-renderiza
        // si el canal destino cae fuera de lo que ya está en el DOM.
        var isAlreadyRendered = (typeof this._renderedStart === 'number' &&
            prevChannelIndex >= this._renderedStart && prevChannelIndex < this._renderedEnd);
        if (!isAlreadyRendered) {
          this._renderCards();
        }

        // Mantener la MISMA COLUMNA (slot) al navegar verticalmente
        if (slot) {
          var $sameSlot = this._getSlotElementForChannel(prevChannelIndex, slot);
          if ($sameSlot && $sameSlot.length > 0) {
            return $sameSlot;
          }
        }

        // Si no se encuentra en la misma posición, buscar el elemento útil del canal anterior
        var $element = this._getFocusableElementForChannel(prevChannelIndex);
        console.log('_getCardAbove: resultado=', $element ? 'encontrado' : 'null');
        return $element;
      },

      _getCardBelow: function($current) {
        var channelIndex = $current.data("channel-index");
        var slot = $current.data("slot");

        if (channelIndex === undefined || channelIndex === null) {
          console.log('_getCardBelow: channelIndex no encontrado');
          return null;
        }

        if (channelIndex >= this.items.length - 1) {
          console.log('_getCardBelow: ya está en el último canal');
          return null;
        }

        var nextChannelIndex = channelIndex + 1;

        console.log('_getCardBelow: canal actual=' + channelIndex + ', buscando elemento en canal=' + nextChannelIndex);

        // Actualizar el servicio enfocado (referencia para futuros recalculos
        // de la ventana virtual)
        this.currentServiceFocused = this.items[nextChannelIndex];

        // Antes: se llamaba _renderCards() (reconstruye TODO el HTML de la
        // ventana virtual) en cada pulsación de flecha, aunque la fila destino
        // ya estuviera pintada dentro del buffer. Ahora solo se re-renderiza
        // si el canal destino cae fuera de lo que ya está en el DOM.
        var isAlreadyRendered = (typeof this._renderedStart === 'number' &&
            nextChannelIndex >= this._renderedStart && nextChannelIndex < this._renderedEnd);
        if (!isAlreadyRendered) {
          this._renderCards();
        }

        // Mantener la MISMA COLUMNA (slot) al navegar verticalmente
        if (slot) {
          var $sameSlot = this._getSlotElementForChannel(nextChannelIndex, slot);
          if ($sameSlot && $sameSlot.length > 0) {
            return $sameSlot;
          }
        }

        // Si no se encuentra en la misma posición, buscar el elemento útil del canal siguiente
        var $element = this._getFocusableElementForChannel(nextChannelIndex);
        console.log('_getCardBelow: resultado=', $element ? 'encontrado' : 'null');
        return $element;
      },

      /**
       * Inicia el intervalo para actualizar eventos en transmisión cada minuto
       * Sincronizado con el cambio de minuto (similar a actionMinute en home.js)
       */
      _startUpdateInterval: function() {
        var self = this;

        // Limpiar intervalo anterior si existe
        this._stopUpdateInterval();

        // Sincronizar con el cambio de minuto
        var date = new Date();
        var delayUntilNextMinute = (60 - date.getSeconds()) * 1000;

        // Ejecutar inmediatamente la primera actualización
        setTimeout(function() {
          self._updateLiveEvents();

          // Luego ejecutar cada minuto
          self.updateIntervalId = setInterval(function() {
            if (self.isShowed()) {
              self._updateLiveEvents();
            } else {
              // Si ya no está visible, detener el intervalo
              self._stopUpdateInterval();
            }
          }, 60000);
        }, delayUntilNextMinute);
      },

      /**
       * Detiene el intervalo de actualización
       */
      _stopUpdateInterval: function() {
        if (this.updateIntervalId !== null) {
          clearInterval(this.updateIntervalId);
          this.updateIntervalId = null;
        }
      },

      /**
       * Actualiza el estado de los eventos en transmisión sin re-renderizar todo el DOM
       * Solo actualiza las cards que cambiaron de estado (de "en vivo" a "pasado" o viceversa)
       */
      _updateLiveEvents: function() {
        if (!this.isShowed() || !this.epgLoaded || !this.items || this.items.length === 0) {
          return;
        }

        var self = this;
        var now = this._getNow();
        var updatedCount = 0;
        var needsRerender = false;

        // Iterar sobre todos los canales
        this.items.forEach(function(channel, channelIndex) {
          if (!channel || !channel.epgItems || channel.epgItems.length === 0) {
            return;
          }

          // Si hay una card en "Ahora", validar que siga siendo el evento en vivo; si cambió, re-render global
          var $nowCard = self.$epgGrid.find('.epg-program-card[data-channel-index="' + channelIndex + '"][data-slot="now"]').first();
          if ($nowCard && $nowCard.length) {
            var idxNow = $nowCard.data('event-index');
            if (idxNow !== undefined && idxNow !== null && channel.epgItems[idxNow]) {
              var evNow = channel.epgItems[idxNow];
              var isLiveInDom = false;
              if (evNow.startDate && evNow.endDate && now.isBetween) {
                isLiveInDom = now.isBetween(evNow.startDate, evNow.endDate, null, '[]');
              }
              if (!isLiveInDom) {
                // Buscar el nuevo evento en vivo en el canal
                for (var li = 0; li < channel.epgItems.length; li++) {
                  var evTest = channel.epgItems[li];
                  if (evTest && evTest.startDate && evTest.endDate && now.isBetween && now.isBetween(evTest.startDate, evTest.endDate, null, '[]')) {
                    needsRerender = true;
                    // Resetear paginación SOLO de este canal para evitar desfasajes
                    self._setLaterOffset(channelIndex, 0);
                    break;
                  }
                }
              }
            }
          }

          // Iterar sobre todos los eventos del canal
          channel.epgItems.forEach(function(event, eventIndex) {
            if (!event || !event.startDate || !event.endDate) {
              return;
            }

            // Determinar si el evento está en vivo ahora
            var isLiveNow = false;
            if (now.isBetween) {
              isLiveNow = now.isBetween(event.startDate, event.endDate, null, '[]');
            }

            // Buscar la card en el DOM (usar nueva clase epg-program-card)
            var $card = self.$epgGrid.find(
              '.epg-program-card[data-channel-index="' + channelIndex + '"][data-event-index="' + eventIndex + '"]'
            ).first();

            if (!$card || !$card.length) {
              return;
            }

            // Verificar el estado actual de la card
            var wasLive = $card.hasClass('live');
            var needsUpdate = false;

            // Si el estado cambió, actualizar
            if (isLiveNow !== wasLive) {
              needsUpdate = true;
              if (isLiveNow) {
                $card.addClass('live');
              } else {
                $card.removeClass('live');
              }
            }

            // Si está en vivo, actualizar progreso y metadata
            if (isLiveNow) {
              var totalDuration = getTimeDifference(event.startDate, event.endDate, 'seconds');
              var elapsed = getTimeDifference(event.startDate, now, 'seconds');
              var progress = 0;
              if (totalDuration > 0) {
                progress = Math.round((elapsed / totalDuration) * 100);
              }

              // Actualizar barra de progreso (usar nueva clase epg-program-progress)
              var $progressBar = $card.find('.epg-program-progress');
              if ($progressBar.length === 0) {
                // Crear barra de progreso si no existe
                $card.append('<div class="epg-program-progress" style="width: ' + progress + '%"></div>');
                needsUpdate = true;
              } else {
                // Actualizar ancho de la barra de progreso
                var currentWidth = parseInt($progressBar.css('width')) || 0;
                var progressPercent = (currentWidth / $card.width()) * 100;
                if (Math.abs(progressPercent - progress) > 1) { // Solo actualizar si hay diferencia significativa
                  $progressBar.css('width', progress + '%');
                  needsUpdate = true;
                }
              }
            } else if (wasLive) {
              // Si ya no está en vivo, remover barra de progreso
              $card.find('.epg-program-progress').remove();
              needsUpdate = true;
            }

            if (needsUpdate) {
              updatedCount++;
            }
          });
        });

        // Si el evento en vivo cambió (p.ej. "A Continuación" pasó a ser "Ahora"), re-renderizar para reordenar columnas
        if (needsRerender) {
          var $focusedBefore = Focus.focused;
          var focusChannelIndex = $focusedBefore && $focusedBefore.length ? $focusedBefore.data('channel-index') : null;
          var focusSlot = $focusedBefore && $focusedBefore.length ? $focusedBefore.data('slot') : null;
          self._renderCards();
          // Intentar restaurar foco en el mismo canal/slot
          if (focusChannelIndex !== undefined && focusChannelIndex !== null) {
            // Con bloqueo de "Más Tarde" evitar restaurar foco en slot later.
            if (CONFIG.app && CONFIG.app.epgDisableLaterNavigation && focusSlot === 'later') {
              focusSlot = 'next';
            }
            var $restore = self._getSlotElementForChannel(focusChannelIndex, focusSlot);
            if (!$restore || !$restore.length) {
              // El slot exacto ya no existe en la ventana re-renderizada (p.ej. cambió de
              // columna al reordenarse "A Continuación"/"Ahora"). Sin este fallback,
              // Focus.focused seguía apuntando al nodo que _renderCards() acaba de destruir
              // con .empty(), y la siguiente tecla disparaba el guard de home.js que manda
              // el foco a un elemento genérico de Home oculto detrás del modal EPG.
              $restore = self._getFocusableElementForChannel(focusChannelIndex);
            }
            if (!$restore || !$restore.length) {
              $restore = self._getFocusableElementForChannel(0);
            }
            if ($restore && $restore.length) {
              Focus.to($restore);
              self.ensureItemVisibility($restore);
            }
          }
        }

        if (updatedCount > 0) {
          console.log('EPGCards._updateLiveEvents: actualizadas ' + updatedCount + ' cards');
        }
      }
    });

    return EPGCards;
  })(Events);
