// Player Ship Entity with Wingman Drones, Shields, and Modular Weapons
import { Bullet } from './Bullet.js';
import { Particle, FloatingText } from './Particle.js';
import { SHIPS, UPGRADES, PRIMARY_WEAPONS, SECONDARY_WEAPONS } from '../systems/UpgradeSystem.js';
import { computeBonuses } from '../systems/Equipment.js';
import { audio } from '../engine/Audio.js';
import { Renderer } from '../engine/Renderer.js';

export class Player {
  constructor(canvasWidth, canvasHeight, saveState) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.saveState = saveState;

    this.shipDef = SHIPS[saveState.equippedShip] || SHIPS.alpha_dart;
    this.upgrades = saveState.upgrades;
    this.equipBonuses = computeBonuses(saveState.equippedEquipment, saveState.inventory);

    // Primary Weapon Setup (Switchable Main Gun)
    this.primaryId = saveState.equippedPrimary || 'plasma';
    this.unlockedPrimaries = saveState.unlockedPrimaries || ['plasma', 'laser', 'spread', 'wave'];
    this.refreshPrimaryStats();

    // Secondary Weapon Setup
    this.secondaryId = saveState.equippedSecondary || 'seeker';
    this.unlockedSecondaries = saveState.unlockedSecondaries || ['seeker'];
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

    // Ship-Specific Passive Perk
    this.damageReduction = 0;
    this.pierceBonus = 0;
    switch (this.shipDef.passiveId) {
      case 'nimble': // ALPHA DART: smaller hitbox + stronger pickup magnet
        this.radius = 15;
        this.magnetRadius *= 1.15;
        break;
      case 'bulwark': // CYBER CUBE: heavy plating reduces all incoming damage
        this.damageReduction = 0.12;
        break;
      case 'emberfire': // NEON PHOENIX: extra critical strike chance
        this.critData = { ...this.critData, chance: Math.min(0.6, this.critData.chance + 0.08) };
        break;
      case 'voidrounds': // VOID SLICER: primary shots pierce an extra target
        this.pierceBonus = 1;
        break;
      default:
        break;
    }

    // --- Equipment bonuses (applied after base + ship stats) ---
    const eq = this.equipBonuses;
    this.luckMult = 1 + (eq.luck || 0);
    this.moveSpeedMult = 1 + (eq.speed || 0);
    this.scoreMult = 1 + (eq.scoreBonus || 0);
    this.damageReduction = Math.min(0.7, (this.damageReduction || 0) + (eq.resistance || 0));
    this.baseDamage *= (1 + (eq.damage || 0)) * (1 + (eq.droneBuff || 0));
    this.maxShield = Math.round(this.maxShield * (1 + (eq.shieldBonus || 0)));
    this.shield = this.maxShield;
    this.retaliateDamage = eq.retaliate || 0;
    this.retaliatePending = false;
    this.extraBullets = eq.extraBullets || 0;
    this.flameLevel = eq.flameLevel || 0;
    this.skin = eq.skin || null;

    // Wingman Drones (upgrade drones + equipment strike drones)
    this.droneCount = Math.min(6, (this.upgrades.drones || 0) + (eq.droneAttack || 0));
    this.guardDroneCount = Math.min(4, eq.droneGuard || 0);
    this.shieldRegenRate += this.guardDroneCount * 1.5;
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

    const moveMult = this.moveSpeedMult || 1;

    // Smooth movement interpolation (lerp)
    this.x += (this.targetX - this.x) * Math.min(1, 20 * moveMult * dt);
    this.y += (this.targetY - this.y) * Math.min(1, 20 * moveMult * dt);

    // Keyboard movement offset if used
    const kb = input.getKeyboardMovement();
    if (kb.dx !== 0 || kb.dy !== 0) {
      const kbSpeed = 380 * moveMult * dt;
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

    // Shield retaliation pulse (equipment): damage nearby foes when hit
    if (this.retaliatePending) {
      this.retaliatePending = false;
      if (this.retaliateDamage > 0 && Array.isArray(enemies)) {
        const pulseRadius = 125;
        let hitAny = false;
        for (const e of enemies) {
          if (!e || e.dead) continue;
          const d = Math.hypot(e.x - this.x, e.y - this.y);
          if (d <= pulseRadius + (e.radius || 0) && typeof e.takeDamage === 'function') {
            e.takeDamage(this.retaliateDamage, particles, floatingTexts);
            hitAny = true;
          }
        }
        particles.push(new Particle(this.x, this.y, 0, 0, '#00f0ff', 20, 0.5, 'ring'));
        if (hitAny) {
          floatingTexts.push(new FloatingText(this.x, this.y - 34, 'RETALIATE!', '#00f0ff', true));
        }
      }
    }

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
        this.skin?.trail || this.shipDef.color,
        3.5, 0.25, 'spark'
      ));
    }

    // Primary Weapon automatic continuous firing
    const baseInterval = this.baseFireInterval * (this.primaryDef?.fireIntervalMult || 1.0);
    const currentFireInterval = this.overdriveTimer > 0 
      ? baseInterval * 0.5 
      : baseInterval;

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

    // Main Gun switch trigger (X / 1 / Mobile button)
    if (input.consumeCyclePrimary && input.consumeCyclePrimary()) {
      this.cyclePrimaryWeapon(floatingTexts);
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

  refreshPrimaryStats() {
    this.primaryDef = PRIMARY_WEAPONS[this.primaryId] || PRIMARY_WEAPONS.plasma;
  }

  cyclePrimaryWeapon(floatingTexts) {
    if (!this.unlockedPrimaries || this.unlockedPrimaries.length <= 1) return;
    const currentIdx = this.unlockedPrimaries.indexOf(this.primaryId);
    const nextIdx = (currentIdx + 1) % this.unlockedPrimaries.length;
    this.primaryId = this.unlockedPrimaries[nextIdx];
    this.saveState.equippedPrimary = this.primaryId;
    this.refreshPrimaryStats();
    audio.playPowerup();
    if (floatingTexts) {
      floatingTexts.push(new FloatingText(this.x, this.y - 25, `GUN: ${this.primaryDef.name}`, this.primaryDef.color, true));
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

    const startIdx = bullets.length;
    const shipShape = this.shipDef.bulletShape || null;
    const isCrit = Math.random() < this.critData.chance;
    const baseMult = (this.primaryDef.damageMult || 1.0) * (isCrit ? this.critData.mult : 1.0) * (this.overdriveTimer > 0 ? 1.5 : 1.0);
    const dmg = this.baseDamage * baseMult;
    const bulletColor = this.overdriveTimer > 0 ? '#ff007f' : (isCrit ? '#ffe600' : this.primaryDef.color);
    const gunType = this.primaryDef.type || 'plasma';

    if (gunType === 'laser') {
      // PHOTON LANCE: Continuous Piercing Beams cutting down enemy columns
      const pierce = (this.primaryDef.pierce || 3) + Math.floor(this.weaponLevel / 2) + this.pierceBonus;
      const bSpeed = -720;
      const opts = { isCrit, color: bulletColor, radius: 5, type: 'laser', pierce };

      if (this.weaponLevel === 1) {
        bullets.push(new Bullet(this.x, this.y - 16, 0, bSpeed, dmg * 1.1, true, opts));
      } else if (this.weaponLevel === 2) {
        bullets.push(new Bullet(this.x - 8, this.y - 14, 0, bSpeed, dmg, true, opts));
        bullets.push(new Bullet(this.x + 8, this.y - 14, 0, bSpeed, dmg, true, opts));
      } else if (this.weaponLevel === 3) {
        bullets.push(new Bullet(this.x, this.y - 16, 0, bSpeed, dmg * 1.1, true, opts));
        bullets.push(new Bullet(this.x - 12, this.y - 12, -30, bSpeed, dmg * 0.95, true, opts));
        bullets.push(new Bullet(this.x + 12, this.y - 12, 30, bSpeed, dmg * 0.95, true, opts));
      } else if (this.weaponLevel === 4) {
        bullets.push(new Bullet(this.x - 14, this.y - 12, 0, bSpeed, dmg * 0.95, true, opts));
        bullets.push(new Bullet(this.x - 5, this.y - 15, 0, bSpeed, dmg, true, opts));
        bullets.push(new Bullet(this.x + 5, this.y - 15, 0, bSpeed, dmg, true, opts));
        bullets.push(new Bullet(this.x + 14, this.y - 12, 0, bSpeed, dmg * 0.95, true, opts));
      } else {
        // Lv 5: 5 Heavy Piercing Beams Cutting Down Lanes
        bullets.push(new Bullet(this.x, this.y - 18, 0, bSpeed, dmg * 1.2, true, opts));
        bullets.push(new Bullet(this.x - 9, this.y - 14, 0, bSpeed, dmg, true, opts));
        bullets.push(new Bullet(this.x + 9, this.y - 14, 0, bSpeed, dmg, true, opts));
        bullets.push(new Bullet(this.x - 18, this.y - 10, -40, bSpeed, dmg * 0.9, true, opts));
        bullets.push(new Bullet(this.x + 18, this.y - 10, 40, bSpeed, dmg * 0.9, true, opts));
      }

    } else if (gunType === 'spread') {
      // SPREAD VULCAN: Wide Screen-Clearing Shotgun Fan
      const opts = { isCrit, color: bulletColor, radius: 4.5, type: 'spread' };
      const speed = 600;

      let angles = [];
      if (this.weaponLevel === 1) angles = [-0.18, 0, 0.18];
      else if (this.weaponLevel === 2) angles = [-0.28, -0.14, 0, 0.14, 0.28];
      else if (this.weaponLevel === 3) angles = [-0.38, -0.25, -0.12, 0, 0.12, 0.25, 0.38];
      else if (this.weaponLevel === 4) angles = [-0.48, -0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36, 0.48];
      else angles = [-0.58, -0.46, -0.35, -0.23, -0.11, 0, 0.11, 0.23, 0.35, 0.46, 0.58];

      const spreadDmg = dmg * (0.85 / Math.sqrt(angles.length * 0.3));
      angles.forEach(rad => {
        const vx = Math.sin(rad) * speed;
        const vy = -Math.cos(rad) * speed;
        bullets.push(new Bullet(this.x, this.y - 14, vx, vy, spreadDmg, true, opts));
      });

    } else if (gunType === 'wave') {
      // WAVE PULSAR: Sine-Wave Oscillating Energy Ripples
      const bSpeed = -580;
      const optsL = { isCrit, color: bulletColor, radius: 5, type: 'wave', wavePhase: 0, waveAmp: 160 };
      const optsR = { isCrit, color: bulletColor, radius: 5, type: 'wave', wavePhase: Math.PI, waveAmp: 160 };

      // Left and right oscillating pair
      bullets.push(new Bullet(this.x - 6, this.y - 14, 0, bSpeed, dmg, true, optsL));
      bullets.push(new Bullet(this.x + 6, this.y - 14, 0, bSpeed, dmg, true, optsR));

      if (this.weaponLevel >= 2) {
        // Center piercing core
        bullets.push(new Bullet(this.x, this.y - 16, 0, bSpeed * 1.05, dmg * 0.9, true, {
          isCrit, color: '#ffffff', radius: 4.5, type: 'plasma', pierce: 1 + this.pierceBonus
        }));
      }
      if (this.weaponLevel >= 3) {
        // Wide outer wave ripples
        const optsWL = { isCrit, color: bulletColor, radius: 4.5, type: 'wave', wavePhase: Math.PI * 0.5, waveAmp: 220 };
        const optsWR = { isCrit, color: bulletColor, radius: 4.5, type: 'wave', wavePhase: Math.PI * 1.5, waveAmp: 220 };
        bullets.push(new Bullet(this.x - 14, this.y - 10, 0, bSpeed * 0.96, dmg * 0.85, true, optsWL));
        bullets.push(new Bullet(this.x + 14, this.y - 10, 0, bSpeed * 0.96, dmg * 0.85, true, optsWR));
      }
      if (this.weaponLevel >= 5) {
        // Additional forward wave pulses
        bullets.push(new Bullet(this.x - 8, this.y - 18, 0, bSpeed * 1.1, dmg * 0.8, true, optsL));
        bullets.push(new Bullet(this.x + 8, this.y - 18, 0, bSpeed * 1.1, dmg * 0.8, true, optsR));
      }

    } else {
      // PULSE CANNON (Classic High Cadence Plasma)
      const bulletSpeed = -620;
      const opts = { isCrit, color: bulletColor, radius: 5, type: 'plasma', pierce: 1 + this.pierceBonus };

      if (this.weaponLevel === 1) {
        bullets.push(new Bullet(this.x, this.y - 15, 0, bulletSpeed, dmg, true, opts));
      } else if (this.weaponLevel === 2) {
        bullets.push(new Bullet(this.x - 9, this.y - 12, 0, bulletSpeed, dmg, true, { ...opts, radius: 4.5 }));
        bullets.push(new Bullet(this.x + 9, this.y - 12, 0, bulletSpeed, dmg, true, { ...opts, radius: 4.5 }));
      } else if (this.weaponLevel === 3) {
        bullets.push(new Bullet(this.x, this.y - 15, 0, bulletSpeed, dmg, true, opts));
        bullets.push(new Bullet(this.x - 10, this.y - 10, -70, bulletSpeed * 0.98, dmg * 0.9, true, { ...opts, radius: 4.5 }));
        bullets.push(new Bullet(this.x + 10, this.y - 10, 70, bulletSpeed * 0.98, dmg * 0.9, true, { ...opts, radius: 4.5 }));
      } else if (this.weaponLevel === 4) {
        const angles = [-0.22, -0.1, 0, 0.1, 0.22];
        angles.forEach((rad) => {
          const vx = Math.sin(rad) * 600;
          const vy = -Math.cos(rad) * 600;
          bullets.push(new Bullet(this.x, this.y - 14, vx, vy, dmg * 0.85, true, { ...opts, radius: 4.5 }));
        });
      } else {
        const angles = [-0.3, -0.18, -0.08, 0, 0.08, 0.18, 0.3];
        angles.forEach((rad) => {
          const vx = Math.sin(rad) * 640;
          const vy = -Math.cos(rad) * 640;
          bullets.push(new Bullet(this.x, this.y - 14, vx, vy, dmg * 0.8, true, opts));
        });
      }
    }

    // --- Equipment: Swarm Injector (extra mini-projectiles) ---
    if (this.extraBullets > 0) {
      const n = Math.min(2, this.extraBullets);
      for (let i = 0; i < n; i++) {
        const offset = (i - (n - 1) / 2) * 0.22;
        const vx = Math.sin(offset) * 620 + (i === 0 ? -40 : 40);
        const vy = -Math.cos(offset) * 620;
        bullets.push(new Bullet(this.x + offset * 18, this.y - 8, vx, vy, dmg * 0.55, true, {
          isCrit,
          color: '#ffd166',
          radius: 3.6,
          type: 'plasma',
          pierce: 1
        }));
      }
    }

    // --- Equipment: Incinerator Nozzle (short-range flamethrower) ---
    if (this.flameLevel > 0) {
      const flames = Math.min(3, this.flameLevel);
      for (let i = 0; i < flames; i++) {
        const offset = (i - (flames - 1) / 2) * 0.24;
        bullets.push(new Bullet(this.x, this.y - 16, Math.sin(offset) * 260, -Math.cos(offset) * 380, dmg * 0.28, true, {
          isCrit: false,
          color: '#ff7700',
          radius: 7 + this.flameLevel * 2,
          type: 'flame',
          life: 0.34 + this.flameLevel * 0.05,
          pierce: 6
        }));
      }
    }

    // Stamp ship-specific silhouettes onto every primary projectile
    if (shipShape) {
      for (let i = startIdx; i < bullets.length; i++) {
        bullets[i].shape = shipShape;
      }
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

    // Ship passive damage mitigation (e.g. CYBER CUBE bulwark plating)
    if (this.damageReduction > 0) {
      amount *= (1 - this.damageReduction);
    }

    // Shield retaliation equipment triggers on hit
    if (this.retaliateDamage > 0) {
      this.retaliatePending = true;
    }

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

    // Draw Guard Drones (equipment) — counter-rotating shield orbs
    if (this.guardDroneCount > 0) {
      for (let i = 0; i < this.guardDroneCount; i++) {
        const angle = -this.droneAngle * 0.8 + (i * Math.PI * 2) / this.guardDroneCount;
        const dx = this.x + Math.cos(angle) * 48;
        const dy = this.y + Math.sin(angle) * 48;

        ctx.save();
        ctx.translate(dx, dy);
        ctx.fillStyle = '#060919';
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Equipment skin overlay gadget (orbiting themed emblem)
    if (this.skin && this.skin.icon) {
      const angle = this.droneAngle * 1.4;
      const dx = this.x + Math.cos(angle) * 26;
      const dy = this.y + Math.sin(angle) * 26;
      ctx.save();
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = this.skin.accent || '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillText(this.skin.icon, dx, dy);
      ctx.restore();
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
