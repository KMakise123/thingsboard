/**
 * /home — the unified M15 landing page (arch R38, spec §7.1). Renders the
 * home dashboard from GET /api/dashboard/home (backend fallback chain
 * user → customer(CU only) → tenant; nothing configured → SA always, TA/CU
 * until pinned in /settings/home) when one is configured; the quick-links
 * card grid otherwise; an Alert on transport errors (never a blank page).
 *
 * `?state=` deep links need zero handling here — the states controller
 * inside DashboardPage reads and writes the query param itself. Rendering
 * stays inside the app shell (no hideMainToolbar equivalent, R38).
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Spin } from 'antd';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { getHomeDashboard } from '@/services/tb/dashboard';

import QuickLinks from './components/quick-links';

export default function HomePage() {
  const query = useQuery({
    queryKey: ['home-dashboard'],
    // react-query forbids an undefined datum (it would flip the query into
    // its error state and hide the fallback behind an Alert) — the "no home
    // configured" resolution is normalized to null here.
    queryFn: async () => (await getHomeDashboard()) ?? null,
  });

  return (
    <PageContainer>
      {query.isPending ? (
        // Entry-page Spin shape: centered, large, no text.
        <div style={{ display: 'flex', justifyContent: 'center', padding: 96 }}>
          <Spin size="large" />
        </div>
      ) : query.isError ? (
        <Alert type="error" showIcon message={serverErrorText(query.error)} />
      ) : query.data ? (
        <DashboardPage
          dashboard={validateAndUpdateDashboard(query.data)}
          hideToolbar={query.data.hideDashboardToolbar}
          embedded
        />
      ) : (
        <QuickLinks />
      )}
    </PageContainer>
  );
}
