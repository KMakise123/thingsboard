import { describe, expect, expectTypeOf, it } from 'vitest';
import type { DeviceCredentialsValue } from './device';
import { DeviceCredentialsType } from './device';
import type { PageData, PageLink } from './page';
import { emptyPageData, pageLinkToQueryParams } from './page';

describe('pageLinkToQueryParams', () => {
  it('serializes page and pageSize', () => {
    expect(pageLinkToQueryParams({ page: 0, pageSize: 10 })).toEqual({
      pageSize: 10,
      page: 0,
    });
  });

  it('trims textSearch and drops it when blank', () => {
    expect(
      pageLinkToQueryParams({ page: 2, pageSize: 20, textSearch: '  dev  ' }),
    ).toEqual({ pageSize: 20, page: 2, textSearch: 'dev' });
    expect(
      pageLinkToQueryParams({ page: 0, pageSize: 10, textSearch: '   ' }),
    ).toEqual({ pageSize: 10, page: 0 });
  });

  it('serializes explicit sort order', () => {
    expect(
      pageLinkToQueryParams({
        page: 0,
        pageSize: 10,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      }),
    ).toEqual({
      pageSize: 10,
      page: 0,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });
  });
});

describe('emptyPageData', () => {
  it('returns a zeroed envelope', () => {
    expect(emptyPageData<string>()).toEqual({
      data: [],
      totalPages: 0,
      totalElements: 0,
      hasNext: false,
    });
  });
});

describe('type contracts (compile-time)', () => {
  it('PageData is generic over rows', () => {
    expectTypeOf<PageData<number>>().toEqualTypeOf<{
      data: number[];
      totalPages: number;
      totalElements: number;
      hasNext: boolean;
    }>();
  });

  it('PageLink accepts optional sort', () => {
    expectTypeOf<PageLink>()
      .toHaveProperty('sortOrder')
      .toEqualTypeOf<PageLink['sortOrder']>();
  });

  it('credentials value discriminates on credentialsType', () => {
    const token: DeviceCredentialsValue = {
      credentialsType: DeviceCredentialsType.ACCESS_TOKEN,
      accessToken: 'abc',
    };
    const mqtt: DeviceCredentialsValue = {
      credentialsType: DeviceCredentialsType.MQTT_BASIC,
      mqttBasic: { clientId: 'c', userName: 'u', password: 'p' },
    };
    const x509: DeviceCredentialsValue = {
      credentialsType: DeviceCredentialsType.X509_CERTIFICATE,
      certPem: '-----BEGIN',
    };
    expectTypeOf(token).not.toBeNever();
    expectTypeOf(mqtt).not.toBeNever();
    expectTypeOf(x509).not.toBeNever();
    // Discriminated union narrows:
    if (token.credentialsType === DeviceCredentialsType.ACCESS_TOKEN) {
      expectTypeOf(token.accessToken).toEqualTypeOf<string>();
    }
  });
});
