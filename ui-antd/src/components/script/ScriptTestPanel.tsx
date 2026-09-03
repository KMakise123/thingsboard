/**
 * ScriptTestPanel — script trial panel (M8 brief §3 wave-1 S; v2 shape of
 * ui-ngx `node-script-test-dialog` as an embeddable panel). The D wave wires
 * it into the rule-chain entries with the real transport; execution is
 * injected via `onRun` (HTTP iron rule: only core/http / services send
 * requests), so this component stays request-free by construction.
 *
 * Payload contract (backend `POST /api/ruleChain/testScript`, body read as
 * JsonNode): `msg` travels as raw JSON text (becomes the TbMsg data),
 * `metadata` as a string map, `msgType`/`script`/`scriptType`/`argNames` as
 * strings. Malformed payload JSON is reported inline and never sent.
 *
 * Default payload mirrors ui-ngx / M8 brief §1: telemetry-ish msg,
 * two-key metadata, POST_TELEMETRY_REQUEST.
 */
import { Alert, Button, Input } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';

import { CodeEditor } from '../code-editor';
import type { ScriptLanguage } from './ScriptEditor';

export interface TestScriptParams {
  script: string;
  scriptType: string;
  argNames: string[];
  /** Raw JSON text — becomes the TbMsg data (backend reads `.asText()`). */
  msg: string;
  metadata: Record<string, string>;
  msgType: string;
}

export interface TestScriptResult {
  output: string;
  error: string;
}

export const DEFAULT_TEST_MSG = '{"temperature":22.4,"humidity":78}';
export const DEFAULT_TEST_METADATA =
  '{"deviceName":"Test Device","deviceType":"default"}';
export const DEFAULT_TEST_MSG_TYPE = 'POST_TELEMETRY_REQUEST';

export interface ScriptTestPanelProps {
  scriptType: string;
  argNames: string[];
  script: string;
  scriptLang: ScriptLanguage;
  onRun(params: TestScriptParams): Promise<TestScriptResult>;
  tbelEnabled?: boolean;
  testIdPrefix?: string;
  /**
   * M8 wave-3 D (additive): initial payload prefill for the
   * "test with this message" flow (debug event row → panel). Omitted
   * fields keep the brief §1 defaults; an empty initialMetadata string
   * yields `{}`.
   */
  initialMsg?: string;
  /** JSON object text; unparsable text falls back to the default. */
  initialMetadata?: string;
  initialMsgType?: string;
}

/**
 * Parses a payload field that must be a JSON object (msg → TbMsg data,
 * metadata → string map). Returns the object or the reason it is not one.
 */
function parseJsonObject(
  text: string,
):
  | { value: Record<string, string>; reason: null }
  | { value: null; reason: string } {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return { value: parsed as Record<string, string>, reason: null };
    }
    return { value: null, reason: 'not an object' };
  } catch (cause) {
    return {
      value: null,
      reason: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

/** True when the text parses as a JSON object (prefill guard). */
function isJsonObjectText(text: string): boolean {
  return parseJsonObject(text).reason === null;
}

export function ScriptTestPanel({
  scriptType,
  argNames,
  script,
  scriptLang,
  onRun,
  tbelEnabled = true,
  testIdPrefix = 'script-test',
  initialMsg,
  initialMetadata,
  initialMsgType,
}: ScriptTestPanelProps) {
  const { formatMessage } = useIntl();
  const [msgType, setMsgType] = useState(
    initialMsgType ?? DEFAULT_TEST_MSG_TYPE,
  );
  const [msgText, setMsgText] = useState(initialMsg || DEFAULT_TEST_MSG);
  const [metadataText, setMetadataText] = useState(
    initialMetadata !== undefined && isJsonObjectText(initialMetadata)
      ? initialMetadata
      : DEFAULT_TEST_METADATA,
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestScriptResult | null>(null);

  const isTbel = scriptLang === 'TBEL';
  // A disabled TBEL engine has nothing to run against (mirror of ScriptEditor).
  const runDisabled = running || (isTbel && !tbelEnabled);

  const run = () => {
    const msg = parseJsonObject(msgText);
    const metadata = parseJsonObject(metadataText);
    if (msg.reason !== null || metadata.reason !== null) {
      const detail =
        msg.reason !== null
          ? `${formatMessage({ id: 'editor.script.test.msg' })}: ${msg.reason}`
          : `${formatMessage({ id: 'editor.script.test.metadata' })}: ${metadata.reason}`;
      setJsonError(
        formatMessage({ id: 'editor.script.test.invalidJson' }, {
          message: detail,
        }),
      );
      return;
    }
    setJsonError(null);
    setResult(null);
    setRunning(true);
    void onRun({
      script,
      scriptType,
      argNames,
      msg: msgText,
      metadata: metadata.value,
      msgType,
    })
      .then((nextResult) => {
        setResult(nextResult);
      })
      .finally(() => {
        setRunning(false);
      });
  };

  return (
    <div>
      <div data-testid={`${testIdPrefix}-payload`}>
        <div>
          <label htmlFor={`${testIdPrefix}-msgtype`}>
            {formatMessage({ id: 'editor.script.test.msgType' })}
          </label>
          <Input
            id={`${testIdPrefix}-msgtype`}
            data-testid={`${testIdPrefix}-msgtype-input`}
            value={msgType}
            onChange={(e) => setMsgType(e.target.value)}
          />
        </div>
        <div>
          <div>{formatMessage({ id: 'editor.script.test.msg' })}</div>
          <CodeEditor
            value={msgText}
            onChange={setMsgText}
            language="json"
            height="150px"
            data-testid={`${testIdPrefix}-msg-input`}
          />
        </div>
        <div>
          <div>{formatMessage({ id: 'editor.script.test.metadata' })}</div>
          <CodeEditor
            value={metadataText}
            onChange={setMetadataText}
            language="json"
            height="120px"
            data-testid={`${testIdPrefix}-metadata-input`}
          />
        </div>
      </div>

      <div>
        <div>{formatMessage({ id: 'editor.script.test.script' })}</div>
        <CodeEditor
          value={script}
          language={isTbel ? 'tbel' : 'javascript'}
          readOnly
          height="150px"
          data-testid={`${testIdPrefix}-script`}
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <Button
          type="primary"
          data-testid={`${testIdPrefix}-run`}
          disabled={runDisabled}
          loading={running}
          onClick={run}
        >
          {formatMessage({
            id: running
              ? 'editor.script.test.running'
              : 'editor.script.test.run',
          })}
        </Button>
        {jsonError !== null && (
          <Alert
            type="error"
            showIcon
            role="alert"
            title={jsonError}
            data-testid={`${testIdPrefix}-json-error`}
            style={{ marginTop: 8 }}
          />
        )}
        {result?.error ? (
          <Alert
            type="error"
            showIcon
            role="alert"
            title={formatMessage({ id: 'editor.script.test.error' })}
            description={result.error}
            data-testid={`${testIdPrefix}-error`}
            style={{ marginTop: 8 }}
          />
        ) : null}
        {result && !result.error && result.output ? (
          <div>
            <div>{formatMessage({ id: 'editor.script.test.output' })}</div>
            <pre data-testid={`${testIdPrefix}-output`}>{result.output}</pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
