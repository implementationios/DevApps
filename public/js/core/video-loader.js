// Video.js (CDN, ~150KB) y su plugin HLS (js/core/videojs-hlsjs-plugin.js,
// ~240KB) se cargan de forma asíncrona en vez de bloquear el parseo del
// resto de scripts del arranque (login/EPG). nbplayer.js espera a
// window.__videoJsReady antes de llamar a videojs('mainVideo'), así que
// el reproductor sigue quedando listo antes de que Home lo necesite.
window.__videoJsReady = new Promise(function (resolve, reject) {
  var videoJsScript = document.createElement('script');
  videoJsScript.src = 'https://vjs.zencdn.net/6.6.3/video.min.js';
  videoJsScript.onload = function () {
    var hlsPluginScript = document.createElement('script');
    hlsPluginScript.src = 'js/core/videojs-hlsjs-plugin.js';
    hlsPluginScript.onload = function () { resolve(); };
    hlsPluginScript.onerror = function (err) { reject(err); };
    document.head.appendChild(hlsPluginScript);
  };
  videoJsScript.onerror = function (err) { reject(err); };
  document.head.appendChild(videoJsScript);
});
