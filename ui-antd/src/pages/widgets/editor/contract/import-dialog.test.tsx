/**
 * Import-dialog tests (spec §5.7): react-1 files deliver the imported doc
 * through onConfirm (the shell commits it as one undoable group); Angular
 * files are badged 非 react-1 with the honest placeholder copy and save a
 * VERBATIM server copy (P9 flow UI).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/editor';
import zhWidgetEditor from '@/locales/zh-CN/editor-widget-editor';
import zhWidgetIo from '@/locales/zh-CN/editor-widget-io';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';

import { parseWidgetTypeImport } from '../import-export';
import { ImportWidgetDialog } from './import-dialog';

const serviceMock = vi.hoisted(() => ({
  saveWidgetType: vi.fn(),
}));
vi.mock('@/services/tb/widget-type', () => serviceMock);

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhWidgetEditor, ...zhWidgetIo },
});

const REACT_JSON = JSON.stringify({
  name: 'Imported card',
  fqn: 'imported_card',
  descriptor: {
    runtime: 'react-1',
    schemaVersion: 1,
    source: { tsx: 'export default () => <div />' },
    type: 'latest',
    sizeX: 6,
    sizeY: 4,
  },
});

const ANGULAR_JSON = JSON.stringify({
  name: 'Angular gauge',
  fqn: 'angular_gauge',
  descriptor: {
    type: 'latest',
    templateHtml: '<div></div>',
    controllerScript: 'self.onInit = function() {};',
  },
});

function setup(fileJson: string) {
  const onConfirm = vi.fn();
  render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <ImportWidgetDialog
          open
          payload={{ result: parseWidgetTypeImport(fileJson), onConfirm }}
          onClose={() => {}}
        />
      </AntdApp>
    </RawIntlProvider>,
  );
  return { onConfirm };
}

beforeEach(() => {
  serviceMock.saveWidgetType.mockReset();
  serviceMock.saveWidgetType.mockImplementation(
    async (entity: WidgetTypeDetails) => entity,
  );
});

describe('ImportWidgetDialog — react-1 import', () => {
  it('delivers the imported doc through onConfirm (draft replacement)', () => {
    const { onConfirm } = setup(REACT_JSON);
    expect(screen.getByTestId('widget-import-source')).toHaveTextContent(
      'Imported card',
    );
    fireEvent.click(screen.getByTestId('widget-import-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const doc = onConfirm.mock.calls[0][0];
    expect(doc.widgetTypeId).toBeNull();
    expect(doc.name).toBe('Imported card');
    expect(doc.source.tsx).toContain('export default');
  });
});

describe('ImportWidgetDialog — Angular import (P9 badge + verbatim copy)', () => {
  it('badges the file 非 react-1 and does NOT offer draft replacement', () => {
    setup(ANGULAR_JSON);
    expect(screen.getByText('Angular（非 react-1）')).toBeInTheDocument();
    expect(screen.queryByTestId('widget-import-confirm')).toBeNull();
    expect(screen.getByTestId('widget-import-save-copy')).toBeInTheDocument();
  });

  it('saves the verbatim server copy with the descriptor untouched', async () => {
    setup(ANGULAR_JSON);
    fireEvent.click(screen.getByTestId('widget-import-save-copy'));
    await waitFor(() => {
      expect(serviceMock.saveWidgetType).toHaveBeenCalledTimes(1);
    });
    const posted = serviceMock.saveWidgetType.mock.calls[0][0];
    expect(posted.id).toBeUndefined();
    expect(posted.descriptor.runtime).toBeUndefined();
    expect(posted.descriptor.controllerScript).toBe(
      'self.onInit = function() {};',
    );
  });
});
