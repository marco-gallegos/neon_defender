// Player Ship Entity with Wingman Drones, Shields, and Modular Weapons
import { Bullet } from './Bullet.js';
import { Particle, FloatingText } from './Particle.js';
import { SHIPS, UPGRADES, SECONDARY_WEAPONS } from '../systems/UpgradeSystem.js';
import { audio } from '../engine/Audio.js';
import { Renderer } from '../engine/Renderer.js';

export class Player {
  constructor(canvasWidth, canvasHeight, saveState) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.saveState = saveState;

    this.shipDef = SHIPS[saveState.equippedShip] || SHIPS.alpha_dart;
    this.upgrades = saveState.upgrades;

    // Secondary Weapon Setup
    this.secondaryId = saveState.equippedSecondary || 'seeker';
    this.unlockedSecondaries = saveState.unlockedSecondaries || ['seeker', 'railgun', 'cluster'];
    this.secondaryUpgrades = saveState.secondaryUpgrades || { seeker: 1, railgun: 1, cluster: 1, vortex: 1 };
    this.refreshSecondaryStats();
    this.secondaryCooldown = 0;

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

    // Primary Weapon automatic continuous firing
    const currentFireInterval = this.overdriveTimer > 0 
      ? this.baseFireInterval * 0.5 
      : this.baseFireInterval;

    this.shootTimer += dt;
    if (this.shootTimer >= currentFireInterval) {
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

    // Secondary Weapon timer & automatic firing on cooldown
    if (this.secondaryCooldown > 0) {
      this.secondaryCooldown -= dt;
    }

    if (input.consumeCycleSecondary && input.consumeCycleSecondary()) {
      this.cycleSecondaryWeapon();
    }

    // Auto-fire secondary missiles/weapons whenever cooldown is ready and enemies are present, or manual trigger
    const manualTrigger = input.consumeSecondary && input.consumeSecondary();
    if (this.secondaryCooldown <= 0 && (manualTrigger || (enemies && enemies.length > 0))) {
      this.triggerSecondary(bullets, particles, floatingTexts, enemies);
    }

    // EMP Bomb trigger
    if (input.consumeEmp()) {
      this.triggerEmp(bullets, particles, floatingTexts, enemies);
    }
  }

  refreshSecondaryStats() {
    this.secondaryDef = SECONDARY_WEAPONS[this.secondaryId] || SECONDARY_WEAPONS.seeker;
    const lvl = this.secondaryUpgrades[this.secondaryId] || 1;
    this.secondaryStats = this.secondaryDef.getStats(lvl);
    this.secondaryMaxCooldown = this.secondaryStats.cooldown;
  }

  cycleSecondaryWeapon() {
    if (!this.unlockedSecondaries || this.unlockedSecondaries.length <= 1) return;
    const currentIdx = this.unlockedSecondaries.indexOf(this.secondaryId);
    const nextIdx = (currentIdx + 1) % this.unlockedSecondaries.length;
    this.secondaryId = this.unlockedSecondaries[nextIdx];
    this.saveState.equippedSecondary = this.secondaryId;
    this.refreshSecondaryStats();
    this.secondaryCooldown = Math.min(this.secondaryCooldown, this.secondaryMaxCooldown);
  }

  triggerSecondary(bullets, particles, floatingTexts, enemies) {
    if (this.secondaryCooldown > 0 || this.isDead) return false;
    this.secondaryCooldown = this.secondaryMaxCooldown;

    const stats = this.secondaryStats;
    const secDef = this.secondaryDef;

    if (this.secondaryId === 'seeker') {
      // 1. CHASING SWARM MISSILES
      audio.playMissileLaunch();
      const count = stats.count || 4;
      for (let i = 0; i < count; i++) {
        const offsetAngle = ((i - (count - 1) / 2) / (count - 1 || 1)) * 0.95;
        const vx = Math.sin(offsetAngle) * 440;
        const vy = -Math.cos(offsetAngle) * 440;
        const startX = this.x + (i % 2 === 0 ? -18 : 18);
        const startY = this.y - 6;

        bullets.push(new Bullet(startX, startY, vx, vy, stats.damage, true, {
          type: 'missile',
          homing: true,
          color: secDef.color,
          radius: 5.5,
          life: 3.5,
          pierce: 1,
          splashRadius: 36,
          splashDamage: stats.damage * 0.55
        }));
      }

      for (let p = 0; p < 8; p++) {
        particles.push(new Particle(
          this.x + (Math.random() - 0.5) * 30,
          this.y,
          (Math.random() - 0.5) * 60,
          40 + Math.random() * 40,
          secDef.color,
          3,
          0.3,
          'spark'
        ));
      }
      return true;
    }

    if (this.secondaryId === 'railgun') {
      // 2. PHOTON RAILGUN PIERCING BEAM
      audio.playRailgunFire();
      const beamW = stats.beamWidth || 12;
      bullets.push(new Bullet(this.x, this.y - 25, 0, -1800, stats.damage, true, {
        type: 'railgun',
        color: secDef.color,
        radius: beamW / 2,
        life: 0.8,
        pierce: 99
      }));

      particles.push(new Particle(this.x, this.y - 20, 0, 0, '#ffffff', 14, 0.25, 'ring'));
      for (let p = 0; p < 12; p++) {
        particles.push(new Particle(
          this.x,
          this.y - 15,
          (Math.random() - 0.5) * 120,
          -100 - Math.random() * 200,
          secDef.color,
          4,
          0.35,
          'spark'
        ));
      }
      return true;
    }

    if (this.secondaryId === 'cluster') {
      // 3. CLUSTER FLAK SHATTER CANNON
      audio.playClusterFire();
      [-0.15, 0, 0.15].forEach(ang => {
        const vx = Math.sin(ang) * 480;
        const vy = -Math.cos(ang) * 480;
        bullets.push(new Bullet(this.x, this.y - 12, vx, vy, stats.shellDamage, true, {
          type: 'cluster',
          color: secDef.color,
          radius: 7,
          life: 0.7 + Math.random() * 0.15,
          pierce: 1,
          shrapnelCount: Math.round(stats.shrapnelCount / 3),
          shrapnelDamage: stats.shrapnelDamage
        }));
      });
      return true;
    }

    if (this.secondaryId === 'vortex') {
      // 4. VOID VORTEX GRAVITATIONAL RIFT
      audio.playVortexFire();
      bullets.push(new Bullet(this.x, this.y - 20, 0, -140, stats.damage, true, {
        type: 'vortex',
        color: secDef.color,
        radius: stats.radius,
        life: 2.2,
        pierce: 99
      }));
      return true;
    }
    return false;
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

    // Use custom vector drawing based on equipped ship model
    const thrusterScale = 1 + Math.sin(this.thrusterGlow) * 0.3;
    Renderer.drawShip(ctx, this.shipDef, this.radius, thrusterScale);

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

  // Ship passive kill perks (Dracula Vampiric lifesteal, Bati shield pulse, Reaper soul harvest)
  onEnemyKilled(enemy, floatingTexts) {
    if (this.isDead || !enemy) return;

    if (this.shipDef.id === 'dracula_plane') {
      // Vampiric Blood Siphon perk
      const healAmount = 8;
      if (this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + healAmount);
        if (floatingTexts && Math.random() < 0.6) {
          floatingTexts.push(new FloatingText(this.x, this.y - 20, `+${healAmount} BLOOD SIPHON`, '#ff0055', true));
        }
      } else if (this.shield < this.maxShield) {
        this.shield = Math.min(this.maxShield, this.shield + 6);
      }
    } else if (this.shipDef.id === 'bati_plane') {
      // Bati Tactical Shield Overcharge
      if (this.shield < this.maxShield) {
        this.shield = Math.min(this.maxShield, this.shield + 5);
        if (floatingTexts && Math.random() < 0.4) {
          floatingTexts.push(new FloatingText(this.x, this.y - 20, '+5 BAT-SHIELD', '#ffd60a', true));
        }
      }
    } else if (this.shipDef.id === 'halloween_reaper') {
      // Soul Harvest: minor HP and EMP recharge
      if (this.hp < this.maxHp && Math.random() < 0.5) {
        this.hp = Math.min(this.maxHp, this.hp + 5);
        if (floatingTexts && Math.random() < 0.4) {
          floatingTexts.push(new FloatingText(this.x, this.y - 20, '+5 SOUL SIPHON', '#00ff88', true));
        }
      }
      this.empCooldown = Math.max(0, this.empCooldown - 0.25);
    }
  }
}
