/**
 * El registro de lo que el panel ha hecho de verdad. Puro: entra lo que ya está
 * en memoria, sale el resumen. Sin disco ni red — por eso se prueba entero.
 *
 * Existe por dos razones, y la segunda pesa más que la primera:
 *
 * 1. Es la ÚNICA forma de saber cuánto peso se ha ahorrado. En cuanto el panel
 *    sustituye un fichero en Drive, lo que pesaba antes deja de existir en
 *    ningún sitio: si no se anota en ese momento, se pierde para siempre.
 * 2. Es el registro de qué tocó el panel y cuándo. El día que un cartel se vea
 *    raro, esto es lo primero que se querrá mirar.
 *
 * Solo entran las pasadas REALES. Una simulación no toca nada, así que
 * apuntarla sería inflar el número con trabajo que no se hizo.
 */

export type Apunte = {
  /** ISO 8601, con hora: importa el orden y saber "esto fue el día que…". */
  fecha: string;
  idMel: string;
  acciones: string[];
  antes: { bytes: number; tipo: string; perfil: string | null };
  despues: { bytes: number; tipo: string; perfil: string | null };
};

export type Resumen = {
  /** Bytes ahorrados. Puede ser NEGATIVO: pasar a sRGB a máxima calidad engorda
   *  el fichero a propósito, y esconderlo sería maquillar el número. */
  ahorro: number;
  /** Carteles distintos tocados, no número de pasadas: arreglar dos veces el
   *  mismo cartel no son dos carteles. */
  carteles: number;
  pasadas: number;
  /** Ahorro sobre lo que el archivo pesaba ANTES de que el panel empezara, que
   *  es `pesoActual + ahorro`. Sobre el peso de hoy daría un número inflado. */
  porcentaje: number;
  desde: string | null;
};

export function resumirHistorial(apuntes: Apunte[], pesoActual: number): Resumen {
  const ahorro = apuntes.reduce((n, a) => n + (a.antes.bytes - a.despues.bytes), 0);
  const original = pesoActual + ahorro;
  return {
    ahorro,
    carteles: new Set(apuntes.map((a) => a.idMel)).size,
    pasadas: apuntes.length,
    porcentaje: original > 0 ? Math.round((ahorro / original) * 100) : 0,
    desde: apuntes.length ? apuntes.reduce((m, a) => (a.fecha < m ? a.fecha : m), apuntes[0].fecha) : null,
  };
}
