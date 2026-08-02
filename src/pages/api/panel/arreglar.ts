/**
 * POST /api/panel/arreglar — el motor de arreglos del panel: descarga el
 * original de Drive, lo procesa con `sips` y sustituye el fichero EN DRIVE
 * conservando su id (así la hoja sigue enlazando al mismo fichero). Solo
 * existe en desarrollo, y solo si la petición viene de `localhost` — es la
 * única ruta del proyecto que ejecuta un binario y que escribe con la cuenta
 * de servicio, así que los cuatro guardas de seguridad del spec van sin
 * excepción (ver docs/superpowers/specs/2026-07-31-panel-control-archivo-design.md,
 * sección "Seguridad").
 *
 * Una llamada = UN fichero, nunca un lote (cuerpo `{ accion, idMel }`): así el
 * cliente puede pedir de uno en uno, contar «12 de 33» de verdad y parar a
 * mitad. El plan de qué operaciones aplicar sale del ESTADO MEDIDO del
 * fichero (`planificarArreglo`), no de qué botón se pulsó — `accion` solo
 * valida que la petición tiene sentido y viaja de vuelta en la respuesta.
 * Motivo: el estado es lo único fiable en el momento de procesar (puede haber
 * cambiado desde que se pintó el panel), y es lo que permite la regla de una
 * sola pasada — si al cartel le hacen falta tres arreglos, salen los tres en
 * la misma invocación de `sips`, nunca en tres.
 *
 * La segunda mitad de la tarea 7 (el modal de confirmación, que decide qué
 * conjunto de mejoras ofrecer y con qué texto) consume esta ruta pero no vive
 * aquí.
 */
import type { APIRoute } from 'astro';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { leerCabecera, ladoMayor, type DatosImagen } from '../../../lib/imagen.ts';
import { fetchSheetRows, mapSheetRow } from '../../../lib/mel.ts';
import { leerCredencial, obtenerToken, descargarFichero, sustituirFichero } from '../../../lib/google.ts';

export const prerender = false;

const execFileP = promisify(execFile);

// -------------------------------------------------------------------------
// Lógica PURA: qué le hace falta a un fichero, a partir de su estado medido.
// Sin red, sin disco, sin sips — por eso se prueba entera con `node --test`
// (test/arreglar.test.mjs) sin montar nada de lo de arriba.
// -------------------------------------------------------------------------

/** Las cinco claves de auditoria.ts que tienen arreglo automático. Las otras
 *  (sin-lugar, sin-coordenadas, sin-artistas, pequeno, gif) son manuales o no
 *  tienen arreglo, y esta ruta no las acepta. */
const ACCIONES_VALIDAS = new Set(['png', 'cmyk', 'enorme', 'sin-perfil', 'pesado']);

const PERFIL_SRGB = '/System/Library/ColorSync/Profiles/sRGB Profile.icc';
const PERFIL_GRIS = '/System/Library/ColorSync/Profiles/Generic Gray Gamma 2.2 Profile.icc';
const CALIDAD_INICIAL = 85;   // el estándar del proyecto (imagenes.md)
const CALIDAD_MINIMA = 30;    // no bajar de aquí: destruir el cartel no es "arreglarlo"
const PASO_CALIDAD = 15;
const LIMITE_PESO = 2 * 1048576;  // 2 MB, el mismo umbral que auditoria.ts
const UMBRAL_ENORME = 3000;       // el mismo umbral que la regla "enorme" de auditoria.ts
const LADO_OBJETIVO = 2400;       // a lo que se reduce, fija imagenes.md

export type PlanArreglo =
  | { estado: 'rechazado'; motivo: string }
  | { estado: 'sin-cambios' }
  | { estado: 'aplicar'; reduce: boolean; perfil: string };

/**
 * Qué hace falta para que un fichero pase las cinco comprobaciones
 * automáticas (png, cmyk, enorme, sin-perfil, pesado), calculado del estado
 * medido — no de qué botón se pulsó. Por eso un cartel que necesite tres
 * arreglos a la vez (PNG + grande + sin perfil) los junta los tres: cada
 * recompresión de JPEG pierde calidad, así que no hay una pasada por aviso,
 * hay una pasada por FICHERO.
 *
 * Todo arreglo automático convierte a JPEG e incrusta perfil en la MISMA
 * pasada, se necesitara "convertir" o no: `sips -s format jpeg` a secas deja
 * el resultado etiquetado como Adobe RGB (medido), así que separarlos no es
 * una opción. El perfil es el que el fichero ES — gris si lo era, sRGB si no.
 */
export function planificarArreglo(t: DatosImagen): PlanArreglo {
  if (t.tipo === 'gif') {
    return { estado: 'rechazado', motivo: 'GIF animado: no tiene arreglo automático, convertirlo destruiría la animación' };
  }
  if (t.tipo === 'desconocido') {
    return { estado: 'rechazado', motivo: 'fichero no reconocido' };
  }

  const leHaceFalta = t.tipo === 'png' || t.comp === 4 || !t.perfil
    || ladoMayor(t) > UMBRAL_ENORME || t.bytes > LIMITE_PESO;
  if (!leHaceFalta) return { estado: 'sin-cambios' };

  return {
    estado: 'aplicar',
    reduce: ladoMayor(t) > UMBRAL_ENORME,
    perfil: t.gris ? PERFIL_GRIS : PERFIL_SRGB,
  };
}

/**
 * Los argumentos de `sips` para una pasada, dada la calidad a probar.
 * SIEMPRE lista de argumentos — nunca una cadena de shell (regla del spec).
 * El PNG con transparencia se aplana solo, sin argumento aparte: comprobado
 * sobre un fichero real que `--matchTo` compone el alfa=0 sobre BLANCO (no
 * negro, no deja ver el color de debajo), que es la decisión del propietario.
 */
export function argumentosSips(plan: Extract<PlanArreglo, { estado: 'aplicar' }>, calidad: number, entrada: string, salida: string): string[] {
  const args: string[] = [];
  if (plan.reduce) args.push('--resampleHeightWidthMax', String(LADO_OBJETIVO));
  args.push('-s', 'format', 'jpeg', '-s', 'formatOptions', String(calidad));
  args.push('--matchTo', plan.perfil);
  args.push(entrada, '--out', salida);
  return args;
}

/** La siguiente calidad a probar si el resultado sigue pesando más de 2 MB,
 *  o `null` si ya se ha tocado el suelo — no tiene sentido seguir bajando
 *  calidad para perseguir un peso que a lo mejor ni se alcanza. */
export function siguienteCalidad(actual: number): number | null {
  const siguiente = actual - PASO_CALIDAD;
  return siguiente >= CALIDAD_MINIMA ? siguiente : null;
}

// -------------------------------------------------------------------------
// El id de Drive de una URL de la hoja. Se repite en vez de importarse desde
// mel.ts (que solo tiene `extractDriveImage`, que devuelve la URL de
// miniatura, no el id crudo) — mismo patrón que auditoria.ts, medir-archivo.mjs
// y copia-seguridad.mjs, cada uno con esta misma nota.
// -------------------------------------------------------------------------
function idDeDrive(url: string): string {
  if (!url) return '';
  if (url.includes('id=')) return url.split('id=')[1].split('&')[0];
  if (url.includes('/d/')) return url.split('/d/')[1].split('/')[0];
  return '';
}

/** El id de Drive validado ANTES de construir ninguna ruta ni URL con él —
 *  viene de texto de la hoja, y cualquiera con permiso de edición ahí podría
 *  colar algo si no se acota a lo que un id de Drive real puede ser. */
const ID_DRIVE_VALIDO = /^[A-Za-z0-9_-]{10,}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

// -------------------------------------------------------------------------
// La ruta.
// -------------------------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  // Guarda 1: solo en desarrollo. Si esta ruta llegara a producción, sería una
  // ruta capaz de escribir en Drive con la cuenta de servicio escuchando en
  // internet — el escenario grave de la sección Seguridad del spec.
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });

  // Guarda 2: solo desde el propio ordenador. `npm run dev --host` publicaría
  // esta ruta a todo el wifi; sin la cabecera Host en localhost, 404 igual que
  // fuera de DEV. Mismo patrón exacto que panel.astro.
  const host = request.headers.get('host') || '';
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return new Response(null, { status: 404 });

  let cuerpo: { accion?: string; idMel?: string };
  try {
    cuerpo = await request.json();
  } catch {
    return json({ ok: false, motivo: 'cuerpo no es JSON válido' }, 400);
  }

  const { accion, idMel } = cuerpo;
  if (!accion || !ACCIONES_VALIDAS.has(accion)) {
    return json({ ok: false, motivo: `accion desconocida: "${accion}"` }, 400);
  }
  if (!idMel || typeof idMel !== 'string') {
    return json({ ok: false, motivo: 'falta idMel' }, 400);
  }

  try {
    // 1. Resolver idMel -> id de Drive, y VALIDARLO antes de tocar nada. Las
    //    rutas de fichero de este handler nunca se construyen con texto de la
    //    hoja: el temporal usa nombres fijos en un directorio aleatorio
    //    (mkdtemp), y el id de Drive validado solo entra en URLs de la API de
    //    Google, nunca en una ruta de disco.
    const filas = (await fetchSheetRows()).map(f => mapSheetRow(f.c));
    const fila = filas.find(f => f && f.idMel === idMel);
    if (!fila) return json({ ok: false, idMel, accion, motivo: 'ese idMel no está en la hoja' });

    const idDrive = idDeDrive(fila.urlDrive);
    if (!ID_DRIVE_VALIDO.test(idDrive)) {
      return json({ ok: false, idMel, accion, motivo: 'id de Drive inválido o ausente' });
    }

    // 2. Autenticar y descargar el original.
    const token = await obtenerToken(leerCredencial());
    let original: Buffer;
    try {
      original = await descargarFichero(idDrive, token);
    } catch (e: any) {
      return json({ ok: false, idMel, accion, motivo: `descarga falló: ${e.message}` });
    }

    // 3. Medir y decidir. Puro: nada de lo que sigue en este bloque puede
    //    cambiar el resultado de planificarArreglo.
    const estado = leerCabecera(original);
    const plan = planificarArreglo(estado);

    if (plan.estado === 'rechazado') {
      return json({ ok: false, idMel, accion, motivo: plan.motivo, tecnico: estado });
    }
    if (plan.estado === 'sin-cambios') {
      return json({ ok: true, idMel, accion, hecho: false, motivo: 'no le hacía falta ningún arreglo automático', tecnico: estado });
    }

    // 4. sips sobre un temporal, con reintentos de calidad si el resultado
    //    sigue pesando de más. SIEMPRE se parte del original descargado, no
    //    de una salida previa: recomprimir un JPEG ya comprimido pierde
    //    calidad para nada.
    const dirTmp = await mkdtemp(join(tmpdir(), 'mel-panel-'));
    let salidaBuf: Buffer;
    try {
      const entrada = join(dirTmp, 'entrada');
      const salida = join(dirTmp, 'salida.jpg');
      await writeFile(entrada, original);

      let calidad = CALIDAD_INICIAL;
      for (;;) {
        await execFileP('sips', argumentosSips(plan, calidad, entrada, salida));
        salidaBuf = await readFile(salida);
        if (salidaBuf.length <= LIMITE_PESO) break;
        const siguiente = siguienteCalidad(calidad);
        if (siguiente === null) break;
        calidad = siguiente;
      }
    } finally {
      await rm(dirTmp, { recursive: true, force: true });
    }

    // 5. Sustituir en Drive, conservando el id — no toca ni una celda de la hoja.
    try {
      await sustituirFichero(idDrive, salidaBuf, 'image/jpeg', token);
    } catch (e: any) {
      return json({ ok: false, idMel, accion, motivo: `no se pudo sustituir en Drive: ${e.message}` });
    }

    // 6. Remedir el resultado. El panel recalcula TODAS las secciones con esto,
    //    no solo la que se pulsó (una acción puede arreglar varios avisos).
    const tecnicoNuevo = leerCabecera(salidaBuf);
    return json({ ok: true, idMel, accion, hecho: true, tecnico: tecnicoNuevo });
  } catch (e: any) {
    // Cualquier fallo inesperado se convierte en un fallo de ESTE fichero, no
    // en un 500: el cliente pide de uno en uno y tiene que poder seguir con
    // el siguiente aunque este reviente.
    return json({ ok: false, idMel, accion, motivo: `error inesperado: ${e.message}` });
  }
};
