/* BioInnovate: pages that are not built yet stay on this page and say when they come,
   instead of opening an empty page. Remove a page from SOON once it exists. */
(function () {
  'use strict';
  var SOON = {
  };
  var note = document.createElement('p');
  note.setAttribute('role', 'status');
  note.style.cssText = 'position:fixed;left:50%;bottom:24px;z-index:50;transform:translateX(-50%);margin:0;max-width:calc(100% - 32px);padding:12px 20px;border-radius:999px;background:#13261f;color:#f9fbfa;font:500 15px/1.4 Figtree,system-ui,sans-serif;box-shadow:0 10px 30px rgba(19,38,31,.25);opacity:0;pointer-events:none;transition:opacity .2s';
  document.body.appendChild(note);
  var timer;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href').split('#')[0];
    if (!SOON[href]) return;
    e.preventDefault();
    note.textContent = SOON[href];
    note.style.opacity = '1';
    clearTimeout(timer);
    timer = setTimeout(function () { note.style.opacity = '0'; }, 3200);
  });
})();
