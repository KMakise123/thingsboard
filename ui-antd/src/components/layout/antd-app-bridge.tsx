import { useIntl } from '@umijs/max';
import { App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import React, { useEffect } from 'react';

/**
 * Bridge between the antd `App` context (mounted by umi's antd plugin as an
 * innerProvider, i.e. INSIDE the route tree) and module-scope consumers
 * such as the react-query global error sink. ADR 0007: message APIs must
 * come from the App context — static antd methods are banned — so the only
 * way to reach them outside React is to capture them from a component
 * rendered inside the tree. Render <AntdAppBridge /> from the layout's
 * childrenRender.
 */
export interface AppBridgeApi {
  message: MessageInstance;
  formatMessage: (id: string) => string;
}

let bridgeApi: AppBridgeApi | null = null;

/** Latest captured bridge (null outside a mounted layout). */
export function getAppBridge(): AppBridgeApi | null {
  return bridgeApi;
}

export const AntdAppBridge: React.FC = () => {
  const { message } = App.useApp();
  const { formatMessage } = useIntl();

  useEffect(() => {
    bridgeApi = {
      message,
      formatMessage: (id: string) => formatMessage({ id }),
    };
    return () => {
      bridgeApi = null;
    };
  }, [message, formatMessage]);

  return null;
};
