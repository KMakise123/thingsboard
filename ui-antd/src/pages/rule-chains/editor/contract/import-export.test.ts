/**
 * Rule-chain import pipeline tests (M8 wave-3 D; spec §4.9 parity): file
 * parsing (single + tolerant bulk shape), legacy migration application,
 * create-semantic stripping, and the full POST sequence. Export strip
 * round-trip is covered in export-draft.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityType } from '@/types/tb/entity';
import type { RuleChainImport } from '@/types/tb/rule-chain';

const serviceMock = vi.hoisted(() => ({
  saveRuleChain: vi.fn(),
  saveRuleChainMetaData: vi.fn(),
}));
vi.mock('@/services/tb/rule-chain', () => serviceMock);

import {
  describeImport,
  importRuleChainFromFile,
  parseRuleChainImport,
  prepareRuleChainImport,
  RuleChainImportError,
} from './import-export';

function legacyImport(): RuleChainImport {
  return {
    ruleChain: {
      id: { entityType: EntityType.RULE_CHAIN, id: 'rc-src' },
      createdTime: 1,
      tenantId: { entityType: EntityType.TENANT, id: 't-src' },
      name: 'Imported chain',
      type: 'CORE',
      root: true,
      version: 7,
      firstRuleNodeId: { entityType: EntityType.RULE_NODE, id: 'n-src' },
      externalId: { entityType: EntityType.RULE_CHAIN, id: 'ext-src' },
    },
    metadata: {
      ruleChainId: { entityType: EntityType.RULE_CHAIN, id: 'rc-src' },
      version: 7,
      firstNodeIndex: 0,
      nodes: [
        {
          id: { entityType: EntityType.RULE_NODE, id: 'n-src' },
          type: 'org.thingsboard.rule.engine.filter.TbJsFilterNode',
          name: 'filter',
          debugMode: true,
          singletonMode: false,
          configurationVersion: 0,
          configuration: {},
          additionalInfo: { layoutX: 10, layoutY: 20 },
        },
        {
          type: 'org.thingsboard.rule.engine.transform.TbTransformMsgNode',
          name: 'transform',
          singletonMode: false,
          configurationVersion: 0,
          configuration: {},
          additionalInfo: { layoutX: 200, layoutY: 20 },
        },
      ],
      connections: [{ fromIndex: 0, toIndex: 1, type: 'Success' }],
      ruleChainConnections: [
        {
          fromIndex: 1,
          targetRuleChainId: {
            entityType: EntityType.RULE_CHAIN,
            id: 'rc-other',
          },
          type: 'Success',
        },
      ],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parseRuleChainImport', () => {
  it('accepts the single-chain shape and defaults the type to CORE', () => {
    const data = legacyImport();
    delete data.ruleChain.type;
    const { data: parsed } = parseRuleChainImport(JSON.stringify(data));
    expect(parsed.ruleChain.name).toBe('Imported chain');
    expect(parsed.ruleChain.type).toBe('CORE');
  });

  it('tolerates the bulk RuleChainData shape by taking the first pair', () => {
    const first = legacyImport();
    const text = JSON.stringify({
      ruleChains: [first.ruleChain, { name: 'Second', type: 'CORE' }],
      metadata: [first.metadata, { nodes: [], connections: [] }],
    });
    const { data: parsed, bulkCount } = parseRuleChainImport(text);
    expect(bulkCount).toBe(2);
    expect(parsed.ruleChain.name).toBe('Imported chain');
  });

  it('rejects unparsable text and shape-less objects with locale keys', () => {
    expect(() => parseRuleChainImport('not json')).toThrow(
      RuleChainImportError,
    );
    expect(() => parseRuleChainImport('{"ruleChain":{}}')).toThrowError(
      expect.objectContaining({
        localeKey: 'ruleChains.list.importInvalidError',
      }),
    );
  });
});

describe('prepareRuleChainImport — create semantics', () => {
  it('strips identity and resets rootness before the create POST', () => {
    const prepared = prepareRuleChainImport(legacyImport());
    expect(prepared.ruleChain.id).toBeUndefined();
    expect(prepared.ruleChain.tenantId).toBeUndefined();
    expect(prepared.ruleChain.externalId).toBeUndefined();
    expect(prepared.ruleChain.createdTime).toBeUndefined();
    expect(prepared.ruleChain.version).toBeUndefined();
    expect(prepared.ruleChain.root).toBe(false);
    expect(prepared.ruleChain.firstRuleNodeId).toBeNull();
    // metadata carries no stale optimistic-lock version or chain id
    expect(prepared.metadata.version).toBeUndefined();
    expect(prepared.metadata.ruleChainId).toBeUndefined();
  });
});

describe('describeImport — migration report', () => {
  it('counts the legacy pieces the migrator will consume', () => {
    const report = describeImport(legacyImport());
    expect(report.migratedDebugNodes).toBe(1);
    expect(report.migratedCrossChain).toBe(1);
    expect(report.nodeCount).toBe(2);
    expect(report.connectionCount).toBe(1);
  });
});

describe('importRuleChainFromFile — full pipeline', () => {
  it('migrates, strips, POSTs the chain then the metadata under the minted id', async () => {
    serviceMock.saveRuleChain.mockResolvedValue({
      ...legacyImport().ruleChain,
      id: { entityType: EntityType.RULE_CHAIN, id: 'rc-new' },
      version: 1,
    });
    serviceMock.saveRuleChainMetaData.mockResolvedValue({
      ruleChainId: { entityType: EntityType.RULE_CHAIN, id: 'rc-new' },
      version: 1,
      nodes: [],
      connections: [],
    });

    const { chain, report } = await importRuleChainFromFile(
      JSON.stringify(legacyImport()),
    );

    expect(chain.id?.id).toBe('rc-new');
    // outgoing chain: create shape
    const chainPayload = serviceMock.saveRuleChain.mock.calls[0]?.[0];
    expect(chainPayload.id).toBeUndefined();
    expect(chainPayload.root).toBe(false);
    // legacy migrations landed in the outgoing metadata
    const metaPayload = serviceMock.saveRuleChainMetaData.mock.calls[0]?.[0];
    expect(metaPayload.ruleChainId.id).toBe('rc-new');
    // debugMode → debugSettings
    expect(metaPayload.nodes[0].debugSettings).toEqual({
      failuresEnabled: true,
      allEnabled: true,
    });
    expect(metaPayload.nodes[0].debugMode).toBeUndefined();
    // ruleChainConnections → a TbRuleChainInputNode + connection
    expect(metaPayload.nodes).toHaveLength(3);
    expect(metaPayload.nodes[2].type).toBe(
      'org.thingsboard.rule.engine.flow.TbRuleChainInputNode',
    );
    expect(metaPayload.nodes[2].configuration.ruleChainId).toBe('rc-other');
    expect(metaPayload.connections.at(-1)).toEqual({
      fromIndex: 1,
      toIndex: 2,
      type: 'Success',
    });
    expect(metaPayload.ruleChainConnections).toBeUndefined();
    // no carried node ids reach the wire
    expect(metaPayload.nodes[0].id).toBeUndefined();
    // the report documents both migrations
    expect(report).toMatchObject({
      migratedDebugNodes: 1,
      migratedCrossChain: 1,
      nodeCount: 2,
    });
  });

  it('a chain POST without a minted id aborts before the metadata save', async () => {
    serviceMock.saveRuleChain.mockResolvedValue({ name: 'x' });
    await expect(
      importRuleChainFromFile(JSON.stringify(legacyImport())),
    ).rejects.toThrow(RuleChainImportError);
    expect(serviceMock.saveRuleChainMetaData).not.toHaveBeenCalled();
  });
});
