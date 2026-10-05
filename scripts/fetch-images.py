#!/usr/bin/env python3
"""
Finds free-licence photos on Wikimedia Commons for the watch models in
public/data/market/ and downloads them to public/images/watches/.

Only files whose title clearly names the brand and the model are used.
Every photo keeps its author and licence in public/data/market/images.json,
which the site shows under the photo and on the Photo Credits page
(CC BY / CC BY-SA licences require this).

Usage:  python3 scripts/fetch-images.py           # search by model name
        python3 scripts/fetch-images.py --more    # for models still without a photo:
                                                  # search by reference number, then Wikipedia
"""
import json, os, re, sys, threading, time, urllib.error, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public')
DATA = os.path.join(ROOT, 'data', 'market')
OUT = os.path.join(ROOT, 'images', 'watches')
API = 'https://commons.wikimedia.org/w/api.php'
UA = 'TimeVaultWatchPrices/1.0 (https://timevault-watches-2026.web.app; image credits shown on site)'
WIDTH = 500  # one of Wikimedia's standard thumbnail sizes (other sizes get rate-limited)

# Words that don't identify a model on their own.
GENERIC = {'date', 'watch', 'watches', 'automatic', 'chronograph', 'quartz', 'lady', 'ladies', 'men', 'mens', 'women',
           'classic', 'collection', 'the', 'and', 'with', 'steel', 'gold', 'other', 'models', 'gmt', 'ii', 'iii', 'mm',
           'small', 'large', 'mini', 'new', 'vintage', 'edition', 'limited', 'sport', 'sports', 'professional'}
BRAND_KEY = {'Audemars Piguet': ['audemars'], 'Patek Philippe': ['patek'], 'A. Lange & Söhne': ['lange'], 'TAG Heuer': ['tag heuer', 'heuer'],
             'Jaeger-LeCoultre': ['jaeger', 'lecoultre'], 'Vacheron Constantin': ['vacheron'], 'Richard Mille': ['richard mille']}
BAD_WORDS = ('homage', 'replica', 'fake', 'counterfeit', 'lume', 'strap', 'bracelet', 'movement', 'calibre', 'caliber', 'clasp', 'crown',
             'logo', 'box', 'advert', 'store', 'shop', 'boutique', 'building', 'sign', 'factory', 'museum', 'svg', 'poster', 'ad ', 'manual')
OK_LICENCE = re.compile(r'^(CC0|CC[- ]BY|Public domain|PD|GFDL|Attribution|FAL)', re.I)


_lock = threading.Lock()
_last = [0.0]


def throttle(gap=1.0):
    # Wikimedia asks bots to keep a slow, steady pace; at most one request per `gap` seconds.
    with _lock:
        wait = _last[0] + gap - time.time()
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()


def get_json(url, params):
    req = urllib.request.Request(url + '?' + urllib.parse.urlencode(dict(params, format='json', formatversion=2, maxlag=5)), headers={'User-Agent': UA})
    for attempt in range(6):
        throttle()
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                body = r.read()
            data = json.loads(body)
            if data.get('error', {}).get('code') == 'maxlag':
                raise ValueError('maxlag')
            return data
        except Exception:
            # Rate limited, lagging or a network hiccup: back off and try again.
            time.sleep(min(120, 15 * (attempt + 1)))
    return {}


def api(params):
    return get_json(API, params)


def strip_html(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s or '')).strip()


def norm(s):
    return re.sub(r'[^a-z0-9 ]+', ' ', s.lower().replace('ö', 'o').replace('ü', 'u'))


def key_words(model):
    return [w for w in norm(model).split() if len(w) >= 3 and w not in GENERIC and not w.isdigit()]


def search(brand, model):
    bkeys = BRAND_KEY.get(brand, [norm(brand).split()[0]])
    mkeys = key_words(model)
    if not mkeys:
        return None
    # Try the full name first, then shorter queries.
    for q in (f'{brand} {model}', f'{brand} {" ".join(mkeys[:2])}', f'intitle:{mkeys[0]} {bkeys[0]}'):
        hit = pick(q, bkeys, mkeys)
        if hit:
            return hit
    return None


def load_bad_files():
    # Files already checked by eye and rejected (see clean-images.py).
    import importlib.util
    spec = importlib.util.spec_from_file_location('clean', os.path.join(os.path.dirname(__file__), 'clean-images.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.BAD_FILES


BAD_FILES = load_bad_files()


def info(p):
    """Photo details for one Commons file page, or None if it can't be used."""
    if any(w in norm(p.get('title', '')) for w in BAD_WORDS):
        return None
    ii = (p.get('imageinfo') or [{}])[0]
    if ii.get('descriptionurl') in BAD_FILES:
        return None
    if ii.get('mime') not in ('image/jpeg', 'image/png', 'image/webp') or ii.get('width', 0) < 400:
        return None
    meta = ii.get('extmetadata', {})
    lic = strip_html(meta.get('LicenseShortName', {}).get('value', ''))
    if not OK_LICENCE.match(lic):
        return None
    return {
        'thumb': ii.get('thumburl') or ii.get('url'),
        'page': ii.get('descriptionurl'),
        'title': p['title'].replace('File:', ''),
        'author': strip_html(meta.get('Artist', {}).get('value', ''))[:120] or 'Unknown author',
        'licence': lic,
        'licenceUrl': strip_html(meta.get('LicenseUrl', {}).get('value', '')),
    }


IIPROPS = {'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': WIDTH}


def ref_search(brand, refs):
    """Many Commons files are named after the reference number, e.g. 'Rolex 116610LN.jpg'."""
    bkeys = BRAND_KEY.get(brand, [norm(brand).split()[0]])
    for ref in refs[:2]:
        compact = re.sub(r'[^a-z0-9]', '', ref.lower())
        if len(compact) < 4:
            continue
        res = api({'action': 'query', 'generator': 'search', 'gsrsearch': f'{brand} {ref} filetype:bitmap', 'gsrnamespace': 6, 'gsrlimit': 10, **IIPROPS})
        for p in sorted(res.get('query', {}).get('pages', []), key=lambda p: p.get('index', 99)):
            title = norm(p.get('title', ''))
            if any(k in title for k in bkeys) and compact in re.sub(r'[^a-z0-9]', '', title):
                hit = info(p)
                if hit:
                    return hit
    return None


def wiki_search(brand, model):
    """The main free photo of the model's Wikipedia article (e.g. 'Patek Philippe Nautilus')."""
    mkeys = key_words(model)
    if not mkeys:
        return None
    base = re.sub(r'[\s-]+\d+(\.\d+)?\s*(mm)?$', '', model).strip()      # 'Day-Date 40' -> 'Day-Date'
    two = ' '.join(re.sub(r'\(.*?\)', '', base).split()[:2])           # 'Royal Oak Selfwinding' -> 'Royal Oak'
    titles = list(dict.fromkeys([f'{brand} {model}', f'{brand} {base}', f'{brand} {two}', f'{brand} {mkeys[0].title()}']))
    data = get_json('https://en.wikipedia.org/w/api.php', {'action': 'query', 'titles': '|'.join(titles), 'redirects': 1,
                                                           'prop': 'pageimages', 'piprop': 'name', 'pilicense': 'free'})
    q = data.get('query', {})
    # Map each asked title to the page it ended up on (after redirects), keeping our order of preference.
    alias = {t: t for t in titles}
    for key in ('normalized', 'redirects'):
        for x in q.get(key, []):
            for t, v in alias.items():
                if v == x['from']:
                    alias[t] = x['to']
    pages = {p['title']: p for p in q.get('pages', [])}
    for t in titles:
        page = pages.get(alias[t], {})
        # Only use articles that are really about this model, not the brand or something else.
        if page.get('missing') or mkeys[0] not in norm(page.get('title', '')) or not page.get('pageimage'):
            continue
        res = api({'action': 'query', 'titles': 'File:' + page['pageimage'], **IIPROPS})
        for p in res.get('query', {}).get('pages', []):
            hit = info(p)
            if hit:
                hit['via'] = 'wikipedia'
                return hit
    return None


def pick(q, bkeys, mkeys):
    res = api({'action': 'query', 'generator': 'search', 'gsrsearch': q + ' filetype:bitmap', 'gsrnamespace': 6, 'gsrlimit': 20,
               'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': WIDTH})
    pages = sorted(res.get('query', {}).get('pages', []), key=lambda p: p.get('index', 99))
    best, best_score = None, 0
    for p in pages:
        title = norm(p.get('title', ''))
        if not any(k in title for k in bkeys):
            continue
        # The model's main word must be in the file name; more matching words rank higher.
        if not mkeys or mkeys[0] not in title:
            continue
        if any(w in title for w in BAD_WORDS):
            continue
        ii = (p.get('imageinfo') or [{}])[0]
        if ii.get('mime') not in ('image/jpeg', 'image/png', 'image/webp') or ii.get('width', 0) < 400:
            continue
        meta = ii.get('extmetadata', {})
        lic = strip_html(meta.get('LicenseShortName', {}).get('value', ''))
        if not OK_LICENCE.match(lic):
            continue
        score = sum(1 for k in mkeys if k in title)
        if score > best_score:
            best_score = score
            best = {
                'thumb': ii.get('thumburl') or ii.get('url'),
                'page': ii.get('descriptionurl'),
                'title': p['title'].replace('File:', ''),
                'author': strip_html(meta.get('Artist', {}).get('value', ''))[:120] or 'Unknown author',
                'licence': lic,
                'licenceUrl': strip_html(meta.get('LicenseUrl', {}).get('value', '')),
            }
    return best


def download(url, path):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            with open(path, 'wb') as fh:
                fh.write(data)
            return
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 4:
                raise
            time.sleep(30 * (attempt + 1))


def main():
    second_pass = '--more' in sys.argv
    index = json.load(open(os.path.join(DATA, 'index.json')))
    refs = {}
    for b in index['brands']:
        for m in json.load(open(os.path.join(DATA, b['slug'] + '.json')))['models']:
            refs[f"{b['slug']}/{m['slug']}"] = [r['ref'] for r in m['refs'][:4] if r['ref']]
    credits_path = os.path.join(DATA, 'images.json')
    credits = json.load(open(credits_path)) if os.path.exists(credits_path) else {}
    jobs = [(m[0], m[1], m[2], m[3]) for m in index['models'] if m[3] != 'Other models' and (second_pass or m[5] >= 3)]
    todo = [j for j in jobs if f'{j[0]}/{j[1]}' not in credits]
    print(f'{len(jobs) - len(todo)} already done, {len(todo)} to check', flush=True)

    def work(job):
        bs, ms, brand, model = job
        if second_pass:  # models the name search missed: try reference numbers, then Wikipedia
            hit = ref_search(brand, refs.get(f'{bs}/{ms}', [])) or wiki_search(brand, model)
        else:
            hit = search(brand, model)
        if not hit:
            return None
        os.makedirs(os.path.join(OUT, bs), exist_ok=True)
        ext = '.png' if hit['thumb'].lower().endswith('.png') else '.jpg'
        rel = f'images/watches/{bs}/{ms}{ext}'
        try:
            download(hit['thumb'], os.path.join(ROOT, rel))
        except Exception as e:
            print('download failed', bs, ms, e, file=sys.stderr)
            return None
        return f'{bs}/{ms}', {'src': rel, **{k: hit[k] for k in ('page', 'title', 'author', 'licence', 'licenceUrl', 'via') if k in hit}}

    # A few requests at a time keeps it fast while staying polite to Wikimedia.
    with ThreadPoolExecutor(max_workers=2) as pool:
        for n, res in enumerate(pool.map(work, todo), 1):
            if res:
                credits[res[0]] = res[1]
            if n % 50 == 0:
                print(f'{n}/{len(todo)} checked, {len(credits)} photos', flush=True)
                json.dump(credits, open(credits_path, 'w'), ensure_ascii=False, separators=(',', ':'))
    found = len(credits)
    json.dump(credits, open(credits_path, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'Done: {found} photos for {len(jobs)} brands/models')


if __name__ == '__main__':
    main()
