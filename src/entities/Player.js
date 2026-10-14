// Player Ship Entity with Wingman Drones, Shields, and Modular Weapons
import { Bullet } from './Bullet.js';
import { Particle, FloatingText } from './Particle.js';
import { SHIPS, UPGRADES } from '../systems/UpgradeSystem.js';
import { audio } from '../engine/Audio.js';

export class Player {
  constructor(canvasWidth, canvasHeight, saveState) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.saveState = saveState;

    this.shipDef = SHIPS[saveState.equippedShip] || SHIPS.alpha_dart;
    this.upgrades = saveState.upgrades;

    // Position
    this.x = canvasWidth / 2;
    this.y = canvasHeight * 0.8;
    this.targetX = this.x;
    this.targetY = this.y;
    this.radius = 18;

    // Computed Stats from Upgrades and Ship Multipliers
    const hullLvl = this.upgrades.hull || 1;
    this.maxHp = Math.round(UPGRADES.hull.getValue(hullLvl) * this.shipDef.stats.damageMult); // Hull scale
    this.hp = this.maxHp;

    const shieldLvl = this.upgrades.shield || 1;
    const shieldData = UPGRADES.shield.getValue(shieldLvl);
    this.maxShield = Math.round(shieldData.max * this.shipDef.stats.shieldMult);
    this.shield = this.maxShield;
    this.shieldRegenRate = shieldData.regenRate;
    this.shieldRegenTimer = 0;

    const dmgLvl = this.upgrades.damage || 1;
    this.baseDamage = UPGRADES.damage.getValue(dmgLvl) * this.shipDef.stats.damageMult;

    const rateLvl = this.upgrades.fireRate || 1;
    this.baseFireInterval = UPGRADES.fireRate.getValue(rateLvl) / this.shipDef.stats.speedMult;
    this.shootTimer = 0;

    const magnetLvl = this.upgrades.magnet || 1;
    this.magnetRadius = UPGRADES.magnet.getValue(magnetLvl);

    const critLvl = this.upgrades.crit || 1;
    this.critData = UPGRADES.crit.getValue(critLvl);

    const empLvl = this.upgrades.emp || 1;
    this.empData = UPGRADES.emp.getValue(empLvl);
    this.empCooldown = 0;
    this.empMaxCooldown = this.empData.cooldown;

    // Wingman Drones (0 to 4)
    this.droneCount = this.upgrades.drones || 0;
    this.droneAngle = 0;
    this.droneShootTimer = 0;

    // In-Run Buffs & State
    this.weaponLevel = 1; // 1 to 5
    this.overdriveTimer = 0;
    this.invulnerableTimer = 1.5; // Spawn protection
    this.thrusterGlow = 0;
    this.isDead = false;

    // Audio / Visual triggers
    this.shieldHitEffect = 0;
  }

  setTarget(x, y) {
    this.targetX = Math.max(this.radius, Math.min(this.canvasWidth - this.radius, x));
    this.targetY = Math.max(this.radius + 30, Math.min(this.canvasHeight - this.radius - 10, y));
  }

  update(dt, input, bullets, particles, floatingTexts, enemies) {
    if (this.isDead) return;

    // Smooth movement interpolation (lerp)
    this.x += (this.targetX - this.x) * Math.min(1, 20 * dt);
    this.y += (this.targetY - this.y) * Math.min(1, 20 * dt);

    // Keyboard movement offset if used
    const kb = input.getKeyboardMovement();
    if (kb.dx !== 0 || kb.dy !== 0) {
      const kbSpeed = 380 * dt;
      this.targetX += kb.dx * kbSpeed;
      this.targetY += kb.dy * kbSpeed;
      this.targetX = Math.max(this.radius, Math.min(this.canvasWidth - this.radius, this.targetX));
      this.targetY = Math.max(this.radius + 30, Math.min(this.canvasHeight - this.radius - 10, this.targetY));
      this.x = this.targetX;
      this.y = this.targetY;
    }

    // Invulnerability & Overdrive timers
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.shieldHitEffect > 0) this.shieldHitEffect -= dt * 3;
    if (this.empCooldown > 0) this.empCooldown -= dt;

    if (this.overdriveTimer > 0) {
      this.overdriveTimer -= dt;
      // Spawn overdrive particle sparkles
      if (Math.random() < 0.4) {
        particles.push(new Particle(
          this.x + (Math.random() - 0.5) * 20,
          this.y + (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40,
          '#ff007f', 4, 0.4, 'spark'
        ));
      }
    }

    // Shield passive regeneration
    this.shieldRegenTimer += dt;
    if (this.shieldRegenTimer > 2.5 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate * dt);
    }

    // Thruster exhaust particles
    this.thrusterGlow = (this.thrusterGlow + dt * 15) % (Math.PI * 2);
    if (Math.random() < 0.7) {
      particles.push(new Particle(
        this.x + (Math.random() - 0.5) * 6,
        this.y + 16,
        (Math.random() - 0.5) * 15,
        70 + Math.random() * 40,
        this.shipDef.color,
        3.5, 0.25, 'spark'
      ));
    }

    // Weapons firing
    const currentFireInterval = this.overdriveTimer > 0 
      ? this.baseFireInterval * 0.5 
      : this.baseFireInterval;

    this.shootTimer += dt;
    if (input.isShooting && this.shootTimer >= currentFireInterval) {
      this.shootTimer = 0;
      this.fireWeapon(bullets, particles);
    }

    // Drone management
    if (this.droneCount > 0) {
      this.droneAngle += dt * 3.0; // Orbit speed
      this.droneShootTimer += dt;
      if (this.droneShootTimer >= 0.35) {
        this.droneShootTimer = 0;
        this.fireDrones(bullets, enemies);
      }
    }

    // EMP Bomb trigger
    if (input.consumeEmp()) {
      this.triggerEmp(bullets, particles, floatingTexts, enemies);
    }
  }

  fireWeapon(bullets, particles) {
    audio.playShoot(true);

    const isCrit = Math.random() < this.critData.chance;
    const dmg = this.baseDamage * (isCrit ? this.critData.mult : 1.0) * (this.overdriveTimer > 0 ? 1.5 : 1.0);
    const bulletColor = this.overdriveTimer > 0 ? '#ff007f' : (isCrit ? '#ffe600' : this.shipDef.color);

    // Multi-stream weapon patterns based on in-run weaponLevel
    const bulletSpeed = -620;

    if (this.weaponLevel === 1) {
      // Single central beam
      bullets.push(new Bullet(this.x, this.y - 15, 0, bulletSpeed, dmg, true, {
        isCrit, color: bulletColor, radius: 5
      }));
    } else if (this.weaponLevel === 2) {
      // Dual parallel cannons
      bullets.push(new Bullet(this.x - 9, this.y - 12, 0, bulletSpeed, dmg, true, {
        isCrit, color: bulletColor, radius: 4.5
      }));
      bullets.push(new Bullet(this.x + 9, this.y - 12, 0, bulletSpeed, dmg, true, {
        isCrit, color: bulletColor, radius: 4.5
      }));
    } else if (this.weaponLevel === 3) {
      // Triple angled fan
      bullets.push(new Bullet(this.x, this.y - 15, 0, bulletSpeed, dmg, true, {
        isCrit, color: bulletColor, radius: 5
      }));
      bullets.push(new Bullet(this.x - 10, this.y - 10, -80, bulletSpeed * 0.98, dmg * 0.9, true, {
        isCrit, color: bulletColor, radius: 4.5
      }));
      bullets.push(new Bullet(this.x + 10, this.y - 10, 80, bulletSpeed * 0.98, dmg * 0.9, true, {
        isCrit, color: bulletColor, radius: 4.5
      }));
    } else if (this.weaponLevel === 4) {
      // 5-Way spread barrage
      const angles = [-0.22, -0.1, 0, 0.1, 0.22];
      angles.forEach((rad) => {
        const vx = Math.sin(rad) * 600;
        const vy = -Math.cos(rad) * 600;
        bullets.push(new Bullet(this.x, this.y - 14, vx, vy, dmg * 0.85, true, {
          isCrit, color: bulletColor, radius: 4.5
        }));
      });
    } else {
      // 7-Way Hyper stream (Max Level)
      const angles = [-0.3, -0.18, -0.08, 0, 0.08, 0.18, 0.3];
      angles.forEach((rad) => {
        const vx = Math.sin(rad) * 640;
        const vy = -Math.cos(rad) * 640;
        bullets.push(new Bullet(this.x, this.y - 14, vx, vy, dmg * 0.8, true, {
          isCrit, color: bulletColor, radius: 5
        }));
      });
    }
  }

  fireDrones(bullets, enemies) {
    if (this.droneCount === 0 || enemies.length === 0) return;

    for (let i = 0; i < this.droneCount; i++) {
      const angle = this.droneAngle + (i * Math.PI * 2) / this.droneCount;
      const dx = this.x + Math.cos(angle) * 36;
      const dy = this.y + Math.sin(angle) * 36;

      bullets.push(new Bullet(dx, dy, 0, -450, this.baseDamage * 0.6, true, {
        color: '#39ff14',
        type: 'missile',
        homing: true,
        radius: 4
      }));
    }
  }

  triggerEmp(bullets, particles, floatingTexts, enemies) {
    if (this.empCooldown > 0) return;

    this.empCooldown = this.empMaxCooldown;
    audio.playBomb();

    // Spawn massive shockwave ring
    particles.push(new Particle(this.x, this.y, 0, 0, '#00f0ff', 10, 0.6, 'ring'));
    particles.push(new Particle(this.x, this.y, 0, 0, '#ff007f', 5, 0.5, 'ring'));

    // Wipe all enemy hazard bullets and convert them into sparks
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.isPlayer) {
        particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, '#ffe600', 4, 0.4, 'spark'));
        bullets.splice(i, 1);
      }
    }

    // Heavy damage to all active enemies on screen
    const empDmg = this.empData.damage;
    for (const enemy of enemies) {
      enemy.takeDamage(empDmg, particles, floatingTexts, true);
    }

    floatingTexts.push(new FloatingText(this.x, this.y - 40, 'EMP DETONATED!', '#00f0ff', true));
  }

  takeDamage(amount, particles, floatingTexts) {
    if (this.invulnerableTimer > 0 || this.isDead) return;

    this.shieldRegenTimer = 0;
    this.shieldHitEffect = 1.0;

    if (this.shield > 0) {
      audio.playShieldHit();
      if (this.shield >= amount) {
        this.shield -= amount;
        floatingTexts.push(new FloatingText(this.x, this.y - 20, `-${Math.round(amount)} SHIELD`, '#00f0ff'));
        return;
      } else {
        const overflow = amount - this.shield;
        this.shield = 0;
        this.hp -= overflow;
        floatingTexts.push(new FloatingText(this.x, this.y - 20, `SHIELD BROKEN!`, '#ff007f', true));
      }
    } else {
      this.hp -= amount;
      floatingTexts.push(new FloatingText(this.x, this.y - 20, `-${Math.round(amount)}`, '#ff3344'));
    }

    // Damage flash & debris
    for (let i = 0; i < 6; i++) {
      particles.push(new Particle(
        this.x, this.y,
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120,
        this.shipDef.color, 3, 0.35, 'spark'
      ));
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      audio.playExplosion(true);
      // Giant explosion
      for (let i = 0; i < 25; i++) {
        particles.push(new Particle(
          this.x, this.y,
          (Math.random() - 0.5) * 240,
          (Math.random() - 0.5) * 240,
          this.shipDef.color, 7, 0.8, 'shard'
        ));
      }
    }
  }

  applyPowerup(type, floatingTexts) {
    audio.playPowerup();

    if (type === 'SPREAD') {
      this.weaponLevel = Math.min(5, this.weaponLevel + 1);
      floatingTexts.push(new FloatingText(this.x, this.y - 30, `WEAPON LVL ${this.weaponLevel}!`, '#00f0ff', true));
    } else if (type === 'SHIELD') {
      this.shield = this.maxShield;
      floatingTexts.push(new FloatingText(this.x, this.y - 30, 'SHIELD RESTORED!', '#00aaff', true));
    } else if (type === 'OVERDRIVE') {
      this.overdriveTimer = 8.0;
      floatingTexts.push(new FloatingText(this.x, this.y - 30, 'HYPER OVERDRIVE!', '#ff007f', true));
    } else if (type === 'BOMB') {
      this.empCooldown = 0;
      floatingTexts.push(new FloatingText(this.x, this.y - 30, 'EMP CHARGED!', '#ffe600', true));
    } else if (type === 'HEALTH') {
      this.hp = Math.min(this.maxHp, this.hp + 40);
      floatingTexts.push(new FloatingText(this.x, this.y - 30, '+40 HULL REPAIR', '#39ff14', true));
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    // Invulnerability blinking
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw Shield Bubble if active or recently hit
    if (this.shield > 0 || this.shieldHitEffect > 0) {
      const shieldAlpha = Math.min(0.7, (this.shield / this.maxShield) * 0.4 + this.shieldHitEffect * 0.5);
      ctx.strokeStyle = `rgba(0, 240, 255, ${shieldAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.stroke();

      if (this.shieldHitEffect > 0) {
        ctx.fillStyle = `rgba(0, 240, 255, ${this.shieldHitEffect * 0.25})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Geometry Dash Style Neon Ship Drawing
    ctx.shadowColor = this.shipDef.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#060919';
    ctx.strokeStyle = this.shipDef.color;
    ctx.lineWidth = 2.2;

    // Wing & Hull Shape
    ctx.beginPath();
    ctx.moveTo(0, -this.radius - 4); // Apex nose
    ctx.lineTo(this.radius + 6, this.radius + 2); // Right wing tip
    ctx.lineTo(this.radius * 0.45, this.radius * 0.5); // Right inner nook
    ctx.lineTo(0, this.radius); // Engine center
    ctx.lineTo(-this.radius * 0.45, this.radius * 0.5); // Left inner nook
    ctx.lineTo(-this.radius - 6, this.radius + 2); // Left wing tip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ship Cockpit Diamond (Geometry Dash cube look)
    ctx.fillStyle = this.shipDef.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 0.35);
    ctx.lineTo(6, 2);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pulsing Engine Thrusters
    const thrusterScale = 1 + Math.sin(this.thrusterGlow) * 0.3;
    ctx.fillStyle = '#ff7700';
    ctx.shadowColor = '#ff3300';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-4, this.radius);
    ctx.lineTo(0, this.radius + 10 * thrusterScale);
    ctx.lineTo(4, this.radius);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Draw Orbital Wingman Drones
    if (this.droneCount > 0) {
      for (let i = 0; i < this.droneCount; i++) {
        const angle = this.droneAngle + (i * Math.PI * 2) / this.droneCount;
        const dx = this.x + Math.cos(angle) * 36;
        const dy = this.y + Math.sin(angle) * 36;

        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = '#060919';
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 8;

        // Mini geometric diamond drone
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1.5, -1.5, 3, 3);
        ctx.restore();
      }
    }
  }
}
