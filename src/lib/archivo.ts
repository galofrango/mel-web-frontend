/**
 * Lógica de validación y cálculo del estado inicial del caché de archivo.
 *
 * La función estadoInicial captura dos aspectos que estaban dispersos:
 * - Construir el caché, que depende del modo (rehacerTodo o no)
 * - Decidir si abortar, que no debe depender del modo pero sí del disco
 *
 * Esto previene regresiones donde futuros cambios en la lógica de `cache`
 * afecten silenciosamente a la decisión de abortar.
 */

export interface DatosArchivo {
  abortar: boolean;
  cache: Record<string, unknown>;
  entradasEnDisco: number;
}

/**
 * Calcula el estado inicial: qué hay en el caché y si hay que abortar.
 *
 * @param rehacerTodo - si true, ignora el caché existente
 * @param textoEnDisco - contenido del fichero JSON, o null si no existe
 * @param imagenesEnHoja - cuántas imágenes devolvió la hoja
 * @param soloEstos - lista de ids a medir (modo protegido)
 * @returns { abortar, cache, entradasEnDisco }
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
  // Construir el caché: si no rehacerTodo y hay disco, parsear; si no, vacío.
  let cache: Record<string, unknown> = {};
  let entradasEnDisco = 0;

  if (!rehacerTodo && textoEnDisco) {
    try {
      cache = JSON.parse(textoEnDisco);
      entradasEnDisco = Object.keys(cache).length;
    } catch {
      // Si el JSON está corrupto, tratar como "no hay disco".
      cache = {};
      entradasEnDisco = 0;
    }
  } else if (rehacerTodo && textoEnDisco) {
    // Modo --todo: aunque no usemos el caché, contar lo que hay en disco.
    try {
      const contenido = JSON.parse(textoEnDisco);
      entradasEnDisco = Object.keys(contenido).length;
    } catch {
      entradasEnDisco = 0;
    }
  }

  // Decidir si hay que abortar: hoja vacía + disco con contenido + no modo ids sueltos.
  const abortar = soloEstos.length === 0 && imagenesEnHoja === 0 && entradasEnDisco > 0;

  return { abortar, cache, entradasEnDisco };
}
