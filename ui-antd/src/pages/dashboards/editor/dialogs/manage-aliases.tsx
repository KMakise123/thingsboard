/**
 * ManageAliasesDialog (spec §3.5, ui-ngx entity-aliases-dialog): alias list
 * with add / edit / delete. Add + edit reuse the single-alias dialog
 * (frozen `alias` host id, payload `{aliasId?, onSaved?}`) mounted through
 * this dialog's local DialogHost (the panel-local pattern), so the list
 * stays live after each edit. Delete is blocked while any widget still
 * references the alias (TB parity: widgets keep the alias id in their
 * datasource / alarm-source config); each delete commits ONE group via the
 * removeEntityAlias recipe.
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, List, Modal, Tag, Tooltip, Typography } from 'antd';
import { useIntl } from 'react-intl';

import type { DashboardConfiguration, EntityAlias } from '@/types/tb/dashboard';
import type { Widget } from '@/types/tb/widget';
import type { EditorDialogProps } from './host';
import { DialogHost, useEditorDialogs } from './host';
import { useDialogSession } from './use-dialog-session';

/** Widget configs that reference `aliasId` (datasources + alarm source). */
export function aliasIsReferenced(
  configuration: DashboardConfiguration,
  aliasId: string,
): boolean {
  return Object.values(configuration.widgets ?? {}).some((widget: Widget) => {
    const datasources = widget.config?.datasources ?? [];
    if (datasources.some((source) => source.entityAliasId === aliasId)) {
      return true;
    }
    const alarmSource = widget.config?.alarmSource as
      | { datasources?: Array<{ entityAliasId?: string }> }
      | undefined;
    return Boolean(
      alarmSource?.datasources?.some(
        (source) => source.entityAliasId === aliasId,
      ),
    );
  });
}

export function ManageAliasesDialog({ open, onClose }: EditorDialogProps) {
  const { formatMessage } = useIntl();
  const session = useDialogSession();
  const nestedDialogs = useEditorDialogs();
  const configuration = session.current;

  const aliases: EntityAlias[] = Object.values(configuration.entityAliases);

  const remove = (alias: EntityAlias): void => {
    if (aliasIsReferenced(configuration, alias.id)) {
      return;
    }
    session.write('remove entity alias', (draft): void => {
      delete draft.entityAliases[alias.id];
    });
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.dashboard.dialogs.aliases.title',
        defaultMessage: 'Entity aliases',
      })}
      footer={
        <Button type="primary" data-testid="aliases-close" onClick={onClose}>
          {formatMessage({
            id: 'editor.common.cancel',
            defaultMessage: 'Cancel',
          })}
        </Button>
      }
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="manage-aliases-dialog"
    >
      <Button
        icon={<PlusOutlined />}
        style={{ marginBottom: 12 }}
        data-testid="aliases-add"
        onClick={() => nestedDialogs.openDialog('alias', {})}
      >
        {formatMessage({
          id: 'editor.dashboard.dialogs.aliases.add',
          defaultMessage: 'Add alias',
        })}
      </Button>
      <List
        size="small"
        dataSource={aliases}
        locale={{
          emptyText: formatMessage({
            id: 'editor.dashboard.dialogs.aliases.empty',
            defaultMessage: 'No entity aliases configured.',
          }),
        }}
        renderItem={(alias) => {
          const referenced = aliasIsReferenced(configuration, alias.id);
          return (
            <List.Item
              actions={[
                <Tooltip
                  key="edit"
                  title={formatMessage({
                    id: 'editor.dashboard.dialogs.aliases.edit',
                    defaultMessage: 'Edit alias',
                  })}
                >
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    data-testid={`aliases-edit-${alias.id}`}
                    onClick={() =>
                      nestedDialogs.openDialog('alias', { aliasId: alias.id })
                    }
                  />
                </Tooltip>,
                <Tooltip
                  key="delete"
                  title={
                    referenced
                      ? formatMessage({
                          id: 'editor.dashboard.dialogs.aliases.inUse',
                          defaultMessage:
                            'The alias is used by widgets and cannot be deleted.',
                        })
                      : formatMessage({
                          id: 'editor.dashboard.dialogs.aliases.remove',
                          defaultMessage: 'Delete alias',
                        })
                  }
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={referenced}
                    data-testid={`aliases-remove-${alias.id}`}
                    onClick={() => remove(alias)}
                  />
                </Tooltip>,
              ]}
            >
              <span>
                <Typography.Text strong style={{ marginRight: 8 }}>
                  {alias.alias}
                </Typography.Text>
                <Tag>{String(alias.filter?.type ?? '')}</Tag>
              </span>
            </List.Item>
          );
        }}
      />
      <DialogHost controller={nestedDialogs} />
    </Modal>
  );
}
