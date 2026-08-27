import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthenticatedUser } from './auth.ts';

export const userContext = new AsyncLocalStorage<AuthenticatedUser>();

export function getCurrentUser(): AuthenticatedUser | undefined {
  return userContext.getStore();
}
