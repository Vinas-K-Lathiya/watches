#!/usr/bin/env python3
"""Posts one watch a day to Facebook, Instagram, Pinterest and X (Twitter).

Each day picks the next watch (a model page or a reference number page of WatchPriceGuide)
and posts its square photo (us-site/static/social/, made by make-images.py), a short text
with real facts from the data, the page link, and the photo credit (the photos are from
Wikimedia Commons under free licences that require crediting the author).
No prices are posted.

A platform is used only when its keys are set (environment variables, from GitHub secrets):
  Facebook Page   FB_PAGE_ID, FB_PAGE_TOKEN
  Instagram       IG_USER_ID (+ FB_PAGE_TOKEN; Instagram professional account linked to the Page)
  Pinterest       PINTEREST_BOARD_ID and PINTEREST_TOKEN, or PINTEREST_REFRESH_TOKEN +
                  PINTEREST_APP_ID + PINTEREST_APP_SECRET (gets a fresh token each run)
  X (Twitter)     X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET

Run:  python3 social/post.py            post today's watch
      python3 social/post.py --dry-run  only show what would be posted
      python3 social/post.py --day 5 --only facebook
Runs every day from .github/workflows/social-post.yml. Only Python's standard library is used.
"""
import argparse
import base64
import hashlib
import hmac
import importlib.util
import json
import os
import re
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data' / 'market'
SITE = 'https://watchpriceguide-us.web.app'
GRAPH = 'https://graph.facebook.com/' + os.environ.get('FB_GRAPH_VERSION', 'v23.0')
START = date(2026, 10, 7)  # day 0 of the posting schedule
STRIDE = 37                # jump through the list so brands are mixed day to day

# Same reference-number page rules as the website (us-site/build.py).
_spec = importlib.util.spec_from_file_location('site_build', ROOT / 'us-site' / 'build.py')
site_build = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(site_build)


def load(name):
    return json.loads((DATA / name).read_text())


def tag(s):
    return '#' + re.sub(r'[^A-Za-z0-9]', '', s)


# ---------- what to post ----------
def all_posts():
    """Every watch that can be posted: each model, followed by its top 2 reference numbers."""
    ph = load('images.json')
    idx = load('index.json')
    posts = []
    for b in idx['brands']:
        data = load(f'{b["slug"]}.json')
        for m in data['models']:
            key = f'{b["slug"]}/{m["slug"]}'
            if key not in ph or not (ROOT / 'us-site' / 'static' / 'social' / f'{key}.jpg').exists():
                continue
            base = {'brand': b['brand'], 'bs': b['slug'], 'model': m, 'photo': ph[key], 'listings': m['listings']}
            posts.append(dict(base, kind='model'))
            refpages = site_build.ref_pages_for(m)
            for r in [r for r in m['refs'] if r['ref'] in refpages][:2]:
                posts.append(dict(base, kind='ref', ref=r, slug=refpages[r['ref']]))
    posts.sort(key=lambda p: (-p['listings'], p['kind'] != 'model'))
    return posts


def pick(posts, day):
    stride = STRIDE
    while len(posts) % stride == 0:  # stride must share no factor with the count to reach every post
        stride += 2
    return posts[(day * stride) % len(posts)]


def years_of(p):
    d = load(f'l/{p["bs"]}/{p["model"]["slug"]}.json')
    i = d['refs'].index(p['ref']['ref']) if p['ref']['ref'] in d['refs'] else -1
    ys = sorted({str(x[4]) for x in d['rows'] if x[0] == i and str(x[4]).isdigit()})
    return f'{ys[0]}–{ys[-1]}' if len(ys) > 1 else (ys[0] if ys else '')


def compose(p):
    """Texts for each platform."""
    m, brand = p['model'], p['brand']
    name = f'{brand} {m["model"]}'
    image = f'{SITE}/social/{p["bs"]}/{m["slug"]}.jpg'
    if p['kind'] == 'model':
        url = f'{SITE}/{p["bs"]}/{m["slug"]}'
        title = name
        top = next((r['ref'] for r in m['refs'] if r['ref']), '')
        facts = [x for x in [
            (m.get('size') or m.get('case')) and '📏 ' + ' · '.join(x for x in [m.get('size') and m['size'] + ' mm', m.get('case')] if x),
            f'🔢 {m["refCount"]:,} reference numbers',
            top and f'⭐ Most listed reference: {top}',
            f'📊 {m["listings"]:,} real listings',
        ] if x]
        short = f'{m["refCount"]:,} reference numbers, specs and real listings'
        pin_title = f'{name} – All Reference Numbers & Specs'
    else:
        r = p['ref']
        url = f'{SITE}/{p["bs"]}/{m["slug"]}/{p["slug"]}'
        title = f'{brand} {r["ref"]} {m["model"]}'
        yrs = years_of(p)
        facts = [x for x in [
            r.get('size') and f'📏 {r["size"]} mm case',
            (r.get('case') or r.get('brace')) and '🔩 ' + ', '.join(x for x in [r.get('case') and f'{r["case"]} case', r.get('brace') and f'{r["brace"]} bracelet'] if x),
            yrs and f'📅 Years listed: {yrs}',
            f'📊 {r["n"]:,} real listings',
        ] if x]
        short = ', '.join(x for x in [r.get('size') and f'{r["size"]} mm', r.get('case') and r['case'].lower(), yrs and f'listed {yrs}'] if x)
        pin_title = f'{title} – Specs, Size & Years'
    ph = p['photo']
    credit = f'📷 Photo: {ph["author"]} ({ph["licence"]}), via Wikimedia Commons, adapted'
    tags = ' '.join(dict.fromkeys([tag(brand), tag(m['model']), tag(brand + 'watch'), '#watches', '#luxurywatches',
                                   '#watchesofinstagram', '#wristwatch', '#horology', '#watchcollector', '#watchoftheday']))
    body = '\n'.join(facts)
    return {
        'image': image, 'url': url, 'title': title,
        'facebook': f'⌚ {title}\n\n{body}\n\n👉 See all specs and references: {url}\n\n{credit}\n{tags}',
        'instagram': f'⌚ {title}\n\n{body}\n\n🔗 Full specs and reference numbers: link in bio\n{url.replace("https://", "")}\n\n{credit}\n.\n{tags}',
        'pinterest': {'title': pin_title[:100], 'description': f'{title}: {short}. {credit.replace("📷 ", "")}'[:500], 'link': url, 'alt': name},
        'x': f'⌚ {title}: {short}\n\n{url}\n\n{tag(brand)} {tag(m["model"])} #watches',
    }


# ---------- HTTP ----------
def request(method, url, data=None, headers=None, form=False):
    headers = dict(headers or {})
    body = None
    if data is not None:
        if form:
            body = urllib.parse.urlencode(data).encode()
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
        else:
            body = json.dumps(data).encode()
            headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return json.loads(res.read() or b'{}')
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'{e.code} {e.read().decode(errors="replace")[:500]}') from None


# ---------- platforms ----------
def post_facebook(t):
    page, token = os.environ['FB_PAGE_ID'], os.environ['FB_PAGE_TOKEN']
    res = request('POST', f'{GRAPH}/{page}/photos', {'url': t['image'], 'caption': t['facebook'], 'access_token': token}, form=True)
    return res.get('post_id') or res.get('id')


def post_instagram(t):
    user, token = os.environ['IG_USER_ID'], os.environ['FB_PAGE_TOKEN']
    c = request('POST', f'{GRAPH}/{user}/media', {'image_url': t['image'], 'caption': t['instagram'], 'access_token': token}, form=True)
    for _ in range(10):  # wait until Instagram has fetched the photo
        st = request('GET', f'{GRAPH}/{c["id"]}?fields=status_code&access_token={urllib.parse.quote(token)}')
        if st.get('status_code') == 'FINISHED':
            break
        if st.get('status_code') == 'ERROR':
            raise RuntimeError(f'Instagram could not process the photo: {st}')
        time.sleep(3)
    return request('POST', f'{GRAPH}/{user}/media_publish', {'creation_id': c['id'], 'access_token': token}, form=True).get('id')


def pinterest_token():
    if os.environ.get('PINTEREST_REFRESH_TOKEN'):
        basic = base64.b64encode(f'{os.environ["PINTEREST_APP_ID"]}:{os.environ["PINTEREST_APP_SECRET"]}'.encode()).decode()
        res = request('POST', 'https://api.pinterest.com/v5/oauth/token',
                      {'grant_type': 'refresh_token', 'refresh_token': os.environ['PINTEREST_REFRESH_TOKEN']},
                      {'Authorization': f'Basic {basic}'}, form=True)
        return res['access_token']
    return os.environ['PINTEREST_TOKEN']


def post_pinterest(t):
    pin = t['pinterest']
    res = request('POST', 'https://api.pinterest.com/v5/pins', {
        'board_id': os.environ['PINTEREST_BOARD_ID'], 'title': pin['title'], 'description': pin['description'],
        'link': pin['link'], 'alt_text': pin['alt'], 'media_source': {'source_type': 'image_url', 'url': t['image']},
    }, {'Authorization': f'Bearer {pinterest_token()}'})
    return res.get('id')


def oauth1_header(method, url, key, key_secret, token, token_secret):
    """OAuth 1.0a header for X (JSON body, so only the oauth_* values are signed)."""
    q = lambda s: urllib.parse.quote(str(s), safe='~')
    params = {'oauth_consumer_key': key, 'oauth_nonce': secrets.token_hex(16), 'oauth_signature_method': 'HMAC-SHA1',
              'oauth_timestamp': str(int(time.time())), 'oauth_token': token, 'oauth_version': '1.0'}
    base = '&'.join([method, q(url), q('&'.join(f'{q(k)}={q(v)}' for k, v in sorted(params.items())))])
    params['oauth_signature'] = base64.b64encode(hmac.new(f'{q(key_secret)}&{q(token_secret)}'.encode(), base.encode(), hashlib.sha1).digest()).decode()
    return 'OAuth ' + ', '.join(f'{q(k)}="{q(v)}"' for k, v in sorted(params.items()))


def post_x(t):
    url = 'https://api.x.com/2/tweets'
    auth = oauth1_header('POST', url, os.environ['X_API_KEY'], os.environ['X_API_SECRET'], os.environ['X_ACCESS_TOKEN'], os.environ['X_ACCESS_SECRET'])
    return request('POST', url, {'text': t['x']}, {'Authorization': auth}).get('data', {}).get('id')


PLATFORMS = {
    'facebook': (post_facebook, ['FB_PAGE_ID', 'FB_PAGE_TOKEN']),
    'instagram': (post_instagram, ['IG_USER_ID', 'FB_PAGE_TOKEN']),
    'pinterest': (post_pinterest, ['PINTEREST_BOARD_ID']),
    'x': (post_x, ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET']),
}


def configured(name):
    ok = all(os.environ.get(k) for k in PLATFORMS[name][1])
    if name == 'pinterest':
        ok = ok and bool(os.environ.get('PINTEREST_TOKEN') or os.environ.get('PINTEREST_REFRESH_TOKEN'))
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--dry-run', action='store_true', help='show the post, do not publish')
    ap.add_argument('--day', type=int, help='post number to use (default: days since the start date)')
    ap.add_argument('--only', choices=list(PLATFORMS), help='post to one platform only')
    a = ap.parse_args()

    day = a.day if a.day is not None else (datetime.now(timezone.utc).date() - START).days
    posts = all_posts()
    texts = compose(pick(posts, day))
    print(f'Day {day} of {len(posts)} posts: {texts["title"]}\n  page:  {texts["url"]}\n  image: {texts["image"]}\n')

    names = [a.only] if a.only else list(PLATFORMS)
    if a.dry_run:
        for n in names:
            print(f'--- {n} ({"keys set" if configured(n) else "no keys, would be skipped"}) ---')
            print(json.dumps(texts[n], indent=2, ensure_ascii=False) if isinstance(texts[n], dict) else texts[n], '\n')
        return 0

    failed = 0
    for n in names:
        if not configured(n):
            print(f'{n}: skipped (keys not set)')
            continue
        try:
            print(f'{n}: posted, id {PLATFORMS[n][0](texts)}')
        except Exception as e:  # one platform failing must not stop the others
            failed += 1
            print(f'{n}: FAILED – {e}', file=sys.stderr)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
