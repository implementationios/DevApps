var LoginUdid = (function () {

    // ================== CONFIG BACKEND ==================
  // Base de API que ya usás en GET /udid/request-udid-manual/
  var API_BASE = CONFIG.app.baseUrl;
  // URL del WebSocket apuntando al backend (no al puerto del front)
  var WS_URL = CONFIG.app.wsUrl;

  console.log("API_BASE", API_BASE);
  console.log("WS_URL", WS_URL);

  var module = {

    $el: null,
    countdownInterval: null,
    privateKeyPem: null,
    privateKeyForge: null, // Clave importada con forge

    // --- estados/Timers anteriores ---
    externalLoginRequest: null,
    externalLoginInProgress: false,
    externalPollingInterval: null,      // (se deja por compat, ya no se usa para polling HTTP)
    externalCountdownInterval: null,
    externalLoginDeadline: null,

    // --- NUEVO: estado WebSocket ---
    externalWS: null,
    externalWSHeartbeat: null,
    externalWSReconnectTimer: null,
    externalWSFinished: false,
    externalWSReconnectDelay: 3000, // 3s
    externalWSReconnectAttempts: 0,  // Contador de intentos de reconexión
    externalWSMaxReconnectAttempts: 3, // Máximo de intentos permitidos

    rateLimitCountdownInterval: null, // Intervalo de cuenta regresiva para rate limit

    /* ====================== UTILIDADES CRIPTO CON FORGE ====================== */

    utf8BytesToString: function (buf) {
      var bytes = new Uint8Array(buf), out = "", i = 0, c = 0;
      while (i < bytes.length) {
        c = bytes[i++];
        if (c < 128) { out += String.fromCharCode(c); }
        else if (c > 191 && c < 224) {
          out += String.fromCharCode(((c & 31) << 6) | (bytes[i++] & 63));
        } else {
          out += String.fromCharCode(((c & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
        }
      }
      return out;
    },

    // Función de unpadding PKCS#7 adaptada para trabajar con strings
    pkcs7Unpad: function (dataStr) {
      if (!dataStr || dataStr.length === 0) {
        console.error("[PKCS7] String vacío recibido");
        throw new Error("Empty plaintext");
      }

      console.log("[PKCS7] Tamaño del string:", dataStr.length, "caracteres");
      console.log("[PKCS7] Es múltiplo de 16?", dataStr.length % 16 === 0);

      // Obtener el último byte que indica la longitud del padding
      var padLen = dataStr.charCodeAt(dataStr.length - 1);
      console.log("[PKCS7] Último byte (padding length):", padLen);

      // Mostrar contexto completo de los últimos bytes
      var contextBytes = [];
      var contextChars = [];
      for (var i = Math.max(0, dataStr.length - Math.min(32, dataStr.length)); i < dataStr.length; i++) {
        var charCode = dataStr.charCodeAt(i);
        contextBytes.push(('0' + charCode.toString(16)).slice(-2));
        // Solo mostrar caracteres imprimibles
        if (charCode >= 32 && charCode <= 126) {
          contextChars.push(String.fromCharCode(charCode));
        } else {
          contextChars.push('\\x' + ('0' + charCode.toString(16)).slice(-2));
        }
      }
      console.log("[PKCS7] Últimos bytes (hex):", contextBytes.join(' '));
      console.log("[PKCS7] Últimos bytes (interpretado):", contextChars.join(''));

      // Verificación estricta de padding PKCS#7
      var isValidPkcs7 = true;
      var errorMsg = "";

      // Regla 1: padding length debe estar entre 1 y 16
      if (padLen < 1 || padLen > 16) {
        isValidPkcs7 = false;
        errorMsg = "Padding length fuera de rango: " + padLen;
      }

      // Regla 2: padding length no puede ser mayor que el buffer
      if (padLen > dataStr.length) {
        isValidPkcs7 = false;
        errorMsg = "Padding length mayor que buffer: " + padLen + " > " + dataStr.length;
      }

      // Regla 3: todos los bytes del padding deben ser iguales al padding length
      if (isValidPkcs7) {
        for (var i = 1; i <= padLen; i++) {
          if (dataStr.charCodeAt(dataStr.length - i) !== padLen) {
            isValidPkcs7 = false;
            errorMsg = "Byte de padding inconsistente en posición " + (dataStr.length - i) +
                      ": esperado " + padLen + ", encontrado " + dataStr.charCodeAt(dataStr.length - i);
            break;
          }
        }
      }

      if (isValidPkcs7) {
        console.log("[PKCS7] ✅ Padding PKCS#7 válido detectado, removiendo", padLen, "bytes");
        var result = dataStr.substring(0, dataStr.length - padLen);
        console.log("[PKCS7] ✅ Unpadding exitoso. Original:", dataStr.length, "→ Final:", result.length);
        return result;
      } else {
        console.log("[PKCS7] ❌ Padding PKCS#7 inválido:", errorMsg);

        // Estrategia alternativa: verificar si termina con caracteres JSON válidos
        var endsWithJson = false;
        var lastChar = dataStr.charAt(dataStr.length - 1);
        if (lastChar === '}' || lastChar === ']' || lastChar === '"') {
          console.log("[PKCS7] 🔍 Los datos parecen terminar con JSON válido:", lastChar);
          endsWithJson = true;
        }

        if (endsWithJson) {
          console.log("[PKCS7] ⚠️ los datos NO tienen padding (JSON ya completo)");
          return dataStr;
        }

        // Si llegamos aquí, hay un problema real
        throw new Error("Padding PKCS#7 inválido: " + errorMsg);
      }
    },

    // Importar clave privada usando node-forge (síncrono)
    importPrivateKeyFromPEM: function (pemText, callback) {
      try {
        if (!/BEGIN PRIVATE KEY/.test(pemText)) {
          callback(new Error("Clave debe ser PKCS#8 (-----BEGIN PRIVATE KEY-----)"));
          return;
        }

        // node-forge puede manejar claves PKCS#8 directamente
        var privateKey = forge.pki.privateKeyFromPem(pemText);
        this.privateKeyForge = privateKey;
        console.log("[LoadKey] Clave privada importada con node-forge");
        callback(null, privateKey);
      } catch (error) {
        console.error("[LoadKey] Error importando clave:", error);
        callback(error);
      }
    },

    // Función de descifrado híbrido usando node-forge (síncrono)
    decryptHybridCBC: function (encryptedUdid, privateKey, callback) {
      var self = this;
      try {
        console.log("[Decrypt] Iniciando descifrado híbrido con node-forge...");

        var creds = encryptedUdid && encryptedUdid.encrypted_credentials ? encryptedUdid.encrypted_credentials : {};
        var encryptedDataB64 = creds.encrypted_data;
        var encryptedAESKeyB64 = creds.encrypted_key;
        var ivB64 = creds.iv;

        console.log("[Decrypt] Verificando componentes del payload...");
        console.log("[Decrypt] encrypted_data presente:", !!encryptedDataB64);
        console.log("[Decrypt] encrypted_key presente:", !!encryptedAESKeyB64);
        console.log("[Decrypt] iv presente:", !!ivB64);

        if (!encryptedDataB64 || !encryptedAESKeyB64 || !ivB64) {
          callback(new Error("Payload incompleto"));
          return;
        }

        // Decodificar base64 usando forge
        var iv = forge.util.decode64(ivB64);
        var encryptedAESKey = forge.util.decode64(encryptedAESKeyB64);
        var encryptedData = forge.util.decode64(encryptedDataB64);

        console.log("[Decrypt] IV length:", iv.length);
        console.log("[Decrypt] Encrypted AES key length:", encryptedAESKey.length);
        console.log("[Decrypt] Encrypted data length:", encryptedData.length);

        if (iv.length !== 16) {
          callback(new Error("IV inválido - longitud: " + iv.length));
          return;
        }

        // 1) RSA-OAEP (SHA-256) → clave AES usando node-forge
        console.log("[Decrypt] Paso 1: Descifrando clave AES con RSA-OAEP...");
        var aesKeyRaw;
        try {
          // node-forge usa RSA-OAEP con SHA-1 por defecto, pero podemos especificar SHA-256
          aesKeyRaw = privateKey.decrypt(encryptedAESKey, 'RSA-OAEP', {
            md: forge.md.sha256.create()
          });
          console.log("[Decrypt] Clave AES descifrada, length:", aesKeyRaw.length);

          if (aesKeyRaw.length !== 32) {
            callback(new Error("Clave AES inválida - longitud: " + aesKeyRaw.length));
            return;
          }
        } catch (error) {
          console.error("[Decrypt] Error descifrando clave AES:", error);
          callback(error);
          return;
        }

        // 2) AES-CBC → plaintext con padding usando node-forge
        console.log("[Decrypt] Paso 2: Descifrando datos con AES-CBC...");
        var paddedPlain;
        try {
          var decipher = forge.cipher.createDecipher('AES-CBC', aesKeyRaw);
          decipher.start({ iv: iv });
          decipher.update(forge.util.createBuffer(encryptedData));
          var success = decipher.finish();

          if (!success) {
            callback(new Error("Error en descifrado AES-CBC"));
            return;
          }

          paddedPlain = decipher.output.getBytes();
          console.log("[Decrypt] Paso 3: Datos descifrados, length:", paddedPlain.length);

          // Mostrar los últimos bytes para debug del padding
          var lastBytes = [];
          for (var i = Math.max(0, paddedPlain.length - 16); i < paddedPlain.length; i++) {
            lastBytes.push(paddedPlain.charCodeAt(i));
          }
          console.log("[Decrypt] Últimos 16 bytes (hex):", lastBytes.map(function(b) {
            return b.toString(16).padStart ? b.toString(16).padStart(2, '0') : ('0' + b.toString(16)).slice(-2);
          }).join(' '));
          console.log("[Decrypt] Últimos 16 bytes (ASCII):", lastBytes.map(function(b) {
            return String.fromCharCode(b);
          }).join(''));

        } catch (error) {
          console.error("[Decrypt] Error en descifrado AES-CBC:", error);
          callback(error);
          return;
        }

        // 3) Unpad + UTF-8 + JSON
        try {
          var unpadded = self.pkcs7Unpad(paddedPlain);
          // paddedPlain ya es una string en node-forge, no necesitamos utf8BytesToString
          var jsonStr = unpadded;
          console.log("[Decrypt] JSON string obtenido, length:", jsonStr.length);
          console.log("[Decrypt] Primeros 200 caracteres:", jsonStr.substring(0, 200));

          var result = JSON.parse(jsonStr);
          callback(null, result);
        } catch (error) {
          console.error("[Decrypt] Error en unpadding o parsing JSON:", error);
          callback(error);
        }

      } catch (e) {
        console.error("[Decrypt] Error síncrono:", e);
        callback(e);
      }
    },

    /* ====================== CARGA DE CLAVE ====================== */
    loadPrivateKey: function (callback) {
      var self = this;
      var url = "assets/keys/private_key.pem";

      // Usar XMLHttpRequest en lugar de fetch para ES5
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            self.privateKeyPem = xhr.responseText;
            console.log("[LoadKey] Clave privada cargada exitosamente");
            // Importar la clave con node-forge
            self.importPrivateKeyFromPEM(self.privateKeyPem, function(err, key) {
              if (err) {
                console.error("[LoadKey] Error importando clave:", err);
                if (callback) callback(err);
              } else {
                console.log("[LoadKey] Clave privada importada exitosamente");
                if (callback) callback(null);
              }
            });
          } else {
            var error = new Error("No se pudo cargar la clave (" + xhr.status + ")");
            console.error("[LoadKey] Error cargando clave privada:", error);
            if (callback) callback(error);
          }
        }
      };
      xhr.send();
    },

    // Nueva función para inicializar el módulo con el elemento
    init: function($el) {
      var self = this;
      if (!$el || !$el.jquery) {
        console.error("LoginUdid: El elemento jQuery principal no fue proporcionado o es inválido.");
        return;
      }
      this.$el = $el;
      this.render();
      this.bindEvents();
      this.loadPrivateKey(function(err) {
        if (err) {
          console.error("Error inicializando LoginUdid:", err);
        } else {
          console.log("LoginUdid inicializado correctamente");
        }
      });
    },

    bindEvents: function () {
      var self = this;
      $("#external-login-button").on("click", function () {
        self.startPollingExternalLogin();
      });
    },

    render: function () {
      this.$el.find('#btnUdidSubmit').text(__("ButtonUdidLogin"));
      this.$el.find('#externalLoginTitle').text(__("ExternalLoginTitle"));
      this.$el.find('#externalLoginStatus').text(__("ExternalLoginWaitingMessage"));
      this.$el.find('#externalLoginCodeHint').text(__("ExternalLoginCodeHint"));
      this.$el.find('#btnCancelExternalLogin').text(__("CancelButton"));
      this.$el.find('#btnRetryExternalLogin').text(__("RetryButton"));
    },

    /* ====================== UI / MODAL ====================== */
    showExternalLoginModal: function () {
      if (!this.$el.find('#external-login-modal').length) {
        this.createExternalLoginModal();
      }
      this.$el.find('#external-login-modal').fadeIn(200);
      this.$el.find('#externalLoginThrobber').show();
      this.$el.find('#btnRetryExternalLogin').hide();
      this.$el.find('#externalLoginStatus').text(__("ExternalLoginWaitingMessage"));
      Focus.to(this.$el.find('#btnCancelExternalLogin'));

      // 📸 Llamada automática al mostrar el modal (una sola vez)
      if (!this.externalLoginInProgress) {
        this.startExternalLogin();
      }
    },

    // 🧹 Importante: ahora también limpia el WS y sus timers
    hideExternalLoginModal: function () {
      var $modal = this.$el.find('#external-login-modal');

      if (this.externalLoginRequest && this.externalLoginRequest.abort) {
        try { this.externalLoginRequest.abort(); } catch (e) {}
      }
      this.externalLoginRequest = null;
      this.externalLoginInProgress = false;

      // Limpieza WS
      if (this.externalWSHeartbeat) {
        clearInterval(this.externalWSHeartbeat);
        this.externalWSHeartbeat = null;
      }
      if (this.externalWSReconnectTimer) {
        clearTimeout(this.externalWSReconnectTimer);
        this.externalWSReconnectTimer = null;
      }
      if (this.externalWS) {
        console.log('[ExternalLogin][WS] 🔒 Cerrando WebSocket desde hideExternalLoginModal (usuario canceló) - Timestamp:', new Date().toISOString());
        try { this.externalWS.close(); } catch (e) {
          console.warn('[ExternalLogin][WS] Error al cerrar WebSocket desde hideExternalLoginModal:', e);
        }
        this.externalWS = null;
      }
      
      // Resetear contador de intentos al cancelar
      this.externalWSReconnectAttempts = 0;
      this.externalWSFinished = false;

      // Limpieza contadores previos
      if (this.externalPollingInterval) {
        clearInterval(this.externalPollingInterval);
        this.externalPollingInterval = null;
      }
      if (this.externalCountdownInterval) {
        clearInterval(this.externalCountdownInterval);
        this.externalCountdownInterval = null;
      }

      $modal.fadeOut(200, function() {
        this.$el.find('#externalLoginThrobber').hide();
        this.$el.find('#btnRetryExternalLogin').hide();
        this.$el.find('#externalLoginStatus').text('');
        this.$el.find('#externalLoginCode').text('');
        this.setExternalLoginCode('');
        this.$el.find('#externalLoginCodeHint').text('');
      }.bind(this));

      Focus.to($('#txtLoginUserId'));
    },


    setExternalLoginCode: function (code) {
      var pretty = (code || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      this.$el.find('#externalLoginCode').text(pretty);
      this.$el.find('#externalLoginCodeHint').text(__("ExternalLoginCodeHint"));
      this.$el.find('#externalLoginStatus').text(__("ExternalLoginWaitingMessage"));

      var $qrContainer = this.$el.find('#externalLoginQrCode');
      if (!$qrContainer.length) return;

      if (!pretty) {
        $qrContainer.empty();
        return;
      }

      var appName = (typeof CONFIG !== 'undefined' && CONFIG.app && CONFIG.app.appName) ? CONFIG.app.appName : 'App';
      var qrText = appName +':'+ pretty;
      var container = $qrContainer[0];
      container.innerHTML = '';
      try {
        new QRCode(container, { text: qrText, width: 200, height: 200 });
      } catch (e) {
        console.warn('[ExternalLogin] No se pudo generar el QR:', e);
      }
    },

    startExternalCountdown: function (expiresInMinutes) {
      // Limpiar si hubiera uno previo
      if (this.externalCountdownInterval) {
        clearInterval(this.externalCountdownInterval);
        this.externalCountdownInterval = null;
      }

      // Validar que expiresInMinutes sea un número válido
      if (typeof expiresInMinutes !== 'number' || expiresInMinutes <= 0 || isNaN(expiresInMinutes)) {
        console.warn('[ExternalLogin] expires_in_minutes inválido:', expiresInMinutes);
        // Intentar mostrar 00:00 si el parámetro es inválido
        var $count = this.$el.find('#externalLoginCountdown');
        if ($count.length) {
          $count.text('00:00');
        }
        return;
      }

      // Calcular la fecha de expiración sumando los minutos a la fecha actual
      var now = Date.now();
      var deadline = now + (expiresInMinutes * 60 * 1000); // convertir minutos a milisegundos
      this.externalLoginDeadline = deadline;

      console.log('[ExternalLogin] Countdown iniciado. Minutos:', expiresInMinutes, 'Deadline:', new Date(deadline).toISOString());

      // Helper para formatear MM:SS
      var formatMMSS = function (ms) {
        var totalSec = Math.max(0, Math.floor(ms / 1000));
        var mm = Math.floor(totalSec / 60);
        var ss = totalSec % 60;
        return (mm < 10 ? '0' + mm : '' + mm) + ':' + (ss < 10 ? '0' + ss : '' + ss);
      };

      // Pintar inmediatamente y luego cada 1s
      var $count = this.$el.find('#externalLoginCountdown');
      if ($count.length === 0) {
        console.warn('[ExternalLogin] Elemento #externalLoginCountdown no encontrado');
        return;
      }
      
      // Asegurar que el elemento sea visible
      $count.show();

      var self = this;
      var tick = function() {
        var remain = deadline - Date.now();
        if (remain <= 0) {
          // Expiró
          clearInterval(self.externalCountdownInterval);
          self.externalCountdownInterval = null;
          $count.text('00:00');
          self.$el.find('#externalLoginThrobber').hide();
          self.$el.find('#externalLoginStatus').text(__("ExternalLoginExpired"));
          self.$el.find('#btnRetryExternalLogin').show();
          // Si también estás pollingeando, cortá el polling aquí si no lo hiciste aún:
          if (self.externalPollingInterval) {
            clearInterval(self.externalPollingInterval);
            self.externalPollingInterval = null;
          }
          return;
        }
        // Actualizar
        $count.text(formatMMSS(remain));
      };

      tick(); // primer render inmediato
      this.externalCountdownInterval = setInterval(tick, 1000);
    },

    /* ====================== FLUJO: pedir UDID y abrir WS ====================== */

    startExternalLogin: function () {
      var self = this;
      var clientToken = getUdid();
      if (this.externalLoginInProgress) return;
      this.externalLoginInProgress = true;

      var url = API_BASE + '/udid/request-udid-manual/';

      console.log("[ExternalLogin] Iniciando llamada a:", url);

      $.ajax({
        url: url,
        method: "GET",
        dataType: "json",
        timeout: 10000,
        headers: {
          'X-Device-Fingerprint': clientToken
        },
        success: function (response) {
          console.log("[ExternalLogin] Respuesta recibida:", response);
          Storage.set('external_login_udid', response.udid);
          self.setExternalLoginCode(response.udid);
          self.startExternalCountdown(response.expires_in_minutes);
          // 🔁 Antes: startPollingExternalLogin hacía POST cada 3s
          // Ahora: abre un WebSocket que queda esperando push del server
          self.startPollingExternalLogin(response.udid);
          self.externalLoginInProgress = false;
        },
        error: function (xhr, status, error) {
          console.error("[ExternalLogin] Error en la llamada:", status, error);
          self.externalLoginRequest = null;
          self.externalLoginInProgress = false;

          var body = xhr.responseJSON;
          if (body && body.error === 'Rate limit exceeded') {
            self.showRateLimitError(body);
            return;
          }
        }
      });
    },

    // 🚀 NUEVO: usa WebSocket en vez de polling HTTP
    startPollingExternalLogin: function (udid) {
      var self = this;

      if (!udid) {
        console.error('[ExternalLogin] Falta udid para abrir WS');
        return;
      }

      // Limpieza de intentos previos
      if (self.externalPollingInterval) {
        clearInterval(self.externalPollingInterval);
        self.externalPollingInterval = null;
      }
      if (self.externalWSHeartbeat) {
        clearInterval(self.externalWSHeartbeat);
        self.externalWSHeartbeat = null;
      }
      if (self.externalWSReconnectTimer) {
        clearTimeout(self.externalWSReconnectTimer);
        self.externalWSReconnectTimer = null;
      }
      if (self.externalWS) {
        try { self.externalWS.close(); } catch (e) {}
        self.externalWS = null;
      }

      var payload = {
        type: 'auth_with_udid',
        udid: udid,
        app_type: '10foot',
        app_version: '1.0'
      };

      self.externalWSFinished = false;
      self.externalWSReconnectAttempts = 0; // Resetear contador al iniciar nuevo login

      console.log('[ExternalLogin] Abriendo WebSocket a:', WS_URL, 'udid:', udid);

      function scheduleReconnect () {
        if (self.externalWSReconnectTimer) return;
        
        // Delay progresivo: 5s para el primer intento, 8s para el segundo, 10s para el tercero
        // El contador ya fue incrementado antes de llamar esta función
        var delay = 5000; // 5 segundos base
        if (self.externalWSReconnectAttempts === 1) {
          delay = 5000; // 5 segundos
        } else if (self.externalWSReconnectAttempts === 2) {
          delay = 8000; // 8 segundos
        } else if (self.externalWSReconnectAttempts === 3) {
          delay = 10000; // 10 segundos
        } else {
          // Por si acaso, si hay más intentos (no debería llegar aquí)
          delay = 10000;
        }
        
        self.externalWSReconnectTimer = setTimeout(function () {
          self.externalWSReconnectTimer = null;
          console.log('[ExternalLogin][WS] Reintentando conexión después de ' + (delay / 1000) + 's de espera… (Contador: ' + self.externalWSReconnectAttempts + ')');
          connect();
        }, delay);
      }

      function safeCloseWS () {
        console.log('[ExternalLogin][WS] 🔒 Cerrando WebSocket manualmente - Timestamp:', new Date().toISOString());
        try { self.externalWS && self.externalWS.close(); } catch (e) {
          console.warn('[ExternalLogin][WS] Error al cerrar WebSocket:', e);
        }
        self.externalWS = null;
        if (self.externalWSHeartbeat) {
          clearInterval(self.externalWSHeartbeat);
          self.externalWSHeartbeat = null;
        }
      }

      function connect () {
        // El contador representa el intento actual (1, 2, 3)
        var attemptNumber = self.externalWSReconnectAttempts === 0 ? 1 : self.externalWSReconnectAttempts;
        console.log('[ExternalLogin][WS] 🔄 Creando WebSocket - URL:', WS_URL, '| UDID:', udid, '| Intento:', attemptNumber, '| Timestamp:', new Date().toISOString());
        try {
          self.externalWS = new WebSocket(WS_URL);
        } catch (e) {
          console.error('[ExternalLogin][WS] ❌ Error creando WebSocket:', e);
          scheduleReconnect();
          return;
        }

        self.externalWS.onopen = function () {
          console.log('[ExternalLogin][WS] ✅ WebSocket ABIERTO - URL:', WS_URL, '| UDID:', udid, '| Timestamp:', new Date().toISOString());
          console.log('[ExternalLogin][WS] Conectado. Enviando payload…');
          try { self.externalWS.send(JSON.stringify(payload)); } catch (e) {
            console.error('[ExternalLogin][WS] Error enviando payload:', e);
          }

          // Heartbeat para mantener viva la conexión
          if (self.externalWSHeartbeat) clearInterval(self.externalWSHeartbeat);
          self.externalWSHeartbeat = setInterval(function () {
            try {
              if (self.externalWS && self.externalWS.readyState === 1) {
                self.externalWS.send(JSON.stringify({ type: 'ping' }));
              }
            } catch (e) {}
          }, 30000); // 30s
        };

        self.externalWS.onmessage = function (evt) {
          var msg = null;
          try { msg = JSON.parse(evt.data); } catch (e) {
            console.warn('[ExternalLogin][WS] Mensaje no-JSON:', evt.data);
            return;
          }

          // Responder a pings del servidor
          if (msg.type === 'ping') {
            try {
              self.externalWS.send(JSON.stringify({ type: 'pong' }));
              console.log('[ExternalLogin][WS] Ping recibido, enviando pong');
            } catch (e) {
              console.warn('[ExternalLogin][WS] Error enviando pong:', e);
            }
            return;
          }

          if (msg.type === 'pending') {
            console.log('[ExternalLogin][WS] Pendiente:', msg.status || 'not_validated');
            return;
          }

          if (msg.type === 'auth_with_udid:result') {
            if (msg.status === 'ok' && msg.result && msg.result.encrypted_credentials) {
              console.log('[ExternalLogin][WS] OK recibido. Descifrando…');

              self.desEncryptUdid(msg.result, function (error, decryptedData) {
                if (error) {
                  console.error('[ExternalLogin] Error al descifrar:', error);
                  self.handleDecryptionError(error);
                } else {
                  console.log('[ExternalLogin] Datos descifrados exitosamente');

                  // 🔥 AQUÍ SE INTEGRA EL LOGIN
                  self.performLoginWithDecryptedData(decryptedData, function(err, result) {
                    if (err) {
                      console.error('[ExternalLogin] Error en proceso de login:', err);
                    } else {
                      console.log('[ExternalLogin] Proceso completo exitoso');
                    }
                  });
                }
              });

              self.externalWSFinished = true;
              safeCloseWS();
              return;
            } else {
              console.error('[ExternalLogin][WS] Error final:', msg.result && msg.result.code, msg.result && msg.result.error);
              self.externalWSFinished = true;
              safeCloseWS();
              return;
            }
          }

          if (msg.type === 'timeout') {
            console.warn('[ExternalLogin][WS] Timeout en el servidor. Reintentando…');
            safeCloseWS();
            scheduleReconnect();
            return;
          }

          if (msg.type === 'pong') {
            // opcional: keep-alive ok
            return;
          }
        };

        self.externalWS.onerror = function (evt) {
          console.warn('[ExternalLogin][WS] onerror:', evt);
        };

        self.externalWS.onclose = function (evt) {
          var closeCode = evt.code || 'N/A';
          var closeReason = evt.reason || 'Sin razón especificada';
          var wasClean = evt.wasClean !== undefined ? evt.wasClean : 'N/A';
          console.log('[ExternalLogin][WS] ❌ WebSocket CERRADO - Code:', closeCode, '| Reason:', closeReason, '| WasClean:', wasClean, '| Timestamp:', new Date().toISOString());
          
          if (self.externalWSHeartbeat) {
            clearInterval(self.externalWSHeartbeat);
            self.externalWSHeartbeat = null;
          }
          
          // Si ya se completó el proceso, no hacer nada
          if (self.externalWSFinished) {
            console.log('[ExternalLogin][WS] Cierre esperado (proceso completado)');
            return;
          }
          
          // Verificar si el código UDID expiró
          if (self.externalLoginDeadline && Date.now() >= self.externalLoginDeadline) {
            console.log('[ExternalLogin][WS] Código expirado, no se reintenta');
            self.externalWSFinished = true; // Evitar reconexiones
            return;
          }

          // Incrementar contador ANTES de verificar el límite
          self.externalWSReconnectAttempts++;
          
          // Verificar si el siguiente intento excedería el límite (DESPUÉS de incrementar)
          if (self.externalWSReconnectAttempts > self.externalWSMaxReconnectAttempts) {
            console.log('[ExternalLogin][WS] Máximo de intentos alcanzado (' + self.externalWSMaxReconnectAttempts + ').');
            
            // Verificar si aún hay tiempo antes de que expire el UDID
            var timeRemaining = self.externalLoginDeadline ? (self.externalLoginDeadline - Date.now()) : 0;
            
            if (timeRemaining > 0) {
              // Aún hay tiempo - NO reintentar, solo esperar
              var minutesRemaining = Math.floor(timeRemaining / (60 * 1000));
              var secondsRemaining = Math.floor((timeRemaining % (60 * 1000)) / 1000);
              console.log('[ExternalLogin][WS] Aún quedan ' + minutesRemaining + 'm ' + secondsRemaining + 's antes de que expire el código. No se reintentará más.');
              // Marcar como finished para evitar más reintentos
              self.externalWSFinished = true;
              // Mostrar mensaje al usuario
              self.$el.find('#externalLoginThrobber').hide();
              self.$el.find('#externalLoginStatus').text(__("ExternalLoginConnectionError") || "Error de conexión después de múltiples intentos. Por favor, intente nuevamente.");
              self.$el.find('#btnRetryExternalLogin').show();
              return;
            } else {
              // Ya no hay tiempo - cerrar completamente y mostrar error
              console.log('[ExternalLogin][WS] Código expirado y máximo de intentos alcanzado. Cerrando conexión.');
              self.externalWSFinished = true;
              // Mostrar mensaje al usuario
              self.$el.find('#externalLoginThrobber').hide();
              self.$el.find('#externalLoginStatus').text(__("ExternalLoginConnectionError") || "Error de conexión. Por favor, intente nuevamente.");
              self.$el.find('#btnRetryExternalLogin').show();
              return;
            }
          }
        
          
          // Calcular delay para el siguiente intento (basado en el contador ya incrementado)
          var nextDelay = 5000; // 5 segundos base
          if (self.externalWSReconnectAttempts === 1) {
            nextDelay = 5000;
          } else if (self.externalWSReconnectAttempts === 2) {
            nextDelay = 8000;
          } else if (self.externalWSReconnectAttempts === 3) {
            nextDelay = 10000;
          } else {
            // Por si acaso, si hay más intentos (no debería llegar aquí)
            nextDelay = 10000;
          }
          
          console.log('[ExternalLogin][WS] Cerrado (sin resultado). Reintentando en ' + (nextDelay / 1000) + 's… (Intento ' + self.externalWSReconnectAttempts + '/' + self.externalWSMaxReconnectAttempts + ')');
          scheduleReconnect();
        };
      }

      // Arrancar conexión
      connect();
    },

    desEncryptUdid: function (encryptedUdid, callback) {
      var self = this;
      if (!this.privateKeyPem || !this.privateKeyForge) {
        callback(new Error("Clave privada no cargada"));
        return;
      }

      this.decryptHybridCBC(encryptedUdid, this.privateKeyForge, function(err, result) {
        if (err) {
          console.error("[ExternalLogin] Descifrado falló:", err.message || err);
          callback(new Error("No se pudieron procesar las credenciales: " + (err.message || err)));
        } else {
          callback(null, result);
        }
      });
    },

    handleDecryptionError: function (error) {
      console.error('[ExternalLogin] Error en descifrado:', error);
      this.hideExternalLoginModal();

      // Mostrar error al usuario
      this.showLoginError("Error al procesar las credenciales. Por favor, intente nuevamente.");
    },

    // Agregar al final del objeto module, antes del return:
    performLoginWithDecryptedData: function (decryptedData, callback) {
      var self = this;

      console.log('[ExternalLogin] Iniciando proceso de login con datos descifrados');

      var userId = decryptedData.login1;
      var password = decryptedData.password;
      var sn = decryptedData.sn;
      var pin = decryptedData.pin;

      // Validar que tenemos los datos mínimos necesarios
      if (!userId || !password) {
        console.error('[ExternalLogin] Faltan credenciales básicas (userId o password)');
        if (callback) callback(new Error('Credenciales incompletas'));
        return;
      }

      console.log('[ExternalLogin] Credenciales validadas - userId:', userId);

      // Preparar array de licencias si tenemos SN y PIN
      var licenses = [];
      if (sn && sn.length > 0) {
        licenses.push({
          key: sn,
          pin: pin || ''
        });
        console.log('[ExternalLogin] Licencia preparada - SN:', sn);
      }

      // Configurar LoginHelper con las opciones apropiadas
      LoginHelper.configure(
        licenses,
        true,   // activationRecursive: intentar múltiples licencias si falla
        false   // activationFailIfInUse: no fallar si la licencia está en uso
      );

      // Ejecutar login y activación de licencia
      LoginHelper.loginAndActivateLicense(
        userId,
        password,
        true,                               // automatic
        licenses.length > 0,                // hasLicenseCredentials
        sn || '',                           // license
        pin || '',                          // pin

        // Callback de activación exitosa
        function () {
          console.log('[ExternalLogin] ✅ Login y activación de licencia exitosos');
          App.throbberHide();
          self.hideExternalLoginModal();
          Router.go('loading');

          if (callback) callback(null, { success: true });
        },

        // Callback de fallo en login
        function (error) {
          console.error('[ExternalLogin] ❌ Error en login:', error);
          App.throbberHide();
          self.hideExternalLoginModal();
          
          // Verificar si el error es de restricción de IP
          var errorMessage = __("LoginFailed") || "Error al iniciar sesión";
          if (error && typeof error === 'object' && error.errorCode === 'ip_restriction') {
            errorMessage = __("LoginIpRestriction");
          } else if (error && typeof error === 'string' && error.toLowerCase().includes('ip')) {
            // Fallback: si el mensaje de error contiene "ip", usar el mensaje de restricción
            errorMessage = __("LoginIpRestriction");
          }
          
          self.showLoginError(errorMessage);

          if (callback) callback(new Error('Login failed'));
        },

        // Callback de fallo en activación de licencia
        function () {
          console.error('[ExternalLogin] ❌ Error en activación de licencia');
          App.throbberHide();
          self.hideExternalLoginModal();
          Router.go('licenses');

          if (callback) callback(new Error('License activation failed'));
        }
      );
    },

    // Método para mostrar errores de login
    showLoginError: function(message) {
      // Mostrar error similar a como lo hace login.js
      this.$el.showAlertMessage(message, 'login_error', null);
    },

    /**
     * Muestra el mensaje de rate limit con cuenta regresiva (retry_after en segundos).
     * Actualiza cada segundo hasta que llegue a 0; al cerrar el modal se limpia el intervalo.
     */
    showRateLimitError: function(body) {
      var self = this;
      var message = (body && body.message) ? body.message : 'Too many requests from this device. Please try again later.';
      var retryAfter = (body && typeof body.retry_after === 'number') ? body.retry_after : 0;

      if (self.rateLimitCountdownInterval) {
        clearInterval(self.rateLimitCountdownInterval);
        self.rateLimitCountdownInterval = null;
      }

      var endTime = Date.now() + (retryAfter * 1000);

      function formatCountdown(secondsLeft) {
        var m = Math.floor(secondsLeft / 60);
        var s = secondsLeft % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
      }

      var countdownHtml = retryAfter > 0
        ? '<p class="udid-rate-limit-countdown" style="margin-top: 1em;">Puede intentar de nuevo en <span class="udid-rate-limit-seconds">' + formatCountdown(retryAfter) + '</span></p>'
        : '';
      var fullMessage = '<p>' + message + '</p>' + countdownHtml;

      this.$el.showAlertMessage(fullMessage, 'udid_rate_limit', null);

      var $modal = this.$el.find('.nb-alert-message');
      $modal.one('hidden.bs.modal', function () {
        if (self.rateLimitCountdownInterval) {
          clearInterval(self.rateLimitCountdownInterval);
          self.rateLimitCountdownInterval = null;
        }
      });

      if (retryAfter > 0) {
        self.rateLimitCountdownInterval = setInterval(function () {
          var remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
          var $span = self.$el.find('.udid-rate-limit-seconds');
          if ($span.length) {
            $span.text(formatCountdown(remaining));
          }
          if (remaining <= 0 && self.rateLimitCountdownInterval) {
            clearInterval(self.rateLimitCountdownInterval);
            self.rateLimitCountdownInterval = null;
          }
        }, 1000);
      }
    }
  };

  return module;
})();
