// OpenRouter calls: one structured chat call (chatJson), one step of a
// tool-calling conversation (chatStep) and a web search (webSearch). Node only.

import { AsyncLocalStorage } from 'node:async_hooks';

// What the model calls of one request cost: run the
// request inside costMeter.run({ usd: 0, calls: 0 }, ...) and every call
// below adds OpenRouter's reported cost. Without a reported cost the tokens
// are priced like Sonnet, so the meter errs on the high side.
export const costMeter = new AsyncLocalStorage();
// the app name OpenRouter shows for these requests
let appTitle = 'rasterklang-composer';
export function configure({ title } = {}) {
  if (title) appTitle = title;
}
export const usageCost = (u) => (Number.isFinite(u?.cost) ? u.cost : ((u?.prompt_tokens || 0) * 3 + (u?.completion_tokens || 0) * 15) / 1e6);
function meter(usage) {
  const m = costMeter.getStore();
  if (!m) return;
  m.usd += usageCost(usage);
  m.calls += 1;
}

// Some models cannot switch reasoning off; they get the lowest effort instead.
export async function chatJson(opts) {
  try {
    return await chatOnce(opts);
  } catch (err) {
    if (opts.reasoning?.enabled === false && /reasoning is mandatory/i.test(err.message)) {
      return { ...(await chatOnce({ ...opts, reasoning: { effort: 'low' } })), reasoning: 'low' };
    }
    throw err;
  }
}

async function chatOnce({ url, key, model, system, user, turns = [], schemaName, schema, temperature = 0.9, maxTokens = 6000, timeoutMs = 90000, reasoning = null }) {
  const res = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      'x-title': appTitle,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] },
        { role: 'user', content: user },
        ...turns,
      ],
      response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
      usage: { include: true },
      // e.g. { enabled: false } for the quick first pass
      ...(reasoning ? { reasoning } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${data?.error?.message || 'error'}`);
  // OpenRouter keeps slow requests alive with whitespace and then reports a
  // provider failure in the body of a 200 response
  if (data?.error) throw new Error(`OpenRouter: ${data.error.message || 'error'}${data.error.code ? ` (${data.error.code})` : ''}${data.error.metadata?.provider_name ? `, ${data.error.metadata.provider_name}` : ''}`);
  meter(data.usage);
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  const text = Array.isArray(content) ? content.map((c) => c.text || '').join('') : content;
  // an answer cut off at max_tokens (reasoning counts too) or an empty one
  // says so, instead of failing later on a broken brief
  const why = `finish ${choice?.finish_reason || '?'}, ${data.usage?.completion_tokens ?? '?'} tokens`;
  if (!text || !String(text).trim()) throw new Error(`empty answer (${why})`);
  let answer;
  try {
    answer = JSON.parse(String(text).replace(/^```(json)?|```$/g, '').trim());
  } catch (err) {
    throw new Error(`no valid JSON (${why}): ${err.message}`);
  }
  if (!answer || typeof answer !== 'object') throw new Error(`no JSON object (${why})`);
  return { answer, usage: data.usage || null };
}

// One step of a tool-calling conversation: returns the
// assistant message (content and/or tool_calls) to append.
export async function chatStep({ url, key, model, messages, tools, toolChoice = 'auto', temperature = 0.3, maxTokens = 4000, timeoutMs = 60000, plugins = null, reasoning = null }) {
  const res = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'x-title': appTitle },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages,
      ...(tools ? { tools, tool_choice: toolChoice } : {}),
      ...(plugins ? { plugins } : {}),
      ...(reasoning ? { reasoning } : {}),
      usage: { include: true },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${data?.error?.message || 'error'}`);
  if (data?.error) throw new Error(`OpenRouter: ${data.error.message || 'error'}`);
  meter(data.usage);
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error('empty answer');
  return { message, usage: data.usage || null };
}

// Web search through OpenRouter's web plugin: a small model reads the
// results and lists what matters, with the URLs it found.
export async function webSearch({ url, key, model, query, timeoutMs = 30000 }) {
  const { message, usage } = await chatStep({
    url, key, model, timeoutMs, maxTokens: 1200, temperature: 0.1,
    plugins: [{ id: 'web', max_results: 6 }],
    reasoning: { enabled: false },
    messages: [
      { role: 'system', content: 'Answer from the web results only. Be short and factual. List useful pages with their full URLs, especially direct links to MIDI (.mid), MusicXML (.mxl, .musicxml, .xml) or ABC (.abc) files.' },
      { role: 'user', content: query },
    ],
  });
  const text = Array.isArray(message.content) ? message.content.map((c) => c.text || '').join('') : String(message.content || '');
  const links = (message.annotations || []).filter((a) => a.type === 'url_citation')
    .map((a) => `${a.url_citation.url} | ${a.url_citation.title || ''} | ${String(a.url_citation.content || '').replace(/\s+/g, ' ').slice(0, 300)}`);
  return { text: `${text.slice(0, 3000)}${links.length ? `\nSources:\n${[...new Set(links)].slice(0, 10).join('\n')}` : ''}`, usage };
}
