// Node helpers around the pipeline: an OpenRouter model per role, research
// of named pieces, WAV through the real SID engine and the generator's code
// hash.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chatJson } from './llm/openrouter.js';
import { research } from './research/research.js';
import { renderPcm } from './render/sid-node.js';
import { encodeWav } from 'rasterklang-score/export/wavExport.js';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1';
// defaults: a fast model reads the prompt, a strong one composes and criticises
export const DEFAULT_MODELS = Object.freeze({
  reader: 'deepseek/deepseek-v4.1-flash-1017',
  composer: 'anthropic/claude-sonnet-5.5',
});

// The llm function of createPipeline() for OpenRouter: one model per role
// (reader, composer, critic; the critic uses the composer's by default).
export function openRouter({ key, url = OPENROUTER_URL, models = {} } = {}) {
  if (!key) throw new Error('openRouter: key required');
  const m = { ...DEFAULT_MODELS, ...models };
  m.critic ||= m.composer;
  const llm = async ({ role, ...req }) => {
    const model = m[role] || m.composer;
    return { ...(await chatJson({ url, key, model, ...req })), model };
  };
  llm.models = m;
  return llm;
}

// The research argument of pipeline.compose(): finds a named piece's notes
// with score search, score reading and web search, or reports notFound.
export function openRouterResearch({ key, url = OPENROUTER_URL, models = {}, log = () => {} } = {}) {
  const m = { ...DEFAULT_MODELS, ...models };
  return (prompt, interpretation) => research({ prompt, interpretation, url, key, model: m.composer, searchModel: m.reader, log });
}

// frames (renderFrames or pipeline.render) -> 16-bit mono WAV bytes
export async function renderWav(frames, { sampleRate = 44100, model = '6581' } = {}) {
  const pcm = await renderPcm(frames, { sampleRate, model });
  const samples = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i += 1) samples[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32768)));
  return encodeWav(samples, sampleRate);
}

// Hash of the generator code (src/gen, or any directory): the same code
// gives the same hash, whatever the commit. Store it with a song to know
// which code made it.
export function codeHash(dir = join(import.meta.dirname, 'gen')) {
  const files = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.js')) files.push(p);
    }
  };
  walk(dir);
  const h = createHash('sha256');
  for (const f of files) h.update(f.slice(dir.length)).update(readFileSync(f));
  return h.digest('hex').slice(0, 12);
}

export { research } from './research/research.js';
export { chatJson, chatStep, webSearch, costMeter, usageCost, configure } from './llm/openrouter.js';
export { renderPcm } from './render/sid-node.js';
