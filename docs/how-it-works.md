# How it works

## Why not let the model write the notes?

Models that write notes directly (ABC, MIDI tokens) mostly ignore the
prompt, drift in key and tempo and repeat the same clichés. Pure rules map
prompts badly. rasterklang-composer gives each side the job it is good at:
the model understands the request and makes the big musical decisions, code
writes the notes, and code also owns the randomness, because
instruction-tuned models collapse onto their favourite answers.

This follows the split of MuseCoco (text to attributes, attributes to
music) and plan-then-write generation, and uses the vocabulary of music
emotion research (valence, arousal, tension).

## 1. Read

`src/gen/understand.js`. A small, fast model (default DeepSeek V4.1 Flash,
under a second) reads the prompt into: 1 to 3 weighted genre candidates,
1 to 3 moods, energy, valence, tension, SID idiom (0 to 1), a story arc of
2 to 4 phases when the prompt tells one, what the prompt fixes (style, tempo,
form, lead, bass, drums, arp) and a named work or artist. It makes no
musical choice. If it fails, the rule-based keyword reading
(`src/gen/intent.js`, English and German) stands in.

## 2. Draw

`src/gen/menu.js` (`drawArrangement`, `drawConstraints`, `drawKeys`) and
`src/gen/voicing.js`. Code draws from the reading what a model would
collapse on: the key, the style among the candidates, tempo position in the
style's band, the form family, the intro, the first chorus texture, a verse
bass figure from the HVSC corpus, the lead character, arpeggio, bass sound
and drum kit. Story arcs get a lead, bass sound and mode per phase. Three
readings of one prompt are redrawn until tempo, form and style differ.

## 3. Write

`src/gen/menu.js` (`systemPrompt`, `userPrompt`, `briefSchema`). The composer
model (default Claude Sonnet 5.5) gets a menu generated from the library
and the drawn arrangement as defaults it keeps unless the prompt needs
otherwise, and answers a song brief in strict JSON (see
[brief-format.md](brief-format.md)). For named works, a research step
(`src/research/`) first finds real notes: score search on Mutopia and The
Session, web search, MIDI, MusicXML and ABC readers, reduced to lead, bass
and chords.

## 4. Render

`src/gen/compose.js`, then `brief.js` (validate, repair, plan),
`orchestrate.js` (one cast of sounds per song, fills before overloaded
section changes), `arrange.js` (textures, drums, bass, arpeggios,
transitions, echo), `melody.js` (motif engine: themes developed across
repeats, chord tones on strong beats, cadences), `instruments.js` and
`sound/` (the instrument bank, tuned envelopes), `emit.js` (rasterklang-dsl),
`frames.js` (rasterklang-score compiles the DSL to 50 Hz SID register
frames), `src/export/sid.js` (a PSID file with deduplicated voice streams).

## 5. Improve

- `validateBrief` repairs ids, lengths and ranges and lists what it changed.
- Errors go back to the composer once, with the list.
- Themes that clash with their chords (under 70 % chord tones on strong
  beats) get one short follow-up to the composer; the better valid brief
  is kept (`src/eval/theme-fit.js`).
- Eight melody candidates per song; the best by lead measurements and a
  variety penalty against literal repeats (`measure.js`, `variety.js`).
- Seeds after the first draw code variants of a brief (`vary.js`).
- Optional: a critic rates the rendered song against the prompt
  (`critique`), and `refine` rewrites a brief from an instruction.

## The HVSC data

`src/gen/library/` holds tables generated from the High Voltage SID
Collection by `the build tools`:

- `hvsc-rhythms.js`: lead rhythm cells and bass figures of 14,355 songs
  whose patterns are known exactly (tracker files, and the compiled
  players of DMC, Music Assembler, Future Composer, JCH NewPlayer,
  Soundmonitor and defMON), each used by at least five authors.
- `hvsc-library.js`, `standard.js`: the standard library of sounds, chosen
  per role from about 411,000 measured instruments.
- `hvsc-instruments.js`: instrument programs from tracker songs.
- `hvsc.js`: genre and artist profiles from STIL-credited covers.

Rebuilding them needs a local HVSC and the decoders and capture tools of
the rasterklang toolchain; see `` and
``. The generated tables are checked
in, so using the library needs none of that.
