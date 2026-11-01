// How well a song's sections fit together (the listener's "diced, sections
// don't fit" tag, listening session 1): read from the plan, no
// audio. At each section boundary it counts what changes at once (lead
// sound, bass sound, groove, melody feel, bass figure, mode, voice roles); a
// fill, a stop or a dropout before the boundary, or a boundary into or out
// of an intro, outro or breakdown, announces the change and counts one less.
// Over the song it counts the cast: distinct lead and bass sounds.
import { TEXTURES } from '../gen/library/textures.js';

export const DICED_LOAD = 3; // a boundary at or above this load is diced
const WEIGHTS = { lead: 1, bassSound: 1, groove: 1, feel: 0.5, bass: 0.5, mode: 0.5, roles: 1 };
const FRAMING = new Set(['intro', 'outro', 'breakdown']);

const rolesOf = (texture, end) => {
  const st = TEXTURES[texture]?.stages;
  if (!st) return null;
  return (end ? st[st.length - 1] : st[0])[1];
};
// share of the three voices whose role differs across the boundary
const roleChange = (a, b) => {
  if (!a || !b) return 0;
  let n = 0;
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) n += 1;
  return n / 3;
};

// plan: { sections: [{ type, bars, lead, bassSound, groove, feel, bass, mode, texture, transition }], palette: { bass } }
export function cohesion(plan) {
  const secs = plan.sections || [];
  const bassOf = (s) => s.bassSound || plan.palette?.bass || null;
  const boundaries = [];
  let bar = 0;
  for (let i = 0; i < secs.length; i += 1) {
    const a = secs[i];
    bar += a.bars || 0;
    const b = secs[i + 1];
    if (!b) break;
    const changes = [];
    if (a.lead && b.lead && a.lead !== b.lead) changes.push('lead');
    if (bassOf(a) !== bassOf(b)) changes.push('bassSound');
    if (a.groove && b.groove && a.groove !== b.groove) changes.push('groove');
    if (a.feel && b.feel && a.feel !== b.feel) changes.push('feel');
    if (a.bass && b.bass && a.bass !== b.bass) changes.push('bass');
    if ((a.mode || null) !== (b.mode || null)) changes.push('mode');
    const roles = roleChange(rolesOf(a.texture, true), rolesOf(b.texture, false));
    let load = changes.reduce((s, c) => s + WEIGHTS[c], 0) + roles * WEIGHTS.roles;
    const announced = ['fill', 'stop', 'dropout'].includes(a.transition) || FRAMING.has(a.type) || FRAMING.has(b.type);
    if (announced) load -= 1;
    boundaries.push({ bar, from: a.type, to: b.type, changes, roles: Math.round(roles * 100) / 100, announced, load: Math.round(load * 100) / 100, diced: load >= DICED_LOAD });
  }
  const leads = new Set(secs.map((s) => s.lead).filter(Boolean));
  const basses = new Set(secs.map(bassOf).filter(Boolean));
  return {
    leads: leads.size,
    bassSounds: basses.size,
    boundaries,
    diced: boundaries.filter((x) => x.diced).length,
    maxLoad: boundaries.reduce((m, x) => Math.max(m, x.load), 0),
  };
}
