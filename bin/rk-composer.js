#!/usr/bin/env node
// Prompt to C64 SID music on the command line. Every song is a folder:
//
//   out/dawn-over-the-breakwater/
//     song.sid  song.wav  song.dsl   the song
//     answer.json                    the brief in the composer's format: edit it, then `render`
//     song.json                      the recipe: prompt, seed, models, reading, draws, brief, history
//     request.md                     what the composer model got (system and user prompt)
//     critique.json                  the critic's verdicts, if asked
//     versions/1/ 2/ ...             every earlier state, playable
//
//   rk-composer "a lonely lighthouse in a storm"            compose into out/<title>/
//   rk-composer play out/<song>                            listen (song.wav with the system's player)
//   rk-composer refine out/<song> "brighter chorus, faster" the composer changes the brief
//   rk-composer render out/<song> [--seed 2]               after editing answer.json, or another variant
//   rk-composer critique out/<song>                        how well does it fit the prompt?
//   rk-composer draw "prompt" [--dir d]                    request.md only: your agent writes answer.json
//   rk-composer menu | schema                              the composer's system prompt, the answer schema
//
// Environment: OPENROUTER_API_KEY, RK_READER_MODEL, RK_COMPOSER_MODEL, OPENROUTER_URL.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createPipeline, seededRand, generator as G } from '../src/index.js';
import { openRouter, openRouterResearch, renderWav, codeHash, DEFAULT_MODELS, OPENROUTER_URL } from '../src/node.js';

const HELP = `rk-composer: prompt to C64 SID music

  rk-composer "prompt" [options]              compose a song into a folder (default out/<title>)
  rk-composer play <dir>                      listen to the song (song.wav, with the system's player)
  rk-composer refine <dir> "instruction"      let the composer change the song
  rk-composer render <dir> [--seed n]         render again: after editing answer.json, or another seed
  rk-composer critique <dir>                  ask the critic how well the song fits its prompt
  rk-composer draw "prompt" [--dir d]         write request.md only; you or your agent write answer.json
  rk-composer menu                            print the composer's system prompt (the menu)
  rk-composer schema                          print the JSON schema of answer.json

A song folder holds song.sid, song.wav, song.dsl, answer.json (the brief, editable),
song.json (the recipe and history), request.md and versions/<n>/ with every earlier state.

options
  -d, --dir <dir>        song folder for compose and draw (default out/<title>)
  -s, --seed <n>         seed for draws and rendering (default 1)
      --reader <model>   model that reads the prompt (default ${DEFAULT_MODELS.reader})
      --composer <model> model that writes, refines and criticises (default ${DEFAULT_MODELS.composer})
      --offline          rule-based reading and brief: no model, no key
      --critique         also ask the critic after composing
      --no-wav           skip song.wav (rendering it takes a few seconds)
  -h, --help

Models go through OpenRouter: set OPENROUTER_API_KEY.`;

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    dir: { type: 'string', short: 'd' },
    seed: { type: 'string', short: 's' },
    reader: { type: 'string' },
    composer: { type: 'string' },
    offline: { type: 'boolean' },
    critique: { type: 'boolean' },
    'no-wav': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

const say = (m) => process.stderr.write(`${m}\n`);
const fail = (m, code = 1) => {
  say(m);
  process.exit(code);
};
if (opt.help || !positionals.length) {
  console.log(HELP);
  process.exit(opt.help ? 0 : 1);
}
const COMMANDS = ['play', 'refine', 'render', 'critique', 'draw', 'menu', 'schema'];
const command = COMMANDS.includes(positionals[0]) ? positionals[0] : 'compose';
const args = command === 'compose' ? positionals : positionals.slice(1);

const key = process.env.OPENROUTER_API_KEY;
const url = process.env.OPENROUTER_URL || OPENROUTER_URL;
const models = {
  reader: opt.reader || process.env.RK_READER_MODEL || DEFAULT_MODELS.reader,
  composer: opt.composer || process.env.RK_COMPOSER_MODEL || DEFAULT_MODELS.composer,
};
const llm = () => {
  if (!key) fail('OPENROUTER_API_KEY is not set. Use --offline for the rule-based composer, or `draw` and write answer.json yourself.');
  return openRouter({ key, url, models });
};
const seedOf = (fallback) => (opt.seed ? Math.max(1, Number.parseInt(opt.seed, 10) || 1) : fallback);
const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);
const slug = (text) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'song';
const json = (x) => `${JSON.stringify(x, null, 1)}\n`;
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const requestText = ({ system, user }) => `# Request to the composer\n\nWrite answer.json: one JSON object matching \`rk-composer schema\`, then run \`rk-composer render <this folder>\`.\n\n## System prompt\n\n${system}\n\n## User prompt\n\n${user}\n`;

// Claims a new song folder: --dir if it is new or empty, else out/<slug>,
// out/<slug>-2, ... Creating the folder is the claim (mkdir fails when it
// exists), so two runs at the same time never share one.
function claimDir(name) {
  if (opt.dir) {
    if (existsSync(opt.dir) && readdirSync(opt.dir).length) fail(`${opt.dir} is not empty. Pick a new folder, or work on that song with refine or render.`);
    mkdirSync(opt.dir, { recursive: true });
    return opt.dir;
  }
  mkdirSync('out', { recursive: true });
  for (let n = 1; ; n += 1) {
    const dir = join('out', n === 1 ? slug(name) : `${slug(name)}-${n}`);
    try {
      mkdirSync(dir);
      return dir;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
}

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const quoted = (path) => (/^[\w./-]+$/.test(path) ? path : `'${path.replace(/'/g, "'\\''")}'`);

// What matters about a song, one fact per line on stderr, then where it is
// and what to do next. stdout gets only the folder, so `dir=$(rk-composer
// "...")` works.
function report(dir, song, note) {
  const { style, seconds } = song.summary;
  const files = ['song.wav', 'song.sid', 'song.dsl', 'answer.json'].filter((f) => existsSync(join(dir, f)));
  const d = quoted(dir);
  const nextSeed = Math.max(...song.history.map((h) => h.seed || 1), song.seed || 1) + 1;
  say([
    '',
    ...[
      ['title', song.title],
      ['style', style],
      ['length', clock(seconds)],
      ['version', `${song.history.length}${note ? ` (${note})` : ''}`],
    ].map(([k, v]) => `  ${k.padEnd(9)}${v}`),
    '',
    `  saved in ${resolve(dir)}/`,
    `           ${files.join('  ')}${song.history.length > 1 ? `   (versions 1-${song.history.length} in versions/)` : ''}`,
    '',
    '  Listen:',
    `    rk-composer play ${d}`,
    '',
    `  Ask the model to refine${key ? '' : ' (needs OPENROUTER_API_KEY)'}:`,
    `    rk-composer refine ${d} "slower, darker chorus"`,
    '',
    '  Render another variant without model:',
    `    rk-composer render ${d} --seed ${nextSeed}`,
    '',
  ].join('\n'));
  console.log(dir);
}

// Writes the song's files and, for a new state (event), a numbered copy of
// them in versions/; without an event only the files are written again.
async function save(dir, song, { brief, rendered, event = null }) {
  mkdirSync(dir, { recursive: true });
  const answerText = json(G.briefToAnswer(G.validateBrief(brief).brief));
  const history = event ? [...(song.history || []), { version: (song.history?.length || 0) + 1, at: new Date().toISOString(), ...event }] : song.history || [];
  const { style, key: songKey, bpm, meter, form } = rendered.tune.summary;
  const out = {
    ...song,
    title: rendered.tune.title,
    summary: { style, key: songKey, bpm, meter, form, seconds: Math.round(rendered.frames.length / 50) },
    generator: { version: G.GENERATOR_VERSION, codeHash: codeHash() },
    brief,
    // answer.json as written here; a different file means it was edited
    answerHash: hash(answerText),
    history,
  };
  writeFileSync(join(dir, 'answer.json'), answerText);
  writeFileSync(join(dir, 'song.json'), json(out));
  writeFileSync(join(dir, 'song.sid'), rendered.sid.bytes);
  writeFileSync(join(dir, 'song.dsl'), rendered.tune.dsl);
  // a song.wav of an earlier state would no longer match
  if (!opt['no-wav']) writeFileSync(join(dir, 'song.wav'), await renderWav(rendered.frames));
  else rmSync(join(dir, 'song.wav'), { force: true });
  if (event) {
    const v = join(dir, 'versions', String(history.length));
    mkdirSync(v, { recursive: true });
    for (const f of ['answer.json', 'song.json', 'song.sid', 'song.dsl', 'song.wav']) if (existsSync(join(dir, f))) cpSync(join(dir, f), join(v, f));
  }
  report(dir, out, event ? `${event.kind}${event.from ? ` of v${event.from}` : ''}${event.seed && event.seed !== 1 ? `, seed ${event.seed}` : ''}` : 'unchanged, files written again');
  return out;
}

// song.json, or for a folder from `draw` its draw.json
function loadSong(dir) {
  if (dir && existsSync(join(dir, 'song.json'))) return readJson(join(dir, 'song.json'));
  if (dir && existsSync(join(dir, 'draw.json'))) return { ...readJson(join(dir, 'draw.json')), history: [] };
  return fail(`${dir || '(no folder given)'}: not a song folder (no song.json or draw.json).`);
}

// A song folder or one of its versions/<n>. Work starts from that state;
// the result is always the next version of the song folder, never a folder
// inside versions/.
function openTarget(dir) {
  const path = String(dir || '').replace(/[\\/]+$/, '');
  const parent = dirname(path);
  if (path && basename(parent) === 'versions' && existsSync(join(dirname(parent), 'song.json'))) {
    const root = dirname(parent);
    const base = loadSong(path);
    return { root, source: path, from: Number(basename(path)) || basename(path), song: { ...base, history: loadSong(root).history } };
  }
  return { root: path, source: path, from: null, song: loadSong(path) };
}

// answer.json when it was edited or written by hand or agent, else the stored brief
function currentBrief(dir, song) {
  const file = join(dir, 'answer.json');
  if (!existsSync(file)) return song.brief ? { brief: song.brief, edited: false } : fail(`${dir}: no answer.json yet.`);
  const text = readFileSync(file, 'utf8');
  if (song.brief && hash(text) === song.answerHash) return { brief: song.brief, edited: false };
  // a bare answer, or { prompt, answer } as in examples/briefs
  const parsed = JSON.parse(text);
  const checked = G.validateBrief(G.answerToBrief(parsed.answer || parsed, song.prompt));
  for (const r of checked.repairs) say(`repaired: ${r}`);
  if (checked.errors.length) fail(`answer.json has errors:\n${checked.errors.map((e) => `- ${e}`).join('\n')}`);
  return { brief: checked.brief, edited: true, repairs: checked.repairs };
}

async function critique(dir, song, rendered, version = song.history?.length || null) {
  const c = await createPipeline({ llm: llm() }).critique({ prompt: song.prompt, description: G.describeTune(rendered.tune) });
  const file = join(dir, 'critique.json');
  const entry = { at: new Date().toISOString(), version, model: models.composer, fit: c.fit, assessment: c.assessment, issues: c.issues, suggestion: c.suggestion };
  writeFileSync(file, json([...(existsSync(file) ? readJson(file) : []), entry]));
  say(`fit     ${c.fit}/5\nverdict ${c.assessment}${c.suggestion ? `\nnext    ${c.suggestion}` : ''}`);
}

// WAV players that come with the system, first match wins
const PLAYERS = process.platform === 'win32'
  ? [['powershell', (f) => ['-NoProfile', '-Command', `(New-Object Media.SoundPlayer '${f.replace(/'/g, "''")}').PlaySync()`]]]
  : [['afplay', (f) => [f]], ['paplay', (f) => [f]], ['aplay', (f) => ['-q', f]], ['pw-play', (f) => [f]], ['ffplay', (f) => ['-nodisp', '-autoexit', '-loglevel', 'quiet', f]]];
const onPath = (bin) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], { stdio: 'ignore' }).status === 0;

if (command === 'play') {
  const [dir] = args;
  const song = loadSong(dir);
  const wav = join(dir, 'song.wav');
  if (!existsSync(wav)) {
    // made with --no-wav: render it now
    const rendered = createPipeline().render(currentBrief(dir, song).brief, { prompt: song.prompt, seed: song.seed });
    writeFileSync(wav, await renderWav(rendered.frames));
  }
  const player = PLAYERS.find(([bin]) => onPath(bin));
  if (!player) fail(`No audio player found (tried ${PLAYERS.map(([b]) => b).join(', ')}). Open ${resolve(wav)} with any player, or song.sid with a SID player.`);
  say(`playing  ${song.title || dir}  (${clock(song.summary?.seconds || 0)}, Ctrl+C stops)`);
  const r = spawnSync(player[0], player[1](resolve(wav)), { stdio: 'inherit' });
  process.exit(r.status ?? 0);
} else if (command === 'menu') {
  console.log(G.systemPrompt());
} else if (command === 'schema') {
  console.log(JSON.stringify(G.briefSchema(), null, 1));
} else if (command === 'draw') {
  // the composer's request without the composer, for an answer by hand or by agent
  const prompt = args.join(' ').trim();
  if (!prompt) fail('usage: rk-composer draw "prompt" [--dir d]');
  const seed = seedOf(1);
  const P = createPipeline({ llm: key && !opt.offline ? llm() : null, rand: seededRand(prompt, seed), log: say });
  const understanding = await P.read(prompt);
  const [drawn] = P.draw({ prompt, understanding });
  const dir = claimDir(prompt);
  writeFileSync(join(dir, 'request.md'), requestText({ system: G.systemPrompt(), user: drawn.user }));
  writeFileSync(join(dir, 'draw.json'), json({ prompt, seed, understanding, constraints: drawn.constraints }));
  say(`request ${join(dir, 'request.md')}\nnext    write ${join(dir, 'answer.json')}, then: rk-composer render ${dir}`);
  console.log(dir);
} else if (command === 'compose') {
  const prompt = args.join(' ').trim();
  const seed = seedOf(1);
  const offline = Boolean(opt.offline);
  const P = createPipeline({ llm: offline ? null : llm(), rand: seededRand(prompt, seed), log: say });
  const song = await P.compose(prompt, {
    seed,
    research: offline ? null : openRouterResearch({ key, url, models, log: say }),
    step: (s) => say(`${s.padEnd(10)}${offline ? '' : s === 'reading' ? models.reader : s === 'composing' ? models.composer : ''}`.trim()),
  });
  if (song.notFound) fail(`No score found for the named piece (${song.reason || 'unknown'}). Nothing was guessed.`, 2);
  const dir = claimDir(song.tune.title);
  const saved = await save(dir, {
    prompt, seed, source: offline ? 'rules' : 'model', models: offline ? null : models,
    understanding: song.understanding, constraints: song.constraints, repairs: song.repairs,
  }, { brief: song.brief, rendered: song, event: { kind: offline ? 'compose, rule-based' : 'compose', seed } });
  if (song.request) writeFileSync(join(dir, 'request.md'), requestText(song.request));
  if (opt.critique && !offline) await critique(dir, saved, song);
} else if (command === 'render') {
  const { root, source, from, song } = openTarget(args[0]);
  const { brief, edited, repairs } = currentBrief(source, song);
  const seed = seedOf(song.seed || 1);
  const rendered = createPipeline().render(brief, { prompt: song.prompt, seed });
  // from an earlier version, even an unchanged render is a new state
  const kind = !song.brief ? 'answer' : edited ? 'edit' : seed !== song.seed ? 'variant' : from ? 'render' : null;
  await save(root, { ...song, seed, ...(repairs ? { repairs } : {}) }, { brief, rendered, event: kind && { kind, seed, ...(from ? { from } : {}) } });
} else if (command === 'refine') {
  const [dir, ...words] = args;
  const instruction = words.join(' ').trim();
  if (!dir || !instruction) fail('usage: rk-composer refine <dir> "instruction"');
  const { root, source, from, song } = openTarget(dir);
  const { brief } = currentBrief(source, song);
  const P = createPipeline({ llm: llm(), log: say });
  // the critic and the composer read what the code actually built
  const description = G.describeTune(P.render(brief, { prompt: song.prompt, seed: song.seed }).tune);
  say(`refining ${models.composer}`);
  const written = await P.refine({ prompt: song.prompt, brief, description, instruction });
  if (written.errors?.length) fail(`the composer's brief has errors:\n${written.errors.map((e) => `- ${e}`).join('\n')}`);
  const rendered = P.render(written.brief, { prompt: song.prompt, seed: song.seed });
  await save(root, { ...song, models: { ...(song.models || {}), composer: models.composer }, repairs: written.repairs }, { brief: written.brief, rendered, event: { kind: 'refine', instruction, ...(from ? { from } : {}) } });
} else if (command === 'critique') {
  const { root, source, from, song } = openTarget(args[0]);
  await critique(root, song, createPipeline().render(currentBrief(source, song).brief, { prompt: song.prompt, seed: song.seed }), from || song.history?.length || null);
  console.log(root);
}
