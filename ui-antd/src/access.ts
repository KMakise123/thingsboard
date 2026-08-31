/**
 * @see https://umijs.org/docs/max/access#access
 *
 * Scaffold-era placeholder. The real authority dictionary (SYS_ADMIN /
 * TENANT_ADMIN / CUSTOMER_USER) lands with the auth wave; every key returned
 * here must stay aligned with the `access` fields in config/routes.ts.
 */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  return {
    canAdmin: currentUser?.access === 'admin',
  };
}
