// The research step of an interpretation: the composer model
// gets tools to find a piece's notes (score search, score reading, web
// search) and ends by submitting material. Runs at most RESEARCH_MAX_CALLS
// tool calls and a time budget; then it must submit.

import { chatStep, webSearch } from './tools/openrouter.mjs';
import { searchScores, loadScore } from './scores.mjs';
import { overviewText, barsText, extractMaterial } from './src/score/reduce.js';
import { researchSystemPrompt, researchUserPrompt, researchTools, buildMaterial, RESEARCH_MAX_CALLS } from './src/gen/interpret.js';

const BUDGET_MS = 100000;

export async function research({ prompt, interpretation, url, key, model, searchModel, log = () => {} }) {
  const started = Date.now();
  const tools = researchTools();
  const messages = [
    { role: 'system', content: researchSystemPrompt() },
    { role: 'user', content: researchUserPrompt(prompt, interpretation) },
  ];
  const loaded = new Map();
  const steps = [];
  let calls = 0;
  let modelCalls = 0;
  const getReduced = (id, file) => loaded.get(id)?.[file]?.reduced || null;

  const run = async (name, args) => {
    if (name === 'search_scores') {
      const r = await searchScores(args.query);
      if (!r.results.length) return `No scores found for "${args.query}".${r.failed ? ` (failed: ${r.failed.join('; ')})` : ''} Try other words, or web_search.`;
      return r.results.map((x) => `${x.id} | ${x.title} | ${x.by || ''} | ${x.info || ''} | ${x.source}`).join('\n');
    }
    if (name === 'web_search') {
      modelCalls += 1;
      const r = await webSearch({ url, key, model: searchModel, query: String(args.query || '').slice(0, 200) });
      return r.text || 'No results.';
    }
    if (name === 'load_score') {
      const id = String(args.id || '');
      const opts = {};
      if (Number.isInteger(args.lead_part) && args.lead_part >= 0) opts.lead = args.lead_part;
      if (Number.isInteger(args.bass_part) && args.bass_part >= 0) opts.bass = args.bass_part;
      const files = await loadScore(id, opts);
      loaded.set(id, files);
      return files.map((f, n) => `file ${n}: ${f.name}\n${overviewText(f.reduced)}`).join('\n\n');
    }
    if (name === 'show_bars') {
      const r = getReduced(String(args.id || ''), Number(args.file) || 0);
      if (!r) return 'Load the score first (load_score), then use its id and file index.';
      const from = Math.max(1, Number(args.from_bar) || 1);
      const to = Math.min(from + 23, Number(args.to_bar) || from + 7);
      return barsText(r, from, to);
    }
    return `unknown tool ${name}`;
  };

  // giving up counts only after a real search: two score searches and
  // one web search (or when time is up)
  const tried = { search_scores: 0, web_search: 0 };
  const notFound = (reason) => {
    log(`research found no score: ${String(reason).slice(0, 160)}, ${steps.length} steps, ${Math.round((Date.now() - started) / 1000)} s`);
    return { notFound: true, reason: String(reason || '').slice(0, 300), steps, calls: modelCalls, ms: Date.now() - started };
  };
  const ending = new Set(['submit_material', 'no_score_found']);
  for (let round = 0; round < RESEARCH_MAX_CALLS + 3; round += 1) {
    const late = calls >= RESEARCH_MAX_CALLS || Date.now() - started > BUDGET_MS;
    if (late && round > 0 && messages[messages.length - 1].role === 'tool') {
      messages.push({ role: 'user', content: 'Time is up: submit material from the scores you loaded, or call no_score_found.' });
    }
    modelCalls += 1;
    const { message } = await chatStep({
      url, key, model, messages, maxTokens: 8000, timeoutMs: 60000,
      tools: late ? tools.filter((t) => ending.has(t.function.name)) : tools,
      toolChoice: late ? 'required' : 'auto',
    });
    messages.push({ role: 'assistant', content: message.content ?? (message.tool_calls?.length ? null : ''), ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}) });
    const toolCalls = message.tool_calls || [];
    if (!toolCalls.length) {
      messages.push({ role: 'user', content: 'Use the tools, and finish with submit_material or no_score_found.' });
      continue;
    }
    for (const tc of toolCalls) {
      const name = tc.function?.name;
      let args = {};
      try { args = JSON.parse(tc.function?.arguments || '{}'); } catch { /* answered below */ }
      if (name === 'submit_material') {
        const built = buildMaterial(args, getReduced, extractMaterial);
        if (built.material) {
          // remaining tool calls of this turn are left unanswered: done
          log(`research done: ${built.material.work} (${built.material.fromScore}), ${steps.length} steps, ${Math.round((Date.now() - started) / 1000)} s`);
          return { ...built.material, steps, calls: modelCalls, ms: Date.now() - started, problems: built.problems };
        }
        messages.push({ role: 'tool', tool_call_id: tc.id, content: `Not usable: ${built.error}. Fix it and submit again, or call no_score_found.` });
        continue;
      }
      if (name === 'no_score_found') {
        const late = calls >= RESEARCH_MAX_CALLS || Date.now() - started > BUDGET_MS;
        if (late || (tried.search_scores >= 2 && tried.web_search >= 1)) return notFound(args.reason);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: `Not yet: search more first (${tried.search_scores} of 2 score searches, ${tried.web_search} of 1 web search for a MIDI, MusicXML or ABC file).` });
        continue;
      }
      if (name in tried) tried[name] += 1;
      calls += 1;
      let result;
      try {
        result = await run(name, args);
      } catch (err) {
        result = `Error: ${String(err.message || err).slice(0, 200)}`;
      }
      steps.push({ tool: name, args: Object.fromEntries(Object.entries(args).map(([k, v]) => [k, String(v).slice(0, 120)])), ok: !String(result).startsWith('Error') });
      messages.push({ role: 'tool', tool_call_id: tc.id, content: String(result).slice(0, 12000) });
    }
  }
  return notFound('the research did not finish');
}
