# Traspaso — cómo retomar este proyecto

Este documento existe para que **una sesión nueva empiece sin perder nada**. No
repite lo que ya está en el resto de la documentación: recoge lo que se pierde al
cerrar una conversación — el estado de las ramas, cómo probar en un teléfono de
verdad, y qué técnicas de diagnóstico funcionan aquí y cuáles engañan.

Última actualización de §1: **30 de septiembre de 2026**.

---

## 1. Dónde está todo ahora mismo

| | |
|---|---|
| Producción | `https://melweb.vercel.app` — despliega de `main`; la versión sale en el pie del menú lateral |
| Rama estable | `main`. En GitHub **solo** existe `main` (el repositorio es público) |
| Carpeta de trabajo | `/Users/galo/Desktop/Projects/MEL/site`, **siempre sobre `main`** |
| Etiquetas | `vX.Y.Z` por cada subida (ver «Versionado» en `development.md`); las de nombre (`estados-pressed-v2.3`…) son puntos de recuperación antiguos |
| Experimento archivado | `archivo/galeria-parallax` + etiqueta `archivo-parallax-2026-09-30` — **solo local, no se sube nunca, no se toca** (D-287) |
| Copia completa del repositorio | iCloud, `M.E.L./Site Backups/repo-2026-09-30/mel-repo.bundle` (todas las ramas y etiquetas) |
| Datos privados de Google | iCloud, `M.E.L./Privado/google-mapa.md` (fuera del repositorio a propósito, D-285) |

### Reglas de ramas (costó siete semanas aprenderlas, D-287)

- **Al empezar, `git branch --show-current`.** El 09/08/2026 una sesión dejó la
  carpeta de trabajo sobre el experimento del parallax y nadie lo notó hasta el
  30/09: todo lo hecho en medio cayó dentro del experimento.
- **Al terminar, la carpeta vuelve a `main`.** Si hace falta una rama, se crea, se
  trabaja, se mezcla y se vuelve.
- **Nunca `git push --tags`**: publicaría la etiqueta de archivo, y con ella el
  experimento. Las etiquetas se suben por nombre (`git push origin v1.1.3`).
- **El guardián `.git/hooks/pre-push`** bloquea cualquier subida que contenga el
  experimento. Vive solo en este Mac: ni se publica ni va en el bundle. Si el
  repositorio se descarga de cero, hay que volver a ponerlo: hay una copia en
  iCloud, `M.E.L./Site Backups/repo-2026-09-30/pre-push` (copiarla a
  `.git/hooks/` y `chmod +x`).
- `preview_start` arranca el servidor en `site/`, sea cual sea el worktree de la
  sesión. Antes de decir «lo probé», `lsof -p PID | grep cwd`.

### Sesión del 5 de agosto de 2026 — cerrada y en producción

Todo lo de esa sesión está en `main` (`c3a3952`) y desplegado. Resumen de lo
que cambió, por si algo se ve raro y hay que saber dónde mirar:

- **Marcadores del mapa**: sombra plana nueva (D-222), despegue de la sombra
  al pasar el ratón (D-240/D-241), apilamiento por posición en pantalla en vez
  de por latitud (D-242), y aspecto propio en modo oscuro (D-243).
- **Marquee de textos truncados**: compartido de verdad entre la tabla de
  Lista y las tags de la ficha, con la medición única en `Layout.astro`
  (D-233), vuelta animada y curvas afinadas (D-238).
- **Datos**: ceros en el día (D-216/D-224), direcciones recortadas por norma
  (D-219/D-223), promotores como enlaces sueltos (D-218), "¿Nos ayudas?" en
  primary y también en la tabla (D-217).

**Lo que se intentó y se retiró, para no repetirlo a ciegas**: la norma de
colapso de columnas de la tabla (D-236, revertida en D-239 — falló por el
ámbito de los estilos de Astro, la causa está escrita) y la entrada animada
del mapa (D-244). Y un caso **sin resolver, aparcado por el propietario**: al
mantener pulsado un marcador en móvil, su cuerpo desaparece y quedan el
puntero y la sombra (D-245).

---

## 2. `feat/volver-al-flyer` — terminada y en producción

> Esta sección ya **no** es trabajo pendiente: quedó cerrada y mezclada en
> `main`. Se conserva porque el recorrido —qué se creía, qué resultó ser y qué
> se descartó— explica por qué el código de la vuelta es como es. Lo único vivo
> es la nota final sobre el morphing: **está descartado, no pendiente.**

**Objetivo**: que al cerrar un evento se vuelva **al flyer del que se salió**, y
más adelante con una animación de vuelta que cierre el círculo de la de ida.

**Por qué hace falta**: la vuelta restauraba una posición de scroll **en píxeles**,
y eso es frágil por construcción aquí — el masonry mide cada tarjeta cuando su
imagen carga, así que el alto crece durante el primer segundo y el píxel guardado
deja de caer donde caía. Hay incluso código que reintenta por temporizador
peleándose con ese alto móvil. Resultado: la vuelta **no siempre acierta** con el
flyer de origen.

**Lo que hay implementado**: el estado de vuelta lleva `flyer` (el `idMel` que se
abrió) y `volverAlFlyer()` lleva la galería a esa tarjeta, centrada. El píxel
queda de red de seguridad.

**Los dos fallos que lo bloquean, reportados por el propietario probándolo:**

1. **Se ve el viaje por la galería.** El mecanismo existente (`restoreScroll()`)
   oculta el contenedor mientras viaja y lo revela con un fundido;
   `volverAlFlyer()` no lo hace. **Ojo**: el propietario dice que en producción
   ese fundido tampoco se aprecia, así que antes de reutilizarlo hay que
   **comprobar que de verdad funciona**, no darlo por bueno.
2. **Aparecen tarjetas duplicadas en la galería.** ~~No está diagnosticado.~~
   **Diagnosticado y arreglado** (D-119), pendiente de que lo valide el
   propietario en un móvil real. La sospecha anterior —que los saltos de scroll
   disparaban el cargador de lotes varias veces— era falsa: llamarlo varias
   veces no duplica nada. Lo que duplicaba era que `appendGalleryBatch()` se
   fiaba del contador `galleryVisibleCount` en lugar del DOM, y al volver de una
   ficha los dos discrepan. Medido: 68 tarjetas con 18 duplicadas; tras el
   arreglo, 50 y ninguna.

3. **Se volvía al primer flyer abierto, no a aquel desde el que se cierra.**
   Detectado por el propietario al probar lo anterior, y era el motivo de la
   rama entera. **Arreglado** (D-120): el estado de vuelta lo reescribe ahora la
   propia ficha en cada carga.

**Orden recomendado**: (1) ~~entender la duplicación~~ hecho, (2) ~~el anclaje~~
hecho salvo el ocultado, (3) la animación de vuelta.

**Lo que queda:**

- ~~Se ve el viaje por la galería~~ **Arreglado** (D-122). Y el aviso de este
  documento se quedaba corto: aquel fundido **no es que no se apreciara, es que
  no existía** — faltaba un reflow forzado entre ocultar y revelar, sin el cual
  el navegador no crea ninguna transición. Comprobado con `getAnimations()`.
- **El morphing de vuelta: descartado por el propietario**, con la vuelta ya
  funcionando. "No vamos a hacer más sobre esto, dejémoslo como está." La vuelta
  aterriza con el flyer colocado y eso es el comportamiento definitivo, no un
  paso intermedio. **No lo reabras por iniciativa propia.**
  Si algún día se retoma, el dato que ahorra el primer día de trabajo: el
  morphing nativo **no puede funcionar aquí**. Cuando el navegador captura el
  estado final, la galería todavía es la del SSR —otro orden, sin colocar y con
  las alturas sin medir—, así que volaría el cartel a un sitio que no es el suyo.
  Habría que hacerlo a mano con transformaciones (regla 2), aprovechando que
  `volverAlFlyer()` sí sabe el momento exacto en que la tarjeta queda colocada.
- ~~La galería se repinta cuatro veces al volver~~ **Arreglado** (D-121): los
  reseteos de arranque se callan mientras se restaura una vuelta. Todos los
  repintados pintan ya 50.

---

## 3. Cómo probar en un teléfono de verdad

Esto es lo más valioso del traspaso: **la mayoría de los fallos de este proyecto
solo existen en un móvil real.**

### Servidor en la red local

`.claude/launch.json` tiene una configuración `mel-dev-movil` que levanta el
servidor abierto a la red (`--host`, puerto 4399). Se arranca con la herramienta
de previsualización, nunca con Bash.

El propietario abre `http://<ip-del-mac>:4399` desde su teléfono, en el mismo
wifi. **Sirve la rama que esté activa en el directorio**, así que basta con
`git checkout` para cambiar lo que ve.

Averiguar la IP: `ipconfig getifaddr en0`.

**Aviso**: Astro no deja levantar dos servidores de desarrollo a la vez, y llegaron
a acumularse ocho de sesiones anteriores. Si falla el arranque, comprueba
`lsof -nP -iTCP -sTCP:LISTEN | grep node` antes de nada.

**Aviso 2**: el servidor de desarrollo ha servido CSS caducado varias veces tras
editar un bloque `<style>`. Si un cambio de estilos no aparece, **reinicia el
servidor** antes de diagnosticar otra cosa.

### Trampa: «en el móvil se ve todo más grande» puede ser Safari, no la web

Safari (iPhone) guarda el zoom / tamaño de texto **por sitio** (botón **«Aa»** junto a la dirección), y para el servidor de pruebas el «sitio» es la IP del Mac (`192.168.1.167`). Si en algún momento se aumentó ahí, todas las pruebas locales se ven más grandes y borrosas, y la barra Galería/Mapa/Lista se sale por la derecha, mientras `melweb.vercel.app` (otro sitio, con su propio ajuste) se ve bien. Costó un rato (29/09/2026) porque parecía un fallo de las fuentes nuevas. **Antes de diagnosticar, tocar «Aa» y comprobar que pone 100 %.** Una segunda comprobación barata: abrir la misma IP con otro nombre (`192.168.1.167.nip.io`), que Safari trata como un sitio nuevo.

### Previsualizaciones de Vercel

Funcionan, pero piden inicio de sesión de Vercel en el teléfono. Además el token
de `gh` **no tiene permiso para crear ni editar Pull Requests**: hay que abrirlos
a mano desde la web.

---

## 4. Lo que este entorno NO puede reproducir

Ocho cosas, y todas han costado horas por darlas por buenas:

1. **La barra de URL que se repliega** (Chrome/Safari móvil). Es la causa de que
   los elementos `position: fixed` se descoloquen al desplazar. Aquí no existe.
2. **El scroll con inercia y el rebote.** Aquí el scroll es instantáneo.
3. **Los gestos táctiles reales.** Los eventos de puntero sintéticos **se saltan
   la negociación de gestos del navegador**: un deslizamiento puede pasar la
   prueba aquí y fallar en el dispositivo. Pasó exactamente eso.
4. **El scroll nativo por rueda o toque.** Un `WheelEvent` sintético **no
   desplaza nada** — esa prueba siempre da falso negativo.
5. **La pestaña del panel de previsualización está en segundo plano**
   (`document.hidden === true`), así que el navegador **congela
   `requestAnimationFrame` y no entrega callbacks de `IntersectionObserver`**.
   Consecuencia práctica: el scroll infinito **no carga ningún lote** por sí
   solo y todo lo que dependa de un fotograma se queda parado. Se ve enseguida:
   `raf` cuenta 0 en medio segundo. **Cómo desatascarlo**: cada captura de
   pantalla fuerza un fotograma y desbloquea lo pendiente, así que una prueba de
   este tipo se conduce alternando `screenshot` y comprobación. `setInterval` sí
   corre — por eso `restoreScroll()` lo usa a propósito (ver su comentario).

   **Ampliación (2026-08-05, costó DOS HORAS de fantasmas)**: el estado varía
   DENTRO de una misma sesión — el panel puede empezar la tarde entregando
   fotogramas con normalidad (rAF respondiendo en 1ms, animaciones WAAPI
   medibles en pleno vuelo) y morir del todo horas después, incluso para
   pestañas nuevas, sin que las capturas lo resuciten. Con el panel muerto, el
   síntoma es de lo más traicionero: `scheduleFilterArchives()` programa su
   rAF, el callback no corre NUNCA, `sliderUpdateScheduled` queda atascado en
   `true` y el slider parece completamente roto — con el código perfectamente
   sano, mientras la búsqueda (que llama a `filterArchives()` en síncrono)
   funciona y despista aún más. **La primera comprobación ante cualquier "este
   código no corre" es un rAF suelto con timeout**; si no dispara, el panel
   está muerto y NINGUNA conclusión de comportamiento vale ya — se cierra, se
   documenta el estado y lo prueba el propietario en su navegador.

6. **El mapa de Google puede comportarse distinto aquí que en el dispositivo
   real.** Caso vivido (D-244): una entrada animada que giraba la cámara
   funcionaba aquí y está MEDIDA —`heading` de 0 a 30 y vuelta, captura del
   mapa a medio girar, con la ventana a 375px— y el propietario no la vio
   nunca, ni en móvil ni en escritorio. Se retiró. La hipótesis sin confirmar
   es que el dispositivo caiga al render ráster, donde `setHeading()` se
   ignora **en silencio**. Antes de invertir en cualquier animación de cámara,
   comprobar primero si un `map.setHeading(45)` a pelo hace algo allí.

7. **La hoja de Google se satura con las recargas de una sesión intensa** y el
   dev server pasa a servir INTERMITENTEMENTE una página-carcasa de ~3KB: la
   cabecera renderiza, y ni tarjetas ni el script grande llegan. Una carcasa
   pillada por `curl` mientras el navegador tiene cargada una página íntegra
   (o al revés) fabrica contradicciones imposibles — "el archivo servido no
   tiene mi función" con el código correcto en disco. Ante cualquier lectura
   rara de la página servida, comprobar PRIMERO su tamaño (`wc -c`: la buena
   ronda 650KB) antes de sacar conclusiones. De propina: el demonio de `astro
   dev` (Astro 7) no ve los cambios del worktree (la ruta pasa por `.claude/`,
   carpeta con punto que el watcher ignora) — tras cada edición hay que
   `npx astro dev stop` y relanzar, o se prueba código rancio.

8. **RTK reescribe la salida de `curl`, `wc`, `tail`, `grep`… del agente** (30/09/2026,
   costó una falsa alarma). `curl URL > fichero` o `curl URL | node …` no guardan la
   página: guardan un **resumen de ~10 KB** que termina con el texto literal
   `... (N more lines, M bytes total)`. Parecía una portada cortada dentro del
   `<head>`, en producción. **Para bajar una página entera: `curl -o fichero URL`**, y
   medirla con `python3` (no con `wc`, que también sale resumido). Ojo: el síntoma de
   la trampa 7 (una «carcasa» con la cabecera y sin tarjetas) se parece mucho; puede
   que alguna de aquellas lecturas fuera esto y no la hoja saturada. Lo que sí es
   real: con la hoja caída, la portada sale **completa pero con 0 tarjetas**.

**Corolario**: si una prueba sintética dice que algo funciona y el propietario
dice que no, **tiene razón él**. Y al revés: que aquí no se reproduzca un fallo
es información, no una absolución.

---

## 5. Técnicas de diagnóstico que sí funcionan

### Vídeos del propietario (la mejor con diferencia)

Tres fallos difíciles de esta sesión se resolvieron en minutos con una captura de
pantalla del móvil, después de fallar a ciegas durante horas. **Pídela sin
complejos.**

Para analizarla hay un script en `scripts/extraer-fotogramas.swift` que saca
fotogramas repartidos por el vídeo:

```bash
swift scripts/extraer-fotogramas.swift "/ruta/al/video.MP4" /carpeta/salida 30
```

(No hace falta ffmpeg; usa AVFoundation, que ya está en macOS.)

### Trazas con MutationObserver

Para saber **cuántas veces** y **cuándo** ocurre algo. Así se descubrió que el
panel del mapa se repoblaba dos veces, a los 5ms y a los 1958ms — y esa segunda
marca fue lo que señaló al culpable.

### Barridos de medición

Recorrer todo el rango de scroll en pasos pequeños midiendo geometría, y comparar
mínimos y máximos. Así se vio que el solape entre la foto y el contenido era
constante de 48px, lo que apuntó directamente a la causa.

### Comprobar la caché desde fuera

```bash
curl -sS -o /dev/null -D- "https://melweb.vercel.app/?view=galeria" | grep -i x-vercel-cache
```

`HIT` = se sirvió la copia del borde. `MISS` = se construyó de cero.

---

## 6. Cómo trabaja el propietario, y qué espera

- **Nada se da por validado hasta que él lo ve.** Es la regla 16 de `CLAUDE.md` y
  es literal: ni commits ni etiquetas por iniciativa propia.
- **Pide puntos de recuperación** antes de tocar algo delicado. Etiqueta.
- **Detecta muy bien las regresiones** y describe con precisión — sus
  descripciones a cámara lenta han valido más que varios diagnósticos.
- **El coste importa**: una prioridad del proyecto es que sea prácticamente
  gratis. Cualquier propuesta que mueva tráfico o cómputo hay que plantearla con
  su precio por delante.
- **La accesibilidad importa.** Lo dijo explícitamente al dejar el pellizco de
  zoom habilitado.
- Agradece que se le diga **lo que no se ha podido verificar**. No inflar.

---

## 7. Trampas de este código que ya han mordido

- **Réplicas en JS de componentes Astro** (regla 7 de `CLAUDE.md`). Se
  desincronizan sin avisar; pasó tres veces en un solo día. Cuando se pueda,
  **borrar la réplica y usar el componente**, como se hizo con `EmptyState`.
- **Dos números que deben coincidir, calculados por separado.** Pasó dos veces
  con el anclaje de la foto. Que salgan de una sola fuente.
- **`view-transition-name` promociona el elemento a la capa superior del
  navegador**, que ignora cualquier `z-index` de la página (regla 2).
- **Un elemento `position: fixed` queda fuera de la cadena de scroll**: arrastrar
  sobre él no desplaza nada.
- **`overflow-y: auto` convierte el eje X en `auto` automáticamente.**
- **En una columna flex de alto acotado los hijos se encogen** y pisan cualquier
  alto fijado por JS. Hace falta `shrink-0`.
- **Las utilidades de Tailwind pueden ganarle a una regla de id** en un bloque
  `<style>` del propio `.astro`. Comprobar el valor calculado, no suponerlo.

---

## 8. Decisiones abiertas esperando al propietario

Están todas en `roadmap.md`, en "Problemas Conocidos" e "Ideas Pendientes". Las
que tienen más peso:

1. **Safari no carga ninguna imagen** hasta que el visitante interactúa con
   `drive.google.com`. Diagnóstico cerrado, arreglo evidente (servir las imágenes
   desde el propio dominio) **descartado por coste**. Hay una idea del propietario
   pendiente de viabilidad.
2. **El orden en móvil**: el archivo solo se puede ver barajado. El propietario
   quiere que **convivan** barajado y cronológico, y valora un botón flotante.
   Esperando reacciones de visitantes reales.
3. ~~**La contradicción de la descarga**~~: resuelta en D-305. El teléfono usa
   ya el visor del sitio, con zoom propio, y la descarga queda vetada en todos los
   tamaños.
4. **El panel del mapa como punto de retorno propio**, con la pega de que en
   escritorio los filtros siguen aplicando a sus resultados.
