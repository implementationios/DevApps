VOD = (function (Events) {

  var VOD = {};

  $.extend(true, VOD, Events, {
    init: function () {
      this.items = [];
      this.$vodList = null;
      this.$vodContainer = null;
      this.homeObject = null;
      this.$lastVodFocused = null;
      this.$defaultFocus = null;
      this.bodyFontSize = 0;
      this.$sceneParent = null;
    },

    isShowed: function () {
      return $("#vodContainer").is(":visible") && $("#vodContainer").css('visibility') == "visible";
    },

    initializeValues: function () {
      this.$vodContainer = $("#vodContainer");
      this.$vodList = $("#vodList");
      this.$defaultFocus = $("#divVideoContainer");
      this.bodyFontSize = parseFloat($("body").css("font-size"));
      this.$sceneParent = this.$vodContainer.closest(".scene");
    },

    onFocus: function ($el) {
      if ($el.attr("id") == "divVideoContainer") {
        return;
      }

      this.$lastVodFocused = $el;
      var vodId = $el.data("id");
      if (vodId <= 0) {
        return;
      }

    },

    show: function () {
      this.homeObject.setMenuTitle(__("MenuMovies"));
      $("#channelsGrid").hide();
      $("#vodContainer").css({ "visibility": "visible" });
      $("#vodContainer").show();

      if (this.$lastVodFocused != null) {
        Focus.to(this.$lastVodFocused);
      } else {
        Focus.to(this.$defaultFocus);
      }
    },

    hide: function () {
      this.$vodContainer.css({ "visibility": "hidden" });
      $("#vodContainer").hide();
      $("#channelsGrid").show();
    },

    reset: function () {
      this.$lastVodFocused = null;
      this.items = [];
    },

    draw: function (categories) {
      this.initializeValues();

      var self = this;
      this.items = categories;
      var html = "";
      $.each(this.items, function (x, category) {
        html += self.homeObject.getHTMLRowVOD(category.vods, category.name, category.id, false);
      });

      this.$vodList.html(html);
      this.$lastVodFocused = this.$vodList.find(".focusable:first");
      if (this.isShowed()) {
        Focus.to(this.$lastVodFocused);
      }
    },

    navigate: function (direction) {
      var $current = Focus.focused;
      var $newFocus = "";

      if (direction == "left") {
        var $newFocus = Focus.focused.prevAll('.focusable');

        if ($($newFocus).index() != -1) {
          Focus.to($newFocus);
          $newFocus.parent().focus();

          if ($newFocus.offset().left < 0) {
            var $parent = $newFocus.parent();
            $parent.stop(true, true).animate({ scrollLeft: $parent.scrollLeft() - ($newFocus.width() + 20) }, 200);
          }
          return true;
        }
        return false;
      } else if (direction == "right") {
        var $newFocus = Focus.focused.nextAll('.focusable');

        if ($($newFocus).index() != -1 && $($newFocus).index()) {
          Focus.to($newFocus);
          $newFocus.parent().focus();

          var $parent = $newFocus.parent();
          if ($newFocus.offset().left + $newFocus.width() > $parent.width()) {
            $parent.stop(true, true).animate({ scrollLeft: $parent.scrollLeft() + $newFocus.width() - ($parent.width() - $newFocus.offset().left) }, 200);
          }
          return true;
        }
        return false;
      } else if (direction == "up" || direction == "down") {
        if (direction == "up") {
          $newFocus = $current.closest(".channels-div").prevAll(".channels-div").not(".hidden").first().find(".focusable:first");

          Focus.to($newFocus);
        } else if (direction == "down") {
          if ($current.is(this.$defaultFocus)) {
            Focus.to(this.$vodList.find(".focusable:first"));
            return
          } else if ($current.closest(".channels-div").is(this.$vodList.find(".channels-div:last"))) {
            return;
          }

          $newFocus = $current.closest(".channels-div").nextAll(".channels-div").not(".hidden").first().find(".focusable:first");
          Focus.to($newFocus);
        }

        if ($newFocus.length > 0) {
          var $nextRow = Focus.focused.closest(".channels-div");
          var jump = 0;
          if ($nextRow.position().top < 0) {
            jump = $nextRow.position().top;
          } else if ($nextRow.position().top + $nextRow.height() > this.$vodContainer.height()) {
            jump = ($nextRow.position().top + $nextRow.height()) - (this.$vodContainer.height() - 0);
          }

          this.$vodContainer.stop(true, true).animate({
            scrollTop: this.$vodContainer.scrollTop() + jump
          }, 200);

        } else {
          Focus.to(this.$defaultFocus);
        }
      }
    },

    onEnter: function ($el, callbackForPlay) {
      var id = $el.data("id");
      this.homeObject.currentVodCategoryId = $el.data("category-id");
      this.homeObject.$lastFocused = Focus.focused;
      VODDetail.show(id, this.currentVodCategoryId, this.homeObject);
      //Router.go('voddetail', id, this.homeObject.currentVodCategoryId, this.homeObject);


      // AppData.getTopLevelVodM3u8Url(id, function(url) {
      // 	console.log("Play vod with URL: " + url);
      // 	if (url != null && url.length > 0) {
      // 		self.homeObject.playContent("vod", id, url, vod);
      // 	}
      // });
    },

    onReturn: function (callback) {
      this.hide();
      callback();
    },

    isEmpty: function () {
      return this.items.length == 0;
    }

  });

  VOD.init();

  return VOD;
})(Events);