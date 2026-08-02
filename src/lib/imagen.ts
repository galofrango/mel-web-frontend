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

/** La X de un primario del perfil ICC, o `null` si no está o no se puede leer. */
function xDelPrimario(perfil: Buffer, etiqueta: string): number | null {
  if (perfil.length < 132) return null;
  const cuantas = perfil.readUInt32BE(128);
  if (cuantas > 200) return null;                     // tabla imposible: perfil cortado
  for (let i = 0; i < cuantas; i++) {
    const entrada = 132 + i * 12;
    if (entrada + 12 > perfil.length) return null;
    if (perfil.slice(entrada, entrada + 4).toString('latin1') !== etiqueta) continue;
    const dato = perfil.readUInt32BE(entrada + 4);
    // Un perfil grande viaja partido en varios APP2 y aquí solo está el primero:
    // el dato cae fuera. Preferimos no saberlo a inventarnos que es malo.
    if (dato + 12 > perfil.length) return null;
    return perfil.readInt32BE(dato + 8) / 65536;
  }
  return null;
}

function noEsSrgb(perfil: Buffer): boolean {
  const rojo = xDelPrimario(perfil, 'rXYZ');
  const verde = xDelPrimario(perfil, 'gXYZ');
  if (rojo === null || verde === null) return false;  // gris, o ilegible: no gritar en falso
  return Math.abs(rojo - X_SRGB.rojo) > TOLERANCIA || Math.abs(verde - X_SRGB.verde) > TOLERANCIA;
}

export function leerCabecera(buf: Buffer): DatosImagen {
  const d: DatosImagen = { tipo: 'desconocido', px: null, comp: null, noSrgb: false, alfa: false, gris: false, bytes: buf.length };

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
  if (buf.length >= 26 && buf[0] === 0x89 && buf[1] === 0x50) {
    d.tipo = 'png';
    d.px = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    d.alfa = buf[25] === 4 || buf[25] === 6;
    d.gris = buf[25] === 0 || buf[25] === 4;
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
        d.noSrgb = noEsSrgb(buf.slice(i + 18, i + 2 + largo));
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
