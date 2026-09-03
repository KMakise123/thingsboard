/**
 * Dashboard editor page (route `/dashboards/:dashboardId/editor`, M7 brief
 * §3 C wave). Loads + normalizes the dashboard, opens an EditorSession over
 * the normalized configuration as the baseline and renders the edit shell.
 *
 * The page is pure edit mode: entry is the readonly toolbar 编辑 button,
 * both exits (save / cancel) land back on the readonly view route. Empty
 * dashboards (no widgets after normalization) are born in edit mode —
 * trivially true here because the route carries no readonly face.
 */
import { history, useParams } from '@umijs/max';
import { Alert, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import { useDashboard } from '@/components/dashboard/use-dashboard';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';

import { EditorShell } from './shell';

export default function DashboardsEditorPage() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { formatMessage } = useIntl();

  const { query, dashboard } = useDashboard(dashboardId);

  const [session] = useState(() => new EditorSession<DashboardConfiguration>());
  // The PageContainer back arrow must honor the same dirty guard as the
  // toolbar's exit (离开确认 dirty 判定同源 — spec §6.3): subscribe to the
  // session so re-renders track draft edits.
  const { dirty } = useEditorSession(session);

  // Enter once per dashboard: the draft must survive react-query
  // background refetches (a new configuration object from the server must
  // never silently reset the user's undo stack mid-edit). The entered id
  // is STATE so the shell renders right after the enter effect commits.
  const [enteredId, setEnteredId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (dashboard?.configuration && dashboardId && enteredId !== dashboardId) {
      session.enter(dashboard.configuration);
      setEnteredId(dashboardId);
    }
  }, [dashboard, dashboardId, session, enteredId]);

  const entered = enteredId === dashboardId;

  const backToView = (dashboardMeta: Dashboard) => {
    history.push(`/dashboards/${dashboardMeta.id?.id ?? dashboardId}`);
  };

  return (
    <PageContainer
      breadcrumbLabel={dashboard?.title}
      dirty={dirty}
      onBack={() => dashboard && backToView(dashboard)}
    >
      {query.isPending ? (
        <Spin
          style={{ display: 'block', margin: '64px auto' }}
          tip={formatMessage({
            id: 'dashboards.page.loading',
            defaultMessage: 'Loading dashboard…',
          })}
        >
          <div style={{ minHeight: 120 }} />
        </Spin>
      ) : query.isError ? (
        <Alert type="error" showIcon message={serverErrorText(query.error)} />
      ) : dashboard && entered ? (
        <EditorShell session={session} dashboard={dashboard} />
      ) : null}
    </PageContainer>
  );
}
