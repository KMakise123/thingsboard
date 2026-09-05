/**
 * New-dialog contract (spec §5.6): the five starter cards deliver a fresh
 * create-path draft per bucket through the frozen onConfirm payload — no
 * confirm until a card is picked. M11 wave 1B seam: `?template=<kind>` on
 * the create route preselects the matching card; no/unknown param keeps
 * the empty selection.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/editor';
import zhWidgetEditor from '@/locales/zh-CN/editor-widget-editor';
import zhWidgetIo from '@/locales/zh-CN/editor-widget-io';

import type { WidgetEditorDoc } from '../draft-convert';
import {
  NewWidgetDialog,
  type NewWidgetDialogPayload,
  starterKindFromSearch,
} from './index';

const locationMock = vi.hoisted(() => ({ search: '' }));

vi.mock('@umijs/max', () => ({
  useLocation: () => ({ search: locationMock.search }),
}));

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

function okButton(): HTMLButtonElement {
  return screen
    .getByTestId('widget-new-dialog')
    .querySelector('.ant-btn-primary') as HTMLButtonElement;
}

beforeEach(() => {
  locationMock.search = '';
});

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
    expect(okButton()).toBeDisabled();
    fireEvent.click(screen.getByTestId('widget-new-starter-timeseries'));
    expect(okButton()).toBeEnabled();
  });

  it('confirm delivers the starter doc (create-path identity, template body)', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByTestId('widget-new-starter-latest'));
    fireEvent.click(okButton());
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

describe('NewWidgetDialog — ?template= preselection (M11 wave 2E)', () => {
  it('a known kind preselects its card: confirm is armed and delivers that bucket', () => {
    locationMock.search = '?template=rpc';
    const { onConfirm } = setup();
    expect(okButton()).toBeEnabled();
    fireEvent.click(okButton());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect((onConfirm.mock.calls[0][0] as WidgetEditorDoc).meta.type).toBe(
      'rpc',
    );
  });

  it('no param keeps the empty selection (unchanged behavior)', () => {
    setup();
    expect(starterKindFromSearch('')).toBeNull();
    expect(okButton()).toBeDisabled();
  });

  it('an unknown param value keeps the empty selection', () => {
    locationMock.search = '?template=bogus';
    setup();
    expect(okButton()).toBeDisabled();
  });
});
