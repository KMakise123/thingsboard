/**
 * DashboardImageDialog preview tests (M10 D2): the server stores uploaded
 * dashboard images in the image subsystem and persists a
 * `tb-image;/api/images/<scope>/<key>` link (ui-ngx TB_IMAGE_PREFIX parity).
 * The dialog preview must resolve that link through the authed transport
 * into a renderable src, while data URLs keep rendering untouched and the
 * saved value stays the original server link.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhEditorCommon from '@/locales/zh-CN/editor';
import zhDialogs from '@/locales/zh-CN/editor-dashboard-dialogs';

const httpMock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/services/tb/http', () => ({ tbHttp: httpMock }));

const dashboardServiceMock = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  saveDashboard: vi.fn(),
}));
vi.mock('@/services/tb/dashboard', () => dashboardServiceMock);

import { DashboardImageDialog } from './dashboard-image';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorCommon, ...zhDialogs },
});

const TB_IMAGE_LINK = 'tb-image;/api/images/tenant/m10_v_走查空盘_dashboard';
const ENCODED_RESOURCE_PATH =
  '/api/images/tenant/m10_v_%E8%B5%B0%E6%9F%A5%E7%A9%BA%E7%9B%98_dashboard';

function renderDialog(payload: Record<string, unknown>) {
  return render(
    <RawIntlProvider value={intl}>
      <DashboardImageDialog
        open
        payload={payload as never}
        onClose={() => undefined}
      />
    </RawIntlProvider>,
  );
}

describe('DashboardImageDialog — tb-image link preview (M10 D2)', () => {
  beforeEach(() => {
    httpMock.request.mockReset();
    dashboardServiceMock.getDashboard.mockReset();
    dashboardServiceMock.saveDashboard.mockReset();
    dashboardServiceMock.saveDashboard.mockResolvedValue({
      id: { entityType: 'DASHBOARD', id: 'd1' },
    });
  });

  it('resolves a persisted tb-image link through the authed channel and renders it', async () => {
    dashboardServiceMock.getDashboard.mockResolvedValue({
      id: { entityType: 'DASHBOARD', id: 'd1' },
      title: 'Demo',
      image: TB_IMAGE_LINK,
    });
    const blob = new Blob(['png-bytes'], { type: 'image/png' });
    httpMock.request.mockResolvedValue(blob);
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-preview');

    renderDialog({ dashboardId: 'd1' });

    await waitFor(() => {
      expect(httpMock.request).toHaveBeenCalledWith(ENCODED_RESOURCE_PATH, {
        method: 'GET',
        responseType: 'blob',
      });
    });
    const preview = await screen.findByTestId('dashboard-image-preview');
    await waitFor(() => {
      expect(preview.getAttribute('src')).toBe('blob:mock-preview');
    });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('renders data URLs untouched without hitting the transport', async () => {
    dashboardServiceMock.getDashboard.mockResolvedValue({
      id: { entityType: 'DASHBOARD', id: 'd1' },
      title: 'Demo',
      image: 'data:image/png;base64,AAA',
    });

    renderDialog({ dashboardId: 'd1' });

    const preview = await screen.findByTestId('dashboard-image-preview');
    await waitFor(() => {
      expect(preview.getAttribute('src')).toBe('data:image/png;base64,AAA');
    });
    await waitFor(() => {
      expect(dashboardServiceMock.getDashboard).toHaveBeenCalledWith('d1');
    });
    expect(httpMock.request).not.toHaveBeenCalled();
  });

  it('saving keeps the original tb-image link (resolution is preview-only)', async () => {
    dashboardServiceMock.getDashboard.mockResolvedValue({
      id: { entityType: 'DASHBOARD', id: 'd1' },
      title: 'Demo',
      image: TB_IMAGE_LINK,
    });
    httpMock.request.mockResolvedValue(
      new Blob(['png-bytes'], { type: 'image/png' }),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-preview');

    renderDialog({ dashboardId: 'd1' });
    await screen.findByTestId('dashboard-image-preview');
    fireEvent.click(screen.getByTestId('dashboard-image-ok'));

    await waitFor(() => {
      expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(1);
    });
    const saved = dashboardServiceMock.saveDashboard.mock.calls[0][0] as {
      image?: string;
    };
    expect(saved.image).toBe(TB_IMAGE_LINK);
  });

  it('clearing the image drops the preview and the saved value', async () => {
    httpMock.request.mockResolvedValue(
      new Blob(['png-bytes'], { type: 'image/png' }),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-preview');
    renderDialog({ dashboardId: 'd1', currentImage: TB_IMAGE_LINK });
    await screen.findByTestId('dashboard-image-preview');

    fireEvent.click(screen.getByTestId('dashboard-image-clear'));
    expect(
      await screen.findByTestId('dashboard-image-empty'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dashboard-image-ok'));

    await waitFor(() => {
      expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(1);
    });
    const saved = dashboardServiceMock.saveDashboard.mock.calls[0][0] as {
      image?: string;
    };
    expect(saved.image).toBeUndefined();
  });

  it('a failing resource fetch degrades to the empty placeholder instead of a broken image', async () => {
    dashboardServiceMock.getDashboard.mockResolvedValue({
      id: { entityType: 'DASHBOARD', id: 'd1' },
      title: 'Demo',
      image: TB_IMAGE_LINK,
    });
    httpMock.request.mockRejectedValue(new Error('404'));

    renderDialog({ dashboardId: 'd1' });
    await waitFor(() => {
      expect(httpMock.request).toHaveBeenCalled();
    });
    await act(async () => {
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-image-preview')).toBeNull();
    });
    expect(screen.getByTestId('dashboard-image-empty')).toBeInTheDocument();
  });
});
