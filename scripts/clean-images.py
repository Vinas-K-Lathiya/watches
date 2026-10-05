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
# Photo files checked by eye and found to show the wrong thing (buildings, people, planes, coins, ...).
BAD_FILES = {
    "https://commons.wikimedia.org/wiki/File:A._Lange_%26_S%C3%B6hne_Stammhaus,_Glash%C3%BCtte_(3).jpg",
    "https://commons.wikimedia.org/wiki/File:A_tudor_style_villa_-_panoramio.jpg",
    "https://commons.wikimedia.org/wiki/File:Aishwarya_Rai_Bachchan_at_the_launch_of_Longines_Dolcevita.jpg",
    "https://commons.wikimedia.org/wiki/File:Cartier_Panth%C3%A8re_Ruban.jpg",
    "https://commons.wikimedia.org/wiki/File:Decorazione_del_fondello_del_Vacheron_Constantin_Overseas_prima_generazione,_fine_anni_Novanta.jpg",
    "https://commons.wikimedia.org/wiki/File:Lange_%26_S%C3%B6hne_01.jpg",
    "https://commons.wikimedia.org/wiki/File:Longines_Saint-Imier_02_12.jpg",
    "https://commons.wikimedia.org/wiki/File:Members_of_the_Breitling_Wingwalkers_stand_on_top_of_their_Stearman_Model_75_biplanes_during_a_demonstration_at_the_Farnborough_International_Airshow_2012_in_Farnborough,_United_Kingdom,_July_15,_2012_120715-F-RP755-314.jpg",
    "https://commons.wikimedia.org/wiki/File:Mother_Mary_Lange_Catholic_School_Grand_Opening_(51362221335).jpg",
    "https://commons.wikimedia.org/wiki/File:Omega_Speedmaster_Schumacher_Edition_.jpeg",
    "https://commons.wikimedia.org/wiki/File:Omega_speedmaster_reduced_351050.jpg",
    "https://commons.wikimedia.org/wiki/File:On_Breitling_wings_(6064349783).jpg",
    "https://commons.wikimedia.org/wiki/File:Oris_Chronoris,_Referenz_01_672_7564_4154.jpg",
    "https://commons.wikimedia.org/wiki/File:Parc_national_de_la_Jacques-Cartier,_Quebec,_Canada_22.jpg",
    "https://commons.wikimedia.org/wiki/File:Patek-Philippe-Nautilus-5711.jpg",
    "https://commons.wikimedia.org/wiki/File:Patek_Philippe_Minute_Repeater_Split_Seconds_Chronograph,_Geneva,_Switzerland,_c._1895_-_Franklin_Institute_-_DSC06644.jpg",
    "https://commons.wikimedia.org/wiki/File:Patent_Drawing_for_K._Lange%27s_Double_Bicycle_for_Looping_the_Loop_-_NARA_-_5928301.jpg",
    "https://commons.wikimedia.org/wiki/File:Richard_Lange_-grave.jpg",
    "https://commons.wikimedia.org/wiki/File:Rolex_Day-Date_Lacquered_Stella_Dial.jpg",
    "https://commons.wikimedia.org/wiki/File:Royal_Tudor_Ware_gravy_boat_-_2023-05-04_-_Andy_Mabbett_-_01.jpg",
    "https://commons.wikimedia.org/wiki/File:TAG_Heuer_Monaco_40th_Anniversary_re-edition.JPG",
    "https://commons.wikimedia.org/wiki/File:TESTAF-Sinn_EZM10_EZM9_857LHC.JPG",
    "https://commons.wikimedia.org/wiki/File:Texas_Instruments_Longines_Symphonette_Calculator_1st_version.jpg",
    "https://commons.wikimedia.org/wiki/File:The_balloon_Zenith_piloted_by_Gaston_and_Albert_Tissandier.jpg",
}


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
        if credits[key]['page'] in BAD_FILES or key not in names or any(b in title for b in BAD):
            del credits[key]

    by_file = defaultdict(list)
    for key, c in credits.items():
        by_file[c['page']].append(key)
    for page, keys in by_file.items():
        # A model family's Wikipedia photo may cover its close variants (e.g. Day-Date 36 and 40).
        if len(keys) == 1 or all(credits[k].get('via') == 'wikipedia' for k in keys):
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
