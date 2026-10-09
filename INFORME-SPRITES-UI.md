# Informe: sprites de Ethan y profesionalización de la interfaz

**Proyecto:** Ethan Life Tycoon · **Rama:** mansigger · **Fecha:** 8 de octubre de 2026

Este informe define cómo añadir sprites animados de Ethan y cómo evolucionar la interfaz
actual hacia el estándar visual de los tycoon/idle profesionales (AdVenture Capitalist,
Idle Miner Tycoon, Egg Inc., Game Dev Tycoon), manteniendo el tono de humor negro y la
identidad de Sestao. Está pensado para ejecutarse por fases sin romper nada de lo que ya
funciona (un solo `index.html`, sin build, PWA).

---

## 1. Sprites de Ethan

### 1.1 Estilo recomendado

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **Pixel art 64×64 (2–8 frames)** | Barato de producir, lee bien en móvil, encaja con humor absurdo, peso mínimo | Choca un poco con la UI actual (flat/redondeada) | **Recomendado** |
| Vector flat (SVG animado) | Coherente con la UI actual, escala infinita | Animar personajes en SVG es caro y rígido | Alternativa |
| Ilustración grande tipo cómic | Mucha personalidad | Pesado, difícil de animar, no escala a estados | Descartado |

El pixel art es el estándar de facto en idle games con personaje (ej. los mineros de Idle
Miner). Un personaje pixelado sobre UI flat limpia es una combinación probada. Resolución
de trabajo 64×64 px, exportado a 128×128 (@2x) y renderizado con `image-rendering:pixelated`.

### 1.2 Estados y animaciones (prioridad de producción)

| # | Estado | Frames | Cuándo se muestra |
|---|---|---|---|
| 1 | **Idle** (respira, parpadea) | 4 | Por defecto en la cabecera |
| 2 | **Currando** (llave inglesa golpeando) | 4–6 | Mientras hay racha activa o auto-trabajo |
| 3 | **Cansado** (sudor, encorvado) | 2 | Energía < 15% o a 0 |
| 4 | **Celebrando** (puño arriba) | 4 | Crítico, medalla, upgrade ganado, pleno del minijuego |
| 5 | **Estafado** (cartera vacía, mosca) | 2 | Evento negativo / estafa de Sádaba |
| 6 | **Corazón roto** | 2 | Uxune, Itsasne, la Nomo |
| 7 | **Modo rico** (gafas de sol) | 2 | Dinero > €1M o tema premium activo |
| 8 | Variantes por tema (gorra McDonald's, delantal kebab) | +1 por tema | Según tema activo |

Producir en este orden: 1→4 cubren el 90 % del valor percibido.

### 1.3 Formato técnico

- **Sprite sheet único** `ethan.png` (tira horizontal por estado, una fila por estado),
  acompañado de un mapa JSON simple `{estado:{fila,frames,fps}}` inlineado en el JS.
- Animación por **CSS `steps()`**: `animation: ethan-idle 0.8s steps(4) infinite` moviendo
  `background-position`. Cero JavaScript por frame, cero coste de CPU relevante.
- Peso objetivo: sheet completo < 40 KB (indexado, 16 colores bastan).
- Respetar `prefers-reduced-motion: reduce` → congelar en frame 1.
- Carga: el PNG se referencia desde CSS; al ser un solo asset cacheado por el SW no
  afecta al arranque. Añadirlo al precache del `sw.js` cuando se active cache real.

### 1.4 Integración en el juego (dónde aparece)

1. **Cabecera**: Ethan 64×64 junto al título, SIEMPRE visible. Es el "tamagotchi": su
   estado refleja el juego de un vistazo (cansado, currando, rico…). Punto de mayor
   retorno emocional por píxel.
2. **Botón de trabajar**: mini-Ethan currando dentro del botón mientras hay racha.
3. **Ruleta de sucesos**: Ethan reacciona al resultado (celebrando / estafado) junto al
   texto del resultado. Refuerza cada tirada sin añadir UI.
4. **Popups de historia** (Uxune, funeral del aita…): el sprite del estado emocional
   convierte un modal de texto en una viñeta.

### 1.5 Pipeline de producción

- Herramienta: **Aseprite** (o Piskel gratis). Paleta compartida con la UI (verde `#4e7d5b`,
  amarillo `#c9d856`, tinta `#1f2f25`) para que el personaje pertenezca al mundo.
- Nomenclatura: `ethan_<estado>_<frame>.png` → empaquetado a sheet con el export de Aseprite.
- Iteración: empezar con idle + currando (1 día de trabajo de pixel artist), validar en
  juego, luego ampliar estados.

---

## 2. Profesionalización de la interfaz (patrón tycoon)

### 2.1 Qué hacen los tycoon profesionales que hoy no hacemos

1. **Barra de recursos superior fija (HUD superior)**: dinero, €/s y energía SIEMPRE
   visibles con iconos, aunque hagas scroll o cambies de pestaña. Hoy las stats se van
   con el scroll. Es el cambio nº 1 en percepción de calidad.
2. **Navegación inferior con iconos** (móvil): pestañas abajo, con icono + etiqueta +
   badge de aviso (p. ej. punto amarillo cuando puedes comprar algo o cobrar un encargo).
   Hoy las pestañas son texto arriba y no avisan.
3. **Tarjetas de generador estandarizadas**: icono del objeto + nombre + nivel/estado +
   producción + botón de coste, siempre en la misma retícula. Hoy las tarjetas son texto
   plano sin icono; con 18 objetos la tienda se siente lista de texto.
4. **Compra múltiple x1 / x10 / MAX** en garajes y mejoras repetibles (cuando existan niveles).
5. **Números animados**: el dinero cuenta hacia arriba (count-up) en vez de saltar. Ya
   tenemos `pop`; falta la interpolación.
6. **Abreviación de cifras grandes**: `€1,2M`, `€34,5K` a partir de 100.000. Los tycoon
   nunca muestran `€1.234.567` en la stat principal (sí en tooltips).
7. **Toasts en vez de línea de log**: los avisos (medalla, hito, compra) apilados en
   esquina con auto-dismiss. La línea `#log` actual se pierde.
8. **Jerarquía tipográfica real**: hoy casi todo es 13–15 px. Definir escala (28/18/15/13/11)
   y usar mayúsculas+tracking solo para etiquetas (como ya hace el HUD de PC).
9. **Color semántico estricto**: verde = ganancia, rojo = pérdida, dorado = premium/raro,
   azul = acción neutra. Hoy el amarillo hace de todo.
10. **Iconografía consistente**: un set único (estilo línea gruesa redondeada, 2 px) para
    energía, dinero, velocidad, garajes… Hoy mezclamos emoji (🔥⚡🔒🚐) con SVG propios.
    Los emoji renderizan distinto en cada sistema → sustituir por SVG inline del set.

### 2.2 Sistema de diseño propuesto (tokens)

```css
/* Escala tipográfica */  --fs-xxl:28px; --fs-xl:18px; --fs-md:15px; --fs-sm:13px; --fs-xs:11px;
/* Espaciado (múltiplos de 4) */  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-6:24px;
/* Radios */  --r-sm:8px; --r-md:12px; --r-lg:16px;
/* Semánticos */  --ok:#3f9d63; --bad:#e05548; --gold:#d4a017; --info:var(--blue);
/* Elevación */  --e1:0 1px 3px var(--sh); --e2:0 4px 14px var(--sh);
```

Los temas (Kebab Ali, McDonald's) seguirán funcionando igual: solo redefinen la paleta
base, nunca los semánticos.

### 2.3 Layout objetivo

**Móvil** (prioritario):
```
┌──────────────────────────────┐
│ [Ethan] €12,4K  +€86/s  ⚡82% │ ← top bar fija (sprite + recursos)
├──────────────────────────────┤
│  contenido de la pestaña     │
│  (scroll)                    │
├──────────────────────────────┤
│ 🔧Taller 🗺️Sestao 🎰Upg 🏅 👤 │ ← bottom nav fija con badges
└──────────────────────────────┘
```

**PC** (>1050 px): columna central 480 px + HUD de progreso a la derecha (ya existe) +
columna izquierda nueva con Ethan grande animado y los encargos del día. Tres columnas,
el patrón clásico de tycoon de navegador.

### 2.4 Micro-interacciones a estandarizar

- Botón comprable: ya pulsa (`can`) ✔. Añadir transición de color al pasar a comprable.
- Compra: la tarjeta hace flash verde + el icono salta (scale bounce).
- Pérdida de dinero: la cifra de la top bar parpadea en rojo (ya hay shake ✔).
- Transición entre pestañas: fade/slide de 120 ms (hoy el cambio es seco).
- Las barras de progreso con `transition: width` ✔ (ya hecho).

### 2.5 Plan por fases y esfuerzo estimado

| Fase | Contenido | Esfuerzo | Riesgo |
|---|---|---|---|
| **F1** | Tokens CSS + abreviación de cifras + count-up del dinero | 0,5 día | Nulo |
| **F2** | Top bar fija de recursos + bottom nav con iconos SVG y badges | 1 día | Bajo |
| **F3** | Tarjetas con icono por objeto/garaje/mejora (set SVG propio, 24 iconos) | 1–2 días | Bajo |
| **F4** | Sprites de Ethan (idle + currando + cansado + celebrando) integrados en cabecera y ruleta | 1 día de arte + 0,5 de integración | Bajo |
| **F5** | Toasts, transiciones de pestaña, flash de compra, resto de estados del sprite | 1 día | Nulo |

Cada fase es desplegable por separado en `mansigger`. Ninguna toca la lógica de juego ni
el formato de guardado.

### 2.6 Checklist accionable (resumen)

- [x] Definir tokens CSS (F1)
- [x] `fmtMoney()` con K/M + count-up (F1)
- [x] Top bar fija con sprite placeholder (F2)
- [x] Bottom nav móvil con 5 iconos SVG + badges de "hay algo comprable/cobrable" (F2)
- [x] Set de iconos SVG: 18 objetos, 6 garajes, 5 mejoras, 4 recursos (F3)
- [x] Encargar sheet `ethan.png` (estados 1–4, 64×64, paleta del juego) (F4)
- [x] CSS `steps()` + mapa de estados + reglas de cambio de estado (F4)
- [x] Toasts apilables que sustituyan a `#log` (manteniéndolo como fallback aria-live) (F5)

---

## 3. Riesgos y decisiones abiertas

- **Emoji vs SVG**: sustituir emojis de UI (🔒⚡🔥) por SVG es lo más visible para
  "profesionalizar"; los emoji de contenido (🚐🕊️💶 de eventos dorados) pueden quedarse —
  son parte del humor.
- **Un solo archivo**: todo lo anterior cabe en `index.html` + `ethan.png` + (opcional)
  `icons.svg` como sprite de símbolos. No hace falta bundler.
- **Peso total objetivo de la PWA**: < 150 KB (hoy ~30 KB de HTML). Margen de sobra.
- **Accesibilidad**: mantener `aria-live` para resultados, `prefers-reduced-motion`, y
  contraste AA en todos los temas (revisar amarillo sobre crema en tema McDonald's).

---

## 4. Estado tras la versión 2.0 (8 de octubre de 2026)

Todo el checklist anterior está hecho. Además:

- **Navegación por secciones**: Taller, Sestao (Garajes / Mejoras), Bar Naval (Cajas / Upgrader),
  Vitrina (Medallas / Sucesos / Cosméticos) y Ethan (Ranking / Jubilación / Perfil). Barra inferior
  en móvil y lateral en PC, con avisos.
- **Barra superior fija** con dinero animado, €/s, €/hora extra, energía y sarro. Debajo, el ticker
  **Radio Sestao** con titulares que cambian según el progreso.
- **Garajes con niveles** (x1 / x10 / x100 / MAX), hitos x2 a nivel 25, 50, 100… y bonus global
  cuando todos llegan a cierto nivel. Cuatro garajes nuevos: Markonzaga, Rebonza, La Naval y
  Altos Hornos.
- **Mejoras nuevas** de herramientas, energía y garajes, y **jubilación** (prestigio): el sarro da
  +2% a todo y se gasta en un árbol de mejoras permanentes.
- **Cajas tipo Counter-Strike**: cuatro cajas (incluida una gratis al día), ruleta horizontal con
  desaceleración, ticks y casi-premios, y un revelado por rareza. Hay rareza nueva, **Mítico**
  (0,02% en la caja de Jokin).
- **Upgrader nuevo**: medidor circular arrastrable, cantidades con atajos y slider, ocho
  multiplicadores, historial, estadísticas y modo turbo.
- **17 cosméticos nuevos**. Ahora cada cosmético se anima con el paso de Ethan
  (`cos-*-walk.png`) y tiene icono recortado para la interfaz (`ico-*.png`). Todo sale de
  `tools/make-sprites.js`.
- Rangos de Ethan por horas extra, bocadillos de diálogo, frenesí, Ethan dorado y medallas pensadas
  para jugar muchas horas.

El ranking guarda en `profiles.m` el **total ganado**. A partir de 2.000 millones se guarda
comprimido (2e9 + log10 × 1e6) para que quepa aunque la columna sea `int4`. El juego lo decodifica
al mostrarlo.
