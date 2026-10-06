#!/usr/bin/env python3
"""Builds WatchPriceGuide (https://watchpriceguide-us.web.app) into us-site/dist/.

A second, US-focused website made from the same watch data and photos as TimeVault
(../public/data/market and ../public/images/watches). Every page is a plain HTML file
with its own address (/rolex/daytona), so Google can read it, plus sitemap.xml.

Prices are display prices in US dollars ($15 to $24.99), picked from each watch's
name so they never change. They are not market prices; every page says so.

Run:  python3 us-site/build.py   (firebase deploy runs it automatically)
"""
import html
import re
import json
import shutil
from datetime import date, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / 'public'
DATA = SRC / 'data' / 'market'
OUT = HERE / 'dist'

NAME = 'WatchPriceGuide'
BASE_URL = 'https://watchpriceguide-us.web.app'
TAGLINE = 'Luxury watch reference numbers, specs and real photos'
EMAIL = 'vlathiya5944@gmail.com'
GA_ID = 'G-WB6MX0J4JW'   # Google Analytics

# Same "random" pattern as TimeVault (1500, 1599 ... 2499), in dollars.
PRICES = [1500, 1599, 1699, 1799, 1899, 1999, 2099, 2199, 2299, 2399, 2499]
LISTING_ROWS = 100   # listings shown on a model page
REF_PAGE_MIN = 20    # a reference number with at least this many listings gets its own page
REF_PAGE_ROWS = 50   # listings shown on a reference page
REF_ROWS = 60        # reference numbers shown on a model page

# Model whose photo is shown on each brand box (same picks as TimeVault).
BRAND_PICK = {
    'rolex': 'daytona', 'omega': 'seamaster-diver-300-m', 'longines': 'hydroconquest',
    'audemars-piguet': 'royal-oak-offshore-chronograph', 'cartier': 'pasha',
    'breitling': 'navitimer-1-b01-chronograph', 'patek-philippe': 'perpetual-calendar', 'seiko': 'alpinist',
    'iwc': 'big-pilot', 'tudor': 'black-bay', 'tag-heuer': 'carrera', 'oris': 'divers-sixty-five',
    'jaeger-lecoultre': 'master-geographic', 'zenith': 'el-primero-chronomaster', 'vacheron-constantin': 'fiftysix',
}
TOP_NAV = ['rolex', 'omega', 'patek-philippe', 'audemars-piguet', 'cartier', 'tag-heuer', 'breitling', 'tudor', 'iwc']
DATASET = 'https://www.kaggle.com/datasets/philmorekoung11/luxury-watch-listings'

esc = lambda s: html.escape(str(s if s is not None else ''), quote=True)
fmt = lambda n: f'{int(n):,}'


def price(bs, ms):
    """FNV-1a hash of "brand/model" -> one of PRICES (same pick as TimeVault)."""
    h = 2166136261
    for ch in f'{bs}/{ms}':
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return PRICES[h % len(PRICES)]


def usd(cents):
    return f'${cents // 100}' if cents % 100 == 0 else f'${cents / 100:.2f}'


PRICE_NOTE = '<p class="small muted">Display price – not a market price.</p>'


def load(name):
    return json.loads((DATA / name).read_text())


# ---------- page shell ----------
def page(path, title, description, body, crumbs=None, image=None, ld=None):
    canonical = BASE_URL + path
    og_img = BASE_URL + '/' + (image or BRAND_PH['rolex'])['src']
    ld_html = ''.join(f'<script type="application/ld+json">{json.dumps(x)}</script>' for x in (ld or []))
    nav = ''.join(f'<a href="/{s}">{esc(BRANDS[s]["brand"])}</a>' for s in TOP_NAV if s in BRANDS)
    footer_brands = ''.join(f'<li><a href="/{s}">{esc(BRANDS[s]["brand"])}</a></li>' for s in TOP_NAV if s in BRANDS)
    crumb_html = ''
    if crumbs:
        parts = [f'<a href="{u}">{esc(t)}</a>' if u else f'<span>{esc(t)}</span>' for t, u in crumbs]
        crumb_html = f'<div class="crumbs">{" / ".join(parts)}</div>'
        items = [{'@type': 'ListItem', 'position': i + 1, 'name': t, 'item': BASE_URL + (u or path)} for i, (t, u) in enumerate(crumbs)]
        crumb_html += f'<script type="application/ld+json">{json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items})}</script>'
    return f'''<!doctype html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <link rel="canonical" href="{canonical}">
  <meta name="theme-color" content="#0f1b2d">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{canonical}">
  <meta property="og:site_name" content="{NAME}">
  <meta property="og:image" content="{og_img}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
  <script>window.dataLayer = window.dataLayer || []; function gtag(){{dataLayer.push(arguments);}} gtag('js', new Date()); gtag('config', '{GA_ID}');</script>
  <link rel="icon" href="/images/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css?v={VERSION}">
  <link rel="stylesheet" href="/css/site.css?v={VERSION}">
</head>
<body>
  <div class="topbar">⌚ {len(MODELS)} luxury watch models with real photos &nbsp;·&nbsp; Reference numbers &amp; specs &nbsp;·&nbsp; Rolex to Patek Philippe</div>
  <header class="header">
    <div class="container header-inner">
      <button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu">☰</button>
      <a href="/" class="logo"><span class="logo-mark">⌚</span><span>{NAME}</span></a>
      <form class="search" action="/search" method="get" role="search">
        <input name="q" type="search" placeholder="Search Submariner, Aquanaut, Royal Oak…" aria-label="Search watches">
        <button type="submit" aria-label="Search">🔍</button>
      </form>
    </div>
    <nav class="nav" id="nav"><div class="container nav-inner" id="navLinks"><a href="/">Home</a>{nav}<a href="/brands">All Brands</a></div></nav>
  </header>
  <main id="app"><div class="container">{crumb_html}</div>{body}</main>{ld_html}
  <div class="ad-rail ad-rail-l" data-ad="160x600"></div>
  <div class="ad-rail ad-rail-r" data-ad="160x300"></div>
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="/" class="logo logo-light"><span class="logo-mark">⌚</span><span>{NAME}</span></a>
          <p class="muted-light">{TAGLINE}</p>
          <p class="muted-light small">Prices are display prices ($15–$24.99), not market prices. We do not sell watches. All trademarks belong to their owners.</p>
        </div>
        <div><h4>Explore</h4><ul><li><a href="/brands">All Brands</a></li><li><a href="/search">Search Watches</a></li><li><a href="/credits">Photo Credits</a></li></ul></div>
        <div><h4>Top Brands</h4><ul>{footer_brands}</ul></div>
        <div><h4>Company</h4><ul><li><a href="/about">About Us</a></li><li><a href="/contact">Contact Us</a></li><li><a href="/disclaimer">Disclaimer</a></li><li><a href="/privacy">Privacy Policy</a></li><li><a href="/terms">Terms of Use</a></li><li id="smartlink"></li></ul></div>
      </div>
      <div class="footer-bottom">© {date.today().year} {NAME}. All rights reserved.</div>
    </div>
  </footer>
  <script src="/js/config.js?v={VERSION}"></script>
  <script src="/js/ads.js?v={VERSION}"></script>
  <script src="/js/site.js?v={VERSION}"></script>
</body>
</html>
'''


def write(path, text, image=None):
    """/rolex/daytona -> dist/rolex/daytona/index.html, served at /rolex/daytona.
    (Folders, not cleanUrls, so Google's .html verification file is not redirected.)"""
    f = OUT / ('404.html' if path == '/404' else (path.strip('/') + '/index.html').lstrip('/'))
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(text)
    if path != '/404':
        SITEMAP.append((path, image))


# ---------- building blocks ----------
def img(p, alt):
    if not p:
        return f'<div class="card-img mk-nophoto"><span>{esc(alt[:2])}</span></div>'
    return f'<div class="card-img mk-photo"><img src="/{esc(p["src"])}" alt="{esc(alt)}" loading="lazy"></div>'


def model_card(m):
    bs, ms = m['bs'], m['slug']
    return f'''<a class="card mk-card" href="/{bs}/{ms}">{img(PH.get(f"{bs}/{ms}"), m["brand"] + " " + m["model"])}
      <div class="card-body"><div class="card-brand">{esc(m["brand"])}</div><div class="card-title">{esc(m["model"])}</div>
        <div class="small muted">{fmt(m["listings"])} listings · {fmt(m["refCount"])} refs</div>
        <div class="price-row"><span class="price">{usd(price(bs, ms))}</span></div></div></a>'''


def brand_card(b):
    return f'''<a class="card mk-card" href="/{b["slug"]}">{img(BRAND_PH.get(b["slug"]), b["brand"])}
      <div class="card-body"><div class="card-title">{esc(b["brand"])}</div>
        <div class="small muted">{fmt(b["listings"])} listings · {len(b["shown"])} models</div>
        <div class="price-row"><span class="small muted">From</span><span class="price">{usd(min(price(b["slug"], m["slug"]) for m in b["shown"]))}</span></div></div></a>'''


# Native ad rows inside grids are added by site.js (every 3 rows, based on screen width).
grid = lambda cards: f'<div class="grid">{"".join(cards)}</div>'
ad = lambda t='728x90': f'<div data-ad="{t}" class="ad-slot"></div>'
ad_top = lambda t='728x90': f'<div data-ad="{t}" data-desktop-only class="ad-slot"></div>'
native_row = '<div class="native-row native-slot" data-ad="native-frame"></div>'


def section(title, link, inner):
    more = f'<a href="{link}" class="link">View all →</a>' if link else ''
    return f'<section class="section"><div class="section-head"><h2>{title}</h2>{more}</div>{inner}</section>'


def source_note(n=None):
    extra = f' ({fmt(n)} listings from chrono24.com, July 2023)' if n else ''
    return (f'<p class="small muted mk-source">Prices on this site are display prices between $15 and $24.99 set by {NAME}; '
            f'they are not market prices or offers. Model and listing details: <a class="link" href="{DATASET}" target="_blank" '
            f'rel="noopener">Luxury Watch Listings dataset</a> by Philmore Koung{extra}.</p>')


def credit(p):
    lic = f'<a class="link" href="{esc(p["licenceUrl"])}" target="_blank" rel="noopener">{esc(p["licence"])}</a>' if p.get('licenceUrl') else esc(p['licence'])
    return f'<p class="small muted mk-credit">Photo: <a class="link" href="{esc(p["page"])}" target="_blank" rel="noopener">{esc(p["author"])}</a>, {lic}, via Wikimedia Commons</p>'


def faq(items):
    """Questions and answers shown on the page, plus FAQPage data for Google."""
    items = [(q, a) for q, a in items if a]
    html_ = ''.join(f'<details class="faq"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in items)
    data = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in items]}
    return f'<section class="section"><div class="section-head"><h2>Frequently Asked Questions</h2></div>{html_}</section>', data


CLEAN_REF = re.compile(r'^[A-Z0-9][A-Z0-9.\-/]{3,14}$', re.I)


def ref_slug(ref):
    return re.sub(r'[^a-z0-9]+', '-', ref.lower()).strip('-')


def ref_pages_for(m):
    """Reference numbers of a model that get their own page: {ref: slug}."""
    out, used = {}, set()
    for r in m['refs']:
        ref = r['ref']
        if r['n'] >= REF_PAGE_MIN and ref and CLEAN_REF.match(ref) and re.search(r'\d', ref):
            slug = ref_slug(ref)
            if slug and slug not in used:
                used.add(slug)
                out[ref] = slug
    return out


def common(values, n=1):
    counts = {}
    for v in values:
        if v:
            counts[v] = counts.get(v, 0) + 1
    return [k for k, _ in sorted(counts.items(), key=lambda x: -x[1])[:n]]


# ---------- pages ----------
def home():
    brands = [b for b in BRANDS.values() if b['shown']]
    total = sum(m['listings'] for m in MODELS)
    body = f'''<section class="hero"><div class="container hero-inner">
      <div class="hero-text">
        <span class="eyebrow">Luxury Watch Guide</span>
        <h1>Luxury Watch Reference Numbers &amp; Specs</h1>
        <p>Reference numbers, specs and {fmt(total)} real listings of {len(MODELS)} models from {len(brands)} luxury brands – Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier, Tudor and more.</p>
        <form class="mk-search" action="/search" method="get"><input name="q" type="search" placeholder="Search a model, e.g. Submariner, Aquanaut, Royal Oak…" aria-label="Search models"><button class="btn btn-gold">Search</button></form>
        <div class="hero-trust"><span>✔ {fmt(total)} listings</span><span>✔ Real photos</span><span>✔ Reference numbers</span></div>
      </div>
      <div class="hero-stats">
        <div><strong>{fmt(total)}</strong><span>real listings</span></div>
        <div><strong>{len(MODELS)}</strong><span>models</span></div>
        <div><strong>{len(PH)}</strong><span>real photos</span></div>
        <div><strong>{len(brands)}</strong><span>luxury brands</span></div>
      </div>
    </div></section>
    <div class="container">
      {ad_top()}
      {section('Browse by Brand', '/brands', grid(brand_card(b) for b in brands[:10]))}
      {native_row}
      {section(f'⌚ All Watches <span class="muted">({len(MODELS)})</span>', '', grid(model_card(m) for m in sorted(MODELS, key=lambda m: -m['listings'])))}
      {source_note(total)}
    </div>'''
    ld = [{'@context': 'https://schema.org', '@type': 'WebSite', 'name': NAME, 'url': BASE_URL + '/',
           'potentialAction': {'@type': 'SearchAction', 'target': BASE_URL + '/search?q={search_term_string}', 'query-input': 'required name=search_term_string'}},
          {'@context': 'https://schema.org', '@type': 'Organization', 'name': NAME, 'url': BASE_URL + '/', 'email': EMAIL}]
    write('/', page('/', f'{NAME} – Luxury Watch Reference Numbers, Specs & Photos',
                    f'Reference numbers, specs and real photos of {len(MODELS)} luxury watch models from Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier, Tudor and more.', body, ld=ld))


def brands_page():
    brands = [b for b in BRANDS.values() if b['shown']]
    body = f'''<div class="container"><h1>All Watch Brands <span class="muted">({len(brands)})</span></h1>
      {ad_top()}{grid(brand_card(b) for b in brands)}{ad('native')}{source_note()}</div>'''
    write('/brands', page('/brands', f'All Luxury Watch Brands – {NAME}',
                          'Browse luxury watch brands: Rolex, Omega, Patek Philippe, Audemars Piguet, Cartier, Breitling, Tudor, IWC and more.',
                          body, [('Home', '/'), ('All Brands', None)]))


def brand_page(b):
    bs, models = b['slug'], b['shown']
    top = ', '.join(m['model'] for m in models[:4])
    biggest = max(models, key=lambda m: m['refCount'])
    faq_html, faq_ld = faq([
        (f'How many {b["brand"]} models are there?', f'This guide lists {len(models)} {b["brand"]} models with real photos, from {models[0]["model"]} to {models[-1]["model"]}, with {fmt(b["listings"])} real listings.'),
        (f'What is the most popular {b["brand"]} watch?', f'By number of listings, the most popular {b["brand"]} models are {top}. The {b["brand"]} {models[0]["model"]} alone has {fmt(models[0]["listings"])} listings.'),
        (f'Which {b["brand"]} model has the most reference numbers?', f'The {b["brand"]} {biggest["model"]} has the most, with {fmt(biggest["refCount"])} reference numbers.'),
    ])
    body = f'''<div class="container">
      <h1>{esc(b["brand"])} Watches <span class="muted">({len(models)} models)</span></h1>
      <p class="muted">{fmt(b["listings"])} real {esc(b["brand"])} listings in our data. The most listed models are {esc(top)}. Open a model to see its reference numbers, specs and listings.</p>
      <div class="mk-stats">
        <div><span>Models</span><strong>{len(models)}</strong></div>
        <div><span>Listings</span><strong>{fmt(b["listings"])}</strong></div>
        <div><span>Reference numbers</span><strong>{fmt(sum(m["refCount"] for m in models))}</strong></div>
      </div>
      {ad_top('native')}
      {grid(model_card(m) for m in models)}
      {ad()}
      <section class="section"><div class="section-head"><h2>List of All {esc(b["brand"])} Models (A–Z)</h2></div>
        <ul class="az-list">{''.join(f'<li><a class="link" href="/{bs}/{m["slug"]}">{esc(b["brand"])} {esc(m["model"])}</a> <span class="muted small">({fmt(m["refCount"])} refs)</span></li>' for m in sorted(models, key=lambda m: m["model"]))}</ul>
      </section>
      {faq_html}
      {source_note(b["listings"])}
    </div>'''
    write(f'/{bs}', page(f'/{bs}', f'All {b["brand"]} Models List ({len(models)}) – Photos, Specs & Reference Numbers | {NAME}',
                         f'List of all {len(models)} {b["brand"]} watch models with real photos, reference numbers and specs: {top} and more.',
                         body, [('Home', '/'), ('Brands', '/brands'), (b['brand'], None)], image=BRAND_PH.get(bs), ld=[faq_ld]), BRAND_PH.get(bs))


def model_page(b, m, others):
    bs, ms = b['slug'], m['slug']
    d = load(f'l/{bs}/{ms}.json')
    ph = PH.get(f'{bs}/{ms}')
    name = f'{b["brand"]} {m["model"]}'
    ref_count = {}
    for r in d['rows']:
        ref_count[r[0]] = ref_count.get(r[0], 0) + 1
    refpages = ref_pages_for(m)
    ref_link = lambda ref: f'<a class="link" href="/{bs}/{ms}/{refpages[ref]}">{esc(ref)}</a>' if ref in refpages else esc(ref or '—')
    ref_rows = ''.join(
        f'<tr><td>{ref_link(r["ref"])}</td><td>{fmt(ref_count.get(i, 0))}</td><td>{esc(r.get("mvmt") or "–")}</td>'
        f'<td class="hide-sm">{esc(" · ".join(x for x in [r.get("case"), r.get("size") and r["size"] + " mm"] if x))}</td></tr>'
        for i, r in enumerate(m['refs'][:REF_ROWS]))
    rows = sorted(d['rows'], key=lambda r: str(r[4]), reverse=True)[:LISTING_ROWS]
    list_rows = ''.join(
        f'<tr><td>{esc(d["refs"][r[0]] if r[0] < len(d["refs"]) else "—")}</td><td>{esc(r[1] or "")}</td><td>{esc(r[4] or "–")}</td>'
        f'<td>{esc(d["cond"][r[3]] if r[3] is not None and r[3] < len(d["cond"]) else "–")}</td>'
        f'<td class="hide-sm">{esc(" / ".join(x for x in [r[5], r[6]] if x) or "–")}</td><td class="hide-sm">{esc(r[9]) + " mm" if r[9] else "–"}</td></tr>'
        for r in rows)
    facts = [f'{fmt(m["listings"])} real listings', f'{fmt(m["refCount"])} reference numbers']
    spec_text = ', '.join(x for x in [m.get('case') and f'a {m["case"].lower()} case', m.get('size') and f'a typical size of {m["size"]} mm', m.get('mvmt') and f'{m["mvmt"].lower()} movement'] if x)
    top_refs = ', '.join(r['ref'] for r in m['refs'][:3] if r['ref'])
    intro = (f'The {esc(name)} has {" and ".join(facts)} in our data.'
             + (f' Most listings have {esc(spec_text)}.' if spec_text else '')
             + (f' The most listed reference numbers are {esc(top_refs)}.' if top_refs else ''))
    years = [str(r[4]) for r in d['rows'] if str(r[4]).isdigit()]
    conds = common((d['cond'][r[3]] for r in d['rows'] if r[3] is not None and r[3] < len(d['cond'])), 1)
    faq_html, faq_ld = faq([
        (f'What size is the {name}?', m.get('size') and f'Most {name} listings have a {m["size"]} mm case.'),
        (f'What is the {name} made of?', m.get('case') and f'The most common case material for the {name} is {m["case"].lower()}.'),
        (f'How many {name} reference numbers are there?', f'There are {fmt(m["refCount"])} reference numbers for the {name} in our data. The most listed are {top_refs}.' if top_refs else None),
        (f'What is the most popular {name} reference?', m['refs'] and m['refs'][0]['ref'] and f'Reference {m["refs"][0]["ref"]} is the most listed {name}, with {fmt(m["refs"][0]["n"])} listings.'),
        (f'Which years of the {name} are listed?', years and f'Listings with a known year range from {min(years)} to {max(years)}.'),
        (f'What condition are most {name} listings in?', conds and f'Most listings are in "{conds[0]}" condition.'),
    ])
    same = [x for x in others if x['bs'] == bs][:8]
    seed = price(bs, ms)
    rest = sorted((x for x in others if x['bs'] != bs), key=lambda x: (price(x['bs'], x['slug']) * seed + len(x['slug'])) % 997)[:12]
    body = f'''<div class="container">
      <div class="mk-model{" has-photo" if ph else ""}">
        {f'<figure class="mk-figure"><img src="/{esc(ph["src"])}" alt="{esc(name)}">{credit(ph)}</figure>' if ph else ''}
        <div>
          <div class="card-brand">{esc(b["brand"])}</div>
          <h1>{esc(name)}</h1>
          <div class="price-row big"><span class="price">{usd(price(bs, ms))}</span></div>
          {PRICE_NOTE}
          <p class="muted">{intro}</p>
          <div class="quick-specs">
            <div><span>Movement</span><strong>{esc(m.get("mvmt") or "–")}</strong></div>
            <div><span>Case material</span><strong>{esc(m.get("case") or "–")}</strong></div>
            <div><span>Typical size</span><strong>{esc(m["size"]) + " mm" if m.get("size") else "–"}</strong></div>
            <div><span>Listings</span><strong>{fmt(m["listings"])}</strong></div>
          </div>
          {ad('300x250')}
        </div>
      </div>
      {native_row}
      <section class="section"><div class="section-head"><h2>{esc(name)} Reference Numbers</h2>{f'<span class="small muted">Top {REF_ROWS} of {len(m["refs"])}</span>' if len(m["refs"]) > REF_ROWS else ''}</div>
        <div class="table-wrap"><table class="mk-table"><thead><tr><th>Reference</th><th>Listings</th><th>Movement</th><th class="hide-sm">Case · Size</th></tr></thead><tbody>{ref_rows}</tbody></table></div>
      </section>
      {native_row}
      <section class="section"><div class="section-head"><h2>{esc(name)} Listings <span class="muted">({fmt(len(d["rows"]))})</span></h2>{f'<span class="small muted">Newest {LISTING_ROWS}</span>' if len(d["rows"]) > LISTING_ROWS else ''}</div>
        <div class="table-wrap"><table class="mk-table"><thead><tr><th>Reference</th><th>Description</th><th>Year</th><th>Condition</th><th class="hide-sm">Case / Bracelet</th><th class="hide-sm">Size</th></tr></thead><tbody>{list_rows}</tbody></table></div>
      </section>
      {ad('native')}
      {faq_html}
      {section(f'More from {esc(b["brand"])}', f'/{bs}', grid(model_card(x) for x in same)) if same else ''}
      {section('You may also like', '/brands', grid(model_card(x) for x in rest))}
      {source_note(m["listings"])}
    </div>'''
    for r in m['refs']:
        if r['ref'] in refpages:
            ref_page(b, m, r, refpages, d)
    write(f'/{bs}/{ms}', page(f'/{bs}/{ms}', f'{name} – All {fmt(m["refCount"])} Reference Numbers, Specs & Photos | {NAME}',
                              f'{name}: {fmt(m["refCount"])} reference numbers, specs and {fmt(m["listings"])} real listings with a real photo.'
                              + (f' Top references: {top_refs}.' if top_refs else ''),
                              body, [('Home', '/'), ('Brands', '/brands'), (b['brand'], f'/{bs}'), (m['model'], None)], image=ph, ld=[faq_ld]), ph)


def ref_page(b, m, r, refpages, d):
    """One page per reference number, e.g. /rolex/daytona/116520."""
    bs, ms, ref = b['slug'], m['slug'], r['ref']
    ph = PH.get(f'{bs}/{ms}')
    i = d['refs'].index(ref) if ref in d['refs'] else -1
    rows = [x for x in d['rows'] if x[0] == i]
    title_name = f'{b["brand"]} {ref} {m["model"]}'
    cond = lambda x: d['cond'][x[3]] if x[3] is not None and x[3] < len(d['cond']) else ''
    years = sorted({str(x[4]) for x in rows if str(x[4]).isdigit()})
    cond_counts = {}
    for x in rows:
        if cond(x):
            cond_counts[cond(x)] = cond_counts.get(cond(x), 0) + 1
    year_counts = {}
    for x in rows:
        if str(x[4]).isdigit():
            year_counts[str(x[4])] = year_counts.get(str(x[4]), 0) + 1
    share = round(100 * r['n'] / max(1, m['listings']))
    specs = [('Model', f'{b["brand"]} {m["model"]}'), ('Reference', ref), ('Case material', r.get('case')), ('Bracelet', r.get('brace')),
             ('Case size', r.get('size') and r['size'] + ' mm'), ('Movement', r.get('mvmt')), ('Listings', fmt(len(rows) or r['n'])),
             ('Years listed', years and (years[0] if len(years) == 1 else f'{years[0]}–{years[-1]}'))]
    spec_html = ''.join(f'<div><span>{k}</span><strong>{esc(v)}</strong></div>' for k, v in specs if v)
    desc_bits = ', '.join(x for x in [r.get('case') and f'a {r["case"].lower()} case', r.get('brace') and f'a {r["brace"].lower()} bracelet', r.get('size') and f'a {r["size"]} mm size'] if x)
    intro = (f'Reference {ref} is a {b["brand"]} {m["model"]}' + (f' with {desc_bits}' if desc_bits else '') + '. '
             f'It has {fmt(len(rows) or r["n"])} listings in our data, about {share}% of all {m["model"]} listings.'
             + (f' Listings with a known year range from {years[0]} to {years[-1]}.' if len(years) > 1 else ''))
    newest = sorted(rows, key=lambda x: str(x[4]), reverse=True)[:REF_PAGE_ROWS]
    list_rows = ''.join(f'<tr><td>{esc(x[1] or "–")}</td><td>{esc(x[4] or "–")}</td><td>{esc(cond(x) or "–")}</td>'
                        f'<td class="hide-sm">{esc(" / ".join(y for y in [x[5], x[6]] if y) or "–")}</td><td class="hide-sm">{esc(x[9]) + " mm" if x[9] else "–"}</td></tr>' for x in newest)
    breakdown = lambda counts: ''.join(f'<tr><td>{esc(k)}</td><td>{fmt(v)}</td></tr>' for k, v in sorted(counts.items(), key=lambda kv: -kv[1])[:10])
    siblings = ''.join(f'<a class="chip chip-sm{" active" if s == ref else ""}" href="/{bs}/{ms}/{slug}">{esc(s)}</a>' for s, slug in refpages.items())
    faq_html, faq_ld = faq([
        (f'What is {b["brand"]} {ref}?', f'{b["brand"]} {ref} is a reference number of the {b["brand"]} {m["model"]}' + (f', with {desc_bits}' if desc_bits else '') + '.'),
        (f'What size is the {b["brand"]} {ref}?', r.get('size') and f'The {b["brand"]} {ref} has a {r["size"]} mm case.'),
        (f'What is the {b["brand"]} {ref} made of?', r.get('case') and f'The case is {r["case"].lower()}' + (f' and the bracelet is {r["brace"].lower()}.' if r.get('brace') else '.')),
        (f'Which years of the {b["brand"]} {ref} are listed?', len(years) > 1 and f'Listings with a known year range from {years[0]} to {years[-1]}.'),
        (f'How popular is the {b["brand"]} {ref}?', f'It has {fmt(len(rows) or r["n"])} listings, about {share}% of all {b["brand"]} {m["model"]} listings in our data.'),
    ])
    body = f'''<div class="container">
      <div class="mk-model{" has-photo" if ph else ""}">
        {f'<figure class="mk-figure"><img src="/{esc(ph["src"])}" alt="{esc(b["brand"] + " " + m["model"])}">{credit(ph)}<p class="small muted">Photo shows the {esc(m["model"])} family and may differ from reference {esc(ref)}.</p></figure>' if ph else ''}
        <div>
          <div class="card-brand"><a class="link" href="/{bs}/{ms}">{esc(b["brand"])} {esc(m["model"])}</a></div>
          <h1>{esc(title_name)}</h1>
          <div class="price-row big"><span class="price">{usd(price(bs, ms + "/" + ref))}</span></div>
          {PRICE_NOTE}
          <p class="muted">{esc(intro)}</p>
          <div class="quick-specs">{spec_html}</div>
          {ad('300x250')}
        </div>
      </div>
      {native_row}
      <section class="section"><div class="section-head"><h2>{esc(b["brand"])} {esc(ref)} Listings by Condition</h2></div>
        <div class="table-wrap"><table class="mk-table"><thead><tr><th>Condition</th><th>Listings</th></tr></thead><tbody>{breakdown(cond_counts) or '<tr><td colspan="2" class="muted">Not known</td></tr>'}</tbody></table></div></section>
      {f'<section class="section"><div class="section-head"><h2>{esc(b["brand"])} {esc(ref)} Listings by Year</h2><span class="small muted">Top 10 years</span></div><div class="table-wrap"><table class="mk-table"><thead><tr><th>Year</th><th>Listings</th></tr></thead><tbody>{breakdown(year_counts)}</tbody></table></div></section>' if year_counts else ''}
      {native_row}
      <section class="section"><div class="section-head"><h2>{esc(b["brand"])} {esc(ref)} Listings <span class="muted">({fmt(len(rows))})</span></h2>{f'<span class="small muted">Newest {REF_PAGE_ROWS}</span>' if len(rows) > REF_PAGE_ROWS else ''}</div>
        <div class="table-wrap"><table class="mk-table"><thead><tr><th>Description</th><th>Year</th><th>Condition</th><th class="hide-sm">Case / Bracelet</th><th class="hide-sm">Size</th></tr></thead><tbody>{list_rows}</tbody></table></div></section>
      {faq_html}
      <section class="section"><div class="section-head"><h2>Other {esc(b["brand"])} {esc(m["model"])} References</h2><a class="link" href="/{bs}/{ms}">All {fmt(m["refCount"])} references →</a></div><div class="chips">{siblings}</div></section>
      {ad('native')}
      {source_note(len(rows))}
    </div>'''
    path = f'/{bs}/{ms}/{refpages[ref]}'
    write(path, page(path, f'{title_name} – Specs, Size, Years & Listings | {NAME}',
                     f'{b["brand"]} {ref} ({m["model"]}): ' + (f'{desc_bits}, ' if desc_bits else '') + f'{fmt(len(rows) or r["n"])} real listings'
                     + (f' from {years[0]} to {years[-1]}' if len(years) > 1 else '') + '. Specs, condition and year breakdown.',
                     body, [('Home', '/'), ('Brands', '/brands'), (b['brand'], f'/{bs}'), (m['model'], f'/{bs}/{ms}'), (ref, None)], image=ph, ld=[faq_ld]), ph)


def search_page():
    body = f'''<div class="container">
      <h1 id="searchTitle">Search Watches</h1>
      <form class="mk-search" action="/search" method="get"><input id="searchQ" name="q" type="search" placeholder="Search a model or reference number…" aria-label="Search"><button class="btn btn-gold">Search</button></form>
      {ad_top('native')}
      <div id="searchResults">{grid(model_card(m) for m in sorted(MODELS, key=lambda m: -m['listings']))}</div>
    </div>'''
    write('/search', page('/search', f'Search Luxury Watches – {NAME}', 'Search luxury watch models and reference numbers.', body, [('Home', '/'), ('Search', None)]))


def credits_page():
    names = {f'{m["bs"]}/{m["slug"]}': f'{m["brand"]} {m["model"]}' for m in MODELS}
    rows = ''.join(
        f'<tr><td><a class="link" href="/{k}">{esc(names.get(k, k))}</a></td><td><a class="link" href="{esc(p["page"])}" target="_blank" rel="noopener">{esc(p["title"])}</a></td>'
        f'<td>{esc(p["author"])}</td><td>{esc(p["licence"])}</td></tr>' for k, p in sorted(PH.items()) if k in names)
    body = f'''<div class="container"><h1>Photo Credits</h1>
      <p class="muted">All watch photos on this site come from <a class="link" href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a> and are used under the free licences listed below. Photos show the model family and may not match every reference number exactly.</p>
      <div class="table-wrap"><table class="mk-table"><thead><tr><th>Watch</th><th>File</th><th>Author</th><th>Licence</th></tr></thead><tbody>{rows}</tbody></table></div>{ad()}</div>'''
    write('/credits', page('/credits', f'Photo Credits – {NAME}', 'Credits and licences for the watch photos on this site.', body, [('Home', '/'), ('Photo Credits', None)]))


INFO = {
    'about': ('About Us', f'<p>{NAME} is a free luxury watch guide with real photos, reference numbers and specs of {{models}} models from Rolex, Omega, Patek Philippe, Audemars Piguet, Cartier, Tudor and other luxury brands, plus real listings.</p><p>Prices shown on this site are display prices between $15 and $24.99. They are not market prices and not offers – we do not sell watches. Model and listing details come from the <a class="link" href="{DATASET}" target="_blank" rel="noopener">Luxury Watch Listings dataset</a> (chrono24.com, July 2023).</p>'),
    'contact': ('Contact Us', f'<p>Questions or feedback? Let us know.</p><ul class="contact-list"><li>✉️ Email: <a class="link" href="mailto:{EMAIL}">{EMAIL}</a></li></ul>'),
    'disclaimer': ('Disclaimer', f'<p>{NAME} is an independent information website. We do not sell watches and are not affiliated with, endorsed by or sponsored by any watch brand, retailer or marketplace mentioned. All brand names and trademarks belong to their respective owners and are used only to identify the products.</p><p><strong>Prices on this site are display prices between $15 and $24.99 chosen by us. They are not the real market price of any watch, not offers, and must not be relied on.</strong> Real luxury watches from these brands usually cost far more.</p><p>Watch photos come from Wikimedia Commons under free licences (see <a class="link" href="/credits">Photo Credits</a>). They show the model family and may not match every reference number, dial or year listed.</p>'),
    'privacy': ('Privacy Policy', f'<p>We do not require you to create an account and we do not collect personal information.</p><p><strong>Analytics:</strong> We use Google Analytics to count visits and see which pages are popular. It uses cookies and collects information such as pages viewed, device type and approximate location. It does not tell us who you are.</p><p><strong>Advertising:</strong> This website shows ads served by third-party networks such as Adsterra. These partners may use cookies or similar technologies to show relevant ads and measure performance. You can control cookies through your browser settings.</p><p>For any privacy questions, contact {EMAIL}.</p>'),
    'terms': ('Terms of Use', '<p>By using this website you agree to these terms. All information is provided "as is" for general information only. Prices shown are display prices, not market prices. We make no guarantee that specifications are complete or current. We are not responsible for any purchase decision made based on this website.</p>'),
}


def info_pages():
    for slug, (title, text) in INFO.items():
        body = f'<div class="container narrow prose"><h1>{title}</h1>{text.replace("{models}", str(len(MODELS)))}{ad()}{ad("native")}</div>'
        write(f'/{slug}', page(f'/{slug}', f'{title} – {NAME}', f'{title} for {NAME}, a free luxury watch guide.', body, [('Home', '/'), (title, None)]))


def not_found():
    body = '<div class="container narrow empty"><h1>Page not found</h1><a href="/" class="btn">Go home</a></div>'
    write('/404', page('/404', f'Page not found – {NAME}', 'Page not found.', body))


def sitemap():
    today = date.today().isoformat()
    img_tag = lambda im: f'<image:image><image:loc>{BASE_URL}/{esc(im["src"])}</image:loc></image:image>' if im else ''
    urls = ''.join(f'<url><loc>{BASE_URL}{p}</loc><lastmod>{today}</lastmod>{img_tag(im)}</url>' for p, im in SITEMAP)
    (OUT / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                                     f'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">{urls}</urlset>\n')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {BASE_URL}/sitemap.xml\n')


# ---------- build ----------
if __name__ == '__main__':
    VERSION = datetime.now().strftime('%Y%m%d%H%M')
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / 'css').mkdir(parents=True)
    (OUT / 'js').mkdir()
    shutil.copy(SRC / 'css' / 'style.css', OUT / 'css' / 'style.css')
    shutil.copy(SRC / 'js' / 'ads.js', OUT / 'js' / 'ads.js')
    for f in (HERE / 'static').rglob('*'):
        if f.is_file():
            (OUT / f.relative_to(HERE / 'static')).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(f, OUT / f.relative_to(HERE / 'static'))
    shutil.copytree(SRC / 'images', OUT / 'images')

    PH = load('images.json')
    idx = load('index.json')
    BRANDS, MODELS, SITEMAP = {}, [], []
    for b in idx['brands']:
        data = load(f'{b["slug"]}.json')
        data['shown'] = [m for m in data['models'] if f'{b["slug"]}/{m["slug"]}' in PH]
        for m in data['shown']:
            m['bs'], m['brand'] = b['slug'], b['brand']
        BRANDS[b['slug']] = data
        MODELS += data['shown']
    BRAND_PH = {}
    for bs, b in BRANDS.items():
        pick = f'{bs}/{BRAND_PICK.get(bs, "")}'
        BRAND_PH[bs] = PH.get(pick) or next((PH[f'{bs}/{m["slug"]}'] for m in b['shown']), None)

    home()
    brands_page()
    for b in BRANDS.values():
        if b['shown']:
            brand_page(b)
            others = sorted(MODELS, key=lambda m: -m['listings'])
            for m in b['shown']:
                model_page(b, m, [x for x in others if x is not m])
    search_page()
    credits_page()
    info_pages()
    not_found()
    # Search data for /search (name, reference numbers, address).
    (OUT / 'search.json').write_text(json.dumps([[f'{m["brand"]} {m["model"]}', ' '.join(r['ref'] for r in m['refs'][:40]), f'/{m["bs"]}/{m["slug"]}'] for m in MODELS]))
    sitemap()
    print(f'Built {len(SITEMAP)} pages ({len(MODELS)} models, {sum(1 for p, _ in SITEMAP if p.count("/") == 3)} reference numbers, {sum(1 for b in BRANDS.values() if b["shown"])} brands) into {OUT}')
