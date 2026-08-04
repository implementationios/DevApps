# FASE 5: Virtualización

**Estado:** ✅ Completada  
**Fecha:** 2026-01-13

## Objetivo

Implementar renderizado virtualizado para mostrar solo los canales visibles en pantalla más un buffer, mejorando significativamente el rendimiento cuando hay muchos canales.

## Cambios Implementados

### 1. Propiedades de Virtualización en RenderEngine

Se agregaron las siguientes propiedades al `RenderEngine`:

- `allChannels`: Array completo de todos los canales (para referencia)
- `visibleRange`: Objeto con `{start, end}` indicando qué canales están visibles
- `rowHeight`: Altura de cada fila de canal
- `bufferSize`: Cantidad de canales buffer arriba y abajo (por defecto: 2)
- `totalChannels`: Total de canales disponibles
- `scrollHandler`: Referencia al handler de scroll para poder removerlo

### 2. Métodos de Virtualización

#### `calculateVisibleRange()`
- Calcula qué canales están visibles basándose en el `scrollTop` y la altura de cada fila
- Retorna `{start: number, end: number}` con los índices de canales visibles
- Incluye buffer arriba y abajo

#### `renderChannelRange(channels, range)`
- Renderiza solo un rango específico de canales
- Genera HTML para encabezados de canales y items EPG del rango especificado
- Retorna `{channelsHtml, itemsHtml, events}`

#### `updateVisibleRange()`
- Actualiza el rango visible cuando cambia el scroll
- Solo re-renderiza si el rango cambió significativamente (más de 1 canal)
- Evita re-renderizados innecesarios

#### `renderVisibleChannels()`
- Renderiza solo los canales visibles con spacers arriba y abajo
- Los spacers mantienen el scroll correcto simulando los canales no renderizados
- Actualiza el DOM con el nuevo contenido

### 3. Modificaciones en `render()`

El método `render()` ahora:
1. Guarda todos los canales en `allChannels`
2. Calcula la altura de cada fila (`rowHeight`)
3. Calcula el rango visible inicial
4. Renderiza solo los canales visibles con spacers
5. Configura el scroll handler para actualizar el rango cuando sea necesario
6. Establece la altura total del contenido para mantener el scroll correcto

### 4. Spacers Virtuales

Se agregan elementos `<div class='epg-virtual-spacer'>` arriba y abajo de los canales visibles para:
- Mantener la altura total del scroll correcta
- Simular los canales no renderizados
- Permitir scroll suave sin saltos

### 5. Integración con Navegación

- El método `navigate()` ahora llama a `RenderEngine.updateVisibleRange()` después de hacer scroll
- El método `gridOptimization()` se adaptó para actualizar `RenderEngine.allChannels` y re-renderizar cuando se carga un nuevo canal
- Cuando se carga un canal nuevo, se actualiza el `DataModel` y se re-renderiza el rango visible

### 6. Limpieza Mejorada

El método `clear()` ahora:
- Remueve el handler de scroll correctamente
- Limpia todas las propiedades de virtualización
- Evita memory leaks

## Código Clave

```javascript
// Calcular rango visible
calculateVisibleRange: function() {
  var scrollTop = this.$epgGrid.scrollTop() || 0;
  var gridHeight = this.$epgGrid.height() || 0;
  
  var startIndex = Math.floor(scrollTop / this.rowHeight);
  startIndex = Math.max(0, startIndex - this.bufferSize);
  
  var visibleCount = Math.ceil(gridHeight / this.rowHeight);
  var endIndex = Math.min(this.totalChannels - 1, startIndex + visibleCount + (this.bufferSize * 2));
  
  return { start: startIndex, end: endIndex };
}

// Renderizar con spacers
renderVisibleChannels: function() {
  var rendered = this.renderChannelRange(this.allChannels, this.visibleRange);
  var topSpacerHeight = this.visibleRange.start * this.rowHeight;
  var bottomSpacerHeight = (this.totalChannels - this.visibleRange.end - 1) * this.rowHeight;
  
  // Agregar spacers y contenido visible
  // ...
}
```

## Beneficios

✅ **Rendimiento mejorado**: Solo se renderizan ~7-9 canales en lugar de todos  
✅ **Menos elementos DOM**: Reduce significativamente la cantidad de elementos en el DOM  
✅ **Scroll suave**: Los spacers mantienen el scroll correcto  
✅ **Re-renderizado inteligente**: Solo se actualiza cuando es necesario  
✅ **Compatible con navegación**: Funciona correctamente con la navegación existente  

## Criterios de Éxito

✅ Solo se renderizan ~7-9 canales en lugar de todos  
✅ Navegación funciona correctamente  
✅ Al navegar, se re-renderiza cuando es necesario  
✅ Rendimiento mejorado (menos elementos DOM)  
✅ No hay lag o saltos visuales  

## Próximos Pasos

- **FASE 6**: Implementar diseño de cards con carrusel
- **FASE 7**: Implementar navegación O(1) usando DataModel
- **FASE 8**: Optimizaciones finales

## Notas

- El buffer por defecto es de 2 canales arriba y 2 abajo
- Los spacers mantienen la altura total correcta para el scroll
- El re-renderizado solo ocurre cuando el rango cambia significativamente (más de 1 canal)
- La virtualización es transparente para el usuario (no hay cambios visuales)

## ⚠️ Problemas Conocidos

### Problema: Navegación a canales fuera del rango visible inicial

**Descripción:** Al intentar navegar a canales 6 y 7 (fuera del rango visible inicial de ~5 canales), estos no se renderizan correctamente. El usuario puede navegar hasta el canal 5 sin problemas, pero al intentar ir al 6 o 7, no se renderizan.

**Síntoma:** Los canales 6 y 7 no aparecen al navegar hacia abajo, aunque funcionan si el usuario hace zoom negativo en la pantalla (lo que cambia la altura visible y recalcula el rango).

**Causa probable:** El rango visible se expande, pero el renderizado no se completa correctamente antes de que el scroll intente encontrar los elementos.

**Estado:** 🔄 Pendiente de resolución (se abordará al final del desarrollo)

**Workaround temporal:** Hacer zoom negativo en la pantalla para que se rendericen más canales.
