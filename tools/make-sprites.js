// Generador de sprites pixel art de Ethan (32x32) sin dependencias.
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
  E: [248, 246, 240],      // blanco ojo / dientes
  P: [58, 42, 30],         // pupila
  M: [160, 88, 72],        // boca / labios
  W: [242, 242, 238],      // tela blanca
  w: [214, 214, 208],      // tela blanca sombra
  R: [184, 53, 47],        // sudadera roja
  r: [143, 39, 34],        // roja sombra
  Y: [232, 194, 58],       // camiseta amarilla
  y: [196, 157, 42],       // amarilla sombra
  B: [38, 38, 44],         // tela negra
  b: [62, 62, 72],         // tela negra brillo
  G: [168, 128, 94],       // vello/bigote suave (mezcla piel)
  C: [216, 163, 121],      // piel media (nariz)
  Q: [255, 199, 44],       // acento amarillo (logos)
  Z: [58, 110, 216]        // azul (móvil / acentos)
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

// ---------- cabeza base ----------
// cara x9..22, y6..19; orejas x8 y x23; cuello y20..21
function baseHead(fb) {
  rect(fb, 9, 6, 14, 14, 'S');
  // redondeo de esquinas de la cara
  px(fb, 9, 6, '_'); px(fb, 22, 6, '_');
  px(fb, 9, 19, '_'); px(fb, 22, 19, '_');
  px(fb, 10, 19, 's'); px(fb, 21, 19, 's');
  // barbilla
  hline(fb, 11, 20, 19, 'S');
  hline(fb, 12, 19, 20, 'S');
  // sombra lateral derecha
  vline(fb, 22, 8, 17, 's');
  // orejas
  rect(fb, 8, 12, 1, 3, 'S'); px(fb, 8, 13, 's');
  rect(fb, 23, 12, 1, 3, 'S'); px(fb, 23, 13, 's');
  // cuello
  rect(fb, 14, 21, 5, 2, 'S'); vline(fb, 18, 21, 22, 's');
  // contorno
  hline(fb, 10, 21, 5, 'K');
  vline(fb, 8, 11, 15, 'K'); vline(fb, 23, 11, 15, 'K');
  vline(fb, 9, 7, 11, 'K'); vline(fb, 22, 7, 11, 'K');
  vline(fb, 9, 15, 18, 'K'); vline(fb, 22, 15, 18, 'K');
  px(fb, 10, 19, 'K'); px(fb, 21, 19, 'K');
  hline(fb, 11, 20, 20, 'K'); px(fb, 12, 20, 'K');
}

// pelo rizado con tupé (por defecto). alto = px extra de tupé
function hairCurly(fb, alto) {
  alto = alto || 0;
  // masa principal
  rect(fb, 8, 2 - alto, 16, 5 + alto, 'H');
  // rizos (bultos) arriba
  hline(fb, 10, 13, 1 - alto, 'H'); hline(fb, 16, 20, 1 - alto, 'H');
  px(fb, 9, 2 - alto, 'H'); px(fb, 22, 2 - alto, 'H');
  // laterales que bajan
  rect(fb, 8, 6, 2, 4, 'H'); rect(fb, 22, 6, 2, 4, 'H');
  px(fb, 8, 10, 'H'); px(fb, 23, 10, 'H');
  // flequillo irregular
  hline(fb, 10, 21, 6, 'H');
  px(fb, 12, 7, 'H'); px(fb, 16, 7, 'H'); px(fb, 20, 7, 'H');
  // brillos
  hline(fb, 11, 13, 2 - alto, 'h'); px(fb, 17, 1 - alto + 1, 'h'); px(fb, 18, 3 - alto, 'h');
  px(fb, 10, 4, 'h'); px(fb, 21, 3, 'h');
}

// pelo corto peinado (foto roja)
function hairNeat(fb) {
  rect(fb, 8, 3, 16, 4, 'H');
  hline(fb, 10, 21, 2, 'H');
  rect(fb, 8, 6, 2, 3, 'H'); rect(fb, 22, 6, 2, 3, 'H');
  hline(fb, 10, 21, 6, 'H'); px(fb, 13, 7, 'H'); px(fb, 18, 7, 'H');
  hline(fb, 12, 15, 3, 'h'); px(fb, 19, 4, 'h');
}

// capucha blanca rodeando la cara (foto puerto)
function hoodWhite(fb) {
  rect(fb, 6, 2, 20, 6, 'W');
  rect(fb, 6, 8, 2, 12, 'W'); rect(fb, 24, 8, 2, 12, 'W');
  px(fb, 7, 20, 'W'); px(fb, 24, 20, 'W');
  // sombra interior
  vline(fb, 8, 8, 18, 'w'); vline(fb, 23, 8, 18, 'w');
  hline(fb, 8, 23, 7, 'w');
  // contorno
  hline(fb, 7, 24, 1, 'K'); vline(fb, 5, 3, 19, 'K'); vline(fb, 26, 3, 19, 'K');
  px(fb, 6, 2, 'K'); px(fb, 25, 2, 'K');
  // mechón de pelo asomando
  hline(fb, 12, 19, 6, 'H'); px(fb, 14, 5, 'H'); px(fb, 17, 5, 'H');
}

// ---------- rasgos ----------
function brows(fb, raiseL, raiseR) {
  hline(fb, 11, 14, 9 - (raiseL ? 1 : 0), 'K');
  hline(fb, 17, 20, 9 - (raiseR ? 1 : 0), 'K');
}
function eyesOpen(fb, dx, dy) {
  dx = dx || 0; dy = dy || 0;
  rect(fb, 11, 11, 3, 2, 'E'); rect(fb, 18, 11, 3, 2, 'E');
  px(fb, 12 + dx, 11 + dy, 'P'); px(fb, 19 + dx, 11 + dy, 'P');
}
function eyesClosedHappy(fb) { // ^ ^
  px(fb, 11, 12, 'K'); px(fb, 12, 11, 'K'); px(fb, 13, 12, 'K');
  px(fb, 18, 12, 'K'); px(fb, 19, 11, 'K'); px(fb, 20, 12, 'K');
}
function eyesRolled(fb) { // en blanco mirando arriba
  rect(fb, 11, 11, 3, 2, 'E'); rect(fb, 18, 11, 3, 2, 'E');
  px(fb, 12, 11, 'P'); px(fb, 19, 11, 'P');
  px(fb, 12, 11, 'E'); px(fb, 19, 11, 'E'); // pupilas ocultas: todo blanco
  hline(fb, 11, 13, 10, 'K'); hline(fb, 18, 20, 10, 'K'); // párpado caído
}
function nose(fb) {
  vline(fb, 16, 12, 14, 'C'); px(fb, 15, 14, 'C'); px(fb, 15, 15, 's');
}
function stache(fb) { hline(fb, 13, 15, 16, 'G'); hline(fb, 17, 19, 16, 'G'); }
function chinScruff(fb) { px(fb, 15, 19, 'G'); px(fb, 16, 19, 'G'); px(fb, 17, 19, 'G'); }

function mouthGrinTeeth(fb) { // sonrisa grande con dientes
  hline(fb, 12, 19, 17, 'K');
  hline(fb, 13, 18, 18, 'E');
  hline(fb, 13, 18, 19, 'M');
  px(fb, 12, 18, 'M'); px(fb, 19, 18, 'M');
}
function mouthScrunch(fb) { // sonrisa apretada (ojos cerrados)
  hline(fb, 13, 18, 18, 'M');
  px(fb, 12, 17, 'M'); px(fb, 19, 17, 'M');
}
function mouthPout(fb) { // morros hastiado
  hline(fb, 14, 17, 17, 'M');
  hline(fb, 14, 17, 18, 's');
}
function mouthSoft(fb) { // sonrisa suave
  hline(fb, 13, 18, 18, 'M'); px(fb, 12, 17, 'M'); px(fb, 19, 17, 'M');
  hline(fb, 14, 17, 17, 'E');
}
function mouthSmirk(fb) { // ladeada
  hline(fb, 14, 19, 18, 'M'); px(fb, 20, 17, 'M'); px(fb, 13, 18, 's');
}

// ---------- torsos (y23..31) ----------
function torsoHoodieWhite(fb) {
  rect(fb, 7, 24, 18, 8, 'W');
  rect(fb, 5, 26, 2, 6, 'W'); rect(fb, 25, 26, 2, 6, 'W');
  hline(fb, 7, 24, 23, 'K'); // hombros contorno
  hline(fb, 12, 19, 23, 'W'); // capucha bajada tras cuello
  hline(fb, 11, 20, 24, 'w');
  vline(fb, 5, 26, 31, 'K'); vline(fb, 26, 26, 31, 'K');
  px(fb, 6, 25, 'K'); px(fb, 25, 25, 'K');
  // cordones
  vline(fb, 14, 25, 27, 'w'); vline(fb, 17, 25, 27, 'w');
  // logo adidas (trébol rojo pequeño)
  px(fb, 15, 29, 'R'); px(fb, 16, 29, 'R'); hline(fb, 15, 16, 30, 'r');
}
function torsoTank(fb) {
  // hombros y brazos de piel
  rect(fb, 7, 24, 18, 8, 'S');
  rect(fb, 5, 26, 2, 6, 'S'); rect(fb, 25, 26, 2, 6, 'S');
  vline(fb, 5, 26, 31, 'K'); vline(fb, 26, 26, 31, 'K');
  hline(fb, 7, 24, 23, 'K');
  // camiseta tirantes negra
  rect(fb, 10, 26, 12, 6, 'B');
  vline(fb, 11, 24, 25, 'B'); vline(fb, 20, 24, 25, 'B');
  // letras ripcurl de colores
  px(fb, 12, 29, 'R'); px(fb, 14, 29, 'Q'); px(fb, 16, 29, 'Z'); px(fb, 18, 29, 'R');
}
function torsoTeeBlack(fb) {
  rect(fb, 7, 24, 18, 8, 'B');
  rect(fb, 5, 26, 2, 6, 'B'); rect(fb, 25, 26, 2, 6, 'B');
  vline(fb, 5, 26, 31, 'K'); vline(fb, 26, 26, 31, 'K');
  hline(fb, 7, 24, 23, 'K');
  hline(fb, 13, 18, 24, 'b'); // cuello camiseta
  // logo puma: zapatilla minimal
  px(fb, 14, 29, 'E'); px(fb, 15, 29, 'E'); px(fb, 16, 29, 'R');
}
function torsoHoodieRed(fb) {
  rect(fb, 7, 24, 18, 8, 'R');
  rect(fb, 5, 26, 2, 6, 'R'); rect(fb, 25, 26, 2, 6, 'R');
  vline(fb, 5, 26, 31, 'K'); vline(fb, 26, 26, 31, 'K');
  hline(fb, 7, 24, 23, 'K');
  hline(fb, 12, 19, 23, 'R'); hline(fb, 11, 20, 24, 'r');
  vline(fb, 14, 25, 27, 'W'); vline(fb, 17, 25, 27, 'W'); // cordones blancos
  hline(fb, 13, 18, 29, 'E'); // REEBOK banda blanca
  px(fb, 22, 27, 'r'); px(fb, 9, 27, 'r');
}
function torsoTeeYellow(fb) {
  rect(fb, 7, 24, 18, 8, 'Y');
  rect(fb, 5, 26, 2, 6, 'Y'); rect(fb, 25, 26, 2, 6, 'Y');
  vline(fb, 5, 26, 31, 'K'); vline(fb, 26, 26, 31, 'K');
  hline(fb, 7, 24, 23, 'K');
  hline(fb, 13, 18, 24, 'y');
  // correa bandolera negra diagonal
  px(fb, 9, 25, 'B'); px(fb, 10, 26, 'B'); px(fb, 11, 27, 'B'); px(fb, 12, 28, 'B');
  px(fb, 13, 29, 'B'); px(fb, 14, 30, 'B'); px(fb, 15, 31, 'B');
  px(fb, 10, 25, 'B'); px(fb, 11, 26, 'B'); px(fb, 12, 27, 'B'); px(fb, 13, 28, 'B');
  px(fb, 14, 29, 'B'); px(fb, 15, 30, 'B'); px(fb, 16, 31, 'B');
  // sombra
  vline(fb, 24, 25, 31, 'y');
}
function torsoPuffer(fb) {
  rect(fb, 6, 24, 20, 8, 'B');
  rect(fb, 4, 26, 2, 6, 'B'); rect(fb, 26, 26, 2, 6, 'B');
  vline(fb, 4, 26, 31, 'K'); vline(fb, 27, 26, 31, 'K');
  hline(fb, 6, 25, 23, 'K');
  // acolchado (líneas de brillo)
  hline(fb, 7, 24, 26, 'b'); hline(fb, 7, 24, 29, 'b');
  // capucha blanca echada: cuello ancho
  hline(fb, 10, 21, 23, 'W'); hline(fb, 9, 22, 24, 'W'); hline(fb, 10, 21, 25, 'w');
  // cremallera
  vline(fb, 16, 26, 31, 'b');
}

// ---------- definiciones de los 6 sprites ----------
var SPRITES = [
  { name: '1-feliz', draw: function (fb) {
    torsoHoodieWhite(fb); baseHead(fb); hairCurly(fb, 1);
    brows(fb); eyesClosedHappy(fb); nose(fb); stache(fb); chinScruff(fb); mouthScrunch(fb);
    // mofletes apretados
    px(fb, 11, 15, 'C'); px(fb, 20, 15, 'C');
  }},
  { name: '2-hastiado', draw: function (fb) {
    torsoTank(fb); baseHead(fb); hairCurly(fb, 0);
    brows(fb, false, true); eyesRolled(fb); nose(fb); stache(fb); mouthPout(fb);
  }},
  { name: '3-dientes', draw: function (fb) {
    torsoTeeBlack(fb); baseHead(fb); hairCurly(fb, 0);
    brows(fb, false, true); eyesOpen(fb, 0, 0); nose(fb); stache(fb); mouthGrinTeeth(fb);
  }},
  { name: '4-tranquilo', draw: function (fb) {
    torsoHoodieRed(fb); baseHead(fb); hairNeat(fb);
    brows(fb); eyesOpen(fb, 0, 0); nose(fb); stache(fb); mouthSoft(fb);
  }},
  { name: '5-pillo', draw: function (fb) {
    torsoTeeYellow(fb); baseHead(fb); hairCurly(fb, 2);
    brows(fb, true, false); eyesOpen(fb, 1, 0); nose(fb); stache(fb); chinScruff(fb); mouthSmirk(fb);
  }},
  { name: '6-noche', draw: function (fb) {
    torsoPuffer(fb); baseHead(fb); hairCurly(fb, 0);
    brows(fb); eyesOpen(fb, 0, 0); nose(fb); stache(fb); mouthSoft(fb);
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
function writePNG(file, pixels, w, h) { // pixels: filas de claves de paleta
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
