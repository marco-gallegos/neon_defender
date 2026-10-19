// Equipment System: tiers, categories, templates, drops, bonuses & fusion economy
// All values are deterministic given an item instance; generation uses Math.random.

/* ------------------------------------------------------------------ *
 *  TIERS
 * ------------------------------------------------------------------ */
export const TIERS = ['C', 'B', 'A', 'S', 'S+'];

export const TIER_META = {
  C:  { tier: 'C',  label: 'C',  color: '#9aa4c7', power: 1.0, substats: 1, ring: '#5a6485' },
  B:  { tier: 'B',  label: 'B',  color: '#39ff14', power: 1.7, substats: 1, ring: '#1f8f0c' },
  A:  { tier: 'A',  label: 'A',  color: '#00b3ff', power: 2.6, substats: 2, ring: '#0068a8' },
  S:  { tier: 'S',  label: 'S',  color: '#ffb300', power: 4.0, substats: 2, ring: '#a86f00' },
  // S+ is obtainable ONLY by fusing two S items — never dropped or sold.
  'S+': { tier: 'S+', label: 'S+', color: '#ff2fb0', power: 5.4, substats: 3, ring: '#a3006e', mergeOnly: true }
};

/* ------------------------------------------------------------------ *
 *  CATEGORIES (fixed loadout slots)
 * ------------------------------------------------------------------ */
export const CATEGORIES = {
  shield:   { id: 'shield',   name: 'Shield',   icon: '🛡️', slots: 1, color: '#00aaff' },
  gun:      { id: 'gun',      name: 'Gun Mod',  icon: '🔫', slots: 1, color: '#ff7700' },
  material: { id: 'material', name: 'Material', icon: '⚙️', slots: 2, color: '#39ff14' },
  drone:    { id: 'drone',    name: 'Drone',    icon: '🛸', slots: 2, color: '#9d00ff' },
  skin:     { id: 'skin',     name: 'Skin',     icon: '🎨', slots: 1, color: '#ff007f' }
};

export const EQUIP_SLOTS = Object.fromEntries(
  Object.values(CATEGORIES).map(c => [c.id, c.slots])
);

/* ------------------------------------------------------------------ *
 *  EFFECTS
 * ------------------------------------------------------------------ */
export const EFFECT_TABLE = {
  damage:       { label: 'Damage',        base: 0.06, kind: 'pct' },
  speed:        { label: 'Move Speed',    base: 0.05, kind: 'pct' },
  resistance:   { label: 'Resistance',    base: 0.035, kind: 'pct' },
  luck:         { label: 'Luck',          base: 0.08, kind: 'pct' },
  shieldBonus:  { label: 'Shield Power',  base: 0.09, kind: 'pct' },
  retaliate:    { label: 'Retaliation',   base: 14,   kind: 'flat' },
  extraBullets: { label: 'Extra Shots',   base: 1,    kind: 'count' },
  flameLevel:   { label: 'Flamethrower',  base: 1,    kind: 'count' },
  droneAttack:  { label: 'Strike Drones', base: 1,    kind: 'count' },
  droneGuard:   { label: 'Guard Drones',  base: 1,    kind: 'count' },
  droneBuff:    { label: 'Command Aura',  base: 0.05, kind: 'pct' },
  scoreBonus:   { label: 'Score Bonus',   base: 0.06, kind: 'pct' }
};

export const EFFECT_CAPS = {
  damage: 0.6,
  speed: 0.5,
  resistance: 0.6,
  luck: 2.0,
  shieldBonus: 1.0,
  retaliate: 120,
  extraBullets: 2,
  flameLevel: 3,
  droneAttack: 3,
  droneGuard: 2,
  droneBuff: 0.5,
  scoreBonus: 1.0
};

/* ------------------------------------------------------------------ *
 *  TEMPLATES
 * ------------------------------------------------------------------ */
export const EQUIPMENT_TEMPLATES = [
  // --- SHIELDS ---
  { id: 'shield_bastion', category: 'shield', name: 'Bastion Plating', shortName: 'BASTION', icon: '🛡️',
    desc: 'Reinforced barrier that dramatically boosts shield capacity.',
    primary: 'shieldBonus', primaryScale: 1.5, substats: ['resistance', 'retaliate'] },
  { id: 'shield_retaliator', category: 'shield', name: 'Retaliator Core', shortName: 'RETALIATOR', icon: '⚡',
    desc: 'Discharges a violent shockwave into nearby foes when you are hit.',
    primary: 'retaliate', primaryScale: 1.3, substats: ['resistance', 'shieldBonus'] },
  { id: 'shield_aegis', category: 'shield', name: 'Aegis Field', shortName: 'AEGIS', icon: '🔰',
    desc: 'Dampens incoming damage with a hardened energy field.',
    primary: 'resistance', primaryScale: 1.4, substats: ['shieldBonus', 'retaliate'] },

  // --- GUN MODS ---
  { id: 'gun_swarm', category: 'gun', name: 'Swarm Injector', shortName: 'SWARM', icon: '🐝',
    desc: 'Adds extra mini-projectiles to every main-gun volley.',
    primary: 'extraBullets', primaryScale: 1.0, substats: ['damage', 'speed'] },
  { id: 'gun_flame', category: 'gun', name: 'Incinerator Nozzle', shortName: 'FLAME', icon: '🔥',
    desc: 'Straps a short-range flamethrower alongside your main gun.',
    primary: 'flameLevel', primaryScale: 1.0, substats: ['damage', 'luck'] },
  { id: 'gun_overcharge', category: 'gun', name: 'Overcharge Coil', shortName: 'OVERCHARGE', icon: '💥',
    desc: 'Overclocks shot impact damage to punishing levels.',
    primary: 'damage', primaryScale: 1.5, substats: ['extraBullets', 'speed'] },

  // --- MATERIALS ---
  { id: 'mat_engine', category: 'material', name: 'Ion Engine', shortName: 'ENGINE', icon: '🚀',
    desc: 'Lightweight thruster array for faster repositioning.',
    primary: 'speed', primaryScale: 1.5, substats: ['luck', 'resistance'] },
  { id: 'mat_alloy', category: 'material', name: 'Hardened Alloy', shortName: 'ALLOY', icon: '⛓️',
    desc: 'Weaponized hull alloy: more bite, more resilience.',
    primary: 'damage', primaryScale: 1.5, substats: ['resistance', 'shieldBonus'] },
  { id: 'mat_fortune', category: 'material', name: 'Fortune Circuit', shortName: 'FORTUNE', icon: '🍀',
    desc: 'Salvage heuristics that improve drops and shard yield.',
    primary: 'luck', primaryScale: 1.5, substats: ['speed', 'damage'] },

  // --- DRONES ---
  { id: 'drone_strike', category: 'drone', name: 'Strike Drone', shortName: 'STRIKE', icon: '🛸',
    desc: 'Adds an autonomous orbiting drone that fires on enemies.',
    primary: 'droneAttack', primaryScale: 1.0, substats: ['damage', 'speed'] },
  { id: 'drone_bulwark', category: 'drone', name: 'Bulwark Drone', shortName: 'BULWARK', icon: '🛰️',
    desc: 'Defensive drone that reinforces your shield regeneration.',
    primary: 'droneGuard', primaryScale: 1.0, substats: ['resistance', 'shieldBonus'] },
  { id: 'drone_command', category: 'drone', name: 'Command Drone', shortName: 'COMMAND', icon: '📡',
    desc: 'Support drone that projects a damage-buffing command aura.',
    primary: 'droneBuff', primaryScale: 1.4, substats: ['luck', 'speed'] },

  // --- SKINS ---
  { id: 'skin_winter', category: 'skin', name: 'Winter Gadget', shortName: 'WINTER', icon: '❄️',
    desc: 'Festive frost kit. Snow trail + a dash of luck.',
    primary: 'luck', primaryScale: 1.2, substats: ['resistance'],
    skin: { icon: '❄️', accent: '#7df9ff', trail: '#bfefff' } },
  { id: 'skin_spooky', category: 'skin', name: 'Spooky Gadget', shortName: 'SPOOKY', icon: '🎃',
    desc: 'Haunted cockpit decor. Pumpkin glow + score bonus.',
    primary: 'scoreBonus', primaryScale: 1.3, substats: ['luck'],
    skin: { icon: '🎃', accent: '#ff7700', trail: '#ffb366' } },
  { id: 'skin_neon', category: 'skin', name: 'Neon Trails', shortName: 'NEON', icon: '🌈',
    desc: 'Rainbow exhaust ribbons. Slightly quicker chassis.',
    primary: 'speed', primaryScale: 1.2, substats: ['damage'],
    skin: { icon: '🌈', accent: '#ff007f', trail: '#ff7ad9' } },
  { id: 'skin_chrome', category: 'skin', name: 'Chrome Finish', shortName: 'CHROME', icon: '🪙',
    desc: 'Mirror-polished hull plating. Minor damage dampening.',
    primary: 'resistance', primaryScale: 1.2, substats: ['shieldBonus'],
    skin: { icon: '🪙', accent: '#c0c8d8', trail: '#e8eefc' } }
];

const TEMPLATES_BY_ID = Object.fromEntries(EQUIPMENT_TEMPLATES.map(t => [t.id, t]));
const TEMPLATES_BY_CATEGORY = EQUIPMENT_TEMPLATES.reduce((acc, t) => {
  (acc[t.category] = acc[t.category] || []).push(t);
  return acc;
}, {});

export function getTemplate(defId) {
  return TEMPLATES_BY_ID[defId] || null;
}

/* ------------------------------------------------------------------ *
 *  VALUE RESOLUTION
 * ------------------------------------------------------------------ */
export function resolveValue(stat, scale, tier) {
  const eff = EFFECT_TABLE[stat];
  if (!eff) return 0;
  const meta = TIER_META[tier] || TIER_META.C;
  let value;
  if (eff.kind === 'count') {
    value = (tier === 'A' || tier === 'S' || tier === 'S+') ? 2 : 1;
  } else {
    value = eff.base * scale * meta.power;
  }
  const cap = EFFECT_CAPS[stat];
  if (cap != null) value = Math.min(value, cap);
  if (eff.kind === 'count') return Math.round(value);
  return Math.round(value * 1000) / 1000;
}

export function formatEffect(stat, value) {
  const eff = EFFECT_TABLE[stat];
  if (!eff) return `${stat} ${value}`;
  if (eff.kind === 'pct') return `${eff.label} +${Math.round(value * 100)}%`;
  if (eff.kind === 'count') return `${eff.label} +${Math.round(value)}`;
  return `${eff.label} +${Math.round(value)}`;
}

/* ------------------------------------------------------------------ *
 *  GENERATION
 * ------------------------------------------------------------------ */
let idCounter = 0;
export function generateEquipmentId() {
  idCounter = (idCounter + 1) % 1000000;
  return `eq_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.floor(Math.random() * 46656).toString(36)}`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateEquipment(category, tier) {
  const pool = TEMPLATES_BY_CATEGORY[category] || TEMPLATES_BY_CATEGORY.material;
  const tpl = pick(pool);
  const meta = TIER_META[tier] || TIER_META.C;

  const effects = [{ stat: tpl.primary, value: resolveValue(tpl.primary, tpl.primaryScale ?? 1.4, tier) }];

  const subPool = shuffle(tpl.substats || []);
  for (let i = 0; i < Math.min(meta.substats, subPool.length); i++) {
    const stat = subPool[i];
    const value = resolveValue(stat, 0.75, tier);
    if (value > 0) effects.push({ stat, value });
  }

  return {
    id: generateEquipmentId(),
    defId: tpl.id,
    category: tpl.category,
    tier,
    name: tpl.name,
    shortName: tpl.shortName,
    icon: tpl.icon,
    desc: tpl.desc,
    skin: tpl.skin || null,
    effects,
    fused: false,
    createdAt: Date.now()
  };
}

/* ------------------------------------------------------------------ *
 *  DROP ROLLS
 * ------------------------------------------------------------------ */
// progress: 0 (start of game) .. 1 (endgame). isBoss guarantees a drop + better tiers.
export function tierWeights(progress, isBoss = false) {
  const p = Math.max(0, Math.min(1, progress));
  let c = Math.max(5, 95 - p * 78);
  let b = 4 + p * 34;
  let a = Math.max(0.2, p * 30 - 2);
  let s = Math.max(0, p * 16 - 7);
  if (isBoss) {
    c *= 0.25;
    b *= 1.15;
    a *= 1.7;
    s *= 2.0;
  }
  const total = c + b + a + s;
  return { C: c / total, B: b / total, A: a / total, S: s / total };
}

export function rollTier(progress, isBoss = false) {
  const w = tierWeights(progress, isBoss);
  const r = Math.random();
  let acc = 0;
  // S+ is merge-only: roll over the droppable base tiers only.
  for (const t of ['C', 'B', 'A', 'S']) {
    acc += w[t];
    if (r <= acc) return t;
  }
  return 'C';
}

export function randomCategory() {
  const cats = Object.keys(TEMPLATES_BY_CATEGORY);
  return pick(cats);
}

export function rollEquipmentDrop({ progress = 0, luckMult = 1, isBoss = false } = {}) {
  const chance = isBoss ? 1.0 : Math.min(0.6, 0.085 * Math.max(0.2, luckMult));
  if (!isBoss && Math.random() > chance) return null;
  const tier = rollTier(progress, isBoss);
  return generateEquipment(randomCategory(), tier);
}

// Crystals dropped from enemies (small) and bosses (larger).
export function rollCrystalDrop({ progress = 0, luckMult = 1, isBoss = false } = {}) {
  if (isBoss) {
    return { amount: 8 + Math.round(progress * 30), chance: 1 };
  }
  const chance = Math.min(0.35, 0.06 * Math.max(0.2, luckMult));
  if (Math.random() > chance) return null;
  const amount = Math.random() < 0.15 ? 3 : 1;
  return { amount };
}

/* ------------------------------------------------------------------ *
 *  BONUS AGGREGATION
 * ------------------------------------------------------------------ */
export function emptyBonuses() {
  return {
    damage: 0, speed: 0, resistance: 0, luck: 0, shieldBonus: 0,
    retaliate: 0, extraBullets: 0, flameLevel: 0,
    droneAttack: 0, droneGuard: 0, droneBuff: 0, scoreBonus: 0,
    skin: null
  };
}

export function findItem(inventory, id) {
  if (!id || !Array.isArray(inventory)) return null;
  return inventory.find(it => it && it.id === id) || null;
}

export function equippedIds(equipped) {
  if (!equipped) return [];
  const ids = [];
  for (const cat of Object.keys(EQUIP_SLOTS)) {
    const val = equipped[cat];
    if (Array.isArray(val)) ids.push(...val.filter(Boolean));
    else if (val) ids.push(val);
  }
  return ids;
}

export function computeBonuses(equipped, inventory) {
  const bonuses = emptyBonuses();
  const ids = equippedIds(equipped);
  for (const id of ids) {
    const item = findItem(inventory, id);
    if (!item) continue;
    for (const eff of item.effects || []) {
      if (bonuses[eff.stat] == null) continue;
      bonuses[eff.stat] += eff.value;
    }
    if (item.category === 'skin' && item.skin) {
      bonuses.skin = item.skin;
    }
  }
  // Apply caps
  if (bonuses.resistance > EFFECT_CAPS.resistance) bonuses.resistance = EFFECT_CAPS.resistance;
  if (bonuses.damage > EFFECT_CAPS.damage) bonuses.damage = EFFECT_CAPS.damage;
  if (bonuses.speed > EFFECT_CAPS.speed) bonuses.speed = EFFECT_CAPS.speed;
  if (bonuses.shieldBonus > EFFECT_CAPS.shieldBonus) bonuses.shieldBonus = EFFECT_CAPS.shieldBonus;
  if (bonuses.droneBuff > EFFECT_CAPS.droneBuff) bonuses.droneBuff = EFFECT_CAPS.droneBuff;
  return bonuses;
}

/* ------------------------------------------------------------------ *
 *  ECONOMY: disassemble / tier-up / S+S fusion
 * ------------------------------------------------------------------ */
export const CRYSTAL_VALUE = { C: 1, B: 4, A: 12, S: 30, 'S+': 90 };

export function disassembleValue(item) {
  if (!item) return 0;
  return CRYSTAL_VALUE[item.tier] || 1;
}

export function tierUpRequirement(tier) {
  switch (tier) {
    case 'C': return { nextTier: 'B', shards: 400, crystals: 8, duplicates: 1 };
    case 'B': return { nextTier: 'A', shards: 1500, crystals: 25, duplicates: 1 };
    case 'A': return { nextTier: 'S', shards: 5000, crystals: 70, duplicates: 2 };
    default: return null; // S is max base tier
  }
}

export const S_FUSION_COST = { shards: 25000, crystals: 150 };

// Given a target item + inventory, find duplicate materials of same category+tier.
export function findDuplicates(inventory, target, count) {
  if (!target || !Array.isArray(inventory)) {
    return [];
  }
  return inventory
    .filter(it => it && it.id !== target.id && it.category === target.category && it.tier === target.tier)
    .slice(0, count);
}

// Fuse two S-tier items of the same category into one S+ with both effect sets.
// The result gets a 1.25x fusion multiplier so it beats either input alone.
export function fuseSSItems(a, b) {
  const FUSION_BONUS = 1.25;
  const effects = [];
  const seen = new Set();
  for (const eff of [...(a.effects || []), ...(b.effects || [])]) {
    const key = eff.stat;
    if (seen.has(key)) {
      // stack same-stat effects, then apply the fusion multiplier once
      const existing = effects.find(e => e.stat === key);
      if (existing) existing.value = existing.value + eff.value;
    } else {
      effects.push({ stat: eff.stat, value: eff.value });
      seen.add(key);
    }
  }
  for (const e of effects) {
    e.value = Math.round(e.value * FUSION_BONUS * 1000) / 1000;
  }
  return {
    id: generateEquipmentId(),
    defId: `${a.defId}+${b.defId}`,
    category: a.category,
    tier: 'S+',
    name: `${a.shortName} × ${b.shortName}`,
    shortName: 'FUSED',
    icon: a.icon,
    desc: `Fused dual-effect ${CATEGORIES[a.category]?.name || 'gear'} — combines ${a.name} and ${b.name}.`,
    skin: a.skin || b.skin || null,
    effects,
    fused: true,
    createdAt: Date.now()
  };
}

/* ------------------------------------------------------------------ *
 *  STORE STOCK (premium, very expensive)
 * ------------------------------------------------------------------ */
export const STORE_TIERS = {
  C: { shards: 900, crystals: 0 },
  B: { shards: 3500, crystals: 6 },
  A: { shards: 12000, crystals: 22 },
  S: { shards: 40000, crystals: 90 }
};

export function generateStoreStock(count = 4) {
  const tiers = ['C', 'B', 'A', 'S'];
  return Array.from({ length: count }, () => {
    const tier = pick(tiers);
    const item = generateEquipment(randomCategory(), tier);
    return { item, price: STORE_TIERS[tier] };
  });
}
