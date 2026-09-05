/**
 * General tab (M11 wave-2D) — title/description/searchTags/widgetSizeX/Y
 * with the 1-24 cell-size validation (ui-ngx metadata form parity). Field
 * errors render inline; the hard gate lives in `isMetadataValid`.
 */
import { Col, Form, Input, InputNumber, Row, Select } from 'antd';
import { useIntl } from 'react-intl';

import type { ScadaSymbolMetadata } from '@/core/scada/symbol-metadata';

import { MAX_WIDGET_SIZE, MIN_WIDGET_SIZE } from './metadata-valid';

export interface GeneralTabProps {
  metadata: ScadaSymbolMetadata;
  onChange: (part: Partial<ScadaSymbolMetadata>) => void;
  disabled: boolean;
}

const labelStyle = {
  labelCol: { span: 24 } as const,
  layout: 'vertical' as const,
};

export function GeneralTab({ metadata, onChange, disabled }: GeneralTabProps) {
  const { formatMessage } = useIntl();
  const titleError = !metadata.title?.trim();
  const sizeXError =
    metadata.widgetSizeX < MIN_WIDGET_SIZE ||
    metadata.widgetSizeX > MAX_WIDGET_SIZE;
  const sizeYError =
    metadata.widgetSizeY < MIN_WIDGET_SIZE ||
    metadata.widgetSizeY > MAX_WIDGET_SIZE;

  return (
    <Form disabled={disabled} {...labelStyle} data-testid="scada-general-tab">
      <Form.Item
        required
        validateStatus={titleError ? 'error' : undefined}
        help={
          titleError
            ? formatMessage({
                id: 'pages.resources.scadaSymbolEditor.general.titleRequired',
                defaultMessage: 'Title is required',
              })
            : undefined
        }
        label={formatMessage({
          id: 'pages.resources.scadaSymbolEditor.general.title',
          defaultMessage: 'Title',
        })}
      >
        <Input
          value={metadata.title}
          disabled={disabled}
          data-testid="scada-general-title"
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Form.Item>
      <Form.Item
        label={formatMessage({
          id: 'pages.resources.scadaSymbolEditor.general.description',
          defaultMessage: 'Description',
        })}
      >
        <Input.TextArea
          value={metadata.description}
          disabled={disabled}
          data-testid="scada-general-description"
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Form.Item>
      <Form.Item
        label={formatMessage({
          id: 'pages.resources.scadaSymbolEditor.general.searchTags',
          defaultMessage: 'Search tags',
        })}
      >
        <Select
          mode="tags"
          value={metadata.searchTags}
          disabled={disabled}
          open={false}
          tokenSeparators={[',']}
          placeholder={formatMessage({
            id: 'pages.resources.scadaSymbolEditor.general.searchTagsPlaceholder',
            defaultMessage: 'Type and press Enter',
          })}
          data-testid="scada-general-search-tags"
          onChange={(value: string[]) => onChange({ searchTags: value })}
        />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            required
            validateStatus={sizeXError ? 'error' : undefined}
            help={
              sizeXError
                ? formatMessage({
                    id: 'pages.resources.scadaSymbolEditor.general.sizeRange',
                    defaultMessage: 'Must be 1-24',
                  })
                : undefined
            }
            label={formatMessage({
              id: 'pages.resources.scadaSymbolEditor.general.sizeX',
              defaultMessage: 'Width (cells)',
            })}
          >
            <InputNumber
              min={MIN_WIDGET_SIZE}
              max={MAX_WIDGET_SIZE}
              precision={0}
              value={metadata.widgetSizeX}
              disabled={disabled}
              data-testid="scada-general-size-x"
              style={{ width: '100%' }}
              onChange={(value) =>
                onChange({ widgetSizeX: (value as number) ?? 0 })
              }
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            required
            validateStatus={sizeYError ? 'error' : undefined}
            help={
              sizeYError
                ? formatMessage({
                    id: 'pages.resources.scadaSymbolEditor.general.sizeRange',
                    defaultMessage: 'Must be 1-24',
                  })
                : undefined
            }
            label={formatMessage({
              id: 'pages.resources.scadaSymbolEditor.general.sizeY',
              defaultMessage: 'Height (cells)',
            })}
          >
            <InputNumber
              min={MIN_WIDGET_SIZE}
              max={MAX_WIDGET_SIZE}
              precision={0}
              value={metadata.widgetSizeY}
              disabled={disabled}
              data-testid="scada-general-size-y"
              style={{ width: '100%' }}
              onChange={(value) =>
                onChange({ widgetSizeY: (value as number) ?? 0 })
              }
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}

export default GeneralTab;
