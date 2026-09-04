/**
 * Smoke render — gate 2 of the widget save chain (spec §5.2: 保存 = 编译 →
 * 执行 → 冒烟渲染 → commit, never silently degrade to storing non-running
 * source).
 *
 * The compile gate (compileWidget) already ran the module BODY (top-level
 * throws surface there as stage `execute`); this gate mounts the compiled
 * component once on a hidden probe container (attached to the document but
 * visually inert — React 19's concurrent root only flushes work for
 * attached containers) and catches render-phase throws, which is where
 * execution errors that only fire with a React lifecycle (undefined access
 * in the component body, bad hook usage, invalid elements) come to light.
 * The boundary captures the error; the root unmounts and the container is
 * removed in a finally, so timers/subscriptions created during the smoke
 * pass never leak into the editor page.
 *
 * Failure mapping reuses the P1 line contract: the reported stack location
 * is mapped back to EDITOR source lines through the compiled module's
 * sourceURL + lineOffset, so a smoke failure lands on the same line numbers
 * the preview console would show.
 */
import { Component, createElement, type ReactNode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import {
  type CompiledWidget,
  resolveRuntimeErrorLocation,
} from '@/core/widget/compile';
import type { CustomWidgetProps } from '@/core/widget/types';

export interface SmokeRenderFailure {
  message: string;
  /** 1-based line in the EDITOR source (P1 mapping), when attributable. */
  line?: number;
  column?: number;
}

export type SmokeRenderOutcome =
  | { ok: true }
  | { ok: false; failure: SmokeRenderFailure };

/** Error boundary capturing the compiled component's render-phase throws. */
class SmokeErrorBoundary extends Component<
  { onError: (error: unknown) => void; children?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : (this.props.children ?? null);
  }
}

/**
 * Mounts the compiled widget once with the given props. Resolves
 * `{ok: true}` when the component survived a full render + unmount cycle;
 * `{ok: false, failure}` when it threw during render (or teardown).
 */
export async function smokeRenderWidget(
  compiled: CompiledWidget,
  props: CustomWidgetProps,
): Promise<SmokeRenderOutcome> {
  // The probe container must be ATTACHED for React 19's concurrent root to
  // schedule/flush work (a fully detached container never renders), but it
  // is visually inert and removed again in the finally below — the editor
  // page never shows it.
  const container = document.createElement('div');
  container.setAttribute('data-widget-smoke', '');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '1px';
  container.style.height = '1px';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);
  const root = createRoot(container);
  let captured: unknown = null;
  try {
    root.render(
      createElement(
        SmokeErrorBoundary,
        {
          onError: (error: unknown) => {
            captured = error;
          },
        },
        createElement(
          Suspense,
          { fallback: null },
          createElement(compiled.component, props),
        ),
      ),
    );
    // The compiled component is lazy: the first render suspends, the module
    // promise resolves on a microtask, React retries the subtree on the
    // scheduler, and a thrown error goes through the boundary on that same
    // cycle. Wait until the detached container actually committed (children)
    // or the boundary captured a throw.
    await flushRenderTicks(
      () => captured !== null || container.hasChildNodes(),
    );
    if (captured !== null) {
      return { ok: false, failure: toFailure(captured, compiled) };
    }
    return { ok: true };
  } catch (error) {
    // Synchronous throw during render/unmount outside the boundary's reach.
    return { ok: false, failure: toFailure(error, compiled) };
  } finally {
    try {
      root.unmount();
    } catch {
      // a failing commit may already have torn the root down
    }
    container.remove();
  }
}

function toFailure(
  error: unknown,
  compiled: CompiledWidget,
): SmokeRenderFailure {
  const location = resolveRuntimeErrorLocation(error, compiled);
  return {
    message: error instanceof Error ? error.message : String(error),
    ...(location?.line === undefined ? {} : { line: location.line }),
    ...(location?.column === undefined ? {} : { column: location.column }),
  };
}

/**
 * Lets the lazy module promise resolve and the retry render pass through
 * the scheduler. Polls on macrotask timers until `done` fires or a small
 * deadline expires: in a real browser the first commit typically lands
 * within 1–2 ticks; the deadline only guards against a pathological
 * never-rendering module (the gate then reports ok — nothing rendered,
 * nothing threw).
 */
async function flushRenderTicks(done: () => boolean): Promise<void> {
  const deadline = Date.now() + 1000;
  let ticks = 0;
  while (!done() && Date.now() < deadline && ticks < 60) {
    ticks += 1;
    await new Promise((resolve) => setTimeout(resolve, ticks <= 3 ? 0 : 15));
  }
}
