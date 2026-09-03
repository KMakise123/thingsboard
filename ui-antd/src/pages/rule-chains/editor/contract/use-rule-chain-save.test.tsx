/**
 * §3.8 409 three-option loop tests (M8 wave-3 D, M7 behavior parity):
 * a conflicted save opens the three-option dialog; Option A adopts the
 * server metadata, Option B force-saves with a capped retry, Option C
 * exports the local draft and either adopts the server truth (known server
 * state) or abandons the editor (unknown state). The checkpoint notice is
 * surfaced on both successful save paths.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import zhEditor from '@/locales/zh-CN/editor';
import zhRulechain from '@/locales/zh-CN/editor-rulechain';
import zhPage from '@/locales/zh-CN/editor-rulechain-page';
import { EntityType } from '@/types/tb/entity';
import type { RuleChainMetaData } from '@/types/tb/rule-chain';

import { rowDraft } from '../canvas/test-helpers';
import { useRuleChainSave } from './use-rule-chain-save';

const serviceMock = vi.hoisted(() => ({
  saveRuleChainMetaData: vi.fn(),
  getRuleChainMetaData: vi.fn(),
}));
vi.mock('@/services/tb/rule-chain', () => serviceMock);

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditor, ...zhRulechain, ...zhPage },
});

function serverMeta(version: number): RuleChainMetaData {
  return {
    ruleChainId: { entityType: EntityType.RULE_CHAIN, id: 'rc1' },
    version,
    firstNodeIndex: 0,
    nodes: [
      {
        type: 'org.example.TestNode',
        name: 'local-0',
        singletonMode: false,
        configurationVersion: 0,
        configuration: {},
        additionalInfo: { layoutX: 0, layoutY: 0 },
        id: { entityType: EntityType.RULE_NODE, id: 'n0' },
      },
    ],
    connections: [],
  };
}

/** Bare harness: the dialog mounts as the shell would. */
function Harness({
  session,
  onAbandon,
}: {
  session: EditorSession<ReturnType<typeof rowDraft>>;
  onAbandon?: () => void;
}) {
  const flow = useRuleChainSave({ session, onAbandon });
  flowRef.save = flow.save;
  return <>{flow.conflictDialog}</>;
}

const flowRef = {
  save: null as null | (() => Promise<boolean>),
};

function setup(
  session: EditorSession<ReturnType<typeof rowDraft>>,
  onAbandon?: () => void,
) {
  flowRef.save = null;
  render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <Harness session={session} onAbandon={onAbandon} />
      </AntdApp>
    </RawIntlProvider>,
  );
}

async function conflictSave(
  server: RuleChainMetaData | null,
  onAbandon?: () => void,
) {
  const session = new EditorSession({ baseline: rowDraft(2, true) });
  session.write('move', (draft) => {
    draft.nodes['local-0'].x = 42;
  });
  serviceMock.saveRuleChainMetaData.mockRejectedValueOnce(
    Object.assign(new Error('conflict'), { errorCode: 35 }),
  );
  if (server) {
    serviceMock.getRuleChainMetaData.mockResolvedValue(server);
  } else {
    serviceMock.getRuleChainMetaData.mockRejectedValue(new Error('down'));
  }
  setup(session, onAbandon);
  await act(async () => {
    await flowRef.save?.();
  });
  return session;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useRuleChainSave — 409 three-option loop', () => {
  it('a conflicted save opens the dialog with the server snapshot', async () => {
    await conflictSave(serverMeta(7));

    expect(screen.getByTestId('editor-conflict-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('editor-conflict-server')).toHaveTextContent(
      'v7',
    );
    expect(screen.getByTestId('editor-conflict-local')).toBeInTheDocument();
  });

  it('a conflicted save with a failed GET shows the unknown-server warning', async () => {
    await conflictSave(null);

    expect(screen.getByTestId('editor-conflict-server')).toHaveTextContent(
      '无法获取服务器最新版本',
    );
  });

  it('Option A loads the server version as the new baseline', async () => {
    const session = await conflictSave(serverMeta(7));

    fireEvent.click(screen.getByTestId('editor-conflict-load-server'));

    // happy-dom never finishes the modal leave animation — assert the state
    // effects instead of DOM removal (M7 dialog-test parity)
    expect(session.dirty).toBe(false);
    expect(session.current.chain.version).toBe(7);
    expect(session.current.nodes['local-0'].ruleNodeId?.id).toBe('n0');
  });

  it('Option B overwrites with the fresh server version and checkpoints', async () => {
    const session = await conflictSave(serverMeta(7));
    serviceMock.saveRuleChainMetaData.mockResolvedValue(serverMeta(8));
    serviceMock.getRuleChainMetaData.mockResolvedValue(serverMeta(8));

    fireEvent.click(screen.getByTestId('editor-conflict-overwrite'));

    // the force-save POST carried the fresh version
    await act(async () => {});
    const lastCall = serviceMock.saveRuleChainMetaData.mock.calls.at(-1)?.[0] as
      | RuleChainMetaData
      | undefined;
    expect(lastCall?.version).toBe(8);
    expect(session.dirty).toBe(false);
    expect(session.canUndo).toBe(false);
    expect(session.current.chain.version).toBe(8);
  });

  it('Option C exports the draft and adopts the server truth', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
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

    const session = await conflictSave(serverMeta(7));
    fireEvent.click(screen.getByTestId('editor-conflict-export-local'));

    expect(anchor.download).toBe('Test chain.json');
    expect(click).toHaveBeenCalled();
    // server truth replaces the abandoned draft
    expect(session.dirty).toBe(false);
    expect(session.current.chain.version).toBe(7);
    vi.restoreAllMocks();
  });

  it('Option C with an unknown server state abandons via onAbandon', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
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

    const onAbandon = vi.fn();
    await conflictSave(null, onAbandon);
    fireEvent.click(screen.getByTestId('editor-conflict-export-local'));

    expect(onAbandon).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
