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
  /** Si el fichero lleva perfil de color incrustado. */
  perfil: boolean;
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

export function leerCabecera(buf: Buffer): DatosImagen {
  const d: DatosImagen = { tipo: 'desconocido', px: null, comp: null, perfil: false, alfa: false, gris: false, bytes: buf.length };

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
    d.gris = buf[25] === 0 || buf[25] === 4;
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
