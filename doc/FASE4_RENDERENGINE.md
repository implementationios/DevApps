# FASE 4: RenderEngine Básico

**Estado:** ✅ Completada  
**Fecha:** 2026-01-13

## Objetivo

Crear el módulo `RenderEngine` que se encargará de la lógica de renderizado, inicialmente replicando el renderizado original sin cambios visuales.

## Cambios Implementados

### 1. Módulo RenderEngine

Se creó el objeto `RenderEngine` dentro de `public/js/module/epg.js` con los siguientes métodos:

#### `RenderEngine.init($container)`
- Inicializa el RenderEngine con referencias a los contenedores del EPG
- Recibe el contenedor principal (`#epgContainer`)
- Obtiene referencias a `#epgGrid`, `#epgHours`, `#epgChannels`
- Calcula `bodyFontSize` y establece `epgUnitName`
- Retorna `true` si se inicializó correctamente, `false` en caso contrario

#### `RenderEngine.render(channels)`
- Renderiza la EPG con los canales proporcionados
- Replica exactamente la lógica original de `EPG.draw()`
- Genera HTML para:
  - Encabezados de horas (`epgHoursHtml`)
  - Encabezados de canales (`epgChannelsHtml`)
  - Items de eventos EPG (`epgItemsHtml`)
- Calcula dimensiones y posicionamiento
- Agrega indicador de tiempo actual
- Configura eventos de scroll
- Actualiza el indicador de tiempo cada minuto

#### `RenderEngine.clear()`
- Limpia el renderizado del EPG
- Limpia los contenedores HTML
- Detiene el intervalo de actualización de tiempo

### 2. Integración en EPG.draw()

El método `EPG.draw()` ahora:
1. Inicializa `DataModel` (FASE 3)
2. Inicializa `RenderEngine`
3. Delega el renderizado a `RenderEngine.render()`
4. Sincroniza propiedades importantes de `RenderEngine` a `EPG` para compatibilidad:
   - `epgStartDate`
   - `epgMinuteWidth`
   - `epgUnitName`
   - `timeIntervalMinutes`
5. Calcula `scrollSizeJump` (necesario para navegación)

### 3. Integración en EPG.reset()

El método `EPG.reset()` ahora también llama a `RenderEngine.clear()` para limpiar el renderizado.

### 4. Accesibilidad Global (Desarrollo)

Tanto `DataModel` como `RenderEngine` están disponibles globalmente (`window.DataModel` y `window.RenderEngine`) para facilitar pruebas y depuración.

## Código Clave

```javascript
// RenderEngine se crea después de DataModel
var RenderEngine = {
  $epgGrid: null,
  $epgHours: null,
  $epgChannels: null,
  // ... propiedades ...

  init: function($container) { /* ... */ },
  render: function(channels) { /* ... */ },
  clear: function() { /* ... */ }
};

// EPG.draw() ahora delega a RenderEngine
draw: function(servicesWithEPG) {
  this.initializeValues();
  this.items = servicesWithEPG;
  
  DataModel.init(servicesWithEPG);
  
  if (!RenderEngine.init(this.$epgContainer)) {
    console.error('EPG.draw: No se pudo inicializar RenderEngine');
    return;
  }
  
  RenderEngine.render(servicesWithEPG);
  
  // Sincronizar propiedades para compatibilidad
  this.epgStartDate = RenderEngine.epgStartDate;
  this.epgMinuteWidth = RenderEngine.epgMinuteWidth;
  // ...
}
```

## Criterios de Éxito

✅ `RenderEngine` existe y sus métodos básicos funcionan  
✅ La EPG se renderiza exactamente igual que antes  
✅ No hay errores en consola  
✅ `RenderEngine` está accesible desde la consola para pruebas  
✅ `RenderEngine` utiliza los datos de `DataModel` (aunque por ahora recibe los canales directamente)

## Próximos Pasos

- **FASE 5**: Implementar renderizado virtualizado (solo canales visibles)
- **FASE 6**: Implementar diseño de cards con carrusel
- **FASE 7**: Implementar navegación O(1) usando DataModel
- **FASE 8**: Optimizaciones finales

## Notas

- El renderizado actual es idéntico al original, solo se movió la lógica a un módulo separado
- `RenderEngine` aún no usa `DataModel` directamente para obtener datos, pero está preparado para hacerlo en fases futuras
- Las propiedades importantes se sincronizan de `RenderEngine` a `EPG` para mantener compatibilidad con métodos existentes que dependen de ellas
