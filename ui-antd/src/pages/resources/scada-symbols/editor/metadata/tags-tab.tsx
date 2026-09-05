/**
 * Tags tab (M11 wave-2D) — per-canvas-tag configuration rows:
 * stateRenderFunction + click action function (CodeMirror) and delete
 * (ui-ngx metadata-tags component parity, simplified to a flat list).
 * Canvas tags without a configuration row offer an add button.
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Form, Input, Space } from 'antd';
import { useIntl } from 'react-intl';

import { CodeEditor } from '@/components/code-editor';
import type {
  ScadaSymbolMetadata,
  ScadaSymbolTag,
} from '@/core/scada/symbol-metadata';

export interface TagsTabProps {
  metadata: ScadaSymbolMetadata;
  onChange: (part: Partial<ScadaSymbolMetadata>) => void;
  canvasTags: string[];
  disabled: boolean;
}

const setTag = (
  tags: ScadaSymbolTag[],
  index: number,
  part: Partial<ScadaSymbolTag>,
) => tags.map((tag, i) => (i === index ? { ...tag, ...part } : tag));

export function TagsTab({
  metadata,
  onChange,
  canvasTags,
  disabled,
}: TagsTabProps) {
  const { formatMessage } = useIntl();
  const tags = metadata.tags ?? [];
  const configured = new Set(tags.map((t) => t.tag));
  const available = canvasTags.filter((tag) => !configured.has(tag));

  const addTag = (tag: string) => onChange({ tags: [...tags, { tag }] });

  const removeTag = (index: number) =>
    onChange({ tags: tags.filter((_, i) => i !== index) });

  const patchTag = (index: number, part: Partial<ScadaSymbolTag>) =>
    onChange({ tags: setTag(tags, index, part) });

  const setClickAction = (index: number, actionFunction: string) => {
    const current = tags[index];
    const actions = { ...current.actions };
    if (actionFunction) {
      actions.click = { ...actions.click, actionFunction };
    } else {
      delete actions.click;
    }
    patchTag(index, {
      actions: Object.keys(actions).length ? actions : undefined,
    });
  };

  return (
    <div
      data-testid="scada-tags-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {available.length > 0 && !disabled ? (
        <Space wrap>
          {available.map((tag) => (
            <Button
              key={tag}
              icon={<PlusOutlined />}
              onClick={() => addTag(tag)}
              data-testid={`scada-tags-add-${tag}`}
            >
              {tag}
            </Button>
          ))}
        </Space>
      ) : null}
      {tags.length === 0 ? (
        <Empty
          description={formatMessage({
            id: 'pages.resources.scadaSymbolEditor.tags.empty',
            defaultMessage:
              'No tags yet. Hover an element on the canvas to add one.',
          })}
        />
      ) : (
        tags.map((tag, index) => (
          <Card
            key={tag.tag}
            size="small"
            title={tag.tag}
            extra={
              !disabled ? (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeTag(index)}
                  data-testid={`scada-tags-delete-${tag.tag}`}
                  aria-label={formatMessage({
                    id: 'pages.resources.scadaSymbolEditor.tags.delete',
                    defaultMessage: 'Delete tag',
                  })}
                />
              ) : null
            }
          >
            <Form layout="vertical" disabled={disabled}>
              <Form.Item
                label={formatMessage({
                  id: 'pages.resources.scadaSymbolEditor.tags.stateRenderFunction',
                  defaultMessage: 'State render function',
                })}
              >
                <CodeEditor
                  value={tag.stateRenderFunction ?? ''}
                  language="javascript"
                  height="120px"
                  readOnly={disabled}
                  onChange={(value) =>
                    patchTag(index, { stateRenderFunction: value })
                  }
                  data-testid={`scada-tags-render-${tag.tag}`}
                />
              </Form.Item>
              <Form.Item
                label={formatMessage({
                  id: 'pages.resources.scadaSymbolEditor.tags.clickAction',
                  defaultMessage: 'Click action function',
                })}
              >
                <CodeEditor
                  value={tag.actions?.click?.actionFunction ?? ''}
                  language="javascript"
                  height="120px"
                  readOnly={disabled}
                  onChange={(value) => setClickAction(index, value)}
                  data-testid={`scada-tags-click-${tag.tag}`}
                />
              </Form.Item>
              <Form.Item label="id">
                <Input
                  value={tag.tag}
                  disabled
                  data-testid={`scada-tags-name-${tag.tag}`}
                />
              </Form.Item>
            </Form>
          </Card>
        ))
      )}
    </div>
  );
}

export default TagsTab;
