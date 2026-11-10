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

window.STORY = {
  intro: { cards: ['31 de diciembre de 2022'], scene: 'cocina', spawn: 'inicio' },

  items: {
    tortilla: { name: 'Tortilla de Lourdes', icon: 0, desc: 'La tortilla de Lourdes. Para la cena.' },
    jamon: { name: 'Jamón', icon: 1, desc: 'Un jamón con su jamonero.' },
    langostinos: { name: 'Langostinos', icon: 2, desc: 'Los que pide la hermanastra.' },
    // solo se ven en la mesa (no van al inventario)
    uvas: { name: 'Uvas', icon: 3 },
    lacasitos: { name: 'Lacasitos', icon: 4 },
    nuggets: { name: 'Nuggets del Burger King', icon: 5 }
  },

  // Reloj de la partida: aparece despues de la cena. rate = segundos reales por minuto de juego.
  // events: guiones que saltan a una hora (una sola vez; se rearman borrando la flag "hora:<id>").
  clock: {
    rate: 0.8,
    events: [
      { id: 'campanadas', at: '23:59', run: 'campanadas', when: function (g) { return g.flag('cena_hecha'); } },
      { id: 'quedada', at: '00:30', run: 'quedada', when: function (g) { return g.flag('ano_nuevo'); } },
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
        { text: 'Llega al metro antes de la 1:15', done: function (g) { return g.flag('metro_ok'); } }
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
    // llegar al metro a tiempo
    metro: async function (s) {
      s.flag('metro_ok', 1); s.complete('metro');
      await s.wait(1.2);
      await s.cine(true);
      await s.fade(1, 900);
      await s.card('Continuará...');           // AQUI SIGUE LA HISTORIA (pendiente)
      await s.fade(0, 700);
      await s.cine(false);
    }
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
    { id: 'calle', name: 'Calle (escena de prueba)', scene: 'calle', spawn: 'portal' }
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
    exits: [{ x: 588, w: 42, to: 'calle', spawn: 'portal', label: 'Salir', when: function (g) { return g.flag('ano_nuevo'); }, locked: 'puerta_cerrada' }],
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
    exits: [{ x: 252, w: 48, to: 'cocina', spawn: 'puerta', label: 'Entrar al portal' }],
    objects: [
      { id: 'metro', name: 'Metro', x: 1528, reach: 30, py: 160, label: 'Bajar al metro', run: 'metro', when: function (g) { return g.flag('mision:metro') === 'activa'; } }
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
  }
};
