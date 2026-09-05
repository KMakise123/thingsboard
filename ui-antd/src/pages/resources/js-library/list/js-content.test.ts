/**
 * JS-resource base64 codec tests: UTF-8 round-trips (CJK + emoji) and the
 * base64 reference vector.
 */
import { describe, expect, it } from 'vitest';

import { base64ToString, stringToBase64 } from './js-content';

describe('js-content codec', () => {
  it('round-trips plain, CJK and emoji text through base64', () => {
    const samples = [
      'export const x = 1;',
      'const 你好 = "世界";',
      'const flag = "🚩";',
    ];
    for (const text of samples) {
      expect(base64ToString(stringToBase64(text))).toBe(text);
    }
  });

  it('matches the upstream reference vector', () => {
    expect(stringToBase64('export const x = 1;')).toBe(
      'ZXhwb3J0IGNvbnN0IHggPSAxOw==',
    );
  });

  it('decodes the backend fixture base64', () => {
    // b64 of 'alert(1);' — the shape TbResource.data arrives in.
    expect(base64ToString('YWxlcnQoMSk7')).toBe('alert(1);');
  });
});
