# Roadmap y Estado del Proyecto

Última actualización: 2026-07-20.

## Funcionalidades Completadas

- **Home Multivista (Galería / Mapa / Lista)**: Conexión SSR en tiempo real con Google Sheets, filtros combinados (buscador multitérmino + slider de años) y estadísticas dinámicas.
- **Galería 2.1 con Masonry CSS Grid**: Masonry de 3 columnas (2 tablet / 1 móvil) con imágenes a ratio completo sin recortes, huecos de 24px, orden aleatorio estable por sesión, scroll infinito precargado y animación de revelado al scroll (`.reveal-in`). Recalcula automáticamente las tarjetas que se hayan quedado sin medir (`.unsized`) al volver a esta vista desde otra pestaña (D-019).
- **Vista Mapa Interactiva**: Integración con Google Maps API, agrupamiento de marcadores (*clustering*), panel lateral por sala/recinto y diff de marcadores en cliente. En móvil (`<768px`), el panel se convierte en un *bottom sheet* deslizante con tirador de arrastre (D-020).
- **Vista Lista Técnica**: Tabla ordenable por columnas con animación *marquee* al hover y filtros desde cualquier celda (escritorio). En móvil, sustituida por una lista de tarjetas `EventCardList` compactas (miniatura + título + fecha), compartiendo componente con el panel del mapa (D-020).
- **Componente `EventCardList`**: Fila compacta de evento (miniatura 56×56 en fit sobre fondo secundario, título, fecha, chevron) usada en el panel del mapa y en la Lista móvil — ver `src/components/EventCardList.astro` y `buildEventCardListHtml()` en `index.astro`.
- **Sistema de Estados Vacíos (`EmptyState`)**: Componente reutilizable (`<EmptyState variant="construction|no-results" />`) con tinte fotográfico duotono (`mix-blend-screen` sobre B/N). Implementado de forma estática en `/exposiciones` y dinámicamente en client-side JS para la Galería y Lista cuando una búsqueda no devuelve resultados.
- **Intro Animada CMYK Refinada (`IntroAnimation.astro`)**: Pantalla de inicio con 3 capas CMYK (`mix-blend-multiply`) aisladas con `isolation: isolate`. Parallax interactivo del ratón (Amarilla máx 16px/1px blur, Magenta máx 8px/0.5px blur, Cian 0px estática), despegue ease-in de 2.1s sin desaceleración final y descomposición del subtítulo palabra por palabra (retardo de 150ms acotado a `-90vh`).
- **Detalle de Evento Adaptativo**: Doble implementación (página estática `/event/[id]` y overlay SPA `?detail=MEL-XXXX`) con carrusel, lightbox en pantalla completa, navegación por teclado y botón *"Me presta"*.
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

- **Botón "Descargar" en el Detalle de Evento**: Diseñado en Figma (nodo `634-41290`, `DownloadButton`) para permitir la descarga directa de la pieza gráfica en alta resolución.
- **Aprovechamiento de Campos Extra**: Integración de los campos ya parseados en el frontmatter (`ocr`, `notasArchivo`, `existeOriginal`, `formato`).
- **Persistencia de "Me presta"**: Conexión con `localStorage` o servicio externo para guardar los eventos guardados por el usuario.
