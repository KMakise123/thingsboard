/**
 * OAuth2 clients + login domains transport (handwritten) — settings domain
 * (spec 3.7). Endpoints (OAuth2Controller.java, DomainController.java):
 *
 *   POST   /api/oauth2/client               (SA, TA) → Oauth2Client
 *   GET    /api/oauth2/client/infos         (SA, TA) → PageData<Oauth2ClientInfo>
 *   GET    /api/oauth2/client/{id}          (SA, TA) → Oauth2Client
 *   DELETE /api/oauth2/client/{id}          (SA, TA) → void
 *   GET    /api/oauth2/config/template      (SA, TA) → Oauth2ClientRegistrationTemplate[]
 *   GET    /api/oauth2/loginProcessingUrl   (SA, TA) → string (path suffix)
 *
 *   POST   /api/domain?oauth2ClientIds=a,b  (SA)     → Domain
 *   PUT    /api/domain/{id}/oauth2Clients   (SA)     → void (body = UUID[])
 *   GET    /api/domain/infos                (SA)     → PageData<DomainInfo>
 *   GET    /api/domain/info/{id}            (SA)     → DomainInfo
 *   DELETE /api/domain/{id}                 (SA)     → void
 */

import type {
  Domain,
  DomainInfo,
  Oauth2Client,
  Oauth2ClientInfo,
  Oauth2ClientRegistrationTemplate,
} from '@/types/tb/oauth2';
import type { PageData, PageLink } from '@/types/tb/page';

import { tbHttp } from './http';

function pageQuery(pageLink: PageLink) {
  return {
    pageSize: pageLink.pageSize,
    page: pageLink.page,
    textSearch: pageLink.textSearch,
    sortProperty: pageLink.sortOrder?.property,
    sortOrder: pageLink.sortOrder?.direction,
  };
}

/** Create or update an OAuth2 client (id absent = create). */
export async function saveOauth2Client(
  client: Oauth2Client,
): Promise<Oauth2Client> {
  return tbHttp.post<Oauth2Client>('/api/oauth2/client', client);
}

/** Paged client list for the clients table. */
export async function getOauth2ClientInfos(
  pageLink: PageLink,
): Promise<PageData<Oauth2ClientInfo>> {
  return tbHttp.get<PageData<Oauth2ClientInfo>>(
    '/api/oauth2/client/infos',
    pageQuery(pageLink),
  );
}

/** Full client body for the edit dialog. */
export async function getOauth2ClientById(id: string): Promise<Oauth2Client> {
  return tbHttp.get<Oauth2Client>(`/api/oauth2/client/${id}`);
}

export async function deleteOauth2Client(id: string): Promise<void> {
  await tbHttp.delete(`/api/oauth2/client/${id}`);
}

/** Provider presets (Google, Github, Apple, Microsoft...) for the template select. */
export async function getOauth2ClientTemplates(): Promise<
  Oauth2ClientRegistrationTemplate[]
> {
  return tbHttp.get<Oauth2ClientRegistrationTemplate[]>(
    '/api/oauth2/config/template',
  );
}

/** Path suffix the provider redirects back to (no host prefix). */
export async function getOauth2LoginProcessingUrl(): Promise<string> {
  return tbHttp.get<string>('/api/oauth2/loginProcessingUrl');
}

/**
 * Create or update a domain. On create the attached client ids ride the
 * query string (`?oauth2ClientIds=`); on update the client set is a
 * separate PUT (ui-ngx domain-table-config split, kept verbatim).
 */
export async function saveDomain(
  domain: Domain,
  oauth2ClientIds?: string[],
): Promise<Domain> {
  const query =
    oauth2ClientIds && oauth2ClientIds.length > 0
      ? { oauth2ClientIds: oauth2ClientIds.join(',') }
      : undefined;
  return tbHttp.post<Domain>('/api/domain', domain, query);
}

/** Replace the client set attached to an existing domain. */
export async function updateDomainOauth2Clients(
  id: string,
  oauth2ClientIds: string[],
): Promise<void> {
  await tbHttp.put(`/api/domain/${id}/oauth2Clients`, oauth2ClientIds);
}

export async function getDomainInfos(
  pageLink: PageLink,
): Promise<PageData<DomainInfo>> {
  return tbHttp.get<PageData<DomainInfo>>(
    '/api/domain/infos',
    pageQuery(pageLink),
  );
}

export async function getDomainInfoById(id: string): Promise<DomainInfo> {
  return tbHttp.get<DomainInfo>(`/api/domain/info/${id}`);
}

export async function deleteDomain(id: string): Promise<void> {
  await tbHttp.delete(`/api/domain/${id}`);
}
