/**
 * PageContainer wrapper tests (ADR 0008): title resolution (explicit prop
 * vs route `name` i18n), the breadcrumb rule (parents from the route tree,
 * leaf from the page's real name) and the unsaved-changes back guard.
 * pro-components is stubbed — its compiled bundle cannot resolve antd
 * locale imports under vite-node (M1 known issue); the stub surfaces the
 * wrapper's contract instead.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PageContainer, { buildBreadcrumbItems } from './page-container';

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

let mockMatches: Array<{ route: { name?: string }; pathname: string }> = [];

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => mockMatches,
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: (props: {
    title?: React.ReactNode;
    onBack?: () => void;
    breadcrumbRender?: () => Array<{
      title: string;
      href?: string;
      onClick?: (event: { preventDefault: () => void }) => void;
    }>;
    children?: React.ReactNode;
  }) => {
    const crumbs = props.breadcrumbRender?.() ?? [];
    return (
      <div>
        <ul data-testid="crumbs">
          {crumbs.map((crumb) => (
            <li key={crumb.title}>
              {crumb.href ? (
                <a href={crumb.href} onClick={crumb.onClick}>
                  {crumb.title}
                </a>
              ) : (
                <span>{crumb.title}</span>
              )}
            </li>
          ))}
        </ul>
        <h1 data-testid="title">{props.title}</h1>
        {props.onBack ? (
          <button type="button" data-testid="back" onClick={props.onBack}>
            back
          </button>
        ) : null}
        {props.children}
      </div>
    );
  },
}));

const intl = createIntl({
  locale: 'zh-CN',
  messages: {
    'menu.devices': '设备',
    'menu.devices.detail': '设备详情',
    'pages.common.unsavedTitle': '未保存的更改',
    'pages.common.unsavedText': '当前页面有未保存的更改，确定离开吗？',
    'pages.common.unsavedLeave': '离开',
    'pages.common.cancel': '取消',
  },
});

function renderWrapper(ui: React.ReactElement) {
  return render(
    <AntdApp>
      <RawIntlProvider value={intl}>{ui}</RawIntlProvider>
    </AntdApp>,
  );
}

const deviceChain = [
  { route: { name: 'devices' }, pathname: '/devices' },
  { route: { name: 'devices.detail' }, pathname: '/devices/dev-1' },
];

describe('PageContainer wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatches = [];
  });

  it('passes an explicit title through', () => {
    mockMatches = deviceChain;
    renderWrapper(<PageContainer title="My device">content</PageContainer>);
    expect(screen.getByTestId('title').textContent).toBe('My device');
  });

  it('falls back to the leaf route menu label for the title', () => {
    mockMatches = deviceChain;
    renderWrapper(<PageContainer>content</PageContainer>);
    expect(screen.getByTestId('title').textContent).toBe('设备详情');
  });

  it('renders parents from the route tree and the leaf from breadcrumbLabel', () => {
    mockMatches = deviceChain;
    renderWrapper(
      <PageContainer breadcrumbLabel="m1-test-detail-alpha">
        content
      </PageContainer>,
    );
    const crumbs = screen.getByTestId('crumbs');
    expect(crumbs.textContent).toContain('设备');
    expect(crumbs.textContent).toContain('m1-test-detail-alpha');
    const links = crumbs.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/devices');
    // The leaf is plain text, not a link.
    expect(crumbs.querySelector('span')?.textContent).toBe(
      'm1-test-detail-alpha',
    );
  });

  it('falls back to the leaf menu label without breadcrumbLabel', () => {
    mockMatches = deviceChain;
    renderWrapper(<PageContainer>content</PageContainer>);
    const crumbs = screen.getByTestId('crumbs');
    expect(crumbs.textContent).toContain('设备详情');
  });

  it('renders nothing for single-entry chains', () => {
    mockMatches = [{ route: { name: 'devices' }, pathname: '/devices' }];
    renderWrapper(<PageContainer>content</PageContainer>);
    expect(screen.getByTestId('crumbs').children).toHaveLength(0);
  });

  it('keeps crumbs short enough at the builder level too', () => {
    const items = buildBreadcrumbItems(deviceChain, intl.formatMessage, 'X');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: '设备', href: '/devices' });
    expect(items[1]).toMatchObject({ title: 'X', href: undefined });
  });

  it('fires onBack immediately when clean', () => {
    mockMatches = deviceChain;
    const onBack = vi.fn();
    renderWrapper(<PageContainer onBack={onBack}>content</PageContainer>);
    fireEvent.click(screen.getByTestId('back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('guards onBack behind an unsaved-changes confirm when dirty', async () => {
    mockMatches = deviceChain;
    const onBack = vi.fn();
    renderWrapper(
      <PageContainer onBack={onBack} dirty>
        content
      </PageContainer>,
    );
    fireEvent.click(screen.getByTestId('back'));
    // antd renders the confirm title twice (visible + announced copy).
    expect((await screen.findAllByText('未保存的更改')).length).toBeGreaterThan(
      0,
    );
    expect(onBack).not.toHaveBeenCalled();

    // Cancel keeps the user on the page.
    fireEvent.click(screen.getAllByRole('button', { name: /取\s*消/ })[0]);
    expect(onBack).not.toHaveBeenCalled();

    // Re-open and leave for real; target the newest dialog instance.
    fireEvent.click(screen.getByTestId('back'));
    const leaveButtons = screen.getAllByRole('button', { name: /离\s*开/ });
    fireEvent.click(leaveButtons[leaveButtons.length - 1]);
    await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
  });
});
