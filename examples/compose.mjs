// Prompt to .sid and .wav in a few lines.
//   OPENROUTER_API_KEY=... node examples/compose.mjs "a haunted carnival at midnight"
// Without a key the rule-based composer runs instead.
import { writeFileSync } from 'node:fs';
import { createPipeline, seededRand } from 'rasterklang-composer';
import { openRouter, renderWav } from 'rasterklang-composer/node';

const prompt = process.argv.slice(2).join(' ') || 'a haunted carnival at midnight';
const key = process.env.OPENROUTER_API_KEY;
const P = createPipeline({ llm: key ? openRouter({ key }) : null, rand: seededRand(prompt) });

const song = await P.compose(prompt, { step: (s) => console.error(s) });
writeFileSync('song.sid', song.sid.bytes);
writeFileSync('song.wav', await renderWav(song.frames));
console.log(song.tune.title, song.tune.summary.style, song.tune.summary.key, `${song.tune.summary.bpm} bpm`);
