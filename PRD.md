# PRD — Neon Defender

**Product:** NEON DEFENDER (`galaxy-defendor-neon-dash`)
**Doc type:** Product Requirements Document (target product)
**Status:** 🟡 **Mostly implemented** — see §7 Traceability
**Last reviewed:** 2026-10-19 · **reviewed against commit:** `f420be4`

> **Source of truth split.** This PRD describes the **target** product. `SPEC.md` describes
> **what the committed code actually does**. The two agree on the campaign, bosses, ships,
> and changelog tooling. They diverge on **Equipment** and the **crystal economy**, which
> are specified here but **not yet in the build** (they are uncommitted WIP — see §7).

---

## 1. Vision

A high-octane neon vector shoot-'em-up ("Geometry Dash × bullet hell") for phones and
desktop, with deep but fully earnable progression. **No pay-to-win.** Depth comes from
build diversity (ships, weapons, equipment), not from stat inflation.

## 2. Goals

| # | Goal | Success signal | Status |
|---|------|----------------|:------:|
| G1 | Raise late-game challenge, especially bosses | Sectors 6–10 clearable but demanding | ✅ |
| G2 | Add horizontal build depth | Equipment choices change *how* you play | 🟡 WIP |
| G3 | Keep the economy honest | Long-term sinks; no infinite-shard trivialisation | 🟡 WIP |
| G4 | Preserve mobile-first feel | 60 FPS on mid-range phones; touch controls unchanged | ✅ |

## 3. Target product (specification)

### 3.1 Campaign — 10 Sectors ✅ implemented

| # | Sector | Threat | Waves | Boss | Boss HP | Clear bonus |
|---|--------|:------:|:-----:|------|--------:|------------:|
| 1 | NEON OUTPOST | 1 | 8 | CUBIC GUARDIAN | 1,200 | 300 |
| 2 | CYBER ASTEROIDS | 1 | 10 | PRISM PULSAR | 2,800 | 450 |
| 3 | VORTEX CORE | 2 | 12 | HEXA TYRANT | 5,200 | 700 |
| 4 | HYPERION LABS | 2 | 14 | OCTAGON OVERLORD | 8,800 | 1,050 |
| 5 | OMEGA SINGULARITY | 3 | 16 | CHRONOS PRIME | 14,000 | 1,600 |
| 6 | INFERNO CITADEL | 3 | 18 | DIABLO OVERLORD | 21,000 | 2,300 |
| 7 | ABYSS GATE | 4 | 20 | VOID LEVIATHAN | 31,000 | 3,200 |
| 8 | BLOOD MOON | 4 | 22 | CRIMSON REAPER | 46,000 | 4,300 |
| 9 | MACHINE EMPIRE | 5 | 24 | OMEGA TITAN | 68,000 | 5,800 |
| 10 | HELLFIRE CORE | 5 | 26 | DEMON KING SATAN | 95,000 | 8,000 |

### 3.2 Bosses — 3 phases, 10 archetypes ✅ implemented
All bosses have **3 phases** (transitions at 66% / 33% HP), a brief **invulnerability
window** on transition, **minion summons**, and a distinct visual archetype:
`guardian, prism, hex, octagon, chronos, devil, leviathan, reaper, titan, demon_king`.

### 3.3 Ships — 7, with unique projectile silhouettes and a small passive ✅ implemented

| Ship | Cost | Bullet shape | Passive |
|------|-----:|--------------|---------|
| ALPHA DART | 0 (only starting ship) | `dart` | Nimble Frame (smaller hitbox, +magnet) |
| CYBER CUBE | 400 | `cube` | Bulwark Plating (−dmg taken) |
| NEON PHOENIX | 1,200 | `phoenix` | Emberfire (+crit) |
| VOID SLICER | 2,500 | `slicer` | Void Rounds (piercing) |
| DRACULA'S WING | 1,500 | `fang` | Vampiric Drain (lifesteal) |
| BATI PLANE | 1,800 | `bat` | Bat-Shield (shield on kill) |
| HALLOWEEN REAPER | 2,200 | `scythe` | Soul Siphon |

**Only ALPHA DART is unlocked at game start.**

### 3.4 Equipment (new system) 🟡 **Phase 1–3 built (uncommitted)**
**Tiers:** `C → B → A → S`, plus **`S+`**, which is obtainable **only by merging two S
items** (never dropped, never sold) and is terminal.
**Fixed loadout slots:** Shield ×1, Gun ×1, Material ×2, Drone ×2, Skin ×1.
**Categories:** Shield (defence + retaliation), Gun (extra bullets, flamethrower),
Material (speed/damage/resistance/luck), Drone (attack/defence/buff), Skin (cosmetic gadgets).
**Drops:** per-enemy roll; tier weighted by progress (early ≈ C, rare A; S late/boss).
Bosses guarantee drops. **Fusion:** `C→B→A→S` with crystals + duplicates;
**S+S → S+ with the union of both effect sets ×1.25**. **Store:** rotating premium stock, very expensive.
**Skins:** cosmetic-only (confirmed) — themed emblem/trail, no stat effect.
**Secondary weapons:** only `seeker` unlocked at start; the rest must be bought.

### 3.5 Economy (target) 🟡 **cut applied (uncommitted)**
- **Shards** — kill/clear rewards, reduced **70%** (permanent, confirmed). ✅ applied in `main.js`.
  Starting balance is **0** — no free hand-out.
- **Nano Crystals** — scarce currency for equipment upgrades/fusion (enemy + boss drops). 🟡 in WIP.

## 4. Non-goals
No monetisation/ads/IAP; no multiplayer/accounts; no new engine/framework.

## 5. Personas & key flows
- **Mobile casual:** drag to fly, auto-fire, tap EMP.
- **Desktop:** mouse drag / WASD, space fire, E for EMP.
- **Completionist:** farm Arena → fuse equipment → clear all 10 sectors 3★.

## 6. Acceptance criteria (spec level)
- ✅ 10 campaign sectors, each with its own boss and increasing waves.
- ✅ All bosses show 3 phases and transition invulnerability.
- ✅ Ships: each fires a visually distinct projectile; only one ship unlockable at start; only `seeker` secondary unlocked.
- 🟡 Equipment: drops ✅, inventory ✅, equip ✅, disassemble ✅; fusion/store UI pending. *(Phase 4)*
- 🟡 Economy: crystals are a real bottleneck; shard drops reduced 70% ✅; crystal pacing TBD.
- ✅ No regressions to touch controls or 60 FPS target.

## 7. Traceability — PRD vs. implementation (commit `f420be4`)

| Area | PRD target | Implemented | Where |
|------|-----------|-------------|-------|
| Sectors | 10 | ✅ 10 | `UpgradeSystem.SECTORS` |
| Ships | 7 | ✅ 7 | `UpgradeSystem.SHIPS` |
| Ship bullet shapes / passives | 7 distinct | ✅ 7 | `UpgradeSystem` + `Bullet.drawShipShape` |
| Boss phases | 3 | ✅ 3 | `Boss.phaseCount` |
| Boss roster | 10 archetypes | ✅ 10 | `Boss` + `WaveManager` |
| Seeker missile nerf | yes | ✅ 20dmg/3 @ lvl 1 | `SECONDARY_WEAPONS.seeker` |
| Changelog tooling | git-cliff | ✅ `cliff.toml` + `CHANGELOG.md` | repo root |
| **Equipment system** | full | 🟡 P1–P3 done (drops/inventory/equip/disassemble); P4 fusion+store UI pending | uncommitted WIP |
| **Crystal economy** | yes | 🟡 drops + persistence done; upgrade/fusion sinks pending P4 | uncommitted WIP |
| **Shard drop −70%** | yes | ✅ applied (permanent) | `main.js` `SHARD_DROP_SCALE = 0.3` |
| **S+ merge tier** | yes | ✅ `fuseSSItems` → S+ (merge-only) | `Equipment.js` |

**On the equipment/crystal work:** Phases 1–3 exist as **uncommitted working-tree changes**
(`src/systems/Equipment.js`, `src/entities/EquipmentDrop.js`, and edits to
`main.js`/`Player.js`/`Storage.js`/`Bullet.js`/`UI.js`/`index.html`/`style.css`). They are
**not on `master`**. See `EQUIPMENT_PLAN.md` for the phased build status.

## 8. Open questions — resolved 2026-10-19
1. Equipment level: `C/B/A/S` only, or add `S+`/mythic above S? → **Add `S+`, merge-only**
   (two S items fused). Terminal tier; never dropped or sold. ✅ implemented.
2. Skins beyond a token perk? → **Cosmetic only.** ✅ decided.
3. ~70% shard cut permanent? → **Permanent.** ✅ applied.
4. Fixed slots vs. shared universal? → **Fixed slots** (Shield 1 / Gun 1 / Material 2 /
   Drone 2 / Skin 1). ✅ implemented; revisit after playtest if needed.
