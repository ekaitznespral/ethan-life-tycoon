// Generador de sprites pixel art de Ethan (48x48) sin dependencias.
// Look oficial: camiseta corta azul de deporte + pantalon corto + BMW reventadas. Delgado.
// Salidas: 6 bustos (ethan-sheet), 4 frames andando (ethan-walk), 1 cuerpo entero frontal
// (ethan-full), cosmeticos (cos-*.png estatico, cos-*-walk.png tira de 4 fotogramas
// sincronizada con el paseo, ico-*.png icono recortado) y arte de cajas (caja-*.png).
// Uso: node tools/make-sprites.js
var zlib = require('zlib'), fs = require('fs'), path = require('path');

var W = 48, H = 48;

var P = {
  _: null,
  K: [31, 36, 30],      // tinta
  H: [40, 33, 30],      // pelo
  h: [74, 59, 48],      // pelo brillo
  S: [232, 185, 144],   // piel
  s: [201, 150, 107],   // piel sombra
  C: [216, 163, 121],   // piel media
  E: [248, 246, 240],   // blanco
  e: [210, 208, 198],   // blanco sombra
  P: [58, 42, 30],      // pupila
  M: [160, 88, 72],     // boca
  T: [181, 189, 104],   // dientes verdosos
  t: [137, 142, 66],    // sarro
  Z: [58, 110, 216],    // azul camiseta
  z: [41, 82, 168],     // azul sombra
  N: [40, 50, 78],      // navy pantalon
  n: [58, 72, 108],     // navy brillo
  G: [168, 128, 94],    // vello suave
  R: [196, 46, 40],     // rojo
  B: [38, 38, 44],      // negro
  Q: [233, 183, 61],    // oro
  q: [181, 134, 32],    // oro sombra
  O: [139, 94, 60],     // marron
  o: [104, 68, 42],     // marron oscuro
  L: [128, 130, 138],   // gris cable
  V: [171, 71, 188],    // morado (epico)
  Y: [214, 232, 60],    // amarillo reflectante
  y: [170, 186, 40],    // reflectante sombra
  W: [62, 84, 110],     // mono de trabajo
  w: [44, 62, 84],      // mono sombra
  X: [120, 24, 48],     // kalimotxo
  F: [214, 160, 90],    // pan
  f: [170, 118, 60],    // pan sombra
  J: [240, 204, 80],    // tortilla
  A: [120, 200, 60],    // aura de sarro
  a: [186, 236, 110],   // aura brillo
  D: [70, 72, 80],      // gris oscuro
  g: [78, 125, 91],     // verde taller
  k: [52, 88, 64],      // verde taller sombra
  r: [130, 30, 26],     // rojo oscuro
  c: [150, 104, 64],    // carton
  b: [132, 198, 240],   // sudor / babas
  m: [255, 92, 160],    // neon rosa
  u: [60, 230, 210],    // neon turquesa
  i: [92, 150, 60],     // botella verde
  j: [200, 30, 38]      // caja de birras
};

function newFB(w, h) {
  w = w || W; h = h || H;
  var fb = [];
  for (var y = 0; y < h; y++) { fb.push([]); for (var x = 0; x < w; x++) fb[y].push('_'); }
  return fb;
}
function px(fb, x, y, c) { if (y >= 0 && y < fb.length && x >= 0 && x < fb[0].length) fb[y][x] = c; }
function rect(fb, x0, y0, w, h, c) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) px(fb, x, y, c); }
function hline(fb, x0, x1, y, c) { for (var x = x0; x <= x1; x++) px(fb, x, y, c); }
function vline(fb, x, y0, y1, c) { for (var y = y0; y <= y1; y++) px(fb, x, y, c); }
function limb(fb, x0, y0, x1, y1, w2, c) {
  var st = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (var i = 0; i <= st; i++) {
    var x = Math.round(x0 + (x1 - x0) * i / st), y = Math.round(y0 + (y1 - y0) * i / st);
    for (var k = 0; k < w2; k++) px(fb, x + k, y, c);
  }
}

// ============================================================
// BUSTOS 48x48 (cara x13..34, y8..30; delgado)
// ============================================================
function bustHead(fb) {
  rect(fb, 13, 8, 22, 22, 'S');
  // esquinas
  rect(fb, 13, 8, 2, 2, '_'); rect(fb, 33, 8, 2, 2, '_');
  px(fb, 15, 8, '_'); px(fb, 32, 8, '_');
  // mandibula estrecha (delgado)
  rect(fb, 13, 26, 2, 4, '_'); rect(fb, 33, 26, 2, 4, '_');
  px(fb, 15, 29, '_'); px(fb, 32, 29, '_');
  hline(fb, 16, 31, 30, 'S'); hline(fb, 18, 29, 31, 'S'); hline(fb, 20, 27, 32, 'S');
  // sombras
  vline(fb, 34, 11, 25, 's'); vline(fb, 33, 26, 28, 's');
  px(fb, 16, 30, 's'); px(fb, 31, 30, 's');
  hline(fb, 20, 27, 31, 's');
  // orejas
  rect(fb, 11, 17, 2, 4, 'S'); px(fb, 11, 18, 's');
  rect(fb, 35, 17, 2, 4, 'S'); px(fb, 36, 18, 's');
  // contorno
  vline(fb, 12, 13, 16, 'K'); vline(fb, 35, 13, 16, 'K');
  vline(fb, 10, 17, 20, 'K'); vline(fb, 37, 17, 20, 'K');
  vline(fb, 12, 21, 25, 'K'); vline(fb, 35, 21, 25, 'K');
  vline(fb, 13, 25, 27, 'K'); vline(fb, 34, 25, 27, 'K');
  px(fb, 14, 28, 'K'); px(fb, 33, 28, 'K');
  px(fb, 15, 29, 'K'); px(fb, 32, 29, 'K');
  hline(fb, 16, 17, 30, 'K'); hline(fb, 30, 31, 30, 'K');
  hline(fb, 18, 29, 31, 'K'); hline(fb, 20, 27, 32, 'K');
  // cuello fino
  rect(fb, 21, 32, 6, 4, 'S'); vline(fb, 26, 32, 35, 's');
  vline(fb, 20, 32, 35, 'K'); vline(fb, 27, 32, 35, 'K');
}
function bustTee(fb) { // camiseta deporte azul, hombros estrechos
  rect(fb, 12, 37, 24, 11, 'Z');
  // hombros caidos
  hline(fb, 14, 33, 36, 'Z'); px(fb, 13, 37, 'Z'); px(fb, 34, 37, 'Z');
  // cuello blanco de la camiseta
  hline(fb, 19, 28, 36, 'E'); px(fb, 19, 37, 'E'); px(fb, 28, 37, 'E');
  // mangas cortas: corte y brazo de piel asomando
  rect(fb, 9, 40, 3, 8, 'S'); rect(fb, 36, 40, 3, 8, 'S');
  vline(fb, 9, 40, 47, 'K'); vline(fb, 39, 40, 47, 'K'); // brazo flaco
  rect(fb, 10, 37, 2, 3, 'Z'); rect(fb, 36, 37, 2, 3, 'Z');
  hline(fb, 10, 12, 40, 'E'); hline(fb, 36, 38, 40, 'E'); // ribete blanco manga
  // sombra y pliegues
  vline(fb, 34, 38, 47, 'z'); vline(fb, 33, 42, 47, 'z');
  hline(fb, 14, 20, 39, 'z');
  // franja deportiva blanca lateral
  vline(fb, 14, 40, 47, 'E'); vline(fb, 33, 40, 47, 'E');
  // contorno
  hline(fb, 14, 18, 35, 'K'); hline(fb, 29, 33, 35, 'K');
  px(fb, 13, 36, 'K'); px(fb, 34, 36, 'K');
  vline(fb, 12, 37, 47, 'K'); vline(fb, 35, 37, 47, 'K');
  px(fb, 11, 38, 'K'); px(fb, 36, 38, 'K'); px(fb, 10, 39, 'K'); px(fb, 37, 39, 'K');
}
function bustHairCurly(fb, alto) {
  alto = alto || 0;
  rect(fb, 12, 3 - alto, 24, 7 + alto, 'H');
  // rizos
  hline(fb, 14, 19, 2 - alto, 'H'); hline(fb, 23, 29, 2 - alto, 'H'); hline(fb, 31, 33, 3 - alto, 'H');
  px(fb, 13, 2 - alto, 'H'); px(fb, 21, 1 - alto, 'H'); px(fb, 27, 1 - alto, 'H'); px(fb, 34, 2 - alto, 'H');
  // laterales
  rect(fb, 11, 9, 3, 5, 'H'); rect(fb, 34, 9, 3, 5, 'H');
  px(fb, 11, 14, 'H'); px(fb, 36, 14, 'H');
  // flequillo irregular
  hline(fb, 13, 34, 9, 'H'); hline(fb, 13, 34, 10, 'H');
  px(fb, 16, 11, 'H'); px(fb, 22, 11, 'H'); px(fb, 28, 11, 'H'); px(fb, 33, 11, 'H');
  // brillos
  hline(fb, 15, 19, 3 - alto, 'h'); hline(fb, 25, 28, 4 - alto, 'h');
  px(fb, 13, 6, 'h'); px(fb, 33, 5, 'h');
}
function bustHairNeat(fb) {
  rect(fb, 12, 4, 24, 6, 'H');
  hline(fb, 14, 33, 3, 'H');
  rect(fb, 11, 9, 3, 4, 'H'); rect(fb, 34, 9, 3, 4, 'H');
  hline(fb, 13, 34, 9, 'H'); hline(fb, 13, 34, 10, 'H');
  px(fb, 17, 11, 'H'); px(fb, 25, 11, 'H'); px(fb, 31, 11, 'H');
  hline(fb, 16, 24, 4, 'h'); px(fb, 30, 5, 'h');
}
function bBrows(fb, raiseL, raiseR) {
  hline(fb, 15, 20, 14 - (raiseL ? 1 : 0), 'K'); px(fb, 21, 15 - (raiseL ? 1 : 0), 'K');
  px(fb, 26, 15 - (raiseR ? 1 : 0), 'K'); hline(fb, 27, 32, 14 - (raiseR ? 1 : 0), 'K');
}
function bEyesOpen(fb, dx) {
  dx = dx || 0;
  rect(fb, 16, 16, 5, 3, 'E'); rect(fb, 27, 16, 5, 3, 'E');
  rect(fb, 17 + dx, 16, 2, 2, 'P'); rect(fb, 28 + dx, 16, 2, 2, 'P');
  hline(fb, 16, 20, 15, 'K'); hline(fb, 27, 31, 15, 'K');
}
function bEyesClosed(fb) {
  px(fb, 16, 18, 'K'); px(fb, 17, 17, 'K'); px(fb, 18, 16, 'K'); px(fb, 19, 17, 'K'); px(fb, 20, 18, 'K');
  px(fb, 27, 18, 'K'); px(fb, 28, 17, 'K'); px(fb, 29, 16, 'K'); px(fb, 30, 17, 'K'); px(fb, 31, 18, 'K');
}
function bEyesRolled(fb) {
  rect(fb, 16, 16, 5, 3, 'E'); rect(fb, 27, 16, 5, 3, 'E');
  hline(fb, 16, 21, 15, 'K'); hline(fb, 26, 31, 15, 'K');
  hline(fb, 16, 20, 16, 'e'); hline(fb, 27, 31, 16, 'e'); // parpado caido
}
function bNose(fb) {
  vline(fb, 24, 17, 22, 'C'); px(fb, 23, 21, 'C'); px(fb, 23, 22, 'C');
  px(fb, 22, 22, 's'); hline(fb, 23, 25, 23, 's');
}
function bStache(fb) { hline(fb, 19, 22, 25, 'G'); hline(fb, 26, 29, 25, 'G'); }
function bScruff(fb) { px(fb, 21, 30, 'G'); px(fb, 24, 31, 'G'); px(fb, 27, 30, 'G'); }
function bMouthGrin(fb) { // dientes verdes con sarro
  hline(fb, 17, 30, 26, 'K');
  hline(fb, 18, 29, 27, 'T'); px(fb, 20, 27, 't'); px(fb, 24, 27, 't'); px(fb, 27, 27, 't');
  hline(fb, 18, 29, 28, 'T'); px(fb, 22, 28, 't'); px(fb, 26, 28, 't'); px(fb, 29, 28, 't');
  hline(fb, 19, 28, 29, 'M');
  px(fb, 17, 27, 'M'); px(fb, 30, 27, 'M');
}
function bMouthScrunch(fb) {
  hline(fb, 19, 28, 27, 'M'); hline(fb, 20, 27, 28, 'M');
  px(fb, 18, 26, 'M'); px(fb, 29, 26, 'M');
}
function bMouthPout(fb) {
  hline(fb, 21, 26, 26, 'M'); hline(fb, 21, 26, 27, 's'); px(fb, 20, 27, 's');
}
function bMouthSoft(fb) {
  hline(fb, 19, 28, 27, 'M'); px(fb, 18, 26, 'M'); px(fb, 29, 26, 'M');
  hline(fb, 21, 26, 27, 'T'); px(fb, 23, 27, 't');
}
function bMouthSmirk(fb) {
  hline(fb, 21, 29, 27, 'M'); px(fb, 30, 26, 'M'); px(fb, 20, 28, 's');
  hline(fb, 23, 28, 27, 'T'); px(fb, 25, 27, 't');
}

var BUSTS = [
  { name: '1-feliz', draw: function (fb) {
    bustTee(fb); bustHead(fb); bustHairCurly(fb, 1);
    bBrows(fb); bEyesClosed(fb); bNose(fb); bStache(fb); bScruff(fb); bMouthScrunch(fb);
    px(fb, 15, 22, 'C'); px(fb, 32, 22, 'C');
  }},
  { name: '2-hastiado', draw: function (fb) {
    bustTee(fb); bustHead(fb); bustHairCurly(fb, 0);
    bEyesRolled(fb); bNose(fb); bStache(fb); bMouthPout(fb);
  }},
  { name: '3-dientes', draw: function (fb) {
    bustTee(fb); bustHead(fb); bustHairCurly(fb, 0);
    bBrows(fb, false, true); bEyesOpen(fb, 0); bNose(fb); bStache(fb); bMouthGrin(fb);
  }},
  { name: '4-tranquilo', draw: function (fb) {
    bustTee(fb); bustHead(fb); bustHairNeat(fb);
    bBrows(fb); bEyesOpen(fb, 0); bNose(fb); bStache(fb); bMouthSoft(fb);
  }},
  { name: '5-pillo', draw: function (fb) {
    bustTee(fb); bustHead(fb); bustHairCurly(fb, 2);
    bBrows(fb, true, false); bEyesOpen(fb, 1); bNose(fb); bStache(fb); bScruff(fb); bMouthSmirk(fb);
  }},
  { name: '6-noche', draw: function (fb) {
    bustTee(fb); bustHead(fb); bustHairCurly(fb, 0);
    bBrows(fb); bEyesOpen(fb, 0); bNose(fb); bStache(fb); bMouthSoft(fb);
    // capucha blanca echada al cuello
    hline(fb, 15, 32, 34, 'E'); hline(fb, 13, 34, 35, 'E'); hline(fb, 14, 33, 36, 'e');
  }},
  { name: '7-dormido', draw: function (fb) { // sopa, babeando y con Zzz
    bustTee(fb); bustHead(fb); bustHairCurly(fb, 1);
    hline(fb, 15, 20, 14, 'K'); hline(fb, 27, 32, 14, 'K');
    hline(fb, 16, 20, 17, 'K'); hline(fb, 27, 31, 17, 'K'); px(fb, 16, 16, 'K'); px(fb, 31, 16, 'K');
    bNose(fb); bStache(fb);
    rect(fb, 22, 26, 4, 3, 'K'); rect(fb, 23, 27, 2, 1, 'M'); px(fb, 25, 29, 'b'); px(fb, 25, 30, 'b'); px(fb, 26, 31, 'b');
    hline(fb, 38, 43, 2, 'E'); px(fb, 42, 3, 'E'); px(fb, 41, 4, 'E'); px(fb, 40, 5, 'E'); px(fb, 39, 6, 'E'); hline(fb, 38, 43, 7, 'E');
    hline(fb, 42, 45, 10, 'E'); px(fb, 44, 11, 'E'); px(fb, 43, 12, 'E'); hline(fb, 42, 45, 13, 'E');
  }},
  { name: '8-asustado', draw: function (fb) { // cejas arriba, ojos como platos y boca en O
    bustTee(fb); bustHead(fb); bustHairCurly(fb, 2);
    hline(fb, 15, 20, 12, 'K'); px(fb, 14, 13, 'K'); px(fb, 21, 13, 'K');
    hline(fb, 27, 32, 12, 'K'); px(fb, 26, 13, 'K'); px(fb, 33, 13, 'K');
    rect(fb, 16, 15, 5, 4, 'E'); rect(fb, 27, 15, 5, 4, 'E'); px(fb, 18, 16, 'P'); px(fb, 29, 16, 'P');
    hline(fb, 16, 20, 14, 'K'); hline(fb, 27, 31, 14, 'K');
    bNose(fb); bStache(fb);
    rect(fb, 21, 25, 6, 5, 'K'); rect(fb, 22, 26, 4, 3, 'r'); hline(fb, 22, 25, 26, 'T');
    px(fb, 34, 11, 'b'); px(fb, 33, 12, 'b'); px(fb, 34, 12, 'b'); px(fb, 33, 13, 'b'); px(fb, 34, 13, 'b');
  }}
];

// ============================================================
// ANDANDO (vista lateral, mirando a la derecha) 48x48, 4 frames
// Delgado: brazos y piernas de 2px, torso estrecho.
// ============================================================
function walkHead(fb, by) { // by = bob vertical
  // pelo (masa trasera y superior)
  rect(fb, 15, 3 + by, 15, 6, 'H');
  hline(fb, 17, 22, 2 + by, 'H'); hline(fb, 25, 28, 2 + by, 'H');
  rect(fb, 14, 6 + by, 2, 8, 'H'); // nuca
  hline(fb, 18, 23, 3 + by, 'h'); px(fb, 26, 4 + by, 'h');
  // cara (perfil) x17..29
  rect(fb, 17, 8 + by, 13, 9, 'S');
  hline(fb, 16, 28, 7 + by, 'H'); px(fb, 27, 8 + by, 'H'); // flequillo
  // nariz
  px(fb, 30, 11 + by, 'S'); px(fb, 31, 11 + by, 'S'); px(fb, 30, 12 + by, 'S'); px(fb, 31, 12 + by, 's');
  px(fb, 32, 12 + by, 'K'); px(fb, 31, 13 + by, 'K'); px(fb, 30, 10 + by, 'K');
  // ojo + ceja
  rect(fb, 25, 10 + by, 3, 2, 'E'); px(fb, 27, 10 + by, 'P');
  hline(fb, 24, 28, 9 + by, 'K');
  // boca + bigote
  hline(fb, 27, 29, 14 + by, 'M'); px(fb, 28, 13 + by, 'G');
  // oreja
  rect(fb, 20, 11 + by, 2, 3, 's'); px(fb, 20, 12 + by, 'C');
  // contorno cabeza
  hline(fb, 16, 28, 1 + by, 'K');
  vline(fb, 13, 5 + by, 13 + by, 'K');
  vline(fb, 30, 8 + by, 9 + by, 'K');
  px(fb, 30, 14 + by, 'K'); px(fb, 29, 15 + by, 'K');
  // mandibula y cuello
  hline(fb, 18, 28, 16 + by, 's');
  hline(fb, 18, 23, 17 + by, 'K'); px(fb, 27, 17 + by, 'K'); px(fb, 28, 16 + by, 'K');
  rect(fb, 24, 17 + by, 3, 2, 'S');
}
function walkBody(fb, by, armF) {
  // torso: camiseta azul corta (estrecho)
  rect(fb, 21, 19 + by, 10, 9, 'Z');
  vline(fb, 21, 19 + by, 27 + by, 'z');
  hline(fb, 22, 29, 19 + by, 'z');
  vline(fb, 30, 20 + by, 27 + by, 'z');
  // manga corta con ribete
  rect(fb, 26, 19 + by, 5, 4, 'Z'); hline(fb, 26, 30, 23 + by, 'E');
  // contorno torso
  vline(fb, 20, 19 + by, 27 + by, 'K'); vline(fb, 31, 19 + by, 22 + by, 'K');
  hline(fb, 21, 30, 18 + by, 'K');
  // brazo cercano (unico visible), flaco, balanceandose por delante
  limb(fb, 28, 24 + by, 28 + armF, 29 + by, 2, 'S');
  px(fb, 28 + armF, 30 + by, 'S'); px(fb, 29 + armF, 30 + by, 'K'); // mano
}
function walkShorts(fb, by) {
  rect(fb, 20, 27 + by, 12, 7, 'N');
  hline(fb, 21, 31, 27 + by, 'n');
  vline(fb, 31, 28 + by, 33 + by, 'E'); // raya lateral blanca
  vline(fb, 20, 27 + by, 33 + by, 'K'); vline(fb, 32, 27 + by, 33 + by, 'K');
  hline(fb, 21, 30, 34 + by, 'n');
}
function shoe(fb, x, y, fwd) { // zapatilla BMW blanca reventada, punta hacia fwd(+1 dcha)
  rect(fb, x, y, 8, 3, 'E');
  hline(fb, x, x + 7, y + 3, 'K'); // suela
  px(fb, x + (fwd > 0 ? 6 : 1), y + 1, 'Z'); px(fb, x + (fwd > 0 ? 5 : 2), y + 1, 'R'); // M colors
  px(fb, x + 3, y + 2, 'e');
  // reventon en la punta con dedo
  if (fwd > 0) { px(fb, x + 7, y + 1, 'K'); px(fb, x + 7, y, 'S'); }
  else { px(fb, x, y + 1, 'K'); px(fb, x, y, 'S'); }
}
function walkLegs(fb, by, pose) {
  // pose: 0 zancada A, 1 paso juntas, 2 zancada B, 3 paso juntas
  if (pose === 0) {
    limb(fb, 24, 33 + by, 18, 40, 2, 'S'); // trasera atras
    shoe(fb, 13, 41, -1);
    limb(fb, 27, 33 + by, 32, 40, 2, 'S'); // delantera adelante
    shoe(fb, 30, 41, 1);
  } else if (pose === 2) {
    limb(fb, 24, 33 + by, 30, 40, 2, 's');
    shoe(fb, 28, 41, 1);
    limb(fb, 27, 33 + by, 22, 40, 2, 'S');
    shoe(fb, 17, 41, -1);
  } else {
    limb(fb, 24, 33 + by, 23, 41, 2, 's');
    limb(fb, 27, 33 + by, 26, 41, 2, 'S');
    shoe(fb, 21, 42, -1); shoe(fb, 25, 42 - 1, 1);
  }
}
function walkFrame(pose) {
  var fb = newFB();
  var by = (pose === 1 || pose === 3) ? -1 : 0;
  var armF = pose === 0 ? 4 : pose === 2 ? -4 : pose === 1 ? 1 : -2;
  walkLegs(fb, by, pose);
  walkShorts(fb, by);
  walkBody(fb, by, armF);
  walkHead(fb, by);
  return fb;
}

// cuerpo entero frontal (idle)
function fullFront() {
  var fb = newFB();
  // piernas flacas
  limb(fb, 20, 32, 20, 41, 2, 'S'); limb(fb, 26, 32, 26, 41, 2, 'S');
  px(fb, 20, 36, 's'); px(fb, 27, 38, 's');
  shoe(fb, 16, 42, -1); shoe(fb, 24, 42, 1);
  // pantalon corto navy
  rect(fb, 17, 26, 14, 7, 'N');
  vline(fb, 17, 26, 32, 'K'); vline(fb, 30, 26, 32, 'K');
  vline(fb, 18, 27, 32, 'E'); vline(fb, 29, 27, 32, 'E');
  vline(fb, 23, 28, 32, 'K'); px(fb, 24, 32, 'n');
  // camiseta azul corta
  rect(fb, 16, 16, 16, 10, 'Z');
  hline(fb, 17, 30, 16, 'z'); vline(fb, 30, 17, 25, 'z');
  hline(fb, 20, 27, 16, 'E'); // cuello
  vline(fb, 16, 16, 25, 'K'); vline(fb, 31, 16, 25, 'K');
  hline(fb, 17, 30, 26, 'K'); hline(fb, 17, 30, 15, 'K');
  // mangas y brazos flacos
  rect(fb, 13, 17, 3, 4, 'Z'); rect(fb, 32, 17, 3, 4, 'Z');
  hline(fb, 13, 15, 21, 'E'); hline(fb, 32, 34, 21, 'E');
  limb(fb, 13, 22, 13, 30, 2, 'S'); limb(fb, 33, 22, 33, 30, 2, 'S');
  px(fb, 13, 31, 's'); px(fb, 34, 31, 's');
  // cabeza (version compacta del busto)
  rect(fb, 17, 4, 14, 11, 'S');
  rect(fb, 17, 4, 1, 2, '_'); rect(fb, 30, 4, 1, 2, '_');
  px(fb, 17, 13, '_'); px(fb, 30, 13, '_');
  hline(fb, 19, 28, 14, 'S'); hline(fb, 21, 26, 15, 'S');
  vline(fb, 30, 7, 12, 's');
  rect(fb, 15, 2, 18, 4, 'H'); hline(fb, 17, 22, 1, 'H'); hline(fb, 25, 29, 1, 'H');
  rect(fb, 15, 5, 2, 4, 'H'); rect(fb, 31, 5, 2, 4, 'H');
  hline(fb, 17, 30, 6, 'H'); px(fb, 20, 7, 'H'); px(fb, 26, 7, 'H');
  hline(fb, 18, 22, 2, 'h');
  hline(fb, 19, 22, 8, 'K'); hline(fb, 25, 28, 8, 'K'); // cejas
  rect(fb, 19, 9, 3, 2, 'E'); rect(fb, 26, 9, 3, 2, 'E');
  px(fb, 20, 9, 'P'); px(fb, 27, 9, 'P');
  vline(fb, 24, 10, 11, 'C'); px(fb, 23, 12, 's');
  hline(fb, 21, 26, 13, 'M'); hline(fb, 22, 25, 13, 'T'); px(fb, 24, 13, 't');
  vline(fb, 16, 6, 12, 'K'); vline(fb, 31, 6, 12, 'K');
  px(fb, 17, 13, 'K'); px(fb, 30, 13, 'K');
  hline(fb, 18, 20, 14, 'K'); hline(fb, 27, 29, 14, 'K');
  hline(fb, 21, 26, 15, '_'); hline(fb, 21, 26, 15, 'K');
  px(fb, 21, 15, 'K'); px(fb, 26, 15, 'K');
  // cuello
  rect(fb, 22, 15, 4, 1, 'S');
  return fb;
}

// ============================================================
// COSMETICOS (overlay 48x48 alineado al sprite que ANDA)
// anclas: cabeza y1..9 x15..31 · cara/ojo y9..13 x26..33 ·
// cuello y16..19 · cintura y27..30 x20..32 · mano x30..38 y24..31
// ============================================================
var COSMETIC_DRAWS = {
  cepillo: function (fb) { // legendario: sin usar pero sucio
    hline(fb, 31, 39, 27, 'E'); hline(fb, 31, 39, 28, 'e'); // mango
    rect(fb, 38, 24, 2, 3, 'T'); px(fb, 38, 23, 't'); px(fb, 39, 23, 't'); // cerdas con verdin
    px(fb, 40, 25, 'G'); px(fb, 37, 23, 'G'); // roña
    px(fb, 30, 27, 'K'); px(fb, 40, 27, 'K');
  },
  cable: function (fb) { // cable neutro de cinturon
    hline(fb, 20, 32, 28, 'L'); hline(fb, 20, 32, 29, 'L');
    px(fb, 26, 28, 'E'); px(fb, 26, 29, 'E'); // "hebilla": empalme con cinta
    vline(fb, 31, 30, 35, 'L'); px(fb, 32, 35, 'L'); px(fb, 31, 36, 'Q'); // punta de cobre colgando
  },
  tresds: function (fb) { // 3DS Hyrule Edition
    rect(fb, 33, 24, 7, 5, 'Q'); vline(fb, 33, 24, 28, 'q');
    rect(fb, 35, 25, 4, 2, 'Z'); // pantalla
    px(fb, 36, 28, 'K'); px(fb, 38, 28, 'K'); // botones
    hline(fb, 33, 39, 23, 'K'); hline(fb, 33, 39, 29, 'K');
  },
  llaveoro: function (fb) {
    limb(fb, 32, 30, 38, 24, 2, 'Q');
    rect(fb, 37, 21, 4, 4, 'Q'); rect(fb, 38, 22, 2, 2, '_');
    px(fb, 37, 21, 'q'); px(fb, 40, 24, 'q'); px(fb, 33, 29, 'q');
  },
  kebabali: function (fb) {
    limb(fb, 33, 24, 37, 30, 3, 'C'); // durum
    px(fb, 34, 24, 'T'); px(fb, 35, 25, 'R'); px(fb, 36, 26, 'T'); px(fb, 35, 27, 'R');
    hline(fb, 33, 35, 23, 'e'); // papel albal
  },
  gorrathletic: function (fb) {
    rect(fb, 16, 2, 15, 5, 'R'); hline(fb, 18, 28, 1, 'R');
    hline(fb, 16, 30, 4, 'E'); // franja blanca
    hline(fb, 29, 36, 6, 'R'); hline(fb, 30, 36, 7, 'r'.toUpperCase?'R':'R'); // visera
    hline(fb, 29, 36, 8, 'K');
    px(fb, 22, 3, 'E'); px(fb, 23, 3, 'E'); // escudito
  },
  rinonera: function (fb) {
    rect(fb, 24, 28, 8, 4, 'B'); hline(fb, 24, 31, 29, 'L');
    px(fb, 30, 28, 'R'); // cremallera
    hline(fb, 20, 23, 28, 'B'); hline(fb, 32, 33, 28, 'B'); // correa
  },
  gafas: function (fb) {
    rect(fb, 26, 10, 4, 3, 'B'); rect(fb, 31, 10, 3, 3, 'B');
    px(fb, 30, 10, 'K'); hline(fb, 24, 25, 10, 'K');
    px(fb, 27, 11, 'L'); px(fb, 32, 11, 'L'); // reflejo
  },
  movil: function (fb) {
    rect(fb, 34, 23, 4, 7, 'B'); rect(fb, 35, 24, 2, 4, 'Z');
    px(fb, 35, 25, 'E'); px(fb, 36, 26, 'E'); px(fb, 35, 27, 'E'); // grieta
  },
  gorrolana: function (fb) {
    rect(fb, 16, 1, 15, 6, 'L'); hline(fb, 17, 30, 0, 'L');
    hline(fb, 16, 30, 6, 'e'); hline(fb, 16, 30, 7, 'L'); // doblez
    px(fb, 23, 0, 'E'); // pompon
  },
  destor: function (fb) {
    vline(fb, 36, 22, 26, 'R'); vline(fb, 37, 22, 26, 'R'); // mango
    vline(fb, 36, 27, 32, 'L'); // vastago
    px(fb, 36, 33, 'e');
  },
  bufanda: function (fb) {
    rect(fb, 22, 16, 10, 3, 'R'); px(fb, 24, 16, 'E'); px(fb, 28, 17, 'E');
    rect(fb, 28, 19, 3, 6, 'R'); px(fb, 29, 25, 'E'); px(fb, 28, 25, 'R');
    hline(fb, 28, 30, 26, 'R');
  },
  cowboy: function (fb) {
    hline(fb, 12, 34, 6, 'O'); hline(fb, 11, 35, 7, 'o'); // ala ancha
    rect(fb, 17, 1, 13, 5, 'O'); hline(fb, 18, 29, 0, 'o');
    hline(fb, 17, 29, 5, 'o'); // cinta
  },
  desatascador: function (fb) {
    vline(fb, 36, 14, 26, 'O'); // palo
    rect(fb, 33, 11, 7, 3, 'R'); hline(fb, 34, 38, 14, 'K'); // ventosa (hacia arriba)
    px(fb, 33, 13, 'K'); px(fb, 39, 13, 'K');
  },
  gorrapropa: function (fb) {
    rect(fb, 16, 2, 15, 5, 'E'); hline(fb, 18, 28, 1, 'E');
    hline(fb, 29, 36, 6, 'E'); hline(fb, 29, 36, 7, 'K'); // visera
    px(fb, 21, 4, 'Z'); px(fb, 23, 4, 'R'); px(fb, 25, 4, 'Z'); // "logo" neumaticos
  },
  calcetin: function (fb) {
    rect(fb, 35, 23, 3, 6, 'E'); rect(fb, 35, 28, 5, 3, 'E');
    px(fb, 39, 30, 'e'); px(fb, 36, 24, 'e'); // talon y desgaste
    px(fb, 37, 26, 'G'); // lamparon
  }
};

// ============================================================
// COSMETICOS NUEVOS (v2). Reciben ctx = {pose, by, armF, base}
// base = fotograma del Ethan andando (para recolorear ropa o
// sacar contornos). Se dibujan ya en su sitio para cada fotograma.
// ============================================================
function recolor(fb, base, map, region) {
  for (var y = 0; y < base.length; y++) for (var x = 0; x < base[0].length; x++) {
    var c = base[y][x];
    if (map[c] && (!region || region(x, y))) px(fb, x, y, map[c]);
  }
}
var COSMETIC_DRAWS_V2 = {
  // --- cuerpo (recoloreados, siempre cuadran con el fotograma) ---
  chandaloro: function (fb, k) {
    recolor(fb, k.base, { Z: 'Q', z: 'q', N: 'q', n: 'Q' });
  },
  mono: function (fb, k) {
    recolor(fb, k.base, { Z: 'W', z: 'w', N: 'W', n: 'w', E: 'W' }, function (x, y) { return y >= 18 + k.by && y <= 34 + k.by; });
    rect(fb, 23, 21 + k.by, 3, 2, 'w'); px(fb, 24, 21 + k.by, 'L'); // bolsillo con boli
    px(fb, 22, 26 + k.by, 'Q'); px(fb, 29, 26 + k.by, 'Q'); // botones
  },
  chaleco: function (fb, k) {
    recolor(fb, k.base, { Z: 'Y', z: 'y' }, function (x, y) { return x >= 21 && x <= 30 && y >= 19 + k.by && y <= 27 + k.by && !(x >= 26 && y <= 23 + k.by); });
    hline(fb, 21, 25, 25 + k.by, 'L'); hline(fb, 21, 25, 22 + k.by, 'L');
  },
  elastica: function (fb, k) {
    recolor(fb, k.base, { Z: 'R', z: 'r' });
    for (var x = 22; x <= 30; x += 3) vline(fb, x, 19 + k.by, 27 + k.by, 'E');
  },
  aura: function (fb, k) { // contorno verde de sarro alrededor de todo Ethan
    var b = k.base, h = b.length, w = b[0].length;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (b[y][x] !== '_') continue;
      var n = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var yy = y + d[1], xx = x + d[0]; if (yy >= 0 && yy < h && xx >= 0 && xx < w && b[yy][xx] !== '_') n++; });
      if (n) px(fb, x, y, ((x + y + k.pose) % 3) ? 'A' : 'a');
    }
  },
  bmw: function (fb, k) { // BMW sin reventar: las mismas zapas, intactas y relucientes
    var S = k.pose === 0 ? [[13, 41, -1], [30, 41, 1]] : k.pose === 2 ? [[28, 41, 1], [17, 41, -1]] : [[21, 42, -1], [25, 41, 1]];
    S.forEach(function (s) {
      var x = s[0], y = s[1], fwd = s[2];
      rect(fb, x, y, 8, 3, 'E'); hline(fb, x, x + 7, y + 3, 'D');
      px(fb, x + (fwd > 0 ? 6 : 1), y + 1, 'Z'); px(fb, x + (fwd > 0 ? 5 : 2), y + 1, 'R');
      px(fb, x + (fwd > 0 ? 4 : 3), y + 1, 'Z');
      px(fb, x + (fwd > 0 ? 7 : 0), y, 'E'); px(fb, x + (fwd > 0 ? 7 : 0), y + 1, 'E'); // sin agujero
    });
    px(fb, S[0][0] + 2, S[0][1] - 2, 'Q'); px(fb, S[1][0] + 5, S[1][1] - 3, 'Q'); // destellos
  },
  dientes: function (fb, k) { // dientes limpios: brillan en la sonrisa
    hline(fb, 27, 29, 14 + k.by, 'E'); px(fb, 29, 13 + k.by, 'E');
    px(fb, 32, 13 + k.by, 'a'); px(fb, 33, 12 + k.by, 'E'); px(fb, 33, 14 + k.by, 'E'); px(fb, 34, 13 + k.by, 'E');
  },
  // --- cabeza / cara / cuello (se mueven con el bote del paso) ---
  txapela: function (fb, k) {
    var b = k.by;
    hline(fb, 15, 30, 3 + b, 'B'); hline(fb, 14, 31, 2 + b, 'B'); hline(fb, 16, 29, 1 + b, 'B');
    hline(fb, 18, 26, 0 + b, 'B'); px(fb, 22, -1 + b, 'B');
    hline(fb, 17, 22, 1 + b, 'D'); // brillo
  },
  casco: function (fb, k) {
    var b = k.by;
    hline(fb, 17, 28, 0 + b, 'Y'); rect(fb, 15, 1 + b, 16, 5, 'Y'); hline(fb, 15, 30, 5 + b, 'y');
    hline(fb, 18, 23, 1 + b, 'E'); px(fb, 25, 3 + b, 'B'); px(fb, 27, 3 + b, 'B'); // rejillas
    vline(fb, 22, 6 + b, 15 + b, 'B'); // correa
    hline(fb, 15, 30, -1 + b, '_');
  },
  auriculares: function (fb, k) {
    var b = k.by;
    hline(fb, 16, 27, 0 + b, 'D'); px(fb, 15, 1 + b, 'D'); px(fb, 28, 1 + b, 'D');
    vline(fb, 15, 2 + b, 9 + b, 'D'); vline(fb, 28, 2 + b, 4 + b, 'D'); px(fb, 29, 5 + b, 'D');
    rect(fb, 18, 9 + b, 4, 5, 'B'); rect(fb, 19, 10 + b, 2, 3, 'R'); // un solo lado
  },
  corona: function (fb, k) {
    var b = k.by;
    rect(fb, 16, -1 + b + 3, 14, 3, 'Q'); hline(fb, 16, 29, 4 + b, 'q');
    px(fb, 16, 1 + b, 'Q'); px(fb, 20, 0 + b, 'Q'); px(fb, 20, 1 + b, 'Q'); px(fb, 25, 0 + b, 'Q'); px(fb, 25, 1 + b, 'Q'); px(fb, 29, 1 + b, 'Q');
    px(fb, 20, -1 + b, 'Q'); px(fb, 25, -1 + b, 'Q');
    px(fb, 18, 3 + b, 'R'); px(fb, 23, 3 + b, 'Z'); px(fb, 27, 3 + b, 'R');
  },
  bigote: function (fb, k) {
    var b = k.by;
    hline(fb, 26, 31, 13 + b, 'H'); px(fb, 25, 14 + b, 'H'); px(fb, 31, 14 + b, 'H'); px(fb, 28, 12 + b, 'H');
  },
  cadena: function (fb, k) {
    var b = k.by;
    px(fb, 23, 18 + b, 'Q'); px(fb, 24, 19 + b, 'q'); px(fb, 25, 20 + b, 'Q'); px(fb, 26, 20 + b, 'q'); px(fb, 27, 20 + b, 'Q'); px(fb, 28, 19 + b, 'q'); px(fb, 29, 18 + b, 'Q');
    rect(fb, 26, 21 + b, 2, 2, 'Q'); px(fb, 26, 22 + b, 'q'); // medallon
  },
  carnet: function (fb, k) { // carnet de tonto colgado del cuello con cordon rojo
    var b = k.by;
    px(fb, 24, 18 + b, 'R'); px(fb, 25, 19 + b, 'R'); px(fb, 26, 20 + b, 'R'); px(fb, 27, 21 + b, 'R');
    rect(fb, 26, 22 + b, 5, 5, 'E'); hline(fb, 26, 30, 22 + b, 'R'); px(fb, 27, 24 + b, 'S'); px(fb, 27, 25 + b, 'H'); hline(fb, 29, 30, 24 + b, 'K'); hline(fb, 29, 30, 25 + b, 'K');
    vline(fb, 31, 22 + b, 26 + b, 'K'); hline(fb, 26, 31, 27 + b, 'K');
  },
  // --- mano (siguen el balanceo del brazo) ---
  jamon: function (fb, k) { // pata de jamon agarrada por la caña, como una porra
    var x = 29 + k.armF, b = k.by;
    px(fb, x, 30 + b, 'B'); px(fb, x + 1, 30 + b, 'B'); // pezuña
    vline(fb, x, 25 + b, 29 + b, 'O'); vline(fb, x + 1, 25 + b, 29 + b, 'o'); // caña
    hline(fb, x, x + 2, 18 + b, 'r'); hline(fb, x - 1, x + 3, 19 + b, 'r');
    hline(fb, x - 2, x + 4, 20 + b, 'R'); hline(fb, x - 2, x + 4, 21 + b, 'R'); hline(fb, x - 2, x + 4, 22 + b, 'R'); hline(fb, x - 2, x + 3, 23 + b, 'R'); hline(fb, x - 1, x + 2, 24 + b, 'r');
    vline(fb, x - 2, 20 + b, 23 + b, 'E'); px(fb, x - 1, 19 + b, 'E'); px(fb, x - 1, 24 + b, 'e'); // tocino
    px(fb, x + 1, 21 + b, 'e'); px(fb, x + 2, 22 + b, 'e'); px(fb, x, 20 + b, 'e'); // vetas
    vline(fb, x - 3, 20 + b, 23 + b, 'K'); vline(fb, x + 5, 20 + b, 22 + b, 'K'); hline(fb, x, x + 2, 17 + b, 'K'); px(fb, x + 4, 23 + b, 'K');
  },
  kalimotxo: function (fb, k) {
    var x = 29 + k.armF, y = 24 + k.by;
    rect(fb, x, y, 4, 6, 'E'); hline(fb, x, x + 3, y, 'X'); hline(fb, x, x + 3, y + 1, 'X');
    vline(fb, x + 3, y + 1, y + 5, 'e'); hline(fb, x, x + 3, y + 6, 'K');
  },
  pintxo: function (fb, k) {
    var x = 29 + k.armF, y = 23 + k.by;
    rect(fb, x, y + 3, 6, 2, 'F'); hline(fb, x, x + 5, y + 5, 'f'); // pan
    rect(fb, x + 1, y + 1, 4, 2, 'J'); px(fb, x + 2, y + 1, 'q'); // tortilla
    vline(fb, x + 3, y - 2, y + 4, 'O'); // palillo
  },
  llavec4: function (fb, k) {
    var x = 29 + k.armF, y = 27 + k.by;
    hline(fb, x, x + 4, y, 'L'); px(fb, x + 2, y + 1, 'L'); px(fb, x + 4, y + 1, 'L');
    rect(fb, x - 2, y - 1, 2, 3, 'D'); // cabeza de la llave
    rect(fb, x - 3, y + 2, 3, 3, 'R'); px(fb, x - 2, y + 3, 'E'); // llavero del Eroski
  },
  bocata: function (fb, k) {
    var x = 28 + k.armF, y = 25 + k.by;
    rect(fb, x, y, 9, 4, 'F'); hline(fb, x, x + 8, y + 4, 'f'); hline(fb, x + 1, x + 7, y - 1, 'F');
    hline(fb, x, x + 8, y + 2, 'J'); px(fb, x + 3, y + 2, 'q'); px(fb, x + 6, y + 2, 'q');
    px(fb, x + 2, y, 'f'); px(fb, x + 5, y + 1, 'f');
  }
};

// En que hueco va cada cosmetico antiguo (para moverlo en cada fotograma)
var OLD_SLOT = { cepillo: 'mano', cable: 'cintura', tresds: 'mano', llaveoro: 'mano', kebabali: 'mano', gorrathletic: 'cabeza',
  rinonera: 'cintura', gafas: 'cara', movil: 'mano', gorrolana: 'cabeza', destor: 'mano', bufanda: 'cuello', cowboy: 'cabeza',
  desatascador: 'mano', gorrapropa: 'cabeza', calcetin: 'mano' };
var POSES = [0, 1, 2, 3];
function poseCtx(p) { return { pose: p, by: (p === 1 || p === 3) ? -1 : 0, armF: p === 0 ? 4 : p === 2 ? -4 : p === 1 ? 1 : -2 }; }
function shifted(src, dx, dy) {
  var fb = newFB();
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (src[y][x] !== '_') px(fb, x + dx, y + dy, src[y][x]);
  return fb;
}
function cosFrame(id, p) {
  var k = poseCtx(p); k.base = walkFrame(p);
  if (COSMETIC_DRAWS_V2[id]) { var fb = newFB(); COSMETIC_DRAWS_V2[id](fb, k); return fb; }
  var st = newFB(); COSMETIC_DRAWS[id](st);
  var slot = OLD_SLOT[id];
  return slot === 'mano' ? shifted(st, Math.round((k.armF - 4) * 0.75), k.by) : shifted(st, 0, k.by);
}

// Iconos recortados para la interfaz (cajas, inventario)
var ICON_DRAWS = {
  carnet: function () { // carnet de tonto: foto, nombre y TONTO en rojo
    var fb = newFB(20, 20);
    rect(fb, 2, 5, 16, 11, 'E'); hline(fb, 2, 17, 5, 'R'); hline(fb, 2, 17, 6, 'R');
    hline(fb, 1, 18, 4, 'K'); hline(fb, 1, 18, 16, 'K'); vline(fb, 1, 4, 16, 'K'); vline(fb, 18, 4, 16, 'K');
    rect(fb, 3, 8, 5, 6, 'S'); hline(fb, 3, 7, 8, 'H'); hline(fb, 3, 7, 9, 'H'); px(fb, 4, 11, 'K'); px(fb, 6, 11, 'K'); hline(fb, 4, 6, 13, 'T');
    hline(fb, 9, 16, 9, 'K'); hline(fb, 9, 14, 11, 'K'); hline(fb, 9, 16, 13, 'R'); hline(fb, 9, 16, 14, 'R');
    rect(fb, 8, 2, 4, 2, 'L'); hline(fb, 8, 11, 1, 'K'); vline(fb, 7, 2, 3, 'K'); vline(fb, 12, 2, 3, 'K'); hline(fb, 7, 8, 0, 'R'); hline(fb, 11, 12, 0, 'R');
    return fb;
  },
  dientes: function () {
    var fb = newFB(20, 20);
    rect(fb, 4, 5, 12, 9, 'E'); rect(fb, 5, 14, 3, 3, 'E'); rect(fb, 12, 14, 3, 3, 'E');
    hline(fb, 5, 14, 4, 'K'); vline(fb, 3, 5, 13, 'K'); vline(fb, 16, 5, 13, 'K'); px(fb, 4, 4, '_');
    vline(fb, 4, 14, 16, 'K'); vline(fb, 8, 14, 16, 'K'); vline(fb, 11, 14, 16, 'K'); vline(fb, 15, 14, 16, 'K');
    hline(fb, 5, 7, 17, 'K'); hline(fb, 12, 14, 17, 'K'); hline(fb, 9, 10, 14, 'K');
    rect(fb, 6, 6, 2, 3, 'a'); px(fb, 17, 2, 'Q'); px(fb, 16, 1, 'Q'); px(fb, 18, 1, 'Q'); px(fb, 17, 0, 'Q'); px(fb, 17, 3, 'Q');
    return fb;
  },
  bmw: function () {
    var fb = newFB(20, 20);
    rect(fb, 2, 9, 15, 5, 'E'); rect(fb, 4, 7, 7, 2, 'E'); hline(fb, 2, 17, 14, 'D'); hline(fb, 1, 18, 15, 'K');
    hline(fb, 4, 10, 6, 'K'); vline(fb, 3, 7, 8, 'K'); px(fb, 11, 7, 'K'); hline(fb, 12, 16, 8, 'K'); px(fb, 17, 9, 'K'); vline(fb, 18, 10, 14, 'K'); vline(fb, 1, 9, 14, 'K');
    px(fb, 7, 11, 'Z'); px(fb, 8, 11, 'R'); px(fb, 9, 11, 'Z'); px(fb, 8, 10, 'R'); px(fb, 10, 10, 'Z');
    px(fb, 15, 4, 'Q'); px(fb, 14, 3, 'Q'); px(fb, 16, 3, 'Q'); px(fb, 15, 2, 'Q'); px(fb, 15, 5, 'Q');
    return fb;
  }
};
function cropIcon(fb) {
  var x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (var y = 0; y < fb.length; y++) for (var x = 0; x < fb[0].length; x++) if (fb[y][x] !== '_') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  var w = x1 - x0 + 1, h = y1 - y0 + 1, s = Math.max(16, Math.max(w, h) + 4);
  if (s % 2) s++;
  var out = newFB(s, s), ox = Math.floor((s - w) / 2), oy = Math.floor((s - h) / 2);
  for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) out[oy + yy][ox + xx] = fb[y0 + yy][x0 + xx];
  return out;
}

// ============================================================
// CAJAS (32x32)
// ============================================================
function crateBase(fb, face, side, edge) {
  rect(fb, 3, 10, 26, 19, face); rect(fb, 3, 6, 26, 4, side);
  hline(fb, 3, 28, 5, 'K'); hline(fb, 3, 28, 29, 'K'); vline(fb, 2, 6, 28, 'K'); vline(fb, 29, 6, 28, 'K');
  hline(fb, 3, 28, 10, edge);
}
var CASE_DRAWS = {
  sadaba: function () { // caja de carton con cinta y garabato de Sadaba
    var fb = newFB(32, 32); crateBase(fb, 'O', 'c', 'o');
    rect(fb, 14, 6, 4, 23, 'F'); vline(fb, 14, 6, 28, 'f');
    hline(fb, 5, 11, 15, 'K'); px(fb, 6, 16, 'K'); px(fb, 8, 14, 'K'); hline(fb, 7, 10, 17, 'K'); px(fb, 11, 16, 'K'); // garabato
    rect(fb, 20, 19, 7, 6, 'E'); hline(fb, 21, 25, 21, 'R'); hline(fb, 21, 24, 23, 'R'); // etiqueta FRAGIL
    rect(fb, 4, 24, 3, 3, 'o'); px(fb, 26, 12, 'o');
    return fb;
  },
  naval: function () { // caja de madera del astillero con ancla
    var fb = newFB(32, 32); crateBase(fb, 'F', 'f', 'o');
    hline(fb, 3, 28, 16, 'f'); hline(fb, 3, 28, 22, 'f'); vline(fb, 6, 11, 28, 'o'); vline(fb, 25, 11, 28, 'o');
    vline(fb, 15, 12, 25, 'N'); vline(fb, 16, 12, 25, 'N'); hline(fb, 12, 19, 14, 'N'); rect(fb, 14, 11, 4, 2, 'N');
    hline(fb, 11, 20, 25, 'N'); px(fb, 10, 24, 'N'); px(fb, 21, 24, 'N'); px(fb, 10, 23, 'N'); px(fb, 21, 23, 'N');
    return fb;
  },
  jokin: function () { // caja negra con filo de oro: nadie sabe que hay dentro
    var fb = newFB(32, 32); crateBase(fb, 'B', 'D', 'Q');
    vline(fb, 3, 11, 28, 'Q'); vline(fb, 28, 11, 28, 'Q'); hline(fb, 3, 28, 28, 'Q'); hline(fb, 3, 28, 6, 'q');
    rect(fb, 13, 13, 6, 2, 'R'); rect(fb, 17, 15, 2, 3, 'R'); rect(fb, 15, 18, 2, 3, 'R'); rect(fb, 15, 23, 2, 2, 'R'); // ?
    px(fb, 13, 15, 'R');
    return fb;
  },
  diaria: function () { // caja de herramientas del taller
    var fb = newFB(32, 32);
    rect(fb, 3, 12, 26, 16, 'g'); hline(fb, 3, 28, 17, 'k'); rect(fb, 3, 10, 26, 2, 'k');
    hline(fb, 11, 20, 5, 'D'); vline(fb, 10, 6, 9, 'D'); vline(fb, 21, 6, 9, 'D'); // asa
    hline(fb, 3, 28, 9, 'K'); hline(fb, 3, 28, 28, 'K'); vline(fb, 2, 10, 27, 'K'); vline(fb, 29, 10, 27, 'K');
    rect(fb, 14, 15, 4, 4, 'Q'); px(fb, 15, 17, 'K'); // cierre
    px(fb, 6, 22, 'a'); px(fb, 25, 22, 'a');
    return fb;
  }
};

// ============================================================
// CUERPO ENTERO FRONTAL CON POSES (v3)
// Para el saco de golpes y para cuando le agarras paseando.
// Fotogramas: 0 quieto · 1 golpeado · 2 KO · 3..6 agarrado pataleando
// ============================================================
function shoeDown(fb, x, y) { // zapatilla colgando, punta hacia abajo (vista frontal)
  rect(fb, x, y, 4, 4, 'E'); hline(fb, x, x + 3, y + 4, 'K'); vline(fb, x - 1, y, y + 3, 'K'); vline(fb, x + 4, y, y + 3, 'K');
  px(fb, x + 1, y + 1, 'Z'); px(fb, x + 2, y + 1, 'R'); px(fb, x + 1, y + 4, 'S'); // dedo asomando
}
function frontFace(fb, face, dy) {
  var Y = function (v) { return v + dy; };
  if (face === 'scared') {
    px(fb, 19, Y(10), 'K'); hline(fb, 20, 22, Y(9), 'K'); hline(fb, 25, 27, Y(9), 'K'); px(fb, 28, Y(10), 'K');
    rect(fb, 19, Y(11), 3, 3, 'E'); rect(fb, 26, Y(11), 3, 3, 'E'); px(fb, 20, Y(12), 'P'); px(fb, 27, Y(12), 'P');
    vline(fb, 24, Y(13), Y(13), 'C');
    rect(fb, 22, Y(14), 4, 3, 'K'); rect(fb, 23, Y(15), 2, 1, 'r');
    px(fb, 30, Y(9), 'b'); px(fb, 30, Y(10), 'b'); px(fb, 29, Y(10), 'b');
  } else if (face === 'hurt') {
    px(fb, 19, Y(11), 'K'); px(fb, 20, Y(12), 'K'); px(fb, 21, Y(12), 'K'); px(fb, 19, Y(13), 'K');
    px(fb, 28, Y(11), 'K'); px(fb, 27, Y(12), 'K'); px(fb, 26, Y(12), 'K'); px(fb, 28, Y(13), 'K');
    hline(fb, 19, 21, Y(10), 'K'); hline(fb, 26, 28, Y(10), 'K');
    rect(fb, 21, Y(14), 6, 3, 'K'); hline(fb, 22, 25, Y(14), 'T'); rect(fb, 23, Y(16), 2, 1, 'R');
    px(fb, 18, Y(14), 'R'); px(fb, 29, Y(14), 'R'); // mofletes rojos del guantazo
  } else if (face === 'ko') {
    px(fb, 19, Y(11), 'K'); px(fb, 21, Y(11), 'K'); px(fb, 20, Y(12), 'K'); px(fb, 19, Y(13), 'K'); px(fb, 21, Y(13), 'K');
    px(fb, 26, Y(11), 'K'); px(fb, 28, Y(11), 'K'); px(fb, 27, Y(12), 'K'); px(fb, 26, Y(13), 'K'); px(fb, 28, Y(13), 'K');
    hline(fb, 21, 26, Y(15), 'K'); rect(fb, 24, Y(16), 2, 2, 'R'); px(fb, 25, Y(17), 'r');
  } else {
    hline(fb, 19, 22, Y(10), 'K'); hline(fb, 25, 28, Y(10), 'K');
    rect(fb, 19, Y(11), 3, 2, 'E'); rect(fb, 26, Y(11), 3, 2, 'E'); px(fb, 20, Y(11), 'P'); px(fb, 27, Y(11), 'P');
    vline(fb, 24, Y(12), Y(13), 'C'); px(fb, 23, Y(14), 's');
    hline(fb, 21, 26, Y(15), 'M'); hline(fb, 22, 25, Y(15), 'T'); px(fb, 24, Y(15), 't');
    hline(fb, 21, 22, Y(14), 'G'); hline(fb, 25, 26, Y(14), 'G');
  }
}
function frontPose(o) {
  var fb = newFB(), dy = o.dy || 0, Y = function (v) { return v + dy; }, Yb = function (v) { return v + dy + 1; };
  var ctx = { dy: dy, shoes: [] };
  // --- piernas ---
  var L = o.legs || 'stand', ph = o.legPh || 0;
  function legLine(x0, x1, y1, c) { limb(fb, x0, Yb(34), x1, Yb(y1), 2, c || 'S'); }
  if (L === 'stand') {
    legLine(19, 19, 41); legLine(27, 27, 41, 'S'); px(fb, 19, Yb(37), 's'); px(fb, 28, Yb(39), 's');
    shoe(fb, 15, Yb(42), -1); shoe(fb, 25, Yb(42), 1);
    ctx.shoes = [{ k: 'side', x: 15, y: Yb(42), f: -1 }, { k: 'side', x: 25, y: Yb(42), f: 1 }];
  } else if (L === 'splay') { // KO, piernas abiertas
    legLine(19, 15, 41); legLine(27, 31, 41);
    shoe(fb, 9, Yb(42), -1); shoe(fb, 30, Yb(42), 1);
    ctx.shoes = [{ k: 'side', x: 9, y: Yb(42), f: -1 }, { k: 'side', x: 30, y: Yb(42), f: 1 }];
  } else { // pataleo colgando
    var up = ph === 0 ? 'L' : ph === 2 ? 'R' : '';
    if (up === 'L') { limb(fb, 19, Yb(34), 16, Yb(37), 2, 'S'); limb(fb, 16, Yb(37), 17, Yb(39), 2, 's'); shoeDown(fb, 15, Yb(39)); }
    else { legLine(19, ph === 1 ? 17 : 19, 40); shoeDown(fb, ph === 1 ? 16 : 18, Yb(41)); }
    if (up === 'R') { limb(fb, 27, Yb(34), 30, Yb(37), 2, 'S'); limb(fb, 30, Yb(37), 29, Yb(39), 2, 's'); shoeDown(fb, 29, Yb(39)); }
    else { legLine(27, ph === 1 ? 30 : 28, 40); shoeDown(fb, ph === 1 ? 30 : 27, Yb(41)); }
    ctx.shoes = [
      up === 'L' ? { k: 'down', x: 15, y: Yb(39) } : { k: 'down', x: ph === 1 ? 16 : 18, y: Yb(41) },
      up === 'R' ? { k: 'down', x: 29, y: Yb(39) } : { k: 'down', x: ph === 1 ? 30 : 27, y: Yb(41) }];
  }
  // --- pantalon corto ---
  rect(fb, 17, Yb(28), 14, 6, 'N');
  vline(fb, 17, Yb(28), Yb(33), 'K'); vline(fb, 30, Yb(28), Yb(33), 'K');
  vline(fb, 18, Yb(29), Yb(33), 'E'); vline(fb, 29, Yb(29), Yb(33), 'E');
  vline(fb, 23, Yb(30), Yb(33), 'K'); hline(fb, 18, 29, Yb(28), 'n');
  // --- brazos ---
  var A = o.arms || 'down', ap = o.armPh || 0, hl, hr;
  if (A === 'up') { hl = [[9, 9], [8, 11], [10, 8], [8, 10]][ap]; hr = [[38, 11], [39, 8], [37, 10], [39, 9]][ap]; }
  else if (A === 'out') { hl = [6, 18]; hr = [41, 22]; }
  else if (A === 'limp') { hl = [10, 30]; hr = [37, 30]; }
  else { hl = [13, 30]; hr = [34, 30]; }
  limb(fb, 14, Yb(21), hl[0], Yb(hl[1]), 2, 'S'); limb(fb, 32, Yb(21), hr[0], Yb(hr[1]), 2, 'S');
  px(fb, hl[0], Yb(hl[1] + (A === 'up' ? -1 : 1)), 's'); px(fb, hr[0] + 1, Yb(hr[1] + (A === 'up' ? -1 : 1)), 's');
  ctx.hl = { x: hl[0], y: Yb(hl[1]) }; ctx.hr = { x: hr[0], y: Yb(hr[1]) }; ctx.arms = A;
  // --- camiseta ---
  rect(fb, 16, Yb(18), 16, 10, 'Z');
  hline(fb, 17, 30, Yb(18), 'z'); vline(fb, 30, Yb(19), Yb(27), 'z');
  hline(fb, 20, 27, Yb(18), 'E');
  vline(fb, 15, Yb(18), Yb(27), 'K'); vline(fb, 32, Yb(18), Yb(27), 'K');
  hline(fb, 16, 31, Yb(28), 'K'); hline(fb, 16, 31, Yb(17), 'K');
  rect(fb, 13, Yb(19), 3, 3, 'Z'); rect(fb, 32, Yb(19), 3, 3, 'Z'); // mangas
  hline(fb, 13, 15, Yb(22), 'E'); hline(fb, 32, 34, Yb(22), 'E');
  px(fb, 12, Yb(19), 'K'); px(fb, 35, Yb(19), 'K');
  // --- cabeza ---
  rect(fb, 17, Y(6), 14, 11, 'S');
  px(fb, 17, Y(6), '_'); px(fb, 30, Y(6), '_'); px(fb, 17, Y(16), '_'); px(fb, 30, Y(16), '_');
  hline(fb, 19, 28, Y(17), 'S'); vline(fb, 30, Y(8), Y(14), 's');
  rect(fb, 15, Y(11), 2, 3, 'S'); rect(fb, 31, Y(11), 2, 3, 'S'); px(fb, 15, Y(12), 's'); px(fb, 32, Y(12), 's');
  vline(fb, 16, Y(6), Y(15), 'K'); vline(fb, 31, Y(6), Y(15), 'K'); vline(fb, 14, Y(11), Y(13), 'K'); vline(fb, 33, Y(11), Y(13), 'K');
  px(fb, 17, Y(16), 'K'); px(fb, 30, Y(16), 'K'); hline(fb, 18, 29, Y(17), 'K'); hline(fb, 19, 28, Y(18), 'S');
  rect(fb, 22, Y(17), 4, 2, 'S'); px(fb, 21, Y(18), 'K'); px(fb, 26, Y(18), 'K');
  // pelo rizado
  rect(fb, 16, Y(4), 16, 4, 'H'); hline(fb, 17, 22, Y(3), 'H'); hline(fb, 25, 30, Y(3), 'H'); px(fb, 23, Y(2), 'H'); px(fb, 28, Y(2), 'H');
  rect(fb, 15, Y(6), 2, 4, 'H'); rect(fb, 31, Y(6), 2, 4, 'H');
  hline(fb, 17, 30, Y(8), 'H'); px(fb, 19, Y(9), 'H'); px(fb, 23, Y(9), 'H'); px(fb, 28, Y(9), 'H');
  hline(fb, 18, 22, Y(4), 'h'); px(fb, 27, Y(5), 'h');
  hline(fb, 16, 31, Y(2), '_'); hline(fb, 17, 22, Y(2), 'K'); hline(fb, 25, 30, Y(2), 'K'); px(fb, 23, Y(1), 'K'); px(fb, 28, Y(1), 'K');
  px(fb, 16, Y(3), 'K'); px(fb, 31, Y(3), 'K'); vline(fb, 14, Y(5), Y(9), 'K'); vline(fb, 33, Y(5), Y(9), 'K');
  frontFace(fb, o.face || 'normal', dy);
  return { fb: fb, ctx: ctx };
}
var FRONT = [
  { face: 'normal', arms: 'down', legs: 'stand' },
  { face: 'hurt', arms: 'out', legs: 'stand', dy: -1 },
  { face: 'ko', arms: 'limp', legs: 'splay', dy: 1 },
  { face: 'scared', arms: 'up', armPh: 0, legs: 'kick', legPh: 0 },
  { face: 'scared', arms: 'up', armPh: 1, legs: 'kick', legPh: 1, dy: -1 },
  { face: 'scared', arms: 'up', armPh: 2, legs: 'kick', legPh: 2 },
  { face: 'scared', arms: 'up', armPh: 3, legs: 'kick', legPh: 3, dy: -1 }
];
var FRONT_P = FRONT.map(frontPose);

// ============================================================
// COSMETICOS EN BUSTO (48x48, 8 fotogramas) Y EN FRONTAL (7)
// ============================================================
function tightItem(id) { // pixeles del objeto de mano tal cual en el paseo, recortados
  var f = cosFrame(id, 0), x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (f[y][x] !== '_') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  var out = [];
  for (var yy = y0; yy <= y1; yy++) { out.push(f[yy].slice(x0, x1 + 1)); }
  return out;
}
function blit(fb, img, x0, y0) { for (var y = 0; y < img.length; y++) for (var x = 0; x < img[0].length; x++) if (img[y][x] !== '_') px(fb, x0 + x, y0 + y, img[y][x]); }
function outlineAround(fb, base, pose) {
  var h = base.length, w = base[0].length;
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    if (base[y][x] !== '_') continue;
    var n = 0;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var yy = y + d[1], xx = x + d[0]; if (yy >= 0 && yy < h && xx >= 0 && xx < w && base[yy][xx] !== '_') n++; });
    if (n) px(fb, x, y, ((x + y + pose) % 3) ? 'A' : 'a');
  }
}
function hairTop(base) { for (var y = 0; y < H; y++) for (var x = 11; x <= 36; x++) if (base[y][x] === 'H' || base[y][x] === 'h') return y; return 3; }
function dome(fb, x0, x1, t, b, c) { // copa redondeada con contorno
  for (var y = t; y <= b; y++) { var ins = y === t ? 4 : y === t + 1 ? 2 : y === t + 2 ? 1 : 0; hline(fb, x0 + ins, x1 - ins, y, c); px(fb, x0 + ins - 1, y, 'K'); px(fb, x1 - ins + 1, y, 'K'); if (ins) { hline(fb, x0 + ins - 1, x0 + [0, 1, 1, 0, 3][ins] + ins - 1, y - 1, 'K'); } }
  hline(fb, x0 + 4, x1 - 4, t - 1, 'K'); hline(fb, x0 + 2, x0 + 3, t, 'K'); hline(fb, x1 - 3, x1 - 2, t, 'K'); px(fb, x0 + 1, t + 1, 'K'); px(fb, x1 - 1, t + 1, 'K');
}
var HAND_ITEMS = ['jamon', 'cepillo', 'tresds', 'llaveoro', 'kebabali', 'movil', 'destor', 'desatascador', 'calcetin', 'kalimotxo', 'pintxo', 'llavec4', 'bocata'];
var COS_BUST = {
  // ---- cabeza ----
  gorrathletic: function (fb, k) { var t = k.top - 1; dome(fb, 12, 35, t, 8, 'R'); hline(fb, 12, 35, 5, 'E'); hline(fb, 13, 34, 6, 'E'); rect(fb, 22, t + 2, 4, 2, 'E'); px(fb, 23, t + 2, 'R');
    hline(fb, 11, 36, 9, 'R'); hline(fb, 11, 36, 10, 'r'); hline(fb, 12, 35, 11, 'K'); px(fb, 10, 9, 'K'); px(fb, 37, 9, 'K'); px(fb, 10, 10, 'K'); px(fb, 37, 10, 'K'); },
  gorrolana: function (fb, k) { var t = k.top - 1; dome(fb, 12, 35, t, 8, 'L'); for (var x = 14; x <= 33; x += 3) vline(fb, x, t + 2, 7, 'e');
    rect(fb, 11, 8, 26, 3, 'e'); hline(fb, 11, 36, 8, 'L'); hline(fb, 11, 36, 11, 'K'); vline(fb, 10, 8, 10, 'K'); vline(fb, 37, 8, 10, 'K'); rect(fb, 22, t - 2, 4, 3, 'E'); px(fb, 25, t - 2, 'e'); },
  cowboy: function (fb, k) { var t = Math.min(1, k.top); dome(fb, 15, 32, t - 1, 7, 'O'); px(fb, 24, t, 'o'); px(fb, 23, t + 1, 'o'); hline(fb, 15, 32, 6, 'o'); hline(fb, 15, 32, 5, 'o');
    hline(fb, 6, 41, 8, 'O'); hline(fb, 5, 42, 9, 'o'); px(fb, 5, 8, 'O'); px(fb, 42, 8, 'O'); px(fb, 4, 7, 'O'); px(fb, 43, 7, 'O'); hline(fb, 6, 41, 10, 'K'); },
  gorrapropa: function (fb, k) { var t = k.top - 1; dome(fb, 12, 35, t, 8, 'E'); px(fb, 20, 5, 'Z'); px(fb, 21, 5, 'Z'); px(fb, 23, 5, 'R'); px(fb, 24, 5, 'R'); px(fb, 26, 5, 'Z'); px(fb, 27, 5, 'Z');
    hline(fb, 11, 36, 9, 'e'); hline(fb, 11, 36, 10, 'e'); hline(fb, 12, 35, 11, 'K'); px(fb, 10, 9, 'K'); px(fb, 37, 9, 'K'); px(fb, 10, 10, 'K'); px(fb, 37, 10, 'K'); },
  casco: function (fb, k) { var t = k.top - 1; dome(fb, 11, 36, t, 9, 'Y'); hline(fb, 11, 36, 9, 'y'); hline(fb, 16, 21, t + 1, 'E'); px(fb, 15, t + 2, 'E');
    px(fb, 18, 5, 'B'); px(fb, 24, 4, 'B'); px(fb, 30, 5, 'B'); hline(fb, 11, 36, 10, 'K'); vline(fb, 12, 11, 24, 'B'); vline(fb, 35, 11, 24, 'B'); hline(fb, 12, 13, 25, 'B'); hline(fb, 34, 35, 25, 'B'); },
  txapela: function (fb, k) { var t = Math.min(3, k.top + 1); hline(fb, 9, 38, t + 3, 'B'); hline(fb, 8, 39, t + 2, 'B'); hline(fb, 10, 37, t + 1, 'B'); hline(fb, 13, 34, t, 'B'); rect(fb, 23, t - 2, 2, 2, 'B');
    hline(fb, 14, 21, t + 1, 'D'); hline(fb, 9, 38, t + 4, 'K'); },
  auriculares: function (fb, k) { var t = Math.max(0, k.top - 1); hline(fb, 15, 32, t, 'L'); hline(fb, 15, 32, t + 1, 'D'); px(fb, 14, t + 1, 'L'); px(fb, 33, t + 1, 'L'); vline(fb, 13, t + 2, 13, 'L'); vline(fb, 12, t + 2, 13, 'D'); vline(fb, 34, t + 2, 9, 'L'); vline(fb, 35, t + 2, 9, 'D'); px(fb, 35, 10, 'L');
    rect(fb, 8, 14, 4, 8, 'B'); vline(fb, 9, 15, 20, 'R'); vline(fb, 12, 15, 20, 'D'); },
  corona: function (fb, k) { var t = Math.max(0, Math.min(2, k.top)); rect(fb, 14, t + 3, 20, 4, 'Q'); hline(fb, 14, 33, t + 6, 'q');
    [14, 19, 24, 29, 33].forEach(function (x) { vline(fb, x, t, t + 2, 'Q'); }); px(fb, 19, t - 1, 'Q'); px(fb, 29, t - 1, 'Q'); px(fb, 24, t - 1, 'Q');
    px(fb, 17, t + 4, 'R'); px(fb, 24, t + 4, 'Z'); px(fb, 31, t + 4, 'R'); },
  // ---- cara / boca / cuello ----
  gafas: function (fb) { rect(fb, 15, 15, 7, 4, 'B'); rect(fb, 26, 15, 7, 4, 'B'); hline(fb, 22, 25, 16, 'K'); hline(fb, 13, 14, 16, 'K'); hline(fb, 33, 34, 16, 'K'); px(fb, 16, 16, 'L'); px(fb, 27, 16, 'L'); px(fb, 17, 15, 'L'); px(fb, 28, 15, 'L'); },
  bigote: function (fb) { hline(fb, 17, 30, 24, 'H'); hline(fb, 18, 29, 25, 'H'); px(fb, 16, 25, 'H'); px(fb, 31, 25, 'H'); px(fb, 16, 26, 'H'); px(fb, 31, 26, 'H'); hline(fb, 20, 22, 24, 'h'); },
  dientes: function (fb, k) { recolor(fb, k.base, { T: 'E', t: 'E' }); px(fb, 33, 24, 'E'); px(fb, 32, 25, 'E'); px(fb, 34, 25, 'E'); px(fb, 33, 26, 'E'); px(fb, 33, 25, 'a'); },
  carnet: function (fb) { // cordon en V y carnet sobre el pecho
    [[19, 35], [20, 36], [21, 37], [22, 38], [28, 35], [27, 36], [26, 37], [25, 38]].forEach(function (p) { px(fb, p[0], p[1], 'R'); });
    rect(fb, 19, 39, 10, 8, 'E'); hline(fb, 19, 28, 39, 'R'); hline(fb, 19, 28, 40, 'R');
    rect(fb, 20, 42, 3, 3, 'S'); hline(fb, 20, 22, 41, 'H'); hline(fb, 24, 27, 42, 'K'); hline(fb, 24, 26, 44, 'K');
    vline(fb, 18, 39, 46, 'K'); vline(fb, 29, 39, 46, 'K'); hline(fb, 19, 28, 47, 'K'); px(fb, 23, 39, 'Q'); px(fb, 24, 39, 'Q');
  },
  bufanda: function (fb) { rect(fb, 17, 32, 14, 4, 'R'); px(fb, 19, 33, 'E'); px(fb, 23, 34, 'E'); px(fb, 27, 33, 'E'); rect(fb, 26, 36, 4, 9, 'R'); hline(fb, 26, 29, 39, 'E'); hline(fb, 26, 29, 42, 'E'); hline(fb, 26, 29, 45, 'r'); vline(fb, 16, 32, 35, 'K'); vline(fb, 31, 32, 35, 'K'); },
  cadena: function (fb) { [[19, 36], [20, 37], [21, 38], [22, 39], [23, 40], [24, 40], [25, 39], [26, 38], [27, 37], [28, 36]].forEach(function (p, i) { px(fb, p[0], p[1], i % 2 ? 'q' : 'Q'); }); rect(fb, 23, 41, 2, 3, 'Q'); px(fb, 24, 42, 'q'); px(fb, 22, 42, 'Q'); px(fb, 25, 42, 'Q'); },
  // ---- cuerpo ----
  chandaloro: function (fb, k) { recolor(fb, k.base, { Z: 'Q', z: 'q' }); },
  mono: function (fb, k) { recolor(fb, k.base, { Z: 'W', z: 'w', E: 'W' }, function (x, y) { return y >= 35; }); rect(fb, 16, 40, 4, 3, 'w'); px(fb, 17, 39, 'L'); px(fb, 24, 41, 'Q'); px(fb, 24, 45, 'Q'); },
  chaleco: function (fb, k) { recolor(fb, k.base, { Z: 'Y', z: 'y', E: 'Y' }, function (x, y) { return x >= 13 && x <= 34 && y >= 37; }); hline(fb, 13, 34, 42, 'L'); hline(fb, 13, 34, 45, 'L'); },
  elastica: function (fb, k) { recolor(fb, k.base, { Z: 'R', z: 'r' }); for (var x = 15; x <= 33; x += 4) for (var y = 37; y < 48; y++) if (k.base[y][x] === 'Z' || k.base[y][x] === 'z') px(fb, x, y, 'E'); },
  aura: function (fb, k) { outlineAround(fb, k.base, k.pose); }
};
function bustHand(fb, id) {
  var it = tightItem(id), w = it[0].length, h = it.length, x0 = Math.min(47 - w + 1, 40 - Math.floor(w / 2)), y0 = 34 - h + 2;
  limb(fb, 38, 41, 39, 36, 2, 'S'); vline(fb, 37, 37, 41, 'K');
  blit(fb, it, x0, y0);
  rect(fb, 38, 33, 4, 3, 'S'); hline(fb, 38, 41, 36, 's'); px(fb, 42, 34, 'K'); px(fb, 37, 34, 'K'); hline(fb, 38, 41, 32, 'K');
}
var COS_FRONT = {
  gorrathletic: function (fb, k) { var d = k.dy; rect(fb, 16, 1 + d, 16, 5, 'R'); hline(fb, 18, 29, d, 'R'); hline(fb, 16, 31, 3 + d, 'E'); px(fb, 23, 1 + d, 'E'); px(fb, 24, 1 + d, 'E'); hline(fb, 15, 32, 6 + d, 'r'); hline(fb, 16, 31, 7 + d, 'K'); },
  gorrolana: function (fb, k) { var d = k.dy; rect(fb, 16, 1 + d, 16, 5, 'L'); hline(fb, 17, 30, d, 'L'); hline(fb, 15, 32, 6 + d, 'e'); hline(fb, 15, 32, 7 + d, 'L'); px(fb, 23, -1 + d, 'E'); px(fb, 24, -1 + d, 'E'); px(fb, 19, 3 + d, 'e'); px(fb, 22, 3 + d, 'e'); px(fb, 25, 3 + d, 'e'); px(fb, 28, 3 + d, 'e'); },
  cowboy: function (fb, k) { var d = k.dy; rect(fb, 18, d, 12, 6, 'O'); px(fb, 24, d, 'o'); hline(fb, 18, 29, 4 + d, 'o'); hline(fb, 11, 36, 6 + d, 'O'); hline(fb, 10, 37, 7 + d, 'o'); px(fb, 10, 6 + d, 'O'); px(fb, 37, 6 + d, 'O'); },
  gorrapropa: function (fb, k) { var d = k.dy; rect(fb, 16, 1 + d, 16, 5, 'E'); hline(fb, 18, 29, d, 'E'); px(fb, 21, 3 + d, 'Z'); px(fb, 23, 3 + d, 'R'); px(fb, 24, 3 + d, 'R'); px(fb, 26, 3 + d, 'Z'); hline(fb, 15, 32, 6 + d, 'e'); hline(fb, 16, 31, 7 + d, 'K'); },
  casco: function (fb, k) { var d = k.dy; hline(fb, 18, 29, d, 'Y'); rect(fb, 16, 1 + d, 16, 6, 'Y'); hline(fb, 16, 31, 6 + d, 'y'); hline(fb, 18, 21, 1 + d, 'E'); px(fb, 20, 3 + d, 'B'); px(fb, 24, 3 + d, 'B'); px(fb, 28, 3 + d, 'B'); vline(fb, 16, 7 + d, 14 + d, 'B'); vline(fb, 31, 7 + d, 14 + d, 'B'); },
  txapela: function (fb, k) { var d = k.dy; hline(fb, 13, 34, 4 + d, 'B'); hline(fb, 14, 33, 3 + d, 'B'); hline(fb, 16, 31, 2 + d, 'B'); hline(fb, 19, 28, 1 + d, 'B'); px(fb, 24, d, 'B'); hline(fb, 16, 21, 2 + d, 'D'); hline(fb, 14, 33, 5 + d, 'K'); },
  auriculares: function (fb, k) { var d = k.dy; hline(fb, 18, 29, 1 + d, 'D'); px(fb, 17, 2 + d, 'D'); px(fb, 30, 2 + d, 'D'); vline(fb, 15, 3 + d, 9 + d, 'D'); px(fb, 16, 2 + d, 'D'); vline(fb, 32, 3 + d, 6 + d, 'D'); px(fb, 31, 2 + d, 'D'); rect(fb, 12, 9 + d, 3, 6, 'B'); vline(fb, 13, 10 + d, 13 + d, 'R'); },
  corona: function (fb, k) { var d = k.dy; rect(fb, 17, 2 + d, 14, 3, 'Q'); hline(fb, 17, 30, 4 + d, 'q'); [17, 20, 24, 27, 30].forEach(function (x) { vline(fb, x, d, 1 + d, 'Q'); }); px(fb, 24, d - 1, 'Q'); px(fb, 19, 3 + d, 'R'); px(fb, 24, 3 + d, 'Z'); px(fb, 28, 3 + d, 'R'); },
  gafas: function (fb, k) { var d = k.dy; rect(fb, 18, 11 + d, 4, 2, 'B'); rect(fb, 25, 11 + d, 4, 2, 'B'); hline(fb, 22, 24, 11 + d, 'K'); px(fb, 17, 11 + d, 'K'); px(fb, 29, 11 + d, 'K'); px(fb, 19, 11 + d, 'L'); px(fb, 26, 11 + d, 'L'); },
  bigote: function (fb, k) { var d = k.dy; hline(fb, 20, 27, 14 + d, 'H'); px(fb, 19, 15 + d, 'H'); px(fb, 28, 15 + d, 'H'); },
  dientes: function (fb, k) { recolor(fb, k.base, { T: 'E', t: 'E' }); var d = k.dy; px(fb, 30, 14 + d, 'E'); px(fb, 29, 15 + d, 'a'); px(fb, 31, 15 + d, 'E'); px(fb, 30, 16 + d, 'E'); },
  carnet: function (fb, k) { var d = k.dy + 1; px(fb, 21, 18 + d, 'R'); px(fb, 22, 19 + d, 'R'); px(fb, 26, 18 + d, 'R'); px(fb, 25, 19 + d, 'R');
    rect(fb, 21, 20 + d, 6, 5, 'E'); hline(fb, 21, 26, 20 + d, 'R'); px(fb, 22, 22 + d, 'S'); px(fb, 22, 23 + d, 'H'); hline(fb, 24, 25, 22 + d, 'K'); hline(fb, 24, 25, 23 + d, 'K'); hline(fb, 21, 26, 25 + d, 'K'); },
  bufanda: function (fb, k) { var d = k.dy; rect(fb, 18, 17 + d, 12, 2, 'R'); px(fb, 20, 17 + d, 'E'); px(fb, 24, 18 + d, 'E'); px(fb, 27, 17 + d, 'E'); rect(fb, 26, 19 + d, 3, 6, 'R'); hline(fb, 26, 28, 21 + d, 'E'); hline(fb, 26, 28, 24 + d, 'r'); },
  cadena: function (fb, k) { var d = k.dy + 1; [[20, 19], [21, 20], [22, 21], [23, 21], [24, 21], [25, 21], [26, 20], [27, 19]].forEach(function (p, i) { px(fb, p[0], p[1] + d, i % 2 ? 'q' : 'Q'); }); rect(fb, 23, 22 + d, 2, 2, 'Q'); },
  chandaloro: function (fb, k) { recolor(fb, k.base, { Z: 'Q', z: 'q', N: 'q', n: 'Q' }); },
  mono: function (fb, k) { var d = k.dy + 1; recolor(fb, k.base, { Z: 'W', z: 'w', N: 'W', n: 'w', E: 'W' }, function (x, y) { return y >= 17 + d && y <= 33 + d; }); rect(fb, 19, 20 + d, 3, 2, 'w'); px(fb, 20, 19 + d, 'L'); px(fb, 24, 22 + d, 'Q'); px(fb, 24, 25 + d, 'Q'); },
  chaleco: function (fb, k) { var d = k.dy + 1; recolor(fb, k.base, { Z: 'Y', z: 'y' }, function (x, y) { return x >= 16 && x <= 31 && y >= 18 + d && y <= 27 + d; }); hline(fb, 16, 31, 22 + d, 'L'); hline(fb, 16, 31, 25 + d, 'L'); },
  elastica: function (fb, k) { recolor(fb, k.base, { Z: 'R', z: 'r' }); for (var x = 17; x <= 31; x += 3) for (var y = 0; y < H; y++) if (k.base[y][x] === 'Z' || k.base[y][x] === 'z') px(fb, x, y, 'E'); },
  cable: function (fb, k) { var d = k.dy + 1; hline(fb, 17, 30, 28 + d, 'L'); hline(fb, 17, 30, 29 + d, 'L'); px(fb, 23, 28 + d, 'E'); px(fb, 23, 29 + d, 'E'); vline(fb, 29, 30 + d, 34 + d, 'L'); px(fb, 29, 35 + d, 'Q'); },
  rinonera: function (fb, k) { var d = k.dy + 1; rect(fb, 20, 28 + d, 8, 4, 'B'); hline(fb, 20, 27, 29 + d, 'L'); px(fb, 26, 28 + d, 'R'); hline(fb, 17, 19, 28 + d, 'B'); hline(fb, 28, 30, 28 + d, 'B'); },
  bmw: function (fb, k) {
    k.shoes.forEach(function (s, i) {
      if (s.k === 'side') { rect(fb, s.x, s.y, 8, 3, 'E'); hline(fb, s.x, s.x + 7, s.y + 3, 'D'); px(fb, s.x + (s.f > 0 ? 6 : 1), s.y + 1, 'Z'); px(fb, s.x + (s.f > 0 ? 5 : 2), s.y + 1, 'R'); px(fb, s.x + (s.f > 0 ? 4 : 3), s.y + 1, 'Z'); }
      else { rect(fb, s.x, s.y, 4, 4, 'E'); hline(fb, s.x, s.x + 3, s.y + 4, 'D'); px(fb, s.x + 1, s.y + 1, 'Z'); px(fb, s.x + 2, s.y + 1, 'R'); }
      px(fb, s.x + (i ? 5 : 1), s.y - 2, 'Q');
    });
  },
  aura: function (fb, k) { outlineAround(fb, k.base, k.pose); }
};
function frontHand(fb, id, k) {
  var it = tightItem(id), w = it[0].length, h = it.length, hx = k.hr.x, hy = k.hr.y;
  var x0 = Math.min(47 - w + 1, hx - Math.floor(w / 2) + 1), y0 = k.arms === 'up' ? hy - h + 2 : hy - Math.floor(h / 2);
  blit(fb, it, x0, y0); rect(fb, hx, hy, 2, 2, 'S'); px(fb, hx + 2, hy, 'K');
}
function bustCosFrames(id) {
  return bustFrames.map(function (base, i) {
    var fb = newFB(), k = { base: base, pose: i, top: hairTop(base) };
    if (COS_BUST[id]) COS_BUST[id](fb, k); else if (HAND_ITEMS.indexOf(id) >= 0) bustHand(fb, id);
    return fb;
  });
}
function frontCosFrames(id) {
  return FRONT_P.map(function (p, i) {
    var fb = newFB(), k = { base: p.fb, pose: i, dy: p.ctx.dy, hr: p.ctx.hr, hl: p.ctx.hl, arms: p.ctx.arms, shoes: p.ctx.shoes };
    if (COS_FRONT[id]) COS_FRONT[id](fb, k); else if (HAND_ITEMS.indexOf(id) >= 0) frontHand(fb, id, k);
    return fb;
  });
}

// Caja Taita del Bar Ekintza (sustituye a la del Naval): caja de birras roja con botellines
CASE_DRAWS.naval = function () {
  var fb = newFB(32, 32);
  // botellines asomando
  [[6, 'i'], [10, 'o'], [14, 'i'], [18, 'o'], [22, 'i'], [26, 'o']].forEach(function (b, n) {
    var x = b[0], top = 3 + (n % 2);
    rect(fb, x - 1, top + 3, 3, 6, b[1]); vline(fb, x, top, top + 3, b[1]); px(fb, x, top - 1, 'Q'); px(fb, x - 1, top - 1, 'q'); px(fb, x + 1, top - 1, 'q');
    px(fb, x - 1, top + 4, 'E');
  });
  rect(fb, 2, 12, 28, 17, 'j'); hline(fb, 2, 29, 12, 'R'); hline(fb, 2, 29, 20, 'r'); hline(fb, 2, 29, 28, 'r');
  rect(fb, 12, 14, 8, 3, 'K'); // asa
  vline(fb, 9, 13, 27, 'r'); vline(fb, 22, 13, 27, 'r');
  // "E" de Ekintza
  hline(fb, 12, 19, 21, 'E'); hline(fb, 12, 19, 22, 'E'); rect(fb, 15, 23, 2, 4, 'E');
  hline(fb, 2, 29, 29, 'K'); vline(fb, 1, 12, 28, 'K'); vline(fb, 30, 12, 28, 'K'); hline(fb, 2, 29, 11, 'K');
  return fb;
};

// ============================================================
// ICONO DE LA APP (RGBA con degradado y circulo suavizado)
// ============================================================
function rgbaCanvas(w, h) { return { w: w, h: h, d: Buffer.alloc(w * h * 4) }; }
function rgbaSet(cv, x, y, c, a) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return; var o = (y * cv.w + x) * 4; a = a === undefined ? 1 : a;
  var ia = cv.d[o + 3] / 255, na = a + ia * (1 - a);
  for (var k = 0; k < 3; k++) cv.d[o + k] = Math.round((c[k] * a + cv.d[o + k] * ia * (1 - a)) / (na || 1));
  cv.d[o + 3] = Math.round(na * 255);
}
function drawIcon(size, artScale, artCx, artBottom, round) {
  var cv = rgbaCanvas(size, size), R = size * 0.22;
  for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
    // fondo: verde taller con foco central
    var dx = x - size / 2, dy = y - size * 0.42, dd = Math.sqrt(dx * dx + dy * dy) / (size * 0.75);
    var t = Math.min(1, dd), c = [Math.round(52 - 21 * t), Math.round(82 - 31 * t), Math.round(64 - 24 * t)];
    var a = 1;
    if (round) { // esquinas redondeadas (solo para el favicon)
      var qx = Math.max(0, Math.abs(x + 0.5 - size / 2) - (size / 2 - R)), qy = Math.max(0, Math.abs(y + 0.5 - size / 2) - (size / 2 - R));
      var q = Math.sqrt(qx * qx + qy * qy); a = Math.max(0, Math.min(1, R - q + 0.5));
    }
    if (a > 0) rgbaSet(cv, x, y, c, a);
  }
  // rayas de peligro abajo
  var band = Math.round(size * 0.075);
  for (var y2 = size - band; y2 < size; y2++) for (var x2 = 0; x2 < size; x2++) {
    var s = Math.floor((x2 + (size - y2)) / (size * 0.06)) % 2;
    if (!round || cv.d[(y2 * size + x2) * 4 + 3] > 0) rgbaSet(cv, x2, y2, s ? [244, 196, 48] : [25, 27, 26], round ? cv.d[(y2 * size + x2) * 4 + 3] / 255 : 1);
  }
  // disco amarillo detras de la cabeza
  var cx = artCx, cy = artBottom - 30 * artScale, rr = 19.5 * artScale;
  for (var y3 = Math.floor(cy - rr - 2); y3 <= cy + rr + 2; y3++) for (var x3 = Math.floor(cx - rr - 2); x3 <= cx + rr + 2; x3++) {
    var dist = Math.sqrt(Math.pow(x3 + 0.5 - cx, 2) + Math.pow(y3 + 0.5 - cy, 2)), al = Math.max(0, Math.min(1, rr - dist + 0.5));
    if (al > 0 && y3 < size - band) rgbaSet(cv, x3, y3, [201, 216, 86], al);
  }
  // Ethan (busto "dientes") en pixel art
  var b = bustFrames[2], ox = Math.round(artCx - 24 * artScale), oy = Math.round(artBottom - 48 * artScale);
  for (var by = 0; by < 48; by++) for (var bx = 0; bx < 48; bx++) {
    var col = P[b[by][bx]]; if (!col) continue;
    for (var sy = 0; sy < artScale; sy++) for (var sx = 0; sx < artScale; sx++) {
      var X = ox + bx * artScale + sx, Y = oy + by * artScale + sy;
      if (Y < size - band) rgbaSet(cv, X, Y, col, 1);
    }
  }
  return cv;
}
function writeRGBA(file, cv) {
  var raw = Buffer.alloc((cv.w * 4 + 1) * cv.h), o = 0;
  for (var y = 0; y < cv.h; y++) { raw[o++] = 0; cv.d.copy(raw, o, y * cv.w * 4, (y + 1) * cv.w * 4); o += cv.w * 4; }
  var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(cv.w, 0); ihdr.writeUInt32BE(cv.h, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

// ============================================================
// escritor PNG
// ============================================================
var CRC_T = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { var c = 0xffffffff; for (var i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  var td = Buffer.concat([Buffer.from(type), data]);
  var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, pixels) {
  var h = pixels.length, w = pixels[0].length;
  var raw = Buffer.alloc((w * 4 + 1) * h);
  var o = 0;
  for (var y = 0; y < h; y++) {
    raw[o++] = 0;
    for (var x = 0; x < w; x++) {
      var c = P[pixels[y][x]];
      if (!c) { raw[o++] = 0; raw[o++] = 0; raw[o++] = 0; raw[o++] = 0; }
      else { raw[o++] = c[0]; raw[o++] = c[1]; raw[o++] = c[2]; raw[o++] = 255; }
    }
  }
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]));
}
function scale(pixels, f) {
  var h = pixels.length, w = pixels[0].length, out = [];
  for (var y = 0; y < h * f; y++) { out.push([]); for (var x = 0; x < w * f; x++) out[y].push(pixels[Math.floor(y / f)][Math.floor(x / f)]); }
  return out;
}
function sheetOf(frames) {
  var h = frames[0].length, w = frames[0][0].length;
  var sh = [];
  for (var y = 0; y < h; y++) { sh.push([]); for (var x = 0; x < w * frames.length; x++) sh[y].push('_'); }
  frames.forEach(function (f, i) { for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) sh[y][i * w + x] = f[y][x]; });
  return sh;
}

// ============================================================
// main
// ============================================================
var outDir = path.join(__dirname, '..', 'sprites');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// bustos
var bustFrames = BUSTS.map(function (sp) { var fb = newFB(); sp.draw(fb); return fb; });
BUSTS.forEach(function (sp, i) {
  writePNG(path.join(outDir, 'ethan-' + sp.name + '.png'), bustFrames[i]);
  writePNG(path.join(outDir, 'ethan-' + sp.name + '@8x.png'), scale(bustFrames[i], 8));
});
var sheet = sheetOf(bustFrames);
writePNG(path.join(outDir, 'ethan-sheet.png'), sheet);
writePNG(path.join(outDir, 'ethan-sheet@4x.png'), scale(sheet, 4));

// andar
var wf = [walkFrame(0), walkFrame(1), walkFrame(2), walkFrame(3)];
var wsheet = sheetOf(wf);
writePNG(path.join(outDir, 'ethan-walk.png'), wsheet);
writePNG(path.join(outDir, 'ethan-walk@4x.png'), scale(wsheet, 4));

// cuerpo entero frontal
var full = fullFront();
writePNG(path.join(outDir, 'ethan-full.png'), full);
writePNG(path.join(outDir, 'ethan-full@8x.png'), scale(full, 8));

// cuerpo frontal con poses (saco de golpes y agarrado)
var frontSheet = sheetOf(FRONT_P.map(function (p) { return p.fb; }));
writePNG(path.join(outDir, 'ethan-front.png'), frontSheet);
writePNG(path.join(outDir, 'ethan-front@4x.png'), scale(frontSheet, 4));

// cosmeticos: estatico (fotograma 0), tira del paseo, tira del busto (8), tira frontal (7) e icono recortado
var ALL_COS = Object.keys(COSMETIC_DRAWS).concat(Object.keys(COSMETIC_DRAWS_V2));
var nBust = 0;
ALL_COS.forEach(function (id) {
  var frames = POSES.map(function (p) { return cosFrame(id, p); });
  writePNG(path.join(outDir, 'cos-' + id + '.png'), frames[0]);
  writePNG(path.join(outDir, 'cos-' + id + '-walk.png'), sheetOf(frames));
  writePNG(path.join(outDir, 'ico-' + id + '.png'), ICON_DRAWS[id] ? ICON_DRAWS[id]() : cropIcon(frames[0]));
  if (COS_BUST[id] || HAND_ITEMS.indexOf(id) >= 0) { writePNG(path.join(outDir, 'cos-' + id + '-bust.png'), sheetOf(bustCosFrames(id))); nBust++; }
  writePNG(path.join(outDir, 'cos-' + id + '-front.png'), sheetOf(frontCosFrames(id)));
});

// cajas
Object.keys(CASE_DRAWS).forEach(function (id) {
  writePNG(path.join(outDir, 'caja-' + id + '.png'), CASE_DRAWS[id]());
});

// iconos de la app (en la raiz del proyecto)
var root = path.join(__dirname, '..');
writeRGBA(path.join(root, 'icon-512.png'), drawIcon(512, 8, 256, 512 - 38, false));
writeRGBA(path.join(root, 'icon-192.png'), drawIcon(192, 3, 96, 192 - 14, false));
writeRGBA(path.join(root, 'apple-touch-icon.png'), drawIcon(180, 3, 90, 180 - 14, false));
writeRGBA(path.join(root, 'icon-maskable-512.png'), drawIcon(512, 6, 256, 512 - 36, false));
writeRGBA(path.join(root, 'favicon.png'), drawIcon(64, 1, 32, 64 - 5, true));

console.log('OK: ' + BUSTS.length + ' bustos, 4 frames andar, 1 full, ' + FRONT.length + ' poses frontales, ' + ALL_COS.length + ' cosmeticos (' + nBust + ' con busto), ' + Object.keys(CASE_DRAWS).length + ' cajas e iconos de la app');
