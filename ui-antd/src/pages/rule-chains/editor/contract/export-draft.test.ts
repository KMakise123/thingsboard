/**
 * Export adapters (M8 wave-3 D): ui-ngx prepareRuleChain /
 * prepareRuleChainMetaData strip parity, the Option-C draft export, and a
 * full export → import round-trip through the core legacy migrator (the
 * exported file must be re-importable as-is).
 */
import { describe, expect, it, vi } from 'vitest';

import { migrateRuleChainImport } from '@/core/rulechain/model';
import { EntityType } from '@/types/tb/entity';
import type { RuleChain } from '@/types/tb/rule-chain';

import { rowDraft } from '../canvas/test-helpers';
import {
  buildRuleChainExport,
  exportDraftRuleChain,
  prepareRuleChainExport,
} from './export-draft';

function serverChain(): RuleChain {
  return {
    id: { entityType: EntityType.RULE_CHAIN, id: 'rc-1' },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 't-1' },
    name: 'Root chain',
    type: 'CORE',
    root: true,
    version: 4,
    firstRuleNodeId: { entityType: EntityType.RULE_NODE, id: 'n-1' },
    externalId: { entityType: EntityType.RULE_CHAIN, id: 'ext-1' },
  } as RuleChain;
}

describe('prepareRuleChainExport — strip rules', () => {
  it('drops identity/audit fields and resets rootness + entry pointer', () => {
    const prepared = prepareRuleChainExport(serverChain());
    expect(prepared.id).toBeUndefined();
    expect(prepared.createdTime).toBeUndefined();
    expect(prepared.tenantId).toBeUndefined();
    expect(prepared.externalId).toBeUndefined();
    expect(prepared.version).toBeUndefined();
    // ui-ngx prepareRuleChain: the importer re-decides these
    expect(prepared.firstRuleNodeId).toBeNull();
    expect(prepared.root).toBe(false);
    // display fields survive
    expect(prepared.name).toBe('Root chain');
    expect(prepared.type).toBe('CORE');
  });
});

describe('buildRuleChainExport — draft → portable file shape', () => {
  it('produces {ruleChain, metadata} with stripped nodes', () => {
    const draft = rowDraft(2, true);
    draft.chain = {
      ...serverChain(),
      version: 4,
    };
    // simulate a draft node carrying its wire id (saved node)
    draft.nodes['local-0'].ruleNodeId = {
      entityType: EntityType.RULE_NODE,
      id: 'n-1',
    };

    const data = buildRuleChainExport(draft);

    expect(data.ruleChain.name).toBe('Root chain');
    expect(data.metadata.ruleChainId).toBeUndefined();
    expect(data.metadata.version).toBeUndefined();
    expect(data.metadata.nodes[0].id).toBeUndefined();
    expect(data.metadata.nodes[0].ruleChainId).toBeUndefined();
    expect(data.metadata.nodes[0].additionalInfo?.layoutX).toBe(0);
    // connections survive the strip
    expect(data.metadata.connections).toEqual([
      { fromIndex: 0, toIndex: 1, type: 'Success' },
    ]);
  });
});

describe('export → import round-trip', () => {
  it('the exported file passes the legacy migrator unchanged', () => {
    const draft = rowDraft(2, true);
    draft.chain = serverChain();
    const exported = buildRuleChainExport(draft);

    // the importer always runs the legacy migrations over the file
    const migrated = migrateRuleChainImport(
      JSON.parse(JSON.stringify(exported)),
    );

    expect(migrated.ruleChain.name).toBe('Root chain');
    expect(migrated.ruleChain.id).toBeUndefined();
    expect(migrated.metadata.nodes).toHaveLength(2);
    expect(migrated.metadata.connections).toEqual([
      { fromIndex: 0, toIndex: 1, type: 'Success' },
    ]);
  });
});

describe('exportDraftRuleChain — Option C download', () => {
  it('downloads the draft as {chain}.json', () => {
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock');
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const click = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement;
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
      tag === 'a'
        ? anchor
        : originalCreate(tag)) as typeof document.createElement);

    const draft = rowDraft(1);
    draft.chain = serverChain();
    exportDraftRuleChain({ chain: serverChain(), draft });

    expect(anchor.download).toBe('Root chain.json');
    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    vi.restoreAllMocks();
  });
});
