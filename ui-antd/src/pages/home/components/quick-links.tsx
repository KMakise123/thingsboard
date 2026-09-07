/**
 * Quick-links fallback for /home (M15 arch R40): when no home dashboard is
 * configured (GET /api/dashboard/home resolves undefined — SA always, TA/CU
 * until one is pinned in /settings/home), render a responsive navigation
 * card grid derived from the route tree. The data source is the same tree
 * the side menu is generated from (useAppData clientRoutes), access-filtered
 * through umi's useAccessMarkedRoutes (the exact filter the menu uses) with
 * `home` itself excluded — ngx buildUserHome parity. The ngx static JSON
 * home pages stay unported (Angular descriptors would render as a
 * placeholder wall, R40); this native grid is the equivalent "navigation
 * start point" for an unconfigured home.
 */
import {
  AlertOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  ClusterOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  EyeOutlined,
  FolderOutlined,
  FunctionOutlined,
  HistoryOutlined,
  HomeOutlined,
  IdcardOutlined,
  PartitionOutlined,
  ProfileOutlined,
  SettingOutlined,
  TabletOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useAccessMarkedRoutes, useAppData } from '@umijs/max';
import { Card, Col, Row, Typography } from 'antd';
import { useIntl } from 'react-intl';

/** Minimal shape of a client-route node the derivation reads. */
export interface MarkedRouteLike {
  id?: string;
  name?: string;
  path?: string;
  icon?: string;
  redirect?: string;
  hideInMenu?: boolean;
  unaccessible?: boolean;
  children?: Array<MarkedRouteLike>;
  /** pro-layout compatibility alias of `children` (umi sets both). */
  routes?: Array<MarkedRouteLike>;
}

/** One derived navigation card: target path + `menu.<menuKey>` i18n key. */
export interface QuickLink {
  path: string;
  menuKey: string;
  icon?: string;
}

const routeChildren = (node: MarkedRouteLike): Array<MarkedRouteLike> =>
  node.children ?? node.routes ?? [];

/**
 * Walk the top level of the (access-marked) shell route tree and collect
 * the visible entries: unnamed nodes (entry, redirects, 404), hidden ones
 * and the home route itself are skipped; a named group node (settings /
 * resources / notifications / edge) contributes one card targeting its
 * first accessible named child, exactly like the menu collapses it.
 */
export function deriveQuickLinks(
  nodes: Array<MarkedRouteLike> | undefined,
): Array<QuickLink> {
  const links: Array<QuickLink> = [];
  for (const node of nodes ?? []) {
    if (!node.name || node.hideInMenu || node.unaccessible) {
      continue;
    }
    // Home itself never links to itself (ngx buildUserHome parity); the
    // login-family group stays out by its /user path.
    if (node.name === 'home' || node.path === '/user') {
      continue;
    }
    const children = routeChildren(node);
    if (children.length > 0) {
      const first = children.find(
        (child) =>
          child.name && !child.hideInMenu && !child.unaccessible && child.path,
      );
      if (!first?.path) {
        continue;
      }
      links.push({
        path: first.path,
        menuKey: node.name,
        icon: node.icon,
      });
      continue;
    }
    if (!node.path) {
      continue;
    }
    links.push({ path: node.path, menuKey: node.name, icon: node.icon });
  }
  return links;
}

/**
 * routes.ts `icon` string → antd icon. The value domain is the one the
 * config file actually uses (umi generates `<PascalCase>Outlined` for the
 * menu from the same strings); anything unmapped renders without an icon.
 */
const ROUTE_ICONS: Record<string, React.ReactNode> = {
  home: <HomeOutlined />,
  tablet: <TabletOutlined />,
  dashboard: <DashboardOutlined />,
  partition: <PartitionOutlined />,
  function: <FunctionOutlined />,
  history: <HistoryOutlined />,
  barChart: <BarChartOutlined />,
  apartment: <ApartmentOutlined />,
  cluster: <ClusterOutlined />,
  eye: <EyeOutlined />,
  team: <TeamOutlined />,
  user: <UserOutlined />,
  alert: <AlertOutlined />,
  profile: <ProfileOutlined />,
  appstore: <AppstoreOutlined />,
  deploymentUnit: <DeploymentUnitOutlined />,
  bank: <BankOutlined />,
  idcard: <IdcardOutlined />,
  setting: <SettingOutlined />,
  folder: <FolderOutlined />,
  bell: <BellOutlined />,
};

const QuickLinks: React.FC = () => {
  const { formatMessage } = useIntl();
  const { clientRoutes } = useAppData() as {
    clientRoutes?: Array<MarkedRouteLike>;
  };
  // The app-shell subtree holds every menu route (login family lives
  // outside it); marking mirrors the side menu's own access filter.
  const shell = clientRoutes?.find(
    (route) => route.id === 'ant-design-pro-layout',
  );
  const marked = useAccessMarkedRoutes(
    routeChildren(shell ?? {}) as never,
  ) as Array<MarkedRouteLike>;
  const links = deriveQuickLinks(marked);

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {formatMessage({
          id: 'pages.home.fallbackTitle',
          defaultMessage: 'Quick links',
        })}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        {formatMessage({
          id: 'pages.home.fallbackDescription',
          defaultMessage:
            'No home dashboard is configured yet — pick a destination below.',
        })}
      </Typography.Paragraph>
      <Row gutter={[16, 16]}>
        {links.map((link) => (
          <Col key={link.path} xs={24} sm={12} md={8} xl={6}>
            <Card
              hoverable
              onClick={() => history.push(link.path)}
              styles={{
                body: { display: 'flex', alignItems: 'center', gap: 12 },
              }}
            >
              {ROUTE_ICONS[link.icon ?? ''] ?? <AppstoreOutlined />}
              <span>
                {formatMessage({
                  id: `menu.${link.menuKey}`,
                  defaultMessage: link.menuKey,
                })}
              </span>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default QuickLinks;
