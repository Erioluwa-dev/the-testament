# Witness: Genesis 1–11, MVP build plan

You are an unseen traveler walking through the first chapters of scripture. Each scene ties KJV text to what you see, builds to one **witness moment**, and ends with a scroll page you keep.

**Success test:** first-time players finish all 3 scenes without help, and at least a few testers say they want the next chapter.

---

## 1. Decisions to make first

These affect everything downstream. I recommend an option for each, but none is locked until you agree.

| # | Decision | Recommendation | Why |
|---|----------|----------------|-----|
| D1 | Phaser 3 or Phaser 4 | **Phaser 4** (v4.1, stable since April 2026) | Phaser 3.90 is expected to be the last v3 release. A new project should start on the supported line. The main risk is plugin maturity, which D2 avoids. |
| D2 | rexUI or hand-built UI | **Hand-built** | The MVP needs four UI pieces: verse box, reference label, scroll screen, and hub door prompt. That's about 300 lines of code. rexUI's Phaser 4 port lives on a separate branch and is newer. Add it later only if menus grow. |
| D3 | Art family, which sets the tile and sprite scale | **16×16 pixel family**, confirmed by a one-day style spike (see §4) | Mixing 16px, 32px and LPC 64px sprites is the biggest visual risk. The 16px family has the best animal coverage for Noah. |
| D4 | How the "unseen" player is shown | **A soft light mote** with a faint glow trail. No body. | It matches "unseen traveler", avoids needing a robed player sprite, and lets animals in the Noah scene follow something. |
| D5 | Orientation | **Landscape only.** Show a "rotate your device" overlay in portrait. | One layout to tune. Phaser `Scale.FIT` handles the rest. |
| D6 | How to depict Adam and Eve | **Distant silhouettes** or offscreen, with the text carrying it | Keeps it modest and avoids needing custom character art. |

---

## 2. Tech stack

| Purpose | Choice | Notes |
|---|---|---|
| Engine | Phaser 4 (`phaser`) | Arcade physics for movement and collision |
| Language/build | TypeScript (strict) + Vite, packages via **bun** | `noUncheckedIndexedAccess`, no `any` |
| Maps | Tiled `.tmj` (JSON) loaded with `this.load.tilemapTiledJSON` | Object layers carry triggers and spawn points |
| UI | Hand-built Phaser containers in a dedicated `UIScene` | Rendered at native resolution so verse text stays crisp over pixel art |
| Audio | Phaser built-in (WebAudio) | Unlock on first tap. Add Howler only if needed. |
| Scene data | One JSON file per scene, validated at load by a hand-written type guard | Fails loudly in dev if data is malformed |
| Bible text | Genesis 1–11 only, extracted once into `src/data/kjv/genesis.json` | See §5 |
| Saving | `localStorage`, versioned key, wrapped in try/catch | See §7 |
| Fonts | Self-hosted via `@fontsource/*` (not the Google CDN) | Works offline and inside Capacitor later |
| Tests | Vitest (logic), Playwright (smoke, Chromium) | |
| Lint | ESLint + typescript-eslint, `tsc --noEmit` | |
| Mobile later | Capacitor | Not in MVP |

Runtime dependencies are **`phaser`** plus two font packages. Everything else is a dev dependency.

---

## 3. Game design

### 3.1 Core loop (every scene)

1. **Arrive.** Fade in, ambient loop starts, and the first verse types out with its reference label (e.g. `Genesis 1:1`).
2. **Walk and discover.** The light mote moves by tap-to-move or WASD/arrow keys. Glowing markers show the next point of interest. Each trigger types its verse(s).
3. **Signature interaction.** The scene's one mechanic (below).
4. **Witness moment.** Input locks, the camera holds, a key verse plays with music swell and visual payoff.
5. **Scroll page.** A parchment screen shows the collected page (key verse + small illustration), and the scene is saved as complete.
6. **Return to the Hall.**

Verse boxes advance on tap or Space. A second tap while typing completes the line instantly. No text auto-advances during interactions.

### 3.2 Hub: The Timeline Hall

- A short corridor with doors laid out left to right: **Creation → Eden → Noah**, then locked doors labelled *Coming soon* (Babel, Abraham…).
- Doors unlock in order, so the onboarding happens in scene 1.
- A scroll shelf shows collected pages (0/3 → 3/3). Tapping a page re-reads it.
- After 3/3, a closing line plays, followed by a soft prompt: "More chapters are coming." This is where to ask testers the "want the next chapter?" question.

### 3.3 Scene 1: Creation (Genesis 1:1–2:3)

**Signature interaction: tap to speak each day into being.**

- Starts as a dark void with water shimmer (1:2). No tilemap is needed here. It's built from Phaser Graphics, particles and a few sprites, which also removes art dependencies from the first scene.
- Each day: a pulsing glyph appears, the player taps it, the verse types, and the world changes:
  1. Light breaks over the void (1:3–5)
  2. The firmament splits the waters (1:6–8)
  3. Land rises and plants sprout (1:9–13)
  4. Sun, moon and stars (1:14–19)
  5. Fish and birds (1:20–23)
  6. Animals, then man (shown as light or silhouette) (1:24–31)
  7. Stillness. The tap is *withheld*: the player waits, and rest settles (2:1–3)
- **Witness moment:** day 7. The player does nothing and the world rests. "And God blessed the seventh day, and sanctified it" (2:3).
- **Length:** 3–4 minutes. This scene doubles as the tutorial for tapping and advancing text.

### 3.4 Scene 2: Eden (Genesis 2:8–3:24, trimmed)

**Signature interaction: follow a path and discover the tree.**

- A small tilemap garden: a river that splits into four heads (2:10), fruit trees, animals at rest.
- The player follows a winding path. Waypoints trigger verses about the garden, the rivers and the naming of the animals.
- The path opens into a clearing with **the tree of the knowledge of good and evil** at its centre (2:9, 2:17).
- **Witness moment:** the commandment (2:16–17) plays, and then the scene shifts: light dims, the serpent's line, and the sequence moves through 3:6–8 using text over silhouettes. It ends at 3:23–24 with the cherubim and the flaming sword sealing the path behind the player.
- **Scope note:** Eden is the most theologically sensitive scene. Keep the depiction minimal and let the text carry it.
- **Length:** 4–5 minutes. This scene teaches walking.

### 3.5 Scene 3: Noah's Ark (Genesis 6:5–9:17), the showpiece

**Signature interaction: lead animals to the ark, then wait out the flood.**

**Part A: Gathering (6:13–7:9)**
- A wide plain with a finished ark and its ramp. Noah and his family stand as NPCs who speak their verses.
- Animal pairs wander the map. When the light mote comes near, a pair begins to follow it (simple steering: follow at an offset with a small delay, two animals per group). Lead a pair up the ramp to board it.
- A target of 6–8 pairs keeps it short. A counter shows `Pairs: 3/8`. Mix easy pairs near the ark with a couple farther away.
- Each boarding plays a short creature sound and a verse fragment ("two and two… of every sort", 6:19–20, 7:8–9).

**Part B: The flood (7:10–8:14)**
- "And the LORD shut him in" (7:16): the door closes and the camera moves inside or onto the ark deck.
- Rain particles, thunder, and the water layer rises over the landscape. A day counter runs (Day 1… 40… 150), sped up.
- **Waiting is the interaction.** Input is minimal: the player can drift around the deck while the verses come slowly. This should feel deliberate, not like a loading screen (about 60–90 seconds).
- Waters recede. Release the **raven**, then the **dove** three times (8:6–12) by tapping the window. The dove returns with an olive leaf, then doesn't return.

**Witness moment:** they leave the ark and the rainbow appears (9:13–16), with the music resolving.
- **Length:** 6–8 minutes.

### 3.6 Scroll pages

One page per scene (3 in total). Each page holds a key verse, its reference, and a small illustration:
- Creation: Genesis 1:31, "And God saw every thing that he had made, and, behold, it was very good."
- Eden: Genesis 2:9 or 3:24
- Noah: Genesis 9:13, "I do set my bow in the cloud…"

Hidden bonus pages are a stretch goal, not MVP.

---

## 4. Art and audio assets

### 4.1 How to choose

- **One pixel scale across the whole game.** The 16×16 family is the primary path. The LPC (32px tiles, 64px characters) family is the fallback.
- Prefer **CC0**, then CC-BY. Avoid "free for non-commercial only" packs unless you buy the commercial tier.
- **Day-1 style spike:** download the candidates, then build one test room in Tiled with grass, water, a tree, two animals, an NPC and the verse box. Look at it on a phone before buying anything.
- Log every asset in `CREDITS.md` **when you add it**: name, author, URL, license, and what changed.

> ⚠️ I found these packs through search results. My tools couldn't open itch.io or OpenGameArt pages directly, so **confirm each license on its download page before use**. Search results also don't confirm visual fit; the style spike does.

### 4.2 Primary candidates (16×16 family)

| Need | Pack | License (per search) | Covers |
|---|---|---|---|
| Base tiles, NPCs, some animals, music, SFX | [Ninja Adventure Asset Pack (pixel-boy)](https://pixel-boy.itch.io/ninja-adventure-asset-pack) | CC0 | Grass, water, trees, character variants, animals, music tracks. Skip the Japanese-style buildings. Genesis 1–11 barely needs architecture. |
| Noah animals (wild) | [Top-Down RPG Sprite Pack: Wild Animals (VectoRaith)](https://vectoraith.itch.io/wild-animals-top-down-sprite-pack) | Paid ($6 on sale, $10 regular). Commercial use allowed, no redistribution. | Lions, elephants, giraffes, camels, animated top-down, designed for 16px games. **The most valuable purchase for the showpiece.** |
| Noah animals (farm) | [Top-Down RPG Sprite Pack: Farm & Cute Animals (VectoRaith)](https://vectoraith.itch.io/top-down-rpg-sprite-pack-farm-and-cute-animals) | Paid. Check terms. | Sheep, cattle, and other domestic animals in the same style as the wild pack |
| Extra animals, filler | [Kenney Tiny Creatures](https://opengameart.org/content/tiny-creatures) (also on kenney.nl) | CC0 | 50+ animals at 16×16. Has a thick-outline style, so check how it sits next to VectoRaith. |
| Garden extras (Eden) | [Sprout Lands (Cup Nooble)](https://cupnooble.itch.io/sprout-lands-ui-pack) | **Free tier is non-commercial only.** Premium ($3.99+) allows commercial use. | Fruit trees, flowers, bushes. Use only with the premium tier. |
| Small garden pack | [16x16 Tiny Garden Free Pack (kathychow)](https://kathychow.itch.io/16x16-tiny-garden-free-pack) | Check on the page | Possible Eden filler |

### 4.3 Fallback: LPC family (32px tiles, 64px characters)

Choose this if the 16px spike looks too "cute" for the tone. LPC suits robed figures better, but the attribution bookkeeping is heavier (CC-BY-SA / GPL per piece).

- [Universal LPC Spritesheet Character Generator](https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator) for robed Noah and family. It exports a credits list.
- [LPC style farm animals (daneeklu)](https://opengameart.org/content/lpc-style-farm-animals): CC-BY 3.0 / GPL 2.0
- [LPC horse](https://opengameart.org/content/lpc-horse); [LPC bears, deer, lions and more (tapatilorenzo)](https://opengameart.org/node/137562)
- LPC has no camels, elephants or giraffes. Noah would be limited to farm and forest animals.

### 4.4 Desert and ancient set (post-MVP: Babel, Abraham)

Genesis 1–11 MVP scenes don't need desert. Bookmark these for later chapters:
- [Lucifer Desert Tileset (Foozle)](https://foozlecc.itch.io/lucifer-desert-tileset): CC0, 32×32 top-down
- [Free Pixel Art Ancient Egypt Tileset (jik-a-4)](https://jik-a-4.itch.io/free-pixel-art-ancient-egypt-tileset): CC0
- [Desert Oasis Tile Set (The Clover Patch)](https://cuddlyclover.itch.io/desert-oasis): 16×16, free or donation. Check the license.
- [PixelWorlds Desert Tileset (GrayCatGames)](https://graycatgames.itch.io/desert-tileset): 16×16, free, commercial use allowed

### 4.5 Custom art (unavoidable)

- **The ark.** No pack will have a correctly proportioned ark. Build it from wood or plank tiles in Tiled, or draw or commission one exterior and one deck sprite.
- **Scroll page parchment and the 3 page illustrations.**
- **The rainbow, light rays, and the void-and-waters effects** for Creation. Make these in code with Graphics, particles and tint, not art files.
- **The cherubim and flaming sword.** Use a silhouette plus a particle flame.

### 4.6 Audio

| Need | Source | License |
|---|---|---|
| Music loops (one per scene + hub) | [Kevin MacLeod / incompetech](https://incompetech.com) | CC BY 4.0. Credit as `"Title" Kevin MacLeod (incompetech.com), Licensed under CC BY 4.0`. |
| Middle-eastern flavour | ["Night in the desert" remix](https://opengameart.org/content/night-in-the-desert-remixed-tausdei-vs-hitctrl) (CC-BY 3.0); "Arabesque" on OpenGameArt (CC-BY 3.0 / GPL 3.0) | CC-BY |
| Ambient CC0 option | ["Cathedral in the forest" ambient loop](https://opengameart.org/content/cathedral-in-the-forest-ambient-loop): check the license | Check on the page |
| UI and interaction SFX | Kenney audio packs on [kenney.nl](https://kenney.nl): Interface Sounds, RPG Audio | CC0 |
| Rain, thunder, water, wind, dove wings, animal calls | [Freesound](https://freesound.org). Filter by **CC0**. | Per sound. Log each one. |
| Backup for weather SFX | Mixkit storm, rain and ocean sets | Mixkit's own license, not CC. Read it before using. |

Suggested scene moods: Creation (sparse, swelling strings or pads), Eden (light, pastoral), Noah (warm during gathering, tense storm during the flood, resolving at the rainbow).

### 4.7 Fonts (OFL, Google Fonts, self-hosted via `@fontsource`)

- **Scripture:** EB Garamond. Cormorant Garamond is the alternative. IM Fell French Canon has more of an antique feel but is less readable on phones.
- **UI and labels:** Pixelify Sans.
- Render verse text in `UIScene` at native resolution, not inside the zoomed pixel camera, or it will blur.

---

## 5. Bible text pipeline

1. Source: [farskipper/kjv](https://github.com/farskipper/kjv). It's public domain and archived (read-only since Feb 2025), which is fine for a one-time extraction.
2. Cross-check against a second source, [crizin/bible-db](https://github.com/crizin/bible-db) or the [kjvstudy.org data](https://git.kennethreitz.org/kennethreitz/kjvstudy.org/src/branch/main/kjvstudy_org/data), with a script that diffs Genesis 1–11 verse by verse. Fix differences in punctuation and italics markup by hand.
3. Write `scripts/extract-kjv.ts` (run with `bun`) to output `src/data/kjv/genesis.json`:
   ```json
   { "book": "Genesis", "chapters": { "1": { "1": "In the beginning God created the heaven and the earth." } } }
   ```
4. Scene JSON references verses by ID (`"Genesis 1:3"` or a range `"Genesis 1:3-5"`). Text is never copied into scene files. A unit test asserts that every referenced verse exists.
5. Ship only Genesis 1–11 (about 300 verses, roughly 50 KB), not the whole Bible.

---

## 6. Architecture

```
the-testament/
├─ index.html
├─ package.json  bun.lock  tsconfig.json  vite.config.ts  eslint.config.js
├─ CREDITS.md
├─ public/assets/
│  ├─ tiles/  sprites/  audio/music/  audio/sfx/  ui/
│  └─ maps/   hub.tmj  eden.tmj  noah-plain.tmj  noah-deck.tmj
├─ scripts/extract-kjv.ts
├─ src/
│  ├─ main.ts                 # Phaser.Game config (pixelArt, Scale.FIT, arcade)
│  ├─ scenes/
│  │  ├─ BootScene.ts         # fonts, save load, audio unlock
│  │  ├─ PreloadScene.ts      # per-scene asset packs + progress bar
│  │  ├─ HubScene.ts
│  │  ├─ CreationScene.ts
│  │  ├─ EdenScene.ts
│  │  ├─ NoahScene.ts         # Part A gathering + Part B flood (sub-states)
│  │  ├─ ScrollScene.ts       # end-of-scene page reveal
│  │  └─ UIScene.ts           # verse box, labels, prompts; runs on top
│  ├─ systems/
│  │  ├─ VerseBox.ts          # typewriter, skip, queue, reference label
│  │  ├─ Player.ts            # light mote, tap-to-move + keys
│  │  ├─ Triggers.ts          # Tiled object layer → zones → events
│  │  ├─ Follower.ts          # Noah animal steering
│  │  ├─ Save.ts              # localStorage, versioned
│  │  ├─ Audio.ts             # music crossfade, sfx, mute
│  │  └─ Bible.ts             # verse/range lookup
│  ├─ data/
│  │  ├─ kjv/genesis.json
│  │  └─ scenes/ creation.json  eden.json  noah.json
│  └─ types/ sceneData.ts     # SceneData types + isSceneData() guard
└─ tests/
   ├─ unit/   (vitest)
   └─ e2e/    (playwright smoke)
```

### Scene data format (sketch)

```json
{
  "id": "noah",
  "title": "The Flood",
  "music": "noah-gather",
  "map": "noah-plain",
  "intro": ["Genesis 6:5", "Genesis 6:8"],
  "triggers": [
    { "id": "ark-ramp", "zone": "ark_ramp", "verses": ["Genesis 7:1"], "once": true },
    { "id": "family",   "npc": "noah",      "verses": ["Genesis 6:13-14"] }
  ],
  "interaction": { "type": "gatherPairs", "pairs": ["lion","elephant","sheep","camel","dove","giraffe"], "target": "ark_ramp" },
  "witness": { "verses": ["Genesis 9:13"], "effect": "rainbow", "music": "noah-resolve" },
  "scrollPage": { "id": "page-noah", "verse": "Genesis 9:13", "image": "page-noah" }
}
```

`interaction.type` is a discriminated union (`speakDays | followPath | gatherPairs`). Each scene class handles its own type. The shared systems (verse box, triggers, save, audio) handle everything else.

### Movement

- Tap or click a spot and the mote glides there. Hold to keep steering. WASD and arrow keys also work.
- Collision comes from a Tiled `collision` property and Arcade physics, with sliding along walls.
- Maps are small and open, so the MVP doesn't need pathfinding. Add `easystarjs` only if testers get stuck on obstacles.

### Mobile

- `Scale.FIT`, `pixelArt: true`, integer zoom where possible. Test on a small phone (360×640 logical).
- Touch targets are at least 44 px in UI space. Unlock audio on the first tap (handled in the title or "tap to begin" screen).
- Show the rotate overlay in portrait.

---

## 7. Save system

```ts
// key: "witness.save.v1"
interface SaveV1 {
  version: 1;
  completedScenes: SceneId[];   // unlocks next door
  pages: PageId[];              // collected scroll pages
  settings: { musicVolume: number; sfxVolume: number; textSpeed: "slow" | "normal" | "fast" };
}
```

- Every read and write is wrapped in try/catch. Private browsing or blocked storage falls back to an in-memory save with a one-time notice. It never crashes.
- Parse with a type guard. On corrupt data, start fresh and log a warning (no silent catch).
- Saves happen at scene completion, not mid-scene. Each scene is short enough that a mid-scene save isn't needed.
- Hub settings include "Reset progress", with a confirmation step.

---

## 8. Milestones

Estimates assume one developer working part-time. Adjust to your pace.

| # | Milestone | Deliverable | Est. |
|---|---|---|---|
| M0 | **Setup + style spike** | Vite + TS strict + Phaser 4 + ESLint + Vitest + Playwright; CI workflow; one Tiled test room using the candidate packs, viewed on a phone; D1–D6 confirmed | 2–3 days |
| M1 | **Core systems** | Light-mote movement (tap + keys), Tiled loading + triggers, VerseBox typewriter + reference labels, KJV extraction + `Bible.ts`, Save, Audio manager | 1 week |
| M2 | **Hub** | Timeline Hall, door unlock order, *Coming soon* doors, scroll shelf, settings | 2–3 days |
| M3 | **Creation** | 7-day sequence, procedural effects, day-7 witness, scroll page. **First playtest (2–3 people).** | 1 week |
| M4 | **Eden** | Garden map, path waypoints, tree clearing, expulsion sequence, scroll page | 1 week |
| M5 | **Noah** | Gathering with follower AI, boarding, door shut, flood + water rise, raven/dove, rainbow, scroll page | 1.5–2 weeks |
| M6 | **Polish** | Music and SFX pass, transitions, mobile tuning, loading, `CREDITS.md` complete, credits screen | 1 week |
| M7 | **Playtest round** | 5–8 first-time testers (see §10), fix the top issues, deploy | 1 week |

**Total: about 7–9 weeks part-time.** Noah is the riskiest and most important scene, so if time is short, cut Eden content before cutting Noah.

---

## 9. Quality gates

Run on every change (locally and in CI):
- `bun run typecheck` (`tsc --noEmit`)
- `bun run lint`
- `bun run test`: Vitest
  - `Bible.ts`: single verse, range, cross-chapter range, unknown ref throws
  - Every verse referenced in every scene JSON exists
  - Every scene JSON passes `isSceneData`
  - `Save.ts`: round-trip, corrupt data, storage throws, version mismatch
  - VerseBox pacing logic (pure function: text + elapsed → visible chars)
  - Follower steering math
- `bun run test:e2e`: Playwright smoke test. The game boots, the hub renders, and entering Creation shows the `Genesis 1:1` label. Runs on desktop and in a mobile viewport.
- `bun run build` succeeds.

CI: GitHub Actions running the steps above on push and PR. Deploy to GitHub Pages, itch.io (HTML5 upload), or Netlify for tester links.

---

## 10. Playtest protocol (the success test)

- **Testers:** 5–8 people who haven't seen the game. Include at least 2 on phones.
- **Rules:** give them only the link and say "play until it ends." Don't help. Watch in person or by screen share.
- **Record per tester:** finished each scene (Y/N), where they hesitated more than 10 seconds, time per scene, whether they needed help.
- **Ask afterwards:**
  1. "Would you want to play the next chapter?" (yes / maybe / no)
  2. "Which moment stuck with you?"
  3. "Where were you confused?"
- **Pass:** at least 80% finish all three scenes unaided, and at least 3 say "yes" to Q1.
- An unaided failure is a design bug. Fix the cue (marker, verse prompt, camera nudge), not the player.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Asset styles don't match | Style spike in M0 before any purchase. Stick to one pixel scale. |
| No good ark sprite | Plan custom art from the start (§4.5) |
| Noah's follower AI feels fiddly | Generous follow radius, animals can't get stuck (teleport back to spawn if idle and far away), keep the pair count small |
| The flood wait feels like dead time | Keep it under 90 seconds, give the player gentle things to do (drift, watch the counter), and pace verses well |
| Verse text blurs or is too small on phones | UI at native resolution, minimum 16 px body text, test on a real phone in M1 |
| License problems | `CREDITS.md` from day 1, no non-commercial-only assets, verify every license on its source page |
| Phaser 4 ecosystem gaps | Hand-built UI (D2). Phaser 3.90 is a fallback if blocked, and the API is similar enough to switch during M0. |
| Theological or depiction concerns (Eden, God's voice) | Text carries divine speech. No depiction of God. Adam and Eve as silhouettes. Have a pastor or theology-minded tester review Eden. |

---

## 12. Out of scope for the MVP

Combat, accounts, multiplayer, translation toggle, monetization, Capacitor builds, chapters past Genesis 11, hidden bonus pages, mid-scene saves, pathfinding, localization.
