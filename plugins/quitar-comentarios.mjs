// Quita los comentarios del HTML que recibe el visitante (D-280), sin tocar
// `src/`. Solo actúa en `astro build`; `astro dev` no lo ejecuta.
//
// Dos sitios donde llegan comentarios al navegador y ninguna otra etapa los
// quita:
//   1. Los `<!-- -->` de la plantilla: Astro los emite tal cual.
//   2. Los comentarios JS de los <script> EN LÍNEA (`define:vars`, `is:inline`),
//      que no pasan por Vite y por tanto no se minifican.
// Los <script> normales, el CSS y los /_astro/* ya salen minificados.
//
// Nada de expresiones regulares: `//` aparece en URLs, cadenas y regex. El
// marcado lo delimita el compilador de Astro y el JS lo delimita acorn.
import { readFile } from 'node:fs/promises';
import { parse } from '@astrojs/compiler-rs';
import * as acorn from 'acorn';

// Un <script> con `type` que no sea JavaScript (JSON-LD, importmap…) no se toca.
const TIPOS_JS = new Set(['', 'module', 'text/javascript', 'application/javascript']);

function atributo(el, nombre) {
  return el.openingElement.attributes.find((a) => a.name?.name === nombre);
}

function esScriptEnLinea(el) {
  if (el.openingElement?.name?.name !== 'script' || !el.closingElement) return false;
  if (!atributo(el, 'is:inline') && !atributo(el, 'define:vars')) return false;
  return TIPOS_JS.has(atributo(el, 'type')?.value?.value ?? '');
}

// Recorre el AST de acorn y llama a `f` con cada nodo.
function recorrerAST(nodo, f) {
  if (!nodo || typeof nodo.type !== 'string') return;
  f(nodo);
  for (const k of Object.keys(nodo)) {
    const v = nodo[k];
    if (Array.isArray(v)) v.forEach((x) => recorrerAST(x, f));
    else if (v && typeof v === 'object') recorrerAST(v, f);
  }
}

/**
 * Comentarios de un fragmento JS: [{ ini, fin, salto, html }] en índices de
 * cadena. `html` marca los `<!-- -->` que viven DENTRO de una plantilla de
 * texto (p. ej. `card.innerHTML = …`): no son comentarios de JS, pero al ejecutarse
 * crean nodos de comentario en el DOM que el visitante ve al inspeccionar. Se
 * buscan solo en el texto de cada trozo de plantilla (`TemplateElement`), donde
 * acorn garantiza que no hay código ni cadenas de otro tipo.
 */
function comentariosJS(js) {
  for (const sourceType of ['module', 'script']) {
    const lista = [];
    try {
      const ast = acorn.parse(js, {
        ecmaVersion: 'latest',
        sourceType,
        allowReturnOutsideFunction: true,
        onComment: (bloque, texto, ini, fin) => lista.push({ ini, fin, salto: bloque && texto.includes('\n') }),
      });
      recorrerAST(ast, (n) => {
        if (n.type !== 'TemplateElement') return;
        for (let i = js.indexOf('<!--', n.start); i >= 0 && i < n.end; ) {
          const fin = js.indexOf('-->', i + 4);
          if (fin < 0 || fin + 3 > n.end) break; // el comentario cruza un `${}`: se deja
          lista.push({ ini: i, fin: fin + 3, salto: false, html: true });
          i = js.indexOf('<!--', fin + 3);
        }
      });
      return lista.sort((x, y) => x.ini - y.ini);
    } catch {}
  }
  return null;
}

/** Devuelve el JS sin comentarios, o null si no se pudo analizar. */
export function quitarComentariosJS(js) {
  const lista = comentariosJS(js);
  if (!lista) return null;
  let salida = '';
  let cursor = 0;
  for (const { ini, fin, salto, html } of lista) {
    const inicioLinea = js.lastIndexOf('\n', ini - 1) + 1;
    let finLinea = js.indexOf('\n', fin);
    if (finLinea < 0) finLinea = js.length;
    if (/^\s*$/.test(js.slice(inicioLinea, ini)) && /^\s*$/.test(js.slice(fin, finLinea))) {
      // Comentario solo en su línea: se va la línea entera (con su salto).
      if (inicioLinea >= cursor) {
        salida += js.slice(cursor, inicioLinea);
        cursor = Math.min(finLinea + 1, js.length);
        continue;
      }
    }
    salida += js.slice(cursor, ini);
    cursor = fin;
    if (html) continue; // en una plantilla no se inserta nada que no hubiera
    // Un `/* … */` con salto de línea DENTRO cuenta como salto para ASI
    // (`a /*\n*/ b` son dos sentencias); y entre dos símbolos pegados hace falta
    // un espacio (`a/**/b`).
    if (salto) salida += '\n';
    else if (/\S$/.test(salida) && /^\S/.test(js.slice(fin))) salida += ' ';
  }
  return salida + js.slice(cursor);
}

/** Fuente `.astro` sin comentarios de plantilla ni de scripts en línea. */
export async function quitarComentarios(fuente) {
  const buf = Buffer.from(fuente); // el compilador da posiciones en BYTES
  const { ast } = await parse(fuente);
  const cortes = []; // [ini, fin, reemplazo] en bytes
  const avisos = [];
  (function recorrer(nodo) {
    if (!nodo || typeof nodo !== 'object') return;
    if (nodo.type === 'AstroComment') cortes.push([nodo.start, nodo.end, '']);
    else if (nodo.type === 'JSXElement' && esScriptEnLinea(nodo)) {
      const ini = nodo.openingElement.end;
      const fin = nodo.closingElement.start;
      const limpio = quitarComentariosJS(buf.subarray(ini, fin).toString());
      if (limpio === null) avisos.push(`script en línea sin analizar (byte ${ini}); se deja como está`);
      else cortes.push([ini, fin, limpio]);
      return;
    }
    for (const k of Object.keys(nodo)) {
      const v = nodo[k];
      if (Array.isArray(v)) v.forEach(recorrer);
      else if (v && typeof v === 'object') recorrer(v);
    }
  })(ast);
  cortes.sort((a, b) => a[0] - b[0]);
  const trozos = [];
  let cursor = 0;
  for (const [ini, fin, reemplazo] of cortes) {
    trozos.push(buf.subarray(cursor, ini), Buffer.from(reemplazo));
    cursor = fin;
  }
  trozos.push(buf.subarray(cursor));
  return { codigo: Buffer.concat(trozos).toString(), avisos };
}

// Va en `load` y no en `transform`: el `transform` de Astro también es `pre` y
// corre antes que cualquier plugin de usuario, así que ahí ya llegaría el
// componente compilado. `load` entrega a Astro el fuente ya limpio.
export default function quitarComentariosPlugin() {
  return {
    name: 'mel:quitar-comentarios',
    apply: 'build',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith('.astro')) return null; // los `?astro&type=…` no son fuente
      const { codigo, avisos } = await quitarComentarios(await readFile(id, 'utf8'));
      for (const a of avisos) this.warn(`${id}: ${a}`);
      return { code: codigo, map: null };
    },
  };
}
