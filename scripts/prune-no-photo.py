#!/usr/bin/env python3
"""
Removes every watch model that has no photo (see fetch-images.py and
clean-images.py) from the database in public/data/market/: its listing file
is deleted and brand and site totals are recalculated from what is left.
Brands left with no models are removed too.

Run it last:  build-market.py -> fetch-images.py -> clean-images.py -> prune-no-photo.py
"""
import json, os, shutil, statistics

DATA = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'market')


def stats(prices):
    p = sorted(x for x in prices if x)
    if not p:
        return {'n': 0}
    med = statistics.median(p)
    p = [x for x in p if x >= med * 0.15]  # same rule as build-market.py: skip straps/parts
    return {'n': len(p), 'min': p[0], 'med': int(statistics.median(p)), 'max': p[-1]}


def main():
    index = json.load(open(os.path.join(DATA, 'index.json')))
    photos = json.load(open(os.path.join(DATA, 'images.json')))
    before_models, before_listings = len(index['models']), index['listings']

    brands_out = []
    for b in index['brands']:
        bs = b['slug']
        path = os.path.join(DATA, bs + '.json')
        brand = json.load(open(path))
        keep, prices = [], []
        for m in brand['models']:
            lpath = os.path.join(DATA, 'l', bs, m['slug'] + '.json')
            if f"{bs}/{m['slug']}" in photos:
                keep.append(m)
                prices += [r[2] for r in json.load(open(lpath))['rows']]
            elif os.path.exists(lpath):
                os.remove(lpath)
        if not keep:
            os.remove(path)
            shutil.rmtree(os.path.join(DATA, 'l', bs), ignore_errors=True)
            continue
        listings = sum(m['listings'] for m in keep)
        st = stats(prices)
        brand.update({**st, 'listings': listings, 'models': keep})
        json.dump(brand, open(path, 'w'), separators=(',', ':'), ensure_ascii=False)
        brands_out.append({**b, **st, 'listings': listings, 'models': len(keep), 'top': [m['model'] for m in keep[:4]]})

    kept = {f"{m[0]}/{m[1]}" for m in index['models']} & set(photos)
    index['models'] = [m for m in index['models'] if f"{m[0]}/{m[1]}" in kept]
    index['brands'] = sorted(brands_out, key=lambda b: -b['listings'])
    index['listings'] = sum(b['listings'] for b in brands_out)
    json.dump(index, open(os.path.join(DATA, 'index.json'), 'w'), separators=(',', ':'), ensure_ascii=False)

    # Photos of models that no longer exist are not needed either.
    for k in [k for k in photos if k not in kept]:
        del photos[k]
    json.dump(photos, open(os.path.join(DATA, 'images.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f"models {before_models} -> {len(index['models'])}, listings {before_listings} -> {index['listings']}, brands {len(index['brands'])}")


if __name__ == '__main__':
    main()
