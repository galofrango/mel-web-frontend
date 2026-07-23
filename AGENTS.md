# Guía para Agentes de IA

Este archivo es el punto de entrada para **cualquier** agente de IA (Claude, Gemini, ChatGPT, Copilot, Cursor, Windsurf u otros) que trabaje en este repositorio. No contiene instrucciones específicas de ningún modelo en particular y constituye la fuente de orientación operativa del proyecto.

La documentación del repositorio es la **única fuente de verdad** del proyecto. Las conversaciones son temporales; la documentación es permanente.

Lee este documento primero; después, consulta según la tarea:

- Visión de producto y filosofía → [docs/product.md](docs/product.md)
- Arquitectura y flujo de datos → [docs/architecture.md](docs/architecture.md)
- Estilos, componentes y reglas de UX → [docs/design-system.md](docs/design-system.md)
- Convenciones y flujo de trabajo → [docs/development.md](docs/development.md)
- Decisiones de diseño e ingeniería → [docs/decisions.md](docs/decisions.md)
- Estado del proyecto y roadmap → [docs/roadmap.md](docs/roadmap.md)
- Diario de sesiones del proyecto → [docs/journal.md](docs/journal.md)

---

## Visión General

Memoria Electrónica Leonesa (MEL) es un archivo web de flyers y carteles de la escena electrónica de León (2004–2019). Construido con **Astro** en modo **SSR** (adapter `@astrojs/vercel`), los datos se leen en **cada request** desde una hoja pública de Google Sheets (endpoint `gviz/tq`). No existe base de datos ni backend propio. El idioma de la interfaz y del contenido es **español**.

---

## Tecnologías Principales

- **Astro 7** (`output: 'server'`, `@astrojs/vercel`), View Transitions (`ClientRouter`)
- **Tailwind CSS 4** (vía `@tailwindcss/vite`) sobre design tokens propios en `src/styles/global.css`
- **Google Sheets** como CMS (lectura vía `gviz`), **Google Drive** como hosting de imágenes
- **Google Maps JS API** + MarkerClusterer (cargados mediante script en `Layout.astro`)
- **JavaScript Vanilla** en scripts de cliente de componentes/páginas (sin React, Vue o bibliotecas externas de UI)
- Sin framework de tests automatizados; la verificación es manual en navegador real

---

## Estructura de Carpetas

Ver el árbol comentado en [README.md](README.md#estructura-general). Puntos críticos:

- `src/pages/index.astro` es un **monolito deliberado** (~3600 líneas): contiene las tres vistas de la home (Galería, Mapa, Lista), el buscador, los filtros, el mapa y el overlay SPA de detalle. **Nunca lo leas entero de golpe; usa `grep` para localizar secciones.**
- `src/components/` contiene los componentes Astro de presentación, anotados con su nodo de Figma en `data-node-id`.

---

## Política de Actualización Continuada de la Documentación

La documentación se mantiene de forma **proactiva y continua**. La documentación no es un paso opcional al final, sino parte integral del desarrollo.

Cada vez que durante una sesión ocurra alguna de las siguientes situaciones:
- Se toma una decisión de arquitectura o producto.
- Cambia un flujo de usuario o se añade/elimina una funcionalidad.
- Se introduce una convención, dependencia o limitación técnica.
- Cambia el roadmap o el estado del proyecto.

Debes aplicar los siguientes tres niveles de actualización:

### NIVEL 1 — Actualización Automática
Si los cambios son pequeños, objetivos y no modifican decisiones estratégicas, actualiza directamente la documentación sin preguntar.
- *Ejemplos:* Registrar una decisión en `decisions.md`, mover tareas en `roadmap.md`, actualizar el `journal.md`, documentar una API/componente ya creado, o corregir textos desactualizados.
- Al finalizar, indica qué archivos has actualizado.

### NIVEL 2 — Solicitar Confirmación
Si la actualización implica modificar decisiones estratégicas, reorganizar la estructura documental o cambiar sustancialmente el flujo de trabajo, solicita confirmación antes de aplicar los cambios:
> *"Hemos tomado decisiones que probablemente deberían quedar reflejadas en la documentación del proyecto. ¿Quieres que la actualice ahora?"*

### NIVEL 3 — Gestión de Conflictos
Si detectas discrepancias entre la documentación, el código o conversaciones previas, **no modifiques nada automáticamente**. Explica el conflicto, propón la mejor solución justificada y espera instrucciones.

---

## Definition of Done (DoD) — Comprobación de Fin de Tarea

Antes de dar cualquier tarea importante por finalizada, debes verificar internamente el siguiente checklist:

- [ ] **El código funciona** y pasa la compilación (`npm run build`).
- [ ] **No existen regresiones conocidas** en escritorio o móvil.
- [ ] **La verificación manual se ha realizado** en navegador real.
- [ ] **La documentación refleja los cambios** y sigue siendo la principal fuente de verdad.
- [ ] **Las decisiones importantes han quedado registradas** en `docs/decisions.md`.
- [ ] **El roadmap está actualizado** en `docs/roadmap.md` si procede.
- [ ] **El diario del proyecto (`docs/journal.md`) se ha actualizado** si la sesión ha sido relevante.

---

## Reglas Importantes (Aprendidas mediante bugs reales en producción)

1. **Inicialización solo vía `astro:page-load`:** Todo script de cliente se engancha con `document.addEventListener('astro:page-load', init)`. Nunca llames a `init()` directamente fuera del listener (causa doble binding). Los listeners de `window` se registran obligatoriamente con `AbortController` (`window._melAbortCtrl`) para cancelarlos al re-inicializar (ver `TimeSlider.astro`).
2. **Animaciones contenidas = `transform` CSS (FLIP), no `view-transition-name`:** Los elementos con `view-transition-name` se animan en la capa superior del navegador y se escapan de cualquier `overflow: hidden`. Para animar dentro de contenedores con scroll o clipping usa la técnica FLIP con transforms.
3. **No apiles `document.startViewTransition()`:** Iniciar una transición mientras otra está pendiente la supersede (las animaciones se congelan o no se ven). Coalesce las llamadas con `requestAnimationFrame` (ver `updateSlider()` en index.astro).
4. **`history.back()` + fade propio = tirón:** El `ClientRouter` de Astro intercepta la navegación y superpone su propia transición. Para navegaciones con fade manual usa `window.location.href = ...` (recarga dura).
5. **`calc()` dentro de `<col style="width:...">` no es fiable:** En este entorno renderiza columnas desiguales; usa porcentajes planos calculados a mano.
6. **`text-overflow: ellipsis` exige la cadena completa:** Aplica `overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%` al propio elemento. En contenedores flex anidados es indispensable añadir `min-w-0` a toda la cadena de padres.
7. **Los componentes Astro no existen en cliente:** El HTML generado dinámicamente por JS (filas de tabla, tags del overlay, estados vacíos) debe replicar exactamente el marcado y clases de los componentes Astro. Si cambias un componente, actualiza sus réplicas JS (p. ej. `makeTagHtml()` o los renderers de la lista en `index.astro`).
8. **URLs de Google Drive (`extractDriveImage`):** Un enlace `drive.google.com/file/d/ID/view` no carga en un `<img>`; conviértelo siempre al endpoint `https://drive.google.com/thumbnail?id=ID&sz=w1000`. Todo `<img>` remoto debe incluir `referrerpolicy="no-referrer"`.
9. **Espaciados verticales en `vh` y de intro en `%`:** Están calibrados a 1440px de ancho / ~1100px de alto para reproducir los píxeles aprobados por el propietario en pantalla 4K. No los reconviertas a píxeles fijos.
10. **Geometría del Header unificada:** Mismo padding superior `pt-[10vh]` y misma fila en todas las páginas. En móvil el título colapsa a "M.E.L." y el menú a icono, con gap de 16px. Replica el header de `exposiciones.astro` en páginas nuevas.
11. **Estabilidad de la Galería:** El masonry de la galería usa CSS Grid + `row-span` medido por imagen (`sizeGalleryCard()` en index.astro). No uses CSS multicolumna con scroll infinito porque rebalancea todas las columnas al añadir un lote.
12. **Contexto de Apilamiento para Blend Modes (`isolation: isolate`):** Las capas con `mix-blend-multiply` o `mix-blend-screen` requieren `isolation: isolate` en su contenedor padre directo para evitar desvanecimientos anómalos o comportamientos impredecibles con el fondo del navegador.
13. **Sistema de Estados Vacíos (`EmptyState`):** Utiliza `<EmptyState variant="construction|no-results" />` o su réplica de marcado JS. Implementa el tinte fotográfico duotono (`bg-[var(--mel-primitive-le-900)]` + `mix-blend-screen` sobre imagen en blanco y negro).
14. **Parámetros Físicos de la Intro CMYK (`IntroAnimation.astro`):** La capa Amarilla se desplaza más (máx 16px, desenfoque máx 1px), la Magenta segunda (8px, desenfoque máx 0.5px) y la Cian permanece estática (0px, sin desenfoque). El despegue usa curva ease-in (`cubic-bezier(0.55, 0.085, 0.68, 0.53)`) de 2100ms y el subtítulo se descompone palabra a palabra con 150ms de retardo acotado a `-90vh` (por debajo de la cian a `-135vh`).
15. **Estabilidad de la Navegación Evento → Mapa (NUNCA ALTERAR SSR/ANIMACIONES DE ESTE FLUJO):** No intentar añadir transiciones ni cambiar las clases activas de SSR al navegar desde "Lugar" en la ficha del evento a la vista de Mapa. Cambiar la vista SSR por defecto o el flujo de inicialización rompe los event listeners del panel lateral, dejándolo atascado. Conservar siempre la apertura asíncrona cliente (`populateSidePanel`) y la gestión manual del listener de cierre.

---

## Qué Evitar

- Añadir frameworks de UI (React, Vue, Svelte), librerías de animación (GSAP, Framer Motion) o dependencias nuevas sin necesidad clara.
- Reformatear o "limpiar" masivamente `index.astro`: los diffs grandes generan regresiones en estado acoplado.
- Alterar valores de diseño "a ojo": verifica siempre contra Figma o [docs/design-system.md](docs/design-system.md).
- Modificar los problemas aparcados explícitamente sin solicitud previa (ver "Problemas conocidos" en [docs/roadmap.md](docs/roadmap.md)).
- Inventar contenidos o textos: provienen exclusivamente de la hoja de Google Sheets.

---

## Cómo Realizar y Probar Cambios

1. **Localizar con `grep`:** Busca ids, clases o atributos `data-node-id` / `data-name`.
2. **Consultar Figma:** Verifica nodos de Figma anotados en el código cuando realices ajustes visuales.
3. **Mantenimiento en Espejo:** Si modificas el detalle de evento, actualiza `src/pages/event/[id].astro` **y** el overlay SPA en `src/pages/index.astro`.
4. **Prueba local en servidor de desarrollo:**
   ```sh
   npm run dev      # servidor en http://localhost:4321
   ```
5. **Verificación en Navegador:**
   - Comprueba escritorio y móvil (375px; breakpoints `md: 768px` y `lg: 1024px`).
   - Verifica la navegación suave (`ClientRouter`) además de la recarga directa.
   - En entornos sandbox sin renderizado de pantalla, fuerza una captura de pantalla antes de diagnosticar errores de layout (evita falsos positivos con `getBoundingClientRect()` o `requestAnimationFrame`).
6. **Aplicar Definition of Done (DoD)** antes de considerar la tarea finalizada.

---

## Mantenimiento de la Documentación

Cualquier cambio de arquitectura, nuevo componente, regla o decisión de UX debe quedar documentado al finalizar la tarea:
- Decisión técnica / alternativa descartada → [docs/decisions.md](docs/decisions.md)
- Módulo / flujo de datos → [docs/architecture.md](docs/architecture.md)
- Token / componente UI → [docs/design-system.md](docs/design-system.md)
- Tareas completadas / pendientes → [docs/roadmap.md](docs/roadmap.md)
- Registro cronológico de la sesión → [docs/journal.md](docs/journal.md)
