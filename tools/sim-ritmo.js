// Simulador de ritmo de Ethan life tycoon. Carga datos y formulas reales de index.html.
// Juega solo con compras golosas (mejor relacion coste/ganancia), clicks limitados por la energia
// y jubilacion cuando el sarro nuevo iguala al que ya tienes. Sirve para ver el ritmo tras tocar precios.
// Uso: node tools/sim-ritmo.js [horas] [clicksPorSeg] [estrategiaJub]   (tarda 1-3 min)
var fs = require('fs'), vm = require('vm');
var html = fs.readFileSync(process.argv[5] || require('path').join(__dirname, '..', 'index.html'), 'utf8');
function cut(a, b) { var i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('cut ' + a); return html.slice(i, j); }
var code = cut('var ITEMS=[', '/* ================= MEDALLAS') + '\n' + cut('/* ================= FORMULAS', '/* ================= SONIDO');
var ctx = { Math: Math, Date: Date, console: console, Object: Object, isFinite: isFinite, String: String, JSON: JSON };
vm.createContext(ctx);
vm.runInContext('var S={};var frzUntil=0;' + code + ';this.api={sarMult:sarMult,gGlob:gGlob,imul:imul,psGar:psGar,clickBase:clickBase,ITEMS:ITEMS,GAR:GAR,UP:UP,GMS:GMS,EV:EV,ps:ps,per:per,regen:regen,maxE:maxE,critP:critP,spd:spd,autoRate:autoRate,becPer:becPer,gUnit:gUnit,lvl:lvl,sarPend:sarPend,sarroFor:sarroFor,minLvl:minLvl,BECF:BECF,setS:function(x){S=x},getS:function(){return S}}', ctx);
var A = ctx.api;

var HOURS = +(process.argv[2] || 30), CPS = +(process.argv[3] || 4), JUB = process.argv[4] || 'double';
var FUDGE = 1.12; // sucesos + bonus dorados de media
function fresh() { return { m: 0, e: 20, done: 0, own: 0, br: {}, sn: 0, ga: {}, lg: {}, td: {}, t: 16, acc: 0, md: {}, bo: 0, bx: 2, up: {}, sp: 1, sk: {}, lt: 0, sar: 0, sart: 0, pres: 0, fx: [], slp: 0, cos: {} }; }
var S = fresh(); A.setS(S);
// la mitad de las veces el item con ruleta sale mal: usamos el valor esperado tirando al azar
function income(S) { // euros por segundo real que puede sacar el jugador
  var sp = A.spd(), clk = Math.min(CPS, A.regen() * sp), crit = 1 + A.critP() * 4, cmb = clk >= 1 ? 2.2 : clk >= .5 ? 1.4 : 1;
  return (A.ps() * sp + clk * A.per() * crit * cmb + A.autoRate() * sp * A.becPer()) * FUDGE;
}
function cands() {
  var L = [];
  var it = A.ITEMS[S.own]; if (it) L.push({ k: 'item', c: it.c, n: it.n, go: function () { S.own++; }, undo: function () { S.own--; }, real: function () { if (it.rl && Math.random() < it.rl.p) { if (it.rl.k === 'br') S.br[it.id] = 1; else S.sn = 1; } if (it.fill) S.e = A.maxE(); } });
  A.GAR.forEach(function (g, i) {
    var vis = i === 0 || A.lvl(g) > 0 || A.lvl(A.GAR[i - 1]) > 0; if (!vis) return;
    var l = A.lvl(g); var c = A.gUnit(g, l);
    L.push({ k: 'gar', c: c, n: g.n, id: g.id, go: function () { S.ga[g.id] = l + 1; }, undo: function () { if (l) S.ga[g.id] = l; else delete S.ga[g.id]; } });
  });
  A.UP.forEach(function (u) { if (S.up[u.id] || (u.req && !S.up[u.req])) return; var sp0; L.push({ k: 'up', c: u.c, n: u.n, go: function () { sp0 = S.sp; S.up[u.id] = 1; if (u.sp) S.sp = u.sp; }, undo: function () { delete S.up[u.id]; S.sp = sp0; } }); });
  return L;
}
function delta(cd, I0) { cd.go(); var I1 = income(S); cd.undo(); return I1 - I0; }
var log = [], T = 0, dt = 2, ms = {}, firstJub = null, E = 0;
function mark(k) { if (!(k in ms)) ms[k] = T; }
var cmbClicks = 0;
while (T < HOURS * 3600) {
  // energia y clicks
  var sp = A.spd(), sleeping = S.slp > S.t;
  S.e = Math.min(A.maxE(), S.e + A.regen() * dt * sp);
  var I = income(S); S.m += I * dt; S.lt += I * dt;
  // reloj de juego y dormir (L-V 22:00, 60%)
  S.acc += dt * sp; while (S.acc >= 3) { S.acc -= 3; S.t++; var d = Math.floor(S.t / 48), wd = d % 7; if (S.t % 48 === 44 && wd < 5 && Math.random() < .6) S.slp = (d + 1) * 48 + 16; }
  // compras
  if (T % 6 === 0) for (var guard = 0; guard < 60; guard++) {
    var L = cands(), best = null, bs = Infinity, I2 = income(S);
    L.forEach(function (cd) { var dI = delta(cd, I2); if (dI <= 0) dI = 1e-9; var sc = Math.max(0, (cd.c - S.m) / Math.max(I2, 1e-9)) + cd.c / dI; if (cd.k === 'item' && cd.c < S.m * .05) sc = -1; if (sc < bs) { bs = sc; best = cd; } });
    if (!best || best.c > S.m) break;
    S.m -= best.c; best.go(); if (best.real) best.real();
    if (best.k === 'item') { mark('item:' + A.ITEMS[S.own - 1].id + (S.pres ? '@' + S.pres : '')); }
    if (best.k === 'up') mark('up:' + best.n + (S.pres ? '@' + S.pres : ''));
    if (best.k === 'gar' && S.ga[A.GAR.filter(function (g) { return g.n === best.n })[0].id] === 1) mark('gar:' + best.n + (S.pres ? '@' + S.pres : ''));
  }
  // jubilacion
  var pend = A.sarPend();
  if (pend >= Math.max(JUB === 'double' ? 2 : 5, S.sart) && S.own >= 18) {
    if (firstJub === null) firstJub = T;
    log.push({ T: T, n: pend, sart: S.sart + pend, own: S.own, lt: S.lt, inc: income(S), sm: A.sarMult(), gg: A.gGlob(), psg: A.psGar(), lv: A.GAR.map(function(g){return A.lvl(g)}).join(','), sp: A.spd() });
    S.sar += pend; S.sart += pend; S.pres++; var keepSp = S.sart >= 40 ? { s2: S.up.s2, s4: S.up.s4, s10: S.up.s10 } : {};
    S.m = 0; S.own = 0; S.br = {}; S.sn = 0; S.ga = {}; S.up = {}; for (var k in keepSp) if (keepSp[k]) S.up[k] = 1; S.sp = S.up.s10 ? 10 : S.up.s4 ? 4 : S.up.s2 ? 2 : 1; S.e = A.maxE(); S.fx = [];
  }
  if (S.fin) mark('FIN');
  T += dt;
}
function hm(t) { return (t / 3600).toFixed(2) + 'h'; }
var keys = Object.keys(ms).sort(function (a, b) { return ms[a] - ms[b]; });
keys.forEach(function (k) { if (k.indexOf("@") < 0 || /novia|jokincar|estafa/.test(k)) console.log(hm(ms[k]).padStart(8), k); });
console.log('jubilaciones:'); log.forEach(function (j) { console.log('  ' + hm(j.T) + ' +' + j.n + ' sarro (total ' + j.sart + ') objetos ' + j.own + ' lt ' + j.lt.toExponential(2)+' inc '+j.inc.toExponential(2)+' sm '+j.sm.toFixed(1)+' gg '+j.gg+' psg '+j.psg.toExponential(2)+' sp '+j.sp+' lv '+j.lv); });
console.log('final: sarro', S.sart, 'objetos', S.own, '/', A.ITEMS.length, 'm', S.m.toExponential(2), 'ps', A.ps().toExponential(2), 'per', A.per().toExponential(2));
