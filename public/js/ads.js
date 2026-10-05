/* Adsterra ad loader. Configure keys in js/config.js.
 *
 * Adsterra banner codes use a global `atOptions` variable, so two banners on
 * the same page would overwrite each other. Each banner is therefore loaded
 * inside its own small iframe. */
(function () {
  const cfg = (window.STORE_CONFIG && window.STORE_CONFIG.ads) || {};
  const SIZES = { '728x90': [728, 90], '468x60': [468, 60], '300x250': [300, 250], '320x50': [320, 50], '160x600': [160, 600], '160x300': [160, 300] };
  const preview = /localhost|127\.0\.0\.1/.test(location.hostname) || /[?&]adpreview/.test(location.search);
  const showPlaceholders = cfg.showPlaceholders || preview;

  function unit(size) { return cfg['banner' + size] || {}; }

  function placeholder(el, label, w, h) {
    if (!showPlaceholders) { el.remove(); return; }
    el.innerHTML = `<div class="ad-placeholder" style="max-width:${w}px;height:${h}px">Ad space · ${label}</div>`;
  }

  function banner(el, size) {
    const [w, h] = SIZES[size];
    const u = unit(size);
    if (!u.key) return placeholder(el, `Adsterra ${size}`, w, h);
    const domain = (u.domain || 'www.highrevenueformat.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>
<script type="text/javascript">atOptions={'key':'${u.key}','format':'iframe','height':${h},'width':${w},'params':{}};<\/script>
<script type="text/javascript" src="https://${domain}/${u.key}/invoke.js"><\/script></body></html>`;
    const f = document.createElement('iframe');
    f.width = w; f.height = h; f.scrolling = 'no'; f.title = 'Advertisement';
    f.setAttribute('frameborder', '0');
    f.style.cssText = `border:0;width:${w}px;height:${h}px;max-width:100%;display:block;margin:0 auto`;
    f.srcdoc = html;
    el.innerHTML = '';
    el.appendChild(f);
  }

  function native(el) {
    const n = cfg.native || {};
    if (!n.src || !n.containerId) return placeholder(el, 'Adsterra Native Banner', 728, 120);
    // Adsterra's native script fills the div with its fixed id, so only one per page.
    if (document.getElementById(n.containerId)) { el.remove(); return; }
    el.innerHTML = `<div id="${n.containerId}"></div>`;
    const s = document.createElement('script');
    s.async = true; s.setAttribute('data-cfasync', 'false');
    s.src = n.src.startsWith('//') ? 'https:' + n.src : n.src;
    el.appendChild(s);
  }

  let scriptBlocked = false;
  function globalScript(src) {
    if (!src) return;
    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = src.startsWith('//') ? 'https:' + src : src;
    s.onerror = () => { scriptBlocked = true; };
    document.body.appendChild(s);
  }

  // ---------- adblock detection ----------
  // Two checks: a "bait" element with ad-like class names (hidden by blockers),
  // and whether the Adsterra scripts failed to load. If either trips, show a
  // polite message asking the visitor to allow ads. It can be closed.
  function detectAdblock() {
    const bait = document.createElement('div');
    bait.className = 'adsbox ad-banner ad-unit adsbygoogle pub_300x250 textads banner-ads';
    bait.setAttribute('aria-hidden', 'true');
    bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:2px;height:2px;';
    bait.innerHTML = '&nbsp;';
    document.body.appendChild(bait);
    setTimeout(() => {
      const hidden = !bait.offsetHeight || getComputedStyle(bait).display === 'none' || getComputedStyle(bait).visibility === 'hidden';
      bait.remove();
      if (hidden || scriptBlocked) showAdblockNotice();
    }, 2500);
  }

  function showAdblockNotice() {
    try { if (sessionStorage.getItem('adblockNoticeClosed')) return; } catch (e) { /* storage unavailable */ }
    if (document.getElementById('adblockNotice')) return;
    const box = document.createElement('div');
    box.id = 'adblockNotice';
    box.className = 'adblock-notice';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'adblockTitle');
    box.innerHTML = `<div class="adblock-box">
      <div class="adblock-icon">🛡️</div>
      <h2 id="adblockTitle">Ad blocker detected</h2>
      <p>This website is free and is kept running by ads. Please turn off your ad blocker or allow ads for this site, then reload the page.</p>
      <ol><li>Click your ad blocker's icon in the browser toolbar</li><li>Choose <strong>"Pause on this site"</strong> or <strong>"Don't run on this site"</strong></li><li>Reload the page</li></ol>
      <div class="adblock-actions"><button class="btn btn-gold" data-adblock-reload>I've allowed ads – Reload</button><button class="btn btn-ghost" data-adblock-close>Continue anyway</button></div>
    </div>`;
    document.body.appendChild(box);
    box.querySelector('[data-adblock-reload]').addEventListener('click', () => location.reload());
    box.querySelector('[data-adblock-close]').addEventListener('click', () => {
      box.remove();
      try { sessionStorage.setItem('adblockNoticeClosed', '1'); } catch (e) { /* storage unavailable */ }
    });
  }

  // Picks a banner size that fits the slot's width (mobile gets smaller ads).
  function fitSize(el, wanted) {
    const width = el.clientWidth || window.innerWidth;
    if (wanted === '728x90') {
      if (width >= 740 && unit('728x90').key) return '728x90';
      if (width >= 480 && unit('468x60').key) return '468x60';
      if (unit('320x50').key) return '320x50';
      if (unit('300x250').key) return '300x250';
      return width >= 740 ? '728x90' : '320x50';
    }
    // Side rails are only visible on very wide screens (see .ad-rail in style.css); never load hidden ads.
    if ((wanted === '160x600' || wanted === '160x300') && window.innerWidth < 1660) return null;
    return wanted;
  }

  // Smartlink: a clearly labelled "Sponsored" link (see config.js).
  function smartlink(el) {
    if (!el) return;
    if (!cfg.enabled || !cfg.smartlink) { el.remove(); return; }
    el.innerHTML = `<a href="${cfg.smartlink}" target="_blank" rel="sponsored nofollow noopener">Sponsored</a>`;
  }

  function render(root) {
    if (!cfg.enabled) { (root || document).querySelectorAll('[data-ad]').forEach((el) => el.remove()); return; }
    (root || document).querySelectorAll('[data-ad]:not([data-ad-done])').forEach((el) => {
      el.setAttribute('data-ad-done', '1');
      const type = el.getAttribute('data-ad');
      if (type === 'native') return native(el);
      if (type === 'card') return banner(el, '160x300'); // ad box inside a grid of watch boxes
      const size = fitSize(el, type);
      if (!size) return el.remove();
      banner(el, size);
    });
  }

  let started = false;
  function initGlobal() {
    if (started || !cfg.enabled) return;
    started = true;
    globalScript((cfg.socialBar || {}).src);
    globalScript((cfg.popunder || {}).src);
    smartlink(document.getElementById('smartlink'));
    detectAdblock();
  }

  window.Ads = { render, initGlobal, showAdblockNotice };
})();
