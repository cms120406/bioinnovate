/* BioInnovate online saving: signing in, saving to the teacher's Google Sheet, and working offline.
   The record always lives on the device first (js/store.js). When a student is signed in, it is sent to the
   Apps Script web app a few seconds after each change, when the page is hidden or closed, and again whenever
   the connection comes back. The Sheet merges what it gets (js/merge.js), so two devices never undo each other.
   A student can sign out only after a save has gone through. */
(function () {
  'use strict';
  var S = window.BioStore, URL = ((window.BIO_CONFIG || {}).saveUrl || '').trim();
  var K_SAVED = 'bioinnovate.saved', K_SECT = 'bioinnovate.sections';
  var state = 'idle', dirty = false, busy = false, timer = null, wait = 8000, lastOk = +ls(K_SAVED) || 0, note = '';

  function ls(k, v) {
    try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hhmm(t) { var d = new Date(t); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  function doneCount() { var r = S.record().items, n = 0; for (var k in r) if (r[k].d) n++; return n; }

  function post(body, keepalive) {
    return fetch(URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), keepalive: !!keepalive, redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
  }

  /* ------------------------------------------------------------------ saving */
  function schedule(ms) { if (timer || !URL || !S.student()) return; timer = setTimeout(function () { timer = null; save(); }, ms); }
  function save(force) {
    var st = S.student();
    if (!URL || !st) return Promise.resolve(false);
    if (busy) return new Promise(function (res) { setTimeout(function () { save(force).then(res); }, 700); });
    if (!dirty && !force) return Promise.resolve(true);
    busy = true; dirty = false; state = 'saving'; paint();
    var before = doneCount();
    return post({ action: 'save', section: st.section, name: st.name, key: st.key, data: S.payload() }).then(function (r) {
      busy = false;
      if (r && r.ok) {
        lastOk = r.savedAt || Date.now(); ls(K_SAVED, String(lastOk));
        S.absorb(r.data);
        if (doneCount() > before) offerReload();
        wait = 8000;
        state = dirty ? 'pending' : 'saved';
        if (dirty) schedule(4000);
      } else if (r && r.error === 'signin_again') {
        state = 'signin'; dirty = true;
      } else if (r && r.error === 'too_big') {
        state = 'big'; dirty = true;
      } else {
        state = 'error'; dirty = true; schedule(wait = Math.min(wait * 2, 60000));
      }
      paint();
      return !!(r && r.ok);
    }).catch(function () {
      busy = false; dirty = true; state = 'offline';
      schedule(wait = Math.min(wait * 2, 60000));
      paint();
      return false;
    });
  }
  function flush() {
    var st = S.student();
    if (!URL || !st || !dirty) return;
    try { post({ action: 'save', section: st.section, name: st.name, key: st.key, data: S.payload() }, true).catch(function () {}); } catch (e) { /* the page is closing */ }
  }

  S.onChange(function (src) {
    if (src === 'local') { dirty = true; if (state === 'saved' || state === 'idle') state = 'pending'; schedule(4000); }
    paint();
  });
  window.addEventListener('online', function () { wait = 8000; save(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);

  /* work from another device arrived: the answers on this page show it after a reload */
  function offerReload() {
    if (!document.body.hasAttribute('data-lesson') || document.querySelector('.sync-toast')) return;
    var t = document.createElement('div');
    t.className = 'sync-toast'; t.setAttribute('role', 'status');
    t.innerHTML = '<p>Work from your other device was added.</p><button type="button" class="btn btn--primary btn--sm">Show it</button><button type="button" class="sync-toast__x" aria-label="Close">×</button>';
    document.body.appendChild(t);
    t.querySelector('.btn').addEventListener('click', function () { location.reload(); });
    t.querySelector('.sync-toast__x').addEventListener('click', function () { t.remove(); });
  }

  /* ------------------------------------------------------------------ what the student sees */
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'btn btn--primary sync-btn';
  var actions = document.querySelector('.nav__actions');
  if (actions) actions.insertBefore(btn, actions.firstChild);
  var line = document.querySelector('.lp-sync');

  function words() {
    var st = S.student();
    if (!URL) return { dot: 'off', btn: 'Saved on this device', line: 'Your work is saved on this device.' };
    if (!st) return { dot: 'off', btn: 'Sign in', line: 'Your work is saved on this device only. <button type="button" class="link-btn js-signin">Sign in</button> to save it online for your teacher.' };
    var who = esc(st.name) + ', ' + esc(st.section);
    switch (state) {
      case 'saving': return { dot: 'busy', btn: 'Saving…', line: 'Signed in as ' + who + '. Saving…' };
      case 'saved': return { dot: 'ok', btn: 'Saved', line: 'Signed in as ' + who + '. Saved online at ' + hhmm(lastOk) + '.' };
      case 'offline': return { dot: 'warn', btn: 'Offline', line: 'Signed in as ' + who + '. No connection: your work is saved on this device and will be saved online when you are connected.' };
      case 'error': return { dot: 'warn', btn: 'Not saved yet', line: 'Signed in as ' + who + '. Saving online did not work just now. Your work is safe on this device; it will try again.' };
      case 'signin': return { dot: 'warn', btn: 'Sign in again', line: 'Please <button type="button" class="link-btn js-signin">sign in again</button> to keep saving online. Your work is safe on this device.' };
      case 'big': return { dot: 'warn', btn: 'Not saved yet', line: 'Signed in as ' + who + '. Your written answers are too long to save online. Shorten your longest answer, and it will save again.' };
      case 'pending': return { dot: 'busy', btn: 'Saving soon', line: 'Signed in as ' + who + '. Your latest work will be saved online in a few seconds.' };
      default: return { dot: lastOk ? 'ok' : 'busy', btn: lastOk ? 'Saved' : 'Signed in', line: 'Signed in as ' + who + '.' + (lastOk ? ' Last saved online at ' + hhmm(lastOk) + '.' : '') };
    }
  }
  function paint() {
    var w = words(), st = S.student();
    btn.innerHTML = '<span class="sync-dot" data-s="' + w.dot + '" aria-hidden="true"></span><span class="sync-btn__t">' + w.btn + '</span>';
    btn.classList.toggle('is-in', !!st || !URL);
    btn.setAttribute('aria-label', st ? 'Account: ' + st.name + '. ' + w.btn : w.btn);
    if (line) { line.innerHTML = w.line; line.hidden = false; }
    if (dlg && dlg.open) fillDialog();
  }

  /* ------------------------------------------------------------------ the sign-in dialog */
  var dlg = null;
  function sections() { try { return JSON.parse(ls(K_SECT) || '[]'); } catch (e) { return []; } }
  function loadSections() {
    if (!URL) return;
    fetch(URL, { redirect: 'follow' }).then(function (r) { return r.json(); }).then(function (r) {
      if (r && r.ok && Array.isArray(r.sections)) { ls(K_SECT, JSON.stringify(r.sections)); if (dlg && dlg.open && !S.student()) fillDialog(true); }
    }).catch(function () { /* offline: the saved list is used */ });
  }
  function open() {
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'sync-dlg';
      dlg.setAttribute('aria-labelledby', 'sync-h');
      document.body.appendChild(dlg);
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    }
    note = '';
    fillDialog();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    if (!S.student()) loadSections();
    var f = dlg.querySelector('select, input'); if (f) f.focus();
  }
  function fillDialog(keepValues) {
    var st = S.student(), w = words(), html;
    var vals = {};
    if (keepValues && dlg) ['section', 'name', 'pin'].forEach(function (k) { var n = dlg.querySelector('[name="' + k + '"]'); if (n) vals[k] = n.value; });
    if (!URL) {
      html = '<h2 id="sync-h">Saved on this device</h2><p>Online saving is not set up yet. Everything you do is kept on this device, and it will be sent to your teacher once online saving is ready.</p>' +
        '<div class="sync-dlg__bar"><button type="button" class="btn btn--primary js-close">Close</button></div>';
    } else if (!st || state === 'signin') {
      var list = sections(), local = st ? 0 : doneCount();
      if (st && !keepValues) vals = { section: st.section, name: st.name };
      html = '<h2 id="sync-h">Sign in to save your work</h2>' +
        '<p>Your teacher sees how much of the module you have done. Use the same section, name and PIN on every device.</p>' +
        '<form class="sync-form" novalidate>' +
          '<label><span>Section</span>' + (list.length ?
            '<select name="section" required><option value="">Choose your section</option>' + list.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select>' :
            '<input name="section" required autocomplete="off" placeholder="For example: 12-STEM A">') + '</label>' +
          '<label><span>Full name</span><input name="name" required autocomplete="name" placeholder="For example: Juan Dela Cruz" maxlength="60"></label>' +
          '<label><span>4-digit PIN</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required></label>' +
          '<p class="sync-small">First time? Make up a PIN you will remember. If you forget it, your teacher can reset it.' +
            (local ? ' The work already on this device will be added to your account.' : '') + '</p>' +
          '<p class="sync-err" role="alert">' + esc(note) + '</p>' +
          '<div class="sync-dlg__bar"><button type="submit" class="btn btn--primary">Sign in</button><button type="button" class="btn btn--secondary js-close">Cancel</button></div>' +
        '</form>';
    } else {
      html = '<h2 id="sync-h">' + esc(st.name) + '</h2><p class="sync-small">' + esc(st.section) + '</p>' +
        '<p class="sync-state"><span class="sync-dot" data-s="' + w.dot + '" aria-hidden="true"></span>' + w.line.replace(/^Signed in as [^.]*\.\s*/, '') + '</p>' +
        '<p class="sync-err" role="alert">' + esc(note) + '</p>' +
        '<div class="sync-dlg__bar"><button type="button" class="btn btn--primary js-save">Save now</button><a class="btn btn--secondary" href="progress.html">My progress</a>' +
        '<button type="button" class="btn btn--secondary js-out">Sign out</button><button type="button" class="link-btn js-close">Close</button></div>';
    }
    dlg.innerHTML = html;
    for (var k in vals) { var n = dlg.querySelector('[name="' + k + '"]'); if (n) n.value = vals[k]; }
    var form = dlg.querySelector('form');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); signIn(form); });
    var c = dlg.querySelectorAll('.js-close'); for (var i = 0; i < c.length; i++) c[i].addEventListener('click', function () { dlg.close(); });
    var sv = dlg.querySelector('.js-save'); if (sv) sv.addEventListener('click', function () { note = ''; save(true).then(function (ok) { if (!ok) note = 'Could not save online right now. Your work is safe on this device.'; paint(); }); });
    var out = dlg.querySelector('.js-out'); if (out) out.addEventListener('click', signOut);
  }
  function signIn(form) {
    var section = form.section.value.trim(), name = form.name.value.replace(/\s+/g, ' ').trim(), pin = form.pin.value.trim();
    var err = form.querySelector('.sync-err');
    if (!section || name.length < 3 || !/^\d{4}$/.test(pin)) { err.textContent = 'Fill in your section, your full name and a 4-digit PIN.'; return; }
    var b = form.querySelector('[type="submit"]'); b.disabled = true; b.textContent = 'Signing in…';
    var before = doneCount();
    post({ action: 'signin', section: section, name: name, pin: pin, data: S.payload() }).then(function (r) {
      b.disabled = false; b.textContent = 'Sign in';
      if (r && r.ok) {
        S.setStudent({ section: r.section, name: r.name, key: r.key });
        S.absorb(r.data);
        lastOk = r.savedAt || Date.now(); ls(K_SAVED, String(lastOk));
        dirty = false; state = 'saved'; note = '';
        dlg.close(); paint();
        if (doneCount() > before) offerReload();
        return;
      }
      var msg = {
        wrong_pin: 'That PIN does not match the one saved for this name and section. Try again, or ask your teacher to reset it.',
        section: 'Choose your section from the list.',
        missing: 'Fill in your section, your full name and a 4-digit PIN.',
        busy: 'Many students are saving right now. Try again in a moment.'
      }[r && r.error] || 'Signing in did not work. Try again in a moment.';
      err.textContent = msg;
    }).catch(function () {
      b.disabled = false; b.textContent = 'Sign in';
      err.textContent = 'Can’t reach the internet. Your work stays on this device. Sign in when you are online.';
    });
  }
  function signOut() {
    var b = dlg.querySelector('.js-out'); b.disabled = true; b.textContent = 'Saving first…';
    save(true).then(function (ok) {
      if (!ok) {
        b.disabled = false; b.textContent = 'Sign out';
        note = 'You can sign out once your work is saved online. Connect to the internet and try again.';
        paint(); return;
      }
      S.reset(); ls(K_SAVED, ''); lastOk = 0; state = 'idle'; dirty = false; note = '';
      dlg.close(); paint();
      if (document.body.hasAttribute('data-lesson')) location.reload();
    });
  }

  btn.addEventListener('click', open);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.js-signin')) open(); });

  paint();
  /* coming back to a page: bring in anything saved from another device */
  if (URL && S.student()) setTimeout(function () { save(true); }, 1200);

  window.BioSync = { save: save, open: open, state: function () { return state; } };
})();
