/**
 * §3.8 save + 409 contract tests over the REAL EditorSession with the
 * transport mocked at the module boundary: version-carrying POST, baseline
 * discipline, conflict fetch, and the Option-B overwrite retry loop capped
 * at 3 attempts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';
import {
  MAX_OVERWRITE_ATTEMPTS,
  type SaveOutcome,
  loadServerVersion,
  overwriteWithLocalDraft,
  saveDashboardDraft,
} from './save-with-conflict';

const dashboardServiceMock = vi.hoisted(() => ({
  saveDashboard: vi.fn(),
  getDashboard: vi.fn(),
}));
vi.mock('@/services/tb/dashboard', () => dashboardServiceMock);

/** ServerErrorError-shaped 409 fixture (VERSION_CONFLICT, errorCode 35). */
function versionConflict(): Error & { errorCode: number } {
  return Object.assign(new Error('version conflict'), { errorCode: 35 });
}

function serverDashboard(overrides?: Partial<Dashboard>): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Server title',
    version: 7,
    createdTime: 1,
    tenantId: { entityType: 'TENANT', id: 't1' },
    configuration: {
      widgets: {},
      states: {
        default: {
          name: 'Root',
          root: true,
          layouts: {
            main: { widgets: {}, gridSettings: { columns: 24, margin: 10 } },
          },
        },
      },
      entityAliases: {},
    },
    ...overrides,
  } as Dashboard;
}

function setup() {
  const session = new EditorSession<DashboardConfiguration>({
    baseline: serverDashboard().configuration as DashboardConfiguration,
  });
  const meta = serverDashboard();
  return { session, meta };
}

beforeEach(() => {
  dashboardServiceMock.saveDashboard.mockReset();
  dashboardServiceMock.getDashboard.mockReset();
});

describe('saveDashboardDraft — happy path', () => {
  it('POSTs the draft with the entity meta (id + version) and re-anchors the baseline', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    dashboardServiceMock.saveDashboard.mockResolvedValue(
      serverDashboard({ version: 4 }),
    );

    const outcome = await saveDashboardDraft({ session, dashboard: meta });

    expect(outcome.status).toBe('saved');
    expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(1);
    const posted = dashboardServiceMock.saveDashboard.mock
      .calls[0][0] as Dashboard;
    expect(posted.id?.id).toBe('d1');
    expect(posted.version).toBe(7); // optimistic-lock version from the meta
    expect(posted.configuration?.widgets.w1.config.title).toBe('v2-draft');
    expect(session.dirty).toBe(false);
  });

  it('save is NOT a checkpoint: post-save undo still steps pre-save groups, then drains dirty to false', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    dashboardServiceMock.saveDashboard.mockResolvedValue(
      serverDashboard({ version: 4, configuration: session.current }),
    );
    await saveDashboardDraft({ session, dashboard: meta });

    expect(session.canUndo).toBe(true); // stack survived the save
    undoOnce(session);
    expect(session.dirty).toBe(false); // reference anchoring drains clean
    expect(session.history.length).toBe(0);
  });

  it('non-35 errors surface as {status:"error"} without touching the session', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    dashboardServiceMock.saveDashboard.mockRejectedValue(
      Object.assign(new Error('boom'), { errorCode: 10 }),
    );

    const outcome = await saveDashboardDraft({ session, dashboard: meta });

    expect(outcome.status).toBe('error');
    expect(session.dirty).toBe(true); // draft + stack untouched
    expect(dashboardServiceMock.getDashboard).not.toHaveBeenCalled();
  });
});

describe('saveDashboardDraft — 409 conflict', () => {
  it('fetches the server dashboard and reports the conflict with it', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    const remote = serverDashboard({ version: 9 });
    dashboardServiceMock.saveDashboard.mockRejectedValue(versionConflict());
    dashboardServiceMock.getDashboard.mockResolvedValue(remote);

    const outcome = await saveDashboardDraft({ session, dashboard: meta });

    expect(outcome).toEqual({
      status: 'conflict',
      serverDashboard: remote,
    });
    expect(dashboardServiceMock.getDashboard).toHaveBeenCalledWith('d1');
    expect(session.dirty).toBe(true); // conflict never re-anchors
  });

  it('keeps serverDashboard null when the conflict-time GET fails (dialog degrades honestly)', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    dashboardServiceMock.saveDashboard.mockRejectedValue(versionConflict());
    dashboardServiceMock.getDashboard.mockRejectedValue(
      new Error('network down'),
    );

    const outcome: SaveOutcome = await saveDashboardDraft({
      session,
      dashboard: meta,
    });

    expect(outcome.status).toBe('conflict');
    expect(
      (outcome as { serverDashboard: Dashboard | null }).serverDashboard,
    ).toBeNull();
  });
});

describe('overwriteWithLocalDraft — Option B retry loop', () => {
  it('re-GETs the fresh version and POSTs with it', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    dashboardServiceMock.getDashboard.mockResolvedValue(
      serverDashboard({ version: 12 }),
    );
    dashboardServiceMock.saveDashboard.mockResolvedValue(
      serverDashboard({ version: 13 }),
    );

    const outcome = await overwriteWithLocalDraft({ session, dashboard: meta });

    expect(outcome.status).toBe('saved');
    const posted = dashboardServiceMock.saveDashboard.mock
      .calls[0][0] as Dashboard;
    expect(posted.version).toBe(12); // fresh, not the stale meta version
    expect(posted.configuration?.widgets.w1.config.title).toBe('v2-draft');
    expect(session.dirty).toBe(false);
  });

  it('retries on a second 409 with ANOTHER fresh GET, then succeeds', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    dashboardServiceMock.getDashboard
      .mockResolvedValueOnce(serverDashboard({ version: 12 }))
      .mockResolvedValueOnce(serverDashboard({ version: 13 }));
    dashboardServiceMock.saveDashboard
      .mockRejectedValueOnce(versionConflict())
      .mockResolvedValueOnce(serverDashboard({ version: 14 }));

    const outcome = await overwriteWithLocalDraft({ session, dashboard: meta });

    expect(outcome.status).toBe('saved');
    expect(dashboardServiceMock.getDashboard).toHaveBeenCalledTimes(2);
    expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(2);
    const secondPost = dashboardServiceMock.saveDashboard.mock
      .calls[1][0] as Dashboard;
    expect(secondPost.version).toBe(13);
  });

  it('falls back to conflict (NOT error) after exhausting the 3-attempt cap', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    const remote = serverDashboard({ version: 20 });
    dashboardServiceMock.getDashboard.mockResolvedValue(remote);
    dashboardServiceMock.saveDashboard.mockRejectedValue(versionConflict());

    const outcome = await overwriteWithLocalDraft({ session, dashboard: meta });

    expect(outcome).toEqual({ status: 'conflict', serverDashboard: remote });
    expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(
      MAX_OVERWRITE_ATTEMPTS,
    );
    expect(dashboardServiceMock.getDashboard).toHaveBeenCalledTimes(
      MAX_OVERWRITE_ATTEMPTS,
    );
    expect(session.dirty).toBe(true); // never silently blessed
  });

  it('honors a custom attempt cap (test seam)', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    dashboardServiceMock.getDashboard.mockResolvedValue(
      serverDashboard({ version: 2 }),
    );
    dashboardServiceMock.saveDashboard.mockRejectedValue(versionConflict());

    await overwriteWithLocalDraft({
      session,
      dashboard: meta,
      maxAttempts: 1,
    });
    expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(1);
  });

  it('refuses to blind-POST when the fresh GET fails (error outcome)', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    dashboardServiceMock.getDashboard.mockRejectedValue(
      new Error('network down'),
    );

    const outcome = await overwriteWithLocalDraft({ session, dashboard: meta });

    expect(outcome.status).toBe('error');
    expect(dashboardServiceMock.saveDashboard).not.toHaveBeenCalled();
  });

  it('a non-35 POST failure during overwrite aborts as error', async () => {
    const { session, meta } = setup();
    writeDraftTitle(session, 'v2-draft');
    dashboardServiceMock.getDashboard.mockResolvedValue(
      serverDashboard({ version: 2 }),
    );
    dashboardServiceMock.saveDashboard.mockRejectedValue(
      Object.assign(new Error('validation'), { errorCode: 10 }),
    );

    const outcome = await overwriteWithLocalDraft({ session, dashboard: meta });

    expect(outcome.status).toBe('error');
    expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(1);
  });
});

describe('loadServerVersion — Option A', () => {
  it('enters the normalized server configuration: fresh baseline, clean, empty history', () => {
    const { session } = setup();
    writeDraftTitle(session, 'v2-draft');

    loadServerVersion(session, serverDashboard({ version: 9 }));

    expect(session.dirty).toBe(false);
    expect(session.canUndo).toBe(false);
    expect(session.history.length).toBe(0);
  });

  it('fills defaults for a server entity without a configuration', () => {
    const { session } = setup();
    loadServerVersion(
      session,
      serverDashboard({ configuration: undefined } as Partial<Dashboard>),
    );
    expect(session.current.widgets).toEqual({});
    expect(session.current.entityAliases).toEqual({});
  });
});

function writeDraftTitle(
  session: EditorSession<DashboardConfiguration>,
  title: string,
): void {
  session.write('edit draft', (draft) => {
    draft.widgets.w1 = {
      typeFullFqn: 'system.cards.test',
      config: { title },
    } as DashboardConfiguration['widgets'][string];
  });
}

function undoOnce(session: EditorSession<DashboardConfiguration>): void {
  session.undo();
}
