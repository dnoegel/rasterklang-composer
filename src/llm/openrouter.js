// One structured chat call to OpenRouter, shared by the server and the
// scripts (scripts/intent-models.mjs compares models with the exact request
// the server sends).

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
      'x-title': 'Rasterklang Compose',
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
