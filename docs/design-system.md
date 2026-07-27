# Design System

Fuente de verdad: el archivo de Figma
[Memoria Electrónica Leonesa](https://www.figma.com/design/BuItQAgdEVZaTSeFjZwRNZ/Memoria-Electr%C3%B3nica-Leonesa)
y su implementación en `src/styles/global.css`. La gran mayoría de elementos del código llevan atributos `data-node-id` con el nodo de Figma exacto del que provienen.

Nodos de Figma de referencia usados durante el desarrollo:

| Nodo | Componente / Elemento |
| --- | --- |
| `606-43396` | Sección completa de Mobile (moléculas, organismos, pantallas) |
| `634-41290` | Detalle de evento móvil (anatomía y reordenación responsive) |
| `369-31311` | Highlights / Mobile (tags con scroll horizontal) |
| `315-17658` | Toolbar / Mobile (slider a sangre + highlights + toggle) |
| `908-41998` | Lightbox de imagen (padding uniforme 24px) |
| `841-40903` | Modal del lightbox (caja fija, foto `object-contain`) |
| `810-71904` | Layout base de EmptyState |
| `825-72958` | Componente e instancias de EmptyState (*Construction* y *No results*) |
| `562-70116` | SideMenu con badge "Nuevo" |

---

## Color

Definido en `src/styles/global.css` como primitivas HSL + variables semánticas, expuestas a Tailwind CSS v4 vía `@theme` (`--color-mel-*`). **Usa siempre las variables semánticas** (`bg-mel-bg-primary`, `text-mel-text-secondary`, `bg-mel-action-primary`…), nunca primitivas sueltas ni valores hex directos.

Dos paletas primitivas:
- **Leon Orig** (`--mel-primitive-le-50…950`): Granates saturados característicos de la marca.
- **Leon Tinted** (`--mel-primitive-tinted-50…950`): Neutros rosados para fondos y textos secundarios.
- **Primarios CMYK** (`cian`, `magenta`, `yellow`): Usados en la experiencia de la Intro Animada.

### Tabla de Variables Semánticas

| Variable Semántica | Modo Claro | Modo Oscuro (`.dark`) | Uso principal |
| --- | --- | --- | --- |
| `bg-primary` | tinted-50 | le-950 | Fondo principal de página y tabla |
| `bg-secondary` | tinted-100 | tinted-900 | Tarjetas, contenedores de imagen y modal |
| `bg-tertiary` | tinted-200 | tinted-800 | Badges y elementos de apoyo |
| `text-primary` | le-950 | tinted-50 | Títulos principales y texto destacado |
| `text-secondary` | tinted-600 | tinted-200 | Textos secundarios, descripciones y subtítulos |
| `text-tertiary` | tinted-400 | tinted-500 | Datos deshabilitados / "desconocidos" |
| `text-on-action` | tinted-50 | tinted-900 | Texto e iconos sobre Action-Secondary (cambia en modo oscuro) |
| `text-on-action-primary` | le-50 | le-50 | Texto e iconos sobre Action-Primary (FIJO casi blanco en ambos modos) |
| `action-primary` | le-500 | le-400 | Colores de hover y elementos de acento principal |
| `action-secondary` | le-800 | le-100 | Botones principales y handles de slider |
| `action-tertiary` | tinted-500 | tinted-400 | Bordes activos y elementos secundarios |
| `border` | tinted-200 | tinted-700 | Divisores y bordes de tarjetas |

El modo oscuro se activa mediante la clase `.dark` en la etiqueta `<html>`, persistida en `localStorage['mel-color-scheme']` y procesada antes del primer pintado en `Layout.astro`.

---

## Sombras, Dims y Elevaciones

**Un único primitivo para TODAS las sombras y scrims del sitio: Tinted 950** (`hsla(345,20%,8%)` ≈ `#181012`). No se usan negros sueltos (`rgba(0,0,0,…)`) ni granates ad-hoc (`rgba(38,31,31,…)`, `rgba(25,6,9,…)`, etc.): quedaron unificados. Definido en `global.css` como canales separados por espacio para poder variar la opacidad con la sintaxis `rgb(… / alpha)`:

```css
--mel-shadow-rgb: 24 16 18;   /* Tinted 950 */
```

Es un **primitivo fijo** (no se sobrescribe en `.dark`): el color de sombra es idéntico en ambos temas. Para que una sombra/dim **se note también en modo oscuro** (donde una sombra oscura sobre fondo oscuro sería invisible) la capa se pinta con `mix-blend-multiply`. Esto solo es aplicable a **capas independientes** (dims, sombra del pliegue del bottom sheet); las `box-shadow` normales de botones/tarjetas no admiten blend mode, así que unifican el color pero en oscuro quedan sutiles (comportamiento estándar).

### Tokens de elevación (todos derivan de `--mel-shadow-rgb`)

| Token | Valor | Uso |
| --- | --- | --- |
| `--mel-shadow-sm` / `--mel-shadow-md` / `--mel-shadow-xl` | equivalentes a las utilidades de Tailwind, recoloreados | Tarjeta de galería, miniaturas, botones menores |
| `--mel-shadow-button` | `0 4px 8px / .32` | `IconButton` primario, botón cerrar, indicador del toggle, marcador de mapa |
| `--mel-shadow-handle` | `0 4px 4px / .32` | Handles del `TimeSlider` |
| `--mel-shadow-marker-active` | `0 4px 16px / .32` | Marcador de mapa en hover/activo |
| `--mel-shadow-menu` | `0 8px 32px / .24` | Panel del `SideMenu` |
| `--mel-shadow-toggle-inset` | `inset 0 0 8px / .16` | Grabado interior del `ToggleSelector` |
| `--mel-shadow-flyer-label` | `0 -4px 10px / .15` | Barra inferior informativa de `FlyerCard` |
| `--mel-dim` | `rgb(var(--mel-shadow-rgb) / .8)` | Scrim de overlays (SideMenu, lightbox, bottom sheet). **Siempre con `mix-blend-multiply`.** |

Uso: `shadow-[var(--mel-shadow-button)]` (Tailwind) o `box-shadow: var(--mel-shadow-menu)` (CSS). Para un color puntual con otra opacidad: `rgb(var(--mel-shadow-rgb) / 0.10)`.

> **Excepción — Duotono fotográfico:** el tinte de `EmptyState`/`/info` NO es una sombra; usa `bg-[var(--mel-primitive-le-900)]` + `mix-blend-screen` (regla propia, ver D-016). No lo mezcles con el sistema de sombras.

---

## Tipografía

Fuentes del proyecto:
- **Space Grotesk**: Tipografía Sans para la interfaz de usuario (UI, títulos, botones, badges).
- **Lora**: Tipografía Serif para valores de datos, enlaces principales y contenido narrativo.

Clases utilitarias `typo-*` en `global.css` (responsive, diseño móvil primero con overrides en `md`):

| Clase Utilitaria | Móvil | Desktop (≥768px) | Uso principal |
| --- | --- | --- | --- |
| `typo-lead` | Sans 17/26 · 500 · −2% | 16/26px | Texto de introducción y resúmenes |
| `typo-body-sans` | Sans 17/28 · 400 · −2% | 16/28px | Cuerpo de texto Sans estándar |
| `typo-body-roman` | Lora 16/24 · 500 · +1% | 15/24px | Valores de datos, celdas y enlaces de artistas |
| `typo-h3` | Sans 22/28 · 700 · −2% | 25/32 | Encabezados de sección |
| `typo-caption` | Sans 16/20 · 500 | 14/18px | Captions, notas, badges y botón "Me presta" |
| `typo-overline` | Sans 13/16 · 700 · +12% · uppercase | 12px | Etiquetas superiores de datos (*OVERLINE*) |
| `typo-button` | Sans 17/26 · 700 · −2% | 16/26px | Texto interno de botones de acción |

---

## Espaciado y Layout

Tokens de espaciado: `--mel-spacing-xs/s/sm/m/l/xl` = 4 / 8 / 12 / 16 / 24 / 32px.
- **Grid de Página**: 12 columnas, `gap-6` (24px), ancho máximo `1440px`, padding lateral `px-6 / sm:px-12 / md:px-[108px]`.
- **Espaciados Verticales en `vh`**: Header `pt-[10vh]`, fondo de página `pb-[3vh]`, reservas de paginación `6vh` (Lista con números) / `13vh` (Galería) / `7vh` (Lista). La Intro utiliza valores relativos en `%` del ancho.

---

## Pliegue del bottom sheet (Figma 656:70560)

El borde superior del bottom sheet lleva una **esquina doblada** de 40×40 arriba
a la derecha. En Figma el fondo del sheet llega ya con esa esquina **cortada**
(`M0 0 H353 L393 40 V64 H0 Z`), y como el lienzo de detrás es del mismo tono, el
hueco se lee como la cara clara del papel doblado con su sombra.

**Estado actual: solo el corte, sin doblez.** La esquina se recorta con
`clip-path` sobre `#map-side-panel` (bajo `lg`) y ahí se queda. Emular el pliegue
en CSS se intentó tres veces sin resultado convincente; queda pendiente
resolverlo aportando la cabecera como imagen en versión clara y oscura (ver
`roadmap.md`).

Tres variantes probadas y descartadas, por si alguien vuelve sobre ello:

| Intento | Por qué no |
| --- | --- |
| Triángulo más **oscuro** (`bg-secondary`) | Se leía como un parche de color pegado en la esquina, no como papel |
| **Recorte real** (`clip-path` sobre el sheet) | Literalmente lo que hace Figma, pero aquí deja ver el mapa y parece una ventana |
| Triángulo del **mismo color** exacto | Solo queda la sombra, tan sutil que el pliegue desaparece |
| Triángulo más **claro** + `drop-shadow` | Apenas se distinguía en claro; en oscuro se leía como un triángulo de otro color, no como papel |

---

## Inventario de Componentes UI

| Componente | Variantes / Estados | Descripción y Especificación |
| --- | --- | --- |
| `<EmptyState />` | `construction` / `no-results` | Componente de estado vacío con imagen en B/N y capa `bg-[var(--mel-primitive-le-900)]` en modo `mix-blend-screen` para lograr el tinte fotográfico duotono de la marca. |
| `<IntroAnimation />` | — | Pantalla de inicio con 3 capas CMYK (`mix-blend-multiply`) aisladas con `isolation: isolate`. Parallax interactivo del ratón (Amarilla 16px/1px blur, Magenta 8px/0.5px blur, Cian 0px estática) y despegue ease-in de 2.1s. |
| `<HeaderTitle />` | default / placeholder / filling / filled | Buscador de 4 estados con expansión animada de ancho en píxeles medidos y línea inferior de acento. |
| `<TimeSlider />` | — | Selector de rango de años (2004–2019) con dos handles arrastrables y clamping estricto. |
| `<ToggleSelector />` | Galería / Mapa / Lista | Conmutador de 3 posiciones con píldora deslizante mediante `transform`. |
| `<TagWithLink />` | Default / Disabled | Etiqueta de metadata (*OVERLINE + Valor*) con truncado mediante `ellipsis` obligatorio. |
| `<Link />` | Default / Hover / Disabled | Enlace Lora con subrayado animado `scaleX` (0→1) en hover e icono de chevron deslizante opcional. |
| `<LikeButton />` | Resting / Active | Botón *"Me presta"* con borde `action-secondary` y animación de despliegue de checkmark. |
| `<SideMenu />` | Abierto / Cerrado | Panel lateral deslizable (496px) con selector de tema, disparo de intro y badge *"Nuevo"*. |
| `<FlyerCard />` | Resting / Hover | Tarjeta de la galería con escala ligera `scale-[1.02]` en reposo → `1.04` en hover, overlay de rayas y barra inferior informativa. |
| `<EventCardList />` | Default / Hover | Fila compacta de evento (miniatura 56×56 en fit sobre fondo secundario, título, fecha, chevron). Réplica JS en `buildEventCardListHtml()`. Usada en el panel del mapa y en la Lista en móvil. |
| `<BottomSheetHeader />` | — | Cabecera decorativa reutilizable de bottom sheets (Figma `269:11222`): tirador **rectangular** (80×5, sin redondear) + pliegue diagonal en la esquina superior derecha. El recorte del pliegue lo aporta el `clip-path` del contenedor del sheet; el componente pinta el tirador y la sombra del pliegue (SVG `feGaussianBlur`, `mix-blend-multiply`). Escala en horizontal sin límite. **Nada redondeado.** |
| `<IconButton />` (D-081) | `type`: Primary / Phantom · `size`: 40 / 24 · Resting / Hover / Pressed | Botón de icono estándar del DS, matching Figma "Icon Button" (`111:3929`). Primary: fondo sólido (`action-secondary` → hover `action-primary` → pressed `text-tertiary`), sombra + blur, icono en `text-on-action`. Phantom: transparente, solo color de icono (`action-secondary` → hover `action-primary` → pressed `action-tertiary`). `size=40` aloja icono de 24px/stroke 3; `size=24` aloja icono de 16px/stroke 2. Prop `href` opcional renderiza `<a>` en vez de `<button>` (para cierres que son enlaces reales, no solo controles JS). Los iconos (`x`, `search`, `chevron-left`, `chevron-right`, `menu`) son SVG trazados a mano estilo [Lucide](https://lucide.dev) (MIT, sin dependencia añadida) — **nunca símbolos de Apple/SF Symbols**, aunque el archivo de Figma de origen sí los use como placeholder. Icono puro sin chrome de botón disponible por separado en `<Icon />`, para casos donde no puede anidarse un `<button>` (p. ej. `MenuItem.astro`, que ya es el propio botón interactivo). |

---

## Reglas UX e Interacción

1. **Subrayado de Enlaces**: Animado mediante `transform: scaleX()` desde la izquierda (nunca `text-decoration` nativo).
2. **Tinte Fotográfico Duotono**: Toda fotografía decorativa en blanco y negro (EmptyState, acordeones `/info`) debe incorporar la capa de mezcla `bg-[var(--mel-primitive-le-900)] mix-blend-screen`.
3. **Truncado de Celdas y Valores**: Ningún valor de tag o celda de lista debe realizar salto de línea; se fuerza el truncado con `ellipsis` y, en la tabla de la lista, efecto *marquee* al pasar el ratón.
4. **Protección de Imágenes**: Atributo `select-none`, `-webkit-user-drag: none` y deshabilitación del menú contextual en toda la galería y visores.
5. **Esquinas rectas (sin `border-radius`)**: **NADA en la web tiene bordes redondeados.** Botones, tarjetas, tiradores, sheets, badges, inputs… todo con esquinas rectas. El único recurso decorativo de borde es el **pliegue diagonal** del bottom sheet (`clip-path`, ver `BottomSheetHeader`). Si un mockup parece redondeado, es una ilusión del pliegue o un error de lectura.
6. **Sombras y dims unificados**: Toda sombra/scrim usa el primitivo `--mel-shadow-rgb` (Tinted 950) vía los tokens de elevación; los dims llevan además `mix-blend-multiply` para notarse en oscuro (ver sección *Sombras, Dims y Elevaciones*).
7. **Offset superior en móvil**: `pt-[10vh]` (header común de todas las páginas) se reduce 24px por debajo de `md` — `pt-[calc(10vh-24px)] md:pt-[10vh]` — para subir el contenido en pantallas pequeñas. El `SideMenu` ajusta su `min-h` en paralelo para alinear el botón de cerrar.

## Transiciones de Navegación

### Fundido v1 (D-074)

Patrón mínimo para suavizar una **navegación real de página** (recarga dura — `window.location.href`, nunca `document.startViewTransition()` ni el `ClientRouter` de Astro; ver "Por qué recarga dura, no `ClientRouter`" más abajo). Dos mitades independientes, sin dependencias entre sí:

**Entrada (fade-in)** — CSS puro, ya activo sitewide, no requiere nada por página:
```css
/* src/layouts/Layout.astro, aplicado a <body> */
body { animation: mel-fade-in 0.25s ease; }
@keyframes mel-fade-in {
## Transición Estándar de Página: **Morphing v1** (D-074 / D-090)

Toda navegación entre la Home y los eventos o entre eventos colindantes utiliza el sistema unificado **Morphing v1**:

1. **Precarga Silenciosa W3C (`prefetch`)**:
   - Inyección de etiquetas `<link rel="prefetch">` para los eventos *Anterior* y *Siguiente* en el `<head>` de `event/[id].astro`.
   - Listener de `pointerenter` en las tarjetas de la Home (`index.astro`) que descarga el HTML del evento antes de pulsar.
2. **Navegación Fluida con View Transitions**:
   - `Layout.astro` expone la función de enrutado nativo `window.__melNavigate` (`astro:transitions/client`).
   - Las navegaciones entre eventos (`/event/A` → `/event/B`) y la apertura desde la Home invocan `window.__melNavigate(url)`, activando `View Transitions` nativas del W3C con morphing orgánico de imágenes (`view-transition-name: flyer-img-[id]`) y fundido cruzado sin pantallas en blanco.
3. **Persistencia y Recarga Limpia al Cerrar (`X` → `/`)**:
   - Para proteger el canvas de Google Maps y el masonry de la Home contra desincronizaciones de memoria (regla `D-072`), el botón de cierre ejecuta recarga limpia (`window.location.href = '/'`).
   - El estado del usuario (filtros, año, vista activa y scroll) se recupera automáticamente mediante `sessionStorage` (`saveReturnState` / `restoreReturnState`).

```js
// Enrutado nativo Morphing v1
if (typeof window.__melNavigate === 'function') {
  window.__melNavigate(url);
} else {
  document.body.style.transition = 'opacity 0.15s ease';
  document.body.style.opacity = '0';
  setTimeout(() => { window.location.href = url; }, 150);
}
```
