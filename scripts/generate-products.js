#!/usr/bin/env node
/*
 * Generates public/js/products.js with the starter catalogue (120 watches).
 * Run:  node scripts/generate-products.js
 *
 * The output is plain data, so once you start adding your own real stock you
 * can edit public/js/products.js directly and stop using this script.
 */
const fs = require('fs');
const path = require('path');

// Deterministic random so the catalogue is the same on every run.
let seed = 20260930;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
function sample(arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}

// ---- Colour variants -------------------------------------------------------
// dial = dial colour, case = case metal, strap = strap colour, strapType = leather|metal|rubber|mesh|fabric
const COLORS = {
  'Midnight Black':  { swatch: '#111111', dial: '#141414', case: '#2b2b2b', strap: '#1a1a1a', accent: '#d4af37' },
  'Silver White':    { swatch: '#e8e8e8', dial: '#f4f4f2', case: '#c9ccd1', strap: '#b9bdc4', accent: '#1f2a44' },
  'Ocean Blue':      { swatch: '#1c4e80', dial: '#1c4e80', case: '#c9ccd1', strap: '#1b3558', accent: '#ffffff' },
  'Royal Gold':      { swatch: '#d4af37', dial: '#e9d18a', case: '#d4af37', strap: '#c9a233', accent: '#3a2a05' },
  'Rose Gold':       { swatch: '#e0a899', dial: '#f6e3dc', case: '#d9937f', strap: '#d9937f', accent: '#6b3a2e' },
  'Forest Green':    { swatch: '#1f4d3a', dial: '#1f4d3a', case: '#c9ccd1', strap: '#23392f', accent: '#e9d18a' },
  'Burgundy Red':    { swatch: '#7a1f2b', dial: '#7a1f2b', case: '#c9ccd1', strap: '#5a1620', accent: '#ffffff' },
  'Tan Brown':       { swatch: '#8b5a2b', dial: '#f1ece2', case: '#c9ccd1', strap: '#8b5a2b', accent: '#3b2a1a' },
  'Coffee Brown':    { swatch: '#4a2f1d', dial: '#3d2a1e', case: '#d4af37', strap: '#4a2f1d', accent: '#e9d18a' },
  'Gunmetal Grey':   { swatch: '#53565c', dial: '#2f3236', case: '#53565c', strap: '#43464b', accent: '#ff6b35' },
  'Blush Pink':      { swatch: '#f4b6c2', dial: '#fbe4ea', case: '#e0a899', strap: '#f4b6c2', accent: '#8a3b52' },
  'Pearl White':     { swatch: '#fbfaf5', dial: '#ffffff', case: '#e5e4e2', strap: '#f5f3ec', accent: '#9a8a6a' },
  'Navy Blue':       { swatch: '#14213d', dial: '#14213d', case: '#c9ccd1', strap: '#14213d', accent: '#fca311' },
  'Olive Green':     { swatch: '#556b2f', dial: '#3e4a26', case: '#6b705c', strap: '#556b2f', accent: '#f4e285' },
  'Sky Blue':        { swatch: '#7cc6fe', dial: '#dff1ff', case: '#c9ccd1', strap: '#7cc6fe', accent: '#0b4f7c' },
  'Lava Orange':     { swatch: '#ff6b35', dial: '#1a1a1a', case: '#2b2b2b', strap: '#ff6b35', accent: '#ff6b35' },
  'Lavender Purple': { swatch: '#9d8df1', dial: '#e9e4ff', case: '#c9ccd1', strap: '#9d8df1', accent: '#3d2c8d' },
  'Champagne':       { swatch: '#f1dfb8', dial: '#f1dfb8', case: '#d4af37', strap: '#d4af37', accent: '#5a4520' },
};

// ---- Categories ------------------------------------------------------------
const CATEGORIES = [
  {
    id: 'men', name: "Men's Analog", count: 24, price: [399, 6999], style: 'analog', caseShapes: ['round', 'round', 'square'],
    straps: ['leather', 'metal', 'mesh'], colors: ['Midnight Black', 'Silver White', 'Ocean Blue', 'Tan Brown', 'Coffee Brown', 'Navy Blue', 'Forest Green', 'Gunmetal Grey', 'Royal Gold'],
    names: ['Classic', 'Heritage', 'Executive', 'Voyager', 'Metro', 'Legacy', 'Regent', 'Monarch', 'Ranger', 'Admiral', 'Sterling', 'Oxford'],
    audience: 'men',
  },
  {
    id: 'women', name: "Women's Watches", count: 22, price: [299, 7999], style: 'analog', caseShapes: ['round', 'round', 'square'],
    straps: ['metal', 'leather', 'mesh'], colors: ['Rose Gold', 'Blush Pink', 'Pearl White', 'Silver White', 'Royal Gold', 'Lavender Purple', 'Champagne', 'Midnight Black', 'Sky Blue'],
    names: ['Aurora', 'Bella', 'Grace', 'Petal', 'Serena', 'Luna', 'Iris', 'Elegance', 'Diva', 'Orchid', 'Blossom', 'Charm'],
    audience: 'women', small: true,
  },
  {
    id: 'smart', name: 'Smartwatches', count: 18, price: [999, 9999], style: 'smart', caseShapes: ['square', 'square', 'round'],
    straps: ['rubber', 'rubber', 'metal', 'fabric'], colors: ['Midnight Black', 'Silver White', 'Ocean Blue', 'Rose Gold', 'Olive Green', 'Lava Orange', 'Gunmetal Grey', 'Blush Pink', 'Navy Blue'],
    names: ['Pulse', 'Fit Pro', 'Nova', 'Active', 'Vibe', 'Connect', 'Ultra', 'Orbit', 'Spark', 'Zen', 'Echo', 'Wave'],
    audience: 'unisex',
  },
  {
    id: 'chrono', name: 'Chronographs', count: 14, price: [1499, 12999], style: 'chrono', caseShapes: ['round'],
    straps: ['metal', 'leather', 'rubber'], colors: ['Midnight Black', 'Ocean Blue', 'Silver White', 'Navy Blue', 'Gunmetal Grey', 'Burgundy Red', 'Forest Green', 'Coffee Brown', 'Royal Gold'],
    names: ['Racer', 'Pilot', 'Turbo', 'Grand Prix', 'Aviator', 'Velocity', 'Apex', 'Circuit', 'Falcon', 'Speedmaster X'],
    audience: 'men',
  },
  {
    id: 'luxury', name: 'Luxury Collection', count: 14, price: [7999, 20000], style: 'analog', caseShapes: ['round', 'round', 'tonneau'],
    straps: ['metal', 'leather'], colors: ['Royal Gold', 'Champagne', 'Midnight Black', 'Ocean Blue', 'Forest Green', 'Burgundy Red', 'Silver White', 'Rose Gold', 'Coffee Brown'],
    names: ['Imperial', 'Sovereign', 'Prestige', 'Majesty', 'Emperor', 'Grandeur', 'Crown', 'Opulence', 'Signature', 'Royale'],
    audience: 'unisex', premium: true,
  },
  {
    id: 'sports', name: 'Sports & Digital', count: 16, price: [199, 3499], style: 'digital', caseShapes: ['octagon', 'round', 'square'],
    straps: ['rubber'], colors: ['Midnight Black', 'Lava Orange', 'Olive Green', 'Navy Blue', 'Gunmetal Grey', 'Ocean Blue', 'Burgundy Red', 'Sky Blue'],
    names: ['Shock', 'Trail', 'Storm', 'Titan', 'Blaze', 'Commando', 'Rover', 'Striker', 'Thunder', 'Xtreme'],
    audience: 'unisex',
  },
  {
    id: 'kids', name: 'Kids Watches', count: 12, price: [100, 999], style: 'kids', caseShapes: ['round', 'square', 'octagon'],
    straps: ['rubber', 'fabric'], colors: ['Sky Blue', 'Blush Pink', 'Lava Orange', 'Lavender Purple', 'Olive Green', 'Ocean Blue', 'Royal Gold'],
    names: ['Buddy', 'Rainbow', 'Jungle', 'Rocket', 'Star', 'Dino', 'Smiley', 'Candy', 'Galaxy', 'Tiny Tick'],
    audience: 'kids', small: true,
  },
];

const BRANDS = ['Chronex', 'Aurum', 'Velora', 'Tempo', 'Zenith Line', 'Kairos', 'Nordik', 'Solaris'];

const MOVEMENTS = {
  analog: ['Japanese Quartz', 'Miyota Quartz', 'Automatic (Self-winding)', 'Quartz'],
  chrono: ['Quartz Chronograph', 'Japanese Chronograph Quartz'],
  smart: ['Smart (Rechargeable)'],
  digital: ['Digital Quartz', 'Analog-Digital Quartz'],
  kids: ['Quartz', 'Digital Quartz'],
};

const STRAP_LABEL = {
  leather: 'Genuine Leather', metal: 'Stainless Steel Link', mesh: 'Milanese Mesh', rubber: 'Silicone / Rubber', fabric: 'Nylon Fabric',
};

function features(cat, strap, water) {
  const f = [];
  if (cat.style === 'smart') {
    f.push(...sample([
      'Heart-rate & SpO2 monitoring', '100+ sports modes', 'Bluetooth calling', 'Sleep tracking',
      'Always-on AMOLED display', 'Up to 7 days battery life', 'Music & camera control', 'Smart notifications',
      'Built-in games & calculator', '200+ cloud watch faces', 'Female health tracking', 'Voice assistant',
    ], 5));
  } else if (cat.style === 'digital') {
    f.push(...sample(['Shock resistant', 'Stopwatch & countdown timer', 'Daily alarm', 'LED backlight', 'Dual time', 'Auto calendar', 'Hourly chime'], 4));
  } else if (cat.style === 'kids') {
    f.push(...sample(['Easy-to-read dial', 'Lightweight & comfortable', 'Skin-friendly strap', 'Fun colours kids love', 'Durable build', 'Glow-in-dark hands'], 4));
  } else {
    f.push(...sample(['Date display', 'Luminous hands', 'Scratch-resistant glass', 'Stainless steel case back', 'Day & date window', 'Screw-down crown', 'Sunray-finish dial', 'Slim profile case'], 4));
    if (cat.style === 'chrono') f.unshift('Working chronograph (stopwatch) sub-dials');
  }
  f.push(`${water} water resistance`);
  f.push(`${STRAP_LABEL[strap]} strap`);
  return f;
}

function description(cat, name, brand, strap, colors) {
  const colorText = colors.length > 1 ? `Available in ${colors.slice(0, -1).join(', ')} and ${colors[colors.length - 1]}.` : `Finished in ${colors[0]}.`;
  const openers = {
    men: [
      `The ${brand} ${name} is a refined everyday watch built for the modern man.`,
      `Make a confident statement with the ${brand} ${name}.`,
      `Timeless design meets daily durability in the ${brand} ${name}.`,
    ],
    women: [
      `Graceful and elegant, the ${brand} ${name} adds a touch of sparkle to every outfit.`,
      `The ${brand} ${name} is designed for women who love understated luxury.`,
      `Delicate details and a slim profile make the ${brand} ${name} a wardrobe favourite.`,
    ],
    smart: [
      `Stay connected and healthy with the ${brand} ${name} smartwatch.`,
      `The ${brand} ${name} packs fitness tracking and smart features into a sleek body.`,
      `Your health, notifications and calls - all on your wrist with the ${brand} ${name}.`,
    ],
    chrono: [
      `Inspired by racing and aviation, the ${brand} ${name} chronograph is made to perform.`,
      `The ${brand} ${name} brings a bold, sporty chronograph look to your wrist.`,
      `Precision timing and a striking three-eye dial define the ${brand} ${name}.`,
    ],
    luxury: [
      `The ${brand} ${name} is our flagship piece - crafted for those who expect the finest.`,
      `Exquisite finishing and premium materials set the ${brand} ${name} apart.`,
      `A true heirloom-style timepiece, the ${brand} ${name} is built to impress.`,
    ],
    sports: [
      `Tough, reliable and ready for anything - meet the ${brand} ${name}.`,
      `The ${brand} ${name} is built for workouts, outdoor adventures and everyday knocks.`,
      `Rugged styling and handy digital functions make the ${brand} ${name} a go-to sports watch.`,
    ],
    kids: [
      `Learning to tell time is fun with the colourful ${brand} ${name}.`,
      `The ${brand} ${name} is light, comfy and made to survive the playground.`,
      `Bright colours and a kid-friendly design make the ${brand} ${name} a perfect gift.`,
    ],
  };
  const middle = {
    leather: 'It sits on a soft genuine leather strap that gets more comfortable with every wear.',
    metal: 'A solid stainless steel bracelet with a secure fold-over clasp gives it a premium feel.',
    mesh: 'The Milanese mesh strap is fully adjustable for a perfect, snug fit.',
    rubber: 'The soft silicone strap is sweat-proof and comfortable all day long.',
    fabric: 'A breathable, quick-dry nylon strap keeps it light and comfortable.',
  };
  const closer = pick([
    'Comes in a premium gift box - a perfect choice for birthdays, anniversaries and festivals.',
    'Backed by our warranty and easy returns, so you can buy with confidence.',
    'Ideal for office, parties and everyday wear.',
    'A great gift for yourself or someone special.',
  ]);
  return `${pick(openers[cat.id])} ${middle[strap]} ${colorText} ${closer}`;
}

function roundPrice(p) {
  if (p < 1000) return Math.round(p / 10) * 10 - 1 > 99 ? Math.round(p / 10) * 10 - 1 : 100;
  return Math.round(p / 100) * 100 - 1;
}

const products = [];
let n = 1;
for (const cat of CATEGORIES) {
  const usedNames = new Set();
  for (let i = 0; i < cat.count; i++) {
    const brand = pick(BRANDS);
    let base = pick(cat.names);
    let name = `${base} ${pick(['', 'II', 'Pro', 'Lite', 'Plus', 'Elite', 'Neo', 'S', 'Max', 'Edge'])}`.trim();
    while (usedNames.has(brand + name)) name = `${base} ${between(10, 99)}`;
    usedNames.add(brand + name);

    // Spread prices across the category range, skewed towards the lower end.
    const [minP, maxP] = cat.price;
    const t = Math.pow(rand(), 1.6);
    let price = roundPrice(minP + (maxP - minP) * t);
    if (i === 0) price = minP === 100 ? 100 : roundPrice(minP); // cheapest item per category
    if (cat.id === 'luxury' && i === 1) price = 20000;           // top of the range
    price = Math.min(20000, Math.max(100, price));
    const discount = pick([10, 15, 20, 25, 30, 35, 40, 45, 50]);
    const mrp = Math.max(price + 50, Math.round(price / (1 - discount / 100) / 10) * 10 - 1);

    const strap = pick(cat.straps);
    const shape = pick(cat.caseShapes);
    const colorNames = sample(cat.colors, between(2, 5));
    const water = cat.style === 'digital' ? pick(['50m', '100m', '200m']) : cat.style === 'smart' ? pick(['IP67', 'IP68', '5ATM']) : pick(['30m', '50m', '100m']);
    const movement = pick(MOVEMENTS[cat.style]);
    const caseSize = cat.small ? between(28, 36) : cat.style === 'smart' ? pick([42, 44, 45, 46]) : between(40, 46);
    const idx = pick(['stick', 'roman', 'arabic', 'dots']);

    products.push({
      id: `w${String(n).padStart(3, '0')}`,
      sku: `${cat.id.slice(0, 2).toUpperCase()}-${1000 + n}`,
      name: `${brand} ${name}`,
      brand,
      category: cat.id,
      audience: cat.audience,
      price,
      mrp,
      rating: Math.round((3.8 + rand() * 1.2) * 10) / 10,
      reviews: between(4, 480),
      stock: between(0, 10) === 0 ? 0 : between(3, 60),
      badge: price >= 9999 ? 'Premium' : discount >= 45 ? 'Hot Deal' : rand() < 0.15 ? 'New' : rand() < 0.15 ? 'Bestseller' : '',
      style: cat.style,
      shape,
      strapType: strap,
      indices: cat.style === 'kids' ? 'arabic' : idx,
      colors: colorNames.map((c) => ({ name: c, ...COLORS[c], image: '' })),
      description: description(cat, name, brand, strap, colorNames),
      features: features(cat, strap, water),
      specs: {
        Brand: brand,
        Model: `${name} (${cat.id.slice(0, 2).toUpperCase()}-${1000 + n})`,
        Movement: movement,
        'Case Size': `${caseSize} mm`,
        'Case Material': cat.premium ? pick(['316L Stainless Steel', 'Titanium', 'Gold-plated Stainless Steel']) : pick(['Stainless Steel', 'Alloy', 'Stainless Steel', 'ABS Resin']),
        'Strap': STRAP_LABEL[strap],
        'Glass': cat.premium ? 'Sapphire Crystal' : pick(['Mineral Glass', 'Hardened Mineral Glass', 'Acrylic']),
        'Water Resistance': water,
        'Warranty': cat.premium ? '2 Years' : cat.id === 'kids' ? '6 Months' : '1 Year',
        'In the Box': 'Watch, gift box, warranty card' + (cat.style === 'smart' ? ', magnetic charger' : ''),
      },
      createdAt: `2026-${String(between(1, 9)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}`,
    });
    n++;
  }
}

const out = `/* AUTO-GENERATED by scripts/generate-products.js - ${products.length} products.
 * You can edit this file by hand to add your real watches.
 * To use a real photo for a colour, put the file in public/images/ and set
 *   image: "images/your-photo.jpg"
 * on that colour. When image is empty, a drawn illustration of the watch is shown.
 */
window.CATEGORIES = ${JSON.stringify(CATEGORIES.map(({ id, name }) => ({ id, name })), null, 2)};

window.PRODUCTS = ${JSON.stringify(products, null, 2)};
`;
fs.writeFileSync(path.join(__dirname, '..', 'public', 'js', 'products.js'), out);
const prices = products.map((p) => p.price);
console.log(`Wrote ${products.length} products. Price range: ${Math.min(...prices)} - ${Math.max(...prices)}`);
