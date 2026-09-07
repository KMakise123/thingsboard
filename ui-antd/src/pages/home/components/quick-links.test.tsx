/**
 * Quick-links fallback tests (M15 R40/R48): the route-tree derivation
 * filters by access exactly like the side menu (SA never sees the tenant
 * domain, groups collapse onto their first accessible child) and the
 * component renders the cards with menu i18n titles and click navigation.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import zhHome from '@/locales/zh-CN/home';
import zhMenu from '@/locales/zh-CN/menu';

import { deriveQuickLinks, type MarkedRouteLike } from './quick-links';

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
const appDataMock = vi.hoisted(() => ({
  clientRoutes: [] as MarkedRouteLike[],
}));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useAppData: () => appDataMock,
  // Pass-through: the fixtures below carry the `unaccessible` flags that
  // umi's real useAccessMarkedRoutes would stamp on.
  useAccessMarkedRoutes: (routes: unknown) => routes,
}));

import QuickLinks from './quick-links';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhMenu, ...zhHome },
});

/** Shell subtree shape, per-role `unaccessible` stamps pre-applied. */
function shellRoutes(
  stamp: (node: MarkedRouteLike) => MarkedRouteLike,
): MarkedRouteLike[] {
  const mark = (node: MarkedRouteLike): MarkedRouteLike => ({
    ...node,
    children: node.children?.map(mark),
  });
  return [
    {
      id: 'ant-design-pro-layout',
      children: [
        { path: '/' }, // entry — unnamed, skipped
        mark(stamp({ name: 'home', path: '/home', icon: 'home' })),
        mark(stamp({ name: 'devices', path: '/devices', icon: 'tablet' })),
        mark(stamp({ name: 'tenants', path: '/tenants', icon: 'bank' })),
        mark(
          stamp({
            name: 'calculatedFields',
            path: '/calculatedFields',
            icon: 'function',
          }),
        ),
        mark(
          stamp({
            name: 'users',
            path: '/users',
            icon: 'user',
          }),
        ),
        mark(
          stamp({
            name: 'devices.detail',
            path: '/devices/:id',
            hideInMenu: true,
          }),
        ),
        mark(
          stamp({
            name: 'settings',
            path: '/settings',
            icon: 'setting',
            children: [
              { path: '/settings', hideInMenu: true }, // group entry, unnamed
              stamp({ name: 'general', path: '/settings/general' }),
              stamp({ name: 'home', path: '/settings/home' }),
            ],
          }),
        ),
        mark(
          stamp({
            name: 'notifications',
            path: '/notifications',
            icon: 'bell',
            children: [
              { path: '/notifications', redirect: '/notifications/inbox' },
              stamp({ name: 'inbox', path: '/notifications/inbox' }),
            ],
          }),
        ),
      ],
    },
  ];
}

const allowAll = (node: MarkedRouteLike) => node;
const deny = (node: MarkedRouteLike) => ({ ...node, unaccessible: true });

describe('deriveQuickLinks (route-tree derivation, arch R40)', () => {
  it('skips the entry, unnamed redirects, hidden details and home itself', () => {
    const links = deriveQuickLinks(shellRoutes(allowAll)[0].children);
    expect(links.filter((link) => link.path === '/home')).toEqual([]);
    expect(links.filter((link) => link.path === '/')).toEqual([]);
    expect(links.filter((link) => link.path === '/devices/:id')).toEqual([]);
    expect(links.map((link) => link.path)).toEqual(
      expect.arrayContaining(['/devices', '/tenants', '/users']),
    );
  });

  it('collapses a named group onto its first accessible named child', () => {
    const links = deriveQuickLinks(shellRoutes(allowAll)[0].children);
    const settings = links.find((link) => link.menuKey === 'settings');
    expect(settings).toMatchObject({
      path: '/settings/general',
      icon: 'setting',
    });
    const notifications = links.find(
      (link) => link.menuKey === 'notifications',
    );
    expect(notifications).toMatchObject({ path: '/notifications/inbox' });
  });

  it('filters like the side menu: SA loses the tenant domain, keeps sys pages', () => {
    // SA: tenant-scoped pages unaccessible, sys + shared pages visible;
    // the TA-only settings.home child is hidden for SA too.
    const sa = (node: MarkedRouteLike) =>
      ['/devices', '/calculatedFields', '/users', '/settings/home'].includes(
        node.path ?? '',
      )
        ? deny(node)
        : node;
    const links = deriveQuickLinks(shellRoutes(sa)[0].children);
    expect(links.map((link) => link.path)).toEqual([
      '/tenants',
      '/settings/general',
      '/notifications/inbox',
    ]);
  });

  it('filters like the side menu: TA sees tenant pages and settings → home', () => {
    // canSysAdmin pages (tenants, settings.general) are invisible to TA, so
    // the settings group collapses onto its TA-only home child.
    const ta = (node: MarkedRouteLike) =>
      ['/tenants', '/settings/general'].includes(node.path ?? '')
        ? deny(node)
        : node;
    const links = deriveQuickLinks(shellRoutes(ta)[0].children);
    expect(links.map((link) => link.path)).toEqual([
      '/devices',
      '/calculatedFields',
      '/users',
      '/settings/home',
      '/notifications/inbox',
    ]);
  });

  it('renders cards with menu i18n titles and navigates on click', () => {
    appDataMock.clientRoutes = shellRoutes(allowAll);
    render(
      <RawIntlProvider value={intl}>
        <QuickLinks />
      </RawIntlProvider>,
    );

    expect(screen.getByText('快捷入口')).toBeInTheDocument();
    const card = screen.getByText('设备').closest('.ant-card');
    expect(card).not.toBeNull();
    fireEvent.click(card as Element);
    expect(historyMock.push).toHaveBeenCalledWith('/devices');
    // Settings card carries the group title, not the first child's.
    expect(screen.getByText('系统设置')).toBeInTheDocument();
  });
});
