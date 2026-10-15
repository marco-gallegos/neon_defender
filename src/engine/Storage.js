// LocalStorage Game State Persistence with Strict Numeric Validation
const STORAGE_KEY = 'neon_defender_savedata_v1';

const DEFAULT_DATA = {
  shards: 800, // Starter bonus for immediate fun testing of new ships & weapons
  equippedShip: 'dracula_plane',
  unlockedShips: ['alpha_dart', 'dracula_plane', 'bati_plane', 'halloween_reaper'],
  equippedSecondary: 'seeker',
  unlockedSecondaries: ['seeker', 'railgun', 'cluster'],
  secondaryUpgrades: {
    seeker: 1,
    railgun: 1,
    cluster: 1,
    vortex: 1
  },
  upgrades: {
    damage: 1,      // Base shot damage
    fireRate: 1,    // Shot frequency
    hull: 1,        // Max HP
    shield: 1,      // Max Shield & Regen
    magnet: 1,      // Item & Shard vacuum radius
    crit: 1,        // Critical strike chance/multiplier
    drones: 0,      // Orbital wingman drones (0 to 4)
    emp: 1          // EMP Bomb recharge speed & power
  },
  sectors: {
    1: { unlocked: true, stars: 0, highscore: 0 },
    2: { unlocked: false, stars: 0, highscore: 0 },
    3: { unlocked: false, stars: 0, highscore: 0 },
    4: { unlocked: false, stars: 0, highscore: 0 },
    5: { unlocked: false, stars: 0, highscore: 0 }
  },
  arenaStats: {
    bestWave: 0,
    bestScore: 0,
    totalShardsEarned: 0
  },
  settings: {
    sfx: true,
    music: true
  }
};

export function sanitizeNumber(val, fallback = 0, min = 0) {
  if (typeof val === 'string' && val.trim() !== '') {
    val = Number(val);
  }
  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
    return fallback;
  }
  return Math.max(min, Math.round(val));
}

export class Storage {
  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
      const parsed = JSON.parse(raw);

      // Deep sanitization to prevent any NaN from ever propagating
      const safeShards = sanitizeNumber(parsed?.shards, DEFAULT_DATA.shards, 0);

      const safeUpgrades = { ...DEFAULT_DATA.upgrades };
      if (parsed?.upgrades && typeof parsed.upgrades === 'object') {
        for (const [key, defaultVal] of Object.entries(DEFAULT_DATA.upgrades)) {
          safeUpgrades[key] = sanitizeNumber(
            parsed.upgrades[key],
            defaultVal,
            key === 'drones' ? 0 : 1
          );
        }
      }

      const safeArenaStats = {
        bestWave: sanitizeNumber(parsed?.arenaStats?.bestWave, 0, 0),
        bestScore: sanitizeNumber(parsed?.arenaStats?.bestScore, 0, 0),
        totalShardsEarned: sanitizeNumber(parsed?.arenaStats?.totalShardsEarned, 0, 0)
      };

      const safeSectors = { ...DEFAULT_DATA.sectors };
      if (parsed?.sectors && typeof parsed.sectors === 'object') {
        for (const [id, sec] of Object.entries(DEFAULT_DATA.sectors)) {
          const parsedSec = parsed.sectors[id];
          if (parsedSec) {
            safeSectors[id] = {
              unlocked: Boolean(parsedSec.unlocked ?? sec.unlocked),
              stars: sanitizeNumber(parsedSec.stars, 0, 0),
              highscore: sanitizeNumber(parsedSec.highscore, 0, 0)
            };
          }
        }
      }

      const safeSecondaryUpgrades = { ...DEFAULT_DATA.secondaryUpgrades };
      if (parsed?.secondaryUpgrades && typeof parsed.secondaryUpgrades === 'object') {
        for (const [key, defaultVal] of Object.entries(DEFAULT_DATA.secondaryUpgrades)) {
          safeSecondaryUpgrades[key] = sanitizeNumber(parsed.secondaryUpgrades[key], defaultVal, 1);
        }
      }

      const safeUnlockedSecondaries = Array.isArray(parsed?.unlockedSecondaries) && parsed.unlockedSecondaries.length > 0
        ? [...new Set(parsed.unlockedSecondaries)]
        : [...DEFAULT_DATA.unlockedSecondaries];

      const safeEquippedSecondary = typeof parsed?.equippedSecondary === 'string' && safeUnlockedSecondaries.includes(parsed.equippedSecondary)
        ? parsed.equippedSecondary
        : safeUnlockedSecondaries[0] || 'seeker';

      const safeUnlockedShips = Array.isArray(parsed?.unlockedShips) && parsed.unlockedShips.length > 0
        ? [...new Set([...parsed.unlockedShips, 'dracula_plane', 'bati_plane', 'halloween_reaper'])]
        : [...DEFAULT_DATA.unlockedShips];

      const safeEquippedShip = typeof parsed?.equippedShip === 'string' && safeUnlockedShips.includes(parsed.equippedShip)
        ? parsed.equippedShip
        : 'dracula_plane';

      return {
        ...DEFAULT_DATA,
        ...parsed,
        shards: safeShards,
        equippedShip: safeEquippedShip,
        unlockedShips: safeUnlockedShips,
        upgrades: safeUpgrades,
        equippedSecondary: safeEquippedSecondary,
        unlockedSecondaries: safeUnlockedSecondaries,
        secondaryUpgrades: safeSecondaryUpgrades,
        arenaStats: safeArenaStats,
        sectors: safeSectors,
        settings: {
          sfx: parsed?.settings?.sfx !== false,
          music: parsed?.settings?.music !== false
        }
      };
    } catch (e) {
      console.warn('Failed to load save data, using default:', e);
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  }

  static save(data) {
    try {
      if (data && typeof data === 'object') {
        // Guarantee shards and upgrades are strictly valid numbers before saving
        data.shards = sanitizeNumber(data.shards, 0, 0);
        if (data.upgrades && typeof data.upgrades === 'object') {
          for (const key of Object.keys(data.upgrades)) {
            data.upgrades[key] = sanitizeNumber(data.upgrades[key], 1, key === 'drones' ? 0 : 1);
          }
        }
        if (data.secondaryUpgrades && typeof data.secondaryUpgrades === 'object') {
          for (const key of Object.keys(data.secondaryUpgrades)) {
            data.secondaryUpgrades[key] = sanitizeNumber(data.secondaryUpgrades[key], 1, 1);
          }
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save data:', e);
    }
  }

  static reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to reset save data:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}
