/**
 * ConsolePane — presentational console for the widget editor's bottom-right
 * slot (M9 brief §3 wave S item 9). FROZEN CONTRACT: the shell owns the
 * entries state and the panel placement; wave-3 P feeds entries through the
 * PreviewPaneProps.onConsoleEntry channel (host console capture). P fills
 * NOTHING here — the pane is already fully functional.
 */

import { Button, Empty, Typography } from 'antd';
import { useIntl } from 'react-intl';

export type WidgetConsoleLevel = 'log' | 'info' | 'warn' | 'error';

/** One captured console line (the shell mints id/ts). */
export interface WidgetConsoleEntry {
  id: number;
  level: WidgetConsoleLevel;
  text: string;
  /** wall-clock ms — displayed as hh:mm:ss prefix. */
  ts: number;
}

export interface ConsolePaneProps {
  entries: WidgetConsoleEntry[];
  onClear: () => void;
}

const LEVEL_COLOR: Record<
  WidgetConsoleLevel,
  'secondary' | 'success' | 'warning' | 'danger' | undefined
> = {
  log: undefined,
  info: undefined,
  warn: 'warning',
  error: 'danger',
};

function formatTime(ts: number): string {
  const date = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function ConsolePane({ entries, onClear }: ConsolePaneProps) {
  const { formatMessage } = useIntl();
  return (
    <div
      data-testid="widget-console"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        padding: '4px 8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'editor.widget.editor.console.title',
            defaultMessage: 'Console',
          })}
          {` (${entries.length})`}
        </Typography.Text>
        <Button
          size="small"
          type="text"
          disabled={entries.length === 0}
          data-testid="widget-console-clear"
          onClick={onClear}
        >
          {formatMessage({
            id: 'editor.widget.editor.console.clear',
            defaultMessage: 'Clear',
          })}
        </Button>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        {entries.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={formatMessage({
              id: 'editor.widget.editor.console.empty',
              defaultMessage: 'No output yet',
            })}
            style={{ marginTop: 24 }}
          />
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              data-testid={`widget-console-entry-${entry.level}`}
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            >
              <Typography.Text type="secondary">
                {formatTime(entry.ts)}
              </Typography.Text>{' '}
              <Typography.Text type={LEVEL_COLOR[entry.level]}>
                {entry.text}
              </Typography.Text>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
