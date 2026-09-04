/**
 * Save-as dialog contract (spec §5.2): confirm delivers a copy of the draft
 * with the identity triple RESET (widgetTypeId / fqn / version) so the
 * shell's immediate save lands as a create; a custom fqn short name rides
 * along (validated against the backend slug shape), an empty one defers to
 * the server's name-derived fqn.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/editor';
import zhWidgetEditor from '@/locales/zh-CN/editor-widget-editor';
import zhWidgetIo from '@/locales/zh-CN/editor-widget-io';

import { emptyWidgetEditorDoc } from '../draft-convert';
import {
  SaveAsWidgetDialog,
  type SaveAsWidgetDialogPayload,
} from './save-as-dialog';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhWidgetEditor, ...zhWidgetIo },
});

function setup() {
  const draft = emptyWidgetEditorDoc();
  draft.widgetTypeId = 'type-1';
  draft.fqn = 'my_gauge';
  draft.name = 'My gauge';
  draft.version = 4;
  draft.descriptorPassthrough = { resources: [{ url: '/r.js' }] };
  draft.entityPassthrough = { description: 'kept on the copy' };
  const onConfirm = vi.fn();
  render(
    <RawIntlProvider value={intl}>
      <SaveAsWidgetDialog
        open
        payload={{ draft, onConfirm } satisfies SaveAsWidgetDialogPayload}
        onClose={() => {}}
      />
    </RawIntlProvider>,
  );
  return { onConfirm };
}

describe('SaveAsWidgetDialog — identity reset on confirm', () => {
  it('delivers a copy with id/version reset and an empty fqn by default', () => {
    const { onConfirm } = setup();
    fireEvent.change(screen.getByTestId('widget-save-as-name'), {
      target: { value: 'My gauge copy' },
    });
    fireEvent.click(
      screen
        .getByTestId('widget-save-as-dialog')
        .querySelector('.ant-btn-primary')!,
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const copy = onConfirm.mock.calls[0][0];
    expect(copy.widgetTypeId).toBeNull();
    expect(copy.version).toBeNull();
    expect(copy.fqn).toBe('');
    expect(copy.name).toBe('My gauge copy');
    // the payload itself survives untouched
    expect(copy.descriptorPassthrough).toEqual({
      resources: [{ url: '/r.js' }],
    });
    // entity-level extras ride along (ui-ngx saveWidgetAs parity: the whole
    // entity is renamed and re-posted)
    expect(copy.entityPassthrough).toEqual({
      description: 'kept on the copy',
    });
    expect(copy.source).toEqual(draftCopySource());
  });

  it('a custom fqn short name rides along when provided', () => {
    const { onConfirm } = setup();
    fireEvent.change(screen.getByTestId('widget-save-as-name'), {
      target: { value: 'My gauge copy' },
    });
    fireEvent.change(screen.getByTestId('widget-save-as-fqn'), {
      target: { value: 'my_gauge_copy' },
    });
    fireEvent.click(
      screen
        .getByTestId('widget-save-as-dialog')
        .querySelector('.ant-btn-primary')!,
    );
    expect(onConfirm.mock.calls[0][0].fqn).toBe('my_gauge_copy');
  });

  it('an invalid fqn short name disables the confirm (no delivery)', () => {
    const { onConfirm } = setup();
    fireEvent.change(screen.getByTestId('widget-save-as-name'), {
      target: { value: 'My gauge copy' },
    });
    fireEvent.change(screen.getByTestId('widget-save-as-fqn'), {
      target: { value: 'Bad Fqn!' },
    });
    const okButton = screen
      .getByTestId('widget-save-as-dialog')
      .querySelector('.ant-btn-primary') as HTMLButtonElement;
    expect(okButton).toBeDisabled();
    fireEvent.click(okButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('an empty name keeps the confirm disabled', () => {
    const { onConfirm } = setup();
    fireEvent.change(screen.getByTestId('widget-save-as-name'), {
      target: { value: '   ' },
    });
    const okButton = screen
      .getByTestId('widget-save-as-dialog')
      .querySelector('.ant-btn-primary') as HTMLButtonElement;
    expect(okButton).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

function draftCopySource() {
  const doc = emptyWidgetEditorDoc();
  doc.widgetTypeId = 'type-1';
  doc.fqn = 'my_gauge';
  doc.name = 'My gauge';
  doc.version = 4;
  return doc.source;
}
