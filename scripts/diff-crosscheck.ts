/**
 * Cross-check the shipped Genesis text against a second public-domain copy
 * (plan §5): crizin/bible-db `data/kjv/kjv.jsonl`.
 *
 * Compares verse by verse after the same markup cleaning as extract-kjv and
 * reports every difference. Punctuation/italics differences are fixed by hand
 * in `src/data/kjv/genesis.json`; this script never writes to it.
 *
 * Run with: `bun scripts/diff-crosscheck.ts`
 */

const SRC = 'https://raw.githubusercontent.com/crizin/bible-db/main/data/kjv/kjv.jsonl';
const SHIPPED = new URL('../src/data/kjv/genesis.json', import.meta.url);

function cleanVerse(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('# ')) text = text.slice(2);
  if (text.startsWith('#')) text = text.slice(1).trimStart();
  text = text.replace(/\[([^\]]*)\]/g, '$1');
  return text.replace(/\s+/g, ' ').trim();
}

interface ShippedData {
  book: string;
  chapters: Record<string, Record<string, string>>;
}

const shipped = (await Bun.file(SHIPPED).json()) as ShippedData;

const res = await fetch(SRC);
if (!res.ok) throw new Error(`diff-crosscheck: fetch failed (${res.status} ${res.statusText})`);
const lines = (await res.text()).split('\n').filter((l) => l.trim().length > 0);

const other = new Map<string, string>();
for (const line of lines) {
  const row = JSON.parse(line) as { b?: string; c?: number; v?: number; t?: string };
  if (row.b !== 'Genesis' || row.c === undefined || row.v === undefined) continue;
  if (row.c < 1 || row.c > 11) continue;
  other.set(`Genesis ${row.c}:${row.v}`, cleanVerse(row.t ?? ''));
}

let missing = 0;
let diffs = 0;
let checked = 0;
for (const [ch, verses] of Object.entries(shipped.chapters)) {
  for (const [v, text] of Object.entries(verses)) {
    const ref = `Genesis ${ch}:${v}`;
    checked += 1;
    const alt = other.get(ref);
    if (alt === undefined) {
      missing += 1;
      console.log(`MISSING in second source: ${ref}`);
    } else if (alt !== text) {
      diffs += 1;
      console.log(`DIFF ${ref}\n  shipped: ${text}\n  second:  ${alt}`);
    }
  }
}
console.log(`diff-crosscheck: ${checked} verses, ${missing} missing, ${diffs} diffs`);
if (missing > 0) process.exit(1);
