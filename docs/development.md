# Guía de Desarrollo y Convenciones

## Entorno de Trabajo

- **Node.js**: >= 22.12.0 (`npm install`, `npm run dev` para el servidor en `http://localhost:4321`).
- **Variables de entorno**: No se utilizan secretos ni variables de entorno locales (la hoja de Google Sheets es pública vía `gviz` y la clave de Google Maps está inicializada en `src/layouts/Layout.astro`).
- **Estilo de código**: No existe un linter o formateador automático restrictivo — mantén el estilo y las convenciones del archivo que estés modificando.

---

## Política de Desarrollo y Actualización Documental Continuada

La documentación es un **componente vivo de primer nivel** en este proyecto. Todo modelo de IA que trabaje en el repositorio debe aplicar proactivamente los siguientes principios:

### Tres Niveles de Actualización
1. **NIVEL 1 — Actualización Automática**: Cambios pequeños y objetivos que no alteran decisiones estratégicas (añadir entradas a `decisions.md`, mover tareas en `roadmap.md`, actualizar `journal.md`, corregir textos obsoletos). Actualiza directamente e informa del resultado.
2. **NIVEL 2 — Solicitar Confirmación**: Cambios que implican modificar decisiones estratégicas o reorganizar flujos de trabajo. Pregunta antes de aplicar: *"Hemos tomado decisiones que probablemente deberían quedar reflejadas en la documentación del proyecto. ¿Quieres que la actualice ahora?"*
3. **NIVEL 3 — Gestión de Conflictos**: Ante discrepancias entre código, documentación o conversaciones, **no modifiques nada automáticamente**. Explica el conflicto, propón la mejor solución y espera confirmación.

---

## Organización del Código

- **Páginas (`src/pages/`)**: Cada página incluye su lógica de cliente dentro de etiquetas `<script>` al final del archivo.
  - `index.astro` es el **monolito principal** (~3600 líneas) que gestiona el estado global de la home, el filtrado, las vistas de Galería/Mapa/Lista y el overlay SPA de detalle. **Navega mediante `grep`** por ids (`#overlay-…`, `#gallery-grid`), funciones (`filterArchives`, `performDOMUpdates`, `renderOverlayEvent`, `switchView`) o atributos `data-name`.
  - `event/[id].astro` renderiza la vista estática SSR para enlaces directos por evento.
  - `exposiciones.astro` implementa el componente `<EmptyState variant="construction" />`.
  - `info.astro` genera el contenido narrativo desplegable desde la hoja de Google Sheets.
- **Componentes (`src/components/`)**: Componentes Astro de presentación con props tipadas (`interface Props`). Estilos en Tailwind inline; bloques `<style>` scoped solo cuando se requiera `:global(...)` o animaciones complejas.
- **CSS Global (`src/styles/global.css`)**: Tokens de diseño, utilidades `typo-*` y clases compartidas (`.event-tags-row`, `.no-scrollbar`, `.striped-bg`).

---

## Convenciones de Código y Naming

- **Idioma**: La interfaz y los contenidos están redactados exclusivamente en **español**. El código (variables, funciones) utiliza inglés o español descriptivo siguiendo el contexto local del archivo. Los mensajes de commit se escriben en inglés (estilo `feat:`, `fix:` o modo imperativo).
- **Naming de elementos DOM**: Identificadores en `kebab-case` con prefijo de módulo (`overlay-…`, `search-…`, `slider-…`, `lightbox-…`). Los elementos que replican Figma llevan atributos `data-node-id` y `data-name`.
- **Eventos Personalizados**: Los eventos del bus global en `window` utilizan el prefijo `mel-` (`mel-search`, `mel-switch-view`, `mel-trigger-intro`, etc.).
- **Comentarios en el Código**: Obligatorios para justificar soluciones a bugs históricos o comportamientos no triviales del navegador (p. ej., workarounds de View Transitions, clipping o blend modes).

---

## Patrones de Ingeniería Obligatorios

Consulta las reglas 1 a 14 de [AGENTS.md](../AGENTS.md) antes de escribir código nuevo:
1. Lifecycle idempotente vía `astro:page-load`.
2. `AbortController` (`window._melAbortCtrl`) para limpiar event listeners de `window`.
3. Animaciones de reordenamiento con FLIP (`transform`), evitando `view-transition-name` en contenedores con overflow.
4. Uso de `isolation: isolate` en contenedores con capas `mix-blend-multiply` o `mix-blend-screen`.
5. Replicación estricta del marcado HTML de componentes Astro en renderers dinámicos de JavaScript de cliente (como en `index.astro` para filas de tabla y estados vacíos).

---

## Flujo Recomendado y Definition of Done (DoD)

1. **Revisar Figma**: Localiza el nodo de diseño (`data-node-id`) y extrae valores reales de tipografía, color y espaciado.
2. **Reutilización de Componentes**: Comprueba si el patrón ya existe (`EmptyState`, `TagWithLink`, `Link`, duotono fotográfico).
3. **Mantenimiento en Espejo**: Si modificas el detalle de un evento, aplica los cambios tanto en la página estática (`event/[id].astro`) como en el overlay SPA en `index.astro`. Si modificas un componente usado en cliente, actualiza su plantilla JS.
4. **Desarrollo Responsive**: Implementa escritorio y móvil simultáneamente utilizando los breakpoints `md` (768px) y `lg` (1024px).
5. **Verificación Manual en Navegador**.
6. **Comprobación de Definition of Done (DoD)**:
   - [ ] Código funcionando sin regresiones.
   - [ ] Verificación manual completada.
   - [ ] Documentación actualizada (`decisions.md`, `architecture.md`, `roadmap.md`).
   - [ ] Entrada de sesión registrada en `docs/journal.md`.
7. **Commit descriptivo**.
