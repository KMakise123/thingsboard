/**
 * Generic save-with-conflict contract (core/editor/contract, hoisted from
 * the dashboard editor in M8 F wave): version-carrying POST, baseline
 * discipline, conflict fetch, and the Option-B overwrite retry loop — over
 * a FAKE entity to prove the core is entity-agnostic (the dashboard
 * binding's behavior stays pinned by pages/dashboards/editor/contract/
 * save-with-conflict.test.ts through the shim).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorSession } from '@/core/editor/session';

import {
  type DraftConflictHooks,
  MAX_OVERWRITE_ATTEMPTS,
  overwriteDraftWithLocalDraft,
  saveDraftWithConflict,
} from './save-with-conflict';

/** Fake wire entity: id + optimistic version + a title nobody reads. */
interface FakeEntity {
  id: string;
  version?: number;
  title: string;
}

/** Fake draft: single counter field. */
interface FakeDraft {
  value: string;
}

type FakeHooks = DraftConflictHooks<FakeEntity, FakeDraft> & {
  save: ReturnType<typeof vi.fn>;
  fetchEntity: ReturnType<typeof vi.fn>;
};

function fakeHooks(): FakeHooks {
  const hooks = {
    save: vi.fn(),
    fetchEntity: vi.fn(),
    entityId: (entity: FakeEntity) => entity.id,
    versionOf: (entity: FakeEntity) => entity.version,
    // the fake "entity" wraps the draft under a marker key, mirroring how a
    // real entity carries its draft in a designated field
    withDraft: (
      entity: FakeEntity,
      draft: FakeDraft,
      version?: number,
    ): FakeEntity =>
      ({
        ...entity,
        draftMarker: draft,
        ...(version !== undefined ? { version } : {}),
      }) as FakeEntity,
    draftOf: (entity: FakeEntity, fallback: FakeDraft): FakeDraft =>
      (entity as unknown as { draftMarker?: FakeDraft }).draftMarker ??
      fallback,
  };
  return hooks as unknown as FakeHooks;
}

function versionConflict(): Error & { errorCode: number } {
  return Object.assign(new Error('version conflict'), { errorCode: 35 });
}

function setup(entity: FakeEntity) {
  const session = new EditorSession<FakeDraft>({
    baseline: { value: 'v1' },
  });
  return { session, entity, hooks: fakeHooks() };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('saveDraftWithConflict — generic core', () => {
  it('POSTs the entity with the draft attached and re-anchors the baseline', async () => {
    const { session, entity, hooks } = setup({
      id: 'e1',
      version: 7,
      title: 'T',
    });
    session.write('edit', (draft) => {
      draft.value = 'v2';
    });
    hooks.save.mockResolvedValue({
      id: 'e1',
      version: 4,
      title: 'T',
      draftMarker: { value: 'v2' },
    });

    const outcome = await saveDraftWithConflict({ session, entity, hooks });

    expect(outcome.status).toBe('saved');
    expect(hooks.save).toHaveBeenCalledTimes(1);
    const posted = hooks.save.mock.calls[0][0] as FakeEntity & {
      draftMarker: FakeDraft;
    };
    expect(posted.version).toBe(7); // optimistic-lock version from the meta
    expect(posted.draftMarker).toEqual({ value: 'v2' });
    expect(session.dirty).toBe(false);
  });

  it('fetches the server entity on 409 and reports the conflict untouched', async () => {
    const { session, entity, hooks } = setup({
      id: 'e1',
      version: 7,
      title: 'T',
    });
    session.write('edit', (draft) => {
      draft.value = 'v2';
    });
    hooks.save.mockRejectedValue(versionConflict());
    hooks.fetchEntity.mockResolvedValue({ id: 'e1', version: 9, title: 'T' });

    const outcome = await saveDraftWithConflict({ session, entity, hooks });

    expect(outcome).toEqual({
      status: 'conflict',
      serverEntity: { id: 'e1', version: 9, title: 'T' },
    });
    expect(hooks.fetchEntity).toHaveBeenCalledWith('e1');
    expect(session.dirty).toBe(true);
  });

  it('keeps serverEntity null when the conflict-time fetch fails', async () => {
    const { session, entity, hooks } = setup({
      id: 'e1',
      version: 7,
      title: 'T',
    });
    hooks.save.mockRejectedValue(versionConflict());
    hooks.fetchEntity.mockRejectedValue(new Error('network down'));

    const outcome = await saveDraftWithConflict({ session, entity, hooks });
    expect(outcome.status).toBe('conflict');
    expect((outcome as { serverEntity: unknown }).serverEntity).toBeNull();
  });

  it('surfaces non-35 errors without touching the session', async () => {
    const { session, entity, hooks } = setup({
      id: 'e1',
      version: 7,
      title: 'T',
    });
    hooks.save.mockRejectedValue(
      Object.assign(new Error('boom'), { errorCode: 10 }),
    );

    const outcome = await saveDraftWithConflict({ session, entity, hooks });

    expect(outcome.status).toBe('error');
    expect(session.dirty).toBe(false); // nothing written in this scenario
    expect(hooks.fetchEntity).not.toHaveBeenCalled();
  });
});

describe('overwriteDraftWithLocalDraft — Option B retry loop', () => {
  it('re-reads the fresh version and POSTs with it', async () => {
    const { session, entity, hooks } = setup({
      id: 'e1',
      version: 7,
      title: 'T',
    });
    session.write('edit', (draft) => {
      draft.value = 'v2';
    });
    hooks.fetchEntity.mockResolvedValue({ id: 'e1', version: 12, title: 'T' });
    hooks.save.mockResolvedValue({
      id: 'e1',
      version: 13,
      title: 'T',
      draftMarker: { value: 'v2' },
    });

    const outcome = await overwriteDraftWithLocalDraft({
      session,
      entity,
      hooks,
    });

    expect(outcome.status).toBe('saved');
    const posted = hooks.save.mock.calls[0][0] as { version?: number };
    expect(posted.version).toBe(12); // fresh, not the stale meta version
    expect(session.dirty).toBe(false);
  });

  it('falls back to conflict after exhausting the attempt cap', async () => {
    const { session, entity, hooks } = setup({
      id: 'e1',
      version: 7,
      title: 'T',
    });
    hooks.fetchEntity.mockResolvedValue({ id: 'e1', version: 20, title: 'T' });
    hooks.save.mockRejectedValue(versionConflict());

    const outcome = await overwriteDraftWithLocalDraft({
      session,
      entity,
      hooks,
    });

    expect(outcome).toEqual({
      status: 'conflict',
      serverEntity: { id: 'e1', version: 20, title: 'T' },
    });
    expect(hooks.save).toHaveBeenCalledTimes(MAX_OVERWRITE_ATTEMPTS);
  });

  it('refuses to blind-POST when the fresh fetch fails', async () => {
    const { session, entity, hooks } = setup({
      id: 'e1',
      version: 7,
      title: 'T',
    });
    hooks.fetchEntity.mockRejectedValue(new Error('network down'));

    const outcome = await overwriteDraftWithLocalDraft({
      session,
      entity,
      hooks,
    });

    expect(outcome.status).toBe('error');
    expect(hooks.save).not.toHaveBeenCalled();
  });
});
