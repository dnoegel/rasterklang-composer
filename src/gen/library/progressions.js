// Named chord loops (roman numerals against the tonic, read chromatically
// against major: bVI = 8 semitones). Sourced loops: Open Music Theory
// four-chord schemas, Wikipedia's list of progressions, the J-pop royal
// road; the rest are genre conventions (D). `bars` is the loop length;
// one chord per bar unless a bar holds two ("I V").

export const PROGRESSIONS = {
  // ---- minor -----------------------------------------------------------
  aeolian_loop: { tonality: 'minor', chords: ['i', 'bVI', 'bIII', 'bVII'], tags: ['synth', 'epic', 'pop', 'cinematic'], moods: ['nostalgic', 'melancholic', 'epic'] },
  minor_rise: { tonality: 'minor', chords: ['i', 'i', 'bVI', 'bVII'], tags: ['metal', 'rock', 'synth'], moods: ['epic', 'tense'] },
  andalusian: { tonality: 'minor', chords: ['i', 'bVII', 'bVI', 'V'], tags: ['flamenco', 'metal', 'cinematic', 'game'], moods: ['menacing', 'tense', 'mysterious'] },
  phrygian_vamp: { tonality: 'minor', chords: ['i', 'bII', 'i', 'bII'], tags: ['metal', 'cinematic'], moods: ['menacing', 'aggressive', 'tense'] },
  minor_four: { tonality: 'minor', chords: ['i', 'iv', 'bVI', 'bVII'], tags: ['metal', 'synth', 'rock'], moods: ['melancholic', 'epic'] },
  minor_shuttle: { tonality: 'minor', chords: ['i', 'bVII', 'bVI', 'bVII'], tags: ['rock', 'synth', 'metal'], moods: ['nostalgic', 'tense'] },
  victory_minor: { tonality: 'minor', chords: ['bVI', 'bVII', 'i', 'i'], tags: ['metal', 'epic', 'synth', 'cinematic'], moods: ['triumphant', 'epic'] },
  harmonic_cadence: { tonality: 'minor', chords: ['i', 'iv', 'i', 'V'], tags: ['classical', 'game', 'folk'], moods: ['mysterious', 'tense', 'melancholic'] },
  double_tonic_m: { tonality: 'minor', chords: ['i', 'bVII', 'i', 'bVII'], tags: ['folk', 'celtic', 'rock'], moods: ['playful', 'mysterious'] },
  dorian_vamp: { tonality: 'minor', chords: ['i', 'IV', 'i', 'IV'], tags: ['funk', 'folk', 'synth', 'jazz'], moods: ['dreamy', 'playful', 'calm'] },
  dorian_rock: { tonality: 'minor', chords: ['i', 'bIII', 'bVII', 'IV'], tags: ['rock', 'synth', 'folk'], moods: ['hopeful', 'nostalgic'] },
  minor_epic: { tonality: 'minor', chords: ['bVI', 'bIII', 'bVII', 'i'], tags: ['epic', 'synth', 'cinematic'], moods: ['epic', 'hopeful', 'triumphant'] },
  minor_bridge: { tonality: 'minor', chords: ['iv', 'bVI', 'bVII', 'bVII'], tags: ['any'], moods: [], role: 'bridge' },
  phrygian_bridge: { tonality: 'minor', chords: ['bII', 'bII', 'i', 'i'], tags: ['metal', 'cinematic'], moods: ['menacing'], role: 'bridge' },
  minor_lament: { tonality: 'minor', chords: ['i', 'v', 'bVI', 'bIII'], tags: ['ballad', 'synth', 'cinematic'], moods: ['melancholic', 'nostalgic'] },
  minor_blues: { tonality: 'minor', chords: ['i7', 'i7', 'i7', 'i7', 'iv7', 'iv7', 'i7', 'i7', 'bVI7', 'V7', 'i7', 'V7'], tags: ['blues', 'jazz'], moods: ['melancholic', 'tense'], form: 'blues12' },

  // ---- major -----------------------------------------------------------
  pop_axis: { tonality: 'major', chords: ['I', 'V', 'vi', 'IV'], tags: ['pop', 'rock', 'synth', 'game'], moods: ['hopeful', 'happy', 'nostalgic'] },
  sensitive: { tonality: 'major', chords: ['vi', 'IV', 'I', 'V'], tags: ['pop', 'synth', 'ballad'], moods: ['nostalgic', 'melancholic', 'hopeful'] },
  royal_road: { tonality: 'major', chords: ['IVM7', 'V7', 'iii7', 'vi'], tags: ['jpop', 'synth', 'game', 'pop'], moods: ['nostalgic', 'dreamy', 'hopeful'] },
  doo_wop: { tonality: 'major', chords: ['I', 'vi', 'IV', 'V'], tags: ['pop', 'game', '50s'], moods: ['happy', 'romantic', 'nostalgic'] },
  classic_cadence: { tonality: 'major', chords: ['I', 'IV', 'V', 'I'], tags: ['game', 'folk', 'march', 'pop'], moods: ['happy', 'triumphant', 'playful'] },
  rock_shuttle: { tonality: 'major', chords: ['I', 'V', 'IV', 'V'], tags: ['rock', 'game', 'pop'], moods: ['happy', 'playful'] },
  mixolydian_rock: { tonality: 'major', chords: ['I', 'bVII', 'IV', 'I'], tags: ['rock', 'metal', 'folk'], moods: ['triumphant', 'playful'] },
  double_tonic: { tonality: 'major', chords: ['I', 'bVII', 'I', 'bVII'], tags: ['folk', 'celtic', 'rock'], moods: ['playful', 'happy'] },
  lift: { tonality: 'major', chords: ['IV', 'V', 'I', 'I'], tags: ['pop', 'game', 'march'], moods: ['triumphant', 'happy', 'hopeful'] },
  victory_major: { tonality: 'major', chords: ['bVI', 'bVII', 'I', 'I'], tags: ['game', 'epic', 'metal', 'cinematic'], moods: ['triumphant', 'epic'] },
  ascend: { tonality: 'major', chords: ['I', 'iii', 'IV', 'V'], tags: ['pop', 'synth', 'game'], moods: ['hopeful', 'happy'] },
  jazz_turn: { tonality: 'major', chords: ['IM7', 'vi7', 'ii7', 'V7'], tags: ['jazz', 'lounge', 'game'], moods: ['calm', 'romantic', 'dreamy'] },
  circle: { tonality: 'major', chords: ['vi7', 'ii7', 'V7', 'IM7'], tags: ['jazz', 'lounge', 'pop'], moods: ['romantic', 'calm', 'nostalgic'] },
  folk_one_four: { tonality: 'major', chords: ['I', 'IV', 'I', 'V'], tags: ['folk', 'celtic', 'country'], moods: ['happy', 'calm'] },
  lydian_float: { tonality: 'major', chords: ['IM7', 'II', 'IM7', 'II'], tags: ['ambient', 'synth', 'game'], moods: ['dreamy', 'mysterious', 'hopeful'] },
  major_bridge: { tonality: 'major', chords: ['IV', 'iv', 'I', 'V'], tags: ['any'], moods: ['nostalgic'], role: 'bridge' },
  relative_bridge: { tonality: 'major', chords: ['vi', 'iii', 'IV', 'V'], tags: ['any'], moods: [], role: 'bridge' },
  major_blues: { tonality: 'major', chords: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'], tags: ['blues', 'rock', 'boogie'], moods: ['playful', 'happy'], form: 'blues12' },
};
