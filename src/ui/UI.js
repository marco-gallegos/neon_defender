// UI Screen Management, Shop Rendering, Hangar, and HUD Updates
import { UPGRADES, SHIPS, SECTORS, SECONDARY_WEAPONS, PRIMARY_WEAPONS, ARENA_CHECKPOINT_INTERVAL } from '../systems/UpgradeSystem.js';
import { CATEGORIES, EQUIP_SLOTS, TIER_META, formatEffect, disassembleValue, tierUpRequirement, findMergePartner, applyTierUp, fuseSSItems, S_FUSION_COST, EFFECT_TABLE } from '../systems/Equipment.js';
import { computeStatBreakdown } from '../systems/StatBreakdown.js';
import { ENEMY_TYPES } from '../entities/Enemy.js';
import { Renderer } from '../engine/Renderer.js';
import { audio, TRACK_NAMES } from '../engine/Audio.js';
import { Storage } from '../engine/Storage.js';
import {
  serializeSave, parseSave, describeSave, saveFilename,
  copyText, readClipboard, downloadSave, shareSave, canShare, readFileAsText
} from '../engine/SaveTransfer.js';

// Format one source line of a stat breakdown, respecting the stat's unit kind.
function formatBreakdownValue(line, group) {
  const v = Number(line.value) || 0;
  const stat = EFFECT_TABLE[line.stat];
  // Percentage-style stats
  if (group.unit === '%' || (stat && stat.kind === 'pct') || /Resist|Speed|Luck|Score|Aura|Chance/.test(group.title)) {
    const p = Math.round(v * 100);
    return `${p >= 0 ? '+' : ''}${p}%`;
  }
  if (group.unit === 'px') return `${Math.round(v)}px`;
  if (group.unit === 'shots/s') return v.toFixed(2);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

export class UIManager {
  constructor(game) {
    this.game = game;

    // Screens
    this.screens = {
      menu: document.getElementById('screen-main-menu'),
      campaign: document.getElementById('screen-campaign'),
      arena: document.getElementById('screen-arena'),
      shop: document.getElementById('screen-shop'),
      hangar: document.getElementById('screen-hangar'),
      arsenal: document.getElementById('screen-arsenal'),
      training: document.getElementById('screen-training'),
      settings: document.getElementById('screen-settings'),
      pause: document.getElementById('screen-pause'),
      gameover: document.getElementById('screen-gameover'),
      victory: document.getElementById('screen-victory'),
      hud: document.getElementById('hud')
    };

    // HUD Elements
    this.hudHpFill = document.getElementById('hp-bar-fill');
    this.hudHpText = document.getElementById('hp-text');
    this.hudShieldFill = document.getElementById('shield-bar-fill');
    this.hudShieldText = document.getElementById('shield-text');
    this.hudModeTitle = document.getElementById('hud-mode-title');
    this.hudWaveText = document.getElementById('hud-wave-text');
    this.hudShards = document.getElementById('hud-shards');
    this.hudPower = document.getElementById('power-indicator');
    this.bombCooldownOverlay = document.getElementById('bomb-cooldown-overlay');
    this.secondaryBtn = document.getElementById('btn-secondary');
    this.secondaryIcon = document.getElementById('secondary-icon');
    this.secondaryLabel = document.getElementById('secondary-label');
    this.secondaryCooldownOverlay = document.getElementById('secondary-cooldown-overlay');
    this.selectedSecondaryBadge = document.getElementById('selected-secondary-badge');
    this.bossBarWrap = document.getElementById('boss-bar-wrap');
    this.bossName = document.getElementById('boss-name');
    this.bossHpPct = document.getElementById('boss-hp-pct');
    this.bossBarFill = document.getElementById('boss-bar-fill');
    this.bannerNotice = document.getElementById('banner-notice');

    this.currentShopTab = 'systems';
    this.currentArsenalTab = 'shield';

    this.bindEvents();
    this.refreshCurrencyDisplays();
    this.renderMenuPreview();
  }

  showScreen(screenKey) {
    Object.values(this.screens).forEach(s => {
      if (s) {
        s.classList.remove('active');
        s.classList.add('hidden');
      }
    });

    if (this.screens[screenKey]) {
      this.screens[screenKey].classList.remove('hidden');
      this.screens[screenKey].classList.add('active');
    }

    if (screenKey === 'hud') {
      this.screens.hud.classList.remove('hidden');
      this._lastHudLoot = undefined; // don't flash counters when a run starts
      this.refreshHudCurrency();
    }

    this.refreshCurrencyDisplays();
  }

  bindEvents() {
    // Menu navigation
    document.getElementById('btn-play-campaign').onclick = () => {
      audio.playClick();
      this.renderCampaignSectors();
      this.showScreen('campaign');
    };

    document.getElementById('btn-play-arena').onclick = () => {
      audio.playClick();
      this.renderArenaCheckpoints();
      this.showScreen('arena');
    };

    document.getElementById('btn-open-shop').onclick = () => {
      audio.playClick();
      this.renderShop();
      this.showScreen('shop');
      // Reset tab state
      this.switchShopTab('systems');
    };

    document.getElementById('btn-open-hangar').onclick = () => {
      audio.playClick();
      this.renderHangar();
      this.showScreen('hangar');
    };

    document.getElementById('btn-open-arsenal').onclick = () => {
      audio.playClick();
      this.renderArsenal();
      this.showScreen('arsenal');
    };

    document.getElementById('btn-open-training').onclick = () => {
      audio.playClick();
      this.renderTraining();
      this.showScreen('training');
    };

    document.getElementById('btn-open-settings').onclick = () => {
      audio.playClick();
      this.showScreen('settings');
    };

    // Back buttons
    document.getElementById('btn-campaign-back').onclick = () => {
      audio.playClick();
      this.renderMenuPreview();
      this.showScreen('menu');
    };

    document.getElementById('btn-arena-back').onclick = () => {
      audio.playClick();
      this.renderMenuPreview();
      this.showScreen('menu');
    };

    document.getElementById('btn-shop-back').onclick = () => {
      audio.playClick();
      this.renderMenuPreview();
      this.showScreen('menu');
    };

    document.getElementById('btn-hangar-back').onclick = () => {
      audio.playClick();
      this.renderMenuPreview();
      this.showScreen('menu');
    };

    document.getElementById('btn-arsenal-back').onclick = () => {
      audio.playClick();
      this.renderMenuPreview();
      this.showScreen('menu');
    };

    document.getElementById('btn-training-back').onclick = () => {
      audio.playClick();
      this.renderMenuPreview();
      this.showScreen('menu');
    };

    // Training range: enter the sandbox stage.
    // (Clearing targets lives on the in-run HUD panel, not here.)
    const trainingStart = document.getElementById('btn-training-start');
    if (trainingStart) {
      trainingStart.onclick = () => {
        audio.playClick();
        this.game.startRun('TRAINING');
      };
    }

    document.getElementById('btn-settings-back').onclick = () => {
      audio.playClick();
      this.showScreen('menu');
    };

    // Ingame Buttons
    document.getElementById('btn-pause').onclick = () => {
      audio.playClick();
      this.game.pauseGame();
      this.showScreen('pause');
    };

    document.getElementById('btn-bomb').onclick = () => {
      if (this.game.player) {
        this.game.input.empTriggered = true;
      }
    };

    const secBtn = document.getElementById('btn-secondary');
    if (secBtn) {
      secBtn.onclick = () => {
        if (this.game.player) {
          this.game.input.secondaryTriggered = true;
        }
      };
    }

    // Workshop Tabs
    const tabSystems = document.getElementById('tab-shop-systems');
    const tabSecondaries = document.getElementById('tab-shop-secondaries');
    const tabPrimaries = document.getElementById('tab-shop-primaries');
    if (tabSystems) tabSystems.onclick = () => { audio.playClick(); this.switchShopTab('systems'); };
    if (tabSecondaries) tabSecondaries.onclick = () => { audio.playClick(); this.switchShopTab('secondaries'); };
    if (tabPrimaries) tabPrimaries.onclick = () => { audio.playClick(); this.switchShopTab('primaries'); };

    // Arsenal category tabs
    const arsenalTabs = ['shield', 'gun', 'material', 'drone', 'skin'];
    arsenalTabs.forEach(cat => {
      const btn = document.getElementById(`tab-arsenal-${cat}`);
      if (btn) btn.onclick = () => { audio.playClick(); this.switchArsenalTab(cat); };
    });

    // Primary mode switch pill (HUD)
    const primBtn = document.getElementById('btn-primary-mode');
    if (primBtn) {
      primBtn.onclick = () => {
        if (this.game.player && typeof this.game.player.cyclePrimaryWeapon === 'function') {
          this.game.player.cyclePrimaryWeapon();
        }
      };
    }

    // Pause Modal Buttons
    document.getElementById('btn-resume').onclick = () => {
      audio.playClick();
      this.showScreen('hud');
      this.game.resumeGame();
    };

    document.getElementById('btn-pause-restart').onclick = () => {
      audio.playClick();
      this.game.restartRun();
    };

    document.getElementById('btn-pause-quit').onclick = () => {
      audio.playClick();
      this.game.quitToMenu();
    };

    // Game Over Buttons
    document.getElementById('btn-retry').onclick = () => {
      audio.playClick();
      this.game.restartRun();
    };

    // Arena checkpoint resume (only visible when a checkpoint is unlocked)
    const cpResumeBtn = document.getElementById('btn-retry-checkpoint');
    if (cpResumeBtn) {
      cpResumeBtn.onclick = () => {
        audio.playClick();
        const wave = Number(this.checkpointResumeWave) || 0;
        if (wave >= ARENA_CHECKPOINT_INTERVAL) {
          this.game.startRun('ARENA', 1, wave);
        } else {
          this.game.startRun('ARENA');
        }
      };
    }

    document.getElementById('btn-gameover-shop').onclick = () => {
      audio.playClick();
      this.renderShop();
      this.showScreen('shop');
    };

    document.getElementById('btn-gameover-menu').onclick = () => {
      audio.playClick();
      this.renderMenuPreview();
      this.showScreen('menu');
    };

    // Victory Buttons
    document.getElementById('btn-next-sector').onclick = () => {
      audio.playClick();
      const nextId = this.game.currentSectorId + 1;
      if (nextId <= SECTORS.length) {
        this.game.startRun('CAMPAIGN', nextId);
      } else {
        this.game.startRun('ARENA');
      }
    };

    document.getElementById('btn-victory-shop').onclick = () => {
      audio.playClick();
      this.renderShop();
      this.showScreen('shop');
    };

    document.getElementById('btn-victory-menu').onclick = () => {
      audio.playClick();
      this.renderMenuPreview();
      this.showScreen('menu');
    };

    // Settings Audio Toggles
    const sfxBtn = document.getElementById('btn-toggle-sfx');
    const musicBtn = document.getElementById('btn-toggle-music');

    sfxBtn.onclick = () => {
      audio.playClick();
      this.game.saveData.settings.sfx = !this.game.saveData.settings.sfx;
      audio.setSfxEnabled(this.game.saveData.settings.sfx);
      sfxBtn.classList.toggle('active', this.game.saveData.settings.sfx);
      sfxBtn.textContent = this.game.saveData.settings.sfx ? 'ON' : 'OFF';
      Storage.save(this.game.saveData);
    };

    musicBtn.onclick = () => {
      audio.playClick();
      this.game.saveData.settings.music = !this.game.saveData.settings.music;
      audio.setMusicEnabled(this.game.saveData.settings.music);
      musicBtn.classList.toggle('active', this.game.saveData.settings.music);
      musicBtn.textContent = this.game.saveData.settings.music ? 'ON' : 'OFF';
      Storage.save(this.game.saveData);
    };

    // HUD loot counter visibility (in-game ◆ button + settings row share one setting)
    const currencyBtn = document.getElementById('btn-hud-currency');
    const currencyToggle = document.getElementById('btn-toggle-hud-currency');
    const toggleHudCurrency = () => {
      audio.playClick();
      this.game.saveData.settings.hudCurrency = !this.game.saveData.settings.hudCurrency;
      Storage.save(this.game.saveData);
      this.refreshHudCurrency();
    };
    if (currencyBtn) currencyBtn.onclick = toggleHudCurrency;
    if (currencyToggle) currencyToggle.onclick = toggleHudCurrency;

    // Re-hide the loot counters after a pickup flash
    const currencyGroup = document.getElementById('hud-currency');
    if (currencyGroup) {
      currencyGroup.addEventListener('animationend', () => {
        currencyGroup.classList.remove('flash');
        if (this.game?.saveData?.settings?.hudCurrency !== true) {
          currencyGroup.classList.add('hidden');
        }
      });
    }

    // Reflect saved toggle states in the settings screen
    this.syncSettingsToggles();

    // Reset Data
    document.getElementById('btn-reset-data').onclick = () => {
      if (confirm('Reset all progress, upgrades, and unlocked ships?')) {
        this.game.saveData = Storage.reset();
        this.renderMenuPreview();
        this.refreshCurrencyDisplays();
        this.syncSettingsToggles();
        alert('Save data reset successfully!');
      }
    };

    this.setupSaveTransfer();
  }

  /* ------------------------------------------------------------------ *
   *  SAVE TRANSFER — export / import the save as portable JSON
   * ------------------------------------------------------------------ */
  setupSaveTransfer() {
    const exportBtn = document.getElementById('btn-export-save');
    if (!exportBtn) return;

    const exportArea = document.getElementById('save-export-text');
    const importArea = document.getElementById('save-import-text');
    const statusEl = document.getElementById('transfer-status');
    const summaryEl = document.getElementById('transfer-summary');
    const copyBtn = document.getElementById('btn-copy-save');
    const shareBtn = document.getElementById('btn-share-save');
    const downloadBtn = document.getElementById('btn-download-save');
    const pasteBtn = document.getElementById('btn-paste-import');
    const fileBtn = document.getElementById('btn-file-import');
    const doImportBtn = document.getElementById('btn-do-import');
    const fileInput = document.getElementById('save-import-file');

    const setStatus = (msg, kind = '') => {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.className = `transfer-status ${kind}`.trim();
    };

    const refreshSummary = () => {
      if (summaryEl) {
        summaryEl.innerHTML = `CURRENT SAVE: ${describeSave(this.game.saveData)}`;
      }
    };

    const setExportEnabled = (on) => {
      if (copyBtn) copyBtn.disabled = !on;
      if (downloadBtn) downloadBtn.disabled = !on;
    };

    refreshSummary();
    setExportEnabled(false);
    if (shareBtn) shareBtn.classList.toggle('hidden', !canShare());

    // --- Export ---
    exportBtn.onclick = () => {
      const json = serializeSave(this.game.saveData);
      if (exportArea) {
        exportArea.value = json;
        exportArea.removeAttribute('readonly');
        exportArea.focus();
        exportArea.setSelectionRange(0, exportArea.value.length);
      }
      setExportEnabled(true);
      setStatus('Save generated. Copy it, download it, or share it.', 'ok');
      audio.playPowerup();
    };

    copyBtn.onclick = async () => {
      const text = exportArea?.value || serializeSave(this.game.saveData);
      const ok = await copyText(text);
      if (ok) {
        setStatus('Copied to clipboard. Paste it into a message or notes app.', 'ok');
        audio.playPowerup();
      } else {
        setStatus('Could not copy automatically — select the text above and copy manually.', 'warn');
        exportArea?.focus();
        exportArea?.select();
      }
    };

    downloadBtn.onclick = () => {
      const text = exportArea?.value || serializeSave(this.game.saveData);
      const ok = downloadSave(text, saveFilename(this.game.saveData));
      setStatus(ok ? 'File downloaded.' : 'Download failed — use COPY instead.', ok ? 'ok' : 'warn');
    };

    shareBtn.onclick = async () => {
      const text = exportArea?.value || serializeSave(this.game.saveData);
      const ok = await shareSave(text, 'Neon Defender Save');
      if (!ok) setStatus('Share unavailable — use COPY instead.', 'warn');
    };

    // --- Import ---
    pasteBtn.onclick = async () => {
      const text = await readClipboard();
      if (!text) {
        setStatus('Clipboard unavailable or empty — paste into the box manually.', 'warn');
        return;
      }
      if (importArea) importArea.value = text;
      setStatus('Pasted from clipboard. Press IMPORT to apply it.', 'ok');
    };

    fileBtn.onclick = () => fileInput?.click();

    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const text = await readFileAsText(file);
        if (importArea) importArea.value = text;
        setStatus(`Loaded "${file.name}". Press IMPORT to apply it.`, 'ok');
      } catch (e) {
        setStatus(`Could not read the file: ${e.message}`, 'error');
      }
      if (fileInput) fileInput.value = '';
    };

    doImportBtn.onclick = () => {
      const text = importArea?.value || '';
      const result = parseSave(text);
      if (!result.ok) {
        setStatus(result.error || 'Import failed.', 'error');
        return;
      }
      const summary = describeSave(result.saveData);
      if (!confirm(`Import this save?\n\n${summary}\n\nThis REPLACES your current progress.`)) {
        setStatus('Import cancelled.', 'warn');
        return;
      }
      Storage.save(result.saveData);
      this.game.saveData = Storage.load();
      setStatus('Save imported! Reloading…', 'ok');
      audio.playPowerup();
      setTimeout(() => location.reload(), 600);
    };
  }

  refreshCurrencyDisplays() {
    const rawAmt = Number(this.game?.saveData?.shards);
    const amt = (Number.isFinite(rawAmt) && rawAmt >= 0) ? Math.round(rawAmt) : 0;
    ['menu-shards', 'campaign-shards', 'shop-shards', 'hangar-shards', 'arsenal-shards'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = amt.toLocaleString();
    });

    const rawCrystals = Number(this.game?.saveData?.crystals);
    const crystals = (Number.isFinite(rawCrystals) && rawCrystals >= 0) ? Math.round(rawCrystals) : 0;
    ['menu-crystals', 'campaign-crystals', 'shop-crystals', 'hangar-crystals', 'arsenal-crystals'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = crystals.toLocaleString();
    });
  }

  // Sync the settings-screen toggle buttons with saved settings.
  syncSettingsToggles() {
    const sfx = this.game?.saveData?.settings?.sfx !== false;
    const music = this.game?.saveData?.settings?.music !== false;
    const sfxBtn = document.getElementById('btn-toggle-sfx');
    const musicBtn = document.getElementById('btn-toggle-music');
    if (sfxBtn) {
      sfxBtn.classList.toggle('active', sfx);
      sfxBtn.textContent = sfx ? 'ON' : 'OFF';
    }
    if (musicBtn) {
      musicBtn.classList.toggle('active', music);
      musicBtn.textContent = music ? 'ON' : 'OFF';
    }
    this.refreshHudCurrency();
  }

  // Apply the loot-counter visibility setting to the in-game HUD + settings row.
  refreshHudCurrency() {
    const enabled = this.game?.saveData?.settings?.hudCurrency === true;
    const group = document.getElementById('hud-currency');
    const btn = document.getElementById('btn-hud-currency');
    const settingsBtn = document.getElementById('btn-toggle-hud-currency');
    if (group) {
      group.classList.remove('flash');
      group.classList.toggle('hidden', !enabled);
    }
    if (btn) btn.classList.toggle('active', enabled);
    if (settingsBtn) {
      settingsBtn.classList.toggle('active', enabled);
      settingsBtn.textContent = enabled ? 'ON' : 'OFF';
    }
  }

  // Briefly flash the loot counters when they are hidden and loot is picked up.
  flashHudCurrency() {
    if (this.game?.saveData?.settings?.hudCurrency === true) return; // always visible anyway
    const group = document.getElementById('hud-currency');
    if (!group || !group.classList.contains('hidden')) return;
    group.classList.remove('hidden');
    group.classList.remove('flash');
    void group.offsetWidth; // restart the animation
    group.classList.add('flash');
  }

  renderMenuPreview() {
    const previewCanvas = document.getElementById('shipPreviewCanvas');
    const currentShip = SHIPS[this.game.saveData.equippedShip] || SHIPS.alpha_dart;
    const nameEl = document.getElementById('selected-ship-name');
    if (nameEl) nameEl.textContent = currentShip.name;
    Renderer.drawShipPreview(previewCanvas, currentShip);

    // Compact ship stats strip (Speed / Damage / Shield / Shard)
    const statsEl = document.getElementById('menu-ship-stats');
    if (statsEl) {
      const s = currentShip.stats || {};
      statsEl.innerHTML = `
        <span class="mstat"><b>SPD</b> ${Math.round((s.speedMult ?? 1) * 100)}%</span>
        <span class="mstat"><b>DMG</b> ${Math.round((s.damageMult ?? 1) * 100)}%</span>
        <span class="mstat"><b>SHD</b> ${Math.round((s.shieldMult ?? 1) * 100)}%</span>
        <span class="mstat"><b>◆</b> ${Math.round((s.shardBonus ?? 1) * 100)}%</span>
      `;
    }

    // Show equipped primary weapon badge
    const primId = this.game.saveData.equippedPrimary || 'plasma';
    const primDef = PRIMARY_WEAPONS[primId];
    const primaryBadge = document.getElementById('selected-primary-badge');
    if (primaryBadge && primDef) {
      primaryBadge.textContent = `${primDef.icon} ${primDef.name}`;
    }

    // Show equipped secondary weapon badge
    const secId = this.game.saveData.equippedSecondary || 'seeker';
    const secDef = SECONDARY_WEAPONS[secId];
    if (this.selectedSecondaryBadge && secDef) {
      this.selectedSecondaryBadge.textContent = `${secDef.icon} ${secDef.name}`;
    }

    // Update HUD primary pill if player is active
    const primIcon = document.getElementById('primary-mode-icon');
    const primLabel = document.getElementById('primary-mode-label');
    if (primIcon && primDef) primIcon.textContent = primDef.icon;
    if (primLabel && primDef) primLabel.textContent = primDef.shortName;
  }

  // Render Campaign Sectors
  renderCampaignSectors() {
    const container = document.getElementById('sectors-container');
    container.innerHTML = '';

    SECTORS.forEach(sec => {
      const secData = this.game.saveData.sectors[sec.id] || { unlocked: sec.id === 1, stars: 0 };
      const isUnlocked = secData.unlocked;

      const card = document.createElement('div');
      card.className = `sector-card ${isUnlocked ? 'unlocked' : 'locked'}`;

      let starsHtml = '';
      for (let s = 1; s <= 3; s++) {
        starsHtml += s <= secData.stars ? '★' : '☆';
      }

      const threat = Math.max(1, Math.min(5, sec.threat || 1));
      const threatHtml = `<span class="sector-threat">${'☠'.repeat(threat)}</span>`;

      card.innerHTML = `
        <div class="sector-info">
          <h3>${sec.name}</h3>
          <p>${sec.subtitle} • Boss: ${sec.bossName}</p>
          <div class="sector-threat-row">THREAT ${threatHtml}</div>
        </div>
        <div style="text-align: right;">
          <div class="sector-stars">${isUnlocked ? starsHtml : '🔒 LOCKED'}</div>
          <div style="font-size: 0.75rem; color: var(--neon-cyan); margin-top: 4px;">Reward: +${sec.rewardShards} ◆</div>
        </div>
      `;

      if (isUnlocked && sec.color) {
        card.style.borderColor = sec.color;
        card.style.boxShadow = `inset 0 0 18px ${sec.color}22`;
      }

      if (isUnlocked) {
        card.onclick = () => {
          audio.playClick();
          this.game.startRun('CAMPAIGN', sec.id);
        };
      }

      container.appendChild(card);
    });
  }

  // Render Arena checkpoint selector — resume from a cleared wave multiple.
  renderArenaCheckpoints() {
    this.refreshCurrencyDisplays();
    const container = document.getElementById('arena-checkpoints-container');
    if (!container) return;
    container.innerHTML = '';

    const saved = Number(this.game.saveData.arenaStats?.checkpoint) || 0;
    const unlockedWave = Math.floor(saved / ARENA_CHECKPOINT_INTERVAL) * ARENA_CHECKPOINT_INTERVAL;
    const bestWave = Number(this.game.saveData.arenaStats?.bestWave) || 0;
    // Weapon level banked at the highest checkpoint — restored on resume.
    const bankedWeaponLevel = Math.min(5, Math.max(1,
      Number(this.game.saveData.arenaStats?.weaponLevel) || 1));

    // Wave 1 is always available; then every checkpoint up to the unlocked one.
    // Offer a peek at the next checkpoint so players see there's something to chase.
    const nextCheckpoint = unlockedWave + ARENA_CHECKPOINT_INTERVAL;

    const makeCard = (wave, unlocked, label, sub) => {
      const card = document.createElement('div');
      card.className = `sector-card ${unlocked ? 'unlocked' : 'locked'}`;

      const bossWave = wave % 5 === 0; // arena bosses land on multiples of 5
      card.innerHTML = `
        <div class="sector-info">
          <h3>${label}</h3>
          <p>${sub}</p>
          <div class="sector-threat-row">
            ${wave > 1 ? `THREAT ${'☠'.repeat(Math.max(1, Math.min(5, Math.ceil(wave / 10))))}` : 'STARTING LINE'}
            ${bossWave && wave > 1 ? ' • <span style="color:var(--neon-magenta)">BOSS WAVE</span>' : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="sector-stars">${unlocked ? '▶ PLAY' : '🔒 LOCKED'}</div>
          ${wave === bestWave && bestWave > 0 ? `<div style="font-size:0.75rem;color:var(--neon-cyan);margin-top:4px;">BEST ${bestWave}</div>` : ''}
        </div>
      `;

      if (unlocked && wave === unlockedWave && wave > 1) {
        card.style.borderColor = 'var(--neon-lime)';
        card.style.boxShadow = 'inset 0 0 18px rgba(57, 255, 20, 0.18)';
      }

      if (unlocked) {
        card.onclick = () => {
          audio.playClick();
          this.game.startRun('ARENA', 1, wave);
        };
      }
      container.appendChild(card);
    };

    makeCard(1, true, 'WAVE 1', 'Fresh run from the beginning.');

    for (let w = ARENA_CHECKPOINT_INTERVAL; w <= unlockedWave; w += ARENA_CHECKPOINT_INTERVAL) {
      // The top checkpoint is the one you'd actually resume from, so it shows
      // the weapon level banked there.
      const isTop = w === unlockedWave;
      const sub = (isTop && bankedWeaponLevel > 1)
        ? `Resume from checkpoint ${w / ARENA_CHECKPOINT_INTERVAL} • weapon Lv${bankedWeaponLevel}`
        : `Resume from checkpoint ${w / ARENA_CHECKPOINT_INTERVAL}.`;
      makeCard(w, true, `WAVE ${w}`, sub);
    }

    // Locked preview of the next checkpoint
    makeCard(nextCheckpoint, false, `WAVE ${nextCheckpoint}`, `Reach wave ${nextCheckpoint} to unlock.`);
  }

  /* ------------------------------------------------------------------ *
   *  TRAINING RANGE — itemized stat breakdown + practice targets
   * ------------------------------------------------------------------ */
  renderTraining() {
    this.refreshCurrencyDisplays();
    const saveData = this.game.saveData;
    const breakdown = computeStatBreakdown(saveData);

    // --- Ship header ---
    const canvas = document.getElementById('training-ship-canvas');
    if (canvas) Renderer.drawShipPreview(canvas, breakdown.ship);
    const nameEl = document.getElementById('training-ship-name');
    if (nameEl) nameEl.textContent = breakdown.ship.name;
    const passiveEl = document.getElementById('training-ship-passive');
    if (passiveEl) passiveEl.textContent = breakdown.ship.perkText || '';
    const weaponsEl = document.getElementById('training-ship-weapons');
    if (weaponsEl) {
      const prim = PRIMARY_WEAPONS[saveData.equippedPrimary || 'plasma'];
      const sec = SECONDARY_WEAPONS[saveData.equippedSecondary || 'seeker'];
      weaponsEl.textContent = `${prim?.icon || '🔫'} ${prim?.name || '—'} • ${sec?.icon || '🚀'} ${sec?.name || '—'}`;
    }

    // --- Stat cards ---
    this.renderTrainingStats(breakdown);

    // --- Spawn buttons ---
    const spawnContainer = document.getElementById('training-spawn-container');
    if (spawnContainer) {
      spawnContainer.innerHTML = '';
      this.buildTrainingSpawnButtons(spawnContainer, 'menu');
    }

    // --- Clear button reflects live target count ---
    const shardEl = document.getElementById('training-shards');
    if (shardEl) shardEl.textContent = (Number(saveData.shards) || 0).toLocaleString();
  }

  // Build one spawn button per enemy type (plus the practice boss) into a
  // container. Shared by the menu preview and the in-run HUD panel.
  buildTrainingSpawnButtons(container, variant = 'menu') {
    if (!container) return;
    container.innerHTML = '';

    Object.entries(ENEMY_TYPES).forEach(([key, def]) => {
      const btn = document.createElement('button');
      btn.className = 'training-spawn-btn';
      btn.style.borderColor = def.color;
      btn.innerHTML = `
        <span class="spawn-dot" style="background:${def.color}"></span>
        <span class="spawn-name">${def.name}</span>
        <span class="spawn-hp">${def.hp} HP</span>
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        this.spawnTrainingTarget(key);
      };
      container.appendChild(btn);
    });

    // Practice boss
    const bossBtn = document.createElement('button');
    bossBtn.className = 'training-spawn-btn boss-spawn';
    bossBtn.innerHTML = `
      <span class="spawn-dot" style="background:#ff007f"></span>
      <span class="spawn-name">PRACTICE TITAN</span>
      <span class="spawn-hp">5000 HP</span>
    `;
    bossBtn.onclick = (e) => {
      e.stopPropagation();
      this.spawnTrainingTarget(null);
    };
    container.appendChild(bossBtn);
  }

  // Spawn a practice target from either the menu or the in-run HUD panel.
  // From the menu this enters the range first, so the button always does
  // something visible instead of silently failing.
  spawnTrainingTarget(typeKey) {
    audio.playClick();
    if (this.game.currentMode !== 'TRAINING') {
      this.game.startRun('TRAINING');
    }
    if (typeKey) {
      this.game.spawnTrainingEnemy(typeKey, 1);
    } else {
      this.game.spawnTrainingBoss({ name: 'PRACTICE TITAN', hp: 5000, color: '#ff007f' });
    }
  }

  // Render one card per stat group, each listing every contributing source.
  renderTrainingStats(breakdown) {
    const container = document.getElementById('training-stats-container');
    if (!container) return;
    container.innerHTML = '';

    breakdown.groups.forEach(group => {
      const card = document.createElement('div');
      card.className = 'stat-detail-card';

      const linesHtml = (group.lines || []).map(l => {
        const isZero = !l.value;
        return `
          <div class="stat-source-row kind-${l.kind}">
            <span class="source-label">${l.label}</span>
            ${l.detail ? `<span class="source-detail">${l.detail}</span>` : ''}
            <span class="source-value ${isZero ? 'zero' : ''}">${formatBreakdownValue(l, group)}</span>
          </div>
        `;
      }).join('');

      card.innerHTML = `
        <div class="stat-detail-head">
          <span class="stat-detail-title">${group.title}</span>
          <span class="stat-detail-total">${group.display}${group.unit && group.unit !== '%' ? ` <small>${group.unit}</small>` : ''}</span>
        </div>
        <div class="stat-source-list">${linesHtml}</div>
        ${!group.isList && group.formula ? `<div class="stat-formula">= ${group.formula}</div>` : ''}
        ${group.extra ? `<div class="stat-extra">${group.extra.label}: <b>${group.extra.display}</b></div>` : ''}
        ${this.renderContributionBar(group)}
      `;

      container.appendChild(card);
    });
  }

  // A tiny stacked bar showing how much each source contributes to a total.
  renderContributionBar(group) {
    const parts = (group.parts || []).filter(p => Math.abs(p.value) > 0.0001);
    if (!parts.length) return '';
    const total = parts.reduce((sum, p) => sum + Math.abs(p.value), 0);
    if (total <= 0) return '';
    const colors = { Ship: '#9d00ff', Upgrades: '#00f0ff', Equipment: '#39ff14', Drones: '#ff7700' };
    const segs = parts.map(p => {
      const w = (Math.abs(p.value) / total) * 100;
      const c = colors[p.label] || '#8892b0';
      return `<div class="contrib-seg" style="width:${w}%;background:${c}" title="${p.label}"></div>`;
    }).join('');
    const legend = parts.map(p => {
      const c = colors[p.label] || '#8892b0';
      return `<span class="contrib-legend"><i style="background:${c}"></i>${p.label}</span>`;
    }).join('');
    return `<div class="contrib-bar">${segs}</div><div class="contrib-legend-row">${legend}</div>`;
  }

  // Render Workshop Upgrades
  renderShop() {
    this.refreshCurrencyDisplays();
    const container = document.getElementById('shop-items-container');
    container.innerHTML = '';

    Object.values(UPGRADES).forEach(upg => {
      const currentLvl = this.game.saveData.upgrades[upg.id] || (upg.id === 'drones' ? 0 : 1);
      const isMax = currentLvl >= upg.maxLevel;
      const cost = isMax ? 0 : upg.getCost(currentLvl);
      const canAfford = this.game.saveData.shards >= cost;

      const itemEl = document.createElement('div');
      itemEl.className = 'shop-item';

      // Level pips
      let pipsHtml = '';
      for (let i = 1; i <= upg.maxLevel; i++) {
        const isFilled = i <= currentLvl;
        pipsHtml += `<div class="level-pip ${isFilled ? 'filled' : ''}"></div>`;
      }

      itemEl.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-title">
            <span>${upg.icon} ${upg.name}</span>
            <span style="font-size: 0.75rem; color: var(--neon-cyan);">LVL ${currentLvl}/${upg.maxLevel}</span>
          </div>
          <div class="shop-item-desc">${upg.desc}</div>
          <div class="shop-level-bar">${pipsHtml}</div>
        </div>
        <div>
          ${isMax 
            ? `<button class="neon-btn shop-buy-btn maxed" disabled>MAXED</button>`
            : `<button class="neon-btn shop-buy-btn ${canAfford ? 'primary-btn' : 'secondary-btn'}" id="buy-btn-${upg.id}">
                ${cost} ◆
               </button>`
          }
        </div>
      `;

      if (!isMax) {
        const btn = itemEl.querySelector(`#buy-btn-${upg.id}`);
        btn.onclick = () => {
          if (this.game.saveData.shards >= cost) {
            audio.playPowerup();
            this.game.saveData.shards -= cost;
            this.game.saveData.upgrades[upg.id] = currentLvl + 1;
            Storage.save(this.game.saveData);
            this.renderShop();
          } else {
            audio.playShieldHit();
            alert('Not enough Shards! Play Endless Arena to harvest more!');
          }
        };
      }

      container.appendChild(itemEl);
    });
  }

  // Render Secondary Arsenal (unlock / equip / upgrade)
  renderSecondaryArsenal() {
    this.refreshCurrencyDisplays();
    const container = document.getElementById('shop-secondaries-container');
    if (!container) return;
    container.innerHTML = '';

    const saveData = this.game.saveData;
    const equippedId = saveData.equippedSecondary || 'seeker';
    const unlockedList = saveData.unlockedSecondaries || ['seeker'];

    Object.values(SECONDARY_WEAPONS).forEach(sec => {
      const isUnlocked = unlockedList.includes(sec.id);
      const isEquipped = equippedId === sec.id;
      const currentLvl = saveData.secondaryUpgrades?.[sec.id] || 1;
      const isMax = currentLvl >= sec.maxLevel;
      const upgradeCost = isMax ? 0 : sec.getCost(currentLvl);
      const canAffordUpgrade = saveData.shards >= upgradeCost;
      const canAffordUnlock = saveData.shards >= sec.cost;

      const card = document.createElement('div');
      card.className = `secondary-card ${isEquipped ? 'equipped' : ''}`;

      const stats = sec.getStats(currentLvl);
      let statsHtml = '';
      if (sec.id === 'seeker')  statsHtml = `<span>DMG: ${stats.damage}</span><span>COUNT: ${stats.count}</span><span>CD: ${stats.cooldown.toFixed(1)}s</span>`;
      else if (sec.id === 'railgun') statsHtml = `<span>DMG: ${stats.damage}</span><span>WIDTH: ${stats.beamWidth}px</span><span>CD: ${stats.cooldown.toFixed(1)}s</span>`;
      else if (sec.id === 'cluster') statsHtml = `<span>SHELL: ${stats.shellDamage}</span><span>SHARDS: ${stats.shrapnelCount}</span><span>CD: ${stats.cooldown.toFixed(1)}s</span>`;
      else if (sec.id === 'vortex') statsHtml = `<span>DMG: ${stats.damage}</span><span>RADIUS: ${stats.radius}px</span><span>CD: ${stats.cooldown.toFixed(1)}s</span>`;

      let pipsHtml = '';
      for (let i = 1; i <= sec.maxLevel; i++) {
        pipsHtml += `<div class="level-pip ${i <= currentLvl ? 'filled' : ''}"></div>`;
      }

      let actionsHtml = '';
      if (!isUnlocked) {
        actionsHtml = `<button class="neon-btn shop-buy-btn ${canAffordUnlock ? 'primary-btn' : 'secondary-btn'}" id="unlock-sec-${sec.id}">🔓 ${sec.cost} ◆</button>`;
      } else {
        if (isEquipped) {
          actionsHtml = `<span style="color:var(--neon-lime);font-family:var(--font-display);font-size:0.8rem;">✓ EQUIPPED</span>`;
        } else {
          actionsHtml += `<button class="neon-btn mini-btn" id="equip-sec-${sec.id}" style="border-color:var(--neon-lime);color:var(--neon-lime);">EQUIP</button>`;
        }
        if (!isMax) {
          actionsHtml += `<button class="neon-btn shop-buy-btn ${canAffordUpgrade ? 'primary-btn' : 'secondary-btn'}" id="upgrade-sec-${sec.id}">↑ ${upgradeCost} ◆</button>`;
        } else {
          actionsHtml += `<button class="neon-btn shop-buy-btn maxed" disabled>MAXED</button>`;
        }
      }

      card.innerHTML = `
        <div class="secondary-card-header">
          <div class="secondary-card-title">
            <span class="secondary-card-icon">${sec.icon}</span>
            <div>
              <div>${sec.name}</div>
              <div style="font-size:0.75rem;color:var(--neon-cyan);">LVL ${currentLvl}/${sec.maxLevel}${isEquipped ? ' · <span style="color:var(--neon-lime)">ACTIVE</span>' : ''}</div>
            </div>
          </div>
        </div>
        <div class="secondary-card-desc">${sec.desc}</div>
        <div class="secondary-stat-row">${statsHtml}</div>
        <div class="shop-level-bar">${pipsHtml}</div>
        <div class="secondary-card-actions">${actionsHtml}</div>
      `;

      if (!isUnlocked) {
        const unlockBtn = card.querySelector(`#unlock-sec-${sec.id}`);
        if (unlockBtn) unlockBtn.onclick = () => {
          if (saveData.shards >= sec.cost) {
            audio.playPowerup();
            saveData.shards -= sec.cost;
            if (!saveData.unlockedSecondaries.includes(sec.id)) saveData.unlockedSecondaries.push(sec.id);
            Storage.save(saveData);
            this.renderSecondaryArsenal();
            this.renderMenuPreview();
          } else {
            audio.playShieldHit();
            alert('Not enough Shards!');
          }
        };
      } else {
        const equipBtn = card.querySelector(`#equip-sec-${sec.id}`);
        if (equipBtn) equipBtn.onclick = () => {
          audio.playClick();
          saveData.equippedSecondary = sec.id;
          Storage.save(saveData);
          this.renderSecondaryArsenal();
          this.renderMenuPreview();
        };
        const upgradeBtn = card.querySelector(`#upgrade-sec-${sec.id}`);
        if (upgradeBtn && !isMax) upgradeBtn.onclick = () => {
          if (saveData.shards >= upgradeCost) {
            audio.playPowerup();
            saveData.shards -= upgradeCost;
            saveData.secondaryUpgrades[sec.id] = currentLvl + 1;
            Storage.save(saveData);
            this.renderSecondaryArsenal();
            this.refreshCurrencyDisplays();
          } else {
            audio.playShieldHit();
            alert('Not enough Shards! Play Endless Arena to harvest more!');
          }
        };
      }

      container.appendChild(card);
    });
  }


  // Render Primary Weapons Shop (switch main gun)
  renderPrimaryShop() {
    this.refreshCurrencyDisplays();
    const container = document.getElementById('shop-primaries-container');
    if (!container) return;
    container.innerHTML = '';

    const saveData = this.game.saveData;
    const equippedId = saveData.equippedPrimary || 'plasma';
    const unlockedList = saveData.unlockedPrimaries || ['plasma'];

    Object.values(PRIMARY_WEAPONS).forEach(prim => {
      const isUnlocked = unlockedList.includes(prim.id);
      const isEquipped = equippedId === prim.id;
      const card = document.createElement('div');
      card.className = `primary-card ${isEquipped ? 'equipped' : ''}`;

      let actionsHtml = '';
      if (isUnlocked) {
        if (isEquipped) {
          actionsHtml = `<span style="color:var(--neon-lime);font-size:0.8rem;">✓ EQUIPPED</span>`;
        } else {
          actionsHtml = `<button class="neon-btn mini-btn" id="equip-prim-${prim.id}" style="border-color:var(--neon-lime);color:var(--neon-lime);">EQUIP</button>`;
        }
      } else {
        // Placeholder for future unlock cost handling
        actionsHtml = `<button class="neon-btn shop-buy-btn secondary-btn" disabled>LOCKED</button>`;
      }

      card.innerHTML = `
        <div class="primary-card-header">
          <span class="primary-card-icon">${prim.icon}</span>
          <div>
            <div>${prim.name}</div>
            <div style="font-size:0.75rem;color:var(--neon-cyan);">${prim.shortName}</div>
          </div>
        </div>
        <div class="primary-card-desc">${prim.desc}</div>
        <div class="primary-card-actions">${actionsHtml}</div>
      `;

      if (isUnlocked && !isEquipped) {
        const equipBtn = card.querySelector(`#equip-prim-${prim.id}`);
        if (equipBtn) {
          equipBtn.onclick = () => {
            audio.playClick();
            saveData.equippedPrimary = prim.id;
            Storage.save(saveData);
            this.renderPrimaryShop();
            this.renderMenuPreview();
          };
        }
      }

      container.appendChild(card);
    });
  }

// Extend switchShopTab to handle primaries
  switchShopTab(tab) {
    this.currentShopTab = tab;
    const systemsContainer = document.getElementById('shop-items-container');
    const secondariesContainer = document.getElementById('shop-secondaries-container');
    const primariesContainer = document.getElementById('shop-primaries-container');
    const tabSystems = document.getElementById('tab-shop-systems');
    const tabSecondaries = document.getElementById('tab-shop-secondaries');
    const tabPrimaries = document.getElementById('tab-shop-primaries');
    const tipEl = document.getElementById('shop-tip-text');

    // Hide all containers first
    if (systemsContainer) {
      systemsContainer.classList.add('hidden');
      systemsContainer.style.display = 'none';
    }
    if (secondariesContainer) {
      secondariesContainer.classList.add('hidden');
      secondariesContainer.style.display = 'none';
    }
    if (primariesContainer) {
      primariesContainer.classList.add('hidden');
      primariesContainer.style.display = 'none';
    }

    // Reset active states
    tabSystems?.classList.remove('active');
    tabSecondaries?.classList.remove('active');
    tabPrimaries?.classList.remove('active');

    if (tab === 'systems') {
      if (systemsContainer) {
        systemsContainer.classList.remove('hidden');
        systemsContainer.style.display = 'flex';
      }
      if (tipEl) tipEl.innerHTML = '💡 Earn unlimited Shards in <b>Arena Mode</b> to max out all upgrades!';
      this.renderShop();
    } else if (tab === 'secondaries') {
      if (secondariesContainer) {
        secondariesContainer.classList.remove('hidden');
        secondariesContainer.style.display = 'flex';
      }
      if (tipEl) tipEl.innerHTML = '🚀 Unlock & equip your Secondary Weapon arsenal — tap to equip!';
      this.renderSecondaryArsenal();
    } else if (tab === 'primaries') {
      if (primariesContainer) {
        primariesContainer.classList.remove('hidden');
        primariesContainer.style.display = 'flex';
      }
      if (tipEl) tipEl.innerHTML = '🔫 Choose your Main Gun — tap to equip!';
      this.renderPrimaryShop();
    }
    if (tabSystems) tabSystems?.classList.toggle('active', tab === 'systems');
    if (tabSecondaries) tabSecondaries?.classList.toggle('active', tab === 'secondaries');
    if (tabPrimaries) tabPrimaries?.classList.toggle('active', tab === 'primaries');
  }


  // ================= ARSENAL (EQUIPMENT) =================

  switchArsenalTab(category) {
    this.currentArsenalTab = category;
    ['shield', 'gun', 'material', 'drone', 'skin'].forEach(cat => {
      const btn = document.getElementById(`tab-arsenal-${cat}`);
      if (btn) btn.classList.toggle('active', cat === category);
    });
    this.renderArsenal();
  }

  // Helper: read equipped id(s) for a category
  getEquippedIds(saveData, category) {
    const eq = saveData.equippedEquipment || {};
    const slots = EQUIP_SLOTS[category] || 1;
    if (slots > 1) {
      const arr = Array.isArray(eq[category]) ? eq[category] : [];
      return Array.from({ length: slots }, (_, i) => arr[i] || null);
    }
    return [eq[category] || null];
  }

  setEquippedSlot(saveData, category, index, itemId) {
    if (!saveData.equippedEquipment) saveData.equippedEquipment = {};
    const slots = EQUIP_SLOTS[category] || 1;
    if (slots > 1) {
      if (!Array.isArray(saveData.equippedEquipment[category])) {
        saveData.equippedEquipment[category] = Array(slots).fill(null);
      }
      saveData.equippedEquipment[category][index] = itemId;
    } else {
      saveData.equippedEquipment[category] = itemId;
    }
  }

  renderArsenal() {
    this.refreshCurrencyDisplays();
    const saveData = this.game.saveData;
    const category = this.currentArsenalTab || 'shield';
    const catMeta = CATEGORIES[category];

    // --- Equipped slots ---
    const slotsContainer = document.getElementById('arsenal-slots-container');
    if (slotsContainer) {
      slotsContainer.innerHTML = '';
      const equippedIds = this.getEquippedIds(saveData, category);
      equippedIds.forEach((id, index) => {
        const item = id ? (saveData.inventory || []).find(it => it && it.id === id) : null;
        const slot = document.createElement('div');
        slot.className = `arsenal-slot ${item ? 'filled' : 'empty'}`;
        if (item) {
          const meta = TIER_META[item.tier] || TIER_META.C;
          slot.style.borderColor = meta.color;
          slot.innerHTML = `
            <div class="arsenal-slot-tier" style="color:${meta.color}">${item.tier}</div>
            <div class="arsenal-slot-icon">${item.icon}</div>
            <div class="arsenal-slot-name">${item.shortName}</div>
          `;
          slot.onclick = () => {
            audio.playClick();
            this.setEquippedSlot(saveData, category, index, null);
            Storage.save(saveData);
            this.renderArsenal();
          };
        } else {
          slot.innerHTML = `<div class="arsenal-slot-empty">SLOT ${index + 1}<br><span>EMPTY</span></div>`;
        }
        slotsContainer.appendChild(slot);
      });
    }

    // --- Inventory list for this category ---
    const container = document.getElementById('arsenal-items-container');
    if (!container) return;
    container.innerHTML = '';

    const equippedIds = this.getEquippedIds(saveData, category).filter(Boolean);
    const items = (saveData.inventory || []).filter(it => it && it.category === category);

    if (items.length === 0) {
      container.innerHTML = `<div class="arsenal-empty-msg">No ${catMeta.name} gear yet — destroy enemies to find drops! 🎁</div>`;
      return;
    }

    // Sort: equipped first, then tier S->C
    const tierOrder = { 'S+': 0, S: 1, A: 2, B: 3, C: 4 };
    items.sort((a, b) => {
      const aEq = equippedIds.includes(a.id) ? 0 : 1;
      const bEq = equippedIds.includes(b.id) ? 0 : 1;
      if (aEq !== bEq) return aEq - bEq;
      return (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9);
    });

    items.forEach(item => {
      const meta = TIER_META[item.tier] || TIER_META.C;
      const isEquipped = equippedIds.includes(item.id);
      const crystalVal = disassembleValue(item);
      const slotsFree = this.getEquippedIds(saveData, category).includes(null);

      // --- Upgrade / merge eligibility ---
      const tierReq = tierUpRequirement(item.tier);           // C/B/A -> next tier
      const partner = tierReq ? null : findMergePartner(saveData.inventory, item); // S/S+ -> merge
      const playerShards = Number(saveData.shards) || 0;
      const playerCrystals = Number(saveData.crystals) || 0;

      let upgradeBtnHtml = '';
      if (tierReq) {
        const afford = playerShards >= tierReq.shards && playerCrystals >= tierReq.crystals;
        upgradeBtnHtml = `<button class="neon-btn mini-btn upgrade-btn ${afford ? '' : 'disabled-look'}" style="border-color:${meta.color};color:${meta.color};"
            title="Upgrade to ${tierReq.nextTier}">⬆ ${tierReq.nextTier} · ${tierReq.shards}◆ ${tierReq.crystals}◆◆</button>`;
      } else if (partner) {
        const afford = playerShards >= S_FUSION_COST.shards && playerCrystals >= S_FUSION_COST.crystals;
        upgradeBtnHtml = `<button class="neon-btn mini-btn merge-btn ${afford ? '' : 'disabled-look'}"
            title="Merge with ${partner.shortName} into S+">🔀 MERGE · ${S_FUSION_COST.shards}◆ ${S_FUSION_COST.crystals}◆◆</button>`;
      } else {
        // S/S+ with no partner — show why the merge is unavailable
        upgradeBtnHtml = `<span class="equip-merge-hint">🔀 MERGE needs another S/S+ ${catMeta.name}</span>`;
      }

      const card = document.createElement('div');
      card.className = `equip-card ${isEquipped ? 'equipped' : ''}`;
      card.style.borderColor = meta.color;

      const effectsHtml = (item.effects || [])
        .map(e => `<span class="equip-effect">${formatEffect(e.stat, e.value)}</span>`)
        .join('');

      card.innerHTML = `
        <div class="equip-card-header">
          <span class="equip-tier-badge" style="background:${meta.color};color:#06091a;">${item.tier}</span>
          <span class="equip-icon">${item.icon}</span>
          <div class="equip-title">
            <div>${item.name}</div>
            <div class="equip-sub">${catMeta.name}${item.fused ? ' · FUSED' : ''}</div>
          </div>
        </div>
        <div class="equip-effects">${effectsHtml}</div>
        <div class="equip-actions">
          ${upgradeBtnHtml}
          ${isEquipped
            ? `<span class="equip-equipped-tag">✓ EQUIPPED</span>`
            : (slotsFree
                ? `<button class="neon-btn mini-btn equip-btn" style="border-color:${meta.color};color:${meta.color};">EQUIP</button>`
                : `<span class="equip-full-tag">SLOTS FULL</span>`)
          }
          <button class="neon-btn mini-btn disassemble-btn">🔧 +${crystalVal} ◆◆</button>
        </div>
      `;

      // --- Tier-up action (C/B/A) ---
      const upgradeBtn = card.querySelector('.upgrade-btn');
      if (upgradeBtn && tierReq) {
        upgradeBtn.onclick = () => {
          if (playerShards < tierReq.shards || playerCrystals < tierReq.crystals) {
            audio.playShieldHit();
            alert(`Need ${tierReq.shards} ◆ and ${tierReq.crystals} ◆◆ to upgrade to ${tierReq.nextTier}.`);
            return;
          }
          if (!confirm(`Upgrade ${item.tier} ${item.name} → ${tierReq.nextTier}?\nCost: ${tierReq.shards} ◆ + ${tierReq.crystals} ◆◆`)) return;
          audio.playPowerup();
          const upgraded = applyTierUp(item);
          saveData.shards -= tierReq.shards;
          saveData.crystals -= tierReq.crystals;
          // Replace in inventory (preserve equip slot if it was equipped)
          saveData.inventory = (saveData.inventory || []).map(it => it.id === item.id ? upgraded : it);
          if (isEquipped) {
            const ids = this.getEquippedIds(saveData, category);
            const slotIdx = ids.indexOf(item.id);
            if (slotIdx >= 0) this.setEquippedSlot(saveData, category, slotIdx, upgraded.id);
          }
          Storage.save(saveData);
          this.renderArsenal();
          this.renderMenuPreview();
        };
      }

      // --- Merge action (S/S+ + S/S+ -> S+) ---
      const mergeBtn = card.querySelector('.merge-btn');
      if (mergeBtn && partner) {
        mergeBtn.onclick = () => {
          if (playerShards < S_FUSION_COST.shards || playerCrystals < S_FUSION_COST.crystals) {
            audio.playShieldHit();
            alert(`Need ${S_FUSION_COST.shards} ◆ and ${S_FUSION_COST.crystals} ◆◆ to merge into S+.`);
            return;
          }
          if (!confirm(`Merge ${item.tier} ${item.name} with ${partner.tier} ${partner.name} → S+?\nCost: ${S_FUSION_COST.shards} ◆ + ${S_FUSION_COST.crystals} ◆◆\n\nThe result keeps ALL effects from both items.`)) return;
          audio.playPowerup();
          const merged = fuseSSItems(item, partner);
          saveData.shards -= S_FUSION_COST.shards;
          saveData.crystals -= S_FUSION_COST.crystals;
          saveData.inventory = (saveData.inventory || []).filter(it => it.id !== item.id && it.id !== partner.id);
          saveData.inventory.push(merged);
          // If either input was equipped, point that slot at the merged item
          ['shield', 'gun', 'material', 'drone', 'skin'].forEach(cat => {
            const slots = EQUIP_SLOTS[cat] || 1;
            if (slots > 1) {
              const arr = Array.isArray(saveData.equippedEquipment?.[cat]) ? saveData.equippedEquipment[cat] : [];
              for (let i = 0; i < slots; i++) {
                if (arr[i] === item.id || arr[i] === partner.id) this.setEquippedSlot(saveData, cat, i, merged.id);
              }
            } else {
              const cur = saveData.equippedEquipment?.[cat];
              if (cur === item.id || cur === partner.id) this.setEquippedSlot(saveData, cat, 0, merged.id);
            }
          });
          Storage.save(saveData);
          this.renderArsenal();
          this.renderMenuPreview();
        };
      }

      const equipBtn = card.querySelector('.equip-btn');
      if (equipBtn) {
        equipBtn.onclick = () => {
          audio.playPowerup();
          const ids = this.getEquippedIds(saveData, category);
          const freeIdx = ids.indexOf(null);
          if (freeIdx >= 0) {
            this.setEquippedSlot(saveData, category, freeIdx, item.id);
            Storage.save(saveData);
            this.renderArsenal();
          }
        };
      }

      const disBtn = card.querySelector('.disassemble-btn');
      if (disBtn) {
        disBtn.onclick = () => {
          if (isEquipped) {
            audio.playShieldHit();
            alert('Unequip this item before disassembling it.');
            return;
          }
          if (!confirm(`Disassemble ${item.tier} ${item.name} into ${crystalVal} crystals?`)) return;
          audio.playPowerup();
          saveData.crystals = (Number(saveData.crystals) || 0) + crystalVal;
          saveData.inventory = (saveData.inventory || []).filter(it => it && it.id !== item.id);
          Storage.save(saveData);
          this.renderArsenal();
        };
      }

      container.appendChild(card);
    });
  }

  // Render Ship Hangar
  renderHangar() {
    this.refreshCurrencyDisplays();
    const container = document.getElementById('hangar-ships-container');
    container.innerHTML = '';

    Object.values(SHIPS).forEach(ship => {
      const isUnlocked = this.game.saveData.unlockedShips.includes(ship.id);
      const isEquipped = this.game.saveData.equippedShip === ship.id;
      const canAfford = this.game.saveData.shards >= ship.cost;

      const card = document.createElement('div');
      card.className = `ship-card ${isEquipped ? 'equipped' : ''}`;

      card.innerHTML = `
        <div class="ship-card-header">
          <div class="ship-canvas-wrap">
            <canvas id="hangar-canvas-${ship.id}" width="70" height="70"></canvas>
          </div>
          <div class="ship-meta">
            <h3>${ship.name}</h3>
            <div class="ship-perk">${ship.perkText}</div>
          </div>
        </div>
        <p style="font-size: 0.8rem; color: #a0a8cc;">${ship.desc}</p>
        <div class="ship-stats">
          <div>Speed: ${Math.round(ship.stats.speedMult * 100)}%</div>
          <div>Damage: ${Math.round(ship.stats.damageMult * 100)}%</div>
          <div>Shield: ${Math.round(ship.stats.shieldMult * 100)}%</div>
          <div>Shard Drop: ${Math.round(ship.stats.shardBonus * 100)}%</div>
        </div>
        <div>
          ${isEquipped 
            ? `<button class="neon-btn secondary-btn" style="width: 100%;" disabled>EQUIPPED</button>`
            : (isUnlocked 
                ? `<button class="neon-btn primary-btn" style="width: 100%;" id="equip-btn-${ship.id}">EQUIP SHIP</button>`
                : `<button class="neon-btn arena-btn" style="width: 100%;" id="unlock-btn-${ship.id}">UNLOCK FOR ${ship.cost} ◆</button>`
              )
          }
        </div>
      `;

      container.appendChild(card);

      // Render miniature preview
      setTimeout(() => {
        const c = document.getElementById(`hangar-canvas-${ship.id}`);
        if (c) Renderer.drawShipPreview(c, ship);
      }, 0);

      // Bind button action
      if (!isEquipped) {
        if (isUnlocked) {
          const btn = card.querySelector(`#equip-btn-${ship.id}`);
          btn.onclick = () => {
            audio.playClick();
            this.game.saveData.equippedShip = ship.id;
            Storage.save(this.game.saveData);
            this.renderHangar();
            this.renderMenuPreview();
          };
        } else {
          const btn = card.querySelector(`#unlock-btn-${ship.id}`);
          btn.onclick = () => {
            if (this.game.saveData.shards >= ship.cost) {
              audio.playPowerup();
              this.game.saveData.shards -= ship.cost;
              this.game.saveData.unlockedShips.push(ship.id);
              this.game.saveData.equippedShip = ship.id;
              Storage.save(this.game.saveData);
              this.renderHangar();
              this.renderMenuPreview();
            } else {
              audio.playShieldHit();
              alert('Not enough Shards! Defend the Endless Arena to earn shards quickly!');
            }
          };
        }
      }
    });
  }

  // Set up the in-run spawn panel shown while in the Training Range.
  // Built once; visibility is toggled from updateHud() by mode.
  setupTrainingHudPanel() {
    const panel = document.getElementById('hud-training-panel');
    if (!panel) return;

    const grid = document.getElementById('hud-training-grid');
    if (grid && !grid.dataset.built) {
      this.buildTrainingSpawnButtons(grid, 'hud');
      grid.dataset.built = '1';
    }

    // Collapse / expand the panel
    const toggle = document.getElementById('btn-training-panel-toggle');
    if (toggle && !toggle.dataset.bound) {
      toggle.onclick = (e) => {
        e.stopPropagation();
        audio.playClick();
        panel.classList.toggle('collapsed');
        toggle.textContent = panel.classList.contains('collapsed') ? '🎯 SPAWN ▸' : '🎯 SPAWN ▾';
      };
      toggle.dataset.bound = '1';
    }

    // Clear every practice target
    const clearBtn = document.getElementById('btn-hud-training-clear');
    if (clearBtn && !clearBtn.dataset.bound) {
      clearBtn.onclick = (e) => {
        e.stopPropagation();
        audio.playClick();
        this.game.clearTraining();
      };
      clearBtn.dataset.bound = '1';
    }
  }

  // Update Ingame HUD
  updateHud(player, waveManager, currentRunShards, currentRunCrystals = 0) {
    if (!player) return;

    // HP Bar
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    this.hudHpFill.style.width = `${hpPct}%`;
    this.hudHpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;

    // Shield Bar
    const shieldPct = player.maxShield > 0 ? Math.max(0, (player.shield / player.maxShield) * 100) : 0;
    this.hudShieldFill.style.width = `${shieldPct}%`;
    this.hudShieldText.textContent = `${Math.ceil(player.shield)}/${player.maxShield}`;

    // Wave / Mode
    if (waveManager.mode === 'CAMPAIGN') {
      this.hudModeTitle.textContent = `SECTOR ${waveManager.sectorId}`;
      this.hudWaveText.textContent = `WAVE ${waveManager.currentWave}/${waveManager.maxWaves}`;
    } else if (waveManager.mode === 'TRAINING') {
      this.hudModeTitle.textContent = 'TRAINING RANGE';
      const stats = this.game?.trainingStats;
      const dps = (stats && stats.elapsed > 0.25) ? (stats.damageDealt / stats.elapsed) : 0;
      this.hudWaveText.textContent = `DPS ${Math.round(dps).toLocaleString()} • ${this.game.enemies.length} TARGETS`;
    } else {
      this.hudModeTitle.textContent = 'ENDLESS ARENA';
      this.hudWaveText.textContent = `WAVE ${waveManager.currentWave}`;
    }

    // Training Range spawn panel — only visible while in the range.
    const trainPanel = document.getElementById('hud-training-panel');
    if (trainPanel) {
      const isTraining = waveManager.mode === 'TRAINING';
      if (isTraining && !trainPanel.dataset.ready) {
        this.setupTrainingHudPanel();
        trainPanel.dataset.ready = '1';
      }
      trainPanel.classList.toggle('hidden', !isTraining);
    }

    // Shards
    const bank = (typeof this.game?.saveData?.shards === 'number' && Number.isFinite(this.game.saveData.shards))
      ? Math.max(0, Math.round(this.game.saveData.shards))
      : 0;
    const current = (typeof currentRunShards === 'number' && Number.isFinite(currentRunShards))
      ? Math.max(0, Math.round(currentRunShards))
      : 0;
    const total = bank + current;
    this.hudShards.textContent = total.toLocaleString();

    // Crystals (bank + current run)
    const crystalBank = (typeof this.game?.saveData?.crystals === 'number' && Number.isFinite(this.game.saveData.crystals))
      ? Math.max(0, Math.round(this.game.saveData.crystals))
      : 0;
    const crystalRun = (typeof currentRunCrystals === 'number' && Number.isFinite(currentRunCrystals))
      ? Math.max(0, Math.round(currentRunCrystals))
      : 0;
    const hudCrystals = document.getElementById('hud-crystals');
    if (hudCrystals) hudCrystals.textContent = (crystalBank + crystalRun).toLocaleString();

    // Loot pickup → briefly flash hidden counters; keep pause-screen totals fresh
    const pauseShardsEl = document.getElementById('pause-shards');
    if (pauseShardsEl) pauseShardsEl.textContent = total.toLocaleString();
    const pauseCrystalsEl = document.getElementById('pause-crystals');
    if (pauseCrystalsEl) pauseCrystalsEl.textContent = (crystalBank + crystalRun).toLocaleString();
    const lootTotal = total + crystalBank + crystalRun;
    if (this._lastHudLoot !== undefined && lootTotal !== this._lastHudLoot) {
      this.flashHudCurrency();
    }
    this._lastHudLoot = lootTotal;

    // Compact live ship stats (Speed / Damage / Shield)
    const statsEl = document.getElementById('hud-ship-stats');
    if (statsEl) {
      const spd = Math.round((player.moveSpeedMult ?? 1) * 100);
      const dmg = Math.round(player.baseDamage ?? 0);
      const shd = Math.round(player.maxShield ?? 0);
      statsEl.innerHTML =
        `<span class="hstat"><b>SPD</b> ${spd}%</span>` +
        `<span class="hstat"><b>DMG</b> ${dmg}</span>` +
        `<span class="hstat"><b>SHD</b> ${shd}</span>`;
    }

    // Weapon level indicator
    this.hudPower.textContent = `WEAPON LVL ${player.weaponLevel}${player.overdriveTimer > 0 ? ' [HYPER]' : ''}`;

    // Primary weapon HUD pill
    if (player.primaryDef) {
      const primIcon = document.getElementById('primary-mode-icon');
      const primLabel = document.getElementById('primary-mode-label');
      if (primIcon) primIcon.textContent = player.primaryDef.icon;
      if (primLabel) primLabel.textContent = player.primaryDef.shortName;
    }

    // EMP Cooldown
    const cdRatio = Math.max(0, player.empCooldown / player.empMaxCooldown);
    this.bombCooldownOverlay.style.height = `${cdRatio * 100}%`;

    // Secondary Weapon cooldown + label
    if (this.secondaryCooldownOverlay && player.secondaryMaxCooldown > 0) {
      const secRatio = Math.max(0, player.secondaryCooldown / player.secondaryMaxCooldown);
      this.secondaryCooldownOverlay.style.height = `${secRatio * 100}%`;
    }
    if (this.secondaryIcon && player.secondaryDef) {
      this.secondaryIcon.textContent = player.secondaryDef.icon;
    }
    if (this.secondaryLabel && player.secondaryDef) {
      this.secondaryLabel.textContent = player.secondaryDef.shortName || player.secondaryDef.id.toUpperCase();
    }

    // Boss Bar
    if (waveManager && waveManager.boss && !waveManager.boss.dead) {
      const boss = waveManager.boss;
      this.bossBarWrap.classList.remove('hidden');
      this.bossBarWrap.style.setProperty('display', 'block', 'important');
      this.bossName.textContent = boss.name;
      const bPct = Math.max(0, Math.ceil((boss.hp / boss.maxHp) * 100));
      const phase = boss.phase || 1;
      const phaseCount = boss.phaseCount || 3;
      this.bossHpPct.textContent = `PHASE ${phase}/${phaseCount} · ${bPct}%`;
      this.bossBarFill.style.width = `${bPct}%`;
      if (boss.color) {
        this.bossBarFill.style.background = `linear-gradient(90deg, ${boss.color}, #ff7700)`;
        this.bossBarFill.style.boxShadow = `0 0 12px ${boss.color}`;
      }
    } else {
      this.bossBarWrap.classList.add('hidden');
      this.bossBarWrap.style.setProperty('display', 'none', 'important');
    }

    // Floating Announcement Banner
    if (waveManager.bannerMessage) {
      this.bannerNotice.classList.remove('hidden');
      this.bannerNotice.textContent = waveManager.bannerMessage;
    } else {
      this.bannerNotice.classList.add('hidden');
    }
  }

  // Show Game Over Modal
  showGameOver(mode, wave, kills, shardsEarned, crystalsEarned = 0) {
    const safeShards = (typeof shardsEarned === 'number' && Number.isFinite(shardsEarned))
      ? Math.max(0, Math.round(shardsEarned))
      : 0;
    const safeCrystals = (typeof crystalsEarned === 'number' && Number.isFinite(crystalsEarned))
      ? Math.max(0, Math.round(crystalsEarned))
      : 0;
    document.getElementById('stat-mode').textContent = mode;
    document.getElementById('stat-wave').textContent = wave;
    document.getElementById('stat-kills').textContent = kills;
    document.getElementById('stat-shards').textContent = `+${safeShards.toLocaleString()} ◆`;
    const crystalEl = document.getElementById('stat-crystals');
    if (crystalEl) crystalEl.textContent = `+${safeCrystals.toLocaleString()} ◆◆`;

    // Arena checkpoint: show the resume option when a checkpoint exists.
    const cpRow = document.getElementById('gameover-checkpoint-row');
    const cpVal = document.getElementById('stat-checkpoint');
    const cpBtn = document.getElementById('btn-retry-checkpoint');
    const isArena = mode === 'ENDLESS ARENA';
    const checkpoint = isArena
      ? Math.floor((Number(this.game.saveData.arenaStats?.checkpoint) || 0) / ARENA_CHECKPOINT_INTERVAL) * ARENA_CHECKPOINT_INTERVAL
      : 0;
    // Only offer the resume shortcut if it actually skips waves.
    const canResume = isArena && checkpoint >= ARENA_CHECKPOINT_INTERVAL;
    this.checkpointResumeWave = canResume ? checkpoint : 0;

    if (cpRow) cpRow.classList.toggle('hidden', !canResume);
    if (cpVal && canResume) cpVal.textContent = `WAVE ${checkpoint} UNLOCKED`;
    if (cpBtn) {
      cpBtn.classList.toggle('hidden', !canResume);
      if (canResume) cpBtn.textContent = `⏩ RESUME WAVE ${checkpoint}`;
    }

    this.refreshCurrencyDisplays();
    this.showScreen('gameover');
  }

  // Show Victory Modal
  showVictory(sectorDef, totalShardsEarned, stars, crystalsEarned = 0, unlockedTrack = null) {
    const safeBonus = (typeof sectorDef?.rewardShards === 'number' && Number.isFinite(sectorDef.rewardShards))
      ? Math.max(0, Math.round(sectorDef.rewardShards))
      : 0;
    const safeTotal = (typeof totalShardsEarned === 'number' && Number.isFinite(totalShardsEarned))
      ? Math.max(0, Math.round(totalShardsEarned))
      : 0;
    const safeCrystals = (typeof crystalsEarned === 'number' && Number.isFinite(crystalsEarned))
      ? Math.max(0, Math.round(crystalsEarned))
      : 0;

    const isFinalSector = (sectorDef.id || 0) >= SECTORS.length;
    const titleEl = document.querySelector('#screen-victory .victory-text');
    const subtitleEl = document.getElementById('victory-subtitle');
    if (titleEl) titleEl.textContent = isFinalSector ? 'GALAXY SAVED!' : 'SECTOR SECURED!';
    if (subtitleEl) {
      subtitleEl.textContent = isFinalSector
        ? 'THE DEMON KING HAS FALLEN — THE NEON GALAXY IS FREE'
        : 'SYSTEM DEFENSE RESTORED';
    }

    const nextBtn = document.getElementById('btn-next-sector');
    if (nextBtn) {
      nextBtn.textContent = isFinalSector ? 'ENTER ENDLESS ARENA ▶' : 'NEXT SECTOR ▶';
    }

    document.getElementById('vic-sector').textContent = sectorDef.name;
    document.getElementById('vic-bonus').textContent = `+${safeBonus.toLocaleString()} ◆`;
    document.getElementById('vic-total-shards').textContent = `+${safeTotal.toLocaleString()} ◆`;
    const vicCrystals = document.getElementById('vic-crystals');
    if (vicCrystals) vicCrystals.textContent = `+${safeCrystals.toLocaleString()} ◆◆`;

    // Announce a newly unlocked Endless Arena soundtrack.
    const trackRow = document.getElementById('vic-track-row');
    const trackEl = document.getElementById('vic-track');
    const trackName = unlockedTrack ? (TRACK_NAMES[unlockedTrack] || unlockedTrack) : null;
    if (trackRow) trackRow.classList.toggle('hidden', !trackName);
    if (trackEl && trackName) trackEl.textContent = `🎵 ${trackName}`;

    const starsContainer = document.getElementById('victory-stars');
    starsContainer.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const s = document.createElement('span');
      s.className = 'star-icon';
      s.textContent = i <= stars ? '★' : '☆';
      starsContainer.appendChild(s);
    }

    this.showScreen('victory');
  }
}
