// One cast per song: a song keeps at most three lead sounds and
// two bass sounds, and a section change that changes too much at once is
// announced with a fill or keeps the bass sound it had. Runs on every brief
// (rule-based and model-written) before the plan is made; it draws nothing,
// so the same brief always gets the same cast. The listener tagged a section
// change of a model brief "diced (sections don't fit)" in listening session 1;
// src/eval/cohesion.js measures it.
import { cohesion, DICED_LOAD } from '../eval/cohesion.js';

export const MAX_LEADS = 3;
export const MAX_BASS_SOUNDS = 2;

// Keeps the `max` sounds that play the most bars (the chorus sound first);
// a dropped sound becomes the sound of the nearest earlier section that kept
// one, else the most played one, so the change it caused goes away.
function limitCast(sections, get, set, max, first = null) {
  const bars = new Map();
  for (const s of sections) { const k = get(s); if (k) bars.set(k, (bars.get(k) || 0) + s.bars); }
  if (bars.size <= max) return [];
  const order = [...bars.keys()].sort((a, b) => (b === first) - (a === first) || bars.get(b) - bars.get(a));
  const keep = new Set(order.slice(0, max));
  const notes = [];
  let prev = null;
  for (const s of sections) {
    const k = get(s);
    if (k && !keep.has(k)) {
      const to = prev || order[0];
      set(s, to);
      notes.push(`${s.type}: ${k} -> ${to}`);
    }
    if (get(s)) prev = get(s);
  }
  return notes;
}

// brief: a validated brief. Returns { brief, notes } (a copy when anything changed).
export function orchestrate(brief) {
  const b = structuredClone(brief);
  const secs = b.sections || [];
  const notes = [];
  const chorus = secs.find((s) => s.type === 'chorus')?.lead || null;
  notes.push(...limitCast(secs, (s) => s.lead, (s, v) => { s.lead = v; }, MAX_LEADS, chorus).map((n) => `lead ${n}`));
  const palette = b.palette?.bass || null;
  const bassOf = (s) => s.bassSound || palette;
  notes.push(...limitCast(secs, bassOf, (s, v) => { if (v === palette) delete s.bassSound; else s.bassSound = v; }, MAX_BASS_SOUNDS, palette).map((n) => `bass ${n}`));

  // boundaries that change too much at once, left to right (each fix can move
  // the load of the next boundary): announce them with a fill, and if that is
  // not enough keep the bass sound the previous section had
  for (let i = 0; i + 1 < secs.length; i += 1) {
    const at = () => cohesion({ sections: secs, palette: b.palette }).boundaries[i];
    let x = at();
    if (!x.diced) continue;
    const a = secs[i];
    const next = secs[i + 1];
    if (!x.announced) {
      a.transition = 'fill';
      notes.push(`fill before ${next.type} at bar ${x.bar}`);
      x = at();
    }
    if (x.diced && x.changes.includes('bassSound')) {
      if (bassOf(a) === palette) delete next.bassSound; else next.bassSound = bassOf(a);
      notes.push(`${next.type} at bar ${x.bar} keeps bass ${bassOf(a)}`);
    }
  }
  return { brief: notes.length ? b : brief, notes };
}

export { DICED_LOAD };
