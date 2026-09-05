/**
 * Shared action-button configuration (M12 wave 3-B) — ui-ngx
 * notification-action-button-configuration parity for the three consumers:
 * WEB `additionalConfig.actionButtonConfig`, MICROSOFT_TEAMS `button`,
 * MOBILE_APP `additionalConfig.onClick` (pass hideButtonText there).
 *
 * Controlled Form.Item-style contract (value/onChange injected by the parent
 * antd Form); field enable/disable follows the ngx linkType linkage. The
 * dashboard picker reuses the shared debounced entity select; validation
 * itself lives in template-fields.validateActionButton so the wizard can gate
 * steps from the pure module.
 */
import { Input, Select, Space, Switch, Typography, theme } from 'antd';
import { useIntl } from 'react-intl';

import { RecipientEntitySelect } from '@/components/notifications/recipient-entity-select';
import { getDashboardInfo, getTenantDashboards } from '@/services/tb/dashboard';
import type { NotificationButtonConfig } from '@/types/tb/notification';

export interface ActionButtonConfigurationProps {
  value?: NotificationButtonConfig;
  onChange?: (value: NotificationButtonConfig) => void;
  title: string;
  /** ngx sliderHint — shown next to the title (mobile tap action). */
  hint?: string;
  /** MOBILE_APP: the notification itself is the tap target, no text field. */
  hideButtonText?: boolean;
  disabled?: boolean;
}

const DASHBOARD_PAGE_SORT = {
  pageSize: 50,
  page: 0,
  sortOrder: { property: 'title', direction: 'ASC' as const },
};

export function ActionButtonConfiguration({
  value,
  onChange,
  title,
  hint,
  hideButtonText = false,
  disabled = false,
}: ActionButtonConfigurationProps) {
  const { formatMessage } = useIntl();
  const { token } = theme.useToken();
  const enabled = value?.enabled === true;
  const linkType = value?.linkType ?? 'LINK';

  const patch = (partial: Partial<NotificationButtonConfig>) => {
    onChange?.({ ...value, ...partial });
  };

  return (
    <div
      className="rounded-md border border-solid px-3 py-2"
      style={{ borderColor: token.colorBorderSecondary }}
      data-testid="action-button-configuration"
    >
      <Space size={8}>
        <Switch
          checked={enabled}
          disabled={disabled}
          onChange={(checked) => {
            if (checked) {
              patch({ enabled: true });
            } else {
              // Keep the entered values (ngx disables instead of clearing).
              patch({ enabled: false });
            }
          }}
        />
        <Typography.Text>{title}</Typography.Text>
        {hint && (
          <Typography.Text type="secondary" data-testid="action-button-hint">
            {hint}
          </Typography.Text>
        )}
      </Space>

      {enabled && !disabled && (
        <div className="mt-3 flex flex-col gap-3">
          {!hideButtonText && (
            <Input
              value={value?.text}
              maxLength={50}
              showCount
              disabled={disabled}
              placeholder={formatMessage({
                id: 'pages.notifications.sent.templateConfig.buttonText',
                defaultMessage: 'Button text',
              })}
              onChange={(event) => patch({ text: event.target.value })}
              data-testid="action-button-text"
            />
          )}
          <Space size={8} wrap>
            <Select
              value={linkType}
              style={{ width: 200 }}
              disabled={disabled}
              onChange={(next) => patch({ linkType: next })}
              options={[
                {
                  value: 'LINK',
                  label: formatMessage({
                    id: 'pages.notifications.sent.templateConfig.linkTypeLink',
                    defaultMessage: 'Open URL link',
                  }),
                },
                {
                  value: 'DASHBOARD',
                  label: formatMessage({
                    id: 'pages.notifications.sent.templateConfig.linkTypeDashboard',
                    defaultMessage: 'Open dashboard',
                  }),
                },
              ]}
              data-testid="action-button-link-type"
            />
            {linkType === 'LINK' ? (
              <Input
                value={value?.link}
                maxLength={300}
                style={{ minWidth: 260 }}
                disabled={disabled}
                placeholder={formatMessage({
                  id: 'pages.notifications.sent.templateConfig.link',
                  defaultMessage: 'Link',
                })}
                onChange={(event) => patch({ link: event.target.value })}
                data-testid="action-button-link"
              />
            ) : (
              <>
                <RecipientEntitySelect
                  queryKey={['notifications', 'template-config', 'dashboards']}
                  value={value?.dashboardId}
                  onChange={(next) =>
                    patch({
                      dashboardId: Array.isArray(next) ? next[0] : next,
                    })
                  }
                  fetchPage={(textSearch) =>
                    getTenantDashboards({
                      ...DASHBOARD_PAGE_SORT,
                      textSearch: textSearch || undefined,
                    })
                  }
                  toOption={(dashboard) => ({
                    label: dashboard.title,
                    value: dashboard.id.id,
                  })}
                  resolveOne={async (id) => {
                    const dashboard = await getDashboardInfo(id);
                    return { label: dashboard.title, value: id };
                  }}
                  placeholder={formatMessage({
                    id: 'pages.notifications.sent.templateConfig.searchDashboards',
                    defaultMessage: 'Search dashboard',
                  })}
                />
                <Input
                  value={value?.dashboardState}
                  disabled={disabled}
                  style={{ width: 200 }}
                  placeholder={formatMessage({
                    id: 'pages.notifications.sent.templateConfig.dashboardState',
                    defaultMessage: 'Dashboard state',
                  })}
                  onChange={(event) =>
                    patch({ dashboardState: event.target.value })
                  }
                  data-testid="action-button-dashboard-state"
                />
              </>
            )}
          </Space>
          {linkType === 'DASHBOARD' && (
            <Space size={8}>
              <Switch
                checked={value?.setEntityIdInState !== false}
                disabled={disabled}
                onChange={(checked) => patch({ setEntityIdInState: checked })}
              />
              <Typography.Text>
                {formatMessage({
                  id: 'pages.notifications.sent.templateConfig.setEntityFromNotification',
                  defaultMessage:
                    'Set entity from notification to dashboard state',
                })}
              </Typography.Text>
            </Space>
          )}
        </div>
      )}
    </div>
  );
}
