EPGDetails = (function (Events) {

  var EPGDetails = {};

  $.extend(true, EPGDetails, Events, {

    init: function ($container) {
      this.$container = $container;

      if (this.$container.length > 0) {
        this.$epgDetails = $container.find(".epg-dialog-details:first");
        if (this.$epgDetails.length == 0) {
          $container.append(this.getHtmlDialogEpgDetails());
          this.$epgDetails = $container.find(".epg-dialog-details:first");
        }
      } 

      this.$image = this.$epgDetails.find(".epg-dialog-details-img");
      this.$imageEvent = this.$epgDetails.find(".epg-dialog-details-event-img");
      this.$lcn = this.$epgDetails.find(".epg-dialog-details-header-lcn");
      this.$channelName = this.$epgDetails.find(".epg-dialog-details-header-channel");
      this.$eventTime = this.$epgDetails.find(".epg-dialog-details-header-time");
      this.$eventDuration = this.$epgDetails.find(".epg-dialog-details-header-duration");
      this.$detailsTitle = this.$epgDetails.find(".epg-dialog-details-title");
      this.$detailsDescription = this.$epgDetails.find(".epg-dialog-details-description");
      this.$favButton = this.$epgDetails.find(".epg-dialog-details-header-fav");
      this.$recordButton = this.$epgDetails.find(".epg-dialog-record");
      this.$liveButton = this.$epgDetails.find(".epg-dialog-live");
      this.$watchButton = this.$epgDetails.find(".epg-dialog-watch");
      this.$dialogMessage = this.$epgDetails.find(".epg-dialog-details-message");
      this.metadata = null;
      this.homeObject = null;
      this.serviceTVObj = null;
      this.$lastFocused = null;
    },

    refreshElReferences: function ($container) {
      this.$container = $container;
      this.$epgDetails = this.$container.find(".epg-dialog-details:first");

      this.$image = this.$epgDetails.find(".epg-dialog-details-img");
      this.$imageEvent = this.$epgDetails.find(".epg-dialog-details-event-img");
      this.$lcn = this.$epgDetails.find(".epg-dialog-details-header-lcn");
      this.$rating = this.$epgDetails.find(".epg-dialog-details-header-rating, .epg-dialog-details-header-raiting");
      this.$channelName = this.$epgDetails.find(".epg-dialog-details-header-channel");
      this.$eventTime = this.$epgDetails.find(".epg-dialog-details-header-time");
      this.$eventDuration = this.$epgDetails.find(".epg-dialog-details-header-duration");
      this.$detailsTitle = this.$epgDetails.find(".epg-dialog-details-title");
      this.$detailsDescription = this.$epgDetails.find(".epg-dialog-details-description");
      this.$favButton = this.$epgDetails.find(".epg-dialog-details-header-fav");
      this.$recordButton = this.$epgDetails.find(".epg-dialog-record");
      this.$liveButton = this.$epgDetails.find(".epg-dialog-live");
      this.$watchButton = this.$epgDetails.find(".epg-dialog-watch");
      this.$dialogMessage = this.$epgDetails.find(".epg-dialog-details-message");
    },

    getHtmlDialogEpgDetails: function () {
      return ''
        + '<div class="modal fade alerts nb-alert epg-dialog-details" role="dialog" style="background-color: #ffffff00; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">'
        +  '<div class="modal-dialog modal-center" style="width: 70%;">'
        +    '<div class="modal-content" style="height: 40em; border-radius: 12px; overflow: hidden; padding: 16px;">'

        +      '<!-- Primera Fila -->'
        +      '<div style="height: 30%; display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">'
        +        '<!-- Logo del Canal -->'
        +        '<div class="col-sm-3" style="text-align: center;width: 15em;">'
        +          '<img class="epg-dialog-details-img" src="" alt="">'
        +        '</div>'

        +        '<!-- Información Central -->'
        +        '<div class="col-sm-6" style="text-align: justify;width: 80%;height: 11em;display: flex;flex-direction: column;flex-wrap: nowrap;justify-content: space-evenly;"">'
        +          '<h3 class="epg-dialog-details-header-channel" style="font-size: 1.8em; font-weight: bold; margin: 0;"></h3>'
        +          '<p class="epg-dialog-details-header-lcn" style="font-size: 1.2em; color: #ffffff;"></p>'
        +          '<p class="epg-dialog-details-header-raiting" style="font-size: 1.2em; color: #ffffff;"></p>'
        +          '<p class="epg-dialog-details-header-time" style="font-size: 1.2em; color: #ffffff;"></p>'
        +          '<p class="epg-dialog-details-header-duration" style="font-size: 1.2em; color: #ffffff;"></p>'
        +        '</div>'

        +        '<!-- Imagen del Evento -->'
        +        '<div class="col-sm-3" style="text-align: center;width: 15em;">'
        +          '<img class="epg-dialog-details-event-img" src="" alt="">'
        +        '</div>'
        +      '</div>'

        +      '<!-- Segunda Fila -->'
        +      '<div  style="height: 20em;">'
        +        '<h4 class="epg-dialog-details-title" style="font-size: 1.6em; font-weight: bold; text-align: center;"></h4>'
        +        '<p class="epg-dialog-details-description" style="font-size: 1.2em; text-align: justify; margin-top: 8px;line-height: 1.5em;"></p>'
        +      '</div>'

        +      '<!-- Tercera Fila -->'
        +      '<div  style="display: flex; justify-content: center; gap: 16px;">'
        +        '<div class="nb-icon-button focusable nb-icon-star epg-dialog-details-header-fav" style="width: 50px; height: 50px; border-radius: 50%; display: flex; justify-content: center; align-items: center; background-color: #007bff;"></div>'
        +        '<button type="button" class="btn-default btn-lg focusable epg-dialog-live hidden" data-parent-type="message" style="background-color: #007bff; color: #fff; padding: 10px 20px; border-radius: 8px;">' + __("EPGLive") + '</button>'
        +        '<button type="button" class="btn-default btn-lg focusable epg-dialog-watch hidden" data-parent-type="message" style="background-color: #28a745; color: #fff; padding: 10px 20px; border-radius: 8px;">' + __("EPGWatch") + '</button>'
        +        '<button type="button" class="btn-default btn-lg focusable epg-dialog-record hidden" data-parent-type="message" style="background-color:rgb(167, 40, 40); color: #fff; padding: 10px 20px; border-radius: 8px;">' + __("CatchupRecordButton") + '</button>'
        +      '</div>'
        +    '</div>'
        +  '</div>'
        +'</div>'

    },

    show: function ($container, metadata, homeObject, $lastFocused) {
      this.refreshElReferences($container);
      this.homeObject = homeObject;
      this.$lastFocused = $lastFocused;

      var background = "";
      var image1 = "", image2 = "", lcn = "", channelName = "", ratingAndTime = "", duration = "", title = "", description = "";
      var catchupObj = null;
      var epgEvent = null;
      var self = this;
      this.serviceTVObj = null;
      this.metadata = null;

      this.$recordButton.addClass("hidden");
      this.$liveButton.addClass("hidden");
      this.$watchButton.addClass("hidden");
      this.$epgDetails.find(".epg-dialog-watch").addClass("hidden");
      this.$dialogMessage.text("");

      if (metadata.type == "service") {
        this.serviceTVObj = metadata.item;

        background = this.serviceTVObj.backgroundColor && this.serviceTVObj.backgroundColor.length > 0 ? ("#" + this.serviceTVObj.backgroundColor) : "";
        image1 = this.serviceTVObj.img;
        image2 = this.serviceTVObj.img;
        lcn = this.serviceTVObj.lcn;
        raiting = this.serviceTVObj.parentalRating;
        channelName = this.serviceTVObj.name;



        // if (this.homeObject.playbackMetadata.type != "service" || this.homeObject.playbackMetadata.id != this.serviceTVObj.id) {
        //   this.$watchButton.removeClass("hidden");
        // }

        if (metadata.item2) { //future event
          this.$liveButton.removeClass("hidden");
          this.setEpgEvent(metadata.item2);
        } else { //live event
          epgEvent = AppData.getLiveEvent(this.serviceTVObj);
          this.setEpgEvent(epgEvent);

          if (this.homeObject.playbackMetadata.type != "service" || this.homeObject.playbackMetadata.id != this.serviceTVObj.id) {
            this.$liveButton.removeClass("hidden");
          }
        }

      } else if (metadata.type == "catchup-event") {
        catchupObj = metadata.item;
        var group = AppData.getCatchupGroup(catchupObj.catchupGroupId);
        this.serviceTVObj = AppData.getServiceTVByStreamId(group.epgStreamId);

        if (this.serviceTVObj && this.serviceTVObj.epgItems && this.serviceTVObj.epgItems.length > 0) {
          epgEvent = this.serviceTVObj.epgItems.filter(function (e) { return e.event_id == catchupObj.eventId });
          epgEvent = (epgEvent && epgEvent.length > 0) ? epgEvent[0] : null;
          this.setEpgEvent(epgEvent);
        } else {
          AppData.getSimpleEpgByChannel(this.serviceTVObj.id, function () {
            self.serviceTVObj = AppData.getServiceTVByStreamId(group.epgStreamId);
            if (self.serviceTVObj && self.serviceTVObj.epgItems) {
              epgEvent = self.serviceTVObj.epgItems.filter(function (e) { return e.event_id == catchupObj.eventId });
              epgEvent = (epgEvent && epgEvent.length > 0) ? epgEvent[0] : null;
              self.setEpgEvent(epgEvent);
            }
          });
        }

        background = group.background && group.background.length > 0 ? ("#" + group.background) : "";
        image1 = this.serviceTVObj.img;
        image2 = group.img;
        lcn = group.lcn;
        rating = group.parentalRating;
        channelName = group.name;

        if (AppData.isCatchupRecorded(catchupObj.id)) {
          this.$recordButton.text(__("CatchupDeleteButton"));
        } else {
          this.$recordButton.text(__("CatchupRecordButton"));
        }

        this.$liveButton.removeClass("hidden");
        this.$recordButton.removeClass("hidden");

        if (this.homeObject.playbackMetadata.type != "catchup-event" || this.homeObject.playbackMetadata.id != catchupObj.id) {
          if (catchupObj.startDate <= getTodayDate()) {
            this.$watchButton.removeClass("hidden");
          }
        }
      } else {
        return;
      }

      if (background.length > 0) {
        this.$image.attr("style", " background-color: " + background);
      }

      this.$image.loadImage(image1, image2);
      this.$lcn.text(lcn);
      this.$channelName.text(channelName);

      // check if favorited
      this.$favButton.addClass("nb-icon-star");
      this.$favButton.removeClass("nb-icon-star-fill");
      var favIndex = User.hasServiceTVFavorited(lcn);
      if (favIndex >= 0) {
        this.$favButton.addClass("nb-icon-star-fill");
        this.$favButton.removeClass("nb-icon-star");
      }

      this.metadata = metadata;
      this.$epgDetails.modal("show");
      Focus.to(this.$favButton);
    },

    setEpgEvent: function (epgEvent) {
      if (epgEvent) {
        var ratingAndTime = EPG.getEPGItemTimeStringByEpgItem(epgEvent);
        var duration = getTimeDifference(epgEvent.startDate, epgEvent.endDate, "minutes") + " " + __("MoviesMinutes");
        var title = epgEvent.languages.length > 0 ? epgEvent.languages[0].title : "";
        var description = epgEvent.languages.length > 0 ? epgEvent.languages[0].extendedDescription : "";
        var image = epgEvent.imageUrl;
        var rating = epgEvent.parentalRating;

        this.$eventTime.text(ratingAndTime);
        this.$eventDuration.text(duration);
        this.$detailsTitle.text(title);
        this.$detailsDescription.text(description);

        // Mostrar el rating como icono
        if (this.$rating && this.$rating.length > 0) {
          this.$rating.html(this.homeObject.getRatingIconHtml(rating));
        }

        var $imageContainer = this.$imageEvent.closest("div");

        if (image) {
          this.$imageEvent
            .off("error") // limpiar eventos anteriores
            .on("error", function () {
              $imageContainer.hide(); // ocultar si hay error de carga
            })
            .attr("src", image);

          $imageContainer.show(); // por si estaba oculto anteriormente
        } else {
          $imageContainer.hide(); // si no hay imagen, ocultar directamente
        }
      }
    },


    isShowed: function () {
      // Verificar tanto la clase "in" como si el modal está realmente visible
      // Esto evita que isShowed() devuelva true durante la animación de cierre
      return this.$epgDetails.hasClass("in") && this.$epgDetails.is(":visible");
    },

    navigate: function (direction) {
      var $focused = Focus.focused;
      var $buttons = this.$epgDetails.find(".focusable:visible"); // Todos los elementos enfocables
      var currentIndex = $buttons.index($focused);

      if (direction == "up" && !$focused.is(this.$favButton)) {
        Focus.to(this.$favButton);
      } else if (direction == "down" && $focused.is(this.$favButton)) {
        Focus.to($buttons.filter(".epg-dialog-live, .epg-dialog-watch, .epg-dialog-record").first());
      } else if (direction == "left" && currentIndex > 0) {
        Focus.to($buttons.eq(currentIndex - 1));
      } else if (direction == "right" && currentIndex < $buttons.length - 1) {
        Focus.to($buttons.eq(currentIndex + 1));
      }
    },

    onEnter: function ($el) {
      console.log('EPGDetails.onEnter: llamado con elemento=', $el ? $el.attr('class') : 'null');
      if ($el.is(this.$favButton)) {
        //save as favorite
        this.onFavorite();
        return;
      } else if ($el.is(this.$liveButton)) {
        console.log('EPGDetails.onEnter: botón Live presionado');
        this.playLive();
        this.close();
        this.closeEPGIfVisible();
      } else if ($el.is(this.$watchButton)) {
        this.playCatchup();
        this.close();
        this.closeEPGIfVisible();
        return;
      } else if ($el.is(this.$recordButton)) {
        //check if is recorded
        if (this.$recordButton.text() == __("CatchupRecordButton")) {
          this.onRecord();
        } else {
          this.onDeleteRecorded();
        }
        return;
      }
    },

    playLive: function () {
      console.log('EPGDetails.playLive: llamado');
      console.log('EPGDetails.playLive: serviceTVObj=', this.serviceTVObj);
      if (!this.serviceTVObj) {
        console.error('EPGDetails.playLive: serviceTVObj es null/undefined');
        return;
      }
      if (!this.serviceTVObj.id || !this.serviceTVObj.url) {
        console.error('EPGDetails.playLive: serviceTVObj no tiene id o url', this.serviceTVObj);
        return;
      }
      console.log('EPGDetails.playLive: reproduciendo servicio id=', this.serviceTVObj.id, 'url=', this.serviceTVObj.url);
      this.homeObject.playContentWithAccess("service", this.serviceTVObj.id, this.serviceTVObj.url, this.serviceTVObj, true, false);
    },

    playCatchup: function () {
      var catchup = false;
      var self = this;

      if (this.metadata.type != "catchup-event") {
        return;
      }


      catchup = this.metadata.item;
      if (catchup !== false) {
        AppData.getTopLevelCatchupM3u8Url(catchup.id, function (url) {
          console.log("Play CATCHUP with URL: " + url);
          if (url != null && url.length > 0) {
            self.homeObject.playContentWithAccess("catchup-event", catchup.id, url, catchup);
          }
        });
      }
    },

    onRecord: function () {
      if (this.metadata != null && this.metadata.type == "catchup-event") {

        if (!AppData.canRecordCatchup(this.metadata.item.id)) {
          this.$dialogMessage.text(__("CatchupLowCatchupRecordingSpace"));
          return;
        }

        var self = this;
        AppData.recordCatchup(this.metadata.item.id, function (response) {
          if (self.homeObject) {
            if (response) {
              //self.homeObject.$el.showAlertMessage(__("CatchupRecordingOk"), 'record_catchup', null);
              self.$dialogMessage.text(__("CatchupRecordingOk"));
              self.$recordButton.text(__("CatchupDeleteButton"));
              self.homeObject.getDataForCatchupsRecorded();
            } else {
              self.$dialogMessage.text(__("CatchupRecordingFailed"));
              //self.homeObject.$el.showAlertMessage(__("CatchupRecordingFailed"), 'record_catchup', null);
            }
            Focus.to(self.$recordButton);
          }
        });
      }
    },

    onDeleteRecorded: function () {
      if (this.metadata != null && this.metadata.type == "catchup-event") {
        var self = this;
        AppData.deleteCatchup(this.metadata.item.id, function (response) {
          if (self.homeObject) {
            if (response) {
              self.$dialogMessage.text(__("CatchupRecordingDeleted"));
              self.$recordButton.text(__("CatchupRecordButton"));
              //self.homeObject.$el.showAlertMessage(__("CatchupRecordingDeleted"), 'record_catchup', null);
              self.homeObject.getDataForCatchupsRecorded();
            } else {
              self.$dialogMessage.text(__("CatchupDeleteFailed"));
              //self.homeObject.$el.showAlertMessage(__("CatchupDeleteFailed"), 'record_catchup', null);
            }
          }
        });
      }
    },

    onFavorite: function () {
      var serviceTV = this.serviceTVObj;
      if (serviceTV != null) {
        var lcn = serviceTV.lcn;

        var favorites = User.getServicesTVFavorited();
        if (favorites.length > 0) {
          var index = User.hasServiceTVFavorited(lcn);
          if (index >= 0) { // remove favorite
            favorites.splice(index, 1);
          } else { // add favorite
            favorites.push(lcn);

          }
        } else { // add first favorite
          favorites = [lcn];
        }

        User.setServicesTVFavorited(favorites);

        if (User.hasServiceTVFavorited(lcn) >= 0) {
          this.$favButton.addClass("nb-icon-star-fill");
          this.$favButton.removeClass("nb-icon-star");
        } else {
          this.$favButton.removeClass("nb-icon-star-fill");
          this.$favButton.addClass("nb-icon-star");
        }

        this.homeObject.setFavoritesRow();
        Focus.to(this.$favButton);
        return true;
      }

      return false;
    },

    close: function () {
      // Remover inmediatamente la clase "in" y otros estados del modal para que isShowed() devuelva false
      // Esto permite que los eventos del control remoto funcionen inmediatamente
      this.$epgDetails.removeClass("in");
      this.$epgDetails.removeClass("show");
      this.$epgDetails.css("display", "none");
      this.$epgDetails.modal("hide");

      var self = this;
      setTimeout(function () {
        if (self.$lastFocused) {
          Focus.to(self.$lastFocused);
        }
        // Asegurarse de que el modal esté completamente cerrado
        self.$epgDetails.removeClass("in");
        self.$epgDetails.removeClass("show");
        self.$epgDetails.css("display", "none");
      }, 250);
    },

    /**
     * Cierra EPGCards o EPG tradicional si están visibles
     * Útil cuando se reproduce contenido desde EPGDetails
     */
    closeEPGIfVisible: function() {
      // Cerrar EPGCards si está visible
      if (typeof EPGCards !== 'undefined' && EPGCards.isShowed && typeof EPGCards.isShowed === 'function' && EPGCards.isShowed()) {
        EPGCards.hide();
      }
      // Cerrar EPG tradicional si está visible (por si acaso)
      if (typeof EPG !== 'undefined' && EPG.isShowed && typeof EPG.isShowed === 'function' && EPG.isShowed()) {
        EPG.hide();
      }
    },

  });

  return EPGDetails;
})(Events);
