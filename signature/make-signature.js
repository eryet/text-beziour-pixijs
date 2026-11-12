// Brush-signature generator for 陳偉洺.
// Turns centerline strokes with pen pressure (signature/design.js) into filled
// brush outlines, adds dry-brush streaks (飛白), red seals cut from the
// characters in ../chen-name.svg, and a stroke-by-stroke draw-on animation.
//
// usage (from the repo root):
//   node signature/make-signature.js              -> chen-signature.svg (dark ink) + chen-signature-light.svg (light ink)
//   node signature/make-signature.js --variants   -> signature/variants/*.svg + signature/variants/index.html gallery
//   add --static for no animation, --debug for extra *.debug.svg files with numbered control points
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const STATIC = args.includes('--static');
const DEBUG = args.includes('--debug');
const VARIANTS = args.includes('--variants');

// ---------- prng + 1D noise ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function noise1d(seed) {
  const r = rng(seed), tab = Array.from({ length: 512 }, () => r() * 2 - 1);
  const g = i => tab[((i % 512) + 512) % 512];
  return x => { // Catmull-Rom interpolated value noise (C1, no flat spots)
    const i = Math.floor(x), f = x - i, p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    return 0.4 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  };
}

// ---------- geometry ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const len = a => Math.hypot(a[0], a[1]);
const smooth = u => u * u * (3 - 2 * u);

// centripetal Catmull-Rom segment P1->P2 as a cubic bezier
function crToBezier(P0, P1, P2, P3) {
  const d01 = Math.max(Math.sqrt(len(sub(P1, P0))), 1e-3), d12 = Math.max(Math.sqrt(len(sub(P2, P1))), 1e-3), d23 = Math.max(Math.sqrt(len(sub(P3, P2))), 1e-3);
  const t1 = d01, t2 = t1 + d12, t3 = t2 + d23;
  const m1 = mul(add(sub(mul(sub(P1, P0), 1 / t1), mul(sub(P2, P0), 1 / t2)), mul(sub(P2, P1), 1 / (t2 - t1))), t2 - t1);
  const m2 = mul(add(sub(mul(sub(P2, P1), 1 / (t2 - t1)), mul(sub(P3, P1), 1 / (t3 - t1))), mul(sub(P3, P2), 1 / (t3 - t2))), t2 - t1);
  return [P1, add(P1, mul(m1, 1 / 3)), sub(P2, mul(m2, 1 / 3)), P2];
}
function bez(B, u) {
  const v = 1 - u;
  return [v * v * v * B[0][0] + 3 * v * v * u * B[1][0] + 3 * v * u * u * B[2][0] + u * u * u * B[3][0],
          v * v * v * B[0][1] + 3 * v * v * u * B[1][1] + 3 * v * u * u * B[2][1] + u * u * u * B[3][1]];
}

// smooth piece through [x,y,p] points -> dense samples {x,y,p}
function samplePiece(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const P1 = pts[i], P2 = pts[i + 1];
    const P0 = i > 0 ? pts[i - 1] : add(P1, sub(P1, P2));
    const P3 = i + 2 < pts.length ? pts[i + 2] : add(P2, sub(P2, P1));
    const B = crToBezier(P0, P1, P2, P3);
    const n = Math.max(4, Math.ceil(len(sub(P2, P1)) / 1.5));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const u = k / n, q = bez(B, u);
      out.push({ x: q[0], y: q[1], p: P1[2] + (P2[2] - P1[2]) * smooth(u) });
    }
  }
  return out;
}

// brush width = pressure x direction factor (horizontals thinner than verticals)
function widths(s, { W, K, PHI, minW }) {
  const n = s.length;
  const raw = s.map((pt, i) => {
    const a = s[Math.max(0, i - 2)], b = s[Math.min(n - 1, i + 2)];
    const f = 1 - K + K * Math.abs(Math.sin(Math.atan2(b.y - a.y, b.x - a.x) - PHI));
    return Math.max(minW, W * pt.p * f);
  });
  return raw.map((_, i) => { let t = 0, c = 0; for (let j = -3; j <= 3; j++) { const k = i + j; if (k >= 0 && k < n) { t += raw[k]; c++; } } return t / c; });
}

// filled outline around samples; hl/hr = half widths on the left/right side
function outline(s, w, hl = w.map(v => v / 2), hr = hl) {
  const n = s.length; if (n < 2) return null;
  const T = s.map((_, i) => { const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)]; const d = [b.x - a.x, b.y - a.y]; const l = len(d) || 1; return [d[0] / l, d[1] / l]; });
  const L = [], R = [];
  const forward = (side, p, i) => !side.length || i === n - 1 || ((p[0] - side[side.length - 1][0]) * T[i][0] + (p[1] - side[side.length - 1][1]) * T[i][1]) > 0;
  for (let i = 0; i < n; i++) {
    const nx = -T[i][1], ny = T[i][0];
    const l = [s[i].x + nx * hl[i], s[i].y + ny * hl[i]], r = [s[i].x - nx * hr[i], s[i].y - ny * hr[i]];
    if (forward(L, l, i)) L.push(l); // dropping backward points avoids swallowtail holes on tight turns
    if (forward(R, r, i)) R.push(r);
  }
  const cap = (c, t, h, fwd) => {
    const pts = []; if (h < 0.8) return pts;
    const a0 = Math.atan2(t[0], -t[1]);
    for (let k = 1; k < 9; k++) { const a = a0 + (fwd ? -1 : 1) * Math.PI * k / 9; pts.push([c.x + Math.cos(a) * h, c.y + Math.sin(a) * h]); }
    return pts;
  };
  const poly = [...L, ...cap(s[n - 1], T[n - 1], w[n - 1] / 2, true), ...R.reverse(), ...cap(s[0], T[0], w[0] / 2, false).reverse()];
  let A = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; A += a[0] * b[1] - b[0] * a[1]; }
  return A < 0 ? poly.reverse() : poly; // same orientation everywhere so nonzero fill unions overlaps
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const A = pts[a], d = sub(pts[b], A), dl = len(d) || 1e-9;
    for (let i = a + 1; i < b; i++) { const v = sub(pts[i], A); const dist = Math.abs(d[0] * v[1] - d[1] * v[0]) / dl; if (dist > md) { md = dist; mi = i; } }
    if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const f1 = v => (Math.round(v * 10) / 10).toString();
const polyD = poly => 'M' + poly.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
const lineD = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');

function xf(t) { // per-character transform {s, rot, skew, x, y}
  const s = t.s ?? 1, r = (t.rot ?? 0) * Math.PI / 180, k = Math.tan((t.skew ?? 0) * Math.PI / 180);
  const c = Math.cos(r), si = Math.sin(r);
  return ([x, y, ...rest]) => { const X = (x + k * y) * s, Y = y * s; return [t.x + X * c - Y * si, t.y + X * si + Y * c, ...rest]; };
}

// ---------- seal glyphs: the three characters of chen-name.svg ----------
const GLYPHS = fs.readFileSync(path.join(ROOT, 'chen-name.svg'), 'utf8').split('<g').slice(1).map(g => {
  const paths = [...g.matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
  const nums = paths.join(' ').match(/-?[\d.]+/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { paths, box: [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0] };
});

function sealSvg(S, i, animate, delay) {
  const W = 1000, H = 1000 * S.h / S.w, round = S.shape === 'round';
  const glyphs = S.chars.map(({ c, box: [bx, by, bw, bh], gbox }) => {
    const [gx, gy, gw, gh] = gbox || GLYPHS[c].box, sx = bw / gw, sy = bh / gh;
    return `<g transform="translate(${bx},${by}) scale(${sx.toFixed(4)},${sy.toFixed(4)}) translate(${-gx},${-gy})" stroke-width="${(S.strokeW / Math.sqrt(sx * sy)).toFixed(1)}">${GLYPHS[c].paths.map(d => `<path d="${d}"/>`).join('')}</g>`;
  }).join('');
  const shape = attrs => round ? `<ellipse cx="${W / 2}" cy="${H / 2}" rx="${W / 2}" ry="${H / 2}" ${attrs}/>` : `<rect width="${W}" height="${H}" rx="38" ${attrs}/>`;
  let defs = `<filter id="sealTex${i}" filterUnits="userSpaceOnUse" x="-40" y="-40" width="${S.w + 80}" height="${S.h + 80}">
  <feTurbulence type="fractalNoise" baseFrequency="${S.wearFreq}" numOctaves="3" seed="${9 + i}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -22 ${S.wearCut}" result="holes"/>
  <feComposite in="SourceGraphic" in2="holes" operator="in" result="worn"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="2" result="n2"/>
  <feDisplacementMap in="worn" in2="n2" scale="${S.edge}" xChannelSelector="R" yChannelSelector="G"/>
</filter>\n`;
  let art;
  if (S.style === 'zhu') { // 朱文: red characters inside a red border
    const b = S.border, inset = round
      ? `<ellipse cx="${W / 2}" cy="${H / 2}" rx="${W / 2 - b / 2}" ry="${H / 2 - b / 2}" stroke-width="${b}"/>`
      : `<rect x="${b / 2}" y="${b / 2}" width="${W - b}" height="${H - b}" rx="24" stroke-width="${b}"/>`;
    art = `<g fill="none" stroke="${S.color}" stroke-linecap="round" stroke-linejoin="round">${inset}${glyphs}</g>`;
  } else { // 白文: characters cut out of a solid red block
    defs += `<mask id="sealCut${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><g fill="none" stroke="#000" stroke-linecap="square">${glyphs}</g></mask>\n`;
    art = shape(`fill="${S.color}" mask="url(#sealCut${i})"`);
  }
  const anim = animate ? ` style="animation-delay:${delay.toFixed(3)}s"` : '';
  const body = `<g transform="translate(${S.x},${S.y}) rotate(${S.rot ?? 0},${S.w / 2},${S.h / 2})"><g class="seal"${anim} filter="url(#sealTex${i})"><g transform="scale(${S.w / 1000})">${art}</g></g></g>`;
  return { defs, body };
}

// ---------- generate one SVG ----------
function generate(D, { ink, animate, debug }) {
  const B = D.brush, A = D.anim;
  const rand = rng(D.seed);
  let noiseSeed = 101;

  // 1. place strokes; merge `join`ed strokes into the previous one with a thin thread (牽絲)
  const strokes = [];
  let sid = 0;
  for (const ch of D.chars) {
    const T = xf(ch.t);
    for (const st of ch.strokes) {
      const id = sid++;
      const pts = st.pts.map(p => { const q = T(p); return [q[0], q[1], q[2], q[3], id]; });
      const dry = st.dry ? [{ sid: id, range: st.dry }] : [];
      const prev = strokes[strokes.length - 1];
      if (st.join && prev) {
        const a = prev.pts[prev.pts.length - 1], b = pts[0], d = sub(b, a), n = [-d[1], d[0]];
        const m = add(mul(add(a, b), 0.5), mul(n, st.join.bulge ?? 0));
        a[3] = 'k'; b[3] = 'k';
        prev.pts.push([m[0], m[1], st.join.p ?? 0.04, undefined, -1], ...pts);
        prev.dry.push(...dry);
      } else strokes.push({ pts, dry, char: ch.name, noEntry: st.noEntry, w: st.w });
    }
  }
  // brush entry (起筆) and end press (收筆)
  for (const st of strokes) {
    let pts = st.pts;
    if (B.entry !== false && !st.noEntry && pts[0][2] >= 0.5) {
      const d = sub(pts[1], pts[0]), dl = len(d) || 1, u = [d[0] / dl, d[1] / dl], e = B.W * 0.26;
      pts = [[pts[0][0] - u[0] * e * 0.5 - e * 0.45, pts[0][1] - u[1] * e * 0.5 - e * 0.7, 0.45, 'k', pts[0][4]], [...pts[0].slice(0, 3), 'k', pts[0][4]], ...pts.slice(1)];
    }
    const n = pts.length, last = pts[n - 1], d = sub(last, pts[n - 2]);
    if (B.exit !== false && last[2] >= 0.7 && Math.abs(d[1]) < Math.abs(d[0])) {
      const e = B.W * 0.42 * last[2];
      pts = [...pts.slice(0, n - 1), [...last.slice(0, 3), 'k', last[4]], [last[0] + e * 0.25, last[1] + e * 0.7, last[2] * 0.6, undefined, last[4]]];
    }
    st.pts = pts;
  }

  // 2. build outlines, centerlines and dry-brush streaks
  const bbox = [1e9, 1e9, -1e9, -1e9];
  const ext = (x, y, r = 0) => { bbox[0] = Math.min(bbox[0], x - r); bbox[1] = Math.min(bbox[1], y - r); bbox[2] = Math.max(bbox[2], x + r); bbox[3] = Math.max(bbox[3], y + r); };
  const built = strokes.map(st => {
    const pieces = []; let cur = [];
    st.pts.forEach((p, i) => { cur.push(p); if (p[3] === 'k' && i > 0 && i < st.pts.length - 1) { pieces.push(cur); cur = [p]; } });
    pieces.push(cur);
    const polys = [], center = [], dry = [];
    let maxW = 0;
    for (const pc of pieces) {
      if (pc.length < 2) continue;
      const s = samplePiece(pc), w = widths(s, st.w ? { ...B, W: B.W * st.w } : B), pieceSid = pc[1][4];
      w.forEach((v, i) => { maxW = Math.max(maxW, v); ext(s[i].x, s[i].y, v / 2 + 4); });
      const [a1, a2, l1, l2] = B.edge, nz = [0, 1, 2, 3].map(() => noise1d(noiseSeed++));
      let acc = 0; const arc = s.map((q, i) => (acc += i ? Math.hypot(q.x - s[i - 1].x, q.y - s[i - 1].y) : 0));
      const hl = w.map((v, i) => v / 2 * (1 + a1 * nz[0](arc[i] / l1) + a2 * nz[2](arc[i] / l2)));
      const hr = w.map((v, i) => v / 2 * (1 + a1 * nz[1](arc[i] / l1) + a2 * nz[3](arc[i] / l2)));
      polys.push(rdp(outline(s, w, hl, hr), 0.25));
      s.forEach((q, i) => center.push({ ...q, w: w[i], sid: pieceSid }));
    }
    for (const { sid: dsid, range: [a, b, count] } of st.dry) { // 飛白: paper-coloured streaks near the stroke end
      const c = center.filter(q => q.sid === dsid);
      const cl = [0]; for (let i = 1; i < c.length; i++) cl.push(cl[i - 1] + Math.hypot(c[i].x - c[i - 1].x, c[i].y - c[i - 1].y));
      const tot = cl[cl.length - 1];
      for (let k = 0; k < count; k++) {
        const off = (k % 2 ? 1 : -1) * (0.15 + 0.6 * rand());
        const t0 = a + rand() * (b - a) * 0.35, t1 = Math.min(1, b + 0.02), thick = 0.10 + 0.16 * rand();
        const seg = [], ws = [];
        for (let i = 0; i < c.length; i++) {
          const t = cl[i] / tot; if (t < t0 || t > t1) continue;
          const j0 = Math.max(0, i - 1), j1 = Math.min(c.length - 1, i + 1);
          const dx = c[j1].x - c[j0].x, dy = c[j1].y - c[j0].y, dl = Math.hypot(dx, dy) || 1;
          const h = c[i].w / 2 * off, u = (t - t0) / (t1 - t0);
          seg.push({ x: c[i].x - dy / dl * h, y: c[i].y + dx / dl * h });
          ws.push(Math.max(0.5, c[i].w * thick * Math.min(1, u * 2.2) * (0.6 + 0.6 * u)));
        }
        if (seg.length > 3) dry.push(rdp(outline(seg, ws), 0.3));
      }
    }
    const cl = rdp(center.map(q => [q.x, q.y]), 0.4);
    let L = 0; for (let i = 1; i < cl.length; i++) L += Math.hypot(cl[i][0] - cl[i - 1][0], cl[i][1] - cl[i - 1][1]);
    return { st, polys, dry, cl, L, maxW };
  });
  // a seal with `at: {char, pt}` is anchored to a point in that character's local box, so it follows the layout
  const seals = (D.seals || []).map(S => { if (!S.at) return S; const [x, y] = xf(D.chars[S.at.char].t)(S.at.pt); return { ...S, x, y }; });
  for (const S of seals) { ext(S.x, S.y); ext(S.x + S.w, S.y + S.h); }
  let backdrop = null; // optional block behind the ink, e.g. a red seal the signature is cut out of
  if (D.backdrop) { const p = D.backdrop.pad; backdrop = [bbox[0] - p, bbox[1] - p, bbox[2] + p, bbox[3] + p]; ext(backdrop[0], backdrop[1]); ext(backdrop[2], backdrop[3]); }

  // 3. timing: strokes in writing order, a short pause between characters
  let t = A.start, prevChar = null;
  const timing = built.map(b => {
    if (prevChar && b.st.char !== prevChar) t += A.charGap;
    prevChar = b.st.char;
    const r = { delay: t, dur: A.base + b.L / A.speed };
    t += r.dur + A.gap;
    return r;
  });

  // 4. emit
  const pad = 30;
  const vb = [Math.floor(bbox[0] - pad), Math.floor(bbox[1] - pad), Math.ceil(bbox[2] - bbox[0] + 2 * pad), Math.ceil(bbox[3] - bbox[1] + 2 * pad)];
  const region = `x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}"`;
  let css = '', defs = '', body = '', dbg = '';

  const allDry = built.flatMap(b => b.dry);
  if (allDry.length) defs += `<mask id="dry" maskUnits="userSpaceOnUse" ${region}><rect ${region} fill="#fff"/><path fill="#000" d="${allDry.map(polyD).join('')}"/></mask>\n`;

  built.forEach((b, i) => {
    const d = b.polys.map(polyD).join('');
    const tone = B.tones ? ` fill-opacity="${B.tones[i % B.tones.length]}"` : ''; // per-stroke ink density
    if (!animate) { body += `<path d="${d}"${tone}/>\n`; return; }
    // reveal mask: a thick centerline whose dash grows along the stroke
    const r = b.maxW / 2 + 4, L = b.L.toFixed(1);
    const hide = (b.L + r + 2).toFixed(1), gapLen = (b.L + 2 * r + 20).toFixed(1);
    defs += `<mask id="m${i}" maskUnits="userSpaceOnUse" ${region}><path class="r${i}" d="${lineD(b.cl)}" fill="none" stroke="#fff" stroke-width="${(2 * r).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${L} ${gapLen}"/></mask>\n`;
    css += `@keyframes k${i}{from{stroke-dashoffset:${hide}}to{stroke-dashoffset:0}} .r${i}{stroke-dashoffset:0;animation:k${i} ${timing[i].dur.toFixed(3)}s ${A.ease} ${timing[i].delay.toFixed(3)}s both}\n`;
    body += `<path d="${d}"${tone} mask="url(#m${i})"/>\n`;
  });

  let sealBody = '';
  seals.forEach((S, i) => { const s = sealSvg(S, i, animate, t + A.sealGap + i * 0.3); defs += s.defs; sealBody += s.body; });
  if (animate) css += `@keyframes stamp{0%{opacity:0;transform:scale(1.12)}60%{opacity:1;transform:scale(.98)}100%{opacity:1;transform:scale(1)}}
.seal{transform-box:fill-box;transform-origin:center;animation:stamp .38s cubic-bezier(.2,.7,.3,1) both}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}\n`;

  if (debug) for (const st of strokes) {
    dbg += `<path d="${lineD(st.pts)}" fill="none" stroke="#e33" stroke-width="2" opacity=".6"/>`;
    st.pts.forEach((p, i) => { dbg += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${p[3] === 'k' ? 7 : 5}" fill="${p[3] === 'k' ? '#06f' : '#e33'}"/><text x="${f1(p[0] + 8)}" y="${f1(p[1] - 6)}" font-size="22" fill="#06f">${p[4]}.${i}</text>`; });
  }

  // optional effects from the design: extra defs, ink paint/filter, and an overlay drawn over the ink
  const fx = D.fx || {}, ctx = { vb, region, end: t, animate, ink, hasDry: allDry.length > 0 };
  if (fx.defs) defs += fx.defs(ctx);
  let back = '';
  if (backdrop) {
    const K = D.backdrop, [x0, y0, x1, y1] = backdrop;
    defs += `<filter id="backTex" filterUnits="userSpaceOnUse" ${region}>
  <feTurbulence type="fractalNoise" baseFrequency="${K.wearFreq}" numOctaves="3" seed="21" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -22 ${K.wearCut}" result="holes"/>
  <feComposite in="SourceGraphic" in2="holes" operator="in" result="worn"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="5" result="n2"/>
  <feDisplacementMap in="worn" in2="n2" scale="${K.edge}" xChannelSelector="R" yChannelSelector="G"/>
</filter>\n`;
    if (animate) css += `@keyframes bdIn{from{opacity:0}to{opacity:1}} .bd{animation:bdIn .35s ease-out both}\n`;
    back = `<g class="bd" filter="url(#backTex)"><rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(x1 - x0)}" height="${f1(y1 - y0)}" rx="${K.rx}" fill="${K.color}"/></g>\n`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${Math.round(vb[2] * D.displayScale)}">
<title>${D.title}</title>
${css ? `<style>\n${css}</style>\n` : ''}<defs>
${defs}</defs>
${back}<g${allDry.length ? ' mask="url(#dry)"' : ''}${fx.inkFilter ? ` filter="${fx.inkFilter}"` : ''} fill="${fx.inkFill || ink}" fill-opacity="${B.opacity}"><g id="ink">
${body}</g></g>
${fx.overlay ? fx.overlay(ctx) : ''}
${sealBody}
${dbg}</svg>
`;
}

function write(file, svg) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, svg);
  console.log(`wrote ${path.relative(ROOT, file)} (${(svg.length / 1024).toFixed(1)} KB)`);
}

if (VARIANTS) {
  const variants = require('./variants.js');
  const dir = path.join(__dirname, 'variants');
  for (const v of variants) {
    write(path.join(dir, `${v.id}.svg`), generate(v.design, { ink: v.design.ink.dark, animate: !STATIC }));
    if (DEBUG) write(path.join(dir, `${v.id}.debug.svg`), generate(v.design, { ink: v.design.ink.dark, animate: false, debug: true }));
  }
  write(path.join(dir, 'index.html'), require('./gallery.js')(variants));
} else {
  const D = require('./design.js');
  write(path.join(ROOT, 'chen-signature.svg'), generate(D, { ink: D.ink.dark, animate: !STATIC }));
  write(path.join(ROOT, 'chen-signature-light.svg'), generate(D, { ink: D.ink.light, animate: !STATIC }));
  if (DEBUG) write(path.join(__dirname, 'signature.debug.svg'), generate(D, { ink: D.ink.dark, animate: false, debug: true }));
}
