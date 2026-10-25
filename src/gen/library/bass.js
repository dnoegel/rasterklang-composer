// Bass idioms as rows of pitch roles, resolved against the current chord:
// R root, 5 fifth, 8 octave, 3 chord third, 6 major sixth, b flat seventh,
// A approach to the next chord's root, _ hold, . rest.

export const BASS = {
  // ---- 4/4 ----------------------------------------------------------------
  root_8ths: { meter: '4/4', name: 'root in 8ths', tags: ['rock', 'punk', 'metal', 'pop'], energy: [0.3, 0.75], row: 'R.R.R.R.R.R.R.R.' },
  gallop: { meter: '4/4', name: 'gallop bass', tags: ['metal'], energy: [0.5, 1], row: 'R.RRR.RRR.RRR.RR' },
  pedal_16ths: { meter: '4/4', name: 'pedal point in 16ths', tags: ['metal', 'synth', 'cinematic'], energy: [0.65, 1], row: 'RRRRRRRRRRRRRRRR' },
  half_note: { meter: '4/4', name: 'long roots', tags: ['any'], energy: [0, 0.4], row: 'R_______R_______' },
  whole_note: { meter: '4/4', name: 'sustained root', tags: ['any', 'ambient'], energy: [0, 0.3], row: 'R_______________' },
  octave_8ths: { meter: '4/4', name: 'octave bass in 8ths', tags: ['synth', 'disco', 'dance'], energy: [0.35, 0.8], row: 'R.8.R.8.R.8.R.8.' },
  octave_16th: { meter: '4/4', name: 'octave bass in 16ths', tags: ['synth', 'dance', 'c64'], energy: [0.6, 1], row: 'R8R8R8R8R8R8R8R8' },
  driving_8ths: { meter: '4/4', name: 'driving 8ths', tags: ['synth', 'rock', 'dance'], energy: [0.4, 1], row: 'R.R.R.R.R.R.R.R.' },
  sustained: { meter: '4/4', name: 'held bass notes with fifth', tags: ['synth', 'ambient', 'pop'], energy: [0, 0.45], row: 'R_______R___5___' },
  oom_pah: { meter: '4/4', name: 'oom-pah bass (root, fifth)', tags: ['game', 'march', 'folk', 'polka'], energy: [0.2, 0.7], row: 'R...5...R...5...' },
  bouncy: { meter: '4/4', name: 'bouncy octave-fifth bass', tags: ['game', 'pop'], energy: [0.5, 1], row: 'R.5.8.5.R.5.8.5.' },
  walk: { meter: '4/4', name: 'walking bass with passing tones', tags: ['game', 'jazz', 'pop'], energy: [0.3, 0.8], row: 'R...3...5...A...' },
  skip: { meter: '4/4', name: 'skipping bass', tags: ['game', 'pop'], energy: [0.5, 1], row: 'R..R..5.R..R..A.' },
  funk_16ths: { meter: '4/4', name: 'funk bass in 16ths', tags: ['funk', 'disco'], energy: [0.4, 1], row: 'R..R..8.R.b.R.5.' },
  motown: { meter: '4/4', name: 'Motown bass', tags: ['soul', 'funk', 'pop'], energy: [0.3, 0.8], row: 'R.5.8.R.6.5.3.A.' },
  trance_offbeat: { meter: '4/4', name: 'offbeat bass', tags: ['trance', 'dance', 'house'], energy: [0.4, 1], row: '..R...R...R...R.' },
  tresillo: { meter: '4/4', name: 'Tresillo (3+3+2)', tags: ['latin', 'reggaeton', 'dance'], energy: [0.3, 0.9], row: 'R..R..R.R..R..R.' },
  reggae: { meter: '4/4', name: 'reggae bass with a rest on the one', tags: ['reggae', 'dub'], energy: [0.2, 0.7], row: '....R..5..R.8...' },
  boogie8: { meter: '4/4', name: 'boogie bass', tags: ['boogie', 'rock', 'blues'], energy: [0.4, 1], row: 'R.3.5.6.b.6.5.3.' },
  bossa_bass: { meter: '4/4', name: 'bossa bass (root, fifth)', tags: ['latin', 'jazz', 'lounge'], energy: [0.1, 0.7], row: 'R__5R__5R__5R__5' },
  trap808: { meter: '4/4', name: '808 bass with long notes', tags: ['hiphop', 'trap'], energy: [0.2, 1], row: 'R_______..R_R___' },
  country: { meter: '4/4', name: 'country bass (alternating root and fifth)', tags: ['country'], energy: [0.3, 1], row: 'R.......5.......' },
  rocknroll: { meter: '4/4', name: "rock'n'roll bass", tags: ['rock', 'rockabilly', 'country'], energy: [0.4, 1], row: 'R.3.5.6.8.6.5.3.' },
  fuzz_8ths: { meter: '4/4', name: 'fuzz bass in 8ths with octave', tags: ['rock', 'alternative'], energy: [0.5, 1], row: 'R.R.R.R.8.R.R.5.' },
  // common in C64 music
  offbeat_stab: { meter: '4/4', name: 'short offbeat bass', tags: ['sid', 'synth', 'dance', 'game'], energy: [0.4, 1], source: 'hvsc', row: '..R_..R_..R_..R_' },
  eighth_legato: { meter: '4/4', name: 'legato 8ths', tags: ['sid', 'synth', 'rock', 'game'], energy: [0.4, 1], source: 'hvsc', row: 'R_R_R_R_R_R_R_R_' },
  quarter_stab: { meter: '4/4', name: 'short quarters', tags: ['sid', 'game', 'pop'], energy: [0.3, 0.8], source: 'hvsc', row: 'R_..R_..R_..R_..' },
  octave_legato: { meter: '4/4', name: 'legato octave bass', tags: ['sid', 'synth', 'dance'], energy: [0.4, 1], source: 'hvsc', row: 'R_8_R_8_R_8_R_8_' },
  offbeat_quarters: { meter: '4/4', name: 'bass on 2 and 4', tags: ['sid', 'reggae', 'game'], energy: [0.2, 0.7], source: 'hvsc', row: '....R___....R___' },
  syncopated_push: { meter: '4/4', name: 'anticipated bass notes', tags: ['sid', 'funk', 'pop', 'game'], energy: [0.4, 1], source: 'hvsc', row: '..R___R___R___R_' },
  octave_gallop: { meter: '4/4', name: 'offbeat octave gallop', tags: ['sid', 'dance', 'synth'], energy: [0.6, 1], source: 'hvsc', row: '.R8R.R8R.R8R.R8R' },
  pickup_whole: { meter: '4/4', name: 'held root with pickup', tags: ['sid', 'ambient', 'synth'], energy: [0.1, 0.5], source: 'hvsc', row: 'R___________..A_' },
  riff_unison: { meter: '4/4', name: 'riff in unison', tags: ['metal', 'rock'], energy: [0.5, 1], row: 'R.R5.RR.R.R5.RA.' },

  // ---- 3/4 ----------------------------------------------------------------
  waltz_bass: { meter: '3/4', name: 'waltz bass', tags: ['waltz', 'classical'], energy: [0, 1], row: 'R___________' },
  waltz_fifth: { meter: '3/4', name: 'waltz bass with fifth', tags: ['waltz', 'folk'], energy: [0.3, 1], row: 'R.......5...' },

  // ---- 6/8 ----------------------------------------------------------------
  drone: { meter: '6/8', name: 'drone (sustained root)', tags: ['folk', 'celtic', 'medieval'], energy: [0, 0.5], row: 'R___________' },
  one_four: { meter: '6/8', name: 'root on 1 and 4', tags: ['folk', 'celtic'], energy: [0.2, 0.8], row: 'R.....5.....' },
  oom_pah6: { meter: '6/8', name: 'oom-pah bass in 6/8', tags: ['folk', 'celtic'], energy: [0.5, 1], row: 'R...5.R...5.' },
  gallop68: { meter: '6/8', name: 'gallop bass in 6/8', tags: ['metal', 'folk'], energy: [0.5, 1], row: 'R.RRR.R.RRR.' },
  pedal68: { meter: '6/8', name: 'pedal point in 6/8', tags: ['metal'], energy: [0.6, 1], row: 'RRRRRRRRRRRR' },
  run6: { meter: '6/8', name: 'running bass in 6/8', tags: ['folk', 'rock'], energy: [0.5, 1], row: 'R.3.5.R.3.5.' },

  // ---- 12/8 ---------------------------------------------------------------
  walk12: { meter: '12/8', name: 'Walking Bass', tags: ['jazz', 'blues', 'swing'], energy: [0.2, 0.9], row: 'R..3..5..A..' },
  boogie12: { meter: '12/8', name: 'boogie shuffle bass', tags: ['blues', 'boogie', 'rock'], energy: [0.4, 1], row: 'R.R3.35.56.5' },
  shuffle_root: { meter: '12/8', name: 'shuffle root', tags: ['blues', 'rock'], energy: [0.2, 0.8], row: 'R.RR.RR.RR.R' },
};
