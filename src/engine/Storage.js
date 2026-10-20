// LocalStorage Game State Persistence with Strict Numeric Validation
// Storage Key for LocalStorage persistence
export const STORAGE_KEY = 'neon_defender_savedata_v1';

export const DEFAULT_DATA = {
  shards: 0, // Start from zero — earn everything through gameplay
  crystals: 0, // Nano Crystals: scarce currency for equipment upgrades/fusion
  equippedShip: 'alpha_dart',
  unlockedShips: ['alpha_dart'],
  inventory: [], // Equipment instances (see systems/Equipment.js)
  equippedEquipment: {
    shield: null,
    gun: null,
    material: [null, null],
    drone: [null, null],
    skin: null
  },
  equippedPrimary: 'plasma',
  unlockedPrimaries: ['plasma', 'laser', 'spread', 'wave'],
  // Endless Arena soundtracks unlocked by clearing campaign sectors.
  unlockedTracks: ['stage_jungle'],
  equippedSecondary: 'seeker',
  unlockedSecondaries: ['seeker'],
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
    5: { unlocked: false, stars: 0, highscore: 0 },
    6: { unlocked: false, stars: 0, highscore: 0 },
    7: { unlocked: false, stars: 0, highscore: 0 },
    8: { unlocked: false, stars: 0, highscore: 0 },
    9: { unlocked: false, stars: 0, highscore: 0 },
    10: { unlocked: false, stars: 0, highscore: 0 }
  },
  arenaStats: {
    bestWave: 0,
    bestScore: 0,
    totalShardsEarned: 0,
    checkpoint: 0, // Highest arena checkpoint wave unlocked (multiple of ARENA_CHECKPOINT_INTERVAL)
    weaponLevel: 1 // In-run weapon level (SPREAD capsules) at the moment the checkpoint was set
  },
  settings: {
    sfx: true,
    music: true,
    hudCurrency: false // Loot counters hidden in combat by default (flash on pickup)
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

/**
 * Deep-sanitise an arbitrary save object.
 *
 * This is the single validation gate for save data: it is used both when
 * loading from LocalStorage and when importing a save file / pasted JSON, so
 * an imported save can never introduce NaN, unknown shapes or dangling
 * equipment references into the running game.
 *
 * @param {object} parsed - raw parsed save object (may be anything)
 * @returns {object} a fully valid save object
 */
export function sanitizeSaveData(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

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
    totalShardsEarned: sanitizeNumber(parsed?.arenaStats?.totalShardsEarned, 0, 0),
    checkpoint: sanitizeNumber(parsed?.arenaStats?.checkpoint, 0, 0),
    // Weapon level is clamped to the game's own 1..5 range.
    weaponLevel: Math.min(5, Math.max(1, sanitizeNumber(parsed?.arenaStats?.weaponLevel, 1, 1)))
  };

  const safeSectors = {};
  for (const [id, sec] of Object.entries(DEFAULT_DATA.sectors)) {
    safeSectors[id] = { ...sec };
  }
  if (parsed?.sectors && typeof parsed.sectors === 'object') {
    for (const [id, sec] of Object.entries(safeSectors)) {
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
    ? [...new Set(parsed.unlockedShips)]
    : [...DEFAULT_DATA.unlockedShips];

  const safeEquippedShip = typeof parsed?.equippedShip === 'string' && safeUnlockedShips.includes(parsed.equippedShip)
    ? parsed.equippedShip
    : (safeUnlockedShips[0] || 'alpha_dart');

  const safeUnlockedPrimaries = Array.isArray(parsed?.unlockedPrimaries) && parsed.unlockedPrimaries.length > 0
    ? [...new Set([...parsed.unlockedPrimaries, ...DEFAULT_DATA.unlockedPrimaries])]
    : [...DEFAULT_DATA.unlockedPrimaries];

  const safeEquippedPrimary = typeof parsed?.equippedPrimary === 'string' && safeUnlockedPrimaries.includes(parsed.equippedPrimary)
    ? parsed.equippedPrimary
    : 'plasma';

  // Endless Arena soundtrack unlocks (always at least the starter theme).
  const safeUnlockedTracks = Array.isArray(parsed?.unlockedTracks) && parsed.unlockedTracks.length > 0
    ? [...new Set(parsed.unlockedTracks.filter(t => typeof t === 'string'))]
    : [...DEFAULT_DATA.unlockedTracks];
  if (safeUnlockedTracks.length === 0) safeUnlockedTracks.push(...DEFAULT_DATA.unlockedTracks);

  // --- Equipment system ---
  const safeCrystals = sanitizeNumber(parsed?.crystals, 0, 0);

  const safeInventory = Array.isArray(parsed?.inventory)
    ? parsed.inventory.filter(it =>
        it && typeof it === 'object' &&
        typeof it.id === 'string' &&
        typeof it.tier === 'string' &&
        typeof it.category === 'string' &&
        Array.isArray(it.effects)
      )
    : [];

  const safeEquippedEquipment = {
    shield: null,
    gun: null,
    material: [null, null],
    drone: [null, null],
    skin: null
  };
  if (parsed?.equippedEquipment && typeof parsed.equippedEquipment === 'object') {
    const invIds = new Set(safeInventory.map(i => i.id));
    for (const cat of Object.keys(safeEquippedEquipment)) {
      const def = DEFAULT_DATA.equippedEquipment[cat];
      const val = parsed.equippedEquipment[cat];
      if (Array.isArray(def)) {
        const arr = Array.isArray(val) ? val.slice(0, def.length) : [];
        safeEquippedEquipment[cat] = def.map((_, i) => {
          const id = arr[i];
          return (typeof id === 'string' && invIds.has(id)) ? id : null;
        });
      } else {
        safeEquippedEquipment[cat] = (typeof val === 'string' && invIds.has(val)) ? val : null;
      }
    }
  }

  return {
    ...DEFAULT_DATA,
    ...parsed,
    shards: safeShards,
    crystals: safeCrystals,
    inventory: safeInventory,
    equippedEquipment: safeEquippedEquipment,
    equippedShip: safeEquippedShip,
    unlockedShips: safeUnlockedShips,
    equippedPrimary: safeEquippedPrimary,
    unlockedPrimaries: safeUnlockedPrimaries,
    unlockedTracks: safeUnlockedTracks,
    upgrades: safeUpgrades,
    equippedSecondary: safeEquippedSecondary,
    unlockedSecondaries: safeUnlockedSecondaries,
    secondaryUpgrades: safeSecondaryUpgrades,
    arenaStats: safeArenaStats,
    sectors: safeSectors,
    settings: {
      sfx: parsed?.settings?.sfx !== false,
      music: parsed?.settings?.music !== false,
      hudCurrency: parsed?.settings?.hudCurrency === true
    }
  };
}

export class Storage {
  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
      return sanitizeSaveData(JSON.parse(raw));
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
