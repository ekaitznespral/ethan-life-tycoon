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
    Backquote: 'dev', F1: 'dev', KeyI: 'inv', Tab: 'inv'
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
  var ETHAN = 'sprites/ethan-walk.png', SIT = 'sprites/story/ethan-sit.png', OBJ = 'sprites/story/objetos.png';
  var KEEP = [ETHAN, SIT, OBJ];

  // ---------------- estado ----------------
  var state = 'menu';         // menu | card | loading | play | talk (guion) | inv | pause | dev
  var scene = null, sceneId = null;
  var cam = { x: 0 };
  var P = { x: 0, y: 0, vx: 0, vy: 0, w: 14, h: 42, dir: 1, ground: false, onPlat: false, coyote: 0, buf: 0, drop: 0, dist: 0, frame: 1, sit: null, eatF: 0 };
  var debug = false, time = 0, fx = [], npcs = [];

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
    var srcs = s.layers.map(function (l) { return l.src; }).concat((s.npcs || []).map(function (n) { return n.sprite; }));
    // descarta las imagenes del escenario anterior que ya no hacen falta
    Object.keys(IMG).forEach(function (k) { if (srcs.indexOf(k) < 0 && KEEP.indexOf(k) < 0) delete IMG[k]; });
    await Promise.all(srcs.concat(KEEP).map(loadImg));
    scene = s; sceneId = id;
    fx = (s.fx || []).map(function (d) { return makeFx(d); });
    npcs = (s.npcs || []).map(function (d) { return { d: d, blinkT: 1 + Math.random() * 3, blink: 0, mouth: false }; });
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
    var prev = state; state = 'loading'; hidePrompt(); stopScript();
    if (prev !== 'card' && prev !== 'menu') await fadeTo(1, 280); else setFade(1);
    loading.hidden = false;
    var t0 = performance.now();
    try { await loadScene(id); } catch (e) { console.error(e); loading.textContent = 'Error al cargar'; busy = false; return; }
    place(spawn, at);
    var el = performance.now() - t0; if (el < 450) await wait(450 - el);
    loading.hidden = true; state = 'play'; writeSave(); hudSig = null; refreshHud();
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
    stopScript(); $('inv').hidden = true; $('mis').hidden = true; hudSig = '';
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

  // ---------------- interaccion: salidas, personajes y objetos ----------------
  var ITEMS = STORY.items || {}, MIS = STORY.missions || {};
  // GS: lo que ven las condiciones when(g) y los guiones
  var GS = {
    flag: function (k, v) {
      if (!game) return undefined;
      if (arguments.length > 1) { if (v == null || v === false) delete game.flags[k]; else game.flags[k] = v; refreshHud(); }
      return game.flags[k];
    },
    has: function (id) { return !!game && game.inv.indexOf(id) >= 0; }
  };
  function avail(o) { try { return !o.when || !!o.when(GS); } catch (e) { return false; } }
  var prompt = $('prompt'), cur = null;
  function hidePrompt() { prompt.classList.remove('on'); cur = null; }
  function updatePrompt() {
    var best = null, bd = 1e9;
    function cand(k, o, cx, reach) { var d = Math.abs(P.x - cx); if (d < reach && d < bd) { bd = d; best = { k: k, o: o }; } }
    if (P.ground) {
      (scene.exits || []).forEach(function (e) { if (P.x > e.x && P.x < e.x + e.w) cand('exit', e, e.x + e.w / 2, 1e9); });
      npcs.forEach(function (n) { if (avail(n.d)) cand('npc', n, n.d.x, n.d.reach || 22); });
      (scene.objects || []).forEach(function (o) { if (avail(o)) cand('obj', o, o.x, o.reach || 16); });
    }
    if ((best && best.o) !== (cur && cur.o)) {
      cur = best;
      if (best) {
        prompt.innerHTML = '<kbd>E</kbd> ';
        prompt.appendChild(document.createTextNode(best.k === 'npc' ? 'Hablar con ' + best.o.d.name : (best.o.label || 'Entrar')));
        prompt.classList.add('on');
      } else prompt.classList.remove('on');
    }
    if (best) {
      var o = best.o, px = best.k === 'npc' ? o.d.x : best.k === 'obj' ? o.x : o.x + o.w / 2;
      var py = best.k === 'npc' ? o.d.top + 9 : best.k === 'obj' && o.py ? o.py : P.y - 58;
      var hw = prompt.offsetWidth / 2 + 4 * SCALE, sx = (px - Math.round(cam.x)) * SCALE;
      prompt.style.left = Math.max(hw, Math.min(VW * SCALE - hw, sx)) + 'px';   // que no se corte en los bordes
      prompt.style.top = (py * SCALE) + 'px';
      if (pressed.act) {
        if (best.k === 'npc') runScript(o.d.run, o);
        else if (best.k === 'obj') runScript(o.run);
        else goScene(o.to, o.spawn);
      }
    }
  }

  // ---------------- guiones (dialogos, elecciones, misiones, cinematicas) ----------------
  // Los guiones estan en STORY.scripts: funciones async que reciben la API "s" de abajo.
  var run = null, dlg = $('dlg'), dAdv = false;
  dlg.addEventListener('pointerdown', function (e) { if (!e.target.closest('#dopts')) dAdv = true; });
  function clampX(x) { return Math.max(12, Math.min(scene.w - 12, x)); }
  function runScript(name, npc) {
    var fn = (STORY.scripts || {})[name];
    if (!fn) { console.warn('[historia] falta el guion', name); return; }
    run = { line: null, walk: null, waits: [], eat: false };
    state = 'talk'; hidePrompt(); P.vx = 0; dAdv = false; $('sname').classList.remove('on');
    if (npc) {
      P.dir = npc.d.x < P.x ? -1 : 1;
      if (Math.abs(P.x - npc.d.x) < 20) run.walk = { x: clampX(npc.d.x + (P.x <= npc.d.x ? -26 : 26)), done: function () { P.dir = npc.d.x < P.x ? -1 : 1; } }; // se aparta para no taparle la cara
    }
    var me = run, p;
    try { p = Promise.resolve(fn(API)); } catch (e) { p = Promise.reject(e); }
    p.catch(function (e) { console.error('[historia] error en el guion', name, e); }).then(function () { if (run === me) endScript(); });
  }
  function endScript() {
    if (!run) return;
    run = null; dlg.hidden = true; stage.classList.remove('talking'); $('dopts').innerHTML = ''; npcs.forEach(function (o) { o.mouth = false; });
    if (state === 'talk') state = 'play';
    P.buf = 0; pressed = {}; writeSave(); refreshHud();
  }
  function stopScript() { if (run) { run = null; dlg.hidden = true; $('dopts').innerHTML = ''; } stage.classList.remove('talking'); P.sit = null; cine(false); npcs.forEach(function (o) { o.mouth = false; }); }
  var API = {
    flag: GS.flag, has: GS.has,
    say: function (who, text) { return new Promise(function (res) { showLine(who, text, null, res); }); },
    choose: function (who, text, opts) { return new Promise(function (res) { showLine(who, text, opts, res); }); },
    give: function (id) { if (!game || GS.has(id)) return; game.inv.push(id); toast('+ ' + (ITEMS[id] ? ITEMS[id].name : id), id); refreshHud(); },
    take: function (id) { if (!game) return; var i = game.inv.indexOf(id); if (i >= 0) game.inv.splice(i, 1); refreshHud(); },
    mission: function (id) { if (GS.flag('mision:' + id)) return; GS.flag('mision:' + id, 'activa'); toast('Nueva misión: ' + (MIS[id] ? MIS[id].name : id)); },
    complete: function (id) { GS.flag('mision:' + id, 'hecha'); toast('Misión completada: ' + (MIS[id] ? MIS[id].name : id)); },
    toast: function (t) { toast(t); },
    wait: function (sec) { var r = run; return new Promise(function (res) { if (r) r.waits.push({ t: sec, res: res }); else res(); }); },
    walkTo: function (x) { var r = run; return new Promise(function (res) { if (r) r.walk = { x: clampX(x), done: res }; else res(); }); },
    face: function (d) { P.dir = d < 0 ? -1 : 1; },
    cine: function (on) { cine(on); return API.wait(0.7); },
    sit: function (x) { if (x == null) { P.sit = null; P.frame = 1; } else { P.sit = { x: x }; P.x = x; P.vx = 0; P.dir = 1; } },
    eat: function (on) { if (run) run.eat = !!on; if (!on) npcs.forEach(function (o) { o.mouth = false; }); },
    fade: function (o, ms) { return fadeTo(o, ms || 600); }
  };
  function whoOf(id) {
    if (id === 'ethan') return { name: 'Ethan', src: 'sprites/ethan-sheet.png', sw: 384, fr: 0 };
    for (var i = 0; i < npcs.length; i++) if (npcs[i].d.id === id) return { name: npcs[i].d.name, src: npcs[i].d.sprite, sw: 336, fr: 1, npc: npcs[i] };
    return { name: id || '' };
  }
  function showLine(who, text, opts, res) {
    var w = whoOf(who);
    run.line = { w: w, text: text, n: 0, t: 0, opts: opts, sel: 0, shown: false, res: res };
    dlg.hidden = false; dAdv = false; stage.classList.add('talking');
    $('dname').textContent = w.name; $('dname').hidden = !w.name; $('dtext').textContent = '';
    var pt = $('dport'); pt.hidden = !w.src;
    if (w.src) { pt.style.backgroundImage = 'url(' + w.src + ')'; portrait(w, false); }
    $('dopts').innerHTML = ''; $('dnext').classList.remove('on');
  }
  function portrait(w, open) {
    var fr = w.npc ? (open ? 5 : 1) : w.fr, pt = $('dport');
    pt.style.backgroundSize = (w.sw * SCALE) + 'px ' + (48 * SCALE) + 'px';
    pt.style.backgroundPosition = (-(fr * 48 + 4) * SCALE) + 'px ' + (w.npc ? 2 * SCALE : -2 * SCALE) + 'px';
  }
  function finishLine(val) { var L = run.line; run.line = null; dlg.hidden = true; stage.classList.remove('talking'); $('dopts').innerHTML = ''; npcs.forEach(function (o) { o.mouth = false; }); L.res(val); }
  function lineStep(dt) {
    var L = run.line, len = L.text.length;
    L.t += dt;
    var n = Math.min(len, Math.floor(L.t * 42));
    if (n !== L.n) { L.n = n; $('dtext').textContent = L.text.slice(0, n); }
    var typing = L.n < len, w = L.w, adv = pressed.act || pressed.jump || pressed.ok || dAdv;
    if (w.npc) w.npc.mouth = typing && Math.floor(L.t / 0.11) % 2 === 0;
    if (w.src) portrait(w, w.npc ? w.npc.mouth : false);
    if (L.opts) {
      if (typing) { if (adv) L.t = len / 42 + 0.01; dAdv = false; return; }
      if (!L.shown) {
        L.shown = true; var box = $('dopts');
        L.opts.forEach(function (t, i) {
          var b = document.createElement('button'); b.textContent = t;
          b.onpointerenter = function () { L.sel = i; mark(); };
          b.onclick = function () { if (run && run.line === L) finishLine(i); };
          box.appendChild(b);
        });
        mark(); return;
      }
      if (pressed.jump) { L.sel = (L.sel + L.opts.length - 1) % L.opts.length; mark(); }
      if (pressed.down) { L.sel = (L.sel + 1) % L.opts.length; mark(); }
      if (pressed.act || pressed.ok) finishLine(L.sel);
      dAdv = false; return;
    }
    $('dnext').classList.toggle('on', !typing);
    if (adv) { dAdv = false; if (typing) L.t = len / 42 + 0.01; else finishLine(); }
    function mark() { $('dopts').querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('sel', i === L.sel); }); }
  }
  function scriptStep(dt) {
    if (run.walk) {
      var dd = run.walk.x - P.x;
      if (Math.abs(dd) > 1) { P.x += Math.sign(dd) * Math.min(Math.abs(dd), WALK * dt); P.dir = Math.sign(dd); P.dist += WALK * dt; P.frame = Math.floor(P.dist / 7) % 4; }
      else { P.x = run.walk.x; P.frame = 1; P.dist = 0; var cb = run.walk.done; run.walk = null; if (cb) cb(); }
    }
    if (!run) return;
    run.waits = run.waits.filter(function (w) { w.t -= dt; if (w.t <= 0) { w.res(); return false; } return true; });
    if (!run) return;
    if (run.eat) { npcs.forEach(function (o, i) { o.mouth = Math.sin(time * 9 + i * 2.1) > 0.35; }); P.eatF = Math.sin(time * 6.5) > 0.2 ? 1 : 0; }
    else P.eatF = 0;
    if (run.line) lineStep(dt);
  }

  // ---------------- cine, avisos, objetivos e inventario ----------------
  function cine(on) { stage.classList.toggle('cine', !!on); }
  function icon(el, id) {
    var it = ITEMS[id]; if (!it) return;
    el.style.backgroundImage = 'url(' + OBJ + ')';
    el.style.backgroundSize = (48 * 2) + 'px 32px'; el.style.backgroundPosition = (-it.icon * 32) + 'px 0';
  }
  function toast(text, id) {
    var t = document.createElement('div'); t.className = 'toast';
    if (id && ITEMS[id]) { var i = document.createElement('i'); icon(i, id); t.appendChild(i); }
    t.appendChild(document.createTextNode(text)); $('toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2600); setTimeout(function () { t.remove(); }, 3200);
  }
  var hudSig = '';
  function refreshHud() {
    var box = $('mis'), h = '';
    if (game) Object.keys(MIS).forEach(function (id) {
      if (game.flags['mision:' + id] !== 'activa') return;
      var m = MIS[id];
      h += '<div class="mt">' + esc(m.name) + '</div>';
      (m.steps || []).forEach(function (st) { h += '<div class="ms' + (avail({ when: st.done }) ? ' ok' : '') + '"><i></i>' + esc(st.text) + '</div>'; });
      (m.extra || []).forEach(function (st) { h += '<div class="ms ex' + (avail({ when: st.done }) ? ' ok' : '') + '"><i></i>' + esc(st.text) + '</div>'; });
    });
    if (h === hudSig) return; hudSig = h;
    box.innerHTML = h; box.hidden = !h;
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toggleInv(on) {
    var el = $('inv');
    if (on === undefined) on = el.hidden;
    if (on && state !== 'play') return;
    if (!on) { el.hidden = true; if (state === 'inv') state = 'play'; pressed = {}; return; }
    state = 'inv'; keys = {}; el.hidden = false;
    var l = $('invl'); l.innerHTML = '';
    if (!game || !game.inv.length) l.innerHTML = '<p class="iv0">No llevas nada encima.</p>';
    else game.inv.forEach(function (id) {
      var it = ITEMS[id] || { name: id }, row = document.createElement('div'); row.className = 'ivr';
      var i = document.createElement('i'); icon(i, id); row.appendChild(i);
      var d = document.createElement('div'), b = document.createElement('b'), p = document.createElement('span');
      b.textContent = it.name; p.textContent = it.desc || ''; d.appendChild(b); d.appendChild(p); row.appendChild(d); l.appendChild(row);
    });
  }
  $('invx').onclick = function () { toggleInv(false); };
  $('pinv').onclick = function () { pause(false); toggleInv(true); };

  // ---------------- fisica de Ethan ----------------
  var WALK = 82, RUN = 132, ACC = 950, AIR = 620, FRIC = 1100, G = 920, FALLG = 1.5, JUMP = 312, CUT = 190, MAXF = 480, JBUF = 0.15;
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
    P.buf -= dt; P.coyote = P.ground ? 0.1 : P.coyote - dt; P.drop -= dt;
    if (P.buf > 0 && keys.down && P.onPlat) { P.drop = 0.22; P.buf = 0; P.ground = false; P.onPlat = false; P.coyote = 0; }
    else if (P.buf > 0 && P.coyote > 0) { P.vy = -JUMP; P.buf = 0; P.coyote = 0; P.ground = false; }
    if (!keys.jump && P.vy < -CUT) P.vy = -CUT;
    P.vy = Math.min(MAXF, P.vy + G * (P.vy > 0 ? FALLG : 1) * dt);  // cae mas rapido de lo que sube: salto mas agil

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
    function layer(l, i) {
      var im = img(l.src); if (im) ctx.drawImage(im, -Math.round(cx * l.f), l.y || 0);
      fx.forEach(function (o) { if ((o.d.z == null ? scene.layers.length - 1 : o.d.z) === i) fxDraw(o, cx); });
    }
    scene.layers.forEach(function (l, i) { if (!l.front) layer(l, i); });
    npcs.forEach(function (o) {                       // personajes: miran hacia Ethan y parpadean
      var im = img(o.d.sprite); if (!im) return;
      var look = P.x < o.d.x - 14 ? 0 : P.x > o.d.x + 14 ? 2 : 1;
      var fr = o.mouth ? 4 + look : o.blink > 0 ? 3 : look;
      ctx.drawImage(im, fr * 48, 0, 48, 48, Math.round(o.d.x) - 24 - cx, o.d.top, 48, 48);
    });
    scene.layers.forEach(function (l, i) { if (l.front) layer(l, i); });
    var ob = img(OBJ);                                  // cosas puestas en el escenario (p. ej. la cena en la mesa)
    if (ob) (scene.props || []).forEach(function (pr) {
      if (!avail(pr) || !ITEMS[pr.item]) return;
      ctx.drawImage(ob, ITEMS[pr.item].icon * 16, 0, 16, 16, Math.round(pr.x) - 8 - cx, pr.y - 16, 16, 16);
    });
    // Ethan
    var e = img(ETHAN), es = img(SIT);
    if (P.sit && es) ctx.drawImage(es, (P.eatF || 0) * 48, 0, 48, 48, Math.round(P.x) - 24 - cx, Math.round(P.y) - 46, 48, 48);
    else if (e) {
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
    ctx.fillStyle = 'rgba(255,200,0,0.22)';
    npcs.forEach(function (o) { var r = o.d.reach || 22; ctx.fillRect(o.d.x - r - cx, scene.floor - 8, r * 2, 8); });
    ctx.fillStyle = 'rgba(255,90,255,0.3)';
    (scene.objects || []).forEach(function (o) { var r = o.reach || 16; ctx.fillRect(o.x - r - cx, scene.floor - 4, r * 2, 4); });
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
    if (pressed.inv && (state === 'play' || state === 'inv')) toggleInv();
    if (pressed.dev) { if (state === 'dev') closeDev(); else openDev(); }
    else if (pressed.menu) { if (state === 'inv') toggleInv(false); else if (state === 'dev') closeDev(); else if (state === 'play') pause(true); else if (state === 'pause') pause(false); }
    if (state === 'play' && scene) {
      // la pulsacion se guarda en el buffer aqui (no dentro del paso fijo) para no perderla
      // en pantallas de mas de 60 Hz, donde hay fotogramas sin ningun paso de fisica
      if (pressed.jump) P.buf = JBUF;
      acc += dt;
      while (acc >= STEP) { step(STEP); acc -= STEP; }
      camStep(dt); updatePrompt();
      if (game) { game.play = (game.play || 0) + dt; saveT += dt; if (saveT > 10) { saveT = 0; writeSave(); } }
    } else if (state === 'talk' && run) { acc = 0; P.vx = 0; scriptStep(dt); camStep(dt); if (game) game.play = (game.play || 0) + dt; }
    else acc = 0;
    npcs.forEach(function (o) { o.blinkT -= dt; if (o.blinkT <= 0) { o.blink = 0.13; o.blinkT = 2 + Math.random() * 3.5; } o.blink -= dt; });
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
