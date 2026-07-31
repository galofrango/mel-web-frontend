import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hayQueAbortar } from '../scripts/lib/validar-archivo.mjs';

test('hallazgo 1: modo incremental, hoja caída, disco con entradas', (t) => {
  const resultado = hayQueAbortar({
    imagenesEnHoja: 0,
    entradasEnDisco: 84,
    soloEstos: []
  });
  assert.equal(resultado, true, 'debe abortar');
});

test('hallazgo 1: modo --todo, hoja caída, disco con entradas', (t) => {
  // Este es el caso que el arreglo anterior no capturaba.
  const resultado = hayQueAbortar({
    imagenesEnHoja: 0,
    entradasEnDisco: 84,
    soloEstos: []
  });
  assert.equal(resultado, true, 'debe abortar incluso en --todo');
});

test('hallazgo 1: modo por defecto, hoja vacía legítima, disco vacío', (t) => {
  const resultado = hayQueAbortar({
    imagenesEnHoja: 0,
    entradasEnDisco: 0,
    soloEstos: []
  });
  assert.equal(resultado, false, 'debe seguir adelante sin abortar');
});

test('hallazgo 1: modo ids sueltos, hoja caída, disco con entradas', (t) => {
  // El modo soloEstos ya está protegido.
  const resultado = hayQueAbortar({
    imagenesEnHoja: 0,
    entradasEnDisco: 84,
    soloEstos: ['MEL-00008', 'MEL-00012']
  });
  assert.equal(resultado, false, 'debe dejar pasar (modo ids sueltos)');
});

test('hallazgo 1: hoja normal, disco vacío', (t) => {
  const resultado = hayQueAbortar({
    imagenesEnHoja: 84,
    entradasEnDisco: 0,
    soloEstos: []
  });
  assert.equal(resultado, false, 'debe seguir adelante');
});
