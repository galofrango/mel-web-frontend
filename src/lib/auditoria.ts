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
};

export type Item = {
  idMel: string;
  fila: number;
  evento: string;
  px: string;
  peso: string;
  bytes: number;
  mayor: number;
  /** Silenciado con `#acepta:clave` en notasArchivo. Sigue viniendo en el grupo
   *  —el panel lo pinta escondido y lo saca con el interruptor «Mostrar avisos
   *  ocultos»— pero no cuenta en ninguna cifra mientras esté oculto. Antes
   *  `auditar()` lo descartaba, y entonces un aviso oculto no existía para el
   *  navegador: no había forma de enseñarlo sin volver a pedirle la hoja al
   *  servidor. */
  oculto: boolean;
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
  ['sin-lugar', 1, 'Sin lugar', 'No hay local que situar en el mapa', 'Abrir en la hoja', false,
   '<b>El problema es que la ficha no tiene nombre de local</b>, así que no hay nada que enseñar en la etiqueta «Lugar» ni por lo que agrupar el evento en el mapa.<br><br>La forma de corregirlo es escribir el nombre del local en la columna E de la [hoja→E1].',
   'Aquí «Desconocido» vale exactamente igual que dejar la celda vacía: el sitio trata las dos cosas como un hueco y ofrece «¿Nos ayudas?». Escríbelo si prefieres que se vea que no se ha olvidado. Ojo, en Coordenadas no es así.', 'id',
   (f, t) => estaVacio(f.lugar)],
  ['sin-coordenadas', 1, 'Sin coordenadas', 'El evento no aparece en el mapa', 'Abrir en la hoja', false,
   '<b>El problema es que sin el enlace de Google Maps el evento no sale en el mapa.</b><br><br>La forma de corregirlo es buscar el local en Google Maps, copiar la URL larga del navegador y pegarla en la columna G de la [hoja→G1]. El sitio saca el punto exacto del propio enlace.',
   'Si esta celda se deja vacía el sitio busca la localidad en una tabla y coloca el evento en el centro de su municipio. Si se rellena con «Desconocido», el evento no se mostrará en el mapa del todo.', 'id',
   (f, t) => estaVacio(f.coordenadas)],
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
   null, 'id',
   (f, t) => estaVacio(f.artistas)],
  ['png', 2, 'Archivo PNG', 'Pesa hasta diez veces más que el mismo cartel en JPEG', 'Convertir a JPG', true,
   '<b>El problema es el peso</b>: un PNG puede pesar diez veces más que el mismo cartel en JPEG y la galería carga 32 de golpe.<br><br>La forma de corregirlo es convertir a JPEG (calidad 85) y pasar el color a sRGB en la misma pasada.',
   'JPEG no admite transparencias, así que no proceses aquellos archivos que necesiten conservarla.', 'bytes',
   (f, t) => t.tipo === 'png'],
  ['no-srgb', 2, 'Espacio de color diferente a sRGB', 'Los colores pueden verse apagados', 'Pasar a sRGB', true,
   '<b>sRGB es el único espacio que todos los navegadores tratan igual.</b> Con otros espacios de color, los colores podrían verse apagados.<br><br>La forma de corregirlo es pasarlo a sRGB.',
   null, 'bytes',
   (f, t) => t.comp === 4 || t.noSrgb],
  ['enorme', 2, 'Resolución mayor de 2400px', 'Esos píxeles de más solo añaden peso', 'Reducir a 2400 px', true,
   '<b>El sitio no muestra imágenes superiores a ese tamaño</b> por lo que esos píxeles de más solo añaden peso.<br><br>La forma de corregirlo es reducir a 2400 px de lado mayor.',
   'La reducción de tamaño implica necesariamente una reducción de peso.', 'px-desc',
   (f, t) => ladoMayor(t) > UMBRAL_LADO],
  ['pesado', 2, 'Peso superior a 2Mb', 'El original viaja entero en cada visita', 'Recomprimir', true,
   '<b>El exceso de peso se paga en cada visita.</b> El archivo original siempre viaja entero desde Google Drive.',
   null, 'bytes',
   // Aquí SOLO entra lo que ya está bien de todo lo demás (criterio del
   // propietario, 02/08/2026): así no se recomprime —perdiendo calidad— algo
   // que iba a adelgazar solo al convertirlo, reducirlo o pasarlo a sRGB. El
   // PNG se excluye por la misma razón y por una más dura: un PNG no tiene
   // calidad que bajar, así que el botón «Recomprimir» no podría hacer nada
   // (el motor lo rechaza, ver arreglar.ts).
   (f, t) => t.bytes > 2 * 1048576 && t.tipo !== 'png' && ladoMayor(t) <= UMBRAL_LADO && !t.noSrgb && t.comp !== 4],
  ['pequeno', 2, 'Baja resolución', 'Por debajo de 1200 px: no se estira, se ve pequeño', null, false,
   '<b>La imagen original no alcanza la resolución óptima para el sitio web.</b> La imagen se verá pequeña en algunas ocasiones, ya que la página nunca la ampliará por encima de su tamaño real para no distorsionarla.<br><br>La única forma de corregirlo es conseguir un original de mayor resolución.',
   null, 'px-asc',
   (f, t) => ladoMayor(t) > 0 && ladoMayor(t) < 1200],
  ['gif', 2, 'GIF animado', 'Drive no lo redimensiona: se descarga entero', null, false,
   '<b>Google Drive no redimensiona y el archivo se descarga entero en cada visita</b>, incluidas las miniaturas.<br><br>Solo podemos optimizar la navegación extrayendo un fotograma fijo que sirva como portada de la pieza hasta que el usuario acceda a la página de evento para ver la pieza completa.',
   'El GIF original quedará intacto y se creará una imagen nueva en la carpeta de Drive que no aparecerá en el spreadsheet.', 'bytes',
   (f, t) => t.tipo === 'gif'],
];

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

/** Si `notas` lleva la marca `#acepta:<clave>`. El `(?![a-z0-9-])` ancla el
 *  final de la clave: sin él, un `includes()` a secas confundiría la marca
 *  con el prefijo de otra. Hoy no colisiona —ninguna de las diez claves es
 *  prefijo de otra—, pero si el día de mañana una clave nueva extiende a una
 *  vieja sin separador (p.ej. "pesado2" junto a "pesado"), aceptar la nueva
 *  silenciaría la vieja sin que nadie lo pidiera. No lo simplifiques de
 *  vuelta a `includes()`: es justo el caso que este límite existe para evitar. */
function estaSilenciado(notas: unknown, clave: string): boolean {
  return new RegExp('#acepta:' + clave + '(?![a-z0-9-])').test(String(notas).toLowerCase());
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
        // La marca en notasArchivo silencia solo esta regla, en esta fila.
        oculto: estaSilenciado(fila.notasArchivo, clave),
      });
    }

    if (items.length === 0) continue;

    items.sort(ORDENA[criterio]);
    grupos.push({ clave, nivel, titulo, consecuencia, accion, auto, descripcion, aviso, items });
  }

  return grupos;
}
