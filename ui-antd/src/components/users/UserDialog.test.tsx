/**
 * User dialog tests: the authority↔customer coupling (customer users require
 * an assigned customer), the create payload shape (no id/createdTime — the
 * backend mints them) and the ui-ngx activation-method fork (display link vs
 * send mail), plus the edit flow that keeps scope fields frozen.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerErrorError } from '@/core/http/server-error';
import zhUsers from '@/locales/zh-CN/users';
import { Authority, EntityType, type User } from '@/types/tb';

import { UserDialog } from './UserDialog';

const intl = createIntl({ locale: 'zh-CN', messages: zhUsers });

const servicesMock = vi.hoisted(() => ({
  saveUser: vi.fn(),
  getUserActivationLinkInfo: vi.fn(),
}));

const customerMock = vi.hoisted(() => ({
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
}));

vi.mock('@/services/tb/user', () => servicesMock);
vi.mock('@/services/tb/customer', () => customerMock);

const CUSTOMERS_PAGE = {
  data: [
    {
      id: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
      tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
      createdTime: 0,
      title: '工厂 A',
    },
    {
      id: { entityType: EntityType.CUSTOMER, id: 'cust-2' },
      tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
      createdTime: 0,
      title: '工厂 B',
    },
  ],
  totalElements: 2,
};

const CREATED_USER: User = {
  id: { entityType: EntityType.USER, id: 'user-new' },
  createdTime: 1_700_000_000_000,
  email: 'new-cu@thingsboard.org',
  authority: Authority.CUSTOMER_USER,
  customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
};

const EDIT_USER: User = {
  id: { entityType: EntityType.USER, id: 'user-edit' },
  createdTime: 1_690_000_000_000,
  email: 'edit-cu@thingsboard.org',
  authority: Authority.CUSTOMER_USER,
  firstName: '明',
  customerId: { entityType: EntityType.CUSTOMER, id: 'cust-2' },
  additionalInfo: { description: '旧描述', userActivated: true },
};

function renderDialog(
  props: Partial<React.ComponentProps<typeof UserDialog>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <UserDialog open onClose={vi.fn()} onSaved={vi.fn()} {...props} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

/** antd Select: open the nth dropdown then click an option by text. */
async function pickSelectOption(index: number, label: string) {
  const select = document.querySelectorAll('.ant-select')[index];
  expect(select).not.toBeUndefined();
  fireEvent.mouseDown(select as HTMLElement);
  const option = await screen.findByText(label, {
    selector: '.ant-select-item-option-content',
  });
  fireEvent.click(option);
  // Let the option's onChange land in the form before the caller proceeds.
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function fillEmail(email: string) {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: email },
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
}

describe('UserDialog (create)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    customerMock.getCustomers.mockResolvedValue(CUSTOMERS_PAGE);
    customerMock.getCustomerById.mockResolvedValue(CUSTOMERS_PAGE.data[0]);
    servicesMock.saveUser.mockResolvedValue(CREATED_USER);
    servicesMock.getUserActivationLinkInfo.mockResolvedValue({
      value: 'http://localhost:8080/api/noauth/activate?activateToken=t',
      ttlMs: 86_400_000,
    });
  });

  it('requires a customer when the authority is CUSTOMER_USER', async () => {
    renderDialog();

    await fillEmail('new-cu@thingsboard.org');
    fireEvent.click(screen.getByRole('button', { name: '添 加' }));

    expect(
      await screen.findByText('客户用户必须选择所属客户。'),
    ).toBeInTheDocument();
    expect(servicesMock.saveUser).not.toHaveBeenCalled();
  });

  it('rejects an invalid email before calling the service', async () => {
    renderDialog();

    await fillEmail('not-an-email');
    fireEvent.click(screen.getByRole('button', { name: '添 加' }));

    expect(await screen.findByText('Email 格式无效。')).toBeInTheDocument();
    expect(servicesMock.saveUser).not.toHaveBeenCalled();
  });

  it('creates a customer user and chains into the activation-link outcome', async () => {
    const onSaved = vi.fn();
    renderDialog({ onSaved });

    await fillEmail('new-cu@thingsboard.org');
    // First select = authority (prefilled CUSTOMER_USER), second = customer.
    await pickSelectOption(1, '工厂 A');
    fireEvent.click(screen.getByRole('button', { name: '添 加' }));

    await waitFor(() => {
      expect(servicesMock.saveUser).toHaveBeenCalledTimes(1);
    });
    expect(servicesMock.saveUser).toHaveBeenCalledWith(
      {
        email: 'new-cu@thingsboard.org',
        firstName: undefined,
        lastName: undefined,
        authority: Authority.CUSTOMER_USER,
        customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
        additionalInfo: { description: undefined },
      },
      { sendActivationMail: false },
    );
    // DISPLAY_ACTIVATION_LINK default -> the dialog fetches the link info.
    await waitFor(() => {
      expect(servicesMock.getUserActivationLinkInfo).toHaveBeenCalledWith(
        'user-new',
      );
    });
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith({
        user: CREATED_USER,
        outcome: {
          type: 'activationLink',
          link: 'http://localhost:8080/api/noauth/activate?activateToken=t',
          ttlMs: 86_400_000,
        },
      });
    });
  });

  it('sends the activation mail instead when that method is chosen', async () => {
    const onSaved = vi.fn();
    renderDialog({ onSaved });

    await fillEmail('new-cu@thingsboard.org');
    await pickSelectOption(1, '工厂 A');
    // Third select = activation method (create mode only).
    await pickSelectOption(2, '发送激活邮件');
    fireEvent.click(screen.getByRole('button', { name: '添 加' }));

    await waitFor(() => {
      expect(servicesMock.saveUser).toHaveBeenCalledWith(expect.anything(), {
        sendActivationMail: true,
      });
    });
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith({
        user: CREATED_USER,
        outcome: { type: 'activationMailSent' },
      });
    });
    expect(servicesMock.getUserActivationLinkInfo).not.toHaveBeenCalled();
  });

  it('creates a tenant admin without a customer', async () => {
    servicesMock.saveUser.mockResolvedValue({
      ...CREATED_USER,
      id: { entityType: EntityType.USER, id: 'user-ta' },
      authority: Authority.TENANT_ADMIN,
      customerId: undefined,
    });
    const onSaved = vi.fn();
    renderDialog({ onSaved });

    await fillEmail('new-ta@thingsboard.org');
    await pickSelectOption(0, '租户管理员');
    fireEvent.click(screen.getByRole('button', { name: '添 加' }));

    await waitFor(() => {
      expect(servicesMock.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new-ta@thingsboard.org',
          authority: Authority.TENANT_ADMIN,
          customerId: undefined,
        }),
        { sendActivationMail: false },
      );
    });
  });
});

describe('UserDialog (edit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    customerMock.getCustomers.mockResolvedValue(CUSTOMERS_PAGE);
    customerMock.getCustomerById.mockResolvedValue(CUSTOMERS_PAGE.data[0]);
    servicesMock.saveUser.mockImplementation(async (user: User) => user);
  });

  it('prefills the form, freezes scope fields and merges the description', async () => {
    const onSaved = vi.fn();
    renderDialog({ user: EDIT_USER, onSaved });

    expect(await screen.findByLabelText('Email')).toHaveValue(
      'edit-cu@thingsboard.org',
    );
    // Authority + customer are disabled on edit (frozen after creation).
    const authoritySelect = document.querySelectorAll('.ant-select')[0];
    expect(authoritySelect).toHaveClass('ant-select-disabled');

    fireEvent.change(screen.getByLabelText('描述'), {
      target: { value: '新描述' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));

    await waitFor(() => {
      expect(servicesMock.saveUser).toHaveBeenCalledTimes(1);
    });
    expect(servicesMock.saveUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: EDIT_USER.id,
        createdTime: EDIT_USER.createdTime,
        email: 'edit-cu@thingsboard.org',
        firstName: '明',
        customerId: EDIT_USER.customerId,
        additionalInfo: expect.objectContaining({ description: '新描述' }),
      }),
      { sendActivationMail: false },
    );
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith({
        user: expect.objectContaining({ id: EDIT_USER.id }),
        outcome: { type: 'updated' },
      });
    });
  });

  it('surfaces the server error inside the dialog', async () => {
    servicesMock.saveUser.mockRejectedValue(
      new ServerErrorError({
        status: 400,
        detail: 'Email 已被占用',
        titleKey: 'tb.error.badRequest',
      }),
    );
    renderDialog({ user: EDIT_USER });

    fireEvent.click(screen.getByRole('button', { name: '保 存' }));

    expect(await screen.findByText('Email 已被占用')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保 存' })).toBeInTheDocument();
  });
});
