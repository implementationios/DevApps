Scene_Home = (function (Scene) {

  var Scene_Home = function () {
    this.construct.apply(this, arguments);
  };

  $.extend(true, Scene_Home.prototype, Scene.prototype, {
    /**
     * @inheritdoc Scene#init
     */
    init: function () {
      console.log("Scene_Home init");
      this.$firstFocusableItem = this.$el.find(".channels-div .focusable").first();
      this.viewport = $("#viewport");
      this.channelsGrid = $("#channelsGrid");
      this.playbackMetadata = { type: '', id: '' };
      this.requestingData = false;
      this.$videoContainer = $("#divVideoContainer");
      this.$maxiPreview = $(".maxipreview");  // Contenedor que recibe el foco
      this.$maximizeIcon = $("#maximizeIcon"); // Ícono de maximización
      // Cacheados para no volver a consultar el DOM por ID en cada cambio de
      // foco de canal (focusServiceTV/setEpgTextInfo/setEpgInfo se llaman en
      // cada canal "surfeado" con el control remoto).
      this.$infoEpg = $(".info-epg");
      this.$infoServices = $(".info-services");
      this.$menuTitle = $("#menuTitle");
      this.$channelInfoDiv = $("#channelInfoDiv");
      this.$channelLcnLabel = $("#channelLcnLabel");
      this.$channelNameLabel = $("#channelNameLabel");
      this.$nowEventLabel = $("#nowEventLabel");
      this.$nextEventLabel = $("#nextEventLabel");
      this.$channelEventImageContainer = $("#channelEventImageContainer");
      this.$channelEventImage = $("#channelEventImage");
      this.$tvChannelsRow = $("#tvChannelsRow");
      this.$lastFocused = false;
      this.firstLaunch = true;
      this.dontRedraw = false;
      this.aboutString = "";
      this.timeIntervalApp = null; //by minute
      this.currentVodCategoryId = 0;
      this.nbPlayerAttempts = 0;
      this.nbPlayerRetryTimeout = null;
      this.NBPLAYER_RETRY_AFTER_ERROR = true;
      this.verifyingUserSession = false;
      this.lastPlaybackTime = 0;
      this.autoSeek = false;
      this.forcePlayback = false;
      this.lastServiceIdPlayed = null;
      // Id del canal a retomar en fullscreen si se vuelve ("atrás") de la
      // guía de canales habiendo entrado a ella desde el botón de guía del
      // player (ver onReturnFullscreen). null = volver a home normalmente.
      this.epgReturnServiceId = null;
      this.changeChannelTimer = null;
      this.changeChannelWait = 3 * 1000; //seconds
      this.stepLoad = 0;
      this.preventPlayerReload = false;
      this.preserveOnDeactivate = false;
      this.returningFromOffline = false;
      this.goingOffline = false;
      this.isTizen = (Device.isTIZEN || Device.isSAMSUNG);
      this.isLG = Device.isLG || Device.isWEBOS;
      this.miniPlayerEnabled = CONFIG.app.miniPlayerEnabled === false ? false : true;
      // Buscador: estado/render/navegación viven en el módulo Search (ver
      // public/js/module/Search.js), que necesita esta escena para poder
      // reproducir contenido (playContentWithAccess) al elegir un resultado.
      Search.init(this);
      Telemetry.init();
      this.catchingError = false;
      this.osmsEnabled = CONFIG.app.osmsEnabled
      this.logoutEnabled = CONFIG.app.logoutEnabled
      this.useCards = CONFIG.app.epgCards;

      if (this.osmsEnabled) {
        Osms.init(AppData);
        this.$osmsContainer = $("#osmsList");
        this.$osmsDialog = $("#osmsDialog");
      }
    },
    /**
     * @inheritdoc Scene#render
     */
    render: function () {

      if (this.dontRedraw) {
        return;
      }
      this.$el.find("#epgAtThisTimeLabel").html(__("EPGAtThisTime"));
      this.$el.find("#epgNextLabel").html(__("EPGNext"));
      this.$el.find("#menuTitleLabel").html(__("MenuTitle"));
      this.$el.find("#menuEPGLabel").html(__("MenuEPG"));
      this.$el.find("#menuAboutLabel").html(__("MenuAbout"));
      this.$el.find("#menuLogoutLabel").html(__("MenuLogout"));
      this.$el.find("#menuSearch").html(__("MenuSearch"));
      this.$el.find("#menuExitLabel").html(__("MenuExit"));
      this.$el.find("#menuUpdateDataLabel").html(__("MenuUpdateData"));
      this.$el.find("#errorFind").html(__("ErrorFind"));
      // Placeholder + labels de tabs del buscador (puede depender de idioma)
      Search.updateLabels();
      $(".epg-message").html(__("EPGLoading"));
      EPG.homeObject = this;
      VOD.homeObject = this;
      VODDetail.homeObject = this;
      nbPlayer.homeObject = this;

      if (!CONFIG.app.showTime) {
        $("#nbTime").addClass("hide");
      }

      if (this.osmsEnabled) {
        this.$el.find("#menuOsmsLabel").html(__("MenuOSMS"));
        this.$el.find("#OsmsDialogTitle").html(__("OsmsDialogTitle"));
        this.$el.find("#closeOsmsDialogFooter").html(__("OsmsCloseButton"));
        // Mostrar el botón de OSM
        this.$el.find(".other-option[data-other-id='6']").removeClass("hidden");
      } else {
        // Ocultar el botón de OSM si no está habilitado
        this.$el.find(".other-option[data-other-id='6']").addClass("hidden");
      }

      if (this.logoutEnabled) {
        // Ocultar Cerrar sesión del menú inferior; estará dentro del modal Acerca de
        this.$el.find(".other-option[data-other-id='3']").addClass("hidden");
      } else {
        this.$el.find(".other-option[data-other-id='3']").removeClass("hidden");
      }

      var date = new Date();
      var self = this;
      User.updateLastInteraction();
      this.actionMinute();

      // Antes: cada llamada a render() (con dontRedraw=false) creaba un
      // setInterval(60s) nuevo sin cancelar el anterior; en cada re-render de
      // Home (p. ej. logout/login) se acumulaban temporizadores corriendo en
      // paralelo para siempre. Se limpia el previo antes de crear uno nuevo.
      if (this.timeIntervalApp) {
        clearInterval(this.timeIntervalApp);
        this.timeIntervalApp = null;
      }

      setTimeout(function () {
        // Doble chequeo por si render() se volvió a llamar durante la espera.
        if (self.timeIntervalApp) {
          clearInterval(self.timeIntervalApp);
        }
        self.timeIntervalApp = setInterval(self.actionMinute, 60000);
        self.actionMinute();
      }, (60 - date.getSeconds()) * 1000);

      if (CONFIG.app.logoPositionHome == 'right') {
        if (this.miniPlayerEnabled) {
          // Este cálculo mide el ancho ACTUAL de #divVideoContainer para
          // convertirlo a porcentaje y repartir el resto entre el logo y
          // header-row-info. El problema: si render() se vuelve a llamar
          // (p. ej. al volver de la escena "offline") sin que el layout se
          // haya reseteado, se está midiendo un elemento que YA tiene el
          // ancho inline de la corrida anterior -- y si en ese momento el
          // contenedor está oculto o todavía no terminó de mostrarse
          // (this.$el recién vuelve de display:none), la medición sale
          // distorsionada (0, o des proporcionada) y se recalculan
          // porcentajes a partir de un valor ya corrompido. Eso hacía que
          // percInfo terminara en negativo (renderizado como 0%) mientras
          // percPlayer/percLogo quedaban inflados -- exactamente lo
          // reportado. Se resetea el ancho inline a lo que definen las
          // clases Bootstrap (col-sm-6/2/4) antes de medir, para que cada
          // corrida parta siempre de la misma base y no del resultado de
          // la corrida anterior.
          $("#divVideoContainer").parent().css('width', '');
          $("#rightLogoImage").parent().css('width', '');
          $(".header-row-info").css('width', '');

          var referenceWidth = $("#divVideoContainer").parent().parent().width();
          var playerWidth = $("#divVideoContainer").width();

          // Si en este momento el layout no está listo (escena todavía
          // oculta, ancho de referencia en 0), no tocar nada: se deja el
          // ancho por clase Bootstrap ya reseteado arriba, en vez de
          // aplicar porcentajes calculados sobre una división por cero.
          if (referenceWidth > 0 && playerWidth > 0) {
            var percPlayer = playerWidth / referenceWidth * 100;
            $("#divVideoContainer").parent().css({ 'width': percPlayer + '%' });

            var percLogo = (percPlayer / 3) * 2;
            $("#rightLogoImage").parent().css({ 'width': percLogo + '%' });
            //$("#rightLogoImage").css({'margin-top': '20%', 'width': '100%', 'padding': '1em'});

            var percInfo = 100 - percPlayer - percLogo;
            if (percInfo > 0) {
              $(".header-row-info").css({ 'width': percInfo + '%' });
            }
          }
        } else {
          $("#divVideoContainer").parent().hide();
          $(".header-row-info").removeClass("col-sm-6").addClass("col-sm-10");
        }

        $("#topLogoImage").addClass("hide");
        $("#rightLogoImage").removeClass("hide");
        $("#rightLogoImage").attr("src", "assets/images/" + CONFIG.app.brand + "/logo-top.png");

      } else {
        $("#topLogoImage").removeClass("hide");
        $("#rightLogoImage").addClass("hide");
      }

      if (CONFIG.app.production) {
        this.$el.find("#menuEPGLabel").parent().addClass("hide");
      }

      if (CONFIG.app.brand == "meganet") {
        $("#menuEPGLabel").parent().hide();
      }

      if (CONFIG.app.brand === "jrmax") {
        const inputs = document.querySelectorAll(".header-row-info");
        inputs.forEach(input => {
          input.style.setProperty("color", "black", "important"); // Aplica color con !important
          input.querySelectorAll("*").forEach(child => {
            child.style.setProperty("color", "black", "important"); // Fuerza el color en todos los hijos
          });
        })
      }

      if (Router.isSceneActive("home")) {
        NbNetworkObserver.startObserver(function () { self.goOnline(); }, function () { self.goOffline(); });
      }
      // document.addEventListener("keydown", function(inEvent) {
      // 	var message = "<span class='key-log-info'>" + inEvent.keyCode + "</span>";
      // 	$(".key-log-info").remove();
      // 	$(".nb-alert-message-label").append(message);
      // });
      // }
    },


    /**
         * @inheritdoc Scene#focus
         */
    focus: function ($el) {
      if (!$el) {
        $el = this.getFocusable();
      }

      return Focus.to($el);
    },

    onFocus: function ($el) {
      this.focusCandidate = null;
      $(".focus-candidate").removeClass("focus-candidate");
      this.trigger('focus', $el);
    },

    actionMinute: function () {
      $("#nbTime").html(getDateFormatted(getTodayDate(), true));
      $(".vjs-control-bar .nb-vjs-vod-time").html(getDateFormatted(getTodayDate(), true));
      console.log("actionMinute ", getDateFormatted(getTodayDate(), true));

      if (HOME.actionsForCheckInactivity) {
        HOME.actionsForCheckInactivity();
      }
    },

    actionsForCheckInactivity: function () {
      if (nbPlayer.isPlaying() && !PlayerFallback.isShown()) {
        var self = this;
        var $container = nbPlayer.isFullscreen() ? nbPlayer.$mainVideo : $(".common:first");
        InactivityManager.appStatusAction($container, function() {
          //stop player actions
          self.resetPlayerContent(true, __("PlayerNoVideoSelected"), self.playbackMetadata.type, self.playbackMetadata.item);
        }, function () {
          //cancel dialog, continue watching
          if (!nbPlayer.isFullscreen() && self.$lastFocused) {
            Focus.to(self.$lastFocused)
          }
          User.updateLastInteraction();
        });
      }
    },

    /**
     * @inheritdoc Scene#activate
     */
    activate: function (id, categoryId) {
      // CORRECCIÓN: Envolver en try-catch para capturar errores y evitar que se rechace la promesa
      try {
        if (this.dontRedraw) {
          if (id != null) {
            var $focus = null;
            if (this.currentVodCategoryId != null) {
              $focus = $("#vodContainer").find("[data-id='" + id + "'][data-category-id='" + this.currentVodCategoryId + "']");
            } else { // comes frome VODDetail, then search vod id item
              $focus = $("#vodRow").find("[data-id='" + id + "']");
            }

            if ($focus.length > 0) {
              Focus.to($focus);
            }
          }
        }

        if (this.requestingData) {
          // CORRECCIÓN: Retornar true en lugar de undefined para evitar que el router rechace la promesa
          return true;
        }

        if (this.returningFromOffline) {
          this.returningFromOffline = false;
          App.throbberHide();

          if (this.playbackMetadata && this.playbackMetadata.id) {
            this.forcePlayback = true;
            this.autoSeek = true;
            this.lastPlaybackTime -= 1;
            this.playContentWithAccess(
              this.playbackMetadata.type,
              this.playbackMetadata.id,
              this.playbackMetadata.url,
              this.playbackMetadata.item,
              true,
              false
            );
          } else {
            this.restartFocus();
          }

          this.dontRedraw = false;
          this.NBPLAYER_RETRY_AFTER_ERROR = true;
          return true;
        }

        App.throbber();

        if (!this.dontRedraw) {
          $("#menuRow").addClass("hidden");
          this.firstLaunch = true;
        }
        this.aboutString = "";

        if (User.hasCredentials() && User.isLicenseActivated()) {
          var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          this.aboutString = "<table>"
            + "<tr>"
            + "<td style='padding-right: 6em'>" + __("AboutVersion") + ":</td><td>" + CONFIG.app.version + "</td>"
            + "</tr>"
            + "<tr>"
            + "<td>" + __("LoginUsername") + ":</td><td>" + User.getUsername() + "</td>"
            + "</tr>"
            + "<tr>"
            + "<td>" + __("AboutCard") + ":</td><td>" + User.getLicense() + "</td>"
            + "</tr>"
            + "<tr>"
            + "<td>" + __("AboutDevelopedBy") + ":</td><td>" + CONFIG.app.developedBy + "</td>"
            + "</tr>"
            + "<tr><td>Timezone:</td><td>" + tz + "</td></tr>"
            + "</table>"
            // + "<tr><td>Time calculated:</td><td>" + getTodayDate().toString() + "</td></tr>"
            // + "<tr><td>Time from OS:</td><td>" + moment().toString() + "</td></tr>"
            ;

          if (!this.dontRedraw) {
            this.clearData();
          } else {
            if (this.playbackMetadata && this.playbackMetadata.id != null) {
              this.forcePlayback = true;
              this.autoSeek = true;
              this.lastPlaybackTime -= 1;
              this.playContentWithAccess(this.playbackMetadata.type, this.playbackMetadata.id, this.playbackMetadata.url, this.playbackMetadata.item, true, false);
            }
          }
          this.getHomeData();
        } else if (User.hasCredentials()) {
          //activate license
          App.throbberHide();
          App.notification(__("Scene_Home"));
        } else {
          //login
          App.throbberHide();
          App.notification(__("Scene_Home"));
        }

        // CORRECCIÓN: Asegurar que siempre retorne un valor válido para evitar problemas con promesas
        return true;
      } catch (error) {
        console.error('Error en Scene_Home.activate():', error);
        // Retornar true incluso si hay error para evitar que el router rechace la promesa
        return true;
      }
    },

    /**
     * @inheritdoc Scene#revert
     * CORRECCIÓN: Retornar false para evitar que el router vuelva a loading cuando hay un error
     */
    revert: function () {
      // No volver a loading si hay un error, quedarse en home
      return false;
    },

    clearData: function () {
      AppData.clearData();
      this.getConfiguredEpgModule().reset();
      VOD.reset();
      VODDetail.reset();
      $(".div-bouquet").remove();
      $("#tvChannelsRow").empty();
      $("#vodRow").empty()
      $("#catchupsRow").empty();
      $("#favoritesRow").empty();
      $("#catchupRecordingRow").empty();
      $("#catchupRecordingRow").empty();
      this.firstLaunch = true;
      this.$lastFocused = false;
    },

    getHomeData: function () {
      this.requestingData = true;

      if ($("#tvChannelsRow").find(".channel-video").length == 0) {
        this.stepLoad = 0;
      } else if ($("#catchupsRow").find(".channel-video").length == 0 && EPG.isEmpty()) {
        this.stepLoad = 1;
      } else if (EPG.isEmpty() && VOD.isEmpty()) {
        this.stepLoad = 3;
      } else if (VOD.isEmpty()) {
        this.stepLoad = 4;
      } else if (Ads.isEmpty()) {
        this.stepLoad = 5;
      } else if (this.osmsEnabled && (!Osms.getCache() || Osms.getCache().length === 0)) {
        this.stepLoad = 6;
      }

      switch (this.stepLoad) {
        case 0:
          this.getDataForServicesTV();
          break;
        case 1:
          this.getDataForCatchups();
          break;
        case 2:
          this.getDataForCatchupsRecorded();
          break;
        case 3:
          this.getEPGData();
          break;
        case 4:
          this.getVODData();
          break;
        case 5:
          Ads.init(AppData).getDataForAds(function () {
            this.allDataLoaded();
          });
          break;
        case 6:
          this.getOSMSData();
          break;
      }

    },

    getDataForServicesTV: function () {
      var self = this;
      this.updateStepLoad(0);
      AppData.getDataForServicesTV(function(bouquets) {
        self.setBouquetsContent(bouquets);
        self.getDataForCatchups();
      });
    },

    getDataForCatchups: function () {
      var self = this;
      // get catchups with events
      this.updateStepLoad(1);
      App.throbber();
      AppData.getCatchupGroups(function (catchups) {
        App.throbberHide();
        self.setCatchupsContent(catchups);
        self.getDataForCatchupsRecorded();
      });

    },

    getDataForCatchupsRecorded: function () {
      var self = this;
      this.updateStepLoad(2);
      AppData.getCatchupsRecorded(function (catchupsRecorded) {
        console.log(catchupsRecorded);
        self.setCatchupsRecordedContent(catchupsRecorded);

        $("#menuRow").removeClass("hidden");
        App.throbberHide();
        //if (self.firstLaunch) {
        self.getEPGData();
        //}
      });

    },

    getEPGData: function () {
      var self = this;
      this.updateStepLoad(3);
      //$("#menuEPGLabel").closest(".other-option").addClass("hidden");

      // Verificar si ya hay EPG cargada en AppData.services
      var hasEPGData = AppData.isEPGAlreadyLoaded();

      // Determinar si la EPG está vacía según el módulo activo
      var isEmpty = self.useCards ? !EPGCards.epgLoaded : EPG.isEmpty();

      if (isEmpty && !hasEPGData) {
        // No hay EPG en grilla ni en AppData.services, descargar
        console.log("EPG start " + new Date());
        //App.throbber();
        AppData.getEPGByBouquet(function (servicesWithEPG) {
          //App.throbberHide();
          console.log("EPG received: " + servicesWithEPG + " " + new Date());
          if (self.playbackMetadata.type == "service" && self.firstLaunch) {
            // call for update current player metadata content
            //self.preventPlayerReload = true;
            //self.eventWhenCurrentLiveEnd();
            self.setPlayerMetadata();
          }
          self.drawEpgModule(servicesWithEPG);
          //$("#menuEPGLabel").closest(".other-option").removeClass("hidden");
          self.getVODData();
        }, 0);
      } else if (hasEPGData && isEmpty) {
        // Ya hay EPG en AppData.services pero la grilla está vacía, solo renderizar
        console.log("EPG ya cargada en AppData.services, renderizando sin descargar");
        var servicesWithEPG = AppData.services;
        if (self.playbackMetadata.type == "service" && self.firstLaunch) {
          self.setPlayerMetadata();
        }
        self.drawEpgModule(servicesWithEPG);
        self.getVODData();
      } else {
        // EPG ya está renderizada
        self.getVODData();
      }

      //EPG.draw([]);
      //this.getVODData();
    },


    getVODData: function () {
      var self = this;
      this.updateStepLoad(4);
      AppData.getVOD(function (categories) {
        console.log("VOD library received: ");
        console.log(categories);
        self.setVODContent(categories);
        self.getAdsData();
      });
    },

    getAdsData: function () {
      var self = this;
      this.updateStepLoad(5);
      Ads.init(AppData).getDataForAds(function () {
        self.allDataLoaded();
      });
      if (self.osmsEnabled) {
        self.getOSMSData();
      }
    },

    getOSMSData: function () {
      if (this.osmsEnabled) {
        this.updateStepLoad(6);
        var self = this;
        Osms.getAndUpdateOsms(function () {
          // Punto 30: recién acá arranca el polling periódico -- después de
          // la carga inicial (que no debe disparar el toast de "mensaje
          // nuevo", solo el contador) y solo si OSMS está habilitado para
          // esta marca.
          Osms.startPolling();
        });
      }
    },

    allDataLoaded: function () {
      this.requestingData = false;
      this.firstLaunch = false;
      App.throbberHide();
    },

    /**
     * @inheritdoc Scene#onLangChange
     */
    onLangChange: function () {

    },
    /**
     * @inheritdoc Scene#onClick
     */
    onClick: function ($el, event) {
      if (this.trigger('click', $el, event) === false) {
        return false;
      }
      return this.onEnter.apply(this, arguments);
    },

    // funcion antigua para cargar la informacion del epg cuando se posa o entra en un canal
    onFocus: function ($el) {
      var epgModule = this.getVisibleEpgModule();

      //** Si la guía de canales (EPGCards o EPG clásico) está visible */
      if (epgModule && !nbPlayer.isFullscreen()) {
        epgModule.onFocus($el);
        return;
      //** Si se esta mostrando el vod, se enfoca en el vod */
      } else if (VOD.isShowed() && !VODDetail.isShowed() && !nbPlayer.isFullscreen()) {
        VOD.onFocus($el);
        return;
      //** Si se esta mostrando el vod detail, se enfoca en el vod detail */
      } else if (VODDetail.isShowed() && !nbPlayer.isFullscreen()) {
        VODDetail.onFocus($el);
        return;
      }

      if (typeof $el.data("type") !== 'undefined' && typeof $el.data("id") !== 'undefined' && $el.data("id") != null) {
        var id = $el.data("id");

        if ($el.data("type") == "service") {
          var serviceTV = AppData.getServiceTV(id);
          if (serviceTV !== false) {
            this.focusServiceTV(serviceTV, false);
          }
        } else if ($el.data("type") == "catchup" || $el.data("type") == "catchup-event") {
          this.setMenuTitle(__("MenuCatchups"));
        } else if ($el.data("type") == "vod") {
          if ($el.data("id") == 0) {
            this.setMenuTitle(__("MoviesSubtitle"));
          } else {
            this.setMenuTitle(__("MenuMovies"));
          }
        }
      } else if (typeof $el.data("other-id") !== 'undefined') {
        this.$lastFocused = Focus.focused;
        var id = $el.data("other-id");
        if (id != null & id >= 0) {
          switch (id) {
            case 0: //reload
              this.setMenuTitle(__("MenuUpdateDataDescription"));
              break;
            case 1: //epg
              this.setMenuTitle(__("MenuEPGDescription"));
              break;
            case 2: //about
              this.setMenuTitle(__("MenuAbout"));
              break;
            case 3: //logout
              this.setMenuTitle(__("MenuLogout"));
              break;
            case 4: //exit
              this.setMenuTitle(__("MenuExit"));
              break;
            case 5: //search
              this.setMenuTitle(__("MenuSearch"));
              break;
            case 6: // osms
              if (this.osmsEnabled) {
                this.setMenuTitle(__("MenuOSMS"));
              }
              break;
          }
        }
      } else if (nbPlayer.isFullscreen()) {
        nbPlayer.onFocus();
      }
    },


    /**
     * @inheritdoc Scene#onReturn
     */
    onReturn: function ($el, event) {
      console.log("go back");
      var self = this;
      //** di el dialogo de busqueda esta abierto, cierralo
      if (Search.onReturn()) {
        return;
      }

      //** Si el detalle de OSM está abierto, ciérralo primero */
      if (this.osmsEnabled && !$("#osmsDetailContainer").hasClass("hidden")) {
        Osms.closeOsmsDetail();
        return;
      }

      //** Si el dialogo de osm esta abierto, ciérralo */
      if (this.osmsEnabled && !$("#osmsDialog").hasClass("hidden")) {
        Osms.closeOsmsDialog();
        Focus.to(self.$lastFocused);
        return;
      }

      if ($el.isInAlertConfirm(this.$el)) {
        $el.closeAlert(this.$el);
        Focus.to(this.$lastFocused);
      } else if ($el.isInAlertMessage(this.$el)) {
        $el.closeAlert(this.$el);
        Focus.to(this.$lastFocused);
      } else if ($el.isInAlertInput(this.$el)) {
        $el.closeAlert(this.$el);
        Focus.to(this.$lastFocused);
      } else if (ParentalControlDlg.isShowed()) {
        ParentalControlDlg.close(ParentalControlDlg.cancelActions);
      } else if (InactivityManager.isShown()) {
        InactivityManager.continueWatching();
      } else if (nbPlayer.isFullscreen()) {
        this.onReturnFullscreen();
        return;
      } else if (this.useCards && EPGCards.isShowed && typeof EPGCards.isShowed === 'function' && EPGCards.isShowed()) {
        EPGCards.onReturn(function () {
          // Si se entró a la guía desde el botón "guía de canales" del
          // player (ver onReturnFullscreen/epgReturnServiceId), volver
          // directo al canal en fullscreen en vez de a home.
          if (self.epgReturnServiceId) {
            var returnServiceId = self.epgReturnServiceId;
            self.epgReturnServiceId = null;
            var returnServiceTV = AppData.getServiceTV(returnServiceId);
            if (returnServiceTV !== false) {
              self.$lastFocused = [];
              self.playServiceTVByChannel(returnServiceTV);
              self.goToFullscreen();
              return;
            }
          }

          $("#channelsGrid").show();
          if (self.$lastFocused && self.$lastFocused.length > 0) {
            Focus.to(self.$lastFocused);
          } else {
            // Si no hay último foco guardado, enfocar el primer elemento del grid de canales
            var $firstChannel = $("#channelsGrid .channel-item:first, #channelsGrid .channel-card:first");
            if ($firstChannel.length > 0) {
              Focus.to($firstChannel);
            } else {
              Focus.to($(".other-option[data-other-id='1']"));
            }
          }
          self.$lastFocused = [];
        });
        return true;
      } else if (!this.useCards && EPG.isShowed()) {
        EPG.onReturn(function () {
          $("#channelsGrid").show();
          Focus.to(self.$lastFocused);
          self.$lastFocused = [];
        });
        if (self.$lastFocused.length == 0) {
          Focus.to($(".other-option[data-other-id='1']"));
        }
      } else if (VOD.isShowed() && !VODDetail.isShowed()) {
        VOD.onReturn(function () {
          $("#channelsGrid").show();
          Focus.to($("#vodRow .focusable:first"));
        });
      } else if (VODDetail.isShowed()) {
        VODDetail.onReturn(function () {
          // Al cerrar el detalle, el último elemento guardado puede no existir
          // (re-render) o estar oculto. Restaurar con fallbacks seguros.
          setTimeout(function () {
            // Si venimos de un VOD seleccionado en Home, intentar volver a ese mismo item
            if (self.lastVodSelected && self.lastVodSelected.id) {
              if (self.focusToVodElement(self.lastVodSelected.id, self.lastVodSelected.categoryId)) {
                return;
              }
            }

            var $candidate = self.$lastFocused;
            if (!$candidate || $candidate.length == 0 || !$candidate.is(":visible") || !$.contains(document, $candidate.get(0))) {
              // Preferir foco en listado VOD si sigue visible
              if (VOD && VOD.isShowed && typeof VOD.isShowed === "function" && VOD.isShowed()) {
                $candidate = (VOD.$lastVodFocused && VOD.$lastVodFocused.length > 0) ? VOD.$lastVodFocused : $("#vodList").find(".focusable:visible:first");
                if (!$candidate || $candidate.length == 0) {
                  $candidate = $("#divVideoContainer");
                }
              } else {
                // Si ya estamos de vuelta en Home, enfocar algo visible
                $candidate = $("#channelsGrid").find(".focusable:visible:first");
                if (!$candidate || $candidate.length == 0) {
                  $candidate = $(".other-option:visible:first");
                }
              }
            }
            if ($candidate && $candidate.length > 0) {
              Focus.to($candidate);
            }
          }, 0);
        });
      } else {

        if (CONFIG.app.brand == "fotelk" || CONFIG.app.brand == "supercabo" || CONFIG.app.brand == "cablesatelite") {
          if (this.playbackMetadata && this.playbackMetadata.id && this.playbackMetadata.id != '') {
            this.goToFullscreen();
            return;
          }
        }

        var $focusTo = Focus.focused;
        if (Focus.focused != null && !Focus.focused.is(this.$videoContainer)) {
          if (this.miniPlayerEnabled) {
            $focusTo = this.$videoContainer;
          } else {
            $focusTo = Focus.focused;
          }
        }

        if ($focusTo) {
          if ($focusTo == Focus.focused) {
            this.$lastFocused = Focus.focused;
            this.$el.showAlertConfirm(__("AppCloseApp"), 'close_app', null, null, 'cancel');
          } else {
            Focus.to($focusTo);
          }
        }
      }
    },

    onReturnFullscreen: function ($el, callback) {
      var self = this;

      nbPlayer.onReturn($el, this.playbackMetadata, function (closePlayer) {

        // Snapshot del metadata actual para restaurar foco correctamente,
        // incluso si luego se limpia `self.playbackMetadata`.
        var playbackMetadataForFocus = self.playbackMetadata;

        // Si el botón presionado fue específicamente "guía de canales" (no
        // "atrás"), recordar el canal que se estaba viendo para poder volver
        // directo al player en fullscreen cuando el usuario salga de la
        // guía, en vez de mandarlo a home (ver uso de epgReturnServiceId en
        // el manejador de "atrás" sobre EPGCards).
        var isGoingToEpg = $el && nbPlayer.vodPlayerGetControlType($el) === nbPlayer.vodControlsEnum.epg;
        if (isGoingToEpg && playbackMetadataForFocus && playbackMetadataForFocus.type === "service") {
          self.epgReturnServiceId = playbackMetadataForFocus.id;
        }

        if (closePlayer) {
          if (!self.miniPlayerEnabled) {
            self.$videoContainer.parent().hide(0);
            nbPlayer.nbPlayerResetContent(true);
          } else {
            nbPlayer.exitFullscreen();
          }
        }

        // Dejar que el DOM/visibilidad se estabilice antes de restaurar foco
        setTimeout(function () {
          self.restartFocus(playbackMetadataForFocus);
        }, 0);
        if (!self.miniPlayerEnabled) {
          // Antes de limpiar playbackMetadata, guardar el canal en
          // lastServiceIdPlayed (mismo criterio que setPlayerMetadata() al
          // cambiar de contenido). Sin esto, abrir la guía de canales desde
          // el botón del reproductor (que pasa por acá, a diferencia de la
          // tecla remota GUIDE que llama a openEPG() directo sin wipear
          // metadata) hacía que EPGCards._focusFirst() no encontrara ni
          // playbackMetadata.type=="service" ni lastServiceIdPlayed, y el
          // foco caía siempre al primer canal de la lista en vez del que se
          // estaba transmitiendo.
          if (playbackMetadataForFocus && playbackMetadataForFocus.type === "service") {
            self.lastServiceIdPlayed = playbackMetadataForFocus.id;
          }
          self.playbackMetadata = {};
        }

        if (callback) {
          callback();
        }
      });
    },


    // Toda la lógica del buscador (estado/tabs/render/navegación/teclado)
    // vive ahora en el módulo Search (public/js/module/Search.js). Antes
    // eran ~430 líneas de métodos acá mismo (initializeSearchEvents,
    // setSearchTab, openKeyboardForSearch, getAvailableSearchTabs,
    // buildSearchTabs, updateSearchTabsLabels, performSearch,
    // filterChannels [deprecated], renderSearchResults,
    // updateSearchTabsVisibility, selectContent, showSearchPanel,
    // hideSearchPanel); ver Search.show()/hide()/onEnter()/onReturn()/
    // navigate()/selectContent(), invocados desde onEnter/onReturn/navigate
    // más abajo en esta misma escena.




    goToFullscreen() {
      try {

        this.$lastFocused = Focus.focused;
        nbPlayer.requestFullscreen();
        this.$videoContainer.parent().show(500);
      } catch (e) { }
    },

    /**
     * @inheritdoc Scene#onEnter
     */
    onEnter: function ($el, event) {

      var self = this;

      if (this.osmsEnabled && $el.hasClass("osm-item")) {
        const osmId = $el.attr("data-id");
        const osm = Osms.getCache().find(msg => String(msg.id) === String(osmId));

        if (osm && typeof osm.message === "string") {
          Osms.showOsmsDetail(osm);
        } else {
          this.showErrorMessage(__("OsmsErrorMessageNotFound"));
        }
        return;
      } else if (this.osmsEnabled && $el.attr("id") === "closeOsmsDetail") {
        Osms.closeOsmsDetail();
        return;
      } else if (this.osmsEnabled && $el.attr("id") === "closeOsmsDialogFooter") {
        Osms.closeOsmsDialog();
        return;
      }


      // Verificar si el elemento es un enlace de publicidad
      if ($el.hasClass("carousel-link") || $el.closest(".publicidad-home-top, .publicidad-home-bottom").length > 0) {

        var $adLink = $el.hasClass("carousel-link") ? $el : $el.closest("a.carousel-link, .publicidad-home-top a, .publicidad-home-bottom a");

        if ($adLink.length > 0) {
          var actionUrl = $adLink.attr("href");
          var genericDataRaw = $adLink.attr("data-generic");

          var isValidActionUrl = actionUrl && actionUrl !== "#" && actionUrl !== "null" && actionUrl !== "undefined";
          console.log("Action URL:", actionUrl, "Generic Data:", genericDataRaw);

          if (isValidActionUrl) {
            if (typeof tizen !== 'undefined' && tizen.application) {
              tizen.application.launchAppControl(
                new tizen.ApplicationControl("http://tizen.org/appcontrol/operation/view", actionUrl),
                null,
                function() { console.log("Tizen browser opened."); },
                function(err) { console.error("Error on Tizen:", err); },
                null
              );
            } else if (typeof webOS !== 'undefined' && webOS.service && typeof PalmServiceBridge !== "undefined") {
              webOS.service.request("luna://com.webos.applicationManager", {
                method: "launch",
                parameters: {
                  id: "com.webos.app.browser",
                  params: { target: actionUrl }
                },
                onSuccess: function() { console.log("WebOS browser opened."); },
                onFailure: function(err) { console.error("Error on WebOS:", err); }
              });
            } else {
              console.warn("Plataforma no detectada. Redirigiendo al navegador.");
              window.location.href = actionUrl;
            }
          } else if (genericDataRaw) {
            if (genericDataRaw.startsWith("stream_id")) {
              var id = parseInt(genericDataRaw.split("=")[1], 10);
              console.log("ID convertido:", id, "typeof:", typeof id);
              var service = AppData.getServiceTV(id);
              if (service) {
                this.playContentWithAccess("service", service.id, service.url, service, true, false);
                console.log("Selected service ID:", service.id);
              }else{
                console.error("Error al obtener el servicio:", service);
              }
            } else if (genericDataRaw.startsWith("catchup_id=")) {
              var id = parseInt(genericDataRaw.split("=")[1], 10);
              console.log("ID convertido:", id, "typeof:", typeof id);
              AppData.getTopLevelCatchupM3u8Url(id, function (url) {
              if (url) {
                nbPlayer.playContent("catchup", url);
                }else{
                  console.error("Error al obtener el catchup:", url);
                }
              });
            } else if (genericDataRaw.startsWith("vod_id=")) {
              var id = parseInt(genericDataRaw.split("=")[1], 10);
              console.log("ID convertido:", id, "typeof:", typeof id);
              VODDetail.show(id, null,this)
            }else {
              console.warn("genericData no reconocido:", genericDataRaw);
            }
          }
          return; // salir si era publicidad
        }
      }


      // Botón cerrar / input / tabs / resultados / historial reciente del
      // buscador -- ver Search.onEnter() en public/js/module/Search.js.
      if (Search.onEnter($el)) {
        return;
      }

      if ($el.isInAlertMessage(this.$el)) {
        $el.closeAlert(this.$el);
        Focus.to(this.$lastFocused);
        return;
      } else if ($el.isInAlertConfirm(this.$el)) {
        var tag = $el.data("tag");
        if (typeof tag != 'undefined' && tag != null && tag.length > 0) {
          if (tag == "license_already_in_use") {
            this.activateLicense($el.is(this.$nbAlertConfirmOkButton));
            $el.closeAlert(this.$el);
            Focus.to(this.$videoContainer);
            return;
          } else if (tag == "MoviesContinuePlayback") {
            if ($el.is(this.$nbAlertConfirmOkButton)) {
              var timeResume = User.getVideoHistoryFor(this.playbackMetadata.type, this.playbackMetadata.id);
              nbPlayer.$player.currentTime(timeResume);
            }
            nbPlayer.$player.play();
            $el.closeAlert(this.$el);
            this.goToFullscreen();
            return;
          } else if (tag == "menuabout_logout") {
            if ($el.is(this.$nbAlertConfirmOkButton)) {
              $el.closeAlert(this.$el);
              this.$el.showAlertConfirm(__("LoginLogoutConfirm"), "LoginLogoutConfirm", __("LoginLogoutButton"), __("LoginLogoutCancelButton"), "cancel");
              return;
            } else {
              $el.closeAlert(this.$el);
              Focus.to(this.$lastFocused);
            }
          } else if (tag == "LoginLogoutConfirm") {
            if ($el.is(this.$nbAlertConfirmOkButton)) {
              $el.closeAlert(this.$el);
              cv.logout(function () {
                self.destroyScene();
              });
              return;
            } else {
              $el.closeAlert(this.$el);
              Focus.to(this.$lastFocused);
            }
          }
        }

        if ($el.is(this.$nbAlertConfirmOkButton)) {
          $el.closeAlert(this.$el);
          closeApp();
        } else {
          $el.closeAlert(this.$el);
          Focus.to(this.$lastFocused);
        }
        return;
      } else if (NBAlert.isInAlertInput(this.$el)) {
        NBAlert.enter(this);
        return;
      } else if (nbPlayer.isFullscreen()) {
        if ($el.hasClass('video-container')) {
          return false;
        }
        nbPlayer.manageOnEnter($el, function () {
          var next = AppData.getNextEpisode(self.playbackMetadata.item, self.playbackMetadata.item.currentSeasonId, self.playbackMetadata.item.currentEpisodeId);
          if (next != null) {
            self.playEpisode(self.playbackMetadata.item.currentVodObjectId, next);
          }
        }, function () {
          self.restartFocus();
        }, function () {
          self.openEPG();
        });
        return false;
      } else if (ParentalControlDlg.isShowed()) {
        ParentalControlDlg.onEnter($el);
        return;
      } else if (InactivityManager.isShown()) {
        InactivityManager.onEnter($el);
        return;
      } else if (this.getVisibleEpgModule() && !$el.hasClass('video-container') && !NBAlert.isInAlertInput(this.$el)) {
        this.getVisibleEpgModule().onEnter($el, function (type, id, url, object) {
          // Se está reproduciendo contenido elegido directamente desde la
          // guía: descartar el id "para volver" (ver epgReturnServiceId),
          // no corresponde reusarlo en una futura salida con "atrás".
          self.epgReturnServiceId = null;
          self.playContentWithAccess(type, id, url, object, true, true);
        });
        return;
      } else if (VOD.isShowed() && !VODDetail.isShowed() && !$el.hasClass('video-container') && !$el.isInAlertConfirm(this.$el)) {
        VOD.onEnter($el, function (type, id, url, object) {
          self.playContent(type, id, url, object, false, false);
        });
        return;
      } else if (VODDetail.isShowed() && !$el.hasClass('video-container') && !$el.isInAlertConfirm(this.$el)) {
        VODDetail.onEnter($el);
        return;
      }

      if (typeof $el.data("id") !== 'undefined') {
        var id = $el.data("id");
        var type = $el.data("type");


        if (this.playbackMetadata && type == this.playbackMetadata.type && id == this.playbackMetadata.id && !this.firstLaunch) {
          this.goToFullscreen();
          return;
        }

        if (type == "service") {
          var serviceTV = AppData.getServiceTV(id);
          if (serviceTV !== false && serviceTV.url != null && serviceTV.url.length > 0) {
            this.playContentWithAccess(type, id, serviceTV.url, serviceTV, true, false);
            console.log("Selected service ID:", typeof(id), id);
          }
        } else if (type == "catchup") {
          if ($el.data("back") == true) {
            $("#catchupsRow").find(".row-catchup-dates:first").addClass("hidden");
            $("#catchupsRow").find(".row-catchup-events:first").addClass("hidden");
            $("#catchupsRow").find(".row-catchups:first").removeClass("hidden");

            var $focusTo = $("#catchupsRow").find(".row-catchups .focusable[data-id='" + id + "']:first");
            Focus.to($focusTo);
            $focusTo.focus();
          } else {
            var catchup = AppData.getCatchup(id);
            if (catchup !== false) {
              this.openCatchupCell(catchup);
            }
          }

        } else if (type == "catchup-date") {
          if ($el.data("back") == true) {
            $("#catchupsRow").find(".row-catchups:first").addClass("hidden");
            $("#catchupsRow").find(".row-catchup-events:first").addClass("hidden");
            $("#catchupsRow").find(".row-catchup-dates:first").removeClass("hidden");

            var $focusTo = $("#catchupsRow").find(".row-catchup-dates .focusable[data-id='" + id + "']:first");
            Focus.to($focusTo);
            $focusTo.focus();
          } else {
            var catchup = AppData.getCatchup(id);
            var dateString = $el.data("date");
            if (catchup !== false) {
              this.openCatchupDate(catchup, dateString);
            }
          }
        } else if (type == "catchup-event") {
          var eventId = $el.data("event-id");
          var catchup = null;
          if (eventId != null && typeof eventId != 'undefined' && eventId > 0) {
            catchup = AppData.getCatchupByEventId(eventId);
            id = eventId;
          } else {
            var group = $el.data("group");
            catchup = AppData.getCatchupEvent(group, id);
          }

          if (catchup == null) {
            return;
          }

          console.log(catchup);
          console.log("Play catchup event id " + id);

          AppData.getTopLevelCatchupM3u8Url(catchup.id, function (url) {
            console.log("Play CATCHUP with URL: " + url);
            if (url != null && url.length > 0) {
              self.playContentWithAccess(type, id, url, catchup, true, false);
            }
          });

        } else if (type == "vod") {
          if (id > 0) {
            this.currentVodCategoryId = null;
            //Router.go('voddetail', id, this.currentVodCategoryId, this);
            this.$lastFocused = Focus.focused;
            this.lastVodSelected = { id: id, categoryId: $el.data("category-id") };
            VODDetail.show(id, this.currentVodCategoryId, this);
          } else {
            // open all vod window
            VOD.show();
          }
        }

      } else if (typeof $el.data("other-id") !== 'undefined') {
        var id = $el.data("other-id");
        if (id != null & id >= 0) {
          console.log("other option ", id);
          switch (id) {
            case 0: //reload
              this.activate();
              break;
            case 1: //epg
              this.openEPG();
              break;
            case 2: //about
              if (this.logoutEnabled) {
                this.$lastFocused = Focus.focused;
                this.$el.showAlertConfirm(this.aboutString, "menuabout_logout", __("MenuLogout"), __("SettingsCloseButton").toUpperCase(), "cancel", true);
              } else {
                this.$el.showAlertMessage(this.aboutString, "menuabout", __("SettingsCloseButton").toUpperCase());
              }
              break;
            case 3: //logout
              this.$lastFocused = Focus.focused;
              this.$el.showAlertConfirm(__("LoginLogoutConfirm"), 'LoginLogoutConfirm', __("LoginLogoutButton"), __("LoginLogoutCancelButton"), 'cancel');
              break;
            case 4: //exit
              this.$lastFocused = Focus.focused;
              this.$el.showAlertConfirm(__("AppCloseApp"), 'close_app', null, null, 'cancel');
              break;
            case 5: //search
              Search.show();
              break;
            case 6: // osms
              if (this.osmsEnabled) {
                Osms.openMessagesList();
              }
              break;
          }
        }
      } else if ($el.hasClass('video-container')) {
        if (this.miniPlayerEnabled) {
          this.goToFullscreen();

          Focus.to($(".exitFullscreenBtn"));
          $(".exitFullscreenBtn").focus();
        }
      }
    },

    /**
     * @inheritdoc Scene#onBeforeGoBack
     */
    onBeforeGoBack: function (fromScene) {
      this.dontRedraw = true;
    },

    /**
     * @inheritdoc Scene#navigate
     */
    // Devuelve el módulo de guía de canales configurado (EPGCards o EPG
    // clásico) según CONFIG.app.epgCards, sin importar si está visible.
    // Útil para reset()/draw() donde no importa la visibilidad actual.
    getConfiguredEpgModule: function () {
      return this.useCards ? EPGCards : EPG;
    },

    // Devuelve el módulo de guía de canales activo (EPGCards o EPG clásico)
    // sólo si está actualmente visible, o null si no lo está. Unifica el
    // patrón "if (useCards && EPGCards.isShowed()) ... else if (!useCards &&
    // EPG.isShowed()) ..." que se repetía (con variantes, alguna de ellas con
    // un typo real: `EPGCards.isShown` en vez de `isShowed`, que hacía que
    // ese chequeo nunca fuera verdadero) en múltiples puntos de home.js.
    getVisibleEpgModule: function () {
      if (this.useCards) {
        if (EPGCards.isShowed && typeof EPGCards.isShowed === 'function' && EPGCards.isShowed()) {
          return EPGCards;
        }
        return null;
      }

      if (EPG.isShowed()) {
        return EPG;
      }

      return null;
    },

    // Dibuja la EPG en el módulo configurado (EPGCards o EPG clásico).
    // Antes este bloque de 6 líneas estaba duplicado dos veces en
    // getEPGData() con el mismo contenido exacto.
    drawEpgModule: function (servicesWithEPG) {
      var epgModule = this.getConfiguredEpgModule();
      if (this.useCards) {
        epgModule.homeObject = this;
      }
      epgModule.draw(servicesWithEPG);
    },

    // navigate() actúa como despachador: cada método delega en el contexto de
    // navegación activo (buscador, diálogo OSMS, overlays especiales, vista de
    // contenido EPG/VOD, o la grilla de foco genérica de home). Se extrajo de
    // una única función de ~300 líneas para que cada bloque de lógica sea
    // legible y mantenible por separado; el comportamiento y el orden de
    // evaluación son idénticos a la versión original.
    navigate: function (direction) {
      var $el = Focus.focused;

      // Red de seguridad: si el foco se perdió (ej. quedó en null o
      // apuntando a un elemento ya removido del DOM tras volver de la
      // escena offline -- ver restartFocus()), el resto de este método
      // asume que $el es un elemento jQuery real y llama a $el.is(...) sin
      // chequear. Sin este guard, esa llamada revienta con una excepción
      // que -- al no haber try/catch en Events.trigger() -- deja el control
      // remoto sin responder en cada tecla siguiente (mismo problema se
      // repite indefinidamente). Acá, en vez de reventar, se reintenta
      // enfocar algo válido y se corta esta pasada de navegación.
      if (!$el || !$el.length || !$.contains(document, $el.get(0))) {
        this.focus();
        return;
      }

      // Verifica si el buscador esta activo
      if (Search.isOpen()) {
        $("#viewport").addClass("no-scroll"); // Bloquea el scroll
        if (typeof event !== "undefined" && event && typeof event.preventDefault === "function") {
          event.preventDefault(); // Evita que las teclas afecten la pantalla principal
        }

        if (Search.navigate(direction, $el)) {
          return;
        }
      } else {
        $("#viewport").removeClass("no-scroll"); // Restaura el scroll cuando el teclado se cierra
      }

      // Ícono de búsqueda persistente en la cabecera (fuera de #channelsGrid,
      // así que no lo alcanza getNextFocusable()'s "search up to left" ni el
      // resto de la grilla genérica). Se maneja acá, autocontenido: sólo
      // DOWN hace algo (bajar al preview o al primer focusable del grid);
      // izquierda/derecha/arriba se quedan quietos porque no hay nada más
      // en esa fila de la cabecera.
      if ($el.is("#headerSearchIcon")) {
        if (direction === "down") {
          if (this.miniPlayerEnabled && this.$videoContainer && this.$videoContainer.length) {
            Focus.to(this.$videoContainer);
          } else {
            var $firstFocusable = this.channelsGrid.find(".focusable:visible:first");
            if ($firstFocusable.length) Focus.to($firstFocusable);
          }
        }
        return;
      }

      //** Priorizar navegación en el diálogo OSMS si está visible
      if (this.navigateOsmsDialog(direction, $el)) {
        return;
      }

      if (this.navigateSpecialOverlays(direction, $el)) {
        return;
      }

      if (this.navigateContentView(direction)) {
        return;
      }

      return this.navigateFocusableGrid(direction, $el);
    },

    // La navegación del panel de búsqueda (botón cerrar, input, tabs,
    // resultados, incluida la carga incremental al llegar al final) vive
    // en Search.navigate() (public/js/module/Search.js), invocada desde
    // navigate() más arriba.

    // Navegación dentro del diálogo OSMS (y su detalle) cuando está visible.
    // Devuelve true si el diálogo estaba activo y absorbió la navegación.
    navigateOsmsDialog: function (direction, $el) {
      if (this.osmsEnabled && !$("#osmsDialog").hasClass("hidden")) {
        var $currentItem = $(".osm-item.item-focus");
        var $closeButton = $("#closeOsmsDialogFooter");

        if ($el.is($closeButton)) {
          // Si estamos en el botón de cerrar
          if (direction === "up") {
            const $lastItem = $(".osm-item:last");
            if ($lastItem.length) {
              $closeButton.removeClass("item-focus");
              $lastItem.addClass("item-focus");
              Focus.to($lastItem);

              // Ajustar el scroll para mostrar el último elemento
              const $dialogBody = $(".dialog-osms-body");
              const itemTop = $lastItem.position().top;
              const itemHeight = $lastItem.outerHeight();
              const containerHeight = $dialogBody.height();
              const scrollTop = $dialogBody.scrollTop();

              if (itemTop + itemHeight > containerHeight) {
                $dialogBody.scrollTop(scrollTop + (itemTop + itemHeight - containerHeight));
              }
            }
          }
          return true;
        }

        var $nextItem;
        if (direction === "up") {
          $nextItem = $currentItem.prev(".osm-item");
        } else if (direction === "down") {
          $nextItem = $currentItem.next(".osm-item");
        }

        const $dialogBody = $(".dialog-osms-body");

        if ($nextItem && $nextItem.length > 0) {
          $currentItem.removeClass("item-focus");
          $nextItem.addClass("item-focus");
          Focus.to($nextItem);

          // Ajustar el scroll para mantener el elemento en foco visible
          const itemTop = $nextItem.position().top;
          const itemHeight = $nextItem.outerHeight();
          const containerHeight = $dialogBody.height();
          const scrollTop = $dialogBody.scrollTop();

          if (itemTop < 0) {
            $dialogBody.scrollTop(scrollTop + itemTop);
          } else if (itemTop + itemHeight > containerHeight) {
            $dialogBody.scrollTop(scrollTop + (itemTop + itemHeight - containerHeight));
          }
        } else if (direction === "up" && !$nextItem.length) {
          // Mantener el foco en el primero y asegurar que sea completamente visible
          Focus.to($currentItem);
          $dialogBody.scrollTop(0); // Forzar el scroll al inicio para mostrar el primer elemento completo
        } else if (direction === "down" && !$nextItem.length) {
          // Si estamos en el último elemento y se navega hacia abajo, mover el foco al botón de cerrar
          if ($closeButton.length) {
            $currentItem.removeClass("item-focus");
            $closeButton.addClass("item-focus"); // Opcional
            Focus.to($closeButton);
          } else {
            Focus.to($currentItem);
          }
        }
        return true; // Evitar que la navegación continúe fuera del diálogo
      } else if (this.osmsEnabled && !$("#osmsDetailContainer").hasClass("hidden")) {
        // Mantener el foco en el botón de cerrar del detalle si está visible
        Focus.to($("#closeOsmsDetail"));
        return true;
      }

      return false;
    },

    // Overlays especiales que capturan toda la navegación mientras están
    // activos: alertas, diálogo de alerta con input, player en fullscreen y
    // control parental.
    navigateSpecialOverlays: function (direction, $el) {
      if ($el.isInAlertMessage(this.$el) || $el.isInAlertConfirm(this.$el)) { // navigate on dialog
        this.manageFocusOnAlert(direction, $el.data("parent-type"));
        return true;
      } else if (NBAlert.isInAlertInput(this.$el)) {
        NBAlert.navigate(direction, $el.data("parent-type"));
        return true;
      } else if (nbPlayer.isFullscreen()) {
        nbPlayer.navigate($el, direction);
        return true;
      } else if (ParentalControlDlg.isShowed()) {
        ParentalControlDlg.navigate(direction);
        return true;
      }

      return false;
    },

    // Delega la navegación en la vista de contenido activa (guía de canales
    // en su variante EPGCards o EPG clásica, VOD o el detalle de VOD).
    navigateContentView: function (direction) {
      var epgModule = this.getVisibleEpgModule();

      if (epgModule && !nbPlayer.isFullscreen()) {
        epgModule.navigate(direction);
        return true;
      } else if (VOD.isShowed() && !VODDetail.isShowed() && !nbPlayer.isFullscreen()) {
        VOD.navigate(direction);
        return true;
      } else if (VODDetail.isShowed() && !nbPlayer.isFullscreen()) {
        VODDetail.navigate(direction);
        return true;
      }

      return false;
    },

    // Comportamiento por defecto de navigate(): mover el foco entre elementos
    // .focusable de la grilla de home (menú, filas de canales, publicidad),
    // incluyendo scroll y los casos especiales de anuncios/menu-grid. Es el
    // último paso de la cadena y su valor de retorno se propaga tal cual
    // desde navigate() (idéntico al comportamiento original).
    navigateFocusableGrid: function (direction, $el) {
      var $focused = Focus.focused;
      var $focusTo = [];

      if (direction == "up") {
        $focusTo = this.getNextFocusable(direction);
      } else if (direction == "down") {
        $focusTo = this.getNextFocusable(direction);
      } else if (direction == "left") {
        $focusTo = $focused.prevAll(".focusable:visible:first");
      } else if (direction == "right") {
        $focusTo = $focused.nextAll(".focusable:visible:first");
      }

      // 🎯 Navegación manual dentro de publicidades visibles
      if ((direction === "left" || direction === "right") && $focused.closest(".publicidad-home-top, .publicidad-home-bottom").length > 0) {
        var container = $focused.closest(".publicidad-home-top, .publicidad-home-bottom");
        var containerId = container.hasClass("publicidad-home-top") ? "publicidad-home-top" : "publicidad-home-bottom";
        Ads.navigateManual(direction, containerId);
        return;
      }

      if ($focused.closest(".menu-grid").length > 0) {
        if (direction === "down") {
          var $adsBottom = $(".publicidad-home-bottom .focusable:visible");
          if ($adsBottom.length > 0) {
            Focus.to($adsBottom.first());
            return;
          }
        }
      }

      if ($focusTo.length > 0) {
        Focus.to($focusTo);

        var $parent = $focusTo.parent();

        if ($focusTo.position().left < 0) {
          $parent.scrollLeft($parent.scrollLeft() - $focusTo.innerWidth() - 20);
        } else if (($focusTo.position().left + $focusTo.innerWidth()) > $parent.innerWidth()) {
          $parent.scrollLeft($parent.scrollLeft() + $focusTo.innerWidth() + 20);
        }

      } else {
        if (!$el.is(":visible")) {
          Focus.to($("#divVideoContainer"));
        }
      }

      return false;
    },

    getNextFocusable: function (direction) {

      var $itemAtPoint = [];
      var $focused = Focus.focused;
      var jumpTopTo = 0;

      var $currentRow = $focused.closest(".row");
      var $nextRow = $currentRow;
      var currentLeftPos = $focused.position().left;

      if (direction == 'up') {
        if ($focused.is(this.$videoContainer)) {
          // Antes esto era un punto muerto (UP desde el preview no hacía
          // nada). El ícono de búsqueda persistente vive arriba de todo en
          // la cabecera, así que UP desde el preview ahora sube hasta ahí
          // si está visible; si no, mantiene el comportamiento anterior.
          var $headerSearchIcon = $("#headerSearchIcon");
          if ($headerSearchIcon.length > 0 && $headerSearchIcon.is(":visible")) {
            return $headerSearchIcon;
          }
          return $focused;
        }

        $nextRow = $currentRow.prevAll(".row:visible:first");
        // Saltar filas sin focusables (ej. bouquets vacíos, publicidad vacía)
        while ($nextRow.length > 0 && $nextRow.find(".focusable:visible").length === 0) {
          $nextRow = $nextRow.prevAll(".row:visible:first");
        }

        if ($nextRow == null || $nextRow.length == 0) {
          // Si el mini player no está activo, mantener el foco para no ir al contenedor oculto
          if (!this.miniPlayerEnabled) {
            return $focused;
          }
          return this.$videoContainer;
        }

      } else if (direction == 'down') {
        if ($focused.is(this.$videoContainer)) {
          currentLeftPos = $focused.offset().left + $focused.width() / 2;
          var $nearItem = this.channelsGrid.getHomeFocusableItemAt($focused.offset().top + 20, currentLeftPos);
          if ($nearItem.length > 0) {
            return $nearItem;
          } else {
            $nextRow = this.channelsGrid.getHomeRowAt($focused.offset().top + 20, currentLeftPos);
            currentLeftPos = $focused.offset().left;
          }

        } else {
          $nextRow = $currentRow.nextAll(".row:visible:first");
          // Saltar filas sin focusables (ej. bouquets vacíos, publicidad vacía)
          while ($nextRow.length > 0 && $nextRow.find(".focusable:visible").length === 0) {
            $nextRow = $nextRow.nextAll(".row:visible:first");
          }
        }

        if ($nextRow == null || $nextRow.length == 0) {
          return $focused;
        }
      }

      left = currentLeftPos + ($focused.width() / 2);

      var $firstFocusable = $nextRow.find(".focusable:visible:first");

      // scroll if needed (solo si la fila tiene al menos un focusable)
      if ($nextRow.length > 0 && $firstFocusable.length > 0) {
        jumpTopTo = $nextRow.position().top + $firstFocusable.position().top + ($firstFocusable.height() / 2);
        var jump = 0;
        if ($nextRow.position().top < 0) {
          jump = $nextRow.position().top;
          jumpTopTo -= jump;
        } else if ($nextRow.position().top + $nextRow.height() > this.channelsGrid.height() - 20) {
          jump = ($nextRow.position().top + $nextRow.height()) - (this.channelsGrid.height() - 50);
          jumpTopTo -= jump;
        }
        this.channelsGrid.scrollTop(this.channelsGrid.scrollTop() + jump);
      }

      //get a focusable item at point
      $itemAtPoint = this.channelsGrid.getHomeFocusableItemAt(jumpTopTo, left);

      if ($itemAtPoint.length > 0) {
        return $itemAtPoint;
      }

      // search up to left
      // Antes: esta búsqueda geométrica por fuerza bruta (hasta ~12 llamadas a
      // getHomeFocusableItemAt, cada una con costo de layout) se repetía en
      // CADA evento de auto-repetición al mantener presionada una flecha.
      // Se throttlea: si ya se ejecutó hace menos de 120ms, se omite esta
      // vuelta puntual y se cae al fallback existente (primer focusable de la
      // fila / mantener foco actual) — el próximo keydown la vuelve a intentar.
      var now = Date.now();
      var canRunFallbackSearch = !this._lastFallbackSearchAt || (now - this._lastFallbackSearchAt) >= 120;

      if (canRunFallbackSearch) {
        this._lastFallbackSearchAt = now;
        var jumpX = 100;
        var x = 1;
        for (var i = (left - jumpX); i > 0; i -= jumpX) {
          console.log("Search up to left " + (x++) + " (x=" + i + ",y=" + jumpTopTo + ")");
          $itemAtPoint = this.channelsGrid.getHomeFocusableItemAt(jumpTopTo, i);

          if ($itemAtPoint.length > 0) {
            return $itemAtPoint;
          }
        }
      }

      // Fallback: usar el primer focusable de la fila si la búsqueda por coordenadas falla
      if ($firstFocusable.length > 0) {
        return $firstFocusable;
      }

      return $focused;
    },

    channelUp: function () {
      this.playNextPrevServiceTV(1);
    },

    channelDown: function () {
      this.playNextPrevServiceTV(-1);
    },

    play: function () {
      if (this.playbackMetadata && (this.playbackMetadata.type == "vod" || this.playbackMetadata.type == "catchup-event")) {
        if (nbPlayer.isPaused()) {
          nbPlayer.$player.play();
        }
      }
    },

    pause: function () {
      if (this.playbackMetadata &&  (this.playbackMetadata.type == "vod" || this.playbackMetadata.type == "catchup-event")) {
        if (!nbPlayer.isPaused()) {
          nbPlayer.$player.pause();
        }
      }
    },

    playPause: function () {
      if (this.playbackMetadata && (this.playbackMetadata.type == "vod" || this.playbackMetadata.type == "catchup-event")) {
        if (nbPlayer.isPaused()) {
          nbPlayer.$player.play();
        } else {
          nbPlayer.$player.pause();
        }
      }
    },

    keyFFAction: function () {
      nbPlayer.forwardXAction();
    },

    keyRWAction: function () {
      nbPlayer.backXAction();
    },

    keyStopAction: function () {
      this.resetPlayerContent(true, null, null, null);
    },

    keyGuideAction: function () {
      this.$lastFocused = Focus.focused;
      this.openEPG();
    },

    resetPlayerContent: function (minimize, fallbackMessage, type, item) {
      // Telemetria: se para la reproduccion sin pasar a otro contenido
      // (STOP del mando, canal bloqueado, sin video seleccionado, etc.):
      // prematuro, no "finished" (eso solo lo dispara playerOnEnded).
      Telemetry.stopCurrent({ timeIndex: this.lastPlaybackTime });

      nbPlayer.nbPlayerResetContent(minimize);
      this.playbackMetadata = {};

      PlayerFallback.hide();
      if (fallbackMessage && fallbackMessage != "") {
        PlayerFallback.show(this.$videoContainer, fallbackMessage, type, item);

        if (!this.miniPlayerEnabled) {
          this.$videoContainer.parent().hide(0);
        }
      }

      this.resetNbPlayerRetryTimeout();
    },

    /**
     * @inheritdoc Scene#create
     */
    create: function () {
      return $('#scene-home');
    },

    /**
     * Evita que Router destruya home al ir a la escena offline.
     * Sin esto, Router.go("offline") llama desctruct() y se pierde todo el contenido.
     */
    deactivate: function () {
      if (this.preserveOnDeactivate) {
        this.preserveOnDeactivate = false;
        return false;
      }
    },

    isSessionNetworkError: function (errorCode) {
      return errorCode === "timeout" || errorCode === "error" || errorCode === "parsererror"
        || errorCode === "session_error" || errorCode === "activation_error";
    },

    setBouquetsContent: function (data) {
      var self = this;
      var htmlRow = "";

      $("#tvChannelsRow").addClass("hidden");
      $("#tvChannelsRow").empty();
      if (data.length >= 1) {
        var tvChannels = data[0];

        if (tvChannels.items.length > 0) {
          htmlRow = this.getHTMLRowChannel(tvChannels, tvChannels.name, false);
          $("#tvChannelsRow").html(htmlRow);
          $("#tvChannelsRow").removeClass("hidden");
        }
      }

      // set favorites if needed
      this.setFavoritesRow();

      //$("#channelCategoryGroup").addClass("hidden");
      //$("#channelCategoryGroup").empty();
      if (data.length > 1) {
        //$("#channelCategoryGroup").removeClass("hidden");
        htmlRow = "";
        data.forEach(function (bouquet, index, array) {
          if (index > 0 && bouquet.items.length > 0) {
            htmlRow += self.getHTMLRowChannel(bouquet, bouquet.name, true);
          }
        });

        //$("#channelCategoryGroup").append(htmlRow);
        $(htmlRow).insertAfter("#favoritesRow");
      }

      // set first focusable item
      this.$firstFocusableItem = [];
      if (User.getHomeChannelLCN() != null && User.getHomeChannelLCN() != -1) {
        this.$firstFocusableItem = this.channelsGrid.find(".channels-div .focusable[data-lcn='" + User.getHomeChannelLCN() + "']:first");
      }

      if (this.$firstFocusableItem.length == 0) {
        this.$firstFocusableItem = this.channelsGrid.find(".channels-div .focusable:first");
      }

      App.notification(__("Scene_Home"));
      Focus.to(this.$firstFocusableItem);

      if (this.miniPlayerEnabled && this.firstLaunch) { // play first item when app data is loaded
        this.onEnter(Focus.focused, []);
      }
    },

    setCatchupsContent: function (data) {
      console.log(data);
      if (data.length > 0) {

        var cells = "";

        data.forEach(function (catchup, index, array) {
          if (catchup.events != null && catchup.events.length > 0) {
            var style = "";
            if (catchup.background != null && typeof catchup.background != 'undefined') {
              style = " background-color: #" + catchup.background;
            }
            cells += '<div class="channel-video channel-style focusable" data-id="' + catchup.epgStreamId + '" data-type="catchup" style="' + style + '">'
              + '<img class="img-style" src="' + catchup.img + '" alt="">'
              + '</div>';
          }
        });

        var htmlRow = '<div class="col-sm-12 channels-div">'
          + '<h4 class="heading">' + __("MenuCatchups") + '</h4>'
          + '<div class="horizontal-slide row-catchups">'
          + cells
          + '</div>'
          + '<div class="horizontal-slide row-catchup-dates hidden"></div>'
          + '<div class="horizontal-slide row-catchup-events hidden"></div>'
        '</div>';

        $("#catchupsRow").html(htmlRow);
        $("#catchupsRow").removeClass("hidden");
      } else {
        $("#catchupsRow").addClass("hidden");
      }
    },

    setCatchupsRecordedContent: function (data) {
      if (data.length > 0) {

        var cells = "";

        data.forEach(function (catchup, index, array) {
          cells += '<div class="channel-video catchup-recorded focusable" data-id="' + catchup.event.id + '" data-event-id="' + catchup.event.id + '" data-type="catchup-event">'
            + '<div class="catchup-recorded-container">'
            + '<div class="no-padding"><img src="' + catchup.event.imageUrl + '" data-placeholder="' + catchup.image + '" alt=""></div>'
            + '<span>' + catchup.event.name + '</span>'
            + '<span>' + getDateFormatted(catchup.event.startDate, false) + ' ' + getDateFormatted(catchup.event.startDate, true) + ' - ' + getDateFormatted(catchup.event.endDate, true) + '</span></div>'
            + '</div>';
        });

        var minutesUsed = AppData.getCatchupRecordingsMinutesUsed();
        var minutesLimit = CONFIG.app.catchupRecordingHoursLimit * 60;
        var percentage = (minutesUsed / (minutesLimit)) * 100;
        percentage = percentage < 0 ? 0 : (percentage > 100 ? 100 : percentage);
        var used = minutesLimit - minutesUsed;
        used = (used > 0) ? minutesToTimeString(used) : "0hs";
        var availableText = __("CatchupTimeAvailable")
          .replaceAll("%s", used)
          .replaceAll("%dhs", minutesToTimeString(minutesLimit));

        var htmlRow = '<div class="col-sm-12 channels-div">'
          + '<h4 class="heading">' + __("CatchupRecordingTitle") + '</h4>'

          + '<div class="catchup-record-info">'
          + '<div class="catchup-record-available">'
          + '<div class="catchup-record-used" style="width: ' + percentage + '%"></div>'
          + '</div>'
          + '<h3>' + availableText + '</h3></div>'

          + '<div class="horizontal-slide row-catchups">'
          + cells
          + '</div>'
        '</div>';

        $("#catchupRecordingRow").html(htmlRow);
        $("#catchupRecordingRow").removeClass("hidden");

        addImgPlaceholder($("#catchupRecordingRow").find("img"));
        //addImgErrorEvent($("#catchupRecordingRow").find("img"));
      } else {
        $("#catchupRecordingRow").addClass("hidden");
      }
    },

    openCatchupCell: function (catchup) {
      // prepare dates
      var dates = [];
      var justDate = "";
      var style = "";
      catchup.events.forEach(function (event, index, array) {
        justDate = event.startDate.local().format('YYYY-MM-DD');
        if (dates.indexOf(justDate) < 0) {
          dates.push(justDate);
        }
      });

      dates.sort(function (a, b) {
        a = moment(a.startDate).utc(true);
        b = moment(b.startDate).utc(true);
        return a.startDate != null ? ((a.startDate > b.startDate) ? 1 : ((a.startDate < b.startDate) ? -1 : 0)) : 0;
      });

      if (catchup.background != null && typeof catchup.background != 'undefined') {
        style = " background-color: #" + catchup.background;
      }
      var cells = '<div class="channel-video focusable" data-id="' + catchup.epgStreamId + '" data-type="catchup" data-back="true" style="' + style + '">'
        + '<img src="' + catchup.img + '" alt="">'
        + '</div>';

      dates.forEach(function (dateItem, index, array) {
        cells += '<div class="channel-video focusable" data-id="' + catchup.epgStreamId + '" data-date="' + dateItem + '" data-type="catchup-date">'
          + '<div><span>' + getDateFormatted(moment(dateItem)) + '</span></div>'
          + '</div>';
      });

      $("#catchupsRow").find(".row-catchups:first").addClass("hidden");
      var $rowCatchupDates = $("#catchupsRow").find(".row-catchup-dates:first");
      $rowCatchupDates.removeClass("hidden");
      $rowCatchupDates.html(cells);

      // focus
      var $focusTo = $rowCatchupDates.find(".focusable:first");
      Focus.to($focusTo);
      $focusTo.focus();
    },

    openCatchupDate: function (catchup, dateString) {
      var events = catchup.events.filter(function (event) {
        return event.startDate.local().format("YYYY-MM-DD") == dateString;
      });

      if (catchup.background != null && typeof catchup.background != 'undefined') {
        style = " background-color: #" + catchup.background;
      }

      if(CONFIG.app.brand === "jrmax") {
        style = 'color:black';
      }

      var cells = '<div class="channel-video focusable" data-id="' + catchup.epgStreamId + '" data-type="catchup" data-back="true" style="' + style + '">'
        + '<img src="' + catchup.img + '" alt="">'
        + '</div>'
        + '<div class="channel-video focusable" data-id="' + catchup.epgStreamId + '" data-date="' + dateString + '" data-type="catchup-date" data-back="true">'
        + '<div><span>' + getDateFormatted(moment(dateString)) + '</span></div>'
        + '</div>';
      var config = Storage.get("cvClientConfig");
      var objetoConfig = JSON.parse(config);
      var cdnServers = objetoConfig.cdnServers[3].urls[1];

      events.forEach(function (event, index, array) {
        var src
        if (event.imageUrl != null || event.imageUrl != "null" || event.imageUrl != "") {
          src = event.imageUrl
        }
        else if (event.imageUrl == null || event.imageUrl == "null" || event.imageUrl == "") {
          src = cdnServers + "" + event.id + "/screenshot.jpg"
        }
        cells += '<div class="channel-video focusable" data-id="' + event.eventId + '" data-group="' + catchup.epgStreamId + '" data-type="catchup-event">'
          + '<div style = "position: relative"><img src="' + src + '"onerror="imgOnError(this)" alt=""><span style = "position: absolute; top:0;" class="event">' + event.name + '</span><span style = "position: absolute; bottom:0;" class="event">' + getDateFormatted(event.startDate, true) + ' - ' + getDateFormatted(event.endDate, true) + '</span></div>'
          + '</div>';
      });
      $("#catchupsRow").find(".row-catchup-dates:first").addClass("hidden");
      var $rowCatchupEvents = $("#catchupsRow").find(".row-catchup-events:first");
      $rowCatchupEvents.removeClass("hidden");
      $rowCatchupEvents.html(cells);
      $rowCatchupEvents.scrollLeft(0);

      // focus
      var $focusTo = $rowCatchupEvents.find(".focusable[data-date='" + dateString + "']:first");
      Focus.to($focusTo);
      $focusTo.focus();
    },

    setVODContent: function (categories) {
      var vodsCount = 0;
      categories.forEach(function (item) {
        vodsCount += item.vods.length;
      });

      if (vodsCount > 0) {
        var vods = AppData.getVodRecommended();
        var htmlRow = this.getHTMLRowVOD(vods, __("MenuMovies"), -1, (CONFIG.app.production ? false : true));
        $("#vodRow").html(htmlRow);
        $("#vodRow").removeClass("hidden");
      } else {
        $("#vodRow").addClass("hidden");
      }
      VOD.draw(categories);
    },

    getHTMLRowChannel: function (row, title, isBouquet) {
      var headingStyle = "";
      var boderJrMax = "";
      if (CONFIG.app.brand === "supercabo") {
        headingStyle = "style='width: 15em; border-top: 2px solid; border-bottom: 2px solid; border-right: 2px solid; border-radius: 0px 15px 15px 0px; border-color:orange'"
      }

      if(CONFIG.app.brand === "jrmax") {
        headingStyle = "style='color:black;'"
        boderJrMax = " border: 2px solid black;"
      }

      var html = '<div class="col-sm-12 channels-div" data-description="' + row.description + '">'
        + '<h4 class="heading" '+headingStyle+'>' + title + '</h4>'
        + '<div class="horizontal-slide">';

      var style = "";
      row.items.forEach(function (channel) {
        style = "";
        if (channel.backgroundColor != null && typeof channel.backgroundColor != 'undefined') {
          style = " background-color: #" + channel.backgroundColor;
        }
        html += '<div class="channel-video focusable channel-style" data-id="' + channel.id + '" data-lcn="' + channel.lcn + '" data-type="service" style="' + style +";"+ boderJrMax+ '">'
          + '<img class="img-style" src="' + channel.img + '" onerror="imgOnError(this)" alt="">'
          + '</div>';
      });
      html += '</div>'
        + '</div>';

      if (isBouquet) {
        html = "<div class='row div-bouquet' data-id='" + row.bouquetId + "'>" + html + "</div>";
      }

      return html;
    },

    getHTMLRowVOD: function (vods, title, idCategory, allOption) {
      // if (vods.length == 0) {
      // 	return "";
      // }
      var headingStyle
      if (CONFIG.app.brand === "supercabo") {
        headingStyle = "style='width: 15em; border-top: 2px solid; border-bottom: 2px solid; border-right: 2px solid; border-radius: 0px 15px 15px 0px; border-color:orange'"
      }

      if(CONFIG.app.brand === "jrmax") {
        headingStyle = "style='color:black'"
      }

      var html = '<div class="col-sm-12 channels-div">'
        + '<h4 class="heading" '+headingStyle+'>' + title + '</h4>'
        + '<div class="horizontal-slide">';

      //all movies item
      if (allOption) {
        html += '<div class="channel-video vod-list vod-video focusable" data-id="0" data-type="vod">'
          + '<div class="vod-all-item"><i class="fa fa-film '+headingStyle+'" aria-hidden="true"></i><span '+headingStyle+'>' + __("MoviesAllVod") + '</span></div>'
          + '</div>';
      }
      var config = Storage.get("base_url");

      vods.forEach(function (vod) {
        var posterInfoURL
        if (vod.posterInfoURL == undefined || vod.posterInfoURL == null || vod.posterInfoURL == "null") {
          posterInfoURL = config + "/cv_data_pub/images/" + vod.image1Id + "/v/vod_poster_list.jpg"
        }
        else {
          posterInfoURL = vod.posterInfoURL
        }

        html += '<div class="channel-video vod-list focusable" data-id="' + vod.id + '" data-category-id="' + idCategory + '" data-type="vod">'
          + '<img src="' + posterInfoURL + '" onerror="imgOnError(this)" alt="">'
          + '</div>';
      });
      html += '</div>'
        + '</div>';

      return html;
    },

    playContentWithAccess: function (type, id, url, item, reset, forceFullscreen) {
      if (type == this.playbackMetadata.type && id == this.playbackMetadata.id && !this.forcePlayback
        || ((this.playbackMetadata.item && item.isSeries && this.playbackMetadata.item.isSeries && this.playbackMetadata.item.currentEpisodeId == item.currentEpisodeId))) {
        this.goToFullscreen();
        return;
      }

      if (this.checkParentalControl(type, id, url, item, reset, forceFullscreen)) {
        return;
      }
    },

    updateUrlSessionIfNeeded: function (url) {
      var urlUpdated = false;
      var currentSessionId = User.getSessionId();
      if (currentSessionId != "" && typeof url === "string" && url.indexOf("sessionId=") !== -1) {
        var sessionMatch = url.match(/sessionId=([^&]+)/);
        if (sessionMatch && sessionMatch[1] !== currentSessionId) {
          // Replace the sessionId value in the URL
          url = url.replace(/sessionId=([^&]+)/, "sessionId=" + currentSessionId);
          urlUpdated = true;
        } else if (url.indexOf("sessionId=") < 0) {
          url += "&sessionId=" + currentSessionId;
          urlUpdated = true;
        }

      }

      if (urlUpdated) {
        this.playbackMetadata.url = url; // Update the playback metadata URL
      }

      return url;
    },

    playContent: function (type, id, url, item, reset, isAutoPlay) {
      url = this.updateUrlSessionIfNeeded(url);

      if (type == this.playbackMetadata.type && id == this.playbackMetadata.id && !this.forcePlayback
        || ((this.playbackMetadata.item && item.isSeries && this.playbackMetadata.item.isSeries && this.playbackMetadata.item.currentEpisodeId == item.currentEpisodeId))) {
        this.goToFullscreen();
        return;
      }

      // Telemetria: cambio real de contenido. Telemetry.recordSwitchedTo*
      // ya cierra internamente lo que estuviera en curso antes de abrir el
      // nuevo registro (ver public/js/module/Telemetry.js).
      if (type == "service") {
        Telemetry.recordSwitchedToService(item);
      } else if (type == "vod") {
        Telemetry.recordSwitchedToVod(item, User.getVideoHistoryFor(type, id) || 0);
      } else if (type == "catchup-event") {
        Telemetry.recordSwitchedToCatchup(item, 0);
      }

      var self = this;
      this.forcePlayback = false;
      this.NBPLAYER_RETRY_AFTER_ERROR = true;
      this.resetNbPlayerRetryTimeout(typeof reset != 'undefined' && reset == true);

      // before change current content, save history
      if (!nbPlayer.isPaused() && this.playbackMetadata.type == 'vod') {
        var currentTime = parseInt(nbPlayer.$player.currentTime());
        User.setVideoHistoryFor({ type: this.playbackMetadata.type, id: this.playbackMetadata.id, time: currentTime });
      }

      PlayerFallback.hide();
      if (!isAutoPlay) {
        User.updateLastInteraction();
      }
      nbPlayer.playContent(type, url);
      this.setPlayerMetadata(type, id, url, item);

      if (!isAutoPlay) {
        this.goToFullscreen();
      }

      if (!nbPlayer.isFullscreen()) {
        nbPlayer.$player.userActive(false);
      }

      //continue
      if (nbPlayer.nbPlayerAreControslActive() && !nbPlayer.isSideMenuOpened()) {
        Focus.to(nbPlayer.$playPauseButton);
      }

      var autoplay = true;
      if (this.autoSeek && this.lastPlaybackTime > 0) {
        nbPlayer.$player.currentTime(this.lastPlaybackTime);
        this.autoSeek = false;
        this.lastPlaybackTime = 0;
      } else if (type == 'vod') {
        var timeResume = User.getVideoHistoryFor(type, id);
        if (timeResume > 0) {
          if (nbPlayer.isFullscreen()) {
            this.onReturnFullscreen();
          }
          this.$el.showAlertConfirm(__("MoviesContinuePlayback"), "MoviesContinuePlayback", __("MoviesContinuePlaybackYes"), __("MoviesContinuePlaybackNo"), "ok");
          autoplay = false;
        } else {
          this.goToFullscreen();
        }
      }

      if (autoplay) {
        nbPlayer.$player.play();
        if (nbPlayer.isFullscreen()) {
          setTimeout(function () {
            nbPlayer.showControls();
          }, 300);
        } else {
          //  modificar maximizado de pantalla
          // if ((this.firstLaunch || CONFIG.app.brand != "telecable") && !isAutoPlay) {
          //   this.goToFullscreen();
          // }
          if ((CONFIG.app.brand == "fotelka") && !isAutoPlay) {
            this.goToFullscreen();
          }
        }
      }
      // else {
      //   nbPlayer.$player.pause();
      // }

      nbPlayer.setEvents(function (time) {
        self.playerOnProgress(time);
      }, function (error, err) {
        self.playerOnError(error, err);
      }, function () {
        self.playerOnEnded();
      });
    },

    setPlayerMetadata: function (type, id, url, item) {

      if (type == null && id == null && url == null && item == null) {
        if (this.playbackMetadata.type == "service") {
          var serviceTV = AppData.getServiceTV(this.playbackMetadata.id);
          // var liveEvent = AppData.getLiveEvent(serviceTV);
          // if (liveEvent != null) {
          // 	var nextEvent = AppData.getNextEvent(serviceTV, liveEvent);

          // }
          type = "service";
          id = this.playbackMetadata.id;
          url = this.playbackMetadata.url;
          item = serviceTV;
        } else {
          return;
        }
      }

      this.lastServiceIdPlayed = this.playbackMetadata.type == "service" ? this.playbackMetadata.id : null;
      this.playbackMetadata = { type: type, id: id, url: url, item: item };

      var titleTopText = "";
      var epgNowText = "";
      var epgNextText = "";
      var playerTime1Text = "";
      var playerTime2Text = "";
      var srcItemImage = "";
      var srcPlaceholder = "";
      var playerImageStyle = "";
      var showNext = false;
      var startTime = null;
      var endTime = null;
      var parentalRating = 0;
      var nextParentalRating = 0;

      if (type == "service") { //live

        titleTopText = item.lcn + " | " + item.name;
        srcItemImage = item.img;
        srcPlaceholder = item.img;

        if (item.backgroundColor != null && typeof item.backgroundColor != 'undefined') {
          playerImageStyle = " background-color: #" + item.backgroundColor;
        }

        var liveEvent = AppData.getLiveEvent(item);
        if (liveEvent != null) {
          var nextEvent = AppData.getNextEvent(item, liveEvent);

          epgNowText = "";
          epgNextText = "";
          playerTime1Text = "";
          playerTime2Text = "";

          if (liveEvent != null) {
            $("#nowEventLabel").html(getStringDate(liveEvent.startDate, "HH:mm") + ": " + (liveEvent.languages.length > 0 ? liveEvent.languages[0].title : ""));
            epgNowText = __("EPGAtThisTime") + ": " + (liveEvent.languages.length > 0 ? liveEvent.languages[0].title : "");
            playerTime1Text = getStringDate(liveEvent.startDate, "HH:mm") + " - " + getStringDate(liveEvent.endDate, "HH:mm");
            parentalRating = liveEvent.parentalRating || 0;
          } else {
            $("#nowEventLabel").html(__("EPGItemNoData"));
          }

          if (nextEvent != null) {
            $("#nextEventLabel").html(getStringDate(nextEvent.startDate, "HH:mm") + ": " + (nextEvent.languages.length > 0 ? nextEvent.languages[0].title : ""));
            epgNextText = __("EPGNext") + ": " + (nextEvent.languages.length > 0 ? nextEvent.languages[0].title : "");
            playerTime2Text = getStringDate(nextEvent.startDate, "HH:mm") + " - " + getStringDate(nextEvent.endDate, "HH:mm");
            nextParentalRating = nextEvent.parentalRating || 0; // ✅ Rating del próximo evento
          } else {
            $("#nextEventLabel").html(__("EPGItemNoData"));
          }

          srcItemImage = item.img;// liveEvent.imageUrl <= to display the event image
          startTime = liveEvent.startDate;
          endTime = liveEvent.endDate;
        } else {
          epgNowText = __("EPGAtThisTime") + ": " + __("EPGItemNoData");
          epgNextText = __("EPGNext") + ": " + __("EPGItemNoData");
        }
      } else if (type == "catchup-event") {
        var group = AppData.getCatchupGroup(item.catchupGroupId);
        titleTopText = group.lcn + " | " + group.name;

        //titleTopText = item.name;
        playerTime1Text = getStringDate(item.startDate, "HH:mm") + " - " + getStringDate(item.endDate, "HH:mm");
        srcItemImage = item.imageUrl;
        srcPlaceholder = group.img;
        parentalRating = item.parentalRating || 0;

        if (group.background != null && typeof group.background != 'undefined') {
          playerImageStyle = " background-color: #" + group.background;
        }

        epgNowText = item.name;
        //epgNextText = "next catchup";
        startTime = item.startDate;
        endTime = item.endDate;
      } else if (type == "vod") {
        titleTopText = item.name;

        if (item.isSeries) {
          var season = item.seasons.filter(function (season) { return season.id == item.currentSeasonId });
          if (season.length > 0) {
            season = season[0];
            var episode = season.episodes.filter(function (episode) { return episode.id == item.currentEpisodeId });
            if (episode.length > 0) {
              titleTopText += " - " + episode[0].name;
            }
          }

          showNext = AppData.getNextEpisode(item, item.currentSeasonId, item.currentEpisodeId) != null;
        }
        img = item.extraImageURL;
        srcItemImage = img;
        srcPlaceholder = null;
      }

      var playerMetadata = {
        type: type,
        titleTop: titleTopText,
        epgNow: epgNowText,
        epgNext: epgNextText,
        time1: playerTime1Text,
        time2: playerTime2Text,
        epgImageSrc: srcItemImage,
        epgImageStyle: playerImageStyle,
        epgImagePlaceholder: srcPlaceholder,
        showNext: showNext,
        startTime: startTime,
        endTime: endTime,
        parentalRating: parentalRating,
        nextParentalRating: nextParentalRating
      };

      nbPlayer.setPlayerMetadata(playerMetadata);
    },

    eventWhenCurrentLiveEnd: function () {
      this.setPlayerMetadata(this.playbackMetadata.type, this.playbackMetadata.id, this.playbackMetadata.url, this.playbackMetadata.item);
    },

    playerOnProgress: function (time) {
      if (!nbPlayer.isPaused() && parseInt(this.lastPlaybackTime) == time) {
        return;
      }

      this.lastPlaybackTime = time

      //every 15 seconds save vod history
      if (this.playbackMetadata.type == "vod" && time % 15 == 0) {
        User.setVideoHistoryFor({ type: this.playbackMetadata.type, id: this.playbackMetadata.id, time: time });
      }
    },

    isPlayerNetworkError: function (error, err) {
      if (err && (err.code === 2 || err.code === "2")) {
        return true;
      }
      if (err && err.message && /networkError|levelLoadError|NETWORK/i.test(err.message)) {
        return true;
      }
      if (error && /network|levelLoad/i.test(String(error))) {
        return true;
      }
      return false;
    },

    playerOnError: function (error, err) {
      if (this.catchingError) {
        return;
      }

      this.catchingError = true;
      console.log("NBPlayer error: ");
      console.log(err);

      if (this.isPlayerNetworkError(error, err)) {
        this.NBPLAYER_RETRY_AFTER_ERROR = false;
        this.resetNbPlayerRetryTimeout(true);
        this.goOffline();
      } else if (this.NBPLAYER_RETRY_AFTER_ERROR) {
        this.retryPlayCurrentContent(error);
      }

      var self = this;
      setTimeout(function() {
        self.catchingError = false;
      }, 2000);

    },

    playerOnEnded: function () {
      console.log("NBPlayer playback ended");

      // Telemetria: fin NATURAL (vod_finished/catchup_finished en vez de
      // stopped_prematurely). Debe llamarse antes de cualquier
      // playContent()/playNextCatchup() posterior, que ya arranca un nuevo
      // "current" y cerraria este como prematuro si todavia estuviera abierto.
      Telemetry.stopCurrent({ finished: true, timeIndex: this.lastPlaybackTime });

      if (this.playbackMetadata.type == "service") {
        this.eventWhenCurrentLiveEnd();
      } else {
        User.setVideoHistoryFor({ type: this.playbackMetadata.type, id: this.playbackMetadata.id, time: 0 });
        var currentType = this.playbackMetadata.type;

        if (currentType == "catchup-event") {
          var currentId = this.playbackMetadata.id;
          this.playbackMetadata = { type: '', id: '', url: '', item: '' };
          nbPlayer.nbPlayerResetContent(false);
          this.playNextCatchup(currentId);
        } else {
          nbPlayer.nbPlayerResetContent(true);
          Focus.to(this.$videoContainer);
          this.playbackMetadata = { type: '', id: '', url: '', item: '' };
        }
      }
    },

    playNextPrevServiceTV: function (next) {
      if (InactivityManager.isShown()) {
        return;
      }

      // Verificar si EPGDetails está abierto y cerrarlo si es necesario
      if (EPGDetails.isShowed()) {
        EPGDetails.close();
        // Esperar un momento para que el modal se cierre completamente
        var self = this;
        setTimeout(function() {
          self.playNextPrevServiceTV(next);
        }, 100);
        return;
      }

      var currentId = null;
      if (ParentalControlDlg.isShowed() && ParentalControlDlg.contentType && ParentalControlDlg.contentType == "service") {
        currentId = ParentalControlDlg.contentObject.id;
        ParentalControlDlg.close(null);
      } else if (this.playbackMetadata && this.playbackMetadata.type == "service") {
        currentId = this.playbackMetadata.id;
      } else if (PlayerFallback.isShown() && PlayerFallback.contentType == "service" && PlayerFallback.contentObject) {
        currentId = PlayerFallback.contentObject.id;
      } else if (this.lastServiceIdPlayed) {
        // Fallback: usar el último servicio reproducido si playbackMetadata no está disponible
        currentId = this.lastServiceIdPlayed;
      }

      if (currentId) {
        var currentService = AppData.getServiceTV(currentId);
        var newChannel = AppData.getNextPrevServiceTV(currentService, next);
        this.playServiceTVByChannel(newChannel);
      }
    },

    focusServiceTV: function (serviceTV, updateFocus) {

      if (updateFocus) {
        var $newFocus = this.$tvChannelsRow.find("[data-id='" + serviceTV.id + "']");
        if ($newFocus.length > 0) {
          Focus.to($newFocus);
          $newFocus.parent().focus();
        }
      }

      this.$infoEpg.addClass("hidden");
      this.$infoServices.removeClass("hidden");
      this.$menuTitle.addClass("hidden");
      this.$channelInfoDiv.removeClass("hidden");

      this.$channelLcnLabel.html(serviceTV.lcn);
      this.$channelNameLabel.html(serviceTV.name);
      this.$nowEventLabel.html(__("EPGNoInformation"));
      this.$nextEventLabel.html(__("EPGNoInformation"));

      // Ocultar imagen del evento al cambiar de canal (solo si la bandera está habilitada)
      if (CONFIG.app.imageEventProgramPastEnabled) {
        this.$channelEventImageContainer.hide();
      }

      var self = this;
      this.setEpgTextInfo(serviceTV, __("EPGLoading"), __("EPGLoading"));

      AppData.getSimpleEpgByChannel(serviceTV.id, function () {
        console.log("EPG loaded for " + serviceTV.id);

        var liveEvent = AppData.getLiveEvent(serviceTV);
        if (liveEvent != null) {
          var nextEvent = AppData.getNextEvent(serviceTV, liveEvent);
          self.setEpgInfo(serviceTV, liveEvent, nextEvent);
          // self.preventPlayerReload = true;
          // self.eventWhenCurrentLiveEnd();
        } else {
          self.setEpgTextInfo(serviceTV, __("EPGItemNoData"), __("EPGItemNoData"));

        }
      });
    },

    setEpgTextInfo: function (channel, liveText, nextText) {
      if (Focus.focused.data("id") == Number(channel.id)) {
        this.$nowEventLabel.html(liveText);
        this.$nextEventLabel.html(nextText);

        // Ocultar imagen cuando no hay información EPG (solo si la bandera está habilitada)
        if (CONFIG.app.imageEventProgramPastEnabled) {
          if (liveText === __("EPGLoading") || liveText === __("EPGItemNoData")) {
            this.$channelEventImageContainer.hide();
          }
        }
      }

      this.updatePlayerMetadataIfNeeded(channel);
    },

    setEpgInfo: function (channel, liveEvent, nextEvent) {
      if (Focus.focused.data("id") == Number(channel.id)) {
        var $eventImageContainer = this.$channelEventImageContainer;
        var $eventImage = this.$channelEventImage;
        var imageEnabled = CONFIG.app.imageEventProgramPastEnabled || false;

        if (liveEvent != null) {
          var liveTitle = liveEvent.languages.length > 0 ? liveEvent.languages[0].title : "";
          var liveRating = this.getRatingIconHtml(liveEvent.parentalRating || 0);
          this.$nowEventLabel.html(getStringDate(liveEvent.startDate, "HH:mm") + ": " + liveTitle + " " + liveRating);

          // Mostrar imagen del evento en vivo solo si la bandera está habilitada
          if (imageEnabled) {
            if (liveEvent.imageUrl && liveEvent.imageUrl.length > 0) {
              // Usar loadImage si está disponible (similar a nbPlayer y EPGDetails)
              if ($eventImage.length > 0 && typeof $eventImage.loadImage === 'function') {
                $eventImage.loadImage(liveEvent.imageUrl, channel.img || "");
              } else {
                // Fallback: usar src directamente
                $eventImage.attr("src", liveEvent.imageUrl);
                $eventImage.attr("alt", liveTitle);
              }
              $eventImageContainer.show();
            } else {
              // Si no hay imagen, ocultar el contenedor
              $eventImageContainer.hide();
            }
          } else {
            // Si la bandera está deshabilitada, ocultar el contenedor
            $eventImageContainer.hide();
          }
        } else {
          this.$nowEventLabel.html(__("EPGItemNoData"));
          // Ocultar imagen si no hay evento
          if (imageEnabled) {
            $eventImageContainer.hide();
          }
        }

        if (nextEvent != null) {
          var nextTitle = nextEvent.languages.length > 0 ? nextEvent.languages[0].title : "";
          var nextRating = this.getRatingIconHtml(nextEvent.parentalRating || 0);
          this.$nextEventLabel.html(getStringDate(nextEvent.startDate, "HH:mm") + ": " + nextTitle + " " + nextRating);
        } else {
          this.$nextEventLabel.html(__("EPGItemNoData"));
        }
      }

      //update player metadata if needed
      this.updatePlayerMetadataIfNeeded(channel);
    },

    updatePlayerMetadataIfNeeded: function (channel) {
      //update player metadata if needed
      if (this.playbackMetadata && this.playbackMetadata.type == "service" && (channel == null || this.playbackMetadata.id == channel.id)) {
        this.setPlayerMetadata();
        console.log("EPG player data updated for " + (channel != null ? channel.id : "{no channel}"));
      }
    },

    playPrevServiceTV: function () {

    },

    playLastServiceTVPlayed: function () {
      if (this.lastServiceIdPlayed != null && this.playbackMetadata && (this.playbackMetadata.type == "" || this.playbackMetadata.type == "service")) {
        var newChannel = AppData.getServiceTV(this.lastServiceIdPlayed);
        this.playServiceTVByChannel(newChannel);
      }
    },

    playServiceTVByChannel: function (newChannel) {
      if (typeof newChannel !== 'undefined' && newChannel != null) {
        console.log("Play channel: " + newChannel.lcn);
        this.focusServiceTV(newChannel, !nbPlayer.isFullscreen());
        this.playContentWithAccess("service", newChannel.id, newChannel.url, newChannel, true, false);
        // if (nbPlayer.isFullscreen()) {
        // 	setTimeout(function() {
        // 		nbPlayer.showControls();
        // 	}, 300);
        // }
      }
    },

    getNearBottomItem: function (near) {
      if (near > 100) {
        return this.$videoContainer;
      }
      var itemByPoint = document.elementFromPoint(40, (this.channelsGrid.offset().top + 40) + near);

      var $newFocus = $(itemByPoint).find(".focusable:first");
      if ($newFocus.length == 0) {
        $newFocus = $(itemByPoint).closest(".focusable");

        if ($newFocus.length == 0) {
          return this.getNearBottomItem(near + 20);
        }
      }
      return $newFocus;
    },

    restartFocus: function (playbackMetadataOverride) {
      if (VODDetail.isShowed()) {
        VODDetail.setFocus();
        return;
      } else if (VOD.isShowed && typeof VOD.isShowed === "function" && VOD.isShowed() && (!VODDetail.isShowed || !VODDetail.isShowed())) {
        // Si estamos en el listado de VOD, restaurar foco ahí (no en grid/home)
        var $vodFocus = (VOD.$lastVodFocused && VOD.$lastVodFocused.length > 0) ? VOD.$lastVodFocused : null;
        if (!$vodFocus || $vodFocus.length == 0 || !$vodFocus.is(":visible") || !$.contains(document, $vodFocus.get(0))) {
          $vodFocus = $("#vodList").find(".focusable:visible:first");
        }
        if (!$vodFocus || $vodFocus.length == 0) {
          $vodFocus = $("#divVideoContainer");
        }
        if ($vodFocus && $vodFocus.length > 0) {
          Focus.to($vodFocus);
        }
        return;
      } else {

        var metadata = playbackMetadataOverride || this.playbackMetadata;
        if (metadata) {
          if (metadata.type == "service" && metadata.item != null) {
            if (this.focusToChannelElement(metadata.item.id)) {
              return;
            }
          } else if (metadata.type == "catchup-event" && metadata.item != null) {
            if (this.focusToCatchupElement(metadata.item.catchupGroupId, metadata.item.eventId, metadata.item.startDate)) {
              return;
            }
          }
        }

        // Si el último contenido fue un VOD seleccionado desde Home, intentar restaurar ahí.
        if (this.lastVodSelected && this.lastVodSelected.id) {
          if (this.focusToVodElement(this.lastVodSelected.id, this.lastVodSelected.categoryId)) {
            return;
          }
        }

        var $candidate = this.$lastFocused;
        if (!$candidate || $candidate.length == 0 || !$candidate.is(":visible") || !$.contains(document, $candidate.get(0))) {
          $candidate = $("#channelsGrid").find(".focusable:visible:first");
        }
        if (!$candidate || $candidate.length == 0) {
          $candidate = $(".other-option:visible:first");
        }
        if (!$candidate || $candidate.length == 0) {
          $candidate = this.$videoContainer;
        }
        if ($candidate && $candidate.length > 0) {
          Focus.to($candidate);
        }

      }
    },

    focusToVodElement: function (vodId, categoryId) {
      var $grid = $("#channelsGrid");
      if ($grid.length == 0) {
        return false;
      }

      var selector = ".channel-video.vod-list.focusable[data-type='vod'][data-id='" + vodId + "']";
      if (typeof categoryId !== "undefined" && categoryId !== null && categoryId !== "") {
        selector += "[data-category-id='" + categoryId + "']";
      }

      var $vod = $grid.find(selector + ":visible:first");
      if ($vod.length == 0) {
        $vod = $grid.find(".channel-video.vod-list.focusable[data-type='vod'][data-id='" + vodId + "']:visible:first");
      }
      if ($vod.length == 0) {
        return false;
      }

      var $row = $vod.closest(".channels-div");
      if ($row.length > 0) {
        $grid.scrollTop($grid.scrollTop() + $row.position().top);
      }

      var $hs = $vod.closest(".horizontal-slide");
      if ($hs.length > 0) {
        var left = $vod.position().left;
        var right = left + $vod.outerWidth(true);
        var width = $hs.width();
        if (right > width) {
          $hs.scrollLeft($hs.scrollLeft() + (right - width) + 20);
        } else if (left < 0) {
          $hs.scrollLeft($hs.scrollLeft() + left - 20);
        }
      }

      Focus.to($vod);
      return true;
    },

    focusToChannelElement: function (channelId) {
      var channel = AppData.getServiceTV(channelId);
      if (channel != null) {
        var bouquetIds = channel.bouquetIds;
        for (var i = 0; i < bouquetIds.length; i++) {
          var $bouquet = this.channelsGrid.find(".div-bouquet[data-id='" + bouquetIds[i] + "']");

          if ($bouquet.length > 0) {
            var $horizontalSlide = $bouquet.find('.horizontal-slide');
            var $channel = $horizontalSlide.find('.channel-video[data-id="' + channel.id + '"]:first');

            if ($channel.length > 0) {
              this.channelsGrid.scrollTop(this.channelsGrid.scrollTop() + $bouquet.position().top);
              $horizontalSlide.scrollLeft($channel.position().left);

              // Check if channel is visible in viewport
              var channelRight = $channel.position().left + $channel.width();
              var containerWidth = $horizontalSlide.width();

              if (channelRight > containerWidth) {
                // Channel is off screen to the right, adjust scroll
                $horizontalSlide.scrollLeft($channel.position().left - containerWidth + $channel.width());
              } else if ($channel.position().left < 0) {
                // Channel is off screen to the left, scroll to it
                $horizontalSlide.scrollLeft($channel.position().left);
              }

              Focus.to($channel);
              return true;
            }
          }
        }
      }

      return false;
    },

    focusToCatchupElement: function (catchupGroupId, catchupId, catchupStartDate) {
      var catchupDate = catchupStartDate.local().format("YYYY-MM-DD");
      var catchup = AppData.getCatchup(catchupGroupId);
      this.openCatchupCell(catchup);
      this.openCatchupDate(catchup, catchupDate);

      var $catchupsRow = $("#catchupsRow");
      if ($catchupsRow.length > 0) {
        this.channelsGrid.scrollTop(this.channelsGrid.scrollTop() + $catchupsRow.position().top);
      }

      var $rowCatchupEvents = $("#catchupsRow").find(".row-catchup-events:first");
      var $catchupEvent = $rowCatchupEvents.find(".focusable[data-id='" + catchupId + "']:first");

      if ($catchupEvent.length > 0) {
        var eventRight = $catchupEvent.position().left + $catchupEvent.width();
        var containerWidth = $rowCatchupEvents.width();

        if (eventRight > containerWidth) {
          $rowCatchupEvents.scrollLeft($catchupEvent.position().left - containerWidth + $catchupEvent.width());
        } else if ($catchupEvent.position().left < 0) {
          $rowCatchupEvents.scrollLeft($catchupEvent.position().left);
        }

        Focus.to($catchupEvent);
        return true;
      }

      return false;
    },

    setMenuTitle: function (title) {
      $("#channelInfoDiv").addClass("hidden");
      $("#menuTitle").removeClass("hidden");
      $("#menuSelectedLabel").text(title);
    },

    setFavoritesRow: function () {
      var $favoritesRow = $("#favoritesRow");
      var favorites = AppData.getServicesTVFavoritedAsChannels();
      var $html = "";

      if (favorites != null) {
        $html = this.getHTMLRowChannel(favorites, favorites.name);
        $favoritesRow.html($html);
        $favoritesRow.removeClass("hidden");
      } else if ($favoritesRow.length > 0) {
        $favoritesRow.empty();
        $favoritesRow.addClass("hidden");
      }
    },

    retryPlayCurrentContent: function (error) {
      if (!this.NBPLAYER_RETRY_AFTER_ERROR) { return; }

      var self = this;
      var delay = 0;
      if (this.nbPlayerAttempts <= 6) {
        delay = 3;
      } else if (this.nbPlayerAttempts > 6 && this.nbPlayerAttempts <= 10) {
        delay = 10;
      } else {
        delay = 20;
      }

      if (this.nbPlayerRetryTimeout == null && !this.verifyingUserSession) {
        var lastTime = this.lastPlaybackTime;
        var metadata = this.playbackMetadata;
        //this.resetPlayerContent(false, null, null, null);

        //$("#mainVideo").addClass("vjs-waiting");
        if (this.nbPlayerAttempts % 3 == 0) {
          this.verifyUserSession(false, function (success, errorCode) {
            if (success) {
              self.lastPlaybackTime = lastTime;
              //TODO: call AppData.getTopLevelCatchupM3u8Url to get the correct URL when playing service TV
              self.retryPlayCurrentContentWithDelay(delay, metadata);
            } else if (errorCode === "license_already_in_use") {
              self.licenseEnded();
            } else if (self.isSessionNetworkError(errorCode)) {
              self.goOffline();
            } else {
              self.lastPlaybackTime = lastTime;
              self.retryPlayCurrentContentWithDelay(delay, metadata);
            }
          });
        } else {
          self.lastPlaybackTime = lastTime;
          this.retryPlayCurrentContentWithDelay(delay, metadata);
        }
      }

    },

    licenseEnded: function () {
      //Exit from fullscreen removed to avoid issues when license is lost
      // if (nbPlayer.isFullscreen()) {
      //   this.onReturnFullscreen();
      // }
      this.NBPLAYER_RETRY_AFTER_ERROR = false;
      var self = this;
      NbNetworkObserver.simpleCheckInternetConnection(function () {
        self.$el.showAlertConfirm(__("SettingsLicenseUsedContinueHere"), "license_already_in_use", null, null, null);
      }, function () {
        self.goOffline();
      });
    },

    activateLicense: function (activate) {
      var self = this;
      if (activate) {
        LoginHelper.reactivateLicense(false, function (success) {
          if (success && self.playbackMetadata != null) {
            self.forcePlayback = true;
            self.playContent(self.playbackMetadata.type, self.playbackMetadata.item.id, self.playbackMetadata.url, self.playbackMetadata.item, false);
          } else {
            nbPlayer.nbPlayerResetContent();
          }
        });
        // this.verifyUserSession(true, function (success) {
        //   if (success && self.playbackMetadata != null) {
        //     self.forcePlayback = true;
        //     self.playContent(self.playbackMetadata.type, self.playbackMetadata.item.id, self.playbackMetadata.item.url, self.playbackMetadata.item, false);
        //   } else {
        //     nbPlayer.nbPlayerResetContent();
        //   }
        // });
      } else {
        //clear player content
        this.resetPlayerContent(true, __("PlayerNoVideoSelected"), self.playbackMetadata.type, self.playbackMetadata.item);
      }
    },

    retryPlayCurrentContentWithDelay: function (delay, metadata) {
      var self = this;

      $("#mainVideo").addClass("vjs-waiting");
      var lastTime = self.lastPlaybackTime;
      this.nbPlayerRetryTimeout = setTimeout(function () {

        if (self.isPlayerDisabled()) {
          self.resetNbPlayerRetryTimeout(true);
          return;
        }

        if (metadata.type == "service") {
          console.log("NBPlayer retry playback (after " + delay + " seconds) attempt " + self.nbPlayerAttempts);
          /*nbPlayer.$player.src({
            type: 'application/x-mpegURL',
            src: metadata.url
          });
          */
          self.forcePlayback = true;
          self.playContent(metadata.type, metadata.id, metadata.url, metadata.item, false, true);
          //nbPlayer.$player.play();
        } else if (metadata.type == "vod" || metadata.type == "catchup-event") {

          self.autoSeek = true;
          /*console.log("NBPlayer retry playback (after " + delay + " seconds) attempt " + self.nbPlayerAttempts);
          nbPlayer.$player.src({
            type: 'application/x-mpegURL',
            src: metadata.url
          });*/
          self.forcePlayback = true;
          self.lastPlaybackTime = lastTime;
          self.playContent(metadata.type, metadata.id, metadata.url, metadata.item, false, true);
          /*if (self.autoSeek && self.lastPlaybackTime > 0) {
            nbPlayer.$player.currentTime(self.lastPlaybackTime);
            self.autoSeek = false;
            self.lastPlaybackTime = 0;
          }*/
          //nbPlayer.$player.play();
        }
        self.nbPlayerAttempts++;
      }, delay * 1000);
    },

    resetNbPlayerRetryTimeout: function (resetAttempts) {
      if (!this.NBPLAYER_RETRY_AFTER_ERROR) { return; }

      if (resetAttempts) {
        this.nbPlayerAttempts = 0;
      }
      if (this.nbPlayerRetryTimeout != null) {
        clearTimeout(this.nbPlayerRetryTimeout);
        this.nbPlayerRetryTimeout = null;
      }
    },

    verifyUserSession: function (forceActivate, callback) {
      var self = this;
      if (User.hasCredentialsLicense()) {
        // var self = this;
        // var license = User.getLicense();
        // var pin = User.getLicensePin();
        this.verifyingUserSession = true;

        LoginHelper.checkSessionAndReactivateIfNeeded(!forceActivate, function (success, errorCode) {
          self.verifyingUserSession = false;
          callback(success, errorCode);
        });

        // cv.activateStreamingLicense(license, pin, !forceActivate, function () {
        //   self.verifyingUserSession = false;
        //   callback(true);
        // }, function () {
        //   self.verifyingUserSession = false;
        //   callback(false);
        // });
      }
    },

    playEpisode: function (vodId, episodeObject) {
      var vodObject = AppData.getVodObject(vodId);

      if (vodObject != null) {
        var item = JSON.parse(JSON.stringify(vodObject));
        var self = this;

        AppData.getTopLevelVodM3u8Url(episodeObject.id, function (url) {
          console.log("Play vod with URL: " + url);
          if (url != null && url.length > 0) {
            item.currentVodObjectId = vodId;
            item.currentSeasonId = episodeObject.seasonId;
            item.currentEpisodeId = episodeObject.id;
            self.playContent("vod", episodeObject.id, url, item, false, false);
          }
        });
      }
    },

    goOnline: function () {
      if (Router.isSceneActive("offline")) {
        return;
      }
      this.NBPLAYER_RETRY_AFTER_ERROR = true;
    },

    // Cierra cualquier overlay/modal que pueda estar abierto sobre Home
    // (buscador, detalle de EPG, guía de canales, VOD, detalle de VOD),
    // dejándolos en un estado limpio para reabrirse más tarde.
    //
    // Por qué existe: ocultar this.$el (goOffline, o cualquier otro punto
    // que esconda la escena completa) NO cierra por sí solo lo que hay
    // adentro. Estos overlays viven dentro de #scene-home y sólo se
    // muestran/ocultan alternando su propio display/clase -- si el padre
    // se oculta sin que ellos pasen por su propio hide()/close(), quedan
    // con su estado interno "abierto" (EPGCards/EPG con su contenedor en
    // display:block, EPGDetails con la clase "in", etc.). Al volver a
    // mostrar #scene-home (ej. al regresar de la escena offline), esos
    // overlays reaparecen exactamente como quedaron -- una guía de canales
    // "fantasma" superpuesta, desincronizada del resto de la app y sin
    // recibir foco/teclado (que ya está siendo enrutado a lo que la app
    // decidió mostrar) -- lo que se percibe como que la aplicación se
    // bloqueó por completo.
    //
    // Orden: de más anidado a menos anidado. Se usa hide()/close()
    // puntuales (no onReturn(), que tiene semántica de "un paso atrás" y en
    // VOD/VODDetail exige un callback obligatorio; y no reset(), que en
    // EPGCards/EPG también descarta los datos ya cargados sin necesidad).
    closeAllOverlays: function () {
      if (typeof Search !== 'undefined' && Search.isOpen && Search.isOpen()) {
        Search.hide();
      }

      // EPGDetails vive anidado dentro de EPGCards/EPG: cerrarlo antes del
      // contenedor padre, porque ninguno de los dos se cierra a sí mismo.
      if (typeof EPGDetails !== 'undefined' && EPGDetails.isShowed && EPGDetails.isShowed()) {
        EPGDetails.close();
      }

      var epgModule = this.getConfiguredEpgModule();
      if (epgModule && epgModule.isShowed && typeof epgModule.isShowed === 'function' && epgModule.isShowed()) {
        epgModule.hide();
      }

      if (typeof VOD !== 'undefined' && VOD.isShowed && VOD.isShowed()) {
        VOD.hide();
      }

      if (typeof VODDetail !== 'undefined' && VODDetail.isShowed && VODDetail.isShowed()) {
        VODDetail.hide();
      }
    },

    goOffline: function () {
      if (Router.isSceneActive("offline") || this.goingOffline) {
        return;
      }

      this.goingOffline = true;
      this.NBPLAYER_RETRY_AFTER_ERROR = false;
      this.dontRedraw = true;
      this.resetNbPlayerRetryTimeout(true);
      NbNetworkObserver.stopObserver();
      NbNetworkObserver.currentStatus = NbNetworkObserver.offlineStatus;
      nbPlayer.$player.reset();

      if (nbPlayer.isFullscreen()) {
        this.onReturnFullscreen();
      }

      this.closeAllOverlays();

      this.preserveOnDeactivate = true;
      this.$el.hide();
      this.isVisible = false;

      var self = this;
      Router.go("offline").then(function () {
        self.goingOffline = false;
      }).catch(function () {
        self.goingOffline = false;
      });
    },

    destroyScene: function () {
      // Detener el ticker de actionMinute() al salir de Home (logout/cambio
      // de usuario) para no dejarlo corriendo en segundo plano.
      if (this.timeIntervalApp) {
        clearInterval(this.timeIntervalApp);
        this.timeIntervalApp = null;
      }
      // Punto 30: mismo criterio -- el polling de OSM tampoco debe seguir
      // corriendo después de un logout/cambio de usuario.
      if (this.osmsEnabled) {
        Osms.stopPolling();
      }
      nbPlayer.$player.reset();
      // Pasar true para limpiar completamente (incluyendo EPG) cuando es logout/cambio de usuario
      AppData.clearData(true);
      this.getConfiguredEpgModule().reset();
      VOD.reset();
      VODDetail.reset();
      Router.clearHistory();
      Router.go('login');
      Scene_Login.prototype.showForm("", "", true, true);
    },

    playNextCatchup: function (currentEventId) {
      var catchup = AppData.getNextCatchup(currentEventId);
      var self = this;

      if (catchup && catchup != null) {
        AppData.getTopLevelCatchupM3u8Url(catchup.id, function (url) {
          console.log("Play CATCHUP with URL: " + url);
          if (url != null && url.length > 0) {
            self.playContentWithAccess("catchup-event", catchup.eventId, url, catchup, true, false);
          } else {
            nbPlayer.nbPlayerResetContent(true);
            Focus.to(self.$videoContainer);
          }
        });
      } else {
        nbPlayer.nbPlayerResetContent(true);
        Focus.to(this.$videoContainer);
      }
    },

    keyRedAction: function () {
      // go to Home
      var screen = this.getCurrentScreen();

      if (screen == "fullscreen" || screen == "epg" || screen == "vod" || screen == "alertconfirm" || screen == "alertmessage") {
        this.onReturn(Focus.focused, null);
      } else if (screen == "voddetail") {
        var self = this;
        VODDetail.onReturn(function () {
          Focus.to(self.$lastFocused);
          if (self.getCurrentScreen() != "home") {
            self.onReturn(Focus.focused, null);
          }
        });
      }

    },

    keyGreenAction: function () {
      // go to catchups
      this.focusToCatchupRow();
    },

    keyYellowAction: function () {
      // go to VOD
      var screen = this.getCurrentScreen();

      if (screen == "vod") {
        return;
      } if (screen == "fullscreen" || screen == "epg" || screen == "alertconfirm" || screen == "alertmessage") {
        this.onReturn(Focus.focused, null);
      } else if (screen == "voddetail") {
        var self = this;
        VODDetail.onReturn(function () {
          Focus.to(self.$lastFocused);
          self.focusToVodRow();
        });
        return;
      }

      this.focusToVodRow();
    },

    keyBlueAction: function () {
      // go to previous channel played
      this.playLastServiceTVPlayed();
    },

    getCurrentScreen: function () {
      if (!this.isActive) {
        return "";
      }

      var $el = Focus.focused;
      if (nbPlayer.isFullscreen()) {
        return "fullscreen";
      } else if (this.getVisibleEpgModule()) {
        // Antes: `EPGCards.isShown` (typo de `isShowed`) hacía que esta
        // condición nunca fuera verdadera en modo tarjetas, por lo que
        // getCurrentScreen() reportaba "home" en vez de "epg" mientras se
        // veía la guía en modo EPGCards (afectaba keyRedAction/keyYellowAction).
        return "epg";
      } else if (VOD.isShowed() && !VODDetail.isShowed()) {
        return "vod"
      } else if (VODDetail.isShowed()) {
        return "voddetail";
      } else if ($el.isInAlertConfirm(this.$el)) {
        return "alertconfirm";
      } else if ($el.isInAlertMessage(this.$el)) {
        return "alertmessage";
      } else {
        return "home";
      }
    },

    focusToCatchupRow: function () {
      var $catchupsRow = $("#catchupsRow");
      if ($catchupsRow.is(":visible")) {
        var $focusTo = $catchupsRow.find(".focusable:first");
        if ($focusTo != null && $focusTo.length > 0) {
          this.channelsGrid.scrollTop(this.channelsGrid.scrollTop() + $catchupsRow.position().top);
          Focus.to($focusTo);
        }
      }
    },

    focusToVodRow: function () {
      var $row = $("#vodRow");
      if ($row.is(":visible")) {
        var $focusTo = $row.find(".focusable:first");
        if ($focusTo != null && $focusTo.length > 0) {
          this.channelsGrid.scrollTop(this.channelsGrid.scrollTop() + $row.position().top);
          Focus.to($focusTo);
        }
      }
    },

    keyNumberAction: function (number) {
      if (this.playbackMetadata && this.playbackMetadata.type != "service") {
        return;
      }

      var $focused = Focus.focused;
      if ($focused.isInAlertInput(this.$el)) {
        return;
      }

      var label = $(".channel-number-indicator").find("span:first");
      var newChannelNumber = Number(label.text() + number) || 0;
      label.html(newChannelNumber);
      label.show();

      var self = this;
      clearInterval(this.changeChannelTimer);
      this.changeChannelTimer = setTimeout(function () {
        self.changeChannelByNumber(newChannelNumber);
      }, self.changeChannelWait);
    },

    changeChannelByNumber: function (number) {
      $(".channel-number-indicator").find("span:first").empty();
      $(".channel-number-indicator").find("span:first").hide();

      var channel = AppData.getServiceTVByChannelNumber(number);
      if (channel != false) {
        this.playServiceTVByChannel(channel);
      }
    },

    updateStepLoad: function (step) {
      console.log("StepLoad changed from " + this.stepLoad + " to " + step);
      this.stepLoad = step;
    },

    openEPG: function () {
      if (this.stepLoad > 3) {
        // Guardar el foco actual antes de abrir la EPG
        this.$lastFocused = Focus.focused;

        var epgModule = this.getConfiguredEpgModule();
        if (this.useCards) {
          epgModule.homeObject = this;
        }
        epgModule.show();
      } else {
        this.$el.showAlertMessage(__("EPGLoadingPleaseWait"), "epgloading", __("SettingsOkButton").toUpperCase());
      }
    },

    checkParentalControl: function (type, id, url, item, reset, forceFullscreen) {
      var self = this;
      var requirePin = false;
      if (type == "service" && ((typeof item.parentalControl != 'undefined' && item.parentalControl) || User.hasServiceTVLocked(id))) {
        requirePin = true;
      } else if (type == "catchup-event" && item.catchupGroupId) {
        var serviceTV = AppData.getServiceTVByCatchupObj(item);
        if (serviceTV.parentalControl || User.hasServiceTVLocked(serviceTV.id)) {
          requirePin = true;
        }
      }

      if (requirePin) {
        this.$lastFocused = Focus.focused;
        var $container = nbPlayer.isFullscreen() ? nbPlayer.$mainVideo : $(".common:first");
        ParentalControlDlg.show($container, this.$lastFocused, type, item, function () {
          self.playContent(type, id, url, item, reset, false);
        }, function() {
          self.resetPlayerContent(false, __("ChannelBlocked").replace("%s", item.name), type, item);
        });
      } else {
        this.playContent(type, id, url, item, reset, false);
        if (forceFullscreen) {
          this.goToFullscreen();
        }
      }

    },

    isPlayerDisabled: function() {
      if (!nbPlayer.isFullscreen() && !this.miniPlayerEnabled) {
        return true;
      }

      return false;
    },

    getRatingIconHtml: function(rating) {
    // Si la marca no tiene habilitado el rating, no mostramos nada
    if (!CONFIG.app.showRating) {
      return "";
    }

    var ratingValue = parseInt(rating) || 0;
    var iconClass = "";
    var ratingText = "";
    var bgColor = "";

    if (ratingValue === 0 || rating === null) {
      iconClass = "rating-libre";
      ratingText = "L";
      bgColor = "#00a651"; // Verde
    } else if (rating === 99){
      iconClsaa = "rating-al";
      ratingText = "AL";
      bgColor = "#00a651"; // Verde
    } else if (ratingValue > 16 && ratingValue <= 18) {
      iconClass = "rating-18";
      ratingText = "18";
      bgColor = "#000000"; // Negro
    } else if (ratingValue > 14 && ratingValue <= 16) {
      iconClass = "rating-16";
      ratingText = "16";
      bgColor = "#ec1d25"; // Rojo
    } else if (ratingValue > 12 && ratingValue <= 14) {
      iconClass = "rating-14";
      ratingText = "14";
      bgColor = "#f58220"; // Naranja
    } else if (ratingValue > 10 && ratingValue <= 12) {
      iconClass = "rating-12";
      ratingText = "12";
      bgColor = "#fbc115"; // Amarillo
    } else if (ratingValue > 9 && ratingValue <= 10) {
      iconClass = "rating-10";
      ratingText = "10";
      bgColor = "#0095da"; // Azul claro
    }

    return '<span class="parental-rating-badge ' + iconClass + '" style="'
      + 'display: inline-block; '
      + 'background: ' + bgColor + '; '
      + 'color: #fff; '
      + 'font-weight: bold; '
      + 'font-size: 0.9em; '
      + 'padding: 2px 6px; '
      + 'border-radius: 3px; '
      + 'min-width: 25px; '
      + 'text-align: center; '
      + 'border: 1px solid #fff; '
      + 'margin-left: 8px; '
      + 'vertical-align: middle;'
      + '">' + ratingText + '</span>';
    },

  });

  return Scene_Home;

})(Scene);
