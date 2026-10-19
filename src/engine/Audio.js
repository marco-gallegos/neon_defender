// Procedural Web Audio API sound synthesis and dynamic chiptune synth engine
//
// =====================================================================
// Chiptune music engine — data-driven track registry
// ---------------------------------------------------------------------
// Patterns are arrays of 16th-note steps (4 bars = 64 steps).
// Note steps:  MIDI number (0 = rest) or an array of MIDI numbers (chord).
// Drum steps:  '' rest | 'k' kick | 's' snare | 'h' closed hat
//              | 'o' open hat | 't' tom | 'c' crash ('ks' = kick+snare)
// All melodies are original compositions in the style of classic arcade
// run-'em-up soundtracks (Metal Slug, Contra, Castlevania, Streets of
// Rage, Mega Man, Sonic, Gradius). Zero audio assets — pure synthesis.
// =====================================================================

const mtof = (m) => (m > 0 ? 440 * Math.pow(2, (m - 69) / 12) : 0);

// Repeating 4-note cell across a full bar (16 steps) — harpsichord arps
const arpCell = (a, b, c, d) => [a, b, c, d, a, b, c, d, a, b, c, d, a, b, c, d];

export const TRACKS = {
  // "Chrome Racer" — bright Sonic-style menu/attract theme (C major, 145 BPM)
  menu: {
    bpm: 145,
    bass: {
      wave: 'square', cutoff: 700, gain: 0.05, decay: 0.12,
      pattern: [
        // C (bouncy offbeat)
        0, 0, 36, 0, 0, 0, 48, 0, 0, 0, 36, 0, 0, 0, 48, 0,
        // G
        0, 0, 43, 0, 0, 0, 55, 0, 0, 0, 43, 0, 0, 0, 55, 43,
        // Am
        0, 0, 45, 0, 0, 0, 57, 0, 0, 0, 45, 0, 0, 0, 57, 0,
        // F
        0, 0, 41, 0, 0, 0, 53, 0, 0, 0, 41, 0, 0, 43, 45, 0
      ]
    },
    arp: {
      wave: 'square', cutoff: 2200, gain: 0.016, decay: 0.1,
      pattern: [
        60, 0, 64, 0, 67, 0, 64, 0, 72, 0, 67, 0, 64, 0, 67, 0,
        59, 0, 62, 0, 67, 0, 62, 0, 71, 0, 67, 0, 62, 0, 67, 0,
        57, 0, 60, 0, 64, 0, 60, 0, 69, 0, 64, 0, 60, 0, 64, 0,
        57, 0, 60, 0, 65, 0, 60, 0, 69, 0, 65, 0, 60, 0, 65, 0
      ]
    },
    lead: {
      wave: 'square', gain: 0.028, decay: 0.16,
      pattern: [
        76, 0, 0, 79, 0, 0, 84, 0, 0, 79, 0, 0, 76, 0, 0, 0,
        74, 0, 0, 79, 0, 0, 83, 0, 0, 79, 0, 0, 74, 0, 0, 0,
        72, 0, 0, 76, 0, 0, 81, 0, 0, 76, 0, 0, 72, 0, 0, 0,
        77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 76, 0, 79, 0, 0, 0
      ]
    },
    drums: {
      pattern: [
        'kc', 'h', '', 'h', 's', 'h', '', 'h', 'k', 'h', '', 'h', 's', 'h', '', 'h',
        'k', 'h', '', 'h', 's', 'h', '', 'h', 'k', 'h', '', 'h', 's', 'h', 'k', 'o',
        'k', 'h', '', 'h', 's', 'h', '', 'h', 'k', 'h', '', 'h', 's', 'h', '', 'h',
        'k', 'h', '', 'h', 's', 'h', '', 'h', 'k', 'h', 'k', 'h', 's', 'h', 's', 'o'
      ]
    }
  },

  // "Jungle Hot Drop" — Contra/Metal Slug jungle run (D minor, 160 BPM)
  stage_jungle: {
    bpm: 160,
    bass: {
      wave: 'sawtooth', cutoff: 500, gain: 0.05, decay: 0.14,
      pattern: [
        // tresillo syncopation: Dm | Bb | C | Dm
        38, 0, 0, 38, 0, 0, 38, 0, 38, 0, 0, 38, 0, 0, 38, 0,
        46, 0, 0, 46, 0, 0, 46, 0, 46, 0, 0, 46, 0, 0, 46, 0,
        36, 0, 0, 36, 0, 0, 36, 0, 36, 0, 0, 36, 0, 0, 36, 0,
        38, 0, 0, 38, 0, 0, 38, 0, 38, 0, 0, 38, 0, 36, 37, 0
      ]
    },
    arp: {
      wave: 'triangle', cutoff: 1800, gain: 0.03, decay: 0.12,
      pattern: [
        0, 0, 0, 0, 0, 0, [62, 65, 69], 0, 0, 0, 0, 0, 0, 0, [62, 65, 69], 0,
        0, 0, 0, 0, 0, 0, [58, 62, 65], 0, 0, 0, 0, 0, 0, 0, [58, 62, 65], 0,
        0, 0, 0, 0, 0, 0, [60, 64, 67], 0, 0, 0, 0, 0, 0, 0, [60, 64, 67], 0,
        0, 0, 0, 0, 0, 0, [62, 65, 69], 0, 0, 0, 0, 0, [62, 65, 69], 0, [62, 65, 69], 0
      ]
    },
    lead: {
      wave: 'square', gain: 0.03, decay: 0.13,
      pattern: [
        74, 0, 0, 77, 0, 0, 79, 0, 0, 77, 0, 74, 0, 0, 72, 0,
        70, 0, 0, 74, 0, 0, 77, 0, 0, 74, 0, 0, 70, 0, 0, 0,
        72, 0, 0, 76, 0, 0, 79, 0, 0, 76, 0, 72, 0, 0, 0, 0,
        74, 0, 0, 77, 0, 0, 81, 0, 0, 79, 0, 77, 0, 74, 0, 0
      ]
    },
    drums: {
      pattern: [
        'k', '', 't', '', 's', '', '', 'k', '', 't', '', 'k', 's', '', 't', '',
        'k', '', 't', '', 's', '', '', 'k', '', '', 't', '', 's', '', 'k', 't',
        'k', '', 't', '', 's', '', '', 'k', '', 't', '', 'k', 's', '', 't', '',
        'k', '', 't', '', 's', '', 't', '', 'k', 't', 't', 't', 's', 't', 't', 's'
      ]
    }
  },

  // "Neon City Patrol" — Streets of Rage funk groove (A minor, 138 BPM)
  stage_city: {
    bpm: 138,
    bass: {
      wave: 'sawtooth', cutoff: 550, gain: 0.05, decay: 0.13,
      pattern: [
        45, 0, 0, 45, 0, 0, 57, 0, 45, 0, 0, 45, 0, 43, 0, 45,
        45, 0, 0, 45, 0, 0, 57, 0, 45, 0, 45, 0, 0, 43, 0, 43,
        41, 0, 0, 41, 0, 0, 53, 0, 41, 0, 0, 41, 0, 43, 0, 41,
        40, 0, 0, 40, 0, 0, 52, 0, 40, 0, 0, 40, 0, 42, 0, 44
      ]
    },
    arp: {
      wave: 'square', cutoff: 2000, gain: 0.02, decay: 0.09,
      pattern: [
        0, 0, 0, 0, 0, [64, 69, 72], 0, 0, 0, 0, 0, [64, 69, 72], 0, [64, 69, 72], 0, 0,
        0, 0, 0, 0, 0, [64, 69, 72], 0, 0, 0, 0, 0, [64, 69, 72], 0, [64, 69, 72], 0, 0,
        0, 0, 0, 0, 0, [60, 65, 69], 0, 0, 0, 0, 0, [60, 65, 69], 0, [60, 65, 69], 0, 0,
        0, 0, 0, 0, 0, [59, 64, 68], 0, 0, 0, 0, 0, [59, 64, 68], 0, [59, 64, 68], 0, 0
      ]
    },
    lead: {
      wave: 'square', gain: 0.028, decay: 0.15,
      pattern: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 67, 69,
        72, 0, 0, 74, 0, 0, 75, 0, 76, 0, 0, 72, 0, 0, 69, 0,
        77, 0, 0, 76, 0, 0, 72, 0, 0, 0, 69, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 71, 0, 68, 0, 64, 0, 0, 0, 0, 0, 0, 0
      ]
    },
    drums: {
      pattern: [
        'kh', 'h', '', 'h', 's', 'h', 'kh', 'h', 'kh', 'h', '', 'h', 's', 'h', 'kh', 'o',
        'kh', 'h', '', 'h', 's', 'h', 'kh', 'h', 'kh', 'h', '', 'h', 's', 'h', 'kh', 'o',
        'kh', 'h', '', 'h', 's', 'h', 'kh', 'h', 'kh', 'h', '', 'h', 's', 'h', 'kh', 'o',
        'kh', 'h', '', 'h', 's', 'h', 'kh', 'h', 'kh', 'kh', '', 'h', 's', 's', 'kh', 's'
      ]
    }
  },

  // "Midnight Castle" — Castlevania gothic gallop (D minor, 150 BPM)
  stage_castle: {
    bpm: 150,
    bass: {
      wave: 'sawtooth', cutoff: 600, gain: 0.05, decay: 0.1,
      pattern: [
        // gallop rhythm (8th + two 16ths): Dm | Bb | Gm | A
        38, 0, 38, 38, 38, 0, 38, 38, 38, 0, 38, 38, 38, 0, 38, 38,
        46, 0, 46, 46, 46, 0, 46, 46, 46, 0, 46, 46, 46, 0, 45, 44,
        43, 0, 43, 43, 43, 0, 43, 43, 43, 0, 43, 43, 43, 0, 43, 44,
        45, 0, 45, 45, 45, 0, 45, 45, 45, 0, 45, 45, 45, 0, 40, 39
      ]
    },
    arp: {
      wave: 'square', cutoff: 2600, gain: 0.014, decay: 0.07,
      pattern: [
        // harpsichord 16th arps: Dm | Bb | Gm | A
        ...arpCell(62, 65, 69, 65),
        ...arpCell(58, 62, 65, 62),
        ...arpCell(55, 58, 62, 58),
        ...arpCell(57, 61, 64, 61)
      ]
    },
    lead: {
      wave: 'square', gain: 0.03, decay: 0.14,
      pattern: [
        74, 0, 74, 0, 0, 77, 0, 0, 79, 0, 0, 0, 77, 0, 74, 0,
        70, 0, 70, 0, 0, 74, 0, 0, 77, 0, 0, 0, 74, 0, 70, 0,
        67, 0, 67, 0, 0, 70, 0, 0, 74, 0, 0, 0, 70, 0, 67, 0,
        69, 0, 69, 0, 0, 73, 0, 0, 76, 0, 0, 0, 73, 0, 69, 0
      ]
    },
    drums: {
      pattern: [
        'kc', '', 'h', '', 's', '', 'h', '', 'k', '', 'h', '', 's', '', 'h', 'h',
        'k', '', 'h', '', 's', '', 'h', '', 'k', '', 'h', '', 's', '', 'h', '',
        'k', '', 'h', '', 's', '', 'h', '', 'k', '', 'h', '', 's', '', 'h', 'h',
        'k', '', 'h', '', 's', '', 'h', '', 'k', '', 'k', '', 's', 's', 's', 's'
      ]
    }
  },

  // "Titan Foundry" — Mega Man/Gunstar industrial energy (E minor, 165 BPM)
  stage_foundry: {
    bpm: 165,
    bass: {
      wave: 'sawtooth', cutoff: 550, gain: 0.05, decay: 0.12,
      pattern: [
        40, 0, 40, 0, 40, 0, 40, 0, 40, 0, 40, 0, 40, 40, 40, 0,
        36, 0, 36, 0, 36, 0, 36, 0, 36, 0, 36, 0, 36, 36, 36, 0,
        38, 0, 38, 0, 38, 0, 38, 0, 38, 0, 38, 0, 38, 38, 38, 0,
        47, 0, 47, 0, 47, 0, 47, 0, 47, 0, 47, 0, 47, 0, 38, 39
      ]
    },
    arp: {
      wave: 'sawtooth', cutoff: 2400, gain: 0.02, decay: 0.14,
      pattern: [
        // power-chord stabs: Em | C | D | B
        0, 0, 0, 0, [64, 71, 76], 0, 0, 0, 0, 0, 0, 0, [64, 71, 76], 0, 0, 0,
        0, 0, 0, 0, [60, 67, 72], 0, 0, 0, 0, 0, 0, 0, [60, 67, 72], 0, 0, 0,
        0, 0, 0, 0, [62, 69, 74], 0, 0, 0, 0, 0, 0, 0, [62, 69, 74], 0, 0, 0,
        0, 0, 0, 0, [59, 66, 71], 0, 0, 0, 0, 0, 0, 0, [59, 66, 71], 0, 0, 0
      ]
    },
    lead: {
      wave: 'square', gain: 0.03, decay: 0.12,
      pattern: [
        76, 0, 78, 79, 0, 81, 0, 79, 76, 0, 74, 0, 76, 0, 0, 0,
        72, 0, 74, 76, 0, 79, 0, 76, 74, 0, 72, 0, 67, 0, 0, 0,
        74, 0, 76, 78, 0, 81, 0, 78, 76, 0, 74, 0, 71, 0, 0, 0,
        78, 0, 76, 0, 74, 0, 71, 0, 74, 0, 76, 0, 78, 0, 0, 0
      ]
    },
    drums: {
      pattern: [
        'kc', 'h', 'kh', 'h', 's', 'h', 'kh', 'h', 'kh', 'h', 'kh', 'h', 's', 'h', 'kh', 'h',
        'kh', 'h', '', 'h', 's', 'h', 'kh', 'h', 'kh', 'h', 'kh', 'h', 's', 'h', 'kh', 'o',
        'k', 'h', 'kh', 'h', 's', 'h', 'kh', 'h', 'kh', 'h', 'kh', 'h', 's', 'h', 'kh', 'h',
        'kh', 'h', '', 'h', 's', 'h', 'kh', 'h', 'kh', 'kh', 'kh', 'kh', 's', 's', 's', 's'
      ]
    }
  },

  // "Brass & Gunpowder" — Metal Slug military march for boss fights (A minor, 150 BPM)
  boss: {
    bpm: 150,
    bass: {
      wave: 'sawtooth', cutoff: 520, gain: 0.055, decay: 0.14,
      pattern: [
        // Am | F | G | Am with chromatic walk-ups between roots
        45, 0, 45, 0, 45, 0, 45, 0, 45, 0, 45, 0, 45, 0, 43, 42,
        41, 0, 41, 0, 41, 0, 41, 0, 41, 0, 41, 0, 41, 0, 42, 43,
        43, 0, 43, 0, 43, 0, 43, 0, 43, 0, 43, 0, 43, 0, 44, 45,
        45, 0, 45, 0, 45, 0, 45, 0, 45, 0, 52, 0, 50, 0, 47, 0
      ]
    },
    arp: {
      wave: 'sawtooth', cutoff: 2000, gain: 0.022, decay: 0.12,
      pattern: [
        // brass section punches
        0, 0, 0, 0, 0, 0, [69, 72, 76], 0, 0, 0, 0, 0, 0, 0, [69, 72, 76], 0,
        0, 0, 0, 0, 0, 0, [65, 69, 72], 0, 0, 0, 0, 0, 0, 0, [65, 69, 72], 0,
        0, 0, 0, 0, 0, 0, [67, 71, 74], 0, 0, 0, 0, 0, 0, 0, [67, 71, 74], 0,
        0, 0, 0, 0, 0, 0, [69, 72, 76], 0, 0, 0, 0, 0, [69, 72, 76], 0, [69, 72, 76], 0
      ]
    },
    lead: {
      wave: 'square', gain: 0.03, decay: 0.16,
      pattern: [
        72, 0, 0, 76, 0, 0, 81, 0, 79, 0, 76, 0, 72, 0, 0, 0,
        77, 0, 0, 81, 0, 0, 84, 0, 81, 0, 0, 77, 0, 0, 72, 0,
        79, 0, 0, 83, 0, 0, 86, 0, 83, 0, 0, 79, 0, 0, 74, 0,
        81, 0, 0, 76, 0, 0, 72, 0, 74, 0, 76, 0, 79, 0, 0, 0
      ]
    },
    drums: {
      pattern: [
        'kc', '', '', '', 's', '', '', '', 'k', '', '', '', 's', '', '', '',
        'k', '', '', '', 's', '', '', '', 'k', '', '', '', 's', '', 's', 's',
        'k', '', '', '', 's', '', '', '', 'k', '', '', '', 's', '', '', '',
        'k', '', '', '', 's', '', '', '', 'k', '', 'k', '', 's', 's', 's', 's'
      ]
    }
  }
};

// Display names for the looping tracks (used by the unlock UI).
export const TRACK_NAMES = {
  menu: 'CHROME RACER',
  stage_jungle: 'JUNGLE HOT DROP',
  stage_city: 'NEON CITY PATROL',
  stage_castle: 'MIDNIGHT CASTLE',
  stage_foundry: 'TITAN FOUNDRY',
  boss: 'BRASS & GUNPOWDER'
};

// One-shot musical sequences (stings & jingles)
export const SEQUENCES = {
  // "Warning: Incoming" — Gradius-style alarm siren + rising chromatic run (~2.6s)
  warning: {
    notes: [
      ...Array.from({ length: 14 }, (_, i) => ({
        at: i * 0.1, len: 0.09, m: i % 2 === 0 ? 88 : 83, wave: 'square', gain: 0.045
      })),
      { at: 1.4, len: 0.1, m: 45, wave: 'sawtooth', gain: 0.05 },
      { at: 1.5, len: 0.1, m: 46, wave: 'sawtooth', gain: 0.05 },
      { at: 1.6, len: 0.1, m: 47, wave: 'sawtooth', gain: 0.05 },
      { at: 1.7, len: 0.1, m: 48, wave: 'sawtooth', gain: 0.05 },
      { at: 1.8, len: 0.1, m: 49, wave: 'sawtooth', gain: 0.05 },
      { at: 1.9, len: 0.1, m: 50, wave: 'sawtooth', gain: 0.05 },
      { at: 2.0, len: 0.6, chord: [33, 45], wave: 'sawtooth', gain: 0.055 }
    ],
    drums: [
      { at: 0, d: 'k' }, { at: 0.7, d: 'k' }, { at: 1.4, d: 'k' },
      { at: 2.0, d: 'k' }, { at: 2.0, d: 'c' }
    ]
  },

  // "Mission Clear" — triumphant major fanfare (~3s)
  victory: {
    notes: [
      { at: 0.00, len: 0.1, m: 60, wave: 'square', gain: 0.06 },
      { at: 0.07, len: 0.1, m: 64, wave: 'square', gain: 0.06 },
      { at: 0.14, len: 0.1, m: 67, wave: 'square', gain: 0.06 },
      { at: 0.21, len: 0.1, m: 72, wave: 'square', gain: 0.06 },
      { at: 0.28, len: 0.1, m: 76, wave: 'square', gain: 0.06 },
      { at: 0.35, len: 0.1, m: 79, wave: 'square', gain: 0.06 },
      { at: 0.42, len: 0.4, m: 84, wave: 'square', gain: 0.07 },
      { at: 1.00, len: 0.22, chord: [60, 64, 67, 72], wave: 'square', gain: 0.05 },
      { at: 1.30, len: 0.22, chord: [60, 64, 67, 72], wave: 'square', gain: 0.05 },
      { at: 1.60, len: 1.4, chord: [60, 64, 67, 72, 79], wave: 'square', gain: 0.045 },
      { at: 0.00, len: 0.3, m: 36, wave: 'sawtooth', gain: 0.05 },
      { at: 1.00, len: 0.25, m: 36, wave: 'sawtooth', gain: 0.05 },
      { at: 1.60, len: 1.4, m: 36, wave: 'sawtooth', gain: 0.05 }
    ],
    drums: [
      { at: 0, d: 'k' }, { at: 0.42, d: 'c' }, { at: 1.0, d: 'k' },
      { at: 1.3, d: 'k' }, { at: 1.6, d: 'k' }, { at: 1.6, d: 'c' }
    ]
  },

  // "Continue?" — slow descending dirge (~4.5s)
  gameover: {
    notes: [
      { at: 0.00, len: 1.8, m: 33, wave: 'triangle', gain: 0.09 },
      { at: 0.30, len: 0.32, m: 69, wave: 'triangle', gain: 0.06 },
      { at: 0.60, len: 0.32, m: 67, wave: 'triangle', gain: 0.06 },
      { at: 0.90, len: 0.32, m: 65, wave: 'triangle', gain: 0.06 },
      { at: 1.20, len: 0.32, m: 64, wave: 'triangle', gain: 0.06 },
      { at: 1.50, len: 0.32, m: 62, wave: 'triangle', gain: 0.06 },
      { at: 1.80, len: 0.32, m: 60, wave: 'triangle', gain: 0.06 },
      { at: 2.10, len: 0.6, m: 57, wave: 'triangle', gain: 0.065 },
      { at: 2.90, len: 1.6, chord: [45, 52, 57], wave: 'triangle', gain: 0.055 },
      { at: 2.90, len: 1.6, m: 33, wave: 'triangle', gain: 0.07 }
    ],
    drums: [{ at: 2.9, d: 'k' }]
  }
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.musicInterval = null;
    this.musicStep = 0;
    this.currentTrack = 'menu';
    this._busNode = null;
    this._noiseBuf = null;
    this.shardNoteIndex = 0;
    this.pentatonicNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSfxEnabled(val) {
    this.sfxEnabled = val;
  }

  setMusicEnabled(val) {
    this.musicEnabled = val;
    if (!val) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  // Laser shot sound
  playShoot(isPlayer = true) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isPlayer ? 'sawtooth' : 'triangle';
      if (isPlayer) {
        osc.frequency.setValueAtTime(650, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.08);
      } else {
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.12);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.12);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + (isPlayer ? 0.08 : 0.12));
    } catch (e) {
      // Audio safety
    }
  }

  // Explosion with noise and low bass thud
  playExplosion(isBoss = false) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const duration = isBoss ? 0.8 : 0.28;

      // Noise buffer
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isBoss ? 800 : 600, t);
      filter.frequency.exponentialRampToValueAtTime(isBoss ? 40 : 60, t + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isBoss ? 0.35 : 0.18, t);
      gain.gain.linearRampToValueAtTime(0.001, t + duration);

      // Low bass oscillator for punch
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isBoss ? 160 : 130, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + duration);
      oscGain.gain.setValueAtTime(isBoss ? 0.4 : 0.2, t);
      oscGain.gain.linearRampToValueAtTime(0.001, t + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      whiteNoise.start(t);
      osc.start(t);
      whiteNoise.stop(t + duration);
      osc.stop(t + duration);
    } catch (e) {
      // Audio safety
    }
  }

  // Shard pickup arpeggio chime
  playShard() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const freq = this.pentatonicNotes[this.shardNoteIndex % this.pentatonicNotes.length];
      this.shardNoteIndex++;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 0.1);

      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch (e) {
      // Audio safety
    }
  }

  // Powerup collected fanfare
  playPowerup() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
      notes.forEach((freq, idx) => {
        const t = this.ctx.currentTime + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.06, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    } catch (e) {
      // Audio safety
    }
  }

  // Shield deflection ping
  playShieldHit() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {
      // Audio safety
    }
  }

  // EMP Bomb blast (massive bass sweep & shockwave)
  playBomb() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.7);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.7);

      this.playExplosion(true);
    } catch (e) {
      // Audio safety
    }
  }

  // Secondary Weapon: Seeker Missiles Swarm
  playMissileLaunch() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      [0, 0.05, 0.1, 0.15].forEach((delay, idx) => {
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320 + idx * 80, t);
        osc.frequency.exponentialRampToValueAtTime(800 + idx * 100, t + 0.12);

        gain.gain.setValueAtTime(0.08, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    } catch (e) {
      // Audio safety
    }
  }

  // Secondary Weapon: Photon Railgun Piercing Beam
  playRailgunFire() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // High-energy discharge
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(980, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.22);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);

      // Low punch resonance
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(240, t);
      subOsc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      subGain.gain.setValueAtTime(0.2, t);
      subGain.gain.linearRampToValueAtTime(0.001, t + 0.3);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 0.3);
    } catch (e) {
      // Audio safety
    }
  }

  // Secondary Weapon: Cluster Flak
  playClusterFire() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Initial cannon shot
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.18);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch (e) {
      // Audio safety
    }
  }

  // Secondary Weapon: Void Vortex
  playVortexFire() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(450, t + 0.2);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.45);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    } catch (e) {
      // Audio safety
    }
  }

  // Boss warning alert
  playBossAlert() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      for (let i = 0; i < 2; i++) {
        const t = this.ctx.currentTime + i * 0.28;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.2);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      }
    } catch (e) {
      // Audio safety
    }
  }

  // UI button click
  playClick() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.04);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {
      // Audio safety
    }
  }

  // =====================================================================
  // Chiptune music engine — looping tracks, one-shot stings & jingles
  // =====================================================================

  // Shared music bus so loops and jingles can be balanced together
  musicBus() {
    if (!this.ctx) return null;
    if (!this._busNode) {
      this._busNode = this.ctx.createGain();
      this._busNode.gain.value = 0.9;
      this._busNode.connect(this.ctx.destination);
    }
    return this._busNode;
  }

  // Shared white-noise buffer for drums
  noiseBuffer() {
    if (!this._noiseBuf) {
      const len = Math.floor(this.ctx.sampleRate * 1.0);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;
    }
    return this._noiseBuf;
  }

  // Play one pitched step (single MIDI note or chord) for a voice
  playPitchVoice(voice, value, t) {
    const bus = this.musicBus();
    if (!bus) return;

    const notes = (Array.isArray(value) ? value : [value]).map(mtof).filter((f) => f > 0);
    if (!notes.length) return;

    notes.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const decay = voice.decay || 0.12;

      osc.type = voice.wave || 'square';
      osc.frequency.setValueAtTime(freq, t);

      let tail = osc;
      if (voice.cutoff) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(voice.cutoff, t);
        filter.frequency.exponentialRampToValueAtTime(Math.max(60, voice.cutoff * 0.35), t + decay);
        osc.connect(filter);
        tail = filter;
      }

      gain.gain.setValueAtTime((voice.gain || 0.03) / Math.sqrt(notes.length), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

      tail.connect(gain);
      gain.connect(bus);
      osc.start(t);
      osc.stop(t + decay + 0.03);
    });
  }

  // Play a drum step string, e.g. 'ks' = kick + snare together
  playDrumStep(hits, t) {
    const bus = this.musicBus();
    if (!bus) return;

    for (const ch of hits) {
      if (ch === 'k') {
        // Kick: pitch-dropping sine
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.11);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        osc.connect(gain);
        gain.connect(bus);
        osc.start(t);
        osc.stop(t + 0.15);
      } else if (ch === 's') {
        // Snare: band-passed noise + body tone
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer();
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1900, t);
        bp.Q.value = 1.1;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.14, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        noise.connect(bp);
        bp.connect(ng);
        ng.connect(bus);
        noise.start(t);
        noise.stop(t + 0.13);

        const tone = this.ctx.createOscillator();
        const tg = this.ctx.createGain();
        tone.type = 'triangle';
        tone.frequency.setValueAtTime(190, t);
        tg.gain.setValueAtTime(0.08, t);
        tg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        tone.connect(tg);
        tg.connect(bus);
        tone.start(t);
        tone.stop(t + 0.09);
      } else if (ch === 'h' || ch === 'o') {
        // Hats: high-passed noise blips
        const dur = ch === 'h' ? 0.035 : 0.14;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer();
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(ch === 'h' ? 7500 : 7000, t);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(ch === 'h' ? 0.05 : 0.045, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        noise.connect(hp);
        hp.connect(g);
        g.connect(bus);
        noise.start(t);
        noise.stop(t + dur + 0.01);
      } else if (ch === 't') {
        // Tom
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(95, t + 0.14);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(gain);
        gain.connect(bus);
        osc.start(t);
        osc.stop(t + 0.18);
      } else if (ch === 'c') {
        // Crash cymbal
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer();
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(4500, t);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.07, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        noise.connect(hp);
        hp.connect(g);
        g.connect(bus);
        noise.start(t);
        noise.stop(t + 0.55);
      }
    }
  }

  // Switch the looping track (resets to the downbeat)
  playTrack(id) {
    if (!TRACKS[id]) return;
    this.currentTrack = id;
    this.musicStep = 0;
    this.stopMusic();
    this.startMusic();
  }

  // Play a one-shot jingle ('victory' | 'gameover') and stop the loop
  playJingle(id) {
    this.stopMusic();
    this.playSequence(SEQUENCES[id]);
  }

  // Gradius-style boss warning sting; falls back to the SFX siren when music is off
  playWarningSting() {
    if (!this.musicEnabled) {
      this.playBossAlert();
      return;
    }
    this.playSequence(SEQUENCES.warning);
  }

  // Schedule a one-shot sequence of notes and drum hits
  playSequence(seq) {
    if (!seq || !this.musicEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t0 = this.ctx.currentTime + 0.04;
      (seq.notes || []).forEach((n) => {
        const values = (n.chord || [n.m]).map(mtof).filter((f) => f > 0);
        values.forEach((freq) => {
          const start = t0 + (n.at || 0);
          const len = n.len || 0.2;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = n.wave || 'square';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime((n.gain || 0.05) / Math.sqrt(values.length), start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + len);

          osc.connect(gain);
          gain.connect(this.musicBus());
          osc.start(start);
          osc.stop(start + len + 0.03);
        });
      });
      (seq.drums || []).forEach((d) => this.playDrumStep(d.d, t0 + (d.at || 0)));
    } catch (e) {
      // Audio safety
    }
  }

  // Render one 16th-note step of the active track
  tickMusic(track) {
    if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;

    try {
      const t = this.ctx.currentTime;
      const s = this.musicStep;
      const pick = (voice) => voice.pattern[s % voice.pattern.length];

      if (track.bass) this.playPitchVoice(track.bass, pick(track.bass), t);
      if (track.lead) this.playPitchVoice(track.lead, pick(track.lead), t);
      if (track.arp) this.playPitchVoice(track.arp, pick(track.arp), t);
      if (track.drums) {
        const hits = pick(track.drums);
        if (hits) this.playDrumStep(hits, t);
      }

      this.musicStep++;
    } catch (e) {
      // Audio safety
    }
  }

  startMusic() {
    if (!this.musicEnabled || this.musicInterval) return;
    this.init();

    const track = TRACKS[this.currentTrack] || TRACKS.menu;
    // 16th notes: 60000 / bpm / 4 ms per step
    const stepMs = 60000 / track.bpm / 4;
    this.musicInterval = setInterval(() => this.tickMusic(track), stepMs);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const audio = new AudioManager();
