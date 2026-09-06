/**
 * RepositorySettingsForm pure layer (M14 wave-2, R22/R31).
 *
 * Credential three-state wire contract (contract #8):
 *   - GET strips password/privateKey/privateKeyPassword to null — nothing
 *     usable is ever re-displayed;
 *   - on the way UP, a null or MISSING credential means "keep the stored
 *     one" (the server check is `== null`) while an EMPTY STRING is a real
 *     credential handed to a real clone/fetch (fails the whole save);
 *   - therefore the UI strips untouched AND empty credential fields before
 *     any submit (save or checkAccess) — never sends null, never sends "".
 */

/** Credential fields subject to the strip-on-unchanged rule (R31). */
export type RepositoryCredentialKey =
  | 'password'
  | 'privateKey'
  | 'privateKeyPassword';

/** Form values of the repository settings form (UI-only flags included). */
export interface RepositorySettingsFormValues {
  repositoryUri?: string;
  defaultBranch?: string;
  readOnly: boolean;
  showMergeCommits: boolean;
  authMethod: 'USERNAME_PASSWORD' | 'PRIVATE_KEY';
  username?: string;
  password?: string;
  privateKeyFileName?: string;
  privateKey?: string;
  privateKeyPassword?: string;
  /** UI-only: "Change password" unlock checkbox (stored value hidden). */
  changePassword?: boolean;
  /** UI-only: "Change passphrase" unlock checkbox. */
  changePrivateKeyPassword?: boolean;
}

const CREDENTIAL_KEYS: Array<RepositoryCredentialKey> = [
  'password',
  'privateKey',
  'privateKeyPassword',
];

/**
 * Drop credential fields the user did not re-enter. A field is stripped
 * when its change flag is unset OR its value is empty — an empty string
 * would otherwise be treated as a REAL credential and fail the validation
 * clone server-side (contract #8). Non-credential fields pass through.
 */
export function stripUnchangedCredentials<T extends object>(
  values: T,
  changedFlags: Partial<Record<RepositoryCredentialKey, boolean>>,
): T {
  const result = { ...values };
  for (const key of CREDENTIAL_KEYS) {
    const value = (result as Record<string, unknown>)[key];
    if (changedFlags[key] !== true || value == null || value === '') {
      delete (result as Record<string, unknown>)[key];
    }
  }
  return result;
}

/**
 * Form⇄wire defaults: an unconfigured repo starts with the ui-ngx defaults
 * (defaultBranch `main`, USERNAME_PASSWORD, both merge/read-only off).
 */
export function defaultRepositoryFormValues(): RepositorySettingsFormValues {
  return {
    repositoryUri: undefined,
    defaultBranch: 'main',
    readOnly: false,
    showMergeCommits: false,
    authMethod: 'USERNAME_PASSWORD',
  };
}
