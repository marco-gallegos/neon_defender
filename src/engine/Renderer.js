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

  // Unified vector drawing for all player ships
  static drawShip(ctx, shipDef, r = 24, thrusterScale = 1) {
    if (!shipDef) return;
    const id = shipDef.id || 'alpha_dart';
    const mainColor = shipDef.color || '#00f0ff';
    const secColor = shipDef.secondaryColor || '#ffffff';

    ctx.save();
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#060919';
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.2;

    if (id === 'dracula_plane') {
      // DRACULA'S WING: Vampiric bat-wing silhouette with twin forward piercing fangs
      ctx.beginPath();
      // Forward Piercing Fangs & Center Nose
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(4, -r * 0.9);
      ctx.lineTo(6, -r * 1.35); // Right fang tip
      ctx.lineTo(8, -r * 0.8);
      ctx.lineTo(12, -r * 0.4);
      // Sweeping Bat Wing Right
      ctx.quadraticCurveTo(r * 1.3, -r * 0.2, r * 1.6, r * 0.3); // Wing shoulder & primary wingtip
      // Scalloped bat-wing arches underneath
      ctx.quadraticCurveTo(r * 1.15, r * 0.2, r * 0.95, r * 0.65); // Arch 1
      ctx.quadraticCurveTo(r * 0.7, r * 0.45, r * 0.5, r * 0.75); // Arch 2
      ctx.quadraticCurveTo(r * 0.3, r * 0.55, 6, r * 0.95);       // Arch 3
      // Engine base
      ctx.lineTo(0, r * 0.7);
      // Mirrored Left side
      ctx.lineTo(-6, r * 0.95);
      ctx.quadraticCurveTo(-r * 0.3, r * 0.55, -r * 0.5, r * 0.75);
      ctx.quadraticCurveTo(-r * 0.7, r * 0.45, -r * 0.95, r * 0.65);
      ctx.quadraticCurveTo(-r * 1.15, r * 0.2, -r * 1.6, r * 0.3);
      ctx.quadraticCurveTo(-r * 1.3, -r * 0.2, -12, -r * 0.4);
      ctx.lineTo(-8, -r * 0.8);
      ctx.lineTo(-6, -r * 1.35); // Left fang tip
      ctx.lineTo(-4, -r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner Crimson Wing Ribs
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.2);
      ctx.lineTo(r * 1.2, r * 0.1);
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.8, r * 0.5);
      ctx.moveTo(0, -r * 0.2);
      ctx.lineTo(-r * 1.2, r * 0.1);
      ctx.moveTo(0, 0);
      ctx.lineTo(-r * 0.8, r * 0.5);
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Crimson Vampire Visor / Fanged Eyes
      ctx.fillStyle = '#ff0033';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-5, -r * 0.4);
      ctx.lineTo(0, -r * 0.1);
      ctx.lineTo(5, -r * 0.4);
      ctx.lineTo(0, -r * 0.6);
      ctx.closePath();
      ctx.fill();

      // Blood Flame Thrusters (Dual)
      ctx.fillStyle = '#ff1144';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(-7, r * 0.9);
      ctx.lineTo(-4, r * 0.9 + 11 * thrusterScale);
      ctx.lineTo(-1, r * 0.9);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(1, r * 0.9);
      ctx.lineTo(4, r * 0.9 + 11 * thrusterScale);
      ctx.lineTo(7, r * 0.9);
      ctx.closePath();
      ctx.fill();

    } else if (id === 'bati_plane') {
      // BATI PLANE: Iconic stealth bat silhouette with forward cowl ears and curved scalloped bat wings
      ctx.beginPath();
      // Central Cowl Ears
      ctx.moveTo(0, -r * 0.65);
      ctx.lineTo(4, -r * 0.9);
      ctx.lineTo(6, -r * 1.3); // Right ear
      ctx.lineTo(8, -r * 0.7);
      // Broad curved bat wing shoulder
      ctx.quadraticCurveTo(r * 1.1, -r * 0.7, r * 1.55, -r * 0.1);
      ctx.lineTo(r * 1.6, r * 0.35); // Outer wing point
      // Trailing bat scalloped cutouts
      ctx.quadraticCurveTo(r * 1.2, r * 0.25, r * 1.0, r * 0.65);
      ctx.quadraticCurveTo(r * 0.7, r * 0.45, r * 0.45, r * 0.75);
      ctx.quadraticCurveTo(r * 0.25, r * 0.55, 6, r * 0.85);
      // Center rear turbine
      ctx.lineTo(0, r * 0.95);
      // Left side mirrored
      ctx.lineTo(-6, r * 0.85);
      ctx.quadraticCurveTo(-r * 0.25, r * 0.55, -r * 0.45, r * 0.75);
      ctx.quadraticCurveTo(-r * 0.7, r * 0.45, -r * 1.0, r * 0.65);
      ctx.quadraticCurveTo(-r * 1.2, r * 0.25, -r * 1.6, r * 0.35);
      ctx.lineTo(-r * 1.55, -r * 0.1);
      ctx.quadraticCurveTo(-r * 1.1, -r * 0.7, -8, -r * 0.7);
      ctx.lineTo(-6, -r * 1.3); // Left ear
      ctx.lineTo(-4, -r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold Bat Emblem Canopy / Visor
      ctx.fillStyle = '#ffd60a';
      ctx.shadowColor = '#ffd60a';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.4);
      ctx.lineTo(6, -r * 0.15);
      ctx.lineTo(4, r * 0.2);
      ctx.lineTo(0, r * 0.1);
      ctx.lineTo(-4, r * 0.2);
      ctx.lineTo(-6, -r * 0.15);
      ctx.closePath();
      ctx.fill();

      // Wing Edge Neon Inset Lines
      ctx.strokeStyle = '#3a86ff';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(r * 0.8, -r * 0.2);
      ctx.lineTo(r * 1.4, 0);
      ctx.moveTo(-r * 0.8, -r * 0.2);
      ctx.lineTo(-r * 1.4, 0);
      ctx.stroke();

      // High-tech Cyan Plasma Turbine Exhaust
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-5, r * 0.85);
      ctx.lineTo(0, r * 0.85 + 13 * thrusterScale);
      ctx.lineTo(5, r * 0.85);
      ctx.closePath();
      ctx.fill();

    } else if (id === 'halloween_reaper') {
      // HALLOWEEN REAPER: Spectral grim reaper scythe-wings and demonic skull
      ctx.beginPath();
      // Central Horned Crest
      ctx.moveTo(0, -r * 1.35);
      ctx.lineTo(4, -r * 0.9);
      // Twin Forward Curved Scythe Blades
      ctx.quadraticCurveTo(r * 0.8, -r * 1.2, r * 1.4, -r * 0.7);
      ctx.lineTo(r * 1.5, -r * 0.5); // Outer scythe tip
      ctx.quadraticCurveTo(r * 0.9, -r * 0.2, r * 1.1, r * 0.5); // Blade inner spine
      ctx.lineTo(r * 0.5, r * 0.4);
      ctx.lineTo(4, r * 0.9);
      ctx.lineTo(0, r * 0.7);
      // Mirrored left scythe
      ctx.lineTo(-4, r * 0.9);
      ctx.lineTo(-r * 0.5, r * 0.4);
      ctx.lineTo(-r * 1.1, r * 0.5);
      ctx.quadraticCurveTo(-r * 0.9, -r * 0.2, -r * 1.5, -r * 0.5);
      ctx.lineTo(-r * 1.4, -r * 0.7);
      ctx.quadraticCurveTo(-r * 0.8, -r * 1.2, -4, -r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Spectral Skull Face
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, -r * 0.3, 5, 0, Math.PI * 2);
      ctx.fill();
      // Glowing eye sockets
      ctx.fillStyle = '#060919';
      ctx.beginPath();
      ctx.arc(-2, -r * 0.35, 1.5, 0, Math.PI * 2);
      ctx.arc(2, -r * 0.35, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Spectral Green Flame
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.moveTo(-5, r * 0.8);
      ctx.lineTo(0, r * 0.8 + 12 * thrusterScale);
      ctx.lineTo(5, r * 0.8);
      ctx.closePath();
      ctx.fill();

    } else if (id === 'void_slicer') {
      // VOID SLICER: Negative forward-swept ninja blades
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.25);
      ctx.lineTo(5, -r * 0.6);
      ctx.lineTo(r * 1.45, -r * 0.3); // Forward blade tip
      ctx.lineTo(r * 1.1, r * 0.2);
      ctx.lineTo(r * 0.4, r * 0.3);
      ctx.lineTo(5, r * 0.85);
      ctx.lineTo(0, r * 0.6);
      ctx.lineTo(-5, r * 0.85);
      ctx.lineTo(-r * 0.4, r * 0.3);
      ctx.lineTo(-r * 1.1, r * 0.2);
      ctx.lineTo(-r * 1.45, -r * 0.3);
      ctx.lineTo(-5, -r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Purple Visor
      ctx.fillStyle = secColor;
      ctx.fillRect(-2, -r * 0.5, 4, 10);

      // Thruster
      ctx.fillStyle = '#b5179e';
      ctx.beginPath();
      ctx.moveTo(-4, r * 0.7);
      ctx.lineTo(0, r * 0.7 + 10 * thrusterScale);
      ctx.lineTo(4, r * 0.7);
      ctx.closePath();
      ctx.fill();

    } else if (id === 'cyber_cube') {
      // CYBER CUBE / HEAVY DREADNOUGHT: Armored faceted hull
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.1);
      ctx.lineTo(r * 0.8, -r * 0.6);
      ctx.lineTo(r * 1.1, r * 0.3);
      ctx.lineTo(r * 0.7, r * 0.9);
      ctx.lineTo(0, r * 0.75);
      ctx.lineTo(-r * 0.7, r * 0.9);
      ctx.lineTo(-r * 1.1, r * 0.3);
      ctx.lineTo(-r * 0.8, -r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Heavy armor plates
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-5, -r * 0.3, 10, 12);

      // Twin Thrusters
      ctx.fillStyle = '#ffbe0b';
      ctx.fillRect(-r * 0.5, r * 0.8, 4, 8 * thrusterScale);
      ctx.fillRect(r * 0.5 - 4, r * 0.8, 4, 8 * thrusterScale);

    } else if (id === 'neon_phoenix') {
      // NEON PHOENIX: Swept feathered bird wings
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.3);
      ctx.lineTo(7, -r * 0.5);
      ctx.lineTo(r * 1.5, r * 0.1);
      ctx.lineTo(r * 1.2, r * 0.4);
      ctx.lineTo(r * 0.6, r * 0.4);
      ctx.lineTo(5, r * 0.9);
      ctx.lineTo(0, r * 0.65);
      ctx.lineTo(-5, r * 0.9);
      ctx.lineTo(-r * 0.6, r * 0.4);
      ctx.lineTo(-r * 1.2, r * 0.4);
      ctx.lineTo(-r * 1.5, r * 0.1);
      ctx.lineTo(-7, -r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Core flame diamond
      ctx.fillStyle = secColor;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.4);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, r * 0.2);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();

      // Bright Orange Flame
      ctx.fillStyle = '#ff7700';
      ctx.beginPath();
      ctx.moveTo(-5, r * 0.8);
      ctx.lineTo(0, r * 0.8 + 12 * thrusterScale);
      ctx.lineTo(5, r * 0.8);
      ctx.closePath();
      ctx.fill();

    } else {
      // ALPHA DART: Sleek delta jet
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.25);
      ctx.lineTo(r * 1.25, r * 0.7);
      ctx.lineTo(r * 0.45, r * 0.5);
      ctx.lineTo(0, r * 0.9);
      ctx.lineTo(-r * 0.45, r * 0.5);
      ctx.lineTo(-r * 1.25, r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit Diamond
      ctx.fillStyle = secColor;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.35);
      ctx.lineTo(6, 2);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 2);
      ctx.closePath();
      ctx.fill();

      // Thruster
      ctx.fillStyle = '#ff7700';
      ctx.beginPath();
      ctx.moveTo(-5, r * 0.85);
      ctx.lineTo(0, r * 0.85 + 11 * thrusterScale);
      ctx.lineTo(5, r * 0.85);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // Draw ship icon on a small preview canvas (for menu / hangar)
  static drawShipPreview(canvas, shipDef) {
    if (!canvas || !shipDef) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2 + 2);
    Renderer.drawShip(ctx, shipDef, 24, 1.1);
    ctx.restore();
  }
}
