// rasterklang-composer: prompt to C64 SID music. Browser-safe entry; Node
// extras (OpenRouter, research, WAV, code hash) are in 'rasterklang-composer/node'.

export { createPipeline, seededRand } from './pipeline.js';
export { generator } from './generator.js';
export { compose, composeBrief, briefFromPrompt, describeTune } from './gen/compose.js';
export { validateBrief, GENERATOR_VERSION } from './gen/brief.js';
export { answerToBrief, briefToAnswer, briefSchema } from './gen/menu.js';
export { renderFrames, stateAt } from './gen/frames.js';
export { STYLES, STYLE_IDS } from './gen/styles.js';
export { MOODS } from './gen/moods.js';
export { buildSid } from './export/sid.js';
