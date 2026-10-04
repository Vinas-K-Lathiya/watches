#!/usr/bin/env python3
"""
Finds free-licence photos on Wikimedia Commons for the watch models in
public/data/market/ and downloads them to public/images/watches/.

Only files whose title clearly names the brand and the model are used.
Every photo keeps its author and licence in public/data/market/images.json,
which the site shows under the photo and on the Photo Credits page
(CC BY / CC BY-SA licences require this).

Usage:  python3 scripts/fetch-images.py
"""
import json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public')
DATA = os.path.join(ROOT, 'data', 'market')
OUT = os.path.join(ROOT, 'images', 'watches')
API = 'https://commons.wikimedia.org/w/api.php'
UA = 'TimeVaultWatchPrices/1.0 (https://timevault-watches-2026.web.app; image credits shown on site)'
WIDTH = 640

# Words that don't identify a model on their own.
GENERIC = {'date', 'watch', 'watches', 'automatic', 'chronograph', 'quartz', 'lady', 'ladies', 'men', 'mens', 'women',
           'classic', 'collection', 'the', 'and', 'with', 'steel', 'gold', 'other', 'models', 'gmt', 'ii', 'iii', 'mm',
           'small', 'large', 'mini', 'new', 'vintage', 'edition', 'limited', 'sport', 'sports', 'professional'}
BRAND_KEY = {'Audemars Piguet': ['audemars'], 'Patek Philippe': ['patek'], 'A. Lange & Söhne': ['lange'], 'TAG Heuer': ['tag heuer', 'heuer'],
             'Jaeger-LeCoultre': ['jaeger', 'lecoultre'], 'Vacheron Constantin': ['vacheron'], 'Richard Mille': ['richard mille']}
BAD_WORDS = ('homage', 'replica', 'fake', 'counterfeit', 'lume', 'strap', 'bracelet', 'movement', 'calibre', 'caliber', 'clasp', 'crown',
             'logo', 'box', 'advert', 'store', 'shop', 'boutique', 'building', 'sign', 'factory', 'museum', 'svg', 'poster', 'ad ', 'manual')
OK_LICENCE = re.compile(r'^(CC0|CC[- ]BY|Public domain|PD|GFDL|Attribution|FAL)', re.I)


def api(params):
    params = dict(params, format='json', formatversion=2)
    req = urllib.request.Request(API + '?' + urllib.parse.urlencode(params), headers={'User-Agent': UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(2 ** attempt)
    return {}


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
    with urllib.request.urlopen(req, timeout=60) as r, open(path, 'wb') as fh:
        fh.write(r.read())


def main():
    index = json.load(open(os.path.join(DATA, 'index.json')))
    credits_path = os.path.join(DATA, 'images.json')
    credits = json.load(open(credits_path)) if os.path.exists(credits_path) else {}
    jobs = [(m[0], m[1], m[2], m[3]) for m in index['models'] if m[3] != 'Other models' and m[5] >= 3]
    found = 0
    for n, (bs, ms, brand, model) in enumerate(jobs, 1):
        key = f'{bs}/{ms}'
        if key in credits:
            found += 1
            continue
        hit = search(brand, model)
        if hit:
            os.makedirs(os.path.join(OUT, bs), exist_ok=True)
            ext = '.png' if hit['thumb'].lower().endswith('.png') else '.jpg'
            rel = f'images/watches/{bs}/{ms}{ext}'
            try:
                download(hit['thumb'], os.path.join(ROOT, rel))
                credits[key] = {'src': rel, **{k: hit[k] for k in ('page', 'title', 'author', 'licence', 'licenceUrl')}}
                found += 1
            except Exception as e:
                print('download failed', key, e, file=sys.stderr)
        if n % 50 == 0:
            print(f'{n}/{len(jobs)} checked, {found} photos', flush=True)
            json.dump(credits, open(credits_path, 'w'), ensure_ascii=False, separators=(',', ':'))
        time.sleep(0.2)
    json.dump(credits, open(credits_path, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'Done: {found} photos for {len(jobs)} brands/models')


if __name__ == '__main__':
    main()
