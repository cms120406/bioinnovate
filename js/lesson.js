/* BioInnovate lesson pages: everything a student can answer, choose, write or open.
   Every element with data-track counts toward the lesson's completion (see js/manifest.js).
   Needs js/store.js (BioStore), js/glossary.js (GLOSSARY), js/heart.js and js/sims*.js. */
(function () {
  'use strict';
  var S = window.BioStore, L = +document.body.getAttribute('data-lesson') || 0;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  /* ---------------------------------------------------------------- glossary pop-ups */
  var pop = el('div', 'gpop'), popFor = null;
  pop.setAttribute('role', 'dialog');
  pop.hidden = true;
  document.body.appendChild(pop);
  function closePop(back) {
    if (pop.hidden) return;
    pop.hidden = true;
    if (popFor) { popFor.setAttribute('aria-expanded', 'false'); if (back) popFor.focus(); }
    popFor = null;
  }
  function openPop(btn) {
    var key = btn.getAttribute('data-term'), g = (window.GLOSSARY || {})[key];
    if (!g) return;
    if (popFor === btn) { closePop(true); return; }
    closePop();
    popFor = btn;
    btn.setAttribute('aria-expanded', 'true');
    pop.setAttribute('aria-label', g.t);
    pop.innerHTML = '<p class="gpop__t">' + esc(g.t) + '</p><p class="gpop__d">' + esc(g.d) + '</p>' +
      '<p class="gpop__more"><a href="glossary.html#g-' + key.replace(/[^a-z0-9]+/g, '-') + '">All terms in the glossary</a>' +
      '<button type="button" class="gpop__x" aria-label="Close">×</button></p>';
    pop.hidden = false;
    var r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, vw = document.documentElement.clientWidth;
    var x = Math.max(12, Math.min(vw - w - 12, r.left + r.width / 2 - w / 2));
    var below = r.bottom + 10 + h < window.innerHeight || r.top < h + 90;
    var y = below ? r.bottom + 8 : r.top - h - 8;
    pop.style.left = (x + window.scrollX) + 'px';
    pop.style.top = (y + window.scrollY) + 'px';
    pop.querySelector('.gpop__x').focus({ preventScroll: true });
  }
  $$('.term').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-haspopup', 'dialog'); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.term');
    if (t) { e.preventDefault(); openPop(t); return; }
    if (e.target.closest && e.target.closest('.gpop__x')) { closePop(true); return; }
    if (!pop.hidden && !pop.contains(e.target)) closePop();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(true); });
  window.addEventListener('resize', function () { closePop(); });

  /* ---------------------------------------------------------------- questions */
  function optText(q, i) { var o = q.querySelectorAll('.opt')[i]; return o ? o.querySelector('.opt__text').innerHTML : ''; }
  function readingLink(see) {
    var m = /Reading (\d)/.exec(see || '');
    return m ? '<a href="#r' + m[1] + '">' + esc(see) + '</a>' : esc(see || 'this lesson');
  }

  function setupQ(q) {
    var id = q.getAttribute('data-track'), kind = q.getAttribute('data-kind') || (q.classList.contains('q--pred') ? 'pred' : 'think');
    var a = +q.getAttribute('data-a'), opts = $$('.opt', q), fb = $('.q__fb', q);
    var tries = 0;

    function lockAll() { opts.forEach(function (o) { o.disabled = true; }); q.classList.add('is-locked'); }
    function say(html, tone) { fb.innerHTML = html; fb.hidden = false; fb.setAttribute('data-tone', tone || ''); }

    function choose(i, restoring) {
      var right = i === a, o = opts[i], why = o.getAttribute('data-why') || '';
      if (kind === 'pred') {
        opts.forEach(function (x, j) { x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
        say('Your prediction is saved. You will come back to it in Part 7, <em>What I Have Learned</em>. You can change it until then.', 'note');
        if (!restoring) S.put(id, { a: i, a1: i }, true);
        return;
      }
      if (kind === 'pre') {
        o.classList.add(right ? 'is-right' : 'is-wrong');
        lockAll();
        say((right ? '<strong>Correct.</strong> ' : '<strong>Not this time.</strong> ') + 'This is taught in ' + readingLink(q.getAttribute('data-see')) + '.', right ? 'right' : 'wrong');
        if (!restoring) S.put(id, { a: i, ok1: right }, true);
        return;
      }
      if (kind === 'assess') {
        o.classList.add(right ? 'is-right' : 'is-wrong');
        if (!right) opts[a].classList.add('is-answer');
        lockAll();
        var html = right ? '<strong>Correct.</strong> ' + why : '<strong>Not quite.</strong> ' + why +
          ' <span class="q__ans">The answer is ' + 'ABCDE'.charAt(a) + ': ' + (opts[a].getAttribute('data-why') || '') + '</span>';
        say(html, right ? 'right' : 'wrong');
        if (!restoring) { S.put(id, { a: i, ok1: right }, true); }
        return;
      }
      /* check, practice and think again: try until right */
      tries++;
      if (right) {
        o.classList.add('is-right');
        lockAll();
        var extra = '';
        if (kind === 'think') {
          var p = S.get(q.getAttribute('data-pred'));
          if (p && p.a1 != null) extra = p.a1 === a ? ' <span class="q__then">You predicted this correctly in Part 4.</span>' : ' <span class="q__then">Your thinking has changed since Part 4.</span>';
          why = q.getAttribute('data-why');
        }
        say('<strong>' + (tries === 1 || restoring ? 'Correct.' : 'Now you have it.') + '</strong> ' + why + extra, 'right');
      } else {
        o.classList.add('is-wrong');
        o.disabled = true;
        say('<strong>Not quite.</strong> ' + (why || '') + ' Try again.', 'wrong');
      }
      if (!restoring) S.put(id, { a: i, ok1: right }, true);
    }

    opts.forEach(function (o, i) { o.addEventListener('click', function () { if (!o.disabled) choose(i); }); });

    /* the earlier prediction, above a "think again" question */
    if (kind === 'think') {
      var p = S.get(q.getAttribute('data-pred')), src = document.querySelector('[data-track="' + q.getAttribute('data-pred') + '"]');
      var line = el('p', 'q__was');
      var txt = p && p.a1 != null && src ? optText(src, p.a1) : '';
      line.innerHTML = txt ? 'In Part 4 you predicted: <strong>' + txt + '</strong>' : 'You did not make a prediction in Part 4. Answer now.';
      q.insertBefore(line, $('.q__q', q).nextSibling);
    }

    /* coming back to the page */
    var it = S.get(id);
    if (it && it.d && it.a != null) {
      if (kind === 'check' || kind === 'practice' || kind === 'think') { if (it.a === a) { tries = it.ok1 ? 0 : 1; choose(a, true); } }
      else choose(it.a, true);
    }
  }
  $$('.q').forEach(setupQ);

  /* ---------------------------------------------------------------- common ideas */
  $$('.idea').forEach(function (box) {
    var id = box.getAttribute('data-track'), chips = $$('.chip', box), sci = $('.idea__sci', box);
    function set(v, restoring) {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-v') === v ? 'true' : 'false'); });
      sci.hidden = false;
      box.classList.add('is-open');
      if (!restoring) S.put(id, { v: v }, true);
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { set(c.getAttribute('data-v')); }); });
    var it = S.get(id); if (it && it.v) set(it.v, true);
  });

  /* ---------------------------------------------------------------- self-check */
  $$('.selfcheck li[data-track]').forEach(function (li) {
    var id = li.getAttribute('data-track'), chips = $$('.chip', li), tip = $('.rate__tip', li);
    function set(v, restoring) {
      chips.forEach(function (c) { c.setAttribute('aria-checked', c.getAttribute('data-v') === String(v) ? 'true' : 'false'); });
      tip.hidden = +v === 2;
      if (!restoring) S.put(id, { v: +v }, true);
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { set(c.getAttribute('data-v')); }); });
    var it = S.get(id); if (it && it.v != null) set(it.v, true);
  });

  /* ---------------------------------------------------------------- written answers */
  $$('.task[data-track]').forEach(function (box) {
    var id = box.getAttribute('data-track'), ta = $('textarea', box), msg = $('.task__saved', box);
    ta.value = S.text(id);
    function upd() {
      var n = ta.value.trim().length;
      msg.textContent = n ? (n >= 40 ? 'Saved on this device.' : 'Saved. Write a little more to complete this part.') : '';
    }
    ta.addEventListener('input', function () {
      S.text(id, ta.value);
      if (ta.value.trim().length >= 40 && !S.isDone(id)) S.put(id, {}, true);
      upd();
    });
    upd();
  });
  $$('.try[data-save]').forEach(function (li) {
    var id = li.getAttribute('data-save'), ta = $('textarea', li);
    ta.value = S.text(id);
    ta.addEventListener('input', function () { S.text(id, ta.value); });
  });

  /* ---------------------------------------------------------------- parts read */
  if ('IntersectionObserver' in window) {
    var seenIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.getAttribute('data-track');
        if (!S.isDone(id)) S.put(id, {}, true);
        seenIO.unobserve(e.target);
      });
    });
    $$('.part__seen[data-track]').forEach(function (n) { if (!S.isDone(n.getAttribute('data-track'))) seenIO.observe(n); });
  }

  /* ---------------------------------------------------------------- the meter and the list of parts */
  var bar = $('.lp-meter__bar i'), pctEl = $('.lp-meter__pct');
  function refresh() {
    if (!L) return;
    var p = S.pct(L);
    if (bar) bar.style.width = p + '%';
    if (pctEl) pctEl.textContent = p + '%';
    $$('.part').forEach(function (sec) {
      var ids = $$('[data-track]', sec).map(function (n) { return n.getAttribute('data-track'); });
      var done = ids.length && ids.every(function (i) { return S.isDone(i); });
      var a = $('.toc a[data-part="' + sec.id + '"]');
      if (a) a.classList.toggle('is-done', !!done);
    });
    score();
  }
  S.onChange(refresh);

  var tocLinks = $$('.toc a[data-part]');
  if ('IntersectionObserver' in window && tocLinks.length) {
    var vis = {};
    var partIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vis[e.target.id] = e.isIntersecting ? e.intersectionRect.height : 0; });
      var best = null, bh = 0;
      for (var k in vis) if (vis[k] > bh) { bh = vis[k]; best = k; }
      tocLinks.forEach(function (a) {
        if (!best) return;
        var on = a.getAttribute('data-part') === best, was = a.hasAttribute('aria-current');
        a.toggleAttribute('aria-current', on);
        /* on a phone the parts are a row that scrolls sideways: keep the current one in view */
        var list = a.closest('ol');
        if (on && !was && list && list.scrollWidth > list.clientWidth) list.scrollTo({ left: a.parentNode.offsetLeft - list.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
      });
    }, { threshold: [0, 0.1, 0.3, 0.6, 1] });
    $$('.part').forEach(function (s) { partIO.observe(s); });
  }

  /* ---------------------------------------------------------------- the assessment score */
  function score() {
    var box = $('.score'); if (!box) return;
    var qs = $$('.q[data-kind="assess"]'), n = 0, right = 0;
    qs.forEach(function (q) { var it = S.get(q.getAttribute('data-track')); if (it && it.d) { n++; if (it.ok1) right++; } });
    var v = $('.score__v', box);
    if (!n) v.textContent = 'Answer the ten questions above to see your score.';
    else if (n < qs.length) v.innerHTML = '<strong>' + n + ' of ' + qs.length + '</strong> answered so far.';
    else {
      var msg = right >= 8 ? 'Well done.' : right >= 6 ? 'Good work. Review the readings for the questions you missed.' : 'Go back over the readings for the questions you missed, then rate yourself below.';
      v.innerHTML = '<strong>' + right + ' of ' + qs.length + '</strong> correct on the first try. ' + msg;
      box.classList.add('is-done');
    }
  }

  /* ---------------------------------------------------------------- simulations, loaded when near the screen */
  function mountSim(box) {
    if (box.getAttribute('data-ready')) return;
    box.setAttribute('data-ready', '1');
    var name = box.getAttribute('data-sim'), fig = box.closest('[data-track]');
    var id = fig ? fig.getAttribute('data-track') : null, opts = {};
    try { opts = JSON.parse(box.getAttribute('data-opts') || '{}'); } catch (e) { opts = {}; }
    var api = {
      done: function () { if (id && !S.isDone(id)) S.put(id, {}, true); },
      isDone: function () { return id ? S.isDone(id) : false; },
      id: id
    };
    var fn = (window.BioSims || {})[name];
    if (!fn) { box.innerHTML = '<p class="sim-missing">This simulation could not start. Reload the page to try again.</p>'; return; }
    try { fn(box, opts, api); } catch (e) {
      box.innerHTML = '<p class="sim-missing">This simulation could not start on this browser.</p>';
      if (window.console) console.error(e);
    }
  }
  var boxes = $$('.sim-box[data-sim]');
  if ('IntersectionObserver' in window) {
    var simIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { mountSim(e.target); simIO.unobserve(e.target); } });
    }, { rootMargin: '600px 0px' });
    boxes.forEach(function (b) { simIO.observe(b); });
  } else boxes.forEach(mountSim);
  window.addEventListener('beforeprint', function () { boxes.forEach(mountSim); });

  /* ---------------------------------------------------------------- activities */
  var ACTS = {};

  /* sort: tap a category for each statement */
  ACTS.sort = function (box, d, id, body, fb) {
    var rows = d.items.map(function (it, i) {
      var li = el('li', 'sort__row');
      li.innerHTML = '<p>' + esc(it[0]) + '</p><div class="sort__cats" role="radiogroup" aria-label="' + esc(it[0]) + '">' +
        d.cats.map(function (c, j) { return '<button type="button" class="chip" role="radio" aria-checked="false" data-c="' + j + '">' + esc(c) + '</button>'; }).join('') + '</div>';
      return li;
    });
    var ol = el('ol', 'sort'); rows.forEach(function (r) { ol.appendChild(r); }); body.appendChild(ol);
    var sel = d.items.map(function () { return -1; });
    function paint() {
      rows.forEach(function (r, i) {
        $$('.chip', r).forEach(function (c) { c.setAttribute('aria-checked', +c.getAttribute('data-c') === sel[i] ? 'true' : 'false'); });
      });
    }
    rows.forEach(function (r, i) {
      r.addEventListener('click', function (e) {
        var c = e.target.closest('.chip'); if (!c) return;
        sel[i] = +c.getAttribute('data-c'); r.classList.remove('is-right', 'is-wrong'); paint();
      });
    });
    return {
      check: function () {
        if (sel.indexOf(-1) >= 0) return { msg: 'Choose a category for every statement first.', open: true };
        var n = 0;
        rows.forEach(function (r, i) { var ok = sel[i] === d.items[i][1]; if (ok) n++; r.classList.toggle('is-right', ok); r.classList.toggle('is-wrong', !ok); });
        return { n: n, of: rows.length, sel: sel.slice() };
      },
      reset: function () { sel = sel.map(function () { return -1; }); rows.forEach(function (r) { r.classList.remove('is-right', 'is-wrong'); }); paint(); },
      restore: function (s) { if (s && s.length === sel.length) { sel = s.slice(); paint(); } }
    };
  };

  /* order: move steps up and down */
  ACTS.order = function (box, d, id, body, fb) {
    var order = d.start.slice();
    var wrap = el('div', 'order');
    wrap.innerHTML = '<p class="order__end">' + esc(d.first) + '</p><ol class="order__list"></ol><p class="order__end">' + esc(d.last) + '</p>';
    body.appendChild(wrap);
    var list = $('.order__list', wrap);
    function draw(focusIdx, dir) {
      list.innerHTML = order.map(function (k, pos) {
        return '<li class="order__item" data-k="' + k + '"><span class="order__n">' + (pos + 1) + '</span><span class="order__t">' + esc(d.items[k]) + '</span>' +
          '<span class="order__btns"><button type="button" class="order__b" data-dir="-1" aria-label="Move up: ' + esc(d.items[k]) + '"' + (pos === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" class="order__b" data-dir="1" aria-label="Move down: ' + esc(d.items[k]) + '"' + (pos === order.length - 1 ? ' disabled' : '') + '>↓</button></span></li>';
      }).join('');
      if (focusIdx != null) {
        var li = list.children[focusIdx], b = li && li.querySelector('[data-dir="' + dir + '"]');
        if (b && !b.disabled) b.focus(); else if (li) li.querySelector('.order__b:not([disabled])').focus();
      }
    }
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.order__b'); if (!b) return;
      var li = b.closest('li'), pos = Array.prototype.indexOf.call(list.children, li), dir = +b.getAttribute('data-dir'), to = pos + dir;
      if (to < 0 || to >= order.length) return;
      var t = order[pos]; order[pos] = order[to]; order[to] = t;
      draw(to, dir);
    });
    draw();
    return {
      check: function () {
        var n = 0;
        $$('.order__item', list).forEach(function (li, pos) { var ok = +li.getAttribute('data-k') === pos; if (ok) n++; li.classList.toggle('is-right', ok); li.classList.toggle('is-wrong', !ok); });
        return { n: n, of: order.length, sel: order.slice() };
      },
      reset: function () { order = d.start.slice(); draw(); },
      restore: function (s) { if (s && s.length === order.length) { order = s.slice(); draw(); } }
    };
  };

  /* label: a lettered heart and a list of names */
  ACTS.label = function (box, d, id, body, fb) {
    var P = (window.BioHeart && window.BioHeart.PARTS) || [], name = {};
    P.forEach(function (p) { name[p.id] = p.name; });
    var pool = d.ids.concat(d.extra || []).slice().sort(function (x, y) { return name[x] < name[y] ? -1 : 1; });
    var wrap = el('div', 'label');
    wrap.innerHTML = '<div class="label__heart"><div class="label__mount"></div></div><ol class="label__list"></ol>';
    body.appendChild(wrap);
    var mountEl = $('.label__mount', wrap);
    function start() { if (window.BioHeart && !mountEl.getAttribute('data-on')) { mountEl.setAttribute('data-on', '1'); window.BioHeart.mount(mountEl, { mode: 'label', labelIds: d.ids }); } }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { start(); io.disconnect(); } }, { rootMargin: '600px 0px' });
      io.observe(mountEl);
    } else start();
    var list = $('.label__list', wrap);
    list.innerHTML = d.ids.map(function (pid, i) {
      return '<li class="label__row"><label><span class="label__l">' + 'ABCDEFGHIJ'.charAt(i) + '</span><select data-i="' + i + '"><option value="">Choose a name</option>' +
        pool.map(function (q) { return '<option value="' + q + '">' + esc(name[q] || q) + '</option>'; }).join('') + '</select></label></li>';
    }).join('');
    var sels = $$('select', list);
    sels.forEach(function (s) { s.addEventListener('change', function () { s.closest('li').classList.remove('is-right', 'is-wrong'); }); });
    return {
      check: function () {
        if (sels.some(function (s) { return !s.value; })) return { msg: 'Choose a name for every letter first.', open: true };
        var n = 0;
        sels.forEach(function (s, i) { var ok = s.value === d.ids[i]; if (ok) n++; var li = s.closest('li'); li.classList.toggle('is-right', ok); li.classList.toggle('is-wrong', !ok); });
        return { n: n, of: sels.length, sel: sels.map(function (s) { return s.value; }) };
      },
      reset: function () { sels.forEach(function (s) { s.value = ''; s.closest('li').classList.remove('is-right', 'is-wrong'); }); },
      restore: function (v) { if (v && v.length === sels.length) sels.forEach(function (s, i) { s.value = v[i] || ''; }); }
    };
  };

  $$('.act[data-act]').forEach(function (box) {
    var kind = box.getAttribute('data-act'), id = box.getAttribute('data-track'), d;
    try { d = JSON.parse(box.getAttribute('data-data')); } catch (e) { return; }
    var body = $('.act__body', box), fb = $('.act__fb', box);
    var A = ACTS[kind] && ACTS[kind](box, d, id, body, fb);
    if (!A) return;
    var it = S.get(id);
    if (it && it.sel) A.restore(it.sel);
    $('.act__check', box).addEventListener('click', function () {
      var r = A.check();
      if (r.msg) { fb.textContent = r.msg; fb.setAttribute('data-tone', 'note'); return; }
      var all = r.n === r.of;
      fb.innerHTML = all ? '<strong>All ' + r.of + ' correct.</strong> Well done.' : '<strong>' + r.n + ' of ' + r.of + ' correct.</strong> Look again at the ones marked, change them, and check again.';
      fb.setAttribute('data-tone', all ? 'right' : 'wrong');
      S.put(id, { sel: r.sel, ok1: all, best: Math.max(r.n, (S.get(id) || {}).best || 0) }, true);
    });
    $('.act__reset', box).addEventListener('click', function () { A.reset(); fb.textContent = ''; });
  });

  /* ---------------------------------------------------------------- real blood colors */
  function paintBlood() {
    var on = document.documentElement.classList.contains('real-blood');
    $$('.js-blood').forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? 'Show diagram colors' : 'Show real blood colors'; });
  }
  $$('.js-blood').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = !document.documentElement.classList.contains('real-blood');
      document.dispatchEvent(new CustomEvent('bio:blood', { detail: on }));
      paintBlood();
    });
  });
  document.addEventListener('bio:blood', function () { setTimeout(paintBlood, 0); });
  paintBlood();

  /* ---------------------------------------------------------------- presentation mode and printing */
  var parts = $$('.part'), bar2 = $('.present-bar'), cur = 0;
  function show(i) {
    cur = Math.max(0, Math.min(parts.length - 1, i));
    parts.forEach(function (p, j) { p.classList.toggle('is-shown', j === cur); });
    $('.present-bar__t', bar2).textContent = 'Part ' + (cur + 1) + ' of ' + parts.length + ': ' + $('h2', parts[cur]).textContent;
    $('.js-pprev', bar2).disabled = cur === 0;
    $('.js-pnext', bar2).disabled = cur === parts.length - 1;
    window.scrollTo(0, 0);
    $$('.sim-box[data-sim]', parts[cur]).forEach(mountSim);
  }
  function present(on) {
    document.documentElement.classList.toggle('presenting', on);
    bar2.hidden = !on;
    if (on) {
      var best = 0, by = Infinity;
      parts.forEach(function (p, j) { var t = Math.abs(p.getBoundingClientRect().top); if (t < by) { by = t; best = j; } });
      show(best);
      $('.js-pnext', bar2).focus();
    } else {
      parts.forEach(function (p) { p.classList.remove('is-shown'); });
      parts[cur].scrollIntoView();
    }
  }
  if (bar2 && parts.length) {
    $$('.js-present, .js-present-side').forEach(function (b) { b.hidden = false; b.addEventListener('click', function () { present(true); }); });
    $('.js-pprev', bar2).addEventListener('click', function () { show(cur - 1); });
    $('.js-pnext', bar2).addEventListener('click', function () { show(cur + 1); });
    $('.js-pexit', bar2).addEventListener('click', function () { present(false); });
    document.addEventListener('keydown', function (e) {
      if (!document.documentElement.classList.contains('presenting')) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if (e.key === 'Escape') present(false);
      if (e.key === 'ArrowRight' || e.key === 'PageDown') show(cur + 1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') show(cur - 1);
    });
  }
  $$('.js-print').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  /* ---------------------------------------------------------------- the glossary page */
  var find = $('#gl-find');
  if (find) {
    var items = $$('.gl__item');
    find.addEventListener('input', function () {
      var q = find.value.trim().toLowerCase();
      items.forEach(function (it) { it.hidden = q && it.textContent.toLowerCase().indexOf(q) < 0; });
    });
  }

  refresh();

  /* opened from Print the lessons: show everything, then open the print window */
  var pm = /[?&]print=(blank|mine)\b/.exec(window.BIO_SEARCH != null ? window.BIO_SEARCH : location.search);
  if (pm) {
    document.documentElement.classList.add('print-' + pm[1]);
    boxes.forEach(mountSim);
    var key = $('.print-key'); if (key && pm[1] === 'blank') key.hidden = false;
    setTimeout(function () { window.print(); }, 1800);
  }
})();
