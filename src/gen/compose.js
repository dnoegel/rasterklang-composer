// The whole pipeline: prompt -> intent -> plan -> N melody candidates ->
// best by measurement -> rasterklang-dsl source.

import { parsePrompt, describeIntent } from './intent.js';
import { makePlan, GENERATOR_VERSION } from './plan.js';
import { arrange } from './arrange.js';
import { emitDsl } from './emit.js';
import { measureLead } from './measure.js';
import { Rng } from './prng.js';
import { KEY_NAMES } from './theory.js';

const TITLE_A = {
  metal: ['Iron', 'Steel', 'Thunder', 'Blood', 'Fire', 'Black', 'Raven'],
  synthwave: ['Neon', 'Midnight', 'Chrome', 'Laser', 'Electric', 'Velvet', 'Sunset'],
  platformer: ['Sky', 'Coin', 'Mushroom', 'Pixel', 'Cloud', 'Lucky', 'Jumping'],
  jig: ['Green', 'Silver', 'Merry', 'Old', 'Wandering', 'Highland', 'Copper'],
};
const TITLE_B = {
  metal: ['Crusade', 'Legion', 'Gallows', 'Forge', 'Storm', 'Throne', 'March'],
  synthwave: ['Drive', 'Skyline', 'Horizon', 'Boulevard', 'Mirage', 'Runner', 'Dreams'],
  platformer: ['Kingdom', 'Hills', 'Run', 'Quest', 'Island', 'Castle', 'Bounce'],
  jig: ['Fiddler', 'Piper', 'Tavern', 'Road', 'Lass', 'Harbour', 'Ramble'],
};

export function compose(prompt, seed = 1, { candidates = 8 } = {}) {
  const intent = parsePrompt(prompt);
  // The prompt text is part of the seed: two prompts that mean the same
  // still give two different tunes; the same prompt and seed always give
  // the same tune.
  const seedKey = `${seed}|${prompt.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  const plan = makePlan(intent, seedKey);
  plan.seedNumber = seed;
  let best = null;
  for (let k = 0; k < candidates; k += 1) {
    const rng = new Rng(seedKey, GENERATOR_VERSION, 'arrange');
    const melodyRng = new Rng(seedKey, GENERATOR_VERSION, 'melody', k);
    const arrangement = arrange(plan, rng, melodyRng);
    const m = measureLead(arrangement.leadNotes);
    const score = (m.ok ? 1 : 0) + m.score;
    if (!best || score > best.score) best = { arrangement, measure: m, score, candidate: k };
  }
  const tr = new Rng(seedKey, GENERATOR_VERSION, 'title');
  const title = `${tr.pick(TITLE_A[plan.styleId])} ${tr.pick(TITLE_B[plan.styleId])}`;
  const dsl = emitDsl(plan, best.arrangement, title);
  return {
    title,
    prompt,
    seed,
    version: GENERATOR_VERSION,
    intent,
    plan,
    dsl,
    measure: best.measure,
    candidate: best.candidate,
    summary: summarize(intent, plan, best.arrangement),
  };
}

const IDIOM_DE = {
  root_8ths: 'Grundton in Achteln', gallop: 'Galopp-Bass (Achtel + zwei Sechzehntel)', pedal_16ths: 'Orgelpunkt in Sechzehnteln',
  half_note: 'lange Grundtöne', octave_8ths: 'Oktav-Bass in Achteln', octave_16th: 'Oktav-Bass in Sechzehnteln',
  driving_8ths: 'treibende Achtel', sustained: 'lang gehaltene Basstöne', oom_pah: 'Umpa-Bass (Grundton, Quinte)',
  bouncy: 'hüpfender Oktav-Quint-Bass', walk: 'laufender Bass mit Durchgangstönen', skip: 'springender Bass',
  drone: 'Bordun (liegender Grundton)', one_four: 'Grundton auf 1 und 4',
};
const MODE_DE = {
  phrygian: 'phrygisch: sehr dunkel, mit kleiner Sekunde', harmonic: 'harmonisch Moll: dunkel und spannungsreich',
  aeolian: 'natürliches Moll', dorian: 'dorisch: Moll mit hellem Einschlag', mixolydian: 'mixolydisch: Dur mit erdigem Einschlag',
  ionian: 'Dur: hell', lydian: 'lydisch: schwebend hell',
};
const LEAD_DE = {
  lead: 'Pulse-Lead mit Pulsbreiten-Modulation', saw: 'Sägezahn-Lead', brass: 'weiches Brass', bell: 'Glocken-Arpeggio',
  pluck: 'gezupfter Pulse', hubbard: 'Hubbard-Lead', whistle: 'Flöte (Dreieck)', fiddle: 'Fiddle (Sägezahn mit Vibrato)',
};

function cues(intent, plan, arrangement) {
  const t = plan.target;
  const [lo, hi] = plan.style.tempo;
  const pos = (plan.bpm - lo) / (hi - lo);
  const where = pos < 0.33 ? 'unteren' : pos > 0.66 ? 'oberen' : 'mittleren';
  const moods = Object.keys(intent.moods);
  const why = moods.length ? ` (wegen ${moods.join(' + ')})` : '';
  const main = arrangement.idioms.chorus || arrangement.idioms.verse || Object.values(arrangement.idioms)[0];
  const leads = [...new Set(plan.sections.filter((s) => s.roles.includes('L')).map((s) => s.leadInst))];
  const out = [
    `Groove: ${plan.style.groove}`,
    `Bass: ${IDIOM_DE[main] || main}`,
    `Tonart ${KEY_NAMES[plan.keyRoot]}, ${MODE_DE[plan.mode]}${why}`,
    `Tempo ${Math.round(plan.bpm)} bpm, im ${where} Bereich des Stils (${lo} bis ${hi})${t.energyBias ? `, Energie ${t.energyBias > 0 ? '+' : ''}${t.energyBias.toFixed(2)}` : ''}`,
  ];
  if (leads.length) out.push(`Lead: ${leads.map((l) => LEAD_DE[l] || l).join(', ')}`);
  if (t.legato > 0.3) out.push('Artikulation: gebunden (legato)');
  else if (t.legato < -0.3) out.push('Artikulation: kurz (staccato)');
  if (t.tension > 0.4) out.push('Spannung: chromatische Annäherungen im Bass');
  return out;
}

function summarize(intent, plan, arrangement) {
  return {
    interpretation: describeIntent(intent, plan.styleId),
    matched: intent.matched,
    style: plan.style.name,
    key: `${KEY_NAMES[plan.keyRoot]} ${plan.mode}`,
    bpm: Math.round(plan.bpm),
    meter: `${plan.style.meter.beats}/${plan.style.meter.unit}`,
    form: plan.sections.map((s) => s.label).join(' · '),
    signature: cues(intent, plan, arrangement),
    target: plan.target,
  };
}
