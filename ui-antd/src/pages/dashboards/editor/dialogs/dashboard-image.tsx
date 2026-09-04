/**
 * DashboardImageDialog (spec §3.5, ui-ngx dashboard-image-dialog):
 * upload / preview / clear the dashboard image and persist it.
 *
 * Unlike the other P-wave dialogs this one is SELF-CONTAINED: it is opened
 * from the READ-ONLY toolbar (outside edit mode — parity gate), where no
 * editor session exists, so it loads + POSTs the dashboard through
 * services/tb/dashboard itself instead of the dialog-session registry.
 *
 * Deviation from ui-ngx (registered): the ui-ngx dialog can also capture a
 * screenshot of the dashboard element via html2canvas. That dependency is
 * deliberately not introduced here (M7 brief: no new deps) — upload /
 * preview / clear / save are fully equivalent.
 *
 * Payload (additive refinement): `{dashboardId, currentImage?, onSaved?}`.
 */

import type { UploadFile } from 'antd';
import { Button, Modal, Upload } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { getDashboard, saveDashboard } from '@/services/tb/dashboard';
import { resolveDashboardImageSrc } from './dashboard-image-resolver';
import type { EditorDialogProps } from './host';

export interface DashboardImagePayload {
  dashboardId: string;
  currentImage?: string;
  /** Called after a successful save with the persisted image (or null). */
  onSaved?: (image: string | null) => void;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function DashboardImageDialog({
  open,
  payload,
  onClose,
}: EditorDialogProps) {
  const { formatMessage } = useIntl();
  const scope = (payload ?? null) as DashboardImagePayload | null;
  const [image, setImage] = useState<string | undefined>(scope?.currentImage);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [saving, setSaving] = useState(false);
  /**
   * M10 D2: the persisted value may be a `tb-image;` resource link that no
   * browser can render directly — the preview resolves it (authed fetch →
   * object URL) while `image` itself keeps the server truth for saving.
   */
  const [preview, setPreview] = useState<{
    src: string | null;
    ready: boolean;
  }>({ src: null, ready: false });
  const previewRef = useRef<{ src: string | null; ready: boolean }>(preview);

  const disabled = !scope?.dashboardId;

  // The readonly toolbar caller has no dashboard entity at hand — load the
  // current image on open so the preview reflects the persisted state.
  useEffect(() => {
    if (!open || !scope?.dashboardId || scope.currentImage !== undefined) {
      return;
    }
    let cancelled = false;
    getDashboard(scope.dashboardId).then(
      (dashboard) => {
        if (!cancelled) {
          setImage((current) => current ?? dashboard.image ?? undefined);
        }
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [open, scope]);

  // Resolve the preview whenever the image value changes (server link,
  // fresh upload, clear). Only blob: URLs need revoking; data:/http: pass
  // through the resolver untouched.
  useEffect(() => {
    const releasePreview = (src: string | null) => {
      if (src?.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
    };
    if (!image) {
      releasePreview(previewRef.current.src);
      previewRef.current = { src: null, ready: false };
      setPreview({ src: null, ready: false });
      return undefined;
    }
    let stale = false;
    resolveDashboardImageSrc(image).then((src) => {
      if (stale) {
        releasePreview(src);
        return;
      }
      releasePreview(previewRef.current.src);
      previewRef.current = { src, ready: true };
      setPreview({ src, ready: true });
    });
    return () => {
      stale = true;
    };
  }, [image]);
  useEffect(
    () => () => {
      if (previewRef.current.src?.startsWith('blob:')) {
        URL.revokeObjectURL(previewRef.current.src);
      }
    },
    [],
  );

  const save = async (): Promise<void> => {
    if (!scope) {
      return;
    }
    setSaving(true);
    try {
      const dashboard = await getDashboard(scope.dashboardId);
      const next = { ...dashboard, image };
      const saved = await saveDashboard(next);
      scope.onSaved?.(saved.image ?? null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.dashboard.dialogs.image.title',
        defaultMessage: 'Update dashboard image',
      })}
      okText={formatMessage({
        id: 'editor.common.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      okButtonProps={{
        disabled,
        loading: saving,
        'data-testid': 'dashboard-image-ok',
      }}
      cancelButtonProps={{ 'data-testid': 'dashboard-image-cancel' }}
      onOk={() => void save()}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="dashboard-image-dialog"
    >
      {image && (preview.ready ? preview.src !== null : true) ? (
        <img
          alt=""
          src={preview.src ?? undefined}
          style={{ maxWidth: '100%', marginBottom: 12 }}
          data-testid="dashboard-image-preview"
        />
      ) : (
        <p data-testid="dashboard-image-empty">
          {formatMessage({
            id: 'editor.dashboard.dialogs.image.empty',
            defaultMessage: 'No dashboard image set.',
          })}
        </p>
      )}
      <Upload
        accept="image/*"
        maxCount={1}
        fileList={fileList}
        beforeUpload={(file) => {
          void fileToDataUrl(file).then((dataUrl) => {
            setImage(dataUrl);
            setFileList([
              {
                uid: file.uid,
                name: file.name,
                status: 'done',
              },
            ]);
          });
          return false;
        }}
        onRemove={() => {
          setImage(undefined);
          setFileList([]);
        }}
        data-testid="dashboard-image-upload"
      >
        <Button data-testid="dashboard-image-upload-button">
          {formatMessage({
            id: 'editor.dashboard.dialogs.image.upload',
            defaultMessage: 'Upload image',
          })}
        </Button>
      </Upload>
      <Button
        danger
        disabled={!image}
        style={{ marginLeft: 8 }}
        data-testid="dashboard-image-clear"
        onClick={() => {
          setImage(undefined);
          setFileList([]);
        }}
      >
        {formatMessage({
          id: 'editor.dashboard.dialogs.image.clear',
          defaultMessage: 'Clear image',
        })}
      </Button>
    </Modal>
  );
}
