/* ============================================================
 *  STORE SETTINGS - edit this file to make the site yours.
 * ============================================================ */
window.STORE_CONFIG = {
  name: 'WatchPriceGuide',
  tagline: 'Luxury watch reference numbers, specs and real photos',
  currency: '$',
  locale: 'en-US',

  // Shown on the Contact page.
  email: 'vlathiya5944@gmail.com',

  /* ----------------------------------------------------------
   *  ADSTERRA ADS
   *  1. Sign up at https://publishers.adsterra.com and add your site.
   *  2. Create ad units, click "Get code" and copy the values below.
   *
   *  Banner code from Adsterra looks like:
   *    atOptions = { 'key' : 'abc123...', 'format' : 'iframe', 'height' : 90, 'width' : 728 ...
   *    <script src="//www.highperformanceformat.com/abc123.../invoke.js">
   *  -> put 'abc123...' in `key` and the domain in `domain`.
   *
   *  Native banner / Social bar / Popunder codes contain a <script src="...">
   *  -> paste that full src URL in `src` (native also needs its container id).
   *  Leave a value empty ('') to switch that ad off.
   * ---------------------------------------------------------- */
  ads: {
    enabled: true,
    // Same Adsterra codes as TimeVault (site ID 6100502). For separate earnings stats, add
    // watchpriceguide-us.web.app in Adsterra and paste its own codes here.
    // Banners with on: false earned $0 in the first stats; their spaces show a Sponsored
    // (Smartlink) strip instead. 160x600 and 160x300 are on for the left/right side ads.
    banner728x90:  { key: '3e687ac39152da63f0601b32c2e6de32', domain: 'www.highrevenueformat.com' , on: false },
    banner468x60:  { key: 'd7bd6e43a949debcbcf7249b7c8daa9e', domain: 'www.highrevenueformat.com' , on: false },
    banner300x250: { key: '2744f438d42941804d4b06d34c9ff895', domain: 'www.highrevenueformat.com' , on: false },
    banner320x50:  { key: '6bf5980dc1d4050b0ffe58fe5be03cde', domain: 'www.highrevenueformat.com' , on: false },
    banner160x600: { key: 'de3145bbb1ff4088b0ec01c7c8ce64ff', domain: 'www.highrevenueformat.com' , on: true },
    banner160x300: { key: 'f49b08defd9cd089dfb328248ffc1284', domain: 'www.highrevenueformat.com' , on: true },
    native:    { src: 'https://pl31674026.profitableratecpmnetwork.com/3216abf5619760219f4f2e335aeb29d7/invoke.js', containerId: 'container-3216abf5619760219f4f2e335aeb29d7' },
    socialBar: { src: 'https://pl31674024.profitableratecpmnetwork.com/95/c3/cb/95c3cba7d19eff892e27343f1c7b5bcc.js' },
    popunder:  { src: 'https://pl31674023.profitableratecpmnetwork.com/cb/bb/1e/cbbb1e41cd113e0dd8a534f0e6c06947.js' },
    // Smartlink: shown as a "Sponsored" link in the footer. Leave '' to hide it.
    smartlink: 'https://www.profitableratecpmnetwork.com/szjkm44mj?key=721d4b8e3a6399a23a97abb0266e2ff3',
    // Show grey "Ad space" boxes where ads will appear while keys are empty.
    // Always shown on localhost or when the URL contains ?adpreview
    showPlaceholders: false,
  },
};
