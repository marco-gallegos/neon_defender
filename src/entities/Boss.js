// Multi-Phase Geometric Bosses with Bullet Hell Patterns
import { Bullet } from './Bullet.js';
import { Particle, FloatingText } from './Particle.js';
import { ShardItem, PowerupCapsule } from './Powerup.js';
import { audio } from '../engine/Audio.js';

export class Boss {
  constructor(canvasWidth, canvasHeight, name, maxHp, color = '#ff007f') {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.color = color;
    this.radius = 42;

    this.x = canvasWidth / 2;
    this.y = -60; // Enters from top
    this.targetY = 130;
    this.vx = 70;

    this.angle = 0;
    this.spiralAngle = 0;
    this.age = 0;
    this.phase = 1; // 1: Normal, 2: Overdrive Enrage
    this.attackTimer = 1.0;
    this.summonTimer = 6.0;
    this.dead = false;
    this.isDying = false;
    this.dyingTimer = 2.0;

    audio.playBossAlert();
  }

  update(dt, player, bullets, particles, floatingTexts, enemies) {
    this.age += dt;
    this.angle += dt * 0.8;

    // Death sequence
    if (this.isDying) {
      this.dyingTimer -= dt;
      // Secondary explosions everywhere across the boss body
      if (Math.random() < 0.6) {
        audio.playExplosion(false);
        const ox = (Math.random() - 0.5) * this.radius * 2;
        const oy = (Math.random() - 0.5) * this.radius * 2;
        particles.push(new Particle(this.x + ox, this.y + oy, 0, 0, '#ffffff', 8, 0.4, 'ring'));
        for (let i = 0; i < 6; i++) {
          particles.push(new Particle(
            this.x + ox, this.y + oy,
            (Math.random() - 0.5) * 160,
            (Math.random() - 0.5) * 160,
            this.color, 5, 0.5, 'shard'
          ));
        }
      }

      if (this.dyingTimer <= 0) {
        this.dead = true;
      }
      return !this.dead;
    }

    // Entrance animation
    if (this.y < this.targetY) {
      this.y += 110 * dt;
      return true;
    }

    // Horizontal bobbing motion
    this.x += this.vx * dt;
    if (this.x < this.radius + 30) {
      this.x = this.radius + 30;
      this.vx = Math.abs(this.vx);
    } else if (this.x > this.canvasWidth - this.radius - 30) {
      this.x = this.canvasWidth - this.radius - 30;
      this.vx = -Math.abs(this.vx);
    }

    // Phase check (Enrage at 50% HP)
    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.vx *= 1.4;
      this.color = '#ff0033';
      audio.playBossAlert();
      floatingTexts.push(new FloatingText(this.x, this.y - 40, 'BOSS ENRAGED!!', '#ff0033', true));
    }

    // Attack cycles
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.performAttack(player, bullets);
      this.attackTimer = this.phase === 2 ? 0.8 : 1.25;
    }

    // Minion summon or special hazard
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = 7.0;
      this.performSpecial(bullets, particles);
    }

    return !this.dead;
  }

  performAttack(player, bullets) {
    audio.playShoot(false);

    if (this.phase === 1) {
      // 5-way spread aimed at player
      const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
      const spreads = [-0.35, -0.18, 0, 0.18, 0.35];
      spreads.forEach(offset => {
        const a = baseAngle + offset;
        const vx = Math.cos(a) * 230;
        const vy = Math.sin(a) * 230;
        bullets.push(new Bullet(this.x, this.y + 20, vx, vy, 18, false, {
          color: this.color, radius: 5
        }));
      });

      // Periodically fire twin chasing missiles flanking out
      if (Math.random() < 0.5) {
        bullets.push(new Bullet(this.x - 30, this.y + 10, -110, 160, 20, false, {
          color: '#ff0033', type: 'missile', homing: true, radius: 5.5, life: 3.8
        }));
        bullets.push(new Bullet(this.x + 30, this.y + 10, 110, 160, 20, false, {
          color: '#ff0033', type: 'missile', homing: true, radius: 5.5, life: 3.8
        }));
      }
    } else {
      // Phase 2: Rotating Geometry Spiral Barrage
      this.spiralAngle += 0.45;
      const count = 8;
      for (let i = 0; i < count; i++) {
        const a = this.spiralAngle + (i * Math.PI * 2) / count;
        const vx = Math.cos(a) * 210;
        const vy = Math.sin(a) * 210;
        bullets.push(new Bullet(this.x, this.y, vx, vy, 16, false, {
          color: '#ffe600', radius: 4.5
        }));
      }

      // Fast chasing hellfire missiles
      if (Math.random() < 0.65) {
        bullets.push(new Bullet(this.x - 34, this.y + 5, -130, 180, 24, false, {
          color: '#ff0033', type: 'missile', homing: true, radius: 6, life: 4.2
        }));
        bullets.push(new Bullet(this.x + 34, this.y + 5, 130, 180, 24, false, {
          color: '#ff0033', type: 'missile', homing: true, radius: 6, life: 4.2
        }));
      }
    }
  }

  performSpecial(bullets, particles) {
    audio.playBossAlert();
    // 360-degree Nova burst + homing missile barrage
    const spokes = 12;
    for (let i = 0; i < spokes; i++) {
      const a = (i * Math.PI * 2) / spokes;
      const vx = Math.cos(a) * 180;
      const vy = Math.sin(a) * 180;
      bullets.push(new Bullet(this.x, this.y, vx, vy, 20, false, {
        color: '#ff007f', radius: 5.5
      }));
    }

    // 2 Chasing missiles from core
    bullets.push(new Bullet(this.x - 20, this.y, -90, 170, 22, false, {
      color: '#ff0055', type: 'missile', homing: true, radius: 5.5, life: 4.0
    }));
    bullets.push(new Bullet(this.x + 20, this.y, 90, 170, 22, false, {
      color: '#ff0055', type: 'missile', homing: true, radius: 5.5, life: 4.0
    }));

    particles.push(new Particle(this.x, this.y, 0, 0, this.color, 12, 0.5, 'ring'));
  }

  takeDamage(amount, particles, floatingTexts, isEmp = false) {
    if (this.isDying || this.dead) return;

    this.hp -= amount;
    const isCrit = amount > 30 && !isEmp;

    floatingTexts.push(new FloatingText(
      this.x + (Math.random() - 0.5) * 35,
      this.y + (Math.random() - 0.5) * 30,
      Math.round(amount).toString(),
      isCrit ? '#ffe600' : '#ffffff',
      isCrit
    ));

    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(
        this.x + (Math.random() - 0.5) * 25,
        this.y + (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        this.color, 3, 0.3, 'spark'
      ));
    }

    if (this.hp <= 0 && !this.isDying) {
      this.hp = 0;
      this.isDying = true;
      audio.playExplosion(true);
    }
  }

  onDestroy(particles, items, shardMultiplier = 1.0) {
    audio.playExplosion(true);

    // Huge shockwaves
    particles.push(new Particle(this.x, this.y, 0, 0, '#ffffff', 20, 0.8, 'ring'));
    particles.push(new Particle(this.x, this.y, 0, 0, this.color, 15, 0.7, 'ring'));

    // Jackpot shards drop with strict numeric validation
    const mult = (typeof shardMultiplier === 'number' && Number.isFinite(shardMultiplier) && shardMultiplier > 0)
      ? shardMultiplier
      : 1.0;
    const totalShards = Math.max(10, Math.round(60 * mult));
    for (let i = 0; i < totalShards; i++) {
      const val = i % 8 === 0 ? 25 : (i % 3 === 0 ? 5 : 1);
      items.push(new ShardItem(
        this.x + (Math.random() - 0.5) * 60,
        this.y + (Math.random() - 0.5) * 60,
        val
      ));
    }

    // Guaranteed powerups!
    items.push(new PowerupCapsule(this.x - 25, this.y, 'OVERDRIVE'));
    items.push(new PowerupCapsule(this.x + 25, this.y, 'SPREAD'));
    items.push(new PowerupCapsule(this.x, this.y + 20, 'SHIELD'));
  }

  draw(ctx) {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#060818';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3.0;

    // Geometric Boss Outer Hull (Layered Octagon with Spikes)
    const sides = 8;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i * Math.PI * 2) / sides;
      const px = Math.cos(a) * this.radius;
      const py = Math.sin(a) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner rotating diamond
    ctx.save();
    ctx.rotate(-this.angle * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.radius * 0.45, -this.radius * 0.45, this.radius * 0.9, this.radius * 0.9);

    // Glowing core eye
    ctx.fillStyle = this.phase === 2 ? '#ff0033' : this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
