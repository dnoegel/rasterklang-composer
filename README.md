# rasterklang-composer

**Prompt in, Commodore 64 music out.**

https://github.com/user-attachments/assets/80d4df37-2e61-4b8b-8eaf-e0d9ff2b4cde

```sh
rk-composer "speed metal for a disk drive grinding through midnight, frantic and smoking"
rk-composer "baroque harpsichord duel between two clockwork owls"
rk-composer "a shy disco ball that slowly takes over the party"
rk-composer "demo party end part at sunrise, sine scrollers waving goodbye"
```

Every song is a folder: a real `.sid` that plays on a C64, in any SID
player and on real hardware, a WAV rendered on an emulated SID, the source
in [rasterklang-dsl](https://github.com/dnoegel/rasterklang-dsl), and the
brief the composer wrote, which you can edit, refine with a new prompt or
render in another variant. Every step is kept.

Language models are bad at writing notes and good at understanding what
you mean. rasterklang-composer splits the job between them and code:

```
 prompt
   │
   ├─ 1. read      a fast model reads mood, genre candidates, energy, story arc
   ├─ 2. draw      code draws key, tempo position, form, sounds and textures from that reading
   ├─ 3. write     a strong model writes a song brief from a menu of tested building blocks
   ├─ 4. render    code writes every note for the SID's three voices, on music theory
   │               and on patterns and sounds derived from the HVSC
   └─ 5. improve   validation and repair, one retry with the errors, themes that clash
                   with their chords go back to the model, the best of 8 melody candidates
   │
 out/<title>/   song.sid  song.wav  song.dsl  answer.json  song.json  versions/
```

The model never writes a note. It picks a groove, a bass idiom, chords, a
form, an energy curve and hums a hook in scale degrees; code develops the
motif, keeps chord tones on strong beats, voices the arpeggios, fits it all
into three voices and renders it. Randomness lives in code, not in the
model, so the same prompt gives you different songs, not the model's
favourite answer three times.

## What is inside

- **30 styles** from heavy metal and synthwave to bossa nova, jig, ragtime and
  doom, as data: weights over the building blocks, a signature, moods.
- **33 grooves, 48 bass idioms, 28 textures, 34 chord progressions, 10 forms,
  7 modes**, plus rhythm figures from music theory (Lombard snap, clave,
  hemiola, tarantella, ...).
- **Rhythms from 14,355 HVSC songs by 1,950 authors**: one-bar lead cells and
  bass figures from every song whose patterns are known exactly (tracker,
  DMC, Music Assembler, Future Composer, JCH NewPlayer, Soundmonitor, defMON),
  each used by at least five authors.
- **A standard library of C64 sounds** chosen from about 411,000 instruments
  measured across the whole HVSC: the kicks, snares, hats, basses, leads and
  arps most authors used, artifacts removed, each checked for loudness in a mix.
- **Artist and genre profiles** from the HVSC's STIL credits: how C64
  musicians arranged known music.
- **A SID-idiom spectrum**: every song sits somewhere between "this genre,
  played on the SID" and "fully C64-native" (running octave basses, fast
  arpeggio chords, echo, ring and sync leads), chosen per prompt.
- **Interpretations of named works**: "Vivaldi's Autumn on the C64" makes the
  composer search real scores (Mutopia, The Session, the web), read MIDI,
  MusicXML or ABC and play the actual themes. Nothing is guessed: no score
  found, no song.

## Install

```sh
git clone https://github.com/dnoegel/rasterklang-composer.git
cd rasterklang-composer
npm install
npm link            # optional: puts rk-composer on your PATH
```

Or as a dependency: `npm install github:dnoegel/rasterklang-composer`.
Node 22 or newer.

## Three ways to compose

**1. With models (bring your own key).** Models go through
[OpenRouter](https://openrouter.ai), one per step:

```sh
export OPENROUTER_API_KEY=...
rk-composer "underwater hip hop for a crab with attitude"
rk-composer "bluegrass hoedown in a barn full of chickens, getting faster and wilder" \
  --reader deepseek/deepseek-v4.1-flash-1017 --composer anthropic/claude-sonnet-5.5
rk-composer "slow Delta blues on a creaky porch, heat haze and a lazy slide" --critique
```

**2. Without any model.** The rule-based reading and brief, instant and free:

```sh
rk-composer "fast spooky dungeon chase" --offline
```

**3. With your coding agent as the composer.** The agent gets the same
request the composer model gets, writes the brief, and the library renders
it. No key at all:

```sh
rk-composer draw "ragtime piano chase through a silent film"   # out/ragtime-piano-chase-.../request.md
# ... the agent writes answer.json into that folder (format: rk-composer schema) ...
rk-composer render out/ragtime-piano-chase-through-a-silent-film
```

There is a ready skill for Claude Code and other agents in
[`skills/rasterklang-composer/SKILL.md`](skills/rasterklang-composer/SKILL.md),
and 40 model-written example briefs in [`examples/briefs/`](examples/briefs).

## A song is a folder

```
out/keeper-of-the-last-light/
  song.sid  song.wav  song.dsl    the song
  answer.json                     the brief in the composer's format: edit it, then render
  song.json                       the recipe: prompt, seed, models, reading, draws, brief, history
  request.md                      exactly what the composer model got
  critique.json                   the critic's verdicts, if you asked
  versions/1/ 2/ ...              every earlier state, playable
```

Work on it with separate commands; each new state becomes a version:

```sh
rk-composer refine out/keeper-of-the-last-light "make the dawn ending brighter"   # the composer changes it
$EDITOR out/keeper-of-the-last-light/answer.json                                   # or you do
rk-composer render out/keeper-of-the-last-light                                    # render your edit
rk-composer render out/keeper-of-the-last-light --seed 4                           # another melody variant
rk-composer critique out/keeper-of-the-last-light                                  # how well does it fit now?
```

The critic's suggestion makes a good next `refine`.

To continue from an earlier state, point any command at its version:
`rk-composer refine out/keeper-of-the-last-light/versions/2 "..."` or
`rk-composer render out/keeper-of-the-last-light/versions/2 --seed 5`. The
result is the next version of the song folder (say version 5), never a
folder inside `versions/`.

Every command prints the song folder on stdout and a few lines on stderr
(title, style, length, version, what to do next), so it scripts well:

```sh
dir=$(rk-composer "a lonely lighthouse in a storm")
rk-composer refine "$dir" "slower, darker" && rk-composer critique "$dir"
```

New songs go to `out/<title>`, or `out/<title>-2` and so on when that name is
taken; creating the folder is the claim, so parallel runs never share one.
`--dir` must be a new or empty folder.

## CLI

```
rk-composer "prompt" [options]              compose a song into a folder (default out/<title>)
rk-composer refine <dir> "instruction"      let the composer change the song
rk-composer render <dir> [--seed n]         render again: after editing answer.json, or another seed
rk-composer critique <dir>                  ask the critic how well the song fits its prompt
rk-composer draw "prompt" [--dir d]         write request.md only; you or your agent write answer.json
rk-composer menu                            print the composer's system prompt (the menu)
rk-composer schema                          print the JSON schema of answer.json

  -d, --dir <dir>        song folder for compose and draw (default out/<title>)
  -s, --seed <n>         seed for draws and rendering (default 1)
      --reader <model>   model that reads the prompt
      --composer <model> model that writes, refines and criticises
      --offline          rule-based reading and brief: no model, no key
      --critique         also ask the critic after composing
      --no-wav           skip song.wav
```

Environment: `OPENROUTER_API_KEY`, `RK_READER_MODEL`, `RK_COMPOSER_MODEL`.

## In code

```js
import { createPipeline, seededRand } from 'rasterklang-composer';
import { openRouter, renderWav } from 'rasterklang-composer/node';

const llm = openRouter({
  key: process.env.OPENROUTER_API_KEY,
  models: { reader: 'deepseek/deepseek-v4.1-flash-1017', composer: 'anthropic/claude-sonnet-5.5' },
});
const P = createPipeline({ llm, rand: seededRand('my-experiment') });

// all steps at once
const song = await P.compose('a haunted carnival at midnight');
song.sid.bytes;   // Uint8Array, a PSID file
song.tune.dsl;    // rasterklang-dsl source
song.brief;       // the validated brief

// or step by step, and change what you like in between
const reading = await P.read('a haunted carnival at midnight');
const [drawn] = P.draw({ prompt: 'a haunted carnival at midnight', understanding: reading });
const written = await P.write({ prompt: 'a haunted carnival at midnight', user: drawn.user });
const { tune, frames, sid } = P.render({ ...written.brief, tempo: 90 }, { seed: 2 });
const wav = await renderWav(frames);
```

`llm` is any function `({ role, system, user, turns, schema, schemaName,
temperature, maxTokens }) => Promise<{ answer, usage }>`, with `role` one of
`reader`, `composer`, `critic`. Plug in any provider, a local model or a
recorded answer. `createPipeline()` without `llm` composes rule-based.

| Step | Function | Model |
| --- | --- | --- |
| read | `read(prompt)`: genres, moods, energy, valence, tension, SID idiom, story arc, what the prompt fixes, a named work | reader |
| draw | `draw({ prompt, understanding, count, keys })`: one or three readings with key, constraints, arrangement and sounds | none |
| write | `write({ prompt, user, melody, material })`: brief, validated and repaired, one retry, theme follow-up | composer |
| render | `render(brief, { prompt, seed })`: tune (DSL, plan, summary), frames, `.sid` | none |
| improve | `critique({ prompt, description })`, `refine({ prompt, brief, description, instruction })` | critic, composer |

Everything else is importable too: `rasterklang-composer/gen/*` (the
generator: theory, melody, arrangement, instruments, styles, library),
`/score/*` (MIDI, MusicXML and ABC readers), `/export/sid.js`,
`/visual/sidstate.js` (per-frame SID state for visualisers).

## Determinism

A song is a recipe: brief, prompt and seed. The same recipe gives the same
bytes on every machine. Draws use seeded generators, never `Math.random`.
The prompt is part of the seed, so render a brief with the prompt it was
written for. `codeHash()` from `rasterklang-composer/node` fingerprints the
generator code; store it next to a song to know which code made it.

## Docs

- [How it works](docs/how-it-works.md): the five steps in detail
- [Brief format](docs/brief-format.md): every field the composer writes
- [`the design notes`](the design notes): composition building blocks, the HVSC
  inventory, the rhythm corpus, the SID-idiom spectrum

Comments in the code cite design records as `adr/NNNN`. Those belong to
rasterklang-compose, the app this library was extracted from.

## Related

- [rasterklang-dsl](https://github.com/dnoegel/rasterklang-dsl): the music language the songs are written in
- [rasterklang-score](https://github.com/dnoegel/rasterklang-score): compiler from DSL to SID register frames
- [rasterklang-wasm](https://github.com/dnoegel/rasterklang-wasm): the SID engine in WebAssembly, used for WAV rendering (npm: `rasterklang-wasm`)

## Credits and license

MIT, see [LICENSE](LICENSE). The pattern, sound and profile tables in
`src/gen/library/` are statistics and short instrument programs derived from
the [High Voltage SID Collection](https://www.hvsc.c64.org) and its STIL;
thanks to the HVSC team and to every musician in it. WAV files are rendered
with [rasterklang-wasm](https://www.npmjs.com/package/rasterklang-wasm) (MIT).
