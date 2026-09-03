/**
 * Key-operation families (P0 family 3): copy keys / delete keys / rename keys
 * (transform/TbCopyKeysNode, TbDeleteKeysNode, TbRenameKeysNode). Each is a
 * source picker (TbMsgSource DATA|METADATA — wire fields copyFrom /
 * deleteFrom / renameIn) plus its structured editor (string list for the key
 * sets, kv map for the rename mapping). Field names verified against the
 * backend *NodeConfiguration classes; labels mirror ui-ngx
 * copy/delete-keys-config + rename-keys-config.
 */
import { Typography } from 'antd';
import { useIntl } from 'react-intl';

import type { RuleNodeConfigComponentProps } from '../registry';
import { KvMapEditor } from './kv-map-editor';
import { MsgSourceSelect } from './msg-source-select';
import { StringItemsList } from './string-items-list';

function FieldLabel({ text }: { text: string }) {
  return (
    <Typography.Text style={{ display: 'block', marginBottom: 2 }}>
      {text}
    </Typography.Text>
  );
}

function sourceField(
  configuration: Record<string, unknown>,
  field: string,
): unknown {
  const value = configuration[field];
  return value === 'METADATA' ? 'METADATA' : 'DATA';
}

function stringList(
  configuration: Record<string, unknown>,
  field: string,
): unknown {
  const value = configuration[field];
  return Array.isArray(value) ? value : [];
}

/** TbCopyKeysNode — copyFrom + keys (ui-ngx copy-keys-config). */
export function CopyKeysConfig({
  configuration,
  onChange,
  disabled = false,
  testIdPrefix = 'node-config',
}: RuleNodeConfigComponentProps) {
  const intl = useIntl();
  return (
    <div data-testid={`${testIdPrefix}-key-ops`}>
      <FieldLabel
        text={intl.formatMessage({ id: 'editor.ruleNode.keyOps.source' })}
      />
      <MsgSourceSelect
        value={sourceField(configuration, 'copyFrom')}
        onChange={(next) => onChange({ copyFrom: next })}
        disabled={disabled}
        testIdPrefix={`${testIdPrefix}-key-ops-source`}
      />
      <FieldLabel
        text={intl.formatMessage({ id: 'editor.ruleNode.keyOps.keys' })}
      />
      <StringItemsList
        value={stringList(configuration, 'keys')}
        onChange={(next) => onChange({ keys: next })}
        placeholder={intl.formatMessage({
          id: 'editor.ruleNode.keyOps.keysPlaceholder',
        })}
        disabled={disabled}
        testIdPrefix={`${testIdPrefix}-key-ops-keys`}
      />
    </div>
  );
}

/** TbDeleteKeysNode — deleteFrom + keys (ui-ngx delete-keys-config). */
export function DeleteKeysConfig({
  configuration,
  onChange,
  disabled = false,
  testIdPrefix = 'node-config',
}: RuleNodeConfigComponentProps) {
  const intl = useIntl();
  return (
    <div data-testid={`${testIdPrefix}-key-ops`}>
      <FieldLabel
        text={intl.formatMessage({ id: 'editor.ruleNode.keyOps.source' })}
      />
      <MsgSourceSelect
        value={sourceField(configuration, 'deleteFrom')}
        onChange={(next) => onChange({ deleteFrom: next })}
        disabled={disabled}
        testIdPrefix={`${testIdPrefix}-key-ops-source`}
      />
      <FieldLabel
        text={intl.formatMessage({ id: 'editor.ruleNode.keyOps.keys' })}
      />
      <StringItemsList
        value={stringList(configuration, 'keys')}
        onChange={(next) => onChange({ keys: next })}
        placeholder={intl.formatMessage({
          id: 'editor.ruleNode.keyOps.keysPlaceholder',
        })}
        disabled={disabled}
        testIdPrefix={`${testIdPrefix}-key-ops-keys`}
      />
    </div>
  );
}

/** TbRenameKeysNode — renameIn + renameKeysMapping (ui-ngx rename-keys-config). */
export function RenameKeysConfig({
  configuration,
  onChange,
  disabled = false,
  testIdPrefix = 'node-config',
}: RuleNodeConfigComponentProps) {
  const intl = useIntl();
  return (
    <div data-testid={testIdPrefix}>
      <FieldLabel
        text={intl.formatMessage({ id: 'editor.ruleNode.keyOps.source' })}
      />
      <MsgSourceSelect
        value={sourceField(configuration, 'renameIn')}
        onChange={(next) => onChange({ renameIn: next })}
        disabled={disabled}
        testIdPrefix={`${testIdPrefix}-key-ops-source`}
      />
      <FieldLabel
        text={intl.formatMessage({ id: 'editor.ruleNode.rename.mapping' })}
      />
      <KvMapEditor
        value={configuration.renameKeysMapping}
        onChange={(next) => onChange({ renameKeysMapping: next })}
        disabled={disabled}
        testIdPrefix={`${testIdPrefix}-rename-keys-mapping`}
      />
    </div>
  );
}
