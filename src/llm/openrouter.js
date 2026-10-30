// One structured chat call to OpenRouter, shared by the server and the
// scripts (scripts/intent-models.mjs compares models with the exact request
// the server sends).

export async function chatJson({ url, key, model, system, user, turns = [], schemaName, schema, temperature = 0.9, maxTokens = 6000, timeoutMs = 90000, reasoning = null }) {
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
  const content = data.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map((c) => c.text || '').join('') : content;
  const answer = JSON.parse(String(text).replace(/^```(json)?|```$/g, '').trim());
  return { answer, usage: data.usage || null };
}
