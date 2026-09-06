/**
 * CF test-dialog tests (M14 wave-4, R15, spec 6.1-10): the 200-envelope
 * error path renders INLINE (never a toast), a passing run enables Save
 * which returns the (edited) expression, and the run payload carries the
 * backend TbelCfArg discriminator.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import zhCf from '@/locales/zh-CN/calculated-fields';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhCf } });

import CfTestDialog, { type CfTestDialogProps } from './test-dialog';

function renderDialog(
  onRun: ReturnType<typeof vi.fn>,
  onSave = vi.fn(),
  prefill: Record<string, unknown> | null = null,
) {
  return render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <CfTestDialog
          open
          expression={'return {\n "temperatureC": 0.0\n};'}
          args={{
            temperatureF: {
              refEntityKey: { key: 'temperatureF', type: 'TS_LATEST' },
            },
          }}
          prefill={prefill}
          onRun={onRun as CfTestDialogProps['onRun']}
          onClose={vi.fn()}
          onSave={onSave}
        />
      </AntdApp>
    </RawIntlProvider>,
  );
}

describe('CfTestDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the argument row seeded from the debug-event prefill', () => {
    renderDialog(vi.fn(), vi.fn(), {
      temperatureF: { value: 22.5, ts: 1_700_000_000_000 },
    });
    const valueInput = screen.getByDisplayValue('22.5') as HTMLInputElement;
    expect(valueInput).toBeTruthy();
  });

  it('shows the envelope error inline and keeps Save disabled (200 envelope, not HTTP)', async () => {
    const onRun = vi
      .fn()
      .mockResolvedValue({ output: '', error: 'syntax boom' });
    const onSave = vi.fn();
    renderDialog(onRun, onSave);

    fireEvent.click(screen.getByRole('button', { name: /测\s*试/ }));
    await waitFor(() => {
      expect(screen.getByTestId('cf-test-error').textContent).toContain(
        'syntax boom',
      );
    });
    // The error is inline text, not a toast: no antd message element mounts.
    expect(document.querySelector('.ant-message')).toBeNull();
    expect(
      (screen.getByRole('button', { name: /保\s*存/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('runs the test with the SINGLE_VALUE discriminator and enables Save on success', async () => {
    const onRun = vi
      .fn()
      .mockResolvedValueOnce({ output: '{"temperatureC": -5.4}', error: '' });
    const onSave = vi.fn();
    renderDialog(onRun, onSave);

    fireEvent.click(screen.getByRole('button', { name: /测\s*试/ }));
    await waitFor(() => {
      expect(onRun).toHaveBeenCalled();
    });
    expect(onRun.mock.calls[0][0].arguments.temperatureF).toMatchObject({
      type: 'SINGLE_VALUE',
      value: '',
    });
    await waitFor(() => {
      expect(screen.getByTestId('cf-test-output').textContent).toContain(
        'temperatureC',
      );
    });

    const save = screen.getByRole('button', {
      name: /保\s*存/,
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith('return {\n "temperatureC": 0.0\n};');
  });

  it('blocks the run with an inline parse error for invalid rolling JSON', async () => {
    const onRun = vi.fn();
    render(
      <RawIntlProvider value={intl}>
        <AntdApp>
          <CfTestDialog
            open
            expression="return 1;"
            args={{
              r: { refEntityKey: { key: 't', type: 'TS_ROLLING' } },
            }}
            prefill={null}
            onRun={onRun}
            onClose={vi.fn()}
            onSave={vi.fn()}
          />
        </AntdApp>
      </RawIntlProvider>,
    );
    fireEvent.change(screen.getByDisplayValue('[]'), {
      target: { value: '{oops' },
    });
    fireEvent.click(screen.getByRole('button', { name: /测\s*试/ }));
    await waitFor(() => {
      expect(screen.getByText(/不是有效的 JSON/)).toBeTruthy();
    });
    expect(onRun).not.toHaveBeenCalled();
  });
});
