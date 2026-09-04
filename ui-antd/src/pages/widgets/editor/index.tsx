/**
 * Widget editor page (routes `/widgets/editor` + `/widgets/editor/:widgetTypeId`,
 * M9 brief §3 wave S item 4).
 *
 * - With :widgetTypeId: `getWidgetTypeById` loads the WidgetTypeDetails
 *   (the brief's wave-1 erratum: the fqn endpoint returns the BASE entity,
 *   so the editor loads by id), `widgetTypeToDraft` converts it and an
 *   EditorSession opens over the doc as the baseline before the shell
 *   renders. A descriptor without `runtime: 'react-1'` is a legacy Angular
 *   type — its source cannot be edited here (honest placeholder; the
 *   restricted-derivation entry ships with the derive dialog, wave-3 D).
 * - Without :widgetTypeId (the create entry): the new-type dialog opens
 *   through the DialogHost single slot; its confirm delivers a starter
 *   draft (wave-3 D) and the page enters the session over it in place.
 *   After the FIRST save the URL is replaced with /widgets/editor/:id
 *   (the session is already re-anchored, so no re-enter — the undo stack
 *   survives).
 *
 * Enter-once discipline mirrors the M8 rule-chain editor: react-query
 * background refetches never reset the undo stack mid-edit. The PageContainer
 * back guard owns the dirty confirm via `dirty` (same-source leave guard).
 */

import { useQuery } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import { Alert, Button, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import { getWidgetTypeById } from '@/services/tb/widget-type';
import { DialogHost, useWidgetEditorDialogs } from './dialog-host';
import { type WidgetEditorDoc, widgetTypeToDraft } from './draft-convert';
import type { NewWidgetDialogPayload } from './new-dialog';
import { WidgetEditorShell } from './shell';

export default function WidgetsEditorPage() {
  const { widgetTypeId } = useParams<{ widgetTypeId: string }>();
  const { formatMessage } = useIntl();

  const [session] = useState(() => new EditorSession<WidgetEditorDoc>());
  // The PageContainer back arrow must honor the same dirty guard as the
  // toolbar exit (离开确认 dirty 判定同源): subscribing re-renders on edits.
  const { dirty } = useEditorSession(session);

  const typeQuery = useQuery({
    queryKey: ['widgetType', widgetTypeId],
    queryFn: () => getWidgetTypeById(widgetTypeId as string),
    enabled: Boolean(widgetTypeId),
    retry: false,
  });

  const dialogs = useWidgetEditorDialogs();

  // Enter once per route id; the CREATE sentinel ('') marks the create
  // route, entered in place via the new-dialog confirm (wave-3 D: the
  // starter/derived doc becomes the session baseline without a URL id).
  const [enteredId, setEnteredId] = useState<string | undefined>(undefined);
  const handleNewConfirm = (doc: WidgetEditorDoc) => {
    session.enter(doc);
    setEnteredId('');
    dialogs.closeDialog();
  };
  const newDialogPayload: NewWidgetDialogPayload = {
    onConfirm: handleNewConfirm,
  };

  // Create entry: open the new-type dialog once on mount (single DialogHost
  // slot; the 新建 widget button re-opens it after a close).
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design — dialogs is stable and the dialog must not re-open on re-render.
  useEffect(() => {
    if (!widgetTypeId) {
      dialogs.openDialog('new', newDialogPayload);
    }
  }, []);

  useEffect(() => {
    const details = typeQuery.data;
    if (details && widgetTypeId && enteredId !== widgetTypeId) {
      session.enter(widgetTypeToDraft(details));
      setEnteredId(widgetTypeId);
    }
  }, [typeQuery.data, widgetTypeId, enteredId, session]);

  const entered = enteredId !== undefined && enteredId === (widgetTypeId ?? '');
  const enteredDoc = entered ? session.current : null;
  // Angular marker = descriptor without `runtime: 'react-1'` (ADR 0004 §4),
  // read from the loaded wire entity (the conversion absorbs runtime away).
  // The create route has no loaded entity — never the Angular placeholder.
  const isAngularType =
    entered !== null &&
    entered &&
    typeQuery.data !== undefined &&
    typeQuery.data.descriptor?.runtime !== 'react-1';

  const handleSaved = (saved: { id?: { id: string } }) => {
    const savedId = saved.id?.id;
    if (savedId && savedId !== widgetTypeId) {
      // first save of an unsaved new type: adopt the URL without
      // re-entering (session.save already re-anchored the draft)
      setEnteredId(savedId);
      history.replace(`/widgets/editor/${savedId}`);
    }
  };

  return (
    <PageContainer
      breadcrumbLabel={enteredDoc?.name}
      dirty={dirty}
      onBack={() => history.push('/dashboards')}
    >
      {!widgetTypeId && !enteredDoc ? (
        <div
          data-testid="we-create-entry"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            maxWidth: 560,
          }}
        >
          <Alert
            type="info"
            showIcon
            message={formatMessage({
              id: 'editor.widget.editor.createEntryTitle',
              defaultMessage: 'Widget editor',
            })}
            description={formatMessage({
              id: 'editor.widget.editor.createEmptyText',
              defaultMessage: 'Enter from a dashboard or the widget library.',
            })}
            action={
              <Button
                size="small"
                data-testid="we-create-open"
                onClick={() => dialogs.openDialog('new', newDialogPayload)}
              >
                {formatMessage({
                  id: 'editor.widget.editor.createOpen',
                  defaultMessage: 'New widget',
                })}
              </Button>
            }
          />
          <DialogHost controller={dialogs} />
        </div>
      ) : widgetTypeId && typeQuery.isPending ? (
        <Spin
          style={{ display: 'block', margin: '64px auto' }}
          tip={formatMessage({
            id: 'editor.widget.editor.loading',
            defaultMessage: 'Loading widget type…',
          })}
        >
          <div style={{ minHeight: 120 }} />
        </Spin>
      ) : typeQuery.error ? (
        <Alert
          type="error"
          showIcon
          message={serverErrorText(typeQuery.error)}
        />
      ) : entered && enteredDoc ? (
        isAngularType ? (
          <Alert
            type="warning"
            showIcon
            data-testid="we-angular-type"
            message={formatMessage({
              id: 'editor.widget.editor.angularType',
              defaultMessage:
                'This type is an Angular widget; its source cannot be edited here.',
            })}
            description={formatMessage({
              id: 'editor.widget.editor.angularTypeDerive',
              defaultMessage:
                'The restricted-derivation entry ships with the derive dialog.',
            })}
          />
        ) : (
          <WidgetEditorShell session={session} onSaved={handleSaved} />
        )
      ) : null}
    </PageContainer>
  );
}
