/**
 * Server-search entity picker for the recipient dialog (M12 wave 3-A) —
 * AssignCustomerModal's debounced textSearch + Select pattern, generalized:
 * single or multiple mode, plus resolveOne so ids stored on an edited target
 * keep their labels even when the first search page does not include them
 * (ui-ngx tb-entity-list syncIdsWithDB equivalent). Form.Item injects
 * value/onChange; this component only forwards them to the antd Select.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import { useEffect, useRef, useState } from 'react';

import type { PageData } from '@/types/tb/page';

export interface RecipientEntityOption {
  label: string;
  value: string;
}

export interface RecipientEntitySelectProps<T> {
  /** react-query key root; callers namespace it per entity type. */
  queryKey: ReadonlyArray<unknown>;
  mode?: 'multiple';
  value?: Array<string> | string;
  onChange?: (value: Array<string> | string) => void;
  placeholder: string;
  disabled?: boolean;
  fetchPage: (textSearch: string) => Promise<PageData<T>>;
  toOption: (row: T) => RecipientEntityOption;
  /** Resolves a stored id the search page did not return (edit prefill). */
  resolveOne?: (id: string) => Promise<RecipientEntityOption>;
}

const SEARCH_DEBOUNCE_MS = 300;

export function RecipientEntitySelect<T>({
  queryKey,
  mode,
  value,
  onChange,
  placeholder,
  disabled,
  fetchPage,
  toOption,
  resolveOne,
}: RecipientEntitySelectProps<T>) {
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

  const rowsQuery = useQuery({
    queryKey: [...queryKey, debounced],
    queryFn: () => fetchPage(debounced),
    placeholderData: keepPreviousData,
  });

  const fetchedOptions = (rowsQuery.data?.data ?? []).map(toOption);

  // Stored ids missing from the current page resolve one by one so the
  // preselected chips show titles, not raw UUIDs.
  const selectedIds = (Array.isArray(value) ? value : value ? [value] : []).map(
    String,
  );
  const knownValues = new Set(fetchedOptions.map((option) => option.value));
  const missingKey = selectedIds
    .filter((id) => !knownValues.has(id))
    .sort()
    .join(',');
  const resolvedQuery = useQuery({
    queryKey: [...queryKey, 'resolve', missingKey],
    queryFn: async () => {
      const resolved = await Promise.all(
        missingKey
          .split(',')
          .filter(Boolean)
          .map((id) => resolveOne?.(id).catch(() => null)),
      );
      return resolved.filter(
        (option): option is RecipientEntityOption => !!option,
      );
    },
    enabled: !!missingKey && !!resolveOne,
  });

  const options = [...fetchedOptions, ...(resolvedQuery.data ?? [])];

  return (
    <Select
      mode={mode}
      value={value as string | Array<string> | undefined}
      onChange={(next) => onChange?.(next)}
      options={options}
      showSearch
      filterOption={false}
      onSearch={setSearch}
      placeholder={placeholder}
      disabled={disabled}
      allowClear
      loading={rowsQuery.isFetching}
      optionFilterProp="label"
    />
  );
}
