/**
 * Branch selector (M14 wave-6, R24) — one component for the three ui-ngx
 * tb-branch-autocomplete shapes:
 *   1. `freeInput=false` — selection mode (versions table / complex
 *      panels): only EXISTING branches are acceptable, ngx selectionMode;
 *   2. `freeInput=true` — free input (single-entity create dialog):
 *      typing a new name commits to a new branch (branches are created
 *      implicitly by the first commit, no branch-management UI);
 *   3. `freeInput + allowClear + defaultHint` — the auto-commit shape
 *      (empty = the repository default branch). The wave-3 settings page
 *      already ships its own; the props stay here so the three shapes
 *      really are one component (R24), not three.
 */
import { AutoComplete, Select } from 'antd';
import type { CSSProperties } from 'react';
import { useIntl } from 'react-intl';
import type { BranchInfo } from '@/services/tb/version-control';

export default function BranchSelect({
  branches,
  value,
  onChange,
  freeInput = false,
  allowClear = false,
  defaultHint = true,
  disabled = false,
  placeholder,
  className,
  style,
  id,
}: {
  branches: Array<BranchInfo>;
  value?: string;
  onChange?: (branch: string | undefined) => void;
  freeInput?: boolean;
  allowClear?: boolean;
  /** Append the "(default)" suffix to the repo's default branch label. */
  defaultHint?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  id?: string;
}) {
  const { formatMessage } = useIntl();
  const options = branches.map((entry) => ({
    value: entry.name,
    label:
      entry.default && defaultHint
        ? `${entry.name} (${formatMessage({
            id: 'pages.versionControl.defaultBranchSuffix',
            defaultMessage: 'default',
          })})`
        : entry.name,
  }));

  if (freeInput) {
    return (
      <AutoComplete
        id={id}
        value={value}
        options={options}
        allowClear={allowClear}
        disabled={disabled}
        className={className}
        style={{ minWidth: 160, ...style }}
        placeholder={
          placeholder ??
          formatMessage({
            id: 'pages.versionControl.branch',
            defaultMessage: 'Branch',
          })
        }
        onChange={(next) => onChange?.(next ?? undefined)}
      />
    );
  }
  return (
    <Select
      id={id}
      showSearch
      optionFilterProp="label"
      value={value || undefined}
      options={options}
      allowClear={allowClear}
      disabled={disabled}
      className={className}
      style={{ minWidth: 160, ...style }}
      placeholder={
        placeholder ??
        formatMessage({
          id: 'pages.versionControl.selectBranch',
          defaultMessage: 'Select branch',
        })
      }
      onChange={(next) => onChange?.(next ?? undefined)}
    />
  );
}
