# Credits

Every asset the game ships is logged here **when it is added**: name, author,
URL, license, and what changed (plan §4.1). Anything marked "pending" is not
bundled yet.

## Text

| What | Source | License | Notes |
| --- | --- | --- | --- |
| KJV Genesis 1–11 (`src/data/kjv/genesis.json`) | [farskipper/kjv](https://github.com/farskipper/kjv) (archived, 1769 edition) | Public domain | Extracted with `bun run extract-kjv` (299 verses, paragraph/italics markup cleaned); spot-checked against the 1769 edition |
| Second KJV copy used only for cross-checking | [crizin/bible-db](https://github.com/crizin/bible-db) `data/kjv/kjv.jsonl` | Public domain | Consumed by `bun run diff-crosscheck`; never shipped |

## Fonts

| Font | Author | License | Source |
| --- | --- | --- | --- |
| EB Garamond (scripture) | Georg Duffner, Octavio Pardo | SIL Open Font License 1.1 | npm `@fontsource/eb-garamond`, self-hosted (no Google CDN) |
| Pixelify Sans (UI and labels) | Stefie Justprince | SIL Open Font License 1.1 | npm `@fontsource/pixelify-sans`, self-hosted |

## Maps

| What | Source | License | Notes |
| --- | --- | --- | --- |
| `public/assets/maps/{hub,eden,noah-plain,noah-deck}.tmj` | authored for this project | same as repository | minimal placeholder Tiled maps; scenes currently render procedurally, full Tiled art pass is future work |

## Art (tiles / sprites / UI)

Pending — candidate packs are listed in `plan.md` §4.2 and must pass the M0
style spike and a license check on each download page before purchase or use.

## Audio

Pending — sources and licenses in `plan.md` §4.6; log each track/sound here on
first use (music credit lines must follow each source's attribution wording).

## Tooling (development only, not shipped to players)

Phaser, Vite, Vitest, Playwright, ESLint, typescript-eslint, TypeScript — each
under its own license; see the corresponding package repository.
