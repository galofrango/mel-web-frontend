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

Es el tamaño más grande al que se llega a mostrar un cartel, más margen para
ampliar. El sitio deja el pellizco de zoom habilitado a propósito, y en un
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
