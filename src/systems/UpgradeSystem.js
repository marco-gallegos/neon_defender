// Upgrade definitions, Ship profiles, and Progression Economy

export const SHIPS = {
  alpha_dart: {
    id: 'alpha_dart',
    name: 'ALPHA DART',
    desc: 'Agile balanced combat vessel with rapid plasma blasters.',
    cost: 0,
    color: '#00f0ff',
    secondaryColor: '#0066ff',
    stats: {
      speedMult: 1.0,
      damageMult: 1.0,
      shieldMult: 1.0,
      shardBonus: 1.0
    },
    perkText: 'Balanced & Responsive'
  },
  cyber_cube: {
    id: 'cyber_cube',
    name: 'CYBER CUBE',
    desc: 'Heavy geometric battle chassis with reinforced energy shields.',
    cost: 400,
    color: '#ffe600',
    secondaryColor: '#39ff14',
    stats: {
      speedMult: 0.9,
      damageMult: 1.1,
      shieldMult: 1.4,
      shardBonus: 1.1
    },
    perkText: '+40% Shield Capacity'
  },
  neon_phoenix: {
    id: 'neon_phoenix',
    name: 'NEON PHOENIX',
    desc: 'High-cadence assault fighter with twin thermal accelerators.',
    cost: 1200,
    color: '#ff007f',
    secondaryColor: '#ff7700',
    stats: {
      speedMult: 1.15,
      damageMult: 1.25,
      shieldMult: 0.95,
      shardBonus: 1.2
    },
    perkText: '+25% Rapid Fire & Speed'
  },
  void_slicer: {
    id: 'void_slicer',
    name: 'VOID SLICER',
    desc: 'Legendary cyber-hunter ship designed for maximum shard harvesting.',
    cost: 2500,
    color: '#9d00ff',
    secondaryColor: '#00f0ff',
    stats: {
      speedMult: 1.1,
      damageMult: 1.35,
      shieldMult: 1.15,
      shardBonus: 1.5
    },
    perkText: '+50% Shard Drops & High Crits'
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

export const SECTORS = [
  {
    id: 1,
    name: 'NEON OUTPOST',
    subtitle: 'Sector 1 - Beginner Patrol',
    waves: 8,
    rewardShards: 200,
    bossName: 'CUBIC GUARDIAN',
    bossHp: 800,
    color: '#00f0ff'
  },
  {
    id: 2,
    name: 'CYBER ASTEROIDS',
    subtitle: 'Sector 2 - Swarm Density',
    waves: 10,
    rewardShards: 350,
    bossName: 'PRISM PULSAR',
    bossHp: 1600,
    color: '#ffe600'
  },
  {
    id: 3,
    name: 'VORTEX CORE',
    subtitle: 'Sector 3 - High Intensity',
    waves: 12,
    rewardShards: 600,
    bossName: 'HEXA TYRANT',
    bossHp: 2800,
    color: '#ff007f'
  },
  {
    id: 4,
    name: 'HYPERION LABS',
    subtitle: 'Sector 4 - Laser Grid Lockdown',
    waves: 14,
    rewardShards: 900,
    bossName: 'OCTAGON OVERLORD',
    bossHp: 4400,
    color: '#9d00ff'
  },
  {
    id: 5,
    name: 'OMEGA SINGULARITY',
    subtitle: 'Sector 5 - Final Stand',
    waves: 16,
    rewardShards: 1500,
    bossName: 'CHRONOS PRIME',
    bossHp: 6800,
    color: '#39ff14'
  }
];

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
      damage: 28 + (lvl - 1) * 12,
      count: 4 + (lvl >= 3 ? 2 : 0) + (lvl >= 5 ? 2 : 0), // 4 -> 6 -> 8 missiles
      cooldown: Math.max(1.8, 3.2 - (lvl - 1) * 0.32)
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
