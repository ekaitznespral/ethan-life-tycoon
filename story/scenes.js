// Modo Historia: datos de la historia y de cada escenario.
// El motor (story/engine.js) no sabe nada de la historia: todo sale de aqui.
//
// Medidas en pixeles de la resolucion interna (la pantalla mide 384x216).
//  - w: ancho total del escenario. floor: altura del suelo (los pies de Ethan).
//  - layers: capas de fondo, de atras hacia delante. f = velocidad respecto a la camara
//    (0 = quieta, 1 = se mueve con el escenario). Ancho minimo de una capa: 384 + (w-384)*f.
//  - platforms: superficies a las que se puede subir saltando (se atraviesan por debajo;
//    S + salto para bajarse). {x, y, w}.
//  - spawns: puntos donde aparece Ethan. exits: zonas con [E] que llevan a otro escenario.
//  - fx: efectos animados. z = indice de la capa tras la que se pintan.
//  - Una capa con front: true se pinta delante de los personajes (p. ej. la mesa).
//  - npcs: personajes. x = centro, top = y de la parte de arriba del sprite (48x48, 7 fotogramas),
//    run = guion que se ejecuta al hablarle, reach = distancia para poder hablarle.
//  - objects: cosas con las que se interactua. label = texto del [E], run = guion,
//    when(g) = condicion para que aparezca (g.flag('x'), g.has('objeto')).
//  - props: objetos de STORY.items pintados en el escenario cuando se cumple when(g).
// Con F2 dentro del juego se ven las plataformas, las salidas y la X de Ethan.
//
// GUIONES: funciones async que reciben "s":
//   await s.say(quien, texto)            quien: 'ethan', id de personaje, otro nombre o null
//   await s.choose(quien, texto, [..])   devuelve el indice elegido
//   s.flag(k) / s.flag(k, valor)         leer / poner una marca de la partida (null la borra)
//   s.has(id) / s.give(id) / s.take(id)  inventario (STORY.items)
//   s.mission(id) / s.complete(id)       empezar / terminar una mision (STORY.missions)
//   await s.cine(true|false)             bandas negras de cine
//   await s.walkTo(x) · s.face(1|-1) · s.sit(x|null) · s.eat(true|false)
//   await s.wait(seg) · await s.fade(1|0, ms) · s.toast(texto)

window.STORY = {
  intro: { cards: ['31 de diciembre de 2022'], scene: 'cocina', spawn: 'inicio' },

  items: {
    tortilla: { name: 'Tortilla de Lourdes', icon: 0, desc: 'La tortilla de Lourdes. Para la cena.' },
    jamon: { name: 'Jamón', icon: 1, desc: 'Un jamón con su jamonero.' },
    langostinos: { name: 'Langostinos', icon: 2, desc: 'Los que pide la hermanastra.' }
  },

  missions: {
    cena: {
      name: 'La cena de Nochevieja',
      steps: [
        { text: 'Saca la tortilla de la nevera', done: function (g) { return g.flag('nevera:tortilla'); } },
        { text: 'Siéntate a cenar en tu silla', done: function (g) { return g.flag('cena_hecha'); } }
      ],
      extra: [
        { text: 'Opcional: saca el jamón', done: function (g) { return g.flag('nevera:jamon'); } },
        { text: 'Opcional: saca los langostinos', done: function (g) { return g.flag('nevera:langostinos'); } }
      ]
    }
  },

  scripts: {
    hermanastra: async function (s) {
      await s.say('hermanastra', 'Tengo hambre. Ethan, trae ya los langostinos.');
    },
    padre: async function (s) {
      await s.say('padre', 'Feliz año y próspera 3DS, Hyrule Edition.');
    },
    lourdes: async function (s) {
      if (!s.flag('mision:cena')) {
        await s.say('lourdes', 'Ethan, saca la tortilla de la nevera.');
        s.mission('cena');
      } else if (!s.flag('nevera:tortilla')) {
        await s.say('lourdes', 'La tortilla, Ethan. Que está en la nevera.');        // PROVISIONAL
      } else if (!s.flag('cena_hecha')) {
        await s.say('lourdes', 'Venga, siéntate, que vamos a cenar.');              // PROVISIONAL
      } else {
        await s.say('lourdes', '¿Qué tal la tortilla?');                            // PROVISIONAL
      }
    },
    nevera: async function (s) {
      for (;;) {
        var ids = ['tortilla', 'jamon', 'langostinos'].filter(function (id) { return !s.flag('nevera:' + id); });
        if (!ids.length) { await s.say(null, 'Ya no queda nada más que sacar.'); return; }
        var c = await s.choose('Nevera', '¿Qué sacas?', ids.map(function (id) { return STORY.items[id].name; }).concat(['Cerrar']));
        if (c >= ids.length) return;
        s.flag('nevera:' + ids[c], 1); s.give(ids[c]);
      }
    },
    vitro: async function (s) {
      await s.say('ethan', 'La vitro sigue rota.');                                 // PROVISIONAL
    },
    silla: async function (s) {
      if (!s.has('tortilla')) { await s.say('ethan', 'Falta la tortilla de Lourdes.'); return; } // PROVISIONAL
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
      // AQUI SIGUE LA HISTORIA (pendiente). De momento Ethan se levanta y vuelve el control.
      s.sit(null); s.face(1);
      await s.wait(0.5);
      await s.fade(0, 900);
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
    { id: 'trascena', name: 'Después de la cena', scene: 'cocina', spawn: 'silla', flags: { 'mision:cena': 'hecha', 'nevera:tortilla': 1, cena_hecha: 1, 'mesa:tortilla': 1 } },
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
      { id: 'hermanastra', name: 'Hermanastra', sprite: 'sprites/story/npc-hermanastra.png', x: 398, top: 144, run: 'hermanastra' },
      { id: 'padre', name: 'Padre', sprite: 'sprites/story/npc-padre.png', x: 444, top: 144, run: 'padre' },
      { id: 'lourdes', name: 'Lourdes', sprite: 'sprites/story/npc-lourdes.png', x: 490, top: 144, run: 'lourdes' }
    ],
    objects: [
      { id: 'nevera', x: 44, reach: 22, py: 124, label: 'Abrir la nevera', run: 'nevera', when: function (g) { return g.flag('mision:cena'); } },
      { id: 'silla', x: 358, reach: 12, py: 150, label: 'Sentarse a cenar', run: 'silla', when: function (g) { return g.flag('mision:cena') === 'activa'; } },
      { id: 'vitro', x: 202, reach: 14, py: 156, label: 'Mirar la vitro', run: 'vitro' }
    ],
    props: [
      { item: 'jamon', x: 382, y: 178, when: function (g) { return g.flag('mesa:jamon'); } },
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
    exits: [{ x: 588, w: 42, to: 'calle', spawn: 'portal', label: 'Salir' }],
    fx: [
      { type: 'fireworks', z: 0, x0: 40, x1: 340, y0: 58, y1: 100, rate: 1.1 },
      { type: 'tv', x: 539, y: 85, w: 40, h: 25 },
      { type: 'glow', x: 559, y: 97, r: 46, c: '120,160,255', a: 0.16, flicker: 1 },
      { type: 'glow', x: 314, y: 14, r: 90, c: '255,250,225', a: 0.10 }
    ]
  },

  calle: {
    name: 'Calle', sub: 'Escena de prueba',
    w: 1100, floor: 200,
    layers: [
      { src: 'sprites/story/calle-cielo.png', f: 0.08 },
      { src: 'sprites/story/calle-lejos.png', f: 0.3 },
      { src: 'sprites/story/calle-medio.png', f: 0.6 },
      { src: 'sprites/story/calle.png', f: 1 }
    ],
    platforms: [
      { x: 420, y: 186, w: 44 },  // banco
      { x: 718, y: 172, w: 46 }   // contenedor
    ],
    spawns: { portal: { x: 87, dir: 1 } },
    exits: [{ x: 66, w: 42, to: 'cocina', spawn: 'puerta', label: 'Entrar a casa' }],
    fx: [
      { type: 'fireworks', z: 0, x0: 20, x1: 460, y0: 25, y1: 110, rate: 1.6 },
      { type: 'blink', x: 304, y: 57, f: 0.3, z: 1 },
      { type: 'blink', x: 322, y: 69, f: 0.3, z: 1, phase: 0.5 },
      { type: 'glow', x: 312, y: 126, r: 44, c: '255,225,150', a: 0.22 },
      { type: 'glow', x: 652, y: 126, r: 44, c: '255,225,150', a: 0.22 },
      { type: 'glow', x: 992, y: 126, r: 44, c: '255,225,150', a: 0.22 },
      { type: 'glow', x: 87, y: 138, r: 30, c: '255,235,180', a: 0.14 },
      { type: 'glow', x: 917, y: 120, r: 34, c: '255,90,110', a: 0.25, flicker: 0.4 },
      { type: 'glow', x: 926, y: 168, r: 60, c: '255,200,110', a: 0.14 }
    ]
  }
};
