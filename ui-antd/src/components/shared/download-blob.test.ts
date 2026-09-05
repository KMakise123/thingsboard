/**
 * Shared blob-download helper unit tests: the object-URL → named anchor
 * click → revoke sequence (happy-dom's createObjectURL returns undefined,
 * so it is mocked like every page-level download test does).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadBlob } from './download-blob';

function anchorSpy() {
  const anchor = { href: '', download: '', click: vi.fn() };
  const spy = vi
    .spyOn(document, 'createElement')
    .mockReturnValue(anchor as never);
  return { anchor, spy };
}

describe('downloadBlob (shared blob → "Save as" helper)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clicks a named anchor backed by the object URL of the blob', () => {
    const blob = new Blob(['x']);
    const urlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-1');
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockReturnValue(undefined);
    const { anchor, spy } = anchorSpy();

    downloadBlob(blob, 'report.json');

    expect(urlSpy).toHaveBeenCalledWith(blob);
    expect(anchor.href).toBe('blob:mock-1');
    expect(anchor.download).toBe('report.json');
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-1');
    spy.mockRestore();
  });

  it('revokes the object URL only after the click', () => {
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockReturnValue(undefined);
    const { anchor, spy } = anchorSpy();

    downloadBlob(new Blob(['x']), 'symbol.svg');

    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.click.mock.invocationCallOrder[0]).toBeLessThan(
      revokeSpy.mock.invocationCallOrder[0],
    );
    spy.mockRestore();
  });
});
