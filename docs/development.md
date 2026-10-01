# Guía de Desarrollo y Convenciones

## Entorno de Trabajo

- **Node.js**: >= 22.12.0 (`npm install`, `npm run dev` para el servidor en `http://localhost:4321`).
- **Variables de entorno**: No se utilizan secretos ni variables de entorno locales (la hoja de Google Sheets es pública vía `gviz` y la clave de Google Maps está inicializada en `src/layouts/Layout.astro`).
- **Estilo de código**: No existe un linter o formateador automático restrictivo — mantén el estilo y las convenciones del archivo que estés modificando.

---

## Política de Desarrollo y Actualización Documental Continuada

La documentación es un **componente vivo de primer nivel** en este proyecto. Todo modelo de IA que trabaje en el repositorio debe aplicar proactivamente los siguientes principios:

### Tres Niveles de Actualización
1. **NIVEL 1 — Actualización Automática**: Cambios pequeños y objetivos que no alteran decisiones estratégicas (añadir entradas a `decisions.md`, mover tareas en `roadmap.md`, corregir textos obsoletos). Actualiza directamente e informa del resultado.
2. **NIVEL 2 — Solicitar Confirmación**: Cambios que implican modificar decisiones estratégicas o reorganizar flujos de trabajo. Pregunta antes de aplicar: *"Hemos tomado decisiones que probablemente deberían quedar reflejadas en la documentación del proyecto. ¿Quieres que la actualice ahora?"*
3. **NIVEL 3 — Gestión de Conflictos**: Ante discrepancias entre código, documentación o conversaciones, **no modifiques nada automáticamente**. Explica el conflicto, propón la mejor solución y espera confirmación.

---

## Organización del Código

- **Páginas (`src/pages/`)**: Cada página incluye su lógica de cliente dentro de etiquetas `<script>` al final del archivo.
  - `index.astro` es el **monolito principal** (más de 7000 líneas) que gestiona el estado global de la home, el filtrado, el mapa con su panel y las vistas de Galería/Mapa/Lista. No tiene overlay de detalle: abrir un cartel navega a `/event/[id]` (D-154). **Navega mediante `grep`** por ids (`#gallery-grid`, `#view-mapa`), funciones (`filterArchives`, `switchView`), la constante `performDOMUpdates` o atributos `data-name`.
  - `event/[id].astro` renderiza la vista estática SSR para enlaces directos por evento.
  - `exposiciones.astro` implementa el componente `<EmptyState variant="construction" />`.
  - `info.astro` genera el contenido narrativo desplegable desde la hoja de Google Sheets.
- **Componentes (`src/components/`)**: Componentes Astro de presentación con props tipadas (`interface Props`). Estilos en Tailwind inline; bloques `<style>` scoped solo cuando se requiera `:global(...)` o animaciones complejas.
- **CSS Global (`src/styles/global.css`)**: Tokens de diseño, utilidades `typo-*` y clases compartidas (`.event-tags-row`, `.no-scrollbar`, `.striped-bg`).

---

## Convenciones de Código y Naming

- **Idioma**: La interfaz y los contenidos están redactados exclusivamente en **español**. El código (variables, funciones) utiliza inglés o español descriptivo siguiendo el contexto local del archivo. Los mensajes de commit se escriben en inglés (estilo `feat:`, `fix:` o modo imperativo).
- **Naming de elementos DOM**: Identificadores en `kebab-case` con prefijo de módulo (`overlay-…` en la ficha, `search-…`, `slider-…`). Los elementos que replican Figma llevan atributos `data-node-id` y `data-name`.
- **Eventos Personalizados**: Los eventos del bus global en `window` utilizan el prefijo `mel-` (`mel-search`, `mel-switch-view`, `mel-trigger-intro`, etc.).
- **Comentarios en el Código**: Obligatorios para justificar soluciones a bugs históricos o comportamientos no triviales del navegador (p. ej., workarounds de View Transitions, clipping o blend modes). Escríbelos sin miedo al peso: `astro build` los quita del HTML publicado (D-280), y `src/` es su única copia.

---

## Patrones de Ingeniería Obligatorios

Consulta las reglas de [AGENTS.md](../AGENTS.md) antes de escribir código nuevo:
1. Lifecycle idempotente vía `astro:page-load`.
2. `AbortController` propio de cada script (`window._mel<Script>AbortCtrl`) para limpiar los event listeners de `window` y `document` al re-inicializar (regla 1, D-297).
3. Animaciones de reordenamiento con FLIP (`transform`), evitando `view-transition-name` en contenedores con overflow.
4. Uso de `isolation: isolate` en contenedores con capas `mix-blend-multiply` o `mix-blend-screen`.
5. Replicación estricta del marcado HTML de componentes Astro en renderers dinámicos de JavaScript de cliente. Hoy la única réplica viva es `FlyerCard.astro` ⇄ `buildGalleryCard()` (regla 7); donde se pueda, se renderiza en SSR y el JS solo escribe valores.

---

## Flujo Recomendado y Definition of Done (DoD)

1. **Revisar Figma**: Localiza el nodo de diseño (`data-node-id`) y extrae valores reales de tipografía, color y espaciado.
2. **Reutilización de Componentes**: Comprueba si el patrón ya existe (`EmptyState`, `TagWithLink`, `Link`, duotono fotográfico).
3. **Mantenimiento en Espejo**: la ficha de evento vive solo en `event/[id].astro` (el overlay SPA que la duplicaba ya no existe, D-154). El espejo que queda es la tarjeta de galería: si tocas `FlyerCard.astro` o `buildGalleryCard()` en `index.astro`, toca y compara la otra (regla 7).
4. **Desarrollo Responsive**: Implementa escritorio y móvil simultáneamente utilizando los breakpoints `md` (768px) y `lg` (1024px).
5. **Verificación Manual en Navegador**.
6. **Comprobación de Definition of Done (DoD)**:
   - [ ] Código funcionando sin regresiones.
   - [ ] Verificación manual completada.
   - [ ] Documentación actualizada (`decisions.md`, `architecture.md`, `roadmap.md`).
   - [ ] Si el cambio toca la navegación, el **Contrato de Navegación** (`architecture.md`) sigue siendo cierto.
7. **Comprobación cross-browser antes de publicar** (D-067 — no basta con verificar en uno solo): al menos un navegador basado en Chromium y uno distinto (Safari/WebKit, Firefox), y en modo táctil/dispositivo real siempre que el cambio toque interacción por gesto (sliders, drag, scroll). Presta atención especial a dos puntos ya detectados como inconsistentes entre navegadores: la paginación de la vista Lista (D-067) y la cabecera sticky de su tabla (D-066, aparcada — ver "Problemas Conocidos" en `roadmap.md`).
8. **Subir la versión** (ver «Versionado», abajo) si el trabajo va a producción.
9. **Commit descriptivo**.

## Versionado

Desde la 1.1.0 (D-279), **cada subida a producción sube la versión**. La decide
el agente y la confirma el propietario al dar la orden de commit.

- **Formato `MAYOR.MENOR.PARCHE`**, el de la etiqueta `v1.0.0` que ya existía:
  - **PARCHE** (1.1.0 → 1.1.1): arreglos y retoques que no cambian cómo se usa la
    web.
  - **MENOR** (1.1.1 → 1.2.0): algo nuevo o un cambio de comportamiento que el
    visitante nota. Si una subida junta arreglos y novedades, manda la novedad.
  - **MAYOR** (1.x → 2.0.0): un salto grande (un rediseño, una sección nueva de
    peso). **La decide el propietario**, nunca el agente.
- **Una sola fuente**: `version` en `package.json`. El pie del menú lateral
  («MEL® Web vX.Y.Z», `SideMenu.astro`) la importa al compilar; no se escribe a
  mano en ningún otro sitio. Se cambia con
  `npm version X.Y.Z --no-git-tag-version`, que actualiza a la vez
  `package-lock.json` y no crea ni commit ni etiqueta por su cuenta (regla 16).
  Ojo: cambiar `package.json` tumba el `astro dev` en marcha; hay que relanzarlo.
- **Se sube en la rama que va a `main`**, justo antes de mezclar, y no al empezar
  la rama: si hay dos ramas abiertas a la vez, las dos pedirían el mismo número.
- **Con el commit que llega a `main` va su etiqueta** `vX.Y.Z` (anotada, con una
  línea de qué trae), igual que `v1.0.0`. Las etiquetas con nombre
  (`lista-y-panel-v3.5`…) eran puntos de recuperación con otra numeración
  anterior; no se siguen.
