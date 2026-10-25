// Mood words as additive offsets on the descriptor. Research:
// mode explains most of perceived valence, tempo next, register after that;
// cues add up without interacting (Eerola, Friberg & Bresin 2013). Values
// are exaggerated on purpose because generated music drifts toward
// neutrality, most of all for low-arousal moods (AImoclips 2025).
//
// brightness: shift of the target mode brightness (0 dark .. 1 bright)
// tempo:      tempo multiplier
// energy:     shift of section energy (density, drum level, filter)
// register:   lead register shift in semitones
// legato:     -1 staccato .. +1 legato
// tension:    0..1, chromatic approach notes, harmonic minor, dim chords
// sevenths:   shift of the probability of 7th-chord colour

export const MOODS = {
  happy: { brightness: 0.45, tempo: 1.12, energy: 0.1, register: 3, legato: -0.4, tension: 0, sevenths: -0.1 },
  playful: { brightness: 0.35, tempo: 1.1, energy: 0.05, register: 4, legato: -0.7, tension: 0, sevenths: 0 },
  triumphant: { brightness: 0.4, tempo: 1.08, energy: 0.2, register: 4, legato: 0.2, tension: 0, sevenths: -0.2 },
  hopeful: { brightness: 0.35, tempo: 1.0, energy: 0, register: 2, legato: 0.4, tension: 0, sevenths: 0.1 },
  melancholic: { brightness: -0.4, tempo: 0.78, energy: -0.25, register: -3, legato: 0.8, tension: 0.1, sevenths: 0.15 },
  dreamy: { brightness: 0.05, tempo: 0.82, energy: -0.3, register: 2, legato: 0.9, tension: 0, sevenths: 0.5 },
  calm: { brightness: 0.1, tempo: 0.8, energy: -0.35, register: 0, legato: 0.8, tension: 0, sevenths: 0.2 },
  nostalgic: { brightness: -0.05, tempo: 0.9, energy: -0.15, register: 0, legato: 0.6, tension: 0, sevenths: 0.35 },
  menacing: { brightness: -0.55, tempo: 1.0, energy: 0.1, register: -6, legato: -0.2, tension: 0.7, sevenths: -0.3 },
  aggressive: { brightness: -0.45, tempo: 1.18, energy: 0.3, register: -3, legato: -0.6, tension: 0.4, sevenths: -0.3 },
  tense: { brightness: -0.35, tempo: 1.05, energy: 0.05, register: 0, legato: -0.5, tension: 0.8, sevenths: -0.1 },
  mysterious: { brightness: -0.25, tempo: 0.88, energy: -0.2, register: 2, legato: 0.3, tension: 0.5, sevenths: 0.2 },
  epic: { brightness: -0.1, tempo: 1.0, energy: 0.25, register: 2, legato: 0.3, tension: 0.2, sevenths: -0.2 },
};

// Words people use (English and German) -> canonical mood.
export const MOOD_WORDS = {
  happy: ['happy', 'cheerful', 'joyful', 'sunny', 'upbeat', 'fun', 'bright', 'fröhlich', 'froh', 'glücklich', 'heiter', 'sonnig', 'lustig', 'gute laune'],
  playful: ['playful', 'bouncy', 'quirky', 'silly', 'cute', 'whimsical', 'humorous', 'verspielt', 'niedlich', 'witzig', 'hüpfend'],
  triumphant: ['triumphant', 'victorious', 'victory', 'heroic', 'hero', 'glorious', 'anthem', 'triumphal', 'siegreich', 'sieg', 'heldenhaft', 'held', 'hymne'],
  hopeful: ['hopeful', 'uplifting', 'optimistic', 'inspiring', 'hoffnungsvoll', 'optimistisch', 'aufbauend'],
  melancholic: ['melancholic', 'melancholy', 'sad', 'sorrowful', 'bittersweet', 'lonely', 'wistful', 'tragic', 'rain', 'rainy', 'melancholisch', 'traurig', 'wehmütig', 'einsam', 'regen', 'tragisch'],
  dreamy: ['dreamy', 'ethereal', 'floating', 'hazy', 'space', 'spacey', 'verträumt', 'träumerisch', 'schwebend', 'weltraum'],
  calm: ['calm', 'peaceful', 'relaxed', 'chill', 'relaxing', 'gentle', 'soft', 'lullaby', 'ruhig', 'friedlich', 'entspannt', 'sanft', 'gemütlich', 'wiegenlied'],
  nostalgic: ['nostalgic', 'nostalgia', 'memories', 'retro feeling', 'nostalgisch', 'erinnerung', 'sehnsucht'],
  menacing: ['menacing', 'dark', 'evil', 'spooky', 'creepy', 'sinister', 'threatening', 'doom', 'scary', 'horror', 'villain', 'bedrohlich', 'düster', 'dunkel', 'böse', 'unheimlich', 'gruselig', 'finster'],
  aggressive: ['aggressive', 'angry', 'furious', 'brutal', 'rage', 'violent', 'aggressiv', 'wütend', 'brutal', 'wut'],
  tense: ['tense', 'suspense', 'nervous', 'urgent', 'chase', 'danger', 'anxious', 'angespannt', 'spannung', 'nervös', 'verfolgung', 'gefahr', 'hektisch'],
  mysterious: ['mysterious', 'mystery', 'eerie', 'haunted', 'ghost', 'spuk', 'enigmatic', 'magical', 'magic', 'mysteriös', 'geheimnisvoll', 'rätselhaft', 'magisch'],
  epic: ['epic', 'powerful', 'grand', 'majestic', 'mighty', 'episch', 'gewaltig', 'mächtig', 'majestätisch', 'kraftvoll'],
};

// Scenes are cue bundles: mood weights, energy, a style hint and a form hint.
export const SCENES = {
  boss: { words: ['boss', 'final battle', 'endgegner', 'bossfight', 'boss fight'], moods: { menacing: 1, tense: 0.6 }, energy: 0.3, styleHint: { metal: 1.5, cinematic: 0.8, synthwave: 0.6 } },
  battle: { words: ['battle', 'fight', 'combat', 'kampf', 'schlacht'], moods: { tense: 0.8, epic: 0.5 }, energy: 0.25, styleHint: { cinematic: 1.2, metal: 1 } },
  dungeon: { words: ['dungeon', 'cave', 'crypt', 'labyrinth', 'höhle', 'gruft', 'verlies'], moods: { mysterious: 1, menacing: 0.5 }, energy: -0.2, styleHint: { platformer: 0.8, ambient: 0.5, cinematic: 0.5 } },
  overworld: { words: ['overworld', 'level', 'adventure', 'world map', 'abenteuer', 'oberwelt'], moods: { happy: 0.6, playful: 0.4 }, energy: 0.05, styleHint: { platformer: 1.5 } },
  title: { words: ['title screen', 'title', 'intro screen', 'titelbild', 'titelmusik'], moods: { triumphant: 0.7, epic: 0.4 }, energy: 0.1, styleHint: { cinematic: 0.8, demoscene: 0.5 } },
  victory: { words: ['victory', 'win', 'level complete', 'gewonnen', 'geschafft'], moods: { triumphant: 1, happy: 0.5 }, energy: 0.15, form: 'short', styleHint: { platformer: 0.8 } },
  credits: { words: ['credits', 'ending', 'farewell', 'abspann', 'ende', 'abschied'], moods: { nostalgic: 0.8, hopeful: 0.5 }, energy: -0.15, styleHint: { synthwave: 0.6, ambient: 0.4 } },
  tavern: { words: ['tavern', 'pub', 'inn', 'village', 'taverne', 'kneipe', 'wirtshaus', 'dorf'], moods: { happy: 0.7, playful: 0.5 }, energy: 0.1, styleHint: { jig: 2 } },
  night_drive: { words: ['night drive', 'driving at night', 'highway', 'nachtfahrt', 'autobahn'], moods: { nostalgic: 0.6, dreamy: 0.4 }, energy: 0, styleHint: { synthwave: 2 } },
  racing: { words: ['racing', 'race', 'speed', 'rennen', 'rennspiel'], moods: { tense: 0.4, happy: 0.3 }, energy: 0.3, styleHint: { dnb: 1, synthwave: 1, metal: 0.6 } },
  menu: { words: ['menu', 'shop', 'store', 'menü', 'laden'], moods: { calm: 0.6, playful: 0.4 }, energy: -0.25, form: 'loop', styleHint: { platformer: 0.8, bossa: 0.5, lofi: 0.5 } },
};
