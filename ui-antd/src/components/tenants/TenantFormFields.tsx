/**
 * Shared tenant form fields (ui-ngx tenant.component.html parity): title +
 * the required tenant-profile autocomplete (GET /api/tenantProfileInfos,
 * server-searched like tb-tenant-profile-autocomplete) + the contact group
 * (tb-contact: country/city/state/zip/address/address2/phone/email) +
 * description. One source for two hosts — the tenants-list dialog and the
 * detail-page header form (the form lives in the header area, M2 shape).
 *
 * v1 hides the home-dashboard editor entry (spec principle 3), so
 * additionalInfo.homeDashboardId passes through untouched on save.
 */

import { useQuery } from '@tanstack/react-query';
import { Form, Input, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  getTenantProfileInfoById,
  getTenantProfileInfos,
} from '@/services/tb/tenant-profile';
import { type EntityIdOf, EntityType } from '@/types/tb';
import type { TenantInfo } from '@/types/tb/tenant';

/** Flattened form shape; additionalInfo keys are lifted to the top level. */
export interface TenantFormValues {
  title: string;
  tenantProfileId?: string;
  country?: string;
  city?: string;
  state?: string;
  zip?: string;
  address?: string;
  address2?: string;
  email?: string;
  phone?: string;
  description?: string;
}

export function tenantToFormValues(
  tenant?: TenantInfo | null,
): TenantFormValues {
  return {
    title: tenant?.title ?? '',
    tenantProfileId: tenant?.tenantProfileId?.id,
    country: tenant?.country,
    city: tenant?.city,
    state: tenant?.state,
    zip: tenant?.zip,
    address: tenant?.address,
    address2: tenant?.address2,
    email: tenant?.email,
    phone: tenant?.phone,
    description: tenant?.additionalInfo?.description,
  };
}

/** Merge the flat form values back onto the wire entity. */
export function formValuesToTenant(
  values: TenantFormValues,
  existing?: TenantInfo | null,
): TenantInfo {
  const additionalInfo = {
    ...existing?.additionalInfo,
    description: values.description,
  };
  const contact = {
    country: values.country,
    city: values.city,
    state: values.state,
    zip: values.zip,
    address: values.address,
    address2: values.address2,
    phone: values.phone,
    email: values.email,
  };
  const profileId: EntityIdOf<EntityType.TENANT_PROFILE> = {
    entityType: EntityType.TENANT_PROFILE,
    id: values.tenantProfileId as string,
  };
  if (!existing) {
    // Create: the backend mints id/createdTime (sending draft UUIDs fails
    // deserialization, same finding as the device/customer wizards).
    const draft = {
      title: values.title.trim(),
      tenantProfileId: profileId,
      ...contact,
      additionalInfo,
    };
    return draft as TenantInfo;
  }
  return {
    ...existing,
    title: values.title.trim(),
    tenantProfileId: profileId,
    ...contact,
    additionalInfo,
  };
}

const PROFILE_SEARCH_DEBOUNCE_MS = 300;

export interface TenantFormFieldsProps {
  /** Present when editing an existing tenant — resolves the profile label. */
  tenantId?: string;
  /** Current profile id (edit hosts render the label before any search). */
  tenantProfileId?: string;
}

export function TenantFormFields({
  tenantId,
  tenantProfileId,
}: TenantFormFieldsProps) {
  const { formatMessage } = useIntl();

  // Server-searched profile options (300ms debounce, devices-list style).
  const [profileSearch, setProfileSearch] = useState('');
  const [profileDebounced, setProfileDebounced] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => setProfileDebounced(profileSearch.trim()),
      PROFILE_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(searchTimer.current);
  }, [profileSearch]);

  const profilesQuery = useQuery({
    queryKey: ['tenant-profiles', 'options', profileDebounced],
    queryFn: () =>
      getTenantProfileInfos({
        pageSize: 50,
        page: 0,
        textSearch: profileDebounced || undefined,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
  });

  // Edit hosts: label the current profile even before the user searches.
  const assignedProfileQuery = useQuery({
    queryKey: ['tenant-profiles', 'assigned', tenantId, tenantProfileId],
    queryFn: () => getTenantProfileInfoById(tenantProfileId as string),
    enabled: !!tenantId && !!tenantProfileId,
  });

  const options = (profilesQuery.data?.data ?? []).map((profile) => ({
    label: profile.name,
    value: profile.id.id,
  }));
  const assigned = assignedProfileQuery.data;
  if (assigned && !options.some((option) => option.value === assigned.id.id)) {
    options.push({ label: assigned.name, value: assigned.id.id });
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
      <Form.Item
        name="title"
        label={formatMessage({
          id: 'pages.tenants.form.title',
          defaultMessage: 'Title',
        })}
        rules={[
          {
            required: true,
            whitespace: true,
            message: formatMessage({
              id: 'pages.tenants.form.titleRequired',
              defaultMessage: 'Title is required.',
            }),
          },
          {
            max: 255,
            message: formatMessage({
              id: 'pages.tenants.form.titleMaxLength',
              defaultMessage: 'Title must be at most 255 characters.',
            }),
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="tenantProfileId"
        label={formatMessage({
          id: 'pages.tenants.form.tenantProfile',
          defaultMessage: 'Tenant profile',
        })}
        rules={[
          {
            required: true,
            message: formatMessage({
              id: 'pages.tenants.form.tenantProfileRequired',
              defaultMessage: 'Tenant profile is required.',
            }),
          },
        ]}
      >
        <Select
          showSearch
          filterOption={false}
          loading={profilesQuery.isPending}
          onSearch={setProfileSearch}
          placeholder={formatMessage({
            id: 'pages.tenants.form.tenantProfilePlaceholder',
            defaultMessage: 'Select a tenant profile',
          })}
          options={options}
        />
      </Form.Item>
      <Form.Item
        name="country"
        label={formatMessage({
          id: 'pages.tenants.form.country',
          defaultMessage: 'Country',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="city"
        label={formatMessage({
          id: 'pages.tenants.form.city',
          defaultMessage: 'City',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="state"
        label={formatMessage({
          id: 'pages.tenants.form.state',
          defaultMessage: 'State',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="zip"
        label={formatMessage({
          id: 'pages.tenants.form.zip',
          defaultMessage: 'Postal code',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="address"
        label={formatMessage({
          id: 'pages.tenants.form.address',
          defaultMessage: 'Address',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="address2"
        label={formatMessage({
          id: 'pages.tenants.form.address2',
          defaultMessage: 'Address 2',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="phone"
        label={formatMessage({
          id: 'pages.tenants.form.phone',
          defaultMessage: 'Phone',
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="email"
        label={formatMessage({
          id: 'pages.tenants.form.email',
          defaultMessage: 'Email',
        })}
        rules={[
          {
            type: 'email',
            message: formatMessage({
              id: 'pages.tenants.form.emailInvalid',
              defaultMessage: 'Invalid email format.',
            }),
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="description"
        label={formatMessage({
          id: 'pages.tenants.form.description',
          defaultMessage: 'Description',
        })}
        className="md:col-span-2"
      >
        <Input.TextArea rows={2} autoSize={{ minRows: 1, maxRows: 6 }} />
      </Form.Item>
    </div>
  );
}
