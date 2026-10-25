// Sound choices per role (instrument names from instruments.js) and
// composer personas: habits of famous C64 composers as weight multipliers
// (the design notes: Hubbard multiplexed bass and drums and used arp chords,
// Galway avoided percussion and used clean waveforms and PWM, Tel packed a
// one-chip band, Follin wrote virtuosic arps without percussion).

export const LEADS = {
  lead: 'Pulse-Lead mit Pulsbreiten-Modulation', saw: 'Sägezahn-Lead', brass: 'weiches Brass', bell: 'Glocke',
  pluck: 'gezupfter Pulse', hubbard: 'Hubbard-Lead', whistle: 'Flöte (Dreieck)', fiddle: 'Fiddle (Sägezahn mit Vibrato)',
  fuzz: 'Fuzz-Lead (verzerrte Gitarre)',
};
// 'custom' is the lead designed in the brief's `sound` (LLM path only).
export const CUSTOM_LEAD = 'custom';
export const BASSES = { bass: 'Pulse-Bass mit Klick', sub: 'runder Sub-Bass', slap: 'Slap-Bass', acid: 'Acid-Sägezahn', drone: 'Bordun-Sägezahn' };
export const SNARES = { snare: 'Rausch-Snare', snare2: 'tonale Rock-Snare', clap: 'Clap' };

export const PERSONAS = {
  none: { name: 'keine', textures: {}, leads: {} },
  hubbard: { name: 'Rob Hubbard', textures: { hubbard: 4, call_response: 2 }, leads: { hubbard: 4 }, fills: 1.5 },
  galway: { name: 'Martin Galway', textures: { no_drums: 4, arp_lead: 2, twin_lead: 2 }, leads: { lead: 2, bell: 2, whistle: 1.5 }, drums: 0.3 },
  tel: { name: 'Jeroen Tel', textures: { hubbard: 3, full: 2 }, leads: { saw: 2, lead: 2 }, fills: 1.3 },
  follin: { name: 'Tim Follin', textures: { no_drums: 3, twin_lead: 3, arp_swell: 2 }, leads: { brass: 2, saw: 2 }, drums: 0.2, arpBusy: true },
};
