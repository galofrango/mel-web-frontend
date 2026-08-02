# Cómo accede el panel a Google

El panel de control necesita **sustituir imágenes en Drive** y **escribir en la
hoja**. Para eso entra con **las credenciales del propietario**, no con las de un
usuario robot: se identifica una vez en el navegador y queda un permiso guardado en
el Mac, revocable en cualquier momento.

> **No hace falta saber programar.** Son un rato de pinchar en la consola de Google
> y dos órdenes en el Terminal. Si algo no se parece a lo que dice aquí, para y
> pregunta.

---

## Antes de empezar

**Es gratis.** Las APIs de Drive y de Sheets no cuestan nada para este uso: 84
ficheros y una hoja, contra cuotas de decenas de miles de peticiones al día. **Si
en algún momento te pide una tarjeta, algo va mal** — para y pregunta.

**No hay que unirse a ningún «Developer Program».** Eso que ofrece la pantalla de
bienvenida es publicidad de cursos.

**Vale la cuenta del dominio.** Aunque tenga políticas de seguridad puestas, esas
prohíben crear *claves*, no habilitar APIs ni identificarse.

---

## Paso 1 — Un proyecto

Un «proyecto» de Google Cloud es solo un contenedor donde se encienden servicios y
se contabiliza su uso. No cuesta nada tenerlo.

1. Entra en [console.cloud.google.com](https://console.cloud.google.com).
2. Arriba, junto al logo, hay un **selector con el nombre del proyecto** actual.
   Púlsalo.
3. **«Proyecto nuevo»**, arriba a la derecha.
4. Nombre: `MEL Panel`. Ubicación, como venga.
5. **Crear**, y cuando termine **vuelve al selector y elige el nuevo**. Si te
   quedas en otro, todo lo que hagas después se aplica al sitio equivocado.

> Si ya tenías un **«Maps Platform Demo Project»**, déjalo en paz: lo creó Google
> al activar Maps y tu clave del mapa sigue ahí. Esto es aparte y no lo toca.

**Cómo sabes que vas bien:** arriba pone `MEL Panel`.

**Apunta el ID del proyecto** — no el nombre. Está en la portada, junto al número, y
tiene esta pinta: `mel-panel-472913`. Lo necesitas en el paso 4.

---

## Paso 2 — Encender las dos APIs

Un proyecto nuevo no trae nada encendido.

1. Menú izquierdo (o «Acceso rápido»): **«APIs y servicios»**.
2. **«+ Habilitar API y servicios»**.
3. Busca **`Google Drive API`**, púlsala, **«Habilitar»**.
4. Vuelve atrás y repite con **`Google Sheets API`**.

**Cómo sabes que vas bien:** en «APIs habilitadas» aparecen las dos.

---

## Paso 3 — Instalar la herramienta de Google

```bash
brew install --cask google-cloud-sdk
```

Tarda: son unos cuantos cientos de megas. Al terminar, **abre una terminal nueva** —
el instalador toca el arranque y las terminales ya abiertas no se enteran — y
comprueba:

```bash
gcloud --version
```

---

## Paso 4 — Identificarte

```bash
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/cloud-platform
```

Se abre el navegador. **Entra con la cuenta dueña del archivo y de la hoja** — esa
es la que importa, no la que creó el proyecto.

Puede salir un aviso de «aplicación no verificada»: es normal, la aplicación es la
propia herramienta de Google que acabas de instalar. Continúa.

Y después, con el ID del paso 1:

```bash
gcloud auth application-default set-quota-project TU_ID_DE_PROYECTO
```

Sin esto, las llamadas pueden rechazarse por no saber a qué proyecto atribuirlas.

**Dónde queda el permiso:** en un fichero dentro de `~/.config/gcloud/`. No se toca
ni se mueve: las librerías lo encuentran solas. Y **nunca entra en el repositorio**.

---

## Lo que estás concediendo, dicho claro

`auth/drive` es **acceso completo a tu Drive**, no solo a la carpeta de los
carteles. No es una elección: Google no ofrece un permiso intermedio que sirva aquí
— el que existe, `drive.file`, solo alcanza a ficheros que la propia aplicación
haya creado, y aquí hay que modificar 84 que ya existían.

Tres cosas lo acotan:

- El permiso **vive solo en tu Mac**. No viaja a ningún servidor.
- El panel **solo corre cuando tú lo arrancas** con `npm run dev`.
- Lo retiras cuando quieras en
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

Queda escrito porque es más de lo que habría necesitado un usuario robot, y dentro
de un año alguien puede preguntarse por qué el panel podía leer todo el Drive.

---

## Cuando termines

Dime **solo** que los cuatro pasos están hechos y el **ID del proyecto** — eso no es
secreto. Con eso se escribe la comprobación: un script que lea un fichero de la
carpeta y escriba en una celda de prueba, y diga si funciona o exactamente qué
falta.

---

## Si algo no cuadra

| Lo que ves | Qué pasa |
|---|---|
| Te pide una tarjeta | Estás habilitando otra API. Vuelve al paso 2. |
| `gcloud: command not found` | Cierra la terminal y abre una nueva. |
| «Aplicación no verificada» | Es la herramienta de Google. Continúa. |
| No sabes en qué proyecto estás | El nombre está siempre arriba, junto al logo. |
| El navegador no se abre solo | `gcloud` imprime una URL: ábrela a mano. |

---

## Por qué no se usa una cuenta de servicio

Fue el primer plan: crear un usuario robot con su propia clave, compartirle la
carpeta y la hoja, y que el panel entrase con esa identidad. Es lo correcto cuando
una herramienta la usan varias personas o corre sin nadie delante.

**Se descartó porque el dominio del propietario lo prohíbe.** Al intentar descargar
la clave, Google respondió con la política `iam.disableServiceAccountKeyCreation`:
la organización impide crear claves descargables de cuentas de servicio. Es una
restricción razonable —un fichero de clave es lo más fácil de perder— y no se
esquiva sin permisos de administrador del dominio.

De las tres salidas posibles —crear el proyecto con una cuenta personal fuera de la
organización, pedir una excepción de la política, o entrar como el propietario— se
eligió la tercera. Y no solo porque fuese la que quedaba: **para un panel que va a
usar una sola persona, es la más honesta.** El panel hace lo que su dueño puede
hacer, ni más ni menos, y no hay una identidad extra dando vueltas con permisos
sobre el archivo.

Si algún día lo usa más gente, la cuenta de servicio vuelve a ser lo correcto — y
entonces habrá que resolver antes lo de la política del dominio.
