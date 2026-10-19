// Laser, Plasma, and Secondary Weapon Projectiles
import { Particle } from './Particle.js';

export class Bullet {
  constructor(x, y, vx, vy, damage, isPlayer = true, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.isPlayer = isPlayer;
    this.isCrit = options.isCrit || false;
    this.color = options.color || (isPlayer ? '#00f0ff' : '#ff0055');
    this.radius = options.radius || (isPlayer ? 5 : 4);
    this.type = options.type || 'plasma'; // 'plasma', 'laser', 'missile', 'railgun', 'cluster', 'shrapnel', 'vortex', 'hazard'
    this.shape = options.shape || null; // Ship-specific projectile silhouette
    this.homing = options.homing || false;
    this.life = options.life || 3.0;
    this.maxLife = this.life;
    this.pierce = options.pierce || 1;
    this.hits = 0;
    this.dead = false;

    // Special weapon properties
    this.splashRadius = options.splashRadius || 0;
    this.splashDamage = options.splashDamage || 0;
    this.shrapnelCount = options.shrapnelCount || 0;
    this.shrapnelDamage = options.shrapnelDamage || 0;

    // Animation & Trail Timers
    this.trailTimer = 0;
    this.animAngle = Math.random() * Math.PI * 2;
    this.vortexTimer = 0;
    this.wavePhase = options.wavePhase || 0;
    this.waveAmp = options.waveAmp || 0;
    this.waveTime = 0;
  }

  update(dt, targets = [], particles = null, bullets = null) {
    this.life -= dt;
    this.animAngle += dt * 8.0;

    // Sinusoidal wave oscillation for wave weapons
    if (this.type === 'wave') {
      this.waveTime += dt;
      this.x += Math.cos(this.waveTime * 13 + this.wavePhase) * (this.waveAmp || 150) * dt;
    }

    if (this.life <= 0) {
      this.dead = true;
      this.handleDestruction(particles, bullets, targets);
      return false;
    }

    // Trail generation for Missiles & Rockets
    if (this.type === 'missile' && particles) {
      this.trailTimer += dt;
      if (this.trailTimer >= 0.035) {
        this.trailTimer = 0;
        const exhaustAngle = Math.atan2(this.vy, this.vx) + Math.PI;
        const exX = this.x + Math.cos(exhaustAngle) * 8;
        const exY = this.y + Math.sin(exhaustAngle) * 8;
        particles.push(new Particle(
          exX, exY,
          Math.cos(exhaustAngle) * 80 + (Math.random() - 0.5) * 30,
          Math.sin(exhaustAngle) * 80 + (Math.random() - 0.5) * 30,
          this.color,
          2.8,
          0.22,
          'spark'
        ));
      }
    }

    // Homing missile logic (drones and player seeker missiles)
    if (this.homing && targets.length > 0) {
      let nearest = null;
      let minDist = 600;
      for (const target of targets) {
        if (target.dead) continue;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d < minDist) {
          minDist = d;
          nearest = target;
        }
      }

      if (nearest) {
        const targetAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
        const currentAngle = Math.atan2(this.vy, this.vx);
        let diff = targetAngle - currentAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const speed = Math.hypot(this.vx, this.vy) || 450;
        const turnSpeed = 9.5; // High responsiveness for chasing missiles
        const newAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * dt);
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    // Vortex singularity logic
    if (this.type === 'vortex') {
      this.vortexTimer += dt;
      if (this.vortexTimer >= 0.12 && targets.length > 0) {
        this.vortexTimer = 0;
        for (const target of targets) {
          if (target.dead) continue;
          const dist = Math.hypot(target.x - this.x, target.y - this.y);
          if (dist < this.radius + (target.radius || 20)) {
            if (typeof target.takeDamage === 'function' && particles) {
              target.takeDamage(this.damage * 0.18, particles, [], false);
            }
          }
        }
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    return !this.dead;
  }

  handleHit(particles, bullets, targets, floatingTexts) {
    // Splash Damage for Seeker Missiles
    if (this.splashRadius > 0 && targets && targets.length > 0) {
      for (const t of targets) {
        if (t.dead) continue;
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d <= this.splashRadius) {
          t.takeDamage(this.splashDamage, particles, floatingTexts, false);
        }
      }
      if (particles) {
        particles.push(new Particle(this.x, this.y, 0, 0, this.color, 24, 0.35, 'ring'));
      }
    }

    // Trigger Cluster burst on hit
    if (this.shrapnelCount > 0) {
      this.spawnShrapnel(bullets, particles);
    }
  }

  handleDestruction(particles, bullets, targets) {
    if (this.shrapnelCount > 0 && bullets) {
      this.spawnShrapnel(bullets, particles);
    }

    if (this.type === 'vortex' && particles) {
      particles.push(new Particle(this.x, this.y, 0, 0, this.color, this.radius * 1.5, 0.45, 'ring'));
    }
  }

  spawnShrapnel(bullets, particles) {
    if (!bullets || this.shrapnelCount <= 0) return;
    const count = this.shrapnelCount;
    this.shrapnelCount = 0; // prevent re-triggering

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const spd = 340 + Math.random() * 100;
      bullets.push(new Bullet(
        this.x, this.y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        this.shrapnelDamage,
        true,
        {
          type: 'shrapnel',
          color: '#ffe600',
          radius: 3.5,
          life: 0.55,
          pierce: 1
        }
      ));
    }

    if (particles) {
      particles.push(new Particle(this.x, this.y, 0, 0, '#ff7700', 16, 0.3, 'ring'));
      for (let p = 0; p < 8; p++) {
        particles.push(new Particle(
          this.x, this.y,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          '#ffe600', 3, 0.25, 'spark'
        ));
      }
    }
  }

  // Ship-specific projectile silhouettes (same stats, unique look per vessel)
  drawShipShape(ctx, u) {
    const r = u;
    ctx.fillStyle = this.color;

    switch (this.shape) {
      case 'dart': {
        ctx.beginPath();
        ctx.moveTo(r * 2.2, 0);
        ctx.lineTo(-r * 1.1, -r * 0.9);
        ctx.lineTo(-r * 0.45, 0);
        ctx.lineTo(-r * 1.1, r * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(r * 0.25, 0, r * 0.5, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'cube': {
        ctx.beginPath();
        ctx.rect(-r, -r, r * 2, r * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-r * 0.45, -r * 0.45, r * 0.9, r * 0.9);
        break;
      }
      case 'phoenix': {
        ctx.beginPath();
        ctx.moveTo(r * 2.1, 0);
        ctx.lineTo(r * 0.3, -r * 0.7);
        ctx.lineTo(-r * 0.5, -r * 1.2);
        ctx.lineTo(-r * 0.55, -r * 0.35);
        ctx.lineTo(-r * 1.4, -r * 0.85);
        ctx.lineTo(-r * 0.7, 0);
        ctx.lineTo(-r * 1.4, r * 0.85);
        ctx.lineTo(-r * 0.55, r * 0.35);
        ctx.lineTo(-r * 0.5, r * 1.2);
        ctx.lineTo(r * 0.3, r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(r * 0.5, 0, r * 0.4, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'slicer': {
        ctx.beginPath();
        ctx.moveTo(r * 2.2, 0);
        ctx.quadraticCurveTo(0, -r * 1.1, -r * 1.2, 0);
        ctx.quadraticCurveTo(0, r * 1.1, r * 2.2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r * 1.6, 0);
        ctx.quadraticCurveTo(0, -r * 0.5, -r * 0.7, 0);
        ctx.stroke();
        break;
      }
      case 'fang': {
        ctx.beginPath();
        ctx.moveTo(r * 2.1, 0);
        ctx.lineTo(-r * 0.3, -r * 1.15);
        ctx.lineTo(-r * 1.1, -r * 0.4);
        ctx.lineTo(-r * 0.65, 0);
        ctx.lineTo(-r * 1.1, r * 0.4);
        ctx.lineTo(-r * 0.3, r * 1.15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(r * 0.35, 0, r * 0.35, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'bat': {
        ctx.beginPath();
        ctx.moveTo(r * 1.9, 0);
        ctx.lineTo(r * 0.2, -r * 0.7);
        ctx.lineTo(-r * 0.3, -r * 0.25);
        ctx.lineTo(-r * 1.5, -r * 1.1);
        ctx.lineTo(-r * 0.9, 0);
        ctx.lineTo(-r * 1.5, r * 1.1);
        ctx.lineTo(-r * 0.3, r * 0.25);
        ctx.lineTo(r * 0.2, r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(r * 0.45, 0, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'scythe': {
        ctx.beginPath();
        ctx.moveTo(r * 1.4, -r * 0.2);
        ctx.quadraticCurveTo(r * 0.1, -r * 1.5, -r * 1.3, -r * 0.5);
        ctx.lineTo(-r * 0.6, -r * 0.1);
        ctx.quadraticCurveTo(r * 0.1, -r * 0.7, r * 1.4, r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r * 1.1, 0);
        ctx.quadraticCurveTo(0, -r * 0.7, -r * 0.9, -r * 0.35);
        ctx.stroke();
        break;
      }
      default: {
        // Standard plasma capsule fallback
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.45, r * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  drawShipBullet(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    this.drawShipShape(ctx, this.radius * 0.95);
    ctx.restore();
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.isCrit ? 14 : 8;
    ctx.fillStyle = this.color;

    if (this.isPlayer) {
      if (this.type === 'missile') {
        // Neon micro-missile (sleek pointed diamond with thruster exhaust flare)
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Missile body
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-7, -4.5);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-7, 4.5);
        ctx.closePath();
        ctx.fill();

        // White core highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-2, -2);
        ctx.lineTo(-2, 2);
        ctx.closePath();
        ctx.fill();

        // Engine glow
        ctx.fillStyle = '#ff7700';
        ctx.beginPath();
        ctx.arc(-5, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'railgun') {
        // Hyper-piercing photon lance
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 30);
        ctx.lineTo(this.x, this.y + 30);
        ctx.stroke();

        // White center core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, this.radius * 0.7);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 25);
        ctx.lineTo(this.x, this.y + 25);
        ctx.stroke();
      } else if (this.type === 'cluster') {
        // Heavy kinetic shell with pulsing vertices
        ctx.translate(this.x, this.y);
        ctx.rotate(this.animAngle);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Glowing outer spikes
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (this.radius - 2), Math.sin(a) * (this.radius - 2));
          ctx.lineTo(Math.cos(a) * (this.radius + 5), Math.sin(a) * (this.radius + 5));
          ctx.stroke();
        }
      } else if (this.type === 'shrapnel') {
        // High velocity jagged shrapnel shard
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, -2.5);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 2.5);
        ctx.closePath();
        ctx.fill();
      } else if (this.type === 'vortex') {
        // Cosmic gravity singularity
        ctx.translate(this.x, this.y);
        ctx.rotate(this.animAngle);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'laser') {
        // Continuous Piercing Photon Beam
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(16, 0);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.8, this.radius * 0.8);
        ctx.beginPath();
        ctx.moveTo(-13, 0);
        ctx.lineTo(13, 0);
        ctx.stroke();

        // Ship-specific energy core at the beam head
        this.drawShipShape(ctx, this.radius * 0.8);

      } else if (this.type === 'spread') {
        // High-velocity Kinetic Vulcan Pellets (ship-shaped)
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        this.drawShipShape(ctx, this.radius * 1.15);

      } else if (this.type === 'wave') {
        // Pulsing Sinusoidal Energy Ripple
        ctx.translate(this.x, this.y);
        ctx.rotate(this.animAngle);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 1.5, 0, Math.PI * 2);
        ctx.stroke();

        // Ship-specific core (kept aligned to travel direction)
        ctx.rotate(Math.atan2(this.vy, this.vx) - this.animAngle);
        this.drawShipShape(ctx, this.radius * 0.85);

      } else if (this.type === 'flame') {
        // Short-range incinerator plume (soft expanding fire blob)
        const lifeFrac = Math.max(0, Math.min(1, this.life / (this.maxLife || 0.4)));
        const grow = 1 + (1 - lifeFrac) * 0.8;
        ctx.globalAlpha = 0.45 + lifeFrac * 0.55;
        ctx.fillStyle = '#ff5500';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * grow, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * grow * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

      } else {
        // Standard high-velocity projectile — silhouette varies per ship
        this.drawShipBullet(ctx);
      }
    } else {
      // Enemy Projectiles
      if (this.type === 'missile') {
        // Chasing Enemy Missile (Menacing rocket with delta fins and thruster exhaust)
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        ctx.fillStyle = this.color || '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 12;

        // Missile Hull
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(-6, -4.5);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-6, 4.5);
        ctx.closePath();
        ctx.fill();

        // Delta stabilizer fins
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-1, -3);
        ctx.lineTo(-7, -7);
        ctx.moveTo(-1, 3);
        ctx.lineTo(-7, 7);
        ctx.stroke();

        // Glowing Warhead Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(4, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Exhaust flame
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(-4, -2.5);
        ctx.lineTo(-11, 0);
        ctx.lineTo(-4, 2.5);
        ctx.closePath();
        ctx.fill();

      } else if (this.type === 'pumpkin_bomb') {
        // Jack-o'-Lantern Explosive Fireball
        ctx.translate(this.x, this.y);
        ctx.rotate(this.animAngle);

        ctx.fillStyle = '#ff7700';
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
        ctx.fill();

        // Jack-o'-lantern carved face silhouette
        ctx.fillStyle = '#110200';
        // Triangle eyes
        ctx.beginPath();
        ctx.moveTo(-3, -2);
        ctx.lineTo(-1, -4);
        ctx.lineTo(-1, -2);
        ctx.moveTo(3, -2);
        ctx.lineTo(1, -4);
        ctx.lineTo(1, -2);
        // Jagged toothy grin
        ctx.moveTo(-4, 2);
        ctx.lineTo(-2, 4);
        ctx.lineTo(0, 2);
        ctx.lineTo(2, 4);
        ctx.lineTo(4, 2);
        ctx.closePath();
        ctx.fill();

      } else if (this.type === 'stinger') {
        // Cyber Wasp Piercing Needle
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-6, -2);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-6, 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -1, 4, 2);

      } else {
        // Standard geometric pulsating diamond
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.radius);
        ctx.lineTo(this.x + this.radius, this.y);
        ctx.lineTo(this.x, this.y + this.radius);
        ctx.lineTo(this.x - this.radius, this.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
