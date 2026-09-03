import { describe, expect, it } from 'vitest';
import { javascriptExtensions } from './javascript-language';

// Real-import smoke test: locks in that @codemirror/lang-javascript resolves
// at runtime (the wave-1 type shim era is over — no mocks here on purpose).
describe('javascriptExtensions', () => {
  it('returns the real lang-javascript language support extension', () => {
    const extensions = javascriptExtensions();
    expect(extensions).toHaveLength(1);
    expect(extensions[0]).toHaveProperty('extension');
  });
});
