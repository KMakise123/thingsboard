/**
 * 512KB descriptor soft-limit predicate (ADR 0004; P8 evidence anchor):
 * warns strictly ABOVE the limit, at exactly the limit it is still clean.
 */
import { describe, expect, it } from 'vitest';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';

import {
  descriptorWireBytes,
  overDescriptorSoftLimit,
  WIDGET_DESCRIPTOR_SOFT_LIMIT_BYTES,
} from './descriptor-budget';

function detailsWithDescriptorSize(bytes: number): WidgetTypeDetails {
  // two-pass padding: measure the envelope once, then pad the ASCII filler
  // so the UTF-8 wire size lands exactly on `bytes` (all-ASCII = 1 byte/char)
  let filler = '';
  const build = (): WidgetTypeDetails => ({
    name: 'probe',
    descriptor: { settings: { filler } },
  });
  const envelope = descriptorWireBytes(build()) - filler.length;
  filler = 'x'.repeat(Math.max(0, bytes - envelope));
  return build();
}

describe('descriptor soft limit — warn-not-block contract', () => {
  it('the limit is 512KB (ADR 0004)', () => {
    expect(WIDGET_DESCRIPTOR_SOFT_LIMIT_BYTES).toBe(512 * 1024);
  });

  it('a small descriptor is clean', () => {
    expect(overDescriptorSoftLimit(detailsWithDescriptorSize(1024))).toBe(
      false,
    );
  });

  it('exactly AT the limit is still clean (strictly-above warning)', () => {
    const at = detailsWithDescriptorSize(WIDGET_DESCRIPTOR_SOFT_LIMIT_BYTES);
    expect(descriptorWireBytes(at)).toBe(WIDGET_DESCRIPTOR_SOFT_LIMIT_BYTES);
    expect(overDescriptorSoftLimit(at)).toBe(false);
  });

  it('one byte over the limit warns', () => {
    const over = detailsWithDescriptorSize(
      WIDGET_DESCRIPTOR_SOFT_LIMIT_BYTES + 1,
    );
    expect(descriptorWireBytes(over)).toBe(
      WIDGET_DESCRIPTOR_SOFT_LIMIT_BYTES + 1,
    );
    expect(overDescriptorSoftLimit(over)).toBe(true);
  });

  it('counts UTF-8 bytes, not JS chars (CJK payload doubles)', () => {
    // '测' is 3 UTF-8 bytes; the JSON string of 100 chars ≈ 300 bytes
    const cjk = {
      descriptor: { filler: '测'.repeat(100) },
    } as WidgetTypeDetails;
    expect(descriptorWireBytes(cjk)).toBeGreaterThan(300);
  });
});
