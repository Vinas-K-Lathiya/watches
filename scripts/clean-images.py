#!/usr/bin/env python3
"""
Cleans up the photos found by fetch-images.py:
  * drops photos of casebacks, displays, shop windows and groups of watches
  * when one photo was matched to several models, keeps it only for the
    model(s) whose full name is in the file name (at most 2 models)
  * drops anything listed in EXCLUDE (checked by eye)
Deletes the image files that are no longer used.

Usage:  python3 scripts/clean-images.py
"""
import json, os, re
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public')
DATA = os.path.join(ROOT, 'data', 'market')
GENERIC = {'date', 'watch', 'watches', 'automatic', 'chronograph', 'quartz', 'lady', 'ladies', 'men', 'mens', 'women',
           'classic', 'collection', 'the', 'and', 'with', 'steel', 'gold', 'other', 'models', 'gmt', 'ii', 'iii', 'mm',
           'small', 'large', 'mini', 'new', 'vintage', 'edition', 'limited', 'sport', 'sports', 'professional'}
BAD = ('caseback', 'case back', 'back of', 'display', 'collection', 'dealer', 'window', 'watches', 'exhibit', 'auction',
       'wristwatches', 'various', 'group', 'several', 'set of', 'detail', 'sub dials', 'sub-dials', 'dial of')
# "brandSlug/modelSlug" pairs checked by eye and found to show the wrong watch.
EXCLUDE = set()


def norm(s):
    return re.sub(r'[^a-z0-9 ]+', ' ', s.lower().replace('ö', 'o').replace('ü', 'u'))


def key_words(model):
    return [w for w in norm(model).split() if len(w) >= 3 and w not in GENERIC and not w.isdigit()]


def main():
    idx = json.load(open(os.path.join(DATA, 'index.json')))
    names = {f'{m[0]}/{m[1]}': (m[3], m[5]) for m in idx['models']}
    credits = json.load(open(os.path.join(DATA, 'images.json')))
    before = len(credits)

    for key in list(credits):
        title = norm(credits[key]['title'])
        if key in EXCLUDE or key not in names or any(b in title for b in BAD):
            del credits[key]

    by_file = defaultdict(list)
    for key, c in credits.items():
        by_file[c['page']].append(key)
    for page, keys in by_file.items():
        if len(keys) == 1:
            continue
        title = norm(credits[keys[0]]['title'])
        full = [k for k in keys if all(w in title for w in key_words(names[k][0]))]
        # Keep the photo for at most two models that fully match, preferring the most listed.
        keep = set(sorted(full, key=lambda k: -names[k][1])[:2])
        for k in keys:
            if k not in keep:
                del credits[k]

    used = {c['src'] for c in credits.values()}
    removed_files = 0
    for d, _, files in os.walk(os.path.join(ROOT, 'images', 'watches')):
        for f in files:
            rel = os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/')
            if rel not in used:
                os.remove(os.path.join(d, f))
                removed_files += 1
    json.dump(credits, open(os.path.join(DATA, 'images.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'{before} -> {len(credits)} photos kept, {removed_files} unused files deleted')


if __name__ == '__main__':
    main()
