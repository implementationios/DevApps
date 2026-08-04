/**
 * Application class
 *
 * @author AuroraTech
 * @class App
 * @singleton
 * @mixins Events
 * @mixins Deferrable
 */

App = (function (Events, Deferrable) {

  var App = {
    /**
     * @property {Boolean} networkStatus Network status, TRUE if connected
     */
    networkStatus: true
  };

  $.extend(true, App, Events, Deferrable, {
    /**
     * @event network
     * Will be called when network status changes
     * @param {Boolean} status
     */

    /**
     * Initialize Application
     */
    init: function () {

      var scope = this, $notifications = $("#notifications");

      // notification element
      if ($notifications.length)
        this.$notifications = $notifications;
      else {
        this.$notifications = $('<div id="notifications" />');
        $("body").append(this.$notifications);
      }
      // throbber interval
      this.throbberInt = null;
      // is throbber visible
      this.throbberIsShown = false;

      // monitor network connection
      setInterval(function () {
        scope.checkNetworkConnection();
      }, 1000);

      this.initRouter();


      this.splashscreen();
      //TEMPORAL LOGIN, after should call only this.splashscreen();
      // let self = this;
      // cv.clientLogin("1432031", "Nm7LwPk2", false, function(){
      // 	cv.getClientConfig(function() {

      // 		cv.getStreamingLicenses(function() {
      // 			let license = User.getLicenses()[8].key;
      // 			let pin = "3615";
      // 			cv.activateStreamingLicense(license, pin, function() {
      // 				self.splashscreen();
      // 			}, function() {  });
      // 		}, function() { });

      // 	}, function() { });
      // }, function(message){
      // 	cv.showError('Login error ' + message);
      // });

    },

    initRouter: function () {
      HOME = new Scene_Home;
      Router.addScene('splash', new Scene_Splash);
      Router.addScene('loading', new Scene_Loading);
      Router.addScene('home', HOME);
      Router.addScene('login', new Scene_Login);
      Router.addScene('licenses', new Scene_Licenses);
      Router.addScene('activation', new Scene_Activation);
      Router.addScene('offline', new Scene_Offline);
      //Router.addScene('voddetail', new Scene_VODDetail);
      //Router.go('splash') ;
    },

    checkNetworkConnection: function () {
      Device.checkNetworkConnection(function (status) {
        if (status !== this.networkStatus) {
          this.networkStatus = status;
          this.trigger('network', this.networkStatus);
        }
      }, this);
    },

    throbber: function (disable) {
      if (this.throbberIsShown) {
        $(".throbber").remove();
        //return; // only one instance of throbber
      }

      if (disable) {
        Control.disable(); // while throbber is loading, disable all controls
        Mouse.disable();
      }

      var $throbber = $("<div class='throbber' />");
      var $el = Router.activeScene.$el;
      if (!$el || $el.length == 0) {
        $el = $("body");
      }
      $el.append($throbber);

      this.throbberIsShown = true;

      // animation
      var pos = 0, width = 71, max = -781;
      this.throbberInt = setInterval(function () {
        pos -= width;
        if (pos < max)
          pos = 0;
        $throbber.css("background-position", pos + 'px 0px');
      }, 100);
    },

    throbberHide: function (enable) {
      if (this.throbberIsShown) {
        this.throbberIsShown = false;
        clearInterval(this.throbberInt);
        this.throbberInt = null;
        $(".throbber").remove();
        if (enable) {
          Control.enable();
          Mouse.enable();
        }
      }
    },

    notification: function (msg) {
      var $el = $('<div class="msg" />').html(msg);
      $('#notifications').html($el);

      $el.fadeIn();

      setTimeout(function () {
        if ($el) {
          $el.fadeOut();
        }
      }, 4000);
    },

    splashscreen: function () {
      Router.go('splash');

      setTimeout(function () {
        var API_BASE = CONFIG.app.baseUrl;
        var UDID = Storage.get('external_login_udid');

        // Helper para limpiar datos del storage
        function clearStorageData() {
          try {
            // Usar Storage.set con valores vacíos o null para limpiar
            if (Storage.set) {
              Storage.set('external_login_udid', '');
              Storage.set('user', '');
              Storage.set('password', '');
              Storage.set('licenses', '');
              Storage.set('license', '');
              Storage.set('pin', '');
              console.log('Storage limpiado');
            }
          } catch(e) {
            console.error('Error limpiando storage:', e);
          }
        }

        // Helper para ir al login con o sin credenciales guardadas
        function goToLoginOrHome() {
          if (User.hasCredentials()) {
            var user = User.getUsername();
            var password = User.getPassword();
            var licenses = User.getLicenses();
            var license = User.getLicense();
            var pin = User.getLicensePin();
            var hasLicenseCredentials = User.hasCredentialsLicense();

            //show login form
            Router.go('login');
            Scene_Login.prototype.showForm(user, password, true, false);

            //configure login helper options
            LoginHelper.configure(licenses, true, true);

            //call login helper to login and activate current license
            LoginHelper.loginAndActivateLicense(user, password, true, hasLicenseCredentials, license, pin, function() {
              console.log("Go to loading before home");
              Router.go('loading');
              //console.log("Go to home with all data (user, config and license activated)");
              //Router.go('home');
            }, function() {
              console.log("Login failure");
              Scene_Login.prototype.showForm('', '', false, true);
            }, function() {
              console.log("Go to licenses with user and config (pending license)");
              Router.go('licenses');
            });
          } else {
            Router.go('login');
            Scene_Login.prototype.showForm('', '', true, true);
          }
        }

        if(!UDID || !API_BASE){
          //No existe udid o no hay API_BASE configurada, ir a login normal
          console.log('No existe udid o no hay API_BASE configurada, ir a login normal');
          goToLoginOrHome();
        }else{
          //Existe udid, intentar login externo
          $.ajax({
            url: API_BASE + '/udid/validate/',
            method: 'GET',
            dataType: 'json',
            contentType: 'application/json; charset=UTF-8',
            data: {'udid': UDID },
            timeout: 10000,
            success: function (response) {
              var status = response && response.status;
              var udid = response && response.udid;
              console.log('UDID validado. Status:'+ status +', udid:', udid);

              if(status === 'used' && UDID === udid){
                //UDID válido y ya usado, intentar login automático
                console.log('UDID válido y ya usado, intentar login automático');
                goToLoginOrHome();
              }else if(status === 'revoked'){
                //UDID removido, ir a login normal
                console.log('UDID removido, limpiando credenciales');
                clearStorageData();
                goToLoginOrHome();
              }else if(status === 'pending'){
                //UDID pendiente, ir a pantalla de login
                console.log('UDID pendiente, ir a pantalla de login');
                Router.go('login');
                Scene_Login.prototype.showForm('', '', true, true);
              }else{
                // Cualquier otro caso: undefined, 'undefined', null, o valor inesperado
                console.log('UDID no válido o status inesperado (' + status + '), limpiando credenciales e ir a login normal');
                clearStorageData();
                goToLoginOrHome();
              }
            }, error: function(xhr, status, error) {
              console.log('Error validando UDID:', xhr.status, status, error, 'ir a login');
              var serverUnavailable = (xhr.status >= 500 || xhr.status === 0 || status === 'timeout');
              if (!serverUnavailable) {
                clearStorageData();
              }
              goToLoginOrHome();
            }
          })
        }
      }, 2000)
    },

    throbberIn: function ($el, disable) {
      if (this.throbberIsShown)
        return; // only one instance of throbber

      if (disable) {
        Control.disable(); // while throbber is loading, disable all controls
        Mouse.disable();
      }

      var left = $el.width / 2;
      var $throbber = $("<div class='throbber' style='left: " + left + "px' />");
      $el.append($throbber);

      this.throbberIsShown = true;

      // animation
      var pos = 0, width = 71, max = -781;
      this.throbberInt = setInterval(function () {
        pos -= width;
        if (pos < max)
          pos = 0;
        $throbber.css("background-position", pos + 'px 0px');
      }, 100);
    },


  });

  // Initialize this class when Main is ready
  Main.ready(function () {
    App.init();
  });

  return App;

})(Events);
