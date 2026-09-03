/**
 * ManageStatesDialog (spec §3.5, ui-ngx manage-dashboard-states-dialog):
 * state list (name / id / root / actions) with add / edit / delete. The
 * nested dashboard-state editor (ui-ngx dashboard-state-dialog) is rendered
 * as an in-dialog second Modal — the frozen host seam carries one dialog at
 * a time, so the nested editor travels inside this component.
 *
 * ui-ngx semantics mirrored exactly:
 *  - id auto-fills from the name (`toLowerCase().replace(/\W/g, '_')`)
 *    until the user touches the id field (add mode only);
 *  - duplicate id / duplicate name are rejected (self-excluded on edit);
 *  - saving a state with root=true clears the flag on every other state;
 *    saving with root=false restores a root when none remains (first key);
 *  - id rename = delete old key + insert new key keeping the layouts;
 *  - the root state cannot be deleted (delete disabled on the root row and
 *    re-guarded in the handler — removeState throws on the root state).
 *
 * Each action commits ONE transaction group (inline labeled recipes — the
 * root-normalization transform is not a dashboard-draft.ts recipe).
 */
import { PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useIntl } from 'react-intl';

import { createDefaultLayouts, getRootStateId } from '@/core/dashboard/model';
import type {
  DashboardConfiguration,
  DashboardLayout,
} from '@/types/tb/dashboard';

import type { EditorDialogProps } from './host';
import { useDialogSession } from './use-dialog-session';

interface StateRow {
  id: string;
  name: string;
  root: boolean;
}

interface StateFormValues {
  name: string;
  id: string;
  root: boolean;
}

/** ui-ngx checkStateName id derivation. */
function stateIdFromName(name: string): string {
  return name.toLowerCase().replace(/\W/g, '_');
}

export function ManageStatesDialog({ open, onClose }: EditorDialogProps) {
  const { formatMessage } = useIntl();
  const session = useDialogSession();
  const configuration = session.current;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [idTouched, setIdTouched] = useState(false);
  const [form] = Form.useForm<StateFormValues>();

  const rootStateId = getRootStateId(configuration.states);
  const rows: StateRow[] = Object.entries(configuration.states).map(
    ([id, state]) => ({ id, name: state.name, root: state.root === true }),
  );

  const commitState = (values: StateFormValues): void => {
    const name = values.name.trim();
    const id = values.id.trim();
    const isAdd = editingId === null;
    session.write(
      isAdd ? 'add state' : 'update state',
      (draft: DashboardConfiguration): void => {
        // Edit: keep the layouts across an id rename (delete old + insert).
        // JSON deep copy — structuredClone cannot read immer draft proxies.
        let layouts: Record<string, DashboardLayout> = {};
        if (!isAdd) {
          layouts = JSON.parse(
            JSON.stringify(draft.states[editingId]?.layouts ?? {}),
          ) as Record<string, DashboardLayout>;
          if (editingId !== id) {
            delete draft.states[editingId];
          }
        }
        draft.states[id] = {
          name,
          root: values.root,
          layouts: isAdd ? createDefaultLayouts() : layouts,
        };
        // ui-ngx saveState root normalization: exclusive root flag, never
        // zero roots (first remaining key wins).
        if (values.root) {
          for (const stateId of Object.keys(draft.states)) {
            if (stateId !== id) {
              draft.states[stateId].root = false;
            }
          }
        } else {
          let rootFound = false;
          for (const state of Object.values(draft.states)) {
            if (state.root) {
              rootFound = true;
              break;
            }
          }
          if (!rootFound) {
            const firstId = Object.keys(draft.states)[0];
            if (firstId !== undefined) {
              draft.states[firstId].root = true;
            }
          }
        }
      },
    );
    setEditorOpen(false);
  };

  const openAdd = (): void => {
    setEditingId(null);
    setIdTouched(false);
    form.setFieldsValue({ name: '', id: '', root: false });
    setEditorOpen(true);
  };

  const openEdit = (row: StateRow): void => {
    setEditingId(row.id);
    setIdTouched(true);
    form.setFieldsValue({ name: row.name, id: row.id, root: row.root });
    setEditorOpen(true);
  };

  const removeStateRow = (row: StateRow): void => {
    if (row.root || row.id === rootStateId) {
      return;
    }
    session.write('remove state', (draft): void => {
      delete draft.states[row.id];
    });
  };

  const columns: ColumnsType<StateRow> = [
    {
      title: formatMessage({
        id: 'editor.dashboard.dialogs.states.name',
        defaultMessage: 'Name',
      }),
      dataIndex: 'name',
    },
    {
      title: formatMessage({
        id: 'editor.dashboard.dialogs.states.id',
        defaultMessage: 'State id',
      }),
      dataIndex: 'id',
    },
    {
      title: formatMessage({
        id: 'editor.dashboard.dialogs.states.root',
        defaultMessage: 'Root',
      }),
      dataIndex: 'root',
      render: (root: boolean) =>
        root
          ? formatMessage({
              id: 'editor.dashboard.dialogs.states.rootYes',
              defaultMessage: 'Root state',
            })
          : '',
    },
    {
      title: formatMessage({
        id: 'editor.dashboard.dialogs.states.actions',
        defaultMessage: 'Actions',
      }),
      key: 'actions',
      render: (_, row) => (
        <span>
          <Button
            size="small"
            style={{ marginRight: 8 }}
            data-testid={`states-edit-${row.id}`}
            onClick={() => openEdit(row)}
          >
            {formatMessage({
              id: 'editor.dashboard.dialogs.states.edit',
              defaultMessage: 'Edit',
            })}
          </Button>
          <Button
            size="small"
            danger
            disabled={row.root || row.id === rootStateId}
            data-testid={`states-remove-${row.id}`}
            onClick={() => removeStateRow(row)}
          >
            {formatMessage({
              id: 'editor.dashboard.dialogs.states.remove',
              defaultMessage: 'Delete',
            })}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.dashboard.dialogs.states.title',
        defaultMessage: 'Manage dashboard states',
      })}
      footer={
        <Button type="primary" data-testid="states-close" onClick={onClose}>
          {formatMessage({
            id: 'editor.common.cancel',
            defaultMessage: 'Cancel',
          })}
        </Button>
      }
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="manage-states-dialog"
    >
      <Button
        icon={<PlusOutlined />}
        style={{ marginBottom: 12 }}
        data-testid="states-add"
        onClick={openAdd}
      >
        {formatMessage({
          id: 'editor.dashboard.dialogs.states.add',
          defaultMessage: 'Add state',
        })}
      </Button>
      <Table<StateRow>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={rows}
        pagination={false}
      />
      <Modal
        open={editorOpen}
        title={
          editingId === null
            ? formatMessage({
                id: 'editor.dashboard.dialogs.states.addTitle',
                defaultMessage: 'Add dashboard state',
              })
            : formatMessage({
                id: 'editor.dashboard.dialogs.states.editTitle',
                defaultMessage: 'Edit dashboard state',
              })
        }
        okText={formatMessage({
          id: 'editor.common.save',
          defaultMessage: 'Save',
        })}
        cancelText={formatMessage({
          id: 'editor.common.cancel',
          defaultMessage: 'Cancel',
        })}
        okButtonProps={{ 'data-testid': 'state-editor-ok' }}
        cancelButtonProps={{ 'data-testid': 'state-editor-cancel' }}
        onOk={() => {
          void form
            .validateFields()
            .then((values) => commitState(values))
            .catch(() => undefined);
        }}
        onCancel={() => setEditorOpen(false)}
        // forceRender (not destroyOnHidden): the form must stay CONNECTED so
        // openAdd/openEdit can push row values into the store before the
        // nested modal becomes visible (antd unconnected-useForm trap).
        forceRender
        maskClosable={false}
        data-testid="state-editor-dialog"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.states.name',
              defaultMessage: 'Name',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'editor.dashboard.dialogs.states.nameRequired',
                  defaultMessage: 'State name is required.',
                }),
              },
              {
                validator: (_rule, value: string) => {
                  const name = (value ?? '').trim();
                  const duplicate = rows.some(
                    (row) =>
                      row.name === name &&
                      (editingId === null || row.id !== editingId),
                  );
                  return duplicate
                    ? Promise.reject(
                        new Error(
                          formatMessage({
                            id: 'editor.dashboard.dialogs.states.nameExists',
                            defaultMessage: 'State name already exists.',
                          }),
                        ),
                      )
                    : Promise.resolve();
                },
              },
            ]}
          >
            <Input
              data-testid="state-editor-name"
              onChange={(event) => {
                if (editingId === null && !idTouched) {
                  form.setFieldValue(
                    'id',
                    stateIdFromName(event.target.value ?? ''),
                  );
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="id"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.states.id',
              defaultMessage: 'State id',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'editor.dashboard.dialogs.states.idRequired',
                  defaultMessage: 'State id is required.',
                }),
              },
              {
                validator: (_rule, value: string) => {
                  const id = (value ?? '').trim();
                  const duplicate = rows.some(
                    (row) =>
                      row.id === id &&
                      (editingId === null || row.id !== editingId),
                  );
                  return duplicate
                    ? Promise.reject(
                        new Error(
                          formatMessage({
                            id: 'editor.dashboard.dialogs.states.idExists',
                            defaultMessage: 'State id already exists.',
                          }),
                        ),
                      )
                    : Promise.resolve();
                },
              },
            ]}
          >
            <Input
              data-testid="state-editor-id"
              onChange={() => setIdTouched(true)}
            />
          </Form.Item>
          <Form.Item name="root" valuePropName="checked">
            <Checkbox data-testid="state-editor-root">
              {formatMessage({
                id: 'editor.dashboard.dialogs.states.isRoot',
                defaultMessage: 'Root state',
              })}
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
}
