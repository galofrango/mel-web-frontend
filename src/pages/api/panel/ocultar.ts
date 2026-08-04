/**
 * Escribe en la hoja el motivo por el que un aviso deja de mostrarse.
 *
 * Guarda la marca `#oculto:<clave>` y, detrás, el texto que se haya tecleado,
 * en la columna Y (`notasArchivo`) de la fila del cartel.
 *
 * AÑADE, nunca pisa: la columna Y es de notas de archivo y puede traer prosa
 * anterior que no tiene nada que ver con el panel. Y lee la celda JUSTO ANTES
 * de escribirla en vez de fiarse de lo que el navegador cargó al abrir la
 * página: entre una cosa y otra pueden pasar horas y el propietario edita esa
 * hoja a mano mientras el panel está abierto.
 *
 * Mismos cuatro guardas que `arreglar.ts` — es la otra ruta que escribe con la
 * cuenta de servicio.
 */
import type { APIRoute } from 'astro';
import { SHEET_ID } from '../../../lib/mel.ts';
import { notaDeLaRegla } from '../../../lib/auditoria.ts';
import { leerCredencial, obtenerToken, leerCelda, escribirCelda } from '../../../lib/google.ts';

export const prerender = false;

/** La columna de las notas del panel, creada el 03/08/2026. Es la ÚLTIMA de la
 *  hoja a propósito: el mapa de columnas de `mel.ts` va por índice, así que una
 *  columna nueva en medio habría corrido todas las de detrás. Se separa de
 *  «Notas de archivo» (Y) porque aquella es prosa de catalogación y esta es
 *  plomería del panel: mezclarlas obligaba a que la marca `#oculto:` conviviera
 *  con texto que no tiene nada que ver. */
const COLUMNA_NOTAS = 'AA';

/** Las claves de auditoria.ts. Se valida contra una lista blanca porque esto
 *  acaba dentro de la celda: sin ella, cualquier cadena entraría en el archivo
 *  del propietario con aspecto de marca del panel. */
const CLAVES = new Set(['sin-fecha', 'sin-lugar', 'sin-coordenadas', 'ref-duplicada', 'sin-artistas', 'sin-organiza', 'sin-disenador', 'sin-medir',
  'png', 'no-srgb', 'enorme', 'pesado', 'pequeno', 'gif']);

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

/** El texto que queda en la celda. Una línea por regla oculta:
 *
 *      #oculto:png Es un vector con transparencia.
 *      #oculto:enorme Hace falta poder ampliar el detalle.
 *
 *  La marca va delante para que se vea de un vistazo al mirar la columna en la
 *  hoja, y el motivo pegado detrás en la MISMA línea — un salto partiría la
 *  marca en dos y la segunda mitad dejaría de leerse como parte de ella.
 *
 *  SUSTITUYE la línea de esa regla si ya existía, no la duplica: es lo que hace
 *  que «Editar» funcione, y evita que ocultar dos veces deje dos motivos
 *  contradictorios uno debajo del otro. Con `motivo` a `null` la borra, que es
 *  lo que hace «Borrar» — y con ella se va la ocultación.
 *
 *  Las líneas de las OTRAS reglas se respetan siempre: son notas distintas
 *  sobre el mismo cartel. */
export function componerNota(notasActuales: string, clave: string, motivo: string | null): string {
  const patrón = new RegExp('^\\s*#oculto:' + clave + '(?![a-z0-9-])', 'i');
  const otras = String(notasActuales ?? '').split('\n').filter((l) => l.trim() && !patrón.test(l));
  if (motivo === null) return otras.join('\n');
  const limpio = String(motivo ?? '').replace(/\s+/g, ' ').trim();
  return [...otras, `#oculto:${clave}${limpio ? ' ' + limpio : ''}`].join('\n');
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });
  const host = request.headers.get('host') || '';
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return new Response(null, { status: 404 });

  let cuerpo: { fila?: number; clave?: string; motivo?: string; borrar?: boolean };
  try {
    cuerpo = await request.json();
  } catch {
    return json({ ok: false, motivo: 'cuerpo no es JSON válido' }, 400);
  }

  const fila = Number(cuerpo.fila);
  if (!Number.isInteger(fila) || fila < 2) return json({ ok: false, motivo: 'fila no válida' }, 400);
  if (!cuerpo.clave || !CLAVES.has(cuerpo.clave)) return json({ ok: false, motivo: 'clave no válida' }, 400);

  const celda = `${COLUMNA_NOTAS}${fila}`;
  try {
    const token = await obtenerToken(leerCredencial());
    const previo = await leerCelda(SHEET_ID, celda, token);
    const nota = componerNota(previo, cuerpo.clave, cuerpo.borrar ? null : (cuerpo.motivo ?? ''));
    await escribirCelda(SHEET_ID, celda, nota, token);
    // `nota` es la celda entera (lo que queda escrito); `motivo` es solo la
    // línea de esta regla y sin la marca, que es lo que se enseña en el globo.
    // La marca es plomería del panel, no texto para leer.
    return json({ ok: true, celda, nota, motivo: notaDeLaRegla(nota, cuerpo.clave) });
  } catch (e: any) {
    return json({ ok: false, motivo: e.message }, 500);
  }
};
