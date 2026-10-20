# NEON DEFENDER (Galaxy Shmup x Geometry Dash)

A high-octane, neon vector shoot 'em up game optimized for **cellphones (touch controls)** and desktop browsers. Built with responsive HTML5 Canvas and procedural Web Audio chiptune synthesis, with **zero pay-to-win mechanics**.

---

## 🚀 Key Highlights & Features

- **📱 Tailored for Cellphones (Touch Controls)**:
  - **Finger Offset Tracking**: Your starship glides ~45px *above* your finger tip, so your own thumb/finger never blocks your view of incoming hazards or bullets.
  - **Responsive Mobile Viewport**: Smooth scaling across 16:9, 18:9, 19.5:9, 20:9 phone ratios with safe-area notch padding.
  - **Always-Reachable Pause**: The pause button is pinned in its own top-right layer (44px tap target) so HUD content can never push it off-screen on tall phones.
  - **Clutter-Free Loot HUD**: Shard & crystal counters are hidden during combat by default — they flash briefly when you pick something up, and can be pinned on with the ◆ button or *Options → HUD Display*. Totals are always shown on the pause screen.
  - **Touch & Drag**: Auto-firing during touch glide, with a prominent dedicated **EMP Bomb** button designed for quick thumb triggers.
  - Desktop fallback with Mouse drag, WASD / Arrow keys, and Spacebar.

- **✨ Geometry Dash Aesthetic**:
  - Glowing neon shapes (Pulsing triangles, 8-tooth buzzsaws, razor rhombuses, laser octagons).
  - Background scrolling Cyber Grid with rhythmic beat pulses and twinkling parallax starfield.
  - Debris bursts, shockwave rings, floating arcade damage counters, and chromatic impact shakes.
  - Built-in procedural Web Audio chiptune synth with a **9-track original soundtrack** in the style of the classics: Metal Slug boss marches, Contra jungle runs, Castlevania gallops, Streets of Rage grooves, Mega Man industrial energy and a Sonic-style menu theme — with dynamic switches (stage theme per sector, Gradius-style warning sting + march on boss spawn, victory fanfare, game-over dirge) plus punchy SFX (laser, bass drops, shield deflections, powerup fanfares). Zero audio asset loading lag! See [MUSIC.md](MUSIC.md) for the engine guide and track list.

- **🎯 Test Range: know exactly where your numbers come from**:
  - A no-stakes sandbox stage (no enemy waves, no loot, no game over) reached from the main menu.
  - **Itemized stat breakdown**: every stat shows its sources line by line — base ship value, upgrade level, each equipped item **by name**, and drone contributions (e.g. `Damage 100 = ship 60 + OVERCHARGE (A gun) 22 + command aura (drones) 18`), plus the worked formula and a stacked source bar.
  - **Spawn practice targets**: tap any of the 13 enemy types (or the 5000 HP Practice Titan) to drop one into the range instantly; an in-run **🎯 SPAWN** panel keeps the buttons one tap away, with a live **DPS readout** and a **🧹 CLEAR** button. Targets hold position and never shoot back.

- **💰 Zero Pay-To-Win: Endless Arena Farming Mode**:
  - Want more upgrades and ships? Jump straight into the **Endless Arena Mode**!
  - Arena mode features scaling waves with escalating shard drop multipliers (1.5x, 2.5x, 4.0x+).
  - Face colossal **Arena Titans** every 5 waves to harvest giant shard jackpots.
  - **Checkpoint every 5 waves**: die deep, resume where you left off — your banked **weapon level** carries over, so you never restart a wave-40 run from scratch.
  - Upgrade every single stat to maximum level and unlock all ships purely through fun, addictive gameplay.

- **🛸 Cyber Workshop & Starship Hangar**:
  - **8 Upgrade Branches** (Level 1 to 10):
    - *Plasma Blaster* (Damage & beam thickness)
    - *Overclock Cadence* (Fire rate)
    - *Nanotech Hull* (Max HP)
    - *Deflector Matrix* (Max Shield & auto-recharge speed)
    - *Vacuum Core* (Magnet radius to suck in all shards from across the screen)
    - *Targeting Computer* (Critical hit chance & damage)
    - *Wingman Drones* (Up to 4 autonomous orbital drones firing homing darts)
    - *EMP Super Blast* (Screen-wipe bomb cooldown & damage)
  - **4 Unlockable Starships**:
    - **Alpha Dart**: Balanced starter ship.
    - **Cyber Cube**: Iconic GD cube chassis with +40% shield matrix.
    - **Neon Phoenix**: High-speed assault ship with +25% rapid-fire cadence.
    - **Void Slicer**: Assassin craft with +50% Shard Drop multiplier and high crits.

- **🌌 Galaxy Sectors (Campaign Mode)**:
  - 5 progressive campaign sectors with unique wave compositions, mini-bosses, and multi-phase Sector Overlords:
    - Sector 1: *Cubic Guardian*
    - Sector 2: *Prism Pulsar*
    - Sector 3: *Hexa Tyrant*
    - Sector 4: *Octagon Overlord*
    - Sector 5: *Chronos Prime*
  - Sector clearance star ratings and shard bounties.

- **💾 LocalStorage Auto-Save**:
  - All upgrades, shard bank, unlocked ships, high waves, and audio settings are automatically persisted.

---

## 📲 How to Play on your Cellphone

1. **Start the local server with network host enabled**:
   ```bash
   npm run dev
   ```
2. Vite will output the local network URL, for example:
   ```text
     ➜  Local:   http://localhost:5173/
     ➜  Network: http://192.168.1.50:5173/
   ```
3. Open your mobile phone browser (Chrome, Safari, Firefox), ensure your phone is connected to the same Wi-Fi network, and navigate to the **Network URL** (e.g. `http://192.168.1.50:5173/`).
4. (Optional) In Chrome or Safari on your phone, tap **"Add to Home Screen"** to run it in full-screen PWA standalone mode without browser URL bars!

---

## 🎮 Desktop Controls Fallback

- **Mouse / Touch Drag**: Move ship & aim
- **Left Click / Space**: Fire weapons (Auto-fire is enabled by default during touch/drag)
- **E / B / Screen Button**: Detonate EMP Super Bomb
- **P / Pause Icon**: Pause / Resume / Quit

---

## 🚀 Deployment (GitHub Pages)

This game is automatically built and deployed to **GitHub Pages** on every push to `master` via the [Deploy to GitHub Pages workflow](.github/workflows/deploy-pages.yml).

### Live Game

The game is live at:

```text
https://marco-gallegos.github.io/neon_defender/
```

### One-Time GitHub Setup

1. Go to your repository **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to (or merge into) the `master` branch — the workflow builds the game with Vite and publishes the contents of `dist/` to GitHub Pages.

### How the Workflow Deploys

- **Trigger**: Runs on every push to `master` (or manually via *workflow_dispatch*).
- **Build**: Checks out the code, installs dependencies, and runs `npm run build -- --base=./` so the game is built with a relative asset base (required for subpath hosting).
- **Docs**: Copies `README.md` into `dist/` and adds a `.nojekyll` marker so the published site includes the documentation and is served without Jekyll processing.
- **Publish**: Uploads the `dist/` folder as a GitHub Pages artifact and deploys it to the `github-pages` environment.

### Local Verification

```bash
npm run build
npm run preview -- --host
```
