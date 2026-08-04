# Análisis de Optimización para TVs con 1.5 GB de RAM

## Resumen Ejecutivo

Este documento analiza los módulos **loading**, **epgcards**, **home** y **nbplayer** para identificar problemas de rendimiento y consumo de memoria en dispositivos con recursos limitados (1.5 GB RAM).

---

## 1. MÓDULO LOADING (loading.js)

### Problemas Identificados

1. **Carga excesiva de EPG al inicio**
   - Carga EPG para `epgRowsOnInit` canales (por defecto 200)
   - Esto puede ser demasiado para TVs con poca RAM
   - No hay límite de memoria dinámico

2. **Intervalos frecuentes**
   - Intervalo de progreso cada 300ms (línea 164)
   - Puede causar lag en dispositivos lentos

3. **Timeout muy largo**
   - Timeout de 30 segundos (línea 86)
   - Puede dejar la app bloqueada si hay problemas de red

### Optimizaciones Recomendadas

#### 1.1. Reducir carga inicial de EPG
```javascript
// En loading.js, línea 138
// ANTES:
self.totalChannels = Math.min(AppData.services.length, AppData.epgRowsOnInit || AppData.services.length);

// DESPUÉS: Limitar a máximo 50 canales para TVs con poca RAM
var maxChannelsForLowRAM = 50;
var deviceRAM = Device.getRAM ? Device.getRAM() : null;
var maxChannels = (deviceRAM && deviceRAM < 2000) ? maxChannelsForLowRAM : AppData.epgRowsOnInit;
self.totalChannels = Math.min(AppData.services.length, maxChannels || AppData.services.length);
```

#### 1.2. Aumentar intervalo de progreso
```javascript
// Línea 164: Cambiar de 300ms a 1000ms (1 segundo)
var progressInterval = setInterval(function() {
  // ... código existente
}, 1000); // En lugar de 300
```

#### 1.3. Reducir timeout y agregar detección de memoria
```javascript
// Línea 86: Reducir timeout a 20 segundos
this.loadingTimeout = setTimeout(function() {
  console.warn('Timeout en carga de EPG, redirigiendo a home');
  if (self.loadingTimeout) {
    clearTimeout(self.loadingTimeout);
    self.loadingTimeout = null;
  }
  self.goToHome();
}, 20000); // Reducido de 30000 a 20000
```

#### 1.4. Limpiar referencias al destruir
```javascript
// Mejorar destroy() para limpiar todas las referencias
destroy: function () {
  // Limpiar timeout
  if (this.loadingTimeout) {
    clearTimeout(this.loadingTimeout);
    this.loadingTimeout = null;
  }

  // Limpiar intervalo de tips
  if (this.tipsInterval) {
    clearInterval(this.tipsInterval);
    this.tipsInterval = null;
  }

  // Limpiar referencias DOM
  this.$el = null;
  this.loadedChannels = 0;
  this.totalChannels = 0;
  
  // Resetear progreso
  this.updateProgress(0, 'Cargando...', '');
}
```

---

## 2. MÓDULO EPGCARDS (EPGCards.js)

### Problemas Identificados

1. **Renderizado completo del DOM**
   - Renderiza TODOS los canales y eventos de una vez (línea 584-749)
   - No hay virtualización ni lazy loading
   - Con 200 canales × 10 eventos = 2000+ elementos DOM

2. **Imágenes sin lazy loading**
   - Todas las imágenes se cargan inmediatamente (línea 688)
   - Consume mucha memoria de GPU/RAM

3. **Actualización periódica costosa**
   - `_updateLiveEvents()` itera sobre todos los eventos cada minuto (línea 985-1104)
   - Puede causar lag en dispositivos lentos

4. **String concatenation ineficiente**
   - Construye HTML con concatenación de strings (línea 594-733)
   - Mejor usar DocumentFragment (ya lo hace parcialmente en línea 736)

### Optimizaciones Recomendadas

#### 2.1. Implementar Virtualización (Lazy Rendering)
```javascript
// Agregar propiedades para virtualización
init: function() {
  // ... código existente
  this.visibleRange = { start: 0, end: 20 }; // Solo renderizar 20 canales visibles
  this.itemHeight = 200; // Altura estimada de cada card
  this.containerHeight = 0;
}

// Modificar _renderCards para renderizar solo elementos visibles
_renderCards: function() {
  if (!this.$epgGrid || !this.$epgGrid.length) {
    this.init();
  }

  if (!this.items || this.items.length === 0) {
    this.$epgGrid.html('<div class="epg-card-no-data">...</div>');
    return;
  }

  // Calcular rango visible basado en scroll
  var scrollTop = this.$epgGrid.scrollTop();
  var containerHeight = this.$epgGrid.height();
  var start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - 5); // Buffer de 5
  var end = Math.min(this.items.length, Math.ceil((scrollTop + containerHeight) / this.itemHeight) + 5);

  this.visibleRange = { start: start, end: end };

  // Renderizar solo elementos visibles
  var html = '';
  var self = this;
  var now = this._getNow();
  var brand = CONFIG.app.brand;
  var placeholderImage = "assets/images/" + brand + "/placeholder_220x160.png";

  // Renderizar elementos visibles
  for (var i = start; i < end; i++) {
    var channel = this.items[i];
    if (!channel) continue;
    
    // ... código de renderizado existente (líneas 603-733)
    // PERO solo para canales en el rango visible
  }

  // Usar DocumentFragment (ya lo hace, mantener)
  var fragment = document.createDocumentFragment();
  var tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  while (tempDiv.firstChild) {
    fragment.appendChild(tempDiv.firstChild);
  }
  this.$epgGrid.empty().append(fragment);

  // Agregar placeholder para elementos no visibles (para mantener scroll)
  this._addPlaceholders(start, end);
}
```

#### 2.2. Lazy Loading de Imágenes
```javascript
// Modificar renderizado de imágenes para usar loading="lazy"
// Línea 688
html += '<img src="' + eventImageUrl + '" loading="lazy" onerror="imgOnError(this)" alt="" />';

// O mejor aún, usar Intersection Observer para carga bajo demanda
_renderCards: function() {
  // ... código existente
  
  // Después de append, configurar lazy loading
  this._setupLazyImages();
}

_setupLazyImages: function() {
  if (!('IntersectionObserver' in window)) {
    // Fallback para navegadores antiguos
    return;
  }

  var self = this;
  var imageObserver = new IntersectionObserver(function(entries, observer) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px' // Cargar 50px antes de que sea visible
  });

  // Observar todas las imágenes
  this.$epgGrid.find('img[data-src]').each(function() {
    imageObserver.observe(this);
  });
}
```

#### 2.3. Optimizar Actualización de Eventos en Vivo
```javascript
// Modificar _updateLiveEvents para ser más eficiente
_updateLiveEvents: function() {
  if (!this.isShowed() || !this.epgLoaded || !this.items || this.items.length === 0) {
    return;
  }

  var self = this;
  var now = this._getNow();
  var updatedCount = 0;
  var batchSize = 10; // Procesar en lotes
  var currentIndex = 0;

  // Usar requestAnimationFrame para actualizaciones suaves
  function updateBatch() {
    var processed = 0;
    
    while (processed < batchSize && currentIndex < self.items.length) {
      var channel = self.items[currentIndex];
      if (channel && channel.epgItems && channel.epgItems.length > 0) {
        // Procesar solo eventos visibles
        var $channelCard = self.$epgGrid.find('[data-channel-index="' + currentIndex + '"]').first();
        if ($channelCard.length > 0 && self._isElementVisible($channelCard)) {
          // Actualizar eventos de este canal
          channel.epgItems.forEach(function(event, eventIndex) {
            // ... lógica de actualización existente
          });
        }
      }
      currentIndex++;
      processed++;
    }

    if (currentIndex < self.items.length) {
      requestAnimationFrame(updateBatch);
    }
  }

  updateBatch();
}

_isElementVisible: function($el) {
  if (!$el || !$el.length) return false;
  var rect = $el[0].getBoundingClientRect();
  var containerRect = this.$epgGrid[0].getBoundingClientRect();
  return rect.bottom >= containerRect.top && rect.top <= containerRect.bottom;
}
```

#### 2.4. Limpiar Referencias y Event Listeners
```javascript
// Mejorar reset() y hide()
reset: function() {
  this._stopUpdateInterval();
  
  // Limpiar observadores de imágenes
  if (this.imageObserver) {
    this.imageObserver.disconnect();
    this.imageObserver = null;
  }

  // Limpiar referencias
  var hasEPG = AppData.services && AppData.services.some(function(s) {
    return s.epgItems && s.epgItems.length > 0;
  });

  if (!hasEPG) {
    this.items = [];
    this.epgLoaded = false;
  }

  this.$lastEpgFocused = null;
  this.currentServiceFocused = null;
  this.currentEpgItemFocused = null;
  this.hide();

  // Limpiar DOM de forma eficiente
  if (this.$epgGrid) {
    // Usar detach() en lugar de empty() para mejor rendimiento
    this.$epgGrid.detach();
    this.$epgGrid.empty();
  }
}
```

---

## 3. MÓDULO HOME (home.js)

### Problemas Identificados

1. **Archivo muy grande (3000+ líneas)**
   - Mucha lógica en un solo archivo
   - Dificulta optimización y mantenimiento

2. **Intervalos múltiples**
   - `actionMinute()` cada minuto (línea 107)
   - Puede acumularse con otros intervalos

3. **Referencias DOM no limpiadas**
   - Muchas referencias a elementos DOM cacheados
   - No se limpian al cambiar de escena

4. **Carga de todos los canales en side menu**
   - `fillSideMenu()` carga todos los canales (línea 1471-1513 en nbplayer.js, pero llamado desde home)

### Optimizaciones Recomendadas

#### 3.1. Limpiar Intervalos y Referencias
```javascript
// Agregar método cleanup
cleanup: function() {
  // Limpiar intervalos
  if (this.timeIntervalApp) {
    clearInterval(this.timeIntervalApp);
    this.timeIntervalApp = null;
  }

  // Limpiar timeouts
  if (this.changeChannelTimer) {
    clearTimeout(this.changeChannelTimer);
    this.changeChannelTimer = null;
  }

  if (this.nbPlayerRetryTimeout) {
    clearTimeout(this.nbPlayerRetryTimeout);
    this.nbPlayerRetryTimeout = null;
  }

  // Limpiar referencias DOM
  this.$firstFocusableItem = null;
  this.viewport = null;
  this.channelsGrid = null;
  this.$videoContainer = null;
  this.$maxiPreview = null;
  this.$maximizeIcon = null;
  this.$lastFocused = null;

  // Limpiar referencias de objetos
  this.searchManager = null;
  if (this.osmsEnabled && this.$osmsContainer) {
    this.$osmsContainer = null;
    this.$osmsDialog = null;
  }
}

// Llamar cleanup en destroy o cuando se desactiva la escena
destroy: function() {
  this.cleanup();
  // ... resto del código
}
```

#### 3.2. Optimizar actionMinute
```javascript
// Modificar actionMinute para ser más eficiente
actionMinute: function () {
  // Usar requestAnimationFrame si hay muchas actualizaciones
  var self = this;
  requestAnimationFrame(function() {
    $("#nbTime").html(getDateFormatted(getTodayDate(), true));
    $(".vjs-control-bar .nb-vjs-vod-time").html(getDateFormatted(getTodayDate(), true));
    console.log("actionMinute ", getDateFormatted(getTodayDate(), true));

    if (HOME.actionsForCheckInactivity) {
      HOME.actionsForCheckInactivity();
    }
  });
}
```

#### 3.3. Lazy Loading del Side Menu
```javascript
// Modificar fillSideMenu en nbplayer.js para cargar solo canales visibles
fillSideMenu: function () {
  if (this.$sideMenu.find(".focusable").length > 0) {
    return;
  }

  // Cargar solo primeros 30 canales inicialmente
  var initialLoad = 30;
  var channels = AppData.channels.slice(0, initialLoad);
  
  // ... código de renderizado existente
  
  // Cargar resto bajo demanda cuando se hace scroll
  this._setupSideMenuLazyLoad(initialLoad);
}

_setupSideMenuLazyLoad: function(startIndex) {
  var self = this;
  var loading = false;
  
  this.$sideMenu.on('scroll', function() {
    if (loading) return;
    
    var scrollTop = self.$sideMenu.scrollTop();
    var scrollHeight = self.$sideMenu[0].scrollHeight;
    var clientHeight = self.$sideMenu.height();
    
    // Si está cerca del final (100px), cargar más
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loading = true;
      self._loadMoreSideMenuChannels(startIndex, function() {
        loading = false;
        startIndex += 30; // Cargar 30 más
      });
    }
  });
}
```

---

## 4. MÓDULO NBPLAYER (nbplayer.js)

### Problemas Identificados

1. **Muchas referencias DOM cacheadas**
   - Más de 30 referencias a elementos DOM (líneas 22-84)
   - No se limpian nunca

2. **Side menu carga todos los canales**
   - `fillSideMenu()` renderiza todos los canales (línea 1471)
   - Consume mucha memoria

3. **Event listeners no removidos**
   - Múltiples event listeners en el player
   - No se limpian al resetear

4. **Intervalos y timeouts no limpiados**
   - `inactivityTimeout`, `skipTimeTimeout` (líneas 52, 79)
   - Pueden acumularse

### Optimizaciones Recomendadas

#### 4.1. Limpiar Referencias DOM
```javascript
// Agregar método cleanup
cleanup: function() {
  // Limpiar timeouts
  if (this.inactivityTimeout) {
    clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = null;
  }
  
  if (this.skipTimeTimeout) {
    clearTimeout(this.skipTimeTimeout);
    this.skipTimeTimeout = null;
  }

  // Remover event listeners
  if (this.$player) {
    this.$player.off('pause');
    this.$player.off('play');
    this.$player.off('loadedmetadata');
    this.$player.off('loadeddata');
    this.$player.off('timeupdate');
    this.$player.off('error');
    this.$player.off('ended');
  }

  // Limpiar todas las referencias DOM
  this.$player = null;
  this.$controlBar = null;
  this.$playPauseButton = null;
  // ... limpiar todas las demás referencias (líneas 22-84)
  
  // Limpiar side menu
  if (this.$sideMenu) {
    this.$sideMenu.off('scroll');
    this.$sideMenu = null;
  }
  this.$sideMenuContainer = null;
}

// Llamar cleanup cuando se resetea el contenido
nbPlayerResetContent: function (minimize) {
  this.cleanup(); // Agregar esta línea
  this.hideControls();
  // ... resto del código
}
```

#### 4.2. Optimizar Side Menu (ya mencionado en sección 3.3)
- Implementar lazy loading
- Renderizar solo canales visibles
- Usar virtualización

#### 4.3. Debounce en Event Listeners
```javascript
// Para eventos frecuentes como timeupdate
setEvents: function (callbackOnProgress, callbackOnError, callbackOnEnded) {
  var self = this;
  var lastUpdate = 0;
  var throttleDelay = 1000; // Actualizar máximo cada segundo

  this.$player.off('timeupdate');
  this.$player.on('timeupdate', function (event) {
    var now = Date.now();
    if (now - lastUpdate < throttleDelay) {
      return; // Saltar actualización
    }
    lastUpdate = now;
    
    var time = parseInt(self.$player.currentTime());
    self.onProgressEverySecond(time);
    callbackOnProgress(time);
  });

  // ... resto del código
}
```

---

## 5. OPTIMIZACIONES GLOBALES

### 5.1. Detección de Memoria Disponible
```javascript
// Crear utilidad para detectar memoria disponible
Device.getRAM = function() {
  if (navigator.deviceMemory) {
    return navigator.deviceMemory * 1024; // Convertir GB a MB
  }
  
  // Fallback: detectar por User-Agent o características
  if (Device.isTIZEN || Device.isSAMSUNG) {
    // TVs Samsung/Tizen generalmente tienen 1.5-2GB
    return 1536; // 1.5 GB en MB
  }
  
  if (Device.isLG || Device.isWEBOS) {
    return 1536; // Asumir 1.5 GB
  }
  
  return null; // Desconocido
};

Device.isLowRAM = function() {
  var ram = Device.getRAM();
  return ram !== null && ram < 2000; // Menos de 2GB
};
```

### 5.2. Configuración Adaptativa
```javascript
// En config.js o app-data.js
if (Device.isLowRAM && Device.isLowRAM()) {
  // Reducir límites para dispositivos con poca RAM
  CONFIG.app.newEpgRowsOnInit = Math.min(CONFIG.app.newEpgRowsOnInit || 200, 50);
  CONFIG.app.epgHoursLimit = Math.min(CONFIG.app.epgHoursLimit || 12, 6);
}
```

### 5.3. Limpieza de Memoria Periódica
```javascript
// Agregar limpieza periódica de memoria
MemoryManager = {
  cleanupInterval: null,
  
  start: function() {
    var self = this;
    // Limpiar cada 5 minutos
    this.cleanupInterval = setInterval(function() {
      self.cleanup();
    }, 5 * 60 * 1000);
  },
  
  cleanup: function() {
    // Forzar garbage collection si está disponible
    if (window.gc) {
      window.gc();
    }
    
    // Limpiar imágenes no visibles del cache del navegador
    // (esto se hace automáticamente, pero podemos ayudar)
    
    console.log('Memory cleanup executed');
  },
  
  stop: function() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
};

// Iniciar en home.js después de render
MemoryManager.start();
```

---

## 6. PRIORIDADES DE IMPLEMENTACIÓN

### Alta Prioridad (Impacto Inmediato)
1. ✅ Reducir `epgRowsOnInit` para dispositivos con poca RAM
2. ✅ Implementar lazy loading de imágenes en EPGCards
3. ✅ Limpiar referencias DOM en todos los módulos
4. ✅ Optimizar `_updateLiveEvents` en EPGCards

### Media Prioridad (Mejora Significativa)
5. ✅ Implementar virtualización en EPGCards
6. ✅ Lazy loading del side menu en nbplayer
7. ✅ Limpiar event listeners en nbplayer
8. ✅ Reducir frecuencia de intervalos

### Baja Prioridad (Optimizaciones Finas)
9. ✅ Debounce en event listeners
10. ✅ Limpieza periódica de memoria
11. ✅ Detección automática de RAM disponible

---

## 7. MÉTRICAS DE ÉXITO

Para medir la efectividad de las optimizaciones:

1. **Memoria usada**: Reducir en al menos 30-40%
2. **Tiempo de carga inicial**: Reducir en al menos 20%
3. **FPS durante scroll**: Mantener > 30 FPS
4. **Tiempo de respuesta**: < 100ms para interacciones

---

## 8. NOTAS FINALES

- Todas las optimizaciones deben ser **backward compatible**
- Probar en dispositivos reales con 1.5 GB de RAM
- Monitorear memoria durante uso prolongado
- Considerar feature flags para activar/desactivar optimizaciones

---

**Fecha de creación**: 2026-01-27  
**Autor**: Análisis de código  
**Versión**: 1.0
