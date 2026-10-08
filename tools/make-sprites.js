// Generador de sprites pixel art de Ethan (32x32, cuerpo entero) sin dependencias.
// Uniforme oficial: camiseta azul + chandal navy con rayas + zapatillas BMW reventadas.
// Uso: node tools/make-sprites.js  -> escribe sprites/*.png
var zlib = require('zlib'), fs = require('fs'), path = require('path');

var W = 32, H = 32;

// ---------- paleta ----------
var P = {
  _: null,                 // transparente
  K: [31, 36, 30],         // contorno / tinta
  H: [40, 33, 30],         // pelo oscuro
  h: [74, 59, 48],         // pelo brillo
  S: [232, 185, 144],      // piel
  s: [201, 150, 107],      // piel sombra
  E: [248, 246, 240],      // blanco (ojos, rayas, zapas)
  e: [210, 208, 198],      // blanco sombra
  P: [58, 42, 30],         // pupila
  M: [160, 88, 72],        // boca / labios
  T: [181, 189, 104],      // dientes verdosos
  t: [137, 142, 66],       // sarro
  Z: [58, 110, 216],       // camiseta azul
  z: [41, 82, 168],        // azul sombra
  N: [40, 50, 78],         // chandal navy
  n: [58, 72, 108],        // chandal brillo
  G: [168, 128, 94],       // vello/bigote suave
  C: [216, 163, 121],      // piel media (nariz)
  R: [196, 46, 40],        // rojo (acento BMW)
  B: [38, 38, 44]          // negro (bandolera)
};

function newFB() {
  var fb = [];
  for (var y = 0; y < H; y++) { fb.push([]); for (var x = 0; x < W; x++) fb[y].push('_'); }
  return fb;
}
function px(fb, x, y, c) { if (x >= 0 && x < W && y >= 0 && y < H) fb[y][x] = c; }
function rect(fb, x0, y0, w, h, c) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) px(fb, x, y, c); }
function hline(fb, x0, x1, y, c) { for (var x = x0; x <= x1; x++) px(fb, x, y, c); }
function vline(fb, x, y0, y1, c) { for (var y = y0; y <= y1; y++) px(fb, x, y, c); }

// ---------- cabeza (cara x10..21, y5..14) ----------
function baseHead(fb) {
  rect(fb, 10, 5, 12, 10, 'S');
  px(fb, 10, 5, '_'); px(fb, 21, 5, '_');
  px(fb, 10, 14, '_'); px(fb, 21, 14, '_');
  px(fb, 11, 14, 's'); px(fb, 20, 14, 's');
  hline(fb, 12, 19, 14, 'S'); hline(fb, 13, 18, 15, 'S'); // barbilla
  vline(fb, 21, 7, 12, 's'); // sombra lateral
  // orejas
  px(fb, 9, 9, 'S'); px(fb, 9, 10, 's'); px(fb, 22, 9, 'S'); px(fb, 22, 10, 's');
  // contorno
  vline(fb, 9, 7, 8, 'K'); vline(fb, 9, 11, 12, 'K');
  vline(fb, 22, 7, 8, 'K'); vline(fb, 22, 11, 12, 'K');
  vline(fb, 10, 12, 13, 'K'); vline(fb, 21, 12, 13, 'K');
  px(fb, 11, 14, 'K'); px(fb, 20, 14, 'K');
  hline(fb, 12, 19, 15, 'K');
  px(fb, 8, 9, 'K'); px(fb, 8, 10, 'K'); px(fb, 23, 9, 'K'); px(fb, 23, 10, 'K');
  // cuello
  rect(fb, 14, 16, 4, 1, 'S'); px(fb, 17, 16, 's');
}

// pelo rizado con tupe (alto = px extra)
function hairCurly(fb, alto) {
  alto = alto || 0;
  rect(fb, 9, 1 - alto, 14, 4 + alto, 'H');
  hline(fb, 11, 14, 0 - alto, 'H'); hline(fb, 17, 20, 0 - alto, 'H');
  rect(fb, 9, 5, 2, 3, 'H'); rect(fb, 21, 5, 2, 3, 'H');
  px(fb, 9, 8, 'H'); px(fb, 22, 8, 'H');
  hline(fb, 11, 20, 5, 'H');
  px(fb, 13, 6, 'H'); px(fb, 17, 6, 'H'); px(fb, 20, 6, 'H');
  hline(fb, 12, 14, 1 - alto, 'h'); px(fb, 18, 2 - alto, 'h'); px(fb, 10, 3, 'h');
}
function hairNeat(fb) {
  rect(fb, 9, 2, 14, 3, 'H');
  hline(fb, 11, 20, 1, 'H');
  rect(fb, 9, 5, 2, 2, 'H'); rect(fb, 21, 5, 2, 2, 'H');
  hline(fb, 11, 20, 5, 'H'); px(fb, 14, 6, 'H'); px(fb, 18, 6, 'H');
  hline(fb, 13, 16, 2, 'h');
}

// ---------- rasgos ----------
function brows(fb, raiseL, raiseR) {
  hline(fb, 11, 14, 7 - (raiseL ? 1 : 0), 'K');
  hline(fb, 17, 20, 7 - (raiseR ? 1 : 0), 'K');
}
function eyesOpen(fb, dx) {
  dx = dx || 0;
  rect(fb, 11, 8, 3, 2, 'E'); rect(fb, 18, 8, 3, 2, 'E');
  px(fb, 12 + dx, 8, 'P'); px(fb, 19 + dx, 8, 'P');
}
function eyesClosedHappy(fb) {
  px(fb, 11, 9, 'K'); px(fb, 12, 8, 'K'); px(fb, 13, 9, 'K');
  px(fb, 18, 9, 'K'); px(fb, 19, 8, 'K'); px(fb, 20, 9, 'K');
}
function eyesRolled(fb) {
  rect(fb, 11, 8, 3, 2, 'E'); rect(fb, 18, 8, 3, 2, 'E');
  hline(fb, 11, 13, 7, 'K'); hline(fb, 18, 20, 7, 'K'); // parpado caido (tapa cejas)
}
function nose(fb) { vline(fb, 16, 9, 10, 'C'); px(fb, 15, 10, 'C'); px(fb, 15, 11, 's'); }
function stache(fb) { hline(fb, 13, 14, 12, 'G'); hline(fb, 17, 18, 12, 'G'); }

function mouthGrinTeeth(fb) { // sonrisa grande: dientes verdes con sarro
  hline(fb, 12, 19, 12, 'K');
  hline(fb, 12, 19, 13, 'T');
  px(fb, 14, 13, 't'); px(fb, 17, 13, 't'); px(fb, 19, 13, 't');
  hline(fb, 13, 18, 14, 'M');
}
function mouthScrunch(fb) {
  hline(fb, 13, 18, 13, 'M'); px(fb, 12, 12, 'M'); px(fb, 19, 12, 'M');
}
function mouthPout(fb) {
  hline(fb, 14, 17, 12, 'M'); hline(fb, 14, 17, 13, 's');
}
function mouthSoft(fb) { // sonrisa con asomo de dientes verdosos
  hline(fb, 13, 18, 13, 'M'); px(fb, 12, 12, 'M'); px(fb, 19, 12, 'M');
  hline(fb, 14, 17, 13, 'T'); px(fb, 16, 13, 't');
}
function mouthSmirk(fb) {
  hline(fb, 14, 19, 13, 'M'); px(fb, 20, 12, 'M'); px(fb, 13, 13, 's');
  hline(fb, 15, 18, 13, 'T'); px(fb, 17, 13, 't');
}

// ---------- cuerpo: chandal + camiseta azul + zapas BMW ----------
function bodyChandal(fb) {
  // chaqueta chandal navy abierta (y17..23)
  rect(fb, 9, 17, 14, 7, 'N');
  // brazos
  rect(fb, 6, 18, 3, 6, 'N'); rect(fb, 23, 18, 3, 6, 'N');
  // manos
  px(fb, 7, 24, 'S'); px(fb, 24, 24, 'S');
  // rayas blancas del chandal en los brazos
  vline(fb, 6, 18, 23, 'E'); vline(fb, 25, 18, 23, 'E');
  // camiseta azul asomando (pecho en V)
  rect(fb, 13, 17, 6, 3, 'Z');
  px(fb, 14, 20, 'Z'); px(fb, 15, 20, 'Z'); px(fb, 16, 20, 'z'); px(fb, 17, 20, 'Z');
  px(fb, 13, 19, 'z'); px(fb, 18, 19, 'z');
  // cremalleras / bordes de la chaqueta
  vline(fb, 12, 17, 23, 'n'); vline(fb, 19, 17, 23, 'n');
  // brillo hombro
  hline(fb, 10, 11, 17, 'n'); hline(fb, 20, 21, 17, 'n');
  // contornos
  hline(fb, 9, 12, 16, 'K'); hline(fb, 19, 22, 16, 'K');
  vline(fb, 5, 18, 24, 'K'); vline(fb, 26, 18, 24, 'K');
  px(fb, 6, 17, 'K'); px(fb, 25, 17, 'K');
  hline(fb, 6, 8, 24, 'K'); hline(fb, 23, 25, 24, 'K');
  // pantalon de chandal (y24..28) con raya lateral
  rect(fb, 10, 24, 12, 5, 'N');
  vline(fb, 15, 24, 28, 'K'); vline(fb, 16, 24, 28, 'N'); // separacion piernas
  vline(fb, 10, 24, 28, 'E'); vline(fb, 21, 24, 28, 'E'); // rayas laterales
  vline(fb, 9, 24, 28, 'K'); vline(fb, 22, 24, 28, 'K');
  // zapas BMW blancas reventadas (y29..31)
  rect(fb, 8, 29, 7, 2, 'E'); rect(fb, 17, 29, 7, 2, 'E');
  hline(fb, 8, 14, 31, 'K'); hline(fb, 17, 23, 31, 'K'); // suela
  px(fb, 9, 29, 'Z'); px(fb, 13, 29, 'Z'); px(fb, 18, 29, 'Z'); px(fb, 22, 29, 'Z'); // franja M azul
  px(fb, 10, 29, 'R'); px(fb, 21, 29, 'R'); // acento rojo M
  px(fb, 12, 30, 'e'); px(fb, 19, 30, 'e'); // desgaste
  // reventon: punta abierta con el dedo asomando
  px(fb, 8, 30, 'K'); px(fb, 8, 29, 's');
  px(fb, 23, 30, 'K'); px(fb, 23, 29, 'S');
}
// bandolera negra cruzada (para el pillo)
function strapBag(fb) {
  px(fb, 11, 17, 'B'); px(fb, 12, 18, 'B'); px(fb, 13, 19, 'B'); px(fb, 14, 20, 'B');
  px(fb, 15, 21, 'B'); px(fb, 16, 22, 'B'); px(fb, 17, 23, 'B');
  px(fb, 12, 17, 'B'); px(fb, 13, 18, 'B'); px(fb, 14, 19, 'B'); px(fb, 15, 20, 'B');
  px(fb, 16, 21, 'B'); px(fb, 17, 22, 'B');
}
// capucha blanca echada al cuello (para noche)
function hoodDown(fb) {
  hline(fb, 10, 21, 16, 'E'); hline(fb, 9, 22, 17, 'E'); hline(fb, 10, 21, 17, 'e');
  px(fb, 9, 17, 'E'); px(fb, 22, 17, 'E');
}

// ---------- definiciones de los 6 sprites ----------
var SPRITES = [
  { name: '1-feliz', draw: function (fb) {
    bodyChandal(fb); baseHead(fb); hairCurly(fb, 1);
    brows(fb); eyesClosedHappy(fb); nose(fb); stache(fb); mouthScrunch(fb);
    px(fb, 11, 11, 'C'); px(fb, 20, 11, 'C'); // mofletes
  }},
  { name: '2-hastiado', draw: function (fb) {
    bodyChandal(fb); baseHead(fb); hairCurly(fb, 0);
    eyesRolled(fb); nose(fb); stache(fb); mouthPout(fb);
  }},
  { name: '3-dientes', draw: function (fb) {
    bodyChandal(fb); baseHead(fb); hairCurly(fb, 0);
    brows(fb, false, true); eyesOpen(fb, 0); nose(fb); stache(fb); mouthGrinTeeth(fb);
  }},
  { name: '4-tranquilo', draw: function (fb) {
    bodyChandal(fb); baseHead(fb); hairNeat(fb);
    brows(fb); eyesOpen(fb, 0); nose(fb); stache(fb); mouthSoft(fb);
  }},
  { name: '5-pillo', draw: function (fb) {
    bodyChandal(fb); strapBag(fb); baseHead(fb); hairCurly(fb, 2);
    brows(fb, true, false); eyesOpen(fb, 1); nose(fb); stache(fb); mouthSmirk(fb);
  }},
  { name: '6-noche', draw: function (fb) {
    bodyChandal(fb); hoodDown(fb); baseHead(fb); hairCurly(fb, 0);
    brows(fb); eyesOpen(fb, 0); nose(fb); stache(fb); mouthSoft(fb);
  }}
];

// ---------- escritor PNG ----------
var CRC_T = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { var c = 0xffffffff; for (var i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  var td = Buffer.concat([Buffer.from(type), data]);
  var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, pixels, w, h) {
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
  var png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(file, png);
}
function scale(pixels, w, h, f) {
  var out = [];
  for (var y = 0; y < h * f; y++) { out.push([]); for (var x = 0; x < w * f; x++) out[y].push(pixels[Math.floor(y / f)][Math.floor(x / f)]); }
  return out;
}

// ---------- main ----------
var outDir = path.join(__dirname, '..', 'sprites');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

var sheet = [];
for (var y = 0; y < H; y++) { sheet.push([]); for (var x = 0; x < W * SPRITES.length; x++) sheet[y].push('_'); }

SPRITES.forEach(function (sp, i) {
  var fb = newFB();
  sp.draw(fb);
  writePNG(path.join(outDir, 'ethan-' + sp.name + '.png'), fb, W, H);
  writePNG(path.join(outDir, 'ethan-' + sp.name + '@8x.png'), scale(fb, W, H, 8), W * 8, H * 8);
  for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) sheet[yy][i * W + xx] = fb[yy][xx];
});
writePNG(path.join(outDir, 'ethan-sheet.png'), sheet, W * SPRITES.length, H);
writePNG(path.join(outDir, 'ethan-sheet@4x.png'), scale(sheet, W * SPRITES.length, H, 4), W * SPRITES.length * 4, H * 4);
console.log('OK: ' + SPRITES.length + ' sprites + sheet en /sprites');
