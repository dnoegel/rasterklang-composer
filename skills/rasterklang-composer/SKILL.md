---
name: rasterklang-composer
description: Compose Commodore 64 SID music from a prompt. Use when the user wants a C64 or chiptune song, a .sid file, SID music for a game, demo or video, or a WAV of such music. You write the song brief yourself; rasterklang-composer renders it. No API key needed.
---

# Composing C64 music with rasterklang-composer

You act as the composer model: you read the prompt, write a song brief in
JSON, and the library writes every note and renders `.sid`, `.dsl` and
`.wav`. Run commands from the rasterklang-composer checkout (or use
`rk-composer` if it is linked).

## Steps

1. Read the rules and the menu once:
   `node bin/rk-composer.js menu`
   This is the exact system prompt the composer model gets. Follow it.
2. Create the song folder with the arrangement code draws for this prompt:
   `node bin/rk-composer.js draw "<prompt>" [--seed n] [--dir out/<name>]`
   It writes `request.md` (system and user prompt) and `draw.json`. Treat the
   user prompt as your task. Keep the drawn key, form, sounds and textures
   unless they clearly work against the prompt.
3. Write `answer.json` into that folder: one JSON object matching
   `node bin/rk-composer.js schema`. Every field is required. Use only ids
   from the menu. `examples/briefs/*.json` (field `answer`) are complete,
   good answers.
4. Render: `node bin/rk-composer.js render out/<name>`
   This writes `song.sid`, `song.wav`, `song.dsl`, `song.json` and
   `versions/1/`. Invalid values are repaired and listed, errors stop the
   render: fix `answer.json` and render again rather than accepting repairs.
5. Check the printed summary (style, key, bpm, form, seconds) against your
   intent. To change the song, edit `answer.json` and render again (a new
   version), or render another melody variant with `--seed n`.

## Writing a good brief

- Decide the style by groove and bass idiom first; mood mostly by mode,
  then tempo, register and articulation. Make choices clearly
  characteristic; neutral music is the common failure.
- Place the song on `sid_idiom`: game, arcade, space, neon and demo prompts
  lean C64-native (1); named acoustic genres lean faithful (0).
- Write a chorus theme (and ideally a verse theme): a short motif, mostly
  steps, one leap to a high point, ending on 1, 3 or 5. Scale degrees, one
  token per 16th step in 4/4.
- Give main sections their own `drums_pattern` and `bass_pattern` when the
  genre needs a specific groove; let the bass move.
- Contrast verse and chorus (energy, texture, groove or harmony); let
  `energy` and `energy_end` tell the story.
- Different `--seed` values give different melodies of the same brief; to
  try a different arrangement, run `draw` again with another seed.

The full field reference is `docs/brief-format.md`.
