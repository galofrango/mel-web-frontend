import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visiblesDelCarrusel, fechaValida } from '../src/lib/mel.ts';

const img = (carruselOrder, idMel) => ({ carruselOrder, idMel });

test('carruselOrder 0 no es una pieza que enseñar', () => {
  const items = [img(0, 'MEL-77-fot'), img(1, 'MEL-77'), img(2, 'MEL-77b')];
  assert.deepEqual(visiblesDelCarrusel(items).map(i => i.idMel), ['MEL-77', 'MEL-77b']);
});

test('un evento normal no se entera de nada', () => {
  const items = [img(1, 'A'), img(2, 'B')];
  assert.deepEqual(visiblesDelCarrusel(items), items);
});

test('si TODO estuviera a 0, se enseñan igual antes que dejar la ficha vacía', () => {
  // Un dato raro degrada a lo de siempre, no a una página en blanco.
  const items = [img(0, 'A'), img(0, 'B')];
  assert.deepEqual(visiblesDelCarrusel(items), items);
});

test('la portada sigue siendo la primera: el 0 ordena delante', () => {
  const items = [img(2, 'B'), img(0, 'portada'), img(1, 'A')];
  items.sort((a, b) => a.carruselOrder - b.carruselOrder);
  assert.equal(items[0].idMel, 'portada', 'lo que usan galería, lista, mapa y metadatos');
  assert.equal(visiblesDelCarrusel(items)[0].idMel, 'A', 'pero el carrusel empieza en la pieza');
});

import { rangoDeAnios } from '../src/lib/mel.ts';

test('el rango de años sale de los datos, no de un literal', () => {
  const ev = [{ fecha: '9/10/2004' }, { fecha: '7/02/2003' }, { fecha: '31/12/2019' }];
  assert.deepEqual(rangoDeAnios(ev), { min: 2003, max: 2019 });
});

test('las fechas ilegibles no arrastran el rango', () => {
  // "SIN FECHA" y las celdas vacías son centinelas de la hoja: si contaran como
  // año 0, el deslizador abarcaría dos milenios y quedaría inservible.
  const ev = [{ fecha: 'SIN FECHA' }, { fecha: '' }, { fecha: '9/10/2004' }, { fecha: '5/01/2006' }];
  assert.deepEqual(rangoDeAnios(ev), { min: 2004, max: 2006 });
});

test('un archivo sin ninguna fecha legible no devuelve un rango imposible', () => {
  const r = rangoDeAnios([{ fecha: 'SIN FECHA' }]);
  assert.ok(Number.isFinite(r.min) && Number.isFinite(r.max), 'nada de Infinity');
  assert.ok(r.min <= r.max);
});

test('un solo evento da un rango de un año, no uno invertido', () => {
  assert.deepEqual(rangoDeAnios([{ fecha: '7/02/2003' }]), { min: 2003, max: 2003 });
});

import { tieneUbicacion } from '../src/lib/mel.ts';

test('se puede ubicar: URL larga de Maps, grados o decimales', () => {
  assert.equal(tieneUbicacion('https://www.google.es/maps/place/Calle+Cervantes,+9/@42.599,-5.569,17z'), true);
  assert.equal(tieneUbicacion('42° 36\' 19.8576" N 5° 25\' 5.5632" W'), true, 'grados, como 17 filas del archivo');
  assert.equal(tieneUbicacion('42.5987, -5.5671'), true);
});

test('NO se puede ubicar: texto suelto, centinelas o vacío', () => {
  // El caso que dejó a Oh! León fuera del mapa sin que el panel dijera nada:
  // la celda tenía texto, así que "no está vacía", pero no había forma de
  // sacar coordenadas de ahí.
  assert.equal(tieneUbicacion('Av. del Alcalde Miguel Castaño, 115'), false);
  assert.equal(tieneUbicacion('Desconocido'), false);
  assert.equal(tieneUbicacion(''), false);
  assert.equal(tieneUbicacion(undefined), false);
});

test('un enlace CORTO de Maps no cuenta: el sitio no lo resuelve', () => {
  // Resolverlo pediría una petición de red por visita, y el sitio se renderiza
  // en cada carga. Si su texto no trae coordenadas, no hay ubicación.
  assert.equal(tieneUbicacion('https://maps.app.goo.gl/QJchRLb7EhZTKsuAA'), false);
});

test('un cartel sin fecha válida no se publica', () => {
  // Estar a medias es peor que no estar: aparecía en la galería y desaparecía
  // en cuanto se tocaba el deslizador de años, sin que nadie supiera por qué.
  assert.equal(fechaValida('12/07/2013'), true);
  assert.equal(fechaValida('1/7/2013'), true, 'sin cero delante también vale');
  assert.equal(fechaValida('SIN FECHA'), false);
  assert.equal(fechaValida(''), false);
  assert.equal(fechaValida(undefined), false);
  assert.equal(fechaValida('2013'), false, 'solo el año no da orden');
  assert.equal(fechaValida('12-07-2013'), false, 'con guiones se leería como el año 12');
});

test('un año imposible también invalida la fecha', () => {
  // Red de seguridad: la escena que documenta MEL empieza en 2003, así que un
  // año de dos cifras o un 1899 es una errata, no un dato antiguo. Y una errata
  // así estira el deslizador de años hasta lo absurdo.
  assert.equal(fechaValida('12/07/0012'), false, 'el año 12 llega bien formateado y aun así es una errata');
  assert.equal(fechaValida('12/07/1899'), false);
  assert.equal(fechaValida('12/07/1960'), true, 'el suelo entra');
  assert.equal(fechaValida('12/07/2003'), true);
});
