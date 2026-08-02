# Flujos de progreso y nota — panel de control del archivo

**Fecha**: 1 de agosto de 2026
**Estado**: propuesta de diseño, pendiente de revisión del propietario. Nada de esto está implementado.
**Alcance**: dos piezas de interfaz sobre el panel que ya existe en `/panel` (pestaña Control):

- **Flujo A** — qué ve el usuario mientras un arreglo en bloque se está aplicando, y qué se le dice al terminar.
- **Flujo B** — dónde y cómo deja una nota al ocultar un aviso a propósito.

Sin nodo de Figma: no hay boceto previo para los tres estados del modal en bloque
ni para el popover de nota. Toda la geometría de este documento es propuesta
nueva dentro de los tokens del sistema — el propietario aún tiene que verla.

---

## Punto de partida: tres cosas que no cuadraban con el encargo

Antes de diseñar, miré el código real (`src/pages/panel.astro`,
`src/components/PanelSeccion.astro`) y el plan de implementación
(`docs/superpowers/plans/2026-07-31-panel-control-archivo.md`). Tres cosas del
encargo no coinciden con lo que hay hoy. Las digo aquí en vez de diseñar sobre
un supuesto falso.

**1. El modal de confirmación no existe todavía en `/panel`.** El encargo decía
"ahí ves el modal de confirmación". No está: los botones de acción (`.fila-accion`,
`.accion-seleccionados`) nacen `disabled` en el SSR y el script de cliente no
tiene ningún manejador de clic para ellos (`panel.astro`, función `alPulsar`,
líneas 493-536). El propio historial de commits lo confirma: `cc54679`
*"docs(panel): el modal de confirmacion entra en la tarea 7"* — está diseñado
(Figma `1215:219163`, ver plan líneas 888-935) pero no construido. Lo que sí
existe y aprobó el propietario es el modal **para una sola pieza**: visor de
cartel a la izquierda, checklist de "Otras mejoras recomendadas" a la derecha.
El plan deja explícitamente pendiente **"qué forma toma la confirmación de las
acciones en bloque, donde no hay un cartel ni un ID único que enseñar"** (plan,
línea 926) — que es exactamente donde empieza el Flujo A de este documento. No
rediseño el modal de una pieza; propongo el tramo que falta (confirmación en
bloque) y diseño lo que el encargo pide de verdad: el estado en curso y el
resumen.

**2. "Se vuelve a subir a Drive sustituyendo el original" es la fase 2, que
todavía no existe.** El plan es explícito: la fase 1 (lo que se construye
primero, tarea 7) **no toca Drive** — procesa y dejas los ficheros en una
carpeta local (`arreglos/<fecha>/`) para subirlos a mano con «Gestionar
versiones». La subida automática es la fase 2, y necesita una cuenta de
servicio de Google "aún no decidida" (spec del 31/07, sección "Arreglar, en dos
tiempos"). Son dos resultados distintos, así que diseño los dos textos de
resumen — siguiendo el mismo criterio que ya aplicó el propietario al modal de
una pieza: *"el texto se escribe para la fase que se implemente"* (plan, línea
933). Fase 2 es el diseño principal de este documento porque es el que carga el
riesgo real (sustitución irreversible) que el encargo pide resolver; fase 1
lleva su propia variante de cada texto.

**3. Escribir `#acepta:<clave>` en la hoja tampoco está conectado hoy.** El
botón «Ocultar aviso» que ya existe solo oculta la fila en la sesión del
navegador (`fila.style.display = 'none'`, sin ningún `fetch`) — se resetea al
recargar. La persistencia en `notasArchivo` es el comportamiento **documentado**
en el spec del 31/07 ("Silenciar un aviso"), no el que corre hoy. Diseño el
Flujo B asumiendo que esa escritura se conecta como parte de esta misma mejora,
igual que el encargo lo da por hecho.

---

## Flujo A — durante el arreglo, y el resumen

### Punto de partida

El usuario ya seleccionó filas dentro de **una** sección (la selección vive
dentro de una sección expandida, así que todas comparten la misma operación:
`grupo.accion`, una de estas cinco — ver `src/lib/auditoria.ts`):

| `clave` | Operación (`accion`) | Hoy, en el archivo |
|---|---|---|
| `png` | Convertir a JPG | 33 |
| `enorme` | Reducir a 2400 px | 6 |
| `no-srgb` | Pasar a sRGB | 13 |
| `pesado` | Recomprimir | 25 |

33 es el máximo real hoy (sección PNG) — el "hasta 33 carteles" del encargo. El
ejemplo que uso en todo este documento es esa conversión PNG→JPG; las otras
cuatro siguen la misma plantilla (tabla al final de esta sección).

Los tres estados que siguen viven en **un único componente modal**, que
sustituye su contenido interior en cada transición — no se cierra un modal y se
abre otro. Es la misma filosofía que ya aplicó el propietario al modal de una
pieza: *"las secciones siguen siendo el diagnóstico [...]; el modal es donde se
decide el conjunto"* — aquí, un solo modal es donde se decide, se espera y se
informa.

**Contenedor, común a los tres estados** (propuesta — no hay Figma):

- Ancho `640px`, alto automático (el contenido decide, no un valor fijo como el
  modal de una pieza).
- `bg-mel-bg-secondary` (la tabla de tokens ya asigna ese fondo a "modal"),
  `border border-mel-border`, `shadow-[var(--mel-shadow-menu)]`.
- Overlay: `bg-[var(--mel-dim)] mix-blend-multiply`, `z-[200]` (por encima del
  `z-[190]` del `SideMenu` — nada de este panel debe quedar visible detrás).
- Padding interior `p-6` (24px), esquinas rectas, sin excepción.
- Botón de cerrar: `<IconButton icon="x" type="phantom" size={24} />` en la
  esquina superior derecha, en la misma posición en los tres estados
  (habilitado o no cambia; su sitio, no).

### Estado 0 — Confirmar (propuesta, extiende la decisión pendiente del plan)

Franja vertical de `8px` en `bg-mel-le-400` a la izquierda del modal — el
mismo primitivo que ya autorizó el encargo para "la barra indicadora del
modal", resolviendo a favor de `le-400` la pregunta que el plan dejaba abierta
para la barra del modal de una pieza (*"le-400 del boceto [...] o
action-primary"*, plan línea 924). Marca "aquí se decide algo", igual que en
el modal de una pieza; desaparece en los otros dos estados porque ya no hay
nada que decidir.

**Título** (`typo-h4`, `text-mel-text-primary`):

> **¿Seguro que quieres convertir a JPG estos 33 carteles?**

**Cuerpo** (`typo-lead`, `text-mel-text-secondary`), fase 2 (objetivo final):

> Cada fichero se descarga, se procesa y sustituye al original en Drive,
> conservando su ID. La sustitución no se puede deshacer automáticamente: Drive
> conserva versiones anteriores solo si se marcan como permanentes.

Fase 1 (lo que existe primero — sin subida automática):

> Cada fichero se descarga, se procesa y se guarda en una carpeta en tu Mac. No
> se toca nada en Drive: tendrás que subir cada resultado a mano con «Gestionar
> versiones» cuando lo revises.

**Pie**, dos botones, `gap-4` (16px), en este orden — la opción segura primero,
la que compromete después, y el foco inicial en la primera:

- `Dejar los archivos como están` — contorno (`BTN_CONTORNO`, ya definido en
  `PanelSeccion.astro`).
- `Convertir a JPG` — sólido (`BTN_SOLIDO`). El botón nombra la operación real,
  no un genérico "Confirmar" — dice la consecuencia, no pide un acto de fe.

Clic fuera del modal o Esc = igual que "Dejar los archivos como están": no pasa
nada, nada se toca.

### Estado 1 — En curso

Esto es lo que el encargo pide resolver primero: hoy, aquí, no hay nada durante
uno o dos minutos.

**No hay contador real de progreso.** La ruta planeada (`POST
/api/panel/arreglar`, plan tarea 7) responde una vez, al terminar los N
ficheros — no hay *streaming* ni *polling* por fichero. Un contador "12 de 33"
en ese punto sería inventado, no medido, y este proyecto ya tiene una regla
para eso: no se dice algo como si se supiera cuando no se sabe. La opción
honesta con la arquitectura ya planeada es un estado indeterminado que deja
claro que sigue vivo, no un progreso falso. Si el día de mañana la ruta emite
progreso real (respuesta en *streaming*), esta pantalla puede pasar a contador
real — hoy sería mentira.

**Icono**: mismo SVG que ya usa el botón «Releer el archivo» (las dos flechas
circulares, `panel.astro` líneas 144-149), con una animación de giro nueva:

```css
@keyframes mel-spin {
  to { transform: rotate(360deg); }
}
.panel-modal-spin {
  animation: mel-spin 1s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .panel-modal-spin { animation: none; }
}
```

24px, junto al título, `gap-3` (12px) — el mismo gap que ya usa el icono del
banner de aviso en `PanelSeccion.astro`; lo reutilizo tal cual por ser el mismo
patrón (icono + texto), no una medida nueva.

**Título** (`typo-h4`, `text-mel-text-primary`), con el número que **sí** se
conoce de antemano (el tamaño de la selección, no el avance):

> **Convirtiendo a JPG 33 carteles.**

**Texto secundario** (`typo-caption`, `text-mel-text-secondary`):

> Puede tardar hasta dos minutos. Cerrar esta ventana no lo detiene — mejor
> espera a que termine.

Esa frase hace dos cosas a la vez: pone expectativa de tiempo y contesta, sin
que haga falta preguntarlo, "¿puedo cancelar" — no, y por eso el botón de
cerrar está deshabilitado (opacidad reducida, sin manejador), en el mismo
sitio donde estará habilitado en el resumen. No desaparece: si desapareciera y
volviera a aparecer, sería un salto de layout sin motivo — mismo criterio que
ya usa este panel para las acciones en bloque ("nacen desactivadas [...] para
que se vea que existen sin que la fila salte").

Esc no hace nada en este estado.

### Estado 2 — Resumen

Nunca "Listo" a secas. El titular dice el resultado exacto, con las dos
cifras — hechos y totales — nunca solo una:

| Fase | Completo (33/33) | Parcial (31/33) |
|---|---|---|
| Fase 2 (con subida) | 33 de 33 carteles convertidos a JPG y sustituidos en Drive. | 31 de 33 carteles convertidos a JPG y sustituidos en Drive. |
| Fase 1 (sin subida) | 33 de 33 carteles convertidos a JPG. Guardados en `arreglos/2026-08-01/`; falta subirlos a Drive. | 31 de 33 carteles convertidos a JPG. Guardados en `arreglos/2026-08-01/`; falta subirlos a Drive. |

Fallo total (0 de N — red caída, por ejemplo): misma plantilla, **"0 de 33
carteles convertidos a JPG. Ninguno se ha tocado."** — el original no se toca
hasta que `sips` termina y el fichero se escribe, así que un fallo total no dejó
nada a medias.

**Si hubo fallos**, debajo del titular: el mismo banner que ya existe en las
secciones (`bg-mel-le-200`, icono `alert-triangle` en `text-mel-action-secondary`,
`py-5 px-6`, a 24px de los bordes) — no invento un color ni un tono de alarma
nuevo, reutilizo el que ya está autorizado para "esto necesita que lo leas".
Cada línea agrupa por **motivo**, no por fichero — con 20 fallos por la misma
razón (el caso real de hoy: PNG con transparencia sin fondo decidido), 20
líneas casi idénticas serían ruido:

> ⚠ **2 sin tocar** — lleva transparencia; falta decidir el fondo antes de
> convertir: MEL-00008, MEL-00019.

Vocabulario de motivos (propuesta — la ruta de la tarea 7 aún no existe, así
que el texto exacto que devuelva puede no coincidir palabra por palabra; esta
es la traducción a la voz del proyecto de las categorías ya previstas en el
plan):

| Categoría | Motivo (texto exacto) |
|---|---|
| PNG con alfa, sin fondo decidido | lleva transparencia; falta decidir el fondo antes de convertir |
| Descarga fallida | no se pudo descargar de Drive |
| Fichero no reconocido | `sips` no lo reconoce; puede estar dañado |
| Subida fallida (solo fase 2) | se procesó bien, pero no se pudo subir a Drive — sigue en la carpeta local |
| ID de Drive inválido | el identificador de Drive de esta fila no es válido |

Debajo del banner, una línea (`typo-caption`, `text-mel-text-secondary`) que
cierra el círculo sin inventar un mecanismo nuevo: los fallidos siguen en la
tabla porque el panel ya recalcula todo tras cada acción (regla del spec del
31/07) — no hace falta un botón de "reintentar":

> Los que no se han tocado siguen marcados en la tabla. Puedes volver a
> intentarlo cuando quieras.

**Pie**: un botón, `Cerrar` (sólido), alineado a la derecha. Cierra el modal y
deja ver el panel ya recalculado — el recálculo ocurre en cuanto llega la
respuesta, no al cerrar, para que no haya un parpadeo de cifras viejas al
cerrar el modal.

No hay botón "Deshacer": ofrecerlo sería mentir sobre una capacidad que esta
interfaz no tiene (recuperar una versión de Drive es cosa de Drive, no de este
panel).

### ¿Se puede cancelar?

No, a partir de que se confirma. Dos razones, no una sola preferencia:

- **Técnica**: la ruta planeada es una única petición HTTP que responde al
  terminar; no hay canal para decirle "para" a mitad (eso exigiría *streaming*
  o un identificador de trabajo consultable, que es más obra de la que la
  tarea 7 tiene planeada). Cerrar la pestaña no para el proceso en el Mac —
  solo hace que no veas el resultado.
- **De producto**: el punto de no-retorno real es la confirmación, no el
  progreso. Uno o dos minutos es corto; pedir que se pueda interrumpir a mitad
  de 33 ficheros añade una máquina de estados (¿qué pasa con el fichero que se
  estaba procesando al cancelar?) para un problema que la ventana de confirmar
  ya resuelve mejor: decide antes de pulsar, no a mitad.

### Qué pasa si falla a mitad

No se para. Seguir con el resto y contarlo todo al final ya es el contrato de
la ruta planeada (`{ok, hechos, fallos, tecnico}` — no *"para todo al primer
error"*), así que el diseño de la interfaz no tiene que inventar nada aquí:
el estado "En curso" no cambia si un fichero falla a mitad (sigue diciendo
"Convirtiendo a JPG 33 carteles" hasta que los 33 se han intentado), y el
fallo aparece agrupado en el resumen, como se ha descrito arriba.

### Las otras cuatro operaciones

Misma plantilla, cambiando el verbo y el número real de hoy:

| `accion` | Título en curso | Titular de resumen (fase 2) |
|---|---|---|
| Pasar a sRGB | Pasando a sRGB 1 cartel. | 1 de 1 carteles pasados a sRGB y sustituidos en Drive. |
| Reducir a 2400 px | Reduciendo a 2400 px 6 carteles. | 6 de 6 carteles reducidos a 2400 px y sustituidos en Drive. |
| Incrustar sRGB | Incrustando sRGB en 34 carteles. | 34 de 34 carteles con sRGB incrustado y sustituidos en Drive. |
| Recomprimir | Recomprimiendo 25 carteles. | 25 de 25 carteles recomprimidos y sustituidos en Drive. |

Con N=1 el titular pierde la "s" ("1 cartel", no "1 carteles") — detalle de
implementación (singular/plural), no de diseño, pero lo dejo anotado para que
no se cuele el plural a pelo.

---

## Flujo B — la nota al ocultar un aviso

### Dónde se pide

**En línea, antes de ocultar — no en un modal aparte.** Ocultar un aviso es
una acción frecuente y de bajo riesgo (escribe una celda de texto; no toca
imágenes ni Drive), muy distinta en severidad del Flujo A. Ponerle el mismo
modal pesado sería tratar un gesto rutinario como si fuera grave — exactamente
lo que este proyecto evita a propósito. Y `Whisper` (el canal de avisos
efímeros que ya existe) no sirve para esto: su propio comentario de cabecera
dice que "recibe un texto y una duración, y ya" — no está pensado para alojar
un campo de escritura, y forzarlo rompería su contrato.

Lo que propongo es un **popover pequeño y ligero**, anclado junto al botón que
se pulsó (`Ocultar aviso` de una fila, o `Ocultar seleccionados` de la barra de
acciones), con posicionamiento `fixed` calculado desde el propio botón —
mismo mecanismo que un menú desplegable nativo, sin backdrop oscuro (a
propósito: la ausencia de scrim ya comunica "esto es ligero", en contraste con
el dim del Flujo A).

**Geometría** (propuesta, sin Figma):

- Ancho `360px`, alto automático. `bg-mel-bg-secondary`, `border
  border-mel-border`, `shadow-[var(--mel-shadow-button)]` (la sombra más
  pequeña de las que ya existen para chrome flotante — este popover no es un
  panel grande). `z-[200]`, mismo nivel que el modal del Flujo A.
- Padding `p-6` (24px). Cierre (×) arriba a la derecha,
  `<IconButton icon="x" type="phantom" size={24} />`.
- Clic fuera, o Esc, o el ×: cierran el popover **sin ocultar nada y sin
  escribir nada** — es un cancelar completo, no equivale a "ocultar sin nota"
  (ver más abajo, son dos caminos distintos).

**Contenido, caso de una fila** — sin frase introductoria: el popover ya está
anclado justo en esa fila, repetir "vas a ocultar MEL-00008" sería decir lo que
ya se ve:

- `<label>` **Motivo (opcional)** — `typo-caption`, `text-mel-text-secondary`,
  `mb-2` (8px).
- `<textarea>` — `min-h-[80px]` (~3 líneas), ancho completo, `p-4` (16px),
  `border border-mel-border`, `bg-mel-bg-primary`, `text-mel-text-primary`,
  `typo-body-sans`; en foco, `border-mel-action-primary` (2px) — mismo
  lenguaje de color que el resto del sitio usa para "esto está activo".
  Placeholder: *"Por ejemplo: es un escaneo malo, pero la pieza es irrepetible
  y no hay original mejor."* — el propio ejemplo del encargo, no uno inventado
  aparte.
- Botones apilados verticalmente (a 360px de ancho, dos botones lado a lado con
  las etiquetas reales no caben sin partirse), `gap-2` (8px):
  - `Guardar y ocultar` — sólido, arriba (la opción que se anima a tomar va
    primero).
  - `Ocultar sin nota` — contorno, debajo.

**Caso en bloque** (`Ocultar seleccionados`): mismo popover, con una línea
añadida arriba del campo — aquí sí hace falta, porque el popover no está
anclado a una fila concreta y el número no es obvio con el popover ya abierto:

> Vas a ocultar 12 avisos.

El motivo, si se escribe, se aplica igual a los 12 — no se piden 12 motivos
distintos. El encargo describe el caso típico como una pieza singular ("una
pieza irrepetible"); pedir un motivo por pieza en una acción en bloque sería
más fricción de la que ese caso de uso pide resolver.

### ¿Obligatoria u opcional?

**Opcional.** Es la decisión que más dudé de las dos, porque hay un argumento
de peso en cada sentido:

- A favor de obligar: la propia filosofía de este repositorio dice que una
  decisión sin razón escrita se pierde — es literalmente la razón de ser de
  `insights.md` ("es lo primero que se pierde [...] dentro de un año alguien
  deshace el arreglo sin saber que arreglaba algo").
- A favor de dejarla opcional: la marca `#acepta:<clave>` **ya es**, por sí
  sola, la señal de que fue a propósito — mucho mejor que el silencio total que
  hay hoy, con o sin frase detrás. Obligar texto en una acción en bloque de 12
  fichas por la misma razón evidente es fricción sin beneficio real. Y el
  propio sistema de diseño ya resolvió este dilema en otro sitio con el mismo
  criterio: un campo sin dato **"no enseña el hueco, lo ofrece"** — no se
  bloquea, se invita.

Gana opcional, pero no a coste cero: el botón que sí guarda nota va primero y
sólido (más peso visual), el que la salta va segundo y en contorno, y — punto
siguiente — un aviso sin nota se **ve** distinto después, no se disuelve en la
lista como si nada. Es la misma calibración que pide el encargo: ni un bloqueo
que exagera el problema, ni un campo tan discreto que nadie note que se saltó.

### Qué pasa si no se escribe nada

Dos caminos distintos, y hay que distinguirlos con cuidado porque los dos
"parecen" no hacer nada:

1. **Se deja el campo vacío y se pulsa `Ocultar sin nota`.** El aviso se
   oculta. Se escribe la marca sin texto detrás (`#acepta:png`, sin nada más).
   Es una acción completa y deliberada.
2. **Se cierra el popover sin pulsar ningún botón** (×, Esc, clic fuera).
   No pasa nada en absoluto: no se oculta el aviso, no se escribe nada en la
   hoja. Es un cancelar puro.

No se inventa un texto por defecto tipo "Aceptado" para rellenar el hueco —
sería fabricar contenido que nadie escribió, y el propio sistema de diseño ya
tiene una regla exacta contra eso ("nada se rellena con un valor inventado en
el parseo").

### Cómo se guarda

`#acepta:<clave>` seguido, si hay nota, de un espacio y el texto — en la misma
celda `notasArchivo`, **añadido** a lo que ya hubiera (nunca sustituyendo el
contenido entero: una fila puede llevar más de una marca, para reglas
distintas). Comprobado contra la función real que ya lee la marca
(`estaSilenciado()`, `src/lib/auditoria.ts:169-171`): el patrón es
`#acepta:<clave>(?![a-z0-9-])`, así que un espacio justo después de la clave ya
cumple el límite — el formato propuesto funciona con el código que ya existe,
sin tocarlo.

Los saltos de línea que el usuario meta en el `<textarea>` se convierten en
espacios antes de guardar: la celda queda en una sola línea lógica, que es lo
que luego se trunca en la tabla (ver siguiente apartado). No hay límite de
caracteres impuesto por la interfaz — es una razón corta, no un informe; si
algún día alguien escribe un párrafo, no es un problema que esta pantalla
tenga que resolver.

### Cómo se ve después (y cómo se lee)

Una fila oculta solo vuelve a verse con «Ver avisos ocultos» (mecanismo que ya
existe). Cuando vuelve:

- La columna **acción** (`ocultar-aviso`, la de 200px): el botón pasa de
  `Ocultar aviso` a **`Mostrar aviso`**, mismo estilo de contorno — mismo
  lenguaje visual, acción inversa.
- La columna **evento** (246px, la más ancha de texto) gana una segunda línea,
  debajo del nombre: icono `message-square` (Lucide, 16px, trazo 2,
  `text-mel-text-tertiary`) + el texto de la nota, `typo-caption`,
  `text-mel-text-tertiary`, truncado a una sola línea con `ellipsis` — igual
  que exige la regla de truncado del sistema, nunca salto de línea. Esa
  segunda línea hace crecer solo la altura de esa fila en la rejilla (CSS Grid
  ya reparte cada fila según su contenido más alto; el resto de filas de 64px
  no se ve afectado).
- **Sin nota**: la misma segunda línea dice **«Sin nota.»**, sin icono, en el
  mismo `text-mel-text-tertiary` — se nombra la ausencia en vez de dejar un
  hueco silencioso, mismo principio que "¿Nos ayudas?" en los campos vacíos de
  la ficha, adaptado: aquí no hay nada que pedir (el motivo ya pasó, no se está
  invitando a rellenarlo ahora), así que no lleva enlace, solo el hecho dicho
  con llaneza.
- El texto de la nota (cuando existe) es un enlace a la celda real de la hoja
  (`hoja→Y{fila}`), mismo patrón `enlaceHoja()` que ya usa este componente para
  "Sin lugar"/"Sin coordenadas"/"Sin artistas" — para leer la nota entera si se
  truncó, o para corregirla, se va a la hoja. No se construye un editor de
  notas dentro del panel (ver "Lo que no he diseñado").

---

## Decisiones y por qué

- **Un solo modal para los tres estados del Flujo A, no tres pantallas.**
  Menos chrome que aprender, y es el mismo criterio que ya adoptó el
  propietario para el modal de una pieza ("sin cambiar el paradigma").
- **Sin contador real de progreso.** La arquitectura ya planeada (una
  petición, una respuesta) no lo permite sin mentir. Elegí honestidad sobre
  precisión aparente — coherente con la regla de este proyecto de no exagerar
  ni fingir lo que no se sabe.
- **No se puede cancelar a mitad.** Fue la decisión más reñida del Flujo A:
  parecía "lo que un usuario esperaría poder hacer". Gana no-cancelable porque
  la arquitectura de una sola petición no da un canal real para hacerlo sin
  añadir *streaming* o un job-id — y porque 1-2 minutos con una confirmación
  previa clara ya cubre el caso de uso mejor que una cancelación a medias
  (¿qué pasa con el fichero que se estaba procesando?).
- **Fase 1 y fase 2 llevan resúmenes distintos, no uno genérico.** Fue la
  decisión que más tiempo me llevó, porque el encargo describe solo la fase 2
  como si ya existiera. Mentir sobre qué pasó con los ficheros (decir
  "sustituido en Drive" cuando solo están en una carpeta local) sería
  exactamente el tipo de resumen-de-mentira que el encargo pide evitar.
- **Los fallos se agrupan por motivo, no se listan uno a uno.** Con el caso
  real de hoy (20 de 33 PNG con transparencia), 20 líneas casi idénticas son
  ruido; una línea por motivo con la lista de IDs al lado dice lo mismo con
  menos texto — mismo criterio que ya usa `PanelTarjeta` para "Otras
  incidencias".
- **La nota es opcional, con empuje visual hacia escribirla, no un bloqueo.**
  Ver el apartado dedicado en el Flujo B: fue la otra decisión reñida, resuelta
  a favor del patrón "campos sin dato" ya establecido en el sistema (ofrecer,
  no exigir) en vez del patrón "todo cambio necesita razón" de la cultura de
  documentación del propio repositorio — son dos culturas del mismo proyecto
  tirando en direcciones opuestas, y elegí la que ya rige la interfaz, no la
  que rige los documentos internos.
- **Popover ligero para la nota, modal pesado (con dim) para el arreglo.** La
  diferencia de peso visual entre los dos flujos es deliberada: comunica la
  diferencia real de severidad (una celda de texto frente a sustituir un
  original en Drive) sin necesidad de decirlo con palabras de alarma.
- **Reutilizar el banner `le-200` + `alert-triangle` para los fallos del
  resumen**, en vez de inventar un color de error nuevo. Coherente con la
  única licencia de color de aviso que ya autorizó el sistema de diseño.
- **`le-400` en la franja del estado de confirmar, no en progreso ni
  resumen.** Marca "aquí se decide algo" — que es exactamente lo que significa
  en el modal de una pieza del que lo tomo prestado — y por eso no la repito en
  los estados donde ya no hay nada que decidir.

---

## Lo que no he diseñado, y por qué

- **El contenido completo del modal de confirmación en bloque** (más allá del
  título y cuerpo mínimos que ancla el resto del flujo). El plan ya deja esa
  pregunta abierta explícitamente para que la resuelva el propietario; no la
  fuerzo aquí más allá de lo necesario para que el Estado 1 y el Estado 2
  tengan de dónde partir.
- **Reintentar los fallos con un botón dedicado.** No hace falta: el panel ya
  recalcula todo tras cada acción, así que los fallidos siguen visibles y
  seleccionables en la tabla sin ningún mecanismo nuevo. Añadir un botón de
  "reintentar" habría sido construir dos caminos para lo mismo.
- **Qué pasa si el Mac se suspende a mitad del proceso.** Es un riesgo real
  para una operación de uno o dos minutos, pero es una cuestión de la ruta
  (tarea 7) — qué hace `execFile` si el proceso padre muere — no de esta
  interfaz. Lo señalo para que no se pierda, no lo resuelvo aquí.
- **Qué pasa exactamente al pulsar «Mostrar aviso»** sobre una fila
  silenciada de forma persistente: si borra solo la marca de esa `clave` o la
  celda entera, y qué pasa con la nota. El encargo pedía diseñar la nota **al
  ocultar**, no el camino inverso; dejo apuntado que "quitar solo el segmento
  `#acepta:<clave> ...texto...` de esa regla, sin tocar el resto de la celda"
  es la opción obvia, pero no es una decisión mía que tomar sin que el
  propietario la vea primero.
- **Un editor de notas dentro del panel** (para corregir una nota ya escrita).
  La hoja ya es la fuente de verdad de `notasArchivo`, y el panel entero sigue
  el mismo patrón para todo lo que no se puede automatizar: enlazar a la celda
  real, no construir un editor paralelo.
- **Accesibilidad de detalle** (orden de tabulación exacto, anuncios de
  `aria-live` para el cambio de estado del modal, comportamiento exacto del
  atrapa-foco). Señalo los puntos que importan — el modal no debe poder
  cerrarse durante "En curso", el foco inicial del popover cae en el
  `<textarea>` — pero la implementación de detalle (roles ARIA exactos,
  gestión de foco al cerrar) es trabajo de quien lo construya, no de esta
  especificación visual.

---

## Referencias

- `src/pages/panel.astro`, `src/components/PanelSeccion.astro`,
  `src/components/PanelTarjeta.astro` — código real del panel, leído entero
  para este documento.
- `src/lib/auditoria.ts` — `estaSilenciado()` (líneas 169-171) y las cinco
  operaciones automáticas (líneas 100-136).
- `docs/superpowers/plans/2026-07-31-panel-control-archivo.md`, líneas
  847-996 — Tarea 7, el modal de confirmación de una pieza, fase 1 / fase 2.
- `docs/superpowers/specs/2026-07-31-panel-control-archivo-design.md` —
  secciones "Arreglar, en dos tiempos" y "Silenciar un aviso".
- `docs/design-system.md` — tokens, tipografía, "Campos sin dato", reglas de
  sombra y elevación.
- `src/components/Whisper.astro`, `src/components/InfoBanner.astro`,
  `src/components/IconButton.astro`, `src/components/Icon.astro` — precedentes
  reutilizados o descartados con motivo, citados en el texto.
- Commit `cc54679` — confirma que el modal de confirmación es tarea pendiente,
  no código ya escrito.
