/**
 * Rule-chain canvas conversion contract (M8 brief §2):
 *  - metadata ↔ canvas 双向转换（聚合边 ↔ connections 多对一、
 *    INPUT 虚拟节点 ↔ firstNodeIndex、layout Math.round、uid 剥离）
 *  - round-trip 逐字段稳定
 *  - 旧格式迁移两处（debugMode → debugSettings、ruleChainConnections →
 *    TbRuleChainInputNode 节点 + connection）
 */
import { describe, expect, it } from 'vitest';
import { type EntityIdOf, EntityType } from '@/types/tb/entity';
import type {
  RuleChainImport,
  RuleChainMetaData,
  RuleNode,
} from '@/types/tb/rule-chain';

import {
  canvasToMetadata,
  metadataToCanvas,
  migrateRuleChainImport,
} from './model';
import { RULE_CHAIN_INPUT_NODE_CLAZZ } from './types';

const chainId = (id: string): EntityIdOf<EntityType.RULE_CHAIN> => ({
  entityType: EntityType.RULE_CHAIN,
  id,
});
const nodeId = (id: string): EntityIdOf<EntityType.RULE_NODE> => ({
  entityType: EntityType.RULE_NODE,
  id,
});

function metaFixture(): RuleChainMetaData {
  return {
    ruleChainId: chainId('chain-1'),
    version: 7,
    firstNodeIndex: 1,
    nodes: [
      {
        id: nodeId('node-a'),
        createdTime: 111,
        ruleChainId: chainId('chain-1'),
        type: 'org.thingsboard.rule.engine.filter.TbMsgTypeFilterNode',
        name: 'Message type filter',
        configuration: { messageTypes: ['POST_TELEMETRY_REQUEST'] },
        configurationVersion: 0,
        additionalInfo: {
          layoutX: 100.4,
          layoutY: 60.6,
          description: 'desc-0',
          producerExtra: 'keep-me',
        },
      },
      {
        id: nodeId('node-b'),
        type: 'org.thingsboard.rule.engine.transform.TbChangeOriginatorNode',
        name: 'Change originator',
        configuration: { originatorSource: 'RELATED' },
        debugSettings: { failuresEnabled: true },
        singletonMode: true,
        queueName: 'Main',
        additionalInfo: { layoutX: 200.2, layoutY: 120 },
      },
      {
        id: nodeId('node-c'),
        type: 'org.thingsboard.rule.engine.action.TbCreateAlarmNode',
        name: 'Create alarm',
        configuration: { alarmType: 'General' },
        debugMode: true,
        additionalInfo: { layoutX: 300, layoutY: 200.5 },
      },
    ],
    connections: [
      { fromIndex: 0, toIndex: 1, type: 'Success' },
      { fromIndex: 0, toIndex: 1, type: 'Failure' },
      { fromIndex: 1, toIndex: 2, type: 'True' },
      { fromIndex: 1, toIndex: 2, type: 'Success' },
      { fromIndex: 1, toIndex: 2, type: 'Other' },
    ],
    notes: [
      {
        id: 'note-uuid-1',
        x: 10,
        y: 20,
        width: 200,
        height: 120,
        content: 'hello',
        backgroundColor: '#FFF9C4',
      },
      { x: 0, y: 0, width: 200, height: 120, content: 'fresh note' },
    ],
  };
}

function chainFixture() {
  return {
    id: chainId('chain-1'),
    createdTime: 1,
    tenantId: {
      entityType: EntityType.TENANT,
      id: 't1',
    } as EntityIdOf<EntityType.TENANT>,
    name: 'Root Rule Chain',
    type: 'CORE' as const,
    root: true,
    version: 7,
  };
}

describe('metadataToCanvas', () => {
  it('keys nodes by local uid, lifts geometry (Math.round) and node fields', () => {
    const canvas = metadataToCanvas(metaFixture(), chainFixture());

    const uids = Object.keys(canvas.nodes);
    expect(uids).toEqual(['local-0', 'local-1', 'local-2']);

    const first = canvas.nodes['local-0'];
    expect(first.ruleNodeId).toEqual(nodeId('node-a'));
    expect(first.clazz).toBe(
      'org.thingsboard.rule.engine.filter.TbMsgTypeFilterNode',
    );
    expect(first.name).toBe('Message type filter');
    expect(first.x).toBe(100); // Math.round(100.4)
    expect(first.y).toBe(61); // Math.round(60.6)
    expect(first.description).toBe('desc-0');
    expect(first.additionalInfo).toEqual({ producerExtra: 'keep-me' });
    expect(first.configuration).toEqual({
      messageTypes: ['POST_TELEMETRY_REQUEST'],
    });

    const second = canvas.nodes['local-1'];
    expect(second.x).toBe(200);
    expect(second.y).toBe(120);
    expect(second.debugSettings).toEqual({ failuresEnabled: true });
    expect(second.singletonMode).toBe(true);
    expect(second.queueName).toBe('Main');
  });

  it('aggregates connections into edges per (from,to) pair, labels in wire order', () => {
    const canvas = metadataToCanvas(metaFixture(), chainFixture());

    expect(canvas.edges).toEqual([
      {
        id: 'local-e0',
        sourceUid: 'local-0',
        targetUid: 'local-1',
        labels: ['Success', 'Failure'],
      },
      {
        id: 'local-e1',
        sourceUid: 'local-1',
        targetUid: 'local-2',
        labels: ['True', 'Success', 'Other'],
      },
    ]);
  });

  it('maps firstNodeIndex to inputTargetUid', () => {
    const canvas = metadataToCanvas(metaFixture(), chainFixture());
    expect(canvas.inputTargetUid).toBe('local-1');
  });

  it('yields inputTargetUid null when the INPUT has no outgoing edge', () => {
    const meta = metaFixture();
    delete meta.firstNodeIndex;
    expect(metadataToCanvas(meta, chainFixture()).inputTargetUid).toBeNull();

    meta.firstNodeIndex = -1; // legacy sentinel for "no entry node"
    expect(metadataToCanvas(meta, chainFixture()).inputTargetUid).toBeNull();

    meta.firstNodeIndex = 99; // out of range — defensive
    expect(metadataToCanvas(meta, chainFixture()).inputTargetUid).toBeNull();
  });

  it('passes notes through: wire id kept, fresh notes get a local uid', () => {
    const canvas = metadataToCanvas(metaFixture(), chainFixture());

    expect(canvas.notes[0]).toMatchObject({
      uid: 'note-uuid-1',
      id: 'note-uuid-1',
      x: 10,
      content: 'hello',
    });
    expect(canvas.notes[1]).toMatchObject({
      uid: 'local-note1',
      content: 'fresh note',
    });
    expect(canvas.notes[1].id).toBeUndefined();
  });

  it('keeps the chain snapshot and never mutates its inputs', () => {
    const meta = metaFixture();
    const chain = chainFixture();
    const metaBefore = structuredClone(meta);

    const canvas = metadataToCanvas(meta, chain);

    expect(meta).toEqual(metaBefore);
    expect(canvas.chain).toEqual(chain);
    expect(canvas.chain).not.toBe(chain);
  });

  it('normalizes an empty metadata into an empty canvas', () => {
    const canvas = metadataToCanvas(
      { ruleChainId: chainId('chain-1') } as RuleChainMetaData,
      chainFixture(),
    );
    expect(canvas.nodes).toEqual({});
    expect(canvas.edges).toEqual([]);
    expect(canvas.notes).toEqual([]);
    expect(canvas.inputTargetUid).toBeNull();
  });
});

describe('canvasToMetadata', () => {
  it('serializes nodes in record order: id kept, uid stripped, layout rounded', () => {
    const canvas = metadataToCanvas(metaFixture(), chainFixture());
    const meta = canvasToMetadata(canvas);

    expect(meta.ruleChainId).toEqual(chainId('chain-1'));
    expect(meta.version).toBe(7);
    expect(meta.nodes).toHaveLength(3);

    const first = meta.nodes[0];
    expect(first.id).toEqual(nodeId('node-a'));
    expect(first.type).toBe(
      'org.thingsboard.rule.engine.filter.TbMsgTypeFilterNode',
    );
    expect(first.name).toBe('Message type filter');
    expect(first.additionalInfo).toEqual({
      layoutX: 100,
      layoutY: 61,
      description: 'desc-0',
      producerExtra: 'keep-me',
    });
    expect(first as unknown as Record<string, unknown>).not.toHaveProperty(
      'uid',
    );
  });

  it('omits the id of never-saved nodes (backend drops unknown ids silently)', () => {
    const canvas = metadataToCanvas(metaFixture(), chainFixture());
    const fresh = canvas.nodes['local-2'];
    delete fresh.ruleNodeId;
    fresh.uid = 'local-9';

    const meta = canvasToMetadata(canvas);
    expect(meta.nodes[2]).not.toHaveProperty('id');
  });

  it('expands edges into one connection per label with index endpoints', () => {
    const meta = canvasToMetadata(
      metadataToCanvas(metaFixture(), chainFixture()),
    );
    expect(meta.connections).toEqual([
      { fromIndex: 0, toIndex: 1, type: 'Success' },
      { fromIndex: 0, toIndex: 1, type: 'Failure' },
      { fromIndex: 1, toIndex: 2, type: 'True' },
      { fromIndex: 1, toIndex: 2, type: 'Success' },
      { fromIndex: 1, toIndex: 2, type: 'Other' },
    ]);
  });

  it('restores firstNodeIndex from inputTargetUid and omits it when null', () => {
    const canvas = metadataToCanvas(metaFixture(), chainFixture());
    expect(canvasToMetadata(canvas).firstNodeIndex).toBe(1);

    canvas.inputTargetUid = null;
    const meta = canvasToMetadata(canvas);
    expect(meta).not.toHaveProperty('firstNodeIndex');

    canvas.inputTargetUid = 'missing-uid';
    expect(canvasToMetadata(canvas)).not.toHaveProperty('firstNodeIndex');
  });

  it('skips edges referencing unknown uids instead of emitting broken indexes', () => {
    const canvas = metadataToCanvas(metaFixture(), chainFixture());
    canvas.edges.push({
      id: 'local-e2',
      sourceUid: 'local-2',
      targetUid: 'ghost',
      labels: ['Success'],
    });
    const meta = canvasToMetadata(canvas);
    expect(meta.connections).toHaveLength(5);
  });

  it('serializes notes without the local uid, wire id preserved', () => {
    const meta = canvasToMetadata(
      metadataToCanvas(metaFixture(), chainFixture()),
    );
    expect(meta.notes).toEqual([
      {
        id: 'note-uuid-1',
        x: 10,
        y: 20,
        width: 200,
        height: 120,
        content: 'hello',
        backgroundColor: '#FFF9C4',
      },
      { x: 0, y: 0, width: 200, height: 120, content: 'fresh note' },
    ]);
  });
});

describe('round-trip (brief §2 contract)', () => {
  it('meta → canvas → meta is field-stable for the wire-represented surface', () => {
    const meta = metaFixture();
    const chain = chainFixture();
    const twice = canvasToMetadata(metadataToCanvas(meta, chain));

    // Wire fields the canvas draft intentionally does not represent
    // (server-managed bookkeeping dropped on save, matching ui-ngx).
    // layoutX/Y are Math.round-ed by CONTRACT on both directions.
    const stripUnrepresented = (nodes: RuleNode[]) =>
      structuredClone(nodes).map((node) => {
        delete node.createdTime;
        delete node.ruleChainId;
        delete node.debugMode;
        const info = node.additionalInfo as Record<string, unknown>;
        if (info) {
          if (typeof info.layoutX === 'number') {
            info.layoutX = Math.round(info.layoutX);
          }
          if (typeof info.layoutY === 'number') {
            info.layoutY = Math.round(info.layoutY);
          }
        }
        // the serializer normalizes these (ui-ngx always sends them too)
        node.singletonMode = node.singletonMode ?? false;
        node.configurationVersion = node.configurationVersion ?? 0;
        return node;
      });

    const expected = structuredClone(meta);
    expected.nodes = stripUnrepresented(expected.nodes);

    expect(twice.nodes).toEqual(expected.nodes);
    expect(twice.connections).toEqual(expected.connections);
    expect(twice.notes).toEqual(expected.notes);
    expect(twice.firstNodeIndex).toBe(expected.firstNodeIndex);
    expect(twice.ruleChainId).toEqual(expected.ruleChainId);
    expect(twice.version).toBe(expected.version);
  });

  it('canvas → meta → canvas is deep-stable for a canvas born from metadataToCanvas', () => {
    const canvas = metadataToCanvas(metaFixture(), chainFixture());
    const back = metadataToCanvas(canvasToMetadata(canvas), canvas.chain);
    expect(back).toEqual(canvas);
  });
});

describe('migrateRuleChainImport (brief §1 legacy migrations)', () => {
  function legacyImport(): RuleChainImport {
    return {
      ruleChain: { ...chainFixture(), name: 'Legacy chain' },
      metadata: {
        ruleChainId: chainId('chain-1'),
        version: 3,
        firstNodeIndex: 0,
        nodes: [
          {
            id: nodeId('node-a'),
            type: 'org.thingsboard.rule.engine.filter.TbMsgTypeFilterNode',
            name: 'Filter',
            configuration: {},
            debugMode: true,
          },
          {
            id: nodeId('node-b'),
            type: 'org.thingsboard.rule.engine.action.TbLogNode',
            name: 'Log',
            configuration: {},
          },
        ],
        connections: [{ fromIndex: 0, toIndex: 1, type: 'Success' }],
        ruleChainConnections: [
          {
            fromIndex: 1,
            targetRuleChainId: chainId('chain-other'),
            type: 'Success',
            additionalInfo: { layoutX: 640, layoutY: 240 },
          },
        ],
      },
    };
  }

  it('promotes debugMode:true to debugSettings and drops the deprecated flag', () => {
    const result = migrateRuleChainImport(legacyImport());

    expect(result.metadata.nodes[0].debugSettings).toEqual({
      failuresEnabled: true,
      allEnabled: true,
    });
    expect(result.metadata.nodes[0]).not.toHaveProperty('debugMode');
    // untouched node stays untouched
    expect(result.metadata.nodes[1]).not.toHaveProperty('debugSettings');
  });

  it('rewrites each ruleChainConnection into a TbRuleChainInputNode + connection', () => {
    const result = migrateRuleChainImport(legacyImport());
    const meta = result.metadata;

    expect(meta.nodes).toHaveLength(3);
    const inputNode = meta.nodes[2];
    expect(inputNode.type).toBe(RULE_CHAIN_INPUT_NODE_CLAZZ);
    expect(inputNode.name).toBe('Rule Chain Input');
    expect(inputNode.singletonMode).toBe(false);
    expect(inputNode.configuration).toEqual({ ruleChainId: 'chain-other' });
    expect(inputNode.additionalInfo).toEqual({ layoutX: 640, layoutY: 240 });

    expect(meta.connections).toEqual([
      { fromIndex: 0, toIndex: 1, type: 'Success' },
      { fromIndex: 1, toIndex: 2, type: 'Success' },
    ]);
  });

  it('removes the migrated ruleChainConnections array (the backend converts any leftover AGAIN, duplicating nodes)', () => {
    const result = migrateRuleChainImport(legacyImport());
    expect(result.metadata).not.toHaveProperty('ruleChainConnections');
  });

  it('skips connections without a targetRuleChainId', () => {
    const data = legacyImport();
    (
      data.metadata.ruleChainConnections as Array<{
        targetRuleChainId?: unknown;
      }>
    )[0].targetRuleChainId = undefined;

    const result = migrateRuleChainImport(data);
    expect(result.metadata.nodes).toHaveLength(2);
    expect(result.metadata).not.toHaveProperty('ruleChainConnections');
  });

  it('leaves a modern file untouched (purity: input never mutated)', () => {
    const modern = {
      ruleChain: chainFixture(),
      metadata: {
        ruleChainId: chainId('chain-1'),
        nodes: [
          {
            type: 'org.thingsboard.rule.engine.action.TbLogNode',
            name: 'Log',
            configuration: {},
          },
        ],
        connections: [],
      },
    } as RuleChainImport;
    const before = structuredClone(modern);

    const result = migrateRuleChainImport(modern);

    expect(modern).toEqual(before);
    expect(result.metadata).toEqual(before.metadata);
  });

  it('migrated metadata converts cleanly onto the canvas', () => {
    const canvas = metadataToCanvas(
      migrateRuleChainImport(legacyImport()).metadata,
      legacyImport().ruleChain,
    );
    expect(Object.keys(canvas.nodes)).toHaveLength(3);
    const inputUid = canvas.inputTargetUid;
    expect(inputUid).toBe('local-0');
  });
});
