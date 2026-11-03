// The generator as one object: everything that writes, checks or renders a
// brief (menu and prompts, validation, theory, composition, frames, the
// prompt reading and interpretations). createPipeline() uses it by default;
// pass another module set with the same names to try a changed generator.
// The code in src/gen is what the version hash covers; this file is not.

import * as menu from './gen/menu.js';
import * as brief from './gen/brief.js';
import * as theory from './gen/theory.js';
import * as compose from './gen/compose.js';
import * as frames from './gen/frames.js';
import * as understand from './gen/understand.js';
import * as interpret from './gen/interpret.js';

export const generator = Object.freeze(Object.assign({}, menu, brief, theory, compose, frames, understand, interpret));
