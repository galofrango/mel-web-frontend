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
| `1073-114391` | EmptyState variante *404* (foto de la caja de ritmos) |
| `562-70116` | SideMenu con badge "Nuevo" |

---

## Color

Definido en `src/styles/global.css` como primitivas HSL + variables semánticas, expuestas a Tailwind CSS v4 vía `@theme` (`--color-mel-*`). **Usa siempre las variables semánticas** (`bg-mel-bg-primary`, `text-mel-text-secondary`, `bg-mel-action-primary`…), nunca primitivas sueltas ni valores hex directos.

Dos paletas primitivas:
- **Leon Orig** (`--mel-primitive-le-50…950`): Granates saturados característicos de la marca.
- **Leon Tinted** (`--mel-primitive-tinted-50…950`): Neutros rosados para fondos y textos secundarios.
- **Primarios CMYK** (`cian`, `magenta`, `yellow`): Usados en la experiencia de la Intro Animada.
- **Banner Colors** (`--mel-primitive-b-/g-/y-200|400|600`): Azul, verde y amarillo para los banners de aviso. Nombres y pasos calcados del grupo homónimo de Figma. Están los nueve aunque hoy solo se usen los tres amarillos: esta capa es el espejo de Figma, y un espejo con huecos no sirve para comparar. Es la única rampa en HEX y no en HSL, a propósito — ver el comentario en `global.css`.

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
| `banner-error-border` | le-500 | *(igual)* | Franja de 8px de gravedad nivel 1 en `/panel` |
| `banner-warning-border` | y-400 | *(igual)* | Franja de 8px de gravedad nivel 2 en `/panel` |
| `banner-warning-bg` | y-200 | *(igual)* | Fondo del banner de aviso de `/panel` |
| `banner-warning-text` | y-600 | *(igual)* | Texto e icono de ese banner |

**La familia `banner`** es traducción literal de las variables de Figma (`Border/Banner Error`, `Background/Banner Warning`…) para que las dos listas se comparen de un vistazo, aunque el uso desborde el nombre: los dos `*-border` son además el código de color por gravedad. Del banner **solo existe la variante de aviso**: en el diseño la usan igual las secciones de nivel 1 que las de nivel 2, y lo que distingue la gravedad es la franja, no el banner. Son los únicos semánticos que **no cambian con el tema** — un aviso tiene que leerse igual de urgente de noche que de día.

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

> **Interletrado e interlineado**: Lead, Body y Button comparten **−1%** y **28**,
> los dos valores de Body, por decisión del propietario (30/07/2026). El 28 se
> afinó en su día para que el bloque de texto pesara lo mismo que Body Roman;
> Lead y Button se habían quedado en 26. El interletrado sale de Figma, que
> tenía Lead y Button en −2% y Body en −1%.
>
> **Dónde manda cada uno.** Los INTERLINEADOS de Lead, Body y Button (28)
> y el escritorio de Caption (14/18) se ajustaron aquí después de dibujar
> el DS y **no se actualizaron en Figma**, que sigue diciendo 24 y 13/16. Manda
> este fichero; Figma es lo que hay que corregir. Los TAMAÑOS y el
> INTERLETRADO, en cambio, salen de Figma. Verificado contra el archivo el
> 30/07/2026 y contra el historial de git (`a9ddb2b`, `abee25c`, `072792d`).

### Licencias del sistema

Tres sitios se salen del DS **a propósito**. No son descuidos y no hay que
"arreglarlos" en la próxima pasada:

| Dónde | Qué usa | Por qué |
|---|---|---|
| Título del header **en reposo** (`HeaderTitle.astro`) | Sans 22/28 · **600** · `text-tertiary`, a pelo | El **peso 600 no existe en el DS**, y `typo-h3` (700) le gana a un `font-semibold` puesto al lado, así que este elemento no puede usar la clase. El resto de la fila —"Menú", campo del buscador, texto buscado y el título de las páginas sin buscador— **sí usa `typo-h3`**. El 600 viene de decisiones abiertas en [insights.md](insights.md): contraste aplazado y el interletrado del "efecto arroz glutinoso". Se normaliza cuando eso se cierre |
| Placeholder de ese mismo campo | **20px · peso 400** (`placeholder:text-[20px] placeholder:font-normal`) | Más pequeño y más fino que el texto escrito (22/700), para que se distinga lo tecleado de la invitación a teclear |


| Clase Utilitaria | Móvil | Desktop (≥768px) | Uso principal |
| --- | --- | --- | --- |
| `typo-h0` | Sans 40/40 · 700 · −4% | 49/48px | Título de sección de página |
| `typo-h1` | Sans 32/40 · 700 · −3% | 39/40px | — (definido, aún sin uso) |
| `typo-h2` | Sans 28/32 · 700 · −2% | 31/32px | Títulos grandes: estados vacíos, ficha, panel del mapa |
| `typo-h4` | Sans 20/24 · 700 · −2% | 20/24px | Títulos de acordeón |
| `typo-lead` | Sans 17/28 · 500 · **−1%** | 16/28px | Texto de introducción y resúmenes |
| `typo-body-sans` | Sans 17/28 · 400 · **−1%** | 16/28px | Cuerpo de texto Sans estándar |
| `typo-body-roman` | Lora 16/24 · 500 · +1% | 15/24px | Valores de datos, celdas y enlaces de artistas |
| `typo-h3` | Sans 22/28 · 700 · −2% | **22/28 (no escala)** | Fila del header: "Menú", buscador, título de páginas sin buscador |
| `typo-caption` | Sans 16/20 · 500 | 14/18px | Captions, notas, badges y botón "Me presta" |
| `typo-overline` | Sans 13/16 · 700 · +12% · uppercase | 12px | Etiquetas superiores de datos (*OVERLINE*) |
| `typo-button` | Sans 17/28 · 700 · **−1%** | 16/28px | Texto interno de botones de acción |

---

## Espaciado y Layout

**Tokens de espaciado**: `--mel-spacing-xs/s/m/l/xl` = **8 / 16 / 24 / 32 / 40px**.
Utilidades Tailwind correspondientes: `gap-mel-s`, `pb-mel-m`, etc.

> Escala revisada el 29-07-2026 a petición del propietario (antes 4/8/12/16/24/32
> con un `sm` intermedio, ahora retirado). Se pudo cambiar sin romper nada porque
> de los seis tokens **solo uno se usaba en el marcado**. Al reescalar, el hueco
> de la galería —que debe seguir siendo 24px— pasó de `mel-l` a `mel-m`.
> **Cuidado**: ese valor está también escrito a mano en `GALLERY_GAP` (JS), y los
> dos números tienen que coincidir o el masonry se descuadra.

**Huecos verticales de la home**: salen de esta escala y se aprietan un paso en
móvil, donde el alto es el recurso escaso — `S` por debajo de `md`, `M` a partir
de ahí. Medido en una pantalla de 812px: los controles ocupaban 328px (el 40% de
la pantalla) y la galería 484; tras apretarlos, **la galería pasa a 524px**.
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

## Campos sin dato

Regla del sitio: **un campo sin dato no enseña el hueco, lo ofrece.** Donde iría
el valor aparece un enlace **"¿Nos ayudas?"** a `/info#contacto` (la sección
"Si tienes material que nos falta", que llega con sus acordeones desplegados).

La hoja marca la ausencia con varios centinelas, no solo uno: `desconocido`,
`sin fecha`, `no detallados` y `varios`. Los cuatro reciben el mismo trato —y el
campo **vacío** también: es el mismo hueco, solo que sin etiquetar. Por eso el
bloque de artistas ya no se oculta cuando el campo viene vacío; en un archivo la
laguna es información («de este evento no sabemos quién pinchó») y ocultarla
borra además la ocasión de pedirla.

Corolario: **nada se rellena con un valor inventado en el parseo**. `lugar` traía
`'León'` por defecto, que fabricaba un local inexistente y encima impedía para
siempre que ese campo mostrase la invitación.

El término detectado se **sustituye**, no se acompaña: la invitación ocupa el
sitio del valor en vez de añadirse debajo, así que sirve para todas las tags sin
que ninguna crezca de alto ni de ancho. La versión anterior —valor inerte en
terciario más un enlace suelto debajo, y solo en artistas— queda derogada.

Lo que enlaza es la invitación, no el dato: buscar el archivo por "Desconocido"
no lleva a ninguna parte útil, y por eso un enlace cuya etiqueta fuese
"Desconocido" seguiría estando mal — nadie adivina a dónde va.

Se aplica en los tags de la ficha y en la lista de artistas
(`getTagDisplay` / `AYUDA_TEXTO` en `event/[id].astro`). **Excepción: la vista
Lista.** Ahí el valor sigue inerte en `text-tertiary` (`celdaSinDato` en
`index.astro`): son hasta 50 filas por página y repetir la misma llamada decenas
de veces la convierte en ruido de fondo. La invitación se gana su sitio en la
ficha, donde hay una sola.

---

## Inventario de Componentes UI

| Componente | Variantes / Estados | Descripción y Especificación |
| --- | --- | --- |
| `<EmptyState />` | `construction` / `no-results` / `404` | Componente de estado vacío con imagen en B/N y capa `bg-[var(--mel-primitive-le-900)]` en modo `mix-blend-screen` para lograr el tinte fotográfico duotono de la marca. |
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
3. **Cierre (`X` → `/`)**:
   - El botón de cierre es un enlace normal, así que la vuelta a Galería y a Lista es **navegación suave** con su transición. La recarga limpia (`data-astro-reload`) se reserva para la vuelta a un panel de mapa abierto, donde la transición llegaba a destiempo (D-117).
   - El estado del usuario (filtros, año, vista activa, lotes cargados, scroll y **qué flyer se estaba mirando**) se recupera mediante `sessionStorage` (`saveReturnState` / `applyReturnState`).
   - Volviendo a Galería, el contenedor se **oculta mientras se coloca** y se revela con un fundido de 0,25s, para que no se vea el recorrido hasta el flyer (D-122). Ese fundido exige un reflow forzado entre ocultar y revelar; sin él no se crea ninguna transición.
   - **El morphing es solo de ida.** A la vuelta no lo hay y **está descartado**, no pendiente: al capturar el estado final la galería aún es la del SSR y la tarjeta de destino no está en su sitio, así que el cartel volaría a donde no es (D-122).

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


## Estado pulsado en táctil (provisional)

En un móvil no hay `hover`, y el diseño solo define ese estado: se toca un botón
y no cambia nada hasta que la acción termina. `:active` **es** el pseudo-estado
nativo de "pulsado", así que no hay que inventar nada — solo usarlo.

Mientras cada componente no tenga su estado pulsado diseñado, `global.css`
aplica una respuesta **uniforme y neutral** bajo `@media (hover: none)`: opacidad
0,55 y `transition-duration: 0s` sobre enlaces, botones, `summary` y `.filter-tag`.
La duración a cero es deliberada: la realimentación al pulsar tiene que ser
inmediata, no una transición de 200ms que llega cuando ya has soltado el dedo.

**No se puede "usar el hover como pulsado" sin más**: las clases `hover:` de
Tailwind compilan a selectores `:hover`, y remapearlas en bloque exigiría tocar
la configuración del framework, con efecto en todo el sitio.


## Cuándo NO debe verse el estado pulsado

Dos casos, los dos detectados usando el sitio en un teléfono:

1. **Lo que no hace nada no se pulsa.** Los recuentos de la home y del panel
   (Eventos, Artistas, Diseñadores…) llevan la clase `.filter-tag` y estaban en
   la regla genérica de atenuado, así que se apagaban al tocarlos sin ser
   pulsables: prometían una acción inexistente. Una tag que sí enlaza entra por
   `a:active`, porque su valor es un enlace de verdad.

2. **Desplazar no es pulsar.** El navegador enciende `:active` en cuanto tocas y
   lo mantiene durante todo el gesto, así que arrastrar para hacer scroll sobre
   una lista dejaba sus filas iluminadas como si fueran a abrirse. Un oyente en
   `Layout.astro` marca la raíz con `mel-desplazando` en cuanto el dedo se mueve
   más de 8px, y el CSS anula el pulsado mientras dure. Por debajo de ese umbral
   —un dedo quieto que tiembla— el pulsado sí se ve, que es lo que se quiere.
   La marca se retira en el fotograma siguiente al `touchend`: quitarla en el
   acto deja que el `:active` residual pinte un parpadeo al levantar el dedo.
