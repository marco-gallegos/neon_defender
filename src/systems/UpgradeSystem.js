// Upgrade definitions, Ship profiles, and Progression Economy

export const SHIPS = {
  alpha_dart: {
    id: 'alpha_dart',
    name: 'ALPHA DART',
    desc: 'Agile balanced combat vessel with rapid plasma blasters.',
    cost: 0,
    color: '#00f0ff',
    secondaryColor: '#0066ff',
    bulletShape: 'dart',
    passiveId: 'nimble',
    stats: {
      speedMult: 1.0,
      damageMult: 1.0,
      shieldMult: 1.0,
      shardBonus: 1.0
    },
    perkText: 'Nimble Frame (Smaller Hitbox & +15% Magnet)'
  },
  cyber_cube: {
    id: 'cyber_cube',
    name: 'CYBER CUBE',
    desc: 'Heavy geometric battle chassis with reinforced energy shields.',
    cost: 400,
    color: '#ffe600',
    secondaryColor: '#39ff14',
    bulletShape: 'cube',
    passiveId: 'bulwark',
    stats: {
      speedMult: 0.9,
      damageMult: 1.1,
      shieldMult: 1.4,
      shardBonus: 1.1
    },
    perkText: 'Bulwark Plating (+40% Shield & -12% Damage Taken)'
  },
  neon_phoenix: {
    id: 'neon_phoenix',
    name: 'NEON PHOENIX',
    desc: 'High-cadence assault fighter with twin thermal accelerators.',
    cost: 1200,
    color: '#ff007f',
    secondaryColor: '#ff7700',
    bulletShape: 'phoenix',
    passiveId: 'emberfire',
    stats: {
      speedMult: 1.15,
      damageMult: 1.25,
      shieldMult: 0.95,
      shardBonus: 1.2
    },
    perkText: 'Emberfire (+25% Rapid Fire & +8% Crit Chance)'
  },
  void_slicer: {
    id: 'void_slicer',
    name: 'VOID SLICER',
    desc: 'Legendary cyber-hunter ship designed for maximum shard harvesting.',
    cost: 2500,
    color: '#9d00ff',
    secondaryColor: '#00f0ff',
    bulletShape: 'slicer',
    passiveId: 'voidrounds',
    stats: {
      speedMult: 1.1,
      damageMult: 1.35,
      shieldMult: 1.15,
      shardBonus: 1.5
    },
    perkText: 'Void Rounds (+50% Shards & Piercing Shot)'
  },
  dracula_plane: {
    id: 'dracula_plane',
    name: "DRACULA'S WING",
    desc: 'Gothic vampire supersonic jet with scalloped bat-wings and twin blood-fangs.',
    cost: 1500,
    color: '#ff0055',
    secondaryColor: '#ff2277',
    bulletShape: 'fang',
    passiveId: 'lifesteal',
    stats: {
      speedMult: 1.12,
      damageMult: 1.4,
      shieldMult: 1.2,
      shardBonus: 1.35
    },
    perkText: 'Vampiric Drain (+8 HP on kill) & Crimson Cannons'
  },
  bati_plane: {
    id: 'bati_plane',
    name: 'BATI PLANE',
    desc: 'Iconic stealth batwing interceptor with dual cowl ears and reinforced armor.',
    cost: 1800,
    color: '#ffe600',
    secondaryColor: '#00f0ff',
    bulletShape: 'bat',
    passiveId: 'batshield',
    stats: {
      speedMult: 1.18,
      damageMult: 1.35,
      shieldMult: 1.5,
      shardBonus: 1.3
    },
    perkText: 'Stealth Batwing (+50% Shield & Recharge on Kill)'
  },
  halloween_reaper: {
    id: 'halloween_reaper',
    name: 'HALLOWEEN REAPER',
    desc: 'Haunted phantom jet with scythe wingblades and spectral green afterburners.',
    cost: 2200,
    color: '#39ff14',
    secondaryColor: '#9d00ff',
    bulletShape: 'scythe',
    passiveId: 'soulharvest',
    stats: {
      speedMult: 1.22,
      damageMult: 1.45,
      shieldMult: 1.15,
      shardBonus: 1.6
    },
    perkText: 'Spectre Drive (+60% Shards & Soul Siphon on Kill)'
  }
};

export const UPGRADES = {
  damage: {
    id: 'damage',
    name: 'Plasma Blaster',
    desc: 'Increases bullet impact damage and plasma beam width.',
    icon: '⚡',
    maxLevel: 10,
    getCost: (lvl) => Math.round(50 * Math.pow(lvl, 1.35)),
    getValue: (lvl) => 10 + (lvl - 1) * 3 // Base dmg: 10 to 37
  },
  fireRate: {
    id: 'fireRate',
    name: 'Overclock Cadence',
    desc: 'Boosts firing rate, showering foes in a stream of laser fire.',
    icon: '🔥',
    maxLevel: 10,
    getCost: (lvl) => Math.round(60 * Math.pow(lvl, 1.4)),
    getValue: (lvl) => Math.max(0.08, 0.22 - (lvl - 1) * 0.014) // Interval in seconds (0.22s -> 0.09s)
  },
  hull: {
    id: 'hull',
    name: 'Nanotech Hull',
    desc: 'Reinforces ship armor against catastrophic collision damage.',
    icon: '❤️',
    maxLevel: 10,
    getCost: (lvl) => Math.round(45 * Math.pow(lvl, 1.3)),
    getValue: (lvl) => 100 + (lvl - 1) * 20 // 100 to 280 HP
  },
  shield: {
    id: 'shield',
    name: 'Deflector Matrix',
    desc: 'Generates an auto-recharging energy barrier that absorbs hits.',
    icon: '🛡️',
    maxLevel: 10,
    getCost: (lvl) => Math.round(50 * Math.pow(lvl, 1.35)),
    getValue: (lvl) => ({
      max: 40 + (lvl - 1) * 15, // 40 to 175 Shield
      regenRate: 4 + (lvl - 1) * 2 // Shield regen per sec
    })
  },
  magnet: {
    id: 'magnet',
    name: 'Vacuum Core',
    desc: 'Magnifies the gravitational pull on dropped shards and items.',
    icon: '🧲',
    maxLevel: 8,
    getCost: (lvl) => Math.round(40 * Math.pow(lvl, 1.3)),
    getValue: (lvl) => 60 + (lvl - 1) * 35 // 60px to 305px attraction radius
  },
  crit: {
    id: 'crit',
    name: 'Targeting Computer',
    desc: 'Enhances critical hit probability and critical damage factor.',
    icon: '🎯',
    maxLevel: 8,
    getCost: (lvl) => Math.round(70 * Math.pow(lvl, 1.45)),
    getValue: (lvl) => ({
      chance: 0.05 + (lvl - 1) * 0.04, // 5% to 33%
      mult: 1.5 + (lvl - 1) * 0.15 // 1.5x to 2.55x
    })
  },
  drones: {
    id: 'drones',
    name: 'Wingman Drones',
    desc: 'Deploys autonomous orbital drones that seek and destroy targets.',
    icon: '🛸',
    maxLevel: 4,
    getCost: (lvl) => [150, 450, 950, 1800][lvl] || 2500,
    getValue: (lvl) => lvl // 0 to 4 drones
  },
  emp: {
    id: 'emp',
    name: 'EMP Super Blast',
    desc: 'Reduces EMP recharge cooldown and turns bullets into shards.',
    icon: '💥',
    maxLevel: 5,
    getCost: (lvl) => Math.round(90 * Math.pow(lvl, 1.45)),
    getValue: (lvl) => ({
      cooldown: Math.max(12, 28 - (lvl - 1) * 3.5), // 28s down to 14s
      damage: 150 + (lvl - 1) * 75
    })
  }
};

// Endless Arena checkpoints: every N waves the player unlocks a resume point.
export const ARENA_CHECKPOINT_INTERVAL = 5;

// Endless Arena swaps its soundtrack on the same cadence as checkpoints.
export const ARENA_MUSIC_INTERVAL = 5;

// Which stage theme belongs to each campaign sector. Used both for the sector's
// own soundtrack and to unlock the theme for Endless Arena once it's cleared.
export const SECTOR_TRACKS = {
  1: 'stage_jungle', 2: 'stage_jungle',
  3: 'stage_city', 4: 'stage_city', 5: 'stage_city',
  6: 'stage_castle', 7: 'stage_castle', 10: 'stage_castle',
  8: 'stage_foundry', 9: 'stage_foundry'
};

// Every stage theme that Endless Arena can shuffle through.
export const STAGE_TRACKS = ['stage_jungle', 'stage_city', 'stage_castle', 'stage_foundry'];

// The theme the player starts the game with (sector 1 is always unlocked).
export const DEFAULT_UNLOCKED_TRACKS = ['stage_jungle'];

export const SECTORS = [
  {
    id: 1,
    name: 'NEON OUTPOST',
    subtitle: 'Sector 1 • Beginner Patrol',
    waves: 8,
    rewardShards: 300,
    bossName: 'CUBIC GUARDIAN',
    bossHp: 1200,
    bossType: 'guardian',
    color: '#00f0ff',
    threat: 1,
    minionHpMult: 1.0
  },
  {
    id: 2,
    name: 'CYBER ASTEROIDS',
    subtitle: 'Sector 2 • Swarm Density',
    waves: 10,
    rewardShards: 450,
    bossName: 'PRISM PULSAR',
    bossHp: 2800,
    bossType: 'prism',
    color: '#ffe600',
    threat: 1,
    minionHpMult: 1.15
  },
  {
    id: 3,
    name: 'VORTEX CORE',
    subtitle: 'Sector 3 • High Intensity',
    waves: 12,
    rewardShards: 700,
    bossName: 'HEXA TYRANT',
    bossHp: 5200,
    bossType: 'hex',
    color: '#ff007f',
    threat: 2,
    minionHpMult: 1.3
  },
  {
    id: 4,
    name: 'HYPERION LABS',
    subtitle: 'Sector 4 • Laser Grid Lockdown',
    waves: 14,
    rewardShards: 1050,
    bossName: 'OCTAGON OVERLORD',
    bossHp: 8800,
    bossType: 'octagon',
    color: '#9d00ff',
    threat: 2,
    minionHpMult: 1.5
  },
  {
    id: 5,
    name: 'OMEGA SINGULARITY',
    subtitle: 'Sector 5 • Event Horizon',
    waves: 16,
    rewardShards: 1600,
    bossName: 'CHRONOS PRIME',
    bossHp: 14000,
    bossType: 'chronos',
    color: '#7df9ff',
    threat: 3,
    minionHpMult: 1.75
  },
  {
    id: 6,
    name: 'INFERNO CITADEL',
    subtitle: 'Sector 6 • Hellgate Breach',
    waves: 18,
    rewardShards: 2300,
    bossName: 'DIABLO OVERLORD',
    bossHp: 21000,
    bossType: 'devil',
    color: '#ff3300',
    threat: 3,
    minionHpMult: 2.0
  },
  {
    id: 7,
    name: 'ABYSS GATE',
    subtitle: 'Sector 7 • Eldritch Depths',
    waves: 20,
    rewardShards: 3200,
    bossName: 'VOID LEVIATHAN',
    bossHp: 31000,
    bossType: 'leviathan',
    color: '#9d00ff',
    threat: 4,
    minionHpMult: 2.25
  },
  {
    id: 8,
    name: 'BLOOD MOON',
    subtitle: 'Sector 8 • Crimson Eclipse',
    waves: 22,
    rewardShards: 4300,
    bossName: 'CRIMSON REAPER',
    bossHp: 46000,
    bossType: 'reaper',
    color: '#ff0055',
    threat: 4,
    minionHpMult: 2.5
  },
  {
    id: 9,
    name: 'MACHINE EMPIRE',
    subtitle: 'Sector 9 • Titan Foundry',
    waves: 24,
    rewardShards: 5800,
    bossName: 'OMEGA TITAN',
    bossHp: 68000,
    bossType: 'titan',
    color: '#3a86ff',
    threat: 5,
    minionHpMult: 2.8
  },
  {
    id: 10,
    name: 'HELLFIRE CORE',
    subtitle: 'Sector 10 • Throne of the Damned',
    waves: 26,
    rewardShards: 8000,
    bossName: 'DEMON KING SATAN',
    bossHp: 95000,
    bossType: 'demon_king',
    color: '#ff1100',
    threat: 5,
    minionHpMult: 3.2
  }
];

export const PRIMARY_WEAPONS = {
  plasma: {
    id: 'plasma',
    name: 'PULSE CANNON',
    shortName: 'PLASMA',
    icon: '⚡',
    desc: 'High-velocity concentrated plasma stream. Balanced fire cadence and pin-point accuracy.',
    cost: 0,
    color: '#00f0ff',
    secondaryColor: '#ffffff',
    fireIntervalMult: 1.0,
    damageMult: 1.0,
    type: 'plasma'
  },
  laser: {
    id: 'laser',
    name: 'PHOTON LANCE',
    shortName: 'LASER',
    icon: '🔴',
    desc: 'Hyper-dense piercing laser beams that cut through multiple enemies simultaneously.',
    cost: 0,
    color: '#ff0055',
    secondaryColor: '#ff99bb',
    fireIntervalMult: 1.18,
    damageMult: 1.35,
    type: 'laser',
    pierce: 3
  },
  spread: {
    id: 'spread',
    name: 'SPREAD VULCAN',
    shortName: 'SPREAD',
    icon: '💥',
    desc: 'Wide multi-barrel shotgun spread providing massive screen coverage against swarms.',
    cost: 0,
    color: '#ffe600',
    secondaryColor: '#ff7700',
    fireIntervalMult: 1.12,
    damageMult: 0.85,
    type: 'spread'
  },
  wave: {
    id: 'wave',
    name: 'WAVE PULSAR',
    shortName: 'WAVE',
    icon: '🌊',
    desc: 'Sine-wave oscillating dual energy streams that sweep back and forth across lanes.',
    cost: 0,
    color: '#39ff14',
    secondaryColor: '#00f0ff',
    fireIntervalMult: 0.95,
    damageMult: 1.1,
    type: 'wave'
  }
};

export const SECONDARY_WEAPONS = {
  seeker: {
    id: 'seeker',
    name: 'SEEKER MISSILES',
    shortName: 'MISSILE',
    icon: '🚀',
    desc: 'Fires high-velocity homing micro-missiles that aggressively track down targets.',
    cost: 0, // Unlocked by default
    color: '#39ff14',
    secondaryColor: '#00f0ff',
    maxLevel: 5,
    getCost: (lvl) => Math.round(90 * Math.pow(lvl, 1.4)),
    getStats: (lvl) => ({
      damage: 20 + (lvl - 1) * 12,
      count: 3 + (lvl >= 3 ? 2 : 0) + (lvl >= 5 ? 3 : 0), // 3 -> 5 -> 8 missiles
      cooldown: Math.max(1.9, 3.6 - (lvl - 1) * 0.34)
    })
  },
  railgun: {
    id: 'railgun',
    name: 'PHOTON RAILGUN',
    shortName: 'RAILGUN',
    icon: '⚡',
    desc: 'Unleashes an instant hyper-dense laser beam that pierces through all enemies.',
    cost: 150,
    color: '#00f0ff',
    secondaryColor: '#ffffff',
    maxLevel: 5,
    getCost: (lvl) => Math.round(120 * Math.pow(lvl, 1.4)),
    getStats: (lvl) => ({
      damage: 130 + (lvl - 1) * 55,
      beamWidth: 12 + (lvl - 1) * 4,
      cooldown: Math.max(2.4, 4.2 - (lvl - 1) * 0.4)
    })
  },
  cluster: {
    id: 'cluster',
    name: 'CLUSTER FLAK',
    shortName: 'FLAK',
    icon: '💥',
    desc: 'Launches heavy kinetic shells that explode into a 360° ring of lethal shrapnel.',
    cost: 250,
    color: '#ff7700',
    secondaryColor: '#ffe600',
    maxLevel: 5,
    getCost: (lvl) => Math.round(110 * Math.pow(lvl, 1.4)),
    getStats: (lvl) => ({
      shellDamage: 60 + (lvl - 1) * 20,
      shrapnelCount: 8 + (lvl - 1) * 2,
      shrapnelDamage: 18 + (lvl - 1) * 6,
      cooldown: Math.max(2.0, 3.6 - (lvl - 1) * 0.35)
    })
  },
  vortex: {
    id: 'vortex',
    name: 'VOID VORTEX',
    shortName: 'VORTEX',
    icon: '🌀',
    desc: 'Deploys a swirling gravitational rift that shreds hazards and detonates.',
    cost: 450,
    color: '#9d00ff',
    secondaryColor: '#ff007f',
    maxLevel: 5,
    getCost: (lvl) => Math.round(140 * Math.pow(lvl, 1.45)),
    getStats: (lvl) => ({
      damage: 160 + (lvl - 1) * 60,
      radius: 45 + (lvl - 1) * 10,
      cooldown: Math.max(2.8, 4.8 - (lvl - 1) * 0.45)
    })
  }
};
