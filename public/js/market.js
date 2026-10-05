/* Luxury watch database: photos, details and real listings of the models that have a photo
 * (Chrono24, July 2023). Prices shown are display prices (₹1,500–₹2,499), not market prices.
 * Data lives in data/market/ and is loaded on demand.
 * Built by scripts/build-market.py. */
(function () {
  const C = window.STORE_CONFIG;
  const BASE = 'data/market/';
  const PER_PAGE_MODELS = 48;
  const PER_PAGE_ROWS = 50;
  const cache = {};

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('en-IN');

  // ---------- display prices ----------
  // Every watch shows a display price from ₹1,500 to ₹2,499, picked "at random" from its name so it
  // stays the same on every visit. These are not market prices (the site says so on every page).
  // Possible prices: 1500, 1599, 1699, 1799, ... 2499.
  const PRICES = [1500, 1599, 1699, 1799, 1899, 1999, 2099, 2199, 2299, 2399, 2499];
  const PRICE_MIN = PRICES[0];
  function price(bs, ms) {
    let h = 2166136261;
    for (const ch of `${bs}/${ms}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return PRICES[(h >>> 0) % PRICES.length];
  }
  const rs = (n) => '₹' + fmt(n);
  const priceNote = `<p class="small muted">Display price – not a market price.</p>`;

  function load(path) {
    if (!cache[path]) {
      cache[path] = fetch(BASE + path).then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      }).catch((e) => { delete cache[path]; throw e; });
    }
    return cache[path];
  }

  // ---------- photos (Wikimedia Commons, see scripts/fetch-images.py) ----------
  let PH = {}, BRAND_PH = {}, INDEX = null;
  function photos() {
    return Promise.all([load('images.json').catch(() => ({})), load('index.json')]).then(([ph, idx]) => {
      PH = ph;
      BRAND_PH = {};
      idx.models.forEach((m) => { m[4] = price(m[0], m[1]); });
      // A brand's picture is the photo of its most-listed model that has one.
      idx.models.forEach((m) => { const p = PH[`${m[0]}/${m[1]}`]; if (p && !BRAND_PH[m[0]]) BRAND_PH[m[0]] = p; });
    });
  }
  function pic(p, alt, brand) {
    if (!p) return `<div class="card-img mk-nophoto"><span>${esc((brand || alt).split(/\s+/).map((w) => w[0]).join('').slice(0, 2))}</span></div>`;
    return `<div class="card-img mk-photo"><img src="${esc(p.src)}" alt="${esc(alt)}" loading="lazy"></div>`;
  }
  const credit = (p) => p ? `<p class="small muted mk-credit">Photo: <a class="link" href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.author)}</a>, ${p.licenceUrl ? `<a class="link" href="${esc(p.licenceUrl)}" target="_blank" rel="noopener">${esc(p.licence)}</a>` : esc(p.licence)}, via Wikimedia Commons</p>` : '';

  // ---------- shared bits ----------
  const ad = (t) => `<div data-ad="${t || '728x90'}" class="ad-slot"></div>`;
  const loading = '<div class="mk-loading">Loading market data…</div>';
  const sourceNote = (n) => `<p class="small muted mk-source">Prices on this site are display prices between ₹1,500 and ₹2,499 set by ${esc(C.name)}; they are not market prices or offers. Model and listing details: <a class="link" href="https://www.kaggle.com/datasets/philmorekoung11/luxury-watch-listings" target="_blank" rel="noopener">Luxury Watch Listings dataset</a> by Philmore Koung${n ? ` (${fmt(n)} listings from chrono24.com, July 2023)` : ''}.</p>`;
  function parseQuery(q) { const o = {}; new URLSearchParams(q || '').forEach((v, k) => { o[k] = v; }); return o; }
  function qlink(path, q, patch) {
    const u = new URLSearchParams();
    const all = Object.assign({}, q, patch);
    Object.keys(all).forEach((k) => { if (all[k] !== '' && all[k] != null) u.set(k, all[k]); });
    const s = u.toString();
    return '#/market' + path + (s ? '?' + s : '');
  }
  function pager(page, pages, href) {
    if (pages <= 1) return '';
    const nums = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= pages));
    let out = '', last = 0;
    [...nums].sort((a, b) => a - b).forEach((n) => { if (n - last > 1) out += '<span class="pager-gap">…</span>'; out += `<a href="${href(n)}" class="${n === page ? 'active' : ''}">${n}</a>`; last = n; });
    return `<nav class="pager">${out}</nav>`;
  }
  const priceBlock = (n) => `<div class="price-row"><span class="price">${rs(n)}</span></div>`;

  // Box 2 of the first row is a Sponsored box the same size as a watch box,
  // and a full-width native ad row follows every 3 rows.
  const adCard = '<div class="card ad-card"><span class="ad-label">Sponsored</span><div data-ad="card"></div></div>';
  // Number of watch boxes per row on this screen (matches .grid in style.css: boxes at least 220px wide).
  function gridColumns() {
    const w = window.innerWidth;
    const content = w >= 1700 ? 1280 : w >= 1366 ? w - 2 * 196 - 32 : Math.min(w, 1280) - 32;
    if (w <= 560) return 2;
    return Math.max(1, Math.floor((content + 18) / (220 + 18)));
  }
  // One Sponsored box, as the 2nd box of the first row only (noCard: none, e.g. for extra endless batches).
  function grid(cards, noCard) {
    const out = cards.slice();
    if (!noCard && out.length > 1) out.splice(1, 0, adCard);
    // A full-width native ad row after every 3 rows of boxes.
    const perRows = gridColumns() * 3;
    let html = '';
    out.forEach((c, i) => {
      html += c;
      if ((i + 1) % perRows === 0 && i < out.length - 1) html += '<div class="grid-ad native-row" data-ad="native-frame"></div>';
    });
    return `<div class="grid">${html}</div>`;
  }

  // ---------- endless lists ----------
  // Shows the first batch right away and adds the next batch each time the visitor
  // scrolls near the end, until every watch is shown.
  const BATCH = 24;
  let afterRender = null;
  function endless(id, models) {
    afterRender = () => {
      const box = document.getElementById(id);
      if (!box) return;
      let shown = 0;
      const sentinel = document.createElement('div');
      sentinel.className = 'mk-more';
      box.after(sentinel);
      const more = () => {
        box.insertAdjacentHTML('beforeend', grid(models.slice(shown, shown + BATCH).map(modelCard), shown > 0));
        shown += BATCH;
        Ads.render(box);
        sentinel.textContent = `Showing ${Math.min(shown, models.length)} of ${models.length} – scroll for more`;
      };
      // Load the next batch whenever the end of the list is within 600px of the screen.
      const check = () => {
        if (!document.body.contains(box)) { window.removeEventListener('scroll', check); return; }
        if (shown >= models.length) { sentinel.remove(); window.removeEventListener('scroll', check); return; }
        if (sentinel.getBoundingClientRect().top < window.innerHeight + 600) { more(); setTimeout(check, 50); }
      };
      more();
      window.addEventListener('scroll', check, { passive: true });
      setTimeout(check, 50);
    };
    return `<div id="${id}" class="mk-endless"></div>`;
  }

  // ---------- pages ----------
  const BANDS = [['Under ₹1,800', 0, 1800], ['₹1,800 – ₹2,200', 1800, 2200], ['₹2,200 & above', 2200, '']];

  function brandCard(b) {
    return `<a class="card mk-card" href="#/market/${b.slug}">
      ${pic(BRAND_PH[b.slug], b.brand, b.brand)}
      <div class="card-body"><div class="card-title">${esc(b.brand)}</div>
        <div class="small muted">${fmt(b.listings)} listings · ${b.models} models</div>
        <div class="price-row"><span class="small muted">From</span><span class="price">${rs(b.from || PRICE_MIN)}</span></div></div></a>`;
  }
  // m = [brandSlug, modelSlug, brand, model, medianUsd, listings]
  function modelCard(m) {
    return `<a class="card mk-card" href="#/market/${m[0]}/${m[1]}">
      ${pic(PH[`${m[0]}/${m[1]}`], `${m[2]} ${m[3]}`, m[2])}
      <div class="card-body"><div class="card-brand">${esc(m[2])}</div><div class="card-title">${esc(m[3])}</div>
        <div class="small muted">${fmt(m[5])} listings</div>
        ${priceBlock(m[4])}</div></a>`;
  }
  const realModels = (idx) => idx.models.filter((m) => m[3] !== 'Other models');
  function withFrom(idx, brands) {
    const from = {};
    idx.models.forEach((m) => { from[m[0]] = Math.min(from[m[0]] || Infinity, m[4]); });
    return brands.map((b) => Object.assign({}, b, { from: from[b.slug] }));
  }

  function home() {
    return load('index.json').then((idx) => {
      const brands = withFrom(idx, idx.brands.filter((b) => b.listings >= 100));
      const models = realModels(idx);
      const section = (title, link, inner) => `<section class="section"><div class="section-head"><h2>${title}</h2>${link ? `<a href="${link}" class="link">View all →</a>` : ''}</div>${inner}</section>`;
      return `<section class="hero"><div class="container hero-inner">
          <div class="hero-text">
            <span class="eyebrow">Luxury Watch Database</span>
            <h1>Luxury watches,<br>real photos.</h1>
            <p>Photos, details and ${fmt(idx.listings)} real listings of ${fmt(idx.models.length)} models from ${brands.length} luxury brands – Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier, Tudor and more.</p>
            <form class="mk-search" data-mk-search><input name="q" type="search" placeholder="Search a model, e.g. Submariner, Nautilus, Royal Oak…" aria-label="Search models"><button class="btn btn-gold">Search</button></form>
            <div class="hero-trust"><span>✔ ${fmt(idx.listings)} listings</span><span>✔ Real photos</span><span>✔ Display prices ₹1,500–₹2,499</span></div>
          </div>
          <div class="hero-stats">
            <div><strong>${fmt(idx.listings)}</strong><span>real listings</span></div>
            <div><strong>${fmt(idx.models.length)}</strong><span>models</span></div>
            <div><strong>${fmt(Object.keys(PH).length)}</strong><span>real photos</span></div>
            <div><strong>${brands.length}</strong><span>luxury brands</span></div>
          </div>
        </div></section>
        <div class="container">
        ${ad()}
        ${section('Browse by Brand', '#/market/brands', grid(brands.slice(0, 10).map(brandCard)))}
        <div class="native-row native-slot" data-ad="native-frame"></div>
        ${section(`⌚ All Watches <span class="muted">(${fmt(models.length)})</span>`, '', `<div id="homeAll">${grid(models.slice().sort((x, y) => y[5] - x[5]).map(modelCard))}</div>`)}
        ${sourceNote(idx.listings)}
        </div>`;
    });
  }

  function creditsPage() {
    return load('index.json').then((idx) => {
      const names = {};
      idx.models.forEach((m) => { names[`${m[0]}/${m[1]}`] = `${m[2]} ${m[3]}`; });
      const rows = Object.entries(PH).sort().map(([k, p]) => `<tr><td><a class="link" href="#/market/${k}">${esc(names[k] || k)}</a></td><td><a class="link" href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.title)}</a></td><td>${esc(p.author)}</td><td>${p.licenceUrl ? `<a class="link" href="${esc(p.licenceUrl)}" target="_blank" rel="noopener">${esc(p.licence)}</a>` : esc(p.licence)}</td></tr>`).join('');
      return `<div class="container">
        <div class="crumbs"><a href="#/">Home</a> / <span>Photo Credits</span></div>
        <h1>Photo Credits</h1>
        <p class="muted">All ${Object.keys(PH).length} watch photos on this site come from <a class="link" href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a> and are used under the free licences listed below. Photos show the model family and may not match every reference number exactly.</p>
        <div class="table-wrap"><table class="mk-table"><thead><tr><th>Watch</th><th>File</th><th>Author</th><th>Licence</th></tr></thead><tbody>${rows}</tbody></table></div>
        ${ad()}
      </div>`;
    });
  }

  function brandsPage() {
    return load('index.json').then((idx) => {
      const main = idx.brands.filter((b) => b.listings >= 100);
      const others = idx.brands.filter((b) => b.listings < 100);
      return `<div class="container">
        <div class="crumbs"><a href="#/">Home</a> / <span>All Brands</span></div>
        <h1>All Watch Brands <span class="muted">(${main.length})</span></h1>
        ${ad()}
        ${grid(withFrom(idx, main).map(brandCard))}
        ${others.length ? `<p class="small muted" style="margin-top:14px">Also in the data, with only a few listings: ${others.map((b) => `<a class="link" href="#/market/${b.slug}">${esc(b.brand)}</a>`).join(', ')}.</p>` : ''}
        ${ad('native')}
        ${sourceNote(idx.listings)}
      </div>`;
    });
  }

  function allModels(q) {
    return load('index.json').then((idx) => {
      let list = idx.models.slice();
      if (q.q) { const words = q.q.toLowerCase().split(/\s+/).filter(Boolean); list = list.filter((m) => { const h = (m[2] + ' ' + m[3]).toLowerCase(); return words.every((w) => h.includes(w)); }); }
      if (q.brand) list = list.filter((m) => m[0] === q.brand);
      if (q.min) list = list.filter((m) => m[4] >= +q.min);
      if (q.max) list = list.filter((m) => m[4] < +q.max);
      const sorts = { popular: (x, y) => y[5] - x[5], low: (x, y) => (x[4] || 9e9) - (y[4] || 9e9), high: (x, y) => (y[4] || 0) - (x[4] || 0), name: (x, y) => (x[2] + x[3]).localeCompare(y[2] + y[3]) };
      list.sort(sorts[q.sort] || sorts.popular);
      const page = Math.max(1, +q.page || 1);
      const pages = Math.max(1, Math.ceil(list.length / PER_PAGE_MODELS));
      const view = list.slice((page - 1) * PER_PAGE_MODELS, page * PER_PAGE_MODELS);
      const cards = grid(view.map(modelCard));
      const band = BANDS.find(([, lo, hi]) => String(lo) === (q.min || '0') && String(hi) === (q.max || ''));
      const title = q.q ? `Results for “${esc(q.q)}”` : band ? `Luxury Watches ${band[0]}` : q.max ? `Luxury Watches Under ₹${fmt(q.max)}` : q.sort === 'high' ? 'Top Priced Watch Models' : 'All Watch Models';
      const brands = idx.brands.filter((b) => b.listings >= 100);
      return `<div class="container">
        <div class="crumbs"><a href="#/">Home</a> / <span>${title}</span></div>
        <div class="shop-bar"><h1>${title} <span class="muted">(${fmt(list.length)})</span></h1>
          <div class="shop-controls"><select data-mk-sort aria-label="Sort">${[['popular', 'Most listed'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low'], ['name', 'Name A–Z']].map(([v, l]) => `<option value="${v}"${(q.sort || 'popular') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <form class="mk-search" data-mk-filter><input name="q" type="search" placeholder="Search models…" value="${esc(q.q || '')}"><button class="btn btn-sm">Search</button></form>
        <div class="chips">${BANDS.map(([l, lo, hi]) => { const on = band && band[0] === l; return `<a class="chip chip-sm${on ? ' active' : ''}" href="${qlink('/all', q, on ? { min: '', max: '', page: '' } : { min: lo, max: hi, page: '' })}">${l}</a>`; }).join('')}</div>
        <div class="chips" style="margin-top:8px">${brands.map((b) => `<a class="chip chip-sm${q.brand === b.slug ? ' active' : ''}" href="${qlink('/all', q, { brand: q.brand === b.slug ? '' : b.slug, page: '' })}">${esc(b.brand)}</a>`).join('')}</div>
        ${ad('native')}
        ${view.length ? cards : `<div class="empty"><p class="muted">No models found.</p><a class="btn" href="#/market/all">Show all models</a></div>`}
        ${pager(page, pages, (n) => qlink('/all', q, { page: n }))}
        ${ad()}
        ${sourceNote(idx.listings)}
      </div>`;
    });
  }

  function brandPage(bs, q) {
    return load(bs + '.json').then((b) => {
      b.models.forEach((m) => { m.med = price(bs, m.slug); });
      let models = b.models.slice();
      if (q.q) { const w = q.q.toLowerCase(); models = models.filter((m) => m.model.toLowerCase().includes(w) || m.refs.some((r) => r.ref.toLowerCase().includes(w))); }
      const sorts = { popular: (x, y) => y.listings - x.listings, low: (x, y) => (x.med || 9e9) - (y.med || 9e9), high: (x, y) => (y.med || 0) - (x.med || 0), name: (x, y) => x.model.localeCompare(y.model) };
      models.sort(sorts[q.sort] || sorts.popular);
      const page = Math.max(1, +q.page || 1);
      const pages = Math.max(1, Math.ceil(models.length / PER_PAGE_MODELS));
      const list = models.slice((page - 1) * PER_PAGE_MODELS, page * PER_PAGE_MODELS);
      const cards = grid(list.map((m) => `<a class="card mk-card" href="#/market/${bs}/${m.slug}">
          ${pic(PH[`${bs}/${m.slug}`], `${b.brand} ${m.model}`, b.brand)}
          <div class="card-body"><div class="card-brand">${esc(b.brand)}</div><div class="card-title">${esc(m.model)}</div>
            <div class="small muted">${fmt(m.listings)} listings · ${m.refCount} refs</div>${priceBlock(m.med)}</div></a>`));
      return `<div class="container">
        <div class="crumbs"><a href="#/">Home</a> / <a href="#/market/brands">Brands</a> / <span>${esc(b.brand)}</span></div>
        <div class="shop-bar"><h1>${esc(b.brand)} Watch Prices <span class="muted">(${b.models.length} models)</span></h1>
          <div class="shop-controls"><select data-mk-sort aria-label="Sort">${[['popular', 'Most listed'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low'], ['name', 'Name A–Z']].map(([v, l]) => `<option value="${v}"${(q.sort || 'popular') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <div class="mk-stats">
          <div><span>Models</span><strong>${fmt(b.models.length)}</strong></div>
          <div><span>Listings</span><strong>${fmt(b.listings)}</strong></div>
          <div><span>Lowest price</span><strong>${rs(Math.min(...b.models.map((m) => m.med)))}</strong></div>
          <div><span>Highest price</span><strong>${rs(Math.max(...b.models.map((m) => m.med)))}</strong></div>
        </div>
        <form class="mk-search" data-mk-filter><input name="q" type="search" placeholder="Filter ${esc(b.brand)} models or reference numbers…" value="${esc(q.q || '')}"><button class="btn btn-sm">Filter</button></form>
        ${ad('native')}
        ${list.length ? cards : '<div class="empty"><p class="muted">No models match.</p></div>'}
        ${pager(page, pages, (n) => qlink('/' + bs, q, { page: n }))}
        ${ad()}
        ${sourceNote(b.listings)}
      </div>`;
    });
  }

  function modelPage(bs, ms, q) {
    return Promise.all([load(bs + '.json'), load(`l/${bs}/${ms}.json`), load('index.json')]).then(([b, d, idx]) => {
      INDEX = idx;
      const m = b.models.find((x) => x.slug === ms);
      if (!m) throw new Error('Not found');
      const refFilter = q.ref != null && q.ref !== '' ? +q.ref : null;
      let rows = d.rows;
      if (refFilter != null) rows = rows.filter((r) => r[0] === refFilter);
      if (q.cond) rows = rows.filter((r) => d.cond[r[3]] === q.cond);
      if (q.sort === 'year') rows = rows.slice().sort((x, y) => String(y[4]).localeCompare(String(x[4])));
      const page = Math.max(1, +q.page || 1);
      const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE_ROWS));
      const view = rows.slice((page - 1) * PER_PAGE_ROWS, page * PER_PAGE_ROWS);
      const path = `/${bs}/${ms}`;
      const refCount = {};
      d.rows.forEach((r) => { refCount[r[0]] = (refCount[r[0]] || 0) + 1; });
      const refRows = m.refs.slice(0, 60).map((r, i) => `<tr class="${refFilter === i ? 'active' : ''}"><td><a class="link" href="${qlink(path, q, { ref: refFilter === i ? '' : i, page: '' })}">${esc(r.ref || '—')}</a></td><td>${fmt(refCount[i] || 0)}</td><td>${esc(r.mvmt || '–')}</td><td class="hide-sm">${esc([r.case, r.size && r.size + ' mm'].filter(Boolean).join(' · '))}</td></tr>`).join('');
      const condCounts = {};
      d.rows.forEach((r) => { const c = d.cond[r[3]]; if (c) condCounts[c] = (condCounts[c] || 0) + 1; });
      const condChips = Object.entries(condCounts).map(([c, n]) => `<a class="chip chip-sm${q.cond === c ? ' active' : ''}" href="${qlink(path, q, { cond: q.cond === c ? '' : c, page: '' })}">${esc(c)} (${fmt(n)})</a>`).join('');
      const listRows = view.map((r) => `<tr><td>${esc(d.refs[r[0]] || '—')}</td><td>${esc(r[1] || '')}</td><td>${esc(r[4] || '–')}</td><td>${esc(d.cond[r[3]] || '–')}</td><td class="hide-sm">${esc([r[5], r[6]].filter(Boolean).join(' / ') || '–')}</td><td class="hide-sm">${r[9] ? esc(r[9]) + ' mm' : '–'}</td></tr>`).join('');
      document.title = `${b.brand} ${m.model} Price – ${C.name}`;
      return `<div class="container">
        <div class="crumbs"><a href="#/">Home</a> / <a href="#/market/brands">Brands</a> / <a href="#/market/${bs}">${esc(b.brand)}</a> / <span>${esc(m.model)}</span></div>
        <div class="mk-model${PH[path.slice(1)] ? ' has-photo' : ''}">
          ${PH[path.slice(1)] ? `<figure class="mk-figure"><img src="${esc(PH[path.slice(1)].src)}" alt="${esc(b.brand + ' ' + m.model)}">${credit(PH[path.slice(1)])}</figure>` : ''}
          <div>
            <div class="card-brand">${esc(b.brand)}</div>
            <h1>${esc(b.brand)} ${esc(m.model)} Price</h1>
            <div class="price-row big"><span class="price">${rs(price(bs, ms))}</span></div>
            ${priceNote}
            <p class="muted">${fmt(m.listings)} real listings and ${m.refCount} reference numbers.</p>
            <div class="quick-specs">
              <div><span>Movement</span><strong>${esc(m.mvmt || '–')}</strong></div>
              <div><span>Case material</span><strong>${esc(m.case || '–')}</strong></div>
              <div><span>Typical size</span><strong>${m.size ? esc(m.size) + ' mm' : '–'}</strong></div>
              <div><span>Listings</span><strong>${fmt(m.listings)}</strong></div>
            </div>
            ${ad('300x250')}
          </div>
        </div>
        <div class="native-row native-slot" data-ad="native-frame"></div>
        <section class="section"><div class="section-head"><h2>Reference Numbers</h2>${m.refs.length > 60 ? `<span class="small muted">Top 60 of ${m.refs.length}</span>` : ''}</div>
          <div class="table-wrap"><table class="mk-table"><thead><tr><th>Reference</th><th>Listings</th><th>Movement</th><th class="hide-sm">Case · Size</th></tr></thead><tbody>${refRows}</tbody></table></div>
        </section>
        <div class="native-row native-slot" data-ad="native-frame"></div>
        <section class="section" id="mkListings"><div class="section-head"><h2>All Listings <span class="muted">(${fmt(rows.length)})</span></h2>
          <select data-mk-lsort aria-label="Sort listings">${[['', 'Default order'], ['year', 'Newest year']].map(([v, l]) => `<option value="${v}"${(q.sort || '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="chips">${refFilter != null ? `<a class="chip chip-sm active" href="${qlink(path, q, { ref: '', page: '' })}">Ref ${esc(d.refs[refFilter] || '—')} ✕</a>` : ''}${condChips}</div>
          <div class="table-wrap"><table class="mk-table"><thead><tr><th>Reference</th><th>Description</th><th>Year</th><th>Condition</th><th class="hide-sm">Case / Bracelet</th><th class="hide-sm">Size</th></tr></thead><tbody>${listRows || '<tr><td colspan="6" class="muted">No listings match.</td></tr>'}</tbody></table></div>
          ${pager(page, pages, (n) => qlink(path, q, { page: n }))}
        </section>
        ${ad('native')}
        ${moreWatches(bs, ms, b.brand)}
        ${sourceNote(m.listings)}
      </div>`;
    });
  }

  // Watch suggestions at the end of a model page, so visitors keep browsing.
  function moreWatches(bs, ms, brand) {
    const idx = INDEX;
    if (!idx) return '';
    const others = idx.models.filter((x) => !(x[0] === bs && x[1] === ms));
    const same = others.filter((x) => x[0] === bs).sort((x, y) => y[5] - x[5]).slice(0, 8);
    // "You may also like": other brands, in an order that changes per watch but is stable on reload.
    const seed = price(bs, ms);
    const rest = others.filter((x) => x[0] !== bs).sort((x, y) => ((price(x[0], x[1]) * seed) % 997) - ((price(y[0], y[1]) * seed) % 997));
    return `${same.length ? `<section class="section"><div class="section-head"><h2>More from ${esc(brand)}</h2><a href="#/market/${bs}" class="link">View all →</a></div>${grid(same.map(modelCard))}</section>` : ''}
      <section class="section"><div class="section-head"><h2>You may also like</h2><a href="#/market/all" class="link">All watches →</a></div>${endless('moreAll', rest)}</section>`;
  }

  // ---------- router hook (called from app.js) ----------
  let token = 0;
  function render(app, parts, qs) {
    const q = parseQuery(qs);
    const my = ++token;
    app.innerHTML = `<div class="container">${loading}</div>`;
    const page = () => parts.length === 0 ? home() : parts[0] === 'credits' ? creditsPage() : parts[0] === 'brands' ? brandsPage() : parts[0] === 'all' ? allModels(q) : parts.length === 1 ? brandPage(parts[0], q) : modelPage(parts[0], parts[1], q);
    afterRender = null;
    photos().then(page).then((html) => {
      if (my !== token) return;
      app.innerHTML = html;
      if (afterRender) afterRender();
      if (parts.length === 2 && (q.page || q.cond || q.ref || q.sort)) { const el = document.getElementById('mkListings'); if (el) el.scrollIntoView(); }
      Ads.render(app);
    }).catch(() => {
      if (my !== token) return;
      app.innerHTML = '<div class="container narrow empty"><h1>Not found</h1><p class="muted">This watch is not in the database.</p><a href="#/" class="btn">Go home</a></div>';
    });
  }

  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.matches('[data-mk-search]')) { e.preventDefault(); location.hash = qlink('/all', {}, { q: f.q.value.trim() }); }
    else if (f.matches('[data-mk-filter]')) { e.preventDefault(); const [path, qs] = location.hash.slice('#/market'.length).split('?'); location.hash = qlink(path, parseQuery(qs), { q: f.q.value.trim(), page: '' }); }
  });
  document.addEventListener('change', (e) => {
    if (!e.target.matches('[data-mk-sort],[data-mk-lsort]')) return;
    const [path, qs] = location.hash.slice('#/market'.length).split('?');
    location.hash = qlink(path, parseQuery(qs), { sort: e.target.value, page: '' });
  });

  window.Market = { render };
})();
