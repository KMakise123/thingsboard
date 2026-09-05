/**
 * Widget type detail face smoke tests (M11 wave 1B): metadata rendering
 * with the scope-qualified fqn, the react-1 preview wiring, the Angular
 * placeholder and the edit exit to the M9 editor. The preview stack is
 * mocked at the module boundary (its compile pipeline has its own suite).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhWidgetTypes from '@/locales/zh-CN/resources/widget-types';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhWidgetTypes },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
const paramsMock = vi.hoisted(() => ({
  widgetTypeId: 'wt-1' as string | undefined,
}));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => paramsMock,
}));

const servicesMock = vi.hoisted(() => ({
  getWidgetTypeInfoById: vi.fn(),
  getWidgetTypeById: vi.fn(),
}));

vi.mock('@/services/tb/widget-type', () => servicesMock);

vi.mock('@/pages/widgets/editor/preview', () => ({
  WidgetPreview: () => <div data-testid="preview-stub" />,
}));

// Thin passthrough: the real wrapper pulls @ant-design/pro-components whose
// bundle cannot resolve antd's extensionless locale imports under vite-node
// (same shim rationale as the devices list test).
vi.mock('@/components/layout/page-container', () => ({
  default: (props: {
    title?: React.ReactNode;
    extra?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      {props.title}
      {props.extra}
      {props.children}
    </div>
  ),
}));

import WidgetTypeDetailsPage from './index';

const NULL_TENANT = {
  entityType: 'TENANT',
  id: '13814000-1dd2-11b2-8080-808080808080',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <WidgetTypeDetailsPage />
      </RawIntlProvider>
    </QueryClientProvider>,
  );
}

describe('widget type details page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders metadata with the scope-qualified fqn and jumps to the editor', async () => {
    servicesMock.getWidgetTypeInfoById.mockResolvedValue({
      id: { entityType: 'WIDGET_TYPE', id: 'wt-1' },
      tenantId: { entityType: 'TENANT', id: 'tenant-1' },
      name: '我的卡片',
      fqn: 'my_card',
      widgetType: 'latest',
      deprecated: false,
      bundles: [
        { id: { entityType: 'WIDGETS_BUNDLE', id: 'b-1' }, name: '卡片包' },
      ],
      descriptor: { type: 'latest' },
    });
    renderPage();

    expect((await screen.findAllByText('我的卡片')).length).toBeGreaterThan(0);
    expect(screen.getByText('tenant.my_card')).toBeInTheDocument();
    // the bundle chip links to the bundle manager
    fireEvent.click(screen.getByText('卡片包'));
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith(
        '/resources/widgets-bundles/b-1',
      );
    });

    fireEvent.click(screen.getByTestId('widget-details-edit'));
    expect(historyMock.push).toHaveBeenCalledWith('/widgets/editor/wt-1');
  });

  it('renders the read-only preview for a react-1 type', async () => {
    servicesMock.getWidgetTypeInfoById.mockResolvedValue({
      id: { entityType: 'WIDGET_TYPE', id: 'wt-1' },
      tenantId: NULL_TENANT,
      name: 'react card',
      fqn: 'react_card',
      widgetType: 'latest',
      descriptor: { type: 'latest', runtime: 'react-1' },
    });
    servicesMock.getWidgetTypeById.mockResolvedValue({
      id: { entityType: 'WIDGET_TYPE', id: 'wt-1' },
      name: 'react card',
      fqn: 'react_card',
      descriptor: {
        type: 'latest',
        runtime: 'react-1',
        source: { tsx: 'export default () => <div/>', css: '' },
        settingsForm: [],
        defaultConfig: '{}',
      },
    });
    renderPage();

    expect(await screen.findByText('system.react_card')).toBeInTheDocument();
    expect(servicesMock.getWidgetTypeById).toHaveBeenCalledWith('wt-1');
    await screen.findByTestId('preview-stub');
  });

  it('shows the Angular placeholder instead of a preview for legacy types', async () => {
    servicesMock.getWidgetTypeInfoById.mockResolvedValue({
      id: { entityType: 'WIDGET_TYPE', id: 'wt-2' },
      tenantId: NULL_TENANT,
      name: 'angular card',
      fqn: 'angular_card',
      widgetType: 'timeseries',
      descriptor: { type: 'timeseries' },
    });
    renderPage();

    expect(
      await screen.findByTestId('widget-details-angular'),
    ).toBeInTheDocument();
    expect(servicesMock.getWidgetTypeById).not.toHaveBeenCalled();
  });
});
