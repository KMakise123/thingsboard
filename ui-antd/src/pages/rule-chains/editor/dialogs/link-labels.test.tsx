/**
 * LinkLabelsDialog (D3) — dedicated suite (wave X): renders the candidate
 * list from the source descriptor relationTypes, multi-selects and returns
 * the label set through onConfirm as ONE callback, prefills edit-mode
 * initialLabels, allows arbitrary labels through the customRelations tags
 * mode, and pulls remote candidates from getRuleChainOutputLabels for
 * rule-chain-node sources. Service mocked at the module boundary (shell
 * test conventions); the dialog itself commits nothing (shell-owned).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhEditor from '@/locales/zh-CN/editor';
import zhRulechain from '@/locales/zh-CN/editor-rulechain';
import zhCanvas from '@/locales/zh-CN/editor-rulechain-canvas';

import type { LinkLabelsDialogPayload } from './link-labels';
import { LinkLabelsDialog } from './link-labels';

const serviceMock = vi.hoisted(() => ({
  getRuleChainOutputLabels: vi.fn(),
}));
vi.mock('@/services/tb/rule-chain', () => serviceMock);

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditor, ...zhRulechain, ...zhCanvas },
});

function renderDialog(
  payload: Partial<LinkLabelsDialogPayload> & {
    onConfirm: (labels: Array<string>) => void;
  },
) {
  const onClose = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <LinkLabelsDialog
          open
          payload={{
            mode: 'create',
            sourceUid: 'local-0',
            initialLabels: [],
            candidateLabels: ['True', 'False'],
            allowCustom: false,
            ...payload,
          }}
          onClose={onClose}
        />
      </QueryClientProvider>
    </RawIntlProvider>,
  );
  return { onClose };
}

function openSelect() {
  fireEvent.mouseDown(screen.getByRole('combobox'));
}

async function pickOption(label: string) {
  fireEvent.click(
    await screen.findByText(label, {
      selector: '.ant-select-item-option-content',
    }),
  );
}

function clickOk() {
  // antd renders two-CJK-char buttons with an inner space ("确 定")
  fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }));
}

beforeEach(() => {
  serviceMock.getRuleChainOutputLabels.mockReset();
  serviceMock.getRuleChainOutputLabels.mockResolvedValue([]);
});

describe('LinkLabelsDialog', () => {
  it('renders the descriptor relationTypes as the candidate options', async () => {
    renderDialog({ onConfirm: () => undefined });
    expect(screen.getByTestId('rc-link-labels-dialog')).toBeInTheDocument();
    openSelect();
    expect(
      await screen.findByText('True', {
        selector: '.ant-select-item-option-content',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('False', {
        selector: '.ant-select-item-option-content',
      }),
    ).toBeInTheDocument();
  });

  it('multi-selects and returns the whole label set through onConfirm once', async () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });
    openSelect();
    await pickOption('True');
    await pickOption('False');
    clickOk();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(['True', 'False']);
  });

  it('closes without confirming when cancelled', async () => {
    const onConfirm = vi.fn();
    const { onClose } = renderDialog({ onConfirm });
    openSelect();
    await pickOption('True');
    fireEvent.click(screen.getByRole('button', { name: '取 消' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prefills edit-mode initialLabels and keeps them on confirm', async () => {
    const onConfirm = vi.fn();
    renderDialog({
      mode: 'edit',
      edgeId: 'local-e0',
      initialLabels: ['True'],
      onConfirm,
    });
    // the existing label renders as a selected tag
    expect(screen.getByText('True')).toBeInTheDocument();
    clickOk();
    expect(onConfirm).toHaveBeenCalledWith(['True']);
  });

  it('empty selection keeps the OK button disabled (labels are required)', () => {
    renderDialog({ onConfirm: () => undefined });
    expect(screen.getByRole('button', { name: /确\s*定/ })).toBeDisabled();
  });

  it('customRelations sources use the tags mode and accept arbitrary labels', async () => {
    const onConfirm = vi.fn();
    renderDialog({ allowCustom: true, onConfirm });
    const combobox = screen.getByRole('combobox');
    openSelect();
    // typing a non-candidate label surfaces it as a creatable option
    fireEvent.change(combobox, { target: { value: 'Custom' } });
    await pickOption('Custom');
    clickOk();
    expect(onConfirm).toHaveBeenCalledWith(['Custom']);
  });

  it('rule-chain-node sources pull candidates from getRuleChainOutputLabels', async () => {
    serviceMock.getRuleChainOutputLabels.mockResolvedValue([
      'Success',
      'Failure',
    ]);
    const onConfirm = vi.fn();
    renderDialog({
      sourceRuleChainId: 'rc-target',
      onConfirm,
    });
    openSelect();
    // descriptor relationTypes are NOT the candidates here — the remote
    // output labels are
    expect(
      await screen.findByText('Success', {
        selector: '.ant-select-item-option-content',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Failure', {
        selector: '.ant-select-item-option-content',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('True')).toBeNull();
    await pickOption('Success');
    clickOk();
    expect(serviceMock.getRuleChainOutputLabels).toHaveBeenCalledWith(
      'rc-target',
    );
    expect(onConfirm).toHaveBeenCalledWith(['Success']);
  });
});
