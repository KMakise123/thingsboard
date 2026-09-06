/**
 * CF expression test dialog (M14 wave-4, R15, spec 6.1-10; ui-ngx
 * calculated-field-script-test-dialog parity, three-panel layout).
 *
 * Dependency injection per R15: the component never sends requests — the
 * caller binds `onRun` (→ testCalculatedFieldScript). Evaluation failures
 * arrive in the 200 envelope's `error` field and render INLINE (never a
 * toast — contract #19). Save returns the (possibly edited) expression to
 * the edit dialog. Rolling arguments seed as `[]`; a saved CF prefills
 * argument values from its latest debug event.
 */
import { autocompletion } from '@codemirror/autocomplete';
import { Alert, Button, Input, Modal, Space, Spin, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { CodeEditor } from '@/components/code-editor';
import { tbelCompletionSource } from '@/components/code-editor/tbel';
import { serverErrorText } from '@/components/entities/server-error-text';
import type { CalculatedFieldArgument } from '@/types/tb/calculated-fields';
import {
  buildRunPayload,
  seedTestTexts,
  type TestScriptEnvelope,
  type TestScriptPayload,
} from './data';

export interface CfTestDialogProps {
  open: boolean;
  /** Current expression (editable — Save passes the edited text back). */
  expression: string;
  args: Record<string, CalculatedFieldArgument>;
  /** Debug-event arguments prefill (saved CFs only). */
  prefill?: Record<string, unknown> | null;
  onRun: (payload: TestScriptPayload) => Promise<TestScriptEnvelope>;
  onClose: () => void;
  /** Fired after a successful test — carries the dialog's expression. */
  onSave: (expression: string) => void;
}

export default function CfTestDialog({
  open,
  expression,
  args,
  prefill,
  onRun,
  onClose,
  onSave,
}: CfTestDialogProps) {
  const { formatMessage } = useIntl();
  const [expressionText, setExpressionText] = useState(expression);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [parseErrors, setParseErrors] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');
  const [passed, setPassed] = useState(false);

  const argumentNames = useMemo(() => Object.keys(args ?? {}), [args]);

  // Re-seed per open: expression/args/prefill are the open-time snapshot.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-seeding on prop identity changes would wipe test edits
  useEffect(() => {
    if (!open) {
      return;
    }
    setExpressionText(expression);
    setTexts(seedTestTexts(args, prefill));
    setParseErrors({});
    setError('');
    setOutput('');
    setPassed(false);
  }, [open]);

  const run = async () => {
    const { payload, parseErrors: errors } = buildRunPayload(
      expressionText,
      args,
      texts,
    );
    setParseErrors(errors);
    setError('');
    setOutput('');
    setPassed(false);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setRunning(true);
    try {
      const envelope = await onRun(payload);
      const envelopeError =
        typeof envelope?.error === 'string' ? envelope.error : '';
      if (envelopeError) {
        setError(envelopeError);
      } else {
        setOutput(
          typeof envelope?.output === 'string'
            ? envelope.output
            : JSON.stringify(envelope?.output ?? null, null, 2),
        );
        setPassed(true);
      }
    } catch (httpError) {
      // HTTP-level failure (e.g. the empty-expression / TBEL-disabled 400):
      // surface it inline like an envelope error — never a toast.
      setError(serverErrorText(httpError));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1080}
      footer={
        <Space>
          <Button onClick={onClose}>
            {formatMessage({
              id: 'pages.calculatedFields.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
          <Button
            type="primary"
            disabled={!passed}
            onClick={() => onSave(expressionText)}
          >
            {formatMessage({
              id: 'pages.calculatedFields.save',
              defaultMessage: 'Save',
            })}
          </Button>
        </Space>
      }
      title={formatMessage({
        id: 'pages.calculatedFields.testScriptTitle',
        defaultMessage: 'Test calculated field expression (TBEL)',
      })}
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Typography.Text strong>
            {formatMessage({
              id: 'pages.calculatedFields.expression',
              defaultMessage: 'Expression',
            })}
          </Typography.Text>
          <CodeEditor
            value={expressionText}
            language="tbel"
            height="300px"
            extensions={[
              autocompletion({
                override: [
                  tbelCompletionSource({
                    contextVariables: ['ctx', ...argumentNames],
                  }),
                ],
              }),
            ]}
            onChange={setExpressionText}
            data-testid="cf-test-expression-editor"
          />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Typography.Text strong>
              {formatMessage({
                id: 'pages.calculatedFields.arguments',
                defaultMessage: 'Arguments',
              })}
            </Typography.Text>
            {argumentNames.length === 0 && (
              <Typography.Text type="secondary">
                {formatMessage({
                  id: 'pages.calculatedFields.testNoArguments',
                  defaultMessage: 'This field has no arguments.',
                })}
              </Typography.Text>
            )}
            {argumentNames.map((name) => (
              <Space.Compact key={name} className="w-full">
                <Input className="w-40" value={name} readOnly title={name} />
                <Input
                  className="flex-1 font-mono"
                  value={texts[name] ?? ''}
                  status={parseErrors[name] ? 'error' : undefined}
                  placeholder={
                    args[name]?.refEntityKey?.type === 'TS_ROLLING' ? '[]' : ''
                  }
                  onChange={(event) =>
                    setTexts((previous) => ({
                      ...previous,
                      [name]: event.target.value,
                    }))
                  }
                />
              </Space.Compact>
            ))}
            {Object.keys(parseErrors).length > 0 && (
              <Alert
                type="error"
                showIcon
                message={formatMessage({
                  id: 'pages.calculatedFields.testParseError',
                  defaultMessage:
                    'Some argument values are not valid JSON. Fix them to run the test.',
                })}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Space className="justify-between">
              <Typography.Text strong>
                {formatMessage({
                  id: 'pages.calculatedFields.output.title',
                  defaultMessage: 'Output',
                })}
              </Typography.Text>
              <Button
                type="primary"
                loading={running}
                onClick={() => void run()}
              >
                {formatMessage({
                  id: 'pages.calculatedFields.testRun',
                  defaultMessage: 'Test',
                })}
              </Button>
            </Space>
            {error && (
              <Alert
                type="error"
                showIcon
                message={error}
                data-testid="cf-test-error"
              />
            )}
            {running && <Spin size="small" />}
            {!running && !error && (
              <Input.TextArea
                readOnly
                autoSize={{ minRows: 4, maxRows: 10 }}
                className="font-mono"
                value={output}
                placeholder={formatMessage({
                  id: 'pages.calculatedFields.testOutputPlaceholder',
                  defaultMessage: 'Run the test to see the output',
                })}
                data-testid="cf-test-output"
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
