/**
 * Tenant-admins scope page (spec 3.7; SA only per routes/access).
 *
 * ui-ngx users-table-config.resolver parity for the tenantId path: the list
 * reads GET /api/tenant/{tenantId}/users, created users are stamped
 * TENANT_ADMIN + the parent tenant (resolver saveUser), and the authority
 * column disappears (every row is a tenant admin). The six operations come
 * from the shared UsersTable.
 *
 * loginAsUser (SA-specific, spec §3.5 note): ui-ngx authService.loginAsUser
 * = GET /api/user/{userId}/token, store the JwtPair and go to the default
 * place. The entry renders only while the backend switch
 * GET /api/user/tokenAccessEnabled is on (ui-ngx reads the same flag from
 * /api/system/params — this backend exposes the dedicated endpoint).
 */
import { useQuery } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import type { MenuProps } from 'antd';
import { App } from 'antd';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { UsersTable } from '@/components/users/users-table';
import { tokenStore } from '@/core/auth/token-store';
import { roleDefaultPath } from '@/pages/user/utils';
import { getCurrentUser } from '@/services/tb/auth';
import { getTenantInfo, getTenantUsers } from '@/services/tb/tenant';
import { getUserToken, isUserTokenAccessEnabled } from '@/services/tb/user';
import { Authority, type User } from '@/types/tb';

export default function TenantUsersPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = id as string;
  const { formatMessage } = useIntl();
  const { message } = App.useApp();

  // Header title = "<tenant title>: 租户管理员" (ui-ngx tableTitle).
  const tenantQuery = useQuery({
    queryKey: ['tenant', 'detail', tenantId],
    queryFn: () => getTenantInfo(tenantId),
    enabled: !!tenantId,
  });

  // ui-ngx gates the login-as entry on auth.userTokenAccessEnabled (from
  // /api/system/params); the dedicated endpoint is the same switch.
  const tokenAccessQuery = useQuery({
    queryKey: ['user', 'tokenAccessEnabled'],
    queryFn: () => isUserTokenAccessEnabled(),
    staleTime: 60_000,
  });

  const loginAsMutation = async (user: User) => {
    try {
      // ui-ngx loginAsUser: fetch the target JwtPair, store it, reload the
      // session, go to the default place for the new authority. The full
      // reload is load-bearing: getInitialState, the access instance and the
      // WS session must all re-derive from the new token. An SPA
      // history.replace renders the target route once under the stale access
      // instance (umi's layout memoizes the matched route per pathname) and
      // sticks on the 403 node, and the socket would stay authenticated as
      // the previous user (observed in M3 acceptance, fixed there).
      const pair = await getUserToken(user.id.id);
      tokenStore.setTokens(pair.token, pair.refreshToken);
      const me = await getCurrentUser();
      window.location.assign(roleDefaultPath(me));
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const rowMenuExtraItems =
    tokenAccessQuery.data === true
      ? (user: User): NonNullable<MenuProps['items']>[number] => ({
          key: 'login-as',
          label: formatMessage({
            id: 'pages.tenants.users.loginAs',
            defaultMessage: 'Login as tenant admin',
          }),
          onClick: () => void loginAsMutation(user),
        })
      : undefined;

  return (
    <PageContainer
      title={
        tenantQuery.data
          ? formatMessage(
              {
                id: 'pages.tenants.users.title',
                defaultMessage: '{title}: Tenant admins',
              },
              { title: tenantQuery.data.title },
            )
          : undefined
      }
      breadcrumbLabel={
        tenantQuery.data
          ? formatMessage(
              {
                id: 'pages.tenants.users.title',
                defaultMessage: '{title}: Tenant admins',
              },
              { title: tenantQuery.data.title },
            )
          : undefined
      }
      onBack={() => history.push(`/tenants/${tenantId}`)}
    >
      <UsersTable
        queryKeyPrefix={['tenants', 'users', tenantId]}
        fetchUsers={(pageLink) => getTenantUsers(tenantId, pageLink)}
        scope={{ authority: Authority.TENANT_ADMIN, tenantId }}
        hideAuthorityColumn
        rowMenuExtraItems={rowMenuExtraItems}
        searchPlaceholder={formatMessage({
          id: 'pages.tenants.users.search',
          defaultMessage: 'Search users',
        })}
        addLabel={formatMessage({
          id: 'pages.tenants.users.add',
          defaultMessage: 'Add user',
        })}
      />
    </PageContainer>
  );
}
