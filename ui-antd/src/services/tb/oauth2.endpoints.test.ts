/**
 * OAuth2 clients + domains transport endpoints (settings domain): exact
 * paths pinned against OAuth2Controller / DomainController — including the
 * create-time `?oauth2ClientIds=` query and the update-time client PUT split.
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

import {
  deleteDomain,
  deleteOauth2Client,
  getDomainInfos,
  getOauth2ClientById,
  getOauth2ClientInfos,
  getOauth2ClientTemplates,
  saveDomain,
  saveOauth2Client,
  updateDomainOauth2Clients,
} from './oauth2';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const put = vi.mocked(tbHttp.put);
const del = vi.mocked(tbHttp.delete);

const pageLink = {
  pageSize: 10,
  page: 0,
  sortOrder: { property: 'createdTime', direction: 'DESC' as const },
};

describe('oauth2 transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    put.mockResolvedValue(undefined as never);
    del.mockResolvedValue(undefined as never);
  });

  it('clients CRUD + templates', async () => {
    const client = { title: 'G', clientId: 'id' };
    await saveOauth2Client(client as never);
    expect(post).toHaveBeenCalledWith('/api/oauth2/client', client);
    await getOauth2ClientInfos(pageLink);
    expect(get).toHaveBeenCalledWith('/api/oauth2/client/infos', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });
    await getOauth2ClientById('c-1');
    expect(get).toHaveBeenCalledWith('/api/oauth2/client/c-1');
    await deleteOauth2Client('c-1');
    expect(del).toHaveBeenCalledWith('/api/oauth2/client/c-1');
    await getOauth2ClientTemplates();
    expect(get).toHaveBeenCalledWith('/api/oauth2/config/template');
  });

  it('domains save puts client ids in the query on create only', async () => {
    const domain = { name: 'tb.io', oauth2Enabled: true, propagateToEdge: false };
    await saveDomain(domain as never, ['a', 'b']);
    expect(post).toHaveBeenCalledWith('/api/domain', domain, {
      oauth2ClientIds: 'a,b',
    });
    await saveDomain({ ...domain, id: { entityType: 'DOMAIN', id: 'd-1' } } as never);
    expect(post).toHaveBeenCalledWith('/api/domain', expect.anything(), undefined);
    await updateDomainOauth2Clients('d-1', ['a']);
    expect(put).toHaveBeenCalledWith('/api/domain/d-1/oauth2Clients', ['a']);
  });

  it('domain infos + delete', async () => {
    await getDomainInfos(pageLink);
    expect(get).toHaveBeenCalledWith('/api/domain/infos', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });
    await deleteDomain('d-1');
    expect(del).toHaveBeenCalledWith('/api/domain/d-1');
  });
});
