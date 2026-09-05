/**
 * MetadataPanel tests (M11 wave-2D): the validity gate (title required,
 * sizes 1-24), the tags tab add/delete flows, behavior default-settings
 * factories and the properties CRUD.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { useState } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import {
  defaultGetValueSettings,
  emptyMetadata,
  ScadaSymbolBehaviorType,
  type ScadaSymbolMetadata,
  ValueType,
} from '@/core/scada/symbol-metadata';
import zhCommon from '@/locales/zh-CN/common';
import zhEditor from '@/locales/zh-CN/resources/scada-symbol-editor';
import { MetadataPanel } from './metadata-panel';
import { isMetadataValid } from './metadata-valid';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhEditor },
});

vi.mock('@/components/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange?: (value: string) => void;
  }) => (
    <textarea
      data-testid="code-editor"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

/**
 * Stateful harness: the panel is controlled, so the harness feeds each
 * onChange result back as the next prop (page parity).
 */
function renderPanel(
  initial = emptyMetadata(),
  canvasTags: string[] = [] as string[],
) {
  const queryClient = new QueryClient();
  const onChange = vi.fn();
  function Harness() {
    const [metadata, setMetadata] = useState<ScadaSymbolMetadata>(initial);
    return (
      <MetadataPanel
        metadata={metadata}
        onChange={(next) => {
          onChange(next);
          setMetadata(next);
        }}
        canvasTags={canvasTags}
        disabled={false}
      />
    );
  }
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <Harness />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
  return { ...view, onChange };
}

const lastMetadata = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.calls.at(-1)?.[0] as ReturnType<typeof emptyMetadata>;

describe('isMetadataValid', () => {
  it('requires a non-empty title', () => {
    expect(isMetadataValid({ ...emptyMetadata(), title: '' })).toBe(false);
    expect(isMetadataValid({ ...emptyMetadata(), title: 'Pump' })).toBe(true);
    expect(isMetadataValid({ ...emptyMetadata(), title: '   ' })).toBe(false);
  });

  it('requires integer sizes within 1-24', () => {
    expect(
      isMetadataValid({ ...emptyMetadata(), title: 'T', widgetSizeX: 0 }),
    ).toBe(false);
    expect(
      isMetadataValid({ ...emptyMetadata(), title: 'T', widgetSizeY: 25 }),
    ).toBe(false);
    expect(
      isMetadataValid({ ...emptyMetadata(), title: 'T', widgetSizeX: 2.5 }),
    ).toBe(false);
    expect(
      isMetadataValid({
        ...emptyMetadata(),
        title: 'T',
        widgetSizeX: 24,
        widgetSizeY: 1,
      }),
    ).toBe(true);
  });

  it('rejects missing metadata', () => {
    expect(isMetadataValid(null)).toBe(false);
  });
});

describe('MetadataPanel interactions', () => {
  it('general tab edits propagate to onChange', () => {
    const { onChange } = renderPanel();
    fireEvent.change(screen.getByTestId('scada-general-title'), {
      target: { value: 'Pump' },
    });
    expect(lastMetadata(onChange).title).toBe('Pump');
  });

  it('tags tab offers unconfigured canvas tags and deletes rows', () => {
    const metadata = {
      ...emptyMetadata(),
      tags: [{ tag: 'valve', stateRenderFunction: 'return;' }],
    };
    const { onChange } = renderPanel(metadata, ['valve', 'lamp']);
    fireEvent.click(screen.getByText('标签'));
    // lamp has no config row → add button.
    fireEvent.click(screen.getByTestId('scada-tags-add-lamp'));
    expect(
      lastMetadata(onChange).tags.map((t: { tag: string }) => t.tag),
    ).toEqual(['valve', 'lamp']);
    fireEvent.click(screen.getByTestId('scada-tags-delete-valve'));
    expect(
      lastMetadata(onChange).tags.map((t: { tag: string }) => t.tag),
    ).toEqual(['lamp']);
  });

  it('behavior add seeds upstream-exact default settings', () => {
    const { onChange } = renderPanel();
    fireEvent.click(screen.getByText('行为'));
    fireEvent.click(screen.getByTestId('scada-behavior-add'));
    const row = lastMetadata(onChange).behavior[0];
    expect(row.type).toBe(ScadaSymbolBehaviorType.value);
    expect(row.valueType).toBe(ValueType.BOOLEAN);
    expect(row.defaultGetValueSettings).toEqual(
      defaultGetValueSettings(ValueType.BOOLEAN),
    );
  });

  it('properties add/delete rows', () => {
    const { onChange } = renderPanel();
    fireEvent.click(screen.getByText('属性'));
    fireEvent.click(screen.getByTestId('scada-properties-add'));
    const added = lastMetadata(onChange).properties;
    expect(added).toHaveLength(1);
    expect(added[0].type).toBe('text');
  });
});
