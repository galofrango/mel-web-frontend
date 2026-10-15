import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enlazar } from '../src/lib/mel.ts';

const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map(m => m[1]);
const textos = (html) => [...html.matchAll(/inline-block text-inherit">([^<]*)</g)].map(m => m[1]);

test('[texto](mailto:…) enlaza con ese texto, sin abrir pestaña nueva', () => {
  const h = enlazar('Si quieres, [Escríbenos](mailto:a@b.es)');
  assert.deepEqual(hrefs(h), ['mailto:a@b.es']);
  assert.deepEqual(textos(h), ['Escríbenos']);
  assert.ok(!h.includes('target='));
});

test('[texto](https://…) abre fuera; una ruta del sitio, no', () => {
  assert.match(enlazar('[Web](https://x.com/a?b=1&c=2)'), /target="_blank" rel="noopener"/);
  assert.deepEqual(hrefs(enlazar('[Web](https://x.com/a?b=1&c=2)')), ['https://x.com/a?b=1&amp;c=2']);
  assert.ok(!enlazar('[Mapa](/?view=mapa)').includes('target='));
});

test('una dirección suelta se enlaza sola y no se come el punto final', () => {
  const h = enlazar('Mira https://mel.org/info. Y listo');
  assert.deepEqual(hrefs(h), ['https://mel.org/info']);
  assert.ok(h.endsWith('</a>. Y listo'));
});

test('correo y @usuario siguen enlazándose como antes', () => {
  assert.deepEqual(hrefs(enlazar('a: x.y@z.es')), ['mailto:x.y@z.es']);
  assert.deepEqual(hrefs(enlazar('en @mel.archivo hay más')), ['https://instagram.com/mel.archivo']);
  assert.deepEqual(hrefs(enlazar('@mel.archivo')), ['https://instagram.com/mel.archivo']);
});

test('un correo dentro de [texto](mailto:…) no se enlaza dos veces', () => {
  assert.equal(hrefs(enlazar('[a@b.es](mailto:a@b.es)')).length, 1);
});

test('nada de javascript: ni HTML suelto', () => {
  assert.equal(hrefs(enlazar('[clic](javascript:alert(1))')).length, 0);
  const h = enlazar('<script>alert("x")</script> & más');
  assert.ok(!h.includes('<script'));
  assert.match(h, /&lt;script&gt;.*&amp; más/);
});

test('texto sin enlaces sale igual, escapado', () => {
  assert.equal(enlazar('Sin nada. Ni @ ni correo'), 'Sin nada. Ni @ ni correo');
  assert.equal(enlazar(undefined), '');
});
