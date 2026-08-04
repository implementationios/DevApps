# Análisis Completo del Flujo de EPG en Home

## Resumen Ejecutivo

Este documento analiza cómo, cuándo y dónde se descarga la EPG en la escena Home, tanto por carga inicial (newEpgRowsOnInit) como por foco en un canal.

---

## 1. FLUJO DE ACTIVACIÓN DE HOME

### 1.1. Activación de la Escena (`activate()`)
**Ubicación:** `public/js/scene/home.js:212`

**Flujo:**
```
Router.go('home')
  → Scene_Home.activate()
    → clearData() [si !dontRedraw]
      → AppData.clearData() [LIMPIA services[]]
      → EPG.reset()
    → getHomeData()
```

**Punto crítico:** `clearData()` limpia `AppData.services = []`, lo que elimina cualquier EPG cargada previamente.

---

## 2. FLUJO DE CARGA INICIAL DE EPG (newEpgRowsOnInit)

### 2.1. Secuencia de Carga de Datos
**Ubicación:** `public/js/scene/home.js:300` - `getHomeData()`

**Flujo secuencial:**
```
getHomeData()
  → stepLoad = 0: getDataForServicesTV()
    → AppData.getDataForServicesTV()
      → cv.getBouquets()
      → cv.getAvailableStreams()
      → AppData.services = [servicios]
    → setBouquetsContent()
    → getDataForCatchups()
  
  → stepLoad = 1: getDataForCatchups()
    → AppData.getCatchupGroups()
    → setCatchupsContent()
    → getDataForCatchupsRecorded()
  
  → stepLoad = 2: getDataForCatchupsRecorded()
    → AppData.getCatchupsRecorded()
    → setCatchupsRecordedContent()
    → getEPGData() ⭐
  
  → stepLoad = 3: getEPGData() ⭐
```

### 2.2. Función `getEPGData()`
**Ubicación:** `public/js/scene/home.js:383`

**Código:**
```javascript
getEPGData: function () {
  if (EPG.isEmpty()) {
    AppData.getEPGByBouquet(function (servicesWithEPG) {
      EPG.draw(servicesWithEPG);
      self.getVODData();
    }, 0);
  } else {
    self.getVODData();
  }
}
```

**Lógica:**
- Verifica si `EPG.isEmpty()` (si la grilla EPG está vacía)
- Si está vacía, llama a `AppData.getEPGByBouquet(callback, 0)`
- El índice `0` indica que empieza desde el primer canal

### 2.3. Función `getEPGByBouquet()`
**Ubicación:** `public/js/module/app-data.js:575`

**Flujo recursivo:**
```javascript
getEPGByBouquet(callback, index = 0)
  → Obtiene channel = this.services[index]
  → Construye URL: getEPGURL(channel.epgStreamId)
  → cv.getEPG(url, success, error)
    → Petición AJAX a CDN EPG
    → Filtra eventos (48h desde hoy)
    → Guarda: this.services[index].epgItems = eventsFiltered
  
  → Verifica condición de parada:
    if ((index + 1) >= services.length || 
        (epgRowsOnInit > 0 && index >= epgRowsOnInit))
      → epgLoaded(callback) [TERMINA]
    else
      → getEPGByBouquet(callback, index + 1) [RECURSIVO]
```

**Condición de parada:**
- Si `index >= epgRowsOnInit` (7 por defecto) → PARA
- Si `index >= services.length` → PARA

**Almacenamiento:**
- Los datos se guardan en `AppData.services[index].epgItems`
- Cada servicio tiene su array de eventos EPG

---

## 3. FLUJO DE CARGA DE EPG POR FOCO EN CANAL

### 3.1. Evento de Foco en Canal
**Ubicación:** `public/js/scene/home.js:464` - `onFocus()`

**Flujo:**
```
Usuario navega con flechas → Focus cambia
  → Scene_Home.onFocus($el)
    → Si $el.data("type") == "service"
      → serviceTV = AppData.getServiceTV(id)
      → focusServiceTV(serviceTV, false) ⭐
```

### 3.2. Función `focusServiceTV()`
**Ubicación:** `public/js/scene/home.js:2407`

**Código:**
```javascript
focusServiceTV: function (serviceTV, updateFocus) {
  // Actualiza UI (labels, etc.)
  this.setEpgTextInfo(serviceTV, "EPGLoading", "EPGLoading");
  
  AppData.getSimpleEpgByChannel(serviceTV.id, function () {
    var liveEvent = AppData.getLiveEvent(serviceTV);
    var nextEvent = AppData.getNextEvent(serviceTV, liveEvent);
    self.setEpgInfo(serviceTV, liveEvent, nextEvent);
  });
}
```

**Lógica:**
- Muestra "EPGLoading" en la UI
- Llama a `AppData.getSimpleEpgByChannel(serviceTV.id, callback)`
- Cuando termina, obtiene evento actual y próximo
- Actualiza la UI con la información

### 3.3. Función `getSimpleEpgByChannel()`
**Ubicación:** `public/js/module/app-data.js:937`

**Flujo:**
```javascript
getSimpleEpgByChannel(id, callback)
  → Busca index del canal en this.services
  → getSimpleEpgByChannelIndex(index, callback)
```

### 3.4. Función `getSimpleEpgByChannelIndex()`
**Ubicación:** `public/js/module/app-data.js:951`

**Código clave:**
```javascript
getSimpleEpgByChannelIndex: function (index, callback) {
  var channel = this.services[index];
  
  // ⭐ VERIFICACIÓN: Si ya tiene EPG, no descarga
  if (channel.epgItems != null) {
    callback();
    return; // SALE SIN DESCARGAR
  }
  
  // Si NO tiene EPG, descarga
  var url = self.getEPGURL(channel.epgStreamId);
  cv.getEPG(url, function (data) {
    // Filtra eventos (48h)
    // Guarda: self.services[index].epgItems = eventsFiltered
    callback();
  }, function (error) {
    if (error != "abort") {
      self.services[index].epgItems = [];
    }
    callback();
  });
}
```

**Punto crítico:**
- **Verifica primero** si `channel.epgItems != null`
- Si ya tiene datos, **NO descarga** y solo ejecuta el callback
- Si no tiene datos, descarga y guarda en `services[index].epgItems`

---

## 4. OTROS PUNTOS DONDE SE CARGA EPG

### 4.1. Navegación en Grilla EPG
**Ubicación:** `public/js/module/epg.js:801` - `drawNewRow()`

**Cuándo:** Cuando el usuario navega arriba/abajo en la grilla EPG y llega a una fila que no está renderizada.

**Flujo:**
```
EPG.navigate("up" o "down")
  → drawNewRow($focused, direction)
    → Calcula index de la fila
    → Verifica: getEpgItemsByChannelIndex(index)
      → Si es null (no tiene EPG)
        → AppData.getSimpleEpgByChannelIndex(index, callback)
          → Descarga EPG para ese canal
          → gridOptimization() [renderiza la fila]
```

### 4.2. Reproductor (Side Menu)
**Ubicación:** `public/js/module/nbplayer.js:1534` - `onFocus()`

**Cuándo:** Cuando el usuario enfoca un canal en el menú lateral del reproductor.

**Flujo:**
```
nbPlayer.onFocus()
  → Si sideMenu está abierto
    → AppData.getSimpleEpgByChannel(id, callback)
      → Descarga EPG si no existe
      → Muestra título del evento actual
```

### 4.3. Detalles EPG
**Ubicación:** `public/js/module/epg-details.js:161`

**Cuándo:** Cuando se abre el diálogo de detalles de un evento EPG.

**Flujo:**
```
EPGDetails.show()
  → Si es catchup-event y no tiene EPG
    → AppData.getSimpleEpgByChannel(serviceTVObj.id, callback)
      → Descarga EPG para mostrar detalles
```

---

## 5. FUNCIONES CLAVE DE ALMACENAMIENTO

### 5.1. `AppData.services[index].epgItems`
**Estructura:**
```javascript
service = {
  id: 123,
  name: "Canal 1",
  epgStreamId: 207168,
  epgItems: [  // ⭐ AQUÍ SE GUARDA LA EPG
    {
      event_id: 456,
      startDate: moment(...),
      endDate: moment(...),
      languages: [{ title: "...", extendedDescription: "..." }],
      parentalRating: 12,
      catchupId: 789,
      imageUrl: "..."
    },
    ...
  ]
}
```

### 5.2. Verificación de EPG Existente
**En `getSimpleEpgByChannelIndex()`:**
```javascript
if (channel.epgItems != null) {
  callback(); // Ya tiene EPG, no descarga
  return;
}
```

**Punto importante:** Solo verifica `!= null`, no verifica si el array está vacío.

---

## 6. PROBLEMAS IDENTIFICADOS

### 6.1. `clearData()` Limpia Todo
**Problema:** Cuando se activa home, `clearData()` limpia `AppData.services = []`, perdiendo la EPG cargada en loading.

**Ubicación:** `public/js/scene/home.js:284`

**Código actual:**
```javascript
clearData: function () {
  AppData.clearData();  // Esto limpia AppData.services = []
  EPG.reset();
  VOD.reset();
  VODDetail.reset();
  // ...
}
```

### 6.2. `getEPGData()` No Verifica EPG Pre-cargada
**Problema:** `getEPGData()` solo verifica `EPG.isEmpty()` (grilla vacía), no verifica si `AppData.services` ya tiene `epgItems`.

**Ubicación:** `public/js/scene/home.js:383`

**Código actual:**
```javascript
getEPGData: function () {
  if (EPG.isEmpty()) {  // Solo verifica grilla, no AppData.services
    AppData.getEPGByBouquet(function (servicesWithEPG) {
      EPG.draw(servicesWithEPG);
      self.getVODData();
    }, 0);
  } else {
    self.getVODData();
  }
}
```

### 6.3. Cancelación de Peticiones
**Problema:** `cv.get_epg()` cancela peticiones anteriores en `beforeSend`, lo que puede cancelar peticiones de loading.js cuando se navega a home.

**Ubicación:** `public/js/module/cv.js:520`

**Código actual:**
```javascript
get_epg: function (base_url, callbackName, successCallback, errorCallback) {
  var self = this;
  this.epgRequest = $.ajax({
    // ...
    beforeSend: function () {
      if (self.epgRequest != null) {
        self.epgRequest.abort();  // Cancela petición anterior
      }
    },
    // ...
  });
}
```

### 6.4. `getEPGByBouquet()` No Verifica EPG Existente
**Problema:** A diferencia de `getSimpleEpgByChannelIndex()`, `getEPGByBouquet()` no verifica si un canal ya tiene `epgItems` antes de descargar.

**Ubicación:** `public/js/module/app-data.js:575`

**Código actual:**
```javascript
getEPGByBouquet: function (callback, index) {
  // ...
  var channel = this.services[index];
  // NO verifica si channel.epgItems != null
  var url = self.getEPGURL(channel.epgStreamId);
  cv.getEPG(url, function (data) {
    // Descarga siempre, incluso si ya tiene EPG
  });
}
```

---

## 7. FLUJO COMPLETO RESUMIDO

### Carga Inicial (newEpgRowsOnInit):
```
Home.activate()
  → clearData() [LIMPIA services]
  → getHomeData()
    → getDataForServicesTV() [Obtiene servicios]
    → getDataForCatchups()
    → getDataForCatchupsRecorded()
    → getEPGData()
      → EPG.isEmpty()? [Siempre true después de clearData]
        → AppData.getEPGByBouquet(callback, 0)
          → Descarga EPG para canales 0-6 (epgRowsOnInit=7)
          → Guarda en AppData.services[i].epgItems
          → EPG.draw(servicesWithEPG)
```

### Carga por Foco:
```
Usuario enfoca canal
  → onFocus($el)
    → focusServiceTV(serviceTV)
      → AppData.getSimpleEpgByChannel(id)
        → getSimpleEpgByChannelIndex(index)
          → if (channel.epgItems != null) [Ya tiene?]
            → callback() [NO descarga]
          → else
            → cv.getEPG(url) [SÍ descarga]
              → Guarda en AppData.services[index].epgItems
```

### Flujo desde Loading:
```
Loading.startEPGLoading()
  → AppData.getEPGByBouquet(callback, 0)
    → Descarga EPG para canales 0-6
    → Guarda en AppData.services[i].epgItems
  → Router.go('home')
    → Home.activate()
      → clearData() [LIMPIA services] ⚠️
      → getHomeData()
        → getEPGData()
          → EPG.isEmpty()? [Sí, porque clearData limpió todo]
            → AppData.getEPGByBouquet() [VUELVE A DESCARGAR] ⚠️
```

---

## 8. DIFERENCIAS CLAVE

| Aspecto | `getEPGByBouquet()` | `getSimpleEpgByChannelIndex()` |
|---------|---------------------|--------------------------------|
| **Uso** | Carga inicial múltiple | Carga individual bajo demanda |
| **Canales** | Múltiples (0 a epgRowsOnInit) | Uno solo (por índice) |
| **Recursivo** | Sí (itera canales) | No (solo un canal) |
| **Verificación** | ❌ No verifica si ya existe | ✅ Sí verifica `epgItems != null` |
| **Callback** | Recibe todos los servicios | Solo notifica que terminó |
| **Cuándo se usa** | Al iniciar home | Al enfocar un canal |

---

## 9. SOLUCIONES PROPUESTAS

### 9.1. Preservar EPG en `clearData()`
**Solución:** Modificar `clearData()` para no limpiar `AppData.services` si ya tiene EPG cargada.

```javascript
clearData: function () {
  AppData.clearData();  // Modificar AppData.clearData() para preservar services con EPG
  EPG.reset();
  // ...
}
```

### 9.2. Verificar EPG en `getEPGData()`
**Solución:** Verificar si `AppData.services` ya tiene `epgItems` antes de descargar.

```javascript
getEPGData: function () {
  // Verificar si ya hay EPG cargada en AppData.services
  var hasEPG = this.isEPGAlreadyLoaded();
  
  if (EPG.isEmpty() && !hasEPG) {
    AppData.getEPGByBouquet(function (servicesWithEPG) {
      EPG.draw(servicesWithEPG);
      self.getVODData();
    }, 0);
  } else if (hasEPG) {
    // Ya hay EPG, solo renderizar
    EPG.draw(AppData.services);
    self.getVODData();
  } else {
    self.getVODData();
  }
}
```

### 9.3. Verificar EPG en `getEPGByBouquet()`
**Solución:** Agregar verificación similar a `getSimpleEpgByChannelIndex()`.

```javascript
getEPGByBouquet: function (callback, index) {
  // ...
  var channel = this.services[index];
  
  // Verificar si ya tiene EPG
  if (channel.epgItems != null && channel.epgItems.length > 0) {
    // Ya tiene EPG, saltar al siguiente
    if ((index + 1) >= self.services.length || 
        (self.epgRowsOnInit > 0 && index >= self.epgRowsOnInit - 1)) {
      self.epgLoaded(callback);
    } else {
      self.getEPGByBouquet(callback, index + 1);
    }
    return;
  }
  
  // Si no tiene EPG, descargar
  // ...
}
```

### 9.4. Evitar Cancelar Peticiones en Curso
**Solución:** No cancelar peticiones EPG si están en curso desde loading.

```javascript
get_epg: function (base_url, callbackName, successCallback, errorCallback) {
  var self = this;
  var previousRequest = this.epgRequest;
  
  // Si hay una petición en curso y estamos en loading, no cancelar
  if (previousRequest && previousRequest.readyState < 4) {
    // Crear nueva petición sin cancelar la anterior
    // ...
  }
  
  // Comportamiento normal
  // ...
}
```

---

## CONCLUSIÓN

El flujo actual tiene estos puntos críticos:
1. `clearData()` elimina la EPG cargada en loading
2. `getEPGData()` no verifica si ya hay EPG en `AppData.services`
3. `getEPGByBouquet()` no verifica si un canal ya tiene EPG antes de descargar
4. Las peticiones se cancelan cuando se navega a home

**Solución necesaria:**
- Preservar `AppData.services` si ya tiene EPG cargada
- Verificar en `getEPGData()` si los servicios ya tienen `epgItems`
- Verificar en `getEPGByBouquet()` si cada canal ya tiene EPG antes de descargar
- Evitar cancelar peticiones EPG en curso desde loading

---

## NOTAS ADICIONALES

- El valor de `epgRowsOnInit` se obtiene de `CONFIG.app.newEpgRowsOnInit` (por defecto 7)
- Los eventos EPG se filtran para mostrar solo los de las próximas 48 horas
- La EPG se almacena en memoria en `AppData.services[index].epgItems`
- La verificación `epgItems != null` no distingue entre array vacío `[]` y `null`
- `EPG.isEmpty()` verifica si la grilla está vacía, no si hay datos en `AppData.services`

