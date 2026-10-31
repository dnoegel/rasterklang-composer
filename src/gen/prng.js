// Seeded randomness. The generator never calls Math.random: every stage
// derives its own stream from (seed, generator version, stage label), so a
// change to one stage's rules does not reshuffle the others.

// xmur3 string hash -> 32-bit seed.
export function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

// mulberry32: small, fast, good enough for musical choices.
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(...labels) {
    this.labels = labels;
    this.next = mulberry32(hash(labels.join('|')));
  }

  // A child stream for a sub-stage, independent of how much this one was used.
  static derive(...labels) {
    return new Rng(...labels);
  }

  float(lo = 0, hi = 1) {
    return lo + (hi - lo) * this.next();
  }

  int(lo, hi) {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  // weights: { key: weight } or [[item, weight], ...]
  weighted(weights) {
    const entries = Array.isArray(weights) ? weights : Object.entries(weights);
    const total = entries.reduce((s, [, w]) => s + Math.max(0, w), 0);
    let r = this.next() * total;
    for (const [item, w] of entries) {
      r -= Math.max(0, w);
      if (r <= 0) return item;
    }
    return entries[entries.length - 1][0];
  }
}
