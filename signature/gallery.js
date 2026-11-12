// Builds signature/variants/index.html: a side-by-side gallery of the variants with replay buttons.
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

module.exports = variants => `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>陳偉洺 signature variants</title>
<style>
  :root { --paper: #f4efe4; --card: #fbf8f1; --ink: #1d1a17; --muted: #7a7166; --line: #e3dccd; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 system-ui, "Noto Sans TC", sans-serif; }
  header { padding: 28px 24px 8px; max-width: 1400px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 12px; align-items: baseline; justify-content: space-between; }
  h1 { margin: 0; font-size: 22px; font-weight: 600; }
  header p { margin: 0; color: var(--muted); }
  main { max-width: 1400px; margin: 0 auto; padding: 16px 24px 48px; display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 560px), 1fr)); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; }
  .card.tall { grid-row: span 2; }
  .art { flex: 1; display: grid; place-items: center; padding: 24px; min-height: 260px; }
  .art img { max-width: 100%; max-height: 640px; height: auto; }
  .meta { border-top: 1px solid var(--line); padding: 12px 16px; display: flex; gap: 12px; align-items: flex-start; }
  .meta div { flex: 1; }
  .meta h2 { margin: 0 0 2px; font-size: 16px; font-weight: 600; }
  .meta code { color: var(--muted); font-size: 12px; }
  .meta p { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
  button { font: inherit; font-size: 13px; border: 1px solid var(--line); background: #fff; color: var(--ink); border-radius: 6px; padding: 5px 12px; cursor: pointer; }
  button:hover { border-color: var(--muted); }
</style>
</head>
<body>
<header>
  <h1>陳偉洺 signature variants</h1>
  <p>Each one draws itself when loaded. Press replay to watch again, or <button id="all">replay all</button></p>
</header>
<main>
${variants.map(v => `  <section class="card${v.id === 'vertical' ? ' tall' : ''}">
    <div class="art"><img src="${v.id}.svg" alt="${esc(v.name)} signature"></div>
    <div class="meta"><div><h2>${esc(v.name)}</h2><code>signature/variants/${v.id}.svg</code><p>${esc(v.note)}</p></div><button class="replay">replay</button></div>
  </section>`).join('\n')}
</main>
<script>
  const replay = img => { img.src = img.src.split('?')[0] + '?r=' + Date.now(); };
  document.querySelectorAll('.card').forEach(c => c.querySelector('.replay').addEventListener('click', () => replay(c.querySelector('img'))));
  document.getElementById('all').addEventListener('click', () => document.querySelectorAll('.art img').forEach(replay));
</script>
</body>
</html>
`;
