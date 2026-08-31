/**
 * src/services/tb — the TB REST transport layer.
 *
 * Contract for this directory:
 *   - Only exported functions + types. No hooks, no components, no cache.
 *   - Every call goes through ./http (tbHttp), the core/http seam.
 *   - Endpoints are pinned per-function in JSDoc comments; double-path
 *     endpoints always use the V2 shape; @Hidden endpoints follow the
 *     three-stage rule (banned deprecated → documented twin → registered
 *     exception, see the milestone report for the register).
 */

export * from './auth';
export * from './customer';
export * from './device';
export * from './attributes';
export { setTbLanguage, tbHttp } from './http';
