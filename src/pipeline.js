// Prompt to song in five steps, without a server, a database or a
// provider: the model is a function handed in, so the same steps run in an
// app, the CLI (bin/rk-composer.js) and experiments.
//
//   read     the reader model reads the prompt; null when it fails
//   draw     code draws constraints, key, arrangement and sounds
//   write    the composer model writes the brief, validated, one retry with the
//            errors or a theme follow-up
//   render   brief + seed -> DSL, frames and .sid (code only)
//   compose  all of the above, research included when a piece is named
//
// llm({ role, system, user, turns, schemaName, schema, temperature, maxTokens,
// timeoutMs, reasoning }) -> { answer, usage }; role is 'reader', 'composer'
// or 'critic', so a caller can give each its own model.
// gen: the generator's module set (src/generator.js, the default).
// rand: () => [0, 1) for the draws; seededRand() makes them reproducible.
// This file lives outside src/gen so it does not change the code hash.

import { themeFollowUp } from './eval/theme-fit.js';
import { buildSid } from './export/sid.js';
import { Rng } from './gen/prng.js';
import { generator } from './generator.js';

export const seededRand = (...labels) => {
  const rng = new Rng('pipeline', ...labels);
  return () => rng.next();
};

// the three readings should differ in what code draws
const drawnLine = (lines, prefix) => lines.find((l) => l.startsWith(prefix));
const sameDraw = (a, b) => ['Set the tempo', 'Form:', 'Style:'].some((p) => drawnLine(a, p) && drawnLine(a, p) === drawnLine(b, p));

export function createPipeline({ gen = generator, llm = null, rand = seededRand('default'), log = () => {} } = {}) {
  const G = gen;

  // First pass: a small model reads the prompt; code draws from
  // that reading. On any failure the rule-based reading stands in (null).
  async function read(prompt) {
    if (!llm) return null;
    const started = Date.now();
    try {
      const { answer, model } = await llm({
        role: 'reader', system: G.understandSystemPrompt(), user: G.understandPrompt(prompt), schemaName: 'prompt_reading', schema: G.understandSchema(),
        temperature: 0.2, maxTokens: 800, timeoutMs: 15000, reasoning: { enabled: false },
      });
      const reading = G.cleanUnderstanding(answer);
      if (!reading) return null;
      return { ...reading, ...(model ? { model } : {}), ms: Date.now() - started };
    } catch (err) {
      log(`prompt reading failed, rule-based reading used: ${String(err.message).slice(0, 200)}`);
      return null;
    }
  }

  // What code decides before the composer writes: one reading or three
  // (each with its own lens, constraints and key, and tempo, form and style
  // that differ). keys: key names to use instead of drawing them (one per
  // reading); a user's melody picks its own key. Returns
  // [{ user, constraints, reading }]: the composer's user prompt and what
  // was drawn (stored with the brief).
  function draw({ prompt, understanding = null, count = 1, melody = null, keys = null }) {
    const keyLines = (n) => (melody ? [] : (keys || G.drawKeys(rand, n)).map(G.keyConstraint));
    if (count === 1) {
      const constraints = G.drawConstraints(rand, 2);
      constraints.push(...keyLines(1));
      const arrangement = G.drawArrangement(rand, { prompt, understanding });
      return [{ user: G.userPrompt(prompt, constraints, null, melody, arrangement), constraints: [...constraints, ...arrangement], reading: null }];
    }
    const drawnKeys = keyLines(count);
    const all = G.drawConstraints(rand, 6);
    const assignments = G.lensAssignments(rand);
    for (const a of assignments) {
      const taken = assignments.filter((x) => x.arrangement);
      a.arrangement = G.drawArrangement(rand, { intros: a.intros, prompt, understanding });
      for (let t = 0; t < 8 && taken.some((x) => sameDraw(x.arrangement, a.arrangement)); t += 1) {
        a.arrangement = G.drawArrangement(rand, { intros: a.intros, prompt, understanding });
      }
    }
    return assignments.map((assignment, i) => {
      const constraints = [...all.slice(i * 2, i * 2 + 2), ...drawnKeys.slice(i, i + 1)];
      return { user: G.userPromptWithLens(prompt, constraints, assignment, melody, assignment.arrangement), constraints: [...constraints, ...assignment.arrangement], reading: i + 1 };
    });
  }

  // The draws of an interpretation: the piece fixes tempo, form,
  // key and the bass, so code draws only sounds and textures; three
  // readings get the lenses, all on the same material.
  function drawInterpretation({ prompt, understanding, material, count = 1 }) {
    const fixed = { ...understanding, fixed: [...new Set([...(understanding?.fixed || []), 'tempo', 'form', 'bass'])] };
    const arrangement = () => G.drawArrangement(rand, { prompt, understanding: fixed }).filter((l) => !/^(Start directly|Open with)/.test(l));
    if (count === 1) {
      const a = arrangement();
      return [{ user: G.interpretationUserPrompt(prompt, material, a), constraints: a, reading: null }];
    }
    return G.LENSES_INTERPRETATION.map((lens, i) => {
      const a = arrangement();
      return { user: G.interpretationUserPrompt(prompt, material, a, lens), constraints: a, reading: i + 1 };
    });
  }

  // One brief from the composer: validate, at most one retry, with the
  // validation errors or, when the themes clash with their chords, a short
  // follow-up on the model's own answer (src/eval/theme-fit.js). A user's
  // melody replaces its section's theme; material (an interpretation's real
  // notes) goes into its sections and is not checked against chords.
  // Returns validateBrief's { brief, repairs, errors } plus usage.
  async function write({ prompt, user, melody = null, material = null }) {
    if (!llm) throw new Error('write needs an llm; without one use compose(), which falls back to the rule-based brief');
    let result;
    let usage = null;
    let errors = null;
    const schema = material ? G.interpretationSchema(material.segments.map((x) => x.id)) : G.briefSchema();
    const toBrief = (answer) => {
      const b = G.answerToBrief(answer, prompt);
      return G.validateBrief(material ? G.applyMaterial(b, answer, material) : b);
    };
    const ask = (text, turns = [], s = schema) => llm({ role: 'composer', system: G.systemPrompt(), user: text, turns, schemaName: 'song_brief', schema: s, temperature: 0.9, maxTokens: 6000, timeoutMs: 90000 });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const text = errors ? `${user}\n\nYour previous brief had these problems, fix them:\n${errors.map((e) => `- ${e}`).join('\n')}` : user;
      const out = await ask(text);
      usage = out.usage;
      result = toBrief(out.answer);
      if (!result.errors.length) {
        // the user's melody replaces its theme below and is not checked
        if (attempt === 0 && !melody && !material) {
          ({ result, usage } = await themeFollowUp({ prompt, out, result, ask: (turns) => ask(user, turns, G.briefSchema()), gen: G }));
        }
        break;
      }
      errors = result.errors;
    }
    if (melody) {
      // the user's melody replaces the theme of its section, in the chosen key
      const notes = G.melodyToTheme(melody.notes, result.brief.keyRoot, result.brief.mode, G.SCALES);
      if (notes) {
        const again = G.validateBrief({ ...result.brief, themes: { ...result.brief.themes, [melody.section]: { notes, user: true } } });
        result = { ...again, repairs: [...result.repairs, ...again.repairs] };
        result.brief.userMelody = melody;
      }
    }
    return { ...result, usage };
  }

  // A refinement keeps the song's generator version (the caller's gen) and,
  // for an interpretation, its notes. description: describeTune of the
  // rendered song, what the code actually built.
  function refine({ prompt, brief, description = '', instruction }) {
    const { brief: current } = G.validateBrief(brief);
    return write({ prompt, user: G.refinePrompt(prompt, current, description, instruction), material: G.materialFromBrief(current) });
  }

  // The critic: how well a rendered song fits its prompt (1-5) and what to change.
  async function critique({ prompt, description }) {
    const { answer, usage } = await llm({
      role: 'critic', system: G.critiqueSystemPrompt(), user: G.critiquePrompt(prompt, description), schemaName: 'critique', schema: G.critiqueSchema(),
      temperature: 0.4, maxTokens: 6000, timeoutMs: 90000,
    });
    return { ...answer, fit: Math.max(1, Math.min(5, Number(answer.fit) || 3)), usage };
  }

  // Code only: brief + seed -> tune (DSL, plan, summary), frames and .sid.
  function render(brief, { prompt = '', seed = 1, intent = null, title = null, author = 'rasterklang-composer' } = {}) {
    const tune = G.composeBrief(brief, { prompt, seed, intent });
    const { frames, barStarts } = G.renderFrames(tune.dsl, tune.plan.totalBars, { score: tune.score });
    const sid = buildSid(frames, barStarts, { title: title || tune.title, author });
    return { tune, frames, barStarts, sid };
  }

  // The whole path for one song; without an llm the rule-based reading and
  // brief (Instant mode). research(prompt, interpretation) -> material
  // (research.mjs) is needed only when the prompt names a piece; without it,
  // or when no score is found, the result says so instead of guessing.
  // step(name) reports progress: reading, researching, composing, rendering.
  async function compose(prompt, { seed = 1, melody = null, research = null, step = () => {} } = {}) {
    if (!llm) {
      const { intent, brief } = G.briefFromPrompt(prompt, seed);
      return { understanding: null, constraints: [], material: null, brief, repairs: [], errors: [], usage: null, ...render(brief, { prompt, seed, intent }) };
    }
    step('reading');
    const understanding = await read(prompt);
    let drawn;
    let material = null;
    if (understanding?.interpretation && !melody) {
      if (!research) return { notFound: true, understanding, reason: 'the prompt names a piece, and no research was given' };
      step('researching');
      material = await research(prompt, understanding.interpretation);
      if (material.notFound) return { notFound: true, understanding, material, reason: material.reason };
      [drawn] = drawInterpretation({ prompt, understanding, material });
    } else {
      [drawn] = draw({ prompt, understanding, melody });
    }
    step('composing');
    const written = await write({ prompt, user: drawn.user, melody, material });
    step('rendering');
    // request: what the composer got, to look at or to hand to another composer
    return { understanding, constraints: drawn.constraints, request: { system: G.systemPrompt(), user: drawn.user }, material, ...written, ...render(written.brief, { prompt, seed }) };
  }

  return { gen: G, read, draw, drawInterpretation, write, refine, critique, render, compose };
}
