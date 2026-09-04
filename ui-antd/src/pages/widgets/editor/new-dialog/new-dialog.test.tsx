/**
 * New-dialog contract (spec §5.6): the five starter cards deliver a fresh
 * create-path draft per bucket through the frozen onConfirm payload — no
 * confirm until a card is picked.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/editor';
import zhWidgetEditor from '@/locales/zh-CN/editor-widget-editor';
import zhWidgetIo from '@/locales/zh-CN/editor-widget-io';

import type { WidgetEditorDoc } from '../draft-convert';
import { NewWidgetDialog, type NewWidgetDialogPayload } from './index';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhWidgetEditor, ...zhWidgetIo },
});

function setup() {
  const onConfirm = vi.fn();
  render(
    <RawIntlProvider value={intl}>
      <NewWidgetDialog
        open
        payload={{ onConfirm } satisfies NewWidgetDialogPayload}
        onClose={() => {}}
      />
    </RawIntlProvider>,
  );
  return { onConfirm };
}

describe('NewWidgetDialog — five starter buckets', () => {
  it('renders all five starter cards', () => {
    setup();
    for (const kind of ['latest', 'timeseries', 'rpc', 'alarm', 'static']) {
      expect(
        screen.getByTestId(`widget-new-starter-${kind}`),
      ).toBeInTheDocument();
    }
  });

  it('no confirm until a card is picked; picking enables it', () => {
    setup();
    const okButton = screen
      .getByTestId('widget-new-dialog')
      .querySelector('.ant-btn-primary') as HTMLButtonElement;
    expect(okButton).toBeDisabled();
    fireEvent.click(screen.getByTestId('widget-new-starter-timeseries'));
    expect(okButton).toBeEnabled();
  });

  it('confirm delivers the starter doc (create-path identity, template body)', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByTestId('widget-new-starter-latest'));
    fireEvent.click(
      screen
        .getByTestId('widget-new-dialog')
        .querySelector('.ant-btn-primary') as HTMLButtonElement,
    );
    const doc = onConfirm.mock.calls[0][0] as WidgetEditorDoc;
    expect(doc.widgetTypeId).toBeNull();
    expect(doc.fqn).toBe('');
    expect(doc.version).toBeNull();
    expect(doc.meta.type).toBe('latest');
    expect(doc.source.tsx).toContain('LatestValuesWidget');
    // keep-string discipline + function datasource for the preview
    expect(typeof doc.defaultConfig).toBe('string');
    expect(doc.defaultConfig).toContain('"type": "function"');
    expect(doc.settingsForm.length).toBeGreaterThan(0);
  });
});
