var Ads = (function () {
  var AppData = null;
  var carouselTimeouts = {}; // Almacenar timeouts para cleanup
  var cachedElements = {}; // Cache de elementos DOM

  var module = {
    init: function (appDataInstance) {
      AppData = appDataInstance;
      return this;
    },

    // Cleanup al destruir
    destroy: function() {
      this.clearAllTimeouts();
      cachedElements = {};
    },

    clearAllTimeouts: function() {
      for (var containerId in carouselTimeouts) {
        if (carouselTimeouts[containerId]) {
          clearTimeout(carouselTimeouts[containerId]);
        }
      }
      carouselTimeouts = {};
    },

    getDataForAds: function (callback) {
      var self = this;

      if (!AppData || typeof AppData.getAds !== 'function') {
        console.error("AppData no inicializado correctamente.");
        if (typeof callback === 'function') callback();
        return;
      }

      AppData.getAds(function (ads) {
        // Filtrar ads expirados en tiempo real
        var validAds = self.filterValidAds(ads);

        var adsByLocation = {
          top: validAds.filter(function (ad) { return ad.locationType === 1; }),
          bottom: validAds.filter(function (ad) { return ad.locationType === 0; })
        };

        console.log("topAds received:", adsByLocation.top);
        console.log("bottomAds received:", adsByLocation.bottom);

        self.renderAdsByLocation('publicidad-home-top', adsByLocation.top);
        self.renderAdsByLocation('publicidad-home-bottom', adsByLocation.bottom);

        if (typeof callback === 'function') callback();
      }, function (error) {
        console.error("Error loading ads:", error);
        if (typeof callback === 'function') callback();
      });
    },

    // Filtrar ads por tiempo de activación y expiración
    filterValidAds: function(ads) {
      var now = new Date();
      return ads.filter(function(ad) {
        var activationTime = ad.activationTime ? new Date(ad.activationTime) : null;
        var expiryTime = ad.expiryTime ? new Date(ad.expiryTime) : null;

        // Validar período de activación
        if (activationTime && now < activationTime) return false;
        if (expiryTime && now > expiryTime) return false;

        // Pre-validar URL del archivo
        return this.isValidFileUrl(ad.file);
      }.bind(this));
    },

    // Validar URL antes de crear elementos
    isValidFileUrl: function(url) {
      if (!url || typeof url !== 'string') return false;

      var validExtensions = /\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg)$/i;
      var isValidUrl = /^https?:\/\//.test(url);

      // Log para debug
      console.log("Validating URL:", url, "Valid:", isValidUrl && validExtensions.test(url));

      return isValidUrl && validExtensions.test(url);
    },

    // Validar displayTime con fallback inteligente
    getDisplayTime: function(ad) {
      var displayTime = ad.displayTime;

      // Validar que sea un número válido
      if (!displayTime || displayTime <= 0) {
        // Fallback basado en tipo de contenido
        var isVideo = this.esVideo(ad.file);
        return isVideo ? 10000 : 5000; // 10s para video, 5s para imagen
      }

      // Convertir a millisegundos y limitar entre 2-30 segundos
      var timeMs = displayTime * 1000;
      return Math.max(2000, Math.min(30000, timeMs));
    },

    // validar y ocultar contenedor
    hideContainer: function(containerId) {
      // limpiar timeout de carrusel (si existiera)
      if (carouselTimeouts[containerId]) {
        clearTimeout(carouselTimeouts[containerId]);
        delete carouselTimeouts[containerId];
      }
      var el = document.querySelector("." + containerId);
      if (el) {
        el.style.display = "none";
        el.innerHTML = "";
      }
    },

    renderAdsByLocation: function(containerId, ads) {
      if (ads.length === 0) {
        this.hideContainer(containerId);
      } else if (ads.length > 1) {
        this.crearCarrusel(containerId, ads);
      } else if (ads.length < 2) {
        this.agregarPublicidad(containerId, ads);
      }
    },

    agregarPublicidad: function (contenedorPublicidad, ad) {
      var contenedor = document.querySelector("." + contenedorPublicidad);
      if (!contenedor) return;

      // Limpiar contenedor

      contenedor.style.display = "block";
      contenedor.innerHTML = '';

      var mediaElement = this.createMediaElement(ad);
      if (!mediaElement) return;

      if (ad.actionUrl) {
        var link = document.createElement("a");
        link.href = ad.actionUrl;
        link.target = "_blank";
        link.classList.add("carousel-link");
        if (ad.genericData) {
          link.setAttribute("data-generic", ad.genericData);
        }
        link.appendChild(mediaElement);
        contenedor.appendChild(link);
      } else {
        contenedor.appendChild(mediaElement);
      }

      // Implementar dismissTime si es necesario
      this.handleDismissTime(contenedorPublicidad, ad);
    },

    // Crear elemento de media (imagen o video)
    createMediaElement: function(ad) {
      var cacheKey = ad.file + '_' + ad.id;

      // Verificar cache
      if (cachedElements[cacheKey]) {
        return cachedElements[cacheKey].cloneNode(true);
      }

      var mediaElement;

      if (this.esVideo(ad.file)) {
        mediaElement = document.createElement("video");
        mediaElement.autoplay = true;
        mediaElement.muted = true;
        mediaElement.loop = true;
        mediaElement.playsInline = true;
        mediaElement.className = "carousel-video";
        mediaElement.tabIndex = -1;

        var source = document.createElement("source");
        source.src = ad.file;
        source.type = "video/mp4";
        mediaElement.appendChild(source);
      } else {
        mediaElement = document.createElement("img");
        mediaElement.src = ad.file;
        mediaElement.alt = ad.name || "Advertisement";
        mediaElement.className = "carousel-image";
        mediaElement.style.maxWidth = "100%";
        mediaElement.style.height = "auto";
      }

      // Cachear elemento
      cachedElements[cacheKey] = mediaElement.cloneNode(true);

      return mediaElement;
    },

    crearCarrusel: function (contenedorPublicidad, ads) {
      var contenedor = document.querySelector("." + contenedorPublicidad);
      if (!contenedor || ads.length === 0) return;

      // Limpiar timeout anterior si existe
      if (carouselTimeouts[contenedorPublicidad]) {
        clearTimeout(carouselTimeouts[contenedorPublicidad]);
      }

      contenedor.style.display = "block";
      contenedor.innerHTML = '';

      // Crear estructura del carrusel
      var carousel = document.createElement("div");
      carousel.className = "custom-carousel";

      var track = document.createElement("div");
      track.className = "carousel-track";

      // Crear items con lazy loading
      for (var i = 0; i < ads.length; i++) {
        var ad = ads[i];
        var item = document.createElement("div");
        item.className = "carousel-item";

        var link = document.createElement("a");
        link.href = ad.actionUrl || "#";
        link.target = "_blank";
        link.className = "focusable carousel-link";
        link.tabIndex = 0;

        if (ad.genericData) {
          link.setAttribute("data-generic", ad.genericData);
        }

        // Lazy load: solo crear el primer elemento inmediatamente
        if (i === 0) {
          var mediaElement = this.createMediaElement(ad);
          if (mediaElement) {
            link.appendChild(mediaElement);
          }
        } else {
          // Marcar para lazy loading
          link.setAttribute("data-lazy", "true");
          link.setAttribute("data-ad-index", i);
        }

        item.appendChild(link);
        track.appendChild(item);
      }

      carousel.appendChild(track);
      contenedor.appendChild(carousel);

      // Iniciar rotación
      this.startCarouselRotation(contenedorPublicidad, ads, track);
    },

    startCarouselRotation: function(containerId, ads, track) {
      var self = this;
      var currentIndex = 0;

      function mostrarSiguiente() {
        var currentAd = ads[currentIndex];

        // Lazy load del siguiente elemento si no está cargado
        self.lazyLoadNextElement(ads, currentIndex, track);

        // Aplicar transformación
        track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';

        // Calcular tiempo de display
        var displayTime = self.getDisplayTime(currentAd);

        // Manejar dismissTime
        self.handleDismissTime(containerId, currentAd);

        // Siguiente índice
        currentIndex = (currentIndex + 1) % ads.length;

        // Programar siguiente transición
        carouselTimeouts[containerId] = setTimeout(mostrarSiguiente, displayTime);
      }

      // Iniciar rotación
      mostrarSiguiente();
      this.exposeCarouselState(containerId, ads, track);
    },

    // Lazy load del siguiente elemento
    lazyLoadNextElement: function(ads, currentIndex, track) {
      var nextIndex = (currentIndex + 1) % ads.length;
      var nextItem = track.children[nextIndex];
      var nextLink = nextItem.querySelector('a[data-lazy="true"]');

      if (nextLink) {
        var adIndex = parseInt(nextLink.getAttribute('data-ad-index'));
        var ad = ads[adIndex];

        var mediaElement = this.createMediaElement(ad);
        if (mediaElement) {
          nextLink.appendChild(mediaElement);
          nextLink.removeAttribute('data-lazy');
          nextLink.removeAttribute('data-ad-index');
        }
      }
    },

    // Manejar dismissTime
    handleDismissTime: function(containerId, ad) {
      if (ad.dismissTime && ad.dismissTime > 0) {
        var self = this;
        setTimeout(function() {
          var container = document.querySelector("." + containerId);
          if (container) {
            container.style.display = 'none';
            // Limpiar timeout del carrusel si existe
            if (carouselTimeouts[containerId]) {
              clearTimeout(carouselTimeouts[containerId]);
              delete carouselTimeouts[containerId];
            }
          }
        }, ad.dismissTime * 1000);
      }
    },

    esVideo: function(url) {
      return /\.(mp4|webm|ogg)$/i.test(url);
    },

    navigateManual: function (direction, containerId) {
      var ads = this._adsByContainer && this._adsByContainer[containerId];
      var track = this._tracksByContainer && this._tracksByContainer[containerId];
      if (!ads || !track || ads.length <= 1) return;

      if (!this._indicesByContainer) this._indicesByContainer = {};
      if (typeof this._indicesByContainer[containerId] === 'undefined') this._indicesByContainer[containerId] = 0;

      if (direction === "right") {
        this._indicesByContainer[containerId] = (this._indicesByContainer[containerId] + 1) % ads.length;
      } else if (direction === "left") {
        this._indicesByContainer[containerId] = (this._indicesByContainer[containerId] - 1 + ads.length) % ads.length;
      }

      var index = this._indicesByContainer[containerId];
      this.lazyLoadNextElement(ads, index, track);
      track.style.transform = 'translateX(-' + (index * 100) + '%)';

      // 🎯 Cambiar el foco al nuevo elemento
      var newItem = track.children[index];
      var newLink = newItem.querySelector("a.carousel-link");
      if (newLink) {
        Focus.to($(newLink));
      }
    },

    exposeCarouselState: function (containerId, ads, track) {
      if (!this._adsByContainer) this._adsByContainer = {};
      if (!this._tracksByContainer) this._tracksByContainer = {};
      if (!this._indicesByContainer) this._indicesByContainer = {};

      this._adsByContainer[containerId] = ads;
      this._tracksByContainer[containerId] = track;
      this._indicesByContainer[containerId] = 0;
    }
  };

  return module;
})();
