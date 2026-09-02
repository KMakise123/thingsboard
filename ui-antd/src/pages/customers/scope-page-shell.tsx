/**
 * Shared wiring for the four customer-scope pages (users / devices /
 * assets / dashboards): the header shows the scope page name, the dynamic
 * breadcrumb leaf carries the customer's real title, and the back arrow
 * returns to the customer detail (routes stay flat siblings of
 * customers.detail, so the auto breadcrumb chain is [Customers → leaf]).
 */

import { useQuery } from '@tanstack/react-query';
import { history } from '@umijs/max';
import { Alert, Typography } from 'antd';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { getCustomerTitle } from '@/services/tb/customer';

/** The customer's title for header/breadcrumb use (plain-text endpoint). */
export function useCustomerScopeTitle(customerId?: string) {
  return useQuery({
    queryKey: ['customer', 'title', customerId],
    queryFn: () => getCustomerTitle(customerId as string),
    enabled: !!customerId,
    retry: false,
  });
}

export interface CustomerScopePageShellProps {
  customerId?: string;
  /** Resolved customer title; falls back to the raw id while loading. */
  customerTitle?: string;
  /** The scope page's own name (already formatted). */
  title: string;
  loadError?: unknown;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

export function CustomerScopePageShell({
  customerId,
  customerTitle,
  title,
  loadError,
  extra,
  children,
}: CustomerScopePageShellProps) {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={title}
      breadcrumbLabel={customerTitle ?? customerId}
      onBack={
        customerId ? () => history.push(`/customers/${customerId}`) : undefined
      }
      extra={extra}
      content={
        <>
          {loadError !== undefined && (
            <Alert
              type="warning"
              showIcon
              title={formatMessage({
                id: 'pages.customers.scope.loadTitleFailed',
                defaultMessage: 'Failed to load the customer title',
              })}
              description={serverErrorText(loadError)}
            />
          )}
          {customerTitle && (
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.customers.scope.customerLabel',
                defaultMessage: 'Customer',
              })}
              : {customerTitle}
            </Typography.Text>
          )}
        </>
      }
    >
      {children}
    </PageContainer>
  );
}
