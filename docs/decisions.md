# Registro de decisiones

Formato: contexto → decisión → motivo → consecuencias. Añade nuevas entradas al final. Este documento crece con el tiempo; no borres entradas aunque se reviertan (marca la reversión como una entrada nueva).

## Cómo usar este registro

1. **Este archivo guarda el *porqué*, no el *qué*.** El comportamiento vigente del
   sitio se describe en `architecture.md` (ver "Contrato de Navegación"). Una
   entrada nueva explica el contexto, la alternativa descartada y el motivo, y
   **enlaza** al contrato en lugar de reescribirlo. Cuando las reglas se
   duplican en dos sitios, acaban divergiendo — ya pasó.
2. **Una entrada superada no se borra**: se marca con una nota `> **Superada por…**`
   al principio, para que siga contando su historia sin desinformar a quien la lea.
3. **Numeración**: varios identificadores anteriores a `D-097` están duplicados
   (D-015, D-022, D-032, D-033, D-038, D-041, D-044, D-048, D-060, D-064, D-080,
   D-085 a D-090 comparten número entre decisiones distintas). Se conservan tal
   cual porque hay referencias cruzadas por todo el repositorio; **desambigua por
   el título**, no solo por el número. Las entradas nuevas siguen desde el número
   más alto usado, sin reciclar.

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

## D-024 · Bottom sheet fiel a Figma (sin redondeos, con pliegue), bajado a 88px, y contenido móvil subido 24px

- **Contexto**: revisión del propietario sobre D-023. El bottom sheet seguía sin parecerse a Figma "Bottom Sheet Header" (`269:11222`): tenía `border-radius: 20px 20px 0 0` y un tirador `rounded-full`, cuando **en esta web nada tiene esquinas redondeadas**. La cabecera real de Figma es un panel de esquinas rectas con la esquina superior derecha **doblada** (pliegue de papel en diagonal) y un tirador **rectangular**. Además el propietario pidió: bajar el sheet ~24px (de 64 a 88), subir 24px todo el contenido en móvil (incluida la cabecera común a todas las páginas), y ajustar el hueco cabecera↔toolbar en móvil.
- **Decisión**:
  1. **Pliegue real, cero redondeos**: `#map-side-panel` (móvil) pasa a `clip-path: polygon(...)` que recorta la esquina superior derecha (variable `--mel-sheet-notch: 40px`); se eliminan `border-radius`, `border-top` y `box-shadow` (el dim ya separa). El recorte atraviesa el fondo del sheet dejando ver el dim detrás (la esquina "abierta" del pliegue).
  2. **`BottomSheetHeader.astro` reescrito** para replicar Figma de verdad: tirador **rectangular** de 80×5 (color `border`, sin `rounded-*`) + **sombra del pliegue** como SVG con `feGaussianBlur` REAL (no `filter:blur()`+`clip-path` de CSS, que recorta el degradado en seco y deja un triángulo sólido — fue el fallo anterior), `mix-blend-multiply` al 16% (valores exactos de Figma). El propio `clip-path` del sheet enmascara la sombra contra la diagonal. El componente no pinta fondo y escala en horizontal sin límite (el pliegue mantiene su tamaño fijo en la esquina). Requiere `isolation: isolate` (regla 12).
  3. **Sheet bajado a 88px**: `inset: 88px 0 0 0` (antes 64). Verificado con `getBoundingClientRect()`: `top=88`, `left/right/bottom=0`.
  4. **Contenido móvil subido 24px**: `pt-[10vh]` → `pt-[calc(10vh-24px)] md:pt-[10vh]` en las 6 apariciones del header común (index home, overlay de detalle, `event/[id]`, `exposiciones`, `info`, `SideMenu`). El `SideMenu` ajusta su `min-h` a `calc(10vh+40px) md:calc(10vh+64px)` para mantener el botón de cerrar alineado con el botón que abre el menú.
  5. **Hueco cabecera↔toolbar en móvil**: el gap lo daba el `gap-6` (24px) del contenedor. Se recorta a 16px en móvil con `-mt-2` en el toolbar (`md:mt-0` restaura 24px en desktop), acercándolo al ritmo del mockup de Figma (`439:140952` / `315:17658`). Expresado en unidades Tailwind: `gap-6`=24px, `-mt-2`=−8px.
- **Motivo**: fidelidad literal a Figma (el propietario insistió: "NO HAY NADA EN LA WEB CON BORDES REDONDEADOS"); un `feGaussianBlur` de SVG es la única forma de que la sombra del pliegue sea suave sin que el `clip-path` la corte en seco.
- **Consecuencias**: `BottomSheetHeader.astro` (props: `notch`, `height`, `handleId`, `class`) queda como pieza reutilizable para futuros sheets — pendiente decidir hasta qué ancho horizontal se estira (palabras del propietario: "luego veremos hasta dónde debería abarcar"). El sheet debe llevar su propio `clip-path` con `--mel-sheet-notch` coincidiendo con el `notch` del header. La esquina del pliegue deja ver el dim (oscuro) en vez del mapa (claro) que muestra Figma, por existir el scrim entre sheet y mapa: es una diferencia consciente y aceptada.

## D-025 · Unificación de sombras y dims a un único primitivo (Tinted 950) con `mix-blend-multiply`

- **Contexto**: las sombras y scrims del sitio usaban un batiburrillo de colores casi-iguales — `rgba(38,31,31,·)`, `rgba(38,32,32,·)`, `rgba(25,6,9,·)`, `rgba(33,24,26,·)`, `var(--mel-primitive-le-950)/80` y los negros por defecto de Tailwind (`shadow-sm/md/xl` = `rgba(0,0,0,.1)`). Además el dim de los overlays "no se notaba" en modo oscuro (color casi idéntico al fondo).
- **Decisión**:
  1. **Un primitivo**: `--mel-shadow-rgb: 24 16 18` (= Tinted 950, canales separados por espacio para `rgb(… / alpha)`). Todas las sombras/dims pasan a derivar de él. Es fijo: NO se sobrescribe en `.dark` (mismo color en ambos temas).
  2. **Tokens de elevación nombrados** en `global.css`: `--mel-shadow-sm/md/xl` (equivalentes a Tailwind recoloreados), `--mel-shadow-button/handle/menu/marker-active/toggle-inset/flyer-label`, y `--mel-dim`. Reemplazados en los ~12 sitios (index.astro + IconButton, MapMarker, SliderHandler, SideMenu, ToggleSelector, FlyerCard, EmptyState, EventHeader, EventCarousel, EventInfoBox).
  3. **Multiply para verse en oscuro**: los **dims** (SideMenu backdrop, lightbox de imagen, backdrop del bottom sheet) usan `--mel-dim` + `mix-blend-multiply` — así oscurecen en claro y también aportan separación en oscuro (multiplicar Tinted-950 sobre le-950 lo oscurece más). Verificado en `.dark`: el dim ahora sí se nota. La sombra del pliegue también es multiply.
  4. **Limitación documentada**: `box-shadow`/`drop-shadow` no admiten blend mode, así que en oscuro quedan sutiles aunque el color esté unificado — es el comportamiento estándar y aceptado. Solo las capas independientes (dims, pliegue) usan multiply.
- **Motivo**: un solo lenguaje de color para sombras/dims (era un "kilombo") y resolver la invisibilidad del dim en oscuro, registrándolo en el DS (petición explícita del propietario).
- **Consecuencias**: cualquier sombra/dim nueva debe usar los tokens `--mel-shadow-…` (vía `shadow-[var(--mel-shadow-button)]` y similares) o `bg-[var(--mel-dim)] mix-blend-multiply`, nunca `rgba()` sueltos ni `shadow-sm/md/xl` de Tailwind. Registrado en `docs/design-system.md` (sección *Sombras, Dims y Elevaciones* + reglas UX 5–7). El duotono fotográfico de `EmptyState` (`le-900` + `mix-blend-screen`, D-016) queda fuera de este sistema por ser un tinte, no una sombra. La página `intro-lab.astro` (laboratorio dev) se dejó sin migrar por no formar parte del DS público.

## D-026 · El panel del mapa se comporta como el ToggleSelector (responsive), pliegue como dog-ear claro, y refinamientos del bottom sheet

- **Contexto**: feedback del propietario sobre el bottom sheet (D-024/D-025). (a) El pliegue de papel se veía como un agujero oscuro (el `clip-path` dejaba ver el DIM), no como papel. (b) La animación (0.35s) era demasiado rápida. (c) Las filas de eventos tenían menos padding a la derecha (16px) que a la izquierda (24px). (d) El visor de imagen ampliada (multiply, D-025) se transparentaba y dejaba ver el fondo. (e) El panel lateral en escritorio tenía un ancho FIJO de 393px que ahogaba el mapa en muchos tamaños. (f) El bottom sheet debía llegar solo hasta justo debajo del slider de tiempo (dejándolo visible bajo el DIM).
- **Decisión**:
  1. **Pliegue como dog-ear claro** (`BottomSheetHeader`): se elimina el `clip-path` del sheet (que dejaba ver el DIM oscuro por el hueco). El pliegue pasa a ser una CAPA CLARA superpuesta — un triángulo `bg-secondary` en la esquina superior derecha con `drop-shadow` del doblez. Se lee como papel doblado sobre cualquier fondo, sin agujero oscuro.
  2. **Responsive igual que el ToggleSelector** (el toggle ocupa 4 de 12 columnas): el breakpoint del bottom sheet pasa de `md` (768px) a `lg` (1024px) — mismo punto donde el toggle "se va para abajo". En `lg+` el panel lateral usa el MISMO ancho proporcional que el toggle (`calc((100% - 264px) / 3 + 72px)` = 4 columnas del grid de 12 con gap-6), en vez de 393px fijos. Verificado: a 1100px el panel mide 278.7px = ancho del toggle (279px), dejando el mapa mucho más ancho.
  3. **Alto hasta debajo del slider**: bajo `lg`, el borde superior del sheet = borde inferior del slider de tiempo (medido en JS → `--mel-sheet-top`, recalculado al abrir y en resize). El slider queda a la vista, atenuado por el DIM.
  4. **Animación 0.5s** `cubic-bezier(0.32, 0.72, 0, 1)` (antes 0.35s), y el DIM funde a juego (`duration-500`).
  5. **Padding simétrico de filas**: `EventCardList` pasa a `pr-[24px]` (antes 16) y el divisor a `right-[24px]`, igualando el `pl-[24px]`.
  6. **Scrim opaco para visores de imagen**: nuevo token `--mel-scrim` (`rgb(var(--mel-shadow-rgb) / 0.92)`, SIN multiply) para `#overlay-image-lightbox` e `#image-detail-overlay` — cubren el fondo en vez de transparentarlo. Los dims contextuales (SideMenu, panel del mapa) siguen con `--mel-dim` + multiply.
  7. **Fix del revelado al scroll en galería**: en la primera carga solo reciben el intro escalonado las tarjetas dentro del viewport inicial; las de debajo del pliegue pasan directamente a `reveal-pending` (opacity 0) para animarse al llegar el scroll. Antes se marcaban TODAS como `intro-in`, así que las de abajo gastaban su animación invisibles y nunca quedaban `reveal-pending` — el observer no tenía nada que revelar (en móvil casi todo nace fuera de vista, de ahí que "no funcionara"). Ahora quedan 30/32 `reveal-pending` en móvil.
- **Motivo**: fidelidad al mockup (pliegue de papel, no agujero) y coherencia con el sistema (el panel = el toggle, mismo ancho y breakpoint); un scrim de imagen debe ocultar, un dim contextual atenuar.
- **Consecuencias**: el `BottomSheetHeader` ya no depende de que el sheet lleve `clip-path` (el dog-ear es autónomo). **Limitación de verificación**: `IntersectionObserver` no dispara en el navegador de previsualización del entorno (ni con root viewport), así que el revelado al scroll solo se pudo verificar por estado (30 pendientes), no visualmente; en dispositivo real el observer sí actúa. Pendiente aún: convertir la pantalla de detalle de evento en bottom sheet con caja de imagen colapsable al scroll (imagen de referencia del propietario) — es la pieza grande que queda.

## D-027 · Pastilla de galería siempre visible en táctil, y espaciado del header del bottom sheet

- **Contexto**: feedback del propietario. (a) La pastilla de título que aparece al hover sobre las tarjetas de galería no se veía en táctil (móvil/inspector) porque no hay hover. (b) En el bottom sheet del mapa, el hueco tirador→X y X→título eran algo grandes.
- **Decisión**:
  1. **Pastilla en táctil**: la etiqueta gana la clase `.flyer-label` (en `FlyerCard.astro` y en la réplica JS `buildGalleryCard`). Regla global: en dispositivos táctiles la pastilla se muestra SIEMPRE sobre la imagen (`opacity:1`, `translateY(0)`), en vez de solo al hover. Se detecta con `@media (hover: none)` **y** un respaldo JS que marca `.is-touch` en `<html>` (Layout.astro: `matchMedia('(hover: none)')` / `ontouchstart` / `maxTouchPoints`), porque algunos entornos no reportan bien el media query. Verificado que la regla conmuta opacity 0→1 con `.is-touch`.
  2. **Espaciado del header del sheet (solo móvil)**: la fila del botón X baja su `pt` de 8px a 0 (`pt-0 lg:pt-[8px]`) → acerca la X al tirador 8px; la fila de título baja su `pt` de 24px a 16px (`pt-[16px] lg:pt-[24px]`) → acerca el título a la X 8px. En desktop (side panel, sin tirador) se conserva el espaciado de Figma (8/24). Verificado: móvil 0/16, desktop 8/24.
- **Motivo**: en táctil no existe el hover, así que la información contextual debe mostrarse siempre; y el propietario pidió apretar el header del sheet que aún estamos afinando.
- **Consecuencias**: `.flyer-label` es el gancho para cualquier ajuste futuro de la pastilla. Pendiente aún (para sesión fresca): el pliegue de papel del sheet (aparcado por el propietario) y el detalle de evento como bottom sheet con caja de imagen fija que encoge al scroll hasta 200px y luego deja pasar el contenido bajo la paginación, con cabecera (X + título) fija y el icono de lupa (specs dadas por el propietario, guardadas para esa sesión).

## D-028 · X del panel del mapa pegada al mapa en todas las anchuras, y header de página 16px más arriba en móvil

- **Contexto**: feedback del propietario sobre una captura anotada de escritorio. (a) La X de cerrar del panel del mapa debía quedar pegada a la caja contenedora, a la misma altura donde arranca el mapa — en D-027 esto solo se aplicó al bottom sheet móvil (`pt-0`), en escritorio conservaba `lg:pt-[8px]`. (b) El título del panel debía subir otros 8px hacia la X como mínimo. (c) La distancia entre la cabecera de página y el borde superior de la pantalla debía reducirse algo más en pantallas pequeñas (ya se había bajado de 24 a 40 en D-024... revisar: el offset base es `pt-[10vh]`, y D-024 lo redujo en 24px en móvil; esta sesión lo reduce 16px más).
- **Decisión**:
  1. **Fila de la X**: `pt-0 lg:pt-[8px]` → `pt-0` en todas las anchuras (`index.astro`, panel del mapa). Verificado con `getBoundingClientRect()` en escritorio (1280px): `panelTop === mapTop === closeBtnTop === 368px` — la X queda exactamente a la altura donde arranca el mapa, sin offset extra, en cualquier breakpoint.
  2. **Fila del título**: `pt-[16px] lg:pt-[24px]` → `pt-[16px]` en todas las anchuras. El hueco X→título pasa de 32px (escritorio) a 24px (`pb-8` de la fila X + `pt-16` de la fila título) — cumple el mínimo de 8px de reducción pedido.
  3. **Offset del header de página**: `pt-[calc(10vh-24px)] md:pt-[10vh]` → `pt-[calc(10vh-40px)] md:pt-[10vh]` (16px adicionales de reducción en `<md`) en los 6 sitios ya unificados en D-024 (`index.astro` ×2: contenedor exterior de Galería + overlay de detalle; `event/[id].astro`; `exposiciones.astro`; `info.astro`; `SideMenu.astro`).
  4. **Invariante de `SideMenu.astro` preservado**: su `min-h` móvil baja de `calc(10vh+40px)` a `calc(10vh+24px)`, manteniendo `min-h − pt = 64px` (la altura de fila del header de página) constante, de modo que el botón de cierre del menú lateral sigue alineado exactamente con el botón que lo abre. Verificado en móvil (375px): ambos botones (`Menú` y `Cerrar menú`) miden `top: 45.195px`, coincidencia exacta.
- **Motivo**: el propietario observó hueco sobrante encima de la X en escritorio (mismo criterio que ya se aplicaba en móvil) y pidió apretar aún más el margen superior de página en pantallas pequeñas.
- **Consecuencias**: el offset de página en móvil pasa a estar 40px por debajo de `10vh` en vez de 24px; cualquier página nueva que replique el header (regla 10 de AGENTS.md) debe usar `pt-[calc(10vh-40px)] md:pt-[10vh]`. **Pendiente explícitamente aparcado por el propietario** (no tocar hasta que lo pida): volver a subir un poco las cajas de contenido (Galería/Mapa/Lista) que se bajaron para que el hover de las imágenes no se recortase — no hace falta tanto espacio como el actual.

## D-029 · Highlights: gap slider→fila e interior simétrico; búsqueda flex en vez de grid 50/50; fecha en la pastilla de galería

- **Contexto**: cuatro peticiones del propietario. (a) Reducir el hueco entre el slider de fechas y la fila de Highlights (Eventos/Artistas/Diseñadores/Promotores) al menos 8px más en móvil. (b) En el modo de ancho adaptable de esa fila (por debajo de `lg`, Figma "Highlights / Mobile" `369:31311`), la distancia entre el separador vertical (`border-l` de `TagWithLink`) y el contenido debía ser 24px a cada lado — medido con `getBoundingClientRect()`, era 48px antes del separador (padding propio + `gap-6` del contenedor sumados) y solo 24px después (solo el padding propio): asimétrico. (c) La caja de búsqueda de la cabecera se encogía y recortaba el placeholder de forma prematura en anchos intermedios (~900px) aunque sobrara sitio antes del botón Menú — diagnosticado en vivo: `md:col-span-6`/`md:col-span-6` repartía la fila en dos mitades FIJAS de 12 columnas, así que el buscador se encogía con el viewport aunque el Menú (también a la mitad, con hueco de sobra) no lo necesitara. (d) Incluir la fecha del evento en la pastilla de título que aparece al hover en escritorio y fija en táctil (Figma "Event Info" `481:238727`: título en negrita a la izquierda, fecha en Lora a la derecha, `justify-between`).
- **Decisión**:
  1. **Gap slider→Highlights**: la fila de tags/toggle pasa de `mt-2` (fijo, sumaba 8px extra sobre el `gap-6` del contenedor padre en todas las anchuras) a `mt-0 lg:mt-2` — por debajo de `lg` el hueco baja de 32px a 24px (verificado con `getBoundingClientRect()`); en `lg+` no cambia (no era el problema reportado).
  2. **Simetría del separador**: el contenedor interior de tags pasa de `gap-6` (fijo) a `gap-0 lg:gap-6`. Por debajo de `lg`, cada `TagWithLink` ya lleva 24px de padding a cada lado de su propio `border-l`; con el gap del contenedor a 0, ese padding por sí solo produce 24px/24px simétricos (verificado: los bordes de cajas contiguas quedan exactamente pegados, `right` de una = `left` de la siguiente). En `lg+` se conserva `gap-6` porque ahí el ancho es fijo (columnas iguales), no "adaptable", y no era parte de la petición.
  3. **Buscador flex en toda anchura**: la fila cabecera (título/buscador + Menú, replicada en `index.astro`, `exposiciones.astro`, `info.astro`) pierde el `md:grid md:grid-cols-12 md:col-span-6`×2 y pasa a `flex` puro en toda anchura — título `flex-1 min-w-0`, Menú `shrink-0`, gap `gap-4 md:gap-6` (16px móvil / 24px desde `md`). Con esto el buscador ocupa TODO el espacio sobrante real (no una mitad fija) y solo se encoge/trunca el placeholder cuando el espacio disponible baja del ancho que el texto necesita — verificado visualmente a 900px: antes truncaba a "...diseñador dis" con ~430px de hueco vacío hasta Menú; después muestra el placeholder completo con gap normal.
  4. **Fecha en la pastilla de galería**: `FlyerCard.astro` gana la prop `date` y su `.flyer-label` pasa de `flex items-center` (solo título) a `flex items-center justify-between gap-2` con un segundo `<p>` en Lora (`font-serif`) para la fecha — replica el patrón título-negrita/fecha-Lora de "Event Info". Fecha formateada server-side con un nuevo helper `formatFechaDMY()` en el frontmatter de `index.astro` (espejo del ya existente en el `<script>` cliente — AAAA-MM-DD de la hoja a DD/MM/AAAA). La réplica JS `buildGalleryCard()` (regla 7 de AGENTS.md, usada por scroll infinito) se actualiza igual, reutilizando el `formatFechaDMY()`/`escHtml()` ya definidos en el script cliente. Verificado en escritorio (hover forzado) y en móvil (`.is-touch`, pastilla fija): título a la izquierda, fecha a la derecha, sin solaparse.
- **Motivo**: (a)/(b) ajuste de detalle de espaciado del Highlights; (c) el reparto 50/50 en grid no tiene relación alguna con cuánto contenido necesita cada lado — un `flex` con `flex-1`/`shrink-0` sí refleja el espacio real disponible; (d) la fecha es información contextual útil que faltaba en el hover/pastilla táctil, y Figma ya la especifica.
- **Consecuencias**: la fila de cabecera (título+buscador / Menú) ya no comparte sistema de 12 columnas con el resto de la página — no hacía falta esa alineación, así que no hay regresión visual esperada. Cualquier página nueva que replique el header debe copiar el patrón `flex` (no `grid`) de `index.astro`/`exposiciones.astro`/`info.astro`. Si en el futuro se decide igualar también el `lg+` de Highlights a 24px/24px, haría falta revisar si el `gap-6` allí cumple otro propósito (alinear con el toggle) antes de tocarlo.

## D-030 · Ancho máximo del buscador de cabecera: el menor entre "según el placeholder" y "24px del Menú"

- **Contexto**: tras D-029, el propietario matizó el comportamiento del buscador: no debe crecer sin más hasta ocupar todo el hueco disponible — su ancho máximo tiene que ser el MENOR de dos valores: (a) el ancho que ocupa el propio texto del placeholder ("Busca un evento, artista, diseñador discoteca...") o (b) el disponible hasta quedar a 24px del botón Menú, lo que se alcance antes. D-029 ya resolvía (b) (el `flex-1`/`shrink-0` con gap reserva exactamente ese hueco), pero el buscador seguía estirándose hasta llenar TODO ese hueco en pantallas anchas, mucho más ancho de lo que el texto necesita.
- **Decisión**: en `HeaderTitle.astro`, un nuevo span de medición (`#search-placeholder-shadow`, fuente normal —no la negrita del texto tecleado—, mismo tamaño/tracking que el input) mide el ancho real del placeholder. `expandedWidth` (el ancho que toma el contenedor en los estados "placeholder"/"filling"/"filled") pasa de `container.parentElement.clientWidth` a `Math.min(container.parentElement.clientWidth, placeholderTextWidth + 6 + 40)` — los 6px son el `pl-[6px]` del input y los 40px el botón `IconButton` de cerrar (`size=40`). Se recalcula igual en `remeasure()` (listener de `resize`).
- **Bug encontrado y corregido en el camino**: la primera implementación colocaba el span de medición DENTRO de `#search-state-active`, que arranca con `display:none` (solo el estado "default" es visible al cargar) — con un ancestro `display:none`, `getBoundingClientRect()` del span devolvía 0 en el momento de la medición inicial (se ejecuta una sola vez, sin `!important` ni caché de por medio: simplemente medía cuando aún no había layout), así que `expandedWidth` quedaba fijo en 46px (0 + 6 + 40) para siempre — la caja de búsqueda se veía colapsada a un punto minúsculo. Solución: mover el span fuera de `#search-state-active`, como hijo directo de `#search-box-container` (que nunca se oculta), así que siempre es medible independientemente de qué estado esté activo.
- **Motivo**: que el buscador tenga el tamaño de su propio contenido en vez de "todo el hueco que sobre", reservando ese hueco extra como aire visual en vez de un campo de texto artificialmente ancho.
- **Consecuencias**: verificado en tres anchos — 1440px (buscador se detiene en 527.7px = ancho del placeholder + 46, con mucho hueco libre hasta Menú, no ocupa todo el disponible), 700px (similar, disponible y máximo del placeholder están cerca, apenas se nota diferencia) y 460px (disponible < máximo del placeholder: el buscador se encoge y trunca con ellipsis, como antes). Si el texto del placeholder cambia, el nuevo ancho se recalcula automáticamente en la siguiente carga de página (no hay valor hardcodeado).

## D-031 · Highlights: ancho adaptable también en escritorio (`lg+`), no solo tablet/móvil

- **Contexto**: tras D-029 (simetría del separador solo por debajo de `lg`), el propietario pidió extender el mismo comportamiento de ancho adaptable a **todas** las anchuras, incluido escritorio — hasta ahora `lg+` seguía usando `lg:grid lg:grid-cols-8` con cada tag a `lg:col-span-2` (división fija en 8 columnas iguales, no adaptable al contenido), y por tanto conservaba el mismo defecto de asimetría (48px antes del separador vs 24px después) que D-029 solo había corregido por debajo de `lg`. Recordatorio explícito del propietario: los 24px a cada lado del separador deben mantenerse siempre.
- **Decisión**: el contenedor de tags (`index.astro`) pierde por completo el modo grid — pasa de `flex lg:grid lg:grid-cols-8 gap-0 lg:gap-6 ... overflow-x-auto lg:overflow-visible` a `flex gap-0 ... overflow-x-auto` sin condicionales de breakpoint. Cada `TagWithLink` pierde `lg:shrink lg:col-span-2` y se queda solo en `shrink-0 w-auto` (contenido, no columnas). Con `gap-0` uniforme, el padding propio de cada tag (24px por lado de su `border-l`) es la única fuente de separación en cualquier anchura — simetría 24px/24px garantizada siempre, no solo por debajo de `lg`.
- **Motivo**: coherencia total del componente Highlights en cualquier tamaño de pantalla, y porque el defecto de asimetría corregido en D-029 seguía presente en escritorio (no era un caso aparte, sino el mismo bug sin corregir en ese rango).
- **Consecuencias**: verificado en escritorio (1280px: los cuatro tags miden 115/119/151/149px según su contenido en vez de 157px fijos cada uno, con los mismos 24px de padding en ambos lados de cada separador) y en tablet (834px, sin regresión). El `col-span-8`/`col-span-4` de la fila EXTERIOR (bloque de tags completo vs `ToggleSelector`) no cambia — solo se tocó el reparto INTERIOR entre tags individuales.

## D-032 · Detalle de evento (móvil/tablet, `<lg`): cabecera fija y foto que encoge al hacer scroll, sin bottom sheet

- **Contexto**: pieza pendiente desde D-027/D-026 ("el detalle de evento como bottom sheet con caja de imagen colapsable"). El propietario pidió retomarla pero **explícitamente sin envolverla en un bottom sheet** esta vez: (1) la cabecera (X + título) debe quedar fija, sin hacer scroll; (2) la foto tampoco hace scroll pero cambia de tamaño (encoge) para dejar ver mejor el resto de la página, que pasa por debajo de ella (incluida la paginación) al hacer scroll, hasta que el bloque de navegación Anterior/Siguiente llega abajo del todo; (3) los tags deben quedar siempre a 32px de la caja de imagen, tenga paginación o no. Contrastado contra el frame Figma "Screen / Event Details" (369:32751, archivo `BuItQAgdEVZaTSeFjZwRNZ`), que confirmó por código: imagen con `min-h-[200px]` en el estado encogido (arrancando desde los 400px ya existentes), icono de lupa superpuesto (no implementado esta sesión, no pedido explícitamente), y el hueco de 32px como `padding-bottom` del propio bloque fijo (no como gap del grid) — de ahí que se mantenga constante haya o no paginación.
- **Decisión**:
  1. **Cabecera fija**: X + título envueltos en un único contenedor `sticky top-0` (con fondo sólido y técnica full-bleed a base de márgenes negativos, replicada de la técnica ya usada en la foto) que se disuelve vía `lg:contents` en escritorio (sus hijos vuelven a renderizar sueltos, exactamente como antes).
  2. **Foto fija y encogible, calculada a mano en JS, no con `position: sticky` nativo**: se intentó primero con `sticky` nativo apoyándose en una reestructuración del grid a `display: contents` por debajo de `lg` (para que el elemento compartiera bloque contenedor con tags/info/nav y así liberarse solo al final) — **descartado tras verificarlo**: un elemento sticky más bajo que el viewport (el nuestro, ~330-430px, frente a viewports típicos de 600-900px) **nunca** llega a liberarse de forma nativa, sin importar cuánto contenido haya después — la condición real es `altura del sticky ≥ altura del viewport`, que casi nunca se cumple aquí. Solución final: `position: fixed` gestionado enteramente por JS (`updateStickyImage()` en `event/[id].astro`, `updateOverlayStickyImage()` en `index.astro`), con un "centinela" (`#detail-image-sentinel`) de altura sincronizada a la caja fija en cada scroll (para que tags/info/nav reserven exactamente el hueco correcto sin solaparse ni dejar un hueco de más) y una fórmula de liberación anclada a la fila de tags, no al bloque contenedor genérico: `top = min(headerBottom, tagsTop_actual - alturaBloque)`. Esto garantiza matemáticamente cero solape con tags (y por tanto con info/nav, que se mueven en bloque con tags una vez liberada) en cualquier longitud de página — verificado con un barrido completo de scroll en eventos cortos (sin descripción) y largos, con y sin paginación: el solape pasa de -32px (reposo) a 0px exacto y se mantidne así hasta el final, nunca positivo.
  3. **32px constante a los tags**: viven como `pb-8` del propio bloque fijo (después de los dots si los hay), no como gap del grid — así el hueco es el mismo tenga o no paginación, replicando la estructura de Figma.
  4. **Reordenación del grid**: en vez de disolver el grid con `contents` (necesario solo para la estrategia de sticky nativo descartada), se mantiene como grid real en todos los breakpoints; `order-1`/`order-2 lg:order-1`/`order-3` reordenan visualmente la imagen-tags-info en móvil sin tocar el DOM order en desktop (`lg:order-2`, `lg:order-1`, `order-3`).
- **Bug encontrado y corregido — overlay específicamente**: en `index.astro`, `#event-details-overlay` es a la vez el contenedor con scroll propio (`overflow-y-auto`) y el que llevaba el `padding-top`; el `sticky top:0` de la cabecera calculaba entonces contra el borde con padding, ANCLANDO la cabecera a ~41px del techo real en vez de a 0. Solución: el `pt-[calc(10vh-40px)] md:pt-[10vh]` se trasladó al wrapper interior (`#overlay-content-wrapper`), dejando el contenedor con scroll sin padding propio.
- **Bug encontrado y corregido — bloque contenedor accidental para `position:fixed` en el overlay**: `#overlay-details-content` (el wrapper que Astro usa para la animación de entrada/salida del overlay) tiene `transition: transform` — y Chrome calcula un `matrix(1,0,0,1,0,0)` para CUALQUIER elemento con `transform` en su lista de transición, incluso en reposo sin transform aplicado nunca; por especificación eso cuenta como "transform distinto de `none`" y convierte ese elemento en el bloque contenedor de sus descendientes `position:fixed` — la imagen fija se posicionaba entonces relativa a ESE wrapper (que a su vez está desplazado respecto al viewport real) en vez de al viewport, doblando efectivamente el offset. Solución: `updateOverlayStickyImage()` mide el `getBoundingClientRect()` de `#overlay-details-content` en cada tick y resta ese offset al `top`/`left` antes de aplicarlos (con `width` explícito en vez de `left:0;right:0`, ya que el ancho del bloque contenedor accidental no coincide necesariamente con el del viewport).
- **Motivo**: el propietario quería ver mejor el resto de la ficha sin perder de vista la foto mientras se hace scroll, pero sin el patrón visual de bottom sheet (pliegue, tirador, dim de fondo) ya usado en el mapa.
- **Consecuencias**: verificado exhaustivamente — `event/[id].astro` y el overlay SPA en `index.astro`, en 375px/768px/1280px, con eventos de una sola imagen y con paginación, cortos (sin descripción) y largos. Escritorio (`lg+`) no cambia en absoluto. Pendiente explícito, no pedido esta sesión: el icono de lupa superpuesto sobre la foto que muestra el frame de Figma (afordance adicional para abrir el visor a pantalla completa una vez la foto está encogida) — la foto sigue abriendo el visor al pulsarla entera, como antes.

## D-033 · Corrección de D-032: la foto no debe reescalarse (debe recortarse), y cuatro bugs reales encontrados en el repaso del propietario

- **Contexto**: el propietario probó D-032 en un dispositivo real (capturas en modo oscuro) y reportó seis problemas: (1) la foto a tamaño completo aparecía rota nada más entrar — "por detrás de la cabecera y viéndose por encima de esta"; (2) al hacer scroll, la FOTO se encogía (perdiendo tamaño/ratio) en vez de quedarse fija y recortarse por abajo, pegada siempre arriba; (3) al llegar al final del scroll, la caja de la imagen "temblaba" y empezaba a tapar contenido demasiado pronto, como si sobrase margen; (4) la caja de la imagen debía llegar SIEMPRE a sangre a ambos bordes laterales; (5) la cabecera debía ser totalmente estática, "sin amago posible" de movimiento; (6) el contenido no debía hacer más scroll del necesario — el bloque de navegación debía quedar a unos 40px del borde inferior, no más.
- **Decisión** (aplicada en paralelo a `event/[id].astro` y al overlay de `index.astro`):
  1. **Recorte en vez de reescalado (D-032 corregida)**: se separa la "ventana de recorte" (nuevo `#detail-image-crop` / `#overlay-image-crop`, `overflow-hidden`, con la altura que antes encogía el propio botón del carrusel) del contenido real (`#carousel-main-container` / `#overlay-carousel-main`), que ahora se queda SIEMPRE a `h-[400px]` fijo y sin tocar por JS. Al ser el único hijo de la ventana de recorte (flujo normal, sin position especial), queda pegado a su borde superior por construcción — encoger la ventana simplemente revela menos foto desde abajo, a tamaño y ratio reales, en vez de reescalarla. Esto TAMBIÉN arregla los dots/paginación (ya no se reescalan).
  2. **Imagen rota al entrar (bug real, distinto de D-032)**: `updateStickyImage()`/`updateOverlayStickyImage()` medían y fijaban la posición ANTES de que la animación de entrada del overlay (`transform`/`opacity`, 0.55s) hubiera asentado — un `getBoundingClientRect()` a mitad de una transición CSS da la respuesta del fotograma actual, no la final. Solución: por debajo del punto de enganche (`scrolledPast <= 0`, es decir, en reposo/justo al abrir) el elemento se queda en `position: static` normal en vez de forzar `fixed` — visualmente es lo mismo (aparece justo debajo de la cabecera) pero evita depender de ninguna medición sensible a transiciones en marcha.
  3. **Temblor al final del scroll (bug real, no reportado en D-032)**: al reducir el recorte se reduce 1:1 la altura reservada (`#detail-image-sentinel`), que reduce 1:1 la altura del documento — una pendiente exactamente -1 entre scroll y altura de página es el caso límite de inestabilidad marginal: si el punto de reposo natural cae DENTRO del rango activo de encogimiento (en vez de después de que la foto ya haya llegado a su mínimo de 200px), "seguir haciendo scroll" y "la página se hace más corta" se persiguen mutuamente sin converger nunca — confirmado empíricamente forzando `scrollTo()` repetido: la posición de scroll oscilaba sin parar entre dos valores cercanos. Solución: reinstaurado un separador de "pista de scroll" (`#detail-scroll-runway` / `#overlay-scroll-runway`, ya descartado una vez en D-032 por otro motivo) que garantiza, mediante una sonda que fuerza temporalmente el estado "totalmente encogido" para medir y luego restaura el real, que sobren siempre ≥260px (200 del rango de encogimiento + 60 de margen) de scroll DESPUÉS del punto de enganche — solo se añade el faltante; eventos con contenido suficiente no llevan relleno.
  4. **A sangre en ambos bordes, siempre**: el modo estático (reposo) recupera la técnica de márgenes negativos (`-mx-6 w-[calc(100%+48px)] sm:-mx-12 ...`) que D-032 había retirado sin sustituto; el modo `fixed` la neutraliza explícitamente (`margin:0`) para no duplicarse con el `left`/`width` puestos por JS. Además se encontró un tercer bug de sobre-restricción CSS: con `left`, `right` Y `width` puestos a la vez (el `width` de la clase de Tailwind seguía en la cascada), la especificación CSS para cajas `fixed` ignora silenciosamente `right` — así que el `width` del `calc()` ganaba y la caja sobresalía 48px por la derecha. Arreglado usando `left` + `width` explícito en vez de `left`+`right` en ambos ficheros.
  5. **Bloque contenedor fantasma, más grave de lo que decía D-032**: el hallazgo de D-032 (que `#overlay-details-content` actúa de bloque contenedor de elementos `fixed` por tener `transition: transform`) resultó ser **intermitente**, no permanente — el `transform` computado vuelve a la palabra clave literal `none` una vez la transición de entrada lleva un rato asentada, momento en el que deja de comportarse como bloque contenedor. La compensación fija de D-032 (restar `getBoundingClientRect()` de ese wrapper) solo era correcta mientras el quirk estaba activo; una vez se asienta, la MISMA compensación desplaza la caja 24px de más. Solución robusta: en vez de predecir si el quirk está activo, `updateOverlayStickyImage()` aplica una posición provisional asumiendo que NO lo está, mide dónde aterrizó realmente, y corrige por la diferencia observada — funciona sin necesidad de saber cuál de los dos casos aplica, y se auto-corrige si ese comportamiento intermitente de Chrome cambia en el futuro.
  6. **~40px hasta el borde inferior**: `pb-[108px]` (heredado, sin relación con esta función) pasa a `pb-[40px] lg:pb-[108px]` en ambos ficheros — sin cambios en escritorio. Cuando la pista de scroll del punto 3 necesita añadir relleno (eventos escasos de contenido), el hueco final resulta mayor que 40px — la prioridad es evitar el temblor, no clavar el píxel exacto en ese caso límite.
- **Motivo**: fidelidad real a la petición original del propietario (foto fija de verdad, no una versión reescalada) y estabilidad — un elemento visualmente "temblando" es un defecto mucho más grave que cualquier imprecisión de unos pocos píxeles.
- **Consecuencias**: verificado con barridos de scroll programáticos (no solo capturas) confirmando ausencia de oscilación, `left`/`right` a sangre en todo el rango, y `btnHeight` constante en 400px (recorte, no reescalado) — en ambos ficheros, en corto/largo y con/sin paginación. Este patrón de "sonda que fuerza el estado extremo, mide, y restaura" (punto 3) y "aplica, mide, corrige" (punto 5) puede reutilizarse si aparecen más casos de layout dependiente de scroll con retroalimentación.

## D-034 · Corrección de D-033: la cabecera debe ser `position: fixed` desde el primer fotograma, no `sticky`

- **Contexto**: el propietario, con una captura de DevTools señalando `#overlay-sticky-header`, reportó que la cabecera "sigue haciendo scroll y teniendo hueco por arriba" en tablet y móvil, insistiendo en que "TIENE QUE ESTAR FIJA y no hacer scroll en ningún momento". `position: sticky` (usado desde D-032) técnicamente SÍ acaba fijándose en `top:0` — verificado que a partir de ~90px de scroll se queda clavada — pero antes de eso permanece en su posición natural (con el padding superior de página, `pt-[10vh]`-ish) y se mueve CON el scroll durante esa ventana inicial, exactamente la "hueco por arriba + sigue scrolleando" que señalaba la captura. El propietario no acepta esa ventana de transición en absoluto.
- **Decisión**: la cabecera pasa de `sticky top-0` a `fixed top-0 left-0 right-0` incondicional por debajo de `lg`, en ambos ficheros. Al quedar fuera del flujo normal desde el primer fotograma (no solo tras engancharse), hace falta reservarle el hueco a mano: nuevo `#detail-header-spacer`/`#overlay-header-spacer` justo después de ella, con altura sincronizada a la suya en cada tick (prácticamente constante, solo cambia si el título ocupa una línea más o menos). Como consecuencia directa, el `pt-[calc(10vh-40px)] md:pt-[10vh]` del contenedor de página (heredado de antes de D-032, pensado para un header que SÍ empezaba en flujo normal) se convertía en un hueco redundante entre el final visual de la cabecera fija y el spacer — se detectó midiendo directamente (`imageSentinelTop` aparecía a 199.8px cuando `headerBottom` era 120px) — así que pasa a `pt-0 lg:pt-[10vh]`: por debajo de `lg` el propio spacer basta, en escritorio no cambia nada (la cabecera vuelve a flujo normal vía `lg:static`, sin relación con esta página el resto de la web).
- **Motivo**: instrucción explícita y sin matices del propietario — cero movimiento de la cabecera, en cualquier momento del scroll, sin excepción.
- **Consecuencias**: verificado con barrido de scroll completo (`headerTop === 0` en el 100% de las muestras, desde `scrollY/scrollTop = 0`) en ambos ficheros; sin gap entre cabecera e imagen en reposo (`imageSentinelTop === headerBottom` exacto); recorte/sangre/estabilidad de D-033 siguen intactos (recomprobado con el mismo barrido, `finalBtnHeight` 400px constante, sin oscilación). Escritorio sin cambios.

## D-035 · Corrección de D-033: los puntos de paginación del overlay ocupaban espacio aunque estuvieran vacíos

- **Contexto**: el propietario, con una captura de DevTools de un evento de una sola imagen ("Teckel I") inspeccionando `#overlay-carousel-dots`, señaló hueco de más entre la caja de imagen y la fila FECHA, pidiendo revisar si la paginación se mostraba sin tener más de una foto y eliminar cualquier padding/margin inferior sobrante de la caja de imagen si lo hubiera.
- **Decisión**: en `event/[id].astro` el bloque de dots ya es condicional del lado del servidor (`{imageUrls.length > 1 && (...)}`) — para eventos de una sola imagen el `<div>` directamente no existe en el DOM, así que ahí nunca hubo bug. El overlay de `index.astro`, en cambio, reutiliza un único `#overlay-carousel-dots` estático para todos los eventos (se vacía y se rellena en cada render, `renderOverlayEvent()`), así que su propio `py-6` (48px) seguía reservando altura incluso sin puntos dentro. Añadida una línea en `renderOverlayEvent()`, justo tras vaciar el contenedor: `dotsContainer.classList.toggle('hidden', imageUrls.length <= 1);` — oculta el contenedor entero (no solo su contenido) cuando no hay paginación que mostrar.
- **Motivo**: la diferencia estructural entre las dos implementaciones (nodo condicional vs. nodo reutilizado) es justo el motivo por el que D-032 (regla 3, "32px constante a los tags") solo necesitaba `pb-8` como mecanismo — un contenedor vacío con padding propio es una fuente de hueco que ese mecanismo no cubre por sí solo.
- **Consecuencias**: verificado en ambos casos vía `getBoundingClientRect()` — MEL-00022 (una imagen): `dotsHidden:true, dotsHeight:0`, hueco caja↔tags de 32px exacto. MEL-00005 (varias imágenes, control de regresión): `dotsHidden:false, dotsHeight:80, dotsChildren:2`, hueco también 32px exacto — sin cambios para el caso con paginación. Confirmado además que `event/[id].astro` no tenía ni necesitaba el fix (`hasDots:false` en el DOM para eventos de una sola imagen) y que no existe ningún otro padding/margin sobrante en la caja de imagen más allá del `pb-8` intencionado (32px verificados también en reposo en la página standalone).
- **Corregido por D-036**: el `pb-8` "intencionado" resultó ser en realidad redundante con el `gap-8` del propio grid (doblaba el hueco visual foto→tags a 64px) — ver D-036.

## D-036 · Corrección de D-033/D-035: la caja de imagen queda clavada bajo la cabecera (nunca se desliza tras ella) y pierde su padding inferior redundante

- **Contexto**: el propietario reportó dos cosas: (1) la caja de la imagen parecía estar haciendo scroll por detrás de la cabecera, cuando solo debería hacerse más pequeña (hasta un mínimo de 200px de alto, sin contar la paginación); (2) inspeccionando `#overlay-image-sticky` en DevTools, seguía viendo un margin/padding inferior (~48px según su lectura) que pidió eliminar. Ambas confirmadas midiendo: (1) con la fórmula de liberación de D-032 (`top = min(headerBottom, tagsTop - alturaBloque)`), la caja empezaba a deslizarse hacia arriba tras la cabecera DESDE EL PRIMER PÍXEL de scroll (su borde superior pasaba de 120 a -118 en el barrido) — el tope de tags activaba inmediatamente porque el centinela encogía 1:1 con el recorte; (2) el `pb-8` (32px) de la caja era **redundante** con el `gap-8` (32px) del propio grid contenedor, sumando 64px de hueco visual entre la foto y los tags — el "hueco de más" que el propietario venía señalando desde D-035.
- **Decisión** (aplicada en paralelo a `event/[id].astro` y al overlay de `index.astro`):
  1. **Anclaje incondicional**: `top = headerBottom`, siempre — se elimina la fórmula de liberación anclada a tags de D-032. La caja jamás se mueve una vez fijada; solo cambia la altura de su ventana de recorte (400→200px).
  2. **Centinela CONSTANTE a tamaño completo**: el centinela deja de sincronizarse con la altura encogida actual y pasa a reservar siempre la huella a tamaño completo de la caja (crop a 400px + dots si los hay), calculada midiendo la altura actual y sumando lo que el recorte lleve encogido (exacto con y sin dots, sin hardcodear su altura). Consecuencias en cascada: (a) durante la fase de encogimiento, el contenido emerge manteniendo exactamente 32px (el `gap-8` del grid) bajo el borde inferior retrocedente de la caja; (b) agotado el mínimo de 200px, el contenido sigue subiendo y pasa por debajo de la caja (opaca, z-20) — el comportamiento pedido originalmente ("el resto pasa por debajo de la foto"); (c) la altura del documento deja de depender del scroll por completo, así que el bucle de retroalimentación de D-033 (temblor) desaparece estructuralmente y la "sonda" de `ensureScrollRunway()` se simplifica a una medición directa sin mutaciones.
  3. **Sin padding/margin inferior propio**: eliminado el `pb-8` de la caja en ambos ficheros (el hueco de 32px lo pone el `gap-8` del grid, que aplica igual con o sin paginación al estar los dots DENTRO de la caja). Además de eliminar el hueco doblado, era necesario para el nuevo modelo: un padding opaco habría tapado 32px de más del contenido al pasar este por debajo de la caja fijada.
  4. **Bug de "no se puede hacer scroll" encontrado y corregido por el camino**: al fijar la caja, el código medía su rect (forzando layout) DESPUÉS de sacarla del flujo pero ANTES de dar altura al centinela — en esa ventana el contenido del overlay era momentáneamente más corto que el viewport y el navegador recolocaba `scrollTop` a 0 en mitad del tick (el overlay parecía no poder hacer scroll en absoluto). Solución: calcular y fijar el centinela ANTES de conmutar la caja a `fixed` (posible ahora que el centinela es constante y se puede derivar midiendo el estado actual, sea cual sea).
  5. **`ensureOverlayScrollRunway()` medía el documento equivocado**: usaba `document.documentElement.scrollHeight`, que describe la home de detrás, no el overlay (que scrollea en su propio elemento `overflow-y-auto`). Corregido a `overlay.scrollHeight - overlay.clientHeight`.
- **Motivo**: instrucción directa del propietario — la caja solo debe encogerse, nunca desplazarse tras la cabecera, y sin hueco inferior sobrante.
- **Consecuencias**: verificado con barridos de scroll en ambos ficheros a 371px (una imagen y con paginación): `stickyTop === headerBottom` (120) en el 100% de las muestras, recorte 400→200 exacto 1:1, hueco a tags constante en 32px durante el encogimiento y negativo después (contenido pasando por debajo), sangre `left:0`/`right:viewport` en todo el rango, sin oscilación ni reseteos de scroll, y en reposo `padding-bottom: 0px; margin-bottom: 0px` con 32px exactos a tags. El patrón "sonda que fuerza el estado extremo" de D-033 ya no se usa aquí (la altura es constante), pero sigue documentado por si reaparece un layout con retroalimentación.

## D-037 · La foto se recorta centrada (por arriba y por abajo a partes iguales), no anclada al borde superior

- **Contexto**: sobre D-036, el propietario pidió que la imagen permanezca **centrada** dentro de su caja contenedora (`#overlay-carousel-main` / `#carousel-main-container`) mientras se hace pequeña al hacer scroll, en vez de quedarse pegada arriba (D-033 la anclaba al borde superior de la ventana de recorte, revelando cada vez menos foto solo desde abajo).
- **Decisión**: la ventana de recorte (`#overlay-image-crop` / `#detail-image-crop`) pasa de flujo normal a `flex flex-col justify-center`, y el botón de la foto gana `shrink-0` — imprescindible: en un flex de columna, el `flex-shrink` por defecto encogería la altura de 400px del botón para caber en la ventana (reescalándolo, justo lo prohibido por D-033) en vez de dejarlo desbordar y recortarse. Con el botón centrado y más alto que la ventana, `overflow-hidden` recorta el exceso simétricamente por ambos extremos.
- **Motivo**: petición directa del propietario; el centrado mantiene visible la franja central del flyer (normalmente la más significativa) en vez de solo su parte superior.
- **Consecuencias**: verificado en ambos ficheros a 371px: botón constante a 400px con desbordamiento simétrico exacto (recorte a 300px → 50px por cada lado; a 200px → 100px por cada lado). En escritorio (`lg`, verificado a 1280px) es un no-op: la ventana mide los mismos 400px que el botón (deltas 0/0).

## D-038 · Detalle móvil: caja de imagen a 360px máx, tap = re-expandir (no lightbox), y navegación siempre anclada a 40px del borde inferior

- **Contexto**: tres peticiones del propietario sobre el detalle de evento por debajo de `lg`: (1) bajar 40px la altura máxima del contenedor de la imagen; (2) eliminar la apertura del lightbox al pulsar la foto en móvil — el tap debe pasar a re-expandir la caja si está comprimida por el scroll; (3) el bloque Anterior/Siguiente debe quedar siempre pegado a la parte inferior de la pantalla, limitando el scroll cuando llega a su posición, con ~40px de resguardo para no quedar bajo la UI de navegación del teléfono.
- **Decisión** (aplicada en paralelo a `event/[id].astro` y al overlay de `index.astro`):
  1. **Máximo del recorte 400→360px** (`IMAGE_MAX_H`/`OVERLAY_IMAGE_MAX_H`): la foto sigue midiendo 400px y centrada (D-037), así que en reposo ya se recortan 20px por cada extremo. Mínimo sigue en 200px (rango de encogimiento 160px). Escritorio intacto (la ventana conserva `lg:h-[400px]`).
  2. **Tap en la foto por debajo de `lg`**: ya no abre el lightbox; si `scrollTop > 0`, anima el scroll de vuelta a 0 (lo que re-expande el recorte 1:1); si ya está expandida, no hace nada. En `lg+` el click sigue abriendo el lightbox como siempre. La animación es un bucle temporizado propio con easing cúbico (350ms) en lugar de `scrollTo({behavior:'smooth'})` (que se ignora silenciosamente en este contenedor con overflow en algunos entornos) o `requestAnimationFrame` (que en el sandbox de verificación no llega a ejecutarse nunca — 0 ticks medidos — como ya advierte AGENTS.md); el easing va por tiempo real, así que un temporizador lento solo baja el frame rate, nunca alarga la duración.
  3. **Navegación anclada abajo**: el separador de pista de scroll se mueve a ANTES del bloque de navegación en el DOM y cambia de fórmula — ya no garantiza un mínimo de scroll para completar el encogimiento, sino que se dimensiona para que el borde inferior del nav quede exactamente a 40px del borde inferior de la pantalla (el `pb-[40px]` ya existente del contenedor es el resguardo en el final natural del scroll; la nueva constante `NAV_BOTTOM_GUARD = 40` cubre el caso de contenido corto, donde el runway empuja el nav hasta ese punto de reposo sin scroll posible). Al estar el runway antes del nav y no haber nada tras él salvo el padding de 40px, es imposible por construcción hacer scroll más allá del nav. Consecuencia asumida y pedida: en eventos de contenido corto la foto no llega a encogerse (no hay scroll) — la prioridad explícita es que el nav limite el scroll.
- **Motivo**: instrucciones directas del propietario; en táctil el lightbox era redundante (el tap útil es recuperar la foto) y el nav debe funcionar como cierre visual fijo de la ficha.
- **Consecuencias**: verificado en ambos ficheros a 371×798 — recorte en reposo 360px (foto 400 centrada), tap comprimida → scroll animado a 0 y recorte de vuelta a 360, tap en reposo → nada, lightbox jamás se abre en móvil; a scroll máximo `navGapToBottom = 40px` exacto; y a 371×1300 (contenido corto) el runway (328px) deja el nav a 40px del borde con `maxScroll = 0`. En escritorio sin cambios (rama de click condicionada a `innerWidth < 1024`).
- **Corregido por D-039**: el punto 1 (foto a 400px recortada a 360 en reposo) y el umbral del punto 2 (1024px) — ver D-039.

## D-039 · Corrección de D-038: foto SIN recorte en reposo, lightbox desde 480px, y ritmo vertical uniforme de 32px en la ficha móvil

- **Contexto**: el propietario corrigió tres cosas sobre D-038 (con captura anotada con rayitas rojas en cada hueco): (1) la foto en origen debe adaptar su alto/ancho máximos a la caja de 360px — nada de un botón de 400px recortado 20px por cada lado en reposo; "no quiero recortes en el origen, la imagen es protagonista absoluta hasta que el usuario haga otra acción"; (2) el lightbox debe seguir funcionando igual que en desktop a partir de 480px de ancho de pantalla (el tap-para-expandir queda solo por debajo de 480); (3) los espaciados verticales de la ficha eran irregulares ("me dan muchísimo TOC") — medidos: 24/56/24/32/24/40/40/48/24px entre bloques consecutivos.
- **Decisión** (aplicada en paralelo a `event/[id].astro` y al overlay de `index.astro`):
  1. **Botón de la foto a `h-[360px] lg:h-[400px]`**: por debajo de `lg` el botón mide lo mismo que la ventana de recorte en reposo, con la imagen `object-contain` dentro — el flyer entero visible, cero recorte en origen. El recorte simétrico centrado (D-037) solo empieza cuando el scroll comprime la ventana por debajo de 360px.
  2. **Umbral del lightbox: `innerWidth < 480`** (antes 1024) en ambos handlers de click. De 480px en adelante el click abre el lightbox exactamente como en desktop; solo por debajo de 480 el tap re-expande la caja comprimida.
  3. **Ritmo vertical único de 32px** entre todos los bloques de la ficha por debajo de `lg` (el mismo valor que el `gap-8` del grid y la especificación imagen↔tags de D-032): dots `py-6` → `pt-8 pb-0` (32 a la foto; el gap del grid pone los otros 32 hasta FECHA), fila de tags `pb-6` → `pb-8` (32 hasta su divisor), columna info y sus contenedores anidados `gap-10`/`gap-6` → `gap-8 lg:gap-10`/`gap-8 lg:gap-6`, y nav `mt-12 pt-6` → `mt-8 pt-8`. Escritorio conserva todos sus valores originales vía variantes `lg:`.
- **Motivo**: la imagen es la protagonista absoluta del archivo (principio de producto, docs/product.md) — un recorte por defecto la traicionaba; y el ritmo uniforme elimina el ruido visual de nueve espaciados distintos.
- **Consecuencias**: verificado en ambos ficheros a 371px con evento completo (FIV VI, MEL-00037: paginación + descripción + artistas): botón = ventana = 360px en reposo (flyer completo visible, comprobado también en captura), y TODOS los huecos consecutivos (foto→dots→FECHA→divisor→descripción→divisor→ARTISTAS→Me presta→divisor→ANTERIOR) exactamente a 32px. Tap a 371px re-expande sin abrir lightbox; click a 600px abre y cierra el lightbox con normalidad. Escritorio intacto.

## D-040 · Detalle de evento: grid de 12 columnas fluido en escritorio, navegación siempre visible (sticky bottom), y ajustes de dots/nav en móvil

- **Contexto**: cuatro ajustes del propietario. Móvil: (1) la paginación tenía demasiado padding por arriba (32px hasta la foto) y ninguno por abajo (los tags pasaban rozándola al deslizarse bajo la caja fijada) — "quita 16 de arriba y ponlos abajo"; (2) +8px entre Me presta y el bloque de navegación. Escritorio: (3) el contenido no era adaptable hasta el breakpoint de tablet — el grid usaba columnas FIJAS `lg:grid-cols-[184px_496px_496px]` (= 1224px mínimos + padding de página), generando scroll horizontal en viewports entre 1024 y ~1320px, en vez del sistema de 12 columnas del resto del sitio; (4) la navegación Anterior/Siguiente quedaba oculta bajo el pliegue en pantallas poco altas — debe quedar siempre visible por encima del límite inferior.
- **Decisión** (aplicada en paralelo a `event/[id].astro` y al overlay de `index.astro`):
  1. **Dots**: `pt-8 pb-0` → `pt-4 pb-4` por debajo de `lg` (16px a la foto, 16px de aire dentro de la caja fijada antes de que el contenido pase por debajo). Escritorio conserva `py-6`.
  2. **Me presta→nav**: `mt-8` → `mt-10` (32→40px) por debajo de `lg`.
  3. **Grid fluido de 12 columnas**: los dos grids (contenido y navegación) pasan de `lg:grid-cols-[184px_496px_496px]` a `lg:grid-cols-12` con spans `lg:col-span-2` (tags) y `lg:col-span-5` (imagen e info) — a los 1224px del contenedor reproduce exactamente los 184/496/496 de Figma (2/5/5 columnas del sistema de 12 con gap-6), y por debajo escala proporcionalmente sin desbordar. Verificado a 1100px: columnas 147/404/404 y cero overflow horizontal en página y overlay.
  4. **Nav siempre visible en escritorio**: `lg:sticky lg:bottom-[40px] lg:z-10 lg:bg-mel-bg-primary lg:py-6` — cuando su posición natural cae bajo el pliegue, se ancla visible cerca del borde inferior (el fondo opaco + py-6 lo separan del contenido que scrollea por detrás); en pantallas altas la posición natural manda y el sticky no interviene. **Bug de cascada encontrado**: el `lg:pt-0` heredado anulaba el `padding-top` del nuevo `lg:py-6` (Tailwind ordena las utilidades `pt-*` después de las `py-*`, así que a igual especificidad gana `pt-0`) — eliminado `lg:pt-0`, que ya no hacía falta.
- **Motivo**: coherencia con el sistema de columnas del resto del sitio (D-026 ya lo usa para el toggle/panel del mapa) y accesibilidad permanente de la navegación entre eventos.
- **Consecuencias**: verificado — móvil 371px: foto→dots 16px, dots pb 16px, Me presta→nav 40px, nav `static` (el sticky es solo `lg`); escritorio: sin overflow horizontal a 1100px en ambos ficheros, y a 1280×560 el nav queda visible por encima del borde con su caja opaca enmascarando el contenido que pasa por detrás (colisión inicial con la lista de artistas corregida con el fondo + py-6). Nota: el ritmo uniforme de 32px de D-039 queda conscientemente alterado en dos puntos por instrucción directa (foto→dots 16px, dots→FECHA 48px en reposo, Me presta→nav 40px). Las capturas de escritorio del entorno de verificación salían "lavadas" — comprobado que es artefacto del captor (opacidad computada 1, sin ancestros translúcidos), no un defecto real.
- **Corregido por D-041**: el punto de dots (16/0) volvió a 24px arriba y abajo — ver D-041.

## D-041 · Paginación a 24px simétricos, y estandarización de todos los "TagWithLink" del sitio (altura 48px, sin espacio fantasma, full-bleed)

- **Contexto**: dos correcciones del propietario. (1) Sobre D-040: los dots quedaban "raros" con `pt-4 pb-4` (16/16, no seguía el ritmo de 32/24 del resto) — pide al menos 24px arriba y abajo (`py-6`), confirmando que sí quería conservar el espacio bajo el botón que había recordado eliminar en la ronda anterior. (2) Con una captura anotada: todos los bloques con la forma de "TagWithLink" (el componente Astro, su réplica JS del overlay `makeTagHtml()`, la fila de Highlights de la home, y el panel lateral del mapa) debían tener las mismas propiedades — algunos mostraban más espacio a la derecha que otros, debían medir siempre 48px de alto (tags y divisores por igual), y las filas con scroll horizontal debían cortarse a sangre contra el borde de pantalla para indicar visualmente que hay más contenido.
- **Decisión**:
  1. **Dots → `py-6` en todos los breakpoints** (antes `pt-4 pb-4` por debajo de `lg`, `py-6` en `lg+`): unifica el valor en las dos páginas, sin condicional de breakpoint.
  2. **Causa raíz del espacio fantasma — `Link.astro`**: el chevron de hover (flecha que aparece al pasar el ratón) vivía EN FLUJO (`shrink-0` normal, solo `opacity-0` en reposo) — reservaba ~16px de ancho a la derecha del valor incluso invisible, así que cualquier tag CON enlace medía 16px más que uno sin enlace con el mismo texto, aunque ambos usasen el mismo componente. Solución: el chevron pasa a `position: absolute` (`left-full`/`right-full` según alineación), fuera del flujo — dedica 0px de ancho en reposo y solo se desplaza visualmente al hacer hover, sin empujar nada. Aplicado en el componente `Link.astro` (usado por `TagWithLink.astro`) y replicado a mano en `makeTagHtml()` del overlay (`index.astro`), que construye el mismo marcado en JS.
  3. **Altura uniforme de 48px — `TagWithLink.astro`**: el modo "con borde" (`hideBorder=false`, usado en Highlights y en el panel del mapa vía `hideBorder=true`... revisado: highlights SÍ usa el modo con borde) tenía `py-2` (padding vertical 8px arriba y abajo), sumando 16px a la altura base de 40px (16 etiqueta + 8 gap + 24 valor) → 56px, distinto de los 48px del modo `hideBorder` usado en el detalle de evento. Quitado el `py-2` en ambos modos — ahora SIEMPRE 48px, con o sin borde, y por tanto los divisores `border-l` (que heredan la altura del propio tag) también miden 48px siempre. La réplica JS `makeTagHtml()` pasa de `gap-1` a `gap-2` (4px→8px) para igualar la separación etiqueta↔valor real del componente Astro (antes ya estaba a 48px por no llevar padding vertical, pero con el gap equivocado el reparto interno no coincidía).
  4. **Full-bleed en las cuatro filas con scroll horizontal**: la fila de tags del detalle de evento (`event-tags-row`, ambos ficheros), la fila de Highlights de la home, y la fila de tags del panel del mapa (`side-panel-tags-container`) ganan el patrón de márgenes negativos ya usado en el resto del sitio (`-mx-6 w-[calc(100%+48px)] ... lg:mx-0 lg:w-full` para las dos primeras; `-mx-[24px] w-[calc(100%+48px)] px-[24px]` para el panel, que vive dentro de su propio padding de 24px) — así el contenido se recorta contra el borde REAL de la pantalla/panel en vez del borde de su columna, dejando ver a propósito una palabra cortada como pista visual de que hay más contenido deslizando. Los divisores `h-8` (32px) del panel del mapa pasan a `h-12` (48px) para igualar la nueva altura estándar de sus tags (`hideBorder`, sin `border-l` propio).
- **Motivo**: un solo componente (y sus réplicas fieles) para todas las filas de tags del sitio, con cero diferencias de alto/ancho fantasma entre variantes con y sin enlace; y la convención ya establecida en el resto del proyecto (slider, lista móvil) de cortar contenido a sangre como affordance de scroll, aplicada aquí también.
- **Consecuencias**: verificado — overlay y standalone del detalle (371px): 5 tags a 48px de alto exacto, sin espacio reservado a la derecha en tags con enlace (`Lugar`/`Localidad`/`Diseño`, valor > etiqueta → ancho de caja = ancho del valor, gap 0px), y el caso legítimo donde la ETIQUETA es más ancha que el valor (`Organiza`: "ORGANIZA" 74px vs "FIV" 26px) deja hueco a la derecha por diseño — no es el bug, es que la caja mide `max(etiqueta, valor)` de forma consistente en todos los tags. Fila del detalle a sangre completa (0→371px, confirmado por captura con el "2" de la fecha cortado en el borde). Highlights a 834px no desborda (sin cambio visible, comportamiento correcto); a 500px desborda y sangra a los bordes reales (0→500px). Panel del mapa (medido en su marcado SSR sin depender del renderizado de mapas, no soportado en el sandbox de verificación): 3 tags + 2 divisores, todos a 48px, contenedor a sangre (0→375px). Escritorio (1280px) sin residuos de margen/padding negativo y sin overflow horizontal en ningún caso.
- **Corregido por D-042**: el divisor inferior de `event-tags-row` heredó el sangrado horizontal de D-041 y quedaba también a sangre (0→371px) cuando debía respetar el margen de página como cualquier otro divisor — ver D-042.

## D-042 · Corrección de D-041: el divisor de la fila de tags no debe sangrar; reset de la caja de imagen al navegar; prueba V2 del overlay (tags fijas bajo el título)

- **Contexto**: tres peticiones del propietario. (1) Con una captura señalando la línea bajo FECHA/LUGAR/LOCALIDAD: el divisor inferior de `event-tags-row` (añadido en D-032, heredó el sangrado horizontal en D-041) llegaba a los bordes reales de pantalla, cuando debía respetar la misma distancia de margen que el resto de divisores de la página. (2) El tamaño de la caja de imagen (y por tanto el scroll) debía resetearse a su máximo original al navegar de un evento a otro. (3) Una prueba V2 **solo en el overlay** (`overlay-tags-sidebar`, nombrado explícitamente por el propietario): las tags pasan arriba, fijas debajo del título, sin el divisor inferior, manteniendo 32px hasta la caja de imagen — con una captura de referencia (X, título, fila FECHA/LUGAR/LOCALIDAD cortada a sangre, gran hueco, imagen a sangre completa, dots, descripción...). El propietario aclaró explícitamente que NO quería que las tags volvieran a ocupar la columna vertical de escritorio — es un layout nuevo, mobile-only. Además apuntó, "sin pruebas" (idea a validar más adelante, no implementada esta sesión): que por encima de 800px las tags podrían quedarse a la izquierda como en escritorio.
- **Decisión**:
  1. **Divisor sin sangrado**: `event-tags-row` (ambos ficheros) se separa en dos elementos — un contenedor EXTERIOR (el ítem real del grid, sin cambios de posición/orden, que lleva el `border-b` + `pb-8` al ancho normal de página) y un contenedor INTERIOR (la fila scrolleable de verdad, con el sangrado de márgenes negativos ya usado, sin borde propio). Un único elemento no puede a la vez sangrar su contenido Y mantener su borde dentro del margen — de ahí la división. El `id="overlay-tags-sidebar"` permanece en el interior (donde el JS ya inyectaba el HTML).
  2. **Reset de la caja al navegar**: `transitionToOverlayEvent()` (Anterior/Siguiente dentro del overlay) gana `overlayScroller.scrollTop = 0`, ANTES de capturar las posiciones antiguas del FLIP (para que ambas medidas, antes y después, se tomen en el mismo estado de scroll y el salto no se cuele en el delta de la animación). La página standalone no necesitaba cambios: sus enlaces Anterior/Siguiente ya usan `reload={true}` (recarga dura), así que cada navegación parte de cero de forma natural.
  3. **V2 del overlay — tags fijas bajo el título** (`index.astro` únicamente, la standalone conserva el layout estable D-032/D-036 sin tocar): nuevo `#overlay-tags-fixed`, hermano del header (no descendiente de `#overlay-details-content`, por la misma razón que el propio header vive fuera: ese wrapper actúa de bloque contenedor accidental para `position:fixed` de forma intermitente por su `transition:transform`, y quedarse fuera evita necesitar el truco de auto-corrección que sí necesita la imagen). Se posiciona con `top` = borde inferior del header (medición directa, sin necesitar auto-corrección al no estar afectado por el quirk), con su propio spacer (`#overlay-tags-fixed-spacer`) reservando el hueco en el flujo. Sin borde; `pb-8` como gap de 32px a la imagen (que ahora se ancla al borde inferior de ESTE bloque, no directamente al del header — el resto de la mecánica de encogimiento/pin/scroll-runway no cambia en absoluto). La instancia original en el grid (`#overlay-tags-sidebar`) pasa a `hidden lg:block` (visible solo en escritorio, donde sigue en su columna izquierda de siempre — el propietario fue explícito en que la V2 no debía tocar esa disposición). Contenido idéntico: `renderOverlayEvent()` rellena el mismo HTML en ambas instancias (`#overlay-tags-sidebar` y la nueva `#overlay-tags-sidebar-mobile`), igual que ya hace con el título de escritorio/móvil.
  4. **Bug encontrado por el camino — carga directa por `?detail=MEL-XXXX`**: en una carga completa de página que abre el overlay directamente (a diferencia de un click sobre una tarjeta ya con la página cargada), la primera pasada de `ensureOverlayScrollRunway()`/`updateOverlayStickyImage()` podía leer medidas de layout aún no asentadas (0px), dejando header/tags/imagen sin posicionar hasta el próximo scroll o resize real. Ya le pasaba a la imagen antes de esta sesión (bug preexistente, nunca detectado porque no se había probado antes esta combinación exacta de carga directa + móvil). Solución: el doble `requestAnimationFrame` que ya existía para revelar el overlay (dos pintados reales garantizados) vuelve a llamar a `ensureOverlayScrollRunway()`/`updateOverlayStickyImage()` una segunda vez, cuando el layout ya está asentado de verdad.
- **Motivo**: un divisor debe respetar la retícula de la página igual que cualquier otro; la caja de imagen no debe arrastrar el estado de scroll de un evento al siguiente; y la V2 explora si el patrón ya usado para el header (elemento fijo, hermano de `#overlay-details-content`, con spacer dedicado) se puede apilar una segunda vez para las tags sin romper la mecánica de imagen existente.
- **Consecuencias**: verificado — divisor a `24px`/`347px` (respeta el margen) mientras la fila de tags sigue sangrando a `0px`/`371px`, en ambos ficheros y también en escritorio (`border-bottom-width: 0px`, sin overflow horizontal). Reset de navegación: tras pulsar Siguiente con la caja comprimida (`cropH:200, y:470`), aterriza en el nuevo evento con `y:0, cropH:360` (máximo). V2: carga directa por `?detail=` correctamente posicionada desde el primer pintado tras el fix del doble rAF (antes fallaba); mecánica de encogimiento/pin/tap-to-reexpand/scroll-runway/nav-guard-40px verificada intacta con el nuevo anclaje; escritorio muestra `#overlay-tags-fixed` en `display:none` y la columna izquierda de siempre visible, sin overflow horizontal a 1280px; la página standalone permanece pixel-idéntica a la versión estable (captura de comparación). La excepción de 800px queda pendiente, sin implementar, a la espera de que el propietario la confirme tras ver la V2 en funcionamiento.
- **La V2 se hace definitiva y se mirrorea a la standalone en D-043**, junto con la estandarización del espaciado de separadores en todo el sitio.

## D-043 · La V2 del detalle se hace definitiva (mirroreada a la standalone), separadores a mínimo 32px por lado en todo el sitio, y se elimina el separador fantasma antes de "Eventos"

- **Contexto**: el propietario validó la V2 del overlay ("¡Buah! Está mucho mejor") y pidió (1) incluirla definitivamente en el sitio — es decir, aplicar el mismo patrón "tags fijas bajo el título" también a la página standalone `/event/[id]`, no solo al overlay; y (2) dos correcciones de espaciado en TODAS las instancias de separadores verticales entre módulos `TagWithLink` del sitio: quitar el separador antes del primer tag ("Eventos") en la fila de Highlights de la home, y subir la distancia mínima entre separador y módulo de 24px a 32px por cada lado — con la matización de que, cuando quepa, la fila debe repartir los tags a lo ancho completo con espaciado regular en vez de quedarse agrupada a la izquierda con hueco vacío a la derecha.
- **Decisión**:
  1. **V2 mirroreada a `event/[id].astro`**: réplica exacta del patrón ya probado en el overlay — nuevo `#detail-tags-fixed` (hermano del header, con su propio spacer `#detail-tags-fixed-spacer`) y `updateTagsFixed()` (mismo cálculo que `updateOverlayFixedTags()`, sin necesitar la auto-corrección del bloque contenedor accidental porque esta página no tiene el wrapper con `transition:transform` que sí tiene el overlay). La instancia de la columna del grid (`Column 1: Tags Sidebar`) pasa a `hidden lg:block`, visible solo en escritorio. Como esta página es SSR estática (no hay `renderOverlayEvent()` central), los 5 `<TagWithLink>` se declaran DOS veces en el marcado (móvil fijo + columna de escritorio), igual que el título ya hacía.
  2. **Mínimo 32px por lado — `TagWithLink.astro`**: `px-6` (24px) → `px-8` (32px) en el modo con borde (el único consumidor de este modo en todo el sitio es la fila de Highlights de la home — confirmado por grep exhaustivo de todos los usos de `<TagWithLink>`; el resto usa `hideBorder`). El alto sigue en 48px (el padding horizontal no lo afecta).
  3. **Separador fantasma eliminado**: la fila de Highlights gana `[&>*:first-child]:border-l-0 [&>*:first-child]:pl-0` — quita el `border-l` y el padding izquierdo SOLO del primer tag, así "Eventos" arranca a ras del borde izquierdo de la fila (igual que ya hacía el modo `hideBorder` en otras filas) en vez de mostrar un divisor sin nada delante.
  4. **Reparto regular cuando sobra ancho**: `justify-between` añadido a la fila de Highlights y a la del panel del mapa. Cuando el contenido cabe, el navegador reparte el espacio sobrante a partes iguales entre cada par de tags adyacentes (por encima del suelo de 32px ya incrustado en el padding propio de cada tag), sustituyendo el hueco vacío al final por un ritmo uniforme en toda la fila; cuando el contenido desborda, `justify-between` no tiene efecto (no hay espacio sobrante que repartir) y el comportamiento de scroll a sangre de D-041 queda intacto.
  5. **Panel del mapa**: `gap-[24px]` → `gap-8` (32px) en `#side-panel-tags-container` — como aquí los tags usan `hideBorder` (sin padding propio) y el divisor es un `<div>` independiente, el único mecanismo de espaciado es el gap del contenedor; al aplicarse uniformemente a TODOS los pares adyacentes (tag→divisor y divisor→tag), el resultado es 32px a ambos lados de cada divisor sin necesitar lógica de "primer hijo" (aquí no hay divisor ni antes del primer tag ni después del último, así que no hay separador fantasma que quitar).
- **Motivo**: coherencia total de la retícula de separadores en todo el sitio, y un layout del detalle de evento que el propietario prefiere claramente a la versión anterior.
- **Consecuencias**: verificado en la standalone (371px): posiciones de header/tags-fijo/imagen idénticas pixel a pixel a las ya verificadas en el overlay (152/232/232), encogimiento 360→200 y `navGapToBottom:40` iguales; escritorio (1280px) con `#detail-tags-fixed` en `display:none`, columna izquierda intacta, sin overflow horizontal. Highlights a 500px (desborda): primer tag con `border-left:0, padding-left:0`, resto a `32px/32px`, todos a 48px de alto. Highlights a 1280px (cabe): sin scroll, 3 huecos entre 4 tags de 45px cada uno (`justify-between` repartiendo, por encima del suelo de 32px propio de cada tag). Panel del mapa: 3 tags + 2 divisores, todos los huecos adyacentes a 32px exactos, alturas 48px. Sin regresión en el overlay tras estos cambios (re-verificado: 152/232/232 sin variación). Etiquetado como tag git `detalle-evento-2.0`, sustituyendo a `detalle-evento-1.0` como referencia de versión estable vigente (el tag anterior se conserva sin modificar, como historial).
- **Corregido/revertido por D-044**: el malentendido sobre el alcance de "las tags a la izquierda como en desktop desde 800px" — ver D-044.

## D-044 · Intento de "escritorio completo desde 800px" implementado y revertido — malentendido de alcance aclarado por el propietario

- **Contexto**: la sesión previa (D-042/D-043) dejó pendiente, marcada "sin pruebas", la idea de que por encima de 800px las tags volvieran a la izquierda "como en desktop". En esta sesión el propietario confirmó implementarlo, y ante la duda explícita de alcance (¿solo reposicionar las tags, o el tratamiento de escritorio completo?) eligió "escritorio completo desde 800px". Se implementó por completo: nuevo breakpoint Tailwind `--breakpoint-detail:800px`, sustitución mecánica de `lg:` por `detail:` en ambos ficheros (~140 clases), migración de los `window.innerWidth >= 1024` de las 4 funciones JS del sistema (×2 ficheros) a `>= 800`, y de la regla CSS `.event-tags-row` de `max-width:1023px` a `799px`. Al enseñar el resultado (capturas a 900px con el grid de 3 columnas y las tags en columna vertical a la izquierda), el propietario aclaró que se había liado: lo que realmente quería era mantener el layout tipo móvil/V2 (cabecera fija, tags fijas bajo el título, contenido pasando por debajo igual que en el trabajo ya hecho para móvil) también en tablet, cambiando **solo la presentación visual de la fila de tags** (que se vea "como en desktop", sin necesariamente adoptar la columna vertical ni el resto del mecanismo de escritorio) — no sustituir el mecanismo entero.
- **Decisión**: revertidos por completo `event/[id].astro`, `index.astro` y `global.css` al estado del commit `7734823` (D-042/D-043) vía `git checkout`, eliminando el breakpoint `detail` y todas las clases/JS/CSS asociadas — el detalle de evento vuelve a cambiar de móvil a escritorio exactamente en `lg` (1024px), como antes de esta sesión. Verificado explícitamente tras el revert que el escritorio (1280px) no había quedado dañado (captura idéntica a las de sesiones anteriores: tags en columna izquierda, imagen centrada, título arriba a la derecha). El trabajo de D-045 (divisores de Highlights, ancho del Toggle), hecho en los mismos ficheros pero sin relación con el breakpoint, se rehizo a mano después del revert.
- **Bug real encontrado durante el intento, corregido pese al revert**: al migrar los `window.innerWidth < 1024`, apareció uno en `event/[id].astro` (el handler de tap-para-reexpandir/abrir-lightbox de la foto) que no debía estar en 1024 en absoluto — D-039 documentó ese umbral como fijado a 480px "en ambos ficheros", pero solo se aplicó correctamente al overlay; la standalone llevaba desde D-039 en 1024 sin que nadie lo detectara (confirmado con `git log -S"innerWidth < 480"`, que no encontró ningún commit introduciéndolo en ese fichero). Este bugfix puntual (`< 1024` → `< 480` en esa línea concreta), independiente del breakpoint `detail` revertido, se reaplicó a mano tras el `git checkout` en vez de dejarlo pendiente.
- **Motivo**: honestidad documental — el propietario pidió explícitamente registrar el intento fallido y su reversión, no solo el estado final.
- **Consecuencias**: el detalle de evento queda exactamente como en D-043 (más D-045). La petición real (tags con presentación "de escritorio" dentro del mecanismo fijo/V2 en anchos tipo tablet) queda pendiente de una nueva ronda de trabajo, a la espera de clarificar el breakpoint exacto y el alcance visual concreto antes de tocar código de nuevo — lección aprendida: preguntar con una referencia visual (captura/mockup) antes de construir, no solo describir en palabras, cuando el alcance de un cambio de layout es ambiguo.

## D-045 · Separadores de Highlights como elementos independientes (no el `border-l` de cada tag), y ancho mínimo del Toggle

- **Contexto**: dos observaciones del propietario, ambas independientes del intento de D-044 (por eso sobreviven al revert). (1) Cada `TagWithLink` de Highlights llevaba su propio padding Y su propio divisor vertical (`border-l`) incrustado en la misma caja — eso hacía que la distancia divisor↔componente no fuera uniforme a ambos lados (cualquier espacio extra repartido por `justify-between` recaía siempre del lado del tag ANTERIOR al divisor, nunca simétrico) y que el hack `[&>*:first-child]` de D-043 fuese necesario solo para tapar el síntoma. Pidió tratar divisores y tags como elementos independientes dentro de un mismo contenedor, con distancia variable pero mínimo 32px — el patrón que el panel del mapa ya usa correctamente. (2) El `ToggleSelector` (Galería/Mapa/Lista) debía tener un ancho mínimo de 320px si no lo tenía ya.
- **Decisión**:
  1. **Highlights adopta el patrón del panel del mapa**: los 4 `TagWithLink` pasan a `hideBorder={true}` (sin padding ni borde propios) y se insertan `<div class="h-12 w-px bg-mel-border shrink-0">` como hermanos reales ENTRE cada par (no antes del primero ni después del último). El contenedor pasa de `gap-0` a `gap-8` (32px, D-043) + `justify-between` — al ser ahora TODOS los pares adyacentes del mismo tipo (tag-a-divisor o divisor-a-tag), tanto el `gap-8` como el reparto extra de `justify-between` se aplican de forma idéntica a ambos lados de cada línea, sin necesitar la excepción `first-child` (ya no hay ningún divisor antes del primer tag por construcción). El modo "con borde" de `TagWithLink.astro` (`border-l` + `px-8`) queda sin ningún consumidor activo en el sitio tras este cambio — se conserva la capacidad del componente (no es código muerto, es una variante de diseño no usada actualmente) en vez de eliminarla.
  2. **Toggle a `min-w-[320px]`**: añadido directamente en `ToggleSelector.astro` (no tenía ningún mínimo antes, solo `w-full`).
- **Motivo**: eliminar la asimetría de raíz en vez de parchearla, y garantizar que el selector de vista nunca se vea aplastado.
- **Consecuencias**: verificado a 500px (desborda): los 6 huecos entre los 7 hijos (tag-div-tag-div-tag-div-tag) son los 32px exactos, sin excepción para ninguno. A 1280px (cabe): los 6 huecos son iguales entre sí (60px), primer y último elemento a ras de los bordes del contenedor. Toggle: `min-width:320px` computado; sin overflow horizontal de página hasta 340px de viewport (por debajo de eso se recorta silenciosamente contra el `overflow-x:hidden` del wrapper raíz de la página, sin generar scroll horizontal — aceptable, 320px reales de dispositivo son ya poco comunes).

## D-046 · La fila de tags fija del detalle se reparte "como en escritorio" en tablet, sin salir del mecanismo fijo — la petición real tras D-044

- **Contexto**: tras revertir D-044, el propietario aclaró con una captura anotada (rectángulo rojo) qué quería en realidad: mantener el mecanismo V2 (cabecera y tags fijas arriba, contenido pasando por debajo) en anchos tipo tablet, cambiando solo la PRESENTACIÓN de la fila FECHA/LUGAR/LOCALIDAD/ORGANIZA/DISEÑO — que en vez de comportarse como tira horizontal con scroll y corte en el borde, se reparta a lo ancho completo con espaciado regular, "como en desktop", sin adoptar la columna vertical. Se confirmó explícitamente antes de tocar código: mismo patrón `justify-between` ya usado en Highlights (D-043/D-045), sin necesitar ningún breakpoint nuevo — la fila ya ocupa el ancho completo de pantalla (es `position:fixed` con `width` = viewport), así que basta con dejar que se reparta cuando quepa y siga scrolleando cuando no.
- **Decisión**: `#detail-tags-fixed`/`#overlay-tags-fixed` (la fila fija, NO la columna de escritorio ≥1024px, que sigue sin tocarse) pasan de `gap-6` a `gap-8 justify-between` — exactamente el patrón de D-045. Al reutilizar la clase `.event-tags-row`, que hasta ahora inyectaba el divisor vía CSS (`border-left` + `padding-left:24px` en el `@media (max-width:1023px)` de `global.css`) directamente sobre cada tag no-primero, apareció el mismo riesgo de asimetría que D-045 corrigió en Highlights: el divisor, al estar incrustado en la caja del propio tag, habría recibido todo el espacio extra de `justify-between` solo por un lado. Solución: se elimina esa inyección CSS del divisor (se mantiene el resto de la regla — `flex-shrink:0`, `white-space:nowrap` — que sigue haciendo falta) y se insertan divisores `<div class="h-12 w-px bg-mel-border shrink-0">` como hijos reales, intercalados entre los 5 `TagWithLink`, tanto en el marcado estático de `event/[id].astro` como en el HTML generado por JS de `renderOverlayEvent()` (`tagFragments.join(DIVIDER_HTML)` para la fila móvil fija, `tagFragments.join('')` sin divisores para la columna de escritorio — misma lista de fragmentos, distinto join).
- **Motivo**: dar a la fila de tags del detalle el mismo tratamiento sin asimetrías ya aplicado en Highlights y el panel del mapa, y resolver la petición real del propietario sin reintroducir la complejidad de un breakpoint nuevo.
- **Consecuencias**: verificado en ambos ficheros — a 371px (no cabe): la fila sigue scrolleando y cortándose a sangre en el borde, igual que antes. A 700px: sigue sin caber (8 huecos de 32px exactos, mínimo garantizado). A 900px: cabe completa, sin scroll, 8 huecos iguales entre sí (42px en la standalone, 41px en el overlay — la pequeña diferencia es solo redondeo de subpíxel), coincidiendo visualmente con la captura de referencia del propietario. Escritorio (1280px): la columna vertical de tags sigue con exactamente 5 hijos (sin divisores), sin overflow horizontal en ningún fichero.
- **Revertido por D-047**: tras ver el resultado en vivo (no en una prueba de Figma), el propietario decidió que este reparto no era lo que quería — ver D-047.

## D-047 · Revertido D-046: la fila de tags fija vuelve a su comportamiento original (scroll horizontal con divisor CSS, sin `justify-between`)

- **Contexto**: el propietario probó la idea en Figma antes de verla implementada y concluyó que era mejor no hacerlo — pidió revertir D-046 explícitamente, conservando eso sí los dos cambios de la misma sesión que sí quería (divisores de Highlights como elementos independientes, y el ancho mínimo del Toggle — ambos D-045, sin relación estructural con D-046).
- **Decisión**: revertidos a mano (sin `git checkout`, ya que había que preservar D-045 en los mismos ficheros) los tres cambios de D-046: `#detail-tags-fixed`/`#overlay-tags-fixed` vuelven de `gap-8 justify-between` a `gap-6` sin `justify-between`; se eliminan los `<div>` divisores intercalados en el marcado de `event/[id].astro` y en `tagFragments`/`DIVIDER_HTML` de `index.astro` (vuelve a la `tagsHtml` compartida de una sola cadena, sin distinción móvil/escritorio); `global.css` recupera la regla `.event-tags-row > *:not(:first-child) { border-left; padding-left:24px }` que D-046 había retirado.
- **Motivo**: decisión de diseño del propietario tras validar visualmente en Figma que el resultado no encajaba — no un error técnico de la implementación (que funcionaba y coincidía con la referencia visual pedida en su momento).
- **Consecuencias**: verificado — la fila fija de tags vuelve exactamente al comportamiento de D-042/D-043 (izquierda-empaquetada, divisor `border-left` por CSS, sin repartirse aunque sobre espacio, scroll+sangrado cuando no cabe). Highlights (7 hijos, divisores independientes, huecos uniformes de 57px a 1280px) y Toggle (`min-width:320px`) verificados intactos tras el revert. El sitio queda, en la práctica, en el mismo estado funcional que al cierre de D-045.
- **Superado por D-048**: el propietario aportó capturas de Figma con el comportamiento real que necesitaba el toolbar de la home (Highlights + Toggle) — ver D-048.

## D-048 · Toolbar de la home (Highlights + Toggle) con `flex-wrap` real: el Toggle salta de línea solo cuando no cabe, gap de 24px, sin depender de `lg`

- **Contexto**: el propietario, tras varias rondas dando vueltas a los separadores del detalle de evento, se dio cuenta de que la confusión real era sobre el TOOLBAR de la home (Highlights + selector Galería/Mapa/Lista) — aportó tres capturas de Figma con el comportamiento exacto esperado en función del ancho disponible: (1) escritorio ancho — tags y Toggle en la misma fila, Toggle ocupando el resto del ancho; (2) ancho intermedio — el Toggle "salta debajo" porque no puede medir menos de 320px y no cabe junto a las tags, así que pasa a su propia fila a ancho completo; (3) móvil — el slider llega a sangre a los bordes, las tags no tienen ya divisor antes de "Eventos" y cada una mide según su contenido. Las tres capturas especifican **24px** de espacio entre divisores y tags (no 32px, corrigiendo la instrucción genérica de D-043 para esta fila en concreto).
- **Decisión**:
  1. **De grid a flex-wrap real**: el contenedor de la fila (antes `grid grid-cols-1 lg:grid-cols-12`, con las tags a `col-span-8` y el Toggle a `col-span-4`, forzando un cambio brusco exactamente en `lg`/1024px) pasa a `flex flex-wrap items-center gap-x-6 gap-y-6`. El salto de línea del Toggle ya no depende de un breakpoint fijo, sino de si su ancho mínimo (320px) cabe de verdad junto al ancho natural que en ese momento ocupan las tags — un ancho que varía con los datos (cifras de eventos/artistas/etc.), tal y como pedía el propietario.
  2. **Tags: `shrink-0`, nunca se comprime para hacerle sitio al Toggle**: sin `flex-grow` ni `flex-shrink`, la fila de tags siempre renderiza a su ancho natural de contenido — es precisamente que se niegue a encogerse lo que obliga al Toggle a saltar de línea en vez de apretarse a su lado. `gap-6` (24px) plano entre tags y divisores, sin `justify-between` (ya no hace falta: el Toggle es quien absorbe el ancho sobrante, no la propia fila de tags).
  3. **Toggle: `grow` + `min-w-[320px]`**: al crecer (`flex-grow:1`) ocupa lo que quede en su línea — junto a las tags cuando cabe, o toda la línea entera cuando ha saltado solo abajo (sin necesitar una clase "apilado" aparte: `grow` en una línea vacía ya la rellena por sí solo). El propio `ToggleSelector.astro` ya impone el suelo de 320px (D-045); se repite en el wrapper para que el cálculo de "cabe o no cabe" del flex-wrap lo tenga en cuenta.
  4. **Bug encontrado y corregido en el camino — el truco de sangrado por margen negativo rompía el `flex-wrap`**: la fila de tags heredaba `-mx-6 w-[calc(100%+48px)] sm:-mx-12 sm:w-[calc(100%+96px)]` (D-041, pensado para cuando la fila era una celda de grid o una fila en solitario). Con un ANCHO EXPLÍCITO de "100% + 48px", el navegador interpretaba "100%" como el ancho del CONTENEDOR FLEX completo, no el que la fila necesita de verdad — la fila se expandía a casi todo el toolbar y el Toggle se veía obligado a saltar de línea incluso en escritorio ancho (confirmado midiendo: a 1440px la fila ocupaba 1272px cuando su contenido real mide ~485px). Solución: se sustituye por `max-w-full` sin margen negativo ni ancho explícito — la fila ahora sí se dimensiona a su contenido real, y solo si ese contenido excede el ancho de su propia línea entra en scroll interno (`overflow-x-auto`). Coste asumido: el scroll ya no sangra hasta el borde físico de la pantalla en el caso extremo de móvil muy estrecho (se recorta contra el padding de página, 24-48px hacia dentro) — el truco de sangrado por margen negativo es incompatible con compartir línea con un hermano flex; se documenta como diferencia consciente frente al resto de filas a sangre del sitio.
- **Motivo**: coincidir exactamente con el comportamiento especificado en Figma, sin atarlo a un breakpoint arbitrario que no reflejaba cuándo el contenido realmente deja de caber.
- **Consecuencias**: verificado en tres anchos — 1440px: misma línea, gap exacto de 24px en cada divisor, Toggle ocupando el resto (715px). 900px: el Toggle salta de línea (no cabe junto a un ancho natural de 485px), tags sin scroll (caben enteras), Toggle a ancho completo de su línea (684px). 375px: tags scrolleables (no caben en el espacio disponible), Toggle debajo a `min-width:320px` exacto, sin divisor antes de "Eventos" (`border-left:0px`). Transición verificada como genuinamente orgánica, no ligada a los 1024px de `lg`: a 1150px de ancho siguen en la misma línea (gap 24px limpio), a 1020px ya han saltado — el punto de cruce cae en un rango, no en un número mágico, exactamente como pedía el propietario. Sin errores de consola ni overflow horizontal en ningún ancho probado.

## D-049 · Color semántico de contraste sobre Action-Primary (`--mel-text-on-action-primary` = `LE-50`)

- **Contexto**: El color `--mel-action-primary` es un tono granate intenso en modo claro (`LE-500`) y granate medio en modo oscuro (`LE-400`). Anteriormente, los textos e iconos colocados encima de `action-primary` o cuyos estados active/hover pasaban a `action-primary` utilizaban la variable general `--mel-text-on-action`. Sin embargo, `--mel-text-on-action` cambia en modo oscuro a `tinted-900` (texto oscuro) para adaptarse a `action-secondary` (que en oscuro pasa a crema claro `LE-100`). Esto provocaba un problema grave de contraste e inaccesibilidad: en modo oscuro, cualquier texto o icono sobre `action-primary` se volvía oscuro sobre fondo granate.
- **Decisión**:
  1. Se crea la token semántica `--mel-text-on-action-primary` en `src/styles/global.css` que resuelve **siempre** al primitivo casi blanco `LE-50` (`var(--mel-primitive-le-50)`), tanto en `:root` como en `.dark`. Se expone a Tailwind como `text-mel-text-on-action-primary` y `hover:text-mel-text-on-action-primary`.
  2. Se actualizan todos los componentes y elementos que renderizan texto o iconos sobre `Action-Primary` o que cambian su fondo a `Action-Primary` en hover/active:
     - `SideMenu.astro`: Badge *"Nuevo"* y botón de modo color en hover.
     - `LikeButton.astro` y su réplica en `index.astro`: Texto e icono del botón *"Me presta"* en hover cuando está activo.
     - `MapMarker.astro` y marcadores/clusters del mapa en `index.astro`: Marcadores del mapa configurados a fondo `Action-Primary` con texto permanentemente en `LE-50` (`var(--mel-text-on-action-primary)`), eliminando variaciones inaccesibles y garantizando legibilidad en mapa claro u oscuro.
     - `IconButton.astro`: Variante `primary` en estado hover.
     - `EmptyState.astro`, `EventCard.astro`, `EventInfoBox.astro` y `event/[id].astro`: Botones con hover a `Action-Primary` (`hover:text-mel-text-on-action-primary`).
- **Motivo**: Garantizar un contraste alto y permanente (WCAG AA/AAA) del texto sobre los elementos de acción principal en cualquier tema (claro u oscuro).
- **Consecuencias**: El texto sobre `Action-Primary` es permanentemente casi blanco (`LE-50`) en ambos modos. Los botones sobre `Action-Secondary` conservan `--mel-text-on-action` para adaptarse correctamente a su fondo en modo oscuro.

## D-050 · Actualización de la variante `no-results` de `EmptyState` (botón "Quitar filtros" y descripción)

- **Contexto**: Cuando una búsqueda o filtro no devuelve resultados en Galería o Lista, la tarjeta de estado vacío debe mostrar el botón *"Quitar filtros"* y la descripción *"Elimina los filtros o prueba a buscar otra cosa."*.
- **Decisión**:
  1. En `src/components/EmptyState.astro`:
     - Se actualiza la descripción por defecto para `variant="no-results"` a `"Elimina los filtros o prueba a buscar otra cosa."`.
     - Se habilita el botón por defecto (`showButton = true`) con etiqueta `"Quitar filtros"`.
  2. En `src/pages/index.astro`:
     - Se sincronizan las 3 réplicas dinámicas en JavaScript (Galería, Lista en escritorio y Lista en móvil) para incluir la nueva descripción y el botón con la clase `.empty-state-clear-btn`.
     - En el manejador global de clics delegado de `index.astro`, al hacer clic sobre `.empty-state-clear-btn`, se detiene la propagación y se emite la limpieza de búsqueda mediante `window.dispatchEvent(new CustomEvent('mel-set-search', { detail: { query: '' } }))`.
- **Motivo**: Replicar fielmente el diseño de Figma y ofrecer un mecanismo limpio e instantáneo para restablecer la búsqueda con un solo clic.
- **Consecuencias**: El estado vacío presenta la descripción actualizada y el botón *"Quitar filtros"* que restaura los resultados sin recargas.

## D-051 · Alineación uniforme de `EmptyState` en las 3 vistas (Galería, Mapa y Lista) sin elementos sobrantes

- **Contexto**: Cuando la combinación de búsqueda y/o slider de fecha no devuelve resultados (`filtered.length === 0`), el estado vacío debe mostrarse centrado exactamente en la misma posición en las tres pestañas (Galería, Mapa y Lista). Además, en la vista Lista no debe quedar visible la cabecera de la tabla (`<thead>`), las tarjetas móviles ni la barra de paginación inferior.
- **Decisión**:
  1. Se simplifica la arquitectura del estado vacío definiendo una única capa overlay `#views-empty-state` directamente sobre `#content-views` con `absolute top-[24px] right-0 bottom-0 left-0 bg-mel-bg-primary z-[30] items-center justify-center py-12`.
  2. En `performDOMUpdates()` (`src/pages/index.astro`), cuando `filtered.length === 0`:
     - Se activa la capa `#views-empty-state` poblándola con el marcado de `EmptyState` ("Sin resultados", "Elimina los filtros o prueba a buscar otra cosa." y el botón "Quitar filtros").
     - Se ocultan las vistas reales (`#gallery-grid`, `#list-table-wrapper` incluyendo la cabecera `<thead>`, `#list-mobile-cards` y `#pagination-controls`), cerrando cualquier side panel de ubicación en el mapa.
  3. Al conmutar de vista mediante los botones del toggle (`switchView()`), el selector conmuta los estados de los botones, pero la tarjeta de `EmptyState` permanece **100% estática e inmóvil en las mismas coordenadas exactas**, ya que está anclada al contenedor padre global de las tres vistas.
- **Motivo**: Eliminar cualquier discrepancia de padding o cálculo de altura entre paneles individuales, logrando que el estado vacío no se mueva ni un solo píxel al alternar entre Galería, Mapa y Lista.
- **Consecuencias**: Transición perfectamente suave y nula variación vertical del estado vacío al cambiar de vista.

## D-052 · Comportamiento de estados de color en Marcadores de Mapa y Botón "Me presta"

- **Contexto**: Se define la interacción precisa de los estados Resting, Hover/Pressed y Active para los marcadores del mapa y el botón "Me presta".
- **Decisión**:
  1. **Marcadores del Mapa (`MapMarker.astro` y `index.astro`)**:
     - **En reposo (Resting)**: Fondo `Action-Secondary`, puntero `Action-Secondary` y texto `var(--mel-text-on-action)`.
     - **En Hover, Pressed o Activo (panel abierto)**: Cambia a fondo `Action-Primary`, puntero `Action-Primary` y texto en `var(--mel-text-on-action-primary)` (`LE-50`).
  2. **Botón "Me presta" (`LikeButton.astro` y réplica en `index.astro`)**:
     - **Inactivo (`data-active="false"`)**: Reposo en borde/texto `Action-Secondary`. Hover/Pressed conmuta a borde/texto `Action-Primary`.
     - **Activo (`data-active="true"`)**: En reposo permanece en fondo/borde `Action-Secondary` con texto/icono `var(--mel-text-on-action)`. Solo cambia a fondo/borde `Action-Primary` con texto/icono `var(--mel-text-on-action-primary)` (`LE-50`) al hacer **Hover** o **Pressed**.
- **Motivo**: Mantener una coherencia visual estricta donde los elementos activos en reposo utilizan `Action-Secondary` y únicamente la interacción (Hover/Pressed) o la selección principal activa del mapa promociona a `Action-Primary`.
- **Consecuencias**: Los marcadores del mapa en reposo muestran `Action-Secondary`, y el botón "Me presta" activado se mantiene en `Action-Secondary` hasta que el usuario interactúa con él (Hover/Pressed).

## D-053 · Ocultación de la pastilla de datos (`.flyer-label`) en la Galería en pantallas pequeñas / móviles

- **Contexto**: Anteriormente, en pantallas pequeñas y táctiles (`@media (hover: none)` y `html.is-touch`), la pastilla inferior de información (`.flyer-label` con título y fecha del evento) se mostraba forzadamente fija sobre cada tarjeta de flyer para compensar la falta de estado hover con ratón.
- **Decisión**:
  1. Se eliminan las reglas CSS forzadas en `src/styles/global.css` (`@media (hover: none)` y `html.is-touch .flyer-label`) y la función `applyTouchFlag` de `src/layouts/Layout.astro`.
  2. En pantallas de escritorio (con cursor), la pastilla `.flyer-label` se mantiene oculta por defecto (`opacity-0`) y se revela únicamente al hacer hover (`group-hover:opacity-100`).
  3. En pantallas móviles y táctiles, la pastilla permanece oculta, mostrando las obras de forma limpia.
- **Motivo**: Mantener la vista de la Galería en móvil/pantallas pequeñas lo más limpia posible, destacando el valor visual del flyer como pieza de archivo y promoviendo la curiosidad, investigación y el clic por parte del usuario sin contaminarle con información excesiva antes de la interacción.
- **Consecuencias**: Las imágenes de la Galería se muestran puras y sin sobreposiciones de texto en pantallas pequeñas/móviles. La información completa se consulta al pulsar sobre la tarjeta para abrir el detalle.

## D-054 · Distancia dinámica superior de cabecera (`--mel-header-pt-desktop`) y simetría en la navegación inferior del detalle de evento

- **Contexto**: Anteriormente, el relleno superior de la cabecera en escritorio estaba fijado a un estático `10vh` y la navegación del detalle de evento tenía un margen superior rígido de `lg:mt-[280px]` con `108px` o `40px` inferiores. En pantallas de portátil pequeñas (como un MacBook Pro de 15" ~900px de altura), esto desaprovechaba espacio vertical y obligaba a un scroll vertical innecesario en eventos con contenidos breves.
- **Decisión**:
  1. Se crea el token de espaciado en `src/styles/global.css`:
     `--mel-header-pt-desktop: clamp(32px, 5vh, 88px);`
  2. Se aplica `--mel-header-pt-desktop` al padding superior de cabecera en escritorio en todas las páginas (`index.astro`, `event/[id].astro`, `exposiciones.astro`, `info.astro` y `SideMenu.astro`).
  3. En la vista de detalle de evento (`event/[id].astro` y overlay en `index.astro`):
     - Se sustituye el margen superior rígido `lg:mt-[280px]` por `lg:mt-12`.
     - El bloque de navegación ("Anterior" / "Siguiente") se fija con `lg:bottom-[var(--mel-header-pt-desktop)]` y padding inferior `lg:pb-[var(--mel-header-pt-desktop)]`.
- **Motivo**: Optimizar el aprovechamiento del espacio vertical en portátiles como el MacBook Pro de 15", garantizando que los detalles del evento encajen en pantalla sin scroll a menos que el contenido (descripción/artistas) sea extenso, y manteniendo una simetría idéntica entre la distancia de la cabecera al borde superior y de la navegación al borde inferior.
- **Consecuencias**: En pantallas portátiles de 15", la vista de detalle encaja limpiamente sin scroll vertical innecesario, manteniendo la misma separación exacta en la parte superior e inferior.

## D-055 · Posicionamiento flex del bloque de navegación en detalle de evento (Simetría 100% arriba/abajo + Margen 104px infranqueable)

- **Contexto**: Anteriormente, el uso de `sticky bottom` en el bloque de navegación entre eventos ("Anterior" / "Siguiente", `id="overlay-nav-block"` y `#detail-nav-block`) provocaba dos fallos de maquetación en escritorio:
  1. No dejaba el bloque a la misma distancia exacta del borde inferior de la pantalla que el botón de cerrar 'X' al borde superior.
  2. En pantallas con menor altura ("bajitas"), la propiedad sticky forzaba al bloque de navegación a deslizarse hacia arriba por encima de la caja de la imagen.
- **Decisión**:
  1. **Estructura Flex**: Se asigna `lg:min-h-[calc(100vh-var(--mel-header-pt-desktop)*2)]` al contenedor principal (`#overlay-content-wrapper` y `#detail-page-container`) con flexbox vertical `justify-between`.
  2. **Simetría Absoluta**: Se elimina `sticky` en escritorio y se usa `lg:mt-auto`. El borde superior del botón de cerrar 'X' queda a `var(--mel-header-pt-desktop)` del borde superior de la ventana, y el borde inferior del bloque de navegación queda exactamente a `var(--mel-header-pt-desktop)` del borde inferior de la ventana.
  3. **Margen Infranqueable de 104px**: Se añade `lg:pt-[104px]` (o `lg:mt-auto lg:pt-[104px]`). En pantallas cortas, el bloque de navegación se mantiene en flujo normal a al menos 104px por debajo de la imagen del flyer, expandiendo la página verticalmente si es necesario sin solaparse jamás con la foto.
- **Motivo**: Garantizar una simetría óptica idéntica entre la parte superior e inferior de la pantalla y evitar cualquier solapamiento con la caja de la foto en pantallas compactas.
- **Consecuencias**: Distancia 100% simétrica al marco de visión y separación constante de mínimo 104px respecto a la imagen del evento.

## D-056 · Transición de aparición emergente de la descripción (`opacity 0` + desde la caja de la imagen)

- **Contexto**: Al navegar entre eventos en la vista de detalle (SPA overlay), cuando un evento sin descripción daba paso a un evento con descripción, el cálculo FLIP de posición interpretaba el origen previo en (0,0) (pantalla superior), provocando que el contenedor de descripción bajase atravesando toda la pantalla por encima del resto de elementos.
- **Decisión**:
  1. En `switchDetailsOverlayEventSPA` (`src/pages/index.astro`), se detecta cuando la descripción no existía en el evento saliente (`wasDescHidden`) y sí existe en el entrante (`isDescVisible`).
  2. En este caso se evita el FLIP vertical global y se aplica una transición dedicada de entrada:
     - **En escritorio (`lg+`)**: Emerge desde la izquierda (`opacity: 0`, `translateX(-50px)`) por detrás de la caja de la imagen (`z-20`).
     - **En móvil (`<lg`)**: Emerge desde arriba (`opacity: 0`, `translateY(-24px)`) por detrás de la caja de la imagen.
  3. Para el resto de elementos y en transiciones entre eventos que ya tenían descripción, se filtran sólo elementos previamente visibles (`oldRect.height > 5`), evitando cualquier salto indeseado desde la parte superior.
- **Motivo**: Eliminar el cruce visual anómalo de texto sobre los elementos del header y lograr un comportamiento natural donde la descripción aparece emergiendo desde detrás de la imagen del flyer con desvanecimiento suave.
- **Consecuencias**: Al navegar a un evento con descripción viniendo de uno sin ella, el texto se desliza limpiamente desde detrás de la imagen en escritorio (izquierda) o móvil (arriba) con opacidad progresiva.

## D-057 · Ancho mínimo de celdas en vista de Lista (`136px`) y punto de ruptura móvil (`440px`)

- **Contexto**: Se requiere establecer un ancho mínimo por celda/columna en la tabla de la vista de Lista para garantizar la legibilidad de los campos y permitir scroll horizontal cuando el ancho de pantalla disminuye, hasta conmutar al diseño de tarjetas compactas de móvil cuando la pantalla sea menor de 440px.
- **Decisión**:
  1. En `src/pages/index.astro`, cada columna/celda (`<col>`, `<th>` y `<td>`) de la tabla de la vista de Lista tiene fijado un ancho mínimo de **136px** (`min-w-[136px]`, ancho total mínimo de tabla `816px`).
  2. El contenedor `#list-table-wrapper` habilita desplazamiento horizontal fluido (`overflow-x-auto`) cuando el puerto de visión es menor al ancho de la tabla.
  3. El punto de corte para conmutar entre la vista de tabla y el listado compacto móvil (`#list-mobile-cards`) se traslada de `768px` (`md`) a **`440px`** (`min-[440px]:block` / `min-[440px]:hidden`).
- **Motivo**: Preservar la disposición tabular en pantallas medianas y portátiles estrechos con scroll horizontal limpio, reservando la vista de tarjetas únicamente para dispositivos con ancho inferior a 440px.
- **Consecuencias**: En pantallas entre 440px y 816px de ancho se muestra la tabla completa con scroll horizontal; por debajo de 440px la interfaz conmuta al diseño compacto de tarjetas.

## D-058 · Corrección de D-048: el separador antes de "Eventos" reaparece en escritorio (columna 1 de la rejilla), sigue oculto en móvil

- **Contexto**: el propietario aportó una captura con inspección de rejilla de 12 columnas sobre el toolbar de la home en escritorio (Figma dev mode): el Toggle mide 4 columnas y los separadores caen al comienzo de las columnas impares 1, 3, 5 y 7 — es decir, CADA una de las 4 tags (incluida "Eventos") lleva su propio separador a la izquierda, como límite de columna. D-048 (heredando la lógica de D-043/D-045) había suprimido justo ese primer separador por considerarlo un elemento "fantasma" sin nada delante. Antes de tocar código se preguntó explícitamente si debía restaurarse — el propietario confirmó que sí.
- **Decisión**: el separador antes de "Eventos" vuelve a renderizarse, pero SOLO en escritorio (`lg` en adelante, `hidden lg:block`) — en móvil sigue oculto, tal y como el propio propietario había especificado explícitamente en la ronda anterior (D-048, imagen 3: "aquí ya no tenemos el primer divisor antes de Eventos"). Los otros 3 separadores (antes de Artistas, Diseñadores y Promotores) siguen siempre visibles, sin cambios.
- **Motivo**: la especificación de Figma en 12 columnas define el separador de "Eventos" como el límite de la columna 1, no como un elemento sobrante — pero esa lectura de rejilla es explícitamente de escritorio; el propietario nunca retiró su instrucción de ocultarlo en móvil.
- **Consecuencias**: verificado — a 375px el primer separador tiene `display:none` (8 hijos en el DOM, pero solo 7 visibles); a 1440px tiene `display:block`, alineado exactamente con el margen izquierdo de página (108px, coincide con el borde de la columna 1), y los 7 huecos de la fila siguen siendo 24px uniformes. Sin cambios en el comportamiento de `flex-wrap` del Toggle (D-048) ni en el resto de separadores.
- **Superado por D-059**: rediseño completo del toolbar de la home — Toggle con tope de 4 columnas, divisor integrado en cada unidad, ancho igual por defecto con caída a ancho-por-contenido, y "Eventos" siempre visible sin excepción de breakpoint — ver D-059.

## D-059 · Toolbar de la home: Toggle con tope de 4 columnas, divisor integrado en cada highlight, ancho igual por defecto con caída a contenido, "Eventos" siempre visible

- **Contexto**: cuatro precisiones del propietario sobre el toolbar (Highlights + Toggle), con capturas de referencia y el nodo Figma 341:26425: (1) el Toggle, al compartir fila con las tags, debe medir como MUCHO 4 columnas de la rejilla de 12 y como MÍNIMO 320px — antes (D-048) crecía sin tope (`grow` puro) hasta ocupar todo el espacio sobrante; (2) el divisor vertical pasa a vivir DENTRO de cada módulo de highlight (no como hermano suelto en la fila), siempre a 24px a la izquierda del texto salvo que se indique lo contrario; (3) los highlights se adaptan al ancho disponible manteniendo 32px de distancia ENTRE módulos — un valor distinto del anterior 24px del divisor-a-texto, y aplicado a un layout de ANCHO IGUAL para las 4 tags por defecto (no ancho-por-contenido, que era el comportamiento vigente desde D-031); (4) ese ancho igual solo se abandona (pasando a ancho-por-contenido, con scroll) en el momento en que una columna equirepartida se quedaría más estrecha que su propio contenido; (5) el divisor de "Eventos" no debe desaparecer nunca, revirtiendo la condición `hidden lg:block` que D-058 le había puesto un rato antes en esta misma sesión.
- **Decisión**:
  1. **Estructura**: cada tag pasa a renderizarse como una "highlight-unit" (`<div class="highlight-unit shrink-0 flex items-center gap-6 min-w-0">`) que contiene su propio divisor (`h-12 w-px bg-mel-border`) seguido del `TagWithLink` (`hideBorder`) — el `gap-6` (24px) interno de la unidad es la distancia divisor→texto, constante en cualquier modo. El contenedor de la fila (`#home-highlights-tags`) usa `gap-8` (32px) entre unidades completas.
  2. **Dos modos de layout, decididos por JS, no por breakpoint** (`updateHighlightsLayout()`, ejecutado en `astro:page-load` y en cada resize, coalescido con `requestAnimationFrame`):
     - `.highlights-grid-equal`: `display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:0 32px` — las 4 unidades miden EXACTAMENTE lo mismo. Dentro de cada unidad, el `.filter-tag` (la caja de `TagWithLink`) pasa de su `w-auto` por defecto a `flex:1 1 auto` vía una regla CSS con el selector `:global()`, para ocupar el resto de la unidad después del divisor+gap.
     - `.highlights-flex-content` (server-rendered por defecto, para tener un resultado sensato antes de que el JS corra): `display:flex` — cada unidad conserva su ancho natural (`shrink-0` en la propia unidad, imprescindible: sin él, la unidad se comprime dentro de la fila en vez de reportar su tamaño real al medir, y la fila entera hace scroll horizontal en vez de comprimir nada.
     - El algoritmo mide primero en modo contenido (para obtener el ancho natural real de cada unidad, `maxNatural`), calcula el ancho objetivo del Toggle (`Math.max(320, (toolbarWidth-264)/3+72)` — misma fórmula de "4 de 12 columnas" que el panel del mapa, D-026), y decide en cascada: si un reparto igual COMPARTIENDO fila con el Toggle ya es ≥ `maxNatural`, usa `grid-equal` con la fila anchada exactamente al hueco libre junto al Toggle; si no, comprueba si un reparto igual con la fila SOLA (Toggle ya deducido) sigue siendo ≥ `maxNatural`, y si es así usa `grid-equal` a ancho completo (el Toggle cae debajo por el propio `flex-wrap` nativo, sin necesitar forzarlo); si ni así llega, se queda en `flex-content` (cada tag a su ancho real, fila con scroll horizontal).
  3. **Toggle con tope real**: `#home-toggle-wrapper` pasa de `grow min-w-[320px]` a `grow min-w-[320px] max-w-[calc((100%-264px)/3+72px)]` — crece para ocupar el hueco libre pero nunca más allá de 4 columnas de 12, salvo que eso sea menos de 320px (entonces manda el mínimo).
  4. **"Eventos" siempre visible**: se elimina el `hidden lg:block` que D-058 había añadido — las 4 unidades (incluida la primera) renderizan su divisor siempre, en cualquier ancho de pantalla.
- **Bug real encontrado y corregido durante la implementación**: la primera versión de la regla `.filter-tag { width:100% }` en modo `grid-equal` no tenía en cuenta que `.highlight-unit` es ella misma una fila flex con el divisor y su `gap-6` (25px) ya ocupando espacio — un `width:100%` literal desbordaba la celda de la rejilla exactamente esos 25px de más (confirmado midiendo `scrollWidth − clientWidth = 25`). Corregido sustituyendo por `flex:1 1 auto` (crece para ocupar solo el hueco que de verdad sobra dentro de la unidad, no el 100% de la unidad entera).
- **Motivo**: alinear el toolbar con el nodo de Figma 341:26425 y con el comportamiento real que el propietario necesitaba — un layout que se lea como una rejilla auténtica de ancho igual mientras haya sitio, y que solo ceda a ancho-por-contenido cuando de verdad haría falta para no truncar ningún dato.
- **Consecuencias**: verificado en tres anchos — 1440px: modo `grid-equal` compartiendo fila, 4 unidades a 178px exactas, 3 huecos de 32px, 24px hasta el Toggle, Toggle a 392px (tope de 4 columnas). 900px: modo `grid-equal` en solitario (Toggle salta debajo, `sameLine:false`), 4 unidades a 147px, Toggle al mínimo de 320px. 375px: modo `flex-content` (cada unidad a su ancho real — 91/95/127/125px —, fila con scroll horizontal), divisor de "Eventos" con `display:block` en los tres anchos sin excepción. Sin overflow en ningún caso tras el fix del bug de `width:100%`.

## D-060 · Componente `AdaptiveTagsRow` reutilizado en toolbar/detalle/mapa, Toggle a ancho completo al caer solo, sangrado a la derecha, panel del mapa tapa el slider

- **Contexto**: cuatro precisiones más del propietario sobre el toolbar de D-059 y su reutilización: (1) el Toggle, cuando cae a su propia línea bajo las tags (porque ya no cabe compartiéndola), debe ocupar el ancho TOTAL del toolbar con el mismo padding que el resto de la página — el tope de 4 columnas de D-059 era, sin querer, incondicional y seguía aplicando también en solitario; (2) como mínimo 32px de separación vertical entre la fila de tags y el Toggle al apilarse; (3) la fila de tags debe desbordar (sangrar) por el margen DERECHO de la pantalla cuando su contenido ya no puede encogerse más, como affordance de que hay más contenido con scroll; (4) la misma estructura y lógica (debían ser el mismo componente) debe aplicarse a la fila de tags del detalle de evento en formato horizontal (`event/[id].astro` y el overlay SPA de `index.astro`) y a la del panel de eventos del mapa — y ese panel, además, debe subir hasta tapar por completo el slider de fecha de la home en vez de dejarlo asomando bajo el dim.
- **Decisión**:
  1. **Componente compartido `AdaptiveTagsRow.astro`** (`src/components/AdaptiveTagsRow.astro`): recibe `tags: {label, count, href?, state?}[]` y renderiza la misma estructura de D-059 (`highlight-unit` = divisor + `TagWithLink hideBorder`) para cualquier número de tags. El CSS de los dos modos (`.highlights-grid-equal` / `.highlights-flex-content`) se centraliza una sola vez en `global.css`, con selector `.adaptive-tags-row.highlights-*` (no ligado al id de cada instancia) y `grid-auto-flow:column; grid-auto-columns:minmax(0,1fr)` en vez del `repeat(4,...)` fijo de D-059 — así una sola regla sirve para 4 tags (toolbar), 5 (detalle) o 3 (panel del mapa) sin CSS por instancia.
  2. **Toggle a ancho completo al caer solo**: el tope `max-w-[calc((100%-264px)/3+72px)]` de D-059 pasa de ser una clase Tailwind incondicional a una regla `#home-toggle-wrapper.toggle-shares-line { max-width: ... }` — la clase `.toggle-shares-line` la añade/quita en cada resize `updateHomeToolbarLayout()` comparando si la fila de tags y el Toggle han acabado en la misma línea (mismo `getBoundingClientRect().top` implícito en si `updateAdaptiveTagsRow()` reportó "compartiendo"). Sin esa clase, el Toggle es un `grow` normal dentro del toolbar y ocupa el 100% del ancho disponible — el mismo padding de página que cualquier otro elemento, porque vive en el mismo contenedor.
  3. **Separación vertical**: `gap-y-6` → `gap-y-8` en el contenedor del toolbar (24px → 32px entre la fila de tags y el Toggle al apilarse).
  4. **Sangrado a la derecha, solo en modo contenido**: `.adaptive-tags-row.highlights-flex-content { width: calc(100% + 24px); padding-right: 24px; flex-shrink: 0 }` (48px desde `sm:`) — a diferencia del sangrado simétrico sitewide (`-mx-6 w-[calc(100%+48px)]`), este es SOLO por la derecha (el borde izquierdo de la fila nunca se mueve) y **necesita `flex-shrink:0` explícito**: la fila es en sí misma un ítem flex de su propio contenedor padre, así que un `width` a secas actúa solo como sugerencia de `flex-basis` — sin `flex-shrink:0` el algoritmo flex del padre recorta el sangrado de vuelta al 100% (bug real encontrado durante la verificación en navegador: `getComputedStyle().width` daba el ancho del contenedor, no el `calc(...)`, hasta añadir esta propiedad). El modo `grid-equal` fija su ancho por JS (`row.style.width`) y no necesita el sangrado.
  5. **Migración de las 3 instancias**:
     - Panel del mapa (`#side-panel-tags-container`, 3 tags Eventos/Artistas/Diseñadores): sustituida por `<AdaptiveTagsRow>`; `updateAdaptiveTagsRow()` se llama tras poblar los contadores (su ancho de texto cambia) y tras la transición de apertura del panel (300ms, su ancho pasa de 0 al final), además de en cada resize mientras esté abierto.
     - `event/[id].astro` (`#detail-tags-fixed`, 5 tags Fecha/Lugar/Localidad/Organiza/Diseño, servido vía SSR): sustituida por `<AdaptiveTagsRow>` directamente con `TagWithLink`; el algoritmo genérico se duplica a mano en su propio `<script>` (sin sibling que negociar, solo igual-vs-contenido contra su propio ancho — AGENTS.md regla 7, no hay módulo JS compartido).
     - Overlay SPA (`#overlay-tags-sidebar-mobile` en `index.astro`, misma fila que arriba pero renderizada por JS en cliente): al no pasar por Astro, se añadió `makeAdaptiveTagHtml()` — un espejo a mano de `AdaptiveTagsRow.astro` + `TagWithLink.astro` (incluida la estructura interna de `Link.astro` para el subrayado en hover) que sustituye al `makeTagHtml()` previo, cuya maquetación (`tag-value-link`/`tag-value-text`) NO coincidía con el componente real usado en `event/[id].astro` — una inconsistencia de mirror previa a esta sesión. El sidebar vertical de escritorio (`#overlay-tags-sidebar`, `lg:flex-col`) sigue usando `makeTagHtml()` sin cambios: es un layout distinto (etiqueta/valor apilados a lo largo de una columna de altura fija), no la fila horizontal a la que aplica esta decisión.
     - `updateAdaptiveTagsRow()` pasa de estar anidado dentro de `initHomePage()` a vivir en el ámbito del módulo de `index.astro`, porque `renderOverlayEvent()` (que puebla la fila del overlay) no es un closure de `initHomePage()`.
  6. **Panel del mapa tapa el slider**: `syncSheetTop()` media antes `slider.getBoundingClientRect().bottom` (el bottom sheet arrancaba justo debajo del slider, dejándolo visible bajo el dim); ahora mide `.top` — el bottom sheet (`<lg`, `--mel-sheet-top`) sube hasta el borde superior del slider y lo cubre por completo.
  7. **Limpieza**: eliminado el bloque CSS `.event-tags-row` (media query `max-width:1023px` con `border-left`/`padding-left` para simular divisores) de `global.css`, ya sin ningún consumidor tras la migración — y la clase `event-tags-row`, ya inerte, de los dos sidebars verticales de escritorio que quedaban (`#overlay-tags-sidebar`, y su equivalente en `event/[id].astro`).
- **Motivo**: extender la lógica de D-059 (ancho igual con caída a contenido, medida por JS real) a los otros dos lugares del sitio con el mismo patrón visual, evitando divergencias de maquetación entre instancias (regla 7 de AGENTS.md) y dando al Toggle y a la fila de tags el comportamiento a pantalla completa que el propietario especificó.
- **Consecuencias**: verificado en navegador — 1440px: toolbar en `grid-equal` compartiendo línea con el Toggle (`toggleShares:true`). 900px: Toggle solo en su línea, `toggleShares:false`, `toggleRect.right` coincide exactamente con el borde derecho del contenedor (mismo padding que el resto de la página), gap vertical medido de exactamente 32px. 500px y 390px (detalle de evento, estático y overlay): fila en `flex-content`, borde derecho de la fila coincide exactamente con el ancho del viewport (sangrado real, no solo scroll interno) tras el fix de `flex-shrink:0`. Estructura del panel del mapa confirmada como `highlight-unit`/`filter-tag` idéntica a la del toolbar. La verificación visual del propio mapa (tiles, marcador → apertura de panel) no fue posible en este entorno de navegador en sandbox (el contenedor del mapa no renderiza tiles aquí, ajeno a este cambio); pendiente de una comprobación manual del propietario en un navegador real para el flujo completo de apertura del panel y el nuevo tapado del slider.

## D-061 · Cuatro correcciones sobre D-060: ancho máximo de 176px por tag, fix de carrera con la carga de fuentes (causa real del salto a dos líneas), grid del overlay sin altura fija (fix del solape con la navegación), panel del mapa con ancho mínimo de 320px

- **Contexto**: el propietario reportó, con dos capturas, dos bugs reales sobre el trabajo de D-060 y pidió dos ajustes de diseño más: (1) en la fila de tags horizontal del detalle de evento, "hay segundos en los que las tags llegan a tener dos líneas" y en esa misma captura "la fuente no es la que debería (roman Lora)" — dos síntomas juntos en el mismo instante; (2) en el layout de escritorio del detalle de evento (overlay SPA), el bloque de navegación Anterior/Siguiente llegaba a solaparse con el contenido de la página (el mínimo debe ser 40px, norma ya vigente en el resto de la página); (3) ancho máximo de 176px por tag, contando el divisor vertical que ya forma parte del componente; (4) ancho mínimo de 320px para el panel lateral de eventos del mapa.
- **Investigación**: los dos síntomas del punto (1) apuntaban a la misma causa — una condición de carrera con la carga de fuentes web. `updateAdaptiveTagsRow()` mide el ancho natural real de cada tag para decidir entre modo `grid-equal` y `flex-content`, pero se ejecuta por primera vez en `astro:page-load`, cuando la fuente Lora todavía no ha terminado de cargar — esa medición usa entonces la fuente de repuesto (más estrecha), puede decidir erróneamente que un reparto igual SÍ cabe, y cuando Lora termina de cargar (más ancha) el texto ya no cabe en la columna asignada y se ve forzado a dos líneas — coincidiendo exactamente con el instante en que la fuente todavía no era la correcta. El punto (2) no tenía relación con D-060 en sí: la rejilla de 3 columnas del overlay SPA (`index.astro`) conservaba un `lg:h-[400px]` fijo en el contenedor de la propia rejilla, heredado de un esquema de posicionamiento de la navegación anterior a D-055 (el propio comentario en el código mencionaba `mt-[280px]`, el mecanismo que D-055 sustituyó) — con un evento cuya lista de artistas hace que la columna 3 sea más alta que 400px, esa altura fija hacía que el bloque de navegación (un hermano posicionado justo después de la rejilla, con `pt-[104px]`) midiera su holgura desde el borde INFERIOR ARTIFICIAL de la rejilla (400px) en vez de desde el borde real de la columna 3, produciendo el solape. `event/[id].astro` nunca tuvo esa altura fija en su rejilla — una inconsistencia de mirror más, previa a esta sesión.
- **Decisión**:
  1. **Ancho máximo de 176px por `highlight-unit`** (divisor + tag juntos): nueva regla `.adaptive-tags-row .highlight-unit { max-width: 176px }` en `global.css`, aplicada en los dos modos por igual — en `grid-equal` el tag simplemente deja de estirarse dentro de una columna más ancha en vez de ocupar todo el hueco.
  2. **Fix de la carrera con las fuentes**: se añade `document.fonts.ready.then(...)` como nuevo punto de re-medición en las tres instancias — dentro del bloque ya existente en `event/[id].astro` (que ya reforzaba `ensureScrollRunway()`/`updateStickyImage()` por el mismo motivo) y como bloque nuevo en `index.astro`, que re-mide `updateHomeToolbarLayout()` siempre y las filas del panel del mapa/overlay solo si están abiertas en ese momento (las cerradas ya reciben una medición fresca la próxima vez que se poblan). Además, por seguridad adicional (nunca debe pasar, pero se refuerza explícitamente), la etiqueta de cada tag gana `white-space: nowrap` tanto en `TagWithLink.astro` como en su espejo `makeAdaptiveTagHtml()` del overlay.
  3. **Fix del solape de navegación**: se elimina el `lg:h-[400px]` de la rejilla de 3 columnas del overlay SPA (`index.astro`) — la rejilla pasa a medir lo mismo que su columna más alta (`items-start`, sin altura impuesta), igual que ya hacía `event/[id].astro`. El mecanismo de D-055 (`mt-auto`/`pt-[104px]`) ya calculaba correctamente el hueco mínimo; el bug estaba únicamente en que medía desde un borde artificial.
  4. **Ancho mínimo del panel del mapa**: `min-width: 320px` añadido junto a la fórmula de 4 columnas de `#map-side-panel.side-panel-open` en `lg+` — la fórmula sola podía bajar de 320px justo en el extremo inferior del rango `lg` (~1024px de ancho de página), igual que ya se protegía el Toggle (D-045).
- **Motivo**: (1)-(2) corrigen bugs reales verificados mediante medición en navegador, no solo apariencia; (3)-(4) son ajustes de diseño explícitos del propietario, coherentes con los límites (`min-width`) ya establecidos en el resto de componentes del sistema (Toggle, D-045).
- **Consecuencias**: verificado en navegador — a 1000px con valores largos ("Santa Olaja de Porma"), el tag de Localidad topa exactamente en 176px de ancho con elipsis, sin pasar nunca a dos líneas, en cualquier punto del rango de anchos probado (500–1023px). El bloque de navegación del overlay, probado con eventos con listas de artistas más altas que 400px en varios anchos (1024–1440px), mantiene siempre un hueco ≥104px (nunca por debajo del mínimo de D-055, y muy por encima del mínimo de 40px pedido) — no se logró reproducir un caso con datos reales del sitio donde la columna 3 superase los 400px por mucho margen, pero el mecanismo ya no depende de esa condición: la causa estructural (altura fija en la rejilla) queda eliminada. Ancho mínimo del panel del mapa y máximo de 176px por tag verificados por lectura de CSS/DOM (el propio mapa no renderiza tiles en el navegador de este entorno sandbox, limitación ya señalada en D-060).

## D-062 · La fuente incorrecta en la fila de tags del overlay NO era una condición de carrera: CSS con scope de Astro nunca llega a HTML inyectado por `innerHTML`

- **Contexto**: el propietario, probando en Chrome real tras D-061, confirmó que la fuente incorrecta de los valores de tag en el detalle de evento (overlay SPA) es permanente, no intermitente — "esa fuente no se cambia nunca que yo vea. Parece más un bug que otra cosa" — contradiciendo el diagnóstico de D-061 (que lo atribuía a una carrera con `document.fonts.ready`).
- **Investigación**: medido directamente en navegador (`getComputedStyle().fontFamily`), los 4 de 5 tags CON enlace (Lugar/Localidad/Organiza/Diseño) renderizaban en `"Space Grotesk", sans-serif` (la fuente del cuerpo) en vez de Lora; el único tag SIN enlace (Fecha) sí renderizaba correctamente. La causa: el estilo real de un enlace de tag (fuente, color, elipsis, subrayado en hover) vive en el bloque `<style>` con scope de componente de `Link.astro` (clases `.mel-link-active`/`.mel-link-underline`) — Astro compila ese scope a un selector con un atributo hasheado por componente que solo añade a los elementos que él mismo renderiza en el servidor. `makeAdaptiveTagHtml()` (el espejo a mano para `#overlay-tags-sidebar-mobile`, D-060) inyecta su HTML vía `innerHTML` en cliente, así que sus elementos NUNCA reciben ese atributo — las reglas con scope simplemente no matchean nunca, con o sin carrera de fuentes de por medio.
- **Decisión**: reescrito el `<a>` de `makeAdaptiveTagHtml()` para llevar toda esa maquetación como utilidades de Tailwind explícitas en el propio atributo `class` (`font-serif font-medium text-[16px] leading-[24px] tracking-[0.16px] text-mel-text-secondary hover:text-mel-action-primary overflow-hidden text-ellipsis whitespace-nowrap`, y `bg-current` en el span del subrayado) en vez de depender de las clases `.mel-link-active`/`.mel-link-underline` con scope. El `<span>` sin enlace también gana las mismas utilidades de overflow/elipsis explícitas por la misma razón (su propio `.tag-count-val` con scope, de `TagWithLink.astro`, tampoco llegaba a aplicar — sin efecto visible aquí porque el texto era corto, pero el mismo bug de fondo).
- **Motivo**: la revisión de D-061 (medir tras `document.fonts.ready`) seguía siendo válida como mejora, pero no abordaba la causa real de este síntoma concreto — un mirror JS que replica clases con scope de Astro sin poder replicar el propio scope.
- **Consecuencias**: verificado en navegador — los 4 tags con enlace pasan de `"Space Grotesk", sans-serif` a `Lora, Georgia, Cambria, "Times New Roman", Times, serif`, igual que el tag sin enlace y que la página estática `event/[id].astro` (que nunca tuvo este bug, al usar el componente `TagWithLink`/`Link` real vía SSR). Lección para el futuro (AGENTS.md regla 7): cualquier mirror JS de un componente Astro debe replicar SU MAQUETACIÓN COMO UTILIDADES EXPLÍCITAS, nunca asumir que una clase con el mismo nombre heredará el CSS de un `<style>` con scope del componente original — ese CSS no es alcanzable fuera del propio render de Astro.

## D-063 · Colchón de seguridad bajo la foto fijada del detalle de evento durante el scroll

- **Contexto**: el propietario pidió que, durante el scroll (mientras la foto fijada del detalle de evento encoge y el resto del contenido pasa por debajo, D-032/D-034), la caja de la foto tenga un margen o padding con color de fondo, para quedar siempre por encima del texto que scrollea por debajo sin dejarlo asomar.
- **Decisión**: `updateStickyImage()` (`event/[id].astro`) y `updateOverlayStickyImage()` (`index.astro`) añaden `padding-bottom: 24px` a la caja fijada (`#detail-image-sticky`/`#overlay-image-sticky`, ya con `bg-mel-bg-primary` opaco) SOLO mientras está en modo `position:fixed` (encogiendo/encogida) — se limpia explícitamente en los otros dos estados (reposo sin scroll, y escritorio `≥1024px`) para no sumarse al hueco de 32px en reposo que ya se había señalado como no deseado en una ronda anterior de esta misma sesión. Al leerse `imageSticky.getBoundingClientRect().height` en cada tick para calcular el hueco fijo del sentinel, el colchón queda automáticamente incorporado a ese cálculo sin más cambios.
- **Motivo**: absorber cualquier margen de imprecisión entre el cálculo JS (que corre en cada evento `scroll`, en el hilo principal) y el pintado real durante un scroll rápido o con inercia, extendiendo el área opaca de la caja un poco más allá del borde real de la foto en vez de terminar exactamente en él.
- **Consecuencias**: la medición del hueco entre el borde inferior de la caja y el texto que le sigue (`updateStickyImage`/sentinel) se verificó consistente en navegador tras el cambio. La verificación visual de un scroll real con inercia/momentum no fue posible en este entorno sandbox (las simulaciones de gesto de scroll de la herramienta se comportaron de forma inconsistente frente a `window.scrollTo()` directo, sin relación con el código del sitio) — pendiente de confirmación visual del propietario en un navegador real, igual que otras verificaciones de esta sesión bloqueadas por el mismo motivo.

## D-064 · Tag "Promotores" en el panel del mapa, más separación entre la toolbar y la Galería durante el scroll, contenedores de scroll de Galería/Lista hasta el borde real de la pantalla

- **Contexto**: tres peticiones del propietario: (1) añadir el conteo de Promotores (organizadores únicos) a las tags del panel de eventos del mapa (lateral en escritorio, bottom sheet en móvil — es el mismo panel), como última tag a la derecha, igual que en la toolbar de la home; (2) en escritorio, los elementos de la Galería quedaban demasiado pegados a la toolbar durante el scroll — pidió separar `#view-galería` 16px de la toolbar y restar esos mismos 16px de su padding superior; (3) en las vistas de Galería y Lista, el contenedor principal que hace scroll debe llegar hasta el borde real (inferior) de la pantalla.
- **Decisión**:
  1. **Promotores en el panel del mapa**: `AdaptiveTagsRow` del panel (`#side-panel-tags-container`) gana una 4ª tag `Promotores` (D-060). `populateSidePanel()` calcula un `promotersSet` a partir de `evt.organiza` por cada evento del grupo, con las mismas exclusiones que ya usan los otros conjuntos del panel y que las stats de la toolbar (`desconocido`/`varios` fuera), y actualiza `.filter-tag[data-category="Promotores"] .tag-count-val` igual que Eventos/Artistas/Diseñadores.
  2. **Separación toolbar↔Galería en escritorio**: `#view-galería` pasa de `pt-[24px]` fijo a `pt-[24px] lg:pt-[8px] lg:mt-[16px]` — en escritorio, 16 de esos 24px pasan de ser *padding* (que vive DENTRO del contenedor con scroll, y por tanto desaparece nada más empezar a hacer scroll, dejando las tarjetas pegadas a la toolbar) a ser *margin* (fuera del contenedor con scroll, permanece siempre). El hueco hasta la primera fila en reposo no cambia (8+16=24, igual que antes); el hueco DURANTE el scroll ahora tiene un mínimo garantizado de 16px que nunca desaparece.
  3. **Contenedores de scroll hasta el borde real**: `#view-galería` y `#view-lista` ganan `-mb-[3vh]`, que cancela exactamente el `pb-[3vh]` calibrado de la página (rule 9 de AGENTS.md — el propio padding NO se toca, solo se cancela para estos dos contenedores concretos) empujando su propio borde inferior hasta el borde real del contenedor `h-screen` de la página, que coincide con el borde inferior real de la pantalla — mismo recurso de márgenes negativos que ya usa `#view-galería` en los lados (`-ml-[44px]`/`w-[calc(100%+88px)]`). En Lista, como el propio scroll ocurre en los hijos `flex-1` (`#list-mobile-cards`/`#list-table-wrapper`), extender `#view-lista` es suficiente — ambos se estiran con él.
- **Motivo**: (1) es paridad de datos con la toolbar, pedida explícitamente; (2)-(3) son bugs de sensación de scroll — elementos pegados a la toolbar y una franja muerta de página en blanco bajo el área interactiva — corregidos sin tocar el espaciado vertical calibrado del resto de la página (rule 9).
- **Consecuencias**: verificado en navegador — 1440px: `#view-galería`/`#view-lista` llegan exactamente a `y = innerHeight` (900px de 900px de viewport), antes se quedaban ~27px cortos (el `pb-[3vh]` de la página). El panel del mapa expone `data-category="Eventos"/"Artistas"/"Diseñadores"/"Promotores"` en ese orden. Comportamiento en móvil sin cambios (sin `lg:`, sigue en `pt-[24px]` puro, y `-mb-[3vh]` también llega al borde real ahí). No se pudo verificar el panel del mapa con datos reales de un marcador (el mapa no renderiza tiles en el navegador de este entorno sandbox, limitación ya señalada en D-060) — verificado por lectura de código y estructura DOM en su lugar.
- **Corrección (D-065)**: el `-mb-[3vh]` de `#view-lista` descrito en el punto 3 resultó ser un error — ver D-065, que lo revierte.

## D-065 · Fix real de la paginación de Lista (regresión de D-064), bug de `hidden` permanentemente eliminado en la tabla/tarjetas de Lista, borde superior de la tabla, galería verificada

- **Contexto**: revisión del propietario tras D-064, con captura: en la vista de Lista, a ciertos anchos de pantalla aparecían SIMULTÁNEAMENTE los dos estilos de lista (tarjetas compactas Y tabla), la tabla parecía no tener borde superior sobre la cabecera, y el contenedor de tarjetas en móvil mostraba "dos bordes horizontales a sangre por los dos lados" que se leían como un defecto. Pidió además confirmar que el espaciado vertical de 24px de la Galería seguía intacto tras D-064, y preguntó si el hover ausente en la fila horizontal de tags del detalle de evento era intencional (al no verse nunca en escritorio a ese ancho) o un bug.
- **Investigación**:
  1. **Causa real de "dos estilos a la vez"**: `#list-table-wrapper` (tabla, escritorio) usa `hidden min-[440px]:block` como su ÚNICA regla de visibilidad responsive — su clase base `hidden` es la que lo oculta por debajo de 440px. `filterArchives()`, al gestionar el estado vacío, hace `listTableWrapper.classList.remove('hidden')` incondicionalmente en cuanto hay resultados (el caso normal, prácticamente siempre) — eliminando PARA SIEMPRE esa clase base responsive (nada vuelve a añadirla salvo una búsqueda sin resultados). Sin `hidden`, por debajo de 440px no queda ninguna regla de `display` aplicable y el navegador usa el `block` por defecto de un `<div>` — la tabla queda visible a la vez que las tarjetas móviles (que si permanecen correctamente ocultas/mostradas porque su propio par responsive es `block`/`min-[440px]:hidden`, sin depender de la clase `hidden` en ningún momento). Confirmado por lectura directa de `className` en el DOM vivo tras cualquier filtro/carga inicial. El "borde doble a sangre" del móvil era el mismo bug visto de otra forma: con la tabla también visible, se veían el borde propio de las tarjetas (con sangre, D-060) Y el borde propio de la `<table>` (sin sangre) a la vez.
  2. **Pérdida del borde superior de la tabla**: `<table class="... border-t border-b ...">` con `border-collapse:collapse` y un `<thead>` `sticky` sin fondo propio (el fondo opaco vive en cada `<th>`) — el borde superior de la TABLA, al colapsar con el borde (inexistente) de las celdas de la primera fila, queda pintado en una capa que el `<thead>` sticky (con las celdas opacas encima) tapa visualmente.
  3. **Regresión propia de D-064**: el `-mb-[3vh]` añadido a `#view-lista` en la sesión anterior asumía que era el único elemento que necesitaba llegar al borde inferior real, igual que `#view-galería` — pero a diferencia de la Galería, `#pagination-controls` es un HERMANO flex de `#view-lista` dentro de `#content-views` (`flex-col`), no algo dentro de él. Un margen negativo inferior en un ítem flex tira hacia arriba del hermano que le sigue en el flujo — la paginación quedaba empujada sobre las últimas filas de la tabla en vez de descansar debajo con espacio hasta el borde de la pantalla. Confirmado en navegador con captura del propio propietario.
  4. **Espaciado de la Galería**: medido en navegador — ~22.9px entre tarjetas de la misma columna (el algoritmo de `row-span` de D-015 cuantiza a la rejilla de 4px, así que no da nunca un 24 exacto; es el mismo comportamiento de siempre, no una regresión de D-064).
  5. **Hover de los tags horizontales**: verificado en navegador (`element.matches(':hover')` + `getComputedStyle().color` tras un hover real simulado) en `event/[id].astro` Y en el overlay — en ambos, el color cambia correctamente al pasar el ratón. No estaba desactivado a propósito; simplemente nunca se ve en un ordenador real porque esa fila solo existe por debajo de `lg` (1024px), un ancho al que un usuario de escritorio con ratón solo llega si encoge la ventana manualmente — exactamente la sospecha del propietario, confirmada.
- **Decisión**:
  1. El toggle de visibilidad por estado vacío para `listTableWrapper`/`listMobileCards` pasa de `classList.add/remove('hidden')` a `style.display = 'none'`/`''` — un estilo inline se superpone/limpia sin tocar el par de clases responsive `hidden min-[440px]:block` / `block min-[440px]:hidden` que ya gobiernan cada uno por su cuenta.
  2. Los 6 `<th>` de la cabecera ganan `border-t` (ya tenían `border-b border-l border-r`) — el borde superior pasa a pintarse como parte de la propia celda opaca y sticky, no como borde de tabla colapsado que puede quedar tapado.
  3. Revertido el `-mb-[3vh]` de `#view-lista` (D-064) — la paginación vuelve a su posición correcta, como hermano flex normal justo debajo de la tabla/tarjetas, con el hueco `pt-10 pb-6` + el `pb-[3vh]` de la página (sin cancelar) hasta el borde real.
  4. Sin cambios de código para la Galería (espaciado intacto) ni para el hover (ya funcionaba).
- **Motivo**: los tres primeros son bugs reales — dos de ellos preexistentes a esta sesión (el de `hidden` y el del borde de tabla), uno introducido por D-064 (el de la paginación). Los dos últimos eran preguntas de verificación, no bugs.
- **Consecuencias**: verificado en navegador — a 430px (`min-[440px]` sin cumplirse), `list-table-wrapper` mide `display:none` y solo se ven las tarjetas; `list-mobile-cards` conserva un único borde superior e inferior, ambos a sangre (comportamiento correcto una vez la tabla deja de superponerse). Cabecera de tabla con `border-top-width:1px` verificado por `getComputedStyle()`. Paginación de vuelta justo debajo de la tabla, sin solape, con el hueco de siempre hasta el borde de pantalla. Hover confirmado con cambio de color real (`rgb(154, 25, 51)`, el mismo tono en ambas instancias) tras simular un hover genuino — las primeras lecturas de "no hay hover" durante la investigación fueron falsos negativos de la propia herramienta de simulación de ratón de este entorno sandbox (intermitente entre llamadas), no del sitio.
- **Corrección (D-066)**: el hover en sí SÍ cambiaba de color (color confirmado), pero el propietario detectó que el chevron seguía sin aparecer — esa parte de esta entrada fue una verificación incompleta, no una verificación falsa: comprobé el color y no el icono. La causa real (un `overflow:hidden` en `Link.astro`) y el fix están en D-066.

## D-066 · El chevron ausente SÍ era un bug real (overflow:hidden en Link.astro), paginación de Lista incorporada al scroll (no siempre visible), fix de fondo de la cabecera de tabla, bordes de Lista en móvil eliminados

- **Contexto**: el propietario, con capturas nuevas, corrigió tres cosas de D-065 y añadió una cuarta: (1) el chevron de los enlaces en los tags horizontales del detalle de evento seguía sin aparecer — pidió explícitamente no dar por bueno un hover a medias; (2) la paginación de Lista "tiene problemas para aparecer al entrar en modo lista" y — aclaración clave — el pedido original NUNCA fue que estuviera siempre visible, sino que apareciera al final del scroll; (3) la tabla seguía sin borde superior visible y además se veía contenido colándose por encima de la cabecera durante el scroll; (4) las líneas horizontales del contenedor de tarjetas en móvil seguían ahí. Cerró con "No me gusta que me engañen" — la sesión, en consecuencia, prioriza verificación real (con el propio servidor de dev funcionando correctamente, ver más abajo) sobre confirmaciones basadas en lecturas de CSS computado sin comprobación visual directa.
- **Investigación — el chevron (causa real, no un falso negativo)**: `Link.astro`'s `.mel-link-active` (la clase del propio `<a>`) lleva `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` para truncar el texto del enlace. El SVG del chevron es HERMANO del span de texto dentro del MISMO `<a>`, posicionado `absolute left-full` — deliberadamente FUERA de la caja de contenido del enlace, sin ocupar espacio en el layout (comentario propio del componente: "takes NO layout space"). Ese `overflow:hidden` en el `<a>` recorta cualquier cosa posicionada fuera de su propia caja — incluido el chevron, SIEMPRE, en cualquier instancia de `Link.astro` con chevron activo en todo el sitio (no solo en la fila horizontal de tags de esta sesión). Confirmado de forma determinante: forzar estilos de depuración imposibles de no ver (fondo amarillo, borde azul, 40×40px) en el propio SVG seguía sin mostrar nada — hasta reiniciar el servidor de dev (ver nota de infraestructura) y repetir la prueba, momento en el que unas capturas honestas (no falsos positivos) confirmaron el recorte real.
  - **Nota de infraestructura descubierta durante esta investigación**: el servidor de Vite llevaba arrastrando un error real (`Failed to load url astro:server-app.js`, visible en sus logs) tras una sesión muy larga de HMR — esto invalidaba screenshots y lecturas de `window.innerWidth` de forma intermitente e impredecible (confirmado: `document.body.style.background = 'red'` no se reflejaba en la captura). Reiniciar el servidor (`preview_stop` + `preview_start`) lo resolvió. Cualquier verificación de esta sesión hecha ANTES del reinicio debe considerarse no fiable.
- **Decisión**:
  1. **Chevron**: en `Link.astro`, el span interno de texto gana su propia clase `mel-link-text` con `overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0` — el `<a>` (`.mel-link-active`) deja de tener overflow propio. El truncado del texto sigue funcionando exactamente igual (ahora ocurre en el span en vez de en el enlace), pero el chevron, ya no contenido por ningún `overflow:hidden` de un ancestro directo, se ve.
  2. **Paginación al final del scroll, no siempre visible**: `#pagination-controls` deja de ser un hermano flex fijo de `#view-lista` dentro de `#content-views` — se re-parenta por JS, en cada repoblado de la lista y en cada resize que cruce el breakpoint de 440px (D-057), como ÚLTIMO hijo de cualquiera que esté activo entre `#list-table-wrapper` y `#list-mobile-cards`. Al vivir dentro del contenedor con `overflow-y-auto`, solo se hace visible cuando el usuario llega al final del scroll — nunca antes. `#view-lista` recupera el `-mb-[3vh]` que D-065 había revertido (ya no hay ningún hermano flex al que ese margen negativo pueda perturbar).
  3. **Fondo de la cabecera de tabla**: `<thead>` gana `bg-mel-bg-secondary isolate` (antes solo cada `<th>` tenía fondo propio) — mejora la opacidad de la cabecera de forma verificable (ya no depende únicamente de las celdas individuales). **Limitación reconocida**: en algunos puntos concretos del scroll sigue viéndose una fila anterior asomando por encima de la cabecera — un problema de renderizado de `position:sticky` dentro de una `<table>` con `border-collapse`, un área conocida por ser conflictiva entre navegadores. Se probaron sin éxito, además del fondo opaco: `isolation:isolate`, `transform:translateZ(0)` + `will-change`, `border-collapse:separate`, `contain:paint`, y quitar `position:relative` de las celdas — ninguno lo resolvió por completo. La solución robusta real (cabecera "sticky" simulada por JS con `position:fixed`, como ya hace el sitio para la foto fijada del detalle de evento, D-032/D-034) es un cambio de mayor alcance que no se ha abordado en esta sesión — queda como deuda técnica documentada, no como "arreglado".
  4. **Bordes de Lista en móvil**: preguntado explícitamente al propietario (no una tercera suposición) — eliminados por completo: `#list-mobile-cards` pierde `border-t border-b` (las tarjetas ya tienen su propio divisor entre filas).
- **Motivo**: (1) y (4) son bugs/decisiones de diseño confirmados con evidencia directa, no con lecturas parciales de CSS computado. (2) corrige una interpretación equivocada de D-064/D-065 (asumí "que llegue al final de la pantalla" cuando el pedido real era "que aparezca al final del scroll, no como elemento fijo"). (3) es una mejora parcial honesta, no una solución completa.
- **Consecuencias**: verificado en navegador tras reiniciar el servidor de dev — chevron visible junto a "Dickens Tavern" al pasar el ratón (capturas reales, no solo CSS computado). `#pagination-controls` confirmado como último hijo de `#list-table-wrapper`/`#list-mobile-cards` según el ancho; invisible en reposo, visible al hacer `scrollTop = scrollHeight`. Tarjetas de Lista en móvil sin bordes de ningún tipo. La cabecera de tabla es visiblemente más sólida que antes, pero el asomo de contenido durante el scroll en puntos concretos NO queda resuelto — comunicado como tal, no como corregido.

## D-067 · Chevron ausente en TODOS los tags de evento (bug real de layout, no solo el de Link.astro), paginación: bug de carga real + centrado horizontal + espaciado, vistas de inicio subidas 24px en móvil, tabla aparcada

- **Contexto**: nueva ronda de revisión del propietario, con capturas: (1) el chevron seguía sin verse en ALGUNOS tags (ej. "S. Andrés del Rabanedo" en Localidad) y, más grave, el texto se desbordaba del propio componente sin truncar con puntos suspensivos — pidió que estuviera "componetizado y funcione siempre igual" en todas las instancias, con la opción explícita de aparcar esto para una auditoría dedicada si resultaba muy grande; (2) la paginación de Lista "sigue teniendo problemas de carga al entrar en Lista por primera vez", además de pedir que se mantenga centrada horizontalmente aunque haya scroll horizontal, y algo más pegada a la tabla arriba con más aire abajo; (3) el asomo de contenido sobre la cabecera sticky de la tabla — aparcado explícitamente por el propietario; (4) subir 24px el contenedor principal de Galería/Mapa/Lista en las vistas de inicio en móvil (imagen con referencias de 32px/24px).
- **Investigación — el desbordamiento del chevron/texto (causa real, distinta de D-066)**: D-066 arregló que Link.astro clip-eara el chevron con su propio `overflow:hidden`, pero introdujo (o dejó sin cubrir) un problema de layout previo: `.highlight-unit` está capado a `max-width:176px` (D-061), pero el `TagWithLink` que contiene llevaba `shrink-0` en su clase — dentro de un flex container capado, un hijo con `flex-shrink:0` se niega a encogerse por debajo de su ancho de contenido natural, así que el propio `.filter-tag` renderizaba a su ancho de texto completo (178.4px medido para "S. Andrés del Rabanedo") IGNORANDO el cap de 176px del padre — desbordando visualmente hacia la siguiente tag en vez de truncar con elipsis. Confirmado por medición directa (`getBoundingClientRect()`): `tagRect.width` (178.4px) > `unitRect.width` (176px, el cap). El chevron en sí, tras el fix de D-066, SÍ se posicionaba correctamente — el problema real que quedaba era este desbordamiento del propio texto, que además de verse mal probablemente hacía que el chevron cayera fuera del área visible/coherente en algunos casos.
- **Investigación — el bug real de "carga" de la paginación**: `switchView()` (se ejecuta en cada click de pestaña Y en la carga inicial vía `?view=lista`) tenía su PROPIA lógica de `classList.remove('hidden')` para la paginación, completamente independiente de la lógica de re-parentado que D-066 añadió solo en `filterArchives()`/`performDOMUpdates()` — mostraba la paginación en su posición SSR, todavía sin reubicar, la primera vez que se entraba en Lista. Además, `#pagination-controls` no tenía NINGÚN estado `hidden` en su propio marcado SSR (a diferencia de `#view-mapa`/`#view-lista`, que sí lo tenían) — un FOUC real: visible en su posición de hermano flex durante el primer frame de cualquier carga de página, antes de que corriera el JS de `initHomePage()`, independientemente de qué vista estuviera realmente activa.
- **Nota de infraestructura, otra vez**: el servidor de Vite volvió a romperse (mismo error `astro:server-app.js`) tras esta ronda de ediciones — reiniciado de nuevo. A partir de este punto, toda verificación de esta entrada se hizo leyendo el HTML servido directamente por `curl` contra el servidor de dev, evitando por completo la captura de pantalla del navegador (que había demostrado no reflejar cambios reales incluso con el servidor sano, sin causa identificada) — el método más fiable disponible en este entorno.
- **Decisión**:
  1. **Chevron/truncado**: en `AdaptiveTagsRow.astro` y en el espejo `makeAdaptiveTagHtml()` del overlay, el `TagWithLink`/`.filter-tag` pierde `shrink-0` de su clase (se queda solo `min-w-0 w-auto`) — con `flex-shrink` en su valor por defecto, el tag SÍ se encoge cuando su `.highlight-unit` padre está capado a 176px, dejando que el `overflow:hidden`/`text-overflow:ellipsis` del span interno (ya corregido en D-066) trunque de verdad. Un `.highlight-unit` sin ningún cap de por medio sigue renderizando a su ancho natural exactamente igual que antes — el cambio solo tiene efecto cuando de verdad hace falta encoger.
  2. **Paginación — bug de carga**: nueva función compartida `relocatePaginationControls()`, llamada tanto desde `filterArchives()`/`performDOMUpdates()` como desde `switchView()` (antes cada una tenía su propia lógica de visibilidad, solo una re-parentaba) y desde el listener de resize — un único punto de verdad. Además, `#pagination-controls` pasa a arrancar con `hidden` en su propio marcado SSR (antes solo tenía `flex`, sin ningún estado oculto de base) — elimina el FOUC de raíz.
  3. **Paginación — centrado horizontal + espaciado**: `#pagination-controls` gana `sticky left-0 right-0` (sin `top`/`bottom` — los dos ejes de `sticky` son independientes, así que esto SOLO fija el eje horizontal) para quedarse centrada dentro de lo que esté realmente visible en pantalla aunque `#list-table-wrapper` esté desplazado horizontalmente (D-057, tabla ancha de escritorio). `pt-10 pb-6` pasa a `pt-6 pb-10` — más pegada a la tabla/tarjetas de arriba, más aire hasta el borde inferior de la pantalla.
  4. **Tabla sticky aparcada**: movida de "Deuda Técnica Registrada" a "Problemas Conocidos (Aparcados Explícitamente)" en `roadmap.md` — decisión explícita del propietario, no una limitación silenciada.
  5. **Vistas de inicio 24px más arriba en móvil**: `#view-galería` (`pt-[24px]`→`pt-0`, conserva `lg:pt-[8px]`), `#view-mapa` (`top-[24px]`→`top-0 lg:top-[24px]`), `#view-lista` (`pt-[24px]`→`pt-0 lg:pt-[24px]`) — las tres vistas seguían alineadas entre sí (ya lo estaban a propósito) y ahora arrancan 24px más cerca del toggle Galería/Mapa/Lista en móvil; escritorio sin cambios salvo donde D-064 ya lo había tocado (Galería).
- **Motivo**: (1) y (2) eran bugs reales de layout/timing con causas concretas identificadas por medición, no vaguedad de CSS. (3) es un ajuste de diseño explícito. (5) es la petición literal del propietario, con las tres vistas moviéndose juntas para no romper la alineación que ya tenían entre sí.
- **Consecuencias**: verificado leyendo el HTML servido por `curl` (no capturas de pantalla, ver nota de infraestructura) — `.filter-tag` sin `shrink-0` en el HTML de `event/[id].astro`; con una cadena forzada muy larga por JS, el tag se mantiene en 151px (176 menos divisor) y trunca con elipsis (`scrollWidth:522 > clientWidth:151`) en vez de desbordar. `#pagination-controls` arranca `hidden` en el HTML servido, tanto en `/` como en `/?view=lista`. `#view-galería`/`#view-mapa`/`#view-lista` confirmados con sus nuevas clases en el HTML servido, y medidos en el DOM real: los tres arrancan a exactamente 32px del borde inferior de la toolbar en móvil (390px), el mismo valor para los tres. Pendiente de una confirmación visual del propietario en un navegador real, dado que las capturas de este entorno no fueron fiables en ningún punto de esta sesión.
- **Seguimiento del propietario tras esta entrada**: el chevron/elipsis del punto 1 sigue sin verse para el propietario pese a que la medición (`scrollWidth`/`clientWidth`) decía que el truncado era correcto — pidió explícitamente que se recuerde revisar esto a fondo y estandarizarlo en todas las instancias del sitio (ver "Pendiente de Auditoría" en `roadmap.md`, no cerrar como resuelto). El bug de carga de la paginación (punto 2) y el aparcado de la cabecera sticky (punto 3) van "bien en algunos navegadores y mal en otros" — añadida una comprobación cross-browser explícita al flujo de publicación en `development.md`.

## D-068 · Los tiradores del slider de fecha "tiemblan" en táctil: falta `touch-action: none`

- **Contexto**: el propietario, inspeccionando la web con las herramientas táctiles de Chrome/Comet, describió que los tiradores del slider de fecha "hacen cosas raras, se rayan, tiemblan" — con la sospecha de que coincide con un amago de scroll horizontal de la página entera (un pequeño rebote lateral), y que ese mismo comportamiento podría estar relacionado con los problemas de la tabla de Lista.
- **Investigación**: `TimeSlider.astro` arrastra los tiradores por completo a mano (`pointerdown` en el tirador, `pointermove`/`pointerup` en `window`, con `render()` recalculando `style.left`/`style.right` en cada movimiento) — pero ni los tiradores (`SliderHandler.astro`) ni el track (`#slider-track-wrapper`) declaraban ningún `touch-action`. Sin eso, un arrastre táctil que empieza sobre un tirador puede ser interpretado A LA VEZ por el JS (que mueve el tirador) y por el reconocimiento de gestos nativo del navegador (que intenta paneár/hacer scroll de la página) — los dos compitiendo por el mismo gesto, lo que se percibe como el tirador temblando mientras la página rebota lateralmente un instante. Comprobado por lectura de código que NINGÚN listener de `pointermove`/`pointerdown` llama a `preventDefault()` fuera del propio `pointerdown` inicial (que solo cubre el instante de apoyar el dedo, no el arrastre en sí) — consistente con el síntoma descrito. Comprobado también (`document.documentElement.scrollWidth` vs `window.innerWidth`, en Galería y en Lista, a 390px) que la página NO tiene overflow horizontal genuino en reposo — el rebote no viene de un elemento desbordando el ancho de la página, sino específicamente de esta competencia de gestos táctiles en el propio slider.
- **Decisión**: añadido `touch-none` (Tailwind, `touch-action:none`) a `#min-handle`/`#max-handle` (vía `SliderHandler.astro`, componente compartido) y a `#slider-track-wrapper` — le dice al navegador que no intente interpretar gestos táctiles sobre estos elementos como pan/scroll/zoom, dejando el 100% del control al JS que ya lo gestiona por completo.
- **Motivo**: es el fix estándar y ya establecido para esta clase de conflicto (slider/drag custom sobre táctil sin `touch-action`), aplicado en el punto exacto donde se origina — los propios elementos que reciben el gesto de arrastre.
- **Consecuencias**: verificado por lectura del HTML servido (`curl`) que la clase `touch-none` llega al marcado de ambos tiradores y del track. No fue posible verificar visualmente el arrastre táctil en este entorno (mismo problema de capturas de pantalla no fiables señalado en D-067, y este sandbox no tiene un dispositivo táctil real que probar) — pendiente de confirmación del propietario en un dispositivo/navegador táctil real. La sospecha sobre la tabla de Lista no se investigó en esta entrada — si el rebote de página desaparece con este fix pero la tabla sigue teniendo problemas propios, son causas distintas (la tabla ya tiene su propio problema conocido y aparcado, D-066/D-067).

## D-069 · Estilos de hover en los elementos del menú lateral (`SideMenu.astro`)

- **Contexto**: Se ajusta el estado hover de los elementos del menú lateral (`id="menu-item-home"`, `menu-item-intro`, etc.) para que el color de fondo pase a ser la variable completa de fondo secundario (`bg-mel-bg-secondary`), las letras cambien a `text-mel-action-secondary` y el icono chevron pase a `Action-Primary` (`text-mel-action-primary`).
- **Decisión**:
  1. En `src/components/SideMenu.astro`, se sustituye `hover:bg-mel-bg-secondary/40` por `hover:bg-mel-bg-secondary` en todos los enlaces de la lista del menú.
  2. El texto del enlace `<p>` utiliza `group-hover:text-mel-action-secondary`.
  3. El icono chevron `IconButton` utiliza `group-hover:text-mel-action-primary`.
- **Motivo**: Respetar la especificación de diseño donde el fondo y el texto del ítem del menú usan tono secundario en hover, mientras el chevron destaca en `Action-Primary`.
- **Consecuencias**: Al hacer hover sobre los enlaces del menú lateral, el fondo cambia a `bg-mel-bg-secondary`, el texto a `text-mel-action-secondary` y el chevron a `text-mel-action-primary`.

## D-070 · Padding de 32px a la derecha en `home-highlights-tags` (`AdaptiveTagsRow.astro`)

- **Contexto**: Se solicita ajustar el espaciado de la fila de highlights de la página principal (`id="home-highlights-tags"`) para aplicar un padding de 32px únicamente en el margen derecho (`pr-[32px]`).
- **Decisión**:
  1. En `src/pages/index.astro`, se asigna `class="pr-[32px]"` al componente `<AdaptiveTagsRow id="home-highlights-tags" tags={tags} />`.
- **Motivo**: Mantener el margen izquierdo alineado con la retícula de la página mientras se deja una reserva de 32px en el lateral derecho para el desplazamiento/scroll de la fila de tags.
- **Consecuencias**: El elemento `home-highlights-tags` cuenta con 32px de padding en su extremo derecho sin modificar el margen izquierdo.

## D-071 · Unificación del breakpoint de escritorio a `lg` (`1024px`) en todo el sitio

- **Contexto**: Anteriormente, la Página de Inicio (`index.astro`) utilizaba `md` (`768px`) para activar el padding superior dinámico `--mel-header-pt-desktop` y conmutar la cabecera, mientras que el Detalle de Evento usaba `lg` (`1024px`). Esto causaba una incoherencia en tablets (768px–1023px) donde la Home estaba en layout de escritorio y el detalle en layout móvil.
- **Decisión**:
  1. Se unifica el breakpoint de activación de escritorio a **`lg` (`1024px`)** en todas las vistas y componentes (`index.astro`, `exposiciones.astro`, `info.astro`, `SideMenu.astro` y `HeaderTitle.astro`).
  2. El relleno superior dinámico `--mel-header-pt-desktop` se activa a partir de `1024px` (`lg:pt-[var(--mel-header-pt-desktop)]`).
  3. La conmutación del título de cabecera (*"M.E.L."* vs *"Memoria Electrónica Leonesa"*) se realiza en `1024px` (`lg:hidden` / `hidden lg:inline`).
- **Motivo**: Mantener una coherencia óptica y geométrica del 100% entre todas las páginas del sitio y garantizar un comportamiento unificado de la cabecera, los márgenes y el menú lateral.
- **Consecuencias**: En pantallas `<1024px` la web se comporta de forma limpia en modo móvil/tablet en todas las vistas; a partir de `1024px` conmuta de forma perfectamente síncrona al modo escritorio en todas las páginas.

## D-072 · Eliminación del overlay SPA del detalle de evento — navegación real a `/event/[id]` ("Opción B")

> **Superada (parcialmente) por el Contrato de Navegación** en `architecture.md`. Sigue vigente lo esencial (una sola implementación del detalle, en `/event/[id]`), pero **ya no se navega con recarga dura**: home ⇄ evento usa el enrutado nativo de Astro con precarga. El mecanismo de `mel-return-state` que describe el punto 3 llegó a quedarse vacío en el código y se ha reimplementado; su alcance actual (rango de años, orden, página, lotes, scroll y cámara) está en el contrato.

- **Contexto**: al revisar la incoherencia de padding/breakpoints entre la Home y el Detalle de Evento, salió a la luz que la causa raíz era la propia arquitectura: el "overlay" de detalle (`#event-details-overlay` en `index.astro`) era en realidad una segunda implementación completa del detalle de evento, duplicada a mano junto a la página estática `/event/[id].astro` (regla 7 de AGENTS.md exigía mantenerlas en espejo). El propietario, en vez de seguir arreglando duplicados, pidió ir a la raíz: "La opción B con todo lo que sea necesario para que no perdamos capacidades como mostrar una navegación de eventos que tengan que ver con los filtros, recordar de dónde veníamos antes de entrar en el evento, etc." Se creó primero un punto de restauración (tag git `pre-overlay-removal`) antes de tocar nada.
- **Por qué esta migración, en concreto**:
  1. **Duplicidad**: dos implementaciones completas del detalle de evento (marcado + JS) que había que mantener sincronizadas a mano en cada cambio de diseño (regla 7 de AGENTS.md) — cualquier ajuste visual se aplicaba dos veces o se olvidaba en una de las dos, fuente directa de varios de los bugs de esta sesión y de sesiones anteriores.
  2. **Complejidad**: el overlay tenía su propia máquina de transiciones (FLIP, disolución de foto, imán de scroll, gestión de historial vía `?detail=`) que solo existía para simular una navegación — más de 1000 líneas de JS dedicadas exclusivamente a mantener viva esa ilusión, sin aportar ninguna capacidad que la página estática no pudiera tener por sí misma.
  3. **Calidad del enlace compartido**: `/?detail=MEL-XXXX` ya era una URL real y cargable — compartir un evento no era imposible antes. Pero la Home siempre pasaba `title="Galería de Diseño"` a `Layout.astro` sin importar el `?detail=` (el overlay nunca tocaba `document.title` ni ningún meta), así que ese enlace mostraba siempre el título genérico de la Home en la pestaña y en cualquier previsualización (WhatsApp, Twitter…), nunca el nombre del evento. `/event/[id].astro` sí pasa `title={eventData.title}` — comprobado comparando ambos `<Layout title=...>` en el código. Además, el contenido de esa URL específica pasa a estar en el HTML servido (SSR real por evento) en vez de depender de que se ejecute todo el JS de la Home primero, y abrir el enlace ya no obliga a cargar/inicializar los 50 eventos, la galería y el mapa solo para ver uno.
- **Investigación previa**: un comentario del propio código (`openLightbox()`, ya eliminado) revelaba que el overlay había sustituido un intento anterior de navegación real a `/event/…`, descartado entonces por chocar con la caché de snapshot del `ClientRouter` de Astro al navegar entre dos URLs `/event/[id]` distintas — de ahí que las propias flechas Anterior/Siguiente de `/event/[id].astro` ya usaran `reload={true}` (recarga dura) en vez de navegación suave. Se confirmó además que `/event/[id].astro` YA leía `?view=`/`?search=`/`?location=` de la URL para calcular su propio Anterior/Siguiente filtrado y para reconstruir el enlace de vuelta — infraestructura pensada desde el principio para ser navegada directamente, solo sin usar.
- **Decisión**:
  1. Navegación siempre a `/event/[id]` real (recarga dura vía `window.location.href`, mismo patrón que Anterior/Siguiente ya usaban) desde los tres puntos de entrada (tarjeta de galería/lista, fila del panel de mapa) — decisión explícita del propietario tras planteársela: priorizar la robustez ya probada frente a una transición animada tipo SPA que arriesgaba repetir el bug histórico de caché.
  2. Navegación con contexto de filtro ya existente: `?search=` (galería/lista, término activo) o `?location=` (panel de mapa, sala/recinto) + `?view=`, reutilizando el mecanismo ya construido en `/event/[id].astro` sin cambios en ese archivo.
  3. Nuevo mecanismo `saveReturnState()`/restauración en `sessionStorage` (clave `mel-return-state`) para lo que NO es estado compartible por URL: posición de scroll de Galería/Lista y cámara del mapa (centro + zoom). Se restaura tras el primer ciclo de `filterArchives()` del arranque (mismo punto de asentamiento que ya usa `gallerySettled`), porque `updateSlider()` reconstruye `#gallery-grid` un frame después del `switchView()` inicial y pisaba cualquier `scrollTop` fijado antes de ese punto.
  4. Eliminado por completo: marcado de `#event-details-overlay` (y su propio lightbox de imagen `#overlay-image-lightbox`), y las funciones `renderOverlayEvent`, `makeAdaptiveTagHtml`, `transitionToOverlayEvent`, `openDetailsOverlaySPA`, `closeDetailsOverlaySPA`, `setDetailParam`, `updateOverlayStickyImage`, `updateOverlayFixedTags`, `updateOverlayHeaderSpacer`, `ensureOverlayScrollRunway`, el atajo de teclado ↔/↔ para navegar dentro del overlay, y el deep-link `?detail=MEL-XXXX` (ya no hace falta: un deep-link ahora es simplemente visitar `/event/[id]` directamente).
  5. **Fuera de alcance, explícitamente**: el rango de años del slider (`minYear`/`maxYear`) NO se propaga a través de la navegación al detalle — antes de esta migración tampoco era una capacidad shareable/URL (solo vivía en memoria mientras el overlay no desmontaba la Home), y añadirla habría requerido tocar la posición de los tiradores del slider, área ya marcada como frágil y con un problema pendiente sin resolver (ver "Temblor del slider" en `roadmap.md`). Si se combina scroll de años + Anterior/Siguiente tras entrar en un evento, ese Anterior/Siguiente no queda acotado al rango de años — mismo comportamiento que ya tenía `/event/[id].astro` de forma independiente.
- **Motivo**: eliminar la duplicación de raíz en vez de seguir sincronizando dos implementaciones a mano; la Opción B ya tenía la mayor parte de su infraestructura de filtros construida y sin usar en `/event/[id].astro`, y el propio historial del proyecto ya había validado la recarga dura como la solución robusta al problema de caché del router.
- **Consecuencias**: verificado en navegador real (Chromium) — clic en tarjeta de galería/lista navega a `/event/[id]` con `?view=`/`?search=` correctos; Anterior/Siguiente respeta el término de búsqueda activo (confirmado con "ravers": navegación encadenada entre "FIV II"/"Presentación FIV III", ambos con `?search=ravers` en su propio href); el botón de cerrar vuelve a `/` con la vista y búsqueda restauradas; la posición de scroll de Galería se restaura correctamente tras el punto de asentamiento (900px probado, se restaura a 900px). El flujo del panel de mapa usa la misma función `navigateToEvent()` (mismo código ya probado con `search`), pero no se verificó visualmente por clic en un marcador real — los tiles de Google Maps no renderizan en este entorno sandbox (limitación preexistente, no relacionada con este cambio). `npm run build` pasa sin errores. Pendiente: confirmación visual del propietario en navegador real, y verificación cross-browser/táctil (ver `feedback_verification-rigor` en memoria del proyecto).
- **Bug introducido y corregido en la misma sesión**: al borrar por número de línea (`sed`) el CSS muerto de `#overlay-btn-me-presta`, se eliminó también la etiqueta `</style>` que cerraba el primer bloque `<style>` de `index.astro`, dejando el segundo `<style is:global>` abierto justo detrás sin que el primero se cerrara nunca — el navegador interpretaba el CSS resultante de forma impredecible, y la regla `#view-galería:not(.hidden) { display: block; }` (que fuerza la galería a fluir como bloque en vez de flex) dejaba de aplicarse. Síntoma reportado por el propietario: columnas de Galería a mitad de ancho (612px de 1224px, exactamente la mitad — dos hijos flex sin `flex-basis` explícito repartiéndose el espacio), Mapa y Lista con el mismo tipo de desajuste. Diagnosticado comparando `git diff` línea a línea (una `-</style>` sin su `+</style>` correspondiente) y confirmado midiendo `getComputedStyle` antes/después del fix. Corregido reintroduciendo la etiqueta de cierre; verificado en navegador que las tres vistas vuelven a su ancho/layout correcto. Lección para el propio proceso: al borrar bloques de CSS por rango de línea (`sed`/`Edit` con contexto amplio) hay que releer explícitamente las líneas justo antes y después del rango borrado para confirmar que no se ha partido una etiqueta o bloque que las envuelve, no solo el contenido que se pretendía borrar.

## D-073 · Orden de la Galería estable por sesión y sincronizado con el orden elegido en Lista

> **Superada (parcialmente) por el Contrato de Navegación** en `architecture.md`. La intención se mantiene y hoy es una regla del contrato, pero el mecanismo cambió: el orden estable ya no se guarda como claves aleatorias por tarjeta (`mel-gallery-random-keys`, que desapareció del código) sino como la secuencia de ids de la sesión en `mel-session-order`.

- **Contexto**: consecuencia directa de D-072 — el orden aleatorio de la Galería (`galleryRandomKeys`, comentado como "orden aleatorio ESTABLE por sesión") solo vivía en memoria (`window._melState`), así que era estable mientras el overlay nunca desmontaba la página, pero desde que abrir un evento es una recarga dura real, cada visita a un evento generaba una semilla aleatoria nueva al volver — la Galería se reordenaba visiblemente en cada ida y vuelta. El propietario pidió, además, que si cambia el orden en Lista (columnas ordenables), la Galería adopte ese mismo orden (y los filtros ya compartidos) en vez de mantener su propio aleatorio.
- **Decisión**:
  1. `galleryRandomKeys` (el mapa idMel→clave aleatoria) se persiste en `sessionStorage` (`mel-gallery-random-keys`), no solo en memoria — se lee al arrancar el script y se guarda cada vez que se genera una clave nueva. Estable durante toda la sesión del navegador (pestaña); una sesión nueva sí genera un orden nuevo, que era la intención original ("Cada carga de página = orden nuevo", ahora reinterpretado como "cada sesión nueva", ya que "carga de página" pasó a significar algo mucho más frecuente con D-072.
  2. `currentSortCol`/`currentSortDir` (el orden elegido en Lista) también se persisten en `sessionStorage` (`mel-sort-state`) y se restauran como valor inicial de `window._melState` en cada arranque del script — sin esto, el propio orden de Lista se habría perdido en cada recarga dura igual que le pasaba al aleatorio de Galería.
  3. En `performDOMUpdates()`, la Galería usa el orden de `filtered` tal cual (que ya respeta `currentSortCol`/`currentSortDir` y los filtros activos) en vez de reordenar por clave aleatoria, **solo cuando** `currentSortCol` está activo. Sin ningún orden elegido en Lista, sigue usando el aleatorio estable de session Storage.
- **Motivo**: (1)/(2) son una regresión directa de D-072 no contemplada en su momento — el diseño original de "orden estable" asumía que la página nunca se recargaba de verdad. (3) es la petición explícita del propietario: un mismo conjunto de eventos (mismos filtros) no debería verse en dos órdenes distintos según la vista, si el visitante ya ha expresado una preferencia de orden en Lista.
- **Consecuencias**: verificado en navegador — ordenar Lista por "Evento" ascendente y cambiar a Galería muestra las mismas primeras tarjetas en el mismo orden alfabético ("Arman2 B.Day Party", "Christmas Battle", "Don Carnal Special Party", "FIV I", "FIV II"); una recarga dura mantiene ese mismo orden en Galería. Sin ningún orden elegido, dos recargas duras consecutivas devuelven exactamente el mismo orden aleatorio de tarjetas (comprobado con las 5 primeras: `MEL-00031, MEL-00049, MEL-00047, MEL-00029, MEL-00002`, idéntico en ambas cargas). `npm run build` sin errores.

## D-074 · Transición suave (fade) al abrir el detalle de un evento y al navegar entre ellos

- **Contexto**: tras D-072, cada apertura de un evento (desde cualquier punto de entrada) y cada Anterior/Siguiente es una recarga dura real — un corte visual seco (parpadeo blanco) frente a la sensación fluida que daba el overlay. El propietario pidió "la transición más sencilla posible" para suavizarlo, dejando la puerta abierta a mejorarla después según cómo se vea.
- **Decisión**: fundido simple con CSS + JS plano, sin tocar el `ClientRouter` de Astro (evita a propósito el bug histórico de caché de snapshot que motivó D-072 en primer lugar):
  1. **Entrada (fade-in)**: nueva animación `@keyframes mel-fade-in` (`opacity 0→1`, 0.25s) aplicada al `<body>` en `Layout.astro`, compartida por todas las páginas — es un `animation` CSS puro, se reproduce sola en cada carga de página fresca sin necesidad de JS ni de esperar a ningún evento.
  2. **Salida (fade-out) antes de navegar**: `document.body.style.opacity = '0'` con una transición de 0.2s, retrasando la navegación real 200ms con `setTimeout` para que el fundido sí se vea — a diferencia del botón "De acuerdo" de `EmptyState.astro`, que ya fundía el `body` pero navegaba en el mismo tick sin darle tiempo a jugarse (bug preexistente, no corregido todavía, ver "Pendiente" en `docs/design-system.md`). Aplicado en `navigateToEvent()` de `index.astro` (cubre galería/lista/panel de mapa) y, en `event/[id].astro`, con un único listener de click delegado en `document` que intercepta cualquier `<a href="/...">` interno de la página (cerrar, Anterior/Siguiente, tags de Lugar/Localidad/Organiza/Diseño, artistas) en vez de atar el fundido a cada enlace por separado.
  3. **Patrón documentado como "Fundido v1"** en `docs/design-system.md` (sección "Transiciones de Navegación") — valores fijos (0.25s entrada / 0.2s salida, `ease`), los dos fragmentos de código a reutilizar, y cuándo usar el listener delegado vs. atar el fundido a un solo punto (como `navigateToEvent()`), para poder aplicarlo en más sitios sin duplicar criterio.
- **Bugs encontrados y corregidos de camino** (no eran parte del pedido original, pero salieron al tocar esta zona):
  1. **Navegación entre eventos por teclado, rota desde D-072**: el atajo de flechas ←/→ para saltar al evento anterior/siguiente vivía SOLO en el overlay SPA eliminado en D-072 — `event/[id].astro` nunca tuvo su propio equivalente (solo tenía flechas para el carrusel de fotos DENTRO de un evento). Añadido un `keydown` en `event/[id].astro` que reutiliza `fadeAndNavigate()`, activo solo cuando el visor de fotos a pantalla completa está cerrado (para no pelearse con sus propias flechas) y no cuando el foco está en un campo de texto.
  2. **Enlaces de Lugar/Localidad/Organiza/Diseño/Artistas navegaban lento y con el layout roto un instante**: ninguno llevaba `reload`/`data-astro-reload`, así que usaban la navegación suave del `ClientRouter` de Astro hacia `/` — el mismo problema de fondo que D-072 ya había evitado para `/event/[id]` (la Home necesita que su JS de inicialización (galería/mapa/lista) termine de correr, y una navegación suave no da esa garantía visible al instante). El listener delegado del punto 2 de arriba los cubre a todos sin tener que añadir `reload` componente por componente.
- **Motivo**: la alternativa (`ClientRouter`/View Transitions) exigiría volver a investigar y descartar el problema de caché que originalmente forzó `reload={true}` en este sitio — un fundido CSS/JS plano da parte de la suavidad pedida sin ese riesgo, y es literalmente la opción más sencilla posible, tal y como se pidió. El listener delegado (en vez de `reload` por componente) es la forma más simple de blindar TODA la página a la vez, incluyendo enlaces futuros.
- **Consecuencias**: verificado en navegador — clic en tarjeta de galería dispara el fundido y navega ~200ms después a `/event/[id]` con la página de destino visible y sin errores de consola; Anterior/Siguiente por clic y por teclado (←/→) funcionan igual; el enlace de Localidad navega a `/?search=...` con la Galería a 3 columnas correctas desde el primer frame visible, sin el bache de layout roto. Nota de verificación: `getComputedStyle(document.body).opacity` devolvió `"0"` de forma persistente varios segundos después de cargar en las herramientas de este entorno sandbox incluso en una carga totalmente fresca sin fundido de por medio — una discrepancia de la propia herramienta de automatización con la página real (confirmado por captura de pantalla: el contenido se ve perfectamente opaco y legible en ambos casos). Verificado por captura visual, no por ese valor computado — ver `feedback_verification-rigor` en memoria del proyecto. Pendiente: confirmación visual del propietario en su propio navegador, y decidir si merece la pena iterar hacia algo más elaborado.

## D-075 · Enlace "Lugar" del detalle de evento: panel del mapa atascado sin poder cerrarse

- **Contexto**: el propietario reportó que pulsar el tag "Lugar" de `event/[id].astro` no reproducía la interacción esperada (ir a Mapa, la cámara encontrando el lugar, el panel de eventos abriéndose a la vista) y que, además, el panel se quedaba atascado sin poder cerrarse.
- **Investigación**: el enlace "Lugar" apuntaba a `/?view=mapa&search=<lugar>` — usando `?search=` (la caja de búsqueda genérica) en vez de `?location=` (el parámetro dedicado que ya existía para esto). La lógica de auto-apertura del panel en `updateMapMarkers()` aceptaba AMBOS como coincidencia válida (`matchName = urlLocation || urlSearch`), así que el panel sí se abría — pero el botón de cerrar solo borraba `?location=` de la URL, nunca `?search=`. Con `?search=` todavía en la URL, cualquier re-render posterior de `updateMapMarkers()` volvía a encontrar la coincidencia y reabría el panel — de ahí el atasco. Además, la apertura automática por URL nunca movía la cámara del mapa (solo poblaba el panel), a diferencia de una función ya existente pero completamente huérfana, `window.showLocationOnMap()` (sin ninguna llamada en todo el código — resto, casi con toda seguridad, del overlay eliminado en D-072), que sí hacía `setCenter`/`setZoom` al abrir.
- **Decisión**:
  1. El enlace "Lugar" de `event/[id].astro` (dos instancias: fila de tags y el array de `AdaptiveTagsRow`) pasa a usar `?view=mapa&location=<lugar>`.
  2. Eliminado el fallback a `?search=` en la lógica de coincidencia de `updateMapMarkers()` — solo `?location=` abre el panel automáticamente. Una búsqueda de texto normal que coincida por casualidad con el nombre de un lugar ya NO tiene el efecto secundario de abrir el panel del mapa (y el botón de cerrar, que solo limpia `?location=`, vuelve a ser suficiente por sí solo).
  3. Añadido el movimiento de cámara (`setCenter`/`setZoom` a 15) al camino de auto-apertura por URL, condicionado a que sea una apertura recién hecha en este render (`justAutoOpened`, no en cada re-render posterior) y a que `googleMap` ya exista.
  4. Eliminada `window.showLocationOnMap()` — código muerto sin ninguna llamada; su lógica de cámara ya vive ahora en el propio camino de auto-apertura.
- **Motivo**: usar el parámetro dedicado (`location`) en vez de sobrecargar la búsqueda genérica (`search`) es la raíz del arreglo — el atasco era consecuencia directa de esa conflación semántica, no un bug aislado del botón de cerrar.
- **Consecuencias**: verificado en navegador — el enlace "Lugar" ahora construye `/?view=mapa&location=Km.%207.5`; al navegar, el panel se abre solo con los eventos de ese lugar; el botón de cerrar lo cierra y no se reabre en renders posteriores (confirmado leyendo la URL tras cerrar: sin `location`, y `panel.classList.contains('side-panel-open')` en `false`). El movimiento de cámara no se pudo verificar visualmente porque los tiles de Google Maps no renderizan en este entorno sandbox (limitación preexistente, no relacionada). `npm run build` sin errores.

- **Ronda 2 — apertura del panel seguía brusca (diagnóstico del propietario)**: tras la corrección de arriba, el propietario probó en un navegador real y confirmó que la apertura del panel seguía siendo brusca — pero con una observación clave que apuntaba a la causa real: el panel "no aparece desde la derecha sino de tirón encima del mapa", mientras que el cierre sí anima bien.
  - **Primer intento (insuficiente)**: se intentó sincronizar el mapa con la transición de ancho del panel disparando `google.maps.event.trigger(googleMap, 'resize')` en cada frame durante 320ms vía `requestAnimationFrame`, más iniciar `panTo()` de inmediato en vez de esperar a que la transición terminara. No resolvió el síntoma descrito por el propietario.
  - **Diagnóstico correcto**: el `google.maps.Map` clásico (a diferencia del nuevo elemento `<gmp-map>`) no tiene forma de saber que su contenedor (`#map-container`, `flex-1` dentro del mismo flex que el panel) ha cambiado de tamaño salvo que se le avise explícitamente — sin ese aviso, el mapa sigue pintando su contenido al tamaño ANTERIOR (más ancho) durante toda la transición CSS del panel, así que visualmente el panel parece "aparecer encima" del mapa en vez de que el mapa le haga sitio deslizándose. El polling por `requestAnimationFrame` de 320ms debería haber cubierto esto — la sospecha es que la duración/temporización fija no encajaba de forma fiable con el timing real de la transición CSS (`transition-all duration-300` con posible solapamiento con otras escrituras síncronas al DOM en `updateSidePanelDOM()`).
  - **Corrección robusta**: sustituido el `requestAnimationFrame` de duración fija por un `ResizeObserver` sobre `#map-container`, creado una única vez en `createGoogleMapInstance()` (con `disconnect()` de cualquier observer anterior al recrear la instancia del mapa) — dispara `resize()` en CADA frame en que el contenedor REALMENTE cambia de tamaño, sin depender de temporizaciones adivinadas, cubriendo apertura, cierre y redimensionado de ventana con un único mecanismo. `panTo()` se sigue disparando de inmediato al abrir (fuera del `if (googleMap)` que antes envolvía también el resize).
  - **Verificación**: build limpio, sin errores de consola, el panel sigue abriendo/cerrando con el ancho correcto (320px mínimo comprobado). **No ha sido posible confirmar visualmente que el problema de brusquedad esté resuelto** — los tiles de Google Maps no renderizan en este entorno sandbox en ningún punto de esta sesión, así que este diagnóstico y arreglo se basan en el razonamiento sobre el comportamiento conocido de la API clásica de Google Maps, no en una comprobación visual directa. Pendiente de confirmación del propietario en su propio navegador — si el `ResizeObserver` tampoco resuelve el síntoma, el problema puede estar en otro punto (p. ej. el propio timing de `updateSidePanelDOM()` synchrono bloqueando el primer frame de la transición CSS del panel, no solo el mapa).

## D-076 · Offset de -1px (`top-[-1px]`) en `<thead>` de la vista de Lista: Única solución efectiva contra el asomo de celdas al hacer scroll

- **Contexto**: Tras múltiples intentos probando bordes en `<colgroup>` (descartados por limitaciones de soporte en navegadores), `isolation: isolate`, sombras interiores `box-shadow: inset` (que alteraban el diseño al crear bordes interiores por celda) y paddings superiores en el contenedor (`pt-px`), se identificó que las celdas del cuerpo de la tabla continuaban asomándose o filtrándose por detrás de la cabecera pegajosa (`sticky`) durante el desplazamiento vertical.
- **Decisión**:
  1. Revertidas las sombras interiores `box-shadow: inset` de `.sort-header`.
  2. Eliminado `pt-px` del contenedor `#list-table-wrapper`.
  3. Aplicada la clase `top-[-1px]` al elemento `<thead class="sticky top-[-1px] z-[2] bg-mel-bg-secondary isolate">` en `src/pages/index.astro`.
- **Motivo**: Tras exhaustivas pruebas, posicionar la cabecera pegajosa a `top-[-1px]` demostró ser la **única solución técnica y óptica efectiva** para resolver este problema recurrente de scroll. Al desplazar el `<thead>` exactamente 1px hacia arriba, el borde colapsado y el fondo secundario de la cabecera sellan por completo la grieta superior del contenedor pegajoso, impidiendo que el contenido desplazado se trasluzca en ningún frame.
- **Consecuencias**: Queda registrado en la documentación del proyecto como la solución definitiva y comprobada ante cualquier intento futuro de modificar el offset de la cabecera de la tabla de Lista.

## D-077 · Restablecimiento de scroll superior y animación de rebote (`tableBounceUpdate`) al cambiar de página

- **Contexto**: Se solicita que al hacer clic en cualquier control de paginación (números o flechas Anterior/Siguiente), la vista de Lista restablezca su posición inicial para mostrar la parte superior de la tabla y reproduzca una animación suave con un ligero rebote al final (efecto muelle/spring) que confirme al usuario que los elementos de la tabla se han actualizado.
- **Decisión**:
  1. En `src/pages/index.astro`, se define la animación CSS `@keyframes tableBounceUpdate` (`translateY(18px)` -> `translateY(-5px)` -> `translateY(2px)` -> `translateY(0)` con curva `cubic-bezier(0.25, 1.15, 0.45, 1)` de 480ms).
  2. Se unifica la navegación en `handlePaginationNav(newPage)`, que reinicia `scrollTop = 0` en el contenedor de la tabla/tarjetas (`#list-table-wrapper` / `#list-mobile-cards`), realiza `scrollIntoView({ behavior: 'smooth' })` sobre `#content-views` y desencadena `triggerTableBounceAnimation()`.
- **Motivo**: Proporcionar retroalimentación visual táctil y fluida que indique claramente la renovación de datos al cambiar de página.
- **Consecuencias**: Al pulsar cualquier página de la barra de paginación, la tabla vuelve arriba y se desliza con un suave rebote final que confirma la actualización del listado.

## D-078 · Transición fluida con `max()`, sombra lateral, retardo de 1s al auto-abrir y ocultación de divisor en tags de `#map-side-panel`

- **Contexto**: El panel lateral del mapa (`#map-side-panel`) presentaba un salto brusco al abrirse en escritorio debido a la presencia de `min-width: 320px` que anulaba la animación progresiva desde `0px`. Además, se requería añadir una sombra ligera proyectada sobre el mapa, ocultar el primer divisor de las etiquetas del panel y dar un retardo de 1s al desplegar el panel cuando se navega mediante enlace de lugar (`?location=...`) manteniendo centrado instantáneo en el mapa.
- **Decisión**:
  1. En `src/pages/index.astro`, se sustituye `width: calc(...)` y `min-width: 320px` por `width: max(320px, calc((100% - 264px) / 3 + 72px))` en `@media (min-width: 1024px)`, permitiendo que el ancho transicione de `0px` a su tamaño final de forma continua y fluida.
  2. Se añade `box-shadow: -8px 0 24px -4px rgba(0, 0, 0, 0.12), -2px 0 6px -1px rgba(0, 0, 0, 0.06)` a la clase `.side-panel-open` en escritorio, proyectando una sombra sutil a la izquierda sobre el mapa.
  3. Se incrementa el temporizador de auto-apertura del panel al llegar por URL de lugar a `1000ms` (`setTimeout(..., 1000)`), asegurando que `googleMap.setCenter()` y `setZoom()` actúen de inmediato sin delays mientras el panel aguarda 1 segundo completo.
  4. Se añade la regla CSS `#side-panel-tags-container .highlight-unit:first-child > .bg-mel-border { display: none !important; }` para ocultar el divisor vertical de la primera etiqueta ("Eventos").
- **Motivo**: Corregir la brusquedad visual del panel, mejorar la profundidad jerárquica con el mapa y optimizar la experiencia de usuario al navegar desde enlaces directos a lugares.
- **Consecuencias**: El panel lateral de escritorio se abre con total fluidez de 0px a su tamaño final, proyecta sombra sobre el mapa, muestra la primera etiqueta sin divisor y se sincroniza limpiamente con la carga inicial del mapa en URLs con parámetro de ubicación.

## D-079 · Acotación de divisor de tags a escritorio y alineación adaptativa de paddings en el Bottom Sheet (`#map-side-panel`)

- **Contexto**: Se solicita que la ocultación del divisor vertical de la primera etiqueta ("Eventos") en `#side-panel-tags-container` aplique únicamente en la vista de panel lateral de escritorio (`>=1024px`), manteniendo el divisor visible en el Bottom Sheet de móvil (`<1024px`). Asimismo, se detectó un desajuste visual en los márgenes laterales del Bottom Sheet en tabletas/pantallas medias (~1020px de ancho) respecto al layout de fondo del sitio.
- **Decisión**:
  1. En `src/pages/index.astro`, se acota la regla `#side-panel-tags-container .highlight-unit:first-child > .bg-mel-border { display: none !important; }` dentro del bloque `@media (min-width: 1024px)`.
  2. Se actualizan los contenedores internos del panel (cabecera con botón de cerrar, título/dirección, contenedor e hilera inferior de etiquetas y tarjetas de eventos en JS) con la escala adaptativa `px-6 sm:px-12 lg:px-6` (`px-4 sm:px-10 lg:px-4` en la barra de la X).
- **Motivo**: Mantener la integridad de diseño del Bottom Sheet móvil mientras se garantiza que en tabletas y pantallas medias (como 1020px) el contenido del Bottom Sheet se alinee milimétricamente con el margen de 48px del encabezado y el slider de fondo.
- **Consecuencias**: El primer divisor de etiquetas se conserva en móvil y se oculta solo en escritorio; en pantallas intermedias (`640px` a `1023px`), el Bottom Sheet encaja pixel a pixel con los elementos de fondo.

## D-080 · Unificación del breakpoint de margen lateral (108px) entre Inicio, Info, Exposiciones y Detalle de Evento

- **Contexto**: El propietario reportó discrepancias de márgenes, altura de cabecera y breakpoints entre la página de Inicio, la de Detalle de Evento y, en algún momento, Info — con la sospecha de que había que unificar pero sin tener claro por dónde empezar. Se investigó comparando los cuatro contenedores exteriores: `index.astro:205`, `info.astro:198`, `exposiciones.astro:9` y `event/[id].astro:151`.
- **Diagnóstico**: la altura de cabecera (`--mel-header-pt-desktop`) ya era consistente en las cuatro páginas. El margen lateral de 108px, en cambio, divergía en tres frentes:
  1. `info.astro` y `exposiciones.astro` lo activaban en el breakpoint `md` (768px), mientras que `index.astro` lo activaba en `lg` (1024px) — en el rango 768–1024px, Info/Exposiciones tenían 108px de margen mientras Inicio seguía en 48px.
  2. `event/[id].astro` no tenía ningún salto a 108px: su contenedor exterior carecía de `max-w-[1440px]`, y calculaba el ancho de contenido vía un `max-w-[1224px]` interno (`#detail-page-container`) sobre un padding lateral fijo de `sm:px-12` (48px) sin variar nunca — dando márgenes de 48px en todo el rango 640–1320px, muy por debajo de las otras páginas en ese mismo tramo.
  3. En ambos casos, a partir de 1440px de ancho de viewport las cuatro páginas coincidían igualmente (1440 - 108×2 = 1224px de contenido), por lo que el problema solo era visible en el rango intermedio de anchos — el motivo por el que la discrepancia costaba de detectar sin medir directamente.
- **Decisión**:
  1. `info.astro` y `exposiciones.astro`: cambiado `md:px-[108px]` → `lg:px-[108px]`, alineando su breakpoint con `index.astro`.
  2. `event/[id].astro`: el contenedor exterior gana `max-w-[1440px] mx-auto` y `lg:px-[108px]`, replicando exactamente el patrón de las otras tres páginas. El `max-w-[1224px]` del contenedor interno (`#detail-page-container`) se retira por quedar redundante — el ancho de contenido ahora lo determina el mismo cálculo (padding sobre `max-w-[1440px]`) que en el resto del sitio, llegando al mismo 1224px final en `≥1440px` pero con una progresión de márgenes coherente en el tramo intermedio.
  3. Los elementos `position: fixed` de cabecera/tags fijas en móvil de `event/[id].astro` (`#detail-sticky-header`, `#detail-tags-fixed`) no se tocaron — solo aplican por debajo de `lg` (`lg:hidden`/`lg:static`), rango en el que su padding (`px-6 sm:px-12`) ya coincidía con el resto del sitio.
- **Motivo**: un único sistema de márgenes progresivo (`max-w-[1440px]` + `px-6 sm:px-12 lg:px-[108px]`) en las cuatro páginas del sitio, en vez de tres variantes ligeramente distintas que solo convergían en los extremos del rango de anchos.
- **Consecuencias**: verificado en navegador midiendo el padding computado del contenedor exterior en las cuatro páginas a 900px (48px en las cuatro, antes 108px en Info/Exposiciones) y 1280px (108px en las cuatro, antes 48px en Inicio/Evento). Capturas de pantalla del Detalle de Evento en escritorio (1280px) y móvil (375px) confirman que la retirada del `max-w-[1224px]` interno no alteró el layout de foto/columna de info/carrusel/navegación Anterior-Siguiente. `npm run build` sin errores, sin errores de consola.

## D-081 · Componente `IconButton` alineado a Figma (111:3929) con estado Pressed, `Icon.astro` compartido y migración de los cierres/menú restantes

## D-085 · Paginación al final del scroll e inmutable: Inserción estática en `#list-table-wrapper` y `#list-mobile-cards`

- **Contexto**: Los controles de paginación (`#pagination-controls`) sufrían una pérdida de visibilidad y estado desincronizado al navegar hasta Lista, hacer scroll para ver la paginación, cambiar a Galería/Mapa y regresar a Lista. La causa raíz fue la recolocación dinámica por JS (`appendChild()`) de un nodo cuyo cálculo `totalPages > 1` en `switchView()` devolvía `false` al estar la variable `totalPages` desasociada en el ámbito.
- **Decisión**:
  1. Se ubica de forma estática la barra de paginación al final de la tabla en escritorio (`#pagination-controls-desktop` dentro de `#list-table-wrapper`) y al final de las tarjetas móviles (`#pagination-controls-mobile` dentro de `#list-mobile-cards`).
  2. Se elimina la función de recolocación `relocatePaginationControls()` y las llamadas a `document.body.appendChild()`.
  3. Se define explícitamente `const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;` dentro de `switchView()` para garantizar una evaluación booleana consistente al alternar entre pestañas.
- **Motivo**: Mantener la barra de paginación integrada al final del scroll del propio listado (UX aprobada por el propietario) eliminando de forma permanente la fragilidad de recolocar nodos por el DOM.
- **Consecuencias**: Al hacer scroll en la tabla o tarjetas, la paginación aparece de forma nativa al final de los elementos y permanece 100% visible e intacta al cambiar entre Galería, Mapa y Lista.

## D-086 · Registro de intentos de resolución del temblor del slider en táctil (aparcado)

- **Contexto**: Se exploró solucionar la competencia gestual entre el arrastre de los tiradores de `TimeSlider.astro` y el scroll horizontal de la pantalla en emulación táctil/móvil.
- **Intentos Realizados y Revertidos**:
  1. **Captura de puntero en manetas (`setPointerCapture` en `minHandle`/`maxHandle`)**: Se descartó porque recalcular las coordenadas de un elemento cuya posición CSS `left` cambia continuamente en cada fotograma generaba un bucle de realimentación que empeoraba la vibración.
  2. **Captura de puntero en contenedor estático e interceptación de `touchstart`**: Se descartó porque el uso de `preventDefault()` en `touchstart` cancelaba el disparo de eventos sintéticos de clic, impidiendo al usuario pulsar en cualquier punto de la barra para saltar directamente a un año.
  3. **Restricción de desbordamiento horizontal `overflow-x-hidden` en `html`/`body`**: Se descartó al no eliminar el conflicto gestual de navegación en el inspector móvil.
- **Decisión**: Revertir todos los cambios realizados en `TimeSlider.astro` y `Layout.astro` dejando la base de código limpia e intacta. El problema queda aparcado explícitamente a petición del propietario para ser abordado en una sesión dedicada.
- **Consecuencias**: La funcionalidad del slider vuelve a su estado original previo a los experimentos (clicks en la barra plenamente operativos).

## D-087 · Ajuste de colchón de seguridad de la foto pegajosa y anulación de gap para eventos con paginación en `event/[id].astro`

- **Contexto**: El propietario solicitó ajustar el margen de seguridad de fondo opaco (`paddingBottom`) bajo la foto fija en la vista móvil de detalle de evento para que la distancia desde el borde inferior de la foto hasta donde el texto se oculta durante el scroll fuera exactamente de 32px. Asimismo, reportó que en reposo la distancia entre la foto y el texto se expandía debido a que la retícula padre aplicaba un `gap-8` (32px) acumulado sobre los puntos de paginación de imágenes.
- **Decisión**:
  1. Se define la variable condicional `const STICKY_PADDING_BOTTOM = (imageUrls && imageUrls.length > 1) ? '0px' : '32px';` en `src/pages/event/[id].astro`.
  2. Se resta el `paddingBottom` dinámico de la caja fija (`currentPaddingBottom`) al calcular la altura del centinela (`imageSentinel`), garantizando que la altura reservada sea estrictamente constante durante todo el rango de scroll y que el texto no "salte" ni se aleje de la foto al iniciar el desplazamiento.
  3. Para eventos con paginación de imágenes (`imageUrls.length > 1`), se añade la clase `mb-[-32px] lg:mb-0` a `#detail-image-column` para anular el `gap-8` de la retícula padre en móvil, eliminando el espaciado sobrante entre el contenedor de puntos y el bloque de información.
- **Motivo**: Mantener una distancia constante, limpia y sin duplicidades visuales entre la imagen colapsable (con o sin paginación) y el contenido de texto que pasa por debajo.
- **Consecuencias**: En eventos con 1 sola foto se aplican 32px de colchón opaco; en eventos con paginación los puntos se integran limpiamente sin acumular el gap de la retícula. El texto asciende de forma 100% fluida en sincronía con el colapso de la imagen.

## D-088 · Márgenes de seguridad nativos (`padding`) en `fitBounds()` del mapa para evitar recorte de marcadores del norte

- **Contexto**: Al inicializar el mapa o filtrar resultados, el marcador de la ubicación más al norte (Valdepiélago) aparecía ligeramente recortado en su borde superior. La causa era que `googleMap.fitBounds(bounds)` ajustaba el encuadre únicamente a las coordenadas geográficas `lat`/`lng`, ignorando la altura física que proyecta el globo/badge de la etiqueta HTML (~40-50px por encima de las coordenadas).
- **Decisión**: Se pasa un objeto de márgenes perimetrales a `googleMap.fitBounds(bounds, { top: 80, bottom: 40, left: 80, right: 80 })` en `src/pages/index.astro`.
- **Motivo**: Garantizar 80px libres en el margen superior de la pantalla para alojar cómodamente las etiquetas prominentes de los marcadores norteños y ofrecer un encuadre inicial más aireado y equilibrado en todos los dispositivos.
- **Consecuencias**: Los marcadores como Valdepiélago no se recortan en ningún tamaño de pantalla o dispositivo y se muestran de forma completa con holgura superior.

## D-089 · Reajuste de tipografía y espaciados en `#map-side-panel` y alineación adaptativa de tarjetas

- **Contexto**: El propietario solicitó ajustar la jerarquía visual del panel de lugar del mapa (`#side-panel-title`) para usar la escala responsiva de 28px en móvil y 25px (H3 del DS) en escritorio. Asimismo, pidió compactar las distancias verticales (-8px entre título y dirección, -8px bajo etiquetas), eliminar la línea divisoria horizontal sobre la lista de eventos y corregir un desajuste donde las tarjetas de eventos móviles no respetaban el padding adaptativo de 48px en tabletas.
- **Decisión**:
  1. `#side-panel-title` utiliza `text-[28px] leading-[32px] tracking-[-0.56px] lg:text-[25px] lg:leading-[32px] lg:tracking-[-0.5px]`.
  2. Reducido el espacio vertical de la cabecera a `gap-[8px]` y el padding inferior de la caja de tags a `pb-[24px]`.
  3. Eliminado el divisor horizontal `<div class="bg-mel-border">` situado al pie de las etiquetas.
  4. Actualizadas las tarjetas de lista móviles y sus divisores internos con la escala adaptativa `px-6 sm:px-12 lg:px-6` y `left-6 right-6 sm:left-12 sm:right-12 lg:left-6 lg:right-6`.
- **Motivo**: Lograr un panel de lugar con jerarquía tipográfica limpia, espaciados más compactos y alineación pixel-perfect con los márgenes de 48px del layout en pantallas medianas / tabletas.
- **Consecuencias**: El panel del mapa muestra una cabecera más ligera y equilibrada, el listado se adosa directamente tras los tags sin divisores redundantes y las tarjetas encajan milimétricamente con las cabeceras de fondo.

## D-090 · Navegación fluida **Morphing v1**: precarga inteligente (`prefetch`) y View Transitions nativas entre eventos

- **Contexto**: Las navegaciones entre páginas de evento (`/event/[id]`) realizaban una recarga dura que reseteaba la ventana a blanco durante casi 1 segundo. El propietario solicitó eliminar la pantalla en blanco manteniendo la arquitectura de URLs reales e independientes de servidor (`/event/[id]`) aprobada en `D-072`.
- **Decisión**:
  1. Se implementa precarga nativa W3C (`<link rel="prefetch">` y `prefetchEventUrl`) para descargar en segundo plano las páginas de eventos colindantes (*Anterior/Siguiente*) y las tarjetas sobre las que el usuario pasa el puntero (`pointerenter`).
  2. Se expone la función de enrutado nativo `window.__melNavigate` desde `astro:transitions/client` en `Layout.astro`.
  3. Las navegaciones de detalle de evento a detalle de evento (`/event/A` → `/event/B`) y desde la home a evento se ejecutan mediante `window.__melNavigate(url)`, activando `View Transitions` nativas sin parón ni pantalla en blanco.
  4. Para evitar desincronización de datos tras múltiples saltos consecutivos, `src/pages/event/[id].astro` transporta `data-image-urls` y `data-event-id` en el contenedor `#event-detail-data`, leyéndolos de forma dinámica en cada `astro:page-load`.
  5. La navegación de retorno a la home (`X` → `/`) mantiene la recarga dura limpia (`window.location.href = '/'`) según `D-072` para garantizar el reinicio estable del estado e hidratación de `index.astro`.
- **Motivo**: Eliminar la espera de red y la pantalla en blanco al hojear eventos, ofreciendo una experiencia instantánea mantenida sobre el estándar oficial del W3C y preservando URLs SSR 100% reales.
- **Consecuencias**: Cambio instantáneo entre eventos sin pantallas en blanco ni estados corruptos.

- **Ronda 2 — el propietario retoma el problema, ya no lo considera aparcable**: preocupado por lanzar la web con este bug sin resolver. Se revisan los tres intentos anteriores; ninguno tocaba el mismo mecanismo que se identifica ahora. Punto de restauración creado antes de tocar nada: `git tag slider-pre-fix-2026-07-23` (commit `8d85012`).
- **Diagnóstico nuevo**: dos huecos en el manejo de eventos de puntero, ninguno de los cuales había sido probado en la ronda 1:
  1. Sin `setPointerCapture()` en las manetas, un arrastre táctil rápido puede salir del área de hit-testing de la maneta a mitad de gesto — el navegador puede entonces reinterpretar el gesto como intento de scroll/pan de página, compitiendo con el JS por el mismo gesto. Esto es DISTINTO del intento 1 de la ronda 1 (que fallaba por recalcular coordenadas contra la posición CSS de la propia maneta, cambiante en cada frame, generando un bucle de realimentación) — en este componente, la posición ya se calcula siempre contra `trackWrapper.getBoundingClientRect()` (un elemento estático que nunca se mueve), así que `setPointerCapture()` no tiene ese bucle de realimentación al que enfrentarse.
  2. No existía ningún listener de `pointercancel` — solo `pointerup`. En táctil, el navegador puede disparar `pointercancel` en vez de `pointerup` si decide a mitad de gesto reclamar la interacción para sí (p. ej. para iniciar un scroll nativo). Sin manejarlo, `isDraggingMin`/`isDraggingMax` quedaban atascados en `true` para siempre — el JS seguía moviendo el tirador vía `pointermove` mientras el navegador ya había recuperado el gesto por su cuenta, exactamente la clase de "pelea" visual que se percibe como temblor.
- **Decisión**: en `TimeSlider.astro`, (1) añadido `handle.setPointerCapture(e.pointerId)` en el `pointerdown` de cada maneta, con `releasePointerCapture()` simétrico al finalizar; (2) añadido un listener de `pointercancel` en `window` que ejecuta exactamente la misma limpieza que `pointerup` (función `endDrag()` compartida, antes duplicada entre dos handlers).
- **Motivo**: cerrar el hueco de estado (drag que nunca termina si el navegador cancela el gesto) y eliminar la ambigüedad de gesto que le da al navegador motivo para competir por el control en primer lugar — ambos directamente relacionados con el síntoma descrito (temblor específicamente en emulación táctil), y ninguno de los dos ya descartado por la ronda 1.
- **Consecuencias**: verificado en navegador — arrastre con ratón (que también genera Pointer Events, mismo camino de código que táctil) sigue moviendo el tirador correctamente tras el cambio (2004→2012 confirmado por valor real del input), el clic directo en la barra para saltar de año sigue funcionando, sin errores de consola, `npm run build` sin errores. **No verificado con emulación táctil real ni dispositivo físico** — este entorno no tiene forma de simular un gesto táctil de alta frecuencia con cancelación de gesto real; el análisis es sólido (cierra dos huecos de manejo de eventos concretos, no probados por los intentos previos) pero la confirmación definitiva depende de que el propietario lo pruebe en su entorno táctil real. Si el temblor persiste, el punto de restauración (`git tag slider-pre-fix-2026-07-23`) permite volver exactamente al estado previo sin pérdidas.

- **Ronda 3 — el propietario confirma que la ronda 2 no resolvió nada, y describe el síntoma real por primera vez con precisión**: "cojo el tirador de la izquierda y lo arrastro muy lentamente hacia la derecha. Entonces empieza a vibrar, cambiando muy rápido de año (2004-2005) hasta que lo suelto [...] oscilando incluso entre años no consecutivos si arrastro rápido [...] a partir del 2016-2017 la cosa empieza a funcionar prácticamente bien". Esto descarta por completo la hipótesis de conflicto de gestos (ronda 2) — el valor numérico en sí oscila, no hay ningún indicio de que el navegador esté compitiendo por el gesto.
- **Diagnóstico real**: medido en navegador — a 390px de ancho de viewport (móvil), el track útil (`rect.width - 192`, el mismo margen de 96px por lado que usa la lógica de arrastre) mide solo ~198px para cubrir 15 años, es decir **~13.2px por año**. Un cursor de ratón tiene precisión de subpíxel; el punto de contacto reportado por un dedo real sobre una pantalla táctil tiene ruido inherente de varios píxeles entre muestras consecutivas de `touchmove`, incluso sosteniendo el dedo "quieto" — a 13px/año, ese ruido normal es más que suficiente para que el año calculado (`Math.round(...)`) rebote entre dos valores en cada nueva muestra, sin que exista ningún conflicto de gestos real. Ninguno de los intentos anteriores (rondas 1 y 2, ni los tres de Gemini) tocaba este mecanismo — todos asumían un problema de conflicto de gestos, no de resolución/ruido de píxeles.
- **Decisión**: en `TimeSlider.astro`, suavizado exponencial de la posición del puntero antes de convertirla a año — `smoothedPct = smoothedPct + (rawPct - smoothedPct) * 0.35` en cada `pointermove`, reseteado a `null` (para enganchar sin retraso el primer frame de cada arrastre nuevo) en `beginDrag()`. El tirador sigue el dedo con fluidez porque `render()` sigue actualizando su posición en cada evento; lo que cambia es que el ruido de alta frecuencia entre muestras se filtra antes de decidir a qué año redondear.
- **Motivo**: el problema no estaba en cómo se gestionaban los eventos de puntero (ronda 2, válida igualmente pero no la causa de este síntoma) sino en la relación entre precisión de entrada (ruido táctil, varios px) y resolución de salida (13px/año en móvil) — la única solución real es reducir la sensibilidad al ruido de muy alta frecuencia, no cambiar qué eventos se escuchan.
- **Consecuencias**: verificado en navegador — inyectados 20 eventos `pointermove` sintéticos con ±4px de ruido alterno en cada muestra (deliberadamente mayor que el paso de 13px/año) sobre un arrastre lento simulado: la secuencia de años mostrados avanza monotónicamente (2005→2005→2006→2007) sin ningún retroceso, pese al ruido inyectado en cada paso. Arrastre con ratón real y clic directo en la barra siguen funcionando sin regresión ni sensación de retraso. Sin errores de consola, `npm run build` sin errores. Sigue sin verificarse en un dispositivo táctil real — el propio propietario lo confirmará. Si no basta, el siguiente paso sería añadir histéresis explícita por año (no solo suavizado continuo) sobre el mismo mecanismo — el punto de restauración (`git tag slider-pre-fix-2026-07-23`) sigue disponible si hace falta partir de cero.

- **Ronda 4 — el propietario aporta el dato decisivo, y esta vez apunta a una causa completamente distinta**: en modo Mapa el slider va "como la seda", los marcadores se actualizan bien; al cambiar a Galería o Lista en móvil empieza a fallar — y falla más cuanto más lejano es el salto de año, funcionando casi bien para saltos pequeños (años cercanos). El propietario ya intuye la causa: "exigimos que la carga de los elementos sea inmediata", extrañado de que en escritorio no pase pese a haber más contenido que cargar.
- **Diagnóstico**: correcto. `updateSlider()` ya coalescía las llamadas a `filterArchives()` a como mucho una por `requestAnimationFrame` — pero eso solo garantiza que no se *programe* más de una llamada por frame, no que esa llamada *termine* dentro del presupuesto de un frame (~16ms). Reconstruir la galería/lista (masonry, imágenes, marcado de filas) es trabajo real; en un móvil con CPU mucho más débil que un ordenador de escritorio, un salto de año grande (muchas tarjetas cambian) puede hacer que una sola llamada tarde bien por encima de esos 16ms, bloqueando el hilo principal — que es precisamente donde se entregan los eventos `touchmove`/`pointermove` del propio slider. El modo Mapa no sufre esto porque `updateMapMarkers()` solo hace diff de marcadores (vía el clusterer), nunca una reconstrucción completa del DOM. Y por qué no se nota en escritorio: un ratón genera muchísimos menos eventos de movimiento por segundo que una superficie táctil (que muestrea a la frecuencia de refresco, 60-120Hz) para el mismo gesto humano, además de tener una CPU bastante más potente — la misma reconstrucción cara sencillamente no le da tiempo a acumular un atasco perceptible.
- **Decisión**: en `index.astro`, `updateSlider()` distingue si el arrastre está activo (`#slider-track-wrapper.dragging`, la misma clase de D-068). Si NO hay arrastre activo (clic directo, teclado), se comporta exactamente igual que antes — inmediato, coalescido por rAF. Si SÍ hay arrastre activo, la llamada cara a `filterArchives()` se limita a como mucho una vez cada 120ms (`SLIDER_DRAG_FILTER_THROTTLE_MS`) mediante un throttle de flanco de bajada (*trailing-edge* — la última llamada del intervalo siempre se dispara, nada se pierde) mientras la respuesta visual propia del slider (posición del tirador, año en la etiqueta) sigue actualizándose en cada frame sin cambios, porque vive enteramente dentro de `TimeSlider.astro` y no depende de `filterArchives()`. Además, se añade un listener de `change` (evento que `TimeSlider.astro` ya disparaba al soltar, D-086, pero que `index.astro` nunca escuchaba) para forzar una sincronización final inmediata al terminar el arrastre, sin esperar al throttle.
- **Motivo**: separar "vista previa en vivo del slider" (barata, siempre a 60fps) de "aplicar el filtro de verdad" (cara, no necesita ir más rápido de lo que el usuario puede percibir mientras arrastra) es el patrón estándar para sliders atados a operaciones costosas — coincide exactamente con lo que el propietario ya había intuido.
- **Nota sobre verificación en este entorno**: los eventos sintéticos disparados por JS (`element.dispatchEvent(...)`) no consiguieron completar el ciclo `requestAnimationFrame` en el navegador de pruebas de este entorno (confirmado con una prueba aislada: un `requestAnimationFrame` disparado por JS puro nunca llegó a ejecutarse tras más de un segundo de espera) — una limitación del propio entorno de automatización, no del sitio; ya afectaba igual al código *anterior* a este cambio (sin tocar nada, un solo evento `input` sintético tampoco completaba el ciclo). Una interacción real (arrastre físico simulado a nivel de sistema operativo, no JS) sí completó el ciclo correctamente.
- **Consecuencias**: verificado con un arrastre real (herramienta `computer`, no JS) sobre el tirador mínimo en un viewport de 390px: el rango pasó de 2004–2019 a 2013–2019, "Eventos" de 50 a 35, "Artistas" de 170 a 137, y la galería mostró contenido correspondiente al nuevo rango — confirmando que el throttle no rompe el resultado final, solo espacía las llamadas caras durante el propio arrastre. Sin errores de consola, `npm run build` sin errores. Como en las rondas anteriores, la confirmación de que esto resuelve el temblor percibido depende de que el propietario lo pruebe en su dispositivo táctil real — el punto de restauración (`git tag slider-pre-fix-2026-07-23`) sigue disponible.

- **Ronda 5 — confirmación positiva y un efecto secundario del suavizado de la ronda 3**: el propietario confirma que la ronda 4 (throttle del hilo principal) mejoró muchísimo el temblor en móvil — "ya casi no vibra". La Galería sigue reordenando fotos en vivo durante el arrastre; anota (sin pedir arreglo inmediato) que la Lista en móvil no tiene la misma animación de reordenación fluida que la tabla de escritorio (que sí funciona en iPad). El problema real que sí pide resolver: el tirador ahora se percibe más lento, con retraso y una "estela" tipo motion-blur — **y esto afecta también a escritorio**, algo que nunca había pasado antes de la ronda 3.
- **Diagnóstico**: el suavizado exponencial de la ronda 3 (`POINTER_SMOOTHING = 0.35`) se aplicaba incondicionalmente a CUALQUIER tipo de puntero, incluido el ratón — que nunca tuvo un problema de ruido que filtrar (es preciso al píxel). Con la causa real ya resuelta en la ronda 4 (el bloqueo del hilo principal, no el ruido de muestreo, explicaba la mayor parte del temblor), el suavizado pasa a ser una red de seguridad secundaria en vez de el arreglo principal — y su coste (el retraso perceptible, ahora visible también con ratón) ya no se justifica aplicado de forma universal.
- **Decisión**: en `TimeSlider.astro`, el suavizado ahora se activa solo si `e.pointerType` es `'touch'` o `'pen'` (comprobado una vez en `pointerdown`, ya que el tipo de puntero no cambia a mitad de gesto) — con ratón, `pct = rawPct` directo, sin ningún filtrado, exactamente como antes de la ronda 3. Además, `POINTER_SMOOTHING` sube de `0.35` a `0.55` (menos agresivo) ya que ahora es un refuerzo, no la defensa principal contra el temblor.
- **Motivo**: aplicar una solución pensada para el ruido de un dedo real a un dispositivo de entrada (ratón) que nunca tuvo ese problema solo añadía coste (percepción de retraso) sin ningún beneficio — el suavizado debe ser específico del tipo de entrada que realmente lo necesita.
- **Consecuencias**: verificado en navegador — arrastre real con ratón en escritorio (2004→2014) responde de inmediato, sin sensación de retraso ni estela; sin errores de consola, `npm run build` sin errores. La observación sobre la animación de reordenación de la Lista en móvil queda anotada pero no abordada — el propietario no pidió arreglo inmediato para eso.

## D-090 · Slider: rango dinámico real (sin años fijos en código) y throttle de arrastre restringido a táctil

- **Contexto**: dos peticiones del propietario en la misma sesión. Primera, de cara al futuro: el sitio debe aguantar bien intervalos de años cada vez más cortos por año (p. ej. si el rango pasa de 2004–2019, 15 años, a algo como 1980–2030, 50 años). Segunda, un efecto secundario nuevo tras la ronda 4: en escritorio con ratón, el slider ha bajado de velocidad, sigue dejando un halo tipo motion-blur, e incluso los elementos de abajo (celdas de la tabla en Lista) parecen ir más despacio.
- **Diagnóstico 1 (rango dinámico)**: `TimeSlider.astro` tenía `MIN_YEAR = 2004` y `MAX_YEAR = 2019` como literales fijos en el código, completamente desconectados de `calculateDynamicBounds()` en `index.astro`, que sí calcula el rango real a partir de los datos y lo escribe en los atributos `min`/`max` de los `<input type="range">` subyacentes. Funcionaba por coincidencia mientras los datos reales cubrieran exactamente 2004–2019; en cuanto cambiaran (o llegase el escenario de 1980–2030 que plantea el propietario), toda la matemática de arrastre de `TimeSlider.astro` calcularía años relativos a una ventana obsoleta, mientras el resto del sitio (recuento de eventos, filtrado) usaría el rango real — una desincronización silenciosa. Además, cuanto mayor el rango, menos píxeles por año (siguiendo la lógica de D-086 ronda 3) — el suavizado ya implementado ahí sigue funcionando igual de bien sea cual sea el rango, porque es matemática relativa (porcentaje de arrastre), no depende de cuántos años haya.
- **Diagnóstico 2 (halo en escritorio)**: mismo patrón de error que las rondas 3/5 (aplicar un arreglo pensado para las limitaciones de táctil/móvil a cualquier tipo de entrada) — pero esta vez en el throttle de `index.astro` (ronda 4), no en el suavizado de posición. `updateSlider()` limitaba `filterArchives()` a 1 vez cada 120ms mientras `#slider-track-wrapper` tuviera la clase `.dragging`, sin distinguir si el arrastre era con ratón o con el dedo — un ratón en un ordenador de escritorio nunca tuvo el problema de CPU/frecuencia de eventos que ese throttle existe para resolver, así que solo añadía una espera perceptible sin ningún beneficio.
- **Decisión**:
  1. `TimeSlider.astro`: sustituidos los literales `MIN_YEAR`/`MAX_YEAR`/`RANGE` por una función `getBounds()` que lee `sliderMin.min`/`sliderMin.max` en cada uso (en `render()`, el manejador de `pointermove`, `endDrag()` y el clic directo en la barra) — siempre refleja el rango real vigente, sin depender del orden de inicialización entre scripts ni de que el rango se defina una sola vez.
  2. `TimeSlider.astro`, en `beginDrag()`: se anota `trackWrapper.dataset.pointerType = 'touch' | 'mouse'` (a partir de `e.pointerType`, ya calculado para el suavizado de D-086 ronda 5) — la única forma de que `index.astro` sepa qué tipo de entrada originó el arrastre actual, ya que la clase `.dragging` por sí sola no lleva esa información.
  3. `index.astro`, en `updateSlider()`: el throttle de 120ms ahora solo se activa si `trackWrapper.dataset.pointerType === 'touch'` — con ratón, el comportamiento es exactamente el de antes de la ronda 4 (inmediato, coalescido solo por `requestAnimationFrame`).
- **Motivo**: exactamente el mismo principio que D-086 ronda 5 — un arreglo dirigido a una limitación específica de la entrada táctil no debe penalizar a la entrada de ratón, que nunca tuvo ese problema.
- **Consecuencias**: verificado en navegador — `sliderMin.min`/`.max` se leen correctamente como "2004"/"2019" (sin regresión); un `pointerdown` sintético con `pointerType: 'touch'` marca `dataset.pointerType = "touch"` correctamente, uno real con ratón marca `"mouse"`; arrastre real con ratón en Lista (2004→2012) responde de inmediato, sin errores de consola. `npm run build` sin errores. Queda por verificar en dispositivo táctil real que el throttle sigue aplicándose correctamente ahí (la lógica no cambió para ese camino, solo se acotó su condición de entrada).

- **Diagnóstico**: el componente ya cubría Resting/Hover para Primary/Phantom en 40/24px con los tokens correctos (`--action/secondary`, `--action/primary`, `--text/on-action`, sombra + blur en Primary) — el marcado de Figma confirmó esto pixel a pixel. Faltaba: (1) el estado **Pressed** (Primary → fondo `--text/tertiary` #ad858d; Phantom → texto `--action/tertiary` #7a525a, ambos tokens ya existentes en `global.css`); (2) dos instancias sin migrar en `event/[id].astro` (`detail-close-btn`, la X de cierre de la página, y `overlay-close-btn`, el cierre del lightbox) que replicaban el SVG e IconButton a mano en vez de usar el componente; (3) el botón "Menú" (`MenuItem.astro`) con su propio SVG duplicado, sin poder usar `IconButton` directamente porque este renderiza su propio `<button>` y anidar un botón dentro de otro es HTML inválido (el propio `MenuItem` ya ES el botón interactivo).
- **Decisión**:
  1. Extraído `src/components/Icon.astro`: los 5 iconos existentes (`x`, `search`, `chevron-left`, `chevron-right`, `menu`) como SVG puro, sin chrome de botón — consumido tanto por `IconButton.astro` (que ahora solo añade el `<button>`/`<a>` y los tokens de color) como por `MenuItem.astro` (que lo inserta directamente dentro de su propio botón).
  2. `IconButton.astro` gana clases `active:` (Tailwind, equivalente web del estado Pressed de Figma) para Primary y Phantom, y un prop `href` opcional que, cuando se pasa, renderiza `<a>` en vez de `<button>` — necesario para `detail-close-btn`, que es un enlace real (`href="/"`) interceptado por su propio listener de clic para el fundido + recarga dura de D-074, no un botón.
  3. `event/[id].astro`: `detail-close-btn` (Phantom) y `overlay-close-btn` (Primary, posición absoluta preservada vía el prop `class`) migrados a `<IconButton>`, eliminado su SVG/clases a mano.
  4. `MenuItem.astro`: su icono de hamburguesa pasa a `<Icon icon="menu" size={24} strokeWidth={3} />`; sus colores de estado (`group-hover:`, `group-active:`) replican a mano los tokens Resting/Hover/Pressed de `IconButton` Phantom, ya que no puede reusar el componente completo.
- **Motivo**: un único componente fuente de verdad para todos los botones de icono del sitio, con los mismos tokens/estados que Figma, en vez de variantes SVG duplicadas y ligeramente distintas por página.
- **Consecuencias**: verificado en navegador — build limpio, sin errores de consola; captura de la X del detalle de evento, del cierre del lightbox (abierto sobre la imagen del carrusel) y del menú lateral con el botón "Menú" en la cabecera, todos renderizando correctamente tras la migración. La posición exacta de `detail-close-btn` se desplaza ligeramente (su nueva caja interactiva de 40px es 8px más ancha/alta que el SVG de 24px que sustituye) — deliberadamente sin compensar con margen ad-hoc, ya que el propietario señaló por separado un desfase vertical preexistente de esta misma X contra la cabecera genérica del sitio (D-080, pendiente de una pasada de alineación dedicada) y ajustar la posición dos veces habría sido trabajo desechable. El botón "Cambiar modo color" (luna/sol) de `SideMenu.astro` replica el mismo patrón visual de `IconButton` Primary a mano con dos iconos (`moon`/`sun`) fuera del set de `IconButton`/`Icon` — candidato para una futura ronda si el propietario quiere migrarlo también, no incluido en esta por no haber sido nombrado explícitamente.

## D-082 · Desfase vertical de la X del detalle de evento (cerrado) y confirmación de la X como patrón, no "Volver"/"Inicio"

- **Contexto**: siguiendo D-080/D-081, quedaban dos puntos abiertos sobre la cabecera del detalle de evento en escritorio: (1) la X de cierre (`detail-close-btn`) aparecía visualmente más alta que el título "Memoria Electrónica Leonesa" de `HeaderTitle.astro` en el resto del sitio; (2) si, ahora que el detalle de evento es una página real y no un overlay SPA (D-072), seguía teniendo sentido una X de "cerrar" en vez de un enlace de "Volver"/"Inicio".
- **Desfase de la X — medido y corregido**:
  - Causa: `HeaderTitle.astro` centra su contenido en una caja de `h-[48px]`; la X del detalle de evento, antes un SVG de 24px sin caja envolvente equivalente, nacía pegada al borde superior de su contenedor en vez de centrada en esa misma banda de 48px — 12px de diferencia medida (`getBoundingClientRect`) entre el centro vertical del texto del título (69px desde arriba del viewport a 1280px de ancho) y el de la X (57px).
  - La migración a `<IconButton size={40}>` de D-081 ya redujo el desfase a 4px por sí sola (la caja de 40px se acerca mucho más a los 48px de referencia que el SVG de 24px). Se añadió `lg:mt-1` (4px) al botón en `event/[id].astro` para cerrar el resto — verificado en navegador: centro de la X y centro del título coinciden exactamente en 69px.
- **X vs. "Volver"/"Inicio" — se mantiene la X**: se planteó inicialmente que "Volver" o "Inicio" comunicarían mejor una página real con URL propia. El propietario aportó el matiz decisivo: el detalle de evento, aunque es una página real, se sigue *comportando* como un overlay desde el punto de vista de la navegación — se llega desde múltiples orígenes (galería, mapa, lista, búsqueda), Anterior/Siguiente recorre una secuencia filtrada que depende de por dónde se entró, y cerrar restaura exactamente el estado de origen (vista, scroll, cámara de mapa vía `sessionStorage`, D-072/D-075), no un destino fijo. Ni "Volver" (implica un único paso atrás, y competiría visualmente con las propias flechas de Anterior/Siguiente sugiriendo que hacen lo mismo) ni "Inicio" (no hay un inicio canónico al que se vuelva) describen esto con precisión — la X, que solo promete "salir de este evento y recuperar lo que había, sea lo que sea", sigue siendo la más correcta semánticamente.
- **Decisión**: mantener la X (ahora vía `IconButton` Phantom del DS, D-081) como patrón de cierre del detalle de evento, con el ajuste `lg:mt-1` para su alineación vertical. No se persigue ningún patrón de "Volver"/"Inicio" alternativo.
- **Motivo**: la arquitectura de navegación real del detalle de evento (multi-origen, secuencia filtrada, restauración exacta de estado) es la de un overlay aunque la implementación (D-072) ya no lo sea — el lenguaje visual de cierre debe reflejar el comportamiento real, no la implementación subyacente.
- **Consecuencias**: sin cambios de comportamiento, solo el ajuste de 4px en `event/[id].astro`. `npm run build` sin errores.

## D-083 · Anterior/Siguiente: distancia fija de 96px a la caja de la imagen, sin relación con el viewport — X del detalle a 56px del contenido

Esta decisión pasó por tres rondas dentro de la misma sesión — se documentan las tres porque cada una descarta una hipótesis concreta, útil si el problema reaparece.

- **Contexto**: el bloque de navegación Anterior/Siguiente (`#detail-nav-block`) usaba `lg:mt-auto` dentro de un contenedor forzado a `lg:min-h-[calc(100vh-var(--mel-header-pt-desktop)*2)]` — en pantallas altas/cuadradas con contenido corto, esto lo empujaba hasta pegarlo casi al borde inferior del viewport mientras el contenido quedaba mucho más arriba.
- **Ronda 1 (revertida)**: se interpretó mal el encargo inicial y se sustituyó `mt-auto` + `min-h:100vh` por una distancia fija (`lg:mt-16`), eliminando también el `lg:min-h` forzado. El propietario lo rechazó: rompía el paradigma del sitio, hacía que el contenido flotara arriba con hueco vacío debajo en pantallas altas, y podía forzar scroll innecesario. Revertido en su totalidad.
- **Ronda 2 (parcialmente revertida)**: se interpretó que el propietario quería mantener el mecanismo `mt-auto`/`pegado al fondo` pero con un suelo mayor contra el borde inferior — se subió el `pb` del contenedor exterior de ~88px a `18vh` (luego corregido de un valor fijo de 200px a esta unidad relativa, coherente con el resto de espaciados verticales del sitio, regla 9 de `AGENTS.md`). El propietario aclaró que **esto tampoco era lo pedido**: el espacio aumentado quedaba siempre POR DEBAJO de la navegación (el suelo contra el borde, no la distancia al contenido), y explícitamente pidió abandonar tanto el "pegado al fondo de la pantalla" como cualquier "distancia mínima al límite inferior" — solo quería que la navegación mantuviese una distancia fija de 40px respecto al contenido (imagen/tags/info, o la descripción/artistas si estos crecen y la empujan), sin ninguna relación con la altura del viewport.
- **Diagnóstico real (ronda 3)**: al intentar de nuevo eliminar el "pegado al fondo", se descubrió que la ronda 1 nunca había tocado el mecanismo correcto — `lg:mt-auto` en `#detail-nav-block` era **redundante** con `flex-1` + `justify-between` en su contenedor padre (`#detail-page-container`), ambos presentes desde antes de esta sesión. A `lg`, los únicos hijos flex realmente renderizados de ese contenedor son el grid de contenido y el propio nav-block (los demás — `#detail-header-spacer`, `#detail-tags-fixed-spacer`, `#detail-scroll-runway` — son `lg:hidden`, `display:none`, no cuentan como hijos flex). Con solo dos hijos, `justify-between` reparte el 100% del espacio sobrante en ese único hueco — exactamente el mismo efecto que `mt-auto`, así que quitar `mt-auto` en la ronda 1 no cambió nada visualmente (el contenedor padre seguía empujando el bloque al fondo por su cuenta).
- **Decisión final**:
  1. `#detail-page-container`: quitado `flex-1` (ya no se estira para llenar el `min-h-screen` del wrapper exterior) y `justify-between` → `justify-start` (sin espacio sobrante que repartir, aunque lo hubiera). Sin `lg:min-h` forzado (ya quitado en rondas previas).
  2. `#detail-nav-block`: sin `lg:mt-auto` ni `lg:pt-[104px]` — distancia constante `lg:mt-24` (96px) a lo que tenga encima (normalmente la caja de la imagen), en escritorio. En móvil se mantiene `mt-10` (40px), sin cambios — ese valor no formaba parte de esta petición.
  3. Contenedor exterior (línea ~162): revertido `lg:pb-[18vh]` de la ronda 2 a `lg:pb-[var(--mel-header-pt-desktop)]` — el mismo token simétrico que ya usaba `pt`, sin ningún suelo especial contra el borde inferior.
  4. X del detalle: se mantiene `lg:mb-14` (56px) de la ronda 2, sin cambios — esto respondía a una pregunta distinta (la distancia X-a-contenido, no la del nav) y el propietario no lo objetó.
- **Ronda 4 (valor final)**: primera implementación de la ronda 3 usó 40px (el mismo valor que ya llevaba la base móvil) — el propietario corrigió: quería 96px en escritorio, no 40px, indicando que 40 nunca fue el valor correcto ("no sé exactamente a cuánto estaba antes, pero desde luego no a 40"). Cambiado `lg:mt-24` (96px), manteniendo `mt-10` (40px) sin `lg:` override para móvil.
- **Motivo**: la petición real, una vez despejada la confusión de las rondas anteriores, era la más simple posible — nada de relación con el viewport, solo flujo normal de documento con un margen fijo, a 96px en escritorio.
- **Consecuencias**: verificado en navegador — a 1280×900, 96px exactos entre la caja de imagen y el nav (medido `getBoundingClientRect`), página sin scroll cuando el contenido cabe. Reduciendo el viewport a 1280×500, el nav se desplaza y aparece scroll de forma natural, solo cuando hace falta. Verificado también en móvil (390×844): el mecanismo JS existente (`ensureScrollRunway`/`NAV_BOTTOM_GUARD=40`, D-072) sigue intacto y funcionando, sin cambios. `npm run build` sin errores, sin errores de consola.

## D-084 · Tag "Localidad"/"Lugar" invadiendo la columna de la foto en el detalle de evento — regresión de D-080

- **Contexto**: el propietario reportó que, tras los ajustes de layout de esta sesión, el tag "Localidad" (y potencialmente cualquiera de la columna vertical de tags del detalle de evento) se solapaba con la foto en vez de mantener un hueco mínimo de 24px y truncar su propio contenido.
- **Diagnóstico — causa raíz confirmada por medición en navegador**: `TagWithLink.astro` aplica por defecto un ancho FIJO `w-[184px]` cuando no se le pasa una clase de ancho propia (línea 32-33 del componente) — un valor literal calculado en Figma para cuando la columna de tags del grid de 12 columnas (`lg:col-span-2`) mide exactamente 184px, lo cual solo ocurre a 1440px de viewport exactos. El cambio de D-080 (esta misma sesión), que unificó el breakpoint de 108px de margen lateral a `lg` (1024px) en vez de mantener el antiguo `max-w-[1224px]` interno fijo desde `lg`, tiene como efecto colateral que la columna de tags es MÁS ESTRECHA que 184px en todo el rango 1024–1440px (157px medidos a 1280px, 114px medidos a 1024px). Al ser `w-[184px]` una anchura fija (no un máximo), la caja del tag no se encogía con su columna real y se desbordaba sobre la columna de la imagen — el truncado por elipsis de `TagWithLink` (`.tag-count-val`, ya implementado) funcionaba correctamente DENTRO de esa caja de 184px, pero la caja en sí ya no cabía en su celda del grid. Confirmado midiendo con `getBoundingClientRect()`: las 5 tags (Fecha, Lugar, Localidad, Organiza, Diseño) medían 184px de ancho con 0px (a veces negativo) de hueco hasta la columna de la imagen, en TODOS los casos, no solo los de texto largo — la propia caja se desbordaba independientemente del contenido.
- **Decisión**: en `event/[id].astro`, las 5 instancias de `<TagWithLink>` de la columna vertical de tags del detalle de evento (Fecha/Lugar/Localidad/Organiza/Diseño, ya con `hideBorder={true}`, sin divisor vertical) reciben `class="w-full"`, que `TagWithLink.astro` detecta (`hasWidth`) y usa en vez de su `w-[184px]` por defecto — el tag pasa a ocupar el ancho REAL de su columna del grid en cualquier viewport, y el truncado por elipsis ya existente actúa sobre esa anchura real.
- **Motivo**: la caja del tag debe responder al espacio real disponible, no a un valor de Figma válido solo en un ancho de viewport concreto — mismo principio que ya se aplicó en D-061/D-067 a los usos horizontales de `AdaptiveTagsRow`, pero nunca se había extendido a este uso vertical directo del componente.
- **Consecuencias**: verificado en navegador — a 1280px, las 5 tags miden 157.3px (su ancho real de columna) con exactamente 24px de hueco a la imagen; a 1024px (el punto más estrecho de `lg`), 114.7px de ancho con el mismo hueco de 24px exacto. `npm run build` sin errores, sin errores de consola. El propietario apuntó que este bug podría estar relacionado con la auditoría pendiente de `TagWithLink`/`Link.astro` (D-067, deprioritizada previamente) — en este caso concreto la causa fue una regresión puntual de ancho de columna (D-080), no un problema general del componente, así que la auditoría sigue aparcada salvo que reaparezcan síntomas en otras instancias.

## D-085 · Paginación de Lista desaparece para siempre en móvil tras el segundo repoblado — causa raíz encontrada

- **Contexto**: problema aparcado desde D-067 ("Paginación de Lista con carga inconsistente entre navegadores", `roadmap.md`), reportado de nuevo por el propietario: "aparece cuando le da la gana" — especialmente al volver de un evento a la Lista. Probado primero en escritorio (varias rondas de vuelta desde un evento, con y sin búsqueda activa) sin conseguir reproducirlo — el propietario aclaró que lo estaba viendo en emulación táctil/móvil (Comet e igualmente en Chrome), lo que llevó a repetir las pruebas a 390×844.
- **Diagnóstico — causa raíz confirmada por medición en navegador**: `#pagination-controls` se reubica (`relocatePaginationControls()`) dentro de `#list-mobile-cards` la primera vez que la Lista se muestra en móvil — se convierte en un HIJO real de ese contenedor. El repoblado de tarjetas en `filterArchives()` (línea ~2299) hace `mobileListContainer.innerHTML = ''` para vaciarlo antes de reconstruir — pero como `#pagination-controls` YA vive dentro en ese momento, ese `innerHTML=''` lo **destruye por completo**, no solo lo desconecta. La llamada posterior a `relocatePaginationControls()` (unas líneas más abajo, en la misma función) hace un `document.getElementById('pagination-controls')` fresco para reinsertarlo — pero como el nodo ya ha sido destruido (no solo movido), esa búsqueda devuelve `null` para siempre; el guard `if (!pagControls...) return;` la descarta en silencio, sin error en consola. A partir de ahí, la paginación no puede volver a aparecer en esa instancia de página bajo ningún concepto, hasta la próxima recarga dura completa. Como la app usa recarga dura entre página y detalle de evento (D-072), cada visita a un evento SÍ recrea `#pagination-controls` fresco al volver — pero cualquier repoblado adicional de la Lista en móvil DESPUÉS de esa primera reubicación (una búsqueda, un cambio de orden, o —confirmado en pruebas— simplemente visitar un segundo evento y volver) la destruye de nuevo. El comportamiento parecía aleatorio porque dependía por completo del número exacto de repoblados ocurridos antes de mirar, no de nada visible para quien lo probaba. Nunca reproducible con una comprobación síncrona inmediata tras el evento disparador — el repoblado real ocurre dentro de `document.startViewTransition()`, asíncrono; hacía falta esperar antes de comprobar.
- **Por qué escritorio es inmune**: el `innerHTML=''` equivalente en escritorio (línea ~2172) vacía `#list-table-body` (el `<tbody>`), no `#list-table-wrapper` (el contenedor donde se reubica la paginación, un hermano de la `<table>`, no un ancestro de la fila que se vacía) — la paginación nunca vive dentro del elemento que se vacía, así que nunca puede ser destruida por este camino.
- **Decisión**: en `index.astro`, antes de `mobileListContainer.innerHTML = ''`, se comprueba si `#pagination-controls` es actualmente hijo de `#list-mobile-cards` y, si lo es, se saca de en medio (`document.body.appendChild(pagControlsEl)`) antes de vaciar — `relocatePaginationControls()`, llamada más abajo en la misma pasada síncrona (incluso dentro del mismo `startViewTransition`), la reinserta en el lugar correcto antes de que el navegador llegue a pintar el estado intermedio.
- **Motivo**: la única forma de que `innerHTML=''` sea seguro sobre un contenedor es garantizar que nada que deba sobrevivir viva dentro de él en el momento de vaciarlo — mover el nodo primero es más simple y robusto que reescribir el repoblado para no usar `innerHTML=''`.
- **Consecuencias (ronda 1)**: verificado en navegador (390×844) — dos ciclos completos de "abrir evento → cerrar → repoblar" seguidos, más varios disparos directos de `filterArchives()` vía el evento `mel-search`, y `#pagination-controls` sobrevive en los cinco casos, correctamente reubicada y visible. Verificado también que escritorio (1280×900) sigue intacto tras el mismo tipo de repoblado. `npm run build` sin errores, sin errores de consola.

- **El propietario reportó que el problema seguía sin resolverse.** Se hizo una segunda ronda de investigación, esta vez forzando deliberadamente varios disparadores casi simultáneos (búsqueda + clic de paginación + arrastre del slider de años, todos en el mismo tick sin esperar entre medias) para estresar posibles condiciones de carrera entre llamadas de `filterArchives()` solapadas — cada una envuelta en su propio `document.startViewTransition()`, cuya API puede saltarse/reordenar transiciones pendientes cuando se solicitan muy seguidas.
- **Segunda causa raíz encontrada — `relocatePaginationControls()` se negaba a corregir la posición si el elemento estaba oculto**: la función tenía un guard `if (!pagControls || pagControls.classList.contains('hidden')) return;`. Con varias llamadas casi simultáneas, una llamada "perdedora" de la carrera podía dejar el elemento aparcado en `document.body` (el lugar seguro de la ronda 1, antes de vaciar el contenedor) Y con la clase `hidden` puesta a la vez — el guard entonces impedía que ESA MISMA llamada lo reinsertara en su sitio, y como ninguna llamada posterior repara la posición si en ese momento decide que debe estar oculta (el orden es: decidir hidden → solo entonces intentar reubicar, y reubicar se negaba justo cuando hidden acababa de ponerse), el elemento podía quedar **huérfano en `<body>` de forma permanente** — ni destruido (no hay error) ni visible en su sitio correcto, sino simplemente perdido en el documento hasta la próxima recarga dura. Reproducido de forma determinista con el test de estrés: `parentId: ""` (body no tiene id), `hidden: true`, y ninguna interacción posterior (incluida una búsqueda limpia con más de una página de resultados) lo recuperaba.
- **Decisión (ronda 2)**: `relocatePaginationControls()` ya NO comprueba `hidden` para decidir si reubica — siempre corrige la posición al contenedor correcto (`list-table-wrapper`/`list-mobile-cards` según el breakpoint), esté o no oculto en ese momento. Un elemento oculto en el contenedor correcto es inofensivo; uno oculto (o visible) en `document.body` es un bug latente esperando el momento en que alguien lo vuelva a mostrar sin corregir antes su posición.
- **Motivo**: la posición en el DOM y la visibilidad (clase `hidden`) son dos cosas independientes — acoplar la una a la otra (solo corrijo la posición si ya sé que se va a ver) fue lo que permitió que se desincronizaran bajo llamadas solapadas.

## D-086 · Advertencia explícita y regla de oro: no modificar la navegación ni transiciones entre la ficha de evento ("Lugar") y la vista de Mapa

- **Contexto**: Tras varias pruebas intentando añadir animaciones de transición o cambiar las clases activas en SSR al hacer clic en un enlace de "Lugar" de `event/[id]`, se confirmó que alterar el renderizado SSR inicial o la secuencia de inicialización del script cliente rompe los event listeners del panel lateral (`#map-side-panel`), dejando el botón de cierre atascado y sin respuesta.
- **Decisión / Advertencia de Proyecto**:
  1. **NUNCA modificar las clases SSR por defecto** (`#view-galería` active, `#view-mapa` hidden) para intentar preconcebir la vista de mapa en el servidor.
  2. **NUNCA añadir animaciones de transición personalizadas** ni View Transitions asíncronas adicionales a la apertura del panel del mapa desde un enlace de lugar.
  3. Mantener siempre el flujo asíncrono probado en cliente: el mapa se centra (`googleMap.panTo`), `populateSidePanel()` abre el panel mediante `setSidePanelOpenState(true)` con retardo acotado (300ms delay), y el listener del botón de cierre se gestiona manualmente sin depender del AbortController reactivo de la página para evitar que quede huérfano.
- **Motivo**: Priorizar la estabilidad del mapa y la usabilidad del panel (poder cerrar siempre la ventana) sobre cualquier intento de animación o pre-renderizado experimental.

## D-087 · Eliminación de animaciones de entrada/FLIP en la Galería y simplificación del orden aleatorio

- **Contexto**: Las animaciones de entrada (`intro-in`, `reveal-pending`, `reveal-in`, escalonados) y el almacenamiento del orden aleatorio en `sessionStorage` (`galleryRandomKeys`) producían disconformidades visuales (tarjetas rebarajándose en cliente tras la carga inicial de SSR, comportamiento inconsistente de scroll al volver de un evento).
- **Decisión**:
  1. **Renderizado instantáneo y limpio**: Se eliminan todas las animaciones de entrada, FLIP y observadores de revelado (`revealObserver`) en la rejilla de la Galería. Las tarjetas se renderizan e insertan directamente de forma inmediata.
  2. **Coherencia SSR ↔ JS sin `sessionStorage`**: El script de cliente recibe `initialArchives: shuffledArchives` desde el servidor en la directiva `define:vars`. En cada carga o recarga (F5), los arrays del estado local `_s.archives` se actualizan con la respuesta fresca de SSR. Cada recarga (F5) produce un orden aleatorio completamente nuevo y fresco.
  3. **Preservación del DOM SSR en primera carga**: Para evitar el salto de layout ("todo roto") al entrar por primera vez, el primer renderizado en cliente (`isFirstDOMUpdate`) conserva las 32 tarjetas ya renderizadas en el marcado HTML por el servidor en lugar de vaciar `#gallery-grid` y reconstruirlas vía JS.
  4. **Restauración directa de scroll**: Al volver de la ficha de un evento (`pendingReturnState`), se restaura la cantidad de tarjetas visibles (`galleryVisibleCount`) tras la inicialización del slider, permitiendo que la rejilla alcance la altura necesaria y la posición de scroll se recupere con precisión.
  5. **Eliminación del re-ordenado cronológico por defecto**: Se elimina el bloque `else` de `filterArchives()` que forzaba una reordenación cronológica por fecha cuando `currentSortCol` era nulo. Al arrancar la página, la Galería mantiene intacto el orden aleatorio inicial procedente de SSR sin sustituirlo por el orden cronológico al cabo de unos instantes.

## D-088 · Eliminación del salto de layout del Selector de Vista (Toggle) en la cabecera en escritorio

- **Contexto**: Durante la carga inicial de la página (SSR), la fila de etiquetas (`#home-highlights-tags`) renderizaba con la clase `highlights-flex-content` (ancho `calc(100% + 48px)`), provocando que el contenedor del selector de vista (`#home-toggle-wrapper`) fuera desplazado a una segunda línea por debajo de las etiquetas. Cuando el JavaScript del cliente se ejecutaba unos instantes después y conmutaba el modo adaptativo a la misma línea, el selector "saltaba" repentinamente a la primera línea junto a las etiquetas.
- **Decisión**:
  1. En el marcado SSR inicial, se añade por defecto la clase `toggle-shares-line` a `#home-toggle-wrapper`.
  2. En CSS para escritorio (`@media (min-width: 1024px)`), la fila de etiquetas dentro del toolbar se ajusta a `width: auto; flex-shrink: 1;`.

## D-089 · Mantenimiento del espaciado de Galería a 24px y simplificación del flujo de regreso de evento

- **Contexto**: Tras evaluar pruebas de espaciado y restauración de scroll, el propietario solicitó mantener la separación original de 24px entre tarjetas (`gap-x-mel-l`, `GALLERY_GAP = 24`) y eliminar la lógica diferida de memorización de scroll al cerrar eventos, retornando al flujo nativo sin saltos.
- **Decisión**:
  1. La rejilla de la Galería mantiene `gap-x-mel-l` y `GALLERY_GAP = 24`.
  2. Se elimina la lógica de persistencia de scroll diferida (`saveReturnState`, `pendingReturnState`, `restoreScroll`) para evitar complejidad innecesaria y garantizar una navegación nativa limpia.

## D-090 · Estabilidad del orden en Lista durante la sesión y lectura del parámetro `search` en URL

- **Contexto**: Al abrir un evento desde la vista de Lista y volver a la home, la tabla perdía el texto de búsqueda activo y reordenaba aleatoriamente las filas debido a una sobrescritura automática del array en cada navegación.
- **Decisión**:
  1. **Lectura de búsqueda en URL**: Al inicializar la home (`initHomePage`), se lee el parámetro `search` de `window.location.search`. Si existe, se asigna al estado `searchQuery` y se rellena el campo del buscador (`search-input`), manteniendo los resultados filtrados intactos al volver del evento.
  2. **Estabilidad de datos durante la sesión**: Se evita la sobrescritura del array de datos (`_s.archives`) en los navegaciones del cliente. Los datos y el orden de las filas permanecen 100% estables durante toda la sesión, rebarajándose únicamente si el visitante efectúa una recarga dura explícita (F5).

## D-091 · Acotación de medición adaptativa de etiquetas a 176px para evitar salto visual del Toggle

- **Contexto**: Al entrar por primera vez o recargar, las fuentes del sistema (utilizadas como fallback antes de cargar Lora / Space Grotesk) medían temporalmente un ancho ligeramente mayor (~179px por etiqueta), haciendo que el calculador adaptativo creyera falsamente que las etiquetas no cabían junto al selector de vista (Toggle) y desplazara el Toggle a la segunda línea durante unos instantes.
- **Decisión**:
  1. En `updateAdaptiveTagsRow`, se acota la medición del ancho natural a la cota máxima permitida por CSS (`effectiveMaxNatural = Math.min(maxNatural, 176)`).

## D-092 · Sincronización de la navegación entre eventos (Anterior/Siguiente) con la sesión y la ordenación activa de columna

- **Contexto**: Se requería que al abrir la ficha de un evento (`/event/[id]`), la navegación entre eventos (*Anterior* / *Siguiente* y flechas `←` / `→`) siguiera la secuencia exacta activa en la pantalla principal (sea el orden aleatorio de la sesión o el orden por columna de la vista de Lista).
- **Decisión**:
  1. **Persistencia del orden aleatorio de la sesión**: `initHomePage()` guarda la secuencia de IDs de la sesión en `sessionStorage['mel-session-order']`. Si no hay ordenación por columna activa, `/event/[id]` utiliza esta secuencia para mantener la navegación continua entre carteles.
  2. **Traducción completa de columnas en SSR**: `navigateToEvent()` transmite `sort` y `dir` en la URL. El servidor en `/event/[id]` mapea todos los nombres de columnas de la Lista (`evento`, `fecha`, `lugar`, `localidad`, `organiza`, `disenador`) a los campos del modelo, ordenando los datos directamente en SSR.
## D-093 · Restablecimiento de separadores verticales de etiquetas, encuadre adaptativo de foto y lightbox en tablet

- **Contexto**: Tras restaurar el layout V2 en `/event/[id]`, se identificaron tres desajustes específicos: (1) las etiquetas móviles carecían de sus divisores verticales, (2) el cartel quedaba centrado con franjas en lugar de adaptarse al contenedor, y (3) el modal lightbox no se abría en pantallas tablet ($\ge 480px$).
- **Decisión**:
  1. **Separadores verticales en etiquetas**: Se integra `AdaptiveTagsRow` en `#detail-tags-fixed`, restaurando las líneas divisoras verticales (`border-mel-border`) entre etiquetas.
  2. **Escalado fluido de foto en scroll móvil (`fit` mode)**: El contenedor de imagen pasa a ocupar `h-full` de `#detail-image-crop` con la clase `object-contain`, haciendo que al encoger la caja durante el scroll móvil (360px → 200px) el cartel escale progresivamente para adaptarse al alto disponible sin recortes superiores/inferiores ni desbordamientos (`object-cover`).
## D-094 · Estandarización de clases utilitarias `typo-body-sans` y `typo-body-roman` a nivel de componente

## D-096 · Descorrelación inicial Galería/Lista y re-sincronización cronológica ante interacción

> **Superada (parcialmente) por el Contrato de Navegación** en `architecture.md`. Ya no hay descorrelación: Galería y Lista comparten **siempre** la misma secuencia, y filtrar o buscar solo oculta elementos, nunca reordena. La regla de "resincronizar ante cualquier interacción" que describe esta entrada provocaba que la Lista saltase a orden aleatorio en cuanto había una búsqueda activa y volviese a cronológico al borrarla.

- **Contexto**: Para mejorar la experiencia de descubrimiento y lectura histórica, la vista de Lista debe mostrarse inicialmente ordenada de forma cronológica (2004 ➔ 2019), mientras la Galería conserva su mosaico aleatorio inicial. Al realizar cualquier interacción (filtro, búsqueda, slider de años o reordenación), ambas vistas se re-sincronizan cronológicamente (o según el orden de columna seleccionado).
- **Decisión**:
  1. En el estado inicial sin filtro ni sort activo, la **vista Lista** renderiza los eventos ordenados cronológicamente por fecha (`initialArchives`), mientras la **Galería** renderiza su mosaico aleatorio (`shuffledArchives`).
  2. Ante cualquier acción del usuario (filtro, búsqueda, slider de años, tag o clic en columna), **Galería y Lista se sincronizan**, mostrando el dataset filtrado/ordenado en la misma secuencia.
  3. El vector de navegación `sessionStorage['mel-active-nav-sequence']` se inicializa y mantiene ordenado cronológicamente por defecto, garantizando que el recorrido por fichas de evento siga la historia cronológica.


















## D-097 · La ausencia de dato se sustituye por la invitación a colaborar

- **Contexto**: Un campo sin dato se pintaba inerte en `text-tertiary` ("Desconocido", "Varios"…). Enseñaba el hueco sin ofrecer nada. Un primer intento añadió un enlace "¿Nos ayudas?" **debajo** del valor, pero solo en artistas: en las tags no cabía, porque cada tag habría crecido un renglón.
- **Decisión**: el término centinela detectado se **sustituye** por el enlace "¿Nos ayudas?" a `/info#contacto`, ocupando el sitio del valor. Al no añadir nada, vale para todas las tags sin tocar su geometría. Queda derogado el par "valor inerte + enlace suelto" de artistas.
- **Alternativa descartada**: renombrar la sección de destino a "Colabora". El propietario prefirió mantener "contacto"; el ancla ya existe y funciona.
- **Excepción**: la vista Lista mantiene el valor inerte (`celdaSinDato`). Repetir la invitación en decenas de filas la convierte en ruido.

## D-098 · La fila de tags de la ficha nunca repartía el ancho (faltaba la medición)

- **Contexto**: La regla compartida (D-059/D-060) dice que una fila de tags ocupa todo el ancho a partes iguales **siempre que ninguna tag tenga que truncarse**, y si no, cada una conserva su ancho natural y la fila sangra y hace scroll. El reparto lo decide una medición en cliente, `updateAdaptiveTagsRow()`. En la ficha de evento esa medición **no existía**: la fila se quedaba para siempre en el modo de ancho de contenido que pinta el SSR. En tablet ancho (~934–1023px) cabían las cinco a partes iguales y aun así se apelotonaban a la izquierda con hueco muerto a la derecha.
- **Decisión**: gemelo reducido de la función en `event/[id].astro` (`ajustarFilaTags()`), sin el tramo de "espacio reservado por un hermano" — aquí la fila nunca comparte renglón. Se llama al inicializar, al redimensionar y tras `document.fonts.ready`; **no** en cada tick de scroll, que es donde ya vivía `updateTagsFixed()`.
- **Detalle que costó**: hay que medir el ancho de **contenido** del contenedor, no su caja. `#detail-tags-fixed` lleva `px-6 sm:px-12` propio; con `getBoundingClientRect()` se regalaban 96px que la fila no tiene.

## D-099 · Una tag ya topada no pone el listón del reparto de ancho

- **Contexto**: El criterio de `updateAdaptiveTagsRow()` exigía que el reparto a partes iguales fuese ≥ la tag natural más ancha, acotada al tope de 176px (D-061/D-091). Pero una tag que llega a ese tope **ya se está truncando en los dos modos**: en `MEL-00001`, "S. Andrés del Rabanedo" mide 167px de texto en 151px de caja tanto si la fila reparte como si no. Tomarla como listón bloqueaba el reparto de la fila entera y dejaba 134px de hueco muerto a la derecha a cambio de nada — el texto se cortaba igual.
- **Decisión**: el listón es la tag natural más ancha **por debajo** del tope; las que ya están topadas quedan fuera de la referencia. Si todas lo están, se cae al valor anterior (176) y no cambia nada. La garantía se mantiene donde importa: ninguna tag que hoy se ve entera empieza a cortarse por repartir.
- **Efecto colateral bueno**: refuerza D-091. Una sobremedición con la fuente de respaldo (~179px) ahora sale de la referencia en vez de elevarla, así que tiene aún menos margen para tirar el Toggle a la segunda línea.
- **Alcance**: corregido en las dos copias de la función (`index.astro` y `event/[id].astro`). En la barra de la home y en el panel del mapa el cambio es aritméticamente idéntico al anterior —sus tags son recuentos cortos que nunca llegan al tope— y así se verificó.

## D-100 · Correcciones de la revisión de D-097/D-098/D-099

- **Listón por desbordamiento real, no por ancho**: excluir del listón las tags "de 176px" fallaba en la banda [175,5, 176): una tag que cabe entera quedaba fuera y podía empezar a cortarse justo por repartir, que es lo contrario de lo que promete D-099. Ahora se pregunta si el valor **desborda de verdad** (`scrollWidth > clientWidth` sobre `.tag-count-val`), que es exacto y no depende de tolerancias.
- **La rama que comparte renglón conserva el listón conservador**: equivocarse compartiendo cuesta un salto del Toggle a la segunda línea (D-091, bug real); equivocarse en solitario solo cuesta una columna algo más estrecha. Además cierra la ventana en la que las fuentes de respaldo hacen desbordar unas tags y otras no, bajando el listón a media carga para volver a subirlo en `fonts.ready`.
- **Ancho de contenido también en `updateAdaptiveTagsRow()`**: el contenedor del panel del mapa lleva `px-6 / sm:px-12 / lg:px-6` propio. El arreglo de D-098 se había quedado solo en el gemelo de la ficha; medir la caja regalaba hasta 96px y podía repartir sobre un ancho inexistente.
- **Una sola definición de las cinco tags** (`TAGS_EVENTO`): la fila de móvil/tablet y la columna de escritorio eran dos listas paralelas escritas a mano, justo donde se cuelan las divergencias. Ahora se pintan de la misma.
- **Nombre accesible por tag**: convertir cinco huecos en cinco enlaces con el mismo texto dejaba cinco entradas idénticas en el listado de enlaces de un lector de pantalla. Cada invitación lleva `aria-label` con el campo que falta; `Link` y `TagWithLink` aceptan `ariaLabel`.

**Pendiente que la revisión dejó anotado y NO se toca aquí**: `pr-[32px]` de la fila de la home no entra en la cuenta del reparto (8px de holgura). Los otros dos —artistas vacío y el `'León'` por defecto— se resuelven en D-101.


## D-101 · El campo vacío es el mismo hueco que el centinela, y el parseo deja de inventar

- **Contexto**: quedaban dos incoherencias con D-097. El bloque de artistas **se ocultaba** si el campo venía vacío pero mostraba la invitación si traía "Desconocido", cuando vacío es justo el caso donde más sentido tiene pedirlo. Y `lugar` no podía mostrarla nunca: el parseo rellenaba la celda vacía con `'León'`, así que el hueco jamás llegaba a detectarse.
- **Decisión**:
  1. Vacío y centinela reciben el mismo trato en artistas. El bloque no se oculta nunca: se normaliza la lista una sola vez (`ARTISTAS`) y un campo vacío sale de ahí como una única entrada, exactamente igual que un "Desconocido". De paso desaparece la coma sobrante que dejaba un separador final ("DJ A, "), porque `isLast` ya se calcula sobre la lista filtrada.
  2. `lugar` deja de rellenarse con `'León'` en los dos parseos. Sin dato es sin dato: inventaba un local que no existe y bloqueaba la invitación. `localidad` ya salía vacía y se queda así.
  3. Los dos usos derivados de ese valor inventado: el título del grupo del mapa cae a `'Lugar desconocido'` en vez de a `'León'`, y la línea de dirección del panel se queda vacía en lugar de fabricar una.
- **Verificación**: ninguna fila de la hoja tiene hoy `lugar`, `localidad` ni `artistas` vacíos, así que el cambio no altera nada de lo que se ve ahora mismo — quita la trampa, no un síntoma. El camino nuevo se cubre con aserciones sobre la normalización (vacío / nulo / solo separadores / centinela suelto / mezcla con separador final).

## D-102 · La posición inicial de la fila de tags no puede ser un número fijo

- **Síntoma**: en móvil la fila de tags de la ficha aparecía desplazada y llegaba a tapar el título del evento, "aunque al final vuelve a su lugar".
- **Causa raíz**: `#detail-tags-fixed` llevaba `top: 136px` fijo en CSS para la primera pintada, antes de que `updateTagsFixed()` midiera la cabecera. Pero **el alto de la cabecera no es constante**: su padding superior es `calc(10vh - 40px)`, así que depende del alto de la ventana. Los 136px estaban calibrados para una sola altura. Medido: la cabecera vale `10vh + 88px` (padding superior `10vh - 40px` + 96px de contenido —fila de la X 48 + `mb-4` 16 + título 32— + 32px de padding inferior), verificado a 600, 812, 844 y 896px con 0,01px de error.
- **Efecto**: cuanto más alto el teléfono, peor. A 667px de alto la fila daba un salto de 19px al cargar; a 844px solapaba el título 4px; a 896px (iPhone XR/11), 10px. El "vuelve a su lugar" era el JS recolocándola después.
- **Arreglo**: `top: calc(10vh - 40px + 128px)`, la misma cuenta que hace la cabecera, para que las dos se muevan juntas. Con esto la posición del CSS coincide exactamente con la que calcula el JS y no hay salto en ninguna altura.
- **Regla general**: en este proyecto los espaciados verticales van en `vh` a propósito (ver regla 9 de CLAUDE.md). Un valor en px que sustituya a una medida derivada de `vh` solo es correcto en la pantalla en la que se calibró — y aquí falla justo en los teléfonos más comunes.
- **Había un segundo fallo, distinto y más grave**, que solo se vio con la captura de pantalla del teléfono: ver D-103.


## D-103 · No encadenar la posición de un elemento fijo a la medición en vivo de otro durante el scroll

- **Síntoma**: en el iPhone, al desplazar la ficha de evento, la fila de tags se subía **sola** por encima del título y lo tapaba entero —con la X todavía en su sitio, o sea que la cabecera no se había movido— y al detenerse el scroll volvía a su posición. No se reproducía en el sandbox; se identificó con una captura de vídeo del dispositivo (fotograma 4,13s: X visible, título desaparecido bajo la fila; 4,81s: fila arriba del todo y el título asomando cortado por debajo).
- **Causa raíz**: `updateTagsFixed()` se llamaba desde `updateStickyImage()`, que corre **en cada tick de scroll**, y colocaba la fila con `top = stickyHeader.getBoundingClientRect().bottom` — es decir, leyendo en vivo el rectángulo de **otro elemento `fixed`**. En Safari de iOS los elementos `position: fixed` acompañan a la página mientras dura el desplazamiento y solo se reconcilian cuando este se detiene; durante el scroll esa lectura devuelve una posición que no es la real, y la fila se colocaba respecto a una cabecera fantasma. El último tick, ya parado, escribía un valor bueno: de ahí el "al final vuelve a su lugar".
- **Arreglo**: sacar `updateTagsFixed()` del camino del scroll. Su `top` **no depende de la posición de scroll**, solo del alto de la cabecera, así que se calcula al iniciar, al redimensionar y tras `document.fonts.ready` (todo vía `ensureScrollRunway`). Escribirlo 60 veces por segundo era coste puro; en iOS, además, activamente dañino.
- **Regla general**: dentro de un manejador de scroll, no leas `getBoundingClientRect()` de un elemento `fixed` ni encadenes la posición de uno a otro. Lo que no dependa del scroll se calcula fuera del scroll.
- **Verificación**: con el `top` ensuciado a mano (`999px`) y recorriendo todo el rango de scroll, el valor sucio sobrevive — ya nadie lo reescribe. Al redimensionar a 844px de alto vuelve a cuadrar con la cabecera (172,4 = 172,4) y no toca el título.

## D-104 · Las imágenes se piden al tamaño que se van a pintar, y no antes de hacer falta

- **Síntoma**: en Safari las fotos directamente no cargaban; en Chrome cargaban pero el sitio iba lentísimo.
- **Medición**: en la galería a 390px había **96 imágenes de Drive en el DOM, 2 visibles y 0 con carga diferida**, todas pedidas a `sz=w1000`. Muestra de cinco flyers reales: media de **679 KB** por imagen a w1000 (el peor del archivo, 2 MB). Son unos **64 MB** descargados y descodificados para enseñar dos. Safari de iOS aplica un presupuesto de memoria de imagen descodificada por pestaña mucho más estricto que Chrome: al superarlo deja de pintarlas.
- **Causa**: `extractDriveImage()` incrustaba `w1000` y está copiada a mano en cuatro sitios, así que no había forma de pedir otro tamaño. Y la fábrica de tarjetas en JS (`buildGalleryCard`) había perdido el `loading="lazy"` que su original `FlyerCard.astro` sí tiene — otra divergencia de las que avisa la regla 7, y la que de verdad dolía, porque la galería la construye el JS.
- **Arreglo**:
  1. `extractDriveImage(url, ancho = 1000)`: cada llamada pide lo que va a usar. Tarjeta de galería `w700` (se pinta a 342px, 684 con densidad 2), miniatura de la lista `w200` (caja de 40px), retrato de info `w500`, ficha y lightbox `w1000` (a pantalla completa con densidad 3 son ~1170px reales).
  2. `loading="lazy"` y `decoding="async"` en las réplicas JS y en info, recuperando la paridad con los componentes Astro.
- **Por qué la carga diferida es segura aquí**: `.gallery-item.unsized` ya reserva `min-height: 280px`, así que las tarjetas de abajo ocupan sitio real y el navegador no las da por visibles. Sin ese hueco reservado, la carga diferida no habría servido de nada.
- **Resultado medido**: de **96 descargas al entrar a 9**. Recorriendo la galería entera se descargan las 50 tarjetas y quedan **0 sin dimensionar** — el masonry cuadra igual.

## D-105 · La ficha de evento vuelve a ser una página normal

- **Recorrido**: la ficha era la única pantalla del sitio que desplazaba el documento con elementos `position: fixed` — tres, cada uno con un espaciador reservándole el hueco a mano y una pista de scroll compensando el descuadre. De ahí salieron D-102 y D-103. El primer intento de arreglo de raíz fue copiar el andamiaje de la home (`h-dvh` + contenedor interno con scroll). **Falló por dos motivos, los dos detectados por el propietario en el teléfono**:
  1. Con un contenedor interno, el documento no se desplaza, así que **la barra del navegador no se repliega nunca** y no devuelve pantalla. Es justo lo que el propietario valora de la página de información.
  2. La caja de la foto quedaba fuera del área desplazable, así que **no se podía arrastrar sobre ella** — media pantalla muerta al tacto.
- **Decisión final**: documento desplazable, cero `fixed` y cero contenedores con scroll propio. La cabecera se parte en dos:
  - **La fila de la X va en flujo normal** y se marcha hacia arriba hasta esconderse bajo la barra del navegador. Ocupa exactamente los mismos píxeles que la fila del buscador de la home (44–92 en un teléfono de 844px de alto), para que el icono no salte al cambiar de página.
  - **Título y fila de tags van en un bloque `sticky top-0`**: suben con el contenido hasta tocar el borde y ahí se quedan. El propietario fue explícito: el nombre del evento no debe irse nunca. A partir de `lg` el bloque se disuelve con `display: contents` y el título vuelve a la columna de info.
  - La foto y el resto del contenido pasan por debajo del bloque pegajoso.
- **Por qué `sticky` y no `fixed`**: lo gestiona el compositor y reserva su propio hueco, así que no hay espaciadores que mantener; y a diferencia de `fixed` no se re-ancla cuando la barra del navegador redimensiona el viewport a mitad de un gesto, que era exactamente D-103.
- **Se pierde el encogido de la foto**, y no por descuido: dependía de que algo se desplazara por dentro y obligaba a que la foto tapase contenido para no realimentarse (encoge la foto → crece el contenedor → queda menos recorrido → el scroll se recorta → la foto vuelve a crecer). Sin él, la página no tiene una sola línea de JS ligada al scroll.
- **Dato medido que corrige una creencia previa**: la cabecera de `info.astro` **no se sale por arriba**. Es `sticky top-0` y su borde superior se queda clavado en 0 a cualquier altura (medido a 0, 150, 400 y 786px). Lo que se percibe como "sube" es la barra del navegador replegándose y devolviendo pantalla — que solo ocurre si el documento se desplaza.

## D-106 · Cabecera de dos alturas, foto pegajosa que encoge, y contenido a ras

Estado final de la ficha de evento en móvil, tras cuatro correcciones del propietario sobre el diseño anterior.

- **Cabecera en un solo bloque `sticky` anclado en `top: -alturaX`.** La fila de la X queda por encima del borde: al desplazar, lo que se ve pegado arriba es solo título y tags. Al arrastrar hacia abajo, la clase `.revelada` la baja con un `translateY` y la X vuelve a asomar — es lo primero que aparece. Se usa `transform` y no `top` porque el navegador lo compone aparte. Umbral de 4px para que el temblor de un dedo quieto no la haga parpadear.
- **El bloque sangra a los bordes** (`-mx-6 px-6 w-[calc(100%+48px)]`). Sin eso su caja se quedaba en el ancho de contenido y por los 24px de cada lado se veían pasar las rayas del fondo de la foto, que sí llega a sangre. Ojo: `w-full` y `w-[calc(...)]` en la misma clase se pelean y ganaba el primero.
- **La foto es `sticky` bajo la parte siempre visible** y encoge de 360 a 200. Dos invariantes la sostienen:
  1. **El alto de su columna se congela** al iniciar, medido con el recorte al máximo. Si la columna encogiera con el recorte, el documento se acortaría a mitad de scroll y el navegador recolocaría la posición: la foto volvería a crecer sola.
  2. **El encogido se ata a lo que la columna lleva *pasado* el punto donde se pega**, no al scroll bruto. Con eso el borde inferior de la foto y el comienzo del contenido bajan al mismo ritmo y el hueco entre ambos es exactamente 0 en todo el recorrido (medido). Atado al scroll bruto, la foto empezaba a encoger antes de pegarse y abría un hueco creciente.
- **El contenido no lleva margen superior**: arranca a ras del borde inferior del bloque de la foto y pasa por debajo. Cuando el evento no tiene paginación, la caja de la foto lleva un faldón macizo propio de 32px; cuando la tiene, los 24px de abajo del `py-6` de los puntos ya hacen ese papel.

Todo esto se desmonta a partir de `lg` con `display: contents`: la rejilla de 12 columnas, la foto estática y el título en su columna, sin cambios.

## D-107 · Aire superior de móvil en un token, y la foto compensa el revelado de la X

- **Aire superior**: las seis pantallas repetían a mano `pt-[calc(10vh-40px)]`, que en un teléfono de 844px daban 44px muertos arriba del todo. Pasa a `--mel-header-pt-mobile: 16px` en `global.css` (9 usos migrados). Se cambia en un sitio y las seis siguen coherentes. Verificado: el icono de menú o la X quedan a 20px del borde en home, información y ficha de evento — las tres iguales, 28px más arriba que antes. En escritorio no cambia nada (`--mel-header-pt-desktop` sigue igual).
- **El bug del "tirón" de la foto**: al revelarse la X, la cabecera y la foto bajan `alturaX` (48px) pero el contenido no. Resultado medido en todo el camino de vuelta: **solape constante de 48px** entre el borde inferior de la foto y el comienzo del contenido, que la caja se comía y no devolvía nunca. El propietario lo describió como que las letras "tiran" de la caja.
  - **Arreglo**: al estar revelada, el recorte descuenta esos mismos 48px de su alto. El borde inferior de la foto se queda donde estaba y el contenido no se entera del revelado.
  - **Efecto buscado**: con eso la reampliación de la foto es de verdad **lo último** que ocurre al volver arriba. Medido: el recorte se mantiene en su mínimo de 200 hasta que el solape llega a 0, y solo entonces empieza a crecer.
  - **Orden de operaciones**: la clase `revelada` se decide ANTES de calcular el alto del recorte, o la compensación llegaría un fotograma tarde.

## D-108 · La ficha renuncia a la barra replegable de Chrome, como la home

- **Pregunta del propietario, respondida**: la barra superior y la inferior de Chrome en Android **no se pueden manejar por separado**. Se repliegan y vuelven juntas, como una sola respuesta al scroll del documento; no hay API ni CSS que las separe. Los píxeles que regala el replegado vienen en el mismo paquete que el vaivén de los elementos anclados. O las dos, o ninguna.
- **Decisión**: la ficha renuncia a ellos, igual que la home. El documento no se desplaza (`h-dvh` + `overflow: hidden` en el envoltorio) y el que scrollea es `#detail-page-container`. Así la barra no se repliega nunca y nada se mueve de sitio. Queda pendiente, si algún día se quiere recuperar ese espacio, hacerlo **para todas las pantallas a la vez**.
- **Trampa que costó encontrar**: al convertir el contenedor en columna flex de alto acotado, sus hijos pasan a encogerse por defecto. El alto congelado de la columna de la foto (392px) lo pisaba el reparto flex y quedaba en 156, con lo que el hueco reservado desaparecía, `scrollHeight` se igualaba a `clientHeight` y **el contenedor se quedaba sin nada que desplazar**: cualquier `scrollTop` volvía a 0 en el fotograma siguiente. Se arregla con `shrink-0` en los hijos que tienen alto propio.
- **Sin verificar aquí**: que arrastrar sobre la foto desplace. La foto es `position: fixed`, y para un elemento fijo el encadenamiento de scroll sigue la cadena de bloques contenedores, no la del DOM. Los eventos de rueda sintéticos no provocan scroll real, así que este entorno no puede resolverlo. **Si falla en el teléfono**, la salida conocida es renunciar al encogido y dejar la foto `sticky` en flujo, que sí arrastra con seguridad.

## D-109 · Fuera el sangrado con márgenes negativos en móvil

- **Síntoma**: aparecía scroll horizontal en toda la ficha; se podía arrastrar la página en círculos.
- **Causa**: `overflow-y: auto` en el contenedor **convierte el eje X en `auto` automáticamente** (regla del CSS: un eje distinto de `visible` arrastra al otro). Y los elementos que van a sangre lo conseguían con márgenes negativos (`-mx-6 w-[calc(100%+48px)]`), sobresaliendo 24px por cada lado. Con el documento desplazándose eso quedaba recortado por la ventana; con un contenedor desplazable, se volvió recorrido horizontal.
- **Descartado**: `overflow-x: clip` con `overflow-clip-margin`. Cuando el otro eje es `auto`, `clip` **computa a `hidden`** y el margen de recorte deja de aplicar, así que el sangrado se cercenaba.
- **Decisión**: quitar la causa. El padding lateral baja del envoltorio a los hijos que lo necesitan (cabecera, contenido y navegación), y cabecera y foto pasan a `w-full` sin márgenes negativos. Nada sobresale, así que no hay nada que recortar.
- **Trampa al hacerlo**: la columna de info conservaba un `pl-0` de cuando el padding venía de fuera, y le ganaba a `px-6`. El contenido quedó pegado al borde izquierdo hasta quitarlo.
- Verificado a 390px: sin scroll horizontal (`scrollWidth` = `clientWidth`), X, título, descripción y ARTISTAS todos a 24px, y la foto de 0 a 390. A 1440 no cambia nada.

## D-110 · La cabecera anclada tapaba 16px de la foto

- **Síntoma**: "la foto se empieza a cortar ligeramente por arriba cuando la caja se hace más pequeña".
- **No era el recorte de la imagen**: el `<img>` usa `object-contain`, así que al encoger la caja la foto **escala**, no se corta (verificado con un cartel vertical de 992×1403: pasa de 255×360 a 218×309 con el borde superior siempre a ras).
- **Causa real**: el punto donde se fija la foto se calculaba como el alto de título+tags, pero el borde inferior REAL de la cabecera anclada incluye además el aire superior del contenedor. Eran 160 frente a 176: **la cabecera se comía 16px de la parte de arriba del cartel**, que en un archivo de diseño gráfico es justo lo que no se puede tocar. Ahora `--mel-cab-fija` se mide como `alto de cabecera - lo que se esconde + padding superior`. Verificado: solape 0 en todo el recorrido.
- **El escalón que quedaba se resolvió en D-111.**


## D-111 · El revelado de la X deja de ser un interruptor

- **Síntomas, los dos del mismo origen** (identificados con una captura de vídeo del propietario en Chrome): al volver arriba, el contenido quedaba parcialmente tapado por la caja de la foto, "como si el contenido tirase de la foto para hacerla grande antes de tiempo"; y al final del recorrido había un tirón con salto.
- **Causa**: revelar la X hacía crecer el bloque visible 48px **de golpe**, y algo tenía que ceder. Con la foto bajando esos 48px, tapaba 48px de contenido (medido). Compensándolo con la altura del recorte, el escalón se trasladaba a la caja. Las dos salidas eran malas porque el revelado era binario.
- **Decisión**: el revelado pasa a ser una **cantidad continua** de 0 a la altura de la X (`--mel-revelado`), que sigue al dedo píxel a píxel. Se mueve el `top` del anclaje en vez de aplicar un `transform`, para que el recorrido enlace sin costura con la posición natural de la cabecera cuando aún no está anclada. El recorte descuenta esa misma cantidad, así que el borde inferior de la foto no se mueve nunca.
- **Segundo tope, menos evidente**: el revelado se acota además por lo desplazado por encima del punto de anclaje. Al soltarse la cabecera, lo que se ve de la X pasa a depender de la posición y no del gesto; sin ese tope quedaba un escalón de 58px justo ahí.
- **Verificado con pasos de 5px sobre todo el recorrido, ida y vuelta**: contenido tapado 0, cabecera sobre la foto 0, salto máximo del recorte 10px, salto máximo de la cabecera 5px — o sea, 1:1 con el dedo.
- **Un descuido previo que este trabajo destapó**: al corregir el anclaje de 160 a 176 (D-110), el cálculo de cuándo empieza a encoger la foto se quedó con el 160 viejo. Ahora los dos leen la misma variable, `anclajeFoto`. Dos números que tienen que ser idénticos no se calculan por separado.

## D-114 · El gesto se reenvía a mano en vez de cambiar la geometría

- **Problema**: la caja de la foto va `position: fixed` y un elemento fijo queda **fuera de la cadena de scroll** — el navegador busca el ancestro desplazable por la cadena de bloques contenedores, y para un fijo esa cadena acaba en el viewport, que en esta pantalla no se desplaza. Arrastrar sobre la foto no movía nada, y con la caja encogida eso es media pantalla muerta.
- **Por qué `fixed` y no `sticky`**: con la foto en flujo el contenido va **después** de ella, así que al encoger la caja o queda un hueco o la columna encoge y realimenta el scroll. Con `fixed` el hueco lo reserva un placeholder de alto constante y el contenido pasa **por debajo**, que es lo que hace que la cuenta cuadre. Ya se intentó la vía `sticky` y hubo que revertirla con tres regresiones.
- **Decisión**: no se toca la geometría; se reenvía el gesto. Un oyente de puntero sobre la caja traduce el arrastre **vertical** a `scrollTop` del contenedor, con inercia propia al soltar. El eje horizontal se deja pasar intacto —sigue siendo del deslizamiento entre fotos— y el toque limpio sigue abriendo el lightbox: el gesto solo se toma cuando el recorrido vertical supera 6px **y** es mayor que el horizontal.
- **Ventaja de método**: al ser código propio respondiendo a eventos y no scroll nativo, **sí se puede verificar en este entorno** con eventos de puntero sintéticos, que es justo lo que no se podía hacer con la cadena de scroll del navegador.
- **Verificado**: arrastre vertical de 72px sobre la foto → el contenedor se desplaza 72 (1:1). Arrastre horizontal de 72px → el desplazamiento se queda en 0. Geometría idéntica a `detalles-v2.2` a 390×844: recorrido 115, contenido tapado 0, cabecera sobre la foto 0, salto máximo de recorte 10px.
- **Limitación conocida**: la inercia es propia, no la del navegador, así que la deceleración no será idéntica a la del resto de la página. No se pudo comprobar aquí porque `requestAnimationFrame` no corre de forma fiable en este entorno.

## D-115 · Ampliar el cartel: se delega en el visor del navegador

- **Necesidad**: poder ampliar el cartel en móvil sin ampliar la página entera.
- **Por qué no un pellizco propio**: los navegadores aplican el pellizco **al viewport, no a un elemento**. Hacerlo dentro de una caja obliga a implementarlo a mano con transformaciones, que es justo el tipo de complejidad que esta pantalla ya ha demostrado que sale cara.
- **Decisión**: con la ficha arriba del todo, el toque sobre el cartel lo abre como **imagen suelta en otra pestaña**. A partir de ahí manda el visor nativo: pellizco, doble toque, guardar y compartir, sin una línea de código nuestro.
- **Se pide un tamaño mayor que el de la ficha** (`sz=w2000` en vez de w1000): es una vista para mirar de cerca. **Ojo**: Drive no amplía por encima del original, así que el techo de detalle es la resolución del escaneo. En un cartel de 992px de ancho, w2000 devuelve el mismo archivo — sin coste extra, pero sin ganancia. Si se quiere más detalle en piezas concretas, hay que subir mejores escaneos.
- **El pellizco de la página sigue habilitado** a propósito (`<meta viewport>` sin `user-scalable=no`). Desactivarlo impediría ampliar a quien lo necesita por accesibilidad, y ahora además hay una alternativa mejor para el caso concreto del cartel.
- **Un arrastre no cuenta como toque**: al desplazar a mano (D-114) el navegador no siempre suprime el `click`, así que se suprime en captura. Verificado: toque limpio arriba abre la imagen; toque tras arrastrar no abre nada.


## D-116 · El panel del mapa entra en la capa de transición, o parece que hay dos

- **Síntoma, descrito por el propietario a cámara lenta**: al volver de un evento, el panel se forma **detrás** del slider, los tags y el selector de vista; después "desaparece" y aparece otro ya por delante de todo y casi en su sitio.
- **No son dos paneles**: es el mismo cambiando de capa. La cabecera y la toolbar llevan `view-transition-name`, y un elemento con nombre de transición **se anima en la capa superior del navegador, que ignora cualquier `z-index` de la página** — la regla 2 de AGENTS.md, escrita en su día a raíz de otro bug. El panel no tenía nombre, así que se quedaba en la página normal mientras los otros dos se promocionaban por encima. Al terminar la transición todo vuelve al flujo y el `z-index` del panel manda: eso es el "segundo panel".
- **Descartado por el camino**: se pensó primero en un bloque contenedor accidental (`position: fixed` bajo un ancestro con `transform`). Encaja con los síntomas y este proyecto ya lo sufrió, pero no era: la promoción de capa lo explica mejor y es comprobable en el marcado.
- **Arreglo**: el panel recibe su propio `view-transition-name` y su grupo se ordena por encima del de la toolbar. Entra en la misma capa que los demás, en el orden correcto.
- **No estaba causado por subir el sheet a 40px**, aunque fue lo que lo destapó: antes el panel se paraba tan abajo que apenas se solapaba con la toolbar y no se veía.


## D-117 · La vuelta a un panel abierto va sin transición de página

- **Contexto**: cuatro intentos de que el panel llegara bien **dentro** de la transición (repoblado duplicado, apilamiento, firma de la lista, nombre de transición propio). Cada uno arregló algo real y medible, y el síntoma seguía: el panel se ve formarse detrás del slider y los tags y saltar por delante al terminar.
- **Decisión del propietario, aceptada**: "no me importa para nada que al volver de los eventos el panel esté todo tal cual se dejó sin animación". Volver es una restauración, no un viaje; la animación no estaba contando nada que el visitante necesite.
- **Implementación**: la X de la ficha lleva `data-astro-reload` **solo cuando se vuelve a un panel abierto** (`activeLocation`). Sin transición no hay capa superior, así que no hay nada que llegue a destiempo. El resto de vueltas —galería, lista— conservan su transición.
- **Coste**: esa vuelta concreta es una carga completa en lugar de una navegación suave. El estado de vuelta viaja en `sessionStorage`, así que no se pierde nada. Medido: el panel aterriza directamente en su posición final (top 40) con sus eventos ya puestos.
- **Lección**: cuatro arreglos sucesivos sin que el síntoma desaparezca es la señal de que el marco es el problema, no la pieza. La animación era el marco.

## D-118 · La página se guarda montada en la CDN, y la precarga llega también al móvil

- **Medición de partida** (producción, 390px): el servidor responde en **18ms**, pero el HTML tarda **645ms** en llegar entero y la primera tinta cae en **644ms**. No es ancho de banda: Astro envía en streaming y el cuerpo espera a que Google Sheets conteste. Prácticamente **el 100% de la primera tinta era esperar a la hoja**, y ocurría en cada visita de cada visitante — no había ninguna caché declarada.
- **Y afecta a lo que más molesta al propietario**: la ficha de evento también se construye en el servidor, así que cada toque en una tarjeta repetía esa carrera a Google. Esa era la mayor parte de la espera entre apretar y que pase algo.
- **Decisión**: `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400` en las cuatro páginas SSR. Cinco minutos de frescura, elegidos por el propietario, y un día sirviendo la copia mientras se rehace por detrás, de modo que nadie espera a Google ni siquiera justo después de caducar.
  - Se cachea por URL completa: `?view=`, `?search=` y `?location=` tienen cada una su copia.
  - **Comprobar que un cambio de la hoja ha subido**: añadir cualquier parámetro nuevo a la URL (`?v=2`) fuerza una construcción desde cero, porque es otra clave de caché.
  - **No cuesta dinero y de hecho abarata**: la copia es del HTML, no de las fotos —que siguen viniendo de Drive—, y cada visita servida desde el borde es una que no hace trabajar al servidor.
- **La precarga solo llegaba a escritorio**: se disparaba con `pointerenter`, que en un móvil no existe — no hay puntero que entre en nada. De ahí que en escritorio la ficha apareciera al instante y en el teléfono se notara la espera. Ahora se registra también en `touchstart`, que ocurre al posar el dedo, unos cientos de milisegundos antes de soltarlo: justo el margen para adelantar la página. Cuatro puntos de precarga migrados.

## D-119 · Cuántas tarjetas hay pintadas lo dice el DOM, no un contador

- **Síntoma**: al volver de una ficha a la galería aparecían tarjetas repetidas. Medido en el flujo real (entrar en un flyer del fondo de la galería y cerrar): **68 tarjetas, 18 de ellas duplicadas**.
- **La sospecha apuntada en el traspaso era falsa**: no era que los saltos de scroll dispararan el cargador de lotes varias veces seguidas. Llamar varias veces a `appendGalleryBatch()` **no duplica nada**, porque cada llamada avanza el contador y pide el tramo siguiente.
- **Causa real**: cuántas tarjetas hay pintadas está anotado **en dos sitios que se escriben en horarios distintos**.
  - El contador `galleryVisibleCount`, de forma **síncrona**, desde cuatro sitios: `initHomePage()`, `updateSlider()`, el manejador del buscador y `applyReturnState()`.
  - El DOM, de forma **asíncrona**, dentro de `performDOMUpdates()` — que `filterArchives()` no ejecuta, sino que **le entrega a `document.startViewTransition()`**, que lo llama más tarde.
  - Al volver, las dos agendas se cruzan. Traza del flujo real: `applyReturnState` deja el contador en 50, el buscador lo devuelve a 32 justo después, y el repintado que llega el último ya llevaba 50 dentro. Resultado: **contador 32, DOM 50**.
- **Y entonces basta con que el centinela entre en pantalla** —lo que la vuelta al flyer garantiza, porque salta al fondo de la galería— para que el lote pida el tramo 32–50, que está en pantalla, y lo añada otra vez.
- **Arreglo**: `appendGalleryBatch()` calcula desde dónde sigue **contando los hijos de la rejilla**, no leyendo el contador; el contador pasa a seguir al DOM. Es lo único que no puede mentir sobre lo que hay pintado. Tres líneas, y vale para los cuatro sitios que resetean, presentes y futuros, sin tocar ninguno.
- **Verificado**: mismo flujo, misma condición mala en la traza (`count=32` con `dom=50`), y ahora el tramo sale vacío y no se añade nada. **50 tarjetas, 0 duplicadas.** `npm run build` pasa.
- **No es un fallo introducido por `feat/volver-al-flyer`**: la máquina que lo produce (`appendGalleryBatch` + los cuatro reseteadores + el repintado asíncrono) es común y está también en `main`. La rama lo hace salir siempre porque su vuelta salta al fondo de la galería y planta el centinela justo dentro de la ventana mala. **No comprobado en `main`.**
- **Lección**, que ya estaba escrita en el traspaso y volvió a morder: *dos números que deben coincidir, calculados por separado*. Que salgan de una sola fuente.
- **Lo que este arreglo NO toca**: el desajuste de contador sigue existiendo, y se ve — al volver, la rejilla se repinta cuatro veces (32 → 32 → 50, y otra ronda 32 → 50 un segundo y medio después). Ya no corrompe nada, pero encoge y se reestira a la vista. Le toca al paso del anclaje.

## D-120 · Se vuelve al flyer que se cierra, y la tarjeta se persigue hasta que para

Dos arreglos sobre la vuelta al flyer, después de que el propietario probara D-119 en un móvil real.

### El estado de vuelta sigue a la ficha que se está viendo

- **Síntoma, y era el motivo de toda la rama**: recorriendo la sesión con Anterior/Siguiente y cerrando desde otro evento, la galería devolvía al **primero** que se abrió.
- **Causa**: `mel-return-state` lo escribía **solo** `saveReturnState()` en la home, al pulsar una tarjeta. La ficha de evento no lo tocaba nunca, así que `flyer` se quedaba congelado en el primero.
- **Arreglo**: la ficha reescribe ese campo en cada carga con el evento que muestra. Enganchado a **qué ficha se ve**, no a los enlaces: hay cuatro maneras de llegar a una (Anterior, Siguiente, las flechas del teclado y una URL directa) y así quedan cubiertas las cuatro sin acordarse de ninguna. Solo toca `flyer`; filtros, lotes y píxel de reserva siguen siendo los de la galería que se dejó, y solo actúa si ya hay estado (por URL directa no hay vuelta que ajustar).
- **Verificado**: abrir el evento 38 de 50, avanzar a 39 y cerrar → la galería deja el 39. Antes dejaba el 38.

### La tarjeta se persigue hasta que la rejilla para, no hasta que el scroll parece quieto

- **Síntoma**: en móvil "a veces queda cerca, otras no", y el cartel salía cortado por arriba.
- **Dos causas distintas**:
  1. `scrollIntoView({block:'center'})` a una columna centra una tarjeta más alta que la ventana, y centrar algo que no cabe lo recorta por arriba y por abajo a la vez.
  2. Se colocaba **una sola vez**, en cuanto la tarjeta existía. El masonry sigue midiendo las imágenes de arriba durante el segundo siguiente y empujando a las de abajo: la tarjeta se movía **después** de haberla colocado.
- **Arreglo**: bucle que reafirma la posición recalculando en cada vuelta **dónde está la tarjeta ahora**. La tarjeta es la referencia estable; su píxel no. A una columna va pegada al borde superior de la galería (donde acaba la toolbar); a dos o más, centrada, con vuelta a "arriba" si no cabe entera.
- **Sin salida anticipada por estabilidad, y esto es lo importante**: el primer intento sí la tenía —tres lecturas de scroll iguales, como `restoreScroll()`— y **fallaba**, porque el scroll se queda quieto también cuando NO ha llegado: mientras la rejilla no ha crecido, el destino cae por debajo del tope y el navegador lo recorta ahí. Medido: destino 3908, tope 3838, tres lecturas idénticas, bucle retirado — y al crecer la rejilla la tarjeta acabó a 522px de su sitio. Se reafirma hasta el final del plazo; cuando ya está colocada no se escribe nada.
- **Plazo de 4s y no 2,5s**: al volver, la galería se repinta entera cuatro veces a lo largo de 1,7s (los reseteos del contador contra la restauración del estado, ver D-119) y solo después empiezan a medirse las imágenes. Con 2,5s el bucle se retiraba en mitad de la tormenta.
- **Se fija `scrollTop` en vez de usar `scrollIntoView()`**: este desplaza también todos los contenedores antepasados, incluida la ventana, y en un móvil eso mueve la página entera.
- **Verificado** (medido, no a ojo): a 375px la tarjeta queda a 0px del borde superior de la galería; a 1280px con la tarjeta cabiendo entera, desviación del centro 0px; con la tarjeta más alta que la ventana, arriba. En los tres casos, 50 tarjetas y ninguna duplicada. `npm run build` pasa.
- **Pendiente y NO tocado a petición del propietario**: sigue viéndose el viaje por la galería durante la vuelta. `restoreScroll()` ya tiene el ocultado con fundido que haría falta, pero el traspaso avisa de que ese fundido no se aprecia en producción, así que reutilizarlo exige comprobarlo antes. Va con la pasada de la animación de vuelta.

## D-121 · La restauración habla la última, y la tarjeta se suelta cuando ya no puede moverse

### Los reseteos de arranque se callan mientras se restaura una vuelta

- **Síntoma**: al volver de una ficha, la rejilla encogía y se reestiraba a la vista. Medido: se repintaba **cuatro veces en 1,7s** — 32 → 32 → 50, y otra ronda 32 → 50.
- **Causa**: tres sitios mandan la galería «al primer lote y arriba del todo» cuando cambia un filtro (`initHomePage()`, `updateSlider()` y el manejador de `mel-search`). Existen para un gesto del visitante. Al volver de una ficha no hay ningún gesto detrás: son los tres arrancando, y pisaban la restauración *después* de que hubiera puesto sus 50 tarjetas.
- **El más sorprendente es el buscador**: al iniciarse anuncia que no hay búsqueda —`setState('default')` dispara `dispatchSearch("")`— y eso llega al manejador indistinguible de haber borrado el campo a mano.
- **Arreglo**: un guard, `restaurandoVuelta()`. Mientras haya una vuelta viva, la restauración manda y los reseteos se callan. **No se reordenan llamadas** a propósito: el arranque del buscador vive en otro componente y el orden entre `astro:page-load` de dos scripts no está garantizado (ya avisaba `readReturnState`). Por eso hace falta un guard y no mover el orden.
- **Verificado**: todos los repintados de la vuelta pintan ya 50 (antes 32 → 32 → 50 → 32 → 50). Y una búsqueda de verdad, fuera de una vuelta, sigue mandando el scroll a 0.
- **Contrapartida aceptada**: durante los ~4s de vida del estado de vuelta (`RETURN_STATE_TTL_MS`), una búsqueda o un movimiento del slider hechos a mano no resetean el scroll. Es una ventana corta y el daño es menor que el que arregla; si algún día molesta, la salida es invalidar el estado de vuelta al primer gesto real del visitante.

### El anclaje se suelta por geometría, no por reloj

- **Síntoma**: con las imágenes cargando tarde, la tarjeta acabó a **550px** de su sitio y el scroll topado, con **27 imágenes aún sin medir**. El plazo de 4s de D-120 se agotaba antes que la rejilla.
- **Por qué ningún plazo vale**: cuánto tardan las imágenes no lo decide este código. Vienen de Drive por la red y en Safari ni siquiera cargan hasta que el visitante ha pasado por `drive.google.com`. **Cualquier número aquí es una apuesta sobre la conexión de otro.**
- **Arreglo**: el bucle se suelta cuando la tarjeta **ya no puede moverse**, que es una condición geométrica y no temporal: cuando no queda ninguna tarjeta `unsized` de ella hacia arriba. El masonry marca `unsized` a cada tarjeta hasta que su imagen carga y se le calcula el alto; mientras alguna de las de arriba siga sin medir, lo que hay por encima puede crecer y llevársela. Las de abajo dan igual: crecer por debajo no la mueve.
- **El plazo queda solo de red de seguridad** (10s) para la imagen que no cargue nunca y dejaría su tarjeta `unsized` para siempre.
- **Verificado**: mismo caso que fallaba —imágenes cargando tarde, 27 sin medir por encima— y la tarjeta se queda clavada a 0px mientras el bucle la sostiene. Antes se soltaba a los 4s y quedaba a 550px. `npm run build` pasa.
- **Lección, la tercera vez que muerde lo mismo en esta rama**: los tres criterios de parada que fallaron —"el scroll está quieto", "han pasado 2,5s", "han pasado 4s"— eran *proxies* de la pregunta real, que es si la rejilla ha terminado de crecer por encima. Cuando existe la condición de verdad, medirla sale más barato que afinar el proxy.

## D-122 · El fundido de la vuelta no existía, y ahora tapa el viaje

Fase 1 de la animación de vuelta: primero que la galería llegue ya colocada, y el morphing después (decisión del propietario).

- **Hallazgo de partida**: el fundido que `restoreScroll()` lleva desde que se escribió **nunca ha funcionado**. No era que se apreciara poco —lo que sospechaba el propietario y recogía el traspaso—: es que no se creaba ninguna transición.
- **La causa, de una línea**: se ocultaba (`transition:none; opacity:0`) y se revelaba (`transition:opacity .25s; opacity:1`) sin nada en medio, así que el navegador funde ambos cambios en **un solo recálculo de estilo**. No queda ningún estado "desde" el que transicionar y la opacidad salta de 0 a 1 de golpe. **Medido con `getAnimations()`**: con el patrón anterior, 0 transiciones creadas; añadiendo un `void el.offsetWidth` entre medias, 1.
- **Alcance**: afectaba también a la vuelta a Lista, que sí usaba esa función.
- **Arreglo**: `ocultarParaColocar()` y `revelarColocado()`, un solo par usado por los dos sitios que recolocan. No una copia en cada uno: dos cosas que deben coincidir escritas por separado es la trampa que este código ya tiene documentada por haberla pisado dos veces.
- **La vuelta al flyer ahora también oculta**, que es lo que tapa el viaje por la galería. Antes no lo hacía: `volverAlFlyer()` sustituía a `restoreScroll()` y se dejó fuera su ocultado.
- **El revelado lleva su propio plazo, corto y aparte del bucle de anclaje**: aquel puede llegar a 10s esperando una imagen que quizá no cargue nunca, y la galería en blanco diez segundos es peor que cualquier salto. Se revela en cuanto la tarjeta queda colocada, o a los 700ms como tope, lo que pase antes; el bucle sigue corrigiendo por debajo, ya a la vista.
- **La comprobación de "colocada" se relee DESPUÉS de asignar el scroll**, no antes: si el destino cae más allá del tope el navegador lo recorta y la diferencia sigue siendo grande, así que no se revela — justo lo que hay que hacer mientras la rejilla no haya crecido lo suficiente.
- **Todas las salidas revelan**, sin excepción: llegada, plazo agotado y el visitante tocando el scroll. Que la galería se quedara invisible sería mucho peor que cualquier fallo de anclaje. **Verificado explícitamente**: con la galería a `opacity 0`, un gesto de scroll la deja en `opacity 1` y con el estilo en línea limpio.
- **Contrapartida aceptada**: revelando pronto, si después siguen cargando imágenes de más arriba la tarjeta puede desplazarse un poco y eso sí se ve. La alternativa era más rato en blanco. Un ajuste pequeño molesta menos que un vacío largo.
- **Verificado**: traza de la vuelta → `opacity 0 / transition none` al empezar, `opacity 1 / transition opacity 0.25s` al colocar, limpieza 300ms después; tarjeta a 0px de su sitio. `npm run build` pasa.

### El morphing de vuelta: descartado

**Decisión del propietario**, tomada con la vuelta ya funcionando en escritorio y móvil: *"No vamos a hacer más sobre esto. Dejémoslo como está."* La vuelta aterriza con el flyer colocado y ese es el comportamiento definitivo, no un paso intermedio hacia otra cosa.

Queda escrito el porqué técnico, que es lo que ahorra el primer día a quien lo retome: **el morphing nativo no puede funcionar aquí**. Los ingredientes están puestos —la imagen lleva `view-transition-name: flyer-img-{id}` en la tarjeta y en la ficha, y la vuelta es navegación suave— pero **no tiene destino al que agarrarse**: cuando el navegador captura el estado final, la galería sigue siendo la del SSR, con su propio orden barajado, sin colocar y con las alturas sin medir. La tarjeta de destino o no está entre las 32 servidas, o no está en la posición en la que acabará, así que el cartel volaría a un sitio que no es el suyo. Y desde D-122 la galería se oculta a propósito durante la vuelta: no se puede morphear hacia algo invisible.

La vía que quedaba era hacerlo a mano con transformaciones (regla 2 de AGENTS.md), aprovechando que `volverAlFlyer()` sí conoce el instante exacto en que la tarjeta queda colocada: capturar la posición del cartel al pulsar la X, inyectar una copia flotante en el intercambio de páginas y volarla hasta el hueco al revelar. No se ha implementado.

### D-122 (ronda 2) · El parpadeo: la galería tiene que nacer oculta, y no apilar transiciones

El propietario probó lo anterior y no vio ningún fundido: vio **un parpadeo y algo en blanco**. Dos causas, las dos medidas.

- **El ocultado llegaba tarde.** Colgado del final de la inicialización, ocurría **19ms después de `astro:after-swap`** — o sea, con la galería nueva ya pintada y sin colocar. Ese fotograma es el parpadeo.
  - **Arreglo**: se oculta en `astro:before-swap`, sobre `event.newDocument`, cuando hay un estado de vuelta con `flyer`. El documento entrante todavía no está en pantalla, así que **nace invisible**. Verificado: en `astro:after-swap`, el primer instante en que la página nueva existe, la opacidad ya es 0.
  - Va en el ámbito del módulo de `index.astro` y no dentro de `initHomePage`: el script se evalúa una vez y sigue vivo durante toda la sesión de navegación, incluso estando en una ficha — que es justo cuando hace falta, porque el que se va prepara al que llega.
  - Solo se oculta si la vuelta lleva `flyer`, porque es `volverAlFlyer()` quien revela. Más una red de seguridad a 3s: una galería invisible para siempre sería mucho peor que cualquier parpadeo.
- **Y la vuelta apilaba transiciones, incumpliendo la regla 3 de AGENTS.md.** `filterArchives()` arranca `document.startViewTransition()`, y al volver la del `ClientRouter` sigue viva: una encima de otra la supersede. Además aplaza el repintado a otro fotograma y con él la colocación de la tarjeta y el revelado — parte del hueco en blanco.
  - **Arreglo**: volviendo se pinta en el acto (`restaurandoVuelta()` desactiva la transición anidada). La única viva sigue siendo la de la página.
- **Lo que NO se puede medir en este entorno**: cuánto dura el hueco en blanco de verdad. Aquí los temporizadores van estrangulados y los fotogramas solo ocurren al forzar una captura, así que los números de duración no son representativos. El tope del revelado (700ms) es la perilla que hay que tocar si al propietario le sigue pareciendo largo.

## D-123 · Ordenar la Lista es acumulativo: el segundo criterio es la ordenación anterior

- **Petición del propietario**, con el ejemplo suyo: *"Si se ha dado a fecha y luego a nombre, pues se verá por nombre y dentro del nombre por fecha. Si es la primera vez, el anterior es el random."*
- **Antes no pasaba eso**, aunque lo pareciera. Cada ordenación partía del archivo base, así que los empates quedaban en el orden **barajado**, no en el de la ordenación anterior. Comprobado antes de tocar nada: tras ordenar por fecha y luego por organiza, el grupo "FIV" salía en fechas 2015, 2019, 2015, 2014, ocupando exactamente las posiciones 0..7 del barajado.
  - De dónde viene la impresión contraria: en la serie FIV, ordenar alfabéticamente da casi lo mismo que cronológicamente (FIV I, II, III…). Con romanos más altos se rompe — alfabéticamente IV va antes que V, pero también antes que VI.
- **Implementación**: ordenar reordena **`archives`**, la secuencia de la sesión, en vez de una copia de paso; y `filterArchives()` deja de ordenar (filtrar solo oculta, nunca reordena). No hace falta nada más: `Array.prototype.sort` es estable desde ES2019, así que ordenar por la columna nueva conserva el orden previo dentro de cada empate. Encadena solo: tres ordenaciones dejan tres niveles.
- **Por qué sobre `archives` y no sobre una copia**: esa secuencia es la que ven las tres vistas y el Anterior/Siguiente (contrato de navegación). Se persiste en `mel-session-order`, el mismo mecanismo que el barajado inicial, así que sobrevive a la vuelta de un evento y a un F5.
- **Arreglado de paso, porque el orden depende de ello**: el comparador de texto devolvía `1` mirando solo un lado (`if (!valA...) return 1`) sin comprobar el otro. Eso no es un orden total, y con un comparador incoherente el navegador puede devolver cualquier cosa — incluida la estabilidad de la que depende todo esto. Ahora los huecos y los "desconocido" caen al final se ordene como se ordene.
- **Verificado**: sesión limpia (orden aleatorio) → ordenar por fecha → ordenar por organiza. Dentro de cada promotor, fechas estrictamente cronológicas: FIV 2010→2019 (22 eventos), Quixotes y Ravers 7.5 igual. Aguanta un F5, y la Galería muestra la misma secuencia que la Lista (comprobado id a id). `npm run build` pasa.

## D-124 · Nunca menos de dos columnas, y una cuarta cuando el selector cabe con las tags

- **Planteamiento del propietario**, y es el correcto: el problema no es el tamaño de los carteles, es que **casi nunca se ve uno entero**. Los controles ocupan tanto alto que en móvil la galería enseña las piezas de una en una y cortadas. *"Tratándose de una galería, verlos de 1 en 1 e incompletos me pone nervioso."*
- **Medido a 375px**, con la galería a 484px de alto y 21 flyers con ratio ya medido:

  | | ancho | alto mediano | caben enteros | se ven a la vez |
  |---|---|---|---|---|
  | 1 columna | 327px | 462px | 15 de 21 | ~1 |
  | 2 columnas | 152px | 215px | **21 de 21** | ~4 |

  A una columna el flyer mediano ocupa 462 de 484: llena la pantalla y no deja ver nada más. **Se descarta `grid-cols-1`: el mínimo es dos.**
- **Objeción que planteé y retiro**: 152px parecía demasiado pequeño para una pieza con lineup y letra menuda. Viéndolo, la pieza se reconoce perfectamente como objeto gráfico, y para el detalle ya está la ficha (D-115). Ver cuatro enteras vale más que ver una cortada.
- **La cuarta columna cuelga de `.toggle-shares-line`**, el estado que ya decide si el selector de vista cabe en el renglón de las tags — la referencia que dio el propietario: *"como cuando el toggle se pone a la misma altura que las tags"*. **No es un breakpoint**: se mide en tiempo real contra lo que ocupan los textos de las tags (`updateHomeToolbarLayout`), así que colgarlo de un ancho fijo se desincronizaría en cuanto cambiaran los datos de la hoja. Medido: se enciende entre 1100 y 1180px de ventana; a 1440 (el `max-w` del sitio) el cartel mide 288px.
- **El cambio de columnas remide los row-span** en el mismo sitio donde se enciende la clase (regla 11): al cambiar el ancho de columna todos quedan viejos. Va enganchado al cambio y no a que alguien se acuerde.
- **Réplica en JS eliminada** (regla 7): `performDOMUpdates()` reasignaba el `className` entero de la rejilla repitiendo a mano las clases del marcado. Se había desincronizado —dejaba el móvil en una sola columna por mucho que dijera el marcado— y además borraba `galeria-cuatro` en cada render. Era redundante: lo único que se le añade a esa rejilla es `hidden`, y se quita justo encima. **Verificado**: tras filtrar por búsqueda, la rejilla conserva sus cuatro columnas.
- **Consecuencia en el anclaje de la vuelta**: usaba "una sola columna" (`max-width: 639px`) como señal para dejar el flyer pegado arriba en móvil. Ya no existe ningún caso de una columna, así que el corte pasa a `md` (767px), donde la rejilla va de dos a tres. El comportamiento pedido —arriba en móvil— no cambia.

## D-125 · La pastilla de la tarjeta solo por encima de 240px, medido sobre la tarjeta

- **Petición del propietario**: en un móvil, dejar el dedo sobre una tarjeta hace que el navegador le aplique `hover` y salta la pastilla con título y fecha, que ahí ni pinta nada ni cabe. Quitarla salvo que la tarjeta mida al menos 240px.
- **Se mide la TARJETA, no la ventana**, con una consulta de contenedor (`container-type: inline-size` en `.gallery-item` + `@container (max-width: 239px)`). Una media query no serviría: el ancho de la tarjeta depende del número de columnas, y ese número **no sale de un breakpoint** — la cuarta se decide midiendo (D-124). Caso real que lo demuestra: a 1180px de ventana hay cuatro columnas de 223px, o sea una ventana ancha con tarjetas estrechas.
- **Solo en el eje en línea**: el alto lo sigue poniendo la imagen, que es de lo que vive el masonry. Verificado que los `row-span` se siguen calculando (`span 60` con la contención puesta).
- **Verificado en los tres anchos reales**: 152px (móvil, dos columnas) → oculta; 223px (cuatro columnas a 1180) → oculta; 288px (cuatro columnas a 1440) → presente.
- **No hace falta tocar el marcado**, así que la réplica en JS de `FlyerCard` (regla 7) no se desincroniza por esto: la regla vive en el CSS global y alcanza por igual a las tarjetas del SSR y a las que construye el scroll infinito.

## D-126 · Un solo inicializador por página: el registro tenía que ser idempotente

- **Hallazgo**, salido de perseguir el bug de las 21 pestañas (D-123 en la ficha, este en la home): `document.addEventListener('astro:page-load', init…)` estaba en el ámbito del módulo, y **eso se acumula**. Astro reevalúa el script en línea de una página en cada navegación suave que vuelva a ella, mientras que `document` sobrevive al intercambio del cuerpo. Cada visita dejaba enganchada otra copia, y en el siguiente `page-load` corrían todas.
- **Medido en la home, tres idas y vueltas a una ficha**, contando corridas por carga:

  | | antes | después |
  |---|---|---|
  | 1.ª vuelta | 2 | 1 |
  | 2.ª vuelta | 3 | 1 |
  | 3.ª vuelta | 3 | 1 |

  Crecía una por visita y no se limpiaba mientras durase la pestaña.
- **Corrige una creencia equivocada del repo**: varios comentarios afirmaban que *"`astro:page-load` dispara dos veces por navegación suave"*. **No es cierto**: dispara una, y así se midió con un contador propio en el evento mientras el inicializador corría cuatro veces. La "segunda pasada" nunca fue el evento, eran dos copias. El comentario de `readReturnState()` queda corregido en el código.
- **Es el origen de la tormenta de repintados** que costó D-119 y D-121: al volver de un evento, cada copia reseteaba contador y scroll y disparaba su propio repintado. Medido tras el arreglo: la vuelta pasa de **cinco repintados a tres**, todos pintando ya lo correcto.
- **La copia que sobrevive es la primera**, con las variables `define:vars` de aquella carga. Asumible en las dos páginas: la ficha lee su identidad y sus imágenes del DOM y no de la closure (ya estaba previsto), y en la home `initialArchives` solo siembra `_melState` —protegido, corre una vez— y sirve de red de seguridad si el estado llegara vacío; el orden real de la sesión vive en `mel-session-order`.
- **Verificado que no rompe la vuelta**: cerrar desde un evento distinto al que se abrió deja la galería en ese evento, 50 tarjetas, ninguna duplicada, el flyer centrado con desviación 0 y las cuatro columnas intactas. `npm run build` pasa.
- **Lección**: el patrón `document.addEventListener('astro:page-load', …)` a nivel de módulo es seguro **solo** en una página a la que nunca se vuelve. En este sitio se vuelve a las dos. Cualquier página nueva debe registrar con guard.

## D-127 · La escala de espaciado pasa a ser la del propietario, y la cabecera móvil se aprieta con ella

- **Conflicto detectado antes de tocar nada** (nivel 3 de la política de documentación): los tokens ya existían con **otra escala** que la que dictó el propietario. En el código, `xs/s/sm/m/l/xl` = 4/8/12/16/24/32. La suya: XS=8, S=16, M=24, L=32, XL=40 — desplazada un paso, sin el 4 ni el 12, y con un 40 nuevo. Se le planteó y eligió la suya, con el argumento de que tener dos escalas —una hablada y otra en el código— garantiza pedir mal un espacio.
- **Se pudo cambiar sin romper nada porque de los seis tokens solo uno se usaba en el marcado**: `gap-x-mel-l`, el hueco de la galería. Los otros cinco estaban declarados y sin usar.
- **Trampa esquivada**: ese hueco vale 24px y está escrito **también a mano** en `GALLERY_GAP` (JS), de donde salen los `row-span` del masonry. Reescalar `l` a 32 habría dejado el CSS en 32 y el JS en 24, y el masonry descuadrado sin avisar. Se movió la **clase** (`gap-x-mel-l` → `gap-x-mel-m`) y no el número. Es la trampa nº 2 del traspaso: dos números que deben coincidir, calculados por separado.
- **Cabecera móvil**: los huecos verticales pasan a salir de la escala y se aprietan un paso en móvil (`S` = 16px por debajo de `md`, `M` = 24px a partir de ahí, que es lo que ya había). Tocados tres contenedores: el de página, el de la toolbar y el de tags+selector.
- **Medido en una pantalla de 812px**: los controles ocupaban **328px, el 40% de la pantalla**, de los cuales 104px eran solo huecos. Ahora empiezan la galería en 288 en vez de 328: **la galería pasa de 484px a 524px (+8%)**, que con dos columnas son unos 40px más de cartel por fila.
- **Escritorio sin cambios**, verificado: cuatro columnas, hueco de rejilla 24px, cartel de 288px y la galería arrancando donde arrancaba. El `gap-y` que sí cambia solo se ve cuando el selector cae bajo las tags, o sea en móvil.

## D-128 · El slider no lleva relleno propio: el alto lo pone su tirador

- **Lo cazó el propietario con el inspector**: los huecos de la cabecera no se veían parejos aunque todos salieran de la misma escala. *"Hay algún elemento que no está construido con el mismo padding."*
- **Era el slider**: `#slider-track-wrapper` llevaba `py-8`, o sea **64px de relleno puro**. La barra y los tiradores van en posición absoluta y no aportan alto ninguno, así que ese componente medía 64px sin contener nada — y el hueco a su alrededor salía 32px mayor que entre los demás elementos.
- **Arreglo**: el envoltorio pasa a `h-9` (36px), que es exactamente el alto del tirador, fijado en `SliderHandler`. Verificado que el tirador encaja al milímetro (0px de holgura arriba y abajo). Quien manda en la separación es ahora el contenedor de la home, que la saca de la escala del DS.
- **Y con eso, la talla sube en vez de bajar**: se probó a apretar los huecos a `S` (16px) y el propietario lo vio agobiado. Todos los huecos verticales pasan a `M` (24px) en todas las pantallas — un solo ritmo, más ancho que antes— y el alto que se gana viene del relleno invisible que se ha quitado, no de apretar.
- **El último salto necesitaba `XS`**, no `M`: bajo la toolbar hay un `-mt-2` (−8px) en el contenedor de vistas, así que el hueco real es `pb + gap − 8`. Con `pb-mel-xs` sale 8+24−8 = 24; con `S` salían 32 y el ritmo se rompía justo en el último paso.
- **Medido en 812px de alto**: ritmo **24 / 24 / 24** exacto, la galería arranca en 284 (antes 328) y mide **528px (antes 484)**.
- **Escritorio se beneficia igual**: la galería pasa de 591 a 627px, con las cuatro columnas y el cartel de 288px intactos.

## D-129 · Cuando el selector se pliega, cada línea ocupa el ancho entero

- **Síntoma, cazado por el propietario entre 1170 y 1215px**: el selector de vista se plegaba bajo las tags pero **sin ocupar el ancho completo**, y las tags se quedaban apretadas a la izquierda con media línea vacía.
- **Causa, aritmética**: el hueco que se reserva para el selector se calcula **clavado, sin holgura**. Medido a 1190: toolbar 974, tags 630, hueco 24, selector 320 — suman exactamente 974. Con el redondeo de subpíxel, `flex-wrap` lo baja igualmente, pero el JS seguía creyendo que compartían renglón: le dejaba puesto su tope de ancho (abajo **y** estrecho, lo peor de las dos opciones) y a las tags el reparto que reservaba sitio para un vecino que ya no estaba en su línea.
- **Arreglo**: no se afina la fórmula, se **comprueba el resultado real**. Si los dos elementos acaban en renglones distintos, se le quita el tope al selector y se recalculan las tags **sin reserva**. No oscila: sin tope el selector es más ancho todavía, así que sigue plegado.
- **Y la cuarta columna se cuelga de lo que pasa de verdad**, no de lo que decía el cálculo: a 1190 el selector está plegado, así que allí tocan tres columnas y no cuatro.
- **Verificado**: a 1190 y 1215, tags y selector ocupan los 974/999 enteros; a 1260 y 1280 vuelven a compartir renglón con cuatro columnas.
- **Criterio general, por si vuelve a aparecer**: cuando algo se pliega a su propia línea, esa línea usa el ancho completo. Guardar hueco para un vecino ausente no lo hace nadie.

## D-130 · La búsqueda perdona tildes y puntuación

- **Antes fallaba en silencio**, que es la peor manera de fallar: escribir "leon" no encontraba "León", ni "mucrovision" a "Mucrovisión", ni "valdepielago" a "Valdepiélago". En una sola ficha hay cuatro nombres con tilde o diéresis (Hüugen, León, Mucrovisión, Don Vilón), y en un teléfono prácticamente nadie escribe los acentos.
- **Implementación**: `normalize('NFD')` separa cada letra de su acento y se barren los acentos sueltos; la puntuación se convierte en **espacio** y no se borra, para no pegar palabras. Así "Promissing/Youngster" se encuentra escribiéndolo con barra o sin ella.
- **Se unifican de paso las dos copias del filtro**: estaba duplicado tal cual en la galería y en el mapa (regla 7). Ahora es una sola función y no pueden separarse.
- **Verificado**: `leon` = `León` = 30 resultados; `valdepielago` = `Valdepiélago` = 13; `mucrovision` = 3 y `huugen` = 8, que antes daban 0; `promissing/youngster` = `promissing youngster` = 3. Una consulta sin sentido sigue dando 0.
- **Nota de escala**: normaliza en cada tecleo sobre los seis campos de cada evento. Con 50 eventos es gratis. Si el archivo creciera a miles, tocaría precalcular la versión normalizada al cargar.

## D-131 · Botón flotante de ordenación, y el archivo entra cronológico

- **Qué es** (Figma 1085:47259): un botón de 48×48 fijo a 16px del borde derecho y 32px del inferior, que cicla el orden de todo el archivo. Sustituye a las cabeceras ordenables de la tabla **allí donde no hay tabla**.
- **Ciclo, decidido por el propietario**: cronológico ascendente → **barajar** → cronológico descendente → vuelta. El barajado va en segundo lugar a propósito, *"para que la gracia se pille lo antes posible"*.
- **El icono muestra la ACCIÓN SIGUIENTE, no el estado actual.** En un control cíclico de tres estados y sin etiqueta, un icono que solo describe dónde estás no deja adivinar qué pasa al pulsarlo. (El `aria-label` dice la acción completa, que es lo que oye un lector de pantalla.)
- **Barajar da un orden NUEVO cada vez**, no devuelve el de entrada. Decisión del propietario: prefiere que sorprenda. Consecuencia asumida: no hay "deshacer".
- **Se ve por debajo de 440px y solo en Galería y Lista.** 440 es exactamente donde la Lista pasa de tarjetas a tabla con cabeceras ordenables — el criterio del propietario es que **exista** tabla, no que se vea entera (la tabla completa sin scroll horizontal no llega hasta ~1032px, medido). En el Mapa no aparece: allí el orden no se ve por ningún lado.
- **Las dos condiciones se reparten a propósito**: el ancho lo decide el CSS y la vista el JS (`data-visible`). Resolverlo todo con utilidades obligaba a pelear `hidden` contra `flex`, que tienen la misma especificidad y dependen del orden de la hoja.

### El archivo se sirve ya en orden cronológico ascendente

- **Cambia la puerta de entrada** respecto a D-015/D-073, donde el aleatorio era *la* forma de entrar. Con el botón, barajar sigue estando a un toque, así que deja de ser una pérdida.
- **Y quita trabajo en vez de añadirlo**: había dos barajados —el del servidor para la primera carga y el que hacía falta en el cliente para volver a barajar— y ahora hay uno solo, en el cliente. El servidor ya ordenaba cronológicamente antes de barajar, así que fue quitar el paso de barajado, no añadir nada.
- **Verificado**: el ciclo completo da los tres órdenes y vuelve al primero; el icono va siempre un paso por delante; se oculta en Mapa y a partir de 440px; el orden elegido sobrevive a entrar y salir de una ficha, y la vuelta al flyer sigue aterrizando en su tarjeta (desviación 0) sin duplicados. `npm run build` pasa.
- **Lo que NO se puede verificar aquí y necesita el móvil del propietario**: un elemento `position: fixed` a 32px del borde inferior es justo lo que descoloca la barra de URL replegable de Chrome y Safari móvil, el problema nº1 de los que este entorno no reproduce. La posición definitiva queda pendiente de esa prueba.

### D-131 (ronda 2) · Ajustes del botón tras la primera prueba del propietario

- **Los iconos van al revés de lo que dice su nombre, y es deliberado**: la flecha hacia **abajo** ordena cronológico **ascendente** y la de arriba, descendente. Razonamiento del propietario, que comparto: para un lector occidental bajar es avanzar en el tiempo y subir es retroceder. Manda la metáfora, no el nombre del criterio. Queda anotado en el propio componente para que nadie lo "corrija".
- **Las tarjetas pasaban por delante del botón, y no era a posta**: es la regla 2 otra vez. Las imágenes llevan `view-transition-name`, así que al reordenarse se promocionan a la capa superior del navegador, que ignora el `z-index` de la página. Mismo remedio que con el panel del mapa (D-116): el botón recibe nombre propio (`mel-boton-orden`) y su grupo se ordena por encima. Y se le fija duración 0 en esa capa: debe quedarse quieto mientras las cartas vuelan, no reptar durante segundo y medio.
- **El reordenado del botón se anima más despacio**: 1500ms con `cubic-bezier(0.65, 0, 0.35, 1)` (entrada y salida suaves), frente a los 320ms de un filtro cualquiera. El propietario apenas llegaba a ver la animación en Chrome. El criterio: aquí el movimiento **es** el contenido —es lo que le da la gracia al botón— mientras que al filtrar es un efecto secundario.
- **Los dos valores mandan sobre las dos animaciones**, la de la galería (transiciones de vista) y la de la lista (FLIP propio con `transform`), y se publican como propiedades CSS desde el script en vez de repetirse en la hoja. Dos duraciones que deben coincidir escritas por separado acaban separándose.
- **Lo que este entorno NO puede verificar**: cómo se ve la animación. Los fotogramas aquí solo ocurren al forzar una captura, así que una transición de 1,5s no se puede cronometrar ni observar. Está comprobado que las reglas llegan al CSS compilado, que el script publica los valores y que la clase no se queda pegada al terminar; lo demás es para el ojo del propietario.

### D-131 · Pendiente para la próxima sesión (reportado por el propietario)

1. **Las cartas no se mueven al pasar a cronológico ascendente, ni en modo Lista.** Yo supuse que sí animaba y que el problema era la velocidad, y alargué la animación a 1,5s por eso. **El propietario sigue viéndolo quieto**, y él lo mira en Safari, donde sí percibe las animaciones cortas. Así que la hipótesis de la velocidad **no está confirmada y probablemente sea falsa**: hay que reproducirlo y medirlo antes de tocar nada más.
   - Por dónde empezar: comprobar si las tarjetas comparten `view-transition-name` entre los dos estados (si el lote visible cambia entero, no hay nada que morphear y solo hay fundido), y si el FLIP de la lista llega a encontrar posiciones antiguas que comparar (`oldRowRects`).
   - **Ojo con el entorno**: esto NO se puede observar aquí. Los fotogramas solo ocurren al forzar una captura, así que cualquier medición de animación en este sandbox es inservible — una de esta sesión ya salió imposible por eso.
2. **La curva y la duración**, a revisar con el ojo del propietario.
3. **La posición del botón respecto al borde inferior**, pendiente de probar en un móvil real por lo de la barra de URL replegable.

## D-132 · Las cartas no se movían porque nunca se movieron: el nombre de transición estaba en la imagen

- **Los dos síntomas eran el mismo fallo.** El propietario reportó (a) que las cartas no se mueven al reordenar y (b) que aparecen **marcos blancos fijos por detrás de las fotos** durante el movimiento.
- **Mi hipótesis de la noche anterior era falsa**, y quedó anotada como no confirmada precisamente por esto: no era cuestión de velocidad. Alargar la animación a 1,5s no arregló nada porque no había nada que alargar.
- **Causa**: el `view-transition-name` vivía en la `<img>`, no en la tarjeta. Así que al reordenar el navegador solo animaba la foto; la tarjeta —su fondo blanco, su sombra y su etiqueta— no tiene nombre propio, pertenece al fotograma de la raíz y solo hace un fundido en el sitio viejo. De ahí los marcos blancos quietos detrás de las fotos volando, y de ahí que "las cartas no se muevan": es literal, no se movían.
- **Arreglo**: el nombre pasa a la tarjeta y se retira de la imagen. Viaja la tarjeta entera como un solo objeto. Cambiado en los DOS sitios (`FlyerCard.astro` y la réplica JS de `buildGalleryCard`, regla 7). **Verificado**: 32 tarjetas con nombre, 0 imágenes con nombre, 32 nombres únicos — importante, porque un nombre repetido aborta la transición entera.
- **Efecto secundario asumido**: el morphing de ida a la ficha ahora empareja *tarjeta* con *imagen* en vez de *imagen* con *imagen*. Pendiente del ojo del propietario; si no convence, la alternativa es dar a la tarjeta un nombre propio distinto y devolver el suyo a la imagen, a costa de duplicar los elementos nombrados.

### Y en Lista no había animación en absoluto

- **El FLIP solo tocaba las filas de la TABLA.** Por debajo de 440px la lista se dibuja como tarjetas (`#list-mobile-cards`), y ahí no se animaba nada — que es justamente donde vive el botón de ordenación. No era que se viera poco: no existía.
- **Arreglo**: el FLIP registra y reproduce también las tarjetas de móvil. Solo una de las dos vistas está montada a la vez, así que juntarlas no anima nada dos veces.
- **Verificado con un observador de mutaciones**, que es la única forma fiable aquí: 44 desplazamientos aplicados y 28 tarjetas recibiendo `transform 1500ms cubic-bezier(0.65, 0, 0.35, 1)`.
- **Lección de método**: la medición directa no servía —al leer el DOM tras el clic, el repintado aún no había ocurrido, porque va dentro de una transición asíncrona y aquí los fotogramas están congelados. Un `MutationObserver` sí lo capta, porque registra lo que pasó aunque nadie estuviera mirando.

## D-133 · Corrección de D-132, y la aritmética que explica la galería

D-132 daba por arreglados dos síntomas. El propietario probó en su teléfono: el de los marcos blancos sí (la tarjeta entera viaja, confirmado), los otros dos no. Lo que sigue corrige aquel registro.

### Lista: el FLIP se ejecutaba sobre nodos condenados

- **Causa**: el paso de reproducción del FLIP estaba escrito de un tirón para las filas de la tabla y las tarjetas de móvil, en el punto donde se reconstruye **la tabla** — que es *antes* de donde se reconstruyen **las tarjetas** (`mobileListItems.innerHTML = ''`, unas cuarenta líneas más abajo). En móvil medía y transformaba los nodos VIEJOS, que se tiraban a la basura acto seguido.
- **Mi medición de D-132 era correcta y mi lectura de ella no**: los 28 `transform 1500ms` se aplicaban de verdad. A elementos que no llegaban vivos al siguiente fotograma. Medir que una instrucción se ejecuta no es medir que produce un efecto.
- **Arreglo**: el paso se extrae a `reproducirFlip(nodos)` y se llama **dos veces**, cada una justo después de que su propio contenedor exista. Juntarlas otra vez devuelve el bug; queda advertido en el código.

### Galería: no hay nada que mover, y es aritmética

- **84 eventos en el archivo, `PAGE_SIZE` = 32.** Ascendente muestra los eventos 1–32; descendente, los 84–53. **La intersección es vacía.**
- Una transición de vista solo puede *mover* un elemento presente a ambos lados con el mismo nombre. Al pasar de descendente a ascendente no sobrevive en pantalla ni una tarjeta. El fundido no es un fallo: es lo único que el navegador puede hacer.
- **La misma cuenta explica la observación contraria**, que es lo que la hace fiable: el barajado toma 32 al azar de 84 y comparte ~12 con las anteriores, así que un tercio largo sí viaja. Por eso el barajado "se ve" y el ascendente no.
- **Ninguna de mis dos hipótesis anteriores (velocidad, después nombre de transición) tocaba esto.** No era un fallo de implementación en ningún momento.
- **Consecuencia de producto, pendiente de decisión del propietario**: si se quiere que reordenar "tenga gracia", tiene que ser una animación de entrada deliberada (escalonada), no una transición de vista. Es una decisión de diseño, no un arreglo.

### Volver a Lista desde una ficha estando en la página 2

- **Causa**: en `updateSlider()`, `currentPage = 1` estaba **fuera** del guard `if (!restaurandoVuelta())` mientras `galleryVisibleCount` y el scroll estaban dentro. El comentario de `readReturnState` ya decía que updateSlider resetea las dos cosas; se protegió solo una.
- **Por qué no se había visto**: la galería no usa `currentPage` (pagina por scroll infinito), así que el reseteo no tenía efecto visible. Solo se manifestaba volviendo a la Lista desde la página 2.
- **Arreglo**: `currentPage` dentro del guard, con los otros dos.

## D-134 · Rectificación de D-133, y las tres causas reales del reordenado

D-133 explicaba la galería con una cuenta equivocada. Queda corregido aquí.

### La aritmética de D-133 era falsa

- Dije "84 eventos, intersección vacía". **La hoja tiene 84 filas, pero se agrupan en 50 eventos** (varios flyers por evento vía carrusel). Con 50 y páginas de 32, ascendente y descendente **comparten 14**.
- **Medido en el navegador**: `{ascN:32, descN:32, comunes:14}`. Catorce tarjetas tenían pareja a ambos lados y aun así no se movían. Mi explicación no explicaba nada.
- Lección: la cuenta salió de `grep` sobre los `idMel` del HTML sin comprobar contra lo que la propia interfaz declara (el contador dice 50 en pantalla). Un número plausible que nadie contrasta es peor que no tener número.

### Causa real 1 — la cuadrícula se fotografía sin medir

- El ratio de cada cartel vivía **solo** en `card.dataset.ratio`. Cada reconstrucción de la galería (cualquier filtro, búsqueda o reordenado) lo tiraba con la tarjeta y volvía a esperar al `onload` de la imagen.
- El navegador fotografía el estado nuevo al salir del callback de la transición. En ese instante las 32 tarjetas eran placeholders `.unsized` del mismo alto: **la foto era de la cuadrícula equivocada**. De ahí las cajas blancas altas y el salto de la cuadrícula un segundo después.
- **Arreglo**: `ratiosMedidos`, un Map por `idMel` que sobrevive a las reconstrucciones, más `dimensionarConocidas()` que aplica las alturas conocidas en una sola pasada antes de que se tome la foto.
- **Verificado**: tras un reordenado, 9 de 12 tarjetas ya medidas sobrevivieron y **las 9 volvieron ya dimensionadas** (`gridRowEnd` puesto, sin `.unsized`), sin esperar a su imagen.
- Vale más allá de la animación: la galería dejaba de recolocarse en cada filtro.

### Causa real 2 — nombres por contenido donde hacía falta por hueco (idea del propietario)

- Las 18 tarjetas sin pareja no podían moverse por definición. Su propuesta: mover las hojas blancas mientras las imágenes se funden.
- Resulta ser exactamente lo que hace el mecanismo si se le nombra por **hueco** (`mel-hueco-{i}`) en vez de por contenido: las 32 emparejan, la caja viaja de su sitio viejo al nuevo y el contenido se disuelve dentro. Y es **más barato** que ahora: 32 grupos emparejados en vez de 32 que se van más 32 que llegan.
- **Arreglo**: `nombrarHuecos(true)` sobre las salientes antes de arrancar y sobre las entrantes dentro del callback; `nombrarHuecos(false)` al acabar, porque el nombre de contenido es el que empareja con la ficha del evento.

### Causa real 3 — el mismo fallo del guard, escrito dos veces

- `currentPage = 1` estaba fuera de `if (!restaurandoVuelta())` en **dos** sitios: el slider de años y el arranque del buscador. Arreglar solo el primero no cambió nada porque el que dispara en una vuelta es el segundo (su propio comentario ya lo decía).
- **Arreglo**: un único `reiniciarPosicion()` con el guard dentro, llamado desde los dos. Un guard por copia vuelve a divergir.

### Lo que este entorno NO puede verificar

- `document.hidden === true`: la pestaña del agente va en segundo plano y **Chrome aborta toda transición de vista en un documento oculto** (`InvalidStateError: Transition was aborted`). No es un fallo del sitio; es que aquí la animación no se puede ver ni medir de ninguna forma.
- Sí se puede comprobar lo estático: 39 elementos nombrados y **0 duplicados** (un nombre repetido aborta la transición entera, y era la otra sospecha razonable).
- Todo juicio sobre cómo QUEDA la animación es del propietario en un teléfono real.

## D-135 · Afinado del reordenado: curva, cascada en Lista y rebobinado del scroll

### Curva más rápida por el medio

- `cubic-bezier(0.65, 0, 0.35, 1)` (cúbica) → **`cubic-bezier(0.83, 0, 0.17, 1)`** (quíntica). Misma duración; lo que sube es la velocidad punta, de ~1,9× la media a ~2,6×.
- La escala queda anotada junto a la constante (cúbica → quíntica → expo ~3,2×). Se mueve tocando **una** línea: `ORDEN_ANIM_EASE`, que es la única fuente de la curva para galería y lista.

### Lista: cascada para las filas sin pareja

- **El truco de la galería no es trasladable tal cual, y el motivo importa**: allí funciona porque cada cartel mide distinto, así que el hueco 3 cae en otro píxel al reordenar y las cajas viajan de verdad. En la Lista todas las filas miden lo mismo — el hueco 3 está en el MISMO píxel antes y después. Nombrar por hueco daría exactamente cero movimiento.
- Lo único que puede viajar de verdad son las filas que ya existían en otro sitio (14 de 32 entre ascendente y descendente). Para las otras 18, la cascada.
- **Arreglo**: reordenando, las filas sin pareja entran escalonadas (26 ms de paso, tope 520 ms, 620 ms cada una, misma curva) en vez del parpadeo corto de `list-row-intro`, que se conserva para filtros y búsquedas.
- **Verificado**: 38 eventos de viaje a 1500 ms y 72 de cascada a 620 ms en el mismo reordenado, con retardos `26, 52, 78, 104, 130…`.

### Rebobinar el scroll en vez de teletransportarse

- Antes se hacía `scrollTop = 0` de golpe y **después** se reordenaba: el truco de magia ocurría en una pantalla a la que el visitante no había llegado por su pie, y el botón parecía haberse movido de sitio.
- **Arreglo**: `rebobinar()` sube deslizándose y solo cuando ha llegado arriba se reordena. Los dos gestos SEGUIDOS y no a la vez: la transición fotografía el estado viejo al arrancar, así que con el contenedor aún deslizándose la foto saldría de una posición que ya no existe.
- **`scrollend` con red obligatoria de 700 ms**: no existe en Safari anterior al 18, y un desliz interrumpido por el dedo tampoco lo dispara. Sin la red la promesa no se resolvería nunca y **el botón quedaría muerto para siempre**.
- **Verificado justamente en el peor caso**: en este entorno el documento está oculto y `scrollend` no llega; aun así scroll 1200 → 0, orden `desc` → `asc`, primera tarjeta `MEL-00080` → `MEL-00001`, y un segundo clic seguido vuelve a avanzar (el guard `rebobinando` no se queda pillado).

## D-136 · Subir y reordenar como un solo movimiento (sustituye al rebobinado de D-135)

El rebobinado de D-135 hacía los dos gestos SEGUIDOS: primero deslizarse arriba, luego reordenar. El propietario pidió que empezasen a la vez. Se consigue sin simular nada, y con menos código: se borra `rebobinar()`, `scrollerActivo()` y el guard `rebobinando`.

### El truco está en CUÁNDO, no en QUÉ

- El navegador fotografía el estado **viejo antes de entrar** en el callback de `startViewTransition`, y el **nuevo al salir**. Poniendo el scroll a cero *dentro* del callback, la foto vieja queda con el visitante donde estuviera y la nueva desde arriba: cada tarjeta viaja entonces su desplazamiento de reordenación **más** el del scroll, de una vez.
- Puesto antes de arrancar la transición (como estaba), la foto vieja ya sale desde arriba y el scroll se pierde: salto seco y luego animación.
- En la galería va **después** de reconstruir la rejilla: a media reconstrucción el alto del contenedor todavía no es el definitivo.
- En la Lista sale gratis por el mismo motivo, sin transición de por medio: el FLIP apunta las posiciones viejas, se pone el scroll a cero y luego mide las nuevas, así que el desplazamiento entra dentro del salto que calcula. **El orden de esas tres cosas es el arreglo entero**; moverlo lo deshace.

### Verificado

- Lista con 900 px de scroll: los saltos pasan de ser solo de recolocación a ir de **−2044 a +244 px**, con 36 de 56 filas por encima de 500 px. Scroll final 0.
- Galería con 1500 px de scroll: scroll final 0, primera tarjeta `MEL-00001` → `MEL-00067`, 32 tarjetas.

### Riesgo conocido, pendiente del ojo del propietario

- **El viaje crece con la profundidad del scroll**: a 900 px ya hay filas recorriendo 2000 px en 1500 ms. Muy abajo (3000–4000 px) el recorrido puede leerse como un borrón.
- No se pone tope por iniciativa propia: acotarlo cambia el carácter de la animación y esa decisión es suya. Si hace falta, el sitio es la duración o un tope al desplazamiento de scroll que se incorpora al salto.

## D-137 · Tres reglas de z-index llevaban muertas desde que se escribieron (ámbito de Astro)

### El hallazgo

El propietario reportó que al reordenar las tarjetas pasan por encima de toda la interfaz. La interfaz YA estaba nombrada (`mel-header`, `mel-toolbar`) con `z-index: 100`, así que en teoría debían pasar por detrás. Mirando el CSS **compilado**:

```
[data-astro-cid-lcdefpme]::view-transition-group(mel-header){z-index:100}
```

Astro le pone ámbito a los `<style>` reescribiendo el último compuesto del selector. Pero `::view-transition-group()` **solo existe en la raíz del documento**, y `html` no lleva el atributo de ámbito: **la regla no seleccionaba nada**.

### Qué estaba roto sin que se supiera

Las tres capas, desde el día en que se escribieron:
- `mel-header` / `mel-toolbar` / `mel-pagination` (z-index 100)
- `mel-side-panel` (z-index 101) — **el arreglo de D-116 nunca llegó a aplicarse**
- `mel-boton-orden` (z-index 102) — **tampoco**; se dio por bueno porque el síntoma dejó de reportarse, no porque se comprobara

Las reglas de `orden-cambiando` sí funcionaban, y eso es lo que despistaba: sobreviven porque empiezan por `html`, que Astro no reescribe. Dos bloques contiguos, uno vivo y otro muerto.

### Arreglo y lección

- Prefijo `html` en los tres selectores. Verificado en el CSS compilado, que es el único sitio donde esto se ve.
- **Un `<style>` de Astro no es CSS global.** Cualquier regla sobre pseudoelementos de la raíz (`::view-transition-*`, `::backdrop`, `::selection` a nivel de documento) tiene que empezar por `html`/`:root` o ir en `is:global`.
- **Lección de método**: un arreglo de CSS no está verificado hasta haber mirado la hoja compilada. "El síntoma dejó de aparecer" no es evidencia — aquí el síntoma dejó de reportarse durante días con la regla muerta.

## D-138 · Curva asimétrica y duración proporcional al scroll

- **Curva**: `cubic-bezier(0.83, 0, 0.17, 1)` (simétrica) → **`cubic-bezier(0.4, 0, 0.15, 1)`**. El primer par es la entrada: bajar su x hace que la velocidad punta se alcance antes. El segundo se deja bajo para conservar el frenado largo. Petición del propietario: tardaba demasiado en coger velocidad.
- **Duración proporcional al scroll, con tope**: recorriendo mucho pasan muchas más tarjetas por delante en el mismo tiempo y se lee como un borrón; estirar el reloj lo compensa. Con tope, porque la idea es dar la vuelta al principio, no recorrerse el archivo cartel a cartel.
  - `ORDEN_ANIM_MS_BASE` 1400 · `ORDEN_MS_POR_PX` 0.15 · `ORDEN_ANIM_MS_MAX` 2200. Son la perilla entera; el resto del código no sabe de esto.
  - Se mide al pulsar, **antes** de que `performDOMUpdates` ponga el scroll a cero: después la distancia ya se ha perdido.
- **Verificado**: 0 px → 1400 ms · 1500 px → 1625 ms · 2702 px → 1805 ms, con la curva nueva publicándose en `--mel-orden-ease`.

## D-139 · `#bloque-cabecera`: la interfaz fija pasa a ser una pieza opaca

- **Síntoma**: resucitado el z-index (D-137), las tarjetas ya pasaban por detrás de la cabecera y la toolbar, pero seguían viéndose **entre** ellas.
- **Causa**: eran DOS islas nombradas. El hueco entre ambas y el `pt` de arriba pertenecen al fondo de la página, que en la capa de transición va por DEBAJO de las tarjetas.
- **Arreglo**: una envoltura `#bloque-cabecera` que agrupa cabecera + toolbar, con `bg-mel-bg-primary`, el `pt` superior (movido desde el contenedor exterior) y sangrado horizontal por márgenes negativos que anulan el `px` de la página — igual que hace el slider. Así llega a los cuatro bordes.
- **Su nombre lo pone y lo quita JS**, dentro de `nombrarHuecos()`, solo durante el reordenado. Fijo se metería en las transiciones entre páginas, donde no tiene destino que le corresponda.
- **Los dos nombres interiores se apagan mientras tanto**: si siguieran puestos se capturarían aparte y dejarían su silueta recortada en el bloque — justo el agujero que se quería tapar. Arriba no se mueve nada durante un reordenado, así que no necesitan grupo propio.
- **Se apagan y encienden por `id`, no por el atributo `style`**: al apagarlos el `style` deja de contener el nombre, así que un selector como `[style*="mel-header"]` los encontraría a la ida y no a la vuelta, y se quedarían apagados para siempre. De ahí `#home-header` y `#home-toolbar`.

### Verificado

- **Geometría sin cambios** (era el riesgo: tocar el marcado del monolito). Móvil 390px: bloque `t:0 l:0 w:390`, y las cuentas cierran — 16 (pt) + 48 (cabecera) + 24 (hueco) + 196 (toolbar) = 284, galería en 300. Escritorio 1600px: bloque de 80 a 1520, exactamente el contenedor de 1440 sin desbordarlo, con la galería (144→1456) dentro, así que tampoco asoman por los lados.
- **Ida y vuelta de los nombres**: durante el reordenado `mel-bloque-fijo` + los dos interiores en `none`; al acabar, bloque vacío y `mel-header` / `mel-toolbar` restaurados.

### Escala de tiempo rebajada

`ORDEN_ANIM_MS_BASE` 1400 → **1000**, `ORDEN_MS_POR_PX` 0.15 → **0.12**, `ORDEN_ANIM_MS_MAX` 2200 → **1600**.
0 px → 1000 ms · 1500 px → 1180 ms · 2700 px → 1324 ms · 5000 px o más → 1600 ms.

## D-140 · Ordenar cancela la vuelta, y en Lista no se arranca transición

### Al volver de una ficha, ordenar no animaba

- **Causa**: `restaurandoVuelta()` sigue siendo cierto durante 4s (`RETURN_STATE_TTL_MS`) tras aterrizar, y `filterArchives` se salta la transición entera mientras lo sea — con razón: la del ClientRouter sigue viva y apilar otra la supersede (regla 3).
- **Por qué solo pasaba sin haber hecho scroll**: tocar el scroll cancelaba la vuelta por otra vía, y a partir de ahí sí animaba.
- **Arreglo**: `cancelarVuelta()`, llamado al principio de `avanzarOrden()`. Elegir un orden nuevo deja de ser "estoy volviendo": es pedir otra cosa.
- **Verificado** montando la condición exacta (`window._melState.pendingReturn` vivo al pulsar): vuelta viva → cancelada → 1 transición arrancada. Antes, 0.

### En Lista, el cambio a ascendente era un fundido

- **Causa**: las filas no llevan `view-transition-name` a propósito (regla 2: con nombre se promocionan a la capa superior y se escapan del recorte del scroll). Al no tenerlo pertenecen a la foto de la RAÍZ — y esa foto vieja se funde por encima del FLIP durante toda la animación, tapándola. El movimiento estaba ahí debajo; no se veía.
- **Arreglo**: reordenando en Lista no se arranca transición de vista. Ahí la animación la hace el FLIP, y arriba no cambia nada durante un reordenado, así que la transición no aportaba nada que perder.
- **Verificado**: 0 transiciones de vista (síncronamente y tras forzar fotogramas), 20 filas viajando a `transform 1072ms cubic-bezier(0.4, 0, 0.15, 1)` — 1000 + 600×0,12, exacto — y 12 en cascada. Las 32 contabilizadas.

### Nota de método

Dos falsos negativos seguidos en esta sesión por lo mismo: **el paso que reproduce el FLIP vive dentro de `requestAnimationFrame`, y en el entorno del agente los fotogramas están congelados** (documento oculto) salvo que se fuerce uno con una captura. La cascada es síncrona y sí se registraba, lo que hacía parecer que solo fallaba el viaje. Midiendo sin forzar fotograma: 0 viajes. Forzándolo: 20. Un `MutationObserver` tampoco salva esto si se desconecta en la misma tanda síncrona — sus registros se entregan como microtarea.

## D-141 · Por qué NO se enmascaran las tarjetas (alternativa valorada)

El propietario propuso recortar las tarjetas durante la animación en vez de taparlas con un bloque opaco, observando —con razón— que la sensación de scroll normal la produce el recorte (`overflow-y: auto` del panel).

Es viable (`clip-path` sobre `::view-transition-group()`), pero sale peor en las tres cosas:

1. **No se puede seleccionar por prefijo.** No hay forma de decir `mel-hueco-*`: habría que recortar `*` y desrecortar a mano cada nombre de la interfaz. Una lista que hay que mantener para siempre, y olvidar uno lo recorta.
2. **Tampoco ahorra JS.** El rectángulo de recorte es el borde superior de la galería en coordenadas de viewport: solo lo sabe JS, y hay que publicarlo como variable CSS en cada reordenado.
3. **Es más pesado, no menos.** Un rectángulo opaco es lo más barato que sabe hacer un compositor —puede incluso saltarse lo que queda detrás—. Un `clip-path` es una máscara por capa evaluada en cada fotograma: con 32 tarjetas animando, 32 máscaras por fotograma en vez de un cuadrilátero opaco.

A favor del recorte: se ajustaría al borde de la galería pase lo que pase por encima, mientras que el bloque opaco depende de que la interfaz siga estando justo encima. Hoy lo está, y el resultado es idéntico.

Y una razón de fondo: `#bloque-cabecera` no es andamiaje de animación. El bloque fijo de cabecera ES una pieza con fondo propio; darle elemento y fondo es describir la página como es. El recorte habría tapado el síntoma dejando vivo el fallo real —las tres reglas de z-index muertas de D-137—, y con él el panel del mapa y el botón seguirían rotos.

## D-142 · El pulsado tardaba 200ms justo donde estaba diseñado

- **Síntoma**: en móvil, pulsar brevemente una fila de la lista "no hace nada".
- **Causa**: en `global.css`, la realimentación instantánea (`transition-duration: 0s`) se aplicaba solo a `a`, `button`, `summary` y `[role=button]`. Los elementos con pulsado propio (`[class*="active:bg-"]`) están excluidos de ese bloque para que no se les sume el atenuado genérico — pero al excluirlos se les quitó también la inmediatez. Como además llevan `transition-colors duration-200` para su `hover`, esa duración se aplicaba al pulsado: el color tardaba 200ms en llegar y en un toque breve no llegaba nunca.
- **Quedaba al revés de lo pretendido**: los componentes CON estado pulsado diseñado eran los que peor respondían al dedo.
- **Arreglo**: `transition-duration: 0s` también en ese segundo bloque. Verificado en la hoja compilada (el `@media (hover:none)` no se puede comprobar desde un navegador de escritorio).
- **Lo que este arreglo NO cubre, y está sin confirmar**: si además de no verse, la navegación tampoco ocurre. No se puede reproducir aquí — el entorno del agente no genera entrada táctil real, y los eventos táctiles sintéticos no producen el `click` que sí genera un dedo. Si sigue sin navegar, el sospechoso es el navegador y no este código: un toque que se desplaza unos pocos píxeles dentro de un contenedor con scroll inicia el desplazamiento y el navegador cancela el `click`. Eso solo se arregla atendiendo `touchend` a mano, con el riesgo de doble navegación.

## D-143 · Lista de móvil: 16px menos de hueco con el selector de vista

- **Medido antes**: la toolbar acaba en 284, el contenedor de la lista empieza en 300 y la primera fila añade sus 16px de `py-[16px]` → el texto arrancaba en 316. **Hueco visual real: 32px**, el doble del que separa cualquier otro par de bloques.
- **Arreglo**: `-mt-4` en `#list-mobile-cards-items`. El relleno de la primera fila queda por encima del origen del scroll —donde no se puede llegar— y el texto arranca justo en el borde del contenedor.
- **Margen negativo y NO mover la caja, a propósito** (criterio del propietario): el contenedor conserva su posición y su alto, así que dónde se corta el contenido por abajo no cambia. Es restar scroll de partida, no acercar el componente.
- **Verificado**: contenedor intacto en 300→840, hueco visual 32 → 16.

## D-144 · Enmascarado de la vuelta al panel del mapa (temporal, con fecha de caducidad)

### El diagnóstico, eslabón a eslabón

1. **La recarga dura es deliberada.** El botón de cerrar de la ficha lleva `data-astro-reload` cuando se vuelve a un panel (`event/[id].astro`): la transición suave dejaba el panel llegando tarde (D-116, cuatro intentos).
2. **Y esa decisión desactiva el enmascarado existente.** El que arregló el parpadeo de la galería vive en `astro:before-swap`, y **en una recarga dura ese evento no existe**. Por eso el problema solo se da en esta ruta.
3. **El SSR ignora `?view=`.** Verificado sobre el HTML servido para `?view=mapa&location=Dickens Tavern`: `#view-galería` sale con `active`, `#view-mapa` con `hidden`, y el toggle con Galería encendida.
4. Resultado: la recarga pinta una home de Galería **completa y coherente** y solo después JS voltea las vistas, desliza el indicador del toggle 300ms y abre el panel. Es una carrera contra la velocidad del aparato — de ahí que en Chrome móvil no se aprecie y en Safari o con el inspector sí.

### Lo aplicado

Enmascarar, **sin tocar ni una clase de las vistas ni del toggle** (regla 15):
- El SSR marca `#pantalla-home[data-vista-pendiente]` cuando `?view=` no es galería.
- Mientras la marca esté: `#content-views` invisible y el indicador del toggle sin transición (aparece en su sitio en vez de recorrer 300ms desde Galería). Cabecera y toolbar quedan visibles, así que la espera se lee como "cargando".
- `revelarVistaPedida()` destapa cuando lo tapado está montado, comprobando fotograma a fotograma porque no hay evento al que engancharse. Volviendo a un panel del mapa espera al PANEL, no al mapa: es lo último en aparecer y es a lo que se vuelve.
- **Red de seguridad de 2500ms obligatoria**: si el mapa no cargara (sin red, API caída, clave rechazada), sin ella el contenido quedaría invisible para siempre.

### El fallo de ámbito, otra vez

`#toggle-active-indicator` vive en `ToggleSelector.astro` y lleva SU identificador de ámbito. La regla escrita en `index.astro` se reescribía con el cid de index y no alcanzaba nada — **el mismo fallo silencioso de D-137**. Cazado midiendo la duración resultante (seguía en 0.3s), resuelto con `:global()`. Confirmado en la hoja compilada.

### Deuda reconocida, y su salida

Es el **segundo** remiendo del mismo tipo: el servidor pinta una cosa y el cliente la corrige después de pintarla. El propietario lo señaló al aprobarlo y tiene razón.

**El arreglo de verdad es que el SSR honre `?view=`**, y borraría los dos de golpe: éste y el de `astro:before-swap`. La regla 15 lo marca como terreno minado (rompía los listeners del panel lateral), y al revisar `switchView` NO se encontró salida temprana ni mecanismo evidente que lo explique — lo que significa que la trampa sigue sin localizarse, y eso es motivo para más cuidado, no para menos. Ambos bloques quedan rotulados como temporales y son borrables de una pieza el día que se ataque.

### Sin verificar aquí

Si el parpadeo desaparece **percibido** en sus aparatos. El fallo es dependiente de la velocidad del dispositivo y este entorno no reproduce la ruta lenta con fidelidad. Lo comprobable sí está: la marca aparece solo con `?view=mapa|lista`, tapa (`opacity: 0`, indicador a `0s`) y se retira dejando mapa visible y panel abierto.

## D-145 · Ritmo de 40px en la columna de la ficha, y navegación con sitio propio

### Medido antes de tocar

| Hueco (escritorio) | Antes | Ahora |
|---|---|---|
| título → párrafo | 40 | 40 |
| párrafo → divisor | **24** | **40** |
| divisor → ARTISTAS | 40 | 40 |
| ARTISTAS → lista | 8 | 8 *(sin tocar: es etiqueta→contenido, no uno de los huecos marcados)* |
| lista → botón | 40 | 40 |
| botón → navegación | **128** (96 de margen + 32 de relleno) | **40 cuando el contenido empuja** |

Tres de los cinco ya eran 40. A ojo parecían distintos por las cajas de línea de cada tipografía, no por el CSS — de ahí que mereciera la pena medir antes de repartir cambios.

### La navegación ahora tiene sitio de serie

- **Antes**: `lg:mt-24` + `pt-8`, 128px fijos que ni anclaban la navegación ni seguían el ritmo del resto. Con la ventana a 1000px acababa en 843 — flotando, ni pegada al contenido ni al fondo.
- **Ahora**: margen superior AUTOMÁTICO en escritorio (`lg:mt-auto`) y el contenedor pasa de `lg:flex-none` a `lg:flex-1 lg:min-h-auto` para que llene. Así la navegación se queda al fondo mientras el contenido no llegue, y cuando el contenido crece el margen automático se agota y manda `lg:pt-10`: 40px exactos.
- `lg:min-h-auto` (y no dejar el `min-h-0`) es lo que impide que el contenedor se encoja por debajo de su contenido cuando la ficha es larga.
- **Verificado en los tres regímenes**: ventana de 1400 → navegación a 108px del borde inferior, margen automático de 501px; ventana de 1000 → los mismos 108px del borde; ventana de 620 (el contenido desborda) → margen automático a 0 y **40px exactos** del botón al texto de la navegación.
- **Móvil sin cambios**: conserva `flex-1 min-h-0 overflow-y-auto`, su scroll propio y sus `mt-10` + `pt-8` — ahí el `pt-8` es la separación del divisor, que en móvil se dibuja con un pseudoelemento en el borde de la caja.

### Trampa del compilador

Un comentario HTML dentro de `{eventData.description && (…)}` rompe el build con `[CompilerError] Unexpected token`: ahí dentro se compila como expresión. Los comentarios de esa zona van FUERA de la expresión. Anotado en el propio marcado.

## D-146 · El enmascarado de la vuelta destapa en seco

El propietario probó D-144 y apenas notó mejora, con la condición de no añadir retraso —esa parte de la app ya se siente lenta—. El revelado llevaba el fundido de 250ms de `revelarColocado()`, y era tiempo añadido a cambio de nada: el enmascarado **no adelanta ni un milisegundo**, solo cambia qué se ve durante una espera que dura lo mismo. Ahora destapa en seco y su coste propio es cero. Refuerza lo dicho en D-144: la ganancia real está en que el SSR honre `?view=`, no en tapar mejor.

## D-147 · Revisión de D-145: el ritmo no es plano, son tres tallas

D-145 igualó la columna a 40px en todo. Con los huecos ya iguales delante, el propietario vio que quedaba monótono y pidió otro reparto. **Sustituye la tabla de D-145.**

| Hueco (escritorio) | D-145 | Ahora |
|---|---|---|
| título → párrafo | 40 | **32** |
| párrafo → divisor | 40 | **32** |
| divisor → ARTISTAS | 40 | **32** |
| contenido → botón | 40 | **40** |
| botón → navegación | 40 | **56** |

Las tres tallas van de menos a más según se baja (32 · 40 · 56): el bloque se lee como una unidad que se despide, en vez de una lista de cosas separadas por igual. Es lo que la escala del DS llama L, XL y una talla por encima.

### El detalle de implementación que no es obvio

`título→texto` y `texto→botón` cuelgan **del mismo `gap`** de `#detail-scroll`, y ahora tienen que valer distinto (32 y 40). El `gap` se queda en 32 para los dos y el bloque del botón añade los 8 que le faltan con `lg:mt-2` — en flexbox el margen SUMA al gap. Si algún día se cambia el `gap` del padre, hay que rehacer ese 8.

### Sin cambios

- **Móvil**: sigue en 32 en todo, con sus `mt-10` + `pt-8` en la navegación. El propietario habló de la captura de escritorio y no se ha extrapolado.
- **ARTISTAS → su lista**: 8px. Es relación etiqueta-contenido y no era uno de los huecos marcados.
- **El anclaje de la navegación** (D-145) intacto: a 1400 de alto queda a 108px del borde inferior con 509px de margen automático; a 620, donde el contenido empuja, el margen cae a 0 y mandan los 56.

### Verificado

Los cinco huecos medidos en el navegador tras el cambio: 32 · 32 · 32 · 40 · 56.

## D-148 · La navegación de la ficha no tenía punto fijo, y ahora sí

- El propietario la vio demasiado abajo tras D-145 y pidió comprobar a qué altura fija estaba antes. **No estaba a ninguna**: con el contenedor a `lg:flex-none` colgaba del final del contenido, así que cada ficha la dejaba a una altura distinta. Medido restaurando las clases originales en vivo: **165px del borde inferior en FIV XI y 278px en Trip With Us** — 113px de diferencia. Lo que se recordaba como fijo era dónde caía en las fichas que se miraban.
- Al anclarla (D-145) quedó a ras del `padding-bottom` de 108px de la página, 57px más abajo que en FIV XI.
- **Arreglo**: `lg:pb-14` (56px) levanta el contenido de la navegación hasta ~164px del borde, la altura que tenía en las fichas de referencia, y usa la misma talla que el hueco de arriba: queda enmarcada por el mismo valor por los dos lados. **Es EL número a mover** si hay que reajustar la altura.
- **Verificado**: FIV XI y Trip With Us, las dos ahora a 164px del borde inferior con ventana de 1000. Antes discrepaban 113px.

## D-149 · `+` en la etiqueta de los clusters del mapa

- Un `12` a secas se lee como "aquí hay doce eventos" cuando lo que dice es "aquí y alrededor". El `+` distingue de un golpe un grupo de un pin suelto.
- **Se escribe en DOS sitios y hay que tocar los dos**: `clusterRenderer` (al crear la burbuja) y la pasada de refresco de `updateMapMarkers`, que reescribe la etiqueta cada vez que un grupo gana o pierde un miembro. Con el `+` solo en el renderer **desaparecía al reagrupar** — un fallo intermitente. Queda advertido en ambos.
- Los pines individuales no se ven afectados: escriben otro formato (`Nombre (n)`), comprobado.
- **Sin verificar visualmente**: la API de Maps no carga en el entorno del agente (el área del mapa sale gris), así que el `+` hay que verlo en un navegador real.

## D-150 · La tipografía del cluster nunca fue distinta; su caja sí

El propietario sospechó que la fuente del marcador de cluster no seguía el estilo del resto y que cambiaba de tamaño con el zoom. **La sospecha de la fuente era falsa y la de que algo iba mal, cierta.**

- **Medido** inyectando el marcado de ambos tipos y leyendo el estilo resuelto: familia (`Space Grotesk`), tamaño (16px), peso (500) e interlineado (20px) son **idénticos** en cluster y pin suelto. Comparten la clase `.mel-marker-label`, así que no podían diferir.
- **Lo que sí difería**: el cluster es el único marcador sin `.text-marker`, así que usaba `height: 40px` con `box-sizing: border-box` y `padding: 12px` → caja de contenido de **16px para una `line-height` de 20px**. La caja de línea desbordaba 2px por arriba y 2 por abajo. Los pines (`8px 12px`, alto automático) la encajan justa. El texto del cluster era el único renderizado a presión.
- **Arreglo**: `padding: 10px 12px 10px 8px`. Los 10px verticales dejan la caja de contenido en 20px exactos, iguales a los pines. Los 8px de la izquierda son los 4 que pidió el propietario para equilibrar el peso visual ahora que la etiqueta empieza por `+` (el signo es más ligero y alto que las cifras). **Efecto colateral señalado**: el bocadillo queda 4px más estrecho, no solo el texto desplazado.
- **Artefacto de medición que hay que conocer**: los marcadores tienen animación de entrada y en el entorno del agente los fotogramas están congelados, así que `getBoundingClientRect()` devuelve las medidas escaladas a ~0,6 (24 en vez de 40). Las de layout (`clientHeight`) no se ven afectadas y son las que valen.
- **Sin verificar**: el cambio de tamaño con el zoom. La API de Maps no carga en el entorno del agente (el área sale gris). Si persiste tras esto, es otra causa.

## D-151 · Buscador V1.2 — la pica delante del título

Cambio único, y viene de feedback real de usuarios.

- **Problema 1**: la gente no identifica el título como un buscador.
- **Problema 2**, entre quienes sí lo entienden: pulsan **a la derecha de la pica** para empezar a escribir —donde iría el texto si el caret estuviera esperando— y ahí no hay nada. El botón termina en la pica, así que el toque cae al vacío y no pasa nada.
- **Arreglo**: la pica pasa delante del título (`ml-1` → `mr-1`). Ese mismo gesto instintivo aterriza ahora sobre el texto, que sí es pulsable. **No se amplía la zona de click ni se toca el estado activo**: solo cambia de lado el caret.
- **Verificado**: pica en x=188 y título en x=197 (delante), y un click real en x=200 —justo a la derecha del caret, el punto que antes fallaba— abre el buscador (`data-state="placeholder"`) y deja el foco en `#search-active-input`, listo para escribir.
- **Artefacto de medición**: la pica sale con `opacity: 0` en las capturas del entorno del agente. No es un fallo: tiene animación de parpadeo (`mel-cursor-blink`) y aquí los fotogramas están congelados, así que se queda clavada en la fase apagada. Mide 5×24px y está en su sitio.
- El problema 1 sigue abierto: es lo que persigue la V2.

### Hallazgo colateral (no arreglado aquí)

`index.astro` busca el campo por `getElementById('search-input')` y ese id **no existe en el proyecto** (el real es `search-active-input`). No es un fallo funcional —`HeaderTitle.astro` restaura la búsqueda leyendo `URLSearchParams` por su cuenta—, así que es código muerto que aparenta hacer algo. Queda apuntado como tarea aparte.

## D-152 · Cabecera: contraste del título y colapso a siglas recalculado

Ambos cambios salen de la primera ronda de feedback — ver [insights.md](insights.md).

### El título a `text-secondary`

La pica es lo único que insinúa que ahí se escribe, y desde la V1.2 está a la
izquierda, donde su parpadeo se nota menos (antes cerraba la frase, justo donde
la vista acaba de leer). Restarle peso al texto es lo que la deja destacar. El
título pasa de `text-mel-text-primary` a `text-mel-text-secondary`. Verificado:
`hsla(348, 24%, 30%)` frente al 6% de luminosidad del primary.

### El colapso a siglas, de 1024px a 440px

- **Regla del propietario**: el título nunca puede quedar a menos de 40px del
  menú o de su botón.
- **Medido**, no estimado: el título largo ocupa **300px** con Space Grotesk
  cargada (270 con la de reserva, así que la medida es con la fuente buena) y la
  pica suma 9px con su margen. La separación real hasta el menú es
  `ventana − 2×padding − ancho del menú − 309`; el `gap` del flex no entra en la
  cuenta porque el contenedor del título es `flex-1` y absorbe el sobrante.

  | Rango | Padding | Menú | Ventana mínima |
  |---|---|---|---|
  | <640 | 24 | 40 (icono) | **437** |
  | 640–767 | 48 | 40 (icono) | **485** |
  | 768–1023 | 48 | 113 (Menú+icono) | **558** |
  | ≥1024 | 108 | 113 | 678 |

  Cada tramo necesita menos de lo que mide su propio suelo, así que **el título
  entero cabe en cualquier ancho ≥437px**. A 1024 sobraban 215px de margen ya en
  una pantalla de 700.
- **Elegido 440px**: deja 43px de separación (3 de colchón sobre la regla) y
  reutiliza el breakpoint que el proyecto ya usa para el botón de ordenación y
  para la lista en tarjetas, en vez de introducir un número nuevo.
- **Verificado en los bordes**: 439 → `M.E.L.`; 440 → título largo con 43px;
  768 (el tramo más apretado, donde aparece el label "Menú") → 250px; 360 → siglas
  y sin desbordamiento horizontal.
- **Si cambia el texto del título, el del menú o el padding de la página, hay que
  rehacer esta cuenta.** Queda anotada en el propio componente.

## D-153 · `docs/insights.md` — registro de observaciones de usuarios

**Petición del propietario**, y con un motivo que merece quedar escrito: el porqué
se pierde antes que el qué. El código dice lo que hace y `decisions.md` dice cómo
se implementó, pero ninguno de los dos recuerda **que alguien no encontró el
buscador**. Sin eso, dentro de un año alguien "arregla" el orden de la pica y
devuelve el problema.

- Una entrada por observación, con fecha y fuente.
- **Se distingue siempre lo que dijo un usuario de lo que prefiere el
  propietario.** No es lo mismo un dato sobre el producto que una decisión de
  diseño legítima, y mezclarlos hace que dentro de un año no se sepa cuál era
  cuál.
- **Las observaciones que no llevaron a ningún cambio también se apuntan**: saber
  que algo se detectó y se decidió no tocarlo vale tanto como el cambio.
- Enlazado desde el índice de AGENTS.md y añadido a la lista de mantenimiento de
  documentación como paso obligatorio.
- Incluye una sección permanente con lo que el entorno del agente NO puede
  verificar (tacto, transiciones de vista, animaciones, el mapa, y cómo queda
  algo), porque condiciona cómo se leen todas las entradas.

## D-154 · Título de la cabecera a `tertiary` y peso 600

- **`text-tertiary`** (petición del propietario): da al reposo aspecto de
  placeholder y deja la pica como el elemento llamativo. Resulta que
  `text-tertiary` resuelve a **`#ad858d`**, exactamente el color que el campo usa
  para su propio placeholder: el reposo queda literalmente pintado con el color
  del placeholder, coherencia que no había que construir.
- **Contraste medido**: título 2,92 sobre fondo; pica 14,35 sobre fondo y 4,91
  sobre el título. El umbral AA para texto grande (22px en negrita lo es) es 3,0,
  así que queda 0,08 por debajo. **Aplazado a conciencia por el propietario**, con
  condición de salida — ver [insights.md](insights.md). No es una regresión
  introducida aquí: el placeholder del campo ya usaba ese color.
- **`font-semibold` (600) en vez de `font-bold`**: en `tertiary` las letras de
  "Memoria" se pegaban. La causa es el `tracking-[-0.44px]` (espaciado NEGATIVO)
  con trazos gruesos; en oscuro el contraste ayudaba a separarlas y al aclarar se
  pierde esa ayuda.
- **Por qué el peso es el arreglo correcto aquí**: Space Grotesk mantiene los
  mismos avances entre pesos — medido, el título largo mide **299,5px en 700 y en
  600** (299,3 en 400). Los trazos se afinan sin que nada se mueva de sitio, así
  que el hueco visible se abre. Y **el cálculo del breakpoint de 440px (D-152) no
  se ve afectado**: el mínimo sigue en 437px y la separación al menú pasa de 43 a
  44px. Verificado, no supuesto — un cambio de tipografía es exactamente lo que
  ese cálculo advertía que había que rehacer.
- 300, 400, 500, 600 y 700 están todos cargados desde Google Fonts, así que 600 es
  un peso real y no una negrita sintética del navegador.
- **Pendiente del ojo del propietario**: el label "Menú" sigue en `font-bold`
  (700) y en `text-primary`, así que la fila de la cabecera lleva ahora dos pesos
  y dos tonos distintos. Puede ser lo correcto —el título retrocede a campo, el
  menú sigue siendo una acción— o puede leerse como incoherencia.
- **Palanca de reserva** si hiciera falta abrir más las letras: relajar el
  tracking negativo, que es la causa de fondo.

## D-155 · `HeaderSimple.astro` — la cabecera sin buscador pasa a ser un componente

- **Estaba copiada a mano y byte a byte idéntica** en `exposiciones.astro`, `info.astro` y `404.astro`. Y no por descuido: la **regla 10 de AGENTS.md decía literalmente "replica el header de `exposiciones.astro` en páginas nuevas"**, que es una invitación a que se desincronicen. Este cambio es la prueba: había que tocar el punto de colapso en tres sitios.
- **Arreglo**: `<HeaderSimple />` en las tres. La regla 10 queda reescrita para mandar usar el componente en vez de copiar.
- **NO sustituye a la cabecera de la home**: esa lleva el buscador (`HeaderTitle`) y su título es un campo, no un enlace. Lo que ambas comparten —y tiene que seguir coincidiendo— es la geometría de la fila y el punto de colapso; si divergen, el título salta de sitio al navegar entre páginas.
- **El título de estas páginas se queda en `font-bold` y `text-primary`**, al contrario que en la home: aquí es un elemento de navegación, no el placeholder de un campo. No se extrapoló el cambio de tono sin pedirlo.

### El colapso, recalculado para estas páginas

Estas cabeceras **no tienen pica**, así que la cuenta es la de D-152 menos esos 9px:
`ventana − 2×padding − ancho del menú − 300`, con el mínimo de 40px al menú.

| Rango | Padding | Menú | Ventana mínima |
|---|---|---|---|
| <640 | 24 | 40 (icono) | **428** |
| 640–767 | 48 | 40 | **476** |
| 768–1023 | 48 | 113 (Menú+icono) | **549** |
| ≥1024 | 108 | 113 | 669 |

Las tres páginas usan el mismo `px-6 sm:px-12 lg:px-[108px]` que la home, comprobado, así que la tabla vale igual. Cada tramo necesita menos de lo que mide su suelo → el título entero cabe en cualquier ancho ≥428px. **Se usa 440 igualmente**, el mismo que la home, en vez de un número por página: deja 52px de separación (más holgado que los 44 de la home, precisamente por no tener pica) y evita que el título cambie de forma al navegar.

**Verificado**: las tres páginas sirven el componente con un solo `#menu-btn` (sin duplicados del refactor); a 440 la de exposiciones muestra el título largo con 52px de separación y a 439 pasa a `M.E.L.`, sin desbordamiento horizontal.

## D-156 · El placeholder del buscador, por token y no por hex

`placeholder:text-[#ad858d]` → `placeholder:text-mel-text-tertiary`. **Es el mismo color** —`text-tertiary` resuelve exactamente a `#ad858d`—, pero escrito a mano se habría quedado atrás el día que se ajuste el token, que está pendiente por contraste (ver `insights.md`), y habrían aparecido dos grises distintos en la misma cabecera.

Petición del propietario, que además abre una tarea mayor: **auditoría de estilos de color y texto en todos los componentes**, anotada en `roadmap.md`. Este hex era un caso, y lo que hay que buscar es cuántos más hay.

### Trampa del compilador (segunda vez esta sesión)

Un comentario HTML **dentro** de una etiqueta, entre atributos, rompe el build igual que dentro de una expresión `{…}`. Los comentarios van siempre ANTES de la etiqueta.

## D-157 · Fuera el selector muerto `search-input`

- En `initHomePage`, el bloque que lee los parámetros de la URL hacía
  `document.getElementById('search-input')` y asignaba el valor al campo. **Ese id
  no existe en ningún archivo del proyecto** (el real es `search-active-input`, en
  `HeaderTitle.astro`), así que el guard `if (searchInput)` se lo tragaba en
  silencio: aparentaba ocuparse de rellenar el campo sin ocuparse de nada.
- **No era un fallo funcional**: quien restaura de verdad es `HeaderTitle`, que lee
  `?search=` por su cuenta y llama a `setState('filled', …)` — y eso pone el valor
  en el input Y dispara la búsqueda, las dos mitades del trabajo.
- Se conservan las asignaciones a `searchQuery` y `_s.searchQuery`, que sí se usan.
- **Verificado** con carga limpia de `/?search=ravers`: campo con "ravers", texto
  visible "ravers", estado `filled` y galería con 16 tarjetas (sin filtro son 32).
- Que el borrado no puede cambiar el comportamiento no es una suposición: el
  `getElementById` devolvía `null`, luego la sentencia retirada **nunca se
  ejecutó**, y la variable no se usaba en ninguna otra línea.

### Hallazgo separado — RETIRADO, era un falso positivo

Se registró aquí que "las cifras de la toolbar muestran el archivo completo sobre
una galería filtrada a 16", y se abrió una tarea para arreglarlo. **No existía tal
fallo.** Con los fotogramas corriendo las cifras dan Eventos 16 / Artistas 51 /
Diseñadores 1 / Promotores 1 sobre 16 tarjetas: cuadra.

Las tres lecturas que lo motivaron (50, luego 34, luego 31) eran muestras de la
animación de 200ms de `animateValue` **en pleno vuelo**, y la primera se tomó antes
de que arrancara. Tarea retirada.

**La lección, que es la misma que ya costó tiempo dos veces en esta sesión**: un
número leído de un contador animado no es un número, es un fotograma. Si tres
lecturas del mismo estado dan tres valores distintos, el problema está en el
método de medida, no en el código.

**Nota de método, tercera vez en esta sesión**: al intentar diagnosticarlo disparé
`mel-search` a mano y las lecturas se volvieron ruido (contador 34 y galería
vacía, valores de un estado intermedio que no representa ningún flujo real).
Perturbar el estado para medirlo es exactamente lo que invalida la medida. La
lectura buena salió de recargar limpio y no tocar nada.

## D-158 · Revertido el enmascarado de la vuelta al panel (D-144/D-146)

El propietario reporta que **el panel del mapa no se abre**. Qué se descartó antes de tocar nada:

- **Los cambios sin commitear no lo tocan**: son 10 líneas de borrado de código muerto en el bloque de parámetros de la URL (D-157), y el diff no roza mapa ni panel.
- **El anidamiento de `#bloque-cabecera` es correcto**: comprobado en el HTML servido, `#content-views` va después del bloque y `#map-side-panel` sigue dentro. La envoltura no se tragó nada.
- **No se puede reproducir aquí**: la API de Maps no carga en el entorno del agente.

**Decisión**: retirar el enmascarado entero en vez de seguir adivinando. Es el sospechoso más razonable —lo más nuevo en ese flujo, y toca precisamente el arranque de la vista Mapa— y es el que menos aportaba: el propietario ya dijo que apenas mejoraba (D-146). Se quitan las cinco piezas: el cálculo del frontmatter, el atributo del SSR, las dos reglas CSS, la llamada y `revelarVistaPedida()` completa. 93 líneas fuera.

**Lo que NO se ha revertido, y por qué**: las tres reglas de z-index resucitadas en D-137 (`html::view-transition-group(…)`). Son el otro cambio nuevo que toca el panel —el arreglo de D-116 llevaba muerto desde que se escribió y ahora sí se aplica—, así que si el panel sigue sin abrirse después de esto, ése es el siguiente sitio donde mirar. No se tocan a la vez porque revertir dos cosas juntas no dice cuál era.

**Pendiente de saber**: qué gesto exactamente falla —pulsar un marcador, llegar por una tag de "Lugar", o volver de una ficha—. Cada uno pasa por un camino distinto y sin eso no se puede acotar más.

## D-159 · El mapa suma 47 y el contador 50: son datos, no código

Tres eventos traen `"coordenadas":"Desconocido"` desde la hoja. 50 − 3 = 47, y el mapa no puede colocar lo que no tiene coordenadas. **No es un fallo del sitio**: o se completan esas tres en el Sheet, o el mapa declara en algún sitio cuántos eventos no puede ubicar. Pendiente de decisión del propietario.

## D-160 · El enmascarado rompía el panel del mapa: la regla 15 tenía razón

Confirmado por el propietario: retirado el enmascarado (D-158), **los tres flujos del panel vuelven a funcionar** — pulsar un marcador, llegar por una tag de "Lugar" y volver de una ficha.

Así que el culpable era el enmascarado de D-144, y eso es exactamente lo que la **regla 15 de AGENTS.md** advierte: *"Cambiar la vista SSR por defecto o el flujo de inicialización rompe los event listeners del panel lateral, dejándolo atascado."*

**Se citó esa regla al proponer el enmascarado y se dio por hecho que no aplicaba** porque no se cambiaban las clases activas del SSR. Pero el enmascarado sí tocaba el flujo de inicialización: añadía una función al final de `initHomePage` que se quedaba sondeando con `requestAnimationFrame` hasta que el panel se abriera. La regla no dice "no cambies las clases", dice **el flujo de inicialización**, y eso incluye añadirle trabajo.

Se buscó el mecanismo concreto en `switchView` y no se encontró —no tiene salida temprana—, y se registró en D-144 que "eso es motivo para más cuidado, no para menos". Lo era. La regla estaba escrita a partir de un bug real de producción y describía el síntoma con precisión.

**Para la próxima**: la regla 15 no se satisface razonando que el cambio es inofensivo. Sin poder reproducir el mapa en el entorno del agente, cualquier cosa que toque el arranque de la vista Mapa hay que dársela al propietario a probar ANTES de encadenar más trabajo encima.

## D-161 · Una sola fábrica de URLs de ficha (`eventUrl`)

**Síntoma**: el propietario reporta que las filas del panel inferior tardan muchísimo en abrir el evento.

**Causa**: `prefetchEventUrl` y `navigateToEvent` construían la URL cada una por su cuenta, y se habían separado. `navigateToEvent` añade `sort` y `dir` cuando hay un orden activo; la precarga no. Reproducido lado a lado:

```
precarga:    /event/X?view=mapa&location=Dickens+Tavern
navegación:  /event/X?view=mapa&sort=fecha&dir=desc&location=Dickens+Tavern
```

El navegador indexa lo precargado por **URL exacta**, así que no había acierto y la ficha se cargaba en frío — la precarga estaba tirando una petición a la basura y encima daba la falsa sensación de estar cubierta.

**No era un caso raro**: el botón de ordenación deja `currentSortCol` en `'fecha'`, así que **desde el primer uso del botón toda la precarga del sitio quedaba inútil** — galería, lista y panel. Que se notara ahora encaja con que el botón es reciente y muy usado estos días.

**Arreglo**: `eventUrl(idMel, {search, location})` como única fábrica; las dos la llaman. Si hay que añadir otro parámetro, va ahí y las dos lo heredan.

**Verificación**: estructural, no por muestreo — hay **una sola** función que produce la cadena y no queda ninguna otra plantilla `/event/${…}` en el archivo (comprobado por grep), así que los dos caminos no pueden divergir. Es más fuerte que cualquier medición puntual.

**Lo que NO se pudo comprobar de extremo a extremo aquí**, y por qué: `pointerenter` no burbujea, así que un evento sintético no alcanza al manejador delegado de la tabla; los fotogramas están congelados, así que las filas quedan a medio FLIP; y sondear el estado a mano lo ensucia. Queda para el propietario confirmar la velocidad real en su teléfono.

---

### D-153 — La capa de datos, a un solo sitio (`src/lib/mel.ts`)

**Contexto**: auditoría de componentes a peticion del propietario (30 jul 2026).
No existía ninguna carpeta compartida, así que cada página que lee la hoja traía
su propia copia de lo mismo. El recuento real: el `SHEET_ID` y el parseo del
JSON-P **tres veces** (home, ficha, info); `extractDriveImage` **cuatro** (las dos
mitades de la home —frontmatter y script—, la ficha, y una cuarta escrita a mano
dentro de `info.astro`); el mapa de columnas `c[0]…c[25]` y el agrupado por
evento+fecha, **dos**; `parseDateToNumber`, `formatFechaDMY` y `getYear`, **dos**
cada una; el escapador de HTML, **dos** (`escHtml` / `escapeHtml`).

**Lo que ya había costado**, y es el argumento entero de esta decisión:

1. `event/[id].astro` decía `notesArchivo` donde las demás dicen `notasArchivo`.
   Un typo de copiar y pegar. Solo era inofensivo porque ese campo —y con él
   `existeOriginal`, `formato` y `ocr`— se leía de la hoja para tirarlo acto
   seguido al construir los grupos.
2. Los dos `getYear` **no eran iguales**: el del frontmatter llamaba a `.split()`
   directamente sobre el argumento (revienta si la hoja devuelve un número) y no
   reconocía un año suelto tipo `"2008"`. El del cliente sí. Nadie lo sabía.

**Decisión**: `src/lib/mel.ts` es la única fuente. Las tres páginas importan de
ahí.

**Lo que NO se unificó, y por qué**: la ficha renombra los campos a inglés
(`title`, `date`, `location`) y la home los deja en español (`evento`, `fecha`,
`lugar`). El módulo devuelve español y la ficha hace su propio mapeo en cuatro
líneas. Renombrar la mitad de `index.astro` habría sido un diff enorme por un
beneficio nulo: lo que importaba —fetch, parseo, columnas y agrupado— ya es
común.

**`formatFechaDMY` se copió LITERAL**, con la tentación de mejorarla resistida a
propósito: reordena sin normalizar los ceros, y de ahí sale que en pantalla
convivan "9/10/2004" y "5/01/2005". Un `parseInt` por pieza habría cambiado
fechas ya validadas por el propietario.

**Verificación**: `npm run build` verde; las seis rutas responden lo que deben
(incluido el 404 real en `/no-existe`); los recuentos de la home siguen dando
50/165/1/5; la tabla de Lista sigue empezando por "Trip With Us · 9/10/2004 ·
desconocido · S. Andrés del Rabanedo · Ravers 7.5 · Galo Franganillo"; el panel
del mapa sigue abriendo Sala Retrovisor con sus 8 eventos.

---

### D-154 — El lightbox llevaba tiempo muerto y la regla 3 mandaba mantenerlo

**Contexto**: `openLightbox()` era, desde alguna reescritura anterior, un alias de
tres líneas de `navigateToEvent()`. El overlay que le daba nombre no se abría
nunca: **nada** en las 5.000 líneas de `index.astro` le quitaba el `hidden`.

Seguía en pie, sin embargo: 55 líneas de marcado, siete variables de módulo con
sus siete `getElementById`, `updateLightboxCarousel()` (que no llamaba nadie),
`bindLightboxEvents()` —esta **sí** se ejecutaba en cada `astro:page-load`,
colgando listeners de close/prev/next sobre DOM permanentemente oculto— y un
`window.addEventListener('mel-open-lightbox')` que nadie despachaba.

**Lo grave no era el código muerto, era la documentación.** La regla 3 de
`AGENTS.md` decía: *"Si modificas el detalle de evento, actualiza
`event/[id].astro` **y** el overlay SPA en `index.astro`"*. Ese overlay ya no era
un espejo de nada — era el lightbox viejo, con una estructura que no se parece a
la ficha. Cualquier agente que siguiera la regla habría editado marcado muerto
convencido de estar sincronizando. La regla 7 citaba además `makeTagHtml()`, una
función que ya no existe (los tags del panel se hacen bien desde hace tiempo:
marcado SSR de `AdaptiveTagsRow` y JS que solo escribe los valores).

**Decisión**: fuera el subsistema entero. `openLightbox` pasa a `abrirFicha`,
porque el nombre viejo mandaba a buscar un modal inexistente. Reglas 3 y 7 de
`AGENTS.md` corregidas.

**Y fuera ocho componentes que no importaba nadie** (581 líneas): `Card`,
`EventCard`, `EventCardList`, `EventCarousel`, `EventHeader`, `EventInfoBox`,
`MapMarker`, `TagButton`. Dos merecen mención:

- `MapMarker.astro` implementaba el marcador con utilidades Tailwind mientras el
  mapa real lo pinta con clases CSS `.mel-marker-*`. Dos implementaciones del
  mismo nodo de Figma (261:10331), y la que parecía canónica era la que no se
  usaba.
- `EventCardList.astro` se anunciaba en su propio comentario como *"the structure
  below serves as reference"* de la réplica JS. No se renderizaba nunca, así que
  nada rompía al desviarse — **y ya se había desviado**: su divisor seguía en
  `left-[24px] right-[24px]` cuando el que se ve lleva
  `left-6 sm:left-12 lg:left-6`. Un componente que documenta un diseño que no
  se envía es peor que no tenerlo. Su marcado se absorbió en
  `buildEventCardList()`, que ahora devuelve el elemento COMPLETO y mata también
  las dos copias del `className` del contenedor que había en sus dos llamantes.

---

### D-155 — La tarjeta de galería seguirá duplicada, y hay un motivo técnico

**Contexto**: `FlyerCard.astro` (servidor, las 32 primeras) y
`buildGalleryCard()` (cliente, todo lo demás) son el mismo objeto escrito dos
veces, y se habían separado:

| | `FlyerCard.astro` | `buildGalleryCard()` |
|---|---|---|
| sombra en reposo | *ninguna* | `--mel-shadow-sm` |
| `onerror` de la `<img>` | fallback + volver a medir | **faltaba** |

Consecuencias medidas en navegador: la galería **cambiaba de aspecto** en cuanto
tocabas un filtro (o pasabas de la tarjeta 32), y sin `onerror` un cartel que
fallase no volvía a llamar a la medición, así que se quedaba `.unsized` para
siempre — `span 75` y 280px de hueco blanco en el masonry. Con el problema
conocido de Safari + Drive, no es hipotético.

**Por qué NO se unifica con un import**: el script de la home lleva
`define:vars`, lo que en Astro implica script **inline**, y un script inline no
pasa por Vite. Comprobado con una página de prueba: el `import` sobrevive
**literal** en el HTML servido, o sea que revienta en el navegador. Unificarlas
de verdad exige convertir ese script a módulo con los datos en una isla JSON, y
eso mueve la inicialización por `astro:page-load` y el singleton
`window._melState` — la maquinaria exacta de la regla 1, y de las que solo dan
la cara en un teléfono real. **Decisión aplazada al propietario.**

**Lo que sí se hizo**: las dos copias, idénticas y verificadas
(`getComputedStyle` devuelve la misma `box-shadow` en las dos rutas), cada una
apuntando a la otra por nombre. La sombra elegida es la del DS —
`design-system.md` asigna `--mel-shadow-sm` explícitamente a la *tarjeta de
galería*— y coincide con lo que el propietario ya daba por bueno.

**Y se retiraron cuatro atributos que no leía nadie**: `data-year`,
`data-category`, `data-title` y `data-location` estaban en `FlyerCard.astro` y no
los consultaba ni una regla CSS ni un selector. Por eso su ausencia en la réplica
JS nunca dio la cara. Con ellos se van tres props del componente.

**Bug latente encontrado de paso, y arreglado**: `adelantarVecino()` en la ficha
—la precarga de vecinos de D-090— llamaba a `extractDriveImage()` **dentro del
script de cliente**, donde esa función no existe (vive en el frontmatter, que
corre en el servidor). No reventaba por casualidad: `allEvents` tampoco llevaba
`carruselItems`, así que su guarda `if (foto)` nunca se cumplía. Es decir: la
mitad que precargaba **la foto** —según su propio comentario, *"lo único que se ve
tardar"*— no ha funcionado nunca. Ahora la URL se resuelve en el servidor
(`fotoUrl` en `allEvents`) y el cliente solo lee una cadena, sin necesitar copia
alguna de la función.

---

### D-156 — Los dos faldones de la ficha de evento

Reportado por el propietario desde su teléfono: "una especie de faldón que queda
por encima del texto". Eran **dos** cosas distintas, y la primera hipótesis
—que fuese el cajón de la foto— era la equivocada.

#### Faldón 1: el `pb-[40px]` estaba en el lado malo del recorte

El contenedor exterior de la ficha lleva `h-dvh overflow-hidden`, y los 40px de
respiro inferior estaban en **su** padding. O sea: 40px de fondo por DEBAJO del
área con scroll, donde no separan nada. Medido: la última línea acababa en 660
con el scroller acabando en 660. **Holgura cero.** Como el color es el mismo que
la página, se leía exactamente como una banda opaca tumbada sobre el texto.

**Arreglo**: los 40px pasan a `padding-bottom` del propio scroller
(`pb-[40px] lg:pb-0`). Ahora son contenido: la última línea siempre aterriza 40px
por encima del recorte y no puede cortarse. El hueco a pie de pantalla se ve
igual. A `lg+` siguen en el exterior (`lg:pb-[108px]`), donde no hay recorte.

**Regalo**: el área con scroll llega ya al borde de la pantalla.

#### Faldón 2: la decapitación queda SIN ARREGLAR, y es una decisión del propietario

El síntoma: con la foto fijada, la banda que ocupan cabecera + foto + faldón es
permanente, y lo que queda libre debajo es la única ventana de lectura. Al final
del scroll no hay recorrido para sacar nada de debajo. Medido a 700px de alto
visible (iPhone con la barra de Safari desplegada): ventana 204px, cola 246px,
**déficit 42**. Resultado: al final del scroll queda una línea a caballo del canto
opaco, cortada a media letra — el propietario lo vio como comas huérfanas
flotando sin su frase.

**Lo que NO lo arregla, y conviene saberlo antes de intentarlo**: padding abajo.
Al final del scroll el contenido está empujado lo más arriba que llega, así que
cada píxel de padding mete la cola un píxel MÁS debajo del cajón. Comprobado
sobre coordenadas, no supuesto.

**Se implementaron dos arreglos y el propietario los rechazó los dos:**

1. **Máscara que desvanecía los últimos 24px del cajón** para que la línea
   atrapada se apagara en vez de cortarse. Rechazado: *"no quiero degradados, no
   lo hay en ningún otro sitio de la web"*. El canto duro es coherencia del
   sistema, no un descuido.
2. **Suelo del recorte calculado** en vez de fijo en 200px, para que la cola
   cupiera. Rechazado: *"el mínimo de 200px está por respeto a los diseños. No
   quiero nada más pequeño de eso en la web"*. **200px (Figma 369:32751) es un
   suelo duro. No se baja.**

Los dos se revirtieron. Y una nota sobre el proceso, porque el error fue de
método: se propusieron sin señalar que uno introducía un patrón visual nuevo en
el sitio y el otro se desviaba de una cota de Figma. El propietario dio el
adelante sin esa información. **Un cambio que toca coherencia visual o una
especificación de Figma se presenta como decisión suya, no como detalle de
implementación.**

**Dato que sí quedó medido, por si se retoma**: la cola depende del evento, y
mucho — 246px en "Turrón del duro", **619px** en "FIV XIII" (4 imágenes y la lista
de artistas más larga del archivo). Con una cola de 619px no cabe con ninguna
foto: la cuenta pediría un recorte negativo. Cualquier intento futuro tiene que
partir de ahí, no de un número tomado de un solo evento.

**La vía que el propietario apunta**, sin encargarla: un ejercicio matemático con
base 8 para que el canto nunca caiga a media línea. Lo dijo con reservas
explícitas (*"no seré yo el que lo haga y no confío en que eso resulte como
pienso"*). No es trabajo pendiente: es una idea anotada.

**Verificado tras revertir**: build exit 0, máscara fuera (`maskImage: none`),
recorte de vuelta a 200px en el tope del scroll, y el faldón 1 intacto.

---

### D-157 — La caja de imagen mide lo que el cartel necesita

Diseño completo y razonado en
[el spec](superpowers/specs/2026-07-30-alto-caja-imagen-ficha-design.md). Aquí
solo lo que hay que saber para no romperlo.

**Qué cambia**: la caja de imagen de la ficha tenía 360px fijos en móvil. Ahora
sale de la proporción del cartel **más alto del evento**:

```
alto = clamp(200, ancho ÷ proporción, mín(360, alto real del cartel))
```

Medido a 393px: "Trip With Us" pasa de 360 a **200** (160px recuperados),
"Turrón del duro" a **239** (121px), y "FIV VI", con carteles verticales, se queda
en **360** como antes.

**Se usa la más alta del evento a propósito**: si la caja se ajustara a cada
imagen, pasar de una a otra daría un salto. Así las demás quedan con aire y la
caja no se mueve.

**Nunca se amplía un cartel.** `object-contain` por sí solo no basta: también
agranda para llenar la caja. El tope va en la caja de la propia imagen
(`max-width`/`max-height` con su tamaño real). Se aplica también en escritorio —
el propietario lo planteó como regla general del sitio, no de móvil.

**Los dos topes del CSS, y por qué el segundo no sobra**: `aspect-ratio` calcula
con el ancho de la CAJA, pero un cartel de menos resolución que la pantalla no se
estira, así que se pinta más bajo de lo que la proporción sugiere. Sin
`--mel-alto-cartel`, a 1023px de ancho Trip With Us dejaba la caja en 360 con la
imagen a 289: 71px de aire. Lo cazó la verificación, no el diseño.

**Sin JavaScript.** Funciona porque en móvil la caja va a sangre y su ancho es el
del viewport, así que `aspect-ratio` basta y se readapta sola al girar.

**El 360 ya no está escrito dos veces.** Era la clase `h-[360px]` y la constante
`IMAGE_MAX_H`, la trampa nº2 del traspaso. Ahora manda el CSS y `medirCabecera()`
lee el alto ya calculado. `IMAGE_MIN_H = 200` **no se toca**: es la cota de Figma
(369:32751) y el propietario la fijó como suelo duro (D-156).

**De dónde salen las medidas**: `scripts/medir-carteles.mjs` las saca de la
cabecera del fichero (SOF del JPEG, IHDR del PNG, bytes 6–9 del GIF) y las cachea
en `src/data/flyer_ratios.json`, commiteado. El SSR lo importa: **coste en
producción cero**. Es incremental — al añadir carteles, se vuelve a pasar.

**Si un cartel no está medido**, no se emite variable y manda el `h-[360px]` de
siempre. Verificado borrando entradas a mano: se comporta exactamente como antes.
Un cartel recién subido no puede empeorar nada.

**Trampa para el próximo**: `curl` recibe **0 bytes** de ese endpoint de Drive;
`fetch` de Node funciona. Si el script falla, mira ahí antes de dudar de la URL.

**Verificado**: los tres casos del spec con sus números exactos; anchos 393, 1023
y 1280; el encogido al desplazar en los tres (0px en apaisado, 39 en Turrón, 160
en FIV VI); y el fallback. **Sin verificar**: iOS Safari real (traspaso §4.1).

**Hallazgos del censo de las 84 imágenes**, todos en
[docs/imagenes.md](imagenes.md):

- **Drive conserva el formato del original.** 33 de 84 son PNG, y un PNG se sirve
  como PNG a cualquier tamaño: 113 KB contra 11 KB del mismo cartel en JPEG a
  tamaño de miniatura. Es la mayor palanca sobre el peso, con diferencia.
- **Hay un GIF de 15 MB** (`MEL-00074`), y Drive **ni siquiera lo redimensiona**:
  devuelve los mismos bytes pidas el ancho que pidas.
- **12 imágenes por debajo de 1200px** de lado mayor. Con el no-ampliar, no se ven
  mal: se ven pequeñas.
- La rotación por EXIF **no aplica**: Drive la hornea en los píxeles.

---

### D-158 — Auditoría de color y texto: los literales al token y el marcado al DS

Petición original del propietario al abrir la sesión. Lo que salió:

#### Color

**Todos los literales eran tokens escritos dos veces, y ya derivaban.** Los
acordeones de `info.astro` reimplementaban a mano el cambio claro/oscuro —cuatro
colores y tres reglas `.dark`— cuando `--mel-bg-secondary` y `--mel-bg-tertiary`
lo hacen solos; el de oscuro se había separado 9,9 del tinted-900 al que quería
parecerse. Pasan a token semántico y las tres reglas `.dark` desaparecen.

`IntroAnimation` tenía seis hexes: los tres CMYK y tinted-50, le-500, le-950.
Pasan a primitivos (ahí no hay semántico que valga: son tinta, no rol).
`ToggleSelector` llevaba `var(--mel-border, #D4C4C7)`, un respaldo que nunca se
usaba —el token siempre está definido— y que además duplicaba su valor.

**Regla que fija el propietario**: sin alpha en los colores. Solo `--mel-dim` y
las sombras la llevan.

#### El segundo sistema de nombres que no hacía nada

`Link.astro` pedía `var(--Text-Secondary, …)`, `var(--Action-Primary, …)` y
`var(--Text-Tertiary, …)`, nombres de Figma. `--Text-Tertiary` **no existía en
ningún sitio**, y las otras dos solo se definían en el `:root` del `<style>` de
`index.astro`, que no viaja a las demás páginas. **Las tres caían siempre al
respaldo.** Fuera, junto con `--Font-Size-Body-Roman` y
`--Line-Height-Body-Roman`, definidas y con cero usos.

#### Tipografía: el CSS era una copia incompleta del DS

32 declaraciones a pelo (`text-[Npx] leading-[Npx] tracking-[Npx]`) frente a ~29
usos de clases. Comparadas con el archivo de Figma, **ninguna estaba inventada**:
todas eran estilos del DS. Lo que fallaba era `global.css`, al que le faltaban
**H0, H1, H2 y H4** — de ahí que quien escribía marcado copiara los números en
vez de usar una clase que no existía.

**Quién manda sobre quién, que era la pregunta de fondo:**

- **Tamaños e interletrado → Figma.** Ahí se resolvió que Body es −1% y no −2%.
- **Interlineados de Lead (26), Body (28), Button (26) y Caption escritorio
  (14/18) → el CSS.** Se ajustaron después de dibujar el DS y no se llevaron a
  Figma. Lo confirma el historial: `a9ddb2b`, `3973da6`, `e74436c`, `abee25c`,
  `fb06600` y su revert `560677d`, `072792d`. **Figma es lo desactualizado.**

Casi caigo en tomar Figma por bueno y "corregir" cuatro clases que estaban bien.
Lo paró el propietario al recordarlo, y el historial de git lo confirmó.

**Decisión suya**: Lead, Body y Button comparten el interletrado de Body, −1%.

**Consecuencia que hay que saber**: migrar el marcado a las clases propaga esos
interlineados a 12 sitios que seguían con el 24 viejo — +2px en el menú lateral,
estados vacíos y toggle; +4px en los párrafos de `info.astro`. Verificado que no
rompe nada: las filas del menú siguen a 64px (alto fijo), el toggle a 48 y su
indicador cuadra.

**Qué queda a pelo, y por qué**: el título del header en reposo
(`HeaderTitle.astro:67`). Lleva peso **600**, que no existe en el DS, y encima
tiene decisiones abiertas documentadas en `insights.md` —el aplazamiento del
contraste y el ajuste del interletrado por el "efecto arroz glutinoso"—. Se toca
cuando se cierre eso, no antes.

**La etiqueta de la tarjeta de flyer** pasa a `typo-overline` entera, título y
fecha, por decisión del propietario. La fecha deja de ser Lora.

#### Contraste

Dos hallazgos, ninguno arreglado todavía:

1. Las celdas "sin dato" de la Lista llevan `text-tertiary` **y `opacity-60`**:
   contraste **1,82** en claro y 1,79 en oscuro, sobre un umbral AA de 3,0. No
   está cubierto por el aplazamiento del título de `insights.md` — son sitios
   distintos.
2. En oscuro, `action-primary` (le-400) como color de enlace da **3,24**: pasa
   como icono (3,0) pero falla como texto (4,5). El propietario lo revisa.

El resto pasa con holgura: 17,85 el texto primario, 14,33 sobre acción
secundaria.

#### Lo que hay que corregir EN FIGMA

- Lead, Body y Button: interlineado 24 → **26 / 28 / 26**
- Caption escritorio: 13/16 → **14/18**
- Lead y Button: interletrado −2 → **−1**

---

### D-159 — `typo-h3` deja de escalar, y el globo del mapa nunca existió

**El H3 no escala** (decisión del propietario, 30/07/2026). Figma lo tiene en
25/32 para escritorio, pero su único consumidor real es la fila del header
—título del sitio, "Menú", campo del buscador— y esa fila **no puede crecer**: si
lo hace, el título salta de tamaño al navegar entre páginas o al pulsar el
buscador, que es lo que prohíbe la regla 10. Se probó con el escalado puesto y
"Menú" salía visiblemente mayor que "Memoria Electrónica Leonesa"; lo cazó el
propietario mirando la pantalla.

La alternativa era dejar la fila con sus valores a pelo, fuera del sistema. Se
prefirió meterla dentro y quitarle el escalado a la clase. Cuando aparezca un H3
que sí deba escalar, se replantea.

**Excepción dentro de la excepción**: el título **en reposo** sigue a pelo. Su
peso es 600, que no existe en el DS, y `typo-h3` (700) **le gana** a un
`font-semibold` puesto al lado — la misma trampa que rompió el toggle.

#### El globo del mapa: 146 líneas de CSS para algo que no se abre nunca

Buscando alphas y blurs apareció `.gm-style .gm-style-iw-c` con su cristal
esmerilado (`rgba(246,244,245,0.92)` + `backdrop-filter: blur(12px)`), más un
sistema entero de `.mel-popup-*`. **El `InfoWindow` se crea, se guarda en el
estado y se cierra, pero nadie lo abre**: no hay un solo `.open()` ni
`.setContent()` en todo el archivo. Y `.mel-popup-card` solo aparece en su propia
definición — ese marcado no lo genera nadie.

Es el mismo patrón del lightbox (D-154): una funcionalidad sustituida —aquí por
el panel lateral— cuyo código se quedó decorando el vacío.

Fuera: 146 líneas de CSS (20 reglas) y las seis referencias al `InfoWindow`.

Los marcadores, que es lo que el propietario creía que era el globo, están
limpios: su único efecto es un `drop-shadow`, que es sombra y por tanto sí puede
llevar alpha.

**Queda anotado**: el propietario quiere afinar el diseño de los marcadores. No
es trabajo pendiente, es una idea suya sin encargar.

#### El título del panel del mapa acaba en H2 puro

Venía de D-... con una mezcla: H2 en móvil (28/32) y 25/32 en escritorio, que era
el H3 de escritorio de Figma. Al dejar de escalar el H3, ese 25/32 se quedó
huérfano. Se probó bajarlo a H3 (22/28) y el propietario lo prefirió más grande,
así que ahora es **`typo-h2` a secas**: 28/32 en móvil y 31/32 en escritorio, un
solo token en los dos anchos y sin valores sueltos.

De paso se retiró la variante `lg:typo-h3` que se había creado para el caso
anterior: sin usuarios.

## D-162 · Whisper — especificación cerrada (pendiente de implementar)

Componente de aviso efímero para comunicar el orden activo de Galería/Lista, reutilizable para otros mensajes (empezando por los eventos que el mapa no puede ubicar). Figma `1163:67466`. **IMPLEMENTADO** — ver la sección de verificación al final.

### Por qué existe

Sale del feedback de usuarios (ver [insights.md](insights.md)): nadie identifica el control de ordenación. **El whisper dice con palabras lo que el icono no puede** — la flecha hacia abajo que ordena ascendente necesitó un comentario defensivo en el código para que nadie la "corrigiera"; "Orden: de antiguo a reciente" no necesita nada.

### Aspecto

- Fondo `action-primary`, texto `text-on-action`, `backdrop-blur` 2px, misma sombra que el botón de ordenar.
- Relleno **16 horizontal / 8 vertical** (M / S). Ancho por contenido, **tope 344px**.
- Tipografía: **`typo-lead`** tal cual (Space Grotesk Medium 17/28). Coincide con el Figma salvo el espaciado entre letras, donde **manda el DS** (`-0.01em`): Figma solo admite píxeles y por eso allí figura `-0.34px`.
- **Máximo dos líneas**, truncado con elipsis a partir de ahí.
- Alto **mínimo** 48px (no máximo), y crece con el contenido: **48px con una línea y 72px con dos** (8 + 28 + 8 = 44, así que el mínimo manda; 8 + 56 + 8 = 72).
  Corregido respecto a la primera versión del componente, que llevaba 12 de relleno vertical: aquello daba 52px y el mínimo de 48 no llegaba a activarse nunca. Con 8 el número redondo sale solo.

### Comportamiento

- **Aparece**: la primera vez de CADA SESIÓN al entrar (contexto) y en cada reordenación.
- **Entrada y salida de 500ms, simétricas**, con curva suave y simétrica — NO la del reordenado, que es asimétrica y está pensada para viajes largos.
- **Dura 3s** en Galería/Lista. **5s** en el mapa.
- **Whisper y botón CONVIVEN.** La propuesta inicial los alternaba (el botón desaparecía mientras hablaba el whisper) y se descartó: quitaba la afordancia justo cuando el visitante acaba de demostrar que la busca, dejaba 9s de espera para ir de descendente a ascendente, y acoplaba la visibilidad del botón a un canal de mensajes que va a servir para otras cosas.
- **Pulsaciones seguidas**: cambia el texto y reinicia el reloj. No se apilan ni se encolan.
- **Posición**: centrado en pantalla; si no cabe, mínimo 16px al botón. Se asume alineación por abajo con el botón (que no se mueve) cuando el whisper crece a dos líneas.
- **Inmune al toque** (`pointer-events: none`): se superpone al contenido y no puede comerse pulsaciones sobre las tarjetas de debajo.
- **Solo por debajo de 440px**, donde vive el botón. Por encima ordena la tabla y basta con su animación y la flecha de la cabecera.
- **Accesibilidad**: anuncia SOLO el whisper; el botón se queda con su etiqueta y sin `aria-live`, o se solaparían. Respetar `prefers-reduced-motion`.

### Reglas del botón de ordenación que entran con esto

- **No se muestra con estado vacío.** Sin resultados no hay orden que anunciar, así que tampoco whisper.
- **El barajado no se ofrece con una búsqueda activa.** Si el visitante ya estaba en aleatorio cuando busca, **NO se le reordena por debajo**: conserva su orden y el botón le ofrece cronológico ascendente, que es lo que interesa en ese momento. Lo que no puede es volver a aleatorio mientras la búsqueda siga activa. Al limpiarla, el aleatorio vuelve al ciclo.

### Mensaje del mapa

`"N eventos no se muestran en el mapa"`. Hoy N = 3: son los que traen `"coordenadas":"Desconocido"` desde la hoja (D-159), y explican por qué el contador dice 50 y el mapa suma 47.

### Implementación y verificación (D-162)

`src/components/Whisper.astro` + la lógica en `index.astro`. Montado fuera de `#content-views`, por el mismo motivo que el botón: es `fixed`, así que colgarlo de una vista lo haría desaparecer al cambiar de pestaña.

**Colocación, que es la parte con cuenta.** El botón ocupa de `ancho−64` a `ancho−16`, así que el borde derecho del whisper no puede pasar de `ancho−80` y su izquierda no baja de 16. De ahí que su ancho máximo con botón sea `ancho−96`: con eso, aunque el texto llene el tope, los 16px de separación siguen saliendo. Luego se centra y se recorta contra ese límite — centrado si cabe, desplazado a la izquierda si no.

**Verificado en el navegador:**
- A 390px: alto **48** exactos (una línea, manda el `min-height`), separación al botón **16** exactos, ambos a 32 del borde inferior. El texto no cabe centrado, así que se desplaza — que es la regla.
- A 439px: se **centra** (izquierda 142 = centro exacto).
- Al pulsar: el whisper dice el orden RECIÉN elegido ("Orden aleatorio") mientras el botón ya muestra el siguiente. Son dos mensajes distintos a propósito.
- Con búsqueda activa el ciclo es `asc ⇄ desc` en cuatro pulsaciones seguidas, **sin pasar nunca por aleatorio**, y estando en aleatorio al buscar se ofrece ascendente sin reordenar por debajo.
- Con estado vacío, **sin botón y sin whisper**: el del orden se condiciona a que el botón esté visible, así que la regla sale sola.
- En el Mapa: **"3 eventos no se muestran en el mapa"**, el recuento real de los que traen coordenadas ilegibles, centrado del todo porque allí no hay botón que esquivar.

**Sin verificar aquí**: cómo se ve el fundido y si 3s se leen cómodos — los fotogramas están congelados en el entorno del agente. También quedó sin comprobar el `aria-live` con un lector real.

**Trampa del compilador, tercera vez en la misma sesión**: un comentario HTML **entre los atributos de una etiqueta** rompe el build con `[CompilerError] Unexpected token`, igual que dentro de una expresión `{…}`. Los comentarios van SIEMPRE antes de la etiqueta. Queda advertido dentro de `BotonOrden.astro`, que es donde volvió a pasar.

### Nota para la auditoría de estilos

**Las dos escalas de espaciado usan nombres distintos para los mismos números.** El Figma llama M a 16px y S a 8px; nuestro DS llama S a 16px y XS a 8px. Los píxeles coinciden, los nombres no: leer uno y escribir en el otro sin darse cuenta produce un error de una talla entera. Añadir esto a la auditoría de `roadmap.md`.

## D-163 · El whisper también entra en la capa de transición

**Síntoma**: el whisper se quedaba POR DETRÁS de las tarjetas hasta que estas se asentaban.

**Causa**: la regla 2 otra vez. Durante un reordenado las tarjetas llevan `view-transition-name`, así que el navegador las promociona a su capa superior, **que ignora el z-index de la página**. El whisper tenía `z-index: 119` en la página y eso allí no vale nada.

**Arreglo**: el mismo que ya funcionó con el botón de ordenación y con el panel del mapa — nombre propio (`mel-whisper`) y su grupo ordenado por encima (z-index 102, junto al botón). El propietario lo intuyó exactamente así: *"¿no se puede agrupar de alguna forma con el botón, que creo que ya no le pasa eso?"*.

**Y una duración propia**: la regla del reordenado aplica `--mel-orden-dur` a TODOS los grupos, así que el whisper habría heredado el segundo largo de las cartas en vez de sus 500ms. Se le devuelven los suyos con una regla específica sobre `group`, `old` y `new`. Su grupo no viaja —el whisper no se mueve de sitio—, así que lo que dura de verdad es el fundido entre el estado invisible y el visible.

**Verificado**: nombre aplicado, **40 elementos nombrados y 0 duplicados** (uno repetido aborta la transición entera, que era el riesgo real de añadir otro), y las dos reglas presentes en la hoja compilada con `z-index:102` y `.5s`. Ambas empiezan por `html` porque si no Astro las reescribe con su identificador de ámbito y no seleccionan nada (D-137).

**Sin verificar aquí**: que efectivamente se vea por delante. El entorno del agente tiene el documento oculto y Chrome aborta toda transición de vista en ese caso (`InvalidStateError`), así que la capa no se puede observar. Es el mismo nivel de comprobación que tuvo el arreglo del botón, que sí funcionó.

## D-164 · El botón de ordenación se repinta en cada render, no solo al cambiar de vista

Tres de los cuatro fallos que reportó el propietario tras probar el whisper eran **el mismo**: `pintarBotonOrden()` solo se llamaba al arrancar, al cambiar de vista y al pulsar el propio botón. Nunca al filtrar. Y de eso dependen dos cosas que SÍ cambian al filtrar:

- si hay estado vacío → el botón seguía visible sobre un "Sin resultados";
- si hay búsqueda activa → seguía enseñando el icono de barajar durante una búsqueda que ya no lo permitía.

**Lo que engañaba**: el comportamiento al pulsarlo era correcto —`siguienteOrden()` se evalúa en el momento del clic y sí respetaba la búsqueda—, así que el propietario lo describió exactamente bien: *"el botón se ha quedado con la opción random visible mientras buscaba, aunque le he dado y me ha ordenado crono"*. Mentía el icono, no la lógica.

**Arreglo**: `pintarBotonOrden()` al final de `performDOMUpdates`, que es el único sitio por el que pasan TODOS los renders.

**Y el whisper se retira con el estado vacío**: buscando deprisa, el de contexto podía seguir en pantalla sobre un "Sin resultados". Anunciar un orden ahí no dice nada.

**Verificado en caliente** (que era el caso que fallaba, no la carga limpia): buscando desde la página, el icono pasa de barajar a descendente con la búsqueda activa, y el botón desaparece al llegar el "Sin resultados".

## D-165 · El aviso del mapa, cada vez que se entra

Estaba limitado a una vez por sesión y eso no encaja con lo que cuenta: **el número depende de la búsqueda activa**, así que enseñarlo una sola vez lo dejaba viejo en cuanto el visitante filtrara. Ahora se recuenta y se enseña en cada entrada al Mapa.

**Decisión que queda abierta**: NO se reanuncia mientras ya se está en el Mapa y se cambia la búsqueda. Cada pulsación de tecla dispara un filtrado, así que hacerlo sería un cartel parpadeando mientras se escribe. El recuento refleja la búsqueda vigente en el momento de entrar, que es lo que pidió el propietario; si quiere además que se actualice sin salir del Mapa, hay que decidir antes cómo evitar el parpadeo.

## D-166 · El whisper sobre el mapa se coloca contra el mapa, y la búsqueda solo cuenta al confirmarse

### Colocación

Sobre el Mapa el whisper deja de referirse a la ventana: **24px por encima del borde inferior de `#map-container` y centrado en su caja**, no en la pantalla.

Lo bueno de leer la caja en vez de calcular: `#map-container` es `flex-1` y **encoge cuando se despliega el panel lateral**, así que el whisper se desplaza solo hacia la izquierda buscando el centro de la parte visible del mapa. No hay que saber cuánto mide el panel ni escuchar su apertura — el dato ya está en el rectángulo.

En Galería y Lista se mantiene lo de antes: contra la ventana, a 32px del borde inferior y esquivando el botón.

**Verificado**: a 1440px, centro del whisper 720 = centro del mapa 720, y 24px exactos al borde inferior. Comprobado aparte que la caja del mapa efectivamente encoge al abrir el panel (de 108–1332 a 108–940), que es de lo que depende el desplazamiento.

### Duración

3s en todas partes, mapa incluido. Los 5s del mapa se quedaban largos.

### La búsqueda solo cuenta cuando se confirma

El aviso del mapa se actualiza con la búsqueda, pero **solo al confirmarla**. La búsqueda de este sitio es en vivo: el evento `mel-search` sale en cada tecla, así que reaccionar a todas dejaría un cartel parpadeando mientras se escribe.

**Hacía falta un dato que no existía**: desde fuera, "está escribiendo" y "ha terminado" eran indistinguibles. `dispatchSearch` en `HeaderTitle.astro` gana un segundo argumento `confirmada`, que va a `true` solo desde `setState('filled', …)` — a ese estado se llega con Enter, limpiando o restaurando desde la URL, nunca escribiendo.

**Verificado**: con el mapa abierto, una búsqueda en vivo NO reaparece el aviso; la misma búsqueda confirmada sí, y con el recuento recalculado (3 sin filtrar → 2 con el filtro puesto).

## D-167 · `InfoBanner` — el estado del mapa sale del Whisper

Figma `1172:71515` (escritorio) / `1172:71496` (móvil). Propuesta del propietario, y corrige un error de encaje que era mío.

**Por qué**: "N eventos no se muestran en el mapa" **no es un suceso, es una propiedad del filtro activo**, igual que "Eventos 50". Meterlo en un canal efímero generaba preguntas sin buena respuesta —¿3 segundos o 5? ¿se reanuncia al buscar? ¿solo al confirmar?— y todas desaparecen al ponerlo donde le toca. El Whisper se queda con **un solo oficio**: el orden.

- Franja permanente sobre el mapa. `bg-secondary`, texto `action-primary` centrado con `typo-caption` (16/20 Medium, que coincide exacto con el Figma), relleno horizontal de 24.
- **48px de alto en móvil, 40 desde `lg`**.
- Vive en una COLUMNA junto al mapa, no como hermano de la fila: así mide exactamente lo que mide el mapa y **encoge con él al desplegarse el panel**, sin calcular nada. `#map-container` cambia `h-full` por `flex-1 min-h-0` — dentro de una columna, `h-full` sería el 100% de una altura que ya incluye la franja y el mapa se saldría por abajo justo lo que mide el banner.
- **A cero se oculta el TEXTO, no la caja** (decisión del propietario): si desapareciera entera, el mapa crecería y encogería mientras se escribe.
- **Sin `aria-live`**, a propósito: es un estado, no un anuncio. Marcado como región viva se repetiría en cada tecla.

**Verificado**: 40px de alto en escritorio, mismo ancho que el mapa y pegado encima; el recuento sigue la búsqueda EN VIVO (3 sin filtrar → 1 con "fiv", en singular → 0 con "quixotes"), y a cero la caja conserva sus 40px con el texto invisible.

### Código retirado

- `whisperMapa()` y su llamada desde `switchView`.
- La marca `confirmada` de `dispatchSearch` en `HeaderTitle.astro` y su consumidor. **Existía solo para que el aviso del mapa no parpadeara en cada tecla**; con el banner permanente ya no hace falta que nadie distinga escribir de confirmar. Se retira en vez de dejarla sin consumidor.

### Ancho del Whisper

Deja de topar en 344px: crece hasta **el margen real de la página** (24 en móvil, 48 y 108 después), leído del contenedor en vez de repetir los breakpoints. Donde hay botón, sigue reservando su ancho más 16 de separación.

### Pendiente

Si algún día el banner hace falta en Galería o Lista, hoy está montado dentro de la columna del mapa. Habrá que sacarlo a un sitio común y decidir qué hace con el hueco en vistas que no lo reservan.

## D-168 · El banner se superpone al mapa, y el mapa va a sangre

Correcciones del propietario sobre D-167, con una aclaración que cambia el montaje: *"como si quedase siempre por encima del mapa"* significaba **superpuesto**, no reservando hueco. De ahí que al vaciarse tenga que desaparecer y dejar ver el trozo que tapaba, en vez de dejar un rectángulo gris.

- **El banner pasa a capa** (`absolute` sobre el mapa). Al quedarse a cero, `display: none`: se va del todo y descubre el mapa. Y el mapa no crece ni encoge, porque siempre ocupó todo el alto.
- **El mapa va a sangre por los lados** en móvil y tablet: insets negativos que cancelan el padding de la página (24 / 48), igual que hace la lista de móvil. Desde `lg` vuelve a quedar dentro del contenedor de 1224, como en Figma.
- **24px del toggle al banner**, el mismo ritmo que el resto de la cabecera. Salía 56 y hubo que compensar 32 con `-top-2`. **OJO**: antes era `top-0` en móvil por D-067, que subía las TRES vistas 24px; esto desalinea el Mapa de Galería y Lista. Queda advertido en el marcado.

### La trampa de la cascada, y por qué la regla no aplicaba

`#info-banner[data-vacio="true"] { display: none }` estaba **en la hoja compilada y con selector correcto**, y aun así no se aplicaba: el elemento llevaba la utilidad `flex` de Tailwind, que vive en `@layer utilities`, y **esa capa se resuelve por encima de un `<style is:global>` de componente** — la especificidad no decide nada cuando compiten capas distintas.

Arreglado quitando `flex` de las clases y dejando que el `display` lo gobierne solo la hoja del componente. **Sin `!important`**, que aquí habría tapado el síntoma sin explicar nada.

Es la segunda vez en la sesión que una regla CSS correcta no hace nada por un motivo que no se ve en el código fuente (la primera fue el ámbito de Astro, D-137). La lección se amplía: **leer la hoja compilada no basta si hay capas de por medio; hay que mirar también qué gana la cascada.**

## D-169 · Ajustes finos de la franja y el whisper

- **Escritorio: las tres vistas 16px más cerca del toggle.** `lg:-mt-6` en `#content-views`, NO en cada vista: galería, mapa y lista tienen que arrancar a la misma altura, y desalinear una sola ya se probó y se notó al instante (D-168). Hueco al toggle: 56 → **40**.
- **Móvil: el banner se sale 8px por arriba de su caja** (`-top-2 lg:top-0`). Hueco al toggle: **24**. Es un APAÑO reconocido y así queda escrito en el componente: el sitio de esta franja acabará siendo la cabecera fija, y entonces esto sobra. Se hace en el banner y no en la vista precisamente para no volver a desalinear el Mapa.
- **Whisper a `typo-caption`** (16/20) en vez de `typo-lead`.

## D-170 · La barra de Safari no puede ser transparente (respuesta a una duda del propietario)

**No, y no es una limitación del sitio**: la barra de navegación es interfaz del navegador, dibujada fuera de la página. Ninguna web puede hacerla transparente ni pintar por debajo. Lo que sí hay:

1. **Igualar su color al de la página.** Safari 15+ tiñe la barra con `<meta name="theme-color">` o, en su defecto, con el color de fondo del borde de la página. No es transparencia, pero el efecto de continuidad es el que se busca. **Ojo**: hay que declarar dos, uno por esquema de color, o en modo oscuro quedará mal.
2. **`viewport-fit=cover` + `env(safe-area-inset-*)`** para que el contenido llegue de verdad hasta los bordes por debajo de las zonas seguras.
3. **Modo standalone** (manifest o `apple-mobile-web-app-capable`): ahí la barra desaparece del todo y con `black-translucent` la de estado se superpone al contenido. Es lo más parecido a lo que se pide, pero convierte el sitio en algo que se instala — decisión de producto, no de CSS.

Nada de esto se ha implementado. Queda como opción, siendo la 1 la barata y la 3 la que de verdad da el efecto.

## D-171 · El mapa llega al borde inferior en móvil

Le quedaban 26px de fondo debajo: el `pb-[3vh]` del contenedor de página, que la galería ya cancelaba con su `-mb-[3vh]` y el mapa no. Se cancela igual, con `bottom-[-3vh] lg:bottom-0`.

**Verificado**: móvil 393×852 → hueco inferior 0 y el mapa toca el borde, conservando el sangrado lateral. Escritorio 1440 sin cambios (27px abajo, dentro del contenedor 108→1332).

## D-172 · El banner no puede salirse por arriba: `#view-mapa` recorta

Se intentó darle `-top-2` en móvil para ganarle 8px al hueco con el toggle. **No funciona**: `#view-mapa` lleva `overflow-hidden` —lo necesita para el panel deslizante— así que todo lo que se salga de su caja se recorta, y el banner quedaba cortado por la cabecera. Revertido, y advertido en el propio componente para que nadie lo reintente.

El hueco de más se resolverá el día que esta franja pase a ser parte de la cabecera fija, que es donde le toca estar. Peleando con el recorte, no.

### Dos datos que salieron al revisar

- **`theme-color` NO está implementado.** Se creía que sí. No hay ni `theme-color`, ni manifest, ni metas de Apple en `Layout.astro` ni en `public/`. Lo que se ve en Safari es el navegador tiñendo su barra con el color de fondo de la página por su cuenta: funciona por defecto, no por diseño, y en modo oscuro no hay nada que lo gobierne.
- **Los ~27px bajo el mapa en escritorio son PROPORCIONALES**, no fijos: `pb-[3vh]`, un 3% del alto de la ventana. Criterio del propietario: si es proporcional, se queda.

## D-173 · Whisper: LE-50 fijo en vez del token que cambia con el modo (experimento del propietario)

**Contexto**: al revisar el contraste sobre `bg-mel-action-primary` en modo oscuro, un agente encontró que `Whisper.astro` usaba `text-mel-text-on-action` (el token que cambia de tono según el modo: `tinted-50` en claro, `tinted-900` en oscuro) y, asumiendo que era un descuido, lo cambió a `text-mel-text-on-action-primary` (LE-50, fijo en los dos modos — el que el design-system documenta para texto sobre `action-primary`).

**Corrección del propietario**: el token original NO era un error — es el que corresponde según la tabla de `design-system.md`. El cambio a LE-50 fijo es un **experimento suyo**, porque en la práctica `action-primary` en modo oscuro no está dando buen contraste con el token que le toca, y sospecha que puede ser sintoma del mismo problema que espera la auditoría de color pendiente (ver "Auditoría de estilos de color y texto en TODOS los componentes" en `roadmap.md`, 30-07-2026).

**Decisión**: se queda con LE-50 fijo en el Whisper *de momento*, porque funciona bien a la vista. No se ha tocado ningún otro sitio que use `text-mel-text-on-action` (IconButton, EmptyState, SideMenu, LikeButton, marcadores del mapa, tabla de Lista…) — este cambio es local al Whisper y no una nueva regla general.

**Pendiente**: cuando llegue la auditoría de color, revisar si el problema de fondo es el propio valor de `action-primary` en modo oscuro (quizás demasiado próximo en luminosidad al texto `tinted-900`) y decidir ahí si el Whisper vuelve al token original, se queda en LE-50 fijo, o si la corrección real va en la primitiva de color y no en qué token elige cada componente.

## D-174 · El panel avisa de «perfil que no es sRGB», no de «sin perfil de color»

**Contexto.** La regla `sin-perfil` marcaba los 34 carteles cuya cabecera no lleva
un bloque ICC, y prometía «Incrustar sRGB». Salió de una lectura de `imagenes.md`
que decía *«el peligro no es tener Adobe RGB, es no tener nada»* — cierto en su
matiz original (*un fichero sin perfil **cuyos colores no son sRGB*** se pinta
apagado), pero al pasar a código se perdió la condición.

**Lo que se midió el 02/08/2026**, byte a byte y pixel a pixel:

1. `sips -g profile` **miente**: contesta `sRGB IEC61966-2.1` incluso de un
   fichero sin ningún perfil dentro. Informa del perfil *supuesto*. Toda
   verificación de color hecha con esa orden no vale — hubo una, y era mía.
2. **`--matchTo` sí convierte los píxeles** (21% de píxeles cambiados, los
   saturados de 179,5·140,5·78,8 a 192,5·146,2·78,9, que es exactamente la
   transformación Adobe RGB → sRGB). Control negativo: 0 diferencias.
3. **Cualquier otra orden de `sips`** —`-Z`, `-s format jpeg`, recomprimir— le
   quita la etiqueta al fichero **sin convertir los píxeles**: el resultado sale
   13 puntos de 255 desaturado. Por eso `--matchTo` va **siempre** en la misma
   invocación, y no es una comodidad sino un requisito.
4. **Nada de esta máquina incrusta el perfil sRGB.** Ni `sips --embedProfile`
   (en cuatro combinaciones), ni ImageIO desde Swift (`CGImageDestination`,
   convirtiendo de verdad con `CGContext`). macOS lo omite a propósito: para el
   sistema, sin etiqueta ya significa sRGB.
5. **Drive conserva el perfil** en la miniatura que sirve el sitio: la de
   `MEL-00009` llega con su Adobe RGB dentro (rojo X = 0,6097). O sea que hoy no
   se ve nada mal — pero se ve bien por cortesía de Drive.

**El fallo que eso destapó.** `planificarArreglo` contaba «no lleva perfil» como
motivo de arreglo. Como el arreglo no puede poner la etiqueta, el panel proponía
recomprimir 34 carteles —perdiendo calidad— para dejarlos exactamente igual, y
después volvía a avisar de los mismos. Y de propina, todo cartel que el panel
arreglara por cualquier otro motivo entraba en esa lista para siempre.

**Decisión.** La regla pasa a ser `no-srgb`: avisa cuando el perfil incrustado
**no es sRGB**. Hoy son 12 (8 Adobe RGB, 2 Generic RGB, 2 el perfil de un
monitor). La ausencia de etiqueta deja de ser un defecto, porque no lo es.

**Cómo se decide si un perfil es sRGB:** por los primarios rojo y verde del
propio perfil (`rXYZ`/`gXYZ`), con tolerancia 0,004 — no por el nombre, que
varía. Medido en el archivo: sRGB está en 0,4361·0,3851 y el no-sRGB más cercano
(un perfil de monitor) en 0,4443·0,3794. Si el perfil no trae primarios (los de
gris llevan `kTRC`), no se avisa: dar por malo lo que no se sabe leer es gritar
en falso.

**Consecuencias.**

- `DatosImagen.perfil` (booleano, «lleva perfil») se sustituye por `noSrgb`. Hubo
  que remedir el archivo entero.
- **Los PNG no se miran**: todos disparan la regla `png` y se convierten con
  `--matchTo`, así que su color se arregla por ese camino. Mirarlos sería avisar
  dos veces del mismo cartel y obligaría a descomprimir el bloque `iCCP`.
- `no-srgb` **no comparte ni un cartel** con `png`, `cmyk` ni `enorme`. Va antes
  de `pesado` porque uno de los doce pasa de 2 MB y baja solo al convertirse.
- `imagenes.md` queda corregido: la norma es «convierte a sRGB», y que la
  etiqueta acabe puesta no está en nuestra mano.

**Lo que esto enseña.** La comprobación de una herramienta contra sí misma no
verifica nada. `sips` decía que el perfil estaba, y estuvo diciéndolo durante
horas de trabajo montado encima. Quien lo pilló fue un agente que fue a mirar los
bytes.

## D-175 · Un botón del panel hace SOLO lo que dice

**Contexto.** `planificarArreglo` calculaba el plan del **estado medido** del
fichero e ignoraba qué botón se había pulsado. La idea era buena —una sola
pasada de `sips`, porque cada recompresión de un JPEG pierde calidad— pero
llevaba a esto: `MEL-00083` es un PNG de 3509×4962 que sale en «Por encima de
3000 px» con el botón *Reducir a 2400 px*, y pulsarlo además lo convertía a JPEG
**y le aplanaba la transparencia**.

**El criterio del propietario (02/08/2026), literal:** *«Los botones no deben
hacer más de lo que dicen, si no, no estaríamos separando por incidencias y no
daríamos la opción de incluir otras acciones en el modal.»*

Y detrás hay una decisión de producto más grande: **no va a haber una
normalización general del archivo a una norma única**. Muchos PNG se quedan PNG
porque llevan transparencia, y eso no impide optimizarlos por tamaño o por color.

**Decisión.** `planificarArreglo(tecnico, acciones)` recibe las acciones que se
piden —la del botón, más las que se marquen en el modal— y el estado medido solo
decide si cada una tiene algo que hacer aquí. Consecuencias:

- **La salida solo se mueve hacia JPEG, y solo si se pide `png`.** Un PNG al que
  únicamente se le pide reducir sale reducido **y sigue siendo PNG**.
- Sin `-s format`, `sips` conserva el PNG **y su transparencia** — comprobado
  sobre `MEL-00008`: alfa intacto al reducir (2268→1200 px, 1112→495 KB) y al
  pasar el color. Ojo, la conversión de color **engorda** el PNG (1112→1294 KB).
- **La escalera de calidad solo baja si se pidió `pesado`.** Antes bajaba siempre
  que el resultado pasara de 2 MB, aunque solo se hubiera pedido convertir.
- **`pesado` sobre un PNG que sigue siendo PNG se rechaza**, con su motivo: un
  PNG no tiene calidad que bajar. Si viene acompañado de `enorme`, adelgaza
  reduciendo y no hace falta rechazar nada.
- La ruta acepta `{ acciones: [...] }` además de `{ accion }`.

**Lo único que se sigue haciendo sin pedirlo es `--matchTo`**, y no contradice
la regla: es lo que impide **romper** el fichero. `sips` a secas le quita la
etiqueta de color sin convertir los píxeles (D-174). Sobre algo que ya es sRGB
no cambia nada.

**Lo que esto enseña.** «Calcularlo del estado y no de lo que pidió el usuario»
suena a robustez y es lo contrario: convierte cada botón en una caja negra que
puede hacer algo que nadie autorizó. Si la interfaz separa por incidencias, el
motor tiene que separar por incidencias.

## D-176 · Del GIF se usa siempre el primer fotograma

**Decisión del propietario (02/08/2026):** de `MEL-00077` (177 fotogramas,
14,4 MB) se toma **el primer fotograma**, sin más criterio ni selección manual.

**Y el fotograma vive también en Drive**, junto al GIF, con un nombre o apellido
que deje claro lo que es. O sea: no se sustituye nada — el GIF entero se queda
como copia de preservación y el fotograma entra como **fichero nuevo**. Y **sí
entra en la hoja**, replicando las columnas de su fila padre salvo el orden del
carrusel, que va a 0 (ver D-182).

Eso cierra el qué, pero **estrena una capacidad que el motor no tiene**. Todo lo
que hace hoy el panel es sustituir contenido conservando el id (`PATCH
upload/…?uploadType=media`). Esto pide otras dos cosas:

1. **Crear** un fichero en Drive, no reemplazarlo.
2. **Escribir en la hoja** para que `urlDrive` apunte al fotograma, o el sitio
   seguiría sirviendo los 14,4 MB. Hasta ahora ninguna acción del panel toca ni
   una celda, que era parte de su contrato de seguridad.

Las dos están al alcance de la cuenta de servicio (comprobadas en
`scripts/probar-google.mjs`), pero son diseño, no un ajuste. Hasta entonces el
aviso sigue **sin botón**, y el texto de la regla lo dice.

## D-177 · La cuenta de servicio no puede borrar nada, y eso es la red de seguridad

Al intentar limpiar el fichero de prueba `PRUEBA-PANEL-borrar.png` salió un 403.
Medido contra la API de Drive: el dueño del fichero es el propietario
(`galo.franganillo@gmail.com`), no la cuenta de servicio, que tiene
`canEdit: true` pero `canDelete: false` y `canTrash: false`.

No es una limitación que haya que arreglar: **el panel no puede borrar nada del
archivo, ni por error ni a propósito.** Solo sobrescribe contenido conservando
el id, y por eso la hoja nunca se rompe.

Segunda red, también comprobada: **Drive guarda el historial de versiones**. El
fichero de prueba conserva las dos, el PNG original y el JPEG que escribió el
panel, así que un arreglo que salga mal se revierte desde el propio Drive.

El único efecto práctico: la limpieza de ficheros de prueba la tiene que hacer
el propietario a mano.

## D-178 · «Mostrar avisos ocultos» sube a la cabecera, y un aviso oculto deja de desaparecer

**Contexto.** El botón vivía dentro de cada sección. El propietario dio con la
contradicción jugando con el prototipo: para alojarlo había que **seguir pintando
la sección entera aunque no le quedara ni un aviso visible**. Una sección vacía
que solo existe para hospedar su propio botón.

**Decisión.** El botón pasa a la cabecera, junto a *Releer el spreadsheet*
(Figma 1229:101016: 320px cada uno, `px-32 py-16`, 24 de hueco). Al encenderlo
cambia **todo el panel**: reaparecen las secciones que solo tenían ocultos, y se
recalculan las cifras de las tarjetas y de cada sección.

**Lo que hubo que cambiar por debajo, que es lo de fondo.** `auditar()`
**descartaba** los avisos silenciados con `#acepta:` en la hoja. Así, un aviso
oculto no existía para el navegador: no había forma de enseñarlo sin volver a
pedirle la hoja al servidor. Ahora vienen igual, marcados con `item.oculto`, y
un grupo con todos sus avisos ocultos **sigue viniendo**.

Con eso, los dos tipos de "oculto" —el silenciado en la hoja y el que se oculta
en esta sesión— pasan a ser **el mismo estado**: `data-oculta` en la fila, que
puede poner el servidor o el cliente. Lo que se ve lo decide una regla CSS que
cruza ese atributo con el interruptor. Antes el de sesión era un `style.display`
en línea y el otro no llegaba a existir.

**Dos trampas que salieron al construirlo:**

1. **El botón no aparecía nunca.** Estaba condicionado en SSR a que hubiera
   `#acepta:` en la hoja, y hoy no hay ninguno — así que al ocultar filas en la
   sesión no había botón para recuperarlas. Ahora se pinta siempre, nace
   `hidden` y el cliente lo enseña con la cifra al día. Y con el interruptor
   encendido no se esconde aunque la cifra baje a 0: sería un modo sin salida.
2. **`section.hidden` ya tenía dueño.** El filtro por tarjeta (nivel 1 / nivel 2)
   lo usaba para enseñar solo las secciones del nivel activo. Al escribir ahí
   también "sección sin nada que enseñar", cada recálculo borraba el filtro —
   medido: las nueve secciones de nivel 2 nacían ocultas. Se separó en
   `data-vacia`, y los combina el CSS. **Un canal por concepto.**

## D-179 · «En CMYK» se funde dentro de «No está en sRGB»

Propuesta del propietario. El defecto es el mismo —el fichero no está en sRGB—,
lo arregla el mismo botón, y una sección con **un solo cartel** era ruido.
Quedan 13 (1 CMYK + 8 Adobe RGB + 2 Generic RGB + 2 de un monitor), sin ni un
solapamiento entre las dos reglas viejas (medido).

Ocupa el sitio que tenía `cmyk` en el orden de trabajo. Da igual cuál de los dos
sitios: no comparte ni un cartel con `png` ni con `enorme`, y lo único que
importa es que vaya por delante de `pesado`, porque uno de los trece pasa de
2 MB y baja solo al convertirse.

En el motor, `APLICA['no-srgb']` pasa a ser `t.comp === 4 || t.noSrgb`, y `cmyk`
desaparece de las acciones válidas de la ruta.

## D-180 · Un aviso oculto que se está enseñando es de solo lectura

Con el interruptor de la cabecera encendido, una fila oculta **se ve apagada
(45%), se va al final de la tabla, cambia su botón a «Mostrar aviso» y pierde el
resto de controles** — la acción y la casilla se desactivan. Criterio del
propietario: su aviso está aceptado, así que lo único que se le puede hacer es
devolverlo. Poder convertirla desde ahí sería procesar algo que se había dado
por bueno.

**El apagado y el orden van en las CELDAS, no en la fila**, y no es un capricho:
`.fila` es `display:contents`, no genera caja y por tanto no admite ni `opacity`
ni `order`. Como sus 8 celdas son hijas directas de la rejilla de `.tabla`,
basta con darles a todas `order:1`: se van detrás conservando entre ellas el
orden del documento, o sea el que haya dejado la ordenación por columna. Sin JS,
y sin pelearse con el reordenado de nodos que ya hace el cliente.

El botón de la cabecera, encendido, dice **«No mostrar avisos ocultos (N)»** y
pasa de `action-tertiary` a `action-secondary` — el estado activo es el más
oscuro, como el resto de pares del panel.

**Y se ve siempre, aunque no haya nada oculto**; en ese caso queda desactivado y
con su «(0)», que ya es una respuesta. Llegó a esconderse del todo por la regla
de "un control que no puede hacer nada es ruido", y fue peor: el propietario no
lo encontraba. La causa es que **ocultar un aviso todavía no se guarda en ningún
sitio** —eso lo trae la nota de la tarea 7B—, así que al recargar la cifra vuelve
siempre a cero. Un control que aparece y desaparece según un estado que no
sobrevive a una recarga se lee como un fallo, no como una comodidad.

## D-181 · Umbral de tamaño a 2400, y «peso» solo para lo que ya está bien

Dos cambios de comportamiento que llegaron con una ronda de textos del
propietario (02/08/2026), y que cambian bastante las cifras.

**1. El aviso de tamaño pasa de «más de 3000 px» a «más de 2400 px».** Se avisaba
a partir de 3000 y se reducía a 2400, así que los carteles de 2401–3000 px no
salían en ninguna parte pese a estar por encima de la norma. Un solo número
(`UMBRAL_LADO` en auditoria.ts, `UMBRAL_ENORME`/`LADO_OBJETIVO` en arreglar.ts) y
se acabó la franja muerta. **De 6 carteles a 16.**

**2. «Peso superior a 2 MB» solo admite lo que ya está bien de todo lo demás**:
JPEG, 2400 px o menos, y en sRGB. Palabras del propietario: *«para asegurarnos de
que no se comprime el peso antes de ajustar el resto de ajustes»*. Convertir,
reducir o pasar a sRGB ya adelgazan de por sí, y recomprimir antes pierde calidad
para nada. **De 25 carteles a 4** — los otros 21 (14 PNG, 6 grandes, 1 de color)
salen por su propia sección.

La exclusión del **PNG** no estaba en el enunciado, que solo hablaba de
resolución y espacio de color, pero se sigue del mismo criterio y además hacía
falta: un PNG no tiene calidad que bajar, así que el botón «Recomprimir» no
podría hacer nada con él (el motor lo rechaza desde D-175). Sin excluirlo, la
sección ofrecía 14 botones que siempre fallan.

**Animación al ocultar.** FLIP sobre las celdas —regla 2 del proyecto: dentro de
un contenedor se anima con `transform`, nunca con `view-transition-name`— y por
la misma razón que la opacidad y el `order` de D-180: `.fila` es
`display:contents`, no genera caja y no admite transform. Un solo mecanismo
sirve para los dos casos que pidió el propietario: con el interruptor apagado la
fila se funde y las de debajo suben; con él encendido, esa misma fila baja
deslizándose hasta el final de la tabla. Respeta `prefers-reduced-motion`.

## D-182 · `carruselOrder = 0` significa «está en el archivo, pero no es una pieza»

**Contexto.** El fotograma que se extraerá de un GIF (D-176) va a vivir en Drive
**y en la hoja**, replicando las columnas de su fila padre salvo el orden del
carrusel, que el propietario quiere a 0 «para no mostrarse». Preguntó si esa
lógica existía. **No existía**, y además el 0 no llegaba vivo:

| | |
|---|---|
| ¿Agrupa padre e hijo? | Sí, por `evento` + `fecha` en minúsculas. Es lo que hay que replicar |
| ¿`carruselOrder` oculta algo? | No. Solo ordenaba |
| ¿Qué hacía con un 0? | `parseInt(v,10) \|\| 1` lo convertía en **1** |
| ¿Hay algún 0 hoy? | Ninguno (medido: 51 unos, 18 doses, 9 treses, 6 cuatros, 1 cinco) |

**Decisión.** El 0 pasa a significar «existe, pero no es una pieza que enseñar».
Se descartaron las otras dos vías: respetar el 0 solo para ordenar dejaría el
fotograma y el GIF uno al lado del otro en la ficha —la misma pieza dos veces—, y
marcarlo en otra columna necesita **exactamente el mismo código** y encima
ensucia `Formato`, que es metadato real del archivo.

**Lo que se tocó, y lo que no.** `visiblesDelCarrusel()` en `mel.ts` y dos líneas
de la ficha. Nada más, y no por suerte: como el 0 **ordena primero**,
`carruselItems[0]` sigue siendo la portada en galería, lista, mapa y metadatos
sin cambiar ni una línea de esas páginas. Lo único nuevo es que el carrusel de la
ficha —y las medidas de su caja de imagen, que tienen que cuadrar con él— usan
`carruselVisibles`.

El respaldo no es paranoia: si un evento acabara con todas sus imágenes a 0 se
quedaría sin carrusel. En ese caso se enseñan igual. Un dato raro degrada a lo de
siempre, no a una ficha en blanco.

**Inerte hasta que haga falta**: hoy ningún evento cambia de carrusel (medido
sobre los 51 reales). El comportamiento solo se activa cuando exista la fila del
fotograma.

## D-183 · El rango del deslizador de tiempo sale de los datos, no de un literal

**Síntoma.** El propietario subió a mano un cartel nuevo (`MEL-00085`, «Jeff
Mills Medium Tour», 7/02/2003) y, al recargar, **se veía un parpadeo y después
no aparecía en ningún sitio**. Sin un solo error en consola.

**Causa raíz.** El archivo iba de 2004 a 2019 y ese rango estaba escrito a mano
en tres sitios: los `value` de los dos `<input type=range>` y los años de los dos
tiradores en `TimeSlider.astro`, y `minYear`/`maxYear` en el estado de
`index.astro`. El cartel es de **2003**, o sea fuera del rango de partida.
Resultado: **el servidor pintaba la tarjeta y el cliente la borraba** en cuanto
corría el primer `filterArchives()`. Eso es exactamente el parpadeo.

`calculateDynamicBounds()` sí calculaba los límites reales de los datos, pero
solo los aplicaba a `ABSOLUTE_MIN_YEAR`/`ABSOLUTE_MAX_YEAR` y a los atributos
`min`/`max` del deslizador — **nunca a los valores que filtran** ni a la posición
de los tiradores.

**Y estaba avisado.** El comentario de D-086 ronda 6, dentro del propio
`TimeSlider.astro`, decía de este literal: *«harmless while the data actually
spans exactly 2004-2019, but silently wrong the moment it doesn't, e.g. once
older/newer events get added»*. Aquel arreglo hizo dinámico el **pintado** del
deslizador y dejó vivos los valores de partida. La lección no es que faltara
diagnóstico: es que **un arreglo a medias de un dato duplicado deja la bomba
puesta**, y encima con el comentario que la describe al lado.

**Arreglo.** `rangoDeAnios()` en `mel.ts` —puro y con tests, incluidos los
centinelas «SIN FECHA» que no deben arrastrar el rango a dos milenios— calculado
en el SERVIDOR y pasado a `TimeSlider` como props y al cliente por `define:vars`
(regla 7: el script de index.astro es inline y no puede importar). Los tres
literales desaparecen; quedan solo como valor por defecto del componente suelto.

**Verificado** con el dato real: filtro 2003–2019, tiradores en 2003 y 2019, la
tarjeta la primera de la galería, y el evento de vuelta en Lista y en el mapa.

**Lo que esto enseña, y va más allá de este bug:** el archivo no es un rango
fijo. Cualquier cifra sacada de «cómo son los datos hoy» —años, formatos,
tamaños— es una bomba de relojería en cuanto entre material nuevo, que es
justamente lo que este proyecto espera que pase.

## D-184 · Las coordenadas viven en la hoja, no en el código. Y el chip de Sheets las escondía

**Contexto.** Un cartel nuevo (`MEL-00085`, Oh! León) no salía en el mapa. Al
investigarlo apareció que **31 de los 51 eventos se colocaban gracias a un
diccionario de 14 direcciones escrito a mano** en `index.astro`. No escala: cada
garito nuevo es un evento invisible.

**La causa real, que no era la que parecía.** El propietario **sí había pegado
las URLs largas de Google Maps** en la columna G. Sheets se las ofreció convertir
en *chip* —para no tener una URL fea en la tabla— y él aceptó, tras comprobar que
funcionaba. Y funcionaba… en Sheets.

El sitio lee la hoja por el endpoint **público** `gviz`, y ahí una celda con chip
llega así:

```json
{"v":"Calle Cervantes, 9"}
```

Solo el texto. La URL vive en `chipRuns[].chip.richLinkProperties.uri`, que
**solo devuelve la API autenticada**. Comprobado: la cadena `/maps/place/` no
aparece ni una vez en toda la respuesta pública. El diccionario había nacido para
tapar ese agujero sin que nadie supiera que el agujero era el chip.

**Lo que se descartó.** Leer la hoja con la cuenta de servicio haría que los
chips funcionasen y la tabla siguiera limpia, pero mete autenticación en **cada
visita** — y la velocidad de pintado del mapa es prioridad del propietario. Con
la URL en texto plano el coste es cero: misma petición, mismo endpoint.

**Lo que se hizo.** Se leyeron las 38 celdas con chip y URL larga por la API, y
se reescribieron con esa misma URL **como texto plano** (`valueInputOption: RAW`,
respaldo previo en `respaldo-columna-G.json`). No se inventó ni una coordenada:
son las URLs que el propietario ya había buscado. Las 44 celdas cuyo chip es un
enlace **corto** (`maps.app.goo.gl`) no se tocaron: el sitio no resuelve enlaces
cortos —exigiría una petición de red por visita— pero su texto son coordenadas en
grados y ya funcionaban.

**Resultado, medido sin diccionario:** 31 eventos por URL con pin preciso, 17 por
grados, 3 sin ubicar (los que ponen «Desconocido» de verdad). El mapa pasó de 16
marcadores a 17. Y el diccionario de direcciones **se borró**; queda solo el
respaldo por localidad, que es otro mecanismo.

**No se conserva "por si acaso"**, y es la lección: un respaldo que rescata en
silencio tuvo escondido durante meses que la mitad del mapa dependía del código.
Que falle a la vista.

**A partir de ahora**, al añadir un garito: pegar la URL larga en la columna G y
**no dejar que Sheets la convierta en chip** (`Cmd+Z` justo después deshace la
conversión, o pegar con `Cmd+Shift+V`). El chip es cómodo de mirar e invisible
para el sitio.

**Efecto visible:** la dirección del panel del mapa ahora incluye código postal y
ciudad («Calle Cervantes, 9» → «Calle Cervantes, 9, 24003 León»), porque es lo
que trae la URL.


## D-185 · Un objeto construido a mano no hereda los campos nuevos

La ficha de evento reventó **en producción, en todas las fichas**, con
`Cannot read properties of undefined (reading 'map')`, justo después de
desplegar `carruselVisibles` (D-182).

**Causa.** `event/[id].astro` no pasa el evento tal cual: lo re-mapea a un objeto
con una **lista explícita de campos** (`evento()`), porque la ficha los quiere en
inglés y la home en español. Un campo nuevo de `fetchEvents()` no llega solo:
hay que añadirlo ahí. `carruselVisibles` no se añadió, y los dos sitios que ya lo
consumían recibieron `undefined`.

**Por qué no se cazó.** El build no falla —es un acceso en tiempo de ejecución,
sin tipos que lo vigilen— y la verificación se quedó corta: tras el merge se
comprobaron la home, los tests y el build, pero **no se abrió ni una ficha**.
Un `curl` a una sola URL lo habría enseñado.

**La regla que sale de aquí:** cuando se toca la capa de datos, la verificación
tiene que recorrer **una página de cada tipo**, no solo la que se estaba mirando.
Ahora se comprueban las 51 fichas de una pasada:

```bash
node -e 'const {fetchEvents}=await import("./src/lib/mel.ts");
  console.log((await fetchEvents()).map(e=>e.idMel).join("\n"))' \
  | while read id; do curl -s -o /dev/null -w "%{http_code} $id\n" \
      "http://localhost:4321/event/$id"; done | grep -v ^200
```

Y ojo con ese id: la ruta busca por el `idMel` **del grupo**, no por el de cada
imagen del carrusel. Pedir `/event/<id de una imagen>` da 404 y no es un fallo.

---

## D-186 · Todo se guarda a calidad 95, y la escalera baja de cinco en cinco

**Fecha:** 2026-08-03 · **Estado:** vigente

Antes había dos calidades: 95 para lo que ya iba a recodificarse igualmente
(convertir un PNG, recomprimir por peso) y **la máxima** para el cambio de
espacio de color y el redimensionado, con el argumento de "no añadas pérdida a
algo que nadie pidió aligerar".

El argumento era correcto y el resultado era malo: a máxima calidad el JPEG
resultante pesa como el PNG de origen, o más — se veía en la propia carpeta de
simulación. Se pagaba el coste de recodificar sin ninguna de las ventajas.

**Decisión del propietario:** 95 en **todos** los arreglos, y cuando haya que
bajar, de **cinco en cinco** desde ahí (95 → 90 → 85 …).

Lo que NO cambia: la escalera solo corre en «peso superior a 2 MB». Es el único
arreglo que persigue una cifra concreta; bajar calidad en los demás sería
perseguir un objetivo que nadie fijó, y volvería a romper la regla de que un
botón hace lo que dice.

Medido sobre el archivo antes de decidirlo: subir de 85 a 95 engorda el fichero
un ~10% (MEL-00056, de PNG: 956 KB a 85, 1048 KB a 95, desde 3627 KB de origen),
y los tres JPEG que pasaban de 2 MB entran por debajo ya en la primera pasada
a 95. El 85 deja de ser la norma y pasa a ser un escalón.

---

## D-187 · «Ocultos», sin decir de qué. Y la marca en la hoja se llama igual

**Fecha:** 2026-08-03 · **Estado:** vigente

El panel tenía dos vocabularios para el mismo acto: la interfaz decía **ocultar
aviso** y la hoja escribía **`#acepta:`**. Se propuso unificarlos por el lado de
"aceptar" —dar por bueno un fichero que no va a cambiar— y **el propietario lo
rechazó, con razón**: por buenas que sean las razones, lo que se está haciendo es
meter un fallo debajo de la alfombra, y llamarlo "aceptar" lo blanquea. El fallo
sigue ahí; lo que se pide es que quede registrado **por qué** no se quiere volver
a ver.

Así que se unifica por el otro lado:

- La marca en `notasArchivo` pasa de `#acepta:<clave>` a **`#oculto:<clave>`**.
  Sin migración: no había ni una en la hoja (medido el 03/08/2026, 0 de 90).
- Cae la palabra **«aviso»** del vocabulario de ocultar. El botón de fila dice
  «Ocultar»/«Mostrar» y el interruptor «Ver ocultos (N)», sin decir ocultos de
  qué — que era justo lo que no terminaba de leerse.

Tres invariantes que el propietario fijó, y que **ya se cumplían** (ahora con
test que lo sujeta, en `test/auditoria.test.mjs`):

1. Ocultar en una sección no oculta ese cartel en las demás. La marca lleva la
   clave de la regla, y cada sección pinta su propia fila.
2. Un oculto **no** cuenta como procesado ni optimizado: esas dos cifras salen
   de `panel_historial.json`, que solo escribe la ruta de arreglos tras una
   pasada real. Ocultar no la toca.
3. Un oculto **no** desaparece del recuento total: `totalCarteles` son las
   claves de `flyer_tecnico.json`, todas, se oculte lo que se oculte.

---

## D-188 · Las notas se leen en el panel, no en la hoja

**Fecha:** 2026-08-03 · **Estado:** vigente

Al ocultar se escribe un motivo en `notasArchivo` (columna Y). Ese texto no
tenía dónde leerse: mandar a otra pestaña de Google Sheets a leer dos frases es
un viaje absurdo, y sin leerlas la nota se escribe para nadie.

**«Ver notas»** abre un globo con el texto íntegro, con el mismo formato que la
explicación de la sección. Sale **solo** si hay algo que leer y **ocupa el sitio**
del botón de acción: nunca conviven (criterio del propietario — llegaron a verse
tres botones en la misma celda, desbordando la columna).

Consecuencia asumida: un fichero con notas de archivo que además tenga arreglo
automático pierde su botón de arreglar de fila. Sigue arreglándose por casilla +
acción en bloque. Hoy no afecta a nadie (0 de 90 filas tienen notas).

**Tres cosas de implementación que costaron rato:**

- Se usa la **API nativa de `popover`**, que da cierre al pulsar fuera, cierre
  con Escape y —lo que aquí hace falta— la capa superior del navegador: la tabla
  vive en un contenedor con scroll horizontal y cualquier caja posicionada dentro
  de una celda saldría recortada.
- Se coloca en `beforetoggle`, y **ahí el globo aún mide cero**. Cualquier cuenta
  con su ancho o su alto sale mal (salía a la derecha del botón, no debajo). Se
  ancla por **bordes** (`right`/`bottom`), que no necesitan medirlo.
- `max-w-[calc(100vw-32px)]` de Tailwind compila a **`max-width: 0px`**: la
  sintaxis arbitraria pide guiones bajos donde el CSS lleva espacios. El globo
  salía de 66px. El ancho se define en el CSS del componente, no en clases.

---

## D-189 · El interruptor de «Ver ocultos» pinta desde `aria-checked`

**Fecha:** 2026-08-03 · **Estado:** vigente

«Mostrar avisos ocultos» era un botón sólido de 320px que competía en peso
visual con «Releer el spreadsheet». El propietario lo rediseñó como interruptor
(Figma 1249:58237): rótulo + carril de 80×32 con manija de 40×32.

Todo su estado visual cuelga del atributo **`aria-checked`**, que es el mismo que
lo anuncia a un lector de pantalla. Un solo sitio, y es imposible que el aspecto
y lo que se anuncia se contradigan.

Se intentó primero moviéndolo con `classList.toggle('translate-x-[40px]')` desde
el JS y **no funciona**: esa clase solo existía dentro de una cadena de
JavaScript, así que Tailwind nunca generó la regla — la clase se ponía en el
elemento y no pintaba nada. Es el mismo tipo de trampa que la regla 7 de
AGENTS.md, pero con clases en vez de marcado: **lo que solo vive en una cadena de
JS no existe para las herramientas que leen el código fuente.**

Las reglas viven en `global.css` y no en la página porque **`panel.astro` no
tiene bloque `<style>`** — los estilos del panel se mudaron ahí cuando el modal
necesitó compartirlos.

El rótulo ya no cambia de verbo («Mostrar…»/«No mostrar…»): un interruptor dice
qué gobierna, y lo que pasará al pulsarlo lo dice su propia posición.

**Colores por estado** (Figma 1250:106028, los tres del componente):

| | carril | manija | icono | rótulo |
|---|---|---|---|---|
| Apagado | `bg-secondary` | `action-tertiary` | equis | `text-primary` |
| Encendido | `bg-secondary` | `action-secondary` | check | `text-primary` |
| Desactivado | `bg-tertiary` | `text-tertiary` | equis | `text-tertiary` |

El estado desactivado tiene **colores propios**, no un `opacity` global: con
transparencia el granate de la manija seguía reconociéndose detrás del velo y
parecía encendido-pero-apagado. Los dos iconos van siempre en el marcado,
superpuestos en la misma celda de un grid, y se cruzan de opacidad — si se
pusiera y quitara el que toca, la manija cambiaría de contenido a mitad del
deslizamiento.

---

## D-190 · El modal enseña el cambio como «de dónde → a dónde», con el destino en verde

**Fecha:** 2026-08-03 · **Estado:** vigente

El resumen del cambio en el modal de confirmación era una lista de definiciones
—«Formato: PNG → JPG»— con todo en el mismo color. Pasa a ser la franja
«Fix table resume» de Figma (1238:102590):

- Filete arriba y abajo (`border`), contenido centrado.
- Cada cambio es `origen · flecha · destino`, con celdas de 100px de mínimo y
  64 de alto.
- **El origen va en `text-secondary` y el destino en `banner-success-text`**
  (verde). De un vistazo se ve qué se gana sin leer ninguna etiqueta.

Por eso la etiqueta ya **no se pinta**: «PNG → JPG» no necesita que le pongan
«Formato» delante. Sigue en el `<dt>` con `sr-only`, donde sí hace falta —un
lector de pantalla anuncia «PNG, flecha, JPG» y ahí la etiqueta es la
diferencia entre entenderlo y no.

Envuelve (`flex-wrap`) porque pueden entrar hasta tres cambios a la vez y en
una sola fila serían 768px dentro de una columna de 480.

**La caja de imagen pasa a 400px fijos** (Figma 1239:121505: `w-[400px]`,
`self-stretch`) con el cartel en `object-contain`. Antes la caja tomaba la
proporción real del cartel —calculada en JS— para que la imagen fuera a sangre;
con un ancho fijo eso sobra, las rayas rellenan lo que quede, y la columna deja
de cambiar de tamaño según el cartel que toque. Lleva `max-w-full` porque por
debajo de `lg` el modal se apila en vertical y 400 fijos se saldrían de una
pantalla estrecha.

---

## D-191 · Ocultar pregunta por qué, y lo escribe en la hoja

**Fecha:** 2026-08-03 · **Estado:** vigente

Ocultar dejaba de mostrar un aviso y no guardaba nada, así que a la siguiente
recarga volvía. Ahora pasa por `PanelNota.astro` y por la ruta
`/api/panel/ocultar`, que escribe `#oculto:<clave> <motivo>` en la columna Y.

- **AÑADE, nunca pisa.** La columna es de notas de archivo y puede traer prosa
  que no tiene nada que ver con el panel.
- **Relee la celda justo antes de escribirla**, en vez de fiarse de lo que el
  navegador cargó al abrir la página: entre una cosa y otra pueden pasar horas
  y el propietario edita esa hoja a mano con el panel abierto.
- **Si la escritura falla no se oculta nada**, y el modal se reabre con el
  motivo tecleado intacto. Ocultar sin haber escrito la marca sería mentir: el
  panel se reconstruye desde la hoja en cada visita, así que la fila volvería
  sola y el propietario creería haberla ocultado.
- **El motivo no es obligatorio.** Forzarlo lleva a teclear un punto para salir
  del paso, y eso es peor que no tener nota: una nota vacía se ve vacía, un
  punto parece una nota.
- **Mostrar no pregunta nada.** Devolver un aviso a la lista no esconde
  información, así que no hay nada que justificar.
- **En bloque se pregunta UNA vez** y el mismo motivo se escribe en la fila de
  cada uno. Veinte preguntas seguidas acabarían en veinte notas vacías.

Va en un `<dialog>` aparte y no como cuarto estado de `PanelModal`: aquel gira
entero alrededor de un encargo de arreglo (imagen, mejoras, progreso, resumen)
y meterle un formulario dentro habría sido un `if` grande cruzando las cuatro
fases. El formulario es `method="dialog"`, así que el propio navegador cierra y
deja en `returnValue` el botón pulsado — y Escape hace lo mismo que «Cerrar sin
ocultar», gratis.

---

## D-192 · Con varios carteles, cada uno enseña SUS cambios

**Fecha:** 2026-08-03 · **Estado:** vigente

El modal de confirmación en lote resumía con un agregado: «3 espacios distintos
→ sRGB». Decía a cuántos afecta pero no a cuáles, que es justo lo que hay que
poder mirar antes de tocar 33 ficheros. Ahora la franja de arriba es **solo para
un cartel** —y entonces sus cambios van uno encima de otro, con filete entre
ellos— y en lote cada fila de la lista lleva los suyos dentro.

Las columnas se reservan por ACCIÓN PEDIDA, no por cartel: si un cartel no
necesita una de ellas se le deja el hueco vacío. Sin eso, un cartel con un solo
cambio corría su columna al sitio donde el de al lado tenía otra cosa y la lista
no se podía leer en vertical. El hueco solo se reserva si algún cartel del lote
usa esa columna.

Las filas envuelven (`flex-wrap`): tres pares más el identificador no caben en
la columna del modal, y sin envolver el último par se **recortaba por el borde**
en vez de bajar de línea.

**El peso sigue fuera de la confirmación** y dentro del resumen. No es un
olvido: no se puede saber sin procesar el fichero (D-181), así que prometerlo
sería inventárselo. En el resumen ya está medido — y va en ROJO si subió.

---

## D-193 · Las notas del panel tienen su propia columna, y es la última

**Fecha:** 2026-08-03 · **Estado:** vigente

Las marcas `#oculto:` se escribían en **Y (Notas de archivo)**, que es prosa de
catalogación del propietario. Mezclar las dos cosas obligaba a que la plomería
del panel conviviera con texto que no tiene nada que ver, y a enseñar la marca
al leer la nota.

Se crea **AA — «Notas desde el panel»**, y va **al final de la hoja a propósito**:
el mapa de columnas de `mel.ts` es por índice (`c[n]`), así que una columna nueva
en medio habría corrido todas las de detrás y roto la web entera.

Formato: **una línea por regla oculta** del mismo cartel.

```
#oculto:png Es un vector con transparencia.
#oculto:enorme Hace falta poder ampliar el detalle.
```

`componerNota()` **sustituye** la línea de esa regla si ya existía, en vez de
añadir otra: es lo que hace que «Editar» funcione y evita que ocultar dos veces
deje dos motivos contradictorios uno debajo del otro. Las líneas de las demás
reglas se respetan siempre. Con el motivo a `null` la borra, que es «Borrar».

`notaDeLaRegla()` (en `auditoria.ts`) devuelve **solo la línea de esa regla y sin
la marca**: el globo de una sección enseña lo suyo, no las notas de las otras
reglas del mismo cartel, y la marca es plomería, no texto para leer.

**Borrar la nota des-oculta.** Si no queda escrito por qué se esconde, no hay
motivo para seguir escondiéndolo.

El código no depende del RÓTULO de la columna, solo de su posición (`c[26]`):
el propietario la renombró de «Notas de ocultación» a «Notas desde el panel» sin
tocar nada. Lo único que hubo que cambiar fue el texto del modal, que la nombra
para que sepas dónde ir a leerla.

**Trampa que costó un rato, y que se repite:** el globo lleva `[popover]`, y el
navegador lo esconde con `display: none` mientras está cerrado. Una clase suelta
de Tailwind (`flex`) EN EL PROPIO ELEMENTO le gana a esa regla, así que los ~100
globos de la tabla salían pintados a la vez nada más cargar el panel, apilados
unos sobre otros, y su equis no cerraba nada — porque ninguno estaba «abierto»:
solo eran cajas visibles. El `display` de un popover se declara en CSS con
`:popover-open`, nunca como utilidad en el marcado.

---

## D-194 · El panel mide lo que le falte al arrancar

**Fecha:** 2026-08-03 · **Estado:** vigente

`flyer_tecnico.json` se rellenaba solo con `scripts/medir-archivo.mjs`, a mano.
Un cartel recién subido llegaba al panel sin medir y caía en «Sin medir». Como
aviso era correcto; como comportamiento era pereza: el panel PUEDE averiguarlo.

Ahora, **solo en desarrollo** y **solo los que faltan**, el panel los mide al
cargar y guarda el resultado en el mismo fichero que escribe el script. Medido
el 03/08/2026 sobre el caso real: 11 carteles nuevos, **4,3 s** la primera carga
y **~280 ms** las siguientes. Medir los 101 costaría ~125 MB y sí sería
inaceptable en cada visita; medir los que faltan, no.

Un fallo al medir uno no tumba la página: ese cartel se queda en «Sin medir»,
que es exactamente lo que la sección está para decir. La lógica de descarga vive
en `medirDeDrive()` (`src/lib/imagen.ts`), compartida con el script.

`formatoPorId` se calcula DESPUÉS de medir, o los recién medidos salían con «—»
hasta la siguiente recarga.

---

## D-195 · El historial es una sección, no dos tarjetas

**Fecha:** 2026-08-03 · **Estado:** vigente

Las dos tarjetas verdes de la cabecera de Control son un **marcador**: resumen
en dos cifras lo que el panel lleva hecho. No son el historial. El historial es
`/panel/historial`, pestaña propia junto a Preparación, y es donde consta **qué
pasó con cada cartel**: cuándo, qué acción, y el antes/después de formato, color
y peso.

Por qué importa que exista y no baste con las cifras: es el único sitio donde
queda escrito que un cartel pasó por `sips` y con qué resultado. Si dentro de un
año uno se ve peor de lo que se recordaba, esto es lo que contesta.

Se agrupa **por día**, una tabla por jornada, con el mismo armazón que las
secciones de Control: caja con borde y sombra, cabecera en `bg-secondary` con
franja de 8px —aquí VERDE, que en este panel es lo ya resuelto— y el total
ahorrado de la jornada a la derecha. Un registro se lee en jornadas: «el día que
pasé los PNG» es una unidad que significa algo; una lista continua de 200 líneas,
no.

No lleva tarjetas de resumen arriba. Las dos verdes ya están en Control y son el
marcador; repetirlas aquí era decir dos veces lo mismo, y una tercera de
«Pasadas» no significaba nada para nadie.

Detalles que se decidieron mirando la tabla con datos:

- **Lo último primero.** De un registro interesa qué pasó hace un rato.
- **Una raya donde no hubo cambio.** Decir «jpeg → jpeg» es ruido.
- **El peso siempre, y en rojo si subió.** Pasar a sRGB puede engordar el
  fichero; esconderlo sería maquillar el dato.
- **«sRGB IEC61966-2.1 → sRGB» no se enseña.** `sips` le quita la etiqueta al
  fichero y macOS no la vuelve a poner, pero un fichero sin etiqueta se lee como
  sRGB en todos los navegadores: anunciar ese «cambio» sería anunciar uno que no
  existe.
- Solo entran las pasadas **reales**. Las simulaciones no tocan nada.

**Sin datos falsos.** Se llegó a generar un `panel_historial.json` de mentira
para que se viera poblado y el propietario lo rechazó, con razón: un marcador
que miente sobre el trabajo hecho no sirve para nada. Hasta la primera pasada
real, la sección dice que no hay nada — que es la verdad.

---

## D-196 · El servidor de desarrollo no debe vigilar lo que el panel escribe

**Fecha:** 2026-08-03 · **Estado:** vigente

Tras arreglar un cartel, el modal de resumen **se cerraba solo**, sin que nadie
lo tocara. No lo cerraba nadie: la página se recargaba entera.

La ruta de arreglos escribe dos ficheros al terminar —`flyer_tecnico.json` (la
medida nueva) y `panel_historial.json` (el apunte)— y los dos viven en `src/`,
que es lo que vigila Vite. Cada pasada real disparaba una recarga en caliente
justo en el momento de enseñar el resultado. La medición automática al arrancar
(D-194) escribe el mismo fichero, así que también recargaba.

Se excluyen los dos del vigilante en `astro.config.mjs`. Son datos, no código:
no hay nada que recompilar cuando cambian.

**La lección, que se repite:** un fichero que el propio programa escribe no debe
estar donde el compilador busca cambios. Si algún día el panel escribe alguno
más, va a la misma lista.

---

## D-197 · Fuera la simulación

**Fecha:** 2026-08-03 · **Estado:** vigente

«Simular sin tocar nada» existía para poder mirar el antes y el después en
`simulacion/` antes de dejar que el panel tocara el archivo. Cumplió su función
—sirvió para decidir la calidad 95, para ver que un PNG puede engordar al pasar
a JPG y para validar el motor entero sin arriesgar nada— y el propietario la
retira una vez comprobada la primera pasada real.

Se van con ella: el botón, el de «Abrir en el Finder», la carpeta `simulacion/`
y su entrada en `.gitignore`, y del motor el modo `simular`, `limpiar` y
`abrirCarpeta` (con ellos, la única llamada a `open` que quedaba en el
proyecto). El camino que queda es uno solo, que es más fácil de sostener que
dos que hacen casi lo mismo.

Lo que NO se va: Drive guarda la versión anterior de cada fichero durante 30
días, que es la red de seguridad de verdad.

---

## D-198 · Un PNG sí se puede adelgazar sin sacarlo de PNG: `pngquant`

**Fecha:** 2026-08-04 · **Estado:** vigente

«Peso superior a 2 MB» excluía los PNG con un argumento que era cierto: un PNG
no tiene calidad que bajar, así que `sips` no podía hacer nada y el botón habría
mentido. La consecuencia, en cambio, no era aceptable — desde que se decidió
conservar los PNG con transparencia, esos ficheros quedaban en un **punto ciego**:
6 de los 13 del archivo pesaban más de 2 MB y el panel no lo decía en ninguna
parte. El propietario lo detectó usándolo.

`pngquant` sí puede: reduce la imagen a una paleta de 256 colores **conservando
la transparencia** (la guarda en el trozo `tRNS` en vez de en un canal).

**Medido sobre los 13 PNG del archivo, 04/08/2026:**

| perfil | resultado | |
|---|---|---|
| `--quality=80-98` (elegido) | 24 MB → **10 MB** | −56% |
| `--quality=60-85` | 24 MB → 6 MB | −72% |

El rango es un suelo de calidad en la escala propia de `pngquant` (0–100, cuánto
se parece la paleta al original), **no un porcentaje del peso**. Si un cartel no
se puede reducir sin bajar del suelo, la herramienta no escribe nada y el fichero
se queda como estaba. Ninguno de los 13 abortó.

Sin escalera, a diferencia del JPEG: una pasada, y si con eso no entra en 2 MB,
no entra. Los 6 pesados quedan todos holgadamente por debajo.

**`pngquant` NO es una dependencia del proyecto.** No está en `package.json`, no
viaja a Vercel, no toca la web: es una herramienta del ordenador, la misma
categoría que `sips`. La diferencia es que `sips` viene con macOS y esta no, así
que si falta, `comprimirPng` devuelve el fichero sin tocar y el resumen enseña
que no adelgazó — nunca un cartel estropeado.

**Dos cosas que aparecieron al hacerlo:**

- `leerCabecera` daba `alfa: false` en un PNG de paleta, porque solo miraba el
  tipo de color (4 y 6). Un tipo 3 con `tRNS` también tiene transparencia — y es
  exactamente lo que produce `pngquant`, así que cada cartel comprimido habría
  figurado como si hubiera perdido el alfa que acabábamos de conservar.
- El plan rechazaba «pasar a sRGB» sobre un PNG que seguía siendo PNG, y eso sí
  se puede: `--matchTo` funciona igual con salida PNG. Lo destapó un test.

Comprobado también que **reducir la resolución con `sips` conserva el alfa**: un
PNG RGBA sigue siendo RGBA después de `--resampleHeightWidthMax`.

---

## D-199 · El panel lee su caché del disco, no por `import`

**Fecha:** 2026-08-04 · **Estado:** vigente

Tras arreglar veinte carteles, seguían apareciendo en su sección aunque el disco
y el historial dijeran que ya estaban hechos. Cadena de dos eslabones, y el
segundo lo puse yo el día anterior:

1. La ruta de arreglos reescribe `flyer_tecnico.json` tras cada pasada.
2. Ese fichero está fuera del vigilante de Vite para que no dispare una recarga
   en caliente a mitad de faena (D-196).

Con `import`, Vite se queda con la copia que leyó al arrancar y —al estar fuera
del vigilante— ya no la refresca nunca. `panel.astro` pasa a leerla con
`readFileSync` en cada petición: cien entradas, coste nulo, y siempre dice la
verdad. La ficha de evento sigue con `import`, y hace bien: en producción ese
fichero se hornea en el build y no lo reescribe nadie.

**La lección:** arreglar un síntoma tocando el andamiaje (el vigilante) en vez de
la causa (cómo se lee el dato) mueve el problema de sitio. La causa era el
`import`.

---

## D-200 · Los GIF pesados se cuentan, pero no se tocan

**Fecha:** 2026-08-04 · **Estado:** vigente

Al admitir los PNG en «Peso superior» quedó a la vista un GIF de más de 2 MB con
un botón «Comprimir» que el motor iba a rechazar — los GIF no tienen arreglo
automático, convertirlos destruiría la animación.

Se resuelve como pidió el propietario: **modo lectura**. La fila aparece —el
chivato tiene que contarla, callarla sería mentir sobre la calidad del archivo—
pero en lugar del botón pone «Solo a mano», su casilla está bloqueada y un banner
dice cuántos hay: «Hay N archivos GIF que superan el peso ideal y solo pueden ser
comprimidos manualmente».

La regla general que sale de aquí, y que se implementa en el cliente en vez de
como un caso particular del GIF: **una fila sin botón de acción tampoco se puede
seleccionar**. Sin eso entraba en la acción en bloque —incluido «seleccionar
todos»— y el motor la rechazaba una por una, llenando el resumen de fallos que
no eran fallos.

---

## D-201 · Sin fecha válida, el cartel no se publica

**Fecha:** 2026-08-04 · **Estado:** vigente

Regla nueva **«Sin fecha válida»**, nivel 1. No basta con que la celda esté
rellena: tiene que ser `DD/MM/AAAA`. Medido el 04/08/2026 sobre lo que hace la
web con cada caso:

| valor | orden | se pinta | año para el filtro |
|---|---|---|---|
| `12/07/2013` | correcto | 12/07/2013 | 2013 |
| `SIN FECHA` | 0 | «SIN FECHA» | **ninguno** |
| vacía | 0 | vacío | **ninguno** |
| `12-07-2013` | **negativo** | 2013/07/12 | **año 12** |

(Lo de los guiones no es un fallo de `getYear`: interpreta `2013-07-12` como ISO,
que es correcto. Solo se tuerce si alguien escribe el día delante.)

Un cartel sin año **desaparecía en cuanto se tocaba el deslizador**, así que
estaba a medias: se veía en la galería, se perdía al filtrar, y nadie sabía por
qué. **Estar a medias es peor que no estar**, así que `fetchEvents` deja de
publicarlo (criterio del propietario, 04/08/2026) y el panel lo avisa como error
de nivel 1, que es donde hay que ir a arreglarlo.

Es la primera de las cuatro de «Falta información»: la que más daño hace sin que
se note. En el archivo hoy: 1 de 101 (MEL-00095, con el texto «SIN FECHA»).

---

## D-202 · Seleccionar arrastrando, y quién puede seleccionarse

**Fecha:** 2026-08-04 · **Estado:** vigente

Con 24 filas, marcar de una en una son 24 clics. Se pulsa sobre una casilla y,
sin soltar, se pasa por encima de las demás: todas toman el MISMO estado que la
primera, así que el gesto sirve igual para marcar que para desmarcar. Solo
dentro de la misma sección — un arrastre que cruzara de una a otra marcaría
cosas fuera de la pantalla.

**Dos bugs de selección, uno de ellos recién introducido:**

- «Una fila sin botón de acción no se puede seleccionar» (D-200) bloqueó TODAS
  las de «Baja resolución», que no tiene acción automática ninguna — y ahí las
  casillas sí sirven, para «Ocultar seleccionados». La condición correcta es:
  la sección ofrece acción en bloque Y esta fila no puede usarla.
- El check de cabecera contaba las filas bloqueadas, así que con 9 marcadas de
  10 casillas se quedaba en indeterminado para siempre. Y un indeterminado más
  un clic resuelve a MARCAR, por especificación: no había forma de vaciar la
  selección en «Peso superior». Ahora solo cuenta las seleccionables.

---

## D-203 · Densidad de píxeles: el panel hace bien en ignorarla

**Fecha:** 2026-08-04 · **Estado:** vigente

Pregunta del propietario: si un cartel de 500×500 está guardado a 300 ppp, ¿el
panel lo enseña como 500×500?

Sí, y es lo correcto. El panel lee las dimensiones del propio encabezado del
fichero (IHDR en PNG, SOF en JPEG), que es el **número de píxeles reales**. La
densidad (`pHYs` en PNG, la cabecera JFIF en JPEG) describe a qué tamaño físico
se pensó imprimir, y **el navegador la ignora por completo** al pintar un
`<img>`: 500 píxeles son 500 píxeles de CSS, se declaren 72 o 300 ppp.

Medido en el archivo el 04/08/2026: los ficheros SÍ declaran densidad —200 y 300
ppp, según el que toque— y hay un caso que ilustra el riesgo de fiarse de ella:
**MEL-00031 declara 300 ppp y mide 560×560 píxeles**. Impreso serían 1,9
pulgadas; en la web son 560 píxeles y por eso está —con razón— en «Baja
resolución».

Dicho de otra forma: la densidad es información de imprenta. Para la web, el
único dato es el recuento de píxeles, que es justo el que se usa.

---

## D-204 · «Convertir a JPG» no se ofrece de propina

**Fecha:** 2026-08-04 · **Estado:** vigente

La sección «Archivo PNG» **se queda como estaba**: salta con todo PNG y es donde
se convierten, con su botón diciendo exactamente lo que va a pasar y su banner
avisando de que JPEG no admite transparencias.

Lo que se retira es el ofrecimiento **desde «Peso superior», y solo desde ahí**:
al comprimir un PNG, «Otras mejoras recomendadas» ya no propone convertirlo. Es
la sección donde el PNG entra precisamente porque se puede adelgazar sin sacarlo
de su formato (pngquant, D-200), así que ofrecer justo ahí lo que destruiría su
transparencia contradice el motivo por el que está en esa lista — y en un lote se
aceptaría de corrido para veinte carteles a la vez.

Desde las demás secciones se sigue ofreciendo con normalidad: son otro contexto y
el propietario no pidió tocarlas. En el panel de hoy ese caso no llega a darse
—las únicas dos secciones automáticas son «Archivo PNG» y «Peso superior»— pero
la condición está escrita por sección, no en general, para cuando vuelva a
haber PNG en «Resolución mayor de 2400 px» o en el cambio de color.

Comprobado además, y con test, que **comprimir o reducir un PNG nunca lo convierte
a JPG**: la salida solo se mueve a JPEG si se pide `png` explícitamente.

**Lo que NO había que hacer, y hice DOS veces:** primero podé la regla para que
solo avisara de los PNG sin canal alfa, y con eso la sección entera desapareció
del panel —los 13 del archivo tienen transparencia—. Y al revertir aquello,
quité el ofrecimiento en TODAS las secciones cuando lo pedido era en una. Las dos
veces el error es el mismo: ampliar el encargo por mi cuenta a lo que me parecía
la conclusión lógica.

El razonamiento no era malo (los 13 estaban ocultos con la misma nota, y un aviso
que siempre se oculta por lo mismo suele estar mal planteado) pero era una
propuesta que tocaba haber hecho, no ejecutado.

---

## D-205 · El desglose de las tarjetas cede el sitio, y el panel recuerda por dónde ibas

**Fecha:** 2026-08-04 · **Estado:** vigente

Dos arreglos de la misma idea: que la cabecera del panel diga lo que hay que
hacer ahora, no lo que había al abrirlo.

**El desglose salta las secciones a cero.** Cada tarjeta enseña tres líneas, y
hasta ahora eran las tres primeras por gravedad pasara lo que pasara: al dejar
«Archivo PNG» a cero, la tarjeta gastaba una de sus tres líneas en anunciar un
cero mientras «GIF animado» quedaba escondido en «Otras incidencias». Ahora se
enseñan **las tres primeras que tengan avisos** — el orden entre ellas no cambia
nunca, solo se saltan las vacías — y la línea de sobrante desaparece cuando su
suma es cero.

El relevo se anima: **todas** las líneas se pintan en SSR (regla 7, el marcado no
se fabrica en el navegador) y las que no tocan van plegadas a alto cero. El
cliente solo mueve `data-oculta`, y el CSS anima el alto. Alto fijo de 24px
(22 a partir de 768px) en vez de medido, que es lo que sí hace falta en las
secciones plegables: aquí dentro solo hay una línea de `typo-caption`. La
separación entre líneas vive DENTRO de cada una (`padding-bottom`) y no como
`gap` del contenedor, porque una línea plegada tiene que llevarse su hueco con
ella.

**Y la memoria de posición, que se probó y se retiró.** Se llegó a guardar
`scrollY` en `sessionStorage` y a restaurarlo al volver; en el navegador de
agente funcionaba (bajar a 1400, ir a Historial, volver, aterrizar en 1400) y
en el uso real del propietario no, así que se ha quitado entera — código
incluido. Lo que se recuerda al volver de Historial son **las secciones
abiertas**, y nada más.

Se deja apuntado por qué no se insiste: la posición exacta depende de que la
página mida lo mismo al volver, y no mide lo mismo —las secciones se reabren
después de pintar, el panel se remide, una sección puede haber desaparecido
porque su aviso se arregló—. Restaurar un número de píxeles sobre una página
que ha cambiado de alto deja al usuario en un sitio que no es el que dejó, que
es peor que dejarlo arriba.

**Nota de entorno:** ni las transiciones CSS ni los eventos `scroll` se
despachan en una pestaña oculta (`visibilityState: 'hidden'`), que es como
corre el navegador del agente. Las animaciones se quedan congeladas en
`currentTime: 0` y `window.scrollTo()` cambia `scrollY` sin disparar el evento.
Para comprobar cualquiera de las dos cosas desde un agente hay que forzarlas
(`document.getAnimations().forEach(a => a.finish())`, `dispatchEvent(new
Event('scroll'))`); leer alturas sin eso da números a medio camino que parecen
un fallo del CSS y no lo son.

---

## D-206 · Cuatro ajustes de la cabecera del panel

**Fecha:** 2026-08-04 · **Estado:** vigente

**El porcentaje de las tarjetas se recalculaba… nunca.** Salía del servidor y se
quedaba clavado: al encender «Ver ocultos» la cifra pasaba de 28 a 39 y el
paréntesis seguía diciendo 28%. Ahora se rehace junto a la cifra en
`recalcularTodo()`. El total viaja al cliente en `data-total` del contenedor de
la página, porque este script no lleva `define:vars` y no tiene otra forma de
saberlo (regla 7).

Que con 100 carteles en la hoja cifra y porcentaje coincidieran —28 avisos,
28%— era casualidad de la división, no un error de cuenta: el denominador
(carteles medidos) siempre fue el correcto.

**Los dos modales miden igual.** Uno tenía 1000px y otro 1100, y el de acciones
además cambiaba de tamaño al pasar de confirmar a resumen: un diálogo que se
encoge bajo el cursor mueve los botones de sitio entre un clic y el siguiente.
Clase `.modal-caja` en `global.css`: 1100 de ancho y suelo de alto de
`min(480px, 100dvh - 48px)` (se probó con 800 y el propietario lo bajó a 480:
con contenidos cortos sobraba caja). Los botones van con `mt-auto`, pegados
abajo, para que no floten a media altura cuando el contenido no llega al suelo
ni cambien de sitio entre un estado y el siguiente. El `min()` no es adorno —
con un valor fijo, en una pantalla más baja que ese suelo el modal saldría de la
ventana con los botones fuera.
Va en CSS y no en utilidades por el historial de fallos silenciosos de
`calc()` dentro de clases arbitrarias (D-190).

**Una sección que reaparece ya no da el salto.** Al encender «Ver ocultos», una
sección con todos sus avisos ocultos volvía de golpe y empujaba media pantalla.
Ahora entra y sale animando el alto (`plegarSeccion`), con un margen negativo
que cancela el `gap-6` del contenedor mientras dura: sin él la animación
arrancaba con un salto de 24px, que era justo lo que se quería quitar.

Lleva **temporizador de remate** además del `transitionend`, y no por
precaución: si la transición no llega a arrancar, ese evento no se dispara
nunca y la sección se queda clavada a alto 0 con `overflow:hidden` —invisible,
sin manera de recuperarla salvo recargando—. Pasó en la primera versión.

**La cabecera se queda fija.** `position: sticky` en el `<header>`, que ahora
contiene SOLO el título y el menú; la introducción salió fuera como hermana. El
primer intento dejó la fila pegajosa dentro del `<header>` completo y se
despegaba a los ~350px de scroll: un elemento `sticky` solo pega dentro de su
bloque contenedor, así que su padre tiene que ser el contenedor que dura toda la
página. En las dos pantallas del panel, Control e Historial.

Y el fondo se estira hasta los bordes con márgenes negativos que devuelven el
mismo valor como padding (`-mx-6 px-6 … lg:-mx-[108px] lg:px-[108px]`). Sin eso
el fondo acababa donde acaba el padding de la página y por los lados asomaban
las sombras de las tarjetas y las franjas de color de las secciones al pasar por
debajo — un par de píxeles, pero se veían.

El **filete inferior no** se estira: se quedó cruzando la pantalla de lado a
lado y no venía a cuento. Va en un hijo del `<header>`, con el ancho del
contenido como el resto de reglas de la página; el fondo a sangre y la línea
alineada con todo lo demás.

---

## D-207 · Dos fichas con el mismo cartel, y el denominador que lo tapaba

**Fecha:** 2026-08-04 · **Estado:** vigente

El propietario contó **101 filas** en la hoja y el panel decía 100. La sospecha
era una referencia MEL repetida. No lo era: las 101 filas tienen código MEL y
los 101 son distintos.

Lo que hay es **una imagen repetida**: `MEL-00096` y `MEL-00097` apuntan al
mismo archivo de Google Drive. Y como la caché técnica
(`flyer_tecnico.json`) va indexada **por ID de Drive** —una imagen, una
medición—, dos fichas que comparten archivo ocupan una sola entrada. De ahí el
100.

**Dos consecuencias, dos arreglos:**

1. **El denominador de las tarjetas pasa a ser las fichas de la hoja**
   (`filas.length`), no las entradas de la caché. Los numeradores cuentan
   fichas; el denominador tenía que contar lo mismo. Que el porcentaje
   coincidiera con la cifra —28 avisos, 28%— era casualidad de tener casi
   exactamente 100 carteles, y tapaba el desfase.

2. **Sección nueva «Imagen duplicada»**, en «Falta información». Es de nivel 1
   y no de rendimiento porque lo que falla es el DATO: una de las dos fichas
   está enseñando el cartel de la otra, y el panel no puede saber cuál. Sin
   acción automática a propósito — arreglarlo es decidir qué referencia está
   mal y buscar el archivo que falta, y eso no lo hace una máquina.

Es la primera regla que necesita mirar TODAS las filas antes de juzgar una: una
fila sola no puede saber que está repetida. `auditar()` calcula los IDs de Drive
que salen más de una vez y se los pasa a las pruebas en un tercer argumento
(`ctx`). Las demás reglas lo ignoran.

El nombre que pidió el propietario era «Referencia duplicada»; se cambió a
«Imagen duplicada» al ver el dato, porque la referencia es justo lo único que no
está duplicado. `LIMPIO` sigue listando «ID duplicado» entre las comprobaciones
que salen limpias, y sigue siendo verdad.

---

## D-208 · «Desconocido» es un hueco, y la imagen no manda en el modal

**Fecha:** 2026-08-04 · **Estado:** vigente

**Dos comprobaciones nuevas: «Sin promotores» y «Sin diseñador».** El panel
presumía abajo de haber mirado «Sin diseñador» y salir limpio, y era falso: 17
carteles llevan «Desconocido» en esa columna, y 4 en «Organiza». `estaVacio()`
ya trataba esa palabra como celda vacía —igual que en Artistas—, así que lo
único que faltaba era la regla. «Sin diseñador» sale de la lista `LIMPIO`, donde
no le tocaba estar.

Van detrás de «Sin artistas» por el mismo criterio que ordena todo el nivel 1:
lo que ROMPE va antes que lo que FALTA, y las tres son lagunas de catalogación
que no impiden que el cartel se vea.

**La imagen ya no decide el alto del modal.** Un `<img>` en flujo con `h-full`
dentro de una caja de alto automático se cae a su alto INTRÍNSECO —400px de
ancho por lo que mida de largo— y estiraba el modal hasta el tope de la ventana
por el simple hecho de que el cartel fuera grande. Ahora la imagen va en
`position: absolute` dentro de su caja: fuera del flujo no aporta alto, la caja
se estira con la columna de texto y el cartel se ajusta dentro con
`object-contain`. Manda el contenido, que es lo que pidió el propietario.

**Los estados de «Releer».** Al pasar por encima solo gana sombra; pulsado —y
mientras relee— pasa a `action-tertiary` sin sombra. El icono **no** se mueve en
hover: se probó girándolo y sobraba. Gira solo mientras la página se relee de
verdad (`data-releyendo` + `@keyframes mel-girar`), que es cuando hay algo que
contar. No es una animación recuperada: nunca estuvo en el código —el SVG ha
sido estático desde la primera versión, comprobado en el historial—, se añade
ahora.

Los tres estados viven juntos en `#panel-releer` (global.css) y el botón ya no
lleva `bg-` en el marcado: repartir el color entre una utilidad y dos reglas
obliga a mirar en dos sitios para saber de qué color está el botón.

**Y el giro no se veía**, porque `location.reload()` a secas apaga la animación
en el acto: el navegador deja de pintar un documento que se está yendo y lo
único que quedaba era la página atenuada. Ahora el botón pide antes la página
nueva por `fetch` y recarga cuando llega. La parte lenta —leer la hoja entera y
medir lo que haya nuevo— ocurre con la página VIVA y el icono girando; cuando la
respuesta está, el servidor ya tiene el trabajo hecho y la recarga es casi
instantánea. El HTML de esa petición se tira: lo que interesa es lo que deja
hecho, no la respuesta.

---

## D-209 · Los porcentajes no llevan decimales, y por eso a veces no se mueven

**Fecha:** 2026-08-04 · **Estado:** vigente

22 avisos sobre 101 carteles es 21,78 %, que redondeado es 22 %. De ahí que la
cifra y el porcentaje se parezcan tanto y que arreglar el denominador (100 →
101, D-207) no moviera ningún porcentaje visible: el redondeo se come la
diferencia.

**Se queda así, sin decimales** (criterio del propietario). Un «21,8 %» en una
tarjeta de un panel de control no ayuda a decidir nada y ensucia una cifra que
se lee de un vistazo. Queda escrito para que dentro de un año nadie lo tome por
un error de cálculo: no lo es.

---

## D-210 · El cursor, la ayuda que sobra y las filas que no se pueden tocar

**Fecha:** 2026-08-04 · **Estado:** vigente

**El cursor dice qué se puede pulsar.** En TODO el sitio, no solo en el panel:
Tailwind 4 dejó de poner `cursor: pointer` a los `<button>` en su *preflight*
—al revés que la v3—, así que el ratón se quedaba en flecha sobre vistas,
filtros, tarjetas del mapa y todos los controles del panel. Una regla en
`global.css` para `button:not(:disabled)`, `[role=button]`, `summary` y
`label[for]`, más `not-allowed` en los deshabilitados. Comprobado: en la home
los cinco botones visibles pasan a `pointer`.

**La ayuda de «Comprimir» no habla de PNG cuando ya no va a haber PNG.** Al
convertir un cartel a JPG, el texto de la mejora «Comprimir» seguía explicando
la reducción de paleta del PNG, que para cuando le tocara el turno ya no existe.
El trozo va ahora en un `<span class="solo-png">` dentro de la propia
descripción de la regla, y el modal lo esconde cuando la acción es «Convertir a
JPG». La frase está escrita para que al quitarlo siga cerrando: «…empezando con
una compresión al 95 de calidad para JPG.»

**Las filas con las que no se puede hacer nada van al final.** Hoy son los GIF
de «Peso superior» —se cuentan y se avisan, pero no tienen botón ni sirve
seleccionarlos—, y en medio de la tabla partían la columna de botones en dos.
Ahora se ordenan al final en SSR (`sinAccion()` en PanelSeccion, con `sort`
estable para no tocar el orden de la regla dentro de cada bloque) y siguen al
final al ordenar por cualquier columna, porque el comparador del cliente los usa
como clave primaria. Sin esto, ordenar «Peso superior» por peso ponía primero un
GIF de 15 MB con un «Solo a mano» donde va el botón.

La condición se pregunta por lo que importa —ni botón propio ni casilla útil—,
no por el formato: cualquier caso nuevo que cumpla eso cae al final solo.

---

## D-211 · El aviso del peso imprevisible, donde se lee

**Fecha:** 2026-08-04 · **Estado:** vigente

El modal de confirmación anuncia lo que va a cambiar —formato, color,
dimensiones— y **nunca el peso**, porque hace falta procesar el fichero para
saberlo (D-193). Eso estaba escrito, pero solo en el «por qué» de la mejora
«Bajar a calidad 95»… que se esconde precisamente cuando la acción ES comprimir:
ahí la calidad no es una opción que se pueda desmarcar, es el encargo. Al
esconder la fila se escondía el aviso, y el propietario lo echó de menos justo
donde más falta hace.

Ahora sale un banner ámbar bajo el texto de «esta acción no se puede deshacer»:

> No es posible calcular de antemano el peso final del archivo: se sabrá al
> terminar la compresión.

**Ámbar y no negrita dentro del párrafo** porque es como el panel avisa ya de
las pegas de una acción —el de los GIF en «Peso superior», el de las
transparencias en «Archivo PNG»—; el mismo aviso merece la misma forma, y una
negrita suelta habría inventado un segundo idioma para lo mismo. Detrás del
texto, no delante: primero lo que va a pasar, después el matiz.

Aparece exactamente cuando la fila de calidad NO está, así que el aviso está
siempre en el modal: o desplegable en esa fila, o a la vista en el banner.
Comprobado los tres casos — comprimir desde «Peso superior» (banner),
convertir un PNG que además pesa (banner), y convertir un PNG que no pesa (fila
de calidad con su «por qué»).

---

## D-212 · Mostrar un aviso oculto: la hoja primero, la pantalla después

**Fecha:** 2026-08-04 · **Estado:** vigente

Con el servidor de desarrollo caído, pulsar «Mostrar aviso» soltaba este aviso
del navegador:

> El aviso ha vuelto a la lista, pero no se pudo borrar su nota de la hoja:
> Failed to fetch

El `Failed to fetch` era el servidor apagado, sí. El fallo es lo que decía la
frase: **el aviso NO había vuelto a ningún sitio que durase**. `mostrarYBorrarNota()`
cambiaba la pantalla primero —sacaba la fila de los ocultos, vaciaba el globo y
le quitaba `data-notas`— y escribía en la hoja después, sin deshacer nada si la
escritura fallaba. Resultado: la marca `#oculto:` seguía escrita, así que a la
primera recarga el aviso se escondía solo otra vez con su nota puesta, y
mientras tanto el globo se había quedado vacío en pantalla. De ahí lo de «copio
la nota y me aparece una cosa y luego otra».

Ahora escribe primero y solo toca la pantalla si la hoja confirma. Si falla, no
cambia nada y lo dice tal cual: «No se pudo borrar la nota de la hoja, así que
el aviso sigue oculto». Es exactamente el criterio que ya seguía su gemela
`guardarNota()` —escribir y solo entonces ocultar— y por el mismo motivo: **el
panel se reconstruye desde la hoja en cada visita, así que el único estado que
dura es el de la celda.** Cualquier ruta que las desincronice acaba mintiendo.

De paso, el botón se desactiva mientras dura la escritura: son unos cientos de
milisegundos en los que antes no pasaba nada y parecía que el clic se había
perdido.

**Comprobado en el navegador las dos ramas**, interceptando `fetch`: con la
escritura fallando la fila sigue oculta, conserva su nota y el botón vuelve a
estar activo; con respuesta correcta la fila sale de los ocultos, el globo se
vacía y el botón vuelve a decir «Ocultar». No hay test automático porque este
código vive en el script en línea de `panel.astro`, que no se puede importar
desde `node --test` (regla 7).

---

## D-213 · El banner cuenta lo que se ve, y dos estados de hover

**Fecha:** 2026-08-04 · **Estado:** vigente

**El banner de los GIF sigue al interruptor.** Ocultar el único GIF de «Peso
superior» dejaba el aviso ámbar en su sitio anunciando un archivo que ya no
estaba en la lista. Ahora `recalcularTodo()` cuenta los GIF VISIBLES de la
sección y esconde el banner cuando no queda ninguno; vuelve al encender «Ver
ocultos». Mismo criterio que el resto de cifras del panel: lo que se enseña
cuenta, lo oculto no.

Las dos redacciones —«Hay 1 archivo GIF que supera…» y «Hay N archivos GIF que
superan…»— se pintan las dos en SSR y el cliente enseña la que toque, en vez de
construir la frase en JavaScript. Es la regla 7 aplicada al texto: una frase
escrita en dos ficheros son dos frases, y acaban diciendo cosas distintas.

Comprobado el ciclo entero: GIF oculto → sin banner; mostrarlo → banner;
ocultarlo → sin banner; «Ver ocultos» ON → banner; OFF → sin banner.

**Hover de las tarjetas de resumen:** solo sombra, y exactamente la misma que
lleva la tarjeta activa (`--mel-shadow-button`). Son la misma pieza en dos
momentos; dos sombras distintas para lo mismo se notan al pasar de una a la
otra. La de «Peso ahorrado» no la lleva porque no se pulsa.

**Hover del interruptor:** la manija se adelanta al estado al que va —
`action-secondary` cuando está apagado (el color de «encendido») y
`action-primary` cuando ya está encendido. El hover no cambia lo que hace el
control, dice que responde.

---

## D-214 · La cabecera lleva el marcador y los mandos, y el filtro entra en cascada

**Fecha:** 2026-08-04 · **Estado:** vigente

**Fuera el párrafo de introducción.** Explicaba a quién abre el panel qué es el
panel, y a estas alturas lo abre una sola persona que lo sabe. Ese hueco lo
ocupan ahora las dos cifras verdes («Archivos procesados», «Optimización
total») y los dos mandos («Releer el spreadsheet» y «Ver ocultos»), que se han
mudado **dentro de la cabecera pegajosa**, tal cual estaban.

El motivo es de uso: en un panel donde se baja y se sube todo el rato, el
marcador de lo hecho y el interruptor de los ocultos son justo lo que hace falta
tener a mano sin volver arriba.

Cuesta alto: la cabecera pasa de 93 a **269px**, que en una ventana de 720
son algo más de un tercio de la pantalla. Es una decisión consciente del
propietario; si un día molesta, la salida evidente es encoger las cifras cuando
la cabecera está pegada, no volver a bajarlas.

**El filtro por tarjeta, como dos bloques que se relevan.** Pulsar «Falta
información» o «Bajo rendimiento» cambiaba las secciones de golpe. Ahora el
bloque que estaba sale por SU lado —nivel 1 por la izquierda, nivel 2 por la
derecha— y el otro entra por el suyo antes de que aquel termine de salir.

**Los dos bloques se mueven enteros, de una pieza.** Se probó escalonando las
secciones una tras otra (45 ms de desfase) y el propietario lo descartó: alarga
la transición y obliga a esperar a la última para poder traer nada. Sin
escalonar, el viaje dura 260 ms, el bloque nuevo entra a los 104 (40 % del
viaje) y todo ha terminado a los 364.

**Las secciones no se pliegan.** La primera versión las recogía de alto además
de moverlas, y el propietario lo leyó como «se guardan arriba y se quedan ahí
engordando el scroll»: el movimiento vertical se comía el lateral, que era el
gesto que se buscaba. Quien cambia de alto ahora es el CONTENEDOR, una sola vez
y de un alto al otro, mientras las secciones solo viajan de lado.

Todo el viaje es `transform` y `opacity` —las dos propiedades que el navegador
anima sin recalcular el layout (regla 2)—, y el contenedor recorta con
`overflow: hidden` mientras dura: nada se sale de la página ni aparece un scroll
horizontal que no existía. No hay scroll de verdad en ningún momento; es una
apariencia, que es exactamente lo que se pidió.

**Los dos bloques se cruzan.** La primera versión esperaba a que saliera el
viejo para traer el nuevo, y quedaba un instante con la pantalla vacía. Ahora,
al 40 % de la salida (`SOLAPE`), las secciones que se van **dejan el flujo**
—pasan a `position: absolute` clavadas en el sitio que ocupaban, con su `top`
medido— y siguen saliendo mientras el bloque nuevo ya ocupa su hueco.

El remate va por temporizador y no por `transitionend`: son varias transiciones
a la vez y contar el tiempo que ya se sabe que dura es más robusto que esperar
un evento por sección.

**Y rematar lo anterior es lo PRIMERO que hace un cambio de tarjeta**, antes
incluso de mirar qué secciones hay que mover. A mitad de un cambio, las que se
van todavía no están `hidden` —siguen viajando, fuera del flujo— y las que
entran ya no lo están: calcular las listas sobre ese DOM daba dos listas
equivocadas y el panel acababa enseñando el nivel contrario al de la tarjeta
pulsada. Se coló en la primera versión y lo cazó la prueba de interrumpir a los
80 ms; ahora se comprueban seis cortes (0, 40, 80, 130, 200 y 300 ms) y los seis
acaban en el nivel correcto y sin un solo estilo residual.

Comprobado: ida y vuelta dejan el contenedor con su alto correcto y sin estilos
en línea, ninguna sección se queda con transform ni con la clase de viaje, y
tres cambios de tarjeta encadenados a 150 ms —interrumpiendo la animación dos
veces— acaban en el estado correcto.

---

## D-215 · «Comprobaciones sin hallazgos», pegado abajo

**Fecha:** 2026-08-04 · **Estado:** vigente

La línea que enumera lo que el panel miró y salió limpio vivía al final de la
página, donde solo se leía si se bajaba del todo — justo lo contrario de lo que
está para hacer: recordar en todo momento qué está vigilado. Ahora va `sticky
bottom-0`, pegada al borde inferior de la ventana, con 40px de aire arriba y
abajo.

Misma pareja de reglas que la cabecera y por lo mismo: fondo propio (las
secciones le pasan por debajo), márgenes negativos que estiran ese fondo hasta
los bordes de la página, y el filete con el ancho del contenido.

Entre las dos barras —269px arriba y 99 abajo— quedan unos 350px de ventana para
la lista en una pantalla de 720. Es mucho marco para poco cuadro; si al usarlo
aprieta, lo primero que debería encoger son las cifras de la cabecera cuando
está pegada, no esta línea.

## D-216 · Las fechas llevan cero delante del día de una sola cifra

**Contexto**: `formatFechaDMY()` (`mel.ts`) llevaba un comentario explícito documentando lo contrario — "Reordena y no normaliza, a propósito: la hoja rellena los ceros de forma irregular... Meter un `parseInt` por pieza cambiaría fechas ya validadas por el propietario, así que se deja tal cual." Esa fue una decisión real, no un descuido.

**Decisión**: el propietario pide ahora justo lo contrario — anteponer un cero al día de una sola cifra ("9/10/2004" → "09/10/2004"), para que la columna de fecha de la tabla no salte visualmente entre cifras de una y dos posiciones. Sustituye a la decisión anterior.

**Alcance**: solo el día. El mes se deja tal cual llega de la hoja — no se ha pedido lo mismo para él, y unificar los dos habría sido una interpretación no pedida.

**Consecuencias**: cambiado en `mel.ts` (SSR) y en su réplica de `index.astro` (cliente, regla 7 de AGENTS.md) — hay que mantener las dos en el mismo estado si esto se vuelve a tocar.

## D-217 · "¿Nos ayudas?" en action-primary desde el reposo, y también en la tabla de Lista

**Contexto**: el enlace de colaboración que sustituye un dato que falta (`AYUDA_TEXTO`/`AYUDA_HREF`, `event/[id].astro`) usaba el color normal de enlace (`text-mel-text-secondary`, pasa a `action-primary` solo al pasar el ratón) — igual que cualquier otro dato, sin destacar como invitación. Y en la tabla de Lista, una celda sin dato se pintaba inerte (gris, sin enlace): el "¿Nos ayudas?" solo existía en la ficha de evento.

**Decisión**: estos enlaces van ahora en `action-primary` desde el reposo, no solo al pasar el ratón — para que se lean como invitación y no como un dato más. Se añade `state="Primary"` a `Link.astro`/`TagWithLink.astro` (color fijo, sin tocar el resto de estados) y una clase paralela `.cell-ayuda` para la tabla de Lista, que no pasa por esos componentes (usa HTML a mano por rendimiento en listas grandes).

**Alcance**: las cuatro columnas de la tabla que pueden faltar (Lugar, Localidad, Organiza, Diseño) pasan de inerte a "¿Nos ayudas?" enlazado a `/info#contacto`, igual que ya hacía la ficha. Implementado como `<a href>` real y no como `data-search` — ese atributo dispara una búsqueda literal por el texto, y aquí lo que hace falta es navegar.

## D-218 · Los promotores separados por comas son un enlace cada uno

**Contexto**: "Organiza" podía llevar varios nombres en la misma celda de la hoja, separados por comas (p. ej. "Ravers 7.5, Colectivo X"), pero se enlazaba como una sola búsqueda de la cadena completa — que no encontraba nada, porque ningún evento tiene ese texto literal en su campo `organiza`. Los artistas ya resolvían este mismo problema (`ARTISTAS`, un enlace por nombre); "Organiza" no.

**Decisión**: mismo tratamiento que los artistas. `TagWithLink.astro` gana una prop `multi` (lista de `{texto, href}`) que sustituye a `count`/`href` cuando se pasa — cada nombre es su propio enlace, separados por comas en texto plano. Reutilizable por cualquier tag futura que necesite lo mismo, no solo "Organiza".

**Alcance**: la ficha de evento (`TAGS_EVENTO`, tanto la fila móvil como la columna de escritorio) y la tabla de Lista. En la tabla, cada nombre lleva su propia `.search-cell-link` con su propio `data-search`, sin el subrayado compartido de celda (`.table-link-underline`) que asumía un solo enlace por celda — se pierde ese detalle visual en las celdas con más de un promotor, a cambio de que cada nombre busque lo suyo. El color al pasar el ratón sí lo conserva cada nombre.

## D-219 · La dirección del panel del mapa se corta en el número de calle

**Contexto**: `extractAddressLabel()` (`index.astro`) muestra la dirección legible sacada del enlace de Google Maps compartido (columna G de la hoja), completa: "Av. Lancia, 9, 24004 León". El código postal y la localidad ya se leen en la tag "Localidad" de al lado, en el mismo panel.

**Decisión**: cortar justo después del número de calle — "Av. Lancia, 9". Nueva función `truncarEnNumeroCalle()`: separa por comas, busca el primer trozo que sea solo un número (con sufijo de letra suelto tipo "9B") y corta ahí. Si no encuentra ninguno —direcciones sin número, texto libre, DMS— la deja tal cual en vez de arriesgarse a cortar donde no toca.

**Alcance**: solo el panel lateral del mapa (`side-panel-address`), que es el único sitio donde se muestra esta dirección larga. No afecta a las coordenadas de posicionamiento del marcador, que se siguen leyendo del mismo campo sin tocar.

## D-220 · El marquee de la tabla de Lista se comparte con las tags de la ficha

**Contexto**: las tags de la ficha de evento (Fecha/Lugar/Localidad/Organiza/Diseño) recortaban un valor largo en seco contra el borde de la caja, sin puntos suspensivos ni forma de leer el resto — a diferencia de la tabla de Lista, que desliza el texto al pasar el ratón cuando de verdad desborda (`.marquee-cell`/`.marquee-inner`, con detección de solapamiento por JS).

**Decisión**: el sistema de CSS (clases + `@keyframes marquee-scroll`) se traslada de `index.astro` a `global.css`, para que sea una sola fuente compartida entre página y componente en vez de dos copias que acaban divergiendo — pedido explícito del propietario ("reaprovecha algo de ese componente... para que los cambios que hagamos sobre eso estén unidos"). `TagWithLink.astro` lleva ahora `marquee-cell`/`marquee-inner` en su valor (las tres variantes: enlace simple, `multi` y texto plano).

**Lo que NO se comparte**: la detección de desbordamiento en sí (medir `scrollWidth` vs `clientWidth`, añadir `.is-overflowing`, fijar las variables CSS de duración/ancho) sigue duplicada a mano entre `index.astro` y `event/[id].astro` — no hay módulo de JS compartido entre páginas en este proyecto (regla 7 de AGENTS.md), solo el aspecto/animación viven en un sitio único.

## D-221 · Título del panel del mapa, un escalón menor solo en escritorio

Petición del propietario: `#side-panel-title` pasa de `typo-h2` (28px móvil / 31px escritorio) a los valores de `typo-h3` (22/28, sin escalado) **solo a partir de `lg` (1024px)**, dentro del mismo bloque de overrides de escritorio que ya tiene el panel. En móvil (bottom sheet) se queda en `typo-h2` sin tocar — no se cambia la clase entera precisamente para no arrastrar el cambio a donde no se pidió.

## D-222 · Sombra plana del marcador del mapa (Figma 341:26188)

**Contexto**: Figma rediseñó el marcador con una sombra plana (un trapecio que se ensancha desde la punta del puntero hacia abajo, color Tinted-200, `mix-blend-mode: multiply`) en vez del halo difuminado que llevaba el sitio (`filter: drop-shadow(...)` sobre `.mel-marker-wrapper` entero).

**Decisión**: se sustituye el `filter: drop-shadow` en reposo por un nuevo `<div class="mel-marker-shadow">`, proporcional al ancho del propio marcador (11% de margen a cada lado) en vez de un ancho fijo — los marcadores de este sitio no son un pin de tamaño constante, se ensanchan según el texto de la etiqueta, a diferencia del frame fijo de 82px de Figma. Añadido `isolation: isolate` en `.mel-marker-wrapper` (regla 12 de AGENTS.md, obligatorio para cualquier `mix-blend-mode`).

**Sin verificar visualmente**: el mapa no carga tiles en el entorno del agente (sin clave de API), así que esto no se ha podido comprobar en un mapa real — solo revisado por código y aplicado con cautela. Pendiente de que el propietario lo vea en su navegador/móvil.

**No tocado**: el realce de `hover`/`.active` (escala 1.05 + sombra más intensa) sigue igual — es una respuesta a la interacción, no el aspecto en reposo que rediseñó Figma.

## D-223 · Corrección de D-219: la dirección busca "código postal + localidad", no "número de calle"

**Contexto**: D-219 buscaba un trozo que fuera SOLO un número (el de la calle) y cortaba ahí. Fallaba en direcciones de carretera sin número de calle propiamente dicho — reportado por el propietario con "Voloko": `"N-6, Km 400, 24540 Cacabelos, León"` no tiene ningún trozo que sea un número suelto ("Km 400" no cuenta), así que la función no encontraba nada y devolvía la dirección completa, código postal incluido.

**Decisión**: buscar en su lugar el trozo con el patrón "código postal + nombre" (dígitos seguidos de texto) y cortar ahí — todo lo anterior se conserva tal cual (calle, número, "Km 400"...), y al nombre de esa localidad se le quitan los dígitos y se añade al final. De paso resuelve otra petición del propietario: que el nombre de la localidad SÍ aparezca al final (antes se tiraba entero). "Solo el primero": cualquier cosa después de ese trozo (en Voloko, "León" de provincia) se descarta.

- "Av. Lancia, 9, 24004 León" → "Av. Lancia, 9, León"
- "N-6, Km 400, 24540 Cacabelos, León" → "N-6, Km 400, Cacabelos"

## D-224 · La fecha de la ficha de evento también lleva el cero del día

**Contexto**: D-216 añadió el cero al día en `formatFechaDMY()`, pero la ficha de evento (`event/[id].astro`) nunca pasaba `e.fecha` por esa función — el mapeo `evento()` la asignaba tal cual (`date: e.fecha`), a diferencia de la home/lista, que sí llaman a `formatFechaDMY()`. El propietario lo notó al ver que la tag "Fecha" de la ficha seguía sin el cero.

**Decisión**: `date: formatFechaDMY(e.fecha)` en el mapeo `evento()`. Alcance: solo esa línea; el resto de la ficha no tenía este problema.

## D-225 · Corrección de D-223: sin código postal reconocible, se descarta "León" si es el último trozo

**Contexto**: "Delfos" seguía mostrando "LE-158/26, Dehesas, León" — el propietario esperaba solo "LE-158/26, Dehesas". Su `/place/` de Google no lleva código postal en el texto legible (el código postal existe, pero solo en el parámetro de datos de la URL, no en el segmento que se muestra): `"LE-158/26, Dehesas, León"`. Sin ningún trozo con dígitos, D-223 no encontraba el patrón "código postal + nombre" y devolvía la dirección sin tocar.

**Decisión**: caso de respaldo cuando no hay código postal reconocible — si el ÚLTIMO trozo es exactamente "León" (la provincia; este archivo solo cubre la provincia de León, así que ese nombre ahí nunca es información nueva sobre el trozo anterior, que ya es la localidad real), se descarta y se conserva el resto tal cual.

- "LE-158/26, Dehesas, León" → "LE-158/26, Dehesas"

**Un poco frágil a propósito**: es una comparación literal con "león", no una heurística general (no hay forma fiable de adivinar "esto es una provincia redundante" sin conocer el dominio). Si aparece un caso real con una provincia distinta de León al final, esta regla no lo cubre y quedaría sin tocar — mejor eso que arriesgarse a cortar mal.

## D-226 · Corrección de D-222: el `isolation: isolate` va en el mapa, no en cada marcador

**Contexto**: el propietario probó la sombra nueva en un mapa real y, con dos marcadores cerca (un cluster "+36" y "La Estrella"), la sombra de uno se pintaba COMO UN BLOQUE SÓLIDO por encima del otro en vez de oscurecerlo — el `mix-blend-mode: multiply` no se estaba mezclando con nada.

**Causa**: D-222 puso `isolation: isolate` en `.mel-marker-wrapper`, siguiendo al pie de la letra la regla 12 de AGENTS.md ("todo blend mode necesita su contexto de apilamiento propio"). Pero eso AÍSLA la sombra DENTRO de su propio marcador: cuando dos marcadores se solapan en pantalla, cada uno es su propio contexto de apilamiento independiente, así que el multiply de uno no puede ver ni mezclarse con los píxeles del otro — se pinta encima con compositing normal (opaco), no con blend.

**Decisión**: el `isolation: isolate` se mueve a `#map-container` (el contenedor que envuelve a TODOS los marcadores) y se quita de `.mel-marker-wrapper`. Así el multiply sigue sin escapar al resto de la página (la regla 12 se sigue cumpliendo, con el límite en el mapa en vez de en cada pin), pero SÍ puede mezclarse con lo que haya detrás DENTRO del mapa — tiles y otros marcadores incluidos.

**Sigue habiendo un límite**: si un marcador con sombra está VISUALMENTE por delante de otro (por su z-index/orden, que decide Google Maps y no controlamos directamente), la sombra seguirá pintándose por delante de ese otro marcador — ahora mezclada correctamente (oscureciéndolo) en vez de como bloque sólido, pero no "por detrás de todos los marcadores siempre". Conseguir eso de verdad exigiría una capa de sombras separada, por debajo de la capa de marcadores, sincronizada a mano con la posición de cada uno — un cambio de más alcance, aparcado a menos que el propietario lo pida tras ver si el arreglo de blending ya es suficiente.

**Sin verificar en un mapa real por el agente**: seguimos sin poder cargar tiles en este entorno; el propietario es quien lo ha probado y reportado.

## D-227 · Corrección de D-220: dos clases sobrantes rompían el marquee de las tags de la ficha

**Contexto**: el propietario reportó que las tags de la ficha ni truncaban con puntos suspensivos ni deslizaban al pasar el ratón — es decir, D-220 no funcionaba en absoluto en su versión inicial.

**Causa, dos capas**:
1. `TagWithLink.astro` ya tenía su propia regla `.tag-count-val { display: block; ... }` en su `<style>` — al añadirle también la clase `marquee-inner` (que pide `display: inline-block`), las dos reglas empataban en especificidad (una clase cada una) y ganaba la que cargara después. Se quita el `display` de `.tag-count-val`, que ya no hace falta —siempre convive con `marquee-inner`, que pone el suyo.
2. La fila de "Organiza" con varios promotores (`.tag-multi`) llevaba además la utilidad `flex` de Tailwind en el mismo elemento que `marquee-inner`. Y por separado, la CAJA que envuelve el valor de cualquier tag (`.marquee-cell`) YA es `flex` (por la alineación derecha/centro de `alignment`) — y por especificación CSS, **cualquier hijo directo de un contenedor flex "blockifica" su display** (un `inline-block` se convierte en `block` porque sí, sea cual sea la regla CSS que lo pida). Esto no tiene arreglo quitando clases: es cómo funciona flex.

**Verificado que la blockificación no rompe el mecanismo**: con `display:block` forzado por el padre flex, la detección de desbordamiento (`scrollWidth`/`clientWidth`) y la animación de deslizamiento (`getAnimations()`) siguen funcionando igual — comprobado forzando el estado a mano, ya que este entorno no simula un `:hover` real de forma fiable (limitación de la herramienta del agente, no del sitio). El único cambio de comportamiento honesto que queda pendiente de confirmar en un dispositivo real es el propio gesto de hover, que aquí no se puede reproducir.

## D-229 · La sombra del marcador NO puede llevar `mix-blend-mode: multiply`

**Comprobado en el navegador, no deducido.** Google posiciona cada marcador con un `transform` en línea sobre `<gmp-advanced-marker>`, y un `transform` distinto de `none` crea un contexto de apilamiento, que aísla la mezcla. La sombra solo puede mezclarse con lo que haya dentro de SU marcador —nada— así que se pinta como color plano.

Dos pruebas: (1) con la sombra en rojo saturado y agrandada sobre el mapa no se transparentaba ni una carretera; (2) forzar `will-change: auto` sobre `gmp-advanced-marker` no cambió nada, porque el `transform` basta por sí solo.

**Ojo con una prueba que engaña**: poner la sombra en blanco y ver que "desaparece" NO demuestra que el multiply funcione — el mapa es casi blanco, así que un blanco plano también desaparece. Ese falso positivo costó una ronda entera.

**Descartado** aislar `#map-container`: el contexto que estorba es el de cada marcador, no el del mapa.

**Decisión**: relleno Tinted-400 al 40% (criterio del propietario). Sobre el fondo claro del mapa da un gris parecido al que daría el multiply y, al ser semitransparente, no tapa en bloque lo que quede debajo.

## D-230 · Una sola regla de apilamiento en el mapa: el de más abajo, encima

Antes había tres escalas distintas y no comparables: los pines sueltos en `null` (Google los ordena por posición), los clusters en `MAX_ZINDEX + count` (≈1.000.000) y el activo en `MAX_ZINDEX + 1000000` (≈2.000.000). Con la sombra dentro del marcador, esos dos saltos hacían que la sombra de un cluster —o del marcador activo— se pintara por encima de pines que estaban más abajo en la pantalla. Medido: `sombra "Voloko"(z=2000000)` tapaba `"+3"(z=1000002)`.

**Decisión**: `zIndexPorLatitud()` para todos. Menor latitud (más al sur, más abajo en pantalla) → mayor zIndex. Verificado: el orden por z coincide exactamente con el orden en pantalla y no queda ningún solape incorrecto.

**Consecuencia aceptada**: el marcador activo ya no está por encima de todo. Si molesta, la salida acordada con el propietario NO es volver a subirle el zIndex, sino distinguirlo de otra forma (tamaño, zoom). Los que se van sí conservan un zIndex alto durante los 150ms de su desvanecido, que es un estado transitorio.

## D-231 · El marquee: velocidad constante, ancho útil y una sola elipsis

Cuatro fallos distintos, los cuatro medidos:

1. **No se movía donde el padre es flex.** El fotograma final mide `-100%` sobre el ancho del propio elemento; un contenedor flex "blockifica" al hijo y este pasa a ocupar el ancho de la celda, con lo que `-100% + ancho` da 0. Pasaba en las tags de la ficha y en la celda del título de la tabla (`.event-title-link` es `inline-flex`). Se arregla con `width: max-content` en el estado de hover, que ajusta al contenido pase lo que pase con el display. Medido: de `-0,33px` a `-67px` en la tag, y `-80px` en el título.
2. **Se quedaba texto oculto.** `--cell-width` usaba `clientWidth`, que en la tabla incluye los 32px de `px-4`, así que faltaban justo esos 32px por recorrer. Ahora se usa el ancho ÚTIL (sin padding), y ese mismo ancho se usa para DECIDIR si desborda — antes celdas que sí se truncaban no se marcaban.
3. **Iba a saltos.** `cubic-bezier(0.16,1,0.3,1)` es una curva de aceleración fuerte, y la duración salía de una cuenta que no era una velocidad. Ahora `linear` y `55px/s`: el recorrido manda, un texto el doble de largo tarda el doble. Petición del propietario: teletipo de bolsa.
4. **Elipsis en mitad del texto.** En la tag de varios promotores, la regla `:global(.filter-tag .mel-link-active > span)` le daba a CADA enlace su caja con recorte y puntos suspensivos propios. Excepción para `.tag-multi`: los enlaces vuelven a fluir como texto corrido y de recortar se encarga solo `.marquee-inner`, que es quien conoce el ancho de la celda. De paso, ahora sí sale la elipsis única al final, que antes no se pintaba porque el contenido eran cajas atómicas y no texto.

Se añade `--marquee-gap` (8px) para que la última letra no acabe pegada al borde.

## D-232 · En hover/activo, el marcador lleva una sola sombra y en LE-400

En `:hover` se sumaba un `drop-shadow(0 6px 16px …)` al halo difuminado, además de la sombra plana nueva: dos sombras a la vez y el conjunto se ensuciaba. Se retira el halo y manda solo la plana, que en hover y en activo pasa a LE-400 (no Tinted). El `brightness` del cuerpo y del puntero no se toca: va en sus propios selectores y sí forma parte del estado activo.

## D-233 · El marquee, componentizado de verdad

**El CSS ya era único** (global.css) pero **la medición estaba copiada a mano** en `index.astro` y en `event/[id].astro`, con la trampa de siempre. Ahora vive una sola vez en `Layout.astro` como `window.melMedirMarquee(ámbito)`.

**Por qué ahí sí se puede**: la regla 7 de AGENTS.md habla de los scripts con `define:vars`, que Astro sirve **en línea** y por eso no pasan por Vite ni pueden importar nada. El `<script>` de `Layout.astro` no lleva `define:vars`, así que sí se procesa y puede compartirse entre páginas dejando la función en `window`. Ambas páginas la llaman desde su propio `astro:page-load`, con guarda por si aún no ha corrido.

Tres arreglos que entraron con la mudanza:

- **No funcionaba al ENTRAR en Lista.** La tabla se construye con su panel todavía en `hidden`, así que al medir `clientWidth` es 0 y ninguna celda quedaba marcada. Sí funcionaba al volver desde una ficha, porque entonces el panel ya estaba visible. Se remide en `switchView('lista')`, en el fotograma siguiente. Medido: de 0 celdas marcadas a 59.
- **El texto se pegaba al borde izquierdo.** `overflow: hidden` recorta en la caja de *padding*, así que el texto se deslizaba por debajo del padding y llegaba al borde de la celda. Ahora `overflow: clip` + `overflow-clip-margin: content-box`, que recorta donde empieza el contenido. En las celdas sin padding (tags de la ficha) las dos formas son idénticas.
- **Umbral mínimo de 8px.** Celdas que desbordaban 3-4px hacían un tirón de una décima de segundo, que se ve como un temblor y no como una revelación.

## D-234 · Fuera las rayas diagonales sobre el cartel en la galería

`FlyerCard.astro` y su gemela `buildGalleryCard()` llevaban una capa de `striped-bg` que subía a `opacity-10` en hover. En escritorio se notaba poco; en móvil, donde el navegador simula el hover al tocar y encima se suma el atenuado táctil de global.css, las rayas se veían claramente **encima** del cartel mientras se mantenía pulsado. El propietario lo descartó: un archivo de carteles no debe ensuciar el cartel. Retirada en los dos sitios a la vez (regla 7).

## D-235 · La animación del salto del slider, y por qué no existía

Al pulsar la barra, el tirador saltaba de golpe mientras el relleno sí se deslizaba. **Causa medida**: `#slider-active-fill` se declara en `TimeSlider.astro` y recibe su atributo de ámbito, pero **los dos tiradores vienen de otro componente** (`SliderHandler.astro`) y por tanto no lo llevan — ninguna regla del `<style>` de TimeSlider les ha llegado nunca. Comprobado en el navegador: relleno `0.5s`, tiradores `0s`. La regla que "desactiva la transición al arrastrar" también estaba muerta por lo mismo (inofensiva, porque no había transición que desactivar).

**Decisión**: `:global()` para cruzar la frontera de ámbito, pero acotado a una clase `.salto-animado` que solo existe durante el clic en la barra y se retira sola a los 550ms. El arrastre sigue siendo instantáneo (si no, el tirador va por detrás del dedo) y las escrituras programáticas —restaurar el rango al volver de una ficha— no se animan. Mismos 0.5s y misma curva que el relleno, para que tirador y barra viajen juntos.

**No se han "arreglado" las reglas muertas** convirtiéndolas en globales: hacerlo cambiaría el arrastre, que el propietario marcó como delicado.

## D-236 · Norma de columnas de la tabla de Lista

**Criterio del propietario**: el ancho mínimo de una celda es el que le cabe a "¿Nos ayudas?" sin truncarse. Cuando cualquier columna llegaría a ese mínimo, se van retirando columnas en este orden: **Localidad, Organiza, Diseño**.

**El mínimo, medido**: 130px (96 de texto + 32 de padding + 2 de bordes). Se redondea a los **136** que el proyecto ya usaba en `min-w-[136px]` y en el `min-w-[816px]` de la tabla (816 = 6 × 136). La norma no introduce un número nuevo: formaliza el que ya estaba.

**Fecha queda fuera del reparto** — tiene su propia norma (136px fijos, ver el comentario del colgroup) porque su contenido no se puede truncar sin quedar ilegible. Evento y Lugar no se retiran nunca.

Tramos resultantes, verificados en el navegador:

| disponible | columnas | `min-width` |
|---|---|---|
| ≥ 816 | las seis | 816 |
| ≥ 680 | sin Localidad | 680 |
| ≥ 544 | sin Localidad ni Organiza | 544 |
| < 544 | Evento, Fecha, Lugar | 408 |

**Dos trampas que costaron una pasada cada una:**

1. **Dónde se mide el ancho disponible.** En el PADRE (`#view-lista`), no en `#list-table-wrapper`. La envoltura lleva `overflow-x-auto` pero es un elemento flex sin `min-width:0`, así que en vez de limitar y hacer scroll se estira con su contenido: medido, con la ventana en 850 la envoltura decía 900 y el padre 754. Preguntándole a ella, la respuesta era siempre "cabe todo" y la norma no se disparaba nunca.
2. **No basta con ocultar las celdas.** Con `table-layout:fixed` manda el `<colgroup>`, así que una columna con sus `th`/`td` en `display:none` seguiría ocupando su sitio. Hay que poner además su `<col>` a 0 y repartir de nuevo los porcentajes entre las que quedan (Evento conserva su tercio, el resto se divide a partes iguales) — dejar los 16,75% fijos hacía que, con columnas fuera, ya no sumaran 100 y el navegador repartiera el sobrante a su manera.

## D-237 · Las rayas diagonales de la galería eran un accidente de julio

Ampliación de D-234. El propietario preguntó de dónde salían: `git log -S` las sitúa en el commit `3a28693` ("15 de julio"), no en ninguna decisión de diseño posterior. Nunca fueron intencionadas. Retiradas.

## D-238 · Ajuste fino de las curvas del marquee

Sobre D-233, a petición del propietario: la frenada de la IDA dura menos (`cubic-bezier(0.12, 0.12, 0.5, 1)` → `(0.12, 0.12, 0.74, 1)`: el tramo lineal se alarga y la deceleración se concentra al final) y la de la VUELTA dura más — curva más tendida (`(0.22, 1, 0.36, 1)` → `(0.16, 1, 0.24, 1)`) y factor de duración de 0.55 a 0.7 sobre la ida. La vuelta sigue siendo más rápida que la ida, como se pidió en su momento.

## D-239 · REVERTIDA la norma de columnas de D-236 (y por qué falló)

D-236 se implementó y **se retiró en la misma sesión** a petición del propietario, que vio la tabla rota: las cabeceras se solapaban unas con otras ("DISEÑO" y "ORGANIZA" impresas encima). La entrada D-236 se conserva —este registro no borra decisiones, las marca como revertidas— porque la NORMA sigue siendo válida; lo que falló fue la implementación.

**La causa, para quien lo retome**: la regla que ocultaba las celdas vivía en el `<style>` de `index.astro`, que **Astro convierte en un estilo con ámbito**. Astro añade el atributo de ámbito al último compuesto del selector, así que `:is(th, td):nth-child(n)` solo casaba con elementos que llevaran ese atributo. Los `<th>` están en la plantilla SSR y sí lo llevan; los `<td>` **los genera el JS con `innerHTML` y no lo llevan**. Resultado: se ocultaban las cabeceras pero no las celdas, y con los `<col>` puestos a 0 el contenido de las columnas colapsadas se amontonaba encima del resto.

Es la misma trampa de la regla 7 de AGENTS.md vista desde el otro lado: el marcado que fabrica el JS no recibe el ámbito de Astro. **Si se reintenta**, la regla tiene que ir en `:global()` (o en `global.css`), y conviene comprobar en el navegador que las celdas se ocultan de verdad, no solo las cabeceras.

Lo que sí sobrevive de aquella pasada, porque es útil y no depende de la norma: la remedición del marquee al redimensionar la ventana.

## D-240 · El marcador se despega de su sombra al pasar el ratón

Figma 261:10331. En el componente, el puntero lleva `margin-bottom: -4px` en Resting y Active —la punta pisa la sombra— y la variante **Hover quita ese margen**, con lo que el marcador se separa de ella.

Traducido aquí: en `:hover` se suben 4px **el cuerpo y el puntero**, no el wrapper. Subir el wrapper arrastraría también a la sombra (va posicionada dentro de él) y no habría separación ninguna. Medido: reposo −4px de solape → hover 0. `.active` no lo lleva, igual que en Figma.

Va dentro del `@media (hover: hover) and (pointer: fine)` que ya envolvía el realce del marcador, por el motivo de siempre: en táctil el navegador simula el hover al tocar y no lo suelta.

## D-241 · La sombra encoge y se aclara mientras el marcador se despega

Remate de D-240, criterio del propietario: al pasar el ratón la sombra pierde **4px por cada lado** y baja **16 puntos de opacidad** (40% → 24%), de modo que parece quedarse más pequeña y más lejos según el marcador se eleva. Medido: 31,2px → 23,2px de ancho, y de Tinted-400 al 40% a LE-400 al 24%. Comparte duración y curva con el despegue (0,15s ease-out) para que las tres cosas se lean como un solo gesto.

**Dos cosas que se colocaron de paso:**

- **El realce de hover de la sombra pasa DENTRO del `@media (hover: hover) and (pointer: fine)`.** Estaba fuera desde D-232, así que en un móvil el "hover" que el navegador simula al tocar habría dejado la sombra encogida y clara hasta el siguiente toque en otro sitio — exactamente la trampa que D-232 documenta para el botón "Me presta" y los marcadores.
- **`.active` se separa del `:hover`.** Antes compartían la regla de color. Ahora el activo solo cambia el color (LE-400 al 40%, tamaño completo) y no encoge ni se aclara: el hover es un realce de paso y el activo un estado que se queda. Además `.active` lo pone el JS, así que no puede vivir dentro de un media query de puntero.

## D-242 · El apilamiento del mapa se calcula por posición en PANTALLA, no por latitud

Corrige D-230, que ordenaba por latitud. Eso solo vale mientras el mapa mira al norte: en cuanto se gira, "más al sur" deja de ser "más abajo en la pantalla". Medido con el mapa a 90°: el orden por z-index y el orden real en pantalla no coincidían en ninguna posición salvo la primera.

**No hace falta trigonometría con el `heading` ni recalcular "cada X grados"** (que fue lo que se planteó): el navegador ya sabe dónde ha pintado cada marcador, así que se lee su caja y se ordena por ella. Sirve igual para girar, inclinar, hacer zoom y desplazar, sin distinguir entre ellos.

**Dos trampas, ambas medidas:**

1. **Hay que escribir la PROPIEDAD `zIndex` del marcador, no `style.zIndex`.** Google reaplica su propia propiedad sobre el estilo en cada repintado, así que un `style.zIndex` puesto a mano duraba un fotograma: al girar, los valores volvían solos a los de latitud (47xxxx) y el orden se revertía hasta soltar el dedo. Se llega por el DOM (`<gmp-advanced-marker>` **es** el objeto AdvancedMarkerElement) para no dejar fuera los globos de cluster, que los crea la librería y no están en `locationMarkers`.
2. **Hace falta un BUCLE mientras la cámara se mueve, no un reordenado por evento.** `bounds_changed` y `heading_changed` se disparan de forma irregular —en una rotación programática saltan al principio y poco más—, así que el orden iba desfasado casi toda la animación: medido, 1-4 aciertos de 7 durante ~600ms, correcto solo al parar. Con un `requestAnimationFrame` que corre mientras hay movimiento y se corta en `idle`: 7/7 durante todo el gesto.

## D-243 · Marcadores en modo oscuro: sin sombra plana, con resplandor

La sombra plana desaparece en TODOS los estados: es una mancha clara pensada para un mapa claro y sobre el oscuro se lee como suciedad. En su lugar, el efecto que especificó el propietario (Figma: X 0 · Y 4 · Blur 4 · Spread 0 · `#190609` al 100%).

Va como `drop-shadow` y no `box-shadow`: el segundo dibujaría un rectángulo y el marcador tiene punta; `drop-shadow` sigue la silueta real de cuerpo y puntero. Se repite en `:hover` y `.active` porque esos dos estados llevan un `filter: none` que si no lo borraría.

## D-244 · RETIRADA la entrada animada del mapa

Se implementó una entrada en la que la cámara llegaba girada y se enderezaba despacio. **El propietario no llegó a verla nunca**, ni en móvil ni en escritorio, ni con la amplitud subida a 30° y 1,2 niveles de zoom, ni saltándose la guarda de `prefers-reduced-motion`. Se retira entera.

**Lo desconcertante, y por eso queda escrito**: en el entorno del agente SÍ funcionaba y está medido — con la ventana a 375px el `heading` iba de 0 a 30 y volvía a 0, el zoom de 6,65 a 7,85, y hay captura del mapa a medio girar. O sea que el código era correcto y algo del entorno real lo impide.

**Hipótesis para quien lo reintente** (ninguna comprobada): que el dispositivo caiga al render ráster en vez de vectorial, en cuyo caso `setHeading()` se ignora en silencio y no hay forma de notarlo desde el código. Antes de volver a escribir la animación, conviene comprobar primero si `map.setHeading(45)` a pelo hace algo en el dispositivo de destino.

## D-245 · Los marcadores no se seleccionan como texto

`user-select: none`, `-webkit-touch-callout: none` y `-webkit-tap-highlight-color: transparent` en `.mel-marker-wrapper`. Un marcador es un botón, no un párrafo: no hay nada que copiar en él, y sin esto el móvil intentaba seleccionar su etiqueta al mantener el dedo.

**No arregló** el problema que se investigaba —el propietario ve el cuerpo del marcador desaparecer al mantener pulsado, dejando solo puntero y sombra— y ese caso queda SIN resolver y aparcado por decisión suya ("es un detalle menor que muy poca gente va a reproducir"). Se conserva el cambio igualmente porque impedir la selección de texto en un control es correcto de por sí, no como arreglo de aquello.

## D-246 · El gesto sobre la foto del evento tiene UN dueño: cerrojo de eje + `touch-action: none`

Arregla el "cambia del tirón sin transición" del carrusel en móvil real, aparcado en una sesión anterior. La causa no era una: sobre la foto competían TRES gestores del mismo dedo — el deslizamiento horizontal, el reenvío vertical manual (`habilitarArrastreVertical`, que existe porque la caja es fija y el scroll nativo no la atraviesa) y el propio navegador, al que `touch-action: pan-y` le dejaba el eje vertical.

**Dos fallos concretos, dos cambios:**

1. **`pan-y` → `none` en la zona de deslizamiento.** Con `pan-y`, Safari podía quedarse el gesto A MITAD cuando el dedo derivaba en diagonal: disparaba `pointercancel` y nuestro `resolver` contaba el recorrido horizontal acumulado como deslizamiento válido — cambio de foto de golpe mientras la página además se desplazaba. Y en el inspector de escritorio, Chrome reclamaba el pan vertical al instante sobre una caja fija sin nada que desplazar: por eso allí arrastrar la foto no hacía nada. No se pierde el scroll vertical sobre la foto: nunca fue del navegador (caja fija), lo reenvía el gestor manual, que sigue recibiendo los eventos. Ojo al historial del comentario en el código: `pan-y` fue a su vez el arreglo contra `auto` (que mataba TODO el gesto) — no volver atrás.

2. **Cerrojo compartido por gesto (`ejeGesto`).** Los dos gestores JS decidían su eje con deltas ACUMULADOS y reevaluaban en cada movimiento hasta engancharse: en un gesto largo en diagonal acababan enganchándose LOS DOS y peleándose por el dedo. Ahora el primero que decide eje se queda el gesto entero. Consecuencia: la comparación `dx` vs `dy` que `resolver` hacía al soltar sobra y se retira — era juzgar dos veces un gesto ya adjudicado, y hacía snap-back en arrastres horizontales amplios con deriva vertical.

Verificado con gestos táctiles sintéticos en las cuatro direcciones del conflicto (vertical→horizontal no roba, horizontal→vertical no desplaza página, swipe limpio anima a 0.5s, extremo amortigua a 1/3 sin dar la vuelta) y en el lightbox (comparte función; su `pointerdown` también limpia el cerrojo porque no tiene gestor vertical que lo haga). **Validado por el propietario en móvil real** — la parte de `pointercancel` de Safari no se puede reproducir en este entorno, así que esa confirmación era imprescindible.

## D-247 · La rueda del ratón sobre la caja fijada; y una vía muerta descartada para el "empujón" al crecer

Dos frentes en la ficha de evento (layout móvil). **Uno entra, el otro se revierte** — y el revertido deja aprendizaje, que es para lo que se escribe esta entrada.

**1. ENTRA — la rueda del ratón no hacía nada sobre la caja de la foto encogida** (escritorio a ancho móvil). Para un elemento `fixed`, la cadena de scroll de la rueda acaba en el viewport, que en esta página no se desplaza: el scroll vive en `#detail-page-container`. Y el reenvío táctil que ya existía (`habilitarArrastreVertical`) descarta el ratón a propósito, además de que la rueda ni siquiera es un evento de puntero. Se añade un listener de `wheel` en la caja que reenvía el desplazamiento **solo cuando está fijada**: en flujo el scroll nativo ya funciona y duplicarlo daría saltos. Normaliza `deltaMode` 1 (líneas, Firefox) a píxeles. Validado por el propietario.

**2. SE REVIERTE — el "empujón" a lo que hay encima cuando la foto vuelve a crecer.** Sigue SIN RESOLVER.

La hipótesis era que la culpa la tenía `--mel-revelado` (lo que asoma la fila de la X), que se resta del alto del recorte y se suma al `top` de la caja fijada. La medición que la respaldaba es real y sigue siendo cierta: al arrastrar hacia abajo, la foto se queda congelada los ~48px del asomo y después crece al doble de velocidad en el tramo donde la X se repliega.

**Pero quitar `revelado` de las dos ecuaciones NO eliminó el empujón** — el propietario lo comprobó en móvil real: el empujón seguía igual, y encima aparecía un solape de la cabecera sobre el canto de la foto durante ese tramo. O sea que esa aceleración medida es un efecto colateral, no la causa. Revertido a como estaba.

**Para quien lo reintente:** `revelado` ya está descartado, no vuelvas por ahí (hay un aviso en los dos sitios del código). El siguiente sospechoso razonable es el alto congelado de `#detail-image-column` frente al recorte que sí cambia, o el propio instante del `toggle('fijada')`, no probados. Y conviene medir la posición del CONTENIDO de debajo durante el crecimiento, no solo la de la foto: el propietario describe que se empuja lo de arriba, y todo lo medido hasta ahora ha sido la caja de la foto.

## D-248 · La galería vuelve a reordenarse EN VIVO durante el arrastre del slider, y el salto del clic en barra se anima

Rama `feature/slider-reorden-vivo`. Retoma dos aparcados: los puntos 1-2 de "Problemas Conocidos" del roadmap y la animación revertida de D-235.

**1. Reordenado en vivo durante el arrastre.** La historia: cada `input` del slider arrancaba su propia `startViewTransition`, apilarse las superseía (regla 3) y las tarjetas se veían "rebotando buscando sitio" — la solución de entonces fue saltarse la transición entera durante el arrastre (DOM a pelo, sin animación) y animar solo al soltar. El dato que aquella solución no aprovechó: **TimeSlider dispara `input` en cada movimiento del puntero, cruce o no de año** — se refiltraba decenas de veces por segundo el mismo rango.

Ahora, dos piezas:
- **`updateSlider()` ignora los `input` de un arrastre que no cruzan de año** (compara con el último rango programado). Solo durante el arrastre: los caminos discretos (init, restauración al volver de ficha, clic en barra, teclado) conservan su comportamiento exacto — hay flujos delicados apoyados en él.
- **Las transiciones del arrastre se SERIALIZAN en vez de apilarse**: si al llegar un cruce hay una en vuelo, el refiltrado entero se aplaza a su `finished` (bandera, no cola: los cruces intermedios se agrupan y el aplazado lee el rango vigente). Cada animación llega a completarse; la galería "persigue" al slider.
- Medido con un arrastre sintético: 12 movimientos dentro del mismo año → 0 transiciones nuevas; 10 movimientos cruzando ~6 años en ~300ms → 2-3 transiciones serializadas, no 10 apiladas. El throttle táctil de 120ms (D-086 r4) y la sincronización final del `change` quedan intactos como redes de seguridad.

**2. El salto animado del clic en barra** es la reimplantación literal de D-235 (misma receta que entonces se revirtió "para verlo con más calma"): `:global()` acotado a `.salto-animado`, que solo existe durante el clic (550ms, o hasta que empiece un arrastre, que la corta para no arrastrar con 0.5s de retraso). Misma curva y duración que el relleno. Verificado: transición de los tiradores 0s → 0.5s solo con la clase puesta → 0s al retirarse sola.

**3. El "halo" del tirador al arrastrar rápido** (reportado por el propietario al probar lo anterior, con vídeo; el punto 1 validado como "casi perfecto" salvo esto, el 2 validado del todo). En los fotogramas se ve inequívoco: DOS tiradores a la vez — el vivo bajo el dedo y un fantasma semitransparente disolviéndose donde estaba al arrancar la transición. Es el crossfade de la raíz: la foto vieja de la página ENTERA (slider incluido) se funde 320ms sobre la viva, y con un cruce por transición durante el arrastre, el fantasma se encadenaba. Mismo mal y mismo remedio que el botón de orden (D-131): `view-transition-name: mel-slider` en `#slider-track-wrapper` (TimeSlider.astro) y su grupo entero a `0s` en el CSS global de index.astro — la imagen vieja desaparece en el acto y la "nueva" de un grupo es VIVA, así que el tirador se pinta siempre nítido y al día mientras la galería anima debajo. Verificado en plena transición: `animation-duration` computada del grupo `mel-slider` = `0s`.

**4. El slider "desaparecía" durante el sort en móvil** (reportado por el propietario tras validar el punto 3; solo en Galería — encaja: la Lista ni usa view transition para ordenar, va por FLIP, D-131). Efecto colateral del punto 3: con nombre propio, durante el reordenado lento del botón el slider quedaba en un crossfade de 1500ms (la regla de 0s pierde por especificidad contra `html.orden-cambiando::view-transition-*(*)`).

**Primer intento, FALLIDO y con lección**: forzar 0s en las tres piezas del grupo bajo `.orden-cambiando`, como la excepción del botón. Medía perfecto en Chrome de escritorio (`opacity: 1`, `0s` durante todo el sort) **y aun así el slider siguió desapareciendo en el móvil — en Chrome Y en Safari**. Los pseudo-elementos de view transition no se componen igual en el móvil y este entorno no puede medirlos allí: no reintentar por la vía de las reglas sobre el grupo.

**Arreglo definitivo**: durante el sort el slider PIERDE el nombre (`view-transition-name: none` bajo `html.orden-cambiando`) y vuelve a viajar dentro de la foto de la raíz — exactamente como viajó siempre hasta D-248, sin desaparecer jamás. El nombre solo hace falta contra el halo del ARRASTRE, y el arrastre no lleva esa clase. La clase se pone antes de arrancar la transición y se retira en `finished`, así que las dos capturas la ven. **Trampa dentro de la trampa (variante fina de D-239)**: la regla vive en un bloque con ámbito donde las vecinas de pseudo-elementos se libran del cid (Astro no puede colgárselo a un pseudo-elemento) — a esta, con compound normal, sí se lo colgó y nació muerta. `:global()` obligatorio; comprobado en el navegador antes y después.

Punto de retorno: el estado previo es el commit `8a61b17` (main); esta rama existe para poder tirarla entera si no convence.

## D-249 · Reconciliación por idMel en las tres vistas, y el tirador compensa el punto de agarre

Rama `feature/slider-reorden-vivo`, segunda tanda. Dos causas distintas para dos síntomas del propietario.

**1. Cajas blancas en Chrome móvil durante el reorden (galería Y lista).** No existe ningún "fundido para cards sin cargar" que se pudiera romper — eso era el crossfade por defecto. La causa: cada filtrado reconstruía TODAS las tarjetas/filas con `innerHTML`, y una `<img>` recién creada (`loading="lazy" decoding="async"`) llega SIN descodificar a la foto "nueva" de la view transition. En escritorio la caché lo tapa; en Chrome móvil no, y se veían las cajas vacías moverse hasta asentarse. **Pasaba también con la búsqueda de siempre** — el arrastre solo lo hizo evidente al encadenar transiciones.

Arreglo: **reconciliación por `idMel` en vez de borrado total**, en los tres contenedores (rejilla de galería, `<tbody>` de la tabla, tarjetas móviles de lista). Mover un nodo existente conserva su imagen descodificada, su medida del masonry y sus listeners; solo se crean los que ENTRAN al resultado y se retiran los que salen. Medido en página asentada: galería 28/30 persistentes son el mismo nodo, sort 19 reutilizadas / 0 recreadas, lista 31/32. Detalles con miga:
- El divisor de las tarjetas móviles dependía de la posición al construir (`showDivider`); ahora todas nacen con él y se le conmuta `hidden` según posición — una tarjeta que era la última puede dejar de serlo.
- `list-row-intro` se limpia al reutilizar: mover un nodo REINICIA sus animaciones CSS y el parpadeo de entrada se repetiría.
- El caso "cero resultados" vacía a mano lo que antes vaciaba el `innerHTML = ''`.
- El FLIP de la lista no se entera: captura sus rectángulos viejos antes y compara por id.

**Trampa de medición que costó una hora, para el siguiente**: en una página RECIÉN cargada el primer render del cliente sustituye el orden del servidor (cronológico desde D-131) por el de la sesión — cualquier sonda que marque nodos antes de que eso asiente concluye "no se reutiliza nada" y es falso. Sondear siempre sobre página asentada.

**2. El tirador "tardaba un espacio" en arrancar.** Preexistente, destapado por el reorden en vivo: la caja del tirador (~66px) CUELGA a un lado de su ancla (el piquito marca el año; el `-72px` es de D-021 para el margen de 24px en el extremo) y el arrastre mapeaba el cursor a la posición ABSOLUTA del año sin compensar por dónde se agarrara la caja — agarrándola por el centro había ~39px de zona muerta hacia un lado y el cursor viajaba fuera de la caja todo el gesto (medido). Arreglo clásico: `agarreOffsetPx` se memoriza en `beginDrag` y se resta en cada movimiento. Verificado: 1:1 desde el primer píxel, por el centro o por el borde.

Pendiente de validación del propietario en móvil real (Chrome y Safari).

## D-250 · Marcadores: la sombra bajo el triángulo y al 60% en hover; clusters quietos con número rodante

Rama `feature/marcadores-sombra-y-clusters`. Dos peticiones del propietario.

**1. Sombra.** (a) Pintaba POR ENCIMA del triángulo del puntero — es el último hermano del wrapper y el único posicionado. Arreglo mínimo: `z-index: 1` en `.mel-marker-pointer`, que al ser item de un flex no necesita posicionarse para que le aplique. (b) En hover ahora encoge hasta el **60% de su ancho original** (antes 4px por lado, apenas perceptible): en reposo ocupa el 78% del wrapper (11% por lado) → 46,8% de ancho → `left/right: 26.6%`, centrada. Verificado computado: 78% → 46,8% exactos, con su transición de siempre.

**2. Los "saltitos" de los clusters al mover el slider.** El clusterer no es incremental: en cada cambio de membresía destruye y recrea TODAS las burbujas, y cada recreación repetía la animación de entrada (`marker-fade-in`, rebote de escala 0.6→1.08) — eso eran los saltitos. Ya existía un camino rápido para cuando solo cambian los números (D-230), pero escribía el texto a seco.

Arreglo en dos piezas, con una memoria nueva (`ultimaCifraDeCluster`, por locKey del pin — la clave viaja ahora en el propio marcador como `melLocKey`):
- Una burbuja recreada cuyos miembros ya estaban en un grupo visible es una CONTINUACIÓN: nace con `.sin-entrada` (sin rebote) y su número RUEDA desde la cifra anterior con el mismo `animateValue` de las tags de la cabecera, al que se le añadió un `prefix` opcional para el `+` (el aviso de los dos escritores del `+` sigue vigente; ahora ambos pasan por el prefijo).
- El camino sin cambio de topología también rueda en vez de reescribir a seco.
- La entrada con rebote queda solo para grupos que aparecen de verdad (carga inicial). Al partirse un grupo por zoom, cada hijo rueda desde la cifra del padre hacia la suya.

Medido en navegador: rodillo cazado a medias (+36 → +33 → +30 → +28 en muestras de ~100ms), `sin-entrada` presente en las burbujas recreadas, cero en el estreno del mapa, consola limpia. Lo que el movimiento de cámara o un centroide que cambia de sitio muevan de verdad, se mueve — eso es el mapa siendo honesto, no el bug.

**Segunda ronda (mismo día, tras la primera prueba del propietario, que validó lo anterior):**

- **La sombra del hover sube del 60% al 72%** del ancho original (56,2% del wrapper → `left/right: 21.9%`). Medido: 72,1%.
- **El pin que salía de un cluster se materializaba 150ms**: el desvanecido de salida (`.exiting`) se aplicaba a TODO el que dejaba el filtro, incluidos los miembros plegados dentro de un cluster — que tienen `map` null y nadie había visto nunca; ponerlos en el mapa para el fade los hacía aparecer de la nada justo cuando la cifra del grupo bajaba. Ahora se anota si el pin estaba a la vista ANTES de los lotes del clusterer (que le anulan el `map`) y solo los visibles se despiden con fade; la despedida de un miembro plegado es la cifra del grupo bajando con el rodillo.
- **Un cluster que subía de cifra se plantaba por delante de todos, con sombra y todo** (hipótesis del propietario: "cuenta como nuevo" — correcta en el efecto). La causa exacta: el reordenado por pantalla que ya corría tras cada filtrado (rAF) descarta cajas con alto 0, y una burbuja recién creada por el clusterer aún no ha montado en ese fotograma — se saltaba el reparto y conservaba su z de latitud (~47000) frente a los 1000+i del resto hasta el siguiente movimiento de cámara. Es la rendija entre "el marcador existe" y "el marcador mide": una SEGUNDA pasada de `reordenarMarcadoresPorPantalla()` a los 150ms (idempotente, 7-8 cajas) la cierra. Verificado: tras el asentado, todos los z en escala de pantalla (1000-1003), ninguno colado en la de latitud.

Pendiente de validación del propietario.

## D-251 · El arrastre del slider anima por FLIP, no por view transition; y guardería de tarjetas retiradas

Rama `feature/galeria-flip-arrastre`. Cierra la auditoría de fluidez que pidió el propietario (las cards en blanco de Chrome móvil persistían tras D-249).

**El diagnóstico que faltaba**: la reconciliación de D-249 conservó los nodos y sus imágenes descodificadas, pero cada tarjeta lleva `view-transition-name` propio (el morph a su ficha), así que **cada cruce de año fotografiaba ~32 grupos** — y encadenado durante un arrastre eso desborda el presupuesto de texturas de un móvil: Chrome pintaba los grupos en blanco aunque la imagen estuviera perfecta debajo. No era carga de red ni descodificación; era el coste de fotografiar.

**Decisión**: durante el ARRASTRE no hay view transition (vuelve el `!arrastrandoSlider` de siempre en la condición). El reorden lo anima un **FLIP dentro de `performDOMUpdates`** (regla 2: animación contenida = transforms): las supervivientes VIAJAN de su posición visual a la nueva — al quitar años antiguos con orden cronológico se las ve SUBIR ocupando los huecos, la lectura que pedía el propietario — y las entrantes hacen un fundido corto (`.card-entra`). Los rects viejos se capturan antes de reconciliar, con el vuelo anterior incluido: un cruce que pilla tarjetas a medio vuelo las redirige desde donde estén. La view transition queda para lo discreto (búsqueda, sort, clic en barra), donde el crossfade y el morph aportan. La serialización de D-248 se retiró: era el remedio para encadenar transiciones y ya no se encadena ninguna. La Lista, de rebote, se queda solo con su FLIP de filas durante el arrastre — el "fundido que confunde" era el crossfade de raíz corriendo POR ENCIMA de él.

**La trampa que casi entierra el FLIP (una hora de caza)**: `.gallery-item` lleva su transición de hover **con `!important`** (línea ~756), así que el patrón FLIP clásico —`transition: none` para colocar la inversión, reactivar para volar— pierde SIEMPRE contra esa regla: las tarjetas saltaban en seco, comprobado con el patrón aislado en el navegador. La salida: **Web Animations API** (`el.animate()`), que va por fuera de la cascada — ni lee ni escribe `style.transition`, le gana a la transición en el orden de composición y se limpia sola. Ojo para D-131 pendiente 1 ("las cartas no se mueven al ordenar… el propietario sigue viéndolo quieto"): el FLIP de la Lista usa el patrón clásico con inline styles sobre `<tr>` — allí no hay `!important` que estorbe, pero si algún día se le ve quieto, esta es la primera trampa que descartar.

**Guardería de tarjetas retiradas** (idea del propietario): una tarjeta que sale del rango no se destruye — se guarda desmontada con su `<img>` cargada (`guarderiaTarjetas`, tope 150) y revive tal cual si su año vuelve. Medido: recorte de años y vuelta → las 32 tarjetas finales eran los MISMOS nodos de partida. La precarga "dos años por delante" queda aparcada: la guardería cubre el caso real (volver hacia lo ya visto) gratis.

**Además**: el `change` del soltar y el segundo disparo del clic en barra ya no refiltran el mismo rango que acaba de pintarse (eran 32 grupos fotografiados para un no-op, justo al soltar).

Medido en navegador: 0 view transitions durante un vaivén completo de arrastre (antes: una por cruce), 22 tarjetas volando por WAAPI en un cruce con 6 entrando en fundido, retargeting limpio en cruces encadenados, búsqueda conservando su transición (1), consola limpia. **El parpadeo del slider con sort activo (punto 4 del propietario) queda pendiente de revalidar en dispositivo**: sus mecanismos candidatos eran las transiciones por cruce, que ya no existen.

Pendiente de validación del propietario en móvil real (Chrome y Safari).

## D-252 · Afinado del FLIP del arrastre: compás, despedidas, scroll respetado — y el "siempre bajan" de la Lista

Rama `feature/galeria-flip-arrastre`, segunda tanda tras la primera prueba del propietario ("muchísimo mejor", con matices). Sus cuatro puntos más un quinto de la Lista:

1. **Curva y duración compartidas** (`FLIP_DUR = 450ms`, `FLIP_EASE = cubic-bezier(0.3, 0, 0.25, 1)`): la anterior (0.16, 1, …) disparaba las tarjetas de salida y solo suavizaba el aterrizaje. Vale para galería Y lista (el propietario pidió la misma respiración).
2. **El compás ("interpolación", idea del propietario)**: el throttle del arrastre pasa de 120ms-solo-táctil a `FLIP_DUR + 30` para CUALQUIER puntero — ningún filtrado nuevo hasta que el vuelo en curso termina; en un arrastre rápido los años intermedios no se reproducen, el disparo agrupado lee el rango vigente. Supersede la exención del ratón de D-086 r6 (tenía sentido cuando el throttle protegía al hilo principal).
3. **Despedidas y entradas**: la tarjeta que sale hace de fantasma ELLA MISMA (absolute sobre la rejilla — que ahora es `position: relative` —, sin `data-id` para que ni la reconciliación ni el FLIP la confundan) encogiendo al 90% mientras funde, y después pasa a la guardería con su imagen descodificada — clonarla habría estrenado una `<img>` en blanco, la enfermedad que venimos curando. Las que entran crecen desde el 92%, espejo de la salida.
4. **El slider ya no resetea la posición** — ni arrastrando, ni al soltar, ni con clic en barra: quien está al final del scroll se queda donde está. La búsqueda conserva su vuelta arriba (tiene su propio `reiniciarPosicion()`). Para que un recorte de scroll (contenido que encoge) no ensucie los vuelos, TODOS los FLIP miden ahora en coordenadas RELATIVAS a su contenedor, no al viewport.
5. **El "siempre bajan" de la Lista, cazado**: la tabla y las tarjetas móviles comparten los mismos `idMel` y volcaban sus rects viejos en UN solo mapa — el contenedor oculto (tabla en móvil, tarjetas en escritorio) aportaba rects de tamaño CERO que machacaban los buenos según el orden de captura, y un delta contra (0,0) hacía que toda fila pareciera venir de arriba y bajara, quitaras los años que quitaras. Arreglo: sin caja no hay posición (se saltan los rects de alto 0) + captura relativa al contenedor.

**Verificación: BLOQUEADA por el entorno, pendiente del propietario.** La tarde de caza que siguió a estos cambios acabó descubriendo que el panel de pruebas había dejado de producir fotogramas (ver traspaso.md): `requestAnimationFrame` no dispara NUNCA, así que el primer rAF de `scheduleFilterArchives` no corre, `sliderUpdateScheduled` queda atascado en true y el slider parece muerto — CON EL CÓDIGO SANO. Se comprobó además que la hoja de Google, saturada de recargas, sirve intermitentemente páginas-carcasa de 3KB. Ninguna de las dos cosas ocurre en un navegador real en primer plano. La mecánica de D-251 quedó verificada esta tarde con el panel aún vivo (22 tarjetas volando, guardería reviviendo los 32 nodos); lo nuevo de D-252 está pendiente de ojos del propietario en dispositivo.

## D-253 · Matices del vuelo tras la segunda prueba del propietario

Sobre D-251/D-252, validados en lo grueso ("está mucho mejor"). Seis ajustes:

1. **`FLIP_DUR` baja a 350ms** (de 450, criterio del propietario). El compás del arrastre lo sigue a través de `FLIP_DUR + 30`.
2. **La entrada de tarjetas estaba MUERTA, no mal afinada**: `card-entra` cayó en el bloque `<style>` CON ÁMBITO de index.astro — el cid de Astro no viste a las tarjetas creadas por JS (la trampa D-239 una vez más, ahora en su variante "bloque equivocado de los tres"). El "van casi del tirón" del propietario era literal: la regla no aplicaba. Movida al bloque `is:global` y de paso hecha espejo exacto de la despedida (crece desde el 90% fundiendo, 260ms ease-out). **Moraleja para el monolito: index.astro tiene TRES bloques `<style>` — 210 (ámbito), ~600 (ámbito) y ~737 (`is:global`) — y toda regla para marcado que fabrica el JS tiene que ir al tercero.**
3. **El remate del soltar viaja como el arrastre** (`vueloDeSoltado`): la pasada agrupada pendiente que descargaba el `change` del soltar corría como view transition DISCRETA justo al soltar — sospechosa firme de los dos parpadeos que reportó el propietario en ese instante (el fondo de la toolbar desapareciendo un momento, y el slider tras ordenar en Lista). Ahora esa pasada usa el camino FLIP, como el resto del gesto. Pendiente de que él confirme que ambos parpadeos mueren con esto.
4. **El compás solo con la Galería a la vista**: en la Lista las filas no marean (criterio del propietario) y se reproducen todos los años; allí vuelve el throttle corto de 120ms (D-086 r4), que protege el hilo sin agrupar.
5. **Lista en móvil**: las tarjetas llevan fondo propio (se transparentaban durante los vuelos) y la que sale COLAPSA fundiéndose (260ms) en vez de desaparecer a pelo — el colapso desliza a las de abajo de forma natural y no se pelea con el FLIP, que mide con la moribunda aún entera. La moribunda pierde su `data-id` durante la agonía para que pasadas siguientes no la resuciten. La tabla de escritorio conserva la salida instantánea (los `<tr>` no colapsan bien; se valorará si molesta).
6. **Área táctil de los tiradores +12px por lado** (pseudo-elemento invisible; en esa franja el clic-en-barra pasa a ser agarre, que es lo que un dedo espera ahí).

**Verificación**: build OK; el panel sigue sin producir fotogramas (trampa 5 del traspaso), así que la validación visual es del propietario.

## D-254 · Escritorio de la Lista con despedidas, y nadie mueve lo que ya está en su sitio

Tercera pasada de matices sobre el FLIP, tras validar el propietario D-253 en móvil ("se ve increíble") y confirmar que los parpadeos del soltar murieron con `vueloDeSoltado`.

**1. El parpadeo de las tarjetas de ARRIBA al recortar por la derecha** (reportado en la lista móvil, cuando solo deberían irse las del final): la reconciliación hacía `appendChild` incondicional — **movía TODOS los nodos en cada pasada** aunque el orden no cambiara, y en iOS mover un nodo con `<img>` puede repintarla. Ahora las tres vistas colocan con cursor: un nodo que ya es el siguiente del anterior colocado **no se toca**. En una pasada que solo recorta por el final, ningún superviviente se mueve del DOM.

**2. La tabla de escritorio se une a las despedidas**: las filas que salen funden en su sitio (200ms) y, al apagarse la última, las supervivientes VUELAN a ocupar el hueco de una vez (mini-FLIP propio con WAAPI). Un `<tr>` no se puede colapsar como un div — no admite `overflow` ni altura animable con celdas de alto fijo — así que el patrón es fundido → vuelo, en dos tiempos, frente al colapso continuo de las tarjetas móviles. Las moribundas pierden su `data-id` durante la agonía (mismo criterio que móvil y galería) para que ni pasadas siguientes ni el FLIP ordinario las cuenten.

**Verificación**: build OK; el panel de pruebas sigue sin fotogramas — validación del propietario.

## D-255 · Lista con UNA sola despedida/llegada en todas partes, y el sort viaja por FLIP

Cuarta pasada de matices, con dos encargos del propietario.

**1. Lista unificada, con el efecto que él señaló como referencia** (el pliegue+fundido de las tarjetas móviles): un solo par de ayudantes, `plegarYRetirar()` / `desplegarFila()`, sirve a tarjetas móviles Y filas de tabla — las vecinas se deslizan solas por el reflujo del colapso, sin FLIP aparte. Un `<tr>` no colapsa como un div (ni overflow ni altura animable con celdas de alto fijo), así que en la tabla se pliegan sus CELDAS: paddings, `line-height` y el bloque interior de la primera. Con WAAPI y no clases CSS, por la trampa de ámbito de siempre (D-253). La entrada es el espejo exacto del pliegue — la clase `list-row-intro` deja de usarse en este camino (el fundido corto se leía "del tirón" al lado del pliegue). Supersede el fundido→vuelo en dos tiempos de la tabla (D-254, vivió una tarde).

**2. El sort del botón viaja por FLIP de identidad** (petición expresa, también por el rendimiento en Chrome móvil): cada cartel VUELA a su sitio nuevo, en vez de la view transition por huecos que emparejaba por posición — lo que el propietario veía como "tarjetas que se transforman en otras" era exactamente eso, el hueco 3 viejo fundiéndose con el hueco 3 nuevo fuera quien fuera. Conserva su ritmo deliberadamente lento (D-131: `duracionOrden` variable con la distancia + su curva propia). Sin fotografías: fuera el coste de 32 snapshots también aquí.

**Trampa desactivada al migrar**: `nombrarHuecos(true)` se llamaba dentro de performDOMUpdates al ordenar, y quien deshacía los nombres era el `finished` de la transición — en el camino FLIP habría dejado `mel-hueco-N` puestos PARA SIEMPRE, rompiendo el morph a la ficha. Retirada la llamada; el mecanismo entero de huecos queda solo en el camino residual de transición (documentado como tal). El salto de scroll al ordenar pasa a ser instantáneo — los vuelos van en coordenadas de la rejilla y no se contaminan; si al propietario le falta aquella fusión scroll+reorden, se revisita.

**Verificación**: build OK; panel aún sin fotogramas — validación del propietario. El tercer encargo (adoptar el orden servido al entrar de nuevas, para matar las tarjetas en blanco del primer arrastre) va en tanda propia: toca el contrato de navegación.

## D-256 · El empujón al fondo de las moribundas, ritmos escalados, y RETIRADO el morphing de vuelta

Quinta pasada, tras validar el propietario el pliegue móvil y el sort por FLIP ("mola porque parece más real"). Tres frentes:

**1. "Las de arriba desaparecen sin animación" (escritorio), cazado por lógica**: la colocación con cursor (D-254) insertaba cada fila viva DELANTE de la moribunda de arriba, empujándola paso a paso al fondo de la tabla — colapsaba en el sitio equivocado o fuera de la vista. Las del final no tenían a nadie que las empujara, por eso "estaban genial". Arreglo: la colocación SALTA los estorbos (moribundas de esta pasada o de anteriores, y fantasmas) al buscar el siguiente — nadie los desplaza y colapsan donde vivían. Aplicado a tabla, tarjetas móviles y galería (allí el fantasma es absoluto y se pintaba bien igualmente, pero el salto evita mover de DOM a las tarjetas vivas posteriores).

**2. Entradas y despedidas de la galería escalan con la pasada** (`dur/3`, acotado 260–500ms): con el sort lento (~1500ms de vuelo), las salidas/entradas fijas de 260ms hacían que media rejilla apareciera "de golpe" al lado de vuelos majestuosos — hipótesis firme para el "la vuelta al orden original no anima" del propietario (el barajado reemplaza ~la mitad de la ventana visible; los vuelos estaban, pero quedaban enterrados bajo un relevo brusco). La entrada pasa de clase CSS a WAAPI (mismo motivo de ámbito de siempre, y así entra en `vuelosGaleria` y los cruces encadenados la redirigen).

**3. RETIRADO el morphing de vuelta evento → galería** (decisión del propietario): con la galería reconstruyéndose al volver (orden de sesión vs. servido) y las tarjetas más allá del primer lote sin existir en el momento de la foto, ese morph no puede ser fiable — aterrizaba en la columna equivocada y hasta desplazaba la tarjeta después. En `astro:before-preparation` de la ficha (ANTES de que el ClientRouter fotografíe el estado viejo; `before-swap` llega tarde), si el destino es `/`, el cartel pierde su `view-transition-name`: sin pareja, la vuelta es un fundido limpio de raíz. La IDA galería → evento no se toca. El scroll restaurado al volver sigue siendo cosa de `applyReturnState` (sin cambios).

**Verificación**: build OK y sintaxis del script inline comprobada con node; panel aún sin fotogramas — validación del propietario.

## D-257 · La cabecera no se colocaba tarde: la tapaban las tarjetas. Y el cartel de la galería, de fondo en la ficha

Sexta pasada. El propietario graba la vuelta evento → galería en Chrome de iPhone y reporta cuatro cosas: el fundido de vuelta es imperceptible, la cabecera hace cosas raras, el scroll se mueve un poco y no está seguro de que las tarjetas no sigan cambiando de sitio. Además pide repasar la entrada, que se ve "lenta y a dos tiempos". Se evaluó el vídeo fotograma a fotograma (ffmpeg a 10 y 20 fps) ANTES de tocar nada, por petición suya.

**El diagnóstico completo de la vuelta, medido**: el fundido dura un fotograma porque es el de raíz por defecto de Astro (250ms) y nunca se le puso otro, y como las dos páginas comparten fondo no se ve. Lo demás —tarjetas en blanco, scroll moviéndose, rejilla recolocándose— es UNA sola cosa: la home vuelve del servidor con su primer lote y el cliente la reconstruye al orden de sesión y al número de lotes guardado, así que cada tarjeta más allá del primer lote es un `<img>` nuevo; el masonry re-mide según llegan las imágenes y `volverAlFlyer` reafirma el scroll encima de una rejilla que crece. El velo de `ocultarParaColocar()` existe pero se levanta a los 700ms como tope, o sea antes de que haya píxeles. **Nada de esto es el morphing** (retirado en D-256 y no reaparece en ningún fotograma).

**Vía muerta descartada, y anotada para que nadie la repita**: la primera hipótesis fue que el slider se posiciona tarde porque `minHandle.style.left` solo lo escribe el JS. **Es falsa**: `TimeSlider.astro` ya sirve los tiradores y el relleno colocados desde el servidor (`left: 54px` / `left: 24px`), y esos valores coinciden exactamente con lo que calcula el JS a rango completo. Comprobado en el HTML servido antes de cambiar una línea.

**La causa real, ampliando el vídeo a 20 fps sobre la cabecera**: durante la transición se ven **dos rectángulos blancos en dos columnas** tapando el slider ~200ms. Son las primeras tarjetas de la galería: llevan `flyer-img-…`, la transición las promociona a la capa superior del navegador (regla 2) y ahí `mel-slider` estaba en la capa 0 igual que ellas — a igualdad de `z-index` manda el orden del documento, y las tarjetas van después. Le faltaba el `z-index: 100` que la cabecera, la toolbar y la paginación tienen desde D-116 y D-131. Arreglo: una línea, el mismo remedio.

**La entrada a dos tiempos**: el morph lleva la tarjeta a su sitio en ~200ms y aterriza en una caja VACÍA; la foto aparece ~500ms después. La causa es el `srcset` por pantalla: la tarjeta se baja el cartel a 700 u 1000 de ancho (`ANCHOS_TARJETA`) y la ficha lo pide a 1400 o 2000 (`ANCHOS_FICHA`) — otro ancho es otra URL, o sea otra descarga desde cero, y lo que la galería ya tiene en caché no se aprovecha. Arreglo: `recordarFlyerAbierto()` guarda el `currentSrc` de la tarjeta (no el `src`: con `srcset` quien elige es el navegador y solo él sabe cuál bajó) y la ficha lo pinta de fondo mientras viaja el grande, retirándolo en el `load` (hay carteles PNG con transparencia y si no se verían superpuestos). Se busca con `querySelectorAll` y se coge la primera con `currentSrc`: el mismo evento está a la vez en galería, tabla y tarjetas de móvil, y las de los contenedores ocultos no han cargado nada.

**Verificación**: build OK; ambos scripts inline parsean; el ciclo del fondo comprobado en navegador con un `MutationObserver` a través de una navegación suave — fondo puesto con la imagen buena aún sin cargar y retirado 143ms después justo al cargar. **Lo que NO se puede verificar aquí**: el apilamiento de los pseudo-elementos de view transition en móvil, que es exactamente lo que costó las horas de D-249 — el `z-index` del slider necesita el teléfono del propietario.

**Lo que queda pendiente y por qué no se hizo**: el propietario pidió que la salida del evento sea un fundido lento que le deje donde estaba "sin que nada se esté moviendo por detrás". Eso NO se arregla con la duración del fundido: mientras la vuelta sea una navegación de verdad, la home se re-renderiza y el cliente la reconstruye, y cualquier fundido funde una página que va a moverse. La vía acordada es que el velo espere a los píxeles (que las tarjetas visibles tengan su imagen decodificada) en vez de al reloj de 700ms, y entonces revelar con un fundido de 400–500ms. Va junto con la tanda del "orden al entrar", que ataca la misma reconstrucción.

## D-258 · La red de las imágenes: fuera el peaje de Drive, preconnect, prioridad a la primera pantalla y CDN de 5 minutos

La tanda "orden al entrar" empezó por verificar y el diagnóstico cambió de marco. Comprobado en navegador con sesión limpia: **en una entrada fresca el DOM servido y la secuencia de sesión YA coinciden** (el servidor sirve cronológico desde D-131 y `seedSessionOrder` adopta ese orden al nacer) — el desajuste que reconstruye tarjetas solo existe tras un F5 con barajado/orden activo (que sobrevive a propósito, decisión del propietario) y en la vuelta de ficha (contrato). El comentario de `seedSessionOrder` que decía "el servidor baraja en CADA render" era de la era pre-D-131. La lentitud y las tarjetas en blanco de la primera impresión eran, sobre todo, **un problema de red**. Cuatro arreglos, medidos antes de tocar:

**1. El peaje de Drive, suprimido.** `drive.google.com/thumbnail?id=ID&sz=wN` no sirve la imagen: responde un **302 con `no-store`** hacia `lh3.googleusercontent.com/d/ID=wN`. Un redirect no cacheable se repaga entero en cada carga: ~0,24s por foto, para siempre (0,48s vía Drive contra 0,24s directo, medido con curl). La imagen final responde `private, max-age=86400` — **el navegador SÍ la cachea 24h**, cosa que el roadmap daba por imposible (era verdad solo del salto). `extractDriveImage()` (mel.ts y su gemela inline de index.astro) emite ahora la URL directa. Los 32 IDs de la primera pantalla verificados con `200` en el endpoint directo. Ambos endpoints son igual de no-documentados; el directo es el que Drive usaba por debajo. Documentación tocada: regla 8 y stack de AGENTS.md, architecture.md, imagenes.md.

**2. `preconnect` a `lh3.googleusercontent.com`** en Layout.astro. Fuentes y mapas lo tenían; el dominio del que viene TODO el peso del sitio, no. Sin `crossorigin` a propósito: los `<img>` van en modo no-cors y un preconnect crossorigin abre una conexión que esas peticiones no reutilizan.

**3. Prioridad a la primera pantalla.** Las 32 tarjetas SSR iban todas `loading="lazy"`, incluidas las que se ven nada más entrar — el navegador degradaba exactamente las fotos de la primera impresión. `FlyerCard` estrena prop `prioridad` (eager + `fetchpriority="high"`), que el SSR pone en las 8 primeras. La réplica `buildGalleryCard()` queda en `lazy` fijo y NO es divergencia del espejo: todo lo que construye JS es de la tarjeta 33 en adelante o repintados, nunca primera pantalla (avisado en el propio componente). El primer cartel de la ficha lleva también `fetchpriority="high"` (es su LCP); los carteles 2+ del carrusel se quedan eager como estaban — ponerlos lazy arriesgaba un hueco en blanco al deslizar.

**4. Caché de CDN para el HTML: 5 minutos, fijados por el propietario.** El SSR esperaba a Google Sheets EN CADA request antes de mandar un byte (y a veces Google respondía el shell rate-limitado de 3KB — trampa 7 del traspaso, que ahora además queda amortiguada). Las tres páginas que leen la hoja (home, ficha, info) responden `Cache-Control: public, max-age=0, must-revalidate, s-maxage=300, stale-while-revalidate=600`: Vercel sirve la copia cacheada al instante y renueva por detrás. La página es idéntica para todos (lo personal vive en sessionStorage), así que cachearla no rompe nada. En la ficha, la cabecera se pone DESPUÉS del rewrite al 404: un enlace roto no debe dejar un "no existe" cacheado justo durante los 5 minutos en los que un evento recién añadido aún puede no estar.

**Efecto esperado en cadena**: la primera pantalla llega antes (preconnect + prioridad + sin peaje + TTFB de CDN); las revisitas, las vueltas de ficha y las tarjetas reconstruidas tras un F5 barajado salen de la caché del navegador — que es lo que de verdad mata las tarjetas en blanco, vengan del orden que vengan. **Posible efecto lateral a comprobar en iPhone**: el bloqueo de Safari (roadmap 12) estaba diagnosticado contra `drive.google.com`, que ya no se pisa.

**Verificación**: build OK; HTML servido comprobado con curl (33 URLs lh3, 0 thumbnail, 8 eager+high, preconnect presente, cabecera de caché en las tres páginas); scripts inline parsean; en el navegador del entorno las 8 prioritarias se disparan al instante (la prioridad actúa) pero el panel bloquea las cargas externas de imagen y sigue sin fotogramas — **la validación visual y el efecto real en Chrome móvil son del propietario**, igual que el s-maxage, que el dev server solo emite y solo Vercel honra.
