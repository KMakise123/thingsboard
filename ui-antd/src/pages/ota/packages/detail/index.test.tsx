/**
 * OTA package detail page tests (M13 wave-2): the info-endpoint load (never
 * the full base64 GET), the frozen form (everything disabled except the
 * description), the details button group (copy buttons presence, download
 * enablement and blob streaming) and the description-only save. Services
 * are mocked at the module boundary — the module exposes no full-entity
 * reader, so the forbidden GET /api/otaPackage/{id} is unreachable by
 * construction.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhMenu from '@/locales/zh-CN/menu';
import zhOta from '@/locales/zh-CN/ota';
import { EntityType } from '@/types/tb';
import type { OtaPackageInfo } from '@/types/tb/ota';
import { OtaPackageType } from '@/types/tb/ota';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhMenu, ...zhOta },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
const paramsMock = vi.hoisted(() => ({ id: 'pkg-1' }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => paramsMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const otaMock = vi.hoisted(() => ({
  getOtaPackageInfo: vi.fn(),
  saveOtaPackageInfo: vi.fn(),
  deleteOtaPackage: vi.fn(),
  downloadOtaPackage: vi.fn(),
}));

const deviceMock = vi.hoisted(() => ({
  getDeviceProfiles: vi.fn(),
}));

const downloadBlobMock = vi.hoisted(() => ({ downloadBlob: vi.fn() }));

vi.mock('@/services/tb/ota', () => otaMock);
vi.mock('@/services/tb/device', () => deviceMock);
vi.mock('@/components/shared/download-blob', () => downloadBlobMock);

vi.mock('@ant-design/pro-components', () => ({
  // Thin passthrough: the page header (ADR 0008) renders extra + children.
  PageContainer: (props: {
    extra?: React.ReactNode;
    content?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      {props.extra}
      {props.content}
      {props.children}
    </div>
  ),
}));

import OtaPackageDetailPage from './index';

function fixture(extra: Partial<OtaPackageInfo> = {}): OtaPackageInfo {
  return {
    id: { entityType: EntityType.OTA_PACKAGE, id: 'pkg-1' },
    createdTime: 1_700_000_000_000,
    title: 'Firmware A',
    version: 'v1.0',
    tag: 'stable',
    type: OtaPackageType.FIRMWARE,
    deviceProfileId: { entityType: EntityType.DEVICE_PROFILE, id: 'prof-1' },
    fileName: 'fw-a.bin',
    dataSize: 2048,
    contentType: 'application/octet-stream',
    checksumAlgorithm: 'SHA256',
    checksum: 'abcd1234',
    hasData: true,
    additionalInfo: { description: 'initial text' },
    ...extra,
  } as OtaPackageInfo;
}

const FILE_PACKAGE = fixture();
const URL_PACKAGE = fixture({
  url: 'https://example.com/dl/fw-a.bin',
  fileName: undefined,
  dataSize: undefined,
  contentType: undefined,
  checksumAlgorithm: undefined,
  checksum: undefined,
});

const PROFILES_PAGE = {
  data: [
    {
      id: { entityType: EntityType.DEVICE_PROFILE, id: 'prof-1' },
      name: '默认配置',
    },
  ],
  totalElements: 1,
  totalPages: 1,
  hasNext: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <AntdApp>
          <OtaPackageDetailPage />
        </AntdApp>
      </RawIntlProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  otaMock.getOtaPackageInfo.mockResolvedValue(FILE_PACKAGE);
  otaMock.saveOtaPackageInfo.mockResolvedValue(FILE_PACKAGE);
  otaMock.deleteOtaPackage.mockResolvedValue(undefined);
  otaMock.downloadOtaPackage.mockResolvedValue(new Blob(['bytes']));
  deviceMock.getDeviceProfiles.mockResolvedValue(PROFILES_PAGE);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('OtaPackageDetailPage', () => {
  it('loads through the info endpoint and renders the frozen form', async () => {
    renderPage();

    expect(await screen.findByLabelText('标题')).toBeInTheDocument();
    expect(otaMock.getOtaPackageInfo).toHaveBeenCalledWith('pkg-1');

    await waitFor(() => {
      expect((screen.getByLabelText('标题') as HTMLInputElement).value).toBe(
        'Firmware A',
      );
    });
    expect((screen.getByLabelText('版本') as HTMLInputElement).value).toBe(
      'v1.0',
    );
    expect((screen.getByLabelText('文件名') as HTMLInputElement).value).toBe(
      'fw-a.bin',
    );
    expect((screen.getByLabelText('描述') as HTMLTextAreaElement).value).toBe(
      'initial text',
    );
    // Frozen: immutable controls disabled, description editable.
    expect(screen.getByLabelText('标题')).toBeDisabled();
    expect(screen.getByLabelText('版本')).toBeDisabled();
    expect(screen.getByLabelText('版本标签')).toBeDisabled();
    expect(screen.getByLabelText('设备配置档')).toBeDisabled();
    expect(screen.getByLabelText('描述')).not.toBeDisabled();
  });

  it('always shows copy id, checksum copy only when present', async () => {
    renderPage();
    await screen.findByLabelText('标题');

    expect(
      screen.getByRole('button', { name: '复制包 Id' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '复制校验和' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '复制直链 URL' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '复制包 Id' }));
    await screen.findByText('包 Id 已复制到剪贴板');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('pkg-1');
  });

  it('shows the direct-url copy only for URL packages', async () => {
    otaMock.getOtaPackageInfo.mockResolvedValue(URL_PACKAGE);
    renderPage();
    await screen.findByLabelText('标题');

    expect(
      screen.getByRole('button', { name: '复制直链 URL' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '复制校验和' })).toBeNull();
  });

  it('copies the checksum value', async () => {
    renderPage();
    await screen.findByLabelText('标题');

    fireEvent.click(screen.getByRole('button', { name: '复制校验和' }));
    await screen.findByText('包校验和已复制到剪贴板');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abcd1234');
  });

  it('streams a blob for a file package', async () => {
    renderPage();
    await screen.findByLabelText('标题');

    fireEvent.click(screen.getByRole('button', { name: '下载 OTA 包' }));

    await waitFor(() => {
      expect(downloadBlobMock.downloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        'fw-a.bin',
      );
    });
    expect(otaMock.downloadOtaPackage).toHaveBeenCalledWith('pkg-1');
  });

  it('disables download for a URL package', async () => {
    otaMock.getOtaPackageInfo.mockResolvedValue(URL_PACKAGE);
    renderPage();
    await screen.findByLabelText('标题');

    expect(screen.getByRole('button', { name: '下载 OTA 包' })).toBeDisabled();
    expect(otaMock.downloadOtaPackage).not.toHaveBeenCalled();
  });

  it('saves the description only, echoing the frozen fields back', async () => {
    renderPage();
    await screen.findByLabelText('标题');

    fireEvent.change(screen.getByLabelText('描述'), {
      target: { value: 'updated text' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(otaMock.saveOtaPackageInfo).toHaveBeenCalledTimes(1);
    });
    const request = otaMock.saveOtaPackageInfo.mock.calls[0][0];
    // Immutable fields are echoed verbatim; only the description differs.
    expect(request.title).toBe('Firmware A');
    expect(request.version).toBe('v1.0');
    expect(request.type).toBe(OtaPackageType.FIRMWARE);
    expect(request.checksum).toBe('abcd1234');
    expect(request.deviceProfileId).toEqual({
      entityType: EntityType.DEVICE_PROFILE,
      id: 'prof-1',
    });
    expect(request.usesUrl).toBe(false);
    expect(request.additionalInfo).toEqual({ description: 'updated text' });
  });

  it('deletes after the danger confirm and navigates back to the list', async () => {
    renderPage();
    await screen.findByLabelText('标题');

    fireEvent.click(screen.getByRole('button', { name: '删除 OTA 包' }));
    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(otaMock.deleteOtaPackage).toHaveBeenCalledWith('pkg-1');
    });
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/otaPackages');
    });
  });
});
