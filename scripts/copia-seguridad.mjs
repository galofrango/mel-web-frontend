#!/usr/bin/env node
/**
 * Copia de seguridad del ARCHIVO (no del código: ese ya está en GitHub).
 *
 * Por qué existe: la hoja y las imágenes viven en la misma cuenta de Google, así
 * que un solo problema con esa cuenta se lleva por delante a la vez los carteles
 * y todo el catalogado. Copiar a Google Drive no vale — es la misma cesta. Este
 * script deja una copia completa fuera de Google.
 *
 * Dos detalles que separan una copia de una copia ÚTIL:
 *   - Los ficheros se guardan como `MEL-00001.jpg`, no con el nombre opaco de
 *     Drive. Si algún día falta la hoja, la carpeta se explica sola.
 *   - Va también la hoja exportada y un índice en CSV plano, que sobrevive a
 *     cualquier programa que hoy no exista.
 *
 * Uso:
 *   node scripts/copia-seguridad.mjs                    al destino por defecto
 *   node scripts/copia-seguridad.mjs /otra/ruta         a donde le digas
 *
 * OJO: `curl` recibe 0 bytes del endpoint de Drive y `fetch` de Node no.
 */

import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SHEET_ID, fetchSheetRows, mapSheetRow } from '../src/lib/mel.ts';

const DESTINO_POR_DEFECTO = '/Users/galo/Library/Mobile Documents/com~apple~CloudDocs/M.E.L.';
const LOTE = 8;

const base = process.argv[2] || DESTINO_POR_DEFECTO;
const hoy = new Date().toISOString().slice(0, 10);
const carpeta = join(base, hoy);
const originales = join(carpeta, 'originales');

/** El id de Drive de una URL de la hoja, en cualquiera de sus dos formas. */
function idDeDrive(url) {
  if (!url) return '';
  if (url.includes('id=')) return url.split('id=')[1].split('&')[0];
  if (url.includes('/d/')) return url.split('/d/')[1].split('/')[0];
  return '';
}

/** La extensión real, leída de los primeros bytes — no del nombre, que no hay. */
function extension(buf) {
  if (buf.slice(0, 3).toString('latin1') === 'GIF') return 'gif';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'jpg';
  return 'bin';
}

const csv = v => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

if (!existsSync(base)) {
  console.error(`No existe el destino:\n  ${base}`);
  process.exit(1);
}
mkdirSync(originales, { recursive: true });
console.log(`Copia en ${carpeta}\n`);

// ---------- 1. La hoja ----------
const xlsx = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`);
if (!xlsx.ok) throw new Error(`la hoja no se pudo exportar: HTTP ${xlsx.status}`);
const bytesHoja = Buffer.from(await xlsx.arrayBuffer());
writeFileSync(join(carpeta, 'hoja.xlsx'), bytesHoja);
console.log(`hoja.xlsx  ${(bytesHoja.length / 1024).toFixed(0)} KB`);

// ---------- 2. Las imágenes ----------
const filas = (await fetchSheetRows())
  .map(f => mapSheetRow(f.c))
  .filter(i => i && i.idMel && i.idMel.startsWith('MEL-'));

console.log(`${filas.length} carteles por copiar\n`);

const indice = [['idMel', 'evento', 'fecha', 'lugar', 'localidad', 'fichero', 'bytes'].join(',')];
const fallos = [];
let hechos = 0, total = 0;

for (let i = 0; i < filas.length; i += LOTE) {
  await Promise.all(filas.slice(i, i + LOTE).map(async f => {
    const id = idDeDrive(f.urlDrive);
    if (!id) { fallos.push(`${f.idMel}: sin URL de imagen`); return; }
    try {
      const r = await fetch(`https://drive.google.com/uc?export=download&id=${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const nombre = `${f.idMel}.${extension(buf)}`;
      writeFileSync(join(originales, nombre), buf);
      indice.push([f.idMel, f.evento, f.fecha, f.lugar, f.localidad, nombre, buf.length].map(csv).join(','));
      total += buf.length;
      hechos++;
    } catch (e) {
      fallos.push(`${f.idMel}: ${e.message}`);
    }
  }));
  process.stdout.write(`\r  ${hechos}/${filas.length}`);
}
process.stdout.write('\n');

// ---------- 3. Lo que hace la copia legible dentro de diez años ----------
indice.sort((a, b) => (a.startsWith('idMel') ? -1 : a.localeCompare(b)));
writeFileSync(join(carpeta, 'indice.csv'), indice.join('\n') + '\n');

writeFileSync(join(carpeta, 'LEEME.txt'),
`Memoria Electrónica Leonesa — copia del archivo
Fecha de la copia: ${hoy}

QUÉ HAY AQUÍ
  originales/   Los ${hechos} carteles tal cual están en Google Drive, sin tocar,
                nombrados por su identificador (MEL-00001.jpg y así).
  hoja.xlsx     La hoja de Google Sheets completa, exportada.
  indice.csv    Texto plano: qué cartel es cada fichero. Se abre con cualquier
                cosa, hoy y dentro de veinte años.

QUÉ NO HAY
  El código del sitio web. Está en GitHub:
  https://github.com/galofrango/mel-web-frontend

POR QUÉ ESTA COPIA VIVE FUERA DE GOOGLE
  La hoja y las imágenes están en la misma cuenta de Google. Un problema con esa
  cuenta se llevaría las dos cosas a la vez, así que una copia dentro de Google
  Drive no protegería de nada.

CÓMO REHACERLA
  node scripts/copia-seguridad.mjs
`);

console.log(`\nindice.csv · LEEME.txt`);
console.log(`\n${hechos} carteles · ${(total / 1048576).toFixed(0)} MB`);
if (fallos.length) {
  console.log(`\n${fallos.length} FALLOS:`);
  fallos.forEach(f => console.log(`  ${f}`));
  process.exitCode = 1;
} else {
  console.log('Sin fallos.');
}
