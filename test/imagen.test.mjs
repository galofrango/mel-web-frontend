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

test('PNG: gris por el tipo de color del IHDR (0 y 4), no confundir con alfa', () => {
  assert.equal(leerCabecera(png(100, 100, 0)).gris, true, 'tipo 0 = gris sin alfa');
  assert.equal(leerCabecera(png(100, 100, 4)).gris, true, 'tipo 4 = gris CON alfa');
  assert.equal(leerCabecera(png(100, 100, 4)).alfa, true, 'tipo 4 también lleva alfa');
  assert.equal(leerCabecera(png(100, 100, 2)).gris, false, 'tipo 2 = RGB, no es gris');
  assert.equal(leerCabecera(png(100, 100, 6)).gris, false, 'tipo 6 = RGBA, no es gris');
});

test('JPEG: dimensiones, componentes y perfil', () => {
  const color = leerCabecera(jpeg(1613, 2235, 3, true));
  assert.equal(color.tipo, 'jpeg');
  assert.deepEqual(color.px, [1613, 2235]);
  assert.equal(color.comp, 3);
  assert.equal(color.perfil, true);
  assert.equal(color.gris, false);

  const cmyk = leerCabecera(jpeg(800, 600, 4, false));
  assert.equal(cmyk.comp, 4);
  assert.equal(cmyk.perfil, false);
  assert.equal(cmyk.gris, false);

  const gris = leerCabecera(jpeg(800, 600, 1, false));
  assert.equal(gris.comp, 1);
  assert.equal(gris.gris, true, 'comp === 1 es la señal de gris en JPEG');
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

test('ficheros truncados no revienta: buffer vacío', () => {
  const d = leerCabecera(Buffer.alloc(0));
  assert.equal(d.tipo, 'desconocido');
  assert.equal(d.px, null);
  assert.equal(d.comp, null);
  assert.equal(d.perfil, false);
  assert.equal(d.bytes, 0);
});

test('ficheros truncados no revienta: PNG firma sin IHDR', () => {
  const pngIncompleto = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const d = leerCabecera(pngIncompleto);
  assert.equal(d.tipo, 'desconocido');
  assert.equal(d.px, null);
});

test('ficheros truncados no revienta: JPEG solo SOI', () => {
  const jpegIncompleto = Buffer.from([0xFF, 0xD8]);
  const d = leerCabecera(jpegIncompleto);
  assert.equal(d.tipo, 'desconocido');
  assert.equal(d.px, null);
  assert.equal(d.comp, null);
});

test('ficheros truncados no revienta: GIF muy corto', () => {
  const gifIncompleto = Buffer.from('GIF');
  const d = leerCabecera(gifIncompleto);
  assert.equal(d.tipo, 'desconocido');
  assert.equal(d.px, null);
});
