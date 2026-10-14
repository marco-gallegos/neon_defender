// Laser, Plasma, and Hazard Projectiles

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
    this.type = options.type || 'plasma'; // 'plasma', 'laser', 'missile', 'hazard'
    this.homing = options.homing || false;
    this.life = options.life || 3.0;
    this.pierce = options.pierce || 1;
    this.hits = 0;
    this.dead = false;
  }

  update(dt, targets = []) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return false;
    }

    // Homing missile logic (drones or player missiles)
    if (this.homing && targets.length > 0) {
      let nearest = null;
      let minDist = 400;
      for (const target of targets) {
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
        const speed = Math.hypot(this.vx, this.vy);
        const newAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), 5.5 * dt);
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    return !this.dead;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.isCrit ? 12 : 6;
    ctx.fillStyle = this.color;

    if (this.isPlayer) {
      if (this.type === 'missile') {
        // Neon micro-missile (pointed diamond)
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
      } else {
        // Elongated high-velocity neon laser capsule
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
      // Enemy Hazard: Geometric pulsating diamond or buzz-orb
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
