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
var GL = { // fuente mini 3x5 (mayusculas y numeros)
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
  'A': '010101111101101', 'B': '110101110101110', 'C': '111100100100111', 'D': '110101101101110', 'E': '111100110100111',
  'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010',
  'K': '101101110101101', 'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101', 'O': '111101101101111',
  'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010',
  'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010',
  'Z': '111001010100111', '.': '000000000000010', '-': '000000111000000', '/': '001001010100100', ' ': '000000000000000'
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
  // vitro ROTA: cristal negro con grietas, un trozo saltado y cinta americana; y el horno
  f.rect(178, 162, 48, 4, black); f.rect(178, 162, 48, 1, '#3a3a44');
  [[180, 165], [183, 164], [186, 163], [189, 164], [192, 162], [195, 163], [198, 164], [201, 163], [204, 165]].forEach(function (p) { f.px(p[0], p[1], '#d8dde6'); f.px(p[0] + 1, p[1], '#9aa3b0'); });
  [[205, 163], [207, 162], [209, 164], [211, 163]].forEach(function (p) { f.px(p[0], p[1], '#d8dde6'); });
  f.rect(219, 162, 7, 2, counter); f.px(218, 162, '#9aa3b0'); f.px(218, 163, '#d8dde6');  // trozo que falta
  f.rect(232, 164, 4, 1, black); f.px(233, 163, black); f.px(236, 164, '#3a3a44');           // el trozo, en la encimera
  f.rect(196, 161, 12, 4, '#9b9ea3'); f.rect(196, 161, 12, 1, '#c3c6ca'); f.px(197, 164, '#7a7d82'); f.px(206, 162, '#7a7d82'); // cinta americana
  f.rect(181, 175, 42, 15, black); f.rect(183, 177, 38, 1, steelL); f.rect(185, 180, 10, 6, '#33363d');
  // olla (ya no en la vitro)
  f.rect(146, 155, 22, 11, steel); f.box(146, 155, 22, 11, steelD); f.rect(146, 155, 22, 2, steelL);
  f.rect(143, 158, 3, 2, black); f.rect(168, 158, 3, 2, black); f.rect(155, 152, 4, 3, black);
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
  // reloj de pared (las agujas las pinta el motor con la hora de la partida)
  var cx = 442, cy = 42; f.disc(cx, cy, 11, K); f.disc(cx, cy, 10, white);
  for (var h = 0; h < 12; h++) { var a = h / 12 * Math.PI * 2; f.px(cx + Math.round(Math.sin(a) * 8), cy - Math.round(Math.cos(a) * 8), h % 3 ? '#b4ae9e' : '#6c6758'); }

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
  });
  var bx = 465; // cava
  f.rect(bx, T - 24, 7, 24, '#1f4a2c'); f.rect(bx + 1, T - 23, 1, 20, '#3a7a4c'); f.rect(bx + 1, T - 30, 5, 7, gold); f.rect(bx + 1, T - 30, 5, 1, goldD);
  f.rect(bx, T - 16, 7, 6, '#f0e6c8'); f.rect(bx + 1, T - 14, 5, 1, gold);
  [421, 508].forEach(function (x) { f.rect(x, T - 13, 3, 6, '#f4ecc4'); f.box(x - 1, T - 14, 5, 7, '#b8c8d0'); f.rect(x + 1, T - 7, 1, 5, '#b8c8d0'); f.rect(x - 1, T - 2, 5, 1, '#b8c8d0'); });
  f.rect(474, T - 3, 9, 3, '#f0c060'); f.rect(475, T - 4, 7, 1, '#f7d98a'); // turron
  // la silla vacia de Ethan, en la cabecera
  var cx = 349;
  f.rect(cx, 184, 18, 3, wood); f.rect(cx, 187, 18, 1, woodD);
  f.rect(cx + 1, 188, 2, 8, woodD); f.rect(cx + 15, 188, 2, 8, woodD);
  f.rect(cx, 154, 3, 30, wood); f.rect(cx, 154, 3, 1, woodL); f.rect(cx, 160, 9, 2, wood); f.rect(cx, 168, 9, 2, wood);
  save(f, 'cocina-mesa.png');
}

// ======================= PERSONAJES (vista frontal, sentados, 48x48) =======================
// 7 fotogramas: mirar izq / centro / dcha, parpadeo, hablar izq / centro / dcha.
// Mas pequeños que Ethan: estan sentados y al fondo de la mesa. La fila 34 del sprite
// coincide con el borde de la mesa (top = 178 - 34 = 144 en la cocina).
var PK = '#1f241e', HT = 12; // HT = fila de arriba de la cabeza
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
  var S = '#e8b990', s = '#c9966b', fat = !!o.fat, T = HT, B = T + 15;
  var hx0 = fat ? 15 : 16, hx1 = fat ? 32 : 31;
  var tx0 = fat ? 10 : 15, tx1 = fat ? 37 : 32;
  if (o.hairBack) o.hairBack(f, hx0, hx1, T);
  // torso (de B+1 para abajo; la mesa tapa desde la fila 34)
  for (var y = B + 1; y < 42; y++) { var ins = y === B + 1 ? 2 : y === B + 2 ? 1 : 0; f.rect(tx0 + ins, y, tx1 - tx0 + 1 - ins * 2, 1, o.shirt); }
  f.rect(tx1 - 1, B + 3, 1, 12, o.shirtS); f.rect(tx0 + 3, B + 3, 1, 4, o.shirtS); f.rect(tx1 - 3, B + 3, 1, 4, o.shirtS);
  if (o.torso) o.torso(f, tx0, tx1, B);
  // manos sobre la mesa
  f.rect(tx0, 31, 4, 3, S); f.rect(tx0, 33, 4, 1, s); f.rect(tx1 - 3, 31, 4, 3, S); f.rect(tx1 - 3, 33, 4, 1, s);
  // cuello y cabeza
  f.rect(21, B - 1, 6, 3, s);
  for (var y = T; y <= B; y++) {
    var c = (y === T || y === B) ? 2 : (y === T + 1 || y === B - 1) ? 1 : 0;
    if (fat && y >= B - 3) c = Math.max(0, c - 1);
    f.rect(hx0 + c, y, hx1 - hx0 + 1 - c * 2, 1, S);
  }
  f.rect(hx1 - 1, T + 3, 1, 10, s);
  f.rect(hx0 - 1, T + 6, 1, 3, S); f.rect(hx1 + 1, T + 6, 1, 3, S);
  if (fat) { f.rect(hx0 + 1, T + 9, 3, 2, '#e8998a'); f.rect(hx1 - 3, T + 9, 3, 2, '#e8998a'); f.rect(20, B, 8, 1, s); f.rect(19, B + 1, 10, 1, s); }
  // ojos, cejas, nariz, boca
  [18, 27].forEach(function (ex) {
    if (blink) { f.rect(ex, T + 6, 3, 1, PK); return; }
    f.rect(ex, T + 5, 3, 2, '#f8f6f0'); f.rect(ex + 1 + look, T + 5, 1, 2, '#3a2a1e');
    if (o.lashes) f.px(ex + (ex < 24 ? 0 : 2), T + 4, PK);
  });
  f.rect(18, T + 3, 3, 1, o.brow); f.rect(27, T + 3, 3, 1, o.brow);
  f.px(23, T + 8, s); f.px(23, T + 9, s); f.px(24, T + 9, s);
  if (talk) { f.rect(22, T + 11, 4, 2, '#6a2424'); f.rect(22, T + 11, 4, 1, '#f8f6f0'); }
  else f.rect(22, T + 12, 4, 1, o.lips || '#a05848');
  if (o.face) o.face(f, hx0, hx1, T);
  if (o.hairFront) o.hairFront(f, hx0, hx1, T, r);
  outline(f);
  if (o.after) o.after(f, hx0, hx1, T);
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
  hairBack: function (f, a, b, T) { f.rect(a - 2, T + 2, 4, 20, '#6b4226'); f.rect(b - 1, T + 2, 4, 20, '#6b4226'); f.rect(a - 2, T + 2, 1, 20, '#4a2c18'); f.rect(b + 2, T + 2, 1, 20, '#4a2c18'); },
  torso: function (f, a, b, B) { f.px(21, B + 3, '#f6f4ee'); f.px(21, B + 4, '#f6f4ee'); f.px(26, B + 3, '#f6f4ee'); f.px(26, B + 4, '#f6f4ee'); f.rect(20, B + 1, 8, 1, '#b04f7c'); },
  hairFront: function (f, a, b, T) {
    for (var y = T - 2; y <= T + 2; y++) { var c = y === T - 2 ? 4 : y === T - 1 ? 2 : y === T ? 1 : 0; f.rect(a - 1 + c, y, b - a + 3 - c * 2, 1, '#6b4226'); }
    f.rect(a, T + 3, 8, 1, '#6b4226'); f.rect(a, T + 4, 4, 1, '#6b4226'); f.rect(b - 2, T + 3, 3, 1, '#6b4226');
    f.rect(a + 3, T - 1, 6, 1, '#8f5d36'); f.rect(b - 5, T + 1, 1, 2, '#4a2c18');
  }
};
// --- padre: pelo medio canoso, polo, un cable neutro (azul) de cinturon
var PADRE = {
  seed: 8, shirt: '#3f6b4a', shirtS: '#2e5238', brow: '#5a544e',
  torso: function (f, a, b, B) {
    f.rect(20, B + 1, 8, 2, '#e9e4d6'); f.px(24, B + 3, '#e9e4d6');
    for (var x = a + 1; x < b; x++) { f.px(x, 32, (x % 3) ? '#2f6fd6' : '#6aa2f0'); f.px(x, 33, (x % 3) === 1 ? '#6aa2f0' : '#2457b0'); }
    f.rect(23, 31, 3, 3, '#2f6fd6'); f.px(24, 31, '#6aa2f0'); f.px(26, 33, '#d08a3a'); f.px(27, 33, '#e8a85a'); // nudo y cobre
  },
  face: function (f, a, b, T) { f.rect(21, T + 11, 6, 1, '#8a8682'); f.px(21, T + 12, '#8a8682'); f.px(26, T + 12, '#8a8682'); },
  hairFront: function (f, a, b, T) {
    for (var y = T - 2; y <= T + 2; y++) for (var x = a - 1; x <= b + 1; x++) {
      var edge = y === T - 2 ? (x < a + 3 || x > b - 3) : y === T - 1 ? (x < a || x > b) : false;
      var entrada = y >= T + 1 && (x < a + 3 || x > b - 3);
      if (!edge && !entrada) f.px(x, y, (x + y * 3) % 7 === 0 ? '#4a443e' : (x * 5 + y) % 9 === 0 ? '#d6d7da' : y <= T - 1 ? '#b3b5b9' : '#989a9f');
    }
    f.rect(a - 1, T + 3, 2, 4, '#7f8186'); f.rect(b, T + 3, 2, 4, '#7f8186'); f.px(a - 1, T + 3, '#4a443e'); f.px(b + 1, T + 3, '#4a443e');
  }
};
// --- Lourdes: rizos rubio oscuro, top rojo de Nochevieja, pendientes
var LOURDES = {
  seed: 13, shirt: '#c0303a', shirtS: '#962530', brow: '#8a6630', lashes: true, lips: '#c23a4a',
  hairBack: function (f, a, b, T) {
    var pts = [];
    for (var y = T - 1; y <= T + 19; y += 3) { pts.push([a - 3 + (y % 2), y]); pts.push([b + 3 - (y % 2), y]); }
    for (var x = a; x <= b; x += 4) { pts.push([x, T - 2]); pts.push([x + 2, T]); }
    pts.forEach(function (p) { f.disc(p[0], p[1], 3, '#c9a04e'); });
    pts.forEach(function (p) { f.px(p[0] - 1, p[1] - 2, '#f0d892'); f.px(p[0] - 2, p[1] - 1, '#f0d892'); f.px(p[0] + 2, p[1] + 1, '#8a6428'); f.px(p[0] + 1, p[1] + 2, '#8a6428'); f.px(p[0], p[1] + 2, '#8a6428'); });
  },
  torso: function (f, a, b, B) { f.rect(21, B + 1, 6, 1, '#e8b990'); f.px(22, B + 2, '#e3b341'); f.px(24, B + 3, '#e3b341'); f.px(26, B + 2, '#e3b341'); },
  hairFront: function (f, a, b, T) {
    for (var x = a + 1; x <= b; x += 4) { f.disc(x, T + 1, 2, '#c9a04e'); f.px(x - 1, T, '#f0d892'); f.px(x + 1, T + 3, '#8a6428'); }
    f.rect(a, T + 2, 2, 3, '#c9a04e'); f.rect(b - 1, T + 2, 2, 3, '#c9a04e');
  },
  after: function (f, a, b, T) { f.px(a - 1, T + 9, '#e3b341'); f.px(a - 1, T + 10, '#e3b341'); f.px(b + 1, T + 9, '#e3b341'); f.px(b + 1, T + 10, '#e3b341'); }
};

// ======================= OBJETOS (iconos 16x16) =======================
// 0 tortilla de Lourdes · 1 jamon · 2 langostinos · 3 copa de uvas · 4 tubo de lacasitos · 5 nuggets
function objetos() {
  var f = new FB(96, 16);
  // tortilla en su plato
  f.rect(1, 12, 14, 2, '#f6f4ee'); f.rect(2, 14, 12, 1, '#cfccc3');
  f.rect(2, 6, 12, 6, '#f0c34a'); f.rect(3, 5, 10, 1, '#d99a2e'); f.rect(2, 6, 12, 1, '#d99a2e'); f.rect(2, 11, 12, 1, '#c98a28');
  f.px(5, 8, '#f7dc7a'); f.px(9, 7, '#f7dc7a'); f.px(11, 9, '#e3ad3a'); f.px(6, 10, '#e3ad3a');
  // jamon: pata con pezuña y la grasa blanca
  var o = 16;
  f.line(o + 2, 13, o + 9, 4, '#7a3a26'); f.line(o + 3, 13, o + 10, 4, '#7a3a26');
  f.rect(o + 8, 3, 6, 8, '#a8442e'); f.rect(o + 9, 2, 4, 1, '#a8442e'); f.rect(o + 9, 4, 3, 3, '#c9604a'); f.rect(o + 12, 4, 1, 6, '#f2e6d6'); f.px(o + 10, 9, '#f2e6d6');
  f.rect(o + 1, 13, 3, 2, '#2b2b2b'); f.rect(o + 1, 14, 14, 1, '#8a6038'); // pezuña y jamonero
  f.rect(o + 13, 11, 2, 3, '#8a6038');
  // langostinos en su plato
  o = 32;
  f.rect(o + 1, 12, 14, 2, '#f6f4ee'); f.rect(o + 2, 14, 12, 1, '#cfccc3');
  [[o + 3, 8], [o + 8, 6], [o + 9, 10]].forEach(function (p) {
    f.rect(p[0], p[1], 5, 3, '#f07a4a'); f.rect(p[0], p[1], 5, 1, '#ff9e70'); f.px(p[0] + 5, p[1] + 1, '#f07a4a'); f.px(p[0] + 5, p[1] + 2, '#d85a32');
    f.px(p[0] - 1, p[1] + 1, '#d85a32'); f.px(p[0] + 1, p[1] + 1, '#1f241e'); f.line(p[0] - 1, p[1], p[0] - 3, p[1] - 2, '#d85a32');
  });
  // copa con las 12 uvas
  o = 48;
  f.rect(o + 4, 5, 8, 6, '#e8f2f6', 210); f.rect(o + 5, 11, 6, 1, '#cfe0e8'); f.rect(o + 7, 12, 2, 2, '#cfe0e8'); f.rect(o + 5, 14, 6, 1, '#cfe0e8');
  [[5, 8], [7, 8], [9, 8], [6, 6], [8, 6], [10, 6], [6, 10], [8, 10], [10, 9], [5, 6], [9, 4], [7, 4]].forEach(function (g, i) { f.rect(o + g[0], g[1], 2, 2, i % 3 ? '#8fbf3e' : '#b0d85a'); });
  // tubo de lacasitos (chocolatinas de colores)
  o = 64;
  f.rect(o + 5, 2, 6, 12, '#f2b632'); f.rect(o + 5, 2, 6, 2, '#d8392b'); f.rect(o + 5, 13, 6, 1, '#d8392b'); f.rect(o + 6, 4, 1, 9, '#ffe08a');
  [['#e8463a', 6, 6], ['#3f8fe0', 8, 7], ['#4fb34a', 9, 10], ['#f07ab0', 7, 10], ['#ffd23f', 8, 4]].forEach(function (c) { f.rect(o + c[1], c[2], 2, 2, c[0]); });
  f.rect(o + 11, 12, 2, 2, '#e8463a'); f.rect(o + 2, 13, 2, 2, '#3f8fe0'); f.rect(o + 13, 13, 2, 1, '#4fb34a');
  // caja de nuggets (sin marca)
  o = 80;
  f.rect(o + 2, 7, 12, 8, '#d8392b'); f.rect(o + 2, 7, 12, 1, '#ff6a50'); f.rect(o + 3, 10, 10, 2, '#f2b632');
  f.rect(o + 3, 4, 4, 3, '#d99a3e'); f.rect(o + 7, 3, 4, 4, '#c98a30'); f.rect(o + 10, 5, 3, 2, '#e0a848'); f.px(o + 4, 5, '#f0c070'); f.px(o + 8, 4, '#e8b860');
  outline(f);
  save(f, 'objetos.png');
}

// ======================= ETHAN SENTADO (2 fotogramas, mira a la derecha) =======================
// Sale del paseo de Ethan (sprites/ethan-walk.png, fotograma 1): se queda el cuerpo y se
// redibujan las piernas dobladas. Fotograma 2: cabeza un pixel abajo (comiendo).
function readPNG(file) {
  var b = fs.readFileSync(file), pos = 8, w, h, idat = [];
  while (pos < b.length) {
    var len = b.readUInt32BE(pos), type = b.toString('ascii', pos + 4, pos + 8), data = b.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 6) throw new Error('solo PNG RGBA de 8 bits'); }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  var raw = zlib.inflateSync(Buffer.concat(idat)), f = new FB(w, h), st = w * 4, prev = Buffer.alloc(st);
  for (var y = 0; y < h; y++) {
    var ft = raw[y * (st + 1)], line = Buffer.from(raw.slice(y * (st + 1) + 1, (y + 1) * (st + 1)));
    for (var i = 0; i < st; i++) {
      var a = i >= 4 ? line[i - 4] : 0, up = prev[i], c = i >= 4 ? prev[i - 4] : 0, v = line[i];
      if (ft === 1) v += a; else if (ft === 2) v += up; else if (ft === 3) v += (a + up) >> 1;
      else if (ft === 4) { var p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : pb <= pc ? up : c; }
      line[i] = v & 255;
    }
    line.copy(f.d, y * st); prev = line;
  }
  return f;
}
function ethanSentado() {
  var walk = readPNG(path.join(__dirname, '..', 'sprites', 'ethan-walk.png')), out = new FB(96, 48);
  for (var k = 0; k < 2; k++) {
    var f = new FB(48, 48);
    for (var y = 0; y < 34; y++) for (var x = 0; x < 48; x++) {
      var sy = k && y <= 22 ? y - 1 : y; if (sy < 0) continue;              // comiendo: cabeza un pixel abajo
      var i = (sy * walk.w + 48 + x) * 4, j = (y * 48 + x) * 4;
      for (var c = 0; c < 4; c++) f.d[j + c] = walk.d[i + c];
    }
    var A = '#1f2420', G = '#28324e', F = '#3a486c', E = '#e8b990', Hs = '#c9966b', D = '#f8f6f0', I = '#c42e28';
    f.rect(32, 28, 6, 1, A); f.rect(32, 29, 6, 4, G); f.rect(38, 29, 1, 4, A); f.rect(21, 33, 17, 1, F); // muslo hacia delante
    f.rect(34, 34, 1, 8, A); f.rect(35, 34, 2, 8, E); f.rect(37, 34, 1, 8, Hs); f.rect(38, 34, 1, 8, A); // espinilla
    f.rect(33, 42, 10, 3, D); f.rect(33, 41, 6, 1, A); f.rect(39, 42, 1, 1, I); f.rect(40, 42, 2, 1, '#2f6fd6'); f.rect(33, 45, 10, 1, A); f.px(43, 43, A); f.px(43, 44, A); f.px(32, 42, A); f.px(32, 43, A); f.px(32, 44, A);
    for (var y = 0; y < 48; y++) for (var x = 0; x < 48; x++) { var j2 = (y * 48 + x) * 4, o2 = (y * 96 + k * 48 + x) * 4; for (var c = 0; c < 4; c++) out.d[o2 + c] = f.d[j2 + c]; }
  }
  save(out, 'ethan-sit.png');
}

// ======================= CALLE (1100x216, suelo en y=200) =======================
function calleCielo() {
  var f = new FB(480, 216), r = rng(11);
  f.vgrad(0, 0, 480, 216, ['#070d24', '#0f1838', '#1f2250', '#3b2b5a', '#5a3a5c']);
  for (var i = 0; i < 160; i++) f.px(r() * 480, r() * 150, r() < 0.25 ? '#f7e8b0' : '#d6dcff', 90 + (r() * 165 | 0));
  f.disc(392, 38, 11, '#f3eedb'); f.disc(396, 35, 9, '#0f1838'); // luna menguante
  save(f, 'calle-cielo.png');
}
function calleLejos() { // margen izquierda: altos hornos, chimeneas y gruas
  var f = new FB(680, 216), r = rng(5), c = '#1d2342', e = '#2b3256';
  f.rect(0, 156, 680, 60, c);
  for (var x = 0; x < 680; x++) { var y = 150 + Math.round(4 * Math.sin(x / 37) + 3 * Math.sin(x / 11)); f.rect(x, y, 1, 216 - y, c); f.px(x, y, e); }
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
  var f = new FB(960, 216), r = rng(21), x = 0;
  while (x < 960) {
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
// La calle de Ethan, sacada de la foto del portal 3 (Sestao). Se dibuja con los colores
// de dia y luego se pasa a noche; las luces (ventanas, portal, letreros) se pintan despues.
var CALLE_W = 1300;
function nightPass(f) {
  for (var i = 0; i < f.d.length; i += 4) {
    if (!f.d[i + 3]) continue;
    f.d[i] = Math.round(f.d[i] * 0.42 + 10); f.d[i + 1] = Math.round(f.d[i + 1] * 0.45 + 12); f.d[i + 2] = Math.round(f.d[i + 2] * 0.58 + 30);
  }
}
function persiana(f, x, y, w, h, bajada, r) { // ventana con marco granate y persiana blanca
  f.rect(x - 2, y - 2, w + 4, h + 4, '#d6cbbd'); f.rect(x, y, w, h, '#5a1f1c');
  f.rect(x + 2, y + 2, w - 4, h - 4, '#2a2a33');
  f.rect(x + Math.floor(w / 2) - 1, y + 2, 2, h - 4, '#5a1f1c');
  var bh = Math.round((h - 4) * bajada);
  for (var yy = 0; yy < bh; yy++) f.rect(x + 2, y + 2 + yy, w - 4, 1, yy % 2 ? '#dcdad3' : '#ecebe6');
  f.rect(x + 2, y + 2 + bh, w - 4, 1, '#a9a59a');
  f.rect(x - 4, y + h + 2, w + 8, 3, '#e2d8ca'); f.rect(x - 4, y + h + 5, w + 8, 1, '#9e9486'); // alfeizar
  return { x: x + 2, y: y + 2 + bh + 1, w: w - 4, h: h - 4 - bh - 1 };
}
function ladrillo(f, x, y, w, h) {
  f.rect(x, y, w, h, '#c4775e');
  for (var yy = y; yy < y + h; yy += 3) {
    f.rect(x, yy, w, 1, '#dcb29c');
    for (var xx = x + ((yy - y) / 3 % 2 ? 0 : 3); xx < x + w; xx += 6) f.px(xx, yy + 1, '#a8604a');
  }
}
function persianaMetal(f, x, y, w, h, col, colD) {
  f.rect(x, y, w, h, col);
  for (var yy = y; yy < y + h; yy += 2) f.rect(x, yy, w, 1, colD);
  f.rect(x, y + h - 2, w, 2, '#5c5a55');
}
function coche(f, x, w, h, col, colD, colL, suv) { // coche aparcado visto de lado (morro a la derecha)
  var y0 = 200 - h, cab = suv ? 0.5 : 0.62;
  f.rect(x + 4, y0 + Math.round(h * 0.45), w - 8, Math.round(h * 0.4), col);             // carroceria
  f.rect(x + 2, y0 + Math.round(h * 0.55), w - 4, Math.round(h * 0.25), col);
  f.rect(x + 4, y0 + Math.round(h * 0.45), w - 8, 1, colL);
  var cx0 = x + Math.round(w * (suv ? 0.18 : 0.1)), cx1 = x + Math.round(w * (suv ? 0.68 : 0.78));
  for (var yy = 0; yy < Math.round(h * 0.45); yy++) {                                       // cabina y lunas
    var k = yy / (h * 0.45), a = cx0 + Math.round((1 - k) * 6), b = cx1 - Math.round((1 - k) * (suv ? 10 : 8));
    f.rect(a, y0 + yy, b - a, 1, yy < 2 ? colL : col);
    if (yy > 2) f.rect(a + 3, y0 + yy, b - a - 6, 1, '#3d4b5c');
  }
  f.rect(Math.round((cx0 + cx1) / 2), y0 + 3, 2, Math.round(h * 0.42) - 3, col);             // pilar
  f.rect(x + 8, y0 + Math.round(h * 0.6), w - 16, 1, colD);                                   // linea de puertas
  f.rect(x + w - 4, y0 + Math.round(h * 0.5), 3, 3, '#f2e8c0'); f.rect(x + 1, y0 + Math.round(h * 0.52), 2, 3, '#c0302a');
  [x + Math.round(w * 0.2), x + Math.round(w * 0.78)].forEach(function (wx) { f.disc(wx, 200 - 6, 6, '#1b1b1f'); f.disc(wx, 200 - 6, 3, '#9a9ea4'); f.px(wx, 194, '#cfd3d8'); });
  f.rect(x + 2, 196, w - 4, 1, colD);
}
function calle() {
  var W = CALLE_W, f = new FB(W, 216), r = rng(9);
  // acera y calzada
  f.rect(0, 200, W, 6, '#a8a49c'); f.rect(0, 200, W, 1, '#c6c2b8');
  for (var x = 0; x < W; x += 24) f.rect(x, 200, 1, 6, '#86827a');
  f.rect(0, 206, W, 2, '#d0ccc2'); f.rect(0, 208, W, 8, '#3a3a40');
  for (var x = 10; x < W; x += 60) f.rect(x, 212, 24, 1, '#d8d8cc');

  // ---- edificio de la izquierda (revoco gris)
  f.rect(0, 40, 40, 160, '#b8b2a6'); f.rect(38, 40, 2, 160, '#8a8478');
  persiana(f, 6, 62, 24, 30, 0.8); persiana(f, 6, 104, 24, 30, 0.4);
  f.rect(0, 142, 40, 58, '#6a625c'); persianaMetal(f, 4, 152, 32, 46, '#8e8c86', '#7a7872');

  // ---- EL EDIFICIO DE ETHAN (portal 3): ladrillo, persianas blancas y bajos de granito
  var X0 = 40, X1 = 620;
  ladrillo(f, X0, 52, X1 - X0, 88);
  f.rect(X0, 48, X1 - X0, 4, '#e0d6c8'); f.rect(X0, 52, X1 - X0, 1, '#9e9486');            // cornisa de arriba
  f.rect(X0, 94, X1 - X0, 4, '#e0d6c8'); f.rect(X0, 98, X1 - X0, 1, '#9e9486');            // banda entre pisos
  var luces = [];
  for (var fl = 0; fl < 2; fl++) for (var k = 0; k < 7; k++) {
    var wx = X0 + 20 + k * 82, wy = fl ? 104 : 60;
    var hueco = persiana(f, wx, wy, 46, 28, [0.55, 0.7, 0.45, 0.8, 0.6, 0.35, 0.7][(k + fl * 3) % 7]);
    if (r() < 0.5) luces.push(hueco);
  }
  // losa / voladizo sobre los bajos
  f.rect(X0 - 2, 136, X1 - X0 + 4, 5, '#e6dccd'); f.rect(X0 - 2, 141, X1 - X0 + 4, 1, '#8e8476');
  // bajos de granito
  f.rect(X0, 142, X1 - X0, 58, '#6e6260');
  for (var i = 0; i < 260; i++) f.px(X0 + r() * (X1 - X0), 142 + r() * 58, r() < 0.5 ? '#7e706c' : '#5e5250');
  // inmobiliaria
  f.rect(44, 143, 110, 10, '#3a302a'); f.box(44, 143, 110, 10, '#1f1a16');
  f.rect(48, 156, 50, 42, '#22262c'); f.rect(102, 156, 50, 42, '#22262c'); f.rect(98, 154, 4, 46, '#2a2420'); f.box(46, 154, 108, 46, '#2a2420');
  for (var py = 0; py < 3; py++) for (var pxn = 0; pxn < 3; pxn++) {
    var ax = 106 + pxn * 15, ay = 160 + py * 12;
    f.rect(ax, ay, 12, 9, '#e8e8e2'); f.rect(ax + 1, ay + 1, 10, 4, ['#6a9ad0', '#8aa86a', '#c0a070'][(py + pxn) % 3]); f.rect(ax + 1, ay + 6, 8, 1, '#9a9a96');
  }
  for (var ly = 0; ly < 3; ly++) f.rect(52, 162 + ly * 9, 40, 6, '#5a5650');
  // poste de barbero
  f.rect(158, 146, 5, 2, '#c8c8c8'); f.rect(158, 160, 5, 2, '#c8c8c8');
  for (var yy = 148; yy < 160; yy++) f.rect(158, yy, 5, 1, '#f4f4f0');
  for (var yy = 148; yy < 160; yy++) { f.px(158 + ((yy * 2) % 5), yy, '#d02a2a'); f.px(158 + ((yy * 2 + 2) % 5), yy, '#2a4ad0'); }
  // peluqueria (persiana metalica bajada)
  f.rect(168, 144, 66, 11, '#141416'); f.box(168, 144, 66, 11, '#0a0a0c');
  persianaMetal(f, 170, 156, 62, 42, '#a6a6a2', '#8c8c88');
  // portal 3
  f.rect(246, 144, 60, 56, '#8a7672'); for (var i = 0; i < 60; i++) f.px(246 + r() * 60, 144 + r() * 56, r() < 0.5 ? '#9c8884' : '#76625e');
  f.rect(252, 151, 48, 49, '#b8bcc0'); f.rect(254, 153, 44, 47, '#20262e'); f.rect(275, 153, 2, 47, '#b8bcc0');
  f.rect(270, 146, 12, 4, '#2a2a2a');
  f.rect(302, 166, 3, 10, '#3a3a3e'); f.px(303, 168, '#9adf7a');                             // portero automatico
  f.rect(256, 199, 40, 1, '#4a4440');
  // bajo cerrado (persiana beis) y panel de lamas de madera
  f.rect(316, 142, 80, 8, '#d8ccb4'); f.rect(316, 149, 80, 1, '#a89878');
  persianaMetal(f, 318, 150, 76, 48, '#bcae8e', '#a8997a');
  f.rect(398, 146, 52, 52, '#cfc2a2'); for (var x = 400; x < 450; x += 4) f.rect(x, 146, 1, 52, '#a8997a'); f.rect(398, 170, 52, 2, '#b4a684');
  // bar (en el mismo bloque)
  f.rect(456, 144, 112, 56, '#4a3a30'); f.box(456, 144, 112, 56, '#2e241e');
  f.rect(464, 160, 64, 34, '#2a2018'); f.rect(536, 158, 24, 42, '#2a2018');
  f.rect(470, 146, 54, 11, '#1b1b22'); f.box(470, 146, 54, 11, '#0e0e12');
  // garaje
  persianaMetal(f, 574, 150, 42, 48, '#8e8c86', '#7a7872');
  // cables colgando por la fachada
  function cable(x0, y0, x1, y1, sag) { for (var x = x0; x <= x1; x++) { var t = (x - x0) / (x1 - x0); f.px(x, Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag), '#1a1a1a'); } }
  cable(X0, 100, 330, 101, 4); cable(330, 101, X1, 99, 3); cable(X0, 134, 250, 133, 2); cable(250, 133, X1, 134, 2);
  for (var yy = 100; yy < 142; yy++) { f.px(300, yy, '#1a1a1a'); f.px(512, yy, '#1a1a1a'); }
  cable(286, 142, 316, 146, 4);

  // ---- hueco: edificio bajo (se ve el fondo por encima)
  f.rect(620, 128, 90, 72, '#a29a8c'); f.rect(620, 128, 90, 3, '#c8c0b0');
  persianaMetal(f, 628, 150, 74, 48, '#8e8c86', '#7a7872');
  // ---- segundo bloque (revoco beis)
  f.rect(710, 56, 300, 144, '#cbbfa6'); f.rect(710, 56, 300, 4, '#e2d8c4'); f.rect(1008, 56, 2, 144, '#9a8e78');
  for (var fl = 0; fl < 2; fl++) for (var k = 0; k < 4; k++) {
    var hx = persiana(f, 726 + k * 72, fl ? 104 : 66, 40, 26, [0.5, 0.75, 0.3, 0.6][(k + fl) % 4]);
    if (r() < 0.45) luces.push(hx);
  }
  f.rect(710, 140, 300, 60, '#5c5650');
  persianaMetal(f, 718, 150, 90, 48, '#8e8c86', '#7a7872');
  f.rect(816, 148, 60, 52, '#2a2e36'); f.box(816, 148, 60, 52, '#1c1f24');                // estanco/kiosko cerrado
  persianaMetal(f, 884, 150, 118, 48, '#a6a6a2', '#8c8c88');
  // ---- plaza del metro (provisional)
  f.rect(1010, 196, 290, 4, '#9a968e');
  f.rect(1250, 70, 50, 130, '#b8b2a6'); persiana(f, 1262, 92, 28, 26, 0.6);
  // contenedores (verde y azul)
  [[1020, '#2f6b3f', '#24532f'], [1062, '#2f5a9a', '#244878']].forEach(function (c) {
    f.rect(c[0], 176, 38, 22, c[1]); f.rect(c[0] - 2, 172, 42, 5, c[2]); f.box(c[0], 176, 38, 22, '#1a2a20');
    f.disc(c[0] + 6, 198, 2, '#1b1b1f'); f.disc(c[0] + 32, 198, 2, '#1b1b1f');
  });
  // banco
  f.rect(1112, 184, 40, 3, '#a9733f'); f.rect(1112, 176, 40, 3, '#a9733f'); [1114, 1146].forEach(function (x) { f.rect(x, 174, 3, 26, '#3d4248'); });
  // boca de metro: marquesina de cristal curvo y cartel
  for (var x = 1176; x <= 1234; x++) {
    var t = (x - 1176) / 58, y = Math.round(200 - 46 * Math.sqrt(Math.max(0, 1 - Math.pow(2 * t - 1, 2) * 0.55)));
    for (var yy = y; yy < 200; yy++) f.px(x, yy, yy - y < 2 ? '#d8eef5' : '#9ccbe0', yy - y < 2 ? 230 : 110);
    if (x % 8 === 4) for (var yy2 = y; yy2 < 200; yy2++) f.px(x, yy2, '#7f8a92');
  }
  for (var k = 0; k < 7; k++) f.rect(1192 + k * 3, 186 + k * 2, 26 - k * 3, 2, k % 2 ? '#3a3f48' : '#2b3038');
  f.rect(1162, 130, 3, 70, '#3d4248');
  // farolas
  [652, 1000].forEach(function (x) { f.rect(x, 118, 3, 82, '#3d4248'); f.rect(x - 2, 196, 7, 4, '#2d3136'); f.rect(x, 118, 12, 2, '#3d4248'); f.rect(x + 8, 120, 8, 3, '#3d4248'); });
  // coches aparcados (azul monovolumen y gris todoterreno, como en la foto) y uno rojo mas adelante
  coche(f, 140, 104, 44, '#2f5fb8', '#1f4486', '#5a86d8', false);
  coche(f, 318, 98, 40, '#b8bcc2', '#8a8e94', '#e0e3e6', true);
  coche(f, 760, 88, 34, '#a8302a', '#7a201c', '#d05048', false);

  // ---- de noche
  nightPass(f);
  // luces: ventanas encendidas, portal, letreros, bar
  luces.forEach(function (h) { if (h.h > 1) { f.rect(h.x, h.y, h.w, h.h, '#f0c060'); f.rect(h.x, h.y, h.w, 1, '#ffe08a'); f.rect(h.x + Math.floor(h.w / 2) - 1, h.y, 2, h.h, '#7a4a20'); } });
  f.rect(254, 153, 21, 47, '#e8c070'); f.rect(277, 153, 21, 47, '#e8c070'); f.rect(254, 153, 44, 3, '#fff0b0');   // portal encendido
  f.rect(258, 170, 14, 1, '#b08840'); f.rect(280, 170, 14, 1, '#b08840'); f.rect(272, 176, 2, 6, '#8a8e94'); f.rect(278, 176, 2, 6, '#8a8e94');
  f.text(274, 146, '3', '#f0f0f0');
  f.text(50, 146, 'AGENCIA INMOBILIARIA', '#e8e4da');
  f.text(171, 147, 'PELUQUERIA', '#ff5a5a'); f.text(222, 147, '', '#5a8aff');
  for (var yy = 148; yy < 160; yy++) { f.px(158 + ((yy * 2) % 5), yy, '#ff4a4a'); f.px(158 + ((yy * 2 + 2) % 5), yy, '#6a8aff'); }
  f.rect(466, 162, 60, 30, '#f4c35c'); f.rect(466, 162, 60, 3, '#ffe38f');
  for (var x = 472; x < 524; x += 14) { f.rect(x, 178, 7, 14, '#6a3a1c'); f.disc(x + 3, 176, 3, '#6a3a1c'); }
  f.rect(538, 160, 20, 40, '#f4c35c'); f.rect(552, 178, 2, 5, '#3a2f29');
  f.text(477, 149, 'BAR', '#ff5a6e', 2);
  f.rect(818, 150, 56, 3, '#3a6a9a'); f.text(824, 156, 'ESTANCO', '#c8a060');
  [652, 1000].forEach(function (x) { f.rect(x + 9, 123, 6, 2, '#fbefb2'); });
  f.rect(1148, 118, 32, 14, '#c8202a'); f.box(1148, 118, 32, 14, '#7a1016'); f.text(1151, 122, 'METRO', '#ffffff');
  save(f, 'calle.png');
}

cocinaCielo(); cocina(); cocinaMesa(); calleCielo(); calleLejos(); calleMedio(); calle();
sheet(HERMANASTRA, 'npc-hermanastra.png'); sheet(PADRE, 'npc-padre.png'); sheet(LOURDES, 'npc-lourdes.png');
objetos(); ethanSentado();
