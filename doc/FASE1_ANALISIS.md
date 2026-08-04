# FASE 1: Análisis y Preparación

## 📋 Métodos Públicos del EPG usados por home.js

### Métodos identificados:
1. **`EPG.draw(servicesWithEPG)`** - Línea 404, 415
   - Recibe array de servicios con EPG
   - Renderiza la grilla EPG
   - **CRÍTICO**: No debe cambiar su firma

2. **`EPG.isEmpty()`** - Línea 391, 408
   - Retorna boolean indicando si EPG está vacía
   - **CRÍTICO**: Debe mantener comportamiento

3. **`EPG.isShowed()`** - Probablemente usado en otros lugares
   - Retorna boolean si EPG está visible
   - **CRÍTICO**: Debe mantener comportamiento

4. **`EPG.show()`** - Probablemente usado
   - Muestra la EPG
   - **CRÍTICO**: Debe mantener comportamiento

5. **`EPG.hide()`** - Probablemente usado
   - Oculta la EPG
   - **CRÍTICO**: Debe mantener comportamiento

6. **`EPG.navigate(direction)`** - Probablemente usado
   - Navega en la EPG
   - **CRÍTICO**: Debe mantener comportamiento

7. **`EPG.onFocus($el)`** - Probablemente usado
   - Maneja foco en elementos EPG
   - **CRÍTICO**: Debe mantener comportamiento

8. **`EPG.onEnter($el, callback)`** - Probablemente usado
   - Maneja Enter en elementos EPG
   - **CRÍTICO**: Debe mantener comportamiento

9. **`EPG.onReturn(callback)`** - Probablemente usado
   - Maneja Return/Back en EPG
   - **CRÍTICO**: Debe mantener comportamiento

10. **`EPG.reset()`** - Probablemente usado
    - Resetea estado de EPG
    - **CRÍTICO**: Debe mantener comportamiento

## 📊 Estructura de Datos

### `servicesWithEPG` (parámetro de `EPG.draw()`)
```javascript
[
  {
    id: 123,
    name: "Canal 1",
    lcn: 1,
    img: "url",
    epgStreamId: 456,
    epgItems: [
      {
        event_id: 789,
        start: "2026-01-10 19:00:00",
        end: "2026-01-10 19:30:00",
        startDate: moment(...), // Objeto moment
        endDate: moment(...),   // Objeto moment
        parentalRating: 5,
        imageUrl: "url",
        imageUrl2: "url",
        languages: [
          {
            lang: "eng",
            title: "Título",
            shortDescription: "Descripción corta",
            extendedDescription: "Descripción extendida"
          }
        ]
      }
    ]
  }
]
```

## 🔍 Flujo Actual

### 1. Carga Inicial (loading.js)
```
loading.js → AppData.getEPGByBouquet() → Guarda en AppData.services[i].epgItems
```

### 2. Home.activate()
```
home.js → getEPGData() → EPG.draw(servicesWithEPG)
```

### 3. Renderizado Actual
- El código actual en `epg.js` ya tiene mi implementación modificada
- Necesitamos restaurar el código original primero

## ⚠️ Problemas Identificados

1. **El código actual ya está modificado** - Necesitamos el original
2. **No hay backup claro** del código original
3. **La estructura HTML del renderizado original** no está clara

## ✅ Estado Actual

**✅ BUENAS NOTICIAS:** El código actual de `epg.js` es el **ORIGINAL** (no tiene DataModel ni RenderEngine)

Esto significa que podemos empezar desde cero con el plan de fases.

## 📝 Métodos Públicos Críticos (NO CAMBIAR FIRMA)

### Métodos usados por home.js:
1. `EPG.draw(servicesWithEPG)` - Líneas 404, 415
2. `EPG.isEmpty()` - Líneas 391, 408
3. `EPG.isShowed()` - Línea 481
4. `EPG.onFocus($el)` - Línea 482
5. `EPG.onReturn(callback)` - Línea 627
6. `EPG.onEnter($el, callback)` - Línea 1127
7. `EPG.navigate(direction)` - Línea 1544
8. `EPG.show()` - Línea 3003
9. `EPG.hide()` - Probablemente usado
10. `EPG.reset()` - Línea 286

## 📊 Estructura HTML Actual

El renderizado actual genera:
- `#epgHours` - Header con horas
- `#epgChannels` - Lista de canales
- `#epgGrid` - Grid con eventos (clase `.row` por canal)
- Cada evento tiene clases: `.epg-cell`, `.epg-channel-item`, `.focusable`
- Atributos data: `data-x`, `data-y`, `data-service-id`, `data-date`

## ✅ FASE 1 COMPLETADA

- [x] Código original identificado
- [x] Métodos públicos documentados
- [x] Estructura de datos documentada
- [x] Flujo actual documentado
- [x] Dependencias identificadas

## 🚀 Listo para FASE 2

Podemos proceder con la FASE 2: Crear DataModel básico que solo indexa datos sin cambiar renderizado.
