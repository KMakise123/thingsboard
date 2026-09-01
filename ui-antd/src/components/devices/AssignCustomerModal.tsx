/**
 * Assign-to-customer dialog (assign-to-customer-dialog parity): a debounced
 * server-side customer search feeding a Select, the public customer filtered
 * out. Emits the chosen customer; the caller owns the fan-out + toasts.
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Form, Modal, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { getCustomers } from '@/services/tb/customer';
import type { Customer } from '@/types/tb';

export interface AssignCustomerModalProps {
  open: boolean;
  /** How many devices the assignment covers (drives the hint text). */
  deviceCount: number;
  onClose: () => void;
  onConfirm: (customer: Customer) => void;
  /** Passthrough for the fan-out running state (keeps the dialog open). */
  confirmLoading?: boolean;
}

export function AssignCustomerModal({
  open,
  deviceCount,
  onClose,
  onConfirm,
  confirmLoading = false,
}: AssignCustomerModalProps) {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [validationError, setValidationError] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timer.current = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer.current);
  }, [search]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setDebounced('');
      setSelectedId(undefined);
      setValidationError(undefined);
    }
  }, [open]);

  const customersQuery = useQuery({
    queryKey: ['customers', 'assign', debounced],
    queryFn: () =>
      getCustomers({
        pageSize: 20,
        page: 0,
        textSearch: debounced || undefined,
        sortOrder: { property: 'title', direction: 'ASC' },
      }),
    enabled: open,
  });

  // The system public customer is not assignable (ui-ngx filters it too).
  const customers = customersQuery.data?.data ?? [];
  const options = customers
    .filter((customer) => !customer.additionalInfo?.isPublic)
    .map((customer) => ({ label: customer.title, value: customer.id.id }));

  const confirm = () => {
    const customer = customers.find((entry) => entry.id.id === selectedId);
    if (!customer) {
      setValidationError(
        formatMessage({
          id: 'pages.devices.list.customerRequired',
          defaultMessage: 'Customer is required.',
        }),
      );
      return;
    }
    setValidationError(undefined);
    onConfirm(customer);
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.devices.list.assignTitle',
        defaultMessage: 'Assign devices',
      })}
      destroyOnHidden
      onCancel={onClose}
      confirmLoading={confirmLoading}
      okText={formatMessage({
        id: 'pages.devices.list.assignConfirm',
        defaultMessage: 'Assign',
      })}
      cancelText={formatMessage({
        id: 'pages.devices.list.cancel',
        defaultMessage: 'Cancel',
      })}
      onOk={confirm}
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        title={
          deviceCount === 1
            ? formatMessage({
                id: 'pages.devices.list.assignOneText',
                defaultMessage:
                  'The device will be assigned to the selected customer.',
              })
            : formatMessage(
                {
                  id: 'pages.devices.list.assignText',
                  defaultMessage:
                    '{count, plural, =1 {1 device} other {# devices}} will be assigned to the selected customer.',
                },
                { count: deviceCount },
              )
        }
      />
      <Form layout="vertical">
        <Form.Item
          label={formatMessage({
            id: 'pages.devices.list.customerColumn',
            defaultMessage: 'Customer',
          })}
          validateStatus={validationError ? 'error' : undefined}
          help={validationError}
        >
          <Select
            showSearch
            filterOption={false}
            onSearch={setSearch}
            loading={customersQuery.isPending}
            value={selectedId}
            placeholder={formatMessage({
              id: 'pages.devices.list.customerPlaceholder',
              defaultMessage: 'Search and select a customer',
            })}
            options={options}
            onChange={setSelectedId}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
