/**
 * Per-instance runtime error boundary for the preview (spec §5.5 运行错).
 *
 * One boundary per compiled-widget instance (it remounts with the runId
 * key), so a render-time crash degrades THIS preview run only. The catch
 * funnels into the structured error channel (`onRuntimeError`) where the
 * host maps the stack back through sourceURL/lineOffset; the degraded card
 * stays honest about what broke (the message is compiled-code passthrough,
 * ADR 0004 §6).
 *
 * `resetKeys` follows the react-error-boundary pattern: when a key changes
 * after a caught error (e.g. the WYSIWYG settings edited, or the runId
 * remount) the boundary retries the children instead of showing a stale
 * crash forever.
 */

import { Typography } from 'antd';
import { Component, type ReactNode, useMemo } from 'react';
import { useIntl } from 'react-intl';

interface BoundaryState {
  error: Error | null;
  prevResetKeys: readonly unknown[];
}

export interface WidgetRuntimeBoundaryProps {
  children: ReactNode;
  resetKeys: readonly unknown[];
  onRuntimeError: (error: Error) => void;
}

function keysChanged(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length !== b.length || a.some((value, index) => value !== b[index]);
}

export class WidgetRuntimeBoundary extends Component<
  WidgetRuntimeBoundaryProps,
  BoundaryState
> {
  state: BoundaryState = {
    error: null,
    prevResetKeys: this.props.resetKeys,
  };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: WidgetRuntimeBoundaryProps,
    state: BoundaryState,
  ): Partial<BoundaryState> | null {
    if (keysChanged(props.resetKeys, state.prevResetKeys)) {
      // a reset key moved: drop a stale caught error so the subtree retries
      return { error: null, prevResetKeys: props.resetKeys };
    }
    return null;
  }

  componentDidCatch(error: Error): void {
    this.props.onRuntimeError(error);
  }

  render() {
    if (this.state.error) {
      return <RuntimeFallback message={this.state.error.message} />;
    }
    return this.props.children;
  }
}

function RuntimeFallback({ message }: { message: string }) {
  const { formatMessage } = useIntl();
  const label = useMemo(
    () =>
      formatMessage({
        id: 'editor.widget.editor.preview.runtimeError',
        defaultMessage: 'Runtime error',
      }),
    [formatMessage],
  );
  return (
    <div
      data-testid="widget-preview-runtime-broken"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 8,
        textAlign: 'center',
      }}
    >
      <Typography.Text type="danger">{label}</Typography.Text>
      {/* compiled-widget error text is passthrough (ADR 0004 §6) */}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {message}
      </Typography.Text>
    </div>
  );
}
