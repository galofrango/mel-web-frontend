import test from 'node:test';
import assert from 'node:assert/strict';
import { quitarComentarios, quitarComentariosJS } from '../plugins/quitar-comentarios.mjs';

const limpiar = async (f) => (await quitarComentarios(f)).codigo;

test('quita el comentario de plantilla y deja el resto', async () => {
  assert.equal(await limpiar('<div>a<!-- nota -->b</div>'), '<div>ab</div>');
});

test('cuenta bytes, no letras: con tildes delante no se corta mal', async () => {
  assert.equal(await limpiar('<p>León – café</p><!-- ñ --><p>fin</p>'), '<p>León – café</p><p>fin</p>');
});

test('en un script en línea quita comentarios pero no los // de URLs, cadenas ni regex', async () => {
  const js = `// cabecera
const u = 'https://x.es/a'; // cola
const r = /a\\/\\/b/; /* medio */ const h = '<!-- no es comentario -->';
`;
  const f = `<script is:inline>${js}</script>`;
  const out = await limpiar(f);
  assert.equal(out, `<script is:inline>const u = 'https://x.es/a'; \nconst r = /a\\/\\/b/;  const h = '<!-- no es comentario -->';\n</script>`);
});

test('define:vars también es script en línea', async () => {
  assert.equal(await limpiar('<script define:vars={{ a: 1 }}>\n// x\nconsole.log(a);</script>'),
    '<script define:vars={{ a: 1 }}>\nconsole.log(a);</script>');
});

test('un /* */ con salto dentro sigue separando sentencias (ASI)', () => {
  const out = quitarComentariosJS('let a = 1\n/* uno\ndos */let b = 2');
  assert.doesNotThrow(() => new Function(out));
  assert.equal(new Function(out + '; return a + b')(), 3);
});

test('dos símbolos pegados por un comentario no se funden', () => {
  assert.equal(quitarComentariosJS('return a/**/+b'), 'return a +b');
});

test('el <script> normal (lo procesa Vite) y el JSON no se tocan', async () => {
  const f = '<script>// queda\nlet x = 1;</script><script is:inline type="application/ld+json">{"a":"// queda"}</script>';
  assert.equal(await limpiar(f), f);
});

test('un script que no se puede analizar se deja intacto y avisa', async () => {
  const f = '<script is:inline>// x\nconst = ;</script>';
  const { codigo, avisos } = await quitarComentarios(f);
  assert.equal(codigo, f);
  assert.equal(avisos.length, 1);
});

test('los <!-- --> de una plantilla de texto se quitan; los de una cadena normal, no', () => {
  const js = "el.innerHTML = `<i>a</i><!-- x --><b>${v}</b>`;\nconst s = '<!-- queda -->';\n";
  const out = quitarComentariosJS(js);
  assert.equal(out, "el.innerHTML = `<i>a</i><b>${v}</b>`;\nconst s = '<!-- queda -->';\n");
});

test('un <!-- --> suelto en su línea dentro de la plantilla se lleva la línea entera', () => {
  const out = quitarComentariosJS('x = `\n  <a></a>\n  <!-- nota\n  larga -->\n  <b></b>\n`;');
  assert.equal(out, 'x = `\n  <a></a>\n  <b></b>\n`;');
});
