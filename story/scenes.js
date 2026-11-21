// Modo Historia: datos de la historia y de cada escenario.
// El motor (story/engine.js) no sabe nada de la historia: todo sale de aqui.
//
// Medidas en pixeles de la resolucion interna (la pantalla mide 384x216).
//  - w: ancho total del escenario. floor: altura del suelo (los pies de Ethan).
//  - layers: capas de fondo, de atras hacia delante. f = velocidad respecto a la camara
//    (0 = quieta, 1 = se mueve con el escenario). Ancho minimo de una capa: 384 + (w-384)*f.
//  - platforms: superficies a las que se puede subir saltando (se atraviesan por debajo;
//    S + salto para bajarse). {x, y, w}.
//  - spawns: puntos donde aparece Ethan. exits: zonas con [E] que llevan a otro escenario
//    (when(g) para abrirlas solo a partir de un momento; locked = guion si aun no se puede).
//  - fx: efectos animados. z = indice de la capa tras la que se pintan. when(g) para que solo salgan
//    a partir de un momento. Los fuegos con light iluminan la escena con el color de cada explosion.
//  - Una capa con front: true se pinta delante de los personajes (p. ej. la mesa).
//  - npcs: personajes. x = centro, top = y de la parte de arriba del sprite (48x48, 7 fotogramas),
//    run = guion que se ejecuta al hablarle, reach = distancia para poder hablarle,
//    voice = tono de la voz (Hz) de los pitidos al hablar.
//  - objects: cosas con las que se interactua. label = texto del [E], run = guion,
//    when(g) = condicion para que aparezca (g.flag('x'), g.has('objeto')).
//  - props: objetos de STORY.items pintados en el escenario cuando se cumple when(g).
// Con F2 dentro del juego se ven las plataformas, las salidas y la X de Ethan.
//
// GUIONES: funciones async que reciben "s":
//   await s.talk('dueño.momento')        dice el dialogo de story/dialogos.js (y su "piensa")
//   await s.say(quien, texto)            quien: 'ethan', id de personaje, otro nombre o null
//   await s.choose(quien, texto, [..])   devuelve el indice elegido
//   s.flag(k) / s.flag(k, valor)         leer / poner una marca de la partida (null la borra)
//   s.has(id) / s.give(id) / s.take(id)  inventario (STORY.items)
//   s.mission(id) / s.complete(id)       empezar / terminar una mision (STORY.missions: name, type, desc, steps, extra)
//   await s.cine(true|false)             bandas negras de cine
//   await s.walkTo(x) · s.face(1|-1) · s.sit(x|null) · s.eat(true|false)
//   await s.wait(seg) · await s.fade(1|0, ms) · s.toast(texto) · await s.card(texto)
//   s.clock('00:20') / s.clock(null)    pone (o quita) el reloj de la partida
//   await s.phone('movil.x', 'Titulo')  el movil a pantalla completa con un chat
//   await s.go(escenario, aparicion)    cambia de escenario sin cortar el guion
//   s.fail(id)                           mision fallida (aviso en rojo)
//   await s.serve(objeto, x, flag)       Lourdes lo lleva volando a la mesa (x) y pone la flag
//   await s.chimes()                     los cuartos y las 12 campanadas (todos comen en cada una)

// Modo desarrollador: panel (º/F1), editor rapido de dialogos (F3) y depuracion (F2).
// En produccion: false, y desaparece todo eso.
window.STORY_DEV = true;

// Lineas de metro para el viaje (orden de las paradas en el sentido de la marcha). target = donde hay que
// bajarse; la parada siguiente es la de "nos hemos pasado". start = hora al salir de la primera.
var LINEAS = {
  L2: { color: '#c8ccd2', dir: 'Basauri', start: '01:15', target: 6,
        stations: ['Sestao', 'Urbinaga', 'Bagatza', 'Barakaldo', 'Ansio', 'Gurutzeta/Cruces', 'San Ignazio', 'Sarriko'] },
  L1: { color: '#f06a2a', dir: 'Plentzia', start: '01:31', target: 3,
        stations: ['San Ignazio', 'Lutxana', 'Erandio', 'Astrabudua', 'Leioa'] }
};
function horaViaje(L, i) { var p = L.start.split(':'), m = (+p[0]) * 60 + (+p[1]) + i * 2; return ('0' + Math.floor(m / 60) % 24).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
// El metro en marcha: ~7 s entre paradas, 4 s parado (12 s en la parada buena). Lo que pasa por la
// ventana, el plano de la linea y las puertas salen de aqui. Solo corre mientras se juega (no en dialogos).
var TRAMO = 900;
function viajeTick(s, dt) {
  var m = s.mem, L = LINEAS[s.flag('viaje:linea') || 'L2'], out = s.fxo('fuera'), map = s.fxo('plano');
  if (!out || !map) return;
  if (!m.init) {
    m.init = 1; m.i = s.flag('viaje:i') || 0; m.phase = s.flag('viaje:fase') || 'move'; m.t = 0;
    out.pos = m.i * TRAMO; out.v = 0; map.line = L;
    if (m.phase === 'stop') ['p1', 'p2'].forEach(function (id) { var d = s.fxo(id); if (d) d.open = 1; });
  }
  if (s.flag('en_astrabudua')) { m.phase = 'stop'; m.t = 0; }   // ya han llegado: el metro se queda ahi
  m.t += dt;
  if (m.phase === 'move') {
    var T = 7, k = Math.min(1, m.t / T), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    var j = k < 0.5 ? m.i : m.i + 1;
    out.pos = m.i * TRAMO + TRAMO * e; out.v = Math.sin(Math.PI * k) * 1.6;
    out.station = { u: j * TRAMO + 192, name: L.stations[j] };
    map.cur = m.i; map.next = m.i + 1; map.label = 'Próxima: ' + L.stations[m.i + 1];
    if (!m.warned && m.i + 1 === L.target && m.t > 2) { m.warned = 1; s.start('viaje_aviso'); }
    if (k >= 1) {
      m.i++; m.phase = 'stop'; m.t = 0; out.v = 0;
      s.flag('viaje:i', m.i); s.flag('viaje:fase', 'stop'); s.clock(horaViaje(L, m.i));
      s.sfx('puertas'); s.doors('p1', true); s.doors('p2', true);
      if (L === LINEAS.L2 && L.stations[m.i] === 'Barakaldo' && !s.flag('javi_sube')) s.start('javi_sube');
      else if (m.i === L.target) s.start('viaje_destino');
      else if (m.i > L.target) s.start('viaje_pasado');
    }
  } else {
    out.station = { u: m.i * TRAMO + 192, name: L.stations[m.i] }; out.pos = m.i * TRAMO;
    map.cur = m.i; map.next = null; map.label = L.stations[m.i];
    var wait = m.i === L.target ? 12 : 4;
    ['p1', 'p2'].forEach(function (id) { var d = s.fxo(id); if (d) d.blink = m.t > wait - 1.5; });
    if (m.t > wait && m.i < L.stations.length - 1) {
      ['p1', 'p2'].forEach(function (id) { var d = s.fxo(id); if (d) d.blink = false; });
      s.doors('p1', false); s.doors('p2', false); s.sfx('arranca');
      m.phase = 'move'; m.t = 0; m.warned = 0; s.flag('viaje:fase', 'move');
    }
  }
}

window.STORY = {
  intro: { cards: ['31 de diciembre de 2022'], scene: 'cocina', spawn: 'inicio' },

  // flag con lo que lleva bebido Ethan (0..3): cuanto mas, mas se tambalea la pantalla (3 = tajada del todo)
  borrachera: 'tajada', borracheraMax: 3,

  items: {
    tortilla: { name: 'Tortilla de Lourdes', icon: 0, desc: 'La tortilla de Lourdes. Para la cena.' },
    jamon: { name: 'Jamón', icon: 1, desc: 'Un jamón con su jamonero.' },
    langostinos: { name: 'Langostinos', icon: 2, desc: 'Los que pide la hermanastra.' },
    // solo se ven en la mesa (no van al inventario)
    uvas: { name: 'Uvas', icon: 3 },
    lacasitos: { name: 'Lacasitos', icon: 4 },
    nuggets: { name: 'Nuggets del Burger King', icon: 5 },
    destorni: { name: 'Destorni', icon: 7, desc: 'Fanta de naranja con vodka, en vaso de plástico. Lo ha preparado uno mismo.' },
    // solo se ven en la rotonda (no van al inventario)
    vodka: { name: 'Vodka', icon: 8 },
    fanta: { name: 'Fanta de naranja', icon: 9 },
    barik: { name: 'Barik', icon: 6, desc: 'La tarjeta del metro. Estaba en la cartera, en el escritorio.', flag: 'barik_cogida' }   // flag: se pone al darlo desde el panel
  },

  // La cuadrilla (Calentaos 4.0): walk = andando de lado, bust = retrato para dialogos y movil.
  // En los dialogos, who: 'ekaitz' (el id). alias = otros nombres con los que salen en el chat.
  people: {
    ekaitz: { name: 'Ekaitz', alias: ['ekabi'], walk: 'sprites/story/amigo-ekaitz.png', bust: 'sprites/story/busto-ekaitz.png', voice: 240 },
    manso: { name: 'Manso', walk: 'sprites/story/amigo-manso.png', bust: 'sprites/story/busto-manso.png', voice: 270 },
    sadaba: { name: 'Sadaba', walk: 'sprites/story/amigo-sadaba.png', bust: 'sprites/story/busto-sadaba.png', voice: 150 },
    lier: { name: 'Lier', walk: 'sprites/story/amigo-lier.png', bust: 'sprites/story/busto-lier.png', voice: 210 },
    javi: { name: 'Javi', walk: 'sprites/story/amigo-javi.png', bust: 'sprites/story/busto-javi.png', voice: 190 },
    igor: { name: 'Igor', walk: 'sprites/story/amigo-igor.png', bust: 'sprites/story/busto-igor.png', voice: 260 }
  },

  // Vistas de cerca: s.closeup('id') abre la imagen y devuelve el id de la zona elegida (o null).
  // spots: zonas en pixeles de la imagen; src = imagen propia de esa zona (desaparece si su when deja de cumplirse).
  views: {
    cartera: {
      title: 'Cartera de Ethan', src: 'sprites/story/cartera.png', w: 208, h: 120,
      spots: [
        { id: 'banco', label: 'Tarjeta del banco', x: 14, y: 12, w: 82, h: 22 },
        { id: 'dinero', label: 'Billete de 5 € y unas monedas', x: 12, y: 38, w: 86, h: 30 },
        { id: 'sanidad', label: 'Tarjeta sanitaria', x: 14, y: 74, w: 82, h: 38 },
        { id: 'barik', label: 'Barik', x: 121, y: 36, w: 70, h: 44, src: 'sprites/story/cartera-barik.png', when: function (g) { return !g.flag('barik_cogida'); } }
      ]
    }
  },

  // Reloj de la partida: aparece despues de la cena. rate = segundos reales por minuto de juego
  // (puede ser una funcion de la partida: durante la carrera al metro el reloj va mas despacio
  // para que de tiempo justo a ir, volver a casa a por la Barik y llegar).
  // events: guiones que saltan a una hora (una sola vez; se rearman borrando la flag "hora:<id>").
  clock: {
    rate: function (g) { return g.flag('mision:metro') === 'activa' ? 1.4 : g.flag('en_metro') ? 4 : g.flag('en_anden') ? 3 : 0.8; },
    events: [
      { id: 'campanadas', at: '23:59', run: 'campanadas', when: function (g) { return g.flag('cena_hecha'); } },
      { id: 'quedada', at: '00:30', run: 'quedada', when: function (g) { return g.flag('ano_nuevo'); } },
      { id: 'tren', at: '01:15', run: 'tren', when: function (g) { return g.flag('en_anden') && !g.flag('en_metro'); } },
      { id: 'metro_perdido', at: '01:15', run: 'metro_perdido', when: function (g) { return g.flag('mision:metro') === 'activa'; } }
    ]
  },

  missions: {
    cena: {
      name: 'La cena de Nochevieja', type: 'principal',   // principal | secundaria
      desc: 'Es Nochevieja y la familia ya está a la mesa. Lourdes quiere que saques su tortilla de la nevera para la cena.',
      steps: [
        { text: 'Saca la tortilla de la nevera', done: function (g) { return g.flag('nevera:tortilla'); } },
        { text: 'Siéntate a cenar en tu silla', done: function (g) { return g.flag('cena_hecha'); } }
      ],
      extra: [
        { text: 'Opcional: saca el jamón', done: function (g) { return g.flag('nevera:jamon'); } },
        { text: 'Opcional: saca los langostinos', done: function (g) { return g.flag('nevera:langostinos'); } }
      ]
    },
    metro: {
      name: 'Pilla el metro de la 1:15', type: 'principal', limit: '01:15', limitLabel: 'Metro',
      desc: 'Has quedado con Sadaba, Ekabi y Lier. El metro pasa a la 1:15: llega a tiempo.',
      steps: [
        { text: 'Vuelve a casa a por la Barik', when: function (g) { return g.flag('barik_olvidada'); }, done: function (g) { return g.has('barik') || g.flag('metro_ok'); } },
        { text: 'Pasa las canceladoras antes de la 1:15', done: function (g) { return g.flag('metro_ok'); } }
      ]
    },
    sonora: {
      name: 'Rumbo a la Sonora', type: 'principal',
      desc: 'La cuadrilla va a la discoteca Sonora, en Astrabudua. Desde Sestao, la L2 hasta San Ignazio; allí, transbordo a la L1 dirección Plentzia.',
      steps: [
        { text: 'Haz transbordo en San Ignazio', done: function (g) { return g.flag('transbordo'); } },
        { text: 'Bájate en Astrabudua', done: function (g) { return g.flag('en_astrabudua'); } }
      ]
    },
    // PENDIENTE: los pasos los ira contando el autor
    tajada: {
      name: 'Tajada', type: 'principal',
      desc: 'Hay que entrar en la Sonora... pero no a palo seco. Botellón en la rotonda, a la izquierda de la Sonora: Sadaba trae las botellas.',
      steps: [
        { text: 'Id a la rotonda, a la izquierda de la Sonora', done: function (g) { return g.flag('rotonda'); } },
        { text: 'Que Sadaba saque las botellas', done: function (g) { return g.flag('botellas'); } },
        { text: function (g) { return 'Bébete unos destornis (' + Math.min(3, g.flag('tajada') || 0) + '/3)'; }, done: function (g) { return (g.flag('tajada') || 0) >= 3; } },
        { text: 'Entra tajado en la Sonora', done: function (g) { return g.flag('en_sonora'); } }
      ]
    }
  },

  scripts: {
    hermanastra: async function (s) { await s.talk('hermanastra.hambre'); },
    padre: async function (s) { await s.talk('padre.3ds'); },
    lourdes: async function (s) {
      if (!s.flag('mision:cena')) { await s.talk('lourdes.mision'); s.mission('cena'); }
      else if (!s.flag('nevera:tortilla')) await s.talk('lourdes.sin_tortilla');
      else if (!s.flag('cena_hecha')) await s.talk('lourdes.antes_cena');
      else if (s.flag('barik_olvidada') && !s.has('barik')) await s.talk('lourdes.barik');
      else await s.talk('lourdes.despues_cena');
    },
    nevera: async function (s) {
      for (;;) {
        var ids = ['tortilla', 'jamon', 'langostinos'].filter(function (id) { return !s.flag('nevera:' + id); });
        if (!ids.length) { await s.talk('nevera.vacia'); return; }
        var c = await s.choose('Nevera', '¿Qué sacas?', ids.map(function (id) { return { text: STORY.items[id].name, item: id }; }).concat(['Cerrar']));
        if (c >= ids.length) return;
        s.flag('nevera:' + ids[c], 1); s.give(ids[c]);
      }
    },
    vitro: async function (s) { await s.talk('vitro.mirar'); },
    silla: async function (s) {
      if (!s.has('tortilla')) { await s.talk('silla.sin_tortilla'); return; }
      var c = await s.choose(null, '¿Empezar a cenar?', ['Sí, a cenar', 'Todavía no']);
      if (c !== 0) return;
      // --- cinematica de la cena ---
      await s.cine(true);
      await s.walkTo(357); s.face(1);
      s.sit(357);
      s.take('tortilla'); s.flag('mesa:tortilla', 1);
      if (s.has('jamon')) { s.take('jamon'); s.flag('mesa:jamon', 1); }
      if (s.has('langostinos')) { s.take('langostinos'); s.flag('mesa:langostinos', 1); }
      await s.wait(0.9);
      s.eat(true);
      await s.wait(5.5);
      s.eat(false);
      await s.wait(0.8);
      await s.fade(1, 900);
      s.flag('cena_hecha', 1); s.complete('cena');
      s.sit(null); s.face(1);
      s.clock('23:30');                        // acaban de cenar: a partir de aqui hay reloj
      await s.wait(0.5);
      await s.fade(0, 900);
      await s.cine(false);
    },
    puerta_cerrada: async function (s) { await s.talk(s.flag('cena_hecha') ? 'puerta.antes_campanadas' : 'puerta.antes_cena'); },
    // 23:59: los cuartos, las uvas (Ethan con nuggets y la hermanastra con Lacasitos) y las campanadas
    campanadas: async function (s) {
      await s.cine(true);
      await s.walkTo(357); s.face(1); s.sit(357);
      await s.talk('lourdes.uvas');
      await s.serve('uvas', 502, 'mesa:uvas_lourdes');
      await s.serve('uvas', 430, 'mesa:uvas_aita');
      await s.serve('lacasitos', 412, 'mesa:lacasitos');
      await s.serve('nuggets', 381, 'mesa:nuggets');
      await s.wait(0.6);
      await s.chimes();
      s.clock('00:00'); s.flag('ano_nuevo', 1);  // a partir de aqui, fuegos artificiales a lo grande
      await s.wait(1.4);
      await s.talk('familia.feliz_ano');
      s.sit(null); s.face(1);
      await s.cine(false);
    },
    // 00:30: el movil con la quedada
    quedada: async function (s) {
      await s.phone('movil.quedada', 'Calentaos 4.0');
      s.mission('metro');
    },
    // 01:15 sin haber llegado: PROVISIONAL (se vuelve a la puerta de casa a las 00:30)
    metro_perdido: async function (s) {
      s.fail('metro');
      await s.wait(2.5);
      await s.fade(1, 700);
      s.clock('00:30'); s.flag('hora:metro_perdido', null);
      await s.go('cocina', 'puerta');
      s.toast('Inténtalo otra vez: el metro pasa a la 1:15');
    },
    // las canceladoras: justo antes llega Ekaitz ("Venga, espabila"). Sin la Barik, Ethan se da
    // cuenta de que se la ha dejado y Ekaitz se queda esperando ("Te espero").
    canceladora: async function (s) {
      await s.cine(true);
      await s.walkTo(866); s.face(1);
      if (!s.flag('ekaitz_llega')) {
        s.actor('ekaitz', 760, 1);                 // llega por la pasarela, por detras
        await s.actorWalk('ekaitz', 842, 110);
        s.face(-1);
        await s.talk('ekaitz.espabila');
        s.flag('ekaitz_llega', 1);
        s.face(1);
      }
      if (!s.has('barik')) {
        await s.talk('canceladora.buscar');
        s.sfx('error');
        await s.wait(0.6);
        await s.talk('canceladora.sin_barik');
        s.face(-1);
        await s.talk('ekaitz.te_espero');
        s.flag('barik_olvidada', 1); s.flag('ekaitz_espera', 1);
        await s.cine(false);
        s.toast('Las pasarelas de vuelta van hacia la salida');
        return;
      }
      // con la Barik: pasan los dos
      if (s.flag('ekaitz_espera')) { s.face(-1); await s.talk('ekaitz.por_fin'); s.face(1); }
      s.sfx('bip'); await s.wait(0.4);
      s.flag('canceladora_ok', 1); s.sfx('portillas');
      await s.wait(0.5);
      s.flag('metro_ok', 1); s.flag('ekaitz_espera', null); s.complete('metro');
      var ek = s.actorWalk('ekaitz', 1020, 70);
      await s.walkTo(1046);
      await ek;
      await s.wait(0.4);
      // bajan al anden: ahi esta toda la cuadrilla
      await s.fade(1, 700);
      s.flag('en_anden', 1); s.actor('ekaitz', null);
      await s.go('anden', 'entrada');
      s.actor('ekaitz', 20, 1);
      await s.fade(0, 700);
      var ek2 = s.actorWalk('ekaitz', 150);
      await s.walkTo(196); s.face(1);
      await ek2;
      await s.talk('anden.llegan');
      s.clock('01:13');                        // el metro llega a la 1:15: un momento para hablar con ellos
      await s.cine(false);
      s.toast('El metro está a punto de llegar');
    },
    // por si se llega a las canceladoras ya abiertas (p. ej. una partida de antes): bajar al anden
    bajar_anden: async function (s) {
      await s.fade(1, 600);
      s.flag('en_anden', 1); s.flag('metro_ok', 1);
      await s.go('anden', 'cuadrilla');
      if (!s.flag('hora:tren')) s.clock('01:13');
      await s.fade(0, 600);
    },
    // en el anden: hablar con la cuadrilla
    amigo_ekaitz: async function (s) { await s.talk('anden.ekaitz'); },
    amigo_manso: async function (s) { await s.talk('anden.manso'); },
    amigo_sadaba: async function (s) { await s.talk('anden.sadaba'); },
    amigo_lier: async function (s) { await s.talk('anden.lier'); },
    amigo_igor: async function (s) { await s.talk('anden.igor'); },
    anden_salir: async function (s) { await s.talk('anden.no_salir'); },
    // 01:15: llega el metro, suben todos y se va
    tren: async function (s) {
      await s.cine(true);
      s.sfx('tren');
      await s.fxMove('tren', 20, 3.2);          // entra por la derecha y frena
      await s.wait(0.3);
      s.sfx('puertas'); await s.doors('tren', true);
      await s.talk('anden.tren');
      // todos al mismo vagon, por la misma puerta (x = 20 + 220)
      var sube = [['ekaitz', 240], ['manso', 240], ['sadaba', 240], ['lier', 240], ['igor', 240]];
      await Promise.all(sube.map(function (a) { return s.actorWalk(a[0], a[1]).then(function () { s.actor(a[0], null); }); }).concat([s.walkTo(240)]));
      s.hideEthan(true);
      await s.wait(0.6);
      s.sfx('puertas'); await s.doors('tren', false);
      s.flag('en_metro', 1);
      await s.wait(0.5);
      s.sfx('arranca');
      await s.fxMove('tren', -700, 3.4, 'in');  // arranca hacia la izquierda
      await s.fade(1, 900);
      // dentro del vagon: L2 hasta San Ignazio
      s.flag('viaje:linea', 'L2'); s.flag('viaje:i', 0); s.flag('viaje:fase', 'move');
      await s.go('vagon', 'centro');
      await s.fade(0, 900);
      await s.cine(false);
      s.mission('sonora');
    },
    // --- el viaje en metro (lo mueve el tick del escenario "vagon") ---
    viaje_aviso: async function (s) { await s.talk('vagon.aviso_' + (s.flag('viaje:linea') || 'L2')); },
    viaje_destino: async function (s) { await s.talk('vagon.destino_' + (s.flag('viaje:linea') || 'L2')); },
    viaje_pasado: async function (s) {
      var L = LINEAS[s.flag('viaje:linea') || 'L2'];
      await s.cine(true);
      await s.talk('vagon.pasado');
      await s.fade(1, 800);
      await s.card('Bajan en ' + L.stations[L.target + 1] + ' y vuelven en el siguiente...');
      s.flag('viaje:i', L.target); s.flag('viaje:fase', 'stop');
      s.clock(horaViaje(L, L.target + 3));      // se pierden unos minutos
      await s.go('vagon', 'centro');
      await s.fade(0, 700);
      await s.cine(false);
    },
    bajar: async function (s) {
      var lin = s.flag('viaje:linea') || 'L2', L = LINEAS[lin], i = s.flag('viaje:i') || 0;
      if (i !== L.target) { await s.talk('vagon.aqui_no_' + lin); return; }
      if (s.flag('en_astrabudua')) { await s.card('Continuará...'); return; }
      await s.cine(true);
      await s.fade(1, 800);
      if (lin === 'L2') {                        // transbordo en San Ignazio
        s.flag('transbordo', 1);
        await s.card('San Ignazio · transbordo a la L1, dirección Plentzia');
        s.flag('viaje:linea', 'L1'); s.flag('viaje:i', 0); s.flag('viaje:fase', 'move');
        s.clock(LINEAS.L1.start);
        await s.go('vagon', 'centro');
        await s.fade(0, 800);
        await s.cine(false);
        s.toast('L1 · dirección Plentzia');
        return;
      }
      s.flag('en_astrabudua', 1); s.complete('sonora');
      await s.go('astrabudua', 'metro');
      await s.fade(0, 700);
      await s.cine(false);
      s.toast('Pasa la canceladora para salir');
    },
    // Astrabudua: salir por las canceladoras; fuera esta la Sonora con su cola
    salida_metro: async function (s) {
      await s.cine(true);
      await s.walkTo(1205); s.face(-1);
      s.sfx('bip'); await s.wait(0.4);
      s.flag('salida_ok', 1); s.sfx('portillas');
      await s.wait(0.4);
      var fuera = [['ekaitz', 770], ['manso', 800], ['sadaba', 836], ['lier', 866], ['javi', 896], ['igor', 926]];
      await Promise.all(fuera.map(function (a) { return s.actorWalk(a[0], a[1]).then(function () { s.actorFace(a[0], -1); }); }).concat([s.walkTo(730)]));
      s.face(1);
      await s.talk('sonora.llegan');
      s.face(-1);
      await s.cine(false);
      s.mission('tajada');
    },
    sonora_puerta: async function (s) {
      if ((s.flag('tajada') || 0) < 3) { await s.talk('sonora.puerta'); return; }
      await s.cine(true);
      await s.talk('sonora.puerta_listos');
      s.flag('en_sonora', 1); s.complete('tajada');
      await s.wait(1.2);
      await s.fade(1, 900);
      await s.card('Continuará...');           // AQUI SIGUE LA HISTORIA: dentro de la Sonora (pendiente)
      await s.fade(0, 700);
      await s.cine(false);
    },
    // --- el botellon en la rotonda ---
    rotonda_llegar: async function (s) {
      if (s.flag('rotonda') || s.flag('mision:tajada') !== 'activa') return;
      await s.cine(true);
      var sitio = [['ekaitz', 250], ['manso', 340], ['sadaba', 300], ['lier', 370], ['javi', 230], ['igor', 400]];
      sitio.forEach(function (a, i) { s.actor(a[0], 660 + i * 16, -1); });
      await Promise.all(sitio.map(function (a) { return s.actorWalk(a[0], a[1]).then(function () { s.actorFace(a[0], a[1] < 300 ? 1 : -1); }); }).concat([s.walkTo(270)]));
      s.flag('rotonda', 1);
      await s.talk('tajada.rotonda');
      await s.cine(false);
    },
    sadaba_botellas: async function (s) {
      if (s.flag('botellas')) { await s.talk('tajada.sadaba'); return; }
      await s.cine(true);
      await s.talk('tajada.sadaba_saca');
      s.sfx('objeto'); s.flag('botellas', 1);
      await s.wait(0.6);
      await s.talk('tajada.destornis');
      await s.cine(false);
      s.toast('Prepárate un destorni en la rotonda');
    },
    destorni_coger: async function (s) {
      if ((s.flag('tajada') || 0) >= 3) { await s.talk('tajada.basta'); return; }
      s.give('destorni');
    },
    destorni_beber: async function (s) {
      s.take('destorni'); s.sfx('trago');
      var n = (s.flag('tajada') || 0) + 1; s.flag('tajada', n);
      await s.wait(0.8);
      if (n === 1) await s.talk('tajada.trago1');
      else if (n === 2) s.toast('Entra fino...');
      else { await s.talk('tajada.entonado'); s.toast('Ya vas tajado: a la Sonora'); }
    },
    rotonda_amigo: async function (s) { await s.talk((s.flag('tajada') || 0) >= 3 ? 'tajada.amigos_pedo' : 'tajada.amigos'); },
    sonora_cola: async function (s) { await s.talk('sonora.cola'); },
    sonora_ekaitz: async function (s) { await s.talk('sonora.ekaitz'); },
    sonora_sadaba: async function (s) { await s.talk('sonora.sadaba'); },
    // Barakaldo: sube Javi (es de ahi)
    javi_sube: async function (s) {
      s.actor('javi', 170, -1);
      await s.actorWalk('javi', 128);
      s.actorFace('javi', 1);
      s.flag('javi_sube', 1);
      await s.talk('vagon.javi_sube');
    },
    vagon_ekaitz: async function (s) { await s.talk('vagon.ekaitz'); },
    vagon_manso: async function (s) { await s.talk('vagon.manso'); },
    vagon_sadaba: async function (s) { await s.talk('vagon.sadaba'); },
    vagon_lier: async function (s) { await s.talk('vagon.lier'); },
    vagon_javi: async function (s) { await s.talk('vagon.javi'); },
    vagon_igor: async function (s) { await s.talk('vagon.igor'); },
    ekaitz: async function (s) { await s.talk(s.has('barik') ? 'ekaitz.vamos' : 'ekaitz.esperando'); },
    // la cartera, en el escritorio del cuarto de Ethan: ahi esta la Barik (solo la cogen los curiosos)
    cartera: async function (s) {
      for (;;) {
        var c = await s.closeup('cartera');
        if (!c) return;
        if (c === 'barik') { s.flag('barik_cogida', 1); s.give('barik'); await s.talk('cartera.barik'); return; }
        await s.talk('cartera.' + c);
      }
    },
    pc: async function (s) { await s.talk('habitacion.pc'); },
    bano: async function (s) { await s.talk('pasillo.bano'); },
    padres: async function (s) { await s.talk('pasillo.padres'); },
    figuritas: async function (s) { await s.talk('friki.figuritas'); },
    consolas: async function (s) { await s.talk('friki.consolas'); },
    tele_retro: async function (s) { await s.talk('friki.tele'); }
  },

  // Puntos de la historia para el panel de desarrollador (tecla º o F1).
  // Cada uno deja la partida como estaria en ese momento: escenario, flags e inventario.
  // cards: true muestra antes las tarjetas de la intro.
  checkpoints: [
    { id: 'inicio', name: 'Inicio · 31/12/2022 (con la fecha)', cards: true, scene: 'cocina', spawn: 'inicio' },
    { id: 'cocina', name: 'Cocina · antes de hablar con Lourdes', scene: 'cocina', spawn: 'inicio' },
    { id: 'mision', name: 'Misión de la cena activa', scene: 'cocina', spawn: 'mesa', flags: { 'mision:cena': 'activa' } },
    { id: 'tortilla', name: 'Con la tortilla en la mano', scene: 'cocina', spawn: 'nevera', flags: { 'mision:cena': 'activa', 'nevera:tortilla': 1 }, inv: ['tortilla'] },
    { id: 'todo', name: 'Con tortilla, jamón y langostinos', scene: 'cocina', spawn: 'silla', flags: { 'mision:cena': 'activa', 'nevera:tortilla': 1, 'nevera:jamon': 1, 'nevera:langostinos': 1 }, inv: ['tortilla', 'jamon', 'langostinos'] },
    { id: 'trascena', name: 'Después de la cena (23:30)', scene: 'cocina', spawn: 'silla', clock: '23:30', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1 } },
    { id: 'campanadas', name: 'Justo antes de las campanadas (23:58)', scene: 'cocina', spawn: 'silla', clock: '23:58', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1 } },
    { id: 'anonuevo', name: 'Año nuevo recién empezado (00:01)', scene: 'cocina', spawn: 'silla', clock: '00:01', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1 } },
    { id: 'quedada', name: 'Justo antes del móvil (00:29)', scene: 'cocina', spawn: 'puerta', clock: '00:29', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1 } },
    { id: 'metro', name: 'Misión del metro, en la calle (00:40)', scene: 'calle', spawn: 'portal', clock: '00:40', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'activa' } },
    { id: 'metro_justo', name: 'Metro: a punto de perderlo (01:13)', scene: 'calle', spawn: 'portal', clock: '01:13', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'activa' } },
    { id: 'estacion', name: 'Metro: bajando a la estación (00:46)', scene: 'metro', spawn: 'entrada', clock: '00:46', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'activa' } },
    { id: 'sin_barik', name: 'Sin la Barik: de vuelta a casa (00:52)', scene: 'pasillo', spawn: 'portal', clock: '00:52', flags: { ekaitz_llega: 1, ekaitz_espera: 1, 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'activa', barik_olvidada: 1 } },
    { id: 'con_barik', name: 'Con la Barik, saliendo del portal (00:56)', scene: 'calle', spawn: 'portal', clock: '00:56', flags: { ekaitz_llega: 1, ekaitz_espera: 1, 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'activa', barik_olvidada: 1, barik_cogida: 1 }, inv: ['barik'] },
    { id: 'anden', name: 'En el andén con la cuadrilla (01:13)', scene: 'anden', spawn: 'cuadrilla', clock: '01:13', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'hecha', metro_ok: 1, canceladora_ok: 1, ekaitz_llega: 1, en_anden: 1 }, inv: ['barik'] },
    { id: 'vagon_l2', name: 'En el metro, L2 saliendo de Sestao (01:15)', scene: 'vagon', spawn: 'centro', clock: '01:15', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'hecha', metro_ok: 1, canceladora_ok: 1, ekaitz_llega: 1, en_anden: 1, 'hora:tren': 1, en_metro: 1, 'mision:sonora': 'activa', 'viaje:linea': 'L2', 'viaje:i': 0, 'viaje:fase': 'move' }, inv: ['barik'] },
    { id: 'vagon_san', name: 'En el metro, llegando a San Ignazio (01:25)', scene: 'vagon', spawn: 'centro', clock: '01:25', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'hecha', metro_ok: 1, canceladora_ok: 1, ekaitz_llega: 1, en_anden: 1, 'hora:tren': 1, en_metro: 1, 'mision:sonora': 'activa', 'viaje:linea': 'L2', 'viaje:i': 5, javi_sube: 1, 'viaje:fase': 'move' }, inv: ['barik'] },
    { id: 'vagon_l1', name: 'En el metro, L1 hacia Astrabudua (01:31)', scene: 'vagon', spawn: 'centro', clock: '01:31', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'hecha', metro_ok: 1, canceladora_ok: 1, ekaitz_llega: 1, en_anden: 1, 'hora:tren': 1, en_metro: 1, 'mision:sonora': 'activa', transbordo: 1, javi_sube: 1, 'viaje:linea': 'L1', 'viaje:i': 0, 'viaje:fase': 'move' }, inv: ['barik'] },
    { id: 'astra', name: 'Astrabudua: saliendo del metro (01:39)', scene: 'astrabudua', spawn: 'metro', clock: '01:39', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'hecha', metro_ok: 1, canceladora_ok: 1, ekaitz_llega: 1, en_anden: 1, 'hora:tren': 1, en_metro: 1, transbordo: 1, javi_sube: 1, en_astrabudua: 1, 'mision:sonora': 'hecha', 'viaje:linea': 'L1', 'viaje:i': 3, 'viaje:fase': 'stop' }, inv: ['barik'] },
    { id: 'sonora', name: 'Fuera de la Sonora, misión Tajada (01:41)', scene: 'astrabudua', spawn: 'fuera', clock: '01:41', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'hecha', metro_ok: 1, canceladora_ok: 1, ekaitz_llega: 1, en_anden: 1, 'hora:tren': 1, en_metro: 1, transbordo: 1, javi_sube: 1, en_astrabudua: 1, 'mision:sonora': 'hecha', 'viaje:linea': 'L1', 'viaje:i': 3, 'viaje:fase': 'stop', salida_ok: 1, 'mision:tajada': 'activa' }, inv: ['barik'] },
    { id: 'botellon', name: 'Botellón en la rotonda, botellas fuera (01:50)', scene: 'rotonda', spawn: 'sonora', clock: '01:50', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1, 'hora:campanadas': 1, ano_nuevo: 1, 'mesa:uvas_lourdes': 1, 'mesa:uvas_aita': 1, 'mesa:lacasitos': 1, 'mesa:nuggets': 1, 'hora:quedada': 1, 'mision:metro': 'hecha', metro_ok: 1, canceladora_ok: 1, ekaitz_llega: 1, en_anden: 1, 'hora:tren': 1, en_metro: 1, transbordo: 1, javi_sube: 1, en_astrabudua: 1, 'mision:sonora': 'hecha', 'viaje:linea': 'L1', 'viaje:i': 3, 'viaje:fase': 'stop', salida_ok: 1, 'mision:tajada': 'activa', rotonda: 1, botellas: 1 }, inv: ['barik'] },
    { id: 'casa', name: 'Pasillo de casa (escena de prueba)', scene: 'pasillo', spawn: 'cocina' },
    { id: 'cuarto', name: 'Cuarto de Ethan (escena de prueba)', scene: 'habitacion', spawn: 'puerta' },
    { id: 'calle', name: 'Calle (escena de prueba)', scene: 'calle', spawn: 'portal' },
    { id: 'metro_prueba', name: 'Estación de metro (escena de prueba)', scene: 'metro', spawn: 'entrada' }
  ]
};

window.STORY_SCENES = {
  cocina: {
    name: 'Cocina', sub: 'Casa de Ethan · Nochevieja',
    w: 640, floor: 196,
    layers: [
      { src: 'sprites/story/cocina-cielo.png', f: 0.3 },
      { src: 'sprites/story/cocina.png', f: 1 },
      { src: 'sprites/story/cocina-mesa.png', f: 1, front: true }
    ],
    npcs: [
      { id: 'hermanastra', name: 'Hermanastra', sprite: 'sprites/story/npc-hermanastra.png', x: 398, top: 144, run: 'hermanastra', voice: 560 },
      { id: 'padre', name: 'Aita', sprite: 'sprites/story/npc-padre.png', x: 444, top: 144, run: 'padre', voice: 170 },
      { id: 'lourdes', name: 'Lourdes', sprite: 'sprites/story/npc-lourdes.png', x: 490, top: 144, run: 'lourdes', voice: 420 }
    ],
    objects: [
      { id: 'nevera', name: 'Nevera', x: 44, reach: 22, py: 124, label: 'Abrir la nevera', run: 'nevera', when: function (g) { return g.flag('mision:cena'); } },
      { id: 'silla', name: 'Silla de Ethan', x: 358, reach: 12, py: 150, label: 'Sentarse a cenar', run: 'silla', when: function (g) { return g.flag('mision:cena') === 'activa'; } },
      { id: 'vitro', name: 'Vitro', x: 202, reach: 14, py: 156, label: 'Mirar la vitro', run: 'vitro' }
    ],
    props: [
      { item: 'jamon', x: 510, y: 178, when: function (g) { return g.flag('mesa:jamon'); } },
      { item: 'uvas', x: 502, y: 178, when: function (g) { return g.flag('mesa:uvas_lourdes'); } },
      { item: 'uvas', x: 430, y: 178, when: function (g) { return g.flag('mesa:uvas_aita'); } },
      { item: 'lacasitos', x: 412, y: 178, when: function (g) { return g.flag('mesa:lacasitos'); } },
      { item: 'nuggets', x: 381, y: 178, when: function (g) { return g.flag('mesa:nuggets'); } },
      { item: 'langostinos', x: 428, y: 178, when: function (g) { return g.flag('mesa:langostinos'); } },
      { item: 'tortilla', x: 457, y: 178, when: function (g) { return g.flag('mesa:tortilla'); } }
    ],
    platforms: [
      { x: 24, y: 128, w: 40 },   // nevera
      { x: 62, y: 165, w: 244 },  // encimera
      { x: 246, y: 147, w: 40 },  // microondas
      { x: 372, y: 177, w: 144 }  // mesa
    ],
    spawns: { inicio: { x: 150, dir: 1 }, puerta: { x: 606, dir: -1 }, mesa: { x: 520, dir: -1 }, nevera: { x: 76, dir: 1 }, silla: { x: 340, dir: 1 } },
    exits: [{ x: 588, w: 42, to: 'pasillo', spawn: 'cocina', label: 'Salir al pasillo', when: function (g) { return g.flag('ano_nuevo'); }, locked: 'puerta_cerrada' }],
    fx: [
      { type: 'fireworks', z: 0, x0: 40, x1: 340, y0: 58, y1: 100, rate: 1.1, when: function (g) { return g.flag('ano_nuevo'); }, light: { x: 279, y: 86, r: 240, a: 0.09 } },
      { type: 'tv', x: 539, y: 85, w: 40, h: 25 },
      { type: 'glow', x: 559, y: 97, r: 46, c: '120,160,255', a: 0.16, flicker: 1 },
      { type: 'glow', x: 314, y: 14, r: 90, c: '255,250,225', a: 0.10 },
      { type: 'wallclock', x: 442, y: 42 }
    ]
  },

  calle: {
    name: 'Calle', sub: 'Dr. Fleming · Sestao',
    w: 1600, floor: 200,
    // suelo: acera y plaza a 200, rampa de 1070 a 1170 y aparcamiento a 212
    ground: [[0, 200], [1070, 200], [1170, 212], [1600, 212]],
    layers: [
      { src: 'sprites/story/calle-cielo.png', f: 0.08 },
      { src: 'sprites/story/calle-lejos.png', f: 0.3 },
      { src: 'sprites/story/calle-medio.png', f: 0.6 },
      { src: 'sprites/story/calle.png', f: 1 }
    ],
    platforms: [
      { x: 148, y: 157, w: 82 },   // techo del monovolumen azul
      { x: 336, y: 161, w: 54 },   // techo del todoterreno gris
      { x: 830, y: 150, w: 84 },   // techo de la caseta blanca
      { x: 1192, y: 174, w: 56 },  // coches del aparcamiento
      { x: 1288, y: 176, w: 58 },
      { x: 1350, y: 174, w: 54 },
      { x: 1498, y: 164, w: 62 }   // encima de la boca de metro
    ],
    spawns: { portal: { x: 276, dir: 1 }, metro: { x: 1470, dir: -1 } },
    exits: [
      { x: 252, w: 48, to: 'pasillo', spawn: 'portal', label: 'Entrar al portal' },
      { x: 1500, w: 60, to: 'metro', spawn: 'entrada', label: 'Bajar al metro', when: function (g) { return g.flag('mision:metro') === 'activa'; } }
    ],
    fx: [
      { type: 'fireworks', z: 0, x0: 20, x1: 480, y0: 15, y1: 70, rate: 1.4, when: function (g) { return g.flag('ano_nuevo'); }, light: { x: 0, y: 0, r: 0, a: 0.07 } },
      { type: 'blink', x: 304, y: 57, f: 0.3, z: 1 },
      { type: 'blink', x: 322, y: 69, f: 0.3, z: 1, phase: 0.5 },
      { type: 'glow', x: 664, y: 126, r: 46, c: '255,225,150', a: 0.24 },
      { type: 'glow', x: 991, y: 126, r: 40, c: '255,240,200', a: 0.22 },
      { type: 'glow', x: 1111, y: 131, r: 40, c: '255,240,200', a: 0.22 },
      { type: 'glow', x: 1291, y: 138, r: 40, c: '255,240,200', a: 0.22 },
      { type: 'glow', x: 276, y: 168, r: 40, c: '255,220,150', a: 0.2 },
      { type: 'glow', x: 546, y: 172, r: 26, c: '255,210,140', a: 0.1 },
      { type: 'glow', x: 160, y: 154, r: 12, c: '255,120,140', a: 0.2 },
      { type: 'glow', x: 1528, y: 192, r: 50, c: '255,200,120', a: 0.2 },
      { type: 'glow', x: 1465, y: 191, r: 22, c: '255,70,70', a: 0.2 }
    ]
  },

  metro: {
    name: 'Metro', sub: 'Estación de Sestao',
    w: 1120, floor: 196,
    layers: [{ src: 'sprites/story/metro.png', f: 1 }],
    // pasarela mecanica: lleva hacia las canceladoras; a la vuelta a por la Barik, Ethan coge la
    // del otro sentido (la cinta va hacia la salida)
    conveyors: [
      { x: 190, w: 590, v: function (g) { return g.flag('barik_olvidada') && !g.has('barik') ? -75 : 75; } }
    ],
    // las portillas cerradas no dejan pasar
    blocks: [{ x: 878, when: function (g) { return !g.flag('canceladora_ok'); } }],
    // Ekaitz esperando a que Ethan vuelva con la Barik
    actors: [{ id: 'ekaitz', x: 842, dir: -1, when: function (g) { return g.flag('ekaitz_espera') && !g.flag('metro_ok'); } }],
    platforms: [{ x: 852, y: 154, w: 16 }, { x: 892, y: 154, w: 16 }],   // encima de las canceladoras
    spawns: { entrada: { x: 84, dir: 1 } },
    exits: [{ x: 6, w: 70, to: 'calle', spawn: 'metro', label: 'Subir a la calle' }],
    objects: [
      { id: 'ekaitz', name: 'Ekaitz', x: 842, reach: 12, py: 140, label: 'Hablar con Ekaitz', run: 'ekaitz', when: function (g) { return g.flag('ekaitz_espera') && !g.flag('metro_ok'); } },
      { id: 'andenes', name: 'Andenes', x: 1047, reach: 26, py: 120, label: 'Bajar al andén', run: 'bajar_anden', when: function (g) { return g.flag('canceladora_ok') && !g.flag('en_metro'); } },
      { id: 'canceladora', name: 'Canceladora', x: 870, reach: 18, py: 140, label: 'Pasar la canceladora', run: 'canceladora', when: function (g) { return !g.flag('canceladora_ok'); } }
    ],
    fx: [
      { type: 'conveyor', belt: 0, x: 190, y: 196, w: 590, h: 3, rail: 184 },               // la pasarela de Ethan
      { type: 'conveyor', belt: 0, k: -1, x: 190, y: 170, w: 590, h: 2, rail: 150, c: '#6e7177', g: '#9da0a6' },   // la del fondo, al reves
      { type: 'paddles', x: 878, y: 170, h: 22, when: function (g) { return !g.flag('canceladora_ok'); } },
      { type: 'glow', x: 376, y: 58, r: 40, c: '255,60,60', a: 0.12 },
      { type: 'glow', x: 70, y: 46, r: 60, c: '255,220,170', a: 0.12 },
      { type: 'glow', x: 1047, y: 150, r: 60, c: '255,215,190', a: 0.22 },
      { type: 'glow', x: 860, y: 151, r: 14, c: '160,210,255', a: 0.25 },
      { type: 'glow', x: 900, y: 151, r: 14, c: '160,210,255', a: 0.25 }
    ]
  },

  // La casa: el pasillo va de derecha (cocina) a izquierda (salon)
  pasillo: {
    name: 'Pasillo', sub: 'Casa de Ethan',
    w: 1100, floor: 196,
    layers: [
      { src: 'sprites/story/casa-cielo.png', f: 0.3 },
      { src: 'sprites/story/pasillo.png', f: 1 }
    ],
    platforms: [
      { x: 48, y: 160, w: 64 },    // mesa del salon
      { x: 176, y: 168, w: 84 },   // sofa
      { x: 340, y: 176, w: 56 },   // mueble de la tele
      { x: 856, y: 160, w: 40 }    // radiador
    ],
    spawns: { cocina: { x: 1040, dir: -1 }, portal: { x: 492, dir: 1 }, ethan: { x: 692, dir: -1 }, friki: { x: 584, dir: -1 } },
    exits: [
      { x: 1046, w: 40, to: 'cocina', spawn: 'puerta', label: 'Entrar a la cocina' },
      { x: 470, w: 44, to: 'calle', spawn: 'portal', label: 'Salir a la calle' },
      { x: 674, w: 36, to: 'habitacion', spawn: 'puerta', label: 'Entrar a tu cuarto' },
      { x: 566, w: 36, to: 'friki', spawn: 'puerta', label: 'Entrar a la sala de Aita' }
    ],
    objects: [
      { id: 'bano', name: 'Baño', x: 943, reach: 14, py: 128, label: 'Entrar al baño', run: 'bano' },
      { id: 'padres', name: 'Habitación de Aita y Lourdes', x: 816, reach: 16, py: 128, label: 'Habitación de Aita y Lourdes', run: 'padres' }
    ],
    fx: [
      { type: 'fireworks', z: 0, x0: 30, x1: 270, y0: 40, y1: 90, rate: 1.2, when: function (g) { return g.flag('ano_nuevo'); }, light: { x: 150, y: 90, r: 160, a: 0.07 } },
      { type: 'glow', x: 600, y: 10, r: 50, c: '255,240,200', a: 0.07 },
      { type: 'glow', x: 780, y: 10, r: 50, c: '255,240,200', a: 0.07 },
      { type: 'glow', x: 980, y: 10, r: 50, c: '255,240,200', a: 0.07 },
      { type: 'glow', x: 1066, y: 165, r: 50, c: '255,215,130', a: 0.25 },
      { type: 'glow', x: 373, y: 150, r: 34, c: '120,160,255', a: 0.18, flicker: 1 },
      { type: 'glow', x: 151, y: 103, r: 22, c: '255,235,190', a: 0.1 }
    ]
  },

  habitacion: {
    name: 'Cuarto de Ethan', sub: 'Casa de Ethan',
    w: 420, floor: 196,
    layers: [
      { src: 'sprites/story/casa-cielo.png', f: 0.3 },
      { src: 'sprites/story/habitacion.png', f: 1 }
    ],
    platforms: [{ x: 20, y: 166, w: 92 }, { x: 276, y: 158, w: 92 }],   // cama y escritorio
    spawns: { puerta: { x: 386, dir: -1 } },
    exits: [{ x: 380, w: 38, to: 'pasillo', spawn: 'ethan', label: 'Salir al pasillo' }],
    objects: [
      { id: 'cartera', name: 'Cartera', x: 290, reach: 14, py: 138, label: 'Mirar la cartera', run: 'cartera' },
      { id: 'pc', name: 'PC', x: 323, reach: 12, py: 112, label: 'Mirar el PC', run: 'pc' }
    ],
    fx: [
      { type: 'fireworks', z: 0, x0: 190, x1: 260, y0: 40, y1: 90, rate: 1.2, when: function (g) { return g.flag('ano_nuevo'); }, light: { x: 224, y: 90, r: 160, a: 0.07 } },
      { type: 'glow', x: 323, y: 140, r: 36, c: '120,170,255', a: 0.2, flicker: 1 },
      { type: 'glow', x: 200, y: 10, r: 70, c: '255,240,200', a: 0.12 }
    ]
  },

  friki: {
    name: 'Sala de Aita', sub: 'Consolas y figuritas',
    w: 420, floor: 196,
    layers: [{ src: 'sprites/story/friki.png', f: 1 }],
    platforms: [{ x: 222, y: 160, w: 70 }],
    spawns: { puerta: { x: 386, dir: -1 } },
    exits: [{ x: 380, w: 38, to: 'pasillo', spawn: 'friki', label: 'Salir al pasillo' }],
    objects: [
      { id: 'figuritas', name: 'Figuritas', x: 80, reach: 40, py: 70, label: 'Mirar las figuritas', run: 'figuritas' },
      { id: 'tele_retro', name: 'Tele', x: 254, reach: 18, py: 110, label: 'Mirar la tele', run: 'tele_retro' },
      { id: 'consolas', name: 'Consolas', x: 338, reach: 22, py: 84, label: 'Mirar las consolas', run: 'consolas' }
    ],
    fx: [
      { type: 'glow', x: 254, y: 140, r: 40, c: '90,150,230', a: 0.22, flicker: 1 },
      { type: 'glow', x: 185, y: 100, r: 40, c: '255,240,200', a: 0.14 },
      { type: 'glow', x: 100, y: 12, r: 70, c: '255,90,210', a: 0.1 },
      { type: 'glow', x: 300, y: 12, r: 70, c: '120,220,255', a: 0.1 }
    ]
  },

  // El anden: la cuadrilla esperando el metro de la 1:15
  anden: {
    name: 'Andén', sub: 'Metro de Sestao · 01:15',
    w: 640, floor: 196,
    layers: [
      { src: 'sprites/story/anden-fondo.png', f: 1 },
      { src: 'sprites/story/anden.png', f: 1 }
    ],
    spawns: { entrada: { x: 40, dir: 1 }, cuadrilla: { x: 196, dir: 1 } },
    exits: [{ x: 0, w: 44, to: 'metro', spawn: 'entrada', label: 'Volver', when: function () { return false; }, locked: 'anden_salir' }],
    actors: [
      { id: 'ekaitz', x: 150, dir: 1, when: function (g) { return !g.flag('en_metro'); } },
      { id: 'manso', x: 300, dir: -1, when: function (g) { return !g.flag('en_metro'); } },
      { id: 'sadaba', x: 336, dir: -1, when: function (g) { return !g.flag('en_metro'); } },
      { id: 'lier', x: 372, dir: -1, when: function (g) { return !g.flag('en_metro'); } },
      { id: 'igor', x: 448, dir: -1, when: function (g) { return !g.flag('en_metro'); } }
    ],
    objects: [
      { id: 'amigo_ekaitz', name: 'Ekaitz', x: 150, reach: 13, py: 140, label: 'Hablar con Ekaitz', run: 'amigo_ekaitz', when: function (g) { return !g.flag('en_metro'); } },
      { id: 'amigo_manso', name: 'Manso', x: 300, reach: 13, py: 140, label: 'Hablar con Manso', run: 'amigo_manso', when: function (g) { return !g.flag('en_metro'); } },
      { id: 'amigo_sadaba', name: 'Sadaba', x: 336, reach: 13, py: 140, label: 'Hablar con Sadaba', run: 'amigo_sadaba', when: function (g) { return !g.flag('en_metro'); } },
      { id: 'amigo_lier', name: 'Lier', x: 372, reach: 13, py: 140, label: 'Hablar con Lier', run: 'amigo_lier', when: function (g) { return !g.flag('en_metro'); } },
      { id: 'amigo_igor', name: 'Igor', x: 448, reach: 13, py: 140, label: 'Hablar con Igor', run: 'amigo_igor', when: function (g) { return !g.flag('en_metro'); } }
    ],
    fx: [
      { type: 'train', id: 'tren', z: 0, src: 'sprites/story/tren.png', x: 760, y: 118, doors: [60, 140, 220, 364, 444, 524] },
      { type: 'glow', x: 111, y: 77, r: 26, c: '120,170,255', a: 0.2 },
      { type: 'glow', x: 315, y: 77, r: 26, c: '120,170,255', a: 0.2 },
      { type: 'glow', x: 515, y: 77, r: 26, c: '120,170,255', a: 0.2 }
    ]
  },

  // Dentro del metro: un vagon con toda la cuadrilla. El viaje lo lleva viajeTick (arriba).
  vagon: {
    name: 'Metro', sub: 'Todos en el mismo vagón',
    w: 640, floor: 196,
    layers: [{ src: 'sprites/story/vagon.png', f: 1 }],
    tick: viajeTick,
    spawns: { centro: { x: 250, dir: 1 } },
    actors: [
      { id: 'ekaitz', x: 214, dir: 1 },
      { id: 'manso', x: 300, dir: -1 },
      { id: 'sadaba', x: 356, dir: -1 },
      { id: 'lier', x: 420, dir: -1 },
      { id: 'javi', x: 128, dir: 1, when: function (g) { return g.flag('javi_sube'); } },   // sube en Barakaldo
      { id: 'igor', x: 590, dir: -1 }
    ],
    objects: [
      { id: 'puerta1', name: 'Puerta', x: 170, reach: 20, py: 50, label: 'Bajarse aquí', run: 'bajar', when: function (g) { return g.flag('viaje:fase') === 'stop'; } },
      { id: 'puerta2', name: 'Puerta', x: 470, reach: 20, py: 50, label: 'Bajarse aquí', run: 'bajar', when: function (g) { return g.flag('viaje:fase') === 'stop'; } },
      { id: 'vagon_ekaitz', name: 'Ekaitz', x: 214, reach: 12, py: 140, label: 'Hablar con Ekaitz', run: 'vagon_ekaitz' },
      { id: 'vagon_manso', name: 'Manso', x: 300, reach: 12, py: 140, label: 'Hablar con Manso', run: 'vagon_manso' },
      { id: 'vagon_sadaba', name: 'Sadaba', x: 356, reach: 12, py: 140, label: 'Hablar con Sadaba', run: 'vagon_sadaba' },
      { id: 'vagon_lier', name: 'Lier', x: 420, reach: 12, py: 140, label: 'Hablar con Lier', run: 'vagon_lier' },
      { id: 'vagon_javi', name: 'Javi', x: 128, reach: 12, py: 140, label: 'Hablar con Javi', run: 'vagon_javi', when: function (g) { return g.flag('javi_sube'); } },
      { id: 'vagon_igor', name: 'Igor', x: 590, reach: 12, py: 140, label: 'Hablar con Igor', run: 'vagon_igor' }
    ],
    fx: [
      { type: 'outside', id: 'fuera', z: -1 },
      { type: 'cardoor', id: 'p1', x: 170, z: 0 },
      { type: 'cardoor', id: 'p2', x: 470, z: 0 },
      { type: 'routemap', id: 'plano', x: 222, y: 34, w: 196, z: 0 },
      { type: 'glow', x: 160, y: 10, r: 60, c: '255,250,235', a: 0.08 },
      { type: 'glow', x: 480, y: 10, r: 60, c: '255,250,235', a: 0.08 }
    ]
  },

  // Astrabudua: salida del metro, aparcamiento y la Sonora con su cola
  astrabudua: {
    name: 'Astrabudua', sub: 'La Sonora · 01:40',
    w: 1400, floor: 200,
    layers: [
      { src: 'sprites/story/astra-cielo.png', f: 0.3 },
      { src: 'sprites/story/astrabudua.png', f: 1 }
    ],
    spawns: { metro: { x: 1290, dir: -1 }, fuera: { x: 730, dir: -1 }, rotonda: { x: 30, dir: 1 } },
    exits: [{ x: 0, w: 22, to: 'rotonda', spawn: 'sonora', label: 'Ir a la rotonda', when: function (g) { return g.flag('salida_ok'); } }],
    blocks: [{ x: 1196, dir: -1, when: function (g) { return !g.flag('salida_ok'); } }],   // canceladoras de salida
    platforms: [{ x: 694, y: 162, w: 88 }, { x: 806, y: 162, w: 88 }, { x: 922, y: 160, w: 88 }],   // techos de los coches
    actors: [
      { id: 'ekaitz', x: 1250, dir: -1, when: function (g) { return !g.flag('salida_ok'); } },
      { id: 'ekaitz', x: 770, dir: -1, when: function (g) { return g.flag('salida_ok') && !g.flag('rotonda'); } },
      { id: 'manso', x: 1268, dir: -1, when: function (g) { return !g.flag('salida_ok'); } },
      { id: 'manso', x: 800, dir: -1, when: function (g) { return g.flag('salida_ok') && !g.flag('rotonda'); } },
      { id: 'sadaba', x: 1286, dir: -1, when: function (g) { return !g.flag('salida_ok'); } },
      { id: 'sadaba', x: 836, dir: -1, when: function (g) { return g.flag('salida_ok') && !g.flag('rotonda'); } },
      { id: 'lier', x: 1304, dir: -1, when: function (g) { return !g.flag('salida_ok'); } },
      { id: 'lier', x: 866, dir: -1, when: function (g) { return g.flag('salida_ok') && !g.flag('rotonda'); } },
      { id: 'javi', x: 1322, dir: -1, when: function (g) { return !g.flag('salida_ok'); } },
      { id: 'javi', x: 896, dir: -1, when: function (g) { return g.flag('salida_ok') && !g.flag('rotonda'); } },
      { id: 'igor', x: 1340, dir: -1, when: function (g) { return !g.flag('salida_ok'); } },
      { id: 'igor', x: 926, dir: -1, when: function (g) { return g.flag('salida_ok') && !g.flag('rotonda'); } }
    ],
    objects: [
      { id: 'canceladora_salida', name: 'Canceladora', x: 1206, reach: 16, py: 146, label: 'Pasar la canceladora', run: 'salida_metro', when: function (g) { return !g.flag('salida_ok'); } },
      { id: 'puerta_sonora', name: 'Puerta de la Sonora', x: 330, reach: 22, py: 150, label: 'Entrar en la Sonora', run: 'sonora_puerta' },
      { id: 'cola', name: 'La cola', x: 520, reach: 120, py: 140, label: 'Hablar con la gente de la cola', run: 'sonora_cola' },
      { id: 'sonora_ekaitz', name: 'Ekaitz', x: 770, reach: 12, py: 144, label: 'Hablar con Ekaitz', run: 'sonora_ekaitz', when: function (g) { return g.flag('salida_ok') && !g.flag('rotonda'); } },
      { id: 'sonora_sadaba', name: 'Sadaba', x: 836, reach: 12, py: 144, label: 'Hablar con Sadaba', run: 'sonora_sadaba', when: function (g) { return g.flag('salida_ok') && !g.flag('rotonda'); } }
    ],
    fx: [
      { type: 'crowd', src: 'sprites/story/gente.png', dir: -1, people: [
        { x: 366, n: 3 }, { x: 387, n: 8 }, { x: 406, n: 13 }, { x: 426, n: 2 }, { x: 445, n: 7, dir: 1 }, { x: 467, n: 12 }, { x: 492, n: 1 }, { x: 514, n: 6 }, { x: 539, n: 11 }, { x: 559, n: 0, dir: 1 }, { x: 578, n: 5 }, { x: 603, n: 10 }, { x: 625, n: 15 }, { x: 646, n: 4 }
      ] },
      { type: 'paddles', x: 1195, y: 174, h: 22, when: function (g) { return !g.flag('salida_ok'); } },
      { type: 'glow', x: 330, y: 182, r: 46, c: '255,200,120', a: 0.3 },
      { type: 'glow', x: 315, y: 100, r: 60, c: '255,240,210', a: 0.12 },
      { type: 'glow', x: 345, y: 100, r: 60, c: '255,240,210', a: 0.12 },
      { type: 'glow', x: 661, y: 118, r: 40, c: '255,240,200', a: 0.22 },
      { type: 'glow', x: 1051, y: 118, r: 40, c: '255,240,200', a: 0.22 },
      { type: 'glow', x: 1220, y: 172, r: 70, c: '255,240,215', a: 0.16 },
      { type: 'glow', x: 1081, y: 86, r: 16, c: '255,60,60', a: 0.25 }
    ]
  },

  // La rotonda a la izquierda de la Sonora: el botellon
  rotonda: {
    name: 'La rotonda', sub: 'Astrabudua · botellón',
    w: 640, floor: 200,
    layers: [
      { src: 'sprites/story/astra-cielo.png', f: 0.3 },
      { src: 'sprites/story/rotonda.png', f: 1 }
    ],
    onEnter: 'rotonda_llegar',
    spawns: { sonora: { x: 610, dir: -1 } },
    exits: [{ x: 620, w: 20, to: 'astrabudua', spawn: 'rotonda', label: 'Volver a la Sonora' }],
    actors: [
      { id: 'ekaitz', x: 250, dir: 1, when: function (g) { return g.flag('rotonda'); } },
      { id: 'javi', x: 230, dir: 1, when: function (g) { return g.flag('rotonda'); } },
      { id: 'sadaba', x: 300, dir: -1, when: function (g) { return g.flag('rotonda'); } },
      { id: 'manso', x: 340, dir: -1, when: function (g) { return g.flag('rotonda'); } },
      { id: 'lier', x: 370, dir: -1, when: function (g) { return g.flag('rotonda'); } },
      { id: 'igor', x: 400, dir: -1, when: function (g) { return g.flag('rotonda'); } }
    ],
    objects: [
      { id: 'destorni_coger', name: 'Botellas', x: 318, reach: 14, py: 150, label: 'Prepararte un destorni', run: 'destorni_coger', when: function (g) { return g.flag('botellas') && !g.has('destorni') && (g.flag('tajada') || 0) < 3; } },
      { id: 'destorni_beber', name: 'Destorni', x: 318, reach: 320, py: 150, label: 'Beberte el destorni', run: 'destorni_beber', when: function (g) { return g.has('destorni'); } },
      { id: 'rot_ekaitz', name: 'Ekaitz', x: 250, reach: 9, py: 144, label: 'Hablar con Ekaitz', run: 'rotonda_amigo', when: function (g) { return g.flag('rotonda'); } },
      { id: 'rot_javi', name: 'Javi', x: 230, reach: 9, py: 144, label: 'Hablar con Javi', run: 'rotonda_amigo', when: function (g) { return g.flag('rotonda'); } },
      { id: 'rot_sadaba', name: 'Sadaba', x: 300, reach: 9, py: 144, label: 'Hablar con Sadaba', run: 'sadaba_botellas', when: function (g) { return g.flag('rotonda'); } },
      { id: 'rot_manso', name: 'Manso', x: 340, reach: 9, py: 144, label: 'Hablar con Manso', run: 'rotonda_amigo', when: function (g) { return g.flag('rotonda'); } },
      { id: 'rot_lier', name: 'Lier', x: 370, reach: 9, py: 144, label: 'Hablar con Lier', run: 'rotonda_amigo', when: function (g) { return g.flag('rotonda'); } },
      { id: 'rot_igor', name: 'Igor', x: 400, reach: 9, py: 144, label: 'Hablar con Igor', run: 'rotonda_amigo', when: function (g) { return g.flag('rotonda'); } }
    ],
    props: [
      { item: 'vodka', x: 306, y: 188, when: function (g) { return g.flag('botellas'); } },
      { item: 'fanta', x: 320, y: 188, when: function (g) { return g.flag('botellas'); } },
      { item: 'fanta', x: 332, y: 188, when: function (g) { return g.flag('botellas'); } },
      { item: 'destorni', x: 346, y: 188, when: function (g) { return g.flag('botellas'); } }
    ],
    fx: [
      { type: 'glow', x: 104, y: 44, r: 70, c: '255,240,200', a: 0.16 },
      { type: 'glow', x: 514, y: 44, r: 70, c: '255,240,200', a: 0.16 },
      { type: 'glow', x: 300, y: 160, r: 90, c: '255,220,160', a: 0.08 }
    ]
  }
};
