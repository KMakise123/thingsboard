/**
 * GalleryImageInput / MultipleGalleryImageInput tests: controlled
 * `tb-image;` value contract, link-type rendering (resource links go
 * through the auth loader, external links render directly), clear /
 * set-link / gallery-pick flows, and the multiple list add/remove/reorder.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhImages from '@/locales/zh-CN/resources/images';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhImages },
});

const servicesMock = vi.hoisted(() => ({
  loadImageBlob: vi.fn().mockResolvedValue(new Blob(['bytes'])),
  getImages: vi.fn().mockResolvedValue({
    data: [],
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  }),
  deleteImage: vi.fn(),
  downloadImage: vi.fn(),
  uploadImage: vi.fn(),
  updateImage: vi.fn(),
  updateImageInfo: vi.fn(),
  updateImagePublicStatus: vi.fn(),
  exportImage: vi.fn(),
  importImage: vi.fn(),
  getImageInfo: vi.fn(),
  imageResourceType: vi.fn().mockReturnValue('tenant'),
  ImageReferencedError: class ImageReferencedError extends Error {},
}));

vi.mock('@/services/tb/image', () => servicesMock);
vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));
// Same workaround as the devices list tests: render ProTable through antd's
// Table to dodge antd's extensionless internal locale imports.
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  return { ProTable };
});

import {
  GalleryImageInput,
  ImageGalleryPickerModal,
} from './gallery-image-input';
import { MultipleGalleryImageInput } from './multiple-gallery-image-input';

function renderInput(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>{ui}</RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

const RESOURCE_LINK = '/api/images/tenant/pump.png';

describe('GalleryImageInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.loadImageBlob.mockResolvedValue(new Blob(['bytes']));
  });

  it('renders the empty placeholder for an empty value', () => {
    renderInput(<GalleryImageInput value="" />);
    expect(screen.getByTestId('gallery-image-input-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('gallery-image-input-clear')).toBeNull();
  });

  it('loads resource links through the authenticated blob loader', async () => {
    renderInput(<GalleryImageInput value={`tb-image;${RESOURCE_LINK}`} />);
    // The resource link goes through the auth loader (the objectURL itself
    // is browser-native; happy-dom returns undefined from createObjectURL
    // and the placeholder stays — asserted here against the loader call).
    await waitFor(() => {
      expect(servicesMock.loadImageBlob).toHaveBeenCalledWith(
        RESOURCE_LINK,
        false,
      );
    });
    expect(screen.getByTestId('gallery-image-input-thumb')).toBeInTheDocument();
  });

  it('renders external links directly without the auth loader', () => {
    renderInput(<GalleryImageInput value="https://cdn.example.com/a.png" />);
    expect(servicesMock.loadImageBlob).not.toHaveBeenCalled();
    expect(screen.getByTestId('gallery-image-input-thumb')).toHaveAttribute(
      'src',
      'https://cdn.example.com/a.png',
    );
  });

  it('clears to the empty value and drops the clear button', () => {
    const onChange = vi.fn();
    renderInput(
      <GalleryImageInput
        value={`tb-image;${RESOURCE_LINK}`}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('gallery-image-input-clear'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('applies a plain link through the set-link flow (prefix added)', () => {
    const onChange = vi.fn();
    renderInput(<GalleryImageInput value="" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('gallery-image-input-set-link'));
    fireEvent.change(screen.getByTestId('gallery-image-input-link-field'), {
      target: { value: 'https://cdn.example.com/b.png' },
    });
    fireEvent.click(screen.getByTestId('gallery-image-input-link-apply'));
    expect(onChange).toHaveBeenCalledWith(
      'tb-image;https://cdn.example.com/b.png',
    );
  });

  it('picks from the gallery modal and emits the prefixed link', async () => {
    const onChange = vi.fn();
    servicesMock.getImages.mockResolvedValue({
      data: [
        {
          id: { entityType: 'TB_RESOURCE', id: 'img-x' },
          tenantId: { entityType: 'TENANT', id: 'tenant-1' },
          title: 'x.png',
          resourceType: 'IMAGE',
          resourceKey: 'x.png',
          link: '/api/images/tenant/x.png',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
    renderInput(
      <GalleryImageInput
        value={`tb-image;${RESOURCE_LINK}`}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('gallery-image-input-browse'));
    await screen.findByTestId('image-gallery-picker');

    // The picker modal hosts a selectionMode gallery; a row click picks
    // (row internals are covered by the gallery's own tests).
    const rows = await waitFor(() => {
      const found = document.querySelectorAll(
        '.ant-table-tbody .ant-table-row',
      );
      expect(found.length).toBeGreaterThan(0);
      return found;
    });
    fireEvent.click(rows[0]);
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        'tb-image;/api/images/tenant/x.png',
      );
    });
    // happy-dom never fires the CSS leave transition, so the picker DOM
    // lingers mid-close — assert the closing state instead of removal.
    await waitFor(() => {
      const picker = document.querySelector(
        '[data-testid="image-gallery-picker"]',
      );
      expect(
        picker?.querySelector('.ant-zoom-leave, .ant-fade-leave'),
      ).not.toBeNull();
    });
  });

  it('hides all actions when disabled', () => {
    renderInput(<GalleryImageInput value="" disabled />);
    expect(screen.queryByTestId('gallery-image-input-browse')).toBeNull();
    expect(screen.queryByTestId('gallery-image-input-set-link')).toBeNull();
  });
});

describe('ImageGalleryPickerModal', () => {
  it('closes without picking through the cancel path', async () => {
    const onClose = vi.fn();
    const onPicked = vi.fn();
    renderInput(
      <ImageGalleryPickerModal open onClose={onClose} onPicked={onPicked} />,
    );
    await screen.findByTestId('image-gallery-picker');
    fireEvent.click(document.querySelector('.ant-modal-close') as HTMLElement);
    expect(onClose).toHaveBeenCalled();
    expect(onPicked).not.toHaveBeenCalled();
  });
});

describe('MultipleGalleryImageInput', () => {
  it('adds, reorders and removes entries (emitting prefixed links)', () => {
    const onChange = vi.fn();
    const { rerender } = renderInput(
      <RawIntlProvider value={intl}>
        <MultipleGalleryImageInput
          value={[
            'tb-image;/api/images/tenant/a.png',
            'tb-image;/api/images/tenant/b.png',
          ]}
          onChange={onChange}
        />
      </RawIntlProvider>,
    );
    expect(
      screen.getAllByTestId('multiple-gallery-image-input-item'),
    ).toHaveLength(2);

    // Move the second entry up.
    fireEvent.click(screen.getAllByRole('button', { name: '上移' })[1]);
    expect(onChange).toHaveBeenCalledWith([
      'tb-image;/api/images/tenant/b.png',
      'tb-image;/api/images/tenant/a.png',
    ]);

    rerender(
      <AntdApp>
        <RawIntlProvider value={intl}>
          <MultipleGalleryImageInput
            value={[
              'tb-image;/api/images/tenant/b.png',
              'tb-image;/api/images/tenant/a.png',
            ]}
            onChange={onChange}
          />
        </RawIntlProvider>
      </AntdApp>,
    );

    // Remove the first entry.
    fireEvent.click(screen.getAllByRole('button', { name: '移除图片' })[0]);
    expect(onChange).toHaveBeenCalledWith([
      'tb-image;/api/images/tenant/a.png',
    ]);
  });

  it('appends a plain link through the set-link flow', () => {
    const onChange = vi.fn();
    renderInput(<MultipleGalleryImageInput value={[]} onChange={onChange} />);
    fireEvent.click(
      screen.getByTestId('multiple-gallery-image-input-set-link'),
    );
    fireEvent.change(
      screen.getByTestId('multiple-gallery-image-input-link-field'),
      { target: { value: 'https://cdn.example.com/c.png' } },
    );
    fireEvent.click(
      screen.getByTestId('multiple-gallery-image-input-link-apply'),
    );
    expect(onChange).toHaveBeenCalledWith([
      'tb-image;https://cdn.example.com/c.png',
    ]);
  });

  it('hides add/reorder actions when disabled', () => {
    renderInput(<MultipleGalleryImageInput value={[]} disabled />);
    expect(screen.queryByTestId('multiple-gallery-image-input-add')).toBeNull();
    expect(
      screen.queryByTestId('multiple-gallery-image-input-set-link'),
    ).toBeNull();
  });
});
