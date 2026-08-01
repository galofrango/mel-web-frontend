/**
 * Las reglas del archivo. Puro: entra lo que ya está en memoria, salen los
 * avisos. Sin red, sin disco, sin DOM — por eso se puede probar entero.
 *
 * El ORDEN de GRUPOS es un orden de TRABAJO, no un ranking por número: arreglar
 * los de arriba resuelve los de abajo. Medido sobre el archivo el 31/07/2026:
 * convertir los 33 PNG, el CMYK y los 6 grandes resuelve de paso 25 de los 34
 * "sin perfil" y 17 de los 25 "+2 MB". Reordenarlo por cantidad hace que el panel
 * proponga recomprimir 17 imágenes que iban a bajar solas.
 */
import { ladoMayor, type DatosImagen } from './imagen.ts';

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
   'Si de verdad no se sabe, deja la celda vacía en vez de escribir «Desconocido»: el sitio ya sabe convertir un hueco en la invitación «¿Nos ayudas?».', 'id',
   (f, t) => estaVacio(f.lugar)],
  ['sin-coordenadas', 1, 'Sin coordenadas', 'El evento no aparece en el mapa', 'Abrir en la hoja', false,
   '<b>El problema es que sin el enlace de Google Maps el evento no sale en el mapa.</b><br><br>La forma de corregirlo es buscar el local en Google Maps, copiar la URL larga del navegador y pegarla en la columna G de la [hoja→G1]. El sitio saca el punto exacto del propio enlace.',
   'Las tres filas ponen «Desconocido» en esa celda, y eso es peor que dejarla vacía: el respaldo por localidad solo entra si la celda está vacía, así que «Desconocido» apaga el único plan B que había.', 'id',
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
   '<b>El problema es que el archivo no sabe quién pinchó en ese evento</b>, y en un archivo la laguna es información, no un error.<br><br>La forma de corregirlo es escribir los nombres en la columna H de la [hoja→H1]. Suelen estar impresos en el propio cartel.',
   null, 'id',
   (f, t) => estaVacio(f.artistas)],
  ['png', 2, 'Archivo PNG', 'Hasta 10× de peso en miniatura, y la galería carga 32 de golpe', 'Convertir a JPG', true,
   '<b>El problema es el peso</b>: en tamaño de miniatura un PNG puede pesar diez veces más que el mismo cartel en JPEG, y la galería carga 32 de golpe.<br><br>La forma de corregirlo es convertir a JPEG calidad 85 <b>e incrustar sRGB en la misma pasada</b> — por separado, la conversión deja el fichero etiquetado como Adobe RGB y arreglas el peso creando un problema de color.',
   '20 de estos 33 llevan transparencia y JPEG no la admite, así que hay que decidir una vez sobre qué fondo se aplanan.', 'bytes',
   (f, t) => t.tipo === 'png'],
  ['cmyk', 2, 'En CMYK', 'Espacio de imprenta; el soporte en navegador es irregular', 'Pasar a sRGB', true,
   '<b>El problema es que CMYK es un espacio de imprenta, no de pantalla</b>, y los navegadores lo tratan de forma irregular.<br><br>La forma de corregirlo es pasarlo a sRGB.',
   'Medido en este fichero: de 798 KB a 225 KB, y el color queda en el espacio que el navegador espera.', 'bytes',
   (f, t) => t.comp === 4],
  ['enorme', 2, 'Por encima de 3000 px', 'Nada del sitio lo muestra a ese tamaño', 'Reducir a 2400 px', true,
   '<b>El problema es que nada del sitio muestra un cartel a ese tamaño</b>, así que esos píxeles de más solo suman peso.<br><br>La forma de corregirlo es reducir a 2400 px de lado mayor, que es el techo que fija vuestro <i>imagenes.md</i>.',
   'Medido en el más grande del archivo: de 4961×9674 a 1230×2400, y de 2,1 MB a 263 KB.', 'px-desc',
   (f, t) => ladoMayor(t) > 3000],
  ['sin-perfil', 2, 'Sin perfil de color', 'El navegador lo pinta como sRGB; si no lo era, sale apagado', 'Incrustar sRGB', true,
   '<b>El problema es que el fichero no dice en qué espacio de color están sus números</b>, así que el navegador asume sRGB. Si no lo era, el cartel sale apagado — y como avisa vuestro <i>imagenes.md</i>, el peligro no es tener Adobe RGB, es no tener nada.<br><br>La forma de corregirlo es convertir a sRGB e incrustar el perfil. No cambia lo que se ve si ya era sRGB: solo lo hace explícito.',
   'Tres de estos son en escala de grises (MEL-00002, MEL-00004 y MEL-00007) y la conversión los pasaría a RGB. Decidid si se excluyen.', 'bytes',
   (f, t) => t.tipo !== 'desconocido' && !t.perfil],
  ['pesado', 2, 'Por encima de 2 MB', 'El original tarda en llegar, y Drive no lo deja cachear', 'Recomprimir', true,
   '<b>El problema es que ese peso se paga en cada visita</b>: Drive responde <i>no-store</i>, así que no hay caché posible y el original viaja entero cada vez.<br><br>La forma de corregirlo es bajar la calidad hasta entrar en 2 MB.',
   'Este aviso va el último: casi todos estos son los PNG y el CMYK de las otras secciones, y al convertirlos bajan solos. Recomprimir dos veces la misma imagen pierde calidad para nada.', 'bytes',
   (f, t) => t.bytes > 2 * 1048576],
  ['pequeno', 2, 'Baja resolución', 'Por debajo de 1200 px: no se estira, se ve pequeño', null, false,
   '<b>El problema es que el original no da más de sí.</b> El sitio nunca amplía una imagen por encima de su tamaño real, así que no se ve borrosa: se ve pequeña.<br><br>La única forma de corregirlo es conseguir un escaneo mejor de la pieza.',
   'Ampliar con IA está descartado: reinventa las letras del cartel, y en un archivo de diseño gráfico eso es falsificar la pieza.', 'px-asc',
   (f, t) => ladoMayor(t) > 0 && ladoMayor(t) < 1200],
  ['gif', 2, 'GIF animado', 'Drive no lo redimensiona: se descarga entero', null, false,
   '<b>El problema es que son 177 fotogramas y 14,4 MB que Drive no redimensiona</b>: el visitante se los descarga enteros, pida el tamaño que pida.<br><br>La decisión es vuestra: dejarlo como está, o guardar el GIF aparte y elegir un fotograma como cara de la pieza en el archivo.',
   'No lleva botón a propósito: convertirlo a JPEG destruiría la animación, que es parte de la pieza.', 'bytes',
   (f, t) => t.tipo === 'gif'],
];

const VACIO: DatosImagen = { tipo: 'desconocido', px: null, comp: null, perfil: false, alfa: false, bytes: 0 };

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
      // La marca en notasArchivo silencia solo esta regla, en esta fila.
      if (estaSilenciado(fila.notasArchivo, clave)) continue;

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
      });
    }

    if (items.length === 0) continue;

    items.sort(ORDENA[criterio]);
    grupos.push({ clave, nivel, titulo, consecuencia, accion, auto, descripcion, aviso, items });
  }

  return grupos;
}
