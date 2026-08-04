# Propuestas de Diseño para EPG Optimizado

## 📋 Contexto

Las alternativas técnicas seleccionadas (Alt. 1 - Virtualización y Alt. 6 - Data-First) mantienen el diseño de grilla tradicional, el cual presenta los siguientes problemas reportados por clientes:

### ❌ Problemas del Diseño Actual

1. **Eventos no se aprecian bien**
   - Títulos truncados
   - Información poco legible
   - Colores poco contrastantes

2. **Apariencia desordenada**
   - Mucha información en poco espacio
   - Falta jerarquía visual
   - Difícil de escanear rápidamente

3. **Eventos cortos son invisibles**
   - Eventos de <30 min son casi imposibles de ver
   - No se puede leer el título
   - Difícil de enfocar

---

## 🎨 DISEÑO 1: Timeline Vertical Moderna (Estilo Netflix/Apple TV)

### Concepto

Lista vertical de canales con timeline horizontal expandible. Enfoque en el "ahora" con eventos futuros visibles al desplazar.

### Características Principales

- **Vista compacta por defecto:** Solo muestra evento actual y próximo
- **Expansión on-demand:** Al enfocar, muestra timeline completa del canal
- **Información clara:** Títulos completos, descripciones, ratings
- **Eventos cortos visibles:** Diseño adaptativo con íconos y badges

### Mockup Visual (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📺 GUÍA DE PROGRAMACIÓN                                    🕐 20:30 PM  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ 📺 001  HBO                                                          ││
│ │ ┌────────────────────────────────┬──────────────────────────────────┤│
│ │ │ 🔴 AHORA 8:00 PM - 9:30 PM     │ ⏭️ DESPUÉS 9:30 PM - 11:00 PM    ││
│ │ │ Game of Thrones S08E03  [+18]  │ Westworld S03E05  [+16]          ││
│ │ │ ████████████████░░░░░░ 70%     │ La batalla final por Westeros   ││
│ │ └────────────────────────────────┴──────────────────────────────────┤│
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ 📺 002  ESPN                                                         ││
│ │ ┌────────────────────────────────┬──────────────────────────────────┤│
│ │ │ 🔴 AHORA 8:00 PM - 10:00 PM    │ ⏭️ DESPUÉS 10:00 PM - 11:00 PM   ││
│ │ │ Champions League: PSG vs MAN   │ SportsCenter                    ││
│ │ │ ████████░░░░░░░░░░░░░ 40%      │ Resumen del día deportivo       ││
│ │ └────────────────────────────────┴──────────────────────────────────┤│
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ ▶️ 003  Discovery Channel    [ENFOCADO - EXPANDIDO]                 ││
│ │ ┌─────────────────────────────────────────────────────────────────┐ ││
│ │ │                          TIMELINE COMPLETA                        │ ││
│ │ ├──────────┬──────────────┬────────────────┬──────────────────────┤ ││
│ │ │ 6:00 PM  │  🔴 8:00 PM  │   9:00 PM      │   10:00 PM           │ ││
│ │ │ Noticias │  How It's    │   MythBusters  │   Gold Rush          │ ││
│ │ │ Locales  │  Made        │   2 hrs        │   1 hr               │ ││
│ │ │ [+12]    │  [ACTUAL]    │   [+12]        │   [+12]              │ ││
│ │ └──────────┴──────────────┴────────────────┴──────────────────────┘ ││
│ │   📝 How It's Made - Season 15, Ep 3                                ││
│ │   🕐 Inició hace 30 minutos • Quedan 30 minutos                     ││
│ │   ⭐ 8.5/10  |  [+12]  |  📺 Documentales                           ││
│ │   Descubre cómo se fabrican guitarras eléctricas...                 ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ 📺 004  National Geographic                                          ││
│ │ ┌────────────────────────────────┬──────────────────────────────────┤│
│ │ │ 🔴 AHORA 7:30 PM - 9:00 PM     │ ⏭️ DESPUÉS 9:00 PM - 10:30 PM    ││
│ │ │ Wild Africa  [+10]              │ Ocean Mysteries  [+10]          ││
│ │ │ ███████████████████░░ 90%       │ Los secretos del mar profundo   ││
│ │ └────────────────────────────────┴──────────────────────────────────┤│
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Características de Diseño

#### 1. Vista Compacta (No enfocado)
```css
.epg-channel-compact {
  display: flex;
  flex-direction: column;
  padding: 1em;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  border-radius: 0.5em;
  margin-bottom: 0.5em;
  transition: all 0.3s ease;
}

.epg-channel-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.8em;
}

.epg-channel-logo {
  width: 4em;
  height: 4em;
  border-radius: 0.3em;
  margin-right: 1em;
}

.epg-channel-info {
  display: flex;
  gap: 1em;
}

.epg-event-now {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  padding: 1em;
  border-radius: 0.3em;
  border-left: 0.3em solid #ff4444;
}

.epg-event-next {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  padding: 1em;
  border-radius: 0.3em;
  border-left: 0.3em solid #888;
}

.epg-event-title {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 0.3em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.epg-event-time {
  font-size: 0.9em;
  color: #aaa;
  margin-bottom: 0.5em;
}

.epg-progress-bar {
  width: 100%;
  height: 0.4em;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0.2em;
  overflow: hidden;
}

.epg-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4444, #ff8844);
  border-radius: 0.2em;
  transition: width 0.3s ease;
}
```

#### 2. Vista Expandida (Enfocado)
```css
.epg-channel-expanded {
  padding: 1.5em;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 0.3em solid #00d4ff;
  border-radius: 0.5em;
  box-shadow: 0 0 2em rgba(0, 212, 255, 0.5);
  transform: scale(1.02);
  transition: all 0.3s ease;
}

.epg-timeline-extended {
  display: flex;
  gap: 0.5em;
  margin-bottom: 1em;
  overflow-x: auto;
  padding: 1em;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0.3em;
}

.epg-timeline-event {
  min-width: 12em;
  padding: 1em;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.3em;
  text-align: center;
  transition: all 0.2s ease;
}

.epg-timeline-event.current {
  background: linear-gradient(135deg, #ff4444, #ff8844);
  transform: scale(1.1);
  box-shadow: 0 0 1em rgba(255, 68, 68, 0.5);
}

.epg-event-details {
  padding: 1em;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.3em;
}

.epg-event-details-title {
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 0.5em;
}

.epg-event-details-meta {
  display: flex;
  gap: 1em;
  margin-bottom: 1em;
  font-size: 0.9em;
  color: #aaa;
}

.epg-event-details-description {
  line-height: 1.5;
  color: #ccc;
}
```

#### 3. Manejo de Eventos Cortos
```css
/* Eventos de menos de 30 minutos */
.epg-event-short {
  min-width: 4em !important;
  padding: 0.5em;
}

.epg-event-short .epg-event-title {
  font-size: 0.8em;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

/* Eventos muy cortos (menos de 15 min) - mostrar como badge */
.epg-event-very-short {
  min-width: 2em !important;
  padding: 0.3em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.epg-event-very-short::before {
  content: "•";
  font-size: 2em;
  color: #ff4444;
}

/* Tooltip para eventos cortos */
.epg-event-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.95);
  padding: 1em;
  border-radius: 0.3em;
  box-shadow: 0 0 1em rgba(0, 0, 0, 0.8);
  z-index: 1000;
  min-width: 20em;
  display: none;
}

.epg-event-short:focus .epg-event-tooltip,
.epg-event-very-short:focus .epg-event-tooltip {
  display: block;
}
```

### Ventajas del Diseño 1

✅ **Eventos claramente visibles**
- Títulos completos sin truncar
- Información jerárquica
- Colores diferenciados (actual vs próximo)

✅ **Organización visual**
- Layout limpio y espaciado
- Información agrupada lógicamente
- Fácil de escanear

✅ **Eventos cortos manejados**
- Tooltip con información completa
- Indicadores visuales (puntos, badges)
- Texto vertical para espacios estrechos

✅ **Progreso visual**
- Barra de progreso del evento actual
- Indicador "Quedan X minutos"
- Estado claro (ahora/después)

✅ **Expansión contextual**
- Timeline completa solo cuando se necesita
- Detalles del programa al enfocar
- Navegación fluida

### Implementación con Alt. 1 o Alt. 6

```javascript
// Compatible con arquitectura virtualizada
EPG.renderChannelCompact = function(channel, channelIndex) {
  var currentEvent = this.getCurrentEvent(channel);
  var nextEvent = this.getNextEvent(channel, currentEvent);
  
  var html = '<div class="epg-channel-compact focusable" data-channel="' + channelIndex + '">';
  
  // Header
  html += '<div class="epg-channel-header">';
  html += '<img class="epg-channel-logo" src="' + channel.img + '" />';
  html += '<span class="epg-channel-number">' + channel.lcn + '</span>';
  html += '<span class="epg-channel-name">' + channel.name + '</span>';
  html += '</div>';
  
  // Events
  html += '<div class="epg-channel-info">';
  
  // Current event
  if (currentEvent) {
    var progress = this.calculateProgress(currentEvent);
    html += '<div class="epg-event-now">';
    html += '<div class="epg-event-badge">🔴 AHORA</div>';
    html += '<div class="epg-event-time">' + this.formatTime(currentEvent.startDate) + ' - ' + this.formatTime(currentEvent.endDate) + '</div>';
    html += '<div class="epg-event-title">' + currentEvent.languages[0].title + '</div>';
    html += '<div class="epg-progress-bar"><div class="epg-progress-fill" style="width: ' + progress + '%"></div></div>';
    html += '</div>';
  }
  
  // Next event
  if (nextEvent) {
    html += '<div class="epg-event-next">';
    html += '<div class="epg-event-badge">⏭️ DESPUÉS</div>';
    html += '<div class="epg-event-time">' + this.formatTime(nextEvent.startDate) + ' - ' + this.formatTime(nextEvent.endDate) + '</div>';
    html += '<div class="epg-event-title">' + nextEvent.languages[0].title + '</div>';
    html += '</div>';
  }
  
  html += '</div>';
  html += '</div>';
  
  return html;
};

EPG.renderChannelExpanded = function(channel, channelIndex) {
  var html = '<div class="epg-channel-expanded">';
  
  // Timeline extendida
  html += '<div class="epg-timeline-extended">';
  channel.epgItems.slice(0, 6).forEach(function(event, idx) {
    var isCurrent = this.isCurrentEvent(event);
    html += '<div class="epg-timeline-event ' + (isCurrent ? 'current' : '') + '">';
    html += '<div class="epg-timeline-time">' + this.formatTime(event.startDate) + '</div>';
    html += '<div class="epg-timeline-title">' + event.languages[0].title + '</div>';
    html += '<div class="epg-timeline-duration">' + this.getDuration(event) + '</div>';
    html += '</div>';
  }, this);
  html += '</div>';
  
  // Detalles del evento actual
  var currentEvent = this.getCurrentEvent(channel);
  if (currentEvent) {
    html += '<div class="epg-event-details">';
    html += '<div class="epg-event-details-title">' + currentEvent.languages[0].title + '</div>';
    html += '<div class="epg-event-details-meta">';
    html += '<span>⏰ ' + this.getRemainingTime(currentEvent) + '</span>';
    html += '<span>⭐ 8.5/10</span>';
    html += '<span>[+' + currentEvent.parentalRating + ']</span>';
    html += '</div>';
    html += '<div class="epg-event-details-description">' + (currentEvent.languages[0].extendedDescription || '') + '</div>';
    html += '</div>';
  }
  
  html += '</div>';
  return html;
};
```

---

## 🎨 DISEÑO 2: Cards con Vista de Carrusel (Estilo Pluto TV)

### Concepto

Cada canal es una card horizontal con carrusel de eventos. Enfoque en imágenes y visualización rica.

### Mockup Visual (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📺 GUÍA DE PROGRAMACIÓN                       🔍 Buscar    🕐 20:30 PM  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│ ┃ 📺 001  HBO                                                          ┃│
│ ┃ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  ┃│
│ ┃ │ ▶️ LIVE  │ │  8:30 PM │ │  9:00 PM │ │ 10:00 PM │ │ 11:00 PM │  ┃│
│ ┃ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │  ┃│
│ ┃ │ │ GOT  │ │ │ │ NEWS │ │ │ │MOVIE │ │ │ │SERIES│ │ │ │SPORT │ │  ┃│
│ ┃ │ │ [+18]│ │ │ │ [+12]│ │ │ │ [+16]│ │ │ │ [+14]│ │ │ │ [+10]│ │  ┃│
│ ┃ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │  ┃│
│ ┃ │ Game of  │ │ Evening  │ │ The Dark │ │ West     │ │ UFC 264  │  ┃│
│ ┃ │ Thrones  │ │ News     │ │ Knight   │ │ World    │ │ Main     │  ┃│
│ ┃ │ S08 E03  │ │ Edition  │ │ Returns  │ │ S03 E05  │ │ Event    │  ┃│
│ ┃ │ ⏰ 70%   │ │ 15 min   │ │ 30 min   │ │ 1 hr     │ │ 2 hrs    │  ┃│
│ ┃ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  ┃│
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛│
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ 📺 002  ESPN                                                         ││
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  ││
│ │ │ ▶️ LIVE  │ │  9:00 PM │ │ 10:00 PM │ │ 11:00 PM │ │ 12:00 AM │  ││
│ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │  ││
│ │ │ │⚽ UCL │ │ │ │📊POST│ │ │ │🏀 NBA│ │ │ │📺 SC │ │ │ │⚾ MLB│ │  ││
│ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │  ││
│ │ │ PSG vs   │ │ Post     │ │ Lakers   │ │ Sports   │ │ Yankees  │  ││
│ │ │ Man City │ │ Match    │ │ vs Heat  │ │ Center   │ │ vs Red   │  ││
│ │ │ FINAL    │ │ Analysis │ │ Game 5   │ │ Tonight  │ │ Sox      │  ││
│ │ │ ⏰ 40%   │ │ 30 min   │ │ 1 hr     │ │ 1 hr     │ │ 2 hrs    │  ││
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│ ┃ ▶️ 003  Discovery    [ENFOCADO - DETALLES COMPLETOS]                ┃│
│ ┃                                                                      ┃│
│ ┃ ┌─────────────────┐  ┌────────────────────────────────────────────┐┃│
│ ┃ │                 │  │ How It's Made - Season 15, Episode 3       │┃│
│ ┃ │   ┌─────────┐   │  │                                            │┃│
│ ┃ │   │         │   │  │ 🕐 8:00 PM - 9:00 PM                       │┃│
│ ┃ │   │  CÓMO   │   │  │ ⏰ Inició hace 30 min • Quedan 30 min      │┃│
│ ┃ │   │   SE    │   │  │                                            │┃│
│ ┃ │   │  HACE   │   │  │ ⭐ 8.5/10  |  [+12]  |  📺 Documentales    │┃│
│ ┃ │   │         │   │  │                                            │┃│
│ ┃ │   └─────────┘   │  │ Descubre los secretos detrás de la         │┃│
│ ┃ │                 │  │ fabricación de guitarras eléctricas, desde  │┃│
│ ┃ │   [IMAGEN]      │  │ la selección de la madera hasta el acabado │┃│
│ ┃ │                 │  │ final. Visita la fábrica Fender...         │┃│
│ ┃ │  ████████░░░░   │  │                                            │┃│
│ ┃ │    70% visto    │  │ [▶️ Ver desde inicio]  [⏭️ Próximo evento] │┃│
│ ┃ └─────────────────┘  └────────────────────────────────────────────┘┃│
│ ┃                                                                      ┃│
│ ┃ PRÓXIMOS EVENTOS:                                                    ┃│
│ ┃ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               ┃│
│ ┃ │  9:00 PM │ │ 10:00 PM │ │ 11:00 PM │ │ 12:00 AM │               ┃│
│ ┃ │ Myth     │ │ Gold     │ │ Street   │ │ Deadliest│               ┃│
│ ┃ │ Busters  │ │ Rush     │ │ Outlaws  │ │ Catch    │               ┃│
│ ┃ │ 2 hrs    │ │ 1 hr     │ │ 1 hr     │ │ 1 hr     │               ┃│
│ ┃ └──────────┘ └──────────┘ └──────────┘ └──────────┘               ┃│
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Código CSS para Diseño 2

```css
/* Card de canal */
.epg-channel-card {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  border-radius: 1em;
  padding: 1.5em;
  margin-bottom: 1em;
  transition: all 0.3s ease;
}

.epg-channel-card:focus {
  border: 0.3em solid #3498db;
  box-shadow: 0 0 3em rgba(52, 152, 219, 0.5);
  transform: scale(1.02);
}

/* Carrusel de eventos */
.epg-events-carousel {
  display: flex;
  gap: 1em;
  overflow-x: auto;
  padding: 1em 0;
  scroll-behavior: smooth;
}

/* Card de evento individual */
.epg-event-card {
  min-width: 12em;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.5em;
  padding: 1em;
  text-align: center;
  transition: all 0.2s ease;
  cursor: pointer;
}

.epg-event-card:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-0.5em);
}

.epg-event-card.live {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  border: 0.2em solid #fff;
}

/* Imagen del evento */
.epg-event-image {
  width: 100%;
  height: 8em;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0.3em;
  margin-bottom: 0.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3em;
  position: relative;
}

.epg-event-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.3em;
}

/* Badge de rating */
.epg-event-rating {
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  background: rgba(0, 0, 0, 0.8);
  padding: 0.3em 0.6em;
  border-radius: 0.3em;
  font-size: 0.6em;
  font-weight: bold;
}

/* Título del evento */
.epg-event-card-title {
  font-size: 1em;
  font-weight: bold;
  margin-bottom: 0.3em;
  line-height: 1.2;
  height: 2.4em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Metadata del evento */
.epg-event-card-meta {
  font-size: 0.8em;
  color: #aaa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Evento corto - Badge compacto */
.epg-event-card-short {
  min-width: 4em;
  padding: 0.5em;
}

.epg-event-card-short .epg-event-image {
  height: 4em;
  font-size: 1.5em;
}

.epg-event-card-short .epg-event-card-title {
  font-size: 0.8em;
  height: auto;
  -webkit-line-clamp: 1;
}

/* Detalles expandidos al enfocar */
.epg-channel-card-expanded {
  padding: 2em;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.epg-event-details-large {
  display: flex;
  gap: 2em;
  margin-bottom: 2em;
}

.epg-event-poster {
  width: 15em;
  height: 20em;
  border-radius: 0.5em;
  overflow: hidden;
  position: relative;
}

.epg-event-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.epg-event-progress-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3em;
  background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9em;
}

.epg-event-info-large {
  flex: 1;
}

.epg-event-info-title {
  font-size: 2em;
  font-weight: bold;
  margin-bottom: 0.5em;
}

.epg-event-info-meta {
  display: flex;
  gap: 1.5em;
  margin-bottom: 1em;
  font-size: 1em;
  color: #aaa;
}

.epg-event-info-description {
  line-height: 1.6;
  color: #ccc;
  margin-bottom: 1em;
}

.epg-event-actions {
  display: flex;
  gap: 1em;
}

.epg-action-button {
  padding: 0.8em 1.5em;
  background: linear-gradient(135deg, #3498db, #2980b9);
  border: none;
  border-radius: 0.3em;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.epg-action-button:hover {
  transform: translateY(-0.2em);
  box-shadow: 0 0.5em 1em rgba(52, 152, 219, 0.3);
}
```

### Manejo de Eventos Cortos en Diseño 2

```javascript
EPG.renderEventCard = function(event, isLive, isFocused) {
  var duration = this.getDurationMinutes(event);
  var isShort = duration < 30;
  var isVeryShort = duration < 15;
  
  var cardClass = 'epg-event-card';
  if (isLive) cardClass += ' live';
  if (isShort) cardClass += ' epg-event-card-short';
  if (isFocused) cardClass += ' focused';
  
  var html = '<div class="' + cardClass + '">';
  
  // Imagen o ícono
  html += '<div class="epg-event-image">';
  if (event.imageUrl && !isVeryShort) {
    html += '<img src="' + event.imageUrl + '" />';
  } else {
    // Ícono según categoría
    var icon = this.getCategoryIcon(event.category);
    html += icon;
  }
  html += '<span class="epg-event-rating">[+' + event.parentalRating + ']</span>';
  html += '</div>';
  
  // Título (adaptado según tamaño)
  html += '<div class="epg-event-card-title">';
  if (isVeryShort) {
    html += this.truncate(event.languages[0].title, 8);
  } else if (isShort) {
    html += this.truncate(event.languages[0].title, 20);
  } else {
    html += event.languages[0].title;
  }
  html += '</div>';
  
  // Metadata
  html += '<div class="epg-event-card-meta">';
  html += '<span>' + this.formatTime(event.startDate) + '</span>';
  if (isLive) {
    html += '<span>⏰ ' + this.calculateProgress(event) + '%</span>';
  } else {
    html += '<span>' + duration + ' min</span>';
  }
  html += '</div>';
  
  html += '</div>';
  return html;
};
```

### Ventajas del Diseño 2

✅ **Visual y atractivo**
- Imágenes destacadas
- Cards con profundidad
- Colores vivos

✅ **Carrusel intuitivo**
- Scroll horizontal natural
- Vista de múltiples eventos
- Fácil exploración

✅ **Eventos cortos con íconos**
- Íconos por categoría (⚽🎬📰🎵)
- Cards compactas pero legibles
- Tooltip en hover/foco

✅ **Información rica**
- Detalles completos al enfocar
- Progreso visual claro
- Acciones directas

---

## 🎨 DISEÑO 3: Mini-Grilla Inteligente (Híbrido Optimizado)

### Concepto

Grilla compacta mejorada con agrupación inteligente, colores por categoría y zoom contextual.

### Mockup Visual (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📺 EPG  │  🎬 Movies  │  📰 News  │  ⚽ Sports  │  🎵 Music  │  🔍     │
├─────────┴──────────────────────────────────────────────────────────────┤
│                                                                         │
│      │   7:30    8:00    8:30    9:00    9:30   10:00   10:30   11:00│
│ ─────┼────────────────────────────────────────────────────────────────│
│      │                                                                 │
│ HBO  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│  1   │  Game of Thrones S08E03  [+18]        │  Westworld S03E05    │
│      │  ████████████████░░░░░░ 70%            │  [+16]               │
│ ─────┼────────────────────────────────────────────────────────────────│
│      │                                                                 │
│ ESPN │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│  2   │  ⚽ Champions: PSG vs Man City        │  📊 SportsCenter      │
│      │  ████████░░░░░░░░░░░░░ 40%            │  Nightly              │
│ ─────┼────────────────────────────────────────────────────────────────│
│      │                                                                 │
│ DISC │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│  3   │ ▶️ How It's Made     │  MythBusters Reloaded                 │
│ [+]  │   [ACTUAL 70%]       │  2 episodes                           │
│ ─────┼────────────────────────────────────────────────────────────────│
│      │                    VISTA EXPANDIDA                             │
│      ├────────────────────────────────────────────────────────────────│
│      │ ┌──────────────────────────────────────────────────────────┐  │
│      │ │ 🔍 How It's Made - Season 15, Episode 3                  │  │
│      │ │                                                           │  │
│      │ │ 🕐 8:00 PM - 9:00 PM  •  ⏰ Quedan 30 min  •  ⭐ 8.5/10  │  │
│      │ │ [+12]  •  📺 Documentales  •  🎬 Reality TV               │  │
│      │ │                                                           │  │
│      │ │ Descubre los secretos de fabricación de guitarras        │  │
│      │ │ eléctricas, desde la selección de madera hasta el        │  │
│      │ │ acabado. Visita la legendaria fábrica Fender...          │  │
│      │ │                                                           │  │
│      │ │ [▶️ Ver desde inicio]  [⏭️ Siguiente]  [ℹ️ Más info]     │  │
│      │ └──────────────────────────────────────────────────────────┘  │
│      │                                                                 │
│      │ PRÓXIMOS EN DISCOVERY:                                          │
│      │ ├─────────────┬──────────────┬──────────────┬──────────────┤  │
│      │ │  9:00 PM    │  11:00 PM    │  12:00 AM    │  1:00 AM     │  │
│      │ │ MythBusters │  Gold Rush   │  Outlaws     │  Deadliest   │  │
│      │ │ 2 hrs       │  1 hr        │  1 hr        │  Catch       │  │
│      │ └─────────────┴──────────────┴──────────────┴──────────────┘  │
│ ─────┼────────────────────────────────────────────────────────────────│
│      │                                                                 │
│ NAT  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ GEO  │  Wild Africa [+10]           │  Ocean Mysteries [+10]        │
│  4   │  ███████████████████░░ 90%   │  Los secretos del mar...      │
│ ─────┼────────────────────────────────────────────────────────────────│
│                                                                         │
│ ⬆️ Anterior  |  🔄 Actualizar  |  ⏱️ Live  |  📋 Favoritos  |  ⬇️ Más │
└─────────────────────────────────────────────────────────────────────────┘
```

### Características de Diseño 3

#### 1. Grilla Compacta con Colores por Categoría

```css
/* Grilla base */
.epg-grid-smart {
  display: grid;
  grid-template-columns: 10em 1fr;
  gap: 0.2em;
  background: #1a1a2e;
}

/* Colores por categoría */
.epg-event-movie {
  background: linear-gradient(90deg, #8e44ad, #9b59b6);
}

.epg-event-sports {
  background: linear-gradient(90deg, #27ae60, #2ecc71);
}

.epg-event-news {
  background: linear-gradient(90deg, #c0392b, #e74c3c);
}

.epg-event-documentary {
  background: linear-gradient(90deg, #2980b9, #3498db);
}

.epg-event-music {
  background: linear-gradient(90deg, #e67e22, #f39c12);
}

.epg-event-kids {
  background: linear-gradient(90deg, #e91e63, #ff4081);
}

/* Evento en grilla */
.epg-grid-event {
  position: absolute;
  padding: 0.5em;
  border-radius: 0.2em;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 0.1em solid rgba(255, 255, 255, 0.1);
}

.epg-grid-event:hover {
  transform: scale(1.05);
  z-index: 100;
  box-shadow: 0 0.5em 1em rgba(0, 0, 0, 0.5);
}

.epg-grid-event.current {
  border: 0.2em solid #fff;
  box-shadow: 0 0 1em rgba(255, 255, 255, 0.5);
}

/* Título del evento */
.epg-grid-event-title {
  font-size: 0.9em;
  font-weight: bold;
  margin-bottom: 0.2em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Rating badge */
.epg-grid-event-rating {
  display: inline-block;
  background: rgba(0, 0, 0, 0.6);
  padding: 0.1em 0.3em;
  border-radius: 0.2em;
  font-size: 0.7em;
  margin-right: 0.3em;
}

/* Progreso en evento actual */
.epg-grid-event-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 0.3em;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 0 0 0.2em 0.2em;
  transition: width 1s ease;
}
```

#### 2. Manejo Inteligente de Eventos Cortos

```css
/* Evento corto (< 30 min) */
.epg-grid-event-short {
  min-width: 3em;
}

.epg-grid-event-short .epg-grid-event-title {
  font-size: 0.7em;
  writing-mode: vertical-lr;
  text-orientation: mixed;
  white-space: normal;
  max-height: 100%;
}

/* Evento muy corto (< 15 min) - Indicador compacto */
.epg-grid-event-very-short {
  min-width: 1.5em;
  padding: 0.2em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.epg-grid-event-very-short .epg-grid-event-title {
  display: none;
}

.epg-grid-event-very-short::after {
  content: "•••";
  font-size: 1.2em;
  font-weight: bold;
  writing-mode: vertical-lr;
}

/* Tooltip para eventos pequeños */
.epg-grid-event-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.95);
  padding: 1em;
  border-radius: 0.5em;
  box-shadow: 0 0.5em 2em rgba(0, 0, 0, 0.8);
  z-index: 1000;
  min-width: 20em;
  display: none;
  border: 0.2em solid #3498db;
}

.epg-grid-event-short:hover .epg-grid-event-tooltip,
.epg-grid-event-very-short:hover .epg-grid-event-tooltip,
.epg-grid-event-short:focus .epg-grid-event-tooltip,
.epg-grid-event-very-short:focus .epg-grid-event-tooltip {
  display: block;
}

.epg-grid-event-tooltip-title {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 0.5em;
}

.epg-grid-event-tooltip-time {
  color: #aaa;
  margin-bottom: 0.5em;
}

.epg-grid-event-tooltip-description {
  line-height: 1.4;
  color: #ccc;
}
```

#### 3. Zoom Contextual al Enfocar

```css
/* Fila expandida */
.epg-grid-row-expanded {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
  padding: 2em;
  border-radius: 0.5em;
  margin: 1em 0;
  box-shadow: 0 1em 3em rgba(0, 0, 0, 0.5);
}

/* Panel de detalles */
.epg-expanded-details {
  display: flex;
  gap: 2em;
  margin-bottom: 1.5em;
}

.epg-expanded-poster {
  width: 12em;
  height: 16em;
  border-radius: 0.5em;
  overflow: hidden;
  box-shadow: 0 0.5em 2em rgba(0, 0, 0, 0.5);
}

.epg-expanded-info {
  flex: 1;
}

.epg-expanded-title {
  font-size: 1.8em;
  font-weight: bold;
  margin-bottom: 0.5em;
}

.epg-expanded-meta {
  display: flex;
  gap: 1em;
  margin-bottom: 1em;
  font-size: 0.9em;
  color: #aaa;
}

.epg-expanded-description {
  line-height: 1.6;
  color: #ccc;
  margin-bottom: 1em;
}

.epg-expanded-actions {
  display: flex;
  gap: 1em;
}

/* Timeline de próximos eventos */
.epg-expanded-upcoming {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10em, 1fr));
  gap: 1em;
}

.epg-upcoming-event {
  background: rgba(255, 255, 255, 0.1);
  padding: 1em;
  border-radius: 0.3em;
  text-align: center;
}
```

### Implementación JavaScript para Diseño 3

```javascript
EPG.renderSmartGrid = function() {
  var html = '<div class="epg-grid-smart">';
  
  // Header con horas
  html += '<div class="epg-grid-header">';
  html += this.renderTimeHeader();
  html += '</div>';
  
  // Filas de canales (virtualizadas)
  this.visibleChannels.forEach(function(channel, idx) {
    html += this.renderChannelRow(channel, idx);
  }, this);
  
  html += '</div>';
  return html;
};

EPG.renderChannelRow = function(channel, channelIndex) {
  var isFocused = (this.focusedChannel === channelIndex);
  
  var html = '<div class="epg-grid-row' + (isFocused ? ' expanded' : '') + '">';
  
  // Canal header
  html += '<div class="epg-grid-channel-header">';
  html += '<img src="' + channel.img + '" />';
  html += '<span>' + channel.lcn + '</span>';
  html += '<span>' + channel.name + '</span>';
  html += '</div>';
  
  // Timeline de eventos
  html += '<div class="epg-grid-timeline">';
  
  channel.epgItems.forEach(function(event, eventIdx) {
    html += this.renderGridEvent(event, eventIdx, channelIndex);
  }, this);
  
  html += '</div>';
  
  // Si está enfocado, mostrar detalles
  if (isFocused) {
    html += '<div class="epg-grid-row-expanded">';
    html += this.renderExpandedDetails(channel, this.focusedEvent);
    html += '</div>';
  }
  
  html += '</div>';
  return html;
};

EPG.renderGridEvent = function(event, eventIndex, channelIndex) {
  var duration = this.getDurationMinutes(event);
  var isShort = duration < 30;
  var isVeryShort = duration < 15;
  var isCurrent = this.isCurrentEvent(event);
  
  var width = duration * this.minuteWidth;
  var left = this.calculateLeftPosition(event.startDate);
  
  var classes = ['epg-grid-event'];
  classes.push('epg-event-' + event.category);
  if (isShort) classes.push('epg-grid-event-short');
  if (isVeryShort) classes.push('epg-grid-event-very-short');
  if (isCurrent) classes.push('current');
  
  var html = '<div class="' + classes.join(' ') + '" ';
  html += 'style="left: ' + left + 'em; width: ' + width + 'em;" ';
  html += 'data-channel="' + channelIndex + '" ';
  html += 'data-event="' + eventIndex + '">';
  
  // Contenido del evento
  if (!isVeryShort) {
    html += '<span class="epg-grid-event-rating">[+' + event.parentalRating + ']</span>';
    html += '<div class="epg-grid-event-title">' + event.languages[0].title + '</div>';
  }
  
  // Barra de progreso si es actual
  if (isCurrent) {
    var progress = this.calculateProgress(event);
    html += '<div class="epg-grid-event-progress" style="width: ' + progress + '%"></div>';
  }
  
  // Tooltip para eventos cortos
  if (isShort || isVeryShort) {
    html += this.renderEventTooltip(event);
  }
  
  html += '</div>';
  return html;
};

EPG.renderEventTooltip = function(event) {
  var html = '<div class="epg-grid-event-tooltip">';
  html += '<div class="epg-grid-event-tooltip-title">' + event.languages[0].title + '</div>';
  html += '<div class="epg-grid-event-tooltip-time">';
  html += this.formatTime(event.startDate) + ' - ' + this.formatTime(event.endDate);
  html += ' (' + this.getDurationMinutes(event) + ' min)';
  html += '</div>';
  if (event.languages[0].extendedDescription) {
    html += '<div class="epg-grid-event-tooltip-description">';
    html += this.truncate(event.languages[0].extendedDescription, 150);
    html += '</div>';
  }
  html += '</div>';
  return html;
};
```

### Ventajas del Diseño 3

✅ **Balance óptimo**
- Mantiene familiaridad de grilla
- Mejora significativa de visualización
- Información completa disponible

✅ **Colores por categoría**
- Identificación visual rápida
- Fácil de escanear
- Atractivo visualmente

✅ **Zoom contextual**
- Detalles completos al enfocar
- No satura la vista general
- Transición suave

✅ **Eventos cortos bien manejados**
- Indicadores visuales claros
- Tooltip informativo
- Texto vertical en espacios pequeños
- Puntos para eventos muy cortos

✅ **Rendimiento**
- Compatible con virtualización
- Colores via CSS (rápido)
- Tooltips on-demand
- Expansión local (no re-renderiza todo)

---

## 📊 Comparación de los 3 Diseños

| Aspecto                      | Diseño 1: Timeline | Diseño 2: Cards | Diseño 3: Mini-Grilla |
|------------------------------|--------------------|-----------------|---------------------|
| **Eventos visibles**         | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| **Manejo eventos cortos**    | ⭐⭐⭐⭐          | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐ |
| **Organización visual**      | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐    |
| **Familiaridad UX**          | ⭐⭐⭐            | ⭐⭐          | ⭐⭐⭐⭐⭐ |
| **Atractivo visual**         | ⭐⭐⭐⭐         | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐    |
| **Información mostrada**     | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| **Navegación intuitiva**     | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐     | ⭐⭐⭐⭐    |
| **Rendimiento**              | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| **Facilidad implementación** | ⭐⭐⭐⭐          | ⭐⭐⭐       | ⭐⭐⭐⭐⭐ |
| **Compatible Alt. 1 y 6**    | ✅                 | ✅             | ✅           |

---

## ⚠️ Manejo de Canales SIN EPG

### Escenarios Problemáticos

En la práctica, es común encontrar:

1. **Canales sin EPG disponible** - El servicio no proporciona datos de programación
2. **EPG sin eventos en rango de tiempo** - Hay EPG pero no en las próximas horas
3. **Errores de carga de EPG** - Fallos temporales en la descarga de datos
4. **Canales en vivo sin programación** - Streams 24/7 sin eventos definidos

### Análisis por Diseño

---

#### 🎨 DISEÑO 1: Timeline Vertical

##### Comportamiento con Canales Sin EPG

**Vista Compacta:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📺 015  Canal Local                                                  │
│ ┌────────────────────────────────┬──────────────────────────────────┤
│ │ ⚪ SIN INFORMACIÓN DE EPG      │                                  │
│ │                                │  Presiona OK para sintonizar     │
│ │ Canal en transmisión           │  el canal en vivo                │
│ │ [▶️ Ver canal]                 │                                  │
│ └────────────────────────────────┴──────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────┘
```

**Vista Expandida:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ ▶️ 015  Canal Local    [ENFOCADO]                                   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │   📡 INFORMACIÓN DE EPG NO DISPONIBLE                           │ │
│ │                                                                   │ │
│ │   Este canal no cuenta con guía de programación.                 │ │
│ │   El canal está transmitiendo en vivo.                          │ │
│ │                                                                   │ │
│ │   [▶️ Sintonizar Canal]   [⭐ Agregar a Favoritos]              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

##### Código para Diseño 1

```javascript
EPG.renderChannelCompact = function(channel, channelIndex) {
  var currentEvent = this.getCurrentEvent(channel);
  var nextEvent = this.getNextEvent(channel, currentEvent);
  
  var html = '<div class="epg-channel-compact focusable" data-channel="' + channelIndex + '">';
  
  // Header
  html += '<div class="epg-channel-header">';
  html += '<img class="epg-channel-logo" src="' + channel.img + '" />';
  html += '<span class="epg-channel-number">' + channel.lcn + '</span>';
  html += '<span class="epg-channel-name">' + channel.name + '</span>';
  html += '</div>';
  
  // Events
  html += '<div class="epg-channel-info">';
  
  // Verificar si hay eventos
  if (!currentEvent && !nextEvent) {
    // SIN EPG
    html += '<div class="epg-event-no-data">';
    html += '<div class="epg-event-badge">⚪ SIN INFORMACIÓN DE EPG</div>';
    html += '<div class="epg-event-message">Canal en transmisión</div>';
    html += '<button class="epg-action-button-small">▶️ Ver canal</button>';
    html += '</div>';
    
    html += '<div class="epg-event-placeholder">';
    html += '<div class="epg-event-message-secondary">Presiona OK para sintonizar el canal en vivo</div>';
    html += '</div>';
  } else {
    // Renderizado normal con eventos
    if (currentEvent) {
      var progress = this.calculateProgress(currentEvent);
      html += '<div class="epg-event-now">';
      html += '<div class="epg-event-badge">🔴 AHORA</div>';
      html += '<div class="epg-event-time">' + this.formatTime(currentEvent.startDate) + ' - ' + this.formatTime(currentEvent.endDate) + '</div>';
      html += '<div class="epg-event-title">' + currentEvent.languages[0].title + '</div>';
      html += '<div class="epg-progress-bar"><div class="epg-progress-fill" style="width: ' + progress + '%"></div></div>';
      html += '</div>';
    } else {
      // Hay próximo evento pero no actual
      html += '<div class="epg-event-no-current">';
      html += '<div class="epg-event-badge">⚪ SIN EVENTO ACTUAL</div>';
      html += '<div class="epg-event-message">Canal en transmisión</div>';
      html += '</div>';
    }
    
    if (nextEvent) {
      html += '<div class="epg-event-next">';
      html += '<div class="epg-event-badge">⏭️ DESPUÉS</div>';
      html += '<div class="epg-event-time">' + this.formatTime(nextEvent.startDate) + ' - ' + this.formatTime(nextEvent.endDate) + '</div>';
      html += '<div class="epg-event-title">' + nextEvent.languages[0].title + '</div>';
      html += '</div>';
    }
  }
  
  html += '</div>';
  html += '</div>';
  
  return html;
};

EPG.renderChannelExpanded = function(channel, channelIndex) {
  var html = '<div class="epg-channel-expanded">';
  
  // Verificar si hay EPG
  if (!channel.epgItems || channel.epgItems.length === 0) {
    // Sin EPG - Vista expandida
    html += '<div class="epg-no-data-expanded">';
    html += '<div class="epg-no-data-icon">📡</div>';
    html += '<div class="epg-no-data-title">INFORMACIÓN DE EPG NO DISPONIBLE</div>';
    html += '<div class="epg-no-data-description">';
    html += 'Este canal no cuenta con guía de programación.<br>';
    html += 'El canal está transmitiendo en vivo.';
    html += '</div>';
    html += '<div class="epg-no-data-actions">';
    html += '<button class="epg-action-button">▶️ Sintonizar Canal</button>';
    html += '<button class="epg-action-button-secondary">⭐ Agregar a Favoritos</button>';
    html += '</div>';
    html += '</div>';
  } else {
    // Renderizado normal con timeline
    html += '<div class="epg-timeline-extended">';
    channel.epgItems.slice(0, 6).forEach(function(event, idx) {
      var isCurrent = this.isCurrentEvent(event);
      html += '<div class="epg-timeline-event ' + (isCurrent ? 'current' : '') + '">';
      html += '<div class="epg-timeline-time">' + this.formatTime(event.startDate) + '</div>';
      html += '<div class="epg-timeline-title">' + event.languages[0].title + '</div>';
      html += '<div class="epg-timeline-duration">' + this.getDuration(event) + '</div>';
      html += '</div>';
    }, this);
    html += '</div>';
    
    var currentEvent = this.getCurrentEvent(channel);
    if (currentEvent) {
      html += '<div class="epg-event-details">';
      html += '<div class="epg-event-details-title">' + currentEvent.languages[0].title + '</div>';
      html += '<div class="epg-event-details-meta">';
      html += '<span>⏰ ' + this.getRemainingTime(currentEvent) + '</span>';
      html += '<span>⭐ 8.5/10</span>';
      html += '<span>[+' + currentEvent.parentalRating + ']</span>';
      html += '</div>';
      html += '<div class="epg-event-details-description">' + (currentEvent.languages[0].extendedDescription || '') + '</div>';
      html += '</div>';
    }
  }
  
  html += '</div>';
  return html;
};
```

##### CSS para Estados Sin EPG - Diseño 1

```css
/* Estado sin EPG */
.epg-event-no-data {
  flex: 1;
  background: rgba(150, 150, 150, 0.2);
  padding: 1em;
  border-radius: 0.3em;
  border-left: 0.3em solid #888;
  text-align: center;
}

.epg-event-no-current {
  flex: 1;
  background: rgba(150, 150, 150, 0.15);
  padding: 1em;
  border-radius: 0.3em;
  border-left: 0.3em solid #666;
  text-align: center;
}

.epg-event-placeholder {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  padding: 1em;
  border-radius: 0.3em;
  border-left: 0.3em solid #444;
  display: flex;
  align-items: center;
  justify-content: center;
}

.epg-event-message {
  font-size: 0.9em;
  color: #aaa;
  margin: 0.5em 0;
}

.epg-event-message-secondary {
  font-size: 0.85em;
  color: #888;
  font-style: italic;
}

.epg-action-button-small {
  margin-top: 0.5em;
  padding: 0.5em 1em;
  background: linear-gradient(135deg, #666, #555);
  border: none;
  border-radius: 0.3em;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

/* Vista expandida sin datos */
.epg-no-data-expanded {
  text-align: center;
  padding: 3em;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.5em;
  border: 0.2em dashed #666;
}

.epg-no-data-icon {
  font-size: 4em;
  margin-bottom: 0.5em;
  opacity: 0.5;
}

.epg-no-data-title {
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 1em;
  color: #999;
}

.epg-no-data-description {
  font-size: 1em;
  color: #aaa;
  margin-bottom: 2em;
  line-height: 1.6;
}

.epg-no-data-actions {
  display: flex;
  gap: 1em;
  justify-content: center;
}

.epg-action-button-secondary {
  padding: 0.8em 1.5em;
  background: linear-gradient(135deg, #555, #444);
  border: 0.1em solid #777;
  border-radius: 0.3em;
  color: white;
  font-weight: bold;
  cursor: pointer;
}
```

##### ✅ Ventajas Diseño 1 sin EPG

- Espacio para mensaje claro
- Acciones directas (ver canal, favoritos)
- No rompe el layout
- Mensaje contextual según estado

##### ⚠️ Desventajas Diseño 1 sin EPG

- Ocupa mismo espacio que canales con EPG
- Puede parecer "vacío" en lista larga

---

#### 🎨 DISEÑO 2: Cards con Carrusel

##### Comportamiento con Canales Sin EPG

**Vista Compacta:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📺 015  Canal Local                                                  │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │                                                                 │  │
│ │                 📡 SIN INFORMACIÓN DE EPG                       │  │
│ │                                                                 │  │
│ │         Este canal no cuenta con programación disponible       │  │
│ │                                                                 │  │
│ │                    [▶️ Ver Canal En Vivo]                       │  │
│ │                                                                 │  │
│ └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Vista Expandida:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ ▶️ 015  Canal Local    [ENFOCADO - SIN EPG]                         │
│                                                                      │
│ ┌─────────────────┐  ┌────────────────────────────────────────────┐│
│ │                 │  │ Canal sin guía de programación              ││
│ │                 │  │                                             ││
│ │      📡         │  │ Este canal no proporciona información       ││
│ │                 │  │ de programación EPG.                        ││
│ │   SIN EPG       │  │                                             ││
│ │                 │  │ El canal se encuentra transmitiendo en     ││
│ │  DISPONIBLE     │  │ vivo. Presiona OK para sintonizarlo.       ││
│ │                 │  │                                             ││
│ │                 │  │ [▶️ Sintonizar Canal]  [⭐ A Favoritos]    ││
│ └─────────────────┘  └────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

##### Código para Diseño 2

```javascript
EPG.renderChannelCard = function(channel, isFocused) {
  var cardClass = isFocused ? 'epg-channel-card epg-channel-card-expanded' : 'epg-channel-card';
  
  var html = '<div class="' + cardClass + '">';
  
  // Header del canal
  html += '<div class="epg-channel-card-header">';
  html += '<img class="epg-channel-logo" src="' + channel.img + '" />';
  html += '<span class="epg-channel-number">' + channel.lcn + '</span>';
  html += '<span class="epg-channel-name">' + channel.name + '</span>';
  html += '</div>';
  
  // Verificar si hay EPG
  if (!channel.epgItems || channel.epgItems.length === 0) {
    // Sin EPG - Vista simplificada
    html += '<div class="epg-card-no-data">';
    html += '<div class="epg-card-no-data-icon">📡</div>';
    html += '<div class="epg-card-no-data-title">SIN INFORMACIÓN DE EPG</div>';
    
    if (isFocused) {
      // Vista expandida sin EPG
      html += '<div class="epg-card-no-data-description">';
      html += 'Este canal no proporciona información de programación EPG.<br><br>';
      html += 'El canal se encuentra transmitiendo en vivo. Presiona OK para sintonizarlo.';
      html += '</div>';
      html += '<div class="epg-card-no-data-actions">';
      html += '<button class="epg-action-button">▶️ Sintonizar Canal</button>';
      html += '<button class="epg-action-button">⭐ A Favoritos</button>';
      html += '</div>';
    } else {
      // Vista compacta sin EPG
      html += '<div class="epg-card-no-data-message">';
      html += 'Este canal no cuenta con programación disponible';
      html += '</div>';
      html += '<button class="epg-action-button-small">▶️ Ver Canal En Vivo</button>';
    }
    
    html += '</div>';
  } else {
    // Renderizado normal con carrusel
    if (isFocused) {
      // Vista expandida con EPG
      html += '<div class="epg-event-details-large">';
      var currentEvent = this.getCurrentEvent(channel);
      if (currentEvent) {
        html += this.renderEventDetailsLarge(currentEvent);
      }
      html += '</div>';
      
      html += '<div class="epg-card-upcoming-label">PRÓXIMOS EVENTOS:</div>';
      html += '<div class="epg-events-carousel">';
      channel.epgItems.slice(0, 6).forEach(function(event, idx) {
        var isLive = this.isCurrentEvent(event);
        html += this.renderEventCard(event, isLive, false);
      }, this);
      html += '</div>';
    } else {
      // Vista compacta con carrusel
      html += '<div class="epg-events-carousel">';
      channel.epgItems.slice(0, 5).forEach(function(event, idx) {
        var isLive = this.isCurrentEvent(event);
        html += this.renderEventCard(event, isLive, false);
      }, this);
      html += '</div>';
    }
  }
  
  html += '</div>';
  return html;
};
```

##### CSS para Estados Sin EPG - Diseño 2

```css
/* Card sin datos */
.epg-card-no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2em;
  background: rgba(100, 100, 100, 0.15);
  border-radius: 0.5em;
  border: 0.2em dashed #666;
  min-height: 10em;
}

.epg-card-no-data-icon {
  font-size: 3em;
  margin-bottom: 0.5em;
  opacity: 0.5;
}

.epg-card-no-data-title {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 1em;
  color: #999;
  text-align: center;
}

.epg-card-no-data-message {
  font-size: 0.9em;
  color: #aaa;
  text-align: center;
  margin-bottom: 1em;
  line-height: 1.5;
}

.epg-card-no-data-description {
  font-size: 1em;
  color: #bbb;
  text-align: center;
  margin-bottom: 1.5em;
  line-height: 1.6;
  max-width: 40em;
}

.epg-card-no-data-actions {
  display: flex;
  gap: 1em;
}

/* Card expandida sin datos */
.epg-channel-card-expanded .epg-card-no-data {
  min-height: 15em;
  padding: 3em;
}

.epg-channel-card-expanded .epg-card-no-data-icon {
  font-size: 5em;
}

.epg-channel-card-expanded .epg-card-no-data-title {
  font-size: 1.5em;
}
```

##### ✅ Ventajas Diseño 2 sin EPG

- El card mantiene estructura visual
- Espacio amplio para mensajes
- Acciones centradas y destacadas
- Fácil de identificar visualmente

##### ⚠️ Desventajas Diseño 2 sin EPG

- Card se ve "grande" para poco contenido
- Puede romper ritmo visual del carrusel

---

#### 🎨 DISEÑO 3: Mini-Grilla Inteligente

##### Comportamiento con Canales Sin EPG

**Vista Compacta:**

```
│      │   7:30    8:00    8:30    9:00    9:30   10:00   10:30   11:00│
│ ─────┼────────────────────────────────────────────────────────────────│
│ LOCAL│ ░░░░░░░░░░░░░░░░░░░░░░ SIN EPG DISPONIBLE ░░░░░░░░░░░░░░░░░░░░│
│  15  │ Canal en transmisión • Presiona OK para sintonizar            │
│ ─────┼────────────────────────────────────────────────────────────────│
```

**Vista Expandida:**

```
│ ─────┼────────────────────────────────────────────────────────────────│
│ LOCAL│ ░░░░░░░░░░░░░░░░░░░░░░ SIN EPG DISPONIBLE ░░░░░░░░░░░░░░░░░░░░│
│  15  │ Canal en transmisión • Presiona OK para sintonizar            │
│ [+]  │                                                                 │
│ ─────┼────────────────────────────────────────────────────────────────│
│      │                    VISTA EXPANDIDA                             │
│      ├────────────────────────────────────────────────────────────────│
│      │ ┌──────────────────────────────────────────────────────────┐  │
│      │ │ 📡 INFORMACIÓN DE EPG NO DISPONIBLE                      │  │
│      │ │                                                           │  │
│      │ │ Este canal no cuenta con guía de programación.           │  │
│      │ │ El canal está transmitiendo en vivo.                     │  │
│      │ │                                                           │  │
│      │ │ [▶️ Sintonizar]  [⭐ Favoritos]  [ℹ️ Info del Canal]     │  │
│      │ └──────────────────────────────────────────────────────────┘  │
│ ─────┼────────────────────────────────────────────────────────────────│
```

##### Código para Diseño 3

```javascript
EPG.renderChannelRow = function(channel, channelIndex) {
  var isFocused = (this.focusedChannel === channelIndex);
  
  var html = '<div class="epg-grid-row' + (isFocused ? ' expanded' : '') + '">';
  
  // Canal header
  html += '<div class="epg-grid-channel-header">';
  html += '<img src="' + channel.img + '" />';
  html += '<span>' + channel.lcn + '</span>';
  html += '<span>' + channel.name + '</span>';
  html += '</div>';
  
  // Timeline de eventos
  html += '<div class="epg-grid-timeline">';
  
  // Verificar si hay EPG
  if (!channel.epgItems || channel.epgItems.length === 0) {
    // Sin EPG - Mostrar placeholder
    html += '<div class="epg-grid-no-data">';
    html += '<span class="epg-grid-no-data-icon">░░░░░░░░░░░░░░░░░░░░░░</span>';
    html += '<span class="epg-grid-no-data-text">SIN EPG DISPONIBLE</span>';
    html += '<span class="epg-grid-no-data-icon">░░░░░░░░░░░░░░░░░░░░</span>';
    html += '<span class="epg-grid-no-data-action">Canal en transmisión • Presiona OK para sintonizar</span>';
    html += '</div>';
  } else {
    // Renderizado normal con eventos
    channel.epgItems.forEach(function(event, eventIdx) {
      html += this.renderGridEvent(event, eventIdx, channelIndex);
    }, this);
  }
  
  html += '</div>';
  
  // Si está enfocado, mostrar detalles
  if (isFocused) {
    html += '<div class="epg-grid-row-expanded">';
    
    if (!channel.epgItems || channel.epgItems.length === 0) {
      // Sin EPG - Vista expandida
      html += '<div class="epg-grid-no-data-expanded">';
      html += '<div class="epg-grid-no-data-expanded-icon">📡</div>';
      html += '<div class="epg-grid-no-data-expanded-title">INFORMACIÓN DE EPG NO DISPONIBLE</div>';
      html += '<div class="epg-grid-no-data-expanded-message">';
      html += 'Este canal no cuenta con guía de programación.<br>';
      html += 'El canal está transmitiendo en vivo.';
      html += '</div>';
      html += '<div class="epg-grid-no-data-expanded-actions">';
      html += '<button class="epg-action-button">▶️ Sintonizar</button>';
      html += '<button class="epg-action-button">⭐ Favoritos</button>';
      html += '<button class="epg-action-button">ℹ️ Info del Canal</button>';
      html += '</div>';
      html += '</div>';
    } else {
      // Renderizado normal con detalles
      html += this.renderExpandedDetails(channel, this.focusedEvent);
    }
    
    html += '</div>';
  }
  
  html += '</div>';
  return html;
};
```

##### CSS para Estados Sin EPG - Diseño 3

```css
/* Fila sin datos */
.epg-grid-no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  padding: 1em;
  background: repeating-linear-gradient(
    45deg,
    rgba(100, 100, 100, 0.1),
    rgba(100, 100, 100, 0.1) 10px,
    rgba(80, 80, 80, 0.1) 10px,
    rgba(80, 80, 80, 0.1) 20px
  );
  border-radius: 0.3em;
  border: 0.1em dashed #666;
  color: #888;
  font-size: 0.9em;
}

.epg-grid-no-data-icon {
  color: #555;
  font-size: 0.8em;
}

.epg-grid-no-data-text {
  font-weight: bold;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.epg-grid-no-data-action {
  color: #aaa;
  font-size: 0.85em;
  font-style: italic;
}

/* Vista expandida sin datos */
.epg-grid-no-data-expanded {
  text-align: center;
  padding: 2em;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0.5em;
  border: 0.2em dashed #555;
}

.epg-grid-no-data-expanded-icon {
  font-size: 3em;
  margin-bottom: 0.5em;
  opacity: 0.5;
}

.epg-grid-no-data-expanded-title {
  font-size: 1.3em;
  font-weight: bold;
  margin-bottom: 1em;
  color: #999;
}

.epg-grid-no-data-expanded-message {
  font-size: 1em;
  color: #aaa;
  margin-bottom: 2em;
  line-height: 1.6;
}

.epg-grid-no-data-expanded-actions {
  display: flex;
  gap: 1em;
  justify-content: center;
}
```

##### ✅ Ventajas Diseño 3 sin EPG

- Mantiene consistencia visual de grilla
- Placeholder discreto pero visible
- No rompe alineación de filas
- Fácil de escanear en lista larga

##### ⚠️ Desventajas Diseño 3 sin EPG

- Menos espacio para mensaje en vista compacta
- Puede pasar desapercibido si hay muchos canales

---

## 📊 Comparación de Manejo Sin EPG

| Aspecto | Diseño 1: Timeline | Diseño 2: Cards | Diseño 3: Mini-Grilla |
|---------|-------------------|-----------------|---------------------|
| **Visibilidad del problema** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Espacio para mensaje** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Mantiene consistencia** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Acciones disponibles** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Impacto en navegación** | Bajo | Medio | Muy Bajo |
| **Claridad del mensaje** | Muy Alta | Muy Alta | Media |

---

## 🎯 Recomendación Final

### 🥇 Para la mayoría de casos: **Diseño 3 (Mini-Grilla Inteligente)**

**Por qué:**
- ✅ Mantiene familiaridad de grilla
- ✅ Resuelve TODOS los problemas reportados
- ✅ Más fácil de implementar
- ✅ Mejor rendimiento
- ✅ Compatible 100% con Alt. 1 y Alt. 6

### 🥈 Para modernización agresiva: **Diseño 1 (Timeline)**

**Por qué:**
- ✅ UX moderna tipo Netflix
- ✅ Información muy clara
- ✅ Fácil de navegar
- ⚠️ Requiere re-entrenamiento de usuarios

### 🥉 Para máximo impacto visual: **Diseño 2 (Cards)**

**Por qué:**
- ✅ Más atractivo visualmente
- ✅ Imágenes destacadas
- ⚠️ Más complejo de implementar
- ⚠️ Requiere imágenes de alta calidad

---

**Última actualización:** Enero 2026  
**Versión:** 1.0  
**Autor:** Equipo de Desarrollo OTT
