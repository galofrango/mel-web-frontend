// Cronómetro en pantalla de las navegaciones (D-299). Herramienta de
// diagnóstico, apagada para todo el mundo: solo se descarga si la pestaña lo
// tiene encendido (`?crono` en la dirección; `?crono=0` o la × lo apagan; ver
// el cargador en Layout.astro). Sirve para medir en un móvil de verdad, sin
// cable, dónde se va el tiempo al abrir o cerrar una ficha.
//
// Fases de cada navegación, en ms desde el toque:
//   descarga  la página nueva ha llegado y está leída (entre paréntesis, lo
//             que tardó el servidor en contestar y si salió de la caché local)
//   cambio    la página nueva ya está puesta (antes empieza la transición)
//   listo     los scripts de la página nueva han terminado de arrancar
//   galería   en una vuelta, la galería ya colocada y destapada
//   parones   huecos de más de 100 ms entre fotogramas (el hilo principal
//             estuvo ocupado y la pantalla no se pudo pintar)
//
// Vive pegado a <html> y no a <body>, que se sustituye en cada navegación.
(function () {
  if (window.__melCrono) return;
  window.__melCrono = true;
  var ahora = function () { return performance.now(); };
  try { performance.setResourceTimingBufferSize(3000); } catch (e) {}

  var caja = document.createElement('div');
  // Los toques ATRAVIESAN el recuadro (`pointer-events: none`): solo sus
  // botones responden. Así no estorba aunque tape un enlace de la página
  // (Anterior/Siguiente quedaban debajo). Y con «mover» va arriba o abajo.
  caja.setAttribute('style', 'position:fixed;left:8px;z-index:2147483647;max-width:calc(100vw - 16px);' +
    'font:11px/1.35 ui-monospace,Menlo,monospace;color:#fff;background:rgba(20,8,12,.82);border-radius:6px;' +
    'padding:6px 8px;white-space:pre-wrap;pointer-events:none;view-transition-name:mel-crono');
  var abajo = true;
  function colocar() {
    caja.style.top = abajo ? '' : 'calc(env(safe-area-inset-top) + 8px)';
    caja.style.bottom = abajo ? 'calc(env(safe-area-inset-bottom) + 8px)' : '';
  }
  colocar();
  var texto = document.createElement('div');
  var botones = document.createElement('div');
  botones.setAttribute('style', 'margin-top:4px;display:flex;gap:10px;pointer-events:auto');
  var copiar = document.createElement('button');
  copiar.textContent = 'copiar';
  var mover = document.createElement('button');
  mover.textContent = 'mover ↕';
  var cerrar = document.createElement('button');
  cerrar.textContent = '× apagar';
  [copiar, mover, cerrar].forEach(function (b) { b.setAttribute('style', 'font:inherit;color:#ffd;background:none;border:1px solid #ffd6;border-radius:4px;padding:2px 8px'); });
  botones.appendChild(copiar);
  botones.appendChild(mover);
  botones.appendChild(cerrar);
  caja.appendChild(texto);
  caja.appendChild(botones);
  document.documentElement.appendChild(caja);

  var historial = [];   // últimas navegaciones, la más reciente primero
  var nav = null;
  var ultimoToque = null;
  function pintar() {
    if (!vivo) return;
    texto.textContent = historial.slice(0, 3).map(function (n) {
      var l = n.destino + '\n  descarga ' + (n.descarga != null ? n.descarga : '…') +
        (n.servidor != null ? ' (servidor ' + n.servidor + (n.cache ? ', caché' : '') + ')' : '') +
        (n.precargada ? ' (precargada)' : '') +
        ' · cambio ' + (n.cambio != null ? n.cambio : '…') +
        ' · listo ' + (n.listo != null ? n.listo : '…') +
        (n.galeria != null ? ' · galería ' + n.galeria : '');
      if (n.telon) l += '\n  telón ' + n.telon;
      if (n.paradas.length) l += '\n  parones ' + n.paradas.join(', ');
      return l;
    }).join('\n') || 'crono: toca algo para medir';
  }
  function desde() { return nav ? Math.round(ahora() - nav.t0) : null; }

  addEventListener('touchstart', function () { ultimoToque = ahora(); }, { capture: true, passive: true });
  addEventListener('click', function () { if (ultimoToque === null || ahora() - ultimoToque > 1000) ultimoToque = ahora(); }, true);

  document.addEventListener('astro:before-preparation', function (e) {
    var clave = new URL(e.to.href); clave.hash = '';
    window.__melUltimaPrecargada = null;
    var dir = e.to.pathname + e.to.search;
    try { dir = decodeURIComponent(dir); } catch (err) {}
    nav = { clave: clave.href, destino: dir, t0: ultimoToque !== null && ahora() - ultimoToque < 2000 ? ultimoToque : ahora(), paradas: [] };
    ultimoToque = null;
    historial.unshift(nav);
    historial.length = Math.min(historial.length, 30);   // se ven 3; «copiar» lleva todas
    try { performance.clearResourceTimings(); } catch (err) {}
    pintar();
  });
  document.addEventListener('astro:after-preparation', function () {
    if (!nav) return;
    nav.descarga = desde();
    // Si la entregó la precarga (Layout.astro deja la marca), no hubo
    // petición: lo que se viera en los tiempos sería la de la precarga.
    var r = window.__melUltimaPrecargada === nav.clave ? null : performance.getEntriesByType('resource').filter(function (x) {
      return x.initiatorType === 'fetch' && x.name.split('#')[0] === nav.clave;
    }).pop();
    if (r) {
      nav.servidor = Math.round(r.responseStart - r.requestStart);
      nav.cache = r.transferSize === 0;
    } else {
      nav.precargada = true;   // la entregó la precarga de Layout.astro, sin pedirla
    }
    pintar();
  });
  // El telón (D-315): la transición de vista de cada navegación. Si se abortó,
  // cuánto duró, si era una vuelta (`mel-vuelta`) y si voló el cartel
  // (`mel-vuelo`, D-314) o viajó a la ficha (`flyer-img-…`).
  document.addEventListener('astro:before-swap', function (e) {
    if (!nav) return;
    var n = nav, vt = e.viewTransition;
    if (!vt || !vt.ready) { n.telon = 'sin transición'; pintar(); return; }
    var t0 = ahora();
    n.telon = '…';
    vt.ready.then(function () {
      n.telon = 'en marcha' + (document.documentElement.classList.contains('mel-vuelta') ? ' (vuelta)' : '');
      pintar();
      setTimeout(function () {
        var capas = document.getAnimations().map(function (a) { return a.effect && a.effect.pseudoElement; })
          .filter(function (x) { return x && /group\((mel-vuelo|flyer-img)/.test(x); });
        if (capas.length) { n.vuelo = /mel-vuelo/.test(capas[0]) ? 'cartel volando' : 'cartel viajando'; pintar(); }
      }, 300);
    }, function (err) { n.telon = 'ABORTADO (' + (err && err.name) + ')'; pintar(); });
    vt.finished.then(function () {
      if (/^ABORTADO/.test(n.telon)) return;
      n.telon = Math.round(ahora() - t0) + ' ms' + (n.telon.indexOf('vuelta') > -1 ? ' (vuelta)' : '') + (n.vuelo ? ', ' + n.vuelo : '');
      pintar();
    });
  });
  document.addEventListener('astro:after-swap', function () { if (nav) { nav.cambio = desde(); pintar(); } });
  document.addEventListener('astro:page-load', function () {
    if (!nav) return;
    nav.listo = desde();
    pintar();
    var n = nav;
    var g = document.getElementById('view-galería');
    if (g && g.style.opacity === '0') {
      var obs = new MutationObserver(function () {
        if (g.style.opacity !== '0') { obs.disconnect(); n.galeria = Math.round(ahora() - n.t0); pintar(); }
      });
      obs.observe(g, { attributes: true, attributeFilter: ['style'] });
    }
  });

  var vivo = true;
  var previo = ahora();
  (function bucle(t) {
    if (!vivo) return;
    if (t - previo > 100 && nav && t - nav.t0 < 15000 && document.visibilityState === 'visible') {
      nav.paradas.push(Math.round(t - previo) + 'ms@' + Math.round(t - nav.t0));
      pintar();
    }
    previo = t;
    requestAnimationFrame(bucle);
  })(previo);

  // El portapapeles moderno solo existe en https; en el servidor de pruebas
  // (http://192.168.1.167:4500) no, y ahí se usa el método antiguo: un
  // <textarea> seleccionado y `execCommand('copy')`, que sí funciona.
  function copiarTexto(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, mal) {
      var area = document.createElement('textarea');
      area.value = t;
      area.setAttribute('readonly', '');
      area.setAttribute('style', 'position:fixed;top:0;left:0;opacity:0;font-size:16px');
      document.documentElement.appendChild(area);
      area.focus();
      area.setSelectionRange(0, t.length);
      var hecho = false;
      try { hecho = document.execCommand('copy'); } catch (err) {}
      area.remove();
      hecho ? ok() : mal();
    });
  }
  copiar.addEventListener('click', function (e) {
    e.stopPropagation();
    var v = function (x) { return x == null ? '…' : x; };
    var todas = historial.map(function (n) {
      return n.destino + ' | descarga ' + v(n.descarga) + (n.servidor != null ? ' (servidor ' + n.servidor + (n.cache ? ', caché' : '') + ')' : '') +
        (n.precargada ? ' (precargada)' : '') + ' | cambio ' + v(n.cambio) + ' | listo ' + v(n.listo) +
        (n.galeria != null ? ' | galería ' + n.galeria : '') + (n.telon ? ' | telón ' + n.telon : '') + (n.paradas.length ? ' | parones ' + n.paradas.join(', ') : '');
    }).join('\n');
    copiarTexto(navigator.userAgent + '\n' + location.href + '\n' + todas).then(function () {
      copiar.textContent = 'copiado';
      setTimeout(function () { copiar.textContent = 'copiar'; }, 1500);
    }, function () { copiar.textContent = 'no se pudo'; });
  });
  mover.addEventListener('click', function (e) {
    e.stopPropagation();
    abajo = !abajo;
    colocar();
  });
  cerrar.addEventListener('click', function (e) {
    e.stopPropagation();
    try { sessionStorage.removeItem('mel-crono'); } catch (err) {}
    vivo = false;
    nav = null;
    caja.remove();
  });
  pintar();
})();
