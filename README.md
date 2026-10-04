# TimeVault – Luxury Watch Prices in India

A luxury watch catalogue and price guide that earns money from **Adsterra ads**. It lists 101 luxury watches with prices in India, specs and 190 colour variants. The watches come from Titan's own luxury lines (Nebula solid gold, Xylys, Edge, Stellar, Maritime) and the luxury brands sold on Tata CLiQ Luxury (Rado, Longines, Tissot, Frederique Constant, Movado, Hugo Boss, Coach, Michael Kors, Emporio Armani and more). There is no cart or checkout; visitors browse, compare, save and share. It's a plain HTML/CSS/JS site with no build step, hosted on **Firebase Hosting**.

Prices were last updated in October 2026. Where only a collection price range was available, the description says "(Approx. price)". Change prices in `scripts/catalog.js` (`p` = price, `mrp` = crossed-out MRP) and run `npm run generate`.

## Folder layout

| Path | What it is |
|---|---|
| `public/js/config.js` | **Site settings**: site name, contact email, **Adsterra keys** |
| `public/js/products.js` | **All watches**: name, price, MRP, colours, description, specs, stock |
| `public/images/` | Put your real watch photos here |
| `public/js/app.js` | Pages: home, watch list with filters, watch details, saved watches, disclaimer/privacy/terms |
| `public/js/ads.js` | Adsterra ad loader |
| `public/js/watch-art.js` | Draws a watch picture when a colour has no photo yet |
| `scripts/catalog.js` | The starter catalogue (models, prices, colours, specs) |
| `scripts/generate-products.js` | Builds `public/js/products.js` from `scripts/catalog.js` (`npm run generate`) |

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

## 2. Make it your store

Edit `public/js/config.js`:

- `name`, `tagline`: your shop name
- `email`: shown on the Contact page

## 3. Add Adsterra ads

1. Sign up at https://publishers.adsterra.com, add your website URL (the `.web.app` link works), and wait for approval.
2. Create ad units: **Banner 728x90, 468x60, 320x50, 300x250, 160x600**, a **Native Banner**, a **Social Bar** and optionally a **Popunder**.
3. For each one click **Get code** and copy it into `ads` in `config.js`:
   - Banner code contains `'key' : 'abc123…'` and `src="//www.highperformanceformat.com/abc123…/invoke.js"` → set `key: 'abc123…'` (and `domain` if it's different).
   - Native banner code: copy the script `src` and the `container-…` div id.
   - Social Bar / Popunder: copy the script `src`.
4. Deploy again.

Ad slots are on the home page (several), the watch list (top, inside the grid every 8 watches, sidebar, bottom), every watch page (3 slots), the static pages and the footer. Mobile screens automatically get the smaller banner sizes. To see where ads will appear before you have keys, open the site with `?adpreview` at the end of the URL (e.g. `https://yoursite.web.app/?adpreview`).

## 4. Add or edit watches

Open `public/js/products.js`. Each watch looks like this:

```js
{
  "id": "w001",               // unique, used in the product URL
  "name": "Chronex Classic Pro",
  "brand": "Chronex",
  "category": "men",          // men | women | smart | chrono | luxury | sports | kids
  "price": 1299,
  "mrp": 1999,                // crossed-out price
  "stock": 25,                // 0 = sold out
  "badge": "New",             // optional: New, Bestseller, Hot Deal, Premium, or ""
  "colors": [
    { "name": "Midnight Black", "swatch": "#111111", "dial": "#141414", "case": "#2b2b2b", "strap": "#1a1a1a", "accent": "#d4af37",
      "image": "images/chronex-classic-black.jpg" }
  ],
  "description": "…",
  "features": ["…"],
  "specs": { "Movement": "Japanese Quartz", "Case Size": "42 mm" }
}
```

**Real photos:** copy the photo into `public/images/` and set `"image"` on that colour. Square or portrait photos on a plain background look best. While `image` is `""`, the site draws the watch in that colour instead.

Prices in the starter catalogue are typical Indian market prices. Change them to your own selling prices, and remove any models you don't stock. Only list genuine products from brands you actually sell.

## Run it on your computer

```bash
npm start        # opens http://localhost:5000
```
