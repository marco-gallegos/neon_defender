// Save Transfer — export / import a save as portable, human-readable JSON.
//
// The goal: move your progress between phones, computers or browsers without
// losing anything. The format is a small, self-describing JSON envelope:
//
//   {
//     "format": "neon-defender-save",
//     "version": 1,
//     "savedAt": "2026-10-19T18:00:00.000Z",
//     "game": "Neon Defender",
//     "data": { ...the save object... }
//   }
//
// Import is deliberately forgiving: it accepts the envelope above, a bare
// save object, or a file that was downloaded from an older build. Whatever
// comes in is pushed through `sanitizeSaveData()`, the same validation gate
// used when loading from LocalStorage, so a bad import can never corrupt the
// running game.

import { sanitizeSaveData } from './Storage.js';

export const SAVE_FORMAT = 'neon-defender-save';
export const SAVE_VERSION = 1;
export const SAVE_FILE_PREFIX = 'neon-defender-save';

/* ------------------------------------------------------------------ *
 *  BUILD / SERIALIZE
 * ------------------------------------------------------------------ */

/**
 * Wrap a save object in the portable envelope.
 * @param {object} saveData
 * @returns {object} envelope
 */
export function buildEnvelope(saveData) {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    game: 'Neon Defender',
    data: saveData && typeof saveData === 'object' ? saveData : {}
  };
}

/**
 * Serialize a save to a pretty-printed JSON string (easy to read & diff).
 * @param {object} saveData
 * @returns {string}
 */
export function serializeSave(saveData) {
  return JSON.stringify(buildEnvelope(saveData), null, 2);
}

/**
 * Suggest a filename for a downloaded save.
 * @param {object} saveData
 * @returns {string}
 */
export function saveFilename(saveData) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  const shards = Number(saveData?.shards) || 0;
  return `${SAVE_FILE_PREFIX}-${stamp}-${shards}shards.json`;
}

/* ------------------------------------------------------------------ *
 *  PARSE / VALIDATE
 * ------------------------------------------------------------------ */

/**
 * Parse and validate save text.
 *
 * @param {string} text - JSON text (pasted, read from a file, or shared)
 * @returns {{ok: boolean, saveData: object|null, meta: object, error: string|null}}
 */
export function parseSave(text) {
  const raw = typeof text === 'string' ? text.trim() : '';
  if (!raw) {
    return { ok: false, saveData: null, meta: {}, error: 'Nothing to import — the text is empty.' };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, saveData: null, meta: {}, error: `Not valid JSON: ${e.message}` };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, saveData: null, meta: {}, error: 'The file does not contain a save object.' };
  }

  // --- Unwrap the envelope (or accept a bare save) ---
  let data = parsed;
  const meta = {
    format: null,
    version: null,
    savedAt: null,
    enveloped: false
  };

  if (parsed.format === SAVE_FORMAT) {
    meta.format = parsed.format;
    meta.version = Number.isFinite(parsed.version) ? parsed.version : null;
    meta.savedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : null;
    meta.enveloped = true;
    if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
      return { ok: false, saveData: null, meta, error: 'The save envelope has no "data" section.' };
    }
    data = parsed.data;
  } else if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
    // An envelope from a future/unknown build that still nests under "data".
    meta.enveloped = true;
    data = parsed.data;
  }

  // --- Sanitize: the same validation gate the game itself uses ---
  const saveData = sanitizeSaveData(data);

  // --- Sanity check: a valid save must at least look like one ---
  const looksLikeSave =
    typeof saveData.shards === 'number' ||
    Array.isArray(saveData.inventory) ||
    (saveData.upgrades && typeof saveData.upgrades === 'object');
  if (!looksLikeSave) {
    return { ok: false, saveData: null, meta, error: 'This JSON does not look like a Neon Defender save.' };
  }

  return { ok: true, saveData, meta, error: null };
}

/**
 * Summarise a save for display (so people can verify before importing).
 * @param {object} saveData
 * @returns {{shards:number, crystals:number, ships:number, sectors:number, gear:number, arenaWave:number, inventory:number}}
 */
export function summarizeSave(saveData) {
  const s = saveData || {};
  const sectors = s.sectors && typeof s.sectors === 'object'
    ? Object.values(s.sectors).filter(x => x && x.unlocked).length
    : 0;
  return {
    shards: Number(s.shards) || 0,
    crystals: Number(s.crystals) || 0,
    ships: Array.isArray(s.unlockedShips) ? s.unlockedShips.length : 0,
    sectors,
    inventory: Array.isArray(s.inventory) ? s.inventory.length : 0,
    arenaWave: Number(s.arenaStats?.bestWave) || 0
  };
}

/**
 * One-line human summary of a save.
 * @param {object} saveData
 * @returns {string}
 */
export function describeSave(saveData) {
  const s = summarizeSave(saveData);
  return `${s.shards.toLocaleString()} ◆ · ${s.crystals.toLocaleString()} ◆◆ · ` +
    `${s.ships} ship${s.ships === 1 ? '' : 's'} · ${s.sectors} sector${s.sectors === 1 ? '' : 's'} · ` +
    `${s.inventory} item${s.inventory === 1 ? '' : 's'} · arena best wave ${s.arenaWave}`;
}

/* ------------------------------------------------------------------ *
 *  BROWSER TRANSFER HELPERS
 * ------------------------------------------------------------------ */

/**
 * Copy text to the clipboard. Falls back to a hidden textarea + execCommand
 * for browsers/contexts where the async Clipboard API is unavailable.
 *
 * @param {string} text
 * @returns {Promise<boolean>} whether the copy succeeded
 */
export async function copyText(text) {
  const value = String(text ?? '');
  if (!value) return false;
  try {
    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (e) {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

/**
 * Read text from the clipboard (requires a user gesture + secure context).
 * @returns {Promise<string>} clipboard text, or '' when unavailable
 */
export async function readClipboard() {
  try {
    if (navigator?.clipboard?.readText && window.isSecureContext) {
      return await navigator.clipboard.readText();
    }
  } catch (e) {
    return '';
  }
  return '';
}

/**
 * Trigger a file download containing the save JSON.
 * @param {string} json
 * @param {string} filename
 * @returns {boolean} whether the download was started
 */
export function downloadSave(json, filename) {
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${SAVE_FILE_PREFIX}.json`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Give the browser a moment to start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Open the native share sheet (mobile) with the save JSON.
 * @param {string} json
 * @param {string} title
 * @returns {Promise<boolean>} whether the share sheet was opened
 */
export async function shareSave(json, title = 'Neon Defender Save') {
  try {
    if (!navigator?.share) return false;
    await navigator.share({ title, text: json });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Whether the platform offers a native share sheet.
 * @returns {boolean}
 */
export function canShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Read a File object's contents as text.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('No file selected')); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read the file'));
    reader.readAsText(file);
  });
}
