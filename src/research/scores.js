// Score sources for interpretations: search machine-readable
// scores (Mutopia: classical MIDI; The Session: folk tunes in ABC), load
// one by id or by a URL the model found on the web, and reduce it to what
// three SID voices play. Downloads are https only, public hosts only, at
// most 5 MB, and cached in memory.

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { readScoreFile } from './src/score/read.js';
import { reduceScore } from './src/score/reduce.js';

const UA = 'rasterklang-compose (private C64 music generator)';
const MAX_BYTES = 5 * 1024 * 1024;

const privateV4 = (ip) => {
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
};
const privateIp = (ip) => (isIP(ip) === 4 ? privateV4(ip)
  : /^(::1?|fc|fd|fe8|fe9|fea|feb|::ffff:)/i.test(ip) && !(/^::ffff:/i.test(ip) && !privateV4(ip.slice(7))));

// The model picks URLs: never let it reach the cluster or the host.
async function safeUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('not a valid URL'); }
  if (url.protocol !== 'https:') throw new Error('only https URLs');
  if (url.username || url.password || (url.port && url.port !== '443')) throw new Error('URL not allowed');
  const addrs = await lookup(url.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw new Error('host not allowed');
  return url;
}

export async function fetchBytes(raw, timeoutMs = 15000) {
  let url = await safeUrl(raw);
  // follow redirects by hand, checking every hop
  for (let hop = 0; hop < 4; hop += 1) {
    const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await safeUrl(new URL(res.headers.get('location'), url).href);
      continue;
    }
    if (!res.ok) throw new Error(`download failed (${res.status})`);
    if (Number(res.headers.get('content-length')) > MAX_BYTES) throw new Error('file too large');
    const chunks = [];
    let size = 0;
    for await (const chunk of res.body) {
      size += chunk.length;
      if (size > MAX_BYTES) throw new Error('file too large');
      chunks.push(chunk);
    }
    return { bytes: Buffer.concat(chunks), type: res.headers.get('content-type') || '', url: url.href };
  }
  throw new Error('too many redirects');
}

const strip = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

// Mutopia: public-domain and CC typeset scores with MIDI
async function searchMutopia(query) {
  const url = `https://www.mutopiaproject.org/cgibin/make-table.cgi?searchingfor=${encodeURIComponent(query)}`;
  const { bytes } = await fetchBytes(url);
  const html = bytes.toString('utf8');
  const out = [];
  for (const chunk of html.split(/<table/).slice(1)) {
    const cells = [...chunk.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => strip(m[1]));
    const midi = /href="(https:\/\/www\.mutopiaproject\.org\/ftp\/[^"]+?(?:-mids\.zip|\.mid))"/.exec(chunk);
    if (!midi || !cells[0]) continue;
    out.push({
      id: `mutopia:${midi[1]}`,
      title: cells[0],
      by: cells[1]?.replace(/^by\s+/, ''),
      info: [cells[2], cells[4]].filter((x) => x && x !== ' ').join(', '),
      source: 'Mutopia (typeset score, MIDI)',
    });
    if (out.length >= 8) break;
  }
  return out;
}

// The Session: traditional dance tunes in ABC, several settings each
const SESSION_METER = { reel: '4/4', hornpipe: '4/4', barndance: '4/4', strathspey: '4/4', jig: '6/8', slide: '12/8', polka: '2/4', waltz: '3/4', mazurka: '3/4', 'slip jig': '9/8', march: '4/4', 'three-two': '3/2' };
async function searchSession(query) {
  const { bytes } = await fetchBytes(`https://thesession.org/tunes/search?q=${encodeURIComponent(query)}&format=json&perpage=6`);
  const data = JSON.parse(bytes.toString('utf8'));
  return (data.tunes || []).slice(0, 6).map((t) => ({
    id: `session:${t.id}`,
    title: t.name,
    by: 'traditional',
    info: `${t.type}${SESSION_METER[t.type] ? ` (${SESSION_METER[t.type]})` : ''}`,
    source: 'The Session (folk tune, ABC)',
  }));
}

export async function searchScores(query) {
  const q = String(query || '').slice(0, 120);
  const [mutopia, session] = await Promise.allSettled([searchMutopia(q), searchSession(q)]);
  const results = [...(mutopia.value || []), ...(session.value || [])];
  const failed = [mutopia, session].filter((r) => r.status === 'rejected').map((r) => String(r.reason?.message || r.reason).slice(0, 80));
  return { results, ...(failed.length ? { failed } : {}) };
}

// id -> files: [{ name, reduced }]
const cache = new Map();
export async function loadScore(id, opts = {}) {
  const key = `${id}|${opts.lead ?? ''}|${opts.bass ?? ''}`;
  if (cache.has(key)) return cache.get(key);
  let files;
  if (id.startsWith('session:')) {
    const tuneId = Number(id.split(':')[1]);
    if (!Number.isInteger(tuneId)) throw new Error('bad tune id');
    const { bytes } = await fetchBytes(`https://thesession.org/tunes/${tuneId}?format=json`);
    const tune = JSON.parse(bytes.toString('utf8'));
    const setting = tune.settings?.[0];
    if (!setting?.abc) throw new Error('tune has no ABC');
    const meter = SESSION_METER[tune.type] || '4/4';
    const len = ['polka', 'slide'].includes(tune.type) ? (tune.type === 'slide' ? '1/8' : '1/8') : '1/8';
    const abc = `X:1\nT:${tune.name}\nM:${meter}\nL:${len}\nK:${setting.key.replace(/(major|minor|dorian|mixolydian|lydian|phrygian|locrian)$/i, (m) => m.slice(0, 3))}\n${setting.abc.replace(/!/g, '\n')}`;
    files = readScoreFile(Buffer.from(abc), tune.name);
  } else {
    const url = id.startsWith('mutopia:') ? id.slice(8) : id.startsWith('url:') ? id.slice(4) : id;
    const { bytes, url: final } = await fetchBytes(url);
    files = readScoreFile(bytes, final.split('/').pop());
  }
  const out = files.map((f) => {
    try { return { name: f.name, reduced: reduceScore(f.score, opts) }; } catch (err) { return { name: f.name, error: err.message }; }
  }).filter((f) => f.reduced);
  if (!out.length) throw new Error('no readable score in the file');
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  cache.set(key, out);
  return out;
}
