// Variety of the rendered lead: how much a melody repeats
// itself inside a section, how much a repeated section changes, and a
// fingerprint to compare songs. Used to rank candidates (inside a song
// only, so a song link always renders the same) and by
// scripts/variety.mjs to compare songs offline.

// Lead bars grouped by section occurrence: { key, type, index, bars: [{ rhythm, exact, shape }] }.
// rhythm: onset steps; exact: rhythm + pitches; shape: rhythm + intervals
// (the same motif transposed has the same shape).
export function leadBars(plan, leadNotes) {
  const byBar = new Map();
  for (const n of leadNotes) {
    if (!byBar.has(n.bar)) byBar.set(n.bar, []);
    byBar.get(n.bar).push(n);
  }
  return plan.sections.map((s, i) => {
    const bars = [];
    for (let b = 0; b < s.bars; b += 1) {
      const notes = byBar.get(s.startBar + b);
      if (!notes?.length) continue;
      const rhythm = notes.map((n) => n.step).join(',');
      const iv = notes.slice(1).map((n, k) => n.pitch - notes[k].pitch).join(',');
      bars.push({ bar: b, rhythm, exact: `${rhythm}|${notes.map((n) => n.pitch).join(',')}`, shape: `${rhythm}|${iv}` });
    }
    return { index: i, type: s.type, occurrence: s.occurrence, bars };
  }).filter((s) => s.bars.length);
}

export function measureVariety(plan, leadNotes) {
  const secs = leadBars(plan, leadNotes);
  let barsTotal = 0;
  let repeated = 0;
  const shapes = new Set();
  const rhythms = new Set();
  for (const s of secs) {
    const seen = new Set();
    for (const b of s.bars) {
      barsTotal += 1;
      if (seen.has(b.exact)) repeated += 1;
      seen.add(b.exact);
      shapes.add(b.shape);
      rhythms.add(b.rhythm);
    }
  }
  // later occurrences against the first one, bar by bar
  const first = {};
  let compared = 0;
  let same = 0;
  let sameShape = 0;
  for (const s of secs) {
    if (!first[s.type]) { first[s.type] = s; continue; }
    const ref = new Map(first[s.type].bars.map((b) => [b.bar, b]));
    for (const b of s.bars) {
      if (!ref.has(b.bar)) continue;
      compared += 1;
      if (ref.get(b.bar).exact === b.exact) same += 1;
      if (ref.get(b.bar).shape === b.shape) sameShape += 1;
    }
  }
  const n = Math.max(1, barsTotal);
  return {
    bars: barsTotal,
    // share of bars that repeat an earlier bar of the same section exactly
    withinRepeat: repeated / n,
    // distinct motif shapes and rhythms per bar of lead
    shapeVariety: shapes.size / n,
    rhythmVariety: rhythms.size / n,
    // share of bars of a repeated section identical to its first occurrence
    repeatSame: compared ? same / compared : null,
    // the same, transposition-free: an octave-up last chorus keeps its hook
    repeatShape: compared ? sameShape / compared : null,
  };
}

// Penalty for ranking candidates. Bands: a hook may come back, but at most
// a quarter of a section's bars repeat exactly; a repeated section keeps
// its head (at least a third of its bars) and changes at least an eighth.
export function varietyPenalty(v) {
  const dist = (x, a, b) => (x < a ? a - x : x > b ? x - b : 0);
  let p = dist(v.withinRepeat, 0, 0.25) * 2 + dist(v.shapeVariety, 0.45, 1);
  if (v.repeatSame !== null) p += dist(v.repeatSame, 0.35, 0.88);
  return p;
}

// Song fingerprint for comparing songs: bar rhythms and interval
// trigrams (transposition-free).
export function fingerprint(plan, leadNotes) {
  const rhythms = new Set();
  const grams = new Set();
  for (const s of leadBars(plan, leadNotes)) for (const b of s.bars) rhythms.add(b.rhythm);
  for (let i = 3; i < leadNotes.length; i += 1) {
    grams.add([1, 2, 3].map((k) => leadNotes[i - 3 + k].pitch - leadNotes[i - 4 + k].pitch).join(','));
  }
  return { rhythms: [...rhythms], grams: [...grams] };
}

export function jaccard(a, b) {
  const A = new Set(a);
  let inter = 0;
  for (const x of b) if (A.has(x)) inter += 1;
  const union = A.size + new Set(b).size - inter;
  return union ? inter / union : 0;
}
