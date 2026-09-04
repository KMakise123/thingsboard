/**
 * Restore-last-saved contract (spec §5.2): a dirty draft rewinds to the
 * last-saved snapshot as ONE undoable group (re-anchor keeps dirty honest);
 * a mid-session save moves the restore target; undo brings the edits back.
 */
import { act, render } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import zhCommon from '@/locales/zh-CN/editor';
import zhWidgetEditor from '@/locales/zh-CN/editor-widget-editor';
import zhWidgetIo from '@/locales/zh-CN/editor-widget-io';

import { emptyWidgetEditorDoc, type WidgetEditorDoc } from '../draft-convert';
import { useRestoreSaved } from './use-restore-saved';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhWidgetEditor, ...zhWidgetIo },
});

function baseDoc(): WidgetEditorDoc {
  const doc = emptyWidgetEditorDoc();
  doc.widgetTypeId = 'type-1';
  doc.fqn = 'my_gauge';
  doc.name = 'Saved name';
  doc.source.tsx = 'export default () => <div />';
  doc.version = 2;
  return doc;
}

function setup(doc = baseDoc()) {
  const session = new EditorSession<WidgetEditorDoc>({ baseline: doc });
  let latest: ReturnType<typeof useRestoreSaved> | null = null;
  function Harness() {
    latest = useRestoreSaved({ session });
    return null;
  }
  render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <Harness />
      </AntdApp>
    </RawIntlProvider>,
  );
  const hook = () => {
    if (!latest) {
      throw new Error('harness not mounted');
    }
    return latest;
  };
  const confirmRestore = async () => {
    // the shell wires restore() behind a modal.confirm — drive the hook
    // directly here; the modal copy is exercised in the shell wiring tests
    await act(async () => {
      hook().restore();
    });
  };
  return { session, hook, confirmRestore };
}

describe('useRestoreSaved — rewind to the last saved state', () => {
  it('disabled on a clean draft, enabled once dirty', () => {
    const { session, hook } = setup();
    expect(hook().canRestore).toBe(false);
    act(() => {
      session.write('meta.name', (doc) => {
        doc.name = 'Dirty name';
      });
    });
    expect(hook().canRestore).toBe(true);
  });

  it('restores every field to the baseline as ONE undoable group', async () => {
    const { session, hook, confirmRestore } = setup();
    act(() => {
      session.write('meta.name', (doc) => {
        doc.name = 'Dirty name';
      });
      session.write('source.tsx', (doc) => {
        doc.source.tsx = 'export default () => <span>broke</span>';
      });
    });
    expect(session.history).toHaveLength(2);
    await confirmRestore();
    // content back to baseline, dirty honest (re-anchored), one extra group
    expect(session.current.name).toBe('Saved name');
    expect(session.current.source.tsx).toBe('export default () => <div />');
    expect(session.current.version).toBe(2);
    expect(session.dirty).toBe(false);
    expect(session.history).toHaveLength(3);
    expect(session.history[2].label).toBe('restore:lastSaved');
    expect(hook().canRestore).toBe(false);
  });

  it('the restore target follows a mid-session save (not the entry state)', async () => {
    const { session, confirmRestore } = setup();
    // edit -> save (baseline advances) -> more edits -> restore
    act(() => {
      session.write('meta.name', (doc) => {
        doc.name = 'Renamed before save';
      });
    });
    act(() => {
      const saved = { ...session.current };
      saved.name = 'Server-anchored name';
      session.save(saved);
    });
    act(() => {
      session.write('meta.name', (doc) => {
        doc.name = 'Dirty after save';
      });
    });
    await confirmRestore();
    // restored to the LAST SAVE, not the entry baseline name
    expect(session.current.name).toBe('Server-anchored name');
    expect(session.dirty).toBe(false);
  });

  it('undoing the restore group brings the user edits back', async () => {
    const { session, confirmRestore } = setup();
    act(() => {
      session.write('meta.name', (doc) => {
        doc.name = 'Dirty name';
      });
    });
    await confirmRestore();
    expect(session.current.name).toBe('Saved name');
    act(() => {
      session.undo();
    });
    expect(session.current.name).toBe('Dirty name');
    expect(session.dirty).toBe(true);
  });

  it('restore is a no-op on a clean session', async () => {
    const { session, confirmRestore } = setup();
    await confirmRestore();
    expect(session.history).toHaveLength(0);
    expect(session.dirty).toBe(false);
  });
});
