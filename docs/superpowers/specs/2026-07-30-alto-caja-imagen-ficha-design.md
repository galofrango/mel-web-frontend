# Alto de la caja de imagen de la ficha de evento

**Fecha**: 30 de julio de 2026
**Estado**: **implementado** el 30/07/2026 (ver D-157). Este documento queda como el porqué.

---

## El problema

En la ficha de evento, la caja de imagen tiene un alto **fijo** de 360px en móvil.
Muchos carteles no lo necesitan, así que se desperdicia alto de pantalla.

Medido a 393px de ancho de viewport:

| Evento | Imágenes | Alto que necesita la más alta | Caja hoy | Desperdicio |
|---|---|---|---|---|
| Trip With Us (`MEL-00001`) | 1 (600×289) | 189px | 360px | **171px — el 47%** |
| Turrón del duro (`MEL-00009`) | 2 (1000×609, 1000×445) | 239px | 360px | **121px — el 34%** |
| FIV VI (`MEL-00037`) | 5 (4× 866×2382, 1× 1000×750) | 1081px | 360px | ninguno (se queda corta) |

FIV VI muestra el otro extremo: sus carteles verticales necesitarían 1081px, así
que hoy se escalan a **131px de ancho** dentro de una caja de 393 — ahí lo que se
desperdicia es espacio horizontal. Ese caso queda **fuera de alcance**: el tope de
360px se mantiene.

## Qué se busca

1. Que la caja mida el alto que de verdad necesita el cartel, sin aire sobrante.
2. Que **no haya saltos** al pasar de una imagen a otra dentro del mismo evento.
3. Que sea correcto **en la primera pintada**: un ajuste posterior sería justo el
   salto que se quiere evitar.

## Restricciones del propietario

Todas confirmadas explícitamente:

| | |
|---|---|
| **Suelo** | **200px manda.** Es la cota de Figma (369:32751) y no se baja |
| **Tope** | **360px**, el de hoy |
| **Sin ratio conocido** | Comportamiento actual: arranca en 360 y encoge hasta 200 |
| **Encogido** | Encoge hasta 200 siempre que sea más grande; nunca crece por encima de su alto natural |
| **Nunca ampliar** | Si un cartel no da la resolución, se pinta a su tamaño real, no se estira. En píxeles **CSS** |
| **Alcance** | Solo móvil (`< lg`). Escritorio sigue con sus 400px |

## La regla

```
anchoPintado = mín(ancho de la caja, ancho natural de la imagen)
altoNatural  = anchoPintado ÷ ratio de la imagen más alta del evento
altoCaja     = clamp(200, altoNatural, 360)
```

Aplicada a los tres casos, a 393px de ancho:

| Evento | altoNatural | altoCaja | Encogido al desplazar |
|---|---|---|---|
| Trip With Us | 189 | **200** (manda el suelo) | ninguno, ya está en el suelo |
| Turrón del duro | 239 | **239** | 39px (239 → 200) |
| FIV VI | 1081 | **360** (tope) | 160px, igual que hoy |

"La más alta del evento" es lo que garantiza que no haya saltos: las demás quedan
con aire arriba y abajo, y ninguna obliga a recalcular la caja.

### El alto de la CAJA y el tamaño de la IMAGEN son dos cosas distintas

Hay que separarlas o el suelo de 200 y el "nunca ampliar" parecen contradecirse.
Trip With Us es justo ese caso: su alto natural es 189, por debajo del suelo.

- **La caja** nunca baja de 200px. Manda el suelo.
- **La imagen** dentro nunca se estira por encima de su tamaño real.

Así que en Trip With Us la caja mide 200 y la imagen se pinta a sus 189, centrada,
con 11px de aire. No es una contradicción: la caja tiene un mínimo, la imagen tiene
un máximo, y son cotas de elementos diferentes.

---

## Arquitectura

Cuatro piezas, cada una con una responsabilidad y sin estado compartido.

### 1. `src/data/flyer_ratios.json` — el dato

```json
{ "1eRfwDfWPeDakNUBpAtLJB_QAwd99cJaR": [600, 289] }
```

**Clave: id de Drive**, no `idMel`. Dos razones: un evento tiene varias imágenes y
hacen falta todas para saber cuál es la más alta; y así el fichero sirve para
cualquier consumidor futuro (la galería de la home podría dejar de medir cada
cartel al cargar, que es la causa del salto del masonry en el primer segundo —
**fuera de alcance aquí**, solo se deja la puerta abierta).

Va commiteado. Se lee en SSR con un import estático: **coste en producción cero**,
ni una petición de red.

### 2. `scripts/medir-carteles.mjs` — quien lo genera

Node, sin dependencias. Sigue el patrón de `scripts/fetch_sheet.py` +
`src/data/resolved_coordinates.json`: trabajo pesado offline, resultado cacheado.

1. Lee la hoja por el mismo endpoint público `gviz/tq`.
2. Extrae los ids de Drive de la columna `c[2]`.
3. Para cada id que **no** esté ya en el JSON, pide
   `drive.google.com/thumbnail?id=…&sz=w2400`.
4. Lee las dimensiones de la **cabecera** del fichero: marcador SOF del JPEG,
   bloque IHDR del PNG.
5. Escribe el JSON ordenado por clave, para que el diff sea legible.

Incremental por defecto (solo lo que falta), con una opción para rehacer todo.

**Ya validado**: es el método con el que se hizo el censo de las 84 imágenes del
archivo el 30/07/2026, sin un solo fallo. Nota de por qué importa: **`curl` recibe
0 bytes de ese endpoint** y `fetch` de Node funciona. Si algún día falla, ese es el
primer sitio donde mirar, no la URL.

### 3. La ficha de evento (SSR) — quien lo usa

En el frontmatter: por cada imagen del evento, busca su ratio en el JSON; coge la
**más alta**; emite su proporción como variable CSS en `#detail-image-crop`, más el
ancho natural para el tope de no-ampliar.

Si **ninguna** imagen del evento tiene ratio, no emite nada. Si algunas sí y otras
no, decide con las que conoce: es mejor que rendirse, y las desconocidas quedan
con aire, que es el comportamiento de hoy.

### 4. El CSS — quien lo aplica

```css
@media (max-width: 1023px) {
  #detail-image-crop[style*="--mel-ratio-cartel"] {
    aspect-ratio: var(--mel-ratio-cartel);
    height: auto;
    min-height: 200px;
    max-height: min(360px, var(--mel-alto-cartel));
  }
}
```

> **Corregido durante la implementación.** El diseño llevaba `max-height: 360px` a
> secas, y la verificación lo pilló: `aspect-ratio` calcula con el ancho de la
> CAJA, pero un cartel de menos resolución que la pantalla no se estira, así que se
> pinta más bajo de lo que la proporción sugiere. A 1023px de ancho, Trip With Us
> dejaba la caja en 360 con la imagen a 289 — 71px de aire. El segundo tope,
> `--mel-alto-cartel`, es su alto real y cierra el hueco.

Da exactamente `clamp(200, ancho ÷ ratio, 360)` **sin una línea de JavaScript**, y
se readapta solo al girar el móvil. Funciona porque la caja es **a sangre** en
móvil: su ancho es siempre el del viewport (verificado a 393 y a 760).

Cuando no hay variable, el `h-[360px]` de hoy sigue en pie y no cambia nada.

Y el no-ampliar, sobre la propia imagen: un tope de su ancho natural en px, y
centrada. Trip With Us en una tablet de 1023px se pinta a 600 centrado, no
estirado a 1023.

---

## Flujo de datos

```
Hoja de Google Sheets ──┐
                        ├──> scripts/medir-carteles.mjs ──> src/data/flyer_ratios.json
Drive (cabeceras)    ───┘                                              │
                                                                       │ import estático
                                                    ┌──────────────────┘
                                                    v
                              event/[id].astro (SSR) ──> --mel-ratio-cartel
                                                                │
                                                                v
                                        CSS: aspect-ratio + min/max-height
```

Nada en tiempo de ejecución. Nada en el cliente.

---

## Cómo encaja con la maquinaria de fijado

Es la parte delicada. La foto se fija (`position: fixed`) al desplazar y encoge de
`IMAGE_MAX_H` a `IMAGE_MIN_H`, con un alto congelado en `#detail-image-column` que
impide que el encogido se realimente. Los comentarios de `medirCabecera()` dejan
claro lo que costó.

**Un solo cambio ahí**: `IMAGE_MAX_H = 360` deja de ser constante.
`medirCabecera()` lee el alto que el CSS ya ha calculado (con el `style.height`
inline limpiado antes de medir, como ya hace para congelar la columna).

Efecto secundario bienvenido: hoy el 360 está escrito **dos veces** —la clase
`h-[360px]` y la constante JS— y son la trampa nº2 del traspaso, "dos números que
deben coincidir, calculados por separado". Esto la elimina: manda el CSS.

`IMAGE_MIN_H = 200` **no se toca**.

Si el alto calculado es ≤ 200, no hay margen de encogido y la foto simplemente se
queda fija. Es la consecuencia lógica de que la caja ya esté ajustada, y el
propietario lo aprobó.

---

## Errores y casos límite

| Caso | Qué pasa |
|---|---|
| Cartel sin entrada en el JSON | Sin variable CSS → `h-[360px]` de hoy. Riesgo cero |
| Algunas imágenes con ratio y otras sin | Decide con las conocidas |
| La imagen no carga en el navegador | Ya cubierto: `onerror` repone el cartel de respaldo. La caja no depende de que cargue |
| El ratio cacheado ya no coincide (imagen resustituida en Drive) | La caja queda con la proporción vieja: aire de más o recorte. Se corrige reejecutando el script. **Aceptado**: el fallo es cosmético y se autocorrige |
| Escritorio | El media query no aplica. 400px intactos |
| Giro del móvil | `aspect-ratio` recalcula solo. `medirCabecera()` ya corre en `resize` |
| Imagen más ancha que alta y muy pequeña | Manda el suelo de 200 y la imagen se centra sin estirarse |

---

## Verificación

Sin framework de test (el proyecto no tiene). Verificación manual en navegador
real, más un autochequeo en el script.

**El script**: un `--check` que recorra el JSON y avise de entradas con
dimensiones a 0, ratios absurdos (> 10 o < 0,1) e ids que ya no están en la hoja.

**En navegador**, los casos que ya están medidos y sirven de referencia:

| Caso | Qué comprobar |
|---|---|
| `MEL-00001` Trip With Us | Caja a 200 (suelo). A 1023px de ancho, imagen a 600 centrada, no estirada |
| `MEL-00009` Turrón del duro | Caja a 239. Sin salto al pasar entre sus 2 imágenes |
| `MEL-00037` FIV VI | Caja a 360 (tope). Idéntico a hoy |
| Evento borrado del JSON a mano | Cae en 360 y se comporta como hoy |
| Anchos 393 / 760 / 1023 + giro | El alto sigue la regla en todos |
| Escritorio 1280 | 400px, caja `static`, sin rastro del media query |
| Desplazar en los tres | El fijado y el encogido siguen funcionando |

**No se puede verificar aquí**: iOS Safari real. La barra de URL mueve el alto
visible y este entorno no lo reproduce (traspaso §4.1). Queda para el propietario
en su teléfono.

---

## Fuera de alcance

- **Escritorio.** Sigue con sus 400px de Figma.
- **La galería de la home.** Sigue midiendo en cliente. Que pueda reutilizar este
  JSON queda anotado, no planificado.
- **Subir el tope para carteles verticales.** FIV VI seguiría escalando sus
  carteles a 131px de ancho. Es una decisión de diseño aparte.
- **El texto que pasa por debajo de la foto fijada** (D-156). Esto reduce el
  problema de rebote en carteles apaisados, pero no lo resuelve ni lo pretende.
- **El `sz=w1000` de la ficha**, que según lo medido se queda corto para pantallas
  de densidad 3 (necesitan 1179) y para el visor a pantalla completa (1240).
  Anotado como decisión pendiente del propietario.
