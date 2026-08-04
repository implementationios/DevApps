Scene_Login = (function (Scene) {

  var Scene_Login = function () {
    this.construct.apply(this, arguments);
  };

  $.extend(true, Scene_Login.prototype, Scene.prototype, {
    /**
     * @inheritdoc Scene#init
     */
    init: function () {
      //console.log('[Scene] init login scene');
      this.dontRedraw = true; // prevent to redraw scene
      this.userId = $("#txtLoginUserId");
      this.password = $("#txtLoginPassword");
      this.isVisible = $("#togglePassword");
      this.logging = false;
      this.focusCandidate = null;
      this.externalLoginRequest = null;
      this.externalLoginInProgress = false;
      this.clientelement()
      this.changeColor()
      this.udidClientElement();
      LoginUdid.init(this.$el);
    },

    /**
     * @inheritdoc Scene#create
     */
    create: function () {
      $(".login-div").hide();
      this.keepAlive = true;
      return $('#scene-login');
    },

    loginOptions: function () {

    },

    createSocket: function (data) {

    }, 

    resetHistory: function () {
      Router.history.shift();
    },

    changeColor: function () {
      if (CONFIG.app.brand === "jrmax") {
        const inputs = document.querySelectorAll(".sec-login .login-input, .sec-licenses,.login-input");
        inputs.forEach(input => {
          input.style.setProperty("color", "black", "important"); // Aplica !important
        });
      }
    },

    /**
     * @inheritdoc Scene#activate
     */
    activate: function (config) {
      //console.log("activate");
    },

    /**
     * @inheritdoc Scene#render
     */
    render: function () {
      //console.log("render");
      this.$el.find("#loginWelcomeLabel").text(__("LoginWelcome"));
      this.$el.find("#txtLoginUserId").attr("placeholder", __("LoginUsername"));
      this.$el.find("#txtLoginPassword").attr("placeholder", __("LoginPassword"));
      this.$el.find("#btnLoginSubmit").text(__("LoginLoginButton"));
      this.$el.find("#btnRegisterSubmit").text(__("RegisterButton"));
      this.$el.find("#loginRegisterLabel").text(__("LoginRegisterTitle"));

      this.$el.find('#btnUdidSubmit').text(__("ButtonUdidLogin"));
      this.$el.find('#externalLoginTitle').text(__("ExternalLoginTitle"));
      this.$el.find('#externalLoginStatus').text(__("ExternalLoginWaitingMessage"));
      this.$el.find('#externalLoginCodeHint').text(__("ExternalLoginCodeHint"));
      this.$el.find('#btnCancelExternalLogin').text(__("CancelButton"));
      this.$el.find('#btnRetryExternalLogin').text(__("RetryButton"));

    },

    showForm: function (user, password, animated, editable) {
      $(".login-div").hide();

      $(".login-div").fadeIn(animated ? 250 : 0, function () {
        $(".login-div").show();
        $("#txtLoginUserId").val(user);
        $("#txtLoginPassword").val(password);

        if (editable) {
          App.throbberHide();
          $('#btnLoginSubmit').show();
          Focus.to($("#txtLoginUserId"));
        } else {
          App.throbber();
          $('#btnLoginSubmit').hide();
        }
      });
    },

    destroy: function () {
      this.keepAlive = false;
      if (this.sockets) {
        Object.keys(this.sockets).forEach(function (key) {
          this.sockets[key].close();
        }.bind(this))
      }
      this.$el.find('.login-qr .explain-steps').html('');
      this.$el.find('.login-code .explain-steps').html('');
      this.$el.find('.login-qr .code').html('');
      this.$el.find('.login-code .code').html('');
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

    setFocusCandidate: function ($el) {
      $(".focus-candidate").removeClass("focus-candidate");
      this.focusCandidate = $el;
      if ($el != null) {
        Focus.blur($el);
        this.focusCandidate.addClass("focus-candidate");
      }
    },

    /**
     * Abre el teclado propio (Keyboard) sobre un campo de texto readonly
     * (usuario/password), en vez de depender del teclado nativo del TV.
     * @param {Object} $el jQuery del <input readonly> a editar
     */
    openKeyboardForField: function ($el) {
      var self = this;
      var adapter = new InputAdapter($el);

      // Keyboard.exit() ya devuelve el foco al elemento que estaba enfocado
      // antes de abrir el teclado (this.$saveFocus); solo hace falta quitar
      // el listener "exit" (era .one-shot, ver comentario en events.js sobre
      // por qué se prefiere .on/.off explícito en vez de .one()).
      function onExit() {
        Keyboard.off('exit', onExit, self);
      }
      Keyboard.on('exit', onExit, self);

      Keyboard.show(adapter);

      // Sugerencias predictivas SOLO en el campo de usuario (nunca en la
      // contraseña): usuarios usados antes en este dispositivo, para no
      // tener que re-tecletear el mismo nombre de usuario largo cada vez.
      // Keyboard.show() ya resetea suggestionSource/suggestions al abrir,
      // así que no hace falta un "else" para limpiar el de contraseña.
      if ($el.is(this.userId)) {
        Keyboard.setSuggestionSource(this.getRecentUsernames());
      }
    },
    /**
     * Usuarios ingresados antes en este dispositivo (para autocompletar el
     * campo de usuario), más nuevo primero. Persistido vía el módulo Storage
     * (localStorage con prefijo de marca), mismo mecanismo ya usado en el
     * resto de la app.
     * @returns {Array<String>}
     */
    getRecentUsernames: function () {
      var list = Storage.get('recentLoginUsernames');
      return $.isArray(list) ? list : [];
    },
    /**
     * Agrega (o mueve al frente si ya existía) un usuario al historial,
     * hasta un máximo de 5. Ignora vacíos.
     * @param {String} user
     */
    addRecentUsername: function (user) {
      if (!user || !user.trim().length) return;

      var trimmed = user.trim();
      var lower = trimmed.toLowerCase();
      var list = this.getRecentUsernames().filter(function (u) {
        return String(u).toLowerCase() !== lower;
      });

      list.unshift(trimmed);
      if (list.length > 5) list = list.slice(0, 5);

      Storage.set('recentLoginUsernames', list);
    },
    clientelement: function () {
      try {
        // Mostrar registro/QR según bandera de configuración (LoginFlags.QR → CONFIG.app.QR)
        if (CONFIG.app && CONFIG.app.QR) {
          var $register = $('.register');
          if ($register.length) {
            $register.css('display', 'block');
          }         }
      } catch (error) {
        console.error("Error al mostrar el elemento de registro:", error);
      }
    },
    showRegisterPopup: function() {
      // Primero eliminar cualquier popup existente
      this.$el.find('.register-popup').remove();

      // Si no hay QR configurado, no mostrar popup
      if (!CONFIG.app || !CONFIG.app.QR || !CONFIG.app.QRUrl) {
        return;
      }

      var popupContent = `
        <div class="register-popup">
          <p class="textRegister"></p>
          <div id="qrcode"></div>
          <button class="btn-default btn-lg focusable" id="btnClosePopup"></button>
        </div>
      `;

      this.$el.append(popupContent);
      this.updatePopupTexts();

      // Generar el código QR
      new QRCode(document.getElementById("qrcode"), {
        text: CONFIG.app.QRUrl,
        width: 256,
        height: 256
      });

      // Enfocar el botón de cerrar
      Focus.to($('#btnClosePopup'));
    },

    updatePopupTexts: function() {
      this.$el.find('#btnClosePopup').text(__("CloseButton"));
      this.$el.find('.textRegister').text(__("TextRegister"));
    },

    closeRegisterPopup: function() {
      var $popup = this.$el.find('.register-popup');
      $popup.fadeOut(250, function() {
        $popup.remove();
        Focus.to($('#btnRegisterSubmit'));
      });
    },

    togglePasswordVisibility: function() {
      var passwordField = this.password;
      var toggleButton = $('#togglePassword');

      if (passwordField.attr("type") === "password") {
          passwordField.attr("type", "text");
          toggleButton.text("visibility_off");
      } else {
          passwordField.attr("type", "password");
          toggleButton.text("visibility");
      }
    },

    udidClientElement: function () {
      try {
        if (CONFIG.app.udidEnabled) {
          var $udid = $('.login-udid');
          if ($udid.length) {
            $udid.css('display', 'block');
          }         }
      } catch (error) {
        console.error("Error al mostrar el elemento de registro:", error);
      }
    },

    /**
     * @inheritdoc Scene#onEnter
     */
    onEnter: function ($el, event) {
      if (this.focusCandidate != null) {
        Focus.to(this.focusCandidate);
        this.setFocusCandidate(null);
        return;
      }
      if (event.target.id == "txtLoginUserId" || event.target.id == "txtLoginPassword") {
        // Antes: dependía del teclado nativo del TV (OSK) apareciendo/
        // desapareciendo sobre el <input> real, con el lag y el compactado
        // de pantalla característicos de esa UI del sistema. Ahora se abre
        // el teclado propio (overlay controlado 100% por la app).
        this.openKeyboardForField($el);
        return;
      } else if (event.target.id == "btnLoginSubmit") {
        this.submitLogin();
        return;
      } else if (event.target.id == "btnRegisterSubmit") {
        this.showRegisterPopup();
        return;
      } else if (event.target.id == "btnUdidSubmit") {
        LoginUdid.showExternalLoginModal();
        return;
      } else if (event.target.id == "btnCancelExternalLogin") {
        LoginUdid.hideExternalLoginModal();
        return;
      }else if ($el.attr("id") == "togglePassword"){
        this.togglePasswordVisibility()
        return;
      }else if ($el.attr("id") === "btnClosePopup"){
          this.closeRegisterPopup()
          return;
      }else if ($el.isInAlertMessage(this.$el)) {
        if ($el.is(this.$nbAlertMessageOkButton)) {
          $el.closeAlert(this.$el);
          Focus.to(this.$lastFocused);
        }
      } else if ($el.isInAlertConfirm(this.$el)) {
        if ($el.is(this.$nbAlertConfirmOkButton)) {
          $el.closeAlert(this.$el);
          closeApp();
        } else if ($el.is(this.$nbAlertConfirmCancelButton)) {
          $el.closeAlert(this.$el);
          Focus.to(this.$lastFocused);
        }
      }
    },

    /**
     * @inheritdoc Scene#onReturn
     */
    onReturn: function ($el, event) {
      if ($el.isInAlertMessage(this.$el) || $el.isInAlertConfirm(this.$el)) {
        $el.closeAlert(this.$el);
        Focus.to(this.$lastFocused);
      } else {
        this.$lastFocused = Focus.focused;
        this.$el.showAlertConfirm(__("AppCloseApp"), 'close_app', null, null, 'cancel');
      }
    },

    /**
     * @inheritdoc Scene#navigate
     */
    navigate: function (direction) {
      var current = Focus.focused;

      if (current == null) {
        current = this.focusCandidate;
      }

      if (current == null) {
        return false;
      }

      if (current.hasClass('login-input') || current.attr('id') == 'btnLoginSubmit'|| current.attr('id') == 'btnUdidSubmit' || current.attr('id') == 'btnRegisterSubmit' || current.attr('id') == 'togglePassword') { // navigate on login form
        if (direction === 'down') {
          if (current.attr('id') == 'txtLoginUserId') {
            Focus.to($('#txtLoginPassword'));
          } else if (current.attr('id') == 'txtLoginPassword') {
            Focus.to($('#btnLoginSubmit'));
          } else if (current.attr('id') == 'btnLoginSubmit') {
            Focus.to($("#btnUdidSubmit"));
          } else if (current.attr('id') == 'btnLoginSubmit'){
            Focus.to($("#btnRegisterSubmit"));
          }

        } else if (direction === 'up') {
          if (current.attr('id') == 'btnUdidSubmit') {
            Focus.to($('#btnLoginSubmit'));
          } else if(current.attr('id') == 'btnRegisterSubmit') {
            Focus.to($('#btnLoginSubmit'));
          } else if (current.attr('id') == 'btnLoginSubmit') {
            Focus.to($('#txtLoginPassword'));
          } else if (current.attr('id') == 'txtLoginPassword') {
            Focus.to($('#txtLoginUserId'));
          }
        } else if (direction === 'right') {
          if (current.attr('id') == 'txtLoginPassword') {
            // Obtener la posición del cursor y la longitud del texto
            var cursorPos = current[0].selectionStart;
            var textLength = current.val().length;
            // Solo navegar al botón de visibilidad si estamos al final del texto
            if (cursorPos === textLength) {
              Focus.to($('#togglePassword'));
            }
          }
        }else if (direction === 'left') {
          if (current.attr('id') == 'togglePassword') {
            var passwordField = $('#txtLoginPassword');
            Focus.to(passwordField);
            // Posicionar el cursor al final del texto
            var length = passwordField.val().length;
            passwordField[0].setSelectionRange(length, length);
          }
        }

        Focus.focused.focus();

      } else if (current.attr('id') === 'btnCancelExternalLogin' || current.attr('id') === 'btnRetryExternalLogin') {
        // Navegación dentro del modal de UDID
        if (direction === 'down' || direction === 'up') {
          var $cancelBtn = $('#btnCancelExternalLogin');
          var $retryBtn = $('#btnRetryExternalLogin');

          // Si el botón de reintentar está visible, permitir navegación entre ellos
          if ($retryBtn.is(':visible')) {
            if (current.attr('id') === 'btnCancelExternalLogin') {
              Focus.to($retryBtn);
            } else if (current.attr('id') === 'btnRetryExternalLogin') {
              Focus.to($cancelBtn);
            }
          }
        }
      } else if (current.isInAlertMessage(this.$el) || current.isInAlertConfirm(this.$el)) { // navigate on dialog
        this.manageFocusOnAlert(direction, current.data("parent-type"));
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
* Handles Focus event
* You can overwrite me in own scene class
*
* @template
* @param {Object} $el Target element, jQuery collection
* @fires focus
*/
    onFocus: function ($el) {
      this.focusCandidate = null;
      $(".focus-candidate").removeClass("focus-candidate");
      this.trigger('focus', $el);
    },

    /**
     * Cascade focus. Manage the process of Focus delegation between snippets inside Scene
     *
     * @param {Object} Snippet or jQuery
     * @param {String} direction of Focus delegation ("up", "down", "left", "right")
     */
    // onFocusOut: function (snippet, direction) {

    // },

    submitLogin: function () {
      if (this.logging) {
        return;
      }

      var self = this;
      if (this.userId.val().length == 0) {
        console.log("Enter an user id");
      } else if (this.password.val().length == 0) {
        console.log("Enter password");
      } else {
        this.logging = true;
        App.throbber();

        var user = this.userId.val();
        var password = this.password.val()

        // Recordar el usuario para autocompletar la próxima vez (ver
        // openKeyboardForField/getRecentUsernames más arriba). Se guarda acá,
        // al intentar el login, no al tipear -- igual que SearchManager sólo
        // guarda búsquedas efectivamente ejecutadas, no cada tecla.
        this.addRecentUsername(user);

        //configure login helper options, sending empty array for licenses because licenses will be loaded after login
        LoginHelper.configure([], true, true);

        //call login helper to login and activate current license
        LoginHelper.loginAndActivateLicense(user, password, true, false, "", "", function() {
          console.log("Login successfull");

          App.throbberHide()
          self.userId.val("");
          self.password.val("");
          self.logging = false;
          Router.go('loading');
        }, function(error) {
          console.log("Login failure");
          console.log(error);

          App.throbberHide()
          self.$lastFocused = Focus.focused;

          // Verificar si el error es de restricción de IP
          var errorMessage = __("LoginWrongLogin");
          if (error && typeof error === 'object' && error.errorCode === 'ip_restriction') {
            errorMessage = __("LoginIpRestriction");
          } else if (error && typeof error === 'string' && error.toLowerCase().includes('ip')) {
            // Fallback: si el mensaje de error contiene "ip", usar el mensaje de restricción
            errorMessage = __("LoginIpRestriction");
          }

          self.$el.showAlertMessage(errorMessage, 'login_wrong', null);
          self.logging = false;
        }, function() {
          console.log("Go to licenses with user and config (pending license)");
          Router.go('licenses');
        });

        // cv.clientLogin(this.userId.val(), this.password.val(), true, function () {
        //   cv.getClientConfig(function () { // ok
        //     App.throbberHide()
        //     self.userId.val("");
        //     self.password.val("");
        //     Router.go('licenses');
        //     self.logging = false;
        //   }, function () {
        //     App.throbberHide()
        //     self.password.val("");
        //     console.log("Error getting config");
        //     self.$lastFocused = Focus.focused;
        //     self.$el.showAlertMessage(__("LoginWrongLogin"), 'login_wrong', null);
        //     self.logging = false;
        //   });
        // }, function (err) {
        //   App.throbberHide()
        //   //self.password.val("");
        //   console.log("Login error");
        //   console.log(err);
        //   self.$lastFocused = Focus.focused;
        //   self.$el.showAlertMessage(__("LoginWrongLogin"), 'login_wrong', null);
        //   self.logging = false;
        // });
      }
    },

    /**
     * Handles keyDown events
     * Handling is executed only when scene has focus
     * According keyCodes here are fired right events (for navigate keys or enter event etc.)
     *
     * @fires beforekey
     * @fires key
     * @private
     */
    onKeyDown: function (keyCode, ev, stop) {


      if (!this.isVisible) {
        return;
      }

      if (this.trigger('beforekey', keyCode, ev) === false) {
        return false;
      }

      if (this.trigger('key', keyCode, ev) === false) {
        return false;

      } else if (keyCode === Control.key.LEFT) {
        return this.navigate('left', stop);

      } else if (keyCode === Control.key.RIGHT) {
        return this.navigate('right', stop);

      } else if (keyCode === Control.key.UP) {
        return this.navigate('up', stop);

      } else if (keyCode === Control.key.DOWN) {
        return this.navigate('down', stop);

      } else if (keyCode === Control.key.ENTER) {
        return this.onEnter(Focus.focused, ev, stop);
      } else if (keyCode === Control.key.RETURN) {
        return this.onReturn(Focus.focused, ev, stop);
      }
    }
  });

  return Scene_Login;

})(Scene);
