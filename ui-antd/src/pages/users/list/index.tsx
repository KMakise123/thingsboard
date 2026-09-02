/**
 * User-management list page (spec 3.5「用户」六操作; /users is TA-only per
 * routes/access).
 *
 * M3 componentization: the table + six operations moved into the shared
 * UsersTable (src/components/users/users-table.tsx) so the SA tenant-admins
 * page (/tenants/:id/users) can host the same surface with a different data
 * source. This host only pins the scope: GET /api/users resolves the tenant
 * scope server-side from the caller's authority — TA sees every user of the
 * tenant (tenant admins AND customer users, hence the authority column;
 * ui-ngx splits them across two pages).
 */

import { useIntl } from 'react-intl';
import PageContainer from '@/components/layout/page-container';
import { UsersTable } from '@/components/users/users-table';
import { getUsers } from '@/services/tb/user';

export default function UsersListPage() {
  const { formatMessage } = useIntl();

  return (
    <PageContainer>
      <UsersTable
        queryKeyPrefix={['users']}
        fetchUsers={getUsers}
        searchPlaceholder={formatMessage({
          id: 'pages.users.list.search',
          defaultMessage: 'Search users',
        })}
        addLabel={formatMessage({
          id: 'pages.users.list.add',
          defaultMessage: 'Add user',
        })}
      />
    </PageContainer>
  );
}
