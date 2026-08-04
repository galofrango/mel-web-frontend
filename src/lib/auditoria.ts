/**
 * Las reglas del archivo. Puro: entra lo que ya está en memoria, salen los
 * avisos. Sin red, sin disco, sin DOM — por eso se puede probar entero.
 *
 * El ORDEN de GRUPOS es un orden de TRABAJO, no un ranking por número: arreglar
 * los de arriba resuelve los de abajo. Medido sobre el archivo el 02/08/2026:
 * convertir los 33 PNG, los 13 que no están en sRGB y los 6 grandes resuelve de
 * paso 18 de los 25 "+2 MB". Reordenarlo por cantidad hace que el panel proponga
 * recomprimir 18 imágenes que iban a bajar solas.
 *
 * "no-srgb" absorbió a la antigua regla "cmyk" (criterio del propietario,
 * 02/08/2026): el defecto es el mismo —el fichero no está en sRGB—, el arreglo
 * es el mismo botón, y una sección con UN solo cartel era ruido. No comparte ni
 * un cartel con "png" ni con "enorme" (medido), así que su sitio no lo decide el
 * arrastre: va donde estaba "cmyk", y por delante de "pesado" porque uno de los
 * trece pasa de 2 MB y baja solo al convertirse.
 */
import { ladoMayor, type DatosImagen } from './imagen.ts';
import { tieneUbicacion } from './mel.ts';

/** Lado mayor a partir del cual una imagen sobra de tamaño, y al que se reduce.
 *  Un solo número para las dos cosas: si se avisa por encima de 2400 y se
 *  reduce a 2400, no queda franja muerta. Antes se avisaba a partir de 3000 y
 *  se reducía a 2400, así que los de 2401–3000 no salían en ningún sitio.
 *  El mismo valor vive en `arreglar.ts` (LADO_OBJETIVO/UMBRAL_ENORME). */
const UMBRAL_LADO = 2400;

/** Una fila de la hoja de Flyers ya mapeada por `mapSheetRow` (mel.ts), con su
 *  número de fila real añadido (`n`, para el enlace "Abrir en la hoja"). */
export type FilaHoja = {
  n: number;
  evento: string;
  urlDrive: string;
  fecha: string;
  lugar: string;
  localidad: string;
  coordenadas: string;
  artistas: string;
  organiza: string;
  descripcion: string;
  idMel: string;
  carruselOrder: string;
  disenador: string;
  existeOriginal: string;
  formato: string;
  notasArchivo: string;
  ocr: string;
  notasOcultas: string;
};

export type Item = {
  idMel: string;
  fila: number;
  evento: string;
  px: string;
  peso: string;
  bytes: number;
  mayor: number;
  /** Nombre del perfil de color incrustado, o `null`. Lo usa el modal para
   *  decir de dónde a dónde va el color ANTES de tocar nada — es de los pocos
   *  datos del resultado que sí se pueden saber por adelantado. */
  perfil: string | null;
  /** Ocultado con `#oculto:clave` en la columna AA («Notas desde el panel»). Sigue viniendo en el grupo
   *  —el panel lo pinta escondido y lo saca con el interruptor «Ver ocultos»—
   *  pero no cuenta en ninguna cifra mientras esté oculto. Antes
   *  `auditar()` lo descartaba, y entonces un aviso oculto no existía para el
   *  navegador: no había forma de enseñarlo sin volver a pedirle la hoja al
   *  servidor. */
  oculto: boolean;
  /** El motivo escrito al ocultar ESTA regla, ya sin la marca `#oculto:`.
   *  La columna AA puede llevar las líneas de otras reglas del mismo cartel:
   *  aquí llega solo la que corresponde a este grupo. */
  notas: string;
};

export type Grupo = {
  clave: string;
  nivel: 1 | 2;
  titulo: string;
  consecuencia: string;
  accion: string | null;
  auto: boolean;
  descripcion: string;
  aviso: string | null;
  items: Item[];
};

/** Lo que la hoja usa para decir "no hay dato". Mismos que el DS. */
export const CENTINELAS = new Set(['', 'desconocido', 'sin fecha', 'no detallados', 'varios']);

export function estaVacio(v: unknown): boolean {
  return CENTINELAS.has(String(v ?? '').trim().toLowerCase());
}

const MB = (b: number) => (b / 1048576).toFixed(1).replace('.', ',') + ' MB';

/** Comprobaciones que hoy dan cero. El panel las enseña igual: si no dice lo que
 *  miró y pasó, no sabes si llegó a mirarlo. */
export const LIMPIO = ['Sin imagen', 'Fecha ilegible', 'ID duplicado', 'Fila fuera del archivo',
  'Sin diseñador', 'Sin localidad', 'Proporción imposible'];

type Criterio = 'bytes' | 'px-desc' | 'px-asc' | 'id';

type Regla = [
  clave: string,
  nivel: 1 | 2,
  titulo: string,
  consecuencia: string,
  accion: string | null,
  auto: boolean,
  descripcion: string,
  aviso: string | null,
  criterio: Criterio,
  prueba: (f: FilaHoja, t: DatosImagen) => boolean,
];

// Las descripciones y banners son texto de producto, copiado literal de
// docs/superpowers/specs/2026-07-31-panel-control-archivo-design.md, sección
// "El texto de cada aviso". El " / " del spec separa las dos frases (el
// problema / la corrección); aquí se conserva el corte con <br><br>.
// Excepción: la descripción de "sin-artistas" es una reescritura posterior
// del propietario (frase única, sin ese corte y sin negritas) — no sigue el
// patrón problema/corrección de las demás, y es a propósito.
//
// El marcador [hoja→X] (p.ej. [hoja→E1]) es un enlace a esa columna de la
// hoja. NO se resuelve a <a href> aquí: la URL sale de `SHEET_ID` (mel.ts)
// vía `${sheetUrl()}&range=X` con el patrón
// `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=0#gid=0&range=X`,
// y este módulo solo consume `imagen.ts` (ver Interfaces del encargo). Queda
// para quien pinte la sección (tarea 5) sustituir el marcador al renderizar.

// clave, nivel, título, consecuencia, acción, auto, descripción, banner, criterio, prueba
const REGLAS: Regla[] = [
  ['sin-fecha', 1, 'Sin fecha válida', 'El cartel desaparece al filtrar por años', 'Abrir en la hoja', false,
   'Sin una fecha en formato DD/MM/AAAA el cartel se cae del filtro de años y se ordena mal. Hay que escribirla en la columna D de la [hoja→D1].',
   'Ojo con el formato, no solo con que esté rellena: medido el 04/08/2026, una fecha con guiones («12-07-2013») se interpreta como el año 12 y manda el cartel al principio de todo. Una celda con texto («SIN FECHA») o vacía lo deja fuera del filtro, pero al menos no lo coloca donde no es.', 'id',
   (f, t) => !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(f.fecha ?? '').trim())],
  ['sin-lugar', 1, 'Sin lugar', 'No hay local que situar en el mapa', 'Abrir en la hoja', false,
   'Sin la información de lugar no se puede agrupar el evento en el mapa. Hay que escribir el nombre del local en la columna E de la [hoja→E1].',
   'En el spreadsheet «Desconocido» o celda vacía mostrarán el link «¿Nos ayudas?» en la tag de Lugar.', 'id',
   (f, t) => estaVacio(f.lugar)],
  ['sin-coordenadas', 1, 'Sin dirección exacta', 'El evento no aparece en el mapa', 'Abrir en la hoja', false,
   'Sin el link de Google Maps no se puede mostrar el evento en el mapa. Hay que buscar la dirección en Google Maps y pegar la URL larga del navegador en la columna G de la [hoja→G1] — la que empieza por <i>google.com/maps/place/…</i>, no el enlace corto de Compartir.',
   null, 'id',
   (f, t) => !tieneUbicacion(f.coordenadas)],
  // Dentro de "Falta información" (nivel 1: sin-lugar, sin-coordenadas,
  // sin-artistas), el orden interno responde a otro criterio, no a la
  // cascada de arriba: lo que ROMPE va antes que lo que FALTA. Sin lugar y
  // sin coordenadas impiden que el evento salga en el mapa; sin artistas es
  // una laguna de catalogación que no rompe nada. Antes eran dos tarjetas
  // distintas (nivel 1 y nivel 3) y el rótulo ya separaba una cosa de otra;
  // al fundirse en una sola, el rótulo dejó de distinguirlas — así que ahora
  // es el orden quien lo dice.
  ['sin-artistas', 1, 'Sin artistas', 'El archivo no sabe quién pinchó', 'Abrir en la hoja', false,
   'Aún no sabemos quién actuó en el evento o no hemos rellenado la columna H de la [hoja→H1] con los nombres de los artistas separados por comas.',
   'En el spreadsheet «Desconocido» o celda vacía mostrarán el link «¿Nos ayudas?» en la sección de artistas.', 'id',
   (f, t) => estaVacio(f.artistas)],
  ['sin-medir', 1, 'Sin medir', 'Se le escapan los avisos de formato, tamaño y peso', null, false,
   '<b>El problema es que de este cartel no hay medidas</b>, así que las comprobaciones de formato, tamaño y peso ni siquiera se le aplican: pasa en verde por no haber sido mirado.<br><br>La forma de corregirlo es volver a medir el archivo:<br><code>node scripts/medir-archivo.mjs</code>',
   'Le pasa a todo lo que se sube después de la última medición. No es un defecto del cartel, es que aún no se ha mirado.', 'id',
   (f, t) => t.tipo === 'desconocido'],
  ['png', 2, 'Archivo PNG', 'Pesa unas dos veces y media más que el mismo cartel en JPEG', 'Convertir a JPG', true,
   '<b>El problema es el peso</b>: a tamaño de miniatura un PNG pesa unas dos veces y media más que el mismo cartel en JPEG, y la galería carga 32 de golpe.<br><br>La forma de corregirlo es convertir a JPEG (calidad 95) y pasar el color a sRGB en la misma pasada.',
   'JPEG no admite transparencias. No proceses aquellos archivos que necesiten conservarla.', 'bytes',
   (f, t) => t.tipo === 'png'],
  ['no-srgb', 2, 'Espacio de color diferente a sRGB', 'Los colores pueden verse apagados', 'Pasar a sRGB', true,
   '<b>sRGB es el único espacio que todos los navegadores tratan igual.</b> Con otros espacios de color, los colores podrían verse apagados.<br><br>La forma de corregirlo es pasarlo a sRGB.',
   'Con el cambio a sRGB puede que el archivo gane peso. Es recomendable bajarlo a calidad 95 en la misma pasada para evitar ese aumento en el procesamiento del archivo.', 'bytes',
   (f, t) => t.comp === 4 || t.noSrgb],
  ['enorme', 2, 'Resolución mayor de 2400px', 'Esos píxeles de más solo añaden peso', 'Reducir a 2400 px', true,
   '<b>El sitio no muestra imágenes superiores a ese tamaño</b> por lo que esos píxeles de más solo añaden peso.<br><br>La forma de corregirlo es reducir a 2400 px de lado mayor.',
   'La reducción de tamaño implica necesariamente una reducción de peso.', 'px-desc',
   (f, t) => ladoMayor(t) > UMBRAL_LADO],
  ['pesado', 2, 'Peso superior a 2Mb', 'El original viaja entero en cada visita', 'Comprimir', true,
   '<b>El exceso de peso se paga en cada visita.</b> El archivo original siempre viaja entero desde Google Drive.<br><br>La forma de corregirlo es bajar la calidad del archivo hasta que quede por debajo de 2 MB, empezando con una compresión al 95 de calidad para JPG y una reducción de paleta para PNG (sin pérdida de transparencia).',
   null, 'bytes',
   // Aquí SOLO entra lo que ya está bien de todo lo demás (criterio del
   // propietario, 02/08/2026): así no se recomprime —perdiendo calidad— algo
   // que iba a adelgazar solo al convertirlo, reducirlo o pasarlo a sRGB.
   //
   // El PNG SÍ entra desde el 04/08/2026. Estaba excluido porque un PNG no
   // tiene calidad que bajar y el botón no habría podido hacer nada; con
   // `pngquant` sí puede —reduce a paleta CONSERVANDO la transparencia— así que
   // la exclusión ya no describe la realidad. Y mientras estuvo, los PNG que se
   // quedan en PNG por su transparencia eran un punto ciego: el panel no decía
   // que pesaran de más (6 de los 13 del archivo).
   (f, t) => t.bytes > 2 * 1048576 && ladoMayor(t) <= UMBRAL_LADO && !t.noSrgb && t.comp !== 4],
  ['pequeno', 2, 'Baja resolución', 'Por debajo de 1200 px: no se estira, se ve pequeño', null, false,
   '<b>La imagen original no alcanza la resolución óptima de 2400 px de lado largo para la página.</b> La imagen se verá pequeña en algunas ocasiones ya que la página nunca la ampliará por encima de su tamaño real para no distorsionarla.<br><br>La única forma de corregirlo es conseguir un original de mayor resolución.',
   null, 'px-asc',
   (f, t) => ladoMayor(t) > 0 && ladoMayor(t) < 1200],
  ['gif', 2, 'GIF animado', 'Drive no lo redimensiona: se descarga entero', null, false,
   '<b>Google Drive no redimensiona y el archivo se descarga entero en cada visita</b>, incluidas las miniaturas.<br><br>Solo podemos optimizar la navegación extrayendo un fotograma fijo que sirva como portada de la pieza hasta que el usuario acceda a la página de evento para ver la pieza completa.',
   'El GIF original quedará intacto y se creará una imagen nueva en la carpeta de Drive que no aparecerá en el spreadsheet.', 'bytes',
   (f, t) => t.tipo === 'gif'],
];

/**
 * Las reglas que tienen arreglo automático, con lo que el modal necesita
 * enseñar de cada una. Salen de REGLAS y en su mismo orden de trabajo, así que
 * añadir una regla automática la lleva al modal sola.
 *
 * Se exportan TODAS, tengan o no carteles hoy: el modal las pinta las cuatro en
 * SSR y enseña las que apliquen (regla 7 — ver PanelModal.astro). Un grupo sin
 * items no llega en `auditar()`, así que esta lista no se puede sacar de ahí.
 */
export const AUTOMATICAS = REGLAS
  .filter(([, , , , accion, auto]) => auto && accion)
  .map(([clave, nivel, titulo, , accion, , descripcion]) => ({ clave, nivel, titulo, accion, descripcion }));

const VACIO: DatosImagen = { tipo: 'desconocido', px: null, comp: null, noSrgb: false, alfa: false, bytes: 0 };

const ORDENA: Record<Criterio, (a: Item, b: Item) => number> = {
  bytes: (a, b) => b.bytes - a.bytes,
  'px-desc': (a, b) => b.mayor - a.mayor,
  'px-asc': (a, b) => a.mayor - b.mayor,
  id: (a, b) => a.idMel.localeCompare(b.idMel),
};

/** El id de Drive de una URL de la hoja, en cualquiera de sus dos formas.
 *  Misma lógica que `extractDriveImage` (mel.ts), `idDeDrive` (medir-archivo.mjs)
 *  y `copia-seguridad.mjs`: aquí se repite en vez de importarse porque este
 *  módulo solo consume `imagen.ts` (ver Interfaces del encargo). */
function idDeDrive(url: string): string {
  if (!url) return '';
  if (url.includes('id=')) return url.split('id=')[1].split('&')[0];
  if (url.includes('/d/')) return url.split('/d/')[1].split('/')[0];
  return '';
}

/** Si `notas` lleva la marca `#oculto:<clave>`. El `(?![a-z0-9-])` ancla el
 *  final de la clave: sin él, un `includes()` a secas confundiría la marca
 *  con el prefijo de otra. Hoy no colisiona —ninguna de las diez claves es
 *  prefijo de otra—, pero si el día de mañana una clave nueva extiende a una
 *  vieja sin separador (p.ej. "pesado2" junto a "pesado"), aceptar la nueva
 *  silenciaría la vieja sin que nadie lo pidiera. No lo simplifiques de
 *  vuelta a `includes()`: es justo el caso que este límite existe para evitar. */
/** El texto que se escribió al ocultar ESTA regla, sin la marca delante. La
 *  columna AA guarda una línea por regla oculta del mismo cartel:
 *
 *      #oculto:png Es un vector con transparencia.
 *      #oculto:enorme Hace falta poder ampliar el detalle.
 *
 *  El globo de una sección enseña solo la suya: sacar las de las otras sería
 *  contestar a algo que nadie preguntó. Y sin la marca, que es plomería para
 *  que el panel sepa qué está oculto, no texto para leer. */
export function notaDeLaRegla(notas: unknown, clave: string): string {
  const patrón = new RegExp('^\\s*#oculto:' + clave + '(?![a-z0-9-])', 'i');
  const mía = String(notas ?? '').split('\n').find((l) => patrón.test(l));
  return mía ? mía.replace(patrón, '').trim() : '';
}

function estaSilenciado(notas: unknown, clave: string): boolean {
  return new RegExp('#oculto:' + clave + '(?![a-z0-9-])').test(String(notas).toLowerCase());
}

export function auditar(filas: FilaHoja[], tecnico: Record<string, DatosImagen>): Grupo[] {
  const grupos: Grupo[] = [];

  for (const [clave, nivel, titulo, consecuencia, accion, auto, descripcion, aviso, criterio, prueba] of REGLAS) {
    const items: Item[] = [];

    for (const fila of filas) {
      const t = tecnico[idDeDrive(fila.urlDrive)] || VACIO;
      if (!prueba(fila, t)) continue;

      items.push({
        idMel: fila.idMel,
        fila: fila.n,
        evento: fila.evento,
        px: t.px ? t.px.join('×') : '—',
        peso: t.bytes ? MB(t.bytes) : '—',
        bytes: t.bytes,
        mayor: ladoMayor(t),
        perfil: t.perfil,
        // La marca en AA silencia solo esta regla, en esta fila.
        oculto: estaSilenciado(fila.notasOcultas, clave),
        // Solo la nota de ESTA regla, y sin la marca delante: la columna puede
        // llevar las de otras reglas del mismo cartel, y enseñarlas todas en el
        // globo de una sección concreta sería contestar a algo que nadie
        // preguntó. La marca es plomería, no texto para leer.
        notas: notaDeLaRegla(fila.notasOcultas, clave),
      });
    }

    if (items.length === 0) continue;

    items.sort(ORDENA[criterio]);
    grupos.push({ clave, nivel, titulo, consecuencia, accion, auto, descripcion, aviso, items });
  }

  return grupos;
}
