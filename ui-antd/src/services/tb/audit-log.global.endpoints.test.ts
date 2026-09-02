/**
 * Global audit-log read (settings audit-logs page): /api/audit/logs with
 * the time window and the comma-joined actionTypes wire format
 * (AuditLogController parses a single `actionTypes` string).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { getAuditLogs } from './audit-log';

const get = vi.mocked(tbHttp.get);

describe('global audit log endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
  });

  it('joins actionTypes and passes the window', async () => {
    await getAuditLogs(
      {
        pageSize: 20,
        page: 2,
        textSearch: 'dev',
        sortOrder: { property: 'userName', direction: 'ASC' },
      },
      {
        startTime: 1000,
        endTime: 2000,
        actionTypes: ['LOGIN', 'LOGOUT'],
      },
    );
    expect(get).toHaveBeenCalledWith('/api/audit/logs', {
      pageSize: 20,
      page: 2,
      textSearch: 'dev',
      sortProperty: 'userName',
      sortOrder: 'ASC',
      startTime: 1000,
      endTime: 2000,
      actionTypes: 'LOGIN,LOGOUT',
    });
  });

  it('omits empty filters', async () => {
    await getAuditLogs({ pageSize: 10, page: 0 });
    expect(get).toHaveBeenCalledWith('/api/audit/logs', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortProperty: undefined,
      sortOrder: undefined,
      startTime: undefined,
      endTime: undefined,
      actionTypes: undefined,
    });
  });
});
