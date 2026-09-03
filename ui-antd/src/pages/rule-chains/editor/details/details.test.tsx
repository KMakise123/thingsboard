/**
 * RuleNodeDetailsDrawer (wave-3 K2) — three-tab behavior:
 *  - details: header node fields + NodeConfigForm write the MAIN draft live;
 *    consecutive edits coalesce per channel (fields / configuration);
 *  - Apply = drop the open checkpoint and close (edits stay);
 *  - Cancel / close = checkpoint.rollback() — zero residue;
 *  - events tab only for saved nodes (ui-ngx parity);
 *  - help tab renders descriptor HTML through DOMPurify (script stripped).
 * Without a session the drawer degrades to a read-only display.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

// The wave-D events table performs real transport calls once a tenantId is
// wired through; the drawer suite has no server — stub the read at the
// service boundary (same pattern as debug-events-table.test.tsx).
vi.mock('@/services/tb/events', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEventsByFilter: vi.fn().mockResolvedValue({
    data: [],
    totalPages: 0,
    totalElements: 0,
    hasNext: false,
  }),
}));

import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import type { CanvasNode, CanvasRuleChain } from '@/core/rulechain/types';
import zhEditor from '@/locales/zh-CN/editor';
import zhRulechain from '@/locales/zh-CN/editor-rulechain';
import zhCanvas from '@/locales/zh-CN/editor-rulechain-canvas';
import zhRulechainPage from '@/locales/zh-CN/editor-rulechain-page';
import zhRuleNode from '@/locales/zh-CN/rule-node';
import { EntityType } from '@/types/tb/entity';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

import { RuleNodeDetailsDrawer } from './index';

const intl = createIntl({
  locale: 'zh-CN',
  messages: {
    ...zhEditor,
    ...zhRulechain,
    ...zhCanvas,
    ...zhRuleNode,
    ...zhRulechainPage,
  },
});

const CLAZZ = 'org.example.TestFilter';

const DESCRIPTOR: RuleNodeComponentDescriptor = {
  type: 'FILTER',
  name: 'Test Filter',
  clazz: CLAZZ,
  configurationVersion: 0,
  configurationDescriptor: {
    nodeDefinition: {
      details:
        '<p>Keeps messages when <b>threshold</b> matches.</p><script>alert(1)</script>',
      description: 'a test node',
      inEnabled: true,
      outEnabled: true,
      relationTypes: ['True', 'False'],
      customRelations: false,
      defaultConfiguration: { threshold: 1 },
      docUrl: 'https://thingsboard.io/docs/test-node',
    },
  },
};

const SINGLETON_QUEUE_DESCRIPTOR: RuleNodeComponentDescriptor = {
  ...DESCRIPTOR,
  hasQueueName: true,
  clusteringMode: 'SINGLETON',
};

function draftWith(node: Partial<CanvasNode>): CanvasRuleChain {
  return {
    chain: {
      id: { entityType: EntityType.RULE_CHAIN, id: 'rc1' },
      createdTime: 0,
      name: 'Test chain',
      version: 3,
    },
    nodes: {
      'local-0': {
        uid: 'local-0',
        clazz: CLAZZ,
        name: 'Original name',
        x: 0,
        y: 0,
        configuration: { threshold: 1 },
        singletonMode: false,
        configurationVersion: 0,
        ...node,
      },
    },
    edges: [],
    notes: [],
    inputTargetUid: null,
  };
}

function renderDrawer(
  args: {
    session?: EditorSession<CanvasRuleChain>;
    node?: CanvasNode;
    descriptor?: RuleNodeComponentDescriptor;
  } = {},
) {
  const session =
    args.session ?? new EditorSession({ baseline: draftWith({}) });
  const node = args.node ?? session.current.nodes['local-0'];
  const onClose = (): void => undefined;
  render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={new QueryClient()}>
        <RuleNodeDetailsDrawer
          open
          node={node}
          descriptor={args.descriptor ?? DESCRIPTOR}
          onClose={onClose}
          session={session}
        />
      </QueryClientProvider>
    </RawIntlProvider>,
  );
  return session;
}

describe('RuleNodeDetailsDrawer — three tabs', () => {
  it('shows the details tab by default and switches to help/events', () => {
    const session = renderDrawer({
      node: draftWith({
        ruleNodeId: { entityType: EntityType.RULE_NODE, id: 'node-1' },
      }).nodes['local-0'],
    });
    // details tab: header name field + generated config form
    expect(screen.getByTestId('rc-details-name')).toHaveValue('Original name');
    expect(screen.getByTestId('node-config-form')).toBeInTheDocument();
    // events tab only rendered for a saved node (wave-D real table seam)
    fireEvent.click(screen.getByRole('tab', { name: /事件/ }));
    expect(screen.getByTestId('rc-node-events-filters')).toBeInTheDocument();
    // help tab: sanitized descriptor HTML
    fireEvent.click(screen.getByRole('tab', { name: /帮助/ }));
    expect(screen.getByTestId('rc-details-help')).toHaveTextContent(
      'threshold',
    );
    expect(
      screen.getByTestId('rc-details-help').querySelector('script'),
    ).toBeNull();
    expect(screen.getByTestId('rc-details-doc-url').getAttribute('href')).toBe(
      'https://thingsboard.io/docs/test-node',
    );
    void session;
  });

  it('hides the events tab for unsaved nodes', () => {
    renderDrawer();
    expect(screen.queryByRole('tab', { name: /事件/ })).toBeNull();
    expect(screen.getByRole('tab', { name: /详情/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /帮助/ })).toBeInTheDocument();
  });
});

describe('RuleNodeDetailsDrawer — conditional header fields', () => {
  it('shows singletonMode/queueName only when the descriptor declares them', () => {
    renderDrawer({ descriptor: SINGLETON_QUEUE_DESCRIPTOR });
    expect(screen.getByTestId('rc-details-queue-name')).toBeInTheDocument();
    expect(screen.getByTestId('rc-details-singleton')).toBeInTheDocument();
  });

  it('hides singletonMode/queueName for plain descriptors', () => {
    renderDrawer();
    expect(screen.queryByTestId('rc-details-queue-name')).toBeNull();
    expect(screen.queryByTestId('rc-details-singleton')).toBeNull();
  });
});

describe('RuleNodeDetailsDrawer — checkpoint transaction', () => {
  it('writes edits to the main draft live and coalesces per channel', () => {
    const session = renderDrawer();
    // header field edits: three keystrokes → ONE coalesced group
    const nameInput = screen.getByTestId('rc-details-name');
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'Renamed' } });
      fireEvent.change(nameInput, { target: { value: 'Renamed 2' } });
    });
    expect(session.current.nodes['local-0'].name).toBe('Renamed 2');
    // configuration edits go through the second channel
    act(() => {
      fireEvent.change(
        within(screen.getByTestId('form-property-threshold')).getByRole(
          'spinbutton',
        ),
        { target: { value: '7' } },
      );
    });
    expect(session.current.nodes['local-0'].configuration).toEqual({
      threshold: 7,
    });
    const labels = session.history.map((group) => group.label);
    expect(labels).toEqual(['update node fields', 'update node configuration']);
    expect(session.history[0].coalesceKey).toBe('local-0:fields');
    expect(session.history[1].coalesceKey).toBe('local-0:configuration');
  });

  it('Apply commits (checkpoint dropped, edits stay) and closes', () => {
    const session = new EditorSession({ baseline: draftWith({}) });
    const onClose = vi.fn();
    render(
      <RawIntlProvider value={intl}>
        <RuleNodeDetailsDrawer
          open
          node={session.current.nodes['local-0']}
          descriptor={DESCRIPTOR}
          onClose={onClose}
          session={session}
        />
      </RawIntlProvider>,
    );
    fireEvent.change(screen.getByTestId('rc-details-name'), {
      target: { value: 'Applied name' },
    });
    fireEvent.click(screen.getByTestId('rc-details-apply'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(session.current.nodes['local-0'].name).toBe('Applied name');
    expect(
      session.history.some((group) => group.label.startsWith('rollback:')),
    ).toBe(false);
  });

  it('Cancel rolls the whole edit batch back as one group (zero residue)', () => {
    const session = new EditorSession({ baseline: draftWith({}) });
    const onClose = vi.fn();
    render(
      <RawIntlProvider value={intl}>
        <RuleNodeDetailsDrawer
          open
          node={session.current.nodes['local-0']}
          descriptor={DESCRIPTOR}
          onClose={onClose}
          session={session}
        />
      </RawIntlProvider>,
    );
    const nameInput = screen.getByTestId('rc-details-name');
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'Draft name' } });
      fireEvent.change(nameInput, { target: { value: 'Draft name 2' } });
    });
    fireEvent.click(screen.getByTestId('rc-details-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(session.current.nodes['local-0'].name).toBe('Original name');
    expect(session.current.nodes['local-0'].configuration).toEqual({
      threshold: 1,
    });
    expect(
      session.history.some((group) =>
        group.label.startsWith('rollback: node-details:local-0'),
      ),
    ).toBe(true);
  });

  it('debug switches patch debugSettings in place, keeping other keys', () => {
    const session = renderDrawer({
      node: draftWith({
        debugSettings: { failuresEnabled: false, allEnabledUntil: 123 },
      }).nodes['local-0'],
    });
    fireEvent.click(screen.getByTestId('rc-details-debug-failures'));
    expect(session.current.nodes['local-0'].debugSettings).toEqual({
      failuresEnabled: true,
      allEnabledUntil: 123,
    });
  });
});

describe('RuleNodeDetailsDrawer — read-only without session', () => {
  it('disables inputs and omits Apply/Cancel', () => {
    render(
      <RawIntlProvider value={intl}>
        <RuleNodeDetailsDrawer
          open
          node={draftWith({}).nodes['local-0']}
          descriptor={DESCRIPTOR}
          onClose={() => undefined}
        />
      </RawIntlProvider>,
    );
    expect(screen.getByTestId('rc-details-name')).toBeDisabled();
    expect(screen.queryByTestId('rc-details-apply')).toBeNull();
    expect(screen.queryByTestId('rc-details-cancel')).toBeNull();
  });
});
