/**
 * ScriptEditor — JS/TBEL switchable script editor for rule-node script
 * configuration (M8 brief §3 wave-1 S; mirrors ui-ngx `tb-script-lang` +
 * the js-func editor, v2 shape). Later waves consume it from the rule-node
 * custom registry (K) / dialogs (D); the props shape is frozen.
 *
 * Fully controlled, no internal draft state: the three-field configuration
 * triple `scriptLang/jsScript/tbelScript` (ui-ngx parity) round-trips through
 * a single `onChange(patch)`; both script fields are preserved across the
 * toggle, so switching languages never loses the other script.
 */
import { Segmented, Tooltip } from 'antd';

import { useIntl } from 'react-intl';

import { CodeEditor } from '../code-editor';

export type ScriptLanguage = 'JS' | 'TBEL';

export interface ScriptEditorProps {
  scriptLang: ScriptLanguage;
  jsScript: string;
  tbelScript: string;
  onChange(patch: {
    scriptLang?: ScriptLanguage;
    jsScript?: string;
    tbelScript?: string;
  }): void;
  /** TBEL availability (`GET /api/ruleChain/tbelEnabled`), fetched by the caller. */
  tbelEnabled: boolean;
  disabled?: boolean;
  /** Editor height in px (CSS hint passed to the CodeEditor). */
  height?: number;
  testIdPrefix?: string;
}

export function ScriptEditor({
  scriptLang,
  jsScript,
  tbelScript,
  onChange,
  tbelEnabled,
  disabled = false,
  height,
  testIdPrefix = 'script-editor',
}: ScriptEditorProps) {
  const { formatMessage } = useIntl();
  const isTbel = scriptLang === 'TBEL';
  const tbelHint = formatMessage({ id: 'editor.script.lang.tbelDisabled' });
  return (
    <div>
      <Segmented
        data-testid={`${testIdPrefix}-lang`}
        disabled={disabled}
        value={scriptLang}
        onChange={(value) => onChange({ scriptLang: value as ScriptLanguage })}
        options={[
          {
            label: formatMessage({ id: 'editor.script.lang.js' }),
            value: 'JS',
          },
          {
            label: (
              <Tooltip title={tbelHint}>
                <span title={tbelHint}>
                  {formatMessage({ id: 'editor.script.lang.tbel' })}
                </span>
              </Tooltip>
            ),
            value: 'TBEL',
            disabled: !tbelEnabled,
          },
        ]}
      />
      <div style={{ marginTop: 8 }}>
        <CodeEditor
          value={isTbel ? tbelScript : jsScript}
          language={isTbel ? 'tbel' : 'javascript'}
          onChange={(next) =>
            onChange(isTbel ? { tbelScript: next } : { jsScript: next })
          }
          height={height === undefined ? undefined : `${height}px`}
          readOnly={disabled}
          data-testid={`${testIdPrefix}-editor`}
        />
      </div>
    </div>
  );
}
