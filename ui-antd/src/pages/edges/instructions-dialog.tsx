/**
 * Edge install / upgrade instructions dialog (R07, spec §5.2; ui-ngx
 * edge-instructions-dialog parity).
 *
 * Three title states share one component:
 *  - afterAdd: auto-opened after creating an edge (carries the "do not
 *    show again" checkbox → close writes the
 *    notDisplayInstructionsAfterAddEdge user preference, PUT /api/user/settings);
 *  - open: manually opened install instructions (wave-4 detail button);
 *  - upgrade: upgrade guides — the caller supplies edgeVersion (read from
 *    the edge's SERVER_SCOPE edgeVersion attribute) and the dialog fetches
 *    the upgrade flavor instead.
 *
 * Content is backend-built markdown fetched per method (Docker / Ubuntu /
 * CentOS-RHEL). The react-query session cache (staleTime Infinity, no
 * retry) is the per-method content cache — revisiting a tab hits it
 * instantly. Wave 3 wires the list page's install flows; the detail-page
 * entries ride wave 4.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Checkbox, Modal, Spin, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  getEdgeInstructionsInstall,
  getEdgeInstructionsUpgrade,
  putUserSettings,
} from '@/services/tb/edge';
import type { EdgeInfo, EdgeInstructionsMethod } from '@/types/tb/edge';

import { renderInstructionsMarkdown } from './instructions-markdown';

export type EdgeInstructionsDialogMode = 'afterAdd' | 'open' | 'upgrade';

export interface EdgeInstructionsDialogProps {
  open: boolean;
  /** Structural minimum (the dialog only reads the id) — accepts Edge, EdgeInfo or a fresh create response. */
  edge: Pick<EdgeInfo, 'id'> | null;
  mode: EdgeInstructionsDialogMode;
  /** Upgrade guides need the edge's SERVER_SCOPE edgeVersion attribute. */
  edgeVersion?: string;
  onClose: () => void;
}

const METHODS: Array<{
  key: EdgeInstructionsMethod;
  labelId: string;
  defaultMessage: string;
}> = [
  {
    key: 'docker',
    labelId: 'pages.edge.instructions.methodDocker',
    defaultMessage: 'Docker',
  },
  {
    key: 'ubuntu',
    labelId: 'pages.edge.instructions.methodUbuntu',
    defaultMessage: 'Ubuntu',
  },
  {
    key: 'centos',
    labelId: 'pages.edge.instructions.methodCentos',
    defaultMessage: 'CentOS-RHEL',
  },
];

export function EdgeInstructionsDialog({
  open,
  edge,
  mode,
  edgeVersion,
  onClose,
}: EdgeInstructionsDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [activeMethod, setActiveMethod] = useState<EdgeInstructionsMethod>(
    METHODS[0].key,
  );
  const [notShowAgain, setNotShowAgain] = useState(false);

  // Reset per open cycle (the consumers toggle `open`; the target/mode never
  // change while the dialog stays open).
  useEffect(() => {
    if (open) {
      setActiveMethod(METHODS[0].key);
      setNotShowAgain(false);
    }
  }, [open]);

  const showDontShowAgain = mode === 'afterAdd';
  const titleId =
    mode === 'afterAdd'
      ? 'pages.edge.instructions.titleAfterAdd'
      : mode === 'upgrade'
        ? 'pages.edge.instructions.titleUpgrade'
        : 'pages.edge.instructions.titleInstall';

  const instructionsQuery = useQuery({
    queryKey: [
      'edge',
      'instructions',
      mode,
      edge?.id.id ?? null,
      edgeVersion ?? null,
      activeMethod,
    ],
    enabled: open && !!edge,
    staleTime: Infinity,
    retry: false,
    queryFn: () => {
      if (mode === 'upgrade' && edgeVersion) {
        return getEdgeInstructionsUpgrade(edgeVersion, activeMethod);
      }
      return getEdgeInstructionsInstall(edge?.id.id as string, activeMethod);
    },
  });

  const close = () => {
    if (notShowAgain && showDontShowAgain) {
      putUserSettings({ notDisplayInstructionsAfterAddEdge: true })
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ['user', 'settings'] }),
        )
        .catch((error) => {
          void message.error(serverErrorText(error));
        });
    }
    onClose();
  };

  const instructions = instructionsQuery.data?.instructions;

  return (
    <Modal
      open={open}
      title={formatMessage({ id: titleId, defaultMessage: titleId })}
      width={760}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-between gap-3">
          {showDontShowAgain ? (
            <Checkbox
              checked={notShowAgain}
              onChange={(event) => setNotShowAgain(event.target.checked)}
              data-testid="edge-instructions-dont-show"
            >
              {formatMessage({
                id: 'pages.edge.instructions.dontShowAgain',
                defaultMessage: 'Do not show again',
              })}
            </Checkbox>
          ) : (
            <span />
          )}
          <Button onClick={close}>
            {formatMessage({ id: 'pages.edge.close', defaultMessage: 'Close' })}
          </Button>
        </div>
      }
      onCancel={close}
    >
      {edge ? (
        <Tabs
          activeKey={activeMethod}
          onChange={(key) => setActiveMethod(key as EdgeInstructionsMethod)}
          items={METHODS.map((method) => ({
            key: method.key,
            label: formatMessage({
              id: method.labelId,
              defaultMessage: method.defaultMessage,
            }),
            children:
              method.key === activeMethod ? (
                <div
                  className="max-h-[60vh] overflow-auto"
                  data-testid={`edge-instructions-${method.key}`}
                >
                  {instructionsQuery.isPending ? (
                    <div className="flex flex-col items-center gap-3 py-10">
                      <Spin />
                      <span>
                        {formatMessage({
                          id: 'pages.edge.instructions.loading',
                          defaultMessage: 'Loading edge instructions…',
                        })}
                      </span>
                    </div>
                  ) : instructionsQuery.isError ? (
                    <Alert
                      type="error"
                      showIcon
                      title={formatMessage({
                        id: 'pages.edge.instructions.loadFailed',
                        defaultMessage: 'Failed to load instructions',
                      })}
                      description={serverErrorText(instructionsQuery.error)}
                    />
                  ) : (
                    <div className="flex flex-col gap-1">
                      {instructions !== undefined
                        ? renderInstructionsMarkdown(instructions)
                        : null}
                    </div>
                  )}
                </div>
              ) : null,
          }))}
        />
      ) : null}
    </Modal>
  );
}
