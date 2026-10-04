/* Luxury watch price database: 272,918 real listings of 1,000 models
 * (Chrono24, July 2023). Data lives in data/market/ and is loaded on demand.
 * Built by scripts/build-market.py. */
(function () {
  const C = window.STORE_CONFIG;
  const USD_INR = C.usdToInr || 88;
  const BASE = 'data/market/';
  const PER_PAGE_MODELS = 48;
  const PER_PAGE_ROWS = 50;
  const cache = {};

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usd = (n) => (n == null ? 'On request' : '$' + Number(n).toLocaleString('en-US'));
  function inr(n) {
    if (n == null) return '';
    const r = n * USD_INR;
    if (r >= 10000000) return `≈ ₹${(r / 10000000).toFixed(2)} Cr`;
    if (r >= 100000) return `≈ ₹${(r / 100000).toFixed(1).replace(/\.0$/, '')} Lakh`;
    return '≈ ₹' + Math.round(r).toLocaleString('en-IN');
  }
  const fmt = (n) => Number(n).toLocaleString('en-IN');

  function load(path) {
    if (!cache[path]) {
      cache[path] = fetch(BASE + path).then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      }).catch((e) => { delete cache[path]; throw e; });
    }
    return cache[path];
  }

  // ---------- picture: a drawn watch that matches the model's design ----------
  function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); }
  const DIALS = ['#151515', '#1d4f8c', '#f4f3ef', '#dcdde0', '#1f4d3a', '#15213b'];
  function pseudo(brand, model, info) {
    const m = model.toLowerCase();
    const caseMat = (info && info.case) || '';
    const look = { ind: 'stick', dialName: brand.length > 14 ? brand.split(/[\s.&]+/).filter(Boolean).map((w) => w[0]).join('') : brand };
    let style = 'dress', strap = 'metal';
    if (/gmt|explorer ii|worldtimer|zulu/.test(m)) { style = 'diver'; look.gmt = true; look.bezel2 = /gmt-master|pepsi/.test(m); }
    else if (/submariner|seamaster|diver|aquaracer|fifty|pelagos|black bay|sea-dweller|deepsea|planet ocean|superocean|aquanaut|hydroconquest|prospex|submersible|aquatimer|aquis|yacht|marine|ocean|turtle|samurai/.test(m)) style = 'diver';
    else if (/chrono|daytona|speedmaster|navitimer|carrera|el primero|offshore|monaco|big bang|top time|chronomat|avenger|bullhead|chronomaster|defy/.test(m)) style = 'chrono';
    else if (/pilot|flieger|spitfire|khaki|aviat|field|ranger|explorer/.test(m)) { style = 'field'; look.ind = 'field'; }
    if (/tank|santos|reverso|monaco|square|^rm|rm ?\d|baignoire|cintr|panthere/.test(m)) look.square = true;
    if (/datejust|day-date|president/.test(m)) { look.fluted = true; look.date = true; }
    if (/date/.test(m)) look.date = true;
    if (/tachy|daytona|speedmaster|carrera/.test(m)) look.tachy = true;
    if (/patrimony|calatrava|lange|classique|master|heritage|saxonia|1815/.test(m)) look.ind = 'roman';
    let kase = '#c9ccd1';
    if (/rose|red gold|everose/i.test(caseMat)) kase = '#d9937f';
    else if (/yellow gold|^gold$/i.test(caseMat)) kase = '#d9b44a';
    else if (/gold\/steel/i.test(caseMat)) kase = '#d4af37';
    else if (/ceramic|carbon|dlc|pvd/i.test(caseMat)) kase = '#2b2b2b';
    else if (/titanium/i.test(caseMat)) kase = '#a9abae';
    else if (/platinum|white gold/i.test(caseMat)) kase = '#e6e6e8';
    if (/leather|alligator|croc|calf/.test((info && info.brace || '').toLowerCase()) || /patrimony|calatrava|lange|reverso|tank|master|portofino|portugieser|1815|saxonia/.test(m)) strap = 'leather';
    if (/rubber/.test((info && info.brace || '').toLowerCase()) || /big bang|offshore|rm|luminor|radiomir/.test(m)) strap = 'rubber';
    const dial = DIALS[hash(brand + model) % DIALS.length];
    const light = WatchArt.isLight(dial);
    const strapColor = strap === 'metal' ? kase : strap === 'rubber' ? '#1b1b1b' : ['#6b4226', '#151515', '#3d2a1e'][hash(model) % 3];
    return {
      p: { name: `${brand} ${model}`, brand, model, style, strapType: strap, small: !!(info && info.women), look, specs: { Movement: (info && info.mvmt) || '', 'Water Resistance': '' }, features: [] },
      v: { name: model, dial, case: kase, strap: strapColor, accent: light ? '#1d1d1f' : '#ffffff', swatch: dial },
    };
  }
  function art(brand, model, info) { const x = pseudo(brand, model, info); return WatchArt.svg(x.p, x.v); }

  // ---------- shared bits ----------
  const ad = (t) => `<div data-ad="${t || '728x90'}" class="ad-slot"></div>`;
  const loading = '<div class="mk-loading">Loading market data…</div>';
  const sourceNote = (n) => `<p class="small muted mk-source">Source: <a class="link" href="https://github.com/philmorefkoung/Webscrapped-Watch-Dataset" target="_blank" rel="noopener">Luxury Watch Listings dataset</a> by Philmore Koung (MIT licence) – ${n ? fmt(n) + ' ' : ''}listings from chrono24.com, July 2023. Prices are asking prices in US dollars; rupee values are approximate (US$1 ≈ ₹${USD_INR}) and include no import duty or taxes.</p>`;
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
  const priceBlock = (st) => st.n ? `<div class="price-row"><span class="price">${usd(st.med)}</span><span class="muted small">${inr(st.med)}</span></div><div class="small muted">Range ${usd(st.min)} – ${usd(st.max)}</div>` : '<div class="muted small">Price on request</div>';

  // ---------- pages ----------
  const BANDS = [['Under $2,500', 0, 2500], ['$2,500 – $10,000', 2500, 10000], ['$10,000 – $50,000', 10000, 50000], ['$50,000 – $2,00,000', 50000, 200000], ['Above $2,00,000', 200000, '']];

  function brandCard(b) {
    return `<a class="card mk-card" href="#/market/${b.slug}">
      <div class="card-img">${art(b.brand, b.top[0] || '')}</div>
      <div class="card-body"><div class="card-title">${esc(b.brand)}</div>
        <div class="small muted">${fmt(b.listings)} listings · ${b.models} models</div>
        <div class="price-row"><span class="small muted">Typical</span><span class="price">${usd(b.med)}</span></div>
        <div class="small muted">${inr(b.med)}</div></div></a>`;
  }
  // m = [brandSlug, modelSlug, brand, model, medianUsd, listings]
  function modelCard(m) {
    return `<a class="card mk-card" href="#/market/${m[0]}/${m[1]}">
      <div class="card-img">${art(m[2], m[3])}</div>
      <div class="card-body"><div class="card-brand">${esc(m[2])}</div><div class="card-title">${esc(m[3])}</div>
        <div class="small muted">${fmt(m[5])} listings</div>
        <div class="price-row"><span class="price">${usd(m[4])}</span><span class="muted small">${inr(m[4])}</span></div></div></a>`;
  }
  const realModels = (idx) => idx.models.filter((m) => m[3] !== 'Other models' && m[4]);

  function home() {
    return load('index.json').then((idx) => {
      const brands = idx.brands.filter((b) => b.listings >= 100);
      const models = realModels(idx);
      const popular = models.slice().sort((x, y) => y[5] - x[5]).slice(0, 12);
      const priciest = models.filter((m) => m[5] >= 20).sort((x, y) => y[4] - x[4]).slice(0, 8);
      const entry = models.filter((m) => m[5] >= 50 && m[4] <= 2500).sort((x, y) => y[5] - x[5]).slice(0, 8);
      const section = (title, link, inner) => `<section class="section"><div class="section-head"><h2>${title}</h2>${link ? `<a href="${link}" class="link">View all →</a>` : ''}</div>${inner}</section>`;
      const hero = ['Rolex|Submariner Date', 'Patek Philippe|Nautilus', 'Audemars Piguet|Royal Oak Chronograph'];
      return `<section class="hero"><div class="container hero-inner">
          <div class="hero-text">
            <span class="eyebrow">Luxury Watch Price Database</span>
            <h1>Real prices of<br>luxury watches.</h1>
            <p>${fmt(idx.listings)} real listings of ${fmt(idx.models.length)} models from ${brands.length} luxury brands – Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier, Richard Mille and more.</p>
            <form class="mk-search" data-mk-search><input name="q" type="search" placeholder="Search a model, e.g. Submariner, Nautilus, Royal Oak…" aria-label="Search models"><button class="btn btn-gold">Search</button></form>
            <div class="hero-trust"><span>✔ ${fmt(idx.listings)} listings</span><span>✔ 39,000+ reference numbers</span><span>✔ Prices in $ and ₹</span></div>
          </div>
          <div class="hero-art">${hero.map((x, i) => { const [br, mo] = x.split('|'); const m = idx.models.find((y) => y[2] === br && y[3] === mo); return `<a href="${m ? `#/market/${m[0]}/${m[1]}` : '#/market/all'}" class="hero-watch hw${i}">${art(br, mo)}</a>`; }).join('')}</div>
        </div></section>
        <div class="container">
        ${ad()}
        ${section('Browse by Brand', '#/market/brands', `<div class="grid">${brands.slice(0, 10).map(brandCard).join('')}</div>`)}
        ${section('🔥 Most Listed Watches', '#/market/all?sort=popular', `<div class="grid">${popular.map(modelCard).join('')}</div>`)}
        ${ad('native')}
        ${section('Browse by Budget', '', `<div class="chips">${BANDS.map(([l, lo, hi]) => `<a class="chip" href="#/market/all?min=${lo}&max=${hi}">${l}</a>`).join('')}</div>`)}
        ${section('👑 Most Expensive Models', '#/market/all?sort=high', `<div class="grid">${priciest.map(modelCard).join('')}</div>`)}
        ${ad()}
        ${section('💰 Luxury Under $2,500', '#/market/all?max=2500', `<div class="grid">${entry.map(modelCard).join('')}</div>`)}
        ${ad('native')}
        ${sourceNote(idx.listings)}
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
        <div class="grid">${main.map(brandCard).join('')}</div>
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
      if (q.min) list = list.filter((m) => m[4] && m[4] >= +q.min);
      if (q.max) list = list.filter((m) => m[4] && m[4] <= +q.max);
      const sorts = { popular: (x, y) => y[5] - x[5], low: (x, y) => (x[4] || 9e9) - (y[4] || 9e9), high: (x, y) => (y[4] || 0) - (x[4] || 0), name: (x, y) => (x[2] + x[3]).localeCompare(y[2] + y[3]) };
      list.sort(sorts[q.sort] || sorts.popular);
      const page = Math.max(1, +q.page || 1);
      const pages = Math.max(1, Math.ceil(list.length / PER_PAGE_MODELS));
      const view = list.slice((page - 1) * PER_PAGE_MODELS, page * PER_PAGE_MODELS);
      let cards = '';
      view.forEach((m, i) => { cards += modelCard(m); if ((i + 1) % 12 === 0 && i < view.length - 1) cards += '<div class="grid-ad" data-ad="300x250"></div>'; });
      const band = BANDS.find(([, lo, hi]) => String(lo) === (q.min || '0') && String(hi) === (q.max || ''));
      const title = q.q ? `Results for “${esc(q.q)}”` : band ? `Luxury Watches ${band[0]}` : q.max ? `Luxury Watches Under $${fmt(q.max)}` : q.sort === 'high' ? 'Most Expensive Watch Models' : 'All Watch Models';
      const brands = idx.brands.filter((b) => b.listings >= 100);
      return `<div class="container">
        <div class="crumbs"><a href="#/">Home</a> / <span>${title}</span></div>
        <div class="shop-bar"><h1>${title} <span class="muted">(${fmt(list.length)})</span></h1>
          <div class="shop-controls"><select data-mk-sort aria-label="Sort">${[['popular', 'Most listed'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low'], ['name', 'Name A–Z']].map(([v, l]) => `<option value="${v}"${(q.sort || 'popular') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <form class="mk-search" data-mk-filter><input name="q" type="search" placeholder="Search models…" value="${esc(q.q || '')}"><button class="btn btn-sm">Search</button></form>
        <div class="chips">${BANDS.map(([l, lo, hi]) => { const on = band && band[0] === l; return `<a class="chip chip-sm${on ? ' active' : ''}" href="${qlink('/all', q, on ? { min: '', max: '', page: '' } : { min: lo, max: hi, page: '' })}">${l}</a>`; }).join('')}</div>
        <div class="chips" style="margin-top:8px">${brands.map((b) => `<a class="chip chip-sm${q.brand === b.slug ? ' active' : ''}" href="${qlink('/all', q, { brand: q.brand === b.slug ? '' : b.slug, page: '' })}">${esc(b.brand)}</a>`).join('')}</div>
        ${ad()}
        ${view.length ? `<div class="grid">${cards}</div>` : `<div class="empty"><p class="muted">No models found.</p><a class="btn" href="#/market/all">Show all models</a></div>`}
        ${pager(page, pages, (n) => qlink('/all', q, { page: n }))}
        ${ad()}
        ${sourceNote(idx.listings)}
      </div>`;
    });
  }

  function brandPage(bs, q) {
    return load(bs + '.json').then((b) => {
      let models = b.models.slice();
      if (q.q) { const w = q.q.toLowerCase(); models = models.filter((m) => m.model.toLowerCase().includes(w) || m.refs.some((r) => r.ref.toLowerCase().includes(w))); }
      const sorts = { popular: (x, y) => y.listings - x.listings, low: (x, y) => (x.med || 9e9) - (y.med || 9e9), high: (x, y) => (y.med || 0) - (x.med || 0), name: (x, y) => x.model.localeCompare(y.model) };
      models.sort(sorts[q.sort] || sorts.popular);
      const page = Math.max(1, +q.page || 1);
      const pages = Math.max(1, Math.ceil(models.length / PER_PAGE_MODELS));
      const list = models.slice((page - 1) * PER_PAGE_MODELS, page * PER_PAGE_MODELS);
      let cards = '';
      list.forEach((m, i) => {
        cards += `<a class="card mk-card" href="#/market/${bs}/${m.slug}">
          <div class="card-img">${art(b.brand, m.model, { case: m.case, women: m.women, mvmt: m.mvmt, brace: m.refs[0] && m.refs[0].brace })}</div>
          <div class="card-body"><div class="card-brand">${esc(b.brand)}</div><div class="card-title">${esc(m.model)}</div>
            <div class="small muted">${fmt(m.listings)} listings · ${m.refCount} refs</div>${priceBlock(m)}</div></a>`;
        if ((i + 1) % 12 === 0 && i < list.length - 1) cards += '<div class="grid-ad" data-ad="300x250"></div>';
      });
      return `<div class="container">
        <div class="crumbs"><a href="#/">Home</a> / <a href="#/market/brands">Brands</a> / <span>${esc(b.brand)}</span></div>
        <div class="shop-bar"><h1>${esc(b.brand)} Watch Prices <span class="muted">(${b.models.length} models)</span></h1>
          <div class="shop-controls"><select data-mk-sort aria-label="Sort">${[['popular', 'Most listed'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low'], ['name', 'Name A–Z']].map(([v, l]) => `<option value="${v}"${(q.sort || 'popular') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <div class="mk-stats">
          <div><span>Listings</span><strong>${fmt(b.listings)}</strong></div>
          <div><span>Lowest</span><strong>${usd(b.min)}</strong><em>${inr(b.min)}</em></div>
          <div><span>Typical (median)</span><strong>${usd(b.med)}</strong><em>${inr(b.med)}</em></div>
          <div><span>Highest</span><strong>${usd(b.max)}</strong><em>${inr(b.max)}</em></div>
        </div>
        <form class="mk-search" data-mk-filter><input name="q" type="search" placeholder="Filter ${esc(b.brand)} models or reference numbers…" value="${esc(q.q || '')}"><button class="btn btn-sm">Filter</button></form>
        ${ad()}
        ${list.length ? `<div class="grid">${cards}</div>` : '<div class="empty"><p class="muted">No models match.</p></div>'}
        ${pager(page, pages, (n) => qlink('/' + bs, q, { page: n }))}
        ${ad()}
        ${sourceNote(b.listings)}
      </div>`;
    });
  }

  function modelPage(bs, ms, q) {
    return Promise.all([load(bs + '.json'), load(`l/${bs}/${ms}.json`)]).then(([b, d]) => {
      const m = b.models.find((x) => x.slug === ms);
      if (!m) throw new Error('Not found');
      const refFilter = q.ref != null && q.ref !== '' ? +q.ref : null;
      let rows = d.rows;
      if (refFilter != null) rows = rows.filter((r) => r[0] === refFilter);
      if (q.cond) rows = rows.filter((r) => d.cond[r[3]] === q.cond);
      if (q.sort === 'high') rows = rows.slice().sort((x, y) => (y[2] || 0) - (x[2] || 0));
      else if (q.sort === 'year') rows = rows.slice().sort((x, y) => String(y[4]).localeCompare(String(x[4])));
      const page = Math.max(1, +q.page || 1);
      const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE_ROWS));
      const view = rows.slice((page - 1) * PER_PAGE_ROWS, page * PER_PAGE_ROWS);
      const path = `/${bs}/${ms}`;
      const refRows = m.refs.slice(0, 60).map((r, i) => `<tr class="${refFilter === i ? 'active' : ''}"><td><a class="link" href="${qlink(path, q, { ref: refFilter === i ? '' : i, page: '' })}">${esc(r.ref || '—')}</a></td><td>${fmt(r.n || 0)}</td><td>${r.n ? usd(r.min) : '–'}</td><td><strong>${r.n ? usd(r.med) : 'On request'}</strong><div class="small muted">${inr(r.med)}</div></td><td>${r.n ? usd(r.max) : '–'}</td><td class="hide-sm">${esc([r.case, r.size && r.size + ' mm'].filter(Boolean).join(' · '))}</td></tr>`).join('');
      const condCounts = {};
      d.rows.forEach((r) => { const c = d.cond[r[3]]; if (c) condCounts[c] = (condCounts[c] || 0) + 1; });
      const condChips = Object.entries(condCounts).map(([c, n]) => `<a class="chip chip-sm${q.cond === c ? ' active' : ''}" href="${qlink(path, q, { cond: q.cond === c ? '' : c, page: '' })}">${esc(c)} (${fmt(n)})</a>`).join('');
      const listRows = view.map((r) => `<tr><td>${esc(d.refs[r[0]] || '—')}</td><td>${esc(r[1] || '')}</td><td>${esc(r[4] || '–')}</td><td>${esc(d.cond[r[3]] || '–')}</td><td class="hide-sm">${esc([r[5], r[6]].filter(Boolean).join(' / ') || '–')}</td><td class="hide-sm">${r[9] ? esc(r[9]) + ' mm' : '–'}</td><td class="num"><strong>${usd(r[2])}</strong><div class="small muted">${inr(r[2])}</div></td></tr>`).join('');
      const info = { case: m.case, women: m.women, mvmt: m.mvmt, brace: m.refs[0] && m.refs[0].brace };
      document.title = `${b.brand} ${m.model} Price – ${C.name}`;
      return `<div class="container">
        <div class="crumbs"><a href="#/">Home</a> / <a href="#/market/brands">Brands</a> / <a href="#/market/${bs}">${esc(b.brand)}</a> / <span>${esc(m.model)}</span></div>
        <div class="mk-model">
          <div class="gallery-main mk-art">${art(b.brand, m.model, info)}</div>
          <div>
            <div class="card-brand">${esc(b.brand)}</div>
            <h1>${esc(b.brand)} ${esc(m.model)} Price</h1>
            <p class="muted">Based on ${fmt(m.listings)} real listings and ${m.refCount} reference numbers.</p>
            <div class="mk-stats">
              <div><span>Lowest</span><strong>${usd(m.min)}</strong><em>${inr(m.min)}</em></div>
              <div><span>Typical (median)</span><strong>${usd(m.med)}</strong><em>${inr(m.med)}</em></div>
              <div><span>Highest</span><strong>${usd(m.max)}</strong><em>${inr(m.max)}</em></div>
            </div>
            <div class="quick-specs">
              <div><span>Movement</span><strong>${esc(m.mvmt || '–')}</strong></div>
              <div><span>Case material</span><strong>${esc(m.case || '–')}</strong></div>
              <div><span>Typical size</span><strong>${m.size ? esc(m.size) + ' mm' : '–'}</strong></div>
              <div><span>Listings</span><strong>${fmt(m.listings)}</strong></div>
            </div>
            ${ad('300x250')}
          </div>
        </div>
        <section class="section"><div class="section-head"><h2>Prices by Reference Number</h2>${m.refs.length > 60 ? `<span class="small muted">Top 60 of ${m.refs.length}</span>` : ''}</div>
          <div class="table-wrap"><table class="mk-table"><thead><tr><th>Reference</th><th>Listings</th><th>Lowest</th><th>Typical</th><th>Highest</th><th class="hide-sm">Case · Size</th></tr></thead><tbody>${refRows}</tbody></table></div>
        </section>
        ${ad()}
        <section class="section" id="mkListings"><div class="section-head"><h2>All Listings <span class="muted">(${fmt(rows.length)})</span></h2>
          <select data-mk-lsort aria-label="Sort listings">${[['', 'Price: Low to High'], ['high', 'Price: High to Low'], ['year', 'Newest year']].map(([v, l]) => `<option value="${v}"${(q.sort || '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="chips">${refFilter != null ? `<a class="chip chip-sm active" href="${qlink(path, q, { ref: '', page: '' })}">Ref ${esc(d.refs[refFilter] || '—')} ✕</a>` : ''}${condChips}</div>
          <div class="table-wrap"><table class="mk-table"><thead><tr><th>Reference</th><th>Description</th><th>Year</th><th>Condition</th><th class="hide-sm">Case / Bracelet</th><th class="hide-sm">Size</th><th class="num">Price</th></tr></thead><tbody>${listRows || '<tr><td colspan="7" class="muted">No listings match.</td></tr>'}</tbody></table></div>
          ${pager(page, pages, (n) => qlink(path, q, { page: n }))}
        </section>
        ${ad('native')}
        ${sourceNote(m.listings)}
      </div>`;
    });
  }

  // ---------- router hook (called from app.js) ----------
  let token = 0;
  function render(app, parts, qs) {
    const q = parseQuery(qs);
    const my = ++token;
    app.innerHTML = `<div class="container">${loading}</div>`;
    const job = parts.length === 0 ? home() : parts[0] === 'brands' ? brandsPage() : parts[0] === 'all' ? allModels(q) : parts.length === 1 ? brandPage(parts[0], q) : modelPage(parts[0], parts[1], q);
    job.then((html) => {
      if (my !== token) return;
      app.innerHTML = html;
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

  window.Market = { render, art };
})();
