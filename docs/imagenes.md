# Cómo preparar los carteles para la web

Para quien sube material al Drive. No hace falta saber nada de código.

> **Lo único que hay que recordar:** lado mayor **2000–2400px**, **JPEG** (nunca
> PNG), **sRGB**, recortado al borde del cartel. Con eso está el 95% hecho.

---

## La norma

| | |
|---|---|
| **Lado mayor** | **2000–2400px** |
| **Mínimo aceptable** | **1200px** de lado mayor. Por debajo se ve blando al ampliar |
| **Formato** | **JPEG**, calidad 95 |
| **Perfil de color** | **sRGB**. Nunca CMYK, ni Adobe RGB. Sin etiqueta ya significa sRGB |
| **Recorte** | Al borde del cartel, sin margen blanco de escaneo |
| **Peso** | Da igual. 600 KB – 1,5 MB es normal y está bien |

> **La calidad pasó de 85 a 95 el 03/08/2026.** Medido sobre el propio archivo:
> subir de 85 a 95 engorda el fichero solo un **10%** y la diferencia se nota a
> ojo. Y sigue bastando para lo que hace falta — los tres JPEG que pasaban de
> 2 MB bajan por debajo ya en la primera pasada a 95. El 85 solo se usa como
> escalón si 95 no consigue meter el fichero en los 2 MB.

De la rotación no hay que preocuparse: Drive endereza los píxeles al generar la
miniatura. Comprobado en el archivo (julio 2026) — todas las imágenes servidas
llegan con orientación normal.

---

## Por qué cada cosa

### JPEG y no PNG — esto es lo más importante

**La web nunca sirve el fichero original.** Todo pasa por el generador de
miniaturas de Drive (`drive.google.com/thumbnail?id=…&sz=w700`), que redimensiona
al vuelo. Pero **conserva el formato**: si subes un PNG, el visitante descarga un
PNG a cualquier tamaño.

Medido en este archivo (84 imágenes, julio 2026):

| | Cantidad | Peso medio |
|---|---|---|
| JPEG | 50 | 978 KB |
| PNG | 33 | **1717 KB** |

Y en tamaño de miniatura la diferencia se dispara, porque un JPEG reducido
comprime muchísimo y un PNG sigue siendo casi sin pérdida. Medido en un par
concreto, a `w200`:

- JPEG: **11 KB**
- PNG: **113 KB** — diez veces más

Pero **a `w700`, que es lo que pide de verdad la galería**, la diferencia se
estrecha bastante. Medido el 03/08/2026 sobre las 32 miniaturas de la primera
pantalla: JPG **159 KB** de media, PNG **406 KB** — dos veces y media, no diez.
Sigue mereciendo la pena convertir, pero el número que hay que decir es este.

La galería carga 32 carteles de golpe, así que ahí es donde eso se nota de
verdad, y con datos móviles más.

**PNG solo si** la pieza es de color plano tipo vector, con texto nítido y pocos
colores. Un cartel escaneado o fotografiado nunca lo es.

### Por qué 2000–2400px

**No es «×3 de 800».** Sale de la caja más grande en la que se llega a ver un
cartel —a sangre en móvil, hasta 1023 píxeles CSS— por la densidad de una
pantalla Retina (×2), que da ~2050; más margen para ampliar. El sitio deja el pellizco de zoom habilitado a propósito, y en un
archivo de carteles la gente amplía para leer la letra pequeña: ahí ese margen no
es desperdicio, es la función.

Las cajas reales, medidas:

| Dónde | Caja | Píxeles que necesita |
|---|---|---|
| Miniatura de lista | 56×56 | 112–168 |
| Tarjeta de galería | ~390 de ancho | ~790 |
| Ficha, escritorio | 496×400 | 992×800 |
| Ficha, móvil (a sangre) | hasta 1023 de ancho | hasta ~2050 |
| Visor a pantalla completa | 620×584 | ~1240 |

Por encima de ~3000px ya no lo muestra nada.

### Los ppp no sirven para nada aquí (y qué sirve en su lugar)

Es la duda que más cuesta quitarse de encima, así que va con detalle.

**Un navegador ignora los ppp de un fichero.** Una imagen de 500×500 a 300 ppp y
esa misma a 72 ppp se ven **exactamente igual**: el navegador solo cuenta
píxeles. Los ppp son una nota para la imprenta —«esto está pensado para salir a
tantas pulgadas»— y ningún `<img>` la mira. Medido en este archivo: los carteles
declaran 200 y 300 ppp indistintamente, y da lo mismo.

Lo que sí manda son **tres cantidades distintas** que se confunden todo el rato:

| | qué es |
|---|---|
| **Píxeles de imagen** | los que tiene el fichero. Es lo que enseña el panel |
| **Píxeles CSS** | el hueco que ocupa en la maquetación. Una tarjeta de galería son ~390 |
| **Píxeles de pantalla** | los de verdad. En una Retina hay **2 o 3 por cada píxel CSS** |

De ahí sale la única regla que importa:

> Una imagen se ve nítida si tiene **al menos tantos píxeles de imagen como
> píxeles CSS ocupa, multiplicado por la densidad de la pantalla.**

Una tarjeta de 390 CSS en una pantalla Retina de 2× necesita **780 píxeles de
imagen**. Si el fichero tiene 500, el navegador lo estira: no se pixela a
cuadros, se ve **blando**, como una foto ligeramente desenfocada. Y un cartel de
500 px a 300 ppp está igual de blando que uno de 500 px a 72 — porque son los
mismos 500 píxeles.

**Lo de @2x y @3x de Figma es exactamente esto.** No es una propiedad mágica: es
exportar el mismo diseño con el doble o el triple de píxeles. Un marco de 500×500
exportado @2x da un PNG de 1000×1000. El nombre viene de la densidad de pantalla
para la que se piensa, pero **lo único que cambia en el fichero es el recuento de
píxeles**. Así que en vez de pensar «lo exporto a @2x», piensa «necesito que el
lado largo tenga 2000–2400».

**En este sitio, además, tú no sirves el original.** Todo pasa por el
redimensionador de Drive, que sirve el ancho que se le pida en la URL:

| dónde | se pide | hueco en pantalla |
|---|---|---|
| Tarjeta de galería | `sz=w700` | ~390 CSS → sobra para 1,8× |
| Miniatura de lista | `sz=w200` | 56 CSS → de sobra |
| Ficha y visor | `sz=w1000` | hasta 496 CSS → 2× justo |

Por eso el original tiene que ser grande aunque el visitante nunca lo descargue:
**Drive no puede servir píxeles que el original no tenga.** Si subes 800, la
tarjeta pedirá 700 y los tendrá, pero la ficha pedirá 1000 y recibirá 800
estirados.

**El techo de nitidez lo pone lo que se le pide a Drive, no el original.** Desde
el 04/08/2026 no se le pide un ancho fijo: se le ofrecen varios y **elige el
navegador**, que es el único que sabe qué pantalla tiene delante (`srcSetDrive`
en `mel.ts`).

| dónde | anchos ofrecidos | caja en pantalla |
|---|---|---|
| Tarjeta de galería | 700 · 1000 · 1400 | ~320 CSS |
| Ficha y visor | 1000 · 1400 · 2000 | 496 CSS en escritorio |

Los topes salen de medir, no de intuir. Cinco carteles, peso medio por ancho:

| | w700 | w1000 | w1400 | w2000 |
|---|---|---|---|---|
| una imagen | 120 KB | 161 KB | 222 KB | 421 KB |
| la galería entera (32) | 3,7 MB | 5 MB | 7 MB | **13,2 MB** |

Por eso la galería se queda en 1400 —a 2000 la primera pantalla se iría a 13 MB
para nadie— y la ficha, que es UNA imagen, llega a 2000.

Y una cosa que se ve en esa tabla: **hay carteles a los que esto no les cambia
nada**. Un original de 600px devuelve lo mismo a w700 que a w2000, porque Drive
no puede servir píxeles que no existen. Otro motivo para el mínimo de 1200.

### Por qué el mínimo de 1200

**Nunca se amplía una imagen por encima de su tamaño real.** Si un cartel no da
la resolución, se pinta al máximo que tenga y punto — no se estira. Así que un
original pequeño no se ve mal, se ve *pequeño*.

En este archivo hay 12 imágenes por debajo de 1200px. Si aparece un escaneo mejor
de alguna, merece la pena resubirlo:

`MEL-00001` (600×289) · `MEL-00003` (422×600) · `MEL-00031` (560×560) ·
`MEL-00034` (842×1191, dos imágenes) · `MEL-00047` (303×709 y 709×696) ·
`MEL-00058` (1134×1030) · `MEL-00062` (408×992) · `MEL-00067` (300×709 y 510×510)

### Por qué sRGB, y qué significa de verdad no tener perfil

El perfil de color es una nota dentro del fichero que dice con qué tabla hay que
leer sus colores. Un fichero **sin** esa nota se pinta asumiendo sRGB, en todos
los navegadores. Así que "sin perfil" no es un defecto: **significa sRGB**. Lo
malo es tener números que no son sRGB y ninguna nota que lo avise — que es lo que
pasa cuando una herramienta convierte a medias.

La regla, entonces: **convierte a sRGB**. Que la etiqueta acabe puesta o no es
secundario, y de hecho **no está en tu mano**.

**Medido el 02/08/2026, y conviene saberlo antes de perder una tarde:**

- De los 50 JPEG del archivo, **40 llevan perfil incrustado**: 28 en sRGB, 8 en
  **Adobe RGB (1998)**, 2 en *Generic RGB* y 2 con el perfil de un monitor.
- Los 12 que no son sRGB **se ven bien hoy**, porque Drive conserva el perfil en
  la miniatura que sirve el sitio (comprobado leyendo la miniatura de
  `MEL-00009`: llega con su Adobe RGB dentro).
- `sips` **le quita la etiqueta a todo lo que toca** —redimensionar, recomprimir,
  cambiar de formato— y **no convierte los píxeles al hacerlo**. Un Adobe RGB
  redimensionado a secas sale apagado: medido, 13 puntos de 255 de desaturación
  en las zonas de color. Por eso todo arreglo del panel lleva `--matchTo` en la
  misma orden: así sí convierte.
- **Nada de esta máquina incrusta el perfil sRGB.** Ni `sips --embedProfile`, ni
  ImageIO desde Swift. macOS lo omite a propósito, porque para el sistema un
  fichero sin etiqueta ya es sRGB.

De ahí que el panel avise de **"perfil que no es sRGB"** y no de "sin perfil":
avisar de la ausencia sería marcar como defectuoso su propio trabajo, en bucle.

**CMYK sí es un problema de verdad**: es un espacio de imprenta, no de pantalla, y
el soporte en navegador es irregular.

### Por qué recortar al borde

La caja de imagen de la ficha se ajusta a la proporción del cartel, así que
**cualquier margen blanco del escaneo se convierte en hueco desperdiciado** en
pantalla. Antes daba igual porque la caja era de alto fijo; ahora no.

### Por qué el peso no importa

Lo que descarga el visitante lo decide Drive al redimensionar, no tu fichero. El
original es la copia de preservación: que esté bien de dimensiones y de formato
importa; que pese 800 KB o 1,4 MB, no.

---

## Lo que NO hay que hacer

- **No subir PNG** de material escaneado o fotografiado
- **No ampliar** un original pequeño antes de subirlo. No añade información y
  engaña sobre la calidad real que hay
- **No pasar de ~3000px** de lado mayor: no lo muestra nada
- **No guardar en Adobe RGB** ni en ningún espacio que no sea sRGB. Sin etiqueta
  no es problema: eso ya se lee como sRGB
- **No obsesionarse con el peso** a costa de la calidad
