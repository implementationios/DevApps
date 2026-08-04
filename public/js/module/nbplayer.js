// var nbControlsEnum = {
//     fullscreen: "vjs-fullscreen-control",
//     audio: "vjs-audio-button",
//     text: "vjs-subs-caps-button",
//     trackItem: "vjs-menu-item"
// }

$(function () {
  // video.min.js y videojs-hlsjs-plugin.js ahora se cargan de forma asíncrona
  // (ver public/index.html) para no bloquear el arranque de login/EPG. Se
  // espera a que terminen antes de llamar a videojs('mainVideo') en init().
  if (window.__videoJsReady && typeof window.__videoJsReady.then === 'function') {
    window.__videoJsReady.then(function () {
      nbPlayer.init();
    }).catch(function (err) {
      console.error('Error cargando Video.js / plugin HLS de forma diferida:', err);
      // Intentar igual, por si los scripts llegaron a cargar pese al error reportado.
      nbPlayer.init();
    });
  } else {
    // Fallback de compatibilidad si el loader asíncrono no está presente.
    nbPlayer.init();
  }
});

var nbPlayer = {
  name: 'nb-vjs',
  currentType: null,
  vodControlsEnum: null,
  type: {
    vod: "vod",
    service: "service",
    catchup: "catchup-event"
  },
  $player: null,
  $controlBar: null,
  $playPauseButton: null,
  $playIcon: null,
  $pauseIcon: null,
  $vodControls: null,
  $vodTracksDiv: null,
  $vodTracksButton: null,
  $nextEpisodeButton: null,
  $nextEpisodeButtonTooltip: null,
  $forwardXButton: null,
  $backXButton: null,
  $goToStartButton: null,
  $goToEpgButton: null,
  //$seekingButton: null,
  $nbControlBar: null,
  $seekbar: null,
  $seekbarBar: null,
  $itemImageImg: null,
  $itemImageDiv: null,
  $channel: null,
  $epgNowLabel: null,
  $epgNowTimeLabel: null,
  $epgNextLabel: null,
  $titleContentLabel: null,
  $titleContentLabelDefault: null,
  $titleContentLabelTop: null,
  $epgDataTr: null,
  $seekbarCurrentTime: null,
  $seekbarLeftTime: null,
  $backButton: null,
  $sideMenuButton: null,
  resetDelay: null,
  inactivityTimeout: null,
  defaultSkipSeconds: 10,
  startTime: null,
  endTime: null,
  duration: null,
  lastTime: 0,
  currentPercent: 0,
  isLive: false,
  callbackOnEnded: null,
  currentBrand: "",
  homeObject: null,
  $sideMenu: null,
  $sideMenuContainer: null,
  $infoButton: null,
  $favoriteButton: null,
  $unfavoriteButton: null,
  $lockButton: null,
  $unlockButton: null,
  $noLockIcon: null,
  $lockedIcon: null,
  $favoritedIcon: null,
  $addFavoriteIcon: null,
  $playerEpgDetails: null,
  sn: null,
  widthInitial: 0,
  heightInitial: 0,
  secondsSkipped: 0,
  skipTimeTimeout: null,
  sideMenuFocusTimeout: null,
  ignoredAudioTracks: [],
  ignoredTextTracks: [],
  isLG: false,
  $lastMenuItemFocused: null,
  vodRedesignOriginalParents: null,
  vodRedesignActive: false,

  init: function (successCallback) {

    this.currentBrand = CONFIG.app.brand;
    this.$container = $("#divVideoContainer");
    this.$player = videojs('mainVideo');
    this.$playerDiv = $(this.$player.el_);
    this.ignoredAudioTracks = ["SoundHandler"];
    this.ignoredTextTracks = ["SoundHandler"];
    this.isLG = Device.isLG || Device.isWEBOS;

    this.vodControlsEnum = {
      play: "play-pause",
      next: "next-episode",
      tracks: "tracks",
      back: "back",
      trackItem: "track-item",
      forwardX: 'forwardx',
      backX: 'backx',
      start: 'start',
      end: 'end',
      epg: 'epg',
      sideMenu: 'side-menu',
      favorite: "favorite",
      unfavorite: "unfavorite",
      lock: "lock",
      info: "info",
      seekbar: "seekbar",
      lock: "lock",
      unlock: "unlock",
    }

    // set initial player dimensions based on screen height
    this.heightInitial = $(window).height() * 0.3;
    this.widthInitial = (16 / 9 - 1) * this.heightInitial + this.heightInitial;
    this.$container.width(this.widthInitial);
    this.$container.height(this.heightInitial);

    // Antes esto forzaba el mismo alto en píxeles (calculado una sola vez
    // acá, en base al 30% del alto de ventana al arrancar la app) sobre
    // .parent() (.col-sm-4) y .parent().parent() -- que es el MISMO .row
    // que comparten header-row-info y col-right-logo en home.js. Como
    // header-row-info usa height:100% en su CSS, terminaba heredando un
    // alto pensado para encuadrar el video, incluso en marcas donde
    // CONFIG.app.miniPlayerEnabled es false y el mini player nunca se
    // muestra (el .col-sm-4 queda oculto, pero el .row seguía con este
    // alto fijo igual). Eso hacía ver desproporcionado el panel de
    // información/logo del header, independientemente del ajuste de
    // anchos de home.js. Ahora solo se fuerza esta altura cuando el mini
    // player realmente se va a mostrar; si no, se deja que el .row use su
    // propio CSS (.header-row { height: 30% }) en vez de un valor
    // calculado una única vez para el video.
    if (CONFIG.app.miniPlayerEnabled !== false) {
      this.$container.parent().height(this.heightInitial + 5);
      this.$container.parent().parent().height(this.heightInitial + 5);
    }

    this.$container.find("#mainVideo").css({ "width": "100%", "height": "100%" });

    this.$container.find("#mainVideo").prepend("<div class='channel-number-indicator'><span></span></div>");

    this.$player.options_.inactivityTimeout = 0;
    this.$controlBar = this.$playerDiv.find(".vjs-control-bar:first");
    this.$controlBar.addClass(".hide-controls");
    this.$controlBar.find(".vjs-remaining-time").hide();

    //init VOD controls
    //this.$controlBar.append($("#nbVjsControlsTemplate").html());
    $("#nbVjsControlsTemplate").remove();

    this.$controlBar.append($("#matControlsTemplate").html());
    $("#matControlsTemplate").remove();

    //this.$seekbar = this.$controlBar.find(".vjs-play-progress:first");
    this.$seekbarContainer = this.$controlBar.find(".seekbar-container:first");
    this.$seekbar = this.$controlBar.find(".nb-seekbar:first");
    this.$seekbarBar = this.$seekbar.find("div:first");
    this.$itemImageDiv = this.$controlBar.find(".vjs-nb-item-image:first");
    this.$itemImageImg = this.$itemImageDiv.find("img:first");
    this.$vodControls = this.$controlBar.find(".mat-controls");

    //buttons
    this.$backButton = this.$vodControls.find("div[data-type='back']:first"); //regreso boton de back
    this.$sideMenuButton = this.$vodControls.find("div[data-type='side-menu']:first");
    this.$vodTracksButton = this.$vodControls.find("div[data-type='tracks']:first");
    this.$vodTracksDiv = this.$vodControls.find(".nb-vjs-tracks-div");
    this.$infoButton = this.$vodControls.find("div[data-type='info']:first");
    this.$goToStartButton = this.$vodControls.find("div[data-type='start']:first");
    this.$backXButton = this.$vodControls.find("div[data-type='backx']:first");
    this.$playPauseButton = this.$vodControls.find("div[data-type='play-pause']:first");
    this.$playIcon = this.$playPauseButton.find("span[data-type='play']:first");
    this.$pauseIcon = this.$playPauseButton.find("span[data-type='pause']:first");
    this.$forwardXButton = this.$vodControls.find("div[data-type='forwardx']:first");
    this.$goToEndButton = this.$vodControls.find("div[data-type='end']:first");
    this.$favoriteButton = this.$vodControls.find("div[data-type='favorite']:first");
    this.$unfavoriteButton = this.$vodControls.find("div[data-type='unfavorite']:first");
    this.$favoritedIcon = this.$playPauseButton.find("span[data-type='favorited']:first");
    this.$addFavoriteIcon = this.$playPauseButton.find("span[data-type='add-favorite']:first");
    this.$lockButton = this.$vodControls.find("div[data-type='lock']:first");
    this.$unlockButton = this.$vodControls.find("div[data-type='unlock']:first");
    this.$noLockIcon = this.$playPauseButton.find("span[data-type='no-lock']:first");
    this.$lockedIcon = this.$playPauseButton.find("span[data-type='locked']:first");
    this.$goToEpgButton = this.$vodControls.find("div[data-type='epg']:first");
    this.$nextEpisodeButton = this.$vodControls.find("div[data-type='next-episode']");

    //labels
    this.$epgNowLabel = this.$vodControls.find(".nb-vjs-epg-now:first");
    this.$epgNowTimeLabel = this.$vodControls.find(".nb-vjs-epg-now-time:first");
    this.$epgNextLabel = this.$vodControls.find(".nb-vjs-epg-next:first");
    // Título: por defecto el existente (bloque info)
    this.$titleContentLabelDefault = this.$vodControls.find(".nb-vjs-vod-title:first");
    // Título top (rediseño)
    this.$titleContentLabelTop = this.$vodControls.find(".nb-vjs-vod-title-top:first");
    this.$titleContentLabel = this.$titleContentLabelDefault;
    this.$epgDataTr = this.$vodControls.find(".nb-vjs-epg-data-tr:first");
    this.$seekbarCurrentTime = this.$controlBar.find(".nb-vjs-vod-current-time:first");
    this.$seekbarLeftTime = this.$controlBar.find(".nb-vjs-vod-duration:first");
    //this.$backButton = this.$controlBar.find(".nb-vjs-back-button:first");

    //add tooltips elements to each focusable items
    this.$vodControls.find(".mat-controls-item-control.focusable").append("<span class='nb-vjs-tooltip'></span>");

    //set default texts and values
    this.$vodTracksButton.find(".nb-vjs-tooltip").html(__("PlayerTracksSubtitlesTitle"));
    this.$nextEpisodeButton.find(".nb-vjs-tooltip").html(__("PlayerNextEpisodeTooltip"));
    this.$goToStartButton.find(".nb-vjs-tooltip").html(__("PlayerStartButtonTooltip"));
    this.$backXButton.find(".nb-vjs-tooltip").html(__("PlayerBackXButtonTooltip").replaceAll("%s", this.defaultSkipSeconds));
    this.$forwardXButton.find(".nb-vjs-tooltip").html(__("PlayerForwardXButtonTooltip").replaceAll("%s", this.defaultSkipSeconds));
    this.$goToStartButton.find(".nb-vjs-tooltip").html(__("PlayerStartButtonTooltip"));
    this.$goToEndButton.find(".nb-vjs-tooltip").html(__("PlayerEndButtonTooltip"));
    this.$vodControls.find(".nb-vjs-tracks-audio-title").html(__("PlayerTracksAudioTitle"));
    this.$vodControls.find(".nb-vjs-tracks-subtitles-title").html(__("PlayerTracksSubtitlesTitle"));
    this.$goToEpgButton.find(".nb-vjs-tooltip").html(__("EPGTitle"));
    this.$sideMenuButton.find(".nb-vjs-tooltip").html(__("PlayerChannelList"));
    this.$infoButton.find(".nb-vjs-tooltip").html(__("PlayerChannelInfo"));
    this.$favoriteButton.find(".nb-vjs-tooltip").html(__("PlayerFavorite"));
    this.$unfavoriteButton.find(".nb-vjs-tooltip").html(__("PlayerUnfavorite"));
    this.$lockButton.find(".nb-vjs-tooltip").html(__("PlayerLockChannel"));
    this.$unlockButton.find(".nb-vjs-tooltip").html(__("PlayerUnlockChannel"));

    $(".vjs-menu-item").addClass("focusable");

    var self = this;
    this.$player.on("pause", function () {
      self.$pauseIcon.hide();
      self.$playIcon.show();
    })

    this.$player.on("play", function () {
      self.$playIcon.hide();
      self.$pauseIcon.show();
    });

    //se adiciono este codigo para el fullscreen
    // this.$player.on('fullscreenchange', function () {
    //   setTimeout(function () {
    //     if (self.isFullscreen()) {
    //       $(self.$player.el_).find(".video-cover").hide();
    //       self.deactivateControls(false);
    //     } else {
    //       $(self.$player.el_).find(".video-cover").show();
    //       self.closeSideMenu();
    //       self.hideControls();
    //       self.deactivateControls(true);
    //     }
    //   }, 800);
    // });

    this.$playerDiv.parent().prepend('<div class="video-cover"></div>');

    if (successCallback != null && typeof successCallback != 'undefined') {
      successCallback();
    }

    this.$seekbar.click(function (e) {
      var newPercent = ((e.pageX - $(this).offset().left) / $(this).width());
      self.seekbarClicked(newPercent);
    });

    //hide original controls
    $(".vjs-progress-control").hide();
    $(".vjs-control-bar>div,.vjs-control-bar>button").css({ "visibility": "hidden" });
    this.$controlBar.find(".vjs-subs-caps-button").css({ "visibility": "hidden" });
    this.$controlBar.find(".vjs-audio-button").css({ "visibility": "hidden" });
    this.$controlBar.find(".vjs-current-time").css({ "visibility": "hidden" });
    this.$controlBar.find(".vjs-duration").css({ "visibility": "hidden" });

    this.$controlBar.addClass("nb-vjs-custom-controls-div");
    this.$vodControls.css({ "visibility": "visible" });
    this.$vodControls.show();

    var $mainVideo = this.$container.find("#mainVideo");
    if ($mainVideo.find(".side-menu-player-container").length == 0) {
      this.$container.find("#mainVideo").prepend("<div class='side-menu-player-container'><div class='side-menu-player'></div></div>");
      this.$sideMenuContainer = $mainVideo.find(".side-menu-player-container");
      this.$sideMenu = $mainVideo.find(".side-menu-player");
    }

    this.$mainVideo = $mainVideo;
    EPGDetails.init($mainVideo);
  },

  requestFullscreen: function () {
    //var self = this;
    this.$container.addClass("video_full");
    console.log(this.$container)
    //this.$player.requestFullscreen();
    this.showControls();
    //animated way (experimental)
    // var videoFull = {
    //   'width' : '100vw',
    //   'height' : '100vh',
    //   "border": "0px",
    //   "margin": "0",
    //   "left": "0",
    //   "top": "0",
    //   "object-position": "0%"
    // };

    // var self = this;
    // $('.video-container').addClass("video_full");
    // $('.video-container').animate(videoFull, 500, function () {
    //   self.showControls();
    // });
    // try {
    //   //this.deactivateControls(false);
    //   var self = this;
    //   this.$player.requestFullscreen();
    //   setTimeout(function () {
    //     self.showControls();
    //   }, 100);
    // } catch (e) { }

  },

  isPaused: function () {
    return this.$player.paused();
  },

  navigate: function ($focused, direction) {
    var $current = $focused;

    if (EPGDetails.isShowed()) {
      EPGDetails.navigate(direction);
      return;
    }

    if (ParentalControlDlg.isShowed()) {
      ParentalControlDlg.navigate(direction);
      return;
    }

    var $focusContainer = $current.parent(".mat-controls-item");
    // No depender de enums (a veces aún no están inicializados aquí)
    var isVOD = (this.currentType === "vod");

    //if ($focusContainer.length > 0 || $current.closest(".nb-vjs-tracks-div").length > 0) {
    if (!this.isSideMenuOpened()) {
      var $focusTo = [];
      var $nbVjsList = [];

      if (!this.nbPlayerAreControslActive()) {
        this.showControls();
        return;
      }

      if ((CONFIG.app.brand == "fotelka") && this.nbPlayerAreControslActive() && (direction == "up" || direction == "down") && !this.isTracksMenuOpened()) {
        if (direction == "up") {
          this.homeObject.channelUp();
        } else if (direction == "down") {
          this.homeObject.channelDown();
        }
        return;
      } else if ($current.is(this.$seekbar)) {
        if (direction == "left") {
          // Solo permitir seek con flechas en VOD (en Live/Catchup mantener navegación normal)
          if (isVOD) this.backXAction();
        } else if (direction == "right") {
          if (isVOD) this.forwardXAction();
        } else if (direction == "up") {
          // Volver a los botones solo para VOD
          if (isVOD) {
            // En rediseño, volver a la fila de playback (arriba del seekbar)
            if (this.vodRedesignActive) {
              var $playbackRow = this.$vodControls.find(".mat-controls-row.mat-controls-bottom:first");
              $focusTo = $playbackRow.find(".focusable:visible:first");
            }
            // Fallback clásico
            if (!$focusTo || $focusTo.length === 0) {
              $focusTo = this.$vodControls.find(".focusable:visible:first");
            }
          }
        }
      } else if (this.isTracksMenuOpened()) {
        $focusTo = this.navigateTracks($current, direction);
      } else if (isVOD && this.vodRedesignActive && $current.closest(".mat-controls-row").hasClass("mat-controls-bottom") && (direction == "down")) {
        // En rediseño: bajar desde fila de playback al seekbar
        if (this.$seekbar.is(":visible")) {
          $focusTo = this.$seekbar;
        }
      } else if (isVOD && this.vodRedesignActive && $current.closest(".mat-controls-row").hasClass("mat-controls-bottom") && (direction == "up")) {
        // En rediseño: subir desde fila de playback al botón back
        if (this.$backButton && this.$backButton.is(":visible")) {
          $focusTo = this.$backButton;
        }
      } else if (isVOD && $current.closest(".mat-controls-row").index() == 0 && (direction == "down")) {
        if (this.$seekbar.is(":visible")) {
          $focusTo = this.$seekbar;
        }
      } else {
        if (direction == "left") {
          $nbVjsList = $current.closest(".mat-controls-item").prevAll(".mat-controls-item:has(.focusable:visible)");
        } else if (direction == "right") {
          $nbVjsList = $current.closest(".mat-controls-item").nextAll(".mat-controls-item:has(.focusable:visible)");
        }

        if ($nbVjsList != null && $nbVjsList.length > 0) {
          $nbVjsList.each(function (idx, item) {
            var focusable = $(item).find(".focusable:visible:first");
            if (focusable.length > 0) {
              $focusTo = focusable;
              return false;
            }
          });
        }
      }

      if ($focusTo.length > 0) {
        $(".nb-vjs-tooltip").hide();
        // Permitir foco en seekbar SOLO en VOD (para habilitar avanzar/retroceder con flechas)
        if (!$focusTo.is(this.$seekbar) || isVOD) {
          this.setFocusTo($focusTo);
        }
      }

      this.resetAutoHideControls();
      return;
    } else if (this.isSideMenuOpened()) { //navigate on side menu
      if (direction == "up" || direction == "down") {
        if (direction == "down") {
          $focusTo = $current.next(".focusable:first");
        } else {
          $focusTo = $current.prev(".focusable:first");
        }
      }

      if ($focusTo.length > 0) {
        this.$lastMenuItemFocused = $focusTo;
        Focus.to($focusTo);
        this.setSideMenuScroll(false);
      }
    }

    this.resetAutoHideControls();
  },

  getFocused: function () {
    return Focus.focused;
  },

  setFocusTo: function ($el) {
    if ($el && $el.length > 0) {
      // Limpieza visual extra del seekbar (el CSS usa `.nb-seekbar .focus`)
      try {
        if (Focus.focused && this.$seekbar && Focus.focused.is(this.$seekbar)) {
          this.$seekbar.find("> div > div").removeClass("focus");
        }
      } catch (e) { }

      Focus.to($el);

      // Si el foco va al seekbar, marcar el "handle" interno para que se vea el foco
      try {
        if (this.$seekbar && $el.is(this.$seekbar)) {
          this.$seekbar.find("> div > div").addClass("focus");
        }
      } catch (e) { }
    }
  },

  manageOnEnter: function ($el, callbackNext, callbackRestartFocus, callbackGoToEpg) {

    if ($el.is(this.$container)) {
      if (this.isSideMenuOpened()) {
        this.closeSideMenu();
      }
      return;
    }

    $el = !$el || $el == null ? this.getFocused() : $el;
    console.log("nbPlayer: manageOnEnter");
    if (EPGDetails.isShowed()) {
      EPGDetails.onEnter($el);
      return;
    } else if (ParentalControlDlg.isShowed()) {
      ParentalControlDlg.onEnter($el);
      return;
    } else if (InactivityManager.isShown()) {
      InactivityManager.onEnter($el);
      return;
    } else if (this.isSideMenuOpened()) {
      console.log("nbPlayer: manageOnEnter this.isSideMenuOpened(): " + this.isSideMenuOpened());
      var id = this.getFocused().data("id");
      console.log("nbPlayer: manageOnEnter id: " + id);

      if (!id) {
        return;
      }
      var serviceTV = AppData.getServiceTV(id);
      this.homeObject.playServiceTVByChannel(serviceTV);
      // codigo para cerrar el menu latera cuando se selecciona un canal
      if (this.isSideMenuOpened() && CONFIG.app.brand === "fotelka") {
        this.closeSideMenu();
        return;
      }
    } else if (!this.nbPlayerAreControslActive()) {
      console.log("nbPlayer: manageOnEnter !this.nbPlayerAreControslActive(): " + !this.nbPlayerAreControslActive());
      this.showControls();
      this.focusOnFirstElement();
    } else {

      if (this.isTracksMenuOpened()) {
        this.closeTracks();
      }

      switch (this.vodPlayerGetControlType($el)) {
        case this.vodControlsEnum.play:
          if (this.isPaused()) {
            this.$player.play();
          } else {
            this.$player.pause();
          }
          break;
        case this.vodControlsEnum.next:
          callbackNext();
          break;
        case this.vodControlsEnum.tracks:
          var $first = this.openTracks();
          if ($first.length > 0) {
            Focus.to($first);
          }
          break;
        case this.vodControlsEnum.back:
          this.homeObject.onReturnFullscreen(Focus.focused, function() {

          });
          break;
        case this.vodControlsEnum.trackItem:
          this.selectTrack($el);
          break;
        case this.vodControlsEnum.backX:
          this.backXAction();
          break;
        case this.vodControlsEnum.forwardX:
          this.forwardXAction();
          break;
        case this.vodControlsEnum.start:
          this.start();
          break;
        case this.vodControlsEnum.end:
          this.end();
          break;
        case this.vodControlsEnum.sideMenu:
          this.openSideMenu();
          break;
        case this.vodControlsEnum.favorite:
          this.onFavorite();
          break;
        case this.vodControlsEnum.lock:
          this.onToggleLock();
          break;
        case this.vodControlsEnum.info:
          EPGDetails.show(this.$container.find("#mainVideo"), this.homeObject.playbackMetadata, this.homeObject, Focus.focused);
          break;
        case this.vodControlsEnum.epg:
          this.homeObject.onReturnFullscreen(Focus.focused, function() {
            callbackGoToEpg();
          });
          break;
      }
    }
  },

  playContent: function (type, url) {
    var self = this;
    console.log('nbPlayer: playContent called, type:', type, 'url:', url);
    
    this.$player.pause();
    this.nbPlayerResetContent();
    this.currentType = type;
    this.isLive = this.currentType == "service";
    
    console.log('nbPlayer: setting new source, currentType:', this.currentType, 'isLive:', this.isLive);
    
    this.$player.src({
      src: url,
      type: 'application/x-mpegURL',
    });

    this.$container.find(".video-cover").hide();
    this.$controlBar.addClass("nb-vjs-custom-controls-div");
    this.$vodControls.css({ "visibility": "visible" });
    this.$vodControls.show();

    this.seekbarLiveInitialTime = 0;
    this.seekbarLiveInitialDate = null;
    this.seekbarLiveSecondsLate = 0;

    this.$player.off('loadedmetadata');
    this.$player.on('loadedmetadata', function () {
      console.log('nbPlayer: loadedmetadata event fired');
      self.playerLoadedMetadata();
    });

    this.$player.off('loadeddata');
    this.$player.on('loadeddata', function () {
      console.log('nbPlayer: loadeddata event fired');
      self.playerLoaded();
    });

    // ✅ NUEVO: Configurar botones según tipo de contenido (reemplaza lógica inline anterior)
    this.setupButtonsForContentType();
  },

  playerLoaded: function () {

    this.seekbarLiveInitialTime = this.$player.currentTime();
    this.seekbarLiveInitialDate = this.getCurrentServerTime();
    
    console.log('nbPlayer: playerLoaded, currentType:', this.currentType);
    
    // ✅ Para Live TV, verificar tracks después de que el contenido se cargue
    // Para VOD/Catchup, también verificar con retry
    this.updateTracksButton();
  },

  playerLoadedMetadata: function () {
    var audio, subtitle;
    // var audio = User.getPlayerAudioLang();
    // var subtitle = User.getPlayerSubtitleLang();

    var serviceTV = this.getCurrentServiceTV();
    if (serviceTV == null) {
      return;
    }

    var data = User.getAudioAndSubtitle(serviceTV.epgStreamId);
    if (data && data.length > 0) {
      audio = data.length >= 1 ? data[0] : null;
      subtitle = data.length >= 2 ? data[1] : null;
    }

    //debugger;
    if (audio) {
      this.setAudioByProperty("label", audio);
    } else {
      audio = Device.getLanguageIso6392(); //get device language
      if (audio) {
        this.setAudioByProperty("language", audio);
      }
    }

    if (subtitle) {
      this.setSubtitleByProperty("label", subtitle);
    }
  },

  getPlayerAudioTracks: function () {
    try {
      if (!this.$player || !this.$player.audioTracks) {
        console.warn('nbPlayer: API de audioTracks no disponible');
        return [];
      }
      
      var tracks = this.$player.audioTracks();
      if (tracks && tracks.tracks_ && tracks.tracks_.length > 0) {
        var self = this;
        return tracks.tracks_.filter(function (track) {
          return self.ignoredAudioTracks.indexOf(track.label) < 0;
        });
      }
    } catch (e) {
      console.error('nbPlayer: Error obteniendo pistas de audio', e);
    }

    return [];
  },

  getPlayerTextTracks: function () {
    try {
      if (!this.$player || !this.$player.textTracks) {
        console.warn('nbPlayer: API de textTracks no disponible');
        return [];
      }
      
      var tracks = this.$player.textTracks();
      if (tracks && tracks.tracks_ && tracks.tracks_.length > 0) {
        var self = this;
        return tracks.tracks_.filter(function (track) {
          return self.ignoredTextTracks.indexOf(track.label) < 0;
        });
      }
    } catch (e) {
      console.error('nbPlayer: Error obteniendo pistas de texto', e);
    }

    return [];
  },

  clearTextTracks: function () {
    try {
      if (!this.$player || !this.$player.textTracks) {
        return;
      }
      
      var self = this;
      if (this.$player.textTracks().tracks_ && this.$player.textTracks().tracks_.length > 0) {
        console.log('nbPlayer: clearing', this.$player.textTracks().tracks_.length, 'text tracks');
        this.$player.textTracks().tracks_.forEach(function (track) {
          try {
            self.$player.textTracks().removeTrack(track);
          } catch (e) {
            console.warn('nbPlayer: error removing track', e);
          }
        });
      }
      
      // ✅ También limpiar audio tracks para evitar estado residual
      if (this.$player.audioTracks && this.$player.audioTracks().tracks_ && this.$player.audioTracks().tracks_.length > 0) {
        console.log('nbPlayer: clearing', this.$player.audioTracks().tracks_.length, 'audio tracks');
      }
    } catch (e) {
      console.error('nbPlayer: error in clearTextTracks', e);
    }
  },

  showSeekbar: function () {
    var seekbar = CONFIG.app.seekbarEnabled;
    var hasEpgData = this.startTime != null && this.endTime != null;

    console.log("nbPlayer: showSeekbar", "enabled:", seekbar, "hasEpg:", hasEpgData);

    if (seekbar && hasEpgData) {
      this.$seekbarContainer.show();
    } else {
      this.$seekbarContainer.hide();
    }
  },

  isVodRedesignEnabled: function () {
    return !!(CONFIG && CONFIG.app && CONFIG.app.vodRedesignEnabled);
  },

  setVodRedesignMode: function (enable) {
    // Solo aplica si existe el template nuevo (título top) y los controles están inicializados
    if (!this.$vodControls || this.$vodControls.length === 0) return;
    if (!this.$titleContentLabelTop || this.$titleContentLabelTop.length === 0) return;

    enable = !!enable;
    if (enable === this.vodRedesignActive) return;

    var $topRow = this.$vodControls.find(".mat-controls-row:first");
    var $bottomRow = this.$vodControls.find(".mat-controls-row.mat-controls-bottom:first");

    if (enable) {
      this.vodRedesignActive = true;
      this.$vodControls.addClass("vod-redesign");

      // Ocultar bloque de info VOD (EPG data)
      if (this.$epgDataTr) this.$epgDataTr.hide();
      if (this.$itemImageDiv) this.$itemImageDiv.hide();
      if (this.$epgNowLabel) this.$epgNowLabel.hide();
      if (this.$epgNextLabel) this.$epgNextLabel.hide();
      if (this.$epgNowTimeLabel) this.$epgNowTimeLabel.hide();

      // Usar título top para metadata
      this.$titleContentLabel = this.$titleContentLabelTop;

      // Mover botones de playback a la fila sobre el seekbar, manteniendo referencia para restaurar
      if (!this.vodRedesignOriginalParents) this.vodRedesignOriginalParents = {};
      var itemsToMove = [
        { key: "playPause", $btn: this.$playPauseButton },
        { key: "start", $btn: this.$goToStartButton },
        { key: "backX", $btn: this.$backXButton },
        { key: "forwardX", $btn: this.$forwardXButton },
      ];

      for (var i = 0; i < itemsToMove.length; i++) {
        var it = itemsToMove[i];
        if (!it.$btn || it.$btn.length === 0) continue;
        var $item = it.$btn.closest(".mat-controls-item");
        if ($item.length === 0) continue;
        if (!this.vodRedesignOriginalParents[it.key]) {
          this.vodRedesignOriginalParents[it.key] = {
            $parent: $item.parent(),
            idx: $item.index()
          };
        }
        if ($bottomRow && $bottomRow.length > 0) {
          $bottomRow.append($item);
        }
      }

      // En el top row, mantener back + title + hora; el resto lo controla setupButtonsForContentType
      if ($topRow && $topRow.length > 0) {
        // asegurar que el contenedor del título quede visible
        $topRow.find(".nb-vjs-vod-title-top-container").show();
      }
    } else {
      // Restaurar modo clásico
      this.vodRedesignActive = false;
      this.$vodControls.removeClass("vod-redesign");

      try {
        var $topRow2 = this.$vodControls.find(".mat-controls-row:first");
        $topRow2.find(".nb-vjs-vod-title-top-container").hide();
      } catch (e) { }

      // Restaurar título por defecto
      this.$titleContentLabel = this.$titleContentLabelDefault || this.$titleContentLabel;

      // Restaurar ubicación de los botones movidos
      if (this.vodRedesignOriginalParents) {
        var keys = ["playPause", "start", "backX", "forwardX"];
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          var info = this.vodRedesignOriginalParents[key];
          if (!info || !info.$parent || info.$parent.length === 0) continue;
          var $btn = null;
          if (key === "playPause") $btn = this.$playPauseButton;
          if (key === "start") $btn = this.$goToStartButton;
          if (key === "backX") $btn = this.$backXButton;
          if (key === "forwardX") $btn = this.$forwardXButton;
          if (!$btn || $btn.length === 0) continue;
          var $item = $btn.closest(".mat-controls-item");
          if ($item.length === 0) continue;
          // insertar aproximadamente en la posición original si es posible
          var $siblings = info.$parent.children(".mat-controls-item");
          if (info.idx >= 0 && info.idx < $siblings.length) {
            $siblings.eq(info.idx).before($item);
          } else {
            info.$parent.append($item);
          }
        }
      }

      // Volver a mostrar bloque info (si corresponde) será manejado por setupButtonsForContentType
    }
  },

  // ✅ NUEVA FUNCIÓN: Resetear visibilidad de TODOS los botones
  resetAllButtonVisibility: function() {
    // Ocultar TODOS los botones primero
    if (this.$playPauseButton) this.$playPauseButton.hide();
    if (this.$backXButton) this.$backXButton.hide();
    if (this.$forwardXButton) this.$forwardXButton.hide();
    if (this.$goToStartButton) this.$goToStartButton.hide();
    if (this.$goToEndButton) this.$goToEndButton.hide();
    if (this.$vodTracksButton) this.$vodTracksButton.hide();
    if (this.$nextEpisodeButton) this.$nextEpisodeButton.hide();
    if (this.$infoButton) this.$infoButton.hide();
    if (this.$goToEpgButton) this.$goToEpgButton.hide();
    if (this.$sideMenuButton) this.$sideMenuButton.hide();
    if (this.$favoriteButton) this.$favoriteButton.hide();
    if (this.$unfavoriteButton) this.$unfavoriteButton.hide();
    if (this.$lockButton) this.$lockButton.hide();
    if (this.$unlockButton) this.$unlockButton.hide();
    if (this.$epgNowTimeLabel) this.$epgNowTimeLabel.hide();
    if (this.$itemImageDiv) this.$itemImageDiv.hide();
    if (this.$seekbarContainer) this.$seekbarContainer.hide();
  },

  // ✅ NUEVA FUNCIÓN: Centralizar la configuración de botones según tipo de contenido
  setupButtonsForContentType: function() {
    var isLive = (this.currentType === "service");
    var isVOD = (this.currentType === "vod");
    var isCatchup = (this.currentType === "catchup-event");
    var hasEPGData = (this.startTime != null && this.endTime != null);
    var isExemptBrand = (this.currentBrand === "bromteck" || this.currentBrand === "fotelka");
    var vodRedesign = (isVOD && this.isVodRedesignEnabled());
    
    console.log('nbPlayer: setupButtonsForContentType', 
                'isLive:', isLive, 'isVOD:', isVOD, 'isCatchup:', isCatchup,
                'hasEPGData:', hasEPGData, 'isExemptBrand:', isExemptBrand);
    
    // Primero, limpiar todo
    this.resetAllButtonVisibility();
    
    if (isVOD) {
      // Activar/desactivar rediseño SOLO para VOD
      this.setVodRedesignMode(vodRedesign);

      // VOD: mostrar todos los controles de reproducción
      this.$backButton.show(); // back siempre visible
      this.$playPauseButton.show();
      this.$goToStartButton.show(); // reiniciar
      this.$backXButton.show();
      this.$forwardXButton.show();
      // En rediseño, ocultamos end y otros no requeridos
      if (!vodRedesign) {
        this.$goToEndButton.show();
      }
      this.$seekbarContainer.show();
      this.$seekbar.addClass("focusable");
      this.$seekbar.css("pointer-events", "auto");

      // En rediseño, ocultar botones no solicitados y el bloque de info
      if (vodRedesign) {
        this.$sideMenuButton.hide();
        this.$goToEpgButton.hide();
        this.$infoButton.hide();
        this.$vodTracksButton.hide();
        this.$nextEpisodeButton.hide();
        this.$favoriteButton.hide();
        this.$unfavoriteButton.hide();
        this.$lockButton.hide();
        this.$unlockButton.hide();
        if (this.$epgDataTr) this.$epgDataTr.hide();
        if (this.$itemImageDiv) this.$itemImageDiv.hide();
      } else {
        // Diseño clásico: mostrar bloque de info del VOD
        if (this.$epgDataTr) this.$epgDataTr.show();
        if (this.$itemImageDiv) this.$itemImageDiv.show();
      }
      
    } else if (isLive) {
      // Asegurar que el rediseño no afecte Live/Catchup
      this.setVodRedesignMode(false);
      // Live TV
      if (isExemptBrand) {
        // Marcas especiales: mostrar controles
        this.$playPauseButton.show();
        this.$backXButton.show();
        this.$forwardXButton.show();
        this.$goToStartButton.show();
        this.$goToEndButton.show();
      } else if (hasEPGData) {
        // Live TV con EPG: mostrar controles de navegación
        this.$playPauseButton.show();
        this.$backXButton.show();
        this.$forwardXButton.show();
        this.$goToStartButton.show();
        this.$goToEndButton.show();
      }
      
      // ✅ Mostrar botones de sideMenu e info para Live TV
      this.$sideMenuButton.show();
      this.$goToEpgButton.show();
      this.$infoButton.show();
      
      // Seekbar no es focusable en live TV
      this.$seekbar.removeClass("focusable");
      this.$seekbar.css("pointer-events", "none");
      
    } else if (isCatchup) {
      this.setVodRedesignMode(false);
      // Catchup: similar a VOD
      this.$playPauseButton.show();
      this.$backXButton.show();
      this.$forwardXButton.show();
      this.$goToStartButton.show();
      this.$goToEndButton.show();
      this.$seekbarContainer.show();
      this.$seekbar.addClass("focusable");
      this.$seekbar.css("pointer-events", "auto");
      
      // ✅ Mostrar botones de sideMenu e info para Catchup
      this.$sideMenuButton.show();
      this.$goToEpgButton.show();
      this.$infoButton.show();
    }
    
    // ✅ IMPORTANTE: Para Live TV, ocultar el botón de tracks inicialmente
    // Se actualizará cuando se detecten los tracks reales del canal
    if (isLive) {
      console.log('nbPlayer: Live TV - hiding tracks button initially, will check after content loads');
      this.$vodTracksButton.hide();
    }
    
    // Botón de tracks: solo si hay pistas disponibles (para VOD y Catchup)
    if (!isLive) {
      this.updateTracksButton();
    }

    // Recuperar foco si quedó en null u oculto tras reconfigurar botones.
    try {
      var self = this;
      setTimeout(function () {
        if (!Focus.focused || (Focus.focused && !Focus.focused.is(":visible"))) {
          if ((self.nbPlayerAreControslActive && self.nbPlayerAreControslActive()) || self.currentType === "vod") {
            self.focusOnFirstElement();
          }
        }
      }, 0);
    } catch (e) { }
  },

  // ✅ NUEVA FUNCIÓN: Actualizar botón de tracks con retry para Samsung/LG
  updateTracksButton: function() {
    var self = this;
    
    console.log('nbPlayer: updateTracksButton called, currentType:', this.currentType);
    
    // ✅ Para Live TV, ser más conservador: solo mostrar si definitivamente hay tracks
    // Para VOD/Catchup, usar retry logic
    if (this.currentType === "service") {
      // Live TV: verificar inmediatamente después de un breve delay para que se limpien los tracks anteriores
      setTimeout(function() {
        var audioTracks = self.getPlayerAudioTracks();
        var textTracks = self.getPlayerTextTracks();
        
        console.log('nbPlayer: Live TV track check - audio:', audioTracks.length, 'text:', textTracks.length);
        
        // ✅ Solo mostrar botón si hay tracks reales en el stream actual
        if (audioTracks.length > 1 || textTracks.length > 0) {
          // Más de 1 audio track (el primero suele ser default) o hay subtítulos
          console.log('nbPlayer: Live TV has tracks, showing button');
          self.$vodTracksButton.show();
        } else {
          console.log('nbPlayer: Live TV has no tracks, hiding button');
          self.$vodTracksButton.hide();
        }
      }, 1000); // Esperar 1 segundo para que se limpien los tracks del VOD anterior
    } else {
      // VOD/Catchup: usar retry logic con más intentos
      if (this.isLG) {
        this.checkTracksWithRetry(8, 800);
      } else {
        this.checkTracksWithRetry(5, 500);
      }
    }
  },

  // ✅ NUEVA FUNCIÓN: Reintentar detección de tracks con delay
  checkTracksWithRetry: function(maxRetries, delay) {
    var self = this;
    maxRetries = maxRetries || 5;
    delay = delay || 500;
    
    var checkTracks = function(attempt) {
      // ✅ IMPORTANTE: Verificar que los tracks sean del contenido actual y no del anterior
      var audioTracks = self.getPlayerAudioTracks();
      var textTracks = self.getPlayerTextTracks();
      
      // Log para debugging
      console.log('nbPlayer: checkTracksWithRetry attempt', attempt + 1, 
                  'audio:', audioTracks.length, 
                  'text:', textTracks.length,
                  'currentType:', self.currentType);
      
      var hasTracks = audioTracks.length > 0 || textTracks.length > 0;
      
      if (hasTracks) {
        console.log('nbPlayer: showing tracks button');
        self.$vodTracksButton.show();
        return;
      }
      
      if (attempt < maxRetries) {
        setTimeout(function() {
          checkTracks(attempt + 1);
        }, delay);
      } else {
        console.log('nbPlayer: hiding tracks button after', maxRetries, 'attempts');
        self.$vodTracksButton.hide();
      }
    };
    
    checkTracks(0);
  },

  setPlayerMetadata: function (metadata) {
    label = "";
    label = (metadata.titleTop && metadata.titleTop.length > 0) ? metadata.titleTop : "";
    this.$titleContentLabel.html(metadata.titleTop);

    //label = __("EPGAtThisTime") + ": " + ((metadata.epgNow && metadata.epgNow.length > 0) ? metadata.epgNow : __("EPGNoInformation"));

    // Rating del evento actual
    var epgNowText = metadata.epgNow || "";
    if (metadata.parentalRating !== undefined && metadata.parentalRating !== null) {
      epgNowText += this.homeObject.getRatingIconHtml(metadata.parentalRating || "");
    }
    this.$epgNowLabel.html(epgNowText);

    //label = __("EPGNext") + ": " + ((metadata.epgNext && metadata.epgNext.length > 0) ? metadata.epgNext : __("EPGNoInformation"));

    // ✅ Rating del próximo evento
    var epgNextText = metadata.epgNext || "";
    if (metadata.nextParentalRating !== undefined && metadata.nextParentalRating !== null) {
        epgNextText += this.homeObject.getRatingIconHtml(metadata.nextParentalRating || "");
    }
    this.$epgNextLabel.html(epgNextText);

    if (metadata.showNext) {
      this.$nextEpisodeButton.show();
    } else {
      this.$nextEpisodeButton.hide();
    }

    // this.$epgDataTr.hide();
    // this.$playPauseButton.parent().parent().show();
    // this.$seekbar.parent().parent().show();

    this.$favoriteButton.hide();
    this.$unfavoriteButton.hide();
    this.$lockButton.hide();
    this.$unlockButton.hide();
    this.$epgNowTimeLabel.hide();
    this.$itemImageImg.loadImage(metadata.epgImageSrc, metadata.epgImagePlaceholder);
    this.$itemImageDiv.show();

    if (metadata.epgImageStyle && metadata.epgImageStyle.length > 0) {
      this.$itemImageImg.attr("style", metadata.epgImageStyle);
    }

    if (this.homeObject.playbackMetadata.type != "vod") {
      this.$infoButton.show();
      if (metadata.startTime != null && metadata.endTime != null) {
        this.startTime = metadata.startTime;
        this.endTime = metadata.endTime;
        this.duration = getTimeDifference(metadata.startTime, metadata.endTime, 'seconds');
        this.$seekbarBar.css({ "width": "0%" });
        this.$epgNowTimeLabel.show();
        this.$epgNowTimeLabel.html(getDateFormatted(this.startTime, true) + " - " + getDateFormatted(this.endTime, true));
        this.onProgressLiveContent();
        this.showSeekbar();
        
        // ✅ Ya no necesitamos mostrar/ocultar botones aquí
        // Eso se maneja en setupButtonsForContentType() desde playContent()
      } else {
        this.showSeekbar();
      }


      if (this.homeObject.playbackMetadata.type == "service") {
        if (this.isServiceTVFavorite()) {
          this.$unfavoriteButton.show();
        } else {
          this.$favoriteButton.show();
        }
      }
      
      // ✅ Eliminar la lógica contradictoria que ocultaba botones aquí
      // Ya se maneja en setupButtonsForContentType()
      
    } else { //vod
      // ✅ Simplificar - ya está configurado desde playContent()
      // Solo ocultar elementos específicos de metadata para VOD
      this.$infoButton.hide();
      this.$goToEpgButton.hide();
      this.$sideMenuButton.hide();
      this.$itemImageDiv.hide();
    }

    //check if channel is locked/unlocked
    if (this.homeObject.playbackMetadata.type == "service") {
      if (User.hasServiceTVLocked(this.homeObject.playbackMetadata.id)) {
        this.$unlockButton.show();
      } else {
        this.$lockButton.show();
      }
    }
    // ocultar los botones de bloqueo y desbloqueo si es un servicio de tipo gigmax o yabnet
    if (this.homeObject.playbackMetadata.type == "service"  && CONFIG.app.brand === "gigmax" || CONFIG.app.brand === "yabnet"){
      console.log("nbPlayer: playContent isLive");
      this.$lockButton.hide();
      this.$unlockButton.hide();
    }

    $(".vjs-progress-control").hide();
    $(".nb-vjs-tooltip").hide();
  },

  vodPlayerGetControlType: function ($object) {

    switch ($object.data("type")) {
      case this.vodControlsEnum.play:
        return this.vodControlsEnum.play;
      case this.vodControlsEnum.next:
        return this.vodControlsEnum.next;
      case this.vodControlsEnum.tracks:
        return this.vodControlsEnum.tracks;
      case this.vodControlsEnum.back:
        return this.vodControlsEnum.back;
      case this.vodControlsEnum.trackItem:
        return this.vodControlsEnum.trackItem;
      case this.vodControlsEnum.forwardX:
        return this.vodControlsEnum.forwardX;
      case this.vodControlsEnum.backX:
        return this.vodControlsEnum.backX;
      case this.vodControlsEnum.start:
        return this.vodControlsEnum.start;
      case this.vodControlsEnum.end:
        return this.vodControlsEnum.end;
      case this.vodControlsEnum.epg:
        return this.vodControlsEnum.epg;
      case this.vodControlsEnum.sideMenu:
        return this.vodControlsEnum.sideMenu;
      case this.vodControlsEnum.favorite:
      case this.vodControlsEnum.unfavorite:
        return this.vodControlsEnum.favorite;
      case this.vodControlsEnum.lock:
      case this.vodControlsEnum.unlock:
        return this.vodControlsEnum.lock;
      case this.vodControlsEnum.info:
        return this.vodControlsEnum.info;
      case this.vodControlsEnum.seekbar:
        return this.vodControlsEnum.seekbar;
      default:
        return false;
    }

    // if ($object.data("type") == this.vodControlsEnum.play) {
    //     return this.vodControlsEnum.play;
    // } else if ($object.hasClass(this.vodControlsEnum.next)) {
    //     return this.vodControlsEnum.next;
    // } else if ($object.hasClass(this.vodControlsEnum.tracks)) {
    //     return this.vodControlsEnum.tracks;
    // } else if ($object.hasClass(this.vodControlsEnum.back)) {
    //     return this.vodControlsEnum.back;
    // } else if ($object.hasClass(this.vodControlsEnum.trackItem)) {
    //     return this.vodControlsEnum.trackItem;
    // } else if ($object.hasClass(this.vodControlsEnum.forwardX)) {
    //     return this.vodControlsEnum.forwardX;
    // } else if ($object.hasClass(this.vodControlsEnum.backX)) {
    //     return this.vodControlsEnum.backX;
    // } else if ($object.hasClass(this.vodControlsEnum.start)) {
    //     return this.vodControlsEnum.start;
    // } else if ($object.hasClass(this.vodControlsEnum.end)) {
    //     return this.vodControlsEnum.end;
    // } else if ($object.hasClass(this.vodControlsEnum.epg)) {
    //     return this.vodControlsEnum.epg;
    // } else if ($object.hasClass(this.vodControlsEnum.sideMenu)) {
    //     return this.vodControlsEnum.sideMenu;
    // }

    // return false;
  },

  openTracks: function () {

    var tracks = "";
    var audioTracks = this.getPlayerAudioTracks();
    var textTracks = this.getPlayerTextTracks();

    if (textTracks.length > 0 || audioTracks.length > 0) {
      var maxIndex = audioTracks.length > (textTracks.length + 1) ? audioTracks.length : (textTracks.length + 1);
      var subitlesDeactivated = textTracks.filter(function (track) { return track.mode == "showing" }).length == 0;
      var activated = "";
      var label = "";
      var trackItem = "";
      var audioIgnored = false;
      var subtitleIgnored = false;

      for (var i = 0; i < maxIndex; i++) {

        trackItem = "";
        audioIgnored = false;
        subtitleIgnored = false;
        // audio
        if (i < audioTracks.length && this.ignoredAudioTracks.indexOf(audioTracks[i].label) < 0) {
          activated = audioTracks[i].enabled ? "" : "hidden";
          label = audioTracks[i].label != null ? audioTracks[i].label : "";
          label = label == "" ? __("PlayerTracksUnknown") : label;
          trackItem += "<td class='nb-vjs-track-item nb-vjs-track-audio focusable' tabindex='1' data-index='" + i + "' data-id='" + audioTracks[i].id + "' data-type='track-item'><i class='fa fa-check " + activated + "'></i>" + label + "</td>";
        } else {
          audioIgnored = true;
          trackItem += "<td></td>";
        }

        // subtitles
        if (i == 0 && textTracks.length > 0) {
          activated = subitlesDeactivated ? "" : "hidden";
          trackItem += "<td class='nb-vjs-track-item nb-vjs-track-subtitle focusable' data-index='-1' data-id='' tabindex='1' data-type='track-item'> <i class='fa fa-check " + activated + "'></i>" + __("PlayerSubtitlesDeactivated") + "</td>";
        } else if ((i - 1) < textTracks.length && textTracks[i - 1] != null && this.ignoredTextTracks.indexOf(textTracks[i-1].label) < 0) {
          label = textTracks[i - 1].label != null ? textTracks[i - 1].label : "";
          label = label == "" ? __("PlayerTracksUnknown") : label;

          activated = (textTracks[i - 1].mode == "showing") ? "" : "hidden";
          trackItem += "<td class='nb-vjs-track-item nb-vjs-track-subtitle focusable' data-index='" + (i - 1) + "' data-id='" + textTracks[i - 1].id + "' tabindex='1' data-type='track-item'> <i class='fa fa-check " + activated + "'></i>" + label + "</td>";
        } else {
          subtitleIgnored = true;
          trackItem += "<td></td>";
        }

        if (!audioIgnored || !subtitleIgnored) {
          tracks += "<tr>" + trackItem + "</tr>";
        }
      }
    }

    if (tracks.length > 0) {
      this.$vodTracksDiv.find("table tbody").html(tracks);

      var subtitles = this.$vodTracksDiv.find("table tbody .nb-vjs-track-subtitle");
      if (subtitles.length > 0) {
        this.$vodTracksDiv.find("table .nb-vjs-track-subtitle").show();
        this.$vodTracksDiv.find("table tbody tr").find("td:eq(1)").show();
      } else {
        this.$vodTracksDiv.find("table .nb-vjs-track-subtitle").hide();
        this.$vodTracksDiv.find("table tbody tr").find("td:eq(1)").hide();
      }

      var audios = this.$vodTracksDiv.find("table tbody .nb-vjs-track-audio");
      if (audios.length > 0) {
        this.$vodTracksDiv.find("table .nb-vjs-track-audio").show();
        this.$vodTracksDiv.find("table tbody tr").find("td:eq(0)").show();
      } else {
        this.$vodTracksDiv.find("table .nb-vjs-track-audio").hide();
        this.$vodTracksDiv.find("table tbody tr").find("td:eq(0)").hide();
      }

      this.$vodTracksDiv.show();
      return this.$vodTracksDiv.find("table tbody tr td.focusable:first");
    } else {
      this.$vodTracksDiv.find("table tbody").html("");
      this.$vodTracksDiv.hide();
      this.$vodTracksButton.hide();
      return [];
    }
  },

  closeTracks: function () {
    if (this.isTracksMenuOpened()) {
      this.$vodTracksDiv.hide();
      Focus.to(this.$vodTracksButton);
    }
  },

  navigateTracks: function ($focused, direction) {
    var $focusTo = [];
    switch (direction) {
      case 'right':
        $focusTo = $focused.next("td");
        break;
      case 'left':
        $focusTo = $focused.prev("td");
        break;
      case 'up':
        $focusTo = $focused.closest("tr").prev("tr").find("td:nth-child(" + ($focused.index() + 1) + ").focusable");
        break;
      case 'down':
        $focusTo = $focused.closest("tr").next("tr").find("td:nth-child(" + ($focused.index() + 1) + ").focusable");
        break;
      default:
        break;
    }

    console.log($focusTo);
    return $focusTo;
  },

  updateChannelTrack: function(type, id) {
    var serviceTV = this.getCurrentServiceTV();
    if (serviceTV) {
      User.setChannelData(serviceTV.epgStreamId, type, id);
    }

    if (type == User.propChannelAudio) {
      User.setPlayerAudioLang(id);
    } else {
      User.setPlayerSubtitleLang(id);
    }
  },

  selectTrack: function ($focused) {
    var id = $focused.data("id");
    var self = this;

    if ($focused.hasClass("nb-vjs-track-subtitle")) {
      //tracks.forEach(function (track, index) { if (track.mode == "showing") { track.mode = "hidden"; } })
      User.setPlayerSubtitleLang(null);
      this.$player.textTracks().tracks_.forEach(function (track, index) {
        if (track.id == id && id != "-1") {
          self.$player.textTracks().tracks_[index].mode = "showing";

          //label saved instead of language because sometimes it brings several tracks with
          //the same language but different labels, and Id also because sometimes it changes (especially text tracks)
          self.updateChannelTrack(User.propChannelSubtitles, track.label);
        } else {
          self.$player.textTracks().tracks_[index].mode = "hidden";
        }
      });

      this.$vodTracksDiv.find(".nb-vjs-track-subtitle").find("i").addClass("hidden");
    } else {
      //this.$player.audioTracks().tracks_.forEach(function (track, index) { if (track.enabled == true) { track.mode = false; } })
      //this.$player.audioTracks().tracks_[index].enabled = true;
      User.setPlayerAudioLang(null);
      this.$player.audioTracks().tracks_.forEach(function (track, index) {
        if (track.id == id) {
          console.log('Before switching:', nbPlayer.$player.audioTracks());
          nbPlayer.$player.audioTracks().tracks_[index].enabled = true;

          //label saved instead of language because sometimes it brings several tracks with
          //the same language but different labels, and Id also because sometimes it changes (especially text tracks)
          self.updateChannelTrack(User.propChannelAudio, track.label);
          console.log('After switching:', nbPlayer.$player.audioTracks());
        } else {
          //nbPlayer.$player.audioTracks().tracks_[index].enabled = false;
        }
      });

      this.$vodTracksDiv.find(".nb-vjs-track-audio").find("i").addClass("hidden");
    }

    //if (!Device.isDEFAULT) { //reload player to fix issue when changing tracks and player freezes (only for TV's)
    //  this.$player.load();
    //}

    $focused.find("i").removeClass("hidden");
  },

  setAudioByProperty: function (property, propertyValue) {
    var self = this;

    console.log("Changing audio to " + propertyValue);
    this.$player.audioTracks().tracks_.forEach(function (track, index) {
      try {
        if (track[property] && track[property] == propertyValue) {
          console.log('Before switching:', nbPlayer.$player.audioTracks());
          nbPlayer.$player.audioTracks().tracks_[index].enabled = true;
          console.log('After switching:', nbPlayer.$player.audioTracks());
        } else {
          //self.$player.audioTracks().tracks_[index].enabled = false;
        }
      } catch(ex) {
        console.log(ex);
      }
    });

    this.$vodTracksDiv.find(".nb-vjs-track-audio").find("i").addClass("hidden");
  },

  setSubtitleByProperty: function (property, propertyValue) {
    var self = this;

    this.$player.textTracks().tracks_.forEach(function (track, index) {
      if (track[property] && track[property] == propertyValue) {
        self.$player.textTracks().tracks_[index].mode = "showing";
      } else {
        self.$player.textTracks().tracks_[index].mode = "hidden";
      }
    });

    this.$vodTracksDiv.find(".nb-vjs-track-subtitle").find("i").addClass("hidden");
  },

  resetAutoHideControls: function () {
    var self = this;
    clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = setTimeout(function () {
      self.hideControls();
    }, 6000);
  },

  showControls: function () {
    if (this.isSideMenuOpened()) {
      this.focusOnSideMenu(false);
      return;
    }

    this.$player.userActive(true);

    var self = this;
    // A veces la UI todavía está recalculando visibilidad/layout (show/hide),
    // así que hacemos un refocus diferido si quedamos sin foco visible.
    self.focusOnFirstElement();
    setTimeout(function () {
      try {
        if (!Focus.focused || (Focus.focused && !Focus.focused.is(":visible"))) {
          self.focusOnFirstElement();
        }
      } catch (e) { }
    }, 50);
    self.resetAutoHideControls();
    // setTimeout(function () {
    //   $(".nb-vjs-tooltip").hide();
    //   //$(".nb-vjs-custom-controls-div").show();
    //   self.focusOnFirstElement();
    //   self.resetAutoHideControls();
    // }, 500);
  },

  hideControls: function () {
    var self = this;
    this.closeTracks();
    $(".vjs-menu").hide();
    // this.cancelSeekTimeIndicator();
    $(".nb-vjs-tooltip").hide();
    setTimeout(function () {
      self.$player.userActive(false);
    }, 100);
    //$(".nb-vjs-custom-controls-div").hide();
  },

  backXAction: function () {
    this.skip(-this.defaultSkipSeconds);
  },

  forwardXAction: function () {
    this.skip(this.defaultSkipSeconds);
  },

  start: function () {
    if (this.isLive) {
      this.goToStartLive();
    } else {
      this.$player.currentTime(0);
    }
  },

  end: function () {
    if (this.isLive) {
      this.goToLivePoint();
    } else {
      this.$player.currentTime(this.$player.duration() - this.defaultSkipSeconds);
    }
  },

  skip: function (seconds) {
    if (this.isLive) {
      this.skipTimeLive(seconds);
    } else {
      //this.$player.currentTime(this.$player.currentTime() + seconds);
      this.skipTimeVOD(seconds);
    }

    this.resetAutoHideControls();
  },

  nbPlayerResetContent: function (minimize) {
    this.hideControls();

    if (minimize && this.isFullscreen()) {
      this.exitFullscreen(function () { });
    }

    this.$player.errorDisplay.close();
    this.$player.reset();
    this.$player.hasStarted(false);
    this.$player.currentTime(0);
    this.currentPercent = 0;
    this.isLive = false;
    this.currentType = null; // ✅ Resetear currentType también
    this.startTime = null;
    this.endTime = null;
    this.duration = null;
    this.callbackOnEnded = null;
    
    // ✅ NUEVO: Limpiar tracks de audio/subtítulos del contenido anterior
    this.clearTextTracks();
    
    // ✅ NUEVO: Resetear visibilidad de TODOS los botones
    this.resetAllButtonVisibility();
  },

  nbPlayerAreControslActive: function () {
    return this.$player && this.$player.userActive();
  },

  //modificacion de codigo para que oculte los botones cuando no esta en video
  exitFullscreen: function (callback) {
    if (EPGDetails.isShowed()) {
      EPGDetails.close();
    }

    this.hideControls();
    // this.$player.exitFullscreen();
    // this.deactivateControls(true);
    this.$container.removeClass("video_full");
    if (callback) {
      callback(true);
    }

  },

  onReturn: function ($el, playbackMetadata, callback) {
    if (EPGDetails.isShowed()) {
      EPGDetails.close();
    } else if (this.isSideMenuOpened()) {
      this.closeSideMenu();
      return;
    } else if (this.nbPlayerAreControslActive()) {
      if (this.isTracksMenuOpened()) {
        this.closeTracks();
        Focus.to(this.$vodTracksButton);
      } else {
        this.hideControls();
      }
    } else {
      // this.cancelSeekTimeIndicator();
      this.exitFullscreen(callback);
      return;
    }

    if (callback) {
      var closePlayer = $el && (this.vodPlayerGetControlType($el) == this.vodControlsEnum.epg || this.vodPlayerGetControlType($el) == this.vodControlsEnum.back);
      callback(closePlayer);
    }
  },

  //funcion para maximias
  isFullscreen: function () {
    // return this.$player && this.$player.isFullscreen_;
    return this.$container.hasClass("video_full");
  },

  setTextTrack: function (index) {

    var tracks = this.$player.textTracks();

    for (var i = 0; i < tracks.length; i++) {
      tracks[i].mode = 'hidden';
    }

    if (index > 1) {
      this.$player.textTracks()[index - 2].mode = "showing";
    }
  },

  onProgressEverySecond: function (time) {
    if (time == this.lastTime) {
      return;
    }

    this.lastTime = time;

    if (this.isLive) {
      this.onProgressLiveContent();
    } else {
      this.onProgressVOD(time);
    }
  },

  onProgressLiveContent: function () {

    if (this.startTime == null || this.endTime == null || this.duration == 0 || this.seekbarLiveInitialDate == null) {
      return;
    }

    var now = this.getCurrentLiveProgressTime();
    var currentSeconds = getTimeDifference(this.startTime, now, 'seconds');
    this.currentPercent = currentSeconds / this.duration * 100;

    if (this.currentPercent <= 100) {
      this.$seekbarBar.css({ "width": this.currentPercent + "%" });
      //this.$seekbarBar.find("div:last").html(getStringDate(now, "HH:mm:ss") + " (" + parseInt(this.currentPercent) + "%)");
      this.$seekbarCurrentTime.html(secondsToTimeString(currentSeconds));
      this.$seekbarLeftTime.html(secondsToTimeString(getTimeDifference(now, this.endTime, 'seconds')));
    } else {
      if (this.callbackOnEnded != null) {
        this.callbackOnEnded();
      }
    }
  },

  onProgressVOD: function (time) {
    var duration = this.$player.duration();

    if (duration <= 0 || isNaN(duration)) {
      this.$seekbarBar.css({ "width": "0%" });
      this.$seekbarCurrentTime.html("--:--");
      this.$seekbarLeftTime.html("--:--");
      return;
    }

    this.currentPercent = time / duration * 100;
    if (this.currentPercent > 100) {
      return;
    }

    var progress = !isNaN(this.currentPercent) ? this.currentPercent : 0;
    this.$seekbarBar.css({ "width": progress + "%" });
    this.$seekbarCurrentTime.html(secondsToTimeString(time));
    this.$seekbarLeftTime.html(secondsToTimeString(duration - time));
  },

  /**
   * Returns the current progress of live content in date (moment) format
   * @returns Date (moment)
   */
  getCurrentLiveProgressTime: function () {
    var diffNow = getTimeDifference(this.seekbarLiveInitialDate, this.getCurrentServerTime(), 'seconds') - this.seekbarLiveSecondsLate;
    var now = addSeconds(this.seekbarLiveInitialDate, diffNow);
    //console.log(" now: " + now);

    return now;
  },

  setEvents: function (callbackOnProgress, callbackOnError, callbackOnEnded) {
    var self = this;

    this.$player.off('timeupdate');
    this.$player.on('timeupdate', function (event) {
      var time = parseInt(self.$player.currentTime());
      self.onProgressEverySecond(time);
      callbackOnProgress(time);
    });

    this.$player.off('error');
    this.$player.on('error', function (error) {
      callbackOnError(error, self.$player.error());
    });

    if (this.isLive) {
      this.callbackOnEnded = callbackOnEnded;
    } else {
      this.$player.off('ended');
      this.$player.on('ended', function () {
        callbackOnEnded();
      });
    }
  },

  goToLivePoint: function () {
    this.seekbarLiveSecondsLate = 0;
    this.$player.currentTime(this.getLiveCurrentTime());
  },

  goToStartLive: function () {
    var secondsNow = getTimeDifference(this.startTime, this.seekbarLiveInitialDate, 'seconds');
    var newTime = this.seekbarLiveInitialTime - secondsNow;
    this.seekbarLiveSecondsLate = getTimeDifference(this.startTime, getTodayDate(), 'seconds');
    this.$player.currentTime(newTime);
  },

  getLiveCurrentTime: function () {
    var diff = getTimeDifference(this.seekbarLiveInitialDate, this.getCurrentServerTime(), 'seconds');

    return this.seekbarLiveInitialTime + diff;
  },

  getCurrentServerTime: function () {
    return getTodayDate();
  },

  /**
   *
   * @param {int} newPercent: value between 0 and 1
   */
  seekbarClicked: function (newPercent) {

    if (this.isLive) {
      var current = (newPercent * this.duration);
      var newPointDate = addSeconds(this.startTime, current);
      var now = this.getCurrentServerTime();
      var diffNow = getTimeDifference(this.seekbarLiveInitialDate, now, 'seconds');
      var newSecondsLate = getRealTimeDifference(newPointDate, now, 'seconds');

      if ((this.seekbarLiveInitialTime + diffNow + newSecondsLate) <= this.getLiveCurrentTime()) {
        this.seekbarLiveSecondsLate = Math.abs(newSecondsLate);
        newPercent *= 100;
        this.$seekbarBar.css({ "width": newPercent + "%" });

        this.$player.currentTime(this.seekbarLiveInitialTime + diffNow - this.seekbarLiveSecondsLate);
      } else {
        this.goToLivePoint();
      }
    } else {

      var duration = this.$player.duration();
      if (duration <= 0) {
        return;
      }

      var newSeconds = (newPercent * duration);

      if (newSeconds >= 0 && newSeconds <= duration) {
        this.$player.currentTime(newSeconds);
      }
    }

  },

  skipTimeLive: function (seconds) {

    // var sec = (this.currentPercent * this.duration) / 100;
    // sec += seconds;
    // var newPercent = sec / this.duration;

    // this.seekbarClicked(newPercent);
    this.$player.pause();
    clearTimeout(this.skipTimeTimeout);
    this.skipTimeTimeout = null;

    this.secondsSkipped = (this.secondsSkipped == 0 ? (this.$player.currentTime()) : this.secondsSkipped) + seconds;
    this.seekbarLiveSecondsLate += seconds * -1;
    this.onProgressEverySecond(this.secondsSkipped);
    console.log("Skip live to " + this.secondsSkipped);

    var self = this;
    this.skipTimeTimeout = setTimeout(function() {
      var skipped = self.secondsSkipped - self.$player.currentTime();
      console.log("Total skipped " + skipped);

      var sec = (self.currentPercent * self.duration) / 100;
      sec += skipped;
      console.log("Total skipped seconds" + sec);

      var newPercent = sec / self.duration;
      console.log("Live new percent " + newPercent);

      self.seekbarClicked(newPercent);
      self.$player.play();
      self.secondsSkipped = 0;
    }, 1000);
  },

  skipTimeVOD: function(seconds) {
    this.$player.pause();
    clearTimeout(this.skipTimeTimeout);
    this.skipTimeTimeout = null;
    this.secondsSkipped = (this.secondsSkipped == 0 ? (this.$player.currentTime()) : this.secondsSkipped) + seconds;
    console.log("Skip to "+this.secondsSkipped);
    this.onProgressEverySecond(this.secondsSkipped);

    var self = this;
    this.skipTimeTimeout = setTimeout(function() {
      self.$player.currentTime(self.secondsSkipped);
      self.$player.play();
      self.secondsSkipped = 0;
    }, 1000);
  },

  focusOnFirstElement: function () {
    if (this.$playPauseButton.is(":visible")) {
      this.setFocusTo(this.$playPauseButton);
    } else {
      var $focusTo = null;
      if (this.homeObject.playbackMetadata.type == "service") {
        $focusTo = this.$vodControls.find(".focusable[data-type='side-menu']:first");
      }

      if ($focusTo == null) {
        $focusTo = this.$vodControls.find(".focusable:visible:first");
      }

      if ($focusTo) {
        this.setFocusTo($focusTo);
      }
    }
  },

  deactivateControls: function (deactivate) {
    if (deactivate) {
      this.$player.controlBar.hide();
    } else {
      this.$player.controlBar.show();
    }
  },

  isSideMenuOpened: function () {
    return this.$sideMenuContainer.is(":visible");
  },

  openSideMenu: function () {
    this.deactivateControls(true);
    this.hideControls();
    this.$sideMenuContainer.show();
    this.fillSideMenu();
    this.focusOnSideMenu(true);
  },

  closeSideMenu: function () {
    this.deactivateControls(false);
    this.hideControls();
    this.$sideMenuContainer.fadeOut(250);
  },

  fillSideMenu: function () {

    if (this.$sideMenu.find(".focusable").length > 0) {
      return;
    }

    var html = "<div class='v-carrousel'>";
    //web
    if (Device.isDEFAULT) {
      html += "<div class='side-menu-close' onclick='nbPlayer.closeSideMenu()'>X</div>";
    }
    //web
    var channels = AppData.channels;
    var channel, style;

    for (var i = 0; i < channels.length; i++) {
      style = "";
      channel = channels[i];

      if (channel.backgroundColor != null && typeof channel.backgroundColor != 'undefined') {
        style = " background-color: #" + channel.backgroundColor;
      }

      var serviceTV = AppData.getServiceTV(channel.id);
      var liveEvent = AppData.getLiveEvent(serviceTV);
      var showName = "";
      if (liveEvent != null) {
        showName = (liveEvent.languages.length > 0 ? liveEvent.languages[0].title : "");
      }

      html += "<div class='v-carrousel-item focusable' data-id='" + channel.id + "' tabindex='0'>"
        + "<div class='v-carrousel-image' style='" + style + "'><img src='" + channel.img + "' ></div>"
        + "<div class='v-carrousel-desc'>"
        + "<div class='v-carrousel-title'>" + channel.lcn + " " + channel.name + "</div>"
        + "<div class='v-carrousel-subtitle'>" + showName + "</div>"
        + "</div>"
        + "</div>";
    }
    html += "</div>";

    this.$sideMenu.scrollTop(0);
    this.$sideMenu.html(html);
    //Focus.to(this.$sideMenu.find(".focusable:first"));
  },

  onFocus: function () {
    $(".nb-vjs-tooltip").hide();

    var $focused = this.getFocused();
    if (this.isSideMenuOpened()) {
      var id = $focused.data("id");

      if (!id) {
        return;
      }

      var $showName = $focused.find(".v-carrousel-subtitle");
      var serviceTV = AppData.getServiceTV(id);

      // Si la EPG de este canal ya está cargada en memoria, mostrarla inmediatamente
      if (serviceTV && typeof serviceTV.epgItems !== 'undefined') {
        var liveEvent = AppData.getLiveEvent(serviceTV);
        if (liveEvent != null) {
          $showName.html((liveEvent.languages.length > 0 ? liveEvent.languages[0].title : ""));
        } else {
          $showName.html(__("EPGItemNoData"));
        }
        return;
      }

      // Si no está cargada, colocar indicador dinámico y meter debounce
      $showName.html("...");

      var self = this;
      clearTimeout(this.sideMenuFocusTimeout);
      this.sideMenuFocusTimeout = setTimeout(function () {
        // Solo iniciar la petición y colocar "Cargando" si el usuario se detuvo aquí
        $showName.html(__("EPGLoading"));
        AppData.getSimpleEpgByChannel(id, function () {
          // Verificar que el elemento siga enfocado antes de actualizar la UI
          var $currentFocused = self.getFocused();
          if ($currentFocused && $currentFocused.data("id") === id) {
            var liveEvent = AppData.getLiveEvent(serviceTV);
            if (liveEvent != null) {
              $showName.html((liveEvent.languages.length > 0 ? liveEvent.languages[0].title : ""));
            } else {
              $showName.html(__("EPGItemNoData"));
            }
          }
        });
      }, 400);

    } else if ($focused.find(".nb-vjs-tooltip").length > 0) {
      $focused.find(".nb-vjs-tooltip").show();
    }
  },

  focusOnSideMenu: function (center) {
    var $focusTo = null;
    if (this.homeObject.playbackMetadata.type == "service") {
      $focusTo = this.$sideMenu.find(".focusable[data-id='" + this.homeObject.playbackMetadata.id + "']:first");
    } else {
      $focusTo = this.$sideMenu.find(".focusable:first");
    }

    if ($focusTo) {
      this.setFocusTo($focusTo);
      this.setSideMenuScroll(center);
    }
  },

  setSideMenuScroll: function (center) {
    var $focusTo = this.getFocused();

    if (!$focusTo || !$focusTo.length) {
      return;
    }

    var menuHeight = this.$sideMenu.height();
    var elementHeight = $focusTo.outerHeight();
    var elementTop = $focusTo.position().top;
    var scrollTop = this.$sideMenu.scrollTop();

    if (center) {
      var centerPosition = scrollTop + (elementTop - (menuHeight/2) + (elementHeight/2));
      this.$sideMenu.scrollTop(centerPosition);
    } else if (elementTop < 0) {
      this.$sideMenu.scrollTop(scrollTop + elementTop);
    } else if ((elementTop + elementHeight) > menuHeight) {
      var newScrollTop = scrollTop + (elementTop - menuHeight + elementHeight) + 40;
      this.$sideMenu.scrollTop(newScrollTop);
    }
  },

  onFavorite: function () {
    if (this.homeObject.playbackMetadata.type != "service") {
      return;
    }

    var idServiceTV = this.homeObject.playbackMetadata.id;
    var serviceTV = idServiceTV != null ? AppData.getServiceTV(idServiceTV) : null;
    if (serviceTV != null) {
      var lcn = serviceTV.lcn;

      var favorites = User.getServicesTVFavorited();
      if (favorites.length > 0) {
        var index = User.hasServiceTVFavorited(lcn);
        if (index >= 0) { // remove favorite
          favorites.splice(index, 1);
        } else { // add favorite
          favorites.push(lcn);

        }
      } else { // add first favorite
        favorites = [lcn];
      }

      User.setServicesTVFavorited(favorites);

      if (User.hasServiceTVFavorited(lcn) >= 0) {
        this.$favoriteButton.hide();
        this.$unfavoriteButton.show();
        Focus.to(this.$unfavoriteButton);
      } else {
        this.$unfavoriteButton.hide();
        this.$favoriteButton.show();
        Focus.to(this.$favoriteButton);
      }

      this.homeObject.setFavoritesRow();
      return true;
    }

    return false;
  },

  isServiceTVFavorite: function () {
    if (this.homeObject.playbackMetadata.type != "service") {
      return false;
    }

    var idServiceTV = this.homeObject.playbackMetadata.id;
    var serviceTV = idServiceTV != null ? AppData.getServiceTV(idServiceTV) : null;

    if (serviceTV) {
      return User.hasServiceTVFavorited(serviceTV.lcn) >= 0;
    }

    return false;
  },

  onToggleLock: function () {
    if (this.homeObject.playbackMetadata.type != "service" && this.homeObject.playbackMetadata.type != "catchup-event") {
      return;
    }

    var idServiceTV = this.homeObject.playbackMetadata.id;
    var $container = this.isFullscreen() ? this.$mainVideo : $(".common:first");
    var $lastFocused = Focus.focused;
    var self = this;

    if (this.homeObject.playbackMetadata.type == "catchup-event") {
      var serviceTVObj = AppData.getServiceTVByCatchupObj(this.homeObject.playbackMetadata.item);
      if (serviceTVObj) {
        idServiceTV = serviceTVObj.id;
      } else {
        console.log("Catchup data not found");
        return;
      }
    }

    ParentalControlDlg.show($container, $lastFocused, function() {
      if (User.toggleLockedServiceTV(idServiceTV)) {
        self.$lockButton.hide();
        self.$unlockButton.show();
      } else {
        self.$unlockButton.hide();
        self.$lockButton.show();
      }
    }, null);

  },

  isTracksMenuOpened: function() {
    var $el = Focus.focused;
    return (this.vodPlayerGetControlType($el) == this.vodControlsEnum.trackItem);
  },

  getCurrentServiceTV: function() {
    var idServiceTV = this.homeObject.playbackMetadata.id;
    return idServiceTV != null ? AppData.getServiceTV(idServiceTV) : null;
  },

  stopPlayer: function (minimize) {
    this.$player.pause();
    this.nbPlayerResetContent(minimize);
  },

  isPlaying: function () {
    return (this.$player && this.$player.currentTime() > 0 && !this.$player.paused() && this.$player.readyState() > 2);
    //const isVideoPlaying = video => !!(video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2);
  },

};
