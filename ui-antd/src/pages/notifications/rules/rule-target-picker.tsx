/**
 * Recipient-target picker for the rule wizard (M12 wave 3-B) — RecipientEntitySelect
 * wired to the trigger-type-filtered targets endpoint, plus the inline
 * "create new" entry that opens the shared RecipientDialog and appends the
 * freshly saved target to the selection (ui-ngx createTarget parity
 * :485-506; the saved id comes from a createdTime-DESC head fetch since the
 * shared dialog's onSaved carries no payload).
 */
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'antd';
import { useState } from 'react';
import RecipientDialog from '@/components/notifications/recipient-dialog';
import { RecipientEntitySelect } from '@/components/notifications/recipient-entity-select';
import {
  getNotificationTargetById,
  getNotificationTargets,
  getNotificationTargetsByNotificationType,
} from '@/services/tb/notification';
import type { NotificationType } from '@/types/tb/notification';

export interface TargetPickerWithCreateProps {
  value?: Array<string>;
  onChange?: (value: Array<string>) => void;
  notificationType: NotificationType;
  disabled?: boolean;
  placeholder: string;
  createLabel: string;
}

const PICKER_PAGE_SORT = {
  pageSize: 50,
  page: 0,
  sortOrder: { property: 'name', direction: 'ASC' as const },
};

async function fetchNewestTargetId(): Promise<string | undefined> {
  const head = await getNotificationTargets({
    pageSize: 1,
    page: 0,
    sortOrder: { property: 'createdTime', direction: 'DESC' },
  });
  return head.data[0]?.id.id;
}

export function TargetPickerWithCreate({
  value,
  onChange,
  notificationType,
  disabled,
  placeholder,
  createLabel,
}: TargetPickerWithCreateProps) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const appendNewest = async () => {
    setCreateOpen(false);
    void queryClient.invalidateQueries({
      queryKey: ['notifications', 'rules', 'targets'],
    });
    try {
      const id = await fetchNewestTargetId();
      if (id && !(value ?? []).includes(id)) {
        onChange?.([...(value ?? []), id]);
      }
    } catch {
      // Head fetch failed — the picker options still refresh via invalidate.
    }
  };

  return (
    <div className="flex w-full items-center gap-1" data-testid="target-picker">
      <div className="min-w-0 flex-1">
        <RecipientEntitySelect
          mode="multiple"
          value={value}
          onChange={(next) => onChange?.(next as Array<string>)}
          queryKey={['notifications', 'rules', 'targets', notificationType]}
          fetchPage={(textSearch) =>
            getNotificationTargetsByNotificationType(notificationType, {
              ...PICKER_PAGE_SORT,
              textSearch: textSearch || undefined,
            })
          }
          toOption={(target) => ({ label: target.name, value: target.id.id })}
          resolveOne={async (id) => {
            const target = await getNotificationTargetById(id);
            return { label: target.name, value: id };
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
      <Button
        type="link"
        size="small"
        className="shrink-0"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setCreateOpen(true);
        }}
      >
        {createLabel}
      </Button>
      <RecipientDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => void appendNewest()}
      />
    </div>
  );
}
