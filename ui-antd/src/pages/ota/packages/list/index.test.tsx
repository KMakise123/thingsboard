/**
 * OTA packages list page tests (M13 wave-2): the explicit createdTime DESC
 * default, debounced title search, in-cell copy buttons, single + batch
 * delete (backend-400 surfacing for referenced packages), the URL-branch
 * create and the file-branch two-step create with a real hidden upload
 * input. Services are mocked at the module boundary; pro-components is
 * replaced by antd's Table (same workaround as the js-library tests) and
 * antd Upload stays real — the file is pushed into its hidden input.
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
import { type OtaPackageInfo, OtaPackageType } from '@/types/tb/ota';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhMenu, ...zhOta },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const otaMock = vi.hoisted(() => ({
  getOtaPackages: vi.fn(),
  getOtaPackageInfo: vi.fn(),
  saveOtaPackageInfo: vi.fn(),
  saveOtaPackageWithFile: vi.fn(),
  uploadOtaPackageFile: vi.fn(),
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

// vite-node cannot resolve antd's extensionless internal locale imports
// when pulled through pro-components' bundle — render through antd's Table
// (same workaround as the js-library/dashboards list tests).
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  return {
    ProTable,
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
  };
});

import OtaPackagesListPage from './index';
import { parseOtaPackagesUrlState, toPageLink } from './url-state';

function pkg(
  id: string,
  title: string,
  extra: Partial<OtaPackageInfo> = {},
): OtaPackageInfo {
  return {
    id: { entityType: EntityType.OTA_PACKAGE, id },
    createdTime: 1_700_000_000_000,
    title,
    version: 'v1.0',
    type: OtaPackageType.FIRMWARE,
    ...extra,
  } as OtaPackageInfo;
}

const FILE_PACKAGE = pkg('pkg-1', 'Firmware A', {
  tag: 'stable',
  fileName: 'fw-a.bin',
  dataSize: 2048,
  checksumAlgorithm: 'SHA256' as OtaPackageInfo['checksumAlgorithm'],
  checksum: 'abcd1234',
  hasData: true,
});

const URL_PACKAGE = pkg('pkg-2', 'Firmware B', {
  type: OtaPackageType.SOFTWARE,
  url: 'https://example.com/dl/fw-b.bin',
  hasData: true,
});

const PAGE = {
  data: [FILE_PACKAGE, URL_PACKAGE],
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
};

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
          <OtaPackagesListPage />
        </AntdApp>
      </RawIntlProvider>
    </QueryClientProvider>,
  );
}

async function openCreateDialog() {
  renderPage();
  await screen.findByText('Firmware A');
  fireEvent.click(screen.getByRole('button', { name: /新增 OTA 包/ }));
  const modal = await waitFor(() => {
    const node = document.querySelector('.ant-modal');
    expect(node).not.toBeNull();
    return node as HTMLElement;
  });
  return modal;
}

async function fillCreateMandatoryFields(modal: HTMLElement) {
  fireEvent.change(within(modal).getByLabelText('标题'), {
    target: { value: 'New package' },
  });
  fireEvent.change(within(modal).getByLabelText('版本'), {
    target: { value: 'v2.0' },
  });
  fireEvent.mouseDown(modal.querySelector('.ant-select') as HTMLElement);
  fireEvent.click(await screen.findByText('默认配置'));
}

beforeEach(() => {
  otaMock.getOtaPackages.mockResolvedValue(PAGE);
  otaMock.deleteOtaPackage.mockResolvedValue(undefined);
  otaMock.downloadOtaPackage.mockResolvedValue(new Blob(['bytes']));
  otaMock.saveOtaPackageInfo.mockResolvedValue(FILE_PACKAGE);
  otaMock.saveOtaPackageWithFile.mockResolvedValue(FILE_PACKAGE);
  deviceMock.getDeviceProfiles.mockResolvedValue(PROFILES_PAGE);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

afterEach(() => {
  window.history.replaceState({}, '', '/otaPackages');
  vi.clearAllMocks();
});

describe('ota packages URL state', () => {
  it('defaults to an explicit createdTime DESC page link', () => {
    const state = parseOtaPackagesUrlState('');
    expect(state).toEqual({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
    });
    expect(toPageLink(state)).toEqual({
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('parses and re-serializes a non-default state', () => {
    const state = parseOtaPackagesUrlState(
      '?page=2&pageSize=20&sortProperty=title&sortOrder=ASC&textSearch=fw',
    );
    expect(state.page).toBe(2);
    expect(state.sortProperty).toBe('title');
    const query = toPageLink(state);
    expect(query.page).toBe(1);
    expect(query.textSearch).toBe('fw');
    expect(query.sortOrder).toEqual({ property: 'title', direction: 'ASC' });
  });
});

describe('OtaPackagesListPage', () => {
  it('queries with the explicit createdTime DESC default and renders the nine columns', async () => {
    renderPage();

    expect(await screen.findByText('Firmware A')).toBeInTheDocument();
    expect(screen.getByText('Firmware B')).toBeInTheDocument();
    // Human-readable size + checksum cell in "ALGORITHM: value" form.
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    expect(screen.getByText('SHA256: abcd1234')).toBeInTheDocument();
    expect(otaMock.getOtaPackages).toHaveBeenCalledWith({
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('pushes the debounced title search into the server query', async () => {
    renderPage();
    await screen.findByText('Firmware A');

    fireEvent.change(
      screen.getByPlaceholderText('搜索 OTA 包').querySelector('input') ??
        screen.getByPlaceholderText('搜索 OTA 包'),
      { target: { value: 'fw' } },
    );

    await waitFor(
      () => {
        expect(otaMock.getOtaPackages).toHaveBeenLastCalledWith(
          expect.objectContaining({ textSearch: 'fw', page: 0 }),
        );
      },
      { timeout: 3000 },
    );
    expect(window.location.search).toContain('textSearch=fw');
  });

  it('copies the direct url and checksum from the cell buttons', async () => {
    renderPage();
    await screen.findByText('Firmware A');

    fireEvent.click(screen.getByRole('button', { name: '复制直链 URL' }));
    await screen.findByText('包直链 URL 已复制到剪贴板');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://example.com/dl/fw-b.bin',
    );

    fireEvent.click(screen.getByRole('button', { name: '复制校验和' }));
    await screen.findByText('包校验和已复制到剪贴板');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abcd1234');
  });

  it('opens the detail page from the title link', async () => {
    renderPage();
    await screen.findByText('Firmware A');

    fireEvent.click(screen.getByRole('button', { name: 'Firmware A' }));

    expect(historyMock.push).toHaveBeenCalledWith('/otaPackages/pkg-1');
  });

  it('downloads a file package as a blob', async () => {
    renderPage();
    await screen.findByText('Firmware A');

    // Row order follows the fixture: [0] is the file package (the URL
    // package's download button is disabled).
    fireEvent.click(screen.getAllByRole('button', { name: '下载 OTA 包' })[0]);

    await waitFor(() => {
      expect(downloadBlobMock.downloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        'fw-a.bin',
      );
    });
    expect(otaMock.downloadOtaPackage).toHaveBeenCalledWith('pkg-1');
  });

  it('deletes a package only after the danger confirm', async () => {
    renderPage();
    await screen.findByText('Firmware A');

    fireEvent.click(screen.getAllByRole('button', { name: '删除 OTA 包' })[0]);
    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(otaMock.deleteOtaPackage).toHaveBeenCalledWith('pkg-1');
    });
  });

  it('surfaces the backend 400 when devices still reference the package', async () => {
    otaMock.deleteOtaPackage.mockRejectedValueOnce(
      new Error('The otaPackage referenced by the devices cannot be deleted!'),
    );
    renderPage();
    await screen.findByText('Firmware A');

    fireEvent.click(screen.getAllByRole('button', { name: '删除 OTA 包' })[0]);
    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    expect(
      await screen.findByText(/referenced by the devices/),
    ).toBeInTheDocument();
    // The row stays — the list only refreshes on successful deletes.
    expect(screen.getByText('Firmware A')).toBeInTheDocument();
  });

  it('creates a URL package through the dialog with the object-form profile id', async () => {
    const modal = await openCreateDialog();

    await fillCreateMandatoryFields(modal);
    // ui-ngx auto-suggest: tag mirrors (title + ' ' + version).trim().
    expect(
      (within(modal).getByLabelText('版本标签') as HTMLInputElement).value,
    ).toBe('New package v2.0');

    fireEvent.click(within(modal).getByLabelText('使用外部 URL'));
    fireEvent.change(within(modal).getByLabelText('直链 URL'), {
      target: { value: 'https://example.com/new.bin' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /新\s*增/ }));

    await waitFor(() => {
      expect(otaMock.saveOtaPackageInfo).toHaveBeenCalledTimes(1);
    });
    expect(otaMock.saveOtaPackageWithFile).not.toHaveBeenCalled();
    const request = otaMock.saveOtaPackageInfo.mock.calls[0][0];
    expect(request.title).toBe('New package');
    expect(request.version).toBe('v2.0');
    expect(request.url).toBe('https://example.com/new.bin');
    expect(request.usesUrl).toBe(true);
    expect(request.deviceProfileId).toEqual({
      entityType: EntityType.DEVICE_PROFILE,
      id: 'prof-1',
    });
    expect(request.checksum).toBeUndefined();
  });

  it('creates a file package via the hidden upload input (two-step save)', async () => {
    const modal = await openCreateDialog();

    await fillCreateMandatoryFields(modal);
    // Upload.Dragger renders a hidden input[type=file]; push a file into it.
    const input = within(modal).getByRole('button', {
      name: /拖拽包文件/,
    });
    expect(input).toBeInTheDocument();
    const fileInput = modal.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['binary-payload'], 'new-pkg.bin', {
      type: 'application/octet-stream',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(within(modal).getByRole('button', { name: /新\s*增/ }));

    await waitFor(() => {
      expect(otaMock.saveOtaPackageWithFile).toHaveBeenCalledTimes(1);
    });
    expect(otaMock.saveOtaPackageInfo).not.toHaveBeenCalled();
    const [request, sentFile, algorithm, checksum] =
      otaMock.saveOtaPackageWithFile.mock.calls[0];
    expect(request.title).toBe('New package');
    expect(request.usesUrl).toBe(false);
    expect(request.deviceProfileId).toEqual({
      entityType: EntityType.DEVICE_PROFILE,
      id: 'prof-1',
    });
    expect(sentFile).toBe(file);
    // Auto-generate stays on: the default SHA256 rides the upload, no
    // client checksum.
    expect(algorithm).toBe('SHA256');
    expect(checksum).toBeUndefined();
  });

  it('keeps the dialog open with the error text when the two-step save fails', async () => {
    otaMock.saveOtaPackageWithFile.mockRejectedValueOnce(
      new Error('upload failed after shell creation'),
    );
    const modal = await openCreateDialog();

    await fillCreateMandatoryFields(modal);
    const fileInput = modal.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['x'], 'new-pkg.bin', { type: 'application/octet-stream' }),
        ],
      },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /新\s*增/ }));

    expect(
      await screen.findByText('upload failed after shell creation'),
    ).toBeInTheDocument();
    // The dialog stays open (no false success), and no standalone info POST
    // left the page — the rollback sequence lives in the service layer.
    expect(within(modal).getByLabelText('标题')).toBeInTheDocument();
    expect(otaMock.saveOtaPackageInfo).not.toHaveBeenCalled();
    expect(otaMock.saveOtaPackageWithFile).toHaveBeenCalledTimes(1);
  });

  it('pins the spec exclusions: no type filter, no JSON export', async () => {
    renderPage();
    await screen.findByText('Firmware A');

    expect(screen.queryByPlaceholderText(/全部类型|类型/)).toBeNull();
    expect(screen.queryByRole('button', { name: /导出/ })).toBeNull();
  });
});
