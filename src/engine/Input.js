// Touch and Desktop Input Manager with Mobile Touch Offset
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.targetX = 0;
    this.targetY = 0;
    this.isPointerDown = false;
    this.isShooting = false;
    this.empTriggered = false;

    // Relative drag tracking for mobile
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.playerStartX = 0;
    this.playerStartY = 0;
    this.isTouching = false;

    // Desktop keyboard state
    this.keys = {};

    this.setupListeners();
  }

  setupListeners() {
    // Touch Events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

    // Mouse Events (Desktop testing & fallback)
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Keyboard Events
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'KeyB') {
        this.empTriggered = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Prevent gestures & context menus
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.isTouching = true;
      this.isPointerDown = true;
      this.isShooting = true;

      // Finger offset: Place ship slightly above finger position
      // so finger doesn't obstruct player view!
      this.touchStartX = coords.x;
      this.touchStartY = coords.y;
      this.targetX = coords.x;
      this.targetY = coords.y - 45; // 45px vertical comfort offset
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    if (this.isTouching && e.touches.length > 0) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);

      // Smooth direct/relative tracking with finger visibility offset
      this.targetX = coords.x;
      this.targetY = coords.y - 50;
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length === 0) {
      this.isTouching = false;
      this.isPointerDown = false;
      // Keep shooting on mobile or toggle if desired (on mobile auto-fire during touch is best)
      this.isShooting = false;
    }
  }

  handleMouseDown(e) {
    if (e.button === 0) { // Left click
      const coords = this.getCanvasCoords(e.clientX, e.clientY);
      this.isPointerDown = true;
      this.isShooting = true;
      this.targetX = coords.x;
      this.targetY = coords.y;
    }
  }

  handleMouseMove(e) {
    if (this.isPointerDown) {
      const coords = this.getCanvasCoords(e.clientX, e.clientY);
      this.targetX = coords.x;
      this.targetY = coords.y;
    }
  }

  handleMouseUp(e) {
    if (e.button === 0) {
      this.isPointerDown = false;
      this.isShooting = false;
    }
  }

  // Poll keyboard inputs (Desktop)
  getKeyboardMovement() {
    let dx = 0;
    let dy = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['Space']) this.isShooting = true;
    return { dx, dy };
  }

  consumeEmp() {
    const triggered = this.empTriggered;
    this.empTriggered = false;
    return triggered;
  }
}
