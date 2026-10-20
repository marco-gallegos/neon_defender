// Geometric Enemies with distinct movement and attack patterns
import { Bullet } from './Bullet.js';
import { Particle, FloatingText } from './Particle.js';
import { ShardItem, PowerupCapsule } from './Powerup.js';
import { audio } from '../engine/Audio.js';

export const ENEMY_TYPES = {
  SCOUT: {
    name: 'Scout Dart',
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
  BUG_SCARAB: {
    name: 'Cyber Scarab',
    hp: 85,
    speed: 95,
    color: '#00ff88',
    score: 140,
    shards: 6,
    radius: 20
  },
  BUG_WASP: {
    name: 'Neon Hornet',
    hp: 55,
    speed: 175,
    color: '#ffe600',
    score: 160,
    shards: 7,
    radius: 16
  },
  DEVIL: {
    name: 'Neon Diablo',
    hp: 110,
    speed: 85,
    color: '#ff0033',
    score: 220,
    shards: 9,
    radius: 22
  },
  HALLOWEEN_PUMPKIN: {
    name: 'Jack-o-Lantern',
    hp: 75,
    speed: 100,
    color: '#ff7700',
    score: 150,
    shards: 6,
    radius: 20
  },
  HALLOWEEN_BAT: {
    name: 'Dracula Bat',
    hp: 60,
    speed: 165,
    color: '#ff0055',
    score: 170,
    shards: 7,
    radius: 18
  },
  HALLOWEEN_SKULL: {
    name: 'Cyber Skull',
    hp: 95,
    speed: 95,
    color: '#39ff14',
    score: 190,
    shards: 8,
    radius: 20
  },
  PLANE_VIPER: {
    name: 'Stealth Fighter',
    hp: 70,
    speed: 170,
    color: '#3a86ff',
    score: 180,
    shards: 8,
    radius: 18
  },
  PLANE_BOMBER: {
    name: 'Heavy Bomber',
    hp: 160,
    speed: 65,
    color: '#b5179e',
    score: 260,
    shards: 12,
    radius: 26
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
  constructor(x, y, typeKey, hpMultiplier = 1.0, difficulty = {}) {
    this.x = x;
    this.y = y;
    this.typeKey = typeKey;
    this.def = ENEMY_TYPES[typeKey] || ENEMY_TYPES.SCOUT;

    this.maxHp = Math.round(this.def.hp * hpMultiplier);
    this.hp = this.maxHp;

    // Difficulty scaling (damage, cadence, movement)
    this.damageMult = Number.isFinite(difficulty.damageMult) && difficulty.damageMult > 0
      ? difficulty.damageMult
      : 1.0;
    this.fireRateMult = Number.isFinite(difficulty.fireRateMult) && difficulty.fireRateMult > 0
      ? difficulty.fireRateMult
      : 1.0;
    this.speedMult = Number.isFinite(difficulty.speedMult) && difficulty.speedMult > 0
      ? difficulty.speedMult
      : 1.0;

    this.speed = this.def.speed * this.speedMult;
    this.color = this.def.color;
    this.radius = this.def.radius;
    this.score = Math.round(this.def.score * Math.min(4, 1 + (this.damageMult - 1) * 0.35));
    this.shardReward = Math.round(this.def.shards * Math.min(5, 1 + (this.damageMult - 1) * 0.45));

    this.shootTimer = (0.8 + Math.random() * 1.8) / this.fireRateMult;
    this.angle = 0;
    this.rotSpeed = (Math.random() - 0.5) * 3;
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

    // Training range: hold position and don't fight back, so the player can
    // measure damage cleanly without dodging or dying mid-test.
    if (this.training) {
      const targetY = (this.canvasHeight || 800) * 0.28;
      if (this.y < targetY) {
        this.y += this.speed * dt;
      } else {
        this.x = (this.startX ?? this.x) + Math.sin(this.age * 1.2) * 24;
      }
      return !this.dead;
    }

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
        this.x += Math.sin(this.age * 2) * 40 * dt;
      }
    } else if (this.typeKey === 'INTERCEPTOR' || this.typeKey === 'PLANE_VIPER') {
      // Swerve towards player X
      this.y += this.speed * dt;
      const dx = player.x - this.x;
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), 130 * dt);
    } else if (this.typeKey === 'BUG_WASP' || this.typeKey === 'HALLOWEEN_BAT') {
      // Swooping erratic flight
      this.y += this.speed * dt;
      this.x = this.startX + Math.sin(this.age * 5.0) * 70;
    } else if (this.typeKey === 'BUG_SCARAB' || this.typeKey === 'PLANE_BOMBER') {
      // Steady heavy descent
      this.y += this.speed * dt;
      this.x = this.startX + Math.sin(this.age * 1.2) * 30;
    } else if (this.typeKey === 'DEVIL' || this.typeKey === 'HALLOWEEN_SKULL') {
      // Hovering menacing sway
      this.y += this.speed * dt;
      this.x = this.startX + Math.sin(this.age * 2.2) * 45;
    } else if (this.typeKey === 'HALLOWEEN_PUMPKIN') {
      // Bouncing bob motion
      this.y += this.speed * dt;
      this.x = this.startX + Math.sin(this.age * 3.0) * 40;
    } else {
      this.y += this.speed * dt;
    }

    // Shooting logic
    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && this.y > 20 && this.y < 580) {
      const firstBullet = bullets.length;
      this.fire(player, bullets);
      // Scale all bullets fired by this enemy with the sector/arena difficulty
      if (this.damageMult !== 1) {
        for (let i = firstBullet; i < bullets.length; i++) {
          bullets[i].damage = Math.round(bullets[i].damage * this.damageMult);
        }
      }
      this.shootTimer = (1.6 + Math.random() * 2.0) / this.fireRateMult;
    }

    return !this.dead;
  }

  fire(player, bullets) {
    audio.playShoot(false);

    if (this.typeKey === 'DEVIL') {
      // NEON DIABLO: Fires Chasing Hellfire Missiles tracking the player!
      bullets.push(new Bullet(this.x, this.y + this.radius + 2, 0, 220, 20, false, {
        color: '#ff0033',
        type: 'missile',
        homing: true,
        radius: 5.5,
        life: 3.5
      }));
      // Flanking hellfire orbs
      bullets.push(new Bullet(this.x - 12, this.y + 10, -50, 200, 14, false, { color: '#ff3300' }));
      bullets.push(new Bullet(this.x + 12, this.y + 10, 50, 200, 14, false, { color: '#ff3300' }));

    } else if (this.typeKey === 'PLANE_VIPER') {
      // STEALTH FIGHTER: Dual air-to-air chasing missiles flanking out and tracking
      bullets.push(new Bullet(this.x - 10, this.y + 6, -70, 220, 16, false, {
        color: '#3a86ff',
        type: 'missile',
        homing: true,
        radius: 5,
        life: 3.2
      }));
      bullets.push(new Bullet(this.x + 10, this.y + 6, 70, 220, 16, false, {
        color: '#3a86ff',
        type: 'missile',
        homing: true,
        radius: 5,
        life: 3.2
      }));

    } else if (this.typeKey === 'HALLOWEEN_BAT') {
      // DRACULA BAT: Fires Supersonic Blood Missile with chasing tracking!
      bullets.push(new Bullet(this.x, this.y + this.radius, 0, 230, 18, false, {
        color: '#ff0055',
        type: 'missile',
        homing: true,
        radius: 5,
        life: 3.0
      }));

    } else if (this.typeKey === 'BUG_WASP') {
      // NEON HORNET: Piercing stinger aimed at player + chance of tracking stinger
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      bullets.push(new Bullet(this.x, this.y + this.radius, Math.cos(angle) * 320, Math.sin(angle) * 320, 18, false, {
        color: '#39ff14',
        type: 'stinger',
        radius: 4.5
      }));
      if (Math.random() < 0.4) {
        bullets.push(new Bullet(this.x, this.y + this.radius, 0, 200, 15, false, {
          color: '#ffe600',
          type: 'missile',
          homing: true,
          radius: 4.5,
          life: 2.8
        }));
      }

    } else if (this.typeKey === 'HALLOWEEN_PUMPKIN') {
      // JACK-O-LANTERN: Lobs explosive pumpkin bomb
      bullets.push(new Bullet(this.x, this.y + this.radius, (Math.random() - 0.5) * 60, 190, 22, false, {
        color: '#ff7700',
        type: 'pumpkin_bomb',
        radius: 6,
        life: 3.5
      }));

    } else if (this.typeKey === 'PLANE_BOMBER') {
      // HEAVY BOMBER: Heavy carpet spread + 1 chasing cruise missile
      bullets.push(new Bullet(this.x - 18, this.y + 12, -40, 200, 18, false, { color: '#b5179e' }));
      bullets.push(new Bullet(this.x + 18, this.y + 12, 40, 200, 18, false, { color: '#b5179e' }));
      bullets.push(new Bullet(this.x, this.y + 16, 0, 180, 22, false, {
        color: '#ff0055',
        type: 'missile',
        homing: true,
        radius: 6,
        life: 4.0
      }));

    } else if (this.typeKey === 'BUG_SCARAB') {
      // CYBER SCARAB: Twin pincer plasma shots
      bullets.push(new Bullet(this.x - 8, this.y + this.radius, -25, 230, 16, false, { color: '#00ff88' }));
      bullets.push(new Bullet(this.x + 8, this.y + this.radius, 25, 230, 16, false, { color: '#00ff88' }));

    } else if (this.typeKey === 'HALLOWEEN_SKULL') {
      // CYBER SKULL: 3-way soul spread
      bullets.push(new Bullet(this.x, this.y + this.radius, 0, 220, 16, false, { color: '#39ff14' }));
      bullets.push(new Bullet(this.x, this.y + this.radius, -70, 200, 16, false, { color: '#39ff14' }));
      bullets.push(new Bullet(this.x, this.y + this.radius, 70, 200, 16, false, { color: '#39ff14' }));

    } else if (this.typeKey === 'SCOUT') {
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

    // Some types rotate with angle, others face downwards
    const nonRotating = ['PLANE_VIPER', 'PLANE_BOMBER', 'BUG_SCARAB', 'BUG_WASP', 'DEVIL', 'HALLOWEEN_BAT', 'HALLOWEEN_PUMPKIN', 'HALLOWEEN_SKULL'];
    if (!nonRotating.includes(this.typeKey)) {
      ctx.rotate(this.angle);
    }

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#0a0d1e';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;

    const r = this.radius;

    if (this.typeKey === 'DEVIL') {
      // NEON DIABLO: Horned devil face with fanged jaw & glowing amber eyes
      ctx.beginPath();
      // Chin and jaw
      ctx.moveTo(0, r * 1.1);
      ctx.lineTo(r * 0.5, r * 0.5);
      // Cheeks to Horn roots
      ctx.lineTo(r * 0.75, 0);
      // Right curved demon horn
      ctx.quadraticCurveTo(r * 1.3, -r * 0.6, r * 1.1, -r * 1.3);
      ctx.quadraticCurveTo(r * 0.7, -r * 0.8, r * 0.35, -r * 0.5);
      // Forehead
      ctx.lineTo(0, -r * 0.3);
      // Left curved demon horn
      ctx.lineTo(-r * 0.35, -r * 0.5);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.8, -r * 1.1, -r * 1.3);
      ctx.quadraticCurveTo(-r * 1.3, -r * 0.6, -r * 0.75, 0);
      ctx.lineTo(-r * 0.5, r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Angled Demonic Eyes
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 8;
      // Right eye
      ctx.beginPath();
      ctx.moveTo(2, -r * 0.05);
      ctx.lineTo(8, -r * 0.2);
      ctx.lineTo(3, -r * 0.22);
      ctx.closePath();
      ctx.fill();
      // Left eye
      ctx.beginPath();
      ctx.moveTo(-2, -r * 0.05);
      ctx.lineTo(-8, -r * 0.2);
      ctx.lineTo(-3, -r * 0.22);
      ctx.closePath();
      ctx.fill();

      // Fanged Grin
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-7, r * 0.4);
      ctx.lineTo(-4, r * 0.65);
      ctx.lineTo(0, r * 0.45);
      ctx.lineTo(4, r * 0.65);
      ctx.lineTo(7, r * 0.4);
      ctx.stroke();

    } else if (this.typeKey === 'BUG_SCARAB') {
      // CYBER SCARAB: Armored beetle with mandibles & twitching robotic legs
      const legTwitch = Math.sin(this.age * 12) * 3;

      // 6 Robotic bug legs
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.8;
      for (let i = -1; i <= 1; i++) {
        const ly = i * (r * 0.5);
        // Right legs
        ctx.beginPath();
        ctx.moveTo(r * 0.7, ly);
        ctx.lineTo(r * 1.35, ly - 4 + legTwitch * (i === 0 ? -1 : 1));
        ctx.lineTo(r * 1.6, ly + 8);
        ctx.stroke();
        // Left legs
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, ly);
        ctx.lineTo(-r * 1.35, ly - 4 - legTwitch * (i === 0 ? -1 : 1));
        ctx.lineTo(-r * 1.6, ly + 8);
        ctx.stroke();
      }

      // Mandible pincers at front
      ctx.fillStyle = '#0a0d1e';
      ctx.beginPath();
      ctx.moveTo(r * 0.35, r * 0.8);
      ctx.quadraticCurveTo(r * 0.8, r * 1.3, 2, r * 1.4);
      ctx.lineTo(r * 0.15, r * 0.9);
      ctx.moveTo(-r * 0.35, r * 0.8);
      ctx.quadraticCurveTo(-r * 0.8, r * 1.3, -2, r * 1.4);
      ctx.lineTo(-r * 0.15, r * 0.9);
      ctx.stroke();

      // Carapace Body
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.85, r * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Shell split line & segment ribs
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(0, r * 0.8);
      ctx.moveTo(-r * 0.6, -r * 0.2);
      ctx.lineTo(r * 0.6, -r * 0.2);
      ctx.stroke();

      // Glowing cyber eyes
      ctx.fillStyle = '#ffe600';
      ctx.fillRect(-5, r * 0.55, 3, 3);
      ctx.fillRect(2, r * 0.55, 3, 3);

    } else if (this.typeKey === 'BUG_WASP') {
      // NEON HORNET: Flapping translucent wings and lethal stinger
      const wingSpread = Math.cos(this.age * 26) * (r * 1.4);

      // Flapping wings
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = 'rgba(255, 230, 0, 0.25)';
      ctx.lineWidth = 1.3;
      // Right wing
      ctx.beginPath();
      ctx.moveTo(3, -r * 0.2);
      ctx.quadraticCurveTo(r * 1.2, -r * 1.1, wingSpread, -r * 0.3);
      ctx.quadraticCurveTo(r * 0.8, 0, 3, 0);
      ctx.fill();
      ctx.stroke();
      // Left wing
      ctx.beginPath();
      ctx.moveTo(-3, -r * 0.2);
      ctx.quadraticCurveTo(-r * 1.2, -r * 1.1, -wingSpread, -r * 0.3);
      ctx.quadraticCurveTo(-r * 0.8, 0, -3, 0);
      ctx.fill();
      ctx.stroke();

      // Wasp Thorax & Striped Abdomen
      ctx.fillStyle = '#0a0d1e';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.0;

      // Abdomen & sharp Stinger
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.1);
      ctx.lineTo(r * 0.5, -r * 0.1);
      ctx.quadraticCurveTo(r * 0.6, r * 0.6, 0, r * 1.35); // Sharp stinger tip!
      ctx.quadraticCurveTo(-r * 0.6, r * 0.6, -r * 0.5, -r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Yellow neon warning stripes
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * 0.25);
      ctx.lineTo(r * 0.4, r * 0.25);
      ctx.moveTo(-r * 0.3, r * 0.6);
      ctx.lineTo(r * 0.3, r * 0.6);
      ctx.stroke();

      // Head
      ctx.fillStyle = '#0a0d1e';
      ctx.strokeStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, -r * 0.45, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red compound eyes
      ctx.fillStyle = '#ff0044';
      ctx.beginPath();
      ctx.arc(-4, -r * 0.5, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -r * 0.5, 2.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.typeKey === 'HALLOWEEN_PUMPKIN') {
      // JACK-O'-LANTERN: Carved pumpkin with glowing toothy smile
      // Green stem on top
      ctx.fillStyle = '#39ff14';
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-2, -r * 0.85);
      ctx.quadraticCurveTo(-4, -r * 1.25, 3, -r * 1.3);
      ctx.lineTo(3, -r * 0.85);
      ctx.fill();

      // Pumpkin ribbed lobes
      ctx.fillStyle = '#0f0500';
      ctx.strokeStyle = '#ff7700';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.05, r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pumpkin interior glow
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ff5500';
      ctx.shadowBlur = 12;

      // Triangle carved eyes
      ctx.beginPath();
      // Left eye
      ctx.moveTo(-r * 0.5, -r * 0.3);
      ctx.lineTo(-r * 0.2, -r * 0.3);
      ctx.lineTo(-r * 0.35, -r * 0.05);
      ctx.closePath();
      // Right eye
      ctx.moveTo(r * 0.5, -r * 0.3);
      ctx.lineTo(r * 0.2, -r * 0.3);
      ctx.lineTo(r * 0.35, -r * 0.05);
      ctx.closePath();
      // Triangle nose
      ctx.moveTo(0, -r * 0.05);
      ctx.lineTo(-r * 0.12, r * 0.15);
      ctx.lineTo(r * 0.12, r * 0.15);
      ctx.closePath();
      ctx.fill();

      // Sinister carved toothy smile
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, r * 0.25);
      ctx.lineTo(-r * 0.45, r * 0.5);
      ctx.lineTo(-r * 0.25, r * 0.3);
      ctx.lineTo(0, r * 0.55);
      ctx.lineTo(r * 0.25, r * 0.3);
      ctx.lineTo(r * 0.45, r * 0.5);
      ctx.lineTo(r * 0.65, r * 0.25);
      ctx.lineTo(r * 0.45, r * 0.38);
      ctx.lineTo(r * 0.25, r * 0.22);
      ctx.lineTo(0, r * 0.4);
      ctx.lineTo(-r * 0.25, r * 0.22);
      ctx.lineTo(-r * 0.45, r * 0.38);
      ctx.closePath();
      ctx.fill();

    } else if (this.typeKey === 'HALLOWEEN_BAT') {
      // DRACULA BAT: Flapping scalloped wings and vampire ears
      const wingFlap = Math.sin(this.age * 12) * 5;

      ctx.beginPath();
      // Bat head & ears
      ctx.moveTo(0, r * 0.4);
      ctx.lineTo(4, 0);
      ctx.lineTo(6, -r * 0.8); // Right ear
      ctx.lineTo(2, -r * 0.4);
      // Wing right
      ctx.quadraticCurveTo(r * 0.8, -r * 0.8 + wingFlap, r * 1.5, -r * 0.3 + wingFlap);
      // Scalloped arches underneath
      ctx.quadraticCurveTo(r * 1.1, r * 0.1, r * 0.8, r * 0.4 + wingFlap * 0.5);
      ctx.quadraticCurveTo(r * 0.5, r * 0.3, 4, r * 0.7);
      // Bottom tail
      ctx.lineTo(0, r * 0.9);
      // Mirrored Left side
      ctx.lineTo(-4, r * 0.7);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.3, -r * 0.8, r * 0.4 + wingFlap * 0.5);
      ctx.quadraticCurveTo(-r * 1.1, r * 0.1, -r * 1.5, -r * 0.3 + wingFlap);
      ctx.quadraticCurveTo(-r * 0.8, -r * 0.8 + wingFlap, -2, -r * 0.4);
      ctx.lineTo(-6, -r * 0.8); // Left ear
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing crimson eyes
      ctx.fillStyle = '#ff0033';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(-3, -r * 0.1, 1.8, 0, Math.PI * 2);
      ctx.arc(3, -r * 0.1, 1.8, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.typeKey === 'HALLOWEEN_SKULL') {
      // CYBER SKULL: Glowing neon skull with metal jaw
      ctx.beginPath();
      // Cranium dome
      ctx.arc(0, -r * 0.25, r * 0.75, Math.PI, 0, false);
      // Cheekbone step
      ctx.lineTo(r * 0.65, r * 0.15);
      ctx.lineTo(r * 0.4, r * 0.25);
      // Upper jaw
      ctx.lineTo(r * 0.35, r * 0.75);
      ctx.lineTo(-r * 0.35, r * 0.75);
      ctx.lineTo(-r * 0.4, r * 0.25);
      ctx.lineTo(-r * 0.65, r * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sunken Glowing Eye Sockets
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, -r * 0.2, 4.5, 6, -0.2, 0, Math.PI * 2);
      ctx.ellipse(r * 0.3, -r * 0.2, 4.5, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Nose cavity
      ctx.fillStyle = '#0a0d1e';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(2.5, 5);
      ctx.lineTo(-2.5, 5);
      ctx.closePath();
      ctx.fill();

      // Teeth grid
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, r * 0.5);
      ctx.lineTo(r * 0.25, r * 0.5);
      ctx.moveTo(-r * 0.12, r * 0.35);
      ctx.lineTo(-r * 0.12, r * 0.65);
      ctx.moveTo(0, r * 0.35);
      ctx.lineTo(0, r * 0.65);
      ctx.moveTo(r * 0.12, r * 0.35);
      ctx.lineTo(r * 0.12, r * 0.65);
      ctx.stroke();

    } else if (this.typeKey === 'PLANE_VIPER') {
      // STEALTH FIGHTER: Delta wings, nose cone, and twin tail fins
      ctx.beginPath();
      // Nose cone
      ctx.moveTo(0, r * 1.3);
      ctx.lineTo(4, r * 0.4);
      // Delta wing right with missile rails
      ctx.lineTo(r * 1.3, -r * 0.2);
      ctx.lineTo(r * 1.35, -r * 0.5);
      ctx.lineTo(r * 0.5, -r * 0.5);
      // Twin engine rear
      ctx.lineTo(r * 0.25, -r * 0.9);
      ctx.lineTo(0, -r * 0.7);
      ctx.lineTo(-r * 0.25, -r * 0.9);
      // Delta wing left
      ctx.lineTo(-r * 0.5, -r * 0.5);
      ctx.lineTo(-r * 1.35, -r * 0.5);
      ctx.lineTo(-r * 1.3, -r * 0.2);
      ctx.lineTo(-4, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit Canopy
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.2, 3, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Twin Jet Exhaust Flares
      ctx.fillStyle = '#ff7700';
      ctx.fillRect(-r * 0.35, -r * 1.1, 3, 5);
      ctx.fillRect(r * 0.35 - 3, -r * 1.1, 3, 5);

    } else if (this.typeKey === 'PLANE_BOMBER') {
      // HEAVY BOMBER: Massive flying wing stealth bomber
      ctx.beginPath();
      // Nose
      ctx.moveTo(0, r * 0.9);
      ctx.lineTo(r * 0.8, r * 0.2);
      // Extended outer wingtips
      ctx.lineTo(r * 1.6, -r * 0.3);
      ctx.lineTo(r * 1.5, -r * 0.8);
      // Serrated stealth rear edge
      ctx.lineTo(r * 0.8, -r * 0.4);
      ctx.lineTo(r * 0.4, -r * 0.7);
      ctx.lineTo(0, -r * 0.4);
      ctx.lineTo(-r * 0.4, -r * 0.7);
      ctx.lineTo(-r * 0.8, -r * 0.4);
      ctx.lineTo(-r * 1.5, -r * 0.8);
      ctx.lineTo(-r * 1.6, -r * 0.3);
      ctx.lineTo(-r * 0.8, r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Stealth Panel facet lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.6);
      ctx.lineTo(r * 0.5, -r * 0.2);
      ctx.lineTo(r * 0.8, -r * 0.2);
      ctx.moveTo(0, r * 0.6);
      ctx.lineTo(-r * 0.5, -r * 0.2);
      ctx.lineTo(-r * 0.8, -r * 0.2);
      ctx.stroke();

    } else if (this.typeKey === 'SCOUT') {
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
        const r2 = (i % 2 === 0) ? this.radius : this.radius * 0.55;
        const a = (i * Math.PI) / teeth;
        const px = Math.cos(a) * r2;
        const py = Math.sin(a) * r2;
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
