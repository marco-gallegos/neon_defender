// Collectible Neon Shards and Combat Power-Up Capsules

export class ShardItem {
  constructor(x, y, value = 1) {
    this.x = x;
    this.y = y;
    const parsedVal = Number(value);
    this.value = (Number.isFinite(parsedVal) && parsedVal > 0) ? Math.round(parsedVal) : 1;
    this.isShard = true;
    this.isPowerup = false;

    this.vx = (Math.random() - 0.5) * 60;
    this.vy = (Math.random() - 0.5) * 60;
    this.size = this.value >= 25 ? 9 : (this.value >= 5 ? 7 : 5);
    this.color = this.value >= 25 ? '#ff007f' : (this.value >= 5 ? '#ffe600' : '#00f0ff');
    this.life = 15.0; // Despawns after 15 seconds if uncollected
    this.angle = Math.random() * Math.PI;
    this.rotSpeed = 2 + Math.random() * 2;
  }

  update(dt, playerX, playerY, magnetRadius) {
    this.life -= dt;
    this.angle += this.rotSpeed * dt;

    // Attraction to player if within magnet vacuum range
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < magnetRadius) {
      // Powerful magnetic pull accelerating as it gets closer
      const pullForce = 350 + (1 - dist / magnetRadius) * 600;
      this.vx = (dx / dist) * pullForce;
      this.vy = (dy / dist) * pullForce;
    } else {
      // Gentle drift downward with light friction
      this.vx *= 0.98;
      this.vy = Math.min(60, this.vy + 20 * dt);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    return this.life > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;

    // Iconic Geometry Dash rotating diamond shard
    ctx.beginPath();
    ctx.moveTo(0, -this.size * 1.3);
    ctx.lineTo(this.size, 0);
    ctx.lineTo(0, this.size * 1.3);
    ctx.lineTo(-this.size, 0);
    ctx.closePath();
    ctx.fill();

    // Bright inner core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export const POWERUP_TYPES = {
  SPREAD: { name: 'SPREAD CANNON', color: '#00f0ff', icon: '⚡' },
  SHIELD: { name: 'SHIELD RECHARGE', color: '#00aaff', icon: '🛡️' },
  OVERDRIVE: { name: 'HYPER OVERDRIVE', color: '#ff007f', icon: '🔥' },
  BOMB: { name: 'EMP READY', color: '#ffe600', icon: '💥' },
  HEALTH: { name: 'HULL REPAIR', color: '#39ff14', icon: '❤️' }
};

export class PowerupCapsule {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'SPREAD', 'SHIELD', 'OVERDRIVE', 'BOMB', 'HEALTH'
    this.def = POWERUP_TYPES[type] || POWERUP_TYPES.SPREAD;
    this.isShard = false;
    this.isPowerup = true;
    this.vy = 45; // Drifts downward
    this.size = 14;
    this.pulse = 0;
    this.life = 18.0;
  }

  update(dt) {
    this.life -= dt;
    this.pulse += dt * 4;
    this.y += this.vy * dt;
    return this.life > 0;
  }

  draw(ctx) {
    const scale = 1 + Math.sin(this.pulse) * 0.12;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);

    // Glowing outer hexagon capsule
    ctx.fillStyle = 'rgba(10, 15, 35, 0.9)';
    ctx.strokeStyle = this.def.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.def.color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = Math.cos(angle) * this.size;
      const py = Math.sin(angle) * this.size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Icon or badge
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.def.icon, 0, 0);

    ctx.restore();
  }
}
