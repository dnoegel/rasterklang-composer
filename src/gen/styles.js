// Styles are weights over the shared library plus a signature:
// entries the main sections must use, so the genre stays recognisable
// while everything else varies. Research ranks identity: tempo and groove,
// then bass idiom, then scale and one signature device
//. Weights are defaults to
// tune by ear.
//
// Fields: meter weights, tempo band (bpm per felt beat), modes, grooves,
// bass, feels (melody rhythm), progressions, textures by kind, transitions,
// forms, palette (lead, bass, snare, chords: 'power' | 'triad'), personas,
// signature { grooves, bass, lead }, keywords (prompt words, English and
// German), moods (affinity used when the prompt names no style), groove
// (one line for the listening cues), sevenths, keyChange.

export const STYLES = {
  metal: {
    name: 'Heavy Metal',
    family: 'metal',
    meter: { '4/4': 1 },
    tempo: [112, 176],
    modes: { aeolian: 3, phrygian: 2, harmonic: 2, dorian: 1, ionian: 0.6 },
    grooves: { rock: 2, metal_gallop: 3, double_kick: 2, thrash_skank: 1.5, halftime: 1, d_beat: 1, blast: 0.5 },
    bass: { root_8ths: 2, gallop: 3, pedal_16ths: 2, half_note: 1, riff_unison: 2, whole_note: 0.5 },
    feels: { riff: 3, straight: 2, running: 1, long: 1, syncopated: 0.5 },
    progressions: {
      minor_rise: 3, phrygian_vamp: 2, minor_four: 2, minor_shuttle: 2, victory_minor: 3, andalusian: 2, aeolian_loop: 1,
      minor_epic: 1, minor_bridge: 1, phrygian_bridge: 2, mixolydian_rock: 2, victory_major: 2, pop_axis: 0.5, relative_bridge: 1, major_bridge: 1,
    },
    textures: {
      intro: { riff_solo: 3, countin: 2, cold_start: 2, staggered: 1.5, drum_groove: 1, arp_swell: 0.7, twin_lead: 1 },
      main: { full: 4, call_response: 1, groove_chords: 0.5 },
      breakdown: { halftime_break: 3, bass_alone: 2, drop_out: 1 },
      build: { snare_build: 1 },
      outro: { final_hit: 3, riff_out: 2, fade_layers: 1 },
    },
    transitions: { fill: 3, stop: 1.5, dropout: 1, none: 0.5 },
    forms: { metal: 3, verse_chorus: 1.5, verse_pre_chorus: 1 },
    palette: { lead: { lead: 1, saw: 2, hubbard: 2, brass: 0.3 }, bass: { bass: 2, slap: 1 }, snare: { snare2: 3, snare: 1 }, chords: 'power' },
    personas: { none: 3, hubbard: 1, tel: 1 },
    signature: { grooves: ['metal_gallop', 'double_kick', 'thrash_skank'], bass: ['gallop', 'pedal_16ths', 'riff_unison'] },
    keywords: ['metal', 'heavy', 'thrash', 'headbang', 'riff', 'guitar', 'shred', 'iron maiden', 'metallica', 'power metal', 'speed metal', 'doom', 'gitarre', 'headbanger'],
    moods: { aggressive: 2, menacing: 1, epic: 0.6 },
    groove: 'Rock-Backbeat, in lauten Teilen Galopp und Doublebass',
    filter: { cutoff: [500, 1600], resonance: 10 },
    keyChange: 0.2,
  },

  synthwave: {
    name: 'Synthwave',
    family: 'synth',
    meter: { '4/4': 1 },
    tempo: [84, 124],
    modes: { aeolian: 3, dorian: 2, ionian: 1.5, lydian: 1, mixolydian: 0.6 },
    grooves: { synth_gated: 4, four_floor: 2, halftime: 1, disco: 1, breakbeat: 0.5 },
    bass: { octave_8ths: 3, octave_16th: 2, driving_8ths: 2, sustained: 2, whole_note: 1, trance_offbeat: 1, pedal_16ths: 1 },
    feels: { long: 3, syncopated: 3, straight: 1, dotted: 0.5 },
    progressions: {
      aeolian_loop: 4, minor_rise: 2, minor_shuttle: 2, minor_four: 2, victory_minor: 2, minor_epic: 2, minor_lament: 2, dorian_vamp: 1, dorian_rock: 1,
      pop_axis: 2, sensitive: 2, royal_road: 2, ascend: 1, lydian_float: 1, minor_bridge: 1, major_bridge: 1, relative_bridge: 1,
    },
    textures: {
      intro: { arp_swell: 3, staggered: 2, drum_groove: 2, twin_lead: 1.5, cold_start: 0.7 },
      main: { full: 2, hubbard: 3, call_response: 1.5, groove_chords: 0.5 },
      breakdown: { arp_lead: 3, bass_alone: 2, drop_out: 1 },
      build: { snare_build: 2 },
      outro: { arp_out: 3, fade_layers: 2, final_hit: 1 },
    },
    transitions: { fill: 2, dropout: 2, stop: 0.5, none: 1 },
    forms: { verse_chorus: 3, verse_pre_chorus: 2, edm: 1 },
    palette: { lead: { lead: 2, pluck: 1.5, saw: 2, brass: 2, bell: 1 }, bass: { bass: 2, sub: 2 }, snare: { snare: 2, clap: 2 }, chords: 'triad' },
    personas: { none: 3, hubbard: 1, tel: 1, galway: 0.5 },
    signature: { grooves: ['synth_gated', 'four_floor'], bass: ['octave_8ths', 'octave_16th', 'driving_8ths'] },
    keywords: ['synthwave', 'outrun', 'retrowave', '80s', '80er', 'eighties', 'neon', 'cyberpunk', 'miami', 'vaporwave', 'synth', 'synthpop', 'italo', 'night drive', 'blade runner', 'darksynth'],
    moods: { nostalgic: 2, dreamy: 1.5, melancholic: 1, mysterious: 0.8 },
    base: 0.3,
    groove: 'gleichmäßige Kick mit trockener Snare auf 2 und 4',
    filter: { cutoff: [350, 1400], resonance: 12 },
    sevenths: 0.35,
    keyChange: 0.15,
  },

  platformer: {
    name: 'Platformer',
    family: 'game',
    meter: { '4/4': 1 },
    tempo: [116, 168],
    modes: { ionian: 3, mixolydian: 2, lydian: 1, dorian: 1, aeolian: 0.6 },
    grooves: { platform_light: 4, rock: 1, march: 1, disco: 0.5 },
    bass: { oom_pah: 3, bouncy: 3, walk: 2, skip: 2, motown: 1 },
    feels: { dotted: 3, straight: 2, running: 1.5, syncopated: 1 },
    progressions: {
      classic_cadence: 3, pop_axis: 2, doo_wop: 2, rock_shuttle: 2, lift: 3, ascend: 2, royal_road: 1, victory_major: 1, jazz_turn: 0.7,
      lydian_float: 0.5, relative_bridge: 1.5, major_bridge: 1, andalusian: 1.5, harmonic_cadence: 2, minor_shuttle: 1, victory_minor: 1, minor_bridge: 1,
    },
    textures: {
      intro: { staggered: 2, countin: 2, cold_start: 2, twin_lead: 1.5, drum_groove: 1 },
      main: { full: 2, hubbard: 3, call_response: 1, no_drums: 0.5 },
      breakdown: { arp_lead: 2, bass_alone: 1 },
      build: { snare_build: 1 },
      outro: { final_hit: 3, riff_out: 2 },
    },
    transitions: { fill: 3, stop: 1, dropout: 1, none: 1 },
    forms: { game_loop: 4, short: 1, verse_chorus: 1, aaba: 1 },
    palette: { lead: { lead: 2, pluck: 2, brass: 1.5, bell: 1 }, bass: { sub: 2, bass: 1.5 }, snare: { snare: 2, snare2: 1 }, chords: 'triad' },
    personas: { none: 3, hubbard: 1, galway: 1 },
    signature: { grooves: ['platform_light'], bass: ['oom_pah', 'bouncy', 'skip'] },
    keywords: ['platformer', 'platform game', 'jump and run', "jump'n'run", 'jump n run', 'mario', 'sonic', 'giana', 'overworld', 'video game', 'videogame', 'game music', 'spielmusik', 'chiptune', '8-bit', '8 bit', 'arcade', 'level'],
    moods: { happy: 1.5, playful: 2, triumphant: 0.8, hopeful: 0.6 },
    groove: 'leichte, hüpfende Drums, Melodie mit punktierten Sprüngen',
    filter: { cutoff: [900, 2000], resonance: 6 },
    keyChange: 0.1,
  },

  jig: {
    name: 'Celtic Jig',
    family: 'folk',
    meter: { '6/8': 1 },
    tempo: [96, 126],
    modes: { ionian: 2.5, mixolydian: 2, dorian: 2, aeolian: 1 },
    grooves: { bodhran: 4, jig_kit: 1 },
    bass: { drone: 2, one_four: 3, oom_pah6: 2, run6: 1 },
    feels: { running: 4, straight: 2, long: 0.5 },
    progressions: {
      folk_one_four: 3, classic_cadence: 2, double_tonic: 3, mixolydian_rock: 1, double_tonic_m: 3, dorian_vamp: 2, dorian_rock: 1.5,
      harmonic_cadence: 1, lift: 1, relative_bridge: 1, minor_bridge: 1,
    },
    textures: {
      intro: { drone_lead: 3, countin: 2, riff_solo: 2, twin_lead: 1 },
      main: { full: 3, no_drums: 2 },
      breakdown: { arp_lead: 1, bass_alone: 1 },
      build: { snare_build: 0.5 },
      outro: { riff_out: 2, final_hit: 2, arp_out: 1 },
    },
    transitions: { fill: 2, none: 2, stop: 0.5 },
    forms: { folk_aabb: 4, short: 1 },
    partNames: { verse: 'A-Teil', chorus: 'B-Teil' },
    palette: { lead: { whistle: 3, fiddle: 3 }, bass: { drone: 2, sub: 2 }, snare: { snare: 1 }, chords: 'triad' },
    personas: { none: 3, galway: 1 },
    signature: { grooves: ['bodhran'], bass: ['one_four', 'oom_pah6', 'drone'], lead: ['whistle', 'fiddle'] },
    keywords: ['celtic', 'irish', 'jig', 'reel', 'folk', 'fiddle', 'tavern', 'pub', 'scottish', 'bagpipe', 'medieval', 'bard', 'keltisch', 'irisch', 'schottisch', 'mittelalter', 'volksmusik', 'dudelsack', 'taverne', 'kneipe'],
    moods: { playful: 0.5, happy: 0.4 },
    groove: '6/8-Schwung in laufenden Achteln, Bodhrán-artige Toms',
    filter: { cutoff: [700, 1700], resonance: 6 },
  },
};

export const STYLE_IDS = Object.keys(STYLES);

// Mix two styles: weights blend, the primary keeps meter and its groove and
// bass signature, the secondary contributes its lead signature and colour.
export function blendStyles(primaryId, secondaryId, amount) {
  const a = STYLES[primaryId];
  if (!secondaryId || !amount) return { id: primaryId, ...a };
  const b = STYLES[secondaryId];
  const mix = (x = {}, y = {}) => {
    const out = {};
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) out[k] = (x[k] || 0) * (1 - amount) + (y[k] || 0) * amount;
    return out;
  };
  const textures = {};
  for (const kind of new Set([...Object.keys(a.textures), ...Object.keys(b.textures)])) textures[kind] = mix(a.textures[kind], b.textures[kind]);
  return {
    ...a,
    id: primaryId,
    blend: { style: secondaryId, amount },
    name: `${a.name} × ${b.name}`,
    tempo: [a.tempo[0] + (b.tempo[0] - a.tempo[0]) * amount * 0.5, a.tempo[1] + (b.tempo[1] - a.tempo[1]) * amount * 0.5],
    modes: mix(a.modes, b.modes),
    grooves: mix(a.grooves, b.grooves),
    bass: mix(a.bass, b.bass),
    feels: mix(a.feels, b.feels),
    progressions: mix(a.progressions, b.progressions),
    textures,
    transitions: mix(a.transitions, b.transitions),
    palette: {
      lead: mix(a.palette.lead, b.palette.lead),
      bass: mix(a.palette.bass, b.palette.bass),
      snare: mix(a.palette.snare, b.palette.snare),
      chords: a.palette.chords,
    },
    signature: { grooves: a.signature.grooves, bass: a.signature.bass, lead: b.signature.lead || a.signature.lead },
    groove: `${a.groove}, mit Farben von ${b.name}`,
    sevenths: ((a.sevenths || 0) + (b.sevenths || 0)) / 2,
  };
}
