// Wave Spawner for Campaign Sectors and Endless Scaling Arena Mode
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { SECTORS } from './UpgradeSystem.js';
import { audio } from '../engine/Audio.js';

export class WaveManager {
  constructor(canvasWidth, canvasHeight, mode = 'CAMPAIGN', sectorId = 1, startWave = 1) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.mode = mode; // 'CAMPAIGN' or 'ARENA'
    this.sectorId = sectorId;
    this.sectorDef = SECTORS.find(s => s.id === sectorId) || SECTORS[0];

    // Arena checkpoints: resume runs at a fixed wave boundary instead of 1.
    const safeStart = Number.isFinite(startWave) ? Math.max(1, Math.floor(startWave)) : 1;
    this.currentWave = safeStart;
    this.maxWaves = mode === 'CAMPAIGN' ? this.sectorDef.waves : Infinity;
    this.waveTimer = 0;
    this.spawnQueue = [];
    this.isWaveActive = false;
    this.bossSpawned = false;
    this.boss = null;
    this.waveDelay = 2.0;

    this.bannerMessage = null;
    this.bannerTimer = 0;

    // Training range: a sandbox with no automatic waves. Enemies are spawned
    // explicitly via `spawnTrainingEnemy` so the player can measure damage.
    if (mode === 'TRAINING') {
      this.isWaveActive = false;
      this.training = true;
      return;
    }

    this.initWave(this.currentWave);
  }

  initWave(waveNum) {
    this.currentWave = waveNum;
    this.spawnQueue = [];
    this.isWaveActive = true;
    this.bossSpawned = false;
    this.boss = null;
    this.waveTimer = 0;

    if (this.mode === 'CAMPAIGN') {
      if (waveNum === this.maxWaves) {
        // Final Boss Wave!
        this.setBanner(`⚠ WARNING: ${this.sectorDef.bossName}! ⚠`, 3.4);
        this.boss = new Boss(
          this.canvasWidth,
          this.canvasHeight,
          this.sectorDef.bossName,
          this.sectorDef.bossHp,
          this.sectorDef.color,
          {
            type: this.sectorDef.bossType,
            threat: this.sectorDef.threat || Math.ceil(this.sectorId / 2),
            minionHpMult: this.sectorDef.minionHpMult,
            minionDifficulty: this.getEnemyDifficulty(),
            alertMuted: true
          }
        );
        this.bossSpawned = true;
        audio.playTrack('boss');
        audio.playWarningSting();
      } else {
        this.setBanner(`WAVE ${waveNum}/${this.maxWaves}`, 2.2);
        this.generateCampaignWave(waveNum);
      }
    } else {
      // Endless Arena Mode
      if (waveNum % 5 === 0) {
        // Arena Boss Wave every 5 waves!
        const bossTier = Math.ceil(waveNum / 5);
        const bossTypes = ['guardian', 'prism', 'hex', 'octagon', 'chronos', 'devil', 'leviathan', 'reaper', 'titan', 'demon_king'];
        const bossColors = {
          guardian: '#00f0ff',
          prism: '#ffe600',
          hex: '#ff007f',
          octagon: '#9d00ff',
          chronos: '#7df9ff',
          devil: '#ff3300',
          leviathan: '#9d00ff',
          reaper: '#ff0055',
          titan: '#3a86ff',
          demon_king: '#ff1100'
        };
        const bossType = bossTypes[(bossTier - 1) % bossTypes.length];
        const bossName = `ARENA TITAN MK-${bossTier}`;
        const bossHp = Math.round(1400 + waveNum * 380 + waveNum * waveNum * 9);
        this.setBanner(`⚠ ARENA BOSS: ${bossName}! ⚠`, 3.2);
        this.boss = new Boss(
          this.canvasWidth,
          this.canvasHeight,
          bossName,
          bossHp,
          bossColors[bossType] || '#ff007f',
          {
            type: bossType,
            threat: Math.min(10, Math.ceil(waveNum / 5)),
            minionHpMult: 1 + waveNum * 0.12,
            minionDifficulty: this.getEnemyDifficulty(),
            alertMuted: true
          }
        );
        this.bossSpawned = true;
        audio.playTrack('boss');
        audio.playWarningSting();
      } else {
        this.setBanner(`ARENA WAVE ${waveNum}`, 2.0);
        this.generateArenaWave(waveNum);
      }
    }
  }

  getEnemyDifficulty() {
    const wave = Math.max(1, Number.isFinite(this.currentWave) ? this.currentWave : 1);

    if (this.mode === 'TRAINING') {
      return { damageMult: 1, fireRateMult: 1, speedMult: 1 };
    }

    if (this.mode === 'ARENA') {
      return {
        damageMult: Math.min(8, 1 + (wave - 1) * 0.05),
        fireRateMult: Math.min(3.2, 1 + (wave - 1) * 0.03),
        speedMult: Math.min(1.8, 1 + (wave - 1) * 0.01)
      };
    }

    const sector = Math.max(1, Number.isFinite(this.sectorId) ? this.sectorId : 1);
    return {
      damageMult: Math.min(8, 1 + (sector - 1) * 0.2 + (wave - 1) * 0.025),
      fireRateMult: Math.min(3.4, 1 + (sector - 1) * 0.07 + (wave - 1) * 0.02),
      speedMult: Math.min(1.8, 1 + (sector - 1) * 0.02 + (wave - 1) * 0.005)
    };
  }

  generateCampaignWave(wave) {
    const enemyCount = Math.min(72, Math.round(7 + wave * 2.4));
    const hpMult = 1.0 + (this.sectorId - 1) * 0.55 + (wave - 1) * 0.16;
    const difficulty = this.getEnemyDifficulty();

    // Rich pool of thematic enemy types
    const pool = ['SCOUT', 'BUG_WASP', 'PLANE_VIPER'];
    if (wave >= 2) pool.push('BUZZSAW', 'BUG_SCARAB', 'HALLOWEEN_PUMPKIN');
    if (wave >= 3) pool.push('HALLOWEEN_BAT', 'DEVIL');
    if (wave >= 4) pool.push('RHOMBUS', 'SNIPER');
    if (wave >= 5) pool.push('PLANE_BOMBER', 'HALLOWEEN_SKULL');
    if (wave >= 6) pool.push('INTERCEPTOR');

    for (let i = 0; i < enemyCount; i++) {
      const typeKey = pool[Math.floor(Math.random() * pool.length)];

      this.spawnQueue.push({
        delay: 0.35 + i * Math.max(0.32, 1.7 / Math.sqrt(wave + 1)),
        x: 40 + Math.random() * (this.canvasWidth - 80),
        y: -30,
        type: typeKey,
        hpMult: hpMult,
        difficulty: difficulty
      });
    }
  }

  generateArenaWave(wave) {
    // Endless scaling waves with growing intensity and enemy types
    const enemyCount = Math.min(92, 8 + Math.floor(wave * 2.5));
    const hpMult = 1.0 + (wave - 1) * 0.26;
    const difficulty = this.getEnemyDifficulty();

    const pool = ['SCOUT', 'BUG_WASP', 'PLANE_VIPER'];
    if (wave >= 2) pool.push('BUZZSAW', 'BUG_SCARAB', 'HALLOWEEN_PUMPKIN');
    if (wave >= 3) pool.push('HALLOWEEN_BAT', 'DEVIL');
    if (wave >= 4) pool.push('RHOMBUS', 'SNIPER');
    if (wave >= 5) pool.push('PLANE_BOMBER', 'HALLOWEEN_SKULL');
    if (wave >= 6) pool.push('INTERCEPTOR');

    for (let i = 0; i < enemyCount; i++) {
      const typeKey = pool[Math.floor(Math.random() * pool.length)];

      this.spawnQueue.push({
        delay: 0.32 + i * Math.max(0.28, (1.8 - wave * 0.07)),
        x: 35 + Math.random() * (this.canvasWidth - 70),
        y: -30,
        type: typeKey,
        hpMult: hpMult,
        difficulty: difficulty
      });
    }
  }

  setBanner(msg, duration = 2.0) {
    this.bannerMessage = msg;
    this.bannerTimer = duration;
  }

  update(dt, enemies) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerMessage = null;
    }

    // Training range never advances waves — the player controls spawns.
    if (this.mode === 'TRAINING') {
      return 'CONTINUE';
    }

    this.waveTimer += dt;

    // Check spawn queue
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const item = this.spawnQueue[i];
      if (this.waveTimer >= item.delay) {
        enemies.push(new Enemy(item.x, item.y, item.type, item.hpMult, item.difficulty));
        this.spawnQueue.splice(i, 1);
      }
    }

    // Check if wave is completed
    const noEnemiesLeft = enemies.length === 0 && this.spawnQueue.length === 0;
    const bossDefeated = !this.bossSpawned || (this.boss && this.boss.dead);

    if (noEnemiesLeft && bossDefeated && this.isWaveActive) {
      this.isWaveActive = false;
      this.waveDelay = 2.5; // Short breather between waves
    }

    if (!this.isWaveActive) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        if (this.mode === 'CAMPAIGN' && this.currentWave >= this.maxWaves) {
          // Campaign Sector Cleared!
          return 'VICTORY';
        } else {
          // Proceed to next wave
          this.initWave(this.currentWave + 1);
        }
      }
    }

    return 'CONTINUE';
  }

  // --- Training range ---------------------------------------------------
  // Spawn one enemy (or a practice boss) on demand. Returns the entity.
  spawnTrainingEnemy(typeKey, enemies, hpMultiplier = 1) {
    const x = 60 + Math.random() * Math.max(40, this.canvasWidth - 120);
    const enemy = new Enemy(x, -30, typeKey, hpMultiplier, this.getEnemyDifficulty());
    // Practice targets hold position in the upper third so they're easy to hit.
    enemy.training = true;
    enemy.canvasHeight = this.canvasHeight;
    enemies.push(enemy);
    return enemy;
  }

  spawnTrainingBoss(name, maxHp, color, enemies) {
    const boss = new Boss(this.canvasWidth, this.canvasHeight, name, maxHp, color, {
      type: 'guardian',
      threat: 1,
      minionHpMult: 1,
      minionDifficulty: this.getEnemyDifficulty(),
      alertMuted: true
    });
    boss.training = true;
    this.boss = boss;
    this.bossSpawned = true;
    return boss;
  }

  clearTrainingBoss() {
    if (this.boss && this.boss.training) {
      this.boss = null;
      this.bossSpawned = false;
    }
  }

  getShardMultiplier() {
    let mult = 1.0;
    if (this.mode === 'ARENA') {
      const wave = Number.isFinite(this.currentWave) ? this.currentWave : 1;
      mult = 1.0 + (wave - 1) * 0.35;
    } else {
      const sec = Number.isFinite(this.sectorId) ? this.sectorId : 1;
      mult = 1.0 + (sec - 1) * 0.3;
    }
    return Number.isFinite(mult) && mult > 0 ? mult : 1.0;
  }
}
