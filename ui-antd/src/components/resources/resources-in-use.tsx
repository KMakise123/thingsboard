/**
 * ResourcesInUseModal — the shared "resource(s) in use" delete-flow dialog
 * (ui-ngx resources-in-use-dialog + image-references parity, M11 §1).
 *
 * Flow contract (every resource delete): the page deletes with force=false;
 * a 400 carrying references opens this modal listing the referencing
 * entities; confirming re-runs the delete with force=true via `onConfirm`.
 *
 * Domain-neutral by design (wave 2C image gallery reuses it): ALL wording —
 * title, message, button labels — comes in as already-localized strings,
 * and each reference entry carries its resolved display name/link/icon.
 * The component only owns the presentation and the selection mechanics:
 *   - single mode (one resource): flat reference rows (ui-ngx
 *     image-references parity: entity-type name | entity name/link);
 *   - multiple mode (batch): resource table with row selection (empty by
 *     default, like ui-ngx SelectionModel(true, [])), confirm disabled
 *     until at least one row is selected.
 */
import { Button, Modal, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';

/** One referencing entity, resolved by the caller (domain-neutral input). */
export interface ResourceReferenceEntry {
  /** Stable row key. */
  key: string;
  /** Translated entity-type display name, e.g. "Widget type". */
  typeName: string;
  /** Referencing entity display name. */
  name: string;
  /** Details-page URL; absent = plain text (slot stays link-ready). */
  href?: string;
  /** Optional entity-type icon, resolved by the caller. */
  icon?: React.ReactNode;
}

export interface ResourceInUseItem {
  /** Resource id (echoed back through onConfirm). */
  id: string;
  title: string;
  references: Array<ResourceReferenceEntry>;
}

export interface ResourcesInUseModalProps {
  open: boolean;
  /**
   * true = batch table with row selection over `resources`; false =
   * single-resource view of `resources[0]`.
   */
  multiple?: boolean;
  resources: Array<ResourceInUseItem>;
  title: string;
  message: string;
  /** Confirm-button label (the force-delete wording). */
  deleteText: string;
  cancelText: string;
  /** Batch-mode table header labels (localized by the caller). */
  titleColumnLabel: string;
  referencesColumnLabel: string;
  /** Spins the confirm button while the force delete runs. */
  confirmLoading?: boolean;
  onClose: () => void;
  /** Confirmed: force-delete these resources (all of them in single mode). */
  onConfirm: (resources: Array<ResourceInUseItem>) => void;
}

export function ResourcesInUseModal({
  open,
  multiple = false,
  resources,
  title,
  message,
  deleteText,
  cancelText,
  titleColumnLabel,
  referencesColumnLabel,
  confirmLoading = false,
  onClose,
  onConfirm,
}: ResourcesInUseModalProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const single = resources[0];

  const columns: ColumnsType<ResourceInUseItem> = [
    { title: titleColumnLabel, dataIndex: 'title' },
    {
      title: referencesColumnLabel,
      dataIndex: 'references',
      width: 110,
      render: (_, record) => record.references.length,
    },
  ];

  const handleConfirm = () => {
    if (multiple) {
      const selected = resources.filter((resource) =>
        selectedRowKeys.includes(resource.id),
      );
      if (selected.length === 0) {
        return;
      }
      onConfirm(selected);
    } else if (single) {
      onConfirm([single]);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          {cancelText}
        </Button>,
        <Button
          key="confirm"
          danger
          type="primary"
          disabled={multiple && selectedRowKeys.length === 0}
          loading={confirmLoading}
          onClick={handleConfirm}
        >
          {deleteText}
        </Button>,
      ]}
    >
      <Typography.Paragraph>{message}</Typography.Paragraph>
      {multiple ? (
        <Table<ResourceInUseItem>
          rowKey={(record) => record.id}
          size="small"
          columns={columns}
          dataSource={resources}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
        />
      ) : (
        // ui-ngx image-references parity: flat rows of [entity-type name |
        // entity name], the name being a details link when one exists.
        <ul className="m-0 list-none p-0">
          {(single?.references ?? []).map((entry) => (
            <li
              key={entry.key}
              className="flex items-center gap-2"
              data-testid="resource-reference"
            >
              {entry.icon}
              <Typography.Text type="secondary" className="min-w-28">
                {entry.typeName}
              </Typography.Text>
              {entry.href ? (
                <a href={entry.href} target="_blank" rel="noreferrer">
                  {entry.name}
                </a>
              ) : (
                <span>{entry.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
