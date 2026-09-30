/* Watch catalogue & price guide (no shopping cart - the site earns from ads). */
(function () {
  const C = window.STORE_CONFIG;
  const PRODUCTS = window.PRODUCTS;
  const CATS = window.CATEGORIES;
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const catName = Object.fromEntries(CATS.map((c) => [c.id, c.name]));
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app');

  const PRICE_BANDS = [
    { label: 'Under ₹2,000', min: 0, max: 1999 },
    { label: '₹2,000 – ₹10,000', min: 2000, max: 10000 },
    { label: '₹10,000 – ₹50,000', min: 10000, max: 50000 },
    { label: '₹50,000 – ₹5 Lakh', min: 50000, max: 500000 },
    { label: 'Above ₹5 Lakh', min: 500000, max: 1e9 },
  ];
  const PER_PAGE = 24;

  // ---------- helpers ----------
  const money = (n) => C.currency + Number(n).toLocaleString(C.locale);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const off = (p) => Math.round((1 - p.price / p.mrp) * 100);
  const stars = (r) => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));
  function lakh(n) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, '')} Lakh`;
    return money(n);
  }
  function priceRow(p, big) {
    const extra = p.mrp > p.price ? `<span class="mrp">${money(p.mrp)}</span><span class="off">${off(p)}% off</span>` : '';
    const words = p.price >= 100000 ? `<span class="muted small">(${lakh(p.price)})</span>` : '';
    return `<div class="price-row${big ? ' big' : ''}"><span class="price">${money(p.price)}</span>${extra}${big ? words : ''}</div>`;
  }

  function store(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ } }

  let wish = store('tv_wish', []);        // saved watch ids

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function image(p, colorIdx) {
    const v = p.colors[colorIdx || 0] || p.colors[0];
    if (v.image) return `<img src="${esc(v.image)}" alt="${esc(p.name)} – ${esc(v.name)}" loading="lazy">`;
    return WatchArt.svg(p, v);
  }

  function updateCounts() { $('#wishCount').textContent = wish.length; }

  function toggleWish(id) {
    const i = wish.indexOf(id);
    if (i >= 0) wish.splice(i, 1); else wish.push(id);
    save('tv_wish', wish);
    updateCounts();
    toast(i >= 0 ? 'Removed from saved watches' : 'Saved ♥');
    document.querySelectorAll(`[data-wish="${id}"]`).forEach((b) => b.classList.toggle('active', i < 0));
  }

  // ---------- components ----------
  function card(p) {
    const swatches = p.colors.map((c, i) => `<button class="swatch sm${i === 0 ? ' active' : ''}" style="--c:${c.swatch}" data-card-color="${i}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join('');
    return `<article class="card" data-card="${p.id}">
      <a href="#/product/${p.id}" class="card-img" data-card-img>${image(p, 0)}</a>
      ${p.badge ? `<span class="badge${p.badge === 'Luxury' ? ' badge-lux' : ''}">${p.badge}</span>` : ''}
      <button class="wish-btn${wish.includes(p.id) ? ' active' : ''}" data-wish="${p.id}" aria-label="Save">♥</button>
      <div class="card-body">
        <div class="card-brand">${esc(p.brand)} · ${esc(catName[p.category])}</div>
        <a href="#/product/${p.id}" class="card-title">${esc(p.name)}</a>
        <div class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} <span class="muted">(${p.reviews})</span></div>
        ${priceRow(p)}
        <div class="card-foot"><div class="swatches">${swatches}</div>
          <a class="btn btn-sm" href="#/product/${p.id}">Details</a></div>
      </div>
    </article>`;
  }
  function grid(list, adEvery) {
    let html = '';
    list.forEach((p, i) => {
      html += card(p);
      if (adEvery && (i + 1) % adEvery === 0 && i < list.length - 1) html += '<div class="grid-ad" data-ad="300x250"></div>';
    });
    return `<div class="grid">${html}</div>`;
  }
  function section(title, link, content) {
    return `<section class="section"><div class="container">
      <div class="section-head"><h2>${title}</h2>${link ? `<a href="${link}" class="link">View all →</a>` : ''}</div>
      ${content}</div></section>`;
  }
  const adRow = (type) => `<div class="container"><div data-ad="${type || '728x90'}" class="ad-slot"></div></div>`;
  const top = (list, n) => list.slice().sort((a, b) => b.pop - a.pop || b.reviews - a.reviews).slice(0, n);

  // ---------- pages ----------
  function home() {
    const find = (re) => PRODUCTS.find((p) => re.test(p.name)) || PRODUCTS[0];
    const hero = [find(/Submariner Date/), find(/Speedmaster/), find(/GA-2100/)];
    const trending = top(PRODUCTS, 8);
    const luxury = top(PRODUCTS.filter((p) => p.category === 'luxury'), 8);
    const budget = top(PRODUCTS.filter((p) => p.price < 2000), 8);
    const smart = top(PRODUCTS.filter((p) => p.category === 'smart'), 8);
    const casio = top(PRODUCTS.filter((p) => p.brand === 'Casio'), 8);
    const brands = Object.entries(PRODUCTS.reduce((m, p) => { m[p.brand] = (m[p.brand] || 0) + p.pop; return m; }, {})).sort((a, b) => b[1] - a[1]).map(([b]) => b);
    const catTiles = CATS.map((c) => {
      const p = top(PRODUCTS.filter((x) => x.category === c.id), 1)[0];
      const count = PRODUCTS.filter((x) => x.category === c.id).length;
      return `<a class="cat-tile" href="#/shop?cat=${c.id}"><div class="cat-img">${image(p, 0)}</div><div><strong>${c.name}</strong><span class="muted">${count} models</span></div></a>`;
    }).join('');
    const bands = PRICE_BANDS.map((b) => `<a class="chip" href="#/shop?min=${b.min}&max=${b.max}">${b.label}</a>`).join('');
    return `
      <section class="hero"><div class="container hero-inner">
        <div class="hero-text">
          <span class="eyebrow">Watch Price Guide · Updated Sep 2026</span>
          <h1>Every watch.<br>Every price.</h1>
          <p>Latest prices in India, specs and colours for ${PRODUCTS.length}+ watches – Rolex, Omega, TAG Heuer, Tissot, Apple, Casio G-Shock, Titan, Fossil, Noise, boAt and more.</p>
          <div class="hero-cta"><a href="#/shop" class="btn btn-gold">Browse All Watches</a><a href="#/shop?cat=luxury" class="btn btn-ghost">Rolex &amp; Luxury</a></div>
          <div class="hero-trust"><span>✔ Latest India prices</span><span>✔ Full specifications</span><span>✔ ${PRODUCTS.reduce((s, p) => s + p.colors.length, 0)} colour variants</span></div>
        </div>
        <div class="hero-art">${hero.map((p, i) => `<a href="#/product/${p.id}" class="hero-watch hw${i}">${image(p, 0)}</a>`).join('')}</div>
      </div></section>
      ${adRow()}
      ${section('Browse by Category', '#/shop', `<div class="cat-grid">${catTiles}</div>`)}
      ${section('Top Brands', '', `<div class="brand-strip">${brands.map((b) => `<a class="brand-chip" href="#/shop?brand=${encodeURIComponent(b)}">${esc(b)}</a>`).join('')}</div>`)}
      ${section('🔥 Trending Watches', '#/shop?sort=popular', grid(trending))}
      ${adRow('native')}
      <section class="banner-luxury"><div class="container banner-inner">
        <div><span class="eyebrow">Luxury Swiss</span><h2>Rolex, Omega &amp; TAG Heuer prices in India</h2>
        <p>Submariner, Daytona, GMT-Master II, Speedmaster Moonwatch and more – official retail prices for 2026.</p><a href="#/shop?cat=luxury&sort=high" class="btn btn-gold">See Luxury Prices</a></div>
        <div class="lux-row">${luxury.slice(0, 3).map((p) => `<a href="#/product/${p.id}">${image(p, 0)}</a>`).join('')}</div>
      </div></section>
      ${section('👑 Luxury Icons', '#/shop?cat=luxury', grid(luxury))}
      ${adRow()}
      ${section('Browse by Budget', '', `<div class="chips">${bands}</div>`)}
      ${section('⌚ Best Smartwatches', '#/shop?cat=smart&sort=popular', grid(smart))}
      ${adRow('native')}
      ${section('Casio &amp; G-Shock Icons', '#/shop?brand=Casio', grid(casio))}
      ${section('💰 Best Watches Under ₹2,000', '#/shop?max=1999&sort=popular', grid(budget))}
      ${adRow()}`;
  }

  function parseQuery(q) {
    const o = {};
    new URLSearchParams(q || '').forEach((v, k) => { o[k] = v; });
    return o;
  }
  function buildQuery(o) {
    const u = new URLSearchParams();
    Object.keys(o).forEach((k) => { if (o[k] !== '' && o[k] != null) u.set(k, o[k]); });
    const s = u.toString();
    return '#/shop' + (s ? '?' + s : '');
  }

  function filterProducts(q) {
    let list = PRODUCTS.slice();
    if (q.cat) list = list.filter((p) => p.category === q.cat);
    if (q.brand) list = list.filter((p) => p.brand === q.brand);
    if (q.color) list = list.filter((p) => p.colors.some((c) => c.name === q.color));
    if (q.strap) list = list.filter((p) => p.strapType === q.strap || (q.strap === 'metal' && p.strapType === 'jubilee'));
    if (q.min) list = list.filter((p) => p.price >= +q.min);
    if (q.max) list = list.filter((p) => p.price <= +q.max);
    if (q.q) {
      const words = q.q.toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter((p) => {
        const hay = [p.name, p.brand, p.sku, catName[p.category], p.description, p.strapType, p.audience, ...p.colors.map((c) => c.name)].join(' ').toLowerCase();
        return words.every((w) => hay.includes(w));
      });
    }
    const sorts = {
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      popular: (a, b) => b.pop - a.pop || b.reviews - a.reviews,
      rating: (a, b) => b.rating - a.rating,
      discount: (a, b) => off(b) - off(a),
    };
    list.sort(sorts[q.sort] || sorts.popular);
    return list;
  }

  function shop(qs) {
    const q = parseQuery(qs);
    const all = filterProducts(q);
    const page = Math.max(1, +q.page || 1);
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    const list = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const brands = [...new Set(PRODUCTS.map((p) => p.brand))].sort();
    const colors = [...new Map(PRODUCTS.flatMap((p) => p.colors).map((c) => [c.name, c.swatch])).entries()].sort().slice(0, 40);
    const straps = [['leather', 'Leather'], ['metal', 'Steel Bracelet'], ['mesh', 'Mesh'], ['rubber', 'Silicone'], ['resin', 'Resin'], ['nato', 'NATO / Fabric']];
    const link = (patch) => buildQuery(Object.assign({}, q, { page: '' }, patch));
    const opt = (key, val, label) => `<a href="${link({ [key]: q[key] === val ? '' : val })}" class="f-opt${q[key] === val ? ' active' : ''}">${label}</a>`;
    const title = q.q ? `Results for “${esc(q.q)}”` : q.brand ? `${esc(q.brand)} Watches Price in India` : q.cat ? `${catName[q.cat]} Price List` : 'All Watches – Price List';
    const active = ['cat', 'brand', 'color', 'strap', 'q', 'min', 'max'].some((k) => q[k]);
    const pager = pages > 1 ? `<nav class="pager">${Array.from({ length: pages }, (_, i) => `<a href="${buildQuery(Object.assign({}, q, { page: i + 1 }))}" class="${i + 1 === page ? 'active' : ''}">${i + 1}</a>`).join('')}</nav>` : '';

    return `<div class="container shop">
      <div class="crumbs"><a href="#/">Home</a> / <span>${title}</span></div>
      <div class="shop-layout">
        <aside class="filters" id="filters">
          <div class="filters-head"><h3>Filters</h3>${active ? `<a href="#/shop" class="link">Clear all</a>` : ''}<button class="icon-btn close-filters" data-close-filters aria-label="Close filters">✕</button></div>
          <div class="f-group"><h4>Category</h4>${CATS.map((c) => opt('cat', c.id, c.name)).join('')}</div>
          <div class="f-group"><h4>Price</h4>${PRICE_BANDS.map((b) => { const on = q.min === String(b.min) && q.max === String(b.max); return `<a href="${link(on ? { min: '', max: '' } : { min: b.min, max: b.max })}" class="f-opt${on ? ' active' : ''}">${b.label}</a>`; }).join('')}
            <form class="price-form" data-price-form><input type="number" name="min" placeholder="Min ₹" value="${esc(q.min || '')}" min="0"><input type="number" name="max" placeholder="Max ₹" value="${esc(q.max && +q.max < 1e9 ? q.max : '')}" min="0"><button class="btn btn-sm">Go</button></form></div>
          <div class="f-group"><h4>Brand</h4>${brands.map((b) => opt('brand', b, b)).join('')}</div>
          <div class="f-group"><h4>Strap</h4>${straps.map(([v, l]) => opt('strap', v, l)).join('')}</div>
          <div class="f-group"><h4>Colour</h4><div class="f-colors">${colors.map(([n, sw]) => `<a href="${link({ color: q.color === n ? '' : n })}" class="swatch${q.color === n ? ' active' : ''}" style="--c:${sw}" title="${esc(n)}" aria-label="${esc(n)}"></a>`).join('')}</div></div>
          <div data-ad="160x600" class="ad-slot ad-side"></div>
        </aside>
        <div class="shop-main">
          <div class="shop-bar">
            <h1>${title} <span class="muted">(${all.length})</span></h1>
            <div class="shop-controls">
              <button class="btn btn-ghost btn-sm open-filters" data-open-filters>⚙ Filters</button>
              <select data-sort aria-label="Sort by">
                ${[['popular', 'Most popular'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low'], ['rating', 'Top rated'], ['discount', 'Biggest discount']].map(([v, l]) => `<option value="${v}"${(q.sort || 'popular') === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div data-ad="728x90" class="ad-slot"></div>
          ${list.length ? grid(list, 8) : `<div class="empty"><p>No watches match these filters.</p><a href="#/shop" class="btn">Clear filters</a></div>`}
          ${pager}
          <div data-ad="728x90" class="ad-slot"></div>
        </div>
      </div>
    </div>`;
  }

  function product(id) {
    const p = byId[id];
    if (!p) return notFound();
    const related = PRODUCTS.filter((x) => x.id !== p.id && (x.category === p.category || x.brand === p.brand))
      .sort((a, b) => Math.abs(Math.log(a.price / p.price)) - Math.abs(Math.log(b.price / p.price))).slice(0, 8);
    const specs = Object.entries(p.specs).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
    const approx = p.price === p.mrp ? 'Approx. official retail price in India' : `Typical selling price · MRP ${money(p.mrp)}`;
    return `<div class="container pdp" data-pdp="${p.id}">
      <div class="crumbs"><a href="#/">Home</a> / <a href="#/shop?cat=${p.category}">${catName[p.category]}</a> / <a href="#/shop?brand=${encodeURIComponent(p.brand)}">${esc(p.brand)}</a> / <span>${esc(p.name)}</span></div>
      <div class="pdp-grid">
        <div class="gallery">
          <div class="gallery-main" id="pdpMain">${image(p, 0)}</div>
          <div class="thumbs">${p.colors.map((c, i) => `<button class="thumb${i === 0 ? ' active' : ''}" data-color="${i}" aria-label="${esc(c.name)}">${image(p, i)}</button>`).join('')}</div>
          <p class="small muted">Illustration for reference – not an official product photo.</p>
        </div>
        <div class="pdp-info">
          <div class="card-brand">${esc(p.brand)} · Ref. ${esc(p.sku)}</div>
          <h1>${esc(p.name)} Price in India</h1>
          <div class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} · ${p.reviews} ratings</div>
          ${priceRow(p, true)}
          <p class="muted small">${approx} · Updated Sep 2026</p>
          <div class="pdp-colors"><div><strong>Colour:</strong> <span id="pdpColorName">${esc(p.colors[0].name)}</span></div>
            <div class="swatches">${p.colors.map((c, i) => `<button class="swatch${i === 0 ? ' active' : ''}" style="--c:${c.swatch}" data-color="${i}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join('')}</div></div>
          <div class="buy-row">
            <button class="btn" data-share>↗ Share</button>
            <a class="btn btn-wa" id="pdpWa" target="_blank" rel="noopener">WhatsApp</a>
            <button class="btn btn-ghost wish-toggle${wish.includes(p.id) ? ' active' : ''}" data-wish="${p.id}">♥ Save</button>
          </div>
          <div class="quick-specs">
            <div><span>Movement</span><strong>${esc(p.specs.Movement)}</strong></div>
            <div><span>Size</span><strong>${esc(p.specs['Case / Display Size'])}</strong></div>
            <div><span>Water resistance</span><strong>${esc(p.specs['Water Resistance'])}</strong></div>
            <div><span>Glass</span><strong>${esc(p.specs.Glass)}</strong></div>
          </div>
          <div data-ad="300x250" class="ad-slot"></div>
        </div>
      </div>
      <div class="pdp-details">
        <section><h2>About the ${esc(p.name)}</h2><p>${esc(p.description)}</p><h3>Key Features</h3><ul class="feat">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></section>
        <section><h2>Specifications</h2><table class="specs">${specs}</table></section>
      </div>
      <div data-ad="728x90" class="ad-slot"></div>
      ${related.length ? `<section class="section"><div class="section-head"><h2>Similar watches &amp; prices</h2></div>${grid(related)}</section>` : ''}
      <div data-ad="native" class="ad-slot"></div>
    </div>`;
  }

  function wishlist() {
    const list = wish.map((id) => byId[id]).filter(Boolean);
    return `<div class="container"><div class="crumbs"><a href="#/">Home</a> / <span>Saved</span></div><h1>Saved Watches <span class="muted">(${list.length})</span></h1>
      ${list.length ? grid(list) : '<div class="empty"><p class="muted">No saved watches yet. Tap ♥ on any watch to save it.</p><a href="#/shop" class="btn">Browse watches</a></div>'}
      ${adRow()}</div>`;
  }

  function about() {
    return `<div class="container narrow prose"><h1>About ${esc(C.name)}</h1>
      <p>${esc(C.name)} is a free watch price guide for India. We list the latest prices, specifications and colour options for ${PRODUCTS.length}+ popular watches – from budget Casio and Sonata to smartwatches from Apple, Noise and boAt, all the way up to Rolex, Omega and TAG Heuer.</p>
      <p>Prices are collected from official brand price lists and authorised retailers and are updated regularly. Always confirm the final price with the brand or an authorised dealer before buying.</p>
      <div data-ad="728x90" class="ad-slot"></div></div>`;
  }

  function contact() {
    return `<div class="container narrow prose"><h1>Contact Us</h1>
      <p>Found a wrong price or want a watch added? Let us know.</p>
      <ul class="contact-list"><li>✉️ Email: <a class="link" href="mailto:${esc(C.email)}">${esc(C.email)}</a></li></ul>
      <div data-ad="300x250" class="ad-slot"></div></div>`;
  }

  const PAGES = {
    disclaimer: ['Disclaimer', `<p>${esc(C.name)} is an independent information website. We do not sell watches and are not affiliated with, endorsed by or sponsored by Rolex, Omega, TAG Heuer, Tissot, Apple, Casio, Titan or any other brand listed. All brand names and trademarks belong to their respective owners and are used only to identify the products.</p><p>Prices shown are approximate retail prices in India at the time of the last update and may change at any time. Please check the official brand website or an authorised retailer for the current price.</p><p>Watch pictures on this site are illustrations for reference only and are not official product photographs.</p>`],
    privacy: ['Privacy Policy', `<p>We do not require you to create an account. Your saved watches are stored only in your own browser.</p><p><strong>Advertising:</strong> This website shows ads served by third-party networks such as Adsterra. These partners may use cookies or similar technologies to show relevant ads and measure performance. You can control cookies through your browser settings.</p><p>For any privacy questions, contact ${esc(C.email)}.</p>`],
    terms: ['Terms of Use', '<p>By using this website you agree to these terms. All information is provided "as is" for general information only. We make no guarantee that prices or specifications are complete or current. We are not responsible for any purchase decision made based on this website.</p>'],
  };
  function staticPage(slug) {
    const pg = PAGES[slug];
    if (!pg) return notFound();
    return `<div class="container narrow prose"><h1>${pg[0]}</h1>${pg[1]}<div data-ad="728x90" class="ad-slot"></div></div>`;
  }

  function notFound() {
    return `<div class="container narrow empty"><h1>Page not found</h1><a href="#/" class="btn">Go home</a></div>`;
  }

  // ---------- router ----------
  function route() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = hash.split('?');
    const parts = path.split('/').filter(Boolean);
    let html, title = `${C.name} – ${C.tagline}`;
    switch (parts[0]) {
      case undefined: html = home(); break;
      case 'shop': html = shop(qs); title = `Watch Prices in India – ${C.name}`; break;
      case 'product': html = product(parts[1]); if (byId[parts[1]]) title = `${byId[parts[1]].name} Price in India (2026) – ${C.name}`; break;
      case 'wishlist': html = wishlist(); break;
      case 'about': html = about(); break;
      case 'contact': html = contact(); break;
      case 'page': html = staticPage(parts[1]); break;
      case 'cart': case 'checkout': case 'order': location.hash = '#/'; return;
      default: html = notFound();
    }
    document.title = title;
    app.innerHTML = html;
    document.body.classList.remove('filters-open', 'menu-open');
    document.querySelectorAll('#navLinks a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + hash));
    // Changing a filter on the list page keeps you near the results instead of jumping to the very top.
    const shopTop = $('.shop') ? $('.shop').offsetTop - 120 : 0;
    if (parts[0] !== 'shop' || !route.lastWasShop) window.scrollTo(0, 0);
    else if (window.scrollY > shopTop) window.scrollTo(0, shopTop);
    route.lastWasShop = parts[0] === 'shop';
    if (parts[0] === 'product') setupPdp(byId[parts[1]]);
    Ads.render(document);
  }

  function setupPdp(p) {
    if (!p) return;
    let color = 0;
    const shareText = () => `${p.name} (${p.colors[color].name}) price in India: ${money(p.price)}`;
    const waLink = () => `https://wa.me/?text=${encodeURIComponent(`${shareText()} – ${location.href}`)}`;
    $('#pdpWa').href = waLink();
    app.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
      color = +b.dataset.color;
      $('#pdpMain').innerHTML = image(p, color);
      $('#pdpColorName').textContent = p.colors[color].name;
      app.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('active', +x.dataset.color === color));
      $('#pdpWa').href = waLink();
    }));
    $('[data-share]').addEventListener('click', async () => {
      if (navigator.share) {
        try { await navigator.share({ title: p.name, text: shareText(), url: location.href }); } catch (e) { /* share cancelled */ }
      } else {
        try { await navigator.clipboard.writeText(location.href); toast('Link copied'); } catch (e) { toast(location.href); }
      }
    });
  }

  // ---------- global events ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-wish],[data-card-color],[data-open-filters],[data-close-filters]');
    if (!t) return;
    if (t.dataset.wish) { e.preventDefault(); toggleWish(t.dataset.wish); }
    else if (t.dataset.cardColor !== undefined) {
      e.preventDefault();
      const cardEl = t.closest('[data-card]');
      const p = byId[cardEl.dataset.card];
      cardEl.querySelector('[data-card-img]').innerHTML = image(p, +t.dataset.cardColor);
      cardEl.querySelectorAll('[data-card-color]').forEach((x) => x.classList.toggle('active', x === t));
    } else if (t.hasAttribute('data-open-filters')) document.body.classList.add('filters-open');
    else if (t.hasAttribute('data-close-filters')) document.body.classList.remove('filters-open');
  });

  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-sort]')) {
      const [, qs] = location.hash.split('?');
      location.hash = buildQuery(Object.assign(parseQuery(qs), { sort: e.target.value, page: '' }));
    }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.id === 'searchForm') {
      e.preventDefault();
      const v = $('#searchInput').value.trim();
      location.hash = buildQuery(v ? { q: v } : {});
      $('#searchInput').blur();
    } else if (f.matches('[data-price-form]')) {
      e.preventDefault();
      const [, qs] = location.hash.split('?');
      location.hash = buildQuery(Object.assign(parseQuery(qs), { min: f.min.value, max: f.max.value, page: '' }));
    }
  });

  // ---------- boot ----------
  function boot() {
    document.querySelectorAll('#storeName, .js-store-name').forEach((el) => { el.textContent = C.name; });
    $('#year').textContent = new Date().getFullYear();
    $('#footerTagline').textContent = C.tagline;
    $('#navLinks').innerHTML = `<a href="#/">Home</a><a href="#/shop">All Watches</a>` + CATS.map((c) => `<a href="#/shop?cat=${c.id}">${c.name}</a>`).join('');
    $('#footerCats').innerHTML = CATS.map((c) => `<li><a href="#/shop?cat=${c.id}">${c.name}</a></li>`).join('');
    $('#footerBrands').innerHTML = [...new Set(PRODUCTS.filter((p) => p.pop >= 8).map((p) => p.brand))].slice(0, 10).map((b) => `<li><a href="#/shop?brand=${encodeURIComponent(b)}">${esc(b)} Watches</a></li>`).join('');
    $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
    updateCounts();
    window.addEventListener('hashchange', route);
    window.addEventListener('storage', () => { wish = store('tv_wish', []); updateCounts(); });
    route();
    Ads.initGlobal();
  }
  boot();
})();
