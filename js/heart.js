/* BioInnovate: the beating heart.
   A 2.5D front view of the heart, cut open, drawn in SVG and moved by one requestAnimationFrame loop.
   The same drawing will serve the other heart simulations of Lesson 1 (labeling, cardiac cycle, output).

   BioHeart.mount(el, {
     mode: 'hero' | 'lesson',     hero: compact; lesson: labels and the count of parts explored
     speed: 'slow' | 'real',      one beat in 4 s, or 75 beats a minute (one beat in 0.8 s)
     onExplore: function (ids)    called with the ids of the parts seen so far
     onPhase: function (k)        called when the beat enters phase k (0 to 4)
     onFrame: function (u)        called on every drawn frame with the beat fraction u (0 to 1)
     bare: true                   no controls, no colour key, no info line (a picture that beats)
   })
   mode 'label': the lesson view with lettered pins on opts.labelIds and no names (the labeling activity).
   The returned object has setPlay(on), playPhase(k), setRate(bpm) and the beat fraction u.
   "Real blood colors" is one switch for the whole module: a chip sends the 'bio:blood' event on document,
   and every heart on the page follows it (html.real-blood says the current choice when a heart starts).
*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink';
  var VIEW = { hero: [8, -4, 624, 568], lesson: [-176, -4, 976, 568], label: [-176, -4, 976, 568] };
  var LEAF = { tv1: 38, tv2: 37, mv1: 44, mv2: 40, sl: 18, ao: 15.5 };
  var uidCount = 0;

  /* ------------------------------------------------------------------ content */
  /* pin: the point on the part; tag: where its label sits, x y and which side the label grows from */
  var PARTS = [
    { id: 'svc', name: 'Superior vena cava', pin: [184, 92], tag: [72, 66, 'r'],
      text: 'Large vein that brings oxygen-poor blood from the head, neck, arms and chest back to the right atrium.' },
    { id: 'ivc', name: 'Inferior vena cava', pin: [112, 470], tag: [72, 500, 'r'],
      text: 'Large vein that brings oxygen-poor blood from the lower body back to the right atrium.' },
    { id: 'ra', name: 'Right atrium', pin: [196, 252], tag: [72, 238, 'r'],
      text: 'Receives oxygen-poor blood from the body and passes it down to the right ventricle. The SA node, the heart’s pacemaker, is in its wall.' },
    { id: 'tv', name: 'Tricuspid valve', pin: [178, 310], tag: [72, 304, 'r'],
      text: 'Valve between the right atrium and the right ventricle. It shuts when the ventricle contracts, so blood cannot flow back up.' },
    { id: 'rv', name: 'Right ventricle', pin: [214, 388], tag: [72, 396, 'r'],
      text: 'Pumps oxygen-poor blood through the pulmonary valve to the lungs. Its wall is thinner than the left ventricle’s because the lungs are close by.' },
    { id: 'pv', name: 'Pulmonary valve', pin: [266, 214], tag: [72, 176, 'r'],
      text: 'Valve at the exit of the right ventricle. It shuts when the ventricle relaxes, so blood cannot fall back into it.' },
    { id: 'pa', name: 'Pulmonary arteries', pin: [62, 138], tag: [72, 104, 'r'],
      text: 'Carry oxygen-poor blood from the right ventricle to the lungs. They are arteries because they carry blood away from the heart.' },
    { id: 'pvn', name: 'Pulmonary veins', pin: [566, 230], tag: [628, 248, 'l'],
      text: 'Bring oxygen-rich blood from the lungs to the left atrium. There are four, two from each lung; the drawing shows the two from the left lung.' },
    { id: 'la', name: 'Left atrium', pin: [418, 254], tag: [628, 194, 'l'],
      text: 'Receives oxygen-rich blood from the lungs and passes it down to the left ventricle.' },
    { id: 'mv', name: 'Mitral valve', pin: [424, 310], tag: [628, 340, 'l'],
      text: 'Valve between the left atrium and the left ventricle, also called the bicuspid valve. It shuts when the left ventricle contracts.' },
    { id: 'lv', name: 'Left ventricle', pin: [404, 414], tag: [628, 424, 'l'],
      text: 'Pumps oxygen-rich blood through the aortic valve to the whole body. It has the thickest wall because it makes the highest pressure.' },
    { id: 'av', name: 'Aortic valve', pin: [327, 220], tag: [368, 174, 'l'],
      text: 'Valve at the exit of the left ventricle. It shuts when the ventricle relaxes, so blood cannot fall back into it.' },
    { id: 'ao', name: 'Aorta', pin: [458, 72], tag: [532, 38, 'l'],
      text: 'The largest artery. It carries oxygen-rich blood from the left ventricle to the body. Its first branches feed the heart muscle itself.' },
    { id: 'sep', name: 'Septum', pin: [302, 404], tag: [302, 548, 'c'],
      text: 'The wall of muscle between the right and left sides. It keeps oxygen-poor and oxygen-rich blood apart.' }
  ];

  /* one beat, as a fraction of its length (u from 0 to 1): the five phases of Table 1.2, at rest */
  var PHASES = [
    { n: 'Ventricles fill', u0: 0, u1: 0.4375 },
    { n: 'Atria contract', u0: 0.4375, u1: 0.5625 },
    { n: 'Ventricles begin to contract', u0: 0.5625, u1: 0.625 },
    { n: 'Ventricles pump blood out', u0: 0.625, u1: 0.9 },
    { n: 'Ventricles relax', u0: 0.9, u1: 1 }
  ];

  /* the routes of the blood cells: [x, y, width, tag]. A: enters an atrium; AV: the atrioventricular
     valve; SL: the semilunar valve; h: hidden until the next point (behind a vessel or the heart) */
  var ROUTES = [
    { side: 'poor', pts: [
      [184, 32, 20], [184, 120, 22], [186, 198, 26, 'A'], [194, 234, 70], [196, 280, 50], [196, 303, 20, 'AV'],
      [204, 338, 58], [220, 382, 60], [252, 384, 44], [266, 334, 26], [266, 252, 22], [266, 214, 14, 'SL'],
      [266, 170, 18], [244, 146, 16], [206, 139, 16, 'h'], [162, 138, 16], [96, 138, 16], [30, 138, 14]] },
    { side: 'poor', pts: [
      [112, 552, 20], [112, 420, 22], [114, 324, 22], [128, 290, 24], [152, 272, 28, 'A'], [188, 258, 62],
      [200, 284, 46], [200, 303, 20, 'AV'], [208, 344, 58], [226, 392, 58], [258, 388, 44], [270, 336, 26],
      [268, 254, 22], [266, 214, 14, 'SL'], [266, 170, 18], [290, 144, 16], [352, 135, 16], [452, 134, 16],
      [520, 134, 16], [610, 134, 14]] },
    { side: 'rich', pts: [
      [602, 228, 14], [530, 232, 16], [474, 238, 18, 'A'], [436, 246, 58], [410, 270, 46], [402, 303, 20, 'AV'],
      [396, 342, 54], [394, 410, 56], [376, 446, 40], [350, 404, 36], [332, 332, 26], [327, 254, 22],
      [327, 220, 12, 'SL'], [330, 172, 24], [332, 150, 24, 'h'], [333, 120, 24], [338, 96, 22], [352, 72, 16],
      [355, 44, 12], [354, 14, 10]] },
    { side: 'rich', pts: [
      [602, 266, 14], [530, 268, 16], [476, 270, 18, 'A'], [442, 266, 56], [414, 284, 44], [406, 303, 20, 'AV'],
      [404, 350, 54], [406, 424, 54], [390, 458, 38], [356, 420, 34], [336, 340, 26], [328, 256, 22],
      [327, 220, 12, 'SL'], [330, 172, 24], [334, 116, 26], [360, 74, 26], [420, 60, 26], [466, 84, 26],
      [486, 118, 26, 'h'], [489, 152, 26], [490, 206, 26, 'h'], [490, 472, 26], [490, 552, 22]] }
  ];

  /* ------------------------------------------------------------------ helpers */
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function rand(seed) { var s = seed; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }

  /* ------------------------------------------------------------------ the beat */
  function phaseAt(u) { for (var i = 0; i < PHASES.length; i++) if (u < PHASES[i].u1) return i; return 4; }
  function vVol(u) { /* ventricular volume: 0 when emptied, 1 when full */
    var f;
    if (u < 0.4375) { f = u / 0.4375; return 0.8 * (1 - Math.pow(1 - f, 2.2)); }
    if (u < 0.5625) { f = (u - 0.4375) / 0.125; return 0.8 + 0.2 * smooth(f); }
    if (u < 0.625) return 1;
    if (u < 0.9) { f = (u - 0.625) / 0.275; return (1 - f) * (1 - f); }
    return 0;
  }
  function inflow(u) { /* the speed of blood through the open AV valves, about 0 to 1.6 */
    if (u < 0.4375) return 0.15 + 1.45 * Math.pow(1 - u / 0.4375, 1.4);
    if (u < 0.5625) return 0.25 + 1.1 * Math.sin(Math.PI * (u - 0.4375) / 0.125);
    return 0;
  }
  function outflow(u) { /* the speed of blood leaving the ventricles, about 0 to 1.9 */
    if (u < 0.625 || u >= 0.9) return 0;
    return 1.8 * (1 - (u - 0.625) / 0.275) + 0.1;
  }
  function atrialSqueeze(u) { return (u >= 0.4375 && u < 0.5625) ? Math.sin(Math.PI * (u - 0.4375) / 0.125) : 0; }
  function atrialFill(u) { /* the atria swell while the AV valves are shut and empty when they open */
    if (u >= 0.5625) return smooth((u - 0.5625) / 0.4375);
    if (u < 0.2) return 1 - smooth(u / 0.2) * 0.75;
    return 0.25 * (1 - smooth((u - 0.2) / 0.24));
  }
  function avOpen(u) { if (u < 0.5625) return u < 0.02 ? smooth(u / 0.02) : 1; return u < 0.58 ? 1 - smooth((u - 0.5625) / 0.0175) : 0; }
  function slOpen(u) { if (u < 0.625 || u >= 0.9) return 0; if (u < 0.645) return smooth((u - 0.625) / 0.02); if (u > 0.88) return 1 - smooth((u - 0.88) / 0.02); return 1; }
  function arterialStretch(u) { if (u < 0.625) return 0.35 * (1 - u / 0.625); if (u < 0.75) return 0.35 + 0.65 * smooth((u - 0.625) / 0.08); return 1 - 0.65 * smooth((u - 0.75) / 0.25); }

  /* ------------------------------------------------------------------ routes, sampled once */
  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  function sampleRoute(r) {
    var P = r.pts, xs = [], ys = [], ws = [], hid = [], L = [0], tags = {};
    for (var i = 0; i < P.length - 1; i++) {
      var a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)];
      if (b[3] && b[3] !== 'h') tags[b[3]] = xs.length;
      var hide = b[3] === 'h';
      for (var k = 0; k < 14; k++) {
        var t = k / 14;
        xs.push(catmull(a[0], b[0], c[0], d[0], t));
        ys.push(catmull(a[1], b[1], c[1], d[1], t));
        ws.push(lerp(b[2], c[2], smooth(t)));
        hid.push(hide);
      }
    }
    var last = P[P.length - 1];
    xs.push(last[0]); ys.push(last[1]); ws.push(last[2]); hid.push(false);
    for (var j = 1; j < xs.length; j++) L.push(L[j - 1] + Math.hypot(xs[j] - xs[j - 1], ys[j] - ys[j - 1]));
    return { xs: xs, ys: ys, ws: ws, hid: hid, L: L, len: L[L.length - 1], sA: L[tags.A], sAV: L[tags.AV], sSL: L[tags.SL], side: r.side };
  }
  function at(R, s) {
    var L = R.L, lo = 0, hi = L.length - 1;
    if (s < 0) s = 0; if (s >= R.len) s = R.len - 0.001;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (L[m] <= s) lo = m; else hi = m; }
    var t = (s - L[lo]) / ((L[hi] - L[lo]) || 1);
    return { x: lerp(R.xs[lo], R.xs[hi], t), y: lerp(R.ys[lo], R.ys[hi], t),
      a: Math.atan2(R.ys[hi] - R.ys[lo], R.xs[hi] - R.xs[lo]), w: lerp(R.ws[lo], R.ws[hi], t), h: R.hid[lo] };
  }

  /* ------------------------------------------------------------------ the drawing */
  var S = {
    vm: 'M140 296 L478 296 C492 340 490 404 466 448 C448 484 418 514 386 520 C350 526 296 508 248 478 C196 446 150 394 140 340 Z',
    am: 'M136 308 C120 272 126 222 156 202 C172 192 190 189 206 191 C228 194 242 200 250 210 L346 212 C358 200 380 196 404 196 C442 196 470 210 478 236 C486 262 484 288 476 308 Z',
    ra: 'M146 298 C134 280 136 262 142 252 C146 228 156 214 172 208 C192 199 222 203 234 220 C244 236 244 270 238 298 Z',
    la: 'M360 298 C352 270 354 236 372 220 C394 205 432 206 454 220 C466 228 474 240 474 252 C478 264 474 282 466 298 Z',
    rv: 'M152 304 L290 304 C292 340 290 392 278 414 C266 434 240 438 214 424 C176 402 154 356 152 304 Z',
    lv: 'M320 304 L452 304 C454 352 446 414 424 450 C410 472 386 478 370 462 C344 434 324 380 320 304 Z',
    base: 'M236 318 L236 204 C236 192 245 184 257 184 L276 184 C285 184 291 188 296 193 C301 188 308 186 316 186 L336 186 C347 186 354 194 354 205 L354 318 Z',
    rvOutC: 'M251 200 C251 197 253 196 256 196 L276 196 C279 196 281 197 281 200 L284 320 L248 320 Z',
    lvOutC: 'M314 206 C314 203 316 202 319 202 L335 202 C338 202 340 203 340 206 L343 320 L311 320 Z',
    papR: 'M190 420 C192 396 198 380 206 374 C214 380 218 398 220 420 Z',
    papL1: 'M362 452 C364 428 368 408 378 400 C388 410 392 430 392 452 Z',
    papL2: 'M408 446 C408 420 412 402 420 396 C430 404 434 424 432 446 Z',
    sepHit: 'M290 304 L320 304 C324 380 344 434 370 462 C356 486 318 486 300 470 C286 452 280 434 278 414 C290 392 292 340 290 304 Z',
    fibres: 'M156 334 C172 404 232 452 300 472 M300 322 C306 402 340 456 392 478 M462 334 C462 402 440 452 404 486 M284 322 C286 362 290 402 300 442'
  };
  var VES = {
    svc: 'M184 30 L184 214',
    ivc: 'M112 556 L112 320 C112 296 126 282 150 274',
    pt: 'M266 208 L266 172 C266 150 280 138 302 136',
    lpa: 'M300 136 L612 134',
    rpa: 'M266 174 C262 152 248 141 226 139 L28 138',
    asc: 'M327 216 L330 146 C331 104 350 74 380 63 C420 50 468 62 484 100 C488 110 489 124 489 142',
    desc: 'M489 124 L490 556',
    b1: 'M356 70 L354 12', b2: 'M398 58 L398 10', b3: 'M438 60 L446 14',
    pv1: 'M604 228 L466 236', pv2: 'M604 266 L468 270'
  };

  function tube(d, w, side, cls) {
    return '<g class="bh-tube bh-' + side + (cls ? ' ' + cls : '') + '">' +
      '<path d="' + d + '" class="bh-tube__edge" stroke-width="' + w + '"/>' +
      '<path d="' + d + '" class="bh-tube__body" stroke-width="' + (w - 5) + '"/>' +
      '<path d="' + d + '" class="bh-tube__shade" stroke-width="' + Math.max(3, Math.round(w * 0.3)) + '" pathLength="100" stroke-dasharray="0 2 96 2" transform="translate(' + (w * 0.17).toFixed(1) + ' ' + (w * 0.15).toFixed(1) + ')"/>' +
      '<path d="' + d + '" class="bh-tube__shine" stroke-width="' + Math.max(2, Math.round(w * 0.18)) + '" pathLength="100" stroke-dasharray="0 3 94 3" transform="translate(' + (-w * 0.16).toFixed(1) + ' ' + (-w * 0.13).toFixed(1) + ')"/>' +
      '</g>';
  }
  function cut(cx, cy, rx, ry, side) {
    return '<ellipse class="bh-cut bh-' + side + '" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/>';
  }
  function leaflet(len, h) { /* a leaflet in its own frame: the hinge at 0,0, the free edge at len on +x */
    return 'M0 ' + (-h) + ' C' + (len * 0.45) + ' ' + (-h * 1.1) + ' ' + (len * 0.85) + ' ' + (-h * 0.7) + ' ' + len + ' -1 ' +
      'C' + (len * 0.86) + ' ' + (h * 0.55) + ' ' + (len * 0.45) + ' ' + (h * 0.95) + ' 0 ' + h + ' Z';
  }

  function build(p, view) {
    var g = function (id) { return p + id; };
    var s = '<svg class="bh-svg" viewBox="' + view.join(' ') + '" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="' + g('t') + '" focusable="false">';
    s += '<title id="' + g('t') + '">The human heart seen from the front and cut open, beating. The person’s right side is on the left of the drawing.</title>';
    s += '<defs>';
    s += '<radialGradient id="' + g('cut') + '" cx="36%" cy="26%" r="86%"><stop offset="0" stop-color="#f5c7ba"/><stop offset=".52" stop-color="#e69b8b"/><stop offset="1" stop-color="#cc6f61"/></radialGradient>';
    s += '<radialGradient id="' + g('cutA') + '" cx="40%" cy="30%" r="90%"><stop offset="0" stop-color="#f7cec2"/><stop offset=".6" stop-color="#eaa698"/><stop offset="1" stop-color="#d48272"/></radialGradient>';
    s += '<radialGradient id="' + g('vig') + '" cx="40%" cy="30%" r="78%"><stop offset=".55" stop-color="#7a261f" stop-opacity="0"/><stop offset="1" stop-color="#7a261f" stop-opacity=".34"/></radialGradient>';
    s += '<linearGradient id="' + g('rim') + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>';
    s += '<linearGradient id="' + g('slab') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a64c42"/><stop offset="1" stop-color="#6d2b25"/></linearGradient>';
    ['rich', 'poor'].forEach(function (k) {
      s += '<radialGradient id="' + g('pool-' + k) + '" cx="58%" cy="66%" r="80%" fx="62%" fy="76%">' +
        '<stop offset="0" style="stop-color:var(--bh-' + k + '-hi)"/><stop offset=".55" style="stop-color:var(--bh-' + k + ')"/><stop offset="1" style="stop-color:var(--bh-' + k + '-lo)"/></radialGradient>';
      s += '<radialGradient id="' + g('cell-' + k) + '" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0" style="stop-color:var(--bh-' + k + '-hi)"/><stop offset=".42" style="stop-color:var(--bh-' + k + '-hi)"/><stop offset=".8" style="stop-color:var(--bh-' + k + ')"/><stop offset="1" style="stop-color:var(--bh-' + k + '-lo)"/></radialGradient>';
      s += '<g id="' + g('rbc-' + k) + '"><ellipse rx="6.6" ry="4.8" fill="url(#' + g('cell-' + k) + ')" class="bh-rbc" style="stroke:var(--bh-' + k + '-lo)"/><ellipse cx="-.6" cy="-.5" rx="2.6" ry="1.7" class="bh-rbc__dimple"/></g>';
    });
    s += '<radialGradient id="' + g('floor') + '"><stop offset="0" stop-color="#13261f" stop-opacity=".2"/><stop offset="1" stop-color="#13261f" stop-opacity="0"/></radialGradient>';
    s += '</defs>';

    s += '<ellipse cx="318" cy="532" rx="200" ry="22" fill="url(#' + g('floor') + ')"/>';

    /* behind the heart */
    s += '<g class="bh-layer-back">';
    s += '<g data-part="ao">' + tube(VES.desc, 40, 'rich', 'bh-artery') + cut(490, 553, 17, 5, 'rich') + '</g>';
    s += '<g data-part="pvn">' + tube(VES.pv1, 24, 'rich') + tube(VES.pv2, 24, 'rich') + cut(604, 228, 4, 10, 'rich') + cut(604, 266, 4, 10, 'rich') + '</g>';
    s += '<g data-part="pa">' + tube(VES.rpa, 30, 'poor', 'bh-artery') + cut(28, 138, 5, 13, 'poor') + '</g>';
    s += '<g data-part="ivc">' + tube(VES.ivc, 40, 'poor') + cut(112, 553, 17, 5, 'poor') + '</g>';
    s += '</g>';

    /* the far side of the atria, behind everything that beats */
    s += '<g id="' + g('atriaB') + '"><path d="' + S.am + '" fill="url(#' + g('slab') + ')" transform="translate(7 9)"/></g>';

    /* the ventricles: they squeeze toward the valves; their cavities shrink more, so the walls thicken */
    s += '<g class="bh-vent" id="' + g('vent') + '">';
    s += '<path d="' + S.vm + '" fill="url(#' + g('slab') + ')" transform="translate(8 11)"/>';
    s += '<path d="' + S.vm + '" fill="url(#' + g('cut') + ')" class="bh-wall"/>';
    s += '<path d="' + S.vm + '" fill="url(#' + g('vig') + ')"/>';
    s += '<path d="' + S.vm + '" fill="none" stroke="url(#' + g('rim') + ')" stroke-width="3"/>';
    s += '<path d="' + S.fibres + '" class="bh-fibres"/>';
    s += '<path d="' + S.sepHit + '" class="bh-hit" data-part="sep"/>';
    s += '<g id="' + g('rvc') + '" data-part="rv"><path d="' + S.rv + '" fill="url(#' + g('pool-poor') + ')" class="bh-pool"/><path d="' + S.rv + '" class="bh-pool__rim"/></g>';
    s += '<g id="' + g('lvc') + '" data-part="lv"><path d="' + S.lv + '" fill="url(#' + g('pool-rich') + ')" class="bh-pool"/><path d="' + S.lv + '" class="bh-pool__rim"/></g>';
    s += '<path d="' + S.papR + '" class="bh-pap" data-part="rv"/><path d="' + S.papL1 + '" class="bh-pap" data-part="lv"/><path d="' + S.papL2 + '" class="bh-pap" data-part="lv"/>';
    s += '</g>';

    /* the atria */
    s += '<g class="bh-atria" id="' + g('atria') + '">';
    s += '<path d="' + S.am + '" fill="url(#' + g('cutA') + ')" class="bh-wall"/>';
    s += '<path d="' + S.am + '" fill="url(#' + g('vig') + ')"/>';
    s += '<path d="' + S.am + '" fill="none" stroke="url(#' + g('rim') + ')" stroke-width="3"/>';
    s += '<g id="' + g('rac') + '" data-part="ra"><path d="' + S.ra + '" fill="url(#' + g('pool-poor') + ')" class="bh-pool"/><path d="' + S.ra + '" class="bh-pool__rim"/></g>';
    s += '<g id="' + g('lac') + '" data-part="la"><path d="' + S.la + '" fill="url(#' + g('pool-rich') + ')" class="bh-pool"/><path d="' + S.la + '" class="bh-pool__rim"/></g>';
    s += '</g>';

    /* the openings of the AV valves, under their leaflets */
    s += '<rect x="162" y="292" width="70" height="22" rx="10" style="fill:var(--bh-poor)" id="' + g('tvo') + '"/>';
    s += '<rect x="364" y="292" width="80" height="22" rx="10" style="fill:var(--bh-rich)" id="' + g('mvo') + '"/>';

    /* the outflow tracts, cut through above the ventricles */
    s += '<path d="' + S.base + '" class="bh-wall" fill="url(#' + g('cutA') + ')" data-part="sep"/>';
    s += '<path d="' + S.base + '" fill="none" stroke="url(#' + g('rim') + ')" stroke-width="3"/>';
    s += '<g data-part="rv"><path d="' + S.rvOutC + '" fill="url(#' + g('pool-poor') + ')" class="bh-pool"/><path d="' + S.rvOutC + '" class="bh-pool__rim"/></g>';
    s += '<g data-part="lv"><path d="' + S.lvOutC + '" fill="url(#' + g('pool-rich') + ')" class="bh-pool"/><path d="' + S.lvOutC + '" class="bh-pool__rim"/></g>';

    /* in front of the heart */
    s += '<g class="bh-layer-front">';
    s += '<g data-part="ao">' + tube(VES.asc, 40, 'rich', 'bh-artery') + tube(VES.b1, 18, 'rich') + tube(VES.b2, 18, 'rich') + tube(VES.b3, 18, 'rich') +
      cut(354, 13, 8, 3.5, 'rich') + cut(398, 11, 8, 3.5, 'rich') + cut(446, 15, 8, 3.5, 'rich') + '</g>';
    s += '<g data-part="svc">' + tube(VES.svc, 38, 'poor') + cut(184, 31, 16, 5, 'poor') + '</g>';
    s += '<g data-part="pa">' + tube(VES.pt, 34, 'poor', 'bh-artery') + tube(VES.lpa, 30, 'poor', 'bh-artery') + cut(612, 134, 5, 13, 'poor') + '</g>';
    s += '</g>';

    /* valves and chordae */
    s += '<g class="bh-valves">';
    s += '<g class="bh-chords">';
    for (var c = 0; c < 6; c++) s += '<line id="' + g('ch' + c) + '" class="bh-chord"/>';
    s += '</g>';
    s += '<g data-part="tv"><rect x="154" y="282" width="86" height="62" class="bh-hit"/>' +
      '<path id="' + g('tv1') + '" d="' + leaflet(LEAF.tv1, 5) + '" class="bh-leaf"/><path id="' + g('tv2') + '" d="' + leaflet(LEAF.tv2, 5) + '" class="bh-leaf"/></g>';
    s += '<g data-part="mv"><rect x="356" y="282" width="96" height="66" class="bh-hit"/>' +
      '<path id="' + g('mv1') + '" d="' + leaflet(LEAF.mv1, 5.5) + '" class="bh-leaf"/><path id="' + g('mv2') + '" d="' + leaflet(LEAF.mv2, 5) + '" class="bh-leaf"/></g>';
    s += '<g data-part="pv"><rect x="244" y="194" width="44" height="34" class="bh-hit"/>' +
      '<path id="' + g('pv1') + '" d="' + leaflet(LEAF.sl, 3) + '" class="bh-leaf"/><path id="' + g('pv2') + '" d="' + leaflet(LEAF.sl, 3) + '" class="bh-leaf"/></g>';
    s += '<g data-part="av"><rect x="306" y="200" width="42" height="34" class="bh-hit"/>' +
      '<path id="' + g('av1') + '" d="' + leaflet(LEAF.ao, 3) + '" class="bh-leaf"/><path id="' + g('av2') + '" d="' + leaflet(LEAF.ao, 3) + '" class="bh-leaf"/></g>';
    s += '</g>';

    s += '<g class="bh-cells" id="' + g('cells') + '"></g>';

    s += '<g class="bh-leaders" aria-hidden="true">';
    PARTS.forEach(function (pt) {
      var ex = pt.tag[0], ey = pt.tag[1] + (pt.tag[2] === 'c' ? -12 : 0);
      s += '<path class="bh-leader" data-part="' + pt.id + '" d="M' + pt.pin[0] + ' ' + pt.pin[1] + ' L' + ex + ' ' + ey + '"/>';
      s += '<circle class="bh-dot" data-part="' + pt.id + '" cx="' + pt.pin[0] + '" cy="' + pt.pin[1] + '" r="3.2"/>';
    });
    s += '</g>';

    return s + '</svg>';
  }

  /* ------------------------------------------------------------------ the simulation */
  function Heart(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.mode = this.opts.mode === 'hero' || this.opts.mode === 'label' ? this.opts.mode : 'lesson';
    this.view = VIEW[this.mode];
    this.p = 'bh' + (++uidCount) + '-';
    this.u = 0.12;
    this.period = this.opts.speed === 'real' ? 0.8 : 4;
    this.playing = false;
    this.seen = {};
    this.selected = null;
    this.visible = true;
    this.lastPhase = -1;
    this.init();
  }

  Heart.prototype.init = function () {
    var self = this, root = this.root, p = this.p, lesson = this.mode === 'lesson', label = this.mode === 'label', bare = !!this.opts.bare;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.add('bh');
    if (root.parentNode && root.parentNode.classList) root.parentNode.classList.add('bh-host');
    root.setAttribute('data-mode', this.mode);

    var tags = '';
    if (label) {
      var ids = this.opts.labelIds || [];
      tags = '<div class="bh-tags">' + ids.map(function (id, i) {
        var pt = null; PARTS.forEach(function (q) { if (q.id === id) pt = q; });
        var v = self.view, x = (pt.tag[0] - v[0]) / v[2] * 100, y = (pt.tag[1] - v[1]) / v[3] * 100;
        var px = (pt.pin[0] - v[0]) / v[2] * 100, py = (pt.pin[1] - v[1]) / v[3] * 100;
        return '<span class="bh-tag bh-tag--letter" data-pid="' + pt.id + '" data-letter="' + 'ABCDEFGHIJKLMN'.charAt(i) + '" data-side="' + pt.tag[2] + '" style="--x:' + x.toFixed(2) + '%;--y:' + y.toFixed(2) + '%;--px:' + px.toFixed(2) + '%;--py:' + py.toFixed(2) + '%">' +
          '<span class="bh-tag__n">' + 'ABCDEFGHIJKLMN'.charAt(i) + '</span></span>';
      }).join('') + '</div>';
      root.classList.add('bh--labels', 'bh--lettered');
    }
    if (lesson) {
      tags = '<div class="bh-tags">' + PARTS.map(function (pt, i) {
        var v = self.view, x = (pt.tag[0] - v[0]) / v[2] * 100, y = (pt.tag[1] - v[1]) / v[3] * 100;
        var px = (pt.pin[0] - v[0]) / v[2] * 100, py = (pt.pin[1] - v[1]) / v[3] * 100;
        return '<button type="button" class="bh-tag" data-part="' + pt.id + '" data-pid="' + pt.id + '" data-side="' + pt.tag[2] + '" style="--x:' + x.toFixed(2) + '%;--y:' + y.toFixed(2) + '%;--px:' + px.toFixed(2) + '%;--py:' + py.toFixed(2) + '%">' +
          '<span class="bh-tag__n">' + (i + 1) + '</span><span class="bh-tag__name">' + esc(pt.name) + '</span></button>';
      }).join('') + '</div>';
    }

    root.innerHTML =
      '<div class="bh-top">' +
        '<p class="bh-phase"><span class="bh-phase__dot" aria-hidden="true"></span><span class="bh-phase__text"></span></p>' +
        '<p class="bh-key"><span><i class="bh-sw bh-sw--rich" aria-hidden="true"></i>Oxygen-rich</span><span><i class="bh-sw bh-sw--poor" aria-hidden="true"></i>Oxygen-poor</span></p>' +
      '</div>' +
      '<div class="bh-stage"><div class="bh-canvas">' + build(p, this.view) + tags + '</div></div>' +
      (bare ? '' : '<div class="bh-info" aria-live="polite"><p class="bh-info__name"></p><p class="bh-info__text"></p></div>') +
      (bare ? '' : '<div class="bh-controls">' +
        '<button type="button" class="bh-btn bh-btn--play"><svg viewBox="0 0 16 16" aria-hidden="true" class="bh-ico bh-ico--pause"><rect x="3.5" y="2.5" width="3" height="11" rx="1"/><rect x="9.5" y="2.5" width="3" height="11" rx="1"/></svg><svg viewBox="0 0 16 16" aria-hidden="true" class="bh-ico bh-ico--play"><path d="M4.5 2.8v10.4L13 8z"/></svg><span class="bh-btn__label">Pause</span></button>' +
        '<button type="button" class="bh-chip" data-toggle="slow" aria-pressed="' + (this.period > 1 ? 'true' : 'false') + '"><span class="bh-chip__box" aria-hidden="true"></span>Slow motion</button>' +
        (lesson ? '<button type="button" class="bh-chip" data-toggle="labels" aria-pressed="false"><span class="bh-chip__box" aria-hidden="true"></span>Labels</button>' : '') +
        '<button type="button" class="bh-chip" data-toggle="real" aria-pressed="false"><span class="bh-chip__box" aria-hidden="true"></span>Real blood colors</button>' +
        (lesson ? '<p class="bh-count" aria-live="polite"></p>' : '') +
      '</div>');
    if (bare) root.classList.add('bh--bare');

    this.svg = root.querySelector('svg');
    this.canvas = root.querySelector('.bh-canvas');
    this.stage = root.querySelector('.bh-stage');
    var $ = function (id) { return root.querySelector('#' + p + id); };
    this.E = {
      vent: $('vent'), atria: $('atria'), atriaB: $('atriaB'), rvc: $('rvc'), lvc: $('lvc'), rac: $('rac'), lac: $('lac'),
      tv1: $('tv1'), tv2: $('tv2'), mv1: $('mv1'), mv2: $('mv2'), pv1: $('pv1'), pv2: $('pv2'), av1: $('av1'), av2: $('av2'),
      tvo: $('tvo'), mvo: $('mvo'), cells: $('cells'),
      ch: [0, 1, 2, 3, 4, 5].map(function (i) { return $('ch' + i); }),
      arteries: Array.prototype.slice.call(root.querySelectorAll('.bh-artery'))
    };
    this.arteryBase = this.E.arteries.map(function (gr) {
      return Array.prototype.map.call(gr.querySelectorAll('path'), function (pth) { return +pth.getAttribute('stroke-width'); });
    });
    this.phaseText = root.querySelector('.bh-phase__text');
    this.infoName = root.querySelector('.bh-info__name');
    this.infoText = root.querySelector('.bh-info__text');
    this.playBtn = root.querySelector('.bh-btn--play') || document.createElement('button');
    if (!this.playBtn.querySelector('.bh-btn__label')) this.playBtn.innerHTML = '<span class="bh-btn__label"></span>';
    if (!this.infoName) { this.infoName = document.createElement('p'); this.infoText = document.createElement('p'); }
    this.countEl = root.querySelector('.bh-count');

    /* blood cells */
    this.routes = ROUTES.map(sampleRoute);
    var rnd = rand(4021);
    this.cells = [];
    this.routes.forEach(function (R, ri) {
      for (var i = 0; i < 11; i++) {
        var node = el('use', {}, self.E.cells);
        node.setAttributeNS(XL, 'xlink:href', '#' + p + 'rbc-' + R.side);
        node.setAttribute('href', '#' + p + 'rbc-' + R.side);
        self.cells.push({ r: ri, s: R.len * (i / 11), lat: rnd() * 2 - 1, hold: rnd(), spin: rnd() * 360, k: 0.85 + rnd() * 0.3, node: node, hid: false });
      }
    });

    /* controls */
    this.playBtn.addEventListener('click', function () { self.setPlay(!self.playing); });
    Array.prototype.forEach.call(root.querySelectorAll('[data-toggle]'), function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true', k = b.getAttribute('data-toggle');
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (k === 'slow') { self.period = on ? 4 : 0.8; self.lastPhase = -1; self.render(0); }
        if (k === 'labels') root.classList.toggle('bh--labels', on);
        if (k === 'real') { b.setAttribute('aria-pressed', on ? 'false' : 'true'); document.dispatchEvent(new CustomEvent('bio:blood', { detail: on })); }
      });
    });
    /* one colour switch for the whole module */
    var realChip = root.querySelector('[data-toggle="real"]');
    this.setReal = function (on) {
      if (realChip) realChip.setAttribute('aria-pressed', on ? 'true' : 'false');
      root.classList.toggle('bh--real', on);
      self.colorNote(on);
    };
    if (document.documentElement.classList.contains('real-blood')) root.classList.add('bh--real'), realChip && realChip.setAttribute('aria-pressed', 'true');
    document.addEventListener('bio:blood', function (e) { self.setReal(!!e.detail); });

    /* explore: tap or click a part, or its label */
    root.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-part]');
      if (t && root.contains(t) && !label) self.pick(t.getAttribute('data-part'));
    });

    /* the canvas keeps the drawing's shape inside whatever room the stage has */
    /* on a narrow screen the lesson and label views drop the margins kept for the names, so the heart is larger */
    var byId = {}; PARTS.forEach(function (q) { byId[q.id] = q; });
    var placeTags = function () {
      var v = self.view;
      Array.prototype.forEach.call(root.querySelectorAll('.bh-tag[data-pid]'), function (t) {
        var pt = byId[t.getAttribute('data-pid')];
        t.style.setProperty('--x', ((pt.tag[0] - v[0]) / v[2] * 100).toFixed(2) + '%'); t.style.setProperty('--y', ((pt.tag[1] - v[1]) / v[3] * 100).toFixed(2) + '%');
        t.style.setProperty('--px', ((pt.pin[0] - v[0]) / v[2] * 100).toFixed(2) + '%'); t.style.setProperty('--py', ((pt.pin[1] - v[1]) / v[3] * 100).toFixed(2) + '%');
      });
    };
    var fit = function () {
      var w = self.stage.clientWidth, h = self.stage.clientHeight;
      if (self.mode !== 'hero' && w) {
        var narrow = w < 620, want = narrow ? VIEW.hero : VIEW[self.mode];
        if (want !== self.view) {
          self.view = want;
          self.svg.setAttribute('viewBox', want.join(' '));
          root.classList.toggle('bh--narrow', narrow);
          placeTags();
          h = self.stage.clientHeight;
        }
      }
      var r = self.view[2] / self.view[3];
      if (!w || !h) return;
      var cw = w, ch = w / r;
      if (ch > h) { ch = h; cw = h * r; }
      self.canvas.style.width = Math.floor(cw) + 'px';
      self.canvas.style.height = Math.floor(ch) + 'px';
      root.classList.toggle('bh--narrow', cw < 620);
    };
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(this.stage); else window.addEventListener('resize', fit);
    fit();

    this.info(null);
    this.render(0);
    this.updateCount();

    /* draw only while on screen and the tab is shown; the beat's clock runs on */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(root);
    }
    this.setPlay(!reduced);
    /* a slow phone: after 90 drawn frames at under about 30 a second, half the blood cells rest, so the beat stays smooth */
    var last = 0, spent = 0, drawn = 0;
    var loop = function (t) {
      var raw = last ? (t - last) / 1000 : 0, dt = Math.min(0.05, raw); last = t;
      if (self.playing && !document.hidden && dt > 0) {
        var du = dt / self.period, nu = self.u + du;
        if (self.stopAt != null && nu >= self.stopAt) {
          du = Math.max(0, self.stopAt - self.u); self.u = self.stopAt; self.stopAt = null;
          self.render(du); self.setPlay(false);
          if (self.opts.onStop) self.opts.onStop(phaseAt(self.u));
          requestAnimationFrame(loop); return;
        }
        self.u = nu % 1;
        if (self.visible) {
          self.render(du);
          if (drawn < 90 && raw < 0.25) { spent += raw; drawn++; if (drawn === 90 && spent / 90 > 0.034) self.lighten(); }
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  /* play one phase from its start and stop at its end (the cardiac cycle simulation steps with this) */
  Heart.prototype.playPhase = function (k) {
    var P = PHASES[k];
    this.u = P.u0 + 0.0005;
    this.stopAt = P.u1 - 0.0015;
    this.lastPhase = -1;
    this.render(0);
    this.setPlay(true);
  };
  /* show a moment of the beat without moving (u from 0 to 1) */
  Heart.prototype.showAt = function (u) {
    this.stopAt = null; this.setPlay(false);
    var jump = u - this.u; this.u = u; this.lastPhase = -1; this.render(Math.abs(jump) < 0.2 ? Math.max(0, jump) : 0);
  };
  Heart.prototype.setRate = function (bpm) {
    this.period = 60 / bpm; this.lastPhase = -1;
    var slow = this.root.querySelector('[data-toggle="slow"]');
    if (slow) slow.setAttribute('aria-pressed', 'false');
  };

  Heart.prototype.lighten = function () {
    this.cells = this.cells.filter(function (C, i) { if (i % 2) { C.node.style.display = 'none'; return false; } return true; });
    this.root.setAttribute('data-lite', '');
  };

  Heart.prototype.setPlay = function (on) {
    this.playing = on;
    this.root.classList.toggle('bh--paused', !on);
    this.playBtn.setAttribute('aria-label', on ? 'Pause the heart' : 'Play the heart');
    this.playBtn.querySelector('.bh-btn__label').textContent = on ? 'Pause' : 'Play';
  };

  Heart.prototype.hint = function () {
    if (this.mode === 'label') return 'Each letter marks one part. Choose its name in the list.';
    return this.mode === 'hero' ? 'Tap any part of the heart to see its name and what it does.' : 'Select any part of the heart, or its label, to see its name and what it does.';
  };
  Heart.prototype.colorNote = function (on) {
    if (this.selected) return;
    this.infoName.textContent = on ? 'Real blood colors' : '';
    this.infoText.textContent = on ? 'Blood is always red: bright red when it carries a lot of oxygen, dark red when it carries little. Diagrams use blue only as a code.' : this.hint();
  };
  Heart.prototype.info = function (part) {
    this.infoName.textContent = part ? part.name : '';
    this.infoText.textContent = part ? part.text : this.hint();
  };
  Heart.prototype.updateCount = function () {
    if (!this.countEl) return;
    this.countEl.textContent = 'Explored ' + Object.keys(this.seen).length + ' of ' + PARTS.length + ' parts';
  };
  Heart.prototype.pick = function (id) {
    var part = null;
    for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === id) part = PARTS[i];
    if (!part) return;
    this.selected = id;
    this.seen[id] = 1;
    Array.prototype.forEach.call(this.root.querySelectorAll('[data-part]'), function (n) {
      n.classList.toggle('is-on', n.getAttribute('data-part') === id);
    });
    this.root.classList.add('bh--picked');
    this.info(part);
    this.updateCount();
    if (this.opts.onExplore) this.opts.onExplore(Object.keys(this.seen));
  };

  Heart.prototype.render = function (du) {
    var u = this.u, E = this.E;
    var c = 1 - vVol(u), a = atrialSqueeze(u), af = atrialFill(u);
    if (u >= 0.5625 && u < 0.625) c += 0.06 * Math.sin(Math.PI * (u - 0.5625) / 0.0625);

    var sx = 1 - 0.04 * c, sy = 1 - 0.08 * c;
    E.vent.setAttribute('transform', 'translate(310 300) scale(' + sx.toFixed(4) + ' ' + sy.toFixed(4) + ') translate(-310 -300)');
    E.rvc.setAttribute('transform', 'translate(222 330) scale(' + (1 - 0.12 * c).toFixed(4) + ' ' + (1 - 0.2 * c).toFixed(4) + ') translate(-222 -330)');
    E.lvc.setAttribute('transform', 'translate(388 330) scale(' + (1 - 0.18 * c).toFixed(4) + ' ' + (1 - 0.24 * c).toFixed(4) + ') translate(-388 -330)');
    var asx = 1 + 0.02 * af - 0.035 * a, asy = 1 + 0.035 * af - 0.07 * a, ra = 1 + 0.05 * af - 0.14 * a;
    var at4 = 'translate(310 304) scale(' + asx.toFixed(4) + ' ' + asy.toFixed(4) + ') translate(-310 -304)';
    E.atria.setAttribute('transform', at4);
    E.atriaB.setAttribute('transform', at4);
    E.rac.setAttribute('transform', 'translate(194 270) scale(' + ra.toFixed(4) + ') translate(-194 -270)');
    E.lac.setAttribute('transform', 'translate(412 270) scale(' + ra.toFixed(4) + ') translate(-412 -270)');

    var o = avOpen(u), sl = slOpen(u);
    var tvA = lerp(10, 80, o), mvA = lerp(9, 78, o), sA = lerp(32, -84, sl);
    E.tv1.setAttribute('transform', 'translate(160 302) rotate(' + tvA.toFixed(2) + ')');
    E.tv2.setAttribute('transform', 'translate(234 302) scale(-1 1) rotate(' + tvA.toFixed(2) + ')');
    E.mv1.setAttribute('transform', 'translate(362 302) rotate(' + mvA.toFixed(2) + ')');
    E.mv2.setAttribute('transform', 'translate(446 302) scale(-1 1) rotate(' + mvA.toFixed(2) + ')');
    E.pv1.setAttribute('transform', 'translate(251 214) rotate(' + sA.toFixed(2) + ')');
    E.pv2.setAttribute('transform', 'translate(281 214) scale(-1 1) rotate(' + sA.toFixed(2) + ')');
    E.av1.setAttribute('transform', 'translate(314 220) rotate(' + sA.toFixed(2) + ')');
    E.av2.setAttribute('transform', 'translate(340 220) scale(-1 1) rotate(' + sA.toFixed(2) + ')');
    E.tvo.setAttribute('opacity', (0.3 + 0.7 * o).toFixed(3));
    E.mvo.setAttribute('opacity', (0.3 + 0.7 * o).toFixed(3));

    var tip = function (hx, hy, len, ang, mirror) {
      var r = ang * Math.PI / 180, dx = Math.cos(r) * len, dy = Math.sin(r) * len;
      return [hx + (mirror ? -dx : dx), hy + dy];
    };
    var vt = function (x, y) { return [310 + (x - 310) * sx, 300 + (y - 300) * sy]; };
    var L = [
      [tip(160, 302, LEAF.tv1 - 2, tvA), vt(206, 376)], [tip(234, 302, LEAF.tv2 - 2, tvA, true), vt(206, 376)],
      [tip(362, 302, LEAF.mv1 - 2, mvA), vt(378, 402)], [tip(362, 302, LEAF.mv1 * 0.6, mvA), vt(378, 402)],
      [tip(446, 302, LEAF.mv2 - 2, mvA, true), vt(420, 398)], [tip(446, 302, LEAF.mv2 * 0.6, mvA, true), vt(420, 398)]
    ];
    for (var i = 0; i < 6; i++) {
      var ln = E.ch[i];
      ln.setAttribute('x1', L[i][0][0].toFixed(1)); ln.setAttribute('y1', L[i][0][1].toFixed(1));
      ln.setAttribute('x2', L[i][1][0].toFixed(1)); ln.setAttribute('y2', L[i][1][1].toFixed(1));
    }

    var st = arterialStretch(u);
    for (var j = 0; j < E.arteries.length; j++) {
      var paths = E.arteries[j].querySelectorAll('path'), base = this.arteryBase[j];
      paths[0].setAttribute('stroke-width', (base[0] * (1 + 0.07 * st)).toFixed(2));
      paths[1].setAttribute('stroke-width', (base[1] * (1 + 0.08 * st)).toFixed(2));
    }

    this.moveCells(du || 0, u, o, sl);

    var ph = phaseAt(u), key = this.period > 1 ? ph : 9;
    if (key !== this.lastPhase) {
      this.lastPhase = key;
      this.phaseText.textContent = this.period > 1 ? 'Phase ' + (ph + 1) + ' of 5: ' + PHASES[ph].n.toLowerCase() : 'Real speed: ' + Math.round(60 / this.period) + ' beats a minute';
      this.root.setAttribute('data-phase', ph + 1);
      if (this.opts.onPhase && ph !== this.lastPh) { this.lastPh = ph; this.opts.onPhase(ph); }
    }
    if (this.opts.onFrame) this.opts.onFrame(u);
  };

  Heart.prototype.moveCells = function (du, u, o, sl) {
    var fin = inflow(u), fout = outflow(u);
    for (var i = 0; i < this.cells.length; i++) {
      var C = this.cells[i], R = this.routes[C.r], s = C.s;
      if (du > 0) {
        var Lv = R.sA, La = R.sAV - R.sA, Lk = R.sSL - R.sAV, Lt = R.len - R.sSL;
        if (s < R.sA) s += (Lv / 0.9) * du;
        else if (s < R.sAV) {
          if (o > 0.5) s += (La / 0.3) * fin * du;
          else { var hA = R.sAV - 4 - C.hold * 0.75 * La; if (s < hA) s = Math.min(hA, s + (La / 0.45) * du); }
        } else if (s < R.sSL) {
          if (sl > 0.5) s += (Lk / 0.16) * fout * du;
          else { var hV = R.sAV + (0.22 + 0.6 * C.hold) * Lk; if (s < hV) s = Math.min(hV, s + (Lk / 0.4) * Math.max(0.35, fin) * du); }
        } else s += (Lt / (fout > 0 ? 0.32 : 1.3)) * du * (fout > 0 ? Math.max(0.6, fout) : 1);
        if (s >= R.len) { s = -C.hold * Lv * 0.35; C.lat = Math.random() * 2 - 1; }
        C.s = s;
      }
      var q = at(R, s), off = C.lat * q.w * 0.42;
      var x = q.x - Math.sin(q.a) * off, y = q.y + Math.cos(q.a) * off;
      C.spin = (C.spin + du * 40) % 360;
      C.node.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ((q.a * 57.3 + C.spin * 0.25) % 360).toFixed(1) + ') scale(' + C.k.toFixed(2) + ')');
      var hidden = q.h || s < 0;
      if (hidden !== C.hid) { C.hid = hidden; C.node.style.opacity = hidden ? '0' : ''; }
    }
  };

  window.BioHeart = { mount: function (node, opts) { return new Heart(node, opts); }, PARTS: PARTS, PHASES: PHASES, vVol: vVol };
})();
