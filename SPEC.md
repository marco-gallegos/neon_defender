# SPEC — Neon Defender (current implementation)

**Doc type:** Software Design Description / Specification
**Status:** ✅ **Matches the working tree as of the review date.**
**Last reviewed:** 2026-10-19 · **source commit:** `f420be4` + uncommitted equipment WIP (Phases 1–3)
**Scope:** describes behaviour present in the current **working-tree source**.

> This is the authoritative description of the game as it exists in the working tree. If
> this file and the code disagree, the code wins — update this file. For the *target*
> product (fusion/store UI, crystal pacing), see `PRD.md`.
>
> **Commit note:** the committed tip `f420be4` already contains the 10-sector campaign,
> 7 ships w/ distinct shapes, 3-phase/10-archetype bosses, seeker nerf, and changelog
> tooling. The **Equipment system + crystals + 70% shard cut + Arsenal screen** (§9) live
> in the **uncommitted working tree** and will land in a follow-up commit.

---

## 1. Architecture

| Module | Responsibility |
|--------|----------------|
| `src/main.js` | `Game` class: loop, state machine, collision, loot, run banking |
| `src/engine/Storage.js` | LocalStorage persistence + strict sanitisation |
| `src/engine/Renderer.js` | Canvas sizing, background, ship drawing, shake |
| `src/engine/Input.js` | Pointer/keyboard input, bullet-time interaction flag |
| `src/engine/Audio.js` | Procedural Web Audio SFX + chiptune |
| `src/entities/Player.js` | Ship stats, weapons, drones, power-ups |
| `src/entities/Enemy.js` | 13 enemy archetypes, movement, attacks, drops |
| `src/entities/Boss.js` | 5 boss archetypes, phases, attacks, summons |
| `src/entities/Bullet.js` | Player/enemy projectile types + rendering |
| `src/entities/Powerup.js` | Shard and power-up collectibles |
| `src/entities/Particle.js` | Particles + floating text |
| `src/systems/UpgradeSystem.js` | `SHIPS`, `UPGRADES`, `SECTORS`, `PRIMARY_WEAPONS`, `SECONDARY_WEAPONS` |
| `src/systems/WaveManager.js` | Wave generation, difficulty scaling, boss instantiation |
| `src/ui/UI.js` | Screen routing, shop/hangar rendering, HUD updates |
| `index.html` / `src/style.css` | DOM overlay screens + styling |

**Stack:** vanilla ES modules + Vite. No framework, no runtime deps.
**Build:** `npm run build` → `dist/`; deployed to GitHub Pages on push to `master`.

## 2. Game states
`MENU`, `CAMPAIGN`/`ARENA`/`TRAINING` selection, `PLAYING`, `PAUSED`, `GAMEOVER`, `VICTORY`.
Screens are DOM overlays toggled by `UIManager.showScreen()`.

## 3. Campaign (implemented: **10 sectors**)

| # | Sector | Waves | Boss | Boss HP | Threat |
|---|--------|:-----:|------|--------:|:------:|
| 1 | NEON OUTPOST | 8 | CUBIC GUARDIAN | 1,200 | 1 |
| 2 | CYBER ASTEROIDS | 10 | PRISM PULSAR | 2,800 | 1 |
| 3 | VORTEX CORE | 12 | HEXA TYRANT | 5,200 | 2 |
| 4 | HYPERION LABS | 14 | OCTAGON OVERLORD | 8,800 | 2 |
| 5 | OMEGA SINGULARITY | 16 | CHRONOS PRIME | 14,000 | 3 |
| 6 | INFERNO CITADEL | 18 | DIABLO OVERLORD | 21,000 | 3 |
| 7 | ABYSS GATE | 20 | VOID LEVIATHAN | 31,000 | 4 |
| 8 | BLOOD MOON | 22 | CRIMSON REAPER | 46,000 | 4 |
| 9 | MACHINE EMPIRE | 24 | OMEGA TITAN | 68,000 | 5 |
| 10 | HELLFIRE CORE | 26 | DEMON KING SATAN | 95,000 | 5 |

Clear bonuses: 300 / 450 / 700 / 1,050 / 1,600 / 2,300 / 3,200 / 4,300 / 5,800 / 8,000 shards.
Star rating on clear: `>80% HP = 3★`, `>40% = 2★`, else `1★`.

## 4. Bosses (implemented: **10 archetypes, 3 phases**)
Archetypes: `guardian`, `prism`, `hex`, `octagon`, `chronos`, `devil`, `leviathan`,
`reaper`, `titan`, `demon_king`.
- **3 phases** (`this.phaseCount = 3`), with transition invulnerability.
- `performAttack` / `performSpecial` / `performSummon` helpers; minions spawn into the
  `enemies` array.
- Arena bosses cycle the 10 types; wave 50 example → `demon_king`, HP ≈ 42,900.

## 5. Ships (implemented: **7**, each with a unique projectile + passive)

| Ship | Cost | Bullet shape | Passive |
|------|-----:|--------------|---------|
| ALPHA DART | 0 (only starting ship) | `dart` | `nimble` |
| CYBER CUBE | 400 | `cube` | `bulwark` |
| NEON PHOENIX | 1,200 | `phoenix` | `emberfire` |
| VOID SLICER | 2,500 | `slicer` | `voidrounds` |
| DRACULA'S WING | 1,500 | `fang` | `lifesteal` |
| BATI PLANE | 1,800 | `bat` | `batshield` |
| HALLOWEEN REAPER | 2,200 | `scythe` | `soulharvest` |

- Each ship fires a **visually distinct** projectile (`bulletShape` → `Bullet.js`).
- Start state: only `alpha_dart` is unlocked (`Storage.DEFAULT_DATA.unlockedShips = ['alpha_dart']`).
  All seven ids are now **defined** in `SHIPS` (the earlier undefined-ship inconsistency is resolved).

## 6. Weapons

### 6.1 Primary (`PRIMARY_WEAPONS`) — all unlocked from the start
`plasma` (PULSE CANNON), `laser` (PHOTON LANCE, pierce), `spread` (SPREAD VULCAN),
`wave` (WAVE PULSAR). Weapon level 1–5 gained in-run via the SPREAD power-up.

### 6.2 Secondary (`SECONDARY_WEAPONS`) — must be bought, max level 5
`seeker` (the **only** one unlocked at start), `railgun` (150), `cluster` (250), `vortex` (450).

**Seeker stats:** `damage = 20 + 12·(lvl−1)`,
`count = 3 (+2 at lvl 3, +2 at lvl 5)`, `cooldown = max(2.24, 3.6 − 0.34·(lvl−1))`.

## 7. Upgrades (`UPGRADES`) — permanent, shard-priced

| Upgrade | Max level | Notes |
|---------|:---------:|-------|
| damage | 10 | 10 → 37 base damage |
| fireRate | 10 | 0.22 s → 0.09 s interval |
| hull | 10 | 100 → 280 HP |
| shield | 10 | 40 → 175 shield, 4 → 22 regen/s |
| magnet | 8 | 60 → 305 px |
| crit | 8 | 5% → 33% chance, 1.5 → 2.55× |
| drones | 4 | 0 → 4 orbital drones |
| emp | 5 | 28 s → 14 s cooldown |

## 8. Economy (working tree)
- **Currencies:** **shards** (kill/clear rewards) + **Nano Crystals** (equipment upgrades/fusion).
- **Starting shards:** **0** — nothing is handed out; everything is earned.
- **Loot multiplier:** `waveMultiplier × shipShardBonus × luckMult × 0.3` — the **70% shard
  drop cut** (`SHARD_DROP_SCALE = 0.3`) is **applied and permanent** (`main.js getLootMultiplier`).
- **Crystals:** small enemy drops (~6% base, luck-scaled) and larger guaranteed boss drops
  (`8 + 30·progress`). Spent on tier-up fusion and the premium store.
- Endless Arena remains the farming mode, now also the crystal farm.
- Stars, sector clear bonuses, and arena best-wave/score are persisted.

## 8b. Endless Arena checkpoints & soundtracks (working tree)
- **Checkpoints:** every `ARENA_CHECKPOINT_INTERVAL = 5` waves cleared unlocks a resume point
  (`arenaStats.checkpoint`, highest cleared multiple of 5). On game over, `handleGameOver`
  computes `floor(wave / 5) * 5` and raises the stored checkpoint if higher.
- **Resume keeps your upgrades:** the only cumulative in-run upgrade is the **weapon level**
  (SPREAD capsules, 1–5). When a *new* checkpoint is unlocked, `handleGameOver` banks the
  player's current `weaponLevel` into `arenaStats.weaponLevel` (clamped 1–5). Resuming a
  checkpoint (`startRun('ARENA', 1, wave)` with `wave > 1`) restores that level onto the new
  `Player`, so a wave-40 resume no longer starts back at weapon level 1. Temporary pickups
  (overdrive, shield restore, EMP, hull repair) still reset each run. The arena checkpoint
  screen shows the banked level on the top card (`weapon Lv4`).
- **Resume:** the main menu's **ARENA** button opens `screen-arena`
  (`renderArenaCheckpoints()`), listing **WAVE 1** plus every unlocked multiple of 5, and a locked
  preview of the next one. Selecting one calls `startRun('ARENA', 1, wave)`, which flows into
  `WaveManager(..., startWave)` and spawns that wave directly (boss waves included).
- **Soundtracks:** each campaign sector maps to a stage theme via `SECTOR_TRACKS`. Clearing a
  sector unlocks its theme into `saveData.unlockedTracks` (announced on the victory screen).
- **Arena music rotation:** arena runs start on a random theme from the **unlocked** pool
  (`pickArenaTrack()`) and re-roll every `ARENA_MUSIC_INTERVAL = 5` waves
  (`maybeRotateArenaMusic()`); rotation defers while a boss owns the track.
- Starts with **only `stage_jungle`** unlocked; clearing sectors 3/6/8/10 progressively unlocks
  the rest.

## 8c. Training Range (`TRAINING` mode, working tree)
A no-stakes sandbox for inspecting build power. Entered from the main menu (**🎯 TEST RANGE**
→ `screen-training`), which previews the build before you commit to spawning anything.
- **Stat breakdown (`src/systems/StatBreakdown.js`):** a pure `computeStatBreakdown(saveData)`
  returns one card per stat, and **every card itemizes its sources** — base ship value, upgrade
  level, each equipped item **by name**, and drone contributions. Multiplicative stats also show
  the worked formula and a stacked source-bar. It re-derives the same pipeline as `Player` so the
  numbers match in-run values (locked by `stat_breakdown.mjs`).
- **The stage (`TRAINING` mode):** `WaveManager` constructs with no auto-spawning
  (`isWaveActive = false`), uses `menu` music, and `update()` returns `CONTINUE` immediately.
- **Practice targets:** `Game.spawnTrainingEnemy(typeKey)` / `spawnTrainingBoss(preset)` spawn
  targets that **hover in place and never fire back** (`Enemy.training`), so damage can be measured
  cleanly. `Game.clearTraining()` wipes targets and resets counters.
- **Two spawn UIs share one builder** (`UIManager.buildTrainingSpawnButtons()`):
  - **`screen-training` (menu):** a button per enemy type + the practice boss. Clicking one
    **enters the range and spawns that target immediately** (`spawnTrainingTarget()`), so no
    button is ever dead. The stat breakdown sits *below* the spawn list so the controls are
    reachable without scrolling past a dozen cards.
  - **`hud-training-panel` (in-run):** a collapsible panel anchored under the pause button,
    shown only while `waveManager.mode === 'TRAINING'` (toggled from `updateHud()`). It holds the
    same buttons plus **🧹 CLEAR**, which wipes the live targets.
- **DPS readout:** the HUD shows `TRAINING RANGE` with a live `DPS` (damage dealt ÷ elapsed) and
  target count; `Game.recordTrainingDamage()` accumulates hits.
- **No stakes:** `rollEnemyDrops` early-returns in TRAINING (no loot), and `handleGameOver`
  restores hull/shield instead of ending the run — you cannot lose progress in the range.

## 8d. Developer Panel (dev builds only)
A developer-only overlay for testing. It is **never present in production**.

- **Gating:** `main.js` loads it through `import('./ui/devSetup.js')` inside an
  `if (import.meta.env.DEV)` block. Vite rewrites that flag to `false` for production builds, so
  the import expression is dropped and **neither `devSetup.js` nor `DevPanel.js` is emitted into
  `dist/` at all** (verified: the production bundle contains zero dev strings, and the build
  transforms 20 modules instead of 22). The panel builds its own DOM in JS, so `index.html`
  carries no dev markup.
- **Entry points:** the **🛠 DEV PANEL** button injected into the main menu, or the **F2** key
  (`ESC` closes it).
- **Tabs:**
  - **BESTIARY** — searchable list of all 13 enemy archetypes and all 10 boss archetypes with
    live stats (HP / speed / score / shard value / radius for enemies; radius / speed / drift /
    minion count / home sector for bosses). `SPAWN` drops that enemy or boss into the Training
    Range immediately.
  - **CURRENCY** — grant shards (+100 / +1k / +10k / +100k) and nano crystals (+1 / +10 / +100 /
    +1k), plus a custom amount that grants both. Grants are written through `Storage.save()`.
  - **UTIL** — grant equipment (pick category + tier), unlock all ships / sectors / tracks /
    secondaries, max every upgrade branch, jump the arena checkpoint to wave 50, god mode, full
    heal, kill boss, kill all enemies, jump to the Training Range, spawn a boss, and
    export / import / reset the save file.
- **🎵 SONGS (top bar):** opens a soundtrack preview that replaces the tabbed body. The list is
  derived from the sector→theme map (`SECTOR_TRACKS`), so it always shows the campaign songs a
  sector actually plays — one row per theme with its title, id, BPM and the sectors that use it —
  followed by the menu and boss themes. `▶` loops a theme instantly, `⏹ STOP` silences it and
  `↺ RESTORE RUN THEME` hands the music back to the run (the boss theme is restored while a boss
  is alive). If music was muted in Options, previewing turns the synth back on. Closing the panel
  always restores the game's own theme, so a dev song never keeps playing over a run.
- **God mode:** sets `player.devGodMode`, which `Player.takeDamage()` honours by ignoring all
  incoming damage; the panel's `tick()` (called from the game loop) keeps hull and shield full.

## 8e. Save Transfer (player-facing, all builds)
Move a save between phones, computers or browsers. Implemented in `src/engine/SaveTransfer.js`
and surfaced in **Options → SAVE TRANSFER** (`UIManager.setupSaveTransfer()`).
- **Format:** a self-describing JSON envelope —
  ```json
  { "format": "neon-defender-save", "version": 1, "savedAt": "2026-10-19T18:00:00.000Z",
    "game": "Neon Defender", "data": { ...the save... } }
  ```
  `serializeSave()` writes it pretty-printed so it is readable and diffable.
- **Import is forgiving but safe:** `parseSave()` accepts the envelope, a **bare save object**
  (older exports), or an unknown future format that still nests under `data`. Whatever arrives is
  pushed through `sanitizeSaveData()` — the *same* validation gate `Storage.load()` uses — so an
  import can never introduce NaN, unknown shapes or dangling equipment references into the
  running game. Non-JSON input is rejected with a readable error.
- **Transfer paths:** 📋 **COPY** (Clipboard API with an `execCommand` fallback for
  non-secure contexts), ⬇️ **DOWNLOAD .JSON** (Blob + anchor; filename carries the date and shard
  count), 📤 **SHARE** (native `navigator.share`, only offered where supported), 📋 **PASTE**
  (reads the clipboard into the import box), 📁 **OPEN FILE** (`<input type="file">` + FileReader).
- **Safety:** the import shows a one-line summary of the incoming save and asks for confirmation
  before replacing the current progress; a cancelled import leaves everything untouched. On
  success the game reloads so every system re-reads the new save.
- **Shared format:** the dev-only Developer Panel reuses `serializeSave()` / `parseSave()`, so
  dev exports and player exports are interchangeable.

## 9. Equipment & crystals (working tree — Phases 1–3)
Implemented in `src/systems/Equipment.js` (+ `src/entities/EquipmentDrop.js`, `UI.js`, `Storage.js`).
- **Tiers:** `C → B → A → S`, plus **`S+`** — obtainable **only** by fusing two S items
  (`TIER_META['S+'].mergeOnly`); `rollTier` and the store never produce it.
- **Fixed slots:** Shield ×1, Gun ×1, Material ×2, Drone ×2, Skin ×1 (`EQUIP_SLOTS`).
- **Templates:** 15 across 5 categories; effects resolved from `EFFECT_TABLE` by tier power.
- **Drops:** `rollEquipmentDrop({progress, luckMult, isBoss})` — ~8.5% base (cap 60%), boss = 100%.
  Tier weights ramp with `getDropProgress()`; bosses skew high.
- **Aggregation:** `computeBonuses(equipped, inventory)` is the single entry point; caps applied.
- **Economy:** `disassembleValue` → crystals (C1/B4/A12/S30/S+90); `tierUpRequirement`
  (C→B→A→S with **shards + crystals only, no duplicates**); `fuseSSItems` merges **S/S+ + S/S+**
  → **S+** keeping **every effect from both inputs** (same-stat effects stack, then ×1.25);
  `generateStoreStock` (premium, very expensive).
- **Arsenal UI (Phase 3):** `screen-arsenal` in `index.html`; `renderArsenal()` in `UI.js`
  renders equipped slots + per-category inventory, with **equip/unequip** and **disassemble → crystals**.
  Reachable from the main menu (`btn-open-arsenal`).
- **Persistence:** `Storage` schema carries `crystals`, `inventory[]`, `equippedEquipment{}` with sanitisation.
- **Skins:** cosmetic only (emblem/trail), no stat effect.
- **Secondary weapons:** `Storage.DEFAULT_DATA` now unlocks **only `seeker`**; `railgun`,
  `cluster`, `vortex` must be bought.
- **Not yet built (Phase 4+):** fusion bench UI and premium store UI (logic exists, no screen).

## 10. Power-ups (in-run, ~12% enemy drop)
`SPREAD` (weapon level), `SHIELD` (refill), `OVERDRIVE` (dmg ×1.5, 8 s),
`BOMB` (EMP ready), `HEALTH` (+40 HP).

## 11. Difficulty scaling (`WaveManager.getEnemyDifficulty()`)

| Mode | damage | fire rate | speed |
|------|--------|-----------|-------|
| Campaign | `1 + 0.2·(sector−1) + 0.025·(wave−1)` | `1 + 0.07·(sector−1) + 0.02·(wave−1)` | `1 + 0.02·(sector−1) + 0.005·(wave−1)` |
| Arena | `1 + 0.05·(wave−1)` | `1 + 0.03·(wave−1)` | `1 + 0.01·(wave−1)` |

Caps: damage ×8, fire-rate ×3.2–3.4, speed ×1.8. Applied to enemy bullets in `Enemy`.

## 12. Bullet-time (`main.js`)
World time scale = **1.0×** while touching/holding, **0.25×** when idle, lerped at ~14×dt.
This is a core, intentionally strong mechanic.

## 13. Persistence (`Storage`)
`neon_defender_savedata_v1` — deep-sanitised on load (numbers clamped, unknown fields
ignored). Persisted: **shards, crystals, inventory, equippedEquipment**, equipped/unlocked
ships, primaries/secondaries + secondary levels, upgrades, sectors, unlocked arena tracks,
arena stats (incl. `checkpoint` and the banked `weaponLevel`), audio settings.
Default starting shards = **0**.

`sanitizeSaveData(parsed)` is the **single validation gate**, exported and shared by
`Storage.load()` and the save-import path (§8e) so both produce identical results.

## 14. Controls
Mobile: drag to glide (finger offset ~45 px), auto-fire, tap EMP/secondary.
Desktop: mouse drag, WASD/arrows, space fire, `E`/`B` EMP, `Q`/right-click secondary,
`X`/`1` cycle primary.

## 15. Build / deploy / docs
- `npm run dev` (LAN host), `npm run build`, `npm run preview`.
- GitHub Pages via `.github/workflows/deploy-pages.yml` (builds `dist/`, copies `README.md`).
- `CHANGELOG.md` + `cliff.toml` are present; `npm run changelog` / `npm run changelog:unreleased`
  regenerate it via git-cliff.
- Docs: `PRD.md` (target), `SPEC.md` (this file), `EQUIPMENT_PLAN.md` (phased build status).

## 16. Known gaps / tech debt
1. Phase 4 UI (fusion bench + premium store) not built yet — logic exists in `Equipment.js`.
2. Store stock regenerates per render (needs stable seeding when the store UI lands).
3. Boss `scoreBonus` is not applied on boss kill in `main.js` (only regular kills use `scoreMult`).
