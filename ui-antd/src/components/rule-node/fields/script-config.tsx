/**
 * Script family (P0 families 1+2): the scriptLang/jsScript/tbelScript triple
 * of TbJsFilterNode / TbJsSwitchNode (the 'switch' registry alias) /
 * TbTransformMsgNode / TbLogNode / TbMsgGeneratorNode — plus the SAME triple
 * under its alarm-details field names (alarmDetailsBuildJs/Tbel) for
 * create/clear alarm. Per-clazz facts (testScript scriptType + argNames +
 * field names) mirror ui-ngx `*-config.component.ts` testScript calls.
 *
 * The editor is the S-wave ScriptEditor; the Test button opens the S-wave
 * ScriptTestPanel in a Modal. Runs go through the services layer
 * (testRuleNodeScript) with the CURRENT scriptLang; TBEL availability comes
 * from a long-stale react-query on getTbelEnabled (HTTP iron rule: services
 * only; component-scoped react-query allowed).
 */
import { BugOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Modal } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  ScriptEditor,
  type ScriptLanguage,
} from '@/components/script/ScriptEditor';
import {
  ScriptTestPanel,
  type TestScriptResult,
} from '@/components/script/ScriptTestPanel';
import { getTbelEnabled, testRuleNodeScript } from '@/services/tb/rule-chain';

import { RULE_NODE_CLAZZES } from '../clazzes';
import type { RuleNodeConfigComponentProps } from '../registry';

/** Backend testScript discriminator + field mapping for one script node. */
export interface ScriptFamilyProfile {
  /** POST /api/ruleChain/testScript `scriptType`. */
  scriptType: 'filter' | 'switch' | 'update' | 'string' | 'generate' | 'json';
  /** Backend binds the script arguments by these names. */
  argNames: string[];
  /** Configuration keys of the language + both script bodies. */
  fields: { lang: string; js: string; tbel: string };
  /** i18n key of the per-node test label (ui-ngx test-*-function). */
  testLabelKey: string;
}

const TRIPLE_FIELDS = {
  lang: 'scriptLang',
  js: 'jsScript',
  tbel: 'tbelScript',
};
const ALARM_DETAIL_FIELDS = {
  lang: 'scriptLang',
  js: 'alarmDetailsBuildJs',
  tbel: 'alarmDetailsBuildTbel',
};

const PROFILES: Record<string, ScriptFamilyProfile> = {
  [RULE_NODE_CLAZZES.jsFilter]: {
    scriptType: 'filter',
    argNames: ['msg', 'metadata', 'msgType'],
    fields: TRIPLE_FIELDS,
    testLabelKey: 'editor.ruleNode.test.filter',
  },
  [RULE_NODE_CLAZZES.jsSwitch]: {
    scriptType: 'switch',
    argNames: ['msg', 'metadata', 'msgType'],
    fields: TRIPLE_FIELDS,
    testLabelKey: 'editor.ruleNode.test.switch',
  },
  [RULE_NODE_CLAZZES.transformMsg]: {
    scriptType: 'update',
    argNames: ['msg', 'metadata', 'msgType'],
    fields: TRIPLE_FIELDS,
    testLabelKey: 'editor.ruleNode.test.transform',
  },
  [RULE_NODE_CLAZZES.log]: {
    scriptType: 'string',
    argNames: ['msg', 'metadata', 'msgType'],
    fields: TRIPLE_FIELDS,
    testLabelKey: 'editor.ruleNode.test.log',
  },
  [RULE_NODE_CLAZZES.msgGenerator]: {
    scriptType: 'generate',
    argNames: ['prevMsg', 'prevMetadata', 'prevMsgType'],
    fields: TRIPLE_FIELDS,
    testLabelKey: 'editor.ruleNode.test.generate',
  },
  [RULE_NODE_CLAZZES.createAlarm]: {
    scriptType: 'json',
    argNames: ['msg', 'metadata', 'msgType'],
    fields: ALARM_DETAIL_FIELDS,
    testLabelKey: 'editor.ruleNode.test.details',
  },
  [RULE_NODE_CLAZZES.clearAlarm]: {
    scriptType: 'json',
    argNames: ['msg', 'metadata', 'msgType'],
    fields: ALARM_DETAIL_FIELDS,
    testLabelKey: 'editor.ruleNode.test.details',
  },
};

export function scriptFamilyProfileFor(
  clazz: string,
): ScriptFamilyProfile | undefined {
  return PROFILES[clazz];
}

/**
 * TBEL availability for the language toggle. While unknown (loading or
 * backend unreachable) it reports false — the safe side is JS-only, mirroring
 * ui-ngx falling back to JS when tbelEnabled is off.
 */
export function useTbelEnabled(): boolean {
  const query = useQuery({
    queryKey: ['ruleChain', 'tbelEnabled'],
    queryFn: getTbelEnabled,
    staleTime: 30 * 60 * 1000,
  });
  return query.data === true;
}

export interface ScriptFieldsProps {
  profile: ScriptFamilyProfile;
  configuration: Record<string, unknown>;
  /** Shallow patch into the configuration tree (registry contract). */
  onChange(next: Record<string, unknown>): void;
  tbelEnabled: boolean;
  disabled?: boolean;
  testIdPrefix?: string;
}

/**
 * The shared script UI: language Segmented + code editor + Test button with
 * the embedded test panel modal. Used by the script family AND the alarm
 * families (alarm-details triple).
 */
export function ScriptFields({
  profile,
  configuration,
  onChange,
  tbelEnabled,
  disabled = false,
  testIdPrefix = 'script-fields',
}: ScriptFieldsProps) {
  const intl = useIntl();
  const [testOpen, setTestOpen] = useState(false);

  const lang: ScriptLanguage =
    configuration[profile.fields.lang] === 'TBEL' ? 'TBEL' : 'JS';
  const jsScript = asText(configuration[profile.fields.js]);
  const tbelScript = asText(configuration[profile.fields.tbel]);
  const activeScript = lang === 'TBEL' ? tbelScript : jsScript;

  const handleEditorChange = (patch: {
    scriptLang?: ScriptLanguage;
    jsScript?: string;
    tbelScript?: string;
  }) => {
    const next: Record<string, unknown> = {};
    if (patch.scriptLang !== undefined) {
      next[profile.fields.lang] = patch.scriptLang;
    }
    if (patch.jsScript !== undefined) {
      next[profile.fields.js] = patch.jsScript;
    }
    if (patch.tbelScript !== undefined) {
      next[profile.fields.tbel] = patch.tbelScript;
    }
    onChange(next);
  };

  const runTest = (params: {
    script: string;
    scriptType: string;
    argNames: string[];
    msg: string;
    metadata: Record<string, string>;
    msgType: string;
  }): Promise<TestScriptResult> =>
    testRuleNodeScript(params, lang).then((result) => ({
      output: result.output ?? '',
      error: result.error ?? '',
    }));

  return (
    <div data-testid={testIdPrefix}>
      <ScriptEditor
        scriptLang={lang}
        jsScript={jsScript}
        tbelScript={tbelScript}
        onChange={handleEditorChange}
        tbelEnabled={tbelEnabled}
        disabled={disabled}
        height={220}
        testIdPrefix={`${testIdPrefix}-editor`}
      />
      <div style={{ marginTop: 8 }}>
        <Button
          type="primary"
          ghost
          icon={<BugOutlined />}
          disabled={disabled}
          data-testid={`${testIdPrefix}-test-button`}
          onClick={() => setTestOpen(true)}
        >
          {intl.formatMessage({ id: profile.testLabelKey })}
        </Button>
      </div>
      <Modal
        open={testOpen}
        title={intl.formatMessage({ id: profile.testLabelKey })}
        footer={null}
        width={860}
        destroyOnHidden
        onCancel={() => setTestOpen(false)}
      >
        <ScriptTestPanel
          scriptType={profile.scriptType}
          argNames={profile.argNames}
          script={activeScript}
          scriptLang={lang}
          tbelEnabled={tbelEnabled}
          onRun={runTest}
          testIdPrefix={`${testIdPrefix}-test-panel`}
        />
      </Modal>
    </div>
  );
}

/** The script-family registry component (also serves the switch alias). */
export function ScriptFamilyConfig(props: RuleNodeConfigComponentProps) {
  const profile = scriptFamilyProfileFor(props.clazz);
  const tbelEnabled = useTbelEnabled();
  if (!profile) {
    return null;
  }
  return (
    <ScriptFields
      profile={profile}
      configuration={props.configuration}
      onChange={props.onChange}
      tbelEnabled={tbelEnabled}
      disabled={props.disabled}
      testIdPrefix={`${props.testIdPrefix ?? 'node-config'}-script`}
    />
  );
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
