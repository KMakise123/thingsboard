/**
 * ImageGallery smoke tests: list/grid rendering + server params, upload
 * dialog open/prefill, the embed public-link switch, the shared in-use
 * delete flow, selection mode, and the TENANT system-images read-only
 * semantics. Services are mocked at the module boundary; ProTable renders
 * through antd's Table (same workaround as the devices list tests).
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
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhImages from '@/locales/zh-CN/resources/images';
import zhScada from '@/locales/zh-CN/resources/scada-symbols';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhImages, ...zhScada },
});

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getImages: vi.fn(),
  getImageInfo: vi.fn(),
  uploadImage: vi.fn(),
  updateImage: vi.fn(),
  updateImageInfo: vi.fn(),
  updateImagePublicStatus: vi.fn(),
  downloadImage: vi.fn(),
  deleteImage: vi.fn(),
  exportImage: vi.fn(),
  importImage: vi.fn(),
  imageResourceType: vi.fn().mockReturnValue('tenant'),
  loadImageBlob: vi.fn().mockResolvedValue(new Blob(['bytes'])),
  // Gallery branches on this class (instanceof) to open the in-use modal.
  ImageReferencedError: class ImageReferencedError extends Error {
    readonly references: unknown;
    constructor(references: unknown) {
      super('Image is referenced by other entities');
      this.name = 'ImageReferencedError';
      this.references = references;
    }
  },
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/image', () => servicesMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));
// vite-node cannot resolve antd's extensionless internal locale imports
// through pro-components' bundle — render through antd's Table (same
// workaround as the devices list tests).
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  type Row = Record<string, unknown>;
  const getByPath = (row: Row, path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>(
        (value, key) =>
          value && typeof value === 'object' ? (value as Row)[key] : undefined,
        row,
      );
  const ProTable = ({
    rowKey,
    ...rest
  }: React.ComponentProps<typeof Table>) => (
    <Table
      rowKey={
        typeof rowKey === 'string' && rowKey.includes('.')
          ? (row: unknown) => String(getByPath(row as Row, rowKey))
          : rowKey
      }
      {...rest}
    />
  );
  return { ProTable };
});

import type { ImageResourceInfo } from '@/types/tb/image';
import { ResourceSubType } from '@/types/tb/resource';
import { ImageGallery } from './image-gallery';

const TENANT_ID = { entityType: 'TENANT', id: 'tenant-1' };
const NULL_TENANT_ID = {
  entityType: 'TENANT',
  id: '13814000-1dd2-11b2-8080-808080808080',
};

function img(
  key: string,
  extra: Record<string, unknown> = {},
): ImageResourceInfo {
  return {
    id: { entityType: 'TB_RESOURCE', id: `img-${key}` },
    tenantId: TENANT_ID,
    createdTime: 1_700_000_000_000,
    title: key,
    resourceType: 'IMAGE',
    resourceSubType: ResourceSubType.IMAGE,
    resourceKey: key,
    link: `/api/images/tenant/${key}`,
    descriptor: {
      mediaType: 'image/png',
      width: 64,
      height: 32,
      size: 2048,
      etag: 'w-etag',
    },
    ...extra,
  } as ImageResourceInfo;
}

const PAGE = {
  data: [img('pump.png'), img('valve.png')],
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
};

function renderGallery(
  props: Partial<React.ComponentProps<typeof ImageGallery>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <ImageGallery imageSubType={ResourceSubType.IMAGE} {...props} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

function blobFile(name: string): File {
  return new File(['data'], name, { type: 'image/png' });
}

async function pickUploadFile(file: File): Promise<HTMLElement> {
  const dialog = document.querySelector(
    '[data-testid="upload-image-dialog"]',
  ) as HTMLElement;
  const input = dialog.querySelector('input[type="file"]') as HTMLElement;
  Object.defineProperty(input, 'files', { value: [file] });
  fireEvent.change(input);
  await waitFor(() => {
    const titleInput = document.querySelector(
      '[data-testid="upload-image-title"]',
    ) as HTMLInputElement;
    expect(titleInput.value).toBe(file.name);
  });
  return dialog;
}

describe('ImageGallery (images form)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/resources/images');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getImages.mockResolvedValue(PAGE);
    servicesMock.deleteImage.mockResolvedValue(undefined);
    servicesMock.loadImageBlob.mockResolvedValue(new Blob(['bytes']));
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/resources/images');
  });

  it('lists images with the default server params and renders rows', async () => {
    renderGallery();

    // Titles render once per row (Typography ellipsis adds a hidden twin,
    // so match "all" and assert non-empty).
    expect((await screen.findAllByText('pump.png')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('valve.png').length).toBeGreaterThan(0);
    expect(screen.getAllByText('64×32').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2.0 KB').length).toBeGreaterThan(0);
    expect(servicesMock.getImages).toHaveBeenCalledWith(
      {
        pageSize: 10,
        page: 0,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
      false,
      ResourceSubType.IMAGE,
    );
  });

  it('carries search, mode and include-system through the URL', async () => {
    renderGallery();
    await screen.findByText('pump.png');

    // Grid mode is a URL-backed view switch.
    fireEvent.mouseDown(
      document
        .querySelector('[data-testid="image-gallery-mode"]')
        ?.querySelector('.ant-segmented-item') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('网格视图'));
    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="image-gallery-grid"]'),
      ).not.toBeNull();
      expect(window.location.search).toContain('mode=grid');
    });

    // Include-system flips the server flag for TENANT sessions.
    fireEvent.click(
      document.querySelector(
        '[data-testid="image-gallery-include-system"]',
      ) as HTMLElement,
    );
    await waitFor(() => {
      expect(servicesMock.getImages).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0 }),
        true,
        ResourceSubType.IMAGE,
      );
      expect(window.location.search).toContain('includeSystemImages=true');
    });
  });

  it('uploads with the file-name prefilled title (until touched)', async () => {
    renderGallery();
    await screen.findByText('pump.png');

    fireEvent.click(screen.getByRole('button', { name: /上传图片/ }));
    const dialog = await pickUploadFile(blobFile('sensor.png'));
    fireEvent.click(within(dialog).getByRole('button', { name: '上传图片' }));

    await waitFor(() => {
      expect(servicesMock.uploadImage).toHaveBeenCalledTimes(1);
    });
    const [file, title, subType] = servicesMock.uploadImage.mock.calls[0];
    expect(file.name).toBe('sensor.png');
    expect(title).toBe('sensor.png');
    expect(subType).toBe(ResourceSubType.IMAGE);
    expect(window.location.search).not.toContain('upload');
  });

  it('flips the embed public switch and reveals link + embed code', async () => {
    servicesMock.updateImagePublicStatus.mockResolvedValue({
      ...PAGE.data[0],
      public: true,
      publicLink: '/api/images/public/abc123',
    });
    renderGallery();
    await screen.findByText('pump.png');

    // One embed action per row — take the first.
    fireEvent.click(screen.getAllByRole('button', { name: '嵌入图片' })[0]);
    const dialog = (await screen.findByTestId(
      'embed-image-dialog',
    )) as HTMLElement;
    fireEvent.click(within(dialog).getByTestId('embed-image-public-switch'));

    await waitFor(() => {
      expect(servicesMock.updateImagePublicStatus).toHaveBeenCalledWith(
        expect.objectContaining({ resourceKey: 'pump.png' }),
        true,
      );
    });
    expect(
      await screen.findByTestId('embed-image-public-link'),
    ).toHaveTextContent('/api/images/public/abc123');
    expect(screen.getByTestId('embed-image-embed-code')).toHaveTextContent(
      '<img src="/api/images/public/abc123"',
    );
  });

  it('runs the shared in-use delete flow: confirm, references, force', async () => {
    servicesMock.deleteImage.mockImplementation(
      (_type: string, _key: string, force?: boolean) => {
        if (!force) {
          return Promise.reject(
            new servicesMock.ImageReferencedError({
              WIDGET_TYPE: [
                {
                  id: { entityType: 'WIDGET_TYPE', id: 'wt-1' },
                  name: 'Thermometer',
                },
              ],
            }),
          );
        }
        return Promise.resolve(undefined);
      },
    );
    renderGallery();
    await screen.findByText('pump.png');

    fireEvent.click(screen.getAllByRole('button', { name: '删除图片' })[0]);
    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(servicesMock.deleteImage).toHaveBeenCalledWith(
        'tenant',
        'pump.png',
        false,
      );
    });
    // The SHARED wave-1A modal opens with the resolved reference entries.
    expect(await screen.findByText('图片被其他实体使用')).toBeInTheDocument();
    expect(screen.getByText('Thermometer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '仍然删除' }));
    await waitFor(() => {
      expect(servicesMock.deleteImage).toHaveBeenCalledWith(
        'tenant',
        'pump.png',
        true,
      );
    });
  });

  it('picks images in selection mode (row click + no batch chrome)', async () => {
    const onImageSelected = vi.fn();
    renderGallery({ selectionMode: true, onImageSelected });
    await screen.findByText('pump.png');

    expect(screen.queryByTestId('image-gallery-batch-delete')).toBeNull();
    expect(screen.queryByRole('button', { name: '删除图片' })).toBeNull();

    fireEvent.click(screen.getByText('valve.png'));
    expect(onImageSelected).toHaveBeenCalledWith(
      expect.objectContaining({ resourceKey: 'valve.png' }),
    );
  });

  it('keeps system images read-only for tenant admins', async () => {
    window.history.replaceState(
      {},
      '',
      '/resources/images?includeSystemImages=true',
    );
    const withSystem = {
      ...PAGE,
      data: [
        img('mine.png'),
        img('platform.png', { tenantId: NULL_TENANT_ID }),
      ],
    };
    servicesMock.getImages.mockResolvedValue(withSystem);
    try {
      renderGallery();
      await screen.findByText('mine.png');

      expect(servicesMock.getImages).toHaveBeenCalledWith(
        expect.anything(),
        true,
        ResourceSubType.IMAGE,
      );
      // The system row's action set hides delete (readonly marker present).
      const rows = document.querySelectorAll('.ant-table-tbody .ant-table-row');
      expect(
        rows[1]?.querySelector('button[aria-label="删除图片"]'),
      ).toBeNull();
      expect(
        rows[0]?.querySelector('button[aria-label="删除图片"]'),
      ).not.toBeNull();
    } finally {
      window.history.replaceState({}, '', '/resources/images');
    }
  });
});

describe('ImageGallery (scada symbols form)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/resources/scada-symbols');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getImages.mockResolvedValue({
      data: [
        img('pump.svg', {
          resourceSubType: ResourceSubType.SCADA_SYMBOL,
        }),
      ],
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
    servicesMock.loadImageBlob.mockResolvedValue(new Blob(['bytes']));
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/resources/scada-symbols');
  });

  it('fetches SCADA_SYMBOL rows; row click and upload hand to the page', async () => {
    const onEditImage = vi.fn();
    const onUploadSuccess = vi.fn();
    servicesMock.uploadImage.mockResolvedValue({
      ...PAGE.data[0],
      resourceSubType: ResourceSubType.SCADA_SYMBOL,
    });
    renderGallery({
      imageSubType: ResourceSubType.SCADA_SYMBOL,
      onEditImage,
      onUploadSuccess,
    });
    await screen.findByText('pump.svg');

    expect(servicesMock.getImages).toHaveBeenCalledWith(
      expect.anything(),
      false,
      ResourceSubType.SCADA_SYMBOL,
    );
    // The embed action is hidden in the scada form (upstream parity).
    expect(screen.queryByRole('button', { name: '嵌入图片' })).toBeNull();

    // Row click hands to the editor hook (wave 2D route).
    fireEvent.click(screen.getByText('pump.svg'));
    expect(onEditImage).toHaveBeenCalledWith(
      expect.objectContaining({ resourceKey: 'pump.svg' }),
    );

    // Upload success hands to the page (jump to the editor route).
    fireEvent.click(screen.getByRole('button', { name: /上传 SCADA 符号/ }));
    const dialog = await pickUploadFile(blobFile('valve.svg'));
    servicesMock.uploadImage.mockResolvedValue(
      img('valve.svg', { resourceSubType: ResourceSubType.SCADA_SYMBOL }),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: '上传图片' }));
    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ resourceKey: 'valve.svg' }),
      );
    });
  });
});
