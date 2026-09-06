/**
 * Complex "Create entities version" modal (M14 wave-6, R20, spec 6.2-4 +
 * 6.2-7) — the ngx tb-complex-version-create popover: branch (free input —
 * committing to a new name creates the branch), version name, the
 * request-level sync strategy (required, MERGE default, with the
 * MERGE/OVERWRITE hints) and the 16-type entity-types panel.
 *
 * Result flow (6.2-7): POST → requestId → the wave-1 poller. Both channels
 * surface in place — the task `error` field AND HTTP errors; a done
 * terminal with added+modified=0 reads "nothing to commit". Finalize
 * invalidates the branch cache (the commit may have created the branch).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import type {
  BranchInfo,
  EntityTypeSyncStrategy,
  VersionCreationResult,
} from '@/services/tb/version-control';
import {
  awaitVersionCreateResult,
  saveEntitiesVersion,
} from '@/services/tb/version-control';
import BranchSelect from './branch-select';
import EntityTypesCreateForm from './entity-types-create-form';
import {
  createDefaultEntityTypeCreateRows,
  type EntityTypeCreateRow,
  toComplexCreateRequest,
} from './vc-data';

const VERSION_NAME_PATTERN = /(?:.|\s)*\S(?:.|\s)*/;

export default function ComplexCreateModal({
  open,
  branch,
  branches,
  readOnly,
  onClose,
  onCommitted,
}: {
  open: boolean;
  /** The versions table's current branch — the form's starting value. */
  branch: string;
  branches: Array<BranchInfo>;
  readOnly: boolean;
  onClose: () => void;
  /** Fired when a request reached a terminal (refresh table + branches). */
  onCommitted: () => void;
}) {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{
    branch: string;
    versionName: string;
    syncStrategy: EntityTypeSyncStrategy;
  }>();
  const [rows, setRows] = useState<Array<EntityTypeCreateRow>>([]);
  const [rowError, setRowError] = useState('');
  const [result, setResult] = useState<VersionCreationResult | null>(null);
  const [httpError, setHttpError] = useState('');
  const syncStrategy = Form.useWatch('syncStrategy', form);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ syncStrategy: 'MERGE' });
      setRows(createDefaultEntityTypeCreateRows());
      setRowError('');
      setResult(null);
      setHttpError('');
    }
  }, [open, form]);

  const commitMutation = useMutation({
    mutationFn: async (values: {
      versionName: string;
      syncStrategy: EntityTypeSyncStrategy;
    }) => {
      const branchValue = form.getFieldValue('branch') as string;
      const request = toComplexCreateRequest({
        branch: branchValue,
        versionName: values.versionName,
        syncStrategy: values.syncStrategy,
        rows,
      });
      const requestId = await saveEntitiesVersion(request);
      return awaitVersionCreateResult(requestId);
    },
    onSuccess: (mutationResult) => {
      setResult(mutationResult);
      onCommitted();
      void queryClient.invalidateQueries({ queryKey: ['vc-branches'] });
    },
    onError: (error) => {
      // HTTP channel: the POST or the status poll failed outright.
      setHttpError(serverErrorText(error));
      onCommitted();
      void queryClient.invalidateQueries({ queryKey: ['vc-branches'] });
    },
  });

  const submit = async () => {
    setHttpError('');
    setRowError('');
    const valid = await form.validateFields().then(
      () => true,
      () => false,
    );
    const branchValue = (form.getFieldValue('branch') as string) ?? '';
    if (!branchValue.trim()) {
      form.setFields([
        {
          name: 'branch',
          errors: [
            formatMessage({
              id: 'pages.versionControl.branchRequired',
              defaultMessage: 'Branch is required.',
            }),
          ],
        },
      ]);
      return;
    }
    // Hand-picked subsets must name at least one entity (ngx entityIds
    // required-when-!allEntities validator).
    if (
      rows.some(
        (row) =>
          row.config.allEntities === false &&
          (row.config.entityIds?.length ?? 0) === 0,
      )
    ) {
      setRowError(
        formatMessage({
          id: 'pages.versionControl.complexCreate.entitiesRequired',
          defaultMessage: 'Please specify entities to export',
        }),
      );
      return;
    }
    if (valid) {
      commitMutation.mutate(form.getFieldsValue());
    }
  };

  const running = commitMutation.isPending;
  const nothingToCommit =
    result?.done &&
    !result.error &&
    !result.added &&
    !result.modified &&
    !result.removed;

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.versionControl.complexCreate.title',
        defaultMessage: 'Create entities version',
      })}
      width={880}
      onCancel={onClose}
      cancelText={formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      })}
      okText={
        result
          ? formatMessage({
              id: 'pages.versionControl.close',
              defaultMessage: 'Close',
            })
          : formatMessage({
              id: 'pages.versionControl.createVersion',
              defaultMessage: 'Create version',
            })
      }
      okButtonProps={{ disabled: readOnly && !result && !httpError }}
      onOk={() => {
        if (result || httpError) {
          onClose();
        } else {
          void submit();
        }
      }}
      confirmLoading={running}
      destroyOnHidden
    >
      {result || httpError ? (
        <Flex vertical gap={12} className="py-2">
          {nothingToCommit && (
            <Alert
              type="info"
              showIcon
              message={formatMessage({
                id: 'pages.versionControl.nothingToCommit',
                defaultMessage: 'No changes to commit',
              })}
            />
          )}
          {result?.done && !result.error && !nothingToCommit && (
            <Alert
              type="success"
              showIcon
              message={formatMessage(
                {
                  id: 'pages.versionControl.versionCreateResult',
                  defaultMessage:
                    '{added} added, {modified} modified, {removed} removed.',
                },
                {
                  added: result.added ?? 0,
                  modified: result.modified ?? 0,
                  removed: result.removed ?? 0,
                },
              )}
            />
          )}
          {result?.error && (
            // Task channel: the done terminal carries the failure text.
            <Alert
              type="error"
              showIcon
              message={formatMessage({
                id: 'pages.versionControl.taskFailed',
                defaultMessage: 'Version control request failed',
              })}
              description={result.error}
            />
          )}
          {httpError && (
            <Alert
              type="error"
              showIcon
              message={formatMessage({
                id: 'pages.versionControl.requestFailed',
                defaultMessage: 'Version control request failed',
              })}
              description={httpError}
            />
          )}
        </Flex>
      ) : (
        <Form
          form={form}
          layout="vertical"
          className="pt-2"
          initialValues={{ syncStrategy: 'MERGE' }}
        >
          <Space wrap align="start" size={16}>
            <Form.Item
              name="branch"
              initialValue={branch}
              label={formatMessage({
                id: 'pages.versionControl.branch',
                defaultMessage: 'Branch',
              })}
              className="min-w-56"
            >
              <BranchSelect branches={branches} freeInput />
            </Form.Item>
            <Form.Item
              name="versionName"
              label={formatMessage({
                id: 'pages.versionControl.versionName',
                defaultMessage: 'Version name',
              })}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: formatMessage({
                    id: 'pages.versionControl.versionNameRequired',
                    defaultMessage: 'Version name is required.',
                  }),
                },
                {
                  pattern: VERSION_NAME_PATTERN,
                  message: formatMessage({
                    id: 'pages.versionControl.versionNameRequired',
                    defaultMessage: 'Version name is required.',
                  }),
                },
              ]}
              className="min-w-72 flex-1"
            >
              <Input maxLength={255} />
            </Form.Item>
            <Form.Item
              name="syncStrategy"
              label={formatMessage({
                id: 'pages.versionControl.defaultSyncStrategy',
                defaultMessage: 'Default sync strategy',
              })}
              extra={formatMessage({
                id:
                  syncStrategy === 'OVERWRITE'
                    ? 'pages.versionControl.syncStrategyOverwriteHint'
                    : 'pages.versionControl.syncStrategyMergeHint',
                defaultMessage:
                  'Creates or updates selected entities in the repository. All other repository entities are not modified.',
              })}
              className="min-w-72"
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.versionControl.syncStrategyRequired',
                    defaultMessage: 'Sync strategy is required.',
                  }),
                },
              ]}
            >
              <Select
                options={[
                  {
                    value: 'MERGE',
                    label: formatMessage({
                      id: 'pages.versionControl.syncStrategyMerge',
                      defaultMessage: 'Merge',
                    }),
                  },
                  {
                    value: 'OVERWRITE',
                    label: formatMessage({
                      id: 'pages.versionControl.syncStrategyOverwrite',
                      defaultMessage: 'Overwrite',
                    }),
                  },
                ]}
              />
            </Form.Item>
          </Space>
          {rowError && (
            <Typography.Text type="danger" className="mb-2 block">
              {rowError}
            </Typography.Text>
          )}
          <EntityTypesCreateForm rows={rows} onChange={setRows} />
        </Form>
      )}
    </Modal>
  );
}
