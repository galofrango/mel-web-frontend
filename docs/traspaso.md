# Traspaso — cómo retomar este proyecto

Este documento existe para que **una sesión nueva empiece sin perder nada**. No
repite lo que ya está en el resto de la documentación: recoge lo que se pierde al
cerrar una conversación — el estado de las ramas, cómo probar en un teléfono de
verdad, y qué técnicas de diagnóstico funcionan aquí y cuáles engañan.

Última actualización: **28 de julio de 2026**.

---

## 1. Dónde está todo ahora mismo

| | |
|---|---|
| Producción | `https://melweb.vercel.app` — despliega de `main` |
| Rama estable | `main` |
| Etiquetas de recuperación | `detalles-v2.2`, `estados-pressed-v2.3` |
| ~~Rama a medias~~ | `feat/volver-al-flyer` — **terminada y mezclada en `main`**; su contenido ya está en producción |
| Rama aparcada de antes | `experiment/gallery-3d-tilt` (efecto 3D, ver problemas conocidos) |

Volver a un punto estable: `git checkout estados-pressed-v2.3`.

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

### Previsualizaciones de Vercel

Funcionan, pero piden inicio de sesión de Vercel en el teléfono. Además el token
de `gh` **no tiene permiso para crear ni editar Pull Requests**: hay que abrirlos
a mano desde la web.

---

## 4. Lo que este entorno NO puede reproducir

Cuatro cosas, y las cuatro han costado horas por darlas por buenas:

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
3. **La contradicción de la descarga**: en móvil el cartel se abre como imagen
   suelta para poder ampliarlo, mientras en escritorio se vetó la descarga. Sin
   conciliar.
4. **El panel del mapa como punto de retorno propio**, con la pega de que en
   escritorio los filtros siguen aplicando a sus resultados.
