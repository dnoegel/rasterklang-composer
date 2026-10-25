// Meters: steps per bar and where the strong beats are. 6/8 and 3/4 use
// 16th steps; 12/8 uses 8th steps, so four beats of three give a triplet
// (shuffle/swing) grid without a swing primitive in the DSL.
// Tempo is given per beat (quarter in 4/4 and 3/4, dotted quarter in 6/8
// and 12/8).

export const METERS = {
  '4/4': { id: '4/4', beats: 4, unit: 4, steps: 16, strong: 4, weak: 2 },
  '3/4': { id: '3/4', beats: 3, unit: 4, steps: 12, strong: 4, weak: 2 },
  '6/8': { id: '6/8', beats: 6, unit: 8, steps: 12, strong: 6, weak: 2 },
  '12/8': { id: '12/8', beats: 12, unit: 8, steps: 12, strong: 3, weak: 1 },
};

// Frames per DSL beat (the 1/unit note) for a tempo in bpm per felt beat.
export function framesPerBeat(meter, bpm) {
  const m = METERS[meter];
  if (m.unit === 8) return Math.max(2, Math.round(3000 / (bpm * 3))); // dotted quarter = 3 eighths
  return Math.max(4, Math.round(3000 / bpm));
}

export function bpmFor(meter, speed) {
  return METERS[meter].unit === 8 ? 3000 / speed / 3 : 3000 / speed;
}
