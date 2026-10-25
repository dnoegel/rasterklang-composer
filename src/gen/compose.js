// The pipeline: prompt -> intent -> brief (sampled from style weights, or
// given by the LLM path) -> validate -> plan -> N melody candidates ->
// best by measurement -> rasterklang-dsl source.

import { parsePrompt, describeIntent, resolveStyle } from './intent.js';
import { sampleBrief, validateBrief, planFromBrief, GENERATOR_VERSION } from './brief.js';
import { arrange } from './arrange.js';
import { emitDsl } from './emit.js';
import { measureLead } from './measure.js';
import { Rng } from './prng.js';
import { KEY_NAMES } from './theory.js';
import { GROOVES } from './library/grooves.js';
import { BASS } from './library/bass.js';
import { TEXTURES, TRANSITIONS } from './library/textures.js';
import { FORMS } from './library/forms.js';
import { LEADS } from './library/palettes.js';

const TITLE_A = {
  metal: ['Iron', 'Steel', 'Thunder', 'Blood', 'Fire', 'Black', 'Raven'],
  synth: ['Neon', 'Midnight', 'Chrome', 'Laser', 'Electric', 'Velvet', 'Sunset'],
  game: ['Sky', 'Coin', 'Mushroom', 'Pixel', 'Cloud', 'Lucky', 'Jumping'],
  folk: ['Green', 'Silver', 'Merry', 'Old', 'Wandering', 'Highland', 'Copper'],
  blues: ['Crossroad', 'Muddy', 'Rusty', 'Midnight', 'Whiskey'], jazz: ['Velvet', 'Blue', 'Smoky', 'Golden', 'Late'],
  latin: ['Sunny', 'Ocean', 'Coral', 'Lazy', 'Sandy'], dance: ['Hyper', 'Strobe', 'Pulse', 'Euphoric', 'Infinite'],
  funk: ['Funky', 'Soul', 'Groove', 'Mirror', 'Disco'], reggae: ['Island', 'Easy', 'Sunshine', 'Dub', 'Palm'],
  classical: ['Porcelain', 'Silver', 'Royal', 'Clockwork', 'Winter'], cinematic: ['Last', 'Fallen', 'Rising', 'Eternal', 'Iron'],
  ambient: ['Distant', 'Quiet', 'Floating', 'Polar', 'Deep'], hiphop: ['Rainy', 'Late Night', 'Paper', 'Coffee', 'Window'],
  rock: ['Loud', 'Broken', 'Electric', 'Wild', 'Static'], pop: ['Golden', 'Summer', 'Sugar', 'Bright', 'Neon'],
};
const TITLE_B = {
  metal: ['Crusade', 'Legion', 'Gallows', 'Forge', 'Storm', 'Throne', 'March'],
  synth: ['Drive', 'Skyline', 'Horizon', 'Boulevard', 'Mirage', 'Runner', 'Dreams'],
  game: ['Kingdom', 'Hills', 'Run', 'Quest', 'Island', 'Castle', 'Bounce'],
  folk: ['Fiddler', 'Piper', 'Tavern', 'Road', 'Lass', 'Harbour', 'Ramble'],
  blues: ['Blues', 'Boogie', 'Shuffle', 'Train', 'Highway'], jazz: ['Lounge', 'Avenue', 'Hour', 'Martini', 'Corner'],
  latin: ['Breeze', 'Promenade', 'Afternoon', 'Bay', 'Samba'], dance: ['Nation', 'Rush', 'Signal', 'Heights', 'Motion'],
  funk: ['Machine', 'Fever', 'Strut', 'Ball', 'Express'], reggae: ['Riddim', 'Vibes', 'Shore', 'Rock', 'Breeze'],
  classical: ['Waltz', 'Carousel', 'Minuet', 'Ballroom', 'Music Box'], cinematic: ['Stand', 'Kingdoms', 'Oath', 'Dawn', 'Legion'],
  ambient: ['Signals', 'Orbit', 'Tides', 'Horizon', 'Drift'], hiphop: ['Tapes', 'Notes', 'Thoughts', 'Loops', 'Streets'],
  rock: ['Amplifier', 'Garage', 'Static', 'Riot', 'Feedback'], pop: ['Heartbeat', 'Satellite', 'Holiday', 'Glow', 'Radio'],
};

const seedKeyOf = (prompt, seed) => `${seed}|${prompt.trim().toLowerCase().replace(/\s+/g, ' ')}`;

// Rule-based: sample the brief from the prompt.
export function briefFromPrompt(prompt, seed = 1) {
  const intent = parsePrompt(prompt);
  const styleId = resolveStyle(intent);
  const brief = sampleBrief(intent, seedKeyOf(prompt, seed), styleId, intent.blend);
  return { intent, brief };
}

// Render any brief (rule-based or LLM) into a tune.
export function composeBrief(rawBrief, { prompt = '', seed = 1, intent = null, candidates = 8 } = {}) {
  const { brief, repairs, errors } = validateBrief(rawBrief);
  const seedKey = `${seedKeyOf(prompt, seed)}|${brief.source || 'rules'}`;
  const plan = planFromBrief(brief, seedKey);
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
  const fam = plan.style.family;
  const title = brief.title || `${tr.pick(TITLE_A[fam] || TITLE_A.synth)} ${tr.pick(TITLE_B[fam] || TITLE_B.synth)}`;
  const dsl = emitDsl(plan, best.arrangement, title);
  return {
    title,
    prompt,
    seed,
    version: GENERATOR_VERSION,
    intent,
    brief,
    repairs,
    errors,
    plan,
    dsl,
    measure: best.measure,
    candidate: best.candidate,
    summary: summarize(intent, plan, brief),
  };
}

export function compose(prompt, seed = 1, opts = {}) {
  const { intent, brief } = briefFromPrompt(prompt, seed);
  return composeBrief(brief, { prompt, seed, intent, ...opts });
}

const MODE_DE = {
  phrygian: 'phrygisch: sehr dunkel, mit kleiner Sekunde', harmonic: 'harmonisch Moll: dunkel und spannungsreich',
  aeolian: 'natürliches Moll', dorian: 'dorisch: Moll mit hellem Einschlag', mixolydian: 'mixolydisch: Dur mit erdigem Einschlag',
  ionian: 'Dur: hell', lydian: 'lydisch: schwebend hell',
};

function cues(intent, plan, brief) {
  const t = plan.target;
  const [lo, hi] = plan.style.tempo.map(Math.round);
  const pos = (plan.bpm - lo) / (hi - lo);
  const where = pos < 0.33 ? 'unteren' : pos > 0.66 ? 'oberen' : 'mittleren';
  const moods = Object.keys(brief.moods || {});
  const why = moods.length ? ` (wegen ${moods.join(' + ')})` : '';
  const main = plan.sections.find((s) => s.type === 'chorus') || plan.sections.find((s) => s.type === 'verse') || plan.sections[0];
  const out = [
    `Groove: ${GROOVES[main.groove].name}${plan.style.groove ? `; ${plan.style.groove}` : ''}`,
    `Bass: ${BASS[main.bass].name}`,
    `Tonart ${KEY_NAMES[plan.keyRoot]}, ${MODE_DE[plan.mode]}${why}`,
    `Tempo ${Math.round(plan.bpm)} bpm im ${plan.meter.id}, im ${where} Bereich des Stils (${lo} bis ${hi})`,
    `Intro: ${plan.sections[0].textureDef.name}`,
  ];
  const leads = [...new Set(plan.sections.filter((s) => s.textureDef.stages.some(([, r]) => r.includes('L'))).map((s) => s.leadInst))];
  if (leads.length) out.push(`Lead: ${leads.map((l) => LEADS[l] || l).join(', ')}`);
  if (plan.sections.some((s) => s.transpose)) out.push('Rückung: letzter Refrain einen Ganzton höher');
  if (t.legato > 0.3) out.push('Artikulation: gebunden (legato)');
  else if (t.legato < -0.3) out.push('Artikulation: kurz (staccato)');
  if (t.tension > 0.4) out.push('Spannung: chromatische Annäherungen im Bass');
  return out;
}

// The rendered song as text, for the critic and for refinements: what the
// code actually built, not what was asked for.
export function describeTune(tune) {
  const { plan, measure, summary } = tune;
  const seconds = Math.round(plan.totalBars * (plan.meter.unit === 8 ? plan.meter.beats / 3 : plan.meter.beats) * 60 / plan.bpm);
  const lines = [
    `Style ${plan.style.name}${plan.brief.blend ? ` (blend ${plan.brief.blend.style} ${plan.brief.blend.amount})` : ''}.`,
    `Key ${summary.key}, ${summary.bpm} bpm, meter ${summary.meter}, ${plan.totalBars} bars, about ${seconds} s.`,
    `Moods: ${Object.entries(plan.brief.moods || {}).map(([m, w]) => `${m} ${w.toFixed(2)}`).join(', ') || 'none'}.`,
    `Sounds: bass ${plan.palette.bass}, snare ${plan.palette.snare}, chords ${plan.palette.chords}${plan.sound ? `, custom lead ${JSON.stringify(plan.sound)}` : ''}.`,
    'Sections:',
    ...plan.sections.map((s) => `- ${s.type} ${s.bars} bars, energy ${s.energy.toFixed(2)} to ${(s.energyEnd ?? s.energy).toFixed(2)}, filter ${s.filter || 'follow'}, texture ${s.texture} (${s.textureDef.name}), `
      + `groove ${s.drumPattern ? `own pattern ${s.drumPattern.join('|')}` : s.groove}, bass ${s.bassPattern ? `own pattern ${s.bassPattern.join('|')}` : s.bass}`
      + `${s.arpPattern ? `, arp rhythm ${s.arpPattern.join('|')}` : ''}, lead ${s.leadInst} (${s.feel}), chords ${s.chords.slice(0, Math.min(4, s.chords.length)).map((c) => c.symbol).join(' ')}`
      + `${s.transpose ? `, transposed +${s.transpose}` : ''}, then ${s.transition}`),
    `Lead melody: ${measure.notes || 0} notes, ${Math.round((measure.chordTone || 0) * 100)} % chord tones on strong beats, widest range in 8 bars ${measure.range} semitones, `
      + `${Math.round((measure.share?.step || 0) * 100)} % steps, ${Math.round((measure.share?.leap || 0) * 100)} % leaps, ${Math.round((measure.share?.rep || 0) * 100)} % repeats.`,
    `Themes given: ${Object.keys(plan.themes || {}).join(', ') || 'none (motifs generated)'}.`,
  ];
  return lines.join('\n');
}

function summarize(intent, plan, brief) {
  return {
    interpretation: intent ? describeIntent(intent, plan.styleId) : plan.style.name,
    matched: intent ? intent.matched : [],
    style: plan.style.name,
    key: `${KEY_NAMES[plan.keyRoot]} ${plan.mode}`,
    bpm: Math.round(plan.bpm),
    meter: plan.meter.id,
    form: `${FORMS[brief.form]?.name || 'frei'}: ${plan.sections.map((s) => s.label).join(' · ')}`,
    signature: cues(intent, plan, brief),
    target: plan.target,
    sections: plan.sections.map((s) => ({
      label: s.label,
      bars: s.bars,
      energy: s.energy,
      energyEnd: s.energyEnd ?? s.energy,
      texture: s.textureDef.name,
      groove: s.drumPattern ? `eigenes Muster (${GROOVES[s.groove].name})` : GROOVES[s.groove].name,
      bass: s.bassPattern ? 'eigene Bass-Figur' : BASS[s.bass].name,
      chords: s.chords.slice(0, Math.min(s.chords.length, (brief.sections.find((x) => x.type === s.type)?.chords || []).length || 4)).map((c) => c.symbol).join(' '),
      transition: TRANSITIONS[s.transition]?.name,
      lead: s.leadInst,
    })),
  };
}
