/**
 * ConsolePane presentational contract (M9 brief §3 wave S item 9): entries
 * render with their level, the clear affordance follows the entry count.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/editor';
import zhWidgetEditor from '@/locales/zh-CN/editor-widget-editor';

import { ConsolePane } from './console';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhWidgetEditor },
});

function renderPane(entries: Parameters<typeof ConsolePane>[0]['entries']) {
  const onClear = vi.fn();
  render(
    <RawIntlProvider value={intl}>
      <ConsolePane entries={entries} onClear={onClear} />
    </RawIntlProvider>,
  );
  return { onClear };
}

describe('ConsolePane', () => {
  it('shows the empty state and a disabled clear with no entries', () => {
    renderPane([]);
    expect(screen.getByText('暂无输出')).toBeInTheDocument();
    expect(screen.getByTestId('widget-console-clear')).toBeDisabled();
  });

  it('renders entries with their level marker and clears on demand', () => {
    const { onClear } = renderPane([
      { id: 1, level: 'log', text: 'hello', ts: 0 },
      { id: 2, level: 'error', text: 'boom', ts: 0 },
    ]);
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByTestId('widget-console-entry-error')).toHaveTextContent(
      'boom',
    );
    expect(screen.getByTestId('widget-console-clear')).toBeEnabled();
    fireEvent.click(screen.getByTestId('widget-console-clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
