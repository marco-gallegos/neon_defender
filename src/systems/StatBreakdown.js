// Stat breakdown: explains *where every number comes from*.
//
// The `Player` constructor resolves final values in a single pass (base ship ×
// upgrades × equipment). That is correct for gameplay but opaque to the player,
// so this module recomputes the same pipeline while recording each contribution
// as a separate labelled line.
//
// Contract: `computeStatBreakdown(saveData)` must agree with the real `Player`
// resolved values (see `finalOf` / tests). If `Player` changes its math, update
// the matching entry here and the regression test will catch the drift.

import { SHIPS, UPGRADES, PRIMARY_WEAPONS, SECONDARY_WEAPONS } from './UpgradeSystem.js';
import { computeBonuses, findItem, equippedIds, EFFECT_TABLE } from './Equipment.js';

// Format a fractional bonus (0.25) as a signed percentage ('+25%').
function pct(v) {
  const n = Math.round(v * 100);
  return `${n >= 0 ? '+' : ''}${n}%`;
}

// A single contribution line: { label, value, detail, kind, stat }
// kind: 'base' | 'ship' | 'upgrade' | 'equipment' | 'drone' | 'total'
function line(label, value, kind, detail = '', stat = null) {
  return { label, value, kind, detail, stat };
}

const SHIP_STAT_LABELS = {
  speedMult: 'Move Speed',
  damageMult: 'Damage',
  shieldMult: 'Shield',
  shardBonus: 'Shard Gain'
};

/**
 * Build a full, itemized breakdown of the player's ship.
 *
 * @param {object} saveData - the persisted save object (equippedShip, upgrades,
 *   equippedEquipment, inventory, primary/secondary selections...).
 * @returns {{ groups: Array, equipment: Array, ship: object, summary: object }}
 */
export function computeStatBreakdown(saveData = {}) {
  const ship = SHIPS[saveData.equippedShip] || SHIPS.alpha_dart;
  const upg = saveData.upgrades || {};
  const eq = computeBonuses(saveData.equippedEquipment, saveData.inventory);

  // ---- List every equipped item so the panel can name the sources ----
  const equipment = [];
  for (const id of equippedIds(saveData.equippedEquipment)) {
    const item = findItem(saveData.inventory, id);
    if (item) equipment.push(item);
  }

  // Effects grouped by source id, so each stat can attribute contributions.
  const effectsBySource = equipment.map(item => ({
    item,
    effects: new Map((item.effects || []).map(e => [e.stat, e.value]))
  }));

  // Sum a bonus stat across all equipped items, returning itemized lines.
  const equipmentLines = (stat) =>
    effectsBySource
      .filter(s => s.effects.has(stat))
      .map(s => line(
        s.item.shortName || s.item.name,
        s.effects.get(stat),
        s.item.category === 'drone' ? 'drone' : 'equipment',
        `${s.item.tier} ${s.item.category}`,
        stat
      ));

  const groups = [];

  /* ---------------------------------------------------------------- *
   *  OFFENSE
   * ---------------------------------------------------------------- */
  const dmgLvl = upg.damage || 1;
  const baseDamageUpgrade = UPGRADES.damage.getValue(dmgLvl);
  const shipDamageMult = ship.stats?.damageMult ?? 1;

  const damageLines = [
    line(`Damage upgrade Lv${dmgLvl}`, baseDamageUpgrade, 'upgrade', '', 'damage'),
    line(`${ship.name} hull scaling`, shipDamageMult, 'ship', `×${shipDamageMult.toFixed(2)}`, 'damage')
  ];
  const damageAfterShip = baseDamageUpgrade * shipDamageMult;
  const eqDamage = eq.damage || 0;
  const eqDroneBuff = eq.droneBuff || 0;
  // Name every item that contributes damage (rather than one anonymous total).
  damageLines.push(...equipmentLines('damage'));
  if (eqDroneBuff) damageLines.push(line('Command aura (drones)', eqDroneBuff, 'drone', pct(eqDroneBuff), 'droneBuff'));
  const finalDamage = damageAfterShip * (1 + eqDamage) * (1 + eqDroneBuff);

  groups.push({
    id: 'damage',
    title: 'Damage per Shot',
    unit: '',
    lines: damageLines,
    // multiplicative pipeline — show the worked formula rather than a naive sum
    formula: `${baseDamageUpgrade.toFixed(1)} × ${shipDamageMult.toFixed(2)} × (1${eqDamage ? `+${eqDamage.toFixed(2)}` : ''}) × (1${eqDroneBuff ? `+${eqDroneBuff.toFixed(2)}` : ''})`,
    final: finalDamage,
    display: finalDamage.toFixed(1),
    parts: [
      { label: 'Ship', value: damageAfterShip },
      { label: 'Equipment', value: damageAfterShip * eqDamage },
      { label: 'Drones', value: damageAfterShip * (1 + eqDamage) * eqDroneBuff }
    ]
  });

  // Fire rate / shots per second
  const rateLvl = upg.fireRate || 1;
  const baseInterval = UPGRADES.fireRate.getValue(rateLvl);
  const shipSpeedMult = ship.stats?.speedMult ?? 1;
  const finalInterval = baseInterval / shipSpeedMult;
  groups.push({
    id: 'firerate',
    title: 'Fire Rate',
    unit: 'shots/s',
    lines: [
      line(`Fire-rate upgrade Lv${rateLvl}`, baseInterval, 'upgrade', `${baseInterval.toFixed(3)}s interval`),
      line(`${ship.name} speed scaling`, shipSpeedMult, 'ship', `÷${shipSpeedMult.toFixed(2)}`)
    ],
    formula: `1 / (${baseInterval.toFixed(3)}s ÷ ${shipSpeedMult.toFixed(2)})`,
    final: 1 / finalInterval,
    display: (1 / finalInterval).toFixed(2),
    parts: [
      { label: 'Ship', value: 1 / (baseInterval / shipSpeedMult) },
      { label: 'Equipment', value: 0 }
    ]
  });

  // Crit
  const critLvl = upg.crit || 1;
  const critData = UPGRADES.crit.getValue(critLvl);
  const critLines = [line(`Crit upgrade Lv${critLvl}`, critData.chance, 'upgrade', `${pct(critData.chance)} @ ×${critData.mult}`)];
  let critChance = critData.chance;
  if (ship.passiveId === 'emberfire') {
    critChance = Math.min(0.6, critChance + 0.08);
    critLines.push(line(`${ship.name} passive (Emberfire)`, 0.08, 'ship', pct(0.08)));
  }
  groups.push({
    id: 'crit',
    title: 'Critical Hit Chance',
    unit: '%',
    lines: critLines,
    formula: `min(60%, ${pct(critData.chance)}${ship.passiveId === 'emberfire' ? ' + 8%' : ''})`,
    final: critChance,
    display: `${Math.round(critChance * 100)}%`,
    parts: [
      { label: 'Ship', value: ship.passiveId === 'emberfire' ? 0.08 : 0 },
      { label: 'Upgrades', value: critData.chance }
    ]
  });

  // Extra shots / secondary weapon
  const gunEquip = equipment.filter(i => i.category === 'gun');
  const extraShots = eq.extraBullets || 0;
  const flame = eq.flameLevel || 0;
  const gunLines = [];
  for (const g of gunEquip) {
    for (const e of g.effects || []) {
      gunLines.push(line(`${g.shortName} (${g.tier})`, e.value, 'equipment', EFFECT_TABLE[e.stat]?.label || e.stat));
    }
  }
  const primDef = PRIMARY_WEAPONS[saveData.equippedPrimary || 'plasma'];
  const primName = primDef?.name || saveData.equippedPrimary || 'plasma';
  groups.push({
    id: 'weapon',
    title: 'Weapon Systems',
    unit: '',
    isList: true,
    lines: [
      line('Main gun', 0, 'base', primName),
      line('Secondary', 0, 'base', SECONDARY_WEAPONS[saveData.equippedSecondary || 'seeker']?.name || '—'),
      line('Extra mini-shots', extraShots, 'equipment', extraShots ? `+${extraShots} per volley` : 'none'),
      line('Flamethrower level', flame, 'equipment', flame ? `Lv${flame}` : 'none'),
      ...gunLines
    ],
    parts: [],
    final: extraShots + flame,
    display: `${extraShots + 1} proj`
  });

  /* ---------------------------------------------------------------- *
   *  SURVIVABILITY
   * ---------------------------------------------------------------- */
  const hullLvl = upg.hull || 1;
  const hullBase = UPGRADES.hull.getValue(hullLvl);
  const hpFinal = Math.round(hullBase * shipDamageMult);
  groups.push({
    id: 'hp',
    title: 'Max Hull (HP)',
    unit: 'HP',
    lines: [
      line(`Hull upgrade Lv${hullLvl}`, hullBase, 'upgrade'),
      line(`${ship.name} hull scaling`, shipDamageMult, 'ship', `×${shipDamageMult.toFixed(2)}`)
    ],
    formula: `${hullBase} × ${shipDamageMult.toFixed(2)}`,
    final: hpFinal,
    display: String(hpFinal),
    parts: [
      { label: 'Upgrades', value: hullBase },
      { label: 'Ship', value: hpFinal - hullBase }
    ]
  });

  const shieldLvl = upg.shield || 1;
  const shieldData = UPGRADES.shield.getValue(shieldLvl);
  const shieldShipMult = ship.stats?.shieldMult ?? 1;
  const shieldAfterShip = Math.round(shieldData.max * shieldShipMult);
  const eqShield = eq.shieldBonus || 0;
  const shieldFinal = Math.round(shieldAfterShip * (1 + eqShield));
  const shieldLines = [
    line(`Shield upgrade Lv${shieldLvl}`, shieldData.max, 'upgrade'),
    line(`${ship.name} shield scaling`, shieldShipMult, 'ship', `×${shieldShipMult.toFixed(2)}`)
  ];
  const shieldEqLines = equipmentLines('shieldBonus');
  shieldLines.push(...shieldEqLines);
  const guardDrones = eq.droneGuard || 0;
  const regenBase = shieldData.regenRate;
  const regenGuard = guardDrones * 1.5;
  shieldLines.push(line(`${shieldLvl > 0 ? 'Base' : ''} Shield regen`, regenBase, 'upgrade', `${regenBase}/s`));
  if (guardDrones) shieldLines.push(line('Guard drone regen', regenGuard, 'drone', `+${regenGuard}/s (${guardDrones} drone${guardDrones > 1 ? 's' : ''})`));
  groups.push({
    id: 'shield',
    title: 'Max Shield',
    unit: 'SH',
    lines: shieldLines,
    formula: `${shieldData.max} × ${shieldShipMult.toFixed(2)} × (1${eqShield ? `+${eqShield.toFixed(2)}` : ''})`,
    final: shieldFinal,
    display: String(shieldFinal),
    parts: [
      { label: 'Upgrades', value: shieldData.max },
      { label: 'Ship', value: shieldAfterShip - shieldData.max },
      { label: 'Equipment', value: shieldFinal - shieldAfterShip }
    ],
    extra: { label: 'Shield regen', display: `${(regenBase + regenGuard).toFixed(1)}/s` }
  });

  // Resistance / damage reduction
  let shipResist = 0;
  const resistLines = [];
  if (ship.passiveId === 'bulwark') {
    shipResist = 0.12;
    resistLines.push(line(`${ship.name} passive (Bulwark)`, 0.12, 'ship', pct(0.12)));
  }
  const eqResist = eq.resistance || 0;
  const resistEqLines = equipmentLines('resistance');
  resistLines.push(...resistEqLines);
  const finalResist = Math.min(0.7, shipResist + eqResist);
  groups.push({
    id: 'resistance',
    title: 'Damage Reduction',
    unit: '%',
    lines: resistLines.length ? resistLines : [line('No damage reduction sources', 0, 'base')],
    formula: `min(70%, ${pct(shipResist)}${eqResist ? ` + ${pct(eqResist)}` : ''})`,
    final: finalResist,
    display: pct(finalResist),
    parts: [
      { label: 'Ship', value: shipResist },
      { label: 'Equipment', value: finalResist - shipResist }
    ]
  });

  /* ---------------------------------------------------------------- *
   *  UTILITY
   * ---------------------------------------------------------------- */
  const magnetLvl = upg.magnet || 1;
  let magnetBase = UPGRADES.magnet.getValue(magnetLvl);
  const magnetLines = [line(`Magnet upgrade Lv${magnetLvl}`, magnetBase, 'upgrade', `${magnetBase}px`)];
  if (ship.passiveId === 'nimble') {
    const bonus = magnetBase * 0.15;
    magnetLines.push(line(`${ship.name} passive (Nimble)`, bonus, 'ship', '+15%'));
    magnetBase *= 1.15;
  }
  groups.push({
    id: 'magnet',
    title: 'Pickup Magnet Radius',
    unit: 'px',
    lines: magnetLines,
    final: magnetBase,
    display: `${Math.round(magnetBase)}px`,
    parts: [
      { label: 'Upgrades', value: UPGRADES.magnet.getValue(magnetLvl) },
      { label: 'Ship', value: magnetBase - UPGRADES.magnet.getValue(magnetLvl) }
    ]
  });

  const speedBonus = eq.speed || 0;
  const speedShip = ship.stats?.speedMult ?? 1;
  const speedLines = [line(`${ship.name} base`, speedShip, 'ship', `×${speedShip.toFixed(2)}`, 'speed')];
  speedLines.push(...equipmentLines('speed'));
  groups.push({
    id: 'speed',
    title: 'Movement Speed',
    unit: '%',
    lines: speedLines,
    formula: `${speedShip.toFixed(2)} × (1${speedBonus ? `+${speedBonus.toFixed(2)}` : ''})`,
    final: speedShip * (1 + speedBonus),
    display: `${Math.round(speedShip * (1 + speedBonus) * 100)}%`,
    parts: [
      { label: 'Ship', value: speedShip },
      { label: 'Equipment', value: speedShip * speedBonus }
    ]
  });

  const luckLines = equipmentLines('luck');
  groups.push({
    id: 'luck',
    title: 'Luck (drop quality)',
    unit: '%',
    lines: luckLines.length ? luckLines : [line('No luck sources', 0, 'base')],
    final: eq.luck || 0,
    display: pct(eq.luck || 0),
    parts: [{ label: 'Equipment', value: eq.luck || 0 }]
  });

  const scoreLines = equipmentLines('scoreBonus');
  groups.push({
    id: 'score',
    title: 'Score Bonus',
    unit: '%',
    lines: scoreLines.length ? scoreLines : [line('No score sources', 0, 'base')],
    final: eq.scoreBonus || 0,
    display: pct(eq.scoreBonus || 0),
    parts: [{ label: 'Equipment', value: eq.scoreBonus || 0 }]
  });

  /* ---------------------------------------------------------------- *
   *  COMPANIONS & SPECIAL EFFECTS  (counts, not scaling stats)
   * ---------------------------------------------------------------- */
  const droneUpg = upg.drones || 0;
  const droneAttack = eq.droneAttack || 0;
  const totalDrones = Math.min(6, droneUpg + droneAttack);
  groups.push({
    id: 'drones',
    title: 'Combat Drones',
    unit: '',
    isList: true,
    lines: [
      line('Drone upgrade', droneUpg, 'upgrade', `${droneUpg} orbital wingman`),
      ...equipmentLines('droneAttack'),
      line('Guard drones', guardDrones, 'drone', `${guardDrones} defensive`),
      line('Drones (capped)', totalDrones, 'total', 'max 6 attack drones')
    ],
    final: totalDrones,
    display: String(totalDrones),
    parts: []
  });

  const specialLines = [];
  if (eq.retaliate) specialLines.push(line('Retaliation burst', eq.retaliate, 'equipment', `${Math.round(eq.retaliate)} AoE damage when hit`));
  const pierceBonus = ship.passiveId === 'voidrounds' ? 1 : 0;
  if (pierceBonus) specialLines.push(line(`${ship.name} passive (Voidrounds)`, pierceBonus, 'ship', 'primary pierces +1 target'));
  if (ship.passiveId === 'nimble') specialLines.push(line(`${ship.name} passive (Nimble)`, 0, 'ship', 'smaller hitbox (r15)'));
  if (flame) specialLines.push(line('Flamethrower', flame, 'equipment', `Lv${flame} short-range stream`));
  groups.push({
    id: 'special',
    title: 'Special Effects',
    unit: '',
    isList: true,
    lines: specialLines.length ? specialLines : [line('No special effects equipped', 0, 'base')],
    final: 0,
    display: '—',
    parts: []
  });

  /* ---------------------------------------------------------------- *
   *  SUMMARY — only the multiplicative/source contributions requested
   * ---------------------------------------------------------------- */
  const summary = {
    ship,
    equipment,
    bonuses: eq,
    damage: { final: finalDamage, base: damageAfterShip, equipment: damageAfterShip * eqDamage, drones: damageAfterShip * (1 + eqDamage) * eqDroneBuff },
    hp: { final: hpFinal, base: hullBase, ship: hpFinal - hullBase },
    shield: { final: shieldFinal, base: shieldData.max, ship: shieldAfterShip - shieldData.max, equipment: shieldFinal - shieldAfterShip },
    resistance: { final: finalResist, ship: shipResist, equipment: finalResist - shipResist }
  };

  return { ship, groups, equipment, summary, isTrainingReady: true };
}
