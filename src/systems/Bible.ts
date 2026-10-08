/** @fileoverview Core Bible text lookup.
 *
 * Resolves verse IDs and ranges to KJV text from the extracted genesis.json
 * (full Genesis 1–11 shipped). Contracts:
 *  - single ref, range, and cross-chapter range all return joined KJV text
 *  - unknown / unshipped reference throws (never returns empty string)
 */

import kjv from '../data/kjv/genesis.json';

interface KjvData {
  book: string;
  chapters: Record<string, Record<string, string>>;
}

const kjvData = kjv as KjvData;

interface ParsedRef {
  chapter: number;
  verse: number;
  endChapter: number;
  endVerse: number;
}

const REF_PATTERN =
  /^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(?:(\d+):)?(\d+))?\s*$/;

function parseRef(ref: string): ParsedRef {
  const match = REF_PATTERN.exec(ref);
  if (match === null) {
    throw new Error(`Bible.lookup: unparsable reference "${ref}"`);
  }
  const bookRaw = match[1];
  const startChapterRaw = match[2];
  const startVerseRaw = match[3];
  const endChapterRaw = match[4];
  const endVerseRaw = match[5];
  if (bookRaw === undefined || bookRaw !== 'Genesis') {
    throw new Error(`Bible.lookup: unparsable reference "${ref}"`);
  }

  const chapter = Number(startChapterRaw);
  const verse = Number(startVerseRaw);
  const endChapter = endChapterRaw === undefined ? chapter : Number(endChapterRaw);
  const endVerse = endVerseRaw === undefined ? verse : Number(endVerseRaw);

  return { chapter, verse, endChapter, endVerse };
}

function chapterLength(chapter: number, ref: string): number {
  const chapterKey = String(chapter);
  const chapterEntry = kjvData.chapters[chapterKey as keyof typeof kjvData.chapters];
  if (chapterEntry === undefined) {
    throw new Error(`Bible.lookup: "${ref}" — chapter ${chapterKey} not shipped`);
  }
  return Object.keys(chapterEntry).length;
}

function verseText(chapter: number, verse: number, ref: string): string {
  const chapterKey = String(chapter);
  const chapterEntry = kjvData.chapters[chapterKey as keyof typeof kjvData.chapters];
  if (chapterEntry === undefined) {
    throw new Error(`Bible.lookup: "${ref}" — chapter ${chapterKey} not shipped`);
  }
  const verses = chapterEntry as Record<string, string>;
  const text = verses[verse];
  if (text === undefined) {
    throw new Error(`Bible.lookup: "${ref}" — verse ${chapter}:${verse} not shipped`);
  }
  return text;
}

export const Bible = {
  /** Resolve a verse ID (or range) to KJV text. Throws on unknown refs. */
  lookup(ref: string): string {
    const { chapter, verse, endChapter, endVerse } = parseRef(ref);
    if (chapter > endChapter || (chapter === endChapter && verse > endVerse)) {
      throw new Error(`Bible.lookup: reversed range "${ref}"`);
    }
    const parts: string[] = [];
    for (let c = chapter; c <= endChapter; c += 1) {
      const first = c === chapter ? verse : 1;
      const last = c === endChapter ? endVerse : chapterLength(c, ref);
      for (let v = first; v <= last; v += 1) {
        parts.push(verseText(c, v, ref));
      }
    }
    return parts.join(' ');
  },

  /** True when the reference can be resolved from shipped text. */
  has(ref: string): boolean {
    try {
      this.lookup(ref);
      return true;
    } catch {
      return false;
    }
  },
} as const;
