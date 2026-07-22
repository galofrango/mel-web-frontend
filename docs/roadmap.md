# Roadmap y Estado del Proyecto

Última actualización: 2026-07-22.

## Funcionalidades Completadas

- **Home Multivista (Galería / Mapa / Lista)**: Conexión SSR en tiempo real con Google Sheets, filtros combinados (buscador multitérmino + slider de años) y estadísticas dinámicas.
- **Galería 2.1 con Masonry CSS Grid**: Masonry de 3 columnas (2 tablet / 1 móvil) con imágenes a ratio completo sin recortes, huecos de 24px, orden aleatorio estable por sesión, scroll infinito precargado y animación de revelado al scroll (`.reveal-in`). Recalcula automáticamente las tarjetas que se hayan quedado sin medir (`.unsized`) al volver a esta vista desde otra pestaña (D-019).
- **Vista Mapa Interactiva**: Integración con Google Maps API, agrupamiento de marcadores (*clustering*), panel lateral por sala/recinto y diff de marcadores en cliente. En móvil (`<768px`), el panel se convierte en un *bottom sheet* deslizante con tirador de arrastre (D-020).
- **Vista Lista Técnica**: Tabla ordenable por columnas con animación *marquee* al hover y filtros desde cualquier celda (escritorio). En móvil, sustituida por una lista de tarjetas `EventCardList` compactas (miniatura + título + fecha), compartiendo componente con el panel del mapa (D-020).
- **Componente `EventCardList`**: Fila compacta de evento (miniatura 56×56 en fit sobre fondo secundario, título, fecha, chevron) usada en el panel del mapa y en la Lista móvil — ver `src/components/EventCardList.astro` y `buildEventCardListHtml()` en `index.astro`.
- **Sistema de Estados Vacíos (`EmptyState`)**: Componente reutilizable (`<EmptyState variant="construction|no-results" />`) con tinte fotográfico duotono (`mix-blend-screen` sobre B/N). Implementado de forma estática en `/exposiciones` y dinámicamente en client-side JS para la Galería y Lista cuando una búsqueda no devuelve resultados.
- **Intro Animada CMYK Refinada (`IntroAnimation.astro`)**: Pantalla de inicio con 3 capas CMYK (`mix-blend-multiply`) aisladas con `isolation: isolate`. Parallax interactivo del ratón (Amarilla máx 16px/1px blur, Magenta máx 8px/0.5px blur, Cian 0px estática), despegue ease-in de 2.1s sin desaceleración final y descomposición del subtítulo palabra por palabra (retardo de 150ms acotado a `-90vh`).
- **Detalle de Evento Adaptativo**: Doble implementación (página estática `/event/[id]` y overlay SPA `?detail=MEL-XXXX`) con carrusel, lightbox en pantalla completa, navegación por teclado y botón *"Me presta"*. En móvil/tablet (`<lg`): cabecera (X + título) y tags fijas durante el scroll (V2, D-042/D-043 — tags pinneadas justo debajo del título, sin divisor propio, 32px hasta la imagen), foto fija que encoge de 360px a 200px según se avanza y el resto de la ficha pasa por debajo hasta que la navegación Anterior/Siguiente llega al final, siempre a 40px del borde inferior. Versión estable vigente etiquetada como tag git `detalle-evento-2.0` (sustituye a `detalle-evento-1.0`, que se conserva como historial).
- **Separadores verticales estandarizados en todo el sitio** (D-043/D-045): separadores como elementos independientes (no incrustados en el propio tag) — Highlights de la home, panel del mapa. Sin separador fantasma antes del primer tag.
- **Toggle de vista (Galería/Mapa/Lista) con ancho mínimo de 320px** (D-045).
- **Toolbar de la home (Highlights + Toggle)** (D-048/D-059/D-060, Figma 341:26425): las 4 tags usan ancho IGUAL por defecto (rejilla de 4 columnas, 32px de gutter), cediendo a ancho-por-contenido + scroll horizontal (con sangrado real hasta el borde derecho de la pantalla) solo si una columna equirepartida se quedaría más estrecha que su propio contenido — decidido por medición JS en cada resize, sin depender de ningún breakpoint fijo. El divisor vive integrado en cada módulo (24px al texto); el de "Eventos" nunca desaparece. El Toggle comparte fila con las tags topando en 4 columnas de 12 (mínimo 320px) SOLO mientras comparte línea con ellas; en cuanto cae a su propia fila (≥32px de separación vertical) ocupa el ancho completo del toolbar, mismo padding que el resto de la página.
- **Componente `AdaptiveTagsRow`** (`src/components/AdaptiveTagsRow.astro`, D-060/D-061): misma estructura/lógica del toolbar reutilizada en la fila de tags horizontal del detalle de evento (`event/[id].astro` y el overlay SPA) y en el panel de eventos del mapa (`#side-panel-tags-container`) — un único CSS por número de tags (`grid-auto-flow:column`), algoritmo de ancho-igual-vs-contenido duplicado a mano donde no hay módulo JS compartido (AGENTS.md regla 7). Cada tag topa en 176px de ancho máximo (divisor incluido) y nunca pasa a dos líneas — la medición se repite tras `document.fonts.ready` para evitar decidir el modo con la fuente de repuesto.
- **Panel lateral de eventos del mapa con ancho mínimo de 320px** (D-061), igual que el Toggle (D-045).
- **Detalle de evento — foto fijada durante el scroll** (D-032/D-034/D-063): la caja de la foto lleva un colchón de 24px de fondo opaco extra mientras está fijada (encogiendo/encogida), para que el texto que pasa por debajo nunca asome por el borde.
- **Panel de eventos del mapa tapa el slider de fecha** (D-060): en móvil (bottom sheet, `<lg`) su borde superior sube hasta el borde SUPERIOR del slider (antes se anclaba al inferior, dejándolo visible bajo el dim) — lo cubre por completo.
- Dos intentos de dar a la fila de tags fija del detalle un tratamiento distinto en tablet (escritorio completo desde 800px, D-044; reparto regular a lo ancho, D-046) se implementaron y revirtieron por decisión del propietario — la fila sigue en su comportamiento original (scroll horizontal, divisor por CSS) desde D-042/D-043. Sin nueva petición pendiente por ahora.
- **Página de Información (`/info`)**: Mini-CMS impulsado por la hoja de Google Sheets con acordeones desplegables y fotos duotono.
- **Tema Claro/Oscuro Persistido**: Alternador de tema en el menú lateral con persistencia en `localStorage`.
- **Diseño Responsive y Header Unificado**: Ajustes específicos de 375px a 1440px y geometría de header idéntica en todas las secciones.

---

## En Progreso / Pendiente de Contenido

- **Sala de Exposiciones (`/exposiciones`)**: Actualmente muestra el estado vacante `<EmptyState variant="construction" />`. Pendiente de definir los contenidos definitivos por parte del equipo editorial.
- **Fotografías del Equipo en `/info`**: Requiere que las celdas de imagen en la pestaña de la hoja contengan URLs públicas de Google Drive o enlaces directos.

---

## Problemas Conocidos (Aparcados Explícitamente)

*No abordar sin solicitud explícita del propietario:*
1. **Falta de animación en tarjetas durante el arrastre continuo del slider de años**: La galería actualiza la reordenación al soltar o hacer click en la barra, pero no de forma fluida durante el arrastre continuo del tirador.
2. **Desplazamiento visual de tarjetas por debajo de la toolbar durante el arrastre**: Íntimamente ligado al punto anterior.

---

## Deuda Técnica Registrada

- **Duplicación Consciente del Detalle de Evento**: Coexistencia de la página estática SSR `/event/[id].astro` y el renderer JS del overlay SPA en `index.astro`. Cualquier cambio de diseño debe aplicarse en ambos lados.
- **Índices de Columna de la Hoja Hardcodeados**: El parseador SSR depende de los índices absolutos de columna en el Google Sheet; reordenar columnas en la hoja rompería la extracción de datos.
- **Clave de Google Maps en Frontend**: Incrustada en `Layout.astro` (pendiente de restringir por dominio autorizado en Google Cloud Console).
- **Ausencia de Caché SSR**: Cada request ejecuta una petición HTTP en vivo a Google Sheets.

---

## Ideas y Futuras Mejoras

- **Icono de lupa sobre la foto del Detalle de Evento (móvil/tablet)**: visible en Figma "Screen / Event Details" (`369:32751`) como affordance superpuesto en la esquina inferior derecha de la foto, para abrir el visor a pantalla completa una vez la foto está encogida por el scroll (D-032). No implementado — la foto entera sigue abriendo el visor al pulsarla, como antes.
- **Botón "Descargar" en el Detalle de Evento**: Diseñado en Figma (nodo `634-41290`, `DownloadButton`) para permitir la descarga directa de la pieza gráfica en alta resolución.
- **Aprovechamiento de Campos Extra**: Integración de los campos ya parseados en el frontmatter (`ocr`, `notasArchivo`, `existeOriginal`, `formato`).
- **Persistencia de "Me presta"**: Conexión con `localStorage` o servicio externo para guardar los eventos guardados por el usuario.
