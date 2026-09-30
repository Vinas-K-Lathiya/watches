/* Draws a realistic product-style illustration of a watch as SVG.
 * Used whenever a colour has no real photo (colour.image is empty).
 * Each product has a `style` that matches the real model's design:
 *   dress | field | diver | chrono | kidsana | retro | sportdigital | gsquare | goak | gbig | smartsq | smartrd | band
 */
(function () {
  let uid = 0;
  const CX = 120, CY = 170;

  // ---------- colour helpers ----------
  function rgb(hex) { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shade(hex, pct) {
    let [r, g, b] = rgb(hex);
    const t = pct < 0 ? 0 : 255, p = Math.abs(pct) / 100;
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function lum(hex) { const [r, g, b] = rgb(hex); return (r * 299 + g * 587 + b * 114) / 1000; }
  const isLight = (hex) => lum(hex) > 150;
  const f1 = (n) => Math.round(n * 10) / 10;
  const polar = (r, deg, cx, cy) => { const a = ((deg - 90) * Math.PI) / 180; return [f1((cx || CX) + Math.cos(a) * r), f1((cy || CY) + Math.sin(a) * r)]; };

  // ---------- defs ----------
  function defs(id, v, resinCase) {
    const c = v.case, s = v.strap, d = v.dial;
    const caseStops = resinCase
      ? `<stop offset="0" stop-color="${shade(c, 22)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -30)}"/>`
      : `<stop offset="0" stop-color="${shade(c, 60)}"/><stop offset=".28" stop-color="${shade(c, 10)}"/><stop offset=".52" stop-color="${shade(c, -38)}"/><stop offset=".78" stop-color="${shade(c, 30)}"/><stop offset="1" stop-color="${shade(c, -20)}"/>`;
    return `<defs>
      <linearGradient id="m${id}" x1="0" y1="0" x2="1" y2="1">${caseStops}</linearGradient>
      <linearGradient id="mr${id}" x1="1" y1="1" x2="0" y2="0">${caseStops}</linearGradient>
      <linearGradient id="s${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(s, -32)}"/><stop offset=".22" stop-color="${shade(s, 12)}"/><stop offset=".5" stop-color="${s}"/><stop offset=".8" stop-color="${shade(s, -8)}"/><stop offset="1" stop-color="${shade(s, -38)}"/></linearGradient>
      <linearGradient id="sm${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(s, -35)}"/><stop offset=".3" stop-color="${shade(s, 45)}"/><stop offset=".55" stop-color="${shade(s, -5)}"/><stop offset=".85" stop-color="${shade(s, 30)}"/><stop offset="1" stop-color="${shade(s, -30)}"/></linearGradient>
      <radialGradient id="d${id}" cx=".42" cy=".32" r=".85"><stop offset="0" stop-color="${shade(d, isLight(d) ? 4 : 26)}"/><stop offset=".65" stop-color="${d}"/><stop offset="1" stop-color="${shade(d, -35)}"/></radialGradient>
      <linearGradient id="g${id}" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".38" stop-color="#fff" stop-opacity=".06"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="hl${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fdfdfd"/><stop offset=".5" stop-color="#bfc3c9"/><stop offset="1" stop-color="#8d9199"/></linearGradient>
      <linearGradient id="hd${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4b4f56"/><stop offset=".5" stop-color="#1c1e22"/><stop offset="1" stop-color="#0c0d0f"/></linearGradient>
      <linearGradient id="hg${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff4c7"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#8f6f16"/></linearGradient>
      <linearGradient id="lcd${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7cdb4"/><stop offset="1" stop-color="#a9b193"/></linearGradient>
      <linearGradient id="scr${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1d22"/><stop offset=".5" stop-color="#050506"/><stop offset="1" stop-color="#101114"/></linearGradient>
      <pattern id="mesh${id}" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="${shade(s, 10)}"/><path d="M0 0L3 3M3 0L0 3" stroke="${shade(s, -30)}" stroke-width=".55"/></pattern>
      <filter id="sh${id}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".32"/></filter>
      <filter id="ts${id}" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="1" stdDeviation=".6" flood-opacity=".45"/></filter>
    </defs>`;
  }

  // ---------- straps ----------
  function strap(id, type, color, w, y0, y1, top) {
    const x = CX - w / 2;
    const h = y1 - y0;
    const edge = shade(color, -45);
    let s = '';
    if (type === 'metal' || type === 'jubilee') {
      s += `<rect x="${x}" y="${y0}" width="${w}" height="${h}" fill="${shade(color, -45)}"/>`;
      const rowH = type === 'jubilee' ? 11 : 17;
      const cols = type === 'jubilee' ? [[0, .22], [.22, .39], [.39, .61], [.61, .78], [.78, 1]] : [[0, .33], [.33, .67], [.67, 1]];
      const start = top ? y1 - Math.ceil(h / rowH) * rowH : y0;
      for (let yy = start; yy < y1; yy += rowH) {
        cols.forEach(([a, b], i) => {
          const polished = type === 'jubilee' ? i % 2 === 1 : i === 1;
          const yy2 = type === 'jubilee' && i % 2 === 1 ? yy + rowH / 2 : yy;
          s += `<rect x="${f1(x + a * w + .6)}" y="${f1(yy2 + .7)}" width="${f1((b - a) * w - 1.2)}" height="${rowH - 1.4}" rx="2.2" fill="url(#${polished ? 'sm' : 's'}${id})"/>`;
        });
      }
      return `<g clip-path="url(#cl${id}${top ? 't' : 'b'})">${s}</g>` + clip(id, x, y0, w, h, top);
    }
    if (type === 'mesh') {
      s += `<rect x="${x}" y="${y0}" width="${w}" height="${h}" fill="url(#mesh${id})"/><rect x="${x}" y="${y0}" width="${w}" height="${h}" fill="url(#sm${id})" opacity=".55"/>`;
      return s;
    }
    const r = type === 'leather' ? 5 : 9;
    s += `<rect x="${x}" y="${y0}" width="${w}" height="${h}" rx="${r}" fill="url(#s${id})"/>`;
    if (type === 'leather') {
      const st = isLight(color) ? shade(color, -30) : shade(color, 40);
      s += `<rect x="${x + 4.5}" y="${y0 - 2}" width="${w - 9}" height="${h + 4}" rx="3" fill="none" stroke="${st}" stroke-width="1.1" stroke-dasharray="3.5 2.5" opacity=".9"/>`;
      if (!top) {
        const ky = y0 + 52;
        s += `<rect x="${x - 2.5}" y="${ky}" width="${w + 5}" height="11" rx="3" fill="url(#s${id})" stroke="${edge}" stroke-width=".8"/>`;
        [ky + 42, ky + 62, ky + 82].forEach((hy) => { s += `<ellipse cx="${CX}" cy="${hy}" rx="3.4" ry="2.4" fill="${shade(color, -60)}"/>`; });
      }
    } else if (type === 'resin' || type === 'rubber') {
      const groove = shade(color, isLight(color) ? -18 : -40);
      const hi = shade(color, isLight(color) ? 8 : 18);
      if (type === 'resin') {
        for (let yy = top ? y1 - 16 : y0 + 8; top ? yy > y0 : yy < y1; yy += top ? -16 : 16) {
          s += `<rect x="${x + 5}" y="${yy}" width="${w - 10}" height="9" rx="3" fill="${hi}" opacity=".45"/><rect x="${x + 5}" y="${yy + 9}" width="${w - 10}" height="1.4" fill="${groove}" opacity=".7"/>`;
        }
      } else {
        s += `<rect x="${CX - w * 0.18}" y="${y0}" width="${w * 0.36}" height="${h}" fill="${groove}" opacity=".22"/>`;
      }
      if (!top) [y0 + 70, y0 + 88, y0 + 106, y0 + 124].forEach((hy) => { s += `<circle cx="${CX}" cy="${hy}" r="3.1" fill="${shade(color, -60)}"/>`; });
    } else if (type === 'fabric' || type === 'nato') {
      const line = isLight(color) ? shade(color, -14) : shade(color, 16);
      for (let yy = y0; yy < y1; yy += 2.4) s += `<line x1="${x + 1}" y1="${f1(yy)}" x2="${x + w - 1}" y2="${f1(yy)}" stroke="${line}" stroke-width=".6" opacity=".55"/>`;
      s += `<rect x="${x + 3}" y="${y0}" width="${w - 6}" height="${h}" fill="none" stroke="${shade(color, -30)}" stroke-width=".8" stroke-dasharray="2 2" opacity=".7"/>`;
      if (!top) s += `<rect x="${x - 1.5}" y="${y0 + 55}" width="${w + 3}" height="9" rx="1.5" fill="url(#hl${id})"/><rect x="${x - 1.5}" y="${y0 + 70}" width="${w + 3}" height="9" rx="1.5" fill="url(#hl${id})"/>`;
    }
    return s;
  }
  function clip(id, x, y, w, h, top) {
    return `<clipPath id="cl${id}${top ? 't' : 'b'}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`;
  }

  // ---------- 7-segment digits ----------
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
  function digits(str, x, y, h, color, ghost) {
    const w = h * 0.52, t = h * 0.13, gap = h * 0.2;
    let s = `<g transform="skewX(-7) translate(${f1(y * Math.tan(7 * Math.PI / 180))} 0)">`;
    let cx = x;
    for (const ch of String(str)) {
      if (ch === ':') { s += `<rect x="${f1(cx + t * .2)}" y="${f1(y + h * .27)}" width="${f1(t)}" height="${f1(t)}" fill="${color}"/><rect x="${f1(cx + t * .2)}" y="${f1(y + h * .63)}" width="${f1(t)}" height="${f1(t)}" fill="${color}"/>`; cx += t * 2.2; continue; }
      const segs = {
        a: [cx + t * .6, y, w - t * 1.2, t], d: [cx + t * .6, y + h - t, w - t * 1.2, t], g: [cx + t * .6, y + h / 2 - t / 2, w - t * 1.2, t],
        f: [cx, y + t * .6, t, h / 2 - t * .9], b: [cx + w - t, y + t * .6, t, h / 2 - t * .9],
        e: [cx, y + h / 2 + t * .3, t, h / 2 - t * .9], c: [cx + w - t, y + h / 2 + t * .3, t, h / 2 - t * .9],
      };
      const on = SEG[ch] || '';
      Object.entries(segs).forEach(([k, [sx, sy, sw, sh]]) => {
        const lit = on.includes(k);
        if (!lit && !ghost) return;
        s += `<rect x="${f1(sx)}" y="${f1(sy)}" width="${f1(sw)}" height="${f1(sh)}" rx="${f1(t / 2.4)}" fill="${color}" opacity="${lit ? 1 : 0.07}"/>`;
      });
      cx += w + gap;
    }
    return s + '</g>';
  }
  // Largest digit height (up to maxH) so that main time + small seconds fit inside width.
  function fitDigits(main, sec, maxH, width) {
    let h = maxH;
    while (h > 4 && digitsWidth(main, h) + (sec ? digitsWidth(sec, h * 0.55) + 3 : 0) > width) h -= 0.5;
    return h;
  }
  const digitsWidth = (str, h) => { let w = 0; for (const ch of String(str)) w += ch === ':' ? h * 0.13 * 2.2 : h * 0.72; return w - h * 0.2; };

  function text(x, y, str, size, fill, opts) {
    opts = opts || {};
    return `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" fill="${fill}" text-anchor="${opts.anchor || 'middle'}" font-family="${opts.serif ? 'Georgia,Times,serif' : 'Helvetica,Arial,sans-serif'}" font-weight="${opts.weight || 700}" letter-spacing="${opts.ls || 0}"${opts.italic ? ' font-style="italic"' : ''}${opts.op ? ` opacity="${opts.op}"` : ''}>${str}</text>`;
  }
  function brandText(p, x, y, size, fill, serif) {
    const name = p.brand.toUpperCase();
    const fs = Math.min(size, (size * 9) / Math.max(6, name.length));
    return text(x, y, name, f1(fs), fill, { serif, ls: fs * 0.14 });
  }

  // ---------- hands ----------
  function hand(deg, len, width, fill, lume, tail, cx, cy) {
    cx = cx || CX; cy = cy || CY;
    const t = tail || len * 0.16;
    const pts = `${-width / 2},${t} ${-width * 0.55},${-len * 0.1} 0,${-len} ${width * 0.55},${-len * 0.1} ${width / 2},${t}`;
    let s = `<g transform="translate(${cx} ${cy}) rotate(${deg})"><polygon points="${pts}" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width=".4"/>`;
    s += `<line x1="0" y1="${t}" x2="0" y2="${-len * 0.98}" stroke="rgba(255,255,255,.35)" stroke-width=".5"/>`;
    if (lume) s += `<polygon points="${-width * 0.22},${-len * 0.22} 0,${-len * 0.86} ${width * 0.22},${-len * 0.22}" fill="${lume}"/>`;
    return s + '</g>';
  }
  function secHand(deg, len, color, cx, cy) {
    cx = cx || CX; cy = cy || CY;
    return `<g transform="translate(${cx} ${cy}) rotate(${deg})"><line x1="0" y1="${len * 0.22}" x2="0" y2="${-len}" stroke="${color}" stroke-width="1.1" stroke-linecap="round"/><circle cx="0" cy="${len * 0.2}" r="2" fill="${color}"/></g>`;
  }
  function handSet(id, r, dial, accent, opts) {
    opts = opts || {};
    const light = isLight(dial);
    const fill = opts.gold ? `url(#hg${id})` : light ? `url(#hd${id})` : `url(#hl${id})`;
    const lume = opts.lume ? '#eef6e0' : null;
    let s = hand(-51, r * 0.58, opts.wide ? 7 : 5.2, fill, lume, 0, opts.cx, opts.cy) + hand(58, r * 0.86, opts.wide ? 5.4 : 4, fill, lume, 0, opts.cx, opts.cy);
    s += secHand(200, r * 0.92, opts.sec || (accent && lum(accent) < 235 && accent !== dial ? accent : '#d62828'), opts.cx, opts.cy);
    s += `<circle cx="${opts.cx || CX}" cy="${opts.cy || CY}" r="3.4" fill="${light ? '#222' : '#ddd'}"/><circle cx="${opts.cx || CX}" cy="${opts.cy || CY}" r="1.5" fill="${opts.sec || accent || '#d62828'}"/>`;
    return s;
  }

  // ---------- dial furniture ----------
  function sunburst(r, dial) {
    let s = '';
    const light = isLight(dial);
    for (let i = 0; i < 120; i++) {
      const [x, y] = polar(r, i * 3);
      s += `<line x1="${CX}" y1="${CY}" x2="${x}" y2="${y}" stroke="${i % 2 ? '#fff' : '#000'}" stroke-width=".9" opacity="${light ? 0.025 : 0.05}"/>`;
    }
    return s;
  }
  function minuteTrack(r, color, len) {
    let s = '';
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const [x1, y1] = polar(r, i * 6), [x2, y2] = polar(r - (len || 3), i * 6);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width=".6" opacity=".75"/>`;
    }
    return s;
  }
  function indices(id, kind, r, dial, accent, gold) {
    const light = isLight(dial);
    const ink = light ? '#1d1d1f' : '#f2f2f2';
    const applied = gold ? `url(#hg${id})` : light ? `url(#hd${id})` : `url(#hl${id})`;
    let s = '';
    const roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 12; i++) {
      const deg = i * 30;
      const [x, y] = polar(r - 7, deg);
      if (kind === 'roman') {
        s += text(x, y + 3.6, roman[i], i % 3 === 0 ? 10.5 : 7.8, ink, { serif: true, weight: 600 });
      } else if (kind === 'arabic') {
        s += text(x, y + 4.2, i === 0 ? 12 : i, i % 3 === 0 ? 12 : 10, ink, { weight: 700 });
      } else if (kind === 'field') {
        s += text(x, y + 4, i === 0 ? 12 : i, 10.5, ink, { weight: 700 });
        const [x2, y2] = polar(r - 19, deg);
        s += text(x2, y2 + 2, i === 0 ? 24 : i + 12, 4.8, accent && accent !== ink ? accent : ink, { weight: 600, op: 0.85 });
      } else if (kind === 'dots') {
        s += `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 3.4 : 2.3}" fill="${applied}" filter="url(#ts${id})"/>`;
      } else if (kind === 'none') {
        const [a1, b1] = polar(r - 2, deg), [a2, b2] = polar(r - 7, deg);
        s += `<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" stroke="${ink}" stroke-width=".7"/>`;
      } else {
        const long = i % 3 === 0;
        const w = long ? 3.6 : 2.4, l = long ? 12 : 8;
        const g = `<g transform="translate(${CX} ${CY}) rotate(${deg})"><rect x="${-w / 2}" y="${-(r - 2)}" width="${w}" height="${l}" rx=".6" fill="${applied}" filter="url(#ts${id})"/><rect x="${-w / 4}" y="${-(r - 3)}" width="${w / 2}" height="${l - 2}" fill="${light ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.35)'}"/></g>`;
        s += g;
        if (i === 0) s += `<g transform="translate(${CX} ${CY})"><rect x="-5" y="${-(r - 2)}" width="3" height="12" rx=".6" fill="${applied}" filter="url(#ts${id})"/><rect x="2" y="${-(r - 2)}" width="3" height="12" rx=".6" fill="${applied}" filter="url(#ts${id})"/></g>`;
      }
    }
    return s;
  }
  function dateWindow(x, y, dial) {
    return `<rect x="${x - 7}" y="${y - 5.5}" width="14" height="11" rx="1.2" fill="#fbfbf8" stroke="${isLight(dial) ? '#aaa' : shade(dial, 40)}" stroke-width="1"/>` + text(x, y + 3.2, '30', 7.5, '#111', { weight: 700 });
  }
  function subDial(x, y, r, dial, accent, ink) {
    const bg = isLight(dial) ? shade(dial, -9) : shade(dial, 14);
    let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="${bg}" stroke="${ink}" stroke-opacity=".45" stroke-width=".8"/>`;
    for (let i = 0; i < 12; i++) {
      const [a, b] = polar(r - 1, i * 30, x, y), [c, d] = polar(r - (i % 3 === 0 ? 4 : 2.5), i * 30, x, y);
      s += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${ink}" stroke-width=".6" opacity=".8"/>`;
    }
    s += `<circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="none" stroke="${ink}" stroke-opacity=".12" stroke-width="${r * 0.5}" stroke-dasharray=".5 1"/>`;
    const deg = (x * 7 + y * 3) % 360;
    s += `<g transform="translate(${x} ${y}) rotate(${deg})"><polygon points="-1,2 0,${-r + 2} 1,2" fill="${accent}"/></g><circle cx="${x}" cy="${y}" r="1.6" fill="${accent}"/>`;
    return s;
  }
  function crystal(shape, id) {
    return shape.replace(/\/>$/, ` fill="url(#g${id})" pointer-events="none"/>`);
  }

  // ======================================================
  // ANALOG ROUND (dress, field, diver, chrono, kidsana)
  // ======================================================
  function analog(p, v, id) {
    const L = p.look || {};
    const small = p.small;
    const R = small ? 52 : p.style === 'chrono' ? 66 : 62;
    const kid = p.style === 'kidsana';
    const resinCase = kid || (v.case === '#1b1b1b' && p.style !== 'diver');
    const sw = small ? (p.strapType === 'jubilee' ? 40 : 36) : p.style === 'chrono' ? 54 : 50;
    const dial = v.dial, accent = v.accent;
    const light = isLight(dial);
    const ink = light ? '#1d1d1f' : '#f2f2f2';
    const gold = /Gold|Champagne/i.test(v.name) && !/Rose/.test(v.name) && lum(v.case) > 150 && v.case !== '#c9ccd1';
    let s = defs(id, v, resinCase);
    s += `<g filter="url(#sh${id})">`;
    s += strap(id, p.strapType, v.strap, sw, -10, CY - R + 14, true);
    s += strap(id, p.strapType, v.strap, sw, CY + R - 14, 360, false);
    // lugs
    s += `<rect x="${CX - sw / 2 - 5}" y="${CY - R - 12}" width="${sw + 10}" height="${2 * R + 24}" rx="7" fill="url(#m${id})"/>`;
    s += `<rect x="${CX - sw / 2 - 1}" y="${CY - R - 12}" width="${sw + 2}" height="${2 * R + 24}" fill="${shade(v.case, -40)}" opacity=".35"/>`;
    // crown & pushers
    s += `<rect x="${CX + R - 3}" y="${CY - 7}" width="11" height="14" rx="2.5" fill="url(#m${id})"/>`;
    for (let i = 0; i < 4; i++) s += `<line x1="${CX + R + 1 + i * 2}" y1="${CY - 6}" x2="${CX + R + 1 + i * 2}" y2="${CY + 6}" stroke="${shade(v.case, -45)}" stroke-width=".6"/>`;
    if (p.style === 'chrono') {
      [-38, 38].forEach((dy) => {
        const [px, py] = polar(R + 2, dy < 0 ? 60 : 120);
        s += `<rect x="${px - 4}" y="${py - 5}" width="9" height="10" rx="2" fill="url(#m${id})" transform="rotate(${dy < 0 ? -30 : 30} ${px} ${py})"/>`;
      });
    }
    // case
    s += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#m${id})"/>`;
    s += `</g>`;
    s += `<circle cx="${CX}" cy="${CY}" r="${R - 1.5}" fill="none" stroke="${shade(v.case, 55)}" stroke-width="1" opacity=".7"/>`;

    let dialR = R - 7;
    // bezel variants
    if (p.style === 'diver') {
      const bz = L.bezel2 ? null : (light ? '#1b1b1b' : shade(dial, -8));
      if (L.bezel2) {
        s += `<path d="M${CX} ${CY - R + 3} A${R - 3} ${R - 3} 0 0 1 ${CX} ${CY + R - 3} L${CX} ${CY + R - 15} A${R - 15} ${R - 15} 0 0 0 ${CX} ${CY - R + 15}Z" fill="${accent}"/>`;
        s += `<path d="M${CX} ${CY + R - 3} A${R - 3} ${R - 3} 0 0 1 ${CX} ${CY - R + 3} L${CX} ${CY - R + 15} A${R - 15} ${R - 15} 0 0 0 ${CX} ${CY + R - 15}Z" fill="${shade(dial, 10)}"/>`;
      } else {
        s += `<circle cx="${CX}" cy="${CY}" r="${R - 9}" fill="none" stroke="${bz}" stroke-width="12"/>`;
      }
      s += `<circle cx="${CX}" cy="${CY}" r="${R - 9}" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="12" stroke-dasharray="1 2.2"/>`;
      for (let i = 0; i < 60; i++) {
        const deg = i * 6;
        if (i % 10 === 0 && i) { const [x, y] = polar(R - 9, deg); s += `<text x="${x}" y="${y + 2.8}" font-size="7.5" fill="#f4f4f4" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" transform="rotate(${deg} ${x} ${y})">${i}</text>`; continue; }
        if (i === 0) continue;
        if (i < 15 || i % 5 === 0) { const [a, b] = polar(R - 4, deg), [c, d] = polar(R - (i % 5 === 0 ? 11 : 7), deg); s += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#f4f4f4" stroke-width="${i % 5 === 0 ? 1.4 : .7}"/>`; }
      }
      s += `<polygon points="${CX - 5},${CY - R + 4} ${CX + 5},${CY - R + 4} ${CX},${CY - R + 13}" fill="#f4f4f4"/><circle cx="${CX}" cy="${CY - R + 7.5}" r="1.6" fill="#8fd18f"/>`;
      dialR = R - 16;
    } else if (L.tachy) {
      s += `<circle cx="${CX}" cy="${CY}" r="${R - 7}" fill="none" stroke="${light ? shade(v.case, -10) : '#161616'}" stroke-width="9"/>`;
      // Tachymeter: speed n is printed where the seconds hand is after 3600/n seconds (21600/n degrees).
      [70, 80, 90, 100, 120, 150, 200, 300, 500].forEach((n) => {
        const a = f1(21600 / n);
        const [x, y] = polar(R - 7, a);
        s += `<text x="${x}" y="${y + 2}" font-size="5" fill="${light ? '#222' : '#eee'}" text-anchor="middle" font-family="Helvetica,Arial" font-weight="700" transform="rotate(${a} ${x} ${y})">${n}</text>`;
      });
      s += text(CX, CY - R + 9.5, 'TACHYMETER', 4.4, light ? '#222' : '#ddd', { ls: 1 });
      dialR = R - 12;
    } else {
      s += `<circle cx="${CX}" cy="${CY}" r="${R - 4}" fill="none" stroke="url(#mr${id})" stroke-width="5"/>`;
      dialR = R - 6.5;
    }

    // dial
    s += `<circle cx="${CX}" cy="${CY}" r="${dialR}" fill="url(#d${id})"/>`;
    if (!kid && p.style !== 'field') s += sunburst(dialR, dial);
    s += `<circle cx="${CX}" cy="${CY}" r="${dialR}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.2"/>`;
    s += minuteTrack(dialR - 1.5, ink, 2.6);

    if (kid) {
      const cols = ['#e03131', '#2a6fdb', '#2e9e4f', '#f59f00'];
      for (let i = 0; i < 12; i++) {
        const [x, y] = polar(dialR - 9, i * 30);
        s += `<circle cx="${x}" cy="${y}" r="6.2" fill="${cols[i % 4]}" opacity=".16"/>` + text(x, y + 3.6, i === 0 ? 12 : i, 9.5, cols[i % 4], { weight: 800 });
      }
      s += brandText(p, CX, CY - 15, 6.5, '#333');
      s += `<circle cx="${CX - 9}" cy="${CY + 16}" r="2.4" fill="#333"/><circle cx="${CX + 9}" cy="${CY + 16}" r="2.4" fill="#333"/><path d="M${CX - 11} ${CY + 23} Q${CX} ${CY + 32} ${CX + 11} ${CY + 23}" stroke="#333" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
      s += `<g transform="translate(${CX} ${CY}) rotate(-51)"><rect x="-2.6" y="${-(dialR * .55)}" width="5.2" height="${dialR * .55 + 4}" rx="2.6" fill="#333"/></g><g transform="translate(${CX} ${CY}) rotate(58)"><rect x="-2" y="${-(dialR * .8)}" width="4" height="${dialR * .8 + 4}" rx="2" fill="#333"/></g>`;
      s += secHand(200, dialR * 0.85, v.accent) + `<circle cx="${CX}" cy="${CY}" r="3.5" fill="${v.accent}"/>`;
    } else {
      s += indices(id, L.ind || 'stick', dialR, dial, accent, gold);
      const topY = CY - dialR * 0.45;
      s += brandText(p, CX, topY, small ? 6.2 : 7.4, ink, L.ind === 'roman');
      const model = (p.model || '').replace(/["“”]/g, '').split(/\s+/)[0].toUpperCase();
      let sub = L.auto ? (/Mechanical/.test(p.specs.Movement) ? 'MECHANICAL' : 'AUTOMATIC') : p.style === 'chrono' ? (/Multifunction/.test(p.specs.Movement) ? 'MULTIFUNCTION' : 'CHRONOGRAPH') : p.style === 'diver' ? `WATER RESIST ${String(p.specs['Water Resistance']).toUpperCase()}` : /Solar|Eco/.test(p.specs.Movement) ? 'ECO-DRIVE' : model;
      if (!(p.style === 'chrono')) s += text(CX, topY + 7, sub, 3.9, p.style === 'diver' ? accent : ink, { weight: 600, ls: 0.9, op: 0.85 });
      if (p.style === 'chrono') {
        const roman = L.ind === 'roman' || L.ind === 'arabic';
        const sr = dialR * (roman ? 0.21 : 0.24), off = dialR * (roman ? 0.42 : 0.46);
        s += subDial(CX - off, CY, sr, dial, accent, ink) + subDial(CX + off, CY, sr, dial, accent, ink) + subDial(CX, CY + off, sr, dial, accent, ink);
        s += text(CX, topY + 7, sub, 3.8, accent, { weight: 700, ls: 1 });
        if (L.date) { const [dx, dy] = polar(dialR * 0.62, 135); s += dateWindow(dx, dy, dial); }
      } else if (L.openheart) {
        const hx = CX - dialR * 0.42, hy = CY + 4;
        s += `<circle cx="${hx}" cy="${hy}" r="11" fill="#1a1a1a" stroke="url(#hg${id})" stroke-width="1.6"/><circle cx="${hx}" cy="${hy}" r="8" fill="none" stroke="#d4af37" stroke-width="1.2"/>`;
        for (let i = 0; i < 6; i++) { const [a, b] = polar(8, i * 60, hx, hy); s += `<line x1="${hx}" y1="${hy}" x2="${a}" y2="${b}" stroke="#d4af37" stroke-width=".8"/>`; }
        s += `<circle cx="${hx + 4}" cy="${hy - 4}" r="3" fill="#c0392b" opacity=".85"/>`;
      } else if (L.date) {
        s += dateWindow(CX + dialR * 0.66, CY, dial);
      }
      s += handSet(id, dialR - 3, dial, accent, { lume: p.style === 'diver' || p.style === 'field', wide: p.style === 'diver' || p.style === 'field', gold });
    }
    s += crystal(`<circle cx="${CX}" cy="${CY}" r="${dialR}"/>`, id);
    return s;
  }

  // ======================================================
  // RETRO DIGITAL (Casio A168, A158, F-91W, LA670, A700)
  // ======================================================
  function retro(p, v, id) {
    const small = p.small;
    const W = small ? 64 : 84, H = small ? 72 : 92;
    const lab = (p.look && p.look.labels) || { top: p.brand.toUpperCase(), tr: 'WATER RESIST', bottom: 'ALARM CHRONOGRAPH' };
    const resin = lab.resin || p.strapType === 'resin';
    const x = CX - W / 2, y = CY - H / 2;
    const sw = small ? 34 : 48;
    let s = defs(id, v, resin);
    s += `<g filter="url(#sh${id})">`;
    s += strap(id, p.strapType, v.strap, sw, -10, y + 8, true);
    s += strap(id, p.strapType, v.strap, sw, y + H - 8, 360, false);
    s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="${small ? 9 : 12}" fill="url(#m${id})"/>`;
    [[x - 3, CY - 16], [x - 3, CY + 10], [x + W - 1, CY + 10]].forEach(([bx, by]) => { s += `<rect x="${bx}" y="${by}" width="4" height="7" rx="1.2" fill="url(#m${id})"/>`; });
    s += `</g>`;
    // faceplate
    const fx = x + (small ? 5 : 7), fy = y + (small ? 7 : 9), fw = W - (small ? 10 : 14), fh = H - (small ? 14 : 18);
    s += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${small ? 4 : 6}" fill="${v.dial}"/>`;
    s += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${small ? 4 : 6}" fill="none" stroke="${shade(v.case, 50)}" stroke-width=".8" opacity=".6"/>`;
    const accent = v.accent;
    const labC = lum(accent) < 60 ? '#ddd' : accent;
    s += text(fx + 4, fy + (small ? 8 : 10), lab.top, small ? 6.3 : 8.2, '#f1f1f1', { anchor: 'start', weight: 800, ls: 0.4 });
    s += text(fx + fw - 4, fy + (small ? 7.5 : 9.5), lab.tr, small ? 3.4 : 4.2, labC, { anchor: 'end', weight: 700, ls: 0.3 });
    // LCD
    const lx = fx + (small ? 5 : 7), ly = fy + (small ? 13 : 17), lw = fw - (small ? 10 : 14), lh = fh - (small ? 25 : 32);
    s += `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="2" fill="url(#lcd${id})" stroke="#555" stroke-width=".7"/>`;
    const dh = fitDigits('10:08', '58', lh * 0.52, lw - 8);
    const mw = digitsWidth('10:08', dh), secW = digitsWidth('58', dh * 0.55);
    const dx = lx + (lw - mw - secW - 3) / 2;
    s += digits('10:08', dx, ly + lh * 0.4, dh, '#1f2419', true);
    s += digits('58', dx + mw + 3, ly + lh * 0.4 + dh * 0.45, dh * 0.55, '#1f2419', true);
    s += text(lx + 4, ly + lh * 0.3, 'WE', lh * 0.2, '#1f2419', { anchor: 'start', weight: 800 });
    s += digits('30', lx + lw - dh * 0.95, ly + 2.5, lh * 0.2, '#1f2419', false);
    s += text(CX, fy + fh - (small ? 3.5 : 4.5), lab.bottom, small ? 3.2 : 4.1, labC, { weight: 700, ls: 0.4 });
    s += crystal(`<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="6"/>`, id);
    return s;
  }

  // ======================================================
  // ROUND SPORTS DIGITAL (W-218H, W-800H, AE-1200, kids digital)
  // ======================================================
  function sportDigital(p, v, id) {
    const small = p.small;
    const R = small ? 50 : 60;
    const sw = small ? 36 : 46;
    const resinC = v.case;
    let s = defs(id, v, true);
    s += `<g filter="url(#sh${id})">`;
    s += strap(id, p.strapType === 'metal' ? 'metal' : 'resin', v.strap, sw, -10, CY - R + 10, true);
    s += strap(id, p.strapType === 'metal' ? 'metal' : 'resin', v.strap, sw, CY + R - 10, 360, false);
    // case with side "wings"
    s += `<path d="M${CX - R * 0.78} ${CY - R * 0.92} L${CX + R * 0.78} ${CY - R * 0.92} Q${CX + R * 1.1} ${CY} ${CX + R * 0.78} ${CY + R * 0.92} L${CX - R * 0.78} ${CY + R * 0.92} Q${CX - R * 1.1} ${CY} ${CX - R * 0.78} ${CY - R * 0.92}Z" fill="url(#m${id})"/>`;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { s += `<rect x="${CX + sx * R * 0.98 - 4}" y="${CY + sy * R * 0.5 - 5}" width="8" height="10" rx="2" fill="${shade(resinC, -25)}"/>`; });
    s += `</g>`;
    const br = R * 0.8;
    s += `<circle cx="${CX}" cy="${CY}" r="${br}" fill="${shade(resinC, -12)}" stroke="${shade(resinC, 20)}" stroke-width="1"/>`;
    const lab = isLight(resinC) ? '#333' : '#e8e8e8';
    [['LIGHT', 315], ['MODE', 225], ['START', 45], ['RESET', 135]].forEach(([t, deg]) => { const [x, y] = polar(br - 5, deg); s += text(x, y + 1.5, t, 4, v.accent, { weight: 700 }); });
    s += text(CX, CY - br + 9, p.brand.toUpperCase(), small ? 5.5 : 7, lab, { weight: 800, ls: 0.6 });
    s += text(CX, CY + br - 5, /100m/i.test(p.specs['Water Resistance']) ? 'WATER RESIST 100M' : 'WATER RESIST', 3.6, lab, { weight: 600, ls: 0.4 });
    // LCD
    const lw = br * 1.35, lh = br * 0.9;
    const lx = CX - lw / 2, ly = CY - lh / 2 + 1;
    s += `<rect x="${lx - 3}" y="${ly - 3}" width="${lw + 6}" height="${lh + 6}" rx="6" fill="${v.dial}"/>`;
    s += `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="4" fill="url(#lcd${id})"/>`;
    const dh = fitDigits('10:08', '', lh * 0.46, lw - 10);
    const mw = digitsWidth('10:08', dh);
    s += digits('10:08', CX - mw / 2, ly + lh * 0.42, dh, '#1f2419', true);
    s += text(lx + 5, ly + lh * 0.3, 'WE', lh * 0.18, '#1f2419', { anchor: 'start', weight: 800 });
    s += digits('9-30', lx + lw - lh * 0.72, ly + 4, lh * 0.18, '#1f2419', false);
    s += `<line x1="${lx + 3}" y1="${ly + lh * 0.36}" x2="${lx + lw - 3}" y2="${ly + lh * 0.36}" stroke="#1f2419" stroke-width=".5" opacity=".4"/>`;
    s += crystal(`<circle cx="${CX}" cy="${CY}" r="${br}"/>`, id);
    return s;
  }

  // ======================================================
  // G-SHOCK SQUARE (DW-5600 / DW-5900)
  // ======================================================
  function gSquare(p, v, id) {
    const W = 104, H = 112;
    const x = CX - W / 2, y = CY - H / 2;
    let s = defs(id, v, true);
    s += `<g filter="url(#sh${id})">`;
    s += strap(id, 'resin', v.strap, 52, -10, y + 10, true);
    s += strap(id, 'resin', v.strap, 52, y + H - 10, 360, false);
    [[x - 5, y + 18], [x - 5, y + H - 30], [x + W - 3, y + 18], [x + W - 3, y + H - 30]].forEach(([bx, by]) => { s += `<rect x="${bx}" y="${by}" width="8" height="12" rx="2.5" fill="${shade(v.case, 30)}" stroke="${shade(v.case, -30)}" stroke-width=".6"/>`; });
    s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="22" fill="url(#m${id})"/>`;
    s += `</g>`;
    for (let i = 0; i < 9; i++) { s += `<rect x="${x + 3}" y="${y + 22 + i * 7.5}" width="4" height="4" rx="1" fill="${shade(v.case, -22)}"/><rect x="${x + W - 7}" y="${y + 22 + i * 7.5}" width="4" height="4" rx="1" fill="${shade(v.case, -22)}"/>`; }
    const lab = isLight(v.case) ? '#222' : '#eaeaea';
    s += text(CX, y + 12, 'G-SHOCK', 7, v.accent, { weight: 800, ls: 1 });
    s += text(x + 14, y + H - 6, 'LIGHT', 4.2, lab) + text(x + W - 14, y + H - 6, 'START', 4.2, lab) + text(x + 14, y + 12, 'ADJUST', 3.8, lab) + text(x + W - 14, y + 12, 'MODE', 3.8, lab);
    // face
    const fx = x + 12, fy = y + 18, fw = W - 24, fh = H - 34;
    s += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="8" fill="${v.dial}" stroke="${shade(v.case, 25)}" stroke-width="1"/>`;
    const faceInk = isLight(v.dial) ? '#222' : '#eee';
    s += text(fx + 5, fy + 8.5, 'CASIO', 6.4, faceInk, { anchor: 'start', weight: 800 });
    s += text(fx + fw - 5, fy + 8, 'PROTECTION', 3.4, v.accent, { anchor: 'end', weight: 700 });
    const lx = fx + 7, ly = fy + 13, lw = fw - 14, lh = fh - 26;
    s += `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="5" fill="url(#lcd${id})"/>`;
    if (p.sku && /5900/.test(p.sku)) {
      [[lx + 8, ly + 8], [lx + lw - 8, ly + 8]].forEach(([cx, cy]) => { s += `<circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="#1f2419" stroke-width=".8"/>`; });
      s += `<circle cx="${CX}" cy="${ly + 9}" r="7" fill="none" stroke="#1f2419" stroke-width=".8"/>`;
    }
    const dh = fitDigits('10:08', '58', lh * 0.48, lw - 8);
    const mw = digitsWidth('10:08', dh), secW = digitsWidth('58', dh * 0.55);
    const dx = CX - (mw + secW + 3) / 2;
    s += digits('10:08', dx, ly + lh * 0.45, dh, '#1f2419', true);
    s += digits('58', dx + mw + 3, ly + lh * 0.45 + dh * 0.45, dh * 0.55, '#1f2419', true);
    s += text(lx + 5, ly + lh * 0.32, 'WE', lh * 0.16, '#1f2419', { anchor: 'start', weight: 800 });
    s += digits('9-30', lx + lw - lh * 0.7, ly + 4, lh * 0.15, '#1f2419', false);
    s += text(CX, fy + fh - 4, 'WATER 200M RESIST', 3.6, v.accent, { weight: 700, ls: 0.4 });
    s += crystal(`<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="8"/>`, id);
    return s;
  }

  // ======================================================
  // G-SHOCK OCTAGON (GA-2100 "CasiOak")
  // ======================================================
  function gOak(p, v, id) {
    const R = 60;
    let s = defs(id, v, true);
    const oct = (r) => { const pts = []; for (let i = 0; i < 8; i++) pts.push(polar(r, 22.5 + i * 45).join(',')); return pts.join(' '); };
    s += `<g filter="url(#sh${id})">`;
    s += strap(id, 'resin', v.strap, 50, -10, CY - R + 8, true);
    s += strap(id, 'resin', v.strap, 50, CY + R - 8, 360, false);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { s += `<rect x="${CX + sx * (R - 2) - 4}" y="${CY + sy * 30 - 5}" width="9" height="10" rx="2" fill="url(#m${id})"/>`; });
    s += `<circle cx="${CX}" cy="${CY}" r="${R - 4}" fill="url(#m${id})"/>`;
    s += `<polygon points="${oct(R + 2)}" fill="url(#m${id})" stroke="${shade(v.case, -35)}" stroke-width="1"/>`;
    s += `</g>`;
    s += `<polygon points="${oct(R - 4)}" fill="none" stroke="${shade(v.case, 28)}" stroke-width="1.2" opacity=".6"/>`;
    const lab = isLight(v.case) ? '#333' : '#dcdcdc';
    s += text(CX - 34, CY - 44, 'ADJUST', 3.4, lab) + text(CX + 34, CY - 44, 'MODE', 3.4, lab) + text(CX - 34, CY + 48, 'LIGHT', 3.4, lab) + text(CX + 34, CY + 48, 'START', 3.4, lab);
    s += text(CX, CY - R + 9, 'G-SHOCK', 5, v.accent === '#8a8a8a' ? lab : v.accent, { weight: 800, ls: 0.8 });
    s += text(CX, CY + R - 5, 'WATER 200M RESIST', 3.2, lab, { weight: 600 });
    const dr = R - 13;
    s += `<circle cx="${CX}" cy="${CY}" r="${dr}" fill="url(#d${id})" stroke="${shade(v.case, -35)}" stroke-width="1.5"/>`;
    const ink = isLight(v.dial) ? '#222' : '#eee';
    s += minuteTrack(dr - 1.5, ink, 2.5);
    s += indices(id, 'stick', dr, v.dial, v.accent);
    s += text(CX, CY - dr * 0.5, 'CASIO', 6.5, ink, { weight: 800, ls: 0.6 });
    // LCD windows
    s += `<rect x="${CX + 6}" y="${CY + 12}" width="26" height="12" rx="2" fill="url(#lcd${id})" stroke="#333" stroke-width=".6"/>`;
    s += digits('10:08', CX + 8.5, CY + 14.5, 7, '#1f2419', false);
    s += `<rect x="${CX - 32}" y="${CY + 12}" width="18" height="12" rx="2" fill="url(#lcd${id})" stroke="#333" stroke-width=".6"/>`;
    s += text(CX - 23, CY + 20.8, 'WED', 5, '#1f2419', { weight: 800 });
    s += handSet(id, dr - 4, v.dial, v.accent, { lume: true, wide: true, sec: v.accent === '#8a8a8a' ? '#bbbbbb' : v.accent });
    s += crystal(`<circle cx="${CX}" cy="${CY}" r="${dr}"/>`, id);
    return s;
  }

  // ======================================================
  // G-SHOCK / BABY-G BIG ANA-DIGI (GA-110, GA-700, BA-110)
  // ======================================================
  function gBig(p, v, id) {
    const R = p.small ? 60 : 68;
    let s = defs(id, v, true);
    s += `<g filter="url(#sh${id})">`;
    s += strap(id, 'resin', v.strap, p.small ? 44 : 54, -10, CY - R + 10, true);
    s += strap(id, 'resin', v.strap, p.small ? 44 : 54, CY + R - 10, 360, false);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const [bx, by] = polar(R + 1, sx < 0 ? (sy < 0 ? 300 : 240) : (sy < 0 ? 60 : 120)); s += `<rect x="${bx - 6}" y="${by - 6}" width="12" height="12" rx="3" fill="${shade(v.case, 25)}" stroke="${shade(v.case, -30)}" stroke-width=".7"/>`; });
    s += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#m${id})"/>`;
    s += `</g>`;
    // chunky bezel with notches
    for (let i = 0; i < 12; i++) { const [x, y] = polar(R - 3, i * 30 + 15); s += `<circle cx="${x}" cy="${y}" r="3.2" fill="${shade(v.case, -22)}"/>`; }
    const lab = isLight(v.case) ? '#333' : '#e6e6e6';
    const acc = lum(v.accent) < 40 ? '#e03131' : v.accent;
    [['SHOCK RESIST', 0], ['LIGHT', 240], ['MODE', 120], ['ADJUST', 300], ['START', 60], ['200M', 180]].forEach(([t, deg]) => { const [x, y] = polar(R - 9, deg); s += `<text x="${x}" y="${y + 1.6}" font-size="4.2" fill="${deg === 0 ? acc : lab}" text-anchor="middle" font-family="Helvetica,Arial" font-weight="800" transform="rotate(${deg > 90 && deg < 270 ? deg - 180 : deg} ${x} ${y})">${t}</text>`; });
    const dr = R - 16;
    s += `<circle cx="${CX}" cy="${CY}" r="${dr}" fill="url(#d${id})" stroke="${shade(v.case, -40)}" stroke-width="2"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="${dr - 7}" fill="none" stroke="${isLight(v.dial) ? '#bbb' : '#333'}" stroke-width="1"/>`;
    const ink = isLight(v.dial) ? '#222' : '#eee';
    for (let i = 0; i < 12; i++) { const [a, b] = polar(dr - 1, i * 30), [c, d] = polar(dr - 7, i * 30); s += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${i % 3 ? ink : acc}" stroke-width="${i % 3 ? 1.4 : 2.6}"/>`; }
    s += text(CX, CY - dr * 0.55, 'CASIO', 6, ink, { weight: 800 });
    s += text(CX, CY - dr * 0.55 + 7, p.brand === 'Casio' && /Baby/.test(p.model) ? 'Baby-G' : 'G-SHOCK', 5, acc, { weight: 800, italic: true });
    // LCDs
    s += `<rect x="${CX + 5}" y="${CY - 13}" width="28" height="12" rx="2" fill="url(#lcd${id})" stroke="#333" stroke-width=".6"/>` + digits('10:08', CX + 7.5, CY - 10.5, 7, '#1f2419', false);
    s += `<rect x="${CX - 14}" y="${CY + 16}" width="28" height="12" rx="2" fill="url(#lcd${id})" stroke="#333" stroke-width=".6"/>` + digits('9-30', CX - 11.5, CY + 18.5, 7, '#1f2419', false);
    s += subDial(CX - 21, CY - 2, 10, v.dial, acc, ink);
    s += handSet(id, dr - 5, v.dial, acc, { lume: true, wide: true, sec: acc });
    s += crystal(`<circle cx="${CX}" cy="${CY}" r="${dr}"/>`, id);
    return s;
  }

  // ======================================================
  // SMARTWATCHES
  // ======================================================
  function smartFace(id, x, y, w, h, accent, round) {
    const cx = x + w / 2, cy = y + h / 2;
    let s = '';
    const ac = lum(accent) > 230 ? '#8ccdf5' : accent;
    if (round) {
      const r = w / 2 - 6;
      const arc = (rr, pct, col, sw) => { const C = 2 * Math.PI * rr; return `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${col}" stroke-opacity=".18" stroke-width="${sw}"/><circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${f1(C * pct)} ${f1(C)}" transform="rotate(-90 ${cx} ${cy})"/>`; };
      s += arc(r, 0.7, ac, 3.2) + arc(r - 6, 0.55, '#7CFC9C', 3.2);
      s += text(cx, cy + 6, '10:08', w * 0.22, '#fff', { weight: 700 });
      s += text(cx, cy - w * 0.16, 'WED 30', w * 0.07, '#bdbdbd', { weight: 600, ls: 0.5 });
      s += text(cx - w * 0.14, cy + w * 0.22, '&#9829; 72', w * 0.075, '#ff4d6d') + text(cx + w * 0.16, cy + w * 0.22, '8,452', w * 0.075, '#7CFC9C');
    } else {
      const ring = (rr, pct, col) => { const C = 2 * Math.PI * rr; return `<circle cx="${x + w * 0.27}" cy="${y + h * 0.72}" r="${rr}" fill="none" stroke="${col}" stroke-opacity=".2" stroke-width="3"/><circle cx="${x + w * 0.27}" cy="${y + h * 0.72}" r="${rr}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${f1(C * pct)} ${f1(C)}" transform="rotate(-90 ${x + w * 0.27} ${y + h * 0.72})"/>`; };
      s += text(x + 8, y + h * 0.18, 'WED 30 SEP', w * 0.075, '#bdbdbd', { anchor: 'start', weight: 600 });
      s += text(x + 7, y + h * 0.47, '10', w * 0.33, '#fff', { anchor: 'start', weight: 700 });
      s += text(x + w * 0.52, y + h * 0.47, '08', w * 0.33, ac, { anchor: 'start', weight: 700 });
      s += ring(10, 0.72, '#ff4d6d') + ring(6.2, 0.55, '#7CFC9C') + ring(2.6, 0.9, ac);
      s += text(x + w * 0.52, y + h * 0.68, '&#9829; 72 bpm', w * 0.075, '#ff4d6d', { anchor: 'start' });
      s += text(x + w * 0.52, y + h * 0.8, '8,452 steps', w * 0.075, '#7CFC9C', { anchor: 'start' });
      s += `<rect x="${x + w * 0.52}" y="${y + h * 0.86}" width="${w * 0.36}" height="2.6" rx="1.3" fill="#333"/><rect x="${x + w * 0.52}" y="${y + h * 0.86}" width="${w * 0.26}" height="2.6" rx="1.3" fill="${ac}"/>`;
    }
    return s;
  }
  function smartSq(p, v, id) {
    const W = 100, H = 120;
    const x = CX - W / 2, y = CY - H / 2;
    let s = defs(id, v, false);
    s += `<g filter="url(#sh${id})">`;
    s += strap(id, p.strapType, v.strap, 64, -10, y + 20, true);
    s += strap(id, p.strapType, v.strap, 64, y + H - 20, 360, false);
    s += `<rect x="${x + W - 4}" y="${CY - 26}" width="8" height="15" rx="3.5" fill="url(#m${id})"/><rect x="${x + W - 3}" y="${CY + 2}" width="6" height="20" rx="2.5" fill="url(#m${id})"/>`;
    s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="28" fill="url(#m${id})"/>`;
    s += `</g>`;
    s += `<rect x="${x + 4}" y="${y + 4}" width="${W - 8}" height="${H - 8}" rx="24" fill="url(#scr${id})"/>`;
    s += smartFace(id, x + 10, y + 12, W - 20, H - 24, v.accent, false);
    s += crystal(`<rect x="${x + 4}" y="${y + 4}" width="${W - 8}" height="${H - 8}" rx="24"/>`, id);
    return s;
  }
  function smartRd(p, v, id) {
    const R = 64;
    let s = defs(id, v, false);
    s += `<g filter="url(#sh${id})">`;
    s += strap(id, p.strapType, v.strap, p.strapType === 'metal' ? 54 : 50, -10, CY - R + 12, true);
    s += strap(id, p.strapType, v.strap, p.strapType === 'metal' ? 54 : 50, CY + R - 12, 360, false);
    s += `<rect x="${CX - 30}" y="${CY - R - 8}" width="60" height="${2 * R + 16}" rx="8" fill="url(#m${id})"/>`;
    [[-24, 60], [24, 120]].forEach(([dy, deg]) => { const [px, py] = polar(R + 1, deg); s += `<rect x="${px - 5}" y="${py - 5}" width="10" height="10" rx="3" fill="url(#m${id})"/>`; });
    s += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#m${id})"/>`;
    s += `</g>`;
    s += `<circle cx="${CX}" cy="${CY}" r="${R - 4}" fill="${shade(v.case, -45)}"/>`;
    for (let i = 0; i < 60; i++) { const [a, b] = polar(R - 4.5, i * 6), [c, d] = polar(R - (i % 5 ? 7 : 9.5), i * 6); s += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#fff" stroke-opacity="${i % 5 ? .35 : .8}" stroke-width="${i % 5 ? .6 : 1.2}"/>`; }
    const sr = R - 11;
    s += `<circle cx="${CX}" cy="${CY}" r="${sr}" fill="url(#scr${id})"/>`;
    s += smartFace(id, CX - sr, CY - sr, sr * 2, sr * 2, v.accent, true);
    s += crystal(`<circle cx="${CX}" cy="${CY}" r="${R - 4}"/>`, id);
    return s;
  }
  function band(p, v, id) {
    const W = 44, H = 104;
    const x = CX - W / 2, y = CY - H / 2;
    let s = defs(id, v, true);
    s += `<g filter="url(#sh${id})">`;
    s += strap(id, 'rubber', v.strap, 38, -10, y + 20, true);
    s += strap(id, 'rubber', v.strap, 38, y + H - 20, 360, false);
    s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="22" fill="url(#m${id})"/>`;
    s += `</g>`;
    s += `<rect x="${x + 3}" y="${y + 3}" width="${W - 6}" height="${H - 6}" rx="19" fill="url(#scr${id})"/>`;
    if (p.brand === 'TimeVault') {
      s += digits('10', CX - 11, CY - 18, 15, '#ff3b3b', true) + digits('08', CX - 11, CY + 3, 15, '#ff3b3b', true);
    } else {
      const ac = lum(v.accent) > 230 ? '#8ccdf5' : v.accent;
      s += text(CX, y + 20, 'WED 30', 5, '#aaa', { weight: 600 });
      s += text(CX, CY - 4, '10', 18, '#fff') + text(CX, CY + 14, '08', 18, ac);
      s += text(CX, y + H - 22, '&#9829; 72', 5.5, '#ff4d6d') + text(CX, y + H - 14, '8,452', 5.5, '#7CFC9C');
    }
    s += crystal(`<rect x="${x + 3}" y="${y + 3}" width="${W - 6}" height="${H - 6}" rx="19"/>`, id);
    return s;
  }

  const RENDER = { retro, sportdigital: sportDigital, gsquare: gSquare, goak: gOak, gbig: gBig, smartsq: smartSq, smartrd: smartRd, band };

  function watchSVG(p, v) {
    const id = 'w' + (++uid);
    const body = (RENDER[p.style] || analog)(p, v, id);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 340" role="img" aria-label="${p.name} - ${v.name}" class="watch-svg">${body}</svg>`;
  }

  window.WatchArt = { svg: watchSVG, isLight, shade };
})();
