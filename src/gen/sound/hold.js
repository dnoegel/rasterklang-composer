// Held variants of lead notes (tuned sound profile): a lead note of at least
// `minSteps` grid steps plays `<inst>hold`, whose envelope the profile's hold
// rule lengthens (instruments.js). Short notes keep the designed envelope. The
// emitter knows each note's length, as a tracker's instrument table would.

import { roleOfInstrument } from '../roles.js';

// voices: per voice, per bar, cells { tok, inst }. Returns new voices.
export function applyHold(voices, rule) {
  if (!rule) return voices;
  return voices.map((bars) => bars.map((bar) => bar.map((c, i) => {
    if (!c.inst || roleOfInstrument(c.inst) !== 'lead') return c;
    let e = i + 1;
    while (e < bar.length && bar[e].tok === '_') e += 1;
    return e - i >= rule.minSteps ? { ...c, inst: `${c.inst}hold` } : c;
  })));
}
