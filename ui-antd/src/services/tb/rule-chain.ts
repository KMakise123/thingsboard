/**
 * Rule chain transport (M8 surface).
 *
 * Endpoints cross-checked against backend RuleChainController
 * (application/.../controller/RuleChainController.java, all
 * TENANT_ADMIN-scoped) and ui-ngx core/http/rule-chain.service.ts.
 * The EDGE business surface (edge assignment / template root /
 * auto-assign) is deliberately NOT wired (brief §0 范围).
 */

import {
  type PageData,
  type PageLink,
  pageLinkToQueryParams,
} from '@/types/tb/page';
import type {
  RuleChain,
  RuleChainMetaData,
  RuleChainType,
  RuleNodeComponentDescriptor,
  RuleNodeComponentType,
  ScriptLanguage,
} from '@/types/tb/rule-chain';

import { tbHttp } from './http';

/** GET /api/ruleChains — tenant-scope paged rule chain list. */
export async function getRuleChains(
  pageLink: PageLink,
  type: RuleChainType = 'CORE',
): Promise<PageData<RuleChain>> {
  return tbHttp.get<PageData<RuleChain>>('/api/ruleChains', {
    ...pageLinkToQueryParams(pageLink),
    type,
  });
}

/** GET /api/ruleChain/{ruleChainId} — full chain entity. */
export async function getRuleChainById(ruleChainId: string): Promise<RuleChain> {
  return tbHttp.get<RuleChain>(`/api/ruleChain/${ruleChainId}`);
}

/**
 * POST /api/ruleChain — create or update the chain entity (upsert: with id
 * = update, without = create; tenantId is force-overwritten server-side).
 */
export async function saveRuleChain(chain: RuleChain): Promise<RuleChain> {
  return tbHttp.post<RuleChain>('/api/ruleChain', chain);
}

/** DELETE /api/ruleChain/{ruleChainId} — root/referenced chains are rejected. */
export async function deleteRuleChain(ruleChainId: string): Promise<void> {
  await tbHttp.delete(`/api/ruleChain/${ruleChainId}`);
}

/**
 * POST /api/ruleChain/{ruleChainId}/root — make this chain the tenant's
 * root chain (M8 wave-3 D list page; the previous root is replaced).
 */
export async function setRootRuleChain(ruleChainId: string): Promise<RuleChain> {
  return tbHttp.post<RuleChain>(`/api/ruleChain/${ruleChainId}/root`);
}

/** GET /api/ruleChain/{ruleChainId}/metadata — graph body (nodes/edges/notes). */
export async function getRuleChainMetaData(
  ruleChainId: string,
): Promise<RuleChainMetaData> {
  return tbHttp.get<RuleChainMetaData>(
    `/api/ruleChain/${ruleChainId}/metadata`,
  );
}

/**
 * POST /api/ruleChain/metadata — save the graph; returns the SAVED metadata
 * (new optimistic-lock version backfilled). `updateRelated` propagates
 * label-rename changes into other chains referencing this one's output.
 */
export async function saveRuleChainMetaData(
  metadata: RuleChainMetaData,
  updateRelated = false,
): Promise<RuleChainMetaData> {
  return tbHttp.post<RuleChainMetaData>(
    '/api/ruleChain/metadata',
    metadata,
    { updateRelated },
  );
}

/**
 * GET /api/components — rule node component descriptors for the given
 * component types; `defaultConfiguration` (inside
 * configurationDescriptor.nodeDefinition) seeds the config form generator.
 */
export async function getRuleNodeComponents(
  componentTypes: Array<RuleNodeComponentType>,
  ruleChainType: RuleChainType = 'CORE',
): Promise<Array<RuleNodeComponentDescriptor>> {
  return tbHttp.get<Array<RuleNodeComponentDescriptor>>('/api/components', {
    componentTypes: componentTypes.join(','),
    ruleChainType,
  });
}

/** GET /api/ruleChain/{ruleChainId}/output/labels — labels other chains may bind. */
export async function getRuleChainOutputLabels(
  ruleChainId: string,
): Promise<Array<string>> {
  return tbHttp.get<Array<string>>(
    `/api/ruleChain/${ruleChainId}/output/labels`,
  );
}

/** GET /api/ruleChain/tbelEnabled — whether TBEL script execution is enabled. */
export async function getTbelEnabled(): Promise<boolean> {
  return tbHttp.get<boolean>('/api/ruleChain/tbelEnabled');
}

/**
 * GET /api/ruleNode/{ruleNodeId}/debugIn — latest input debug event body
 * (msg/metadata/msgType carrier, ui-ngx DebugRuleNodeEventBody); the script
 * test panel prefills its payload from it. null when the node has no debug
 * input yet.
 */
export interface RuleNodeDebugInput {
  msgType?: string;
  msg?: string;
  metadata?: string;
  data?: string;
  dataType?: string;
  error?: string;
  [key: string]: unknown;
}

export async function getRuleNodeDebugIn(
  ruleNodeId: string,
): Promise<RuleNodeDebugInput | null> {
  return tbHttp.get<RuleNodeDebugInput | null>(
    `/api/ruleNode/${ruleNodeId}/debugIn`,
  );
}

/** Body of POST /api/ruleChain/testScript (ui-ngx TestScriptInputParams). */
export interface RuleNodeScriptTestParams {
  script: string;
  /** 'update' | 'generate' | 'filter' | 'switch' | 'json' | 'string'. */
  scriptType: string;
  argNames: Array<string>;
  /** JSON-stringified message payload. */
  msg: string;
  metadata: Record<string, string>;
  msgType: string;
  [key: string]: unknown;
}

/** Response of the script test bench (ui-ngx EntityTestScriptResult). */
export interface RuleNodeScriptTestResult {
  output?: string;
  error?: string;
  [key: string]: unknown;
}

/** POST /api/ruleChain/testScript?scriptLang=JS|TBEL — run a script against a payload. */
export async function testRuleNodeScript(
  params: RuleNodeScriptTestParams,
  scriptLang: ScriptLanguage,
): Promise<RuleNodeScriptTestResult> {
  return tbHttp.post<RuleNodeScriptTestResult>(
    '/api/ruleChain/testScript',
    params,
    { scriptLang },
  );
}
