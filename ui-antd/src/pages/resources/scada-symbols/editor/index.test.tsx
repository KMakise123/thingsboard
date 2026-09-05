/**
 * SCADA symbol editor page tests (M11 wave-2D): the save-chain call order
 * (updateImage → conditional updateImageInfo → reload), the readonly
 * disabled state for a TENANT opening a system symbol, the controlled
 * exit-confirm flow and the create-widget clone chain. The canvas is
 * replaced by a fake exposing the ref contract; services are mocked at
 * the module boundary.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { forwardRef, useImperativeHandle } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhEditor from '@/locales/zh-CN/resources/scada-symbol-editor';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhEditor },
});

const canvasState = vi.hoisted(() => ({
  content: '<svg viewBox="0 0 200 100"><rect id="r1"/></svg>',
  fireEdit: undefined as undefined | (() => void),
  readonlySeen: false,
}));

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

const authState = vi.hoisted(() => ({
  authority: 'TENANT_ADMIN' as string,
}));

vi.mock('@umijs/max', () => ({
  useParams: () => ({ type: 'tenant', key: 'pump.svg' }),
  history: historyMock,
  useModel: () => ({
    initialState: { currentUser: { authority: authState.authority } },
  }),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const imageMock = vi.hoisted(() => ({
  getImageInfo: vi.fn(),
  loadImageBlob: vi.fn(),
  updateImage: vi.fn(),
  updateImageInfo: vi.fn(),
  imageResourceType: vi.fn(() => 'tenant'),
}));

const widgetTypeMock = vi.hoisted(() => ({
  getWidgetTypeByFullFqn: vi.fn(),
  saveWidgetType: vi.fn(),
}));

const bundleMock = vi.hoisted(() => ({
  getAllWidgetsBundles: vi.fn(() => Promise.resolve([])),
  addWidgetFqnToWidgetsBundle: vi.fn(),
}));

vi.mock('@/services/tb/image', () => imageMock);
vi.mock('@/services/tb/widget-type', () => widgetTypeMock);
vi.mock('@/services/tb/widgets-bundle', () => bundleMock);

// The real pro-components chain drags antd's zh_CN locale through a
// node-ESM-externalized path that is flaky under the shared junction
// cache; the wrapper is covered by its own tests. The stub renders the
// children plus the back arrow the exit-confirm test drives.
vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({
    children,
    extra,
    onBack,
  }: {
    children?: React.ReactNode;
    extra?: React.ReactNode;
    onBack?: () => void;
  }) => (
    <div>
      {onBack ? (
        <button type="button" data-testid="page-back" onClick={onBack}>
          back
        </button>
      ) : null}
      {extra}
      {children}
    </div>
  ),
}));

vi.mock('./canvas/symbol-editor-canvas', () => ({
  SymbolEditorCanvas: forwardRef(function FakeCanvas(
    props: { readonly?: boolean; onEdit?: () => void },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      getContent: () => canvasState.content,
      getTags: () => ['valve'],
      getMode: () => 'svg',
    }));
    canvasState.readonlySeen = !!props.readonly;
    canvasState.fireEdit = props.onEdit;
    return <div data-testid="fake-canvas" />;
  }),
}));

vi.mock('./metadata/metadata-panel', () => ({
  MetadataPanel: (props: {
    metadata: { title: string };
    onChange: (next: unknown) => void;
  }) => (
    <button
      type="button"
      data-testid="fake-metadata-rename"
      onClick={() => props.onChange({ ...props.metadata, title: 'New' })}
    >
      rename
    </button>
  ),
}));

import {
  getImageInfo,
  loadImageBlob,
  updateImage,
  updateImageInfo,
} from '@/services/tb/image';
import {
  getWidgetTypeByFullFqn,
  saveWidgetType,
} from '@/services/tb/widget-type';
import { EntityType } from '@/types/tb';
import type { ImageResourceInfo } from '@/types/tb/image';
import type { WidgetType } from '@/types/tb/widget-type';

import ScadaSymbolEditorPage from './index';

const LOADED_SVG =
  '<svg xmlns:tb="https://thingsboard.io/svg" viewBox="0 0 200 100">' +
  '<tb:metadata><![CDATA[{"title":"Pump","widgetSizeX":2,"widgetSizeY":1,"tags":[],"behavior":[],"properties":[]}]]></tb:metadata>' +
  '</svg>';

const TENANT_ROW: ImageResourceInfo = {
  id: { id: 'img-1', entityType: EntityType.TB_RESOURCE },
  resourceKey: 'pump.svg',
  fileName: 'pump.svg',
  title: 'Pump',
  link: '/api/images/tenant/pump.svg',
  tenantId: {
    id: 'b1376f60-1dd2-11b2-8080-9d5e67bd88e0',
    entityType: EntityType.TENANT,
  },
  descriptor: {
    mediaType: 'image/svg+xml',
    width: 200,
    height: 100,
    size: 10,
    etag: 'e',
  },
};

const SYSTEM_ROW: ImageResourceInfo = {
  ...TENANT_ROW,
  tenantId: {
    id: '13814000-1dd2-11b2-8080-808080808080',
    entityType: EntityType.TENANT,
  },
};

const WIDGET_TEMPLATE: WidgetType = {
  fqn: 'scada_symbol',
  id: { id: 'tpl-id', entityType: EntityType.WIDGET_TYPE },
  name: 'Scada symbol',
  descriptor: {
    controllerScript:
      "return { previewWidth: '300px', previewHeight: '320px' };",
    defaultConfig: '{"title":"Scada symbol","settings":{}}',
  },
};

function mockLoaded(row = TENANT_ROW) {
  vi.mocked(getImageInfo).mockResolvedValue(row);
  vi.mocked(loadImageBlob).mockResolvedValue(new Blob([LOADED_SVG]));
  vi.mocked(updateImage).mockResolvedValue(row);
  vi.mocked(updateImageInfo).mockResolvedValue(row);
}

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <ScadaSymbolEditorPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('ScadaSymbolEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvasState.readonlySeen = false;
    authState.authority = 'TENANT_ADMIN';
    mockLoaded();
  });

  async function renderLoaded() {
    const view = renderPage();
    await screen.findByTestId('fake-canvas');
    await waitFor(() => expect(canvasState.fireEdit).toBeTruthy());
    return view;
  }

  it('save chain: updateImage, then reload reads the fresh bytes', async () => {
    await renderLoaded();
    // Canvas edits flip the page dirty flag → save becomes clickable.
    await waitFor(() => expect(canvasState.fireEdit).toBeDefined());
    canvasState.fireEdit?.();
    const save = await screen.findByTestId('scada-save');
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);
    await waitFor(() => expect(updateImage).toHaveBeenCalledTimes(1));
    // Title unchanged ('Pump' → 'Pump') — no info update.
    expect(updateImageInfo).not.toHaveBeenCalled();
    // Reload fetched the fresh bytes through the shared blob loader.
    expect(loadImageBlob).toHaveBeenCalledTimes(2);
    expect(historyMock.push).not.toHaveBeenCalled();
  });

  it('save chain: a title change appends updateImageInfo after updateImage', async () => {
    await renderLoaded();
    vi.mocked(updateImage).mockImplementation(async (_t, _k, file: Blob) => {
      const written = await file.text();
      return {
        ...TENANT_ROW,
        title: /New/.test(written) ? 'New' : TENANT_ROW.title,
      };
    });
    canvasState.fireEdit?.();
    // Rename through the metadata panel, then save.
    fireEvent.click(await screen.findByTestId('fake-metadata-rename'));
    fireEvent.click(await screen.findByTestId('scada-save'));
    await waitFor(() => expect(updateImageInfo).toHaveBeenCalledTimes(1));
    expect(updateImageInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New' }),
    );
    const calls = vi.mocked(updateImage).mock.invocationCallOrder[0];
    expect(
      vi.mocked(updateImageInfo).mock.invocationCallOrder[0],
    ).toBeGreaterThan(calls);
  });

  it('readonly: TENANT sees a system symbol with edit controls disabled', async () => {
    mockLoaded(SYSTEM_ROW);
    await renderLoaded();
    await waitFor(() => {
      expect(screen.getByTestId('scada-save')).toBeDisabled();
    });
    expect(screen.getByTestId('scada-replace')).toBeDisabled();
    expect(screen.getByTestId('scada-download')).not.toBeDisabled();
  });

  it('dirty + back opens the controlled exit confirm; ok leaves', async () => {
    await renderLoaded();
    canvasState.fireEdit?.();
    const back = await screen.findByTestId('page-back');
    fireEvent.click(back);
    expect(await screen.findByTestId('scada-exit-confirm')).toBeTruthy();
    fireEvent.click(screen.getByTestId('scada-exit-confirm-ok'));
    await waitFor(() =>
      expect(historyMock.push).toHaveBeenCalledWith('/resources/scada-symbols'),
    );
  });

  it('create widget clones the template with symbol wiring', async () => {
    vi.mocked(getWidgetTypeByFullFqn).mockResolvedValue(WIDGET_TEMPLATE);
    vi.mocked(saveWidgetType).mockResolvedValue({
      ...WIDGET_TEMPLATE,
      fqn: 'my_pump',
    });
    await renderLoaded();
    fireEvent.click(await screen.findByTestId('scada-create-widget'));
    fireEvent.click(await screen.findByTestId('scada-create-widget-ok'));
    await waitFor(() => expect(saveWidgetType).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(saveWidgetType).mock.calls[0][0];
    expect(saved.fqn).toBeUndefined();
    expect(saved.id).toBeUndefined();
    expect(saved.name).toBe('Pump');
    expect(saved.image).toBe('tb-image;/api/images/tenant/pump.svg');
    expect(saved.descriptor?.sizeX).toBe(2);
    expect(saved.descriptor?.sizeY).toBe(1);
    expect(saved.descriptor?.controllerScript).toContain(
      "previewWidth: '200px'",
    );
    expect(saved.descriptor?.controllerScript).toContain(
      "previewHeight: '120px'",
    );
    const config = JSON.parse(saved.descriptor?.defaultConfig ?? '{}');
    expect(config.settings.scadaSymbolUrl).toBe(
      'tb-image;/api/images/tenant/pump.svg',
    );
  });

  it('load failure jumps back to the symbols list', async () => {
    vi.mocked(getImageInfo).mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/resources/scada-symbols');
    });
  });
});
