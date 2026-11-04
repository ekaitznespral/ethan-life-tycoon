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
    Backquote: 'dev', F1: 'dev', F3: 'edit', KeyI: 'inv', Tab: 'inv', KeyJ: 'diary'
  };
  var DEV = !!window.STORY_DEV;
  var keys = {}, pressed = {};
  var skipCard = false;
  function press(a) { if (!keys[a]) pressed[a] = true; keys[a] = true; if (a === 'jump' || a === 'ok' || a === 'act') skipCard = true; }
  addEventListener('keydown', function (e) {
    var a = MAP[e.code]; if (!a) return;
    var tag = e.target && e.target.tagName;
    if (tag === 'TEXTAREA' || ((tag === 'SELECT' || tag === 'INPUT') && a !== 'dev' && a !== 'menu')) return; // deja escribir y usar los desplegables
    if (!DEV && (a === 'dev' || a === 'debug' || a === 'edit')) return;
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
  var SLOTS = 3, slot = 0, game = null, saveT = 0, lastSaved = '';
  function slotKey(n) { return 'elt-historia-slot' + n; }
  function rawSlot(n) { try { return JSON.parse(localStorage.getItem(slotKey(n))); } catch (e) { return null; } }
  function readSlot(n) { var d = rawSlot(n); return d && !d.del && SCENES[d.scene] ? d : null; }
  function newData() { return { v: 2, scene: null, x: null, y: null, dir: 1, created: Date.now(), t: Date.now(), play: 0, flags: {}, inv: [] }; }
  function writeSave() {
    if (!slot || !game || !sceneId) return;
    game.scene = sceneId; game.x = Math.round(P.x); game.y = Math.round(P.y); game.dir = P.dir;
    var body = slot + JSON.stringify(Object.assign({}, game, { t: 0, play: Math.round(game.play || 0) }));
    if (body === lastSaved) return;          // nada ha cambiado: no se toca la hora (asi un borrado en otro dispositivo no "resucita")
    lastSaved = body; game.t = Date.now();
    try { localStorage.setItem(slotKey(slot), JSON.stringify(game)); } catch (e) { }
    cloudSoon();
  }
  function deleteSlot(n) { // se deja una "lapida" con la hora para que el borrado tambien llegue a la nube
    try { localStorage.setItem(slotKey(n), JSON.stringify({ del: 1, t: Date.now() })); } catch (e) { }
    if (n === slot) { slot = 0; game = null; }
    cloudSoon(1);
  }

  // ---------------- nube: las partidas se guardan tambien en tu cuenta ----------------
  // Usa la sesion del tycoon (misma web) y la tabla "historia" de Supabase (ver story/historia.sql).
  // Sin sesion, sin conexion o sin la tabla, se sigue guardando en este navegador.
  var SB_URL = 'https://cpmkytdzdnpwbasolawe.supabase.co', SB_KEY = 'sb_publishable_-0W9FnZULlBbz8kQRfL5bQ_uBA5bkY8'; // los mismos que index.html
  var SB = null, uid = null, cst = 'local', cBusy = null, cAgain = false, cTimer = 0;
  function kaFetch(u, o) { try { if (o && typeof o.body === 'string' && document.visibilityState === 'hidden') o = Object.assign({}, o, { keepalive: true }); } catch (e) { } return fetch(u, o); }
  try { if (window.supabase) SB = supabase.createClient(SB_URL, SB_KEY, { global: { fetch: kaFetch } }); } catch (e) { SB = null; }
  var CST = {
    local: 'Se guarda en este navegador.',
    nologin: 'Sin sesión: entra en el tycoon con tu cuenta para guardar también en la nube.',
    ok: '☁ Guardado en tu cuenta.',
    off: 'Sin conexión: se guarda aquí y se subirá al volver.',
    notable: 'Falta crear la tabla "historia" en Supabase (story/historia.sql). De momento, solo en este navegador.',
    err: 'No se pudo sincronizar con la nube. Se guarda en este navegador.'
  };
  function setCst(k) { cst = k; var el = $('sst'); if (el) { el.textContent = CST[k] || ''; el.className = 'sst ' + k; } }
  function cloudSoon(now) {
    if (!SB || !uid) return;
    clearTimeout(cTimer); cTimer = setTimeout(cloudSync, now ? 300 : 8000);
  }
  function cloudSync() {
    if (!SB || !uid) return Promise.resolve();
    if (cBusy) { cAgain = true; return cBusy; }
    clearTimeout(cTimer);
    cBusy = SB.from('historia').select('slots').eq('id', uid).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      var remote = (r.data && r.data.slots) || {}, out = {}, changed = false, push = !r.data;
      for (var n = 1; n <= SLOTS; n++) {
        var L = rawSlot(n), R = remote[n];
        if (R && (!L || (+R.t || 0) > (+L.t || 0))) {              // la de la nube es mas nueva
          if (n === slot && game && state !== 'menu') { push = true; out[n] = L; continue; } // la partida en juego manda
          try { localStorage.setItem(slotKey(n), JSON.stringify(R)); } catch (e) { }
          out[n] = R; changed = true;
        } else { out[n] = L || R || null; if (L && (!R || (+L.t || 0) > (+R.t || 0))) push = true; }
      }
      if (changed && !$('slots').hidden) showSlots();
      if (!push) return;
      return SB.from('historia').upsert({ id: uid, slots: out, ts: Date.now() }).then(function (w) { if (w.error) throw w.error; });
    }).then(function () { setCst('ok'); }, function (e) {
      var m = String((e && (e.message || e.code)) || e);
      setCst(/PGRST205|42P01|does not exist|schema cache/i.test(m + (e && e.code)) ? 'notable' : /fetch|network|timeout|abort|load failed/i.test(m) ? 'off' : 'err');
      if (cst === 'err') console.warn('[historia] nube:', m);
    }).then(function () { cBusy = null; if (cAgain) { cAgain = false; return cloudSync(); } });
    return cBusy;
  }
  if (SB) {
    SB.auth.getSession().then(function (r) {
      var ses = r && r.data && r.data.session; uid = ses ? ses.user.id : null;
      if (uid) cloudSync(); else setCst('nologin');
    }, function () { setCst('local'); });
    addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { if (state === 'play' || state === 'talk') writeSave(); if (uid) cloudSync(); } });
  } else setCst('local');
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
    var prev = state; state = 'loading'; hidePrompt(); stopScript(); thoughts = {};
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
    stopScript(); closeEditor(); $('inv').hidden = true; $('diario').hidden = true; $('mis').hidden = true; hudSig = ''; thoughts = {};
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
    setCst(cst);
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
    if (on && state === 'play') { state = 'pause'; writeSave(); cloudSoon(1); screen('pause'); $('pcont').focus(); keys = {}; }
    else if (!on && state === 'pause') { state = 'play'; screen(null); pressed = {}; }
  }
  $('card').addEventListener('pointerdown', function () { skipCard = true; });
  $('mplay').onclick = showSlots; $('sback').onclick = showMenu;
  $('pcont').onclick = function () { pause(false); };
  $('pmenu').onclick = function () { writeSave(); cloudSoon(1); showMenu(); };
  $('mdev').onclick = $('pdev').onclick = function () { openDev(); };
  $('ped').onclick = function () { pause(false); toggleEdit(true); };
  if (!DEV) ['mdev', 'pdev', 'ped'].forEach(function (id) { $(id).hidden = true; });

  // ---------------- panel de desarrollador (tecla º o F1) ----------------
  var devPrev = null;
  function openDev() {
    if (!DEV) return;
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
    runFn(fn, npc, name);
  }
  function runFn(fn, npc, name) {
    run = { line: null, walk: null, waits: [], eat: false, think: [] };
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
    run.think.forEach(function (t) { thoughts[t.owner] = { text: t.text, t: THINK_SECS }; });
    run = null; dlg.hidden = true; stage.classList.remove('talking'); $('dopts').innerHTML = ''; npcs.forEach(function (o) { o.mouth = false; });
    if (state === 'talk') state = 'play';
    P.buf = 0; pressed = {}; writeSave(); refreshHud();
  }
  function stopScript() { if (run) { run = null; dlg.hidden = true; $('dopts').innerHTML = ''; } stage.classList.remove('talking'); P.sit = null; cine(false); npcs.forEach(function (o) { o.mouth = false; }); }
  var API = {
    flag: GS.flag, has: GS.has,
    say: function (who, text) { return new Promise(function (res) { showLine(who, text, null, res); }); },
    talk: async function (key) {   // dialogo de story/dialogos.js
      var d = TEXT[key];
      if (!d) { console.warn('[historia] falta el dialogo', key); return; }
      for (var i = 0; i < (d.lines || []).length; i++) await API.say(d.lines[i].who, d.lines[i].text);
      if (d.piensa && run) run.think.push({ owner: key.split('.')[0], text: d.piensa });
    },
    choose: function (who, text, opts) { return new Promise(function (res) { showLine(who, text, opts, res); }); },
    give: function (id) { if (!game || GS.has(id)) return; game.inv.push(id); toast('+ ' + (ITEMS[id] ? ITEMS[id].name : id), id); sfx('objeto'); refreshHud(); },
    take: function (id) { if (!game) return; var i = game.inv.indexOf(id); if (i >= 0) game.inv.splice(i, 1); refreshHud(); },
    mission: function (id) { if (GS.flag('mision:' + id)) return; GS.flag('mision:' + id, 'activa'); questBanner('nueva', id); },
    complete: function (id) { GS.flag('mision:' + id, 'hecha'); questBanner('hecha', id); },
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
    if (id === 'ethan') return { name: 'Ethan', src: 'sprites/ethan-sheet.png', sw: 384, fr: 0, voice: 300 };
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
    if (n !== L.n) {
      if (n > L.n && n % 2 === 0 && /\S/.test(L.text[n - 1] || '')) voice(L.w);
      L.n = n; $('dtext').textContent = L.text.slice(0, n);
    }
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
          b.onclick = function () { if (run && run.line === L) { sfx('ok'); finishLine(i); } };
          box.appendChild(b);
        });
        mark(); return;
      }
      if (pressed.jump) { L.sel = (L.sel + L.opts.length - 1) % L.opts.length; mark(); sfx('sel'); }
      if (pressed.down) { L.sel = (L.sel + 1) % L.opts.length; mark(); sfx('sel'); }
      if (pressed.act || pressed.ok) { sfx('ok'); finishLine(L.sel); }
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
      h += '<div class="mt ' + (m.type === 'secundaria' ? 'side' : 'main') + '"><i></i>' + esc(m.name) + '</div>';
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

  // ---------------- diario de misiones (J o desde la pausa) ----------------
  function toggleDiary(on) {
    var el = $('diario');
    if (on === undefined) on = el.hidden;
    if (on && state !== 'play') return;
    if (!on) { el.hidden = true; if (state === 'diary') state = 'play'; pressed = {}; return; }
    state = 'diary'; keys = {}; el.hidden = false;
    var box = $('dial'); box.innerHTML = '';
    [['activa', 'En curso'], ['hecha', 'Completadas']].forEach(function (g) {
      var ids = Object.keys(MIS).filter(function (id) { return game && game.flags['mision:' + id] === g[0]; });
      var h = document.createElement('div'); h.className = 'dgt'; h.textContent = g[1] + ' (' + ids.length + ')'; box.appendChild(h);
      if (!ids.length) { var e = document.createElement('p'); e.className = 'iv0'; e.textContent = g[0] === 'activa' ? 'No tienes misiones en curso.' : 'Todavía ninguna.'; box.appendChild(e); }
      ids.forEach(function (id) {
        var m = MIS[id], c = document.createElement('div'); c.className = 'dgm ' + (m.type === 'secundaria' ? 'side' : 'main') + (g[0] === 'hecha' ? ' done' : '');
        var t = document.createElement('b'); t.innerHTML = '<i></i>'; t.appendChild(document.createTextNode(m.name));
        var k = document.createElement('small'); k.textContent = m.type === 'secundaria' ? 'Misión secundaria' : 'Misión principal';
        c.appendChild(t); c.appendChild(k);
        if (m.desc) { var d = document.createElement('p'); d.textContent = m.desc; c.appendChild(d); }
        (m.steps || []).concat(m.extra || []).forEach(function (st, i) {
          var ok = g[0] === 'hecha' && i < (m.steps || []).length || avail({ when: st.done });
          var r = document.createElement('div'); r.className = 'ms' + (ok ? ' ok' : '') + (i >= (m.steps || []).length ? ' ex' : '');
          r.innerHTML = '<i></i>'; r.appendChild(document.createTextNode(st.text)); c.appendChild(r);
        });
        box.appendChild(c);
      });
    });
  }
  $('diax').onclick = function () { toggleDiary(false); };
  $('pdia').onclick = function () { pause(false); toggleDiary(true); };

  // ---------------- sonido (sintetizado, sin archivos) ----------------
  // Comparte el silencio con el tycoon (elt_mute).
  var AC = null, master = null, muted = false;
  try { muted = localStorage.getItem('elt_mute') === '1'; } catch (e) { }
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination); } catch (e) { AC = null; } }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }
  addEventListener('pointerdown', ac); addEventListener('keydown', ac);
  function tn(f, t, d, type, v, f2) {
    var a = ac(); if (!a || muted) return;
    var o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + t;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + 0.05);
  }
  function bell(f, t, d, v) { tn(f, t, d, 'triangle', v); tn(f * 2, t, d * 0.7, 'sine', v * 0.35); tn(f * 3.01, t, d * 0.4, 'sine', v * 0.12); }
  var SFX = {
    principal: function () { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { bell(f, i * 0.12, 1.1, 0.14); }); bell(1318.5, 0.36, 1.4, 0.09); tn(261.63, 0.34, 1.8, 'sine', 0.09); tn(392, 0.34, 1.8, 'sine', 0.05); },
    secundaria: function () { bell(783.99, 0, 0.8, 0.12); bell(1174.66, 0.13, 1.1, 0.11); tn(392, 0.12, 1.2, 'sine', 0.05); },
    hecha: function () { [392, 523.25, 659.25].forEach(function (f, i) { bell(f, i * 0.1, 0.5, 0.12); }); [523.25, 659.25, 783.99, 1046.5].forEach(function (f) { bell(f, 0.38, 1.7, 0.08); }); tn(130.81, 0.38, 1.9, 'sine', 0.12); },
    objeto: function () { tn(880, 0, 0.12, 'triangle', 0.1, 1320); tn(1760, 0.09, 0.25, 'sine', 0.06); },
    sel: function () { tn(660, 0, 0.05, 'triangle', 0.05); },
    ok: function () { tn(880, 0, 0.07, 'triangle', 0.07); tn(1320, 0.05, 0.09, 'triangle', 0.05); }
  };
  function sfx(k) { if (SFX[k] && !muted) SFX[k](); }
  function voice(w) { // pitidos al hablar: cada personaje con su tono
    var f = w.voice || (w.npc && w.npc.d.voice); if (!f || muted) return;
    tn(f * (0.92 + Math.random() * 0.16), 0, 0.05, 'square', 0.022);
  }
  function setMute(m) { muted = m; try { localStorage.setItem('elt_mute', m ? '1' : '0'); } catch (e) { } $('psnd').textContent = 'Sonido: ' + (m ? 'No' : 'Sí'); }
  $('psnd').onclick = function () { setMute(!muted); if (!muted) sfx('ok'); };
  setMute(muted);

  // ---------------- aviso de mision (estilo "nueva mision" centrado) ----------------
  var questQ = [], questOn = false;
  function questBanner(kind, id) { questQ.push({ kind: kind, id: id }); if (!questOn) nextQuest(); }
  function nextQuest() {
    var q = questQ.shift(), el = $('quest');
    if (!q) { questOn = false; return; }
    questOn = true;
    var m = MIS[q.id] || { name: q.id }, main = m.type !== 'secundaria';
    el.className = (main ? 'main' : 'side') + ' ' + q.kind;
    $('qlab').textContent = q.kind === 'hecha' ? 'Misión completada' : main ? 'Misión principal' : 'Misión secundaria';
    $('qtit').textContent = m.name;
    el.hidden = false; void el.offsetWidth; el.classList.add('go');
    sfx(q.kind === 'hecha' ? 'hecha' : main ? 'principal' : 'secundaria');
    setTimeout(function () { el.classList.add('out'); }, 3400);
    setTimeout(function () { el.hidden = true; el.className = ''; nextQuest(); }, 4100);
  }

  // ---------------- pensamientos (bocadillo despues de hablar) ----------------
  var thoughts = {}, THINK_SECS = 8, thinkEl = $('think'), thinkCur = null;
  function thinkStep(dt) {
    var show = null;
    Object.keys(thoughts).forEach(function (k) { thoughts[k].t -= dt; if (thoughts[k].t <= 0) delete thoughts[k]; });
    if (state === 'play') npcs.forEach(function (n) {
      var th = thoughts[n.d.id]; if (th && Math.abs(P.x - n.d.x) < 90 && Math.abs(P.y - scene.floor) < 40) show = { n: n, th: th };
    });
    if (show) {
      if (thinkCur !== show.th) { thinkCur = show.th; thinkEl.firstChild.textContent = show.th.text; }
      thinkEl.style.left = ((show.n.d.x + 6 - Math.round(cam.x)) * SCALE) + 'px';
      thinkEl.style.top = ((show.n.d.top + 6) * SCALE) + 'px';
      thinkEl.classList.add('on');
    } else { thinkEl.classList.remove('on'); thinkCur = null; }
  }

  // ---------------- editor rapido de dialogos (solo desarrollador, F3) ----------------
  // Clic en un personaje u objeto para editar sus textos. Los cambios se guardan en este
  // navegador al momento; "Descargar dialogos.js" da el archivo para sustituir en story/.
  var TEXT_KEY = 'elt-historia-textos', TEXT_FILE = JSON.parse(JSON.stringify(window.STORY_TEXT || {})), TEXT = JSON.parse(JSON.stringify(TEXT_FILE));
  if (DEV) try { var ov = localStorage.getItem(TEXT_KEY); if (ov) TEXT = JSON.parse(ov); } catch (e) { }
  var editing = false, edOwner = null, edPrev = null;
  function toggleEdit(on) {
    if (!DEV) return;
    editing = on === undefined ? !editing : on;
    stage.classList.toggle('editing', editing);
    if (!editing) closeEditor();
    toast(editing ? 'Editor de diálogos: haz clic en un personaje u objeto' : 'Editor de diálogos cerrado');
  }
  cv.addEventListener('pointerdown', function (e) {
    if (!editing || !scene || (state !== 'play' && state !== 'edit')) return;
    var r = cv.getBoundingClientRect(), wx = (e.clientX - r.left) / SCALE + Math.round(cam.x), wy = (e.clientY - r.top) / SCALE, hit = null;
    npcs.forEach(function (n) { if (Math.abs(wx - n.d.x) < 14 && wy > n.d.top + 6 && wy < n.d.top + 36) hit = { id: n.d.id, name: n.d.name, npc: n }; });
    if (!hit) (scene.objects || []).forEach(function (o) { var rr = o.reach || 16; if (Math.abs(wx - o.x) < rr && wy > scene.floor - 70 && wy < scene.floor + 4) hit = { id: o.id, name: o.name || o.id }; });
    if (hit) { e.preventDefault(); openEditor(hit); }
  });
  function openEditor(h) {
    if (state !== 'edit') { edPrev = state; state = 'edit'; keys = {}; }
    edOwner = h; $('ed').hidden = false; renderEditor();
  }
  function closeEditor() {
    $('ed').hidden = true; edOwner = null;
    if (state === 'edit') { state = edPrev || 'play'; edPrev = null; pressed = {}; }
  }
  function saveText() {
    try { localStorage.setItem(TEXT_KEY, JSON.stringify(TEXT)); } catch (e) { }
    edStatus();
  }
  function edStatus() {
    var dirty = serializeText(TEXT) !== serializeText(TEXT_FILE);
    $('edst').textContent = dirty ? 'Hay cambios guardados en este navegador que aún no están en el proyecto.' : 'Sin cambios: igual que story/dialogos.js.';
    $('edst').classList.toggle('dirty', dirty);
  }
  function whoChoices() {
    var l = [['ethan', 'Ethan']];
    npcs.forEach(function (n) { l.push([n.d.id, n.d.name]); });
    (scene.objects || []).forEach(function (o) { if (o.name) l.push([o.name, o.name]); });
    l.push(['', '(sin nombre)']);
    return l;
  }
  function renderEditor() {
    var box = $('edl'), own = edOwner, keysOf = Object.keys(TEXT).filter(function (k) { return k.split('.')[0] === own.id; });
    $('edt').textContent = own.name; box.innerHTML = '';
    if (!keysOf.length) box.innerHTML = '<p class="edh">Todavía no tiene diálogos. Crea uno abajo y dime en qué momento debe decirlo.</p>';
    keysOf.forEach(function (k) {
      var d = TEXT[k]; if (!d.lines) d.lines = [];
      var sec = document.createElement('div'); sec.className = 'eds';
      var hd = document.createElement('div'); hd.className = 'edk';
      var kb = document.createElement('b'); kb.textContent = k.split('.').slice(1).join('.'); hd.appendChild(kb);
      var pb = document.createElement('button'); pb.textContent = '▶ Probar'; pb.onclick = function () { closeEditor(); runFn(function (s) { return s.talk(k); }, own.npc, 'editor'); }; hd.appendChild(pb);
      var xb = document.createElement('button'); xb.textContent = '✕'; xb.title = 'Borrar este diálogo'; xb.className = 'del';
      xb.onclick = function () { if (confirm('¿Borrar el diálogo "' + k + '"?')) { delete TEXT[k]; saveText(); renderEditor(); } }; hd.appendChild(xb);
      sec.appendChild(hd);
      d.lines.forEach(function (L, i) {
        var row = document.createElement('div'); row.className = 'edr';
        var sel = document.createElement('select'), wc = whoChoices();
        if (L.who && !wc.some(function (w) { return w[0] === L.who; })) wc.unshift([L.who, L.who]);
        wc.forEach(function (w) { var o = document.createElement('option'); o.value = w[0]; o.textContent = w[1]; sel.appendChild(o); });
        sel.value = L.who || ''; sel.onchange = function () { L.who = sel.value || null; saveText(); };
        var ta = document.createElement('textarea'); ta.rows = 2; ta.value = L.text; ta.oninput = function () { L.text = ta.value; saveText(); };
        var tools = document.createElement('span');
        [['↑', -1], ['↓', 1]].forEach(function (m) {
          var b = document.createElement('button'); b.textContent = m[0];
          b.onclick = function () { var j = i + m[1]; if (j < 0 || j >= d.lines.length) return; var t = d.lines[i]; d.lines[i] = d.lines[j]; d.lines[j] = t; saveText(); renderEditor(); };
          tools.appendChild(b);
        });
        var rb = document.createElement('button'); rb.textContent = '✕'; rb.className = 'del'; rb.onclick = function () { d.lines.splice(i, 1); saveText(); renderEditor(); }; tools.appendChild(rb);
        row.appendChild(sel); row.appendChild(ta); row.appendChild(tools); sec.appendChild(row);
      });
      var add = document.createElement('button'); add.textContent = '+ Línea'; add.className = 'edadd';
      add.onclick = function () { d.lines.push({ who: own.npc ? own.id : 'ethan', text: '' }); saveText(); renderEditor(); };
      sec.appendChild(add);
      if (own.npc) {
        var tl = document.createElement('label'); tl.textContent = 'Piensa después (bocadillo, opcional)';
        var tt = document.createElement('textarea'); tt.rows = 2; tt.value = d.piensa || ''; tt.placeholder = 'p. ej. Pues una hamburguesa ya me metía...';
        tt.oninput = function () { if (tt.value.trim()) d.piensa = tt.value; else delete d.piensa; saveText(); };
        tl.appendChild(tt); sec.appendChild(tl);
      }
      box.appendChild(sec);
    });
    edStatus();
  }
  $('ednew').onclick = function () {
    var n = prompt('Nombre del nuevo diálogo (por ejemplo: tras_cena)'); if (!n) return;
    n = n.trim().replace(/\s+/g, '_').replace(/[^\wáéíóúñü.-]/gi, ''); if (!n) return;
    var k = edOwner.id + '.' + n; if (TEXT[k]) { alert('Ya existe ' + k); return; }
    TEXT[k] = { lines: [{ who: edOwner.npc ? edOwner.id : 'ethan', text: '' }] }; saveText(); renderEditor();
  };
  $('edx').onclick = closeEditor;
  $('eddl').onclick = function () {
    var b = new Blob([serializeText(TEXT)], { type: 'text/javascript' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'dialogos.js'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  };
  $('edcp').onclick = function () {
    var t = serializeText(TEXT);
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Copiado al portapapeles'); }, function () { prompt('Copia el texto:', t); });
  };
  $('edrs').onclick = function () {
    if (!confirm('¿Descartar los cambios de este navegador y volver a story/dialogos.js?')) return;
    try { localStorage.removeItem(TEXT_KEY); } catch (e) { }
    TEXT = JSON.parse(JSON.stringify(TEXT_FILE)); renderEditor();
  };
  var TEXT_HEAD = [
    '// Textos del Modo Historia. Se pueden editar a mano o con el editor rapido',
    '// (modo desarrollador: tecla F3 y clic en un personaje u objeto). El editor descarga',
    '// este mismo archivo con los cambios: basta con sustituirlo en story/.',
    '//',
    '// Cada clave es "dueño.momento" (el dueño es un personaje u objeto del escenario).',
    '//  - lines: lo que se dice. who = \'ethan\', el id de un personaje, o null (narrador / sin nombre).',
    '//  - piensa: (opcional) bocadillo de pensamiento que el personaje muestra unos segundos',
    '//    despues de la conversacion, cuando Ethan esta cerca. No se puede interactuar con el.',
    '// Los guiones (story/scenes.js) deciden que clave toca en cada momento.'
  ].join('\n');
  function serializeText(T) {
    var ks = Object.keys(T);
    return TEXT_HEAD + '\nwindow.STORY_TEXT = {\n' + ks.map(function (k, i) {
      var d = T[k], out = '  ' + JSON.stringify(k) + ': {\n    "lines": [\n' +
        (d.lines || []).map(function (L) { return '      { "who": ' + JSON.stringify(L.who == null ? null : L.who) + ', "text": ' + JSON.stringify(L.text) + ' }'; }).join(',\n') +
        '\n    ]' + (d.piensa ? ',\n    "piensa": ' + JSON.stringify(d.piensa) : '') + '\n  }';
      return out + (i < ks.length - 1 ? ',' : '');
    }).join('\n') + '\n};\n';
  }
  window.__serializeText = function () { return serializeText(TEXT); }; // para pruebas

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

    var py = P.y, vyIn = P.vy, wasG = P.ground; P.y += P.vy * dt; P.ground = false; P.onPlat = false;
    if (P.vy >= 0) {
      if (P.y >= scene.floor) { P.y = scene.floor; P.vy = 0; P.ground = true; }
      if (P.drop <= 0) (scene.platforms || []).forEach(function (p) {
        if (P.x + hw > p.x && P.x - hw < p.x + p.w && py <= p.y + 0.5 && P.y >= p.y) { P.y = p.y; P.vy = 0; P.ground = true; P.onPlat = true; }
      });
    }
    if (!wasG && P.ground && vyIn > 150) dust(P.x, P.y, Math.min(1, (vyIn - 150) / 250));
    // animacion: 4 fotogramas de paseo (1 y 3 = piernas juntas)
    if (!P.ground) P.frame = 2;
    else if (Math.abs(P.vx) > 4) { P.dist += Math.abs(P.vx) * dt; P.frame = Math.floor(P.dist / 7) % 4; }
    else { P.frame = 1; P.dist = 0; }
  }
  // polvo discreto al aterrizar: unas motas que se abren a los lados y se desvanecen
  var motes = [];
  function dust(x, y, k) {
    var n = 4 + Math.round(k * 4);
    for (var i = 0; i < n; i++) {
      var sd = i % 2 ? 1 : -1;
      motes.push({ x: x + sd * (2 + Math.random() * 4), y: y - Math.random() * 1.5, vx: sd * (14 + Math.random() * 26 * (0.5 + k)), vy: -(4 + Math.random() * 10), l: 0.3 + Math.random() * 0.2, ml: 0.5 });
    }
  }
  function dustStep(dt) {
    for (var i = motes.length - 1; i >= 0; i--) {
      var m = motes[i]; m.l -= dt; if (m.l <= 0) { motes.splice(i, 1); continue; }
      m.vx *= 1 - 5 * dt; m.vy += 30 * dt; m.x += m.vx * dt; m.y = Math.min(m.y + m.vy * dt, P.ground ? P.y : m.y + m.vy * dt);
    }
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
    // polvo y Ethan
    if (motes.length) {
      ctx.fillStyle = scene.dust || '#d8cbb2';
      motes.forEach(function (m) { ctx.globalAlpha = Math.max(0, m.l / m.ml) * 0.55; ctx.fillRect(Math.round(m.x) - cx, Math.round(m.y) - 1, 1, 1); });
      ctx.globalAlpha = 1;
    }
    var e = img(ETHAN), es = img(SIT);
    if (P.sit && es) ctx.drawImage(es, (P.eatF || 0) * 48, 0, 48, 48, Math.round(P.x) - 24 - cx, Math.round(P.y) - 46, 48, 48);
    else if (e) {
      var dx = Math.round(P.x) - cx, dy = Math.round(P.y) - 46;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; if (P.ground) ctx.fillRect(dx - 8, Math.round(P.y) - 1, 16, 2);
      if (P.dir > 0) ctx.drawImage(e, P.frame * 48, 0, 48, 48, dx - 24, dy, 48, 48);
      else { ctx.save(); ctx.translate(dx + 24, dy); ctx.scale(-1, 1); ctx.drawImage(e, P.frame * 48, 0, 48, 48, 0, 0, 48, 48); ctx.restore(); }
    }
    if (debug) drawDebug(cx);
    if (editing) {
      ctx.setLineDash([2, 2]); ctx.strokeStyle = '#ff5ad1'; ctx.lineWidth = 1; ctx.font = '7px monospace'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#ff5ad1';
      npcs.forEach(function (n) { var x = Math.round(n.d.x) - 13 - cx + 0.5, y = n.d.top + 8.5; ctx.strokeRect(x, y, 26, 26); ctx.fillText('✎ ' + n.d.name, x, y - 1); });
      (scene.objects || []).forEach(function (o) { var rr = o.reach || 16, x = Math.round(o.x - rr) - cx + 0.5, y = scene.floor - 60.5; ctx.strokeRect(x, y, rr * 2, 60); ctx.fillText('✎ ' + (o.name || o.id), x, y - 1); });
      ctx.setLineDash([]);
    }
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
    if (pressed.edit) toggleEdit();
    if (pressed.inv && (state === 'play' || state === 'inv')) toggleInv();
    if (pressed.diary && (state === 'play' || state === 'diary')) toggleDiary();
    if (pressed.dev) { if (state === 'dev') closeDev(); else openDev(); }
    else if (pressed.menu) { if (state === 'edit') closeEditor(); else if (state === 'inv') toggleInv(false); else if (state === 'diary') toggleDiary(false); else if (state === 'dev') closeDev(); else if (state === 'play') pause(true); else if (state === 'pause') pause(false); }
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
    if (scene) { thinkStep(dt); if (state === 'play' || state === 'talk') dustStep(dt); }
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
