/**
 * Wizard flow tests: profile -> details -> credentials -> connectivity.
 * Asserts the exact wire payloads handed to services (device + credentials)
 * and the step transitions, mirroring device-wizard parity.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhDevices from '@/locales/zh-CN/devices/list';

const intl = createIntl({ locale: 'zh-CN', messages: zhDevices });

import { type Device, DeviceCredentialsType, EntityType } from '@/types/tb';

import { DeviceWizardModal } from './DeviceWizardModal';

const servicesMock = vi.hoisted(() => ({
  getDeviceProfiles: vi.fn(),
  saveDevice: vi.fn(),
  saveDeviceWithCredentials: vi.fn(),
  getDeviceConnectivity: vi.fn(),
}));

vi.mock('@/services/tb/device', () => servicesMock);

vi.mock('@/core/ws/hooks', () => ({
  useAttributeSubscription: () => ({ data: [], status: 'connected' }),
  useLatestTelemetrySubscription: () => ({ data: [], status: 'connected' }),
}));

const profiles = [
  {
    id: { entityType: EntityType.DEVICE_PROFILE, id: 'profile-default' },
    name: '默认配置',
    type: 'DEFAULT',
    transportType: 'DEFAULT',
  },
  {
    id: { entityType: EntityType.DEVICE_PROFILE, id: 'profile-mqtt' },
    name: 'MQTT 配置',
    type: 'DEFAULT',
    transportType: 'MQTT',
  },
];

const createdDevice: Device = {
  id: { entityType: EntityType.DEVICE, id: 'device-1' },
  createdTime: 1_700_000_000_000,
  name: 'm1-test-list-wizard',
  deviceProfileId: {
    entityType: EntityType.DEVICE_PROFILE,
    id: 'profile-default',
  },
};

function renderWizard(
  props: Partial<React.ComponentProps<typeof DeviceWizardModal>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <DeviceWizardModal
            open
            onClose={vi.fn()}
            onCreated={vi.fn()}
            {...props}
          />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

/** antd Select: open the dropdown then click an option by text. */
async function pickSelectOption(label: string) {
  // antd v6 renders `.ant-select > .ant-select-content` (no `-selector` node);
  // mousedown on the root opens the listbox.
  const select = document.querySelector('.ant-select');
  expect(select).not.toBeNull();
  fireEvent.mouseDown(select as HTMLElement);
  const option = await screen.findByText(label, {
    selector: '.ant-select-item-option-content',
  });
  fireEvent.click(option);
  // Let the option's onChange land in the form before the caller proceeds.
  await new Promise((resolve) => setTimeout(resolve, 100));
}

describe('DeviceWizardModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getDeviceProfiles.mockResolvedValue({
      data: profiles,
      totalElements: profiles.length,
    });
    servicesMock.getDeviceConnectivity.mockResolvedValue({});
    servicesMock.saveDevice.mockResolvedValue(createdDevice);
    servicesMock.saveDeviceWithCredentials.mockResolvedValue(createdDevice);
  });

  it('walks profile -> details and blocks empty names', async () => {
    renderWizard();
    await pickSelectOption('默认配置');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    // Details step without a name -> validation error, no further step.
    await screen.findByLabelText('名称');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    await waitFor(() => {
      expect(screen.getByText('名称为必填项。')).toBeInTheDocument();
    });
    expect(servicesMock.saveDevice).not.toHaveBeenCalled();
  });

  it('creates with the prefilled ACCESS_TOKEN credentials, then shows connectivity', async () => {
    const onCreated = vi.fn();
    renderWizard({ onCreated });

    await pickSelectOption('默认配置');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    const nameInput = await screen.findByLabelText('名称');
    fireEvent.change(nameInput, {
      target: { value: 'm1-test-list-wizard' },
    });
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    // Credentials step: ACCESS_TOKEN is the default type with a generated token.
    const tokenInput = await screen.findByLabelText('访问 Token');
    const token = (tokenInput as HTMLInputElement).value;
    expect(token).toMatch(/^.{20}$/);

    fireEvent.click(screen.getByRole('button', { name: '创建设备' }));
    await waitFor(() => {
      expect(servicesMock.saveDeviceWithCredentials).toHaveBeenCalledTimes(1);
    });

    const [device, credentials] =
      servicesMock.saveDeviceWithCredentials.mock.calls[0];
    expect(device).toMatchObject({
      name: 'm1-test-list-wizard',
      deviceProfileId: {
        entityType: EntityType.DEVICE_PROFILE,
        id: 'profile-default',
      },
      additionalInfo: { gateway: false, overwriteActivityTime: false },
    });
    expect(credentials).toMatchObject({
      credentialsType: DeviceCredentialsType.ACCESS_TOKEN,
      credentialsId: token,
    });

    // Connectivity step fetched commands for the fresh device id.
    await waitFor(() => {
      expect(servicesMock.getDeviceConnectivity).toHaveBeenCalledWith(
        'device-1',
      );
    });

    // antd auto-inserts a space between the two CJK chars in the button.
    fireEvent.click(screen.getByRole('button', { name: /完\s*成/ }));
    expect(onCreated).toHaveBeenCalledWith(createdDevice);
  });

  it('serializes MQTT_BASIC credentials as a JSON string', async () => {
    renderWizard();

    await pickSelectOption('默认配置');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    const nameInput = await screen.findByLabelText('名称');
    fireEvent.change(nameInput, {
      target: { value: 'm1-test-list-mqtt' },
    });
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    // Switch the type toggle to MQTT Basic.
    fireEvent.click(await screen.findByText('MQTT Basic'));
    fireEvent.change(await screen.findByLabelText('Client ID'), {
      target: { value: 'm1-client' },
    });
    fireEvent.change(screen.getByLabelText('用户名'), {
      target: { value: 'm1-user' },
    });
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'm1-pass' },
    });

    fireEvent.click(screen.getByRole('button', { name: '创建设备' }));
    await waitFor(() => {
      expect(servicesMock.saveDeviceWithCredentials).toHaveBeenCalledTimes(1);
    });
    const [, credentials] =
      servicesMock.saveDeviceWithCredentials.mock.calls[0];
    expect(credentials.credentialsType).toBe(DeviceCredentialsType.MQTT_BASIC);
    expect(JSON.parse(credentials.credentialsValue as string)).toEqual({
      clientId: 'm1-client',
      userName: 'm1-user',
      password: 'm1-pass',
    });
  });

  it('falls back to plain saveDevice (backend-minted token) on the skip path', async () => {
    renderWizard();

    await pickSelectOption('默认配置');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    const nameInput = await screen.findByLabelText('名称');
    fireEvent.change(nameInput, {
      target: { value: 'm1-test-list-skip' },
    });
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    fireEvent.click(
      await screen.findByRole('button', { name: '跳过（自动生成凭证）' }),
    );
    await waitFor(() => {
      expect(servicesMock.saveDevice).toHaveBeenCalledTimes(1);
    });
    expect(servicesMock.saveDeviceWithCredentials).not.toHaveBeenCalled();
    expect(servicesMock.saveDevice.mock.calls[0][0]).toMatchObject({
      name: 'm1-test-list-skip',
    });
  });
});
