/**
 * Derive-dialog flow tests (spec §5.6): custom mode lists ONLY react-1
 * types (the descriptor filter happens on the details read) and delivers a
 * full copy; builtin mode fetches by full fqn, shows the honest restriction
 * alert and delivers the restricted copy.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/editor';
import zhWidgetEditor from '@/locales/zh-CN/editor-widget-editor';
import zhWidgetIo from '@/locales/zh-CN/editor-widget-io';
import { EntityType } from '@/types/tb/entity';
import type { WidgetType, WidgetTypeDetails } from '@/types/tb/widget-type';

import type { WidgetEditorDoc } from '../draft-convert';
import { DeriveWidgetDialog } from './index';

const serviceMock = vi.hoisted(() => ({
  getWidgetTypes: vi.fn(),
  getWidgetTypeById: vi.fn(),
  getWidgetTypeByFullFqn: vi.fn(),
}));
vi.mock('@/services/tb/widget-type', () => serviceMock);

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhWidgetEditor, ...zhWidgetIo },
});

function widgetType(
  id: string,
  overrides?: Partial<WidgetTypeDetails>,
): WidgetTypeDetails {
  return {
    id: { entityType: EntityType.WIDGET_TYPE, id },
    fqn: `widget_${id}`,
    name: `Widget ${id}`,
    version: 1,
    descriptor: {},
    ...overrides,
  };
}

function setup() {
  const onConfirm = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <DeriveWidgetDialog open payload={{ onConfirm }} onClose={() => {}} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
  return { onConfirm };
}

beforeEach(() => {
  serviceMock.getWidgetTypes.mockReset();
  serviceMock.getWidgetTypes.mockResolvedValue({
    data: [],
    totalPages: 1,
    totalElements: 0,
    hasNext: false,
  });
  serviceMock.getWidgetTypeById.mockReset();
  serviceMock.getWidgetTypeByFullFqn.mockReset();
});

describe('DeriveWidgetDialog — tier 1: full derive from a react-1 custom type', () => {
  it('lists only react-1 types (Angular rows are filtered on the details read)', async () => {
    serviceMock.getWidgetTypes.mockResolvedValue({
      data: [widgetType('a'), widgetType('b'), widgetType('c')],
      hasNext: false,
      totalPages: 1,
      totalElements: 3,
    });
    serviceMock.getWidgetTypeById
      .mockResolvedValueOnce(
        widgetType('a', {
          descriptor: {
            runtime: 'react-1',
            schemaVersion: 1,
            source: { tsx: 'export default () => <div />' },
          },
        }),
      )
      .mockResolvedValueOnce(widgetType('b'))
      .mockResolvedValueOnce(
        widgetType('c', {
          descriptor: {
            runtime: 'react-1',
            source: { tsx: 'export default () => <span />' },
          },
        }),
      );
    setup();
    await waitFor(() => {
      expect(
        screen.getByTestId('widget-derive-option-widget_a'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('widget-derive-option-widget_c'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('widget-derive-option-widget_b')).toBeNull();
  });

  it('confirm delivers a full copy with the picked source and new name', async () => {
    serviceMock.getWidgetTypes.mockResolvedValue({
      data: [widgetType('a')],
      hasNext: false,
      totalPages: 1,
      totalElements: 1,
    });
    const reactType = widgetType('a', {
      descriptor: {
        runtime: 'react-1',
        schemaVersion: 1,
        source: { tsx: 'export default () => <div />', css: '.x{}' },
        type: 'latest',
        sizeX: 6,
        sizeY: 4,
      },
    });
    serviceMock.getWidgetTypeById.mockResolvedValue(reactType);
    const { onConfirm } = setup();
    fireEvent.click(await screen.findByTestId('widget-derive-option-widget_a'));
    fireEvent.change(screen.getByTestId('widget-derive-name'), {
      target: { value: 'My derived card' },
    });
    fireEvent.click(
      screen
        .getByTestId('widget-derive-dialog')
        .querySelector('.ant-btn-primary') as HTMLButtonElement,
    );
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
    const doc = onConfirm.mock.calls[0][0] as WidgetEditorDoc;
    expect(doc.widgetTypeId).toBeNull();
    expect(doc.fqn).toBe('');
    expect(doc.version).toBeNull();
    expect(doc.name).toBe('My derived card');
    expect(doc.source.tsx).toContain('export default');
  });
});

describe('DeriveWidgetDialog — tier 2: restricted derive from a built-in type', () => {
  it('fetches by full fqn and delivers the restricted copy (no Angular source)', async () => {
    const builtinBase: WidgetType = widgetType('sys-1', {
      fqn: 'system.analogue_gauges.radial_gauge',
      name: 'Radial gauge',
      descriptor: {
        type: 'latest',
        sizeX: 8,
        sizeY: 6,
        templateHtml: '<div></div>',
        controllerScript: 'self.onInit = function() {};',
        settingsForm: [{ id: 'min', name: 'Min', type: 'number', default: 0 }],
        defaultConfig: '{"title":"gauge"}',
      },
    });
    serviceMock.getWidgetTypeByFullFqn.mockResolvedValue(builtinBase);
    const { onConfirm } = setup();
    // switch to builtin mode
    fireEvent.click(screen.getByText('从内置类型'));
    fireEvent.click(
      await screen.findByTestId(
        'widget-derive-option-system.analogue_gauges.radial_gauge',
      ),
    );
    // the honest restriction alert is visible in builtin mode
    expect(screen.getByText(/源码不可得/)).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('widget-derive-name'), {
      target: { value: 'My gauge copy' },
    });
    await waitFor(() => {
      fireEvent.click(
        screen
          .getByTestId('widget-derive-dialog')
          .querySelector('.ant-btn-primary') as HTMLButtonElement,
      );
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
    const doc = onConfirm.mock.calls[0][0] as WidgetEditorDoc;
    expect(doc.widgetTypeId).toBeNull();
    expect(doc.name).toBe('My gauge copy');
    expect(doc.meta.type).toBe('latest');
    expect(doc.settingsForm).toHaveLength(1);
    expect(doc.defaultConfig).toBe('{"title":"gauge"}');
    // never the Angular source
    expect(doc.source.tsx).not.toContain('self.onInit');
    expect(doc.descriptorPassthrough.templateHtml).toBeUndefined();
    expect(doc.descriptorPassthrough.controllerScript).toBeUndefined();
  });
});
