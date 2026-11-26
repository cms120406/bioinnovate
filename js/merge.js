/* BioInnovate: combining two copies of a student's record without losing work.
   The same code runs in the browser and in the teacher's Google Apps Script (tools/build.py copies this file
   into apps-script/Code.gs), so a phone, a school computer and the Sheet always agree.
   Rules: an item counts as done if either copy has it done; "right on the first try" and the first prediction
   come from whichever copy answered first; everything else comes from the copy changed last. */
function bioMerge(a, b) {
  a = a || {}; b = b || {};
  var out = { v: 1, items: {}, texts: {}, textT: {}, prefs: {} }, k;
  var ia = a.items || {}, ib = b.items || {};
  for (k in ia) if (Object.prototype.hasOwnProperty.call(ia, k)) out.items[k] = bioCopy(ia[k]);
  for (k in ib) if (Object.prototype.hasOwnProperty.call(ib, k)) out.items[k] = out.items[k] ? bioMergeItem(out.items[k], ib[k]) : bioCopy(ib[k]);
  var ta = a.texts || {}, tb = b.texts || {}, ma = a.textT || {}, mb = b.textT || {};
  for (k in ta) if (Object.prototype.hasOwnProperty.call(ta, k)) { out.texts[k] = ta[k]; out.textT[k] = ma[k] || 0; }
  for (k in tb) if (Object.prototype.hasOwnProperty.call(tb, k)) {
    if (!(k in out.texts) || (mb[k] || 0) >= out.textT[k]) { out.texts[k] = tb[k]; out.textT[k] = mb[k] || 0; }
  }
  var newer = (b.last || 0) >= (a.last || 0) ? b : a, older = newer === b ? a : b, p;
  for (p in (older.prefs || {})) out.prefs[p] = older.prefs[p];
  for (p in (newer.prefs || {})) out.prefs[p] = newer.prefs[p];
  var st = [a.started, b.started].filter(function (x) { return x > 0; });
  out.started = st.length ? Math.min.apply(null, st) : 0;
  out.last = Math.max(a.last || 0, b.last || 0);
  return out;
}
function bioCopy(o) { var c = {}, k; for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) c[k] = o[k]; return c; }
function bioMergeItem(x, y) {
  var newer = (y.t || 0) >= (x.t || 0) ? y : x, older = newer === y ? x : y, m = bioCopy(older), k;
  for (k in newer) if (Object.prototype.hasOwnProperty.call(newer, k)) m[k] = newer[k];
  var first = (x.t0 || x.t || 0) <= (y.t0 || y.t || 0) ? x : y, second = first === x ? y : x;
  ['ok1', 'a1'].forEach(function (f) {
    if (f in first) m[f] = first[f]; else if (f in second) m[f] = second[f]; else delete m[f];
  });
  var t0 = [x.t0 || x.t, y.t0 || y.t].filter(function (v) { return v > 0; });
  if (t0.length) m.t0 = Math.min.apply(null, t0);
  if ('best' in x || 'best' in y) m.best = Math.max(x.best || 0, y.best || 0);
  if (x.d || y.d) m.d = 1;
  return m;
}
/* the completion figures of a record, from the list of tracked items of each lesson */
function bioSummary(rec, manifest) {
  var items = (rec && rec.items) || {}, s = { lessons: {}, all: 0, done: 0, first: 0 }, L, i;
  for (L in manifest) {
    var ids = manifest[L], n = 0;
    for (i = 0; i < ids.length; i++) if (items[ids[i]] && items[ids[i]].d) n++;
    s.lessons[L] = ids.length ? Math.round(n * 100 / ids.length) : 0;
    s.all += ids.length; s.done += n;
  }
  for (i in items) if (Object.prototype.hasOwnProperty.call(items, i) && items[i].ok1 === true) s.first++;
  s.pct = s.all ? Math.round(s.done * 100 / s.all) : 0;
  s.meets = s.pct >= 75;
  return s;
}
