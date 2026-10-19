# MUSIC — PROCEDURAL CHIPTUNE ENGINE & SOUNDTRACK

> Reference doc for the 9-track procedural soundtrack.
> All melodies are **original compositions** in the style of classic arcade run-'em-ups
> (Metal Slug, Contra, Castlevania, Streets of Rage, Mega Man, Sonic, Gradius).
> **Zero audio assets** — everything is synthesized live with the Web Audio API,
> so there is no loading lag and the whole soundtrack adds ~0 KB to the bundle.

**Source of truth:** `src/engine/Audio.js` (`TRACKS` / `SEQUENCES` registries at the top of the file)

---

## 1. Loop tracks

| ID | Title | Style | Key | BPM | Played when |
|---|---|---|---|---|---|
| `menu` | Chrome Racer | Sonic-style bright menu theme | C major | 145 | Main menu, shop, hangar, arsenal, settings |
| `stage_jungle` | Jungle Hot Drop | Contra/Metal Slug jungle run | D minor | 160 | Campaign sectors 1–2 |
| `stage_city` | Neon City Patrol | Streets of Rage funk groove | A minor | 138 | Campaign sectors 3–5 |
| `stage_castle` | Midnight Castle | Castlevania gothic gallop | D minor | 150 | Campaign sectors 6, 7, 10 |
| `stage_foundry` | Titan Foundry | Mega Man/Gunstar industrial energy | E minor | 165 | Campaign sectors 8–9 |
| `boss` | Brass & Gunpowder | Metal Slug military march | A minor | 150 | Boss fights (all sectors + arena boss) |

**One track per run:** the stage theme is picked once in `startRun()`
(`pickStageTrack()` in `src/main.js`) — sector-matched for campaign, random from
all four stage tracks for Endless Arena. The loop keeps playing for the whole
run; only bosses and jingles interrupt it.

## 2. Jingles & stings (one-shot sequences)

| ID | Title | Style | Length | Fired by |
|---|---|---|---|---|
| `warning` | Warning: Incoming | Gradius-style alarm siren + rising chromatic run | ~2.6s | Boss spawn (before the boss theme kicks in) |
| `victory` | Mission Clear | Triumphant major fanfare | ~3s | Sector/run victory |
| `gameover` | Continue? | Slow descending dirge | ~4.5s | Game over |

## 3. Engine architecture

Each `TRACKS[id]` entry is `{ bpm, bass, lead, arp, drums }` — up to four
simultaneous voices, all scheduled with a look-ahead scheduler (`tickMusic()`):

- **bass / lead / arp** — pitched voices: `{ wave, cutoff?, gain, decay, pattern }`
  - `pattern` = array of **64 steps** (4 bars of 16th notes)
  - a step is a **MIDI number** (e.g. `72` = C5), an **array of MIDI numbers** (chord), or `0` (rest)
  - `wave` = any `OscillatorNode` type (`square`, `sawtooth`, `triangle`, ...)
  - bass voices run through a lowpass `cutoff` for that chunky arcade bass sound
- **drums** — synthesized kit, no samples:
  - `pattern` = 64 string tokens: `''` rest · `k` kick · `s` snare · `h` closed hat ·
    `o` open hat · `t` tom · `c` crash — combine letters for hits on the same step (`'ks'` = kick + snare)

`SEQUENCES` uses the same format but plays once instead of looping
(jingles and the warning sting).

Volume lives on a dedicated music bus (`musicBus()`), separate from SFX, so the
music toggle and ducking never touch sound effects.

## 4. Integration map

| Call site | What it does |
|---|---|
| `main.js` `startRun()` | Picks the run's stage theme and starts it **before** WaveManager constructs (a boss at wave 1 can override it) |
| `main.js` `pickStageTrack()` | Sector→theme map (see table above); random pick in Arena |
| `main.js` boss death | Resumes the stage theme after a 2.5s breather, then the victory fanfare |
| `main.js` `handleGameOver()` / `handleVictory()` | `playJingle('gameover')` / `playJingle('victory')` — stops the loop, plays once |
| `main.js` `quitToMenu()` | Back to `menu` theme |
| `WaveManager.js` boss spawn (campaign + arena) | `playTrack('boss')` + `playWarningSting()` |
| `Boss.js` | `alertMuted: true` option — the old boss siren is silenced while music is on so it doesn't stack with the warning sting. The sting itself falls back to the siren when music is disabled. |
| `Boss.js` phase transitions / special attacks | Short `playBossAlert()` SFX sting (unaffected by the mute — it's an SFX, and it fires often) |

## 5. Settings & fallbacks

- **Options → Chiptune Synth Music** (`settings.music`, persisted in `Storage.js`)
  gates the whole music bus via `setMusicEnabled()`.
- With music **off**: no tracks/jingles play, the warning sting falls back to the
  classic boss siren so boss spawns still telegraph loudly.
- SFX are independent (`settings.sfx`) — muting music never mutes the game.

## 6. How to add or edit a track

1. Open `src/engine/Audio.js` — the `TRACKS` registry is plain data at the top.
2. To retune a track, nudge numbers: MIDI steps are semitones (add `+2` = up a
   whole step); `bpm` sets tempo; voice `gain`/`decay` shape punch vs. sustain.
3. To add a loop track: copy any existing entry, write 64 steps per voice
   (drums can repeat a 16-step bar 4×), give it a unique ID.
4. To play it: call `audio.playTrack('your_id')` from a call site in the map above.
5. Validate before shipping (see §7) — a malformed step fails silently in-game.

### Composition conventions used in the existing tracks

- **4-bar loop, 1 chord per bar** — bar boundaries are every 16 steps.
- Lead plays in the C5–C6 range (MIDI 72–84), bass in C2–C3 (36–57).
- `0` is your friend: sparse arp/lead patterns leave room for the drums.
- Drum fills land on bar 4 (last 4–8 steps) to mark the loop point.

## 7. Verification

Run after touching `Audio.js`:

```bash
npm run build              # bundle must compile
npm run check:music        # 64-step lengths, valid MIDI/drum tokens, valid sequence timing
```

Manual smoke test (headless): instantiate `Audio`, call `playTrack()` for each
track ID and `playJingle()` for each sequence with a mocked `AudioContext` —
every pattern should render without throwing, including with music disabled.
