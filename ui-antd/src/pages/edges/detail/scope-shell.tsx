/**
 * Shared wiring for the four edge sub-entity scope pages (devices /
 * assets / entityViews / dashboards; wave 5a). Mirrors the customer-scope
 * shell: the header title reads "Edge name: entity plural" (R01/R26), the
 * dynamic breadcrumb leaf carries the edge's real name, and the back arrow
 * returns to the edge detail (routes stay flat siblings of edges.detail, so
 * the auto breadcrumb chain is [Edge instances → leaf]). Page-private on
 * purpose — not generalized (R01).
 */

import { useQuery } from '@tanstack/react-query';
import { history } from '@umijs/max';
import { Alert } from 'antd';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { getEdgeInfo } from '@/services/tb/edge';

/** The edge's name for header/breadcrumb use (plain info endpoint). */
export function useEdgeScopeName(edgeId?: string) {
  return useQuery({
    queryKey: ['edge', 'scope-title', edgeId],
    queryFn: () => getEdgeInfo(edgeId as string),
    enabled: !!edgeId,
    retry: false,
  });
}

export interface EdgeScopePageShellProps {
  edgeId?: string;
  /** Resolved edge name; falls back to the raw id while loading. */
  edgeName?: string;
  /** The scope page's own plural label (already formatted). */
  title: string;
  loadError?: unknown;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

export function EdgeScopePageShell({
  edgeId,
  edgeName,
  title,
  loadError,
  extra,
  children,
}: EdgeScopePageShellProps) {
  const { formatMessage } = useIntl();
  const scopeName = edgeName ?? edgeId;
  return (
    <PageContainer
      title={scopeName ? `${scopeName}: ${title}` : title}
      breadcrumbLabel={scopeName}
      onBack={edgeId ? () => history.push(`/edges/${edgeId}`) : undefined}
      extra={extra}
      content={
        loadError !== undefined ? (
          <Alert
            type="warning"
            showIcon
            title={formatMessage({
              id: 'pages.edge.scope.loadTitleFailed',
              defaultMessage: 'Failed to load the edge name',
            })}
            description={serverErrorText(loadError)}
          />
        ) : undefined
      }
    >
      {children}
    </PageContainer>
  );
}
