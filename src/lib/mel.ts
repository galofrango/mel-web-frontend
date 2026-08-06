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
 * pasarlo siempre por un endpoint de imagen (regla 8 de AGENTS.md), y todo
 * `<img>` remoto necesita además `referrerpolicy="no-referrer"`.
 *
 * El endpoint es `lh3.googleusercontent.com/d/ID=wANCHO` — el DESTINO al que
 * `drive.google.com/thumbnail` redirigía, pedido a pelo (D-258). El salto por
 * Drive era un 302 con `no-store`: ~0,24s por foto que se repagaban en cada
 * carga, porque un redirect no cacheable no se cachea jamás. La imagen final,
 * en cambio, responde `private, max-age=86400`: el navegador del visitante SÍ
 * la guarda 24h — pero solo si la URL que pide es directamente esta. Medido el
 * 06/08/2026: 0,48s vía Drive, 0,24s directo, y la revisita, de caché.
 * Los dos endpoints son igual de no-documentados; este es el que Drive usa por
 * debajo. Si algún día dejara de servir, el camino de vuelta es restaurar el
 * formato `drive.google.com/thumbnail?id=ID&sz=wANCHO` aquí y en el gemelo.
 *
 * `ancho` = los píxeles que Google debe servir. Pedir siempre w1000 costaba
 * ~679 KB de media por cartel (el peor del archivo, 2 MB) para pintarlo en una
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
  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w${ancho}` : '';
}

/**
 * Fecha de la hoja a milisegundos, para ordenar. Acepta DD/MM/AAAA (lo que da la
 * columna Fecha) y AAAA-MM-DD. Sin fecha = 0, que la deja al principio del orden
 * ascendente.
 */
/**
 * El `srcset` de un cartel: la MISMA imagen de Drive pedida a varios anchos,
 * para que el navegador elija según la pantalla de quien mira.
 *
 * Aquí sale barato porque Drive redimensiona al vuelo: no hay que generar ni
 * guardar nada, solo ofrecer las URLs. Un móvil normal se sigue bajando la
 * pequeña; un portátil Retina se baja la grande solo cuando le hace falta.
 * Nadie paga por la nitidez de otro.
 *
 * Medido el 04/08/2026 sobre cinco carteles: w700 pesa 120 KB de media, w1000
 * 161 KB, w1400 222 KB y w2000 421 KB. De ahí que la galería —32 de golpe— se
 * quede en 1400 como techo y la ficha —una sola imagen— llegue a 2000.
 *
 * Ojo: pedir más no siempre da más. Un original de 600px devuelve lo mismo a
 * w700 que a w2000, porque Drive no puede servir píxeles que no existen. Eso no
 * rompe nada —el navegador se queda con el que haya— pero explica por qué en el
 * archivo hay carteles a los que esto no les cambia la vida.
 */
export function srcSetDrive(url?: string, anchos: number[] = [700, 1000, 1400]): string {
  return anchos
    .map((a) => `${extractDriveImage(url, a)} ${a}w`)
    .filter((par) => !par.startsWith(' '))
    .join(', ');
}

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
    // AA — columna creada el 03/08/2026 para las notas del panel. Va al FINAL
    // a propósito: el mapa de columnas es por índice, así que meterla en medio
    // habría corrido todas las de detrás y roto la web entera.
    notasOcultas: c[26] ? c[26].v : '',
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
/**
 * Las imágenes de un evento que son PIEZAS que enseñar, separadas de las que
 * solo existen para otra cosa.
 *
 * `carruselOrder === 0` significa «está en el archivo pero no es una pieza».
 * Hoy lo usa una sola cosa: el fotograma que se extrae de un GIF animado, que
 * hace de portada ligera para que la galería no descargue 14 MB, pero que no es
 * una imagen más de la pieza — la pieza es el GIF, y es lo que se ve en la
 * ficha (D-182).
 *
 * Ojo con lo que NO hace falta cambiar: como el 0 ordena primero,
 * `carruselItems[0]` sigue siendo la portada en galería, lista, mapa y
 * metadatos sin tocar ni una línea de esas páginas.
 *
 * El respaldo no es paranoia: si un evento acabara con TODAS sus imágenes a 0
 * se quedaría sin carrusel y la ficha saldría vacía. En ese caso se enseñan
 * igual — un dato raro degrada a lo de siempre, no a una página rota.
 */
export function visiblesDelCarrusel<T extends { carruselOrder: number }>(items: T[]): T[] {
  const piezas = items.filter((i) => i.carruselOrder > 0);
  return piezas.length ? piezas : items;
}

/**
 * El primer y el último año que hay EN LOS DATOS.
 *
 * Existe porque el rango del deslizador de tiempo estaba escrito a mano como
 * 2004–2019 en tres sitios, y el archivo dejó de empezar en 2004 en cuanto se
 * subió un cartel de 2003 (`MEL-00085`): el servidor lo pintaba, el cliente lo
 * filtraba por estar «fuera de rango», y el cartel parpadeaba y desaparecía sin
 * un solo error por ninguna parte. D-183.
 *
 * Las fechas ilegibles («SIN FECHA», celdas vacías) NO cuentan: si valieran 0,
 * el deslizador abarcaría dos milenios y quedaría inservible. Y si no hay ni
 * una fecha legible se devuelve el rango histórico del archivo, que es un
 * respaldo honesto: un archivo sin fechas no tiene rango que calcular.
 */
export function rangoDeAnios(items: Array<{ fecha?: unknown }>): { min: number; max: number } {
  const anios = items.map((i) => getYear(i.fecha)).filter((a): a is number => a !== null);
  if (anios.length === 0) return { min: 2004, max: 2019 };
  return { min: Math.min(...anios), max: Math.max(...anios) };
}

/**
 * Si de esta celda de «Dirección / Coordenadas» se puede sacar un punto en el
 * mapa. Existe porque el panel avisaba de «Sin coordenadas» mirando solo si la
 * celda estaba VACÍA, y así `MEL-00085` —que tenía escrita una dirección que
 * nada sabía leer— pasó la auditoría en verde mientras el evento era invisible
 * en el mapa. Lo que importa no es que haya algo escrito: es que se pueda
 * colocar (D-186).
 *
 * Los tres formatos que valen son los que de verdad hay en el archivo: la URL
 * larga de Google Maps (que trae dirección Y coordenadas), los grados, y los
 * decimales. El enlace CORTO de Maps no vale: resolverlo pediría una petición
 * de red en cada visita, y el sitio se renderiza en cada carga.
 *
 * GEMELA DE `parseCoords()` en index.astro (regla 7): aquella vive en un script
 * inline que no puede importar de aquí. Si cambian los formatos aceptados, hay
 * que tocar las dos — y compararlas.
 */
export function tieneUbicacion(coordenadas?: unknown): boolean {
  const s = String(coordenadas ?? '').trim();
  if (!s) return false;
  if (/google\.[a-z.]+\/maps/i.test(s) && (/!3d-?[\d.]+!4d-?[\d.]+/.test(s) || /@-?\d+\.\d+,-?\d+\.\d+/.test(s))) return true;
  if (/\d+°\s*\d+'\s*[\d.]+"\s*[NS]/i.test(s)) return true;
  return /-?\d+\.\d+\s*,\s*-?\d+\.\d+/.test(s);
}

/** El primer año que este archivo puede tener. No es una fecha bonita: es una
 *  RED DE SEGURIDAD. La escena que documenta MEL empieza en 2003, así que un
 *  1899 o un año de dos cifras no es un dato antiguo, es una errata — y una
 *  errata así estira el deslizador de años hasta lo absurdo y deja la escala
 *  del archivo real aplastada en el último centímetro. */
const PRIMER_ANIO = 1960;

/** El formato que la web sabe leer: DD/MM/AAAA, con un año verosímil.
 *
 *  No es un capricho — de una fecha con otro formato no se saca ni el año (y sin
 *  año el cartel se cae de cualquier filtro) ni un orden fiable. Un `12-07-2013`
 *  se lee como ISO, o sea como el año 12, y se ordena antes que todo lo demás.
 *  El suelo de año caza justo ese caso aunque llegue bien formateado. */
export function fechaValida(fecha?: unknown): boolean {
  const texto = String(fecha ?? '').trim();
  const partes = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!partes) return false;
  return Number(partes[3]) >= PRIMER_ANIO;
}

export async function fetchEvents() {
  const rows = await fetchSheetRows();
  const rawItems = rows
    .map((row: any) => mapSheetRow(row.c))
    .filter((item): item is NonNullable<typeof item> =>
      !!item && !!item.idMel && item.idMel.startsWith('MEL-'))
    // Sin fecha válida NO SE PUBLICA (criterio del propietario, 04/08/2026).
    // Un cartel así ya era medio invisible —desaparecía en cuanto se tocaba el
    // deslizador de años— y estar a medias es peor que no estar: se ve en la
    // galería, se pierde al filtrar, y nadie sabe por qué. El panel lo avisa
    // como error de nivel 1, que es donde hay que ir a arreglarlo.
    .filter((item) => fechaValida(item.fecha));

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
        notasOcultas: item.notasOcultas,
        idMel: item.idMel,
      };
    }
    // `|| 1` no vale aquí: convertía el 0 en 1 y se comía el único valor que
    // significa algo distinto (ver `visiblesDelCarrusel`). Lo que hay que
    // sustituir es lo ilegible —celda vacía o texto—, no el cero.
    const orden = parseInt(item.carruselOrder, 10);
    groups[key].carruselItems.push({
      urlDrive: item.urlDrive,
      carruselOrder: Number.isFinite(orden) ? orden : 1,
      idMel: item.idMel,
    });
  });

  const events = Object.values(groups).map((g: any) => {
    g.carruselItems.sort((a: any, b: any) => a.carruselOrder - b.carruselOrder);
    g.carruselVisibles = visiblesDelCarrusel(g.carruselItems);
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
  // Antepone un cero al día de una sola cifra (petición del propietario,
  // D-216): sustituye la decisión anterior de dejar el formato tal cual
  // venía de la hoja. Solo el día — el mes se deja como llega.
  const piezas = formatted.split('/');
  if (piezas.length === 3 && piezas[0].length === 1) {
    piezas[0] = '0' + piezas[0];
    formatted = piezas.join('/');
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
