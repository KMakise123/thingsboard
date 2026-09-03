/**
 * Rule-chain import pipeline (M8 wave-3 D; spec §4.9 parity, ui-ngx
 * importRuleChain / validateImportedRuleChain :664-734).
 *
 * Flow (no in-memory staging — §7 登记项, the file is parsed directly):
 *   file → parseRuleChainImport (single-chain shape, tolerant of the bulk
 *   RuleChainData export shape by taking the FIRST pair) →
 *   migrateRuleChainImport (core legacy migrations: debugMode →
 *   debugSettings, ruleChainConnections → TbRuleChainInputNode nodes) →
 *   prepareRuleChainImport (create semantics: identity stripped, rootness
 *   and entry pointer reset) → POST /api/ruleChain (mints the id) →
 *   POST /api/ruleChain/metadata → the caller navigates to the editor.
 *
 * Export lives in export-draft.ts (ui-ngx prepareRuleChain strip parity).
 */

import { migrateRuleChainImport } from '@/core/rulechain/model';
import { saveRuleChain, saveRuleChainMetaData } from '@/services/tb/rule-chain';
import type {
  RuleChain,
  RuleChainImport,
  RuleChainMetaData,
} from '@/types/tb/rule-chain';

import {
  prepareRuleChainExport,
  prepareRuleChainMetaDataExport,
} from './export-draft';

/** Error carrying the locale key the import dialog should render. */
export class RuleChainImportError extends Error {
  /** ruleChains.list.* locale key describing the failure. */
  localeKey: string;

  constructor(localeKey: string) {
    super(localeKey);
    this.name = 'RuleChainImportError';
    this.localeKey = localeKey;
  }
}

/**
 * ui-ngx validateImportedRuleChain parity: `ruleChain` + `metadata` +
 * `ruleChain.name` required; `type` defaults to CORE. Accepts the bulk
 * `RuleChainData` export shape (`{ruleChains[], metadata[]}`) by importing
 * the first pair only (reported by the confirm dialog).
 */
export function parseRuleChainImport(text: string): {
  data: RuleChainImport;
  bulkCount?: number;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new RuleChainImportError('ruleChains.list.importParseError');
  }
  const bulk = parsed as {
    ruleChains?: Array<RuleChain>;
    metadata?: Array<RuleChainMetaData>;
  } | null;
  if (
    bulk !== null &&
    typeof bulk === 'object' &&
    Array.isArray(bulk.ruleChains) &&
    Array.isArray(bulk.metadata) &&
    bulk.ruleChains.length > 0
  ) {
    const first = migrateBulkPair(bulk.ruleChains[0], bulk.metadata[0]);
    return { data: first, bulkCount: bulk.ruleChains.length };
  }
  const single = parsed as Partial<RuleChainImport> | null;
  if (
    single === null ||
    typeof single !== 'object' ||
    typeof single.ruleChain !== 'object' ||
    single.ruleChain === null ||
    typeof single.ruleChain.name !== 'string' ||
    !single.ruleChain.name.trim() ||
    typeof single.metadata !== 'object' ||
    single.metadata === null
  ) {
    throw new RuleChainImportError('ruleChains.list.importInvalidError');
  }
  const data: RuleChainImport = {
    ruleChain: single.ruleChain,
    metadata: single.metadata,
  };
  if (!data.ruleChain.type) {
    // ui-ngx: the type is defaulted, not rejected
    data.ruleChain.type = 'CORE';
  }
  return { data };
}

function migrateBulkPair(
  ruleChain: RuleChain | undefined,
  metadata: RuleChainMetaData | undefined,
): RuleChainImport {
  if (!ruleChain || !metadata) {
    throw new RuleChainImportError('ruleChains.list.importInvalidError');
  }
  if (!ruleChain.type) {
    ruleChain.type = 'CORE';
  }
  return { ruleChain, metadata };
}

/**
 * Create semantics (task 新建语义): the import never reuses a carried
 * identity — id / createdTime / tenantId / externalId / version are
 * stripped, root → false, firstRuleNodeId → null (the metadata POST after
 * the chain POST re-establishes the entry node through firstNodeIndex).
 */
export function prepareRuleChainImport(data: RuleChainImport): RuleChainImport {
  const ruleChain = prepareRuleChainExport(data.ruleChain);
  // the metadata save runs right after this chain is minted — the metadata
  // carries no version of its own yet
  const metadata = prepareRuleChainMetaDataExport(data.metadata);
  return { ruleChain, metadata };
}

export interface ImportReport {
  name: string;
  nodeCount: number;
  connectionCount: number;
  noteCount: number;
  /** debugMode → debugSettings migrations applied by the core migrator. */
  migratedDebugNodes: number;
  /** ruleChainConnections → TbRuleChainInputNode migrations applied. */
  migratedCrossChain: number;
  /** bulk RuleChainData file — total chains it carried. */
  bulkCount?: number;
}

/**
 * Builds the confirm-dialog report. MUST run on the PRE-migration data: the
 * debugMode flags and ruleChainConnections are exactly what the migration
 * consumes and strips.
 */
export function describeImport(data: RuleChainImport): ImportReport {
  return {
    name: data.ruleChain.name,
    nodeCount: data.metadata.nodes?.length ?? 0,
    connectionCount: data.metadata.connections?.length ?? 0,
    noteCount: data.metadata.notes?.length ?? 0,
    migratedDebugNodes:
      data.metadata.nodes?.filter((node) => node.debugMode === true).length ??
      0,
    migratedCrossChain: data.metadata.ruleChainConnections?.length ?? 0,
  };
}

/**
 * Full import: parse (from raw text) → legacy migrations → create-prepare →
 * POST the chain entity (mints the id) → POST the metadata under that id.
 * Resolves with the saved chain so the caller can navigate to the editor.
 */
export async function importRuleChainFromFile(
  text: string,
): Promise<{ chain: RuleChain; report: ImportReport }> {
  const { data, bulkCount } = parseRuleChainImport(text);
  const report = {
    ...describeImport(data),
    ...(bulkCount !== undefined ? { bulkCount } : {}),
  };
  const migrated = migrateRuleChainImport(data);
  const prepared = prepareRuleChainImport(migrated);
  // POST /api/ruleChain (upsert; no id = create) mints the chain id
  const saved = await saveRuleChain(prepared.ruleChain);
  const chainId = saved.id?.id;
  if (!chainId) {
    throw new RuleChainImportError('ruleChains.list.importFailed');
  }
  await saveRuleChainMetaData({
    ...prepared.metadata,
    ruleChainId: saved.id,
  });
  return { chain: saved, report };
}
