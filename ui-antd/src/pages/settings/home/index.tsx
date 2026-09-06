/**
 * System settings → Home dashboard page (M14 wave-2, spec 6.3-5, ui-ngx
 * home-settings parity).
 *
 * One settings card, two fields: the tenant home dashboard (server-searched
 * tenant-scope select — the first candidate is NEVER auto-selected) and the
 * hide-toolbar flag (default true). Saved through
 * GET/POST /api/tenant/dashboard/home/info (stored in Tenant.additionalInfo).
 *
 * Wire contract (contract #23): GET always answers 200 — unconfigured reads
 * `{dashboardId: null, hideDashboardToolbar: true}`; POST answers 200 with
 * an empty body; clearing the select posts `dashboardId: null` which clears
 * the assignment server-side. The生效面 (login landing / /home rendering) is
 * M15 scope — acceptance here is a successful save round-trip.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { App, Checkbox, Form } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { DashboardSelect } from '@/components/profiles/selects';
import SettingsCard from '@/components/settings/SettingsCard';
import {
  getDashboardInfo,
  getTenantHomeDashboardInfo,
  setTenantHomeDashboardInfo,
} from '@/services/tb/dashboard';

interface HomeSettingsFormValues {
  /** Dashboard UUID (object form is only built on the wire). */
  dashboardId?: string;
  hideDashboardToolbar: boolean;
}

export default function SettingsHomePage() {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();

  const homeQuery = useQuery({
    queryKey: ['settings', 'home-dashboard'],
    queryFn: getTenantHomeDashboardInfo,
  });
  const snapshot = homeQuery.data;

  const [form] = Form.useForm<HomeSettingsFormValues>();
  const [dirty, setDirty] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (snapshot) {
      form.setFieldsValue({
        dashboardId: snapshot.dashboardId?.id,
        hideDashboardToolbar: snapshot.hideDashboardToolbar ?? true,
      });
      setDirty(false);
    }
  }, [snapshot, form]);

  const saveMutation = useMutation({
    mutationFn: (values: HomeSettingsFormValues) =>
      setTenantHomeDashboardInfo({
        dashboardId: values.dashboardId
          ? { entityType: 'DASHBOARD', id: values.dashboardId }
          : null,
        hideDashboardToolbar: values.hideDashboardToolbar ?? true,
      }),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.home.toastSaved',
          defaultMessage: 'Home dashboard settings saved.',
        }),
      );
      setDirty(false);
      void homeQuery.refetch();
    },
    onError: () => {
      void message.error(
        formatMessage({
          id: 'pages.settings.common.saveFailed',
          defaultMessage: 'Failed to save the settings.',
        }),
      );
    },
  });

  // antd Select shows the raw UUID for a value missing from its options, so
  // pre-resolve the selected dashboard's title for display.
  const selectedId = Form.useWatch('dashboardId', form);
  const selectedQuery = useQuery({
    queryKey: ['settings', 'home-dashboard', 'selected', selectedId],
    queryFn: () => getDashboardInfo(selectedId as string),
    enabled: !!selectedId,
  });

  return (
    <SettingsCard
      title={formatMessage({
        id: 'pages.settings.home.title',
        defaultMessage: 'Home settings',
      })}
      loading={homeQuery.isPending}
      dirty={dirty}
      invalid={invalid}
      saving={saveMutation.isPending}
      onUndo={() => {
        if (snapshot) {
          form.setFieldsValue({
            dashboardId: snapshot.dashboardId?.id,
            hideDashboardToolbar: snapshot.hideDashboardToolbar ?? true,
          });
        }
        setDirty(false);
      }}
      onSave={() => form.submit()}
    >
      <Form<HomeSettingsFormValues>
        form={form}
        layout="vertical"
        initialValues={{ hideDashboardToolbar: true }}
        onValuesChange={() => setDirty(true)}
        onFieldsChange={(_, allFields) =>
          setInvalid(allFields.some((field) => (field.errors ?? []).length > 0))
        }
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item
          name="dashboardId"
          label={formatMessage({
            id: 'pages.settings.home.dashboard',
            defaultMessage: 'Home dashboard',
          })}
        >
          <DashboardSelect
            selectedLabel={selectedQuery.data?.title}
            placeholder={formatMessage({
              id: 'pages.settings.home.dashboardPlaceholder',
              defaultMessage: 'Select a dashboard',
            })}
          />
        </Form.Item>
        <Form.Item
          name="hideDashboardToolbar"
          valuePropName="checked"
          label={formatMessage({
            id: 'pages.settings.home.hideToolbar',
            defaultMessage: 'Hide home dashboard toolbar',
          })}
        >
          <Checkbox />
        </Form.Item>
      </Form>
    </SettingsCard>
  );
}
