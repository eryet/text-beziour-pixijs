// Signature variants, each derived from the base design in design.js.
// Build with: node signature/make-signature.js --variants  (opens as signature/variants/index.html)
const base = require('./design.js');
const clone = o => JSON.parse(JSON.stringify(o));

// ---------- helpers ----------
// seals are anchored to a point in 洺's local box (pt), so they follow each layout
const SEAL = { color: '#b5281f', wearFreq: 0.09, wearCut: 14.6, edge: 7 };
const seal = {
  chen: (pt, size, rot = -3) => ({ ...SEAL, at: { char: 2, pt }, w: size, h: size, rot, style: 'bai', strokeW: 73,
    chars: [{ c: 0, box: [70, 70, 860, 860], gbox: [80, 40, 940, 940] }] }),
  // 偉洺 stacked in a tall 朱文 seal
  weiMing: (pt, w, rot = 2) => ({ ...SEAL, at: { char: 2, pt }, w, h: w * 1.9, rot, style: 'zhu', strokeW: 62, border: 58,
    chars: [{ c: 1, box: [120, 120, 760, 790] }, { c: 2, box: [120, 990, 760, 790] }] }),
  // 陳偉洺: 陳 in the right column, 偉 / 洺 stacked on the left (read right to left)
  full: (pt, size, rot = -2) => ({ ...SEAL, at: { char: 2, pt }, w: size, h: size, rot, style: 'bai', strokeW: 58,
    chars: [{ c: 0, box: [535, 75, 390, 850] }, { c: 1, box: [75, 75, 400, 405] }, { c: 2, box: [75, 520, 400, 405] }] }),
  // round 朱文 seal with 陳
  round: (pt, size) => ({ ...SEAL, at: { char: 2, pt }, w: size, h: size, rot: 0, style: 'zhu', shape: 'round', strokeW: 66, border: 50,
    chars: [{ c: 0, box: [225, 200, 550, 600] }] }),
};
const eachChar = (D, f) => D.chars.forEach((c, i) => f(c, i));
const noDry = D => eachChar(D, c => c.strokes.forEach(s => delete s.dry));
// end 洺's last stroke at the bottom of 口 instead of sweeping into the underline
function noFlourish(D) {
  const st = D.chars[2].strokes.find(s => s.pts.some(p => p[0] === 950 && p[1] === 828));
  const i = st.pts.findIndex(p => p[0] === 950 && p[1] === 828);
  st.pts = st.pts.slice(0, i + 1); st.pts[i][2] = 0.8; delete st.dry;
}
// link strokes with threads; list of [char, stroke, bulge]
const joinAll = (D, list) => list.forEach(([c, s, bulge]) => { D.chars[c].strokes[s].join = { bulge }; });
// bulges are tuned so most threads retrace inside an existing stroke, like a brush doubling back
const ONE_STROKE = [
  [0, 3, 0], [0, 4, -0.12],                        // 陳: vertical → 丿 → 捺 (both threads hidden inside strokes)
  [1, 0, -0.11],                                     // 陳 → 偉 (climbs back up inside 亻's 丿)
  [1, 2, 0.18], [1, 3, 0.18], [1, 4, -0.25],        // 偉: 韋 top → 口 → lower part → long vertical
  [2, 3, -0.2], [2, 5, 0.2],                         // 洺: 提 → 夕, dot → 口 + flourish (氵's three strokes stay separate)
];

// ---------- variants ----------
const variants = [];
const add = (id, name, note, make, opts = {}) => { const D = clone(base); make(D); variants.push({ id, name, note, design: D, ...opts }); };

add('classic', '行草 Classic', 'Running-cursive brush strokes, sweeping underline, 白文 陳 seal. The current chen-signature.svg.', () => {});

add('flowing', '一筆連寫 One-stroke', 'Strokes and characters linked by thin threads, as if written without lifting the brush. Stronger lean.', D => {
  joinAll(D, ONE_STROKE);
  eachChar(D, c => { c.t.skew = -14; c.t.rot = -5; });
  D.anim.charGap = 0;
});

add('vertical', '直式落款 Vertical', 'Stacked top to bottom like a painting inscription, with a 白文 陳 seal and a 朱文 偉洺 seal below.', D => {
  noFlourish(D);
  const needle = D.chars[1].strokes[4].pts; needle[2] = [638, 860, 0.7]; needle[3] = [642, 990, 0.04];
  D.chars[0].t = { s: 0.9, rot: 0, skew: -6, x: 0, y: 0 };
  D.chars[1].t = { s: 0.9, rot: 1, skew: -6, x: 50, y: 880 };
  D.chars[2].t = { s: 0.9, rot: -1, skew: -6, x: 60, y: 1750 };
  D.seals = [seal.chen([330, 1005], 230, -2), seal.weiMing([407, 1336], 150, 1)];
  D.displayScale = 0.26;
});

add('bold', '濃墨 Bold ink', 'Heavy, wet brush with more dry-brush texture and a three-character 陳偉洺 seal.', D => {
  D.brush = { ...D.brush, W: 108, minW: 7.5, K: 0.36, edge: [0.08, 0.02, 34, 10] };
  D.chars[0].strokes[2].dry = [0.68, 1, 5];
  D.chars[1].strokes[0].dry = [0.75, 1, 3];
  D.chars[2].strokes[3].dry = [0.62, 1, 4]; // 夕
  D.chars[1].t.x += 25; D.chars[2].t.x += 40;
  D.seals = [seal.full([1220, 800], 270)];
});

add('pen', '硬筆 Pen', 'Thin, fast fountain-pen style with the one-stroke links, steep slant and a small round seal.', D => {
  joinAll(D, ONE_STROKE);
  noDry(D);
  D.brush = { ...D.brush, W: 34, K: 0.15, minW: 3, opacity: 1, edge: [0.015, 0, 40, 10], entry: false, exit: false };
  eachChar(D, c => { c.t.skew = -20; c.t.rot = -6; });
  D.anim = { ...D.anim, speed: 9000, charGap: 0 };
  D.seals = [seal.round([1250, 900], 215)];
});

add('clean', '簡約 Clean', 'Calmer and more level, no underline or dry-brush, with a slim 朱文 偉洺 seal.', D => {
  noFlourish(D);
  noDry(D);
  D.brush = { ...D.brush, minW: 4.5 };
  eachChar(D, c => { c.t.rot = -1.5; c.t.skew = -6; });
  D.seals = [seal.weiMing([1080, 480], 125, 0)];
});

// ---------- creative variants ----------
add('enso', '圓相 Ensō', 'The name inside a single Zen brush circle, drawn last in one breath and trailing off in dry brush.', D => {
  noFlourish(D);
  noDry(D);
  const s = 0.6, k = s / 0.92;
  D.brush = { ...D.brush, W: 54, minW: 5 }; // finer brush for the smaller name
  D.chars.forEach(c => { c.t = { ...c.t, s, x: c.t.x * k, y: c.t.y * k }; });
  const cx = 790, cy = 330, R = 1000, pts = [];
  for (let a = 150; a <= 492; a += 12) { // clockwise from lower-left, leaving a small gap
    const r = a * Math.PI / 180, u = (a - 150) / 342;
    const rad = R * (1 + 0.03 * Math.sin(r * 2.3) + 0.015 * Math.sin(r * 5));
    const p = u < 0.08 ? 0.75 + u * 3 : u < 0.6 ? 1 - 0.15 * Math.sin(u * 9) : Math.max(0.06, 1 - (u - 0.6) * 2.3);
    pts.push([cx + Math.cos(r) * rad, cy + Math.sin(r) * rad * 0.97, +p.toFixed(3)]);
  }
  D.chars.push({ name: '圓', t: { s: 1, x: 0, y: 0 }, strokes: [{ pts, w: 2.5, dry: [0.5, 1, 10] }] });
  D.seals = [{ ...seal.chen([0, 0], 210, -4), at: { char: 3, pt: [cx + 830, cy + 690] } }];
  D.anim.charGap = 0.25;
});

const GOLD = [[0, '#9a6f24'], [0.16, '#f3d77e'], [0.3, '#b8862b'], [0.46, '#fbecb0'], [0.62, '#c09032'], [0.8, '#f1d27a'], [1, '#8f6620']];
add('gold', '泥金 Gold leaf', 'Gold ink on black with a bolder brush; a light sweeps across the letters once the signature is written.', D => {
  D.brush = { ...D.brush, W: 88, opacity: 1 };
  D.fx = {
    defs: ({ vb: [x, y, w, h], end, animate }) =>
      `<linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}">${GOLD.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>\n` +
      (animate ? `<linearGradient id="shine" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y}" x2="${x + w * 0.3}" y2="${y + h}" gradientTransform="translate(${-w} 0)">
  <stop offset="0" stop-color="#fffbe6" stop-opacity="0"/><stop offset=".5" stop-color="#fffbe6" stop-opacity=".95"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/>
  <animateTransform attributeName="gradientTransform" type="translate" from="${-w} 0" to="${w * 1.3} 0" begin="${(end + 0.3).toFixed(2)}s" dur="1.6s" fill="freeze"/>
</linearGradient>\n` : ''),
    inkFill: 'url(#gold)',
    overlay: ({ animate, hasDry }) => animate ? `<use href="#ink" fill="url(#shine)"${hasDry ? ' mask="url(#dry)"' : ''}/>` : '',
  };
}, { bg: '#141210' });

add('inkwash', '水墨 Ink wash', 'Wet ink soaking into rice paper: soft feathered edges and strokes in different ink densities.', D => {
  D.brush = { ...D.brush, opacity: 1, tones: [0.95, 0.72, 0.9, 0.62, 0.85, 0.78, 0.68] };
  D.fx = {
    defs: ({ region, ink }) => `<filter id="bleed" filterUnits="userSpaceOnUse" ${region} color-interpolation-filters="sRGB">
  <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="3" result="n"/>
  <feDisplacementMap in="d" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G" result="dd"/>
  <feGaussianBlur in="dd" stdDeviation="7" result="b"/>
  <feFlood flood-color="${ink}" flood-opacity="0.3"/>
  <feComposite in2="b" operator="in" result="halo"/>
  <feMerge><feMergeNode in="halo"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>\n`,
    inkFilter: 'url(#bleed)',
  };
});

add('vermilion', '朱砂 Vermilion', 'Cinnabar-red ink, the colour of imperial annotations, with the seal reversed to black.', D => {
  D.ink = { ...D.ink, dark: '#b3301f' };
  D.seals = [{ ...seal.chen([1200, 840], 240), color: '#1d1a17' }];
});

add('neon', '霓虹 Neon', 'One continuous line of light, like a long-exposure light painting, with a round neon seal.', D => {
  joinAll(D, ONE_STROKE);
  noDry(D);
  D.ink = { ...D.ink, dark: '#53eaff' };
  D.brush = { ...D.brush, W: 30, K: 0.12, minW: 4, opacity: 1, edge: [0, 0, 40, 10], entry: false, exit: false };
  D.anim = { ...D.anim, speed: 8000, charGap: 0 };
  D.seals = [{ ...seal.round([1250, 900], 215), color: '#ff5ccf', wearCut: 40, edge: 0 }];
  D.fx = {
    defs: ({ region }) => `<filter id="glow" filterUnits="userSpaceOnUse" ${region} color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceGraphic" stdDeviation="26" result="b2"/>
  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b1"/>
  <feColorMatrix in="SourceGraphic" type="matrix" values="0.35 0 0 0 0.65  0 0.35 0 0 0.65  0 0 0.35 0 0.65  0 0 0 1 0" result="core"/>
  <feMerge><feMergeNode in="b2"/><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="b1"/><feMergeNode in="core"/></feMerge>
</filter>\n`,
    inkFilter: 'url(#glow)',
  };
}, { bg: '#0d0f1c' });

add('stamp', '朱印 Stamp mark', 'The whole signature cut out of a red seal block, usable as a personal logo or chop.', D => {
  D.ink = { ...D.ink, dark: '#f6efe0' };
  D.brush = { ...D.brush, W: 90, opacity: 1 };
  D.seals = [];
  D.backdrop = { color: '#b5281f', pad: 90, rx: 40, wearFreq: 0.045, wearCut: 17.1, edge: 10 };
});

module.exports = variants;
