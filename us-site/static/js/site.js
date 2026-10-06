/* WatchPriceGuide: menu, search, native ad rows in grids and ads. Pages are plain HTML (see build.py). */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);

  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  const here = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  document.querySelectorAll('#navLinks a').forEach((a) => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', href === '/' ? here === '/' : here === href || here.startsWith(href + '/'));
  });

  // ---------- search (/search?q=...) ----------
  const results = $('#searchResults');
  if (results) {
    const q = (new URLSearchParams(location.search).get('q') || '').trim();
    if (q) {
      $('#searchQ').value = q;
      $('#searchTitle').textContent = `Results for “${q}”`;
      document.title = `${q} – Search – WatchPriceGuide`;
      fetch('/search.json').then((r) => r.json()).then((list) => {
        const words = q.toLowerCase().split(/\s+/).filter(Boolean);
        const hit = new Set(list.filter(([name, refs]) => { const t = `${name} ${refs}`.toLowerCase(); return words.every((w) => t.includes(w)); }).map((x) => x[2]));
        let shown = 0;
        results.querySelectorAll('.mk-card').forEach((c) => { const on = hit.has(c.getAttribute('href')); c.hidden = !on; if (on) shown++; });
        $('#searchTitle').textContent = `Results for “${q}” (${shown})`;
        if (!shown) results.insertAdjacentHTML('afterbegin', '<div class="empty"><p class="muted">No watches found. Try another name or reference number.</p></div>');
        nativeRows();
        if (window.Ads) Ads.render(document);
      });
    }
  }

  // ---------- a full-width native ad row after every 3 rows of watch boxes ----------
  function gridColumns() {
    const w = window.innerWidth;
    const content = w >= 1700 ? 1280 : w >= 1366 ? w - 2 * 196 - 32 : Math.min(w, 1280) - 32;
    if (w <= 560) return 2;
    return Math.max(1, Math.floor((content + 18) / (220 + 18)));
  }
  function nativeRows() {
    const per = gridColumns() * 3;
    document.querySelectorAll('.grid').forEach((g) => {
      g.querySelectorAll('.grid-ad').forEach((x) => x.remove());
      const cards = [...g.querySelectorAll(':scope > .mk-card:not([hidden])')];
      cards.forEach((c, i) => {
        if ((i + 1) % per === 0 && i < cards.length - 1) c.insertAdjacentHTML('afterend', '<div class="grid-ad native-row" data-ad="native-frame"></div>');
      });
    });
  }
  nativeRows();

  if (window.Ads) { Ads.initGlobal(); Ads.render(document); }
})();
