var splash = {
  url_cv01: "https://cv01.panaccess.com/",
  url: "https://cv01.panaccess.com/",
  apiToken: "iKBHPqlolcxiVgZrAcvk",
  sessionId: null,
  userName: null,
  password: null,
  loginParamOS: 'HTML5',
  appVersion: '1',
  branding: 'Panaccess',
  unsuccessfulLoginsTreshold: 5,
  unsuccessfulLoginsDelay: 5000,
  failCallback: function () {
    window.location = 'login.html';
  },
  initialized: false,
  init: function (successCallback, redirectIfNotLoggedIn) {
    this.initialized = true;
    var _self = this;

    this.sessionId = Storage.get('cvSessionId');

    if (typeof redirectIfNotLoggedIn != 'undefined') {
      if (typeof redirectIfNotLoggedIn == 'function') {
        _self.failCallback = redirectIfNotLoggedIn;
      } else if (!redirectIfNotLoggedIn) {
        _self.failCallback = function () {
          this.updateLayout(false);
        }
      }
    }
    if (typeof successCallback != 'undefined') {
      _self.successCallback = successCallback;
    } else {
      _self.successCallback = function () {
        this.updateLayout(true);
      };
    }

    successCallback();
  },

  updateLayout: function (loggedIn) {
    cv.translateLayout();
    if (loggedIn) {
      // Modify UI (logged)
    } else {
      // Modify UI (not logged)
    }
  },


};