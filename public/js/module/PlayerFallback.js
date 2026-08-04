PlayerFallback = (function (Events) {

  var PlayerFallback = {};

  $.extend(true, PlayerFallback, Events, {
    contentType: null,
    contentObject: null,

    init: function () {

    },

    show: function($videoContainer, message, type, item) {
      debugger;
      this.hide();

      var html = '<div class="player-fallback">'
                + '<div class="player-fallback-content">'
                + '<p class="heading player-fallback-message">' + message + '</p>'
                + '</div>'
                + '</div>';

      $videoContainer.append(html);
      this.contentType = type;
      this.contentObject = item;
    },

    hide: function() {
      $(".player-fallback").remove();
      this.contentType = null;
      this.contentObject = null;
    },

    isShown: function () {
      return $(".player-fallback").length > 0 && $(".player-fallback:first").is(":visible");
    }

  });

  return PlayerFallback;
})(Events);