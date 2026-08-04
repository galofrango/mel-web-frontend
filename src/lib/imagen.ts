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
  /** Componentes de color del JPEG: 1 = gris, 3 = YCbCr, 4 = CMYK. `null` si no es JPEG o si es JPEG truncado antes del SOF. */
  comp: number | null;
  /**
   * Si el fichero lleva un perfil de color incrustado que **no es sRGB**.
   *
   * No confundir con "no lleva perfil": un fichero sin etiqueta se pinta
   * asumiendo sRGB, que es justo lo que queremos, así que no es un defecto y
   * aquí sale `false`. Medido en agosto de 2026: ni `sips` ni ImageIO
   * incrustan el perfil sRGB —macOS lo omite a propósito— así que todo cartel
   * que arregle el panel acaba sin etiqueta. Si esto valiera "sin perfil", el
   * panel se avisaría a sí mismo de su propio trabajo, para siempre.
   */
  noSrgb: boolean;
  /** Nombre del perfil incrustado («Adobe RGB (1998)», «sRGB IEC61966-2.1»…),
   *  o `null` si no lleva ninguno. El resumen del panel enseña de DÓNDE venía
   *  el color y no solo que se arregló: saberlo es la mitad de la información,
   *  y es lo que permite entender por qué un cartel cambió de aspecto. */
  perfil: string | null;
  /** Si el PNG lleva canal alfa (tipos de color 4 y 6). JPEG nunca lo lleva. */
  alfa: boolean;
  /**
   * Si el fichero ES en escala de grises: JPEG con `comp === 1`, o PNG con
   * tipo de color 0 o 4 (IHDR). El motor de arreglos lo usa para decidir qué
   * perfil incrustar — uno gris se queda gris, no se pasa a RGB por el camino.
   */
  gris: boolean;
  bytes: number;
};

/**
 * X de los primarios rojo y verde del perfil sRGB, que es lo que distingue un
 * espacio de color de otro. Medido de los propios carteles del archivo: los
 * cuatro perfiles que hay dentro son sRGB (0,4361 · 0,3851), Adobe RGB
 * (0,6097 · 0,2053), Generic RGB (0,4543 · 0,3533) y el perfil de un monitor
 * (0,4443 · 0,3794). La tolerancia absorbe el redondeo de la codificación en
 * coma fija sin dejar pasar el más cercano de los tres que no son sRGB.
 */
const X_SRGB = { rojo: 0.4361, verde: 0.3851 };
const TOLERANCIA = 0.004;

/** El desplazamiento y tamaño de una etiqueta del perfil, o `null`. */
function etiquetaICC(perfil: Buffer, etiqueta: string): { pos: number; largo: number } | null {
  if (perfil.length < 132) return null;
  const cuantas = perfil.readUInt32BE(128);
  if (cuantas > 200) return null;
  for (let i = 0; i < cuantas; i++) {
    const entrada = 132 + i * 12;
    if (entrada + 12 > perfil.length) return null;
    if (perfil.slice(entrada, entrada + 4).toString('latin1') !== etiqueta) continue;
    return { pos: perfil.readUInt32BE(entrada + 4), largo: perfil.readUInt32BE(entrada + 8) };
  }
  return null;
}

/** El nombre legible del perfil (etiqueta `desc`). Soporta los dos tipos que se
 *  encuentran de verdad: `desc` (ICC v2, el de todos los del archivo) y `mluc`
 *  (v4, texto en UTF-16). Si no se puede leer, `null` — un nombre inventado
 *  sería peor que no dar ninguno. */
function nombreDelPerfil(perfil: Buffer): string | null {
  const e = etiquetaICC(perfil, 'desc');
  if (!e || e.pos + 12 > perfil.length) return null;
  const tipo = perfil.slice(e.pos, e.pos + 4).toString('latin1');
  try {
    if (tipo === 'desc') {
      const largo = perfil.readUInt32BE(e.pos + 8);
      if (largo < 1 || e.pos + 12 + largo > perfil.length) return null;
      return perfil.slice(e.pos + 12, e.pos + 12 + largo - 1).toString('latin1') || null;
    }
    if (tipo === 'mluc') {
      const largo = perfil.readUInt32BE(e.pos + 20);
      const desde = e.pos + perfil.readUInt32BE(e.pos + 24);
      if (desde + largo > perfil.length) return null;
      return perfil.slice(desde, desde + largo).swap16().toString('utf16le').replace(/\0/g, '') || null;
    }
  } catch { /* perfil raro: mejor sin nombre que con uno inventado */ }
  return null;
}

/** La X de un primario del perfil ICC, o `null` si no está o no se puede leer. */
function xDelPrimario(perfil: Buffer, etiqueta: string): number | null {
  const e = etiquetaICC(perfil, etiqueta);
  // Un perfil grande viaja partido en varios APP2 y aquí solo está el primero:
  // el dato cae fuera. Preferimos no saberlo a inventarnos que es malo.
  if (!e || e.pos + 12 > perfil.length) return null;
  return perfil.readInt32BE(e.pos + 8) / 65536;
}

function noEsSrgb(perfil: Buffer): boolean {
  const rojo = xDelPrimario(perfil, 'rXYZ');
  const verde = xDelPrimario(perfil, 'gXYZ');
  if (rojo === null || verde === null) return false;  // gris, o ilegible: no gritar en falso
  return Math.abs(rojo - X_SRGB.rojo) > TOLERANCIA || Math.abs(verde - X_SRGB.verde) > TOLERANCIA;
}

/** Si un PNG lleva el trozo `tRNS`, que es donde una imagen de paleta guarda su
 *  transparencia. Se recorren los trozos hasta `IDAT`: los de metadatos van
 *  siempre delante de los datos, así que si no ha aparecido para entonces, no
 *  está. */
function tieneTRNS(buf: Buffer): boolean {
  let p = 8;
  while (p + 12 <= buf.length) {
    const largo = buf.readUInt32BE(p);
    const tipo = buf.toString('ascii', p + 4, p + 8);
    if (tipo === 'tRNS') return true;
    if (tipo === 'IDAT') return false;
    p += 12 + largo;
  }
  return false;
}

export function leerCabecera(buf: Buffer): DatosImagen {
  const d: DatosImagen = { tipo: 'desconocido', px: null, comp: null, noSrgb: false, perfil: null, alfa: false, gris: false, bytes: buf.length };

  // GIF: ancho y alto en los bytes 6-9, little-endian.
  if (buf.length >= 10 && buf.slice(0, 3).toString('latin1') === 'GIF') {
    d.tipo = 'gif';
    d.px = [buf.readUInt16LE(6), buf.readUInt16LE(8)];
    return d;
  }

  // PNG: IHDR siempre en la misma posición. Aquí no se mira el perfil: todo PNG
  // dispara la regla "png" y se convierte a JPEG con `--matchTo`, que le arregla
  // el color de paso. Mirarlo sería avisar dos veces del mismo cartel, y encima
  // obligaría a descomprimir el bloque iCCP para leerlo.
  //
  // Medido el 04/08/2026: los 13 PNG del archivo no llevan NINGÚN trozo de
  // color —ni `iCCP` ni `sRGB`—, y un PNG sin etiqueta se lee como sRGB en todos
  // los navegadores. Así que no es un punto ciego con consecuencias.
  if (buf.length >= 26 && buf[0] === 0x89 && buf[1] === 0x50) {
    d.tipo = 'png';
    d.px = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    const tipoColor = buf[25];
    // Un PNG de PALETA (tipo 3) también puede tener transparencia: la guarda en
    // el trozo `tRNS`, no en un canal. Es exactamente lo que produce `pngquant`,
    // así que sin esto un cartel comprimido pasaba a figurar como si hubiera
    // perdido el alfa que acabábamos de conservar.
    d.alfa = tipoColor === 4 || tipoColor === 6 || (tipoColor === 3 && tieneTRNS(buf));
    d.gris = tipoColor === 0 || tipoColor === 4;
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
      // Solo el primer trozo del ICC: es el que lleva cabecera y tabla de
      // etiquetas. Mirar los siguientes solo serviría para borrar el resultado.
      if (marcador === 0xE2 && buf[i + 16] === 1
          && buf.slice(i + 4, i + 15).toString('latin1') === 'ICC_PROFILE') {
        const icc = buf.slice(i + 18, i + 2 + largo);
        d.noSrgb = noEsSrgb(icc);
        d.perfil = nombreDelPerfil(icc);
      }
      if (marcador >= 0xC0 && marcador <= 0xC3) {
        d.px = [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
        d.comp = buf[i + 9];
        d.gris = d.comp === 1;
        break;
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

/**
 * Descarga UNA imagen de Drive y devuelve sus medidas. Es el trozo que
 * comparten `scripts/medir-archivo.mjs` (que mide el archivo entero, offline)
 * y el panel, que al arrancar mide lo que le falte.
 *
 * Vive aquí y no en el script porque un cartel recién subido no puede quedarse
 * en «Sin medir» hasta que alguien se acuerde de lanzar un comando: el panel es
 * la herramienta de control del archivo, y decir «no sé lo que mide esto»
 * cuando podía averiguarlo en dos segundos es pereza suya, no un dato.
 *
 * OJO: `curl` recibe 0 bytes de este endpoint de Drive y `fetch` de Node no.
 * Si algún día deja de ir, mira por ahí antes de dudar de la URL.
 */
export async function medirDeDrive(idDrive: string): Promise<DatosImagen> {
  const r = await fetch(`https://drive.google.com/uc?export=download&id=${idDrive}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const datos = leerCabecera(Buffer.from(await r.arrayBuffer()));
  // Un 200 no prueba que lo devuelto sea una imagen: Drive contesta con una
  // página de error cuando el fichero no es público.
  if (datos.tipo === 'desconocido' || !datos.px) throw new Error('no es una imagen válida');
  return datos;
}

