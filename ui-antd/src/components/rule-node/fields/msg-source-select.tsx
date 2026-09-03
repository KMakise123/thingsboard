/**
 * MsgSourceSelect — TbMsgSource (DATA | METADATA) picker shared by the key
 * operation families (copy/delete/rename keys; backend TbMsgSource enum).
 * Option copy is locale-driven (ui-ngx msg-metadata-chip labels).
 */
import { Select } from 'antd';
import { useIntl } from 'react-intl';

export function MsgSourceSelect({
  value,
  onChange,
  disabled = false,
  testIdPrefix = 'msg-source',
}: {
  value: unknown;
  onChange(next: 'DATA' | 'METADATA'): void;
  disabled?: boolean;
  testIdPrefix?: string;
}) {
  const intl = useIntl();
  const current = value === 'METADATA' ? 'METADATA' : 'DATA';
  return (
    <Select
      value={current}
      disabled={disabled}
      style={{ width: '100%' }}
      data-testid={testIdPrefix}
      onChange={(next) => onChange(next as 'DATA' | 'METADATA')}
      options={[
        {
          value: 'DATA',
          label: intl.formatMessage({
            id: 'editor.ruleNode.option.msgSource.data',
          }),
        },
        {
          value: 'METADATA',
          label: intl.formatMessage({
            id: 'editor.ruleNode.option.msgSource.metadata',
          }),
        },
      ]}
    />
  );
}
