import {LISTENING_PRESETS, getListeningPreset} from '../src/preset-engine';
import {validateListeningPreset} from '../src/preset-engine/validate';

describe('listening preset catalog', () => {
  it('has exactly 90 presets (10 families × 9 tiers)', () => {
    expect(LISTENING_PRESETS).toHaveLength(90);
  });

  it('has unique ids', () => {
    const ids = LISTENING_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('validates every preset', () => {
    for (const p of LISTENING_PRESETS) {
      const errs = validateListeningPreset(p);
      expect(errs).toEqual([]);
    }
  });

  it('getListeningPreset resolves existing ids', () => {
    expect(getListeningPreset(LISTENING_PRESETS[0]?.id ?? '')).toBeDefined();
  });
});
