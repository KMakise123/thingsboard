/**
 * User transport endpoints. Paths exist on this backend's openapi snapshot
 * (RECON §3, verified 2026-09-01). Note: there is no resetPassword endpoint
 * — the "reset password" parity is activation-link display + resend mail.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@/types/tb';
import { Authority, EntityType } from '@/types/tb';

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
  deleteUser,
  getCustomerUsers,
  getUserActivationLink,
  getUserActivationLinkInfo,
  getUserById,
  getUserToken,
  isUserTokenAccessEnabled,
  getUsers,
  saveUser,
  sendActivationMail,
  setUserCredentialsEnabled,
} from './user';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const PAGE_LINK = {
  pageSize: 10,
  page: 0,
  sortOrder: { property: 'createdTime', direction: 'DESC' as const },
};

const USER = {
  id: { entityType: EntityType.USER, id: 'u-1' },
  createdTime: 0,
  email: 'cu@thingsboard.org',
  authority: Authority.CUSTOMER_USER,
} satisfies User;

describe('user transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('reads the authority-scoped and customer-scoped pages', async () => {
    await getUsers(PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/users', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });

    await getCustomerUsers('cust-1', PAGE_LINK);
    expect(get).toHaveBeenCalledWith(
      '/api/customer/cust-1/users',
      expect.objectContaining({ pageSize: 10 }),
    );
  });

  it('saves through POST /api/user with the activation query param', async () => {
    await saveUser(USER);
    expect(post).toHaveBeenCalledWith('/api/user', USER, {
      sendActivationMail: undefined,
    });

    await saveUser(USER, { sendActivationMail: true });
    expect(post).toHaveBeenLastCalledWith('/api/user', USER, {
      sendActivationMail: true,
    });
  });

  it('pins the single-entity endpoints', async () => {
    await getUserById('u-1');
    expect(get).toHaveBeenCalledWith('/api/user/u-1');

    await deleteUser('u-1');
    expect(del).toHaveBeenCalledWith('/api/user/u-1');

    await setUserCredentialsEnabled('u-1', false);
    expect(post).toHaveBeenCalledWith(
      '/api/user/u-1/userCredentialsEnabled',
      undefined,
      { userCredentialsEnabled: false },
    );
  });

  it('reads the activation link and resend entry points', async () => {
    await getUserActivationLink('u-1');
    expect(get).toHaveBeenCalledWith('/api/user/u-1/activationLink');

    await getUserActivationLinkInfo('u-1');
    expect(get).toHaveBeenCalledWith('/api/user/u-1/activationLinkInfo');

    await sendActivationMail('cu@thingsboard.org');
    expect(post).toHaveBeenCalledWith(
      '/api/user/sendActivationMail',
      undefined,
      { email: 'cu@thingsboard.org' },
    );
  });

  it('pins the login-as endpoints (token switch + target JwtPair)', async () => {
    await isUserTokenAccessEnabled();
    expect(get).toHaveBeenCalledWith('/api/user/tokenAccessEnabled');

    await getUserToken('u-1');
    expect(get).toHaveBeenCalledWith('/api/user/u-1/token');
  });
});
