/**
 * Shared dashboard loader for the view/fullscreen pages: GET
 * /api/dashboard/{id} + validateAndUpdateDashboard normalization.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { getDashboard } from '@/services/tb/dashboard';
import type { Dashboard } from '@/types/tb/dashboard';

export function useDashboard(dashboardId: string | undefined) {
  const query = useQuery({
    queryKey: ['dashboard', 'full', dashboardId],
    queryFn: () => getDashboard(dashboardId as string),
    enabled: Boolean(dashboardId),
  });

  const dashboard: Dashboard | undefined = useMemo(
    () => (query.data ? validateAndUpdateDashboard(query.data) : undefined),
    [query.data],
  );

  return { query, dashboard };
}
