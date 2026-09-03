/**
 * DialogHost seam tests: openDialog swaps the slot, placeholders render
 * their honest copy without crashing, closeDialog clears it, and the
 * select-target-layout payload contract (frozen) delivers the pick.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import zhEditorCommon from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';

import { DialogHost, useEditorDialogs } from './host';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorCommon, ...zhEditorDashboard },
});

function Harness(props: {
  onController?: (c: ReturnType<typeof useEditorDialogs>) => void;
}) {
  const controller = useEditorDialogs();
  props.onController?.(controller);
  return <DialogHost controller={controller} />;
}

describe('DialogHost seam', () => {
  it('openDialog renders the lazy placeholder; closeDialog clears the slot', async () => {
    let controller!: ReturnType<typeof useEditorDialogs>;
    render(
      <RawIntlProvider value={intl}>
        <Harness
          onController={(c) => {
            controller = c;
          }}
        />
      </RawIntlProvider>,
    );
    expect(screen.queryByTestId('editor-dialog-placeholder')).toBeNull();
    act(() => {
      controller.openDialog('dashboard-settings');
    });
    await waitFor(() => {
      expect(screen.getByText('Dashboard settings')).toBeInTheDocument();
    });
    // honest copy — never promises a future capability
    expect(screen.getByText('该面板暂无可执行操作。')).toBeInTheDocument();
    act(() => {
      controller.closeDialog();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('editor-dialog-placeholder')).toBeNull();
    });
  });

  it('select-target-layout delivers the picked layout id (frozen payload)', async () => {
    const onPick = vi.fn();
    let controller!: ReturnType<typeof useEditorDialogs>;
    render(
      <RawIntlProvider value={intl}>
        <Harness
          onController={(c) => {
            controller = c;
          }}
        />
      </RawIntlProvider>,
    );
    act(() => {
      controller.openDialog('select-target-layout', {
        layouts: [
          { id: 'main', name: '主布局' },
          { id: 'right', name: '右侧布局' },
        ],
        onPick,
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId('select-target-layout')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('右侧布局'));
    fireEvent.click(screen.getByTestId('select-target-layout-confirm'));
    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith('right');
    });
    // the flow closes the dialog after the pick
    await waitFor(() => {
      expect(screen.queryByTestId('select-target-layout')).toBeNull();
    });
  });
});
