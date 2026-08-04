ParentalControlDlg = (function (Events) {

  var ParentalControlDlg = {};

  $.extend(true, ParentalControlDlg, Events, {
    contentType: null,
    contentObject: null,
    init: function () {
    },

    refreshElReferences: function ($container) {
      if (!$container || $container.length == 0) {
        return false;
      }

      this.$parentalControlDlg = $container.find(".pin-alert-input:first");
      if (this.$parentalControlDlg.length == 0) {
        $container.append(this.getHmlContent());
        this.$parentalControlDlg = $container.find(".pin-alert-input:first");
      }

      if (!this.$parentalControlDlg || this.$parentalControlDlg.length == 0) {
        return false;
      }

      this.$container = $container;
      this.$input = this.$parentalControlDlg.find("input:first");
      this.$label = this.$parentalControlDlg.find(".pin-alert-input-label:first");
      this.$okButton = this.$parentalControlDlg.find(".pin-alert-input-ok-button:first");
      this.$cancelButton = this.$parentalControlDlg.find(".pin-alert-input-cancel-button:first");
      this.$alertMessage = this.$parentalControlDlg.find(".pin-alert-message:first");

      return true;
    },

    getHmlContent: function () {
      return '<div class="modal fade alerts nb-alert pin-alert-input" role="dialog">'
        + '<div class="modal-dialog modal-center">'
        + '<div class="modal-content">'
        + '<div class="modal-body">'

        + '<div>'
        + '<label class="pin-alert-input-label col-form-label" style="font-size: 1.2em"></label>'
        + '<input type="password" class="form-control-lg focusable inputuser" data-parent-type="input">'
        + '</div>'

        + '</div>'
        + '<div class="modal-footer">'
        + '<button type="button" class="btn-default btn-lg focusable pin-alert-input-cancel-button" data-dismiss="modal" data-parent-type="input"></button>'
        + '<button type="button" class="btn-default btn-lg focusable pin-alert-input-ok-button" data-dismiss="modal" data-parent-type="input"></button>'
        + '<p class="pin-alert-message" style="text-align: center; margin-bottom: 1em;"></p>'
        + '</div>'
        + '</div></div></div>';;
    },

    show: function ($container, $lastFocused, type, item, okActions, cancelActions) {

      if (!this.refreshElReferences($container)) {
        console.log("Not possible to open dialog, check references and parameters.");
        return;
      }

      var self = this;
      this.$lastFocused = $lastFocused;
      this.okActions = okActions;
      this.cancelActions = cancelActions;
      this.contentType = type;
      this.contentObject = item;
      
      this.$input.val("");
      this.$label.text(__("ServicesAndTVEnterParentalControlPin"));
      this.$okButton.text(__("SettingsOkButton"));
      this.$cancelButton.text(__("SettingsCancelButton"));
      this.$alertMessage.text("");
      this.$parentalControlDlg.modal("show");

      this.$parentalControlDlg.on('shown.bs.modal', function () {
        Focus.to(self.$input);
        self.$input.focus();
      });
    },

    isShowed: function () {
      return this.$parentalControlDlg && this.$parentalControlDlg.hasClass("in");
    },

    navigate: function (direction) {
      var $focused = Focus.focused;

      if (direction == "up" && ($focused.is(this.$okButton) || $focused.is(this.$cancelButton))) {
        Focus.to(this.$input);
      } else if (direction == "down" && $focused.is(this.$input)) {
        Focus.to(this.$okButton);
      } else if (direction == "left" && $focused.hasClass("btn-default")) {
        Focus.to($focused.prev("button:visible"));
      } else if (direction == "right" && $focused.hasClass("btn-default")) {
        Focus.to($focused.next("button:visible"));
      }
    },

    onEnter: function ($el) {
      if ($el.is(this.$okButton) || $el.is(this.$input)) {
        this.validatePin();
      } else if ($el.is(this.$cancelButton)) {
        this.close(this.cancelActions);
      }
    },

    close: function (callback) {
      this.$parentalControlDlg.modal("hide");

      var self = this;
      setTimeout(function () {
        if (self.$lastFocused) {
          Focus.to(self.$lastFocused);
        }
        if (callback) {
          callback();
        }
      }, 250);
      this.contentType = null;
      this.contentObject = null;
    },

    validatePin: function () {
      this.$alertMessage.text("");
      var pin = this.$input.val();

      if (pin.length == 0) {
        return;
      }

      if (pin == User.getLicensePin()) {
        this.close(this.okActions);
      } else {
        this.$alertMessage.text(__("SettingsPINError"));
      }
    }

  });

  return ParentalControlDlg;
})(Events);