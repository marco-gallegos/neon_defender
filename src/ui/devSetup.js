// Developer panel bootstrap — DEV BUILDS ONLY.
//
// `main.js` loads this module through a dynamic import guarded by
// `import.meta.env.DEV`. Vite rewrites that flag to `false` in production,
// so the whole import expression is dropped and Rollup never emits this
// file (or `DevPanel.js`) into the shipped bundle at all.
//
// Nothing here is referenced from static imports — keep it that way, or the
// panel will start shipping to players.

import { audio } from '../engine/Audio.js';

/**
 * Mount the developer panel and wire its shortcuts.
 * @param {object} game - the running Game instance
 */
export function initDevPanel(game) {
  return import('./DevPanel.js').then(({ DevPanel }) => {
    const panel = new DevPanel(game);
    game.devPanel = panel;
    panel.mount();

    // F2 toggles the panel; ESC closes it.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F2') {
        e.preventDefault();
        panel.toggle();
      } else if (e.code === 'Escape' && panel.isOpen()) {
        e.preventDefault();
        panel.hide();
      }
    });

    // Add a menu entry so the panel is reachable without the keyboard.
    const menu = document.getElementById('screen-main-menu');
    const actions = menu?.querySelector('.menu-actions');
    if (actions && !document.getElementById('btn-open-dev')) {
      const btn = document.createElement('button');
      btn.id = 'btn-open-dev';
      btn.className = 'neon-btn secondary-btn';
      btn.style.borderColor = 'rgba(57, 255, 20, 0.55)';
      btn.textContent = '🛠 DEV PANEL';
      btn.onclick = () => { audio.playClick?.(); panel.show(); };
      actions.appendChild(btn);
    }

    console.info('%c[DEV PANEL] Loaded — press F2 to toggle.', 'color:#39ff14;font-weight:bold');
    return panel;
  });
}
