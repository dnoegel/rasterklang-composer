// Measurements on the rendered lead, used as gates and for ranking
// candidates. Targets are research defaults:
// repeats 15-25 %, steps 45-60 %, skips 15-20 %, leaps <= 10 %;
// chord tones on strong beats >= 80 %; range an octave to two.

export function measureLead(leadNotes) {
  const n = leadNotes.length;
  if (n < 8) return { ok: false, reason: 'too few lead notes', score: -1 };
  let strong = 0;
  let strongChord = 0;
  const iv = { rep: 0, step: 0, skip: 0, leap: 0 };
  const ranges = {};
  for (let i = 0; i < n; i += 1) {
    const x = leadNotes[i];
    const key = `${x.section}${Math.floor(x.bar / 8)}`;
    const r = ranges[key] || (ranges[key] = [Infinity, -Infinity]);
    r[0] = Math.min(r[0], x.pitch);
    r[1] = Math.max(r[1], x.pitch);
    if (x.strong) {
      strong += 1;
      if (x.chord.tones.includes(x.pitch % 12)) strongChord += 1;
    }
    if (i > 0) {
      const d = Math.abs(x.pitch - leadNotes[i - 1].pitch);
      if (d === 0) iv.rep += 1;
      else if (d <= 2) iv.step += 1;
      else if (d <= 4) iv.skip += 1;
      else iv.leap += 1;
    }
  }
  const m = n - 1;
  const share = { rep: iv.rep / m, step: iv.step / m, skip: iv.skip / m, leap: iv.leap / m };
  const chordTone = strong ? strongChord / strong : 1;
  // widest range within one 8-bar span (the octave lift of a late chorus
  // is a planned variation, not a wide melody)
  const range = Math.max(...Object.values(ranges).map(([a, b]) => b - a));
  const dist = (v, a, b) => (v < a ? a - v : v > b ? v - b : 0);
  const penalty = dist(share.rep, 0.1, 0.28) + dist(share.step, 0.4, 0.62) + dist(share.skip, 0.1, 0.25)
    + dist(share.leap, 0, 0.12) * 2 + dist(chordTone, 0.8, 1) * 2 + dist(range, 12, 24) / 12;
  const ok = chordTone >= 0.7 && range >= 9 && range <= 28;
  return { ok, reason: ok ? null : 'outside gates', score: 1 - penalty, chordTone, range, share, notes: n };
}
