# Design System

Fuente de verdad: el archivo de Figma
[Memoria Electrónica Leonesa](https://www.figma.com/design/BuItQAgdEVZaTSeFjZwRNZ/Memoria-Electr%C3%B3nica-Leonesa)
y su implementación en `src/styles/global.css`. Muchos elementos del código
llevan `data-node-id` con el nodo de Figma del que provienen.

Nodos de Figma de referencia usados durante el desarrollo:

| Nodo | Qué es |
| --- | --- |
| `606-43396` | Sección completa de Mobile (moléculas, organismos, pantallas) |
| `634-41290` | Detalle de evento móvil (construcción/anatomía) |
| `369-31311` | Highlights / Mobile (tags con scroll horizontal) |
| `315-17658` | Toolbar / Mobile (slider a sangre + highlights + toggle) |
| `908-41998` | Lightbox de imagen (padding uniforme 24px) |
| `841-40903` | Modal del lightbox (caja fija, foto object-contain) |
| `825-72958` | EmptyState |
| `562-70116` | SideMenu con badge "Nuevo" |

## Color

Definido en `src/styles/global.css` como primitivas HSL + variables semánticas,
expuestas a Tailwind vía `@theme` (`--color-mel-*`). **Usa siempre las
semánticas** (`bg-mel-bg-primary`, `text-mel-text-secondary`,
`bg-mel-action-primary`…), nunca primitivas sueltas ni hex.

Dos paletas primitivas: **Leon Orig** (`--mel-primitive-le-50…950`, granates
saturados) y **Leon Tinted** (`--mel-primitive-tinted-50…950`, neutros
rosados), más los primarios CMYK (`cian`, `magenta`, `yellow`) usados en la
intro.

| Semántica | Claro | Oscuro |
| --- | --- | --- |
| `bg-primary` | tinted-50 | le-950 |
| `bg-secondary` | tinted-100 | tinted-900 |
| `bg-tertiary` | tinted-200 | tinted-800 |
| `text-primary` | le-950 | tinted-50 |
| `text-secondary` | tinted-600 | tinted-200 |
| `text-tertiary` (deshabilitado/"desconocido") | tinted-400 | tinted-500 |
| `text-on-action` | tinted-50 | tinted-900 |
| `action-primary` (hover/acento) | le-500 | le-400 |
| `action-secondary` (botones/handles) | le-800 | le-100 |
| `action-tertiary` | tinted-500 | tinted-400 |
| `border` | tinted-200 | tinted-700 |

El modo oscuro es la clase `.dark` en `<html>`, persistida en
`localStorage['mel-color-scheme']` y aplicada antes del primer pintado
(script inline en `Layout.astro`).

## Tipografía

Fuentes: **Space Grotesk** (sans, UI) y **Lora** (serif, valores/datos).
Clases utilitarias `typo-*` en global.css, responsive (móvil primero, override
en `md`):

| Clase | Móvil | Desktop (≥768) | Uso |
| --- | --- | --- | --- |
| `typo-lead` | Sans 17/24 · 500 · −2% | 16px | Texto destacado |
| `typo-body-roman` | Lora 16/24 · 500 · +1% | 15px | Valores, datos, enlaces |
| `typo-h3` | Sans 22/28 · 700 · −2% | 25/32 | Títulos de sección |
| `typo-caption` | Sans 16/20 · 500 | 13/16 | Captions, badges |
| `typo-overline` | Sans 13/16 · 700 · +12% · uppercase | 12px | Etiquetas de tag |
| `typo-button` | Sans 17/24 · 700 · −2% | 16px | Botones |

Títulos grandes usados directamente con utilidades: título de página/buscador
22/28 −0.44px; título de evento 31/32 −0.62px (desktop) y 28/32 −0.56px
(móvil); H2 de EmptyState 28/32 −0.56px.

## Espaciado

Tokens: `--mel-spacing-xs/s/sm/m/l/xl` = 4/8/12/16/24/32px
(Tailwind: `gap-mel-xl`, `p-mel-m`…). Grid de página: 12 columnas, `gap-6`
(24px), ancho máximo 1440px, padding lateral `px-6 / sm:px-12 / md:px-[108px]`.

**Espaciados verticales de página en `vh`** (calibrados a la pantalla 4K del
propietario, ver decisions.md D-009): header `pt-[10vh]`, fondo de página
`pb-[3vh]`, reserva de paginación `6vh` (con paginación) / `13vh` (galería sin
paginación) / `7vh` (lista sin paginación). La intro usa `%` del ancho
(padding 7.5%, márgenes del divisor 3.3%).

## Breakpoints y patrones responsive

- **`md` (768px)**: colapso del header — título → "M.E.L.", menú → solo icono,
  fila única con gap 16px móvil / grid 12 col desktop.
- **`lg` (1024px)**: cambio de layout del detalle de evento y de los highlights.

Patrones móviles establecidos:

- **Fila de tags con scroll horizontal** (highlights y tags de evento): tags a
  ancho de contenido, separadores verticales `border-l border-mel-border`,
  gap 24px, `overflow-x-auto no-scrollbar`. CSS compartido: `.event-tags-row`
  en global.css.
- **Imagen a sangre**: márgenes negativos que cancelan el padding de página
  (`-mx-6 w-[calc(100%+48px)] sm:-mx-12 …`), igual que el TimeSlider.
- **Reordenación con `order-*`** en vez de duplicar bloques (excepción: título
  de evento, duplicado y alternado con `lg:hidden` / `hidden lg:block`).

## Componentes (inventario)

| Componente | Estados / variantes | Notas |
| --- | --- | --- |
| `Link` | Default, Hover, Disabled; `hideChevron`, alineación L/C/R | Lora Body Roman, subrayado scaleX 0→1 en hover (0.2s, origen izquierda), chevron deslizante opcional. Color secondary → action-primary en hover |
| `TagWithLink` | `hideBorder`, `state=Disabled`, alineación | OVERLINE + valor (Link o texto); ancho por defecto 184px salvo clase `w-*`; valor siempre con ellipsis (nunca 2 líneas) |
| `IconButton` | `variant: ghost/outline/phantom`, tamaños | Botones de icono (cerrar, flechas, limpiar búsqueda) |
| `LikeButton` ("Me presta") | resting / active | Borde action-secondary; activo: fondo relleno + checkmark que se despliega |
| `ToggleSelector` / `ToggleButton` | activo / inactivo | Indicador deslizante con `translate3d`, activo bg action-secondary + sombra |
| `TimeSlider` + `SliderHandler` | — | Handles con año, drag con clamping; a sangre en móvil |
| `HeaderTitle` | default / placeholder / filling / filled | Buscador de 4 estados; subrayado 2px action-primary que crece/retrae; anchura animada entre px medidos |
| `PaginationDot` | Resting / Active / hover | Punto 8px; activo: marco 24px con borde action-tertiary |
| `EmptyState` | `construction` / `no-results` | Imagen duotono + título + descripción + botón opcional |
| `SideMenu` | — | Panel derecho 496px, backdrop, badge "Nuevo" (CAPTION sobre action-primary), toggle de tema |
| `FlyerCard` / tarjeta de galería | resting / hover | Imagen `scale-[1.02]` en reposo (oculta bordes feos) → `1.04` en hover; overlay de rayas y barra inferior en hover |
| `IntroAnimation` | — | Tres capas CMYK `mix-blend-multiply` con parallax al ratón; ascensión escalonada al salir |

## Reglas de UX

- **Hover de enlaces**: color → `action-primary` + subrayado animado scaleX
  (nunca `text-decoration` nativo). Distancia texto–subrayado: la del
  componente `Link` (en la tabla de la lista, 3px vía `padding-bottom`).
- **"Desconocido"/"No detallados"**: texto `text-tertiary`, sin enlace, sin
  contar en estadísticas.
- **Imágenes protegidas** en todo el sitio: sin menú contextual, sin arrastre
  (`-webkit-user-drag: none` + listeners en Layout), `select-none` en zonas de
  UI.
- **Ellipsis obligatorio** en valores de tags y celdas: un valor nunca hace
  wrap ni desborda; en su lugar se trunca (y en la tabla, marquee al hover si
  desborda).
- **Lightbox**: caja cuadrada 76vh (máx 92vw), padding uniforme 32px en los
  cuatro lados; si hay varias imágenes, `pb-4` + fila de dots (la fila se
  oculta por completo con ≤1 imagen, no solo se vacía).
- **Paginación**: sin flechas visibles "de momento" (los IconButton siguen en
  el DOM con `invisible`); se oculta con una sola página, dejando la reserva
  de espacio en vh; separación superior generosa (`pt-10`).
- **Fondo rayado** (`striped-bg`) como fondo de todas las cajas de imagen.
- **Tinte fotográfico**: capa `bg-[var(--mel-primitive-le-900)]` +
  `mix-blend-screen` sobre fotos en b/n (EmptyState, acordeones de /info).
- **Animaciones**: duraciones 200–500ms; reveals con fade+translate; salidas de
  tarjetas 320ms fade+scale(0.94); crossfade de carrusel 500ms.
