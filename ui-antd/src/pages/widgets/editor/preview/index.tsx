/**
 * WidgetPreview — the same-page live preview slot of the widget editor
 * (M9 brief §3 wave S item 9). FROZEN CONTRACT for wave-3 P: the shell
 * passes the four source tabs + the channels below; P fills the component
 * WITHOUT touching this file's prop shapes (P owns the file body from then
 * on, brief §3).
 *
 * P's implementation duties (spec §5.1/§5.4/§5.5): Sucrase compile (sync
 * throw before mount) → require-shim execution → render with the function
 * datasource; key-on-runId remount; WYSIWYG settings form editing that
 * writes back through onDefaultConfigChange (JSON STRING — keep-string
 * discipline); console capture feeding onConsoleEntry; per-instance
 * ErrorBoundary + sourceURL line offsets; structured compile errors for
 * the CM gutter diagnostics through onError (null = clear — typing clears
 * stale marks, re-compile happens on ctrl+enter).
 *
 * This placeholder renders the panel skeleton + the run pipeline probes so
 * the shell wiring is testable before P lands.
 */

import { Empty, Typography } from 'antd';
import { useIntl } from 'react-intl';
import type { FormProperty } from '@/components/form-property/types';

import type { WidgetConsoleLevel } from './console';

export type { WidgetConsoleEntry, WidgetConsoleLevel } from './console';

/** Structured error channel — `null` clears the current error surface. */
export interface WidgetPreviewError {
  kind: 'compile' | 'runtime';
  message: string;
  /** 1-based source line for the CM gutter (P1 line parity). */
  line?: number;
}

/** Console capture channel entry (the shell owns the pane + entry list). */
export interface WidgetConsoleEntryInput {
  level: WidgetConsoleLevel;
  text: string;
}

export interface PreviewPaneProps {
  /** current TSX source (pre-compile, straight from the session draft). */
  tsx: string;
  /** current CSS source ('' = none — the style scope prefixes it). */
  css: string;
  /** settings schema for the WYSIWYG settings form. */
  settingsForm: FormProperty[];
  /**
   * default widget config as a JSON STRING (draft passthrough discipline —
   * parse inside, never re-store parsed).
   */
  defaultConfig: string;
  /**
   * bump to force a full remount (ctrl+enter run) — the hook subscriptions
   * restart with a fresh lifecycle.
   */
  runId: number;
  /** structured error surface (compile → CM diagnostics, runtime → here). */
  onError: (error: WidgetPreviewError | null) => void;
  /** console capture (host renders ConsolePane from the collected list). */
  onConsoleEntry: (entry: WidgetConsoleEntryInput) => void;
  /** settings WYSIWYG write-back — JSON string, never parsed storage. */
  onDefaultConfigChange: (nextDefaultConfig: string) => void;
}

export function WidgetPreview({ runId, tsx, css }: PreviewPaneProps) {
  const { formatMessage } = useIntl();
  return (
    <div
      data-testid="widget-preview"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 8,
        overflow: 'auto',
      }}
    >
      <Typography.Text strong>
        {formatMessage({
          id: 'editor.widget.editor.preview.title',
          defaultMessage: 'Preview',
        })}
      </Typography.Text>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={formatMessage({
          id: 'editor.widget.editor.preview.pending',
          defaultMessage: 'Preview pane',
        })}
      />
      <Typography.Text
        type="secondary"
        data-testid="widget-preview-run-id"
      >{`${formatMessage({
        id: 'editor.widget.editor.preview.runId',
        defaultMessage: 'Run',
      })}: ${runId}`}</Typography.Text>
      <Typography.Text type="secondary">
        {`tsx ${tsx.length} / css ${css.length}`}
      </Typography.Text>
    </div>
  );
}
