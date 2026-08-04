var cv = {
  url: CONFIG.app.drmURL,
  apiToken: CONFIG.app.drmToken, //DyqjydAnQjYMJuOgcEWm //gQposTlrMIOYQVdYBNYC
  sessionId: null,
  userName: null,
  password: null,
  loginParamOS: 'HTML5',
  appVersion: '1',
  branding: 'Panaccess',
  lang: CONFIG.locale,
  unsuccessfulLoginsTreshold: 5,
  unsuccessfulLoginsDelay: 5000,
  failCallback: function () {
    window.location = 'login.html';
  },
  initialized: false,
  epgRequest: null,
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

  getResponsibleServers: function (mode, data1, successCallback, errorCallback) {
    var _self = this;
    this.get_from_url('https://cv01.panaccess.com/', { f: 'getResponsibleServers', mode: mode, data1: data1 }, 'getResponsibleServersCallback', function (result) {
      if (result.answer && result.answer != "false" && result.answer.length) {
        if (result.answer && result.answer.length > 0) {
          successCallback(result.answer[0]);
        } else {
          errorCallback();
        }
      } else {
        errorCallback();
      }
    }, function (result) {
      errorCallback(result);
    });
  },

  login: function (username, password, successCallback, errorCallback) {
    var _self = this;
    console.log("main,login: " + username + ", " + password);
    this.get_result({ f: 'login', username: username, password: password }, 'loginCallback', function (result) {
      if (result.answer && result.answer != "false" && result.answer.length) {
        _self.sessionId = result.answer;
        Storage.set('cvSessionId', _self.sessionId);
        successCallback();
      } else {
        _self.sessionId = null;
        localStorage.removeItem('cvSessionId');
        errorCallback();
      }
    }, function (result) {
      if (typeof errorCallback == 'function') {
        errorCallback(result);
      } else {
        _self.showError(result.errorMessage);
      }
    });
  },

  clientLogin: function (username, password, automatic, successCallback, errorCallback) {
    var _self = this;
    var hash = automatic ? password : cv.hashMD5(password + "_panaccess");
    var udid = getUdid();

    this.get_result_post({ f: 'clientLogin', clientId: username, pwd: hash, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, 'clientLoginCallback', function (result) {
      if (result.answer && result.answer != "false" && result.answer.length && result.success) {
        User.setLoggedIn(username, hash, result.answer);
        successCallback();
      } else {
        if (result && result.errorCode) {
          errorCallback(result);
        } else {
          errorCallback("Nombre de usuario o contraseña incorrecto");
        }
      }
    }, function (result) {
      console.log(result);
      if (typeof errorCallback == 'function') {
        errorCallback(result);
      } else {
        _self.showError(result.errorMessage);
      }
    });
  },

  logout: function (callback) {
    localStorage.removeItem('cvSessionId');
    callback();
  },

  getClientConfig: function (successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getClientConfig', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, '', function (result) {

      //get local time from server and set it to user data
      AppData.getLocalTimeFromServer(function(timeData) {
        console.log("Local time fetched:", timeData);

        User.setConfig(JSON.stringify(result.answer));
        Storage.set('cvClientConfig', JSON.stringify(result.answer));
        console.log(result.answer);

        if (timeData && timeData.localTime) {
          User.dateRealLocalStart = moment(timeData.localTime).format("YYYY-MM-DD HH:mm:ss"); 
          User.timeLocalStart = Date.now();
        }
        
        successCallback();
      });

    }, function (result) {
      console.log("ERROR getClientConfig");
      console.log(result);
      errorCallback();
    });
  },

  getStreamingLicenses: function (successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    var parameters = {
      f: 'getStreamingLicenses',
      sessionId: sessionId,
      udid: udid,
      os: this.loginParamOS,
      appVersion: this.appVersion,
      branding: this.branding,
      withPins: CONFIG.automaticActivation
    };

    this.get_result_post(parameters, '', function (result) {
      console.log("SUCCESS getStreamingLicenses");
      User.setLicenses(JSON.stringify(result.answer));
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getStreamingLicenses");
      console.log(result);
      errorCallback(result);
    });
  },

  activateStreamingLicense: function (license, pin, failIfInUse, successCallback, errorCallback) {
    var parameters = {
      f: 'setStreamingLicense',
      licenseKey: license,
      pin: pin,
      sessionId: User.getSessionId(),
      udid: getUdid(),
      os: this.loginParamOS,
      appVersion: this.appVersion,
      branding: this.branding,
      failIfInUse: failIfInUse
    }
    this.get_result_post(parameters, '', function (result) {
      console.log("SUCCESS setStreamingLicense");
      console.log(result);
      User.setLicense(license);
      User.setLicensePin(pin);
      User.setLicenseActivated(true)
      successCallback();
    }, function (result) {
      console.log(result);
      console.log("ERROR setStreamingLicense ", license, pin);
      errorCallback(result.errorCode);
    });
  },

  getBouquets: function (successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getBouquets', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, '', function (result) {
      console.log("SUCCESS getBouquets");
      console.log(result);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getBouquets");
      console.log(result);
      errorCallback();
    });
  },

  getAvailableStreams: function (successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getAvailableStreams', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding, ip: true }, '', function (result) {
      console.log("SUCCESS getAvailableStreams");
      console.log(result);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getAvailableStreams");
      console.log(result);
      errorCallback();
    });
  },

  getCatchupGroups: function (successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getCatchupGroups', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, '', function (result) {
      console.log("SUCCESS getCatchupGroups");
      console.log(result);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getCatchupGroups");
      console.log(result);
      errorCallback();
    });
  },

  getCatchupEvents: function (epgStreamId, successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getCatchupEvents', sessionId: sessionId, epgStreamId: epgStreamId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, '', function (result) {
      console.log("SUCCESS getCatchupEvents");
      console.log(result);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getCatchupEvents");
      console.log(result);
      errorCallback();
    });
  },

  getCatchupsRecorded: function (successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getRecordingTasks', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, '', function (result) {
      console.log("SUCCESS getRecordingTasks");
      console.log(result);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getRecordingTasks");
      console.log(result);
      errorCallback();
    });
  },

  getEPG: function (url, successCallback, errorCallback, options) {
    //var udid = getUdid();
    //var sessionId = User.getSessionId();

    this.get_epg(url, 'getEPGCallback', function (result) {
      successCallback(result);
      /*if (result.answer && result.answer != "false" && result.answer.length) {
        if (result.answer && result.answer.length > 0) {
          successCallback(result.answer[0]);
        } else {
          errorCallback();
        }
      } else {
        errorCallback();
      }*/
    }, function (result) {
      errorCallback(result);
    }, options);
  },

  getVOD: function (successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getVodLibraries', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, '', function (result) {
      console.log("SUCCESS getVodLibraries");
      console.log(result);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getVodLibraries");
      console.log(result);
      errorCallback();
    });
  },

  getVODContent: function (offset, successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getVodContent', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding, offset: offset, limit: 100 }, '', function (result) {
      console.log("SUCCESS getVodContent");
      console.log(result);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getVodContent");
      console.log(result);
      errorCallback();
    });
  },

  getVodSeriesInfo: function (seriesId, successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getVodSeriesInfo', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding, seriesId: seriesId }, '', function (result) {
      console.log("SUCCESS getVodSeriesInfo");
      console.log(result);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getVodContent");
      console.log(result);
      errorCallback();
    });
  },

  getAds: function (successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getAds', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, '', function (result) {
      console.log("SUCCESS getAds");
      console.log(result);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getAds");
      console.log(result);
      errorCallback();
    });
  },

  getOsms: function (successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'getOsms', sessionId: sessionId, udid: udid, lastKnownId: -1, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, '', function (result) {
      console.log("SUCCESS getOsms");
      console.log(result);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR getOsms");
      console.log(result);
      errorCallback();
    });
  },

  getTopLevelVodM3u8Url: function (vodId, successCallback, errorCallback) {
    var sessionId = User.getSessionId();
    var url = this.url + "index.php?requestMode=function&f=getVodM3u8&plain=true&vodId=" + vodId + "&sessionId=" + sessionId + "&m3u8";
    successCallback(url);
  },

  getTopLevelCatchupM3u8Url: function (catchupId, successCallback, errorCallback) {
    var sessionId = User.getSessionId();
    var url = this.url + "index.php?requestMode=function&f=getCatchupM3u8&plain=true&catchupId=" + catchupId + "&sessionId=" + sessionId + "&m3u8";
    successCallback(url);
  },

  getTopLevelStreamM3u8Url: function (streamId, successCallback) {
    var sessionId = User.getSessionId();
    var url = this.url + "index.php?requestMode=function&f=getStreamM3u8&plain=true&streamId=" + streamId + "&sessionId=" + sessionId + "&m3u8";
    successCallback(url);
  },

  recordOrDeleteCatchup: function (id, deleteCatchup, successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();
    var functionName = 'addRecordingTask';
    var params = { sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding };

    if (deleteCatchup) {
      params.f = 'deleteRecordingTask';
      params.recordingTaskId = id;
    } else {
      params.f = 'addRecordingTask';
      params.mode = "4";
      params.catchupId = id;
    }

    this.get_result_post(params, '', function (result) {
      console.log("SUCCESS " + functionName);
      console.log(result);
      successCallback(result.success);
    }, function (result) {
      console.log("ERROR " + functionName);
      console.log(result);
      errorCallback(false);
    });
  },

  logout: function (successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    this.get_result_post({ f: 'logout', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, '', function (result) {
      console.log("SUCCESS logout");
      console.log(result);
      // clear all local storage
      User.setLoggedOut();
      successCallback();
    });
  },

  // cvPushTelemetryRecords (ver WSDL: https://cv01.panaccess.com/?requestMode=wsdl&v=4.3&r=subscriber#op.id42)
  // records: array de hasta 100 objetos TelemetryRecord (lo limita/valida quien llama, ver Telemetry.js)
  // smartcardId: opcional, no se usa en este proyecto (no hay smartcard/CI+, es solo streaming OTT)
  pushTelemetryRecords: function (records, smartcardId, successCallback, errorCallback) {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    var params = {
      f: 'pushTelemetryRecords',
      sessionId: sessionId,
      records: JSON.stringify(records),
      udid: udid,
      os: this.loginParamOS,
      appVersion: this.appVersion,
      branding: this.branding
    };

    if (smartcardId) {
      params.smartcardId = smartcardId;
    }

    // Log del payload exacto que se manda, para poder comparar contra lo
    // que espera el WSDL cuando el backend responde fatal_error/unknown_error_serverside.
    console.log("REQUEST pushTelemetryRecords params:");
    console.log(params);
    console.log("REQUEST pushTelemetryRecords records (raw, antes de stringify):");
    console.log(records);
    // Log explícito y no-colapsable, para descartar caché vieja del navegador/TV
    // (la consola a veces colapsa objetos/strings largos y engaña visualmente).
    if (records && records[0]) {
      console.log("REQUEST pushTelemetryRecords -- record[0] fields => actionKey=" + JSON.stringify(records[0].actionKey) + " reasonKey=" + JSON.stringify(records[0].reasonKey) + " profileId=" + JSON.stringify(records[0].profileId));
    }

    this.get_result_post(params, '', function (result) {
      console.log("SUCCESS pushTelemetryRecords");
      console.log(result);
      successCallback(result);
    }, function (result) {
      console.log("ERROR pushTelemetryRecords");
      console.log(result);
      errorCallback(result);
    });
  },


  get_result: function (params, callbackName, successCallback, errorCallback) {
    params.requestMode = "function";
    params.apiToken = this.apiToken;
    params.l = this.lang;
    base_url = cv.url; //localStorage.getItem('base_url');
    console.log("get_result.base_url: " + base_url);
    $.ajax({

      url: cv.url,
      data: params,
      dataType: "jsonp",
      jsonp: 'jsonp',
      jsonpCallback: callbackName,
      timeout: 5000,
      success: function (result) {
        if (result.success) {
          successCallback(result);
        } else {
          errorCallback(result);
        }
      },
      error: function (xhr, textStatus, errorThrown) {
        errorCallback(textStatus);
      }
    });
  },

  get_result_post: function (params, callbackName, successCallback, errorCallback) {
    params.requestMode = "function";
    params.apiToken = this.apiToken;
    params.l = this.lang;
    base_url = cv.url;
    Storage.set("base_url", base_url);
    console.log("get_result.base_url: " + base_url);
    $.ajax({
      url: cv.url,
      data: params,
      type: "POST",
      timeout: 50000,
      success: function (result) {
        if (result.success) {
          successCallback(result);
        } else {
          errorCallback(result);
        }
      },
      error: function (xhr, textStatus, errorThrown) {
        errorCallback(textStatus);
      }
    });
  },

  get_from_url: function (base_url, params, callbackName, successCallback, errorCallback) {

    if (params !== false) {
      params.requestMode = "function";
      params.apiToken = this.apiToken;
      params.l = this.lang;
    }

    $.ajax({
      url: base_url,
      data: params,
      dataType: "jsonp",
      jsonp: 'jsonp',
      jsonpCallback: callbackName,
      timeout: 5000,
      success: function (result) {
        if (result.success) {
          successCallback(result);
        } else {
          errorCallback(result);
        }
      },
      error: function (xhr, textStatus, errorThrown) {
        errorCallback(textStatus);
      }
    });
  },

  get_epg: function (base_url, callbackName, successCallback, errorCallback, options) {

    var self = this;
    var ignoreAbort = options && options.ignoreAbort;
    var dynamicCallback = callbackName;
    if (ignoreAbort && callbackName === 'getEPGCallback') {
      // Generar un callback dinámico para evitar colisiones globales si es en paralelo
      dynamicCallback = 'getEPGCallback_' + Math.random().toString(36).substring(2, 9);
    }

    var previousRequest = this.epgRequest;
    
    // Verificar si hay una petición anterior en curso
    var hasRequestInProgress = previousRequest != null && previousRequest.readyState < 4;
    
    // Si hay una petición en curso, verificar si debemos cancelarla
    // Solo cancelar si no es una petición crítica (por ejemplo, desde loading)
    // Por ahora, solo cancelamos si la petición anterior ya terminó o está en estado inicial
    if (!ignoreAbort && hasRequestInProgress) {
      // Si la petición anterior está en progreso (readyState 1-3), no cancelarla
      // Solo cancelar si está en estado inicial (readyState 0) o completada (readyState 4)
      if (previousRequest.readyState === 0 || previousRequest.readyState === 4) {
        // Petición no iniciada o ya completada, es seguro cancelar
        console.log('Cancelando petición EPG anterior (estado: ' + previousRequest.readyState + ')');
        previousRequest.abort();
      } else {
        // Petición en progreso, crear nueva sin cancelar la anterior
        // Esto permite que múltiples peticiones EPG se ejecuten en paralelo
        console.log('Petición EPG en curso (estado: ' + previousRequest.readyState + '), creando nueva petición sin cancelar');
      }
    }
    
    var currentRequest = $.ajax({
      url: base_url,
      data: [],
      jsonp: 'jsonp',
      jsonpCallback: dynamicCallback,
      timeout: 60000,
      beforeSend: function () {
        // Solo cancelar si la petición anterior no está en progreso activo
        if (!ignoreAbort && previousRequest != null && 
            (previousRequest.readyState === 0 || previousRequest.readyState === 4)) {
          previousRequest.abort();
        }
      },
      success: function (result) {
        try {
          var json = typeof result === 'string' ? JSON.parse(result) : result;
          successCallback(json);
        } catch(e) {
          errorCallback("JSONParseError: " + e.message);
        }
      },
      error: function (xhr, textStatus, errorThrown) {
        // Si el error es "abort", no es un error real para el callback de error de negocio
        if (textStatus === 'abort') {
          console.log('Petición EPG abortada o ignorada');
          return;
        }
        errorCallback(textStatus);
      }
    });

    if (!ignoreAbort) {
      this.epgRequest = currentRequest;
    }
  },

  showSuccess: function (message, timeout) {
    console.log("showSuccess: " + message);
    $("#messages").empty();
    var $el = $('<div class="alert alert-success alert-dismissible fade in" role="alert" ><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><p class="text-center message">' + message + '<p></div>')
      .prependTo('#messages');
    if (timeout) {
      setTimeout(function () {
        $el.alert('close');
      }, timeout);
    }
  },

  showError: function (message, timeout) {
    console.log("showError: " + message);
    $("#messages").empty();
    var $el = $('<div class="alert alert-warning alert-dismissible fade in" role="alert" ><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><p class="text-center message">' + message + '<p></div>')
      .prependTo('#messages');
    if (timeout) {
      setTimeout(function () {
        $el.alert('close');
      }, timeout);
    }
  },

  getUrlParams: function (url) {
    var params = {};
    var parser = document.createElement('a');
    parser.href = url;
    var query = parser.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      params[pair[0]] = decodeURIComponent(pair[1]);
    }
    return params;
  },

  encrypt: function (x, key) {
    // encrypt value
    return "";
  },

  decrypt: function (x, key) {
    // decrypt value
    return "";
  },

  hashMD5: function (val) {
    return md5(val);
    //return CryptoJS.MD5(val);
  },

  changeLoaderVisibility: function (val) {
    var spinner = document.getElementById("spinner");
    if (spinner) {
      if (val) {
        spinner.style.display = 'inline';
      } else {
        spinner.style.display = 'none';
      }
    }
  },

  loggedIn: function (successCallback, errorCallback) {
    var parameters = {
      f: 'loggedIn',
      // sessionId: "olfd7tgvtils5v7d3dv6vkbekq", //User.getSessionId(),
      sessionId: User.getSessionId(),
      udid: getUdid(),
      os: this.loginParamOS,
      appVersion: this.appVersion,
      branding: this.branding
    };

    this.performPostRequest(parameters, successCallback, errorCallback);
  },

  verifyLoginCredentials: function (successCallback, errorCallback) {
    var parameters = {
      f: 'verifyLoginCredentials',
      // sessionId: "olfd7tgvtils5v7d3dv6vkbekq", //User.getSessionId(),
      sessionId: User.getSessionId(),
      udid: getUdid(),
      os: this.loginParamOS,
      appVersion: this.appVersion,
      branding: this.branding
    };

    this.performPostRequest(parameters, successCallback, errorCallback);
  },

  performPostRequest: function (parameters, successCallback, errorCallback) {
    this.get_result_post(parameters, '', function (result) {
      console.log("SUCCESS " + parameters.f);
      successCallback(result.answer);
    }, function (result) {
      console.log("ERROR " + parameters.f);
      console.log(result);
      errorCallback(result);
    });
  },

    /**
   * Kill the current login session without clearing the user data (just for testing purposes).
   * Call this function after the card id is used in another device.
   */
  _killLogin: function() {
    var udid = getUdid();
    var sessionId = User.getSessionId();

    cv.get_result_post({ f: 'logout', sessionId: sessionId, udid: udid, os: this.loginParamOS, appVersion: this.appVersion, branding: this.branding }, '', function (result) {
      console.log("SUCCESS logout");
      console.log(result);
    });
  }

  ,

  /*
   * getWatchlistEntries
   * addToWatchlist
  */
  _request: function(functionName, params, sc, ec) {
    var udid = getUdid();
    var sessionId = User.getSessionId();
    var params2 = {
      f: functionName,
      sessionId: sessionId,
      // udid: udid,
      // os: this.loginParamOS,
      // appVersion: this.appVersion,
      // branding: this.branding,

      // typeId: 7,
      // contentId: 161,
    };

    for (var key in params) {
      params2[key] = params[key];
    }

    cv.get_result_post(params2, '', function (result) {
      console.log("SUCCESS " + functionName);
      console.log(result);
    }, sc, ec);
  },

  performRequest: function (base_url, params, successCallback, errorCallback) {

    $.ajax({
      url: base_url,
      data: params,
      dataType: "json",
      timeout: 5000,
      success: function (result) {
        successCallback(result);
      },
      error: function (xhr, textStatus, errorThrown) {
        errorCallback(textStatus);
      }
    });
  },

};
