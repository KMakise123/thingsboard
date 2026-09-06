/**
 * Pure-layer tests of the repository settings credential strip (R31,
 * contract #8): untouched AND empty credentials must never reach the wire.
 */
import { describe, expect, it } from 'vitest';

import {
  defaultRepositoryFormValues,
  stripUnchangedCredentials,
} from './repository-settings-data';

describe('stripUnchangedCredentials', () => {
  it('strips unchecked credential fields entirely (not null, not "")', () => {
    const payload = stripUnchangedCredentials(
      {
        repositoryUri: 'https://git.example.com/x.git',
        defaultBranch: 'main',
        readOnly: false,
        showMergeCommits: true,
        authMethod: 'USERNAME_PASSWORD' as const,
        username: 'alice',
        password: '',
        privateKeyPassword: undefined,
      },
      { password: false, privateKey: false, privateKeyPassword: false },
    );
    expect(payload).toEqual({
      repositoryUri: 'https://git.example.com/x.git',
      defaultBranch: 'main',
      readOnly: false,
      showMergeCommits: true,
      authMethod: 'USERNAME_PASSWORD',
      username: 'alice',
    });
    expect('password' in payload).toBe(false);
    expect('privateKey' in payload).toBe(false);
    expect('privateKeyPassword' in payload).toBe(false);
  });

  it('keeps a re-entered credential when its change flag is set', () => {
    const payload = stripUnchangedCredentials(
      {
        authMethod: 'USERNAME_PASSWORD' as const,
        password: 'new-secret',
      },
      { password: true },
    );
    expect(payload).toEqual({
      authMethod: 'USERNAME_PASSWORD',
      password: 'new-secret',
    });
  });

  it('strips a checked-but-empty credential (empty string ≠ 留空)', () => {
    const payload = stripUnchangedCredentials(
      { authMethod: 'USERNAME_PASSWORD' as const, password: '' },
      { password: true },
    );
    expect('password' in payload).toBe(false);
  });

  it('keeps non-credential fields even without flags', () => {
    const payload = stripUnchangedCredentials(
      {
        repositoryUri: 'u',
        privateKeyFileName: 'id.pem',
        changePassword: true,
      },
      {},
    );
    expect(payload).toEqual({
      repositoryUri: 'u',
      privateKeyFileName: 'id.pem',
      changePassword: true,
    });
  });

  it('defaults an unconfigured repo to branch main + username/password', () => {
    expect(defaultRepositoryFormValues()).toEqual({
      repositoryUri: undefined,
      defaultBranch: 'main',
      readOnly: false,
      showMergeCommits: false,
      authMethod: 'USERNAME_PASSWORD',
    });
  });
});
