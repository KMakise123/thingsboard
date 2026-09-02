/**
 * "Assign existing dashboard" dialog for the customer-scope dashboards
 * page: a server-searched tenant dashboard picker (ui-ngx uses the
 * add-entities-to-customer dialog; the minimal M2 face is one picker).
 * Emits the chosen dashboard; the caller owns the assign call + toasts.
 */

import { useQuery } from '@tanstack/react-query';
import { Alert, Form, Modal, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { getTenantDashboards } from '@/services/tb/dashboard';

export interface CustomerDashboardAssignDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dashboardId: string) => void;
  /** Passthrough for the assign call's loading state. */
  confirmLoading?: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

export function CustomerDashboardAssignDialog({
  open,
  onClose,
  onConfirm,
  confirmLoading = false,
}: CustomerDashboardAssignDialogProps) {
  const { formatMessage } = useIntl();
  const [dashboardId, setDashboardId] = useState<string>();
  const [validationError, setValidationError] = useState<string>();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    timer.current = setTimeout(
      () => setDebounced(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer.current);
  }, [search]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setDebounced('');
      setDashboardId(undefined);
      setValidationError(undefined);
    }
  }, [open]);

  const dashboardsQuery = useQuery({
    queryKey: ['dashboards', 'tenant', 'assign-picker', debounced],
    queryFn: () =>
      getTenantDashboards({
        pageSize: 20,
        page: 0,
        textSearch: debounced || undefined,
        sortOrder: { property: 'title', direction: 'ASC' },
      }),
    enabled: open,
  });

  const confirm = () => {
    if (!dashboardId) {
      setValidationError(
        formatMessage({
          id: 'pages.customers.dashboards.dashboardRequired',
          defaultMessage: 'Dashboard is required.',
        }),
      );
      return;
    }
    setValidationError(undefined);
    onConfirm(dashboardId);
  };

  return (
    <Modal
      open={open}
      destroyOnHidden
      title={formatMessage({
        id: 'pages.customers.dashboards.assignTitle',
        defaultMessage: 'Assign dashboard to customer',
      })}
      onCancel={onClose}
      onOk={confirm}
      confirmLoading={confirmLoading}
      okText={formatMessage({
        id: 'pages.customers.dashboards.assign',
        defaultMessage: 'Assign',
      })}
      cancelText={formatMessage({
        id: 'pages.customers.dashboards.cancel',
        defaultMessage: 'Cancel',
      })}
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        title={formatMessage({
          id: 'pages.customers.dashboards.assignHint',
          defaultMessage: 'Pick a tenant dashboard to assign to this customer.',
        })}
      />
      <Form layout="vertical">
        <Form.Item
          label={formatMessage({
            id: 'pages.customers.dashboards.columnTitle',
            defaultMessage: 'Dashboard title',
          })}
          validateStatus={validationError ? 'error' : undefined}
          help={validationError}
        >
          <Select
            showSearch
            filterOption={false}
            onSearch={setSearch}
            loading={dashboardsQuery.isPending}
            value={dashboardId}
            placeholder={formatMessage({
              id: 'pages.customers.dashboards.dashboardPlaceholder',
              defaultMessage: 'Search and select a dashboard',
            })}
            options={(dashboardsQuery.data?.data ?? []).map((dashboard) => ({
              label: dashboard.title,
              value: dashboard.id.id,
            }))}
            onChange={setDashboardId}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
