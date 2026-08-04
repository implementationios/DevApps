var LoginHelper = {
  licenses: [],
  activationRecursive: false,
  activationFailIfInUse: true,

  configure: function(licenses, activationRecursive, activationFailIfInUse) {
    this.licenses = licenses;
    this.activationRecursive = activationRecursive;
    this.activationFailIfInUse = activationFailIfInUse;

    if (licenses && licenses.length > 0) {
      User.setLicenses(JSON.stringify(licenses));
    }
  },

  loginAndActivateLicense: function (user, password, automatic, hasLicenseCredentials, license, pin, cbActivationSuccessfull, cbLoginFailed, cbActivationFailed) {
    var self = this;

    cv.clientLogin(user, password, automatic, function () {

      if (self.licenses.length == 0 || !automatic) {
        self.getLicenses(function () {
          hasLicenseCredentials = self.licenses.length > 0;
          // after request licenses try continue license activation
          self.loginSucessfull(hasLicenseCredentials, license, pin, cbLoginFailed, cbActivationSuccessfull, cbActivationFailed);
        });
      } else {
        self.loginSucessfull(hasLicenseCredentials, license, pin, cbLoginFailed, cbActivationSuccessfull, cbActivationFailed);
      }

    }, function (result) {
      if (cbLoginFailed) {
        cbLoginFailed(result);
      }
    });
  },

  getLicenses: function (callback) {
    var self = this;

    cv.getStreamingLicenses(function (licenses) {
      self.licenses = User.getLicenses(); //get from user data (are already stored when calling getStreamingLicenses)

      if (callback) {
        callback();
      }
    }, function (result) {
      console.log("getLicenses error. Error: " + result);
    });
  },

  loginSucessfull: function (hasLicenseCredentials, license, pin, cbLoginFailed, cbActivationSuccessfull, cbActivationFailed) {
    var self = this;
    
    cv.getClientConfig(function () {

      if (!hasLicenseCredentials || (!CONFIG.automaticActivation && license.length == 0)) {
        if (cbActivationFailed) {
          cbActivationFailed();
        }
        return;
      }

      if (license != null && license != '') {
        self.changeFirstLicense(license, pin);
      }

      self.autoActivateLicense(0, cbActivationSuccessfull, cbActivationFailed);
    }, function (result) {
      console.log("Has user but pending config and license. Go to Login");
      if (cbLoginFailed) {
        cbLoginFailed(result);
      }
    });
  }, 

  changeFirstLicense: function (license, pin) {
    if (this.licenses.length == 0) {
      return;
    }

    if (this.licenses[0].key == license) {
      return;
    }

    var filtered = this.licenses.filter(function (item) {
      return item.key != license;
    });

    var licenseObj = {
      key: license,
      pin: pin
    };

    this.licenses = filtered;
    this.licenses.unshift(licenseObj);
  },

  autoActivateLicense: function (index, cbActivationSuccessfull, cbActivationFailed) {
    // debugger;
    if (index >= this.licenses.length || index > CONFIG.app.maxAutoActivateLicense || (index > 0 && !this.activationRecursive)) {
      if (cbActivationFailed) {
        cbActivationFailed();
      }
      return;
    }

    var license = this.licenses[index].key;
    var pin = this.licenses[index].pin;
    console.log("Trying to activate license " + license + " (index " + index + ")");

    if ((typeof license == 'undefined' || license == null || license.length == 0) && (typeof pin == 'undefined' || pin == null || pin.length == 0)) {
      this.autoActivateLicense(index + 1);
      return;
    }

    this.activateLicense(license, pin, index, cbActivationSuccessfull, cbActivationFailed);
  },

  activateLicense: function (license, pin, index, cbActivationSuccessfull, cbActivationFailed) {
    var self = this;
    User.setLicenseToActivate(license);

    cv.activateStreamingLicense(license, pin, this.activationFailIfInUse, function () {
      console.log("License activated successfully: " + license + " (index: " + index + ")");
      console.log("Get config again to update parameters.");

      //get config again to update parameters
      cv.getClientConfig(function () {
        console.log("getClientConfig successfull");
        
        if (cbActivationSuccessfull) {
          cbActivationSuccessfull();
        }  
      }, function (result) {
        console.log("getClientConfig failed after license activation. Error: " + result);
        
        if (cbActivationSuccessfull) {
          cbActivationSuccessfull();
        }
      });
    }, function (error) {
      console.log("Error auto activation license " + license + " with pin " + pin + ". Error: " + error);

      if (index >= 0) {
        index = index + 1;
        self.autoActivateLicense(index, cbActivationSuccessfull, cbActivationFailed);
      } else {
        if (cbActivationFailed) {
          cbActivationFailed();
        }
      }
    });
  },

  // create functions to:
  /*
  cv.loggedIn(function(e) { console.log(e); }, function(e) { console.log(e); })
  if answer is false then:

  loginAndActivateLicense (login and activate license)
    

   */

  checkSessionAndReactivateIfNeeded: function (failIfInUse, callback) {
    var self = this;

    cv.loggedIn(function (result) {
      if (result) {
        console.log("User is logged in, reactivating license.");
        self.reactivateLicense(failIfInUse, callback);
      } else {
        console.log("User is not logged in, reactivating session and license.");
        self.reactivateSession(callback);
      }
    }, function (error) {
      console.log("User is not logged in, trying to reactivate session and license.");
      console.log("Error checking user session: " + error);
      self.reactivateSession(callback);
    });
  },

  reactivateLicense: function (failIfInUse, callback) {
    var license = User.getLicense();
    var pin = User.getLicensePin();

    cv.activateStreamingLicense(license, pin, failIfInUse, function () {
      callback(true);
    }, function (errorCode) {
      callback(false, errorCode);
    });
  },

  reactivateSession: function(callback) {
    var user = User.getUsername();
    var password = User.getPassword();
    var licenses = User.getLicenses();
    var license = User.getLicense();
    var pin = User.getLicensePin();
    var hasLicenseCredentials = User.hasCredentialsLicense();

    //configure login helper options
    LoginHelper.configure(licenses, true, false);

    //call login helper to login and activate current license
    LoginHelper.loginAndActivateLicense(user, password, true, hasLicenseCredentials, license, pin, function() {
      console.log("reactivateSession: login and activation successfull");
      if (callback) {
        callback(true);
      }
    }, function() {
      console.log("reactivateSession: login failure");
      if (callback) {
        callback(false, "session_error");
      }
    }, function() {
      console.log("reactivateSession: activation failure");
      if (callback) {
        callback(false, "activation_error");
      }
    });
  }

};
