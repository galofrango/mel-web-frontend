# Arquitectura

## Visión General

MEL es una aplicación web construida con **Astro** en modo **SSR** (`output: 'server'`, adapter `@astrojs/vercel`). No existe backend propio ni base de datos convencional: cada página que requiere datos ejecuta un `fetch` a una hoja pública de Google Sheets en su frontmatter (en el servidor, durante cada request) y genera HTML estático poblado. El navegador recibe la página lista para renderizar; el JavaScript de cliente (vanilla) añade la interactividad (filtros, conmutación de vistas, Google Maps, overlays SPA y animaciones).

```
Google Sheets (gviz JSON) ──fetch SSR──▶ Frontmatter Astro ──▶ HTML Servido
Google Drive (imágenes)  ──thumbnail──▶ <img referrerpolicy="no-referrer">
Google Maps JS API       ──script────▶ Vista Mapa (cliente)
```

La navegación interna entre páginas utiliza el `ClientRouter` de Astro (View Transitions), salvando excepciones deliberadas que ejecutan recargas duras para mantener transiciones limpias (ver `decisions.md`).

---

## Fuente de Datos: Hoja de Google Sheets

`SHEET_ID = 1buzisIlDkCo2Rj5BYZh5-JKrAYSo3RSuBXYmJVGYT0E`

Se consulta mediante el endpoint `gviz`:
`https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:json[&sheet=NOMBRE]`

La respuesta es una cadena JSONP que se parsea mediante regex (`google\.visualization\.Query\.setResponse\((…)\);`) y se transforma en objetos JSON estructurados.

### Pestaña Principal (Archivo de Eventos)

Cada **fila = una imagen** de un evento. Columnas mapeadas (índice → campo):

| Índice | Campo | Descripción |
| --- | --- | --- |
| 0 | `evento` | Nombre del evento |
| 2 | `urlDrive` | Enlace a la imagen en Google Drive |
| 3 | `fecha` | `d/m/aaaa` (extraído del formato `.f` si está disponible) |
| 4 | `lugar` | Sala/Recinto ("Desconocido" = sin dato) |
| 5 | `localidad` | Municipio / Ciudad |
| 6 | `coordenadas` | Coordenadas DMS o enlace de Google Maps |
| 7 | `artistas` | Lista de artistas (separadores `,`, `;`, `/`) |
| 8 | `organiza` | Promotor u organizador |
| 9 | `descripcion` | Texto descriptivo del evento |
| 10 | `idMel` | Identificador único `MEL-XXXXX` (filtra filas válidas) |
| 11 | `carruselOrder` | Orden de la imagen dentro del carrusel del evento |
| 13 | `disenador` | Autor / Diseñador del flyer |
| 21 | `formato` | Tipo de pieza (PNG, Flyer, Cartel...) |
| 25 | `ocr` | Texto extraído por OCR |

Las filas se **agrupan por `evento + fecha`** formando objetos de evento con una lista de imágenes en `carruselItems[]` (ordenadas por `carruselOrder`), y se ordenan cronológicamente. Valores centinela tratados como deshabilitados/sin dato: `desconocido`, `no detallados`, `varios`, `SIN FECHA`.

### Pestaña "Página de Información" (`sheet=Página de Información`)

Actúa como mini-CMS de la página `/info`. Columnas:
- **A**: Sección
- **B**: Orden de sección
- **C**: Tipo de módulo (`Párrafo` = subtítulo, `Acordeón` = elemento desplegable)
- **D**: Título del módulo
- **E**: Orden del módulo
- **F**: Imagen (URL de Google Drive convertida a thumbnail)
- **G**: Contenido (los saltos de línea se convierten en párrafos; emails y menciones `@handle` se transforman automáticamente en enlaces `mailto:` e Instagram vía la función `linkify`).

### Procesamiento de Imágenes (Google Drive)

`extractDriveImage(url)` convierte cualquier enlace de Drive (`/file/d/ID/view` o `?id=ID`) al endpoint optimizado:
`https://drive.google.com/thumbnail?id=ID&sz=w1000`

Este es el único formato que permite la carga nativa en etiquetas `<img>`. Todos los elementos `<img>` remotos incluyen `referrerpolicy="no-referrer"`.

### Coordenadas y Geocodificación

`parseCoords()` procesa coordenadas DMS (`42° 52' 46.5" N 5° 23' 52.9" W`) y enlaces de Google Maps. Los enlaces a Google Maps se resuelven offline mediante el script `scripts/fetch_sheet.py` y se almacenan en `src/data/resolved_coordinates.json` como caché estática de geocodificación.

---

## Páginas y Responsabilidades

### `src/layouts/Layout.astro`
- `<head>` global, fuentes (`Space Grotesk`, `Lora`), scripts de Google Maps y MarkerClusterer.
- Inicialización inmediata del tema claro/oscuro antes del primer pintado (evita destellos leyendo `localStorage['mel-color-scheme']` y aplicando la clase `.dark` en `<html>`).
- Incorpora `<ClientRouter />` y protecciones globales contra copia/arrastre de imágenes.
- Restablece la opacidad del `body` en cada `astro:page-load`.

### `src/pages/index.astro` (Home Monolítica)
Contiene la vista principal del proyecto:
- **SSR Frontmatter**: Descarga de datos y agrupación por eventos.
- **Estado Global Persistente (`window._melState`)**: Almacena archivos, filtros activos, estado de vistas, mapa y overlays. Sobrevive a las navegaciones de View Transitions.
- **Pipeline de Filtrado (`filterArchives` → `performDOMUpdates`)**: Filtra datos por texto y rango de años, recalcula estadísticas dinámicas y actualiza la vista activa (Galería, Mapa o Lista).
- **Vista Galería**: Grid adaptativo con calculador de altura por imagen (`sizeGalleryCard`), orden aleatorio estable por sesión, scroll infinito precargado y animación de entrada al scroll (*IntersectionObserver*). Si el resultado es vacío, inyecta dinámicamente el `EmptyState` variante `no-results`.
- **Vista Mapa**: Instancia de Google Maps con *clustering* de marcadores por ubicación y panel lateral interactivo por recinto.
- **Vista Lista**: Tabla HTML `table-layout:fixed` con columnas porcentuales, ordenación por encabezados y celdas con *marquee*. Si no hay resultados, renderiza una fila completa `<tr><td colspan="6">` con el componente `EmptyState`.
- **Overlay SPA de Detalle (`#event-details-overlay`)**: Modal interactivo que simula la página de detalle sin recargar la web. Actualiza la URL a `?detail=MEL-XXXX` para permitir enlaces compartibles.

### `src/pages/event/[id].astro`
Página estática SSR para enlaces directos por ID de evento (`/event/MEL-XXXX`). Reutiliza la misma estructura visual que el overlay SPA (diseño responsive adaptativo: grid de 3 columnas en escritorio y reordenación con `order-*` en móvil).

### `src/pages/info.astro`
Página informativa (*Proyecto / Equipo / Contacto*) poblada desde la hoja. Acordeones desplegables con tinte fotográfico duotono en imágenes.

### `src/pages/exposiciones.astro`
Página de la Sala de Exposiciones. Implementa el componente `<EmptyState variant="construction" />` avisando de que la sección está en desarrollo.

---

## Componentes Destacados y Arquitectura Interna

| Componente | Responsabilidad y Mecánica |
| --- | --- |
| `<EmptyState />` | Sistema de estados vacíos (variantes `construction` y `no-results`). Utiliza una imagen en B/N combinada con una capa superior `bg-[var(--mel-primitive-le-900)]` en modo `mix-blend-screen` para lograr un tinte fotográfico duotono. |
| `<IntroAnimation />` | Pantalla de inicio con 3 capas CMYK (`mix-blend-multiply`). Utiliza un contenedor con `isolation: isolate` para un blend correcto, física del ratón mediante `requestAnimationFrame` (desplazamientos de capa: Amarilla máx 16px, Magenta máx 8px, Cian 0px estática), y ascensión ease-in (`cubic-bezier(0.55, 0.085, 0.68, 0.53)`) de 2100ms con descomposición del subtítulo palabra por palabra (retardo de 150ms). |
| `<HeaderTitle />` | Buscador tipográfico de 4 estados (*default*, *placeholder*, *filling*, *filled*) con animación de ancho en píxeles medidos y emisión del evento `mel-search`. |
| `<TimeSlider />` | Selector de rango de años (2004–2019) con dos tiradores arrastrables. Los eventos de ventana se gestionan con `AbortController` para una desvinculación limpia. |
| `<ToggleSelector />` | Selector de vistas (*Galería / Mapa / Lista*) con indicador deslizante mediante `transform`. |
| `<SideMenu />` | Menú lateral deslizable con selector de tema, disparo de la intro y enlaces de navegación. |
| `<TagWithLink />` | Etiqueta de metadata (*OVERLINE + Valor*) con truncado mediante `ellipsis` indispensable. |

## Arquitectura de Navegación Sitewide: Modelo Cronológico Determinista (`Vector Único`)

La navegación entre eventos (*Anterior* / *Siguiente* y flechas de teclado en la ficha de detalle `/event/[id]`) se rige por el **Modelo Cronológico Determinista**, controlado por un único array JSON de IDs en `sessionStorage['mel-active-nav-sequence']`:

> **Principio Fundamental**: La secuencia de navegación entre flyers en la ficha de detalle avanza **siempre en orden cronológico por fecha** (de más antiguo a más reciente: 2004 ➔ 2019). Este orden determinista solo cambia si el usuario reordena explícitamente la tabla en la vista Lista. La Galería de la Home conserva su mosaico aleatorio visual para fomentar la exploración en la portada.

### 1. Mutaciones del Vector de Navegación

| Situación del usuario | Comportamiento del Vector (`sessionStorage['mel-active-nav-sequence']`) |
|---|---|
| **Navegación general por defecto (Carga/F5)** | Vector completo ordenado **cronológicamente por fecha** (2004 ➔ 2019). |
| **Filtros / Buscador / Tags activos** | Subconjunto de eventos filtrados, ordenados **cronológicamente por fecha**. Al borrar el filtro, vuelve a estar disponible la totalidad del archivo cronológico. |
| **Abrir evento desde el Mapa** | **En el instante del clic**, se extrae la lista de eventos visibles en el panel de esa sala/recinto y se guardan ordenados **cronológicamente por fecha**. |
| **Reordenación explícita en Lista** | Si el usuario hace clic en una columna para ordenar la tabla (p. ej. alfabético por *Lugar* u *Organizador*), esa ordenación específica sobrescribe el vector. |

### 2. Resolución de la Navegación en `/event/[id]`

- La plantilla de detalle lee `sessionStorage['mel-active-nav-sequence']` e identifica `curIdx` por su propio `idMel`.
- **Anterior** = `curIdx - 1` · **Siguiente** = `curIdx + 1`.
- Al hacer clic en los botones o pulsar las flechas del teclado (`ArrowLeft` / `ArrowRight`), se ejecuta `window.__melNavigate()` manteniendo el contexto.
- **Acceso directo por URL (Fallback)**: Si se accede directamente a la ficha desde un enlace externo sin `sessionStorage` previo (o si su ID no está en el vector), la navegación recae de forma transparente en el **orden cronológico por fecha**.

---

## Bus de Eventos (Eventos Personalizados en `window`)

| Evento | Emisor → Receptor | Propósito |
| --- | --- | --- |
| `mel-search` | `HeaderTitle` → `index.astro` | Notifica cambios en el término de búsqueda |
| `mel-set-search` | Celdas de tabla / Tags → `HeaderTitle` | Fija un texto de búsqueda desde una etiqueta o celda |
| `mel-switch-view` | `SideMenu` / `IntroAnimation` → `ToggleSelector` | Cambia la vista activa (Galería/Mapa/Lista) |
| `mel-trigger-intro` | `SideMenu` → `IntroAnimation` | Lanza la animación de intro bajo demanda |
| `mel-open-lightbox` | Marcadores del Mapa → Lightbox | Abre el visor de imagen desde un punto del mapa |
| `mel-color-scheme-change` | `SideMenu` → Google Maps | Reconstruye los estilos del mapa claro/oscuro |

---

## Patrones Técnicos Obligatorios

1. **Gestión de Ciclo de Vida Idempotente**: Todo el código de cliente se inicializa en el evento `astro:page-load`. Los event listeners de `window` utilizan `AbortController` para ser destruidos y recreados en cada navegación SPA sin acumular bindings.
2. **Aislamiento de Blend Modes (`isolation: isolate`)**: Todo contenedor que agrupe capas con `mix-blend-multiply` o `mix-blend-screen` debe incluir `isolation: isolate` para evitar artefactos de renderizado en el lienzo del navegador.
3. **Coalescing con `requestAnimationFrame`**: Transiciones pesadas o actualizaciones de vista durante operaciones de arrastre (como el slider de tiempo) se agrupan en ciclos de rAF para no saturar `document.startViewTransition`.

---

## Garantías de Escalabilidad, Costes y Sostenibilidad Tecnológica

1. **Escalabilidad del Volumen de Datos (Proyección a 8.000+ Flyers)**:
   - **Hoja de Google Sheets como CMS**: Google Sheets admite hasta 10.000.000 de celdas por documento. Para un catálogo proyectado de 8.000 flyers (~160.000 celdas), el archivo utiliza apenas el 1,6% de la capacidad total de Google Sheets. El endpoint de consulta `gviz/tq` devuelve el dataset comprimido en milisegundos durante la petición SSR.
   - **Renderizado Adaptativo y Paginación por Lotes**: La vista Galería utiliza paginación por lotes (`PAGE_SIZE = 30`) con scroll infinito e `IntersectionObserver`, descargando imágenes solo a medida que entran en el viewport. La vista Lista y el Mapa instancian nodos en memoria de forma optimizada. El navegador solo gestiona en DOM los elementos que el usuario visualiza en pantalla, evitando saturación de memoria.
   - **Red CDN Global para Imágenes**: Las imágenes alojadas en Google Drive se sirven a través del endpoint optimizado de thumbnails de Google (`drive.google.com/thumbnail`), garantizando compresión de ancho de banda y velocidad de red sin costes de almacenamiento ni servidor propio.

2. **Independencia de Licencias y Tecnologías de Pago**:
   - **Código Abierto Nativo (Licencia MIT)**: La pila tecnológica principal (**Astro 7**, **JavaScript Vanilla**, **Tailwind CSS 4**) se basa 100% en software libre y código abierto. No existe dependencia de soluciones de pago, librerías cerradas o suscripciones SaaS propietarias.
   - **Navegación Fluida Nativa W3C**: La transición en caliente entre páginas utiliza la especificación nativa `View Transitions API` recomendada por el W3C y soportada en los motores modernos (Chromium, WebKit, Gecko).

3. **Modelo de Coste 0€/mes de Infraestructura**:
   - **Hosting SSR Serverless (Vercel / Cloudflare Pages)**: El renderizado SSR de Astro procesa peticiones livianas sin almacenar bases de datos complejas en servidor. El consumo encaja holgadamente dentro de los límites gratuitos mensuales de plataformas como Vercel o Cloudflare Pages (100 GB/mes de transferencia y 1.000.000 de ejecuciones serverless), resultando en un **coste operativo de 0€/mes**.
   - **Portabilidad Total**: En caso de crecimiento exponencial de tráfico en el futuro, la arquitectura no está atada a ninguna plataforma: puede desplegarse en cualquier servidor VPS básico (Node.js/Docker) por un coste mínimo y fijo.
