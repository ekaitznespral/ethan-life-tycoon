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
// Con F2 dentro del juego se ven las plataformas, las salidas y la X de Ethan.

window.STORY = {
  intro: { cards: ['31 de diciembre de 2022'], scene: 'cocina', spawn: 'inicio' },
  // Puntos de la historia para el panel de desarrollador (tecla º o F1).
  // Cada uno deja la partida como estaria en ese momento: escenario, flags e inventario.
  // cards: true muestra antes las tarjetas de la intro.
  checkpoints: [
    { id: 'inicio', name: 'Inicio · 31/12/2022 (con la fecha)', cards: true, scene: 'cocina', spawn: 'inicio' },
    { id: 'cocina', name: 'Cocina · Nochevieja', scene: 'cocina', spawn: 'inicio' },
    { id: 'calle', name: 'Calle (escena de prueba)', scene: 'calle', spawn: 'portal' }
  ]
};

window.STORY_SCENES = {
  cocina: {
    name: 'Cocina', sub: 'Casa de Ethan · Nochevieja',
    w: 640, floor: 196,
    layers: [
      { src: 'sprites/story/cocina-cielo.png', f: 0.3 },
      { src: 'sprites/story/cocina.png', f: 1 }
    ],
    platforms: [
      { x: 24, y: 128, w: 40 },   // nevera
      { x: 62, y: 165, w: 244 },  // encimera
      { x: 246, y: 147, w: 40 },  // microondas
      { x: 378, y: 171, w: 128 }  // mesa
    ],
    spawns: { inicio: { x: 150, dir: 1 }, puerta: { x: 606, dir: -1 } },
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
