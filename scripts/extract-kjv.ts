/**
 * Extract Genesis 1–11 KJV text into `src/data/kjv/genesis.json` (plan §5).
 *
 * Source: farskipper/kjv `json/verses-1769.json` (public domain, archived).
 * Run once with: `bun scripts/extract-kjv.ts`
 *
 * Cleaning (verified by hand against the 1769 edition for Gen 1:1–2:3):
 * - leading `# ` paragraph marks are dropped
 * - `[...]` italics brackets are unwrapped (word kept, brackets removed)
 */

const SRC = 'https://raw.githubusercontent.com/farskipper/kjv/master/json/verses-1769.json';
const OUT = new URL('../src/data/kjv/genesis.json', import.meta.url);

function cleanVerse(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('# ')) text = text.slice(2);
  if (text.startsWith('#')) text = text.slice(1).trimStart();
  // Unwrap italics markup: "[was]" -> "was"
  text = text.replace(/\[([^\]]*)\]/g, '$1');
  return text.replace(/\s+/g, ' ').trim();
}

const res = await fetch(SRC);
if (!res.ok) throw new Error(`extract-kjv: fetch failed (${res.status} ${res.statusText})`);
const all = (await res.json()) as Record<string, string>;

const chapters: Record<string, Record<string, string>> = {};
for (let ch = 1; ch <= 11; ch += 1) {
  const verses: Record<string, string> = {};
  for (const [ref, text] of Object.entries(all)) {
    const m = /^Genesis (\d+):(\d+)$/.exec(ref);
    if (m === null) continue;
    const chRaw = m[1];
    const vRaw = m[2];
    if (chRaw === undefined || vRaw === undefined) continue;
    if (Number(chRaw) !== ch) continue;
    verses[vRaw] = cleanVerse(text);
  }
  const keys = Object.keys(verses).sort((a, b) => Number(a) - Number(b));
  if (keys.length === 0) throw new Error(`extract-kjv: no verses for Genesis ${ch}`);
  // Rebuild in verse order so the JSON reads naturally.
  const ordered: Record<string, string> = {};
  for (const k of keys) ordered[k] = verses[k] as string;
  chapters[String(ch)] = ordered;
}

const total = Object.values(chapters).reduce((n, c) => n + Object.keys(c).length, 0);
const out = { book: 'Genesis', chapters };
await Bun.write(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`extract-kjv: wrote Genesis 1-11 (${total} verses)`);
