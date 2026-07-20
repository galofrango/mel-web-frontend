# Registro de decisiones

Formato: contexto → decisión → motivo → consecuencias. Añade nuevas entradas al
final. Este documento crece con el tiempo; no borres entradas aunque se
reviertan (marca la reversión como una entrada nueva).

---

## D-001 · Google Sheets como CMS, sin backend propio

- **Contexto**: el archivo lo mantienen dos personas sin infraestructura; los
  datos cambian con frecuencia (nuevas piezas, correcciones).
- **Decisión**: leer una hoja pública de Google Sheets vía endpoint `gviz/tq`
  en el frontmatter SSR, en cada request. Google Drive aloja las imágenes.
- **Motivo**: edición sin despliegues ni panel de administración; coste cero.
- **Consecuencias**: la web depende de la disponibilidad y del **orden de
  columnas** de la hoja (los índices están hardcodeados); cambios de estructura
  en la hoja rompen el parseo. La página `/info` es un mini-CMS por filas
  (añadir secciones no requiere código).

## D-002 · Astro SSR (adapter Vercel) en lugar de estático

- **Contexto**: originalmente el sitio era estático; los datos de la hoja
  quedaban congelados en el build.
- **Decisión**: `output: 'server'` con `@astrojs/vercel` (commit `fec188f`).
- **Motivo**: que las ediciones de la hoja aparezcan al recargar, sin rebuilds.
- **Consecuencias**: cada request paga el fetch a Google; no hay caché propia.
  <!-- TODO: valorar caché/revalidación si el tráfico crece -->

## D-003 · JavaScript vanilla y `index.astro` monolítico

- **Contexto**: la home tiene mucho estado compartido (filtros, vistas, mapa,
  overlay) y el diseño exige animaciones muy específicas.
- **Decisión**: sin framework de UI; la home concentra su lógica en un solo
  archivo con `window._melState` como estado global.
- **Motivo**: control total de las animaciones y cero dependencias; el estado
  compartido entre vistas hace artificial trocearlo.
- **Consecuencias**: `index.astro` (~3600 líneas) se navega con `grep`, no
  leyéndolo entero. El overlay SPA duplica el diseño de `event/[id].astro`
  (ver D-008).

## D-004 · Animaciones contenidas con FLIP/transforms, no View Transitions con nombre

- **Contexto**: las tarjetas animadas con `view-transition-name` se renderizan
  en la capa superior del navegador y se "escapan" de los contenedores con
  `overflow: hidden` (se veían tarjetas volando sobre la paginación/toolbar).
- **Decisión**: dentro de contenedores con clipping, animar con FLIP
  (First-Last-Invert-Play) usando `transform`, y clones `position:absolute`
  anclados al grid para las salidas. `document.startViewTransition` se usa solo
  como envoltorio general, coalescido con rAF en eventos de alta frecuencia.
- **Motivo**: respetar el clipping; iniciar una view transition mientras otra
  está pendiente además las cancela/supersede (el drag del slider no animaba).
- **Consecuencias**: más código manual de animación; regla fija documentada en
  AGENTS.md.

## D-005 · Recarga dura para navegaciones con fade manual

- **Contexto**: el botón "De acuerdo" del EmptyState hacía fade del body y
  luego `history.back()`; el ClientRouter interceptaba y superponía su propia
  transición (tirón visible). Además `document.referrer` llegaba vacío a veces.
- **Decisión**: fade + `window.location.href = '/'` inmediato (sin esperar al
  fade), siempre a la galería.
- **Motivo**: una sola transición, destino fiable, y la carga del destino
  empieza en paralelo al fade.
- **Consecuencias**: esa navegación pierde el estado SPA (aceptable: vuelve a
  la home limpia). `Layout.astro` resetea `body.style.opacity` en
  `astro:page-load` por si el fade quedara pegado.

## D-006 · Porcentajes planos en `<colgroup>`, no `calc()`

- **Contexto**: `calc((100% - 120px) * N / 7)` en `<col>` renderizaba todas las
  columnas iguales, ignorando el multiplicador (verificado midiendo píxeles).
- **Decisión**: anchos porcentuales calculados a mano (Evento 29%, Fecha 12%,
  resto 14.75%).
- **Consecuencias**: al cambiar proporciones hay que recalcular a mano.

## D-007 · Réplica manual de componentes en HTML generado por JS

- **Contexto**: los componentes Astro solo existen en build/SSR; el overlay SPA
  y las filas de la tabla se generan en cliente.
- **Decisión**: replicar el marcado/clases de los componentes en plantillas JS
  (`makeTagHtml()` ≈ `TagWithLink`, enlaces de artista ≈ `Link`).
- **Consecuencias**: cambios de estilo en un componente exigen buscar sus
  réplicas JS. Lista de espejos conocidos en AGENTS.md (regla 7).

## D-008 · Detalle de evento duplicado: página estática + overlay SPA

- **Contexto**: el detalle debe funcionar como URL directa (`/event/MEL-XXXX`,
  con view transition de la imagen desde la galería) y como overlay instantáneo
  sobre la home (mapa, lista) sin perder el estado de filtros.
- **Decisión**: mantener ambas implementaciones del mismo diseño; el overlay
  escribe `?detail=MEL-XXXX` para ser compartible.
- **Consecuencias**: todo cambio de diseño del detalle se aplica **dos veces**.
  Es el mayor coste de mantenimiento consciente del proyecto.

## D-009 · Espaciados verticales relativos al viewport, calibrados a 4K

- **Contexto**: los espaciados en píxeles aprobados por el propietario en su
  pantalla 4K desperdiciaban espacio en pantallas pequeñas.
- **Decisión**: paddings de página en `vh` (`pt-[10vh]`, `pb-[3vh]`, reservas
  de paginación `6vh/13vh/7vh`) y espaciados de la intro en `%` del ancho
  (7.5% ≈ 108px a 1440), de modo que a la resolución de referencia reproducen
  exactamente los píxeles aprobados.
- **Consecuencias**: no reconvertir a píxeles fijos; los valores "raros" en vh
  son intencionados.

## D-010 · Header unificado en todas las páginas

- **Contexto**: home, info y exposiciones tenían headers con offsets distintos;
  al navegar, el título y el menú "saltaban".
- **Decisión**: geometría idéntica en todas las páginas (`pt-[10vh]`, misma
  fila, título 48px de alto); el botón de cerrar del menú lateral se alinea a
  la misma altura (`min-h-[calc(10vh+64px)]` en su cabecera). En móvil:
  "M.E.L.", menú solo icono, gap de 16px.
- **Consecuencias**: toda página nueva debe copiar el header de
  `exposiciones.astro`.

## D-011 · Móvil por reordenación responsive, no por componentes paralelos

- **Contexto**: el diseño móvil del detalle de evento (Figma nodo 634-41290)
  cambia el orden y la forma de los bloques, no su contenido.
- **Decisión**: mismos bloques con utilidades `order-*` y clases responsive
  (imagen a sangre con márgenes negativos, tags como fila con scroll horizontal
  vía CSS compartido `.event-tags-row`, dots del carrusel en flujo en móvil y
  absolutos en desktop). Única excepción: el título del evento está duplicado
  (uno `lg:hidden` sobre el grid, otro `hidden lg:block` en la columna info).
- **Motivo**: petición explícita del propietario ("mismos componentes
  cambiando de forma y orden") y evitar una tercera copia del diseño.
- **Consecuencias**: el título duplicado debe rellenarse dos veces en el
  overlay SPA (`overlay-event-title` y `overlay-event-title-mobile`).

## D-012 · La intro se puede saltar con cualquier gesto y sin texto de ayuda

- **Contexto**: existía el texto "Scroll o presiona Enter para comenzar".
- **Decisión**: eliminar el texto; disparadores: rueda, Enter, click, tap y
  arrastre vertical. Contenedor anclado abajo (`items-end`).
- **Consecuencias**: sin pista visible; la intro solo aparece bajo demanda
  (`?intro=true` o menú lateral), no en cada visita.

## D-013 · Contenido "sin dato" con centinelas de la hoja

- **Contexto**: la hoja usa textos como `Desconocido`, `No detallados`,
  `Varios`, `SIN FECHA` para datos ausentes.
- **Decisión**: tratarlos como estado "Disabled" (gris `text-tertiary`, sin
  enlace) en tags y estadísticas, y excluirlos de los contadores de
  artistas/diseñadores/promotores.
- **Consecuencias**: si la hoja introduce un centinela nuevo, hay que añadirlo
  a los filtros (`getTagDisplay`, recuentos en index.astro).

## D-014 · Galería 2.0: masonry CSS multicolumna sin recortes

- **Contexto**: la galería 1.0 (tag git `galeria-1.0`) usaba una rejilla CSS
  de tarjetas con altura fija (408px) y `object-cover`, que recortaba los
  flyers. El propietario quiere que los diseños se vean **enteros**, a ancho
  de columna y con su ratio original (los diseños como protagonistas, tono de
  exposición/institución).
- **Decisión**: contenedor `columns-1 sm:columns-2 md:columns-3` (CSS
  multicol) con `gap-x-mel-xl`; cada `.gallery-item` lleva `break-inside:
  avoid` + `margin-bottom` igual al gap, y la imagen pasa a `w-full h-auto`
  sin zoom interno. Se eliminaron los `gridSpans` y las clases `span-col-*`.
- **Motivo**: multicol es la única técnica sin JS de medición que da masonry
  real con alturas desconocidas (las dimensiones de los flyers no están en la
  hoja). `grid-template-rows: masonry` aún no tiene soporte suficiente.
- **Consecuencias**: (1) el orden de lectura fluye **de arriba abajo por
  columna**, no por filas — aceptado; la vista Lista conserva el orden
  estricto. (2) Hasta que una imagen carga, su tarjeta mide ~0px de alto y la
  columna se reequilibra al cargar (reflow visible en conexiones lentas). Las
  animaciones existentes (FLIP de reordenación, clones de salida, intro
  escalonada) siguen funcionando porque operan sobre `getBoundingClientRect`.
