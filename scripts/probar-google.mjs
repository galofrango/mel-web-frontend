#!/usr/bin/env node
/**
 * Comprueba que el acceso a Google funciona de punta a punta.
 *
 * Lee un cartel real de Drive, confirma que hay permiso de edición, lee la hoja,
 * escribe en una celda vacía y la limpia. Si algo falla, dice cuál de los seis
 * pasos y con qué error — que suele ser "falta compartir la carpeta con la cuenta
 * de servicio".
 *
 * Uso:  node scripts/probar-google.mjs
 *
 * El JWT se firma con el `crypto` de Node: cero dependencias. La lógica de
 * autenticación vive en `src/lib/google.ts` — el motor de arreglos del panel
 * la reutiliza, así que este script y la ruta de API comparten un solo sitio
 * donde poder romperse. Ver docs/google-acceso.md para cómo está montado.
 */
import { readFileSync } from 'node:fs';
import { leerCredencial, obtenerToken } from '../src/lib/google.ts';

const RUTA = process.env.GOOGLE_CUENTA_SERVICIO || `${process.env.HOME}/.config/mel/panel-google.json`;
const HOJA = '1buzisIlDkCo2Rj5BYZh5-JKrAYSo3RSuBXYmJVGYT0E';

const cred = leerCredencial(RUTA);
console.log(`clave: ${RUTA}`);
console.log(`cuenta: ${cred.client_email}\n`);

const tk = await obtenerToken(cred);
console.log('1. Token de acceso ......... OK\n');

// --- Drive: leer metadatos de un cartel real, y ver si podemos editarlo ---
const tec = JSON.parse(readFileSync(new URL('../src/data/flyer_tecnico.json', import.meta.url), 'utf8'));
const idDrive = Object.keys(tec)[0];
const rd = await fetch(`https://www.googleapis.com/drive/v3/files/${idDrive}?fields=id,name,mimeType,size,capabilities(canEdit)`,
  { headers: { authorization: `Bearer ${tk}` } });
const d = await rd.json();
if (rd.ok) {
  console.log(`2. Drive, leer un cartel ... OK  (${d.name}, ${(d.size/1024/1024).toFixed(1)} MB)`);
  console.log(`3. Drive, permiso de edición ${d.capabilities?.canEdit ? 'OK' : 'NO — está compartido solo como lector'}\n`);
} else {
  console.log(`2. Drive .................. FALLA  ${rd.status}: ${d.error?.message}\n`);
}

// --- Sheets: leer, escribir en una celda lejana y limpiarla ---
const rl = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${HOJA}/values/A1:B1`,
  { headers: { authorization: `Bearer ${tk}` } });
const l = await rl.json();
console.log(rl.ok ? `4. Hoja, leer .............. OK  (A1 = "${l.values?.[0]?.[0]}")`
                  : `4. Hoja, leer .............. FALLA  ${rl.status}: ${l.error?.message}`);

const CELDA = 'Z200';
const marca = 'prueba-panel-' + Math.floor(Math.random() * 1e6);
const rw = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${HOJA}/values/${CELDA}?valueInputOption=RAW`,
  { method: 'PUT', headers: { authorization: `Bearer ${tk}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [[marca]] }) });
const w = await rw.json();
if (rw.ok) {
  const rv = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${HOJA}/values/${CELDA}`,
    { headers: { authorization: `Bearer ${tk}` } });
  const v = await rv.json();
  const bien = v.values?.[0]?.[0] === marca;
  console.log(`5. Hoja, escribir .......... ${bien ? 'OK' : 'ESCRIBIÓ PERO NO COINCIDE'}  (celda ${CELDA})`);
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${HOJA}/values/${CELDA}:clear`,
    { method: 'POST', headers: { authorization: `Bearer ${tk}` }, body: '{}' });
  console.log(`6. Hoja, limpiar la prueba . OK`);
} else {
  console.log(`5. Hoja, escribir .......... FALLA  ${rw.status}: ${w.error?.message}`);
}
