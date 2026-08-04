
var NBAlert = {

  okActions: null,
  cancelActions: null,
  currentScene: null,
  $nbAlertInputMessage: null,
  $nbAlertInputOkButton: null,
  $nbAlertInputCancelButton: null,

  showAlertInput: function (scene, message, tag, okText, cancelText, defaultButton, secure, okActions, cancelActions) {

    this.okActions = okActions;
    this.cancelActions = cancelActions;
    this.currentScene = scene;

    var $modal = scene.$el.find(".nb-alert-input");
    this.$nbAlertInputMessage = $modal;
    $modal.find(".nb-alert-input-label").text(message);
    var $input = $modal.find("input:first");
    $input.val("");

    var $okButton = $modal.find(".nb-alert-input-ok-button");
    var $cancelButton = $modal.find(".nb-alert-input-cancel-button");
    this.$nbAlertInputOkButton = $okButton;
    this.$nbAlertInputCancelButton = $cancelButton;
    var $defaultButton = (defaultButton == null || defaultButton == "" || defaultButton == "ok") ? $input : $okButton;

    okText = (okText == "" || okText == null) ? __("SettingsOkButton") : okText;
    cancelText = (cancelText == "" || cancelText == null) ? __("SettingsCancelButton") : cancelText;

    if (secure) {
      $input.attr("type", "password");
    } else {
      $input.attr("type", "text");
    }

    $okButton.text(okText);
    $cancelButton.text(cancelText);
    $okButton.data("tag", tag);
    $cancelButton.data("tag", tag);
    $modal.modal("show");

    $modal.on('shown.bs.modal', function () {
      Focus.to($defaultButton);
      $defaultButton.focus();
    });

  },

  isInAlertInput: function (scene) {
    return scene.find(".nb-alert-input:visible").length > 0;
  },

  navigate: function (direction, type) {

    if (type == 'input') {
      var $focused = Focus.focused;
      var $input = this.$nbAlertInputMessage.find("input:first");
      var $toFocus = [];

      if (direction == 'left') {
        if ($focused.is(this.$nbAlertInputOkButton)) {
          $toFocus = this.$nbAlertInputCancelButton;
        }
      } else if (direction == 'right') {
        if ($focused.is(this.$nbAlertInputCancelButton)) {
          $toFocus = this.$nbAlertInputOkButton;
        }
      } else if (direction == 'up') {
        if ($focused.is(this.$nbAlertInputOkButton) || $focused.is(this.$nbAlertInputCancelButton)) {
          $toFocus = $input;
        }
      } else if (direction == 'down') {
        if ($focused.is($input)) {
          $toFocus = this.$nbAlertInputOkButton;
        }
      }

      if ($toFocus && $toFocus.length > 0) {
        Focus.to($toFocus);
      }

      return;
    }
  },

  enter: function (scene) {
    var $el = scene.$el;
    var $focused = Focus.focused;
    var $input = this.$nbAlertInputMessage.find("input:first");

    if ($focused.is(this.$nbAlertInputOkButton)) {
      this.okButtonAction($el);
    } else if ($focused.is(this.$nbAlertInputCancelButton)) {
      if (typeof this.cancelActions != 'undefined' && this.cancelActions != null) {
        this.cancelActions();
      } else {
        this.cancelButtonAction($el);
      }
    } else if ($focused.is($input) && $input.val() != "") {
      this.okButtonAction($el);
    }
  },

  okButtonAction: function ($el) {
    if (typeof this.okActions != 'undefined' && this.okActions != null) {
      this.okActions();
    } else {
      this.cancelButtonAction($el);
    }
  },

  cancelButtonAction: function ($el) {
    this.close();
  },

  getInputText: function () {
    var $input = this.$nbAlertInputMessage.find("input:first");

    if ($input && $input.length > 0) {
      return $input.val();
    }

    return "";
  },

  close: function () {
    this.$nbAlertInputOkButton.closeAlert(this.currentScene.$el);
    Focus.to(this.currentScene.$lastFocused);
  }

}