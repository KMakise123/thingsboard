/**
 * ConflictDialog content tests — frozen props, honest copy per the 占位三态
 * rule: server known → title + version; server unknown → explicit alert;
 * local always described as an unsaved dirty draft.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import zhEditorCommon from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import zhContract from '@/locales/zh-CN/editor-dashboard-contract';
import type { Dashboard } from '@/types/tb/dashboard';
import { ConflictDialog } from './ConflictDialog';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorCommon, ...zhEditorDashboard, ...zhContract },
});

function serverDashboard(): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Server title',
    version: 9,
  } as Dashboard;
}

function setup(serverDashboardArg?: Dashboard | null) {
  const handlers = {
    onLoadServer: vi.fn(),
    onOverwrite: vi.fn(),
    onExportLocal: vi.fn(),
    onClose: vi.fn(),
  };
  render(
    <RawIntlProvider value={intl}>
      <ConflictDialog
        open
        serverDashboard={
          serverDashboardArg === undefined ? serverDashboard() : serverDashboardArg
        }
        {...handlers}
      />
    </RawIntlProvider>,
  );
  return handlers;
}

describe('ConflictDialog — §3.8 three options', () => {
  it('shows the server title + version and the dirty local draft', () => {
    setup();
    expect(screen.getByTestId('editor-conflict-server')).toHaveTextContent(
      'Server title',
    );
    expect(screen.getByTestId('editor-conflict-server')).toHaveTextContent(
      'v9',
    );
    expect(screen.getByTestId('editor-conflict-local')).toHaveTextContent(
      '包含未保存的修改',
    );
  });

  it('renders an honest unknown-server alert when the conflict-time GET failed', () => {
    setup(null);
    expect(screen.getByTestId('editor-conflict-server')).toHaveTextContent(
      '无法获取服务器最新版本',
    );
  });

  it.each([
    ['editor-conflict-load-server', 'onLoadServer'],
    ['editor-conflict-overwrite', 'onOverwrite'],
    ['editor-conflict-export-local', 'onExportLocal'],
  ] as const)('%s fires exactly its own handler', (testId, handler) => {
    const handlers = setup();
    fireEvent.click(screen.getByTestId(testId));
    expect(handlers[handler]).toHaveBeenCalledTimes(1);
    const others = Object.entries(handlers).filter(([key]) => key !== handler);
    for (const [, fn] of others) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('close (X) only closes — it never resolves the conflict silently', () => {
    const handlers = setup();
    fireEvent.click(document.querySelector('.ant-modal-close') as HTMLElement);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
    expect(handlers.onLoadServer).not.toHaveBeenCalled();
    expect(handlers.onOverwrite).not.toHaveBeenCalled();
    expect(handlers.onExportLocal).not.toHaveBeenCalled();
  });

  it('labels the three options with the contract copy', () => {
    setup();
    expect(screen.getByText('加载服务器版')).toBeInTheDocument();
    expect(screen.getByText('用我的版本覆盖')).toBeInTheDocument();
    expect(screen.getByText('导出本地 JSON 后放弃')).toBeInTheDocument();
  });
});
