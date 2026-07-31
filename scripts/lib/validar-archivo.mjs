/**
 * Lógica de protección contra caída de la hoja: cuando no hay entrada en la hoja
 * pero hay entradas en disco, abortar sin escribir.
 */
export function hayQueAbortar({ imagenesEnHoja, entradasEnDisco, soloEstos }) {
  // Si se especifican ids concretos, dejar pasar (modo protegido).
  if (soloEstos.length > 0) return false;

  // Si la hoja está vacía y el disco tiene contenido, abortar.
  if (imagenesEnHoja === 0 && entradasEnDisco > 0) return true;

  return false;
}
