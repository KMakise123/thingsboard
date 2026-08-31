import { vi } from 'vitest';

import common from '@/locales/zh-CN/common';
import login from '@/locales/zh-CN/login';
import menu from '@/locales/zh-CN/menu';

/**
 * Shared helpers for login-family component tests. The @umijs/max mock
 * factories import this module dynamically (vi.mock factories are hoisted
 * and cannot close over module scope).
 *
 * Only the shell-owned domain files are merged (not the zh-CN aggregate)
 * so parallel waves' WIP locale files cannot break these tests.
 */
const zhCN = { ...common, ...login, ...menu };

export interface MockMessageDescriptor {
  id: string;
  values?: Record<string, unknown>;
}

/** Locale-aware formatMessage backed by the real zh-CN bundle. */
export function zhFormatMessage({ id, values }: MockMessageDescriptor): string {
  const template = (zhCN as Record<string, string>)[id] ?? id;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) =>
    String(values?.[key] ?? ''),
  );
}

/** history mock shared shape (assert replace/push on it). */
export function makeHistoryMock(initialPath = '/user/login') {
  return {
    location: { pathname: initialPath, search: '', hash: '' },
    replace: vi.fn(),
    push: vi.fn(),
  };
}

/** services/tb mock surface used by the login family. */
export function makeServicesMock() {
  return {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPasswordByToken: vi.fn(),
    activate: vi.fn(),
    getUserPasswordPolicy: vi.fn(),
    logout: vi.fn(),
  };
}
