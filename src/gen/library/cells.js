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

export const FEELS = ['straight', 'riff', 'long', 'syncopated', 'dotted', 'running', 'shuffle', 'sid'];

// Chord rhythm for the arpeggio voice, by meter, from calm to busy.
export const ARP_CELLS = {
  '4/4': ['x_______________', 'x_______x_______', 'x___x___x___x___', 'x_x_x_x_x_x_x_x_'],
  '3/4': ['x___________', 'x___x___x___', '....x___x___'],
  '6/8': ['x___________', 'x_____x_____', 'x.....x.....'],
  '12/8': ['x___________', 'x_____x_____', '...x_____x__'],
};
