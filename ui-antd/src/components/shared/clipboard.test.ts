/**
 * Shared clipboard-write helper unit tests: modern path wins when
 * available, the legacy textarea path answers for non-secure contexts,
 * and total failure resolves false (never throws — callers just toast).
 * happy-dom ships no document.execCommand, so the legacy path is stubbed
 * onto the document for each case that reaches it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { writeClipboard } from './clipboard';

function stubExecCommand(impl: () => boolean): ReturnType<typeof vi.fn> {
  const execCommand = vi.fn(impl);
  Object.defineProperty(document, 'execCommand', {
    value: execCommand,
    configurable: true,
    writable: true,
  });
  return execCommand;
}

describe('writeClipboard (shared clipboard helper)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (document as unknown as { execCommand?: unknown }).execCommand;
  });

  it('uses navigator.clipboard.writeText and resolves true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(writeClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to the textarea path when the modern write rejects', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) },
    });
    const execCommand = stubExecCommand(() => true);

    await expect(writeClipboard('hello')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('resolves false when there is no clipboard and execCommand says no', async () => {
    vi.stubGlobal('navigator', { clipboard: undefined });
    stubExecCommand(() => false);

    await expect(writeClipboard('hello')).resolves.toBe(false);
  });

  it('resolves false instead of throwing when the legacy path throws', async () => {
    vi.stubGlobal('navigator', { clipboard: undefined });
    stubExecCommand(() => {
      throw new Error('blocked');
    });

    await expect(writeClipboard('hello')).resolves.toBe(false);
  });
});
