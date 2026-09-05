/**
 * Widget type detail face (M11 wave 1B, spec §3.1 详情页): metadata
 * (name / scope-qualified fqn / kind / deprecated / bundles / description)
 * + a READ-ONLY live preview, reusing the M9 editor preview stack
 * (compileWidget + function-datasource subscription + per-instance
 * boundary) over the draft converted by the editor's own widgetTypeToDraft.
 *
 * Read-only semantics: nothing here ever posts — the preview's WYSIWYG
 * settings toggles mutate the in-memory preview config only (the upstream
 * detail preview is equally interactive), and the console pane is omitted.
 * Descriptors without `runtime: 'react-1'` are legacy Angular widgets whose
 * source cannot render through the fork pipeline — the same honest
 * placeholder the editor page shows.
 *
 * ROUTING GAP (registered with the main session): wave 0 routes carry no
 * /resources/widget-types/:widgetTypeId segment, so this face is not
 * reachable until the route lands. The component reads the future param
 * name (`widgetTypeId`) so wiring the route requires no page change.
 */
import { EditOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import { Alert, Button, Descriptions, Spin, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { widgetTypeToDraft } from '@/pages/widgets/editor/draft-convert';
import {
  WidgetPreview,
  type WidgetPreviewError,
} from '@/pages/widgets/editor/preview';
import {
  getWidgetTypeById,
  getWidgetTypeInfoById,
} from '@/services/tb/widget-type';
import type { WidgetTypeDescriptor } from '@/types/tb/widget-type';

/** TB's null-tenant UUID (EntityId.NULL_UUID) — the system marker. */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

function scopeQualifiedFqn(
  fqn: string | undefined,
  tenantId: string | undefined,
): string {
  if (!fqn) {
    return '-';
  }
  const scope = tenantId === NULL_UUID ? 'system' : 'tenant';
  return `${scope}.${fqn}`;
}

export default function WidgetTypeDetailsPage() {
  const { widgetTypeId } = useParams<{ widgetTypeId: string }>();
  const { formatMessage } = useIntl();
  const [previewError, setPreviewError] = useState<WidgetPreviewError | null>(
    null,
  );

  const infoQuery = useQuery({
    queryKey: ['widgetType', 'info', widgetTypeId],
    queryFn: () => getWidgetTypeInfoById(widgetTypeId as string),
    enabled: Boolean(widgetTypeId),
    retry: false,
  });
  const row = infoQuery.data;

  // The listing-row variant carries no typed descriptor — narrow once here.
  const runtime = (row?.descriptor as WidgetTypeDescriptor | undefined)
    ?.runtime;

  // Full details only for the react-1 preview path (the descriptor-bearing
  // wire entity converts into the preview draft).
  const detailsQuery = useQuery({
    queryKey: ['widgetType', 'details', widgetTypeId],
    queryFn: () => getWidgetTypeById(widgetTypeId as string),
    enabled: Boolean(widgetTypeId) && runtime === 'react-1',
    retry: false,
  });
  const draft = useMemo(
    () => (detailsQuery.data ? widgetTypeToDraft(detailsQuery.data) : null),
    [detailsQuery.data],
  );

  if (infoQuery.isPending) {
    return (
      <PageContainer>
        <Spin
          style={{ display: 'block', margin: '64px auto' }}
          tip={formatMessage({
            id: 'pages.resources.widgetTypes.detailsLoading',
            defaultMessage: 'Loading widget type…',
          })}
        >
          <div style={{ minHeight: 120 }} />
        </Spin>
      </PageContainer>
    );
  }
  if (infoQuery.error || !row) {
    return (
      <PageContainer>
        <Alert
          type="error"
          showIcon
          message={serverErrorText(infoQuery.error)}
        />
      </PageContainer>
    );
  }

  const isReactType = runtime === 'react-1';

  return (
    <PageContainer
      title={row.name}
      extra={
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => history.push(`/widgets/editor/${widgetTypeId}`)}
          data-testid="widget-details-edit"
        >
          {formatMessage({
            id: 'pages.resources.widgetTypes.edit',
            defaultMessage: 'Edit in widget editor',
          })}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Descriptions
          size="small"
          column={2}
          bordered
          data-testid="widget-details-meta"
        >
          <Descriptions.Item
            label={formatMessage({
              id: 'pages.resources.widgetTypes.name',
              defaultMessage: 'Name',
            })}
          >
            {row.name}
          </Descriptions.Item>
          <Descriptions.Item
            label={formatMessage({
              id: 'pages.resources.widgetTypes.fqn',
              defaultMessage: 'Fully-qualified name',
            })}
          >
            <Typography.Text code>
              {scopeQualifiedFqn(row.fqn, row.tenantId?.id)}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={formatMessage({
              id: 'pages.resources.widgetTypes.kind',
              defaultMessage: 'Type',
            })}
          >
            {row.widgetType
              ? formatMessage({
                  id: `pages.resources.widgetTypes.kindValue.${row.widgetType}`,
                  defaultMessage: row.widgetType,
                })
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={formatMessage({
              id: 'pages.resources.widgetTypes.deprecated',
              defaultMessage: 'Deprecated',
            })}
          >
            {row.deprecated ? (
              <Tag color="error">
                {formatMessage({
                  id: 'pages.resources.widgetTypes.deprecatedYes',
                  defaultMessage: 'Deprecated',
                })}
              </Tag>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item
            label={formatMessage({
              id: 'pages.resources.widgetTypes.bundles',
              defaultMessage: 'Widgets bundles',
            })}
            span={2}
          >
            {row.bundles?.length
              ? row.bundles.map((bundle) => (
                  <Tag
                    key={bundle.id?.id ?? bundle.name}
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      history.push(
                        `/resources/widgets-bundles/${bundle.id?.id ?? ''}`,
                      )
                    }
                  >
                    {bundle.name}
                  </Tag>
                ))
              : '-'}
          </Descriptions.Item>
          {row.description ? (
            <Descriptions.Item
              label={formatMessage({
                id: 'pages.resources.widgetTypes.description',
                defaultMessage: 'Description',
              })}
              span={2}
            >
              {row.description}
            </Descriptions.Item>
          ) : null}
        </Descriptions>

        <Typography.Title level={5}>
          {formatMessage({
            id: 'pages.resources.widgetTypes.previewTitle',
            defaultMessage: 'Preview',
          })}
        </Typography.Title>
        {previewError ? (
          <Alert
            type="error"
            showIcon
            data-testid="widget-details-preview-error"
            message={previewError.message}
          />
        ) : null}
        {!isReactType ? (
          <Alert
            type="warning"
            showIcon
            data-testid="widget-details-angular"
            message={formatMessage({
              id: 'pages.resources.widgetTypes.angularPreview',
              defaultMessage:
                'This type is an Angular widget; the fork preview renders react-1 types only.',
            })}
          />
        ) : detailsQuery.isPending ? (
          <Spin
            style={{ display: 'block', margin: '32px auto' }}
            tip={formatMessage({
              id: 'pages.resources.widgetTypes.detailsLoading',
              defaultMessage: 'Loading widget type…',
            })}
          >
            <div style={{ minHeight: 120 }} />
          </Spin>
        ) : detailsQuery.error ? (
          <Alert
            type="error"
            showIcon
            message={serverErrorText(detailsQuery.error)}
          />
        ) : draft ? (
          <div style={{ height: 420 }} data-testid="widget-details-preview">
            <WidgetPreview
              runId={1}
              tsx={draft.source.tsx}
              css={draft.source.css ?? ''}
              settingsForm={draft.settingsForm}
              defaultConfig={draft.defaultConfig}
              onError={setPreviewError}
              onConsoleEntry={() => {
                /* read-only face: console pane omitted */
              }}
              onDefaultConfigChange={() => {
                /* read-only face: preview-local settings only */
              }}
            />
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
