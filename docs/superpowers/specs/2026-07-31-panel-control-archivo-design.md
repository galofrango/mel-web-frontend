# Panel de archivos M.E.L. — pestaña Control

**Fecha**: 31 de julio de 2026
**Estado**: **diseño aprobado por el propietario**, sin implementar.
**Alcance de este documento**: solo la pestaña **Control** (auditoría del archivo).
La pestaña **Preparación** (ingesta de material nuevo) es un proyecto aparte y se
especifica cuando Control esté hecho — a propósito, ver *Por qué en este orden*.

---

## Qué es y para quién

Una página interna que dice, en un vistazo, **qué le pasa hoy al archivo** y deja
arreglar en el sitio lo que se puede arreglar solo.

Dos mitades:

- **Control** — auditoría de los 84 carteles y sus fichas. Solo lectura para
  diagnosticar; escritura únicamente cuando el usuario pulsa un arreglo.
- **Preparación** — soltar material nuevo, que se recorte, se convierta, se le
  lea el texto y salga una fila lista para la hoja. **Fuera de alcance aquí.**

Usuario hoy: el propietario. Usuario mañana: alguien del equipo del archivo sin
terminal. Eso obliga a que sea una página de navegador desde el primer día.

---

## Por qué en este orden (Control antes que Preparación)

Control no necesita ni una credencial y se puede terminar rápido. Y su primer
informe dice, con nombres y apellidos, qué falla hoy en 84 imágenes reales — que
es exactamente la lista de lo que Preparación tiene que impedir que vuelva a
pasar. Diseñar la ingesta antes de tener esa lista es adivinar.

---

## Dónde vive

**Una ruta del propio proyecto, que solo existe en desarrollo**: `src/pages/panel.astro`,
con un guarda que devuelve 404 si `!import.meta.env.DEV`. Se abre con `npm run dev`.

Motivos, por orden de peso:

1. **Es el único sitio donde `sips` existe.** Con `npm run dev` la página la sirve
   un proceso de Node que corre en el Mac, así que una ruta de API del proyecto
   puede lanzar `sips` y hablar con Drive. Una página alojada —incluida la maqueta
   de claude.ai— **no puede**, y no es cuestión de permisos: un navegador no
   ejecuta binarios locales, y no hay ajuste que lo cambie.
2. **Reutiliza lo que ya hay**: `mel.ts` para leer la hoja (sin duplicar el mapa
   de columnas), los tokens y componentes del DS, y el patrón de caché en JSON
   que ya usan `medir-carteles.mjs` y `fetch_sheet.py`.
3. **Coste cero y sin infraestructura nueva.** El procesado en Vercel costaría
   dinero, exigiría `sharp` como dependencia nueva (`sips` no existe en Linux) y
   pondría el OCR en un servicio de pago.
4. **No se publica.** La ruta no existe en el sitio desplegado.

**Descartado**: una herramienta local aparte, porque acaba con una segunda copia
del mapa de columnas y de los estilos — justo lo que `mel.ts` vino a cerrar
(D-153) y contra lo que avisa la regla 7 de AGENTS.md.

**Aplazado a fase 3**: desplegar *solo* la mitad de Control (que es de solo
lectura y barata) detrás de contraseña, para que otra persona vea el estado del
archivo sin tocarlo. Los arreglos se quedan siempre en local.

**Limitación conocida**: `sips` es de macOS. Los avisos y toda la auditoría
funcionan en cualquier sistema; la mitad de *arreglar imágenes* es de Mac.

---

## De dónde salen los datos

Dos orígenes, deliberadamente distintos:

| | Origen | Cuándo se lee | Coste |
|---|---|---|---|
| **Avisos de datos** | La hoja, en vivo, vía `mel.ts` | En cada carga | Una petición |
| **Avisos técnicos** | `src/data/flyer_tecnico.json` | Lo produce un script | 84 descargas, ~125 MB, ~1 min |

Las imágenes no se pueden medir al abrir la página, así que su medición se cachea
en un JSON commiteado, igual que `resolved_coordinates.json`.

### El fichero técnico es UNO, no dos

`flyer_ratios.json` guarda hoy solo `{driveId: [ancho, alto]}` y lo consume la
ficha de evento. El panel necesita además formato, perfil y peso.

**Decisión**: un solo fichero más rico, no dos. Dos ficheros dejarían las
dimensiones escritas en dos sitios, que es la clase de duplicado que acaba
divergiendo. Cuesta **dos líneas** en `src/pages/event/[id].astro` (líneas 94 y
358), que pasan de `flyerRatios[id]` a `flyerTecnico[id].px`.

Forma nueva: `{driveId: {px:[w,h], tipo:'jpeg'|'png'|'gif', perfil:bool, comp:n, bytes:n}}`

### Se lee el ORIGINAL, no la miniatura

El script descarga por `drive.google.com/uc?export=download&id=…`, no por el
endpoint de miniatura. Verificado sobre 8 carteles: ambos devuelven los mismos
bytes **hoy**, pero el de miniatura topa en 2400px, así que un original mayor
saldría medido como 2400 y parecería correcto. Ese tope es la razón por la que
`medir-carteles.mjs` no podía detectar los seis carteles de más de 3000px.

Todo se lee de la **cabecera** del fichero, sin descodificar la imagen: SOF y
APP2 en JPEG, IHDR e iCCP/sRGB en PNG, bytes 6–9 en GIF.

---

## Los tres niveles

No son severidades abstractas: son **consecuencias**.

| Tarjeta | Qué significa | Hoy |
|---|---|---|
| **Fallos críticos** | La pieza no aparece, o aparece mal | 3 |
| **Bajo rendimiento** | Se ve, pero peor o más lento de lo que debería | 63 |
| **Falta información** | Un hueco en la ficha | 2 |

«Falta información» va en `text-tertiary`, callado y al final. **No es un error**:
el sitio ya trata la laguna como información legítima y la convierte en el
«¿Nos ayudas?». Por eso se retiró «sin descripción», que afectaba a 62 de 84 — un
aviso que salta en tres cuartas partes del archivo no mide un defecto, describe
cómo es el archivo, y convierte el panel en ruido.

Cada tarjeta muestra **tres avisos** y una cuarta línea con `… +N`. Las tarjetas
filtran: pulsar una enseña solo sus secciones.

---

## Las diez comprobaciones

Cada aviso dice su **consecuencia**, no su regla. Si no se puede terminar la frase
«el problema es que…», no merece ser un aviso.

| Aviso | Umbral | Hoy | Acción | ¿Automática? |
|---|---|---|---|---|
| Sin lugar | `lugar` vacío o centinela | 1 | Abrir en la hoja (col. E) | No |
| Sin coordenadas | `coordenadas` no resoluble | 3 | Abrir en la hoja (col. G) | No |
| Archivo PNG | `tipo === 'png'` | 33 | Convertir a JPG **+ sRGB** | Sí |
| En CMYK | `comp === 4` | 1 | Pasar a sRGB | Sí |
| Por encima de 3000 px | lado mayor > 3000 | 6 | Reducir a 2400 px | Sí |
| Sin perfil de color | sin ICC en cabecera | 34 | Incrustar sRGB | Sí |
| Por encima de 2 MB | `bytes > 2 MiB` | 25 | Recomprimir | Sí |
| Baja resolución | lado mayor < 1200 | 13 | — | **No la hay** |
| GIF animado | `tipo === 'gif'` | 1 | — | **No debe haberla** |
| Sin artistas | `artistas` vacío o centinela | 2 | Abrir en la hoja (col. H) | No |

Comprobaciones que existen y **hoy dan cero**, y que el panel enseña igual al pie
(si no enseña lo que miró y pasó, no sabes si llegó a mirarlo): sin imagen, fecha
ilegible, ID duplicado, fila con `idMel` fuera de `MEL-`, sin diseñador, sin
localidad, proporción imposible.

Centinelas de «sin dato», los mismos del DS: vacío, `desconocido`, `sin fecha`,
`no detallados`, `varios`.

---

## El texto de cada aviso

Texto de producto, revisado por el propietario en el prototipo. **Se copia literal**;
si algo parece mal redactado, se discute, no se reescribe sobre la marcha.

Cada aviso tiene dos piezas: la **descripción** (primera frase en negrita, «El
problema es que…», y después «La forma de corregirlo es…») y el **banner**, el
dato concreto que hay que decidir o saber. `[hoja→X]` es un enlace a la columna X
de la hoja.

**Sin lugar** · desc: «**El problema es que la ficha no tiene nombre de local**, así
que no hay nada que enseñar en la etiqueta «Lugar» ni por lo que agrupar el evento
en el mapa. / La forma de corregirlo es escribir el nombre del local en la columna
E de la [hoja→E1].» · banner: «Si de verdad no se sabe, deja la celda vacía en vez
de escribir «Desconocido»: el sitio ya sabe convertir un hueco en la invitación
«¿Nos ayudas?».»

**Sin coordenadas** · desc: «**El problema es que sin el enlace de Google Maps el
evento no sale en el mapa.** / La forma de corregirlo es buscar el local en Google
Maps, copiar la URL larga del navegador y pegarla en la columna G de la [hoja→G1].
El sitio saca el punto exacto del propio enlace.» · banner: «Las tres filas ponen
«Desconocido» en esa celda, y eso es peor que dejarla vacía: el respaldo por
localidad solo entra si la celda está vacía, así que «Desconocido» apaga el único
plan B que había.»

**Archivo PNG** · desc: «**El problema es el peso**: en tamaño de miniatura un PNG
puede pesar diez veces más que el mismo cartel en JPEG, y la galería carga 32 de
golpe. / La forma de corregirlo es convertir a JPEG calidad 85 **e incrustar sRGB
en la misma pasada** — por separado, la conversión deja el fichero etiquetado como
Adobe RGB y arreglas el peso creando un problema de color.» · banner: «20 de estos
33 llevan transparencia y JPEG no la admite, así que hay que decidir una vez sobre
qué fondo se aplanan.»

**En CMYK** · desc: «**El problema es que CMYK es un espacio de imprenta, no de
pantalla**, y los navegadores lo tratan de forma irregular. / La forma de
corregirlo es pasarlo a sRGB.» · banner: «Medido en este fichero: de 798 KB a
225 KB, y el color queda en el espacio que el navegador espera.»

**Por encima de 3000 px** · desc: «**El problema es que nada del sitio muestra un
cartel a ese tamaño**, así que esos píxeles de más solo suman peso. / La forma de
corregirlo es reducir a 2400 px de lado mayor, que es el techo que fija vuestro
*imagenes.md*.» · banner: «Medido en el más grande del archivo: de 4961×9674 a
1230×2400, y de 2,1 MB a 263 KB.»

**Sin perfil de color** · desc: «**El problema es que el fichero no dice en qué
espacio de color están sus números**, así que el navegador asume sRGB. Si no lo
era, el cartel sale apagado — y como avisa vuestro *imagenes.md*, el peligro no es
tener Adobe RGB, es no tener nada. / La forma de corregirlo es convertir a sRGB e
incrustar el perfil. No cambia lo que se ve si ya era sRGB: solo lo hace
explícito.» · banner: «Tres de estos son en escala de grises (MEL-00002, MEL-00004
y MEL-00007) y la conversión los pasaría a RGB. Decidid si se excluyen.»

**Por encima de 2 MB** · desc: «**El problema es que ese peso se paga en cada
visita**: Drive responde *no-store*, así que no hay caché posible y el original
viaja entero cada vez. / La forma de corregirlo es bajar la calidad hasta entrar en
2 MB.» · banner: «Este aviso va el último: casi todos estos son los PNG y el CMYK
de las otras secciones, y al convertirlos bajan solos. Recomprimir dos veces la
misma imagen pierde calidad para nada.»

**Baja resolución** · desc: «**El problema es que el original no da más de sí.** El
sitio nunca amplía una imagen por encima de su tamaño real, así que no se ve
borrosa: se ve pequeña. / La única forma de corregirlo es conseguir un escaneo
mejor de la pieza.» · banner: «Ampliar con IA está descartado: reinventa las letras
del cartel, y en un archivo de diseño gráfico eso es falsificar la pieza.»

**GIF animado** · desc: «**El problema es que son 177 fotogramas y 14,4 MB que Drive
no redimensiona**: el visitante se los descarga enteros, pida el tamaño que pida. /
La decisión es vuestra: dejarlo como está, o guardar el GIF aparte y elegir un
fotograma como cara de la pieza en el archivo.» · banner: «No lleva botón a
propósito: convertirlo a JPEG destruiría la animación, que es parte de la pieza.»

**Sin artistas** · desc: «**El problema es que el archivo no sabe quién pinchó en
ese evento**, y en un archivo la laguna es información, no un error. / La forma de
corregirlo es escribir los nombres en la columna H de la [hoja→H1]. Suelen estar
impresos en el propio cartel.» · **sin banner.**

---

## El orden es un orden de trabajo, no un ranking

Las secciones van ordenadas para que **arreglar las de arriba resuelva las de
abajo**. Medido sobre el archivo real:

```
Sin lugar → Sin coordenadas
PNG → CMYK → +3000 px → sin perfil → +2 MB → baja resolución → GIF animado
```

- Convertir los **33 PNG**, el **CMYK** y los **6 grandes** resuelve de paso
  **25 de los 34 «sin perfil»** (quedan 9) y **17 de los 25 «+2 MB»** (quedan 8).
- Por eso **«+2 MB» va casi al final**: empezar por ahí recomprime 17 imágenes que
  iban a bajar solas, perdiendo calidad para nada.
- **«Baja resolución» no comparte ni un cartel** con las de arriba: es
  independiente, y no tiene arreglo por software.
- En críticos la dependencia es más obvia: **no se puede buscar en Google Maps un
  local cuyo nombre no se sabe**, así que «Sin lugar» va antes.

**Dentro de cada sección, de peor a menos malo**, medido en la unidad de esa
sección: PNG / pesados / sin perfil / CMYK / GIF por **bytes descendente**,
«+3000 px» por **píxeles descendente**, «baja resolución» por **píxeles
ascendente** (el peor es el más pequeño). Donde no hay magnitud, por `idMel`.

---

## Silenciar un aviso: «Ocultar aviso»

Un cartel puede entrar a conciencia sin cumplir la norma, porque la pieza lo
merece. Una auditoría que repite cada semana los mismos avisos ya aceptados se
convierte en ruido y deja de abrirse.

**La marca vive en la hoja**, en la columna `notasArchivo` (col. Y, `c[24]`), con
una marca convenida (`#acepta:png`). No en un JSON del repositorio: la razón tiene
que estar junto a la pieza, no en un fichero paralelo que dentro de un año nadie
sepa por qué existe. `notasArchivo` ya se parsea en `mel.ts` y hoy no la usa nadie.

Cada sección ofrece **«Ver avisos ocultos»** para recuperarlos.

---

## Arreglar, en dos tiempos

El fichero viaja: **descargar el original → procesar con `sips` en el Mac → devolverlo**.

La pieza clave es que **Drive permite sustituir el contenido de un fichero
conservando su ID**. Como la hoja guarda la URL con ese ID, el enlace no se rompe
y **no cambia ni una celda**.

1. **Fase 1, sin credenciales.** El panel deja los ficheros procesados en una
   carpeta y tú los subes con «Gestionar versiones → Subir nueva versión» de Drive.
   Funciona hoy.
2. **Fase 2, con cuenta de servicio de Google.** El mismo botón sube él. Es **lo
   único de todo el proyecto que necesita credenciales**, y se decide por separado
   viendo ya el panel funcionando.

**Antes de la primera pasada hay que tener los 84 originales guardados fuera de
Drive.** Drive conserva versiones anteriores, pero caducan salvo que se marquen
como permanentes, y el original es la copia de preservación.

### Los comandos, verificados sobre ficheros reales

| Operación | Comando | Medido |
|---|---|---|
| A sRGB | `sips --matchTo "/System/Library/ColorSync/Profiles/sRGB Profile.icc"` | `MEL-00006` CMYK: 798 → 225 KB, espacio RGB |
| PNG → JPG | `sips -s format jpeg -s formatOptions 85` **+ `--matchTo`** | `MEL-00008`: 1112 → 368 KB (−67%) |
| Reducir | `sips --resampleHeightWidthMax 2400` | `MEL-00027`: 4961×9674 → 1230×2400, 2190 → 263 KB |

**Tres trampas medidas, no supuestas:**

- **`sips -s format jpeg` a secas deja el resultado etiquetado como Adobe RGB.**
  Convertir sin `--matchTo` arregla el peso y crea un problema de color. Van juntas.
- **20 de los 33 PNG llevan canal alfa** y JPEG no lo admite: hay que decidir una
  vez sobre qué fondo se aplanan.
- **Tres de los «sin perfil» son escala de grises** (`MEL-00002`, `MEL-00004`,
  `MEL-00007`) y `--matchTo` los pasaría a RGB. Decisión pendiente del propietario;
  la recomendación es excluirlos.

### Lo que NO se hace

**Ampliar imágenes pequeñas, ni con IA.** Un ampliador reconstruye detalle
plausible, y en un cartel el 90% de lo que se ampliaría es tipografía: no la
emborrona, la **reinventa**. En un archivo cuya tesis es que el diseño gráfico es
el protagonista, eso falsifica la pieza y encima queda mejor que el original, así
que nadie lo nota. Además el sitio ya trata bien los originales pequeños: nunca
estira por encima del tamaño real, así que no se ven mal, se ven pequeños.

**Convertir el GIF animado.** `MEL-00077` tiene 177 fotogramas. El botón sería una
trampa: convertirlo a JPEG destruiría la animación, que es parte de la pieza.

---

## Seguridad

El repositorio es **público**. Eso, por sí solo, no es el riesgo: el panel solo
existe mientras `npm run dev` corre en el Mac del propietario, escuchando en
`localhost`. No hay nada expuesto a internet, y publicar el código que llama a
`sips` no da a nadie una capacidad que no tuviera ya. Lo que sí hay que garantizar
son cuatro cosas.

### 1. El guarda de desarrollo tiene que verificarse, no suponerse

Si `/panel` o sus rutas de API acaban en el build de producción, ahí sí hay algo
escuchando en internet. `sips` no existe en Linux, así que los arreglos de imagen
fallarían — pero **una ruta que escriba en Drive con la cuenta de servicio sí
funcionaría**. Ese es el escenario grave.

El guarda (`if (!import.meta.env.DEV) return new Response(null, {status:404})`) va
en `panel.astro` **y en cada ruta de API**, y el DoD comprueba en el build que no
existen.

### 2. El servidor de desarrollo, solo en `localhost`

Astro escucha por defecto solo en la máquina, pero `npm run dev --host` lo abre a
toda la red local: en un coworking o una cafetería, cualquiera del wifi abre
`/panel` y ejecuta acciones. **No usar `--host` mientras exista el panel**, y
dejarlo escrito donde se vea.

### 3. Las credenciales, nunca en el repositorio

La clave de la cuenta de servicio de Google va en variable de entorno y en
`.gitignore`. Esa clave sí es la llave de todo.

### 4. Nada de shell compuesto a mano

`sips` se lanza con `execFile` y una **lista de argumentos**, nunca componiendo una
cadena para un shell. Las rutas de fichero se derivan del ID de Drive **validado
con expresión regular**, nunca de texto que venga de la hoja: cualquiera con
permiso de edición en la hoja podría colar un comando por ahí.

### Alternativa sin ninguna ruta que ejecute

Si se prefiere eliminar el riesgo en vez de acotarlo: **que el panel no ejecute,
sino que escriba un `arreglos.sh`** que el propietario lee antes de lanzar.
Desaparecen la ruta ejecutora, la superficie de inyección y el escenario de
despliegue accidental. El precio es un paso manual por lote y perder el recálculo
automático al terminar. **No es la opción elegida**, pero queda anotada porque el
coste de cambiarse es bajo y la decisión puede revisarse.

### Descartado: una aplicación de escritorio

Electron o Tauri resolverían el aislamiento, pero traen una pila entera nueva
(dependencias, empaquetado, interfaz rehecha o el build de Astro incrustado),
justo contra lo que este proyecto ha sostenido. Y distribuir el instalable a otra
persona exige firmar y notarizar con una cuenta de desarrollador de Apple (~99
€/año), o macOS lo bloquea al abrirlo. Sobre todo: **no resuelve ninguno de los
cuatro puntos de arriba**, que se resuelven con guardas, no con otra tecnología.

---

## Después de cada acción: recalcular desde cero

**Una acción no arregla un aviso, arregla varios a la vez.** Convertir un PNG a
JPEG lo saca de «Archivo PNG», le baja el peso por debajo de 2 MB y le incrusta el
perfil: ese fichero desaparece de **tres secciones**. Si el panel se limita a
quitar la fila de la sección donde se pulsó, las otras dos siguen enseñando un
problema que ya no existe, y a partir de ahí no te puedes fiar de ninguna cifra.

**Regla: tras cualquier acción, volver a medir los ficheros tocados y recalcular
todas las comprobaciones desde cero.** Nunca parchear la interfaz. Es barato,
porque solo se remiden los que se han tocado.

**Botón «Releer el archivo»**, arriba a la derecha. Hace dos cosas de coste muy
distinto:

- **Releer la hoja es instantáneo** — una petición, y los avisos de datos se
  recalculan solos. Esto es lo que hace siempre.
- **Volver a medir las imágenes son 84 descargas y ~125 MB, cerca de un minuto.**
  Solo si se pide expresamente, o automáticamente sobre los ficheros que acaba de
  tocar un arreglo.

---

## Interfaz

Sobre el DS existente, sin inventar paleta. Figma: `1200:116096` (pantalla),
`1197:65133` / `1197:65134` (sección), `1199:93312` (columnas).

**Cabecera.** Título «Panel de archivos M.E.L.» (sin pica: aquí no se busca nada)
y las pestañas Control / Preparación a la derecha. Debajo, la introducción y el
botón **Releer el archivo** (56px, `action-primary`, icono de recarga).

**Tres tarjetas** (`Highlight XL`): OVERLINE + cifra en `typo-h1` (32/40) +
desglose en `typo-caption` (16/20), etiqueta en `text-secondary` y número en
`text-primary`. La activa lleva `bg-tertiary`, borde `action-primary` y
`--mel-shadow-button`; las demás `bg-secondary` y borde `border`.

**Sección.** Caja con borde de 1px sobre `bg-primary`. Cabecera con fondo
`bg-secondary` (a `bg-tertiary` en hover, porque la banda entera es el botón de
plegar), título + contador entre corchetes y chevron de 40px a la derecha.
Contenido: descripción → nota de automatización → banner. Si no hay banner, un
divisor a 24px de los bordes.

**Descripción**: `typo-lead` (17/28), primera frase en negrita («El problema es
que…»), después «La forma de corregirlo es…». Enlaces a la hoja en Lora
subrayada, `text-secondary`.

**Banner de aviso**: fondo **`--mel-primitive-le-200` (#e0b8c0)**, texto e icono
en `action-secondary`, 20px de padding vertical y 24px horizontal, a 24px de los
bordes de la caja. **Es un primitivo suelto, y es una licencia deliberada**: el DS
no tiene un color de aviso y meter un ámbar o un rojo de sistema convertiría un
archivo de diseño gráfico en un panel de programador. Si algún día el DS define
ese par (claro y oscuro), se sustituye por el token.

**Fila de acciones**: «Seleccionar todos» y «Ver avisos ocultos» como enlaces Lora
a la izquierda; a la derecha, las acciones en bloque (40px). **Nacen desactivadas**
y se encienden al marcar una casilla — desactivadas y no ocultas, para que se vea
que existen sin que la fila salte. **«Abrir en la hoja» nunca es acción en bloque**:
no se pueden abrir tres celdas a la vez.

**Tabla**: **16px de sangrado izquierdo** más ocho columnas de
`42 · 294 · 160 · 120 · 72 · 120 · 200 · 200` (casilla · miniatura+nombre · MEL ·
dimensiones · formato · peso · ocultar · acción). **16 + 1208 = 1224.** Los 16px
van delante, como en Figma (`Columns` empieza en x=0 y la primera columna en
x=16); si se omiten y se fuerza el ancho total a 1224, aparecen como un hueco de
16px **al final** de cada fila, que es un defecto real medido en la tarea 5.

La columna **formato** (JPG / PNG / GIF) la pidió el propietario tras ver la
tabla: el formato es el dato que más rápido explica por qué un cartel está en una
sección. Entra comprimiendo nombre y acciones, sin que ningún botón ni ningún
dato pase a dos líneas.

**El divisor vertical de la casilla no se pinta.** La casilla y la miniatura son
la misma cosa —identificar la fila—, y la raya entre las dos las separa sin
motivo. Divisores entre las demás columnas, sí.

### Correcciones tras la primera revisión visual del propietario

- **Los enlaces a la hoja abarcan la expresión entera**, no solo la palabra
  «hoja»: se enlaza «la columna E de la hoja» completa. Un enlace de una palabra
  suelta obliga a apuntar, y el destino es la frase.
- **Menos aire entre el problema y la corrección.** Las dos frases son un solo
  pensamiento; el hueco actual las lee como dos bloques sin relación.
- **La nota de automatización se desarrolla.** No basta con «esto se arregla
  solo»: tiene que decir **qué es `sips`** (la herramienta de imagen que ya trae
  macOS), **dónde corre** (en tu Mac, no en ningún servicio), y **cómo** (un
  script del propio proyecto que descarga el original, lo procesa y lo devuelve a
  Drive conservando su ID). Es la única parte del panel que ejecuta algo, y quien
  la lea tiene derecho a saber qué va a pasar antes de pulsar.
- **La cuarta línea de las tarjetas se rotula «Otras incidencias»**, no `…`.
- **Sin líneas de relleno**: una tarjeta con menos de tres avisos no pinta
  guiones para rellenar. El desglose se **alinea abajo**, para que las tres
  tarjetas mantengan la misma línea de base aunque tengan distinto número de
  avisos.
- **Las acciones en bloque no se ven hasta que hay selección** (antes: visibles y
  desactivadas). Igual que «Ver avisos ocultos», que solo aparece si hay alguno.

### Solo escritorio, y solo desde el propio ordenador

`sips` no existe fuera de macOS, pero un teléfono **sí** podría accionar el panel:
con `npm run dev --host`, el móvil abre una página servida por el Mac y es el Mac
quien ejecuta. El problema es que `--host` no distingue el teléfono del
propietario del resto del wifi.

Decisión del propietario: **el panel es de escritorio.** La ruta comprueba, además
del guarda de desarrollo, que la petición viene de `localhost`; a cualquier otra
cosa responde 404. Así la configuración `mel-dev-movil` de `.claude/launch.json`
sigue sirviendo para probar el sitio público en el teléfono, sin publicar el panel
en la red.
Filas de 64px, **divisiones verticales** entre columnas, ninguna horizontal, y
24px de aire al pie de la lista. El MEL enlaza a su celda real (`…#gid=0&range=K{fila}`).
Celdas de dato en `typo-lead` sobre `text-secondary`; el MEL en Lora, que es lo
que el DS reserva para los enlaces de dato. Miniatura de 40×48 en `object-contain`.

Nada redondeado, en ningún sitio.

---

## Estado real del archivo, 31/07/2026

Medido descargando los 84 ficheros. La distribución de formatos —50 JPEG, 33 PNG,
1 GIF— cuadra exacta con `docs/imagenes.md`, lo que da confianza en el resto.

Hallazgos que no estaban documentados:

- **34 de 84 (el 40%) no llevan perfil de color incrustado.** `imagenes.md` ya
  avisaba de que ese es el peligro real, no tener Adobe RGB.
- **Hay un CMYK: `MEL-00006`.** La documentación decía que el CMYK es el problema
  serio y no señalaba ninguno.
- **Seis pasan de 3000 px**, uno de ellos `MEL-00027` a 4961×9674 y otro
  `MEL-00030` a 7039×1203. Invisibles hasta ahora por el tope de sondeo a 2400.
- **El GIF de 14,4 MB es `MEL-00077`**, no `MEL-00074` como dice la documentación.
  Sin resolver cuál de los dos está mal.
- **`MEL-00001`, `MEL-00016` y `MEL-00036` no salen en el mapa**, y por una razón
  que no era evidente: ponen `Desconocido` en la columna de coordenadas, y
  `parseCoords()` solo aplica el respaldo por localidad **si esa celda está
  vacía**. Escribir «Desconocido» ahí apaga el único plan B que había.

---

## Decisiones pendientes del propietario

1. **Los tres carteles en escala de grises**: ¿se excluyen de «incrustar sRGB»?
2. **El fondo sobre el que se aplanan los 20 PNG con transparencia.**
3. **El GIF animado**: dejarlo, o guardarlo aparte y elegir un fotograma.
4. **La cuenta de servicio de Google** (fase 2 de los arreglos).
5. **El nombre «Bajo rendimiento»**: contiene siete comprobaciones y solo tres van
   de velocidad. El propietario lo da por bueno como «fallo intermedio».

---

## Definition of Done

- [ ] `npm run build` pasa y **ni `/panel` ni sus rutas de API existen** en el
      build de producción — comprobado sobre el build, no supuesto.
- [ ] La clave de la cuenta de servicio **no está en el repositorio** y su fichero
      está en `.gitignore`.
- [ ] Toda llamada a `sips` usa `execFile` con lista de argumentos, y las rutas de
      fichero salen de un ID de Drive validado, nunca de texto de la hoja.
- [ ] Sin regresiones en la ficha de evento tras el cambio de `flyer_ratios.json`
      a `flyer_tecnico.json` (dos líneas, `event/[id].astro:94` y `:358`).
- [ ] Verificación manual en navegador real, escritorio y móvil.
- [ ] Un arreglo ejecutado de verdad sobre un fichero de prueba, comprobando que
      el ID de Drive **no cambia** y la hoja sigue enlazada.
- [ ] Tras ese arreglo, el panel recalcula **todas** las secciones, no solo la
      pulsada.
- [ ] `architecture.md` recoge el nuevo fichero técnico y el origen de datos.
- [ ] `decisions.md` recoge: la ruta solo en desarrollo, el fichero técnico único,
      la marca en `notasArchivo`, la licencia del primitivo `le-200`, el orden por
      cascada y el descarte de la ampliación por IA.
- [ ] `imagenes.md` recoge la trampa de `sips` sin `--matchTo` y la de «Desconocido»
      en la columna de coordenadas.
- [ ] `roadmap.md` actualizado.

---

## Referencias

- Prototipo navegable con datos reales: artefacto privado del propietario.
- Boceto en Figma: `1200:116096`, `1197:65133`, `1197:65134`, `1199:93312`.
- Reglas que condicionan este diseño: AGENTS.md 7 (no hay componentes en cliente),
  8 (URLs de Drive), 16 (nada se da por validado sin el propietario).
