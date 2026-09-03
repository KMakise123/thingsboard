/**
 * TestWithMessageModal — 用这条消息测试 (M8 wave-3 D; ui-ngx
 * `test-with-this-message` cell-action parity). The row's debug event body
 * (msg data / metadata / msgType) prefills the S-wave ScriptTestPanel inside
 * a Modal; the script identity (script body / scriptType / argNames /
 * scriptLang) derives from the node configuration + the script-family
 * profile (components/rule-node script-config, the same mapping the node
 * config form uses). Execution goes through services testRuleNodeScript via
 * the panel's onRun seam.
 *
 * Not renderable without a script-family node — the caller hides the row
 * action entirely in that case (ui-ngx disables it for non-IN events too).
 */
import { Modal } from 'antd';
import { useIntl } from 'react-intl';
import { scriptFamilyProfileFor } from '@/components/rule-node/fields/script-config';
import type { ScriptLanguage } from '@/components/script/ScriptEditor';
import {
  ScriptTestPanel,
  type TestScriptParams,
  type TestScriptResult,
} from '@/components/script/ScriptTestPanel';
import type { CanvasNode } from '@/core/rulechain/types';
import { testRuleNodeScript } from '@/services/tb/rule-chain';

import type { DebugEventBody } from './debug-events-table';

export interface TestWithMessageModalProps {
  open: boolean;
  node: CanvasNode;
  /** The event row the action was fired from. */
  eventBody: DebugEventBody | null;
  tbelEnabled?: boolean;
  onClose: () => void;
}

/**
 * Extracts the (scriptLang, scriptBody) pair from a script-family node
 * configuration using the profile's field names (jsScript/tbelScript and
 * the alarm-details variants).
 */
export function scriptOfNode(
  node: CanvasNode,
): { lang: ScriptLanguage; script: string } | null {
  const profile = scriptFamilyProfileFor(node.clazz);
  if (!profile) {
    return null;
  }
  const configuration = node.configuration ?? {};
  const lang: ScriptLanguage =
    configuration[profile.fields.lang] === 'TBEL' ? 'TBEL' : 'JS';
  const script = configuration[profile.fields[lang === 'TBEL' ? 'tbel' : 'js']];
  return {
    lang,
    script: typeof script === 'string' ? script : '',
  };
}

/** Parses an event-body JSON string field into the panel payload shape. */
function asJsonText(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : '';
}

/** metadata on the wire is a JSON object string; the panel takes a map. */
export function metadataFromBody(value: unknown): Record<string, string> {
  const text = asJsonText(value);
  if (!text) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
          k,
          String(v),
        ]),
      );
    }
  } catch {
    // unparsable metadata degrades to the panel default (empty map)
  }
  return {};
}

export function TestWithMessageModal({
  open,
  node,
  eventBody,
  tbelEnabled = true,
  onClose,
}: TestWithMessageModalProps) {
  const { formatMessage } = useIntl();
  const identity = scriptOfNode(node);
  if (!identity) {
    return null;
  }
  const profile = scriptFamilyProfileFor(node.clazz);

  const run = async (params: TestScriptParams): Promise<TestScriptResult> => {
    const result = await testRuleNodeScript(
      {
        script: params.script,
        scriptType: params.scriptType,
        argNames: params.argNames,
        msg: params.msg,
        metadata: params.metadata,
        msgType: params.msgType,
      },
      identity.lang,
    );
    return { output: result.output ?? '', error: result.error ?? '' };
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.ruleChain.events.testModalTitle',
        defaultMessage: 'Test script with this message',
      })}
      footer={null}
      width={860}
      destroyOnHidden
      onCancel={onClose}
      data-testid="rc-test-with-message-modal"
    >
      {eventBody && profile ? (
        <ScriptTestPanel
          key={`${eventBody.msgId ?? ''}-${eventBody.dataType ?? ''}`}
          scriptType={profile.scriptType}
          argNames={profile.argNames}
          script={identity.script}
          scriptLang={identity.lang}
          tbelEnabled={tbelEnabled}
          onRun={run}
          testIdPrefix="rc-test-with-message"
          initialMsg={asJsonText(eventBody.data)}
          initialMetadata={JSON.stringify(metadataFromBody(eventBody.metadata))}
          initialMsgType={
            typeof eventBody.msgType === 'string'
              ? eventBody.msgType
              : undefined
          }
        />
      ) : null}
    </Modal>
  );
}
