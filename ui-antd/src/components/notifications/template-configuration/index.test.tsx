/**
 * TemplateConfiguration (shared message editor) tests: per-method block
 * rendering, the ui-ngx field caps, the onChange wire payload (enabled +
 * method injected), the icon enable linkage, the shared action-button block,
 * and the enabledMethods/disabled restrictions.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import zhSent from '@/locales/zh-CN/notifications/sent';
import {
  NotificationDeliveryMethod,
  NotificationType,
} from '@/types/tb/notification';
import { TemplateConfiguration } from './index';
import {
  actionButtonOf,
  emptyMethodTemplate,
  type TemplateValue,
  templateIconConfig,
  templateSubject,
} from './template-fields';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhSent } });

const M = NotificationDeliveryMethod;

/** Last emitted wire value (typed, with a guard for possibly-undefined). */
function lastWire(onChange: ReturnType<typeof vi.fn>): TemplateValue {
  const call = onChange.mock.calls.at(-1)?.[0];
  if (!call) {
    throw new Error('onChange was never called');
  }
  return call as TemplateValue;
}

/** Guarded per-method entry (TS narrows nothing on the Partial record). */
function entry(
  wire: TemplateValue,
  method: NotificationDeliveryMethod,
): NonNullable<TemplateValue[NotificationDeliveryMethod]> {
  const template = wire[method];
  if (!template) {
    throw new Error(`missing ${method} entry in onChange payload`);
  }
  return template;
}

function renderEditor(
  value: TemplateValue,
  onChange = vi.fn(),
  props: Partial<React.ComponentProps<typeof TemplateConfiguration>> = {},
) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <TemplateConfiguration
          value={value}
          onChange={onChange}
          notificationType={NotificationType.GENERAL}
          {...props}
        />
      </RawIntlProvider>
    </QueryClientProvider>,
  );
}

describe('TemplateConfiguration', () => {
  it('renders only enabled method blocks with localized titles', () => {
    renderEditor({
      [M.WEB]: emptyMethodTemplate(M.WEB),
      [M.SLACK]: { method: M.SLACK, enabled: true, body: '' },
    });
    expect(screen.getByTestId('template-method-WEB')).toBeInTheDocument();
    expect(screen.getByTestId('template-method-SLACK')).toBeInTheDocument();
    expect(screen.queryByTestId('template-method-SMS')).toBeNull();
    expect(screen.getByText('自定义消息')).toBeInTheDocument();
    expect(screen.getByText('查看文档')).toBeInTheDocument();
  });

  it('caps WEB subject/body inputs at 150/250', () => {
    renderEditor({ [M.WEB]: emptyMethodTemplate(M.WEB) });
    const subject = screen.getByLabelText('主题') as HTMLInputElement;
    const body = screen.getByTestId('template-body-WEB') as HTMLTextAreaElement;
    expect(subject.getAttribute('maxlength')).toBe('150');
    expect(body.getAttribute('maxlength')).toBe('250');
  });

  it('caps MOBILE_APP subject/body inputs at 50/150', () => {
    renderEditor({ [M.MOBILE_APP]: emptyMethodTemplate(M.MOBILE_APP) });
    expect(
      (screen.getByLabelText('主题') as HTMLInputElement).getAttribute(
        'maxlength',
      ),
    ).toBe('50');
    expect(
      (
        screen.getByTestId('template-body-MOBILE_APP') as HTMLTextAreaElement
      ).getAttribute('maxlength'),
    ).toBe('150');
  });

  it('emits the wire payload with enabled + method injected', async () => {
    const onChange = vi.fn();
    renderEditor({ [M.SMS]: emptyMethodTemplate(M.SMS) }, onChange);
    fireEvent.change(screen.getByTestId('template-body-SMS'), {
      target: { value: 'hello sms' },
    });
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith({
        [M.SMS]: { method: M.SMS, enabled: true, body: 'hello sms' },
      });
    });
  });

  it('carries the typed subject and body of every enabled method', async () => {
    const onChange = vi.fn();
    const view = renderEditor(
      {
        [M.WEB]: emptyMethodTemplate(M.WEB),
        [M.EMAIL]: emptyMethodTemplate(M.EMAIL),
      },
      onChange,
    );
    fireEvent.change(
      within(view.getByTestId('template-method-WEB')).getByLabelText('主题'),
      {
        target: { value: 'web subject' },
      },
    );
    await waitFor(() => {
      const wire = lastWire(onChange);
      expect(templateSubject(entry(wire, M.WEB))).toBe('web subject');
      expect(entry(wire, M.EMAIL).body).toBe('');
      expect(entry(wire, M.EMAIL).enabled).toBe(true);
    });
  });

  it('toggles the icon block through its switch and emits it', async () => {
    const onChange = vi.fn();
    renderEditor({ [M.WEB]: emptyMethodTemplate(M.WEB) }, onChange);
    // First Switch inside the WEB block is the icon toggle.
    const iconSwitch = screen
      .getByTestId('template-method-WEB')
      .querySelector('.ant-switch') as HTMLElement;
    fireEvent.click(iconSwitch);
    await waitFor(() => {
      const wire = lastWire(onChange);
      expect(templateIconConfig(entry(wire, M.WEB))?.enabled).toBe(true);
    });
  });

  it('emits the action-button config once enabled and filled', async () => {
    const onChange = vi.fn();
    const view = renderEditor(
      { [M.WEB]: emptyMethodTemplate(M.WEB) },
      onChange,
    );
    // The block holds both the Form.Item label and the switch label; the
    // switch is the only one inside the shared component root.
    fireEvent.click(
      view
        .getByTestId('action-button-configuration')
        .querySelector('.ant-switch') as HTMLElement,
    );
    fireEvent.change(view.getByTestId('action-button-text'), {
      target: { value: 'Go' },
    });
    fireEvent.change(view.getByTestId('action-button-link'), {
      target: { value: 'https://example.com' },
    });
    await waitFor(() => {
      const wire = lastWire(onChange);
      const button = actionButtonOf(entry(wire, M.WEB));
      expect(button).toMatchObject({
        enabled: true,
        text: 'Go',
        link: 'https://example.com',
      });
    });
  });

  it('respects enabledMethods', () => {
    renderEditor(
      {
        [M.WEB]: emptyMethodTemplate(M.WEB),
        [M.SMS]: emptyMethodTemplate(M.SMS),
      },
      vi.fn(),
      { enabledMethods: [M.SMS] },
    );
    expect(screen.queryByTestId('template-method-WEB')).toBeNull();
    expect(screen.getByTestId('template-method-SMS')).toBeInTheDocument();
  });

  it('disables every field under the disabled flag', () => {
    renderEditor({ [M.SMS]: emptyMethodTemplate(M.SMS) }, vi.fn(), {
      disabled: true,
    });
    expect(screen.getByTestId('template-body-SMS')).toBeDisabled();
  });

  it('reseeds from an external value change (method toggled on)', () => {
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <RawIntlProvider value={intl}>
          <TemplateConfiguration
            value={{ [M.WEB]: emptyMethodTemplate(M.WEB) }}
            notificationType={NotificationType.GENERAL}
          />
        </RawIntlProvider>
      </QueryClientProvider>,
    );
    expect(screen.queryByTestId('template-method-SMS')).toBeNull();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <RawIntlProvider value={intl}>
          <TemplateConfiguration
            value={{
              [M.WEB]: emptyMethodTemplate(M.WEB),
              [M.SMS]: emptyMethodTemplate(M.SMS),
            }}
            notificationType={NotificationType.GENERAL}
          />
        </RawIntlProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('template-method-SMS')).toBeInTheDocument();
  });
});
