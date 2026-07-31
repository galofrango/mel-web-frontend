/**
 * Lógica de validación y cálculo del estado inicial del caché de archivo.
 *
 * La función estadoInicial distingue tres estados del disco, no dos:
 *   - no hay fichero (textoEnDisco === null)
 *   - hay fichero y se lee (N entradas)
 *   - hay fichero y NO se puede leer (JSON corrupto)
 *
 * El tercer estado se trata como el segundo a efectos de "abortar": un disco
 * ilegible no es prueba de que no hubiera nada que perder, es prueba de que
 * no se puede saber. Ante la duda, esta guarda no toca nada — salvo que la
 * hoja sí responda con imágenes, en cuyo caso hay de dónde volver a
 * descargar y sobrescribir es lo correcto (por eso `abortar` solo se activa
 * cuando la hoja también está caída).
 */

export interface DatosArchivo {
  abortar: boolean;
  cache: Record<string, unknown>;
  entradasEnDisco: number;
  discoCorrupto: boolean;
}

/**
 * Calcula el estado inicial: qué hay en el caché y si hay que abortar.
 *
 * @param rehacerTodo - si true, ignora el caché existente (no se carga en `cache`)
 * @param textoEnDisco - contenido del fichero JSON, o null si no existe
 * @param imagenesEnHoja - cuántas imágenes devolvió la hoja
 * @param soloEstos - lista de ids a medir (modo protegido, nunca aborta)
 * @returns { abortar, cache, entradasEnDisco, discoCorrupto }
 */
export function estadoInicial({
  rehacerTodo,
  textoEnDisco,
  imagenesEnHoja,
  soloEstos
}: {
  rehacerTodo: boolean;
  textoEnDisco: string | null;
  imagenesEnHoja: number;
  soloEstos: string[];
}): DatosArchivo {
  let cache: Record<string, unknown> = {};
  let entradasEnDisco = 0;
  let discoCorrupto = false;

  if (textoEnDisco !== null) {
    try {
      const contenido = JSON.parse(textoEnDisco);
      entradasEnDisco = Object.keys(contenido).length;
      if (!rehacerTodo) cache = contenido;
    } catch {
      // Fichero presente pero ilegible: no es "disco vacío", es "no se puede saber".
      discoCorrupto = true;
    }
  }

  // Abortar si la hoja no trajo nada Y el disco no se puede dar por vacío con
  // seguridad: o tenía entradas de verdad, o directamente no se pudo leer.
  const abortar =
    soloEstos.length === 0 &&
    imagenesEnHoja === 0 &&
    (entradasEnDisco > 0 || discoCorrupto);

  return { abortar, cache, entradasEnDisco, discoCorrupto };
}
