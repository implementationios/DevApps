Scene_Offline = (function (Scene) {

  var Scene_Offline = function () {
    this.construct.apply(this, arguments);
  };

  $.extend(true, Scene_Offline.prototype, Scene.prototype, {
    /**
     * @inheritdoc Scene#init
     */
    init: function () {
      console.log('[Scene] init license offline scene');
      this.viewport = $("#viewport");
      this.online = false;
      this.$lastFocused = null;
      this.isChecking = false;
    },

    /**
     * @inheritdoc Scene#create
     */
    create: function () {
      this.keepAlive = true;
      return $('#scene-offline');
    },

    loginOptions: function () {

    },
    createSocket: function (data) {
    },

    resetHistory: function () {
      Router.history.shift();
    },

    /**
     * @inheritdoc Scene#activate
     */
    activate: function () {
      NbNetworkObserver.stopObserver();
      NbNetworkObserver.currentStatus = NbNetworkObserver.offlineStatus;

      if (this._observerDelay) {
        clearTimeout(this._observerDelay);
      }

      var self = this;
      // Esperar a que la escena se muestre antes de vigilar la reconexión
      this._observerDelay = setTimeout(function () {
        if (Router.isSceneActive("offline")) {
          self.startConnectionObserver();
        }
      }, 2000);

      return true;
    },

    /**
     * Observa la conexión en segundo plano sin forzar salida inmediata al entrar.
     */
    startConnectionObserver: function () {
      var self = this;
      NbNetworkObserver.startObserver(function () {
        if (Router.isSceneActive("offline")) {
          self.goOnline();
        }
      }, function () {
        // Sigue offline; la escena offline permanece visible.
      });
    },

    /**
     * @inheritdoc Scene#render
     */
    render: function () {
      this.$el.find("#offlineTitle").text(__("OfflineTitle"));
      this.$el.find("#offlineMessage").text(__("OfflineMessage"));
      this.$el.find("#offlineRetryButton").text(__("OfflineRetryButton"));
      this.$el.find("#offlineExitButton").text(__("OfflineExitButton"));
      Focus.to(this.$el.find("#offlineRetryButton"));
    },

    destroy: function () {
      this.keepAlive = false;
      if (this._observerDelay) {
        clearTimeout(this._observerDelay);
        this._observerDelay = null;
      }
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


    /**
     * @inheritdoc Scene#onEnter
     */
    onEnter: function ($el, event) {
      if ($el.attr("id") == "offlineRetryButton") {
        this.retryConnection();
      } else if ($el.attr("id") == "offlineExitButton") {
        this.showExitAlert();
      } else if ($el.isInAlertConfirm(this.$el)) {
        if ($el.is(this.$nbAlertConfirmOkButton)) {
          $el.closeAlert(this.$el);
          closeApp();
        } else {
          $el.closeAlert(this.$el);
          Focus.to(this.$lastFocused);
        }
      }
    },

    retryConnection: function () {
      App.throbber();
      var self = this;
      this.$lastFocused = Focus.focused;
      this.checking(true);
      NbNetworkObserver.startObserverFromOffline(function () {
        self.goOnline();
      }, function () {
        self.goOffline();
      });
    },
    /**
     * @inheritdoc Scene#onReturn
     */
    onReturn: function ($el, event) {

      if ($el.isInAlertConfirm(this.$el)) {
        $el.closeAlert(this.$el);
        Focus.to(this.$lastFocused);
      } else {
        this.showExitAlert();
      }

      return false;
    },
    /**
     * @inheritdoc Scene#navigate
     */
    navigate: function (direction) {
      if (this.isChecking) {
        return;
      }

      var $el = Focus.focused;

      if ($el.isInAlertConfirm(this.$el)) {
        this.manageFocusOnAlert(direction, $el.data("parent-type"));
      } else {
        if (direction === 'left') {
          Focus.to(this.$el.find("#offlineRetryButton"));
        } else if (direction === 'right') {
          Focus.to(this.$el.find("#offlineExitButton"));
        }
      }

    },

    /**
     * @inheritdoc Scene#focus
     */
    focus: function ($el) {
      if (!$el) {
        $el = this.getFocusable();
      }
      this.$lastFocused = $el;
      return Focus.to($el);
    },

    /**
     * Cascade focus. Manage the process of Focus delegation between snippets inside Scene
     *
     * @param {Object} Snippet or jQuery
     * @param {String} direction of Focus delegation ("up", "down", "left", "right")
     */
    onFocusOut: function (snippet, direction) {
    },

    showExitAlert: function () {
      this.$lastFocused = Focus.focused;
      this.$el.showAlertConfirm(__("AppCloseApp"), 'close_app', null, null, 'cancel');
    },

    goOnline: function () {
      if (!Router.isSceneActive("offline")) {
        return;
      }

      this.checking(false);
      NbNetworkObserver.stopObserver();
      NbNetworkObserver.currentStatus = NbNetworkObserver.onlineStatus;
      App.throbberHide();

      var home = (typeof HOME !== "undefined" && HOME) ? HOME : Router.getScene("home");
      if (home) {
        home.dontRedraw = true;
        home.returningFromOffline = true;
        home.NBPLAYER_RETRY_AFTER_ERROR = true;
        Router.go("home");
        return;
      }

      Router.go("home");
    },

    goOffline: function () {
      var self = this;
      setTimeout(function () {
        App.throbberHide();
        self.checking(false);
      }, 1000)
    },

    checking: function (running) {
      if (running) {
        var focused = Focus.focused;
        if (typeof focused !== 'undefined' && focused != null) {
          Focus.blur(focused);
        }
      } else if (!running && this.$lastFocused != null) {
        Focus.to(this.$lastFocused);
      }

      this.isChecking = running;
    }

  });

  return Scene_Offline;

})(Scene);