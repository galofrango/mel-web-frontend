# Diario del Proyecto (Project Journal)

Este archivo registra la cronología de las sesiones de desarrollo importantes. Su objetivo es mantener un histórico claro de la evolución del proyecto, las decisiones tomadas, los problemas resueltos y los próximos pasos.

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
