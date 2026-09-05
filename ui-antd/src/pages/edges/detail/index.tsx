/**
 * Edge detail page (M13 wave-4, spec §5.2; ui-ngx edge.component +
 * edge-tabs.component parity).
 *
 * Shell: header + a Tabs container whose active tab lives in the URL
 * (`?tab=`), only the active tab mounted (destroyOnHidden — WS budget).
 * Tab set = details + the ngx seven tabs; downlinks / audit-logs are
 * TENANT_ADMIN-only and a hand-typed URL snaps back (shared
 * useDetailTabUrlState contract). CUSTOMER_USER gets the read-only collapse:
 * no details tab (five tabs), default `attributes`, the whole action area
 * hidden (edge.component.html :94-121收缩集). version-control is never
 * mounted — the ngx Edge page has no such tab (R03).
 *
 * Action area (TA only): the two-state instructions button
 * (GET /api/edge/{id}/upgrade/available picks install vs upgrade flavor,
 * R07), sync (fire-and-forget toast + loading, R09), the copy trio
 * (ID / Edge key / Edge secret), the customer-assignment quartet driven by
 * the current assignment state, the five manage sub-page entries (routes
 * land in wave 5 — links go live ahead of them on purpose, list-page
 * parity) and delete (back to the list on success).
 */
import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  MoreOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Card,
  Dropdown,
  Space,
  Spin,
  Tabs,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import EventsPanel from '@/components/devices/detail/EventsPanel';
import { AssignCustomerModal } from '@/components/entities/AssignCustomerModal';
import AlarmsPanel from '@/components/entities/detail/AlarmsPanel';
import AttributesPanel from '@/components/entities/detail/AttributesPanel';
import AuditLogsPanel from '@/components/entities/detail/AuditLogsPanel';
import {
  assembleDetailTabs,
  type DetailTabEntry,
} from '@/components/entities/detail/detail-tabs';
import LatestTelemetryPanel from '@/components/entities/detail/LatestTelemetryPanel';
import RelationsPanel from '@/components/entities/detail/RelationsPanel';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { useAuthority } from '@/components/shared/use-authority';
import {
  assignEdgeToCustomer,
  deleteEdge,
  getEdgeInfo,
  getEdgeUpgradeAvailable,
  makeEdgePublic,
  syncEdge,
  unassignEdgeFromCustomer,
} from '@/services/tb/edge';
import type { Customer } from '@/types/tb';
import { AttributeScope } from '@/types/tb';
import type { EdgeInfo } from '@/types/tb/edge';
import {
  EdgeInstructionsDialog,
  type EdgeInstructionsDialogMode,
} from '../instructions-dialog';
import DetailsTab from './DetailsTab';
import DownlinksPanel from './DownlinksPanel';
import {
  CU_FALLBACK_TAB,
  type DetailTab,
  isTaOnlyDetailTab,
  useDetailTabUrlState,
} from './url-state';
import { useEdgeCopy } from './use-copy';

const NULL_CUSTOMER_UUID = '13814000-1dd2-11b2-8080-808080808080';

/** Manage sub-page targets (routes mount in wave 5; ngx suffix parity). */
const MANAGE_TARGETS = [
  {
    suffix: 'devices',
    labelId: 'pages.edge.action.manageDevices',
    defaultMessage: 'Manage devices',
  },
  {
    suffix: 'assets',
    labelId: 'pages.edge.action.manageAssets',
    defaultMessage: 'Manage assets',
  },
  {
    suffix: 'entityViews',
    labelId: 'pages.edge.action.manageEntityViews',
    defaultMessage: 'Manage entity views',
  },
  {
    suffix: 'dashboards',
    labelId: 'pages.edge.action.manageDashboards',
    defaultMessage: 'Manage dashboards',
  },
  {
    suffix: 'ruleChains',
    labelId: 'pages.edge.action.manageRuleChains',
    defaultMessage: 'Manage rule chains',
  },
] as const;

export default function EdgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { authority } = useAuthority();
  const readOnly = authority !== 'TENANT_ADMIN';
  const { tab: requestedTab, setTab } = useDetailTabUrlState();

  // Snap hand-typed URLs back onto tabs the role can actually see. For CU
  // the collapse drops details/downlinks/audit-logs (fallback: attributes);
  // TENANT_ADMIN sees every entry, so the request passes through as-is.
  const tab = readOnly
    ? requestedTab === 'details' || isTaOnlyDetailTab(requestedTab)
      ? CU_FALLBACK_TAB
      : requestedTab
    : requestedTab;

  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [instructions, setInstructions] =
    useState<EdgeInstructionsDialogMode | null>(null);

  const edgeQuery = useQuery({
    queryKey: ['edge', 'detail', id],
    queryFn: () => getEdgeInfo(id as string),
    enabled: !!id,
  });
  const edge = edgeQuery.data;
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['edge', 'detail'] });

  // Instructions flavor: upgrade only when the backend says an upgrade is
  // available (R07); TA-only — the whole action area is hidden for CU.
  const upgradeAvailableQuery = useQuery({
    queryKey: ['edge', 'upgrade-available', id],
    queryFn: () => getEdgeUpgradeAvailable(id as string),
    enabled: !readOnly && !!id,
  });
  const upgradeAvailable = upgradeAvailableQuery.data === true;

  // Browser-level unsaved-changes guard while the details form is dirty.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const confirmDiscard = useCallback(
    (after: () => void) => {
      modal.confirm({
        title: formatMessage({
          id: 'pages.edge.detail.unsavedTitle',
          defaultMessage: 'Unsaved changes',
        }),
        content: formatMessage({
          id: 'pages.edge.detail.unsavedText',
          defaultMessage:
            'The edge has unsaved changes. Leave anyway? Changes will be lost.',
        }),
        okText: formatMessage({
          id: 'pages.edge.detail.unsavedLeave',
          defaultMessage: 'Leave',
        }),
        cancelText: formatMessage({
          id: 'pages.edge.cancel',
          defaultMessage: 'Cancel',
        }),
        okButtonProps: { danger: true },
        onOk: () => {
          after();
        },
      });
    },
    [formatMessage, modal],
  );

  const leaveEditMode = () => {
    setDirty(false);
    setEditing(false);
  };

  const onTabChange = (next: string) => {
    if (dirty) {
      confirmDiscard(() => {
        leaveEditMode();
        setTab(next as DetailTab);
      });
      return;
    }
    setTab(next as DetailTab);
  };

  const toggleEdit = () => {
    if (editing && dirty) {
      confirmDiscard(leaveEditMode);
      return;
    }
    setEditing(!editing);
    if (editing) {
      setDirty(false);
    }
  };

  const copy = useEdgeCopy();

  // ---- sync: fire-and-forget toast + button loading, no polling (R09)
  const syncOne = async () => {
    if (!edge) {
      return;
    }
    setSyncing(true);
    try {
      await syncEdge(edge.id.id);
      void message.success(
        formatMessage({
          id: 'pages.edge.syncStarted',
          defaultMessage: 'Sync process started successfully!',
        }),
      );
    } catch (error) {
      void message.error(serverErrorText(error));
    } finally {
      setSyncing(false);
    }
  };

  // ---- customer assignment quartet (ngx tenant matrix, list-page parity)
  const hasCustomer =
    !!edge?.customerId && edge.customerId.id !== NULL_CUSTOMER_UUID;
  const isPublic = edge?.customerIsPublic === true;

  const runAssign = async (customer: Customer) => {
    if (!edge) {
      return;
    }
    setAssignOpen(false);
    try {
      await assignEdgeToCustomer(customer.id.id, edge.id.id);
      void message.success(
        formatMessage({
          id: 'pages.edge.toastAssigned',
          defaultMessage: 'Edge assigned to the customer.',
        }),
      );
      void invalidate();
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const unassignOne = async (successTextId: string) => {
    if (!edge) {
      return;
    }
    try {
      await unassignEdgeFromCustomer(edge.id.id);
      void message.success(
        formatMessage({ id: successTextId, defaultMessage: successTextId }),
      );
      void invalidate();
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const confirmMakePublic = () => {
    if (!edge) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.edge.makePublicTitle',
          defaultMessage:
            "Are you sure you want to make the edge '{name}' public?",
        },
        { name: edge.name },
      ),
      content: formatMessage({
        id: 'pages.edge.makePublicText',
        defaultMessage:
          'After the confirmation the edge and all its data will be made public and accessible by others.',
      }),
      okText: formatMessage({
        id: 'pages.edge.action.makePublic',
        defaultMessage: 'Make edge public',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        try {
          await makeEdgePublic(edge.id.id);
          void message.success(
            formatMessage({
              id: 'pages.edge.toastPublic',
              defaultMessage: 'Edge is public.',
            }),
          );
          void invalidate();
        } catch (error) {
          void message.error(serverErrorText(error));
        }
      },
    });
  };

  const confirmMakePrivate = () => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.edge.makePrivateTitle',
          defaultMessage:
            "Are you sure you want to make the edge '{name}' private?",
        },
        { name: edge?.name },
      ),
      content: formatMessage({
        id: 'pages.edge.makePrivateText',
        defaultMessage:
          'After the confirmation the edge and all its data will become private and will not be accessible by others.',
      }),
      okText: formatMessage({
        id: 'pages.edge.action.makePrivate',
        defaultMessage: 'Make edge private',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => unassignOne('pages.edge.toastPrivate'),
    });
  };

  const confirmUnassign = () => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.edge.unassignTitle',
          defaultMessage:
            "Are you sure you want to unassign the edge '{name}'?",
        },
        { name: edge?.name },
      ),
      content: formatMessage({
        id: 'pages.edge.unassignText',
        defaultMessage:
          'After the confirmation the edge will be unassigned and will not be accessible by the customer.',
      }),
      okText: formatMessage({
        id: 'pages.edge.action.unassign',
        defaultMessage: 'Unassign from customer',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => unassignOne('pages.edge.toastUnassigned'),
    });
  };

  // ---- delete: confirm, then back to the instances list on success
  const confirmDelete = () => {
    if (!edge) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.edge.deleteOneTitle',
          defaultMessage: "Are you sure you want to delete the edge '{name}'?",
        },
        { name: edge.name },
      ),
      content: formatMessage({
        id: 'pages.edge.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the edge and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.edge.action.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        try {
          await deleteEdge(edge.id.id);
          void message.success(
            formatMessage({
              id: 'pages.edge.toastDeleted',
              defaultMessage: 'Edge deleted.',
            }),
          );
          history.push('/edges/instances');
        } catch (error) {
          void message.error(serverErrorText(error));
        }
      },
    });
  };

  const tabItems = buildTabItems({
    formatMessage,
    edge,
    readOnly,
    editing,
    onEditingChange: (next) => {
      setEditing(next);
      if (!next) {
        setDirty(false);
      }
    },
    onDirtyChange: setDirty,
  });

  const actionArea =
    !readOnly && edge ? (
      <Space wrap>
        <Button
          type="primary"
          onClick={() => setInstructions(upgradeAvailable ? 'upgrade' : 'open')}
        >
          {formatMessage(
            upgradeAvailable
              ? {
                  id: 'pages.edge.instructions.buttonUpgrade',
                  defaultMessage: 'Upgrade Instructions',
                }
              : {
                  id: 'pages.edge.instructions.buttonInstall',
                  defaultMessage: 'Install & Connect Instructions',
                },
          )}
        </Button>
        <Button
          icon={<SyncOutlined spin={syncing} />}
          loading={syncing}
          onClick={() => void syncOne()}
        >
          {formatMessage({
            id: 'pages.edge.action.sync',
            defaultMessage: 'Sync Edge',
          })}
        </Button>
        <Button
          icon={<CopyOutlined />}
          onClick={() =>
            void copy(edge.id.id, {
              id: 'pages.edge.detail.toastCopiedId',
              defaultMessage: 'Edge Id has been copied to clipboard',
            })
          }
        >
          {formatMessage({
            id: 'pages.edge.detail.copyId',
            defaultMessage: 'Copy ID',
          })}
        </Button>
        <Button
          icon={<CopyOutlined />}
          onClick={() =>
            void copy(edge.routingKey, {
              id: 'pages.edge.detail.toastCopiedKey',
              defaultMessage: 'Edge key has been copied to clipboard',
            })
          }
        >
          {formatMessage({
            id: 'pages.edge.detail.copyEdgeKey',
            defaultMessage: 'Copy Edge key',
          })}
        </Button>
        <Button
          icon={<CopyOutlined />}
          onClick={() =>
            void copy(edge.secret, {
              id: 'pages.edge.detail.toastCopiedSecret',
              defaultMessage: 'Edge secret has been copied to clipboard',
            })
          }
        >
          {formatMessage({
            id: 'pages.edge.detail.copyEdgeSecret',
            defaultMessage: 'Copy Edge secret',
          })}
        </Button>
        {!hasCustomer && (
          <Button onClick={confirmMakePublic}>
            {formatMessage({
              id: 'pages.edge.action.makePublic',
              defaultMessage: 'Make edge public',
            })}
          </Button>
        )}
        {!hasCustomer && (
          <Button onClick={() => setAssignOpen(true)}>
            {formatMessage({
              id: 'pages.edge.action.assign',
              defaultMessage: 'Assign to customer',
            })}
          </Button>
        )}
        {hasCustomer && !isPublic && (
          <Button onClick={confirmUnassign}>
            {formatMessage({
              id: 'pages.edge.action.unassign',
              defaultMessage: 'Unassign from customer',
            })}
          </Button>
        )}
        {hasCustomer && isPublic && (
          <Button onClick={confirmMakePrivate}>
            {formatMessage({
              id: 'pages.edge.action.makePrivate',
              defaultMessage: 'Make edge private',
            })}
          </Button>
        )}
        <Dropdown
          trigger={['click']}
          menu={{
            items: MANAGE_TARGETS.map((target) => ({
              key: `manage-${target.suffix}`,
              // Sub-entity routes mount in wave 5 — dead links are known
              // and accepted for this wave (list-page parity).
              label: formatMessage({
                id: target.labelId,
                defaultMessage: target.defaultMessage,
              }),
              onClick: () =>
                history.push(`/edges/${edge.id.id}/${target.suffix}`),
            })),
          }}
        >
          <Button icon={<MoreOutlined />}>
            {formatMessage({
              id: 'pages.edge.detail.manage',
              defaultMessage: 'Manage',
            })}
            <DownOutlined />
          </Button>
        </Dropdown>
        <Button danger icon={<DeleteOutlined />} onClick={confirmDelete}>
          {formatMessage({
            id: 'pages.edge.action.delete',
            defaultMessage: 'Delete',
          })}
        </Button>
        <Button
          icon={<EditOutlined />}
          onClick={toggleEdit}
          danger={editing && dirty}
        >
          {formatMessage({
            id: editing
              ? 'pages.edge.detail.cancelEdit'
              : 'pages.edge.detail.edit',
            defaultMessage: editing ? 'Cancel edit' : 'Edit',
          })}
        </Button>
      </Space>
    ) : undefined;

  return (
    <PageContainer
      title={edge?.name ?? id}
      // Dynamic breadcrumb segment: the entity's real name, same fallback
      // as the title (ADR 0008).
      breadcrumbLabel={edge?.name ?? id}
      extra={actionArea}
      // The wrapper guards this against unsaved changes (dirty).
      onBack={() => history.push('/edges/instances')}
      dirty={dirty}
      content={
        edge?.label ? (
          <Typography.Text type="secondary">{edge.label}</Typography.Text>
        ) : undefined
      }
    >
      <Card>
        {edgeQuery.isPending && (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        )}
        {edgeQuery.isError && (
          <Alert
            type="error"
            showIcon
            message={formatMessage({
              id: 'pages.edge.detail.loadFailed',
              defaultMessage: 'Failed to load the edge',
            })}
            description={serverErrorText(edgeQuery.error)}
          />
        )}
        {edge && (
          <Tabs
            activeKey={tab}
            onChange={onTabChange}
            destroyOnHidden
            items={tabItems}
          />
        )}
      </Card>

      <AssignCustomerModal
        open={assignOpen}
        entityCount={1}
        onClose={() => setAssignOpen(false)}
        onConfirm={(customer: Customer) => void runAssign(customer)}
      />
      <EdgeInstructionsDialog
        open={instructions !== null}
        edge={edge ?? null}
        mode={instructions ?? 'open'}
        // Upgrade guides key off the edge entity version (R07; the ngx
        // attribute round-trip is upstream's carry of the same value).
        edgeVersion={
          instructions === 'upgrade' && edge?.version !== undefined
            ? String(edge.version)
            : undefined
        }
        onClose={() => setInstructions(null)}
      />
    </PageContainer>
  );
}

/**
 * Edge tab registry (R03): details + the ngx seven tabs in order; the
 * downlinks/audit-logs pair is TA-only exactly like the ngx
 * edge-tabs template. CU receives the collapsed read-only set — the entries
 * array itself is built without details / downlinks / audit-logs there
 * (spec §5.2: attributes / telemetry / alarms / events / relations).
 */
function buildTabItems({
  formatMessage,
  edge,
  readOnly,
  editing,
  onEditingChange,
  onDirtyChange,
}: {
  formatMessage: ReturnType<typeof useIntl>['formatMessage'];
  edge?: EdgeInfo;
  readOnly: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}): ReturnType<typeof assembleDetailTabs> {
  const label = (key: string, defaultMessage: string) =>
    formatMessage({ id: key, defaultMessage });

  const entries: Array<DetailTabEntry> = [];
  if (!readOnly) {
    entries.push({
      key: 'details',
      label: label('pages.edge.detail.tabDetails', 'Details'),
      render: () =>
        edge ? (
          <DetailsTab
            edge={edge}
            readOnly={false}
            editing={editing}
            onEditingChange={onEditingChange}
            onDirtyChange={onDirtyChange}
          />
        ) : null,
    });
  }
  entries.push(
    {
      key: 'attributes',
      label: label('pages.edge.detail.tabAttributes', 'Attributes'),
      render: () =>
        edge ? (
          <AttributesPanel
            entityId={edge.id}
            readOnly={readOnly}
            defaultScope={AttributeScope.SERVER_SCOPE}
          />
        ) : null,
    },
    {
      key: 'latest-telemetry',
      label: label('pages.edge.detail.tabLatestTelemetry', 'Latest telemetry'),
      render: () => (edge ? <LatestTelemetryPanel entityId={edge.id} /> : null),
    },
    {
      key: 'alarms',
      label: label('pages.edge.detail.tabAlarms', 'Alarms'),
      render: () =>
        edge ? <AlarmsPanel entityId={edge.id} readOnly={readOnly} /> : null,
    },
    {
      key: 'events',
      label: label('pages.edge.detail.tabEvents', 'Events'),
      render: () =>
        edge ? (
          <EventsPanel
            entityId={edge.id}
            tenantId={edge.tenantId?.id ?? ''}
            // The real Edge event-type set (ngx passes no
            // disabledEventTypes; the backend serves exactly these three).
            eventTypes={['ERROR', 'LC_EVENT', 'STATS']}
          />
        ) : null,
    },
  );
  if (!readOnly) {
    entries.push({
      key: 'downlinks',
      taOnly: true,
      label: label('pages.edge.detail.tabDownlinks', 'Downlinks'),
      render: () => (edge ? <DownlinksPanel edgeId={edge.id.id} /> : null),
    });
  }
  entries.push({
    key: 'relations',
    label: label('pages.edge.detail.tabRelations', 'Relations'),
    render: () =>
      edge ? <RelationsPanel entityId={edge.id} readOnly={readOnly} /> : null,
  });
  if (!readOnly) {
    entries.push({
      key: 'audit-logs',
      taOnly: true,
      label: label('pages.edge.detail.tabAuditLogs', 'Audit logs'),
      render: () => (edge ? <AuditLogsPanel entityId={edge.id} /> : null),
    });
  }
  return assembleDetailTabs(entries, readOnly);
}
