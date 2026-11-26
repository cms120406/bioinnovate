#!/usr/bin/env python3
"""Builds BioInnovate.html: the whole module in one file that works without internet.

Every page is kept as text inside the file, and every stylesheet, script, picture and the font once each. When
the file opens, a small start-up script picks the page named after #! in the address (the home page if none),
puts the shared stylesheets and scripts back into it, and writes it into the document. A link to another page
reloads the file with that page's name after #!, so the browser's Back button works as on the website.
Work is saved in the browser as on the website, and online too when the student is signed in and connected.
Run after tools/build.py:  python3 -I tools/offline.py
"""
import base64, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ['index.html', 'lesson-1.html', 'lesson-2.html', 'lesson-3.html', 'lesson-4.html', 'glossary.html',
         'progress.html', 'teacher.html', 'references.html', 'privacy.html', 'print.html']

def read(p, mode='r'):
    with open(os.path.join(ROOT, p), mode) as f:
        return f.read()

def data_url(p):
    mime = {'svg': 'image/svg+xml', 'woff': 'font/woff', 'jpg': 'image/jpeg', 'png': 'image/png'}[p.rsplit('.', 1)[1]]
    return 'data:%s;base64,%s' % (mime, base64.b64encode(read(p, 'rb')).decode())

assets, pages = {}, {}
for name in PAGES:
    h = read(name)
    h = re.sub(r'<link rel="preload"[^>]*>\s*', '', h)
    h = re.sub(r'<meta property="og:image"[^>]*>\s*', '', h)
    for href in re.findall(r'<link rel="stylesheet" href="([^"]+)">', h):
        css = read(href.split('?')[0])
        if 'url("../fonts/figtree.woff")' in css:
            css = css.replace('url("../fonts/figtree.woff")', 'url("%s")' % data_url('fonts/figtree.woff'))
        assets[href] = css
    for src in re.findall(r'<script(?: type="module")? src="([^"]+)"></script>', h):
        assets[src] = read(src.split('?')[0]).replace('</script', '<\\/script')  # an inline script must not contain its own end tag
    for src in set(re.findall(r'src="(img/[^"]+)"', h)):
        h = h.replace('src="%s"' % src, 'src="%s"' % data_url(src))
    h = h.replace('href="favicon.svg"', 'href="%s"' % data_url('favicon.svg'))
    pages[name] = h

def js_text(o):
    """JSON that is safe inside a <script> element"""
    return json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/').replace('<!--', '<\\!--')

BOOT = r'''
(function () {
  var P = window.BIO_PAGES, A = window.BIO_ASSETS;
  /* which page: "#!lesson-2.html?print=blank#r3"; a plain "#r3" keeps the page we were on */
  var h = location.hash, name = '', search = '', anchor = '';
  var last = ''; try { last = sessionStorage.getItem('bio.page') || ''; } catch (e) { }
  if (h.indexOf('#!') === 0) {
    var m = /^#!([^?#]+)(\?[^#]*)?(?:#(.*))?$/.exec(h) || [];
    name = m[1] || ''; search = m[2] || ''; anchor = m[3] || '';
  } else { name = last; anchor = h.slice(1); }
  if (!P[name]) { name = 'index.html'; search = ''; }
  try { sessionStorage.setItem('bio.page', name); } catch (e) { }
  window.BIO_SEARCH = search;
  window.BIO_OFFLINE = true;
  var html = P[name]
    .replace(/<link rel="stylesheet" href="([^"]+)">/g, function (all, p) { return A[p] != null ? '<style>' + A[p] + '</style>' : ''; })
    .replace(/<script( type="module")? src="([^"]+)"><\/script>/g, function (all, mod, p) { return A[p] != null ? '<script' + (mod || '') + '>' + A[p] + '<\/script>' : ''; });
  /* links between pages stay inside this file */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey) return;
    var href = a.getAttribute('href');
    /* an anchor on this page: keep the page's name in the address, so Back and reloading still work */
    if (/^#[^!]/.test(href)) {
      e.preventDefault();
      location.hash = '#!' + name + search + href;
      var t = document.getElementById(decodeURIComponent(href.slice(1)));
      if (t) { t.scrollIntoView(); if (t.focus && href === '#main') t.focus(); }
      return;
    }
    var m2 = /^([a-z0-9-]+\.html)(\?[^#]*)?(#.*)?$/i.exec(href);
    if (!m2) return;
    e.preventDefault();
    if (m2[1] === 'BioInnovate.html') return;
    if (!P[m2[1]]) return;
    var to = '#!' + m2[1] + (m2[2] || '') + (m2[3] || '');
    if (m2[1] === name && !m2[2] && m2[3]) { location.hash = to; var t2 = document.getElementById(m2[3].slice(1)); if (t2) t2.scrollIntoView(); return; }
    location.hash = to;
    location.reload();
  }, true);
  window.addEventListener('hashchange', function () {
    var hh = location.hash;
    if (hh.indexOf('#!') !== 0) return;
    var m3 = /^#!([^?#]+)(\?[^#]*)?(?:#(.*))?$/.exec(hh) || [];
    if (m3[1] !== name || (m3[2] || '') !== search) { location.reload(); return; }
    if (m3[3]) { var t3 = document.getElementById(decodeURIComponent(m3[3])); if (t3) t3.scrollIntoView(); }
  });
  if (anchor) window.addEventListener('load', function () { var t = document.getElementById(decodeURIComponent(anchor)); if (t) t.scrollIntoView(); });
  document.write(html);
})();
'''

shell = ('<!doctype html>\n<meta charset="utf-8">\n<!-- BioInnovate offline file. Open it in a web browser; no internet connection is needed. -->\n'
         '<script>window.BIO_ASSETS=%s;\nwindow.BIO_PAGES=%s;</script>\n<script>%s</script>\n') % (js_text(assets), js_text(pages), BOOT)
open(os.path.join(ROOT, 'BioInnovate.html'), 'w').write(shell)
print('BioInnovate.html: %d KB, %d pages, %d shared files' % (len(shell.encode()) // 1024, len(pages), len(assets)))
