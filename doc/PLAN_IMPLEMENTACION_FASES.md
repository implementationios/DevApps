# Plan de Implementación por Fases - EPG V6 Diseño 2

## 🎯 Objetivo
Implementar "Alternativa 6 (Data-First Architecture) + Diseño 2 (Cards con Carrusel)" de manera incremental, probando cada fase antes de continuar.

---

## 📋 FASE 1: Análisis y Preparación
**Estado:** ⏳ Pendiente  
**Objetivo:** Entender completamente el código actual antes de hacer cambios

### Tareas:
- [ ] Revisar `public/js/module/epg.js` original (backup si es necesario)
- [ ] Documentar estructura de datos de `servicesWithEPG`
- [ ] Documentar cómo se llama `EPG.draw()` desde `home.js`
- [ ] Verificar qué métodos públicos usa `home.js` del EPG
- [ ] Identificar dependencias críticas (EPGDetails, Focus, etc.)
- [ ] Crear punto de restauración (commit/backup)

### Criterios de Éxito:
- ✅ Documentación completa del flujo actual
- ✅ Lista de métodos públicos que NO se pueden cambiar
- ✅ Backup del código original

---

## 📋 FASE 2: DataModel Básico
**Estado:** ⏳ Pendiente  
**Objetivo:** Crear módulo DataModel que solo indexa datos, SIN cambiar renderizado

### Tareas:
- [ ] Crear módulo `DataModel` interno en `epg.js`
- [ ] Implementar `DataModel.init(servicesWithEPG)` - solo guarda datos
- [ ] Implementar `DataModel.getChannel(index)` - retorna canal
- [ ] Implementar `DataModel.getEvent(channelIndex, eventIndex)` - retorna evento
- [ ] Implementar `DataModel.getChannelCount()` - retorna cantidad
- [ ] NO modificar `EPG.draw()` todavía
- [ ] NO modificar renderizado

### Criterios de Éxito:
- ✅ DataModel funciona correctamente
- ✅ No rompe funcionalidad existente
- ✅ Se puede acceder a datos desde DataModel

### Pruebas:
```javascript
// En consola después de cargar EPG:
DataModel.getChannel(0) // Debe retornar el primer canal
DataModel.getEvent(0, 0) // Debe retornar el primer evento del primer canal
DataModel.getChannelCount() // Debe retornar cantidad de canales
```

---

## 📋 FASE 3: Integración DataModel
**Estado:** ⏳ Pendiente  
**Objetivo:** Integrar DataModel en `EPG.draw()` manteniendo renderizado original

### Tareas:
- [ ] Modificar `EPG.draw()` para llamar `DataModel.init(servicesWithEPG)`
- [ ] Mantener TODO el renderizado original intacto
- [ ] Solo agregar inicialización de DataModel
- [ ] Verificar que EPG funciona exactamente igual que antes

### Criterios de Éxito:
- ✅ EPG se renderiza igual que antes
- ✅ No hay errores en consola
- ✅ DataModel está inicializado y accesible
- ✅ Navegación funciona normalmente

### Pruebas:
- [ ] Cargar EPG desde home
- [ ] Navegar en EPG (arriba, abajo, izquierda, derecha)
- [ ] Abrir detalles de evento
- [ ] Verificar que no hay errores

---

## 📋 FASE 4: RenderEngine Básico
**Estado:** ⏳ Pendiente  
**Objetivo:** Crear RenderEngine que renderiza igual que el original (sin diseño cards)

### Tareas:
- [ ] Crear módulo `RenderEngine` interno en `epg.js`
- [ ] Implementar `RenderEngine.init($container)` - guarda referencia al contenedor
- [ ] Implementar `RenderEngine.render()` - renderiza igual que el original
- [ ] Copiar lógica de renderizado original a RenderEngine
- [ ] Modificar `EPG.draw()` para usar RenderEngine en lugar de renderizado directo
- [ ] Mantener estructura HTML original

### Criterios de Éxito:
- ✅ EPG se renderiza exactamente igual que antes
- ✅ No hay cambios visuales
- ✅ Navegación funciona igual
- ✅ RenderEngine es independiente y testeable

### Pruebas:
- [ ] Comparar HTML generado (debe ser idéntico)
- [ ] Navegación funciona
- [ ] No hay errores

---

## 📋 FASE 5: Virtualización
**Estado:** ⏳ Pendiente  
**Objetivo:** Implementar renderizado virtualizado (solo canales visibles + buffer)

### Tareas:
- [ ] Modificar `RenderEngine.render()` para renderizar solo canales visibles
- [ ] Implementar cálculo de rango visible (ej: canales 0-6 si hay 7 visibles)
- [ ] Agregar buffer de canales (ej: +2 arriba, +2 abajo)
- [ ] Implementar re-renderizado cuando cambia el foco
- [ ] Mantener estructura HTML original (solo menos elementos)

### Criterios de Éxito:
- ✅ Solo se renderizan ~7-9 canales en lugar de todos
- ✅ Navegación funciona correctamente
- ✅ Al navegar, se re-renderiza cuando es necesario
- ✅ Rendimiento mejorado (menos DOM)

### Pruebas:
- [ ] Verificar cantidad de elementos DOM (debe ser mucho menor)
- [ ] Navegar arriba/abajo (debe re-renderizar suavemente)
- [ ] No debe haber lag o saltos visuales

---

## 📋 FASE 6: Diseño Cards
**Estado:** ⏳ Pendiente  
**Objetivo:** Implementar diseño de cards con carrusel horizontal

### Tareas:
- [ ] Crear CSS para cards de canal (`epg-channel-card`)
- [ ] Crear CSS para carrusel de eventos (`epg-events-carousel`)
- [ ] Crear CSS para cards de evento (`epg-event-card`)
- [ ] Modificar `RenderEngine.renderChannelCard()` para generar HTML de card
- [ ] Modificar `RenderEngine.renderEventCard()` para generar HTML de card
- [ ] Implementar expansión de card al enfocar (border, shadow, scale)
- [ ] Mantener funcionalidad de navegación

### Criterios de Éxito:
- ✅ Diseño visual moderno (cards estilo Netflix/Pluto TV)
- ✅ Carrusel horizontal de eventos por canal
- ✅ Expansión visual al enfocar
- ✅ Navegación sigue funcionando

### Pruebas:
- [ ] Verificar diseño visual
- [ ] Navegación funciona
- [ ] Cards se expanden al enfocar
- [ ] Carrusel se desplaza correctamente

---

## 📋 FASE 7: Navegación O(1)
**Estado:** ⏳ Pendiente  
**Objetivo:** Implementar navegación optimizada usando DataModel

### Tareas:
- [ ] Implementar `DataModel.buildNavigationGraph()` - precalcula navegación
- [ ] Implementar `DataModel.findEventAtTime()` - búsqueda O(1) usando timeSlots
- [ ] Modificar `EPG.navigate()` para usar DataModel en lugar de búsqueda por píxeles
- [ ] Implementar navegación vertical alineada por tiempo
- [ ] Optimizar navegación horizontal

### Criterios de Éxito:
- ✅ Navegación es instantánea (sin lag)
- ✅ Navegación vertical alinea por tiempo correctamente
- ✅ No usa `elementFromPoint` ni búsquedas costosas
- ✅ Rendimiento mejorado significativamente

### Pruebas:
- [ ] Navegación vertical rápida
- [ ] Alineación temporal correcta
- [ ] Sin lag o retrasos
- [ ] Benchmark de rendimiento (debe ser <50ms)

---

## 📋 FASE 8: Optimizaciones Finales
**Estado:** ⏳ Pendiente  
**Objetivo:** Pulir rendimiento, animaciones, y casos edge

### Tareas:
- [ ] Optimizar re-renderizado (solo cuando es necesario)
- [ ] Implementar DOM pooling (reutilizar elementos)
- [ ] Agregar animaciones suaves
- [ ] Manejar casos edge (canales sin EPG, eventos sin datos, etc.)
- [ ] Optimizar memoria
- [ ] Documentación final

### Criterios de Éxito:
- ✅ Rendimiento óptimo
- ✅ Sin memory leaks
- ✅ Animaciones suaves
- ✅ Manejo robusto de errores
- ✅ Documentación completa

### Pruebas:
- [ ] Pruebas de rendimiento
- [ ] Pruebas de memoria
- [ ] Pruebas de casos edge
- [ ] Pruebas de usabilidad

---

## 🔄 Flujo de Trabajo

1. **Completar FASE 1** → Revisar y aprobar
2. **Completar FASE 2** → Probar y aprobar
3. **Completar FASE 3** → Probar y aprobar
4. **Continuar con siguiente fase** solo si la anterior funciona perfectamente

## ⚠️ Reglas Importantes

- **NO avanzar a la siguiente fase si la actual tiene errores**
- **Cada fase debe mantener compatibilidad con el código existente**
- **Probar exhaustivamente antes de continuar**
- **Hacer commit/backup después de cada fase exitosa**

---

## 📝 Notas

- Si una fase falla, **detener** y analizar el problema antes de continuar
- Cada fase debe ser **independiente** y **reversible**
- Mantener **compatibilidad total** con `home.js` y otros módulos
