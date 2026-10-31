// One-bar rhythm cells for melodies: x onset, _ hold, . rest. Tagged by
// feel; a style or brief weights the feels, the section energy picks the
// density.

export const CELLS = {
  '4/4': {
    straight: ['x_x_x_x_x___x_x_', 'x___x_x_x_x_x___', 'x_x_x_x_x_x_x_x_', 'x_x_x___x_x_x___'],
    riff: ['x_xxx_x_x_xxx___', 'x_xxx_xxx_xxx_x_', 'xxx_xxx_xxx_x_x_', 'x.xxx.x.x.xxx.x.'],
    long: ['x_______x___x_x_', 'x___________x_x_', 'x_____x_____x___', 'x_______x_______', 'x_______________'],
    syncopated: ['..x_x_x_x_____x_', 'x__x__x_x_______', 'x_x___x_____x___', 'x__x__x__x__x___', '..x___x_..x_x___'],
    dotted: ['x_.xx_x_x_.xx___', 'x__x__x_x_x_x___', 'x.x.x_x_x.x.x___', 'x__xx_x_x__xx___'],
    running: ['x.x.x.x.x_x_x___', 'xxxxx_x_xxxxx___', 'xxxxxxxxx_x_x___', 'x.xxx.xxx.xxx___'],
    // common C64 lead rhythms (1-10 notes per bar,
    sid: ['x_x_x_x_x_x_x_x_', 'x___x___x___x___', 'x_____x_____x___', '..x___x___x___x_', 'x_______x___x___', 'x___x_x_x_x_x_x_',
      '..x_x_x_x_x_x_x_', 'x_x_x_x___x_x_x_', 'x___x___x___x_x_', 'x___x_x___x_x___', 'x__x__x_x__x__x_', 'x_x.x_x.x_x.x_x.', '....x___x___x___', 'x_______x_______'],
  },
  // waltz and minuet figures: half + quarter, quarter + two eighths, the
  // dotted minuet step, a pickup into the next bar
  '3/4': {
    straight: ['x___x___x___', 'x_x_x___x___', 'x___x_x_x_x_', 'x_x_x_x_x___', 'x_____x_x_x_', 'x___x___x_x_'],
    long: ['x_______x_x_', 'x___________', 'x_____x_x___', 'x_______x___', 'x___x_______'],
    dotted: ['x__xx___x___', 'x__x__x_x___', 'x__x__x_____', 'x__xx__xx___'],
    running: ['x_x_x_x_x_x_', 'xxxxx_x_x___', 'x_x_xxx_x___', 'xxx_x_x_x_x_'],
  },
  // jig and barcarolle figures: quarter + eighth, three eighths, the
  // dotted eighth lilt
  '6/8': {
    running: ['x_x_x_x_x_x_', 'x_x_x_x___x_', 'x_xxx_x_x_x_', 'x_x_x_xxx_x_'],
    straight: ['x___x_x_x_x_', 'x_x_x_x_x___', 'x___x_x___x_', 'x___x_x_____', 'x_x_x_x___x_'],
    long: ['x_____x_____', 'x___x_______', 'x_________x_', 'x_____x___x_'],
    dotted: ['x__xx_x__xx_', 'x__xx_x_____', 'x__x_xx___x_'],
  },
  // 8th triplets: long-short shuffle pairs, a lazy behind-the-beat figure
  '12/8': {
    shuffle: ['x_xx_xx_x___', 'x__x_xx__x__', 'x_xx_x______', 'xx_xx_xx_x__', 'x_x__xx_x___', '..xx_xx_x___'],
    long: ['x_____x__x_x', 'x________x__', 'x_____x_____', 'x__x__x_____'],
    running: ['xxxxxxxxx___', 'x_xx_xx_xx_x', 'xxx_x_xxx___'],
  },
};

// Variants derived from every cell: a long note split in two,
// two short notes merged, a beat anticipated by an eighth (syncopation),
// a pickup note into the next bar. Used at half the weight of the cells
// above, so each feel has more rhythms without losing its character.
function variants(cell, beat) {
  const out = [];
  const set = (c, i, v) => c.slice(0, i) + v + c.slice(i + 1);
  const on = [...cell].map((c, i) => (c === 'x' ? i : -1)).filter((i) => i >= 0);
  const n = cell.length;
  // split: the first note held for a beat or more
  const long = on.find((i) => cell.slice(i + 1, i + beat).split('').every((c) => c === '_') && i + beat < n && cell[i + 2] === '_');
  if (long !== undefined && on.length < 10) out.push(set(cell, long + 2, 'x'));
  // merge: drop an onset off the beat that follows a short note
  const weak = on.find((i, k) => k > 0 && i % beat !== 0 && i - on[k - 1] <= 2);
  if (weak !== undefined && on.length > 2) out.push(set(cell, weak, '_'));
  // anticipation: an onset on a later beat comes an eighth early
  const late = on.find((i) => i > 0 && i % beat === 0 && cell[i - 2] === '_' && cell[i - 1] === '_' && !on.includes(i - 2));
  if (late !== undefined) out.push(set(set(cell, late - 2, 'x'), late, '_'));
  // pickup: a note on the last eighth when the bar ends held or silent
  if ((cell[n - 2] === '_' || cell[n - 2] === '.') && (cell[n - 1] === '_' || cell[n - 1] === '.') && on.length < 10) out.push(`${cell.slice(0, n - 2)}x${cell[n - 1] === '.' ? '.' : '_'}`);
  return out;
}

const BEAT = { '4/4': 4, '3/4': 4, '6/8': 6, '12/8': 3 };
export const CELL_VARIANTS = Object.fromEntries(Object.entries(CELLS).map(([meter, feels]) => {
  const all = new Set(Object.values(feels).flat());
  return [meter, Object.fromEntries(Object.entries(feels).map(([feel, cells]) => {
    const vs = [...new Set(cells.flatMap((c) => variants(c, BEAT[meter])))].filter((v) => !all.has(v) && v[0] !== '_');
    return [feel, vs];
  }))];
}));

// Rhythm figures the cells above lacked, by meter and feel.
// Kept apart so the melody engine can draw them from a stream of their own
// and songs that do not draw one keep their rhythms. Same notation.
export const FIGURES = {
  '4/4': {
    // Lombard rhythm (scotch snap): 16th + dotted 8th, the reverse of dotted
    dotted: ['xx__x___xx__x___', 'x___xx__x___xx__', 'xx__xx__x_x_x___'],
    // Afro-Cuban timelines (son clave 3-2 and 2-3, rumba clave, bossa
    // clave; tresillo twice is already a cell variant), 3 against 4 (a
    // chain of dotted 8ths), the 16th-8th-16th syncopation and funk entries
    // on the 16th after the beat
    syncopated: ['x__x__x___x_x___', '..x_x___x__x__x_', 'x__x___x__x_x___', 'x__x__x___x__x__',
      'x__x__x__x__x__x', 'xx_xx___xx_xx___', '.x__x___.x__x_x_'],
    // gallop and reverse gallop mixed in one beat pair, both orders
    riff: ['x_xxxxx_x_xxx___', 'xxx_x_xxxxx_x___'],
    // cinquillo: 8th-16th-8th-16th-8th, the habanera's busy cousin
    running: ['x_xx_xx_x_xx_xx_'],
    // a long note pushed onto the last eighth, tied into the next bar
    long: ['x_____x_______x_'],
  },
  '3/4': {
    // polonaise (8th + two 16ths, then eighths), gallop on the downbeat
    running: ['x_xxx_x_x_x_', 'x_xxx___x___'],
    // an entry after the downbeat (hemiola inside the bar and the
    // sarabande step already come from the cell variants)
    long: ['..x___x___x_'],
    // Lombard rhythm on the downbeat and on beat two
    dotted: ['xx__x___x___', 'x___xx__x___'],
    // the second eighth of beat one tied over beat two
    straight: ['x_x___x___x_'],
  },
  '6/8': {
    // hemiola: three quarters against two dotted quarters
    straight: ['x___x___x___', 'x___x___x_x_'],
    // Lombard rhythm in compound time
    dotted: ['xx__x_xx__x_'],
    // tarantella: 8th + two 16ths + 8th on both beats
    running: ['x_xxx_x_xxx_'],
  },
  '12/8': {
    // two against three (quarters across dotted-quarter beats) and the
    // West African standard bell pattern
    running: ['x_x_x_x_x_x_', 'x_x_xx_x_x_x'],
    long: ['x_x_x_______'],
  },
};

// Figures derived from every cell: a pair of eighths on a beat
// dotted (8th. + 16th), snapped (16th + 8th.) or turned into a reverse
// gallop (two 16ths + 8th), a quarter on a beat turned into a gallop
// (8th + two 16ths). Only meters with a 16th grid; first match per cell.
function figureVariants(cell, beat) {
  const out = [];
  const n = cell.length;
  const on = [...cell].filter((c) => c === 'x').length;
  const at = (pat) => { for (let i = 0; i + 4 <= n; i += beat) if (cell.slice(i, i + 4) === pat) return i; return -1; };
  const put = (i, v) => cell.slice(0, i) + v + cell.slice(i + 4);
  const pair = at('x_x_');
  if (pair >= 0) out.push(put(pair, 'x__x'), put(pair, 'xx__'), ...(on < 10 ? [put(pair, 'xxx_')] : []));
  const quarter = at('x___');
  if (quarter >= 0 && on < 10) out.push(put(quarter, 'x_xx'));
  return out;
}

// beat step for the derivations: a quarter in 4/4 and 3/4, an eighth pair
// inside the dotted beat in 6/8; 12/8 steps are triplet eighths, so none
const FIGURE_BEAT = { '4/4': 4, '3/4': 4, '6/8': 6 };
export const FIGURE_VARIANTS = Object.fromEntries(Object.entries(CELLS).map(([meter, feels]) => {
  const known = new Set([...Object.values(feels).flat(), ...Object.values(CELL_VARIANTS[meter]).flat(), ...Object.values(FIGURES[meter] || {}).flat()]);
  return [meter, Object.fromEntries(Object.entries(feels).map(([feel, cells]) => [feel,
    FIGURE_BEAT[meter] ? [...new Set(cells.flatMap((c) => figureVariants(c, FIGURE_BEAT[meter])))].filter((v) => !known.has(v)) : []]))];
}));

export const FEELS = ['straight', 'riff', 'long', 'syncopated', 'dotted', 'running', 'shuffle', 'sid'];

// Chord rhythm for the arpeggio voice, by meter, from calm to busy.
export const ARP_CELLS = {
  '4/4': ['x_______________', 'x_______x_______', 'x___x___x___x___', 'x_x_x_x_x_x_x_x_'],
  '3/4': ['x___________', 'x___x___x___', '....x___x___'],
  '6/8': ['x___________', 'x_____x_____', 'x.....x.....'],
  '12/8': ['x___________', 'x_____x_____', '...x_____x__'],
};
