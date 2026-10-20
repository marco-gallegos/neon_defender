// Developer Panel — DEV-ONLY tooling.
//
// This module is loaded through a dynamic import guarded by
// `import.meta.env.DEV`, so Vite replaces that flag with `false` in
// production and Rollup drops the whole import. Nothing here ships to
// players: the DOM is built in JS and never added to index.html.
//
// Features:
//   * BESTIARY — searchable list of every enemy and boss with live stats,
//     plus one-click spawn into the Training Range.
//   * CURRENCY — grant shards / nano crystals.
//   * UTIL     — grant gear, unlock everything, max upgrades, god mode,
//     export / import / reset the save.
//   * MUSIC    — preview every campaign soundtrack from the top bar.

import { ENEMY_TYPES } from '../entities/Enemy.js';
import { BOSS_TYPES } from '../entities/Boss.js';
import { SECTORS, SECTOR_TRACKS, STAGE_TRACKS, SHIPS, UPGRADES } from '../systems/UpgradeSystem.js';
import { CATEGORIES, EQUIP_SLOTS, TIERS, generateEquipment } from '../systems/Equipment.js';
import { Storage, STORAGE_KEY } from '../engine/Storage.js';
import { serializeSave, parseSave } from '../engine/SaveTransfer.js';
import { audio, TRACKS, TRACK_NAMES } from '../engine/Audio.js';

const CSS = `
.dev-overlay {
  position: absolute; inset: 0; z-index: 200;
  background: rgba(4, 6, 16, 0.96);
  display: flex; flex-direction: column;
  padding: env(safe-area-inset-top, 12px) 12px env(safe-area-inset-bottom, 16px) 12px;
  pointer-events: auto;
  font-family: var(--font-display, monospace);
}
.dev-overlay.hidden { display: none !important; }

.dev-header {
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid rgba(57, 255, 20, 0.4);
  padding-bottom: 8px; margin-bottom: 10px;
}
.dev-title {
  font-size: 1.05rem; font-weight: 900; letter-spacing: 1px;
  color: var(--neon-lime, #39ff14);
  text-shadow: 0 0 10px rgba(57, 255, 20, 0.6);
}
.dev-badge {
  font-size: 0.55rem; padding: 2px 6px; border-radius: 4px;
  background: rgba(57, 255, 20, 0.16); color: var(--neon-lime, #39ff14);
  border: 1px solid rgba(57, 255, 20, 0.5);
}
.dev-close {
  font-family: inherit; font-size: 0.72rem;
  padding: 7px 12px; border-radius: 7px; cursor: pointer;
  background: rgba(255, 0, 127, 0.15); color: #ff8fc4;
  border: 1px solid rgba(255, 0, 127, 0.5);
}

/* --- Music preview (top-bar launcher) --- */
.dev-music-btn {
  margin-left: auto; font-family: inherit; font-size: 0.68rem;
  padding: 7px 11px; border-radius: 7px; cursor: pointer;
  background: rgba(0, 240, 255, 0.14); color: var(--neon-cyan, #00f0ff);
  border: 1px solid rgba(0, 240, 255, 0.45);
}
.dev-music-btn.on {
  background: rgba(0, 240, 255, 0.26); color: #eaffff;
  border-color: rgba(0, 240, 255, 0.8);
}

.dev-music {
  flex: 1; min-height: 0;
  display: flex; flex-direction: column; gap: 9px;
}
.dev-music.hidden { display: none !important; }
.dev-tabs.hidden, .dev-body.hidden { display: none !important; }
.dev-music-head {
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid rgba(0, 240, 255, 0.4);
  padding-bottom: 8px;
}
.dev-music-title {
  font-size: 0.92rem; font-weight: 900; letter-spacing: 1px;
  color: var(--neon-cyan, #00f0ff);
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.55);
}
.dev-music-back {
  margin-left: auto; font-family: inherit; font-size: 0.68rem;
  padding: 7px 11px; border-radius: 7px; cursor: pointer;
  background: rgba(255, 255, 255, 0.06); color: #cfd8f0;
  border: 1px solid rgba(255, 255, 255, 0.18);
}
.dev-music-body {
  flex: 1; overflow-y: auto; overscroll-behavior: contain; min-height: 0;
  display: flex; flex-direction: column; gap: 7px;
}
.dev-music-row.playing {
  background: rgba(57, 255, 20, 0.12);
  border-color: rgba(57, 255, 20, 0.6);
}
.dev-music-foot { display: flex; gap: 6px; }
.dev-music-foot .dev-btn { flex: 1; }

.dev-tabs { display: flex; gap: 6px; margin-bottom: 10px; }
.dev-tab {
  flex: 1; font-family: inherit; font-size: 0.68rem; letter-spacing: 0.5px;
  padding: 8px 4px; border-radius: 7px; cursor: pointer;
  background: rgba(255, 255, 255, 0.05); color: #97a0c4;
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.dev-tab.active {
  background: rgba(57, 255, 20, 0.16); color: var(--neon-lime, #39ff14);
  border-color: rgba(57, 255, 20, 0.55);
}

.dev-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; min-height: 0; }
.dev-pane { display: none; flex-direction: column; gap: 9px; }
.dev-pane.active { display: flex; }

.dev-search {
  width: 100%; font-family: inherit; font-size: 0.85rem;
  padding: 9px 11px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.06); color: #e8eeff;
  border: 1px solid rgba(0, 240, 255, 0.3); outline: none;
}
.dev-search:focus { border-color: var(--neon-cyan, #00f0ff); }

.dev-chips { display: flex; gap: 5px; flex-wrap: wrap; }
.dev-chip {
  font-family: inherit; font-size: 0.6rem; padding: 5px 9px;
  border-radius: 20px; cursor: pointer;
  background: rgba(255, 255, 255, 0.05); color: #97a0c4;
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.dev-chip.active {
  background: rgba(0, 240, 255, 0.16); color: var(--neon-cyan, #00f0ff);
  border-color: rgba(0, 240, 255, 0.5);
}

.dev-entry {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.dev-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 7px currentColor; }
.dev-entry-main { flex: 1; min-width: 0; }
.dev-entry-name {
  font-size: 0.78rem; color: #e8eeff; font-weight: 700;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dev-entry-sub { font-size: 0.6rem; color: #78829f; margin-top: 2px; }
.dev-entry-stats { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 3px; }
.dev-stat { font-size: 0.58rem; color: #8f99bd; }
.dev-stat b { color: #cfe0ff; }
.dev-spawn {
  font-family: inherit; font-size: 0.6rem; padding: 6px 9px;
  border-radius: 6px; cursor: pointer; flex-shrink: 0;
  background: rgba(0, 240, 255, 0.14); color: var(--neon-cyan, #00f0ff);
  border: 1px solid rgba(0, 240, 255, 0.45);
}

.dev-section {
  font-size: 0.62rem; letter-spacing: 1px; color: var(--neon-magenta, #ff007f);
  margin: 6px 0 1px; text-transform: uppercase;
}
.dev-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; }
.dev-btn {
  font-family: inherit; font-size: 0.66rem; padding: 10px 6px;
  border-radius: 7px; cursor: pointer; text-align: center;
  background: rgba(255, 255, 255, 0.05); color: #cfd8f0;
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.dev-btn:active { transform: scale(0.96); }
.dev-btn.primary { background: rgba(57, 255, 20, 0.14); color: var(--neon-lime, #39ff14); border-color: rgba(57, 255, 20, 0.45); }
.dev-btn.warn { background: rgba(255, 119, 0, 0.14); color: #ffb066; border-color: rgba(255, 119, 0, 0.45); }
.dev-btn.danger { background: rgba(255, 0, 60, 0.14); color: #ff8fa8; border-color: rgba(255, 0, 60, 0.45); }
.dev-btn.on { background: rgba(0, 240, 255, 0.2); color: var(--neon-cyan, #00f0ff); border-color: rgba(0, 240, 255, 0.6); }

.dev-row { display: flex; gap: 6px; align-items: center; }
.dev-input {
  flex: 1; font-family: inherit; font-size: 0.75rem; padding: 8px 10px;
  border-radius: 7px; background: rgba(255, 255, 255, 0.06); color: #e8eeff;
  border: 1px solid rgba(255, 255, 255, 0.16); outline: none; min-width: 0;
}
.dev-note {
  font-size: 0.6rem; color: #78829f; line-height: 1.5;
  padding: 8px 10px; border-radius: 7px;
  background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.16);
}
.dev-hint { font-size: 0.58rem; color: #6b7490; text-align: center; margin-top: 8px; }
`;

export class DevPanel {
  constructor(game) {
    this.game = game;
    this.tab = 'bestiary';
    this.filter = 'all';
    this.query = '';
    this.godMode = false;
    this.root = null;
    this.built = false;
    // Track id currently previewed by the music overlay (null = none).
    this.previewTrack = null;
    this.musicOpen = false;
  }

  /* ---------------------------------------------------------------- *
   *  MOUNT
   * ---------------------------------------------------------------- */
  mount() {
    if (this.built) return;
    this.built = true;

    if (!document.getElementById('dev-panel-style')) {
      const style = document.createElement('style');
      style.id = 'dev-panel-style';
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.id = 'screen-dev';
    overlay.className = 'dev-overlay hidden';
    overlay.innerHTML = `
      <div class="dev-header">
        <span class="dev-title">🛠 DEV PANEL</span>
        <span class="dev-badge">DEV ONLY</span>
        <button class="dev-music-btn" id="dev-music-open">🎵 SONGS</button>
        <button class="dev-close" id="dev-close">✕ CLOSE</button>
      </div>
      <div class="dev-tabs">
        <button class="dev-tab active" data-tab="bestiary">BESTIARY</button>
        <button class="dev-tab" data-tab="currency">CURRENCY</button>
        <button class="dev-tab" data-tab="util">UTIL</button>
      </div>
      <div class="dev-body">
        <div class="dev-pane active" data-pane="bestiary">
          <input class="dev-search" id="dev-search" type="text" placeholder="Search enemies & bosses…" autocomplete="off" />
          <div class="dev-chips">
            <button class="dev-chip active" data-filter="all">ALL</button>
            <button class="dev-chip" data-filter="enemy">ENEMIES</button>
            <button class="dev-chip" data-filter="boss">BOSSES</button>
          </div>
          <div class="dev-section">Enemies &amp; Bosses</div>
          <div id="dev-bestiary"></div>
        </div>

        <div class="dev-pane" data-pane="currency">
          <div class="dev-section">Shards ◆</div>
          <div class="dev-grid" id="dev-shard-buttons"></div>
          <div class="dev-section">Nano Crystals ◆◆</div>
          <div class="dev-grid" id="dev-crystal-buttons"></div>
          <div class="dev-section">Custom amount</div>
          <div class="dev-row">
            <input class="dev-input" id="dev-custom-amount" type="number" value="1000" min="0" />
            <button class="dev-btn primary" id="dev-custom-grant">GRANT</button>
          </div>
          <div class="dev-note" id="dev-wallet">—</div>
        </div>

        <div class="dev-pane" data-pane="util">
          <div class="dev-section">Equipment</div>
          <div class="dev-row">
            <select class="dev-input" id="dev-gear-category"></select>
            <select class="dev-input" id="dev-gear-tier"></select>
            <button class="dev-btn primary" id="dev-grant-gear">GRANT</button>
          </div>
          <div class="dev-note" id="dev-inventory">—</div>

          <div class="dev-section">Unlocks</div>
          <div class="dev-grid">
            <button class="dev-btn" id="dev-unlock-ships">ALL SHIPS</button>
            <button class="dev-btn" id="dev-unlock-sectors">ALL SECTORS</button>
            <button class="dev-btn" id="dev-unlock-tracks">ALL TRACKS</button>
            <button class="dev-btn" id="dev-unlock-secondaries">ALL 2NDRY</button>
            <button class="dev-btn" id="dev-max-upgrades">MAX UPGRADES</button>
            <button class="dev-btn" id="dev-arb-checkpoint">ARENA CKPT 50</button>
          </div>

          <div class="dev-section">Run control</div>
          <div class="dev-grid">
            <button class="dev-btn" id="dev-god">GOD MODE</button>
            <button class="dev-btn" id="dev-heal">FULL HEAL</button>
            <button class="dev-btn" id="dev-kill-boss">KILL BOSS</button>
            <button class="dev-btn" id="dev-kill-all">KILL ALL</button>
            <button class="dev-btn warn" id="dev-to-training">GO TO RANGE</button>
            <button class="dev-btn warn" id="dev-spawn-boss">SPAWN BOSS</button>
          </div>

          <div class="dev-section">Save data</div>
          <div class="dev-grid">
            <button class="dev-btn" id="dev-export">EXPORT JSON</button>
            <button class="dev-btn" id="dev-import">IMPORT JSON</button>
            <button class="dev-btn danger" id="dev-reset">RESET SAVE</button>
          </div>
          <textarea class="dev-input" id="dev-json" rows="4" style="font-size:0.58rem;resize:vertical;"></textarea>
          <div class="dev-hint">Keyboard: F2 toggles the panel · ESC closes it</div>
        </div>
      </div>

      <div class="dev-music hidden" id="dev-music">
        <div class="dev-music-head">
          <span class="dev-music-title">🎵 SOUNDTRACKS</span>
          <button class="dev-music-back" id="dev-music-close">✕ BACK</button>
        </div>
        <div class="dev-music-body" id="dev-music-list"></div>
        <div class="dev-music-foot">
          <button class="dev-btn" id="dev-music-stop">⏹ STOP</button>
          <button class="dev-btn primary" id="dev-music-restore">↺ RESTORE RUN THEME</button>
        </div>
        <div class="dev-note" id="dev-music-note">—</div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.root = overlay;

    // ESC backs out of the music view first; the panel itself is closed by
    // the bootstrap shortcut (registered after this one, so it is skipped).
    this._onKeyDown = (e) => {
      if (e.code === 'Escape' && this.musicOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.toggleMusic(false);
      }
    };
    window.addEventListener('keydown', this._onKeyDown);

    this.bindEvents();
    this.renderBestiary();
    this.renderCurrency();
    this.renderUtil();
    this.renderMusic();
    this.syncGodMode();
  }

  /* ---------------------------------------------------------------- *
   *  EVENTS
   * ---------------------------------------------------------------- */
  bindEvents() {
    const q = (id) => document.getElementById(id);

    q('dev-close').onclick = () => this.hide();

    this.root.querySelectorAll('.dev-tab').forEach(tab => {
      tab.onclick = () => {
        this.tab = tab.dataset.tab;
        this.root.querySelectorAll('.dev-tab').forEach(t => t.classList.toggle('active', t === tab));
        this.root.querySelectorAll('.dev-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === this.tab));
        audio.playClick?.();
      };
    });

    this.root.querySelectorAll('.dev-chip').forEach(chip => {
      chip.onclick = () => {
        this.filter = chip.dataset.filter;
        this.root.querySelectorAll('.dev-chip').forEach(c => c.classList.toggle('active', c === chip));
        this.renderBestiary();
        audio.playClick?.();
      };
    });

    const search = q('dev-search');
    search.oninput = () => { this.query = search.value; this.renderBestiary(); };

    // --- Currency ---
    const shardBox = q('dev-shard-buttons');
    [100, 1000, 10000, 100000].forEach(n => {
      const b = document.createElement('button');
      b.className = 'dev-btn';
      b.textContent = `+${n.toLocaleString()}`;
      b.onclick = () => this.grantShards(n);
      shardBox.appendChild(b);
    });

    const crystalBox = q('dev-crystal-buttons');
    [1, 10, 100, 1000].forEach(n => {
      const b = document.createElement('button');
      b.className = 'dev-btn';
      b.textContent = `+${n.toLocaleString()}`;
      b.onclick = () => this.grantCrystals(n);
      crystalBox.appendChild(b);
    });

    q('dev-custom-grant').onclick = () => {
      const raw = Number(q('dev-custom-amount').value) || 0;
      const amount = Math.max(0, Math.floor(raw));
      if (amount <= 0) return;
      this.grantShards(amount);
      this.grantCrystals(amount);
    };

    // --- Gear ---
    const catSel = q('dev-gear-category');
    Object.keys(CATEGORIES).forEach(cat => {
      const o = document.createElement('option');
      o.value = cat;
      o.textContent = `${cat.toUpperCase()} (${EQUIP_SLOTS[cat] || 1})`;
      catSel.appendChild(o);
    });
    const tierSel = q('dev-gear-tier');
    TIERS.forEach(t => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      tierSel.appendChild(o);
    });
    tierSel.value = 'A';

    q('dev-grant-gear').onclick = () => this.grantGear(catSel.value, tierSel.value);

    // --- Unlocks ---
    q('dev-unlock-ships').onclick = () => this.unlockShips();
    q('dev-unlock-sectors').onclick = () => this.unlockSectors();
    q('dev-unlock-tracks').onclick = () => this.unlockTracks();
    q('dev-unlock-secondaries').onclick = () => this.unlockSecondaries();
    q('dev-max-upgrades').onclick = () => this.maxUpgrades();
    q('dev-arb-checkpoint').onclick = () => this.setArenaCheckpoint();

    // --- Run control ---
    q('dev-god').onclick = () => { this.godMode = !this.godMode; this.syncGodMode(); };
    q('dev-heal').onclick = () => this.fullHeal();
    q('dev-kill-boss').onclick = () => this.killBoss();
    q('dev-kill-all').onclick = () => this.killAllEnemies();
    q('dev-to-training').onclick = () => { this.hide(); this.game.startRun('TRAINING'); };
    q('dev-spawn-boss').onclick = () => this.spawnBossNow();

    // --- Save ---
    q('dev-export').onclick = () => this.exportSave();
    q('dev-import').onclick = () => this.importSave();
    q('dev-reset').onclick = () => this.resetSave();

    // --- Music preview ---
    q('dev-music-open').onclick = () => this.toggleMusic();
    q('dev-music-close').onclick = () => this.toggleMusic(false);
    q('dev-music-stop').onclick = () => this.stopPreview();
    q('dev-music-restore').onclick = () => this.restoreMusic();
  }

  /* ---------------------------------------------------------------- *
   *  VISIBILITY
   * ---------------------------------------------------------------- */
  show() {
    this.mount();
    this.root.classList.remove('hidden');
    this.toggleMusic(false);
    this.renderBestiary();
    this.renderCurrency();
    this.renderUtil();
    this.renderMusic();
    this.syncGodMode();
  }

  hide() {
    // Leaving the panel drops any preview and hands the soundtrack back to
    // the game, so a dev song never keeps playing over a run.
    if (this.previewTrack) this.restoreMusic();
    this.musicOpen = false;
    this.syncMusicButton();
    if (this.root) this.root.classList.add('hidden');
  }

  toggle() {
    if (this.root && !this.root.classList.contains('hidden')) this.hide();
    else this.show();
  }

  isOpen() {
    return !!(this.root && !this.root.classList.contains('hidden'));
  }

  /* ---------------------------------------------------------------- *
   *  BESTIARY
   * ---------------------------------------------------------------- */
  renderBestiary() {
    const box = document.getElementById('dev-bestiary');
    if (!box) return;
    box.innerHTML = '';

    const q = this.query.trim().toLowerCase();
    const match = (text) => !q || String(text).toLowerCase().includes(q);

    // --- Enemies ---
    if (this.filter !== 'boss') {
      const entries = Object.entries(ENEMY_TYPES)
        .filter(([key, def]) => match(key) || match(def.name))
        .sort((a, b) => a[1].name.localeCompare(b[1].name));

      if (entries.length) {
        box.appendChild(this.sectionLabel(`Enemies (${entries.length})`));
        for (const [key, def] of entries) {
          box.appendChild(this.bestiaryRow({
            name: def.name,
            key,
            color: def.color,
            stats: [
              ['HP', def.hp],
              ['SPD', def.speed],
              ['SCORE', def.score],
              ['◆', def.shards],
              ['R', def.radius]
            ],
            onSpawn: () => this.spawnEnemy(key)
          }));
        }
      }
    }

    // --- Bosses ---
    if (this.filter !== 'enemy') {
      const entries = Object.entries(BOSS_TYPES)
        .filter(([key, def]) => match(key) || match(def.radius))
        .sort((a, b) => a[1].radius - b[1].radius);

      if (entries.length) {
        box.appendChild(this.sectionLabel(`Bosses (${entries.length})`));
        for (const [key, def] of entries) {
          const sector = SECTORS.find(s => s.bossType === key);
          box.appendChild(this.bestiaryRow({
            name: (sector?.bossName || key.toUpperCase().replace(/_/g, ' ')),
            key,
            color: sector?.color || '#ff007f',
            stats: [
              ['RADIUS', def.radius],
              ['SPEED', def.speed],
              ['DRIFT', def.drift],
              ['MINIONS', (def.minions || []).length],
              ['SECTOR', sector ? `#${sector.id}` : '—']
            ],
            onSpawn: () => this.spawnBossByType(key)
          }));
        }
      }
    }

    if (!box.children.length) {
      const empty = document.createElement('div');
      empty.className = 'dev-note';
      empty.textContent = `No matches for "${this.query}".`;
      box.appendChild(empty);
    }
  }

  sectionLabel(text) {
    const d = document.createElement('div');
    d.className = 'dev-section';
    d.textContent = text;
    return d;
  }

  bestiaryRow({ name, key, color, stats, onSpawn }) {
    const row = document.createElement('div');
    row.className = 'dev-entry';
    const statHtml = stats.map(([label, value]) => `<span class="dev-stat">${label} <b>${value}</b></span>`).join('');
    row.innerHTML = `
      <span class="dev-dot" style="background:${color};color:${color}"></span>
      <div class="dev-entry-main">
        <div class="dev-entry-name">${name}</div>
        <div class="dev-entry-sub">${key}</div>
        <div class="dev-entry-stats">${statHtml}</div>
      </div>
      <button class="dev-spawn">SPAWN</button>
    `;
    row.querySelector('.dev-spawn').onclick = () => {
      audio.playClick?.();
      onSpawn();
    };
    return row;
  }

  /* ---------------------------------------------------------------- *
   *  CURRENCY
   * ---------------------------------------------------------------- */
  grantShards(n) {
    const save = this.game.saveData;
    save.shards = Math.max(0, (Number(save.shards) || 0) + n);
    Storage.save(save);
    this.renderCurrency();
    this.game.ui?.refreshCurrencyDisplays?.();
  }

  grantCrystals(n) {
    const save = this.game.saveData;
    save.crystals = Math.max(0, (Number(save.crystals) || 0) + n);
    Storage.save(save);
    this.renderCurrency();
    this.game.ui?.refreshCurrencyDisplays?.();
  }

  renderCurrency() {
    const save = this.game.saveData;
    const note = document.getElementById('dev-wallet');
    if (note) {
      note.innerHTML =
        `Wallet: <b style="color:#ffe600">${(Number(save.shards) || 0).toLocaleString()} ◆</b> · ` +
        `<b style="color:#c77dff">${(Number(save.crystals) || 0).toLocaleString()} ◆◆</b>`;
    }
  }

  /* ---------------------------------------------------------------- *
   *  UTIL
   * ---------------------------------------------------------------- */
  // Refresh the read-only summary lines in the UTIL tab.
  renderUtil() {
    const save = this.game.saveData;
    const inv = document.getElementById('dev-inventory');
    if (inv) {
      const count = (save.inventory || []).length;
      const tiers = {};
      for (const it of save.inventory || []) {
        if (it && it.tier) tiers[it.tier] = (tiers[it.tier] || 0) + 1;
      }
      const tierText = Object.entries(tiers)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([t, n]) => `${t}×${n}`)
        .join(' ') || 'none';
      inv.innerHTML = `Inventory: <b>${count}</b> item${count === 1 ? '' : 's'} (${tierText})`;
    }

    const wallet = document.getElementById('dev-wallet');
    if (wallet) {
      wallet.innerHTML =
        `Wallet: <b style="color:#ffe600">${(Number(save.shards) || 0).toLocaleString()} ◆</b> · ` +
        `<b style="color:#c77dff">${(Number(save.crystals) || 0).toLocaleString()} ◆◆</b>`;
    }
  }

  grantGear(category, tier) {
    const save = this.game.saveData;
    const item = generateEquipment(category, tier);
    if (!save.inventory) save.inventory = [];
    save.inventory.push(item);
    Storage.save(save);
    this.renderUtil();
    this.game.ui?.renderArsenal?.();
  }

  unlockShips() {
    const save = this.game.saveData;
    const ids = Object.keys(SHIPS);
    save.unlockedShips = [...new Set([...(save.unlockedShips || []), ...ids])];
    Storage.save(save);
    this.game.ui?.renderHangar?.();
    this.game.ui?.renderMenuPreview?.();
  }

  unlockSectors() {
    const save = this.game.saveData;
    if (!save.sectors) save.sectors = {};
    SECTORS.forEach(s => {
      const cur = save.sectors[s.id] || { unlocked: false, stars: 0, highscore: 0 };
      save.sectors[s.id] = { ...cur, unlocked: true };
    });
    Storage.save(save);
    this.game.ui?.renderCampaignSectors?.();
  }

  unlockTracks() {
    const save = this.game.saveData;
    // Every playable theme (stage tracks are what the Arena rotates through).
    const all = [...new Set([
      ...Object.keys(TRACKS),
      ...Object.values(SECTOR_TRACKS),
      ...(save.unlockedTracks || [])
    ])];
    save.unlockedTracks = all;
    Storage.save(save);
  }

  unlockSecondaries() {
    const save = this.game.saveData;
    save.unlockedSecondaries = ['seeker', 'railgun', 'cluster', 'vortex'];
    Storage.save(save);
    this.game.ui?.renderMenuPreview?.();
  }

  maxUpgrades() {
    const save = this.game.saveData;
    if (!save.upgrades) save.upgrades = {};
    for (const [key, def] of Object.entries(UPGRADES)) {
      const max = def?.maxLevel ?? def?.max ?? 10;
      save.upgrades[key] = max;
    }
    Storage.save(save);
    this.game.ui?.renderMenuPreview?.();
  }

  setArenaCheckpoint() {
    const save = this.game.saveData;
    if (!save.arenaStats) save.arenaStats = {};
    save.arenaStats.checkpoint = 50;
    save.arenaStats.bestWave = Math.max(Number(save.arenaStats.bestWave) || 0, 50);
    save.arenaStats.weaponLevel = 5;
    Storage.save(save);
    this.game.ui?.renderArenaCheckpoints?.();
  }

  fullHeal() {
    const p = this.game.player;
    if (!p) return;
    p.hp = p.maxHp;
    p.shield = p.maxShield;
  }

  killBoss() {
    const boss = this.game.waveManager?.boss;
    if (!boss || boss.dead) return;
    boss.hp = 0;
    boss.dead = true;
  }

  killAllEnemies() {
    const enemies = this.game.enemies;
    if (!Array.isArray(enemies)) return;
    for (const e of enemies) { e.hp = 0; e.dead = true; }
  }

  spawnEnemy(key) {
    if (this.game.currentMode !== 'TRAINING') {
      this.game.startRun('TRAINING');
    }
    this.game.spawnTrainingEnemy(key, 1);
    this.hide();
  }

  spawnBossByType(typeKey) {
    if (this.game.currentMode !== 'TRAINING') {
      this.game.startRun('TRAINING');
    }
    const def = BOSS_TYPES[typeKey];
    const sector = SECTORS.find(s => s.bossType === typeKey);
    this.game.spawnTrainingBoss({
      name: sector?.bossName || typeKey.toUpperCase(),
      hp: sector?.bossHp || 3000,
      color: sector?.color || '#ff007f'
    });
    this.hide();
  }

  spawnBossNow() {
    if (this.game.currentMode !== 'TRAINING') {
      this.game.startRun('TRAINING');
    }
    this.game.spawnTrainingBoss({ name: 'PRACTICE TITAN', hp: 5000, color: '#ff007f' });
    this.hide();
  }

  /* ---------------------------------------------------------------- *
   *  MUSIC PREVIEW
   * ---------------------------------------------------------------- */
  // Campaign songs are derived from the sector→theme map, so the list
  // always matches the soundtrack a sector actually plays.
  musicEntries() {
    const groups = new Map();
    for (const sector of SECTORS) {
      const id = SECTOR_TRACKS[sector.id];
      if (!id || !TRACKS[id]) continue;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(sector);
    }

    const entries = [];
    for (const id of STAGE_TRACKS) {
      if (groups.has(id)) entries.push({ id, sectors: groups.get(id), group: 'campaign' });
    }
    // Any theme mapped outside STAGE_TRACKS still deserves a row.
    for (const [id, sectors] of groups) {
      if (!entries.some(e => e.id === id)) entries.push({ id, sectors, group: 'campaign' });
    }
    for (const id of ['menu', 'boss']) {
      if (TRACKS[id]) entries.push({ id, sectors: [], group: 'other' });
    }
    return entries;
  }

  toggleMusic(force) {
    this.musicOpen = force === undefined ? !this.musicOpen : !!force;
    const panel = document.getElementById('dev-music');
    if (panel) panel.classList.toggle('hidden', !this.musicOpen);
    // The music view replaces the tabbed body so only one list is on screen.
    this.root?.querySelector('.dev-body')?.classList.toggle('hidden', this.musicOpen);
    this.root?.querySelector('.dev-tabs')?.classList.toggle('hidden', this.musicOpen);
    this.syncMusicButton();
    if (this.musicOpen) this.renderMusic();
  }

  syncMusicButton() {
    const btn = document.getElementById('dev-music-open');
    if (!btn) return;
    btn.classList.toggle('on', this.musicOpen || !!this.previewTrack);
    btn.textContent = this.previewTrack
      ? `🎵 ${(TRACK_NAMES[this.previewTrack] || this.previewTrack).split(' ')[0]}`
      : '🎵 SONGS';
  }

  renderMusic() {
    const list = document.getElementById('dev-music-list');
    if (!list) return;
    list.innerHTML = '';

    let lastGroup = null;
    for (const entry of this.musicEntries()) {
      if (entry.group !== lastGroup) {
        lastGroup = entry.group;
        list.appendChild(this.sectionLabel(
          entry.group === 'campaign' ? 'Campaign stages' : 'Menu & boss themes'
        ));
      }
      list.appendChild(this.musicRow(entry));
    }

    const note = document.getElementById('dev-music-note');
    if (note) {
      const muted = this.game.saveData?.settings?.music === false;
      if (this.previewTrack) {
        const name = TRACK_NAMES[this.previewTrack] || this.previewTrack;
        note.innerHTML = `▶ Now previewing: <b style="color:#39ff14">${name}</b>` +
          (muted ? ' · music is muted in Options — re-enable it to hear the preview.' : '');
      } else {
        note.textContent = muted
          ? 'Music is OFF in Options — playing a song turns the synth back on.'
          : 'Tap a song to loop it. The preview overrides the run theme until you restore it.';
      }
    }
    this.syncMusicButton();
  }

  musicRow({ id, sectors, group }) {
    const def = TRACKS[id] || {};
    const name = TRACK_NAMES[id] || id;
    const color = group === 'campaign'
      ? (sectors[0]?.color || '#00f0ff')
      : (id === 'boss' ? '#ff007f' : '#00f0ff');
    const where = sectors.length
      ? `Sectors ${sectors.map(s => s.id).join(', ')}`
      : (id === 'boss' ? 'Boss fights' : 'Menus & hangar');

    const row = document.createElement('div');
    row.className = 'dev-entry dev-music-row' + (this.previewTrack === id ? ' playing' : '');
    row.innerHTML = `
      <span class="dev-dot" style="background:${color};color:${color}"></span>
      <div class="dev-entry-main">
        <div class="dev-entry-name">${name}</div>
        <div class="dev-entry-sub">${id} · ${def.bpm || '—'} BPM · ${where}</div>
      </div>
      <button class="dev-spawn">${this.previewTrack === id ? '▶ ON' : '▶'}</button>
    `;
    row.querySelector('.dev-spawn').onclick = () => {
      audio.playClick?.();
      this.playPreview(id);
    };
    return row;
  }

  // Loop a track immediately. Music is force-enabled first — otherwise the
  // preview would be silent for anyone who muted it in the Options screen.
  playPreview(id) {
    if (!TRACKS[id]) return;
    const save = this.game.saveData;
    if (save && save.settings && save.settings.music === false) {
      save.settings.music = true;
      Storage.save(save);
      audio.setMusicEnabled(true);
    }
    this.previewTrack = id;
    audio.playTrack(id);
    this.renderMusic();
  }

  stopPreview() {
    this.previewTrack = null;
    audio.stopMusic();
    this.renderMusic();
  }

  // Hand the soundtrack back to whatever the game should be playing.
  restoreMusic() {
    this.previewTrack = null;
    const game = this.game;
    const inRun = game.state === 'PLAYING' || game.state === 'PAUSED';
    const boss = game.waveManager?.boss;
    const inBoss = !!(boss && !boss.dead);
    let track = 'menu';
    if (inRun) track = inBoss ? 'boss' : (game.stageTrack || 'menu');
    audio.playTrack(track);
    this.renderMusic();
  }

  /* ---------------------------------------------------------------- *
   *  SAVE I/O
   * ---------------------------------------------------------------- */
  // Uses the same portable JSON envelope as the in-game SAVE TRANSFER
  // screen, so dev exports and player exports are interchangeable.
  exportSave() {
    const area = document.getElementById('dev-json');
    if (!area) return;
    area.value = serializeSave(this.game.saveData);
    area.select?.();
  }

  importSave() {
    const area = document.getElementById('dev-json');
    if (!area) return;
    const result = parseSave(area.value);
    if (!result.ok) {
      area.value = `IMPORT FAILED: ${result.error}`;
      return;
    }
    this.game.saveData = result.saveData;
    Storage.save(result.saveData);
    this.game.ui?.refreshCurrencyDisplays?.();
    this.game.ui?.renderMenuPreview?.();
    this.renderCurrency();
  }

  resetSave() {
    if (!confirm('Reset the save file? All progress will be lost.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  /* ---------------------------------------------------------------- *
   *  GOD MODE
   * ---------------------------------------------------------------- */
  syncGodMode() {
    const btn = document.getElementById('dev-god');
    if (btn) {
      btn.classList.toggle('on', this.godMode);
      btn.textContent = this.godMode ? 'GOD MODE ✓' : 'GOD MODE';
    }
    const p = this.game.player;
    if (p) p.devGodMode = this.godMode;
  }

  // Called each frame by the game loop so god mode keeps the player alive.
  tick() {
    if (!this.godMode) return;
    const p = this.game.player;
    if (!p) return;
    p.devGodMode = true;
    p.hp = p.maxHp;
    p.shield = p.maxShield;
  }
}

export default DevPanel;
