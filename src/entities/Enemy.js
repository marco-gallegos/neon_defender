// Geometric Enemies with distinct movement and attack patterns
import { Bullet } from './Bullet.js';
import { Particle, FloatingText } from './Particle.js';
import { ShardItem, PowerupCapsule } from './Powerup.js';
import { audio } from '../engine/Audio.js';

export const ENEMY_TYPES = {
  SCOUT: {
    name: 'Scout Triangle',
    hp: 20,
    speed: 130,
    color: '#00f0ff',
    score: 50,
    shards: 2,
    radius: 14
  },
  BUZZSAW: {
    name: 'Neon Buzzsaw',
    hp: 45,
    speed: 160,
    color: '#ff7700',
    score: 90,
    shards: 4,
    radius: 18
  },
  RHOMBUS: {
    name: 'Heavy Rhombus',
    hp: 95,
    speed: 80,
    color: '#ff007f',
    score: 160,
    shards: 8,
    radius: 22
  },
  SNIPER: {
    name: 'Pulsar Sniper',
    hp: 65,
    speed: 70,
    color: '#ffe600',
    score: 130,
    shards: 6,
    radius: 16
  },
  INTERCEPTOR: {
    name: 'Apex Interceptor',
    hp: 80,
    speed: 180,
    color: '#9d00ff',
    score: 180,
    shards: 7,
    radius: 17
  }
};

export class Enemy {
  constructor(x, y, typeKey, hpMultiplier = 1.0) {
    this.x = x;
    this.y = y;
    this.typeKey = typeKey;
    this.def = ENEMY_TYPES[typeKey] || ENEMY_TYPES.SCOUT;

    this.maxHp = Math.round(this.def.hp * hpMultiplier);
    this.hp = this.maxHp;
    this.speed = this.def.speed;
    this.color = this.def.color;
    this.radius = this.def.radius;
    this.score = this.def.score;
    this.shardReward = this.def.shards;

    this.shootTimer = 1.0 + Math.random() * 2.0;
    this.angle = 0;
    this.rotSpeed = (Math.random() - 0.5) * 4;
    this.age = 0;
    this.startX = x;
    this.dead = false;

    // Telegraph laser line for Sniper
    this.isCharging = false;
    this.chargeTimer = 0;
  }

  update(dt, player, bullets, particles, floatingTexts) {
    this.age += dt;
    this.angle += this.rotSpeed * dt;

    // Movement patterns
    if (this.typeKey === 'SCOUT') {
      this.y += this.speed * dt;
      this.x = this.startX + Math.sin(this.age * 3.5) * 55;
    } else if (this.typeKey === 'BUZZSAW') {
      this.y += this.speed * dt;
      this.rotSpeed = 12.0; // Rapidly spins like a Geometry Dash saw
    } else if (this.typeKey === 'RHOMBUS') {
      this.y += this.speed * dt;
      this.x = this.startX + Math.sin(this.age * 1.5) * 35;
    } else if (this.typeKey === 'SNIPER') {
      if (this.y < 120) {
        this.y += this.speed * dt;
      } else {
        // Hover and track
        this.x += Math.sin(this.age * 2) * 40 * dt;
      }
    } else if (this.typeKey === 'INTERCEPTOR') {
      // Swerve towards player X
      this.y += this.speed * dt;
      const dx = player.x - this.x;
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), 110 * dt);
    }

    // Shooting logic
    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && this.y > 20 && this.y < 580) {
      this.fire(player, bullets);
      this.shootTimer = 1.8 + Math.random() * 2.2;
    }

    return !this.dead;
  }

  fire(player, bullets) {
    audio.playShoot(false);

    if (this.typeKey === 'SCOUT') {
      // Single downward bullet
      bullets.push(new Bullet(this.x, this.y + this.radius, 0, 240, 15, false, {
        color: this.color, radius: 4
      }));
    } else if (this.typeKey === 'RHOMBUS') {
      // 3-Way spread
      bullets.push(new Bullet(this.x, this.y + this.radius, 0, 220, 15, false, { color: this.color }));
      bullets.push(new Bullet(this.x, this.y + this.radius, -80, 210, 15, false, { color: this.color }));
      bullets.push(new Bullet(this.x, this.y + this.radius, 80, 210, 15, false, { color: this.color }));
    } else if (this.typeKey === 'SNIPER') {
      // Aimed laser bullet directly at player
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      const vx = Math.cos(angle) * 340;
      const vy = Math.sin(angle) * 340;
      bullets.push(new Bullet(this.x, this.y + this.radius, vx, vy, 25, false, {
        color: this.color, radius: 5
      }));
    } else if (this.typeKey === 'INTERCEPTOR') {
      // Dual burst
      bullets.push(new Bullet(this.x - 8, this.y + 10, 0, 280, 16, false, { color: this.color }));
      bullets.push(new Bullet(this.x + 8, this.y + 10, 0, 280, 16, false, { color: this.color }));
    }
  }

  takeDamage(amount, particles, floatingTexts, isEmp = false) {
    if (this.dead) return;

    this.hp -= amount;
    const isCrit = amount > 25 && !isEmp;
    floatingTexts.push(new FloatingText(
      this.x + (Math.random() - 0.5) * 15,
      this.y - 10,
      Math.round(amount).toString(),
      isCrit ? '#ffe600' : '#ffffff',
      isCrit
    ));

    // Spark on hit
    for (let i = 0; i < 3; i++) {
      particles.push(new Particle(
        this.x, this.y,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80,
        this.color, 3, 0.25, 'spark'
      ));
    }

    if (this.hp <= 0) {
      this.dead = true;
    }
  }

  onDestroy(particles, items, shardMultiplier = 1.0) {
    audio.playExplosion(false);

    // Neon shard debris burst
    for (let i = 0; i < 14; i++) {
      particles.push(new Particle(
        this.x, this.y,
        (Math.random() - 0.5) * 180,
        (Math.random() - 0.5) * 180,
        this.color, 6, 0.6, 'shard'
      ));
    }
    // Ring wave
    particles.push(new Particle(this.x, this.y, 0, 0, this.color, 6, 0.4, 'ring'));

    // Drop Shards with strict numeric validation
    const mult = (typeof shardMultiplier === 'number' && Number.isFinite(shardMultiplier) && shardMultiplier > 0)
      ? shardMultiplier
      : 1.0;
    const baseReward = (typeof this.shardReward === 'number' && Number.isFinite(this.shardReward) && this.shardReward > 0)
      ? this.shardReward
      : 2;
    const shardCount = Math.max(1, Math.round(baseReward * mult));
    for (let i = 0; i < shardCount; i++) {
      items.push(new ShardItem(
        this.x + (Math.random() - 0.5) * 20,
        this.y + (Math.random() - 0.5) * 20,
        1
      ));
    }

    // Chance to drop power-up capsule (~12%)
    if (Math.random() < 0.12) {
      const types = ['SPREAD', 'SHIELD', 'OVERDRIVE', 'BOMB', 'HEALTH'];
      const pick = types[Math.floor(Math.random() * types.length)];
      items.push(new PowerupCapsule(this.x, this.y, pick));
    }
  }

  draw(ctx) {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#0a0d1e';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;

    if (this.typeKey === 'SCOUT') {
      // Sharp neon triangle
      ctx.beginPath();
      ctx.moveTo(0, this.radius);
      ctx.lineTo(this.radius, -this.radius);
      ctx.lineTo(0, -this.radius * 0.4);
      ctx.lineTo(-this.radius, -this.radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.typeKey === 'BUZZSAW') {
      // Geometry Dash 8-tooth buzzsaw
      const teeth = 8;
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const r = (i % 2 === 0) ? this.radius : this.radius * 0.55;
        const a = (i * Math.PI) / teeth;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center hazard dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.typeKey === 'RHOMBUS') {
      // Rotating armored diamond
      ctx.beginPath();
      ctx.moveTo(0, -this.radius * 1.3);
      ctx.lineTo(this.radius, 0);
      ctx.lineTo(0, this.radius * 1.3);
      ctx.lineTo(-this.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-6, -6, 12, 12);
    } else if (this.typeKey === 'SNIPER') {
      // Pulsing laser eye / octagon
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const px = Math.cos(a) * this.radius;
        const py = Math.sin(a) * this.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eye pupil
      ctx.fillStyle = '#ff0044';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Interceptor
      ctx.beginPath();
      ctx.moveTo(0, this.radius + 4);
      ctx.lineTo(this.radius, -this.radius);
      ctx.lineTo(0, -this.radius * 0.2);
      ctx.lineTo(-this.radius, -this.radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
