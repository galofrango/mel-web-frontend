import test from 'node:test';
import assert from 'node:assert/strict';
import { componerNota } from '../src/pages/api/panel/ocultar.ts';

test('sin notas previas, la nota es solo la marca y el motivo', () => {
  assert.equal(componerNota('', 'png', 'Es un vector con transparencia'),
    '#oculto:png Es un vector con transparencia');
});

test('respeta las líneas de las otras reglas', () => {
  // Un mismo cartel puede tener ocultas dos reglas por motivos distintos.
  assert.equal(componerNota('#oculto:enorme Hace falta el detalle.', 'pequeno', 'No hay mejor escaneo'),
    '#oculto:enorme Hace falta el detalle.\n#oculto:pequeno No hay mejor escaneo');
});

test('sin motivo, la marca va sola y sin espacio de más', () => {
  assert.equal(componerNota('', 'gif', ''), '#oculto:gif');
  assert.equal(componerNota('', 'gif', '   '), '#oculto:gif');
});

test('el motivo se aplana a una línea', () => {
  // Un salto de línea dentro del motivo partiría la marca en dos y la segunda
  // mitad dejaría de leerse como parte de ella.
  assert.equal(componerNota('', 'png', 'Primera\n\nSegunda'), '#oculto:png Primera Segunda');
});



test('editar SUSTITUYE la línea de esa regla, no la duplica', () => {
  const uno = componerNota('', 'png', 'Primera versión');
  assert.equal(componerNota(uno, 'png', 'Corregida'), '#oculto:png Corregida');
});

test('borrar quita solo esa regla y respeta las de las demás', () => {
  const dos = componerNota(componerNota('', 'png', 'Vector'), 'enorme', 'Hace falta el detalle');
  assert.equal(componerNota(dos, 'png', null), '#oculto:enorme Hace falta el detalle');
  assert.equal(componerNota(componerNota('', 'png', 'Vector'), 'png', null), '');
});
