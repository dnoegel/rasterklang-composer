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
  },
  '3/4': {
    straight: ['x___x___x___', 'x_x_x___x___', 'x___x_x_x_x_'],
    long: ['x_______x_x_', 'x___________', 'x_____x_x___'],
    dotted: ['x__xx___x___', 'x__x__x_x___'],
    running: ['x_x_x_x_x_x_', 'xxxxx_x_x___'],
  },
  '6/8': {
    running: ['x_x_x_x_x_x_', 'x_x_x_x___x_', 'x_xxx_x_x_x_'],
    straight: ['x___x_x_x_x_', 'x_x_x_x_x___', 'x___x_x___x_'],
    long: ['x_____x_____', 'x___x_______', 'x_________x_'],
  },
  '12/8': {
    shuffle: ['x_xx_xx_x___', 'x__x_xx__x__', 'x_xx_x______', 'xx_xx_xx_x__'],
    long: ['x_____x__x_x', 'x________x__', 'x_____x_____'],
    running: ['xxxxxxxxx___', 'x_xx_xx_xx_x'],
  },
};

export const FEELS = ['straight', 'riff', 'long', 'syncopated', 'dotted', 'running', 'shuffle'];

// Chord rhythm for the arpeggio voice, by meter, from calm to busy.
export const ARP_CELLS = {
  '4/4': ['x_______________', 'x_______x_______', 'x___x___x___x___', 'x_x_x_x_x_x_x_x_'],
  '3/4': ['x___________', 'x___x___x___', '....x___x___'],
  '6/8': ['x___________', 'x_____x_____', 'x.....x.....'],
  '12/8': ['x___________', 'x_____x_____', '...x_____x__'],
};
