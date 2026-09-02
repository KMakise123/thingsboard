/**
 * PageContainer thin wrapper — the M2 page-header shape (ADR 0008).
 *
 * One place owns the header semantics so the per-page surface stays
 * declarative:
 * - title: explicit prop wins; otherwise the leaf route's `name` resolves
 *   `menu.<name>` i18n — the same source the side menu uses.
 * - breadcrumb: parents come from the route tree (menu names), the leaf
 *   shows the page's real name. Detail pages pass `breadcrumbLabel` (the
 *   entity name, with the same `entity?.name ?? id` fallback the header
 *   title uses) so the dynamic segment resolves in the same frame — no
 *   store indirection needed at page level. Because detail/scope routes are
 *   flat siblings of their list route in config/routes.ts, matchRoutes does
 *   not include the parent — the chain is rebuilt from the leaf name's dot
 *   prefixes ('devices.detail' → 'devices') against a name→route index of
 *   the route tree.
 * - back guard: pages pass `dirty`; the wrapper confirms before invoking
 *   `onBack` (M1 defect 9f08ee3d9f, behavior红线 ADR 0008).
 * - pro token: declared once in config/defaultSettings.ts, derived from
 *   src/theme/brand — never per page (ADR 0008).
 *
 * ProLayout's own breadcrumb pipeline is switched off at the shell
 * (`breadcrumbRender: false` in src/app.tsx): its RouteContext props would
 * override per-page breadcrumb values, and it evaluates during the shell's
 * render — before a page can supply the entity name.
 */

import type { PageContainerProps } from '@ant-design/pro-components';
import { PageContainer as ProPageContainer } from '@ant-design/pro-components';
import { history, useAppData, useSelectedRoutes } from '@umijs/max';
import { App } from 'antd';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

/** A crumb as pro's PageHeader consumes it (array from breadcrumbRender). */
export interface BreadcrumbItem {
  title: string;
  /** SPA href; the leaf has none (not clickable). */
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

/** Minimal shape of umi's matched-route entries the wrapper relies on. */
interface MatchedRouteLike {
  route: { name?: string };
  pathname: string;
}

/** Minimal shape of a route-tree node for the name index. */
interface RouteNodeLike {
  name?: string;
  path?: string;
  routes?: Array<RouteNodeLike>;
}

export interface TbPageContainerProps
  extends Omit<
    PageContainerProps,
    'breadcrumb' | 'breadcrumbRender' | 'onBack'
  > {
  /**
   * Leaf breadcrumb label (the page's real name, e.g. the entity title).
   * Falls back to the leaf route's menu label while absent.
   */
  breadcrumbLabel?: string;
  /**
   * Raw back navigation. When `dirty` is set, the wrapper routes it through
   * an unsaved-changes confirmation first — pages never hand-roll the guard.
   */
  onBack?: () => void;
  /** Unsaved-changes flag driving the back guard. */
  dirty?: boolean;
}

/** Resolve `menu.<name>` with a readable fallback when a key is missing. */
export function menuLabelFor(
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
  name: string,
): string {
  return formatMessage({
    id: `menu.${name}`,
    defaultMessage: name,
  });
}

/** Flatten the route tree into a name→route index (parents for crumbs). */
export function indexRoutesByName(
  routeNodes: Array<RouteNodeLike> | undefined,
  index: Map<string, RouteNodeLike> = new Map(),
): Map<string, RouteNodeLike> {
  for (const node of routeNodes ?? []) {
    if (node.name && !index.has(node.name)) {
      index.set(node.name, node);
    }
    if (node.routes) {
      indexRoutesByName(node.routes, index);
    }
  }
  return index;
}

/**
 * Breadcrumb rule (single place, ADR 0008): parents from the route tree
 * (the leaf route's dot-prefix names: `devices.detail` → `devices`),
 * leaf from the page's real name. Chains shorter than two entries render
 * nothing (a lone, unclickable label is noise — same choice pro's
 * minLength=2 makes).
 */
export function buildBreadcrumbItems(
  matches: Array<MatchedRouteLike>,
  routeIndex: Map<string, RouteNodeLike>,
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
  breadcrumbLabel?: string,
): Array<BreadcrumbItem> {
  const leaf = matches.filter((match) => match.route.name).at(-1);
  if (!leaf?.route.name) {
    return [];
  }
  const segments = leaf.route.name.split('.');
  const items: Array<BreadcrumbItem> = [];
  for (let i = 1; i < segments.length; i++) {
    const ancestorName = segments.slice(0, i).join('.');
    const ancestor = routeIndex.get(ancestorName);
    if (!ancestor?.path) {
      continue;
    }
    const path = ancestor.path;
    items.push({
      title: menuLabelFor(formatMessage, ancestorName),
      href: path,
      onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        history.push(path);
      },
    });
  }
  items.push({
    title: breadcrumbLabel ?? menuLabelFor(formatMessage, leaf.route.name),
  });
  return items;
}

export default function PageContainer({
  breadcrumbLabel,
  onBack,
  dirty = false,
  ...rest
}: TbPageContainerProps) {
  const { formatMessage } = useIntl();
  const { modal } = App.useApp();
  const matches = useSelectedRoutes() as Array<MatchedRouteLike>;
  const { clientRoutes } = useAppData() as {
    clientRoutes?: Array<RouteNodeLike>;
  };

  const crumbItems = buildBreadcrumbItems(
    matches,
    indexRoutesByName(clientRoutes),
    formatMessage,
    breadcrumbLabel,
  );

  // The leaf title mirrors the breadcrumb: explicit prop, then menu i18n.
  const leafName = matches.filter((match) => match.route.name).at(-1)
    ?.route.name;
  const resolvedTitle =
    rest.title ??
    (leafName ? menuLabelFor(formatMessage, leafName) : undefined);

  const confirmLeave = useCallback(
    (after: () => void) => {
      modal.confirm({
        title: formatMessage({
          id: 'pages.common.unsavedTitle',
          defaultMessage: 'Unsaved changes',
        }),
        content: formatMessage({
          id: 'pages.common.unsavedText',
          defaultMessage:
            'You have unsaved changes. Leave anyway? Changes will be lost.',
        }),
        okText: formatMessage({
          id: 'pages.common.unsavedLeave',
          defaultMessage: 'Leave',
        }),
        cancelText: formatMessage({
          id: 'pages.common.cancel',
          defaultMessage: 'Cancel',
        }),
        okButtonProps: { danger: true },
        onOk: after,
      });
    },
    [formatMessage, modal],
  );

  const guardedBack = useCallback(() => {
    if (!onBack) {
      return;
    }
    if (dirty) {
      confirmLeave(onBack);
      return;
    }
    onBack();
  }, [onBack, dirty, confirmLeave]);

  return (
    <ProPageContainer
      {...rest}
      title={resolvedTitle}
      onBack={onBack ? guardedBack : undefined}
      // pro's PageHeader renders a returned array of {title, href, onClick}
      // as an antd Breadcrumb inside the page header; an empty array (short
      // chains) renders nothing. The type is ReactNode-wide, hence the cast.
      breadcrumbRender={
        (() =>
          crumbItems.length >= 2
            ? crumbItems
            : []) as PageContainerProps['breadcrumbRender']
      }
    />
  );
}
