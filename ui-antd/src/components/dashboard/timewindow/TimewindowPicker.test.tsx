import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import zhDashboards from '@/locales/zh-CN/dashboards';
import { AggregationType } from '@/types/tb/telemetry';
import { createDefaultDashboardTimewindow } from '@/types/tb/timewindow';
import { TimewindowPicker } from './TimewindowPicker';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhDashboards } });

type Tw = ReturnType<typeof createDefaultDashboardTimewindow>;

function renderPicker(
  value: Tw,
  onChange: (next: Tw) => void,
  disabled?: boolean,
) {
  return render(
    <RawIntlProvider value={intl}>
      <TimewindowPicker value={value} onChange={onChange} disabled={disabled} />
    </RawIntlProvider>,
  );
}

afterEach(cleanup);

describe('TimewindowPicker', () => {
  it('shows the active realtime preset label', () => {
    renderPicker(createDefaultDashboardTimewindow(), vi.fn());
    expect(screen.getByTestId('tw-picker-label').textContent).toBe(
      '最近 1 小时',
    );
  });

  it('switches to the history tab carrying the resolved bounds', () => {
    const onChange = vi.fn();
    renderPicker(createDefaultDashboardTimewindow(), onChange);
    // the panel lives inside a Popover — open it first
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('历史'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Tw;
    expect(next.selectedTab).toBe('HISTORY');
    expect(next.history?.historyType).toBe(1);
    expect(next.history?.fixedTimewindow?.endTimeMs).toBeGreaterThan(
      next.history?.fixedTimewindow?.startTimeMs ?? 0,
    );
  });

  it('shows the aggregation type and auto interval', () => {
    const value = createDefaultDashboardTimewindow();
    value.aggregation = { type: AggregationType.AVG, limit: 25000 };
    renderPicker(value, vi.fn());
    fireEvent.click(screen.getByRole('button'));
    // 1h window / 200 buckets → 30s step, displayed as the resolved interval
    expect(document.body.textContent).toContain('30s');
    expect(document.body.textContent).toContain('AVG');
  });

  it('disables the trigger when disabled', () => {
    renderPicker(createDefaultDashboardTimewindow(), vi.fn(), true);
    expect(screen.getByRole('button')).toHaveAttribute('disabled');
  });
});
