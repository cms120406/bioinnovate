/* BioInnovate simulations, part 1: the shared frame, Lesson 1 (heart, cycle, output) and Lesson 2
   (vessels, radius, pumps). Each simulation is BioSims[name](box, opts, api): it draws into box and calls
   api.done() once the student has used it enough to count. Drawing is SVG; anything that moves runs on one
   requestAnimationFrame loop that sleeps while the simulation is off screen. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var uid = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(s, r) { return r.querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call(r.querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function fmt(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  /* a 2.5D tube along path d: dark edge, body, and a highlight toward the top-left */
  function tube(d, w, kind, cls) {
    var o = (w * 0.16).toFixed(1);
    return '<g class="bh-tube bh-' + kind + (cls ? ' ' + cls : '') + '">' +
      '<path class="bh-tube__edge" d="' + d + '" stroke-width="' + (w + 3).toFixed(1) + '"/>' +
      '<path class="bh-tube__body" d="' + d + '" stroke-width="' + w.toFixed(1) + '"/>' +
      '<path class="bh-tube__shine" d="' + d + '" stroke-width="' + Math.max(1, w * 0.24).toFixed(1) + '" transform="translate(0 -' + o + ')"/></g>';
  }
  /* a red blood cell: a disc with a darker centre */
  function cellDef(id) {
    return '<radialGradient id="' + id + 'r" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="var(--bh-rich-lo)"/><stop offset=".55" stop-color="var(--bh-rich)"/><stop offset="1" stop-color="var(--bh-rich-hi)"/></radialGradient>' +
      '<radialGradient id="' + id + 'p" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="var(--bh-poor-lo)"/><stop offset=".55" stop-color="var(--bh-poor)"/><stop offset="1" stop-color="var(--bh-poor-hi)"/></radialGradient>' +
      '<filter id="' + id + 'sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#13261f" flood-opacity=".16"/></filter>';
  }
  function range(name, label, min, max, step, val, unit) {
    return '<label class="sx-range"><span class="sx-range__top"><span>' + esc(label) + '</span><output data-o="' + name + '"></output></span>' +
      '<input type="range" data-r="' + name + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" aria-label="' + esc(label) + '"' + (unit ? ' data-unit="' + esc(unit) + '"' : '') + '></label>';
  }
  /* one loop for everything that moves, paused off screen and in a hidden tab */
  function animate(box, step) {
    var on = true, last = 0, live = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { on = es[0].isIntersecting; }, { rootMargin: '80px' }).observe(box);
    function f(t) {
      if (!live) return;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      if (on && !document.hidden) step(dt, t / 1000);
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
    return { stop: function () { live = false; } };
  }
  /* simple sounds made in the browser: a soft thump for heart sounds and cuff taps */
  var AC = null;
  function thump(freq, dur, vol) {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.5, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no sound on this browser */ }
  }
  function frame(box, cls) {
    box.classList.add('sx');
    if (cls) box.classList.add(cls);
    if (box.parentNode && box.parentNode.classList) box.parentNode.classList.add('sx-host');
  }
  function btn(label, cls, attrs) { return '<button type="button" class="sx-btn' + (cls ? ' ' + cls : '') + '"' + (attrs || '') + '>' + label + '</button>'; }
  function chip(label, attrs, on) { return '<button type="button" class="sx-chip"' + (attrs || '') + ' aria-pressed="' + (on ? 'true' : 'false') + '"><span class="sx-chip__box" aria-hidden="true"></span>' + label + '</button>'; }
  function seg(name, items, cur) {
    return '<div class="sx-seg" role="group" aria-label="' + esc(name) + '">' + items.map(function (it) {
      return '<button type="button" data-v="' + it[0] + '" aria-pressed="' + (it[0] === cur ? 'true' : 'false') + '">' + esc(it[1]) + '</button>';
    }).join('') + '</div>';
  }
  function key() {
    return '<p class="sx-key"><span><i class="bh-sw bh-sw--rich" aria-hidden="true"></i>Oxygen-rich</span><span><i class="bh-sw bh-sw--poor" aria-hidden="true"></i>Oxygen-poor</span></p>';
  }

  var B = window.BioSims = window.BioSims || {};
  B._h = { tube: tube, cellDef: cellDef, range: range, animate: animate, thump: thump, frame: frame, btn: btn, chip: chip, seg: seg, key: key, esc: esc, clamp: clamp, lerp: lerp, fmt: fmt, reduced: reduced, uid: function () { return 'sx' + (++uid); } };

  /* ================================================================ Lesson 1 */

  /* the beating heart, to explore */
  B.heart = function (box, o, api) {
    box.classList.add('sim-heart');
    window.BioHeart.mount(box, { mode: 'lesson', onExplore: function (ids) { if (ids.length >= 4) api.done(); } });
  };

  /* the cardiac cycle, phase by phase */
  var PH = [
    { n: 'Ventricles fill', atria: 'relaxed', vent: 'relaxed', av: 'open', sl: 'closed',
      t: 'The whole heart is relaxed. Blood flows from the veins through the atria and the open atrioventricular valves into the ventricles. Most of the filling happens now.' },
    { n: 'Atria contract', atria: 'contract', vent: 'relaxed', av: 'open', sl: 'closed',
      t: 'The SA node fires and the atria squeeze. They push the last 20 to 30 percent of the filling into the ventricles.' },
    { n: 'Ventricles begin to contract', atria: 'relax', vent: 'contract', av: 'closed (lub)', sl: 'closed',
      t: 'Pressure in the ventricles rises above the pressure in the atria, so the atrioventricular valves are pushed shut: “lub”. All four valves are closed, so no blood moves yet.' },
    { n: 'Ventricles pump blood out', atria: 'relaxed, filling', vent: 'contract', av: 'closed', sl: 'open',
      t: 'Pressure in the ventricles is now higher than in the arteries. The semilunar valves open and about 70 mL leaves each ventricle.' },
    { n: 'Ventricles relax', atria: 'relaxed, filling', vent: 'relax', av: 'closed', sl: 'closed (dub)',
      t: 'Pressure in the ventricles falls below the pressure in the arteries, so the semilunar valves are pushed shut: “dub”. All four valves stay closed until the ventricles are relaxed enough for the atrioventricular valves to open.' }
  ];
  B.cycle = function (box, o, api) {
    frame(box, 'sx-cycle');
    var id = B._h.uid(), H = window.BioHeart;
    var bands = H.PHASES.map(function (p, i) {
      return '<rect class="cy-band" data-i="' + i + '" x="' + (40 + p.u0 * 300).toFixed(1) + '" y="14" width="' + ((p.u1 - p.u0) * 300).toFixed(1) + '" height="116"/>' +
        '<text class="cy-bn" x="' + (40 + (p.u0 + p.u1) / 2 * 300).toFixed(1) + '" y="148">' + (i + 1) + '</text>';
    }).join('');
    var pts = []; for (var k = 0; k <= 100; k++) { var u = k / 100; pts.push((40 + u * 300).toFixed(1) + ' ' + (125 - (H.vVol(u) * 70 + 50 - 40) * 1.2).toFixed(1)); }
    box.innerHTML =
      '<div class="sx-grid">' +
        '<div class="cy-left"><div class="cy-heart"><div class="cy-mount"></div></div>' + '<figure class="cy-graph"><svg viewBox="0 0 350 160" role="img" aria-label="Volume of blood in the left ventricle during one beat, from about 50 mL to about 120 mL">' +
            bands + '<path class="cy-line" d="M' + pts.join(' L') + '"/>' +
            '<text class="cy-ax" x="34" y="44" text-anchor="end">120</text><text class="cy-ax" x="34" y="128" text-anchor="end">50</text>' +
            '<circle class="cy-dot" r="6" cx="40" cy="125"/></svg>' +
            '<figcaption>Left ventricle: <b class="cy-vol">50 mL</b></figcaption></figure>' + '</div>' +
        '<div class="sx-panel">' +
          '<ol class="cy-steps" aria-label="The five phases">' + PH.map(function (p, i) { return '<li><button type="button" data-k="' + i + '"><span>' + (i + 1) + '</span>' + esc(p.n) + '</button></li>'; }).join('') + '</ol>' +
          '<div class="cy-now" aria-live="polite"><p class="cy-now__n"></p><p class="cy-now__t"></p></div>' +
          '<dl class="cy-state"><div><dt>Atria</dt><dd data-s="atria"></dd></div><div><dt>Ventricles</dt><dd data-s="vent"></dd></div><div><dt>AV valves</dt><dd data-s="av"></dd></div><div><dt>Semilunar valves</dt><dd data-s="sl"></dd></div></dl>' +

        '</div>' +
      '</div>' +
      '<div class="sx-ctrl">' + btn('Next phase', 'sx-btn--primary cy-next') + btn('Play the whole beat', 'cy-play') + chip('Heart sounds', ' data-t="snd"', false) + '</div>';
    var cur = 0, seen = {}, snd = false, lastU = 0, playingAll = false;
    var dot = $('.cy-dot', box), vol = $('.cy-vol', box), steps = $$('.cy-steps button', box);
    var heart = H.mount($('.cy-mount', box), {
      mode: 'hero', bare: true,
      onPhase: function (k) { if (playingAll) setPhase(k, true); },
      onFrame: function (u) {
        var v = 50 + 70 * H.vVol(u);
        dot.setAttribute('cx', (40 + u * 300).toFixed(1)); dot.setAttribute('cy', (125 - (v - 40) * 1.2).toFixed(1));
        vol.textContent = Math.round(v) + ' mL';
        if (snd) {
          if (lastU < 0.5625 && u >= 0.5625) thump(62, 0.16, 0.7);
          if (lastU < 0.9 && u >= 0.9) thump(88, 0.12, 0.5);
        }
        lastU = u;
      },
      onStop: function () { }
    });
    function setPhase(k, fromBeat) {
      cur = k; seen[k] = 1;
      var p = PH[k];
      steps.forEach(function (b, i) { b.setAttribute('aria-current', i === k ? 'step' : 'false'); b.classList.toggle('is-seen', !!seen[i]); });
      $('.cy-now__n', box).textContent = 'Phase ' + (k + 1) + ': ' + p.n;
      $('.cy-now__t', box).textContent = p.t;
      ['atria', 'vent', 'av', 'sl'].forEach(function (s) { var dd = $('[data-s="' + s + '"]', box); dd.textContent = p[s]; dd.setAttribute('data-v', /open|contract/.test(p[s]) && !/closed/.test(p[s]) ? 'on' : 'off'); });
      $$('.cy-band', box).forEach(function (r, i) { r.classList.toggle('is-on', i === k); });
      if (Object.keys(seen).length === 5) api.done();
    }
    function go(k) { playingAll = false; $('.cy-play', box).textContent = 'Play the whole beat'; heart.period = 4; lastU = H.PHASES[k].u0; heart.playPhase(k); setPhase(k); }
    steps.forEach(function (b, i) { b.addEventListener('click', function () { go(i); }); });
    $('.cy-next', box).addEventListener('click', function () { go((cur + 1) % 5); });
    $('.cy-play', box).addEventListener('click', function () {
      playingAll = !playingAll;
      this.textContent = playingAll ? 'Pause' : 'Play the whole beat';
      heart.stopAt = null; heart.setPlay(playingAll);
    });
    $('[data-t="snd"]', box).addEventListener('click', function () {
      snd = !snd; this.setAttribute('aria-pressed', snd ? 'true' : 'false');
      if (snd) thump(62, 0.1, 0.25);
    });
    heart.showAt(0.02);
    setPhase(0);
  };

  /* cardiac output: heart rate × stroke volume */
  var PEOPLE = [['rest', 'Adult at rest', 75, 70], ['walk', 'Brisk walk', 110, 90], ['hard', 'Hard exercise', 180, 120], ['ath', 'Trained athlete at rest', 50, 105]];
  B.output = function (box, o, api) {
    frame(box, 'sx-output');
    var id = B._h.uid(), H = window.BioHeart, ticks = '';
    for (var l = 0; l <= 25; l += 5) {
      var y = 294 - l * 9.76;
      ticks += '<line class="co-tick" x1="196" x2="' + (l % 10 === 0 ? 210 : 206) + '" y1="' + y + '" y2="' + y + '"/><text class="co-tl" x="216" y="' + (y + 5) + '">' + l + ' L</text>';
    }
    box.innerHTML =
      '<div class="sx-grid">' +
        '<div class="co-left"><div class="co-heart"><div class="co-mount"></div></div>' +
          '<svg class="co-jug" viewBox="0 0 260 330" role="img" aria-label="A measuring jar that shows how much blood is pumped in one minute"><defs>' + cellDef(id) +
            '<linearGradient id="' + id + 'g" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".45"/><stop offset=".3" stop-color="#ffffff" stop-opacity=".05"/><stop offset="1" stop-color="#ffffff" stop-opacity=".3"/></linearGradient>' +
            '<linearGradient id="' + id + 'b" x1="0" x2="1"><stop offset="0" stop-color="var(--bh-rich-lo)"/><stop offset=".35" stop-color="var(--bh-rich)"/><stop offset="1" stop-color="var(--bh-rich-lo)"/></linearGradient></defs>' +
            '<ellipse cx="110" cy="306" rx="90" ry="16" fill="#13261f" opacity=".08"/>' +
            '<path d="M30 40 V292 A80 14 0 0 0 190 292 V40" fill="#ffffff" fill-opacity=".55" stroke="#9fb8ad" stroke-width="2"/>' +
            '<ellipse cx="110" cy="294" rx="79" ry="13" fill="var(--bh-rich-lo)"/><g class="co-fill" style="transform:scaleY(0.21)"><rect x="31" y="50" width="158" height="244" fill="url(#' + id + 'b)"/></g>' +
            '<ellipse class="co-top" cx="110" cy="248" rx="79" ry="13" fill="var(--bh-rich-hi)" opacity=".85"/>' +
            '<path d="M30 40 V292 A80 14 0 0 0 190 292 V40" fill="url(#' + id + 'g)" stroke="none"/>' +
            '<ellipse cx="110" cy="40" rx="80" ry="14" fill="none" stroke="#9fb8ad" stroke-width="2"/>' + ticks +
            '<text class="co-cap" x="110" y="24" text-anchor="middle">Pumped in one minute</text></svg></div>' +
        '<div class="sx-panel">' +
          '<div class="co-people" role="group" aria-label="Pick a person">' + PEOPLE.map(function (p) { return '<button type="button" class="sx-pill" data-p="' + p[0] + '" aria-pressed="false">' + esc(p[1]) + '</button>'; }).join('') + '</div>' +
          range('hr', 'Heart rate', 40, 200, 1, 75, 'beats per minute') + range('sv', 'Stroke volume', 40, 160, 5, 70, 'mL per beat') +
          '<div class="co-out" aria-live="polite"><p class="co-out__k">Cardiac output</p><p class="co-out__v"><b class="co-l">5.25</b> L per minute</p><p class="co-out__f"></p><p class="co-out__n"></p></div>' +
        '</div>' +
      '</div>';
    var heart = H.mount($('.co-mount', box), { mode: 'hero', bare: true, speed: 'real' });
    var hr = $('[data-r="hr"]', box), sv = $('[data-r="sv"]', box), fill = $('.co-fill', box), top = $('.co-top', box), uses = 0;
    function upd(touch) {
      var r = +hr.value, s = +sv.value, co = r * s / 1000;
      $('[data-o="hr"]', box).textContent = r + ' beats per minute';
      $('[data-o="sv"]', box).textContent = s + ' mL';
      $('.co-l', box).textContent = co.toFixed(2);
      $('.co-out__f', box).textContent = r + ' × ' + s + ' mL = ' + fmt(r * s) + ' mL per minute';
      var times = co / 5.25;
      $('.co-out__n', box).textContent = Math.abs(times - 1) < 0.04 ? 'About the resting value.' : 'About ' + (times >= 1 ? times.toFixed(1) + ' times' : Math.round(times * 100) + '% of') + ' the resting value of 5.25 L.';
      var k = clamp(co / 25, 0, 1);
      fill.style.transform = 'scaleY(' + k.toFixed(3) + ')';
      top.style.transform = 'translateY(' + (46 - 244 * k).toFixed(1) + 'px)';
      heart.setRate(r);
      PEOPLE.forEach(function (p) { var b = $('[data-p="' + p[0] + '"]', box); b.setAttribute('aria-pressed', p[2] === r && p[3] === s ? 'true' : 'false'); });
      if (touch && ++uses >= 3) api.done();
    }
    hr.addEventListener('input', function () { upd(true); });
    sv.addEventListener('input', function () { upd(true); });
    $$('[data-p]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = PEOPLE.filter(function (q) { return q[0] === b.getAttribute('data-p'); })[0];
        hr.value = p[2]; sv.value = p[3]; upd(true);
      });
    });
    upd(false);
  };

  /* ================================================================ Lesson 2 */

  /* pressure, speed and total area along the route */
  var VES = [
    { n: 'Aorta', p: '120/80 mm Hg, rising and falling with each beat', v: 'about 30 cm per second, the fastest', a: 'the smallest: one vessel',
      t: 'The whole output of the left ventricle passes through this one vessel, so the blood moves fastest here. The pressure is highest and pulses with every beat.' },
    { n: 'Arteries', p: 'still about 120/80 mm Hg, with a pulse', v: 'fast, slowing a little', a: 'growing as the arteries branch',
      t: 'Pressure is still high and still pulses. This is the pulse you feel at your wrist. As arteries branch, their total cross-sectional area grows.' },
    { n: 'Arterioles', p: 'falls steeply, from about 85 to about 35 mm Hg', v: 'slowing sharply', a: 'much larger than the arteries',
      t: 'Pressure drops most steeply here. Arterioles are narrow and muscular, so they give the most resistance. By narrowing or widening, they control how much blood enters each capillary bed.' },
    { n: 'Capillaries', p: 'about 35 mm Hg at the start, about 15 at the end, with no pulse', v: 'about 0.026 cm per second, the slowest', a: 'the largest of all',
      t: 'There are so many capillaries that their total area is the largest of all, so the blood moves slowest here. That gives time for exchange with the cells.' },
    { n: 'Venules', p: 'about 15 mm Hg', v: 'speeding up a little', a: 'smaller again as capillaries join',
      t: 'Capillaries join to form venules. The total area becomes smaller again, so the blood speeds up a little. The pressure is low.' },
    { n: 'Veins', p: 'about 10 mm Hg and lower', v: 'faster', a: 'smaller as veins join',
      t: 'The pressure is too low to return blood from the legs by itself. Valves, the squeezing of skeletal muscles and breathing help it back to the heart.' },
    { n: 'Venae cavae', p: 'close to 0 mm Hg', v: 'fairly fast, but slower than in the aorta', a: 'small: two large vessels',
      t: 'Blood returns to the right atrium, where the pressure is close to zero. The difference between this and the pressure in the aorta is what keeps blood flowing.' }
  ];
  B.vessels = function (box, o, api) {
    frame(box, 'sx-vessels');
    var id = B._h.uid(), X = [], W = 84, x0 = 34;
    for (var i = 0; i < 7; i++) X.push(x0 + W / 2 + i * W);
    var MEAN = [100, 95, 60, 25, 15, 9, 2], AMP = [20, 20, 12, 1.5, 0, 0, 0];
    var SPD = [1, 0.8, 0.32, 0.03, 0.12, 0.38, 0.62], AREA = [0.05, 0.12, 0.38, 1, 0.66, 0.22, 0.08];
    var GY = { p: [150, 250], s: [282, 352], a: [384, 454] };
    function curve(vals, g) {
      var h = g[1] - g[0], pts = vals.map(function (v, i) { return [X[i], g[1] - v * h]; });
      var d = 'M' + (x0) + ' ' + pts[0][1].toFixed(1) + ' L' + pts[0][0] + ' ' + pts[0][1].toFixed(1);
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2;
        d += ' C' + mx + ' ' + a[1].toFixed(1) + ' ' + mx + ' ' + b[1].toFixed(1) + ' ' + b[0] + ' ' + b[1].toFixed(1);
      }
      return d + ' L' + (x0 + 7 * W) + ' ' + pts[6][1].toFixed(1);
    }
    function meanAt(x) {
      var f = (x - X[0]) / W; if (f <= 0) return [MEAN[0], AMP[0]]; if (f >= 6) return [MEAN[6], AMP[6]];
      var i = Math.floor(f), t = f - i;
      return [lerp(MEAN[i], MEAN[i + 1], t), lerp(AMP[i], AMP[i + 1], t)];
    }
    /* the vessels drawn across the top */
    var strip = '', COUNTS = [1, 3, 6, 11, 6, 3, 1], WID = [30, 13, 6, 2.6, 7, 15, 34];
    for (var c = 0; c < 7; c++) {
      var n = COUNTS[c], w = WID[c], kind = c < 3 ? 'rich' : c > 3 ? 'poor' : 'rich', left = x0 + c * W + 6, right = x0 + (c + 1) * W - 6;
      for (var j = 0; j < n; j++) {
        var y = n === 1 ? 70 : 34 + j * (72 / (n - 1));
        if (c === 3) {
          var dd = 'M' + left + ' ' + y.toFixed(1) + ' C' + (left + 22) + ' ' + (y - 6).toFixed(1) + ' ' + (right - 22) + ' ' + (y + 6).toFixed(1) + ' ' + right + ' ' + y.toFixed(1);
          strip += '<path class="vs-cap" d="' + dd + '" stroke="url(#' + id + 'cg)" stroke-width="' + (w + 1.6) + '"/>';
        } else strip += tube('M' + left + ' ' + y.toFixed(1) + ' H' + right, w, kind);
      }
    }
    box.innerHTML =
      '<div class="vs-chips" role="group" aria-label="Kind of vessel">' + VES.map(function (v, i) { return '<button type="button" data-i="' + i + '" aria-pressed="false">' + esc(v.n) + '</button>'; }).join('') + '</div>' +
      '<svg class="vs-svg" viewBox="0 0 650 470" role="img" aria-label="Three graphs along the route of the blood, from the aorta to the venae cavae: pressure, speed and total cross-sectional area"><defs>' +
        '<linearGradient id="' + id + 'cg" x1="0" x2="1"><stop offset="0" stop-color="var(--bh-rich)"/><stop offset="1" stop-color="var(--bh-poor)"/></linearGradient>' +
        '<linearGradient id="' + id + 'pf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--p-accent,#1f6b4f)" stop-opacity=".22"/><stop offset="1" stop-color="var(--p-accent,#1f6b4f)" stop-opacity="0"/></linearGradient></defs>' +
        '<rect class="vs-col" x="' + x0 + '" y="20" width="' + W + '" height="440" rx="10"/>' +
        '<g class="vs-strip">' + strip + '</g>' +
        '<g class="vs-g"><text class="vs-gl" x="' + x0 + '" y="' + (GY.p[0] - 12) + '">Blood pressure</text><line class="vs-base" x1="' + x0 + '" x2="' + (x0 + 7 * W) + '" y1="' + GY.p[1] + '" y2="' + GY.p[1] + '"/>' +
          '<path class="vs-pfill" d=""/><path class="vs-pline" d=""/></g>' +
        '<g class="vs-g"><text class="vs-gl" x="' + x0 + '" y="' + (GY.s[0] - 12) + '">Speed of the blood</text><line class="vs-base" x1="' + x0 + '" x2="' + (x0 + 7 * W) + '" y1="' + GY.s[1] + '" y2="' + GY.s[1] + '"/>' +
          '<path class="vs-area vs-area--s" d="' + curve(SPD, GY.s) + ' L' + (x0 + 7 * W) + ' ' + GY.s[1] + ' L' + x0 + ' ' + GY.s[1] + ' Z"/><path class="vs-line" d="' + curve(SPD, GY.s) + '"/></g>' +
        '<g class="vs-g"><text class="vs-gl" x="' + x0 + '" y="' + (GY.a[0] - 12) + '">Total cross-sectional area</text><line class="vs-base" x1="' + x0 + '" x2="' + (x0 + 7 * W) + '" y1="' + GY.a[1] + '" y2="' + GY.a[1] + '"/>' +
          '<path class="vs-area vs-area--a" d="' + curve(AREA, GY.a) + ' L' + (x0 + 7 * W) + ' ' + GY.a[1] + ' L' + x0 + ' ' + GY.a[1] + ' Z"/><path class="vs-line" d="' + curve(AREA, GY.a) + '"/></g>' +
        '<g class="vs-hit">' + VES.map(function (v, i) { return '<rect data-i="' + i + '" x="' + (x0 + i * W) + '" y="20" width="' + W + '" height="440" fill="transparent"/>'; }).join('') + '</g>' +
      '</svg>' +
      '<div class="vs-info" aria-live="polite"><p class="vs-info__n"></p><dl class="vs-read"><div><dt>Pressure</dt><dd data-k="p"></dd></div><div><dt>Speed</dt><dd data-k="v"></dd></div><div><dt>Total area</dt><dd data-k="a"></dd></div></dl><p class="vs-info__t"></p></div>';
    var col = $('.vs-col', box), seen = {}, chips = $$('.vs-chips button', box);
    function pick(i) {
      seen[i] = 1;
      col.setAttribute('x', x0 + i * W);
      chips.forEach(function (b, j) { b.setAttribute('aria-pressed', i === j ? 'true' : 'false'); b.classList.toggle('is-seen', !!seen[j]); });
      var v = VES[i];
      $('.vs-info__n', box).textContent = v.n;
      $('[data-k="p"]', box).textContent = v.p; $('[data-k="v"]', box).textContent = v.v; $('[data-k="a"]', box).textContent = v.a;
      $('.vs-info__t', box).textContent = v.t;
      if (Object.keys(seen).length >= 4) api.done();
    }
    chips.forEach(function (b) { b.addEventListener('click', function () { pick(+b.getAttribute('data-i')); }); });
    $$('.vs-hit rect', box).forEach(function (r) { r.addEventListener('click', function () { pick(+r.getAttribute('data-i')); }); });
    /* the pressure line pulses with the heartbeat and smooths out on its way */
    var pl = $('.vs-pline', box), pf = $('.vs-pfill', box), h = GY.p[1] - GY.p[0];
    function draw(t) {
      var d = '';
      for (var x = x0; x <= x0 + 7 * W; x += 6) {
        var m = meanAt(x), ph = (t / 0.8 - (x - x0) / 260) * Math.PI * 2;
        var v = m[0] + m[1] * (Math.sin(ph) * 0.8 + Math.sin(ph * 2 + 0.6) * 0.2);
        d += (x === x0 ? 'M' : ' L') + x + ' ' + (GY.p[1] - v / 125 * h).toFixed(1);
      }
      pl.setAttribute('d', d);
      pf.setAttribute('d', d + ' L' + (x0 + 7 * W) + ' ' + GY.p[1] + ' L' + x0 + ' ' + GY.p[1] + ' Z');
    }
    draw(0);
    if (!reduced) animate(box, function (dt, t) { draw(t); });
    pick(0);
  };

  /* flow through a vessel: radius and pressure difference */
  B.radius = function (box, o, api) {
    frame(box, 'sx-radius');
    var id = B._h.uid();
    box.innerHTML =
      '<svg class="rd-svg" viewBox="0 0 640 224" role="img" aria-label="A vessel whose radius can change, with blood cells flowing through it"><defs>' + cellDef(id) +
        '<linearGradient id="' + id + 'w" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e9a79b"/><stop offset=".5" stop-color="#c9675b"/><stop offset="1" stop-color="#9c463d"/></linearGradient>' +
        '<linearGradient id="' + id + 'l" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--bh-rich-lo)"/><stop offset=".35" stop-color="var(--bh-rich)"/><stop offset="1" stop-color="var(--bh-rich-lo)"/></linearGradient></defs>' +
        '<text class="rd-end" x="20" y="34">Higher pressure</text><text class="rd-end" x="620" y="34" text-anchor="end">Lower pressure</text>' +
        '<ellipse cx="320" cy="206" rx="300" ry="8" fill="#13261f" opacity=".06"/>' +
        '<path class="rd-wallT" fill="url(#' + id + 'w)"/><path class="rd-wallB" fill="url(#' + id + 'w)"/>' +
        '<path class="rd-lumen" fill="url(#' + id + 'l)"/><g class="rd-cells"></g>' +
        '<g class="rd-rings"></g><path class="rd-arrow" d="M250 30 H390" marker-end="url(#' + id + 'a)"/>' +
        '<marker id="' + id + 'a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker>' +
      '</svg>' +
      '<div class="sx-grid sx-grid--even">' +
        '<div class="sx-panel">' +
          '<div class="rd-pre" role="group" aria-label="Quick settings">' +
            '<button type="button" class="sx-pill" data-r="80">Vasoconstriction</button><button type="button" class="sx-pill" data-r="100">Normal</button><button type="button" class="sx-pill" data-r="120">Vasodilation</button></div>' +
          range('rad', 'Radius', 50, 150, 1, 100, '% of normal') + range('dp', 'Pressure difference', 50, 150, 5, 100, '% of normal') +
        '</div>' +
        '<div class="sx-panel rd-out" aria-live="polite">' +
          '<dl class="sx-read"><div><dt>Resistance</dt><dd class="rd-res">1.00 × normal</dd></div><div><dt>Flow</dt><dd class="rd-flow">100% of normal</dd></div></dl>' +
          '<div class="rd-bar"><i></i><span class="rd-bar__n" style="left:12.5%">100%</span></div><p class="rd-note"></p>' +
        '</div>' +
      '</div>';
    var rad = $('[data-r="rad"]', box), dp = $('[data-r="dp"]', box), cellsG = $('.rd-cells', box), uses = 0;
    var cells = [];
    for (var i = 0; i < 26; i++) {
      var u = document.createElementNS(NS, 'ellipse');
      u.setAttribute('rx', 9); u.setAttribute('ry', 4.6); u.setAttribute('fill', 'url(#' + id + 'r)');
      cellsG.appendChild(u);
      cells.push({ x: 40 + Math.random() * 560, l: Math.random() * 2 - 1, n: u, k: 0.85 + Math.random() * 0.3 });
    }
    var R = 1, P = 1, speed = 1, CY = 128, BASE = 34;
    var rings = ''; for (var k = 0; k < 9; k++) rings += '<path class="rd-ring" data-k="' + k + '"/>';
    $('.rd-rings', box).innerHTML = rings;
    function shape() {
      var r = BASE * R, wall = 12 + 4 * (1.2 - R), x1 = 40, x2 = 600;
      $('.rd-lumen', box).setAttribute('d', 'M' + x1 + ' ' + (CY - r) + ' H' + x2 + ' V' + (CY + r) + ' H' + x1 + ' Z');
      $('.rd-wallT', box).setAttribute('d', 'M' + x1 + ' ' + (CY - r - wall) + ' H' + x2 + ' V' + (CY - r) + ' H' + x1 + ' Z');
      $('.rd-wallB', box).setAttribute('d', 'M' + x1 + ' ' + (CY + r) + ' H' + x2 + ' V' + (CY + r + wall) + ' H' + x1 + ' Z');
      $$('.rd-ring', box).forEach(function (p, k) {
        var x = 80 + k * 60;
        p.setAttribute('d', 'M' + x + ' ' + (CY - r - wall + 2) + ' q 6 ' + (r + wall - 2) + ' 0 ' + (2 * (r + wall) - 4));
      });
    }
    function upd(touch) {
      R = +rad.value / 100; P = +dp.value / 100;
      var res = 1 / Math.pow(R, 4), flow = P / res;
      speed = P * R * R;
      $('[data-o="rad"]', box).textContent = rad.value + '% of normal';
      $('[data-o="dp"]', box).textContent = dp.value + '% of normal';
      $('.rd-res', box).textContent = (res < 10 ? res.toFixed(2) : res.toFixed(1)) + ' × normal';
      $('.rd-flow', box).textContent = (flow < 0.1 ? (flow * 100).toFixed(1) : Math.round(flow * 100)) + '% of normal';
      $('.rd-bar i', box).style.width = clamp(flow / 8 * 100, 0.6, 100) + '%';
      var note;
      if (Math.abs(R - 1) < 0.005 && Math.abs(P - 1) < 0.005) note = 'Normal radius and normal pressure difference.';
      else if (Math.abs(P - 1) < 0.005) note = 'Radius × ' + R.toFixed(2) + ' gives resistance ÷ ' + Math.pow(R, 4).toFixed(2) + ', because resistance depends on the radius to the fourth power.';
      else if (Math.abs(R - 1) < 0.005) note = 'Changing only the pressure difference changes the flow by the same factor: × ' + P.toFixed(2) + '.';
      else note = 'Flow = pressure difference ÷ resistance = ' + P.toFixed(2) + ' ÷ ' + res.toFixed(2) + ' = ' + flow.toFixed(2) + ' × normal.';
      $('.rd-note', box).textContent = note;
      $$('.rd-pre button', box).forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-r') === +rad.value && Math.abs(P - 1) < 0.005 ? 'true' : 'false'); });
      shape();
      if (touch && ++uses >= 3) api.done();
    }
    rad.addEventListener('input', function () { upd(true); });
    dp.addEventListener('input', function () { upd(true); });
    $$('.rd-pre button', box).forEach(function (b) { b.addEventListener('click', function () { rad.value = b.getAttribute('data-r'); dp.value = 100; upd(true); }); });
    function place(dt) {
      var r = BASE * R;
      cells.forEach(function (c) {
        var prof = 1 - c.l * c.l * 0.7;
        c.x += dt * 160 * speed * prof;
        if (c.x > 600) { c.x = 40 + (c.x - 600) % 30; c.l = Math.random() * 2 - 1; }
        var y = CY + c.l * Math.max(0, r - 6);
        c.n.setAttribute('transform', 'translate(' + c.x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (c.k * Math.min(1, R + 0.2)).toFixed(2) + ')');
        c.n.style.opacity = c.x < 48 || c.x > 592 ? '0' : '1';
      });
    }
    upd(false); place(0);
    if (!reduced) animate(box, function (dt) { place(dt); });
  };

  /* venous return: the skeletal muscle pump and the respiratory pump */
  B.pumps = function (box, o, api) {
    frame(box, 'sx-pumps');
    var id = B._h.uid();
    box.innerHTML =
      seg('Which pump', [['muscle', 'Skeletal muscle pump'], ['breath', 'Respiratory pump']], 'muscle') +
      '<div class="sx-grid">' +
        '<div class="pu-stage">' +
          '<svg class="pu-muscle" viewBox="0 0 360 420" role="img" aria-label="A vein in the leg between two muscles, with two one-way valves"><defs>' + cellDef(id) +
            '<linearGradient id="' + id + 'm" x1="0" x2="1"><stop offset="0" stop-color="#b9584e"/><stop offset=".45" stop-color="#d9837a"/><stop offset="1" stop-color="#9c443b"/></linearGradient>' +
            '<linearGradient id="' + id + 'v" x1="0" x2="1"><stop offset="0" stop-color="var(--bh-poor-lo)"/><stop offset=".4" stop-color="var(--bh-poor)"/><stop offset="1" stop-color="var(--bh-poor-lo)"/></linearGradient></defs>' +
            '<text class="pu-l" x="180" y="20" text-anchor="middle">toward the heart ↑</text>' +
            '<path class="pu-vein" fill="url(#' + id + 'v)"/>' +
            '<g class="pu-valve" data-v="top"><path class="pu-flap pu-flap--l"/><path class="pu-flap pu-flap--r"/></g>' +
            '<g class="pu-valve" data-v="bot"><path class="pu-flap pu-flap--l"/><path class="pu-flap pu-flap--r"/></g>' +
            '<g class="pu-cells"></g>' +
            '<path class="pu-mus pu-mus--l" fill="url(#' + id + 'm)"/><path class="pu-mus pu-mus--r" fill="url(#' + id + 'm)"/>' +
            '<text class="pu-l pu-vl" x="208" y="100">upper valve</text><text class="pu-l pu-vl" x="208" y="338">lower valve</text>' +
          '</svg>' +
          '<svg class="pu-breath" viewBox="0 0 360 420" role="img" aria-label="The chest and abdomen with the diaphragm between them and the inferior vena cava running up to the heart" hidden><defs>' + cellDef(id + 'b') + '</defs>' +
            '<path d="M70 40 Q180 0 290 40 L310 380 Q180 410 50 380 Z" fill="#f3e3d6" stroke="#c9a891" stroke-width="2"/>' +
            '<path class="pu-chest" d="M84 56 Q180 22 276 56 L280 200 L80 200 Z" fill="#e7f4ee"/>' +
            '<text class="pu-l" x="104" y="84">chest</text><text class="pu-l pu-pc" x="104" y="104"></text>' +
            '<text class="pu-l" x="104" y="300">abdomen</text><text class="pu-l pu-pa" x="104" y="320"></text>' +
            '<path class="pu-heart" d="M200 96 c-26 -24 -62 4 -40 40 l40 34 l40 -34 c22 -36 -14 -64 -40 -40 z" fill="#c94b4b"/>' +
            '<path class="pu-ivc" d="M200 400 V150" fill="none" stroke="var(--bh-poor)" stroke-width="20" stroke-linecap="round"/>' +
            '<path class="pu-dia" fill="none" stroke="#a05a4c" stroke-width="9" stroke-linecap="round"/>' +
            '<text class="pu-l" x="300" y="226" text-anchor="end">diaphragm</text>' +
            '<g class="pu-bcells"></g>' +
          '</svg>' +
        '</div>' +
        '<div class="sx-panel">' +
          '<div class="pu-ctrl-m">' + btn('Contract the muscles', 'sx-btn--primary pu-go') + chip('Damaged valves', ' data-t="bad"', false) + '</div>' +
          '<div class="pu-ctrl-b" hidden>' + btn('Breathe in', 'sx-btn--primary pu-breathe') + '</div>' +
          '<dl class="sx-read pu-read"><div><dt>Blood moved toward the heart</dt><dd class="pu-moved">0 squeezes’ worth</dd></div></dl>' +
          '<p class="pu-info" aria-live="polite"></p>' +
        '</div>' +
      '</div>';
    var mode = 'muscle', con = false, bad = false, moved = 0, uses = 0, insp = false;
    /* the vein: a column of blood with a middle segment between the valves; mid = how full it is (0 to 1) */
    var mid = 1, midT = 1, sq = 0, sqT = 0, valve = { top: 0, bot: 0 }, valveT = { top: 0, bot: 0 }, flowUp = 0;
    var cells = [], cg = $('.pu-cells', box);
    for (var i = 0; i < 18; i++) {
      var e = document.createElementNS(NS, 'ellipse'); e.setAttribute('rx', 8); e.setAttribute('ry', 4); e.setAttribute('fill', 'url(#' + id + 'p)');
      cg.appendChild(e); cells.push({ y: 40 + i * 21, l: Math.random() * 2 - 1, n: e });
    }
    var bcells = [], bg = $('.pu-bcells', box);
    for (var j = 0; j < 9; j++) {
      var f = document.createElementNS(NS, 'ellipse'); f.setAttribute('rx', 4.5); f.setAttribute('ry', 7); f.setAttribute('fill', 'url(#' + id + 'bp)');
      bg.appendChild(f); bcells.push({ y: 170 + j * 26, n: f });
    }
    var dia = 0, diaT = 0;
    function info(t) { $('.pu-info', box).textContent = t; }
    function count() { $('.pu-moved', box).textContent = moved + (moved === 1 ? ' squeeze’s worth' : ' squeezes’ worth'); }
    function act() {
      uses++;
      if (mode === 'muscle') {
        con = !con;
        $('.pu-go', box).textContent = con ? 'Relax the muscles' : 'Contract the muscles';
        sqT = con ? 1 : 0;
        if (con) {
          midT = 0.25;
          valveT.top = 1; valveT.bot = bad ? 1 : 0;
          flowUp = bad ? 0.5 : 1;
          if (!bad) moved++;
          info(bad ? 'The muscles squeeze the vein. With damaged valves, blood is pushed both up and down, so only part of it moves toward the heart.' :
            'The muscles squeeze the vein. The upper valve is pushed open and blood moves up toward the heart. The lower valve is pushed shut, so blood cannot go down.');
        } else {
          midT = 1;
          valveT.top = bad ? 1 : 0; valveT.bot = 1;
          flowUp = bad ? -0.5 : 0.35;
          info(bad ? 'The muscles relax. With damaged valves, the blood that was pushed up slips back down, so overall it hardly moves. Blood pools in the leg.' :
            'The muscles relax. The upper valve is pushed shut, so the blood above cannot fall back. The lower valve opens and the vein refills from below.');
        }
        count();
      } else {
        insp = !insp;
        diaT = insp ? 1 : 0;
        $('.pu-breathe', box).textContent = insp ? 'Breathe out' : 'Breathe in';
        $('.pu-pc', box).textContent = insp ? 'pressure falls' : 'pressure rises';
        $('.pu-pa', box).textContent = insp ? 'pressure rises' : 'pressure falls';
        info(insp ? 'Breathing in: the diaphragm contracts and moves down. Pressure in the chest falls while pressure in the abdomen rises, so blood is pushed from the abdominal veins up into the chest.' :
          'Breathing out: the diaphragm relaxes and rises. Pressure in the chest rises and pushes blood on into the heart. Valves in the leg veins stop blood from flowing back down.');
        if (insp) moved++;
        count();
      }
      if (uses >= 4) api.done();
    }
    $('.pu-go', box).addEventListener('click', act);
    $('.pu-breathe', box).addEventListener('click', act);
    $('[data-t="bad"]', box).addEventListener('click', function () {
      bad = !bad; this.setAttribute('aria-pressed', bad ? 'true' : 'false');
      info(bad ? 'The valves are now damaged: their flaps do not meet. Contract and relax the muscles to see what happens.' : 'The valves are healthy again.');
    });
    $$('.sx-seg button', box).forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-v');
        $$('.sx-seg button', box).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $('.pu-muscle', box).hidden = mode !== 'muscle'; $('.pu-breath', box).hidden = mode === 'muscle';
        $('.pu-ctrl-m', box).hidden = mode !== 'muscle'; $('.pu-ctrl-b', box).hidden = mode === 'muscle';
        info(mode === 'muscle' ? 'Contract and relax the leg muscles. Watch the two valves.' : 'Breathe in and out. Watch the diaphragm and the blood in the inferior vena cava.');
      });
    });
    function draw(dt) {
      var k = Math.min(1, dt * 5);
      mid += (midT - mid) * k; sq += (sqT - sq) * k;
      valve.top += (valveT.top - valve.top) * k; valve.bot += (valveT.bot - valve.bot) * k;
      /* vein outline: x centre 180, from y 30 to 410; middle segment 130..300 bulges with mid */
      var hw = 22, mw = 14 + 18 * mid;
      var dL = 'M' + (180 - hw) + ' 30 V112 C' + (180 - hw) + ' 130 ' + (180 - mw) + ' 140 ' + (180 - mw) + ' 160 V270 C' + (180 - mw) + ' 290 ' + (180 - hw) + ' 296 ' + (180 - hw) + ' 312 V410';
      var dR = 'H' + (180 + hw) + ' V312 C' + (180 + hw) + ' 296 ' + (180 + mw) + ' 290 ' + (180 + mw) + ' 270 V160 C' + (180 + mw) + ' 140 ' + (180 + hw) + ' 130 ' + (180 + hw) + ' 112 V30 Z';
      $('.pu-vein', box).setAttribute('d', dL + ' ' + dR);
      /* the muscles bulge inward when they contract */
      var b = 70 - 24 * sq;
      $('.pu-mus--l', box).setAttribute('d', 'M60 120 C' + (60 + b) + ' 150 ' + (60 + b) + ' 280 60 310 C20 280 20 150 60 120 Z');
      $('.pu-mus--r', box).setAttribute('d', 'M300 120 C' + (300 - b) + ' 150 ' + (300 - b) + ' 280 300 310 C340 280 340 150 300 120 Z');
      ['top', 'bot'].forEach(function (v) {
        var y = v === 'top' ? 118 : 308, a = valve[v] * 0.9, g = $('.pu-valve[data-v="' + v + '"]', box);
        var lx = 180 - hw + 2, rx = 180 + hw - 2, len = hw - 3;
        var tipL = [lx + Math.cos(-0.7 - a) * len + (bad ? -4 : 0), y + Math.sin(-0.7 - a) * len * 0.9];
        var tipR = [rx - Math.cos(-0.7 - a) * len + (bad ? 4 : 0), y + Math.sin(-0.7 - a) * len * 0.9];
        $('.pu-flap--l', g).setAttribute('d', 'M' + lx + ' ' + (y + 8) + ' Q' + (lx + 6) + ' ' + y + ' ' + tipL[0].toFixed(1) + ' ' + tipL[1].toFixed(1));
        $('.pu-flap--r', g).setAttribute('d', 'M' + rx + ' ' + (y + 8) + ' Q' + (rx - 6) + ' ' + y + ' ' + tipR[0].toFixed(1) + ' ' + tipR[1].toFixed(1));
      });
      /* cells drift with the flow, faster while the state is changing */
      var moving = Math.abs(midT - mid) > 0.02 ? 1 : 0.08;
      cells.forEach(function (c) {
        c.y -= dt * 90 * flowUp * moving;
        if (c.y < 34) c.y += 372; if (c.y > 406) c.y -= 372;
        var w = c.y > 150 && c.y < 280 ? mw : hw;
        c.n.setAttribute('transform', 'translate(' + (180 + c.l * (w - 9)).toFixed(1) + ' ' + c.y.toFixed(1) + ') rotate(90)');
      });
      dia += (diaT - dia) * Math.min(1, dt * 3);
      var dy = 196 + 34 * dia;
      $('.pu-dia', box).setAttribute('d', 'M78 ' + (dy + 20) + ' Q180 ' + (dy - 70 + 60 * dia) + ' 282 ' + (dy + 20));
      var bmov = Math.abs(diaT - dia) > 0.03 ? (insp ? 1 : 0.6) : 0.05;
      bcells.forEach(function (c) {
        c.y -= dt * 70 * bmov;
        if (c.y < 160) c.y += 234;
        c.n.setAttribute('transform', 'translate(200 ' + c.y.toFixed(1) + ')');
        c.n.style.opacity = c.y < 166 ? '0' : '1';
      });
    }
    draw(1);
    animate(box, function (dt) { draw(dt); });
    info('Contract and relax the leg muscles. Watch the two valves.');
  };
})();
