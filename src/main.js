// Core Game Engine & Main Loop
import { Storage } from './engine/Storage.js';
import { audio } from './engine/Audio.js';
import { InputManager } from './engine/Input.js';
import { Renderer } from './engine/Renderer.js';
import { UIManager } from './ui/UI.js';
import { Player } from './entities/Player.js';
import { WaveManager } from './systems/WaveManager.js';
import { FloatingText, Particle } from './entities/Particle.js';
import { SECTORS, SECTOR_TRACKS, STAGE_TRACKS, ARENA_CHECKPOINT_INTERVAL, ARENA_MUSIC_INTERVAL } from './systems/UpgradeSystem.js';
import { EquipmentItem, CrystalItem } from './entities/EquipmentDrop.js';
import { rollEquipmentDrop, rollCrystalDrop } from './systems/Equipment.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.saveData = Storage.load();

    // Audio initial setup
    audio.setSfxEnabled(this.saveData.settings.sfx);
    audio.setMusicEnabled(this.saveData.settings.music);

    // Systems
    this.renderer = new Renderer(this.canvas);
    this.input = new InputManager(this.canvas);
    this.ui = new UIManager(this);

    // Dynamic resolution setup
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // Game State
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER', 'VICTORY'
    this.currentMode = 'CAMPAIGN'; // 'CAMPAIGN' or 'ARENA'
    this.currentSectorId = 1;

    // Entities
    this.player = null;
    this.waveManager = null;
    this.bullets = [];
    this.enemies = [];
    this.items = []; // Shards & Powerups
    this.particles = [];
    this.floatingTexts = [];

    // Run Stats
    this.runShards = 0;
    this.runCrystals = 0;
    this.runKills = 0;
    this.runScore = 0;

    // Time Tracking
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  handleResize() {
    const container = document.getElementById('game-container');
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 640;

    // Set internal resolution (maintain high DPI if needed, but 480x854 base is ideal for mobile)
    const baseW = 420;
    const baseH = Math.round(baseW * (height / width));

    this.renderer.resize(baseW, baseH);
    if (this.player) {
      this.player.canvasWidth = baseW;
      this.player.canvasHeight = baseH;
    }
    if (this.waveManager) {
      this.waveManager.canvasWidth = baseW;
      this.waveManager.canvasHeight = baseH;
    }
  }

  startRun(mode = 'CAMPAIGN', sectorId = 1, startWave = 1) {
    this.currentMode = mode;
    this.currentSectorId = sectorId;
    this.runShards = 0;
    this.runCrystals = 0;
    this.runKills = 0;
    this.runScore = 0;
    // Reset arena music rotation so the first swap lands on the next boundary.
    this._lastArenaMusicWave = 0;
    // Training-range damage telemetry (DPS readout).
    this.trainingStats = { damageDealt: 0, elapsed: 0, spawned: 0 };

    this.bullets = [];
    this.enemies = [];
    this.items = [];
    this.particles = [];
    this.floatingTexts = [];

    const w = this.renderer.width;
    const h = this.renderer.height;

    // Pick this run's stage soundtrack BEFORE spawning waves — the
    // WaveManager may swap to the boss theme during construction.
    this.stageTrack = this.pickStageTrack();
    audio.playTrack(this.stageTrack);

    this.player = new Player(w, h, this.saveData);
    this.waveManager = new WaveManager(w, h, mode, sectorId, startWave);

    // Resuming an arena checkpoint restores the weapon level banked at that
    // point, so a deep resume keeps the power you actually earned.
    if (mode === 'ARENA' && startWave > 1) {
      const banked = Number(this.saveData.arenaStats?.weaponLevel);
      if (Number.isFinite(banked) && banked > 0) {
        this.player.weaponLevel = Math.min(5, Math.max(1, Math.round(banked)));
      }
    }

    this.timeScale = 1.0;
    if (this.ui?.bossBarWrap) {
      this.ui.bossBarWrap.classList.add('hidden');
      this.ui.bossBarWrap.style.setProperty('display', 'none', 'important');
    }

    this.state = 'PLAYING';
    this.ui.showScreen('hud');
  }

  // One stage theme per run: campaign = sector-matched, arena = random pick
  // from the themes the player has unlocked by clearing campaign sectors.
  pickStageTrack() {
    if (this.currentMode === 'ARENA') {
      return this.pickArenaTrack();
    }
    if (this.currentMode === 'TRAINING') {
      // Calm menu loop — the range is a workshop, not a battle.
      return 'menu';
    }
    return SECTOR_TRACKS[this.currentSectorId] || 'stage_jungle';
  }

  // Random stage theme from the unlocked pool (falls back to the default).
  pickArenaTrack() {
    const unlocked = Array.isArray(this.saveData.unlockedTracks) && this.saveData.unlockedTracks.length > 0
      ? this.saveData.unlockedTracks.filter(t => STAGE_TRACKS.includes(t))
      : [];
    const pool = unlocked.length > 0 ? unlocked : STAGE_TRACKS.slice(0, 1);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Swap the arena soundtrack every ARENA_MUSIC_INTERVAL waves (never mid-boss).
  maybeRotateArenaMusic() {
    if (this.currentMode !== 'ARENA' || !this.waveManager) return;
    const wave = Number.isFinite(this.waveManager.currentWave) ? this.waveManager.currentWave : 1;
    if (wave % ARENA_MUSIC_INTERVAL !== 0) return;
    if (this._lastArenaMusicWave === wave) return;
    this._lastArenaMusicWave = wave;
    // Let the boss theme own boss waves; rotation resumes on the next regular wave.
    if (this.waveManager.bossSpawned) return;
    const next = this.pickArenaTrack();
    if (next !== this.stageTrack) {
      this.stageTrack = next;
      audio.playTrack(next);
    }
  }

  restartRun() {
    this.startRun(this.currentMode, this.currentSectorId);
  }

  pauseGame() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
    }
  }

  resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTime = performance.now();
    }
  }

  quitToMenu() {
    this.state = 'MENU';
    audio.playTrack('menu');
    this.ui.renderMenuPreview();
    this.ui.showScreen('menu');
  }

  getLootMultiplier() {
    const waveMult = (this.waveManager && typeof this.waveManager.getShardMultiplier === 'function')
      ? this.waveManager.getShardMultiplier()
      : 1.0;
    const shipBonus = (this.player && this.player.shipDef && typeof this.player.shipDef.stats?.shardBonus === 'number')
      ? this.player.shipDef.stats.shardBonus
      : 1.0;
    const luckMult = (this.player && Number.isFinite(this.player.luckMult) && this.player.luckMult > 0)
      ? this.player.luckMult
      : 1.0;
    const safeWaveMult = Number.isFinite(waveMult) && waveMult > 0 ? waveMult : 1.0;
    const safeShipBonus = Number.isFinite(shipBonus) && shipBonus > 0 ? shipBonus : 1.0;
    // Global economy rebalance: enemy shard drops cut by 70% (0.3x).
    const SHARD_DROP_SCALE = 0.3;
    return safeWaveMult * safeShipBonus * luckMult * SHARD_DROP_SCALE;
  }

  // 0 (game start) .. 1 (endgame) — drives equipment tier weights.
  getDropProgress() {    if (!this.waveManager) return 0;
    if (this.currentMode === 'ARENA') {
      return Math.max(0, Math.min(1, (this.waveManager.currentWave || 1) / 90));
    }
    const sectorCount = Math.max(1, SECTORS.length);
    const sectorIdx = Math.max(0, (this.currentSectorId || 1) - 1);
    const wave = this.waveManager.currentWave || 1;
    const maxWaves = this.waveManager.maxWaves || 10;
    const waveFrac = Math.max(0, Math.min(1, wave / maxWaves));
    return Math.max(0, Math.min(1, (sectorIdx + waveFrac) / sectorCount));
  }

  /* ------------------------------------------------------------------ *
   *  TRAINING RANGE
   * ------------------------------------------------------------------ */
  // Accumulate damage dealt so the panel can show a live DPS figure.
  recordTrainingDamage(amount) {
    if (this.currentMode !== 'TRAINING' || !this.trainingStats) return;
    const v = Number(amount);
    if (Number.isFinite(v) && v > 0) this.trainingStats.damageDealt += v;
  }

  // Spawn a practice enemy by type key (no wave logic, no drops).
  spawnTrainingEnemy(typeKey, hpMultiplier = 1) {
    if (this.currentMode !== 'TRAINING' || !this.waveManager) return null;
    const enemy = this.waveManager.spawnTrainingEnemy(typeKey, this.enemies, hpMultiplier);
    if (this.trainingStats) this.trainingStats.spawned++;
    return enemy;
  }

  spawnTrainingBoss(preset) {
    if (this.currentMode !== 'TRAINING' || !this.waveManager) return null;
    const p = preset || { name: 'PRACTICE TITAN', hp: 5000, color: '#ff007f' };
    const boss = this.waveManager.spawnTrainingBoss(p.name, p.hp, p.color, this.enemies);
    if (this.trainingStats) this.trainingStats.spawned++;
    return boss;
  }

  // Remove every practice target and reset the damage counters.
  clearTraining() {
    this.enemies.length = 0;
    this.bullets.length = 0;
    if (this.waveManager) this.waveManager.clearTrainingBoss();
    this.trainingStats = { damageDealt: 0, elapsed: 0, spawned: 0 };
    if (this.ui?.bossBarWrap) {
      this.ui.bossBarWrap.classList.add('hidden');
      this.ui.bossBarWrap.style.setProperty('display', 'none', 'important');
    }
  }

  rollEnemyDrops(entity, isBoss = false) {
    // Practice targets never drop loot.
    if (this.currentMode === 'TRAINING') return;
    if (!entity) return;
    const progress = this.getDropProgress();
    const luckMult = (this.player && Number.isFinite(this.player.luckMult) && this.player.luckMult > 0)
      ? this.player.luckMult
      : 1.0;

    const pushEquipment = (eq, ox = 0, oy = 0) => {
      if (!eq) return;
      this.items.push(new EquipmentItem(entity.x + ox, entity.y + oy, eq));
    };

    pushEquipment(rollEquipmentDrop({ progress, luckMult, isBoss }), 0, 0);
    if (isBoss) {
      // Bosses guarantee a second roll and skew toward higher tiers.
      pushEquipment(rollEquipmentDrop({ progress, luckMult, isBoss: true }), 26, -18);
    }

    const crystalDrop = rollCrystalDrop({ progress, luckMult, isBoss });
    if (crystalDrop) {
      const amount = Math.max(1, Math.round(crystalDrop.amount || 1));
      this.items.push(new CrystalItem(
        entity.x + (Math.random() - 0.5) * 26,
        entity.y + (Math.random() - 0.5) * 26,
        amount
      ));
    }
  }

  handleGameOver(reason = 'HULL INTEGRITY COMPROMISED') {
    // Training range has no stakes: no banking, no records, no game-over modal.
    if (this.currentMode === 'TRAINING') {
      this.player.hp = this.player.maxHp;
      this.player.shield = this.player.maxShield;
      this.player.isDead = false;
      this.player.invulnerableTimer = 1.5;
      this.clearTraining();
      return;
    }

    this.state = 'GAMEOVER';
    this.renderer.addShake(15, 0.5);

    const safeRunShards = (typeof this.runShards === 'number' && Number.isFinite(this.runShards))
      ? Math.max(0, Math.round(this.runShards))
      : 0;
    const currentBank = (typeof this.saveData.shards === 'number' && Number.isFinite(this.saveData.shards))
      ? Math.max(0, Math.round(this.saveData.shards))
      : 0;

    const safeRunCrystals = (typeof this.runCrystals === 'number' && Number.isFinite(this.runCrystals))
      ? Math.max(0, Math.round(this.runCrystals))
      : 0;
    const currentCrystalBank = (typeof this.saveData.crystals === 'number' && Number.isFinite(this.saveData.crystals))
      ? Math.max(0, Math.round(this.saveData.crystals))
      : 0;

    // Commit collected shards & crystals to persistent bank with strict validation
    this.saveData.shards = currentBank + safeRunShards;
    this.saveData.crystals = currentCrystalBank + safeRunCrystals;

    // Save arena records
    if (this.currentMode === 'ARENA') {
      const currentWave = Number.isFinite(this.waveManager.currentWave) ? this.waveManager.currentWave : 1;
      if (currentWave > this.saveData.arenaStats.bestWave) {
        this.saveData.arenaStats.bestWave = currentWave;
      }
      this.saveData.arenaStats.bestScore = Math.max(this.saveData.arenaStats.bestScore, Number(this.runScore) || 0);
      this.saveData.arenaStats.totalShardsEarned = (Number(this.saveData.arenaStats.totalShardsEarned) || 0) + safeRunShards;

      // Unlock the highest checkpoint wave the player has cleared.
      const clearedCheckpoint = Math.floor(currentWave / ARENA_CHECKPOINT_INTERVAL) * ARENA_CHECKPOINT_INTERVAL;
      if (clearedCheckpoint > (Number(this.saveData.arenaStats.checkpoint) || 0)) {
        this.saveData.arenaStats.checkpoint = clearedCheckpoint;
        // Bank the weapon level reached at this checkpoint so resuming doesn't
        // drop the player back to level 1 after a deep run.
        this.saveData.arenaStats.weaponLevel = Math.min(5, Math.max(1,
          Number(this.player?.weaponLevel) || 1));
      }
    }

    Storage.save(this.saveData);
    audio.playJingle('gameover');

    document.getElementById('gameover-reason').textContent = reason;
    this.ui.showGameOver(
      this.currentMode === 'ARENA' ? 'ENDLESS ARENA' : `SECTOR ${this.currentSectorId}`,
      this.waveManager.currentWave,
      this.runKills,
      safeRunShards,
      safeRunCrystals
    );
  }

  handleVictory() {
    this.state = 'VICTORY';
    this.renderer.addShake(8, 0.3);

    const sec = SECTORS.find(s => s.id === this.currentSectorId) || SECTORS[0];
    const bonus = (typeof sec.rewardShards === 'number' && Number.isFinite(sec.rewardShards))
      ? Math.max(0, Math.round(sec.rewardShards))
      : 0;
    const safeRunShards = (typeof this.runShards === 'number' && Number.isFinite(this.runShards))
      ? Math.max(0, Math.round(this.runShards))
      : 0;
    const currentBank = (typeof this.saveData.shards === 'number' && Number.isFinite(this.saveData.shards))
      ? Math.max(0, Math.round(this.saveData.shards))
      : 0;

    const totalEarned = safeRunShards + bonus;
    this.saveData.shards = currentBank + totalEarned;

    const safeRunCrystals = (typeof this.runCrystals === 'number' && Number.isFinite(this.runCrystals))
      ? Math.max(0, Math.round(this.runCrystals))
      : 0;
    const currentCrystalBank = (typeof this.saveData.crystals === 'number' && Number.isFinite(this.saveData.crystals))
      ? Math.max(0, Math.round(this.saveData.crystals))
      : 0;
    this.saveData.crystals = currentCrystalBank + safeRunCrystals;

    // Unlock next sector
    const nextSectorId = this.currentSectorId + 1;
    if (this.saveData.sectors[nextSectorId]) {
      this.saveData.sectors[nextSectorId].unlocked = true;
    }

    // Clearing a sector unlocks its stage theme for Endless Arena.
    const clearedTrack = SECTOR_TRACKS[this.currentSectorId];
    let trackUnlocked = false;
    if (clearedTrack) {
      if (!Array.isArray(this.saveData.unlockedTracks)) this.saveData.unlockedTracks = [];
      if (!this.saveData.unlockedTracks.includes(clearedTrack)) {
        this.saveData.unlockedTracks.push(clearedTrack);
        trackUnlocked = true;
      }
    }

    // Star rating (1: clear, 2: >50% HP, 3: >80% HP)
    const hpRatio = this.player.hp / this.player.maxHp;
    const stars = hpRatio > 0.8 ? 3 : (hpRatio > 0.4 ? 2 : 1);
    if (this.saveData.sectors[this.currentSectorId]) {
      this.saveData.sectors[this.currentSectorId].stars = Math.max(
        this.saveData.sectors[this.currentSectorId].stars || 0,
        stars
      );
    }

    Storage.save(this.saveData);
    audio.playJingle('victory');
    this.ui.showVictory(sec, totalEarned, stars, safeRunCrystals, trackUnlocked ? clearedTrack : null);
  }

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    // Bullet-Time Mechanic:
    // When NOT touching/tapping the screen (finger released): slow-motion (0.25x speed)
    // When touching/dragging/holding: full acceleration (1.0x speed)
    let timeScale = 1.0;
    if (this.state === 'PLAYING') {
      const kb = this.input.getKeyboardMovement();
      const isInteracting = this.input.isTouching || this.input.isPointerDown || (kb.dx !== 0 || kb.dy !== 0);
      const targetScale = isInteracting ? 1.0 : 0.25;
      this.timeScale = (this.timeScale ?? 1.0) + (targetScale - (this.timeScale ?? 1.0)) * Math.min(1, 14 * dt);
      timeScale = this.timeScale;
    } else {
      this.timeScale = 1.0;
    }

    const simDt = dt * timeScale;

    // Update renderer effects (stars, scrolling grid, camera shake)
    this.renderer.update(simDt);

    if (this.state === 'PLAYING') {
      this.updateGame(simDt);
    }

    // Render pass
    this.renderer.clear();
    this.renderGame();

    // Subtle holographic time-dilation border when in slow-motion
    if (this.state === 'PLAYING' && timeScale < 0.82) {
      this.renderSlowMotionEffect(timeScale);
    }

    this.renderer.restore();
  }

  renderSlowMotionEffect(scale) {
    const ctx = this.renderer.ctx;
    const w = this.renderer.width;
    const h = this.renderer.height;
    const intensity = Math.max(0, (1.0 - scale) / 0.75);

    ctx.save();
    // Glowing cyan edge aura
    ctx.strokeStyle = `rgba(0, 240, 255, ${intensity * 0.35})`;
    ctx.lineWidth = 5;
    ctx.strokeRect(2.5, 2.5, w - 5, h - 5);

    // Subtle status banner at bottom
    ctx.font = '700 10.5px Orbitron, sans-serif';
    ctx.fillStyle = `rgba(0, 240, 255, ${intensity * 0.8})`;
    ctx.textAlign = 'center';
    ctx.fillText('⏳ BULLET-TIME · TOUCH TO ENGAGE SPEED', w / 2, h - 92);
    ctx.restore();
  }

  updateGame(dt) {
    const w = this.renderer.width;
    const h = this.renderer.height;

    // Training range: advance the DPS clock.
    if (this.currentMode === 'TRAINING' && this.trainingStats) {
      this.trainingStats.elapsed += dt;
    }

    // Feed touch / pointer target to player
    if (this.input.isPointerDown) {
      this.player.setTarget(this.input.targetX, this.input.targetY);
    }

    // Update Player
    const activeTargets = [...this.enemies];
    if (this.waveManager.boss && !this.waveManager.boss.dead) {
      activeTargets.push(this.waveManager.boss);
    }

    this.player.update(dt, this.input, this.bullets, this.particles, this.floatingTexts, activeTargets);

    if (this.player.isDead) {
      this.handleGameOver('SHIP DESTROYED IN COMBAT');
      return;
    }

    // Update Wave Manager
    const waveStatus = this.waveManager.update(dt, this.enemies);
    if (waveStatus === 'VICTORY') {
      this.handleVictory();
      return;
    }

    // Endless Arena: shuffle the soundtrack every few waves.
    this.maybeRotateArenaMusic();

    // Update Boss if present
    if (this.waveManager.boss) {
      const boss = this.waveManager.boss;
      boss.update(dt, this.player, this.bullets, this.particles, this.floatingTexts, this.enemies);

      if (boss.dead && !boss.hasLooted) {
        boss.hasLooted = true;
        this.renderer.addShake(18, 0.6);
        boss.onDestroy(this.particles, this.items, this.getLootMultiplier());
        this.rollEnemyDrops(boss, true);
        this.runKills += 1;
        this.runScore += 2500;
        // Boss down — drop back into the stage theme
        // (campaign plays the victory jingle moments later anyway)
        audio.playTrack(this.stageTrack);
      }
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.player, this.bullets, this.particles, this.floatingTexts);

      // Check enemy death
      if (enemy.dead) {
        enemy.onDestroy(this.particles, this.items, this.getLootMultiplier());
        this.rollEnemyDrops(enemy, false);
        if (typeof this.player.onEnemyKilled === 'function') {
          this.player.onEnemyKilled(enemy, this.floatingTexts);
        }
        this.runKills += 1;
        this.runScore += (Number(enemy.score) || 50) * (this.player.scoreMult || 1);
        this.enemies.splice(i, 1);
        continue;
      }

      // Check enemy out of bottom screen
      if (enemy.y > h + 50) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Check collision with player ship
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < enemy.radius + this.player.radius) {
        this.player.takeDamage(30, this.particles, this.floatingTexts);
        enemy.takeDamage(60, this.particles, this.floatingTexts);
        this.renderer.addShake(10, 0.25);
      }
    }

    // Update Projectiles
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      // Player projectiles target enemies; Enemy chasing missiles target player!
      const targets = b.isPlayer ? activeTargets : (this.player && !this.player.isDead ? [this.player] : []);
      const alive = b.update(dt, targets, this.particles, this.bullets);

      // Bounds check
      if (!alive || b.x < -20 || b.x > w + 20 || b.y < -30 || b.y > h + 30) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Player bullet collisions vs Enemies, Boss, and Shootable Enemy Missiles
      if (b.isPlayer) {
        let hit = false;

        // Shoot down incoming enemy missiles!
        for (let m = this.bullets.length - 1; m >= 0; m--) {
          const eb = this.bullets[m];
          if (!eb.isPlayer && eb.type === 'missile') {
            const md = Math.hypot(b.x - eb.x, b.y - eb.y);
            if (md < b.radius + eb.radius + 4) {
              eb.dead = true;
              if (typeof eb.handleDestruction === 'function') {
                eb.handleDestruction(this.particles, this.bullets, [this.player]);
              }
              this.bullets.splice(m, 1);
              if (m < i) i--;
              hit = true;
              this.floatingTexts.push(new FloatingText(b.x, b.y - 10, 'INTERCEPT!', '#39ff14'));
              break;
            }
          }
        }

        // Check boss collision
        if (!hit && this.waveManager.boss && !this.waveManager.boss.dead && !this.waveManager.boss.isDying) {
          const boss = this.waveManager.boss;
          const d = Math.hypot(b.x - boss.x, b.y - boss.y);
          if (d < b.radius + boss.radius) {
            boss.takeDamage(b.damage, this.particles, this.floatingTexts);
            this.recordTrainingDamage(b.damage);
            hit = true;
          }
        }

        // Check regular enemies
        if (!hit) {
          for (let j = this.enemies.length - 1; j >= 0; j--) {
            const enemy = this.enemies[j];
            const d = Math.hypot(b.x - enemy.x, b.y - enemy.y);
            if (d < b.radius + enemy.radius) {
              enemy.takeDamage(b.damage, this.particles, this.floatingTexts);
              this.recordTrainingDamage(b.damage);
              hit = true;
              break;
            }
          }
        }

        if (hit) {
          b.hits++;
          if (typeof b.handleHit === 'function') {
            b.handleHit(this.particles, this.bullets, activeTargets, this.floatingTexts);
          }
          if (b.hits >= b.pierce) {
            this.bullets.splice(i, 1);
            continue;
          }
        }
      } else {
        // Enemy bullet collision vs Player
        const dist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        if (dist < b.radius + this.player.radius) {
          this.player.takeDamage(b.damage, this.particles, this.floatingTexts);
          this.bullets.splice(i, 1);
          continue;
        }
      }
    }

    // Update Collectibles (Shards, Crystals, Equipment & Power-ups)
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      if (item.isShard || item.isCrystal || item.isEquipment) {
        const alive = item.update(dt, this.player.x, this.player.y, this.player.magnetRadius);
        if (!alive || item.y > h + 40) {
          this.items.splice(i, 1);
          continue;
        }

        // Collection radius
        const d = Math.hypot(item.x - this.player.x, item.y - this.player.y);
        if (d < item.size + this.player.radius + 8) {
          if (item.isShard) {
            audio.playShard();
            const shardVal = (typeof item.value === 'number' && Number.isFinite(item.value) && item.value > 0)
              ? Math.round(item.value)
              : 1;
            this.runShards = (Number.isFinite(this.runShards) ? this.runShards : 0) + shardVal;
            this.floatingTexts.push(new FloatingText(item.x, item.y - 12, `+${shardVal}`, '#ffe600'));
          } else if (item.isCrystal) {
            audio.playShard();
            const crystalVal = Math.max(1, Math.round(item.amount || 1));
            this.runCrystals += crystalVal;
            this.floatingTexts.push(new FloatingText(item.x, item.y - 12, `+${crystalVal} ◆◆`, '#c77dff', true));
          } else if (item.isEquipment) {
            audio.playPowerup();
            const eq = item.equipment;
            if (eq && Array.isArray(this.saveData.inventory) && !this.saveData.inventory.some(x => x && x.id === eq.id)) {
              this.saveData.inventory.push(eq);
              Storage.save(this.saveData);
            }
            const color = item.meta?.color || '#ffb300';
            this.floatingTexts.push(new FloatingText(item.x, item.y - 16, `${item.tier} · ${eq?.shortName || 'GEAR'}`, color, true));
          }
          this.items.splice(i, 1);
          continue;
        }
      } else {
        // Power-up capsule
        const alive = item.update(dt);
        if (!alive || item.y > h + 40) {
          this.items.splice(i, 1);
          continue;
        }

        const d = Math.hypot(item.x - this.player.x, item.y - this.player.y);
        if (d < item.size + this.player.radius + 6) {
          this.player.applyPowerup(item.type, this.floatingTexts);
          this.items.splice(i, 1);
          continue;
        }
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(dt)) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      if (!this.floatingTexts[i].update(dt)) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update UI HUD values
    this.ui.updateHud(this.player, this.waveManager, this.runShards, this.runCrystals);
  }

  renderGame() {
    const ctx = this.renderer.ctx;

    // Draw Collectible Items
    for (const item of this.items) {
      item.draw(ctx);
    }

    // Draw Enemies
    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }

    // Draw Boss
    if (this.waveManager && this.waveManager.boss) {
      this.waveManager.boss.draw(ctx);
    }

    // Draw Bullets
    for (const bullet of this.bullets) {
      bullet.draw(ctx);
    }

    // Draw Player
    if (this.player) {
      this.player.draw(ctx);
    }

    // Draw Particles
    for (const p of this.particles) {
      p.draw(ctx);
    }

    // Draw Floating Arcade Texts
    for (const ft of this.floatingTexts) {
      ft.draw(ctx);
    }
  }
}

// Boot game when window is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
