var NbNetworkObserver = {
  checkingConnection: false,
  intervalId: 0,
  secondsToCheck: 20,
  offlineStatus: 0,
  onlineStatus: 1,
  currentStatus: 1, //0: offline, 1: online (internet connection)
  forceCallback: false,

  startObserver: function (onlineCallback, offlineCallback) {
    this.forceCallback = false;
    this.start(onlineCallback, offlineCallback);
  },

  startObserverFromOffline: function (onlineCallback, offlineCallback) {
    this.forceCallback = true;
    this.start(onlineCallback, offlineCallback);
  },

  getSameOriginCheckUrl: function () {
    var path = location.pathname || "/";
    if (path.indexOf(".") !== -1) {
      path = path.substring(0, path.lastIndexOf("/") + 1);
    }
    if (path.charAt(path.length - 1) !== "/") {
      path += "/";
    }
    return location.protocol + "//" + location.host + path + "img/Person.png?_nc=" + Date.now();
  },

  getExternalCheckUrl: function () {
    if (typeof cv !== "undefined" && cv.url && cv.url.length > 0) {
      var sep = cv.url.indexOf("?") >= 0 ? "&" : "?";
      return cv.url + sep + "_nc=" + Date.now();
    }
    return null;
  },

  /**
   * Comprueba conectividad real contra el backend (sin CORS vía fetch no-cors o jsonp).
   * El ping same-origin en localhost da falso positivo si el dev server sigue activo.
   */
  probeExternalConnection: function (onlineCallback, offlineCallback) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      offlineCallback();
      return;
    }

    var externalUrl = this.getExternalCheckUrl();
    if (!externalUrl) {
      $.ajax({
        url: this.getSameOriginCheckUrl(),
        timeout: 3000,
        cache: false,
        success: function () {
          onlineCallback();
        },
        error: function () {
          offlineCallback();
        }
      });
      return;
    }

    if (typeof fetch === "function") {
      fetch(externalUrl, { mode: "no-cors", cache: "no-store" })
        .then(function () {
          onlineCallback();
        })
        .catch(function () {
          offlineCallback();
        });
      return;
    }

    var callbackName = "nbNetCheck_" + Date.now();
    window[callbackName] = function () {
      try {
        delete window[callbackName];
      } catch (e) {
        window[callbackName] = undefined;
      }
      onlineCallback();
    };

    $.ajax({
      url: externalUrl,
      dataType: "jsonp",
      jsonp: "jsonp",
      jsonpCallback: callbackName,
      timeout: 5000,
      cache: false,
      success: function () {
        onlineCallback();
      },
      error: function () {
        offlineCallback();
      }
    });
  },

  start: function (onlineCallback, offlineCallback) {
    var self = this;
    this.stopObserver();
    console.log("NbNetworkObserver started");
    self.checkInternetConnection(onlineCallback, offlineCallback);
    this.intervalId = setInterval(function () {
      self.checkInternetConnection(onlineCallback, offlineCallback);
    }, self.secondsToCheck * 1000);
  },

  stopObserver: function () {
    if (this.intervalId != 0) {
      console.log("NbNetworkObserver stopped");
      clearInterval(this.intervalId);
      this.intervalId = 0;
    }
  },

  checkInternetConnection: function (onlineCallback, offlineCallback) {
    if (this.checkingConnection) {
      return;
    }

    var self = this;
    this.checkingConnection = true;

    this.probeExternalConnection(function () {
      self._handleCheckResult(true, onlineCallback, offlineCallback);
    }, function () {
      self._handleCheckResult(false, onlineCallback, offlineCallback);
    });
  },

  _handleCheckResult: function (isOnline, onlineCallback, offlineCallback) {
    if (isOnline) {
      if (this.currentStatus == this.offlineStatus || this.forceCallback) {
        this.currentStatus = this.onlineStatus;
        onlineCallback();
      } else {
        this.currentStatus = this.onlineStatus;
      }
    } else {
      if (this.currentStatus == this.onlineStatus || this.forceCallback) {
        this.currentStatus = this.offlineStatus;
        offlineCallback();
      } else {
        this.currentStatus = this.offlineStatus;
      }
    }

    this.checkingConnection = false;
  },

  simpleCheckInternetConnection: function (onlineCallback, offlineCallback) {
    this.probeExternalConnection(onlineCallback, offlineCallback);
  }

};
