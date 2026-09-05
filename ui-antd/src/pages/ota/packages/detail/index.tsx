/**
 * OTA package detail page (M13 wave-2, spec §5.5; ui-ngx
 * ota-update.component details-mode parity).
 *
 * Loads through the V2 Infos endpoint (`/otaPackage/info/{id}`) — the bare
 * `/{id}` GET echoes the base64 package body and is forbidden here. The
 * entity is create-and-freeze: every control renders disabled except the
 * description (title/version/tag additionally carry the readOnly attribute
 * as a belt-and-braces guard), and saving sends the loaded entity back
 * verbatim with only additionalInfo.description changed.
 *
 * Header buttons (ui-ngx details button group): Download (enabled only for
 * file packages carrying data; URL packages would make the endpoint 400),
 * Delete (back to the list on success) and the three copy buttons —
 * checksum / direct URL appear only when present.
 */
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { downloadBlob } from '@/components/shared/download-blob';
import { getDeviceProfiles } from '@/services/tb/device';
import {
  deleteOtaPackage,
  downloadOtaPackage,
  getOtaPackageInfo,
  saveOtaPackageInfo,
} from '@/services/tb/ota';
import type { DeviceProfileInfo } from '@/types/tb';
import { OtaPackageType } from '@/types/tb/ota';
import { downloadDisabledFor, openPackageExternalUrl } from '../package-view';
import { useOtaCopy } from '../use-ota-copy';

interface OtaDetailFormValues {
  title?: string;
  version?: string;
  tag?: string;
  type?: OtaPackageType;
  profileId?: string;
  url?: string;
  fileName?: string;
  dataSize?: string;
  contentType?: string;
  description?: string;
}

export default function OtaPackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const copy = useOtaCopy();
  const [form] = Form.useForm<OtaDetailFormValues>();
  const [saving, setSaving] = useState(false);

  const packageQuery = useQuery({
    queryKey: ['ota', 'packages', 'detail', id],
    queryFn: () => getOtaPackageInfo(id as string),
    enabled: !!id,
  });
  const pkg = packageQuery.data;

  // Profile names for the disabled picker (falls back to the raw id).
  const profilesQuery = useQuery({
    queryKey: ['device-profiles', 'ota-detail'],
    queryFn: () =>
      getDeviceProfiles({
        pageSize: 50,
        page: 0,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
    enabled: !!pkg,
  });
  const profiles: Array<DeviceProfileInfo> = profilesQuery.data?.data ?? [];

  useEffect(() => {
    if (!pkg) {
      return;
    }
    form.setFieldsValue({
      title: pkg.title,
      version: pkg.version,
      tag: pkg.tag,
      type: pkg.type,
      profileId: pkg.deviceProfileId?.id,
      url: pkg.url,
      fileName: pkg.fileName,
      dataSize:
        pkg.dataSize === undefined || pkg.dataSize === null
          ? undefined
          : String(pkg.dataSize),
      contentType: pkg.contentType,
      description: pkg.additionalInfo?.description,
    });
  }, [pkg, form]);

  const saveDescription = async () => {
    if (!pkg) {
      return;
    }
    const values = await form.validateFields();
    setSaving(true);
    try {
      // Create-and-freeze: the stored entity is echoed back verbatim —
      // the backend compares every immutable field — and only the
      // description inside additionalInfo may differ.
      await saveOtaPackageInfo({
        ...pkg,
        additionalInfo: {
          ...pkg.additionalInfo,
          description: values.description?.trim() || undefined,
        },
        usesUrl: !!pkg.url,
      });
      void message.success(
        formatMessage({
          id: 'pages.ota.toastSaved',
          defaultMessage: 'Package saved.',
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: ['ota', 'packages', 'detail', id],
      });
    } catch (error) {
      void message.error(serverErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    if (!pkg) {
      return;
    }
    if (pkg.url) {
      openPackageExternalUrl(pkg);
      return;
    }
    try {
      const blob = await downloadOtaPackage(pkg.id.id);
      downloadBlob(blob, pkg.fileName || `${pkg.title}.bin`);
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const deleteOne = async () => {
    if (!pkg) {
      return;
    }
    try {
      await deleteOtaPackage(pkg.id.id);
      void message.success(
        formatMessage({
          id: 'pages.ota.toastDeleted',
          defaultMessage: 'Package deleted.',
        }),
      );
      history.push('/otaPackages');
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const confirmDelete = () => {
    if (!pkg) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.ota.deleteOneTitle',
          defaultMessage:
            "Are you sure you want to delete the OTA update '{title}'?",
        },
        { title: pkg.title },
      ),
      content: formatMessage({
        id: 'pages.ota.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the OTA update will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.ota.delete',
        defaultMessage: 'Delete package',
      }),
      cancelText: formatMessage({
        id: 'pages.ota.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteOne(),
    });
  };

  const downloadDisabled = pkg ? downloadDisabledFor(pkg) : true;

  return (
    <PageContainer
      title={pkg?.title ?? id}
      breadcrumbLabel={pkg?.title ?? id}
      onBack={() => history.push('/otaPackages')}
      extra={
        pkg && (
          <Space wrap>
            <Button
              icon={<DownloadOutlined />}
              disabled={downloadDisabled}
              aria-label={formatMessage({
                id: 'pages.ota.download',
                defaultMessage: 'Download package',
              })}
              onClick={() => void download()}
            >
              {formatMessage({
                id: 'pages.ota.download',
                defaultMessage: 'Download package',
              })}
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              aria-label={formatMessage({
                id: 'pages.ota.delete',
                defaultMessage: 'Delete package',
              })}
              onClick={confirmDelete}
            >
              {formatMessage({
                id: 'pages.ota.delete',
                defaultMessage: 'Delete package',
              })}
            </Button>
            <Button
              icon={<CopyOutlined />}
              aria-label={formatMessage({
                id: 'pages.ota.copyId',
                defaultMessage: 'Copy package Id',
              })}
              onClick={() =>
                void copy(pkg.id.id, {
                  id: 'pages.ota.copiedId',
                  defaultMessage: 'Package Id has been copied to clipboard',
                })
              }
            >
              {formatMessage({
                id: 'pages.ota.copyId',
                defaultMessage: 'Copy package Id',
              })}
            </Button>
            {pkg.checksum && (
              <Button
                icon={<CopyOutlined />}
                aria-label={formatMessage({
                  id: 'pages.ota.copyChecksum',
                  defaultMessage: 'Copy checksum',
                })}
                onClick={() =>
                  void copy(pkg.checksum as string, {
                    id: 'pages.ota.copiedChecksum',
                    defaultMessage:
                      'Package checksum has been copied to clipboard',
                  })
                }
              >
                {formatMessage({
                  id: 'pages.ota.copyChecksum',
                  defaultMessage: 'Copy checksum',
                })}
              </Button>
            )}
            {pkg.url && (
              <Button
                icon={<CopyOutlined />}
                aria-label={formatMessage({
                  id: 'pages.ota.copyDirectUrl',
                  defaultMessage: 'Copy direct URL',
                })}
                onClick={() =>
                  void copy(pkg.url as string, {
                    id: 'pages.ota.copiedDirectUrl',
                    defaultMessage:
                      'Package direct URL has been copied to clipboard',
                  })
                }
              >
                {formatMessage({
                  id: 'pages.ota.copyDirectUrl',
                  defaultMessage: 'Copy direct URL',
                })}
              </Button>
            )}
          </Space>
        )
      }
    >
      <Card>
        {packageQuery.isPending && (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        )}
        {packageQuery.isError && (
          <Alert
            type="error"
            showIcon
            title={formatMessage({
              id: 'pages.ota.detailLoadFailed',
              defaultMessage: 'Failed to load the package',
            })}
            description={serverErrorText(packageQuery.error)}
          />
        )}
        {pkg && (
          <Form<OtaDetailFormValues> form={form} layout="vertical">
            <Form.Item
              name="title"
              label={formatMessage({
                id: 'pages.ota.title',
                defaultMessage: 'Title',
              })}
            >
              <Input readOnly disabled />
            </Form.Item>
            <Form.Item
              name="version"
              label={formatMessage({
                id: 'pages.ota.version',
                defaultMessage: 'Version',
              })}
            >
              <Input readOnly disabled />
            </Form.Item>
            <Form.Item
              name="tag"
              label={formatMessage({
                id: 'pages.ota.tag',
                defaultMessage: 'Version tag',
              })}
            >
              <Input readOnly disabled />
            </Form.Item>
            <Form.Item
              name="profileId"
              label={formatMessage({
                id: 'pages.ota.profile',
                defaultMessage: 'Device profile',
              })}
            >
              <Select
                disabled
                options={profiles.map((profile) => ({
                  label: profile.name,
                  value: profile.id.id,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="type"
              label={formatMessage({
                id: 'pages.ota.type',
                defaultMessage: 'Package type',
              })}
            >
              <Radio.Group
                disabled
                options={[
                  {
                    label: formatMessage({
                      id: 'pages.ota.type.firmware',
                      defaultMessage: 'Firmware',
                    }),
                    value: OtaPackageType.FIRMWARE,
                  },
                  {
                    label: formatMessage({
                      id: 'pages.ota.type.software',
                      defaultMessage: 'Software',
                    }),
                    value: OtaPackageType.SOFTWARE,
                  },
                ]}
              />
            </Form.Item>
            {pkg.url && (
              <Form.Item
                name="url"
                label={formatMessage({
                  id: 'pages.ota.url',
                  defaultMessage: 'URL',
                })}
              >
                <Input readOnly disabled />
              </Form.Item>
            )}
            {pkg.fileName && (
              <Form.Item
                name="fileName"
                label={formatMessage({
                  id: 'pages.ota.fileName',
                  defaultMessage: 'File name',
                })}
              >
                <Input readOnly disabled />
              </Form.Item>
            )}
            {pkg.dataSize !== undefined && pkg.dataSize !== null && (
              <Form.Item
                name="dataSize"
                label={formatMessage({
                  id: 'pages.ota.dataSize',
                  defaultMessage: 'File size',
                })}
              >
                <Input readOnly disabled suffix="bytes" />
              </Form.Item>
            )}
            {pkg.contentType && (
              <Form.Item
                name="contentType"
                label={formatMessage({
                  id: 'pages.ota.contentType',
                  defaultMessage: 'Content type',
                })}
              >
                <Input readOnly disabled />
              </Form.Item>
            )}
            <Form.Item
              name="description"
              label={formatMessage({
                id: 'pages.ota.description',
                defaultMessage: 'Description',
              })}
            >
              <Input.TextArea rows={3} autoSize />
            </Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={() => void saveDescription()}
              >
                {formatMessage({
                  id: 'pages.ota.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            </Space>
          </Form>
        )}
        {pkg && (
          <Typography.Paragraph type="secondary" className="mt-4 mb-0">
            {pkg.id.id}
          </Typography.Paragraph>
        )}
      </Card>
    </PageContainer>
  );
}
