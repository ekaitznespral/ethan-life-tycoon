// Modo Historia de Ethan life tycoon: motor 2D lateral en pixel art.
// Sin dependencias. Lee la historia y los escenarios de story/scenes.js.
(function () {
  'use strict';
  var VW = 384, VH = 216;
  var SAVE_KEY = 'elt-historia-v1';
  var SCENES = window.STORY_SCENES, STORY = window.STORY;

  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
  cv.width = VW; cv.height = VH;
  var SCALE = 1;

  // ---------------- pantalla ----------------
  function fit() {
    var w = innerWidth, h = innerHeight, s = Math.min(w / VW, h / VH), si = Math.floor(s);
    if (si >= 1 && si / s >= 0.85) s = si; // escala entera si casi llena la pantalla: pixeles nitidos
    SCALE = s;
    stage.style.width = Math.round(VW * s) + 'px';
    stage.style.height = Math.round(VH * s) + 'px';
    stage.style.setProperty('--s', s);
  }
  addEventListener('resize', fit); fit();

  // ---------------- teclado y tactil ----------------
  var MAP = {
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    KeyW: 'jump', ArrowUp: 'jump', Space: 'jump', KeyS: 'down', ArrowDown: 'down',
    KeyE: 'act', Enter: 'ok', Escape: 'menu', KeyP: 'menu', ShiftLeft: 'run', ShiftRight: 'run', F2: 'debug',
    Backquote: 'dev', F1: 'dev'
  };
  var keys = {}, pressed = {};
  var skipCard = false;
  function press(a) { if (!keys[a]) pressed[a] = true; keys[a] = true; if (a === 'jump' || a === 'ok' || a === 'act') skipCard = true; }
  addEventListener('keydown', function (e) {
    var a = MAP[e.code]; if (!a) return;
    var tag = e.target && e.target.tagName;
    if ((tag === 'SELECT' || tag === 'INPUT') && a !== 'dev' && a !== 'menu') return;             // deja usar los desplegables
    if (tag === 'BUTTON' && (a === 'ok' || a === 'jump') && state !== 'play') return;               // y los botones de los menus
    e.preventDefault(); if (!e.repeat) press(a); else keys[a] = true;
  });
  addEventListener('keyup', function (e) { var a = MAP[e.code]; if (a) keys[a] = false; });
  addEventListener('blur', function () { keys = {}; });
  document.querySelectorAll('#touch [data-k]').forEach(function (b) {
    var k = b.getAttribute('data-k');
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); b.setPointerCapture(e.pointerId); press(k); });
    var up = function () { keys[k] = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  });
  if (matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');

  // ---------------- imagenes ----------------
  var IMG = {};
  function loadImg(src) {
    if (IMG[src]) return IMG[src].p;
    var im = new Image(), e = { im: null };
    e.p = new Promise(function (res) {
      im.onload = function () { e.im = im; res(im); };
      im.onerror = function () { console.warn('[historia] no se pudo cargar', src); res(null); };
    });
    im.src = src; IMG[src] = e; return e.p;
  }
  function img(src) { return IMG[src] && IMG[src].im; }
  var ETHAN = 'sprites/ethan-walk.png';
  var KEEP = [ETHAN];

  // ---------------- estado ----------------
  var state = 'menu';         // menu | card | loading | play | pause | dev
  var scene = null, sceneId = null;
  var cam = { x: 0 };
  var P = { x: 0, y: 0, vx: 0, vy: 0, w: 14, h: 42, dir: 1, ground: false, onPlat: false, coyote: 0, buf: 0, drop: 0, dist: 0, frame: 1 };
  var debug = false, time = 0, fx = [];

  // ---------------- partidas (ranuras) ----------------
  // Cada ranura guarda: escenario y posicion, tiempo jugado y, para lo que venga
  // (misiones, inventario), flags e inv.
  var SLOTS = 3, slot = 0, game = null, saveT = 0;
  function slotKey(n) { return 'elt-historia-slot' + n; }
  function readSlot(n) {
    try { var d = JSON.parse(localStorage.getItem(slotKey(n))); return d && SCENES[d.scene] ? d : null; } catch (e) { return null; }
  }
  function newData() { return { v: 2, scene: null, x: null, y: null, dir: 1, created: Date.now(), t: Date.now(), play: 0, flags: {}, inv: [] }; }
  function writeSave() {
    if (!slot || !game || !sceneId) return;
    game.scene = sceneId; game.x = Math.round(P.x); game.y = Math.round(P.y); game.dir = P.dir; game.t = Date.now();
    try { localStorage.setItem(slotKey(slot), JSON.stringify(game)); } catch (e) { }
  }
  function deleteSlot(n) { try { localStorage.removeItem(slotKey(n)); } catch (e) { } if (n === slot) { slot = 0; game = null; } }
  try { // el guardado antiguo (una sola partida) pasa a la ranura 1
    var old = localStorage.getItem(SAVE_KEY);
    if (old) {
      var o = JSON.parse(old);
      if (o && SCENES[o.scene] && !localStorage.getItem(slotKey(1))) {
        var d = newData(); d.scene = o.scene; d.x = o.x; d.y = o.y; d.dir = o.dir; d.t = o.t || Date.now();
        localStorage.setItem(slotKey(1), JSON.stringify(d));
      }
      localStorage.removeItem(SAVE_KEY);
    }
  } catch (e) { }
  addEventListener('beforeunload', function () { if (state === 'play' || state === 'pause' || state === 'dev') writeSave(); });

  // ---------------- transiciones ----------------
  var fade = $('fade'), loading = $('loading');
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fadeTo(o, ms) {
    fade.style.transition = 'opacity ' + ms + 'ms linear';
    fade.style.opacity = o; return wait(ms + 20);
  }
  function setFade(o) { fade.style.transition = 'none'; fade.style.opacity = o; }

  async function loadScene(id) {
    var s = SCENES[id]; if (!s) throw new Error('Escenario desconocido: ' + id);
    var srcs = s.layers.map(function (l) { return l.src; });
    // descarta las imagenes del escenario anterior que ya no hacen falta
    Object.keys(IMG).forEach(function (k) { if (srcs.indexOf(k) < 0 && KEEP.indexOf(k) < 0) delete IMG[k]; });
    await Promise.all(srcs.concat(KEEP).map(loadImg));
    scene = s; sceneId = id;
    fx = (s.fx || []).map(function (d) { return makeFx(d); });
  }
  function place(spawn, at) {
    var sp = (at && at.x != null) ? at : (scene.spawns[spawn] || { x: 40, dir: 1 });
    P.x = sp.x; P.y = at && at.y != null ? at.y : scene.floor; P.dir = sp.dir || 1;
    P.vx = P.vy = 0; P.ground = true; P.buf = 0; P.drop = 0;
    cam.x = clampCam(P.x - VW / 2 + P.dir * 28);
  }

  var busy = false;
  async function goScene(id, spawn, at) {
    if (busy) return; busy = true;
    var prev = state; state = 'loading'; hidePrompt();
    if (prev !== 'card' && prev !== 'menu') await fadeTo(1, 280); else setFade(1);
    loading.hidden = false;
    var t0 = performance.now();
    try { await loadScene(id); } catch (e) { console.error(e); loading.textContent = 'Error al cargar'; busy = false; return; }
    place(spawn, at);
    var el = performance.now() - t0; if (el < 450) await wait(450 - el);
    loading.hidden = true; state = 'play'; writeSave();
    await fadeTo(0, 380);
    busy = false;
    if (scene && sceneId === id && state !== 'menu') showSceneName();
  }

  var nameT = 0;
  function showSceneName() {
    var n = $('sname'); n.innerHTML = '<b></b><span></span>';
    n.firstChild.textContent = scene.name; n.lastChild.textContent = scene.sub || '';
    n.classList.add('on'); clearTimeout(nameT); nameT = setTimeout(function () { n.classList.remove('on'); }, 2600);
  }

  // Tarjetas de texto en negro (p. ej. la fecha del principio). Se saltan con una tecla.
  async function showCards(lines) {
    state = 'card'; setFade(1);
    var c = $('card');
    for (var i = 0; i < lines.length; i++) {
      c.textContent = ''; c.hidden = false; c.classList.remove('out');
      var txt = lines[i], skip = false;
      skipCard = false;
      for (var k = 1; k <= txt.length; k++) {
        c.textContent = txt.slice(0, k);
        await wait(txt[k - 1] === ' ' ? 40 : 70);
        if (skipCard) { skip = true; c.textContent = txt; break; }
      }
      skipCard = false;
      for (var t = 0; t < 2400; t += 50) { await wait(50); if (skipCard) break; }
      c.classList.add('out'); await wait(700);
    }
    c.hidden = true;
  }

  // ---------------- menus ----------------
  function screen(id) { ['menu', 'slots', 'pause'].forEach(function (k) { $(k).hidden = k !== id; }); }
  function showMenu() {
    if (state === 'dev') closeDev();
    state = 'menu'; scene = null; sceneId = null; slot = 0; game = null; setFade(1); hidePrompt();
    screen('menu'); $('mplay').focus();
  }
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'ahora mismo'; if (m < 60) return 'hace ' + m + ' min';
    var h = Math.round(m / 60); if (h < 24) return 'hace ' + h + ' h';
    return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
  function played(sec) { var m = Math.floor(sec / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
  function showSlots() {
    screen('slots');
    var box = $('slist'); box.innerHTML = '';
    for (var n = 1; n <= SLOTS; n++) (function (n) {
      var d = readSlot(n), row = document.createElement('div'); row.className = 'slot' + (d ? '' : ' empty');
      var info = document.createElement('div'); info.className = 'si';
      var b = document.createElement('b'); b.textContent = 'Partida ' + n;
      var sp = document.createElement('span');
      sp.textContent = d ? SCENES[d.scene].name + ' · ' + played(d.play || 0) + ' · ' + ago(d.t) : 'Vacía';
      info.appendChild(b); info.appendChild(sp); row.appendChild(info);
      var go = document.createElement('button'); go.textContent = d ? 'Continuar' : 'Nueva';
      go.onclick = function () { d ? continueGame(n) : newGame(n); };
      row.appendChild(go);
      if (d) {
        var del = document.createElement('button'); del.className = 'del'; del.textContent = 'Borrar';
        del.onclick = function () {
          if (del.dataset.sure) { deleteSlot(n); showSlots(); return; }
          del.dataset.sure = 1; del.textContent = '¿Seguro?'; del.classList.add('sure');
          setTimeout(function () { if (del.isConnected) { delete del.dataset.sure; del.textContent = 'Borrar'; del.classList.remove('sure'); } }, 3000);
        };
        row.appendChild(del);
      }
      box.appendChild(row);
    })(n);
    box.querySelector('button').focus();
  }
  async function startAt(n, cp) { // empieza una partida en la ranura n desde un punto de la historia
    slot = n; game = newData();
    if (cp.flags) game.flags = JSON.parse(JSON.stringify(cp.flags));
    if (cp.inv) game.inv = cp.inv.slice();
    screen(null); scene = null; sceneId = null;
    if (cp.cards) await showCards(STORY.intro.cards);
    await goScene(cp.scene, cp.spawn);
  }
  function newGame(n) { startAt(n, { cards: true, scene: STORY.intro.scene, spawn: STORY.intro.spawn }); }
  function continueGame(n) {
    var d = readSlot(n); if (!d) return newGame(n);
    slot = n; game = d; if (!game.flags) game.flags = {}; if (!game.inv) game.inv = [];
    screen(null); goScene(d.scene, null, { x: d.x, y: d.y, dir: d.dir });
  }
  function pause(on) {
    if (on && state === 'play') { state = 'pause'; writeSave(); screen('pause'); $('pcont').focus(); keys = {}; }
    else if (!on && state === 'pause') { state = 'play'; screen(null); pressed = {}; }
  }
  $('card').addEventListener('pointerdown', function () { skipCard = true; });
  $('mplay').onclick = showSlots; $('sback').onclick = showMenu;
  $('pcont').onclick = function () { pause(false); };
  $('pmenu').onclick = function () { writeSave(); showMenu(); };
  $('mdev').onclick = $('pdev').onclick = function () { openDev(); };

  // ---------------- panel de desarrollador (tecla º o F1) ----------------
  var devPrev = null;
  function openDev() {
    if (state === 'dev' || state === 'loading' || state === 'card') return;
    devPrev = state; state = 'dev'; keys = {}; $('dev').hidden = false; renderDev();
  }
  function closeDev() {
    if (state !== 'dev') return;
    $('dev').hidden = true; state = devPrev; devPrev = null; pressed = {};
    if (state === 'menu') $('mplay').focus();
  }
  function renderDev() {
    var ss = $('dslot'); ss.innerHTML = '';
    for (var n = 1; n <= SLOTS; n++) {
      var d = readSlot(n), o = document.createElement('option'); o.value = n;
      o.textContent = 'Partida ' + n + (d ? ' (' + SCENES[d.scene].name + ')' : ' (vacía)') + (n === slot ? ' · en juego' : '');
      ss.appendChild(o);
    }
    ss.value = slot || 1;
    var cl = $('dcps'); cl.innerHTML = '';
    (STORY.checkpoints || []).forEach(function (cp) {
      var b = document.createElement('button'); b.textContent = cp.name;
      b.onclick = function () { jumpTo(cp); }; cl.appendChild(b);
    });
    var sc = $('dscene'); sc.innerHTML = '';
    Object.keys(SCENES).forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = SCENES[id].name + ' (' + id + ')'; sc.appendChild(o); });
    sc.value = sceneId || Object.keys(SCENES)[0]; fillSpawns();
    $('ddebug').checked = debug;
    $('ddata').textContent = game ? JSON.stringify(Object.assign({}, game, { play: Math.round(game.play || 0) }, sceneId ? { scene: sceneId, x: Math.round(P.x), y: Math.round(P.y) } : {}), null, 1) : '(no hay partida en juego)';
  }
  function fillSpawns() {
    var sp = $('dspawn'); sp.innerHTML = '';
    Object.keys(SCENES[$('dscene').value].spawns).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = k; sp.appendChild(o); });
  }
  function jumpTo(cp) {
    var n = +$('dslot').value;
    $('dev').hidden = true; state = devPrev === 'menu' ? 'menu' : 'pause'; devPrev = null;
    if (n !== slot || !game) startAt(n, cp);
    else {
      if (cp.flags) game.flags = JSON.parse(JSON.stringify(cp.flags));
      if (cp.inv) game.inv = cp.inv.slice();
      screen(null);
      if (cp.cards) { scene = null; sceneId = null; showCards(STORY.intro.cards).then(function () { goScene(cp.scene, cp.spawn); }); }
      else goScene(cp.scene, cp.spawn);
    }
  }
  $('dscene').onchange = fillSpawns;
  $('dgo').onclick = function () { jumpTo({ scene: $('dscene').value, spawn: $('dspawn').value }); };
  $('ddebug').onchange = function () { debug = this.checked; };
  $('dsave').onclick = function () { writeSave(); renderDev(); };
  $('ddel').onclick = function () {
    var n = +$('dslot').value;
    if (!confirm('¿Borrar la partida ' + n + '?')) return;
    var wasCur = n === slot; deleteSlot(n);
    if (wasCur) showMenu(); else renderDev();
  };
  $('dclose').onclick = closeDev;

  // ---------------- interaccion ----------------
  var prompt = $('prompt'), curExit = null;
  function hidePrompt() { prompt.classList.remove('on'); curExit = null; }
  function updatePrompt() {
    var ex = null;
    if (P.ground) (scene.exits || []).forEach(function (e) { if (P.x > e.x && P.x < e.x + e.w) ex = e; });
    if (ex !== curExit) {
      curExit = ex;
      if (ex) { prompt.innerHTML = '<kbd>E</kbd> '; prompt.appendChild(document.createTextNode(ex.label || 'Entrar')); prompt.classList.add('on'); }
      else prompt.classList.remove('on');
    }
    if (ex) {
      prompt.style.left = ((ex.x + ex.w / 2 - Math.round(cam.x)) * SCALE) + 'px';
      prompt.style.top = ((P.y - 58) * SCALE) + 'px';
    }
    if (ex && pressed.act) goScene(ex.to, ex.spawn);
  }

  // ---------------- fisica de Ethan ----------------
  var WALK = 82, RUN = 132, ACC = 950, AIR = 620, FRIC = 1100, G = 920, JUMP = 312, CUT = 190, MAXF = 430;
  function step(dt) {
    var ax = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), max = keys.run ? RUN : WALK;
    if (ax) {
      if (P.vx * ax < 0) P.vx += ax * FRIC * dt;                         // giro rapido
      P.vx += ax * (P.ground ? ACC : AIR) * dt;
      if (Math.abs(P.vx) > max) P.vx = Math.sign(P.vx) * Math.max(max, Math.abs(P.vx) - FRIC * dt);
      P.dir = ax;
    } else {
      var f = (P.ground ? FRIC : FRIC * 0.35) * dt;
      P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f;
    }
    // salto con margen (coyote) y buffer, salto variable y bajar de plataformas
    if (pressed.jump) P.buf = 0.13;
    P.buf -= dt; P.coyote = P.ground ? 0.09 : P.coyote - dt; P.drop -= dt;
    if (P.buf > 0 && keys.down && P.onPlat) { P.drop = 0.22; P.buf = 0; P.ground = false; P.onPlat = false; P.coyote = 0; }
    else if (P.buf > 0 && P.coyote > 0) { P.vy = -JUMP; P.buf = 0; P.coyote = 0; P.ground = false; }
    if (!keys.jump && P.vy < -CUT) P.vy = -CUT;
    P.vy = Math.min(MAXF, P.vy + G * dt);

    P.x += P.vx * dt;
    var hw = P.w / 2;
    if (P.x < hw + 4) { P.x = hw + 4; P.vx = 0; }
    if (P.x > scene.w - hw - 4) { P.x = scene.w - hw - 4; P.vx = 0; }

    var py = P.y; P.y += P.vy * dt; P.ground = false; P.onPlat = false;
    if (P.vy >= 0) {
      if (P.y >= scene.floor) { P.y = scene.floor; P.vy = 0; P.ground = true; }
      if (P.drop <= 0) (scene.platforms || []).forEach(function (p) {
        if (P.x + hw > p.x && P.x - hw < p.x + p.w && py <= p.y + 0.5 && P.y >= p.y) { P.y = p.y; P.vy = 0; P.ground = true; P.onPlat = true; }
      });
    }
    // animacion: 4 fotogramas de paseo (1 y 3 = piernas juntas)
    if (!P.ground) P.frame = 2;
    else if (Math.abs(P.vx) > 4) { P.dist += Math.abs(P.vx) * dt; P.frame = Math.floor(P.dist / 7) % 4; }
    else { P.frame = 1; P.dist = 0; }
  }
  function clampCam(x) { return Math.max(0, Math.min(scene.w - VW, x)); }
  function camStep(dt) {
    var tx = clampCam(P.x - VW / 2 + P.dir * 28);
    cam.x += (tx - cam.x) * Math.min(1, dt * 4.5);
  }

  // ---------------- efectos ----------------
  var FW_COLS = ['#ffd75e', '#ff6b6b', '#7ee0ff', '#b98cff', '#8dff9e', '#ffffff', '#ff9ad5'];
  function makeFx(d) {
    var o = { d: d, t: 0, parts: [], next: 0.3 };
    return o;
  }
  function fxStep(o, dt) {
    var d = o.d; o.t += dt;
    if (d.type !== 'fireworks') return;
    o.next -= dt;
    if (o.next <= 0) {
      o.next = (0.4 + Math.random() * 1.2) / (d.rate || 1);
      var x = d.x0 + Math.random() * (d.x1 - d.x0), ty = d.y0 + Math.random() * (d.y1 - d.y0);
      o.parts.push({ k: 'r', x: x, y: ty + 70, vy: -110, ty: ty, c: FW_COLS[Math.random() * FW_COLS.length | 0], l: 2 });
    }
    for (var i = o.parts.length - 1; i >= 0; i--) {
      var p = o.parts[i];
      if (p.k === 'r') {
        p.y += p.vy * dt;
        if (p.y <= p.ty) {
          o.parts.splice(i, 1);
          var n = 22 + (Math.random() * 14 | 0), sp = 30 + Math.random() * 25, c2 = Math.random() < 0.4 ? FW_COLS[Math.random() * FW_COLS.length | 0] : p.c;
          for (var k = 0; k < n; k++) {
            var a = k / n * Math.PI * 2, v = sp * (0.7 + Math.random() * 0.3);
            o.parts.push({ k: 's', x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: k % 3 ? p.c : c2, l: 0.9 + Math.random() * 0.6 });
          }
        }
      } else {
        p.vy += 40 * dt; p.vx *= 1 - 1.4 * dt; p.vy *= 1 - 1.4 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt;
        if (p.l <= 0) o.parts.splice(i, 1);
      }
    }
  }
  function fxDraw(o, cx) {
    var d = o.d, f = d.f == null ? 1 : d.f, ox = Math.round(cx * f);
    if (d.type === 'fireworks') {
      ctx.globalCompositeOperation = 'lighter';
      o.parts.forEach(function (p) {
        ctx.globalAlpha = p.k === 'r' ? 1 : Math.min(1, p.l * 1.5);
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x - ox), Math.round(p.y), 1, p.k === 'r' ? 2 : 1);
      });
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    } else if (d.type === 'glow') {
      var a = d.a * (d.flicker ? (1 - d.flicker * 0.5 + d.flicker * 0.5 * Math.abs(Math.sin(o.t * 7.3) * Math.sin(o.t * 3.1))) : 1);
      var x = d.x - ox, g = ctx.createRadialGradient(x, d.y, 0, x, d.y, d.r);
      g.addColorStop(0, 'rgba(' + d.c + ',' + a + ')'); g.addColorStop(1, 'rgba(' + d.c + ',0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
      ctx.fillRect(x - d.r, d.y - d.r, d.r * 2, d.r * 2); ctx.globalCompositeOperation = 'source-over';
    } else if (d.type === 'blink') {
      if ((o.t + (d.phase || 0)) % 1.4 < 0.7) { ctx.fillStyle = '#ff3b30'; ctx.fillRect(d.x - ox, d.y, 2, 2); }
    } else if (d.type === 'tv') { // las campanadas: la Puerta del Sol en la tele
      var x0 = d.x - ox, cut = Math.floor(o.t / 4) % 2;
      ctx.fillStyle = cut ? '#1c2a52' : '#24315e'; ctx.fillRect(x0, d.y, d.w, d.h);
      if (!cut) {
        ctx.fillStyle = '#c9a46a'; ctx.fillRect(x0 + 6, d.y + 9, d.w - 12, d.h - 9);
        ctx.fillStyle = '#e9d3a2'; ctx.fillRect(x0 + d.w / 2 - 4, d.y + 3, 8, 8);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + d.w / 2 - 2, d.y + 5, 4, 4);
        ctx.fillStyle = '#7a5a3a'; for (var i = 0; i < 4; i++) ctx.fillRect(x0 + 9 + i * 7, d.y + 14, 3, 5);
        ctx.fillStyle = '#ffd75e'; ctx.fillRect(x0 + d.w / 2 - 1, d.y + 1, 2, 2);
      } else {
        ctx.fillStyle = '#f2c9a0'; ctx.fillRect(x0 + 14, d.y + 6, 12, 10);
        ctx.fillStyle = '#3a2b22'; ctx.fillRect(x0 + 13, d.y + 4, 14, 4);
        ctx.fillStyle = '#b8322c'; ctx.fillRect(x0 + 10, d.y + 16, 20, 9);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + 2, d.y + d.h - 5, d.w - 4, 3);
      }
      ctx.globalAlpha = 0.08 + 0.06 * Math.random(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, d.y, d.w, d.h); ctx.globalAlpha = 1;
    }
  }

  // ---------------- dibujo ----------------
  function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    if (!scene) return;
    var cx = Math.round(cam.x);
    scene.layers.forEach(function (l, i) {
      var im = img(l.src); if (im) ctx.drawImage(im, -Math.round(cx * l.f), l.y || 0);
      fx.forEach(function (o) { if ((o.d.z == null ? scene.layers.length - 1 : o.d.z) === i) fxDraw(o, cx); });
    });
    // Ethan
    var e = img(ETHAN);
    if (e) {
      var dx = Math.round(P.x) - cx, dy = Math.round(P.y) - 46;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; if (P.ground) ctx.fillRect(dx - 8, Math.round(P.y) - 1, 16, 2);
      if (P.dir > 0) ctx.drawImage(e, P.frame * 48, 0, 48, 48, dx - 24, dy, 48, 48);
      else { ctx.save(); ctx.translate(dx + 24, dy); ctx.scale(-1, 1); ctx.drawImage(e, P.frame * 48, 0, 48, 48, 0, 0, 48, 48); ctx.restore(); }
    }
    if (debug) drawDebug(cx);
  }
  function drawDebug(cx) {
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1;
    (scene.platforms || []).forEach(function (p) { ctx.beginPath(); ctx.moveTo(p.x - cx, p.y + 0.5); ctx.lineTo(p.x + p.w - cx, p.y + 0.5); ctx.stroke(); });
    ctx.fillStyle = 'rgba(0,255,120,0.25)';
    (scene.exits || []).forEach(function (e) { ctx.fillRect(e.x - cx, scene.floor - 70, e.w, 70); });
    ctx.strokeStyle = '#ff3355'; ctx.strokeRect(Math.round(P.x - P.w / 2) - cx + 0.5, Math.round(P.y - P.h) + 0.5, P.w, P.h);
    ctx.fillStyle = '#000a'; ctx.fillRect(0, 0, 150, 11);
    ctx.fillStyle = '#0f0'; ctx.font = '8px monospace'; ctx.textBaseline = 'top';
    ctx.fillText(sceneId + '  x:' + Math.round(P.x) + ' y:' + Math.round(P.y) + '  ' + fps + 'fps', 2, 2);
  }

  // ---------------- bucle principal (paso fijo de 1/120 s) ----------------
  var last = performance.now(), acc = 0, STEP = 1 / 120, fps = 0, fc = 0, ft = 0;
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    fc++; ft += dt; if (ft >= 1) { fps = fc; fc = 0; ft = 0; }
    if (pressed.debug) debug = !debug;
    if (pressed.dev) { if (state === 'dev') closeDev(); else openDev(); }
    else if (pressed.menu) { if (state === 'dev') closeDev(); else if (state === 'play') pause(true); else if (state === 'pause') pause(false); }
    if (state === 'play' && scene) {
      acc += dt;
      while (acc >= STEP) { step(STEP); acc -= STEP; pressed.jump = false; }
      camStep(dt); updatePrompt();
      if (game) { game.play = (game.play || 0) + dt; saveT += dt; if (saveT > 10) { saveT = 0; writeSave(); } }
    } else acc = 0;
    if (scene && state !== 'menu') { time += dt; fx.forEach(function (o) { fxStep(o, dt); }); }
    draw();
    pressed = {};
    requestAnimationFrame(frame);
  }

  loadImg(ETHAN);
  showMenu();
  requestAnimationFrame(frame);
  window.__historia = { P: P, cam: cam, get state() { return state; }, get scene() { return sceneId; }, get slot() { return slot; }, go: goScene }; // para pruebas
})();
