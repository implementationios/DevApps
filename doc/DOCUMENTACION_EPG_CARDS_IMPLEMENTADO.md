# DOCUMENTACIÓN: IMPLEMENTACIÓN EPG CARDS (FASE 6)

## RESUMEN
Documentación completa de la implementación del diseño de cards para el EPG, realizada en la Fase 6. Esta documentación se crea antes de revertir los cambios para preservar el conocimiento adquirido.

---

## FUNCIONALIDADES IMPLEMENTADAS

### 1. Diseño de Cards
- ✅ Cards de canal con header (logo, número, nombre)
- ✅ Carrusel horizontal de eventos dentro de cada card
- ✅ Vista expandida cuando una card está enfocada
- ✅ Detalles grandes del evento actual cuando está enfocado
- ✅ Cards de eventos individuales con imagen, título y metadata
- ✅ Indicadores de eventos en vivo
- ✅ Badge de rating parental
- ✅ Progreso de eventos en vivo

### 2. Canales sin EPG
- ✅ Vista simplificada con mensaje "SIN INFORMACIÓN DE EPG"
- ✅ Botón "Ver Canal En Vivo" navegable
- ✅ Icono de satélite para indicar falta de datos

### 3. Virtualización
- ✅ Renderizado solo de canales visibles
- ✅ Spacers virtuales para mantener altura de scroll
- ✅ Cálculo de rango visible adaptado para cards
- ✅ Actualización dinámica del rango visible

### 4. Navegación
- ✅ Navegación entre cards de canal
- ✅ Navegación dentro de cards (botones, eventos)
- ✅ Scroll automático para mantener elemento enfocado visible
- ✅ Foco inicial en primera card al abrir EPG

### 5. Reproducción
- ✅ Reproducción de canal en vivo desde botón
- ✅ Integración con EPGDetails para eventos
- ✅ Manejo de eventos pasados (catchup) y futuros

---

## ESTRUCTURA DE CÓDIGO

### RenderEngine - Métodos de Cards

#### `renderCards(channels)`
Renderiza el EPG completo usando diseño de cards.
- Configura el contenedor para modo cards
- Establece altura total basada en número de canales
- Configura scroll handler
- Llama a `renderVisibleChannelsCards()`

#### `renderVisibleChannelsCards()`
Renderiza solo los canales visibles usando cards.
- Calcula spacers superior e inferior
- Determina qué card está enfocada
- Renderiza cards de canales en rango visible
- Actualiza DOM con clase `cards-mode`

#### `renderChannelCard(channel, channelIndex, isFocused)`
Renderiza una card individual de canal.

**Estructura HTML generada:**
```html
<div class="epg-channel-card focusable" data-channel-index="X" data-service-id="Y">
  <!-- Header del canal -->
  <div class="epg-channel-card-header">
    <img class="epg-channel-logo" />
    <span class="epg-channel-number">Número</span>
    <span class="epg-channel-name">Nombre</span>
  </div>
  
  <!-- Sin EPG -->
  <div class="epg-card-no-data">
    <div class="epg-card-no-data-icon">📡</div>
    <div class="epg-card-no-data-title">SIN INFORMACIÓN DE EPG</div>
    <div class="epg-card-no-data-message">Mensaje</div>
    <button class="epg-action-button-small focusable">▶️ Ver Canal En Vivo</button>
  </div>
  
  <!-- Con EPG -->
  <!-- Vista expandida (si está enfocado) -->
  <div class="epg-event-details-large">...</div>
  <div class="epg-card-upcoming-label">PRÓXIMOS EVENTOS:</div>
  
  <!-- Carrusel de eventos -->
  <div class="epg-events-carousel">
    <!-- Cards de eventos -->
  </div>
</div>
```

**Lógica:**
- Si no hay EPG: muestra vista simplificada
- Si hay EPG: muestra carrusel de eventos
- Si está enfocado y hay evento actual: muestra detalles grandes
- Evento actual siempre aparece primero en el carrusel

#### `renderEventCard(event, isLive, isFocused, channelIndex, eventIndex)`
Renderiza una card individual de evento.

**Estructura HTML:**
```html
<div class="epg-event-card focusable live" 
     data-service-id="X" 
     data-channel-index="Y" 
     data-event-index="Z"
     data-date="...">
  <div class="epg-event-image">
    <img src="..." />
    <span class="epg-event-rating">[+X]</span>
  </div>
  <div class="epg-event-card-title">Título</div>
  <div class="epg-event-card-meta">
    <span>Hora</span>
    <span>⏰ Progreso%</span> <!-- Si está en vivo -->
    <span>Duración min</span> <!-- Si no está en vivo -->
  </div>
</div>
```

**Clases CSS aplicadas:**
- `live`: Si el evento está en vivo
- `epg-event-card-short`: Si la duración es < 30 minutos
- `focused`: Si el evento está enfocado

#### `renderEventDetailsLarge(event)`
Renderiza detalles expandidos de un evento (cuando la card está enfocada).

**Estructura HTML:**
```html
<div class="epg-event-poster">
  <img src="..." />
  <div class="epg-event-progress-overlay">⏰ X% visto</div>
</div>
<div class="epg-event-info-large">
  <div class="epg-event-info-title">Título</div>
  <div class="epg-event-info-meta">
    <span>🕐 Hora inicio - Hora fin</span>
    <span>[+X]</span>
    <span>⏰ Tiempo restante</span>
  </div>
  <div class="epg-event-info-description">Descripción</div>
  <div class="epg-event-actions">
    <button class="epg-action-button">▶️ Ver</button>
    <button class="epg-action-button">⭐ Favoritos</button>
  </div>
</div>
```

### Helpers

#### `getCurrentEvent(channel)`
Obtiene el evento actual (en vivo) de un canal.
- Usa `moment.isBetween()` para comparar fechas
- Maneja conversión de fechas a objetos moment
- Retorna `null` si no hay evento actual

#### `isCurrentEvent(event)`
Verifica si un evento está en vivo.
- Compara fecha actual con `startDate` y `endDate`
- Usa `moment.isBetween()` con inclusión de bordes `[]`

#### `calculateProgress(event)`
Calcula el progreso de un evento en vivo (0-100%).
- Calcula duración total y tiempo transcurrido
- Retorna porcentaje redondeado

#### `getDurationMinutes(event)`
Obtiene la duración de un evento en minutos.
- Usa `getTimeDifference()` helper

#### `getRemainingTime(event)`
Obtiene el tiempo restante de un evento en vivo.
- Formatea como "X min" o "Xh Ymin"

#### `truncate(text, maxLength)`
Trunca un texto a una longitud máxima.
- Agrega "..." si excede el límite

---

## NAVEGACIÓN IMPLEMENTADA

### Navegación Vertical (Arriba/Abajo)

**Desde una card de canal:**
- `down`: Busca botón dentro de la card, si no hay, va a siguiente card
- `up`: Va a card anterior

**Desde un botón:**
- `down`: Va a siguiente card de canal
- `up`: Vuelve a la card padre

**Desde un evento del carrusel:**
- `down`: Va a siguiente card de canal
- `up`: Va a card anterior

### Navegación Horizontal (Izquierda/Derecha)
- `left`: Elemento focusable anterior
- `right`: Elemento focusable siguiente

### Foco Inicial
- Al abrir EPG, foco se establece en primera card (índice 0)
- Usa `data-channel-index` para encontrar la card

### Scroll Automático
- Intenta usar `scrollIntoView()` nativo
- Fallback a cálculo manual de posiciones
- Usa `offset()` para posiciones absolutas
- Margen de 50px para evitar bordes cortados

---

## PROBLEMAS ENCONTRADOS (NO RESUELTOS)

### 1. Navegación entre Canales
**Problema:**
- Al navegar hacia abajo desde el botón "Ver Canal En Vivo", no siempre se movía al siguiente canal
- A veces requería múltiples intentos
- El scroll no siempre se ajustaba correctamente

**Causas posibles:**
- Virtualización: siguiente canal no siempre estaba renderizado
- Cálculo de posiciones: `position()` vs `offset()` inconsistente
- Timing: DOM no actualizado cuando se calcula posición

**Intentos de solución:**
- Uso de `data-channel-index` para buscar cards
- Expansión del rango visible antes de navegar
- `setTimeout` para dar tiempo al DOM
- `scrollIntoView()` nativo
- Cálculo mejorado con `offset()`

**Estado:** Parcialmente resuelto, pero no completamente estable

### 2. Scroll Automático
**Problema:**
- El scroll automático no siempre funcionaba
- A veces el elemento enfocado quedaba fuera de vista
- El cálculo de posiciones era inconsistente

**Causas posibles:**
- Contenedor con `overflow` complejo
- Posiciones relativas vs absolutas
- Timing de actualización del DOM

**Estado:** Funcionaba "a medias"

---

## LECCIONES APRENDIDAS

### 1. Virtualización y Navegación
- La virtualización complica la navegación porque los elementos no siempre están en el DOM
- Es necesario expandir el rango visible ANTES de navegar
- Usar `data-channel-index` es más confiable que `next()`/`prev()`

### 2. Scroll en Contenedores Complejos
- `scrollIntoView()` no siempre funciona en contenedores con overflow anidado
- Es mejor calcular posiciones manualmente
- Usar `offset()` en lugar de `position()` para posiciones absolutas

### 3. Timing del DOM
- Necesario usar `setTimeout` después de cambios en el DOM
- El renderizado asíncrono puede causar problemas de timing

### 4. Separación de Código
- Mezclar lógica de cards con tradicional complica el mantenimiento
- Es mejor tener módulos separados desde el inicio
- Las condiciones `if (useCards)` hacen el código difícil de seguir

---

## ESTRUCTURA DE DATOS

### Card de Canal
```javascript
{
  id: Number,              // ID del servicio
  name: String,             // Nombre del canal
  lcn: String,              // Número de canal
  img: String,              // URL del logo
  epgItems: Array,          // Array de eventos EPG
  epgStreamId: Number       // ID del stream EPG
}
```

### Evento EPG
```javascript
{
  event_id: String,         // ID del evento
  startDate: Moment,        // Fecha de inicio (objeto moment)
  endDate: Moment,          // Fecha de fin (objeto moment)
  languages: [{
    title: String,           // Título del evento
    extendedDescription: String  // Descripción extendida
  }],
  imageUrl: String,         // URL de la imagen
  parentalRating: Number,   // Rating parental
  serviceId: Number,        // ID del servicio
  catchupId: String         // ID para catchup (si aplica)
}
```

---

## ESTILOS CSS IMPLEMENTADOS

### Clases Principales

#### `.epg-channel-card`
- Card principal de canal
- Gradiente de fondo
- Border radius
- Padding y margin
- Transición suave
- `focusable` para navegación

#### `.epg-channel-card:focus`
- Borde azul cuando está enfocado
- Box shadow
- Margen para evitar cortes de borde
- Sin transform scale (removido para evitar cortes)

#### `.epg-events-carousel`
- Flexbox horizontal
- Overflow-x auto
- Scroll suave
- Gap entre elementos

#### `.epg-event-card`
- Ancho mínimo/máximo fijo
- Fondo semi-transparente
- Border radius
- Transición en hover/focus
- `flex-shrink: 0` para mantener tamaño

#### `.epg-event-card.live`
- Gradiente rojo para eventos en vivo
- Borde blanco

#### `.epg-event-card-short`
- Versión compacta para eventos < 30 min
- Ancho reducido

### Estilos de "Sin EPG"
- `.epg-card-no-data`: Contenedor principal
- `.epg-card-no-data-icon`: Icono de satélite
- `.epg-card-no-data-title`: Título en mayúsculas
- `.epg-card-no-data-message`: Mensaje descriptivo
- `.epg-action-button-small`: Botón "Ver Canal En Vivo"

### Estilos de Detalles Expandidos
- `.epg-event-details-large`: Contenedor de detalles
- `.epg-event-poster`: Poster del evento
- `.epg-event-progress-overlay`: Overlay de progreso
- `.epg-event-info-large`: Información del evento
- `.epg-event-actions`: Botones de acción

---

## INTEGRACIÓN CON MÓDULOS EXISTENTES

### DataModel
- **Compartido**: Se usa el mismo DataModel para ambos diseños
- **Métodos usados**: `DataModel.getChannels()`, `DataModel.getChannel()`

### AppData
- **Compartido**: Métodos de obtención de datos
- **Métodos usados**: 
  - `AppData.getServiceTV(serviceId)`
  - `AppData.getCatchupByEventId(catchupId)`
  - `AppData.getSimpleEpgByChannelIndex(index, callback)`

### EPGDetails
- **Compartido**: Diálogo de detalles funciona en ambos modos
- **Integración**: Se muestra al presionar Enter en un evento

### Focus System
- **Compartido**: Sistema de foco existente
- **Adaptación**: Cards usan clase `focusable` para navegación

---

## CONFIGURACIÓN

### Bandera de Activación
```javascript
// En config.brands.js
{
  brand: "telecable",
  epgCards: true,  // Activa diseño de cards
  // ...
}
```

### Propiedad en RenderEngine
```javascript
var RenderEngine = {
  useCards: true,  // Controla si usar cards
  // ...
}
```

---

## CÓDIGO CLAVE PARA PRESERVAR

### 1. Renderizado de Cards
- `renderChannelCard()`: Lógica completa de renderizado
- `renderEventCard()`: Renderizado de eventos
- `renderEventDetailsLarge()`: Detalles expandidos
- Helpers de eventos: `getCurrentEvent()`, `isCurrentEvent()`, etc.

### 2. Navegación
- Lógica de navegación por `data-channel-index`
- Expansión de rango visible antes de navegar
- Scroll automático con `scrollIntoView()` y fallback

### 3. Virtualización
- Cálculo de rango visible para cards
- Spacers virtuales con altura de card
- Actualización dinámica del rango

### 4. Estilos CSS
- Todos los estilos de `.epg-channel-card` y relacionados
- Estilos de carrusel y eventos
- Estilos de "Sin EPG"

---

## RECOMENDACIONES PARA REIMPLEMENTACIÓN

### 1. Separación desde el Inicio
- Crear módulo independiente desde el principio
- No mezclar lógica de cards con tradicional
- Usar bandera de configuración para activar/desactivar

### 2. Navegación Mejorada
- Implementar navegación basada en índice desde el inicio
- Usar contenedor dedicado para cards (mejor control de scroll)
- Considerar usar un modal fullscreen para mejor experiencia

### 3. Scroll Optimizado
- Usar contenedor simple con `overflow-y: auto`
- Evitar contenedores anidados con overflow
- Implementar scroll suave desde el inicio

### 4. Testing Incremental
- Probar navegación después de cada cambio
- Verificar scroll automático en cada iteración
- No avanzar hasta que funcione correctamente

---

## ARCHIVOS MODIFICADOS

1. `public/js/module/epg.js`
   - Agregados métodos de renderizado de cards
   - Agregada lógica de navegación de cards
   - Agregados helpers de eventos
   - Modificados métodos principales para soportar cards

2. `public/assets/css/epg.css`
   - Agregados estilos de cards (líneas ~218-563)
   - Estilos de carrusel, eventos, detalles, etc.

---

## CONCLUSIÓN

La implementación de cards fue funcional en términos de renderizado y diseño, pero tuvo problemas con la navegación y el scroll automático. La lección principal es que es mejor separar el código desde el inicio en módulos independientes, en lugar de mezclar lógica con condiciones.

Al reimplementar, se recomienda:
1. Crear módulo independiente desde el principio
2. Usar contenedor dedicado (posiblemente modal)
3. Implementar navegación basada en índice desde el inicio
4. Probar incrementalmente cada funcionalidad

---

**Fecha de documentación:** Antes de reversión
**Estado:** Funcional pero con problemas de navegación
**Próximo paso:** Revertir cambios y reimplementar en módulo independiente
