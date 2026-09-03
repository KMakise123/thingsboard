/**
 * ui-hints static-map tests (M8 brief §3 wave-2 K; wave-3 K2 extends the
 * coverage assertions). The table now covers EVERY CORE rule node: 56
 * field-hinted clazzes + 12 EmptyNodeConfiguration nodes (version placeholder
 * in JSON source mode) + 8 family-only nodes (log / filter / switch /
 * transform scripts, key ops, clear alarm) whose form is drawn entirely by
 * the P0 registry. 宁缺勿错: unmapped clazzes fall back to generator
 * inference + JSON source mode, so uiHintsFor must return {} (never a wrong
 * hint) for them.
 */
import { describe, expect, it } from 'vitest';

import {
  localizeUiHintLabels,
  uiHintsClazzCount,
  uiHintsFor,
} from './ui-hints';

const GENERATOR = 'org.thingsboard.rule.engine.debug.TbMsgGeneratorNode';
const TIMESERIES = 'org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode';
const ATTRIBUTES = 'org.thingsboard.rule.engine.telemetry.TbMsgAttributesNode';
const CREATE_ALARM = 'org.thingsboard.rule.engine.action.TbCreateAlarmNode';
const SCRIPT = 'org.thingsboard.rule.engine.filter.TbJsFilterNode';
const MQTT = 'org.thingsboard.rule.engine.mqtt.TbMqttNode';
const KAFKA = 'org.thingsboard.rule.engine.kafka.TbKafkaNode';
const SEND_EMAIL = 'org.thingsboard.rule.engine.mail.TbSendEmailNode';
const GET_TELEMETRY = 'org.thingsboard.rule.engine.metadata.TbGetTelemetryNode';
const CHANGE_ORIGINATOR =
  'org.thingsboard.rule.engine.transform.TbChangeOriginatorNode';
const REST_API_CALL = 'org.thingsboard.rule.engine.rest.TbRestApiCallNode';
const GPS_FILTER = 'org.thingsboard.rule.engine.geo.TbGpsGeofencingFilterNode';
const SLACK = 'org.thingsboard.rule.engine.notification.TbSlackNode';
const TO_EMAIL = 'org.thingsboard.rule.engine.mail.TbMsgToEmailNode';
const AI = 'org.thingsboard.rule.engine.ai.TbAiNode';
const DEDUPLICATION =
  'org.thingsboard.rule.engine.deduplication.TbMsgDeduplicationNode';
const CHECK_RELATION = 'org.thingsboard.rule.engine.filter.TbCheckRelationNode';
const GET_ATTRIBUTES =
  'org.thingsboard.rule.engine.metadata.TbGetAttributesNode';
const RULE_CHAIN_INPUT =
  'org.thingsboard.rule.engine.flow.TbRuleChainInputNode';
const EMPTY_NODE = 'org.thingsboard.rule.engine.flow.TbAckNode';

describe('uiHintsFor — wave-2 P0 set (stable)', () => {
  it('returns the generator simple-field slice', () => {
    const hints = uiHintsFor(GENERATOR);
    expect(Object.keys(hints).sort()).toEqual([
      'msgCount',
      'originatorId',
      'originatorType',
      'periodInSeconds',
    ]);
    expect(hints.originatorType.enumOptions?.map((o) => o.value)).toContain(
      'DEVICE',
    );
  });

  it('returns the telemetry slices', () => {
    expect(Object.keys(uiHintsFor(TIMESERIES)).sort()).toEqual([
      'defaultTTL',
      'useServerTs',
    ]);
    expect(Object.keys(uiHintsFor(ATTRIBUTES)).sort()).toEqual([
      'notifyDevice',
      'scope',
      'sendAttributesUpdatedNotification',
      'updateAttributesOnlyOnValueChange',
    ]);
    expect(
      uiHintsFor(ATTRIBUTES).scope.enumOptions?.map((o) => o.value),
    ).toEqual(['SERVER_SCOPE', 'SHARED_SCOPE', 'CLIENT_SCOPE']);
  });

  it('keeps only the simple alarm-type field for create alarm (the family takes the rest)', () => {
    expect(Object.keys(uiHintsFor(CREATE_ALARM))).toEqual(['alarmType']);
  });

  it('returns {} for unknown clazzes and family-only nodes', () => {
    expect(uiHintsFor('org.example.NotARuleNode')).toEqual({});
    expect(uiHintsFor(SCRIPT)).toEqual({});
  });

  it('covers the full 76-CORE-node bookkeeping: 68 clazz entries', () => {
    // 76 CORE = 56 field-hinted + 12 EmptyNodeConfiguration (version
    // placeholder) + 8 family-only (registry-drawn, no hints).
    expect(uiHintsClazzCount()).toBe(68);
  });

  it('Empty nodes force the version placeholder into JSON source mode (wave-3 R parity observation)', () => {
    const hints = uiHintsFor(EMPTY_NODE);
    expect(Object.keys(hints)).toEqual(['version']);
    expect(hints.version.jsonSource).toBe(true);
    expect(hints.version.widget).toBeUndefined();
  });

  it('labels are i18n keys under editor.ruleNode.* (locale-driven contract)', () => {
    for (const hint of Object.values(uiHintsFor(GENERATOR))) {
      expect(hint.label?.startsWith('editor.ruleNode.')).toBe(true);
    }
  });
});

describe('uiHintsFor — wave-3 full-coverage facts (representative clazzes)', () => {
  it('mqtt: protocol enum + polymorphic credentials forced to JSON source', () => {
    const hints = uiHintsFor(MQTT);
    expect(hints.protocolVersion.enumOptions?.map((o) => o.label)).toEqual([
      'MQTT 3.1',
      'MQTT 3.1.1',
      'MQTT 5.0',
    ]);
    expect(hints.credentials.widget).toBe('json');
    expect(hints.password?.widget).toBeUndefined(); // mqtt has no password field
  });

  it('kafka: acks and charset options, otherProperties map as JSON', () => {
    const hints = uiHintsFor(KAFKA);
    expect(hints.acks.enumOptions?.map((o) => o.value)).toEqual([
      'all',
      '-1',
      '0',
      '1',
    ]);
    expect(
      hints.kafkaHeadersCharset.enumOptions?.map((o) => o.value),
    ).toContain('UTF-8');
    expect(hints.otherProperties.widget).toBe('json');
  });

  it('send email: password widget for secrets, smtp protocol options', () => {
    const hints = uiHintsFor(SEND_EMAIL);
    expect(hints.password.widget).toBe('password');
    expect(hints.proxyPassword.widget).toBe('password');
    expect(hints.smtpProtocol.enumOptions?.map((o) => o.value)).toEqual([
      'smtp',
      'smtps',
    ]);
  });

  it('get telemetry: fetch mode / order / aggregation / time-unit enums', () => {
    const hints = uiHintsFor(GET_TELEMETRY);
    expect(hints.fetchMode.enumOptions?.map((o) => o.value)).toEqual([
      'FIRST',
      'LAST',
      'ALL',
    ]);
    expect(hints.orderBy.enumOptions?.map((o) => o.value)).toEqual([
      'ASC',
      'DESC',
    ]);
    expect(hints.aggregation.enumOptions?.map((o) => o.value)).toEqual([
      'NONE',
      'MIN',
      'MAX',
      'AVG',
      'SUM',
      'COUNT',
    ]);
    expect(hints.startIntervalTimeUnit.enumOptions?.[2].value).toBe('MINUTES');
  });

  it('change originator: originator source enum (ui-ngx five values)', () => {
    const hints = uiHintsFor(CHANGE_ORIGINATOR);
    expect(hints.originatorSource.enumOptions?.map((o) => o.value)).toEqual([
      'CUSTOMER',
      'TENANT',
      'RELATED',
      'ALARM_ORIGINATOR',
      'ENTITY',
    ]);
    // nested RelationsQuery scalar fields reachable by dotted path
    expect(
      hints['relationsQuery.direction']?.enumOptions?.map((o) => o.value),
    ).toEqual(['FROM', 'TO']);
    expect(hints['relationsQuery.maxLevel']?.widget).toBe('number');
  });

  it('rest api call: request method enum + KV maps as JSON', () => {
    const hints = uiHintsFor(REST_API_CALL);
    expect(hints.requestMethod.enumOptions?.map((o) => o.value)).toEqual([
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
    ]);
    expect(hints.headers.widget).toBe('json');
    expect(hints.queryParams.widget).toBe('json');
    expect(hints.requestBodyTemplate.widget).toBe('textarea');
  });

  it('gps geofencing: perimeter + range unit enums', () => {
    const hints = uiHintsFor(GPS_FILTER);
    expect(hints.perimeterType.enumOptions?.map((o) => o.value)).toEqual([
      'POLYGON',
      'CIRCLE',
    ]);
    expect(hints.rangeUnit.enumOptions?.map((o) => o.value)).toContain('METER');
  });

  it('slack: bot token password + conversation type enum', () => {
    const hints = uiHintsFor(SLACK);
    expect(hints.botToken.widget).toBe('password');
    expect(hints.conversationType.enumOptions?.map((o) => o.value)).toEqual([
      'PUBLIC_CHANNEL',
      'PRIVATE_CHANNEL',
      'DIRECT',
    ]);
  });

  it('to email: mail body type is a string enum (false/true/dynamic)', () => {
    const hints = uiHintsFor(TO_EMAIL);
    expect(hints.mailBodyType.enumOptions?.map((o) => o.value)).toEqual([
      'false',
      'true',
      'dynamic',
    ]);
    expect(hints.bodyTemplate.widget).toBe('textarea');
  });

  it('ai: nested responseFormat.type enum via dotted-path hint', () => {
    const hints = uiHintsFor(AI);
    expect(
      hints['responseFormat.type']?.enumOptions?.map((o) => o.value),
    ).toEqual(['JSON', 'TEXT', 'JSON_SCHEMA']);
    expect(hints.systemPrompt.widget).toBe('textarea');
  });

  it('deduplication + check relation + get attributes enum slices', () => {
    expect(
      uiHintsFor(DEDUPLICATION).strategy.enumOptions?.map((o) => o.value),
    ).toEqual(['FIRST', 'LAST', 'ALL']);
    expect(
      uiHintsFor(CHECK_RELATION).direction.enumOptions?.map((o) => o.value),
    ).toEqual(['FROM', 'TO']);
    expect(
      uiHintsFor(GET_ATTRIBUTES).fetchTo.enumOptions?.map((o) => o.value),
    ).toEqual(['DATA', 'METADATA']);
  });

  it('array fields never carry enumOptions (select over an array would blank stored data)', () => {
    // Java List fields render as M7 tag lists — enumOptions on them would
    // coerce the generator to a single select and blank stored arrays.
    const CHECK_NODE =
      'org.thingsboard.rule.engine.filter.TbCheckAlarmStatusNode';
    expect(uiHintsFor(CHECK_NODE).alarmStatusList?.enumOptions).toBeUndefined();
    expect(
      uiHintsFor(GET_ATTRIBUTES).latestTsKeyNames?.enumOptions,
    ).toBeUndefined();
    expect(uiHintsFor(CHECK_NODE)).toBeDefined();
  });

  it('flow input node got its two fields (extended after wave-2 probe)', () => {
    expect(Object.keys(uiHintsFor(RULE_CHAIN_INPUT)).sort()).toEqual([
      'forwardMsgToDefaultRuleChain',
      'ruleChainId',
    ]);
  });
});

describe('localizeUiHintLabels', () => {
  it('translates editor.* labels and enum option labels', () => {
    const hints = uiHintsFor(ATTRIBUTES);
    const localized = localizeUiHintLabels(hints, (id: string) =>
      id === 'editor.ruleNode.field.scope' ? '属性范围' : `[${id}]`,
    );
    expect(localized.scope.label).toBe('属性范围');
    expect(localized.scope.enumOptions?.[0].label).toBe(
      '[editor.ruleNode.option.scope.server]',
    );
  });

  it('leaves non-i18n labels verbatim (protocol-literal options stay untranslated)', () => {
    const localized = localizeUiHintLabels(uiHintsFor(MQTT), () => 'x');
    expect(localized.protocolVersion.enumOptions?.[0].label).toBe('MQTT 3.1');
    const plain = localizeUiHintLabels(
      {
        plain: {
          label: 'Plain Label',
          enumOptions: [{ value: 1, label: 'One' }],
        },
      },
      () => 'SHOULD-NOT-BE-CALLED',
    );
    expect(plain.plain.label).toBe('Plain Label');
    expect(plain.plain.enumOptions?.[0].label).toBe('One');
  });

  it('does not mutate the source table', () => {
    const hints = uiHintsFor(TIMESERIES);
    localizeUiHintLabels(hints, () => 'x');
    expect(hints.defaultTTL.label?.startsWith('editor.')).toBe(true);
  });
});
