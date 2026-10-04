#!/usr/bin/env python3
"""
Builds the watch database (public/data/market/) from the Luxury Watch
Listings dataset (284,491 Chrono24 listings, July 2023) by Philmore Koung:
  https://www.kaggle.com/datasets/philmorekoung11/luxury-watch-listings

Usage:
  pip install kagglehub
  python3 -c "import kagglehub; print(kagglehub.dataset_download('philmorekoung11/luxury-watch-listings'))"
  python3 scripts/build-market.py <printed path>/Watches.csv

(A folder of the per-brand CSVs from
 https://github.com/philmorefkoung/Webscrapped-Watch-Dataset also works.)

Output (loaded on demand by the website):
  public/data/market/index.json                 brands + model search index
  public/data/market/<brand>.json                models and reference numbers of one brand
  public/data/market/l/<brand>/<model>.json      every listing of one model
"""
import csv, glob, json, os, re, shutil, statistics, sys
from collections import defaultdict

SRC = sys.argv[1] if len(sys.argv) > 1 else 'dataset'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'market')

COND = ['New', 'Unworn', 'Very good', 'Good', 'Fair', 'Poor', 'Incomplete']
SEX = {"Men's watch/Unisex": 'M', "Women's watch": 'W'}


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-') or 'other'


def read(path):
    raw = open(path, 'rb').read()
    try:
        txt = raw.decode('utf-8-sig')
    except UnicodeDecodeError:  # a few files are Windows-1252
        txt = raw.decode('cp1252', errors='replace').lstrip('﻿').replace('ï»¿', '')
    return csv.DictReader(txt.splitlines(True))


def price(s):
    m = re.match(r'\s*\$([\d,]+)', s or '')
    return int(m.group(1).replace(',', '')) if m else None


def clean(s):
    return re.sub(r'\s+', ' ', (s or '').strip())


def stats(prices):
    p = sorted(x for x in prices if x)
    if not p:
        return {'n': 0}
    # Listings far below the typical price are usually parts, straps or boxes, so they
    # are left out of the statistics (they still appear in the listings table).
    med = statistics.median(p)
    p = [x for x in p if x >= med * 0.15]
    return {'n': len(p), 'min': p[0], 'med': int(statistics.median(p)), 'max': p[-1]}


def most_common(values):
    vals = [v for v in values if v]
    return max(set(vals), key=vals.count) if vals else ''


files = [SRC] if SRC.endswith('.csv') else sorted(glob.glob(os.path.join(SRC, '*.csv')))
rows = []
for f in files:
    for r in read(f):
        name = (r.get('name') or '').split('\n')
        first = clean(name[0])
        brand = clean(r.get('brand'))
        if not brand:
            brand = 'Other brands'
        model = clean(r.get('model'))
        if not model:
            # About 30,000 listings have no model field; use the listing name instead.
            model = first[len(brand):].strip(' -') if first.lower().startswith(brand.lower()) else ''
            model = model if 2 <= len(model) <= 40 else 'Other models'
        title = clean(' '.join(name[1:])) if len(name) > 1 else ''
        yop = clean(r.get('yop'))
        yop = '' if yop == 'Unknown' else yop.replace(' (Approximation)', '~')
        rows.append({
            'brand': brand, 'model': model, 'ref': clean(r.get('ref')), 'title': title[:80],
            'price': price(r.get('price')), 'cond': clean(r.get('cond')) or clean(r.get('condition')), 'yop': yop,
            'mvmt': clean(r.get('mvmt')), 'casem': clean(r.get('casem')), 'bracem': clean(r.get('bracem')),
            'sex': SEX.get(clean(r.get('sex')), ''), 'size': re.sub(r'\s*mm', '', clean(r.get('size'))).strip(),
        })

raw_count = len(rows)
# Remove exact duplicate listings (the scraper visited some pages twice).
seen, uniq = set(), []
for r in rows:
    key = tuple(r.values())
    if key not in seen:
        seen.add(key)
        uniq.append(r)
rows = uniq

by_brand = defaultdict(lambda: defaultdict(list))
for r in rows:
    by_brand[r['brand']][r['model']].append(r)

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, 'l'))

index = {'source': 'Luxury Watch Listings dataset (Chrono24, July 2023)', 'listings': len(rows), 'raw': raw_count, 'brands': [], 'models': []}
for brand in sorted(by_brand, key=lambda b: -sum(len(v) for v in by_brand[b].values())):
    bs = slug(brand)
    os.makedirs(os.path.join(OUT, 'l', bs))
    models_out = []
    used_slugs = set()
    for model, items in sorted(by_brand[brand].items(), key=lambda kv: -len(kv[1])):
        ms = slug(model)
        while ms in used_slugs:
            ms += '-x'
        used_slugs.add(ms)
        refs = defaultdict(list)
        for it in items:
            refs[it['ref']].append(it)
        ref_list = sorted(refs, key=lambda k: -len(refs[k]))
        ref_out = []
        for ref in ref_list:
            its = refs[ref]
            ref_out.append({'ref': ref, **stats([i['price'] for i in its]),
                            'mvmt': most_common([i['mvmt'] for i in its]), 'case': most_common([i['casem'] for i in its]),
                            'brace': most_common([i['bracem'] for i in its]), 'size': most_common([i['size'] for i in its])})
        ref_idx = {r: i for i, r in enumerate(ref_list)}
        # listing row: [refIndex, title, priceUSD, condIndex, year, case, bracelet, movement, sex, size]
        listings = sorted(
            ([ref_idx[i['ref']], i['title'], i['price'], COND.index(i['cond']) if i['cond'] in COND else -1, i['yop'],
              i['casem'], i['bracem'], i['mvmt'], i['sex'], i['size']] for i in items),
            key=lambda x: (x[2] is None, x[2] or 0))
        with open(os.path.join(OUT, 'l', bs, ms + '.json'), 'w') as fh:
            json.dump({'brand': brand, 'model': model, 'refs': [r['ref'] for r in ref_out], 'cond': COND, 'rows': listings},
                      fh, separators=(',', ':'), ensure_ascii=False)
        st = stats([i['price'] for i in items])
        women = sum(1 for i in items if i['sex'] == 'W')
        models_out.append({'slug': ms, 'model': model, **st, 'listings': len(items), 'refCount': len(ref_out),
                           'mvmt': most_common([i['mvmt'] for i in items]), 'case': most_common([i['casem'] for i in items]),
                           'size': most_common([i['size'] for i in items]), 'women': women * 2 > len(items),
                           'refs': ref_out})
        index['models'].append([bs, ms, brand, model, st.get('med'), len(items)])
    bstats = stats([i['price'] for m in by_brand[brand].values() for i in m])
    with open(os.path.join(OUT, bs + '.json'), 'w') as fh:
        json.dump({'brand': brand, 'slug': bs, **bstats, 'listings': sum(len(v) for v in by_brand[brand].values()), 'models': models_out}, fh, separators=(',', ':'), ensure_ascii=False)
    index['brands'].append({'brand': brand, 'slug': bs, **bstats, 'listings': sum(len(v) for v in by_brand[brand].values()),
                            'models': len(models_out),
                            'top': [m['model'] for m in models_out[:4]]})

with open(os.path.join(OUT, 'index.json'), 'w') as fh:
    json.dump(index, fh, separators=(',', ':'), ensure_ascii=False)

total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs)
files = sum(len(fs) for _, _, fs in os.walk(OUT))
print(f"{len(rows)} listings, {len(index['brands'])} brands, {len(index['models'])} models -> {files} files, {total / 1e6:.1f} MB")
