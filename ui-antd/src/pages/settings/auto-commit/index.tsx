/**
 * System settings → Auto-commit page (M14 wave-3, R23, spec 6.3-6 后半 /
 * 6.3-7, TENANT only by route access, ui-ngx auto-commit-admin-settings
 * parity).
 *
 * Two-stage gate (ngx @if(hasRepository)): no repository configured → the
 * SHARED RepositorySettingsForm (R22, detailsMode — not a copy); configured
 * → the per-entity-type panel. The panel edits the tenant-wide
 * entityType → config map as plain component state (ngx expansion-panel
 * rows): branch free-input (empty = the repository default branch),
 * saveCredentials only for DEVICE, saveCalculatedFields only for the
 * CF-capable types, whole-table disable + hint while the repository is
 * read-only, add/remove per row and remove-all. NO syncStrategy here (that
 * belongs to the manual complex-create panel). An EMPTY saved map DELETEs
 * the settings object (v1 AutoCommitCard semantics).
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  Checkbox,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import RepositorySettingsForm from '@/pages/version-control/components/repository-settings-form';
import {
  type AutoVersionCreateConfig,
  deleteAutoCommitSettings,
  getAutoCommitSettings,
  getRepositorySettingsInfo,
  saveAutoCommitSettings,
} from '@/services/tb/version-control';
import { EntityType } from '@/types/tb/entity';
import {
  AUTO_COMMIT_DEFAULT_CONFIG,
  type AutoCommitRow,
  availableEntityTypes,
  ENTITY_TYPE_LABEL_KEYS,
  TYPES_WITH_CALCULATED_FIELDS,
  toAutoCommitRows,
  toAutoCommitSettings,
} from './data';

const AUTOCOMMIT_QUERY_KEY = ['vc-autocommit-settings'] as const;

export default function SettingsAutoCommitPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  // hasRepository 状态源 (contract #11): the same query key the shared form
  // invalidates — configuring a repository inside this gate flips the view.
  const infoQuery = useQuery({
    queryKey: ['vc-repo-info'],
    queryFn: getRepositorySettingsInfo,
  });
  const settingsQuery = useQuery({
    queryKey: AUTOCOMMIT_QUERY_KEY,
    queryFn: getAutoCommitSettings,
    // GET /api/admin/autoCommitSettings 404s when unconfigured — the
    // service already degrades that to null (empty map).
    enabled: infoQuery.data?.configured === true,
  });
  const settings = settingsQuery.data ?? null;
  const readOnly = infoQuery.data?.readOnly === true;

  const [rows, setRows] = useState<Array<AutoCommitRow>>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settingsQuery.isSuccess) {
      setRows(toAutoCommitRows(settings));
      setDirty(false);
    }
  }, [settings, settingsQuery.isSuccess]);

  const updateRows = (next: Array<AutoCommitRow>) => {
    setRows(next);
    setDirty(true);
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: AUTOCOMMIT_QUERY_KEY });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const map = toAutoCommitSettings(rows);
      // Empty map → DELETE (v1 AutoCommitCard semantics: POST-ing `{}` would
      // re-create the settings instead of disabling auto-commit).
      if (Object.keys(map).length === 0) {
        await deleteAutoCommitSettings();
        return;
      }
      await saveAutoCommitSettings(map);
    },
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.autoCommit.toastSaved',
          defaultMessage: 'Auto-commit settings saved.',
        }),
      );
      setDirty(false);
      void settingsQuery.refetch();
      invalidate();
    },
    onError: (error) => {
      // Illegal branch names surface the backend 400 verbatim (branch
      // validation runs before any ACL/repository work — contract #13).
      void message.error(serverErrorText(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAutoCommitSettings,
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.autoCommit.toastDeleted',
          defaultMessage: 'Auto-commit settings deleted.',
        }),
      );
      setDirty(false);
      void settingsQuery.refetch();
      invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  if (infoQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (!infoQuery.data?.configured) {
    return (
      <div className="flex flex-col gap-4">
        <Alert
          type="info"
          showIcon
          title={formatMessage({
            id: 'pages.settings.autoCommit.gateHint',
            defaultMessage:
              'Configure a version-control repository first to manage auto-commit settings.',
          })}
        />
        <RepositorySettingsForm detailsMode />
      </div>
    );
  }

  const available = availableEntityTypes(rows);

  const patchRow = (index: number, patch: Partial<AutoCommitRow>) => {
    const next = [...rows];
    next[index] = { ...rows[index], ...patch };
    updateRows(next);
  };

  const patchConfig = (
    index: number,
    patch: Partial<AutoVersionCreateConfig>,
  ) => {
    const next = [...rows];
    next[index] = {
      ...rows[index],
      config: { ...rows[index].config, ...patch },
    };
    updateRows(next);
  };

  const confirmDeleteSettings = () => {
    modal.confirm({
      title: formatMessage({
        id: 'pages.settings.autoCommit.deleteConfirmTitle',
        defaultMessage: 'Are you sure you want to delete auto-commit settings?',
      }),
      content: formatMessage({
        id: 'pages.settings.autoCommit.deleteConfirmText',
        defaultMessage:
          'Be careful, after the confirmation the auto-commit settings will be removed and auto-commit will be disabled for all entities.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.settings.autoCommit.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutate(),
    });
  };

  return (
    <Card
      title={formatMessage({
        id: 'pages.settings.autoCommit.title',
        defaultMessage: 'Auto-commit settings',
      })}
      loading={settingsQuery.isPending}
    >
      <fieldset disabled={readOnly} className="m-0 border-0 p-0">
        <legend className="mb-3 text-base font-medium">
          {formatMessage({
            id: 'pages.settings.autoCommit.entities',
            defaultMessage: 'Auto-commit entities',
          })}
        </legend>
        {rows.length === 0 && (
          <Typography.Text type="secondary" className="mb-3 block">
            {formatMessage({
              id: 'pages.settings.autoCommit.noEntitiesPrompt',
              defaultMessage: 'No entities configured for auto-commit',
            })}
          </Typography.Text>
        )}
        <div className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const entityType = row.entityType;
            const config = row.config;
            return (
              <Card size="small" key={entityType ?? 'new'}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-52">
                    <Typography.Text type="secondary" className="text-xs">
                      {formatMessage({
                        id: 'pages.settings.autoCommit.entityTypeLabel',
                        defaultMessage: 'Entity type',
                      })}
                    </Typography.Text>
                    <Select<EntityType>
                      className="mt-1 w-full"
                      value={entityType}
                      options={availableEntityTypes(rows, entityType).map(
                        (type) => ({
                          value: type,
                          label: formatMessage({
                            id: ENTITY_TYPE_LABEL_KEYS[type],
                            defaultMessage: type,
                          }),
                        }),
                      )}
                      onChange={(value) =>
                        patchRow(index, { entityType: value })
                      }
                    />
                  </div>
                  <div className="min-w-52">
                    <Typography.Text type="secondary" className="text-xs">
                      {formatMessage({
                        id: 'pages.settings.autoCommit.branch',
                        defaultMessage: 'Branch',
                      })}
                    </Typography.Text>
                    <AutoComplete
                      className="mt-1 w-full"
                      allowClear
                      value={config.branch}
                      placeholder={formatMessage({
                        id: 'pages.settings.autoCommit.branchPlaceholder',
                        defaultMessage: 'Default (repository default branch)',
                      })}
                      onChange={(value) =>
                        patchConfig(index, { branch: value ?? '' })
                      }
                    />
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-4 pt-5">
                    {entityType === EntityType.DEVICE && (
                      <Checkbox
                        checked={config.saveCredentials}
                        onChange={(event) =>
                          patchConfig(index, {
                            saveCredentials: event.target.checked,
                          })
                        }
                      >
                        {formatMessage({
                          id: 'pages.settings.autoCommit.saveCredentials',
                          defaultMessage: 'Export credentials',
                        })}
                      </Checkbox>
                    )}
                    <Checkbox
                      checked={config.saveAttributes}
                      onChange={(event) =>
                        patchConfig(index, {
                          saveAttributes: event.target.checked,
                        })
                      }
                    >
                      {formatMessage({
                        id: 'pages.settings.autoCommit.saveAttributes',
                        defaultMessage: 'Export attributes',
                      })}
                    </Checkbox>
                    <Checkbox
                      checked={config.saveRelations}
                      onChange={(event) =>
                        patchConfig(index, {
                          saveRelations: event.target.checked,
                        })
                      }
                    >
                      {formatMessage({
                        id: 'pages.settings.autoCommit.saveRelations',
                        defaultMessage: 'Export relations',
                      })}
                    </Checkbox>
                    {entityType &&
                      TYPES_WITH_CALCULATED_FIELDS.has(entityType) && (
                        <Checkbox
                          checked={config.saveCalculatedFields}
                          onChange={(event) =>
                            patchConfig(index, {
                              saveCalculatedFields: event.target.checked,
                            })
                          }
                        >
                          {formatMessage({
                            id: 'pages.settings.autoCommit.saveCalculatedFields',
                            defaultMessage:
                              'Export calculated fields and alarm rules',
                          })}
                        </Checkbox>
                      )}
                    <div className="flex-1" />
                    <Button
                      danger
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      title={formatMessage({
                        id: 'pages.settings.autoCommit.removeEntityType',
                        defaultMessage: 'Remove',
                      })}
                      aria-label={formatMessage({
                        id: 'pages.settings.autoCommit.removeEntityType',
                        defaultMessage: 'Remove',
                      })}
                      onClick={() =>
                        updateRows(
                          rows.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Button
            icon={<PlusOutlined />}
            disabled={available.length === 0}
            onClick={() =>
              updateRows([
                ...rows,
                {
                  entityType: available[0],
                  config: { ...AUTO_COMMIT_DEFAULT_CONFIG },
                },
              ])
            }
          >
            {formatMessage({
              id: 'pages.settings.autoCommit.addEntityType',
              defaultMessage: 'Add entity type',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            <Button disabled={rows.length === 0} onClick={() => updateRows([])}>
              {formatMessage({
                id: 'pages.settings.autoCommit.removeAll',
                defaultMessage: 'Remove all',
              })}
            </Button>
          </Space>
        </div>
      </fieldset>
      {readOnly && (
        <Alert
          className="mt-3"
          type="warning"
          showIcon
          title={formatMessage({
            id: 'pages.settings.autoCommit.readOnlyHint',
            defaultMessage:
              "Auto-commit feature doesn't work with enabled read-only option in Repository settings.",
          })}
        />
      )}
      <div className="flex items-center justify-end gap-2 pt-4">
        <Button
          danger
          disabled={!settings || readOnly || deleteMutation.isPending}
          onClick={confirmDeleteSettings}
        >
          {formatMessage({
            id: 'pages.settings.autoCommit.delete',
            defaultMessage: 'Delete',
          })}
        </Button>
        <div className="flex-1" />
        <Button
          disabled={!dirty || readOnly}
          loading={saveMutation.isPending}
          type="primary"
          onClick={() => saveMutation.mutate()}
        >
          {formatMessage({
            id: 'pages.settings.common.save',
            defaultMessage: 'Save',
          })}
        </Button>
      </div>
    </Card>
  );
}
