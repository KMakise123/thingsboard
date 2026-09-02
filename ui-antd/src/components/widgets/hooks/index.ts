/**
 * src/components/widgets/hooks — W2 widget data hooks (brief §1.8).
 * entity-filter       resolved entities → server-side entityList filters
 * use-entity-timeseries  tsCmd/historyCmd subscription channel (chart + table)
 * use-entity-latest   subscribeEntityData latest-values channel (entities table)
 * use-echarts         chart lifecycle (TimeseriesHistoryModal template)
 * widget-text         {i18n:} + ${entityName} interpolation, value formatting
 */
export * from './entity-filter';
export * from './use-echarts';
export * from './use-entity-latest';
export * from './use-entity-timeseries';
export * from './use-widget-values';
export * from './widget-text';
