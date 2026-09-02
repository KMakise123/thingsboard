/**
 * The entity-view form fields (spec 3.4 entity-selector-form parity, ui-ngx
 * entity-view.component.html): name, entity-view type (free-tag autocomplete
 * over /api/entityView/types), the target-entity selector, the four key
 * lists under their two accordion sections and the interlocked
 * startTimeMs/endTimeMs datetimes, plus the description.
 *
 * Pure field declarations: the component renders inside whatever <Form>
 * owns it (dialog or detail header), reading siblings through
 * Form.useWatch — no state of its own.
 */
import { useQuery } from '@tanstack/react-query';
import {
  AutoComplete,
  type AutoCompleteProps,
  Col,
  Collapse,
  DatePicker,
  Form,
  Input,
  Row,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { useIntl } from 'react-intl';
import { getEntityViewTypes } from '@/services/tb/entity-view';
import EntityKeysSelect from './EntityKeysSelect';
import {
  endDisabledTime,
  hasTimeRangeConflict,
  isEndDateDisabled,
  isStartDateDisabled,
  startDisabledTime,
} from './entity-view-form';
import TargetEntitySelect from './TargetEntitySelect';

export default function EntityViewFormFields() {
  const { formatMessage } = useIntl();
  const form = Form.useFormInstance();
  const targetEntityId = Form.useWatch('targetEntityId', form);
  const start = Form.useWatch('startTimeMs', form);
  const end = Form.useWatch('endTimeMs', form);
  const startMs = start ? (start as Dayjs).valueOf() : undefined;
  const endMs = end ? (end as Dayjs).valueOf() : undefined;

  const typesQuery = useQuery({
    queryKey: ['entity-view-types', 'form'],
    queryFn: getEntityViewTypes,
    staleTime: 60_000,
  });
  const typeOptions = (typesQuery.data ?? []).map((subtype) => ({
    label: subtype.type,
    value: subtype.type,
  }));

  // Exact-ms interlock validator (the pickers already clamp at pick time).
  const timeRangeRule = {
    validator: (_rule: unknown, _value: Dayjs | null) =>
      hasTimeRangeConflict(startMs, endMs)
        ? Promise.reject(
            new Error(
              formatMessage({
                id: 'pages.entityViews.form.timeRangeConflict',
                defaultMessage:
                  'The start time must not be later than the end time.',
              }),
            ),
          )
        : Promise.resolve(),
  };

  return (
    <>
      <Form.Item
        name="name"
        label={formatMessage({
          id: 'pages.entityViews.form.name',
          defaultMessage: 'Name',
        })}
        rules={[
          {
            required: true,
            whitespace: true,
            message: formatMessage({
              id: 'pages.entityViews.form.nameRequired',
              defaultMessage: 'Name is required.',
            }),
          },
          {
            max: 255,
            message: formatMessage({
              id: 'pages.entityViews.form.nameTooLong',
              defaultMessage: 'Name must be at most 255 characters.',
            }),
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="type"
        label={formatMessage({
          id: 'pages.entityViews.form.type',
          defaultMessage: 'Entity view type',
        })}
        rules={[
          {
            required: true,
            message: formatMessage({
              id: 'pages.entityViews.form.typeRequired',
              defaultMessage: 'Entity view type is required.',
            }),
          },
        ]}
      >
        <AutoCompleteTypeInput options={typeOptions} />
      </Form.Item>
      <TargetEntitySelect />
      <Collapse
        className="mb-4"
        defaultActiveKey={['attributes', 'timeseries']}
        items={[
          {
            key: 'attributes',
            label: formatMessage({
              id: 'pages.entityViews.form.attributesPropagation',
              defaultMessage: 'Attributes propagation',
            }),
            children: (
              <>
                <Typography.Paragraph type="secondary" className="mb-2 text-xs">
                  {formatMessage({
                    id: 'pages.entityViews.form.attributesPropagationHint',
                    defaultMessage:
                      'Entity View will automatically copy specified attributes from Target Entity each time you save or update this entity view.',
                  })}
                </Typography.Paragraph>
                <EntityKeysSelect
                  name="clientAttributes"
                  label={formatMessage({
                    id: 'pages.entityViews.form.clientAttributes',
                    defaultMessage: 'Client attributes',
                  })}
                  kind="attribute"
                  targetEntityId={targetEntityId ?? ''}
                />
                <EntityKeysSelect
                  name="sharedAttributes"
                  label={formatMessage({
                    id: 'pages.entityViews.form.sharedAttributes',
                    defaultMessage: 'Shared attributes',
                  })}
                  kind="attribute"
                  targetEntityId={targetEntityId ?? ''}
                />
                <EntityKeysSelect
                  name="serverAttributes"
                  label={formatMessage({
                    id: 'pages.entityViews.form.serverAttributes',
                    defaultMessage: 'Server attributes',
                  })}
                  kind="attribute"
                  targetEntityId={targetEntityId ?? ''}
                />
              </>
            ),
          },
          {
            key: 'timeseries',
            label: formatMessage({
              id: 'pages.entityViews.form.timeseriesData',
              defaultMessage: 'Time series data',
            }),
            children: (
              <>
                <Typography.Paragraph type="secondary" className="mb-2 text-xs">
                  {formatMessage({
                    id: 'pages.entityViews.form.timeseriesDataHint',
                    defaultMessage:
                      'Configure time series data keys of the target entity that will be accessible to the entity view.',
                  })}
                </Typography.Paragraph>
                <EntityKeysSelect
                  name="timeseriesKeys"
                  label={formatMessage({
                    id: 'pages.entityViews.form.timeseries',
                    defaultMessage: 'Time series',
                  })}
                  kind="timeseries"
                  targetEntityId={targetEntityId ?? ''}
                />
              </>
            ),
          },
        ]}
      />
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="startTimeMs"
            label={formatMessage({
              id: 'pages.entityViews.form.startTs',
              defaultMessage: 'Start time',
            })}
            rules={[timeRangeRule]}
          >
            <DatePicker
              showTime
              allowClear
              className="w-full"
              disabledDate={(day) => isStartDateDisabled(day, endMs)}
              disabledTime={startDisabledTime(endMs)}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="endTimeMs"
            label={formatMessage({
              id: 'pages.entityViews.form.endTs',
              defaultMessage: 'End time',
            })}
            rules={[timeRangeRule]}
          >
            <DatePicker
              showTime
              allowClear
              className="w-full"
              disabledDate={(day) => isEndDateDisabled(day, startMs)}
              disabledTime={endDisabledTime(startMs)}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        name="description"
        label={formatMessage({
          id: 'pages.entityViews.form.description',
          defaultMessage: 'Description',
        })}
      >
        <Input.TextArea rows={2} />
      </Form.Item>
    </>
  );
}

/**
 * Free-tag type input (ui-ngx entity-subtype-autocomplete allows creating a
 * new type on the fly): suggestions from the server, arbitrary text legal.
 * The remaining props (value/onChange/id from Form.Item) MUST reach the
 * AutoComplete — dropping them silently unlinks the field from the form
 * state and every submit fails the required-type validation.
 */
function AutoCompleteTypeInput({
  options,
  ...rest
}: {
  options: Array<{ label: string; value: string }>;
} & AutoCompleteProps) {
  const { formatMessage } = useIntl();
  return (
    // antd AutoComplete is the Input+dropdown hybrid: typing an unseen type
    // stays in the field instead of being rejected like a plain Select.
    <AutoComplete
      {...rest}
      options={options}
      placeholder={formatMessage({
        id: 'pages.entityViews.form.typePlaceholder',
        defaultMessage: 'Enter or select an entity view type',
      })}
      filterOption={(input, option) =>
        String(option?.value ?? '')
          .toLowerCase()
          .includes(input.toLowerCase())
      }
    />
  );
}
