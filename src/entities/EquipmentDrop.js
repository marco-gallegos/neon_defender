// Collectible Equipment Drops & Nano Crystal pickups
import { TIER_META, CATEGORIES } from '../systems/Equipment.js';

function magnetUpdate(self, dt, playerX, playerY, magnetRadius) {
  const dx = playerX - self.x;
  const dy = playerY - self.y;
  const dist = Math.hypot(dx, dy);

  if (dist < magnetRadius) {
    const pullForce = 420 + (1 - dist / magnetRadius) * 700;
    self.vx = (dx / dist) * pullForce;
    self.vy = (dy / dist) * pullForce;
  } else {
    self.vx *= 0.96;
    self.vy = Math.min(70, self.vy + 22 * dt);
  }

  self.x += self.vx * dt;
  self.y += self.vy * dt;
}

export class CrystalItem {
  constructor(x, y, amount = 1) {
    this.x = x;
    this.y = y;
    this.amount = Math.max(1, Math.round(amount));
    this.isShard = false;
    this.isPowerup = false;
    this.isCrystal = true;
    this.size = 6;
    this.color = '#c77dff';
    this.vx = (Math.random() - 0.5) * 60;
    this.vy = (Math.random() - 0.5) * 60;
    this.life = 16.0;
    this.angle = Math.random() * Math.PI;
    this.rotSpeed = 2.5 + Math.random() * 2;
  }

  update(dt, playerX, playerY, magnetRadius) {
    this.life -= dt;
    this.angle += this.rotSpeed * dt;
    magnetUpdate(this, dt, playerX, playerY, magnetRadius);
    return this.life > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;

    // Glowing crystal cluster (two shards)
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -this.size * 1.6);
    ctx.lineTo(this.size * 0.8, 0);
    ctx.lineTo(0, this.size * 1.6);
    ctx.lineTo(-this.size * 0.8, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class EquipmentItem {
  constructor(x, y, equipment) {
    this.x = x;
    this.y = y;
    this.equipment = equipment;
    this.tier = equipment?.tier || 'C';
    this.category = equipment?.category || 'material';
    this.meta = TIER_META[this.tier] || TIER_META.C;
    this.catMeta = CATEGORIES[this.category] || CATEGORIES.material;

    this.isShard = false;
    this.isPowerup = false;
    this.isEquipment = true;
    this.size = 12;
    this.color = this.meta.color;

    this.vx = (Math.random() - 0.5) * 50;
    this.vy = (Math.random() - 0.5) * 50;
    this.life = 22.0; // Equipment lingers longer
    this.angle = Math.random() * Math.PI;
    this.rotSpeed = 1.5 + Math.random();
    this.pulse = 0;
  }

  update(dt, playerX, playerY, magnetRadius) {
    this.life -= dt;
    this.pulse += dt * 4;
    this.angle += this.rotSpeed * dt;
    magnetUpdate(this, dt, playerX, playerY, magnetRadius);
    return this.life > 0;
  }

  draw(ctx) {
    const scale = 1 + Math.sin(this.pulse) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);

    // Rotating outer hexagon in the tier colour
    ctx.save();
    ctx.rotate(this.angle);
    ctx.strokeStyle = this.meta.color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = this.meta.color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const px = Math.cos(a) * this.size;
      const py = Math.sin(a) * this.size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Dark core + category icon
    ctx.fillStyle = 'rgba(6, 10, 26, 0.92)';
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.72, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.catMeta.icon, 0, 0.5);

    // Tier letter badge
    ctx.font = '700 8px Orbitron, sans-serif';
    ctx.fillStyle = this.meta.color;
    ctx.fillText(this.tier, 0, -this.size - 4);

    ctx.restore();
  }
}
