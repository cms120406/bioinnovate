# Small constructors for lesson content (used by content/lessonN.py)

def mcq(id, q, opts, a, kind='check', n=None, see=None):
    """opts: list of (text, feedback). For kind 'pre', feedback may be empty."""
    o = [(x, '') if isinstance(x, str) else x for x in opts]
    return {'type': 'mcq', 'id': id, 'q': q, 'o': o, 'a': a, 'kind': kind, 'n': n, 'see': see}

def pre(n, id, q, opts, a, see):
    return mcq(id, q, opts, a, kind='pre', n=n, see=see)

def check(id, q, opts, a):
    return mcq(id, q, opts, a, kind='check')

def practice(n, id, q, opts, a):
    return mcq(id, q, opts, a, kind='practice', n=n)

def assess(n, id, q, opts, a):
    return mcq(id, q, opts, a, kind='assess', n=n)

def pred(id, q, opts, a, why):
    return {'type': 'pred', 'id': id, 'q': q, 'o': opts, 'a': a, 'why': why}

def think(p):
    return {'type': 'think', 'pred': p}

def idea(id, s, sci):
    return {'type': 'idea', 'id': id, 's': s, 'sci': sci}

def table(cap, head, rows):
    return {'type': 'table', 'cap': cap, 'head': head, 'rows': rows}

def sim(name, cap, tries=None, static=False, opts=None):
    return {'type': 'sim', 'sim': name, 'cap': cap, 'try': tries or [], 'static': static, 'opts': opts}

def act(id, kind, title, how, data):
    return {'type': 'act', 'id': id, 'kind': kind, 'title': title, 'how': how, 'data': data}

def selfcheck(items):
    return {'type': 'self', 'items': items}

def task(id, title, ps, rows=5):
    return {'type': 'task', 'id': id, 'title': title, 'ps': ps, 'rows': rows}

def reading(n, of, title, blocks):
    return {'type': 'reading', 'n': n, 'of': of, 'title': title, 'blocks': blocks}

def score(label):
    return {'type': 'score', 'label': label}

def blood_switch():
    return {'type': 'blood'}

def part(blocks, intro=None):
    return {'intro': intro, 'blocks': blocks}
