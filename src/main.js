// Core Game Engine & Main Loop
import { Storage } from './engine/Storage.js';
import { audio } from './engine/Audio.js';
import { InputManager } from './engine/Input.js';
import { Renderer } from './engine/Renderer.js';
import { UIManager } from './ui/UI.js';
import { Player } from './entities/Player.js';
import { WaveManager } from './systems/WaveManager.js';
import { FloatingText, Particle } from './entities/Particle.js';
import { SECTORS } from './systems/UpgradeSystem.js';

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

  startRun(mode = 'CAMPAIGN', sectorId = 1) {
    this.currentMode = mode;
    this.currentSectorId = sectorId;
    this.runShards = 0;
    this.runKills = 0;
    this.runScore = 0;

    this.bullets = [];
    this.enemies = [];
    this.items = [];
    this.particles = [];
    this.floatingTexts = [];

    const w = this.renderer.width;
    const h = this.renderer.height;

    this.player = new Player(w, h, this.saveData);
    this.waveManager = new WaveManager(w, h, mode, sectorId);

    this.state = 'PLAYING';
    this.ui.showScreen('hud');

    if (this.saveData.settings.music) {
      audio.startMusic();
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
    audio.stopMusic();
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
    const safeWaveMult = Number.isFinite(waveMult) && waveMult > 0 ? waveMult : 1.0;
    const safeShipBonus = Number.isFinite(shipBonus) && shipBonus > 0 ? shipBonus : 1.0;
    return safeWaveMult * safeShipBonus;
  }

  handleGameOver(reason = 'HULL INTEGRITY COMPROMISED') {
    this.state = 'GAMEOVER';
    this.renderer.addShake(15, 0.5);

    const safeRunShards = (typeof this.runShards === 'number' && Number.isFinite(this.runShards))
      ? Math.max(0, Math.round(this.runShards))
      : 0;
    const currentBank = (typeof this.saveData.shards === 'number' && Number.isFinite(this.saveData.shards))
      ? Math.max(0, Math.round(this.saveData.shards))
      : 0;

    // Commit collected shards to persistent bank with strict validation
    this.saveData.shards = currentBank + safeRunShards;

    // Save arena records
    if (this.currentMode === 'ARENA') {
      const currentWave = Number.isFinite(this.waveManager.currentWave) ? this.waveManager.currentWave : 1;
      if (currentWave > this.saveData.arenaStats.bestWave) {
        this.saveData.arenaStats.bestWave = currentWave;
      }
      this.saveData.arenaStats.bestScore = Math.max(this.saveData.arenaStats.bestScore, Number(this.runScore) || 0);
      this.saveData.arenaStats.totalShardsEarned = (Number(this.saveData.arenaStats.totalShardsEarned) || 0) + safeRunShards;
    }

    Storage.save(this.saveData);
    audio.stopMusic();

    document.getElementById('gameover-reason').textContent = reason;
    this.ui.showGameOver(
      this.currentMode === 'ARENA' ? 'ENDLESS ARENA' : `SECTOR ${this.currentSectorId}`,
      this.waveManager.currentWave,
      this.runKills,
      safeRunShards
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

    // Unlock next sector
    const nextSectorId = this.currentSectorId + 1;
    if (this.saveData.sectors[nextSectorId]) {
      this.saveData.sectors[nextSectorId].unlocked = true;
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
    audio.stopMusic();
    this.ui.showVictory(sec, totalEarned, stars);
  }

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    // Update renderer effects (stars, scrolling grid, camera shake)
    this.renderer.update(dt);

    if (this.state === 'PLAYING') {
      this.updateGame(dt);
    }

    // Render pass
    this.renderer.clear();
    this.renderGame();
    this.renderer.restore();
  }

  updateGame(dt) {
    const w = this.renderer.width;
    const h = this.renderer.height;

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

    // Update Boss if present
    if (this.waveManager.boss) {
      const boss = this.waveManager.boss;
      boss.update(dt, this.player, this.bullets, this.particles, this.floatingTexts, this.enemies);

      if (boss.dead && !boss.hasLooted) {
        boss.hasLooted = true;
        this.renderer.addShake(18, 0.6);
        boss.onDestroy(this.particles, this.items, this.getLootMultiplier());
        this.runKills += 1;
        this.runScore += 2500;
      }
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.player, this.bullets, this.particles, this.floatingTexts);

      // Check enemy death
      if (enemy.dead) {
        enemy.onDestroy(this.particles, this.items, this.getLootMultiplier());
        this.runKills += 1;
        this.runScore += (Number(enemy.score) || 50);
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
      const alive = b.update(dt, activeTargets);

      // Bounds check
      if (!alive || b.x < -20 || b.x > w + 20 || b.y < -30 || b.y > h + 30) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Player bullet collisions vs Enemies and Boss
      if (b.isPlayer) {
        let hit = false;

        // Check boss collision
        if (this.waveManager.boss && !this.waveManager.boss.dead && !this.waveManager.boss.isDying) {
          const boss = this.waveManager.boss;
          const d = Math.hypot(b.x - boss.x, b.y - boss.y);
          if (d < b.radius + boss.radius) {
            boss.takeDamage(b.damage, this.particles, this.floatingTexts);
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
              hit = true;
              break;
            }
          }
        }

        if (hit) {
          b.hits++;
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

    // Update Collectibles (Shards & Power-ups)
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      if (item.isShard) {
        // Shard item
        const alive = item.update(dt, this.player.x, this.player.y, this.player.magnetRadius);
        if (!alive || item.y > h + 40) {
          this.items.splice(i, 1);
          continue;
        }

        // Collection radius
        const d = Math.hypot(item.x - this.player.x, item.y - this.player.y);
        if (d < item.size + this.player.radius + 6) {
          audio.playShard();
          const shardVal = (typeof item.value === 'number' && Number.isFinite(item.value) && item.value > 0)
            ? Math.round(item.value)
            : 1;
          this.runShards = (Number.isFinite(this.runShards) ? this.runShards : 0) + shardVal;
          this.floatingTexts.push(new FloatingText(item.x, item.y - 12, `+${shardVal}`, '#ffe600'));
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
    this.ui.updateHud(this.player, this.waveManager, this.runShards);
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
