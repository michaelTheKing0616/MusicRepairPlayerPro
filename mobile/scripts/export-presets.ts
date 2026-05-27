/**
 * Writes `backend/app/data/listening_presets.json` from TS catalog (single source of truth).
 * Run from repo: `cd mobile && npm run export-presets`
 */
import {mkdirSync, writeFileSync} from 'fs';
import {dirname, join} from 'path';
import {LISTENING_PRESETS} from '../src/preset-engine/catalog';

const out = join(process.cwd(), '..', 'backend', 'app', 'data', 'listening_presets.json');
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, JSON.stringify(LISTENING_PRESETS));
// eslint-disable-next-line no-console
console.log('Wrote', out, 'presets=', LISTENING_PRESETS.length);
