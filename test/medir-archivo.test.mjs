import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial } from '../src/lib/archivo.ts';

test('estadoInicial: modo incremental + hoja caída + disco con entradas', (t) => {
  const resultado = estadoInicial({
    rehacerTodo: false,
    textoEnDisco: JSON.stringify({ id1: { tipo: 'jpeg' }, id2: { tipo: 'png' } }),
    imagenesEnHoja: 0,
    soloEstos: []
  });
  assert.equal(resultado.abortar, true, 'debe abortar');
  assert.equal(resultado.entradasEnDisco, 2);
  assert.deepEqual(resultado.cache, { id1: { tipo: 'jpeg' }, id2: { tipo: 'png' } });
});

test('estadoInicial: modo --todo + hoja caída + disco con entradas (CRÍTICO)', (t) => {
  // Este es el caso que el arreglo anterior no capturaba.
  // En modo --todo, cache está vacío PERO entradasEnDisco se cuenta de todos modos.
  const disco = JSON.stringify(Object.fromEntries(Array(84).fill(0).map((_, i) => [`id${i}`, { tipo: 'jpeg' }])));
  const resultado = estadoInicial({
    rehacerTodo: true,
    textoEnDisco: disco,
    imagenesEnHoja: 0,
    soloEstos: []
  });
  assert.equal(resultado.abortar, true, 'debe abortar incluso en --todo');
  assert.equal(resultado.entradasEnDisco, 84, 'debe contar todas las entradas en disco');
  assert.deepEqual(resultado.cache, {}, 'cache debe estar vacío en modo --todo');
});

test('estadoInicial: modo por defecto + hoja vacía legítima + disco vacío', (t) => {
  const resultado = estadoInicial({
    rehacerTodo: false,
    textoEnDisco: null,
    imagenesEnHoja: 0,
    soloEstos: []
  });
  assert.equal(resultado.abortar, false, 'debe seguir adelante sin abortar');
  assert.equal(resultado.entradasEnDisco, 0);
  assert.deepEqual(resultado.cache, {});
});

test('estadoInicial: modo ids sueltos + hoja caída + disco con entradas', (t) => {
  // El modo soloEstos ya está protegido.
  const resultado = estadoInicial({
    rehacerTodo: false,
    textoEnDisco: JSON.stringify({ id1: { tipo: 'jpeg' } }),
    imagenesEnHoja: 0,
    soloEstos: ['MEL-00008', 'MEL-00012']
  });
  assert.equal(resultado.abortar, false, 'debe dejar pasar (modo ids sueltos)');
  assert.equal(resultado.entradasEnDisco, 1);
});

test('estadoInicial: hoja normal + disco vacío', (t) => {
  const resultado = estadoInicial({
    rehacerTodo: false,
    textoEnDisco: null,
    imagenesEnHoja: 84,
    soloEstos: []
  });
  assert.equal(resultado.abortar, false, 'debe seguir adelante');
  assert.equal(resultado.entradasEnDisco, 0);
});

test('estadoInicial: JSON corrupto en disco', (t) => {
  const resultado = estadoInicial({
    rehacerTodo: false,
    textoEnDisco: 'esto no es JSON válido {]',
    imagenesEnHoja: 0,
    soloEstos: []
  });
  assert.equal(resultado.abortar, false, 'no debe abortar: JSON corrupto se trata como "no hay disco"');
  assert.equal(resultado.entradasEnDisco, 0);
  assert.deepEqual(resultado.cache, {});
});
