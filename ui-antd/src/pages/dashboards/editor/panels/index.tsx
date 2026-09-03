/**
 * WidgetConfigPanel — stable entry of the right-side config panel (M7 brief
 * §2/§3). C wave freezes the props seam; the K wave fills the five-section
 * panel implementation behind this exact signature.
 */
import { Empty } from 'antd';
import { useIntl } from 'react-intl';

import type { EditorSession } from '@/core/editor/session';
import type { DashboardConfiguration } from '@/types/tb/dashboard';

export interface WidgetConfigPanelProps {
  session: EditorSession<DashboardConfiguration>;
  /** Selected widget id, null = nothing selected (panel shows the hint). */
  widgetId: string | null;
  onClose: () => void;
}

export function WidgetConfigPanel({ widgetId }: WidgetConfigPanelProps) {
  const { formatMessage } = useIntl();
  return (
    <div
      data-testid="widget-config-panel"
      data-widget-id={widgetId ?? undefined}
      style={{ width: 320 }}
    >
      {widgetId ? null : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={formatMessage({
            id: 'editor.dashboard.panel.placeholder',
            defaultMessage:
              'No widget selected: click a widget on the canvas to configure it.',
          })}
        />
      )}
    </div>
  );
}
