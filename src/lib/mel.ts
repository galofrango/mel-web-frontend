/**
 * Fuente única de la capa de datos y de las piezas de marcado que el servidor y
 * el cliente tienen que pintar IGUAL.
 *
 * Por qué existe este archivo
 * ---------------------------
 * Antes de esto no había ningún sitio compartido, así que cada página traía su
 * propia copia de lo mismo. El recuento era: la URL de la hoja y el parseo del
 * JSON-P, tres veces (home, ficha, info); `extractDriveImage`, cuatro (las dos
 * mitades de la home —frontmatter y script de cliente—, la ficha, y una cuarta
 * escrita a mano dentro de info.astro); el mapa de columnas `c[0]…c[25]` y el
 * agrupado por evento+fecha, dos.
 *
 * Y ya había cobrado su peaje: la copia de la ficha decía `notesArchivo` donde
 * las demás dicen `notasArchivo`, un typo de copiar y pegar que solo era
 * inofensivo porque ese campo, junto a `existeOriginal`, `formato` y `ocr`, se
 * leía de la hoja para tirarlo acto seguido.
 *
 * Regla: si algo de aquí cambia, cambia para todos los que lo usan. Eso es todo
 * lo que este archivo compra, y es exactamente lo que faltaba.
 */

export const SHEET_ID = '1buzisIlDkCo2Rj5BYZh5-JKrAYSo3RSuBXYmJVGYT0E';

/** URL del endpoint público `gviz/tq`. Sin `sheet` usa la primera hoja. */
export function sheetUrl(sheet?: string): string {
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
  return sheet ? `${base}&sheet=${encodeURIComponent(sheet)}` : base;
}

/**
 * Filas crudas de una hoja. La respuesta NO es JSON: es JSON-P, el objeto viene
 * envuelto en `/*O_o*\/\ngoogle.visualization.Query.setResponse( … );`, así que
 * hay que extraer el interior antes de parsear.
 *
 * Devuelve `[]` —nunca lanza— si la hoja no responde o no se puede parsear: el
 * sitio se sirve en SSR en cada petición y una hoja caída no debe tumbar la
 * página. Cada llamante decide qué pintar con cero filas.
 */
export async function fetchSheetRows(sheet?: string): Promise<any[]> {
  try {
    const response = await fetch(sheetUrl(sheet));
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/);
    if (!match || !match[1]) return [];
    return JSON.parse(match[1]).table.rows || [];
  } catch (e) {
    console.error(`[mel] no se pudo leer la hoja ${sheet ? `"${sheet}"` : '(primera)'}`, e);
    return [];
  }
}

/**
 * Un enlace `drive.google.com/file/d/ID/view` NO carga en un `<img>`. Hay que
 * pasarlo siempre por el endpoint de miniatura (regla 8 de AGENTS.md), y todo
 * `<img>` remoto necesita además `referrerpolicy="no-referrer"`.
 *
 * `ancho` = los píxeles que Drive debe servir. Pedir siempre w1000 costaba ~679
 * KB de media por cartel (el peor del archivo, 2 MB) para pintarlo en una
 * tarjeta de 342px o, peor, en una miniatura de 56px.
 *
 * Devuelve '' si no hay URL o no se reconoce el id.
 */
export function extractDriveImage(url?: string, ancho = 1000): string {
  if (!url) return '';
  let fileId = '';
  if (url.includes('id=')) {
    fileId = url.split('id=')[1].split('&')[0];
  } else if (url.includes('/d/')) {
    fileId = url.split('/d/')[1].split('/')[0];
  }
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w${ancho}` : '';
}

/**
 * Fecha de la hoja a milisegundos, para ordenar. Acepta DD/MM/AAAA (lo que da la
 * columna Fecha) y AAAA-MM-DD. Sin fecha = 0, que la deja al principio del orden
 * ascendente.
 */
export function parseDateToNumber(dateStr?: string | number): number {
  if (!dateStr || dateStr === 'SIN FECHA') return 0;
  const slashBits = String(dateStr).split('/');
  if (slashBits.length === 3) {
    const d = parseInt(slashBits[0], 10);
    const m = parseInt(slashBits[1], 10) - 1;
    const y = parseInt(slashBits[2], 10);
    return new Date(y, m, d).getTime();
  }
  const dashBits = String(dateStr).split('-');
  if (dashBits.length === 3) {
    const y = parseInt(dashBits[0], 10);
    const m = parseInt(dashBits[1], 10) - 1;
    const d = parseInt(dashBits[2], 10);
    return new Date(y, m, d).getTime();
  }
  return 0;
}

/**
 * Escapa HTML para insertarlo con `innerHTML`. La guarda `String(s ?? '')` no es
 * decorativa: existía una segunda versión de esta función en info.astro sin
 * ella, que reventaba con cualquier valor que no fuese una cadena.
 */
export function escHtml(s?: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Una fila de la hoja de Flyers a objeto. Los índices son el contrato con la
 * hoja y están documentados en AGENTS.md; los intermedios que no aparecen (c[1],
 * c[12], c[14]–c[15], c[17]–c[20], c[22]–c[23]) existen en la hoja pero no se
 * usan.
 *
 * Devuelve `null` si la fila viene vacía. NO filtra por `idMel`: eso lo hace
 * `groupEvents()`.
 */
export function mapSheetRow(c: any[]) {
  if (!c) return null;
  return {
    evento: c[0] ? c[0].v : 'Evento sin título',
    urlDrive: c[2] ? c[2].v : '',
    fecha: c[3] ? c[3].f || c[3].v : 'SIN FECHA',
    lugar: c[4] ? c[4].v : '',   // sin dato es sin dato: rellenarlo con 'León' inventaba un local
    localidad: c[5] ? c[5].v : '',
    coordenadas: c[6] ? c[6].v : '',
    artistas: c[7] ? c[7].v : '',
    organiza: c[8] ? c[8].v : '',
    descripcion: c[9] ? c[9].v : '',
    idMel: c[10] ? c[10].v : '',
    carruselOrder: c[11] ? c[11].v : '1',
    disenador: c[13] ? c[13].v : 'Desconocido',
    existeOriginal: c[16] ? c[16].v : '',
    formato: c[21] ? c[21].v : 'Flyer',
    notasArchivo: c[24] ? c[24].v : '',
    ocr: c[25] ? c[25].v : '',
  };
}

/**
 * Lee la hoja de Flyers y devuelve los eventos ya agrupados y ordenados.
 *
 * Un evento puede tener varios carteles: son filas distintas de la hoja con el
 * mismo nombre y la misma fecha, y se juntan en un solo evento cuyo
 * `carruselItems` lleva las imágenes en su orden. Solo entran filas cuyo `idMel`
 * empiece por "MEL-".
 *
 * Sale en orden CRONOLÓGICO ASCENDENTE, que es lo que el servidor sirve siempre
 * (D-131: barajar es una acción del visitante, con el botón de ordenación, no el
 * estado de partida).
 */
export async function fetchEvents() {
  const rows = await fetchSheetRows();
  const rawItems = rows
    .map((row: any) => mapSheetRow(row.c))
    .filter((item): item is NonNullable<typeof item> =>
      !!item && !!item.idMel && item.idMel.startsWith('MEL-'));

  const groups: Record<string, any> = {};
  rawItems.forEach(item => {
    const key = `${item.evento.trim().toLowerCase()}_${String(item.fecha).trim().toLowerCase()}`;
    if (!groups[key]) {
      groups[key] = {
        evento: item.evento,
        fecha: item.fecha,
        carruselItems: [],
        lugar: item.lugar,
        localidad: item.localidad,
        coordenadas: item.coordenadas,
        artistas: item.artistas,
        organiza: item.organiza,
        descripcion: item.descripcion,
        disenador: item.disenador,
        existeOriginal: item.existeOriginal,
        formato: item.formato,
        notasArchivo: item.notasArchivo,
        ocr: item.ocr,
        idMel: item.idMel,
      };
    }
    groups[key].carruselItems.push({
      urlDrive: item.urlDrive,
      carruselOrder: parseInt(item.carruselOrder, 10) || 1,
      idMel: item.idMel,
    });
  });

  const events = Object.values(groups).map((g: any) => {
    g.carruselItems.sort((a: any, b: any) => a.carruselOrder - b.carruselOrder);
    return g;
  });
  events.sort((a: any, b: any) => parseDateToNumber(a.fecha) - parseDateToNumber(b.fecha));
  return events;
}

/**
 * DD/MM/AAAA a partir del AAAA-MM-DD tal cual llega de la hoja.
 *
 * Reordena y no normaliza, a propósito: la hoja rellena los ceros de forma
 * irregular y lo que se ve en pantalla ("9/10/2004" junto a "5/01/2005") sale de
 * ahí. Meter un `parseInt` por pieza cambiaría fechas ya validadas por el
 * propietario, así que se deja tal cual.
 */
export function formatFechaDMY(fecha?: string): string {
  let formatted = fecha || '';
  if (formatted && formatted.includes('-')) {
    const parts = formatted.split('-');
    if (parts.length === 3) formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return formatted;
}

/**
 * El año de una fecha de la hoja, o `null` si no se puede sacar.
 *
 * Había dos versiones de esto en index.astro, una en el frontmatter y otra en el
 * script de cliente, y NO eran iguales: la del servidor llamaba a `.split()`
 * directamente sobre el argumento —revienta si la hoja devuelve un número en vez
 * de una cadena— y no reconocía un año suelto ("2008"). Esta es la del cliente,
 * que es la defensiva y cubre todo lo que cubría la otra.
 */
export function getYear(dateStr?: unknown): number | null {
  if (dateStr === null || dateStr === undefined) return null;
  const str = String(dateStr).trim();
  if (!str || str === 'SIN FECHA') return null;

  // Un año ya suelto, como "2008" o 2008.
  const numericYear = parseInt(str, 10);
  if (!isNaN(numericYear) && str.length === 4) return numericYear;

  const slashBits = str.split('/');
  if (slashBits.length === 3) {
    const yr = parseInt(slashBits[2], 10);
    if (!isNaN(yr)) return yr;
  }
  const dashBits = str.split('-');
  if (dashBits.length === 3) {
    const yr = parseInt(dashBits[0], 10);
    if (!isNaN(yr)) return yr;
  }
  const match = str.match(/\b(19\d\d|20\d\d)\b/);
  if (match) return parseInt(match[1], 10);
  return null;
}

/**
 * NO hay aquí un generador de la tarjeta de galería, y merece explicación porque
 * es el sitio donde lo buscarías.
 *
 * La tarjeta existe en dos copias a la fuerza: FlyerCard.astro (servidor, las 32
 * primeras) y buildGalleryCard() en index.astro (cliente, todo lo demás). No se
 * pueden unificar por import: el script de la home lleva `define:vars`, que en
 * Astro implica script INLINE, y un script inline no pasa por Vite — el `import`
 * se queda como texto literal y revienta en el navegador. Comprobado, no
 * supuesto.
 *
 * Unificarlas de verdad exige cambiar cómo se declara ese script (a módulo, con
 * los datos en una isla JSON), y eso mueve la inicialización por
 * `astro:page-load` y el singleton `window._melState`, que es justo la
 * maquinaria delicada de la regla 1. Decisión aplazada al propietario; mientras,
 * las dos copias están verificadas idénticas y cada una apunta a la otra.
 */
