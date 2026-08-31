/**
 * Local dev proxy to the ThingsBoard backend (default localhost:8080).
 *
 * ORDER MATTERS: `/api/ws` must stay ABOVE `/api`. http-proxy-middleware
 * matches top to bottom, so the broader `/api` entry would otherwise
 * swallow the WebSocket upgrade for `/api/ws`.
 *
 * The proxy only applies to `max dev`; production serving is handled by the
 * ThingsBoard backend itself (one-step switch, see docs/spec).
 *
 * @doc https://umijs.org/docs/guides/proxy
 */
const TB_BACKEND = process.env.TB_PROXY_TARGET || 'http://localhost:8080';

export default {
  dev: {
    '/api/ws': {
      target: TB_BACKEND.replace('http', 'ws'),
      ws: true,
      changeOrigin: true,
    },
    '/api': {
      target: TB_BACKEND,
      changeOrigin: true,
    },
    '/oauth2': {
      target: TB_BACKEND,
      changeOrigin: true,
    },
    '/login/oauth2': {
      target: TB_BACKEND,
      changeOrigin: true,
    },
  },
};
