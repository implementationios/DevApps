Scene_Licenses = (function (Scene) {

  var Scene_Licenses = function () {
    this.construct.apply(this, arguments);
  };

  $.extend(true, Scene_Licenses.prototype, Scene.prototype, {
    /**
     * @inheritdoc Scene#init
     */
    init: function () {
      console.log('[Scene] init licenses scene');
      this.dontRedraw = false; // prevent to redraw scene
      this.viewport = $("#viewport");
      this.license = "";
      this.pin = "";
      this.licenses = [];
      this.$lastFocused = false;
    },

    /**
     * @inheritdoc Scene#create
     */
    create: function () {
      this.keepAlive = true;
      return $('#scene-licenses');
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
    activate: function (config) {
      App.throbber();
      var self = this;

      this.licenses = User.getLicenses();

      if (this.licenses && this.licenses.length > 0) {
        this.setLicensesData();
      } else {
        cv.getStreamingLicenses(function (licenses) {
          self.setResponseStreamingLicenses(licenses);
        }, function (result) {
          App.throbberHide();
          if (result.errorCode == "no_access_to_function") {
            Router.go('login');
            Scene_Login.prototype.showForm("", "", true, true);
          }
        });
      }

    },

    /**
     * @inheritdoc Scene#render
     */
    render: function () {

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

      var failIfInUse = true;

      if ($el.isInAlertConfirm(this.$el)) {
        if ($el.is(this.$nbAlertConfirmOkButton)) {
          failIfInUse = false;
          $el.closeAlert(this.$el);
          this.activateLicense(failIfInUse);
        } else if ($el.is(this.$nbAlertConfirmCancelButton)) {
          $el.closeAlert(this.$el);
          Focus.to(this.$firstFocusableItem);
        }
      } else if ($el.isInAlertMessage(this.$el)) {
        $el.closeAlert(this.$el);
        Focus.to(this.$firstFocusableItem);
      } else { //licenses table and logout option
        this.$firstFocusableItem = $el;
        var self = this;
        var tag = $el.data("tag");

        if (tag == "close_app") {
          $el.closeAlert(this.$el);
          closeApp();
          return;
        }

        if ($el.data("key").toString() == "logout") {
          cv.logout(function () {
            $("#divLicenses").html("");
            Router.go('login');
            self.destroyScene();
          });
          return;
        } else {
          this.license = $el.data("key").toString();
          this.pin = $el.data("pin").toString();
          this.activateLicense(failIfInUse);
        }
      }

    },

    destroyScene: function () {
      $("#divLicenses").html("");
      Router.clearHistory();
      Router.go('login');
    },
    /**
     * @inheritdoc Scene#onReturn
     */
    onReturn: function ($el, event) {
      if ($el.isInAlertConfirm(this.$el) || $el.isInAlertMessage(this.$el)) {
        $el.closeAlert(this.$el);
        Focus.to(this.$firstFocusableItem);
        return false;
      }

      this.$lastFocused = Focus.focused;
      this.$el.showAlertConfirm(__("AppCloseApp"), 'close_app', null, null, 'cancel');
      return false;
    },
    /**
     * @inheritdoc Scene#navigate
     */
    navigate: function (direction) {
      var $el = Focus.focused;

      if ($el.isInAlertMessage(this.$el) || $el.isInAlertConfirm(this.$el)) { // navigate on dialog
        this.manageFocusOnAlert(direction, $el.data("parent-type"));
      } else { // navigate on licenses table
        var $licensesList = $("#divLicenses");
        if (direction === 'down') {
          var $newFocus = Focus.focused.next("button");

          if (typeof $newFocus === 'undefined' || $newFocus.length == 0) {
            return;
          }

          Focus.to($newFocus);
        } else if (direction === 'up') {
          var $newFocus = Focus.focused.prev("button");

          if (typeof $newFocus === 'undefined' || $newFocus.length == 0) {
            $licensesList.animate({ scrollTop: 0 }, 200);
            return;
          }

          Focus.to($newFocus);
        }

        var $focusTo = Focus.focused;
        var currentTop = $focusTo.position().top;
        if (currentTop < 0) {
          $licensesList.scrollTop($licensesList.scrollTop() + currentTop - $focusTo.height());
        } else if ((currentTop + $focusTo.innerHeight()) > $licensesList.height()) {
          var jump = $licensesList.scrollTop() + $focusTo.innerHeight() + parseInt($focusTo.css('marginTop'));
          $licensesList.scrollTop(jump);
        }
      }

    },

    filterLicensesWithProducts: function(licenses) {
      return licenses.filter(function (license) {
        return license.products != null && license.products.trim().length > 0;
      });
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

    activateLicense: function (failIfInUse) {
      if (typeof this.license === undefined || this.license == null || this.license.length == 0) {
        return;
      }

      App.throbber();
      User.setLicenseToActivate(this.license);
      var self = this;
      this.$lastFocused = Focus.focused;
      if (CONFIG.automaticActivation && typeof this.pin !== undefined && this.pin != null && this.pin.length > 0) {
        //automatic activation
        cv.activateStreamingLicense(this.license, this.pin, failIfInUse, function () {
          Router.go("loading");
        }, function (errorCode) {
          console.log("Error activation license " + self.license + " with pin " + self.pin);

          if (errorCode == "license_already_in_use") {
            self.$el.showAlertConfirm(__("SettingsLicenseUsedContinueHere"), "license_already_in_use", null, null, null);
          } else {
            self.$el.showAlertMessage(__("SettingsErrorActivationMessage").replace("%s", self.license), 'activation', null);
          }
          App.throbberHide();
        });
      } else {
        // go to enter pin screen
        Router.go("activation");
      }

    },

    setResponseStreamingLicenses: function (licenses) {
      this.licenses = User.getLicenses(); //licenses are already stored in user data

      this.setLicensesData();
      // if (CONFIG.automaticActivation) {
      //   this.autoActivateLicense(0);
      // } else {
      //   this.setLicensesData();
      // }
    },

    // autoActivateLicense: function (index) {

    //   if (index >= this.licenses.length || index > CONFIG.app.maxAutoActivateLicense) {
    //     this.$lastFocused = Focus.focused;
    //     //this.$el.showAlertMessage(__("SettingsErrorAllLicensesInUse"), "error_autoactivation", null);
    //     this.setLicensesData();
    //     return;
    //   }

    //   var license = this.licenses[index].key;
    //   var pin = this.licenses[index].pin;

    //   if ((typeof license == 'undefined' || license == null || license.length == 0) && (typeof pin == 'undefined' || pin == null || pin.length == 0)) {
    //     this.autoActivateLicense(index + 1);
    //     return;
    //   }

    //   User.setLicenseToActivate(license);
    //   var self = this;

    //   cv.activateStreamingLicense(license, pin, true, function () {
    //     Router.go("home");
    //   }, function (errorCode) {
    //     console.log("Error auto activation license " + license + " with pin " + pin);
    //     self.autoActivateLicense(index + 1);
    //   });
    // },

    setLicensesData: function () {
      this.$el.find("#settingsLicenseInstructionsLabel").text(__("SettingsLicenseInstructionsNoPIN"));

      // Filtrar licencias que tienen productos
      var validLicenses = this.filterLicensesWithProducts(this.licenses);

      var html = "";
      validLicenses.forEach(function (license) {
        html += '<button type="button" class="list-group-item focusable" data-key="' + license.key + '" data-pin="' + license.pin + '">'
          + '<b>' + license.key + '</b><p class="font-weight-normal">' + license.products + '</p>'
          + '<b>' + (license.licenseName != null ? license.licenseName : "") + '</b>'
          + '</button>';
      });

      // Agregar opción de cerrar sesión
      html += '<button type="button" class="list-group-item focusable" style="text-align: center" data-key="logout">'
        + '<b>' + __("MenuLogout") + '</b><p class="font-weight-normal"></p>'
        + '</button>';

      $("#divLicenses").html(html);

      this.$firstFocusableItem = $("#divLicenses").find(".focusable").first();
      Focus.to(this.$firstFocusableItem);
      App.throbberHide();
    },
  });

  return Scene_Licenses;

})(Scene);
