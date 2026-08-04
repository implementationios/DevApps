# PLAN DE ACCIÓN: SEPARACIÓN DEL MÓDULO EPG CARDS

## OBJETIVO
Separar el diseño de cards del EPG tradicional en un módulo independiente, controlado por la bandera `epgCards` en `config.brands.js`.

---

## FASE 1: CREAR ESTRUCTURA DE ARCHIVOS

### 1.1 Crear directorio y archivos nuevos
```
public/js/module/epg-cards/
├── EPGCards.js          (Módulo principal)
├── RenderEngine.js      (Renderizado de cards)
├── NavigationEngine.js  (Navegación optimizada)
└── index.js             (Exportación/Inicialización)
```

### 1.2 Crear archivo CSS independiente
```
public/assets/css/
└── epg-cards.css        (Estilos específicos de cards)
```

---

## FASE 2: MOVER CÓDIGO DE CARDS

### 2.1 De `epg.js` → `EPGCards.js`

**Mover métodos del RenderEngine relacionados con cards:**
- ✅ `renderCards()` (línea ~750)
- ✅ `renderVisibleChannelsCards()` (línea ~795)
- ✅ `renderChannelCard()` (línea ~270)
- ✅ `renderEventCard()` (línea ~369)
- ✅ `renderEventDetailsLarge()` (línea ~423)
- ✅ `renderChannelRangeCards()` (línea ~469)

**Mover helpers relacionados con cards:**
- ✅ `getCurrentEvent()` (línea ~495)
- ✅ `isCurrentEvent()` (línea ~531)
- ✅ `calculateProgress()` (línea ~559)
- ✅ `getDurationMinutes()` (línea ~574)
- ✅ `getRemainingTime()` (línea ~586)
- ✅ `truncate()` (línea ~607)

**Mover lógica de virtualización para cards:**
- ✅ `calculateVisibleRange()` - Versión adaptada para cards (línea ~130)
- ✅ `updateVisibleRange()` - Versión adaptada para cards (línea ~616)

### 2.2 De `epg.js` → `NavigationEngine.js`

**Mover lógica de navegación específica de cards:**
- ✅ Navegación en `EPG.navigate()` cuando `RenderEngine.useCards === true` (línea ~1416-1476)
- ✅ Lógica de scroll en `EPG.ensureItemVisibility()` para cards (línea ~2211-2222)
- ✅ Lógica de foco inicial en `EPG.show()` para cards (línea ~1259-1271)
- ✅ Lógica de foco inicial en `EPG.draw()` para cards (línea ~1356-1368)

### 2.3 De `epg.js` → `EPGCards.js` (métodos principales)

**Mover métodos de EPG relacionados con cards:**
- ✅ `EPG.onFocus()` - Lógica específica de cards (línea ~1200-1203)
- ✅ `EPG.onEnter()` - Lógica específica de cards (línea ~1523-1540)
- ✅ Lógica de inicialización de cards

### 2.4 De `epg.css` → `epg-cards.css`

**Mover estilos relacionados con cards:**
- ✅ `.epg-channel-card` y todas sus variantes
- ✅ `.epg-event-card` y todas sus variantes
- ✅ `.epg-events-carousel`
- ✅ `.epg-card-no-data` y sub-elementos
- ✅ `.epg-action-button-small`
- ✅ `.epg-action-button`
- ✅ `.epg-event-details-large`
- ✅ `.epg-event-poster`
- ✅ `.epg-event-info-large`
- ✅ `.epg-virtual-spacer` (si es específico de cards)
- ✅ `.cards-mode` y estilos relacionados
- ✅ Todos los estilos con prefijo `epg-card-*`, `epg-event-*` relacionados con cards

---

## FASE 3: MANTENER CÓDIGO COMPARTIDO

### 3.1 En `epg.js` (Módulo principal)

**Mantener métodos comunes:**
- ✅ `EPG.init()` - Inicialización base
- ✅ `EPG.initializeValues()` - Valores iniciales
- ✅ `EPG.isShowed()` - Verificar si está visible
- ✅ `EPG.show()` - Mostrar EPG (con selector de diseño)
- ✅ `EPG.hide()` - Ocultar EPG
- ✅ `EPG.reset()` - Resetear EPG
- ✅ `EPG.draw()` - Dibujar EPG (con selector de diseño)
- ✅ `EPG.getCurrentChannelEPGItem()` - Obtener item actual
- ✅ `EPG.getCurrentServiceId()` - Obtener servicio actual
- ✅ `EPG.focusAndEnsureVisible()` - Foco y visibilidad (común)
- ✅ `EPG.ensureItemVisibility()` - Versión tradicional (mantener)

**Mantener RenderEngine tradicional:**
- ✅ `RenderEngine.init()` - Inicialización
- ✅ `RenderEngine.render()` - Renderizado tradicional
- ✅ `RenderEngine.renderChannelRange()` - Rango tradicional
- ✅ `RenderEngine.renderVisibleChannels()` - Versión tradicional
- ✅ `RenderEngine.calculateVisibleRange()` - Versión tradicional
- ✅ `RenderEngine.updateVisibleRange()` - Versión tradicional
- ✅ Todos los métodos de renderizado tradicional

**Mantener navegación tradicional:**
- ✅ `EPG.navigate()` - Versión tradicional (cuando `epgCards === false`)
- ✅ `EPG.getNextFocusable()` - Navegación posicional tradicional
- ✅ `EPG.drawNewRow()` - Dibujar nueva fila tradicional

### 3.2 En `app-data.js`

**Mantener todo (compartido):**
- ✅ `AppData.getSimpleEpgByChannelIndex()`
- ✅ `AppData.getServiceTV()`
- ✅ `AppData.getCatchupByEventId()`
- ✅ Todos los métodos de datos

### 3.3 En `epg-details.js`

**Mantener todo (compartido):**
- ✅ `EPGDetails.show()`
- ✅ `EPGDetails.hide()`
- ✅ `EPGDetails.navigate()`
- ✅ `EPGDetails.onEnter()`
- ✅ Todos los métodos de detalles

---

## FASE 4: ELIMINAR CÓDIGO

### 4.1 De `epg.js`

**Eliminar referencias a cards:**
- ❌ `RenderEngine.useCards` (línea ~102)
- ❌ Todas las condiciones `if (RenderEngine.useCards)` o `if (this.useCards)`
- ❌ Lógica de cards en `RenderEngine.render()` (línea ~868-872, ~932-935)
- ❌ Lógica de cards en `RenderEngine.renderVisibleChannels()` (línea ~644-647)
- ❌ Lógica de cards en `EPG.navigate()` (línea ~1416-1476)
- ❌ Lógica de cards en `EPG.show()` (línea ~1259-1271)
- ❌ Lógica de cards en `EPG.draw()` (línea ~1356-1368)
- ❌ Lógica de cards en `EPG.onFocus()` (línea ~1200-1203)
- ❌ Lógica de cards en `EPG.onEnter()` (línea ~1523-1540)
- ❌ Lógica de cards en `EPG.ensureItemVisibility()` (línea ~2211-2222)

### 4.2 De `epg.css`

**Eliminar estilos de cards:**
- ❌ Todos los estilos movidos a `epg-cards.css`

---

## FASE 5: MODIFICAR INTEGRACIÓN

### 5.1 En `epg.js`

**Modificar `EPG.init()`:**
```javascript
init: function() {
    // ... código existente ...
    
    // Detectar si usar cards
    this.useCards = CONFIG.app.brands[CONFIG.app.brand].epgCards === true;
    
    // Inicializar módulo correspondiente
    if (this.useCards) {
        EPGCards.init(this);
    }
}
```

**Modificar `EPG.show()`:**
```javascript
show: function() {
    $("#channelsGrid").hide();
    $("#epgContainer").css({"visibility": "visible"});
    $("#epgContainer").show();

    if (this.useCards) {
        EPGCards.show();
    } else {
        // Lógica tradicional existente
        var $defaultChannelFocus = this.getCurrentChannelEPGItem();
        // ... resto del código tradicional ...
    }
}
```

**Modificar `EPG.draw()`:**
```javascript
draw: function(servicesWithEPG) {
    this.initializeValues();
    this.items = servicesWithEPG;
    
    // ... inicialización de DataModel ...
    
    if (this.useCards) {
        EPGCards.draw(servicesWithEPG);
    } else {
        // Lógica tradicional existente
        // ... resto del código tradicional ...
    }
}
```

**Modificar `EPG.navigate()`:**
```javascript
navigate: function(direction) {
    if (!this.epgLoaded) {
        return $(".video-container");
    }
    
    if (this.useCards) {
        return EPGCards.navigate(direction);
    } else {
        // Lógica tradicional existente
        // ... resto del código tradicional ...
    }
}
```

**Modificar `EPG.onFocus()`:**
```javascript
onFocus: function($el) {
    if (!this.epgLoaded) {
        return;
    }
    
    if (this.useCards) {
        EPGCards.onFocus($el);
    } else {
        // Lógica tradicional existente
        // ... resto del código tradicional ...
    }
}
```

**Modificar `EPG.onEnter()`:**
```javascript
onEnter: function($el, callbackForPlay) {
    if (this.useCards) {
        EPGCards.onEnter($el, callbackForPlay);
    } else {
        // Lógica tradicional existente
        // ... resto del código tradicional ...
    }
}
```

### 5.2 En `index.html`

**Agregar referencias a nuevos archivos:**
```html
<!-- EPG Cards Module (solo se carga si epgCards === true) -->
<script>
if (CONFIG.app.brands[CONFIG.app.brand].epgCards === true) {
    document.write('<script src="js/module/epg-cards/index.js"><\/script>');
    document.write('<link rel="stylesheet" href="assets/css/epg-cards.css">');
}
</script>
```

O mejor, cargar condicionalmente desde el módulo principal.

---

## FASE 6: IMPLEMENTAR MÓDULO EPGCARDS

### 6.1 `EPGCards.js` - Estructura base

```javascript
EPGCards = (function(Events) {
    var EPGCards = {};
    
    // Referencias
    var parentEPG = null;
    var RenderEngine = null;
    var NavigationEngine = null;
    
    $.extend(true, EPGCards, Events, {
        init: function(parent) {
            parentEPG = parent;
            // Inicializar sub-módulos
            RenderEngine = EPGCardsRenderEngine;
            NavigationEngine = EPGCardsNavigationEngine;
            RenderEngine.init(parent.$epgGrid);
        },
        
        show: function() {
            // Mostrar EPG en modo cards
        },
        
        hide: function() {
            // Ocultar EPG
        },
        
        draw: function(servicesWithEPG) {
            // Renderizar cards
        },
        
        navigate: function(direction) {
            // Navegación en cards
        },
        
        onFocus: function($el) {
            // Manejo de foco
        },
        
        onEnter: function($el, callbackForPlay) {
            // Manejo de Enter
        }
    });
    
    return EPGCards;
})(Events);
```

### 6.2 `RenderEngine.js` - Renderizado de cards

Mover todos los métodos de renderizado de cards aquí.

### 6.3 `NavigationEngine.js` - Navegación de cards

Mover toda la lógica de navegación específica de cards aquí.

---

## FASE 7: LIMPIEZA Y OPTIMIZACIÓN

### 7.1 Limpiar `epg.js`
- ✅ Eliminar código muerto
- ✅ Eliminar comentarios obsoletos
- ✅ Optimizar código tradicional

### 7.2 Limpiar `epg.css`
- ✅ Eliminar estilos de cards
- ✅ Mantener solo estilos tradicionales

### 7.3 Documentar
- ✅ Comentar código nuevo
- ✅ Documentar API de EPGCards
- ✅ Actualizar documentación de fases

---

## FASE 8: TESTING

### 8.1 Testing con `epgCards: false`
- ✅ Verificar que EPG tradicional funciona igual
- ✅ Verificar navegación tradicional
- ✅ Verificar renderizado tradicional

### 8.2 Testing con `epgCards: true`
- ✅ Verificar que EPG cards funciona
- ✅ Verificar navegación de cards
- ✅ Verificar renderizado de cards
- ✅ Verificar scroll automático
- ✅ Verificar foco inicial
- ✅ Verificar reproducción de canales

### 8.3 Testing de integración
- ✅ Verificar que ambos modos no interfieren
- ✅ Verificar cambio de bandera
- ✅ Verificar que DataModel se comparte correctamente
- ✅ Verificar que EPGDetails funciona en ambos modos

---

## ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. **FASE 1**: Crear estructura de archivos
2. **FASE 2**: Mover código de cards (copiar, no eliminar aún)
3. **FASE 6**: Implementar módulo EPGCards básico
4. **FASE 5**: Modificar integración en EPG principal
5. **FASE 4**: Eliminar código duplicado
6. **FASE 7**: Limpieza y optimización
7. **FASE 8**: Testing completo

---

## NOTAS IMPORTANTES

- ⚠️ **NO eliminar código hasta que el nuevo módulo funcione completamente**
- ⚠️ **Mantener compatibilidad hacia atrás**
- ⚠️ **Probar ambos modos antes de eliminar código**
- ⚠️ **DataModel debe ser compartido entre ambos modos**
- ⚠️ **EPGDetails debe funcionar en ambos modos**

---

## ARCHIVOS A MODIFICAR

1. `public/js/module/epg.js` - Limpiar y agregar selector
2. `public/assets/css/epg.css` - Eliminar estilos de cards
3. `public/index.html` - Agregar referencias condicionales (si es necesario)

## ARCHIVOS A CREAR

1. `public/js/module/epg-cards/EPGCards.js`
2. `public/js/module/epg-cards/RenderEngine.js`
3. `public/js/module/epg-cards/NavigationEngine.js`
4. `public/js/module/epg-cards/index.js`
5. `public/assets/css/epg-cards.css`

---

## CHECKLIST FINAL

- [ ] Estructura de archivos creada
- [ ] Código de cards movido
- [ ] Módulo EPGCards implementado
- [ ] Integración en EPG principal
- [ ] Código duplicado eliminado
- [ ] Estilos movidos a epg-cards.css
- [ ] Testing con epgCards: false
- [ ] Testing con epgCards: true
- [ ] Documentación actualizada
- [ ] Código limpio y optimizado
