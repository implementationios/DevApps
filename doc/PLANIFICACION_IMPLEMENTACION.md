# PLANIFICACIÓN DETALLADA: IMPLEMENTACIÓN MÓDULO EPG CARDS

## OBJETIVO
Crear un módulo independiente para el diseño de cards del EPG en formato **modal/popup fullscreen**, controlado por la bandera `epgCards` en `config.brands.js`, sin interferir con el diseño tradicional.

### DISEÑO: MODAL FULLSCREEN
- Modal que ocupa 100% de la pantalla cuando se activa
- Contenedor simple con scroll vertical optimizado
- Experiencia tipo Netflix/Pluto TV
- Fácil de cerrar (ESC o botón)
- No interfiere con el EPG tradicional

---

## FASES DE IMPLEMENTACIÓN

### FASE 1: PREPARACIÓN Y ESTRUCTURA ⏱️ ~30 min

#### 1.1 Crear estructura de directorios
- [ ] Crear directorio `public/js/module/epg-cards/`
- [ ] Crear archivo `EPGCards.js` (módulo principal)
- [ ] Crear archivo `RenderEngine.js` (renderizado de cards)
- [ ] Crear archivo `NavigationEngine.js` (navegación optimizada)
- [ ] Crear archivo `index.js` (exportación/inicialización)

#### 1.2 Crear estructura HTML del modal
- [ ] Agregar HTML del modal fullscreen en `index.html`
  - Contenedor modal con clase `epg-cards-modal`
  - Overlay de fondo
  - Contenedor principal con scroll
  - Botón de cerrar (opcional)
- [ ] Estructura sugerida:
```html
<div id="epgCardsModal" class="epg-cards-modal" style="display: none;">
  <div class="epg-cards-overlay"></div>
  <div class="epg-cards-container">
    <div class="epg-cards-header">
      <button class="epg-cards-close focusable">✕</button>
    </div>
    <div class="epg-cards-content" id="epgCardsGrid">
      <!-- Cards se renderizan aquí -->
    </div>
  </div>
</div>
```

#### 1.3 Crear archivo CSS
- [ ] Crear archivo `public/assets/css/epg-cards.css`
- [ ] Mover estilos de cards desde `epg.css` (líneas 218-563)
- [ ] Agregar estilos para modal fullscreen:
  - `.epg-cards-modal`: Fullscreen, z-index alto, overlay
  - `.epg-cards-container`: Contenedor principal con scroll vertical
  - `.epg-cards-content`: Área de contenido con scroll optimizado
  - `.epg-cards-close`: Botón de cerrar
- [ ] Limpiar y organizar estilos

#### 1.3 Verificar configuración
- [ ] Verificar que `epgCards` existe en `config.brands.js`
- [ ] Verificar valores de bandera (true/false) por brand

**Entregables:**
- ✅ Estructura de archivos creada
- ✅ HTML del modal agregado en index.html
- ✅ CSS base movido y organizado
- ✅ Estilos de modal fullscreen implementados

---

### FASE 2: MÓDULO PRINCIPAL EPGCARDS ⏱️ ~1 hora

#### 2.1 Crear estructura base de EPGCards.js
- [ ] Crear función wrapper `EPGCards = (function(Events) { ... })`
- [ ] Definir objeto principal `var EPGCards = {}`
- [ ] Extender con Events: `$.extend(true, EPGCards, Events, { ... })`
- [ ] Definir variables internas:
  - `parentEPG`: referencia al EPG principal
  - `RenderEngine`: referencia al RenderEngine de cards
  - `NavigationEngine`: referencia al NavigationEngine
  - `$modal`: referencia al modal (`#epgCardsModal`)
  - `$container`: referencia al contenedor de cards (`#epgCardsGrid`)
  - `$overlay`: referencia al overlay
  - `$closeButton`: referencia al botón de cerrar
  - `epgLoaded`: flag de carga
  - `currentServiceFocused`: servicio enfocado
  - `currentEpgItemFocused`: evento EPG enfocado
  - `isShown`: flag de visibilidad del modal

#### 2.2 Implementar métodos principales
- [ ] `init(parentEPG)`: Inicialización
  - Recibir referencia al EPG principal
  - Obtener referencias a elementos del modal
  - Configurar event listeners (cerrar, ESC, etc.)
  - Inicializar RenderEngine con contenedor del modal
  - Inicializar NavigationEngine
  - Guardar referencias necesarias
  
- [ ] `show()`: Mostrar modal fullscreen
  - Mostrar modal (`$modal.show()` o `$modal.css('display', 'block')`)
  - Agregar clase `active` o `shown` al modal
  - Prevenir scroll del body (agregar clase `no-scroll` al body)
  - Ocultar grilla de canales tradicional si es necesario
  - Establecer foco inicial en primera card
  - Disparar evento `shown` si es necesario
  
- [ ] `hide()`: Ocultar modal
  - Ocultar modal
  - Remover clase `active` o `shown`
  - Permitir scroll del body (remover clase `no-scroll`)
  - Mostrar grilla de canales tradicional si es necesario
  - Disparar evento `hidden` si es necesario
  
- [ ] `isShown()`: Verificar si está visible
  - Retornar estado del modal
  
- [ ] `reset()`: Resetear estado
  - Limpiar referencias
  - Resetear flags
  - Limpiar DOM del contenedor
  - Ocultar modal

**Entregables:**
- ✅ Módulo EPGCards con estructura base
- ✅ Métodos principales implementados

---

### FASE 3: RENDER ENGINE DE CARDS ⏱️ ~2-3 horas

#### 3.1 Crear estructura base de RenderEngine.js
- [ ] Crear objeto `EPGCardsRenderEngine`
- [ ] Definir propiedades:
  - `$container`: contenedor principal del modal (no `$epgGrid` para evitar confusión)
  - `allChannels`: array de canales
  - `totalChannels`: número total
  - `visibleRange`: rango visible {start, end}
  - `rowHeight`: altura estimada de card
  - `bufferSize`: tamaño de buffer para virtualización
  - `scrollHandler`: handler de scroll
  - `cardHeight`: altura estimada de una card (para cálculos)

#### 3.2 Implementar métodos de inicialización
- [ ] `init($container)`: Inicializar con contenedor del modal
  - Guardar referencia a $container (del modal, no del EPG tradicional)
  - Configurar propiedades iniciales
  - Configurar scroll handler para el contenedor del modal
  - Configurar altura del contenedor (100vh o altura del modal)
  - Retornar true si éxito

#### 3.3 Implementar métodos de renderizado principal
- [ ] `render(channels)`: Renderizar EPG completo
  - Validar parámetros
  - Guardar canales
  - Calcular altura total
  - Configurar scroll handler
  - Llamar a `renderVisibleChannels()`

- [ ] `renderVisibleChannels()`: Renderizar canales visibles
  - Calcular rango visible
  - Generar spacers superior e inferior
  - Renderizar cards de canales visibles
  - Actualizar DOM

#### 3.4 Implementar métodos de renderizado de cards
- [ ] `renderChannelCard(channel, channelIndex, isFocused)`
  - Generar HTML de card de canal
  - Manejar caso sin EPG
  - Manejar caso con EPG
  - Incluir carrusel de eventos
  - Incluir detalles expandidos si está enfocado
  
- [ ] `renderEventCard(event, isLive, isFocused, channelIndex, eventIndex)`
  - Generar HTML de card de evento
  - Manejar eventos cortos (< 30 min)
  - Incluir imagen, título, metadata
  - Aplicar clases según estado (live, focused, short)
  
- [ ] `renderEventDetailsLarge(event)`
  - Generar HTML de detalles expandidos
  - Incluir poster, información, descripción
  - Incluir botones de acción

#### 3.5 Implementar helpers de eventos
- [ ] `getCurrentEvent(channel)`: Obtener evento actual
- [ ] `isCurrentEvent(event)`: Verificar si está en vivo
- [ ] `calculateProgress(event)`: Calcular progreso (0-100%)
- [ ] `getDurationMinutes(event)`: Obtener duración
- [ ] `getRemainingTime(event)`: Obtener tiempo restante
- [ ] `truncate(text, maxLength)`: Truncar texto

#### 3.6 Implementar virtualización
- [ ] `calculateVisibleRange(targetChannelIndex)`: Calcular rango visible
  - Considerar scroll actual
  - Incluir buffer
  - Asegurar que targetChannelIndex esté incluido
  
- [ ] `updateVisibleRange(forceUpdate, targetChannelIndex)`: Actualizar rango
  - Calcular nuevo rango
  - Re-renderizar si cambió
  - Manejar scroll handler

**Entregables:**
- ✅ RenderEngine completo con todos los métodos
- ✅ Renderizado de cards funcional
- ✅ Virtualización implementada

---

### FASE 4: NAVIGATION ENGINE ⏱️ ~2 horas

#### 4.1 Crear estructura base de NavigationEngine.js
- [ ] Crear objeto `EPGCardsNavigationEngine`
- [ ] Definir propiedades:
  - `$container`: contenedor principal del modal
  - `parentEPG`: referencia al EPG principal
  - `RenderEngine`: referencia al RenderEngine
  - `EPGCards`: referencia al módulo EPGCards

#### 4.2 Implementar navegación principal
- [ ] `navigate(direction)`: Navegación principal
  - Manejar direcciones: up, down, left, right
  - Identificar elemento enfocado actual
  - Determinar siguiente elemento
  - Expandir rango visible si es necesario
  - Establecer foco y hacer scroll

#### 4.3 Implementar lógica específica por elemento
- [ ] Navegación desde card de canal:
  - `down`: Buscar botón dentro de card, si no hay, siguiente card
  - `up`: Card anterior
  
- [ ] Navegación desde botón:
  - `down`: Siguiente card de canal
  - `up`: Volver a card padre
  
- [ ] Navegación desde evento:
  - `down`: Siguiente card de canal
  - `up`: Card anterior
  - `left/right`: Eventos dentro del carrusel

#### 4.4 Implementar scroll automático
- [ ] `ensureItemVisibility($el)`: Asegurar que elemento sea visible
  - Calcular posición del elemento dentro del contenedor del modal
  - Calcular área visible del contenedor (altura del modal)
  - Hacer scroll del contenedor si es necesario
  - Usar `scrollIntoView()` nativo si es posible (más confiable en modal)
  - Fallback a cálculo manual con margen para evitar bordes cortados
  - **Ventaja del modal**: Scroll más simple porque el contenedor es directo

#### 4.5 Implementar foco inicial
- [ ] `setInitialFocus()`: Establecer foco en primera card
  - Buscar primera card (índice 0)
  - Establecer foco
  - Asegurar visibilidad

**Entregables:**
- ✅ NavigationEngine completo
- ✅ Navegación funcional en todas las direcciones
- ✅ Scroll automático funcionando

---

### FASE 5: INTEGRACIÓN CON EPG PRINCIPAL ⏱️ ~1 hora

#### 5.1 Modificar EPG.init()
- [ ] Detectar bandera `epgCards`
- [ ] Guardar en `this.useCards`
- [ ] Inicializar EPGCards si `epgCards === true`

#### 5.2 Modificar EPG.show()
- [ ] Agregar condición: si `this.useCards`, llamar `EPGCards.show()`
- [ ] Mantener lógica tradicional si `epgCards === false`

#### 5.3 Modificar EPG.draw()
- [ ] Agregar condición: si `this.useCards`, llamar `EPGCards.draw()`
- [ ] Mantener lógica tradicional si `epgCards === false`

#### 5.4 Modificar EPG.navigate()
- [ ] Agregar condición: si `this.useCards`, llamar `EPGCards.navigate()`
- [ ] Mantener lógica tradicional si `epgCards === false`

#### 5.5 Modificar EPG.onFocus()
- [ ] Agregar condición: si `this.useCards`, llamar `EPGCards.onFocus()`
- [ ] Mantener lógica tradicional si `epgCards === false`

#### 5.6 Modificar EPG.onEnter()
- [ ] Agregar condición: si `this.useCards`, llamar `EPGCards.onEnter()`
- [ ] Mantener lógica tradicional si `epgCards === false`

#### 5.7 Modificar EPG.hide() y EPG.reset()
- [ ] Agregar llamadas a `EPGCards.hide()` y `EPGCards.reset()` si aplica

**Entregables:**
- ✅ Integración completa con EPG principal
- ✅ Selector funcional basado en bandera
- ✅ Ambos modos funcionando independientemente

---

### FASE 6: CARGA DE ARCHIVOS ⏱️ ~30 min

#### 6.1 Agregar estructura HTML del modal
- [ ] Agregar HTML del modal en `index.html` (después de `#epgContainer`)
- [ ] Estructura completa del modal fullscreen
- [ ] Asegurar que esté oculto por defecto

#### 6.2 Agregar referencias en index.html
- [ ] Verificar cómo se cargan los módulos actualmente
- [ ] Agregar carga condicional de módulo EPGCards
- [ ] Agregar carga condicional de CSS epg-cards.css

**Opciones de carga:**
```html
<!-- Opción 1: Carga condicional en HTML -->
<script>
if (CONFIG.app.brands[CONFIG.app.brand].epgCards === true) {
    document.write('<script src="js/module/epg-cards/index.js"><\/script>');
    document.write('<link rel="stylesheet" href="assets/css/epg-cards.css">');
}
</script>

<!-- Opción 2: Carga dinámica desde JavaScript -->
```

#### 6.2 Crear index.js para exportación
- [ ] Crear archivo que carga todos los sub-módulos
- [ ] Asegurar orden correcto de carga
- [ ] Exportar EPGCards al scope global

**Entregables:**
- ✅ Archivos cargándose correctamente
- ✅ CSS aplicándose solo cuando es necesario

---

### FASE 7: TESTING Y AJUSTES ⏱️ ~2-3 horas

#### 7.1 Testing con epgCards: false
- [ ] Verificar que EPG tradicional funciona igual que antes
- [ ] Verificar navegación tradicional
- [ ] Verificar renderizado tradicional
- [ ] Verificar que no hay errores en consola

#### 7.2 Testing con epgCards: true
- [ ] Verificar que EPG cards se muestra correctamente
- [ ] Verificar renderizado de cards
- [ ] Verificar navegación entre cards
- [ ] Verificar navegación dentro de cards (botones, eventos)
- [ ] Verificar scroll automático
- [ ] Verificar foco inicial
- [ ] Verificar reproducción de canales
- [ ] Verificar integración con EPGDetails
- [ ] Verificar canales sin EPG

#### 7.3 Testing de integración
- [ ] Verificar que ambos modos no interfieren
- [ ] Verificar cambio de bandera (si es posible)
- [ ] Verificar que DataModel se comparte correctamente
- [ ] Verificar que EPGDetails funciona en ambos modos

#### 7.4 Ajustes y correcciones
- [ ] Corregir bugs encontrados
- [ ] Optimizar rendimiento si es necesario
- [ ] Ajustar estilos si es necesario

**Entregables:**
- ✅ Testing completo realizado
- ✅ Bugs corregidos
- ✅ Ambos modos funcionando correctamente

---

### FASE 8: LIMPIEZA Y DOCUMENTACIÓN ⏱️ ~1 hora

#### 8.1 Limpieza de código
- [ ] Eliminar código comentado
- [ ] Eliminar console.log de debug
- [ ] Optimizar código
- [ ] Verificar que no hay código duplicado

#### 8.2 Documentación
- [ ] Comentar código complejo
- [ ] Documentar API de EPGCards
- [ ] Documentar métodos principales
- [ ] Actualizar documentación de fases

#### 8.3 Limpieza de CSS
- [ ] Verificar que no hay estilos duplicados
- [ ] Organizar estilos en epg-cards.css
- [ ] Eliminar estilos de cards de epg.css (si aún existen)

**Entregables:**
- ✅ Código limpio y optimizado
- ✅ Documentación completa
- ✅ CSS organizado

---

## ORDEN DE EJECUCIÓN RECOMENDADO

1. **FASE 1**: Preparación y estructura (base sólida)
2. **FASE 2**: Módulo principal EPGCards (estructura base)
3. **FASE 3**: Render Engine (funcionalidad core)
4. **FASE 4**: Navigation Engine (interacción)
5. **FASE 5**: Integración (conectar todo)
6. **FASE 6**: Carga de archivos (hacer funcionar)
7. **FASE 7**: Testing (verificar que funciona)
8. **FASE 8**: Limpieza (pulir)

---

## CHECKLIST MASTER

### Estructura
- [ ] Directorios creados
- [ ] Archivos base creados
- [ ] HTML del modal agregado en index.html
- [ ] CSS organizado
- [ ] Estilos de modal fullscreen implementados

### Funcionalidad Core
- [ ] EPGCards.init() funcionando
- [ ] EPGCards.show() funcionando
- [ ] EPGCards.hide() funcionando
- [ ] EPGCards.draw() funcionando

### Renderizado
- [ ] Cards de canal renderizando
- [ ] Cards de eventos renderizando
- [ ] Carrusel funcionando
- [ ] Detalles expandidos funcionando
- [ ] Canales sin EPG funcionando
- [ ] Virtualización funcionando

### Navegación
- [ ] Navegación vertical funcionando
- [ ] Navegación horizontal funcionando
- [ ] Navegación desde botones funcionando
- [ ] Scroll automático funcionando
- [ ] Foco inicial funcionando

### Integración
- [ ] Selector de modo funcionando
- [ ] Modal se muestra correctamente (fullscreen)
- [ ] Modal se cierra correctamente (ESC, botón, etc.)
- [ ] EPG tradicional no afectado
- [ ] EPG cards funcionando independientemente en modal
- [ ] DataModel compartido correctamente
- [ ] EPGDetails funcionando en ambos modos
- [ ] Scroll del body prevenido cuando modal está abierto

### Testing
- [ ] Testing con epgCards: false completado
- [ ] Testing con epgCards: true completado
- [ ] Testing de integración completado
- [ ] Bugs corregidos

### Finalización
- [ ] Código limpio
- [ ] Documentación completa
- [ ] CSS organizado
- [ ] Sin errores en consola

---

## ESTIMACIÓN DE TIEMPO TOTAL

- **FASE 1**: ~30 min
- **FASE 2**: ~1 hora
- **FASE 3**: ~2-3 horas
- **FASE 4**: ~2 horas
- **FASE 5**: ~1 hora
- **FASE 6**: ~30 min
- **FASE 7**: ~2-3 horas
- **FASE 8**: ~1 hora

**Total estimado: ~10-12 horas de desarrollo**

---

## NOTAS IMPORTANTES

1. **No mezclar código**: Mantener cards completamente separado del tradicional
2. **Testing incremental**: Probar después de cada fase
3. **Usar documentación**: Referirse a `DOCUMENTACION_EPG_CARDS_IMPLEMENTADO.md` para código de referencia
4. **Navegación primero**: Asegurar que la navegación funcione correctamente desde el inicio
5. **Scroll optimizado**: Usar contenedor simple para mejor control de scroll
6. **Virtualización cuidadosa**: Expandir rango visible antes de navegar

---

## PRÓXIMOS PASOS INMEDIATOS

1. ✅ Revisar esta planificación
2. ⏭️ Comenzar con FASE 1: Preparación y estructura
3. ⏭️ Crear estructura de archivos
4. ⏭️ Mover estilos CSS

---

**Última actualización:** Después de reversión
**Estado:** Listo para comenzar implementación
