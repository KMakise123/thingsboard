/**
 * Save-chain contract tests (spec §5.2): the three gates (compile / module
 * execute / smoke render) each abort before the POST; the 409 three-option
 * dialog paths (load server / overwrite with fresh version + retry cap /
 * export local + abandon); the 512KB descriptor soft limit WARNS but never
 * blocks. Transport is mocked at the module boundary — both statically used
 * (saveWidgetType) and dynamically imported (getWidgetTypeById) functions
 * are stubbed, mirroring the real module surface.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import zhCommon from '@/locales/zh-CN/editor';
import zhWidgetEditor from '@/locales/zh-CN/editor-widget-editor';
import zhWidgetIo from '@/locales/zh-CN/editor-widget-io';
import { EntityType } from '@/types/tb/entity';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';

import { emptyWidgetEditorDoc } from '../draft-convert';
import { useWidgetSave } from './use-widget-save';

// The save chain's smoke gate drives its own react-dom root with REAL
// timers; React's act environment would park that concurrent retry for an
// outer act scope, so this suite opts out of the act regime (fireEvent /
// waitFor keep working — they are synchronous / timer-poll based here).
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = false;

const serviceMock = vi.hoisted(() => ({
  saveWidgetType: vi.fn(),
  getWidgetTypeById: vi.fn(),
}));
vi.mock('@/services/tb/widget-type', () => serviceMock);

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhWidgetEditor, ...zhWidgetIo },
});

const GOOD_TSX = 'export default function W() { return <div>ok</div>; }';

function savedEntity(
  overrides?: Partial<WidgetTypeDetails>,
): WidgetTypeDetails {
  return {
    id: { entityType: EntityType.WIDGET_TYPE, id: 'type-1' },
    fqn: 'my_gauge',
    name: 'My gauge',
    version: 3,
    descriptor: {
      runtime: 'react-1',
      schemaVersion: 1,
      source: { tsx: GOOD_TSX },
    },
    ...overrides,
  };
}

function baseDoc(overrides?: { tsx?: string; settingsForm?: unknown[] }) {
  const doc = emptyWidgetEditorDoc();
  doc.widgetTypeId = 'type-1';
  doc.fqn = 'my_gauge';
  doc.name = 'My gauge';
  doc.source.tsx = overrides?.tsx ?? GOOD_TSX;
  doc.meta.sizeX = 8;
  doc.meta.sizeY = 6;
  if (overrides?.settingsForm) {
    doc.settingsForm = overrides.settingsForm as never;
  }
  doc.version = 2;
  return doc;
}

type SaveResult = ReturnType<typeof useWidgetSave>;

function harness(doc = baseDoc(), onAbandon: () => void = () => {}) {
  const session = new EditorSession({ baseline: doc });
  let latest: SaveResult | null = null;
  function Harness() {
    latest = useWidgetSave({ session, onAbandon });
    return <>{latest.conflictDialog}</>;
  }
  render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <Harness />
      </AntdApp>
    </RawIntlProvider>,
  );
  return {
    session,
    result: () => {
      if (!latest) {
        throw new Error('harness not mounted');
      }
      return latest;
    },
    save: async () => {
      if (!latest) {
        throw new Error('harness not mounted');
      }
      return latest.save();
    },
  };
}

beforeEach(() => {
  serviceMock.saveWidgetType.mockReset();
  serviceMock.saveWidgetType.mockImplementation(async (entity) =>
    savedEntity({ version: (entity.version ?? 2) + 1 }),
  );
  serviceMock.getWidgetTypeById.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useWidgetSave — gate 1: compile errors abort before the POST', () => {
  it('a TSX transform error aborts: no POST, session untouched', async () => {
    const h = harness(baseDoc({ tsx: 'const broken = <div;' }));
    const outcome = await h.save();
    expect(outcome).toBeNull();
    expect(serviceMock.saveWidgetType).not.toHaveBeenCalled();
    expect(h.session.dirty).toBe(false);
  });

  it('a module top-level throw (execute stage) aborts: no POST', async () => {
    const h = harness(
      baseDoc({
        tsx: 'throw new Error("top-level boom");\nexport default () => <div />;',
      }),
    );
    const outcome = await h.save();
    expect(outcome).toBeNull();
    expect(serviceMock.saveWidgetType).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('a missing default export aborts (no usable component to store)', async () => {
    const h = harness(baseDoc({ tsx: 'export const notDefault = 1;' }));
    expect(await h.save()).toBeNull();
    expect(serviceMock.saveWidgetType).not.toHaveBeenCalled();
  });
});

describe('useWidgetSave — gate 2: smoke render errors abort before the POST', () => {
  it('a render-phase throw aborts the save (module itself compiled fine)', async () => {
    const tsx = [
      'export default function W() {',
      '  if (true) {',
      '    throw new Error("render boom");',
      '  }',
      '  return <div />;',
      '}',
    ].join('\n');
    const h = harness(baseDoc({ tsx }));
    const outcome = await h.save();
    expect(outcome).toBeNull();
    expect(serviceMock.saveWidgetType).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('useWidgetSave — happy path: all gates pass, then POST + re-anchor', () => {
  it('saves the gated draft and re-anchors the session (version backfill)', async () => {
    const h = harness();
    const outcome = await h.save();
    expect(outcome?.version).toBe(3);
    expect(serviceMock.saveWidgetType).toHaveBeenCalledTimes(1);
    const body = serviceMock.saveWidgetType.mock.calls[0][0];
    expect(body.descriptor.runtime).toBe('react-1');
    expect(body.descriptor.schemaVersion).toBe(1);
    await waitFor(() => {
      expect(h.session.dirty).toBe(false);
    });
  });

  it('a clean session is a no-op (saveDisabled source)', async () => {
    const h = harness();
    expect(h.result().saveDisabled).toBe(true);
  });
});

describe('useWidgetSave — 512KB descriptor soft limit (warn, never block)', () => {
  it('a descriptor over the limit still POSTs (warning only)', async () => {
    const filler = 'x'.repeat(600 * 1024);
    const doc = baseDoc();
    doc.settingsForm = [
      { id: 'filler', name: 'filler', type: 'text', default: filler },
    ] as never;
    const h = harness(doc);
    const outcome = await h.save();
    // warn-not-block: the POST went through and the session re-anchored
    expect(outcome).not.toBeNull();
    expect(serviceMock.saveWidgetType).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(h.session.dirty).toBe(false);
    });
    expect(await screen.findByText(/512KB/)).toBeInTheDocument();
  });
});

describe('useWidgetSave — 409 three-option paths', () => {
  function conflictHarness() {
    const h = harness();
    serviceMock.saveWidgetType.mockRejectedValueOnce(
      Object.assign(new Error('version conflict'), { errorCode: 35 }),
    );
    return h;
  }

  it('a 409 opens the three-option dialog with the server snapshot', async () => {
    const h = conflictHarness();
    serviceMock.getWidgetTypeById.mockResolvedValue(
      savedEntity({ name: 'Server gauge', version: 7 }),
    );
    await h.save();
    await waitFor(() => {
      expect(screen.getByTestId('editor-conflict-dialog')).toBeInTheDocument();
    });
    const server = screen.getByTestId('editor-conflict-server');
    expect(server).toHaveTextContent('Server gauge');
    expect(server).toHaveTextContent('(v7)');
  });

  it('Option A loads the server version as the new baseline', async () => {
    const h = conflictHarness();
    serviceMock.getWidgetTypeById.mockResolvedValue(
      savedEntity({ name: 'Server gauge', version: 7 }),
    );
    await h.save();
    fireEvent.click(await screen.findByTestId('editor-conflict-load-server'));
    await waitFor(() => {
      expect(screen.queryByTestId('editor-conflict-dialog')).toBeNull();
    });
    expect(h.session.current.name).toBe('Server gauge');
    expect(h.session.current.version).toBe(7);
    expect(h.session.dirty).toBe(false);
  });

  it('Option B re-GETs the fresh version, POSTs it and re-anchors', async () => {
    const h = conflictHarness();
    serviceMock.getWidgetTypeById.mockResolvedValue(
      savedEntity({ version: 7 }),
    );
    await h.save();
    fireEvent.click(await screen.findByTestId('editor-conflict-overwrite'));
    await waitFor(() => {
      expect(serviceMock.saveWidgetType).toHaveBeenCalledTimes(2);
    });
    // the overwrite POST carried the freshly fetched version
    expect(serviceMock.saveWidgetType.mock.calls[1][0].version).toBe(7);
    expect(screen.queryByTestId('editor-conflict-dialog')).toBeNull();
  });

  it('Option B exhaustion degrades back to the dialog (no blind write)', async () => {
    const h = conflictHarness();
    serviceMock.getWidgetTypeById.mockResolvedValue(
      savedEntity({ version: 7 }),
    );
    // every attempt conflicts again
    serviceMock.saveWidgetType.mockRejectedValue(
      Object.assign(new Error('version conflict'), { errorCode: 35 }),
    );
    await h.save();
    fireEvent.click(await screen.findByTestId('editor-conflict-overwrite'));
    await waitFor(() => {
      expect(screen.getByTestId('editor-conflict-dialog')).toBeInTheDocument();
    });
    // 1 initial + 3 capped overwrite attempts
    expect(serviceMock.saveWidgetType).toHaveBeenCalledTimes(4);
    // no blind write: the session draft was never re-anchored to the server
    expect(h.session.current.version).toBe(2);
  });

  it('Option C exports the local JSON and abandons the draft', async () => {
    // URL.createObjectURL is a global vi.fn() mock (tests/setupTests.ts)
    vi.mocked(URL.createObjectURL).mockClear();
    const onAbandon = vi.fn();
    const h = harness(baseDoc(), onAbandon);
    serviceMock.saveWidgetType.mockRejectedValueOnce(
      Object.assign(new Error('version conflict'), { errorCode: 35 }),
    );
    serviceMock.getWidgetTypeById.mockResolvedValue(savedEntity());
    await h.save();
    fireEvent.click(await screen.findByTestId('editor-conflict-export-local'));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(onAbandon).toHaveBeenCalledTimes(1);
  });
});
