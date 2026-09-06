/**
 * Queue form test (M14 wave-3, R33-3): the BATCH conditional batchSize
 * field appears/disappears with the radio, the name locks in edit mode,
 * the topic preview derives from the name, and the maxPause ≥ pause
 * cross-field validator rejects the 400-triggering combination.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp, Form } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhSettings from '@/locales/zh-CN/settings';
import type { QueueFormValues } from './data';
import QueueForm from './queue-form';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhSettings },
});

/** Harness: hoists the antd form instance to the test. */
function TestHost({
  editMode,
  formRef,
}: {
  editMode: boolean;
  formRef: (form: ReturnType<typeof Form.useForm<QueueFormValues>>[0]) => void;
}) {
  const [form] = Form.useForm<QueueFormValues>();
  formRef(form);
  return (
    <AntdApp>
      <RawIntlProvider value={intl}>
        <QueueForm form={form} editMode={editMode} />
      </RawIntlProvider>
    </AntdApp>
  );
}

describe('queue form', () => {
  it('shows the BATCH batchSize field only for the BATCH radio', async () => {
    const formRef: {
      current?: ReturnType<typeof Form.useForm<QueueFormValues>>[0];
    } = {};
    render(
      <TestHost
        editMode={false}
        formRef={(form) => {
          formRef.current = form;
        }}
      />,
    );
    // Default BURST: no batchSize field yet.
    expect(screen.queryByText('分组参数')).toBeNull();
    // Switch to BATCH via the radio (role query, recipient-dialog precedent)
    // → batchSize appears.
    fireEvent.click(screen.getByRole('radio', { name: /批量/ }));
    await waitFor(() => {
      expect(formRef.current?.getFieldValue(['submitStrategy', 'type'])).toBe(
        'BATCH',
      );
    });
    expect(await screen.findByText('分组参数')).toBeDefined();
    // Switch back → disappears again.
    fireEvent.click(screen.getByRole('radio', { name: /突发/ }));
    await waitFor(() => {
      expect(screen.queryByText('分组参数')).toBeNull();
    });
  });

  it('locks the name input in edit mode', () => {
    const formRef: {
      current?: ReturnType<typeof Form.useForm<QueueFormValues>>[0];
    } = {};
    const { container } = render(
      <TestHost
        editMode
        formRef={(form) => {
          formRef.current = form;
        }}
      />,
    );
    const nameInput = container.querySelector('input') as HTMLInputElement;
    expect(nameInput).toBeDisabled();
  });

  it('derives the topic preview while typing the name', async () => {
    const formRef: {
      current?: ReturnType<typeof Form.useForm<QueueFormValues>>[0];
    } = {};
    const { container } = render(
      <TestHost
        editMode={false}
        formRef={(form) => {
          formRef.current = form;
        }}
      />,
    );
    const nameInput = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'm14-wave3-test' } });
    await waitFor(() => {
      const preview = container.querySelector(
        'input[readonly], input[disabled]',
      ) as HTMLInputElement | null;
      expect(preview?.value).toBe('tb_rule_engine.m14-wave3-test');
    });
  });

  it('rejects maxPause smaller than pause (server-400 preemption)', async () => {
    const formRef: {
      current?: ReturnType<typeof Form.useForm<QueueFormValues>>[0];
    } = {};
    render(
      <TestHost
        editMode={false}
        formRef={(form) => {
          formRef.current = form;
        }}
      />,
    );
    const form = formRef.current as ReturnType<
      typeof Form.useForm<QueueFormValues>
    >[0];
    await form.setFieldsValue({
      processingStrategy: {
        type: 'RETRY_FAILED_AND_TIMED_OUT',
        retries: 3,
        failurePercentage: 0,
        pauseBetweenRetries: 5,
        maxPauseBetweenRetries: 3,
      },
    });
    await expect(form.validateFields()).rejects.toThrow();
    await waitFor(() => {
      expect(screen.getByText('重试额外间隔不能小于重试间隔。')).toBeDefined();
    });
  });
});
