// Drum grooves, one SID voice: one hit per step.
// k kick, s snare, S tonal snare, c clap, h hat, o open hat, t/T toms,
// x crash, . rest. levels: density L0..L3 (research: anchors only, main
// groove, + ghosts/hats, + doubles/open hats). Rows marked D in the
// research are defaults to check by ear.

export const GROOVES = {
  // ---- 4/4 ---------------------------------------------------------------
  rock: { meter: '4/4', name: 'Rock-Backbeat', tags: ['rock', 'pop', 'metal'], energy: [0.2, 0.8],
    levels: ['x...............', 'k.h.s.h.k.h.s.h.', 'k.hks.h.k.kks.h.', 'k.hks.hhk.kks.ho'] },
  metal_gallop: { meter: '4/4', name: 'Galopp', tags: ['metal'], energy: [0.5, 1],
    levels: ['k.kk............', 'k.kks.kkk.kks.kk', 'k.kks.kkk.kks.kk', 'kkkkskkkk.kkskkk'] },
  double_kick: { meter: '4/4', name: 'Doublebass', tags: ['metal'], energy: [0.65, 1],
    levels: ['kkkkkkkkkkkkkkkk', 'kkkkskkkkkkkskkk', 'kkkkskkkkkkkskkk', 'kkkkskkkkkkkskks'] },
  thrash_skank: { meter: '4/4', name: 'Thrash-Skank-Beat', tags: ['metal', 'punk'], energy: [0.7, 1],
    levels: ['k...k...k...k...', 'k.s.k.s.k.s.k.s.', 'k.s.k.s.k.s.k.s.', 'kssskssskssskss.'] },
  blast: { meter: '4/4', name: 'Blastbeat', tags: ['metal'], energy: [0.85, 1],
    levels: ['ksksksksksksksks', 'ksksksksksksksks', 'ksksksksksksksks', 'ksksksksksksksks'] },
  halftime: { meter: '4/4', name: 'Halftime', tags: ['metal', 'rock', 'hiphop', 'cinematic'], energy: [0.1, 0.7],
    levels: ['k...............', 'k.......s.......', 'k.h.h.h.s.h.h.h.', 'k.hkh.h.s.hkh.hh'] },
  d_beat: { meter: '4/4', name: 'D-Beat', tags: ['punk', 'metal'], energy: [0.6, 1],
    levels: ['k.....k.k.......', 'k.h.s.hkk.h.s.h.', 'k.h.s.hkk.h.s.hh', 'k.hks.hkk.hks.hh'] },
  four_floor: { meter: '4/4', name: 'Four-on-the-floor', tags: ['dance', 'house', 'synth', 'trance'], energy: [0.3, 1],
    levels: ['k...k...k...k...', 'k...c...k...c...', 'k.h.c.h.k.h.c.h.', 'k.hoc.hok.hoc.ho'] },
  synth_gated: { meter: '4/4', name: 'Gated Backbeat', tags: ['synth'], energy: [0.15, 0.9],
    levels: ['k.......k.......', 'k...s...k...s...', 'k.h.s.h.k.h.s.h.', 'k.h.s.hhk.h.s.ho'] },
  disco: { meter: '4/4', name: 'Disco', tags: ['dance', 'funk', 'synth'], energy: [0.4, 1],
    levels: ['k...k...k...k...', 'k.o.s.o.k.o.s.o.', 'kho.shohkho.shoh', 'kho.shohkhoksho.'] },
  breakbeat: { meter: '4/4', name: 'Breakbeat', tags: ['dance', 'breaks', 'dnb'], energy: [0.4, 1],
    levels: ['k.........k.....', 'k.h.s.h..kh.s.h.', 'k.h.s..s.kh.s..s', 'k.hks..s.khks.hs'] },
  dnb: { meter: '4/4', name: 'Drum & Bass Two-Step', tags: ['dnb', 'dance'], energy: [0.5, 1],
    levels: ['k.........k.....', 'k...s.....k.s...', 'k.h.s.h.h.k.s.h.', 'khhhshhhhhkhshhh'] },
  funk: { meter: '4/4', name: 'Funk', tags: ['funk', 'disco'], energy: [0.3, 0.9],
    levels: ['k.........k.....', 'k.h.s.hkh.k.s.h.', 'k.hks.hkh.khs.hs', 'khhkshhkhhkhshhs'] },
  boombap: { meter: '4/4', name: 'Boom Bap', tags: ['hiphop', 'lofi'], energy: [0.2, 0.7],
    levels: ['k.........k.....', 'k......kk.k.s...', 'k.h.s.hkk.h.s.h.', 'k.h.s.hkk.hks.hh'] },
  platform_light: { meter: '4/4', name: 'Leichte Spiele-Drums', tags: ['game', 'pop'], energy: [0.1, 0.9],
    levels: ['h...h...h...h...', 'k...s...k...s...', 'k.h.s.h.k.k.s.h.', 'k.hhs.hhk.k.s.hh'] },
  march: { meter: '4/4', name: 'Marsch', tags: ['march', 'cinematic', 'game'], energy: [0.3, 1],
    levels: ['k.......k.......', 'k...s...k...s.s.', 'k.s.s.s.k.s.ssss', 'kss.s.s.kss.ssss'] },
  one_drop: { meter: '4/4', name: 'Reggae One Drop', tags: ['reggae'], energy: [0.2, 0.7],
    levels: ['........k.......', '..h...h.k.h...h.', '..h.h.h.k.h.h.h.', 'h.h.h.h.k.h.hoh.'] },
  ska: { meter: '4/4', name: 'Ska', tags: ['ska', 'reggae'], energy: [0.5, 1],
    levels: ['k...s...k...s...', 'k.h.s.h.k.h.s.h.', 'kohos.hokohos.ho', 'kohoskhokohoskho'] },
  bossa: { meter: '4/4', name: 'Bossa Nova', tags: ['latin', 'jazz', 'lounge'], energy: [0.1, 0.7],
    levels: ['k.....k.k.....k.', 'k..c..k.k.c..c..', 'k.hch.k.khc.hch.', 'khhchhkhkhchhchh'] },
  trap: { meter: '4/4', name: 'Trap (Halftime, Hi-Hat-Rolls)', tags: ['hiphop', 'trap', 'pop'], energy: [0.3, 1],
    levels: ['k.......s.......', 'k.h.h.h.s.h.h.h.', 'k.hhh.hks.hhhhh.', 'khhhhhhkshhhhhhh'] },
  train: { meter: '4/4', name: 'Train-Beat (Country)', tags: ['country', 'rockabilly'], energy: [0.3, 1],
    levels: ['k.......k.......', 'k.s.k.s.k.s.k.s.', 'khshkhshkhshkhsh', 'khshkhshkhshkhss'] },
  grunge: { meter: '4/4', name: 'Schwerer Rock-Beat mit offenen Hi-Hats', tags: ['rock', 'alternative'], energy: [0.4, 1],
    levels: ['k.......s.......', 'k.o.s.o.k.o.s.o.', 'k.oks.o.kko.s.o.', 'kooksooxkkooso.o'] },
  tom_pulse: { meter: '4/4', name: 'Tom-Puls', tags: ['cinematic', 'tribal'], energy: [0.2, 1],
    levels: ['t.......t.......', 't...t...t...t...', 't.tTt...t.tTt...', 't.tTt.TTt.tTt.TT'] },

  // ---- 3/4 ---------------------------------------------------------------
  waltz: { meter: '3/4', name: 'Walzer', tags: ['waltz', 'classical', 'folk'], energy: [0.1, 0.9],
    levels: ['k...........', 'k...h...h...', 'k...s...s...', 'k.h.s.h.s.h.'] },

  // ---- 6/8 ---------------------------------------------------------------
  bodhran: { meter: '6/8', name: 'Bodhrán', tags: ['folk', 'celtic'], energy: [0.1, 1],
    levels: ['t.....t.....', 't.....t.....', 't.T.T.t.T.T.', 't.TTT.t.TTT.'] },
  metal_68: { meter: '6/8', name: 'Metal im 6/8 (Doublebass)', tags: ['metal', 'folk'], energy: [0.5, 1],
    levels: ['k.....k.....', 'k.kks.k.kks.', 'kkkkskkkkks.', 'kkkkskkkkksk'] },
  jig_kit: { meter: '6/8', name: '6/8-Schlagzeug', tags: ['folk', 'rock'], energy: [0.3, 1],
    levels: ['k.....k.....', 'k.....s.....', 'k.h.h.s.h.h.', 'k.hhh.s.hhh.'] },

  // ---- 12/8 (triplet grid) -------------------------------------------------
  shuffle: { meter: '12/8', name: 'Shuffle', tags: ['blues', 'rock', 'boogie'], energy: [0.3, 1],
    levels: ['k.....k.....', 'k..s..k..s..', 'k.hs.hk.hs.h', 'kkhs.hkkhs.h'] },
  swing_ride: { meter: '12/8', name: 'Swing-Ride', tags: ['jazz', 'swing'], energy: [0.1, 0.8],
    levels: ['h.....h.....', 'h..h.hh..h.h', 'h..s.hh..s.h', 'k..s.hk..s.h'] },
  slow_blues: { meter: '12/8', name: 'Slow Blues', tags: ['blues', 'soul'], energy: [0.1, 0.6],
    levels: ['k.....k.....', 'k..s..k..s..', 'khhshhkhhshh', 'khhshhkkhshh'] },
};

// Fills replace the last bar of a phrase. Same letters as grooves.
export const FILLS = {
  '4/4': [
    { id: 'snare_roll', row: 'k.h.s.h.s.ssssss', tags: ['rock', 'metal', 'march', 'synth'] },
    { id: 'tom_run', row: 'k.h.s.h.sTTTtttt', tags: ['rock', 'metal', 'game'] },
    { id: 'tom_down', row: 'k.h.s.h.TTTTtttt', tags: ['rock', 'cinematic'] },
    { id: 'kick_burst', row: 'kkkkskkkTTTTtttt', tags: ['metal'] },
    { id: 'clap_roll', row: 'k...c...c.c.cccc', tags: ['dance', 'synth'] },
    { id: 'break_stop', row: 'k.h.s.h.k.s.s...', tags: ['funk', 'dance', 'breaks'] },
    { id: 'light', row: 'k.h.s.h.s.TTT.tt', tags: ['game', 'pop'] },
  ],
  '3/4': [{ id: 'waltz_roll', row: 'k...s.s.ssss', tags: [] }],
  '6/8': [
    { id: 'tom_triplets', row: 't.T.T.TTTttt', tags: ['folk'] },
    { id: 'snare_triplets', row: 'k.h.h.s.ssss', tags: ['rock'] },
  ],
  '12/8': [
    { id: 'shuffle_roll', row: 'k..s..sssTtt', tags: ['blues', 'rock'] },
    { id: 'swing_kick', row: 'h..s.hk.ss.s', tags: ['jazz'] },
  ],
};
