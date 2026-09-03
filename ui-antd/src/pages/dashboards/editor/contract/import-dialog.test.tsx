/**
 * ImportDashboardDialog flow tests: pick → confirm → 补录 create-or-skip →
 * onApply carries the normalized configuration + created stubs; cancel and
 * parse errors stay honest.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhEditorCommon from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import zhContract from '@/locales/zh-CN/editor-dashboard-contract';
import type { DashboardConfiguration, EntityAlias } from '@/types/tb/dashboard';
import { ImportDashboardDialog } from './import-dialog';

const intl = createIntl({
  locale: 'zh-CN',
  messages: {
    ...zhEditorCommon,
    ...zhEditorDashboard,
    ...zhContract,
    'dashboards.list.importParseError': '解析失败',
    'dashboards.list.importInvalidError': '无效文件',
  },
});

function jsonFile(name: string, payload: unknown): File {
  return new File([JSON.stringify(payload)], name, {
    type: 'application/json',
  });
}

function importedDashboardPayload() {
  return {
    title: 'Imported dashboard',
    configuration: {
      widgets: [
        {
          typeFullFqn: 'system.cards.test',
          config: {
            datasources: [
              { type: 'entity', entityAliasId: 'alias-1', dataKeys: [] },
            ],
          },
        },
      ],
      entityAliases: {},
      states: [
        { default: true, name: 'Root', layouts: { main: { widgets: [] } } },
      ],
    },
  };
}

function setup() {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <ImportDashboardDialog open onClose={onClose} onApply={onApply} />
      </AntdApp>
    </RawIntlProvider>,
  );
  return { onApply, onClose };
}

async function pickFile(file: File) {
  const input = document.querySelector(
    'input[data-testid="editor-import-dragger"]',
  ) as HTMLInputElement;
  await waitFor(() => expect(input).toBeTruthy());
  await waitFor(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ImportDashboardDialog — pick stage', () => {
  it('moves to the confirm stage showing the widget count', async () => {
    setup();
    await pickFile(jsonFile('a.json', importedDashboardPayload()));
    await waitFor(() => {
      expect(screen.getByTestId('editor-import-widget-count')).toHaveTextContent(
        '1',
      );
    });
    expect(screen.getByTestId('editor-import-apply')).toBeInTheDocument();
  });

  it('surfaces the DashboardImportError locale key on a broken file', async () => {
    setup();
    await pickFile(jsonFile('bad.json', { nope: true }));
    await waitFor(() => {
      expect(document.body.textContent).toContain('导入失败');
    });
    expect(document.body.textContent).toContain('无效文件');
    // still on the pick stage
    expect(screen.getByTestId('editor-import-pick-hint')).toBeInTheDocument();
  });
});

describe('ImportDashboardDialog — confirm stage + 补录', () => {
  it('lists missing aliases and applies created stubs in onApply', async () => {
    const { onApply } = setup();
    await pickFile(jsonFile('a.json', importedDashboardPayload()));
    await waitFor(() => {
      expect(
        screen.getByTestId('editor-import-missing-aliases'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('editor-import-alias-name-alias-1'),
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByTestId('editor-import-alias-name-alias-1'),
      { target: { value: '补录的别名' } },
    );
    fireEvent.click(screen.getByTestId('editor-import-apply'));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const [configuration, created] = onApply.mock
      .calls[0] as [DashboardConfiguration, EntityAlias[]];
    expect(Object.keys(configuration.widgets)).toHaveLength(1); // normalized map
    expect(created).toEqual([
      {
        id: 'alias-1',
        alias: '补录的别名',
        filter: {
          type: 'entityType',
          entityType: 'DEVICE',
          resolveMultiple: true,
        },
      },
    ]);
  });

  it('skipping an alias keeps it out of created stubs', async () => {
    const { onApply } = setup();
    await pickFile(jsonFile('a.json', importedDashboardPayload()));
    await waitFor(() => {
      expect(
        screen.getByTestId('editor-import-alias-skip-alias-1'),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('editor-import-alias-skip-alias-1'));
    // a skipped alias can still be completed again
    expect(
      screen.getByTestId('editor-import-alias-create-alias-1'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('editor-import-apply'));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const [, created] = onApply.mock.calls[0] as [unknown, EntityAlias[]];
    expect(created).toEqual([]);
  });

  it('apply closes nothing by itself — cancel/close is the dialog own path', async () => {
    const { onClose, onApply } = setup();
    await pickFile(jsonFile('a.json', importedDashboardPayload()));
    await waitFor(() => {
      expect(screen.getByTestId('editor-import-cancel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('editor-import-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });
});
