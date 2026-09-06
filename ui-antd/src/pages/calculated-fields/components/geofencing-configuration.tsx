/**
 * GEOFENCING configurator (M14 wave-5, spec 6.1-15; ui-ngx
 * tb-geofencing-configuration parity): entityCoordinates (latitude/
 * longitude time-series key names — required, the field the ngx TS model
 * forgot but the backend carries), the zone-groups table + panel suite and
 * the zone refresh toggle (scheduledUpdateEnabled defaults ON with the
 * server-minimum interval; the toggle row only surfaces when a zone walks
 * RELATION_QUERY paths, ngx isRelatedEntity). NO map — zones reference a
 * perimeter attribute key (ngx pins this: the geofencing folder has no
 * map/leaflet).
 */
import {
  Alert,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Space,
  Typography,
} from 'antd';
import { useIntl } from 'react-intl';
import type {
  CalculatedFieldConfiguration,
  CalculatedFieldGeofencingZoneGroup,
} from '@/types/tb/calculated-fields';
import { CF_LIMITS } from '@/types/tb/calculated-fields';
import { CF_KEY_PATTERN, type CfHostEntityType } from './data';
import OutputSection from './output-section';
import ZoneGroupsTable from './zone-groups-table';

export interface GeofencingConfigurationProps {
  value?: CalculatedFieldConfiguration;
  onChange?: (value: CalculatedFieldConfiguration) => void;
  hostEntityType: CfHostEntityType | undefined;
  tenantId: string;
  disabled?: boolean;
}

export default function GeofencingConfiguration({
  value,
  onChange,
  hostEntityType,
  tenantId,
  disabled,
}: GeofencingConfigurationProps) {
  const { formatMessage } = useIntl();
  const isGeofencing = value?.type === 'GEOFENCING';
  const coordinates = isGeofencing
    ? (value.entityCoordinates ?? {
        latitudeKeyName: '',
        longitudeKeyName: '',
      })
    : { latitudeKeyName: '', longitudeKeyName: '' };
  const zoneGroups: Record<string, CalculatedFieldGeofencingZoneGroup> =
    isGeofencing ? (value.zoneGroups ?? {}) : {};
  const output = value && 'output' in value ? value.output : undefined;
  const scheduledUpdateEnabled =
    isGeofencing && value.scheduledUpdateEnabled !== false;
  const scheduledUpdateInterval = isGeofencing
    ? (value.scheduledUpdateInterval ??
      CF_LIMITS.minAllowedScheduledUpdateIntervalInSecForCF)
    : CF_LIMITS.minAllowedScheduledUpdateIntervalInSecForCF;

  // ngx isRelatedEntity: the refresh row only matters when a zone group is
  // resolved through relation levels (perimeters otherwise arrive on data).
  const isRelatedEntity = Object.values(zoneGroups).some(
    (zone) =>
      zone.refDynamicSourceConfiguration?.type === 'RELATION_PATH_QUERY',
  );

  const patch = (next: Record<string, unknown>) => {
    if (!isGeofencing) {
      return;
    }
    onChange?.({ ...value, ...next } as CalculatedFieldConfiguration);
  };

  const latitudeInvalid =
    !coordinates.latitudeKeyName?.trim() ||
    !CF_KEY_PATTERN.test(coordinates.latitudeKeyName);
  const longitudeInvalid =
    !coordinates.longitudeKeyName?.trim() ||
    !CF_KEY_PATTERN.test(coordinates.longitudeKeyName);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Typography.Text strong>
          {formatMessage({
            id: 'pages.calculatedFields.geofencing.entityCoordinates',
            defaultMessage: 'Entity coordinates',
          })}
        </Typography.Text>
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'pages.calculatedFields.geofencing.entityCoordinatesHint',
            defaultMessage:
              'Time-series keys of the target entity carrying the latitude / longitude position.',
          })}
        </Typography.Text>
        <Space wrap>
          <Form.Item
            label={formatMessage({
              id: 'pages.calculatedFields.geofencing.latitudeKeyName',
              defaultMessage: 'Latitude time series key',
            })}
            required
            className="mb-0"
            validateStatus={
              latitudeInvalid && !coordinates.latitudeKeyName?.trim()
                ? 'error'
                : undefined
            }
            help={
              latitudeInvalid && !coordinates.latitudeKeyName?.trim()
                ? formatMessage({
                    id: 'pages.calculatedFields.geofencing.latitudeKeyRequired',
                    defaultMessage: 'Latitude time series key is required.',
                  })
                : latitudeInvalid
                  ? formatMessage({
                      id: 'pages.calculatedFields.argument.keyPattern',
                      defaultMessage:
                        'Single spaces inside the key are allowed.',
                    })
                  : undefined
            }
          >
            <Input
              value={coordinates.latitudeKeyName}
              disabled={disabled}
              className="w-64"
              data-testid="cf-geofencing-latitude"
              onChange={(event) =>
                patch({
                  entityCoordinates: {
                    ...coordinates,
                    latitudeKeyName: event.target.value,
                  },
                })
              }
            />
          </Form.Item>
          <Form.Item
            label={formatMessage({
              id: 'pages.calculatedFields.geofencing.longitudeKeyName',
              defaultMessage: 'Longitude time series key',
            })}
            required
            className="mb-0"
            validateStatus={
              longitudeInvalid && !coordinates.longitudeKeyName?.trim()
                ? 'error'
                : undefined
            }
            help={
              longitudeInvalid && !coordinates.longitudeKeyName?.trim()
                ? formatMessage({
                    id: 'pages.calculatedFields.geofencing.longitudeKeyRequired',
                    defaultMessage: 'Longitude time series key is required.',
                  })
                : longitudeInvalid
                  ? formatMessage({
                      id: 'pages.calculatedFields.argument.keyPattern',
                      defaultMessage:
                        'Single spaces inside the key are allowed.',
                    })
                  : undefined
            }
          >
            <Input
              value={coordinates.longitudeKeyName}
              disabled={disabled}
              className="w-64"
              data-testid="cf-geofencing-longitude"
              onChange={(event) =>
                patch({
                  entityCoordinates: {
                    ...coordinates,
                    longitudeKeyName: event.target.value,
                  },
                })
              }
            />
          </Form.Item>
        </Space>
      </div>

      <Form.Item
        label={formatMessage({
          id: 'pages.calculatedFields.geofencing.zoneGroups',
          defaultMessage: 'Geofencing zone groups',
        })}
        className="mb-0"
        required
        tooltip={formatMessage({
          id: 'pages.calculatedFields.geofencing.zoneGroupsHint',
          defaultMessage:
            'Zones reference a perimeter attribute key on another entity — there is no map editor by design.',
        })}
      >
        <ZoneGroupsTable
          value={zoneGroups}
          onChange={(next) => patch({ zoneGroups: next })}
          hostEntityType={hostEntityType}
          tenantId={tenantId}
          disabled={disabled}
        />
      </Form.Item>

      {isRelatedEntity && (
        <div className="flex flex-col gap-2 rounded border border-solid border-neutral-200 p-3 dark:border-neutral-700">
          <Checkbox
            checked={scheduledUpdateEnabled}
            disabled={disabled}
            onChange={(event) =>
              patch({ scheduledUpdateEnabled: event.target.checked })
            }
          >
            {formatMessage({
              id: 'pages.calculatedFields.geofencing.scheduledUpdateEnabled',
              defaultMessage: 'Zone groups refresh interval',
            })}
          </Checkbox>
          {scheduledUpdateEnabled && (
            <Space wrap>
              <InputNumber
                min={CF_LIMITS.minAllowedScheduledUpdateIntervalInSecForCF}
                precision={0}
                value={scheduledUpdateInterval}
                disabled={disabled}
                className="w-40"
                onChange={(next) =>
                  patch({
                    scheduledUpdateInterval:
                      next ??
                      CF_LIMITS.minAllowedScheduledUpdateIntervalInSecForCF,
                  })
                }
              />
              <Typography.Text type="secondary">
                {formatMessage(
                  {
                    id: 'pages.calculatedFields.geofencing.scheduledUpdateMin',
                    defaultMessage: 'At least {min} seconds.',
                  },
                  {
                    min: CF_LIMITS.minAllowedScheduledUpdateIntervalInSecForCF,
                  },
                )}
              </Typography.Text>
            </Space>
          )}
          {!scheduledUpdateEnabled && (
            <Alert
              type="warning"
              showIcon
              message={formatMessage({
                id: 'pages.calculatedFields.geofencing.scheduledUpdateOffHint',
                defaultMessage:
                  'Relation-resolved zones are only refreshed when new telemetry arrives — presence may go stale.',
              })}
            />
          )}
        </div>
      )}

      <OutputSection
        value={output}
        onChange={(next) => patch({ output: next })}
        simpleMode={false}
        hostEntityType={hostEntityType}
        disabled={disabled}
      />
    </div>
  );
}
