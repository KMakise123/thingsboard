/**
 * User-list URL state (page-local facade).
 *
 * The implementation moved to the shared UsersTable host
 * (src/components/users/url-state.ts) during the M3 componentization; this
 * re-export keeps the import paths of the page tests stable.
 */
export * from '@/components/users/url-state';
