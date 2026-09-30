/* Draws a watch as SVG from product data + a colour variant.
 * Used whenever a colour has no real photo (colour.image is empty). */
(function () {
  let uid = 0;

  function shade(hex, pct) {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = pct < 0 ? 0 : 255, p = Math.abs(pct) / 100;
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function isLight(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }

  function strap(id, type, color, x, y, w, h, top) {
    const r = type === 'rubber' ? 14 : 6;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#st${id})"/>`;
    if (type === 'leather') {
      const c = shade(color, isLight(color) ? -25 : 35);
      s += `<rect x="${x + 5}" y="${y + 4}" width="${w - 10}" height="${h - 8}" rx="4" fill="none" stroke="${c}" stroke-width="1.2" stroke-dasharray="4 3"/>`;
      if (!top) for (let i = 0; i < 3; i++) s += `<ellipse cx="${x + w / 2}" cy="${y + 40 + i * 18}" rx="3" ry="2.2" fill="${shade(color, -45)}"/>`;
    } else if (type === 'metal') {
      const line = shade(color, -30);
      for (let yy = y + 12; yy < y + h; yy += 13) s += `<line x1="${x}" y1="${yy}" x2="${x + w}" y2="${yy}" stroke="${line}" stroke-width="1.4"/>`;
      s += `<line x1="${x + w / 3}" y1="${y}" x2="${x + w / 3}" y2="${y + h}" stroke="${line}" stroke-width="1.2"/>`;
      s += `<line x1="${x + 2 * w / 3}" y1="${y}" x2="${x + 2 * w / 3}" y2="${y + h}" stroke="${line}" stroke-width="1.2"/>`;
    } else if (type === 'mesh') {
      const line = shade(color, -22);
      for (let yy = y + 3; yy < y + h; yy += 3) s += `<line x1="${x}" y1="${yy}" x2="${x + w}" y2="${yy}" stroke="${line}" stroke-width=".6" opacity=".8"/>`;
    } else if (type === 'rubber') {
      const line = shade(color, -25);
      for (let yy = y + 16; yy < y + h - 6; yy += 16) s += `<rect x="${x + 10}" y="${yy}" width="${w - 20}" height="4" rx="2" fill="${line}" opacity=".55"/>`;
      if (!top) for (let i = 0; i < 3; i++) s += `<circle cx="${x + w / 2}" cy="${y + 42 + i * 16}" r="3" fill="${shade(color, -50)}"/>`;
    } else if (type === 'fabric') {
      const line = shade(color, isLight(color) ? -18 : 25);
      s += `<rect x="${x + w / 2 - 6}" y="${y}" width="12" height="${h}" fill="${line}" opacity=".7"/>`;
      s += `<rect x="${x + 6}" y="${y}" width="4" height="${h}" fill="${line}" opacity=".5"/>`;
      s += `<rect x="${x + w - 10}" y="${y}" width="4" height="${h}" fill="${line}" opacity=".5"/>`;
    }
    return s;
  }

  function casePath(shape, cx, cy, R) {
    if (shape === 'square') {
      const w = R * 1.72, h = R * 2.0;
      return { d: `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${R * 0.42}"/>`, inner: (pad) => `<rect x="${cx - w / 2 + pad}" y="${cy - h / 2 + pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${R * 0.42 - pad * 0.6}"/>`, w, h };
    }
    if (shape === 'tonneau') {
      const w = R * 1.7, h = R * 2.08;
      const path = (p) => {
        const x1 = cx - w / 2 + p, x2 = cx + w / 2 - p, y1 = cy - h / 2 + p, y2 = cy + h / 2 - p;
        return `<path d="M${x1 + 12} ${y1} Q${cx} ${y1 - 10} ${x2 - 12} ${y1} Q${x2 + 8} ${cy} ${x2 - 12} ${y2} Q${cx} ${y2 + 10} ${x1 + 12} ${y2} Q${x1 - 8} ${cy} ${x1 + 12} ${y1}Z"/>`;
      };
      return { d: path(0), inner: path, w, h };
    }
    if (shape === 'octagon') {
      const oct = (r) => {
        const pts = [];
        for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`); }
        return `<polygon points="${pts.join(' ')}"/>`;
      };
      return { d: oct(R * 1.08), inner: (p) => oct(R * 1.08 - p * 1.08), w: R * 2, h: R * 2 };
    }
    return { d: `<circle cx="${cx}" cy="${cy}" r="${R}"/>`, inner: (p) => `<circle cx="${cx}" cy="${cy}" r="${R - p}"/>`, w: R * 2, h: R * 2 };
  }

  function fill(svgShape, attrs) {
    return svgShape.replace(/\/>$/, ` ${attrs}/>`);
  }

  function hands(cx, cy, len, color, accent, sec) {
    const hand = (deg, l, w, c) => {
      const a = ((deg - 90) * Math.PI) / 180;
      return `<line x1="${cx - Math.cos(a) * l * 0.15}" y1="${cy - Math.sin(a) * l * 0.15}" x2="${cx + Math.cos(a) * l}" y2="${cy + Math.sin(a) * l}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    };
    let s = hand(305, len * 0.58, 4.5, color) + hand(60, len * 0.85, 3.2, color);
    if (sec) s += hand(190, len * 0.9, 1.3, accent);
    s += `<circle cx="${cx}" cy="${cy}" r="4" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="1.8" fill="${accent}"/>`;
    return s;
  }

  function indices(kind, cx, cy, r, color, big) {
    let s = '';
    const roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 12; i++) {
      const a = ((i * 30 - 90) * Math.PI) / 180;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (kind === 'roman') {
        s += `<text x="${x}" y="${y + 3.5}" font-size="${i % 3 === 0 ? 11 : 8}" text-anchor="middle" fill="${color}" font-family="Georgia,serif">${roman[i]}</text>`;
      } else if (kind === 'arabic') {
        s += `<text x="${x}" y="${y + 4.5}" font-size="${big ? 14 : 11}" font-weight="700" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif">${i === 0 ? 12 : i}</text>`;
      } else if (kind === 'dots') {
        s += `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 3.6 : 2.2}" fill="${color}"/>`;
      } else {
        const l = i % 3 === 0 ? 11 : 6;
        const x2 = cx + Math.cos(a) * (r - l), y2 = cy + Math.sin(a) * (r - l);
        s += `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${i % 3 === 0 ? 3.2 : 1.6}" stroke-linecap="round"/>`;
      }
    }
    return s;
  }

  function watchSVG(p, v, opts) {
    opts = opts || {};
    const id = ++uid;
    const cx = 120, cy = 170;
    const small = p.audience === 'women' || p.audience === 'kids';
    const R = small ? 58 : 68;
    const sw = small ? 52 : 66;
    const caseCol = v.case, strapCol = v.strap, dial = v.dial, accent = v.accent;
    const strapType = p.strapType;
    const strapFill = strapCol;
    const txt = isLight(dial) ? '#1d1d1f' : '#f5f5f5';
    const shp = casePath(p.shape, cx, cy, R);

    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 340" role="img" aria-label="${p.name} - ${v.name}" class="watch-svg">`;
    s += `<defs>
      <linearGradient id="cs${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(caseCol, 45)}"/><stop offset=".45" stop-color="${caseCol}"/><stop offset=".7" stop-color="${shade(caseCol, -30)}"/><stop offset="1" stop-color="${shade(caseCol, 20)}"/></linearGradient>
      <radialGradient id="dl${id}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="${shade(dial, isLight(dial) ? 0 : 22)}"/><stop offset="1" stop-color="${shade(dial, -22)}"/></radialGradient>
      <linearGradient id="st${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(strapFill, -25)}"/><stop offset=".5" stop-color="${shade(strapFill, strapType === 'metal' || strapType === 'mesh' ? 30 : 8)}"/><stop offset="1" stop-color="${shade(strapFill, -25)}"/></linearGradient>
      <linearGradient id="gl${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <filter id="sh${id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity=".28"/></filter>
    </defs>`;

    // straps
    const sx = cx - sw / 2;
    s += strap(id, strapType, strapFill, sx, 2, sw, cy - shp.h / 2 + 10, true);
    s += strap(id, strapType, strapFill, sx, cy + shp.h / 2 - 10, sw, 338 - (cy + shp.h / 2 - 10), false);

    // case + crown
    s += `<g filter="url(#sh${id})">`;
    s += `<rect x="${cx + shp.w / 2 - 4}" y="${cy - 9}" width="12" height="18" rx="3" fill="url(#cs${id})"/>`;
    if (p.style === 'chrono') {
      s += `<rect x="${cx + shp.w / 2 - 8}" y="${cy - 42}" width="10" height="12" rx="3" fill="url(#cs${id})" transform="rotate(30 ${cx + shp.w / 2} ${cy - 36})"/>`;
      s += `<rect x="${cx + shp.w / 2 - 8}" y="${cy + 30}" width="10" height="12" rx="3" fill="url(#cs${id})" transform="rotate(-30 ${cx + shp.w / 2} ${cy + 36})"/>`;
    }
    s += fill(shp.d, `fill="url(#cs${id})"`);
    s += '</g>';

    const inner = shp.inner(p.style === 'digital' || p.style === 'kids' ? 9 : 7);
    const dialR = R - 10;

    if (p.style === 'smart') {
      // screen
      s += fill(shp.inner(6), `fill="#0b0b0d"`);
      const ring = (r, c, pct) => {
        const C = 2 * Math.PI * r;
        return `<circle cx="${cx}" cy="${cy - 4}" r="${r}" fill="none" stroke="${c}" stroke-opacity=".22" stroke-width="5"/><circle cx="${cx}" cy="${cy - 4}" r="${r}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 ${cx} ${cy - 4})"/>`;
      };
      const ac = isLight(dial) || dial === '#141414' ? accent === '#1f2a44' ? '#4fc3f7' : accent : dial;
      s += ring(44, shade(ac === '#ffffff' ? '#4fc3f7' : ac, 10), 0.72) + ring(36, '#7CFC7C', 0.55) + ring(28, '#ff4d6d', 0.84);
      s += `<text x="${cx}" y="${cy + 2}" font-size="17" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">10:08</text>`;
      s += `<text x="${cx}" y="${cy + 14}" font-size="6.5" text-anchor="middle" fill="#bbb" font-family="Arial,sans-serif">WED 30</text>`;
      s += `<text x="${cx - 30}" y="${cy + 58}" font-size="7" fill="#ff4d6d" font-family="Arial,sans-serif">♥ 72</text>`;
      s += `<text x="${cx + 8}" y="${cy + 58}" font-size="7" fill="#7CFC7C" font-family="Arial,sans-serif">8,452</text>`;
    } else if (p.style === 'digital') {
      s += fill(inner, `fill="url(#dl${id})"`);
      const lcdW = R * 1.15, lcdH = R * 0.62;
      s += `<rect x="${cx - lcdW / 2}" y="${cy - lcdH / 2}" width="${lcdW}" height="${lcdH}" rx="6" fill="#c9d3b5" stroke="${shade(dial, -40)}" stroke-width="2"/>`;
      s += `<text x="${cx}" y="${cy + 9}" font-size="${R * 0.38}" font-weight="700" text-anchor="middle" fill="#1d2418" font-family="'Courier New',monospace">12:45</text>`;
      s += `<text x="${cx - lcdW / 2 + 5}" y="${cy - lcdH / 2 + 9}" font-size="6" fill="#1d2418" font-family="Arial,sans-serif">PM</text>`;
      s += `<text x="${cx}" y="${cy - lcdH / 2 - 7}" font-size="7.5" font-weight="700" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif" letter-spacing="1">${p.brand.toUpperCase()}</text>`;
      s += `<text x="${cx}" y="${cy + lcdH / 2 + 13}" font-size="6" text-anchor="middle" fill="${txt}" font-family="Arial,sans-serif" letter-spacing="1">SHOCK RESIST · WR</text>`;
      ['LIGHT', 'MODE', 'START', 'RESET'].forEach((t, i) => {
        const x = i % 2 === 0 ? cx - R * 0.72 : cx + R * 0.72, y = i < 2 ? cy - R * 0.62 : cy + R * 0.66;
        s += `<text x="${x}" y="${y}" font-size="5" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif">${t}</text>`;
      });
    } else {
      // analog, chrono, kids
      s += fill(shp.inner(4), `fill="${shade(caseCol, -15)}"`);
      s += fill(shp.inner(p.style === 'kids' ? 9 : 7), `fill="url(#dl${id})"`);
      const idxR = p.shape === 'round' || p.shape === 'octagon' ? dialR - 6 : dialR - 4;
      const idxCol = p.style === 'kids' ? accent : txt;
      s += indices(p.indices, cx, cy, idxR, idxCol, p.style === 'kids');
      if (p.style === 'chrono') {
        [[-22, 0], [22, 0], [0, 22]].forEach(([dx, dy]) => {
          s += `<circle cx="${cx + dx}" cy="${cy + dy}" r="11" fill="${shade(dial, isLight(dial) ? -10 : 14)}" stroke="${txt}" stroke-opacity=".5" stroke-width="1"/>`;
          s += `<line x1="${cx + dx}" y1="${cy + dy}" x2="${cx + dx + 5}" y2="${cy + dy - 7}" stroke="${accent}" stroke-width="1.4" stroke-linecap="round"/>`;
        });
        s += `<text x="${cx}" y="${cy - 26}" font-size="7" font-weight="700" text-anchor="middle" fill="${txt}" font-family="Arial,sans-serif" letter-spacing="1.5">${p.brand.toUpperCase()}</text>`;
        s += `<text x="${cx}" y="${cy - 18}" font-size="4.5" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif" letter-spacing="1">CHRONOGRAPH</text>`;
      } else if (p.style === 'kids') {
        s += `<text x="${cx}" y="${cy - 16}" font-size="7" font-weight="700" text-anchor="middle" fill="${txt}" font-family="Arial,sans-serif">${p.brand}</text>`;
        s += `<circle cx="${cx - 8}" cy="${cy + 20}" r="2" fill="${txt}"/><circle cx="${cx + 8}" cy="${cy + 20}" r="2" fill="${txt}"/><path d="M${cx - 10} ${cy + 26} Q${cx} ${cy + 34} ${cx + 10} ${cy + 26}" stroke="${txt}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      } else {
        s += `<text x="${cx}" y="${cy - dialR * 0.38}" font-size="7" font-weight="700" text-anchor="middle" fill="${txt}" font-family="Georgia,serif" letter-spacing="1.5">${p.brand.toUpperCase()}</text>`;
        if (p.specs && /Automatic/.test(p.specs.Movement)) s += `<text x="${cx}" y="${cy + dialR * 0.5}" font-size="5" text-anchor="middle" fill="${txt}" opacity=".75" font-family="Georgia,serif" letter-spacing="1">AUTOMATIC</text>`;
        if (p.specs && /Date|Day/.test((p.features || []).join(' '))) {
          s += `<rect x="${cx + dialR * 0.52}" y="${cy - 5}" width="13" height="10" rx="1.5" fill="#fff" stroke="${shade(caseCol, -30)}" stroke-width=".8"/><text x="${cx + dialR * 0.52 + 6.5}" y="${cy + 3}" font-size="7" text-anchor="middle" fill="#111" font-family="Arial,sans-serif">30</text>`;
        }
      }
      s += hands(cx, cy, dialR - 6, txt, accent === txt ? '#e63946' : accent, true);
    }

    // glass reflection
    s += fill(shp.inner(6), `fill="url(#gl${id})"`);
    s += '</svg>';
    return s;
  }

  window.WatchArt = { svg: watchSVG, isLight, shade };
})();
