/**
 * StringItemsList — chip-style string list editor (ui-ngx tb-string-items-list
 * equivalent) for configuration fields holding arrays of strings
 * (copy/delete keys, create-alarm relationTypes). antd tags-mode Select with
 * the dropdown suppressed: type + Enter/comma adds a chip, backspace or the
 * chip's × removes one. Fully controlled; emits the plain string[].
 */
import { Select } from 'antd';

export function StringItemsList({
  value,
  onChange,
  placeholder,
  disabled = false,
  testIdPrefix = 'string-items',
}: {
  value: unknown;
  onChange(next: string[]): void;
  placeholder?: string;
  disabled?: boolean;
  testIdPrefix?: string;
}) {
  const items = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
  return (
    <Select
      mode="tags"
      open={false}
      value={items}
      placeholder={placeholder}
      disabled={disabled}
      tokenSeparators={[',']}
      style={{ width: '100%' }}
      data-testid={testIdPrefix}
      onChange={(next) => onChange(next.map(String))}
    />
  );
}
