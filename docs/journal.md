# Diario del Proyecto (Project Journal)

Este archivo registra la cronología de las sesiones de desarrollo importantes. Su objetivo es mantener un histórico claro de la evolución del proyecto, las decisiones tomadas, los problemas resueltos y los próximos pasos.

## [2026-07-20] — Sesión: Pulido del bottom sheet, extremos del slider a 24px y hueco cabecera↔toolbar

### Objetivo de la Sesión
Repaso de detalle sobre el trabajo de la sesión anterior (bottom sheet del mapa, D-020): posicionar su cabecera a 64px del techo de pantalla siguiendo Figma, verificar que las sombras/dim no se conviertan en resplandores en modo oscuro, corregir los extremos del slider de fecha para que queden siempre a 24px de los bordes, y ajustar el hueco entre la cabecera del sitio y el bloque de toolbar en escritorio.

### Cambios Realizados
1. **Slider de fecha (D-021)**: el tirador máximo se posicionaba por `left` con un offset que asumía una caja de 60px de ancho fijo; como el texto del año hace que la caja crezca (ej. "2019" ≠ "2004" en píxeles), su borde exterior real quedaba a 21.3px en vez de 24px. Cambiado a `style.right` (con `left:auto`), que ancla directamente el borde que importa sin depender del ancho del contenido. Margen base reservado ajustado de 104px a 96px. Verificado con `getBoundingClientRect()`: 24.0px exactos en escritorio y en el caso full-bleed de móvil.
2. **Bottom sheet del mapa (D-022)**:
   - Posición vertical: `max-height:75vh` sustituido por `top:64px` (equivalente al "Spacer" de Figma `269:11222`) sobre el `position:absolute` ya anclado a `#view-mapa` — como ese contenedor ya arranca bajo la cabecera+toolbar del sitio, el resultado respeta "no tapar la cabecera" sin medir nada en JS. Verificado: 64.0px exactos.
   - Tirador de arrastre corregido a 80px de ancho (antes 48px, Figma especifica `393−157−156`) y `pt-16/pb-12` en vez de `py-8`.
   - No se replicaron los adornos decorativos de "pliegue de papel" del header de Figma (SVGs con máscara) — fuera de proporción para el resto de la tarea.
3. **Hueco cabecera↔toolbar en escritorio (D-022)**: el wrapper del toolbar tenía `py-4` además del `gap-6` del contenedor padre (40px totales). Quitado el padding superior (`pb-4` en vez de `py-4`), dejando solo el `gap-6` (24px) — más ajustado, sin tocar el hueco toolbar→contenido.
4. **Auditoría de sombra/dim (D-022)**: revisados todos los `box-shadow`/`drop-shadow`/fondos de dim del proyecto. Ninguno usa una variable semántica que cambie entre `:root`/`.dark` — todos son `rgba(...)` fijos o primitivos estáticos (`--mel-primitive-le-900/950`, no sobrescritos en modo oscuro). Verificado visualmente forzando `.dark`: ninguna sombra se ve como resplandor. No hizo falta ningún `mix-blend-mode` adicional.

### Decisiones Tomadas
Ver `docs/decisions.md` D-021 (slider) y D-022 (bottom sheet, hueco de toolbar, auditoría de sombras).

### Problemas Encontrados y Resueltos
- El bug del slider (21.3px en vez de 24px) solo era detectable midiendo en el navegador — el código "parecía" simétrico (mismo offset base para ambos tiradores) pero el eje de anclaje (`left` en un tirador cuyo borde relevante es el derecho) escondía la dependencia del ancho del texto. Confirmado con `getBoundingClientRect()` antes y después del fix.
- Al verificar el bottom sheet, las primeras lecturas de `getBoundingClientRect()` devolvieron valores intermedios (la transición CSS de 300-350ms aún no había terminado) — hubo que releer tras un instante para obtener el valor final real, evitando diagnosticar un falso bug.

### Tareas Pendientes
- Ninguna nueva. Sigue pendiente verificar el bottom sheet completo (incluyendo el flujo real de click-en-marcador) en un dispositivo móvil real, per el `journal.md` de la sesión anterior.

---

## [2026-07-20] — Sesión: Fix de galería amontonada, `EventCardList` compartido y bottom sheet móvil del mapa

### Objetivo de la Sesión
Corregir la miniatura de la tabla de Lista (debía usar fit + fondo secundario, no recortar), crear el componente `EventCardList` que faltaba y reutilizarlo en la Lista en móvil, convertir el panel lateral del mapa en un bottom sheet en móvil reutilizando sus mismos elementos, e investigar un bug reportado de la galería ("las cards se quedan amontonadas" al volver de la pestaña Lista).

### Cambios Realizados
1. **Fix de la galería (D-019)**: diagnosticado en vivo con el navegador — al reconstruir la galería mientras `#view-galería` está `display:none`, `sizeGalleryCard()` mide `clientWidth=0` y no fija `grid-row-end`; como el grid usa `align-self:start`, la tarjeta se dimensiona por su contenido real, más alto que el placeholder `.unsized` (~300px), solapándose con la fila siguiente. `switchView()` ahora remide cualquier tarjeta `.unsized` restante al activar la vista Galería.
2. **Miniatura de la tabla de Lista**: revertida de `object-fill` a `object-contain` (fit, sin recortar) sobre `bg-mel-bg-secondary` sin borde, corrigiendo una confusión de la sesión anterior.
3. **Componente `EventCardList.astro`** (nuevo, `src/components/`): réplica del diseño Figma "Event Card List" (node `291:13479`) — miniatura 56×56 fit sobre fondo secundario, título, fecha, chevron con hover.
4. **`buildEventCardListHtml()`** (index.astro): réplica JS única de ese componente (regla 7 de AGENTS.md), usada tanto por el panel lateral del mapa (`populateSidePanel()`, antes con marcado propio y `object-cover`) como por la nueva lista de tarjetas en móvil.
5. **Lista en móvil**: nuevo contenedor `#list-mobile-cards` (visible `<md`) con tarjetas `EventCardList`, sustituyendo la tabla ancha (`#list-table-wrapper`, ahora `hidden md:block`). Mismo dataset paginado; el listener de click delegado a nivel de `document` se extendió para cubrir ambos contenedores.
6. **Bottom sheet del panel del mapa (D-020)**: `#map-side-panel` gana un único estado CSS (`.side-panel-open`) que en escritorio sigue empujando el mapa (ancho 0→393px) y en móvil (`@media max-width:767px`) lo convierte en `position:fixed` anclado abajo, esquinas redondeadas, `max-height:75vh` y `transform: translateY()`. Se añadió un tirador (`#map-side-panel-handle`, solo móvil) con gesto de arrastre (soltar >120px cierra el sheet). Las 5 llamadas JS que antes alternaban clases `w-0`/`w-[393px]`/`w-[360px]` (una de ellas con un valor inconsistente) se unificaron a `classList.add/remove('side-panel-open')`.
7. **Helpers compartidos**: `escHtml()` y `formatFechaDMY()` (antes redeclarados dentro del `forEach` de cada fila de tabla) se elevaron a funciones de módulo, reutilizadas por `buildEventCardListHtml()`.

### Decisiones Tomadas
Ver `docs/decisions.md` D-019 (fix de reflow de la galería) y D-020 (`EventCardList` compartido + bottom sheet).

### Problemas Encontrados y Resueltos
- Bug de galería reproducido intencionadamente en el navegador (búsqueda disparada mientras la vista estaba oculta) antes de tocar código, confirmando la causa exacta vía `getComputedStyle`/`getBoundingClientRect` en vez de asumirla.
- El entorno sandbox de este agente no renderiza los tiles vectoriales de Google Maps (pantalla gris con solo el icono de clúster) — limitación del entorno de previsualización, no del código; verificado que no es una regresión comparando con el estado anterior a esta sesión. La apertura/cierre del panel y el bottom sheet se verificaron invocando `populateSidePanel()`-equivalentes directamente vía JS.
- Detectado (no corregido, fuera de alcance): `window.showLocationOnMap` referencia `locationGroups`, variable local de `updateMapMarkers()` fuera de su ámbito — bug preexistente a esta sesión; la función no tiene llamadas activas en el resto del código.

### Tareas Pendientes
- Verificar el bottom sheet y el gesto de arrastre en un dispositivo móvil real (el entorno de desarrollo no pudo probar el flujo completo de click-en-marcador por la limitación de renderizado de mapas del sandbox).
- Si en el futuro se retoma `window.showLocationOnMap`, corregir su referencia a `locationGroups`.

---

## [2026-07-20] — Sesión: Prototipado e interacción analógica/CRT en la animación de Intro

### Objetivo de la Sesión
Diseñar y prototipar 4 variantes interactivas de la animación de entrada para transformar progresivamente el efecto de papel impreso CMYK analógico inicial a un estado digital macro de subpíxeles CRT/RGB basado en la referencia fotográfica del usuario.

### Cambios Realizados
1. **Evolución de `src/pages/intro-lab.astro` (Timeline Studio v4.2 - Fix Inspector Controls Sync)**:
   - **Controles del Panel Lateral Reparados**: Se corrigió el conflicto en `seekTo()` que sobreescribía los deslizadores del inspector lateral mientras el usuario los ajustaba. Ahora cualquier cambio en los controles laterales actualiza el canvas inmediatamente en tiempo real y registra el keyframe.
   - **Servidor Único**: Limpieza de procesos secundarios de desarrollo para mantener un único servidor dev activo. All laboratorio está ubicado única y exclusivamente en la página de pruebas `src/pages/intro-lab.astro`.

---

## [2026-07-20] — Sesión: Política de desarrollo, auditoría y unificación de conocimiento

### Objetivo de la Sesión
Establecer una política de desarrollo permanente e independiente de los modelos de IA, auditar todo el proyecto y convertir la documentación en la **única fuente de verdad** del repositorio.

### Cambios Realizados
1. **Creación de `docs/product.md`**: Documentada la visión del producto, público objetivo, filosofía de diseño (los flyers como protagonistas) y límites deliberados del proyecto (*non-goals*).
2. **Creación de `docs/journal.md`**: Establecido el diario cronológico del proyecto para registrar sesiones significativas.
3. **Actualización de `AGENTS.md`**:
   - Convertida en una guía operativa universal e independiente de cualquier modelo de IA (Gemini, Claude, ChatGPT, Cursor, Copilot, etc.).
   - Incorporada la nueva **Política de Actualización Continuada de la Documentación** (Niveles 1, 2 y 3).
   - Añadida la lista oficial de **Definition of Done (DoD)** obligatoria antes de finalizar cualquier tarea importante.
   - Añadidas las Reglas 12, 13 y 14 sobre contexto de apilamiento `isolation: isolate` para blend modes, el sistema `EmptyState` y la física de la `IntroAnimation`.
4. **Actualización de la Documentación Técnica**:
   - `docs/architecture.md`: Documentados los componentes `<EmptyState />` e `<IntroAnimation />`, la persistencia de estado en `window._melState` y el patrón de desvinculación limpia de listeners mediante `AbortController`.
   - `docs/design-system.md`: Añadidos los tokens y especificaciones para el tinte fotográfico duotono (`mix-blend-screen` sobre B/N) y la tabla de componentes actualizada.
   - `docs/development.md`: Incorporado el flujo de desarrollo continuo, los 3 niveles de actualización de docs y la verificación manual.
   - `docs/decisions.md`: Registradas las decisiones D-016 (EmptyState y duotono) y D-017 (Intro CMYK y aislamiento de blend mode).
   - `docs/roadmap.md` y `README.md`: Actualizados con el estado real del proyecto a fecha de hoy.

### Decisiones Tomadas
- La documentación pasa a ser un artefacto de desarrollo de primer nivel que debe evaluarse de forma proactiva al concluir tareas importantes.
- Se fijan tres niveles de actualización documental (Nivel 1: Automático; Nivel 2: Solicitar Confirmación; Nivel 3: Gestión de Conflictos).
- Ninguna tarea importante puede darse por terminada sin validar el checklist de *Definition of Done (DoD)*.

### Problemas Encontrados y Resueltos
- Se identificó la ausencia de un documento de Producto (`docs/product.md`) que explicara la visión y los límites del proyecto. Solucionado mediante su creación.
- Se detectaron discrepancias entre decisiones recientes del código (Intro CMYK y EmptyState) y la documentación. Solucionado sincronizando todos los documentos del repositorio.

### Tareas Pendientes
- Definir el contenido final para la Sala de Exposiciones (`/exposiciones.astro`).
- Restringir la clave de Google Maps en la consola de Google Cloud por dominio HTTP Referrer.
- Asignar URLs válidas en la hoja para las fotos del equipo en `/info`.

---

## [2026-07-20] — Sesión: Mejora de tabla de Lista (thumbnails clickables)

### Objetivo de la Sesión
Enhancer la tabla de lista para que las miniaturas de diseños sean clickables y abran el overlay de detalles del evento, manteniendo coherencia con el comportamiento de la vista de mapa.

### Cambios Realizados
1. **Modificación de `src/pages/index.astro` (Generación de tabla de lista)**:
   - Cambio de cropping en thumbnails: `object-contain` → `object-fill` (recorte tipo fill, consistente con list-item del mapa)
   - Thumbnails ahora tienen clase `list-img-link`, atributo `data-id`, y estilos interactivos: `cursor-pointer`, `hover:brightness-110`, `transition-all duration-200`
   - Añadido atributo `referrerpolicy="no-referrer"` a las imágenes remotas

2. **Refactorización de Event Binding**:
   - Removido el binding de listeners directo en cada elemento dentro de `performDOMUpdates()` (causaba problemas de duplicación y pérdida en actualizaciones de transiciones de vista)
   - Implementado Event Delegation a nivel de `document` con un check `listBody.contains(e.target)` para filtrar clicks dentro de la tabla
   - El listener persiste durante toda la navegación mediante flag `window._melListClickHandlerBound`
   - Soporta clicks en: thumbnails (`list-img-link`), títulos de eventos (`event-title-link`), y celdas de búsqueda (`search-cell-link`)

3. **Comportamiento Implementado**:
   - Thumbnail click: Abre overlay de detalles del evento (llamada a `openLightbox()`)
   - Título del evento click: Abre overlay de detalles del evento
   - Celdas de búsqueda: Disparan filtrado por criterio (Lugar, Localidad, Organizador, Diseñador)

### Decisiones Técnicas
- Event Delegation (bubbling phase) a nivel de `document` en lugar de listeners directos, porque:
  - Los listeners directos se perdían durante `performDOMUpdates()` (la tabla se reconstruye en cada filtro/búsqueda)
  - El binding debe sobrevivir a view transitions (document siempre está presente)
  - Mejor rendimiento: un listener global vs. 32+ listeners individuales por página

### Problemas Encontrados y Resueltos
- **Pérdida de listeners en view transitions**: Solucionado moviendo el binding a `initHomePage()` y al nivel de `document`
- **Multiplicación de listeners**: Resuelto con flag `_melListClickHandlerBound` para registrar el listener una sola vez
- **Cropping inconsistente**: Se unificó con el comportamiento del mapa (`object-fill`)

### Tareas Pendientes
- Verificar que el event delegation funciona correctamente en todas las resoluciones (375px, 768px, 1280px)
- Confirmar no hay regressions en la navegación por teclado dentro de la tabla

---

## [2026-07-17] — Sesión: Refinamiento de la Intro CMYK e implementación del sistema EmptyState

### Objetivo de la Sesión
Finalizar la animación de intro con físicas de aberración cromática CMYK y crear el sistema de componentes `EmptyState` para búsquedas sin resultados y secciones en desarrollo.

### Cambios Realizados
1. **Componente `<IntroAnimation />`**:
   - Implementada física del ratón mediante `requestAnimationFrame` con desacoplamiento por capas: Amarilla máx 16px/1px blur, Magenta máx 8px/0.5px blur, Cian estática 0px.
   - Aplicada la propiedad `isolation: isolate` al contenedor del título para evitar artefactos en `mix-blend-multiply`.
   - Animación de ascensión ajustada a 2.1s con curva ease-in (`cubic-bezier(0.55, 0.085, 0.68, 0.53)`) y descomposición del subtítulo palabra por palabra (retardo de 150ms) acotado a `-90vh`.
2. **Componente `<EmptyState />`**:
   - Creado el componente reutilizable `src/components/EmptyState.astro` con variantes `construction` y `no-results` según el nodo Figma `825:72958`.
   - Descargados e integrados los assets de imagen duotono (`empty-state-construction.png` y `empty-state-no-results.png`).
   - Implementado el tinte fotográfico duotono mediante `bg-[var(--mel-primitive-le-900)]` + `mix-blend-screen`.
   - Integrado de forma estática en `/exposiciones.astro` y dinámicamente en client-side JS dentro de `performDOMUpdates()` en `index.astro` para Galería y Lista.

### Decisiones Tomadas
- Se fusionó la rama experimental `animacion` a `main` tras validar visualmente que el comportamiento de despegue ease-in y la descomposición por palabras cumplían con las expectativas.
- Se unificó el diseño de estados vacíos para evitar mensajes de texto planos en las búsquedas sin resultados.

---

## [2026-07-16] — Sesión: Refactorización de la Galería 2.1 e integración del scroll infinito

### Objetivo de la Sesión
Evolucionar la Galería de flyers desde la arquitectura CSS multicolumna hacia un masonry basado en CSS Grid + `row-span` medido por imagen con scroll infinito y orden aleatorio estable.

### Cambios Realizados
- Implementado el cálculo dinámico de altura por tarjeta (`sizeGalleryCard()`) sobre rejilla CSS Grid (`auto-rows: 4px`).
- Añadido el IntersectionObserver para scroll infinito mediante el centinela `#gallery-sentinel`.
- Añadida la semilla de aleatoriedad por sesión (`galleryRandomKeys`).
- Añadida la animación de entrada al scroll (`.reveal-pending` → `.reveal-in`).

### Decisiones Tomadas
- Ver decisión D-015 en `docs/decisions.md`.
