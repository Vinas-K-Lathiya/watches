(function () {
  const C = window.STORE_CONFIG;
  const PRODUCTS = window.PRODUCTS;
  const CATS = window.CATEGORIES;
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const catName = Object.fromEntries(CATS.map((c) => [c.id, c.name]));
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app');

  const PRICE_BANDS = [
    { label: 'Under ₹500', min: 0, max: 499 },
    { label: '₹500 – ₹1,999', min: 500, max: 1999 },
    { label: '₹2,000 – ₹4,999', min: 2000, max: 4999 },
    { label: '₹5,000 – ₹9,999', min: 5000, max: 9999 },
    { label: '₹10,000 & above', min: 10000, max: 1e9 },
  ];
  const PER_PAGE = 24;

  // ---------- helpers ----------
  const money = (n) => C.currency + Number(n).toLocaleString(C.locale);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const off = (p) => Math.round((1 - p.price / p.mrp) * 100);
  const stars = (r) => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));

  function store(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ } }

  let cart = store('tv_cart', []);        // [{id, color, qty}]
  let wish = store('tv_wish', []);        // [id]

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function image(p, colorIdx, cls) {
    const v = p.colors[colorIdx || 0] || p.colors[0];
    if (v.image) return `<img src="${esc(v.image)}" alt="${esc(p.name)} – ${esc(v.name)}" loading="lazy" class="${cls || ''}">`;
    return WatchArt.svg(p, v);
  }

  function updateCounts() {
    $('#cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0);
    $('#wishCount').textContent = wish.length;
  }

  // ---------- cart / wishlist ----------
  function addToCart(id, color, qty) {
    const p = byId[id];
    if (!p || p.stock === 0) return toast('Sorry, this watch is out of stock');
    const line = cart.find((i) => i.id === id && i.color === color);
    if (line) line.qty = Math.min(10, line.qty + qty);
    else cart.push({ id, color, qty });
    save('tv_cart', cart);
    updateCounts();
    toast(`Added to cart: ${p.name} (${p.colors[color].name})`);
  }
  function toggleWish(id) {
    const i = wish.indexOf(id);
    if (i >= 0) wish.splice(i, 1); else wish.push(id);
    save('tv_wish', wish);
    updateCounts();
    toast(i >= 0 ? 'Removed from wishlist' : 'Saved to wishlist ♥');
    document.querySelectorAll(`[data-wish="${id}"]`).forEach((b) => b.classList.toggle('active', i < 0));
  }
  function cartTotals() {
    const subtotal = cart.reduce((s, i) => s + (byId[i.id] ? byId[i.id].price * i.qty : 0), 0);
    const mrp = cart.reduce((s, i) => s + (byId[i.id] ? byId[i.id].mrp * i.qty : 0), 0);
    const shipping = subtotal === 0 || subtotal >= C.freeShippingAbove ? 0 : C.shippingFee;
    return { subtotal, mrp, shipping, total: subtotal + shipping };
  }

  // ---------- components ----------
  function card(p) {
    const swatches = p.colors.map((c, i) => `<button class="swatch sm${i === 0 ? ' active' : ''}" style="--c:${c.swatch}" data-card-color="${i}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join('');
    return `<article class="card" data-card="${p.id}">
      <a href="#/product/${p.id}" class="card-img" data-card-img>${image(p, 0)}</a>
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
      ${p.stock === 0 ? '<span class="badge badge-out">Sold out</span>' : ''}
      <button class="wish-btn${wish.includes(p.id) ? ' active' : ''}" data-wish="${p.id}" aria-label="Add to wishlist">♥</button>
      <div class="card-body">
        <div class="card-brand">${esc(p.brand)} · ${esc(catName[p.category])}</div>
        <a href="#/product/${p.id}" class="card-title">${esc(p.name)}</a>
        <div class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} <span class="muted">(${p.reviews})</span></div>
        <div class="price-row"><span class="price">${money(p.price)}</span><span class="mrp">${money(p.mrp)}</span><span class="off">${off(p)}% off</span></div>
        <div class="card-foot"><div class="swatches">${swatches}</div>
          <button class="btn btn-sm" data-add="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>Add</button></div>
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

  // ---------- pages ----------
  function home() {
    const best = PRODUCTS.filter((p) => p.stock > 0).sort((a, b) => b.pop - a.pop || b.reviews - a.reviews).slice(0, 8);
    const newest = PRODUCTS.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
    const deals = PRODUCTS.filter((p) => off(p) >= 40 && p.stock > 0).slice(0, 8);
    const luxury = PRODUCTS.filter((p) => p.category === 'premium').sort((a, b) => b.pop - a.pop || b.price - a.price).slice(0, 4);
    const find = (re) => PRODUCTS.find((p) => re.test(p.name)) || PRODUCTS[0];
    const hero = [find(/GA-2100/), find(/Grant/), find(/ColorFit Pro 5/)];
    const smartTop = PRODUCTS.filter((p) => p.category === 'smart').sort((a, b) => b.pop - a.pop).slice(0, 4);
    const gshock = PRODUCTS.filter((p) => /G-Shock|Vintage|F-91W|Royale|Duro/.test(p.name)).sort((a, b) => b.pop - a.pop).slice(0, 8);
    const brands = Object.entries(PRODUCTS.reduce((m, p) => { m[p.brand] = (m[p.brand] || 0) + p.pop; return m; }, {})).sort((a, b) => b[1] - a[1]).map(([b]) => b);
    const catTiles = CATS.map((c) => {
      const p = PRODUCTS.find((x) => x.category === c.id);
      const count = PRODUCTS.filter((x) => x.category === c.id).length;
      return `<a class="cat-tile" href="#/shop?cat=${c.id}"><div class="cat-img">${image(p, 0)}</div><div><strong>${c.name}</strong><span class="muted">${count} styles</span></div></a>`;
    }).join('');
    const bands = PRICE_BANDS.map((b) => `<a class="chip" href="#/shop?min=${b.min}&max=${b.max}">${b.label}</a>`).join('');
    return `
      <section class="hero"><div class="container hero-inner">
        <div class="hero-text">
          <span class="eyebrow">New Season Collection 2026</span>
          <h1>Time looks better<br>on your wrist.</h1>
          <p>Discover ${PRODUCTS.length}+ handpicked watches – Casio G-Shock, Titan, Fossil, Noise, boAt and more – from ${money(Math.min(...PRODUCTS.map((p) => p.price)))} to ${money(Math.max(...PRODUCTS.map((p) => p.price)))}.</p>
          <div class="hero-cta"><a href="#/shop" class="btn btn-gold">Shop All Watches</a><a href="#/shop?sort=popular" class="btn btn-ghost">Bestsellers</a></div>
          <div class="hero-trust"><span>✔ Cash on Delivery</span><span>✔ 1–2 Year Warranty</span><span>✔ 7-Day Returns</span></div>
        </div>
        <div class="hero-art">${hero.map((p, i) => `<a href="#/product/${p.id}" class="hero-watch hw${i}">${image(p, 0)}</a>`).join('')}</div>
      </div></section>
      <div class="container"><div data-ad="728x90" class="ad-slot"></div></div>
      ${section('Shop by Category', '#/shop', `<div class="cat-grid">${catTiles}</div>`)}
      ${section('Top Brands', '', `<div class="brand-strip">${brands.map((b) => `<a class="brand-chip" href="#/shop?brand=${encodeURIComponent(b)}">${esc(b)}</a>`).join('')}</div>`)}
      ${section('Shop by Budget', '', `<div class="chips">${bands}</div>`)}
      ${section('Bestsellers', '#/shop?sort=popular', grid(best))}
      <div class="container"><div data-ad="native" class="ad-slot"></div></div>
      ${section('🔥 Hot Deals – 40% off & more', '#/shop?sort=discount', grid(deals))}
      <section class="banner-luxury"><div class="container banner-inner">
        <div><span class="eyebrow">Premium Collection</span><h2>Automatics, chronographs &amp; iconic designs</h2>
        <p>Seiko, Fossil, Citizen, Timex, Armani Exchange and more – up to ${money(20000)}.</p><a href="#/shop?cat=premium" class="btn btn-gold">Explore Premium</a></div>
        <div class="lux-row">${luxury.slice(0, 3).map((p) => `<a href="#/product/${p.id}">${image(p, 0)}</a>`).join('')}</div>
      </div></section>
      ${section('⌚ G-Shock &amp; Casio Icons', '#/shop?q=casio', grid(gshock))}
      ${section('Top Smartwatches', '#/shop?cat=smart&sort=popular', grid(smartTop))}
      ${section('New Arrivals', '#/shop?sort=new', grid(newest))}
      <div class="container"><div data-ad="728x90" class="ad-slot"></div></div>
      <section class="section"><div class="container features">
        <div><span>🚚</span><strong>Fast Delivery</strong><p class="muted">Dispatched in 24 hrs, delivered in 3–7 days across India.</p></div>
        <div><span>💵</span><strong>Cash on Delivery</strong><p class="muted">Pay when your watch arrives at your door.</p></div>
        <div><span>🛡️</span><strong>Warranty Included</strong><p class="muted">Every watch comes with a warranty card.</p></div>
        <div><span>🎁</span><strong>Gift Ready</strong><p class="muted">Premium gift box free with every order.</p></div>
      </div></section>`;
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
    if (q.strap) list = list.filter((p) => p.strapType === q.strap);
    if (q.min) list = list.filter((p) => p.price >= +q.min);
    if (q.max) list = list.filter((p) => p.price <= +q.max);
    if (q.stock) list = list.filter((p) => p.stock > 0);
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
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    if (sorts[q.sort]) list.sort(sorts[q.sort]);
    return list;
  }

  function shop(qs) {
    const q = parseQuery(qs);
    const all = filterProducts(q);
    const page = Math.max(1, +q.page || 1);
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    const list = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const brands = [...new Set(PRODUCTS.map((p) => p.brand))].sort();
    const colors = [...new Map(PRODUCTS.flatMap((p) => p.colors).map((c) => [c.name, c.swatch])).entries()].sort();
    const straps = [['leather', 'Leather'], ['metal', 'Steel'], ['mesh', 'Mesh'], ['rubber', 'Silicone'], ['fabric', 'Fabric']];
    const link = (patch) => buildQuery(Object.assign({}, q, { page: '' }, patch));
    const opt = (key, val, label, extra) => `<a href="${link({ [key]: q[key] === val ? '' : val })}" class="f-opt${q[key] === val ? ' active' : ''}">${extra || ''}${label}</a>`;
    const title = q.q ? `Results for “${esc(q.q)}”` : q.cat ? catName[q.cat] : 'All Watches';
    const active = ['cat', 'brand', 'color', 'strap', 'q', 'min', 'max', 'stock'].some((k) => q[k]);

    const pager = pages > 1 ? `<nav class="pager">${Array.from({ length: pages }, (_, i) => `<a href="${buildQuery(Object.assign({}, q, { page: i + 1 }))}" class="${i + 1 === page ? 'active' : ''}">${i + 1}</a>`).join('')}</nav>` : '';

    return `<div class="container shop">
      <div class="crumbs"><a href="#/">Home</a> / <span>${title}</span></div>
      <div class="shop-layout">
        <aside class="filters" id="filters">
          <div class="filters-head"><h3>Filters</h3>${active ? `<a href="#/shop" class="link">Clear all</a>` : ''}<button class="icon-btn close-filters" data-close-filters aria-label="Close filters">✕</button></div>
          <div class="f-group"><h4>Category</h4>${CATS.map((c) => opt('cat', c.id, c.name)).join('')}</div>
          <div class="f-group"><h4>Price</h4>${PRICE_BANDS.map((b) => `<a href="${link(q.min === String(b.min) && q.max === String(b.max) ? { min: '', max: '' } : { min: b.min, max: b.max })}" class="f-opt${q.min === String(b.min) && q.max === String(b.max) ? ' active' : ''}">${b.label}</a>`).join('')}
            <form class="price-form" data-price-form><input type="number" name="min" placeholder="Min" value="${esc(q.min || '')}" min="0"><input type="number" name="max" placeholder="Max" value="${esc(q.max && q.max !== '1000000000' ? q.max : '')}" min="0"><button class="btn btn-sm">Go</button></form></div>
          <div class="f-group"><h4>Colour</h4><div class="f-colors">${colors.map(([n, sw]) => `<a href="${link({ color: q.color === n ? '' : n })}" class="swatch${q.color === n ? ' active' : ''}" style="--c:${sw}" title="${n}" aria-label="${n}"></a>`).join('')}</div></div>
          <div class="f-group"><h4>Strap</h4>${straps.map(([v, l]) => opt('strap', v, l)).join('')}</div>
          <div class="f-group"><h4>Brand</h4>${brands.map((b) => opt('brand', b, b)).join('')}</div>
          <div class="f-group">${opt('stock', '1', 'In stock only')}</div>
          <div data-ad="160x600" class="ad-slot ad-side"></div>
        </aside>
        <div class="shop-main">
          <div class="shop-bar">
            <h1>${title} <span class="muted">(${all.length})</span></h1>
            <div class="shop-controls">
              <button class="btn btn-ghost btn-sm open-filters" data-open-filters>⚙ Filters</button>
              <select data-sort aria-label="Sort by">
                ${[['', 'Featured'], ['popular', 'Most popular'], ['new', 'Newest'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low'], ['discount', 'Biggest discount'], ['rating', 'Top rated']].map(([v, l]) => `<option value="${v}"${(q.sort || '') === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div data-ad="728x90" class="ad-slot"></div>
          ${list.length ? grid(list, 8) : `<div class="empty"><p>No watches match these filters.</p><a href="#/shop" class="btn">Clear filters</a></div>`}
          ${pager}
        </div>
      </div>
    </div>`;
  }

  function product(id) {
    const p = byId[id];
    if (!p) return notFound();
    const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price)).slice(0, 4);
    const specs = Object.entries(p.specs).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
    return `<div class="container pdp" data-pdp="${p.id}">
      <div class="crumbs"><a href="#/">Home</a> / <a href="#/shop?cat=${p.category}">${catName[p.category]}</a> / <span>${esc(p.name)}</span></div>
      <div class="pdp-grid">
        <div class="gallery">
          <div class="gallery-main" id="pdpMain">${image(p, 0)}</div>
          <div class="thumbs">${p.colors.map((c, i) => `<button class="thumb${i === 0 ? ' active' : ''}" data-color="${i}" aria-label="${esc(c.name)}">${image(p, i)}</button>`).join('')}</div>
        </div>
        <div class="pdp-info">
          <div class="card-brand">${esc(p.brand)} · SKU ${p.sku}</div>
          <h1>${esc(p.name)}</h1>
          <div class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} · ${p.reviews} ratings</div>
          <div class="price-row big"><span class="price">${money(p.price)}</span><span class="mrp">${money(p.mrp)}</span><span class="off">${off(p)}% off</span></div>
          <p class="muted small">Inclusive of all taxes · ${p.price >= C.freeShippingAbove ? 'Free delivery' : `Free delivery above ${money(C.freeShippingAbove)}`}</p>
          <div class="pdp-colors"><div><strong>Colour:</strong> <span id="pdpColorName">${esc(p.colors[0].name)}</span></div>
            <div class="swatches">${p.colors.map((c, i) => `<button class="swatch${i === 0 ? ' active' : ''}" style="--c:${c.swatch}" data-color="${i}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join('')}</div></div>
          <div class="stock ${p.stock === 0 ? 'out' : p.stock < 8 ? 'low' : ''}">${p.stock === 0 ? 'Out of stock' : p.stock < 8 ? `Only ${p.stock} left – order soon!` : 'In stock'}</div>
          <div class="buy-row">
            <div class="qty"><button data-qty="-1" aria-label="Decrease">−</button><input id="pdpQty" type="number" value="1" min="1" max="10" aria-label="Quantity"><button data-qty="1" aria-label="Increase">+</button></div>
            <button class="btn" data-pdp-add ${p.stock === 0 ? 'disabled' : ''}>Add to Cart</button>
            <button class="btn btn-gold" data-pdp-buy ${p.stock === 0 ? 'disabled' : ''}>Buy Now</button>
            <button class="icon-btn wish-inline${wish.includes(p.id) ? ' active' : ''}" data-wish="${p.id}" aria-label="Wishlist">♥</button>
          </div>
          <a class="btn btn-wa" target="_blank" rel="noopener" id="pdpWa">💬 Ask on WhatsApp</a>
          <ul class="perks"><li>💵 Cash on Delivery available</li><li>🔁 7-day easy return & exchange</li><li>🛡️ ${esc(p.specs.Warranty)} warranty</li><li>🎁 Free premium gift box</li></ul>
          <div data-ad="300x250" class="ad-slot"></div>
        </div>
      </div>
      <div class="pdp-details">
        <section><h2>Description</h2><p>${esc(p.description)}</p><h3>Key Features</h3><ul class="feat">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></section>
        <section><h2>Specifications</h2><table class="specs">${specs}</table></section>
      </div>
      <div data-ad="728x90" class="ad-slot"></div>
      ${related.length ? `<section class="section"><div class="section-head"><h2>You may also like</h2></div>${grid(related)}</section>` : ''}
    </div>`;
  }

  function cartPage() {
    cart = cart.filter((i) => byId[i.id]);
    if (!cart.length) return `<div class="container narrow empty"><h1>Your cart is empty</h1><p class="muted">Looks like you haven't added any watches yet.</p><a href="#/shop" class="btn">Start shopping</a><div data-ad="300x250" class="ad-slot"></div></div>`;
    const t = cartTotals();
    const rows = cart.map((i, idx) => {
      const p = byId[i.id];
      return `<div class="cart-row">
        <a href="#/product/${p.id}" class="cart-img">${image(p, i.color)}</a>
        <div class="cart-info"><a href="#/product/${p.id}" class="card-title">${esc(p.name)}</a><div class="muted small">Colour: ${esc(p.colors[i.color].name)}</div>
          <div class="price-row"><span class="price">${money(p.price)}</span><span class="mrp">${money(p.mrp)}</span></div></div>
        <div class="qty"><button data-cart-qty="${idx}" data-d="-1" aria-label="Decrease">−</button><input value="${i.qty}" readonly aria-label="Quantity"><button data-cart-qty="${idx}" data-d="1" aria-label="Increase">+</button></div>
        <div class="cart-line">${money(p.price * i.qty)}</div>
        <button class="icon-btn" data-cart-remove="${idx}" aria-label="Remove">🗑</button>
      </div>`;
    }).join('');
    return `<div class="container"><div class="crumbs"><a href="#/">Home</a> / <span>Cart</span></div>
      <h1>Shopping Cart</h1>
      <div class="cart-layout"><div class="cart-list">${rows}</div>
      <aside class="summary">${summary(t)}<a href="#/checkout" class="btn btn-gold btn-block">Proceed to Checkout</a><a href="#/shop" class="link center">← Continue shopping</a><div data-ad="300x250" class="ad-slot"></div></aside></div></div>`;
  }

  function summary(t) {
    const need = C.freeShippingAbove - t.subtotal;
    return `<h3>Order Summary</h3>
      <div class="sum-row"><span>MRP total</span><span>${money(t.mrp)}</span></div>
      <div class="sum-row save"><span>Discount</span><span>− ${money(t.mrp - t.subtotal)}</span></div>
      <div class="sum-row"><span>Shipping</span><span>${t.shipping ? money(t.shipping) : 'FREE'}</span></div>
      <div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>
      ${need > 0 ? `<p class="small muted">Add ${money(need)} more for free shipping.</p>` : `<p class="small save">You save ${money(t.mrp - t.subtotal)} on this order 🎉</p>`}`;
  }

  function checkout() {
    if (!cart.length) { location.hash = '#/cart'; return ''; }
    const t = cartTotals();
    const saved = store('tv_address', {});
    const f = (name, label, type, extra) => `<label>${label}<input name="${name}" type="${type || 'text'}" value="${esc(saved[name] || '')}" ${extra === undefined ? 'required' : extra}></label>`;
    return `<div class="container"><div class="crumbs"><a href="#/">Home</a> / <a href="#/cart">Cart</a> / <span>Checkout</span></div>
      <h1>Checkout</h1>
      <div class="cart-layout">
        <form class="checkout-form" id="checkoutForm">
          <h3>Delivery Address</h3>
          <div class="form-grid">
            ${f('name', 'Full name')}${f('phone', 'Mobile number', 'tel', 'required pattern="[0-9+ ]{10,15}"')}
            ${f('email', 'Email (optional)', 'email', '')}${f('pincode', 'PIN code', 'text', 'required pattern="[0-9]{6}"')}
            <label class="full">Address (house no, street, area)<textarea name="address" required rows="2">${esc(saved.address || '')}</textarea></label>
            ${f('city', 'City')}${f('state', 'State')}
          </div>
          <h3>Payment</h3>
          <label class="radio"><input type="radio" name="payment" value="Cash on Delivery" checked> 💵 Cash on Delivery</label>
          <label class="radio"><input type="radio" name="payment" value="UPI / Online (payment link on WhatsApp)"> 📱 UPI / Online – we'll send a payment link on WhatsApp</label>
          <label class="full">Order note (optional)<textarea name="note" rows="2"></textarea></label>
          <button class="btn btn-gold btn-block" type="submit">Place Order – ${money(t.total)}</button>
          <p class="small muted">After placing the order, WhatsApp opens with your order details. Send the message to confirm.</p>
        </form>
        <aside class="summary">${cart.map((i) => `<div class="mini-item">${image(byId[i.id], i.color)}<div><div>${esc(byId[i.id].name)}</div><div class="muted small">${esc(byId[i.id].colors[i.color].name)} × ${i.qty}</div></div><strong>${money(byId[i.id].price * i.qty)}</strong></div>`).join('')}${summary(t)}</aside>
      </div></div>`;
  }

  function placeOrder(form) {
    const d = Object.fromEntries(new FormData(form).entries());
    save('tv_address', { name: d.name, phone: d.phone, email: d.email, pincode: d.pincode, address: d.address, city: d.city, state: d.state });
    const t = cartTotals();
    const orderId = 'TV' + Date.now().toString().slice(-8);
    const lines = cart.map((i, n) => `${n + 1}. ${byId[i.id].name} (${byId[i.id].sku}) – ${byId[i.id].colors[i.color].name} × ${i.qty} = ${money(byId[i.id].price * i.qty)}`);
    const msg = [
      `🛒 *New Order ${orderId}*`, '', ...lines, '',
      `Subtotal: ${money(t.subtotal)}`, `Shipping: ${t.shipping ? money(t.shipping) : 'FREE'}`, `*Total: ${money(t.total)}*`,
      `Payment: ${d.payment}`, '',
      `*Deliver to:*`, d.name, d.phone, d.email || '', `${d.address}, ${d.city}, ${d.state} – ${d.pincode}`,
      d.note ? `Note: ${d.note}` : '',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    const orders = store('tv_orders', []);
    orders.unshift({ orderId, date: new Date().toISOString(), items: cart, total: t.total, customer: d });
    save('tv_orders', orders.slice(0, 20));
    cart = [];
    save('tv_cart', cart);
    updateCounts();
    window.open(`https://wa.me/${C.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
    location.hash = `#/order/${orderId}`;
  }

  function orderDone(id) {
    const o = store('tv_orders', []).find((x) => x.orderId === id);
    return `<div class="container narrow empty">
      <div class="success-icon">✔</div>
      <h1>Thank you${o ? ', ' + esc(o.customer.name.split(' ')[0]) : ''}!</h1>
      <p>Your order <strong>${esc(id)}</strong>${o ? ` of <strong>${money(o.total)}</strong>` : ''} has been placed.</p>
      <p class="muted">Please send the pre-filled WhatsApp message so we can confirm your order. If WhatsApp didn't open, <a class="link" href="https://wa.me/${C.whatsapp}?text=${encodeURIComponent('Hi, I placed order ' + id)}" target="_blank" rel="noopener">tap here</a>.</p>
      <a href="#/shop" class="btn">Continue shopping</a>
      <div data-ad="300x250" class="ad-slot"></div></div>`;
  }

  function wishlist() {
    const list = wish.map((id) => byId[id]).filter(Boolean);
    return `<div class="container"><div class="crumbs"><a href="#/">Home</a> / <span>Wishlist</span></div><h1>My Wishlist <span class="muted">(${list.length})</span></h1>
      ${list.length ? grid(list) : '<div class="empty"><p class="muted">No saved watches yet. Tap ♥ on any watch to save it.</p><a href="#/shop" class="btn">Browse watches</a></div>'}</div>`;
  }

  function about() {
    return `<div class="container narrow prose"><h1>About ${esc(C.name)}</h1>
      <p>${esc(C.name)} is a trusted watch store bringing you stylish, reliable watches at honest prices. From everyday analog watches starting at ${money(100)} to premium luxury pieces up to ${money(20000)}, every watch in our collection is checked by our team before it is shipped.</p>
      <p>We stock ${PRODUCTS.length}+ models across men's, women's, smartwatches, G-Shock & sports, chronographs, premium and kids categories, in multiple colours and strap options.</p>
      <h2>Why shop with us?</h2><ul><li>Quality-checked watches with warranty</li><li>Cash on Delivery across India</li><li>7-day easy returns & exchange</li><li>Friendly support on WhatsApp</li></ul>
      <div data-ad="728x90" class="ad-slot"></div></div>`;
  }

  function contact() {
    return `<div class="container narrow prose"><h1>Contact Us</h1>
      <p>We usually reply within a few hours.</p>
      <ul class="contact-list"><li>💬 WhatsApp: <a class="link" href="https://wa.me/${C.whatsapp}" target="_blank" rel="noopener">${esc(C.phone)}</a></li>
      <li>📞 Phone: <a class="link" href="tel:${esc(C.phone.replace(/\s/g, ''))}">${esc(C.phone)}</a></li>
      <li>✉️ Email: <a class="link" href="mailto:${esc(C.email)}">${esc(C.email)}</a></li><li>📍 ${esc(C.address)}</li></ul>
      <form class="checkout-form" id="contactForm"><div class="form-grid">
        <label>Your name<input name="name" required></label><label>Phone / Email<input name="contact" required></label>
        <label class="full">Message<textarea name="message" rows="4" required></textarea></label></div>
        <button class="btn">Send on WhatsApp</button></form></div>`;
  }

  const PAGES = {
    shipping: ['Shipping Policy', `<p>Orders are dispatched within 24–48 hours and delivered within 3–7 working days across India. Shipping is free on orders above ${money(C.freeShippingAbove)}; below that a flat fee of ${money(C.shippingFee)} applies. You'll receive tracking details on WhatsApp/SMS once your order ships.</p>`],
    returns: ['Returns & Refunds', '<p>If you are not happy with your watch, you can request a return or exchange within 7 days of delivery. The watch must be unused, with original tags, box and warranty card. Contact us on WhatsApp with your order ID to start a return. Refunds are processed within 5–7 working days after we receive the product.</p>'],
    warranty: ['Warranty', '<p>All watches carry a manufacturer warranty against movement defects (see the product page for the period). The warranty does not cover glass, strap, battery, water damage caused by misuse, or physical damage. Keep your warranty card and order ID for claims.</p>'],
    faq: ['Frequently Asked Questions', `<h3>Is Cash on Delivery available?</h3><p>Yes, COD is available across India.</p><h3>How do I confirm my order?</h3><p>After checkout, WhatsApp opens with your order details – just press send. We'll confirm within a few hours.</p><h3>Are the colours accurate?</h3><p>We try our best to show accurate colours, but slight variations may occur due to screen settings.</p><h3>Can I get a gift wrap?</h3><p>Every watch ships in a premium gift box at no extra cost.</p>`],
    privacy: ['Privacy Policy', `<p>We collect only the details needed to deliver your order (name, phone, address, email). Your cart, wishlist and saved address are stored in your own browser. We never sell your personal information.</p><p><strong>Advertising:</strong> This website shows ads served by third-party networks such as Adsterra. These partners may use cookies or similar technologies to show relevant ads and measure performance. You can control cookies through your browser settings.</p><p>For any privacy questions, contact ${esc(C.email)}.</p>`],
    terms: ['Terms & Conditions', '<p>By using this website you agree to these terms. Prices and availability may change without notice. We reserve the right to cancel orders in case of pricing errors or stock unavailability, with a full refund of any amount paid. Product images are for illustration; the actual product may vary slightly.</p>'],
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
      case 'shop': html = shop(qs); title = `Shop Watches – ${C.name}`; break;
      case 'product': html = product(parts[1]); if (byId[parts[1]]) title = `${byId[parts[1]].name} – ${C.name}`; break;
      case 'cart': html = cartPage(); title = `Cart – ${C.name}`; break;
      case 'checkout': html = checkout(); title = `Checkout – ${C.name}`; break;
      case 'order': html = orderDone(parts[1]); break;
      case 'wishlist': html = wishlist(); break;
      case 'about': html = about(); break;
      case 'contact': html = contact(); break;
      case 'page': html = staticPage(parts[1]); break;
      default: html = notFound();
    }
    if (!html) return;
    document.title = title;
    app.innerHTML = html;
    document.body.classList.remove('filters-open', 'menu-open');
    document.querySelectorAll('#navLinks a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + hash));
    // Changing a filter on the shop page keeps you near the results instead of jumping to the very top.
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
    const waLink = () => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(`Hi, I'm interested in ${p.name} (${p.sku}) in ${p.colors[color].name} – ${money(p.price)}. ${location.href}`)}`;
    $('#pdpWa').href = waLink();
    app.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
      color = +b.dataset.color;
      $('#pdpMain').innerHTML = image(p, color);
      $('#pdpColorName').textContent = p.colors[color].name;
      app.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('active', +x.dataset.color === color));
      $('#pdpWa').href = waLink();
    }));
    const qty = $('#pdpQty');
    app.querySelectorAll('[data-qty]').forEach((b) => b.addEventListener('click', () => { qty.value = Math.min(10, Math.max(1, (+qty.value || 1) + +b.dataset.qty)); }));
    const q = () => Math.min(10, Math.max(1, +qty.value || 1));
    $('[data-pdp-add]').addEventListener('click', () => addToCart(p.id, color, q()));
    $('[data-pdp-buy]').addEventListener('click', () => { addToCart(p.id, color, q()); location.hash = '#/checkout'; });
  }

  // ---------- global events ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-add],[data-wish],[data-card-color],[data-cart-qty],[data-cart-remove],[data-open-filters],[data-close-filters]');
    if (!t) return;
    if (t.dataset.add) { e.preventDefault(); const cardEl = t.closest('[data-card]'); const active = cardEl && cardEl.querySelector('[data-card-color].active'); addToCart(t.dataset.add, active ? +active.dataset.cardColor : 0, 1); }
    else if (t.dataset.wish) { e.preventDefault(); toggleWish(t.dataset.wish); }
    else if (t.dataset.cardColor !== undefined) {
      e.preventDefault();
      const cardEl = t.closest('[data-card]');
      const p = byId[cardEl.dataset.card];
      cardEl.querySelector('[data-card-img]').innerHTML = image(p, +t.dataset.cardColor);
      cardEl.querySelectorAll('[data-card-color]').forEach((x) => x.classList.toggle('active', x === t));
    } else if (t.dataset.cartQty !== undefined) {
      const line = cart[+t.dataset.cartQty];
      line.qty = Math.min(10, Math.max(1, line.qty + +t.dataset.d));
      save('tv_cart', cart); updateCounts(); route();
    } else if (t.dataset.cartRemove !== undefined) {
      cart.splice(+t.dataset.cartRemove, 1); save('tv_cart', cart); updateCounts(); route(); toast('Removed from cart');
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
    } else if (f.id === 'checkoutForm') {
      e.preventDefault();
      placeOrder(f);
    } else if (f.id === 'contactForm') {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f).entries());
      window.open(`https://wa.me/${C.whatsapp}?text=${encodeURIComponent(`Hi, I'm ${d.name} (${d.contact}).\n${d.message}`)}`, '_blank');
      f.reset();
      toast('Opening WhatsApp…');
    }
  });

  // ---------- boot ----------
  function boot() {
    document.querySelectorAll('#storeName, .js-store-name').forEach((el) => { el.textContent = C.name; });
    $('#year').textContent = new Date().getFullYear();
    $('#footerTagline').textContent = C.tagline;
    $('#footerContact').innerHTML = `📞 ${esc(C.phone)}<br>✉️ ${esc(C.email)}<br>📍 ${esc(C.address)}`;
    $('#waFloat').href = `https://wa.me/${C.whatsapp}`;
    $('#navLinks').innerHTML = `<a href="#/">Home</a><a href="#/shop">All Watches</a>` + CATS.map((c) => `<a href="#/shop?cat=${c.id}">${c.name}</a>`).join('') + `<a href="#/contact">Contact</a>`;
    $('#footerCats').innerHTML = CATS.map((c) => `<li><a href="#/shop?cat=${c.id}">${c.name}</a></li>`).join('');
    $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
    updateCounts();
    window.addEventListener('hashchange', route);
    window.addEventListener('storage', () => { cart = store('tv_cart', []); wish = store('tv_wish', []); updateCounts(); });
    route();
    Ads.initGlobal();
  }
  boot();
})();
