import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { EditorSession } from '@/core/editor/session';
import zhEditor from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import zhDialogs from '@/locales/zh-CN/editor-dashboard-dialogs';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';
import { MoveWidgetsDialog } from './move-widgets';
import {
  clearDialogSession,
  publishDialogSession,
} from './use-dialog-session';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditor, ...zhEditorDashboard, ...zhDialogs },
});

describe('probe', () => {
  it('selects right layout', async () => {
    const dashboard = {
      id: { entityType: 'DASHBOARD', id: 'd1' },
      title: 'Demo',
      configuration: {
        widgets: { w1: { typeFullFqn: 'x', config: {} } },
        states: {
          default: {
            name: 'Root',
            root: true,
            layouts: {
              main: {
                widgets: { w1: { sizeX: 4, sizeY: 3, row: 2, col: 3 } },
                gridSettings: { columns: 24 },
              },
              right: {
                widgets: { w1: { sizeX: 4, sizeY: 3, row: 1, col: 1 } },
                gridSettings: { columns: 24 },
              },
            },
          },
        },
        entityAliases: {},
      },
    } as unknown as Dashboard;
    const configuration = validateAndUpdateDashboard(dashboard)
      .configuration as DashboardConfiguration;
    const session = new EditorSession<DashboardConfiguration>({
      baseline: configuration,
    });
    publishDialogSession(session);
    render(
      <RawIntlProvider value={intl}>
        <MoveWidgetsDialog open payload={undefined} onClose={() => undefined} />
      </RawIntlProvider>,
    );
    const select = document.querySelector('.ant-select');
    fireEvent.mouseDown(select as HTMLElement);
    const option = await screen.findByText('右侧布局', {
      selector: '.ant-select-item-option-content',
    });
    console.log('OPTION FOUND:', option.textContent);
    fireEvent.click(option);
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    console.log('SELECT TEXT AFTER PICK:', screen.getByRole('combobox').textContent);
    const ok = screen.getByTestId('move-widgets-ok') as HTMLButtonElement;
    console.log('OK DISABLED:', ok.disabled);
    fireEvent.click(ok);
    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
    console.log('HISTORY:', session.history.map((h) => h.label));
    console.log(
      'RIGHT WIDGET:',
      JSON.stringify(session.current.states.default.layouts.right?.widgets),
    );
    expect(true).toBe(true);
    cleanup();
    clearDialogSession();
  });
});
