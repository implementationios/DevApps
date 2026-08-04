VODDetail = (function (Events) {

  var VODDetail = {};

  $.extend(true, VODDetail, Events, {
    init: function () {
      this.initializeValues();
    },

    initializeValues: function () {
      this.$container = $("#vodDetailContainer");
      this.$sceneParent = this.$container.closest(".scene");
      this.$container.css({ "visibility": "visible", "background-image": 'url(assets/images/' + CONFIG.app.brand + '/background.png)' });
      this.reset();
    },

    show: function (id, categoryId, homeObject) {
      this.initializeValues();
      this.$container.find("#episodesLabel").html(__("MoviesEpisodes"));
      $(".nb-dropdown").nbDropdown([], 0);
      this.homeObject = homeObject;
      this.vodId = id;
      this.categoryId = categoryId;
      var self = this;

      $(".vod-detail-container").hide();
      $(".serie-detail-container").hide();
      App.throbber();

      AppData.getVODItem(id, function (vod) {
        self.setVodContent(vod);
      });
    },

    setVodContent: function (vod) {
      baseUrl = Storage.get("base_url")
      var img = vod.extraImageURL;

      App.throbberHide();
      var category = AppData.getCategoryById(this.categoryId);
      console.log(vod);
      var duration = vod.duration;
      duration = duration != null && duration > 0 ? Math.floor(duration / 60) : 0;
      var durationString = duration > 0 ? (duration + " " + __("MoviesMinutes")) : "";
      var rating = vod.rating / 10;
      img = ((img == null || img.length == 0) && vod.image1Id) ? baseUrl + "/cv_data_pub/images/" + vod.image1Id + "/v/original.jpg" : img;
      img = ((img == null || img.length == 0) && vod.image2Id) ? baseUrl + "/cv_data_pub/images/" + vod.image2Id + "/v/original.jpg" : img;
      img = ((img == null || img.length == 0) && vod.image3Id) ? baseUrl + "/cv_data_pub/images/" + vod.image3Id + "/v/original.jpg" : img;

      if (vod.isSeries) {
        $(".vod-detail-container").hide();
        $(".serie-detail-container").show();
        this.$container.find(".vod-serie-picture").loadImage(img);
        this.$container.find(".vod-serie-picture").show();

        $(".nb-dropdown").nbDropdown(vod.seasons, 0);
      } else {
        $(".serie-detail-container").hide();
        $(".vod-detail-container").show();
        this.$container.find(".vod-picture").loadImage(img);
        this.$container.find(".vod-picture").show();
      }
      // this.$container.find(".vod-picture").hide();
      this.$container.find(".vod-top-right-title").html(vod.name);
      this.$container.find(".vod-top-right-category").html(category != null ? category.name : "");
      this.$container.find(".vod-top-time").html(durationString);
      this.$container.find(".vod-top-right-description").html(vod.description);

      if (CONFIG.app.brand === "jrmax") {
        const inputs = document.querySelectorAll(".vod-top-right-title, .vod-top-right-category, .vod-top-time, .vod-top-right-description");
        inputs.forEach(input => {
          input.style.setProperty("color", "black", "important"); // Aplica color con !important
          input.querySelectorAll("*").forEach(child => {
            child.style.setProperty("color", "black", "important"); // Fuerza el color en todos los hijos
          });
        })
      }

      var ratingHtml = "";
      $.each([1, 2, 3, 4, 5], function (index, pos) {
        ratingHtml += '<div class="nb-icon-button nb-icon-star';
        if (pos <= rating) {
          ratingHtml += "-fill";
        } else if (rating > (pos - 1) && rating < pos) {
          ratingHtml += "-half";
        }
        ratingHtml += '"></div>';
      });
      $(".vod-top-rating").html(ratingHtml);

      // set row of "similar"
      var similar = AppData.getSimilarVOD(this.vodId);
      if (similar && similar.length > 0) {
        var similarHtml = this.homeObject.getHTMLRowVOD(similar, __("MoviesSeemsLikeTitle"), -1, false);
        $(".vod-container-bottom").html(similarHtml);
      } else {
        $(".vod-container-bottom").html("");
      }

      this.vodObject = vod;

      if (vod.isSeries) {
        var $focus = null;
        if ($(".nb-dropdown-button").css("visibility") == 'visible') {
          $focus = $(".nb-dropdown-button");
          Focus.to($focus);
        }
        var self = this;
        setTimeout(function () {
          self.changeSeason($(".nb-dropdown-button").nbDropdownGetSelected(), ($focus == null));
        }, 500);
      } else {
        Focus.to($(".vod-top-left-play"));
      }
    },

    onEnter: function ($el, event) {

      var self = this;

      if ($el.isNbDropdown()) {
        if ($el.isNbDropdownOpened()) {
          $el.nbDropdownSelect();
          $el.nbDropdownClose();
          this.changeSeason($el.nbDropdownGetSelected());
        } else {
          $el.nbDropdownOpen();
        }
        return;
      } else if (this.vodObject.isSeries) {

        var seasonId = $el.data("season");
        var episodeId = $el.data("id");
        var season = this.vodObject.seasons.filter(function (season) { return season.id == seasonId });
        season = season.length > 0 ? season[0] : null;

        var episode = null;
        if (season != null) {
          episode = season.episodes.filter(function (episode) { return episode.id == episodeId });
          episode = episode.length > 0 ? episode[0] : null
        }

        if (episode != null) {
          episode.seasonId = seasonId;
          this.homeObject.playEpisode(this.vodObject.id, episode);
        }

        return;
      }

      if ($el.is($(".vod-top-left-play"))) {
        AppData.getTopLevelVodM3u8Url(this.vodId, function (url) {
          console.log("Play vod with URL: " + url);
          if (url != null && url.length > 0) {
            self.homeObject.playContent("vod", self.vodId, url, self.vodObject);
          }
        });
      } else {
        var id = $el.data("id");
        if (id != null) {
          var categoryId = $el.data("category-id");
          this.show(id, categoryId, this.homeObject);
        }
      }

      return true;
    },

    /**
     * @inheritdoc Scene#navigate
     */
    navigate: function (direction) {

      var $current = Focus.focused;

      if (this.vodObject.isSeries) {
        var episodes = false;
        var $focusTo = [];
        if ($current.hasClass("nb-dropdown-button")) {
          if (direction == "down") {
            if ($current.isNbDropdownOpened()) {
              $focusTo = $current.nextAll(".nb-dropdown-content:first").find("a:first");
            } else {
              $focusTo = $(".serie-episodes div.focusable:first");
            }
          }
        } else if ($current.isNbDropdownOpened()) {
          if (direction == "down") {
            $focusTo = $current.next("a:first");
          } else if (direction == "up") {
            $focusTo = $current.prev("a:first");
            if ($focusTo.length == 0) {
              $focusTo = $current.parent().prevAll(".nb-dropdown-button:first");
            }
          }
        } else { //episode list
          episodes = true;
          if (direction == "down") {
            $focusTo = $current.next("div.focusable:first");
          } else if (direction == "up") {
            $focusTo = $current.prev("div.focusable:first");

            if ($focusTo.length == 0) {
              $focusTo = $(".nb-dropdown-button");
            }
          }
        }

        if ($focusTo.length > 0) {
          Focus.to($focusTo);

          if (episodes) {
            if ((Focus.focused.offset().top + Focus.focused.height()) > $(".serie-episodes").height()) {
              var to = $(".serie-episodes").scrollTop() + (Focus.focused.offset().top + Focus.focused.height()) - $(".serie-episodes").height();
              $(".serie-episodes").scrollTop(to);
            } else if (Focus.focused.offset().top < $(".serie-episodes").offset().top) {
              $(".serie-episodes").scrollTop($(".serie-episodes").scrollTop() - ($(".serie-episodes").offset().top - Focus.focused.offset().top))
            }
          }
        }
        return;
      }

      if (direction == "down") {
        Focus.to($(".vod-container-bottom .vod-list:first"));
      } else if (direction == "up") {
        Focus.to($(".vod-top-left-play"));
      } else if ($current.hasClass("vod-list")) {
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
        }
      }

    },

    changeSeason: function (seasonId, autoFocus) {
      var filtered = this.vodObject.seasons.filter(function (item) { return item.id == seasonId });

      if (filtered.length > 0) {
        this.printEpisodes(seasonId, filtered[0].episodes, autoFocus);
      } else {
        this.printEpisodes(seasonId, [], false);
      }
    },

    printEpisodes: function (seasonId, episodes, autoFocus) {

      var self = this;
      var html = "";
      episodes.forEach(function (episode, index, array) {
        html += self.getHTMLEpisode(seasonId, episode);
      });

      $(".serie-episodes").html(html);

      if (autoFocus) {
        Focus.to($(".serie-episodes").find(".focusable:first"));
      }
    },

    getHTMLEpisode: function (seasonId, episode) {

      baseUrl = Storage.get("base_url")
      var image = $(".vod-serie-picture").attr("src");

      if (this.vodObject.baseImageUrl == null || this.vodObject.baseImageUrl.length > 0) {
        if (episode.image1Id != null) {
          image = baseUrl + "/cv_data_pub/images/" + episode.image1Id + "/v/original.jpg";
        } else if (episode.image2Id != null) {
          image = baseUrl + "/cv_data_pub/images/" + episode.image2Id + "/v/original.jpg";
        } else if (episode.image3Id != null) {
          image = baseUrl + "/cv_data_pub/images/" + episode.image3Id + "/v/original.jpg";
        }
      }

      var timeResume = User.getVideoHistoryFor("vod", episode.id);
      var currentTimePercentage = 0;
      if (timeResume > 0) {
        currentTimePercentage = timeResume / episode.duration * 100;
      }

      var html = '<div class="serie-episode-item focusable" data-id="' + episode.id + '" data-season="' + seasonId + '">'
        + '<div class="serie-episode-imagediv">'
        + '<div class="serie-episode-img-bar-group">'
        + '<img src="' + image + '"/>'
        + '<div class="serie-episode-progress-bar"><div style="width: ' + currentTimePercentage + '%"></div></div>'
        + '</div>'
        + '<div class="vod-top-left-play">'
        + '<i class="fa fa-play"></i>'
        + '</div>'
        + '</div>'
        + '<div class="serie-episode-descriptiondiv">'
        + '<h2>' + episode.name + '</h2>'
        + '<p>' + episode.description + '</p>'
        + '</div>'
        + '</div>';

      return html;
    },

    isShowed: function () {
      return $("#vodDetailContainer").is(":visible") && $("#vodDetailContainer").css('visibility') == "visible";
    },

    onFocus: function ($el) {
      this.$lastFocused = $el;
    },

    hide: function () {
      this.$container.css({ "visibility": "hidden" });
    },

    reset: function () {
      this.vodId = 0;
      this.categoryId = 0;
      this.homeObject = null;
      this.vodObject = null;
      this.$lastFocused = null;

      this.$container.find(".vod-serie-picture").hide();
      this.$container.find(".vod-picture").hide();
      this.$container.find(".nb-dropdown").nbDropdown([], 0);
      this.$container.find(".vod-top-right-title").html("");
      this.$container.find(".vod-top-right-category").html("");
      this.$container.find(".vod-top-time").html("");
      this.$container.find(".vod-top-right-description").html("");
      this.$container.find(".vod-top-rating").html("");
      this.$container.find(".vod-container-bottom").html("");
      this.$container.find(".serie-episodes").html("");
      this.$container.find(".serie-episodes").scrollTop(0);
    },

    onReturn: function (callback) {
      this.hide();
      callback();
    },

    setFocus: function ($el) {
      if ($el == null || $el.length == 0) {
        $el = this.$lastFocused;
      }

      // Fallbacks defensivos: al volver del player el último elemento puede no existir
      // o estar oculto, dejando el foco "perdido".
      if (!$el || $el.length == 0 || !$el.is(":visible") || !$.contains(document, $el.get(0))) {
        $el = this.$container.find(".nb-dropdown-button:visible:first");
      }
      if (!$el || $el.length == 0) {
        $el = this.$container.find(".vod-top-left-play:visible:first");
      }
      if (!$el || $el.length == 0) {
        $el = this.$container.find(".focusable:visible:first");
      }

      if ($el && $el.length > 0) {
        Focus.to($el);
      }
    }

  });

  VODDetail.init();

  return VODDetail;
})(Events);
