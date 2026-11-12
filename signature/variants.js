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
const add = (id, name, note, make) => { const D = clone(base); make(D); variants.push({ id, name, note, design: D }); };

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

module.exports = variants;
