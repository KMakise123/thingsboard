/**
 * Add-widget confirm dialog SCADA parity (spec §3.6 差异表, ui-ngx
 * prepareWidgetForScadaLayout): a scada target layout skips the
 * layout-config fields and the confirm result carries the
 * auto-instrumentation defaults (no title / no shadow / transparent
 * background / aspect ratio locked); non-scada targets keep the full form.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import zhEditorCommon from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import {
  AddWidgetConfirmDialog,
  type AddWidgetConfirmPayload,
  type AddWidgetConfirmResult,
} from './add-widget-confirm-dialog';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorCommon, ...zhEditorDashboard },
});

function payload(
  layouts: AddWidgetConfirmPayload['layouts'],
): AddWidgetConfirmPayload {
  return {
    fqn: 'system.test.scada_widget',
    label: 'Scada widget',
    stateId: 'default',
    layouts,
  };
}

function renderDialog(
  dialogPayload: AddWidgetConfirmPayload,
  onConfirm: (result: AddWidgetConfirmResult) => void,
) {
  render(
    <RawIntlProvider value={intl}>
      <AddWidgetConfirmDialog
        open
        payload={dialogPayload}
        onConfirm={onConfirm}
        onClose={() => undefined}
      />
    </RawIntlProvider>,
  );
}

afterEach(cleanup);

describe('AddWidgetConfirmDialog — scada target (§3.6)', () => {
  it('skips the layout-config fields for a scada target', () => {
    renderDialog(
      payload([{ id: 'main', name: 'main', layoutType: 'scada' }]),
      vi.fn(),
    );
    // title + placement fields are gone (single layout: no picker either)
    expect(screen.queryByLabelText('标题')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('returns default placement + scada instrumentation defaults', async () => {
    const onConfirm = vi.fn();
    renderDialog(
      payload([{ id: 'main', name: 'main', layoutType: 'scada' }]),
      onConfirm,
    );
    fireEvent.click(screen.getByRole('button', { name: /添 加|Add/ }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
    const result = onConfirm.mock.calls[0][0] as AddWidgetConfirmResult;
    expect(result.title).toBeUndefined();
    expect(result).toMatchObject({ row: 0, col: 0, sizeX: 8, sizeY: 6 });
    expect(result.scadaDefaults).toEqual({
      showTitle: false,
      dropShadow: false,
      backgroundColor: 'rgba(0,0,0,0)',
      preserveAspectRatio: true,
      padding: '0',
      margin: '0',
    });
  });

  it('keeps the full form for a non-scada target', async () => {
    const onConfirm = vi.fn();
    renderDialog(
      payload([
        { id: 'main', name: 'main', layoutType: 'default' },
        { id: 'right', name: 'right', layoutType: 'scada' },
      ]),
      onConfirm,
    );
    // default target (main) — full form visible
    expect(screen.getByLabelText('标题')).toBeInTheDocument();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: /添 加|Add/ }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
    const result = onConfirm.mock.calls[0][0] as AddWidgetConfirmResult;
    expect(result.scadaDefaults).toBeUndefined();
    expect(result.title).toBe('Scada widget');
  });
});
