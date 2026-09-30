/* Adsterra ad loader. Configure keys in js/config.js.
 *
 * Adsterra banner codes use a global `atOptions` variable, so two banners on
 * the same page would overwrite each other. Each banner is therefore loaded
 * inside its own small iframe. */
(function () {
  const cfg = (window.STORE_CONFIG && window.STORE_CONFIG.ads) || {};
  const SIZES = { '728x90': [728, 90], '468x60': [468, 60], '300x250': [300, 250], '320x50': [320, 50], '160x600': [160, 600] };
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
    const domain = (u.domain || 'www.highperformanceformat.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
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

  function globalScript(src) {
    if (!src) return;
    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = src.startsWith('//') ? 'https:' + src : src;
    document.body.appendChild(s);
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
    if (wanted === '160x600' && window.innerWidth < 1100) return null;
    return wanted;
  }

  function render(root) {
    if (!cfg.enabled) { (root || document).querySelectorAll('[data-ad]').forEach((el) => el.remove()); return; }
    (root || document).querySelectorAll('[data-ad]:not([data-ad-done])').forEach((el) => {
      el.setAttribute('data-ad-done', '1');
      const type = el.getAttribute('data-ad');
      if (type === 'native') return native(el);
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
  }

  window.Ads = { render, initGlobal };
})();
