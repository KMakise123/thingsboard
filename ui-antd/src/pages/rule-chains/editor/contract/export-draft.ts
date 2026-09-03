/**
 * Draft/chain JSON export adapters (M8 wave-3 D; ui-ngx
 * import-export.service prepareRuleChain / prepareRuleChainMetaData :910-926
 * strip parity).
 *
 * Exported file shape = the single-chain import shape `{ruleChain,
 * metadata}` (ui-ngx RuleChainImport), so a conflict-time "export local JSON
 * and give up" file is re-importable through the list-page import with no
 * extra mapping.
 *
 * Strip rules (identity/audit fields the import reassigns):
 *  - chain: id / createdTime / tenantId / externalId / version;
 *    firstRuleNodeId → null and root → false (ui-ngx prepareRuleChain — the
 *    importing tenant re-decides the entry node and rootness).
 *  - metadata: ruleChainId dropped; per node id / createdTime / tenantId /
 *    externalId / version / ruleChainId dropped (fresh nodes must be minted
 *    server-side — a carried id that is not in the target DB is silently
 *    dropped by the backend, brief §1).
 */

import { canvasToMetadata } from '@/core/rulechain/model';
import type { CanvasRuleChain } from '@/core/rulechain/types';
import type {
  RuleChain,
  RuleChainImport,
  RuleChainMetaData,
} from '@/types/tb/rule-chain';

const CHAIN_EXPORT_STRIP = [
  'id',
  'createdTime',
  'tenantId',
  'externalId',
  'version',
] as const;

const NODE_EXPORT_STRIP = [
  'id',
  'createdTime',
  'tenantId',
  'externalId',
  'version',
  'ruleChainId',
] as const;

/** ui-ngx prepareRuleChain parity over the chain entity. */
export function prepareRuleChainExport(chain: RuleChain): RuleChain {
  const clone = JSON.parse(JSON.stringify(chain)) as Record<string, unknown>;
  for (const field of CHAIN_EXPORT_STRIP) {
    delete clone[field];
  }
  clone.firstRuleNodeId = null;
  clone.root = false;
  return clone as RuleChain;
}

/** ui-ngx prepareRuleChainMetaData parity over the graph body. */
export function prepareRuleChainMetaDataExport(
  metadata: RuleChainMetaData,
): RuleChainMetaData {
  const clone = JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
  delete clone.ruleChainId;
  delete clone.version;
  const nodes = (clone.nodes ?? []) as Array<Record<string, unknown>>;
  clone.nodes = nodes.map((node) => {
    for (const field of NODE_EXPORT_STRIP) {
      delete node[field];
    }
    return node;
  });
  return clone as RuleChainMetaData;
}

/** Serializes a canvas draft into the portable single-chain import shape. */
export function buildRuleChainExport(draft: CanvasRuleChain): RuleChainImport {
  return {
    ruleChain: prepareRuleChainExport(draft.chain),
    metadata: prepareRuleChainMetaDataExport(canvasToMetadata(draft)),
  };
}

/** Downloads `data` as `{name}.json` (dashboards export parity). */
export function downloadRuleChainJson(data: unknown, name: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface ExportDraftRuleChainArgs {
  /** The chain entity meta the draft was loaded under (carries the name). */
  chain: RuleChain;
  draft: CanvasRuleChain;
}

/**
 * 409 Option C export — download the UNSAVED local draft as a portable
 * `{ruleChain, metadata}` JSON file named `{chain}.json`.
 */
export function exportDraftRuleChain({
  chain,
  draft,
}: ExportDraftRuleChainArgs): void {
  downloadRuleChainJson(buildRuleChainExport(draft), chain.name);
}

/** Row export — GET-truth export of a saved chain (list page action). */
export function exportRuleChainData(
  chain: RuleChain,
  metadata: RuleChainMetaData,
): RuleChainImport {
  return {
    ruleChain: prepareRuleChainExport(chain),
    metadata: prepareRuleChainMetaDataExport(metadata),
  };
}
