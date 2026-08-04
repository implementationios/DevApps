Scene_Activation = (function (Scene) {

  var Scene_Activation = function () {
    this.construct.apply(this, arguments);
  };

  $.extend(true, Scene_Activation.prototype, Scene.prototype, {
    /**
     * @inheritdoc Scene#init
     */
    init: function () {
      console.log('[Scene] init license activation scene');
      //this.dontRedraw = false; // prevent to redraw scene
      this.viewport = $("#viewport");
      this.license = "";

      // var input = new Input();
      // input.create(this.$el.find("#containerLicensePin"));
      // input.blur();
      // this.input = input;
    },

    /**
     * @inheritdoc Scene#create
     */
    create: function () {
      this.keepAlive = true;
      return $('#scene-activation');
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

    },

    /**
     * @inheritdoc Scene#render
     */
    render: function () {
      this.$el.find("#settingsEnterPINMessageLabel").text(__("SettingsEnterPINMessage"));
      this.$el.find("#btnActivate").text(__("SettingsOkButton"));
      this.$el.find("#txtLicensePin").text(__("SettingsEnterPIN"));
      this.license = User.getLicenseToActivate();
      if (this.license.length > 0) {
        $("#labelLicenseToActivate").html(this.license);
      }
    },

    destroy: function () {
      this.keepAlive = false;
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
      if ($el.attr("id") == "btnActivate") {
        this.activateLicense();
      } else if ($el.attr("id") == "alertModalButton") {
        closeAlertMessage();
        Focus.to($('#btnActivate'));
        return;
      }
    },
    /**
     * @inheritdoc Scene#onReturn
     */
    onReturn: function ($el, event) {
      if (App.dialog) {
        App.dialog.onClose();
        return false;
      }
      Router.goBack();
      return false;
    },
    /**
     * @inheritdoc Scene#navigate
     */
    navigate: function (direction) {
      if (direction === 'down') {
        Focus.to($("#btnActivate"));
      } else if (direction === 'up') {
        Focus.to($("#txtLicensePin"));
      }
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

    /**
     * Cascade focus. Manage the process of Focus delegation between snippets inside Scene
     *
     * @param {Object} Snippet or jQuery
     * @param {String} direction of Focus delegation ("up", "down", "left", "right")
     */
    onFocusOut: function (snippet, direction) {
    },

    setLicense: function (license) {
      this.license = license;
    },

    activateLicense: function () {
      var pin = $("#txtLicensePin").val();
      // var pin = this.input.$el.val();
      var self = this;
      var failIfInUse = false;

      if (pin.length > 0) {
        // cv.activateStreamingLicense(self.license, pin, failIfInUse, function () {
        //   Router.go("home");
        // }, function (error) {
        //   console.log("Error activation license " + self.license + " with pin " + pin + ". Error: " + error);
        //   self.$el.showAlertMessage(__("SettingsErrorActivationMessage").replace("%s", self.license));
        // });
        LoginHelper.configure([], false, failIfInUse);
        LoginHelper.activateLicense(this.license, pin, -1, function () { //sucessfull
          Router.go("loading");
        }, function (error) { //failure
          console.log("Error activation license " + self.license + " with pin " + pin + ". Error: " + error);
          self.$el.showAlertMessage(__("SettingsErrorActivationMessage").replace("%s", self.license));
        });
      }


    }
  });

  return Scene_Activation;

})(Scene);
