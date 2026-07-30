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
| **Formato** | **JPEG**, calidad 85 |
| **Perfil de color** | **sRGB, y que el perfil vaya incrustado**. Nunca CMYK |
| **Recorte** | Al borde del cartel, sin margen blanco de escaneo |
| **Peso** | Da igual. 600 KB – 1,5 MB es normal y está bien |

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

### Por qué sRGB, y por qué lo que importa es que el perfil esté

El perfil de color es una nota dentro del fichero que dice con qué tabla hay que
leer sus colores. Los navegadores modernos la respetan, así que **el peligro no es
tener AdobeRGB: es no tener nada.** Un fichero sin perfil cuyos colores no son
sRGB se pinta asumiendo sRGB, y sale apagado.

Así que la regla es: **convierte a sRGB e incrusta el perfil**. Es lo más
compatible y lo más ligero.

Medido en el archivo (julio 2026): hay al menos uno en **Adobe RGB (1998)**
(`MEL-00013`) y uno en sRGB correctamente incrustado (`MEL-00005`). El de Adobe
RGB se ve bien hoy porque lleva su perfil, pero conviene pasarlo a sRGB.

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
- **No guardar sin perfil de color** si la imagen no es sRGB
- **No obsesionarse con el peso** a costa de la calidad
