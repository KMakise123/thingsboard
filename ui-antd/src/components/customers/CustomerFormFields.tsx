/**
 * Shared customer form fields (ui-ngx customer.component.html L64-109
 * parity): title + the contact group (country / city / state / zip /
 * address / address2 / phone / email) + the home-dashboard picker +
 * description. One source for two hosts — the customer-list dialog and the
 * detail-page header form (no details tab exists, so the form lives in the
 * header area per the M2 adjudication).
 *
 * The home-dashboard picker reads the CUSTOMER scope (dashboards assigned
 * to this customer) exactly like ui-ngx tb-dashboard-autocomplete with
 * dashboardsScope='customer' — hence it only renders while editing an
 * existing customer; a brand-new customer has no assigned dashboards yet.
 */

import { useQuery } from '@tanstack/react-query';
import { Checkbox, Form, Input, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { getCustomerDashboards } from '@/services/tb/customer';
import type { Customer } from '@/types/tb';

/** Flattened form shape; additionalInfo keys are lifted to the top level. */
export interface CustomerFormValues {
  title: string;
  country?: string;
  city?: string;
  state?: string;
  zip?: string;
  address?: string;
  address2?: string;
  email?: string;
  phone?: string;
  description?: string;
  homeDashboardId?: string;
  homeDashboardHideToolbar?: boolean;
}

export function customerToFormValues(
  customer?: Customer | null,
): CustomerFormValues {
  return {
    title: customer?.title ?? '',
    country: customer?.country,
    city: customer?.city,
    state: customer?.state,
    zip: customer?.zip,
    address: customer?.address,
    address2: customer?.address2,
    email: customer?.email,
    phone: customer?.phone,
    description: customer?.additionalInfo?.description,
    homeDashboardId: customer?.additionalInfo?.homeDashboardId,
    homeDashboardHideToolbar:
      customer?.additionalInfo?.homeDashboardHideToolbar,
  };
}

/** Merge the flat form values back onto the wire entity (keeps isPublic). */
export function formValuesToCustomer(
  values: CustomerFormValues,
  existing?: Customer | null,
): Customer {
  const additionalInfo = {
    ...existing?.additionalInfo,
    description: values.description,
    homeDashboardId: values.homeDashboardId,
    homeDashboardHideToolbar: values.homeDashboardHideToolbar,
  };
  if (!existing) {
    // Create: the backend rejects draft ids/timestamps with "Invalid UUID
    // string" (same finding as the device wizard) and derives tenantId from
    // the session, so the draft omits all three.
    type CustomerDraft = Omit<Customer, 'id' | 'createdTime' | 'tenantId'>;
    const draft: CustomerDraft = {
      title: values.title.trim(),
      country: values.country,
      city: values.city,
      state: values.state,
      zip: values.zip,
      address: values.address,
      address2: values.address2,
      email: values.email,
      phone: values.phone,
      additionalInfo,
    };
    return draft as Customer;
  }
  return {
    ...existing,
    title: values.title.trim(),
    country: values.country,
    city: values.city,
    state: values.state,
    zip: values.zip,
    address: values.address,
    address2: values.address2,
    email: values.email,
    phone: values.phone,
    additionalInfo,
  };
}

const SEARCH_DEBOUNCE_MS = 300;

export interface CustomerFormFieldsProps {
  /** Present when editing an existing customer — enables the picker. */
  customerId?: string;
}

export function CustomerFormFields({ customerId }: CustomerFormFieldsProps) {
  const { formatMessage } = useIntl();

  // Server-searched dashboard options (300ms debounce, devices-list style).
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashboardDebounced, setDashboardDebounced] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => setDashboardDebounced(dashboardSearch.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(searchTimer.current);
  }, [dashboardSearch]);

  const dashboardsQuery = useQuery({
    queryKey: [
      'customer-dashboards',
      'options',
      customerId,
      dashboardDebounced,
    ],
    queryFn: () =>
      getCustomerDashboards(customerId as string, {
        pageSize: 50,
        page: 0,
        textSearch: dashboardDebounced || undefined,
        sortOrder: { property: 'title', direction: 'ASC' },
      }),
    enabled: !!customerId,
  });

  return (
    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
      <Form.Item
        name="title"
        label={formatMessage({
          id: 'pages.customers.form.title',
          defaultMessage: 'Customer title',
        })}
        rules={[
          {
            required: true,
            message: formatMessage({
              id: 'pages.customers.form.titleRequired',
              defaultMessage: 'Customer title is required.',
            }),
          },
          {
            max: 255,
            message: formatMessage({
              id: 'pages.customers.form.titleMaxLength',
              defaultMessage: 'Customer title must be at most 255 characters.',
            }),
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="country"
        label={formatMessage({
          id: 'pages.customers.form.country',
          defaultMessage: 'Country',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="city"
        label={formatMessage({
          id: 'pages.customers.form.city',
          defaultMessage: 'City',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="state"
        label={formatMessage({
          id: 'pages.customers.form.state',
          defaultMessage: 'State',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="zip"
        label={formatMessage({
          id: 'pages.customers.form.zip',
          defaultMessage: 'Postal code',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="address"
        label={formatMessage({
          id: 'pages.customers.form.address',
          defaultMessage: 'Address',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="address2"
        label={formatMessage({
          id: 'pages.customers.form.address2',
          defaultMessage: 'Address 2',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="phone"
        label={formatMessage({
          id: 'pages.customers.form.phone',
          defaultMessage: 'Phone',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="email"
        label={formatMessage({
          id: 'pages.customers.form.email',
          defaultMessage: 'Email',
        })}
        rules={[
          {
            type: 'email',
            message: formatMessage({
              id: 'pages.customers.form.emailInvalid',
              defaultMessage: 'Invalid email format',
            }),
          },
        ]}
      >
        <Input />
      </Form.Item>
      {customerId && (
        <>
          <Form.Item
            name="homeDashboardId"
            label={formatMessage({
              id: 'pages.customers.form.homeDashboard',
              defaultMessage: 'Home dashboard',
            })}
          >
            <Select
              allowClear
              showSearch
              filterOption={false}
              onSearch={setDashboardSearch}
              loading={dashboardsQuery.isPending}
              placeholder={formatMessage({
                id: 'pages.customers.form.homeDashboardPlaceholder',
                defaultMessage: 'Search and select a home dashboard',
              })}
              options={(dashboardsQuery.data?.data ?? []).map((dashboard) => ({
                label: dashboard.title,
                value: dashboard.id.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="homeDashboardHideToolbar"
            valuePropName="checked"
            className="md:col-span-2"
          >
            <Checkbox>
              {formatMessage({
                id: 'pages.customers.form.homeDashboardHideToolbar',
                defaultMessage: 'Hide home dashboard toolbar',
              })}
            </Checkbox>
          </Form.Item>
        </>
      )}
      <Form.Item
        name="description"
        label={formatMessage({
          id: 'pages.customers.form.description',
          defaultMessage: 'Description',
        })}
        className="md:col-span-2"
      >
        <Input.TextArea rows={2} autoSize={{ minRows: 1, maxRows: 6 }} />
      </Form.Item>
    </div>
  );
}
