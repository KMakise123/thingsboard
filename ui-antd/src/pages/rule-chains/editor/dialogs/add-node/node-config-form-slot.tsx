/**
 * NodeConfigFormSlot — FROZEN SEAM (M8 brief §3 wave C; wave 3 K2 wires the
 * real NodeConfigForm into this exact path and prop signature — do not
 * rename/move).
 *
 *   props: { descriptor, configuration, onChange, disabled? }
 *
 * Wave-C body = the JSON source fallback: every FormProperty field has a
 * JSON source mode in the v2 editor suite, so a raw JSON editor over the
 * configuration VALUE TREE is a complete (if bare) editing surface for the
 * canvas add-node flow until the generated form arrives.
 */
import { Alert, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { CodeEditor } from '@/components/code-editor';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

export interface NodeConfigFormSlotProps {
  descriptor: RuleNodeComponentDescriptor;
  configuration: Record<string, unknown>;
  onChange: (configuration: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function NodeConfigFormSlot({
  descriptor,
  configuration,
  onChange,
  disabled = false,
}: NodeConfigFormSlotProps) {
  const { formatMessage } = useIntl();
  const [text, setText] = useState(() =>
    JSON.stringify(configuration, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setText(value);
    if (!value.trim()) {
      setError(null);
      onChange({});
      return;
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        setError('not an object');
        return;
      }
      setError(null);
      onChange(parsed as Record<string, unknown>);
    } catch (parseError) {
      setError(
        parseError instanceof Error ? parseError.message : 'invalid JSON',
      );
    }
  };

  return (
    <div data-testid="rc-node-config-slot">
      <Typography.Text type="secondary">
        {formatMessage({
          id: 'editor.ruleChain.canvas.addNode.configuration',
          defaultMessage: 'Configuration',
        })}
        {' — '}
        {descriptor.clazz}
      </Typography.Text>
      <CodeEditor
        value={text}
        onChange={handleChange}
        language="json"
        height="220px"
        readOnly={disabled}
        data-testid="rc-node-config-json"
      />
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginTop: 8 }}
          data-testid="rc-node-config-error"
        />
      ) : null}
    </div>
  );
}
