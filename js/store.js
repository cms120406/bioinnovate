/* BioInnovate: the student's work, kept on this device.
   One record in localStorage holds everything: what each tracked item looks like (answered, first-try correct,
   the choice made), the student's written answers, and their preferences. The completion percentages come from
   js/manifest.js, the list of tracked items of each lesson that tools/build.py writes.
   js/sync.js sends this same record to the teacher's Google Sheet; js/merge.js combines copies. */
(function () {
  'use strict';
  var KEY = 'bioinnovate.v1';
  var data, subs = [], timer = null, broken = false;
  /* a blank printed workbook: a clean record in memory that is never saved */
  var blank = /[?&]print=blank\b/.test(window.BIO_SEARCH != null ? window.BIO_SEARCH : location.search);

  function fresh() { return { v: 1, items: {}, texts: {}, textT: {}, prefs: {} }; }
  function load() {
    if (blank) { data = fresh(); return; }
    try { data = JSON.parse(window.localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }
    if (!data || typeof data !== 'object') data = fresh();
    data.items = data.items || {}; data.texts = data.texts || {}; data.textT = data.textT || {}; data.prefs = data.prefs || {};
  }
  function write() {
    timer = null;
    if (blank) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); broken = false; } catch (e) { broken = true; }
  }
  function tell(source) { for (var i = 0; i < subs.length; i++) { try { subs[i](source); } catch (e) { /* a listener's error is its own */ } } }
  function changed(now) {
    data.last = Date.now();
    if (!data.started) data.started = data.last;
    if (timer) clearTimeout(timer);
    if (now) write(); else timer = setTimeout(write, 400);
    tell('local');
  }
  load();

  var S = {
    /* an item: { d: 1 when done, a: the choice, ok1: right on the first try, ... } */
    get: function (id) { return data.items[id] || null; },
    isDone: function (id) { return !!(data.items[id] && data.items[id].d); },
    put: function (id, patch, done) {
      var it = data.items[id] || {};
      for (var k in patch) {
        if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
        if ((k === 'ok1' || k === 'a1') && Object.prototype.hasOwnProperty.call(it, k)) continue; /* the first try is kept */
        it[k] = patch[k];
      }
      if (done) it.d = 1;
      it.t = Date.now();
      if (!it.t0) it.t0 = it.t;
      data.items[id] = it;
      changed(true);
      return it;
    },
    text: function (id, value) {
      if (value === undefined) return data.texts[id] || '';
      data.texts[id] = value;
      data.textT[id] = Date.now();
      changed(false);
    },
    pref: function (k, v) {
      if (v === undefined) return data.prefs[k];
      data.prefs[k] = v; changed(true);
    },
    /* completion: the share of a lesson's tracked items that are done (0 to 100) */
    pct: function (L) {
      var ids = (window.BIO_MANIFEST || {})[L] || [], n = 0;
      for (var i = 0; i < ids.length; i++) if (S.isDone(ids[i])) n++;
      return ids.length ? Math.round(n * 100 / ids.length) : 0;
    },
    overall: function () {
      var M = window.BIO_MANIFEST || {}, all = 0, n = 0;
      for (var L in M) for (var i = 0; i < M[L].length; i++) { all++; if (S.isDone(M[L][i])) n++; }
      return all ? Math.round(n * 100 / all) : 0;
    },
    firstTry: function (L) {
      var n = 0, pre = 'l' + L + '.';
      for (var id in data.items) if ((!L || id.indexOf(pre) === 0) && data.items[id].ok1 === true) n++;
      return n;
    },
    onChange: function (fn) { subs.push(fn); },
    /* who is signed in on this device: { section, name, key } or null */
    student: function () { return data.student || null; },
    setStudent: function (st) { data.student = st; write(); tell('student'); },
    /* take in the copy from the Sheet; local work made in the meantime is kept */
    absorb: function (remote) {
      var st = data.student;
      var m = window.bioMerge(remote, data);
      m.student = st;
      data = m; write(); tell('remote');
    },
    /* the record to send: everything but the sign-in key */
    payload: function () {
      var c = JSON.parse(JSON.stringify(data)); delete c.student; return c;
    },
    reset: function () { data = fresh(); write(); tell('reset'); },
    record: function () { return data; },
    saving: function () { return !broken; }
  };
  window.BioStore = S;

  /* another tab of the module changed the record */
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    load();
    tell('storage');
  });

  /* real blood colors: one choice for the whole module, remembered */
  var root = document.documentElement;
  if (S.pref('real')) root.classList.add('real-blood');
  document.addEventListener('bio:blood', function (e) {
    var on = !!e.detail;
    root.classList.toggle('real-blood', on);
    S.pref('real', on);
  });
  window.addEventListener('pagehide', function () { if (timer) { clearTimeout(timer); write(); } });
})();
