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

### `src/pages/event/[id].astro` — gestos sobre la foto

Con más de una imagen, el carrusel de la ficha y el lightbox se pasan de foto
**deslizando el dedo**. El gesto convive con el toque (expandir la imagen /
volver arriba): solo cuenta como deslizamiento si recorre más de 45px en
horizontal y avanza más en horizontal que en vertical —así un scroll sobre la
foto no cambia de imagen—, y en ese caso se suprime en captura el `click` que el
navegador dispara al soltar, para no expandir sin querer. Solo con puntero
táctil: con ratón mandan las flechas y los puntos.

Un identificador de evento que no existe hace `rewrite` a `/404` (no
`redirect` a la home): conserva la URL fallida a la vista y da el 404 real.

### `src/pages/404.astro`

Página de error, deliberadamente mínima: cabecera y menú, sin toolbar, slider ni
vistas. Reutiliza `EmptyState` con la variante `404` (Figma 1073:114391); todo lo
que cambia —foto, textos y destino del botón— vive dentro del componente.

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

## Contrato de Navegación (fuente única de verdad)

Esta sección define **qué hace el sitio** al navegar. Es la referencia normativa:
si el código o cualquier otro documento la contradicen, manda esta sección. Las
decisiones que llevaron hasta aquí (y las alternativas descartadas) viven en
`decisions.md`, que **no debe reescribir estas reglas**, solo enlazarlas.

### Principio: una sola secuencia

Existe **una única secuencia activa** de eventos que gobierna a la vez la
Galería, la Lista y la navegación *Anterior/Siguiente* de la ficha de detalle.
Las tres cosas muestran siempre el mismo orden. Se materializa en
`sessionStorage['mel-active-nav-sequence']` (array de `idMel`).

### Reglas

| Situación | Comportamiento |
|---|---|
| **Sesión nueva** (pestaña nueva, sin `sessionStorage`) | El servidor baraja el archivo; ese primer barajado se congela como secuencia de la sesión en `sessionStorage['mel-session-order']`. Galería y Lista lo muestran por igual. |
| **Recarga (F5)** | Se reutiliza la secuencia de la sesión: el orden **no** cambia. Solo una pestaña nueva genera un orden nuevo. Es el precio de que cerrar un evento devuelva al sitio exacto, y fue una decisión explícita del propietario. |
| **Filtrar / buscar / mover el slider de años** | **Solo oculta.** Nada se reordena: el resultado es siempre una subsecuencia del orden vigente, en las tres vistas. Al limpiar el filtro reaparece lo oculto en su sitio. |
| **Ordenar una columna en Lista** | Ese orden pasa a ser la secuencia activa, y lo adoptan también la Galería y la navegación entre eventos. Se persiste en `sessionStorage['mel-sort-state']`. |
| **Abrir un evento desde el panel del mapa** | La secuencia se acota a los eventos **de ese local**, en el orden en que se ven en el panel (que ya arrastra rango de años y búsqueda activos). |
| **Anterior / Siguiente y flechas ←/→** | Recorren la secuencia activa. Lo filtrado no existe para ellas: se salta. |
| **Acceso directo por URL** (enlace externo, sin sesión) | No hay secuencia guardada: se recae en el orden cronológico que sirve el SSR de `/event/[id]`. |

> **Consecuencia asumida**: como la secuencia por defecto es aleatoria,
> *Anterior/Siguiente* también lo es mientras no se ordene nada en Lista. Es lo
> coherente con "una sola secuencia": la navegación recorre lo que el visitante
> acaba de ver, no un orden paralelo invisible.

### Volver al sitio de origen

Al abrir un evento se guarda el contexto completo en
`sessionStorage['mel-return-state']`; al volver se restaura y se consume. La URL
de vuelta transporta lo compartible (`view`, `search`, `location`); lo que no
cabe en una URL viaja en ese blob: **rango de años, orden de columna, página de
Lista, lotes cargados del scroll infinito, posición de scroll de cada vista,
cámara del mapa y qué flyer se estaba mirando**.

**Se vuelve al flyer que se cierra, no al que se abrió.** Desde la Galería, el
punto de retorno es la tarjeta, no un píxel: el píxel es frágil por construcción
aquí, porque el masonry mide cada tarjeta cuando su imagen carga y el alto sigue
creciendo después de restaurarlo. El identificador sigue siendo verdad aunque el
alto cambie, y el píxel queda solo de reserva (para cuando se entró desde Lista o
Mapa, o el flyer ya no pasa el filtro).

Ese campo lo **reescribe la propia ficha de evento** en cada carga, con el evento
que está mostrando. Va enganchado a *qué ficha se ve* y no a los enlaces porque
hay cuatro maneras de llegar a una —Anterior, Siguiente, las flechas del teclado
y una URL directa— y así quedan cubiertas las cuatro. Consecuencia normativa: si
el visitante recorre la sesión con Anterior/Siguiente y cierra desde el tercer
evento, la galería lo deja en **ese** tercero. Es el comportamiento correcto; si
el código devuelve al primero, es un bug del código.

**Dónde queda la tarjeta**: a una columna (móvil), pegada al borde superior de la
galería, que es donde acaba la toolbar. A dos o más, centrada en la ventana — y
si no cabe entera, arriba, porque centrar algo más alto que la ventana lo recorta
por los dos lados a la vez.

Tres detalles del entorno que condicionan la implementación y no son opcionales:

1. **`astro:page-load` dispara también en la ficha de evento** tras una
   navegación suave (los listeners viven en `document` y sobreviven al salto).
   `initHomePage()` sale inmediatamente si no encuentra `#gallery-grid`; sin ese
   guard, el estado de vuelta se consumía nada más aterrizar en el evento.
2. **`initHomePage()` se ejecuta dos veces por navegación.** El estado de vuelta
   se guarda en `_melState` con caducidad (~4s) y se aplica en ambas pasadas: la
   segunda reseteaba página, lotes y scroll justo después de la primera.
3. **El scroll se restaura con reintentos por temporizador**, no de una vez: el
   masonry mide cada tarjeta cuando carga su imagen, así que el alto útil crece
   durante el primer segundo y fijarlo antes lo clampa a 0. Se usa `setInterval`
   y no `requestAnimationFrame` porque este se congela en pestañas en segundo
   plano. Cualquier gesto de scroll del visitante cancela los reintentos.
4. **El anclaje a la tarjeta se reafirma durante todo el plazo, sin salida
   anticipada por "ya está quieto".** El scroll se queda quieto también cuando
   **no** ha llegado: mientras la rejilla no ha crecido del todo, el destino cae
   más abajo del tope y el navegador lo recorta ahí. Medido: destino 3908, tope
   3838, tres lecturas idénticas y el bucle dándose por bueno — y al crecer luego
   la rejilla, la tarjeta acababa a 522px de su sitio (D-120).

### Anterior/Siguiente: los pinta el cliente, nunca el SSR

El servidor **no puede** conocer la secuencia activa (vive en `sessionStorage`),
solo el orden cronológico del archivo entero. Por eso los contenedores
`#nav-prev-container` / `#nav-next-container` se sirven siempre `invisible` y con
`href="#"`, y es el cliente quien los rellena y los revela al resolver los
vecinos reales. Si el SSR pintara ahí sus propios vecinos quedaría una ventana,
entre el primer pintado y el arranque del script, en la que esos enlaces apuntan
fuera del contexto del visitante — entrando desde el panel de un local con dos
eventos, por ejemplo, mostraban dos eventos cualesquiera del archivo.

Al ocultar un extremo (primero o último de la secuencia) se neutraliza también
su `href`, para no dejar enlaces obsoletos vivos debajo.

### El panel del mapa se cierra distinto según su forma

- **Como panel lateral (`lg+`) no hay X**: su fila se oculta entera para ganar
  altura. Se cierra pulsando el **nombre/dirección** del local
  (`#side-panel-header-toggle`) o **volviendo a pulsar su marcador** en el mapa;
  ambos pasan por el mismo manejador que la X (limpia `?location=` y devuelve el
  marcador a reposo). Pulsar el marcador de OTRO local cambia de local, no
  cierra. Se probó además arrastrar el panel hacia la derecha (desde la cabecera
  y desde una franja en el borde izquierdo): daba problemas y se retiró.
- **Como bottom sheet (`<lg`) se mantiene la X**, más el dim y el tirador de
  arrastre. Ahí la cabecera es texto inerte.

### El panel del mapa va aparte: siempre cronológico

Dos excepciones deliberadas a "una sola secuencia", ambas acotadas al panel:

1. **Sus eventos se listan siempre en orden cronológico**, al margen de la
   secuencia activa (aleatoria de sesión, o la columna elegida en Lista): leer
   la historia de un local tiene sentido de más antiguo a más reciente. Como la
   navegación acotada toma su vector de ese mismo array, *Anterior/Siguiente*
   dentro de un local también avanza cronológicamente — coincide con lo que se
   ve en el panel, que es la regla que importa.
2. **El enlace de un lugar nunca busca texto**: ni el tag "Lugar" de la ficha de
   evento ni la celda *Lugar* de la Lista. Ambos llevan a
   `/?view=mapa&location=<nombre>`, que encuadra el local y despliega su panel.
   El parámetro dedicado existe justo para esto (D-075); usar `?search=` además
   dejaba un filtro activo sobre todo el archivo como efecto colateral. Las
   demás celdas de la Lista (Localidad, Organiza, Diseño) sí fijan búsqueda.

### El panel del mapa se restaura por URL

`?location=` transporta el **nombre** del local; `activeSidePanelKey` se indexa
por **coordenadas**. La traducción entre ambos la hace `updateMapMarkers()`, y su
guard es `!activeSidePanelKey`: por eso `initHomePage()` **no debe** sembrar esa
clave desde la URL. Cuando lo hacía, la traducción se saltaba, el grupo no se
encontraba por nombre y el panel no llegaba a abrirse nunca por URL — ni al
llegar por un enlace "Lugar" ni al volver de un evento abierto desde el panel.

### Fluidez

Las navegaciones home ⇄ evento y evento ⇄ evento usan el enrutado nativo de
Astro (`window.__melNavigate`, View Transitions) con precarga `<link
rel="prefetch">` de los colindantes, para que no haya pantallas en blanco.

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
