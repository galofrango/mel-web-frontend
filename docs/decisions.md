# Registro de decisiones

Formato: contexto → decisión → motivo → consecuencias. Añade nuevas entradas al final. Este documento crece con el tiempo; no borres entradas aunque se reviertan (marca la reversión como una entrada nueva).

---

## D-001 · Google Sheets como CMS, sin backend propio

- **Contexto**: el archivo lo mantienen dos personas sin infraestructura; los datos cambian con frecuencia (nuevas piezas, correcciones).
- **Decisión**: leer una hoja pública de Google Sheets vía endpoint `gviz/tq` en el frontmatter SSR, en cada request. Google Drive aloja las imágenes.
- **Motivo**: edición sin despliegues ni panel de administración; coste cero.
- **Consecuencias**: la web depende de la disponibilidad y del **orden de columnas** de la hoja (los índices están hardcodeados); cambios de estructura en la hoja rompen el parseo. La página `/info` es un mini-CMS por filas (añadir secciones no requiere código).

## D-002 · Astro SSR (adapter Vercel) en lugar de estático

- **Contexto**: originalmente el sitio era estático; los datos de la hoja quedaban congelados en el build.
- **Decisión**: `output: 'server'` con `@astrojs/vercel` (commit `fec188f`).
- **Motivo**: que las ediciones de la hoja aparezcan al recargar, sin rebuilds.
- **Consecuencias**: cada request paga el fetch a Google; no hay caché propia.

## D-003 · JavaScript vanilla y `index.astro` monolítico

- **Contexto**: la home tiene mucho estado compartido (filtros, vistas, mapa, overlay) y el diseño exige animaciones muy específicas.
- **Decisión**: sin framework de UI; la home concentra su lógica en un solo archivo con `window._melState` como estado global.
- **Motivo**: control total de las animaciones y cero dependencias; el estado compartido entre vistas hace artificial trocearlo.
- **Consecuencias**: `index.astro` (~3600 líneas) se navega con `grep`, no leyéndolo entero. El overlay SPA duplica el diseño de `event/[id].astro` (ver D-008).

## D-004 · Animaciones contenidas con FLIP/transforms, no View Transitions con nombre

- **Contexto**: las tarjetas animadas con `view-transition-name` se renderizan en la capa superior del navegador y se "escapan" de los contenedores con `overflow: hidden` (se veían tarjetas volando sobre la paginación/toolbar).
- **Decisión**: dentro de contenedores con clipping, animar con FLIP (First-Last-Invert-Play) usando `transform`, y clones `position:absolute` anclados al grid para las salidas. `document.startViewTransition` se usa solo como envoltorio general, coalescido con rAF en eventos de alta frecuencia.
- **Motivo**: respetar el clipping; iniciar una view transition mientras otra está pendiente además las cancela/supersede (el drag del slider no animaba).
- **Consecuencias**: más código manual de animación; regla fija documentada en AGENTS.md.

## D-005 · Recarga dura para navegaciones con fade manual

- **Contexto**: el botón "De acuerdo" del EmptyState hacía fade del body y luego `history.back()`; el ClientRouter interceptaba y superponía su propia transición (tirón visible). Además `document.referrer` llegaba vacío a veces.
- **Decisión**: fade + `window.location.href = '/'` inmediato (sin esperar al fade), siempre a la galería.
- **Motivo**: una sola transición, destino fiable, y la carga del destino empieza en paralelo al fade.
- **Consecuencias**: esa navegación pierde el estado SPA (aceptable: vuelve a la home limpia). `Layout.astro` resetea `body.style.opacity` en `astro:page-load` por si el fade quedara pegado.

## D-006 · Porcentajes planos en `<colgroup>`, no `calc()`

- **Contexto**: `calc((100% - 120px) * N / 7)` en `<col>` renderizaba todas las columnas iguales, ignorando el multiplicador (verificado midiendo píxeles).
- **Decisión**: anchos porcentuales calculados a mano (Evento 29%, Fecha 12%, resto 14.75%).
- **Consecuencias**: al cambiar proporciones hay que recalcular a mano.

## D-007 · Réplica manual de componentes en HTML generado por JS

- **Contexto**: los componentes Astro solo existen en build/SSR; el overlay SPA y las filas de la tabla se generan en cliente.
- **Decisión**: replicar el marcado/clases de los componentes en plantillas JS (`makeTagHtml()` ≈ `TagWithLink`, enlaces de artista ≈ `Link`).
- **Consecuencias**: cambios de estilo en un componente exigen buscar sus réplicas JS. Lista de espejos conocidos en AGENTS.md (regla 7).

## D-008 · Detalle de evento duplicado: página estática + overlay SPA

- **Contexto**: el detalle debe funcionar como URL directa (`/event/MEL-XXXX`, con view transition de la imagen desde la galería) y como overlay instantáneo sobre la home (mapa, lista) sin perder el estado de filtros.
- **Decisión**: mantener ambas implementaciones del mismo diseño; el overlay escribe `?detail=MEL-XXXX` para ser compartible.
- **Consecuencias**: todo cambio de diseño del detalle se aplica **dos veces**. Es el mayor coste de mantenimiento consciente del proyecto.

## D-009 · Espaciados verticales relativos al viewport, calibrados a 4K

- **Contexto**: los espaciados en píxeles aprobados por el propietario en su pantalla 4K desperdiciaban espacio en pantallas pequeñas.
- **Decisión**: paddings de página en `vh` (`pt-[10vh]`, `pb-[3vh]`, reservas de paginación `6vh/13vh/7vh`) y espaciados de la intro en `%` del ancho (7.5% ≈ 108px a 1440), de modo que a la resolución de referencia reproducen exactamente los píxeles aprobados.
- **Consecuencias**: no reconvertir a píxeles fijos; los valores "raros" en vh son intencionados.

## D-010 · Header unificado en todas las páginas

- **Contexto**: home, info y exposiciones tenían headers con offsets distintos; al navegar, el título y el menú "saltaban".
- **Decisión**: geometría idéntica en todas las páginas (`pt-[10vh]`, misma fila, título 48px de alto); el botón de cerrar del menú lateral se alinea a la misma altura (`min-h-[calc(10vh+64px)]` en su cabecera). En móvil: "M.E.L.", menú solo icono, gap de 16px.
- **Consecuencias**: toda página nueva debe copiar el header de `exposiciones.astro`.

## D-011 · Móvil por reordenación responsive, no por componentes paralelos

- **Contexto**: el diseño móvil del detalle de evento (Figma nodo 634-41290) cambia el orden y la forma de los bloques, no su contenido.
- **Decisión**: mismos bloques con utilidades `order-*` y clases responsive (imagen a sangre con márgenes negativos, tags como fila con scroll horizontal vía CSS compartido `.event-tags-row`, dots del carrusel en flujo en móvil y absolutos en desktop). Única excepción: el título del evento está duplicado (uno `lg:hidden` sobre el grid, otro `hidden lg:block` en la columna info).
- **Motivo**: petición explícita del propietario ("mismos componentes cambiando de forma y orden") y evitar una tercera copia del diseño.
- **Consecuencias**: el título duplicado debe rellenarse dos veces en el overlay SPA (`overlay-event-title` y `overlay-event-title-mobile`).

## D-012 · La intro se puede saltar con cualquier gesto y sin texto de ayuda

- **Contexto**: existía el texto "Scroll o presiona Enter para comenzar".
- **Decisión**: eliminar el texto; disparadores: rueda, Enter, click, tap y arrastre vertical. Contenedor anclado abajo (`items-end`).
- **Motivo**: simplificar la interfaz visual de entrada y permitir que cualquier gesto inicie el ascenso.
- **Consecuencias**: sin pista visible; la intro solo aparece bajo demanda (`?intro=true` o menú lateral), no en cada visita.

## D-013 · Contenido "sin dato" con centinelas de la hoja

- **Contexto**: la hoja usa textos como `Desconocido`, `No detallados`, `Varios`, `SIN FECHA` para datos ausentes.
- **Decisión**: tratarlos como estado "Disabled" (gris `text-tertiary`, sin enlace) en tags y estadísticas, y excluirlos de los contadores de artistas/diseñadores/promotores.
- **Consecuencias**: si la hoja introduce un centinela nuevo, hay que añadirlo a los filtros (`getTagDisplay`, recuentos en index.astro).

## D-014 · Galería 2.0: masonry CSS multicolumna sin recortes (sustituida por D-015)

- **Contexto**: la galería 1.0 (tag git `galeria-1.0`) usaba una rejilla CSS de tarjetas con altura fija (408px) y `object-cover`, que recortaba los flyers. El propietario quiere que los diseños se vean **enteros**, a ancho de columna y con su ratio original (los diseños como protagonistas, tono de exposición/institución).
- **Decisión**: contenedor `columns-1 sm:columns-2 md:columns-3` (CSS multicol) con `gap-x-mel-xl`; cada `.gallery-item` lleva `break-inside: avoid` + `margin-bottom` igual al gap, y la imagen pasa a `w-full h-auto` sin zoom interno.
- **Motivo**: multicol es la única técnica sin JS de medición que da masonry real con alturas desconocidas.
- **Consecuencias**: rebalancea todas las columnas al añadir contenido (no sirvió para scroll infinito, sustituida por D-015).

## D-015 · Galería 2.1: masonry con CSS Grid + row-span medido e Infite Scroll

- **Contexto**: sobre la 2.0 se evaluaron filas justificadas y paseo horizontal. El propietario eligió el **masonry de tres columnas** con scroll infinito.
- **Decisión**:
  1. Huecos de **24px** (`mel-l`) entre columnas y tarjetas.
  2. **Scroll infinito** mediante centinela (`#gallery-sentinel`) observado con `rootMargin` de 1200px.
  3. **Orden aleatorio estable por sesión** (`galleryRandomKeys`).
  4. **Revelado animado al scroll** a nivel de tarjeta (`.reveal-pending` → `.reveal-in`).
  5. **CSS Grid + `row-span` medido por imagen** (`auto-rows: 4px` y `sizeGalleryCard()`).
- **Motivo**: evitar el rebalanceado de columnas que provocaba el CSS multicol en el scroll infinito.
- **Consecuencias**: append estable en el grid, orden visual por filas y placeholders de ~300px mientras la imagen no carga.

## D-016 · Componente `EmptyState` reutilizable con tinte fotográfico duotono (`825:72958`)

- **Contexto**: la aplicación requería guiar al usuario en situaciones de búsqueda sin resultados (Galería y Lista) y en secciones en construcción (`/exposiciones`).
- **Decisión**: crear el componente `<EmptyState variant="construction|no-results" />` acorde a la especificación de Figma `825:72958`.
  - **Filtro fotográfico**: superpone un contenedor absoluto `bg-[var(--mel-primitive-le-900)]` con `mix-blend-screen` sobre la imagen en blanco y negro para lograr el duotono institucional de la marca.
  - **Uso estático y dinámico**: se usa como componente Astro en `/exposiciones` y se replica dinámicamente en client-side JS dentro de `index.astro` para renderizar el estado vacío en el grid de la Galería y como fila `<tr><td colspan="6">` en la tabla de la Lista.
- **Motivo**: unificar el lenguaje de diseño para estados nulos o en desarrollo en todo el sitio web.
- **Consecuencias**: cualquier modificación en el diseño del estado vacío debe reflejarse tanto en el componente Astro como en el renderer dinámico de JS en `index.astro`.

## D-017 · Física e interpolación de la Intro Animada CMYK (`IntroAnimation.astro`)

- **Contexto**: la intro requiere un efecto de offset de aberración cromática CMYK interactivo al pasar el ratón y una salida vertical limpia al iniciar la experiencia.
- **Decisión**:
  - **Contexto de apilamiento**: el contenedor del título (`#intro-title-container`) aplica `isolation: isolate` para que las 3 capas (`mix-blend-multiply`) multipliquen sus canales correctamente sin desvanecerse de forma anómala con la raíz.
  - **Desplazamiento y desenfoque diferenciados**: la capa Amarilla es la que más se mueve (desplazamiento máx 16px, desenfoque máx 1px), la Magenta segunda (máx 8px, desenfoque máx 0.5px) y la Cian permanece **estática** (0px, sin desenfoque) actuando como ancla visual.
  - **Curva de ascensión ease-in sin desaceleración final**: el vuelo vertical usa `cubic-bezier(0.55, 0.085, 0.68, 0.53)` durante 2100ms. Arranca con inercia suave y sale por la parte superior a velocidad constante.
  - **Descomposición del subtítulo por palabras**: la frase `"A través del diseño gráfico"` se divide palabra por palabra en una ola ascendente con 150ms de retardo acotada a `-90vh` (manteniéndose siempre por debajo de la capa Cian a `-135vh` para evitar solapamientos).
- **Motivo**: lograr un microefecto tipográfico refinado y fluido aprobado en diseño.
- **Consecuencias**: los tiempos de inicio del desvanecimiento (1300ms) y cambio de vista (2300ms) están ajustados en sincronía exacta con esta duración de 2.1s.

## D-018 · Estudio de Animación, Timeline Editor & Pilote de FX (`intro-lab.astro`)

- **Contexto**: Se requiere persistir las ediciones al navegar entre presets, permitir renombrar y crear snapshots personalizados de las versiones, e integrar la técnica de tramas de puntos CSS-IRL con control de ángulo de pantalla (`Screen Angle`) independiente por capa de color.
- **Decisión**: Se actualiza `src/pages/intro-lab.astro` (v4):
  - **Snapshots & Persistencia Local**: Guardado automático del estado de keyframes en `localStorage` y creación de snapshots personalizados con botón `📸 Snapshot`.
  - **Renombrado**: Edición del nombre de cualquier versión activa con `✏️ Renombrar`.
  - **Halftone CSS-IRL & Angulación CMYK**: Basado en `css-irl.info/css-halftone-patterns/`, cada capa de color (Cian, Amarillo, Magenta) tiene un overlay interno de trama de puntos radiales con inclinación de ángulo regulable (0° a 360°), tamaño de punto y dureza.
- **Motivo**: Recrear la técnica de fotomecánica de imprenta offset con angulación de planchas evitando patrones muaré indeseados.
- **Consecuencias**: Disponible en `http://localhost:4326/intro-lab`.

## D-019 · Corrección de reflow: la galería se queda "amontonada" al volver de otra pestaña

- **Contexto**: Si un filtro/búsqueda reconstruye la galería (D-015) mientras `#view-galería` está oculta (`display:none`, tras cambiar a Mapa o Lista), `sizeGalleryCard()` mide `card.clientWidth === 0` y aborta sin fijar `grid-row-end`. La tarjeta queda con la clase `.unsized` (placeholder de ~300px), pero como el grid usa `align-self:start` (no `stretch`), la caja se dimensiona por su propio contenido, no por el área reservada: una imagen real más alta que el placeholder se solapa visualmente con la fila siguiente ("amontonadas").
- **Decisión**: en `switchView()`, al activar la vista `galería`, remedir con `sizeGalleryCard()` cualquier tarjeta que siga con la clase `.unsized`, usando el `clientWidth` de una tarjeta cualquiera ya visible como ancho de columna.
- **Motivo**: la única vía fiable de detectar "medición fallida por estar oculto" es la propia clase `.unsized` que `sizeGalleryCard()` no llega a quitar; recalcular solo esas tarjetas (no todas) es barato y evita reintroducir el coste que ya evita el resize handler existente.
- **Consecuencias**: sin cambios visibles cuando no hay tarjetas afectadas (caso común); en el caso afectado, el fix corre una vez por cada vuelta a la Galería, después de que el `.hidden` ya se ha quitado (lectura de `clientWidth` fuerza el reflow necesario de forma síncrona, sin necesitar `requestAnimationFrame`).

## D-020 · Componente `EventCardList` compartido (tabla móvil + panel del mapa) y bottom sheet en móvil

- **Contexto**: la miniatura de la tabla de Lista usaba `object-fill` (recortando el diseño) en vez de `object-contain` sobre fondo secundario, tal y como especifica Figma "Event Card List" (node `291:13479`). Además, la tabla ancha de escritorio no es usable en móvil, y el panel lateral del mapa (`#map-side-panel`) no tenía versión móvil: al abrirse comprimía el mapa contra el borde de una pantalla de 375px.
- **Decisión**:
  1. **Miniatura de tabla**: revertida a `object-contain` (fit, sin recortar) sobre `bg-mel-bg-secondary`, sin borde — igual que el resto de miniaturas "Image Preview" del design system.
  2. **`buildEventCardListHtml()`** (index.astro): réplica JS única de `EventCardList.astro` (nuevo componente de referencia, ver regla 7 de AGENTS.md) — miniatura 56×56 en fit sobre fondo secundario, título, fecha y chevron. La usan tanto el panel lateral del mapa (`populateSidePanel()`) como la nueva lista de tarjetas en móvil.
  3. **Lista en móvil**: `#list-mobile-cards` (visible `<md`) sustituye a la tabla ancha (`#list-table-wrapper`, ahora `hidden md:block`) con el mismo dataset paginado, usando `buildEventCardListHtml()`. El click en toda la fila abre el detalle (`openLightbox`, mismo contexto de carrusel que la tabla de escritorio — no el contexto acotado por ubicación del panel del mapa).
  4. **Bottom sheet en `#map-side-panel` (móvil)**: mismo contenido/JS que el panel de escritorio (`populateSidePanel()` sin cambios de datos), pero bajo `@media (max-width:767px)` se convierte en `position:absolute` (no `fixed`) anclado abajo dentro de `#view-mapa`, ancho completo, esquinas superiores redondeadas, y una transición de `transform` (desliza desde `translateY(100%)`) en vez del `width` que empuja el mapa en escritorio. Un único estado (`classList.add/remove('side-panel-open')`) gobierna ambos comportamientos vía CSS — el JS de apertura/cierre no necesita saber en qué breakpoint está. Se añade un tirador (`#map-side-panel-handle`, solo visible `<md`) con gesto de arrastre: soltar por debajo de 120px de recorrido cierra el sheet (reutiliza el mismo botón de cerrar). Ver D-022 para el ajuste posterior de la posición vertical (64px) y las medidas exactas del tirador.
- **Motivo**: reutilizar el marcado y la lógica ya validados del panel del mapa (petición explícita del propietario) en vez de duplicar una tercera implementación del detalle compacto de evento.
- **Consecuencias**: cualquier cambio futuro en el diseño de `EventCardList` debe aplicarse en `EventCardList.astro` **y** en `buildEventCardListHtml()` (regla 7). El bug conocido y no relacionado en `window.showLocationOnMap` (referencia a `locationGroups`, variable local de `updateMapMarkers()`, fuera de su alcance) queda sin tocar por ser código sin llamadas activas en el resto del proyecto.

## D-021 · Extremos del slider de fecha siempre a 24px del borde (independiente del ancho del texto)

- **Contexto**: `TimeSlider.astro` posiciona los dos tiradores con `style.left` calculado a partir de un margen reservado fijo (antes 104px) menos un offset que asume que la caja del tirador mide exactamente 60px (su `min-width`). En la práctica el texto del año (p. ej. "2019" vs "2004") hace que la caja crezca por encima del `min-width`, así que ese offset fijo solo es exacto para el tirador cuyo **borde exterior coincide con el lado que se posiciona** (el mínimo, anclado por `left`). El tirador máximo se posicionaba también por `left` con un offset distinto, así que su borde exterior real (`left + width`) quedaba a merced del ancho real del contenido — 21.3px en vez de 24px, verificado con `getBoundingClientRect()`.
- **Decisión**: el tirador máximo pasa a anclarse por `style.right` (con `style.left = 'auto'`) en vez de `style.left`, con la misma fórmula simétrica que ya usa el tirador mínimo (`96px + (100% - 192px) * pct - 72px`, ahora también restando 72 en vez de sumar 12). Anclar por el lado de su propio borde exterior hace que el resultado sea exacto sin importar cuánto mida la caja. El margen reservado base baja de 104px a 96px (104 producía 32px de margen real; 96 produce los 24px pedidos).
- **Motivo**: `right` posiciona directamente el borde que nos importa (el exterior); `left` sólo lo hace si el ancho de la caja es conocido y constante, lo cual no es cierto aquí.
- **Consecuencias**: verificado con `getBoundingClientRect()` en escritorio (1280px) y en el caso full-bleed de móvil (375px, el slider corre borde a borde): ambos extremos quedan exactamente a 24px en los dos casos. `activeFill` (el relleno de color) no necesitó cambios: ya usaba `style.right` con la misma lógica simétrica.

## D-022 · Bottom sheet del mapa: 64px desde arriba, tirador exacto y hueco cabecera↔toolbar más ajustado

- **Contexto**: repaso de detalle contra Figma tras D-020. Tres ajustes pedidos por el propietario: (1) la cabecera del bottom sheet (tirador + zona superior) debe coincidir con "Bottom Sheet Header" (Figma `269:11222`) y mantenerse a 64px del techo de pantalla salvo que otro elemento ya reclame más espacio; (2) el hueco entre la cabecera del sitio y el bloque de toolbar (slider + tags + selector de vista) en escritorio era mayor que en el mockup de Figma (`439:140952`); (3) revisión de colores de sombra/dim para evitar que se conviertan en resplandores en modo oscuro.
- **Decisión**:
  1. **Posición del bottom sheet**: sustituido `max-height:75vh` por `inset:64px 0 0 0` (equivalente a `top:64px`) sobre el `position:absolute` ya introducido en D-020. Como `#view-mapa` (su contenedor de posicionamiento) ya arranca por debajo de la cabecera + toolbar del sitio, un `top:64px` fijo dentro de él respeta automáticamente "a no ser que haya otros elementos que hagan pensar que es poca distancia" — no hace falta medir la altura real de la cabecera en JS. Verificado con `getBoundingClientRect()`: 64.0px exactos entre el techo de `#view-mapa` y el del sheet abierto.
  2. **Tirador de arrastre**: ancho corregido de 48px a 80px (`393 − 157 − 156` en el frame de Figma) y el espacio superior de `py-8` a `pt-16/pb-12`, replicando el "Handler" de `269:11222`. No se replican los adornos decorativos de "pliegue de papel" (Background/Sombra/Pliegue, SVGs con máscara) — desproporcionados en esfuerzo frente al resto de la tarea; el `border-radius` ya cubre el redondeo superior.
  3. **Hueco cabecera↔toolbar (escritorio)**: el wrapper del toolbar tenía `py-4` (16px arriba y abajo) *además* del `gap-6` (24px) del contenedor padre, sumando 40px entre la cabecera y el slider. Se quita el padding superior (`py-4` → `pb-4`), dejando el hueco solo al `gap-6` del padre (24px) — más ajustado, sin tocar el hueco toolbar→contenido (que conserva su `pb-4`).
  4. **Auditoría de sombra/dim**: revisados todos los `box-shadow`/`drop-shadow`/fondos de dim del proyecto (tarjetas, tiradores, menú lateral, bottom sheet, toggle). Ninguno usa una variable semántica (`--mel-bg-*`, `--mel-text-*`, etc., que sí cambian entre `:root` y `.dark`) — todos son `rgba(38,31,31,*)`/`rgba(25,6,9,*)` fijos o el primitivo estático `--mel-primitive-le-900/950` (no sobrescrito en `.dark`), así que ya se mantienen oscuros y correctos en ambos temas. Verificado visualmente forzando `.dark` en `<html>`: ninguna sombra se ve como resplandor. No se necesitó ningún `mix-blend-mode: multiply` adicional.
- **Motivo**: alinear con Figma sin introducir mediciones dinámicas frágiles (aprovechar que `#view-mapa` ya resuelve el "no tapar la cabecera" estructuralmente) y confirmar con evidencia, no suposición, que no existe el bug de sombra semántica antes de tocar nada.
- **Consecuencias**: si en el futuro se añade un `box-shadow`/dim que SÍ referencie una variable semántica, revisar entonces si necesita un `mix-blend-mode:multiply` dedicado (requeriría una capa separada solo-sombra, ya que `mix-blend-mode` en el propio elemento con fondo opaco tiñe también su relleno, no solo la sombra).
- **Corregido por D-023**: el punto 1 (posición) partía de una lectura equivocada de "64px desde arriba" — ver D-023.

## D-023 · Corrección de D-022: el bottom sheet debe ser `fixed` a la pantalla, no `absolute` dentro de `#view-mapa`

- **Contexto**: tras aplicar D-022, el propietario reportó que el sheet se veía **peor**, alcanzando solo la mitad de la pantalla. La causa: `#view-mapa` ya arranca ~440px por debajo del techo real (10vh de la página + cabecera + toolbar + 24px), y D-022 puso el sheet en `position:absolute` **dentro** de `#view-mapa` con `top:64px` — esos 64px se sumaban al offset ya existente de `#view-mapa`, en vez de sustituirlo. El propietario aclaró la intención real: el sheet debe llegar arriba casi hasta el borde de pantalla (64px exactos desde el **techo real**, pudiendo cubrir la cabecera/toolbar del sitio como haría cualquier bottom sheet modal — no quedarse por debajo de ellos) y alcanzar los bordes izquierdo/derecho/inferior reales de la pantalla, no los del contenedor del mapa (que hereda el `px-6` de la página).
- **Decisión**:
  1. **Posición**: `#map-side-panel` vuelve a `position:fixed` (relativo al viewport, no a `#view-mapa`) con `inset:64px 0 0 0`. Verificado con `getBoundingClientRect()`: `top=64`, `left=0`, `right=0`, `bottom=0` exactos — llega a los cuatro bordes reales que le corresponden.
  2. **Dim añadido**: nuevo `#map-side-panel-backdrop` (`fixed inset-0`, mismo `bg-[var(--mel-primitive-le-950)]/80` que usa `#overlay-image-lightbox` en el detalle de evento — mismo color exacto pedido por el propietario), con su propio fundido de opacidad y clic para cerrar. Un bug de `z-index` (dim en z-24, panel en z-20 — el dim tapaba al propio panel) se corrigió bajando el dim a z-19, justo por debajo del panel (z-20).
  3. **Cabecera decorativa replicada de verdad**: nuevo componente `src/components/BottomSheetHeader.astro`, reutilizable y pensado para escalar horizontalmente (`w-full`, sin ancho fijo; el pliegue se mantiene a `notchSize` px fijos en la esquina en vez de deformarse con el ancho). Repica el "Bottom Sheet Header" de Figma completo, no solo el tirador:
     - Panel con la esquina superior derecha recortada en diagonal vía `clip-path` (antes solo había un `border-radius` genérico, sin el recorte real).
     - Sombra de pliegue: **SVG con `feGaussianBlur` real** (como en Figma), no `filter:blur()` + `clip-path` de CSS en el mismo elemento — esa combinación corta el degradado justo en el borde de la figura y deja un triángulo sólido en vez de una sombra suave (verificado visualmente: primer intento con CSS se veía como un triángulo gris opaco, no como una sombra).
     - Requiere `isolation: isolate` en el contenedor (regla 12 de AGENTS.md) para que `mix-blend-multiply` no se mezcle contra capas equivocadas.
     - Tirador ya corregido en D-022 (80×5px, `top:16px`) se mantiene igual, ahora emitido por este componente vía prop `handleId`.
  4. **Lista en móvil sin doble margen**: `#list-mobile-cards` tenía el `px-6`/`sm:px-12` de la página **más** el `pl-24/pr-16` propio de cada fila `EventCardList`, sumando un margen doble ("como si tuviesen 24px extra hasta los lados"). Añadido `-mx-6 sm:-mx-12` (mismo patrón que ya usa `TimeSlider` para su modo full-bleed) para cancelar el padding de la página en todo el rango en que esta lista es visible (`md:hidden` abarca las dos escalas, base y `sm`). Verificado: 24px a la izquierda / 16px a la derecha exactos (asimetría intencionada de Figma, no un bug).
- **Motivo**: "64px de la parte superior de la pantalla" significa la pantalla real, no el contenedor donde vive el componente — un bottom sheet modal por definición puede (y debe poder) cubrir cualquier cosa que no sea ese margen superior fijo.
- **Consecuencias**: `BottomSheetHeader.astro` queda disponible para cualquier futuro sheet del sitio (props: `notchSize`, `height`, `handleId`, `showFold`). El offset de 64px y el full-bleed dependen de que `#map-side-panel` sea descendiente directo (o al menos no tenga ancestros con `transform`/`filter`/`contain` antes de `<body>`) para que `position:fixed` escape correctamente de `#view-mapa`; si en el futuro se envuelve el mapa en algo que cree un nuevo contexto de posicionamiento, este comportamiento se rompería silenciosamente.
