/**
 * Domain-private batch-unassign flow for the M13 edge scope pages
 * (assets / devices / dashboards / entity-views / rule-chains /
 * customer-edges): confirm dialog -> visible batch fan-out -> clear
 * selection -> invalidate -> success toast, plus the shared
 * partial-failure warning. R26 keeps the page shells page-private; this
 * hook only collapses the entity-agnostic confirm+batch+toast wiring that
 * was pasted verbatim into all six pages. The cancel copy
 * (pages.edge.cancel) and the batch-result warning are identical across
 * the six, so they live here; the six differing text slots ride `texts`
 * (preset for the edge-scope five, preset for the customer-scope face).
 */
import { App } from 'antd';
import { useIntl } from 'react-intl';

import type { useBatchRun } from '@/components/shared/use-batch-run';

/** One locale message slot: intl id + English fallback (edge-locale shape). */
export interface EdgeUnassignMessage {
  id: string;
  defaultMessage: string;
}

/** The text slots that differ between the six pages. */
export interface EdgeUnassignTexts {
  titleOne: EdgeUnassignMessage;
  titleMany: EdgeUnassignMessage;
  textOne: EdgeUnassignMessage;
  textMany: EdgeUnassignMessage;
  okText: EdgeUnassignMessage;
  toastUnassigned: EdgeUnassignMessage;
}

/** Shared by the five edge-scope pages (pages.edge.scope.* keys). */
export const EDGE_SCOPE_UNASSIGN_TEXTS: EdgeUnassignTexts = {
  titleOne: {
    id: 'pages.edge.scope.unassignOneTitle',
    defaultMessage: "Are you sure you want to unassign '{name}' from the edge?",
  },
  titleMany: {
    id: 'pages.edge.scope.unassignManyTitle',
    defaultMessage:
      'Are you sure you want to unassign {count, plural, =1 {1 entity} other {# entities}} from the edge?',
  },
  textOne: {
    id: 'pages.edge.scope.unassignText',
    defaultMessage:
      'After the confirmation the entity will no longer belong to this edge.',
  },
  textMany: {
    id: 'pages.edge.scope.unassignManyText',
    defaultMessage:
      'After the confirmation the selected entities will no longer belong to this edge.',
  },
  okText: {
    id: 'pages.edge.scope.actionUnassign',
    defaultMessage: 'Unassign from edge',
  },
  toastUnassigned: {
    id: 'pages.edge.scope.toastUnassigned',
    defaultMessage: 'Entities unassigned from the edge.',
  },
};

/** customer-edges "delete = unassign" face (pages.edge.* customer wording). */
export const CUSTOMER_EDGE_UNASSIGN_TEXTS: EdgeUnassignTexts = {
  titleOne: {
    id: 'pages.edge.unassignTitle',
    defaultMessage: "Are you sure you want to unassign the edge '{name}'?",
  },
  titleMany: {
    id: 'pages.edge.customerEdges.unassignManyTitle',
    defaultMessage:
      'Are you sure you want to unassign {count, plural, =1 {1 edge} other {# edges}}?',
  },
  textOne: {
    id: 'pages.edge.unassignText',
    defaultMessage:
      'After the confirmation the edge will be unassigned and will not be accessible by the customer.',
  },
  textMany: {
    id: 'pages.edge.customerEdges.unassignManyText',
    defaultMessage:
      'After the confirmation the selected edges will be unassigned and will not be accessible by the customer.',
  },
  okText: {
    id: 'pages.edge.action.unassign',
    defaultMessage: 'Unassign from customer',
  },
  toastUnassigned: {
    id: 'pages.edge.toastUnassigned',
    defaultMessage: 'Edge unassigned from the customer.',
  },
};

interface EdgeUnassignOptions<T> {
  /** The page's shared batch runner (the assign flow reuses it). */
  batch: ReturnType<typeof useBatchRun>;
  /** Opens the BatchProgressModal (the page owns the open state). */
  openBatch: () => void;
  /** Clears the table selection once the run settles. */
  clearSelection: () => void;
  /** Refetches the page list. */
  invalidate: () => void;
  texts: EdgeUnassignTexts;
  /** Row label: single-entity confirm title and the failure keys. */
  labelOf: (entity: T) => string;
  /** The per-row unassign call. */
  unassignOne: (entity: T) => Promise<unknown>;
}

export function useEdgeUnassign<T>({
  batch,
  openBatch,
  clearSelection,
  invalidate,
  texts,
  labelOf,
  unassignOne,
}: EdgeUnassignOptions<T>): (targets: Array<T>) => void {
  const { message, modal } = App.useApp();
  const { formatMessage } = useIntl();

  return (targets) => {
    if (targets.length === 0) {
      return;
    }
    modal.confirm({
      title:
        targets.length === 1
          ? formatMessage(texts.titleOne, { name: labelOf(targets[0]) })
          : formatMessage(texts.titleMany, { count: targets.length }),
      content:
        targets.length === 1
          ? formatMessage(texts.textOne)
          : formatMessage(texts.textMany),
      okText: formatMessage(texts.okText),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        openBatch();
        const summary = await batch.run(targets, labelOf, unassignOne);
        clearSelection();
        void invalidate();
        void message.success(formatMessage(texts.toastUnassigned));
        if (summary.failed > 0) {
          void message.warning(
            formatMessage(
              {
                id: 'pages.edge.batchResult',
                defaultMessage: '{ok} succeeded, {fail} failed.',
              },
              { ok: summary.ok, fail: summary.failed },
            ),
          );
        }
      },
    });
  };
}
