// Code-drawn variants of a model brief: "New variant" on an AI
// song keeps what the model decided about the prompt (style, blend, moods,
// mode, meter, form, the chorus hook and its chords) and lets the style
// sampler redraw how it is played: key, tempo, groove, bass, feel, texture,
// lead and bass sounds, the drum kit, other sections' harmony and themes.
// Seed 1 is the model's brief unchanged; every other seed is one variant,
// deterministic, so links, ratings and favourites replay it.

import { Rng } from './prng.js';
import { sampleBrief, GENERATOR_VERSION } from './brief.js';
import { blendStyles } from './styles.js';
import { MINOR_MODES } from './theory.js';

const KEEP_CHORDS = new Set(['chorus']);

export function varyBrief(brief, prompt, seed) {
  if (brief.source !== 'llm' || !(seed > 1)) return { brief, changed: [] };
  const key = `${seed}|${prompt.trim().toLowerCase()}`;
  const rng = new Rng(key, GENERATOR_VERSION, 'vary');
  const style = blendStyles(brief.style, brief.blend?.style, brief.blend?.amount || 0);
  // the user's own melody is played as written: its key stays
  // so are the notes of a score
  const userTheme = Object.values(brief.themes || {}).some((t) => t.user) || brief.sections.some((s) => s.score);
  const [lo, hi] = style.tempo;
  const tempo = brief.interpretation ? Math.round(brief.tempo * rng.float(0.92, 1.08))
    : Math.round(Math.max(lo * 0.85, Math.min(hi * 1.15, brief.tempo * rng.float(0.9, 1.1))));
  const intent = {
    moods: brief.moods,
    energy: brief.energy || 0,
    tempo,
    meter: brief.meter,
    key: { root: brief.keyRoot, minor: MINOR_MODES.has(brief.mode) },
    form: brief.form,
  };
  const drawn = sampleBrief(intent, `${key}|draw`, brief.style, brief.blend);
  const byType = {};
  for (const s of drawn.sections) byType[s.type] = byType[s.type] || s;
  const fallback = drawn.sections.find((s) => s.type === 'verse') || drawn.sections[0];

  const out = structuredClone(brief);
  const changed = [];
  if (!userTheme) {
    const shift = rng.pick([-5, -3, -2, 2, 3, 5]);
    out.keyRoot = (brief.keyRoot + shift + 12) % 12;
    changed.push('key');
  }
  if (tempo !== brief.tempo) { out.tempo = tempo; changed.push('tempo'); }
  out.palette = { ...brief.palette, bass: drawn.palette.bass, snare: drawn.palette.snare, kit: drawn.palette.kit, arp: drawn.palette.arp };
  if (['bass', 'snare', 'kit', 'arp'].some((f) => out.palette[f] !== brief.palette[f])) changed.push('sounds');
  const swapped = new Set();
  const newChords = {};
  const keepPattern = {};
  out.sections.forEach((s, i) => {
    const own = byType[s.type];
    const d = own || fallback;
    // grooves and bass figures only fit their meter (an unusual meter
    // the style's pool lacks keeps the model's)
    if (drawn.meter === brief.meter) {
      s.groove = d.groove;
      s.bass = d.bass;
      s.feel = d.feel;
    }
    // a section kind the draw lacks keeps the model's texture and chords
    if (own) s.texture = own.texture;
    // the chorus keeps its lead so the hook keeps its colour, mostly
    if (s.type !== 'chorus' || rng.chance(0.4)) s.lead = d.lead;
    delete s.bassSound;
    // the model's own patterns stay now and then (per section kind)
    for (const f of ['drumPattern', 'bassPattern', 'arpPattern']) {
      const k = `${s.type}|${f}`;
      if (keepPattern[k] === undefined) keepPattern[k] = rng.chance(0.3);
      if (s[f] && !keepPattern[k]) delete s[f];
    }
    // harmony: the chorus keeps the model's chords (the hook sits on them);
    // other kinds get the sampler's progression half the time, per type
    if (own && !KEEP_CHORDS.has(s.type) && !s.score) {
      if (newChords[s.type] === undefined) newChords[s.type] = rng.chance(0.5);
      if (newChords[s.type]) { s.chords = own.chords; s.chordBars = own.chordBars; swapped.add(s.type); }
    }
    const was = brief.sections[i];
    for (const f of ['groove', 'bass', 'texture', 'lead']) if (s[f] !== was[f] && !changed.includes(f)) changed.push(f);
  });
  if (swapped.size) changed.push(`chords (${[...swapped].join(', ')})`);
  // themes other than the chorus hook are written anew by the code now and
  // then; the user's melody and the chorus stay
  const themes = {};
  const dropped = [];
  for (const [type, t] of Object.entries(brief.themes || {})) {
    if (t.user || type === 'chorus' || rng.chance(0.4)) themes[type] = t;
    else dropped.push(type);
  }
  out.themes = themes;
  if (dropped.length) changed.push(`new ${dropped.join(', ')} melody`);
  out.variant = { seed, changed };
  return { brief: out, changed };
}
