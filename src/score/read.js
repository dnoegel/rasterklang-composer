// A downloaded score file -> one or more reduced scores.
// MIDI, MusicXML (.musicxml, .xml, compressed .mxl), ABC, and zips of
// them (Mutopia zips the MIDI files of multi-movement works). Server only
// (zip uses node:zlib).

import { midiScore } from './midi.js';
import { abcScore } from './abc.js';
import { musicXmlScore } from './musicxml.js';
import { unzip } from './zip.js';

const isMidi = (b) => b.length > 4 && b[0] === 0x4d && b[1] === 0x54 && b[2] === 0x68 && b[3] === 0x64;
const isZip = (b) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b;
const SCORE_FILE = /\.(mid|midi|musicxml|xml|abc)$/i;

// buf: file contents; name: file name or URL (for the order of movements)
// returns [{ name, score }] in file-name order
export function readScoreFile(buf, name = 'score') {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (isMidi(b)) return [{ name, score: midiScore(b) }];
  if (isZip(b)) {
    const entries = unzip(b).filter((e) => !e.name.startsWith('META-INF') && SCORE_FILE.test(e.name));
    entries.sort((x, y) => x.name.localeCompare(y.name, 'en', { numeric: true }));
    return entries.flatMap((e) => {
      try { return readScoreFile(e.read(), e.name); } catch { return []; }
    });
  }
  const text = b.toString('utf8');
  if (/<score-partwise|<score-timewise/.test(text)) return [{ name, score: musicXmlScore(text) }];
  if (/^\s*(X:|T:|M:|K:)/m.test(text) && /^K:/m.test(text)) {
    // an ABC file may hold many tunes: each from its X: line
    const tunes = text.split(/^(?=X:)/m).filter((t) => /^K:/m.test(t));
    return tunes.map((t, i) => {
      const score = abcScore(t);
      return { name: score.title || `${name} #${i + 1}`, score };
    });
  }
  throw new Error('not a score file (MIDI, MusicXML or ABC)');
}
