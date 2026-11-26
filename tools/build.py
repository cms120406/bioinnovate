#!/usr/bin/env python3
"""BioInnovate page builder.

Each lesson's content lives in content/lessonN.py as data (parts, readings, questions, activities).
This script turns it into lesson-N.html with the shared header, layout and interactive markup, and
builds glossary.html and references.html. Run: python3 -I tools/build.py  (from the site folder)

Text markup inside content strings:
  [[term]] or [[shown words|glossary term]]  a glossary word with a pop-up
  **bold**  *italic*
"""
import html, importlib.util, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'content'))

def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, 'content', name + '.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

GLOSSARY = load('glossary').GLOSSARY
REFS = load('glossary').REFERENCES
used_terms = set()

def md(s):
    """escape, then apply the module's small markup"""
    s = html.escape(s, quote=False)
    def term(m):
        shown, key = (m.group(1).split('|') + [None])[:2]
        key = (key or shown).strip().lower()
        if key not in GLOSSARY:
            raise SystemExit('glossary term missing: ' + key)
        used_terms.add(key)
        return '<button type="button" class="term" data-term="%s">%s</button>' % (html.escape(key), shown)
    s = re.sub(r'\[\[([^\]]+)\]\]', term, s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', s)
    return s

def attr(s):
    return html.escape(str(s), quote=True)

PARTS = [
    ('know', 'What I Need to Know'), ('pre', 'What I Know'), ('in', 'What’s In'), ('new', 'What’s New'),
    ('is', 'What Is It'), ('more', 'What’s More'), ('learned', 'What I Have Learned'), ('do', 'What I Can Do'),
    ('assess', 'Assessment')]

# ---------------------------------------------------------------------------------------------- blocks
def mcq(L, b, kind):
    """b: dict(id, q, o=[(text, why)], a=index). kind: pre | check | assess | practice"""
    qid = 'l%d.%s.%s' % (L, kind, b['id'])
    opts = ''.join(
        '<li><button type="button" class="opt" data-i="%d" data-why="%s"><span class="opt__mark" aria-hidden="true">%s</span><span class="opt__text">%s</span></button></li>'
        % (i, attr(md(o[1]) if len(o) > 1 and o[1] else ''), 'ABCDE'[i], md(o[0])) for i, o in enumerate(b['o']))
    label = {'pre': 'Question', 'check': 'Quick check', 'assess': 'Question', 'practice': 'Practice'}[kind]
    num = ('%s %s' % (label, b['n'])) if b.get('n') else label
    return ('<div class="q q--%s" data-track="%s" data-kind="%s" data-a="%d"%s>'
            '<p class="q__k">%s</p><p class="q__q">%s</p><ol class="q__opts" role="list">%s</ol>'
            '<div class="q__fb" aria-live="polite" hidden></div></div>') % (
        kind, qid, kind, b['a'], (' data-see="%s"' % attr(b['see'])) if b.get('see') else '', num, md(b['q']), opts)

def pred(L, b, again=False):
    pid = 'l%d.pred.%s' % (L, b['id'])
    opts = ''.join('<li><button type="button" class="opt" data-i="%d"><span class="opt__mark" aria-hidden="true">%s</span><span class="opt__text">%s</span></button></li>'
                   % (i, 'ABCDE'[i], md(o)) for i, o in enumerate(b['o']))
    if again:
        return ('<div class="q q--think" data-track="%s.again" data-pred="%s" data-a="%d" data-why="%s">'
                '<p class="q__k">Think again</p><p class="q__q">%s</p><ol class="q__opts" role="list">%s</ol>'
                '<div class="q__fb" aria-live="polite" hidden></div></div>') % (pid, pid, b['a'], attr(md(b['why'])), md(b['q']), opts)
    return ('<div class="q q--pred" data-track="%s" data-pred="%s">'
            '<p class="q__k">Your prediction</p><p class="q__q">%s</p><ol class="q__opts" role="list">%s</ol>'
            '<div class="q__fb" aria-live="polite" hidden></div></div>') % (pid, pid, md(b['q']), opts)

def idea(L, b):
    iid = 'l%d.idea.%s' % (L, b['id'])
    return ('<div class="idea" data-track="%s"><p class="idea__k">Common idea</p><p class="idea__s">“%s”</p>'
            '<div class="idea__ask"><span>What do you think?</span><button type="button" class="chip" data-v="agree">I agree</button>'
            '<button type="button" class="chip" data-v="disagree">I disagree</button></div>'
            '<div class="idea__sci" hidden><p class="idea__k">What science says</p><p>%s</p></div></div>') % (iid, md(b['s']), md(b['sci']))

def table(b):
    head = ''.join('<th scope="col">%s</th>' % md(h) for h in b['head'])
    rows = ''.join('<tr>%s</tr>' % ''.join(('<th scope="row">%s</th>' if j == 0 else '<td>%s</td>') % md(c) for j, c in enumerate(r)) for r in b['rows'])
    return ('<figure class="tbl"><figcaption>%s</figcaption><div class="tbl__scroll"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div></figure>'
            % (md(b['cap']), head, rows))

def guide(L, sim, qs):
    if not qs: return ''
    items = ''.join(
        ('<li class="try" data-save="l%d.try.%s.%d"><p>%s</p><textarea rows="2" aria-label="Your answer" placeholder="Type your answer"></textarea>'
         '<details><summary>Compare with a model answer</summary><p>%s</p></details></li>') % (L, sim, i, md(q), md(a)) for i, (q, a) in enumerate(qs))
    return '<div class="tries"><p class="tries__k">Try this</p><ol>%s</ol></div>' % items

def sim(L, b):
    sid = b['sim']
    track = '' if b.get('static') else ' data-track="l%d.sim.%s"' % (L, sid)
    return ('<figure class="sim-fig wide"%s><div class="sim-box" data-sim="%s"%s></div><figcaption>%s</figcaption>%s</figure>'
            % (track, sid, (' data-opts="%s"' % attr(json.dumps(b['opts']))) if b.get('opts') else '', md(b['cap']), guide(L, sid, b.get('try'))))

def activity(L, b):
    aid = 'l%d.act.%s' % (L, b['id'])
    data = attr(json.dumps(b['data']))
    return ('<div class="act wide" data-track="%s" data-act="%s" data-data="%s"><p class="act__k">%s</p><p class="act__how">%s</p>'
            '<div class="act__body"></div><div class="act__bar"><button type="button" class="btn btn--primary act__check">Check my answers</button>'
            '<button type="button" class="btn btn--secondary act__reset">Start again</button></div><p class="act__fb" aria-live="polite"></p></div>') % (
        aid, b['kind'], data, md(b['title']), md(b['how']))

def selfcheck(L, items):
    rows = ''.join(
        ('<li data-track="l%d.self.%d"><p>%s</p><div class="rate" role="radiogroup" aria-label="How well can you do this?">'
         '<button type="button" class="chip" data-v="2" role="radio" aria-checked="false">Yes, I can</button>'
         '<button type="button" class="chip" data-v="1" role="radio" aria-checked="false">Partly</button>'
         '<button type="button" class="chip" data-v="0" role="radio" aria-checked="false">Not yet</button></div>'
         '<p class="rate__tip" hidden>Review <a href="#%s">%s</a>, then try again.</p></li>') % (L, i, md(t), ref[0], md(ref[1]))
        for i, (t, ref) in enumerate(items))
    return '<ol class="selfcheck">%s</ol>' % rows

def task(L, b):
    return ('<div class="task" data-track="l%d.task.%s"><p class="task__k">%s</p>%s<textarea rows="%d" aria-label="%s" placeholder="Write here"></textarea>'
            '<p class="task__saved" aria-live="polite"></p></div>') % (L, b['id'], md(b['title']), ''.join('<p>%s</p>' % md(p) for p in b['ps']), b.get('rows', 4), attr(b['title']))

def block(L, b):
    t = b[0] if isinstance(b, tuple) else b['type']
    if isinstance(b, tuple):
        if t == 'p': return '<p>%s</p>' % md(b[1])
        if t == 'lead': return '<p class="lead">%s</p>' % md(b[1])
        if t == 'h3': return '<h3>%s</h3>' % md(b[1])
        if t == 'list': return '<ul class="bul">%s</ul>' % ''.join('<li>%s</li>' % md(x) for x in b[1])
        if t == 'steps': return '<ol class="num">%s</ol>' % ''.join('<li>%s</li>' % md(x) for x in b[1])
        if t == 'formula': return '<p class="formula">%s</p>' % md(b[1])
        if t == 'note': return '<aside class="note"><p class="note__k">%s</p>%s</aside>' % (md(b[1]), ''.join('<p>%s</p>' % md(x) for x in b[2:]))
        if t == 'session': return '<div class="session-end" role="note"><span>%s</span></div>' % md(b[1])
        raise SystemExit('unknown block ' + t)
    if t == 'mcq': return mcq(L, b, b.get('kind', 'check'))
    if t == 'pred': return pred(L, b)
    if t == 'think': return pred(L, b['pred'], again=True)
    if t == 'idea': return idea(L, b)
    if t == 'table': return table(b)
    if t == 'sim': return sim(L, b)
    if t == 'act': return activity(L, b)
    if t == 'self': return selfcheck(L, b['items'])
    if t == 'task': return task(L, b)
    if t == 'score': return '<div class="score" data-lesson="%d" aria-live="polite"><p class="score__k">Your score</p><p class="score__v">Answer the ten questions above to see your score.</p></div>' % L
    if t == 'blood': return ('<div class="blood-switch"><button type="button" class="btn btn--secondary js-blood" aria-pressed="false">Show real blood colors</button>'
                             '<p>Every diagram and simulation in the module switches to real colors, in every lesson, until you switch back.</p></div>')
    if t == 'reading':
        inner = ''.join(block(L, x) for x in b['blocks'])
        return ('<article class="reading" id="r%d" aria-labelledby="r%d-h"><p class="reading__k">Reading %d of %d</p><h3 id="r%d-h">%s</h3>%s</article>'
                % (b['n'], b['n'], b['n'], b['of'], b['n'], md(b['title']), inner))
    raise SystemExit('unknown block ' + t)

# ---------------------------------------------------------------------------------------------- page
NAV_LESSONS = [('lesson-1.html', 'The Heart: A Double Pump', 'Chambers, valves, one beat'),
               ('lesson-2.html', 'Blood Vessels and Blood Flow', 'Pressure, speed, resistance'),
               ('lesson-3.html', 'Two Circuits, One Loop', 'The lungs, the body, real color'),
               ('lesson-4.html', 'Blood Pressure and Its Control', 'Readings and how they change')]

ROOT_STYLE = '''<style>
:root {
  --p-bg: #f9fbfa; --p-surface: #e2f3ea; --p-ink: #13261f; --p-muted: #5f6f68;
  --p-accent: #1f6b4f; --p-accent-ink: #f9fbfa; --p-action: #1f6b4f; --p-action-ink: #f9fbfa;
  --p-inv-bg: #13261f; --p-inv-surface: #21332c; --p-inv-ink: #f9fbfa; --p-inv-muted: #99a39f;
  --p-inv-accent: #f9fbfa; --p-inv-accent-ink: #13261f; --p-inv-action: #f9fbfa; --p-inv-action-ink: #13261f;
  --font-display: "Figtree", system-ui, sans-serif;
  --font-text: "Figtree", system-ui, sans-serif;
  --display-weight: 500;
  --display-tracking: -0.025em;
  --display-tracking-xl: -0.035em;
}
</style>'''

def head(title, desc, extra_css=()):
    css = ''.join('<link rel="stylesheet" href="%s">' % c for c in ('assets/system.css',) )
    css += ROOT_STYLE
    css += ''.join('<link rel="stylesheet" href="%s">' % c for c in ('css/site.css', 'css/sim.css', 'css/lesson.css', 'css/simx.css') + tuple(extra_css))
    return ('<!doctype html>\n<html lang="en" data-type="software" data-radius="round" data-buttons="solid">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>%s</title>\n<meta name="description" content="%s">\n'
            '<link rel="icon" href="favicon.svg" type="image/svg+xml">\n<meta name="theme-color" content="#f9fbfa">\n'
            '<link rel="preload" href="fonts/figtree.woff" as="font" type="font/woff" crossorigin>\n%s\n</head>\n') % (attr(title), attr(desc), css)

def header(current=''):
    lk = lambda i: '<a href="%s"%s>%s<span>%s</span></a>' % (NAV_LESSONS[i][0], ' aria-current="page"' if NAV_LESSONS[i][0] == current else '', NAV_LESSONS[i][1], NAV_LESSONS[i][2])
    lessons = ('<div class="menu-col span-3"><p class="t-label">Sessions 1 to 4</p>%s%s</div><div class="menu-col span-3"><p class="t-label">Sessions 5 to 8</p>%s%s</div>'
               % (lk(0), lk(1), lk(2), lk(3)))
    words = [('glossary.html', 'Glossary'), ('progress.html', 'Progress'), ('teacher.html', 'Teachers')]
    w = ''.join('<div class="nav__item"><a class="nav__link" href="%s"%s>%s</a></div>' % (h, ' aria-current="page"' if h == current else '', t) for h, t in words)
    return ('<header class="nav"><div class="wrap nav__bar"><a class="skip-link" href="#main">Skip to content</a>'
            '<a class="nav__logo" href="index.html"><span class="mark" data-mark="ring" aria-hidden="true"></span>BioInnovate</a>'
            '<nav class="nav__links" aria-label="Main"><div class="nav__item"><a class="nav__link" href="index.html#lessons">Lessons '
            '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>'
            '<div class="nav__menu"><div class="wrap grid">%s</div></div></div>%s</nav>'
            '<div class="nav__actions"><button type="button" class="btn btn--secondary js-present" hidden>Present</button></div>'
            '<button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>'
            '</div></header>') % (lessons, w)

def footer():
    return ('<footer class="lfoot"><div class="wrap lfoot__in"><p><a class="nav__logo" href="index.html"><span class="mark" data-mark="ring" aria-hidden="true"></span>BioInnovate</a></p>'
            '<p>A self-learning module on the circulatory system for General Biology 2, by Cristina M. Sabal, Tarlac Agricultural University.</p>'
            '<p class="lfoot__links"><a href="glossary.html">Glossary</a><a href="references.html">References</a><a href="progress.html">My progress</a><a href="teacher.html">Teacher’s guide</a></p>'
            '<p class="lfoot__small">Science content adapted from OpenStax Anatomy and Physiology 2e and Biology 2e (CC BY 4.0). Your work is saved on this device.</p></div></footer>')

SCRIPTS = ('<script type="module" src="assets/system.js"></script>\n<script src="js/config.js"></script>\n<script src="js/glossary.js"></script>\n<script src="js/manifest.js"></script>\n'
           '<script src="js/merge.js"></script>\n<script src="js/store.js"></script>\n<script src="js/sync.js"></script>\n<script src="js/site.js"></script>\n'
           '<script src="js/heart.js"></script>\n<script src="js/sims.js"></script>\n<script src="js/sims2.js"></script>\n<script src="js/lesson.js"></script>\n')

def lesson_page(L):
    C = load('lesson%d' % L).LESSON
    parts_html, toc = '', ''
    for i, (pid, pname) in enumerate(PARTS):
        P = C['parts'][pid]
        body = ''.join(block(L, b) for b in P['blocks'])
        intro = '<p class="part__intro">%s</p>' % md(P['intro']) if P.get('intro') else ''
        parts_html += ('<section class="part" id="%s" data-part="%d" aria-labelledby="%s-h"><header class="part__head"><p class="part__k">Part %d</p>'
                       '<h2 id="%s-h">%s</h2>%s</header><div class="part__body">%s</div>'
                       '<p class="part__seen" data-track="l%d.part.%s" aria-hidden="true"></p></section>') % (pid, i + 1, pid, i + 1, pid, pname, intro, body, L, pid)
        toc += '<li><a href="#%s" data-part="%s"><span class="toc__n">%d</span><span class="toc__t">%s</span></a></li>' % (pid, pid, i + 1, pname)
    prev_next = ''
    if L > 1:
        prev_next += '<a class="pn pn--prev" href="lesson-%d.html"><span>Previous lesson</span>%s</a>' % (L - 1, NAV_LESSONS[L - 2][1])
    if L < 4:
        prev_next += '<a class="pn pn--next" href="lesson-%d.html"><span>Next lesson</span>%s</a>' % (L + 1, NAV_LESSONS[L][1])
    else:
        prev_next += '<a class="pn pn--next" href="progress.html"><span>You have finished the four lessons</span>Open my progress report</a>'
    out = head('Lesson %d: %s | BioInnovate' % (L, C['title']), C['desc'])
    out += '<body class="lesson-page" data-lesson="%d">\n' % L
    out += header('lesson-%d.html' % L)
    out += ('<main id="main" class="lp">'
            '<div class="lp-head wrap"><div class="lp-head__text"><p class="lp-head__k"><span class="dot" aria-hidden="true"></span>Lesson %d · %s</p>'
            '<h1>%s</h1><p class="lp-head__q"><span>Key question</span>%s</p>'
            '<div class="lp-meter" aria-live="polite"><div class="lp-meter__bar"><i style="width:0%%"></i></div><p><b class="lp-meter__pct">0%%</b> of this lesson done</p></div><p class="lp-sync" hidden></p></div>'
            '<div class="lp-head__pic"><img src="img/l%d.svg" alt="%s" width="320" height="200"></div></div>'
            '<div class="lp-grid wrap"><nav class="toc" aria-label="Parts of this lesson"><p class="toc__k">Nine parts</p><ol>%s</ol>'
            '<p class="toc__tools"><button type="button" class="link-btn js-present-side">Presentation mode</button><button type="button" class="link-btn js-print">Print this lesson</button></p></nav>'
            '<div class="lp-body">%s<section class="print-key" aria-labelledby="pk-h" hidden><h2 id="pk-h">Answer key</h2>%s</section><nav class="pnav" aria-label="Lessons">%s</nav></div></div></main>') % (
        L, C['sessions'], md(C['title']), md(C['key']), L, attr(C['pic_alt']), toc, parts_html, answer_key(L), prev_next)
    out += footer()
    out += '<div class="present-bar" hidden><button type="button" class="btn btn--secondary js-pprev">Previous part</button><p class="present-bar__t"></p><button type="button" class="btn btn--primary js-pnext">Next part</button><button type="button" class="btn btn--secondary js-pexit">Exit</button></div>\n'
    out += SCRIPTS + '</body>\n</html>\n'
    return out

def glossary_page():
    keys = sorted(GLOSSARY)
    letters = sorted(set(k[0].upper() for k in keys))
    out = head('Glossary | BioInnovate', 'The key terms of the BioInnovate module on the circulatory system, with their meanings.')
    out += '<body class="lesson-page doc-page">\n' + header('glossary.html')
    items = ''.join('<div class="gl__item" id="g-%s"><dt>%s</dt><dd>%s</dd></div>' % (re.sub(r'[^a-z0-9]+', '-', k), html.escape(GLOSSARY[k]['term']), md(GLOSSARY[k]['def'])) for k in keys)
    out += ('<main id="main" class="doc wrap"><p class="lp-head__k"><span class="dot" aria-hidden="true"></span>BioInnovate</p><h1>Glossary</h1>'
            '<p class="doc__lead">The key terms of the module. In the lessons, select a word with a dotted underline to see its meaning without leaving the page. '
            'Definitions were written for this module from Betts et al. (2022) and Clark et al. (2018).</p>'
            '<label class="gl__find"><span>Find a term</span><input type="search" id="gl-find" autocomplete="off"></label><dl class="gl">%s</dl></main>') % items
    out += footer() + SCRIPTS.replace('<script src="js/heart.js"></script>\n<script src="js/sims.js"></script>\n<script src="js/sims2.js"></script>\n', '') + '</body>\n</html>\n'
    return out

def progress_page():
    out = head('My progress | BioInnovate', 'How much of the BioInnovate module you have completed, lesson by lesson.')
    out += '<body class="lesson-page doc-page prog-page">\n' + header('progress.html')
    cards = ''
    for i, (h, t, sub) in enumerate(NAV_LESSONS):
        L = i + 1
        cards += ('<article class="prog-card" data-lesson="%d"><p class="prog-card__k">Lesson %d</p><h2>%s</h2>'
                  '<div class="prog-bar"><i></i></div><p class="prog-card__pct"><b>0%%</b> done</p>'
                  '<ol class="prog-parts" aria-label="The nine parts"></ol><p class="prog-card__score"></p>'
                  '<a class="link prog-card__go" href="%s">Open Lesson %d</a></article>') % (L, L, html.escape(t), h, L)
    out += ('<main id="main" class="doc wrap prog"><p class="lp-head__k"><span class="dot" aria-hidden="true"></span>BioInnovate</p><h1>My progress</h1>'
            '<p class="lp-sync" hidden></p>'
            '<div class="prog-top"><div class="prog-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="prog-ring__bg"/>'
            '<circle cx="60" cy="60" r="52" class="prog-ring__fg"/></svg><p><b id="prog-all">0%%</b><span>of the module</span></p></div>'
            '<dl class="prog-facts"><div><dt>The 75%% mark</dt><dd class="prog-meets">Not yet</dd></div><div><dt>Right on the first try</dt><dd class="prog-first">0 questions</dd></div>'
            '<div><dt>Started</dt><dd class="prog-start">Not yet</dd></div></dl></div>'
            '<div class="prog-cards">%s</div>'
            '<div class="prog-how"><h2>What counts</h2><p>Each lesson counts every part you read to the end, every question you answer, every prediction and common idea you check, '
            'each simulation you use, the activity, the written task and your self-check. Your answers to the “Try this” questions under the simulations are kept but do not count. '
            'Your teacher sees the same numbers.</p></div></main>') % cards
    out += footer() + SCRIPTS.replace('<script src="js/heart.js"></script>\n<script src="js/sims.js"></script>\n<script src="js/sims2.js"></script>\n<script src="js/lesson.js"></script>\n', '<script src="js/progress.js"></script>\n') + '</body>\n</html>\n'
    return out

def references_page():
    out = head('References | BioInnovate', 'Sources used to write the BioInnovate module.')
    out += '<body class="lesson-page doc-page">\n' + header('references.html')
    items = ''.join('<li>%s</li>' % re.sub(r'(https://\S+)', r'<a href="\1">\1</a>', html.escape(r)) for r in REFS)
    out += ('<main id="main" class="doc wrap"><p class="lp-head__k"><span class="dot" aria-hidden="true"></span>BioInnovate</p><h1>References</h1>'
            '<p class="doc__lead">The science in the lessons was written from these sources. Text adapted from the two OpenStax books is used under the Creative Commons Attribution 4.0 license.</p>'
            '<ol class="refs">%s</ol></main>') % items
    out += footer() + SCRIPTS.replace('<script src="js/heart.js"></script>\n<script src="js/sims.js"></script>\n<script src="js/sims2.js"></script>\n', '') + '</body>\n</html>\n'
    return out

# ---------------------------------------------------------------------------------------------- the answer key
HEART_NAMES = {'svc': 'Superior vena cava', 'ivc': 'Inferior vena cava', 'ra': 'Right atrium', 'tv': 'Tricuspid valve', 'rv': 'Right ventricle',
               'pv': 'Pulmonary valve', 'pa': 'Pulmonary arteries', 'pvn': 'Pulmonary veins', 'la': 'Left atrium', 'mv': 'Mitral valve',
               'lv': 'Left ventricle', 'av': 'Aortic valve', 'ao': 'Aorta', 'sep': 'Septum'}
PART_NAME = dict(PARTS)

def walk(blocks):
    """every block of a part, readings opened up, with the reading number"""
    for b in blocks:
        if isinstance(b, dict) and b.get('type') == 'reading':
            for x in b['blocks']:
                yield x, b['n']
        else:
            yield b, None

def letter(b):
    o = b['o'][b['a']]
    return '<b>%s.</b> %s' % ('ABCDE'[b['a']], md(o[0] if isinstance(o, tuple) else o))

def answer_key(L):
    C = load('lesson%d' % L).LESSON
    rows = []
    for pid, pname in PARTS:
        for b, rn in walk(C['parts'][pid]['blocks']):
            if not isinstance(b, dict): continue
            t = b['type']
            if t == 'mcq':
                lab = {'pre': 'What I Know %s', 'check': 'Quick check, Reading %s', 'practice': 'Practice %s', 'assess': 'Assessment %s'}[b['kind']]
                num = b.get('n') if b['kind'] != 'check' else rn
                rows.append((lab % num if num else 'Practice (What’s In)', letter(b)))
            elif t == 'think':
                q = b['pred']['q']
                rows.append(('Think again: ' + html.escape(q if len(q) < 70 else q[:70].rsplit(' ', 1)[0] + '…'), letter(b['pred'])))
            elif t == 'act':
                d = b['data']
                if b['kind'] == 'label':
                    ans = '; '.join('%s %s' % ('ABCDEFGHIJ'[i], HEART_NAMES[x]) for i, x in enumerate(d['ids']))
                elif b['kind'] == 'sort':
                    ans = '; '.join('%s: <b>%s</b>' % (html.escape(it[0]), html.escape(d['cats'][it[1]])) for it in d['items'])
                else:
                    ans = ' → '.join(html.escape(x) for x in d['items'])
                rows.append((md(b['title']), ans))
    body = ''.join('<tr><th scope="row">%s</th><td>%s</td></tr>' % r for r in rows)
    return ('<figure class="tbl key"><figcaption>Lesson %d: %s</figcaption><div class="tbl__scroll"><table><thead><tr><th scope="col">Item</th><th scope="col">Answer</th></tr></thead>'
            '<tbody>%s</tbody></table></div></figure>') % (L, md(C['title']), body)

def tries_key(L):
    C = load('lesson%d' % L).LESSON
    out = ''
    for pid, pname in PARTS:
        for b, rn in walk(C['parts'][pid]['blocks']):
            if isinstance(b, dict) and b.get('type') == 'sim' and b.get('try'):
                where = ('Reading %d' % rn) if rn else PART_NAME[pid]
                out += '<tr><th scope="row">Lesson %d, %s</th><td><ol>%s</ol></td></tr>' % (L, where, ''.join('<li>%s</li>' % md(a) for q, a in b['try']))
    return out

# ---------------------------------------------------------------------------------------------- teacher, privacy and print pages
def doc_page(name, title, desc, inner, current=''):
    out = head('%s | BioInnovate' % title, desc)
    out += '<body class="lesson-page doc-page">\n' + header(current or name)
    out += '<main id="main" class="doc wrap"><p class="lp-head__k"><span class="dot" aria-hidden="true"></span>BioInnovate</p><h1>%s</h1>%s</main>' % (title, inner)
    out += footer() + SCRIPTS.replace('<script src="js/heart.js"></script>\n<script src="js/sims.js"></script>\n<script src="js/sims2.js"></script>\n', '') + '</body>\n</html>\n'
    return out

def blocks_html(blocks):
    return ''.join(block(0, b) for b in blocks)

def teacher_page():
    T = load('teacher')
    toc = ''.join('<li><a href="#%s">%s</a></li>' % (sid, html.escape(t)) for sid, t, _ in T.SECTIONS)
    body = ''.join('<section class="doc-sec" id="%s" aria-labelledby="%s-h"><h2 id="%s-h">%s</h2>%s</section>' % (sid, sid, sid, html.escape(t), blocks_html(bl)) for sid, t, bl in T.SECTIONS)
    tries = ''.join(tries_key(L) for L in (1, 2, 3, 4))
    keys = ''.join(answer_key(L) for L in (1, 2, 3, 4))
    body += ('<section class="doc-sec" id="tries" aria-labelledby="tries-h"><h2 id="tries-h">What to expect from the “Try this” questions</h2>'
             '<p>Learners type their own answers under each simulation and can open a model answer. These are the model answers.</p>'
             '<figure class="tbl"><div class="tbl__scroll"><table><thead><tr><th scope="col">Simulation</th><th scope="col">Model answers</th></tr></thead><tbody>%s</tbody></table></div></figure></section>'
             '<section class="doc-sec" id="key" aria-labelledby="key-h"><h2 id="key-h">Answer key</h2>'
             '<p>The module shows the answer and an explanation after each question, except in What I Know, which only says where each idea is taught. '
             'Like the answer key at the back of a self-learning module, this key is also printed at the end of each learner’s workbook.</p>%s</section>') % (tries, keys)
    inner = ('<p class="doc__lead">BioInnovate is a self-learning module: the learner does the work and the teacher facilitates. This guide covers the session plan, '
             'facilitation, online saving and the Google Sheet, and the answer key.</p><nav class="doc-toc" aria-label="On this page"><ol>%s<li><a href="#tries">What to expect from the “Try this” questions</a></li><li><a href="#key">Answer key</a></li></ol></nav>%s') % (toc, body)
    return doc_page('teacher.html', 'Teacher’s guide', 'How to run BioInnovate in eight sessions, how online saving works, and the answer key.', inner)

def privacy_page():
    T = load('teacher')
    return doc_page('privacy.html', 'Privacy', 'What BioInnovate saves about a student, where it is kept, and who can see it.',
                    '<p class="doc__lead">What BioInnovate saves, where it is kept, and who can see it.</p>' + blocks_html(T.PRIVACY), current='privacy.html')

def print_page():
    cards = ''.join(('<li class="pr-card"><p class="prog-card__k">Lesson %d</p><h2>%s</h2><p class="btn-row">'
                     '<a class="btn btn--primary" href="lesson-%d.html?print=blank">Blank workbook</a><a class="btn btn--secondary" href="lesson-%d.html?print=mine">With my answers</a></p></li>')
                    % (i + 1, html.escape(t), i + 1, i + 1) for i, (h, t, sub) in enumerate(NAV_LESSONS))
    inner = ('<p class="doc__lead">Print a lesson as a workbook, or save it as a PDF from the print window. A blank workbook has empty boxes for writing and the answer key at the end. '
             '“With my answers” prints the answers saved on this device.</p><ol class="pr-cards">%s</ol>'
             '<p class="doc-note">Simulations print as pictures with their questions. Print on a computer for the best result; on a phone, choose “Save as PDF” in the share or print menu.</p>') % cards
    return doc_page('print.html', 'Print the lessons', 'Print the BioInnovate lessons as workbooks or save them as PDF.', inner)

if __name__ == '__main__':
    manifest, parts_of = {}, {}
    for L in (1, 2, 3, 4):
        if not os.path.exists(os.path.join(ROOT, 'content', 'lesson%d.py' % L)):
            print('skip lesson', L); continue
        page = lesson_page(L)
        ids = re.findall(r'data-track="([^"]+)"', page)
        dup = set(i for i in ids if ids.count(i) > 1)
        if dup: raise SystemExit('duplicate track ids: %s' % sorted(dup))
        manifest[L] = ids
        for chunk in page.split('<section class="part" id="')[1:]:
            pid = chunk.split('"', 1)[0]
            for i in re.findall(r'data-track="([^"]+)"', chunk): parts_of[i] = pid
        open(os.path.join(ROOT, 'lesson-%d.html' % L), 'w').write(page)
        print('built lesson-%d.html: %d tracked items' % (L, len(ids)))
    tpl = open(os.path.join(ROOT, 'apps-script', 'Code.template.gs')).read()
    merge = open(os.path.join(ROOT, 'js', 'merge.js')).read()
    gs = tpl.replace('/*@@MANIFEST@@*/', '/* the tracked items of each lesson (from js/manifest.js) */\nvar MANIFEST = %s;' % json.dumps(manifest)).replace('/*@@MERGE@@*/', merge)
    open(os.path.join(ROOT, 'apps-script', 'Code.gs'), 'w').write(gs)
    with open(os.path.join(ROOT, 'js', 'manifest.js'), 'w') as f:
        f.write('/* generated by tools/build.py: the tracked items of each lesson, which set the completion percentages, and the part each one is in */\n'
                'window.BIO_MANIFEST = %s;\nwindow.BIO_PARTS = %s;\n' % (json.dumps(manifest), json.dumps(parts_of, separators=(',', ':'))))
    open(os.path.join(ROOT, 'glossary.html'), 'w').write(glossary_page())
    open(os.path.join(ROOT, 'references.html'), 'w').write(references_page())
    open(os.path.join(ROOT, 'progress.html'), 'w').write(progress_page())
    open(os.path.join(ROOT, 'teacher.html'), 'w').write(teacher_page())
    open(os.path.join(ROOT, 'privacy.html'), 'w').write(privacy_page())
    open(os.path.join(ROOT, 'print.html'), 'w').write(print_page())
    with open(os.path.join(ROOT, 'js', 'glossary.js'), 'w') as f:
        f.write('/* generated by tools/build.py from content/glossary.py */\nwindow.GLOSSARY = %s;\n' % json.dumps(
            {k: {'t': v['term'], 'd': re.sub(r'\[\[([^\]|]+)\|?[^\]]*\]\]', r'\1', v['def'])} for k, v in GLOSSARY.items()}, ensure_ascii=False))
    print('built glossary.html, references.html, js/glossary.js; terms used:', len(used_terms))
