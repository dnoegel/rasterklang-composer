// Textures: which role each of the three SID voices plays, bar by bar,
// inside a section. Roles: D drums, B bass, L lead, A chord arpeggio,
// M bass and drums on one voice (Rob Hubbard's trick), - silent.
// stages: [fromFraction, roles] in order. lead: which motifs the lead
// uses (own section, 'verse' or 'chorus' material). drums: override for
// the drum part. filter: 'sweep' opens the filter over the section.
// Research: game "vertical layering" and EDM muting of one repeating
// sequence.

export const TEXTURES = {
  // ---- main sections ---------------------------------------------------
  full: { kind: 'main', name: 'volle Band: Drums, Bass, Lead', stages: [[0, 'DBL']] },
  hubbard: { kind: 'main', name: 'Bass+Drums auf einer Stimme, Akkord-Arps, Lead', stages: [[0, 'MAL']] },
  no_drums: { kind: 'main', name: 'Bass, Akkord-Arps, Lead, ohne Drums', stages: [[0, 'BAL']] },
  groove_chords: { kind: 'main', name: 'Drums, Bass, Akkord-Arps (instrumental)', stages: [[0, 'DBA']] },
  call_response: { kind: 'main', name: 'Lead und Arps wechseln sich ab', stages: [[0, 'DBL'], [0.5, 'DBA']] },

  // ---- intros ----------------------------------------------------------
  staggered: { kind: 'intro', name: 'gestaffelter Einstieg: Bass, dann Drums, dann Akkorde', stages: [[0, '-B-'], [0.25, 'DB-'], [0.5, 'DBA']] },
  riff_solo: { kind: 'intro', name: 'Riff solo, Band steigt ein', stages: [[0, '--L'], [0.5, '-BL'], [0.75, 'DBL']], lead: 'verse' },
  countin: { kind: 'intro', name: 'Drum-Einzähler, dann volle Band', stages: [[0, 'D--'], [0.5, 'DBA']], drums: 'fill' },
  cold_start: { kind: 'intro', name: 'Kaltstart mit dem Refrain-Thema', stages: [[0, 'DBL']], lead: 'chorus', energy: 0.85 },
  arp_swell: { kind: 'intro', name: 'Akkord-Arps mit sich öffnendem Filter', stages: [[0, '-A-'], [0.5, 'BA-']], filter: 'sweep' },
  drone_lead: { kind: 'intro', name: 'Bordun mit freier Melodie', stages: [[0, 'B-L']], lead: 'verse', bass: 'drone' },
  twin_lead: { kind: 'intro', name: 'Lead über Akkorden, ohne Drums', stages: [[0, '-AL']], lead: 'chorus' },
  drum_groove: { kind: 'intro', name: 'Groove allein, Bass kommt dazu', stages: [[0, 'D--'], [0.5, 'DB-']] },

  // ---- breakdowns and builds ---------------------------------------------
  bass_alone: { kind: 'breakdown', name: 'Bass allein, Drums kommen zurück', stages: [[0, '-B-'], [0.5, 'DB-']] },
  arp_lead: { kind: 'breakdown', name: 'nur Akkorde und Lead', stages: [[0, '-AL']] },
  halftime_break: { kind: 'breakdown', name: 'Halftime-Breakdown', stages: [[0, 'DBA']], drums: 'halftime' },
  drop_out: { kind: 'breakdown', name: 'Drums und Bass ohne Melodie', stages: [[0, 'DB-']] },
  snare_build: { kind: 'build', name: 'Aufbau mit Snare-Wirbel', stages: [[0, 'DBA']], drums: 'build', filter: 'sweep' },

  // ---- outros ------------------------------------------------------------
  fade_layers: { kind: 'outro', name: 'Stimmen steigen nacheinander aus', stages: [[0, 'DBL'], [0.5, 'DB-'], [0.75, '-B-']] },
  final_hit: { kind: 'outro', name: 'volle Band, Schlussakkord', stages: [[0, 'DBA']] },
  riff_out: { kind: 'outro', name: 'Thema zum Schluss, Schlussakkord', stages: [[0, 'DBL']], lead: 'chorus' },
  arp_out: { kind: 'outro', name: 'Akkorde klingen aus', stages: [[0, 'BA-'], [0.5, '-A-']] },
};

// Section type -> texture kind used to pick candidates.
export const KIND_OF = {
  intro: 'intro', verse: 'main', pre: 'main', chorus: 'main', bridge: 'main', solo: 'main',
  breakdown: 'breakdown', build: 'build', outro: 'outro',
};

// Transitions at the end of a section.
export const TRANSITIONS = {
  fill: { name: 'Drum-Fill' },
  stop: { name: 'Stop-Time: Band hält an' },
  dropout: { name: 'Drums setzen einen Takt aus' },
  none: { name: 'direkter Übergang' },
};
