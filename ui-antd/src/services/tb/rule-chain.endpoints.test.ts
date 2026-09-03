/**
 * Rule-chain transport endpoints (M8). Pins every REST path the ruleChains
 * domain uses: list/get/save/delete, metadata, components, output labels,
 * tbelEnabled, node debugIn and the script test bench.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  deleteRuleChain,
  getRuleChainById,
  getRuleChainMetaData,
  getRuleChainOutputLabels,
  getRuleChains,
  getRuleNodeComponents,
  getRuleNodeDebugIn,
  getTbelEnabled,
  saveRuleChain,
  saveRuleChainMetaData,
  setRootRuleChain,
  testRuleNodeScript,
} from './rule-chain';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

describe('rule chain transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('pins the tenant rule chain list to /api/ruleChains (CORE default)', async () => {
    await getRuleChains({
      pageSize: 20,
      page: 0,
      textSearch: 'root',
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(get).toHaveBeenCalledWith('/api/ruleChains', {
      pageSize: 20,
      page: 0,
      textSearch: 'root',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      type: 'CORE',
    });

    await getRuleChains({ pageSize: 10, page: 1 }, 'EDGE');
    expect(get).toHaveBeenLastCalledWith('/api/ruleChains', {
      pageSize: 10,
      page: 1,
      type: 'EDGE',
    });
  });

  it('pins single-chain read and the upsert POST to /api/ruleChain', async () => {
    await getRuleChainById('rc1');
    expect(get).toHaveBeenCalledWith('/api/ruleChain/rc1');

    const payload = {
      id: { entityType: 'RULE_CHAIN', id: 'rc1' },
      name: 'Chain',
    } as never;
    await saveRuleChain(payload);
    expect(post).toHaveBeenCalledWith('/api/ruleChain', payload);

    await setRootRuleChain('rc1');
    expect(post).toHaveBeenCalledWith('/api/ruleChain/rc1/root');

    await deleteRuleChain('rc1');
    expect(del).toHaveBeenCalledWith('/api/ruleChain/rc1');
  });

  it('pins metadata read and save (updateRelated defaults off)', async () => {
    await getRuleChainMetaData('rc1');
    expect(get).toHaveBeenCalledWith('/api/ruleChain/rc1/metadata');

    const meta = {
      ruleChainId: { entityType: 'RULE_CHAIN', id: 'rc1' },
      nodes: [],
      connections: [],
    } as never;
    await saveRuleChainMetaData(meta);
    expect(post).toHaveBeenCalledWith('/api/ruleChain/metadata', meta, {
      updateRelated: false,
    });

    await saveRuleChainMetaData(meta, true);
    expect(post).toHaveBeenLastCalledWith('/api/ruleChain/metadata', meta, {
      updateRelated: true,
    });
  });

  it('pins the component descriptors read with types + chain type', async () => {
    await getRuleNodeComponents(['FILTER', 'ENRICHMENT']);
    expect(get).toHaveBeenCalledWith('/api/components', {
      componentTypes: 'FILTER,ENRICHMENT',
      ruleChainType: 'CORE',
    });

    await getRuleNodeComponents(['ACTION'], 'EDGE');
    expect(get).toHaveBeenLastCalledWith('/api/components', {
      componentTypes: 'ACTION',
      ruleChainType: 'EDGE',
    });
  });

  it('pins output labels, tbelEnabled and node debugIn', async () => {
    await getRuleChainOutputLabels('rc1');
    expect(get).toHaveBeenCalledWith('/api/ruleChain/rc1/output/labels');

    await getTbelEnabled();
    expect(get).toHaveBeenCalledWith('/api/ruleChain/tbelEnabled');

    await getRuleNodeDebugIn('rn1');
    expect(get).toHaveBeenCalledWith('/api/ruleNode/rn1/debugIn');
  });

  it('pins the script test bench with the scriptLang query', async () => {
    const params = {
      script: 'return msg.temperature > 20;',
      scriptType: 'filter',
      argNames: ['msg', 'metadata', 'msgType'],
      msg: '{"temperature":22.4}',
      metadata: { deviceName: 'Test Device' },
      msgType: 'POST_TELEMETRY_REQUEST',
    };
    await testRuleNodeScript(params, 'JS');
    expect(post).toHaveBeenCalledWith('/api/ruleChain/testScript', params, {
      scriptLang: 'JS',
    });

    await testRuleNodeScript(params, 'TBEL');
    expect(post).toHaveBeenLastCalledWith(
      '/api/ruleChain/testScript',
      params,
      { scriptLang: 'TBEL' },
    );
  });
});
