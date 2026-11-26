/* BioInnovate: the progress page. Everything comes from the record on this device (js/store.js), which the
   Sheet keeps in step when the student is signed in, and from the list of tracked items (js/manifest.js). */
(function () {
  'use strict';
  var S = window.BioStore, M = window.BIO_MANIFEST || {};
  var PARTS = [['know', 'What I Need to Know'], ['pre', 'What I Know'], ['in', 'What’s In'], ['new', 'What’s New'], ['is', 'What Is It'],
    ['more', 'What’s More'], ['learned', 'What I Have Learned'], ['do', 'What I Can Do'], ['assess', 'Assessment']];
  function $(s, r) { return (r || document).querySelector(s); }

  function draw() {
    var rec = S.record(), sum = window.bioSummary(rec, M), items = rec.items || {};
    $('#prog-all').textContent = sum.pct + '%';
    var fg = $('.prog-ring__fg'), C = 2 * Math.PI * 52;
    fg.style.strokeDasharray = C.toFixed(1); fg.style.strokeDashoffset = (C * (1 - sum.pct / 100)).toFixed(1);
    $('.prog-meets').textContent = sum.meets ? 'Reached' : 'Not yet: ' + (75 - sum.pct) + ' more percent to go';
    $('.prog-meets').classList.toggle('is-yes', sum.meets);
    $('.prog-first').textContent = sum.first + (sum.first === 1 ? ' question' : ' questions');
    $('.prog-start').textContent = rec.started ? new Date(rec.started).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not yet';

    Array.prototype.forEach.call(document.querySelectorAll('.prog-card'), function (card) {
      var L = card.getAttribute('data-lesson'), ids = M[L] || [], pct = sum.lessons[L] || 0;
      $('.prog-bar i', card).style.width = pct + '%';
      $('.prog-card__pct b', card).textContent = pct + '%';
      var ol = $('.prog-parts', card);
      ol.innerHTML = PARTS.map(function (p, i) {
        var mine = ids.filter(function (id) { return id.indexOf('l' + L + '.') === 0 && partOf(id) === p[0]; });
        var n = mine.filter(function (id) { return items[id] && items[id].d; }).length;
        var full = mine.length && n === mine.length;
        return '<li class="' + (full ? 'is-done' : n ? 'is-some' : '') + '" title="' + p[1] + ': ' + n + ' of ' + mine.length + '"><span>' + (i + 1) + '</span><em>' + p[1] + '</em></li>';
      }).join('');
      var asIds = ids.filter(function (id) { return id.indexOf('.assess.') > 0; });
      var answered = asIds.filter(function (id) { return items[id] && items[id].d; }).length;
      var right = asIds.filter(function (id) { return items[id] && items[id].ok1 === true; }).length;
      $('.prog-card__score', card).textContent = !answered ? 'Assessment: not taken yet' : answered < asIds.length ?
        'Assessment: ' + answered + ' of ' + asIds.length + ' answered' : 'Assessment: ' + right + ' of ' + asIds.length + ' right on the first try';
      var go = $('.prog-card__go', card);
      go.textContent = pct >= 100 ? 'Review Lesson ' + L : pct > 0 ? 'Continue Lesson ' + L : 'Open Lesson ' + L;
    });
  }

  /* which of the nine parts an item belongs to, from where it sits in the lesson */
  var where = null;
  function partOf(id) {
    if (!where) where = window.BIO_PARTS || {};
    return where[id] || '';
  }

  S.onChange(draw);
  draw();
})();
