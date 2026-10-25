// Form templates: [section type, bars]. Bar counts follow the research
// (8/16-bar units, 12-bar blues, AABB reels, EDM blocks, game loops).

export const FORMS = {
  verse_chorus: { name: 'verse/chorus', sections: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['bridge', 8], ['chorus', 8], ['outro', 4]] },
  verse_pre_chorus: { name: 'verse/pre-chorus/chorus', sections: [['intro', 4], ['verse', 8], ['pre', 4], ['chorus', 8], ['verse', 8], ['pre', 4], ['chorus', 8], ['breakdown', 4], ['chorus', 8], ['outro', 4]] },
  metal: { name: 'metal with solo and breakdown', sections: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['solo', 8], ['breakdown', 4], ['chorus', 8], ['outro', 2]] },
  aaba: { name: 'AABA (32 bars)', sections: [['intro', 4], ['verse', 8], ['verse', 8], ['bridge', 8], ['verse', 8], ['solo', 8], ['bridge', 8], ['verse', 8], ['outro', 2]] },
  game_loop: { name: 'game loop (A B A C A)', sections: [['intro', 2], ['verse', 8], ['chorus', 8], ['verse', 8], ['bridge', 8], ['chorus', 8], ['verse', 8], ['outro', 2]] },
  folk_aabb: { name: 'AABB, twice', sections: [['intro', 2], ['verse', 8], ['verse', 8], ['chorus', 8], ['chorus', 8], ['verse', 8], ['verse', 8], ['chorus', 8], ['chorus', 8], ['outro', 2]] },
  edm: { name: 'build-up and drop', sections: [['intro', 8], ['build', 4], ['chorus', 8], ['breakdown', 8], ['build', 4], ['chorus', 8], ['outro', 4]] },
  blues12: { name: '12-bar blues', sections: [['intro', 2], ['verse', 12], ['verse', 12], ['solo', 12], ['verse', 12], ['outro', 2]] },
  short: { name: 'short', sections: [['intro', 2], ['verse', 8], ['chorus', 8], ['outro', 2]] },
  loop: { name: 'Loop', sections: [['verse', 8], ['chorus', 8]] },
};

export const SECTION_ENERGY = {
  intro: 0.3, verse: 0.55, pre: 0.65, chorus: 0.85, bridge: 0.45, solo: 0.9, breakdown: 0.3, build: 0.6, outro: 0.3,
};
