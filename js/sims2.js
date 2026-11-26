/* BioInnovate simulations, part 2: Lesson 3 (the circuit tracker and its figures), Lesson 4 (cuff,
   Blood Pressure Lab, baroreceptor reflex) and the still figures of every lesson. Uses the helpers in sims.js. */
(function () {
  'use strict';
  var B = window.BioSims, h = B._h, NS = 'http://www.w3.org/2000/svg';
  var tube = h.tube, cellDef = h.cellDef, range = h.range, animate = h.animate, thump = h.thump, frame = h.frame;
  var btn = h.btn, chip = h.chip, seg = h.seg, key = h.key, esc = h.esc, clamp = h.clamp, lerp = h.lerp, fmt = h.fmt;
  function $(s, r) { return r.querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call(r.querySelectorAll(s)); }
  function arrowDef(id, cls) { return '<marker id="' + id + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" class="' + (cls || 'fx-head') + '"/></marker>'; }
  /* a figure made of panels, each an svg and a caption */
  function panels(box, cls, list) {
    box.classList.add('fx', cls);
    box.innerHTML = '<div class="fx-panels">' + list.map(function (p) {
      return '<div class="fx-panel"><svg viewBox="' + p.vb + '" role="img" aria-label="' + esc(p.alt) + '">' + p.svg + '</svg><p class="fx-cap">' + p.cap + '</p></div>';
    }).join('') + '</div>' + (list.key === false ? '' : '');
  }

  /* ================================================================ Lesson 3: follow a red blood cell */
  var STOPS = [
    ['Left ventricle', 'The left ventricle pumps oxygen-rich blood into the aorta at high pressure.'],
    ['Aorta and arteries', 'Arteries carry oxygen-rich blood away from the heart to every organ.'],
    ['Body capillaries', 'Oxygen leaves the blood and enters the cells. Carbon dioxide enters the blood. The blood is now oxygen-poor.'],
    ['Veins and venae cavae', 'Veins carry oxygen-poor blood back toward the heart. The venae cavae empty into the right atrium.'],
    ['Right atrium', 'The right atrium receives blood from the body and passes it through the tricuspid valve.'],
    ['Right ventricle', 'The right ventricle pumps the oxygen-poor blood toward the lungs, at a low pressure.'],
    ['Pulmonary arteries', 'The pulmonary arteries carry oxygen-poor blood away from the heart. They are arteries because of the direction of flow.'],
    ['Lung capillaries', 'Oxygen enters the blood from the air sacs. Carbon dioxide leaves the blood and is breathed out. The blood is now oxygen-rich.'],
    ['Pulmonary veins', 'The pulmonary veins carry oxygen-rich blood back toward the heart. They are veins because of the direction of flow.'],
    ['Left atrium', 'The left atrium receives oxygen-rich blood from the lungs and passes it through the mitral valve to the left ventricle.']
  ];
  /* the route: [x, y, stop index or -1] */
  var ROUTE = [[329, 311, 0], [374, 311], [470, 311], [470, 400, 1], [470, 494], [410, 494], [280, 494, 2], [150, 494], [108, 494], [108, 370, 3], [108, 242], [186, 242],
    [227, 242, 4], [231, 311, 5], [262, 290], [280, 252], [280, 200, 6], [280, 150], [200, 150], [200, 112], [200, 70], [305, 70, 7], [410, 70], [452, 70], [452, 160, 8],
    [452, 242], [374, 242], [333, 242, 9], [329, 311]];
  B.circuit = function (box, o, api) {
    frame(box, 'sx-circuit');
    var id = h.uid();
    var L = [0], stopAt = [];
    for (var i = 1; i < ROUTE.length; i++) L.push(L[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]));
    ROUTE.forEach(function (p, i) { if (p[2] != null) stopAt[p[2]] = L[i]; });
    var LEN = L[L.length - 1];
    var bodyIn = L[5], bodyOut = L[7], lungIn = L[20], lungOut = L[22];
    function oxy(s) {
      s = ((s % LEN) + LEN) % LEN;
      if (s < bodyIn) return 1; if (s < bodyOut) return 1 - (s - bodyIn) / (bodyOut - bodyIn);
      if (s < lungIn) return 0; if (s < lungOut) return (s - lungIn) / (lungOut - lungIn); return 1;
    }
    function at(s) {
      s = ((s % LEN) + LEN) % LEN;
      for (var i = 1; i < L.length; i++) if (s <= L[i]) { var t = (s - L[i - 1]) / (L[i] - L[i - 1] || 1); return [lerp(ROUTE[i - 1][0], ROUTE[i][0], t), lerp(ROUTE[i - 1][1], ROUTE[i][1], t)]; }
      return [ROUTE[0][0], ROUTE[0][1]];
    }
    function mesh(x, y, w, hh, dir) {
      var s = '';
      for (var k = 0; k < 5; k++) {
        var yy = y + 14 + k * (hh - 28) / 4;
        s += '<path class="ci-cap" d="M' + x + ' ' + yy.toFixed(1) + ' C' + (x + w * 0.3) + ' ' + (yy - 10).toFixed(1) + ' ' + (x + w * 0.6) + ' ' + (yy + 10).toFixed(1) + ' ' + (x + w) + ' ' + yy.toFixed(1) + '" stroke="url(#' + id + dir + ')"/>';
      }
      return s;
    }
    box.innerHTML =
      '<div class="sx-grid">' +
      '<svg class="ci-svg" viewBox="40 0 470 560" role="img" aria-label="Double circulation: the right side of the heart sends blood to the lungs, which return it to the left side; the left side sends blood to the body, which returns it to the right side"><defs>' + cellDef(id) +
        '<linearGradient id="' + id + 'lu" x1="0" x2="1"><stop offset="0" stop-color="var(--bh-poor)"/><stop offset="1" stop-color="var(--bh-rich)"/></linearGradient>' +
        '<linearGradient id="' + id + 'bo" x1="1" x2="0"><stop offset="0" stop-color="var(--bh-rich)"/><stop offset="1" stop-color="var(--bh-poor)"/></linearGradient>' +
        '<filter id="' + id + 'f" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#13261f" flood-opacity=".18"/></filter></defs>' +
        '<g filter="url(#' + id + 'f)"><rect class="ci-organ ci-organ--lung" x="150" y="28" width="260" height="84" rx="22"/><rect class="ci-organ ci-organ--body" x="150" y="452" width="260" height="84" rx="22"/></g>' +
        mesh(160, 28, 240, 84, 'lu') + mesh(160, 452, 240, 84, 'bo') +
        '<text class="ci-lbl" x="280" y="20" text-anchor="middle">Lungs</text><text class="ci-lbl" x="280" y="554" text-anchor="middle">Body tissues</text>' +
        tube('M262 282 C262 266 280 266 280 250 V150 H200 V112', 14, 'poor') + tube('M410 70 H452 V242 H374', 14, 'rich') +
        tube('M374 311 H470 V494 H410', 16, 'rich') + tube('M150 494 H108 V242 H186', 16, 'poor') +
        '<g filter="url(#' + id + 'f)"><rect x="176" y="204" width="208" height="152" rx="34" class="ci-heart"/></g>' +
        '<rect x="186" y="214" width="82" height="56" rx="14" class="ci-ch ci-ch--poor"/><rect x="292" y="214" width="82" height="56" rx="14" class="ci-ch ci-ch--rich"/>' +
        '<rect x="186" y="276" width="90" height="70" rx="16" class="ci-ch ci-ch--poor"/><rect x="284" y="276" width="90" height="70" rx="16" class="ci-ch ci-ch--rich"/>' +
        '<text class="ci-ch-t" x="227" y="234">RA</text><text class="ci-ch-t" x="333" y="234">LA</text><text class="ci-ch-t" x="231" y="298">RV</text><text class="ci-ch-t" x="329" y="298">LV</text>' +
        '<g class="ci-amb"></g>' +
        '<g class="ci-stops">' + STOPS.map(function (s, k) { var p = at(stopAt[k]); return '<circle class="ci-stop" data-k="' + k + '" cx="' + p[0] + '" cy="' + p[1] + '" r="5"/>'; }).join('') + '</g>' +
        '<g class="ci-cell"><circle r="19" class="ci-halo"/><ellipse rx="13" ry="8" fill="url(#' + id + 'p)" class="ci-p"/><ellipse rx="13" ry="8" fill="url(#' + id + 'r)" class="ci-r"/></g>' +
      '</svg>' +
      '<div class="sx-panel">' +
        '<div class="ci-now" aria-live="polite"><p class="ci-now__k"></p><p class="ci-now__n"></p><p class="ci-now__t"></p></div>' +
        '<div class="ci-oxy"><p>Oxygen in this blood</p><div class="ci-oxy__bar"><i></i></div><p class="ci-oxy__v"></p></div>' +
        '<ol class="ci-log" aria-label="Stops visited">' + STOPS.map(function (s, k) { return '<li data-k="' + k + '">' + esc(s[0]) + '</li>'; }).join('') + '</ol>' +
      '</div></div>' +
      '<div class="sx-ctrl">' + btn('Next stop', 'sx-btn--primary ci-next') + btn('Play the trip', 'ci-play') + btn('Start again', 'ci-reset') + chip('Real blood colors', ' data-t="real"', document.documentElement.classList.contains('real-blood')) + key() + '</div>';
    var s = stopAt[0], target = s, playing = false, pause = 0, cur = 0, seen = { 0: 1 }, trip = 0;
    var cellG = $('.ci-cell', box), cr = $('.ci-r', box), cp = $('.ci-p', box);
    var amb = [], ag = $('.ci-amb', box);
    for (var k = 0; k < 18; k++) {
      var g = document.createElementNS(NS, 'g');
      g.innerHTML = '<ellipse rx="6" ry="3.6" fill="url(#' + id + 'p)"/><ellipse rx="6" ry="3.6" fill="url(#' + id + 'r)"/>';
      ag.appendChild(g); amb.push({ s: LEN * k / 18, n: g, r: g.lastChild });
    }
    function show() {
      var p = STOPS[cur];
      $('.ci-now__k', box).textContent = 'Stop ' + (cur + 1) + ' of 10';
      $('.ci-now__n', box).textContent = p[0];
      $('.ci-now__t', box).textContent = p[1];
      $$('.ci-log li', box).forEach(function (li, j) { li.classList.toggle('is-seen', !!seen[j]); li.toggleAttribute('aria-current', j === cur); });
      $$('.ci-stop', box).forEach(function (c, j) { c.classList.toggle('is-on', j === cur); });
      if (Object.keys(seen).length === 10) api.done();
    }
    function place() {
      var p = at(s), ox = oxy(s);
      cellG.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')');
      cr.style.opacity = ox.toFixed(2);
      $('.ci-oxy__bar i', box).style.width = (92 - ox * 88).toFixed(0) + '%';
      var sm = ((s % LEN) + LEN) % LEN;
      $('.ci-oxy__v', box).textContent = ox > 0.97 ? 'High: oxygen-rich' : ox < 0.03 ? 'Low: oxygen-poor' : sm < bodyOut ? 'Falling: oxygen is leaving the blood' : 'Rising: oxygen is entering the blood';
    }
    function next() {
      cur = (cur + 1) % 10; seen[cur] = 1;
      var t = Math.floor(target / LEN) * LEN + stopAt[cur];
      if (t <= target) t += LEN;
      target = t;
      show();
    }
    $('.ci-next', box).addEventListener('click', function () { playing = false; $('.ci-play', box).textContent = 'Play the trip'; next(); });
    $('.ci-play', box).addEventListener('click', function () { playing = !playing; this.textContent = playing ? 'Pause' : 'Play the trip'; pause = 0; });
    $('.ci-reset', box).addEventListener('click', function () { playing = false; $('.ci-play', box).textContent = 'Play the trip'; cur = 0; s = target = stopAt[0]; seen = { 0: 1 }; show(); place(); });
    var realChip = $('[data-t="real"]', box);
    realChip.addEventListener('click', function () { document.dispatchEvent(new CustomEvent('bio:blood', { detail: realChip.getAttribute('aria-pressed') !== 'true' })); });
    document.addEventListener('bio:blood', function (e) { realChip.setAttribute('aria-pressed', e.detail ? 'true' : 'false'); });
    show(); place();
    animate(box, function (dt) {
      if (s < target) { s = Math.min(target, s + dt * 230); place(); if (s >= target) pause = 0; }
      else if (playing) { pause += dt; if (pause > 0.9) next(); }
      if (!h.reduced) amb.forEach(function (a) {
        a.s = (a.s + dt * 60) % LEN;
        var p = at(a.s), inHeart = p[0] > 180 && p[0] < 380 && p[1] > 208 && p[1] < 352;
        a.n.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')'); a.r.style.opacity = oxy(a.s).toFixed(2);
        a.n.style.display = inHeart ? 'none' : '';
      });
    });
  };

  /* four models of the path of blood (a still figure) */
  B.models = function (box) {
    function M(lab, svg, cap) { return { vb: '0 0 230 236', alt: 'Model ' + lab + ': ' + cap, svg: svg, cap: '<b>Model ' + lab + '.</b> ' + cap }; }
    var defs = '<defs>' + arrowDef('ma', 'fx-head') + '</defs>';
    function org(y, t) { return '<rect class="fx-organ" x="52" y="' + y + '" width="126" height="40" rx="12"/><text class="fx-t" x="115" y="' + (y + 25) + '" text-anchor="middle">' + t + '</text>'; }
    var lungs = org(10, 'Lungs'), body = org(186, 'Body');
    function heart(split) {
      return '<rect class="fx-heart" x="70" y="96" width="90" height="46" rx="14"/>' + (split ? '<line class="fx-sep" x1="115" x2="115" y1="100" y2="138"/><text class="fx-t fx-t--w" x="92" y="124" text-anchor="middle">R</text><text class="fx-t fx-t--w" x="138" y="124" text-anchor="middle">L</text>' :
        '<text class="fx-t fx-t--w" x="115" y="124" text-anchor="middle">Heart</text>');
    }
    function a(d) { return '<path class="fx-arrow" d="' + d + '" marker-end="url(#ma)"/>'; }
    var list = [
      M('A', defs + lungs + body + heart(false) + a('M90 96 V54') + a('M178 30 H206 V206 H182') + a('M140 186 V146'), 'One loop: heart → lungs → body → heart.'),
      M('B', defs + lungs + body + heart(true) + a('M80 96 V54') + a('M104 50 V92') + a('M126 142 V182') + a('M150 186 V146'), 'Two separate loops: one side of the heart and the lungs; the other side and the body.'),
      M('C', defs + lungs + body + heart(true) + a('M84 96 V54') + a('M178 30 H206 V118 H164') + a('M146 142 V182') + a('M52 206 H24 V118 H66'), 'A figure eight: right side → lungs → left side → body → right side.'),
      M('D', defs + lungs + body + heart(false) + a('M100 96 V54') + a('M130 142 V182') + '<path class="fx-arrow fx-arrow--dash" d="M196 160 H170 V132 H164" marker-end="url(#ma)"/><text class="fx-s" x="200" y="176" text-anchor="middle">new</text><text class="fx-s" x="200" y="190" text-anchor="middle">blood</text>',
        'Heart → lungs and heart → body, where the blood is used up. New blood is made to replace it.')
    ];
    panels(box, 'fx-models', list);
  };

  /* hearts of four vertebrate groups (a still figure) */
  B.vertebrates = function (box) {
    var defs = '<defs>' + arrowDef('vr', 'fx-head fx-head--rich') + arrowDef('vp', 'fx-head fx-head--poor') + arrowDef('vm', 'fx-head fx-head--mix') + '</defs>';
    function org(y, t) { return '<rect class="fx-organ" x="56" y="' + y + '" width="118" height="38" rx="12"/><text class="fx-t" x="115" y="' + (y + 24) + '" text-anchor="middle">' + t + '</text>'; }
    function ch(x, y, w, hh, cls, t) { return '<rect class="fx-ch fx-ch--' + cls + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="10"/><text class="fx-t fx-t--w" x="' + (x + w / 2) + '" y="' + (y + hh / 2 + 5) + '" text-anchor="middle">' + t + '</text>'; }
    function a(d, k) { return '<path class="fx-arrow fx-arrow--' + k + '" d="' + d + '" marker-end="url(#v' + k.charAt(0) + ')"/>'; }
    var top = 10, bot = 196;
    var fish = defs + org(top, 'Gills') + org(bot, 'Body') + ch(64, 102, 46, 40, 'poor', 'A') + ch(120, 102, 46, 40, 'poor', 'V') +
      a('M110 122 H118', 'poor') + a('M143 102 V52', 'poor') + a('M174 29 H204 V214 H178', 'rich') + a('M56 214 H28 V122 H62', 'poor');
    var frog = defs + org(top, 'Lungs') + org(bot, 'Body') + ch(64, 92, 44, 32, 'poor', 'A') + ch(122, 92, 44, 32, 'rich', 'A') + ch(78, 130, 74, 34, 'mix', 'V') +
      a('M115 130 V52', 'mix') + a('M174 29 H204 V108 H170', 'rich') + a('M134 164 V190', 'mix') + a('M56 214 H28 V108 H60', 'poor');
    var rep = defs + org(top, 'Lungs') + org(bot, 'Body') + ch(64, 92, 44, 32, 'poor', 'A') + ch(122, 92, 44, 32, 'rich', 'A') +
      '<rect class="fx-ch fx-ch--poor" x="78" y="130" width="37" height="34" rx="10"/><rect class="fx-ch fx-ch--rich" x="115" y="130" width="37" height="34" rx="10"/><line class="fx-sep" x1="115" x2="115" y1="138" y2="164"/>' +
      '<text class="fx-t fx-t--w" x="115" y="152" text-anchor="middle">V</text>' +
      a('M106 136 C106 126 115 124 115 114 V52', 'poor') + a('M174 29 H204 V108 H170', 'rich') + a('M138 164 V190', 'rich') + a('M56 214 H28 V108 H60', 'poor');
    var mam = defs + org(top, 'Lungs') + org(bot, 'Body') + ch(64, 92, 46, 32, 'poor', 'A') + ch(120, 92, 46, 32, 'rich', 'A') + ch(64, 130, 46, 34, 'poor', 'V') + ch(120, 130, 46, 34, 'rich', 'V') +
      a('M104 140 C104 128 115 126 115 116 V52', 'poor') + a('M174 29 H204 V108 H170', 'rich') + a('M150 164 V190', 'rich') + a('M56 214 H28 V108 H60', 'poor');
    panels(box, 'fx-vert', [
      { vb: '0 0 230 244', alt: 'Fish heart: one atrium and one ventricle; blood goes heart, gills, body, heart', svg: fish, cap: '<b>Fish.</b> Two chambers. Blood passes through the heart once per trip (single circulation).' },
      { vb: '0 0 230 244', alt: 'Amphibian heart: two atria and one ventricle where blood mixes', svg: frog, cap: '<b>Amphibians.</b> Three chambers. Both kinds of blood enter one ventricle and partly mix.' },
      { vb: '0 0 230 244', alt: 'Reptile heart: two atria and a partly divided ventricle', svg: rep, cap: '<b>Most reptiles.</b> Three chambers, but the ventricle is partly divided, so there is less mixing.' },
      { vb: '0 0 230 244', alt: 'Bird and mammal heart: four chambers, fully separate sides', svg: mam, cap: '<b>Birds and mammals.</b> Four chambers. The two sides are fully separate, so the two kinds of blood never mix.' }
    ]);
    box.insertAdjacentHTML('beforeend', '<p class="fx-key">' + key().replace(/^<p class="sx-key">|<\/p>$/g, '') + '<span><i class="bh-sw bh-sw--mix" aria-hidden="true"></i>Mixed</span></p>');
  };

  /* three vessels cut across (a still figure) */
  B.walls = function (box) {
    var id = h.uid();
    var defs = '<defs><radialGradient id="' + id + 'l" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="var(--bh-rich-hi)"/><stop offset="1" stop-color="var(--bh-rich-lo)"/></radialGradient>' +
      '<radialGradient id="' + id + 'v" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="var(--bh-poor-hi)"/><stop offset="1" stop-color="var(--bh-poor-lo)"/></radialGradient></defs>';
    var elastic = ''; for (var k = 0; k < 3; k++) elastic += '<circle cx="110" cy="104" r="' + (44 + k * 7) + '" class="fx-elastic"/>';
    var artery = defs + '<ellipse cx="118" cy="112" rx="84" ry="84" class="fx-depth"/><circle cx="110" cy="104" r="82" class="fx-outer"/><circle cx="110" cy="104" r="66" class="fx-muscle"/>' + elastic +
      '<circle cx="110" cy="104" r="38" class="fx-lining"/><circle cx="110" cy="104" r="33" fill="url(#' + id + 'l)"/>' +
      '';
    var cells = '';
    for (var c = 0; c < 4; c++) { var a0 = c * Math.PI / 2 + 0.2; cells += '<circle cx="' + (110 + Math.cos(a0) * 58).toFixed(1) + '" cy="' + (104 + Math.sin(a0) * 58).toFixed(1) + '" r="5" class="fx-nuc"/>'; }
    var cap = defs + '<circle cx="116" cy="110" r="64" class="fx-depth"/><circle cx="110" cy="104" r="64" class="fx-endo"/><circle cx="110" cy="104" r="52" fill="url(#' + id + 'l)"/>' + cells +
      '<ellipse cx="110" cy="104" rx="30" ry="22" class="fx-rbc"/><ellipse cx="110" cy="104" rx="14" ry="9" class="fx-rbc-c"/>' +
      '';
    var vein = defs + '<ellipse cx="118" cy="112" rx="92" ry="60" class="fx-depth"/><ellipse cx="110" cy="104" rx="92" ry="60" class="fx-outer"/><ellipse cx="110" cy="104" rx="82" ry="51" class="fx-muscle fx-muscle--thin"/>' +
      '<ellipse cx="110" cy="104" rx="76" ry="45" class="fx-lining"/><ellipse cx="110" cy="104" rx="72" ry="41" fill="url(#' + id + 'v)"/>' +
      '';
    panels(box, 'fx-walls', [
      { vb: '0 0 220 220', alt: 'An artery cut across: a thick wall with an outer layer, a thick layer of muscle and elastic fibers, and a smooth lining around a small round opening', svg: artery, cap: '<b>Artery.</b> An outer layer, a thick layer of smooth muscle and elastic fibers (dashed), and a smooth lining around a small, round opening.' },
      { vb: '0 0 220 220', alt: 'A capillary cut across: a wall made of a single layer of thin cells, with one red blood cell inside', svg: cap, cap: '<b>Capillary.</b> A wall of one layer of thin cells, drawn much larger than its real size. Red blood cells pass through in single file.' },
      { vb: '0 0 220 220', alt: 'A vein cut across: a thin wall around a wide, flattened opening', svg: vein, cap: '<b>Vein.</b> A thinner wall with less muscle, and a wide, often flattened opening. Many veins have valves.' }
    ]);
  };

  /* gas exchange in a lung capillary and a body capillary (a still figure) */
  B.exchange = function (box) {
    var id = h.uid();
    var defs = '<defs><linearGradient id="' + id + 'a" gradientUnits="userSpaceOnUse" x1="14" x2="246" y1="0" y2="0"><stop offset="0" stop-color="var(--bh-poor)"/><stop offset="1" stop-color="var(--bh-rich)"/></linearGradient>' +
      '<linearGradient id="' + id + 'b" gradientUnits="userSpaceOnUse" x1="14" x2="246" y1="0" y2="0"><stop offset="0" stop-color="var(--bh-rich)"/><stop offset="1" stop-color="var(--bh-poor)"/></linearGradient>' +
      arrowDef(id + 'm', 'fx-head') + arrowDef(id + 'f', 'fx-head') + '</defs>';
    function cap(y, grad) { return '<path d="M14 ' + y + ' H246" stroke="#7a2a24" stroke-width="42" stroke-linecap="round" opacity=".25"/><path d="M14 ' + y + ' H246" stroke="url(#' + id + grad + ')" stroke-width="36" stroke-linecap="round"/>' +
      '<path d="M40 ' + (y - 8) + ' H220" stroke="#ffffff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/><path class="fx-arrow" d="M200 ' + y + ' H236" marker-end="url(#' + id + 'f)" stroke="#ffffff"/>'; }
    var lung = defs + '<circle cx="130" cy="66" r="56" class="fx-air"/><text class="fx-s" x="130" y="58" text-anchor="middle">air sac</text><text class="fx-s" x="130" y="74" text-anchor="middle">(air)</text>' + cap(170, 'a') +
      '<path class="fx-arrow fx-arrow--o2" d="M98 110 V144" marker-end="url(#' + id + 'm)"/><text class="fx-gas" x="76" y="132" text-anchor="end">O₂</text>' +
      '<path class="fx-arrow fx-arrow--co2" d="M162 146 V112" marker-end="url(#' + id + 'm)"/><text class="fx-gas" x="184" y="132">CO₂</text>' +
      '<text class="fx-s" x="130" y="216" text-anchor="middle">lung capillary</text>';
    var cellsSvg = ''; for (var c = 0; c < 4; c++) cellsSvg += '<rect x="' + (18 + c * 58) + '" y="150" width="52" height="46" rx="10" class="fx-cell"/><circle cx="' + (44 + c * 58) + '" cy="173" r="7" class="fx-nuc"/>';
    var body = defs + cap(66, 'b') + cellsSvg +
      '<path class="fx-arrow fx-arrow--o2" d="M98 88 V140" marker-end="url(#' + id + 'm)"/><text class="fx-gas" x="76" y="122" text-anchor="end">O₂</text>' +
      '<path class="fx-arrow fx-arrow--co2" d="M162 140 V90" marker-end="url(#' + id + 'm)"/><text class="fx-gas" x="184" y="122">CO₂</text>' +
      '<text class="fx-s" x="130" y="20" text-anchor="middle">body capillary</text><text class="fx-s" x="130" y="216" text-anchor="middle">body cells</text>';
    panels(box, 'fx-exchange', [
      { vb: '0 0 260 224', alt: 'In the lungs, oxygen diffuses from the air sac into the capillary and carbon dioxide diffuses out; the blood changes from oxygen-poor to oxygen-rich', svg: lung, cap: '<b>In the lungs,</b> oxygen enters the blood and carbon dioxide leaves it.' },
      { vb: '0 0 260 224', alt: 'In the body, oxygen diffuses from the capillary into the cells and carbon dioxide diffuses into the blood; the blood changes from oxygen-rich to oxygen-poor', svg: body, cap: '<b>In the body,</b> oxygen leaves the blood and carbon dioxide enters it.' }
    ]);
  };

  /* why veins look blue (a still figure, always in real colors) */
  B.veins = function (box) {
    var id = h.uid();
    var defs = '<defs><linearGradient id="' + id + 's" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e8bd9c"/><stop offset="1" stop-color="#d49e7b"/></linearGradient>' +
      arrowDef(id + 'r', 'fx-head fx-head--red') + arrowDef(id + 'b', 'fx-head fx-head--blue') + '</defs>';
    var see = defs + '<rect x="14" y="20" width="232" height="150" rx="22" fill="url(#' + id + 's)"/>' +
      '<path d="M24 138 C80 84 120 146 162 98 S226 82 238 70" fill="none" stroke="#7d93a8" stroke-width="10" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M120 112 C132 140 152 146 176 152" fill="none" stroke="#7d93a8" stroke-width="7" stroke-linecap="round" opacity=".75"/>';
    var why = defs + '<rect x="10" y="40" width="240" height="150" fill="#e2b293"/><rect x="10" y="40" width="240" height="28" fill="#edc6a7"/>' +
      '<ellipse cx="160" cy="150" rx="40" ry="22" fill="#7d1d2b"/><text class="fx-s" x="160" y="186" text-anchor="middle" fill="#13261f">vein (dark red blood)</text>' +
      '<path d="M56 6 L120 132" stroke="#d63b2f" stroke-width="4" marker-end="url(#' + id + 'r)"/><text class="fx-s" x="40" y="22" fill="#b5281f">red light</text>' +
      '<path d="M124 132 L150 140" stroke="#d63b2f" stroke-width="3" stroke-dasharray="4 4"/>' +
      '<path d="M206 6 L190 58 L176 10" fill="none" stroke="#3a64b5" stroke-width="4" marker-end="url(#' + id + 'b)"/><text class="fx-s" x="218" y="22" fill="#2b4f99">blue light</text>';
    var tubes = '<defs><linearGradient id="' + id + 'g" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".5" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity=".3"/></linearGradient></defs>' +
      '<rect x="58" y="40" width="52" height="120" rx="14" fill="#e2312c"/><rect x="58" y="40" width="52" height="120" rx="14" fill="url(#' + id + 'g)"/><rect x="54" y="26" width="60" height="20" rx="6" fill="#7b8a84"/>' +
      '<rect x="150" y="40" width="52" height="120" rx="14" fill="#7d1d2b"/><rect x="150" y="40" width="52" height="120" rx="14" fill="url(#' + id + 'g)"/><rect x="146" y="26" width="60" height="20" rx="6" fill="#7b8a84"/>' +
      '<text class="fx-s" x="84" y="182" text-anchor="middle">oxygen-rich:</text><text class="fx-s" x="84" y="198" text-anchor="middle">bright red</text>' +
      '<text class="fx-s" x="176" y="182" text-anchor="middle">oxygen-poor:</text><text class="fx-s" x="176" y="198" text-anchor="middle">dark red</text>';
    panels(box, 'fx-veins', [
      { vb: '0 0 260 190', alt: 'Veins seen through the skin look bluish', svg: see, cap: '<b>What you see.</b> Through the skin, veins look bluish.' },
      { vb: '0 0 260 200', alt: 'Red light goes deep into the skin and much of it is absorbed by the blood in the vein; blue light is reflected near the surface', svg: why, cap: '<b>Why.</b> Red light reaches the vein and much of it is absorbed. Blue light comes back from near the surface.' },
      { vb: '0 0 260 210', alt: 'Two sealed tubes of blood: oxygen-rich blood is bright red and oxygen-poor blood is dark red', svg: tubes, cap: '<b>What blood looks like.</b> Always red: bright red or dark red, never blue.' }
    ]);
    box.classList.add('fx--fixed');
  };

  /* blood flow at rest and in maximal exercise (a still figure) */
  B.exercise = function (box) {
    var D = [['Skeletal muscle', 1200, 12500], ['Heart muscle', 250, 750], ['Brain', 750, 750], ['Skin', 500, 1900], ['Kidneys', 1100, 600], ['Digestive organs', 1400, 600], ['Other organs', 600, 400]];
    box.classList.add('fx', 'fx-exercise');
    function line(v, c) { return '<div class="ex-line"><span class="ex-bar ex-bar--' + c + '" style="--k:' + Math.max(0.008, v / 12500).toFixed(3) + '"></span><span class="ex-v">' + fmt(v) + '</span></div>'; }
    box.innerHTML = '<p class="fx-legend"><span><i class="fx-sw fx-sw--rest" aria-hidden="true"></i>At rest</span><span><i class="fx-sw fx-sw--ex" aria-hidden="true"></i>Maximal exercise</span></p>' +
      '<div class="ex" aria-hidden="true">' + D.map(function (d) {
        return '<div class="ex-row"><p class="ex-n">' + d[0] + '</p><div class="ex-bars">' + line(d[1], 'rest') + line(d[2], 'ex') + '</div></div>';
      }).join('') + '<div class="ex-row ex-total"><p class="ex-n">Total</p><p class="ex-n">5,800 at rest · 17,500 in maximal exercise</p></div></div>' +
      '<div class="visually-hidden"><table><caption>Blood flow to each organ in mL per minute, at rest and in maximal exercise</caption><thead><tr><th scope="col">Organ</th><th scope="col">At rest</th><th scope="col">Maximal exercise</th></tr></thead><tbody>' +
      D.map(function (d) { return '<tr><th scope="row">' + d[0] + '</th><td>' + fmt(d[1]) + '</td><td>' + fmt(d[2]) + '</td></tr>'; }).join('') +
      '<tr><th scope="row">Total</th><td>5,800</td><td>17,500</td></tr></tbody></table></div>';
  };

  /* ================================================================ Lesson 4 */

  /* measuring blood pressure with a cuff */
  var PATIENTS = [[116, 74], [132, 84], [148, 96]];
  function category(s, d) { return s >= 140 || d >= 90 ? 'in the hypertension range' : s >= 120 || d >= 80 ? 'borderline' : 'normal'; }
  B.cuff = function (box, o, api) {
    frame(box, 'sx-cuff');
    var id = h.uid(), ticks = '';
    for (var v = 0; v <= 300; v += 10) {
      var a = (-225 + v / 300 * 270) * Math.PI / 180, r1 = v % 50 ? 48 : 44;
      ticks += '<line x1="' + (440 + Math.cos(a) * r1).toFixed(1) + '" y1="' + (96 + Math.sin(a) * r1).toFixed(1) + '" x2="' + (440 + Math.cos(a) * 54).toFixed(1) + '" y2="' + (96 + Math.sin(a) * 54).toFixed(1) + '" class="cf-tk"/>';
      if (v % 50 === 0) ticks += '<text class="cf-tn" x="' + (440 + Math.cos(a) * 34).toFixed(1) + '" y="' + (100 + Math.sin(a) * 34).toFixed(1) + '" text-anchor="middle">' + v + '</text>';
    }
    box.innerHTML =
      '<div class="sx-grid">' +
      '<svg class="cf-svg" viewBox="0 0 520 330" role="img" aria-label="An upper arm with a blood pressure cuff, the artery under the cuff, a stethoscope below the cuff, and a pressure gauge with a pump bulb"><defs>' +
        '<linearGradient id="' + id + 'sk" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#efc8a8"/><stop offset=".55" stop-color="#e2ad8a"/><stop offset="1" stop-color="#c98e6c"/></linearGradient>' +
        '<linearGradient id="' + id + 'cf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5b6f85"/><stop offset=".5" stop-color="#43566b"/><stop offset="1" stop-color="#33414f"/></linearGradient>' +
        '<radialGradient id="' + id + 'g" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4ece8"/></radialGradient>' +
        '<filter id="' + id + 'f" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#13261f" flood-opacity=".2"/></filter></defs>' +
        '<path d="M8 150 C8 128 30 120 60 120 H340 C360 120 372 134 372 170 C372 206 360 220 340 220 H60 C30 220 8 212 8 190 Z" fill="url(#' + id + 'sk)" filter="url(#' + id + 'f)"/>' +
        '<rect x="8" y="162" width="364" height="16" rx="8" class="cf-art"/><rect class="cf-open" x="118" y="162" width="176" height="16" rx="3"/>' +
        '<g class="cf-cuff"><rect x="114" y="108" width="184" height="124" rx="16" fill="url(#' + id + 'cf)" filter="url(#' + id + 'f)"/>' +
          '<rect x="114" y="150" width="184" height="40" fill="#ffffff" opacity=".12"/><path d="M126 118 H286 M126 222 H286" stroke="#d7dee6" stroke-width="2" stroke-dasharray="6 6" opacity=".6"/>' +
          '<rect x="124" y="160" width="164" height="20" rx="6" class="cf-win"/><rect class="cf-win-art" x="124" y="163" width="164" height="14" rx="4"/></g>' +
        '<path d="M206 108 C206 60 300 40 386 96" fill="none" stroke="#33414f" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M386 96 C430 150 380 250 430 268" fill="none" stroke="#33414f" stroke-width="6" stroke-linecap="round"/>' +
        '<g filter="url(#' + id + 'f)"><circle cx="440" cy="96" r="62" fill="#2f3b47"/><circle cx="440" cy="96" r="56" fill="url(#' + id + 'g)"/></g>' + ticks +
        '<text class="cf-unit" x="440" y="134" text-anchor="middle">mm Hg</text><line class="cf-needle" x1="440" y1="96" x2="440" y2="50"/><circle cx="440" cy="96" r="5" fill="#2f3b47"/>' +
        '<ellipse cx="452" cy="288" rx="40" ry="28" fill="#33414f" filter="url(#' + id + 'f)"/><ellipse cx="440" cy="280" rx="14" ry="8" fill="#ffffff" opacity=".18"/>' +
        '<g class="cf-steth"><circle cx="328" cy="238" r="20" fill="#9aa7b1"/><circle cx="328" cy="238" r="14" fill="#d8dfe4"/><path d="M328 258 C330 300 260 304 250 324" fill="none" stroke="#33414f" stroke-width="5"/>' +
          '<circle class="cf-ring" cx="328" cy="238" r="20"/><circle class="cf-ring cf-ring--2" cx="328" cy="238" r="20"/></g>' +
      '</svg>' +
      '<div class="sx-panel">' +
        '<dl class="sx-read cf-read"><div><dt>Cuff pressure</dt><dd><b class="cf-p">0</b> mm Hg</dd></div><div><dt>Stethoscope</dt><dd class="cf-hear">silent</dd></div></dl>' +
        '<div class="sx-ctrl sx-ctrl--in">' + btn('Pump the cuff to 180', 'sx-btn--primary cf-pump') + btn('Open the valve', 'cf-valve') + '</div>' +
        '<div class="sx-ctrl sx-ctrl--in">' + btn('Sounds start here', 'cf-s') + btn('Sounds stop here', 'cf-d') + '</div>' +
        '<dl class="sx-read"><div><dt>Your reading</dt><dd class="cf-mine">— / — mm Hg</dd></div><div><dt>Patient</dt><dd class="cf-pat">1 of 3</dd></div></dl>' +
        '<div class="sx-ctrl sx-ctrl--in">' + btn('Check my reading', 'cf-check') + btn('Next patient', 'cf-next') + chip('Sound', ' data-t="snd"', false) + '</div>' +
        '<p class="cf-fb" aria-live="polite">Pump the cuff up, open the valve, and watch and listen at the stethoscope.</p>' +
      '</div></div>';
    var P = 0, Pt = 0, valve = false, pi = 0, gs = null, gd = null, snd = false, beatT = 0, open = 1, tapT = 9;
    var needle = $('.cf-needle', box), op = $('.cf-open', box), win = $('.cf-win-art', box), hear = $('.cf-hear', box), rings = $$('.cf-ring', box);
    function pat() { return PATIENTS[pi]; }
    function readout() { $('.cf-mine', box).textContent = (gs == null ? '—' : gs) + ' / ' + (gd == null ? '—' : gd) + ' mm Hg'; $('.cf-pat', box).textContent = (pi + 1) + ' of 3'; }
    function fb(t, tone) { var n = $('.cf-fb', box); n.innerHTML = t; n.setAttribute('data-tone', tone || ''); }
    $('.cf-pump', box).addEventListener('click', function () { Pt = 180; valve = false; $('.cf-valve', box).textContent = 'Open the valve'; fb('The cuff is pumped up. Now open the valve and let the pressure fall slowly.'); });
    $('.cf-valve', box).addEventListener('click', function () {
      if (P < 1 && Pt < 1) { fb('Pump the cuff up first.'); return; }
      valve = !valve; this.textContent = valve ? 'Close the valve' : 'Open the valve'; Pt = P;
    });
    $('.cf-s', box).addEventListener('click', function () { gs = Math.round(P); readout(); });
    $('.cf-d', box).addEventListener('click', function () { gd = Math.round(P); readout(); });
    $('.cf-check', box).addEventListener('click', function () {
      var p = pat();
      if (gs == null || gd == null) { fb('Record where the sounds start and where they stop first.', 'note'); return; }
      var okS = Math.abs(gs - p[0]) <= 6, okD = Math.abs(gd - p[1]) <= 6;
      if (okS && okD) {
        fb('<strong>Good reading.</strong> The true pressure is ' + p[0] + '/' + p[1] + ' mm Hg, which is ' + category(p[0], p[1]) + '. ' + (pi < 2 ? 'Try the next patient.' : 'You have measured all three patients.'), 'right');
        api.done();
      } else {
        var t = [];
        if (!okS) t.push(gs > p[0] ? 'You marked the start of the sounds too early: they begin a little lower.' : 'You marked the start of the sounds too late: they begin a little higher.');
        if (!okD) t.push(gd > p[1] ? 'You marked the end of the sounds too early: they continue a little lower.' : 'You marked the end of the sounds too late: they stop a little higher.');
        fb('<strong>Not quite.</strong> ' + t.join(' ') + ' Pump the cuff up and measure again.', 'wrong');
      }
    });
    $('.cf-next', box).addEventListener('click', function () { pi = (pi + 1) % 3; gs = gd = null; Pt = 0; valve = false; $('.cf-valve', box).textContent = 'Open the valve'; readout(); fb('Patient ' + (pi + 1) + '. Pump the cuff up and measure.'); });
    $('[data-t="snd"]', box).addEventListener('click', function () { snd = !snd; this.setAttribute('aria-pressed', snd ? 'true' : 'false'); if (snd) thump(110, 0.06, 0.2); });
    function draw(dt) {
      if (valve) { Pt = Math.max(0, Pt - dt * 4); if (Pt <= 0) { valve = false; $('.cf-valve', box).textContent = 'Open the valve'; } }
      P += (Pt - P) * Math.min(1, dt * (Pt > P ? 3 : 12));
      if (Math.abs(Pt - P) < 0.05) P = Pt;
      var a = (-225 + P / 300 * 270) * Math.PI / 180;
      needle.setAttribute('x2', (440 + Math.cos(a) * 46).toFixed(1)); needle.setAttribute('y2', (96 + Math.sin(a) * 46).toFixed(1));
      $('.cf-p', box).textContent = Math.round(P);
      var p = pat(), zone = P >= p[0] ? 0 : P > p[1] ? 1 : 2;
      beatT += dt; tapT += dt;
      if (beatT >= 0.8) {
        beatT -= 0.8;
        if (zone === 1) { tapT = 0; if (snd) thump(120, 0.07, 0.6); }
      }
      /* the artery under the cuff: shut, opening in spurts, or open */
      var target = zone === 0 ? 0 : zone === 2 ? 1 : (tapT < 0.18 ? 0.8 : 0.08);
      open += (target - open) * Math.min(1, dt * 18);
      if (P < 1) open = 1;
      op.setAttribute('height', (16 * open).toFixed(1)); op.setAttribute('y', (170 - 8 * open).toFixed(1));
      win.setAttribute('height', (14 * open).toFixed(1)); win.setAttribute('y', (170 - 7 * open).toFixed(1));
      var tapping = zone === 1 && P > 1;
      hear.textContent = tapping ? (tapT < 0.3 ? 'tap!' : 'tap … tap …') : 'silent';
      hear.classList.toggle('is-tap', tapping && tapT < 0.3);
      rings.forEach(function (r, i) { var t = tapT - i * 0.12, on = tapping && t >= 0 && t < 0.5; r.style.opacity = on ? (1 - t / 0.5).toFixed(2) : '0'; r.setAttribute('r', on ? (20 + t * 70).toFixed(1) : '20'); });
    }
    readout();
    animate(box, function (dt) { draw(dt); });
  };

  /* the Blood Pressure Lab */
  var VARS = { hr: ['Heart rate', 50, 120, 5, 75, ' beats per minute'], d: ['Arteriole diameter', 85, 115, 1, 100, '% of normal'], bv: ['Blood volume', 4, 6, 0.1, 5, ' L'] };
  B.bplab = function (box, o, api) {
    frame(box, 'sx-bplab');
    var id = h.uid(), ticks = '';
    for (var v = 40; v <= 200; v += 20) {
      var a = (-210 + (v - 40) / 160 * 240) * Math.PI / 180;
      ticks += '<line x1="' + (300 + Math.cos(a) * 40).toFixed(1) + '" y1="' + (66 + Math.sin(a) * 40).toFixed(1) + '" x2="' + (300 + Math.cos(a) * 47).toFixed(1) + '" y2="' + (66 + Math.sin(a) * 47).toFixed(1) + '" class="cf-tk"/>';
      if (v % 40 === 0) ticks += '<text class="cf-tn" x="' + (300 + Math.cos(a) * 29).toFixed(1) + '" y="' + (70 + Math.sin(a) * 29).toFixed(1) + '" text-anchor="middle">' + v + '</text>';
    }
    var band = '';
    [[70, 110]].forEach(function (r) {
      var a1 = (-210 + (r[0] - 40) / 160 * 240) * Math.PI / 180, a2 = (-210 + (r[1] - 40) / 160 * 240) * Math.PI / 180;
      band = '<path d="M' + (300 + Math.cos(a1) * 50).toFixed(1) + ' ' + (66 + Math.sin(a1) * 50).toFixed(1) + ' A50 50 0 0 1 ' + (300 + Math.cos(a2) * 50).toFixed(1) + ' ' + (66 + Math.sin(a2) * 50).toFixed(1) + '" class="bp-band"/>';
    });
    box.innerHTML =
      '<svg class="bp-svg" viewBox="0 0 600 250" role="img" aria-label="The heart pumps blood into the arteries, which empty through the arterioles; a gauge shows the mean arterial pressure"><defs>' + cellDef(id) +
        '<radialGradient id="' + id + 'h" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#e5736a"/><stop offset="1" stop-color="#9c2f2a"/></radialGradient>' +
        '<radialGradient id="' + id + 'g" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4ece8"/></radialGradient>' +
        '<filter id="' + id + 'f" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#13261f" flood-opacity=".18"/></filter></defs>' +
        '<g class="bp-vein">' + tube('M532 200 H150', 22, 'poor') + '</g>' +
        tube('M130 120 H420', 30, 'rich') +
        '<g class="bp-arts"></g>' +
        '<path d="M532 66 C566 66 566 200 532 200" class="bp-cap"/>' +
        '<g class="bp-heart" filter="url(#' + id + 'f)"><path d="M86 96 c-34 -32 -82 6 -52 54 l52 46 l52 -46 c30 -48 -18 -86 -52 -54 z" fill="url(#' + id + 'h)"/></g>' +
        '<g filter="url(#' + id + 'f)"><circle cx="300" cy="66" r="56" fill="#2f3b47"/><circle cx="300" cy="66" r="51" fill="url(#' + id + 'g)"/></g>' + band + ticks +
        '<line class="cf-needle bp-needle" x1="300" y1="66" x2="300" y2="26"/><circle cx="300" cy="66" r="5" fill="#2f3b47"/>' +
        '<text class="bp-t" x="86" y="230" text-anchor="middle">heart</text><text class="bp-t" x="300" y="146" text-anchor="middle">arteries</text><text class="bp-t" x="476" y="34" text-anchor="middle">arterioles</text><text class="bp-t" x="340" y="238" text-anchor="middle">veins: the blood returns to the heart</text>' +
      '</svg>' +
      '<div class="sx-grid sx-grid--even">' +
        '<div class="sx-panel">' + seg('Change one variable', [['hr', 'Heart rate'], ['d', 'Arteriole diameter'], ['bv', 'Blood volume']], 'hr') + '<div class="bp-slider"></div>' + btn('Back to normal', 'bp-reset') + '</div>' +
        '<div class="sx-panel"><dl class="sx-read sx-read--3"><div><dt>Cardiac output</dt><dd><b class="bp-co">5.25</b> L/min</dd></div><div><dt>Resistance</dt><dd><b class="bp-r">1.00</b> × normal</dd></div><div><dt>Mean arterial pressure</dt><dd><b class="bp-map">93</b> mm Hg</dd></div></dl>' +
          '<p class="bp-status" aria-live="polite"></p></div>' +
      '</div>';
    var cur = 'hr', used = {}, val = { hr: 75, d: 100, bv: 5 }, beat = 0;
    var arts = '';
    for (var k = 0; k < 5; k++) arts += '<path class="bp-art" data-k="' + k + '" d="M420 120 C450 120 470 ' + (60 + k * 30) + ' 520 ' + (60 + k * 30) + '"/>';
    $('.bp-arts', box).innerHTML = arts;
    function build() {
      var c = VARS[cur];
      $('.bp-slider', box).innerHTML = range('x', c[0], c[1], c[2], c[3], val[cur], c[5]);
      $$('.sx-seg button', box).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === cur ? 'true' : 'false'); });
      $('[data-r="x"]', box).addEventListener('input', function () { val[cur] = +this.value; used[cur] = 1; upd(); if (Object.keys(used).length === 3) api.done(); });
      upd();
    }
    function upd() {
      var hr = val.hr, d = val.d, bv = val.bv, x = val[cur], c = VARS[cur];
      $('[data-o="x"]', box).textContent = (cur === 'bv' ? x.toFixed(1) : x) + c[5];
      var sv = 70 * bv / 5, co = hr * sv / 1000, r = 1 / Math.pow(d / 100, 4), map = 93.3 * co / 5.25 * r;
      $('.bp-co', box).textContent = co.toFixed(2); $('.bp-r', box).textContent = r.toFixed(2); $('.bp-map', box).textContent = Math.round(map);
      var a = (-210 + (clamp(map, 40, 200) - 40) / 160 * 240) * Math.PI / 180;
      $('.bp-needle', box).setAttribute('x2', (300 + Math.cos(a) * 42).toFixed(1)); $('.bp-needle', box).setAttribute('y2', (66 + Math.sin(a) * 42).toFixed(1));
      $$('.bp-art', box).forEach(function (p) { p.setAttribute('stroke-width', (9 * Math.pow(d / 100, 1.6)).toFixed(1)); });
      $('.bp-vein', box).style.transform = 'scaleY(' + (0.6 + 0.4 * bv / 5).toFixed(2) + ')';
      var base = x === c[4], up = map > 93.4, t;
      if (base) t = '<strong>Normal values.</strong> Heart rate 75 beats per minute, stroke volume 70 mL, normal arteriole diameter, 5 L of blood.';
      else if (cur === 'hr') t = '<strong>Heart rate ' + (up ? 'up' : 'down') + '.</strong> The heart pumps ' + (up ? 'more' : 'less') + ' blood each minute into the same vessels, so the pressure ' + (up ? 'rises' : 'falls') + '.';
      else if (cur === 'd') t = '<strong>Arterioles ' + (up ? 'narrower' : 'wider') + '.</strong> The heart pumps exactly the same amount, but the resistance is ' + (up ? 'higher' : 'lower') + ', so the pressure ' + (up ? 'rises' : 'falls') + '. A small change in diameter gives a large change in pressure.';
      else t = '<strong>Blood volume ' + (up ? 'up' : 'down') + '.</strong> ' + (up ? 'More' : 'Less') + ' blood returns to the heart, so each beat pumps ' + (up ? 'more' : 'less') + ' (stroke volume ' + Math.round(sv) + ' mL). Cardiac output and pressure ' + (up ? 'rise' : 'fall') + '.';
      if (map > 110 || map < 70) t += ' This is outside the usual range of about 70 to 110 mm Hg. In a real body, the baroreceptor reflex would start to correct it within seconds.';
      $('.bp-status', box).innerHTML = t;
    }
    $$('.sx-seg button', box).forEach(function (b) {
      b.addEventListener('click', function () { val = { hr: 75, d: 100, bv: 5 }; cur = b.getAttribute('data-v'); build(); });
    });
    $('.bp-reset', box).addEventListener('click', function () { val = { hr: 75, d: 100, bv: 5 }; build(); });
    build();
    var hg = $('.bp-heart', box);
    if (!h.reduced) animate(box, function (dt) {
      beat = (beat + dt * val.hr / 60) % 1;
      var s = beat < 0.3 ? 1 - 0.09 * Math.sin(beat / 0.3 * Math.PI) : 1;
      hg.setAttribute('transform', 'translate(86 140) scale(' + s.toFixed(3) + ') translate(-86 -140)');
    });
  };

  /* the baroreceptor reflex as a loop */
  var BOX = [['Change', ''], ['Sensors', 'baroreceptors in the aorta and carotid arteries'], ['Control center', 'cardiovascular center in the medulla oblongata'], ['Effectors', 'the heart and the arterioles'], ['Result', '']];
  var BTXT = {
    up: ['Blood pressure rises above its usual level. Example: a person steps into cold water, and the arterioles in the skin narrow.',
      'The walls of the aorta and the carotid arteries stretch more. The baroreceptors in these walls send signals to the brain more often.',
      'The cardiovascular center in the medulla oblongata receives more signals. It slows the heart through the vagus nerve and sends fewer signals that keep the arterioles narrow.',
      'The heart beats more slowly and less forcefully. The arterioles widen (vasodilation).',
      'Cardiac output and resistance both fall, so blood pressure drops back toward its usual level. The response has reversed the change: negative feedback.'],
    down: ['Blood pressure falls below its usual level. Example: a person stands up quickly, and blood pools in the legs for a moment.',
      'The walls of the aorta and the carotid arteries stretch less. The baroreceptors send signals to the brain less often.',
      'The cardiovascular center in the medulla oblongata receives fewer signals. It sends more signals through sympathetic nerves to the heart and the arterioles.',
      'The heart beats faster and more forcefully. The arterioles narrow (vasoconstriction).',
      'Cardiac output and resistance both rise, so blood pressure climbs back toward its usual level. The response has reversed the change: negative feedback.']
  };
  var BHEAD = { up: ['Blood pressure rises', '', '', 'Heart slows, arterioles widen', 'Blood pressure falls back'], down: ['Blood pressure falls', '', '', 'Heart speeds up, arterioles narrow', 'Blood pressure rises back'] };
  B.baro = function (box, o, api) {
    frame(box, 'sx-baro');
    box.innerHTML = seg('Start with', [['up', 'Blood pressure rises'], ['down', 'Blood pressure falls']], 'up') +
      '<div class="br-loop">' + BOX.map(function (b, i) {
        return '<button type="button" class="br-box br-box--' + i + '" data-i="' + i + '"><span class="br-n">' + (i + 1) + '</span><span class="br-tx"><span class="br-t">' + b[0] + '</span><span class="br-s"></span></span></button>';
      }).join('') +
        '<div class="br-mid" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="46" class="br-ring"/><path class="br-arc" d="M60 14 A46 46 0 1 1 14 60"/><path class="br-up" d="M60 38 L78 64 H66 V84 H54 V64 H42 Z"/></svg><p>Negative feedback: the result reverses the change.</p></div>' +
      '</div>' +
      '<div class="br-text" aria-live="polite"><p class="br-text__k"></p><p class="br-text__t"></p></div>' +
      '<div class="sx-ctrl">' + btn('Back', 'br-back') + btn('Next step', 'sx-btn--primary br-next') + '</div>';
    var sc = 'up', st = 0, seen = { up: {}, down: {} };
    function draw() {
      seen[sc][st] = 1;
      $$('.br-box', box).forEach(function (b, i) {
        b.classList.toggle('is-on', i === st); b.classList.toggle('is-seen', !!seen[sc][i]);
        b.setAttribute('aria-pressed', i === st ? 'true' : 'false');
        $('.br-s', b).textContent = BHEAD[sc][i] || BOX[i][1];
      });
      $('.br-text__k', box).textContent = 'Step ' + (st + 1) + ' of 5: ' + BOX[st][0];
      $('.br-text__t', box).textContent = BTXT[sc][st];
      $('.br-back', box).disabled = st === 0; $('.br-next', box).disabled = st === 4;
      var arrowUp = (sc === 'up') !== (st === 4);
      box.setAttribute('data-dir', arrowUp ? 'up' : 'down');
      $$('.sx-seg button', box).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === sc ? 'true' : 'false'); });
      if (Object.keys(seen.up).length === 5 && Object.keys(seen.down).length === 5) api.done();
    }
    $$('.br-box', box).forEach(function (b) { b.addEventListener('click', function () { st = +b.getAttribute('data-i'); draw(); }); });
    $('.br-next', box).addEventListener('click', function () { st = Math.min(4, st + 1); draw(); });
    $('.br-back', box).addEventListener('click', function () { st = Math.max(0, st - 1); draw(); });
    $$('.sx-seg button', box).forEach(function (b) { b.addEventListener('click', function () { sc = b.getAttribute('data-v'); st = 0; draw(); }); });
    draw();
  };
})();
