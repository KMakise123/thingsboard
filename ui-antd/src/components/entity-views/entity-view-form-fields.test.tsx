/**
 * EntityViewFormFields regression (M2 real-device acceptance): the wrapper
 * around the free-tag type AutoComplete must forward Form.Item's
 * value/onChange — otherwise typed text never lands in the form state and
 * every create/save fails the required-type validation.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { Form } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhEntityViews from '@/locales/zh-CN/entityViews';

import EntityViewFormFields from './EntityViewFormFields';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhEntityViews },
});

vi.mock('@/services/tb/entity-view', () => ({
  getEntityViewTypes: vi.fn(async () => [{ type: 'thermostat' }]),
}));
vi.mock('@/services/tb/device', () => ({
  getTenantDevices: vi.fn(async () => ({ data: [], totalElements: 0 })),
}));
vi.mock('@/services/tb/asset', () => ({
  getTenantAssets: vi.fn(async () => ({ data: [], totalElements: 0 })),
}));

function renderFields(onFinish: (values: Record<string, unknown>) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // name/targetEntityType/targetEntityId are seeded so the submit only has
  // to prove the typed `type` value reaches the form state.
  return render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <Form
          onFinish={onFinish}
          initialValues={{
            name: 'ev-1',
            targetEntityType: 'DEVICE',
            targetEntityId: 'device-1',
          }}
        >
          <EntityViewFormFields />
        </Form>
      </QueryClientProvider>
    </RawIntlProvider>,
  );
}

describe('EntityViewFormFields', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('a free-typed entity-view type lands in the form state on submit', async () => {
    const submitted: Array<Record<string, unknown>> = [];
    renderFields((values) => submitted.push(values));

    // The type AutoComplete is the first combobox input of the form (the
    // keys/target selects follow inside the accordions and the entity row).
    const input = document.querySelector(
      'input.ant-select-input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'm2qa-type-a' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(submitted).toHaveLength(1);
    });
    expect(submitted[0].type).toBe('m2qa-type-a');
  });
});
