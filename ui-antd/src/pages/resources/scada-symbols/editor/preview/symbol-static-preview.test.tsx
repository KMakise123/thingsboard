/**
 * SymbolStaticPreview tests (M11 wave-2D): static render at the metadata
 * size, zoom clamps and the back action.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhEditor from '@/locales/zh-CN/resources/scada-symbol-editor';

import { SymbolStaticPreview } from './symbol-static-preview';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhEditor },
});

function renderPreview() {
  const onBack = vi.fn();
  render(
    <AntdApp>
      <RawIntlProvider value={intl}>
        <SymbolStaticPreview
          content="<svg><rect width='10' height='10'/></svg>"
          sizeX={4}
          sizeY={2}
          onBack={onBack}
        />
      </RawIntlProvider>
    </AntdApp>,
  );
  return { onBack };
}

describe('SymbolStaticPreview', () => {
  it('renders the symbol content in a metadata-sized stage', () => {
    renderPreview();
    const svg = screen.getByTestId('scada-preview-svg');
    expect(svg.innerHTML).toContain('<svg');
    const stage = screen.getByTestId('scada-preview-stage');
    expect(stage.style.width).toBe('400px');
    expect(stage.style.height).toBe('200px');
  });

  it('zooms within the clamp range', () => {
    renderPreview();
    const stage = screen.getByTestId('scada-preview-stage');
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByTestId('scada-preview-zoom-in'));
    }
    expect(stage.style.transform).toBe(`scale(${3})`);
    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByTestId('scada-preview-zoom-out'));
    }
    expect(stage.style.transform).toBe(`scale(${0.5})`);
  });

  it('backs to editing', () => {
    const { onBack } = renderPreview();
    fireEvent.click(screen.getByTestId('scada-preview-back'));
    expect(onBack).toHaveBeenCalled();
  });
});
