/**
 * One key list of the entity-view form (tb-entity-keys-list parity): a tags
 * select whose suggestions come from the selected TARGET entity — attribute
 * scopes merged for cs/sh/ss, telemetry keys for timeseries. Free-form
 * entries are allowed (ui-ngx accepts chips it cannot match too); comma
 * input splits into chips for quick paste.
 */
import { Form, Select } from 'antd';
import { useIntl } from 'react-intl';
import type { EntityId } from '@/types/tb';
import { useTargetEntityKeys } from './use-target-entity-keys';

export type EntityKeysKind = 'attribute' | 'timeseries';

export default function EntityKeysSelect({
  name,
  label,
  kind,
  targetEntityId,
}: {
  /** Form field name (clientAttributes / sharedAttributes / ...). */
  name: string;
  label: string;
  kind: EntityKeysKind;
  /** Picked target entity id ('' while unset disables the data source). */
  targetEntityId: string;
}) {
  const { formatMessage } = useIntl();
  const form = Form.useFormInstance();
  const entityType = Form.useWatch('targetEntityType', form);
  const entityId: EntityId | null =
    targetEntityId && entityType ? { entityType, id: targetEntityId } : null;
  const keysQuery = useTargetEntityKeys(entityId);

  const inventory =
    kind === 'timeseries'
      ? (keysQuery.data?.telemetry ?? [])
      : (keysQuery.data?.attributes ?? []);
  const options = Array.from(new Set(inventory)).map((key) => ({
    label: key,
    value: key,
  }));

  return (
    <Form.Item name={name} label={label}>
      <Select
        mode="tags"
        tokenSeparators={[',']}
        loading={keysQuery.isFetching}
        placeholder={label}
        options={options}
        // No target picked yet -> the empty dropdown explains what to do;
        // with a target but no matching keys the dropdown stays empty (any
        // typed key is still a valid chip).
        notFoundContent={
          targetEntityId
            ? null
            : formatMessage({
                id: 'pages.entityViews.form.keysNoTarget',
                defaultMessage: 'Select a target entity first.',
              })
        }
      />
    </Form.Item>
  );
}
