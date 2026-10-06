/* Site shell: header, menu, footer, info pages and the router.
 * All watch pages come from the database in market.js. */
(function () {
  const C = window.STORE_CONFIG;
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function about() {
    return `<div class="container narrow prose"><h1>About ${esc(C.name)}</h1>
      <p>${esc(C.name)} is a free luxury watch website with real photos and details of 212 models from Rolex, Omega, Patek Philippe, Audemars Piguet, Cartier, Tudor and other luxury brands, plus 1.3 lakh+ real listings.</p>
      <p>Prices shown on this site are display prices between ₹1,500 and ₹2,499. They are not market prices and not offers – we do not sell watches. Model and listing details come from the <a class="link" href="https://www.kaggle.com/datasets/philmorekoung11/luxury-watch-listings" target="_blank" rel="noopener">Luxury Watch Listings dataset</a> (chrono24.com, July 2023).</p>
      <div data-ad="728x90" class="ad-slot"></div><div data-ad="native" class="ad-slot"></div></div>`;
  }

  function contact() {
    return `<div class="container narrow prose"><h1>Contact Us</h1>
      <p>Questions or feedback? Let us know.</p>
      <ul class="contact-list"><li>✉️ Email: <a class="link" href="mailto:${esc(C.email)}">${esc(C.email)}</a></li></ul>
      <div data-ad="300x250" class="ad-slot"></div><div data-ad="native" class="ad-slot"></div></div>`;
  }

  const PAGES = {
    disclaimer: ['Disclaimer', `<p>${esc(C.name)} is an independent information website. We do not sell watches and are not affiliated with, endorsed by or sponsored by any watch brand, retailer or marketplace mentioned. All brand names and trademarks belong to their respective owners and are used only to identify the products.</p><p><strong>Prices on this site are display prices between ₹1,500 and ₹2,499 chosen by us. They are not the real market price of any watch, not offers, and must not be relied on.</strong> Real luxury watches from these brands usually cost far more.</p><p>Watch photos come from Wikimedia Commons under free licences (see Photo Credits). They show the model family and may not match every reference number, dial or year listed.</p>`],
    privacy: ['Privacy Policy', `<p>We do not require you to create an account and we do not collect personal information.</p><p><strong>Analytics:</strong> We use Google Analytics to count visits and see which pages are popular. It uses cookies and collects information such as pages viewed, device type and approximate location. It does not tell us who you are.</p><p><strong>Advertising:</strong> This website shows ads served by third-party networks such as Adsterra. These partners may use cookies or similar technologies to show relevant ads and measure performance. You can control cookies through your browser settings.</p><p>For any privacy questions, contact ${esc(C.email)}.</p>`],
    terms: ['Terms of Use', '<p>By using this website you agree to these terms. All information is provided "as is" for general information only. Prices shown are display prices, not market prices. We make no guarantee that specifications are complete or current. We are not responsible for any purchase decision made based on this website.</p>'],
  };
  function staticPage(slug) {
    const pg = PAGES[slug];
    if (!pg) return notFound();
    return `<div class="container narrow prose"><h1>${pg[0]}</h1>${pg[1]}<div data-ad="728x90" class="ad-slot"></div><div data-ad="native" class="ad-slot"></div></div>`;
  }
  function notFound() {
    return `<div class="container narrow empty"><h1>Page not found</h1><a href="#/" class="btn">Go home</a></div>`;
  }

  // Google Analytics: pages use #/ addresses, so each page change is sent as its own page view
  // (for example #/market/rolex is reported as /market/rolex).
  function pageView(path) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'page_view', { page_location: location.origin + path, page_path: path, page_title: document.title });
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
      pageView(hash);
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
    pageView(hash);
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
    const top = [['rolex', 'Rolex'], ['omega', 'Omega'], ['patek-philippe', 'Patek Philippe'], ['audemars-piguet', 'Audemars Piguet'], ['cartier', 'Cartier'], ['tag-heuer', 'TAG Heuer'], ['breitling', 'Breitling'], ['tudor', 'Tudor'], ['iwc', 'IWC']];
    $('#navLinks').innerHTML = '<a href="#/">Home</a><a href="#/market/all">All Models</a>' + top.map(([s, n]) => `<a href="#/market/${s}">${n}</a>`).join('') + '<a href="#/market/brands">All Brands</a>';
    $('#footerBrands').innerHTML = top.map(([s, n]) => `<li><a href="#/market/${s}">${n} Prices</a></li>`).join('');
    $('#footerLinks').innerHTML = [['#/market/all?sort=popular', 'Most Listed Models'], ['#/market/all?sort=high', 'Top Priced Watches'], ['#/market/all?max=1800', 'Watches Under ₹1,800'], ['#/market/brands', 'All Brands'], ['#/market/credits', 'Photo Credits']].map(([h, n]) => `<li><a href="${h}">${n}</a></li>`).join('');
    $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
    window.addEventListener('hashchange', route);
    route();
    Ads.initGlobal();
    // Ad slots outside the page content (footer, side rails).
    Ads.render(document);
  }
  boot();
})();
