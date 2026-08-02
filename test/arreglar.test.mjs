import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planificarArreglo, argumentosSips, siguienteCalidad } from '../src/pages/api/panel/arreglar.ts';

const limpio = { tipo: 'jpeg', px: [2000, 1500], comp: 3, perfil: true, alfa: false, gris: false, bytes: 900_000 };

test('un fichero ya correcto no necesita ningún arreglo', () => {
  assert.deepEqual(planificarArreglo(limpio), { estado: 'sin-cambios' });
});

test('PNG: hace falta arreglo, y el perfil es sRGB (no es gris)', () => {
  const plan = planificarArreglo({ ...limpio, tipo: 'png', comp: null, gris: false });
  assert.equal(plan.estado, 'aplicar');
  assert.equal(plan.reduce, false, 'no está por encima de 3000px, no hay que reducir');
  assert.match(plan.perfil, /sRGB/);
});

test('CMYK: pasa a sRGB', () => {
  const plan = planificarArreglo({ ...limpio, comp: 4, perfil: true });
  assert.equal(plan.estado, 'aplicar');
  assert.match(plan.perfil, /sRGB/);
});

test('sin perfil: se incrusta', () => {
  const plan = planificarArreglo({ ...limpio, perfil: false });
  assert.equal(plan.estado, 'aplicar');
});

test('sin perfil pero GRIS: el perfil que se incrusta es el de gris, no sRGB', () => {
  const plan = planificarArreglo({ ...limpio, perfil: false, comp: 1, gris: true });
  assert.equal(plan.estado, 'aplicar');
  assert.match(plan.perfil, /Gray/, 'un cartel en blanco y negro se queda en blanco y negro');
});

test('por encima de 3000px: reduce; por debajo, no', () => {
  const grande = planificarArreglo({ ...limpio, px: [4961, 9674] });
  assert.equal(grande.estado, 'aplicar');
  assert.equal(grande.reduce, true);

  // Medido con sips real: --resampleHeightWidthMax AMPLÍA una imagen más
  // pequeña que el objetivo (confirmado con una prueba real, no es un
  // "por si acaso" — un cartel de 40x40 salió en 2400x2400). Así que el
  // resize SOLO puede ir cuando el fichero ya es más grande que el objetivo;
  // aplicarlo siempre ampliaría carteles pequeños, justo lo que el propio
  // archivo prohíbe (imagenes.md: "No ampliar un original pequeño").
  const pequeno = planificarArreglo({ ...limpio, tipo: 'png', comp: null, px: [40, 40] });
  assert.equal(pequeno.reduce, false, 'nunca hay que ampliar: --resampleHeightWidthMax ampliaría un cartel pequeño');
});

test('por encima de 2 MB: hace falta arreglo aunque todo lo demás esté bien', () => {
  const plan = planificarArreglo({ ...limpio, bytes: 3 * 1048576 });
  assert.equal(plan.estado, 'aplicar');
  assert.equal(plan.reduce, false);
});

test('GIF: rechazado siempre, sin excepción', () => {
  const plan = planificarArreglo({ ...limpio, tipo: 'gif', px: [500, 500] });
  assert.equal(plan.estado, 'rechazado');
  assert.match(plan.motivo, /animad/i);
});

test('tipo no reconocido: rechazado', () => {
  const plan = planificarArreglo({ tipo: 'desconocido', px: null, comp: null, perfil: false, alfa: false, gris: false, bytes: 500 });
  assert.equal(plan.estado, 'rechazado');
});

test('una sola pasada: PNG + grande + sin perfil se juntan en UN plan, no en tres', () => {
  const plan = planificarArreglo({
    tipo: 'png', comp: null, perfil: false, alfa: true, gris: false,
    px: [4961, 9674], bytes: 3 * 1048576,
  });
  assert.equal(plan.estado, 'aplicar');
  assert.equal(plan.reduce, true, 'la reducción va en la misma pasada que la conversión');
  assert.match(plan.perfil, /sRGB/);
});

test('argumentosSips: combina reducir + formato + calidad + perfil en una lista, en ese orden', () => {
  const plan = { estado: 'aplicar', reduce: true, perfil: '/ruta/perfil.icc' };
  const args = argumentosSips(plan, 85, '/tmp/entrada', '/tmp/salida.jpg');
  assert.deepEqual(args, [
    '--resampleHeightWidthMax', '2400',
    '-s', 'format', 'jpeg', '-s', 'formatOptions', '85',
    '--matchTo', '/ruta/perfil.icc',
    '/tmp/entrada', '--out', '/tmp/salida.jpg',
  ]);
});

test('argumentosSips: sin reducir, no aparece --resampleHeightWidthMax', () => {
  const plan = { estado: 'aplicar', reduce: false, perfil: '/ruta/perfil.icc' };
  const args = argumentosSips(plan, 85, '/tmp/entrada', '/tmp/salida.jpg');
  assert.ok(!args.includes('--resampleHeightWidthMax'));
});

test('argumentosSips: la calidad siempre va explícita, nunca la de sips por defecto', () => {
  const plan = { estado: 'aplicar', reduce: false, perfil: '/ruta/perfil.icc' };
  const args = argumentosSips(plan, 47, '/tmp/e', '/tmp/s');
  assert.ok(args.includes('formatOptions'));
  assert.equal(args[args.indexOf('formatOptions') + 1], '47');
});

test('siguienteCalidad: baja de 15 en 15 y para en el suelo, nunca null antes de tiempo', () => {
  assert.equal(siguienteCalidad(85), 70);
  assert.equal(siguienteCalidad(70), 55);
  assert.equal(siguienteCalidad(55), 40);
  assert.equal(siguienteCalidad(40), null, 'bajar más (25) destruiría el cartel para perseguir un peso');
  assert.equal(siguienteCalidad(30), null);
});
