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
- Diario de sesiones (**congelado**, solo histórico) → [docs/journal.md](docs/journal.md)

> **Cómo funciona la navegación del sitio** (orden de las tarjetas, navegación
> entre eventos, filtros, volver al sitio de origen) → **[Contrato de Navegación](docs/architecture.md#contrato-de-navegación-fuente-única-de-verdad)**.
> Es normativo: si el código lo contradice, es un bug del código.

---

## Qué es este proyecto

**Memoria Electrónica Leonesa (MEL)** es un archivo web de flyers y carteles de la escena electrónica de León (2004–2019). El idioma de la interfaz y del contenido es **español**.

No existe base de datos ni backend propio. Los datos se leen en cada request desde una hoja pública de Google Sheets.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Astro 7, `output: 'server'`, adaptador `@astrojs/vercel` |
| Estilos | Tailwind CSS 4 vía `@tailwindcss/vite`, design tokens propios en `src/styles/global.css` |
| Scripts de cliente | JavaScript Vanilla (sin React, Vue ni librerías de UI externas) |
| CMS | Google Sheets — endpoint público `gviz/tq` |
| Imágenes | Google Drive — thumbnail endpoint `https://drive.google.com/thumbnail?id=ID&sz=w1000` |
| Mapa | Google Maps JS API + `@googlemaps/js-api-loader` + MarkerClusterer |
| Navegación | View Transitions (`ClientRouter` de Astro) |
| Deploy | Vercel (SSR) |
| Tests | Sin framework automatizado; verificación manual en navegador real |

---

## Comandos

```bash
npm run dev      # servidor de desarrollo en http://localhost:4321
npm run build    # compilación de producción (SSR)
npm run preview  # previsualiza el build local
```

### RTK (Rust Token Killer)

CLI que comprime la salida de comandos de terminal antes de que llegue al contexto del agente — mismas respuestas, menos tokens. Instalado como `rtk-lite-cc` vía cargo.

Uso: anteponer `rtk` al comando. Ejemplos:

```bash
rtk git status    # git status compacto
rtk git diff      # diff condensado
rtk npm run build # build filtrado (solo errores)
rtk ls            # listado optimizado
```

---

## Origen de los datos

### Hoja de Google Sheets (CMS)

Los datos se obtienen en SSR mediante el endpoint `gviz/tq` de una hoja pública:

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:json&sheet={HOJA}
```

La respuesta es JSON-P; el proyecto lo parsea extrayendo el JSON entre `/*O_o*/\ngoogle.visualization.Query.setResponse(` y `);`.

### Columnas de la hoja de Flyers

Los datos se mapean por índice de columna (`c[n]`). Propiedades resultantes en el objeto de evento:

| Índice | Propiedad JS | Descripción |
|--------|-------------|-------------|
| `c[0]` | `evento` | Nombre del evento |
| `c[2]` | `urlDrive` | URL de Google Drive de la imagen (`/file/d/ID/view`) |
| `c[3]` | `fecha` | Fecha (formato DD/MM/YYYY) |
| `c[4]` | `lugar` | Nombre del local o espacio |
| `c[5]` | `localidad` | Localidad / barrio |
| `c[6]` | `coordenadas` | Coordenadas para el mapa |
| `c[7]` | `artistas` | Artistas del cartel |
| `c[8]` | `organiza` | Promotor / organizador |
| `c[9]` | `descripcion` | Texto libre sobre el evento |
| `c[10]` | `idMel` | Identificador único (`MEL-XXX`). Solo se importan filas cuyo `idMel` empiece por `"MEL-"` |
| `c[11]` | `carruselOrder` | Orden dentro del carrusel de imágenes del evento |
| `c[13]` | `disenador` | Autor del diseño gráfico |
| `c[16]` | `existeOriginal` | Si existe el flyer físico original |
| `c[21]` | `formato` | Tipo de pieza (p. ej. `"Flyer"`) |
| `c[24]` | `notasArchivo` | Notas internas de archivo |
| `c[25]` | `ocr` | Texto extraído por OCR de la imagen |

> Índices intermedios (`c[1]`, `c[12]`, `c[14]–c[15]`, `c[17]–c[20]`, `c[22]–c[23]`) están en la hoja pero no se usan actualmente.

### URLs de imagen

Un enlace `drive.google.com/file/d/ID/view` **no** carga en `<img>`. Siempre se convierte vía `extractDriveImage()` a:

```
https://drive.google.com/thumbnail?id=ID&sz=w1000
```

Todo `<img>` remoto debe incluir `referrerpolicy="no-referrer"`.

---

## Estructura de carpetas

Ver el árbol comentado en [README.md](README.md#estructura-general). Puntos críticos:

- `src/pages/index.astro` es un **monolito deliberado** (~3600 líneas): contiene las tres vistas de la home (Galería, Mapa, Lista), el buscador, los filtros, el mapa y el overlay SPA de detalle. **Nunca lo leas entero de golpe; usa `grep` para localizar secciones.**
- `src/components/` contiene los componentes Astro de presentación, anotados con su nodo de Figma en `data-node-id`.

---

## Uso de Superpowers (obligatorio)

Antes de implementar cualquier nueva feature, componente o funcionalidad significativa, **siempre** invoca el skill `superpowers:brainstorming` mediante la herramienta `Skill`. No empieces a tocar código sin haber pasado por ese paso.

Para bugs o comportamiento inesperado, usa `superpowers:systematic-debugging` antes de proponer ningún arreglo.

Antes de escribir código de implementación, usa `superpowers:test-driven-development` para definir los tests primero.

Al completar una tarea o feature, usa `superpowers:requesting-code-review` para verificar que el trabajo cumple los requisitos.

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
- *Ejemplos:* Registrar una decisión en `decisions.md`, mover tareas en `roadmap.md`, documentar una API/componente ya creado, o corregir textos desactualizados. (`journal.md` está congelado: la cronología la lleva `git log`.)
- Al finalizar, indica qué archivos has actualizado.

### NIVEL 2 — Solicitar Confirmación
Si la actualización implica modificar decisiones estratégicas, reorganizar la estructura documental o cambiar sustancialmente el flujo de trabajo, solicita confirmación antes de aplicar los cambios:
> *"Hemos tomado decisiones que probablemente deberían quedar reflejadas en la documentación del proyecto. ¿Quieres que la actualice ahora?"*

### NIVEL 3 — Gestión de Conflictos
Si detectas discrepancias entre la documentación, el código o conversaciones previas, **no modifiques nada automáticamente**. Explica el conflicto, propón la mejor solución justificada y espera instrucciones.

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
16. **Control Estricto de Commits y Validación:** NUNCA realizar commits en Git, ni crear tags, ni dar por validado un cambio por iniciativa propia. Ningún trabajo se considera validado hasta que el usuario lo revise visualmente y dé su conformidad u orden explícita de commit.

---

## Qué Evitar

- Añadir frameworks de UI (React, Vue, Svelte), librerías de animación (GSAP, Framer Motion) o dependencias nuevas sin necesidad clara.
- Reformatear o "limpiar" masivamente `index.astro`: los diffs grandes generan regresiones en estado acoplado.
- Alterar valores de diseño "a ojo": verifica siempre contra Figma o [docs/design-system.md](docs/design-system.md).
- Modificar los problemas aparcados explícitamente sin solicitud previa (ver "Problemas conocidos" en [docs/roadmap.md](docs/roadmap.md)).
- Inventar contenidos o textos: provienen exclusivamente de la hoja de Google Sheets.

---

## Definition of Done (DoD) — Comprobación de Fin de Tarea

Antes de dar cualquier tarea importante por finalizada, debes verificar internamente el siguiente checklist:

- [ ] **El código funciona** y pasa la compilación (`npm run build`).
- [ ] **No existen regresiones conocidas** en escritorio o móvil.
- [ ] **La verificación manual se ha realizado** en navegador real.
- [ ] **La documentación refleja los cambios** y sigue siendo la principal fuente de verdad.
- [ ] **Las decisiones importantes han quedado registradas** en `docs/decisions.md`.
- [ ] **El roadmap está actualizado** en `docs/roadmap.md` si procede.
- [ ] **Si el cambio afecta al comportamiento de navegación, el Contrato de Navegación de `docs/architecture.md` lo refleja.**

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
- Comportamiento de navegación → [Contrato de Navegación](docs/architecture.md#contrato-de-navegación-fuente-única-de-verdad)
- Registro cronológico → `git log` (`journal.md` está congelado)

---

## Decisiones

### 2026-07-24 — Stack inicial confirmado

**Decisión:** Astro 7 SSR + `@astrojs/vercel` + Tailwind CSS 4 + Vanilla JS. Sin frameworks de UI (React, Vue, Svelte). Sin base de datos propia.
**Motivo:** Coherencia con el diseño aprobado en Figma. La hoja de Google Sheets es suficiente como CMS para el volumen de datos actual.

### 2026-07-24 — CLAUDE.md como fuente de verdad operativa

**Decisión:** Este archivo reemplaza cualquier instrucción verbal de sesiones anteriores. Las reglas críticas viven aquí, no en la memoria de sesión.
**Consecuencia:** Cualquier regla nueva aprendida de un bug real se añade a la sección "Reglas Importantes" de este archivo.
