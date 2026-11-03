# How it works

Models that write notes directly mostly ignore the prompt and repeat the same
clichés; pure rules map prompts badly. rasterklang-composer splits the work: a
model understands the request and makes the big decisions, code writes the
notes and owns the randomness, because models collapse onto favourite answers.

## 1. Read (`gen/understand.js`)

A small, fast model reads the prompt into genre candidates, moods, energy,
valence, tension, a SID-idiom value (0 genre on a SID, 1 C64-native), a story
arc and what the prompt fixes (style, tempo, form, sounds). It makes no musical
choice. If it fails, keyword matching (`gen/intent.js`, English and German)
stands in.

## 2. Draw (`gen/menu.js`, `gen/voicing.js`)

Code draws from that reading what a model would always pick the same way: key,
style among the candidates, tempo position, form, intro, first chorus texture,
a verse bass figure, lead character, arpeggio, bass sound and drum kit. Story
arcs get their own sounds and mode per phase.

## 3. Write (`gen/menu.js`)

The composer model gets a menu generated from the library plus the drawn
arrangement as defaults, and answers a song brief as strict JSON
([brief format](brief-format.md)). For a named piece, a research step
(`research/`) first finds real notes in public score sources and reduces them
to lead, bass and chords.

## 4. Render (`gen/compose.js`)

`brief.js` validates and plans, `orchestrate.js` keeps one cast of sounds per
song, `arrange.js` writes drums, bass, arpeggios and transitions,
`melody.js` develops the themes (motifs varied on repeats, chord tones on
strong beats, cadences), `instruments.js` holds the SID sounds, `emit.js`
writes rasterklang-dsl, rasterklang-score compiles it to 50 Hz register frames
and `export/sid.js` packs them into a PSID file.

## 5. Improve

- `validateBrief` repairs invalid ids, lengths and ranges and reports them.
- Remaining errors go back to the model once.
- Themes with too few chord tones on strong beats get one follow-up to the
  model; the better valid brief is kept (`eval/theme-fit.js`).
- Eight melody candidates per song, the best by measured shape and variety.
- `critique` rates a rendered song against its prompt; `refine` rewrites a
  brief from an instruction.

## The C64 data

`gen/library/` holds statistics over the High Voltage SID Collection, compiled
into small tables: which one-bar lead rhythms and bass figures are common,
which drum lines, how C64 arrangements of known genres tend to be built, and a
standard set of sound shapes per role (kick, snare, bass, lead, arp). The
generator draws from these distributions alongside its hand-written library.
