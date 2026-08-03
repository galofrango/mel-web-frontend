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

/**
 * Perfil ICC mínimo de verdad: cabecera de 128 bytes, tabla de etiquetas y los
 * primarios rojo y verde, que son los que dicen si es sRGB. Con `null` sale un
 * perfil sin primarios — el caso de los grises, que llevan kTRC y no rXYZ.
 */
function perfilICC(rojoX, verdeX, nombre = null) {
  const conXYZ = rojoX !== null;
  const etq = nombre ? Buffer.from(nombre + '\0', 'latin1') : null;
  const base = conXYZ ? 196 : 132;
  const total = etq ? base + 12 + etq.length : base;
  const p = Buffer.alloc(total);
  p.writeUInt32BE(total, 0);
  p.writeUInt32BE((conXYZ ? 2 : 0) + (etq ? 1 : 0), 128);
  if (conXYZ) {
    const escribir = (etiqueta, pos, x) => {
      p.write(etiqueta, pos, 'latin1');
      p.writeUInt32BE(pos === 132 ? 156 : 176, pos + 4);
      p.writeUInt32BE(20, pos + 8);
      const dato = pos === 132 ? 156 : 176;
      p.write('XYZ ', dato, 'latin1');
      p.writeInt32BE(Math.round(x * 65536), dato + 8);
    };
    escribir('rXYZ', 132, rojoX);
    escribir('gXYZ', 144, verdeX);
  }
  if (etq) {
    // La etiqueta `desc` de tipo "desc": firma + reservado + longitud + texto.
    const entrada = 132 + (conXYZ ? 24 : 0);
    p.write('desc', entrada, 'latin1');
    p.writeUInt32BE(base, entrada + 4);
    p.writeUInt32BE(12 + etq.length, entrada + 8);
    p.write('desc', base, 'latin1');
    p.writeUInt32BE(etq.length, base + 8);
    etq.copy(p, base + 12);
  }
  return p;
}

/** JPEG mínimo: SOI + (opcional) APP2 con ICC + SOF0 + EOI. */
function jpeg(ancho, alto, componentes, conICC = false) {
  const partes = [Buffer.from([0xFF, 0xD8])];
  if (conICC) {
    // `conICC` puede ser `true` (perfil vacío, como antes) o un Buffer de perfil.
    const perfil = Buffer.isBuffer(conICC) ? conICC : Buffer.alloc(0);
    const app2 = Buffer.alloc(4 + 14 + perfil.length);
    app2[0] = 0xFF; app2[1] = 0xE2;
    app2.writeUInt16BE(2 + 14 + perfil.length, 2);
    app2.write('ICC_PROFILE\0', 4, 'latin1');
    app2[16] = 1; app2[17] = 1;   // trozo 1 de 1
    perfil.copy(app2, 18);
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

test('PNG: nunca marca noSrgb, lleve el perfil que lleve', () => {
  // Todo PNG dispara la regla "png" y se convierte a JPEG con --matchTo, así
  // que su perfil ya queda arreglado por ese camino. Avisar aquí sería avisar
  // dos veces de lo mismo. Ver el comentario de imagen.ts.
  assert.equal(leerCabecera(png(100, 100, 2, false)).noSrgb, false);
  assert.equal(leerCabecera(png(100, 100, 2, true)).noSrgb, false);
});

test('PNG: gris por el tipo de color del IHDR (0 y 4), no confundir con alfa', () => {
  assert.equal(leerCabecera(png(100, 100, 0)).gris, true, 'tipo 0 = gris sin alfa');
  assert.equal(leerCabecera(png(100, 100, 4)).gris, true, 'tipo 4 = gris CON alfa');
  assert.equal(leerCabecera(png(100, 100, 4)).alfa, true, 'tipo 4 también lleva alfa');
  assert.equal(leerCabecera(png(100, 100, 2)).gris, false, 'tipo 2 = RGB, no es gris');
  assert.equal(leerCabecera(png(100, 100, 6)).gris, false, 'tipo 6 = RGBA, no es gris');
});

test('JPEG: dimensiones, componentes y gris', () => {
  const color = leerCabecera(jpeg(1613, 2235, 3, true));
  assert.equal(color.tipo, 'jpeg');
  assert.deepEqual(color.px, [1613, 2235]);
  assert.equal(color.comp, 3);
  assert.equal(color.gris, false);

  const cmyk = leerCabecera(jpeg(800, 600, 4, false));
  assert.equal(cmyk.comp, 4);
  assert.equal(cmyk.noSrgb, false);
  assert.equal(cmyk.gris, false);

  const gris = leerCabecera(jpeg(800, 600, 1, false));
  assert.equal(gris.comp, 1);
  assert.equal(gris.gris, true, 'comp === 1 es la señal de gris en JPEG');
});

// Los cuatro perfiles que hay de verdad en el archivo, con sus primarios
// medidos de los ficheros originales (agosto 2026).
const SRGB = [0.4361, 0.3851];
const ADOBE_RGB = [0.6097, 0.2053];
const GENERIC_RGB = [0.4543, 0.3533];
const DISPLAY = [0.4443, 0.3794];   // perfil de un monitor; el no-sRGB más cercano

test('JPEG: noSrgb solo cuando el perfil incrustado NO es sRGB', () => {
  const conPerfil = (p) => leerCabecera(jpeg(800, 600, 3, perfilICC(...p))).noSrgb;
  assert.equal(conPerfil(SRGB), false, 'sRGB es lo que queremos, no se avisa');
  assert.equal(conPerfil(ADOBE_RGB), true);
  assert.equal(conPerfil(GENERIC_RGB), true);
  assert.equal(conPerfil(DISPLAY), true, 'el más cercano a sRGB sigue sin serlo');
});

test('JPEG: sin perfil NO es noSrgb — sin etiqueta significa sRGB', () => {
  // macOS no incrusta el perfil sRGB a propósito, así que todo cartel que
  // arregle el panel sale sin etiqueta. Si esto avisara, el panel se avisaría
  // a sí mismo de su propio trabajo, en bucle. Medido en agosto de 2026.
  assert.equal(leerCabecera(jpeg(800, 600, 3, false)).noSrgb, false);
  assert.equal(leerCabecera(jpeg(800, 600, 3, true)).noSrgb, false, 'APP2 vacío tampoco');
});

test('JPEG: un perfil sin primarios no dispara el aviso', () => {
  // Los perfiles de gris llevan kTRC y no rXYZ: no hay nada que comparar, y
  // dar por malo lo que no se sabe leer es gritar en falso.
  assert.equal(leerCabecera(jpeg(800, 600, 1, perfilICC(null, null))).noSrgb, false);
});

test('JPEG: la tolerancia de sRGB no es ni tan ancha ni tan estrecha', () => {
  const rojo = (x) => leerCabecera(jpeg(800, 600, 3, perfilICC(x, SRGB[1]))).noSrgb;
  assert.equal(rojo(SRGB[0] + 0.003), false, 'redondeos del perfil siguen siendo sRGB');
  assert.equal(rojo(SRGB[0] + 0.006), true, 'pero 0,006 ya es otro espacio de color');
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
  assert.equal(d.noSrgb, false);
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

test('JPEG: dice de qué espacio de color viene, no solo si es raro', () => {
  // El resumen del panel enseña «Adobe RGB (1998) → sRGB», no un genérico
  // «color arreglado»: saber de dónde venía es la mitad de la información.
  const conNombre = (rojoX, verdeX, nombre) => {
    const p = perfilICC(rojoX, verdeX, nombre);
    return leerCabecera(jpeg(800, 600, 3, p)).perfil;
  };
  assert.equal(conNombre(...ADOBE_RGB, 'Adobe RGB (1998)'), 'Adobe RGB (1998)');
  assert.equal(conNombre(...SRGB, 'sRGB IEC61966-2.1'), 'sRGB IEC61966-2.1');
});

test('sin perfil incrustado no se inventa un nombre', () => {
  assert.equal(leerCabecera(jpeg(800, 600, 3, false)).perfil, null);
  assert.equal(leerCabecera(png(100, 100, 2)).perfil, null);
});
