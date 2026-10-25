// Bass idioms as rows of pitch roles, resolved against the current chord:
// R root, 5 fifth, 8 octave, 3 chord third, 6 major sixth, b flat seventh,
// A approach to the next chord's root, _ hold, . rest.

export const BASS = {
  // ---- 4/4 ----------------------------------------------------------------
  root_8ths: { meter: '4/4', name: 'Grundton in Achteln', tags: ['rock', 'punk', 'metal', 'pop'], energy: [0.3, 0.75], row: 'R.R.R.R.R.R.R.R.' },
  gallop: { meter: '4/4', name: 'Galopp-Bass', tags: ['metal'], energy: [0.5, 1], row: 'R.RRR.RRR.RRR.RR' },
  pedal_16ths: { meter: '4/4', name: 'Orgelpunkt in Sechzehnteln', tags: ['metal', 'synth', 'cinematic'], energy: [0.65, 1], row: 'RRRRRRRRRRRRRRRR' },
  half_note: { meter: '4/4', name: 'lange Grundtöne', tags: ['any'], energy: [0, 0.4], row: 'R_______R_______' },
  whole_note: { meter: '4/4', name: 'liegender Grundton', tags: ['any', 'ambient'], energy: [0, 0.3], row: 'R_______________' },
  octave_8ths: { meter: '4/4', name: 'Oktav-Bass in Achteln', tags: ['synth', 'disco', 'dance'], energy: [0.35, 0.8], row: 'R.8.R.8.R.8.R.8.' },
  octave_16th: { meter: '4/4', name: 'Oktav-Bass in Sechzehnteln', tags: ['synth', 'dance', 'c64'], energy: [0.6, 1], row: 'R8R8R8R8R8R8R8R8' },
  driving_8ths: { meter: '4/4', name: 'treibende Achtel', tags: ['synth', 'rock', 'dance'], energy: [0.4, 1], row: 'R.R.R.R.R.R.R.R.' },
  sustained: { meter: '4/4', name: 'gehaltene Basstöne mit Quinte', tags: ['synth', 'ambient', 'pop'], energy: [0, 0.45], row: 'R_______R___5___' },
  oom_pah: { meter: '4/4', name: 'Umpa-Bass (Grundton, Quinte)', tags: ['game', 'march', 'folk', 'polka'], energy: [0.2, 0.7], row: 'R...5...R...5...' },
  bouncy: { meter: '4/4', name: 'hüpfender Oktav-Quint-Bass', tags: ['game', 'pop'], energy: [0.5, 1], row: 'R.5.8.5.R.5.8.5.' },
  walk: { meter: '4/4', name: 'laufender Bass mit Durchgangstönen', tags: ['game', 'jazz', 'pop'], energy: [0.3, 0.8], row: 'R...3...5...A...' },
  skip: { meter: '4/4', name: 'springender Bass', tags: ['game', 'pop'], energy: [0.5, 1], row: 'R..R..5.R..R..A.' },
  funk_16ths: { meter: '4/4', name: 'Funk-Bass in Sechzehnteln', tags: ['funk', 'disco'], energy: [0.4, 1], row: 'R..R..8.R.b.R.5.' },
  motown: { meter: '4/4', name: 'Motown-Bass', tags: ['soul', 'funk', 'pop'], energy: [0.3, 0.8], row: 'R.5.8.R.6.5.3.A.' },
  trance_offbeat: { meter: '4/4', name: 'Offbeat-Bass', tags: ['trance', 'dance', 'house'], energy: [0.4, 1], row: '..R...R...R...R.' },
  tresillo: { meter: '4/4', name: 'Tresillo (3+3+2)', tags: ['latin', 'reggaeton', 'dance'], energy: [0.3, 0.9], row: 'R..R..R.R..R..R.' },
  reggae: { meter: '4/4', name: 'Reggae-Bass mit Pause auf der Eins', tags: ['reggae', 'dub'], energy: [0.2, 0.7], row: '....R..5..R.8...' },
  boogie8: { meter: '4/4', name: 'Boogie-Bass', tags: ['boogie', 'rock', 'blues'], energy: [0.4, 1], row: 'R.3.5.6.b.6.5.3.' },
  bossa_bass: { meter: '4/4', name: 'Bossa-Bass (Grundton, Quinte)', tags: ['latin', 'jazz', 'lounge'], energy: [0.1, 0.7], row: 'R__5R__5R__5R__5' },
  trap808: { meter: '4/4', name: '808-Bass mit langen Tönen', tags: ['hiphop', 'trap'], energy: [0.2, 1], row: 'R_______..R_R___' },
  country: { meter: '4/4', name: 'Country-Bass (Grundton, Quinte im Wechsel)', tags: ['country'], energy: [0.3, 1], row: 'R.......5.......' },
  rocknroll: { meter: '4/4', name: "Rock'n'Roll-Bass", tags: ['rock', 'rockabilly', 'country'], energy: [0.4, 1], row: 'R.3.5.6.8.6.5.3.' },
  fuzz_8ths: { meter: '4/4', name: 'Fuzz-Bass in Achteln mit Oktave', tags: ['rock', 'alternative'], energy: [0.5, 1], row: 'R.R.R.R.8.R.R.5.' },
  riff_unison: { meter: '4/4', name: 'Riff im Unisono', tags: ['metal', 'rock'], energy: [0.5, 1], row: 'R.R5.RR.R.R5.RA.' },

  // ---- 3/4 ----------------------------------------------------------------
  waltz_bass: { meter: '3/4', name: 'Walzer-Bass', tags: ['waltz', 'classical'], energy: [0, 1], row: 'R___________' },
  waltz_fifth: { meter: '3/4', name: 'Walzer-Bass mit Quinte', tags: ['waltz', 'folk'], energy: [0.3, 1], row: 'R.......5...' },

  // ---- 6/8 ----------------------------------------------------------------
  drone: { meter: '6/8', name: 'Bordun (liegender Grundton)', tags: ['folk', 'celtic', 'medieval'], energy: [0, 0.5], row: 'R___________' },
  one_four: { meter: '6/8', name: 'Grundton auf 1 und 4', tags: ['folk', 'celtic'], energy: [0.2, 0.8], row: 'R.....5.....' },
  oom_pah6: { meter: '6/8', name: 'Umpa-Bass im 6/8', tags: ['folk', 'celtic'], energy: [0.5, 1], row: 'R...5.R...5.' },
  gallop68: { meter: '6/8', name: 'Galopp-Bass im 6/8', tags: ['metal', 'folk'], energy: [0.5, 1], row: 'R.RRR.R.RRR.' },
  pedal68: { meter: '6/8', name: 'Orgelpunkt im 6/8', tags: ['metal'], energy: [0.6, 1], row: 'RRRRRRRRRRRR' },
  run6: { meter: '6/8', name: 'laufender Bass im 6/8', tags: ['folk', 'rock'], energy: [0.5, 1], row: 'R.3.5.R.3.5.' },

  // ---- 12/8 ---------------------------------------------------------------
  walk12: { meter: '12/8', name: 'Walking Bass', tags: ['jazz', 'blues', 'swing'], energy: [0.2, 0.9], row: 'R..3..5..A..' },
  boogie12: { meter: '12/8', name: 'Boogie-Shuffle-Bass', tags: ['blues', 'boogie', 'rock'], energy: [0.4, 1], row: 'R.R3.35.56.5' },
  shuffle_root: { meter: '12/8', name: 'Shuffle-Grundton', tags: ['blues', 'rock'], energy: [0.2, 0.8], row: 'R.RR.RR.RR.R' },
};
