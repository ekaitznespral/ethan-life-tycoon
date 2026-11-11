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
function FB(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h * 4); this.em = new Uint8Array(w * h); this.emit = false; }
FB.prototype.px = function (x, y, c, a) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
  var k = typeof c === 'string' ? hex(c, a) : c, i = (y * this.w + x) * 4;
  this.d[i] = k[0]; this.d[i + 1] = k[1]; this.d[i + 2] = k[2]; this.d[i + 3] = k[3];
  this.em[i >> 2] = this.emit ? 1 : 0;
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
  var f = new FB(112, 16);
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
  // la Barik: tarjeta de transporte verde azulada (sin logotipo)
  o = 96;
  f.rect(o + 1, 4, 14, 9, '#1f8f86'); f.rect(o + 1, 4, 14, 1, '#4cc2b4'); f.rect(o + 1, 12, 14, 1, '#14665f');
  f.rect(o + 2, 6, 7, 2, '#f4f1e8'); f.rect(o + 2, 9, 4, 1, '#bfe9e2'); f.rect(o + 10, 7, 3, 3, '#e8c45a'); f.px(o + 11, 8, '#b8922e');
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
  var f = new FB(500, 216), r = rng(11);
  f.vgrad(0, 0, 500, 216, ['#070d24', '#0f1838', '#1f2250', '#3b2b5a', '#5a3a5c']);
  for (var i = 0; i < 170; i++) f.px(r() * 500, r() * 150, r() < 0.25 ? '#f7e8b0' : '#d6dcff', 90 + (r() * 165 | 0));
  f.disc(392, 38, 11, '#f3eedb'); f.disc(396, 35, 9, '#0f1838'); // luna menguante
  save(f, 'calle-cielo.png');
}
function calleLejos() { // margen izquierda: altos hornos, chimeneas y gruas
  var f = new FB(760, 216), r = rng(5), c = '#1d2342', e = '#2b3256';
  f.rect(0, 156, 760, 60, c);
  for (var x = 0; x < 760; x++) { var y = 150 + Math.round(4 * Math.sin(x / 37) + 3 * Math.sin(x / 11)); f.rect(x, y, 1, 216 - y, c); f.px(x, y, e); }
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
  var f = new FB(1120, 216), r = rng(21), x = 0;
  while (x < 1120) {
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
var CALLE_W = 1600;
// suelo de la calle (igual que "ground" en story/scenes.js): rampa de 1070 a 1170
function calleSuelo(x) { return x <= 1070 ? 200 : x >= 1170 ? 212 : 200 + 12 * (x - 1070) / 100; }
function nightPass(f) {
  for (var i = 0; i < f.d.length; i += 4) {
    if (!f.d[i + 3] || f.em[i >> 2]) continue;
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
  // acera de Dr. Fleming (hasta la esquina) y calzada
  f.rect(0, 200, 700, 6, '#a8a49c'); f.rect(0, 200, 700, 1, '#c6c2b8');
  for (var x = 0; x < 700; x += 24) f.rect(x, 200, 1, 6, '#86827a');
  f.rect(0, 206, 1070, 2, '#d0ccc2'); f.rect(0, 208, 1070, 8, '#3a3a40');
  for (var x = 10; x < 1070; x += 60) f.rect(x, 212, 24, 1, '#d8d8cc');

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
  // bajos cerrados (persianas metalicas) y otro portal del bloque
  f.rect(456, 142, 64, 6, '#d8ccb4'); f.rect(456, 147, 64, 1, '#a89878');
  persianaMetal(f, 458, 148, 60, 50, '#9a9894', '#84827e');
  f.rect(526, 148, 40, 52, '#8a7672'); f.rect(530, 154, 32, 46, '#b8bcc0'); f.rect(532, 156, 28, 44, '#20262e'); f.rect(545, 156, 2, 44, '#b8bcc0');
  // garaje
  persianaMetal(f, 574, 150, 42, 48, '#8e8c86', '#7a7872');
  // cables colgando por la fachada
  function cable(x0, y0, x1, y1, sag) { for (var x = x0; x <= x1; x++) { var t = (x - x0) / (x1 - x0); f.px(x, Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag), '#1a1a1a'); } }
  cable(X0, 100, 330, 101, 4); cable(330, 101, X1, 99, 3); cable(X0, 134, 250, 133, 2); cable(250, 133, X1, 134, 2);
  for (var yy = 100; yy < 142; yy++) { f.px(300, yy, '#1a1a1a'); f.px(512, yy, '#1a1a1a'); }
  cable(286, 142, 316, 146, 4);

  // ---- fondo: lo que se ve al final de la calle (mas apagado, esta lejos)
  // edificio de ladrillo con balcones (el del centro de la foto)
  f.rect(744, 66, 230, 120, '#9a6e5a'); f.rect(744, 62, 230, 5, '#7a4e3e'); f.rect(760, 56, 40, 6, '#7a4e3e');
  for (var fl = 0; fl < 5; fl++) for (var k = 0; k < 6; k++) {
    var bx = 754 + k * 37, by = 72 + fl * 22;
    f.rect(bx, by, 14, 12, '#3a2e2c'); f.rect(bx - 2, by + 12, 18, 2, '#5a5a5e'); f.rect(bx - 2, by + 8, 1, 4, '#5a5a5e'); f.rect(bx + 15, by + 8, 1, 4, '#5a5a5e');
    if (r() < 0.35) luces.push({ x: bx + 1, y: by + 1, w: 12, h: 10 });
  }
  // el edificio alto y viejo de Zumalacarregui (revoco beis, tejado de teja, ropa tendida)
  f.rect(1100, 30, 300, 182, '#b8ab8c'); f.rect(1392, 30, 8, 182, '#9a8e72');
  for (var x = 1096; x < 1404; x++) { var ty = 30 - Math.max(0, 14 - Math.abs(x - 1250) * 0.1); f.rect(x, Math.round(ty) - 6, 1, 7, '#8a4a34'); }
  f.rect(1300, 10, 8, 14, '#8a4a34');
  for (var fl = 0; fl < 7; fl++) for (var k = 0; k < 7; k++) {
    var wx2 = 1114 + k * 40, wy2 = 40 + fl * 24;
    f.rect(wx2, wy2, 12, 14, '#3a3a40'); f.rect(wx2, wy2 + 14, 12, 1, '#d8ccb0');
    if ((k + fl) % 5 === 1) { f.rect(wx2 - 2, wy2 - 2, 16, 4, '#c8763a'); f.rect(wx2 - 2, wy2 + 2, 16, 1, '#a85a2a'); }  // toldo
    if (r() < 0.32) luces.push({ x: wx2 + 1, y: wy2 + 1, w: 10, h: 12 });
  }
  f.rect(1342, 108, 18, 10, '#e8e8e4'); f.rect(1346, 118, 4, 6, '#e8e8e4');                      // sabana tendida
  f.rect(1210, 112, 30, 1, '#4a4a4a'); f.rect(1214, 113, 5, 7, '#c84a4a'); f.rect(1222, 113, 6, 9, '#4a6ac8'); f.rect(1231, 113, 4, 6, '#e8e8e4');
  // edificio rojo moderno a la derecha
  f.rect(1420, 60, 180, 152, '#a8402e'); f.rect(1420, 60, 180, 3, '#c85a44');
  for (var fl = 0; fl < 6; fl++) for (var k = 0; k < 5; k++) { var wx3 = 1432 + k * 34, wy3 = 70 + fl * 22; f.rect(wx3, wy3, 10, 12, '#2e2a30'); if (r() < 0.3) luces.push({ x: wx3 + 1, y: wy3 + 1, w: 8, h: 10 }); }
  // ventanas encendidas (emiten luz: quedan por debajo de lo que se pinte despues)
  f.emit = true;
  luces.forEach(function (h) { if (h.h > 1) { f.rect(h.x, h.y, h.w, h.h, '#f0c060'); f.rect(h.x, h.y, h.w, 1, '#ffe08a'); f.rect(h.x + Math.floor(h.w / 2) - 1, h.y, 2, h.h, '#7a4a20'); } });
  f.emit = false;
  // talud de cesped y arboles
  for (var x = 960; x < W; x++) { var gy = 180 + Math.round(4 * Math.sin(x / 23)); f.rect(x, gy, 1, Math.max(0, calleSuelo(x) - gy), '#4e7a3a'); f.px(x, gy, '#6a9a48'); }
  [[1150, 150, 22], [1185, 160, 16], [1470, 140, 26], [1520, 132, 30], [1575, 145, 24]].forEach(function (t) {
    f.rect(t[0] - 2, t[1], 5, 200 - t[1], '#4a3626');
    for (var i = 0; i < 9; i++) f.disc(t[0] + Math.round(Math.sin(i * 2.1) * t[2] * 0.6), t[1] - Math.round(Math.cos(i * 1.7) * t[2] * 0.4), Math.round(t[2] * 0.55), i % 3 ? '#3e6a30' : '#4e8038');
  });

  // ---- esquina: el ultimo portal del bloque (bajo color salmon, persianas azules y pintadas)
  ladrillo(f, 620, 52, 84, 88); f.rect(620, 48, 84, 4, '#e0d6c8'); f.rect(620, 94, 84, 4, '#e0d6c8'); f.rect(702, 48, 2, 152, '#8a5040');
  persiana(f, 634, 60, 40, 28, 0.5); persiana(f, 634, 104, 40, 28, 0.7);
  f.rect(618, 136, 88, 5, '#e6dccd');
  f.rect(620, 141, 84, 59, '#d07a62'); f.rect(620, 141, 84, 2, '#e8957c');
  persianaMetal(f, 626, 150, 36, 48, '#3a56a0', '#2c4486'); persianaMetal(f, 668, 156, 22, 26, '#3a56a0', '#2c4486');
  [[630, 186, '#f0f0f0'], [640, 182, '#e8e8e8']].forEach(function () { });
  f.line(672, 188, 680, 184, '#f2f2f2'); f.line(680, 184, 686, 190, '#f2f2f2'); f.line(686, 190, 694, 183, '#f2f2f2'); f.line(676, 192, 692, 192, '#e8e8e8'); // pintada
  f.rect(668, 144, 16, 6, '#e8e4da'); f.text(669, 145, 'DR.F', '#3a3a3a');                    // placa de la calle

  // ---- paso de cebra
  f.rect(700, 200, 90, 8, '#3a3a40');
  for (var x = 704; x < 788; x += 12) f.rect(x, 200, 7, 8, '#e8e8e0');
  // bolardos
  [694, 796, 812].forEach(function (x) { f.rect(x, 184, 4, 16, '#1e1e22'); f.rect(x, 184, 4, 2, '#8a8a8e'); });

  // ---- plaza de adoquin rojo
  f.rect(790, 200, 280, 6, '#a8584a');
  for (var x = 790; x < 1070; x += 6) f.rect(x, 200, 1, 6, '#8e463a');
  f.rect(790, 203, 280, 1, '#8e463a');
  // caseta blanca con pintadas
  f.rect(830, 150, 84, 50, '#e8e6e0'); f.rect(830, 150, 84, 2, '#f8f8f4'); f.box(830, 150, 84, 50, '#b8b6b0');
  for (var x = 852; x < 914; x += 20) f.rect(x, 152, 1, 48, '#c8c6c0');
  f.rect(872, 160, 18, 40, '#dcdad4'); f.box(872, 160, 18, 40, '#b0aea8'); f.rect(886, 178, 2, 4, '#2a2a2a');
  f.text(836, 168, 'BSL', '#d04a6a', 2);
  f.line(834, 160, 846, 156, '#b8d040'); f.line(846, 156, 860, 162, '#b8d040'); f.line(838, 190, 866, 186, '#b8d040'); f.line(895, 166, 910, 172, '#d04a6a');
  // barandillas verdes (detras)
  function barandilla(x0, x1) {
    for (var x = x0; x <= x1; x++) { var y = calleSuelo(x); f.px(x, Math.round(y) - 14, '#2e6a44'); f.px(x, Math.round(y) - 8, '#2e6a44'); }
    for (var x = x0; x <= x1; x += 22) { var y2 = calleSuelo(x); f.rect(x, Math.round(y2) - 15, 2, 15, '#2e6a44'); }
  }
  barandilla(920, 1050); barandilla(1074, 1166);
  // papelera
  f.rect(946, 176, 10, 14, '#6a6e72'); f.rect(946, 176, 10, 2, '#8a8e92'); f.rect(950, 190, 2, 10, '#3d4248');
  // farolas de bola
  [990, 1110, 1290].forEach(function (x) { var y = calleSuelo(x); f.rect(x, y - 70, 3, 70, '#3d4248'); f.rect(x - 2, y - 4, 7, 4, '#2d3136'); f.disc(x + 1, y - 74, 5, '#e8e8e2'); });

  // ---- rampa hacia el aparcamiento
  for (var x = 1070; x <= 1170; x++) { var y = Math.round(calleSuelo(x)); f.rect(x, y, 1, 6, '#a8584a'); if (x % 6 === 0) f.rect(x, y, 1, 6, '#8e463a'); f.rect(x, y + 6, 1, 216 - y - 6, '#7a7670'); }
  // ---- aparcamiento
  f.rect(1170, 212, W - 1170, 4, '#404046');
  // la boca de metro de hormigon (tunel acristalado con reja) y el cartel rojo de Sestao
  var mx = 1486, mb = 212;
  for (var x = mx; x <= mx + 84; x++) {
    var d = Math.min(x - mx, mx + 84 - x), top = d < 12 ? mb - 36 - d : mb - 48;
    f.rect(x, top, 1, mb - top, '#a4a6a8'); if (d < 2 || x === mx + 42) f.rect(x, top, 1, mb - top, '#7a7c80');
    f.px(x, top, '#c4c6c8');
  }
  f.rect(mx + 10, mb - 38, 64, 38, '#1a1d22');
  for (var x = mx + 12; x < mx + 74; x += 3) f.rect(x, mb - 36, 1, 36, '#5a5040');
  f.rect(1448, 186, 34, 10, '#c8202a'); f.box(1448, 186, 34, 10, '#7a1016'); f.rect(1448, 196, 34, 16, '#e8e8e4'); f.box(1448, 196, 34, 16, '#9a9a96');
  f.rect(1452, 200, 10, 8, '#c8202a'); f.rect(1466, 200, 12, 2, '#5a5a5a'); f.rect(1466, 204, 10, 2, '#5a5a5a');
  // barrera roja y blanca
  f.rect(1430, 196, 2, 16, '#e8e8e4'); f.rect(1444, 196, 2, 16, '#e8e8e4'); for (var x = 1430; x < 1446; x += 4) f.rect(x, 196, 2, 2, (x / 4) % 2 ? '#c8202a' : '#e8e8e4');
  // farolas: una en el hueco de la esquina
  [652].forEach(function (x) { f.rect(x, 118, 3, 82, '#3d4248'); f.rect(x - 2, 196, 7, 4, '#2d3136'); f.rect(x, 118, 12, 2, '#3d4248'); f.rect(x + 8, 120, 8, 3, '#3d4248'); });
  // coches del portal (monovolumen azul y todoterreno gris, como en la foto) y los del aparcamiento
  coche(f, 140, 104, 44, '#2f5fb8', '#1f4486', '#5a86d8', false);
  coche(f, 318, 98, 40, '#b8bcc2', '#8a8e94', '#e0e3e6', true);
  function cocheBajo(x, w, h, c1, c2, c3, suv) { var tmp = new FB(w + 4, 216); coche(tmp, 2, w, h, c1, c2, c3, suv); for (var yy = 0; yy < 216; yy++) for (var xx = 0; xx < w + 4; xx++) { var i = (yy * tmp.w + xx) * 4; if (tmp.d[i + 3] && yy + 12 < 216) f.px(x + xx - 2, yy + 12, [tmp.d[i], tmp.d[i + 1], tmp.d[i + 2], 255]); } }
  cocheBajo(1182, 88, 38, '#c0c4ca', '#8e9298', '#e4e6e8', false);
  cocheBajo(1278, 90, 36, '#b8302a', '#7a201c', '#d85048', false);
  cocheBajo(1340, 86, 38, '#2f6ad0', '#1f4a96', '#5a8ae0', false);

  // ---- de noche
  nightPass(f);
  // luces: portal, letreros
  f.rect(254, 153, 21, 47, '#e8c070'); f.rect(277, 153, 21, 47, '#e8c070'); f.rect(254, 153, 44, 3, '#fff0b0');   // portal encendido
  f.rect(258, 170, 14, 1, '#b08840'); f.rect(280, 170, 14, 1, '#b08840'); f.rect(272, 176, 2, 6, '#8a8e94'); f.rect(278, 176, 2, 6, '#8a8e94');
  f.text(274, 146, '3', '#f0f0f0');
  f.text(50, 146, 'AGENCIA INMOBILIARIA', '#e8e4da');
  f.text(171, 147, 'PELUQUERIA', '#ff5a5a'); f.text(222, 147, '', '#5a8aff');
  for (var yy = 148; yy < 160; yy++) { f.px(158 + ((yy * 2) % 5), yy, '#ff4a4a'); f.px(158 + ((yy * 2 + 2) % 5), yy, '#6a8aff'); }
  f.rect(532, 156, 13, 44, '#b89a5a'); f.rect(547, 156, 13, 44, '#b89a5a'); f.rect(532, 156, 28, 2, '#e0c27a');   // el otro portal, con luz tenue
  [652].forEach(function (x) { f.rect(x + 9, 123, 6, 2, '#fbefb2'); });
  [990, 1110, 1290].forEach(function (x) { var y = calleSuelo(x); f.disc(x + 1, y - 74, 5, '#fff6d0'); f.disc(x + 1, y - 75, 2, '#ffffff'); });
  for (var x = 1498; x < 1560; x += 3) f.rect(x, 176, 1, 36, '#e8b060');                      // la reja del metro, iluminada por dentro
  f.rect(1496, 174, 64, 2, '#ffd890');
  f.rect(1448, 186, 34, 10, '#e02a32'); f.text(1450, 188, 'SESTAO', '#ffffff');
  save(f, 'calle.png');
}

// ======================= ESTACION DE METRO =======================
// Entrada (bajando de la calle), el tunel de acero con las pasarelas mecanicas y el
// vestibulo con las canceladoras; al fondo, el arco que lleva a los andenes.
// Las pasarelas (peldanos y pasamanos que se mueven) y las portillas las pinta el motor encima.
var METRO_W = 1120;
function mezcla(f, x, y, w, h, c, k) { // tinte semitransparente sobre lo ya pintado
  var t = hex(c);
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
    var X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= f.w || Y >= f.h) continue;
    var n = (Y * f.w + X) * 4; for (var q = 0; q < 3; q++) f.d[n + q] = Math.round(f.d[n + q] * (1 - k) + t[q] * k); f.d[n + 3] = 255;
  }
}
function metro() {
  var f = new FB(METRO_W, 216), r = rng(77), W = METRO_W;
  // --- boveda de acero (todo el escenario) ---
  f.vgrad(0, 0, W, 196, ['#b98a84', '#c8aaa2', '#cbc3bd', '#bdb7b2', '#a7a29e']);
  for (var x = 0; x < W; x += 2) { f.px(x, 0, '#8a6d68'); }
  [44, 92, 132].forEach(function (y) { f.rect(0, y, W, 1, '#a39b96'); f.rect(0, y + 1, W, 1, '#d6d0cb'); });   // juntas de los paneles
  for (var x = 18; x < W; x += 56) { f.rect(x, 0, 2, 196, '#8e8782'); f.rect(x + 2, 0, 1, 196, '#ddd6d0'); }   // costillas
  // luces del techo: dos tiras de fluorescentes
  f.emit = true;
  for (var x = 6; x < W; x += 40) { f.rect(x, 10, 32, 2, '#fff6ea'); f.rect(x + 2, 12, 28, 1, '#ffd9c8'); }
  for (var x = 26; x < W; x += 40) { f.rect(x, 30, 26, 1, '#fff2e2'); }
  f.emit = false;
  // --- suelo general (granito claro) ---
  f.rect(0, 196, W, 20, '#cfc6b8'); f.rect(0, 196, W, 1, '#e8e0d2');
  for (var x = 0; x < W; x += 16) f.rect(x, 197, 1, 19, '#bcb3a5');
  f.rect(0, 206, W, 1, '#bcb3a5');

  // --- entrada: escaleras mecanicas que suben a la calle (0-140) ---
  f.rect(0, 40, 140, 156, '#9e9590');
  f.rect(4, 44, 132, 60, '#1a2340'); f.vgrad(4, 44, 132, 60, ['#121a33', '#24305a']);    // la noche, arriba del todo
  f.emit = true; f.rect(4, 44, 132, 2, '#ffe3b0'); f.emit = false;
  for (var i = 0; i < 100; i++) {                              // escalera mecanica en diagonal
    var x = 128 - i, y = 196 - i;
    f.rect(x - 22, y, 22, 1, i % 4 === 0 ? '#5d6066' : '#7a7d83');
    f.px(x, y, '#16171a'); f.px(x + 1, y, '#16171a'); f.px(x - 23, y - 8, '#16171a'); f.px(x - 22, y - 8, '#16171a');
  }
  for (var i = 0; i < 100; i += 3) mezcla(f, 104 - i - 22, 186 - i, 24, 10, '#bfe6ff', 0.12);
  // panel de informacion
  f.rect(150, 120, 26, 40, '#3a3d44'); f.rect(152, 122, 22, 26, '#f0ece2'); f.rect(154, 125, 18, 1, '#e02a32'); f.rect(154, 129, 14, 1, '#888'); f.rect(154, 132, 16, 1, '#888'); f.rect(154, 135, 10, 1, '#888');
  f.rect(158, 160, 10, 36, '#8a8d93');

  // --- tunel de las pasarelas (190-780) ---
  var T0 = 190, T1 = 780;
  // pasarela del fondo (la que va en sentido contrario): faldon, cristal y pasamanos
  f.rect(T0, 172, T1 - T0, 12, '#9da0a6'); f.rect(T0, 172, T1 - T0, 1, '#c9ccd2'); f.rect(T0, 183, T1 - T0, 1, '#6e7177');
  f.rect(T0, 150, T1 - T0, 2, '#16171a');
  mezcla(f, T0, 152, T1 - T0, 18, '#bfe6ff', 0.18);
  for (var x = T0; x < T1; x += 28) f.rect(x, 152, 1, 18, '#e8f4ff');
  // barandilla trasera de la pasarela de Ethan
  f.rect(T0, 184, T1 - T0, 12, '#aeb1b7'); f.rect(T0, 184, T1 - T0, 1, '#d4d7dc');
  mezcla(f, T0, 170, T1 - T0, 14, '#bfe6ff', 0.14);
  for (var x = T0 + 10; x < T1; x += 32) f.rect(x, 170, 1, 14, '#eef7ff');
  // faldon de acero de la pasarela de Ethan (debajo de los peldanos)
  f.rect(T0 - 6, 199, T1 - T0 + 12, 17, '#8e9198'); f.rect(T0 - 6, 199, T1 - T0 + 12, 1, '#c4c7cc');
  for (var x = T0; x < T1; x += 24) f.rect(x, 202, 12, 1, '#a8abb1');
  // peines y postes de entrada/salida, con la luz roja y la flecha azul
  [T0 - 14, T1 + 4].forEach(function (x, k) {
    f.rect(x, 160, 8, 36, '#c8cbd0'); f.rect(x, 160, 1, 36, '#eceef2'); f.rect(x + 7, 160, 1, 36, '#8d9096');
    f.rect(x, 158, 8, 2, '#16171a');
    f.emit = true; f.disc(x + 4, 170, 2, k ? '#e8463a' : '#3f8fe0'); f.emit = false;
    f.rect(x + 2, 184, 4, 4, '#e8463a');
  });
  // cartel colgado: CAMINO TXIKITO BIDEA
  [330, 420].forEach(function (x) { f.rect(x, 12, 1, 40, '#6e6a66'); });
  f.rect(316, 52, 120, 13, '#d81e26'); f.rect(316, 52, 120, 1, '#f04a4f'); f.rect(316, 64, 120, 1, '#9c1218');
  f.emit = true;
  f.rect(322, 55, 1, 7, '#ffffff'); f.px(321, 56, '#ffffff'); f.px(323, 56, '#ffffff'); f.px(320, 57, '#ffffff'); f.px(324, 57, '#ffffff');
  f.text(330, 56, 'CAMINO TXIKITO BIDEA', '#ffffff');
  f.emit = false;

  // --- vestibulo de las canceladoras (800-1120) ---
  var V = 800;
  f.rect(V - 4, 40, 4, 156, '#8e8782');
  f.vgrad(V, 40, W - V, 156, ['#c2bbb6', '#b8b1ac', '#a49e99']);
  for (var x = V + 6; x < W; x += 8) f.rect(x, 64, 1, 132, '#ada69f');               // paneles de acero acanalado
  f.rect(V, 64, W - V, 1, '#8e8782'); f.rect(V, 150, W - V, 1, '#8e8782');
  // arco del fondo que lleva a los andenes, iluminado
  var AX = 1010, AW = 74;
  for (var y = 90; y < 196; y++) {
    var dy = Math.max(0, 128 - y), half = Math.round(Math.sqrt(Math.max(0, 37 * 37 - dy * dy * 0.9)));
    f.emit = true; f.rect(AX + 37 - half, y, half * 2, 1, y < 120 ? '#f2d6c6' : '#e6d2c0'); f.emit = false;
    f.px(AX + 37 - half - 1, y, '#7d7671'); f.px(AX + 37 + half, y, '#7d7671');
  }
  f.emit = true;
  for (var y = 100; y < 196; y += 9) f.rect(AX + 24, y, 26, 1, '#d9b9aa');             // costillas del tunel de dentro
  f.rect(AX + 30, 150, 14, 46, '#cbb6a4'); f.rect(AX + 33, 160, 8, 36, '#b9a290');      // escaleras al anden, al fondo
  f.emit = false;
  // canceladoras: dos cabinas de acero con pantalla y la etiqueta naranja; las portillas, el motor
  [852, 892].forEach(function (x) {
    f.rect(x, 154, 16, 42, '#a8abb1'); f.rect(x, 154, 16, 1, '#e2e4e8'); f.rect(x, 154, 1, 42, '#d0d3d8'); f.rect(x + 15, 154, 1, 42, '#7e8187');
    f.rect(x + 2, 147, 12, 8, '#4a4e56'); f.emit = true; f.rect(x + 3, 148, 10, 6, '#9fd4ff'); f.rect(x + 4, 149, 6, 1, '#ffffff'); f.emit = false;
    f.emit = true; f.rect(x + 3, 162, 10, 7, '#f06a2a'); f.rect(x + 5, 164, 2, 3, '#ffffff'); f.rect(x + 7, 165, 4, 1, '#ffffff'); f.emit = false;
    f.rect(x + 4, 174, 8, 5, '#2a2c30'); f.emit = true; f.px(x + 7, 176, '#4cff7a'); f.emit = false;
    f.rect(x + 3, 186, 10, 4, '#e8463a');
  });
  f.rect(866, 194, 28, 2, '#8d9096');                                                     // carril de las portillas
  save(f, 'metro.png');
}

cocinaCielo(); cocina(); cocinaMesa(); calleCielo(); calleLejos(); calleMedio(); calle();
sheet(HERMANASTRA, 'npc-hermanastra.png'); sheet(PADRE, 'npc-padre.png'); sheet(LOURDES, 'npc-lourdes.png');
objetos(); ethanSentado(); metro();
