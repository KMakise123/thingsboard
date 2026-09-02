/**
 * Alarm assignee cell + reassign popover (spec 3.6).
 *
 * The cell renders the assignee display name (ui-ngx avatar+name cell,
 * AntD-ized as text); when writable, clicking it opens the ui-ngx
 * tb-alarm-assignee-select panel parity: an "unassigned" option, an
 * "assigned to me" shortcut and the authority-scoped user list. The
 * candidate source follows ui-ngx's fetchUsersByQuery — GET /api/users
 * resolves the scope server-side (TA → tenant users, CU → own customer's
 * users), searched with the same 50-row page.
 */
import { useQuery } from '@tanstack/react-query';
import { Button, Divider, Input, Popover, Typography } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  type AlarmRow,
  alarmAssigneeName,
} from '@/components/entities/detail/alarm-format';
import { tokenStore } from '@/core/auth/token-store';
import { getUsers } from '@/services/tb/user';

const SEARCH_DEBOUNCE_MS = 300;

export function AlarmAssigneeCell({
  alarm,
  onAssign,
}: {
  alarm: AlarmRow;
  /** Called with the picked user id, or null to unassign. */
  onAssign?: (assigneeId: string | null) => void;
}) {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const name = alarmAssigneeName(alarm);
  const writable = !!onAssign;

  const usersQuery = useQuery({
    queryKey: ['alarm-assignee-users', search],
    queryFn: () =>
      getUsers({
        pageSize: 50,
        page: 0,
        textSearch: search || undefined,
        sortOrder: { property: 'email', direction: 'ASC' },
      }),
    enabled: open,
  });

  // "Assigned to me" needs the session user id — the JWT claim, same source
  // as the page-level authority reader.
  const myUserId = useMemo(() => tokenStore.decodeTokenClaims()?.userId, []);

  const pick = (assigneeId: string | null) => {
    setOpen(false);
    onAssign?.(assigneeId);
  };

  const label =
    name ||
    formatMessage({
      id: 'pages.alarms.filter.unassigned',
      defaultMessage: 'Unassigned',
    });

  // Plain truncate (not Typography ellipsis): the measurement-based ellipsis
  // re-loops in happy-dom tests and adds nothing over CSS truncation here.
  const cellText = <span className="block max-w-36 truncate">{label}</span>;

  if (!writable) {
    return cellText;
  }

  const userRows = usersQuery.data?.data ?? [];

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      placement="bottomLeft"
      content={
        <div className="flex w-64 flex-col gap-1">
          <Input
            size="small"
            allowClear
            value={searchInput}
            placeholder={formatMessage({
              id: 'pages.alarms.filter.searchUser',
              defaultMessage: 'Search user',
            })}
            onChange={(event) => {
              const value = event.target.value;
              setSearchInput(value);
              clearTimeout(timer.current);
              timer.current = setTimeout(
                () => setSearch(value.trim()),
                SEARCH_DEBOUNCE_MS,
              );
            }}
          />
          <Divider className="!my-1" />
          <Button
            size="small"
            type="text"
            className="!justify-start"
            onClick={() => pick(null)}
          >
            {formatMessage({
              id: 'pages.alarms.filter.unassigned',
              defaultMessage: 'Unassigned',
            })}
          </Button>
          {myUserId && (
            <Button
              size="small"
              type="text"
              className="!justify-start"
              onClick={() => pick(myUserId)}
            >
              {formatMessage({
                id: 'pages.alarms.filter.assignedToMe',
                defaultMessage: 'Assigned to me',
              })}
            </Button>
          )}
          <Divider className="!my-1" />
          <div className="max-h-56 overflow-auto">
            {userRows.map((user) => (
              <Button
                key={user.id.id}
                size="small"
                type="text"
                className="!justify-start"
                onClick={() => pick(user.id.id)}
              >
                {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
                  user.email}
              </Button>
            ))}
            {!usersQuery.isPending && userRows.length === 0 && (
              <Typography.Text type="secondary" className="px-2 text-xs">
                {formatMessage({
                  id: 'pages.alarms.filter.noUsers',
                  defaultMessage: 'No users found',
                })}
              </Typography.Text>
            )}
          </div>
        </div>
      }
    >
      <Button type="text" size="small" className="!px-1">
        {cellText}
      </Button>
    </Popover>
  );
}
