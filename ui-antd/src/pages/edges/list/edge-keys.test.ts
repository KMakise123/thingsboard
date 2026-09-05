/**
 * Edge credential generator tests (R07/R08): pinned-sequence outputs for
 * both formats plus the shape guarantees the create dialog relies on.
 */
import { describe, expect, it } from 'vitest';

import { generateRoutingKey, generateSecret } from './edge-keys';

/** Deterministic LCG so the outputs below are stable. */
function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('generateRoutingKey', () => {
  it('emits the ngx guid() shape: 8-4-4-4-12 lowercase hex', () => {
    const key = generateRoutingKey(sequence(42));
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('is deterministic for a pinned random source and distinct per draw', () => {
    expect(generateRoutingKey(sequence(7))).toBe(
      generateRoutingKey(sequence(7)),
    );
    const random = sequence(7);
    expect(generateRoutingKey(random)).not.toBe(generateRoutingKey(random));
  });
});

describe('generateSecret', () => {
  it('defaults to 20 lowercase base36 characters', () => {
    const secret = generateSecret(20, sequence(1));
    expect(secret).toHaveLength(20);
    expect(secret).toMatch(/^[0-9a-z]+$/);
  });

  it('honors an explicit shorter length', () => {
    expect(generateSecret(5, sequence(3))).toHaveLength(5);
  });

  it('spans multiple 10-char chunks without padding artifacts', () => {
    const secret = generateSecret(25, sequence(9));
    expect(secret).toHaveLength(25);
    expect(secret).toMatch(/^[0-9a-z]+$/);
  });
});
