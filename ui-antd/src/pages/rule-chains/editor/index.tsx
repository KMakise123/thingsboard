/**
 * Rule-chain canvas editor page (route `/ruleChains/:ruleChainId`, M8 brief
 * §3 wave C). The editor IS the page (ui-ngx parity — no readonly face):
 * loads the chain entity + metadata, normalizes them into the
 * `CanvasRuleChain` draft (core/rulechain/model) and opens an EditorSession
 * over it as the baseline before rendering the canvas shell.
 *
 * Enter-once discipline mirrors the M7 dashboard editor: the draft must
 * survive react-query background refetches — a fresh server object never
 * resets the user's undo stack mid-edit. Exit lands on /ruleChains (the
 * list page arrives with wave 3 D); the PageContainer back guard owns the
 * dirty confirm via `dirty`.
 */

import { useQuery } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import { Alert, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import { metadataToCanvas } from '@/core/rulechain/model';
import type { CanvasRuleChain } from '@/core/rulechain/types';
import {
  getRuleChainById,
  getRuleChainMetaData,
} from '@/services/tb/rule-chain';

import { RuleChainEditorShell } from './shell';

export default function RuleChainsEditorPage() {
  const { ruleChainId } = useParams<{ ruleChainId: string }>();
  const { formatMessage } = useIntl();

  const chainQuery = useQuery({
    queryKey: ['ruleChain', ruleChainId],
    queryFn: () => getRuleChainById(ruleChainId as string),
    enabled: Boolean(ruleChainId),
    retry: false,
  });
  const metadataQuery = useQuery({
    queryKey: ['ruleChain', ruleChainId, 'metadata'],
    queryFn: () => getRuleChainMetaData(ruleChainId as string),
    enabled: Boolean(ruleChainId),
    retry: false,
  });

  const [session] = useState(() => new EditorSession<CanvasRuleChain>());
  // The PageContainer back arrow must honor the same dirty guard as the
  // toolbar exit (离开确认 dirty 判定同源): subscribing re-renders on edits.
  const { dirty } = useEditorSession(session);

  // Enter once per chain — see header comment.
  const [enteredId, setEnteredId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (
      chainQuery.data &&
      metadataQuery.data &&
      ruleChainId &&
      enteredId !== ruleChainId
    ) {
      session.enter(metadataToCanvas(metadataQuery.data, chainQuery.data));
      setEnteredId(ruleChainId);
    }
  }, [chainQuery.data, metadataQuery.data, ruleChainId, session, enteredId]);

  const entered = enteredId === ruleChainId;
  const loading = chainQuery.isPending || metadataQuery.isPending;
  const error = chainQuery.error ?? metadataQuery.error;

  return (
    <PageContainer
      breadcrumbLabel={chainQuery.data?.name}
      dirty={dirty}
      onBack={() => history.push('/ruleChains')}
    >
      {loading ? (
        <Spin
          style={{ display: 'block', margin: '64px auto' }}
          tip={formatMessage({
            id: 'editor.ruleChain.canvas.loading',
            defaultMessage: 'Loading rule chain…',
          })}
        >
          <div style={{ minHeight: 120 }} />
        </Spin>
      ) : error ? (
        <Alert type="error" showIcon message={serverErrorText(error)} />
      ) : entered ? (
        <RuleChainEditorShell session={session} />
      ) : null}
    </PageContainer>
  );
}
