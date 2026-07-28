# Ficha de evento: scroll interno en lugar de elementos fijos

**Fecha:** 2026-07-28 · **Estado:** implementado, pendiente de validación del propietario en dispositivo real

## Problema

En móvil, el bloque superior de la ficha de evento (cabecera, fila de tags y caja de foto) debía ser inmóvil y no lo era: se descolocaba al desplazar y llegaba a tapar el título. Confirmado con captura de vídeo del propietario en Safari de iOS y reportado también en Chrome de Android.

La causa de fondo no era un fallo puntual sino el andamiaje: **tres elementos `position: fixed`, cada uno con un espaciador reservándole el hueco a mano, más una pista de scroll compensando el descuadre**, sobre un documento que sí se desplaza. En un navegador móvil eso no se sostiene: al replegarse la barra de URL el viewport de maquetación cambia de tamaño y el navegador re-ancla los elementos fijos a mitad del gesto. Ver D-102 y D-103 para los dos síntomas concretos que se arreglaron antes por separado.

## Hallazgo que determina el diseño

**La home ya resuelve esto y lleva haciéndolo desde siempre:**

```
div.h-dvh  overflow: hidden        ← el documento no se desplaza
  └ .view-panel  overflow-y: auto  ← el scroll vive aquí
```

Por eso su cabecera nunca ha dado problemas. La ficha de evento era la única pantalla del sitio que desplazaba el documento con elementos fijos. El diseño, por tanto, no inventa nada: **adopta el patrón de la casa**, ya probado en producción en la pantalla más compleja del sitio.

## Diseño

Por debajo de `lg`:

```
envoltorio  h-dvh overflow-hidden
  └ #detail-page-container  flex flex-col flex-1 min-h-0
      ├ cabecera (X + título)     estática, shrink-0
      ├ fila de tags              estática, shrink-0
      ├ columna de foto           estática, shrink-0, alto 200px, overflow visible
      ├ #detail-scroll            flex-1 overflow-y-auto   ← lo ÚNICO que se desplaza
      └ navegación                shrink-0, pegada abajo por construcción
```

A partir de `lg` todo revierte al layout actual: la rejilla de 12 columnas reaparece (`contents` → `lg:grid`), el documento vuelve a desplazarse y nada scrollea por dentro.

### Decisiones que sostienen el diseño

1. **La rejilla usa `display: contents` por debajo de `lg`.** Sus hijos pasan a ser hijos directos de la columna flex en el orden en que ya están en el DOM, así que no hace falta duplicar marcado ni mover nada. A partir de `lg` vuelve a ser rejilla.

2. **La columna de la foto reserva solo el mínimo (200px) y la caja desborda por encima del contenido.** Sin esto el encogido se realimenta: la foto encoge → el contenedor que se desplaza crece → queda menos recorrido → el scroll se recorta solo → la foto vuelve a crecer. Reservando el mínimo, el alto disponible es constante y el recorrido no depende del encogido. Es la misma invariante que garantizaba el centinela original, obtenida sin centinela.

3. **El contenido arranca con `padding-top: 192px`** (los 160px que la foto puede encoger + los 32px de separación de siempre). Es constante, así que no altera el recorrido. En reposo el contenido empieza exactamente en el borde inferior de la foto; según esta encoge, el contenido aparece 1:1.

4. **La navegación queda fuera del contenedor que se desplaza.** Así se pega abajo sola — que es literalmente lo que `ensureScrollRunway()` simulaba midiendo el bloque y rellenando el hueco que faltaba.

### Qué se elimina

`#detail-header-spacer`, `#detail-tags-fixed-spacer`, `#detail-image-sentinel`, `#detail-scroll-runway`, `updateHeaderSpacer()`, `updateTagsFixed()`, `updateStickyImage()`, `ensureScrollRunway()`, el `overflow-anchor: none` de los cuatro elementos borrados y el `top: calc(...)` de D-102. Neto: **-243 líneas**.

Del scroll solo sobrevive `encogerFoto()`: una propiedad, un elemento, cero lecturas de geometría. Antes eran cuatro escrituras de posición por fotograma más lecturas en vivo de rectángulos de elementos fijos.

## Contrapartida aceptada

La barra del navegador se queda visible siempre, así que se pierde su altura de pantalla útil. El propietario ya paga ese precio en la home y lo aceptó explícitamente para esta pantalla.

## Verificación

Medido en navegador a 390×844 y a 1440×900.

| Comprobación | Resultado |
|---|---|
| El documento no se desplaza (móvil) | `scrollHeight` 844 = `innerHeight` 844 |
| Cabecera inmóvil durante todo el recorrido | borde inferior constante en 172 |
| Navegación inmóvil | borde superior constante en 723 |
| El recorrido NO depende del encogido | constante en 87 mientras el recorte va de 360 a 273 |
| Escritorio: documento se desplaza | sí, envoltorio `overflow: visible` |
| Escritorio: rejilla de 12 columnas | 12 × 80px, contenedor 1224, foto 496×400 |
| Escritorio: el contenido no scrollea aparte | `overflow: visible`, `padding-top: 0` |

**Pendiente:** validación del propietario en Chrome de Android y Safari de iOS con el mismo gesto de la captura de vídeo. Es la única comprobación que este entorno no puede hacer — no tiene barra de URL que se repliegue ni scroll con inercia.
