// Sound profiles. 'legacy' emits the instrument bank as
// designed, balanced by ear under rasterklang-score 0.1.2, where every note of
// a voice took its default instrument's envelope. 'tuned' emits envelopes found
// by scripts/tune-envelopes.mjs so that score 0.2.0 (each instrument plays its
// own adsr) keeps that balance. Data in tuned.js, generated with tuned.json.

import { TUNED } from './tuned.js';

export const SOUNDS = ['legacy', 'tuned'];
// the score compiler each profile is meant for (renderFrames option `score`)
export const SCORE_OF = { legacy: '0.1', tuned: '0.2' };

// Custom lead rule: maps the envelope the model asked for to the one played.
// Attack is capped, sustain has a floor (s' = floor + s * (15 - floor) / 15, so
// percussive and held leads still differ), decay and release are clamped.
export const IDENTITY_RULE = { aMax: 15, sFloor: 0, dMin: 0, dMax: 15, rMin: 0, rMax: 15 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function customEnvelope([a, d, s, r], rule) {
  const q = { ...IDENTITY_RULE, ...rule };
  return [
    Math.min(a, q.aMax),
    clamp(d, q.dMin, Math.max(q.dMin, q.dMax)),
    Math.round(q.sFloor + (s * (15 - q.sFloor)) / 15),
    clamp(r, q.rMin, Math.max(q.rMin, q.rMax)),
  ];
}

// The tuning object for a profile name; `legacy` has none.
export function tuningFor(sound) {
  if (sound === 'legacy') return null;
  if (sound === 'tuned') return TUNED;
  throw new Error(`unknown sound profile "${sound}" (${SOUNDS.join(', ')})`);
}

// Echo variant: decay capped at dMax, sustain sinks by sDrop (the designed rule).
export const ECHO_RULE = { dMax: 6, sDrop: 6 };

// Held variant of a lead, for notes of at least `minSteps` grid steps: the
// played envelope gets at least this decay, sustain and release, so a
// percussive lead stays percussive on short notes but its long notes do not die.
export const HOLD_RULE = { minSteps: 3, dMin: 10, sMin: 9, rMin: 6 };
export function holdEnvelope([a, d, s, r], rule) {
  const q = { ...HOLD_RULE, ...rule };
  return [a, Math.max(d, q.dMin), Math.max(s, q.sMin), Math.max(r, q.rMin)];
}

// Bass rule: every bass instrument except the
// listed percussive ones sustains at least sMin, applied after the profile's
// own envelope. The bank's basses decay to sustain 5-10, which put the app's
// low end about 3 dB under the HVSC; the tuner keeps bass levels inside the
// legacy band, so it could not lift them. No rule = as designed.
export function bassEnvelope(name, [a, d, s, r], rule) {
  if (!rule || (rule.except || []).includes(name)) return [a, d, s, r];
  return [a, d, Math.max(s, rule.sMin ?? 0), r];
}
