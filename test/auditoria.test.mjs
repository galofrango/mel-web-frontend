import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditar, estaVacio } from '../src/lib/auditoria.ts';

const filaBase = {
  n: 2, idMel: 'MEL-00001', evento: 'Trip with us', urlDrive: 'https://drive.google.com/file/d/AAA/view',
  lugar: 'El Gran Café', localidad: 'León', coordenadas: 'https://www.google.es/maps/place/Calle+Cervantes,+9/@42.5990752,-5.5692811,17z/data=!3m1!4b1!8m2!3d42.5990752!4d-5.5692811',
  artistas: 'DJ Uno', notasArchivo: '', notasOcultas: '',
};
const tecBase = { tipo: 'jpeg', px: [1600, 2000], comp: 3, noSrgb: false, alfa: false, bytes: 900000 };

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
    ['enorme',   { ...tecBase, px: [2600, 1200] }],   // basta con pasar de 2400, no de 3000
    ['no-srgb',  { ...tecBase, noSrgb: true }],
    ['no-srgb',  { ...tecBase, comp: 4 }],   // el CMYK entra por la misma regla
    ['pesado',   { ...tecBase, bytes: 3 * 1024 * 1024 }],   // jpeg, 1600×2000, sRGB: limpio salvo el peso
    ['pequeno',  { ...tecBase, px: [600, 289] }],
    ['gif',      { ...tecBase, tipo: 'gif' }],
  ];
  for (const [clave, tec] of casos) {
    assert.ok(claves([filaBase], { AAA: tec }).includes(clave), `esperaba el aviso "${clave}"`);
  }
});

test('"pesado" solo admite lo que ya está bien de todo lo demás', () => {
  // Criterio del propietario: no comprimir el peso antes de ajustar el resto,
  // porque convertir, reducir o pasar a sRGB ya adelgazan de por sí. Sin esto,
  // el panel proponía recomprimir 25 carteles de los que 21 iban a bajar solos.
  const gordo = 3 * 1024 * 1024;
  const noEntra = {
    'siendo PNG': { ...tecBase, tipo: 'png', bytes: gordo },
    'pasando de 2400 px': { ...tecBase, px: [2600, 1200], bytes: gordo },
    'con perfil raro': { ...tecBase, noSrgb: true, bytes: gordo },
    'en CMYK': { ...tecBase, comp: 4, bytes: gordo },
  };
  for (const [motivo, tec] of Object.entries(noEntra)) {
    assert.ok(!claves([filaBase], { AAA: tec }).includes('pesado'), `no debería entrar ${motivo}`);
  }
  assert.ok(claves([filaBase], { AAA: { ...tecBase, bytes: gordo } }).includes('pesado'),
    'pero uno limpio y gordo sí');
});

test('un cartel sin medir se avisa, no se cuela en verde', () => {
  // Es lo que le pasa a todo lo que se sube después de la última medición: sin
  // datos técnicos, las comprobaciones de formato, tamaño y peso ni se aplican,
  // y el cartel parecía impecable por no haber sido mirado.
  const c = claves([filaBase], {});          // sin entrada en la caché técnica
  assert.ok(c.includes('sin-medir'), 'debe avisar de que no se ha medido');
  assert.ok(!c.includes('png') && !c.includes('pesado') && !c.includes('enorme'),
    'y no inventarse defectos técnicos que no puede saber');
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
// pasa en verde (comprobado: no-srgb↔pesado y png↔no-srgb no los detectaba
// la versión anterior de este test). Con la secuencia completa, cualquier
// intercambio revienta.
//
// Por qué este orden y no otro: convertir los PNG + los "no-srgb" (que ya
// incluye el CMYK) + los "enorme" resuelve de paso la mayoría de "pesado"
// (18/25), así que van antes que él. "pesado" casi al final porque
// recomprimir pronto perdería calidad en imágenes que iban a bajar de peso
// solas al convertirse. "pequeno" no comparte ni un cartel con las de arriba
// (es independiente, sin arreglo por software) y por eso cierra los técnicos.
// "sin-lugar" antes que "sin-coordenadas": no se puede buscar en Google Maps
// un local cuyo nombre no se sabe. "sin-coordenadas" antes que "sin-artistas":
// dentro de "Fallos críticos" (nivel 1, tras la fusión con la antigua tarjeta
// "Falta información"), lo que ROMPE el mapa va antes que la laguna de
// catalogación que no rompe nada — ver el comentario de REGLAS en auditoria.ts.
test('el orden es el de trabajo: lo que arrastra a lo demás va primero', () => {
  // Hacen falta TRES filas desde que "pesado" solo admite lo que ya está bien de
  // todo lo demás: la fila A dispara png/no-srgb/enorme pero por eso mismo YA NO
  // dispara pesado, así que hace falta una fila limpia y gorda solo para él.
  const filas = [
    { ...filaBase, idMel: 'MEL-A', urlDrive: '.../d/A/view', lugar: '', coordenadas: '', artistas: '' },
    { ...filaBase, idMel: 'MEL-B', urlDrive: '.../d/B/view' },
    { ...filaBase, idMel: 'MEL-C', urlDrive: '.../d/C/view' },
  ];
  const tec = {
    A: { ...tecBase, tipo: 'png', noSrgb: true, bytes: 3 * 1024 * 1024, px: [4961, 9674], comp: 4 },
    B: { ...tecBase, px: [600, 289] },
    C: { ...tecBase, bytes: 3 * 1024 * 1024, px: [2000, 1500] },
  };
  const orden = claves(filas, tec);
  // Si el fixture deja de disparar alguno de los nueve, el deepEqual de abajo
  // fallaría igual, pero por la razón equivocada (fixture roto, no orden roto).
  for (const c of ['sin-lugar', 'sin-coordenadas', 'sin-artistas', 'png', 'no-srgb', 'enorme', 'pesado', 'pequeno']) {
    assert.ok(orden.includes(c), `el fixture debe disparar "${c}"`);
  }
  assert.deepEqual(orden, [
    'sin-lugar', 'sin-coordenadas', 'sin-artistas', 'png', 'no-srgb', 'enorme', 'pesado', 'pequeno',
  ], 'el orden es de TRABAJO, no un ranking: arreglar los de arriba resuelve los de abajo');
});

// Protege específicamente el borde que dejó la fusión de niveles: "sin-artistas"
// pasó de nivel 3 (última) a nivel 1, justo detrás de "sin-coordenadas" y antes
// del primer grupo de nivel 2 ("png"). El test de la cascada completa de arriba
// ya lo cubre de paso, pero aquí queda aislado en un fixture mínimo — sin
// arrastrar no-srgb/enorme/pesado — para que si este borde concreto se
// rompe algún día, falle un test que lo señale por su nombre, no solo el de la
// secuencia larga.
test('el orden es el de trabajo: sin-artistas va después de sin-coordenadas y antes de png', () => {
  const filas = [
    { ...filaBase, idMel: 'MEL-A', urlDrive: '.../d/A/view', coordenadas: '', artistas: '' },
    { ...filaBase, idMel: 'MEL-B', urlDrive: '.../d/B/view' },
  ];
  const tec = {
    A: tecBase,
    B: { ...tecBase, tipo: 'png' },
  };
  assert.deepEqual(claves(filas, tec), ['sin-coordenadas', 'sin-artistas', 'png']);
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

test('la marca en la columna de ocultación marca ese aviso, y solo ese', () => {
  // El silenciado ya NO descarta el item: lo marca. El panel lo pinta escondido
  // y el interruptor «Ver ocultos» lo saca sin volver a pedir la hoja.
  const tec = { AAA: { ...tecBase, tipo: 'png', noSrgb: true } };
  const conMarca = [{ ...filaBase, notasOcultas: '#oculto:png Escaneo del propio autor.' }];
  const g = auditar(conMarca, tec);
  assert.deepEqual(g.map(x => x.clave), ['png', 'no-srgb'], 'el grupo sigue viniendo');
  assert.equal(g.find(x => x.clave === 'png').items[0].oculto, true, 'el marcado va oculto');
  assert.equal(g.find(x => x.clave === 'no-srgb').items[0].oculto, false, 'los demás avisos del mismo cartel siguen visibles');
});

test('un grupo en el que TODO está oculto sigue viniendo', () => {
  // Si no viniera, el interruptor global no tendría nada que enseñar y esa
  // sección desaparecería del panel para siempre.
  const tec = { AAA: { ...tecBase, tipo: 'png' } };
  const g = auditar([{ ...filaBase, notasOcultas: '#oculto:png' }], tec);
  assert.deepEqual(g.map(x => x.clave), ['png']);
  assert.equal(g[0].items.every(i => i.oculto), true);
});

test('el silenciado no confunde una clave con el prefijo de otra', () => {
  // "pesado2" no es una clave real, pero si el ancla del silenciado fallara
  // (un `includes()` a secas), marcar "#oculto:pesado2" silenciaría también
  // "pesado" por simple coincidencia de prefijo.
  const tec = { AAA: { ...tecBase, bytes: 3 * 1024 * 1024 } };
  const conMarcaAjena = [{ ...filaBase, notasOcultas: '#oculto:pesado2' }];
  assert.ok(claves(conMarcaAjena, tec).includes('pesado'), 'un prefijo parecido no debe silenciar la clave real');
});

test('un grupo sin items no se devuelve', () => {
  assert.equal(auditar([filaBase], { AAA: tecBase }).length, 0);
});

test('una imagen que no está en la caché técnica no revienta', () => {
  const c = claves([filaBase], {});
  assert.ok(Array.isArray(c));
});

// --- Ocultar es por AVISO, no por archivo ------------------------------------
// Invariantes que pidió el propietario el 03/08/2026. Los dos ya se cumplían;
// esto es para que sigan cumpliéndose sin que nadie tenga que acordarse.
test('ocultar en una sección NO oculta el mismo cartel en las demás', () => {
  // Un PNG enorme cae en «png» y en «enorme». Marcado solo el primero.
  const filas = [{ ...filaBase, notasOcultas: 'Es un vector, se queda. #oculto:png' }];
  const tec = { AAA: { ...tecBase, tipo: 'png', px: [5000, 5000] } };
  const grupos = auditar(filas, tec);
  const de = (clave) => grupos.find((g) => g.clave === clave)?.items[0];
  assert.equal(de('png').oculto, true, 'la regla marcada');
  assert.equal(de('enorme').oculto, false, 'la otra sigue avisando');
});

test('la nota llega sin la marca delante', () => {
  const filas = [{ ...filaBase, notasOcultas: '#oculto:png Escaneo único.' }];
  const tec = { AAA: { ...tecBase, tipo: 'png' } };
  const item = auditar(filas, tec).find((g) => g.clave === 'png').items[0];
  assert.equal(item.notas, 'Escaneo único.', 'sin la marca: es plomería, no texto para leer');
});
