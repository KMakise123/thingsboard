/**
 * Shell wiring smoke: toolbar affordances follow the session stack, the
 * DialogHost seam opens the real add-node dialog through the canvas DnD
 * drop path (descriptor → name field → config slot → addNode recipe commit
 * as ONE group).
 *
 * Services are mocked at the module boundary; the descriptors query is
 * seeded through the mock.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { useEffect, useState } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import zhEditor from '@/locales/zh-CN/editor';
import zhRulechain from '@/locales/zh-CN/editor-rulechain';
import zhCanvas from '@/locales/zh-CN/editor-rulechain-canvas';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';
import type { CanvasRuleChain } from '@/core/rulechain/types';

import { RULE_NODE_DROP_MIME } from './canvas';
import { rowDraft } from './canvas/test-helpers';
import { RuleChainEditorShell } from './shell';

const serviceMock = vi.hoisted(() => ({
  saveRuleChain: vi.fn(),
  saveRuleChainMetaData: vi.fn(),
  getRuleNodeComponents: vi.fn(),
}));
vi.mock('@/services/tb/rule-chain', () => serviceMock);

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@umijs/max', () => ({ history: historyMock }));

/** Navigation sink shared between the D1-family harness and mocked history. */
const exitRouteListeners = new Set<() => void>();

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditor, ...zhRulechain, ...zhCanvas },
});

const DESCRIPTOR: RuleNodeComponentDescriptor = {
  type: 'FILTER',
  name: 'Test Filter',
  clazz: 'org.example.TestFilter',
  configurationVersion: 0,
  configurationDescriptor: {
    nodeDefinition: {
      details: 'details body',
      description: 'a test node',
      inEnabled: true,
      outEnabled: true,
      relationTypes: ['True', 'False'],
      customRelations: false,
      defaultConfiguration: { threshold: 1 },
    },
  },
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const session = new EditorSession({ baseline: rowDraft(2, true) });
  render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <RuleChainEditorShell session={session} />
        </QueryClientProvider>
      </AntdApp>
    </RawIntlProvider>,
  );
  return session;
}

beforeEach(() => {
  serviceMock.getRuleNodeComponents.mockReset();
  serviceMock.getRuleNodeComponents.mockResolvedValue([DESCRIPTOR]);
  serviceMock.saveRuleChain.mockReset();
  serviceMock.saveRuleChainMetaData.mockReset();
});

describe('RuleChainEditorShell — toolbar', () => {
  it('renders save/undo/redo with session-backed affordances', () => {
    setup();
    expect(screen.getByTestId('rc-toolbar-save')).toBeInTheDocument();
    expect(screen.getByTestId('rc-toolbar-undo')).toBeDisabled();
    expect(screen.getByTestId('rc-toolbar-redo')).toBeDisabled();
  });
});

describe('RuleChainEditorShell — library DnD → add-node dialog (host seam)', () => {
  it('commits the addNode recipe from the real dialog as ONE group', async () => {
    const session = setup();
    // descriptors loaded → the library drawer data is ready
    await waitFor(() => {
      expect(serviceMock.getRuleNodeComponents).toHaveBeenCalled();
    });
    // let the descriptor query resolution settle before the drop
    await act(async () => {
      await Promise.resolve();
    });

    // simulate the library item drop on the canvas wrapper (HTML5 DnD)
    const canvas = screen.getByTestId('rc-canvas');
    fireEvent.drop(canvas, {
      dataTransfer: {
        types: [RULE_NODE_DROP_MIME],
        getData: (type: string) =>
          type === RULE_NODE_DROP_MIME ? 'org.example.TestFilter' : '',
      },
      clientX: 400,
      clientY: 300,
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('rc-add-node-dialog')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    const nameInput = screen.getByTestId('rc-add-node-name');
    // prefilled with the component display name (ui-ngx parity)
    expect(nameInput).toHaveValue('Test Filter');
    fireEvent.change(nameInput, { target: { value: 'My Filter' } });
    // wave-3 K2: the slot renders the generated NodeConfigForm — the value
    // tree's `threshold` field becomes a real control inside it
    expect(screen.getByTestId('rc-node-config-slot')).toBeInTheDocument();
    expect(screen.getByTestId('node-config-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-property-threshold')).toBeInTheDocument();
    // antd renders two-CJK-char buttons with an inner space ("确 定")
    fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }));

    await waitFor(() => {
      expect(session.current.nodes['local-2']).toBeDefined();
    });
    expect(session.current.nodes['local-2'].name).toBe('My Filter');
    expect(session.current.nodes['local-2'].clazz).toBe(
      'org.example.TestFilter',
    );
    expect(session.current.nodes['local-2'].configuration).toEqual({
      threshold: 1,
    });
    expect(session.history.at(-1)?.label).toBe('add node');
    expect(session.history).toHaveLength(1);
  });
});

describe('RuleChainEditorShell — node double-click details (D2, ui-ngx fcEventNodeDblClick parity)', () => {
  it('double-clicking a rule node opens the details drawer', async () => {
    setup();
    const nodeEl = document.querySelector('[data-id="local-1"]');
    expect(nodeEl).not.toBeNull();
    fireEvent.dblClick(nodeEl as Element);
    await waitFor(() => {
      expect(screen.getByTestId('rc-node-details-drawer')).toBeInTheDocument();
    });
  });

  it('double-clicking the INPUT read-only node opens nothing', async () => {
    setup();
    const inputEl = document.querySelector('[data-id="__input__"]');
    expect(inputEl).not.toBeNull();
    fireEvent.dblClick(inputEl as Element);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId('rc-node-details-drawer')).toBeNull();
  });
});

describe('RuleChainEditorShell — selection hotkeys + context menu', () => {
  it('delete-selected removes the selection as one group per category', async () => {
    const session = setup();
    // ctrl+a selects every node/edge (react-hotkeys-hook binds document)
    fireEvent.keyDown(document, { key: 'a', code: 'KeyA', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'Delete', code: 'Delete' });
    await waitFor(() => {
      expect(Object.keys(session.current.nodes)).toHaveLength(0);
    });
    expect(session.current.edges).toHaveLength(0);
    const labels = session.history.map((group) => group.label);
    expect(labels).toEqual(['remove nodes', 'remove edges']);
  });

  it('pane right-click opens the context menu with ui-ngx actions', async () => {
    setup();
    // React Flow binds the pane handler on its own pane element
    const pane = document.querySelector('.react-flow__pane');
    expect(pane).not.toBeNull();
    fireEvent.contextMenu(pane as Element);
    await waitFor(() => {
      expect(screen.getByTestId('rc-pane-menu')).toBeInTheDocument();
    });
    expect(screen.getByText('全选')).toBeInTheDocument();
    expect(screen.getByText('添加便签')).toBeInTheDocument();
  });
});

describe('RuleChainEditorShell — exit-confirm ownership (M10 D1 family)', () => {
  /**
   * Mimics the real provider nesting: umi mounts the antd <App> ONCE above
   * the router (plugin-antd innerProvider), so a navigation swaps the page
   * underneath a PERSISTENT App. A dialog owned by the page must unmount
   * with it; an imperative App-context confirm would survive the swap.
   */
  function ExitRouteHarness({
    session,
  }: {
    session: EditorSession<CanvasRuleChain>;
  }) {
    const [exited, setExited] = useState(false);
    useEffect(() => {
      const onPush = () => setExited(true);
      exitRouteListeners.add(onPush);
      return () => {
        exitRouteListeners.delete(onPush);
      };
    }, []);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <RawIntlProvider value={intl}>
        <AntdApp>
          <QueryClientProvider client={queryClient}>
            {exited ? (
              <div data-testid="rc-list-view" />
            ) : (
              <RuleChainEditorShell session={session} />
            )}
          </QueryClientProvider>
        </AntdApp>
      </RawIntlProvider>
    );
  }

  it('discarding navigates away and leaves NO confirm dialog residue', async () => {
    const session = new EditorSession({ baseline: rowDraft(2, true) });
    render(<ExitRouteHarness session={session} />);
    await waitFor(() => {
      expect(serviceMock.getRuleNodeComponents).toHaveBeenCalled();
    });
    act(() => {
      session.write('edit note', (draft) => {
        draft.chain.name = 'changed';
      });
    });
    fireEvent.click(screen.getByTestId('rc-toolbar-exit'));
    const ok = await screen.findByTestId('rc-exit-confirm-ok');
    historyMock.push.mockImplementation(() => {
      for (const listener of exitRouteListeners) {
        listener();
      }
    });
    fireEvent.click(ok);
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/ruleChains');
    });
    expect(screen.getByTestId('rc-list-view')).toBeInTheDocument();
    // the confirm is owned by the editor face: navigation unmounts it
    // atomically — no mask, no dead dialog may outlive the page
    expect(document.querySelector('.ant-modal-root')).toBeNull();
    historyMock.push.mockReset();
  });

  it('canceling the confirm keeps the editor mounted without navigating', async () => {
    const session = setup();
    act(() => {
      session.write('edit note', (draft) => {
        draft.chain.name = 'changed';
      });
    });
    fireEvent.click(screen.getByTestId('rc-toolbar-exit'));
    expect(await screen.findByTestId('rc-exit-confirm')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('rc-exit-confirm-cancel'));
    // the controlled open state flipped: antd starts the close transition
    // synchronously (happy-dom never finishes the animation itself)
    expect(document.querySelector('.ant-modal-mask')?.className).toContain(
      'leave',
    );
    expect(historyMock.push).not.toHaveBeenCalled();
    expect(session.dirty).toBe(true);
    expect(screen.getByTestId('rc-toolbar-exit')).toBeInTheDocument();
  });
});
