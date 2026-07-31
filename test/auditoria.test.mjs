import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditar, estaVacio } from '../src/lib/auditoria.ts';

const filaBase = {
  n: 2, idMel: 'MEL-00001', evento: 'Trip with us', urlDrive: 'https://drive.google.com/file/d/AAA/view',
  lugar: 'El Gran Café', localidad: 'León', coordenadas: 'https://maps.google.com/…!3d42.5!4d-5.5',
  artistas: 'DJ Uno', notasArchivo: '',
};
const tecBase = { tipo: 'jpeg', px: [1600, 2000], comp: 3, perfil: true, alfa: false, bytes: 900000 };

const claves = (filas, tec) => auditar(filas, tec).map(g => g.clave);
const grupo = (filas, tec, clave) => auditar(filas, tec).find(g => g.clave === clave);

test('un archivo impecable no genera ni un aviso', () => {
  assert.deepEqual(claves([filaBase], { AAA: tecBase }), []);
});

test('los centinelas de la hoja cuentan como vacío', () => {
  for (const v of ['', '  ', 'Desconocido', 'SIN FECHA', 'No detallados', 'Varios']) {
    assert.equal(estaVacio(v), true, `"${v}" debería contar como vacío`);
  }
  assert.equal(estaVacio('El Gran Café'), false);
});

test('detecta los avisos técnicos por separado', () => {
  const casos = [
    ['png',      { ...tecBase, tipo: 'png' }],
    ['cmyk',     { ...tecBase, comp: 4 }],
    ['enorme',   { ...tecBase, px: [4961, 9674] }],
    ['sin-perfil', { ...tecBase, perfil: false }],
    ['pesado',   { ...tecBase, bytes: 3 * 1024 * 1024 }],
    ['pequeno',  { ...tecBase, px: [600, 289] }],
    ['gif',      { ...tecBase, tipo: 'gif' }],
  ];
  for (const [clave, tec] of casos) {
    assert.ok(claves([filaBase], { AAA: tec }).includes(clave), `esperaba el aviso "${clave}"`);
  }
});

test('detecta los huecos de datos', () => {
  assert.ok(claves([{ ...filaBase, lugar: 'Desconocido' }], { AAA: tecBase }).includes('sin-lugar'));
  assert.ok(claves([{ ...filaBase, coordenadas: 'Desconocido' }], { AAA: tecBase }).includes('sin-coordenadas'));
  assert.ok(claves([{ ...filaBase, artistas: '' }], { AAA: tecBase }).includes('sin-artistas'));
});

// Hacen falta DOS filas: "enorme" (>3000px) y "pequeno" (<1200px) se excluyen
// mutuamente, así que una sola fila no puede disparar los dos grupos y la última
// aserción sería insatisfacible.
//
// La comparación es de la SECUENCIA completa (assert.deepEqual), no pares
// sueltos: comparar por pares solo ata lo que se compara explícitamente, y una
// mutación que intercambie dos reglas contiguas sin tocar los pares vigilados
// pasa en verde (comprobado: sin-perfil↔pesado y cmyk↔enorme no los detectaba
// la versión anterior de este test). Con la secuencia completa, cualquier
// intercambio revienta.
//
// Por qué este orden y no otro: convertir los PNG + el CMYK + los "enorme" ya
// resuelve de paso la mayoría de "sin perfil" (25/34) y de "pesado" (17/25),
// así que esas tres van antes que esas dos. "pesado" casi al final porque
// recomprimir pronto perdería calidad en imágenes que iban a bajar de peso
// solas al convertirse. "pequeno" no comparte ni un cartel con las de arriba
// (es independiente, sin arreglo por software) y por eso cierra los técnicos.
// "sin-lugar" antes que "sin-coordenadas": no se puede buscar en Google Maps
// un local cuyo nombre no se sabe.
test('el orden es el de trabajo: lo que arrastra a lo demás va primero', () => {
  const filas = [
    { ...filaBase, idMel: 'MEL-A', urlDrive: '.../d/A/view', lugar: '', coordenadas: '' },
    { ...filaBase, idMel: 'MEL-B', urlDrive: '.../d/B/view' },
  ];
  const tec = {
    A: { ...tecBase, tipo: 'png', perfil: false, bytes: 3 * 1024 * 1024, px: [4961, 9674], comp: 4 },
    B: { ...tecBase, px: [600, 289] },
  };
  const orden = claves(filas, tec);
  // Si el fixture deja de disparar alguno de los ocho, el deepEqual de abajo
  // fallaría igual, pero por la razón equivocada (fixture roto, no orden roto).
  for (const c of ['sin-lugar', 'sin-coordenadas', 'png', 'cmyk', 'enorme', 'sin-perfil', 'pesado', 'pequeno']) {
    assert.ok(orden.includes(c), `el fixture debe disparar "${c}"`);
  }
  assert.deepEqual(orden, [
    'sin-lugar', 'sin-coordenadas', 'png', 'cmyk', 'enorme', 'sin-perfil', 'pesado', 'pequeno',
  ], 'el orden es de TRABAJO, no un ranking: arreglar los de arriba resuelve los de abajo');
});

// "gif" y "sin-artistas" no comparten fila con el fixture de arriba, así que su
// posición relativa no queda atada por ningún test hasta este: nivel 2 (bajo
// rendimiento) va antes que nivel 3 (falta información), aunque haya menos
// avisos "gif" que "sin-artistas" en el archivo real — el orden es de grupo,
// no de recuento.
test('el orden es el de trabajo: gif (nivel 2) antes que sin-artistas (nivel 3)', () => {
  const fila = { ...filaBase, artistas: '' };
  const orden = claves([fila], { AAA: { ...tecBase, tipo: 'gif' } });
  assert.deepEqual(orden, ['gif', 'sin-artistas']);
});

test('dentro de cada grupo, lo peor primero', () => {
  const filas = [
    { ...filaBase, idMel: 'MEL-A', urlDrive: '.../d/A/view' },
    { ...filaBase, idMel: 'MEL-B', urlDrive: '.../d/B/view' },
  ];
  const tec = {
    A: { ...tecBase, tipo: 'png', bytes: 1_000_000 },
    B: { ...tecBase, tipo: 'png', bytes: 3_000_000 },
  };
  assert.deepEqual(grupo(filas, tec, 'png').items.map(i => i.idMel), ['MEL-B', 'MEL-A'],
    'los PNG se ordenan por peso descendente');

  const tecPeq = {
    A: { ...tecBase, px: [1000, 900] },
    B: { ...tecBase, px: [500, 400] },
  };
  assert.deepEqual(grupo(filas, tecPeq, 'pequeno').items.map(i => i.idMel), ['MEL-B', 'MEL-A'],
    'en baja resolución el peor es el más pequeño');
});

test('la marca en notasArchivo silencia solo ese aviso', () => {
  const tec = { AAA: { ...tecBase, tipo: 'png', perfil: false } };
  const conMarca = [{ ...filaBase, notasArchivo: 'Escaneo del propio autor. #acepta:png' }];
  const c = claves(conMarca, tec);
  assert.ok(!c.includes('png'), 'el aviso marcado desaparece');
  assert.ok(c.includes('sin-perfil'), 'los demás avisos del mismo cartel siguen');
});

test('el silenciado no confunde una clave con el prefijo de otra', () => {
  // "pesado2" no es una clave real, pero si el ancla del silenciado fallara
  // (un `includes()` a secas), marcar "#acepta:pesado2" silenciaría también
  // "pesado" por simple coincidencia de prefijo.
  const tec = { AAA: { ...tecBase, bytes: 3 * 1024 * 1024 } };
  const conMarcaAjena = [{ ...filaBase, notasArchivo: '#acepta:pesado2' }];
  assert.ok(claves(conMarcaAjena, tec).includes('pesado'), 'un prefijo parecido no debe silenciar la clave real');
});

test('un grupo sin items no se devuelve', () => {
  assert.equal(auditar([filaBase], { AAA: tecBase }).length, 0);
});

test('una imagen que no está en la caché técnica no revienta', () => {
  const c = claves([filaBase], {});
  assert.ok(Array.isArray(c));
});
