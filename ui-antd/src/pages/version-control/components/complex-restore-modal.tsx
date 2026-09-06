/**
 * Complex "Restore entities from version" modal (M14 wave-6, R20,
 * spec 6.2-5 + 6.2-7) — the ngx tb-complex-version-load popover:
 * an entity-types panel (removeOtherEntities DANGEROUS switch gated by the
 * verbatim "remove other entities" confirmation, findExistingEntityByName
 * default true, per-family load flags) + rollbackOnError (default true).
 *
 * The CUSTOMER-specific "load alarm rules" wording branch of ngx is
 * registered-not-implemented: the combined "calculated fields and alarm
 * rules" label covers the semantics for every type (spec 6.2-5 头注).
 *
 * Results render per type (created/updated/deleted counts) and load
 * failures go through the three-state EntityLoadError copy (credentials
 * conflict / missing referenced entity / runtime). Finalize invalidates
 * the branch cache like the create flow.
 */

import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import type {
  EntityTypeLoadResult,
  VersionLoadResult,
} from '@/services/tb/version-control';
import {
  awaitVersionLoadResult,
  loadEntitiesVersion,
} from '@/services/tb/version-control';
import { EntityType } from '@/types/tb/entity';
import {
  allowedEntityTypes,
  createDefaultEntityTypeLoadRows,
  ENTITY_TYPES_WITHOUT_RELATED_DATA,
  type EntityTypeLoadRow,
  entityLoadErrorToMessage,
  entityTypeLabelKey,
  isRemoveOtherEntitiesConfirmed,
  REMOVE_OTHER_ENTITIES_CONFIRM_TEXT,
  TYPES_WITH_CALCULATED_FIELDS,
  toEntityTypeLoadRequest,
} from './vc-data';

export default function ComplexRestoreModal({
  open,
  versionId,
  versionName,
  onClose,
  onRestored,
}: {
  open: boolean;
  versionId: string;
  /** Display name of the version (ngx title interpolation). */
  versionName?: string;
  onClose: () => void;
  /** Fired when a request reached a terminal (refresh table + caches). */
  onRestored: () => void;
}) {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();

  const [rows, setRows] = useState<Array<EntityTypeLoadRow>>([]);
  const [rollbackOnError, setRollbackOnError] = useState(true);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [result, setResult] = useState<VersionLoadResult | null>(null);
  const [httpError, setHttpError] = useState('');

  useEffect(() => {
    if (open) {
      setRows(createDefaultEntityTypeLoadRows());
      setRollbackOnError(true);
      setConfirmIndex(null);
      setConfirmText('');
      setResult(null);
      setHttpError('');
    }
  }, [open]);

  const patchConfig = (
    index: number,
    patch: Partial<EntityTypeLoadRow['config']>,
  ) => {
    const next = [...rows];
    next[index] = {
      ...next[index],
      config: { ...next[index].config, ...patch },
    };
    setRows(next);
  };

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const requestId = await loadEntitiesVersion(
        toEntityTypeLoadRequest({
          versionId,
          rollbackOnError,
          rows,
        }),
      );
      return awaitVersionLoadResult(requestId);
    },
    onSuccess: (mutationResult) => {
      setResult(mutationResult);
      onRestored();
      void queryClient.invalidateQueries({ queryKey: ['vc-branches'] });
    },
    onError: (error) => {
      setHttpError(serverErrorText(error));
      onRestored();
      void queryClient.invalidateQueries({ queryKey: ['vc-branches'] });
    },
  });

  const running = restoreMutation.isPending;
  const typeResults = (result?.result ?? []).filter(
    (entry) => entry.created || entry.updated || entry.deleted,
  );
  const loadError = result?.error
    ? entityLoadErrorToMessage(result.error, formatMessage)
    : '';
  const nothingRestored =
    !!result?.done && !result.error && typeResults.length === 0;

  const entityTypeOptions = (current?: EntityType) =>
    allowedEntityTypes(rows, current).map((type) => ({
      value: type,
      label: formatMessage({
        id: entityTypeLabelKey(type),
        defaultMessage: type,
      }),
    }));

  const items = rows.map((row, index) => {
    const entityType = row.entityType;
    const label = entityType
      ? formatMessage({
          id: entityTypeLabelKey(entityType),
          defaultMessage: entityType,
        })
      : formatMessage({
          id: 'pages.versionControl.entityTypeUndefined',
          defaultMessage: 'Undefined',
        });
    return {
      key: String(index),
      label: (
        <Typography.Text ellipsis className="mr-2 flex-1">
          {label}
          {row.config.removeOtherEntities
            ? ` · ${formatMessage({
                id: 'pages.versionControl.removeOtherEntities',
                defaultMessage: 'Remove other entities',
              })}`
            : ''}
        </Typography.Text>
      ),
      extra: (
        <Button
          danger
          type="text"
          size="small"
          title={formatMessage({
            id: 'pages.versionControl.removeEntityType',
            defaultMessage: 'Remove',
          })}
          aria-label={formatMessage({
            id: 'pages.versionControl.removeEntityType',
            defaultMessage: 'Remove',
          })}
          onClick={(event) => {
            event.stopPropagation();
            setRows(rows.filter((_, itemIndex) => itemIndex !== index));
          }}
        />
      ),
      children: (
        <div className="flex flex-col gap-3">
          <Space wrap align="start" size={24}>
            <div className="min-w-52">
              <Typography.Text type="secondary" className="text-xs">
                {formatMessage({
                  id: 'pages.versionControl.entityType',
                  defaultMessage: 'Entity type',
                })}
              </Typography.Text>
              <Select<EntityType>
                className="mt-1 w-full"
                value={entityType}
                options={entityTypeOptions(entityType)}
                onChange={(value) => {
                  // A type switch resets the dangerous flag — the
                  // confirmation was given for the previous type.
                  const next = [...rows];
                  next[index] = {
                    entityType: value,
                    config: {
                      ...rows[index].config,
                      removeOtherEntities: false,
                    },
                  };
                  setRows(next);
                }}
              />
            </div>
            <div className="flex flex-col gap-1 pt-5">
              <Checkbox
                checked={row.config.removeOtherEntities}
                onChange={(event) => {
                  if (event.target.checked) {
                    // Never set directly: the verbatim confirmation dialog
                    // is the only path to true (ngx confirm popover).
                    setConfirmText('');
                    setConfirmIndex(index);
                  } else {
                    patchConfig(index, { removeOtherEntities: false });
                  }
                }}
              >
                {formatMessage({
                  id: 'pages.versionControl.removeOtherEntities',
                  defaultMessage: 'Remove other entities',
                })}
              </Checkbox>
              <Checkbox
                checked={row.config.findExistingEntityByName !== false}
                onChange={(event) =>
                  patchConfig(index, {
                    findExistingEntityByName: event.target.checked,
                  })
                }
              >
                {formatMessage({
                  id: 'pages.versionControl.findExistingEntityByName',
                  defaultMessage: 'Find existing entity by name',
                })}
              </Checkbox>
            </div>
            <div className="flex flex-col gap-1 pt-5">
              {entityType === EntityType.DEVICE && (
                <Checkbox
                  checked={row.config.loadCredentials}
                  onChange={(event) =>
                    patchConfig(index, {
                      loadCredentials: event.target.checked,
                    })
                  }
                >
                  {formatMessage({
                    id: 'pages.versionControl.loadCredentials',
                    defaultMessage: 'Load credentials',
                  })}
                </Checkbox>
              )}
              {entityType &&
                !ENTITY_TYPES_WITHOUT_RELATED_DATA.has(entityType) && (
                  <>
                    <Checkbox
                      checked={row.config.loadAttributes}
                      onChange={(event) =>
                        patchConfig(index, {
                          loadAttributes: event.target.checked,
                        })
                      }
                    >
                      {formatMessage({
                        id: 'pages.versionControl.loadAttributes',
                        defaultMessage: 'Load attributes',
                      })}
                    </Checkbox>
                    <Checkbox
                      checked={row.config.loadRelations}
                      onChange={(event) =>
                        patchConfig(index, {
                          loadRelations: event.target.checked,
                        })
                      }
                    >
                      {formatMessage({
                        id: 'pages.versionControl.loadRelations',
                        defaultMessage: 'Load relations',
                      })}
                    </Checkbox>
                  </>
                )}
              {entityType && TYPES_WITH_CALCULATED_FIELDS.has(entityType) && (
                <Checkbox
                  checked={row.config.loadCalculatedFields}
                  onChange={(event) =>
                    patchConfig(index, {
                      loadCalculatedFields: event.target.checked,
                    })
                  }
                >
                  {formatMessage({
                    id: 'pages.versionControl.loadCalculatedFields',
                    defaultMessage: 'Load calculated fields and alarm rules',
                  })}
                </Checkbox>
              )}
            </div>
          </Space>
        </div>
      ),
    };
  });

  return (
    <>
      <Modal
        open={open}
        title={formatMessage(
          {
            id: 'pages.versionControl.complexRestore.title',
            defaultMessage: 'Restore entities from version "{versionName}"',
          },
          { versionName: versionName ?? versionId.slice(0, 8) },
        )}
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
                id: 'pages.versionControl.restore',
                defaultMessage: 'Restore',
              })
        }
        onOk={() => {
          if (result || httpError) {
            onClose();
          } else {
            restoreMutation.mutate();
          }
        }}
        okButtonProps={{ danger: !result && !httpError, loading: running }}
        destroyOnHidden
      >
        {result || httpError ? (
          <div className="flex flex-col gap-2 py-2">
            {nothingRestored && (
              <Alert
                type="info"
                showIcon
                message={formatMessage({
                  id: 'pages.versionControl.noEntitiesRestored',
                  defaultMessage: 'No entities restored',
                })}
              />
            )}
            {loadError && (
              <Alert
                type="error"
                showIcon
                message={formatMessage({
                  id: 'pages.versionControl.taskFailed',
                  defaultMessage: 'Version control request failed',
                })}
                description={loadError}
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
            {typeResults.map((entry: EntityTypeLoadResult) => (
              <Alert
                key={entry.entityType}
                type="success"
                showIcon
                message={`${formatMessage({
                  id: entityTypeLabelKey(entry.entityType),
                  defaultMessage: entry.entityType,
                })}: ${formatMessage(
                  {
                    id: 'pages.versionControl.loadTypeResult',
                    defaultMessage:
                      '{created} created, {updated} updated, {deleted} deleted.',
                  },
                  {
                    created: entry.created ?? 0,
                    updated: entry.updated ?? 0,
                    deleted: entry.deleted ?? 0,
                  },
                )}`}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2">
            <Typography.Title level={5} className="!mb-2">
              {formatMessage({
                id: 'pages.versionControl.complexRestore.entitiesToRestore',
                defaultMessage: 'Entities to restore',
              })}
            </Typography.Title>
            {items.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={formatMessage({
                  id: 'pages.versionControl.complexRestore.noEntitiesToRestore',
                  defaultMessage: 'Please specify entities to restore',
                })}
              />
            ) : (
              <Collapse items={items} defaultActiveKey={['0']} />
            )}
            <Space>
              <Button
                icon={<PlusOutlined />}
                disabled={allowedEntityTypes(rows).length === 0}
                onClick={() =>
                  setRows([
                    ...rows,
                    {
                      entityType: allowedEntityTypes(rows)[0],
                      config: {
                        loadAttributes: true,
                        loadRelations: true,
                        loadCredentials: true,
                        loadCalculatedFields: true,
                        removeOtherEntities: false,
                        findExistingEntityByName: true,
                      },
                    },
                  ])
                }
              >
                {formatMessage({
                  id: 'pages.versionControl.addEntityType',
                  defaultMessage: 'Add entity type',
                })}
              </Button>
              <Button disabled={rows.length === 0} onClick={() => setRows([])}>
                {formatMessage({
                  id: 'pages.versionControl.removeAll',
                  defaultMessage: 'Remove all',
                })}
              </Button>
            </Space>
            <Space align="center" size={8}>
              <Switch
                checked={rollbackOnError}
                onChange={setRollbackOnError}
                id="rollback-on-error"
              />
              <Typography.Text>
                {formatMessage({
                  id: 'pages.versionControl.rollbackOnError',
                  defaultMessage: 'Rollback on error',
                })}
              </Typography.Text>
              <Typography.Text type="secondary" className="text-xs">
                {formatMessage({
                  id: 'pages.versionControl.rollbackOnErrorHint',
                  defaultMessage:
                    'If an error occurs during the version loading, already persisted entities stay as is when this is off.',
                })}
              </Typography.Text>
            </Space>
          </div>
        )}
      </Modal>

      <Modal
        open={confirmIndex !== null}
        title={formatMessage({
          id: 'pages.versionControl.removeOtherEntitiesConfirmTitle',
          defaultMessage: 'Remove other entities?',
        })}
        onCancel={() => setConfirmIndex(null)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmIndex(null)}>
            {formatMessage({
              id: 'pages.common.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            disabled={!isRemoveOtherEntitiesConfirmed(confirmText)}
            onClick={() => {
              if (confirmIndex !== null) {
                patchConfig(confirmIndex, { removeOtherEntities: true });
              }
              setConfirmIndex(null);
            }}
          >
            {formatMessage({
              id: 'pages.versionControl.confirm',
              defaultMessage: 'Confirm',
            })}
          </Button>,
        ]}
      >
        <Typography.Paragraph>
          {formatMessage({
            id: 'pages.versionControl.removeOtherEntitiesConfirmText',
            defaultMessage:
              'Be careful! This will permanently DELETE ALL current entities not present in the version you want to restore.',
          })}
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          {formatMessage(
            {
              id: 'pages.versionControl.removeOtherEntitiesConfirmType',
              defaultMessage: 'Please type "{verification}" to confirm.',
            },
            { verification: REMOVE_OTHER_ENTITIES_CONFIRM_TEXT },
          )}
        </Typography.Paragraph>
        <Input
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          autoComplete="off"
        />
      </Modal>
    </>
  );
}
