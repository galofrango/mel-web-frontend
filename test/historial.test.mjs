import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumirHistorial } from '../src/lib/historial.ts';

const ap = (idMel, antes, despues, fecha = '2026-08-03T10:00:00Z') => ({
  fecha, idMel, acciones: ['png'],
  antes: { bytes: antes, tipo: 'png', perfil: null },
  despues: { bytes: despues, tipo: 'jpeg', perfil: null },
});

test('el ahorro es la suma de lo que se quitó', () => {
  const r = resumirHistorial([ap('A', 3_000_000, 1_000_000), ap('B', 2_000_000, 500_000)], 10_000_000);
  assert.equal(r.ahorro, 3_500_000);
  assert.equal(r.pasadas, 2);
});

test('cuenta CARTELES, no pasadas: arreglar dos veces el mismo no son dos', () => {
  const r = resumirHistorial([ap('A', 3_000_000, 2_000_000), ap('A', 2_000_000, 1_500_000)], 10_000_000);
  assert.equal(r.carteles, 1);
  assert.equal(r.pasadas, 2);
});

test('un arreglo que ENGORDA resta, no se esconde', () => {
  // Pasar a sRGB a máxima calidad engorda el fichero a propósito. Maquillar el
  // número dejando fuera los negativos sería mentir sobre el balance.
  const r = resumirHistorial([ap('A', 1_000_000, 2_000_000)], 10_000_000);
  assert.equal(r.ahorro, -1_000_000);
});

test('el porcentaje es sobre lo que pesaba ANTES, no sobre lo de ahora', () => {
  // 4 MB ahorrados con 6 MB restantes = se partía de 10 MB → 40%, no 66%.
  const r = resumirHistorial([ap('A', 5_000_000, 1_000_000)], 6_000_000);
  assert.equal(r.porcentaje, 40);
});

test('sin apuntes no se inventa nada', () => {
  const r = resumirHistorial([], 10_000_000);
  assert.deepEqual(r, { ahorro: 0, carteles: 0, pasadas: 0, porcentaje: 0, desde: null });
});

test('«desde» es el apunte más antiguo, no el primero de la lista', () => {
  const r = resumirHistorial([
    ap('A', 2, 1, '2026-08-03T12:00:00Z'),
    ap('B', 2, 1, '2026-08-01T09:00:00Z'),
  ], 100);
  assert.equal(r.desde, '2026-08-01T09:00:00Z');
});
