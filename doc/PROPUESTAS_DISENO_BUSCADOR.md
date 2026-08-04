# Propuestas de diseño para el buscador (EPG)

Contexto: el buscador actual ya usa `#searchInput` (teclado del dispositivo) y agrupa resultados por tipo (Servicios/VOD/Catchup). Este documento propone **3 alternativas de diseño/UX** para mejorar la experiencia, manteniendo compatibilidad con control remoto (focus + navegación en grilla).

Archivos principales del módulo:
- `public/index.html` (markup del panel `#searchContainer`)
- `public/assets/css/search.css` (estilos del buscador)
- `public/js/scene/home.js` (eventos, render de resultados, navegación/focus)
- `public/js/module/SearchManager.js` (lógica de búsqueda y relevancia)

---

## Objetivos UX (comunes)

- **Rapidez**: escribir → ver resultados al instante (debounce ya existe en `SearchManager`).
- **Claridad**: entender *qué tipo* de contenido estoy viendo (Servicios/VOD/Catchup).
- **Control remoto friendly**: navegación predecible (arriba/abajo/izq/der + enter + back).
- **No bloquear el usuario**: buenos estados “vacío” y “sin resultados”.
- **Performance**: render eficiente (DocumentFragment, evitar reflows).

---

## Propuesta 1 — “Búsqueda rápida” (minimalista)

### Idea
Eliminar el panel izquierdo y maximizar el área de resultados. Una sola barra superior con input y acciones.

### Cambios de UI
- Barra superior (full width):
  - ícono buscar + `#searchInput` + botón cerrar + contador (“12 resultados”).
- Resultados ocupan casi toda la pantalla en grilla (6 columnas como base).
- Secciones (Servicios/VOD/Catchup) **plegables** (colapsar/expandir).

### Estados UX
- Vacío: “Escribe para buscar” + sugerencias (chips).
- Sin resultados: sugerencias (“prueba sin tildes”, “prueba por número de canal”).

### Navegación
- `Down/Right` desde el input → primer resultado disponible.
- `Up` en primera fila → input.
- `Left` desde primera columna → input.
- Colapsar/expandir sección: opción con tecla (p.ej. `Enter` sobre header o tecla de color).

### Pros / Contras
- **Pros**: máxima visibilidad de resultados, más rápido, menos scroll.
- **Contras**: requiere definir interacción para plegado (y cuidado con headers no-focusables).

### Implementación (resumen)
- `index.html`: reacomodar layout (eliminar columna izquierda).
- `search.css`: header sticky + grilla más amplia.
- `home.js`: render de headers con contadores + lógica de colapsado + navegación.

---

## Propuesta 2 — “Tabs por tipo” (muy friendly para control remoto)

### Idea
Agregar una fila de filtros focusables (tabs) debajo del input:
**Todos | Servicios | VOD | Catchup**.

### Cambios de UI
- Mantener input arriba.
- Debajo, tabs:
  - `Todos` (muestra agrupado por secciones como ahora)
  - cada tipo muestra **solo ese tipo** (sin headers), en la misma grilla.

### Navegación
- `Left/Right` en tabs cambia de tab.
- `Down` desde tabs/input va al primer resultado.
- `Up` desde resultados vuelve a tabs/input.

### Pros / Contras
- **Pros**: reduce ruido visual, navegación más simple, menos saltos entre tipos.
- **Contras**: hay que decidir el comportamiento en “Todos” vs tabs (persistencia del foco).

### Implementación (resumen)
- `index.html`: agregar contenedor de tabs (div con botones focusables).
- `search.css`: estilos de tabs + estado activo/focus.
- `home.js`:
  - estado `activeTab`
  - render condicional (filtrar por tipo)
  - navegación: input/tabs/resultados

---

## Propuesta 3 — “Sugerencias e historial” (descubrir y reenganchar)

### Idea
Cuando el query está vacío (o muy corto), mostrar una zona de **sugerencias** que ayude a buscar más rápido:
- **Historial de búsquedas** (últimas 5–10)
- **Búsquedas sugeridas** (chips como “101”, “Deportes”, “Noticias”, “Acción”)
- Opcional: “Continuar viendo” (si ya existe esa data en otro módulo)

### Cambios de UI
- Debajo del input (o debajo de tabs si existen), un bloque “chips” con sugerencias.
- Si el query está vacío: se ven sugerencias; si el usuario escribe: se ocultan y aparecen resultados.
- Opción de borrar historial.

### Navegación
- Los chips pueden ser focusables (grid simple).
- `Enter` sobre chip: rellena el input con ese texto y lanza búsqueda.
- `Back/Escape`: cierra el buscador (como hoy).

### Pros / Contras
- **Pros**: acelera búsquedas frecuentes; mejora UX sin complicar resultados.
- **Contras**: requiere almacenar historial (Storage) y definir lista de sugerencias por marca/cliente.

### Implementación (resumen)
- `index.html`: agregar contenedor `searchSuggestions` (chips).
- `search.css`: estilos de chips + estados de focus.
- `home.js`:
  - guardar `query` en historial al seleccionar un resultado
  - render condicional: si query vacío → sugerencias; si no → resultados
  - integrar con `Storage` para persistir historial

---

## Orden sugerido para probar (uno a uno)

1. **Propuesta 1 (Minimalista)**: buena si la prioridad es velocidad y espacio para resultados.
2. **Propuesta 2 (Tabs)**: suele dar el mayor salto de usabilidad con el menor riesgo.
3. **Propuesta 3 (Sugerencias/Historial)**: mejora el arranque del buscador y re-búsquedas.

---

## Checklist de validación (para cada propuesta)

- El teclado del dispositivo escribe en `#searchInput` correctamente.
- `Back/Escape` cierra el buscador sin romper el foco general.
- `Enter` en resultado abre/reproduce según tipo.
- Navegación con flechas no “se pierde” (siempre hay un destino claro).
- Render performance estable con listas grandes (sin lag perceptible).
- Estados vacíos y sin resultados claros y traducibles (i18n).

