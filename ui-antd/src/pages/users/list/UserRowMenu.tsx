/**
 * Per-row "more" menu hosting the user operations (spec 3.5 six ops minus
 * create, which lives in the toolbar).
 *
 * ui-ngx shows the activation/account actions on the user DETAILS page, where
 * GET /api/user/{id} has injected additionalInfo.userActivated /
 * userCredentialsEnabled (BaseController.checkUserInfo). The M2 page has no
 * detail route — it edits in a dialog — so the menu lazily fetches the user
 * on first open (one cheap GET per row, cached) and mirrors the details-page
 * gating:
 *   - not activated  -> Display activation link / Resend activation
 *   - activated      -> Disable/Enable user account (by credentialsEnabled)
 * Until that fetch resolves the gated group renders as a disabled loading
 * item; edit/delete are always available (delete hidden for the session user
 * itself, same guard as ui-ngx's deleteEnabled).
 *
 * Reopen semantics: the page-level mutations invalidate ['users'], which
 * marks the disabled detail queries invalidated WITHOUT refetching them
 * (enabled: false — react-query never refetches those automatically, and
 * the observer's `isStale` is pinned false for disabled queries). So the
 * open trigger reads the query STORE state (getQueryState) instead: fetch
 * when there is no data, the entry is invalidated, or it is older than
 * DETAIL_STALE_MS — otherwise a toggle (e.g. disable account) would keep
 * rendering the previous state until a full page reload.
 */
import { MoreOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MenuProps } from 'antd';
import { Button, Dropdown } from 'antd';
import { useIntl } from 'react-intl';
import { getUserById } from '@/services/tb/user';
import type { User } from '@/types/tb';
import { useAuthority } from './use-authority';

/** How long a lazily fetched row detail is reused before a refresh. */
const DETAIL_STALE_MS = 15_000;

export interface UserRowMenuProps {
  user: User;
  onEdit: (user: User) => void;
  onDisplayActivationLink: (user: User) => void;
  onResendActivation: (user: User) => void;
  onSetCredentialsEnabled: (user: User, enabled: boolean) => void;
  onDelete: (user: User) => void;
}

function boolInfo(user: User | undefined, key: string): boolean | undefined {
  const value = user?.additionalInfo?.[key];
  return typeof value === 'boolean' ? value : undefined;
}

export function UserRowMenu({
  user,
  onEdit,
  onDisplayActivationLink,
  onResendActivation,
  onSetCredentialsEnabled,
  onDelete,
}: UserRowMenuProps) {
  const { formatMessage } = useIntl();
  const { userId: sessionUserId } = useAuthority();
  const queryClient = useQueryClient();
  const isSelf = user.id.id === sessionUserId;

  const detailQuery = useQuery({
    queryKey: ['users', 'detail', user.id.id],
    queryFn: () => getUserById(user.id.id),
    enabled: false,
    staleTime: DETAIL_STALE_MS,
  });

  const detail = detailQuery.data;
  // List rows carry no activation state (the backend injects it only on
  // GET /api/user/{id}); fall back to the row's own additionalInfo just in
  // case a previous detail fetch populated the query cache.
  const activated =
    boolInfo(detail, 'userActivated') ?? boolInfo(user, 'userActivated');
  const credentialsEnabled =
    boolInfo(detail, 'userCredentialsEnabled') ??
    boolInfo(user, 'userCredentialsEnabled');

  const items: NonNullable<MenuProps['items']> = [
    {
      key: 'edit',
      label: formatMessage({
        id: 'pages.users.list.actionEdit',
        defaultMessage: 'Edit',
      }),
      onClick: () => onEdit(user),
    },
  ];

  if (activated === undefined) {
    items.push({
      key: 'account-state-loading',
      disabled: true,
      label: formatMessage({
        id: 'pages.users.list.actionLoadingAccountState',
        defaultMessage: 'Loading account state…',
      }),
    });
  } else if (!activated) {
    items.push(
      {
        key: 'displayActivationLink',
        label: formatMessage({
          id: 'pages.users.list.actionDisplayActivationLink',
          defaultMessage: 'Display activation link',
        }),
        onClick: () => onDisplayActivationLink(user),
      },
      {
        key: 'resendActivation',
        label: formatMessage({
          id: 'pages.users.list.actionResendActivation',
          defaultMessage: 'Resend activation',
        }),
        onClick: () => onResendActivation(user),
      },
    );
  } else {
    items.push({
      key: 'toggleAccount',
      label: formatMessage({
        id: credentialsEnabled
          ? 'pages.users.list.actionDisableAccount'
          : 'pages.users.list.actionEnableAccount',
        defaultMessage: credentialsEnabled
          ? 'Disable user account'
          : 'Enable user account',
      }),
      onClick: () => onSetCredentialsEnabled(user, !credentialsEnabled),
    });
  }

  if (!isSelf) {
    items.push({
      key: 'delete',
      danger: true,
      label: formatMessage({
        id: 'pages.users.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      onClick: () => onDelete(user),
    });
  }

  return (
    <Dropdown
      trigger={['click']}
      menu={{ items }}
      onOpenChange={(next) => {
        if (!next || detailQuery.isFetching) {
          return;
        }
        const state = queryClient.getQueryState([
          'users',
          'detail',
          user.id.id,
        ]);
        const expired =
          !!state?.data && Date.now() - state.dataUpdatedAt > DETAIL_STALE_MS;
        if (!state?.data || state.isInvalidated || expired) {
          void detailQuery.refetch();
        }
      }}
    >
      <Button
        type="text"
        size="small"
        icon={<MoreOutlined />}
        title={formatMessage({
          id: 'pages.users.list.moreActions',
          defaultMessage: 'More actions',
        })}
      />
    </Dropdown>
  );
}
