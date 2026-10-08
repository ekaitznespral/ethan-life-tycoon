// Generador de sprites pixel art de Ethan (48x48) sin dependencias.
// Look oficial: camiseta corta azul de deporte + pantalon corto + BMW reventadas. Delgado.
// Salidas: 6 bustos (ethan-sheet), 4 frames andando (ethan-walk), 1 cuerpo entero frontal
// (ethan-full) y 16 cosmeticos (cos-*.png) alineados al sprite que anda.
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
  V: [171, 71, 188]     // morado (epico)
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

// cosmeticos
Object.keys(COSMETIC_DRAWS).forEach(function (id) {
  var fb = newFB();
  COSMETIC_DRAWS[id](fb);
  writePNG(path.join(outDir, 'cos-' + id + '.png'), fb);
});

console.log('OK: 6 bustos, 4 frames andar, 1 full, ' + Object.keys(COSMETIC_DRAWS).length + ' cosmeticos en /sprites');
