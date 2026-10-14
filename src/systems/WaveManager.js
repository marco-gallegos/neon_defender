// Wave Spawner for Campaign Sectors and Endless Scaling Arena Mode
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { SECTORS } from './UpgradeSystem.js';

export class WaveManager {
  constructor(canvasWidth, canvasHeight, mode = 'CAMPAIGN', sectorId = 1) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.mode = mode; // 'CAMPAIGN' or 'ARENA'
    this.sectorId = sectorId;
    this.sectorDef = SECTORS.find(s => s.id === sectorId) || SECTORS[0];

    this.currentWave = 1;
    this.maxWaves = mode === 'CAMPAIGN' ? this.sectorDef.waves : Infinity;
    this.waveTimer = 0;
    this.spawnQueue = [];
    this.isWaveActive = false;
    this.bossSpawned = false;
    this.boss = null;
    this.waveDelay = 2.0;

    this.bannerMessage = null;
    this.bannerTimer = 0;

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
        this.setBanner(`WARNING: ${this.sectorDef.bossName}!`, 3.0);
        this.boss = new Boss(
          this.canvasWidth,
          this.canvasHeight,
          this.sectorDef.bossName,
          this.sectorDef.bossHp,
          this.sectorDef.color
        );
        this.bossSpawned = true;
      } else {
        this.setBanner(`WAVE ${waveNum}/${this.maxWaves}`, 2.2);
        this.generateCampaignWave(waveNum);
      }
    } else {
      // Endless Arena Mode
      if (waveNum % 5 === 0) {
        // Arena Boss Wave every 5 waves!
        const bossTier = waveNum / 5;
        const bossName = `ARENA TITAN MK-${bossTier}`;
        const bossHp = 900 + waveNum * 220;
        this.setBanner(`ARENA BOSS: ${bossName}!`, 3.0);
        this.boss = new Boss(
          this.canvasWidth,
          this.canvasHeight,
          bossName,
          bossHp,
          ['#ff007f', '#ffe600', '#00f0ff', '#39ff14', '#9d00ff'][bossTier % 5]
        );
        this.bossSpawned = true;
      } else {
        this.setBanner(`ARENA WAVE ${waveNum}`, 2.0);
        this.generateArenaWave(waveNum);
      }
    }
  }

  generateCampaignWave(wave) {
    const enemyCount = 5 + wave * 2;
    const hpMult = 1.0 + (this.sectorId - 1) * 0.35 + (wave - 1) * 0.1;

    for (let i = 0; i < enemyCount; i++) {
      let typeKey = 'SCOUT';
      const r = Math.random();
      if (wave >= 2 && r > 0.65) typeKey = 'BUZZSAW';
      if (wave >= 4 && r > 0.75) typeKey = 'RHOMBUS';
      if (wave >= 6 && r > 0.85) typeKey = 'SNIPER';
      if (wave >= 7 && r > 0.9) typeKey = 'INTERCEPTOR';

      this.spawnQueue.push({
        delay: 0.5 + i * (1.8 / Math.sqrt(wave + 1)),
        x: 40 + Math.random() * (this.canvasWidth - 80),
        y: -30,
        type: typeKey,
        hpMult: hpMult
      });
    }
  }

  generateArenaWave(wave) {
    // Endless scaling waves with growing intensity and enemy types
    const enemyCount = 7 + Math.floor(wave * 2.2);
    const hpMult = 1.0 + (wave - 1) * 0.22;

    for (let i = 0; i < enemyCount; i++) {
      let typeKey = 'SCOUT';
      const r = Math.random();
      if (wave >= 2 && r > 0.5) typeKey = 'BUZZSAW';
      if (wave >= 4 && r > 0.65) typeKey = 'RHOMBUS';
      if (wave >= 6 && r > 0.75) typeKey = 'SNIPER';
      if (wave >= 8 && r > 0.85) typeKey = 'INTERCEPTOR';

      this.spawnQueue.push({
        delay: 0.4 + i * Math.max(0.4, (2.0 - wave * 0.08)),
        x: 35 + Math.random() * (this.canvasWidth - 70),
        y: -30,
        type: typeKey,
        hpMult: hpMult
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

    this.waveTimer += dt;

    // Check spawn queue
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const item = this.spawnQueue[i];
      if (this.waveTimer >= item.delay) {
        enemies.push(new Enemy(item.x, item.y, item.type, item.hpMult));
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

  getShardMultiplier() {
    let mult = 1.0;
    if (this.mode === 'ARENA') {
      const wave = Number.isFinite(this.currentWave) ? this.currentWave : 1;
      mult = 1.0 + (wave - 1) * 0.35;
    } else {
      const sec = Number.isFinite(this.sectorId) ? this.sectorId : 1;
      mult = 1.0 + (sec - 1) * 0.25;
    }
    return Number.isFinite(mult) && mult > 0 ? mult : 1.0;
  }
}
