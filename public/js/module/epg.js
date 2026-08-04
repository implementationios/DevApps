EPG = (function (Events) {

  var EPG = {};

  $.extend(true, EPG, Events, {
      init: function () {
          this.items = [];
          this.scrollSizeJump = 0;
          this.$epgGrid = null;
          this.epgMinuteWidth = 0;
          this.epgUnitName = "";
          this.$epgContainer = null;
          this.bodyFontSize = 0;
          this.$defaultFocus = null;
          this.$lastEpgFocused = null;
          this.epgLoaded = false;
          this.homeObject = null;
          this.timeIntervalMinutes = null;
          this.loading = null;
          this.rowsOnInit = CONFIG.app.newEpgRowsOnInit;
          this.epgStartDate = null;
          this.populatedRows = {};
      },

      isShowed: function() {
          return $("#epgContainer").is(":visible") && $("#epgContainer").css('visibility') == "visible";
      },

      initializeValues: function() {
          this.$epgGrid = $("#epgGrid");
          this.$epgContainer = $("#epgContainer");
          this.$defaultFocus = $("#divVideoContainer");
          this.bodyFontSize = parseFloat($("body").css("font-size"));
          this.epgUnitName = "em";
          this.$epgEventTitle = $("#epgEventTitle");
          this.$epgEventTime = $("#epgEventTime");
          this.$epgEventDescription = $("#epgEventDescription");
          this.$infoServicesGroup = $(".info-services");
          this.$epgInfoEPGGroup = $(".info-epg");
          this.$channelLcnLabel = $("#channelLcnLabel");
          this.$channelNameLabel = $("#channelNameLabel");
          this.$sceneParent = this.$epgContainer.closest(".scene");

          // var epgDialogDetails = getHtmlDialogEpgDetails();

          if (this.$epgGrid.find(".epg-dialog-details").length == 0) {
              EPGDetails.init($("#epgContainer"));

              // this.$epgGrid.append(epgDialogDetails);
              // this.$detailDialog = this.$epgGrid.find(".epg-dialog-details:first");
              // //addImgErrorEvent(this.$detailDialog.find("img"));

              // var self = this;
              // this.$detailDialog.on('shown.bs.modal', function(){
              //     Focus.to(self.$detailDialog.find(".modal-footer button:visible:last"));
              // });
              // this.$detailDialog.on('hidden.bs.modal', function(){
              //     if (self.$lastEpgFocused != null) {
              //         Focus.to(self.$lastEpgFocused);
              //     }
              // });
          }

          this.$detailEventImage = this.$epgGrid.find(".epg-dialog-details-img:first");
          this.$detailChannelName = this.$epgGrid.find(".epg-dialog-details-header-channel:first");
          this.$detailChannelLcn = this.$epgGrid.find(".epg-dialog-details-header-lcn:first");
          this.$detailTime = this.$epgGrid.find(".epg-dialog-details-header-time:first");
          this.$detailDuration = this.$epgGrid.find(".epg-dialog-details-header-duration:first");
          this.$detailFavButton = this.$epgGrid.find(".epg-dialog-details-header-fav:first");
          this.$detailTitle = this.$epgGrid.find(".epg-dialog-details-title:first");
          this.$detailDescription = this.$epgGrid.find(".epg-dialog-details-description:first");
          this.$detailRecordButton = this.$epgGrid.find(".epg-dialog-record:first");
          this.$detailLiveButton = this.$epgGrid.find(".epg-dialog-live:first");
          this.$detailWatchButton = this.$epgGrid.find(".epg-dialog-watch:first");
      },

      onFocus: function ($el) {
          if (!this.epgLoaded) {
              return;
          } else if ($el.attr("id") == "divVideoContainer") {
              return;
          } else if (EPGDetails.isShowed()) {
              return;
          }

          $("#menuTitle").addClass("hidden");
    $("#channelInfoDiv").removeClass("hidden");
          this.$infoServicesGroup.addClass("hidden");
          this.$epgInfoEPGGroup.removeClass("hidden");
          this.currentServiceFocused = null;
          this.currentEpgItemFocused = null;

    if (typeof $el.data("date") != 'undefined' && $el.data("date").length > 0) {
      $(".epg-date-indicator").html($el.data("date"));
    }

          var serviceId = $el.data("service-id");

          if (serviceId <= 0) {
              this.$epgInfoEPGGroup.text("");
              this.$epgEventTitle.text(__("EPGItemNoData"));
              return;
          }

          this.currentServiceFocused = AppData.getServiceTV(serviceId);

          if (this.currentServiceFocused != false) {
              this.$channelLcnLabel.text(this.currentServiceFocused.lcn);
              this.$channelNameLabel.text(this.currentServiceFocused.name);
          }

          var posX = $el.data("x");
          var posY = $el.data("y");

        if (typeof posX != 'undefined' && typeof posY != 'undefined' && posX != null && posY != null &&
          posX < this.items.length && typeof this.items[posX].epgItems != 'undefined' && posY < this.items[posX].epgItems.length) {
          this.currentEpgItemFocused = this.items[posX].epgItems[posY];

          // Título con rating
          var titleText = this.getEPGItemTitle();
          var ratingIcon = this.homeObject.getRatingIconHtml(this.currentEpgItemFocused.parentalRating || "");
          this.$epgEventTitle.html(titleText + " " + ratingIcon); // ✅ Cambiar .text() por .html()

          this.$epgEventTime.text(this.getEPGItemTimeString());
          this.$epgEventDescription.text(this.getEPGItemDescription());
        } else {
          this.$epgInfoEPGGroup.text("");
          this.$epgEventTitle.text(__("EPGItemNoData"));
        }
      },

      show: function() {
          $("#channelsGrid").hide();
          $("#epgContainer").css({"visibility": "visible"});
          $("#epgContainer").show();

          var $defaultChannelFocus = this.getCurrentChannelEPGItem();
          if ($defaultChannelFocus && $defaultChannelFocus.length) {
              this.$lastEpgFocused = $defaultChannelFocus;
              if (this.focusAndEnsureVisible($defaultChannelFocus)) {
                  return;
              }
          }

          if (this.$lastEpgFocused != null && this.focusAndEnsureVisible(this.$lastEpgFocused)) {
              return;
          }

          this.focusAndEnsureVisible($(".first-focus"));
      },

      hide: function() {
          $("#epgContainer").css({"visibility": "hidden"});
          $("#channelsGrid").show();
          $("#epgContainer").hide();
      },

      reset: function() {
          this.epgLoaded = false;
          this.$lastEpgFocused = null;

          $(".epg-message").text(__("EPGLoading"));
          $(".epg-message").show();
          $("#epgHours").html("");
          $("#epgChannels").html("");
          $(".epg-date-indicator").html("");
          $("#epgGrid").html("");
          $(".epg-date-indicator").css({"visibility": "hidden"});
          this.items = [];
          this.populatedRows = {};

          if (this.timeIntervalMinutes != null) {
              clearInterval(this.timeIntervalMinutes);
          }

          $("#epgContainer").css({"visibility": "hidden"});
          $("#epgContainer").show();
      },

      draw: function(servicesWithEPG) {
          this.initializeValues();

          this.items = servicesWithEPG;
          var nowDate = getTodayDate();
          this.epgStartDate = getTodayDate();
          var endDate = getTodayDate();
          var self = this;

          // get first and last date of all epg events
          $.each(this.items, function(i, channel) {
              if (channel.epgItems != null && channel.epgItems.length > 0) {
                  if (channel.epgItems[0].startDate < self.epgStartDate) {
                      self.epgStartDate = channel.epgItems[0].startDate;
                  }
                  if (channel.epgItems[channel.epgItems.length - 1].endDate > endDate) {
                      endDate = channel.epgItems[channel.epgItems.length - 1].endDate;
                  }
              }
          });

          this.epgStartDate.subtract(this.epgStartDate.minutes(), "minutes"); // round start date to exact hour

          var totalAllHours = getTimeDifference(this.epgStartDate, endDate, "hours");
          var halfHoursTotal = (totalAllHours * 2);
          var initialDate = this.epgStartDate.clone();
          var halfHoursList = [this.epgStartDate];
          for (var i = 0; i < halfHoursTotal; i++) {
              initialDate.add(30, "minutes");
              var newDate = initialDate.clone();
              halfHoursList.push(newDate);
          }

          // constants
          var hourWidth = 12;
          var spaceBetweenCells = 0.2;
          this.epgUnitName = "em";
          var channelWidth = 10;
          this.epgMinuteWidth = hourWidth / 60;
          var halfHourWidth = hourWidth / 2;

          var minutesFromStart = 0;
          var epgItemsHtml = "";
          var epgChannelsHtml = "";
          var epgHoursHtml = "";
          var duration = 0;
          var epgRowHeight = 0;

          // hour header
          epgHoursHtml = "<div class='row'>";
          //epgHoursHtml += "<div class='epg-cell epg-hour-header epg-date-indicator' style='width: " + (channelWidth - spaceBetweenCells) + this.epgUnitName + "'>Time</div>";
          $.each(halfHoursList, function(x, iTime) {
              minutesFromStart = getTimeDifference(iTime, self.epgStartDate, 'minutes');
              epgHoursHtml += "<div class='epg-cell epg-hour-header' style='position:absolute; left: "
                              + (minutesFromStart * self.epgMinuteWidth) + self.epgUnitName + "; width: " + (halfHourWidth - spaceBetweenCells) + self.epgUnitName + "'>"
                              + getDateFormatted(iTime, true) + "</div>";
          });
          epgHoursHtml += "</div>";

          // channels
          var events = 0;
          var firstFocusFound = false;
          var firstFocus = "";
          var imgStyle = "";
          $.each(this.items, function(x, channel) {

              imgStyle = "";
              if (channel.backgroundColor != null && typeof channel.backgroundColor != 'undefined') {
        imgStyle = " background-color: #" + channel.backgroundColor;
      }

              epgChannelsHtml += "<div class='row' data-service-id='" + channel.id + "'>"
              + "<div class='epg-cell epg-channel-header' style='width: " + (channelWidth - spaceBetweenCells) + self.epgUnitName + "'>"
              + "<div><span>" + channel.lcn + "</span><img src='" + channel.img + "' onerror='imgOnError(this)' alt='' style='" + imgStyle + "'></div>"
              + "</div></div>";

              // if (CONFIG.app.brand == self.newEpgBrand) {
              //     epgItemsHtml += self.getHtmlRow(x, false, !firstFocusFound);
              //     firstFocusFound = true;
              //     events = 1;
              // } else {
              epgItemsHtml += "<div class='row'>";

              var prevEndDate = self.epgStartDate;
              // epg items

              if (channel.epgItems != null && channel.epgItems.length > 0) {
                  $.each(channel.epgItems, function(y, item){

                      if (!firstFocusFound && item.endDate > nowDate) {
                          firstFocus = "first-focus";
                          firstFocusFound = true;
                      }

                      var diffPrev = getTimeDifference(prevEndDate, item.startDate, 'minutes');
                      if (diffPrev > 0) {
                          minutesFromStart = getTimeDifference(prevEndDate, self.epgStartDate, 'minutes');
                          duration = getTimeDifference(prevEndDate, item.startDate, 'minutes');
                          epgItemsHtml += "<div class='epg-cell epg-channel-item focusable " + firstFocus + "' style='position:absolute; left: "
                          + (minutesFromStart * self.epgMinuteWidth) + self.epgUnitName + "; width: " + (duration * self.epgMinuteWidth - spaceBetweenCells) + self.epgUnitName + "'"
                          + " data-date='" + getDateFormatted(prevEndDate, false) + "' data-service-id='" + channel.id + "'>" + __("EPGNoData") + "</div>";
                      }


                      events += channel.epgItems.length;
                      minutesFromStart = getTimeDifference(item.startDate, self.epgStartDate, 'minutes');
                      duration = getTimeDifference(item.startDate, item.endDate, 'minutes');



                      // Punto 24: eventos <30 min quedaban con un ancho real
                      // (duration * epgMinuteWidth) tan chico que el título se
                      // veía cortado a la mitad sin ninguna pista de qué
                      // programa era. Se marca con una clase de tamaño y un
                      // tooltip que muestra título+horario completos al enfocar.
                      var epgCellSizeClass = duration < 15 ? "epg-cell-very-short" : (duration < 30 ? "epg-cell-short" : "");
                      epgItemsHtml += "<div class='epg-cell epg-channel-item focusable " + epgCellSizeClass + " " + firstFocus + "' style='position:absolute; left: "
                                  + (minutesFromStart * self.epgMinuteWidth) + self.epgUnitName + "; width: " + (duration * self.epgMinuteWidth - spaceBetweenCells) + self.epgUnitName + "'"
                                  + " data-date='" + getDateFormatted(item.startDate, false) + "' data-service-id='" + channel.id + "' data-x='" + x + "' data-y='" + y + "'>"
                                  + "<span class='epg-cell-title'>" + item.languages[0].title + "</span>"
                                  + (epgCellSizeClass ? "<span class='epg-cell-tooltip'><span class='epg-cell-tooltip-title'>" + item.languages[0].title + "</span><span class='epg-cell-tooltip-time'>" + getDateFormatted(item.startDate, true) + " - " + getDateFormatted(item.endDate, true) + "</span></span>" : "")
                                  + "</div>";
                      firstFocus = "";

                      prevEndDate = item.endDate;
                  });
              } else {
                  if (!firstFocusFound) {
                      firstFocus = "first-focus";
                      firstFocusFound = true;
                  }

                  minutesFromStart = 0;
                  duration = getTimeDifference(self.epgStartDate, endDate, 'minutes');
                  // Punto 33: distinguir "canal sin EPG" de "falló la carga"
                  // (channel.epgLoadFailed, seteado en downloadChannelEPG) --
                  // ver mismo criterio en EPGCards.js.
                  // data-x/data-y: sin esto, getNextFocusableByTime() no
                  // puede razonar sobre canales sin contenido y SIEMPRE cae
                  // al método viejo por píxeles al entrar/salir de ellos --
                  // con varios canales seguidos sin EPG, eso se repite en
                  // cascada y se siente como que la navegación se traba.
                  // data-y='0' es un sentinel fijo (no hay eventos reales que
                  // indexar en un canal sin EPG).
                  epgItemsHtml += "<div class='epg-cell epg-channel-item focusable " + (channel.epgLoadFailed ? "epg-cell-load-error " : "") + firstFocus + "' style='position:absolute; left: "
                  + (minutesFromStart * self.epgMinuteWidth) + self.epgUnitName + "; width: " + (duration * self.epgMinuteWidth - spaceBetweenCells) + self.epgUnitName + "'"
                  + " data-date='" + getDateFormatted(self.epgStartDate, false) + "' data-service-id='" + channel.id + "' data-x='" + x + "' data-y='0'>" + (channel.epgLoadFailed ? __("EPGLoadErrorMessage") : __("EPGNoData")) + "</div>";
                  firstFocus = "";
              }

              epgItemsHtml += "</div>";
              // }
          });

          if (events > 0) {
              $(".epg-message").hide();

              $("#epgHours").html(epgHoursHtml);
              $("#epgChannels").html(epgChannelsHtml);
              this.$epgGrid.html(epgItemsHtml);

              // draw() pinta TODAS las filas de una vez (con contenido real
              // o placeholder "sin EPG"), así que todas quedan "pobladas"
              // desde el arranque. Se registra acá para que
              // gridOptimization() sepa de entrada qué filas existen y
              // pueda decidir bien cuál limpiar más adelante -- ver
              // comentario detallado en gridOptimization().
              this.populatedRows = {};
              for (var pr = 0; pr < this.items.length; pr++) {
                  this.populatedRows[pr] = true;
              }

              //calculate row height
              $("#epgDate").css({"width": (channelWidth - spaceBetweenCells) + this.epgUnitName})
              epgRowHeight = ((this.$epgGrid.parent().height() - 60) / 5); //$(".epg-grid .row .epg-cell:first").innerHeight();
              $(".epg-container .row").height(epgRowHeight);
              $(".epg-container .row").css({"margin-bottom": spaceBetweenCells + this.epgUnitName})

              //calculate epg grid width and height
              var epgGridWidth = this.$epgGrid.parent().width() - $("#epgDate").width() - 1;
              var epgGridHeight = $("#epgChannels").parent().innerHeight() - epgRowHeight;
              this.$epgGrid.css({'width': epgGridWidth + 'px'});
              $("#epgHours").css({'width': epgGridWidth + 'px'});
              $("#epgChannels").height(epgGridHeight);

              this.$epgGrid.css("height", "auto");
              var outerContentsHeight = this.$epgGrid.height();
              this.$epgGrid.height(epgGridHeight);
              this.$epgGrid.data("height", outerContentsHeight);

              // add current time line and add style/text to date indicator
              $(".epg-date-indicator").html(__("EPGToday"));
              $(".epg-date-indicator").css({"visibility": "visible"});

              this.$epgGrid.on( 'scroll', function(){
                  $("#epgHours").stop(true,true).animate({ scrollLeft: $(this).scrollLeft()}, 10);
                  $("#epgChannels").stop(true,true).animate({ scrollTop: $(this).scrollTop()}, 10);
              });

              this.scrollSizeJump = epgRowHeight + (parseFloat($(".epg-grid .row:first").css("marginBottom").replace("px", "")))
                                  + (parseFloat($(".epg-grid .row:first").css("marginTop").replace("px", "")));

              // add current time indicator
              var startLeft = getTimeDifference(nowDate, this.epgStartDate, 'minutes') * this.epgMinuteWidth;

              this.$epgGrid.append("<div class='epg-current-time-indicator' style='background: " + CONFIG.app.epgLineColorTime + "'></div>");
              $(".epg-current-time-indicator").height(outerContentsHeight);
              $(".epg-current-time-indicator").css({'left': startLeft + this.epgUnitName});
              this.$epgGrid.scrollLeft((startLeft * this.bodyFontSize) - (this.$epgGrid.width() / 2));
              $("#epgHours").scrollLeft($("#epgGrid").scrollLeft());

              this.timeIntervalMinutes = setInterval(function(){
                  var nowDate = getTodayDate();
                  var leftTo = getTimeDifference(nowDate, self.epgStartDate, 'minutes') * self.epgMinuteWidth;
                  $(".epg-current-time-indicator").css({'left': leftTo + self.epgUnitName});
                  console.log("Time indicator updated: " + leftTo);
              }, 60000);

              this.epgLoaded = true;

              if (this.isShowed()) {
                  Focus.to($(".first-focus"));
              } else {
                  $("#epgContainer").hide();
              }

              this.$epgGrid.find(".row:last").css({"margin-bottom": "1em"});
          } else {
              $(".epg-message").text(__("EPGNoData"));
              this.epgLoaded = true;
              $("#epgContainer").hide();
          }
      },

      navigate: function (direction) {

          if (!this.epgLoaded) {
              return $(".video-container");
          }

          // Bloquear navegación a la derecha hacia eventos futuros si la bandera está habilitada
          // (EPG tradicional no tiene columnas explícitas como EPGCards, así que se bloquea RIGHT completo)
          if (CONFIG.app && CONFIG.app.epgDisableLaterNavigation && direction == "right") {
              return;
          }
          var $focused = Focus.focused;

          if ((direction == "up" || direction == "down") && this.loading != null) {
              var newIndex = $focused.parent().index() + (direction == "down" ? 1 : -1);
              if (newIndex < (this.loading - 7) || newIndex > (this.loading - 1)) {
                  console.log("EPG loading, please wait.");
                  return;
              }
          }

    var $focusTo = [];
          this.countNextFocusable = 0;

          if ($focused.hasClass("video-container")) {
      if (direction == "down") {
        $focusTo = this.$lastEpgFocused;
      } else {
                  return;
              }
    } else if (EPGDetails.isShowed()) {
              EPGDetails.navigate(direction);
              // if (direction == "up" && this.$detailFavButton.is(":visible")) {
              //     Focus.to(this.$detailFavButton);
              // } else if (direction == "down" && Focus.focused.is(this.$detailFavButton)) {
              //     Focus.to(this.$detailDialog.find(".modal-footer button:visible:last"));
              // } else if (direction == "left" && $focused.hasClass("btn-default")) {
              //     Focus.to($focused.prev("button"));
              // } else if (direction == "right" && $focused.hasClass("btn-default")) {
              //     Focus.to($focused.next("button"));
              // }
    } else {
              var currentHeight = $focused.height();
              var positionStartTop = $focused.position().top - (currentHeight / 2);
              var positionStartLeft = $focused.position().left + $focused.innerWidth() / 2;

              if (direction == "up" || direction == "down") {
                  // Navegación vertical alineada por horario (ver
                  // doc/MEJORA_NAVEGACION_VERTICAL_EPG.md): en vez de buscar el
                  // siguiente foco por posición en píxeles, se busca directamente
                  // por índices lógicos (data-x/data-y) el evento del canal
                  // siguiente que cubre la misma franja horaria del evento
                  // actualmente enfocado. Devuelve null cuando no se puede resolver
                  // así (foco sin data-x/data-y utilizable, o fila destino sin EPG
                  // cargada/renderizada todavía) y en ese caso se usa el método
                  // antiguo por píxeles como respaldo, que ya sabe disparar la
                  // carga diferida (drawNewRow) para esos casos.
                  $focusTo = this.getNextFocusableByTime(direction);

                  if ($focusTo === null) {
                      positionStartTop = direction == "up" ? ($focused.position().top) : ($focused.position().top + $focused.innerHeight());
                      positionStartLeft = $focused.position().left + ($focused.innerWidth() / 2 > this.$epgGrid.width() ? 0 : $focused.innerWidth() / 2);

                      var startLeft = $focused.position().left;
                      var endLeft = $focused.position().left + $focused.innerWidth();

                      if (startLeft > 0 && endLeft < this.$epgGrid.width()) {
                          positionStartLeft = $focused.position().left + ($focused.innerWidth() / 2);
                      } else if (startLeft < 0 && endLeft < this.$epgGrid.width()) {
                          positionStartLeft = endLeft;
                      } else if (startLeft > 0 && endLeft > this.$epgGrid.width()) {
                          positionStartLeft = startLeft;
                      } else {
                          positionStartLeft = this.$epgGrid.width() / 2;
                      }

                      $focusTo = this.getNextFocusable(direction, positionStartTop, positionStartLeft);
                  }
              } else if (direction == "left") {
                  $focusTo = $focused.prev(".focusable");
              } else if (direction == "right") {
                  $focusTo = $focused.next(".focusable");
              }
          }

    if ($focusTo.length > 0) {
              this.$lastEpgFocused = Focus.focused;
      Focus.to($focusTo);

      // Antes este ajuste desplazaba siempre por el ANCHO COMPLETO de la
      // celda enfocada (+10px), sin importar cuánto hiciera falta en
      // realidad. Como el ancho de la celda varía mucho según la duración
      // del evento (un bloque de 3hs vs uno de 1.5hs, ambos "en vivo" a la
      // misma hora), moverse verticalmente entre canales con eventos de
      // distinto tamaño generaba saltos de scroll horizontal
      // impredecibles, aunque el usuario solo se moviera arriba/abajo --
      // eso es lo que terminaba "perdiendo" de vista el evento en curso.
      // Se reemplaza por el mismo cálculo mínimo-necesario que ya usa
      // ensureItemVisibility() (incluye el resguardo de la tarea #4 para
      // celdas más anchas que la grilla, como la de "sin EPG"): solo
      // desplaza lo justo para que la celda entre en la vista, y no toca
      // el scroll si ya está visible.
      var $focusLeft = $focusTo.position().left;
      var $focusRight = $focusLeft + $focusTo.outerWidth();
      var $focusGridWidth = this.$epgGrid.innerWidth();
      var $focusCurrentLeft = this.$epgGrid.scrollLeft();
      var $focusCoversViewport = ($focusLeft <= 0 && $focusRight >= $focusGridWidth);

      if (!$focusCoversViewport) {
          if ($focusLeft < 0) {
              this.$epgGrid.scrollLeft(Math.max(0, $focusCurrentLeft + $focusLeft));
          } else if ($focusRight > $focusGridWidth) {
              this.$epgGrid.scrollLeft($focusCurrentLeft + ($focusRight - $focusGridWidth));
          }
      }

              if ($focusTo.position().top < 0) {
                  this.$epgGrid.scrollTop(this.$epgGrid.scrollTop() + $focusTo.position().top);
              } else {
                  var $nextRow = $focusTo.closest(".row");
                  if ($nextRow.position().top + $nextRow.height() > this.$epgGrid.height() - 20) {
                      var jump = ($nextRow.position().top + $nextRow.height()) - (this.$epgGrid.height()) + 20;
                      jump = this.$epgGrid.scrollTop() + jump;

                      if (jump != Math.round(this.$epgGrid.scrollTop()) && jump != Math.floor(this.$epgGrid.scrollTop())) {
                          this.$epgGrid.scrollTop(jump);

                          this.drawNewRow($focusTo, direction);
                      }

                  }
              }
    }
  },

  getNextFocusable: function(direction, top, left) {
          this.countNextFocusable++;

          if(this.countNextFocusable > 50) {
              // Antes: "return;" devolvía undefined, y navigate() hacía
              // "$focusTo.length" sobre undefined -> TypeError no controlado
              // que interrumpía el manejo de la tecla. Como el foco nunca
              // llegaba a moverse antes del crash, cada tecla repetía la
              // misma búsqueda costosa y el mismo error -- se sentía como
              // que la EPG "se congelaba" al bajar. Se devuelve una colección
              // vacía, igual que el resto de los casos "no se encontró nada"
              // de esta función, para que navigate() simplemente no mueva el
              // foco en vez de crashear.
              return [];
          }

          var $itemAtPoint = [];
    var $focused = Focus.focused;
    var jumpTopTo = top;

    if (direction == 'up') {
      jumpTopTo = top - ($focused.innerHeight() / 2);

      if ($focused.closest(".row").index() == 0) { // check if first epg row
        return this.$defaultFocus;
      } else if (jumpTopTo < 0) {
        jumpTopTo = top + $focused.innerHeight() / 2;
        //this.$epgGrid.scrollTop(this.$epgGrid.scrollTop() - this.scrollSizeJump);

                  var jump = this.$epgGrid.scrollTop() - this.scrollSizeJump;
                  if (jump != Math.round(this.$epgGrid.scrollTop()) && jump != Math.floor(this.$epgGrid.scrollTop())) {
                      this.$epgGrid.scrollTop(jump);

                      this.drawNewRow($focused, direction);
                  }
      }
    } else if (direction == 'down') {
      jumpTopTo = top + 10; //$focused.innerHeight() / 2;

      if ($focused.closest(".row").index() == (this.$epgGrid.find(".row").length - 1)) { // check if last epg row
        return $itemAtPoint;
      } else if (jumpTopTo > this.$epgGrid.height()) {
        jumpTopTo = top - ($focused.innerHeight() / 2);
        this.$epgGrid.scrollTop(this.$epgGrid.scrollTop() + this.scrollSizeJump);
      } else if (jumpTopTo > Number(this.$epgGrid.data("height"))) {
        return $itemAtPoint;
      }
    }

    $itemAtPoint = this.$epgGrid.getFocusableItemAt(jumpTopTo, left);

    if ($itemAtPoint.length > 0) {
      return $itemAtPoint;
    }


          var space = this.$epgGrid.width();
          var jumps = (this.epgMinuteWidth * this.bodyFontSize) * 5; // search event each 5 minutes to left and right (px)
          var posX = 0;
          for (var i = jumps ; i < (jumps * 12) ; i += jumps) {

              //search to left
              posX = left - i;
              console.log("Search to left " + posX);
              if (posX > 0) {
                  $itemAtPoint = this.$epgGrid.getFocusableItemAt(jumpTopTo, posX);

                  if ($itemAtPoint.length > 0) {
                      return $itemAtPoint;
                  }
              }

              //search to right
              posX = left + i;
              console.log("Search to right " + posX);
              if (posX < space) {
                  $itemAtPoint = this.$epgGrid.getFocusableItemAt(jumpTopTo, posX);

                  if ($itemAtPoint.length > 0) {
                      return $itemAtPoint;
                  }
              }
          }

    return this.getNextFocusable(direction, jumpTopTo, left);
  },

  /**
   * Busca el siguiente foco vertical alineado por horario, en vez de por
   * posición en píxeles. Ver doc/MEJORA_NAVEGACION_VERTICAL_EPG.md.
   *
   * @param {String} direction 'up' o 'down'
   * @returns {Object|Array|null} jQuery del elemento a enfocar, un array
   *  vacío si se llegó al límite de la grilla (comportamiento final, no
   *  reintentar), o null si no se pudo resolver por este método y
   *  navigate() debe recurrir al getNextFocusable() antiguo (por píxeles).
   */
  getNextFocusableByTime: function (direction) {
      var $focused = Focus.focused;
      var currentX = $focused.data('x');
      var currentY = $focused.data('y');

      if (typeof currentX === 'undefined' || currentX === null ||
          typeof currentY === 'undefined' || currentY === null) {
          // El elemento enfocado no tiene data-x/data-y (p.ej. una celda de
          // relleno "EPGNoData" entre eventos) -- no hay forma de calcular
          // la franja horaria de referencia, usar el método antiguo.
          return null;
      }

      currentX = parseInt(currentX, 10);
      currentY = parseInt(currentY, 10);

      var currentChannel = this.items[currentX];
      if (!currentChannel || !currentChannel.epgItems) {
          return null;
      }

      var now = getTodayDate();
      var targetTime;

      // Canal sin contenido (celda de relleno "EPGNoData"/error, data-y='0',
      // ver draw()/getHtmlRow()): no hay un "evento enfocado" real del cual
      // derivar la franja horaria, así que se usa "ahora" directamente. Sin
      // este caso especial, epgItems.length === 0 hacía que
      // epgItems[currentY] fuera undefined y la función devolviera null,
      // forzando el método viejo por píxeles cada vez que el foco estaba
      // sobre un canal sin EPG.
      if (currentChannel.epgItems.length === 0) {
          targetTime = now;
      } else {
          var currentEvent = currentChannel.epgItems[currentY];
          if (!currentEvent || !currentEvent.startDate || !currentEvent.endDate) {
              return null;
          }

          // Tiempo de referencia: si "ahora" cae dentro del evento enfocado, se
          // usa "ahora" (mantiene al usuario sincronizado con la franja en vivo
          // al navegar entre canales); si el evento es pasado o futuro, se usa
          // su punto medio.
          if (now.isSameOrAfter(currentEvent.startDate) && now.isBefore(currentEvent.endDate)) {
              targetTime = now;
          } else {
              var eventDuration = getTimeDifference(currentEvent.startDate, currentEvent.endDate, 'minutes');
              targetTime = currentEvent.startDate.clone().add(eventDuration / 2, 'minutes');
          }
      }

      var nextRow = direction == 'down' ? (currentX + 1) : (currentX - 1);

      if (nextRow < 0) {
          return this.$defaultFocus;
      }
      if (nextRow >= this.items.length) {
          return $();
      }

      var nextChannel = this.items[nextRow];
      if (!nextChannel || !nextChannel.epgItems) {
          // Sin EPG cargada aún para ese canal (carga diferida pendiente):
          // dejar que el método antiguo dispare drawNewRow().
          return null;
      }

      if (nextChannel.epgItems.length === 0) {
          // Canal siguiente sin contenido: ya tiene su celda de relleno con
          // data-x/data-y='0' (ver draw()/getHtmlRow()), así que se puede
          // enfocar directamente sin caer al método por píxeles.
          var $emptyCell = this.$epgGrid.find(".epg-channel-item[data-x='" + nextRow + "'][data-y='0']");
          if ($emptyCell.length === 0) {
              // Los datos ya están (epgItems == [], procesado), solo falta
              // pintar la fila porque gridOptimization() la vació al salir
              // de la ventana virtualizada. Forzar el re-render y reintentar
              // en vez de caer al método por píxeles -- ver comentario
              // detallado más abajo, mismo motivo.
              this.gridOptimization(nextRow, direction);
              $emptyCell = this.$epgGrid.find(".epg-channel-item[data-x='" + nextRow + "'][data-y='0']");
          }
          return $emptyCell.length ? $emptyCell : null;
      }

      // Buscar el evento del canal siguiente que contenga el tiempo objetivo;
      // si ninguno lo contiene, usar el más cercano por tiempo.
      var targetY = -1;
      var minDiff = Infinity;
      for (var i = 0; i < nextChannel.epgItems.length; i++) {
          var ev = nextChannel.epgItems[i];
          if (!ev.startDate || !ev.endDate) {
              continue;
          }
          if (targetTime.isSameOrAfter(ev.startDate) && targetTime.isBefore(ev.endDate)) {
              targetY = i;
              break;
          }
          var diff = Math.abs(getTimeDifference(ev.startDate, targetTime, 'minutes'));
          if (diff < minDiff) {
              minDiff = diff;
              targetY = i;
          }
      }

      if (targetY < 0) {
          return null;
      }

      var $target = this.$epgGrid.find(".epg-channel-item[data-x='" + nextRow + "'][data-y='" + targetY + "']");
      if ($target.length === 0) {
          // La fila destino existe en los datos (epgItems ya cargados, por
          // eso llegamos hasta acá) pero su HTML fue vaciado por
          // gridOptimization() al salir de la ventana virtualizada. Antes se
          // devolvía null y se caía al método viejo por píxeles, que calcula
          // su posición de referencia a partir del ancho/posición de la
          // celda actualmente enfocada -- si esa celda es la de "sin EPG"
          // (ocupa todo el ancho del día), ese cálculo da un punto sin
          // sentido y el foco terminaba saltando a otro lugar en vez de
          // quedarse alineado con la misma franja horaria. Como los datos ya
          // están, alcanza con forzar el re-render de la fila (síncrono
          // cuando epgItems ya existe, ver drawNewRow/gridOptimization) y
          // reintentar la búsqueda por el mismo método rápido.
          this.gridOptimization(nextRow, direction);
          $target = this.$epgGrid.find(".epg-channel-item[data-x='" + nextRow + "'][data-y='" + targetY + "']");
          if ($target.length === 0) {
              return null;
          }
      }

      return $target;
  },

      onEnter: function($el, callbackForPlay) {

          if (EPGDetails.isShowed()) {//show epg detail dialog
              EPGDetails.onEnter(Focus.focused);
          } else if (this.currentEpgItemFocused == null || this.currentServiceFocused == null) {
              return;

          } else if ($el.is(this.$detailWatchButton)) {
              this.playCatchup(callbackForPlay);
              this.closeEPGDialog();
              nbPlayer.requestFullscreen();
              return;


          } else if ($el.isInAlertMessage(this.homeObject.$el)) {
              var self = this;
              $el.closeAlertThen(function() { Focus.to(self.$lastEpgFocused); });
          } else {
              var now = getTodayDate();
              var metadata = null;
              if (this.currentEpgItemFocused.endDate < now) { //catchup (past event)
                  var catchup = AppData.getCatchupByEventId(this.currentEpgItemFocused.catchupId);
                  metadata = {
                      'type': 'catchup-event',
                      'item': catchup ? catchup : null
                  };
              }

              if (!metadata || metadata.item == null) {
                  // live event
                  metadata = {
                      'type': 'service',
                      'item': this.currentServiceFocused
                  };

                  if (this.currentEpgItemFocused.startDate > now) { //epgItem (future event)
                      metadata.item2 = this.currentEpgItemFocused
                  }
              }

              EPGDetails.show($("#epgContainer"), metadata, this.homeObject, Focus.focused);
          }

      },

      getEPGItemTimeString: function() {
          if (this.currentEpgItemFocused == null) { return "" }

          return (this.currentEpgItemFocused.parentalRating > 0 ? (" + " + this.currentEpgItemFocused.parentalRating + " ") : "")
                  + getDateFormatted(this.currentEpgItemFocused.startDate)
                  + " "
                  + getDateFormatted(this.currentEpgItemFocused.startDate, true)
                  + " - " + getDateFormatted(this.currentEpgItemFocused.endDate, true);
      } ,

      getEPGItemTimeStringByEpgItem: function(item) {
          if (item == null) { return "" }

          var text = (item.parentalRating > 0 ? (" + " + item.parentalRating + " ") : "");

          if (item.startDate && item.endDate) {
              text += getDateFormatted(item.startDate)
                  + " "
                  + getDateFormatted(item.startDate, true)
                  + " - " + getDateFormatted(item.endDate, true);
          }

          return text;
      },

      getEPGItemDescription: function() {
          if (this.currentEpgItemFocused == null) { return "" }

          var languages = this.currentEpgItemFocused.languages || [];
          return languages.length > 0 ? (languages[0].extendedDescription || "") : "";
      },

      getEPGItemTitle: function() {
          if (this.currentEpgItemFocused == null) { return "" }

          var languages = this.currentEpgItemFocused.languages || [];
          return languages.length > 0 ? (languages[0].title || "") : "";
      },

      playCatchup: function(callbackForPlay) {
          var now = getTodayDate();
          var catchup = false;
          if (this.currentEpgItemFocused != null && this.currentEpgItemFocused.endDate < now) { //search and play catchup
              catchup = AppData.getCatchupByEventId(this.currentEpgItemFocused.catchupId);
              if (catchup !== false) {
                  AppData.getTopLevelCatchupM3u8Url(catchup.id, function (url) {
                      console.log("Play CATCHUP with URL: " + url);
                      if (url != null && url.length > 0) {
                          callbackForPlay("catchup-event", catchup.id, url, catchup);
                      }
                  });
              }
          }
      },

      playLive: function(callbackForPlay) {
          if (this.currentEpgItemFocused != null) { // play live
              callbackForPlay("service", this.currentServiceFocused.id, this.currentServiceFocused.url, this.currentServiceFocused);
          }
      },

      onReturn: function(callback) {
          if (EPGDetails.isShowed()) {
              EPGDetails.close();
          } else if (Focus.focused.isInAlertMessage(this.homeObject.$el)) {
              var self = this;
              Focus.focused.closeAlertThen(function() {
                  Focus.to(self.$lastEpgFocused);
              });
          } else {
              this.hide();
              callback();
          }
      },

      onFavorite: function() {
          if (this.currentServiceFocused != null) {
              var lcn = this.currentServiceFocused.lcn;

              var favorites = User.getServicesTVFavorited();
              if (favorites.length > 0) {
                  var index = User.hasServiceTVFavorited(lcn);
                  if (index >= 0) { // remove favorite
                      favorites.splice(index, 1);
                      this.$detailFavButton.removeClass("nb-icon-star-fill");
                      this.$detailFavButton.addClass("nb-icon-star");
                  } else { // add favorite
                      favorites.push(lcn);
                      this.$detailFavButton.removeClass("nb-icon-star");
                      this.$detailFavButton.addClass("nb-icon-star-fill");
                  }
              } else { // add first favorite
                  favorites = [lcn];
                  this.$detailFavButton.removeClass("nb-icon-star");
                  this.$detailFavButton.addClass("nb-icon-star-fill");
              }

              User.setServicesTVFavorited(favorites);
              return true;
          }

          return false;
      },

      onRecord: function() {
          if (this.currentEpgItemFocused != null) {
              var self = this;
              AppData.recordCatchup(this.currentEpgItemFocused.catchupId, function(response) {
                  if (response) {
                      self.homeObject.$el.showAlertMessage(__("CatchupRecordingOk"), 'record_catchup', null);
                      self.homeObject.getDataForCatchupsRecorded();
                  } else {
                      self.homeObject.$el.showAlertMessage(__("CatchupRecordingFailed"), 'record_catchup', null);
                  }
              });
          }
      },

      onDeleteRecorded: function() {
          if (this.currentEpgItemFocused != null) {
              var self = this;
              AppData.deleteCatchup(this.currentEpgItemFocused.catchupId, function(response) {
                  if (response) {
                      self.homeObject.$el.showAlertMessage(__("CatchupRecordingDeleted"), 'record_catchup', null);
                      self.homeObject.getDataForCatchupsRecorded();
                  } else {
                      self.homeObject.$el.showAlertMessage(__("CatchupDeleteFailed"), 'record_catchup', null);
                  }
              });
          }
      },

      isEmpty: function() {
          return this.items.length == 0;
      },

      getHtmlRow: function(channelIndex, toAppend, initFocus) {
          var channel = this.items[channelIndex];
          var firstFocusFound = !initFocus;
          var nowDate = getTodayDate();
          var endDate = getTodayDate();
          var epgItemsHtml = "";
          var minutesFromStart = 0;
          var duration = 0;
          var firstFocus = "";
          var self = this;
          var spaceBetweenCells = 0.2;
          var prevEndDate = this.epgStartDate;
          // epg items

          if (channel.epgItems != null && channel.epgItems.length > 0) {
              $.each(channel.epgItems, function(y, item){

                  if (!firstFocusFound && item.endDate > nowDate) {
                      firstFocus = "first-focus";
                      firstFocusFound = true;
                  }

                  var diffPrev = getTimeDifference(prevEndDate, item.startDate, 'minutes');
                  if (diffPrev > 0) {
                      minutesFromStart = getTimeDifference(prevEndDate, self.epgStartDate, 'minutes');
                      duration = getTimeDifference(prevEndDate, item.startDate, 'minutes');
                      epgItemsHtml += "<div class='epg-cell epg-channel-item focusable " + firstFocus + "' style='position:absolute; left: "
                      + (minutesFromStart * self.epgMinuteWidth) + self.epgUnitName + "; width: " + (duration * self.epgMinuteWidth - spaceBetweenCells) + self.epgUnitName + "'"
                      + " data-date='" + getDateFormatted(prevEndDate, false) + "' data-service-id='" + channel.id + "'>" + __("EPGNoData") + "</div>";
                  }

                  minutesFromStart = getTimeDifference(item.startDate, self.epgStartDate, 'minutes');
                  duration = getTimeDifference(item.startDate, item.endDate, 'minutes');



                  // Punto 24: ver mismo comentario en draw().
                  var epgCellSizeClass = duration < 15 ? "epg-cell-very-short" : (duration < 30 ? "epg-cell-short" : "");
                  epgItemsHtml += "<div class='epg-cell epg-channel-item focusable " + epgCellSizeClass + " " + firstFocus + "' style='position:absolute; left: "
                              + (minutesFromStart * self.epgMinuteWidth) + self.epgUnitName + "; width: " + (duration * self.epgMinuteWidth - spaceBetweenCells) + self.epgUnitName + "'"
                              + " data-date='" + getDateFormatted(item.startDate, false) + "' data-service-id='" + channel.id + "' data-x='" + channelIndex + "' data-y='" + y + "' data-item-id='" + item.event_id + "'>"
                              + "<span class='epg-cell-title'>" + item.languages[0].title + "</span>"
                              + (epgCellSizeClass ? "<span class='epg-cell-tooltip'><span class='epg-cell-tooltip-title'>" + item.languages[0].title + "</span><span class='epg-cell-tooltip-time'>" + getDateFormatted(item.startDate, true) + " - " + getDateFormatted(item.endDate, true) + "</span></span>" : "")
                              + "</div>";
                  firstFocus = "";

                  prevEndDate = item.endDate;
              });
          } else {
              if (!firstFocusFound) {
                  firstFocus = "first-focus";
                  firstFocusFound = true;
              }

              minutesFromStart = 0;
              duration = getTimeDifference(this.epgStartDate, endDate, 'minutes');
              // Punto 33 + fix navegación: ver mismo comentario en draw().
              epgItemsHtml += "<div class='epg-cell epg-channel-item focusable " + (channel.epgLoadFailed ? "epg-cell-load-error " : "") + firstFocus + "' style='position:absolute; left: "
              + (minutesFromStart * self.epgMinuteWidth) + self.epgUnitName + "; width: " + (duration * self.epgMinuteWidth - spaceBetweenCells) + self.epgUnitName + "'"
              + " data-date='" + getDateFormatted(this.epgStartDate, false) + "' data-service-id='" + channel.id + "' data-x='" + channelIndex + "' data-y='0'>" + (channel.epgLoadFailed ? __("EPGLoadErrorMessage") : __("EPGNoData")) + "</div>";
              firstFocus = "";
          }

          if (!toAppend) {
              epgItemsHtml = "<div class='row' data-service-id='" + channel.id + "'>" + epgItemsHtml + "</div>";
          }

          return epgItemsHtml;
      },

      drawNewRow: function($focused, direction) {
          console.log("Load new row");
          var index = 0;
          var self = this;

          if (direction == "up") {
              index = $focused.parent().index() - 1;
          } else if (direction == "down") {
              index = $focused.parent().index() + 1;
          }

          if (index < 0 || index >= this.items.length) {
              return;
          }

          if (this.getEpgItemsByChannelIndex(index) != null) {
              this.gridOptimization(index, direction);
          } else {
              this.loading = index;
      App.throbber();
              AppData.getSimpleEpgByChannelIndex(index, function() {
                  App.throbberHide();
                  self.items = AppData.services;
                  self.gridOptimization(index, direction);
                  // Si mientras se esperaba esta carga el usuario siguió
                  // bajando y drawNewRow() se llamó de nuevo, this.loading ya
                  // apunta a OTRO índice más nuevo (con su propia carga en
                  // curso); solo se libera el lock si sigue siendo el mismo
                  // que esta llamada puso, para no desbloquear la navegación
                  // mientras esa carga más reciente todavía está pendiente.
                  if (self.loading === index) {
                      self.loading = null;
                  }
              });
          }
      },

      gridOptimization: function (index, direction) {
          var showed = 8;
          var html = this.getHtmlRow(index, true, false);

          $("#epgGrid").find(".row:eq(" + index + ")").html(html);

          // Antes, qué fila limpiar se calculaba con una fórmula puramente
          // relativa (index - (showed±1)), que asume que gridOptimization()
          // se llama de a un canal por vez, en orden estricto. Con
          // navegación rápida o con más de un punto disparando esta función
          // en el mismo paso (getNextFocusableByTime también la usa ahora
          // para forzar el render de filas virtualizadas), ese cálculo se
          // desincroniza de qué está realmente pintado en pantalla y termina
          // limpiando filas que siguen visibles -- el blanqueo reportado.
          // Ahora se lleva un registro real de qué filas están pobladas
          // (this.populatedRows, inicializado en draw()/reset()) y, si se
          // pasa del límite, se limpia la que está efectivamente MÁS LEJOS
          // del canal actual -- no la que "debería" estarlo según la
          // fórmula. La verificación de que la fila esté fuera de la vista
          // se mantiene como resguardo final.
          if (!this.populatedRows) {
              this.populatedRows = {};
          }
          this.populatedRows[index] = true;

          var populatedIndices = Object.keys(this.populatedRows).map(Number);
          if (populatedIndices.length > showed) {
              var farthestIndex = null;
              var farthestDistance = -1;

              for (var i = 0; i < populatedIndices.length; i++) {
                  var candidate = populatedIndices[i];
                  if (candidate === index) {
                      continue;
                  }

                  var distance = Math.abs(candidate - index);
                  if (distance > farthestDistance) {
                      farthestDistance = distance;
                      farthestIndex = candidate;
                  }
              }

              if (farthestIndex !== null) {
                  var $rowToClear = $("#epgGrid").find(".row:eq(" + farthestIndex + ")");

                  if ($rowToClear.length && this.$epgGrid) {
                      var rowTop = $rowToClear.position().top;
                      var rowBottom = rowTop + $rowToClear.outerHeight();
                      var gridHeight = this.$epgGrid.height();
                      var isOutOfView = rowBottom <= 0 || rowTop >= gridHeight;

                      if (isOutOfView) {
                          $rowToClear.empty();
                          delete this.populatedRows[farthestIndex];
                      }
                      // Si la fila "más lejana" sigue visible (grilla muy
                      // alta, pocas filas por pantalla), no se limpia nada
                      // esta vez -- mejor una fila de más en memoria que
                      // borrar algo que el usuario está viendo.
                  }
              }
          }
      },

      getEpgItemsByChannelIndex: function(channelIndex) {
          if (channelIndex >= 0 && channelIndex < this.items.length) {
              var channel = this.items[channelIndex];
              if (channel.epgItems != null) {
                  return channel.epgItems;
              } else {
                  return null;
              }
          }

          return [];
      },

      getCurrentChannelEPGItem: function() {
          if (!this.epgLoaded || this.$epgGrid == null) {
              return null;
          }

          var serviceId = this.getCurrentServiceId();
          if (!serviceId) {
              return null;
          }

          var $items = this.$epgGrid.find(".epg-channel-item[data-service-id='" + serviceId + "']");
          if ($items.length == 0) {
              return null;
          }

          var self = this;
          var now = getTodayDate();
          var $current = null;

          $items.each(function() {
              var $item = $(this);
              var posX = $item.data("x");
              var posY = $item.data("y");

              if (typeof posX == "undefined" || typeof posY == "undefined") {
                  return true;
              }

              if (posX >= self.items.length || posX < 0) {
                  return true;
              }

              var channel = self.items[posX];
              if (!channel || !channel.epgItems || posY >= channel.epgItems.length || posY < 0) {
                  return true;
              }

              var event = channel.epgItems[posY];
              if (event && event.startDate && event.endDate && event.startDate <= now && event.endDate >= now) {
                  $current = $item;
                  return false;
              }
          });

          if ($current == null) {
              $current = $items.first();
          }

          return $current;
      },

      getCurrentServiceId: function() {
          if (!this.homeObject) {
              return null;
          }

          if (this.homeObject.playbackMetadata && this.homeObject.playbackMetadata.type == "service") {
              return this.homeObject.playbackMetadata.id;
          }

          if (this.homeObject.lastServiceIdPlayed) {
              return this.homeObject.lastServiceIdPlayed;
          }

          return null;
      },

      focusAndEnsureVisible: function($el) {
          if (!$el || $el.length == 0) {
              return false;
          }

          Focus.to($el);
          this.ensureItemVisibility($el);
          this.$lastEpgFocused = $el;
          return true;
      },

      ensureItemVisibility: function($el) {
          if (!this.$epgGrid || !$el || $el.length == 0) {
              return;
          }

          var $row = $el.closest(".row");
          if ($row.length > 0) {
              var rowTop = $row.position().top;
              var rowBottom = rowTop + $row.outerHeight();
              var gridHeight = this.$epgGrid.height();
              var currentTop = this.$epgGrid.scrollTop();

              if (rowTop < 0) {
                  this.$epgGrid.scrollTop(Math.max(0, currentTop + rowTop));
              } else if (rowBottom > gridHeight) {
                  this.$epgGrid.scrollTop(currentTop + (rowBottom - gridHeight));
              }

              $("#epgChannels").scrollTop(this.$epgGrid.scrollTop());
          }

          var left = $el.position().left;
          var right = left + $el.outerWidth();
          var gridWidth = this.$epgGrid.innerWidth();
          var currentLeft = this.$epgGrid.scrollLeft();

          // Las celdas de "canal sin EPG" ocupan todo el día (left: 0 hasta
          // el final de la franja, ver draw()/getHtmlRow()), es decir son
          // más anchas que la grilla visible. Si el viewport actual ya cae
          // por completo dentro de esa celda (left <= 0 y right >= ancho de
          // grilla), no hace falta ajustar el scroll: la celda ya "cubre"
          // toda la vista. Sin este chequeo, el código de abajo veía
          // left < 0 (borde izquierdo real de la celda, al inicio del día)
          // y saltaba el scroll hacia atrás hasta ese punto, muy lejos de
          // la hora actual -- por eso un canal sin contenido aparecía
          // "atrasado" en vez de mantenerse alineado con "ahora".
          var cellCoversViewport = (left <= 0 && right >= gridWidth);

          if (!cellCoversViewport) {
              if (left < 0) {
                  this.$epgGrid.scrollLeft(Math.max(0, currentLeft + left));
              } else if (right > gridWidth) {
                  this.$epgGrid.scrollLeft(currentLeft + (right - gridWidth));
              }
          }

          $("#epgHours").scrollLeft(this.$epgGrid.scrollLeft());
      }
  });

  EPG.init();

  return EPG;
})(Events);


jQuery.fn.extend({

  getFocusableItemAt: function(top, left) {
      top = this.offset().top + top;
      left = this.offset().left + left;
      var itemAtPoint = document.elementFromPoint(left, top);

      if (CONFIG.developer.debug) {
          $("#epgFocusPosition").css({"top": top + "px", "left": left + "px", "display": "block"});
      }

      if (typeof itemAtPoint != 'undefined' && itemAtPoint != null && $(itemAtPoint).hasClass("focusable")) {
          return $(itemAtPoint);
      }

      return [];
  }

});
