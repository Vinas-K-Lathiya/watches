/* ============================================================
 *  STORE SETTINGS - edit this file to make the site yours.
 * ============================================================ */
window.STORE_CONFIG = {
  name: 'TimeVault',
  tagline: 'Luxury watch price database',
  currency: '₹',
  locale: 'en-IN',
  // Used to show rupee values for the US-dollar prices in Market Prices.
  usdToInr: 88,

  // Shown on the Contact page.
  email: 'support@timevault.store',

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
    banner728x90:  { key: '', domain: 'www.highperformanceformat.com' },
    banner468x60:  { key: '', domain: 'www.highperformanceformat.com' },
    banner300x250: { key: '', domain: 'www.highperformanceformat.com' },
    banner320x50:  { key: '', domain: 'www.highperformanceformat.com' },
    banner160x600: { key: '', domain: 'www.highperformanceformat.com' },
    native:    { src: '', containerId: '' },   // e.g. src: '//pl12345.effectivegatecpm.com/xxxx/invoke.js', containerId: 'container-xxxx'
    socialBar: { src: '' },                    // e.g. '//pl12345.effectivegatecpm.com/aa/bb/cc/xxxx.js'
    popunder:  { src: '' },
    // Show grey "Ad space" boxes where ads will appear while keys are empty.
    // Always shown on localhost or when the URL contains ?adpreview
    showPlaceholders: false,
  },
};
