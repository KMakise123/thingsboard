/**
 * FormPropertyForm tests: per-kind control inference, resolution precedence
 * (custom registry → uiHints → declared type → inference), per-field JSON
 * source mode, and the unknown-key value-fidelity guarantee.
 *
 * The CodeEditor is mocked (CodeMirror measures layout) — the JSON source
 * path is driven through a textarea stub.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FormPropertyForm,
  type FormPropertyFormProps,
} from './FormPropertyForm';
import { registerCustomComponent, resetCustomComponents } from './registry';
import { type FormProperty, FormPropertyType } from './types';
import type { UiHints } from './ui-hints';

vi.mock('../code-editor', () => ({
  CodeEditor: (props: {
    value?: string;
    onChange?: (next: string) => void;
    'data-testid'?: string;
  }) => (
    <textarea
      data-testid={props['data-testid'] ?? 'json-source-editor'}
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.target.value)}
    />
  ),
}));

afterEach(() => {
  cleanup();
  resetCustomComponents();
});

function prop(partial: Partial<FormProperty>): FormProperty {
  return {
    id: 'p',
    name: 'p',
    type: FormPropertyType.text,
    default: null,
    ...partial,
  };
}

function renderForm(
  properties: FormProperty[],
  value: Record<string, unknown>,
  overrides: Partial<FormPropertyFormProps> = {},
) {
  const onChange = vi.fn();
  render(
    <FormPropertyForm
      properties={properties}
      value={value}
      onChange={onChange}
      {...overrides}
    />,
  );
  return { onChange };
}

/** antd v6: mousedown on `.ant-select` opens the listbox; click option by text. */
async function pickSelectOption(fieldId: string, label: string) {
  const select = document.querySelector(
    `[data-testid="form-property-${fieldId}"] .ant-select`,
  );
  expect(select).not.toBeNull();
  fireEvent.mouseDown(select as HTMLElement);
  const option = await screen.findByText(label, {
    selector: '.ant-select-item-option-content',
  });
  fireEvent.click(option);
}

function field(id: string): HTMLElement {
  const el = document.querySelector(`[data-testid="form-property-${id}"]`);
  expect(el).not.toBeNull();
  return el as HTMLElement;
}

describe('FormPropertyForm — inference from value shape', () => {
  it('boolean value renders a Switch and emits a typed boolean, preserving unknown keys by reference', () => {
    const unknownNested = { deep: [1, 2, { keep: true }] };
    const value = { enabled: false, z: 'unknown-sibling', unknownNested };
    const { onChange } = renderForm(
      [prop({ id: 'enabled', name: 'Enabled', type: undefined as never })],
      value,
    );
    fireEvent.click(within(field('enabled')).getByRole('switch'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next.enabled).toBe(true);
    expect(next.z).toBe('unknown-sibling');
    expect(next.unknownNested).toBe(unknownNested); // reference identity
    expect(next).toEqual({
      enabled: true,
      z: 'unknown-sibling',
      unknownNested: { deep: [1, 2, { keep: true }] },
    });
  });

  it('number value renders an InputNumber and emits a number', () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 'port',
          name: 'Port',
          type: undefined as never,
          default: 1883,
        }),
      ],
      {},
    );
    fireEvent.change(within(field('port')).getByRole('spinbutton'), {
      target: { value: '8080' },
    });
    expect(onChange).toHaveBeenCalledWith({ port: 8080 });
  });

  it('string value with uiHints enumOptions renders a Select and emits the picked option value', async () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 'mode',
          name: 'Mode',
          type: undefined as never,
          default: '',
        }),
      ],
      { mode: 'fast' },
      {
        uiHints: {
          mode: {
            enumOptions: [
              { value: 'fast', label: 'Fast' },
              { value: 'slow', label: 'Slow' },
            ],
          },
        },
      },
    );
    await pickSelectOption('mode', 'Slow');
    expect(onChange).toHaveBeenCalledWith({ mode: 'slow' });
  });

  it('plain string renders an Input and the label falls back to the property id', () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 'plain',
          name: undefined,
          type: undefined as never,
          default: '',
        }),
      ],
      { plain: 'hello' },
    );
    const input = within(field('plain')).getByRole('textbox');
    expect(input).toHaveValue('hello');
    fireEvent.change(input, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith({ plain: 'world' });
    expect(within(field('plain')).getByText('plain')).toBeInTheDocument();
  });

  it('array of primitives renders a tags Select and emits the updated array', async () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 'tags',
          name: 'Tags',
          type: undefined as never,
          default: [],
        }),
      ],
      { tags: ['a'] },
      {
        uiHints: {
          tags: {
            enumOptions: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        },
      },
    );
    await pickSelectOption('tags', 'B');
    expect(onChange).toHaveBeenCalledWith({ tags: ['a', 'b'] });
  });
});

describe('FormPropertyForm — declared upstream property.type', () => {
  it('declared select with items wins over string-shape inference', async () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 'level',
          name: 'Level',
          type: FormPropertyType.select,
          default: 'low',
          items: [
            { value: 'low', label: 'Low' },
            { value: 'high', label: 'High' },
          ],
        }),
      ],
      { level: 'low' },
    );
    await pickSelectOption('level', 'High');
    expect(onChange).toHaveBeenCalledWith({ level: 'high' });
  });

  it('declared radios renders radio options and emits the picked value', () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 'dir',
          name: 'Direction',
          type: FormPropertyType.radios,
          default: 'row',
          items: [
            { value: 'row', label: 'Row' },
            { value: 'column', label: 'Column' },
          ],
        }),
      ],
      { dir: 'row' },
    );
    fireEvent.click(within(field('dir')).getByText('Column'));
    expect(onChange).toHaveBeenCalledWith({ dir: 'column' });
  });

  it('number property honors min/max/step via InputNumber and required marks the label', () => {
    renderForm(
      [
        prop({
          id: 'n',
          name: 'Count',
          type: FormPropertyType.number,
          default: 1,
          min: 1,
          max: 9,
          step: 2,
          required: true,
        }),
      ],
      { n: 3 },
    );
    expect(within(field('n')).getByRole('spinbutton')).toBeInTheDocument();
    expect(within(field('n')).getByText('Count *')).toBeInTheDocument();
  });
});

describe('FormPropertyForm — resolution precedence', () => {
  const CustomInput = ({
    value,
    onChange,
  }: {
    value: unknown;
    onChange: (next: unknown) => void;
  }) => (
    <input
      data-testid="custom-field"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
    />
  );

  it('uiHints.widget overrides the value-shape inference', () => {
    renderForm(
      [
        prop({
          id: 'count',
          name: 'Count',
          type: undefined as never,
          default: 0,
        }),
      ],
      { count: 5 },
      { uiHints: { count: { widget: 'input' } } },
    );
    // number value would infer InputNumber; the hint forces a plain Input
    expect(within(field('count')).getByRole('textbox')).toHaveValue('5');
    expect(within(field('count')).queryByRole('spinbutton')).toBeNull();
  });

  it('uiHints.jsonSource forces the JSON source editor', () => {
    renderForm(
      [prop({ id: 's', name: 'S', type: undefined as never, default: '' })],
      { s: 'text' },
      { uiHints: { s: { jsonSource: true } } },
    );
    expect(screen.getByTestId('s-json-editor')).toBeInTheDocument();
  });

  it('custom registry hit wins: by hint id and by property id', () => {
    registerCustomComponent('by-property-id', CustomInput);
    registerCustomComponent('by-hint-id', CustomInput);
    renderForm(
      [
        prop({
          id: 'by-property-id',
          name: 'A',
          type: FormPropertyType.text,
          default: '',
        }),
        prop({
          id: 'other',
          name: 'B',
          type: FormPropertyType.text,
          default: '',
        }),
      ],
      { byPropertyId: '', other: '' },
      { uiHints: { other: { customComponent: 'by-hint-id' } } },
    );
    expect(screen.getAllByTestId('custom-field')).toHaveLength(2);
  });

  it('per-instance customComponents map wins over the global registry', () => {
    registerCustomComponent('config', CustomInput);
    const Override = () => <input data-testid="override-field" />;
    renderForm(
      [
        prop({
          id: 'config',
          name: 'Config',
          type: FormPropertyType.text,
          default: '',
        }),
      ],
      { config: 'x' },
      { customComponents: { config: Override } },
    );
    expect(screen.getByTestId('override-field')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-field')).toBeNull();
  });
});

describe('FormPropertyForm — JSON source mode + fidelity', () => {
  it('object value falls back to the JSON editor and round-trips through edits', () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 'payload',
          name: 'Payload',
          type: undefined as never,
          default: {},
        }),
      ],
      { payload: { inner: 1 }, sibling: 'keep' },
    );
    expect(screen.getByTestId('payload-json-editor')).toHaveValue(
      '{\n  "inner": 1\n}',
    );
    fireEvent.change(screen.getByTestId('payload-json-editor'), {
      target: { value: '{ "inner": 2, "added": [1] }' },
    });
    const next = onChange.mock.calls[0][0];
    expect(next.payload).toEqual({ inner: 2, added: [1] });
    expect(next.sibling).toBe('keep');
  });

  it('invalid JSON in source mode shows an inline error and does not propagate', () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 'payload',
          name: 'Payload',
          type: undefined as never,
          default: {},
        }),
      ],
      { payload: { inner: 1 } },
    );
    fireEvent.change(screen.getByTestId('payload-json-editor'), {
      target: { value: '{inner:1' },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveAttribute(
      'data-json-error',
      'true',
    );
  });

  it('the per-field toggle swaps a normal input into JSON source mode', () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 'title',
          name: 'Title',
          type: FormPropertyType.text,
          default: '',
        }),
      ],
      { title: 'x' },
    );
    fireEvent.click(screen.getByTestId('json-toggle-title'));
    const editor = screen.getByTestId('title-json-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue('"x"');
    fireEvent.change(editor, { target: { value: '123' } });
    expect(onChange).toHaveBeenCalledWith({ title: 123 });
  });

  it('jsonFallbackEnabled=false hides the toggle but keeps the fallback control for objects', () => {
    renderForm(
      [
        prop({
          id: 'title',
          name: 'Title',
          type: FormPropertyType.text,
          default: '',
        }),
        prop({
          id: 'payload',
          name: 'Payload',
          type: undefined as never,
          default: {},
        }),
      ],
      { title: 'x', payload: {} },
      { jsonFallbackEnabled: false },
    );
    expect(screen.queryByTestId('json-toggle-title')).toBeNull();
    expect(screen.getByTestId('payload-json-editor')).toBeInTheDocument();
  });

  it('fieldset renders nested fields and a child edit preserves sibling keys', () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 'font',
          name: 'Font',
          type: FormPropertyType.fieldset,
          default: {},
          properties: [
            prop({
              id: 'size',
              name: 'Size',
              type: FormPropertyType.number,
              default: 12,
            }),
            prop({
              id: 'family',
              name: 'Family',
              type: FormPropertyType.text,
              default: '',
            }),
          ],
        }),
      ],
      { font: { size: 12, family: 'Roboto', extra: { nested: true } } },
    );
    fireEvent.change(within(field('font')).getByRole('spinbutton'), {
      target: { value: '14' },
    });
    const next = onChange.mock.calls[0][0];
    expect(next.font).toEqual({
      size: 14,
      family: 'Roboto',
      extra: { nested: true },
    });
  });
});

describe('FormPropertyForm — layout + safety', () => {
  it('groups sections by uiHints groupOrder and orders fields within a group', () => {
    renderForm(
      [
        prop({
          id: 'adv',
          name: 'Adv',
          group: 'Advanced',
          type: FormPropertyType.text,
          default: '',
        }),
        prop({
          id: 'basic2',
          name: 'B2',
          group: 'Basic',
          type: FormPropertyType.text,
          default: '',
        }),
        prop({
          id: 'basic1',
          name: 'B1',
          type: FormPropertyType.text,
          default: '',
        }),
      ],
      {},
      {
        uiHints: {
          adv: { groupOrder: 2 },
          basic2: { group: 'Basic', groupOrder: 1, order: 2 },
          basic1: { group: 'Basic', order: 1 },
        } satisfies UiHints,
      },
    );
    const headings = Array.from(document.querySelectorAll('h5')).map(
      (h) => h.textContent,
    );
    expect(headings).toEqual(['Basic', 'Advanced']);
    const ids = Array.from(
      document.querySelectorAll('[data-testid^="form-property-"]'),
    )
      .map((el) => el.getAttribute('data-testid'))
      .filter((id) => !id?.includes('form-property-form'));
    expect(ids).toEqual([
      'form-property-basic1',
      'form-property-basic2',
      'form-property-adv',
    ]);
  });

  it('renders nothing for empty properties and tolerates a null value', () => {
    const { container } = render(
      <FormPropertyForm
        properties={[]}
        value={null as unknown as Record<string, unknown>}
        onChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('with a null value, edits start from an empty object instead of crashing', () => {
    const { onChange } = renderForm(
      [
        prop({
          id: 's',
          name: 'S',
          type: FormPropertyType.text,
          default: 'dft',
        }),
      ],
      null as unknown as Record<string, unknown>,
    );
    expect(within(field('s')).getByRole('textbox')).toHaveValue('dft');
    fireEvent.change(within(field('s')).getByRole('textbox'), {
      target: { value: 'typed' },
    });
    expect(onChange).toHaveBeenCalledWith({ s: 'typed' });
  });

  it('renders nothing for htmlSection properties', () => {
    render(
      <FormPropertyForm
        properties={[
          prop({
            id: 'help',
            name: 'Help',
            type: FormPropertyType.htmlSection,
            default: null,
          }),
        ]}
        value={{}}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('form-property-help')).toBeNull();
  });
});
