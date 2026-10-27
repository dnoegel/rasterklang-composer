import { describe, expect, it } from 'vitest';
import { HVSC_CELLS, HVSC_BASS_ROWS } from '../src/gen/library/hvsc-rhythms.js';
import { CELLS } from '../src/gen/library/cells.js';
import { drawArrangement } from '../src/gen/menu.js';

describe('HVSC rhythm corpus', () => {
  it('holds one-bar 4/4 cells for known feels and valid bass figures', () => {
    for (const [feel, cells] of Object.entries(HVSC_CELLS['4/4'])) {
      expect(CELLS['4/4'][feel]).toBeDefined();
      for (const [c, authors] of cells) {
        expect(c).toMatch(/^[x_.]{16}$/);
        expect(c[0]).not.toBe('_');
        expect(authors).toBeGreaterThanOrEqual(3);
      }
    }
    for (const [row, authors, [lo, hi]] of HVSC_BASS_ROWS) {
      expect(row).toMatch(/^[R58324b6A_.]{16}$/);
      expect(row).toContain('R');
      expect(authors).toBeGreaterThanOrEqual(3);
      expect(lo).toBeLessThan(hi);
    }
  });

  it('gives the model a corpus bass figure', () => {
    let i = 0;
    const a = drawArrangement(() => (i++ * 0.37) % 1);
    const line = a.find((x) => x.includes('bass figure from real C64 tunes'));
    expect(HVSC_BASS_ROWS.map(([r]) => r)).toContain(line.match(/"([^"]+)"/)[1]);
  });
});
