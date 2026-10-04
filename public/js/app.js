/* Site shell: header, menu, footer, info pages and the router.
 * All watch pages come from the database in market.js. */
(function () {
  const C = window.STORE_CONFIG;
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function about() {
    return `<div class="container narrow prose"><h1>About ${esc(C.name)}</h1>
      <p>${esc(C.name)} is a free luxury watch price database. It covers 2.7 lakh+ real listings of 1,000 models from Rolex, Omega, Patek Philippe, Audemars Piguet, Cartier, Richard Mille and other luxury brands, with prices by model and reference number.</p>
      <p>The data comes from the <a class="link" href="https://www.kaggle.com/datasets/philmorekoung11/luxury-watch-listings" target="_blank" rel="noopener">Luxury Watch Listings dataset</a> by Philmore Koung, which collected asking prices from chrono24.com in July 2023. Prices are in US dollars with an approximate rupee value.</p>
      <div data-ad="728x90" class="ad-slot"></div></div>`;
  }

  function contact() {
    return `<div class="container narrow prose"><h1>Contact Us</h1>
      <p>Questions or feedback? Let us know.</p>
      <ul class="contact-list"><li>✉️ Email: <a class="link" href="mailto:${esc(C.email)}">${esc(C.email)}</a></li></ul>
      <div data-ad="300x250" class="ad-slot"></div></div>`;
  }

  const PAGES = {
    disclaimer: ['Disclaimer', `<p>${esc(C.name)} is an independent information website. We do not sell watches and are not affiliated with, endorsed by or sponsored by any watch brand, retailer or marketplace mentioned. All brand names and trademarks belong to their respective owners and are used only to identify the products.</p><p>Prices are historical asking prices from public listings (July 2023), shown in US dollars with an approximate rupee conversion that excludes import duty and taxes. They are not offers and may differ from current prices.</p><p>Watch photos come from Wikimedia Commons under free licences (see Photo Credits). They show the model family and may not match every reference number, dial or year listed.</p>`],
    privacy: ['Privacy Policy', `<p>We do not require you to create an account and we do not collect personal information.</p><p><strong>Advertising:</strong> This website shows ads served by third-party networks such as Adsterra. These partners may use cookies or similar technologies to show relevant ads and measure performance. You can control cookies through your browser settings.</p><p>For any privacy questions, contact ${esc(C.email)}.</p>`],
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
  let lastPath = '';
  function route() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = hash.split('?');
    const parts = path.split('/').filter(Boolean);
    document.body.classList.remove('menu-open');
    document.querySelectorAll('#navLinks a').forEach((a) => {
      const href = a.getAttribute('href').slice(1);
      a.classList.toggle('active', href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
    });
    // Paging or filtering inside the same page keeps your place; a new page starts at the top.
    if (path !== lastPath) window.scrollTo(0, 0);
    lastPath = path;

    if (parts[0] === undefined || parts[0] === 'market') {
      document.title = `${C.name} – ${C.tagline}`;
      Market.render(app, parts.slice(1), qs);
      return;
    }
    let html;
    switch (parts[0]) {
      case 'about': html = about(); break;
      case 'contact': html = contact(); break;
      case 'page': html = staticPage(parts[1]); break;
      // Pages from older versions of the site
      case 'shop': case 'product': case 'wishlist': case 'cart': case 'checkout': case 'order': location.hash = '#/'; return;
      default: html = notFound();
    }
    document.title = `${C.name} – ${C.tagline}`;
    app.innerHTML = html;
    Ads.render(document);
  }

  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'searchForm') return;
    e.preventDefault();
    const v = $('#searchInput').value.trim();
    location.hash = v ? `#/market/all?q=${encodeURIComponent(v)}` : '#/market/all';
    $('#searchInput').blur();
  });

  // ---------- boot ----------
  function boot() {
    document.querySelectorAll('#storeName, .js-store-name').forEach((el) => { el.textContent = C.name; });
    $('#year').textContent = new Date().getFullYear();
    $('#footerTagline').textContent = C.tagline;
    const top = [['rolex', 'Rolex'], ['omega', 'Omega'], ['patek-philippe', 'Patek Philippe'], ['audemars-piguet', 'Audemars Piguet'], ['cartier', 'Cartier'], ['richard-mille', 'Richard Mille'], ['tag-heuer', 'TAG Heuer'], ['breitling', 'Breitling'], ['hublot', 'Hublot']];
    $('#navLinks').innerHTML = '<a href="#/">Home</a><a href="#/market/all">All Models</a>' + top.map(([s, n]) => `<a href="#/market/${s}">${n}</a>`).join('') + '<a href="#/market/brands">All Brands</a>';
    $('#footerBrands').innerHTML = top.map(([s, n]) => `<li><a href="#/market/${s}">${n} Prices</a></li>`).join('');
    $('#footerLinks').innerHTML = [['#/market/all?sort=popular', 'Most Listed Models'], ['#/market/all?sort=high', 'Most Expensive Watches'], ['#/market/all?max=5000', 'Luxury Under $5,000'], ['#/market/brands', 'All Brands'], ['#/market/credits', 'Photo Credits']].map(([h, n]) => `<li><a href="${h}">${n}</a></li>`).join('');
    $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
    window.addEventListener('hashchange', route);
    route();
    Ads.initGlobal();
  }
  boot();
})();
