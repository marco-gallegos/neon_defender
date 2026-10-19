# EQUIPMENT SYSTEM — BUILD PLAN & STATUS

> Flag file for tracking implementation progress.
> Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

**Overall status:** IN PROGRESS — Phase 3 complete, Phase 4 next
**Last updated:** 2026-10-19
**Smoke tests:** `/tmp/opencode/equipment_smoke.mjs` (P1) · `/tmp/opencode/equipment_phase2.mjs` (P2) · `/tmp/opencode/arsenal_smoke.mjs` (P3) · `/tmp/opencode/fusion_splus.mjs` (S+ merge) · `/tmp/opencode/ship_smoke.mjs` · `/tmp/opencode/boss_smoke.mjs` — all passing

## Locked design decisions
- **Tiers:** C → B → A → S, plus **S+ obtained only by merging two S items** (never dropped, never sold).
- **Loadout:** fixed slots per category — Shield ×1, Gun ×1, Material ×2, Drone ×2, Skin ×1.
- **Economy:** cut enemy shard drops by **70%** — this is **permanent** (confirmed). Add **Nano Crystals** as the scarce upgrade currency. Starting shards are **0** (earn everything).
- **Drops:** enemies roll for equipment (tier weighted by progress; early = mostly C, rare A/B; S near endgame/bosses). Bosses guarantee drops.
- **Fusion:** C→B→A→S uses **shards + crystals only (no duplicates)**. **Merging** any two **S/S+ items of the same category** → one **S+** carrying **all effects from both inputs** (same-stat effects stack, then ×1.25).
- **Store:** rotating premium stock, very expensive (hard but reachable), shards + crystals.
- **Skins:** **cosmetic only** — themed overlays (Winter, Spooky, Neon, Chrome), no stat effect beyond the cosmetic emblem/trail (confirmed).
- **Secondary weapons:** only `seeker` unlocked at start; `railgun`, `cluster`, `vortex` must be bought.

---

## Phase 1 — Core data, drops, inventory, crystals
- [x] 1.1 `src/systems/Equipment.js` — tiers, categories, templates, effect tables, generation, drop rolls, bonus aggregation, fusion costs.
- [x] 1.2 `Storage.js` — schema: `crystals`, `inventory[]`, `equippedEquipment{}`, `stats` + migration/sanitize.
- [x] 1.3 `src/entities/EquipmentDrop.js` — `EquipmentItem` + `CrystalItem` collectibles.
- [x] 1.4 `main.js` — roll drops on enemy/boss death, collect pickups, run crystal counter, bank on end, 70% shard cut.
- [x] 1.5 HUD crystal counter (index.html + UI.js + style.css).
- [x] 1.6 Smoke test: drops generate at all tiers, persistence round-trips.

## Phase 2 — Stat integration & in-run effects
- [x] 2.1 `Player.js` — apply equipment bonuses (damage/speed/resistance/shield/luck/damage-reduction).
- [x] 2.2 Extra bullets + flamethrower primary augment.
- [x] 2.3 Shield retaliation pulse (nearby damage on hit).
- [x] 2.4 Equipment drones (attack/guard/buff) rendered + functional.
- [x] 2.5 Skin overlay render + perk.
- [x] 2.6 Smoke test: each effect measurably changes player stats.
- Notes: movement multiplier intentionally excluded from fire cadence (was 20*dt clamp).

## Phase 3 — Arsenal UI (inventory / equip) ✅
- [x] 3.1 `index.html` — new ARSENAL screen + currency wiring + menu button.
- [x] 3.2 `UI.js` — render slots + inventory by category, equip/unequip, disassemble → crystals.
- [x] 3.3 `style.css` — tier cards, slot grid, badges, effect chips.
- [x] 3.4 Menu button + back navigation.
- [x] 3.5 Smoke test `arsenal_smoke.mjs` — slots per category, equip, disassemble, starter economy.
- Extra: **S+ merge tier** added — `TIER_META['S+']` (merge-only), never in `rollTier`/store, `fuseSSItems` → S+ with 1.25× fusion bonus.

## Phase 4 — Fusion bench & premium store
- [x] 4.1 Fusion UI: **tier-up C→B→A→S with shards + crystals (NO duplicates)** and **S/S+ + S/S+ merge → S+ keeping all effects**. Buttons live on each Arsenal card.
- [ ] 4.2 Store UI: rotating premium stock, very high prices.
- [ ] 4.3 Persistence + guard rails (can't merge equipped/last item).

## Phase 5 — Skins, polish, economy validation
- [ ] 5.1 Skin templates + cosmetic overlays (cosmetic-only, confirmed).
- [~] 5.2 Verify 70% shard cut and crystal pacing. (cut applied in `main.js`; permanent — pacing review pending)
- [ ] 5.3 CHANGELOG/README touch-up.

---

## Notes / blockers
- Existing `Enemy.onDestroy(particles, items, shardMultiplier)` is called from `main.js`; drops are rolled in `main.js` to avoid coupling entities to the equipment system.
- Player stat flow: constructor computes base stats from `UPGRADES` + `shipDef`; equipment bonuses are applied **after** that.
- Equipment is now **stored, equipped, and disassembled** in-game via the ARSENAL screen (Phase 3). Fusion (Phase 4) is still pending, so S/S+ items can only be created via the console path until then.
- Deferred: **Store stock rotation is generated per render**, so prices/items reshuffle when reopening. Needs stable seeding when Phase 4 lands.
- Deferred: some loaded items may predate a template change (no `defId` backfill). Low risk unless templates are renamed.
- Known follow-up: **boss `scoreBonus`** should also be applied in `main.js` when a boss dies (currently only regular kills use `scoreMult`).
