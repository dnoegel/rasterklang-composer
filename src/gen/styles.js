// Style specs for the pilot (docs/plan.md): heavy metal, synthwave,
// platformer overworld, Celtic jig. Ordered by identity weight
//: rhythm core, drums, bass,
// lead, scale, harmony, signature. Values are research defaults ("D") to be
// tuned by ear.
//
// Grids: one character per 16th. 4/4 bars have 16 steps, 6/8 bars 12.
// Drum letters: k kick, s snare, h hat, o open hat, c clap, t/T toms, x crash.
// Bass roles: R root, 5 fifth, 8 octave, 3 chord third, b7, A approach to the
//   next chord's root, _ hold, . rest.
// Rhythm cells: x onset, _ hold, . rest.

export const STYLES = {
  metal: {
    id: 'metal',
    name: 'Heavy Metal',
    family: 'metal',
    meter: { beats: 4, unit: 4, steps: 16, strong: 4 },
    tempo: [112, 176],
    modes: { aeolian: 3, phrygian: 2, harmonic: 2, dorian: 1, ionian: 0.6 },
    progressions: {
      minor: {
        verse: [['i', 'i', 'bVI', 'bVII'], ['i', 'bVII', 'bVI', 'bVII'], ['i', 'bII', 'i', 'bII'], ['i', 'iv', 'bVI', 'bVII']],
        chorus: [['bVI', 'bVII', 'i', 'i'], ['i', 'bVI', 'bIII', 'bVII'], ['bVI', 'bVII', 'bIII', 'bVI']],
        bridge: [['iv', 'bVI', 'bVII', 'bVII'], ['bII', 'bII', 'i', 'i']],
      },
      major: {
        verse: [['I', 'bVII', 'IV', 'I'], ['I', 'I', 'bVI', 'bVII']],
        chorus: [['bVI', 'bVII', 'I', 'I'], ['I', 'V', 'vi', 'IV']],
        bridge: [['vi', 'IV', 'V', 'V']],
      },
    },
    power: true, // chords as power chords (root, fifth, octave)
    forms: {
      song: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['solo', 8], ['breakdown', 4], ['chorus', 8], ['outro', 2]],
      short: [['intro', 2], ['verse', 8], ['chorus', 8], ['chorus', 8], ['outro', 2]],
      loop: [['verse', 8], ['chorus', 8]],
    },
    drums: {
      levels: [
        'x...............',
        'k.h.s.h.k.h.s.h.',
        'k.hks.h.k.kks.h.',
        'kkkkskkkkkkkskkk',
      ],
      gallop: 'k.kkk.kkk.kkk.kk',
      halftime: 'k.......s.......',
      fills: ['k.h.s.h.s.ssTTtt', 'k.h.s.h.sssTTttt', 'kkkkskkkTTTTtttt'],
    },
    bass: {
      idioms: [
        { id: 'root_8ths', row: 'R.R.R.R.R.R.R.R.', energy: [0.3, 0.7] },
        { id: 'gallop', row: 'R.RRR.RRR.RRR.RR', energy: [0.5, 1] },
        { id: 'pedal_16ths', row: 'RRRRRRRRRRRRRRRR', energy: [0.7, 1] },
        { id: 'half_note', row: 'R_______R_______', energy: [0, 0.4] },
      ],
      inst: ['bass', 'slap'],
      octave: 1,
    },
    lead: {
      inst: { verse: ['lead', 'hubbard'], chorus: ['saw', 'hubbard'], solo: ['saw'] },
      cells: [
        'x_x_x_x_x___x_x_', 'x___x_x_x_x_x___', 'x_xxx_x_x_xxx___', 'x_x_x_x_x_x_x_x_',
        'x___x___x_x_x___', 'x_______x___x_x_', 'x_xxx_xxx_xxx_x_',
      ],
      range: [52, 79],
      steps: 0.55, // share of stepwise motion
      leapMax: 12,
    },
    arp: { cells: ['x_______________', 'x_______x_______'], inst: 'pow' },
    roles: {
      intro: 'DBA', verse: 'DBL', chorus: 'DBL', solo: 'DBL', breakdown: 'DBA', bridge: 'DBA', outro: 'DBA',
    },
    filter: { cutoff: [500, 1600], resonance: 10 },
    groove: 'Rock-Backbeat, in lauten Teilen Galopp und Doublebass',
  },

  synthwave: {
    id: 'synthwave',
    name: 'Synthwave',
    family: 'synth',
    meter: { beats: 4, unit: 4, steps: 16, strong: 4 },
    tempo: [84, 124],
    modes: { aeolian: 3, dorian: 2, ionian: 1.5, lydian: 1, mixolydian: 0.6 },
    progressions: {
      minor: {
        verse: [['i', 'bVI', 'bIII', 'bVII'], ['i', 'i', 'bVI', 'bVII'], ['i', 'bVII', 'bVI', 'bVII'], ['i', 'iv', 'bVI', 'bVII']],
        chorus: [['bVI', 'bVII', 'i', 'i'], ['bVI', 'bIII', 'bVII', 'i'], ['i', 'bVI', 'bIII', 'bVII']],
        bridge: [['iv', 'iv', 'bVI', 'bVII'], ['bVI', 'bVI', 'bVII', 'bVII']],
      },
      major: {
        verse: [['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V'], ['I', 'iii', 'IV', 'V']],
        chorus: [['IV', 'V', 'iii', 'vi'], ['vi', 'IV', 'I', 'V'], ['IV', 'I', 'V', 'vi']],
        bridge: [['ii', 'IV', 'V', 'V']],
      },
    },
    sevenths: 0.35, // probability of colouring chords with 7ths (raised by dreamy moods)
    forms: {
      song: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['bridge', 8], ['chorus', 8], ['outro', 4]],
      short: [['intro', 4], ['verse', 8], ['chorus', 8], ['outro', 4]],
      loop: [['verse', 8], ['chorus', 8]],
    },
    drums: {
      levels: [
        'k.......k.......',
        'k...s...k...s...',
        'k.h.s.h.k.h.s.h.',
        'k.h.s.hhk.h.s.ho',
      ],
      fills: ['k.h.s.h.s.s.ssss', 'k.h.s.h.k.TTtttt'],
    },
    bass: {
      idioms: [
        { id: 'octave_8ths', row: 'R.8.R.8.R.8.R.8.', energy: [0.4, 0.8] },
        { id: 'octave_16th', row: 'R8R8R8R8R8R8R8R8', energy: [0.6, 1] },
        { id: 'driving_8ths', row: 'R.R.R.R.R.R.R.R.', energy: [0.4, 1] },
        { id: 'sustained', row: 'R_______R___5___', energy: [0, 0.45] },
      ],
      inst: ['bass', 'sub'],
      octave: 1,
    },
    lead: {
      inst: { verse: ['lead', 'pluck'], chorus: ['saw', 'brass'], bridge: ['bell'] },
      cells: [
        'x_____x_x___x___', 'x___x___x_x_____', 'x_______x___x_x_', '..x_x_x_x_____x_',
        'x_x___x_____x___', 'x___________x_x_', 'x_____x_____x___',
      ],
      range: [57, 81],
      steps: 0.5,
      leapMax: 9,
    },
    arp: { cells: ['x_______________', 'x_______x_______', 'x_x_x_x_x_x_x_x_'], inst: 'triad' },
    roles: {
      intro: 'DBA', verse: 'DBL', chorus: 'MAL', bridge: 'DBA', outro: 'DBA',
    },
    filter: { cutoff: [350, 1400], resonance: 12 },
    groove: 'gleichmäßige Kick mit trockener Snare auf 2 und 4',
  },

  platformer: {
    id: 'platformer',
    name: 'Platformer',
    family: 'game',
    meter: { beats: 4, unit: 4, steps: 16, strong: 4 },
    tempo: [116, 168],
    modes: { ionian: 3, mixolydian: 2, lydian: 1, dorian: 1, aeolian: 0.6 },
    progressions: {
      major: {
        verse: [['I', 'IV', 'V', 'I'], ['I', 'vi', 'IV', 'V'], ['I', 'V', 'IV', 'V'], ['I', 'iii', 'IV', 'V']],
        chorus: [['IV', 'V', 'iii', 'vi'], ['IV', 'V', 'I', 'I'], ['vi', 'IV', 'V', 'I']],
        bridge: [['ii', 'V', 'I', 'vi'], ['IV', 'iv', 'I', 'V']],
      },
      minor: {
        verse: [['i', 'bVII', 'bVI', 'V'], ['i', 'iv', 'i', 'V'], ['i', 'bVI', 'bVII', 'i']],
        chorus: [['bVI', 'bVII', 'i', 'i'], ['iv', 'V', 'i', 'i']],
        bridge: [['bVI', 'bVI', 'V', 'V']],
      },
    },
    forms: {
      song: [['intro', 2], ['verse', 8], ['chorus', 8], ['verse', 8], ['bridge', 8], ['chorus', 8], ['verse', 8], ['outro', 2]],
      short: [['intro', 2], ['verse', 8], ['chorus', 8], ['outro', 2]],
      loop: [['verse', 8], ['chorus', 8]],
    },
    drums: {
      levels: [
        'h...h...h...h...',
        'k...s...k...s...',
        'k.h.s.h.k.k.s.h.',
        'k.hhs.hhk.k.s.hh',
      ],
      fills: ['k.h.s.h.s.TTT.tt', 'k...s...s.s.ssss'],
    },
    bass: {
      idioms: [
        { id: 'oom_pah', row: 'R...5...R...5...', energy: [0.2, 0.7] },
        { id: 'bouncy', row: 'R.5.8.5.R.5.8.5.', energy: [0.5, 1] },
        { id: 'walk', row: 'R...3...5...A...', energy: [0.3, 0.8] },
        { id: 'skip', row: 'R..R..5.R..R..A.', energy: [0.5, 1] },
      ],
      inst: ['sub', 'bass'],
      octave: 1,
    },
    lead: {
      inst: { verse: ['lead', 'pluck'], chorus: ['brass', 'lead'], bridge: ['bell'] },
      cells: [
        'x_.xx_x_x_.xx___', 'x.x.x_x_x.x.x___', 'x__x__x_x_x_x___', 'x_x_x_x_x___x___',
        'x.x.x.x.x_x_x___', 'x__x__x_x_______', 'x_x_x___x_x_x___',
      ],
      range: [60, 84],
      steps: 0.5,
      leapMax: 12,
    },
    arp: { cells: ['x___x___x___x___', 'x_______x_______', 'x.x.x.x.x.x.x.x.'], inst: 'triad' },
    roles: {
      intro: 'DBA', verse: 'DBL', chorus: 'MAL', bridge: 'DBL', outro: 'DBA',
    },
    filter: { cutoff: [900, 2000], resonance: 6 },
    groove: 'leichte, hüpfende Drums, Melodie mit punktierten Sprüngen',
  },

  jig: {
    id: 'jig',
    name: 'Celtic Jig',
    family: 'folk',
    meter: { beats: 6, unit: 8, steps: 12, strong: 6 },
    tempo: [96, 126], // dotted quarter
    modes: { ionian: 2.5, mixolydian: 2, dorian: 2, aeolian: 1 },
    progressions: {
      major: {
        verse: [['I', 'I', 'V', 'V'], ['I', 'IV', 'I', 'V'], ['I', 'bVII', 'I', 'bVII']],
        chorus: [['IV', 'I', 'V', 'I'], ['I', 'IV', 'V', 'I'], ['vi', 'IV', 'V', 'I']],
        bridge: [['IV', 'IV', 'I', 'V']],
      },
      minor: {
        verse: [['i', 'bVII', 'i', 'bVII'], ['i', 'i', 'bVII', 'bVII'], ['i', 'IV', 'i', 'bVII']],
        chorus: [['bIII', 'bVII', 'i', 'i'], ['bVI', 'bVII', 'i', 'i'], ['i', 'bVII', 'bIII', 'i']],
        bridge: [['iv', 'bVII', 'i', 'i']],
      },
    },
    forms: {
      // A and B parts, each played twice, the whole tune twice (docs: REEL/JIG)
      song: [['intro', 2], ['verse', 8], ['verse', 8], ['chorus', 8], ['chorus', 8], ['verse', 8], ['verse', 8], ['chorus', 8], ['chorus', 8], ['outro', 2]],
      short: [['intro', 2], ['verse', 8], ['chorus', 8], ['outro', 2]],
      loop: [['verse', 8], ['chorus', 8]],
    },
    partNames: { verse: 'A part', chorus: 'B part' },
    drums: {
      levels: [
        '............',
        't.....t.....',
        't.T.T.t.T.T.',
        't.TTT.t.TTT.',
      ],
      fills: ['t.T.T.t.TTtt', 't.T.T.TTTttt'],
    },
    bass: {
      idioms: [
        { id: 'drone', row: 'R___________', energy: [0, 0.5] },
        { id: 'one_four', row: 'R.....5.....', energy: [0.2, 0.8] },
        { id: 'oom_pah', row: 'R...5.R...5.', energy: [0.5, 1] },
      ],
      inst: ['drone', 'sub'],
      octave: 1,
    },
    lead: {
      inst: { verse: ['whistle', 'fiddle'], chorus: ['fiddle', 'whistle'] },
      cells: [
        'x_x_x_x_x_x_', 'x_x_x_x___x_', 'x___x_x_x_x_', 'x_xxx_x_x_x_', 'x_x_x_x_x___', 'x___x_x___x_',
      ],
      range: [62, 86],
      steps: 0.62,
      leapMax: 9,
    },
    arp: { cells: ['x___________', 'x.....x.....'], inst: 'triad' },
    roles: {
      intro: 'BAL', verse: 'DBL', chorus: 'DBL', bridge: 'BAL', outro: 'BAL',
    },
    filter: { cutoff: [700, 1700], resonance: 6 },
    groove: '6/8-Schwung in laufenden Achteln, Bodhrán-artige Toms',
  },
};

export const STYLE_IDS = Object.keys(STYLES);

// Section energy (0-1) before mood and prompt offsets.
export const SECTION_ENERGY = {
  intro: 0.3, verse: 0.55, chorus: 0.85, bridge: 0.45, solo: 0.9, breakdown: 0.3, outro: 0.3,
};
