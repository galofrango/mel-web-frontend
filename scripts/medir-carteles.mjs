#!/usr/bin/env node
/**
 * Mide las dimensiones reales de cada cartel y las cachea en
 * `src/data/flyer_ratios.json`.
 *
 * Por qué existe: la ficha de evento necesita saber la proporción de las
 * imágenes ANTES de pintar, para dar a la caja el alto que de verdad hace falta
 * sin dar un salto al cargar. El servidor no puede averiguarlo en cada petición
 * —serían tantas descargas como imágenes tenga el evento, y latencia en cada
 * visita— así que se resuelve offline una vez y se commitea el resultado. Es el
 * mismo patrón de `fetch_sheet.py` + `resolved_coordinates.json`.
 *
 * Uso:
 *   node scripts/medir-carteles.mjs            solo lo que falta (incremental)
 *   node scripts/medir-carteles.mjs --todo     vuelve a medirlo todo
 *   node scripts/medir-carteles.mjs --check    no descarga, solo revisa el JSON
 *
 * OJO, esto ya ha costado un rato: `curl` recibe 0 bytes de ese endpoint de
 * Drive y `fetch` de Node funciona sin más. Si algún día deja de ir, mira por ahí
 * antes de dudar de la URL.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SHEET_ID = '1buzisIlDkCo2Rj5BYZh5-JKrAYSo3RSuBXYmJVGYT0E';
const SALIDA = 'src/data/flyer_ratios.json';
const LOTE = 8;              // descargas en paralelo; subirlo hace que Drive corte
const ANCHO_SONDA = 2400;    // por encima de esto Drive ya no crece

const args = new Set(process.argv.slice(2));
const rehacerTodo = args.has('--todo');
const soloRevisar = args.has('--check');

/** El id de Drive de una URL de la hoja, en cualquiera de sus dos formas. */
function idDeDrive(url) {
  if (!url) return '';
  if (url.includes('id=')) return url.split('id=')[1].split('&')[0];
  if (url.includes('/d/')) return url.split('/d/')[1].split('/')[0];
  return '';
}

/**
 * Dimensiones leídas de la CABECERA del fichero, sin decodificar la imagen.
 * JPEG: marcador SOF (0xC0–0xC3), que trae alto y ancho en ese orden.
 * PNG: bloque IHDR, siempre en la misma posición.
 * GIF: bytes 6–9, en little-endian.
 *
 * Sí, GIF. Hay uno en el archivo (MEL-00074) y pesa 15 MB. Drive ni siquiera lo
 * redimensiona: devuelve los mismos bytes pidas el ancho que pidas.
 */
function dimensiones(buf) {
  if (buf.slice(0, 3).toString('latin1') === 'GIF') {
    return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
  }
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  }
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    for (let i = 2; i < buf.length - 9; ) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const marcador = buf[i + 1];
      if (marcador >= 0xC0 && marcador <= 0xC3) {
        return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

async function medir(id) {
  const r = await fetch(`https://drive.google.com/thumbnail?id=${id}&sz=w${ANCHO_SONDA}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const d = dimensiones(buf);
  if (!d || !d[0] || !d[1]) throw new Error('no se reconocen las dimensiones');
  return d;
}

/** Avisa de lo que no cuadra. Devuelve el número de problemas. */
function revisar(cache, idsVivos) {
  const problemas = [];
  for (const [id, v] of Object.entries(cache)) {
    if (!Array.isArray(v) || v.length !== 2 || !v[0] || !v[1]) {
      problemas.push(`${id}: dimensiones inválidas (${JSON.stringify(v)})`);
      continue;
    }
    const ratio = v[0] / v[1];
    if (ratio > 10 || ratio < 0.1) problemas.push(`${id}: proporción absurda (${ratio.toFixed(2)}) — ${v[0]}x${v[1]}`);
    if (Math.max(v[0], v[1]) < 1200) problemas.push(`${id}: por debajo del mínimo de 1200px — ${v[0]}x${v[1]} (ver docs/imagenes.md)`);
    if (idsVivos && !idsVivos.has(id)) problemas.push(`${id}: ya no está en la hoja, sobra`);
  }
  problemas.forEach(p => console.log(`  aviso  ${p}`));
  return problemas.length;
}

const texto = await (await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`)).text();
const json = JSON.parse(texto.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/)[1]);

const ids = new Set();
for (const fila of json.table.rows) {
  const c = fila.c;
  if (!c || !c[10]?.v || !String(c[10].v).startsWith('MEL-')) continue;
  const id = idDeDrive(c[2]?.v);
  if (id) ids.add(id);
}

const cache = !rehacerTodo && existsSync(SALIDA)
  ? JSON.parse(readFileSync(SALIDA, 'utf8'))
  : {};

if (soloRevisar) {
  console.log(`Revisando ${Object.keys(cache).length} entradas contra ${ids.size} imágenes de la hoja`);
  const n = revisar(cache, ids);
  console.log(n ? `\n${n} avisos` : '\nSin avisos');
  process.exit(0);
}

const pendientes = [...ids].filter(id => !cache[id]);
console.log(`${ids.size} imágenes en la hoja · ${Object.keys(cache).length} ya medidas · ${pendientes.length} por medir`);

let ok = 0;
const fallos = [];
for (let i = 0; i < pendientes.length; i += LOTE) {
  await Promise.all(pendientes.slice(i, i + LOTE).map(async id => {
    try { cache[id] = await medir(id); ok++; }
    catch (e) { fallos.push(`${id}: ${e.message}`); }
  }));
  process.stdout.write(`\r  medidas ${ok}/${pendientes.length}`);
}
if (pendientes.length) process.stdout.write('\n');

// Ordenado por clave para que el diff se pueda leer.
const ordenado = Object.fromEntries(Object.keys(cache).sort().map(k => [k, cache[k]]));
writeFileSync(SALIDA, JSON.stringify(ordenado, null, 1) + '\n');
console.log(`\n${SALIDA}: ${Object.keys(ordenado).length} entradas`);

if (fallos.length) {
  console.log(`\n${fallos.length} fallos (se reintentan solos en la próxima pasada):`);
  fallos.forEach(f => console.log(`  ${f}`));
}
console.log('');
revisar(ordenado, ids);
