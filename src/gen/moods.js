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

// Words people use -> canonical mood. Each list is English, then German:
// the app is English, but prompts arrive in both (memory/preferences.md).
export const MOOD_WORDS = {
  happy: ['happy', 'cheerful', 'joyful', 'sunny', 'upbeat', 'fun', 'bright', 'euphori', 'smiling', 'laughing',
    'fröhlich', 'glücklich', 'heiter', 'sonnig', 'freude', 'gute laune', 'lacht', 'lachen'],
  playful: ['playful', 'bouncy', 'quirky', 'silly', 'cute', 'whimsical', 'humorous', 'cheeky', 'funny',
    'verspielt', 'lustig', 'witzig', 'niedlich', 'albern', 'frech'],
  triumphant: ['triumphant', 'victorious', 'victory', 'heroic', 'hero', 'glorious', 'anthem', 'triumphal',
    'triumph', 'siegreich', 'helden', 'hymne'],
  hopeful: ['hopeful', 'uplifting', 'optimistic', 'inspiring', 'hope',
    'hoffnung', 'zuversicht', 'aufbruch'],
  melancholic: ['melancholic', 'melancholy', 'sad', 'sorrowful', 'bittersweet', 'lonely', 'wistful', 'tragic', 'rain', 'rainy',
    'loneliness', 'lonlyness', 'grief', 'tears', 'crying', 'sorrow',
    'traurig', 'melanchol', 'einsam', 'wehmut', 'sehnsucht', 'tränen', 'regen'],
  dreamy: ['dreamy', 'ethereal', 'floating', 'hazy', 'space', 'spacey', 'drowsy',
    'verträumt', 'träum', 'schwebend', 'sphärisch'],
  calm: ['calm', 'peaceful', 'relaxed', 'chill', 'relaxing', 'gentle', 'soft', 'lullaby', 'serene', 'tranquil', 'cozy', 'cosy', 'silence', 'stillness',
    'ruhig', 'ruhe', 'entspann', 'erholung', 'friedlich', 'sanft', 'gemütlich', 'stille', 'gelassen'],
  nostalgic: ['nostalgic', 'nostalgia', 'memories', 'retro feeling', 'good old', 'old school', 'remember',
    'nostalg', 'erinnerung', 'damals', 'alte zeiten'],
  menacing: ['menacing', 'dark', 'evil', 'spooky', 'creepy', 'sinister', 'threatening', 'doom', 'scary', 'horror', 'villain', 'gangster',
    'bedrohlich', 'düster', 'dunkel', 'dunkle', 'böse', 'gruselig', 'unheimlich', 'finster'],
  aggressive: ['aggressive', 'angry', 'furious', 'brutal', 'rage', 'violent',
    'aggressiv', 'wütend', 'wut', 'zorn'],
  tense: ['tense', 'suspense', 'nervous', 'urgent', 'chase', 'danger', 'anxious', 'afraid', 'fear', 'scared', 'panic',
    'spannung', 'spannend', 'nervös', 'hektisch', 'gefahr', 'gefährlich', 'angst', 'panik', 'explosion'],
  mysterious: ['mysterious', 'mystery', 'eerie', 'haunted', 'ghost', 'enigmatic', 'magical', 'magic', 'foggy', 'glowing',
    'geheimnis', 'mysteriös', 'rätsel', 'geister', 'gespenst', 'spuk', 'magisch', 'magie', 'zauber', 'nebel'],
  epic: ['epic', 'powerful', 'grand', 'majestic', 'mighty',
    'episch', 'gewaltig', 'mächtig', 'großartig', 'majestätisch'],
};

// Scenes are cue bundles: mood weights, energy, a style hint and a form hint.
// The scene with most word hits wins, ties go to the earlier one. The newer
// ones follow how the AI composer read real prompts (beach -> calm ambient,
// lullaby -> waltz or folk, chase -> drum and bass, vikings -> metal).
export const SCENES = {
  boss: { words: ['boss', 'final battle', 'bossfight', 'boss fight', 'endgegner', 'endboss'], moods: { menacing: 1, tense: 0.6 }, energy: 0.3, styleHint: { metal: 1.5, cinematic: 0.8, synthwave: 0.6 } },
  viking: { words: ['viking', 'norse', 'dwarf', 'dwarven', 'wiking', 'wikinger', 'zwerge'], moods: { epic: 1, aggressive: 0.5, triumphant: 0.4 }, energy: 0.3, styleHint: { metal: 2, jig: 0.6 } },
  battle: { words: ['battle', 'fight', 'combat', 'kampf', 'schlacht', 'im krieg'], moods: { tense: 0.8, epic: 0.5 }, energy: 0.25, styleHint: { cinematic: 1.2, metal: 1 } },
  chase: { words: ['chase', 'pursuit', 'escape', 'getaway', 'rooftops', 'verfolgung', 'flucht', 'dächer'], moods: { tense: 1, aggressive: 0.3 }, energy: 0.35, styleHint: { dnb: 1.5, cinematic: 0.6 } },
  dungeon: { words: ['dungeon', 'cave', 'crypt', 'labyrinth', 'höhle', 'verlies', 'kerker', 'gruft'], moods: { mysterious: 1, menacing: 0.5 }, energy: -0.2, styleHint: { platformer: 0.8, ambient: 0.5, cinematic: 0.5 } },
  overworld: { words: ['overworld', 'level', 'adventure', 'world map', 'abenteuer'], moods: { happy: 0.6, playful: 0.4 }, energy: 0.05, styleHint: { platformer: 1.5 } },
  title: { words: ['title screen', 'title', 'intro screen', 'titelbild'], moods: { triumphant: 0.7, epic: 0.4 }, energy: 0.1, styleHint: { cinematic: 0.8, demoscene: 0.5 } },
  victory: { words: ['victory', 'win', 'level complete', 'sieg', 'gewonnen'], moods: { triumphant: 1, happy: 0.5 }, energy: 0.15, form: 'short', styleHint: { platformer: 0.8 } },
  credits: { words: ['credits', 'ending', 'farewell', 'abspann'], moods: { nostalgic: 0.8, hopeful: 0.5 }, energy: -0.15, styleHint: { synthwave: 0.6, ambient: 0.4 } },
  tavern: { words: ['tavern', 'pub', 'inn', 'village', 'taverne', 'kneipe', 'wirtshaus', 'dorf'], moods: { happy: 0.7, playful: 0.5 }, energy: 0.1, styleHint: { jig: 2 } },
  shanty: { words: ['shanty', 'pirate', 'sailor', 'seeman', 'shanti', 'piraten', 'matrosen'], moods: { playful: 0.6, triumphant: 0.4, nostalgic: 0.3 }, energy: 0.15, styleHint: { folk: 1.5, jig: 1 } },
  campfire: { words: ['campfire', 'camp fire', 'bonfire', 'sing along', 'singalong', 'lagerfeuer'], moods: { nostalgic: 0.6, happy: 0.5, calm: 0.3 }, energy: -0.1, styleHint: { folk: 1.5 } },
  night_drive: { words: ['night drive', 'driving at night', 'highway', 'nachtfahrt', 'autobahn'], moods: { nostalgic: 0.6, dreamy: 0.4 }, energy: 0, styleHint: { synthwave: 2 } },
  racing: { words: ['racing', 'race', 'speed', 'autorennen', 'rennen', 'rennwagen', 'vollgas'], moods: { tense: 0.4, happy: 0.3 }, energy: 0.3, styleHint: { hardrock: 1.2, dnb: 1, synthwave: 1, metal: 0.6 } },
  beach: { words: ['beach', 'seaside', 'waves', 'shore', 'strand', 'meer', 'meeres', 'wellen', 'brandung', 'küste', 'rauschen'], moods: { calm: 0.8, dreamy: 0.6 }, energy: -0.3, styleHint: { ambient: 1.5, bossa: 0.5 } },
  rainy_night: { words: ['rainy night', 'rain at night', 'city at night', 'regennacht', 'regen bei nacht', 'nachts in der stadt'], moods: { melancholic: 0.7, dreamy: 0.5, nostalgic: 0.4 }, energy: -0.3, styleHint: { lofi: 1.5, jazz: 0.6 } },
  lullaby: { words: ['lullaby', 'cradle song', 'bedtime', 'sleepy', 'schlaflied', 'wiegenlied', 'gute nacht', 'einschlafen'], moods: { calm: 1, dreamy: 0.8 }, energy: -0.45, styleHint: { waltz: 1.5, folk: 1 } },
  fairytale: { words: ['fairytale', 'fairy tale', 'once upon a time', 'red riding hood', 'enchanted', 'märchen', 'rotkäppchen', 'verzaubert'], moods: { mysterious: 0.6, playful: 0.5, dreamy: 0.4 }, energy: -0.1, styleHint: { waltz: 1.2, cinematic: 0.6 } },
  forest: { words: ['forest', 'woods', 'jungle path', 'wald', 'wälder', 'waldes'], moods: { mysterious: 0.8, calm: 0.3 }, energy: -0.15, styleHint: { folk: 1, ambient: 0.8, cinematic: 0.5 } },
  outer_space: { words: ['outer space', 'spaceship', 'space station', 'astronaut', 'galaxy', 'weltraum', 'weltall', 'raumschiff', 'sterne'], moods: { dreamy: 0.7, mysterious: 0.5 }, energy: -0.1, styleHint: { ambient: 1.2, synthwave: 0.6 } },
  romance: { words: ['romantic', 'romance', 'in love', 'candlelight', 'sunset', 'romantisch', 'romantik', 'liebe', 'verliebt', 'kerzenschein', 'sonnenuntergang'], moods: { dreamy: 0.6, hopeful: 0.5, nostalgic: 0.4 }, energy: -0.25, styleHint: { waltz: 1.2, bossa: 0.8 } },
  mourning: { words: ['died', 'death', 'mourning', 'passed away', 'gestorben', 'trauer', 'beerdigung', 'abschied'], moods: { melancholic: 1.2, calm: 0.3 }, energy: -0.4, styleHint: { classical: 1.2, ambient: 0.6 } },
  errand: { words: ['shopping', 'supermarket', 'errand', 'einkaufen', 'supermarkt', 'alltag'], moods: { playful: 0.8, happy: 0.5 }, energy: 0.05, styleHint: { ragtime: 1.2, pop: 0.5 } },
  advert: { words: ['commercial', 'advert', 'advertising', 'werbung', 'werbespot'], moods: { happy: 1, playful: 0.6 }, energy: 0.1, form: 'short', styleHint: { pop: 1.5 } },
  party: { words: ['party', 'celebration', 'feier', 'fete'], moods: { happy: 1, playful: 0.4 }, energy: 0.25, styleHint: { dance: 1.2, funk: 0.8, pop: 0.6 } },
  menu: { words: ['menu', 'shop', 'store', 'menü'], moods: { calm: 0.6, playful: 0.4 }, energy: -0.25, form: 'loop', styleHint: { platformer: 0.8, bossa: 0.5, lofi: 0.5 } },
};
