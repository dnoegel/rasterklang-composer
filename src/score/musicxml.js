// MusicXML (partwise, uncompressed) -> the score shape reduceScore reads
//. Pitches, durations, chords, ties, backup/forward between
// voices, time and key signature, tempo; repeats are not played out,
// grace notes are skipped.

const PPQ = 480;
const STEP_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const tagText = (xml, tag) => {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? m[1].trim() : null;
};

export function musicXmlScore(source) {
  const xml = String(source);
  if (/<score-timewise/.test(xml)) throw new Error('timewise MusicXML is not supported');
  const names = {};
  for (const m of xml.matchAll(/<score-part\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/score-part>/g)) {
    names[m[1]] = (tagText(m[2], 'part-name') || m[1]).replace(/<[^>]*>/g, '');
  }
  let num = null;
  let den = null;
  let fifths;
  let minor;
  let bpm = null;
  const parts = [];
  for (const pm of xml.matchAll(/<part\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/g)) {
    const notes = [];
    let divisions = 1;
    let tick = 0;
    let lastStart = 0;
    const tied = new Map();
    for (const mm of pm[2].matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)) {
      const body = mm[1];
      for (const ev of body.matchAll(/<(attributes|note|backup|forward|sound|direction)\b[^>]*?(?:\/>|>([\s\S]*?)<\/\1>)/g)) {
        const [whole, kind, inner = ''] = ev;
        if (kind === 'attributes') {
          const d = tagText(inner, 'divisions');
          if (d) divisions = Number(d) || divisions;
          if (num === null && tagText(inner, 'beats')) { num = Number(tagText(inner, 'beats')); den = Number(tagText(inner, 'beat-type')); }
          if (fifths === undefined && tagText(inner, 'fifths') !== null) { fifths = Number(tagText(inner, 'fifths')); minor = tagText(inner, 'mode') === 'minor'; }
          continue;
        }
        if (kind === 'sound' || kind === 'direction') {
          const t = /tempo="([\d.]+)"/.exec(whole);
          if (t && !bpm) bpm = Number(t[1]);
          continue;
        }
        const dur = Math.round(((Number(tagText(inner, 'duration')) || 0) / divisions) * PPQ);
        if (kind === 'backup') { tick -= dur; continue; }
        if (kind === 'forward') { tick += dur; continue; }
        if (/<grace\b/.test(inner)) continue;
        const chord = /<chord\s*\/>/.test(inner);
        const start = chord ? lastStart : tick;
        if (!chord) { lastStart = tick; tick += dur; }
        if (/<rest\b/.test(inner)) continue;
        const step = tagText(inner, 'step');
        const octave = tagText(inner, 'octave');
        if (!step || octave === null) continue;
        const pitch = (Number(octave) + 1) * 12 + STEP_PC[step] + Math.round(Number(tagText(inner, 'alter')) || 0);
        const stop = /<tie\s+type="stop"/.test(inner);
        const startTie = /<tie\s+type="start"/.test(inner);
        if (stop && tied.has(pitch)) {
          const n = tied.get(pitch);
          n.dur = start + dur - n.start;
          if (!startTie) tied.delete(pitch);
          continue;
        }
        const n = { pitch, start, dur };
        notes.push(n);
        if (startTie) tied.set(pitch, n);
      }
    }
    notes.sort((a, b) => a.start - b.start || b.pitch - a.pitch);
    if (notes.length) parts.push({ name: names[pm[1]] || pm[1], notes });
  }
  return { ppq: PPQ, num: num || 4, den: den || 4, bpm, fifths, minor, parts };
}
