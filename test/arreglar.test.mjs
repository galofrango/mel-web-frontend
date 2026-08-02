import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planificarArreglo, argumentosSips, siguienteCalidad } from '../src/pages/api/panel/arreglar.ts';

const limpio = { tipo: 'jpeg', px: [2000, 1500], comp: 3, noSrgb: false, alfa: false, gris: false, bytes: 900_000 };

// Un botón hace SOLO lo que dice. `planificarArreglo` ya no adivina del estado
// medido lo que le convendría al fichero: recibe las acciones que se han pedido
// (la del botón pulsado, más las que se marquen en el modal) y no hace ni una
// más. Lo contrario —lo que hacía antes— convertía a JPEG un PNG al que solo se
// le había pedido reducir, y le aplanaba la transparencia por el camino.
const ACCIONES = ['png', 'no-srgb', 'enorme', 'pesado'];

test('una acción que no aplica a este fichero no hace nada', () => {
  assert.deepEqual(planificarArreglo(limpio, ['enorme']), { estado: 'sin-cambios' });
  assert.deepEqual(planificarArreglo(limpio, []), { estado: 'sin-cambios' });
});

test('PNG + solo "enorme": REDUCE Y SIGUE SIENDO PNG', () => {
  // El caso que da nombre a todo esto. Muchos PNG se quedan PNG porque llevan
  // transparencia, y eso no impide optimizarlos por otro lado.
  const plan = planificarArreglo({ ...limpio, tipo: 'png', comp: null, alfa: true, px: [4961, 9674] }, ['enorme']);
  assert.equal(plan.estado, 'aplicar');
  assert.equal(plan.salida, 'png', 'NO se convierte: no se ha pedido');
  assert.equal(plan.reduce, true);
  assert.equal(plan.recomprime, false);
});

test('PNG + "png": eso sí convierte, porque es lo que dice el botón', () => {
  const plan = planificarArreglo({ ...limpio, tipo: 'png', comp: null, alfa: true }, ['png']);
  assert.equal(plan.estado, 'aplicar');
  assert.equal(plan.salida, 'jpeg');
  assert.equal(plan.reduce, false, 'no se ha pedido reducir, y no pasa de 3000 px');
});

test('varias acciones a la vez: una sola pasada, cada una haciendo lo suyo', () => {
  const plan = planificarArreglo(
    { ...limpio, tipo: 'png', comp: null, alfa: true, px: [4961, 9674], bytes: 3 * 1048576 },
    ['png', 'enorme', 'pesado']);
  assert.equal(plan.salida, 'jpeg');
  assert.equal(plan.reduce, true);
  assert.equal(plan.recomprime, true);
});

test('un JPEG no vuelve a PNG aunque no se pida convertir', () => {
  const plan = planificarArreglo({ ...limpio, noSrgb: true }, ['no-srgb']);
  assert.equal(plan.salida, 'jpeg', 'la salida solo cambia hacia JPEG, nunca al revés');
  assert.equal(plan.reduce, false);
  assert.equal(plan.recomprime, false);
});

test('CMYK entra por la acción "no-srgb": es el mismo defecto', () => {
  // La regla "cmyk" se fundió en "no-srgb" (criterio del propietario): el
  // fichero no está en sRGB, y el arreglo es el mismo botón.
  const plan = planificarArreglo({ ...limpio, comp: 4 }, ['no-srgb']);
  assert.equal(plan.estado, 'aplicar');
  assert.equal(plan.salida, 'jpeg');
  assert.match(plan.perfil, /sRGB/);
});

test('PNG + solo "pesado": se rechaza en vez de convertirlo a escondidas', () => {
  // Un PNG es sin pérdida: no hay calidad que bajar. Antes esto se "arreglaba"
  // convirtiéndolo a JPEG sin decirlo. Ahora se dice.
  const plan = planificarArreglo({ ...limpio, tipo: 'png', comp: null, alfa: true, bytes: 3 * 1048576 }, ['pesado']);
  assert.equal(plan.estado, 'rechazado');
  assert.match(plan.motivo, /PNG/);
});

test('PNG + "pesado" + "enorme": adelgaza reduciendo, sin tocar el formato', () => {
  // Medido con sips: el mismo PNG de 2268px y 1112 KB baja a 1200px y 495 KB.
  const plan = planificarArreglo(
    { ...limpio, tipo: 'png', comp: null, alfa: true, px: [4961, 9674], bytes: 3 * 1048576 },
    ['pesado', 'enorme']);
  assert.equal(plan.estado, 'aplicar');
  assert.equal(plan.salida, 'png');
  assert.equal(plan.reduce, true);
  assert.equal(plan.recomprime, false, 'no hay escalera de calidad en PNG');
});

test('GRIS: el perfil que se aplica es el de gris, no sRGB', () => {
  const plan = planificarArreglo({ ...limpio, comp: 1, gris: true, bytes: 3 * 1048576 }, ['pesado']);
  assert.equal(plan.estado, 'aplicar');
  assert.match(plan.perfil, /Gray/, 'un cartel en blanco y negro se queda en blanco y negro');
});

test('GIF: rechazado siempre, sin excepción', () => {
  for (const a of ACCIONES) {
    const plan = planificarArreglo({ ...limpio, tipo: 'gif', px: [500, 500] }, [a]);
    assert.equal(plan.estado, 'rechazado', `con la acción "${a}"`);
  }
});

test('tipo no reconocido: rechazado', () => {
  const plan = planificarArreglo({ tipo: 'desconocido', px: null, comp: null, noSrgb: false, alfa: false, gris: false, bytes: 500 }, ['png']);
  assert.equal(plan.estado, 'rechazado');
});

test('nunca se amplía: --resampleHeightWidthMax agrandaría un cartel pequeño', () => {
  // Medido con sips real: un cartel de 40x40 salió en 2400x2400. Por eso
  // "enorme" no aplica —y por tanto no reduce— si el fichero ya es pequeño.
  const plan = planificarArreglo({ ...limpio, tipo: 'png', comp: null, px: [40, 40] }, ['enorme', 'png']);
  assert.equal(plan.reduce, false);
  assert.equal(plan.salida, 'jpeg', 'lo que sí se pidió sigue haciéndose');
});

test('argumentosSips: combina reducir + formato + calidad + perfil en una lista, en ese orden', () => {
  const plan = { estado: 'aplicar', salida: 'jpeg', reduce: true, recomprime: false, perfil: '/ruta/perfil.icc' };
  const args = argumentosSips(plan, 85, '/tmp/entrada', '/tmp/salida.jpg');
  assert.deepEqual(args, [
    '--resampleHeightWidthMax', '2400',
    '-s', 'format', 'jpeg', '-s', 'formatOptions', '85',
    '--matchTo', '/ruta/perfil.icc',
    '/tmp/entrada', '--out', '/tmp/salida.jpg',
  ]);
});

test('argumentosSips: sin reducir, no aparece --resampleHeightWidthMax', () => {
  const plan = { estado: 'aplicar', salida: 'jpeg', reduce: false, recomprime: false, perfil: '/ruta/perfil.icc' };
  const args = argumentosSips(plan, 85, '/tmp/entrada', '/tmp/salida.jpg');
  assert.ok(!args.includes('--resampleHeightWidthMax'));
});

test('argumentosSips: la calidad siempre va explícita, nunca la de sips por defecto', () => {
  const plan = { estado: 'aplicar', salida: 'jpeg', reduce: false, recomprime: false, perfil: '/ruta/perfil.icc' };
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

test('argumentosSips: si la salida sigue siendo PNG, NO se le cambia el formato', () => {
  // Sin `-s format`, sips conserva el PNG — y con él la transparencia
  // (comprobado sobre MEL-00008: alfa intacto al reducir y al pasar el color).
  const plan = { estado: 'aplicar', salida: 'png', reduce: true, recomprime: false, perfil: '/ruta/perfil.icc' };
  const args = argumentosSips(plan, 85, '/tmp/e', '/tmp/s.png');
  assert.ok(!args.includes('format'), 'nada de -s format jpeg');
  assert.ok(!args.includes('formatOptions'), 'un PNG no tiene calidad que bajar');
  assert.deepEqual(args, ['--resampleHeightWidthMax', '2400', '--matchTo', '/ruta/perfil.icc', '/tmp/e', '--out', '/tmp/s.png']);
});

test('argumentosSips: --matchTo va SIEMPRE, se pida o no tocar el color', () => {
  // No es un extra que el botón no haya prometido: es lo único que evita
  // romperlo. `sips` a secas le quita al fichero la etiqueta de color sin
  // convertir los píxeles, y un Adobe RGB sin etiqueta se pinta apagado
  // (medido: 13 puntos de 255 en las zonas saturadas). Con --matchTo en la
  // misma orden sale convertido de verdad. Ver D-174.
  for (const salida of ['jpeg', 'png']) {
    for (const reduce of [true, false]) {
      const args = argumentosSips({ estado: 'aplicar', salida, reduce, recomprime: false, perfil: '/p.icc' }, 85, '/e', '/s');
      assert.ok(args.includes('--matchTo'), `falta --matchTo en salida=${salida} reduce=${reduce}`);
    }
  }
});
