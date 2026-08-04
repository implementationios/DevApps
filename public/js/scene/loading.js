/**
 * Loading scene - Componente de carga que se muestra antes de ir a home
 *
 * @author AuroraTech
 * @class Scene_Loading
 * @extends Scene
 */

Scene_Loading = (function (Scene) {

  var Scene_Loading = function () {
    this.construct.apply(this, arguments);
  };

  $.extend(true, Scene_Loading.prototype, Scene.prototype, {
    /**
     * @inheritdoc Scene#init
     */
    init: function () {
      this.loadingTimeout = null;
      this.loadedChannels = 0;
      this.totalChannels = 0;
      this.tipsInterval = null;
    },

    /**
     * @inheritdoc Scene#create
     */
    create: function () {
      return $('#scene-loading');
    },

    /**
     * @inheritdoc Scene#render
     */
    render: function () {
      console.log('render loading scene');

      // Configurar logo si existe
      var $logo = this.$el.find(".img-logo");
      if ($logo.length) {
        $logo.attr("src", "assets/images/" + CONFIG.app.brand + "/logo.png");
      }

      // Configurar background si existe
      var $background = this.$el.find(".loading-background");
      if ($background.length) {
        $background.css({ 'background-image': 'url(assets/images/' + CONFIG.app.brand + '/background.png)' });
      }

      // Mensaje y tip inicial traducidos
      var $msg = this.$el.find('#loadingMessage');
      if ($msg.length) $msg.text(__('LoadingMessage'));
      var $tipEl = this.$el.find('#loadingTip');
      if ($tipEl.length) $tipEl.text(__('LoadingTip1'));
    },

    /**
     * @inheritdoc Scene#activate
     */
    activate: function () {
      var self = this;

      // Aplicar modo de diseño aquí (activate corre antes que render): ocultar/mostrar con jQuery
      var loadingDesign = CONFIG.app.loadingDesign;
      this.$el.toggleClass('loading-design-minimal', !loadingDesign);
      var $progress = this.$el.find('.loading-progress-container');
      var $text = this.$el.find('.loading-text');
      var $tips = this.$el.find('.loading-tips-container');
      if (loadingDesign) {
        console.log('loadingDesign: true');
        $progress.show();
        $text.show();
        $tips.show();
      } else {
        console.log('loadingDesign: false');
        $progress.hide();
        $text.hide();
        $tips.hide();
      }

      // Limpiar timeout anterior si existe
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
      }

      // Resetear contadores
      this.loadedChannels = 0;
      this.totalChannels = 0;

      // Iniciar animación de carga si existe
      this.startLoadingAnimation();

      // Iniciar tips rotativos
      this.initLoadingTips();

      // Iniciar carga de EPG para los primeros canales
      this.loadEPGData();
    },

    /**
     * Carga la EPG para los primeros canales según epgRowsOnInit
     */
    loadEPGData: function () {
      var self = this;

      console.log('Iniciando carga de EPG en componente de loading');

      // Agregar timeout de seguridad (30 segundos)
      this.loadingTimeout = setTimeout(function() {
        console.warn('Timeout en carga de EPG, redirigiendo a home');
        if (self.loadingTimeout) {
          clearTimeout(self.loadingTimeout);
          self.loadingTimeout = null;
        }
        self.goToHome();
      }, 300000);

      // Verificar si ya hay servicios cargados
      if (AppData.services && AppData.services.length > 0) {
        // Si ya hay servicios, cargar EPG directamente
        this.startEPGLoading();
      } else {
        // Si no hay servicios, obtenerlos primero
        AppData.getDataForServicesTV(function(bouquets) {
          console.log('Servicios obtenidos, iniciando carga de EPG');
          if (AppData.services && AppData.services.length > 0) {
            self.startEPGLoading();
          } else {
            console.log('No hay servicios disponibles para cargar EPG, redirigiendo a home');
            // CORRECCIÓN: Llamar a goToHome() incluso si no hay servicios
            if (self.loadingTimeout) {
              clearTimeout(self.loadingTimeout);
              self.loadingTimeout = null;
            }
            self.goToHome();
          }
        });
      }
    },

    /**
     * Inicia la carga de EPG para los primeros canales
     */
    startEPGLoading: function () {
      var self = this;

      console.log('Cargando EPG para los primeros ' + AppData.epgRowsOnInit + ' canales');

      // Verificar que hay servicios antes de intentar cargar EPG
      if (!AppData.services || AppData.services.length === 0) {
        console.warn('No hay servicios para cargar EPG, redirigiendo a home');
        if (self.loadingTimeout) {
          clearTimeout(self.loadingTimeout);
          self.loadingTimeout = null;
        }
        self.goToHome();
        return; 
      }

      // Calcular total de canales a cargar
      self.totalChannels = Math.min(AppData.services.length, AppData.epgRowsOnInit || AppData.services.length);
      self.loadedChannels = 0;

      // Inicializar progreso
      self.updateProgress(10, __('LoadingProgressMessage'), __('LoadingProgressSubmessage'));

      // Antes: un setInterval(300ms) releía AppData.services en bucle para
      // estimar el progreso (consumo de CPU constante durante toda la carga).
      // Ahora: getEPGByBouquet avisa directamente cuando cada lote de 5
      // canales termina, y esa notificación es la que actualiza la misma
      // barra de progreso — sin polling, mismo feedback visual para el usuario.
      AppData.getEPGByBouquet(function (servicesWithEPG) {
        console.log('EPG cargada en componente de loading: ' + servicesWithEPG.length + ' servicios con EPG');

        // Mostrar progreso final
        self.updateProgress(100, __('LoadingAlmostReady'), __('LoadingFinishing'));

        // Limpiar timeout antes de redirigir
        if (self.loadingTimeout) {
          clearTimeout(self.loadingTimeout);
          self.loadingTimeout = null;
        }

        // Redirigir a home después de un breve delay
        setTimeout(function() {
          self.goToHome();
        }, 500);
      }, 0, function onEPGBatchProgress(channelsWithEPG, totalChannels) {
        self.loadedChannels = channelsWithEPG;
        var percent = Math.min(90, Math.max(10, Math.round((channelsWithEPG / totalChannels) * 100)));

        self.updateProgress(
          percent,
          __('LoadingProgressMessage'),
          __('LoadingChannelsProgress', { '0': channelsWithEPG, '1': totalChannels })
        );
      });
    },

    /**
     * Actualiza la barra de progreso y los mensajes
     */
    updateProgress: function(percent, message, submessage) {
      var $progressFill = this.$el.find('#loadingProgressFill');
      var $progressText = this.$el.find('#loadingProgressText');
      var $message = this.$el.find('#loadingMessage');
      var $submessage = this.$el.find('#loadingSubmessage');

      if ($progressFill.length) {
        $progressFill.css('width', percent + '%');
      }

      if ($progressText.length) {
        $progressText.text(Math.round(percent) + '%');
      }

      if ($message.length && message) {
        $message.text(message);
      }

      if ($submessage.length && submessage) {
        $submessage.text(submessage);
      }
    },

    /**
     * Inicia los tips rotativos
     */
    initLoadingTips: function() {
      var self = this;
      var tips = [
        __('LoadingTip1'),
        __('LoadingTip2'),
        __('LoadingTip3'),
        __('LoadingTip4')
      ];

      var currentTip = 0;
      var $tip = this.$el.find('#loadingTip');

      if ($tip.length && tips.length > 0) {
        // Limpiar intervalo anterior si existe
        if (this.tipsInterval) {
          clearInterval(this.tipsInterval);
        }

        // Mostrar primer tip
        $tip.text(tips[0]);

        // Rotar tips cada 4 segundos
        this.tipsInterval = setInterval(function() {
          currentTip = (currentTip + 1) % tips.length;
          $tip.fadeOut(300, function() {
            $(this).text(tips[currentTip]).fadeIn(300);
          });
        }, 4000);
      }
    },

    /**
     * Redirige a home
     */
    goToHome: function () {
      // Limpiar timeout si aún existe
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
        this.loadingTimeout = null;
      }

      console.log('Redirigiendo a home desde loading');
      Router.go('home');
    },

    /**
     * Inicia la animación de carga
     */
    startLoadingAnimation: function () {
      var $spinner = this.$el.find('.loading-spinner');
      if ($spinner.length) {
        // Agregar clase de animación si no existe
        $spinner.addClass('loading-spinner-active');
      }
    },

    /**
     * @inheritdoc Scene#destroy
     */
    destroy: function () {
      // Limpiar timeout al destruir la escena
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
        this.loadingTimeout = null;
      }

      // Limpiar intervalo de tips
      if (this.tipsInterval) {
        clearInterval(this.tipsInterval);
        this.tipsInterval = null;
      }

      // Detener animación
      var $spinner = this.$el.find('.loading-spinner');
      if ($spinner.length) {
        $spinner.removeClass('loading-spinner-active');
      }

      // Resetear progreso
      this.updateProgress(0, __('LoadingMessage'), '');
    },

    /**
     * @inheritdoc Scene#onClick
     */
    onClick: function ($el, event) {
      // No hacer nada en click durante la carga
    },

    /**
     * @inheritdoc Scene#onEnter
     */
    onEnter: function ($el, event) {
      // No hacer nada en enter durante la carga
    },

    /**
     * @inheritdoc Scene#navigate
     */
    navigate: function (direction) {
      // No permitir navegación durante la carga
      return false;
    },

    /**
     * @inheritdoc Scene#onReturn
     */
    onReturn: function ($el) {
      // No permitir volver durante la carga
      return false;
    }

  });

  return Scene_Loading;

})(Scene);

