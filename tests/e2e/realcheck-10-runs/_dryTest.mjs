import { buildScene } from './generators/_proseGen.mjs';

function lint(script, idx = 0) {
  const lines = script.split(/\r?\n/);
  let run = 0, maxRun = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const tooShort = /^[^。.!?]{1,4}—{1,2}\s*$/.test(t) || (/^[一-龥]{1,3}。?$/.test(t) && i + 1 < lines.length && /^[一-龥]{1,4}—/.test(lines[i + 1].trim()));
    if (tooShort) { run++; if (run > maxRun) maxRun = run; } else run = 0;
  }
  const emCount = (script.match(/——/g) || []).length;
  const emDensity = (emCount * 100) / script.length;
  const nonBlank = lines.map(l => l.trim()).filter(Boolean);
  const avgLen = nonBlank.reduce((s, l) => s + l.length, 0) / Math.max(nonBlank.length, 1);
  const chars = script.replace(/\s/g, '').length;
  return { chars, avgLen: avgLen.toFixed(1), maxRun, emDensity: emDensity.toFixed(1) };
}

const genres = ['shanhun', 'chongsheng1999', 'jiuchongshuang', 'nanmen'];
for (const g of genres) {
  console.log(`\n=== ${g} ===`);
  for (let i = 0; i < 3; i++) {
    const s = buildScene({
      idx: i, intExt: 'INT', location: '测试场地', time: '上午',
      A: '甲', B: '乙', C: i % 2 === 0 ? '丙' : null, genre: g,
    });
    const l = lint(s, i);
    console.log(`#${i} chars=${l.chars} avg=${l.avgLen} maxRun=${l.maxRun} em=${l.emDensity}`);
    if (i === 0) console.log('---sample---\n' + s + '\n---end---');
  }
}
