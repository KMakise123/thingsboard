/**
 * FiltersDialog (spec §3.5, ui-ngx filters-dialog + filter-dialog) — dual
 * mode behind one host id:
 *
 *  - LIST mode (no payload): the dashboard filter list with add / edit /
 *    delete; add + edit reuse this same host id through a local DialogHost
 *    (the panel-local pattern). Delete is blocked while a widget's
 *    `alarmFilterConfig` still references the filter; each action commits
 *    ONE group (upsertFilter / removeFilter recipes).
 *
 *  - SINGLE mode (payload `{filterId?, onSaved?}`): the single-filter
 *    editor the widget panel triggers (alarm filter closure). Fields per
 *    ui-ngx filter-dialog: filter name (required + unique), editable flag,
 *    keyFilters. The keyFilters predicate builder (ui-ngx key-filter-list)
 *    is passthrough here — v2 stores the raw predicate array via a JSON
 *    textarea (honest copy; the predicates are consumed verbatim by the
 *    alarms table, spec §3.5 note). Save = ONE upsert group + onSaved.
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  List,
  Modal,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useIntl } from 'react-intl';

import {
  removeFilter,
  upsertFilter,
  writeDraft,
} from '@/core/editor/dashboard-draft';
import type {
  DashboardConfiguration,
  DashboardFilter,
} from '@/types/tb/dashboard';
import type { EditorDialogProps } from './host';
import { DialogHost, useEditorDialogs } from './host';
import { useDialogSession } from './use-dialog-session';

export interface FilterEditorPayload {
  filterId?: string;
  onSaved?: (saved?: unknown) => void;
}

/** Widget configs referencing `filterId` via alarmFilterConfig. */
export function filterIsReferenced(
  configuration: DashboardConfiguration,
  filterId: string,
): boolean {
  return Object.values(configuration.widgets ?? {}).some(
    (widget) =>
      typeof widget.config?.alarmFilterConfig === 'string' &&
      widget.config.alarmFilterConfig === filterId,
  );
}

interface FilterFormValues {
  filter: string;
  editable: boolean;
  keyFiltersJson: string;
}

function parseKeyFilters(json: string): Array<Record<string, unknown>> | null {
  if (!json.trim()) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed as Array<Record<string, unknown>>;
    }
    return null;
  } catch {
    return null;
  }
}

export function FiltersDialog({ open, payload, onClose }: EditorDialogProps) {
  const { formatMessage } = useIntl();
  const session = useDialogSession();
  const nestedDialogs = useEditorDialogs();
  const [form] = Form.useForm<FilterFormValues>();
  const configuration = session.current;

  const scope = (payload ?? null) as FilterEditorPayload | null;
  const editorMode = scope !== null;
  const existing = scope?.filterId
    ? configuration.filters?.[scope.filterId]
    : undefined;

  const filters: DashboardFilter[] = Object.values(configuration.filters ?? {});

  const saveEditor = (values: FilterFormValues): void => {
    const keyFilters = parseKeyFilters(values.keyFiltersJson);
    if (keyFilters === null) {
      form.setFields([
        {
          name: 'keyFiltersJson',
          errors: [
            formatMessage({
              id: 'editor.dashboard.dialogs.filters.keyFiltersInvalid',
              defaultMessage: 'Key filters must be a JSON array.',
            }),
          ],
        },
      ]);
      return;
    }
    const id = existing?.id ?? globalThis.crypto.randomUUID();
    const filter: DashboardFilter = {
      id,
      filter: values.filter.trim(),
      editable: values.editable,
      keyFilters,
    };
    writeDraft(session, upsertFilter(filter));
    scope?.onSaved?.(filter);
    onClose();
  };

  const editorForm = (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        filter: existing?.filter ?? '',
        editable: existing?.editable ?? true,
        keyFiltersJson: existing?.keyFilters
          ? JSON.stringify(existing.keyFilters, null, 2)
          : '',
      }}
    >
      <Form.Item
        name="filter"
        label={formatMessage({
          id: 'editor.dashboard.dialogs.filters.name',
          defaultMessage: 'Filter name',
        })}
        rules={[
          {
            required: true,
            message: formatMessage({
              id: 'editor.dashboard.dialogs.filters.nameRequired',
              defaultMessage: 'Filter name is required.',
            }),
          },
          {
            validator: (_rule, value: string) => {
              const name = (value ?? '').trim();
              const duplicate = filters.some(
                (row) => row.filter === name && row.id !== existing?.id,
              );
              return duplicate
                ? Promise.reject(
                    new Error(
                      formatMessage({
                        id: 'editor.dashboard.dialogs.filters.nameExists',
                        defaultMessage: 'Filter name already exists.',
                      }),
                    ),
                  )
                : Promise.resolve();
            },
          },
        ]}
      >
        <Input data-testid="filter-name" />
      </Form.Item>
      <Form.Item
        name="editable"
        label={formatMessage({
          id: 'editor.dashboard.dialogs.filters.editable',
          defaultMessage: 'Editable by users',
        })}
        valuePropName="checked"
      >
        <Switch data-testid="filter-editable" />
      </Form.Item>
      <Form.Item
        name="keyFiltersJson"
        label={formatMessage({
          id: 'editor.dashboard.dialogs.filters.keyFilters',
          defaultMessage: 'Key filters (JSON)',
        })}
      >
        <Input.TextArea rows={6} data-testid="filter-key-filters" />
      </Form.Item>
    </Form>
  );

  if (editorMode) {
    return (
      <Modal
        open={open}
        title={formatMessage({
          id: 'editor.dashboard.dialogs.filters.editorTitle',
          defaultMessage: 'Filter',
        })}
        okText={formatMessage({
          id: 'editor.common.save',
          defaultMessage: 'Save',
        })}
        cancelText={formatMessage({
          id: 'editor.common.cancel',
          defaultMessage: 'Cancel',
        })}
        okButtonProps={{ 'data-testid': 'filter-ok' }}
        cancelButtonProps={{ 'data-testid': 'filter-cancel' }}
        onOk={() => {
          void form
            .validateFields()
            .then(saveEditor)
            .catch(() => undefined);
        }}
        onCancel={onClose}
        destroyOnHidden
        maskClosable={false}
        data-testid="filter-editor-dialog"
      >
        {editorForm}
      </Modal>
    );
  }

  const remove = (filter: DashboardFilter): void => {
    if (filterIsReferenced(configuration, filter.id)) {
      return;
    }
    writeDraft(session, removeFilter(filter.id));
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.dashboard.dialogs.filters.title',
        defaultMessage: 'Filters',
      })}
      footer={
        <Button type="primary" data-testid="filters-close" onClick={onClose}>
          {formatMessage({
            id: 'editor.common.cancel',
            defaultMessage: 'Cancel',
          })}
        </Button>
      }
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="filters-dialog"
    >
      <Button
        icon={<PlusOutlined />}
        style={{ marginBottom: 12 }}
        data-testid="filters-add"
        onClick={() => nestedDialogs.openDialog('filters', {})}
      >
        {formatMessage({
          id: 'editor.dashboard.dialogs.filters.add',
          defaultMessage: 'Add filter',
        })}
      </Button>
      <List
        size="small"
        dataSource={filters}
        locale={{
          emptyText: formatMessage({
            id: 'editor.dashboard.dialogs.filters.empty',
            defaultMessage: 'No filters configured.',
          }),
        }}
        renderItem={(filter) => {
          const referenced = filterIsReferenced(configuration, filter.id);
          return (
            <List.Item
              actions={[
                <Tooltip
                  key="edit"
                  title={formatMessage({
                    id: 'editor.dashboard.dialogs.filters.edit',
                    defaultMessage: 'Edit filter',
                  })}
                >
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    data-testid={`filters-edit-${filter.id}`}
                    onClick={() =>
                      nestedDialogs.openDialog('filters', {
                        filterId: filter.id,
                      })
                    }
                  />
                </Tooltip>,
                <Tooltip
                  key="delete"
                  title={
                    referenced
                      ? formatMessage({
                          id: 'editor.dashboard.dialogs.filters.inUse',
                          defaultMessage:
                            'The filter is used by widgets and cannot be deleted.',
                        })
                      : formatMessage({
                          id: 'editor.dashboard.dialogs.filters.remove',
                          defaultMessage: 'Delete filter',
                        })
                  }
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={referenced}
                    data-testid={`filters-remove-${filter.id}`}
                    onClick={() => remove(filter)}
                  />
                </Tooltip>,
              ]}
            >
              <span>
                <Typography.Text strong style={{ marginRight: 8 }}>
                  {filter.filter}
                </Typography.Text>
                {filter.editable ? (
                  <Tag>
                    {formatMessage({
                      id: 'editor.dashboard.dialogs.filters.editable',
                      defaultMessage: 'Editable by users',
                    })}
                  </Tag>
                ) : null}
              </span>
            </List.Item>
          );
        }}
      />
      <DialogHost controller={nestedDialogs} />
    </Modal>
  );
}
