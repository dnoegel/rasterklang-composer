# Brief format

A brief is everything the composer decides about a song. Code turns it into
notes. There are two shapes:

- the **answer**: what the composer model (or you, or your agent) writes,
  snake_case, defined by `briefSchema()` (`rk-composer schema`);
- the **brief**: the validated internal form, camelCase, from
  `validateBrief(answerToBrief(answer, prompt))`. `briefToAnswer()` goes back.

Write answers. In a song folder, `answer.json` is the answer: edit it (or
let an agent write it after `rk-composer draw`) and run `rk-composer render
<dir>`. It may also be `{ prompt, answer }` as in `examples/briefs/`.
Invalid values are repaired where possible (`repairs`) and reported
otherwise (`errors`); the pipeline sends errors back to the model once.

The authoritative menu of ids (styles, grooves, bass idioms, textures,
sounds, ...) is the composer's system prompt: `rk-composer menu`.
It is generated from the library, so it is always current.

## Song fields

| Field | Values | Meaning |
| --- | --- | --- |
| `reasoning` | text | 2 to 4 sentences: how the choices express the prompt |
| `title`, `imagery`, `liner_note` | text | title, the picture the music paints, a note for the listener |
| `style` | style id | the genre whose grooves, bass and harmony lead |
| `blend_style`, `blend_amount` | style id or `none`, 0.2 to 0.5 | a second genre mixed in |
| `sid_idiom` | 0 to 1 | 0: the genre played on the SID; 1: fully C64-native |
| `moods` | `[{ mood, weight }]` | happy, playful, triumphant, hopeful, melancholic, dreamy, calm, nostalgic, menacing, aggressive, tense, mysterious, epic |
| `tempo` | bpm | of the felt beat (dotted quarter in 6/8 and 12/8) |
| `meter` | `4/4`, `3/4`, `6/8`, `12/8` | |
| `key`, `mode` | `C` to `B`; ionian, dorian, phrygian, lydian, mixolydian, aeolian, harmonic | |
| `palette` | `{ bass, snare, chords, kit, arp }` | the song's default sounds |
| `sound` | `{ wave, attack, decay, sustain, release, vibrato, pwm, pulse_width, onset, slide }` | a custom lead sound (`wave: none` for none); envelope values are SID nibbles |
| `sections` | list, see below | the form, in order |
| `themes` | `[{ section, notes }]` | hooks per section type |

## Section fields

| Field | Values | Meaning |
| --- | --- | --- |
| `type` | intro, verse, pre, chorus, bridge, solo, breakdown, build, outro | |
| `bars` | 2, 4, 8, 16 (12 for blues) | |
| `energy`, `energy_end` | 0 to 1 | where the section starts and ends; drums, arpeggio density and filter follow bar by bar |
| `texture` | texture id | which voice plays what, in stages |
| `transition` | transition id | how the section ends (fill, stop, drop, ...) |
| `filter` | follow, open, close, wobble, steady | the SID low-pass over the section |
| `groove`, `bass` | ids | library drums and bass idiom (fallbacks for the patterns) |
| `drums_pattern` | `"k.h.s.hkk.h.s.hh"` or `""` | own drums, one character per step |
| `bass_pattern` | `"R..R..8.R.b.R.5."` or `""` | own bass, resolved against each chord |
| `arp_pattern` | `"x.x.x_x_x.x.x___"` or `""` | rhythm of the chord arpeggio |
| `bass_sound` | `palette` or a bass id | |
| `feel` | melody feel id | rhythmic character of the lead |
| `lead` | lead id or `custom` | |
| `chords` | `["i", "bVI", "bIII", "bVII"]` | roman numerals against the major scale, one per bar, repeating |
| `chord_bars` | 1 or 2 | bars per chord |
| `transpose` | semitones | usually 0; 2 for a lift on the last chorus |
| `mode` | `song` or a mode | a turn of colour for this section |
| `variation` | auto, exact, ornament, sequence, fragment, invert, octave, answer | how a repeat differs from the first time |

## Steps and tokens

Steps per bar: 4/4 has 16 (16th notes), 3/4 and 6/8 have 12, 12/8 has 12
(8th triplets). Patterns are 1 or 2 bars; two bars alternate.

- **Drums**: `k` kick, `s` snare, `c` clap, `h` closed hat, `o` open hat,
  `t` low tom, `T` high tom, `x` crash, `.` rest.
- **Bass**: `R` root, `5` fifth, `8` octave, `3` third, `6` sixth, `b` flat
  seventh, `2` step above, `4` fourth, `A` approach note to the next chord,
  `_` hold, `.` rest.
- **Arpeggio**: `x` hit, `_` hold, `.` rest.
- **Themes**: one token per step, 1 to 4 bars: scale degree `1` to `7`, `8`
  to `14` an octave up, `-1` to `-7` an octave down, `_` hold, `.` rest.

```json
{ "section": "chorus", "notes": "5 _ _ 3 4 _ 5 _ 6 _ 5 _ 3 _ _ _ 2 _ 3 _ 4 _ 3 _ 1 _ _ _ . . . ." }
```

Code develops a theme across repeats (sequence, ornament, fragment, ...),
keeps chord tones on strong beats and fits it to the SID's range.

## Rendering

`render(brief, { prompt, seed })`. The prompt is part of the seed: render a
brief with the prompt it was written for to get the same song. Different
seeds give different melodies and variants of the same brief.
