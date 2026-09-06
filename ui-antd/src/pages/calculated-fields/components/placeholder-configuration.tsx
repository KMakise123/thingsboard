/**
 * Wave-5 placeholder for the four complex configurators (M14 wave-4 scope
 * fence): PROPAGATION / RELATED_ENTITIES_AGGREGATION / ENTITY_AGGREGATION /
 * GEOFENCING. Selecting one of these types renders this notice; the real
 * configurators land in M14 wave-5 (brief §3) — intentionally NOT faked.
 *
 * TODO(M14 wave-5): replace this placeholder with
 * propagation-configuration.tsx / related-entities-aggregation-configuration.tsx /
 * entity-aggregation-configuration.tsx (+ metrics-panel.tsx) /
 * geofencing-configuration.tsx (+ zone groups suite), per arch R13.
 */
import { Alert } from 'antd';
import { useIntl } from 'react-intl';

export default function PlaceholderConfiguration() {
  const { formatMessage } = useIntl();
  return (
    <Alert
      type="info"
      showIcon
      message={formatMessage({
        id: 'pages.calculatedFields.placeholderTitle',
        defaultMessage: 'Configurator delivered in a later wave',
      })}
      description={formatMessage({
        id: 'pages.calculatedFields.placeholderDescription',
        defaultMessage:
          'The full editor for this calculated-field type ships with the M14 wave-5 delivery (propagation, aggregations, geofencing). Choose SIMPLE or SCRIPT to continue in this wave.',
      })}
    />
  );
}
