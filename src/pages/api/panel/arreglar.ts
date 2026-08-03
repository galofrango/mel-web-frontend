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
 * Una llamada = UN fichero, nunca un lote (cuerpo `{ acciones, idMel }`): así
 * el cliente puede pedir de uno en uno, contar «12 de 33» de verdad y parar a
 * mitad.
 *
 * El plan sale de LAS ACCIONES QUE SE PIDEN, y el estado medido solo decide si
 * cada una tiene algo que hacer en este fichero. Antes era al revés —el plan se
 * deducía del estado e ignoraba el botón— y eso hacía que «Reducir a 2400 px»
 * sobre un PNG lo convirtiera además a JPEG, aplanándole la transparencia.
 * Corregido el 02/08/2026 por el propietario: un botón hace lo que dice, y las
 * demás operaciones se ofrecen en el modal para que se marquen a mano.
 *
 * Lo que SÍ se conserva es la regla de una sola pasada: si se piden tres
 * operaciones, salen las tres en la misma invocación de `sips`, nunca en tres
 * —cada recompresión de un JPEG pierde calidad—. Y el estado se vuelve a medir
 * aquí, sobre el fichero recién descargado, porque es lo único fiable en el
 * momento de procesar: puede haber cambiado desde que se pintó el panel.
 *
 * La segunda mitad de la tarea 7 (el modal de confirmación, que decide qué
 * conjunto de mejoras ofrecer y con qué texto) consume esta ruta pero no vive
 * aquí.
 */
import type { APIRoute } from 'astro';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm, mkdir, readdir, unlink } from 'node:fs/promises';
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
const ACCIONES_VALIDAS = new Set(['png', 'no-srgb', 'enorme', 'pesado']);

const PERFIL_SRGB = '/System/Library/ColorSync/Profiles/sRGB Profile.icc';
const PERFIL_GRIS = '/System/Library/ColorSync/Profiles/Generic Gray Gamma 2.2 Profile.icc';
// 95, no 85 (criterio del propietario, 03/08/2026). Medido sobre el archivo:
// subir de 85 a 95 solo engorda el fichero un 10% —un PNG de 3627 KB sale en
// 956 a 85 y en 1048 a 95, cuando el original pesa tres veces eso— y la
// diferencia de calidad sí se nota. Y sigue bastando para lo que hace falta:
// los tres JPEG del archivo que pasan de 2 MB bajan por debajo YA en la
// primera pasada a 95 (3385→1971, 2759→1916, 2668→1367 KB).
const CALIDAD_MAXIMA = 100;   // «no añadas pérdida», aunque el fichero engorde
const CALIDAD_ARCHIVO = 95;
const CALIDAD_MINIMA = 30;    // no bajar de aquí: destruir el cartel no es "arreglarlo"
const PASO_CALIDAD = 5;    // de 5 en 5: para en cuanto entra, sin pasarse de largo
const LIMITE_PESO = 2 * 1048576;  // 2 MB, el mismo umbral que auditoria.ts
// Un solo número: se avisa por encima de 2400 y se reduce a 2400, así no queda
// franja muerta (antes se avisaba a partir de 3000 y los de 2401–3000 no salían
// en ningún sitio). El mismo valor vive en auditoria.ts como UMBRAL_LADO.
const UMBRAL_ENORME = 2400;
const LADO_OBJETIVO = 2400;

export type Accion = 'png' | 'no-srgb' | 'enorme' | 'pesado';

export type PlanArreglo =
  | { estado: 'rechazado'; motivo: string }
  | { estado: 'sin-cambios' }
  | { estado: 'aplicar'; salida: 'jpeg' | 'png'; reduce: boolean; recomprime: boolean; calidad: number; perfil: string };

/** Si cada acción tiene algo que hacer en ESTE fichero. Pedir reducir un cartel
 *  que no pasa de 3000 px no es un error del que avisar: simplemente no aplica,
 *  y aplicarlo lo AMPLIARÍA (`--resampleHeightWidthMax` agranda, medido). */
const APLICA: Record<Accion, (t: DatosImagen) => boolean> = {
  png: (t) => t.tipo === 'png',
  // CMYK entra aquí: la regla "cmyk" se fundió en "no-srgb" (ver auditoria.ts).
  'no-srgb': (t) => t.comp === 4 || t.noSrgb,
  enorme: (t) => ladoMayor(t) > UMBRAL_ENORME,
  pesado: (t) => t.bytes > LIMITE_PESO,
};

/**
 * Qué hay que hacerle a un fichero, dadas LAS ACCIONES QUE SE HAN PEDIDO — la
 * del botón que se pulsó, más las que se marquen en el modal. Ni una más.
 *
 * Esto es lo contrario de lo que hacía antes, y el cambio viene del propietario
 * (02/08/2026): antes el plan se deducía del estado medido e ignoraba qué botón
 * se había pulsado, de modo que "Reducir a 2400 px" sobre un PNG además lo
 * convertía a JPEG y le aplanaba la transparencia. Un botón que hace más de lo
 * que dice se come la razón de separar los avisos por incidencia, y deja sin
 * sentido que el modal ofrezca añadir las otras.
 *
 * **Muchos PNG se quedan PNG**: los que llevan transparencia se conservan tal
 * cual, y eso no impide optimizarlos por tamaño o por color. Solo la acción
 * `png` cambia el formato, y la salida solo se mueve hacia JPEG, nunca al revés.
 *
 * La ÚNICA cosa que se hace siempre sin pedirla es `--matchTo` (ver
 * `argumentosSips`), y no es un extra: es lo que impide romper el fichero.
 */
export function planificarArreglo(t: DatosImagen, acciones: readonly Accion[], calidadMaxima = false): PlanArreglo {
  if (t.tipo === 'gif') {
    return { estado: 'rechazado', motivo: 'GIF animado: no tiene arreglo automático, convertirlo destruiría la animación' };
  }
  if (t.tipo === 'desconocido') {
    return { estado: 'rechazado', motivo: 'fichero no reconocido' };
  }

  const pedidas = new Set(acciones.filter((a) => APLICA[a]?.(t)));
  if (pedidas.size === 0) return { estado: 'sin-cambios' };

  // La salida solo se mueve hacia JPEG, y solo si se ha pedido convertir. Un
  // JPEG de entrada sigue siendo JPEG haga lo que haga.
  const salida: 'jpeg' | 'png' = pedidas.has('png') || t.tipo === 'jpeg' ? 'jpeg' : 'png';
  const reduce = pedidas.has('enorme');

  // Un PNG es sin pérdida: no tiene calidad que bajar, así que la escalera de
  // recompresión solo existe si la salida es JPEG. Si eso deja el plan sin nada
  // que hacer, se dice — antes esto se "arreglaba" convirtiéndolo a JPEG por su
  // cuenta, que es justo lo que ya no se hace.
  const recomprime = pedidas.has('pesado') && salida === 'jpeg';
  if (!recomprime && !reduce && salida === 'png') {
    return {
      estado: 'rechazado',
      motivo: 'Un PNG que sigue siendo PNG no adelgaza recomprimiendo: no tiene calidad que bajar. Redúcelo de tamaño o conviértelo a JPG.',
    };
  }

  // A qué calidad se vuelve a guardar.
  //
  // Cambiar de color, de formato o de tamaño obliga a reescribir el JPEG, y
  // escribir un JPEG obliga a elegir una calidad: no existe un «déjalo como
  // estaba». Lo único elegible es CUÁL, y solo hay dos respuestas razonables —
  // 95, la norma del archivo, o la máxima.
  //
  // 95 es lo que se OFRECE marcado, no lo que se impone: el propietario lo pidió
  // como opción explícita del modal (04/08/2026) porque el banner ya lo anuncia
  // como recomendación, y una recomendación que se aplica sola no es una
  // recomendación. Sin marcar se usa la máxima, que no añade pérdida pero deja
  // el fichero pesando como el original o más (medido).
  //
  // «pesado» es la excepción y no pregunta: ahí la calidad ES el arreglo. Su
  // ESCALERA (95 → 90 → 85…, de cinco en cinco) solo corre en ese caso, que es
  // el único que persigue un peso concreto.
  const calidad = recomprime || !calidadMaxima ? CALIDAD_ARCHIVO : CALIDAD_MAXIMA;

  return { estado: 'aplicar', salida, reduce, recomprime, calidad, perfil: t.gris ? PERFIL_GRIS : PERFIL_SRGB };
}

/**
 * Los argumentos de `sips` para una pasada, dada la calidad a probar.
 * SIEMPRE lista de argumentos — nunca una cadena de shell (regla del spec).
 *
 * `--matchTo` va en TODAS, se haya pedido tocar el color o no, y eso no
 * contradice lo de "hacer solo lo que dice el botón": es lo único que evita
 * romperlo. `sips` a secas —redimensionar, recomprimir o cambiar de formato—
 * le quita al fichero la etiqueta de color SIN convertir los píxeles, y un
 * Adobe RGB sin etiqueta se pinta apagado (medido: 13 puntos de 255 de
 * desaturación). Con `--matchTo` en la misma orden sale convertido de verdad.
 * Sobre un fichero que ya es sRGB no cambia nada. Ver D-174.
 *
 * Si la salida sigue siendo PNG no se toca el formato: sin `-s format`, `sips`
 * conserva el PNG **y su transparencia** — comprobado sobre MEL-00008, que
 * mantiene el alfa tanto al reducir como al pasar el color.
 *
 * Cuando SÍ se convierte a JPEG, el alfa se aplana solo, sin argumento aparte:
 * comprobado sobre un fichero real que `--matchTo` compone el alfa=0 sobre
 * BLANCO (no negro), que es la decisión del propietario.
 */
export function argumentosSips(plan: Extract<PlanArreglo, { estado: 'aplicar' }>, calidad: number, entrada: string, salida: string): string[] {
  const args: string[] = [];
  if (plan.reduce) args.push('--resampleHeightWidthMax', String(LADO_OBJETIVO));
  if (plan.salida === 'jpeg') args.push('-s', 'format', 'jpeg', '-s', 'formatOptions', String(calidad));
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

  let cuerpo: { accion?: string; acciones?: string[]; idMel?: string; simular?: boolean; limpiar?: boolean; abrirCarpeta?: boolean; calidadMaxima?: boolean };
  try {
    cuerpo = await request.json();
  } catch {
    return json({ ok: false, motivo: 'cuerpo no es JSON válido' }, 400);
  }

  // Se aceptan las dos formas: `accion` (la del botón pulsado, a secas) y
  // `acciones` (esa más las que se marquen en el modal). Se normaliza a lista
  // porque el motor razona en plural desde que un botón hace solo lo suyo.
  // Abrir la carpeta de simulaciones en el Finder. Va aquí y no en una ruta
  // aparte porque los guardas que hacen esto aceptable —solo en desarrollo y
  // solo desde localhost— ya están puestos arriba. La ruta es FIJA: no entra
  // nada del cuerpo en el comando, así que no hay nada que inyectar.
  if (cuerpo.abrirCarpeta) {
    const dir = join(process.cwd(), 'simulacion');
    await mkdir(dir, { recursive: true });
    try {
      await execFileP('open', [dir]);
      return json({ ok: true, abierta: 'simulacion' });
    } catch (e: any) {
      return json({ ok: false, motivo: `no se pudo abrir la carpeta: ${e.message}` });
    }
  }

  const { idMel } = cuerpo;
  const acciones = cuerpo.acciones ?? (cuerpo.accion ? [cuerpo.accion] : []);
  if (!Array.isArray(acciones) || acciones.length === 0) {
    return json({ ok: false, motivo: 'falta la acción' }, 400);
  }
  const desconocida = acciones.find((a) => typeof a !== 'string' || !ACCIONES_VALIDAS.has(a));
  if (desconocida !== undefined) {
    return json({ ok: false, motivo: `accion desconocida: "${desconocida}"` }, 400);
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
    if (!fila) return json({ ok: false, idMel, acciones, motivo: 'ese idMel no está en la hoja' });

    const idDrive = idDeDrive(fila.urlDrive);
    if (!ID_DRIVE_VALIDO.test(idDrive)) {
      return json({ ok: false, idMel, acciones, motivo: 'id de Drive inválido o ausente' });
    }

    // 2. Autenticar y descargar el original.
    const token = await obtenerToken(leerCredencial());
    let original: Buffer;
    try {
      original = await descargarFichero(idDrive, token);
    } catch (e: any) {
      return json({ ok: false, idMel, acciones, motivo: `descarga falló: ${e.message}` });
    }

    // 3. Medir y decidir. Puro: nada de lo que sigue en este bloque puede
    //    cambiar el resultado de planificarArreglo.
    const estado = leerCabecera(original);
    const plan = planificarArreglo(estado, acciones as Accion[], cuerpo.calidadMaxima === true);

    if (plan.estado === 'rechazado') {
      return json({ ok: false, idMel, acciones, motivo: plan.motivo, tecnico: estado });
    }
    if (plan.estado === 'sin-cambios') {
      return json({ ok: true, idMel, acciones, hecho: false, motivo: 'no le hacía falta ningún arreglo automático', tecnico: estado });
    }

    // 4. sips sobre un temporal, con reintentos de calidad si el resultado
    //    sigue pesando de más. SIEMPRE se parte del original descargado, no
    //    de una salida previa: recomprimir un JPEG ya comprimido pierde
    //    calidad para nada.
    const dirTmp = await mkdtemp(join(tmpdir(), 'mel-panel-'));
    let salidaBuf: Buffer;
    try {
      const entrada = join(dirTmp, 'entrada');
      const salida = join(dirTmp, plan.salida === 'jpeg' ? 'salida.jpg' : 'salida.png');
      await writeFile(entrada, original);

      // La escalera de calidad SOLO baja si se pidió "pesado". Antes bajaba
      // siempre que el resultado pasara de 2 MB, aunque solo se hubiera pedido
      // convertir: eso es perseguir un peso que nadie pidió arreglar, perdiendo
      // calidad por el camino. Un PNG que sigue siendo PNG nunca entra aquí —
      // no tiene calidad que bajar (`recomprime` es false por construcción).
      let calidad = plan.calidad;
      for (;;) {
        await execFileP('sips', argumentosSips(plan, calidad, entrada, salida));
        salidaBuf = await readFile(salida);
        if (!plan.recomprime || salidaBuf.length <= LIMITE_PESO) break;
        const siguiente = siguienteCalidad(calidad);
        if (siguiente === null) break;
        calidad = siguiente;
      }
    } finally {
      await rm(dirTmp, { recursive: true, force: true });
    }

    // 5a. SIMULACIÓN: el recorrido entero menos la última línea. Se ha
    //     descargado el original de verdad, se ha medido de verdad y sips lo ha
    //     procesado de verdad; lo único que no pasa es sustituirlo en Drive.
    //
    //     El resultado NO se tira: se deja en `simulacion/` junto al original,
    //     con nombres que se emparejan (`-antes` / `-despues`), para poder
    //     abrirlos y compararlos antes de dejar que esto toque el archivo. Es
    //     petición del propietario, y es mejor que procesar a ciegas: los
    //     números dicen que pesa menos, pero solo el ojo dice si sigue estando
    //     bien.
    if (cuerpo.simular) {
      const dir = join(process.cwd(), 'simulacion');
      await mkdir(dir, { recursive: true });
      // El cliente marca `limpiar` en el PRIMER fichero de cada tanda: así la
      // carpeta enseña solo lo que se acaba de probar, en vez de ir acumulando
      // pruebas viejas hasta que no se sabe cuál es de cuándo. Se borra aquí y
      // no al cerrar el modal porque cerrar no es "he terminado de mirar".
      if (cuerpo.limpiar) {
        for (const f of await readdir(dir)) {
          if (/^MEL-[\w-]+\.(jpg|png|bin)$/.test(f) || /-(antes|despues)\./.test(f)) {
            await unlink(join(dir, f)).catch(() => {});
          }
        }
      }
      const ext = (b: Buffer) => (b[0] === 0xFF && b[1] === 0xD8 ? 'jpg' : b[1] === 0x50 ? 'png' : 'bin');
      const antes = join(dir, `${idMel}-antes.${ext(original)}`);
      const despues = join(dir, `${idMel}-despues.${plan.salida === 'jpeg' ? 'jpg' : 'png'}`);
      await writeFile(antes, original);
      await writeFile(despues, salidaBuf);
      return json({
        ok: true, idMel, acciones, simulado: true, hecho: false,
        antes: { bytes: original.length, tipo: estado.tipo, px: estado.px, perfil: estado.perfil, comp: estado.comp },
        despues: { bytes: salidaBuf.length, ...leerCabecera(salidaBuf) },
        // Rutas relativas: el panel las enseña para poder abrirlas, y no hay
        // por qué publicar el árbol de directorios de la máquina.
        ficheros: [`simulacion/${idMel}-antes.${ext(original)}`, `simulacion/${idMel}-despues.${plan.salida === 'jpeg' ? 'jpg' : 'png'}`],
      });
    }

    // 5b. Sustituir en Drive, conservando el id — no toca ni una celda de la hoja.
    try {
      await sustituirFichero(idDrive, salidaBuf, plan.salida === 'jpeg' ? 'image/jpeg' : 'image/png', token);
    } catch (e: any) {
      return json({ ok: false, idMel, acciones, motivo: `no se pudo sustituir en Drive: ${e.message}` });
    }

    // 6a. Actualizar la caché de medidas EN DISCO para este fichero. Sin esto
    //     el panel mentiría justo después de arreglar: `flyer_tecnico.json` lo
    //     escribe `scripts/medir-archivo.mjs`, así que un cartel recién
    //     convertido seguiría saliendo como PNG hasta que alguien se acordara
    //     de correr el script a mano. Se acaba de medir el resultado aquí
    //     mismo; guardarlo es gratis y es la única forma de que recargar la
    //     página diga la verdad.
    try {
      const ruta = join(process.cwd(), 'src', 'data', 'flyer_tecnico.json');
      const cache = JSON.parse(await readFile(ruta, 'utf8'));
      const destino = cache.imagenes ?? cache;
      destino[idDrive] = leerCabecera(salidaBuf);
      await writeFile(ruta, JSON.stringify(cache, null, 1));
    } catch { /* la caché es una comodidad, no la verdad: si falla, se remide */ }

    const tecnicoNuevo = leerCabecera(salidaBuf);

    // 6a-bis. Anotar en el registro. Solo las pasadas REALES: una simulación no
    //     toca nada y apuntarla inflaría el ahorro con trabajo que no se hizo.
    //     Se anota DESPUÉS de sustituir en Drive, no antes: lo que se registra
    //     es lo que pasó, no lo que se iba a intentar.
    try {
      const ruta = join(process.cwd(), 'src', 'data', 'panel_historial.json');
      let apuntes: any[] = [];
      try { apuntes = JSON.parse(await readFile(ruta, 'utf8')); } catch { /* aún no existe */ }
      apuntes.push({
        fecha: new Date().toISOString(),
        idMel, acciones,
        antes: { bytes: original.length, tipo: estado.tipo, perfil: estado.perfil },
        despues: { bytes: salidaBuf.length, tipo: tecnicoNuevo.tipo, perfil: tecnicoNuevo.perfil },
      });
      await writeFile(ruta, JSON.stringify(apuntes, null, 1));
    } catch { /* el registro es contabilidad, no el trabajo: no tumba el arreglo */ }

    // 6b. Devolver el resultado. El panel recalcula TODAS las secciones con
    //    esto, no solo la que se pulsó (una acción puede arreglar varios avisos).
    return json({
      ok: true, idMel, acciones, hecho: true, tecnico: tecnicoNuevo,
      // Mismos campos que la simulación: así el resumen del modal es UNO solo y
      // no dos que dicen lo mismo con formas distintas.
      antes: { bytes: original.length, tipo: estado.tipo, px: estado.px, perfil: estado.perfil, comp: estado.comp },
      despues: { bytes: salidaBuf.length, ...tecnicoNuevo },
    });
  } catch (e: any) {
    // Cualquier fallo inesperado se convierte en un fallo de ESTE fichero, no
    // en un 500: el cliente pide de uno en uno y tiene que poder seguir con
    // el siguiente aunque este reviente.
    return json({ ok: false, idMel, acciones, motivo: `error inesperado: ${e.message}` });
  }
};
