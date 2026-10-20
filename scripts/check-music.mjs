// Music pattern sanity checker — run after editing TRACKS/SEQUENCES in Audio.js
// Usage: node scripts/check-music.mjs  (or: npm run check:music)
import { TRACKS, SEQUENCES } from '../src/engine/Audio.js';

const STEPS = 64;
const DRUM_TOKENS = new Set(['k', 's', 'h', 'o', 't', 'c']);
const VOICES = ['bass', 'lead', 'arp'];

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

const checkPitchPattern = (where, voice, pattern) => {
  if (!Array.isArray(pattern)) return fail(where, 'pattern is not an array');
  if (pattern.length !== STEPS) fail(where, `expected ${STEPS} steps, got ${pattern.length}`);
  pattern.forEach((step, i) => {
    const notes = Array.isArray(step) ? step : [step];
    if (notes.length === 0) return fail(where, `step ${i} is an empty chord`);
    for (const n of notes) {
      if (typeof n !== 'number' || !Number.isFinite(n)) fail(where, `step ${i} is not a MIDI number`);
      else if (n !== 0 && (n < 1 || n > 127)) fail(where, `step ${i} MIDI out of range: ${n}`);
    }
  });
};

const checkDrumPattern = (where, pattern) => {
  if (!Array.isArray(pattern)) return fail(where, 'pattern is not an array');
  if (pattern.length !== STEPS) fail(where, `expected ${STEPS} steps, got ${pattern.length}`);
  pattern.forEach((step, i) => {
    if (typeof step !== 'string') return fail(where, `step ${i} is not a string token`);
    for (const ch of step) {
      if (!DRUM_TOKENS.has(ch)) fail(where, `step ${i} has unknown drum token '${ch}' (in '${step}')`);
    }
  });
};

for (const [id, track] of Object.entries(TRACKS)) {
  const where = `TRACKS.${id}`;
  if (!Number.isFinite(track.bpm) || track.bpm <= 0) fail(where, 'missing/invalid bpm');
  for (const voice of VOICES) {
    if (track[voice]) checkPitchPattern(`${where}.${voice}`, voice, track[voice].pattern);
  }
  if (track.drums) checkDrumPattern(`${where}.drums`, track.drums.pattern);
  if (!VOICES.some((v) => track[v]) && !track.drums) fail(where, 'track has no voices');
}

for (const [id, seq] of Object.entries(SEQUENCES)) {
  const where = `SEQUENCES.${id}`;
  // One-shot sequences are time-based: { notes: [{at,len,m|chord,wave,gain}], drums: [{at,d}] }
  if (!Array.isArray(seq.notes) || seq.notes.length === 0) {
    fail(where, 'missing/empty notes array');
  } else {
    seq.notes.forEach((n, i) => {
      if (!Number.isFinite(n.at) || n.at < 0) fail(`${where}.notes[${i}]`, `invalid at: ${n.at}`);
      if (!Number.isFinite(n.len) || n.len <= 0) fail(`${where}.notes[${i}]`, `invalid len: ${n.len}`);
      const notes = n.chord || [n.m];
      if (notes.length === 0 || notes.some((m) => !Number.isFinite(m) || m < 1 || m > 127)) {
        fail(`${where}.notes[${i}]`, 'missing/invalid MIDI note (m or chord)');
      }
      if (!Number.isFinite(n.gain) || n.gain <= 0) fail(`${where}.notes[${i}]`, `invalid gain: ${n.gain}`);
    });
  }
  if (!Array.isArray(seq.drums) || seq.drums.length === 0) {
    fail(where, 'missing/empty drums array');
  } else {
    seq.drums.forEach((hit, i) => {
      if (!Number.isFinite(hit.at) || hit.at < 0) fail(`${where}.drums[${i}]`, `invalid at: ${hit.at}`);
      if (typeof hit.d !== 'string' || [...hit.d].some((ch) => !DRUM_TOKENS.has(ch))) {
        fail(`${where}.drums[${i}]`, `invalid drum token: ${hit.d}`);
      }
    });
  }
}

// Report
const rows = Object.entries(TRACKS).map(([id, t]) => {
  const voices = VOICES.filter((v) => t[v]).join('+') + (t.drums ? '+drums' : '');
  return `  ${id.padEnd(14)} ${String(t.bpm).padStart(4)} BPM  ${voices}`;
});
console.log(`Loop tracks (${Object.keys(TRACKS).length}):\n${rows.join('\n')}`);
console.log(`Sequences (${Object.keys(SEQUENCES).length}): ${Object.keys(SEQUENCES).join(', ')}`);

if (errors.length) {
  console.error(`\n${errors.length} pattern error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nAll music patterns OK.');
