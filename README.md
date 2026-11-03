# rasterklang-composer

**Prompt in, Commodore 64 music out.**

https://github.com/user-attachments/assets/80d4df37-2e61-4b8b-8eaf-e0d9ff2b4cde

```sh
git clone https://github.com/dnoegel/rasterklang-composer.git && cd rasterklang-composer
npm install && npm link

rk-composer "cracktro for a lost floppy disk, fast and cocky" --offline   # no key needed
```

Each run writes a song folder: `song.sid` (plays on a real C64 and in any SID
player), `song.wav`, `song.dsl` ([rasterklang-dsl](https://github.com/dnoegel/rasterklang-dsl)
source) and `answer.json`, the brief you can edit. Node 22+.

## How it works

A language model never writes notes. It decides what a song should be; code
writes every note.

| Step | Who | What |
| --- | --- | --- |
| read | small model | genre candidates, moods, energy, story arc, a named piece |
| draw | code | key, tempo position, form, sounds, textures (randomness lives here) |
| write | large model | a song brief: grooves, bass idioms, chords, form, energy curve, a hook in scale degrees |
| render | code | motif development, chord tones on strong beats, arpeggios, three-voice arrangement, SID sounds |
| improve | code + model | repair invalid choices, one retry, themes that clash with their chords go back to the model, best of 8 melodies |

Without a model, `--offline` reads the prompt by keywords and samples the brief
from the style data.

## Commands

```sh
rk-composer "a chase across wet rooftops at night"          # compose → out/<title>/
rk-composer refine out/<song> "slower, darker chorus"       # the model changes the brief
rk-composer render out/<song> --seed 4                      # another melody variant, no model
rk-composer render out/<song>                               # after editing answer.json
rk-composer critique out/<song>                             # fit 1-5 and a suggestion
rk-composer draw "a waltz for falling leaves"               # request.md for your own agent
rk-composer menu | schema                                   # what the composer model sees
```

Every change becomes `versions/<n>/` in the same folder; point any command at
`out/<song>/versions/2` to continue from an earlier state. stdout prints only
the folder, so commands chain: `dir=$(rk-composer "…") && rk-composer critique "$dir"`.

Options: `--seed n`, `--offline`, `--critique`, `--no-wav`, `--dir d`,
`--reader <model>`, `--composer <model>`. Models run on
[OpenRouter](https://openrouter.ai) with `OPENROUTER_API_KEY`; defaults are
DeepSeek V4.1 Flash (read) and Claude Sonnet 5.5 (write, refine, critique).

**No key, your coding agent composes:** `rk-composer draw "…"` writes the exact
request the model would get; the agent writes `answer.json`, then
`rk-composer render <dir>`. See [`skills/rasterklang-composer`](skills/rasterklang-composer/SKILL.md)
and 40 model-written briefs in [`examples/briefs`](examples/briefs).

## As a library

```js
import { createPipeline } from 'rasterklang-composer';
import { openRouter, renderWav } from 'rasterklang-composer/node';

const P = createPipeline({ llm: openRouter({ key: process.env.OPENROUTER_API_KEY }) });
const song = await P.compose('a haunted carnival at midnight');
song.sid.bytes;                              // PSID file
song.tune.dsl;                               // rasterklang-dsl source
await renderWav(song.frames);                // WAV bytes

const reading = await P.read(prompt);        // or step by step
const [drawn] = P.draw({ prompt, understanding: reading });
const { brief } = await P.write({ prompt, user: drawn.user });
const { sid } = P.render({ ...brief, tempo: 90 }, { prompt, seed: 2 });
```

`llm` is any `({ role, system, user, schema, … }) => { answer, usage }` with
role `reader`, `composer` or `critic`; plug in any provider or a recorded
answer. `createPipeline()` without `llm` composes rule-based. The generator
itself (`rasterklang-composer/gen/*`), score readers (`/score/*`: MIDI, MusicXML,
ABC) and the SID exporter (`/export/sid.js`) are importable too.

## What's inside

- 30 styles as data (metal, synthwave, bossa nova, jig, ragtime, doom, …), 33
  grooves, 48 bass idioms, 28 textures, 34 progressions, 7 modes.
- Rhythm, groove and sound statistics learned from the
  [High Voltage SID Collection](https://www.hvsc.c64.org): which one-bar lead
  rhythms, bass figures and instrument shapes are common in C64 music.
- A spectrum from "this genre, played on a SID" to "fully C64-native" (running
  octave basses, arpeggio chords, echo, ring and sync leads), chosen per prompt.
- Named works ("Vivaldi's Autumn on the C64"): the model searches public score
  sources (Mutopia, The Session) and code plays the real themes. No score, no song.

A song is brief + prompt + seed: the same recipe renders the same bytes on
every machine.

Docs: [how it works](docs/how-it-works.md), [brief format](docs/brief-format.md).
Related: [rasterklang-dsl](https://github.com/dnoegel/rasterklang-dsl),
[rasterklang-score](https://github.com/dnoegel/rasterklang-score),
[rasterklang-wasm](https://www.npmjs.com/package/rasterklang-wasm) (SID engine for WAV).

MIT. Thanks to the HVSC team and the C64 musicians whose work it preserves.
