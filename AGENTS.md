# Guía para agentes de IA

Este archivo es el punto de entrada para **cualquier** agente de IA (Claude,
Gemini, ChatGPT, Copilot, Cursor u otros) que trabaje en este proyecto. No
contiene instrucciones específicas de ningún modelo.

Lee esto primero; después, según la tarea:

- Arquitectura y flujo de datos → [docs/architecture.md](docs/architecture.md)
- Estilos, componentes y reglas de UX → [docs/design-system.md](docs/design-system.md)
- Convenciones y flujo de trabajo → [docs/development.md](docs/development.md)
- Por qué las cosas son como son → [docs/decisions.md](docs/decisions.md)
- Qué está hecho y qué falta → [docs/roadmap.md](docs/roadmap.md)

## Visión general

Memoria Electrónica Leonesa (MEL) es un archivo web de flyers y carteles de la
escena electrónica de León (2004–2019). Astro en modo **SSR** (adapter de
Vercel); los datos se leen en **cada request** desde una hoja pública de Google
Sheets (endpoint `gviz/tq`). No hay base de datos ni backend propio. El idioma
de la interfaz y del contenido es **español**.

## Tecnologías

- **Astro 7** (`output: 'server'`, `@astrojs/vercel`), View Transitions (`ClientRouter`)
- **Tailwind CSS 4** (vía `@tailwindcss/vite`) sobre design tokens propios en `src/styles/global.css`
- **Google Sheets** como CMS (lectura por `gviz`), **Google Drive** como hosting de imágenes
- **Google Maps JS API** + MarkerClusterer (cargados por `<script>` en `Layout.astro`)
- JavaScript vanilla en `<script>` de los componentes/páginas — no hay React/Vue/etc.
- Sin framework de tests; la verificación es manual en navegador

## Estructura de carpetas

Ver el árbol comentado en [README.md](README.md#estructura-general). Lo esencial:

- `src/pages/index.astro` es un **monolito deliberado** (~3600 líneas): contiene
  las tres vistas de la home, el buscador, los filtros, el mapa y el overlay SPA
  de detalle. Antes de tocarlo, localiza la sección concreta con búsqueda de
  texto (`grep`) en lugar de leerlo entero.
- `src/components/` son componentes Astro de presentación, casi todos con su
  nodo de Figma anotado en `data-node-id`.

## Reglas importantes (aprendidas a base de bugs reales)

1. **Inicialización solo vía `astro:page-load`.** Todo script de cliente se
   engancha con `document.addEventListener('astro:page-load', init)`. Nunca
   llames a `init()` directamente además del listener: causa doble binding.
   Los listeners de `window` se registran con `AbortController` para poder
   cancelarlos al re-inicializar (ver `TimeSlider.astro`).
2. **Animaciones contenidas = `transform` CSS (FLIP), no `view-transition-name`.**
   Los elementos con `view-transition-name` se animan en la capa superior del
   navegador y se escapan de cualquier `overflow: hidden`. Para animar dentro de
   contenedores con scroll/clipping usa la técnica FLIP con transforms.
3. **No apiles `document.startViewTransition()`.** Iniciar una transición
   mientras otra está pendiente la supersede (las animaciones "no se ven").
   Coalescer con `requestAnimationFrame` (ver `updateSlider()` en index.astro).
4. **`history.back()` + fade propio = tirón.** El ClientRouter de Astro
   intercepta la navegación y superpone su propia transición. Para navegaciones
   con fade manual usa `window.location.href = …` (recarga dura).
5. **`calc()` dentro de `<col style="width:…">` no es fiable** en este entorno:
   usa porcentajes planos calculados a mano.
6. **`text-overflow: ellipsis` no funciona desde el padre** sobre un hijo
   `inline-block`: aplica `overflow:hidden; text-overflow:ellipsis;
   white-space:nowrap; max-width:100%` al propio elemento. En flex anidados hace
   falta la cadena `min-w-0` completa.
7. **Los componentes Astro no existen en cliente.** El HTML generado por JS
   (filas de tabla, tags del overlay) replica el estilo de los componentes con
   las mismas clases; si cambias un componente, busca sus réplicas JS
   (p. ej. `makeTagHtml()` en index.astro replica `TagWithLink`).
8. **URLs de Google Drive**: un enlace `drive.google.com/file/d/ID/view` no
   carga en un `<img>`; conviértelo siempre al endpoint
   `https://drive.google.com/thumbnail?id=ID&sz=w1000` (helper
   `extractDriveImage`). Los `<img>` de Drive llevan `referrerpolicy="no-referrer"`.
9. **Espaciados verticales de página en `vh`** y de la intro en `%`: están
   calibrados para que a 1440px de ancho / ~1100px de alto den los valores
   píxel aprobados por el propietario en su pantalla 4K. No los conviertas de
   vuelta a píxeles fijos.
10. **El header es idéntico en todas las páginas**: `pt-[10vh]`, misma fila
    (título/buscador + menú). En móvil el título colapsa a "M.E.L." y el menú a
    solo icono, con 16px de separación. Si creas una página nueva, replica el
    header de `exposiciones.astro`.
11. **CSS multicolumna rebalancea TODAS las columnas al añadir contenido al
    final** (`column-fill: balance` es obligatorio con altura libre): no sirve
    para scroll infinito porque cada lote mueve lo que el usuario está viendo.
    El masonry de la galería usa CSS Grid + `row-span` medido por imagen
    (`sizeGalleryCard()` en index.astro), que hace el append estable.

## Qué evitar

- Añadir frameworks de UI, librerías de animación o dependencias nuevas sin
  necesidad clara: el proyecto es deliberadamente vanilla.
- Reformatear o "limpiar" masivamente `index.astro`: los diffs grandes ocultan
  regresiones en un archivo con mucho estado acoplado.
- Cambiar valores de diseño "a ojo": los colores, tipografías y espaciados
  provienen de Figma; verifica contra el archivo de Figma o
  [docs/design-system.md](docs/design-system.md).
- Tocar los dos problemas **explícitamente aparcados** por el propietario sin
  que él los pida (ver "Problemas conocidos" en docs/roadmap.md).
- Inventar contenido: los textos vienen de la hoja de Google Sheets.

## Cómo realizar cambios

1. Localiza la sección con `grep` (ids y `data-name`/`data-node-id` son buenos anclajes).
2. Si el cambio es visual, consulta el nodo de Figma correspondiente si tienes
   acceso a él (los `data-node-id` del código apuntan al archivo de Figma).
3. Haz el cambio mínimo respetando el estilo local del archivo.
4. Recuerda los espejos: página estática `event/[id].astro` ⇄ overlay SPA de
   `index.astro` implementan el mismo diseño dos veces; los cambios de diseño
   de detalle de evento casi siempre tocan ambos.

## Cómo probar cambios

No hay tests automatizados. Verifica en navegador real:

```sh
npm run dev            # o, si tu entorno lo soporta: astro dev --background
```

(Con background: gestionar con `astro dev stop`, `astro dev status`, `astro dev logs`.)

- Prueba desktop **y** móvil (375px); los breakpoints activos son `md` (768px)
  y `lg` (1024px).
- Prueba la navegación suave (ClientRouter) además de la recarga: muchos bugs
  históricos solo aparecían al volver a la home con navegación suave.
- Si tu entorno de navegador es un sandbox sin foco/pintado real: las medidas
  (`getBoundingClientRect`, `clientWidth`) pueden ser 0/obsoletas hasta forzar
  un pintado (captura de pantalla), y `requestAnimationFrame` puede no
  ejecutarse con `document.hidden`. No diagnostiques bugs de layout sin un
  pintado real; ya ha causado falsos positivos.

## Cómo documentar

- Funcionalidad o módulo nuevo → sección en [docs/architecture.md](docs/architecture.md).
- Decisión con alternativas descartadas → entrada en [docs/decisions.md](docs/decisions.md)
  (contexto, decisión, motivo, consecuencias).
- Componente o token nuevo → [docs/design-system.md](docs/design-system.md).
- Al terminar una funcionalidad, actualiza [docs/roadmap.md](docs/roadmap.md).
- El historial de cambios es `git log` (mensajes de commit descriptivos, en
  inglés, estilo imperativo o `feat:`/`fix:`).
- Si descubres una regla nueva del tipo "esto no funciona como se espera",
  añádela a la lista de **Reglas importantes** de este archivo: es la lista que
  evita que el siguiente agente repita el mismo bug.
