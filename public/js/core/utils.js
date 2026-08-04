jQuery.fn.extend({

  isInAlertMessage: function () {
    return this.data("parent-type") == "message";
  },

  isInAlertConfirm: function () {
    return this.data("parent-type") == "confirm";
  },

  isInAlertMessage: function (scene) {
    return scene.find(".nb-alert-message:visible").length > 0;
  },

  isInAlertConfirm: function (scene) {
    return scene.find(".nb-alert-confirm:visible").length > 0;
  },

  isInAlertInput: function (scene) {
    return scene.find(".nb-alert-input:visible").length > 0;
  },

  /**
   * 
   * @param {Text message (mandatory)} message 
   * @param {Tag to identify operation (mandatory)} tag 
   * @param {Text of ok button (to default text send null or empty string) } okText 
   * @param {Text of cancel button (to default text send null or empty string)} cancelText 
   * @param {ok or cancel string to focus default button (to default send null or empty string)} defaultButton 
   */
  showAlertConfirm: function (message, tag, okText, cancelText, defaultButton, asHtml) {
    var $modal = this.find(".nb-alert-confirm");
    if (asHtml) {
      $modal.find(".nb-alert-confirm-label").html(message);
    } else {
      $modal.find(".nb-alert-confirm-label").text(message);
    }

    var $okButton = $modal.find(".nb-alert-confirm-ok-button");
    var $cancelButton = $modal.find(".nb-alert-confirm-cancel-button");
    var $defaultButton = (defaultButton == null || defaultButton == "" || defaultButton == "ok") ? $okButton : $cancelButton;

    okText = (okText == "" || okText == null) ? __("SettingsOkButton") : okText;
    cancelText = (cancelText == "" || cancelText == null) ? __("SettingsCancelButton") : cancelText;

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

  /**
   * 
   * @param {Text message (mandatory)} message 
   * @param {Tag to identify operation (mandatory)} tag 
   * @param {Text of ok button (to default text send null or empty string) } okText 
   */
  showAlertMessage: function (message, tag, okText) {
    var $modal = this.find(".nb-alert-message");
    $modal.find(".nb-alert-message-label").html(message);

    var $okButton = $modal.find(".nb-alert-message-ok-button");
    okText = (okText == "" || okText == null) ? __("SettingsOkButton") : okText;
    $okButton.html(okText);
    $okButton.data("tag", tag);

    $modal.modal("show");

    $modal.on('shown.bs.modal', function () {
      Focus.to($okButton);
      $okButton.focus();
    });
  },

  closeAlert: function () {
    var $modal = this.closest(".nb-alert");

    if ($modal.length > 0) {
      $modal.modal('hide');
    }
  },

  closeAlert: function (scene) {
    var $modal = scene.find(".nb-alert");

    if ($modal.length > 0) {
      $modal.modal('hide');
    }
  },

  closeAlertThen: function (callback) {
    var $modal = this.closest(".nb-alert");

    if ($modal.length > 0) {
      $modal.modal('hide');
      setTimeout(function () { callback() }, 250);
    }
  },

  loadImage: function (src, placeholder) {
    var defaultPlaceholder = "assets/images/" + CONFIG.app.brand + "/placeholder_220x160.png";
    placeholder = placeholder == null || placeholder.length == 0 ? defaultPlaceholder : placeholder;
    this.attr("src", placeholder);

    if (src != null && src.length > 0) {
      this.error(function (e) {
        imgOnError($(this));
      });

      var self = this;
      setTimeout(function () {
        self.attr("src", src);
      }, 50);
    }
  },

  getHomeFocusableItemAt: function (top, left) {
    top = this.offset().top + top;
    left = this.offset().left + left;
    var itemAtPoint = document.elementFromPoint(left, top);

    if (CONFIG.developer.debug) {
      if ($("#debugFocusPosition").length == 0) {
        $("body").prepend("<div id='debugFocusPosition'></div>")
      }
      $("#debugFocusPosition").css({ "top": top + "px", "left": left + "px", "display": "block" });
    }

    if (typeof itemAtPoint != 'undefined' && itemAtPoint != null) {
      if ($(itemAtPoint).hasClass("focusable")) {
        return $(itemAtPoint);
      } else if ($(itemAtPoint).closest(".focusable").length > 0) {
        return $(itemAtPoint).closest(".focusable");
      }
    }

    return [];
  },

  getHomeRowAt: function (top, left) {
    top = this.offset().top + top;
    left = this.offset().left + left;
    var itemAtPoint = document.elementFromPoint(left, top);

    if (CONFIG.developer.debug) {
      if ($("#debugFocusPosition").length == 0) {
        $("body").prepend("<div id='debugFocusPosition'></div>")
      }
      $("#debugFocusPosition").css({ "top": top + "px", "left": left + "px", "display": "block" });
    }

    if (typeof itemAtPoint != 'undefined' && itemAtPoint != null) {
      if ($(itemAtPoint).closest(".row").length > 0) {
        return $(itemAtPoint).closest(".row");
      }
    }

    return [];
  }

});

function getDateFormatted(inDate, justTime) {

  if (justTime) {
    return inDate.local().format("HH:mm");
  }

  return inDate.local().calendar(null, {
    lastDay: '[Yesterday]',
    sameDay: '[Today]',
    nextDay: '[Tomorrow]',
    lastWeek: 'ddd DD MMM',
    nextWeek: 'ddd DD MMM',
    sameElse: function () {
      return "ddd DD MMM";
    }
  });
}

function imgOnError(event) {
  event.onerror = null;
  var $img = $(event);
  $img.unbind('error');
  $img.attr("src", "assets/images/" + CONFIG.app.brand + "/placeholder_220x160.png");
  $img.addClass("img-placeholder");
}

/**
 * Returns absolute (always positive) time difference between two dates 
 * @param {*} fromDate 
 * @param {*} toDate 
 * @param {*} unit 
 * @returns difference in unit required
 */
function getTimeDifference(fromDate, toDate, unit) {
  return Math.abs(fromDate.diff(toDate, unit));
}

/**
 * Returns time difference (positive or negative) between two dates 
 * @param {*} fromDate 
 * @param {*} toDate 
 * @param {*} unit 
 * @returns difference in unit required
 */
function getRealTimeDifference(fromDate, toDate, unit) {
  return fromDate.diff(toDate, unit);
}

function getStringDate(date, format) {
  return date.local().format(format);
}

function getTodayDate() {
  return moment();
}

function addSeconds(momentDate, seconds) {
  return momentDate.clone().add(seconds, "seconds");
}

function closeApp() {
  if (Device.isTIZEN || Device.isSAMSUNG) {
    Device.tizenObject.exit();
  } else {
    window.open('', '_self').close();
  }
}

// function addImgErrorEvent($images) {
// 	$images.error(function (e) {
//         var $img = $(this);

// if (typeof $img.data("placeholder") !== 'undefined' && $img.data("placeholder").length > 0 && $img.data("placeholder") != $img.attr("src")) {
//     $img.attr("src", $img.data("placeholder"));
// } else {
//     $img.attr("src", "assets/images/" + CONFIG.app.brand + "/placeholder_220x160.png");
//     //$img.addClass("img-placeholder");
// }
// });
// }

function addImgPlaceholder($images) {
  $images.each(function () {
    var placeholder = $(this).data("placeholder");
    if (typeof placeholder != 'undefined' && placeholder.length > 0) {
      $(this).parent().css("background", "url(" + placeholder + ") no-repeat center center / cover");
    } else {
      $(this).parent().css("background", "url(assets/images/" + CONFIG.app.brand + "/placeholder_220x160.png) no-repeat center center / cover");
    }
  });
}

function minutesToTimeString(timeInMinutes) {
  var negative = timeInMinutes < 0;
  timeInMinutes = Math.abs(timeInMinutes);
  var hours = Math.floor(timeInMinutes / 60);
  var minutes = Math.floor(timeInMinutes % 60);
  var response = ""

  if (hours >= 1) {
    response = hours + "hs ";
  }

  if (minutes > 0) {
    response += minutes + " min"
  }

  return (negative ? "-" : "") + response;
}

function secondsToTimeString(seconds) {
  var hours = Math.floor(seconds / 3600);
  var min = Math.floor((seconds - hours * 3600) / 60);
  var sec = seconds - hours * 3600 - min * 60;
  sec = Math.round(Math.round(sec * 100) / 100);

  return (hours > 0 ? (hours < 10 ? "0" + hours : hours) + ":" : "")
    + (min < 10 ? "0" + min : min) + ":"
    + (sec < 10 ? "0" + sec : sec);
}

$(function () {

  //addImgErrorEvent($("img"));

});