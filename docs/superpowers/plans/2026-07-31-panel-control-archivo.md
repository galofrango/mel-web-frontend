# Panel de archivos M.E.L. — pestaña Control · Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development` (recomendada) o `superpowers:executing-plans` para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** una página interna, solo en desarrollo, que diagnostica el estado de los 84 carteles del archivo y ejecuta los arreglos que se pueden automatizar.

**Arquitectura:** la lógica de comprobación vive en módulos **puros** de `src/lib/` sin E/S, así que se puede probar con `node --test` sin navegador. Un script offline descarga los originales de Drive, les lee la cabecera y cachea el resultado en un JSON commiteado. La página `/panel` combina ese JSON con la hoja leída en vivo por `mel.ts`. Los arreglos los ejecuta una ruta de API que **solo existe en desarrollo**, lanzando `sips` en el Mac.

**Stack:** Astro 7 SSR · TypeScript · JavaScript vanilla en cliente · `node:test` (stdlib) · `sips` (macOS) · sin dependencias nuevas.

**Spec:** [2026-07-31-panel-control-archivo-design.md](../specs/2026-07-31-panel-control-archivo-design.md). Ante cualquier duda, manda el spec.

## Global Constraints

- **Cero dependencias nuevas.** Ni de runtime ni de desarrollo. `node --test` y `sips` ya están.
- **Nada redondeado.** `border-radius: 0` en todo (regla 5 del DS).
- **Solo tokens semánticos** (`--mel-bg-primary`, `text-secondary`…), nunca hex a mano. **Única excepción autorizada**: el fondo del banner, `--mel-primitive-le-200` (#e0b8c0), documentada en el spec.
- **Todo script de cliente se engancha con `document.addEventListener('astro:page-load', init)`**, nunca llamando a `init()` directamente (regla 1 de AGENTS.md).
- **El JS de cliente NO construye marcado de sección.** Solo escribe valores dentro del marcado que ya pintó el servidor y alterna clases — el patrón de `AdaptiveTagsRow`, que es el que esquiva la regla 7.
- **Idioma**: interfaz, comentarios y mensajes de commit en español.
- **`sips` siempre con `execFile` y lista de argumentos**, nunca cadena de shell.
- **Ningún commit ni tag sin que el propietario lo pida** (regla 16). Los pasos de commit de este plan se ejecutan solo con su visto bueno.
- **Node ≥ 22.12** (ya en `package.json`). El proyecto corre hoy en Node 25.

---

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/lib/imagen.ts` | **Crear.** Puro. Bytes de un fichero → `{tipo, px, comp, perfil, bytes}`. Sin red, sin disco. |
| `src/lib/auditoria.ts` | **Crear.** Puro. Filas de la hoja + datos técnicos → avisos agrupados, ordenados y con sus niveles. Sin red, sin disco. |
| `scripts/medir-archivo.mjs` | **Crear.** Descarga los originales de Drive y escribe `src/data/flyer_tecnico.json`. Sustituye a `medir-carteles.mjs`. |
| `src/data/flyer_tecnico.json` | **Crear.** Caché técnica. Sustituye a `flyer_ratios.json`. |
| `src/components/PanelTarjeta.astro` | **Crear.** Tarjeta de nivel (Highlight XL). |
| `src/components/PanelSeccion.astro` | **Crear.** Sección plegable con descripción, banner, acciones y tabla. |
| `src/pages/panel.astro` | **Crear.** La página. Guarda de desarrollo + composición + script de cliente. |
| `src/pages/api/panel/arreglar.ts` | **Crear.** Ruta de acción, solo en desarrollo. Lanza `sips`. |
| `src/pages/event/[id].astro` | **Modificar**, 2 líneas (94 y 358): del fichero de ratios al técnico. |
| `test/imagen.test.mjs` | **Crear.** |
| `test/auditoria.test.mjs` | **Crear.** |
| `scripts/medir-carteles.mjs` | **Borrar** al final de la tarea 3. |
| `src/data/flyer_ratios.json` | **Borrar** al final de la tarea 3. |

**Por qué `imagen.ts` y `auditoria.ts` separados:** el primero entiende de bytes y formatos; el segundo, de reglas del archivo. Uno cambia si aparece un formato nuevo, el otro si cambia un umbral. No comparten nada más que un tipo.

---

## Tarea 1: Lectura de cabeceras de imagen

Todo lo técnico del panel sale de aquí. Es puro: entra un `Buffer`, sale un objeto. Sin red y sin disco, así que se prueba entero sin descargar nada.

**Ficheros:**
- Crear: `src/lib/imagen.ts`
- Crear: `test/imagen.test.mjs`

**Interfaces:**
- Consume: nada.
- Produce: `type DatosImagen = { tipo: 'jpeg'|'png'|'gif'|'desconocido'; px: [number, number] | null; comp: number | null; perfil: boolean; bytes: number }` y `leerCabecera(buf: Buffer): DatosImagen`.

- [ ] **Paso 1: escribir el test que falla**

`test/imagen.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerCabecera } from '../src/lib/imagen.ts';

/** PNG mínimo: firma + IHDR con ancho, alto y tipo de color. */
function png(ancho, alto, tipoColor, conICCP = false) {
  const partes = [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])];
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(ancho, 8);
  ihdr.writeUInt32BE(alto, 12);
  ihdr[16] = 8;            // profundidad de bit
  ihdr[17] = tipoColor;    // 2 = color, 6 = color + alfa
  partes.push(ihdr);
  if (conICCP) {
    const c = Buffer.alloc(12);
    c.writeUInt32BE(0, 0);
    c.write('iCCP', 4);
    partes.push(c);
  }
  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0, 0);
  iend.write('IEND', 4);
  partes.push(iend);
  return Buffer.concat(partes);
}

/** JPEG mínimo: SOI + (opcional) APP2 con ICC + SOF0 + EOI. */
function jpeg(ancho, alto, componentes, conICC = false) {
  const partes = [Buffer.from([0xFF, 0xD8])];
  if (conICC) {
    const app2 = Buffer.alloc(4 + 12);
    app2[0] = 0xFF; app2[1] = 0xE2;
    app2.writeUInt16BE(14, 2);
    app2.write('ICC_PROFILE\0', 4, 'latin1');
    partes.push(app2);
  }
  const sof = Buffer.alloc(12);
  sof[0] = 0xFF; sof[1] = 0xC0;
  sof.writeUInt16BE(10, 2);
  sof[4] = 8;
  sof.writeUInt16BE(alto, 5);
  sof.writeUInt16BE(ancho, 7);
  sof[9] = componentes;
  partes.push(sof, Buffer.from([0xFF, 0xD9]));
  return Buffer.concat(partes);
}

test('PNG: dimensiones y alfa', () => {
  const d = leerCabecera(png(2400, 1800, 2));
  assert.equal(d.tipo, 'png');
  assert.deepEqual(d.px, [2400, 1800]);
  assert.equal(d.alfa, false);
  assert.equal(leerCabecera(png(100, 100, 6)).alfa, true);
});

test('PNG: detecta el perfil por el bloque iCCP', () => {
  assert.equal(leerCabecera(png(100, 100, 2, false)).perfil, false);
  assert.equal(leerCabecera(png(100, 100, 2, true)).perfil, true);
});

test('JPEG: dimensiones, componentes y perfil', () => {
  const color = leerCabecera(jpeg(1613, 2235, 3, true));
  assert.equal(color.tipo, 'jpeg');
  assert.deepEqual(color.px, [1613, 2235]);
  assert.equal(color.comp, 3);
  assert.equal(color.perfil, true);

  const cmyk = leerCabecera(jpeg(800, 600, 4, false));
  assert.equal(cmyk.comp, 4);
  assert.equal(cmyk.perfil, false);
});

test('GIF: dimensiones en little-endian', () => {
  const buf = Buffer.alloc(10);
  buf.write('GIF89a', 0, 'latin1');
  buf.writeUInt16LE(500, 6);
  buf.writeUInt16LE(500, 8);
  const d = leerCabecera(buf);
  assert.equal(d.tipo, 'gif');
  assert.deepEqual(d.px, [500, 500]);
});

test('lo que no reconoce no revienta', () => {
  const d = leerCabecera(Buffer.from('<html>no soy una imagen</html>'));
  assert.equal(d.tipo, 'desconocido');
  assert.equal(d.px, null);
});

test('bytes es siempre el tamaño real del buffer', () => {
  const buf = png(10, 10, 2);
  assert.equal(leerCabecera(buf).bytes, buf.length);
});
```

- [ ] **Paso 2: comprobar que falla**

Ejecutar: `node --test test/imagen.test.mjs`
Esperado: FALLA con `Cannot find module '../src/lib/imagen.ts'`.

- [ ] **Paso 3: implementar**

`src/lib/imagen.ts`:

```ts
/**
 * Lee lo que el panel necesita saber de un fichero de imagen SIN descodificarlo:
 * basta con la cabecera. Puro — entra un Buffer, sale un objeto.
 *
 * Por qué la cabecera y no una librería: son 84 ficheros y 125 MB, y todo lo que
 * hace falta (tamaño, formato, si es CMYK, si trae perfil) vive en los primeros
 * bytes. Descodificar 84 imágenes para eso sería pagar mil veces su precio.
 */

export type DatosImagen = {
  tipo: 'jpeg' | 'png' | 'gif' | 'desconocido';
  px: [number, number] | null;
  /** Componentes de color del JPEG: 1 = gris, 3 = YCbCr, 4 = CMYK. `null` si no es JPEG. */
  comp: number | null;
  /** Si el fichero lleva perfil de color incrustado. */
  perfil: boolean;
  /** Si el PNG lleva canal alfa (tipos de color 4 y 6). JPEG nunca lo lleva. */
  alfa: boolean;
  bytes: number;
};

export function leerCabecera(buf: Buffer): DatosImagen {
  const d: DatosImagen = { tipo: 'desconocido', px: null, comp: null, perfil: false, alfa: false, bytes: buf.length };

  // GIF: ancho y alto en los bytes 6-9, little-endian.
  if (buf.length >= 10 && buf.slice(0, 3).toString('latin1') === 'GIF') {
    d.tipo = 'gif';
    d.px = [buf.readUInt16LE(6), buf.readUInt16LE(8)];
    return d;
  }

  // PNG: IHDR siempre en la misma posición; el perfil vive en iCCP o sRGB.
  if (buf.length >= 26 && buf[0] === 0x89 && buf[1] === 0x50) {
    d.tipo = 'png';
    d.px = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    d.alfa = buf[25] === 4 || buf[25] === 6;
    for (let i = 8; i < buf.length - 8;) {
      const largo = buf.readUInt32BE(i);
      const bloque = buf.slice(i + 4, i + 8).toString('latin1');
      if (bloque === 'iCCP' || bloque === 'sRGB') { d.perfil = true; break; }
      if (bloque === 'IDAT' || bloque === 'IEND') break;
      i += 12 + largo;
    }
    return d;
  }

  // JPEG: recorrer marcadores hasta el SOF (0xC0–0xC3), mirando de paso el APP2
  // que lleva el perfil ICC.
  if (buf.length >= 4 && buf[0] === 0xFF && buf[1] === 0xD8) {
    d.tipo = 'jpeg';
    for (let i = 2; i < buf.length - 9;) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const marcador = buf[i + 1];
      const largo = buf.readUInt16BE(i + 2);
      if (marcador === 0xE2 && buf.slice(i + 4, i + 15).toString('latin1') === 'ICC_PROFILE') d.perfil = true;
      if (marcador >= 0xC0 && marcador <= 0xC3) {
        d.px = [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
        d.comp = buf[i + 9];
      }
      i += 2 + largo;
    }
    return d;
  }

  return d;
}

/** El lado mayor, o 0 si no se pudieron leer las dimensiones. */
export function ladoMayor(d: DatosImagen): number {
  return d.px ? Math.max(d.px[0], d.px[1]) : 0;
}
```

- [ ] **Paso 4: comprobar que pasa**

Ejecutar: `node --test test/imagen.test.mjs`
Esperado: 6 tests en verde.

- [ ] **Paso 5: commit** (solo con el visto bueno del propietario)

```bash
git add src/lib/imagen.ts test/imagen.test.mjs
git commit -m "feat(panel): lectura de cabeceras de imagen sin descodificar"
```

---

## Tarea 2: Script de medición del archivo

Descarga los 84 originales, les pasa `leerCabecera` y deja el resultado en un JSON commiteado. Es el equivalente de `medir-carteles.mjs`, con dos diferencias que importan.

**Ficheros:**
- Crear: `scripts/medir-archivo.mjs`
- Crear (lo genera el script): `src/data/flyer_tecnico.json`

**Interfaces:**
- Consume: `leerCabecera` de la tarea 1; `SHEET_ID`, `fetchSheetRows`, `mapSheetRow` de `src/lib/mel.ts`.
- Produce: `src/data/flyer_tecnico.json` con forma `{ [driveId]: { tipo, px, comp, perfil, alfa, bytes } }`.

**Dos cosas que NO se pueden copiar del script viejo:**

1. **La URL.** El script viejo mide por `drive.google.com/thumbnail?id=…&sz=w2400`, que **topa en 2400px**: un original de 4961×9674 sale medido como 1230×2400 y parece correcto. Por eso no detectaba los seis carteles de más de 3000px. Este usa `https://drive.google.com/uc?export=download&id=ID`, que devuelve el original.
2. **`curl` no sirve.** Recibe 0 bytes de ese endpoint; `fetch` de Node funciona. Ya costó un rato una vez.

- [ ] **Paso 1: escribir el script**

`scripts/medir-archivo.mjs`:

```js
#!/usr/bin/env node
/**
 * Mide los originales del archivo y cachea el resultado en
 * `src/data/flyer_tecnico.json`.
 *
 * Por qué existe: el panel y la ficha de evento necesitan saber tamaño, formato,
 * perfil y peso de cada cartel ANTES de pintar. Son 84 descargas y ~125 MB, así
 * que se resuelve offline una vez y se commitea. Mismo patrón que
 * `fetch_sheet.py` + `resolved_coordinates.json`.
 *
 * Uso:
 *   node scripts/medir-archivo.mjs           solo lo que falta (incremental)
 *   node scripts/medir-archivo.mjs --todo    vuelve a medirlo todo
 *   node scripts/medir-archivo.mjs MEL-00008 MEL-00012   solo esos
 *
 * OJO: `curl` recibe 0 bytes de este endpoint de Drive y `fetch` de Node no.
 * Si algún día deja de ir, mira por ahí antes de dudar de la URL.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { leerCabecera } from '../src/lib/imagen.ts';
import { fetchSheetRows, mapSheetRow, extractDriveImage } from '../src/lib/mel.ts';

const SALIDA = 'src/data/flyer_tecnico.json';
const LOTE = 8;   // subirlo hace que Drive corte

const args = process.argv.slice(2);
const rehacerTodo = args.includes('--todo');
const soloEstos = args.filter(a => a.startsWith('MEL-'));

/** El id de Drive de una URL de la hoja, en cualquiera de sus dos formas. */
function idDeDrive(url) {
  if (!url) return '';
  if (url.includes('id=')) return url.split('id=')[1].split('&')[0];
  if (url.includes('/d/')) return url.split('/d/')[1].split('/')[0];
  return '';
}

const filas = (await fetchSheetRows())
  .map(f => mapSheetRow(f.c))
  .filter(i => i && i.idMel && i.idMel.startsWith('MEL-'));

const porId = new Map();
for (const f of filas) {
  const id = idDeDrive(f.urlDrive);
  if (id && (!soloEstos.length || soloEstos.includes(f.idMel))) porId.set(id, f.idMel);
}

const cache = !rehacerTodo && existsSync(SALIDA) ? JSON.parse(readFileSync(SALIDA, 'utf8')) : {};
const pendientes = [...porId.keys()].filter(id => rehacerTodo || soloEstos.length || !cache[id]);
console.log(`${porId.size} imágenes · ${Object.keys(cache).length} ya medidas · ${pendientes.length} por medir`);

let hechas = 0;
const fallos = [];
for (let i = 0; i < pendientes.length; i += LOTE) {
  await Promise.all(pendientes.slice(i, i + LOTE).map(async id => {
    try {
      const r = await fetch(`https://drive.google.com/uc?export=download&id=${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      cache[id] = leerCabecera(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      fallos.push(`${porId.get(id)} (${id}): ${e.message}`);
    }
    hechas++;
  }));
  process.stdout.write(`\r  ${hechas}/${pendientes.length}`);
}
if (pendientes.length) process.stdout.write('\n');

// Se retiran las entradas de imágenes que ya no están en la hoja.
for (const id of Object.keys(cache)) if (!porId.has(id) && !soloEstos.length) delete cache[id];

// Ordenado por clave para que el diff se pueda leer.
const ordenado = Object.fromEntries(Object.keys(cache).sort().map(k => [k, cache[k]]));
writeFileSync(SALIDA, JSON.stringify(ordenado, null, 1) + '\n');
console.log(`${SALIDA}: ${Object.keys(ordenado).length} entradas`);

if (fallos.length) {
  console.log(`\n${fallos.length} fallos (se reintentan en la próxima pasada):`);
  fallos.forEach(f => console.log(`  ${f}`));
  process.exitCode = 1;
}
```

- [ ] **Paso 2: ejecutarlo de verdad**

Ejecutar: `node scripts/medir-archivo.mjs`
Esperado: `84 imágenes · 0 ya medidas · 84 por medir`, luego `src/data/flyer_tecnico.json: 84 entradas`, sin fallos. Tarda cerca de un minuto.

- [ ] **Paso 3: comprobar el resultado contra lo ya medido**

Ejecutar:

```bash
node -e '
const c = require("./src/data/flyer_tecnico.json");
const v = Object.values(c);
const cuenta = t => v.filter(x => x.tipo === t).length;
console.log("jpeg", cuenta("jpeg"), "· png", cuenta("png"), "· gif", cuenta("gif"));
console.log("sin perfil", v.filter(x => !x.perfil).length);
console.log("cmyk", v.filter(x => x.comp === 4).length);
console.log("png con alfa", v.filter(x => x.tipo === "png" && x.alfa).length);
console.log("mayor de 3000", v.filter(x => x.px && Math.max(...x.px) > 3000).length);
'
```

Esperado, medido el 31/07/2026: `jpeg 50 · png 33 · gif 1`, `sin perfil 34`, `cmyk 1`, `png con alfa 20`, `mayor de 3000 6`. Si el reparto de formatos no da 50/33/1, algo va mal en la descarga — coincide con `docs/imagenes.md`.

- [ ] **Paso 4: commit**

```bash
git add scripts/medir-archivo.mjs src/data/flyer_tecnico.json
git commit -m "feat(panel): script de medición del archivo contra los originales de Drive"
```

---

## Tarea 3: La ficha de evento pasa al fichero técnico

Dos líneas, y de paso desaparecen el fichero y el script viejos. Se hace **antes** que el panel para no tener nunca dos cachés vivas a la vez.

**Ficheros:**
- Modificar: `src/pages/event/[id].astro` líneas 10, 94 y 358
- Borrar: `src/data/flyer_ratios.json`, `scripts/medir-carteles.mjs`

**Interfaces:**
- Consume: `src/data/flyer_tecnico.json` de la tarea 2.
- Produce: nada nuevo.

- [ ] **Paso 1: ver exactamente qué hay hoy**

Ejecutar: `grep -n "flyerRatios\|flyer_ratios" src/pages/event/\[id\].astro`
Esperado: tres líneas — el import (10) y dos usos (94 y 358).

- [ ] **Paso 2: cambiar las tres**

Línea 10:

```ts
import flyerTecnico from '../../data/flyer_tecnico.json';
```

Línea 94 — antes:

```ts
  .map((i: any) => flyerRatios[idDeDrive(i.urlDrive)])
```

después:

```ts
  .map((i: any) => flyerTecnico[idDeDrive(i.urlDrive)]?.px)
```

Línea 358 — cambiar `flyerRatios[idDeDrive(...)]` por `flyerTecnico[idDeDrive(...)]?.px`, dejando el resto de la expresión igual.

- [ ] **Paso 3: comprobar que compila**

Ejecutar: `npm run build`
Esperado: build sin errores.

- [ ] **Paso 4: comprobar en el navegador que no hay regresión**

Ejecutar `npm run dev` y abrir `/event/MEL-00037` (5 imágenes de proporciones distintas) y `/event/MEL-00001` (600×289, muy apaisada).
Esperado: la caja de la imagen tiene el alto correcto **desde la primera pintada**, sin salto al cargar, y al pasar de una imagen a otra del carrusel no hay salto. Ese anti-salto es la única razón por la que existe la caché (D-157); si se rompe, no sigas.

- [ ] **Paso 5: retirar lo viejo**

```bash
git rm src/data/flyer_ratios.json scripts/medir-carteles.mjs
grep -rn "flyer_ratios\|flyerRatios\|medir-carteles" src/ scripts/ docs/ README.md AGENTS.md
```

Esperado del `grep`: solo apariciones en documentación, que se arreglan en la tarea 8. Si sale alguna en `src/` o `scripts/`, hay un consumidor que se pasó por alto.

- [ ] **Paso 6: commit**

```bash
git add -A
git commit -m "refactor(datos): una sola caché técnica; retira flyer_ratios y medir-carteles"
```

---

## Tarea 4: Las comprobaciones

El corazón del panel, y puro: entra lo que ya tienes en memoria, salen los avisos agrupados y ordenados. Sin red, sin disco, sin DOM. Todo lo que este módulo decide se puede probar.

**Ficheros:**
- Crear: `src/lib/auditoria.ts`
- Crear: `test/auditoria.test.mjs`

**Interfaces:**
- Consume: `DatosImagen` y `ladoMayor` de la tarea 1.
- Produce:
  - `type Item = { idMel: string; fila: number; evento: string; px: string; peso: string; bytes: number; mayor: number }`
  - `type Grupo = { clave: string; nivel: 1|2|3; titulo: string; consecuencia: string; accion: string|null; auto: boolean; descripcion: string; aviso: string|null; items: Item[] }`
  - `auditar(filas: FilaHoja[], tecnico: Record<string, DatosImagen>): Grupo[]` — devuelve **solo los grupos con items**, en el orden de trabajo.
  - `CENTINELAS: Set<string>`, `estaVacio(v: unknown): boolean`
  - `LIMPIO: string[]` — los rótulos de las comprobaciones que hoy dan cero.

**El orden NO es alfabético ni por tamaño: es el orden de trabajo**, y está medido en el spec. Arreglar PNG + CMYK + grandes resuelve 25 de los 34 «sin perfil» y 17 de los 25 «+2 MB». Si alguien lo reordena por número de avisos, hace que el panel proponga recomprimir 17 imágenes que iban a bajar solas.

- [ ] **Paso 1: escribir el test que falla**

`test/auditoria.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditar, estaVacio } from '../src/lib/auditoria.ts';

const filaBase = {
  n: 2, idMel: 'MEL-00001', evento: 'Trip with us', urlDrive: 'https://drive.google.com/file/d/AAA/view',
  lugar: 'El Gran Café', localidad: 'León', coordenadas: 'https://maps.google.com/…!3d42.5!4d-5.5',
  artistas: 'DJ Uno', notasArchivo: '',
};
const tecBase = { tipo: 'jpeg', px: [1600, 2000], comp: 3, perfil: true, alfa: false, bytes: 900000 };

const claves = (filas, tec) => auditar(filas, tec).map(g => g.clave);
const grupo = (filas, tec, clave) => auditar(filas, tec).find(g => g.clave === clave);

test('un archivo impecable no genera ni un aviso', () => {
  assert.deepEqual(claves([filaBase], { AAA: tecBase }), []);
});

test('los centinelas de la hoja cuentan como vacío', () => {
  for (const v of ['', '  ', 'Desconocido', 'SIN FECHA', 'No detallados', 'Varios']) {
    assert.equal(estaVacio(v), true, `"${v}" debería contar como vacío`);
  }
  assert.equal(estaVacio('El Gran Café'), false);
});

test('detecta los avisos técnicos por separado', () => {
  const casos = [
    ['png',      { ...tecBase, tipo: 'png' }],
    ['cmyk',     { ...tecBase, comp: 4 }],
    ['enorme',   { ...tecBase, px: [4961, 9674] }],
    ['sin-perfil', { ...tecBase, perfil: false }],
    ['pesado',   { ...tecBase, bytes: 3 * 1024 * 1024 }],
    ['pequeno',  { ...tecBase, px: [600, 289] }],
    ['gif',      { ...tecBase, tipo: 'gif' }],
  ];
  for (const [clave, tec] of casos) {
    assert.ok(claves([filaBase], { AAA: tec }).includes(clave), `esperaba el aviso "${clave}"`);
  }
});

test('detecta los huecos de datos', () => {
  assert.ok(claves([{ ...filaBase, lugar: 'Desconocido' }], { AAA: tecBase }).includes('sin-lugar'));
  assert.ok(claves([{ ...filaBase, coordenadas: 'Desconocido' }], { AAA: tecBase }).includes('sin-coordenadas'));
  assert.ok(claves([{ ...filaBase, artistas: '' }], { AAA: tecBase }).includes('sin-artistas'));
});

// Hacen falta DOS filas: "enorme" (>3000px) y "pequeno" (<1200px) se excluyen
// mutuamente, así que una sola fila no puede disparar los dos grupos y la última
// aserción sería insatisfacible.
test('el orden es el de trabajo: lo que arrastra a lo demás va primero', () => {
  const filas = [
    { ...filaBase, idMel: 'MEL-A', urlDrive: '.../d/A/view', lugar: '', coordenadas: '' },
    { ...filaBase, idMel: 'MEL-B', urlDrive: '.../d/B/view' },
  ];
  const tec = {
    A: { ...tecBase, tipo: 'png', perfil: false, bytes: 3 * 1024 * 1024, px: [4961, 9674], comp: 4 },
    B: { ...tecBase, px: [600, 289] },
  };
  const orden = claves(filas, tec);
  // Si el fixture deja de disparar alguno de los ocho, el deepEqual de abajo
  // fallaría igual, pero por la razón equivocada (fixture roto, no orden roto).
  for (const c of ['sin-lugar', 'sin-coordenadas', 'png', 'cmyk', 'enorme', 'sin-perfil', 'pesado', 'pequeno']) {
    assert.ok(orden.includes(c), `el fixture debe disparar "${c}"`);
  }
  // La secuencia ENTERA, no comparaciones por pares: con pares sueltos se pueden
  // intercambiar dos reglas contiguas sin que salte nada (comprobado por mutación).
  assert.deepEqual(orden, [
    'sin-lugar', 'sin-coordenadas', 'png', 'cmyk', 'enorme', 'sin-perfil', 'pesado', 'pequeno',
  ], 'el orden es de TRABAJO, no un ranking: arreglar los de arriba resuelve los de abajo');
});

test('el orden es el de trabajo: gif (nivel 2) antes que sin-artistas (nivel 3)', () => {
  const fila = { ...filaBase, artistas: '' };
  const orden = claves([fila], { AAA: { ...tecBase, tipo: 'gif' } });
  assert.deepEqual(orden, ['gif', 'sin-artistas']);
});

test('dentro de cada grupo, lo peor primero', () => {
  const filas = [
    { ...filaBase, idMel: 'MEL-A', urlDrive: '.../d/A/view' },
    { ...filaBase, idMel: 'MEL-B', urlDrive: '.../d/B/view' },
  ];
  const tec = {
    A: { ...tecBase, tipo: 'png', bytes: 1_000_000 },
    B: { ...tecBase, tipo: 'png', bytes: 3_000_000 },
  };
  assert.deepEqual(grupo(filas, tec, 'png').items.map(i => i.idMel), ['MEL-B', 'MEL-A'],
    'los PNG se ordenan por peso descendente');

  const tecPeq = {
    A: { ...tecBase, px: [1000, 900] },
    B: { ...tecBase, px: [500, 400] },
  };
  assert.deepEqual(grupo(filas, tecPeq, 'pequeno').items.map(i => i.idMel), ['MEL-B', 'MEL-A'],
    'en baja resolución el peor es el más pequeño');
});

test('la marca en notasArchivo silencia solo ese aviso', () => {
  const tec = { AAA: { ...tecBase, tipo: 'png', perfil: false } };
  const conMarca = [{ ...filaBase, notasArchivo: 'Escaneo del propio autor. #acepta:png' }];
  const c = claves(conMarca, tec);
  assert.ok(!c.includes('png'), 'el aviso marcado desaparece');
  assert.ok(c.includes('sin-perfil'), 'los demás avisos del mismo cartel siguen');
});

test('un grupo sin items no se devuelve', () => {
  assert.equal(auditar([filaBase], { AAA: tecBase }).length, 0);
});

test('una imagen que no está en la caché técnica no revienta', () => {
  const c = claves([filaBase], {});
  assert.ok(Array.isArray(c));
});
```

- [ ] **Paso 2: comprobar que falla**

Ejecutar: `node --test test/auditoria.test.mjs`
Esperado: FALLA, no existe el módulo.

- [ ] **Paso 3: implementar**

`src/lib/auditoria.ts`. Estructura obligatoria (el texto completo de descripciones y banners está en el spec, sección *Las diez comprobaciones*, y se copia literal):

```ts
/**
 * Las reglas del archivo. Puro: entra lo que ya está en memoria, salen los
 * avisos. Sin red, sin disco, sin DOM — por eso se puede probar entero.
 *
 * El ORDEN de GRUPOS es un orden de TRABAJO, no un ranking por número: arreglar
 * los de arriba resuelve los de abajo. Medido sobre el archivo el 31/07/2026:
 * convertir los 33 PNG, el CMYK y los 6 grandes resuelve de paso 25 de los 34
 * "sin perfil" y 17 de los 25 "+2 MB". Reordenarlo por cantidad hace que el panel
 * proponga recomprimir 17 imágenes que iban a bajar solas.
 */
import { ladoMayor, type DatosImagen } from './imagen.ts';

/** Lo que la hoja usa para decir "no hay dato". Mismos que el DS. */
export const CENTINELAS = new Set(['', 'desconocido', 'sin fecha', 'no detallados', 'varios']);

export function estaVacio(v: unknown): boolean {
  return CENTINELAS.has(String(v ?? '').trim().toLowerCase());
}

const MB = (b: number) => (b / 1048576).toFixed(1).replace('.', ',') + ' MB';

/** Comprobaciones que hoy dan cero. El panel las enseña igual: si no dice lo que
 *  miró y pasó, no sabes si llegó a mirarlo. */
export const LIMPIO = ['Sin imagen', 'Fecha ilegible', 'ID duplicado', 'Fila fuera del archivo',
  'Sin diseñador', 'Sin localidad', 'Proporción imposible'];

type Criterio = 'bytes' | 'px-desc' | 'px-asc' | 'id';

// clave, nivel, título, consecuencia, acción, auto, descripción, banner, criterio, prueba
const REGLAS = [
  ['sin-lugar', 1, 'Sin lugar', 'No hay local que situar en el mapa', 'Abrir en la hoja', false,
   /* descripción y banner: copiar del spec */ '', null, 'id',
   (f, t) => estaVacio(f.lugar)],
  ['sin-coordenadas', 1, 'Sin coordenadas', 'El evento no aparece en el mapa', 'Abrir en la hoja', false,
   '', null, 'id',
   (f, t) => estaVacio(f.coordenadas)],
  ['png', 2, 'Archivo PNG', 'Hasta 10× de peso en miniatura, y la galería carga 32 de golpe', 'Convertir a JPG', true,
   '', null, 'bytes',
   (f, t) => t.tipo === 'png'],
  ['cmyk', 2, 'En CMYK', 'Espacio de imprenta; el soporte en navegador es irregular', 'Pasar a sRGB', true,
   '', null, 'bytes',
   (f, t) => t.comp === 4],
  ['enorme', 2, 'Por encima de 3000 px', 'Nada del sitio lo muestra a ese tamaño', 'Reducir a 2400 px', true,
   '', null, 'px-desc',
   (f, t) => ladoMayor(t) > 3000],
  ['sin-perfil', 2, 'Sin perfil de color', 'El navegador lo pinta como sRGB; si no lo era, sale apagado', 'Incrustar sRGB', true,
   '', null, 'bytes',
   (f, t) => t.tipo !== 'desconocido' && !t.perfil],
  ['pesado', 2, 'Por encima de 2 MB', 'El original tarda en llegar, y Drive no lo deja cachear', 'Recomprimir', true,
   '', null, 'bytes',
   (f, t) => t.bytes > 2 * 1048576],
  ['pequeno', 2, 'Baja resolución', 'Por debajo de 1200 px: no se estira, se ve pequeño', null, false,
   '', null, 'px-asc',
   (f, t) => ladoMayor(t) > 0 && ladoMayor(t) < 1200],
  ['gif', 2, 'GIF animado', 'Drive no lo redimensiona: se descarga entero', null, false,
   '', null, 'bytes',
   (f, t) => t.tipo === 'gif'],
  ['sin-artistas', 3, 'Sin artistas', 'El archivo no sabe quién pinchó', 'Abrir en la hoja', false,
   '', null, 'id',
   (f, t) => estaVacio(f.artistas)],
] as const;

const VACIO: DatosImagen = { tipo: 'desconocido', px: null, comp: null, perfil: false, alfa: false, bytes: 0 };

const ORDENA: Record<Criterio, (a, b) => number> = {
  bytes: (a, b) => b.bytes - a.bytes,
  'px-desc': (a, b) => b.mayor - a.mayor,
  'px-asc': (a, b) => a.mayor - b.mayor,
  id: (a, b) => a.idMel.localeCompare(b.idMel),
};

export function auditar(filas, tecnico) {
  // Recorrer REGLAS en su orden, y para cada una recorrer filas. Saltar la fila
  // si `notasArchivo` contiene `#acepta:<clave>`. Construir el Item con px, peso,
  // bytes y mayor. Ordenar con ORDENA[criterio]. Devolver solo grupos con items.
}
```

Reglas de implementación de `auditar()`:
- La imagen que no está en `tecnico` usa `VACIO`, así que no dispara ningún aviso técnico. Nunca lanza.
- El silenciado se comprueba con `String(fila.notasArchivo).toLowerCase().includes('#acepta:' + clave)`.
- El `Item.px` es `px.join('×')` o `'—'`; `Item.peso` es `MB(bytes)` o `'—'`.
- **Las descripciones y banners se copian literalmente del spec.** Son texto de producto, ya revisado por el propietario; no los reescribas.

- [ ] **Paso 4: comprobar que pasa**

Ejecutar: `node --test test/auditoria.test.mjs`
Esperado: 9 tests en verde.

- [ ] **Paso 5: contrastar contra el archivo real**

Ejecutar:

```bash
node -e '
import("./src/lib/auditoria.ts").then(async ({ auditar }) => {
  const { fetchSheetRows, mapSheetRow } = await import("./src/lib/mel.ts");
  const tec = JSON.parse(require("fs").readFileSync("src/data/flyer_tecnico.json", "utf8"));
  const filas = (await fetchSheetRows()).map((f, i) => ({ ...mapSheetRow(f.c), n: i + 2 }))
    .filter(f => f.idMel && f.idMel.startsWith("MEL-"));
  auditar(filas, tec).forEach(g => console.log(String(g.items.length).padStart(3), g.clave));
});'
```

Esperado, el 31/07/2026: `1 sin-lugar · 3 sin-coordenadas · 33 png · 1 cmyk · 6 enorme · 34 sin-perfil · 25 pesado · 13 pequeno · 1 gif · 2 sin-artistas`, **en ese orden**.

- [ ] **Paso 6: commit**

```bash
git add src/lib/auditoria.ts test/auditoria.test.mjs
git commit -m "feat(panel): las diez comprobaciones del archivo, puras y con tests"
```

---

## Tarea 5: La página en SSR, solo lectura

Todo lo que se ve, pintado por el servidor. Sin ninguna acción todavía: si esto está bien, ya es útil por sí solo.

**Ficheros:**
- Crear: `src/pages/panel.astro`
- Crear: `src/components/PanelTarjeta.astro`
- Crear: `src/components/PanelSeccion.astro`

**Interfaces:**
- Consume: `auditar`, `LIMPIO` de la tarea 4; `fetchSheetRows`, `mapSheetRow`, `extractDriveImage`, `escHtml` de `mel.ts`; `src/data/flyer_tecnico.json`.
- Produce: el marcado con los ganchos que usa la tarea 6 — `[data-nivel]`, `[data-clave]`, `.fila[data-id]`, `.tarj`, `.sec-cab[aria-expanded]`, `.nn`, `.cifra`, `.lins`.

**El guarda va primero, antes que nada:**

```astro
---
if (!import.meta.env.DEV) return new Response(null, { status: 404 });
---
```

**Geometría, del spec** (rejilla de Figma que suma 1224): `42 · 326 · 160 · 120 · 120 · 220 · 220`, filas de 64px, **divisiones verticales** entre columnas y ninguna horizontal, 24px de aire al pie de la lista.

**El enlace del MEL** va a su celda: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=0#gid=0&range=K${fila}`.

**Las miniaturas** con `extractDriveImage(urlDrive, 200)` y `referrerpolicy="no-referrer"` (regla 8).

- [ ] **Paso 1: escribir los dos componentes y la página**

Marcado y estilos exactos: sección *Interfaz* del spec. Puntos que no se pueden negociar:
- Nada con `border-radius`.
- Solo tokens semánticos, salvo el banner (`--mel-primitive-le-200`).
- Cabecera de sección = `<button aria-expanded>` que ocupa toda la banda, con fondo `bg-secondary` y `bg-tertiary` en hover.
- Acciones en bloque con el atributo `disabled` puesto **desde el servidor**.
- «Abrir en la hoja» **no** se pinta como acción en bloque.
- Orden dentro de la cabecera: descripción → nota de automatización → banner. Sin banner, un divisor a 24px de los bordes.

- [ ] **Paso 2: comprobar que la ruta existe en desarrollo**

Ejecutar `npm run dev` y abrir `http://localhost:4321/panel`.
Esperado: las tres tarjetas con 3 / 63 / 2, y las diez secciones en el orden de la tarea 4, cada una con sus filas y sus miniaturas.

- [ ] **Paso 3: comprobar que NO existe en producción**

```bash
npm run build
grep -rl "Panel de archivos" dist/ || echo "OK: el panel no está en el build"
```

Esperado: `OK: el panel no está en el build`. **Si aparece algún fichero, para y arregla el guarda antes de seguir** — es el punto 1 de la sección de seguridad del spec.

- [ ] **Paso 4: comprobar un enlace a la hoja**

Pulsar el MEL de la primera fila de «Sin lugar».
Esperado: se abre la hoja **con esa celda seleccionada**. Si cae en otra fila, el desfase está en el `+2` de la numeración (la fila 1 es la cabecera) y se corrige ahí.

- [ ] **Paso 5: repaso visual en navegador real**

Escritorio a 1440px y móvil a 375px. Modo claro y oscuro.
Esperado: nada desbordado, ninguna esquina redondeada, el banner legible en ambos temas.

- [ ] **Paso 6: commit**

```bash
git add src/pages/panel.astro src/components/PanelTarjeta.astro src/components/PanelSeccion.astro
git commit -m "feat(panel): página de control del archivo, solo en desarrollo"
```

---

## Tarea 6: El cliente

Plegar secciones, seleccionar filas, ocultar avisos y recalcular. **El JS no construye marcado**: solo escribe valores y alterna clases sobre lo que pintó el servidor.

**Ficheros:**
- Modificar: `src/pages/panel.astro` (bloque `<script>` al final)

**Interfaces:**
- Consume: los ganchos de la tarea 5.
- Produce: nada que consuma otra tarea.

- [ ] **Paso 1: escribir el script**

Enganchado con `document.addEventListener('astro:page-load', init)` y con guarda de doble inicialización (regla 1). Comportamientos:

1. **Pestañas** Control / Preparación.
2. **Tarjetas** que filtran: al pulsar una, solo se ven sus secciones.
3. **Chevron** que pliega la sección (`aria-expanded` en la cabecera).
4. **Selección**: casilla por fila, «Seleccionar todos» sobre las visibles. Las acciones en bloque se **activan solo si hay selección**.
5. **Ocultar aviso** por fila y en bloque; «Ver avisos ocultos» los recupera.
6. **Recalcular** tras cualquier cambio: cifra de cada tarjeta (**IDs únicos**, no suma de secciones — un cartel puede estar en varias), su desglose de tres líneas más `… +N`, el contador entre corchetes de cada sección, y atenuar la sección que se queda vacía.

- [ ] **Paso 2: probar los seis comportamientos en el navegador**

Con `npm run dev` en `/panel`:
- Pulsar «Bajo rendimiento» → solo se ven sus siete secciones.
- Plegar y desplegar una sección.
- Marcar una casilla → las dos acciones en bloque se encienden. Desmarcarla → se apagan.
- «Seleccionar todos» y luego «Ocultar seleccionados» → las filas desaparecen, el contador entre corchetes baja, la cifra de la tarjeta baja y la sección queda atenuada.
- «Ver avisos ocultos» → vuelven.
- **Ocultar un cartel que esté en dos secciones** (por ejemplo un PNG que además pase de 2 MB): comprobar que la cifra de la tarjeta baja **una sola vez**. Es el fallo que este paso existe para cazar.

- [ ] **Paso 3: comprobar que no hay doble binding**

Navegar a `/` y volver a `/panel` con el `ClientRouter`, y repetir una selección.
Esperado: cada acción ocurre **una vez**. Si algo pasa dos veces, `init()` se está registrando dos veces (regla 1).

- [ ] **Paso 4: commit**

```bash
git add src/pages/panel.astro
git commit -m "feat(panel): plegado, selección, ocultar avisos y recálculo en vivo"
```

---

## Tarea 7: Los arreglos automáticos

La ruta que lanza `sips`. **Fase 1: no sube nada a Drive** — procesa y deja los ficheros en una carpeta local para que el propietario los suba con «Gestionar versiones». La subida automática es la fase 2 y necesita una cuenta de servicio, que aún no está decidida.

**Ficheros:**
- Crear: `src/pages/api/panel/arreglar.ts`
- Modificar: `src/pages/panel.astro` (llamar a la ruta desde los botones)

**Interfaces:**
- Consume: `leerCabecera` (tarea 1) para remedir; `src/data/flyer_tecnico.json`.
- Produce: `POST /api/panel/arreglar` con cuerpo `{ accion: string, ids: string[] }` → `{ ok: boolean, carpeta: string, hechos: string[], fallos: string[], tecnico: Record<string, DatosImagen> }`.

**Seguridad, los cuatro puntos del spec:**

```ts
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });
  // …
};
```

- Los ids de Drive se validan con `/^[A-Za-z0-9_-]{10,}$/` **antes** de tocar nada.
- Las rutas de fichero se derivan de ese id validado, **nunca** de texto de la hoja.
- `sips` se lanza con `execFile(cmd, [args])`, jamás con una cadena.

**Los comandos, verificados sobre ficheros reales:**

| Acción | Argumentos de `sips` |
|---|---|
| Incrustar sRGB | `['--matchTo', '/System/Library/ColorSync/Profiles/sRGB Profile.icc', ent, '--out', sal]` |
| Pasar a sRGB (CMYK) | los mismos |
| Convertir a JPG | `['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '--matchTo', PERFIL, ent, '--out', sal]` |
| Reducir a 2400 px | `['--resampleHeightWidthMax', '2400', '--matchTo', PERFIL, ent, '--out', sal]` |
| Recomprimir | `['-s', 'formatOptions', 'N', ent, '--out', sal]`, bajando N hasta entrar en 2 MB |

**`--matchTo` va SIEMPRE con la conversión de formato.** Medido: `sips -s format jpeg` a secas deja el resultado etiquetado como **Adobe RGB**. Arreglas el peso y creas un problema de color.

**Qué NO hace esta ruta:** no acepta `png` con `alfa: true` (hay que decidir el fondo, decisión pendiente del propietario) ni `gif` (destruiría los 177 fotogramas). Devuelve esos ids en `fallos` con el motivo.

- [ ] **Paso 1: escribir la ruta**

Flujo: validar ids → descargar cada original de Drive → `execFile('sips', […])` sobre un temporal → escribir el resultado en `arreglos/<AAAA-MM-DD>/<MEL-XXXXX>.<ext>` → **remedir el resultado con `leerCabecera`** → devolver el técnico nuevo.

- [ ] **Paso 2: probar la ruta a pelo, con un solo fichero**

```bash
curl -s -X POST http://localhost:4321/api/panel/arreglar \
  -H 'content-type: application/json' \
  -d '{"accion":"cmyk","ids":["MEL-00006"]}' | head -40
```

Esperado: `ok: true`, un fichero en `arreglos/…/MEL-00006.jpg`, y en `tecnico` ese id con `comp: 3` y `perfil: true`. Comprobar además:

```bash
sips -g space -g profile arreglos/*/MEL-00006.jpg
```

Esperado: `space: RGB` y `profile: sRGB IEC61966-2.1`. Antes era CMYK y ~798 KB; debería quedar en torno a 225 KB.

- [ ] **Paso 3: probar que rechaza lo que debe rechazar**

```bash
curl -s -X POST http://localhost:4321/api/panel/arreglar -H 'content-type: application/json' \
  -d '{"accion":"gif","ids":["MEL-00077"]}'
curl -s -X POST http://localhost:4321/api/panel/arreglar -H 'content-type: application/json' \
  -d '{"accion":"png","ids":["MEL-00008"]}'
curl -s -X POST http://localhost:4321/api/panel/arreglar -H 'content-type: application/json' \
  -d '{"accion":"png","ids":["../../etc/passwd"]}'
```

Esperado: el primero rechazado por animado, el segundo por llevar alfa, el tercero por id inválido — los tres en `fallos`, ninguno escribe nada, y **ninguno devuelve 500**.

- [ ] **Paso 4: comprobar que la ruta no existe en producción**

```bash
npm run build && grep -rl "arreglar" dist/ || echo "OK: la ruta no está en el build"
```

- [ ] **Paso 5: conectar los botones y comprobar el recálculo completo**

Los botones llaman a la ruta, y con el `tecnico` que devuelve **se recalculan TODAS las secciones**, no solo la pulsada.

En el navegador: arreglar el CMYK (`MEL-00006`) y comprobar que desaparece de «En CMYK» **y también de «Sin perfil de color»**, y que las dos cifras bajan. Es la regla del spec: una acción arregla varios avisos a la vez, y parchear solo la sección pulsada deja el panel mintiendo.

- [ ] **Paso 6: commit**

```bash
git add src/pages/api/panel/arreglar.ts src/pages/panel.astro
git commit -m "feat(panel): arreglos con sips en local, sin subir a Drive todavía"
```

---

## Tarea 8: Documentación

Sin esto la tarea no está hecha (Política de Actualización Continuada de AGENTS.md).

**Ficheros:**
- Modificar: `docs/architecture.md`, `docs/decisions.md`, `docs/imagenes.md`, `docs/roadmap.md`, `AGENTS.md`, `README.md`

- [ ] **Paso 1: `architecture.md`** — el nuevo origen de datos (hoja en vivo + `flyer_tecnico.json`), la ruta solo en desarrollo, y que `flyer_ratios.json` ya no existe.

- [ ] **Paso 2: `decisions.md`** — una decisión por cada una: ruta solo en desarrollo; caché técnica única en vez de dos ficheros; marca en `notasArchivo` en vez de un JSON paralelo; licencia del primitivo `le-200` para el banner; orden de secciones por cascada (con los números medidos); descarte de la ampliación por IA; descarte del arreglo automático del GIF.

- [ ] **Paso 3: `imagenes.md`** — dos trampas medidas que hoy no están:
  - `sips -s format jpeg` sin `--matchTo` deja el fichero en **Adobe RGB**.
  - Escribir «Desconocido» en la columna de coordenadas **es peor que dejarla vacía**: `parseCoords()` solo aplica el respaldo por localidad si la celda está vacía.
  - Y corregir el ID del GIF: es `MEL-00077`, no `MEL-00074`.

- [ ] **Paso 4: `AGENTS.md`** — sustituir `medir-carteles.mjs` por `medir-archivo.mjs`, y añadir `npm test` a la sección de comandos. Anotar en la regla 7 que el panel usa el patrón bueno (el servidor pinta, el cliente solo escribe valores).

- [ ] **Paso 5: `roadmap.md`** — Control completado; Preparación pendiente; la subida automática a Drive (fase 2) como decisión abierta.

- [ ] **Paso 6: `package.json`** — añadir `"test": "node --test"`.

- [ ] **Paso 7: comprobar que no queda ninguna referencia muerta**

```bash
grep -rn "flyer_ratios\|medir-carteles" docs/ AGENTS.md README.md src/ scripts/
```

Esperado: sin resultados, salvo menciones históricas explícitas en `decisions.md`.

- [ ] **Paso 8: commit**

```bash
git add -A
git commit -m "docs: panel de control del archivo y las trampas que destapó"
```

---

## Auto-revisión de este plan

**Cobertura del spec**: los diez avisos, los tres niveles y el orden por cascada están en la tarea 4 con test que lo fija; el fichero técnico único en las tareas 2 y 3; la lectura del original en la 2; las marcas de `notasArchivo` en la 4; la interfaz en la 5; el recálculo tras cada acción en la 6 y 7; los cuatro puntos de seguridad en las tareas 5 y 7; la documentación en la 8.

**Hueco encontrado en el spec, y decidido aquí:** el spec no dice qué hace «Ocultar aviso» **sin credenciales**. La marca vive en `notasArchivo` de la hoja, y escribir en la hoja es fase 2. Decisión: en fase 1 el botón oculta la fila en la sesión y **abre la celda de la hoja con la marca en el portapapeles** para pegarla. El panel la lee al releer. Hay que reflejarlo en el spec al cerrar la tarea 6.

**Fuera de alcance, y a propósito**: la pestaña Preparación, la subida automática a Drive, el aplanado de los 20 PNG con alfa, la decisión sobre el GIF, y las tres imágenes en escala de grises. Las cinco están en *Decisiones pendientes* del spec.

**Sin marcadores de posición**: todos los pasos llevan comando o código. Las descripciones y banners de `auditoria.ts` se copian literales del spec — que sí los tiene completos — y por eso van vacías en el esqueleto, con la instrucción explícita de no reescribirlos.
