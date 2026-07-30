# Insights de usuarios

Qué hemos observado de gente usando MEL, y qué decisiones salieron de ahí.

Este archivo existe porque el porqué se pierde antes que el qué. El código dice
lo que hace y `decisions.md` dice cómo se implementó, pero ninguno de los dos
recuerda **que alguien no encontró el buscador**. Sin eso, dentro de un año
alguien "arregla" el orden de la pica y devuelve el problema.

## Cómo usar este archivo

- Una entrada por observación, con **fecha** y **de dónde sale**.
- **Distinguir siempre la fuente.** No es lo mismo "un usuario no lo encontró"
  que "al propietario no le gusta": lo primero es un dato sobre el producto, lo
  segundo una decisión de diseño legítima. Mezclarlos hace que dentro de un año
  no se sepa si algo era un problema real o una preferencia.
- Enlazar la decisión que salió de ahí (`D-xxx` en [decisions.md](decisions.md)).
- **Las observaciones que NO llevaron a un cambio también se apuntan.** Saber que
  algo se detectó y se decidió no tocarlo vale tanto como el cambio.
- Si una observación se contradice más adelante, no se borra: se añade la nueva
  debajo. La equivocación forma parte del registro.

---

## 2026-07-30 · Primera ronda de feedback (amigos del propietario)

Primera vez que el sitio sale de las manos de su autor. Muestra pequeña y no
representativa —gente cercana, avisada de que era una prueba— pero el primer
contacto con ojos que no saben dónde está nada.

### El buscador no se identifica como buscador

**Fuente:** varios usuarios de la primera ronda.
**Observación:** el título "Memoria Electrónica Leonesa" con su pica es en
realidad el campo de búsqueda, y la gente no lo reconoce como tal. Lo lee como
el logotipo del sitio y no lo pulsa.
**Estado:** ABIERTO. Es el problema de fondo y no se ha resuelto.
**Qué se hizo:** de momento nada que lo ataque directamente. La intención es una
V2 del buscador donde el estado de reposo sea ya el campo con su placeholder
visible, en vez del título. Pendiente de decidir: si el título desaparece del
encabezado o el placeholder pasa a hacer de título — cambia la identidad de la
página y está sin resolver.

### Quienes SÍ lo entienden pulsan a la derecha de la pica

**Fuente:** varios usuarios de la primera ronda.
**Observación:** entre quienes deducen que ahí se busca, el gesto natural es
pulsar **a la derecha de la pica** —donde iría el texto si el caret estuviera
esperando— y no sobre el logotipo. Con la pica al final del título, ese punto
cae fuera del botón: el toque no hace nada.
**Por qué importa:** no era un problema de tamaño de la zona pulsable, sino de
que el caret señalaba al sitio equivocado. La pica es una promesa de dónde va a
aparecer el texto, y la promesa apuntaba al vacío.
**Qué se hizo:** V1.2 — la pica pasa delante del título ([D-151](decisions.md)).
El mismo gesto instintivo aterriza ahora sobre el texto, que sí es pulsable. No
se amplió la zona de click: solo cambió de lado el caret.
**Y después:** se le resta peso visual al título para que la pica destaque sobre
él. Al estar a la izquierda su parpadeo se nota menos —antes cerraba la frase,
donde la vista acaba de leer—. Se probó primero `text-secondary` y el propietario
pidió bajar otra talla hasta `text-tertiary`, que es donde está (ver las dos
entradas de más abajo: el aplazamiento del contraste y el peso de la letra).
**Siguiente paso:** probar la V1.2 con usuarios ANTES de construir la V2. Si el
gesto ya responde, puede que el problema 2 desaparezca y la V2 solo tenga que
atacar el 1.

### Los marcadores agrupados del mapa se leen mal

**Fuente:** feedback de la primera ronda.
**Observación:** un número a secas en la burbuja del mapa (`12`) se lee como
"aquí hay doce eventos", cuando lo que significa es "aquí y alrededor".
**Qué se hizo:** un `+` delante del número ([D-149](decisions.md)).
**Estado:** el `+` no acaba de convencer al propietario. Se mantiene mientras se
prueba, pero puede caer. Al revisarlo apareció de paso un defecto real: el texto
del cluster era el único de todos los marcadores renderizado en una caja más
pequeña que su propia línea ([D-150](decisions.md)).

### El título largo colapsa a siglas mucho antes de lo necesario

**Fuente:** el propietario, mirando el sitio en varios tamaños.
**Observación:** "Memoria Electrónica Leonesa" pasaba a "M.E.L." por debajo de
1024px, y el título entero cabe en pantallas mucho más pequeñas.
**Regla que dio el propietario:** el título nunca puede quedar a menos de 40px
del menú o de su botón.
**Qué se hizo:** medido el ancho real (300px con Space Grotesk) contra el menú y
el padding en cada tramo; el título cabe en cualquier ancho ≥437px. El colapso
baja de 1024 a 440px ([D-151](decisions.md)), reutilizando un breakpoint que el
proyecto ya usa.


### El título en `tertiary`: contraste aplazado a conciencia

**Fuente:** el propietario, tras avisarle de que el contraste queda en 2,92 sobre
un umbral AA de 3,0 (22px en negrita cuenta como texto grande).
**Decisión:** se queda en `tertiary` **de momento**. La prioridad ahora es que el
buscador se identifique como tal, y bajar el peso visual del título es lo que deja
a la pica llamar la atención. No se sube el tono todavía porque el título va a
cambiar de todas formas: falta la introducción a la página y un logo estable.
**Esto NO es un descuido de accesibilidad, es un aplazamiento con condición de
salida:** el tono se corrige cuando existan la intro y el logo, y en cualquier
caso antes de abrir al público. Si se corrige, hay que tocar también el
placeholder del campo (`#ad858d`) o quedarán dos grises distintos — resulta que
`text-tertiary` resuelve exactamente a ese mismo color, así que el reposo está
literalmente pintado con el color del placeholder.

### "Memoria" se pegaba: las letras en negrita clara

**Fuente:** el propietario, mirando el título ya en `tertiary`.
**Observación:** las letras de "Memoria" parecían pegarse entre sí, "efecto arroz
glutinoso", solo al aclarar el color.
**Causa:** el título lleva `tracking-[-0.44px]` —espaciado NEGATIVO— y con trazos
gruesos el hueco entre letras casi desaparece. En un tono oscuro el contraste
ayudaba a separarlas; al aclararlo, esa ayuda se pierde.
**Qué se hizo:** bajar el peso de 700 a 600 ([D-154](decisions.md)). Encaja fino
porque Space Grotesk mantiene los mismos avances entre pesos (medido: 299,5px en
700 y en 600), así que los trazos se afinan sin moverse de sitio y el hueco
visible se abre. De paso, el cálculo del breakpoint de 440px no se ve afectado.
**Palanca de fondo sin usar:** relajar el tracking negativo, que es la causa real.
Se dejó como reserva por si el peso no bastara.

---

## 2026-07-30 · Observaciones del propietario en aparatos reales

No son feedback de usuarios, pero salen de uso real y no de una prueba
sintética. Se apuntan aparte a propósito.

### El destello al volver de un evento al panel del mapa depende del aparato

**Observación:** al cerrar una ficha para volver al panel abierto sobre el mapa,
se ve pasar la galería antes. Ocurre en **Safari móvil** y en **Chrome de
escritorio con el inspector en modo móvil**; en **Chrome móvil no se aprecia** o
va lo bastante rápido para no notarse.
**Por qué importa:** es una carrera contra la velocidad del aparato, así que
"a mí no me pasa" no es prueba de que esté arreglado. Cualquier verificación de
esto tiene que decir en qué navegador y aparato se hizo.
**Qué se hizo:** enmascarar la vuelta ([D-144](decisions.md)), con poca mejora
percibida ([D-146](decisions.md)). El arreglo de fondo —que el servidor respete
`?view=`— sigue pendiente y borraría el enmascarado.

### Toques breves en la lista que no navegan

**Observación:** al pulsar una fila de la lista en móvil, a veces no pasa nada si
el toque ha sido muy breve. Reportado varias veces, no siempre reproducible.
**Qué se encontró:** los elementos CON estado pulsado diseñado eran justamente
los que peor respondían — estaban excluidos de la regla que hace la
realimentación inmediata y conservaban un fundido de 200ms, así que en un toque
breve el color no llegaba nunca ([D-142](decisions.md)).
**Estado:** ARREGLADO lo visual. **Sin confirmar** si además fallaba la
navegación: no se puede reproducir en el entorno del agente, que no genera
entrada táctil real. Si sigue pasando, el sospechoso es el navegador cancelando
el click al detectar scroll, y eso pide atender `touchend` a mano.

---

## Lo que este proyecto no puede verificar solo

Recordatorio permanente, porque afecta a cómo se leen todas las entradas de
arriba. El entorno del agente **no** puede comprobar:

- **Entrada táctil real.** Los eventos sintéticos no generan el `click` que sí
  genera un dedo, así que nada de lo que dependa del tacto se valida ahí.
- **Transiciones de vista.** La pestaña va en segundo plano (`document.hidden`)
  y Chrome aborta toda transición en un documento oculto.
- **Animaciones y parpadeos.** Los fotogramas están congelados salvo que se
  fuerce uno; una pica parpadeante sale con `opacity: 0` y un marcador con
  animación de entrada sale escalado a ~0,6.
- **El mapa.** La API de Google Maps no carga: el área sale gris.
- **Cómo QUEDA algo.** Todo juicio estético es del propietario en un aparato de
  verdad.

De ahí la regla del traspaso: **si una prueba sintética dice que algo funciona y
el propietario dice que no, tiene razón él.**
