/**
 * Debug events table + node events tab tests (M8 wave-3 D): column set,
 * server-side filter POST, clear-with-current-filter, the
 * test-with-this-message action (modal prefill from the row body + real
 * service wiring), and the seam degradation paths. Transports are mocked at
 * the services boundary.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasNode } from '@/core/rulechain/types';
import zhCommon from '@/locales/zh-CN/common';
import zhRulechain from '@/locales/zh-CN/editor-rulechain';
import zhPage from '@/locales/zh-CN/editor-rulechain-page';
import type { EventInfo } from '@/services/tb/events';
import { EntityType } from '@/types/tb';

import { DebugEventsTable } from './debug-events-table';
import { RuleNodeEventsTab } from './rule-node-events-tab';

const eventsMock = vi.hoisted(() => ({
  getEventsByFilter: vi.fn(),
  clearEvents: vi.fn(),
}));
vi.mock('@/services/tb/events', () => eventsMock);

const ruleChainMock = vi.hoisted(() => ({
  testRuleNodeScript: vi.fn(),
  getTbelEnabled: vi.fn(),
}));
vi.mock('@/services/tb/rule-chain', () => ruleChainMock);

const authMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));
vi.mock('@/services/tb/auth', () => authMock);

// CodeEditor → textarea (house pattern): value assertions on the prefill
vi.mock('@/components/code-editor', () => ({
  CodeEditor: (props: {
    value?: string;
    onChange?: (next: string) => void;
    language?: string;
    readOnly?: boolean;
    'data-testid'?: string;
  }) => (
    <textarea
      data-testid={props['data-testid'] ?? 'code-editor'}
      data-language={props.language ?? ''}
      data-readonly={String(props.readOnly === true)}
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.target.value)}
    />
  ),
}));

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhRulechain, ...zhPage },
});

const TENANT = 't-1';

function eventRow(id: string, body: Record<string, unknown>): EventInfo {
  return {
    id: { entityType: EntityType.RULE_NODE, id },
    createdTime: 1_700_000_000_000,
    type: 'DEBUG_RULE_NODE',
    body,
  } as EventInfo;
}

const NODE_EVENT = eventRow('ev-1', {
  type: 'IN',
  msgType: 'POST_TELEMETRY_REQUEST',
  relationType: 'Success',
  data: '{"temperature":22.4}',
  dataType: 'JSON',
  metadata: '{"deviceName":"TH1"}',
  error: 'boom happened',
  server: 'srv-1',
});

function setup(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </AntdApp>
    </RawIntlProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  eventsMock.getEventsByFilter.mockResolvedValue({
    data: [NODE_EVENT],
    totalElements: 1,
    totalPages: 1,
    hasNext: false,
  });
  eventsMock.clearEvents.mockResolvedValue(undefined);
  authMock.getCurrentUser.mockResolvedValue({
    id: { entityType: EntityType.USER, id: 'u-1' },
    tenantId: { entityType: EntityType.TENANT, id: 't-1' },
    email: 'ta@x.io',
  });
  ruleChainMock.getTbelEnabled.mockResolvedValue(true);
});

describe('DebugEventsTable — DEBUG_RULE_NODE columns', () => {
  it('renders the direction/msgType/relationType/data/metadata/error set', async () => {
    setup(
      <DebugEventsTable
        entityId={{ entityType: EntityType.RULE_NODE, id: 'rn-1' }}
        tenantId={TENANT}
        eventType="DEBUG_RULE_NODE"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('POST_TELEMETRY_REQUEST')).toBeInTheDocument();
    });
    expect(screen.getByText('IN')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('srv-1')).toBeInTheDocument();
    // data/metadata/error cells surface the row content (error in danger red)
    expect(screen.getByText('{"temperature":22.4}')).toBeInTheDocument();
    expect(screen.getByText('{"deviceName":"TH1"}')).toBeInTheDocument();
    expect(screen.getByText('boom happened')).toBeInTheDocument();
  });

  it('shows the message column for the rule-chain event type instead', async () => {
    eventsMock.getEventsByFilter.mockResolvedValue({
      data: [
        eventRow('ev-2', { message: 'chain started', error: 'chain error' }),
      ],
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
    setup(
      <DebugEventsTable
        entityId={{ entityType: EntityType.RULE_CHAIN, id: 'rc-1' }}
        tenantId={TENANT}
        eventType="DEBUG_RULE_CHAIN"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('chain started')).toBeInTheDocument();
    });
    expect(screen.getByText('chain error')).toBeInTheDocument();
  });
});

describe('DebugEventsTable — filter + clear', () => {
  it('POSTs the filled filters to the filtered read', async () => {
    setup(
      <DebugEventsTable
        entityId={{ entityType: EntityType.RULE_NODE, id: 'rn-1' }}
        tenantId={TENANT}
        eventType="DEBUG_RULE_NODE"
      />,
    );

    fireEvent.change(screen.getByTestId('debug-events-filter-msgType'), {
      target: { value: 'POST_TELEMETRY_REQUEST' },
    });
    fireEvent.change(screen.getByTestId('debug-events-filter-dataSearch'), {
      target: { value: 'temperature' },
    });
    fireEvent.click(screen.getByTestId('debug-events-filter-is-error'));
    fireEvent.click(screen.getByTestId('debug-events-filters-apply'));

    await waitFor(() => {
      const lastCall = eventsMock.getEventsByFilter.mock.calls.at(-1);
      expect(lastCall?.[2]).toEqual({
        eventType: 'DEBUG_RULE_NODE',
        msgType: 'POST_TELEMETRY_REQUEST',
        dataSearch: 'temperature',
        isError: true,
      });
    });
  });

  it('clear posts the CURRENT filter and refetches from page 0', async () => {
    setup(
      <DebugEventsTable
        entityId={{ entityType: EntityType.RULE_NODE, id: 'rn-1' }}
        tenantId={TENANT}
        eventType="DEBUG_RULE_NODE"
      />,
    );
    await waitFor(() => {
      expect(eventsMock.getEventsByFilter).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTestId('debug-events-clear'));
    // antd confirm dialog's OK button (scoped to the confirm, not the table)
    const confirmOk = await screen.findByTestId('debug-events-clear');
    const okButton = document.querySelector(
      '.ant-modal-confirm .ant-btn-dangerous',
    ) as HTMLButtonElement | null;
    expect(okButton).not.toBeNull();
    fireEvent.click(okButton as HTMLButtonElement);
    void confirmOk;

    await waitFor(() => {
      expect(eventsMock.clearEvents).toHaveBeenCalledWith(
        { entityType: EntityType.RULE_NODE, id: 'rn-1' },
        TENANT,
        { eventType: 'DEBUG_RULE_NODE' },
      );
    });
  });
});

describe('RuleNodeEventsTab — seam and test-with-this-message', () => {
  const SCRIPT_CLAZZ = 'org.thingsboard.rule.engine.filter.TbJsFilterNode';

  function scriptNode(): CanvasNode {
    return {
      uid: 'local-0',
      ruleNodeId: { entityType: EntityType.RULE_NODE, id: 'rn-1' },
      clazz: SCRIPT_CLAZZ,
      name: 'filter',
      x: 0,
      y: 0,
      configuration: {
        scriptLang: 'JS',
        jsScript: 'return msg.temperature > 20;',
        tbelScript: '',
      },
      singletonMode: false,
      configurationVersion: 0,
    };
  }

  it('empty ruleNodeId (unsaved node) degrades to an explicit hint', () => {
    setup(<RuleNodeEventsTab ruleNodeId="" />);
    expect(screen.getByTestId('rc-node-events-unsaved')).toBeInTheDocument();
    expect(eventsMock.getEventsByFilter).not.toHaveBeenCalled();
  });

  it('resolves the tenant from the session user when the prop is absent', async () => {
    setup(<RuleNodeEventsTab ruleNodeId="rn-1" />);
    await waitFor(() => {
      expect(authMock.getCurrentUser).toHaveBeenCalled();
      expect(eventsMock.getEventsByFilter).toHaveBeenCalled();
    });
    expect(eventsMock.getEventsByFilter.mock.calls[0]?.[1]).toBe('t-1');
  });

  it('hides the test action for a non-script node', async () => {
    const node: CanvasNode = {
      ...scriptNode(),
      clazz: 'org.thingsboard.rule.engine.action.TbLogNodeNotScript',
      configuration: {},
    };
    setup(<RuleNodeEventsTab ruleNodeId="rn-1" node={node} />);
    await waitFor(() => {
      expect(eventsMock.getEventsByFilter).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('rc-node-events-test-action')).toBeNull();
  });

  it('the action prefills the test panel from the event body and runs the real service', async () => {
    ruleChainMock.testRuleNodeScript.mockResolvedValue({
      output: 'true',
      error: '',
    });
    setup(
      <RuleNodeEventsTab
        ruleNodeId="rn-1"
        tenantId={TENANT}
        node={scriptNode()}
      />,
    );
    await waitFor(() => {
      expect(eventsMock.getEventsByFilter).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByTestId('rc-node-events-test-action'));

    const modal = await screen.findByTestId('rc-test-with-message-modal');
    expect(modal).toBeInTheDocument();
    // payload prefilled from the row body (msgType + msg + metadata)
    expect(
      screen.getByTestId('rc-test-with-message-msgtype-input'),
    ).toHaveValue('POST_TELEMETRY_REQUEST');
    expect(screen.getByTestId('rc-test-with-message-msg-input')).toHaveValue(
      '{"temperature":22.4}',
    );
    expect(
      screen.getByTestId('rc-test-with-message-metadata-input'),
    ).toHaveValue('{"deviceName":"TH1"}');
    // the script body comes from the node configuration
    expect(screen.getByTestId('rc-test-with-message-script')).toHaveValue(
      'return msg.temperature > 20;',
    );

    fireEvent.click(screen.getByTestId('rc-test-with-message-run'));
    await waitFor(() => {
      expect(ruleChainMock.testRuleNodeScript).toHaveBeenCalledTimes(1);
    });
    const call = ruleChainMock.testRuleNodeScript.mock.calls[0];
    expect(call[0]).toMatchObject({
      script: 'return msg.temperature > 20;',
      scriptType: 'filter',
      argNames: ['msg', 'metadata', 'msgType'],
      msg: '{"temperature":22.4}',
      metadata: { deviceName: 'TH1' },
      msgType: 'POST_TELEMETRY_REQUEST',
    });
    expect(call[1]).toBe('JS');
    await waitFor(() => {
      expect(
        screen.getByTestId('rc-test-with-message-output'),
      ).toHaveTextContent('true');
    });
  });
});
