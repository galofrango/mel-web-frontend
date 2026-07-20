# Desarrollo

## Entorno

- Node >= 22.12.0, `npm install`, `npm run dev` (localhost:4321).
- No hay variables de entorno ni secretos locales (ver README).
- Editor: cualquier; no hay linter ni formateador configurados — respeta el
  estilo del archivo que tocas.

## Organización del código

- **Páginas** en `src/pages/`; cada página incluye su lógica de cliente en
  `<script>` al final del archivo. La home (`index.astro`) concentra toda la
  lógica de vistas/filtros/mapa/overlay (decisión consciente, ver
  decisions.md D-003): navégala con `grep` por ids (`#overlay-…`,
  `#gallery-grid`, `#pagination-controls`), nombres de función
  (`filterArchives`, `performDOMUpdates`, `renderOverlayEvent`, `switchView`,
  `makeTagHtml`) o `data-name`.
- **Componentes** en `src/components/`: presentacionales, con props tipadas en
  el frontmatter (`interface Props`). Los estilos van en clases Tailwind
  inline; `<style>` scoped solo cuando hace falta alcanzar hijos de otros
  componentes (`:global(…)`) o estados complejos.
- **CSS global** (`src/styles/global.css`): tokens, clases `typo-*`,
  utilidades compartidas (`.no-scrollbar`, `.event-tags-row`). Añade aquí solo
  lo que de verdad comparten varias páginas.

## Convenciones

- **Idiomas**: UI y contenido en español; código (nombres de variables,
  funciones) en inglés o español descriptivo — sigue lo que ya haya en el
  archivo; mensajes de commit en inglés (estilo `feat:`/`fix:` o imperativo).
- **Naming de ids DOM**: kebab-case con prefijo de zona (`overlay-…`,
  `search-…`, `slider-…`, `lightbox-…`, `nav-…`). Los elementos que replican
  Figma llevan `data-node-id` y/o `data-name`.
- **Comentarios**: se usan para dejar constancia de *por qué* algo se hace de
  una forma no obvia (workarounds, bugs históricos). Mantén esa práctica: si
  arreglas algo sutil, deja el porqué en un comentario.
- **Eventos custom** en `window` con prefijo `mel-` (ver la tabla en
  architecture.md) para comunicar componentes sin acoplarlos.

## Patrones obligatorios

Son las reglas 1–10 de [AGENTS.md](../AGENTS.md) (init vía `astro:page-load`,
FLIP en contenedores con overflow, coalescing de view transitions, recarga dura
para fades manuales, porcentajes en `<colgroup>`, cadena de ellipsis/min-w-0,
réplicas JS de componentes, thumbnails de Drive, espaciados en vh/%, header
unificado). No se repiten aquí; considéralas parte de este documento.

## Flujo recomendado para una funcionalidad nueva

1. **Figma primero** si es visual: localiza el nodo (los `data-node-id`
   existentes ayudan a orientarse) y extrae medidas/tokens reales.
2. **Busca lo ya construido**: casi todo patrón (tags, enlaces, dots, empty
   states, tinte fotográfico, fila con scroll) ya existe; reutiliza el
   componente o su CSS compartido antes de crear variantes.
3. **Identifica los espejos**: ¿el cambio afecta al detalle de evento? →
   página estática **y** overlay SPA. ¿A un componente replicado en JS? →
   componente **y** plantilla JS.
4. Implementa **desktop y móvil** en el mismo cambio (breakpoints `md`/`lg`).
5. **Verifica en navegador** (ver abajo).
6. **Documenta**: decisión nueva → decisions.md; módulo nuevo →
   architecture.md; regla nueva aprendida → AGENTS.md; estado → roadmap.md.
7. Commit descriptivo.

## Cómo verificar cambios (no hay tests automatizados)

Lista de comprobación mínima según la zona tocada:

- **Home**: las tres vistas (Galería/Mapa/Lista), buscador (fijar un término
  desde una celda de la lista, limpiarlo), slider de años, paginación (con 1
  página y con varias), abrir/cerrar el overlay de detalle, deep links
  (`?view=`, `?search=`, `?detail=`).
- **Detalle de evento**: página estática y overlay; carrusel; lightbox (evento
  con 1 imagen y con varias — el padding inferior debe ser igual al resto);
  Anterior/Siguiente con click y con flechas del teclado.
- **Navegación suave**: ir a otra página y **volver** con el ClientRouter;
  históricamente la mitad de los bugs aparecían solo ahí (listeners dobles,
  referencias DOM obsoletas, estado del mapa).
- **Responsive**: 375px (móvil), ~768 y ≥1024. Tema claro y oscuro.
- **Datos raros**: eventos con `Desconocido`/`No detallados`, sin descripción,
  con muchos artistas (FIV VI es el caso de prueba habitual: 5 imágenes,
  20 artistas), con una sola imagen ("Trip With Us").

### Aviso para agentes con navegador sandbox

En navegadores embebidos sin foco/pintado real: `getBoundingClientRect()` y
`clientWidth` pueden devolver 0/valores obsoletos hasta forzar un pintado
(captura de pantalla), y `requestAnimationFrame` puede no ejecutarse con
`document.hidden` (las animaciones/reveals parecen "congelados" en opacity 0
sin estarlo). Verifica con un pintado real antes de diagnosticar un bug de
layout; esto ya ha producido falsos positivos en el pasado.

## Datos y contenido

- El contenido se edita en la hoja de Google Sheets (estructura en
  architecture.md). Para imágenes nuevas: subir a Drive, hacer el archivo
  público y pegar el enlace `…/file/d/ID/view` en la hoja — el código lo
  convierte a thumbnail automáticamente.
- Lugares nuevos con enlace de Google Maps en la columna de coordenadas
  requieren regenerar `src/data/resolved_coordinates.json` con
  `scripts/fetch_sheet.py`.
