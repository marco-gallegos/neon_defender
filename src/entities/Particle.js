// High performance neon particle engine & floating arcade texts

export class Particle {
  constructor(x, y, vx, vy, color, size, life, type = 'shard') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.life = life;
    this.maxLife = life;
    this.type = type; // 'shard', 'spark', 'ring', 'glow'
    this.angle = Math.random() * Math.PI * 2;
    this.vAngle = (Math.random() - 0.5) * 8;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.vAngle * dt;

    if (this.type === 'spark') {
      this.vx *= 0.96;
      this.vy *= 0.96;
      this.size = this.initialSize * (this.life / this.maxLife);
    } else if (this.type === 'ring') {
      this.size += 220 * dt; // expanding shockwave ring
    } else if (this.type === 'shard') {
      this.vx *= 0.94;
      this.vy *= 0.94;
      this.size = this.initialSize * Math.max(0, this.life / this.maxLife);
    }

    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.type === 'ring') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3 * alpha;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'spark') {
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(1, this.size), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Geometric sharp shard (Geometry Dash debris style)
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(-this.size, -this.size);
      ctx.lineTo(this.size, 0);
      ctx.lineTo(-this.size * 0.5, this.size);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

export class FloatingText {
  constructor(x, y, text, color = '#ffffff', isCrit = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.isCrit = isCrit;
    this.life = isCrit ? 0.9 : 0.65;
    this.maxLife = this.life;
    this.vy = isCrit ? -45 : -35;
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = this.isCrit ? 'bold 18px Orbitron, sans-serif' : 'bold 12px Rajdhani, sans-serif';
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.isCrit ? 10 : 4;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}
