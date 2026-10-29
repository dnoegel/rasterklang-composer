// Do the model's themes fit the chords it wrote under them? The generator
// plays a brief theme as written and only snaps notes that rub a semitone
// against the chord, so a theme written for other chords sounds off-key
// (radio, 2026-10-29). A song whose whole lead misses the melody gate
// (under 70 % chord tones on strong beats, measureLead) is sent back to the
// model; the follow-up names each theme under 80 %, measured on the rendered
// lead of the section's first occurrence, which plays the theme as written.
import { composeBrief } from '../gen/compose.js';
import { validateBrief } from '../gen/brief.js';
import { answerToBrief } from '../gen/menu.js';
import { SCALES } from '../gen/theory.js';

export const THEME_FIT_GATE = 0.7;
export const THEME_FIT_MIN = 0.8;

// scale degree of a pitch class in the key, as the brief writes it (6, 4#, 7b)
function degreeOf(pc, keyRoot, mode) {
  const rel = (pc - keyRoot + 12) % 12;
  const scale = SCALES[mode];
  const i = scale.indexOf(rel);
  if (i >= 0) return String(i + 1);
  const below = scale.indexOf((rel + 11) % 12);
  if (below >= 0) return `${below + 1}#`;
  return `${scale.indexOf((rel + 1) % 12) + 1}b`;
}

// -> { chordTone, misfits: [{ section, share, bars: [{ bar, chord,
// chordDegrees, notes }] }] }: the song's share (seed 1, as the radio and the
// compose tab play it) and, when it misses THEME_FIT_GATE, the themes below
// THEME_FIT_MIN. A user's own melody is never checked (it plays as written).
export function themeFit(brief, prompt = '') {
  const themes = Object.entries(brief.themes || {}).filter(([, t]) => !t.user);
  if (!themes.length) return { chordTone: null, misfits: [] };
  const tune = composeBrief(brief, { prompt, seed: 1, withLead: true });
  const { chordTone } = tune.measure;
  if (!(chordTone < THEME_FIT_GATE)) return { chordTone, misfits: [] };
  const out = [];
  for (const [type, theme] of themes) {
    const sec = tune.plan.sections.find((s) => s.type === type);
    if (!sec) continue;
    const n = theme.bars.length;
    let strong = 0;
    let fit = 0;
    const bars = new Map();
    for (const x of tune.leadNotes) {
      const b = x.bar - sec.startBar;
      // theme bars sit at positions 0..n-1 of every four bars
      if (x.section !== type || b < 0 || b >= sec.bars || b % 4 >= n || !x.strong) continue;
      strong += 1;
      if (x.chord.tones.includes(x.pitch % 12)) { fit += 1; continue; }
      const bar = (b % 4) + 1;
      const key = `${bar} ${x.chord.symbol}`;
      if (!bars.has(key)) {
        bars.set(key, { bar, chord: x.chord.symbol, chordDegrees: x.chord.tones.map((t) => degreeOf(t, sec.keyRoot, brief.mode)), notes: [] });
      }
      const d = degreeOf(x.pitch % 12, sec.keyRoot, brief.mode);
      if (!bars.get(key).notes.includes(d)) bars.get(key).notes.push(d);
    }
    const share = strong ? fit / strong : 1;
    if (share < THEME_FIT_MIN) out.push({ section: type, share, bars: [...bars.values()].sort((a, b) => a.bar - b.bar) });
  }
  return { chordTone, misfits: out };
}

// Short follow-up for the model: what clashes, where, and what to do.
export function themeFitText(misfits, brief) {
  const lines = misfits.map((m) => {
    const sec = brief.sections.find((s) => s.type === m.section);
    const where = m.bars.map((b) => `bar ${b.bar} over ${b.chord} (${b.chordDegrees.join(' ')}): ${b.notes.join(', ')}`).join('; ');
    return `- ${m.section} theme over ${sec.chords.join(' ')}: only ${Math.round(m.share * 100)} % chord tones on the beats. Off: ${where}.`;
  });
  return `Your themes do not fit the chords under them, so they sound off-key. On the beats, at least ${Math.round(THEME_FIT_MIN * 100)} % of a theme's notes must belong to the chord of their bar (degrees in brackets); code only fixes notes a semitone off.\n${lines.join('\n')}\nReturn the complete brief again: rewrite these themes so their beat notes are chord tones (or change those chords to fit the melody), keep everything else.`;
}

const fitOf = (brief, prompt) => {
  try {
    return themeFit(brief, prompt);
  } catch (err) {
    console.warn('theme fit check failed', err);
    return { chordTone: null, misfits: [] };
  }
};
// token counts of both calls (numbers add up, the rest is the last call's)
const addUsage = (a, b) => (a && b ? Object.fromEntries(Object.entries(b).map(([k, v]) => [k, typeof v === 'number' && typeof a[k] === 'number' ? a[k] + v : v])) : b || a);
const shares = (fit) => ({
  chordTone: fit.chordTone === null ? null : +fit.chordTone.toFixed(2),
  themes: fit.misfits.map((m) => ({ section: m.section, share: +m.share.toFixed(2) })),
});

// The follow-up on a valid first answer (server makeBrief). out: { answer,
// usage } of the first call, result: its validateBrief result, ask(turns):
// the same model call with the answer and the follow-up appended. The new
// brief is kept only if it is valid and fits better; if the call fails, the
// first brief stays. brief.themeRetry records the shares and which was kept.
export async function themeFollowUp({ prompt, out, result, ask }) {
  const fit = fitOf(result.brief, prompt);
  if (!fit.misfits.length) return { result, usage: out.usage };
  const themeRetry = { before: shares(fit), kept: 'first' };
  let usage = out.usage;
  try {
    const again = await ask([
      { role: 'assistant', content: JSON.stringify(out.answer) },
      { role: 'user', content: themeFitText(fit.misfits, result.brief) },
    ]);
    usage = addUsage(out.usage, again.usage);
    const next = validateBrief(answerToBrief(again.answer, prompt));
    if (!next.errors.length) {
      const after = fitOf(next.brief, prompt);
      themeRetry.after = shares(after);
      if ((after.chordTone ?? 1) > fit.chordTone) {
        themeRetry.kept = 'retry';
        result = next;
      }
    }
  } catch (err) {
    console.warn('theme follow-up failed, keeping the first brief', err);
  }
  result.brief.themeRetry = themeRetry;
  return { result, usage };
}
