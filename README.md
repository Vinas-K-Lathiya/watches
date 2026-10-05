# TimeVault – Luxury Watch Price Database

A luxury watch price website that earns money from **Adsterra ads**. It is built on the [Luxury Watch Listings dataset](https://www.kaggle.com/datasets/philmorekoung11/luxury-watch-listings) by Philmore Koung: 284,491 asking-price listings scraped from chrono24.com in July 2023. After removing exact duplicates the site has **272,918 listings** of **1,000 models** and 39,000+ reference numbers from 29 brands (Rolex, Omega, Patek Philippe, Audemars Piguet, Cartier, Richard Mille, ...). **Prices shown on the site are display prices**: every model gets a fixed pseudo-random price between ₹1,500 and ₹2,499 (one of ₹1,500, ₹1,599, ₹1,699 … ₹2,499; see `PRICES` in `public/js/market.js`). The site labels them as display prices, not market prices.

Only models that have a real photo are kept: after the photo steps, `scripts/prune-no-photo.py` removes the others. The live site has **212 models, 134,130 listings and 15 brands**.

It's a plain HTML/CSS/JS site with no build step, hosted on **Firebase Hosting**. The data is split into small JSON files in `public/data/market/` that the browser loads only when a page needs them.

## Rebuilding the data

```bash
pip install kagglehub
python3 -c "import kagglehub; print(kagglehub.dataset_download('philmorekoung11/luxury-watch-listings'))"
python3 scripts/build-market.py <the printed folder>/Watches.csv
```

## Photos

Watch photos come from **Wikimedia Commons** under free licences (CC BY, CC BY-SA, CC0, public domain). Each photo's author and licence are stored in `public/data/market/images.json` and shown under the photo and on the Photo Credits page (`#/market/credits`), as the licences require. To refresh them:

```bash
python3 scripts/fetch-images.py    # search Commons and download photos
python3 scripts/fetch-images.py --more   # more photos: by reference number and Wikipedia
python3 scripts/clean-images.py    # remove mismatched/reused photos (edit BAD_FILES to drop more)
python3 scripts/prune-no-photo.py  # remove models that still have no photo
```

Wikimedia rate-limits busy connections; if the scripts get "too many requests", wait a few hours and run them again (they continue where they stopped).

## Folder layout

| Path | What it is |
|---|---|
| `public/js/config.js` | **Site settings**: site name, contact email, dollar-to-rupee rate, **Adsterra keys** |
| `public/data/market/` | The watch database (generated – don't edit by hand) |
| `public/js/market.js` | Watch pages: home, all models, brands, brand page, model page with all listings |
| `public/js/app.js` | Site shell: menu, footer, about/contact/disclaimer/privacy/terms, router |
| `public/js/ads.js` | Adsterra ad loader |
| `public/images/watches/` | Watch photos from Wikimedia Commons |
| `scripts/fetch-images.py`, `scripts/clean-images.py` | Find and clean up the photos |
| `scripts/build-market.py` | Builds `public/data/market/` from the Kaggle `Watches.csv` |

## 1. Put the site live on Firebase (first time)

You need [Node.js](https://nodejs.org) installed on your computer.

```bash
# 1. Install the Firebase CLI and log in with YOUR Google account
npm install -g firebase-tools
firebase login

# 2. Create a new Firebase project (the ID must be unique worldwide, lowercase)
firebase projects:create timevault-watches-2026 --display-name "TimeVault Watches"

# 3. Point this folder at that project
firebase use --add timevault-watches-2026

# 4. Deploy
firebase deploy --only hosting
```

Your site will be live at `https://timevault-watches-2026.web.app`. You can connect your own domain in Firebase Console → Hosting → *Add custom domain*.

(You can also create the project in the browser at https://console.firebase.google.com → *Add project*, then run steps 3–4.)

To publish changes later, just run `firebase deploy --only hosting` again.

### Optional: deploy automatically from GitHub

`.github/workflows/firebase-deploy.yml` deploys on every push to `main`. Set it up once:

1. Run `firebase init hosting:github` in this folder and follow the prompts. It creates the `FIREBASE_SERVICE_ACCOUNT_...` secret for you. Rename it to `FIREBASE_SERVICE_ACCOUNT` in GitHub → Settings → Secrets, or change the secret name in the workflow.
2. In GitHub → Settings → Secrets and variables → Actions → **Variables**, add `FIREBASE_PROJECT_ID` = your project ID.

## 2. Site settings

Edit `public/js/config.js`:

- `name`, `tagline`: your site name
- `email`: shown on the Contact page

## 3. Add Adsterra ads

1. Sign up at https://publishers.adsterra.com, add your website URL (the `.web.app` link works), and wait for approval.
2. Create ad units: **Banner 728x90, 468x60, 320x50, 300x250, 160x600**, a **Native Banner**, a **Social Bar** and optionally a **Popunder**.
3. For each one click **Get code** and copy it into `ads` in `config.js`:
   - Banner code contains `'key' : 'abc123…'` and `src="//www.highperformanceformat.com/abc123…/invoke.js"` → set `key: 'abc123…'` (and `domain` if it's different).
   - Native banner code: copy the script `src` and the `container-…` div id.
   - Social Bar / Popunder: copy the script `src`.
4. Deploy again.

Ad slots are on the home page (several), the model lists (top, inside the grid every 12 models, bottom), every brand page and every model page (4–5 slots), the info pages and the footer. Mobile screens automatically get the smaller banner sizes. To see where ads will appear before you have keys, open the site with `?adpreview` at the end of the URL (e.g. `https://yoursite.web.app/?adpreview`).

## Run it on your computer

```bash
npm start        # opens http://localhost:5000
```
