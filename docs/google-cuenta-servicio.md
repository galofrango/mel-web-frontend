# Cuenta de servicio de Google, paso a paso

Para que el panel pueda **sustituir imágenes en Drive** y **escribir en la hoja** por
sí mismo. Es la única credencial de todo el proyecto.

> **No hace falta saber programar para hacer esto.** Son unos diez minutos de
> pinchar botones. Si algo no se parece a lo que dice aquí, para y pregunta: es
> más barato que deshacerlo.

---

## Antes de empezar, tres cosas que quitan miedo

**Es gratis.** Las APIs de Drive y de Sheets no cuestan nada para este uso. Son 84
ficheros y una hoja; las cuotas gratuitas son de decenas de miles de peticiones al
día. **Si en algún momento te pide una tarjeta, algo va mal** — para y pregunta.

**No tienes que unirte a ningún «Developer Program».** Eso que te ofrece la pantalla
de bienvenida es publicidad de cursos. Ignóralo.

**Una cuenta de servicio no puede hacer nada por su cuenta.** No tiene acceso a tu
Drive. Solo podrá tocar exactamente las dos cosas que tú le compartas: la carpeta
de los carteles y la hoja. Si mañana te arrepientes, dejas de compartírselas y se
acabó.

---

## Qué es una cuenta de servicio, en una frase

Es un **usuario que no es una persona**: tiene su propio correo, y compartes cosas
con él igual que las compartirías con un compañero. La diferencia es que quien
entra con ese correo es un programa, no alguien tecleando.

---

## Paso 1 — Crear un proyecto nuevo

En la captura que me pasaste estás dentro de **«Maps Platform Demo Project»**. Ese
proyecto lo creó Google solo cuando activaste Maps, y es de demostración. **No lo
uses**: haz uno limpio.

1. Ve a [console.cloud.google.com](https://console.cloud.google.com).
2. Arriba del todo, junto al logo, hay un **selector con el nombre del proyecto**
   actual («Maps Platform Demo Project»). Púlsalo.
3. En la ventana que se abre, arriba a la derecha: **«Proyecto nuevo»**.
4. Nombre: `MEL Panel` (o el que quieras). Ubicación: déjala como esté.
5. **Crear**. Tarda unos segundos.
6. Cuando termine, **vuelve al selector y elige el proyecto nuevo**. Esto es
   importante: si te quedas en el de Maps, los pasos siguientes se aplican al sitio
   equivocado.

> **Tu clave de Google Maps no se toca.** Sigue en su proyecto y el sitio sigue
> funcionando igual. Esto es un proyecto aparte para otra cosa.

**Cómo sabes que vas bien:** arriba pone el nombre del proyecto nuevo.

---

## Paso 2 — Encender las dos APIs

Por defecto un proyecto no tiene nada encendido. Hay que decirle qué va a usar.

1. En el menú de la izquierda (o en «Acceso rápido» de la portada): **«APIs y
   servicios»**.
2. Arriba: **«+ Habilitar API y servicios»**.
3. En el buscador escribe **`Google Drive API`**. Sale una tarjeta con ese nombre.
   Púlsala y luego **«Habilitar»**.
4. Vuelve atrás y repite con **`Google Sheets API`**.

**Cómo sabes que vas bien:** en «APIs y servicios → APIs habilitadas» aparecen las
dos en la lista.

> **Si te pide habilitar la facturación**, comprueba que estás habilitando esas dos
> APIs y no otra. Drive y Sheets no la piden.

---

## Paso 3 — Crear la cuenta de servicio

1. Menú izquierdo: **«IAM y administración»** → **«Cuentas de servicio»**.
2. Arriba: **«+ Crear cuenta de servicio»**.
3. **Nombre**: `panel-mel`. El ID se rellena solo. Descripción, si quieres:
   «Arreglos de imagen del panel de control».
4. **«Crear y continuar»**.
5. **Paso 2, «Concede acceso a esta cuenta de servicio»**: **déjalo vacío** y pulsa
   **«Continuar»**. No necesita ningún rol — sus permisos van a venir de compartirle
   la carpeta y la hoja, no de aquí. Es más seguro así.
6. **Paso 3**: vacío también. **«Listo»**.

**Cómo sabes que vas bien:** aparece en la lista, con un correo del estilo
`panel-mel@mel-panel-xxxxxx.iam.gserviceaccount.com`.

**Copia ese correo.** Lo vas a necesitar dos veces.

---

## Paso 4 — Descargar su clave

1. Pulsa sobre la cuenta que acabas de crear.
2. Pestaña **«Claves»**.
3. **«Agregar clave»** → **«Crear clave nueva»**.
4. Tipo: **JSON**. **«Crear»**.
5. Se descarga un fichero `.json`. **Ese fichero es la contraseña.**

### Dónde guardarlo

**Fuera del repositorio.** Si acaba dentro del proyecto, acaba en GitHub, y ese
fichero da permiso de escritura sobre vuestro archivo a quien lo tenga.

Sitio recomendado, en tu carpeta personal:

```
~/.config/mel/panel-google.json
```

Para crear esa carpeta y mover el fichero, desde el Terminal:

```bash
mkdir -p ~/.config/mel && mv ~/Downloads/*.json ~/.config/mel/panel-google.json
```

> Si tienes otros `.json` en Descargas, mueve solo el que toca en vez de usar el
> comodín.

**Y no lo pegues nunca en un chat**, ni conmigo ni con nadie. Con decirme la ruta
sobra.

---

## Paso 5 — Compartirle la carpeta y la hoja

Aquí es donde la cuenta recibe sus permisos. Sin esto no puede hacer nada.

**En Drive:**

1. Abre la carpeta donde están los 84 carteles.
2. Botón derecho → **«Compartir»**.
3. Pega el correo de la cuenta de servicio.
4. Permiso: **«Editor»**. Sin editor no puede sustituir ficheros.
5. **Desmarca «Notificar a las personas»** — no hay nadie a quien avisar.
6. **Enviar** / **Compartir**.

**En la hoja:**

Exactamente lo mismo: abre la hoja, **«Compartir»**, el mismo correo, **«Editor»**.

**Cómo sabes que vas bien:** en la lista de personas con acceso aparece ese correo
raro.

---

## Paso 6 — Decirle al panel dónde está la clave

En la raíz del proyecto hay (o habrá) un fichero llamado `.env`, que ya está
ignorado por git. Añádele esta línea:

```
GOOGLE_CUENTA_SERVICIO=/Users/galo/.config/mel/panel-google.json
```

Con la ruta real, entera, empezando por `/Users/`.

---

## Cuando termines

Dime **solo esto**, sin pegar nada más:

- Que los seis pasos están hechos.
- El correo de la cuenta de servicio (ese sí se puede compartir: no es un secreto,
  es como el nombre de un usuario).

Con eso escribo la comprobación: un script que intente leer un fichero de la carpeta
y escribir en una celda de prueba, y diga si funciona. Si algo falla, el error dirá
exactamente cuál de los seis pasos se quedó a medias.

---

## Si algo no cuadra

| Lo que ves | Qué pasa |
|---|---|
| Te pide una tarjeta de crédito | Estás habilitando otra API. Vuelve al paso 2. |
| No encuentras «Cuentas de servicio» | Estás en el proyecto equivocado. Mira el selector de arriba. |
| «Google Drive API» no aparece al buscar | Escríbelo entero, en inglés y con «API» al final. |
| Te ofrece unirte al Developer Program | Publicidad. Ignóralo. |
| No sabes si estás en el proyecto correcto | El nombre está siempre arriba, junto al logo. |

Y ante cualquier duda, **para y pregunta con lo que ves en pantalla**. Este es el
único punto del proyecto donde una equivocación tiene consecuencias fuera de tu
ordenador.
