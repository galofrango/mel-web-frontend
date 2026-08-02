# Cómo accede el panel a Google

El panel de control necesita **sustituir imágenes en Drive** y **escribir en la
hoja**. Lo hace con una **cuenta de servicio**: un usuario que no es una persona,
con su propio correo, al que se le comparte la carpeta y la hoja como se le
compartirían a un compañero.

**Estado: montado el 02/08/2026.** Lo que queda por hacer está en «Lo que falta».

---

## Lo que hay montado

| | |
|---|---|
| Cuenta de Google | `galo.franganillo@gmail.com` |
| Organización | `galo-franganillo-org` (id `251873064771`) — la creó Google sola |
| Proyecto | `mel-panel`, dentro de esa organización |
| APIs habilitadas | `drive.googleapis.com`, `sheets.googleapis.com` |
| Cuenta de servicio | `panel-mel@mel-panel.iam.gserviceaccount.com` |
| Clave | `~/.config/mel/panel-google.json`, permisos `600` |
| Variable de entorno | `GOOGLE_CUENTA_SERVICIO` en `.env` (ignorado por git) |

**La clave nunca entra en el repositorio.** Vive en la carpeta personal, `.env`
está en `.gitignore`, y lo que se commitea es la ruta, no el contenido.

---

## Lo que falta

**Compartir la carpeta y la hoja con la cuenta de servicio.** Sin esto no puede
tocar nada: la cuenta existe pero no tiene acceso a nada de tu Drive.

Correo a compartir:

```
panel-mel@mel-panel.iam.gserviceaccount.com
```

**En Drive:** abre la carpeta con los 84 carteles → botón derecho → **Compartir** →
pega ese correo → permiso **Editor** → desmarca «Notificar a las personas» (no hay
nadie a quien avisar) → **Compartir**.

**En la hoja:** lo mismo. Abrir, **Compartir**, mismo correo, **Editor**.

Después de eso, el circuito está completo y se puede comprobar.

---

## Por qué costó, y qué se tocó para arreglarlo

Esto queda escrito porque no es evidente y va a hacer falta si algún día hay que
rehacerlo.

**El problema.** Al intentar descargar la clave, Google respondió con la política
`iam.disableServiceAccountKeyCreation`: *«se aplicó una política de la organización
que impide la creación de claves para cuentas de servicio en tu empresa»*. Con una
cuenta personal de Gmail y sin dominio propio, el mensaje no tenía sentido.

**La causa.** Google había creado una **organización** de forma automática,
`galo-franganillo-org`, y el proyecto `mel-panel` cuelga de ella. Las
organizaciones nuevas nacen con políticas de seguridad por defecto, y esa es una de
ellas. La sorpresa es tener una organización sin haberla pedido, no la política.

**El intento intermedio, y por qué se descartó.** Antes de encontrar la causa se
probó a entrar con las credenciales del propietario en vez de con una cuenta de
servicio (`gcloud auth application-default login`). Falló dos veces:

1. `gcloud` avisó de que **los permisos de Drive y Sheets van a bloquearse** para
   su identificador genérico. Y no era una advertencia a futuro: la pantalla
   siguiente ya decía **«Esta aplicación está bloqueada»**.
2. La salida a eso —crear un identificador OAuth propio— arrastra la pantalla de
   consentimiento, y para una app **externa en modo de pruebas** el permiso
   **caduca cada 7 días**. Publicarla para que no caduque exige la verificación de
   Google, porque el permiso de Drive completo es de los «restringidos».

O sea: la vía de las credenciales de usuario obligaba a re-identificarse cada
semana, o a pasar una verificación de Google. Ninguna de las dos cosas es aceptable
para algo que tiene que estar ahí cuando haga falta.

**Lo que se tocó.** Dos cambios, los dos reversibles:

1. Al propietario se le concedió `roles/orgpolicy.policyAdmin` sobre su
   organización. Ya era `organizationAdmin`, pero Google separó la gestión de
   políticas en un rol aparte.
2. La política `iam.disableServiceAccountKeyCreation` se desactivó **solo para el
   proyecto `mel-panel`**. En el resto de la organización sigue vigente.

```bash
# Para volver a activarla, si algún día se quiere:
gcloud resource-manager org-policies enable-enforce \
  iam.disableServiceAccountKeyCreation --project=mel-panel
```

**Y esa política protegía de algo real**: un fichero de clave es lo más fácil de
perder de todo lo que hay aquí. Se ha aceptado el riesgo a conciencia, con dos
medidas: la clave vive fuera del repositorio con permisos `600`, y la cuenta solo
puede tocar lo que se le comparta explícitamente. Si mañana se filtra, se revoca la
clave desde la consola y se acabó.

---

## Por qué una cuenta de servicio y no entrar como el propietario

Porque **no caduca, no pide navegador y no depende de una pantalla de
consentimiento**. Se configura una vez y sigue funcionando dentro de un año.

Entrar como el propietario habría sido más honesto en un sentido —el panel haría
lo que su dueño puede hacer, ni más ni menos— pero en la práctica significaba
re-identificarse cada semana. Y una herramienta que hay que reparar cada lunes
acaba sin usarse.

Además, la cuenta de servicio concede **menos** acceso, no más: solo alcanza lo que
se le comparta. La vía del propietario exigía el permiso `auth/drive`, que es
acceso completo a todo el Drive.

---

## Si algo falla

| Lo que ves | Qué pasa |
|---|---|
| `403` al leer o escribir en Drive | Falta compartir la carpeta con el correo de la cuenta de servicio, o está compartida como Lector en vez de Editor. |
| `403` al escribir en la hoja | Lo mismo, pero con la hoja. |
| `404` sobre un fichero que existe | La cuenta no lo ve porque no está dentro de lo compartido. |
| Vuelve la política al crear otra clave | La excepción es por proyecto: si se creó otro proyecto, hay que repetirla ahí. |
| Se perdió la clave | Se crea otra: `gcloud iam service-accounts keys create` con la misma cuenta. La vieja se revoca desde la consola. |

Las órdenes de `gcloud` necesitan esto en el PATH, que el instalador de Homebrew no
añade a las terminales ya abiertas:

```bash
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
```
