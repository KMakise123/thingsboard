/**
 * "Assign existing entities to edge" dialog (wave 5a). The ui-ngx
 * AddEntitiesToEdge stepper simplified to a single multi-select, per the
 * wave-5a shape: the candidate page comes from the caller (each domain's
 * tenant endpoint, server-side textSearch through the PageLink), the caller
 * owns the per-row assign fan-out + toasts on confirm. Shared by the four
 * sub-entity scope pages and the customer-edges page.
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Form, Modal, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import type { PageData, PageLink } from '@/types/tb';

export interface AssignEntitiesOption {
  id: string;
  label: string;
}

export interface AssignEntitiesDialogProps {
  open: boolean;
  title: string;
  /** Loads one candidates page; the search term rides pageLink.textSearch. */
  loadCandidates: (
    pageLink: PageLink,
  ) => Promise<PageData<AssignEntitiesOption>>;
  onClose: () => void;
  /** Receives the selected candidates; the caller fans out + toasts. */
  onConfirm: (selected: Array<AssignEntitiesOption>) => void;
  confirmLoading?: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;
const CANDIDATE_PAGE_SIZE = 50;

export function AssignEntitiesDialog({
  open,
  title,
  loadCandidates,
  onClose,
  onConfirm,
  confirmLoading = false,
}: AssignEntitiesDialogProps) {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<Array<AssignEntitiesOption>>([]);
  const [validationError, setValidationError] = useState<string>();
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
      setSelected([]);
      setValidationError(undefined);
    }
  }, [open]);

  const candidatesQuery = useQuery({
    queryKey: ['edge', 'assign-candidates', debounced, open],
    queryFn: () =>
      loadCandidates({
        pageSize: CANDIDATE_PAGE_SIZE,
        page: 0,
        textSearch: debounced || undefined,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
    enabled: open,
  });
  const options = candidatesQuery.data?.data ?? [];

  // Keep labels of selections made under earlier search terms.
  const select = (ids: Array<string>) => {
    const known = new Map(selected.map((entry) => [entry.id, entry]));
    for (const option of options) {
      if (ids.includes(option.id)) {
        known.set(option.id, option);
      }
    }
    setSelected(ids.flatMap((id) => known.get(id) ?? []));
  };

  const confirm = () => {
    if (selected.length === 0) {
      setValidationError(
        formatMessage({
          id: 'pages.edge.scope.assignRequired',
          defaultMessage: 'Please select at least one entity.',
        }),
      );
      return;
    }
    setValidationError(undefined);
    onConfirm(selected);
  };

  return (
    <Modal
      open={open}
      title={title}
      destroyOnHidden
      onCancel={onClose}
      confirmLoading={confirmLoading}
      okText={formatMessage({
        id: 'pages.edge.scope.assignConfirm',
        defaultMessage: 'Assign',
      })}
      cancelText={formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      })}
      onOk={confirm}
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        title={formatMessage({
          id: 'pages.edge.scope.assignHint',
          defaultMessage: 'The selected entities will be assigned to the edge.',
        })}
      />
      <Form layout="vertical">
        <Form.Item
          validateStatus={validationError ? 'error' : undefined}
          help={validationError}
        >
          <Select
            mode="multiple"
            showSearch
            filterOption={false}
            onSearch={setSearch}
            loading={candidatesQuery.isPending}
            value={selected.map((entry) => entry.id)}
            placeholder={formatMessage({
              id: 'pages.edge.scope.assignPlaceholder',
              defaultMessage: 'Search and select entities',
            })}
            options={options.map((option) => ({
              label: option.label,
              value: option.id,
            }))}
            onChange={select}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
