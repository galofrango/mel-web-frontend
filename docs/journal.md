# Diario del Proyecto (Project Journal)

Este archivo registra la cronología de las sesiones de desarrollo importantes. Su objetivo es mantener un histórico claro de la evolución del proyecto, las decisiones tomadas, los problemas resueltos y los próximos pasos.

## [2026-07-22] — Sesión: Estilos de hover en los elementos del menú lateral (D-069)

### Objetivo de la Sesión
Actualizar el color de fondo en hover de los enlaces del menú lateral (`SideMenu.astro`) a `bg-mel-bg-secondary` y asegurar que los textos e iconos cambien a `text-mel-action-secondary` en lugar de `text-mel-action-primary`.

### Cambios Realizados
1. **Componente `src/components/SideMenu.astro`**:
   - Reemplazada la clase `hover:bg-mel-bg-secondary/40` por `hover:bg-mel-bg-secondary` en todos los enlaces (`#menu-item-home`, `#menu-item-intro`, etc.).
   - Reemplazada la clase `group-hover:text-mel-action-primary` por `group-hover:text-mel-action-secondary` en las etiquetas de texto `<p>` y en el componente de icono `IconButton`.
2. **Documentación**: Registrada decisión `D-069` en `docs/decisions.md`.

---

## [2026-07-22] — Sesión: Bug real de visibilidad en Lista (dos estilos a la vez), regresión de la paginación de D-064, borde superior de tabla, verificaciones de galería/hover

### Objetivo de la Sesión
Revisión del propietario tras D-064: en la vista de Lista, ciertos anchos mostraban a la vez tarjetas compactas Y tabla; la paginación no aparecía bien al final del scroll con espacio hasta el borde; la tabla parecía sin borde superior; el contenedor de tarjetas en móvil mostraba dos bordes a sangre que se leían como defecto. Pidió también confirmar que el espaciado de 24px de la Galería seguía intacto, y preguntó si el hover ausente en los tags horizontales del detalle era intencional.

### Cambios Realizados
Ver `docs/decisions.md` D-065. Causa real de "dos estilos a la vez": `filterArchives()` hacía `classList.remove('hidden')` en la tabla de escritorio cada vez que había resultados (el caso normal), pero `hidden` era también la única clase que la ocultaba por debajo de 440px (su par responsive `min-[440px]:block`) — al eliminarse para siempre, la tabla quedaba visible en cualquier ancho. Cambiado a `style.display` inline, que no toca esa clase. Los 6 `<th>` de la cabecera ganan `border-t` propio (antes el borde de la tabla podía quedar tapado por el `<thead>` sticky y sus celdas opacas). Revertido el `-mb-[3vh]` de `#view-lista` añadido en D-064 — al ser `#pagination-controls` un hermano flex (no algo dentro de la lista), ese margen negativo tiraba de la paginación hacia arriba, solapándola con la tabla en vez de dejarla con su hueco habitual hasta el borde de pantalla.

### Problemas Encontrados y Resueltos
- El bug de "dos estilos a la vez" y el "borde doble a sangre" en móvil resultaron ser el MISMO bug (la tabla y las tarjetas visibles simultáneamente) descrito desde dos ángulos distintos.
- Espaciado de la Galería: verificado sin cambios (~22.9px, cuantización normal del algoritmo de row-span de D-015, no una regresión).
- Hover en los tags horizontales: verificado que SÍ funciona (color cambia correctamente al pasar el ratón, en la página estática y en el overlay) tras descartar varios falsos negativos causados por la propia herramienta de simulación de ratón de este entorno, que resultó intermitente entre llamadas.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-22] — Sesión: Tiradores del slider táctil "temblando" (falta touch-action), auditoría de tags aparcada explícitamente, checklist cross-browser añadida al flujo de publicación

### Objetivo de la Sesión
El propietario, sobre la sesión anterior: el chevron/elipsis del texto de los tags SIGUE sin verse pese a que la medición decía que el truncado era correcto — pidió no darlo por resuelto y en su lugar planificar una auditoría dedicada de todas las instancias de `TagWithLink`/`Link.astro` del sitio. La paginación y la cabecera sticky de la tabla van bien en unos navegadores y mal en otros — pidió añadir una comprobación cross-browser al flujo de publicación. Además, reportó (inspeccionando con herramientas táctiles de Chrome/Comet) que los tiradores del slider de fecha "tiemblan" en táctil, con sospecha de un amago de scroll horizontal de la página.

### Cambios Realizados
Ver `docs/decisions.md` D-068. Causa encontrada para el temblor del slider: ni los tiradores (`SliderHandler.astro`) ni el track (`TimeSlider.astro`) declaraban `touch-action`, así que un arrastre táctil podía ser interpretado a la vez por el JS (que mueve el tirador) y por el reconocimiento de gestos nativo del navegador (que intenta hacer scroll de la página) — los dos compitiendo por el mismo gesto. Añadido `touch-none` a ambos. Confirmado por lectura de código que ningún listener de arrastre llama a `preventDefault()` fuera del `pointerdown` inicial, y que la página no tiene overflow horizontal genuino en reposo (medido `scrollWidth` vs `innerWidth`) — el rebote viene específicamente de esta competencia de gestos, no de un elemento desbordando la página.

Documentación: nueva sección "Pendiente de Auditoría" en `roadmap.md` (no cerrar hasta hacer la revisión completa de tags pedida explícitamente). Nuevo paso 7 en el flujo de publicación de `development.md`: comprobación cross-browser (Chromium + WebKit/Firefox, y táctil real cuando aplique), señalando los dos puntos ya detectados como inconsistentes entre navegadores.

### Problemas Encontrados y Resueltos
- El slider nunca había tenido `touch-action` declarado — un gap real, no una regresión de esta sesión.
- No se pudo verificar visualmente el arrastre táctil en este entorno (mismo problema de capturas no fiables de la sesión anterior, y sin dispositivo táctil real disponible) — queda pendiente de confirmación del propietario.

### Tareas Pendientes
- Auditoría dedicada de `TagWithLink`/`Link.astro` en todo el sitio — ver `roadmap.md`, "Pendiente de Auditoría". NO cerrar como resuelto sin esa sesión.
- Confirmación del propietario en dispositivo táctil real de que el temblor del slider desapareció.
- Diagnosticar la diferencia real entre navegadores para la paginación de Lista y la cabecera sticky de su tabla.

---

## [2026-07-22] — Sesión: Desbordamiento real del chevron/texto en tags (causa distinta a D-066), bug real de carga de la paginación, centrado horizontal, vistas de inicio 24px más arriba en móvil

### Objetivo de la Sesión
Nueva ronda con capturas: el chevron seguía sin verse en algunos tags Y el texto se desbordaba sin truncar (con la opción explícita de aparcar esto para una auditoría dedicada si era muy grande); la paginación seguía con problemas de carga al entrar en Lista por primera vez, además de pedir que se mantenga centrada horizontalmente con scroll y algo más pegada a la tabla arriba con más aire abajo; el asomo de contenido sobre la cabecera de la tabla se aparca explícitamente; subir 24px el contenedor principal de Galería/Mapa/Lista en móvil.

### Cambios Realizados
Ver `docs/decisions.md` D-067. La causa del desbordamiento: `.highlight-unit` está capado a `max-width:176px` (D-061), pero el `TagWithLink` que contiene llevaba `shrink-0`, impidiéndole encogerse dentro de ese cap — el texto se desbordaba en vez de truncar con elipsis. Quitado `shrink-0` en `AdaptiveTagsRow.astro` y su espejo del overlay. La causa del bug de carga de la paginación: `switchView()` tenía su propia lógica de visibilidad independiente de la que D-066 había añadido solo en `filterArchives()`, y `#pagination-controls` no tenía ningún estado `hidden` en su propio SSR — un FOUC real. Centralizado en una función compartida `relocatePaginationControls()`, y el elemento arranca `hidden` en el servidor. Añadido `sticky left-0 right-0` para mantenerla centrada en lo visible aunque la tabla se desplace horizontalmente, y ajustado su espaciado (`pt-10 pb-6` → `pt-6 pb-10`). Las tres vistas de inicio (`#view-galería`/`#view-mapa`/`#view-lista`) suben 24px en móvil, manteniendo su alineación mutua.

### Problemas Encontrados y Resueltos
- El servidor de Vite volvió a romperse (mismo error que en la sesión anterior) — reiniciado de nuevo.
- Las capturas de pantalla del navegador demostraron NO reflejar cambios reales incluso con el servidor sano (confirmado forzando `document.body.style.background = 'red'` y viendo que no aparecía en la captura, en más de una pestaña) — sin causa identificada. A partir de este punto, toda verificación se hizo leyendo el HTML servido directamente por `curl`, el único método fiable disponible en este entorno para esta sesión.

### Tareas Pendientes
- Confirmación visual del propietario en un navegador real de todos los cambios de esta sesión — las capturas de este entorno no son fiables.
- Cabecera sticky de la tabla de Lista con asomo de contenido — aparcada explícitamente, ver `docs/roadmap.md`.

---

## [2026-07-22] — Sesión: Chevron ausente (bug real, no falso negativo), paginación de Lista incorporada al scroll, servidor de dev reiniciado tras invalidar verificaciones previas

### Objetivo de la Sesión
El propietario corrigió tres afirmaciones de la sesión anterior con capturas nuevas y cerró con "No me gusta que me engañen": el chevron de los enlaces seguía sin verse (yo había confirmado solo el cambio de color, no el icono); la petición de la paginación nunca fue "que llegue al borde de pantalla" sino "que aparezca al final del scroll, no que esté siempre visible"; la tabla seguía sin borde superior visible y con contenido asomando por encima de la cabecera durante el scroll; las líneas horizontales de las tarjetas en móvil seguían ahí.

### Cambios Realizados
Ver `docs/decisions.md` D-066. Durante la investigación del chevron se descubrió que el servidor de Vite llevaba un error real en sus logs (`Failed to load url astro:server-app.js`) que invalidaba screenshots de forma intermitente — confirmado forzando `document.body.style.background = 'red'` y comprobando que no se reflejaba en la captura. Reiniciar el servidor resolvió la verificación. Con el servidor sano, la causa real del chevron: `Link.astro`'s `.mel-link-active` (el `<a>`) tenía `overflow:hidden` para truncar su propio texto, y ese mismo overflow recortaba el chevron — posicionado deliberadamente FUERA de la caja del enlace — en cualquier instancia del sitio, no solo en la fila horizontal de esta sesión. Movido el overflow/ellipsis al span interno de texto. La paginación de Lista se re-parenta ahora por JS al final de la tabla/tarjetas activa (dentro del contenedor con scroll, no como hermano fijo), visible solo al llegar al final. Cabecera de tabla con fondo propio (mejora parcial, no resuelve del todo un asomo de contenido en puntos concretos del scroll — comunicado como deuda técnica, no como arreglado). Bordes horizontales de las tarjetas de Lista en móvil eliminados, tras preguntar explícitamente en vez de suponer.

### Problemas Encontrados y Resueltos
- Servidor de dev en estado degradado tras una sesión de HMR muy larga — reiniciado.
- El chevron ERA un bug real (no un falso negativo de la herramienta como se concluyó antes) — la corrección anterior solo había verificado el color del hover, no el icono.
- El asomo de contenido sobre la cabecera sticky de la tabla resultó ser un problema de renderizado persistente (sticky + table + border-collapse) que resistió cinco intentos de fix por CSS — documentado honestamente como deuda técnica pendiente, no como resuelto.

### Tareas Pendientes
- Cabecera sticky de la tabla de Lista con asomo de contenido en puntos concretos del scroll — requiere convertirla a un header simulado por JS (`position:fixed`), como ya hace el sitio para la foto fijada del detalle de evento. Ver `docs/roadmap.md`.

---

## [2026-07-22] — Sesión: Tag "Promotores" en el panel del mapa, más separación entre toolbar y Galería durante el scroll, contenedores de scroll hasta el borde real de la pantalla

### Objetivo de la Sesión
Tres peticiones: añadir el conteo de Promotores al panel de eventos del mapa (última tag, igual que la toolbar); separar 16px la Galería de la toolbar en escritorio (los elementos quedaban pegados durante el scroll); hacer que los contenedores de scroll de Galería y Lista lleguen hasta el borde real de la pantalla.

### Cambios Realizados
Ver `docs/decisions.md` D-064. `populateSidePanel()` calcula ahora un `promotersSet` (mismo criterio que la toolbar) y lo vuelca en una 4ª tag del panel. `#view-galería` cambia `pt-[24px]` por `pt-[24px] lg:pt-[8px] lg:mt-[16px]` en escritorio — mueve 16px de padding (que desaparece nada más empezar el scroll) a margin (que nunca desaparece), sin mover la posición de la primera fila en reposo. `#view-galería` y `#view-lista` ganan `-mb-[3vh]`, cancelando el `pb-[3vh]` calibrado de la página solo para ellos (mismo recurso de márgenes negativos que ya usaba la Galería en los lados) para que lleguen al borde real de la pantalla en vez de quedarse ~27px cortos.

### Problemas Encontrados y Resueltos
- Ninguno nuevo — cambios verificados directamente por medición en navegador (`getBoundingClientRect()` contra `innerHeight`).

### Tareas Pendientes
- Ninguna nueva. Verificación del panel del mapa con datos reales de un marcador sigue bloqueada por la misma limitación del entorno sandbox (sin tiles de mapa) señalada en sesiones anteriores.

---

## [2026-07-22] — Sesión: La fuente incorrecta del overlay no era una carrera (CSS con scope de Astro no llega a HTML por innerHTML), colchón de seguridad bajo la foto fijada durante el scroll

### Objetivo de la Sesión
El propietario, probando en Chrome real el fix de D-061, reportó que la fuente incorrecta persistía siempre ("no se cambia nunca que yo vea") — contradiciendo el diagnóstico de carrera con fuentes — y pidió que la caja de la foto fijada del detalle de evento tenga un margen/padding con fondo durante el scroll, para no dejar asomar el texto que pasa por debajo.

### Cambios Realizados
Ver `docs/decisions.md` D-062 y D-063. La causa real de la fuente: el CSS con scope de componente de `Link.astro` (clases `.mel-link-active`/`.mel-link-underline`) solo se aplica a elementos que Astro renderiza server-side con su atributo hasheado — el mirror JS `makeAdaptiveTagHtml()` del overlay (D-060) inyecta HTML vía `innerHTML`, así que esas clases nunca hicieron nada, con o sin carrera de por medio. Reescrito para llevar la maquetación como utilidades de Tailwind explícitas en vez de depender de esas clases. Añadido `padding-bottom:24px` a la caja de la foto fijada, solo mientras está en modo `position:fixed` (limpiado en reposo y en escritorio), en `event/[id].astro` y su espejo en `index.astro`.

### Problemas Encontrados y Resueltos
- Diagnóstico erróneo en D-061 (carrera con fuentes) corregido tras medición directa en navegador real — recordatorio de que "parece un bug, no una carrera" del propietario era la pista correcta.
- Las herramientas de simulación de scroll de este entorno sandbox se comportaron de forma inconsistente (timeouts, estados contradictorios entre `scrollTo()` directo y gestos simulados) al intentar verificar visualmente el colchón bajo la foto — no fue posible una confirmación visual completa en este entorno; el cambio en sí es seguro y mínimo (un padding condicional, sin tocar la lógica de sincronización existente).

### Tareas Pendientes
- Confirmación visual del propietario en navegador real del colchón bajo la foto durante un scroll genuino (gesto de rueda/trackpad), no verificable en este sandbox.

---

## [2026-07-22] — Sesión: Fix de la carrera con fuentes web (causa real del salto a dos líneas), solape de navegación en el overlay, ancho máx. 176px por tag, ancho mín. 320px del panel del mapa

### Objetivo de la Sesión
Dos bugs reales reportados con capturas sobre el trabajo de D-060 (fila de tags a veces con dos líneas y con la fuente incorrecta en el detalle de evento; navegación Anterior/Siguiente solapando contenido en el overlay de escritorio) más dos ajustes de diseño explícitos (ancho máximo de 176px por tag incluyendo el divisor; ancho mínimo de 320px para el panel lateral del mapa).

### Cambios Realizados
Ver `docs/decisions.md` D-061. La causa real de las dos líneas resultó ser una condición de carrera: `updateAdaptiveTagsRow()` decidía el modo de layout con la fuente de repuesto (antes de que Lora terminara de cargar), y al cargar la fuente real (más ancha) el texto ya no cabía — de ahí que ambos síntomas (dos líneas + fuente incorrecta) aparecieran juntos en la misma captura. Fix: re-medir en `document.fonts.ready` en las tres instancias. El solape de navegación no tenía relación con D-060: la rejilla de 3 columnas del overlay SPA conservaba un `lg:h-[400px]` fijo, heredado de un esquema de posicionamiento anterior a D-055, que hacía que el bloque de navegación (con su propio `pt-[104px]` de D-055) midiera su holgura desde un borde artificial en vez del borde real de la columna de info cuando ésta era más alta. Fix: eliminado ese alto fijo, igualando la rejilla a `event/[id].astro` (que nunca lo tuvo). Añadidos `max-width:176px` en `.highlight-unit` y `min-width:320px` en `#map-side-panel`.

### Problemas Encontrados y Resueltos
- Ambos bugs reportados por el propietario resultaron tener causas estructurales bien definidas (no cosméticas): una condición de carrera con fuentes web, y una altura fija heredada de un esquema de layout ya sustituido por D-055 pero nunca limpiada del overlay.

### Tareas Pendientes
- Ninguna nueva. Verificación completa del panel del mapa (tiles, apertura real) sigue pendiente de un navegador real por la misma limitación de entorno ya señalada en la sesión anterior.

---

## [2026-07-22] — Sesión: Componente `AdaptiveTagsRow` reutilizado en detalle/mapa, Toggle a ancho completo al caer solo, sangrado a la derecha, panel del mapa tapa el slider

### Objetivo de la Sesión
Cuatro precisiones más del propietario sobre el toolbar de D-059: (1) el Toggle, al caer bajo las tags por falta de sitio, debe ocupar el ancho TOTAL del toolbar (mismo padding que el resto de la página) — el tope de 4 columnas era, sin querer, incondicional; (2) al menos 32px de separación vertical entre tags y Toggle al apilarse; (3) la fila de tags debe sangrar por el margen derecho de la pantalla cuando su contenido ya no puede encogerse más; (4) la misma estructura y componente deben reutilizarse en la fila de tags horizontal del detalle de evento (`event/[id].astro` + overlay SPA) y en el panel de eventos del mapa, que además debe subir hasta tapar por completo el slider de fecha de la home.

### Cambios Realizados
Ver `docs/decisions.md` D-060. Nuevo componente `src/components/AdaptiveTagsRow.astro` que centraliza la estructura de D-059 para cualquier número de tags; CSS de ambos modos movido a `global.css` con selectores `.adaptive-tags-row.highlights-*` (no ligados al id de cada instancia). El tope de ancho del Toggle pasa a ser condicional (`.toggle-shares-line`, activada por JS solo mientras comparte línea con las tags). Migradas las tres instancias: panel del mapa (`#side-panel-tags-container`), `event/[id].astro` (`#detail-tags-fixed`, vía el propio componente Astro) y el overlay SPA (`#overlay-tags-sidebar-mobile`, vía un nuevo `makeAdaptiveTagHtml()` que sustituye al `makeTagHtml()` anterior, cuya maquetación no coincidía con el componente real). `syncSheetTop()` ahora mide el borde superior del slider de tiempo (antes el inferior), así el bottom sheet del mapa sube hasta taparlo del todo. Eliminado el CSS `.event-tags-row`, ya sin consumidores.

### Problemas Encontrados y Resueltos
- El sangrado a la derecha (`width: calc(100% + 24px)`) no se aplicaba en el navegador — `getComputedStyle().width` seguía devolviendo el ancho del contenedor. Causa: la fila es en sí misma un ítem flex de su propio padre, y sin `flex-shrink:0` el algoritmo flex del padre recorta el `width` (que sin ese ajuste solo actúa como sugerencia de `flex-basis`) de vuelta al hueco disponible. Corregido añadiendo `flex-shrink:0` a `.highlights-flex-content`.
- Un `max-w-full` heredado de una versión anterior del componente (y copiado a mano en el wrapper estático del overlay en `index.astro`) capaba el `width: calc(100% + Npx)` de vuelta al 100% — eliminado de ambos sitios.
- El mapa no llegó a renderizar tiles en el navegador del entorno sandbox de verificación (limitación del entorno, no del código) — la comprobación real de apertura del panel y tapado del slider queda pendiente de confirmación manual del propietario en un navegador normal.

### Tareas Pendientes
- Confirmación visual del propietario del flujo completo del panel del mapa (apertura + tapado del slider), no verificable en el navegador del entorno de esta sesión.

---

## [2026-07-22] — Sesión: Rediseño del toolbar de la home — Toggle con tope de 4 columnas, ancho igual por defecto con caída a contenido

### Objetivo de la Sesión
Cuatro precisiones del propietario sobre el toolbar (Highlights + Toggle), con capturas de referencia y el nodo Figma 341:26425: el Toggle debe topar en 4 columnas (mínimo 320px) al compartir fila con las tags; el divisor pasa a vivir dentro de cada módulo de highlight, siempre a 24px del texto; las 4 tags usan ancho IGUAL por defecto (no por contenido) con 32px entre módulos; ese ancho igual solo cede a ancho-por-contenido+scroll cuando una columna se quedaría más estrecha que su propio contenido; y el divisor de "Eventos" no debe desaparecer nunca (revirtiendo D-058, hecho apenas un rato antes en esta misma sesión).

### Cambios Realizados
Ver `docs/decisions.md` D-059. Cada tag pasa a ser una "highlight-unit" con su propio divisor integrado (gap-6/24px interno). Nueva función `updateHighlightsLayout()` (ejecutada en `astro:page-load` y resize) que mide el ancho natural real de cada unidad y decide entre modo `grid-equal` (rejilla de 4 columnas exactamente iguales, 32px de gutter) y modo `flex-content` (cada unidad a su ancho real, con scroll) — sin depender de ningún breakpoint fijo. El Toggle gana un `max-w` con la misma fórmula de "4 de 12 columnas" que ya usa el panel del mapa (D-026). El `hidden lg:block` de D-058 se elimina del divisor de "Eventos".

### Problemas Encontrados y Resueltos
- Bug real detectado por medición (`scrollWidth − clientWidth`): la regla `.filter-tag { width:100% }` del modo `grid-equal` no descontaba el espacio que el propio divisor+gap de la unidad ya ocupaba, desbordando la celda en exactamente esos 25px. Corregido con `flex:1 1 auto` en vez de `width:100%`.
- Un fallo de HMR de Vite (no recargaba `global.css` correctamente) dejó el navegador ejecutando JS desactualizado durante parte de la verificación, produciendo resultados que no coincidían con un cálculo manual de control — resuelto forzando recarga dura antes de seguir depurando, evitando perseguir un bug que en realidad no existía en el código fuente.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-22] — Sesión: El separador antes de "Eventos" vuelve en escritorio (columna 1 de la rejilla), sigue oculto en móvil

### Objetivo de la Sesión
El propietario aportó una captura con una rejilla de 12 columnas superpuesta sobre el toolbar de la home en escritorio: el Toggle mide 4 columnas y los separadores caen al comienzo de las columnas 1, 3, 5 y 7 — incluyendo un separador antes de "Eventos" que D-048 había quitado por considerarlo un elemento fantasma. Antes de tocar código se confirmó explícitamente si debía restaurarse.

### Cambios Realizados
Ver `docs/decisions.md` D-058. El separador antes de "Eventos" reaparece, pero solo desde `lg` (escritorio) — en móvil sigue oculto, tal y como el propietario ya había pedido explícitamente en la ronda anterior para esa misma captura de referencia (imagen 3, móvil).

### Problemas Encontrados y Resueltos
- Ninguno; cambio puntual, verificado por medición directa a 375px (`display:none`) y 1440px (`display:block`, alineado al margen de página) antes de darlo por cerrado.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-22] — Sesión: Ancho mínimo de celda 136px en Lista y breakpoint móvil a 440px (D-057)

### Objetivo de la Sesión
Fijar el ancho mínimo de cada celda de la tabla de la vista Lista a 136px con scroll horizontal, y conmutar a la vista de tarjetas compactas de móvil cuando el ancho de pantalla descienda de 440px.

### Cambios Realizados
1. **Vista de Lista (`src/pages/index.astro`)**:
   - Asignada la clase `min-w-[136px]` a todas las celdas de encabezado `<th>`, celdas de datos `<td>` y etiquetas `<col>` de la tabla.
   - Establecido `min-w-[816px]` en el elemento `<table>` manteniendo `overflow-x-auto` en `#list-table-wrapper` para permitir desplazamiento horizontal limpio.
   - Modificado el punto de conmutación móvil/tabla de `768px` (`md`) a **`440px`** (`min-[440px]:block` / `min-[440px]:hidden`).
2. **Documentación**: Registrada decisión `D-057` en `docs/decisions.md`.

---

## [2026-07-22] — Sesión: Reestructuración flex de la navegación en el detalle de evento (D-055)

### Objetivo de la Sesión
Garantizar la simetría óptica idéntica entre el botón de cerrar 'X' (arriba) y la navegación (abajo) respecto a los bordes de la pantalla, y asegurar que la navegación jamás se deslice por encima de la caja de la foto en pantallas cortas ("bajitas").

### Cambios Realizados
1. **Modelado Flexbox en `src/pages/index.astro` y `src/pages/event/[id].astro`**:
   - Asignada altura mínima `lg:min-h-[calc(100vh-var(--mel-header-pt-desktop)*2)]` con distribución `flex flex-col justify-between`.
   - Eliminado `sticky bottom` en escritorio y aplicado `lg:mt-auto` + `lg:pt-[104px]`.
   - Con esto, la distancia del botón 'X' al borde superior y de la navegación al borde inferior es exactamente 100% idéntica (`var(--mel-header-pt-desktop)`).
   - En pantallas cortas ("bajitas"), la navegación se mantiene en flujo normal a mínimo 104px por debajo de la foto del flyer, expandiendo la página verticalmente con scroll sin solaparse nunca con la imagen.
2. **Documentación**: Actualizada decisión `D-055` en `docs/decisions.md`.

---

## [2026-07-22] — Sesión: Corrección y transición emergente de la descripción en el detalle de evento (D-056)

### Objetivo de la Sesión
Solucionar el problema en el que la descripción de un evento emergía desde la parte superior de la pantalla cruzando otros elementos al navegar desde un evento sin descripción, implementando una entrada emergente desde detrás de la imagen con opacidad 0.

### Cambios Realizados
1. **Lógica de transición en `switchDetailsOverlayEventSPA` (`src/pages/index.astro`)**:
   - Detectado cuando un evento anterior carecía de descripción (`wasDescHidden`) y el nuevo evento sí tiene descripción (`isDescVisible`).
   - Evitado el cálculo FLIP erróneo `translateY(0 - newRect.top)` que provocaba el cruce vertical desde la pantalla superior.
   - En **escritorio (`lg+`)**: La descripción entra desde la izquierda (`translateX(-50px)`) emergiendo progresivamente desde detrás del bloque de la foto con `opacity: 0 -> 1`.
   - En **móvil (`<lg`)**: La descripción entra desde arriba (`translateY(-24px)`) emergiendo por debajo del bloque de la foto con `opacity: 0 -> 1`.
2. **Documentación**: Registrada decisión `D-056` en `docs/decisions.md`.

---

## [2026-07-22] — Sesión: Ajuste de separación (120px) y cota inferior (104px) del bloque de navegación en detalle (D-055)

### Objetivo de la Sesión
Separar la barra de navegación entre eventos (`#overlay-nav-block` y `#detail-nav-block`) al menos 120px del contenido superior y fijar su límite inferior pegajoso a 104px del borde de la pantalla.

### Cambios Realizados
1. **Páginas `src/pages/index.astro` y `src/pages/event/[id].astro`**:
   - Ajustada la separación superior a `lg:mt-[120px]`.
   - Fijada la distancia al límite inferior de la pantalla a `lg:bottom-[104px]` y padding inferior del contenedor a `lg:pb-[104px]`.
2. **Documentación**: Registrada decisión `D-055` en `docs/decisions.md`.

---

## [2026-07-22] — Sesión: Espaciado superior dinámico de cabecera y simetría inferior en detalle de evento (D-054)

### Objetivo de la Sesión
Optimizar el aprovechamiento del espacio vertical en pantallas de portátil (como MacBook Pro de 15") haciendo variable el margen superior de cabecera mediante `clamp()`, y alineando de forma simétrica el bloque de navegación inferior del detalle de evento.

### Cambios Realizados
1. **Token `--mel-header-pt-desktop` en `src/styles/global.css`**:
   - Creado `--mel-header-pt-desktop: clamp(32px, 5vh, 88px);` para escalar suavemente la distancia superior de cabecera en escritorio en función de la altura del viewport.
2. **Aplicación Unificada en Páginas**:
   - Actualizados los paddings superiores de escritorio en `index.astro`, `event/[id].astro`, `exposiciones.astro`, `info.astro` y `SideMenu.astro`.
3. **Detalle de Evento (`event/[id].astro` y Overlay SPA en `index.astro`)**:
   - Eliminado el margen superior estático `lg:mt-[280px]` sustituyéndolo por `lg:mt-12`.
   - Fijado el offset inferior del bloque de navegación ("Anterior" / "Siguiente") a `lg:bottom-[var(--mel-header-pt-desktop)]` y padding inferior `lg:pb-[var(--mel-header-pt-desktop)]`, garantizando que la distancia al borde inferior sea idéntica a la distancia de la cabecera al borde superior.
4. **Documentación**: Registrada decisión `D-054` en `docs/decisions.md`.

---

## [2026-07-22] — Sesión: Ocultación de la pastilla de datos en la Galería móvil (D-053)

### Objetivo de la Sesión
Eliminar la visibilidad permanente de la pastilla de datos (`.flyer-label` con título y fecha) sobre las imágenes de la Galería en dispositivos móviles y pantallas táctiles, conservándola únicamente al hacer hover en escritorio.

### Cambios Realizados
1. **Eliminación de la visibilidad forzada en `src/styles/global.css` y `src/layouts/Layout.astro`**:
   - Se eliminan las reglas `@media (hover: none)` y `html.is-touch .flyer-label` que forzaban `opacity: 1` en pantallas táctiles/móviles.
   - Se elimina la función auxiliar `applyTouchFlag` de `Layout.astro`.
2. **Resultado**:
   - En pantallas móviles/pequeñas, las tarjetas de la Galería se muestran limpias sin texto sobrepuesto, favoreciendo la estética pura del arte visual y promoviendo el clic/interacción del usuario.
   - En pantallas de escritorio, el comportamiento de hover se mantiene intacto (`opacity-0` por defecto, `group-hover:opacity-100` al pasar el ratón).
3. **Documentación**: Registrada decisión `D-053` en `docs/decisions.md`.

---

## [2026-07-22] — Sesión: Ajuste de estados en Marcadores de Mapa y Botón "Me presta" (D-052)

### Objetivo de la Sesión
Ajustar los colores de reposo e interacción de los marcadores del mapa y del botón "Me presta" para que solo cambien a `Action-Primary` en hover, pressed o estado activo seleccionado del mapa.

### Cambios Realizados
1. **Marcadores del Mapa (`MapMarker.astro` e `index.astro`)**:
   - Ajustados en reposo a `Action-Secondary` (`--mel-action-secondary`) y texto `--mel-text-on-action`.
   - Únicamente pasan a `Action-Primary` (`--mel-action-primary`) con texto `LE-50` (`--mel-text-on-action-primary`) en estados hover, pressed o marcador activo (`.mel-marker-wrapper.active`).
2. **Botón "Me presta" (`LikeButton.astro` y réplica en `index.astro`)**:
   - Confirmado que cuando está en estado activo (`data-active="true"`), en reposo se mantiene en `Action-Secondary`, y solo cambia a `Action-Primary` al hacer hover o pressed.
3. **Documentación**: Registrada decisión `D-052` en `docs/decisions.md`.

---

## [2026-07-22] — Sesión: Unificación de Overlay de `EmptyState` en `#content-views` (D-051)

### Objetivo de la Sesión
Garantizar una posición vertical 100% estática e inmóvil para el estado vacío (`EmptyState`) al cambiar entre los botones de Galería, Mapa y Lista en el selector toggle.

### Cambios Realizados
1. **Unificación de Overlay en `src/pages/index.astro`**:
   - Creado `#views-empty-state` directamente sobre la raíz global de vistas `#content-views` con `absolute top-[24px] right-0 bottom-0 left-0 bg-mel-bg-primary z-[30] items-center justify-center py-12`.
2. **Lógica de renderizado en `performDOMUpdates()` y `switchView()`**:
   - Cuando `filtered.length === 0`, el overlay único `#views-empty-state` se activa, centrando la tarjeta con márgenes superior e inferior idénticos.
   - Las vistas de Galería, Mapa y Lista se ocultan/muestran detrás y los botones del toggle conmutan sin provocar ningún desplazamiento ni micro-salto vertical en la tarjeta.
3. **Documentación**: Actualizada decisión `D-051` en `docs/decisions.md`.

---

## [2026-07-22] — Sesión: Actualización del componente `EmptyState` variante "No results" (D-050)

### Objetivo de la Sesión
Actualizar el estado de "Sin resultados" (tanto en la vista Galería como en Lista) para mostrar la nueva descripción *"Elimina los filtros o prueba a buscar otra cosa."* y el botón de acción *"Quitar filtros"*.

### Cambios Realizados
1. **Componente `EmptyState.astro`**:
   - Actualizada la descripción por defecto para `no-results` a `"Elimina los filtros o prueba a buscar otra cosa."`.
   - Habilitado por defecto el botón (`showButton = true`) con etiqueta `"Quitar filtros"`.
2. **Réplicas Dinámicas en JS y Delegación de Clics (`src/pages/index.astro`)**:
   - Actualizados los 3 bloques de HTML dinámico (Galería grid, Lista escritorio y Lista móvil).
   - Añadida la comprobación en el manejador delegado global de clics para la clase `.empty-state-clear-btn`, emitiendo `mel-set-search` con query vacía para restaurar la visualización de resultados de forma limpia e instantánea.
3. **Documentación**: Registrada decisión `D-050` en `docs/decisions.md`.

---

## [2026-07-21] — Sesión: Unificación del color de contraste de texto e iconos sobre Action-Primary (`LE-50`)

### Objetivo de la Sesión
Garantizar que todo texto o icono situado sobre elementos de color `Action-Primary` (o en estados hover/active que cambien a `Action-Primary`) utilice siempre el primitivo casi blanco `LE-50`, sin alternar en modo oscuro, favoreciendo el contraste y la accesibilidad WCAG.

### Cambios Realizados
1. **Nueva Token Semántica `--mel-text-on-action-primary` (D-049)**: Definida en `src/styles/global.css` tanto en `:root` como en `.dark` apuntando a `var(--mel-primitive-le-50)`. Expuesta a Tailwind v4 como `text-mel-text-on-action-primary` y `hover:text-mel-text-on-action-primary`.
2. **Actualización de Componentes**:
   - `SideMenu.astro`: Badge *"Nuevo"* y botón de cambio de modo de color en hover.
   - `LikeButton.astro` y réplica en `index.astro`: Texto e icono del botón *"Me presta"* en hover activo.
   - `MapMarker.astro` y marcadores del mapa en `index.astro`: Texto de los marcadores en estados hover y activo (`.mel-marker-wrapper.active`, `.mel-marker-wrapper:hover`, `.mel-popup-btn:hover`).
   - `IconButton.astro`: Variante `primary` en hover.
   - `EmptyState.astro`, `EventCard.astro`, `EventInfoBox.astro` y `event/[id].astro`: Botones con hover sobre `Action-Primary`.
3. **Documentación**: Registrada decisión `D-049` en `docs/decisions.md` y actualizada la tabla de tokens en `docs/design-system.md`.

---

## [2026-07-21] — Sesión: El toolbar de la home (Highlights + Toggle) pasa a `flex-wrap` real con capturas de Figma como referencia

### Objetivo de la Sesión
El propietario se dio cuenta de que la confusión de las últimas rondas era en realidad sobre el toolbar de la HOME (Highlights + selector Galería/Mapa/Lista), no sobre el detalle de evento — aportó tres capturas de Figma mostrando el comportamiento exacto: escritorio con tags y Toggle en la misma fila, ancho intermedio con el Toggle saltando a su propia fila (no puede medir menos de 320px), y móvil con el slider a sangre y tags sin divisor inicial. Las tres especifican 24px entre divisores y tags.

### Cambios Realizados
Ver `docs/decisions.md` D-048. El contenedor del toolbar pasa de `grid grid-cols-1 lg:grid-cols-12` (salto brusco exactamente en 1024px) a `flex flex-wrap` real: las tags nunca se comprimen (`shrink-0`, ancho natural de contenido) y el Toggle crece (`grow`) para ocupar lo que sobre, saltando de línea de forma orgánica en cuanto su suelo de 320px deja de caber junto al ancho actual de las tags — sin depender de ningún breakpoint fijo.

### Problemas Encontrados y Resueltos
- El truco de sangrado por margen negativo de la fila de tags (`-mx-6 w-[calc(100%+48px)]`, D-041) rompía el cálculo del `flex-wrap`: con un ancho explícito de "100%+48px", el "100%" se resolvía contra el contenedor flex completo, no contra lo que la fila necesitaba — la fila se expandía a casi todo el ancho del toolbar y forzaba al Toggle a saltar de línea incluso en escritorio ancho. Corregido sustituyendo por `max-w-full` sin margen negativo. Coste asumido y documentado: el scroll de la fila en móvil muy estrecho ya no sangra hasta el borde físico de la pantalla (se recorta contra el padding de página) — incompatible con compartir línea con un hermano flex.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: D-046 revertido tras probarlo en Figma; se conservan los divisores de Highlights y el Toggle

### Objetivo de la Sesión
El propietario probó en Figma la idea del reparto regular de la fila de tags fija (D-046) y decidió que no era lo que quería, pidiendo revertirlo — conservando eso sí los divisores de Highlights y el ancho mínimo del Toggle (D-045), sin relación con D-046.

### Cambios Realizados
Ver `docs/decisions.md` D-047. Revertidos a mano (no con `git checkout`, para no perder D-045 en los mismos ficheros) los tres cambios de D-046: `gap-8 justify-between` → `gap-6` en la fila fija de tags de ambos ficheros; eliminados los divisores `<div>` intercalados (vuelta a `tagsHtml` compartida sin distinción móvil/escritorio en el overlay); restaurada en `global.css` la regla `border-left`/`padding-left` que D-046 había retirado.

### Problemas Encontrados y Resueltos
- Ninguno; revert limpio, verificado que la fila de tags vuelve exactamente al comportamiento de D-042/D-043 y que Highlights/Toggle quedan intactos.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: La fila de tags fija del detalle se reparte "como en escritorio" en tablet, sin salir del mecanismo fijo

### Objetivo de la Sesión
Tras el revert de D-044, el propietario aclaró con una captura anotada qué quería realmente: mantener el mecanismo V2 (cabecera y tags fijas, contenido pasando por debajo) también en tablet, cambiando solo cómo se ve la fila de tags — repartida a lo ancho completo "como en desktop" en vez de tira con scroll, sin adoptar la columna vertical. Confirmado explícitamente antes de tocar código que era exactamente el patrón `justify-between` ya usado en Highlights, sin necesitar ningún breakpoint nuevo.

### Cambios Realizados
Ver `docs/decisions.md` D-046. `gap-6` → `gap-8 justify-between` en la fila fija de tags (`#detail-tags-fixed`/`#overlay-tags-fixed`, NO la columna de escritorio). Al reutilizar `.event-tags-row`, cuyo divisor se inyectaba vía CSS baked-in en cada tag, se eliminó esa inyección (regla `border-left`/`padding-left` de `global.css`) y se sustituyó por divisores `<div>` reales intercalados en el marcado — mismo patrón de D-045, aplicado ahora aquí también.

### Problemas Encontrados y Resueltos
- Detectado antes de implementar (no en producción): reutilizar `gap-8 justify-between` con el divisor CSS-baked-in de esta fila habría reproducido exactamente el bug de asimetría que D-045 corrigió en Highlights. Se solucionó en el mismo cambio, no como fix posterior.

### Tareas Pendientes
- Ninguna nueva. La petición real tras D-044 queda resuelta.

---

## [2026-07-21] — Sesión: Intento de "escritorio desde 800px" revertido por malentendido, divisores de Highlights corregidos de raíz, Toggle a 320px

### Objetivo de la Sesión
Implementar la excepción de 800px pendiente desde D-042/D-043; corregir la asimetría de espaciado en los divisores de Highlights; dar un ancho mínimo de 320px al `ToggleSelector`.

### Cambios Realizados
Ver `docs/decisions.md` D-044 (revertido) y D-045 (vigente). Se implementó por completo un breakpoint propio `--breakpoint-detail:800px` que adelantaba TODO el tratamiento de escritorio (cabecera estática, foto sin encoger, grid de 3 columnas) desde 800px en vez de 1024px. Al ver el resultado, el propietario aclaró que el malentendido era de alcance: quería mantener el mecanismo tipo V2/móvil (cabecera y tags fijas, contenido pasando por debajo) también en tablet, cambiando solo la presentación visual de la fila de tags — no todo el layout. Revertido con `git checkout` a `event/[id].astro`, `index.astro` y `global.css` al estado del commit `7734823`. D-045 (divisores de Highlights como elementos independientes + `hideBorder`, `gap-8 justify-between`; `min-w-[320px]` en `ToggleSelector`) se rehizo a mano tras el revert al vivir en los mismos ficheros. Reaplicado también el bugfix real encontrado por el camino (umbral del lightbox de la standalone, atascado en 1024 desde D-039 en vez de 480).

### Problemas Encontrados y Resueltos
- El malentendido de alcance se detectó tarde (tras implementar y enseñar capturas) por preguntar solo con palabras ("¿escritorio completo o solo tags?") sin una referencia visual — el propietario aportó después una captura con un rectángulo rojo marcando exactamente qué debía cambiar. Lección para la próxima vez que un cambio de layout sea ambiguo: pedir o generar una referencia visual antes de construir, no fiarlo todo a la descripción en texto.
- El bug del umbral del lightbox (1024 en vez de 480 en la standalone desde D-039) se encontró de casualidad al migrar los `window.innerWidth` del breakpoint revertido — confirmado con `git log -S` que nunca existió correctamente en ese fichero.

### Tareas Pendientes
- La petición real (tags con aspecto "de escritorio" dentro del mecanismo fijo en anchos tipo tablet) sigue pendiente — a la espera de acordar el breakpoint exacto y el alcance visual con una referencia clara antes de implementar.

---

## [2026-07-21] — Sesión: La V2 se hace definitiva (mirroreada a la standalone) y separadores a mínimo 32px en todo el sitio

### Objetivo de la Sesión
El propietario validó la V2 del overlay (tags fijas bajo el título) y pidió: incluirla definitivamente en el sitio (aplicarla también a la página standalone `/event/[id]`, no solo al overlay), quitar el separador antes del primer tag ("Eventos") en Highlights, y subir la distancia separador↔módulo de 24 a 32px mínimo en todas las instancias del sitio — repartiendo los tags a lo ancho completo con espaciado regular cuando quepan, en vez de agruparlos a la izquierda.

### Cambios Realizados
Ver `docs/decisions.md` D-043. V2 mirroreada a `event/[id].astro` (mismo patrón `#detail-tags-fixed` + spacer + `updateTagsFixed()`, sin necesitar la auto-corrección del overlay al no tener este el wrapper con `transition:transform`); columna de tags de escritorio pasa a `hidden lg:block`, con los 5 `TagWithLink` declarados dos veces (móvil fijo + escritorio) al ser página SSR estática. `TagWithLink.astro`: `px-6`→`px-8` en el modo con borde (único consumidor: Highlights). Highlights gana `[&>*:first-child]:border-l-0/pl-0` (quita el separador fantasma) y `justify-between` (reparto regular cuando cabe). Panel del mapa: `gap-[24px]`→`gap-8`.

### Problemas Encontrados y Resueltos
- Ninguno nuevo; verificación exhaustiva por medición directa en las cuatro instancias tocadas (standalone, overlay como control de regresión, Highlights en desborde y en reparto regular, panel del mapa) antes de dar la sesión por cerrada.

### Tareas Pendientes
- La excepción de 800px (tags a la izquierda por encima de ese ancho) sigue pendiente de confirmación explícita del propietario.
- Nuevo tag git `detalle-evento-2.0` sustituye a `detalle-evento-1.0` como referencia de versión estable vigente.

---

## [2026-07-21] — Sesión: Divisor de tags sin sangrado, reset de imagen al navegar, y prueba V2 del overlay (tags fijas bajo el título)

### Objetivo de la Sesión
Tres peticiones tras D-041: el divisor inferior de la fila de tags del detalle sangraba a los bordes reales de pantalla cuando debía respetar el margen de página como el resto de divisores; la caja de imagen debía resetearse a tamaño máximo al navegar Anterior/Siguiente; y una prueba V2 — solo en el overlay — con las tags movidas arriba, fijas bajo el título, sin divisor, manteniendo el hueco de 32px a la imagen (referencia: captura del propietario). Explícitamente NO se pedía que las tags volvieran a la columna vertical de escritorio en ningún ancho — layout mobile-only. Una idea adicional (excepción a partir de 800px) quedó marcada "sin pruebas" y no se implementó esta sesión.

### Cambios Realizados
Ver `docs/decisions.md` D-042. `event-tags-row` se divide en un contenedor exterior (borde + padding a ancho normal) e interior (fila scrolleable a sangre) en ambos ficheros. `transitionToOverlayEvent()` resetea `scrollTop = 0` antes del snapshot del FLIP. Nuevo `#overlay-tags-fixed` (solo `index.astro`) hermano del header, con su propio spacer, posicionado con el mismo patrón ya usado para el header; la instancia de escritorio (`#overlay-tags-sidebar`) pasa a `hidden lg:block`; contenido duplicado en ambas instancias desde `renderOverlayEvent()`.

### Problemas Encontrados y Resueltos
- Bug preexistente encontrado por el camino (no introducido esta sesión, solo nunca antes probado en esta combinación exacta): en una carga directa por `?detail=MEL-XXXX` en móvil, la primera pasada de posicionamiento podía leer el layout aún no asentado, dejando header/tags/imagen en 0px hasta el siguiente scroll o resize real. Corregido reutilizando el doble `requestAnimationFrame` que ya existía para la animación de entrada del overlay, para repetir el posicionamiento una vez el layout está garantizado como asentado.
- Aislado con precisión la causa combinando pruebas de click (funcionaba) vs. deep-link directo (fallaba) antes de tocar código — confirmó que no era un problema general de las nuevas tags, sino algo que también afectaba a la imagen desde antes.

### Tareas Pendientes
- La excepción de 800px (tags a la izquierda como en escritorio por encima de ese ancho) queda pendiente de confirmación explícita del propietario, sin implementar.
- La V2 vive únicamente en el overlay; la página standalone (`event/[id].astro`) permanece en la versión estable D-032/D-036 sin cambios de layout.

---

## [2026-07-21] — Sesión: Dots a 24px simétricos y estandarización de todos los "TagWithLink" del sitio

### Objetivo de la Sesión
Dos correcciones del propietario: la paginación necesitaba al menos 24px arriba y abajo (no 16/0 como en D-040 — confirma que el espacio bajo el botón sí era necesario); y una auditoría completa de todos los bloques con la forma de `TagWithLink` en el sitio (componente, réplica JS del overlay, Highlights de la home, panel del mapa), que debían tener las mismas propiedades: sin espacio fantasma a la derecha, siempre 48px de alto (tags y divisores), y corte a sangre contra el borde real de pantalla cuando hay scroll horizontal.

### Cambios Realizados
Ver `docs/decisions.md` D-041. Dots a `py-6` uniforme. Causa raíz del espacio fantasma: el chevron de hover de `Link.astro` vivía en flujo (reservaba ~16px aunque invisible) — pasa a `position: absolute`, sin reservar espacio. Causa raíz de la altura inconsistente: `TagWithLink.astro` tenía `py-2` en el modo con borde (56px) pero no en el modo `hideBorder` (48px) — unificado a 48px siempre, sin padding vertical en ningún modo. Las cuatro filas con scroll horizontal (tags del detalle ×2, Highlights, panel del mapa) ganan el patrón de márgenes negativos ya usado en el resto del sitio para sangrar contra el borde real.

### Problemas Encontrados y Resueltos
- El caso "Organiza" (caja más ancha que su valor "FIV") no es un bug — es la caja midiendo `max(etiqueta, valor)` de forma consistente; confirmado midiendo ambos anchos por separado antes de descartarlo como hallazgo.
- El panel del mapa no se pudo verificar abriéndolo por interacción real (el sandbox no renderiza los tiles de Google Maps, limitación ya conocida) — verificado en su lugar sobre el marcado SSR, que ya contiene los `TagWithLink` reales con `count="0"` independientemente de si el panel está abierto.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: Grid fluido de 12 columnas en escritorio, nav siempre visible, y ajustes de dots/nav en móvil

### Objetivo de la Sesión
Cuatro ajustes del propietario sobre el detalle de evento: mover 16px del padding superior de la paginación al inferior, +8px entre Me presta y la navegación (móvil); y en escritorio, hacer el contenido adaptable (el grid fijo de 184/496/496px generaba scroll horizontal entre 1024 y ~1320px) y que la navegación Anterior/Siguiente quede siempre visible por encima del límite inferior de la pantalla.

### Cambios Realizados
Ver `docs/decisions.md` D-040: dots a `pt-4 pb-4`, nav a `mt-10`, grids convertidos al sistema de 12 columnas (`lg:grid-cols-12` + spans 2/5/5, que a 1224px reproducen exactamente los valores de Figma), y nav con `lg:sticky lg:bottom-[40px]` + fondo opaco y `py-6`.

### Problemas Encontrados y Resueltos
- El `lg:pt-0` heredado del nav anulaba el `padding-top` del nuevo `lg:py-6` (orden de utilidades de Tailwind: `pt-*` gana a `py-*` a igual variante) — eliminado.
- Las capturas de escritorio salían "lavadas": verificado que es artefacto del captor del sandbox (opacidad computada 1, sin ancestros translúcidos), no un defecto real.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: Foto sin recorte en origen, lightbox desde 480px y ritmo vertical de 32px

### Objetivo de la Sesión
Corrección del propietario sobre la sesión anterior (captura anotada): la foto debe adaptarse entera a la caja de 360px (sin recorte en reposo — "la imagen es protagonista absoluta"), el lightbox debe funcionar como en desktop desde 480px de ancho, y los espaciados verticales de la ficha móvil eran irregulares (24/56/24/32/24/40/40/48/24px medidos).

### Cambios Realizados
Ver `docs/decisions.md` D-039. Botón de la foto a `h-[360px] lg:h-[400px]` (flyer completo `object-contain`, el recorte centrado solo aparece al comprimir con scroll); umbral del click-lightbox de 1024→480px; y ritmo único de 32px entre todos los bloques (dots, tags, descripción, divisores, artistas, Me presta, nav) vía `gap-8`/`pb-8`/`pt-8`/`mt-8` por debajo de `lg`, con los valores de escritorio intactos en variantes `lg:`.

### Problemas Encontrados y Resueltos
- Ninguno nuevo; verificación por medición directa de los nueve huecos consecutivos (todos a 32px exactos en ambos ficheros) y capturas.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: Caja de imagen a 360px, tap para re-expandir y navegación anclada abajo

### Objetivo de la Sesión
Tres peticiones del propietario para el detalle móvil: bajar 40px la altura máxima de la caja de imagen, que el tap sobre la foto re-expanda la caja comprimida en vez de abrir el lightbox, y que el bloque Anterior/Siguiente quede siempre pegado al borde inferior (limitando el scroll) con ~40px de resguardo frente a la UI del teléfono.

### Cambios Realizados
Ver `docs/decisions.md` D-038. Máximo del recorte 400→360px (foto sigue a 400px centrada); tap en móvil = animación de scroll a 0 (bucle temporizado propio, ni `scrollTo` smooth ni rAF — ambos poco fiables, ver D-038); runway movido ANTES del nav y redimensionado para que el nav quede exactamente a 40px del borde inferior en todos los casos (con contenido corto empuja el nav hasta ahí y anula el scroll).

### Problemas Encontrados y Resueltos
- `scrollTo({behavior:'smooth'})` se ignora silenciosamente en el contenedor con overflow del overlay, y `requestAnimationFrame` no llega a ejecutarse en el sandbox de verificación (0 ticks medidos) — la animación pasó a frames por `setTimeout(16)` con easing basado en tiempo real.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: La foto se recorta centrada mientras encoge

### Objetivo de la Sesión
Petición del propietario sobre D-036: la imagen debe permanecer centrada en su caja contenedora mientras se hace pequeña al hacer scroll, no pegada al borde superior.

### Cambios Realizados
Ver `docs/decisions.md` D-037. La ventana de recorte pasa a `flex flex-col justify-center` y el botón de la foto gana `shrink-0` (sin él, el flex de columna reescalaría la altura del botón en vez de dejarlo desbordar y recortarse). Aplicado en espejo en `index.astro` y `event/[id].astro`; verificado con desbordamiento simétrico exacto en ambos y no-op en escritorio.

Además, a petición del propietario, la cabecera fija (`#overlay-sticky-header` / `#detail-sticky-header`) gana un padding superior igual al inferior (`pt-8`, 32px, solo por debajo de `lg`) — el spacer sincronizado absorbe la nueva altura (152px) automáticamente, sin cambios de código JS.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: La caja de imagen queda clavada bajo la cabecera y pierde el padding inferior redundante

### Objetivo de la Sesión
El propietario reportó que la caja de la imagen parecía hacer scroll por detrás de la cabecera (debería solo encogerse, hasta 200px mínimo sin contar paginación) y que `#overlay-image-sticky` seguía teniendo un margin/padding inferior que pidió eliminar.

### Cambios Realizados
Ver `docs/decisions.md` D-036. En resumen, en ambos ficheros: (1) la caja pasa a anclarse incondicionalmente al borde inferior de la cabecera — se elimina la fórmula de liberación de D-032, que la deslizaba hacia arriba desde el primer píxel de scroll; (2) el centinela pasa a ser CONSTANTE (huella a tamaño completo), con lo que el contenido emerge a 32px bajo la caja durante el encogimiento y después pasa por debajo de ella, y el bucle de retroalimentación de D-033 desaparece estructuralmente; (3) eliminado el `pb-8` de la caja — era redundante con el `gap-8` del grid (64px de hueco visual en vez de 32).

### Problemas Encontrados y Resueltos
- Al reordenar, apareció un bug de "no se puede hacer scroll": medir el rect de la caja recién fijada antes de dar altura al centinela dejaba el overlay momentáneamente más corto que el viewport y el navegador recolocaba `scrollTop` a 0 en mitad del tick. Resuelto fijando el centinela ANTES de conmutar a `fixed`.
- `ensureOverlayScrollRunway()` medía `document.documentElement.scrollHeight` (la home de detrás) en vez del propio overlay con scroll. Corregido.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: Los puntos de paginación del overlay dejan hueco de más cuando no hay paginación

### Objetivo de la Sesión
El propietario, con una captura de DevTools de "Teckel I" (evento de una sola imagen) inspeccionando `#overlay-carousel-dots`, pidió revisar si la paginación se mostraba sin necesidad y eliminar cualquier padding/margin inferior sobrante de la caja de imagen.

### Cambios Realizados
Ver `docs/decisions.md` D-035. En resumen: solo `index.astro` necesitaba el fix — `event/[id].astro` ya renderiza el bloque de dots como condicional del lado del servidor, así que para eventos de una sola imagen ese `<div>` ni siquiera existe en el DOM. El overlay, en cambio, reutiliza un único `#overlay-carousel-dots` estático entre eventos; su `py-6` (48px) reservaba altura aunque estuviera vacío. Añadida `dotsContainer.classList.toggle('hidden', imageUrls.length <= 1);` en `renderOverlayEvent()`, justo tras vaciar el contenedor.

### Problemas Encontrados y Resueltos
Ninguno nuevo más allá del propio bug reportado — diagnosticado directamente comparando la estructura de las dos implementaciones (nodo condicional vs. nodo reutilizado estático) antes de tocar código.

### Tareas Pendientes
Ver `docs/decisions.md` D-035. Verificado sin regresión en eventos con paginación (hueco de 32px se mantiene igual con o sin dots).

---

## [2026-07-21] — Sesión: La cabecera del detalle de evento pasa de `sticky` a `fixed` de verdad

### Objetivo de la Sesión
El propietario, con una captura de DevTools, señaló que la cabecera del detalle de evento (móvil/tablet) seguía moviéndose con el scroll y dejando un hueco por arriba durante los primeros ~90px de scroll — insistiendo en que debe estar fija "en ningún momento" con excepciones.

### Cambios Realizados
Ver `docs/decisions.md` D-034. En resumen, en ambos ficheros (`event/[id].astro` e `index.astro`):
1. La cabecera pasa de `position: sticky` a `position: fixed` incondicional por debajo de `lg` — fija desde el primer fotograma, sin ninguna ventana de "aún no se ha enganchado".
2. Nuevo spacer (`#detail-header-spacer`/`#overlay-header-spacer`) que reserva a mano el hueco que la cabecera dejó de ocupar en el flujo normal, sincronizado a su altura real en cada tick.
3. Detectado y corregido un hueco redundante: el `pt-[10vh]`-ish del contenedor de página (pensado para una cabecera en flujo normal) se sumaba por encima del spacer, empujando el contenido más abajo de lo debido — pasa a `pt-0 lg:pt-[10vh]` (0 por debajo de `lg`, sin cambios en escritorio).

### Problemas Encontrados y Resueltos
El hueco redundante del punto 3 se diagnosticó midiendo directamente `getBoundingClientRect()` de la cabecera y del centinela de la imagen en reposo — el hueco (79.8px) coincidía exactamente con el `pt-[10vh]` en el viewport de prueba, confirmando la causa antes de tocar nada.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: Corrección del detalle de evento móvil — recorte real de la foto y cuatro bugs del repaso del propietario

### Objetivo de la Sesión
El propietario probó la sesión anterior (cabecera fija + foto encogible, D-032) en un dispositivo real y reportó seis problemas con capturas: foto rota/duplicada al entrar, la foto se reescalaba en vez de recortarse, temblor y tapado prematuro del contenido al final del scroll, falta de sangre en los bordes laterales, dudas sobre si la cabecera era 100% estática, y demasiado hueco antes del bloque de navegación.

### Cambios Realizados
Ver `docs/decisions.md` D-033 para el detalle completo. En resumen, aplicado en paralelo en `event/[id].astro` y el overlay de `index.astro`:
1. **Recorte, no reescalado**: nueva "ventana de recorte" (`#detail-image-crop`/`#overlay-image-crop`, `overflow-hidden`, es lo que ahora encoge 400→200px) separada de la foto real (`#carousel-main-container`, siempre fija a 400px, nunca tocada por JS) — al ser su único hijo en flujo normal, queda pegada arriba por construcción; encoger la ventana revela menos foto desde abajo, a tamaño y ratio reales.
2. **Imagen rota al entrar**: por debajo del punto de enganche, el elemento se queda en `position: static` en vez de forzar `fixed` — evita depender de mediciones tomadas a mitad de la animación de entrada del overlay (0.55s), que daban una respuesta del fotograma actual, no la final.
3. **Temblor al final del scroll**: reinstaurada una "pista de scroll" (spacer dinámico) que garantiza siempre ≥260px de scroll disponibles después del punto de enganche, evitando el caso de inestabilidad marginal donde reducir la página reduce el scroll máximo por debajo de la posición actual, en un bucle sin fin.
4. **A sangre siempre**: recuperada la técnica de márgenes negativos para el estado en reposo (retirada sin sustituto en la sesión anterior), más un fix de sobre-restricción CSS (`left`+`right`+`width` simultáneos hacían que el navegador ignorase `right` silenciosamente).
5. **Bloque contenedor fantasma intermitente** (solo overlay): el quirk de D-032 (`#overlay-details-content` actuando de contenedor de elementos `fixed`) resultó ser temporal, no permanente — se asienta a los pocos segundos. Sustituida la compensación fija por un patrón "aplica una posición provisional, mide dónde aterrizó, corrige por la diferencia" que funciona sin necesidad de saber si el quirk sigue activo.
6. **~40px hasta abajo**: `pb-[108px]` heredado pasa a `pb-[40px] lg:pb-[108px]` en ambos ficheros.

### Problemas Encontrados y Resueltos
Los seis del objetivo de la sesión, cada uno diagnosticado con medición directa (no solo capturas, que en este entorno de pruebas producen falsos positivos de vez en cuando por temporización de renderizado) — ver D-033 para el diagnóstico técnico de cada uno.

### Tareas Pendientes
- Ninguna nueva. Sigue pendiente el icono de lupa sobre la foto (ver D-032/D-033), no pedido en ninguna de las dos sesiones.

---

## [2026-07-21] — Sesión: Detalle de evento móvil — cabecera fija y foto que encoge al scroll (retomando D-027)

### Objetivo de la Sesión
Retomar la pieza pendiente desde D-026/D-027 (detalle de evento con imagen colapsable al scroll), esta vez explícitamente **sin bottom sheet**: cabecera (X + título) fija sin scroll; foto fija que encoge de tamaño para dejar ver mejor el resto de la ficha, que pasa por debajo de ella (incluida paginación) hasta que la navegación Anterior/Siguiente llega abajo del todo; tags siempre a 32px de la caja de imagen, con o sin paginación.

### Cambios Realizados
Ver `docs/decisions.md` D-032 para el detalle completo. En resumen:
1. Cabecera (X + título) en un contenedor `sticky top-0`, disuelto vía `lg:contents` en escritorio.
2. Foto pinneada y encogible (400px→200px, spec confirmada contra Figma `369:32751`) gestionada enteramente por JS con `position: fixed` — **no** con `position: sticky` nativo, tras verificar que un elemento sticky más bajo que el viewport nunca se libera de forma nativa sin importar cuánto contenido haya después.
3. Liberación anclada a la posición real de la fila de tags (no a un cálculo genérico de "espacio restante del contenedor"), garantizando matemáticamente cero solape con el contenido siguiente en cualquier longitud de página.
4. Réplica exacta en el overlay SPA de `index.astro` (regla de mantenimiento en espejo), con dos ajustes propios de su estructura (ver Problemas Encontrados).

### Decisiones Tomadas
Ver `docs/decisions.md` D-032.

### Problemas Encontrados y Resueltos
- **Intento inicial con `position: sticky` nativo + `display: contents`**: se restructuró el grid para que la imagen compartiera bloque contenedor con tags/info/nav (necesario para que la liberación nativa de sticky funcionase). Verificado en navegador que el contenido quedaba **permanentemente oculto** detrás de la imagen fija en eventos cortos — diagnosticado matemáticamente: un elemento sticky solo se libera de forma nativa cuando su propia altura ≥ la altura del viewport, algo que casi nunca ocurre para una foto de ~400px en un móvil de 600-900px de alto, sin importar cuánto contenido tenga la página. Se abandonó esta vía por completo a favor de `position: fixed` calculado a mano.
- **Fórmula de liberación mal calibrada (dos iteraciones)**: un primer intento anclado al bloque contenedor genérico y un segundo anclado a la posición del bloque de navegación tenían el mismo problema de fondo (nunca se liberaban a tiempo, o lo hacían pero congelaban el solape existente en vez de resolverlo). La fórmula que sí funciona compara la foto contra la posición **real y actual** de la fila de tags (`top = min(headerBottom, tagsTop - alturaBloque)`) — verificado con barrido completo de scroll (paso a paso, no solo el punto final) en eventos cortos y largos, con y sin paginación: el solape pasa de -32px en reposo a 0px exacto y se mantiene así, nunca positivo.
- **`overflow-anchor` (scroll anchoring) interfería con la medición**: Chrome ajusta silenciosamente la posición de scroll cuando un elemento fuera de pantalla cambia de tamaño — exactamente lo que hace la foto y el centinela en cada tick — produciendo posiciones de scroll impredecibles en las pruebas. Resuelto con `overflow-anchor: none` en los elementos que cambian de altura solo por script.
- **Overlay — cabecera fija anclada 41px por debajo de lo esperado**: `#event-details-overlay` es a la vez el contenedor con scroll propio y el que llevaba el `padding-top`, así que el `sticky top:0` de la cabecera calculaba contra el borde CON padding en vez de contra el techo real. Solución: el padding superior se trasladó al wrapper interior, dejando el contenedor con scroll sin padding propio.
- **Overlay — bloque contenedor accidental para la imagen fija**: `#overlay-details-content` (wrapper de la animación de entrada/salida del overlay) tiene `transition: transform`, y Chrome calcula un `matrix(1,0,0,1,0,0)` para cualquier elemento con `transform` en su lista de transición aunque nunca se le aplique ninguno — por especificación eso convierte al elemento en el bloque contenedor de sus descendientes `fixed`, doblando el offset de la imagen. Diagnosticado inspeccionando la cadena de ancestros con `getComputedStyle()` hasta encontrar el `transform` inesperado. Solución: `updateOverlayStickyImage()` resta el offset de ese wrapper al `top`/`left` en cada tick.
- Varios "falsos positivos" de capturas de pantalla mostrando la foto minúscula/descolocada que resultaron ser artefactos de temporización de la herramienta de captura (confirmado repitiendo la captura o midiendo directamente con `getBoundingClientRect()`, que siempre dio valores correctos) — importante no diagnosticar de más sobre una única captura cuando las mediciones JS no cuadran con ella.

### Tareas Pendientes
- El icono de lupa superpuesto sobre la foto (esquina inferior derecha, visible en el frame de Figma `369:32751` como affordance para abrir el visor una vez la foto está encogida) no se implementó — no pedido explícitamente esta sesión. La foto sigue abriendo el visor a pantalla completa al pulsarla entera, como antes.
- Pendientes ya registrados en sesiones anteriores y aún sin hacer: el pliegue de papel del bottom sheet del mapa (aparcado); verificar el bottom sheet completo en un dispositivo móvil real.

---

## [2026-07-21] — Sesión: Highlights (gap y simetría), buscador de cabecera sin encogido prematuro, fecha en la pastilla de galería

### Objetivo de la Sesión
Cuatro peticiones del propietario: reducir el hueco slider→Highlights en móvil, corregir la asimetría del separador vertical en el modo adaptable de Highlights, arreglar el buscador de la cabecera (se encogía y truncaba el placeholder antes de tiempo por un reparto 50/50 rígido con el Menú), e incluir la fecha del evento en la pastilla de título de la galería (hover en escritorio, fija en táctil).

### Cambios Realizados
1. **Gap slider→Highlights (D-029)**: `mt-2` (fijo) → `mt-0 lg:mt-2` en la fila de tags/toggle. Por debajo de `lg` el hueco baja de 32px a 24px.
2. **Simetría del separador de Highlights (D-029)**: diagnosticado con `getBoundingClientRect()` que el hueco antes del `border-l` de cada `TagWithLink` era 48px (su propio padding + el `gap-6` del contenedor) y solo 24px después (solo su padding) — asimétrico. Contenedor interior de tags: `gap-6` → `gap-0 lg:gap-6`; por debajo de `lg` el padding propio de cada tag (24px a cada lado) ya basta para una separación simétrica sin el gap extra del contenedor.
3. **Buscador de cabecera sin reparto 50/50 (D-029)**: diagnosticado en vivo (screenshot a 900px) que el buscador truncaba el placeholder con ~430px de hueco vacío antes del botón Menú — causa: `md:col-span-6` en ambos lados repartía la fila en dos mitades FIJAS de un grid de 12 columnas, sin relación con cuánto necesita cada lado. Sustituido por `flex` puro en toda anchura (título `flex-1 min-w-0`, Menú `shrink-0`, gap `gap-4 md:gap-6`) en `index.astro`, `exposiciones.astro` e `info.astro` — el buscador ahora ocupa todo el sobrante real y solo trunca cuando de verdad no cabe.
4. **Fecha en la pastilla de galería (D-029)**: `FlyerCard.astro` gana la prop `date`; el `.flyer-label` pasa a `justify-between` con el título en negrita a la izquierda y la fecha en Lora a la derecha (Figma "Event Info" `481:238727`). Nuevo helper server-side `formatFechaDMY()` en el frontmatter de `index.astro` (espejo del ya existente en el `<script>` cliente). La réplica JS `buildGalleryCard()` (regla 7 de AGENTS.md) se actualiza igual.

### Problemas Encontrados y Resueltos
- El diagnóstico del buscador empezó midiendo con `getBoundingClientRect()`/`getComputedStyle()` tras forzar el ancho por JS, con resultados inconsistentes con lo que mostraba la captura de pantalla (medía ~306px cuando la caja se veía visiblemente más ancha). Se comprobó con un `<div>` de prueba en el mismo padre que el layout SÍ daba el ancho esperado, así que el problema no era del entorno en general — aun así, la medición JS de ESTE elemento en concreto siguió sin cuadrar con lo pintado en pantalla incluso tras descartar CSS `!important`, `max-width` y reglas ocultas. Se abandonó la vía de medición JS para este caso concreto y se verificó por captura de pantalla (screenshot), que sí reflejó el comportamiento real y permitió encontrar la causa de raíz (el `md:col-span-6` rígido) con confianza.
- La fila de Highlights en `lg+` (desktop) tiene la MISMA asimetría de espaciado que se corrigió en el modo adaptable, pero se dejó sin tocar por estar fuera del alcance pedido explícitamente ("cuando el ancho... cambia a adaptable, a partir de tablet") — ver Tareas Pendientes.

### Tareas Pendientes
- Si en el futuro se pide corregir también la asimetría del separador de Highlights en `lg+` (desktop, ancho fijo por columnas), revisar antes si el `gap-6` de ese contenedor cumple otro propósito de alineación con el `ToggleSelector` antes de tocarlo.
- Pendientes ya registrados en sesiones anteriores y aún sin hacer: subir las cajas de contenido (Galería/Mapa/Lista) — explícitamente aparcado por el propietario, D-028; el pliegue de papel del bottom sheet; el detalle de evento como bottom sheet con caja de imagen colapsable (D-027); verificar el bottom sheet completo en un dispositivo móvil real.

---

## [2026-07-21] — Sesión: Ancho máximo del buscador (según el placeholder o 24px del Menú, lo que llegue antes)

### Objetivo de la Sesión
Matización del propietario sobre el fix del buscador de la sesión anterior (D-029): no basta con que deje de encogerse antes de tiempo — su ancho máximo debe ser el MENOR entre "lo que ocupa el propio texto del placeholder" y "el hueco disponible hasta 24px del botón Menú".

### Cambios Realizados
1. **Tope de ancho por contenido (D-030)**: nuevo span de medición `#search-placeholder-shadow` en `HeaderTitle.astro` (fuente normal, coincide con el placeholder real, no con el texto tecleado en negrita) mide el ancho del texto del placeholder. `expandedWidth` pasa a `Math.min(anchoDisponible, anchoPlaceholder + 6 + 40)` (6 = padding del input, 40 = botón de cerrar).
2. **Bug de medición a cero, encontrado y corregido**: la primera versión puso el span dentro de `#search-state-active`, oculto (`display:none`) al cargar la página — medir el ancho de un descendiente de un ancestro oculto da 0, así que el tope calculado quedaba fijo en 46px para siempre (la caja de búsqueda se veía colapsada a un punto). Solución: mover el span fuera de ese estado, como hijo directo de `#search-box-container` (que nunca se oculta).

### Decisiones Tomadas
Ver `docs/decisions.md` D-030.

### Problemas Encontrados y Resueltos
- El bug de medición a cero se diagnosticó comparando el `style.width` inline (que sí decía el valor correcto contextualmente erróneo, 46px) contra una captura de pantalla que mostraba la caja colapsada — confirmando que el CÁLCULO era el problema (basado en una medición hecha demasiado pronto, contra un elemento aún sin layout), no un problema de aplicación de estilos.

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: Highlights adaptable también en escritorio

### Objetivo de la Sesión
Extender a `lg+` (escritorio) el ancho adaptable de la fila de Highlights que hasta ahora solo aplicaba por debajo de `lg` (tablet/móvil) — el propietario pidió que el comportamiento fuera igual en todas las anchuras, manteniendo siempre los 24px simétricos a cada lado del separador vertical.

### Cambios Realizados
1. **Highlights adaptable en toda anchura (D-031)**: el contenedor de tags pierde el modo grid de escritorio (`lg:grid lg:grid-cols-8`, división fija en 8 columnas iguales) y queda en `flex gap-0` sin condicionales — cada `TagWithLink` se dimensiona por su propio contenido en cualquier tamaño de pantalla, no solo por debajo de `lg`. Con `gap-0` uniforme, el padding propio de 24px de cada tag es la única fuente de separación, así que la simetría 24px/24px de D-029 pasa a aplicar siempre, también en escritorio.

### Decisiones Tomadas
Ver `docs/decisions.md` D-031.

### Problemas Encontrados y Resueltos
- Ninguno; cambio directo, verificado con `getBoundingClientRect()` en escritorio (1280px: anchos de tag ahora varían según contenido — 115/119/151/149px en vez de 157px fijos — con 24px de padding en ambos lados de cada tag) y por captura de pantalla en tablet (834px, sin regresión visual).

### Tareas Pendientes
- Ninguna nueva.

---

## [2026-07-21] — Sesión: Ajuste fino del panel del mapa (X pegada al mapa) y offset del header en móvil

### Objetivo de la Sesión
Feedback del propietario sobre una captura anotada de escritorio: pegar la X de cierre del panel del mapa a la caja contenedora (misma altura donde arranca el mapa) en todas las anchuras, acercar el título a la X otros 8px, y reducir algo más la distancia entre la cabecera de página y el borde superior de pantalla en móvil.

### Cambios Realizados
1. **X del panel del mapa pegada al mapa en toda anchura (D-028)**: `pt-0 lg:pt-[8px]` → `pt-0` en la fila de la X. Antes solo el bottom sheet móvil quedaba pegado; en escritorio sobraba 8px de hueco. Verificado con `getBoundingClientRect()` a 1280px: `panelTop === mapTop === closeBtnTop === 368px`, coincidencia exacta.
2. **Título 8px más cerca de la X (D-028)**: `pt-[16px] lg:pt-[24px]` → `pt-[16px]` en toda anchura. Hueco X→título: 32px → 24px en escritorio.
3. **Offset del header de página en móvil (D-028)**: `pt-[calc(10vh-24px)] md:pt-[10vh]` → `pt-[calc(10vh-40px)] md:pt-[10vh]` (16px adicionales) en los 6 sitios ya unificados en D-024. `SideMenu.astro` ajusta su `min-h` en paralelo (`calc(10vh+40px)` → `calc(10vh+24px)`) para preservar el invariante `min-h − pt = 64px` que mantiene su botón de cierre alineado con el botón que abre el menú. Verificado en móvil (375px): el botón "Menú" y el botón "Cerrar menú" del SideMenu miden ambos `top: 45.195px`.

### Decisiones Tomadas
Ver `docs/decisions.md` D-028.

### Problemas Encontrados y Resueltos
- Ninguno nuevo; cambios de espaciado directos, verificados por medición exacta (`getBoundingClientRect()`) en escritorio (1280px) y móvil (375px) antes de darlos por buenos.

### Tareas Pendientes
- **Explícitamente aparcado por el propietario, no tocar hasta que lo pida**: volver a subir un poco las cajas de contenido (Galería/Mapa/Lista) que se bajaron en su momento para que el efecto hover de las imágenes no se recortase — ya no hace falta tanto espacio. El propietario pedirá esto explícitamente en una sesión futura ("cosas que tenemos pendientes").
- Pendientes ya registrados en sesiones anteriores y aún sin hacer: el pliegue de papel del bottom sheet (aparcado), el detalle de evento como bottom sheet con caja de imagen colapsable (specs dadas por el propietario, ver D-027), verificar el bottom sheet completo en un dispositivo móvil real.

---

## [2026-07-21] — Sesión: Pulido final de Intro WebGL Apple Pro, tipografía Space Grotesk en Canvas y limpieza de keyframes

### Objetivo de la Sesión
Eliminar de forma definitiva los keyframes y la línea de tiempo de `intro-gl.astro`, unificar la tipografía de Canvas a Space Grotesk (con letter-spacing exacto de Figma), arreglar los desbordamientos/recortes de la tipografía y ajustar el panel lateral a pantalla completa.

### Cambios Realizados
1. **Eliminación de Keyframes & Timeline**: Eliminada la barra inferior (`<footer>`), listeners de reproducción y la lógica de interpolación por tiempo. La animación se reproduce en bucle continuo respondiendo únicamente a la posición en el DOM.
2. **Tipografía Space Grotesk en Canvas 2D**: Reemplazada la fuente por defecto del sistema (`-apple-system`) en el renderizado de la textura del título por `Space Grotesk` con `-10px` de tracking.
3. **Subtítulo y Divisores DOM**: Ajustada la tipografía del subtítulo a `Space Grotesk` con `leading-[48px]` y `tracking-[-0.04em]` de acuerdo con el nodo de Figma.
4. **Dimensiones del Canvas WebGL**: Expandido el contenedor del canvas `gl-canvas` en un 10-20% con márgenes negativos para prevenir recortes visuales del efecto Bloom.
5. **Inspector Lateral**: Extendida la altura del panel `inspector-panel` hasta el fondo (`bottom-0`).

## [2026-07-20] — Sesión: Bottom sheet fiel a Figma (sin redondeos), unificación de sombras/dims a Tinted 950 y subida de contenido en móvil

### Objetivo de la Sesión
Tras la insistencia del propietario (con capturas de Figma), rehacer de verdad la cabecera del bottom sheet, unificar el "kilombo" de colores de sombras/dims a un único primitivo, y ajustar espaciados en móvil.

### Cambios Realizados
1. **Bottom sheet fiel a Figma (D-024)**: mirando por fin la captura de `269:11222` al detalle (descargada y ampliada píxel a píxel), se confirmó que **nada lleva esquinas redondeadas**. Eliminados `border-radius` del sheet y `rounded-full` del tirador. El sheet ahora recorta su esquina superior derecha con `clip-path` (pliegue diagonal) y `BottomSheetHeader.astro` se reescribió: tirador rectangular 80×5 + sombra del pliegue como SVG con `feGaussianBlur` real (el intento anterior con `filter:blur()`+`clip-path` de CSS dejaba un triángulo sólido). Sheet bajado de 64 a 88px.
2. **Contenido móvil subido 24px (D-024)**: `pt-[10vh]` → `pt-[calc(10vh-24px)] md:pt-[10vh]` en las 6 apariciones del header común. `SideMenu` ajusta su `min-h` en paralelo.
3. **Hueco cabecera↔toolbar en móvil**: recortado de 24px a 16px con `-mt-2 md:mt-0` en el toolbar (Tailwind: gap-6=24px, -mt-2=−8px), acercándolo al mockup de Figma.
4. **Unificación de sombras/dims (D-025)**: creado el primitivo `--mel-shadow-rgb: 24 16 18` (Tinted 950) y tokens de elevación nombrados en `global.css`. Migrados los ~12 sitios con `rgba()` sueltos (38,31,31 / 38,32,32 / 25,6,9 / 33,24,26) y los `shadow-sm/md/xl` de Tailwind. Los dims (SideMenu, lightbox, bottom sheet) pasan a `--mel-dim` + `mix-blend-multiply` para notarse en oscuro. Registrado en `design-system.md` (nueva sección + reglas UX 5–7).

### Problemas Encontrados y Resueltos
- La cabecera del sheet era "una ruina" en el intento previo por dos motivos concretos: (a) `border-radius`+`rounded-full` (esquinas redondeadas prohibidas), y (b) la sombra del pliegue hecha con `filter:blur()`+`clip-path` en CSS, que recorta el degradado en seco. Ambos corregidos; la clave fue **descargar la captura de Figma y ampliarla** para leer la geometría real (tirador rectangular, pliegue diagonal, sombra suave).
- El dim invisible en oscuro se resolvió con `mix-blend-multiply` sobre el primitivo Tinted 950 (verificado en `.dark`: el área sobre el sheet se oscurece de forma perceptible).
- Verificado que las `box-shadow` con `rgb(var(--mel-shadow-rgb) / α)` compilan y resuelven (`rgba(24,16,18,0.32)…`), y que el desktop del panel del mapa sigue empujando el mapa (393px, sin pliegue).

### Tareas Pendientes
- Verificar el bottom sheet completo (gesto de arrastre incluido) en un dispositivo móvil real.
- Decidir hasta qué ancho horizontal debe estirarse `BottomSheetHeader` cuando se reutilice en otros sheets (pendiente explícito del propietario).
- `box-shadow` en modo oscuro quedan sutiles (no admiten blend mode): si en el futuro se quiere que "aparezcan" más, habría que rehacerlas como capas con multiply (pseudo-elementos), evaluado y descartado por ahora.

---

## [2026-07-20] — Sesión: Corrección del bottom sheet (fixed real, dim, cabecera Figma completa) y lista móvil sin doble margen

### Objetivo de la Sesión
El propietario reportó que el ajuste de la sesión anterior (D-022) empeoró el bottom sheet: apenas alcanzaba la mitad de la pantalla en vez de quedar a 64px del techo real, la cabecera decorativa de Figma se había ignorado, y la lista de Lista en móvil se veía con un margen doble hasta los bordes. Corregir todo eso, auditar exhaustivamente sombras/dim, y documentar el esquema de distancias del toolbar fijo en móvil.

### Cambios Realizados
1. **Bottom sheet: `fixed` real, no `absolute` dentro de `#view-mapa`** (D-023): la sesión anterior anidó el sheet en `#view-mapa` con `top:64px`, sumando esos 64px al offset ya enorme de `#view-mapa` (~440px en un viewport de 812px) en vez de sustituirlo. Vuelto a `position:fixed` (relativo al viewport real) con `inset:64px 0 0 0`. Verificado con `getBoundingClientRect()`: 64px arriba, 0px en los otros tres lados — bordes reales de pantalla.
2. **Dim añadido**: `#map-side-panel-backdrop`, mismo color que el lightbox de imagen del detalle de evento (`bg-[var(--mel-primitive-le-950)]/80`), con fundido de opacidad y clic-fuera-para-cerrar. Se encontró y corrigió un bug de `z-index` real en el camino: el dim (z-24) tapaba al propio panel (z-20) — bajado a z-19.
3. **Cabecera del sheet, replicada de verdad**: nuevo componente `src/components/BottomSheetHeader.astro` (reutilizable, escala horizontalmente sin límite fijo de ancho). Incluye el recorte diagonal de la esquina (antes solo había un `border-radius` genérico) y la sombra de pliegue. Esta última se intentó primero con `filter:blur()` + `clip-path` de CSS en el mismo elemento — se veía como un triángulo gris sólido, no como una sombra, porque el clip-path corta el degradado del blur justo en el borde de la figura. Solucionado con un SVG real (`feGaussianBlur`, igual que Figma), que sí deja el desenfoque respirar dentro de su propia región de filtro. Requirió `isolation:isolate` (regla 12 de AGENTS.md) para que el `mix-blend-multiply` no se mezclara contra capas equivocadas.
4. **Lista móvil sin doble margen**: `#list-mobile-cards` heredaba el `px-6`/`sm:px-12` de la página ADEMÁS del `pl-24/pr-16` propio de cada fila `EventCardList`. Añadido `-mx-6 sm:-mx-12` (mismo patrón que `TimeSlider` ya usa para su modo full-bleed) para cancelar el padding de la página. Verificado: 24px/16px exactos (asimetría de Figma intencionada, no un bug de esta sesión).
5. **Auditoría de sombra/dim ampliada**: revisados también los `shadow-sm`/`shadow-md`/`shadow-xl` de Tailwind (no solo los `rgba(...)` a medida de la sesión anterior) — son los valores por defecto de Tailwind, `rgba(0,0,0,0.1)` fijo, tampoco semánticos. Verificado visualmente en modo oscuro forzado: tarjetas de galería en hover, menú lateral y bottom sheet, sin resplandores en ninguno.
6. **Esquema de distancias del toolbar fijo en móvil**: documentado y entregado al propietario en el chat (ver también D-023 y este entry) — no se modificó ningún valor salvo los ya cubiertos en D-021/D-022 (24px de los tiradores, hueco cabecera↔toolbar).

### Decisiones Tomadas
Ver `docs/decisions.md` D-023 (corrige D-022).

### Problemas Encontrados y Resueltos
- El bug de posición (absolute anidado vs. fixed real) solo se detectó releyendo con cuidado la petición original del propietario ("64px de la parte superior de la PANTALLA", no del contenedor) — la sesión anterior había asumido, sin verificarlo con el propietario, que bastaba con no tapar la cabecera del sitio.
- El bug de `z-index` del dim (tapando al panel) se detectó por inspección visual — el panel entero se veía teñido de un marrón oscuro uniforme, sin que el título/tarjetas se distinguieran con claridad.
- El bug del pliegue sólido (CSS blur+clip-path) se diagnosticó comparando el resultado renderizado contra el screenshot de Figma antes de intentar arreglarlo a ciegas.

### Tareas Pendientes
- Verificar el bottom sheet completo (incluyendo el gesto de arrastre) en un dispositivo móvil real.
- Si se reutiliza `BottomSheetHeader.astro` en otro sheet del sitio, decidir entonces hasta qué ancho horizontal tiene sentido escalarlo (pendiente explícitamente, palabras del propietario: "luego veremos hasta dónde debería abarcar").

---

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
