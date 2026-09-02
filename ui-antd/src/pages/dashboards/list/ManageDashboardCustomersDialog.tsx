/**
 * Manage-assigned-customers dialog (ui-ngx manage-dashboard-customers-dialog
 * parity): one customer multi-select serving the three action types —
 * assign -> addDashboardCustomers, manage -> updateDashboardCustomers (full
 * set, preselected with the row's assigned customers), unassign ->
 * removeDashboardCustomers. The fan-out over dashboardIds lives with the
 * caller (single row = one call; batch = the shared batch runner).
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Form, Modal, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { getCustomers } from '@/services/tb/customer';

export type ManageCustomersActionType = 'assign' | 'manage' | 'unassign';

export interface ManageDashboardCustomersDialogProps {
  open: boolean;
  actionType: ManageCustomersActionType;
  /** How many dashboards the action covers (drives the hint). */
  dashboardCount: number;
  /** Preselected customer ids (manage mode reads the row's assignments). */
  assignedCustomerIds?: Array<string>;
  onClose: () => void;
  /** Emits the chosen customer ids; the caller owns the endpoints. */
  onConfirm: (customerIds: Array<string>) => void;
}

export function ManageDashboardCustomersDialog({
  open,
  actionType,
  dashboardCount,
  assignedCustomerIds = [],
  onClose,
  onConfirm,
}: ManageDashboardCustomersDialogProps) {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selectedIds, setSelectedIds] = useState<Array<string>>([]);
  const [validationError, setValidationError] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timer.current = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer.current);
  }, [search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: assignedCustomerIds intentionally seeds the selection only when the dialog reopens
  useEffect(() => {
    if (open) {
      setSearch('');
      setDebounced('');
      setSelectedIds([...assignedCustomerIds]);
      setValidationError(undefined);
    }
  }, [open]);

  const customersQuery = useQuery({
    queryKey: ['customers', 'manage-dashboard', debounced],
    queryFn: () =>
      getCustomers({
        pageSize: 20,
        page: 0,
        textSearch: debounced || undefined,
        sortOrder: { property: 'title', direction: 'ASC' },
      }),
    enabled: open,
  });

  // The system public customer is not assignable from the picker (ui-ngx
  // entity-list filters it too); manage keeps it in the preselection so an
  // update does not silently strip a public link.
  const options = (customersQuery.data?.data ?? [])
    .filter(
      (customer) =>
        !customer.additionalInfo?.isPublic ||
        assignedCustomerIds.includes(customer.id.id),
    )
    .map((customer) => ({ label: customer.title, value: customer.id.id }));

  const titleKey = {
    assign: 'dashboards.list.manageTitle.assign',
    manage: 'dashboards.list.manageTitle.manage',
    unassign: 'dashboards.list.manageTitle.unassign',
  }[actionType];
  const labelKey = {
    assign: 'dashboards.list.manageLabel.assign',
    manage: 'dashboards.list.manageLabel.manage',
    unassign: 'dashboards.list.manageLabel.unassign',
  }[actionType];
  const okKey = {
    assign: 'dashboards.list.manageOk.assign',
    manage: 'dashboards.list.manageOk.manage',
    unassign: 'dashboards.list.manageOk.unassign',
  }[actionType];

  const confirm = () => {
    if (selectedIds.length === 0) {
      setValidationError(
        formatMessage({
          id: 'dashboards.list.manageCustomerRequired',
          defaultMessage: 'Please select at least one customer.',
        }),
      );
      return;
    }
    setValidationError(undefined);
    onConfirm(selectedIds);
  };

  return (
    <Modal
      open={open}
      title={formatMessage({ id: titleKey, defaultMessage: 'Customers' })}
      destroyOnHidden
      maskClosable={false}
      okText={formatMessage({ id: okKey, defaultMessage: 'OK' })}
      cancelText={formatMessage({
        id: 'dashboards.list.cancel',
        defaultMessage: 'Cancel',
      })}
      onOk={confirm}
      onCancel={onClose}
    >
      <Form layout="vertical">
        <Form.Item
          label={formatMessage({ id: labelKey, defaultMessage: 'Customers' })}
          validateStatus={validationError ? 'error' : undefined}
          help={validationError}
        >
          <Select
            mode="multiple"
            showSearch
            filterOption={false}
            onSearch={setSearch}
            loading={customersQuery.isPending}
            value={selectedIds}
            placeholder={formatMessage({
              id: 'dashboards.list.manageCustomerPlaceholder',
              defaultMessage: 'Search and select customers',
            })}
            options={options}
            onChange={setSelectedIds}
          />
        </Form.Item>
      </Form>
      <Alert
        type="info"
        showIcon
        title={
          actionType === 'manage'
            ? formatMessage({
                id: 'dashboards.list.manageHint.manage',
                defaultMessage:
                  'The dashboard will be assigned to exactly the selected customer set.',
              })
            : formatMessage(
                {
                  id: 'dashboards.list.manageHint.batch',
                  defaultMessage:
                    'The action applies to {count, plural, =1 {1 dashboard} other {# dashboards}}.',
                },
                { count: dashboardCount },
              )
        }
      />
    </Modal>
  );
}
