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
import { fetchSheetRows, mapSheetRow } from '../src/lib/mel.ts';

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

// Proteger contra caída silenciosa de la hoja: si porId está vacío y la caché tiene
// contenido, abortar sin escribir (una hoja vacía legítima vs. una caída se ven iguales).
if (porId.size === 0 && Object.keys(cache).length > 0 && !soloEstos.length) {
  console.error('ERROR: La hoja no devolvió ninguna imagen pero hay caché en disco.');
  console.error('Abortando sin modificar ' + SALIDA + ' (protección contra caída de la hoja).');
  process.exitCode = 1;
  process.exit(1);
}

let hechas = 0;
const fallos = [];
for (let i = 0; i < pendientes.length; i += LOTE) {
  await Promise.all(pendientes.slice(i, i + LOTE).map(async id => {
    try {
      const r = await fetch(`https://drive.google.com/uc?export=download&id=${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const datos = leerCabecera(Buffer.from(await r.arrayBuffer()));
      // Proteger contra respuestas 200 que no sean imágenes válidas.
      if (datos.tipo === 'desconocido' || !datos.px) {
        throw new Error('no es una imagen válida (tipo desconocido)');
      }
      cache[id] = datos;
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
