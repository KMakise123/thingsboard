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
export * from './asset';
export * from './customer';
export * from './dashboard';
export * from './device';
export * from './entity-view';
export * from './rule-chain';
export * from './user';
export * from './widget-type';
export * from './version-control';
export * from './attributes';
export * from './alarm-rules';
export * from './calculated-fields';
export { setTbLanguage, setTbUnauthorizedHandler, tbHttp } from './http';
