# TimeVault – Watch Selling Website

A complete online watch store: 120 watches (₹100 – ₹20,000) in 7 categories, several colours per watch, search, filters, cart, wishlist, checkout (orders go to your WhatsApp, with COD) and Adsterra ad slots. It's a plain HTML/CSS/JS site with no build step, hosted on **Firebase Hosting**.

## Folder layout

| Path | What it is |
|---|---|
| `public/js/config.js` | **Store settings**: shop name, WhatsApp number, phone, email, shipping fee, **Adsterra keys** |
| `public/js/products.js` | **All watches**: name, price, MRP, colours, description, specs, stock |
| `public/images/` | Put your real watch photos here |
| `public/js/app.js` | Pages: home, shop, product, cart, checkout, wishlist, policies |
| `public/js/ads.js` | Adsterra ad loader |
| `public/js/watch-art.js` | Draws a watch picture when a colour has no photo yet |
| `scripts/generate-products.js` | Script that created the starter catalogue |

## 1. Put the site live on Firebase (first time)

You need [Node.js](https://nodejs.org) installed on your computer.

```bash
# 1. Install the Firebase CLI and log in with YOUR Google account
npm install -g firebase-tools
firebase login

# 2. Create a new Firebase project (the ID must be unique worldwide, lowercase)
firebase projects:create timevault-watches-123 --display-name "TimeVault Watches"

# 3. Point this folder at that project
firebase use --add timevault-watches-123

# 4. Deploy
firebase deploy --only hosting
```

Your site will be live at `https://timevault-watches-123.web.app`. You can connect your own domain in Firebase Console → Hosting → *Add custom domain*.

(You can also create the project in the browser at https://console.firebase.google.com → *Add project*, then run steps 3–4.)

To publish changes later, just run `firebase deploy --only hosting` again.

### Optional: deploy automatically from GitHub

`.github/workflows/firebase-deploy.yml` deploys on every push to `main`. Set it up once:

1. Run `firebase init hosting:github` in this folder and follow the prompts. It creates the `FIREBASE_SERVICE_ACCOUNT_...` secret for you. Rename it to `FIREBASE_SERVICE_ACCOUNT` in GitHub → Settings → Secrets, or change the secret name in the workflow.
2. In GitHub → Settings → Secrets and variables → Actions → **Variables**, add `FIREBASE_PROJECT_ID` = your project ID.

## 2. Make it your store

Edit `public/js/config.js`:

- `name`, `tagline`: your shop name
- `whatsapp`: your number with country code, digits only (e.g. `919876543210`). **Orders are sent here.**
- `phone`, `email`, `address`, `shippingFee`, `freeShippingAbove`

## 3. Add Adsterra ads

1. Sign up at https://publishers.adsterra.com, add your website URL (the `.web.app` link works), and wait for approval.
2. Create ad units: **Banner 728x90, 468x60, 320x50, 300x250, 160x600**, a **Native Banner**, a **Social Bar** and optionally a **Popunder**.
3. For each one click **Get code** and copy it into `ads` in `config.js`:
   - Banner code contains `'key' : 'abc123…'` and `src="//www.highperformanceformat.com/abc123…/invoke.js"` → set `key: 'abc123…'` (and `domain` if it's different).
   - Native banner code: copy the script `src` and the `container-…` div id.
   - Social Bar / Popunder: copy the script `src`.
4. Deploy again.

Ad slots are on the home page, shop (top, inside the product grid, sidebar), product page, cart, checkout confirmation, static pages and the footer. Mobile screens automatically get the smaller banner sizes. To see where ads will appear before you have keys, open the site with `?adpreview` at the end of the URL (e.g. `https://yoursite.web.app/?adpreview`).

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

The starter brands (Chronex, Aurum, Velora…) are placeholder names. Rename them to the brands you actually stock.

## Run it on your computer

```bash
npm start        # opens http://localhost:5000
```
