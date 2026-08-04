# Mejora de Navegación Vertical en EPG

## 📋 Contexto

### Problema Actual

Al navegar verticalmente en la EPG (flechas arriba/abajo), el usuario experimenta:

1. **Desalineación temporal**: Al bajar de un canal a otro, el foco no cae en el evento que corresponde a la misma franja horaria. Por ejemplo:
   - Usuario está en un evento de 11:00-11:30 en el canal 5
   - Al bajar al canal 6, el foco puede caer en un evento de 09:00 o 13:00
   - Esto obliga al usuario a moverse horizontalmente para volver a la hora actual

2. **Comportamiento asimétrico**: 
   - Navegar **hacia arriba** funciona bien (rápido, sin lag)
   - Navegar **hacia abajo** puede tener lag y desalineación

### Estado Actual del Código

- **Archivo principal**: `public/js/module/epg.js`
- **Función de navegación**: `EPG.navigate(direction)` (línea ~384)
- **Función de búsqueda**: `EPG.getNextFocusable(direction, top, left)` (línea ~478)
- **Método actual**: Usa búsqueda por píxeles (`position().top/left`, `elementFromPoint`, bucle "Search to left/right...")

### Datos Disponibles

Cada celda EPG ya tiene atributos `data-*` con información útil:
- `data-x`: Índice del canal (fila) - línea 290, 775
- `data-y`: Índice del evento dentro del canal (columna lógica) - línea 290, 775
- `data-service-id`: ID del servicio/canal
- `data-date`: Fecha del evento
- `data-item-id`: ID del evento (en algunos casos)

Cada evento en `AppData.services[x].epgItems[y]` tiene:
- `startDate`: Fecha/hora de inicio (objeto moment)
- `endDate`: Fecha/hora de fin (objeto moment)
- `event_id`: ID único del evento
- `languages[]`: Array con títulos y descripciones

---

## 💡 Idea Propuesta

### Objetivo

**Alinear la navegación vertical por tiempo**, de forma que:
- Si el usuario está en un evento que cubre las 11:00-11:30
- Al bajar al siguiente canal, el foco caiga en el evento de ese canal que cubre las 11:00 (o el más cercano)
- Esto mantiene al usuario "sincronizado" con la misma franja horaria al moverse entre canales

### Beneficios

1. **Mejor UX**: El usuario no pierde el contexto temporal al cambiar de canal
2. **Navegación más predecible**: Comportamiento simétrico arriba/abajo
3. **Mejor rendimiento**: Elimina búsquedas costosas por píxeles y bucles "Search to left/right"
4. **Código más simple**: Navegación basada en índices lógicos (`data-x`, `data-y`) y tiempos, no en geometría de píxeles

---

## 🔧 Solución Técnica Propuesta

### Enfoque

En lugar de buscar el siguiente foco usando `position().top/left` y `elementFromPoint`, usar:

1. **Tiempo de referencia** del evento actualmente enfocado
2. **Índices lógicos** (`data-x`, `data-y`) para identificar fila y columna
3. **Búsqueda directa** en `AppData.services[nextRow].epgItems` por tiempo

### Algoritmo Propuesto

#### Paso 1: Obtener tiempo de referencia del evento actual

```javascript
// En EPG.navigate(), cuando direction == 'up' || direction == 'down'
var $focused = Focus.focused;
var currentX = parseInt($focused.data('x')); // índice de canal
var currentY = parseInt($focused.data('y')); // índice de evento

if (currentX >= 0 && currentY >= 0 && this.items[currentX] && this.items[currentX].epgItems[currentY]) {
  var currentEvent = this.items[currentX].epgItems[currentY];
  
  // Tiempo de referencia: punto medio del evento actual
  // Alternativa: usar la hora actual (now) si el evento es muy largo
  var targetTime = currentEvent.startDate.clone();
  var eventDuration = getTimeDifference(currentEvent.startDate, currentEvent.endDate, 'minutes');
  targetTime.add(eventDuration / 2, 'minutes');
  
  // O usar la hora actual si está dentro del evento
  var now = getTodayDate();
  if (now.isSameOrAfter(currentEvent.startDate) && now.isBefore(currentEvent.endDate)) {
    targetTime = now;
  }
}
```

#### Paso 2: Calcular siguiente fila

```javascript
var nextRow = direction == 'down' ? (currentX + 1) : (currentX - 1);

// Validar límites
if (nextRow < 0 || nextRow >= this.items.length) {
  return direction == 'up' ? this.$defaultFocus : [];
}
```

#### Paso 3: Buscar evento en la fila siguiente que contenga el tiempo objetivo

```javascript
var nextChannel = this.items[nextRow];
var targetEvent = null;
var targetY = -1;

if (nextChannel.epgItems && nextChannel.epgItems.length > 0) {
  // Opción 1: Buscar evento que contenga el tiempo objetivo
  for (var i = 0; i < nextChannel.epgItems.length; i++) {
    var event = nextChannel.epgItems[i];
    if (event.startDate && event.endDate) {
      if (targetTime.isSameOrAfter(event.startDate) && targetTime.isBefore(event.endDate)) {
        targetEvent = event;
        targetY = i;
        break;
      }
    }
  }
  
  // Opción 2: Si no hay evento que contenga el tiempo, buscar el más cercano
  if (!targetEvent) {
    var minDiff = Infinity;
    for (var i = 0; i < nextChannel.epgItems.length; i++) {
      var event = nextChannel.epgItems[i];
      if (event.startDate) {
        var diff = Math.abs(getTimeDifference(event.startDate, targetTime, 'minutes'));
        if (diff < minDiff) {
          minDiff = diff;
          targetEvent = event;
          targetY = i;
        }
      }
    }
  }
}
```

#### Paso 4: Encontrar el elemento DOM correspondiente y enfocarlo

```javascript
if (targetY >= 0) {
  // Buscar el elemento DOM usando data-x y data-y
  var $target = this.$epgGrid.find(
    ".epg-channel-item[data-x='" + nextRow + "'][data-y='" + targetY + "']"
  );
  
  if ($target.length > 0) {
    // Asegurar visibilidad y enfocar
    this.ensureItemVisibility($target, direction);
    return $target;
  }
}

// Fallback: Si no se encuentra, usar el primer evento de la fila siguiente
if (nextChannel.epgItems && nextChannel.epgItems.length > 0) {
  var $firstEvent = this.$epgGrid.find(
    ".epg-channel-item[data-x='" + nextRow + "'][data-y='0']"
  );
  if ($firstEvent.length > 0) {
    this.ensureItemVisibility($firstEvent, direction);
    return $firstEvent;
  }
}
```

#### Paso 5: Manejar casos especiales

```javascript
// Caso: Canal sin EPG (epgItems vacío o null)
if (!nextChannel.epgItems || nextChannel.epgItems.length === 0) {
  // Opción A: Enfocar el bloque "EPGNoData" si existe
  var $noData = this.$epgGrid.find(
    ".row[data-service-id='" + nextChannel.id + "'] .epg-channel-item:first"
  );
  if ($noData.length > 0) {
    this.ensureItemVisibility($noData, direction);
    return $noData;
  }
  
  // Opción B: Saltar al siguiente canal con EPG
  // (implementar recursión con límite)
}
```

### Función Helper Propuesta: `ensureItemVisibility`

```javascript
ensureItemVisibility: function($item, direction) {
  if (!$item || $item.length === 0) return;
  
  var $row = $item.closest('.row');
  var rowTop = $row.position().top;
  var rowHeight = $row.height();
  var gridHeight = this.$epgGrid.height();
  var scrollTop = this.$epgGrid.scrollTop();
  
  // Ajustar scroll vertical si es necesario
  if (direction == 'down') {
    if (rowTop + rowHeight > gridHeight - 20) {
      var jump = scrollTop + (rowTop + rowHeight - gridHeight + 20);
      this.$epgGrid.scrollTop(jump);
      this.drawNewRow($item, direction);
    }
  } else if (direction == 'up') {
    if (rowTop < 0) {
      var jump = scrollTop + rowTop;
      this.$epgGrid.scrollTop(jump);
      this.drawNewRow($item, direction);
    }
  }
  
  // Ajustar scroll horizontal si el item está fuera de la vista
  var itemLeft = $item.position().left;
  var itemWidth = $item.width();
  var gridWidth = this.$epgGrid.width();
  var scrollLeft = this.$epgGrid.scrollLeft();
  
  if (itemLeft < 0) {
    this.$epgGrid.scrollLeft(scrollLeft + itemLeft - 10);
  } else if (itemLeft + itemWidth > gridWidth) {
    this.$epgGrid.scrollLeft(scrollLeft + (itemLeft + itemWidth - gridWidth) + 10);
  }
}
```

---

## 🎯 Casos Especiales a Considerar

### 1. Eventos Largos (2h, 8h, 24h)

**Problema**: Un evento puede durar varias horas, cubriendo múltiples "franjas horarias".

**Solución**: 
- Si el tiempo objetivo está dentro del rango `[startDate, endDate]` del evento, ese es el evento correcto
- No importa si dura 30 minutos o 24 horas; mientras el tiempo objetivo esté dentro, se selecciona ese evento
- Esto mantiene la coherencia: si el usuario está en un evento largo, al bajar seguirá en eventos que cubran ese mismo tiempo

### 2. Canales Sin EPG

**Problema**: Algunos canales pueden tener `epgItems` vacío o `null`.

**Solución**:
- Si `nextChannel.epgItems` está vacío o es `null`:
  - Opción A: Enfocar el bloque "EPGNoData" de esa fila (si existe)
  - Opción B: Saltar automáticamente al siguiente canal que tenga EPG (con límite de recursión para evitar loops infinitos)

### 3. Eventos que No Cubren el Tiempo Objetivo

**Problema**: El canal siguiente puede no tener ningún evento que cubra exactamente el tiempo objetivo.

**Solución**:
- Primero intentar encontrar un evento que **contenga** el tiempo objetivo
- Si no existe, buscar el evento **más cercano** por tiempo (menor diferencia en minutos)
- Esto garantiza que siempre se encuentre un evento, aunque no sea exactamente a la misma hora

### 4. Límites de la Grilla

**Problema**: Al llegar al primer o último canal.

**Solución**:
- Si `nextRow < 0`: Retornar `this.$defaultFocus` (comportamiento actual)
- Si `nextRow >= this.items.length`: Retornar array vacío `[]` (comportamiento actual)

---

## 📝 Cambios Necesarios en el Código

### Archivo: `public/js/module/epg.js`

#### 1. Modificar `EPG.navigate()` (línea ~384)

**Cambio**: Reemplazar la lógica de navegación vertical (cuando `direction == 'up' || direction == 'down'`) para usar el nuevo algoritmo basado en tiempo.

**Código actual**:
```javascript
if (direction == "up" || direction == "down") {
    positionStartTop = direction == "up" ? ($focused.position().top) : ($focused.position().top + $focused.innerHeight());
    // ... cálculos de positionStartLeft ...
    $focusTo = this.getNextFocusable(direction, positionStartTop, positionStartLeft);
}
```

**Código propuesto**:
```javascript
if (direction == "up" || direction == "down") {
    $focusTo = this.getNextFocusableByTime(direction);
    
    // Si no se encontró nada, usar fallback al método antiguo
    if (!$focusTo || $focusTo.length === 0) {
        positionStartTop = direction == "up" ? ($focused.position().top) : ($focused.position().top + $focused.innerHeight());
        // ... cálculos de positionStartLeft ...
        $focusTo = this.getNextFocusable(direction, positionStartTop, positionStartLeft);
    }
}
```

#### 2. Crear nueva función `EPG.getNextFocusableByTime()` 

**Ubicación**: Después de `getNextFocusable()` (línea ~554)

**Implementación**: Ver algoritmo propuesto arriba (Pasos 1-5).

#### 3. Crear función helper `EPG.ensureItemVisibility()`

**Ubicación**: Después de `getNextFocusableByTime()`

**Implementación**: Ver función propuesta arriba.

#### 4. Mantener `getNextFocusable()` como fallback

**Razón**: Por si acaso el nuevo método falla o hay casos edge no contemplados, mantener el método antiguo como respaldo.

---

## ✅ Ventajas de Esta Solución

1. **No requiere cambios en el layout visual**: La EPG se sigue dibujando igual, con eventos de diferentes duraciones
2. **Usa datos ya disponibles**: Aprovecha `data-x`, `data-y`, `startDate`, `endDate` que ya existen
3. **Compatible con eventos largos**: Funciona igual de bien con eventos de 30 minutos o 24 horas
4. **Mantiene compatibilidad**: El método antiguo queda como fallback
5. **Mejora el rendimiento**: Elimina búsquedas costosas por píxeles y bucles "Search to left/right"

---

## 🧪 Testing Sugerido

1. **Navegación básica**: Subir y bajar entre canales con eventos normales (30min-2h)
2. **Eventos largos**: Probar con canales que tengan eventos de 8h o 24h
3. **Canales sin EPG**: Verificar comportamiento cuando un canal no tiene datos
4. **Límites**: Probar en el primer y último canal
5. **Hora actual**: Verificar que al bajar desde un evento "en vivo" se mantenga en eventos en vivo
6. **Rendimiento**: Medir tiempo de respuesta en TV LG vs método antiguo

---

## 📌 Notas Adicionales

- **No tocar navegación horizontal**: La navegación izquierda/derecha ya funciona bien, mantenerla como está
- **Debug**: Ya se solucionó el lag principal poniendo `CONFIG.developer.debug = false`, pero esta mejora hará la navegación aún más fluida y predecible
- **Configuración**: No requiere cambios en `config.js` ni `app-data.js`, solo modificaciones en `epg.js`

---

## 🔗 Referencias de Código

- **Navegación actual**: `public/js/module/epg.js:384-476` (`EPG.navigate`)
- **Búsqueda actual**: `public/js/module/epg.js:478-554` (`EPG.getNextFocusable`)
- **Renderizado EPG**: `public/js/module/epg.js:200-320` (`EPG.draw`)
- **Atributos data-***: `public/js/module/epg.js:290, 775` (donde se asignan `data-x` y `data-y`)
- **Estructura de datos**: `public/js/module/app-data.js` (`AppData.services[x].epgItems[y]`)

---

**Fecha de creación**: 2024  
**Estado**: Propuesta pendiente de implementación  
**Prioridad**: Media-Alta (mejora UX significativa)



