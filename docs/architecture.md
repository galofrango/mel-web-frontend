# Arquitectura

## Visión general

MEL es una web Astro en modo **SSR** (`output: 'server'`, adapter
`@astrojs/vercel`). No hay backend propio ni base de datos: cada página que
necesita datos hace `fetch` a una hoja pública de Google Sheets en el frontmatter
(en el servidor, en cada request) y renderiza HTML con esos datos. El navegador
recibe la página ya poblada; el JavaScript de cliente (vanilla) añade la
interactividad (filtros, vistas, mapa, overlays, animaciones).

```
Google Sheets (gviz JSON) ──fetch SSR──▶ frontmatter Astro ──▶ HTML servido
Google Drive (imágenes)  ──thumbnail──▶ <img referrerpolicy="no-referrer">
Google Maps JS API       ──script────▶ vista Mapa (cliente)
```

La navegación entre páginas usa el `ClientRouter` de Astro (View Transitions),
salvo excepciones deliberadas que fuerzan recarga dura (ver decisions.md).

## Fuente de datos: la hoja de Google Sheets

`SHEET_ID = 1buzisIlDkCo2Rj5BYZh5-JKrAYSo3RSuBXYmJVGYT0E`

Se lee con el endpoint gviz:
`https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:json[&sheet=NOMBRE]`
La respuesta es JSONP; se extrae con la regex
`google\.visualization\.Query\.setResponse\((…)\);` y se parsea como JSON.

### Pestaña principal (archivo de eventos; por defecto, sin `sheet=`)

Cada **fila = una imagen** de un evento. Columnas usadas (índice → campo):

| Índice | Campo | Notas |
| --- | --- | --- |
| 0 | `evento` | Nombre del evento |
| 2 | `urlDrive` | Enlace de Google Drive a la imagen |
| 3 | `fecha` | `d/m/aaaa` (se usa `.f` formateado si existe) |
| 4 | `lugar` | Sala/lugar ("Desconocido" = sin dato) |
| 5 | `localidad` | Municipio |
| 6 | `coordenadas` | Coordenadas DMS o enlace de Google Maps |
| 7 | `artistas` | Lista separada por `,`, `;` o `/` |
| 8 | `organiza` | Promotor |
| 9 | `descripcion` | Texto libre |
| 10 | `idMel` | Identificador `MEL-XXXXX` (obligatorio; filtra filas válidas) |
| 11 | `carruselOrder` | Orden de la imagen dentro del carrusel del evento |
| 13 | `disenador` | Diseñador del flyer |
| 16 | `existeOriginal` | — |
| 21 | `formato` | PNG, Flyer… |
| 24 | `notasArchivo` | — |
| 25 | `ocr` | Texto OCR de la pieza |

Las filas se **agrupan por `evento + fecha`** en objetos evento con
`carruselItems[]` (ordenados por `carruselOrder`), y se ordenan por fecha
ascendente. Valores centinela tratados como "sin dato": `desconocido`,
`no detallados`, `varios`, `SIN FECHA`.

### Pestaña "Página de Información" (`sheet=Página de Información`)

Mini-CMS de la página `/info`. Columnas: A nombre de sección, B orden de
sección, C tipo de módulo (`Párrafo` = subtítulo de sección, `Acordeón` = item),
D título del módulo, E orden del módulo, F imagen (URL; los enlaces de Drive se
convierten a thumbnail), G contenido (saltos de línea = párrafos). Añadir una
fila con una sección nueva crea la sección en la web sin tocar código. En el
contenido, los emails se convierten en `mailto:` y los `@handle` en enlaces a
Instagram (función `linkify` en info.astro).

### Imágenes (Google Drive)

`extractDriveImage(url)` convierte cualquier enlace de Drive
(`/file/d/ID/view` o `?id=ID`) en
`https://drive.google.com/thumbnail?id=ID&sz=w1000`, único formato que carga en
un `<img>`. Todos los `<img>` remotos llevan `referrerpolicy="no-referrer"`.
Requisito: el archivo en Drive debe ser público ("cualquiera con el enlace").

### Coordenadas

`parseCoords()` (index.astro) acepta coordenadas DMS
(`42° 52' 46.5" N 5° 23' 52.9" W`) y enlaces de Google Maps. Para los enlaces,
`scripts/fetch_sheet.py` los resuelve offline (siguiendo redirecciones) y
guarda el resultado en `src/data/resolved_coordinates.json`, con un diccionario
de fallback por localidad. Ese JSON se importa en build; si se añaden lugares
nuevos con enlace de Maps hay que volver a ejecutar el script.
<!-- TODO: documentar la invocación exacta del script (¿python3 scripts/fetch_sheet.py sin args?) y automatizarla si se añade contenido a menudo -->

## Páginas y responsabilidades

### `src/layouts/Layout.astro`
`<head>` común: fuentes (Space Grotesk, Lora), bootstrap de Google Maps (clave
incrustada) + MarkerClusterer, inicialización del tema claro/oscuro **antes del
primer pintado** (lee `localStorage['mel-color-scheme']`, aplica `.dark` en
`<html>`), `ClientRouter`, y protecciones globales de imágenes (bloqueo de menú
contextual y de arrastre). También resetea `document.body.style.opacity` en cada
`astro:page-load` (defensa frente al fade del EmptyState).

### `src/pages/index.astro` — la home (monolito, ~3600 líneas)
Contiene:

- **Fetch SSR** + agrupación de eventos (frontmatter).
- **Header** con buscador de estados (`HeaderTitle`) y menú lateral.
- **Toolbar**: `TimeSlider` (rango de años), highlights (`TagWithLink` ×4) y
  `ToggleSelector` (Galería/Mapa/Lista).
- **Estado global de cliente** en `window._melState` (archives, filtros, página,
  orden, instancias del mapa, overlay activo…). El estado sobrevive a las
  navegaciones suaves.
- **`filterArchives()` → `performDOMUpdates()`**: pipeline central de filtrado y
  re-render de la vista activa (galería/lista/mapa), envuelto en
  `document.startViewTransition` cuando está disponible. La galería usa FLIP +
  clones absolutos para animar reordenaciones y salidas.
- **Vista Mapa**: Google Maps + clustering por localización; los updates hacen
  diff de marcadores en lugar de reconstruir; panel lateral con los eventos del
  lugar seleccionado.
- **Vista Lista**: tabla `table-layout:fixed` con `<colgroup>` porcentual,
  ordenación por columnas, celdas con marquee/ellipsis y enlaces que fijan el
  buscador.
- **Overlay SPA de detalle** (`#event-details-overlay`): réplica del diseño de
  `event/[id].astro` renderizada por JS (`renderOverlayEvent()`); escribe
  `?detail=MEL-XXXX` en la URL para que sea compartible; navegación
  anterior/siguiente con crossfade del carrusel y FLIP de las secciones;
  flechas del teclado navegan entre eventos, y dentro del lightbox entre fotos.
- **Lightbox** de imagen (modal cuadrado 76vh, padding uniforme, dots).
- **Deep links soportados**: `?view=galería|mapa|lista`, `?search=…`,
  `?detail=MEL-XXXX`, `?intro=true`.

### `src/pages/event/[id].astro`
Página SSR de detalle por `idMel` (busca el evento en la hoja en cada request).
Mismo diseño que el overlay SPA pero renderizado en servidor. En desktop: grid
`184px / 496px / 496px` (tags / imagen / info) con navegación
Anterior/Siguiente 280px por debajo. En móvil se reordena (título → imagen a
sangre → tags en fila con scroll horizontal → info → nav en dos columnas)
mediante utilidades responsive `order-*` sobre los mismos bloques.

**Importante**: cualquier cambio de diseño aquí debe replicarse en el overlay
SPA de index.astro (y viceversa). Son dos implementaciones del mismo diseño.

### `src/pages/info.astro`
Página Proyecto/Equipo/Contacto alimentada por la pestaña "Página de
Información". Acordeones con foto (tinte fotográfico `mix-blend-screen`),
enlaces con estilo Body Roman (Lora).

### `src/pages/exposiciones.astro`
"Sala de Exposiciones": actualmente solo `EmptyState` variante construcción,
cuyo botón "De acuerdo" vuelve a la home con fade + recarga dura.

## Componentes de cliente destacados

| Componente | Rol |
| --- | --- |
| `HeaderTitle` | Buscador de 4 estados (título / placeholder / escribiendo / fijado) con anchura animada en px medidos y evento `mel-search` |
| `TimeSlider` + `SliderHandler` | Doble range 2004–2019 con handles arrastrables |
| `ToggleSelector` / `ToggleButton` | Conmutador Galería/Mapa/Lista con indicador deslizante |
| `TagWithLink` | Etiqueta título+valor (con `Link` opcional); se usa en highlights, sidebar de evento y navegación Anterior/Siguiente |
| `Link` | Enlace estilo Body Roman (Lora) con subrayado scaleX en hover y chevron opcional |
| `SideMenu` | Menú lateral (navegación, toggle de tema, disparo de la intro) |
| `IntroAnimation` | Intro CMYK; se dispara con `?intro=true` o el evento `mel-trigger-intro` |
| `EmptyState` | Estados vacíos (construcción / sin resultados) con tinte fotográfico |

## Comunicación entre módulos (eventos custom en `window`)

| Evento | Emisor → Receptor |
| --- | --- |
| `mel-search` | HeaderTitle → filtros de la home |
| `mel-set-search` | celdas de la lista / tags → HeaderTitle |
| `mel-switch-view` | SideMenu / IntroAnimation → conmutador de vistas |
| `mel-trigger-intro` | SideMenu → IntroAnimation |
| `mel-open-lightbox` | popups del mapa → lightbox |
| `mel-color-scheme-change` | SideMenu → reconstrucción del mapa (basemap claro/oscuro) |

## Patrones técnicos clave

- **Init idempotente**: todo se engancha en `astro:page-load`; los listeners de
  `window` usan `AbortController` para poder cancelarse en re-inits.
- **FLIP con transforms** para animaciones contenidas (nunca
  `view-transition-name` dentro de contenedores con overflow).
- **Coalescing con rAF** para no apilar `startViewTransition` en eventos de
  alta frecuencia (drag del slider).
- **Clones para animar salidas**: tarjetas que salen del filtro se clonan en
  `position:absolute` ancladas al grid (no `fixed`, para respetar el clipping
  del contenedor de scroll); el crossfade del carrusel del overlay sí usa un
  clon `fixed` (debe verse por encima de todo).
- **Espaciados de página en `vh`** (`pt-[10vh]`, reservas de paginación
  `6vh/13vh/7vh`) y de la intro en `%` del ancho, calibrados contra la pantalla
  4K del propietario.
