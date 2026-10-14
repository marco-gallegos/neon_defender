// Neon Vector Visuals, Cyber Background Grid, and Screen Shake System

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.width = canvas.width;
    this.height = canvas.height;

    // Screen Shake
    this.shakeIntensity = 0;
    this.shakeTimer = 0;

    // Background Cyber Grid & Stars
    this.gridOffsetY = 0;
    this.gridPulse = 0;
    this.stars = [];
    this.initStars();
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 45; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: 40 + Math.random() * 80,
        size: 1 + Math.random() * 2,
        color: ['#00f0ff', '#ff007f', '#ffffff', '#ffe600'][Math.floor(Math.random() * 4)],
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.initStars();
  }

  addShake(intensity, duration = 0.25) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  update(dt) {
    // Screen shake decay
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) {
        this.shakeIntensity = 0;
      }
    }

    // Grid scrolling
    this.gridOffsetY = (this.gridOffsetY + dt * 50) % 40;
    this.gridPulse += dt * 3.0;

    // Parallax stars
    for (const star of this.stars) {
      star.y += star.speed * dt;
      star.twinkle += dt * 4;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }
  }

  clear() {
    this.ctx.save();

    // Apply screen shake
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const sy = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.ctx.translate(sx, sy);
    }

    // Deep space gradient
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#060715');
    grad.addColorStop(0.5, '#0a0d24');
    grad.addColorStop(1, '#050612');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(-20, -20, this.width + 40, this.height + 40);

    // Draw Parallax Stars
    for (const star of this.stars) {
      const alpha = 0.4 + Math.sin(star.twinkle) * 0.35;
      this.ctx.fillStyle = star.color;
      this.ctx.globalAlpha = Math.max(0.1, alpha);
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    // Draw Neon Cyber Grid (Geometry Dash floor/speed feel)
    const gridSize = 40;
    const pulseAlpha = 0.08 + Math.sin(this.gridPulse) * 0.03;
    this.ctx.strokeStyle = `rgba(0, 240, 255, ${pulseAlpha})`;
    this.ctx.lineWidth = 1;

    // Vertical grid lines
    for (let x = 0; x <= this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    // Horizontal grid lines scrolling down
    for (let y = this.gridOffsetY; y <= this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  restore() {
    this.ctx.restore();
  }

  // Draw ship icon on a small preview canvas (for menu / hangar)
  static drawShipPreview(canvas, shipDef) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2 + 5);

    ctx.shadowColor = shipDef.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#060919';
    ctx.strokeStyle = shipDef.color;
    ctx.lineWidth = 2.5;

    const r = 26;
    // Wing & Hull Shape
    ctx.beginPath();
    ctx.moveTo(0, -r - 6);
    ctx.lineTo(r + 8, r + 2);
    ctx.lineTo(r * 0.45, r * 0.5);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.45, r * 0.5);
    ctx.lineTo(-r - 8, r + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center Cockpit
    ctx.fillStyle = shipDef.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.35);
    ctx.lineTo(8, 2);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Thruster
    ctx.fillStyle = '#ff7700';
    ctx.beginPath();
    ctx.moveTo(-6, r);
    ctx.lineTo(0, r + 12);
    ctx.lineTo(6, r);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
