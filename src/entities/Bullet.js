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
  }

  update(dt, targets = [], particles = null, bullets = null) {
    this.life -= dt;
    this.animAngle += dt * 8.0;

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
      } else {
        // Standard elongated high-velocity laser capsule
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius, this.radius * 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing white core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius * 0.45, this.radius * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Enemy Hazard: Geometric pulsating diamond
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

    ctx.restore();
  }
}
