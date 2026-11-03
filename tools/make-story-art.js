// Generador del arte PROVISIONAL del Modo Historia (pixel art, sin dependencias).
// Cada escenario se compone de capas PNG que el motor desplaza a distinta velocidad
// (parallax). Cuando haya arte definitivo basta con sustituir estos PNG por otros
// del mismo tamaño (o cambiar las medidas en story/scenes.js).
// Uso: node tools/make-story-art.js   ->  escribe en sprites/story/
var zlib = require('zlib'), fs = require('fs'), path = require('path');
var outDir = path.join(__dirname, '..', 'sprites', 'story');
fs.mkdirSync(outDir, { recursive: true });

// ---------- utilidades de dibujo ----------
function hex(c, a) {
  var n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a === undefined ? 255 : a];
}
function FB(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h * 4); }
FB.prototype.px = function (x, y, c, a) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
  var k = typeof c === 'string' ? hex(c, a) : c, i = (y * this.w + x) * 4;
  this.d[i] = k[0]; this.d[i + 1] = k[1]; this.d[i + 2] = k[2]; this.d[i + 3] = k[3];
};
FB.prototype.rect = function (x, y, w, h, c, a) {
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.px(x + i, y + j, c, a);
};
FB.prototype.box = function (x, y, w, h, c) { // contorno
  this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c);
  this.rect(x, y, 1, h, c); this.rect(x + w - 1, y, 1, h, c);
};
FB.prototype.disc = function (cx, cy, r, c, a) {
  for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++)
    if (x * x + y * y <= r * r + r * 0.6) this.px(cx + x, cy + y, c, a);
};
FB.prototype.line = function (x0, y0, x1, y1, c) {
  var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (var i = 0; i <= n; i++) this.px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c);
};
FB.prototype.vgrad = function (x, y, w, h, stops) { // degradado vertical con tramado
  for (var j = 0; j < h; j++) {
    var t = j / Math.max(1, h - 1) * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(t)), f = t - k;
    for (var i = 0; i < w; i++) {
      var dith = ((i + j) % 2 ? 0.12 : -0.12) + ((i % 4 === 0 && j % 4 === 0) ? 0.2 : 0);
      this.px(x + i, y + j, f + dith > 0.5 ? stops[k + 1] : stops[k]);
    }
  }
};
// fuente mini 3x5
var GL = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '7': '111001010010010', 'A': '010101111101101', 'B': '110101110101110', 'C': '111100100100111',
  'D': '110101101101110', 'I': '111010010010111', 'R': '110101110101101', ' ': '000000000000000'
};
FB.prototype.text = function (x, y, s, c, sc) {
  sc = sc || 1;
  for (var n = 0; n < s.length; n++) {
    var g = GL[s[n]] || GL[' '];
    for (var j = 0; j < 5; j++) for (var i = 0; i < 3; i++)
      if (g[j * 3 + i] === '1') this.rect(x + (n * 4 + i) * sc, y + j * sc, sc, sc, c);
  }
};
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- PNG ----------
var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { var c = 0xffffffff; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  var td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function save(fb, name) {
  var raw = Buffer.alloc((fb.w * 4 + 1) * fb.h);
  for (var y = 0; y < fb.h; y++) { raw[y * (fb.w * 4 + 1)] = 0; Buffer.from(fb.d.buffer, y * fb.w * 4, fb.w * 4).copy(raw, y * (fb.w * 4 + 1) + 1); }
  var ih = Buffer.alloc(13); ih.writeUInt32BE(fb.w, 0); ih.writeUInt32BE(fb.h, 4); ih[8] = 8; ih[9] = 6;
  var png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(path.join(outDir, name), png);
  console.log('ok', name, fb.w + 'x' + fb.h);
}

var K = '#2a2622';

// ======================= COCINA (640x216, suelo en y=196) =======================
function cocinaCielo() { // se ve a traves de la ventana
  var f = new FB(480, 216), r = rng(7);
  f.vgrad(0, 0, 480, 140, ['#0a1128', '#141c3c', '#262350', '#3a2c58']);
  for (var i = 0; i < 90; i++) f.px(r() * 480, r() * 110, r() < 0.3 ? '#f7e8b0' : '#cfd6ff', 120 + (r() * 135 | 0));
  // bloques de pisos del barrio
  var x = 0;
  while (x < 480) {
    var w = 30 + (r() * 40 | 0), top = 92 + (r() * 22 | 0);
    f.rect(x, top, w, 216 - top, '#151a2e'); f.rect(x, top, w, 1, '#222944');
    for (var wy = top + 5; wy < 200; wy += 8) for (var wx = x + 4; wx < x + w - 4; wx += 7)
      if (r() < 0.4) f.rect(wx, wy, 3, 4, r() < 0.8 ? '#f0c75a' : '#9fc3ff');
    x += w + 2;
  }
  save(f, 'cocina-cielo.png');
}

function cocina() {
  var W = 640, H = 216, FY = 196, f = new FB(W, H), r = rng(3);
  var wall = '#e6d6a2', wallS = '#d6c48e', wood = '#a9733f', woodD = '#7f5229', woodL = '#c98f53',
    counter = '#dcd7cb', counterD = '#a9a497', steel = '#b8bcc0', steelD = '#82868b', steelL = '#e2e5e7',
    white = '#f6f4ee', red = '#b8322c', redD = '#86221d', gold = '#e3b341', goldD = '#a97c22', black = '#1d1d22';

  // pared, techo, rodapie
  f.rect(0, 0, W, FY, wall);
  for (var i = 0; i < 1400; i++) f.px(r() * W, 10 + r() * 180, r() < 0.6 ? wallS : '#eee2b6');
  f.rect(0, 0, W, 8, '#8a7559'); f.rect(0, 8, W, 1, '#6e5c45'); f.rect(0, 9, W, 2, wallS);
  f.rect(0, 189, W, 7, woodD); f.rect(0, 189, W, 1, woodL);
  // suelo de baldosa
  var rows = [[196, 5, 0], [201, 7, 10], [208, 8, 0]];
  rows.forEach(function (rw) {
    for (var x = -20 + rw[2]; x < W; x += 20) f.rect(x, rw[0], 20, rw[1], ((x - rw[2]) / 20 + rw[0]) % 2 ? '#b49a7c' : '#a28a6e');
    f.rect(0, rw[0], W, 1, '#866f56');
  });
  f.rect(0, 196, W, 1, '#5e4c3b');

  // fluorescente
  f.rect(268, 10, 92, 5, white); f.box(268, 10, 92, 5, steelD); f.rect(270, 11, 88, 1, '#ffffff');

  // espumillon dorado
  for (var x = 0; x < W; x++) {
    var y = 13 + Math.round(9 * Math.sin(Math.PI * (x % 106) / 106));
    f.px(x, y, (x % 3) ? gold : goldD); f.px(x, y + 1, (x % 2) ? goldD : gold);
    if (x % 6 === 0) f.px(x, y - 1, '#fff2b0');
    if (x % 106 === 53) { f.rect(x - 1, y + 2, 3, 3, red); f.px(x, y + 5, redD); }
  }

  // azulejos tras la encimera
  f.rect(64, 118, 240, 48, white);
  for (var y = 118; y < 166; y += 8) f.rect(64, y, 240, 1, '#cdc9bc');
  for (var x = 64; x < 304; x += 8) f.rect(x, 118, 1, 48, '#cdc9bc');
  for (var x = 72; x < 304; x += 32) for (var y = 126; y < 166; y += 16) { f.px(x + 3, y + 3, '#7fa6c9'); f.px(x + 4, y + 4, '#7fa6c9'); }

  // nevera
  f.rect(24, 128, 40, 68, '#eeece4'); f.rect(58, 128, 6, 68, '#cfccc1'); f.box(24, 128, 40, 68, K);
  f.rect(25, 150, 38, 1, K); f.rect(57, 134, 2, 10, steelD); f.rect(57, 156, 2, 20, steelD);
  [['#e0443a', 31, 158], ['#3b78d8', 40, 169], ['#f2c13c', 47, 160], ['#46a35a', 34, 140]].forEach(function (m) { f.rect(m[1], m[2], 3, 3, m[0]); });
  f.rect(32, 163, 12, 15, white); f.box(32, 163, 12, 15, '#c4c0b4');
  f.rect(35, 167, 2, 2, red); f.rect(39, 167, 2, 2, red); f.rect(35, 169, 6, 2, red); f.rect(37, 171, 2, 2, red);
  f.rect(26, 124, 14, 4, '#c7392e'); f.box(26, 124, 14, 4, K); // caja de turron encima

  // armarios bajos + encimera
  f.rect(64, 172, 240, 24, wood);
  for (var x = 64; x < 304; x += 30) { f.rect(x, 172, 1, 20, woodD); f.rect(x + 3, 175, 24, 1, woodL); f.rect(x + 13, 178, 5, 1, steelL); }
  f.rect(64, 191, 240, 5, '#5f3d1f');
  f.rect(62, 165, 244, 1, K); f.rect(62, 166, 244, 5, counter); f.rect(62, 171, 244, 1, counterD);
  // fregadero y grifo
  f.rect(98, 166, 42, 2, steelD); f.rect(98, 166, 42, 1, '#6b6f74');
  f.rect(119, 152, 2, 14, steel); f.rect(119, 152, 9, 2, steel); f.rect(126, 152, 2, 5, steel); f.px(126, 158, '#9fd0ff');
  f.rect(104, 158, 10, 8, '#d9e7ef'); f.box(104, 158, 10, 8, '#9db0bd'); // vaso
  // vitro y horno
  f.rect(178, 166, 48, 2, black); f.px(186, 166, red); f.px(187, 166, red); f.px(208, 166, red); f.px(209, 166, red);
  f.rect(181, 175, 42, 15, black); f.rect(183, 177, 38, 1, steelL); f.rect(185, 180, 10, 6, '#33363d');
  // olla
  f.rect(188, 155, 22, 11, steel); f.box(188, 155, 22, 11, steelD); f.rect(188, 155, 22, 2, steelL);
  f.rect(185, 158, 3, 2, black); f.rect(210, 158, 3, 2, black); f.rect(197, 152, 4, 3, black);
  // microondas
  f.rect(246, 147, 40, 18, '#e2e0da'); f.box(246, 147, 40, 18, K);
  f.rect(249, 150, 25, 12, '#3a3f42'); f.rect(250, 151, 6, 2, '#5c6468');
  f.rect(277, 150, 6, 3, '#2a8f4a'); f.text(277, 151, '', K);
  for (var j = 0; j < 3; j++) { f.px(278, 156 + j * 2, K); f.px(281, 156 + j * 2, K); }

  // armarios altos y campana
  f.rect(70, 58, 108, 42, wood); f.box(70, 58, 108, 42, woodD);
  for (var x = 70; x < 178; x += 36) { f.box(x + 2, 60, 32, 38, woodD); f.rect(x + 3, 61, 30, 1, woodL); f.rect(x + 16, 93, 4, 1, steelL); }
  f.rect(70, 100, 108, 2, wallS);
  f.rect(192, 11, 22, 76, steel); f.rect(192, 11, 3, 76, steelL); f.rect(210, 11, 4, 76, steelD);
  f.rect(180, 87, 46, 14, steel); f.box(180, 87, 46, 14, steelD); f.rect(176, 101, 54, 6, steelD); f.box(176, 101, 54, 6, '#5d6166');
  f.rect(178, 107, 50, 1, '#ffe9a6');

  // ventana (cristal transparente: ahi se ve la capa del cielo)
  f.rect(240, 42, 78, 7, '#ece6d6'); f.box(240, 42, 78, 7, '#b9b1a0');
  f.rect(244, 49, 70, 72, white); f.box(244, 49, 70, 72, '#a9a394');
  f.rect(248, 53, 62, 64, '#000000', 0);
  f.rect(277, 53, 4, 64, white); f.rect(248, 84, 62, 2, white);
  for (var y = 53; y < 68; y += 2) { f.rect(248, y, 62, 1, '#d9c9a8'); f.rect(248, y + 1, 62, 1, '#b5a383'); }
  f.rect(248, 68, 62, 2, '#8d7b5c'); f.rect(262, 70, 1, 6, '#8d7b5c'); f.rect(261, 76, 3, 2, '#8d7b5c');
  for (var k = 0; k < 10; k++) { f.px(252 + k, 104 - k, '#ffffff', 55); f.px(285 + k, 110 - k, '#ffffff', 55); f.px(286 + k, 110 - k, '#ffffff', 40); }
  f.rect(238, 121, 82, 4, counter); f.rect(238, 124, 82, 1, counterD);
  f.rect(300, 114, 9, 7, '#b5653a'); f.rect(300, 114, 9, 1, '#d4834f'); f.rect(303, 106, 3, 8, '#4f8a3c'); f.rect(301, 109, 2, 3, '#4f8a3c'); f.px(304, 105, '#f06aa0');

  // calendario
  f.rect(330, 64, 24, 32, white); f.box(330, 64, 24, 32, '#9c9788'); f.rect(330, 64, 24, 9, red);
  f.text(332, 66, 'DIC', white); f.px(342, 62, K); f.px(342, 63, K);
  for (var j = 0; j < 4; j++) for (var i = 0; i < 6; i++) f.rect(333 + i * 3, 76 + j * 4, 2, 2, '#bcb6a6');
  f.box(347, 87, 6, 5, red); f.rect(349, 89, 2, 1, red);
  // reloj de pared: 23:55
  var cx = 442, cy = 42; f.disc(cx, cy, 11, K); f.disc(cx, cy, 10, white);
  for (var h = 0; h < 12; h++) { var a = h / 12 * Math.PI * 2; f.px(cx + Math.round(Math.sin(a) * 8), cy - Math.round(Math.cos(a) * 8), '#8c8778'); }
  f.line(cx, cy, cx - 1, cy - 6, K); f.line(cx, cy, cx - 4, cy - 7, red); f.px(cx, cy, K);

  // respaldos de las sillas de la familia (detras de cada uno; la mesa va en otra capa)
  MESA.seats.forEach(function (x) {
    f.rect(x - 12, 150, 3, 40, woodD); f.rect(x + 10, 150, 3, 40, woodD);
    f.rect(x - 12, 150, 25, 3, wood); f.rect(x - 12, 150, 25, 1, woodL); f.rect(x - 12, 160, 25, 2, wood);
  });

  // tele en la pared (el motor pinta la imagen encima)
  f.rect(560, 112, 6, 8, '#5d6166');
  f.rect(536, 82, 46, 31, black); f.box(536, 82, 46, 31, '#000000'); f.rect(539, 85, 40, 25, '#16181c');
  f.px(578, 111, '#e0443a');

  // puerta
  f.rect(584, 120, 50, 76, woodD); f.rect(584, 120, 50, 1, K);
  f.rect(588, 124, 42, 72, wood); f.box(592, 130, 34, 26, woodD); f.box(592, 162, 34, 28, woodD);
  f.rect(593, 131, 32, 1, woodL); f.rect(593, 163, 32, 1, woodL);
  f.rect(622, 157, 3, 3, gold); f.px(622, 157, '#fff2b0');
  f.rect(574, 146, 5, 8, white); f.box(574, 146, 5, 8, '#a9a394'); f.px(576, 149, '#a9a394');
  save(f, 'cocina.png');
}

// La mesa va en una capa delantera: se pinta DELANTE de la familia sentada y DETRAS de Ethan.
var MESA = { x: 372, w: 144, top: 178, seats: [398, 444, 490] };
function cocinaMesa() {
  var f = new FB(640, 216), wood = '#a9733f', woodD = '#7f5229', woodL = '#c98f53', white = '#f6f4ee',
    red = '#b8322c', redD = '#86221d', gold = '#e3b341', goldD = '#a97c22', X = MESA.x, Wd = MESA.w, T = MESA.top;
  f.rect(X, T - 1, Wd, 1, redD); f.rect(X, T, Wd, 12, red); f.rect(X, T, Wd, 2, '#d24a40');
  for (var x = X; x < X + Wd; x += 8) { f.px(x + 2, T + 5, '#e86a5c'); f.px(x + 6, T + 8, '#e86a5c'); }
  for (var x = X; x < X + Wd; x += 4) f.px(x + 1, T + 12, red);
  f.rect(X, T + 12, Wd, 1, redD);
  f.rect(X + 8, T + 13, 3, 196 - T - 13, woodD); f.rect(X + Wd - 11, T + 13, 3, 196 - T - 13, woodD);
  MESA.seats.forEach(function (x, n) {
    f.rect(x - 7, T - 2, 15, 2, white); f.rect(x - 5, T - 1, 11, 1, '#cfccc3');         // plato
    var g = x + (n === 1 ? -14 : 12);                                                 // copa con las 12 uvas
    f.rect(g - 3, T - 8, 7, 6, '#e8f2f6', 200); f.box(g - 3, T - 8, 7, 6, '#a9c3cf'); f.rect(g, T - 2, 1, 2, '#a9c3cf');
    for (var k = 0; k < 6; k++) f.px(g - 2 + (k % 3) * 2, T - 7 + (k > 2 ? 2 : 0), k % 2 ? '#8fbf3e' : '#a8d455');
  });
  var bx = 465; // cava
  f.rect(bx, T - 24, 7, 24, '#1f4a2c'); f.rect(bx + 1, T - 23, 1, 20, '#3a7a4c'); f.rect(bx + 1, T - 30, 5, 7, gold); f.rect(bx + 1, T - 30, 5, 1, goldD);
  f.rect(bx, T - 16, 7, 6, '#f0e6c8'); f.rect(bx + 1, T - 14, 5, 1, gold);
  [421, 508].forEach(function (x) { f.rect(x, T - 13, 3, 6, '#f4ecc4'); f.box(x - 1, T - 14, 5, 7, '#b8c8d0'); f.rect(x + 1, T - 7, 1, 5, '#b8c8d0'); f.rect(x - 1, T - 2, 5, 1, '#b8c8d0'); });
  f.rect(380, T - 3, 12, 3, '#f0c060'); f.rect(381, T - 4, 10, 1, '#f7d98a'); // turron
  // la silla vacia de Ethan, en la cabecera
  var cx = 349;
  f.rect(cx, 184, 18, 3, wood); f.rect(cx, 187, 18, 1, woodD);
  f.rect(cx + 1, 188, 2, 8, woodD); f.rect(cx + 15, 188, 2, 8, woodD);
  f.rect(cx, 154, 3, 30, wood); f.rect(cx, 154, 3, 1, woodL); f.rect(cx, 160, 9, 2, wood); f.rect(cx, 168, 9, 2, wood);
  save(f, 'cocina-mesa.png');
}

// ======================= PERSONAJES (vista frontal, sentados, 48x48) =======================
// 7 fotogramas: mirar izq / centro / dcha, parpadeo, hablar izq / centro / dcha.
// La fila 33 del sprite coincide con el borde de la mesa: de ahi para abajo no se ve.
var PK = '#1f241e';
function outline(f) { // contorno de tinta alrededor de todo lo opaco
  var add = [];
  for (var y = 0; y < f.h; y++) for (var x = 0; x < f.w; x++) {
    if (f.d[(y * f.w + x) * 4 + 3]) continue;
    var n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) {
      var X = x + d[0], Y = y + d[1]; if (X < 0 || Y < 0 || X >= f.w || Y >= f.h) return false;
      var i = (Y * f.w + X) * 4; return f.d[i + 3] && !(f.d[i] === 31 && f.d[i + 1] === 36 && f.d[i + 2] === 30);
    });
    if (n) add.push([x, y]);
  }
  add.forEach(function (p) { f.px(p[0], p[1], PK); });
}
function person(o, look, blink, talk) {
  var f = new FB(48, 48), r = rng(o.seed || 1);
  var S = '#e8b990', s = '#c9966b', fat = !!o.fat;
  var hx0 = fat ? 11 : 13, hx1 = fat ? 36 : 34, cx = 24;
  var tx0 = fat ? 5 : 12, tx1 = fat ? 42 : 35;
  if (o.hairBack) o.hairBack(f, hx0, hx1, r);
  // torso
  for (var y = 25; y < 40; y++) { var ins = y === 25 ? 3 : y === 26 ? 1 : 0; f.rect(tx0 + ins, y, tx1 - tx0 + 1 - ins * 2, 1, o.shirt); }
  f.rect(tx1 - 2, 27, 2, 13, o.shirtS); f.rect(tx0 + 4, 27, 1, 5, o.shirtS); f.rect(tx1 - 5, 27, 1, 5, o.shirtS);
  if (o.torso) o.torso(f, tx0, tx1);
  // manos sobre la mesa
  f.rect(tx0 + 1, 30, 5, 3, S); f.rect(tx0 + 1, 32, 5, 1, s); f.rect(tx1 - 5, 30, 5, 3, S); f.rect(tx1 - 5, 32, 5, 1, s);
  // cuello y cabeza
  f.rect(21, 23, 6, 3, s);
  for (var y = 4; y <= 24; y++) {
    var c = (y === 4 || y === 24) ? 3 : (y === 5 || y === 23) ? 1 : 0;
    if (fat && y >= 20) c = Math.max(0, c - 1);
    f.rect(hx0 + c, y, hx1 - hx0 + 1 - c * 2, 1, S);
  }
  f.rect(hx1 - 1, 7, 1, 15, s);
  f.rect(hx0 - 1, 13, 1, 4, S); f.rect(hx1 + 1, 13, 1, 4, S);
  if (fat) { f.rect(hx0 + 2, 17, 4, 3, '#e8998a'); f.rect(hx1 - 5, 17, 4, 3, '#e8998a'); f.rect(cx - 5, 23, 10, 1, s); f.rect(hx0, 22, hx1 - hx0 + 1, 3, S); f.rect(cx - 6, 25, 12, 1, s); f.rect(tx0 + 6, 33, tx1 - tx0 - 12, 1, o.shirtS); }
  // ojos
  [cx - 6, cx + 3].forEach(function (ex) {
    if (blink) { f.rect(ex, 14, 3, 1, PK); return; }
    f.rect(ex, 13, 3, 2, '#f8f6f0'); f.rect(ex + 1 + look, 13, 1, 2, '#3a2a1e');
    if (o.lashes) f.rect(ex, 12, 3, 1, PK);
  });
  f.rect(cx - 6, 11, 3, 1, o.brow); f.rect(cx + 3, 11, 3, 1, o.brow);
  f.px(cx - 1, 17, s); f.px(cx - 1, 18, s); f.px(cx, 18, s);
  if (talk) { f.rect(cx - 3, 20, 4, 2, '#6a2424'); f.rect(cx - 3, 20, 4, 1, '#f8f6f0'); }
  else f.rect(cx - 3, 21, 4, 1, o.lips || '#a05848');
  if (o.face) o.face(f, hx0, hx1, r);
  if (o.hairFront) o.hairFront(f, hx0, hx1, r);
  outline(f);
  if (o.after) o.after(f, hx0, hx1);
  return f;
}
function sheet(o, name) {
  var fr = [[-1, 0, 0], [0, 0, 0], [1, 0, 0], [0, 1, 0], [-1, 0, 1], [0, 0, 1], [1, 0, 1]];
  var out = new FB(48 * fr.length, 48);
  fr.forEach(function (a, i) {
    var p = person(o, a[0], a[1], a[2]);
    for (var y = 0; y < 48; y++) for (var x = 0; x < 48; x++) { var k = (y * 48 + x) * 4, j = (y * out.w + i * 48 + x) * 4; for (var c = 0; c < 4; c++) out.d[j + c] = p.d[k + c]; }
  });
  save(out, name);
}
// --- hermanastra: gordita, pelo castaño largo, sudadera rosa
var HERMANASTRA = {
  seed: 4, fat: true, shirt: '#d86a9a', shirtS: '#b04f7c', brow: '#4a2c18', lashes: true,
  hairBack: function (f, a, b) { f.rect(a - 3, 8, 5, 24, '#6b4226'); f.rect(b - 1, 8, 5, 24, '#6b4226'); f.rect(a - 3, 8, 2, 24, '#4a2c18'); f.rect(b + 2, 8, 2, 24, '#4a2c18'); },
  torso: function (f, a, b) { f.px(21, 27, '#f6f4ee'); f.px(21, 28, '#f6f4ee'); f.px(26, 27, '#f6f4ee'); f.px(26, 28, '#f6f4ee'); f.rect(19, 25, 10, 1, '#b04f7c'); },
  hairFront: function (f, a, b) {
    for (var y = 2; y <= 9; y++) { var c = y === 2 ? 5 : y === 3 ? 2 : y === 4 ? 1 : 0; f.rect(a - 1 + c, y, b - a + 3 - c * 2, 1, '#6b4226'); }
    f.rect(a, 10, 10, 1, '#6b4226'); f.rect(a, 11, 6, 1, '#6b4226'); f.rect(b - 3, 10, 4, 1, '#6b4226');
    f.rect(a + 4, 4, 7, 1, '#8f5d36'); f.rect(a + 2, 5, 3, 1, '#8f5d36'); f.rect(b - 6, 7, 1, 3, '#4a2c18');
  }
};
// --- padre: pelo medio canoso, polo, un cable neutro (azul) de cinturon
var PADRE = {
  seed: 8, shirt: '#3f6b4a', shirtS: '#2e5238', brow: '#5a544e',
  torso: function (f, a, b) {
    f.rect(19, 25, 10, 2, '#e9e4d6'); f.px(24, 27, '#e9e4d6'); f.px(24, 28, '#2e5238');
    for (var x = a + 1; x < b; x++) f.px(x, 31, (x % 3) ? '#2f6fd6' : '#6aa2f0');
    for (var x = a + 1; x < b; x++) f.px(x, 32, (x % 3) === 1 ? '#6aa2f0' : '#2457b0');
    f.rect(23, 30, 3, 4, '#2f6fd6'); f.px(24, 30, '#6aa2f0'); f.px(26, 33, '#d08a3a'); f.px(27, 33, '#e8a85a'); // nudo y cobre
  },
  face: function (f, a, b) { f.rect(20, 19, 8, 1, '#8a8682'); f.px(20, 20, '#8a8682'); f.px(27, 20, '#8a8682'); f.px(18, 9, '#c9966b'); f.px(29, 9, '#c9966b'); },
  hairFront: function (f, a, b, r) {
    for (var y = 2; y <= 8; y++) for (var x = a - 1; x <= b + 1; x++) {
      var edge = y === 2 ? (x < a + 4 || x > b - 4) : y === 3 ? (x < a + 1 || x > b - 1) : false;
      var entrada = y >= 7 && (x < a + 4 || x > b - 4);
      if (!edge && !entrada) f.px(x, y, (x + y * 3) % 7 === 0 ? '#4a443e' : (x * 5 + y) % 9 === 0 ? '#d6d7da' : y <= 4 ? '#b3b5b9' : '#989a9f');
    }
    f.rect(a - 1, 9, 2, 6, '#7f8186'); f.rect(b, 9, 2, 6, '#7f8186'); f.px(a - 1, 9, '#4a443e'); f.px(b + 1, 9, '#4a443e');
  }
};
// --- Lourdes: rizos rubio oscuro, top rojo de Nochevieja, pendientes
var LOURDES = {
  seed: 13, shirt: '#c0303a', shirtS: '#962530', brow: '#8a6630', lashes: true, lips: '#c23a4a',
  hairBack: function (f, a, b, r) {
    var pts = [];
    for (var y = 3; y <= 27; y += 3) { pts.push([a - 3 + (y % 2), y]); pts.push([b + 3 - (y % 2), y]); }
    for (var x = a; x <= b; x += 4) { pts.push([x, 2]); pts.push([x + 2, 4]); }
    pts.forEach(function (p) { f.disc(p[0], p[1], 3, '#c9a04e'); });
    pts.forEach(function (p) { f.px(p[0] - 1, p[1] - 2, '#f0d892'); f.px(p[0] - 2, p[1] - 1, '#f0d892'); f.px(p[0] + 2, p[1] + 1, '#8a6428'); f.px(p[0] + 1, p[1] + 2, '#8a6428'); f.px(p[0], p[1] + 2, '#8a6428'); });
  },
  torso: function (f) { f.rect(20, 25, 8, 1, '#e8b990'); f.px(22, 26, '#e3b341'); f.px(24, 27, '#e3b341'); f.px(26, 26, '#e3b341'); },
  hairFront: function (f, a, b) {
    for (var x = a; x <= b; x += 4) { f.disc(x, 6, 2, '#c9a04e'); f.px(x - 1, 5, '#f0d892'); f.px(x + 1, 8, '#8a6428'); f.px(x + 2, 7, '#8a6428'); }
    f.rect(a, 8, 3, 3, '#c9a04e'); f.rect(b - 2, 8, 3, 3, '#c9a04e');
  },
  after: function (f, a, b) { f.px(a - 1, 17, '#e3b341'); f.px(a - 1, 18, '#e3b341'); f.px(b + 1, 17, '#e3b341'); f.px(b + 1, 18, '#e3b341'); }
};

// ======================= CALLE (1100x216, suelo en y=200) =======================
function calleCielo() {
  var f = new FB(480, 216), r = rng(11);
  f.vgrad(0, 0, 480, 216, ['#070d24', '#0f1838', '#1f2250', '#3b2b5a', '#5a3a5c']);
  for (var i = 0; i < 160; i++) f.px(r() * 480, r() * 150, r() < 0.25 ? '#f7e8b0' : '#d6dcff', 90 + (r() * 165 | 0));
  f.disc(392, 38, 11, '#f3eedb'); f.disc(396, 35, 9, '#0f1838'); // luna menguante
  save(f, 'calle-cielo.png');
}
function calleLejos() { // margen izquierda: altos hornos, chimeneas y gruas
  var f = new FB(620, 216), r = rng(5), c = '#1d2342', e = '#2b3256';
  f.rect(0, 156, 620, 60, c);
  for (var x = 0; x < 620; x++) { var y = 150 + Math.round(4 * Math.sin(x / 37) + 3 * Math.sin(x / 11)); f.rect(x, y, 1, 216 - y, c); f.px(x, y, e); }
  // alto horno
  f.rect(140, 70, 28, 90, c); f.rect(132, 110, 44, 50, c); f.rect(150, 40, 8, 30, c); f.rect(146, 36, 16, 4, c);
  f.rect(168, 90, 50, 4, c); f.rect(214, 90, 4, 70, c); f.rect(118, 120, 14, 3, c);
  f.rect(140, 70, 1, 90, e); f.rect(150, 40, 1, 30, e);
  // estufas Cowper
  [190, 204, 228].forEach(function (x) { f.rect(x, 100, 11, 60, c); f.rect(x + 1, 97, 9, 3, c); f.rect(x, 100, 1, 60, e); });
  // chimeneas
  [[300, 58], [318, 70], [470, 80]].forEach(function (ch) { f.rect(ch[0], ch[1], 8, 160 - ch[1], c); f.rect(ch[0] - 1, ch[1], 10, 3, c); f.rect(ch[0], ch[1], 1, 160 - ch[1], e); });
  // gruas portico
  f.rect(380, 96, 4, 64, c); f.rect(420, 96, 4, 64, c); f.rect(370, 92, 80, 5, c); f.rect(446, 80, 3, 16, c);
  for (var x = 384; x < 420; x += 6) f.line(x, 97, x + 6, 112, c);
  f.rect(530, 110, 3, 50, c); f.rect(500, 106, 70, 3, c); f.line(531, 92, 560, 106, c); f.line(531, 92, 502, 106, c);
  // nave industrial
  f.rect(560, 128, 60, 32, c); f.line(560, 128, 590, 116, c); f.line(590, 116, 620, 128, c);
  for (var i = 0; i < 26; i++) f.px(r() * 620, 120 + r() * 40, '#f0a040');
  save(f, 'calle-lejos.png');
}
function calleMedio() { // bloques de pisos
  var f = new FB(840, 216), r = rng(21), x = 0;
  while (x < 840) {
    var w = 56 + (r() * 56 | 0), top = 104 + (r() * 46 | 0), col = r() < 0.5 ? '#2c3550' : '#33304f';
    f.rect(x, top, w, 216 - top, col); f.rect(x, top, w, 2, '#3d4870'); f.rect(x + w - 1, top, 1, 216 - top, '#1e2438');
    f.rect(x + 4, top - 6, 8, 6, col); // caseton
    for (var wy = top + 8; wy < 196; wy += 12) {
      f.rect(x + 2, wy + 7, w - 4, 1, '#232a42');
      for (var wx = x + 6; wx < x + w - 8; wx += 10) {
        var lit = r() < 0.38;
        f.rect(wx, wy, 5, 6, lit ? (r() < 0.85 ? '#f2c860' : '#a9cfff') : '#1b2135');
        if (lit && r() < 0.5) f.rect(wx, wy, 5, 2, '#b98b3a');
      }
    }
    x += w + 3 + (r() * 10 | 0);
  }
  save(f, 'calle-medio.png');
}
function calle() {
  var W = 1100, f = new FB(W, 216), r = rng(9), wood = '#a9733f', woodD = '#7f5229';
  // acera y calzada
  f.rect(0, 200, W, 6, '#9a9a94'); f.rect(0, 200, W, 1, '#b8b8b0');
  for (var x = 0; x < W; x += 24) f.rect(x, 200, 1, 6, '#7e7e78');
  f.rect(0, 206, W, 2, '#c8c8c0'); f.rect(0, 208, W, 8, '#34343a');
  for (var x = 10; x < W; x += 60) f.rect(x, 212, 24, 1, '#d8d8cc');
  // edificio del portal de Ethan
  f.rect(0, 18, 172, 182, '#8c7a66'); f.rect(170, 18, 2, 182, '#5e5040'); f.rect(0, 18, 172, 3, '#a8957e');
  for (var y = 24; y < 130; y += 4) for (var x = (y / 4) % 2 ? 0 : 6; x < 170; x += 12) f.rect(x, y, 1, 4, '#7a6a58');
  for (var fl = 0; fl < 3; fl++) for (var wn = 0; wn < 3; wn++) {
    var wx = 14 + wn * 54, wy = 30 + fl * 34;
    f.rect(wx, wy, 26, 22, '#e8e2d2'); f.rect(wx + 2, wy + 2, 22, 18, r() < 0.5 ? '#f2c860' : '#252a3c');
    for (var y = wy + 2; y < wy + 2 + (r() * 14 | 0); y += 2) f.rect(wx + 2, y, 22, 1, '#cbbf9f');
    f.rect(wx - 2, wy + 22, 30, 3, '#d8d2c2'); f.rect(wx - 2, wy + 25, 30, 1, '#3a3a3a');
    for (var b = wx - 2; b < wx + 28; b += 3) f.rect(b, wy + 18, 1, 4, '#3a3a3a');
  }
  f.rect(0, 130, 172, 4, '#d8d2c2');
  f.rect(0, 134, 172, 66, '#6b6258');
  f.rect(66, 140, 42, 60, '#a9acb0'); f.rect(70, 144, 34, 56, '#1f2b38'); f.rect(86, 144, 2, 56, '#a9acb0');
  for (var k = 0; k < 8; k++) f.px(74 + k, 160 - k, '#6f8aa6');
  f.rect(81, 170, 2, 6, '#e3b341'); f.rect(90, 170, 2, 6, '#e3b341');
  f.rect(112, 150, 10, 8, '#2a5bd0'); f.text(115, 151, '7', '#ffffff');
  f.rect(20, 150, 30, 40, '#4e4a44'); f.box(20, 150, 30, 40, '#3a3732'); // persiana del bajo
  for (var y = 152; y < 190; y += 3) f.rect(21, y, 28, 1, '#5d5850');
  // farolas
  [300, 640, 980].forEach(function (x) {
    f.rect(x, 118, 3, 82, '#3d4248'); f.rect(x - 2, 196, 7, 4, '#2d3136');
    f.rect(x, 118, 12, 2, '#3d4248'); f.rect(x + 8, 120, 8, 3, '#3d4248'); f.rect(x + 9, 123, 6, 2, '#fbefb2');
  });
  // banco
  f.rect(420, 176, 44, 3, wood); f.rect(420, 179, 44, 1, woodD); f.rect(420, 186, 44, 3, wood); f.rect(420, 189, 44, 1, woodD);
  [422, 458].forEach(function (x) { f.rect(x, 174, 3, 26, '#3d4248'); });
  // contenedor
  f.rect(720, 176, 42, 22, '#2f6b3f'); f.rect(718, 172, 46, 5, '#24532f'); f.box(720, 176, 42, 22, '#1d4226');
  for (var x = 726; x < 760; x += 6) f.rect(x, 180, 2, 14, '#3a8350');
  f.disc(726, 198, 2, '#1b1b1f'); f.disc(756, 198, 2, '#1b1b1f');
  // bar
  f.rect(862, 34, 238, 166, '#6d5a4e'); f.rect(862, 34, 238, 3, '#8a7364'); f.rect(860, 34, 2, 166, '#4b3d34');
  for (var fl = 0; fl < 2; fl++) for (var wn = 0; wn < 4; wn++) {
    var wx = 878 + wn * 56, wy = 48 + fl * 38;
    f.rect(wx, wy, 26, 24, '#e2dccb'); f.rect(wx + 2, wy + 2, 22, 20, r() < 0.55 ? '#f2c860' : '#252a3c');
    f.rect(wx - 2, wy + 24, 30, 2, '#d8d2c2');
  }
  f.rect(862, 128, 238, 4, '#3a2f29');
  f.rect(890, 112, 54, 16, '#1b1b22'); f.box(890, 112, 54, 16, '#0e0e12'); f.text(897, 115, 'BAR', '#ff5a6e', 2);
  f.rect(880, 146, 92, 44, '#5a3a1f'); f.rect(884, 150, 84, 36, '#f4c35c'); f.rect(884, 150, 84, 4, '#ffe38f');
  for (var x = 896; x < 968; x += 20) { f.rect(x, 168, 8, 18, '#6a3a1c'); f.disc(x + 4, 166, 3, '#6a3a1c'); } // siluetas
  f.rect(926, 150, 2, 36, '#5a3a1f');
  f.rect(986, 140, 28, 60, '#3a2f29'); f.rect(990, 144, 20, 56, '#f4c35c'); f.rect(990, 144, 20, 3, '#ffe38f');
  f.rect(1004, 170, 2, 6, '#3a2f29');
  f.rect(1030, 140, 60, 50, '#4e4a44'); for (var y = 142; y < 190; y += 3) f.rect(1031, y, 58, 1, '#5d5850');
  save(f, 'calle.png');
}

cocinaCielo(); cocina(); cocinaMesa(); calleCielo(); calleLejos(); calleMedio(); calle();
sheet(HERMANASTRA, 'npc-hermanastra.png'); sheet(PADRE, 'npc-padre.png'); sheet(LOURDES, 'npc-lourdes.png');
