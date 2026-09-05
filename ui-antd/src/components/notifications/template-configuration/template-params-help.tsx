/**
 * Per-type templatization help (M12 wave 3-B) — the "see documentation" link
 * + popup of ui-ngx notification-template-configuration (helpId → markdown),
 * flattened to a static bilingual reference (template-params-doc.ts).
 */

import { Button, Modal, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { NotificationType } from '@/types/tb/notification';
import {
  COMMON_TEMPLATE_PARAMS,
  notificationTypeNameKey,
  TEMPLATE_PARAMS_DOC,
  type TemplateParamDoc,
} from './template-params-doc';

export function TemplateParamsHelpButton({
  notificationType,
}: {
  notificationType: NotificationType;
}) {
  const { formatMessage, locale } = useIntl();
  const [open, setOpen] = useState(false);
  const isZh = locale.startsWith('zh');
  const describe = (param: TemplateParamDoc) => (isZh ? param.zh : param.en);

  const typeName = formatMessage({
    id: notificationTypeNameKey(notificationType),
    defaultMessage: notificationType,
  });

  return (
    <>
      <Button
        type="link"
        size="small"
        className="px-0"
        onClick={() => setOpen(true)}
        data-testid="template-params-help-open"
      >
        {formatMessage({
          id: 'pages.notifications.sent.templateConfig.seeDocumentation',
          defaultMessage: 'See documentation',
        })}
      </Button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={
          <Button onClick={() => setOpen(false)}>
            {formatMessage({
              id: 'pages.notifications.sent.templateConfig.helpClose',
              defaultMessage: 'Close',
            })}
          </Button>
        }
        width={720}
        title={formatMessage(
          {
            id: 'pages.notifications.sent.templateConfig.helpTitle',
            defaultMessage: 'Templatization parameters — {type}',
          },
          { type: typeName },
        )}
      >
        <div className="flex flex-col gap-4" data-testid="template-params-help">
          <p className="m-0">
            {formatMessage({
              id: 'pages.notifications.sent.templateConfig.templatizationHint',
              defaultMessage: 'Input fields support templatization.',
            })}
          </p>

          <section>
            <Typography.Text strong>
              {formatMessage({
                id: 'pages.notifications.sent.templateConfig.commonParamsTitle',
                defaultMessage: 'Parameters available for every type',
              })}
            </Typography.Text>
            <ParamList params={COMMON_TEMPLATE_PARAMS} describe={describe} />
          </section>

          {TEMPLATE_PARAMS_DOC[notificationType].length > 0 && (
            <section>
              <Typography.Text strong>{typeName}</Typography.Text>
              <ParamList
                params={TEMPLATE_PARAMS_DOC[notificationType]}
                describe={describe}
              />
            </section>
          )}

          <section>
            <Typography.Text strong>
              {formatMessage({
                id: 'pages.notifications.sent.templateConfig.modifiersTitle',
                defaultMessage: 'Value modifiers',
              })}
            </Typography.Text>
            <p className="mb-0 mt-1">
              {formatMessage({
                id: 'pages.notifications.sent.templateConfig.modifiersHint',
                defaultMessage:
                  'Parameter values support the upperCase / lowerCase / capitalize suffixes — append one to the parameter name:',
              })}{' '}
              {/* Example kept out of ICU strings — `${...}` trips both ICU
                  parsing and biome's noTemplateCurlyInString. */}
              <Tag>{`\${recipientFirstName:upperCase}`}</Tag>
            </p>
          </section>
        </div>
      </Modal>
    </>
  );
}

function ParamList({
  params,
  describe,
}: {
  params: Array<TemplateParamDoc>;
  describe: (param: TemplateParamDoc) => string;
}) {
  return (
    <ul className="mb-0 mt-1 list-disc pl-5">
      {params.map((param) => (
        <li key={param.name}>
          <Tag>{`$\{${param.name}}`}</Tag>
          <Typography.Text type="secondary">{describe(param)}</Typography.Text>
        </li>
      ))}
    </ul>
  );
}
