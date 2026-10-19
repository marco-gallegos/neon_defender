// Colossal Multi-Phase Bosses — geometric titans, devils, reapers and eldritch horrors
import { Bullet } from './Bullet.js';
import { Particle, FloatingText } from './Particle.js';
import { ShardItem, PowerupCapsule } from './Powerup.js';
import { Enemy } from './Enemy.js';
import { audio } from '../engine/Audio.js';

const BOSS_TYPES = {
  guardian: {
    radius: 58,
    speed: 84,
    drift: 10,
    freq: 1.1,
    minions: ['SCOUT', 'RHOMBUS']
  },
  prism: {
    radius: 56,
    speed: 72,
    drift: 18,
    freq: 1.35,
    minions: ['SCOUT', 'SNIPER']
  },
  hex: {
    radius: 64,
    speed: 92,
    drift: 13,
    freq: 1.2,
    minions: ['BUG_WASP', 'BUG_SCARAB']
  },
  octagon: {
    radius: 70,
    speed: 98,
    drift: 15,
    freq: 1.05,
    minions: ['RHOMBUS', 'INTERCEPTOR']
  },
  chronos: {
    radius: 76,
    speed: 78,
    drift: 24,
    freq: 0.9,
    minions: ['INTERCEPTOR', 'SNIPER']
  },
  devil: {
    radius: 82,
    speed: 112,
    drift: 18,
    freq: 1.45,
    minions: ['DEVIL', 'HALLOWEEN_BAT']
  },
  leviathan: {
    radius: 84,
    speed: 66,
    drift: 28,
    freq: 0.7,
    minions: ['HALLOWEEN_SKULL', 'BUG_SCARAB']
  },
  reaper: {
    radius: 78,
    speed: 102,
    drift: 22,
    freq: 1.5,
    minions: ['HALLOWEEN_SKULL', 'HALLOWEEN_BAT', 'DEVIL']
  },
  titan: {
    radius: 90,
    speed: 58,
    drift: 12,
    freq: 0.8,
    minions: ['PLANE_BOMBER', 'INTERCEPTOR']
  },
  demon_king: {
    radius: 98,
    speed: 96,
    drift: 22,
    freq: 1.25,
    minions: ['DEVIL', 'HALLOWEEN_SKULL', 'HALLOWEEN_BAT']
  }
};

const PHASE_NAMES = ['AWAKENED', 'ENRAGED', 'APOCALYPSE'];

export class Boss {
  constructor(canvasWidth, canvasHeight, name, maxHp, color = '#ff007f', options = {}) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.color = color;

    const typeDef = BOSS_TYPES[options.type] ? options.type : 'octagon';
    const def = BOSS_TYPES[typeDef];
    this.type = typeDef;
    this.radius = options.radius || def.radius;
    this.vx = (options.speed || def.speed);
    this.drift = def.drift;
    this.moveFreq = def.freq;

    this.x = canvasWidth / 2;
    this.y = -this.radius * 1.75;
    this.targetY = Math.max(this.radius + 76, 120);

    this.angle = 0;
    this.spiralAngle = Math.random() * Math.PI * 2;
    this.ringAngle = 0;
    this.age = 0;
    this.pulse = 0;

    this.phase = 1;
    this.phaseCount = 3;
    this.attackTimer = 1.4;
    this.specialTimer = 5.0;
    this.summonTimer = 8.5;
    this.invulnerableTimer = 0;

    this.dead = false;
    this.isDying = false;
    this.dyingTimer = 3.0;

    this.threat = Math.max(1, options.threat || 1);
    this.minionHpMult = Number.isFinite(options.minionHpMult)
      ? options.minionHpMult
      : 1 + this.threat * 0.18;
    this.minionDifficulty = options.minionDifficulty || {
      damageMult: 1 + this.threat * 0.12,
      fireRateMult: 1 + this.threat * 0.05,
      speedMult: 1 + this.threat * 0.015
    };
    this.minionTypes = Array.isArray(options.minionTypes) && options.minionTypes.length
      ? options.minionTypes
      : def.minions;

    audio.playBossAlert();
  }

  get attackDamage() {
    return 8 + this.threat * 1.55 + this.phase * 2.2;
  }

  update(dt, player, bullets, particles, floatingTexts, enemies) {
    this.age += dt;
    this.pulse += dt * 4.5;

    // Death sequence — chain explosions across the whole body
    if (this.isDying) {
      this.dyingTimer -= dt;
      if (Math.random() < 0.75) {
        audio.playExplosion(false);
        const ox = (Math.random() - 0.5) * this.radius * 2.2;
        const oy = (Math.random() - 0.5) * this.radius * 2.2;
        particles.push(new Particle(this.x + ox, this.y + oy, 0, 0, '#ffffff', 8, 0.4, 'ring'));
        for (let i = 0; i < 7; i++) {
          particles.push(new Particle(
            this.x + ox, this.y + oy,
            (Math.random() - 0.5) * 190,
            (Math.random() - 0.5) * 190,
            this.color, 5, 0.55, 'shard'
          ));
        }
      }
      if (this.dyingTimer <= 0) this.dead = true;
      return !this.dead;
    }

    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

    // Entrance animation
    if (this.y < this.targetY) {
      this.y = Math.min(this.targetY, this.y + 135 * dt);
      return true;
    }

    this.angle += dt * (0.62 + this.phase * 0.2 + this.threat * 0.012);

    // Horizontal sweep + archetype-specific drift
    const speedBoost = 1 + (this.phase - 1) * 0.14;
    this.x += this.vx * speedBoost * dt;
    const minX = this.radius + 24;
    const maxX = this.canvasWidth - this.radius - 24;
    if (this.x < minX) {
      this.x = minX;
      this.vx = Math.abs(this.vx);
    } else if (this.x > maxX) {
      this.x = maxX;
      this.vx = -Math.abs(this.vx);
    }

    let bob = Math.sin(this.age * this.moveFreq) * this.drift;
    if (this.type === 'devil' || this.type === 'demon_king') {
      bob += Math.abs(Math.sin(this.age * 1.9)) * 7;
    } else if (this.type === 'leviathan') {
      bob += Math.sin(this.age * 0.55) * 9;
    } else if (this.type === 'reaper') {
      bob += Math.sin(this.age * 2.1) * 5;
    } else if (this.type === 'chronos') {
      bob += Math.cos(this.age * 1.35) * 8;
    }
    this.y = this.targetY + bob;

    // Phase escalation at 66% and 33%
    const ratio = this.hp / this.maxHp;
    const nextPhase = ratio > 0.66 ? 1 : (ratio > 0.33 ? 2 : 3);
    if (nextPhase > this.phase) {
      this.enterPhase(nextPhase, particles, floatingTexts);
    }

    // Primary attack cadence
    this.attackTimer -= dt;
    if (this.attackTimer <= 0 && this.invulnerableTimer <= 0) {
      this.performAttack(player, bullets);
      this.attackTimer = Math.max(
        0.46,
        1.12 - (this.phase - 1) * 0.18 - this.threat * 0.012
      );
    }

    // Special bullet-hell nova
    this.specialTimer -= dt;
    if (this.specialTimer <= 0 && this.invulnerableTimer <= 0) {
      this.specialTimer = Math.max(3.1, 8.8 - this.phase * 1.15 - this.threat * 0.12);
      this.performSpecial(bullets, particles);
    }

    // Summon reinforcements
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = Math.max(6.2, 11.5 - this.phase * 1.0 - this.threat * 0.1);
      this.performSummon(particles, enemies, floatingTexts);
    }

    return !this.dead;
  }

  enterPhase(newPhase, particles, floatingTexts) {
    this.phase = newPhase;
    this.invulnerableTimer = 0.8;
    this.attackTimer = 0.55;
    this.specialTimer = 1.5;
    this.spiralAngle += Math.PI * 0.6;

    audio.playBossAlert();
    particles.push(new Particle(this.x, this.y, 0, 0, '#ffffff', 30, 0.8, 'ring'));
    particles.push(new Particle(this.x, this.y, 0, 0, this.color, 24, 0.7, 'ring'));
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push(new Particle(
        this.x, this.y,
        Math.cos(a) * (120 + Math.random() * 140),
        Math.sin(a) * (120 + Math.random() * 140),
        this.color, 5, 0.6, 'shard'
      ));
    }

    floatingTexts.push(new FloatingText(
      this.x,
      this.y - this.radius - 22,
      `PHASE ${this.phase} — ${PHASE_NAMES[this.phase - 1]}!`,
      this.phase === 3 ? '#ff0033' : '#ffe600',
      true
    ));
  }

  // ================= ATTACK HELPERS =================

  spawnBullet(bullets, x, y, angle, speed, damage, opts = {}) {
    bullets.push(new Bullet(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      damage,
      false,
      {
        color: opts.color || this.color,
        radius: opts.radius || 5.5,
        type: opts.type || 'plasma',
        homing: Boolean(opts.homing),
        life: opts.life || 4.2
      }
    ));
  }

  fireAimedFrom(ox, oy, player, bullets, count, spread, speed, damage, opts = {}) {
    const base = Math.atan2(player.y - oy, player.x - ox);
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : ((i - (count - 1) / 2) / (count - 1)) * spread;
      this.spawnBullet(bullets, ox, oy, base + offset, speed, damage, opts);
    }
  }

  fireAimed(player, bullets, count, spread, speed, damage, opts = {}) {
    this.fireAimedFrom(this.x, this.y, player, bullets, count, spread, speed, damage, opts);
  }

  fireRing(bullets, count, speed, damage, rotation = 0, opts = {}) {
    for (let i = 0; i < count; i++) {
      const angle = rotation + (i * Math.PI * 2) / count;
      this.spawnBullet(bullets, this.x, this.y, angle, speed, damage, opts);
    }
  }

  fireSpiral(bullets, arms, speed, damage, step = 0.42, opts = {}) {
    this.spiralAngle += step;
    this.fireRing(bullets, arms, speed, damage, this.spiralAngle, opts);
  }

  fireMissiles(bullets, count, damage, opts = {}) {
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const ox = this.x + side * (this.radius * 0.45 + row * 18);
      const oy = this.y + this.radius * 0.35 + row * 10;
      const angle = Math.PI / 2 + side * (0.25 + row * 0.08);
      this.spawnBullet(bullets, ox, oy, angle, 155 + this.threat * 4, damage, {
        color: opts.color || '#ff0033',
        type: 'missile',
        homing: true,
        radius: opts.radius || 6,
        life: opts.life || 5.0
      });
    }
  }

  // ================= ATTACK PATTERNS =================

  performAttack(player, bullets) {
    const dmg = this.attackDamage;
    const speed = 185 + Math.min(90, this.threat * 6);
    const p = this.phase;

    switch (this.type) {
      case 'guardian': {
        if (p === 1) {
          this.fireAimed(player, bullets, 5, 0.55, speed, dmg);
          if (Math.random() < 0.45) this.fireMissiles(bullets, 2, dmg * 1.1);
        } else if (p === 2) {
          this.fireRing(bullets, 10, speed * 0.9, dmg, this.angle * 0.7);
          this.fireAimed(player, bullets, 3, 0.22, speed * 1.15, dmg);
          if (Math.random() < 0.6) this.fireMissiles(bullets, 2, dmg * 1.15);
        } else {
          this.fireSpiral(bullets, 14, speed, dmg, 0.36);
          this.fireAimed(player, bullets, 5, 0.4, speed * 1.1, dmg);
          if (Math.random() < 0.7) this.fireMissiles(bullets, 2, dmg * 1.2);
        }
        break;
      }

      case 'prism': {
        if (p === 1) {
          this.fireAimed(player, bullets, 3, 0.18, speed * 1.3, dmg * 1.05);
          this.fireAimedFrom(this.x - this.radius * 0.7, this.y, player, bullets, 1, 0, speed, dmg * 0.85);
          this.fireAimedFrom(this.x + this.radius * 0.7, this.y, player, bullets, 1, 0, speed, dmg * 0.85);
        } else if (p === 2) {
          this.fireAimedFrom(this.x - this.radius * 0.75, this.y, player, bullets, 3, 0.5, speed, dmg * 0.9, { color: '#ffe600' });
          this.fireAimedFrom(this.x + this.radius * 0.75, this.y, player, bullets, 3, 0.5, speed * 1.08, dmg * 0.9, { color: '#ffffff' });
          this.fireRing(bullets, 6, speed * 0.8, dmg, -this.angle, { color: '#ffe600' });
        } else {
          this.fireSpiral(bullets, 10, speed, dmg, 0.5, { color: '#ffe600' });
          this.fireRing(bullets, 6, speed * 0.75, dmg, -this.angle * 1.4, { color: '#ffffff' });
          if (Math.random() < 0.6) this.fireMissiles(bullets, 2, dmg * 1.2);
        }
        break;
      }

      case 'hex': {
        if (p === 1) {
          this.fireRing(bullets, 6, speed * 0.9, dmg, this.angle * 0.8);
          this.fireAimed(player, bullets, 3, 0.25, speed * 1.1, dmg);
        } else if (p === 2) {
          this.fireSpiral(bullets, 6, speed, dmg, 0.46);
          this.fireAimed(player, bullets, 1, 0, speed * 1.8, dmg * 1.15, { radius: 4.5, color: '#ffe600' });
        } else {
          this.fireRing(bullets, 12, speed, dmg, this.angle);
          this.fireSpiral(bullets, 6, speed * 0.9, dmg, 0.3);
          this.fireAimed(player, bullets, 5, 0.4, speed * 1.15, dmg);
        }
        break;
      }

      case 'octagon': {
        if (p === 1) {
          this.fireRing(bullets, 8, speed * 0.95, dmg, this.angle * 0.6);
          this.fireAimed(player, bullets, 5, 0.42, speed, dmg);
        } else if (p === 2) {
          this.fireRing(bullets, 8, speed, dmg, this.angle);
          this.fireRing(bullets, 8, speed * 0.72, dmg * 0.9, -this.angle * 1.4, { color: '#ffffff' });
          this.fireAimed(player, bullets, 3, 0.2, speed * 1.2, dmg);
        } else {
          this.fireRing(bullets, 16, speed, dmg, this.angle * 1.2);
          this.fireSpiral(bullets, 8, speed * 0.9, dmg, 0.28, { color: '#ffffff' });
          if (Math.random() < 0.7) this.fireMissiles(bullets, 3, dmg * 1.2);
        }
        break;
      }

      case 'chronos': {
        if (p === 1) {
          // Time shear — three aimed volleys at different velocities
          this.fireAimed(player, bullets, 3, 0.24, speed * 0.82, dmg);
          this.fireAimed(player, bullets, 3, 0.18, speed * 1.02, dmg * 0.9);
          this.fireAimed(player, bullets, 3, 0.12, speed * 1.22, dmg * 0.8);
        } else if (p === 2) {
          this.fireAimed(player, bullets, 4, 0.12, speed, dmg);
          const cross = Math.atan2(player.y - this.y, player.x - this.x) + Math.PI / 2;
          for (let i = 0; i < 4; i++) {
            const off = ((i - 1.5) / 3) * 0.3;
            this.spawnBullet(bullets, this.x, this.y, cross + off, speed * 0.9, dmg * 0.9, { color: '#ffffff' });
          }
          this.fireSpiral(bullets, 6, speed * 0.95, dmg * 0.85, 0.34);
        } else {
          this.fireSpiral(bullets, 12, speed, dmg, 0.4);
          this.fireRing(bullets, 6, speed * 0.7, dmg * 0.85, -this.angle * 1.5, { color: '#ffffff' });
          if (Math.random() < 0.7) this.fireMissiles(bullets, 2, dmg * 1.25);
        }
        break;
      }

      case 'devil': {
        if (p === 1) {
          this.fireAimed(player, bullets, 5, 0.55, speed, dmg, { color: '#ff4400' });
          this.fireMissiles(bullets, 2, dmg * 1.15);
        } else if (p === 2) {
          this.fireRing(bullets, 12, speed * 0.95, dmg, this.angle, { color: '#ff3300' });
          this.fireAimed(player, bullets, 5, 0.45, speed * 1.1, dmg);
          this.fireMissiles(bullets, 2, dmg * 1.2);
        } else {
          this.fireRing(bullets, 18, speed, dmg, this.angle * 1.1, { color: '#ff2200' });
          this.fireAimedFrom(this.x - this.radius * 0.4, this.y, player, bullets, 5, 0.4, speed * 1.15, dmg);
          this.fireAimedFrom(this.x + this.radius * 0.4, this.y, player, bullets, 5, 0.4, speed * 1.15, dmg);
          if (Math.random() < 0.75) this.fireMissiles(bullets, 4, dmg * 1.25);
        }
        break;
      }

      case 'leviathan': {
        if (p === 1) {
          this.fireSpiral(bullets, 6, speed * 0.85, dmg, 0.34, { color: '#9d00ff' });
          this.fireAimed(player, bullets, 3, 0.3, speed, dmg);
        } else if (p === 2) {
          this.fireRing(bullets, 12, speed * 0.8, dmg, this.angle * 0.7, { color: '#9d00ff' });
          this.fireRing(bullets, 8, speed * 0.55, dmg * 1.1, -this.angle, { color: '#39ff14' });
          this.fireAimed(player, bullets, 3, 0.25, speed * 1.15, dmg);
        } else {
          this.fireSpiral(bullets, 16, speed * 0.9, dmg, 0.22, { color: '#9d00ff' });
          this.fireRing(bullets, 10, speed * 0.55, dmg * 1.1, -this.angle * 1.3, { color: '#39ff14' });
          if (Math.random() < 0.6) this.fireMissiles(bullets, 2, dmg * 1.3);
        }
        break;
      }

      case 'reaper': {
        if (p === 1) {
          // Crescent scythe sweep
          const base = Math.atan2(player.y - this.y, player.x - this.x);
          for (let i = 0; i < 7; i++) {
            const off = ((i - 3) / 3) * 0.75;
            const spd = speed * (1.25 - Math.abs(i - 3) * 0.08);
            this.spawnBullet(bullets, this.x, this.y, base + off, spd, dmg, { color: '#ff0055' });
          }
        } else if (p === 2) {
          this.fireRing(bullets, 10, speed, dmg, this.angle, { color: '#ff0055' });
          this.fireAimed(player, bullets, 5, 0.35, speed * 1.1, dmg);
          if (Math.random() < 0.5) this.fireMissiles(bullets, 2, dmg * 1.2, { color: '#ff2277' });
        } else {
          this.fireRing(bullets, 16, speed, dmg, this.angle * 1.2, { color: '#ff0055' });
          this.fireSpiral(bullets, 6, speed * 0.95, dmg * 0.9, 0.3, { color: '#ffffff' });
          if (Math.random() < 0.8) this.fireMissiles(bullets, 3, dmg * 1.3, { color: '#ff2277' });
        }
        break;
      }

      case 'titan': {
        if (p === 1) {
          this.fireAimed(player, bullets, 3, 0.22, speed * 0.78, dmg * 1.25, { radius: 7 });
          this.fireRing(bullets, 6, speed * 0.8, dmg, this.angle * 0.5, { color: '#3a86ff' });
        } else if (p === 2) {
          this.fireRing(bullets, 8, speed, dmg, this.angle, { color: '#3a86ff' });
          this.fireAimed(player, bullets, 5, 0.35, speed * 1.05, dmg);
          this.fireMissiles(bullets, 2, dmg * 1.2);
        } else {
          this.fireRing(bullets, 16, speed, dmg, this.angle * 1.15, { color: '#3a86ff' });
          this.fireAimed(player, bullets, 7, 0.5, speed * 1.1, dmg);
          if (Math.random() < 0.8) this.fireMissiles(bullets, 3, dmg * 1.25);
        }
        break;
      }

      case 'demon_king':
      default: {
        if (p === 1) {
          this.fireAimed(player, bullets, 7, 0.6, speed, dmg, { color: '#ff2200' });
          this.fireRing(bullets, 12, speed * 0.85, dmg * 0.9, this.angle, { color: '#ff5500' });
        } else if (p === 2) {
          this.fireSpiral(bullets, 8, speed, dmg, 0.38, { color: '#ff2200' });
          this.fireRing(bullets, 8, speed * 0.7, dmg * 0.9, -this.angle * 1.4, { color: '#ffaa00' });
          this.fireAimed(player, bullets, 5, 0.4, speed * 1.12, dmg);
          this.fireMissiles(bullets, 3, dmg * 1.2);
        } else {
          this.fireRing(bullets, 20, speed, dmg, this.angle * 1.2, { color: '#ff1100' });
          this.fireSpiral(bullets, 10, speed * 0.9, dmg * 0.9, 0.28, { color: '#ff5500' });
          this.fireAimed(player, bullets, 9, 0.65, speed * 1.1, dmg);
          if (Math.random() < 0.85) this.fireMissiles(bullets, 4, dmg * 1.3);
        }
        break;
      }
    }
  }

  performSpecial(bullets, particles) {
    audio.playBossAlert();
    const dmg = this.attackDamage * 0.9;
    const count = 14 + this.phase * 2 + (this.type === 'demon_king' ? 6 : 0);

    this.fireRing(bullets, count, 160 + this.threat * 3, dmg, this.angle * 1.7, {
      color: this.color,
      radius: 5
    });

    if (this.phase >= 2) {
      this.fireRing(bullets, Math.round(count * 0.7), 115 + this.threat * 2, dmg * 0.85, -this.angle, {
        color: '#ffe600',
        radius: 4.5
      });
    }
    if (this.phase >= 3) {
      this.fireRing(bullets, Math.round(count * 0.55), 210, dmg * 1.05, this.angle * 2.2, {
        color: '#ffffff',
        radius: 4
      });
    }

    particles.push(new Particle(this.x, this.y, 0, 0, this.color, 14, 0.55, 'ring'));
    particles.push(new Particle(this.x, this.y, 0, 0, '#ffffff', 9, 0.45, 'ring'));
  }

  performSummon(particles, enemies, floatingTexts) {
    if (!enemies || enemies.length >= 9) return;
    if (!this.minionTypes || this.minionTypes.length === 0) return;

    const count = this.phase >= 3 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const typeKey = this.minionTypes[Math.floor(Math.random() * this.minionTypes.length)];
      const spawnX = Math.max(40, Math.min(this.canvasWidth - 40, this.x + (Math.random() - 0.5) * this.radius * 2));
      enemies.push(new Enemy(
        spawnX,
        -30 - i * 28,
        typeKey,
        this.minionHpMult,
        this.minionDifficulty
      ));
    }

    particles.push(new Particle(this.x, this.y, 0, 0, this.color, 12, 0.5, 'ring'));
    if (floatingTexts) {
      floatingTexts.push(new FloatingText(
        this.x,
        this.y - this.radius - 10,
        'SUMMONING LEGIONS!',
        '#ff7700',
        true
      ));
    }
  }

  takeDamage(amount, particles, floatingTexts, isEmp = false) {
    if (this.isDying || this.dead) return;

    // Brief invulnerability shield during phase transitions
    if (this.invulnerableTimer > 0) {
      if (particles && Math.random() < 0.5) {
        particles.push(new Particle(
          this.x + (Math.random() - 0.5) * this.radius,
          this.y + (Math.random() - 0.5) * this.radius,
          0, 0, '#ffffff', 3, 0.2, 'spark'
        ));
      }
      return;
    }

    this.hp -= amount;
    const isCrit = amount > 30 && !isEmp;

    floatingTexts.push(new FloatingText(
      this.x + (Math.random() - 0.5) * this.radius * 0.8,
      this.y + (Math.random() - 0.5) * this.radius * 0.7,
      Math.round(amount).toString(),
      isCrit ? '#ffe600' : '#ffffff',
      isCrit
    ));

    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(
        this.x + (Math.random() - 0.5) * this.radius * 0.7,
        this.y + (Math.random() - 0.5) * this.radius * 0.7,
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120,
        this.color, 3, 0.3, 'spark'
      ));
    }

    if (this.hp <= 0 && !this.isDying) {
      this.hp = 0;
      this.isDying = true;
      this.dyingTimer = 2.4 + Math.min(1.6, this.radius / 70);
      audio.playExplosion(true);
    }
  }

  onDestroy(particles, items, shardMultiplier = 1.0) {
    audio.playExplosion(true);

    particles.push(new Particle(this.x, this.y, 0, 0, '#ffffff', 26, 0.9, 'ring'));
    particles.push(new Particle(this.x, this.y, 0, 0, this.color, 20, 0.8, 'ring'));
    particles.push(new Particle(this.x, this.y, 0, 0, '#ffe600', 16, 0.7, 'ring'));

    const mult = (typeof shardMultiplier === 'number' && Number.isFinite(shardMultiplier) && shardMultiplier > 0)
      ? shardMultiplier
      : 1.0;
    const baseDrop = 60 + this.maxHp / 420;
    const totalShards = Math.min(340, Math.max(24, Math.round(baseDrop * mult)));
    for (let i = 0; i < totalShards; i++) {
      const val = i % 8 === 0 ? 25 : (i % 3 === 0 ? 5 : 1);
      items.push(new ShardItem(
        this.x + (Math.random() - 0.5) * this.radius * 1.6,
        this.y + (Math.random() - 0.5) * this.radius * 1.6,
        val
      ));
    }

    // Guaranteed powerups from the wreckage
    items.push(new PowerupCapsule(this.x - 28, this.y, 'OVERDRIVE'));
    items.push(new PowerupCapsule(this.x + 28, this.y, 'SPREAD'));
    items.push(new PowerupCapsule(this.x, this.y + 22, 'SHIELD'));
    if (this.maxHp >= 20000) {
      items.push(new PowerupCapsule(this.x - 46, this.y + 10, 'BOMB'));
      items.push(new PowerupCapsule(this.x + 46, this.y + 10, 'HEALTH'));
    }
  }

  // ================= RENDER =================

  rgba(hex, alpha) {
    let h = String(hex || '#ff007f').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    if (!Number.isFinite(num)) return `rgba(255,0,127,${alpha})`;
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  polygonPath(ctx, sides, radius, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i * Math.PI * 2) / sides;
      const px = Math.cos(a) * radius;
      const py = Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  drawAura(ctx, r) {
    const base = 0.13 + Math.sin(this.pulse * 0.6) * 0.035 + (this.phase - 1) * 0.055;
    const grad = ctx.createRadialGradient(0, 0, r * 0.22, 0, 0, r * 1.75);
    grad.addColorStop(0, this.rgba(this.color, Math.min(0.5, base + 0.16)));
    grad.addColorStop(0.55, this.rgba(this.color, base * 0.6));
    grad.addColorStop(1, this.rgba(this.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.75, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx) {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    this.drawAura(ctx, this.radius);

    // Enraged phase halo
    if (this.phase >= 2) {
      ctx.save();
      ctx.rotate(this.angle * (this.phase === 3 ? -1.8 : 1.3));
      ctx.strokeStyle = this.rgba(this.phase === 3 ? '#ff0033' : '#ffe600', 0.55);
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 11]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.phase === 3 ? 30 : 18;
    ctx.fillStyle = '#070a18';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.6;

    switch (this.type) {
      case 'guardian': this.drawGuardian(ctx, this.radius); break;
      case 'prism': this.drawPrism(ctx, this.radius); break;
      case 'hex': this.drawHex(ctx, this.radius); break;
      case 'octagon': this.drawOctagon(ctx, this.radius); break;
      case 'chronos': this.drawChronos(ctx, this.radius); break;
      case 'devil': this.drawDevil(ctx, this.radius, false); break;
      case 'leviathan': this.drawLeviathan(ctx, this.radius); break;
      case 'reaper': this.drawReaper(ctx, this.radius); break;
      case 'titan': this.drawTitan(ctx, this.radius); break;
      case 'demon_king':
      default: this.drawDevil(ctx, this.radius, true); break;
    }

    // Phase-transition invulnerability bubble
    if (this.invulnerableTimer > 0) {
      const alpha = Math.min(0.85, this.invulnerableTimer);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * (1.35 + Math.sin(this.age * 20) * 0.04), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawGuardian(ctx, r) {
    // Orbiting armor frame
    ctx.save();
    ctx.rotate(this.angle * 0.55);
    this.polygonPath(ctx, 8, r * 1.12, Math.PI / 8);
    ctx.strokeStyle = this.rgba(this.color, 0.85);
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI * 2) / 8;
      const px = Math.cos(a) * r * 1.12;
      const py = Math.sin(a) * r * 1.12;
      ctx.fillStyle = i % 2 === 0 ? this.color : '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Central cube chassis
    ctx.save();
    ctx.rotate(Math.sin(this.age * 0.8) * 0.06 - this.angle * 0.22);
    const s = r * 0.58;

    // Top face
    ctx.fillStyle = '#0a0f24';
    ctx.beginPath();
    ctx.moveTo(-s, -s);
    ctx.lineTo(-s * 0.45, -s * 1.5);
    ctx.lineTo(s * 0.45, -s * 1.5);
    ctx.lineTo(s, -s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Side face
    ctx.beginPath();
    ctx.moveTo(s, -s);
    ctx.lineTo(s * 0.45, -s * 1.5);
    ctx.lineTo(s * 0.45, s * 0.5);
    ctx.lineTo(s, s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front face
    ctx.beginPath();
    ctx.rect(-s, -s, s * 2, s * 2);
    ctx.fill();
    ctx.stroke();

    // Inner target square
    ctx.save();
    ctx.rotate(-this.angle);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-s * 0.48, -s * 0.48, s * 0.96, s * 0.96);
    ctx.restore();
    ctx.restore();

    // Core eye
    const pulse = 1 + Math.sin(this.pulse) * 0.08;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPrism(ctx, r) {
    ctx.save();
    ctx.rotate(this.angle * 0.24);

    // Main diamond body
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.25);
    ctx.lineTo(r * 0.82, 0);
    ctx.lineTo(0, r * 1.25);
    ctx.lineTo(-r * 0.82, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Facets
    ctx.strokeStyle = this.rgba(this.color, 0.8);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.25);
    ctx.lineTo(0, r * 1.25);
    ctx.moveTo(-r * 0.82, 0);
    ctx.lineTo(r * 0.82, 0);
    ctx.moveTo(0, -r * 1.25);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(0, r * 1.25);
    ctx.lineTo(r * 0.4, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Counter-rotating inner prism
    ctx.save();
    ctx.rotate(-this.angle * 0.7);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.52);
    ctx.lineTo(r * 0.36, 0);
    ctx.lineTo(0, r * 0.52);
    ctx.lineTo(-r * 0.36, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Pulsar core
    const glow = 0.7 + Math.sin(this.pulse) * 0.3;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 28 * glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.19 * (1 + glow * 0.12), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting shards
    for (let i = 0; i < 3; i++) {
      const a = this.angle * 1.5 + (i * Math.PI * 2) / 3;
      ctx.save();
      ctx.translate(Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = i === 0 ? '#ffffff' : this.color;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.16);
      ctx.lineTo(r * 0.1, r * 0.1);
      ctx.lineTo(-r * 0.1, r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawHex(ctx, r) {
    ctx.save();
    ctx.rotate(this.angle * 0.16);

    // Outer spikes + shell
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.16) * r * 0.92, Math.sin(a - 0.16) * r * 0.92);
      ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
      ctx.lineTo(Math.cos(a + 0.16) * r * 0.92, Math.sin(a + 0.16) * r * 0.92);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    this.polygonPath(ctx, 6, r, 0);
    ctx.fill();
    ctx.stroke();

    // Counter-rotating inner hex
    ctx.save();
    ctx.rotate(-this.angle * 1.4);
    this.polygonPath(ctx, 6, r * 0.58);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Vertex cannon pods
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      const px = Math.cos(a) * r * 0.88;
      const py = Math.sin(a) * r * 0.88;
      ctx.fillStyle = i % 2 === 0 ? this.color : '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#070a18';
      ctx.beginPath();
      ctx.arc(px, py, r * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    // Slit eye
    ctx.fillStyle = this.phase === 3 ? '#ff2200' : this.color;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.34, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.1, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawOctagon(ctx, r) {
    ctx.save();
    ctx.rotate(this.angle * 0.2);

    // 8-point spike star
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const rad = i % 2 === 0 ? r * 1.34 : r * 0.92;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Octagonal armor
    this.polygonPath(ctx, 8, r * 0.86, Math.PI / 8);
    ctx.fillStyle = '#0a0f24';
    ctx.fill();
    ctx.stroke();

    // Inner octagram
    ctx.save();
    ctx.rotate(-this.angle * 1.1);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      const px = Math.cos(a) * r * 0.5;
      const py = Math.sin(a) * r * 0.5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Armor node lights
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI * 2) / 8;
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : this.color;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Diamond core
    ctx.save();
    ctx.rotate(-this.angle * 0.5);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.3);
    ctx.lineTo(r * 0.22, 0);
    ctx.lineTo(0, r * 0.3);
    ctx.lineTo(-r * 0.22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawChronos(ctx, r) {
    // Outer time ring
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.02, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.stroke();

    // Clock ticks
    ctx.strokeStyle = this.rgba(this.color, 0.85);
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86);
      ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
      ctx.stroke();
    }

    // Inner rings
    ctx.strokeStyle = this.rgba('#ffffff', 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.rotate(-this.angle * 0.8);
    ctx.setLineDash([6, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Clock hands
    ctx.save();
    ctx.rotate(this.angle * 0.95);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.1);
    ctx.lineTo(0, -r * 0.74);
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, -r * 0.74, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(-this.angle * 2.2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.08);
    ctx.lineTo(r * 0.48, 0);
    ctx.stroke();
    ctx.restore();

    // Orbiting time orbs
    for (let i = 0; i < 4; i++) {
      const a = -this.angle * 1.5 + (i * Math.PI) / 2;
      const px = Math.cos(a) * r * 1.16;
      const py = Math.sin(a) * r * 1.16;
      ctx.fillStyle = i % 2 === 0 ? this.color : '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, r * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central all-seeing eye
    ctx.fillStyle = '#070a18';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = this.phase === 3 ? '#ff2200' : this.color;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.26, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.06, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWing(ctx, r, dir, flap) {
    const d = dir;
    ctx.beginPath();
    ctx.moveTo(d * r * 0.42, -r * 0.1);
    ctx.quadraticCurveTo(d * r * 1.25, -r * 0.85 - flap, d * r * 1.88, -r * 0.42 - flap);
    ctx.quadraticCurveTo(d * r * 1.38, -r * 0.02, d * r * 1.62, r * 0.38);
    ctx.quadraticCurveTo(d * r * 1.18, r * 0.2, d * r * 0.96, r * 0.55);
    ctx.quadraticCurveTo(d * r * 0.74, r * 0.22, d * r * 0.42, r * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = this.rgba('#ffffff', 0.28);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(d * r * 0.5, r * 0.0);
    ctx.quadraticCurveTo(d * r * 1.15, -r * 0.35 - flap * 0.5, d * r * 1.7, -r * 0.35 - flap);
    ctx.moveTo(d * r * 0.55, r * 0.15);
    ctx.quadraticCurveTo(d * r * 1.1, r * 0.05, d * r * 1.5, r * 0.28);
    ctx.stroke();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.6;
  }

  drawDevil(ctx, r, isKing) {
    const flap = Math.sin(this.age * 4.2) * r * 0.055;

    // Bat wings
    this.drawWing(ctx, r, 1, flap);
    this.drawWing(ctx, r, -1, flap);

    // Crown of hell (Demon King only)
    if (isKing) {
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 22;
      for (let i = -2; i <= 2; i++) {
        const bx = i * r * 0.2;
        const tipX = i * r * 0.27;
        const height = i === 0 ? r * 0.78 : r * (0.52 + Math.abs(i) * 0.05);
        ctx.beginPath();
        ctx.moveTo(bx - r * 0.07, -r * 0.62);
        ctx.lineTo(tipX, -r * 0.62 - height);
        ctx.lineTo(bx + r * 0.07, -r * 0.62);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#070a18';
      ctx.shadowBlur = 18;
    }

    // Demon head silhouette with curved horns
    ctx.beginPath();
    ctx.moveTo(0, r * 0.98);
    ctx.lineTo(r * 0.34, r * 0.78);
    ctx.lineTo(r * 0.6, r * 0.44);
    ctx.lineTo(r * 0.7, r * 0.05);
    ctx.lineTo(r * 0.88, -r * 0.3);
    // Right horn
    ctx.quadraticCurveTo(r * 1.24, -r * 0.88, r * 1.06, -r * 1.46);
    ctx.quadraticCurveTo(r * 0.72, -r * 0.98, r * 0.42, -r * 0.68);
    ctx.lineTo(r * 0.28, -r * 0.88);
    ctx.lineTo(0, -r * 0.58);
    // Left horn
    ctx.lineTo(-r * 0.28, -r * 0.88);
    ctx.lineTo(-r * 0.42, -r * 0.68);
    ctx.quadraticCurveTo(-r * 0.72, -r * 0.98, -r * 1.06, -r * 1.46);
    ctx.quadraticCurveTo(-r * 1.24, -r * 0.88, -r * 0.88, -r * 0.3);
    ctx.lineTo(-r * 0.7, r * 0.05);
    ctx.lineTo(-r * 0.6, r * 0.44);
    ctx.lineTo(-r * 0.34, r * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Forehead ridges
    ctx.strokeStyle = this.rgba('#ffffff', 0.35);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.36, -r * 0.34);
    ctx.lineTo(0, -r * 0.1);
    ctx.lineTo(r * 0.36, -r * 0.34);
    ctx.stroke();

    // Eyes
    const eyeColor = this.phase === 3 ? '#ffdd00' : '#ffe600';
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 16;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.16, -r * 0.2);
      ctx.lineTo(side * r * 0.44, -r * 0.34);
      ctx.lineTo(side * r * 0.4, -r * 0.12);
      ctx.closePath();
      ctx.fill();
    }

    // Third eye for the Demon King
    if (isKing) {
      ctx.fillStyle = this.phase >= 2 ? '#ff2200' : '#9d00ff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.42, r * 0.09, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.42, r * 0.025, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nostrils
    ctx.fillStyle = '#000000';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.1, r * 0.1);
      ctx.lineTo(side * r * 0.18, r * 0.22);
      ctx.lineTo(side * r * 0.04, r * 0.2);
      ctx.closePath();
      ctx.fill();
    }

    // Fiendish grin with fangs
    ctx.fillStyle = '#120003';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.5, r * 0.46, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 4;
    for (let i = -2; i <= 2; i++) {
      const fx = i * r * 0.14;
      ctx.beginPath();
      ctx.moveTo(fx - r * 0.045, r * 0.35);
      ctx.lineTo(fx, r * 0.5);
      ctx.lineTo(fx + r * 0.045, r * 0.35);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = -1; i <= 1; i++) {
      const fx = i * r * 0.17;
      ctx.beginPath();
      ctx.moveTo(fx - r * 0.04, r * 0.68);
      ctx.lineTo(fx, r * 0.55);
      ctx.lineTo(fx + r * 0.04, r * 0.68);
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 18;
    ctx.strokeStyle = this.color;
  }

  drawLeviathan(ctx, r) {
    // Writhing tentacles
    ctx.strokeStyle = this.rgba(this.color, 0.85);
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8 + Math.sin(this.age * 0.8 + i) * 0.16;
      const sx = Math.cos(a) * r * 0.5;
      const sy = Math.sin(a) * r * 0.5;
      const wobble = Math.sin(this.age * 1.9 + i * 1.3) * r * 0.14;
      const ex = Math.cos(a) * (r * 1.56) + Math.cos(a + Math.PI / 2) * wobble;
      const ey = Math.sin(a) * (r * 1.42) + Math.sin(a + Math.PI / 2) * wobble;
      const cx = Math.cos(a + 0.45) * r * 1.24;
      const cy = Math.sin(a + 0.45) * r * 1.24;

      ctx.lineWidth = 5.5 - (i % 3);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();

      ctx.fillStyle = i % 2 === 0 ? this.color : '#39ff14';
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }

    // Jagged maw ring
    const teeth = 16;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i * Math.PI) / teeth + this.angle * 0.25;
      const rad = i % 2 === 0 ? r * 1.02 : r * 0.82;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Concentric rotating mouth rings
    for (let ring = 0; ring < 3; ring++) {
      ctx.save();
      ctx.rotate(this.angle * (ring % 2 === 0 ? 1 : -1) * (1 + ring * 0.35));
      ctx.strokeStyle = ring === 1 ? '#39ff14' : this.color;
      ctx.lineWidth = 2.4 - ring * 0.4;
      ctx.setLineDash(ring === 1 ? [10, 8] : []);
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.64 - ring * 0.15), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Inner teeth
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      const a = -this.angle * 1.6 + (i * Math.PI * 2) / 12;
      const px = Math.cos(a) * r * 0.4;
      const py = Math.sin(a) * r * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.12) * r * 0.5, Math.sin(a - 0.12) * r * 0.5);
      ctx.lineTo(px, py);
      ctx.lineTo(Math.cos(a + 0.12) * r * 0.5, Math.sin(a + 0.12) * r * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    // Abyssal eye
    ctx.fillStyle = '#03040a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.27, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.phase === 3 ? '#39ff14' : this.color;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.035, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 18;
  }

  drawReaper(ctx, r) {
    const sway = Math.sin(this.age * 1.7) * r * 0.025;
    ctx.save();
    ctx.translate(sway, 0);

    // Scythe wings
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(dir * r * 0.5, -r * 0.18);
      ctx.quadraticCurveTo(dir * r * 1.72, -r * 1.28, dir * r * 1.52, r * 0.34);
      ctx.quadraticCurveTo(dir * r * 1.02, -r * 0.16, dir * r * 0.5, r * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blade highlight
      ctx.strokeStyle = this.rgba('#ffffff', 0.5);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(dir * r * 0.66, -r * 0.18);
      ctx.quadraticCurveTo(dir * r * 1.58, -r * 1.02, dir * r * 1.44, r * 0.16);
      ctx.stroke();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.6;
      ctx.restore();
    }

    // Tattered cloak
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.06);
    ctx.quadraticCurveTo(r * 0.56, -r * 0.9, r * 0.72, -r * 0.18);
    ctx.lineTo(r * 0.82, r * 0.4);
    ctx.lineTo(r * 0.56, r * 0.24);
    ctx.lineTo(r * 0.64, r * 0.96);
    ctx.lineTo(r * 0.32, r * 0.66);
    ctx.lineTo(r * 0.14, r * 1.08);
    ctx.lineTo(0, r * 0.76);
    ctx.lineTo(-r * 0.14, r * 1.08);
    ctx.lineTo(-r * 0.32, r * 0.66);
    ctx.lineTo(-r * 0.64, r * 0.96);
    ctx.lineTo(-r * 0.56, r * 0.24);
    ctx.lineTo(-r * 0.82, r * 0.4);
    ctx.lineTo(-r * 0.72, -r * 0.18);
    ctx.quadraticCurveTo(-r * 0.56, -r * 0.9, 0, -r * 1.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hood trim
    ctx.strokeStyle = this.rgba('#ffffff', 0.25);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.52, -r * 0.5);
    ctx.quadraticCurveTo(0, -r * 0.9, r * 0.52, -r * 0.5);
    ctx.stroke();

    // Void face
    ctx.fillStyle = '#010208';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.18, r * 0.38, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soul-fire eyes
    ctx.fillStyle = this.phase === 3 ? '#ff2200' : this.color;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 20;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * r * 0.16, -r * 0.22, r * 0.09, r * 0.045, side * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spectral jaw / soul wisps
    ctx.strokeStyle = this.rgba(this.color, 0.55);
    ctx.lineWidth = 1.8;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.14, r * 0.02);
      ctx.quadraticCurveTo(i * r * 0.2, r * 0.22, i * r * 0.1, r * 0.38);
      ctx.stroke();
    }

    ctx.shadowBlur = 18;
    ctx.strokeStyle = this.color;
    ctx.restore();
  }

  drawTitan(ctx, r) {
    ctx.save();
    ctx.rotate(Math.sin(this.age * 0.6) * 0.03);

    // Shoulder cannon pods
    for (const dir of [-1, 1]) {
      ctx.fillStyle = '#0a0f24';
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(dir * r * 0.98 - r * 0.24, -r * 0.4, r * 0.48, r * 0.78, 8)
        : ctx.rect(dir * r * 0.98 - r * 0.24, -r * 0.4, r * 0.48, r * 0.78);
      ctx.fill();
      ctx.stroke();

      // Cannon barrels
      ctx.fillStyle = this.color;
      ctx.fillRect(dir * r * 0.86 - 3, r * 0.24, 6, r * 0.55);
      ctx.fillRect(dir * r * 1.06 - 3, r * 0.24, 6, r * 0.55);

      // Pod lights
      ctx.fillStyle = this.phase === 3 ? '#ff2200' : '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * r * 0.98, -r * 0.18, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central armored hex body
    ctx.fillStyle = '#0a0f24';
    this.polygonPath(ctx, 6, r * 0.82, Math.PI / 6);
    ctx.fill();
    ctx.stroke();

    // Armor plating lines
    ctx.strokeStyle = this.rgba('#ffffff', 0.28);
    ctx.lineWidth = 1.4;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, i * r * 0.28);
      ctx.lineTo(r * 0.55, i * r * 0.28);
      ctx.stroke();
    }

    // Visor slit
    ctx.fillStyle = this.phase === 3 ? '#ff2200' : this.color;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.rect(-r * 0.4, -r * 0.48, r * 0.8, r * 0.13);
    ctx.fill();

    // Reactor core
    const core = r * 0.28 * (1 + Math.sin(this.pulse) * 0.07);
    ctx.fillStyle = '#03040a';
    ctx.beginPath();
    ctx.arc(0, r * 0.14, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, r * 0.14, core * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, r * 0.14, core * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 18;
    ctx.strokeStyle = this.color;
    ctx.restore();
  }
}
