/**
 * EditorSession<T> — the single draft writer + undo/redo stack shared by the
 * v2 editor suite (ADR 0004 §2, M7 brief §2).
 *
 * Framework-light core: no React here — the `useEditorSession` adapter lives
 * in use-editor-session.ts. Everything is plain immer + an observer list.
 *
 * Contract highlights:
 *  - `enter(normalizedBaseline)`: the baseline is normalized once by the
 *    caller before entry; `serialize` defaults to identity (dashboards POST
 *    the whole configuration object).
 *  - `write(label, recipe, {coalesceKey?})` is the ONLY way the draft
 *    changes (no raw setter exists on the class). Non-selection state such
 *    as viewport/panel-open/timewindow tweaks simply never reach it, so they
 *    cannot enter the stack (§3.9 不入栈项).
 *  - Consecutive writes sharing a non-empty `coalesceKey` within
 *    COALESCE_WINDOW_MS of the group's last write merge into one transaction
 *    (first label kept, patches appended in order, inversePatches prepended).
 *    A merge never happens while the redo stack is non-empty (the top group's
 *    future is still pending) and never spans an undo.
 *  - `checkpoint(label)` marks a position; `handle.rollback()` commits ONE
 *    new group reverting every post-checkpoint write still applied — the
 *    config panel cancel path. It composes with undo/redo because it is an
 *    ordinary transaction group.
 *  - `save()` advances the baseline (and current) to the serialized draft and
 *    returns it; the caller owns the POST + version backfill (pass the saved
 *    server entity back as `save(entity)` to re-anchor without entering
 *    history). The dashboard stack SURVIVES save — asymmetry with rule
 *    chains (checkpointed on save) is a documented design choice.
 *  - `dirty` is an O(1) reference compare. When the undo stack drains, the
 *    current draft is reference-reset to the baseline (引用复位锚定) —
 *    unless history was truncated by the patch budget, where draining cannot
 *    reach the baseline and dirty stays true.
 *  - Patch budget: cumulative stored patch size (JSON char count ≈ bytes)
 *    beyond DEFAULT_PATCH_BUDGET_BYTES drops OLDEST groups (never the sole
 *    newest) and latches `historyTruncated` — dirty precision degrades and
 *    the UI may surface it later.
 */

import {
  applyPatches,
  enablePatches,
  type Patch,
  produceWithPatches,
} from 'immer';

enablePatches();

/** Form typing merges into one transaction within this window (§3.9). */
export const COALESCE_WINDOW_MS = 1000;

/** Cumulative stored-patch budget (JSON chars ≈ bytes) before eviction. */
export const DEFAULT_PATCH_BUDGET_BYTES = 4 * 1024 * 1024;

/** One transaction group on the undo stack. */
export interface EditorTransaction {
  /** Monotonic group id (also the checkpoint mark ordering). */
  readonly id: number;
  label: string;
  patches: Patch[];
  inversePatches: Patch[];
  coalesceKey?: string;
  /** Wall-clock ts of the last write merged into the group. */
  ts: number;
  /** Approximate stored size (JSON chars) used by the patch budget. */
  bytes: number;
}

/** Consistent read model handed to React via useSyncExternalStore. */
export interface EditorSnapshot<T> {
  current: T;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  historyTruncated: boolean;
}

/** Handle returned by `checkpoint` — the config-panel cancel path. */
export interface EditorCheckpoint {
  readonly label: string;
  /** Reverts every post-checkpoint write still applied, as ONE group. */
  rollback(): void;
}

export interface EditorSessionOptions<T> {
  /**
   * Draft → wire entity mapping run on save. Identity by default (the
   * dashboard editor serializes the whole configuration). Must be
   * shape-preserving so pre-save inverse patches keep applying.
   */
  serialize?: (draft: T) => T;
  /** Override the cumulative patch budget (tests / future tuning). */
  patchBudgetBytes?: number;
  /** Optional baseline; equivalent to calling `enter` right away. */
  baseline?: T;
}

interface CheckpointMark {
  /** Session epoch — checkpoints die with `enter()` on the same instance. */
  epoch: number;
  /** Groups with id > markId were written after the checkpoint. */
  markId: number;
  label: string;
}

const NOT_ENTERED = 'editor session not entered';

export class EditorSession<T extends object> {
  private baseline!: T;
  private draft!: T;
  private undoStack: EditorTransaction[] = [];
  private redoStack: EditorTransaction[] = [];
  private totalBytes = 0;
  private truncated = false;
  private lastGroupId = 0;
  private epoch = 0;
  private readonly serializeFn: (draft: T) => T;
  private readonly budget: number;
  private readonly listeners = new Set<() => void>();
  private snapshotCache: EditorSnapshot<T> | null = null;

  constructor(options?: EditorSessionOptions<T>) {
    this.serializeFn = options?.serialize ?? ((draft: T): T => draft);
    this.budget = options?.patchBudgetBytes ?? DEFAULT_PATCH_BUDGET_BYTES;
    if (options?.baseline) {
      this.enter(options.baseline);
    }
  }

  /** Establishes (or resets) the session over a freshly normalized baseline. */
  enter(baseline: T): void {
    this.baseline = baseline;
    this.draft = baseline;
    this.undoStack = [];
    this.redoStack = [];
    this.totalBytes = 0;
    this.truncated = false;
    this.lastGroupId = 0;
    this.epoch += 1;
    this.notify();
  }

  /** The live draft (immer-frozen). Pass its fields to the UI read-only. */
  get current(): T {
    this.assertEntered();
    return this.draft;
  }

  get dirty(): boolean {
    this.assertEntered();
    return this.draft !== this.baseline;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Applied transaction groups, oldest first (undo menu labels / tests). */
  get history(): readonly EditorTransaction[] {
    return this.undoStack;
  }

  /** Latched once the patch budget dropped any group. */
  get historyTruncated(): boolean {
    return this.truncated;
  }

  /**
   * The ONLY draft writer. Applies the recipe via immer, appends one
   * transaction group (or merges into the top group on a coalesce hit) and
   * clears the redo stack. A recipe producing no patches is a full no-op.
   */
  write(
    label: string,
    recipe: (draft: T) => void,
    opts?: { coalesceKey?: string },
  ): void {
    this.assertEntered();
    const [next, patches, inversePatches] = produceWithPatches(
      this.draft,
      recipe,
    );
    if (patches.length === 0) {
      return;
    }
    const key = opts?.coalesceKey;
    const top = this.undoStack[this.undoStack.length - 1];
    const now = Date.now();
    if (
      key &&
      top &&
      top.coalesceKey === key &&
      this.redoStack.length === 0 &&
      now - top.ts <= COALESCE_WINDOW_MS
    ) {
      const delta = patchBytes(patches);
      top.patches = [...top.patches, ...patches];
      // newer inverse patches run first when the merged group is undone
      top.inversePatches = [...inversePatches, ...top.inversePatches];
      top.ts = now;
      top.bytes += delta;
      this.totalBytes += delta;
    } else {
      const group: EditorTransaction = {
        id: ++this.lastGroupId,
        label,
        patches,
        inversePatches,
        coalesceKey: key || undefined,
        ts: now,
        bytes: patchBytes(patches),
      };
      this.undoStack.push(group);
      this.redoStack = [];
      this.totalBytes += group.bytes;
    }
    this.evictOverBudget();
    this.draft = next;
    this.notify();
  }

  undo(): void {
    const group = this.undoStack.pop();
    if (!group) {
      return;
    }
    this.totalBytes -= group.bytes;
    const restored = applyPatches(this.draft, group.inversePatches);
    // 引用复位锚定: a fully drained intact stack reconstructs the baseline
    // exactly — reset the reference so dirty goes false. With truncated
    // history the reconstruction cannot reach the baseline; keep the value.
    this.draft =
      this.undoStack.length === 0 && !this.truncated ? this.baseline : restored;
    this.redoStack.push(group);
    this.notify();
  }

  redo(): void {
    const group = this.redoStack.pop();
    if (!group) {
      return;
    }
    this.draft = applyPatches(this.draft, group.patches);
    this.undoStack.push(group);
    this.totalBytes += group.bytes;
    this.notify();
  }

  /**
   * Marks the current position; `rollback()` on the handle commits one group
   * that reverts every post-checkpoint write still applied (config-panel
   * cancel). Writes already undone past the mark are left as-is — rollback
   * never resurrects them. Handles go inert across `enter()`.
   */
  checkpoint(label: string): EditorCheckpoint {
    const mark: CheckpointMark = {
      epoch: this.epoch,
      markId: this.lastGroupId,
      label,
    };
    return {
      label,
      rollback: (): void => {
        this.rollback(mark);
      },
    };
  }

  private rollback(mark: CheckpointMark): void {
    if (mark.epoch !== this.epoch) {
      return;
    }
    const postMark = this.undoStack
      .filter((group) => group.id > mark.markId)
      .sort((a, b) => b.id - a.id);
    if (postMark.length === 0) {
      return;
    }
    const inversePatches = postMark.flatMap((group) => group.inversePatches);
    const [next, patches, redoPatches] = produceWithPatches(
      this.draft,
      (draft: T): void => {
        applyPatches(draft, inversePatches);
      },
    );
    if (patches.length === 0) {
      return;
    }
    const group: EditorTransaction = {
      id: ++this.lastGroupId,
      label: `rollback: ${mark.label}`,
      patches,
      inversePatches: redoPatches,
      ts: Date.now(),
      bytes: patchBytes(patches),
    };
    this.undoStack.push(group);
    this.redoStack = [];
    this.totalBytes += group.bytes;
    this.evictOverBudget();
    this.draft = next;
    this.notify();
  }

  /**
   * Advances the baseline (and current) to the serialized draft and returns
   * it — the caller owns the POST. Pass the persisted server entity
   * (e.g. with the backfilled version) to re-anchor to it instead; neither
   * path enters history. The undo stack SURVIVES: undo keeps walking through
   * pre-save groups against the new baseline.
   */
  save(serverEntity?: T): T {
    this.assertEntered();
    const source = serverEntity ?? this.draft;
    const serialized = this.serializeFn(source);
    this.baseline = serialized;
    this.draft = serialized;
    this.notify();
    return serialized;
  }

  /** Observer API consumed by `useEditorSession` (useSyncExternalStore). */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  };

  /** Referentially stable between changes — useSyncExternalStore contract. */
  getSnapshot = (): EditorSnapshot<T> => {
    if (!this.snapshotCache) {
      this.snapshotCache = {
        current: this.draft,
        dirty: this.draft !== this.baseline,
        canUndo: this.canUndo,
        canRedo: this.canRedo,
        historyTruncated: this.truncated,
      };
    }
    return this.snapshotCache;
  };

  private assertEntered(): void {
    if (this.baseline === undefined) {
      throw new Error(NOT_ENTERED);
    }
  }

  private evictOverBudget(): void {
    while (this.totalBytes > this.budget && this.undoStack.length > 1) {
      const dropped = this.undoStack.shift();
      if (!dropped) {
        break;
      }
      this.totalBytes -= dropped.bytes;
      this.truncated = true;
    }
  }

  private notify(): void {
    this.snapshotCache = null;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** Approximate wire size of a patch batch (JSON chars ≈ bytes). */
function patchBytes(patches: Patch[]): number {
  let total = 0;
  for (const patch of patches) {
    total += JSON.stringify(patch).length;
  }
  return total;
}
