// UI Screen Management, Shop Rendering, Hangar, and HUD Updates
import { UPGRADES, SHIPS, SECTORS, SECONDARY_WEAPONS } from '../systems/UpgradeSystem.js';
import { Renderer } from '../engine/Renderer.js';
import { audio } from '../engine/Audio.js';
import { Storage } from '../engine/Storage.js';

export class UIManager {
  constructor(game) {
    this.game = game;

    // Screens
    this.screens = {
      menu: document.getElementById('screen-main-menu'),
      campaign: document.getElementById('screen-campaign'),
      shop: document.getElementById('screen-shop'),
      hangar: document.getElementById('screen-hangar'),
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
      this.game.startRun('ARENA');
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
    if (tabSystems && tabSecondaries) {
      tabSystems.onclick = () => {
        audio.playClick();
        this.switchShopTab('systems');
      };
      tabSecondaries.onclick = () => {
        audio.playClick();
        this.switchShopTab('secondaries');
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

    // Reset Data
    document.getElementById('btn-reset-data').onclick = () => {
      if (confirm('Reset all progress, upgrades, and unlocked ships?')) {
        this.game.saveData = Storage.reset();
        this.renderMenuPreview();
        this.refreshCurrencyDisplays();
        alert('Save data reset successfully!');
      }
    };
  }

  refreshCurrencyDisplays() {
    const rawAmt = Number(this.game?.saveData?.shards);
    const amt = (Number.isFinite(rawAmt) && rawAmt >= 0) ? Math.round(rawAmt) : 0;
    ['menu-shards', 'campaign-shards', 'shop-shards', 'hangar-shards'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = amt.toLocaleString();
    });
  }

  renderMenuPreview() {
    const previewCanvas = document.getElementById('shipPreviewCanvas');
    const currentShip = SHIPS[this.game.saveData.equippedShip] || SHIPS.alpha_dart;
    const nameEl = document.getElementById('selected-ship-name');
    if (nameEl) nameEl.textContent = currentShip.name;
    Renderer.drawShipPreview(previewCanvas, currentShip);

    // Show equipped secondary weapon badge
    const secId = this.game.saveData.equippedSecondary || 'seeker';
    const secDef = SECONDARY_WEAPONS[secId];
    if (this.selectedSecondaryBadge && secDef) {
      this.selectedSecondaryBadge.textContent = `${secDef.icon} ${secDef.name}`;
    }
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

      card.innerHTML = `
        <div class="sector-info">
          <h3>${sec.name}</h3>
          <p>${sec.subtitle} • Boss: ${sec.bossName}</p>
        </div>
        <div style="text-align: right;">
          <div class="sector-stars">${isUnlocked ? starsHtml : '🔒 LOCKED'}</div>
          <div style="font-size: 0.75rem; color: var(--neon-cyan); margin-top: 4px;">Reward: +${sec.rewardShards} ◆</div>
        </div>
      `;

      if (isUnlocked) {
        card.onclick = () => {
          audio.playClick();
          this.game.startRun('CAMPAIGN', sec.id);
        };
      }

      container.appendChild(card);
    });
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

  switchShopTab(tab) {
    this.currentShopTab = tab;
    const systemsContainer = document.getElementById('shop-items-container');
    const secondariesContainer = document.getElementById('shop-secondaries-container');
    const tabSystems = document.getElementById('tab-shop-systems');
    const tabSecondaries = document.getElementById('tab-shop-secondaries');
    const tipEl = document.getElementById('shop-tip-text');

    if (tab === 'systems') {
      if (systemsContainer) {
        systemsContainer.classList.remove('hidden');
        systemsContainer.style.setProperty('display', 'flex', 'important');
      }
      if (secondariesContainer) {
        secondariesContainer.classList.add('hidden');
        secondariesContainer.style.setProperty('display', 'none', 'important');
      }
      tabSystems?.classList.add('active');
      tabSecondaries?.classList.remove('active');
      if (tipEl) tipEl.innerHTML = '💡 Earn unlimited Shards in <b>Arena Mode</b> to max out all upgrades!';
      this.renderShop();
    } else {
      if (systemsContainer) {
        systemsContainer.classList.add('hidden');
        systemsContainer.style.setProperty('display', 'none', 'important');
      }
      if (secondariesContainer) {
        secondariesContainer.classList.remove('hidden');
        secondariesContainer.style.setProperty('display', 'flex', 'important');
      }
      tabSystems?.classList.remove('active');
      tabSecondaries?.classList.add('active');
      if (tipEl) tipEl.innerHTML = '🚀 Unlock & equip your Secondary Weapon arsenal — tap to equip!';
      this.renderSecondaryArsenal();
    }
  }

  renderSecondaryArsenal() {
    this.refreshCurrencyDisplays();
    const container = document.getElementById('shop-secondaries-container');
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

      // Stats preview
      const stats = sec.getStats(currentLvl);
      let statsHtml = '';
      if (sec.id === 'seeker') {
        statsHtml = `<span>DMG: ${stats.damage}</span><span>COUNT: ${stats.count}</span><span>CD: ${stats.cooldown.toFixed(1)}s</span>`;
      } else if (sec.id === 'railgun') {
        statsHtml = `<span>DMG: ${stats.damage}</span><span>WIDTH: ${stats.beamWidth}px</span><span>CD: ${stats.cooldown.toFixed(1)}s</span>`;
      } else if (sec.id === 'cluster') {
        statsHtml = `<span>SHELL: ${stats.shellDamage}</span><span>SHARDS: ${stats.shrapnelCount}</span><span>CD: ${stats.cooldown.toFixed(1)}s</span>`;
      } else if (sec.id === 'vortex') {
        statsHtml = `<span>DMG: ${stats.damage}</span><span>RADIUS: ${stats.radius}px</span><span>CD: ${stats.cooldown.toFixed(1)}s</span>`;
      }

      // Level pips
      let pipsHtml = '';
      for (let i = 1; i <= sec.maxLevel; i++) {
        pipsHtml += `<div class="level-pip ${i <= currentLvl ? 'filled' : ''}"></div>`;
      }

      // Actions area
      let actionsHtml = '';
      if (!isUnlocked) {
        actionsHtml = `
          <button class="neon-btn shop-buy-btn ${canAffordUnlock ? 'primary-btn' : 'secondary-btn'}" id="unlock-sec-${sec.id}">
            🔓 ${sec.cost} ◆
          </button>`;
      } else {
        if (isEquipped) {
          actionsHtml = `<span style="color:var(--neon-lime);font-family:var(--font-display);font-size:0.8rem;">✓ EQUIPPED</span>`;
        } else {
          actionsHtml += `<button class="neon-btn mini-btn" id="equip-sec-${sec.id}" style="border-color:var(--neon-lime);color:var(--neon-lime);">EQUIP</button>`;
        }
        if (!isMax) {
          actionsHtml += `
            <button class="neon-btn shop-buy-btn ${canAffordUpgrade ? 'primary-btn' : 'secondary-btn'}" id="upgrade-sec-${sec.id}">
              ↑ ${upgradeCost} ◆
            </button>`;
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

      // Wire up unlock button
      if (!isUnlocked) {
        const unlockBtn = card.querySelector(`#unlock-sec-${sec.id}`);
        if (unlockBtn) {
          unlockBtn.onclick = () => {
            if (saveData.shards >= sec.cost) {
              audio.playPowerup();
              saveData.shards -= sec.cost;
              if (!saveData.unlockedSecondaries.includes(sec.id)) {
                saveData.unlockedSecondaries.push(sec.id);
              }
              Storage.save(saveData);
              this.renderSecondaryArsenal();
              this.renderMenuPreview();
            } else {
              audio.playShieldHit();
              alert('Not enough Shards!');
            }
          };
        }
      } else {
        // Equip button
        const equipBtn = card.querySelector(`#equip-sec-${sec.id}`);
        if (equipBtn) {
          equipBtn.onclick = () => {
            audio.playClick();
            saveData.equippedSecondary = sec.id;
            Storage.save(saveData);
            this.renderSecondaryArsenal();
            this.renderMenuPreview();
          };
        }
        // Upgrade button
        const upgradeBtn = card.querySelector(`#upgrade-sec-${sec.id}`);
        if (upgradeBtn && !isMax) {
          upgradeBtn.onclick = () => {
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

  // Update Ingame HUD
  updateHud(player, waveManager, currentRunShards) {
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
    } else {
      this.hudModeTitle.textContent = 'ENDLESS ARENA';
      this.hudWaveText.textContent = `WAVE ${waveManager.currentWave}`;
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

    // Weapon level indicator
    this.hudPower.textContent = `WEAPON LVL ${player.weaponLevel}${player.overdriveTimer > 0 ? ' [HYPER]' : ''}`;

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
      this.bossBarWrap.classList.remove('hidden');
      this.bossBarWrap.style.setProperty('display', 'block', 'important');
      this.bossName.textContent = waveManager.boss.name;
      const bPct = Math.max(0, Math.ceil((waveManager.boss.hp / waveManager.boss.maxHp) * 100));
      this.bossHpPct.textContent = `${bPct}%`;
      this.bossBarFill.style.width = `${bPct}%`;
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
  showGameOver(mode, wave, kills, shardsEarned) {
    const safeShards = (typeof shardsEarned === 'number' && Number.isFinite(shardsEarned))
      ? Math.max(0, Math.round(shardsEarned))
      : 0;
    document.getElementById('stat-mode').textContent = mode;
    document.getElementById('stat-wave').textContent = wave;
    document.getElementById('stat-kills').textContent = kills;
    document.getElementById('stat-shards').textContent = `+${safeShards.toLocaleString()} ◆`;
    this.showScreen('gameover');
  }

  // Show Victory Modal
  showVictory(sectorDef, totalShardsEarned, stars) {
    const safeBonus = (typeof sectorDef?.rewardShards === 'number' && Number.isFinite(sectorDef.rewardShards))
      ? Math.max(0, Math.round(sectorDef.rewardShards))
      : 0;
    const safeTotal = (typeof totalShardsEarned === 'number' && Number.isFinite(totalShardsEarned))
      ? Math.max(0, Math.round(totalShardsEarned))
      : 0;

    document.getElementById('vic-sector').textContent = sectorDef.name;
    document.getElementById('vic-bonus').textContent = `+${safeBonus.toLocaleString()} ◆`;
    document.getElementById('vic-total-shards').textContent = `+${safeTotal.toLocaleString()} ◆`;

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
