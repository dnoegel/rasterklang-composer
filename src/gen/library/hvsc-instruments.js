// Instrument programs in the style C64 composers built them (drum kits,
// basses, leads), as rasterklang-dsl instrument bodies, chosen from
// statistics over the HVSC. Generated; do not edit by hand.

// Drum kits: kick, snare and hat as real songs combine them.
export const HVSC_KITS = {
  boom: { name: "deep kick with a pulse sweep, noise snare, short hat", kick: 'kickBoom', snare: 'snareBoom', hat: 'hatBoom' },
  round: { name: "round triangle kick falling two octaves, noise-pulse snare", kick: 'kickRound', snare: 'snareRound', hat: 'hatBoom' },
  tight: { name: "tight pulse kick, pulse-and-noise snare, closed hat", kick: 'kickTight', snare: 'snareTight', hat: 'hatTight' },
  thin: { name: "thin narrow-pulse kick and snare, bright hat", kick: 'kickThin', snare: 'snareThin', hat: 'hatThin' },
};

export const HVSC_DRUMS = {
  // noise E7, pulse D3-G#1 (4 frames); fast width sweep; AD 08 SR A8
  kickBoom: `
  adsr 0 8 10 8
  wave 0 noise pulse!4
  arp =100!2 =50 =44 =36 =32
  test 1 0!5
  gate 1!4 0!2
  pw 2048!2 ramp 2112..3584 step 64 over 24 ramp 3520..3072 step -64 over 8 ramp 3136..3584 step 64 over 8
  loop wave 5 arp 5 test 5 gate 5 pw 26
`,
  // noise A#5, pulse A#3-A3 (2 frames), noise B7; fixed width; AD 00 SR F5
  snareBoom: `
  adsr 0 0 15 5
  wave 0 noise pulse!2 noise
  arp =82!2 =58 =57 =107
  test 1 0!4
  gate 1!3 0!2
  pw 2048!2
  loop wave 4 arp 4 test 4 gate 4 pw 1
`,
  // noise B7 (2 frames); AD 00 SR B1
  hatBoom: `
  adsr 0 0 11 1
  wave 0 noise!2
  arp =107!3
  test 1 0!2
  gate 1!2 0
  loop wave 2 arp 2 test 2 gate 2
`,
  // pulse F#3, triangle E3-B0 (9 frames); fixed width; AD 00 SR FA
  kickRound: `
  adsr 0 0 15 10
  wave 0 pulse triangle!9
  arp =54!2 =52 =48 =44 =40 =36 =32 =31 =28 =23
  test 1 0!10
  gate 1!10 0
  pw 2048!2
  loop wave 10 arp 10 test 10 gate 10 pw 1
`,
  // noise C6, pulse E3-C3 (2 frames), noise E6-E5 (3 frames); fixed width; AD 00 SR E9
  snareRound: `
  adsr 0 0 14 9
  wave 0 noise pulse!2 noise!3
  arp =84!2 =52 =48 =88 =80 =76
  test 1 0!6
  gate 1!5 0!2
  pw 2048!2
  loop wave 5 arp 5 test 5 gate 5 pw 1
`,
  // noise G#5, pulse C3-C2 (6 frames); fixed width; AD 00 SR E8
  kickTight: `
  adsr 0 0 14 8
  wave 0 noise pulse!6
  arp =80!2 =48 =42 =39 =38 =37 =36
  test 1 0!7
  gate 1!3 0!5
  pw 2048!2
  loop wave 7 arp 7 test 7 gate 7 pw 1
`,
  // noise C6, pulse G#3-C3 (2 frames), noise G#5-E5 (2 frames); fixed width; AD 00 SR F9
  snareTight: `
  adsr 0 0 15 9
  wave 0 noise pulse!2 noise!2
  arp =84!2 =56 =48 =80 =76
  test 1 0!5
  gate 1!4 0!2
  pw 2048!2
  loop wave 5 arp 5 test 5 gate 5 pw 1
`,
  // noise G#7; AD 00 SR 16
  hatTight: `
  adsr 0 0 1 6
  wave 0 noise!2
  arp =104!2
  gate 1!2 0
  loop wave 2 arp 2 gate 2
`,
  // noise G#5, pulse E3-E1 (3 frames); fixed width; AD 00 SR F7
  kickThin: `
  adsr 0 0 15 7
  wave 0 noise pulse!3
  arp =80!2 =52 =48 =28
  test 1 0!4
  gate 1!3 0!2
  pw 128!2
  loop wave 4 arp 4 test 4 gate 4 pw 1
`,
  // noise A#5, pulse G#3-F3 (2 frames), noise F#5-G#5 (2 frames); fixed width; AD 00 SR F9
  snareThin: `
  adsr 0 0 15 9
  wave 0 noise pulse!2 noise!2
  arp =82!2 =56 =53 =78 =80
  test 1 0!5
  gate 1!4 0!2
  pw 128!2
  loop wave 5 arp 5 test 5 gate 5 pw 1
`,
  // noise D6-G#5 (2 frames); AD 00 SR 68
  hatThin: `
  adsr 0 0 6 8
  wave 0 noise!2
  arp =86!2 =80
  test 1 0!2
  gate 1!2 0
  loop wave 2 arp 2 test 2 gate 2
`,
};

export const HVSC_BASSES = {
  // triangle, noise B7, pulse C3-0 (3 frames); mid width sweep; AD 04 SR F4
  thump: { name: "bass with a drum thump on every note (kick and bass in one)", body: `
  adsr 0 4 15 4
  wave noise pulse!3
  arp =107 =48 =44 0
  pw 2048!4 ramp 768..514 step -2 over 128
  loop wave 3 arp 3 pw 131
  gate -2
` },
  // triangle, noise B7, pulse; slow width sweep; AD 04 SR F4
  gtbass: { name: "tracker bass: noise click, pulse narrowing slowly", body: `
  adsr 0 4 15 4
  wave noise pulse
  arp =107 0
  pw 768!2 ramp 766..514 step -2 over 127
  loop wave 1 arp 1 pw 128
  gate -2
` },
  // noise C6, pulse; fast width sweep; AD 02 SR AA
  buzz: { name: "buzzy bass: noise click, wide fast pulse sweep", body: `
  adsr 0 2 10 10
  wave noise pulse
  arp =84 0
  pw 256!2 ramp 320..2048 step 64 over 28 ramp 1984..512 step -64 over 24 ramp 576..2048 step 64 over 24
  loop wave 1 arp 1 pw 30
  gate -2
` },
};

export const HVSC_LEADS = {
  // pulse; fast width sweep; vibrato after 7 frames; AD 01 SR 8D
  vibra: { name: "pulse lead with delayed vibrato and width sweep", body: `
  adsr 0 1 8 13
  wave pulse
  pw 512!2 ramp 1920..896 step -64 over 17 ramp 960..1920 step 64 over 16
  loop wave 0 pw 3
  vibTri 2 96 7
  gate -2
` },
  // noise B7, pulse +2-0 (2 frames); fast width sweep; vibrato after 13 frames; AD 01 SR CB
  scoop: { name: "punchy pulse lead: noise click, scoop from a step above, wide sweep, late vibrato", body: `
  adsr 0 1 12 11
  wave noise pulse!2
  arp =107 2 0
  pw 1024!2 ramp 1151..3818 step 127 over 22 ramp 3691..1024 step -127 over 22
  loop wave 2 arp 2 pw 2
  vibTri 2 53 13
  gate -2
` },
  // pulse (2 frames); fast width sweep; AD 02 SR B2
  sharp: { name: "bright narrow pulse lead with a fast sweep and a short release", body: `
  adsr 0 2 11 2
  wave pulse!2
  pw 3744!2 ramp 3664..2784 step -80 over 12 ramp 2864..3744 step 80 over 12
  loop wave 1 pw 2
  gate -2
` },
  // pulse (5 frames); fixed width; AD 09 SR 00
  chime: { name: "decaying octave-warble pluck (classic C64 arpeggio lead)", body: `
  adsr 0 9 0 0
  wave pulse!5
  arp 0 12!2 0!2
  pw 2184!4
  loop wave 1 arp 1 pw 1
  gate -2
` },
};
