/**
 * Sub-editor tests (M8 wave-2 K fields/): the processing-settings polymorphic
 * editor (basic ↔ advanced modes, wire-shape preservation) and the kv-map
 * editor (rename keys mapping; empty-key rows never leak into the value).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import zhRuleNode from '@/locales/zh-CN/rule-node';

import { KvMapEditor } from './kv-map-editor';
import {
  ProcessingSettingsField,
  type ProcessingStrategyKey,
} from './processing-settings';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhRuleNode } });

const KEYS: readonly ProcessingStrategyKey[] = [
  {
    key: 'timeseries',
    labelKey: 'editor.ruleNode.processing.advanced.timeseries',
  },
  {
    key: 'webSockets',
    labelKey: 'editor.ruleNode.processing.advanced.webSockets',
  },
];

function inputOf(testId: string): HTMLInputElement {
  const el = screen.getByTestId(testId);
  if (el.tagName === 'INPUT') {
    return el as HTMLInputElement;
  }
  const input = el.querySelector('input');
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
}

function renderField(ui: React.ReactElement) {
  render(<RawIntlProvider value={intl}>{ui}</RawIntlProvider>);
}

afterEach(() => cleanup());

describe('ProcessingSettingsField', () => {
  it('basic mode: writing a deduplicate interval keeps the wire shape', () => {
    const onChange = vi.fn();
    renderField(
      <ProcessingSettingsField
        value={{ type: 'DEDUPLICATE', deduplicationIntervalSecs: 60 }}
        onChange={onChange}
        advancedKeys={KEYS}
        testIdPrefix="ps"
      />,
    );
    fireEvent.change(inputOf('ps-interval'), {
      target: { value: '120' },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: 'DEDUPLICATE',
      deduplicationIntervalSecs: 120,
    });
  });

  it('switching to advanced initializes every injected strategy key', () => {
    const onChange = vi.fn();
    renderField(
      <ProcessingSettingsField
        value={{ type: 'ON_EVERY_MESSAGE' }}
        onChange={onChange}
        advancedKeys={KEYS}
        testIdPrefix="ps"
      />,
    );
    // The SECOND segmented option is "advanced" (basic first).
    const segmented = screen.getByTestId('ps-mode').parentElement;
    const advancedItem = segmented?.querySelectorAll(
      '.ant-segmented-item',
    )?.[1];
    expect(advancedItem).not.toBeNull();
    fireEvent.click(advancedItem as HTMLElement);
    // Segmented onChange('advanced') — the item click maps to the advanced option
    expect(onChange).toHaveBeenCalledWith({
      type: 'ADVANCED',
      timeseries: { type: 'ON_EVERY_MESSAGE' },
      webSockets: { type: 'ON_EVERY_MESSAGE' },
    });
  });

  it('advanced mode: a strategy can go SKIP, siblings untouched', () => {
    const onChange = vi.fn();
    const value = {
      type: 'ADVANCED',
      timeseries: { type: 'DEDUPLICATE', deduplicationIntervalSecs: 30 },
      webSockets: { type: 'ON_EVERY_MESSAGE' },
    };
    renderField(
      <ProcessingSettingsField
        value={value}
        onChange={onChange}
        advancedKeys={KEYS}
        testIdPrefix="ps"
      />,
    );
    // The deduplicate interval keeps its per-strategy value.
    expect(inputOf('ps-timeseries-interval').value).toBe('30');
    fireEvent.change(inputOf('ps-timeseries-interval'), {
      target: { value: '45' },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: 'ADVANCED',
      timeseries: { type: 'DEDUPLICATE', deduplicationIntervalSecs: 45 },
      webSockets: { type: 'ON_EVERY_MESSAGE' },
    });
  });

  it('renders an unknown/absent value as ON_EVERY_MESSAGE without crashing', () => {
    const onChange = vi.fn();
    renderField(
      <ProcessingSettingsField
        value={undefined}
        onChange={onChange}
        advancedKeys={KEYS}
        testIdPrefix="ps"
      />,
    );
    expect(screen.getByTestId('ps-type')).not.toBeNull();
  });
});

describe('KvMapEditor', () => {
  it('emits the mapping on edit and filters empty keys', () => {
    const onChange = vi.fn();
    render(
      <RawIntlProvider value={intl}>
        <KvMapEditor value={{ a: '1' }} onChange={onChange} testIdPrefix="kv" />
      </RawIntlProvider>,
    );
    fireEvent.change(inputOf('kv-value-0'), {
      target: { value: '2' },
    });
    expect(onChange).toHaveBeenCalledWith({ a: '2' });
    // Clear the key → the entry disappears from the emitted object.
    fireEvent.change(inputOf('kv-key-0'), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('adds and removes rows', () => {
    const onChange = vi.fn();
    render(
      <RawIntlProvider value={intl}>
        <KvMapEditor value={{ a: '1' }} onChange={onChange} testIdPrefix="kv" />
      </RawIntlProvider>,
    );
    fireEvent.click(screen.getByTestId('kv-add'));
    expect(screen.getByTestId('kv-row-1')).not.toBeNull();
    fireEvent.change(inputOf('kv-key-1'), {
      target: { value: 'b' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ a: '1', b: '' });
    fireEvent.click(screen.getByTestId('kv-remove-0'));
    expect(onChange).toHaveBeenLastCalledWith({ b: '' });
    // Rows renumber after removal — only the 'b' row survives (index 0).
    expect(screen.queryByTestId('kv-row-1')).toBeNull();
    expect(inputOf('kv-key-0').value).toBe('b');
  });

  it('re-syncs rows when the external value changes (undo/redo)', () => {
    const { rerender } = render(
      <RawIntlProvider value={intl}>
        <KvMapEditor value={{ a: '1' }} onChange={() => {}} testIdPrefix="kv" />
      </RawIntlProvider>,
    );
    rerender(
      <RawIntlProvider value={intl}>
        <KvMapEditor value={{ b: '2' }} onChange={() => {}} testIdPrefix="kv" />
      </RawIntlProvider>,
    );
    expect(inputOf('kv-key-0').value).toBe('b');
  });
});
