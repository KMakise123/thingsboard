/**
 * Connectivity check — panel shared by the standalone dialog (row action)
 * and the wizard's last step.
 *
 * Parity: ui-ngx device-check-connectivity-dialog — REST command payload
 * (GET /api/device-connectivity/{id}) drives a transport switcher and
 * per-OS tabs (Windows/macOS/Linux, plus Docker for MQTT/CoAP); the secure
 * variant can be the literal 'Check documentation' sentinel, in which case
 * a documentation link renders instead of a command. Device state comes from
 * a SERVER_SCOPE 'active' attribute subscription and recent telemetry from
 * the latest-telemetry subscription (both core/ws, never query cache).
 */
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Segmented,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

import {
  useAttributeSubscription,
  useLatestTelemetrySubscription,
} from '@/core/ws/hooks';
import { getDeviceConnectivity } from '@/services/tb/device';
import {
  AttributeScope,
  EntityType,
  type PublishTelemetryCommand,
} from '@/types/tb';

/** Backend sentinel meaning "no canned command, point at the docs". */
const CHECK_DOCUMENTATION = 'Check documentation';

const DOC_URLS = {
  mqttsX509:
    'https://thingsboard.io/docs/reference/mqtt-api/getting-connected/#mqtt-over-tls',
  coapsX509:
    'https://thingsboard.io/docs/reference/coap-api/getting-connected/#x509-certificate',
  sparkplug: 'https://thingsboard.io/docs/reference/sparkplug-api/',
  snmp: 'https://thingsboard.io/docs/reference/snmp-api/getting-connected/',
  lwm2m: 'https://thingsboard.io/docs/reference/lwm2m-api/getting-started/',
  installMqttWindows:
    'https://thingsboard.io/docs/reference/mqtt-api/getting-connected/?connectdevice=mqtt-windows',
  installCoapClient:
    'https://thingsboard.io/docs/reference/coap-api/getting-connected/#access-token',
} as const;

const TRANSPORT_ORDER = ['HTTP', 'MQTT', 'COAP', 'SNMP', 'LWM2M'] as const;
type PanelTransport = (typeof TRANSPORT_ORDER)[number];

export function availableTransports(
  commands: PublishTelemetryCommand | undefined,
): Array<PanelTransport> {
  if (!commands) {
    return [];
  }
  const keys = Object.keys(commands);
  return TRANSPORT_ORDER.filter((transport) =>
    keys.some((key) => key.toUpperCase().startsWith(transport)),
  );
}

interface ConnectivityPanelProps {
  deviceId: string | undefined;
  /** Wizard "just created" variant: hint text differs. */
  afterAdd?: boolean;
}

export function ConnectivityPanel({
  deviceId,
  afterAdd = false,
}: ConnectivityPanelProps) {
  const { formatMessage } = useIntl();
  const query = useQuery({
    queryKey: ['device-connectivity', deviceId],
    queryFn: () => getDeviceConnectivity(deviceId as string),
    enabled: !!deviceId,
    // Commands embed one-time credentials only right after creation.
    staleTime: afterAdd ? 60_000 : 0,
  });

  if (!deviceId) {
    return null;
  }

  if (query.isPending) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Spin />
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'pages.devices.list.connectivityLoading',
            defaultMessage: 'Loading check connectivity commands…',
          })}
        </Typography.Text>
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        title={formatMessage({
          id: 'pages.devices.list.loadFailed',
          defaultMessage: 'Failed to load devices',
        })}
        description={String((query.error as Error).message)}
      />
    );
  }

  // The service returns the loose connectivity map; the per-transport keys
  // are only present when the backend generated that command family.
  const commands = query.data as unknown as PublishTelemetryCommand;
  const transports = availableTransports(commands);

  return (
    <div className="flex flex-col gap-4">
      {transports.length > 0 ? (
        <TransportCommands transports={transports} commands={commands} />
      ) : (
        <Alert
          type="info"
          showIcon
          title={formatMessage({
            id: 'pages.devices.list.connectivityNoCommands',
            defaultMessage: 'No connectivity commands available.',
          })}
        />
      )}
      <DeviceStateAndTelemetry deviceId={deviceId} />
    </div>
  );
}

function TransportCommands({
  transports,
  commands,
}: {
  transports: Array<PanelTransport>;
  commands: PublishTelemetryCommand;
}) {
  const { formatMessage } = useIntl();
  const [selected, setSelected] = useState<PanelTransport>(transports[0]);
  const hint = formatMessage({
    id: 'pages.devices.list.connectivityInstructions',
    defaultMessage:
      'Use the following instructions for sending telemetry on behalf of the device using shell',
  });

  return (
    <Card size="small">
      <div className="flex flex-col gap-3">
        {transports.length > 1 && (
          <Segmented
            value={selected}
            onChange={(value) => setSelected(value as PanelTransport)}
            options={transports.map((transport) => ({
              label: transport,
              value: transport,
            }))}
          />
        )}
        <Typography.Text type="secondary">{hint}</Typography.Text>
        {selected === 'HTTP' && commands.http && (
          <Tabs
            items={[
              {
                key: 'windows',
                label: 'Windows',
                children: (
                  <OsCommandBody
                    installHint={formatMessage({
                      id: 'pages.devices.list.connectivityInstallCurlWindows',
                      defaultMessage:
                        'Starting Windows 10 b17063, cURL is available by default',
                    })}
                    pair={{
                      noSecLabel: 'HTTP',
                      noSec: commands.http.http,
                      secLabel: 'HTTPs',
                      sec: commands.http.https,
                    }}
                  />
                ),
              },
              {
                key: 'macos',
                label: 'MacOS',
                children: (
                  <OsCommandBody
                    installHint={formatMessage({
                      id: 'pages.devices.list.connectivityInstallCurlMacos',
                      defaultMessage:
                        'Starting Mac OS X 10.2 6C115 (Jaguar), cURL is available by default',
                    })}
                    pair={{
                      noSecLabel: 'HTTP',
                      noSec: commands.http.http,
                      secLabel: 'HTTPs',
                      sec: commands.http.https,
                    }}
                  />
                ),
              },
              {
                key: 'linux',
                label: 'Linux',
                children: (
                  <OsCommandBody
                    installCommand="sudo apt-get install curl"
                    pair={{
                      noSecLabel: 'HTTP',
                      noSec: commands.http.http,
                      secLabel: 'HTTPs',
                      sec: commands.http.https,
                    }}
                  />
                ),
              },
            ]}
          />
        )}
        {selected === 'MQTT' &&
          commands.mqtt &&
          'sparkplug' in commands.mqtt && (
            <DocLink
              text={formatMessage({
                id: 'pages.devices.list.connectivitySparkplugCommand',
                defaultMessage:
                  'Use the following documentation to connect the device through the MQTT Sparkplug.',
              })}
              href={DOC_URLS.sparkplug}
            />
          )}
        {selected === 'MQTT' &&
          commands.mqtt &&
          !('sparkplug' in commands.mqtt) && (
            <Tabs
              items={[
                {
                  key: 'windows',
                  label: 'Windows',
                  children: (
                    <OsCommandBody
                      installDoc={{
                        text: formatMessage({
                          id: 'pages.devices.list.connectivityInstallMqttWindows',
                          defaultMessage:
                            'Use the instructions to download, install, setup and run mosquitto_pub',
                        }),
                        href: DOC_URLS.installMqttWindows,
                      }}
                      pair={{
                        noSecLabel: 'MQTT',
                        noSec: commands.mqtt.mqtt,
                        secLabel: 'MQTTs',
                        sec: commands.mqtt.mqtts,
                        secDoc: {
                          text: formatMessage({
                            id: 'pages.devices.list.connectivityMqttsX509Command',
                            defaultMessage:
                              'Use the following documentation to connect the device via MQTT with authorization X509',
                          }),
                          href: DOC_URLS.mqttsX509,
                        },
                      }}
                    />
                  ),
                },
                {
                  key: 'macos',
                  label: 'MacOS',
                  children: (
                    <OsCommandBody
                      installCommand="brew install mosquitto"
                      pair={{
                        noSecLabel: 'MQTT',
                        noSec: commands.mqtt.mqtt,
                        secLabel: 'MQTTs',
                        sec: commands.mqtt.mqtts,
                        secDoc: {
                          text: formatMessage({
                            id: 'pages.devices.list.connectivityMqttsX509Command',
                            defaultMessage:
                              'Use the following documentation to connect the device via MQTT with authorization X509',
                          }),
                          href: DOC_URLS.mqttsX509,
                        },
                      }}
                    />
                  ),
                },
                {
                  key: 'linux',
                  label: 'Linux',
                  children: (
                    <OsCommandBody
                      installCommand="sudo apt-get install curl mosquitto-clients"
                      pair={{
                        noSecLabel: 'MQTT',
                        noSec: commands.mqtt.mqtt,
                        secLabel: 'MQTTs',
                        sec: commands.mqtt.mqtts,
                        secDoc: {
                          text: formatMessage({
                            id: 'pages.devices.list.connectivityMqttsX509Command',
                            defaultMessage:
                              'Use the following documentation to connect the device via MQTT with authorization X509',
                          }),
                          href: DOC_URLS.mqttsX509,
                        },
                      }}
                    />
                  ),
                },
                ...(commands.mqtt.docker
                  ? [
                      {
                        key: 'docker',
                        label: 'Docker',
                        children: (
                          <OsCommandBody
                            pair={{
                              noSecLabel: 'MQTT',
                              noSec: commands.mqtt.docker?.mqtt,
                              secLabel: 'MQTTs',
                              sec: commands.mqtt.docker?.mqtts,
                              secDoc: {
                                text: formatMessage({
                                  id: 'pages.devices.list.connectivityMqttsX509Command',
                                  defaultMessage:
                                    'Use the following documentation to connect the device via MQTT with authorization X509',
                                }),
                                href: DOC_URLS.mqttsX509,
                              },
                            }}
                          />
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          )}
        {selected === 'COAP' && commands.coap && (
          <Tabs
            items={[
              {
                key: 'linux',
                label: 'Linux',
                children: (
                  <OsCommandBody
                    installDoc={{
                      text: formatMessage({
                        id: 'pages.devices.list.connectivityInstallCoapClient',
                        defaultMessage:
                          'Use the instructions to download, install, setup and run coap-client',
                      }),
                      href: DOC_URLS.installCoapClient,
                    }}
                    pair={{
                      noSecLabel: 'CoAP',
                      noSec: commands.coap.coap,
                      secLabel: 'CoAPs',
                      sec: commands.coap.coaps,
                      secDoc: {
                        text: formatMessage({
                          id: 'pages.devices.list.connectivityCoapsX509Command',
                          defaultMessage:
                            'Use the following documentation to connect the device via CoAP over DTLS with authorization X509',
                        }),
                        href: DOC_URLS.coapsX509,
                      },
                    }}
                  />
                ),
              },
              ...(commands.coap.docker
                ? [
                    {
                      key: 'docker',
                      label: 'Docker',
                      children: (
                        <OsCommandBody
                          pair={{
                            noSecLabel: 'CoAP',
                            noSec: commands.coap.docker?.coap,
                            secLabel: 'CoAPs',
                            sec: commands.coap.docker?.coaps,
                            secDoc: {
                              text: formatMessage({
                                id: 'pages.devices.list.connectivityCoapsX509Command',
                                defaultMessage:
                                  'Use the following documentation to connect the device via CoAP over DTLS with authorization X509',
                              }),
                              href: DOC_URLS.coapsX509,
                            },
                          }}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        )}
        {selected === 'SNMP' && (
          <DocLink
            text={formatMessage({
              id: 'pages.devices.list.connectivitySnmpCommand',
              defaultMessage:
                'Use the following documentation to connect the device through the SNMP.',
            })}
            href={DOC_URLS.snmp}
          />
        )}
        {selected === 'LWM2M' && (
          <DocLink
            text={formatMessage({
              id: 'pages.devices.list.connectivityLwm2mCommand',
              defaultMessage:
                'Use the following documentation to connect the device through the LwM2M.',
            })}
            href={DOC_URLS.lwm2m}
          />
        )}
      </div>
    </Card>
  );
}

interface CommandPair {
  noSecLabel: string;
  noSec?: string | Array<string>;
  secLabel: string;
  sec?: string | Array<string>;
  secDoc?: { text: string; href: string };
}

/**
 * One OS tab body: install hint + the plain/secure command switcher.
 * Secure-side 'Check documentation' (or an absent command) falls back to
 * the documentation link instead of a command block.
 */
function OsCommandBody({
  installHint,
  installCommand,
  installDoc,
  pair,
}: {
  installHint?: string;
  installCommand?: string;
  installDoc?: { text: string; href: string };
  pair: CommandPair;
}) {
  const { formatMessage } = useIntl();
  const useSecure =
    pair.noSec === undefined ||
    (pair.sec !== undefined && pair.noSec === undefined);
  const [secure, setSecure] = useState(useSecure);
  const command = secure ? pair.sec : pair.noSec;
  const showInstall = installHint || installCommand || installDoc;

  return (
    <div className="flex flex-col gap-3 py-2">
      {showInstall && (
        <Card
          size="small"
          title={formatMessage({
            id: 'pages.devices.list.connectivityInstallTools',
            defaultMessage: 'Install necessary client tools',
          })}
        >
          {installHint && <Typography.Text>{installHint}</Typography.Text>}
          {installCommand && <CommandBlock command={installCommand} />}
          {installDoc && (
            <DocLink text={installDoc.text} href={installDoc.href} />
          )}
        </Card>
      )}
      <Card
        size="small"
        title={formatMessage({
          id: 'pages.devices.list.connectivityExecuteCommand',
          defaultMessage: 'Execute the following command',
        })}
      >
        {pair.noSec !== undefined && pair.sec !== undefined && (
          <Segmented
            className="mb-3"
            value={secure ? 'sec' : 'noSec'}
            onChange={(value) => setSecure(value === 'sec')}
            options={[
              { label: pair.noSecLabel, value: 'noSec' },
              { label: pair.secLabel, value: 'sec' },
            ]}
          />
        )}
        {command === CHECK_DOCUMENTATION || command === undefined ? (
          pair.secDoc ? (
            <DocLink text={pair.secDoc.text} href={pair.secDoc.href} />
          ) : (
            <DocLink
              text={formatMessage({
                id: 'pages.devices.list.connectivityCheckDocs',
                defaultMessage:
                  'Check the documentation for connection instructions.',
              })}
              href="https://thingsboard.io/docs/user-guide/device-connectivity/"
            />
          )
        ) : Array.isArray(command) ? (
          command.map((entry) => <CommandBlock key={entry} command={entry} />)
        ) : (
          <CommandBlock command={command} />
        )}
      </Card>
    </div>
  );
}

function CommandBlock({ command }: { command: string }) {
  return (
    <Typography.Paragraph
      className="mb-2"
      copyable={{ text: command }}
      style={{ margin: 0 }}
    >
      <pre
        className="mb-0 overflow-auto"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
      >
        {command}
      </pre>
    </Typography.Paragraph>
  );
}

function DocLink({ text, href }: { text: string; href: string }) {
  const { formatMessage } = useIntl();
  return (
    <div className="flex items-center justify-between gap-3">
      <Typography.Text>{text}</Typography.Text>
      <Button href={href} target="_blank" rel="noreferrer">
        {formatMessage({
          id: 'pages.devices.list.connectivityDocumentation',
          defaultMessage: 'Documentation',
        })}
      </Button>
    </div>
  );
}

function DeviceStateAndTelemetry({ deviceId }: { deviceId: string }) {
  const { formatMessage } = useIntl();
  const entityId = useMemo(
    () => ({ entityType: EntityType.DEVICE, id: deviceId }),
    [deviceId],
  );
  const active = useAttributeSubscription({
    entityId,
    scope: AttributeScope.SERVER_SCOPE,
    keys: ['active'],
  });
  const telemetry = useLatestTelemetrySubscription({
    entityId,
    timeWindowMs: 3_600_000,
  });
  const activeValue = active.data.find((entry) => entry.key === 'active')
    ?.value as boolean | undefined;
  const rows = telemetry.data.map((entry, index) => ({
    key: `${entry.key}-${index}`,
    time: entry.lastUpdateTs,
    keyName: entry.key,
    value: entry.value,
  }));

  return (
    <Card
      size="small"
      title={formatMessage({
        id: 'pages.devices.list.state',
        defaultMessage: 'State',
      })}
    >
      <div className="mb-3 flex items-center gap-2">
        {activeValue !== undefined && (
          <Tag color={activeValue ? 'success' : 'error'}>
            {formatMessage({
              id: activeValue
                ? 'pages.devices.list.active'
                : 'pages.devices.list.inactive',
              defaultMessage: activeValue ? 'Active' : 'Inactive',
            })}
          </Tag>
        )}
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'pages.devices.list.connectivityLatestTelemetry',
            defaultMessage: 'Latest telemetry',
          })}
        </Typography.Text>
      </div>
      <Table
        size="small"
        pagination={false}
        dataSource={rows}
        locale={{
          emptyText: formatMessage({
            id: 'pages.devices.list.connectivityNoTelemetry',
            defaultMessage: 'No latest telemetry',
          }),
        }}
        columns={[
          {
            title: formatMessage({
              id: 'pages.devices.list.connectivityTime',
              defaultMessage: 'Time',
            }),
            dataIndex: 'time',
            render: (value: number | undefined) =>
              value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
          },
          {
            title: formatMessage({
              id: 'pages.devices.list.connectivityKey',
              defaultMessage: 'Key',
            }),
            dataIndex: 'keyName',
          },
          {
            title: formatMessage({
              id: 'pages.devices.list.connectivityValue',
              defaultMessage: 'Value',
            }),
            dataIndex: 'value',
            render: (value: unknown) => String(value),
          },
        ]}
      />
    </Card>
  );
}
