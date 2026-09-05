/**
 * Edge CSV bulk-import dialog (R25, spec §5.1; ui-ngx import-dialog-csv in
 * its simplified single-config form — file + delimiter + header/update +
 * per-column type mapping, no stepper).
 *
 * The file is read in the browser and parsed locally to build the column
 * drafts; the RAW CSV text is posted as JSON (EdgeBulkImportRequest.file
 * carries the CSV itself — no multipart). CSV parsing/delimiter options are
 * shared with the device import (components/devices/csv-import — entity-
 * agnostic pure utils); the edge column set and header detection are edge
 * domain (types/tb/edge.ts ngx parity: NAME/TYPE/LABEL/DESCRIPTION +
 * ROUTING_KEY/SECRET + SERVER_ATTRIBUTE/TIMESERIES).
 */
import { InboxOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Typography,
  Upload,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  CSV_DELIMITERS,
  type ParsedCsv,
  parseCsv,
} from '@/components/devices/csv-import';
import { serverErrorText } from '@/components/entities/server-error-text';
import { importEdges } from '@/services/tb/edge';
import type { CsvDelimiter } from '@/types/tb/device';
import type {
  EdgeBulkImportColumnMapping,
  EdgeBulkImportRequest,
  EdgeBulkImportResult,
  EdgeImportColumnType,
} from '@/types/tb/edge';

const EDGE_COLUMN_TYPES: Array<EdgeImportColumnType> = [
  'NAME',
  'TYPE',
  'LABEL',
  'DESCRIPTION',
  'ROUTING_KEY',
  'SECRET',
  'SERVER_ATTRIBUTE',
  'TIMESERIES',
];

/** Column types that carry an attribute/telemetry key alongside the type. */
const KEYED_TYPES: ReadonlySet<string> = new Set([
  'SERVER_ATTRIBUTE',
  'TIMESERIES',
]);

/** Header-name -> column type auto-detection (ngx createColumnsData). */
const HEADER_TO_TYPE: ReadonlyMap<string, EdgeImportColumnType> = new Map([
  ['name', 'NAME'],
  ['type', 'TYPE'],
  ['label', 'LABEL'],
  ['description', 'DESCRIPTION'],
  ['routing_key', 'ROUTING_KEY'],
  ['secret', 'SECRET'],
  ['server_attribute', 'SERVER_ATTRIBUTE'],
  ['timeseries', 'TIMESERIES'],
]);

export interface EdgeColumnDraft {
  type: EdgeImportColumnType;
  /** Attribute/telemetry key (only meaningful for KEYED_TYPES). */
  key?: string;
  header: string;
  sample?: string;
}

/** Initial mapping for the dialog, auto-detecting types from headers; the first two columns fall back to NAME/TYPE. */
export function buildEdgeColumnDrafts(
  parsed: ParsedCsv,
  header: boolean,
): Array<EdgeColumnDraft> {
  return parsed.headers.map((headerName, index) => {
    const detected = header
      ? HEADER_TO_TYPE.get(headerName.trim().toLowerCase())
      : undefined;
    const type: EdgeImportColumnType =
      detected ?? (index === 0 ? 'NAME' : index === 1 ? 'TYPE' : 'NAME');
    return {
      type,
      key: KEYED_TYPES.has(type)
        ? header
          ? headerName.trim().toLowerCase()
          : ''
        : undefined,
      header: headerName,
      sample: parsed.rows[0]?.[index],
    };
  });
}

/** Column-mapping form value -> EdgeBulkImportRequest (JSON wire contract). */
export function toEdgeBulkImportRequest(
  fileText: string,
  drafts: Array<EdgeColumnDraft>,
  options: { delimiter: CsvDelimiter; header: boolean; update: boolean },
): EdgeBulkImportRequest {
  const columns: Array<EdgeBulkImportColumnMapping> = drafts.map((draft) => ({
    type: draft.type,
    key: KEYED_TYPES.has(draft.type) ? draft.key : undefined,
  }));
  const wireDelimiter: EdgeBulkImportRequest['mapping']['delimiter'] =
    options.delimiter === 'TAB' ? '\t' : options.delimiter;
  return {
    file: fileText,
    mapping: {
      columns,
      delimiter: wireDelimiter,
      header: options.header,
      update: options.update,
    },
  };
}

export interface EdgeImportModalProps {
  open: boolean;
  onClose: () => void;
  /** Fires when the import finished (list invalidates + toasts). */
  onImported: (result: EdgeBulkImportResult) => void;
}

interface SelectedFile {
  name: string;
  text: string;
}

export function EdgeImportModal({
  open,
  onClose,
  onImported,
}: EdgeImportModalProps) {
  const { formatMessage } = useIntl();
  const [file, setFile] = useState<SelectedFile>();
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(',');
  const [header, setHeader] = useState(true);
  const [update, setUpdate] = useState(true);
  const [drafts, setDrafts] = useState<Array<EdgeColumnDraft>>([]);
  const [result, setResult] = useState<EdgeBulkImportResult>();

  useEffect(() => {
    if (open) {
      setFile(undefined);
      setDelimiter(',');
      setHeader(true);
      setUpdate(true);
      setDrafts([]);
      setResult(undefined);
    }
  }, [open]);

  const parseOutcome = useMemo(() => {
    if (!file) {
      return { status: 'no-file' as const };
    }
    try {
      return {
        status: 'ok' as const,
        parsed: parseCsv(file.text, { delimiter, header }),
      };
    } catch (error) {
      return { status: 'error' as const, message: (error as Error).message };
    }
  }, [file, delimiter, header]);

  const parseError =
    parseOutcome.status === 'error'
      ? formatMessage(
          {
            id: 'pages.edge.importParseError',
            defaultMessage: 'Could not parse CSV: {message}',
          },
          { message: parseOutcome.message },
        )
      : undefined;
  const parsed = parseOutcome.status === 'ok' ? parseOutcome.parsed : undefined;

  useEffect(() => {
    if (parsed) {
      setDrafts(buildEdgeColumnDrafts(parsed, header));
    }
  }, [parsed, header]);

  const importMutation = useMutation({
    mutationFn: () =>
      importEdges(
        toEdgeBulkImportRequest(file?.text ?? '', drafts, {
          delimiter,
          header,
          update,
        }),
      ),
    onSuccess: (imported) => setResult(imported),
  });

  const finish = () => {
    if (result) {
      onImported(result);
    }
    onClose();
  };

  const typeOptions = EDGE_COLUMN_TYPES.map((type) => ({
    value: type,
    label: formatMessage({
      id: `pages.edge.importType.${type}`,
      defaultMessage: type,
    }),
  }));

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.edge.import',
        defaultMessage: 'Import edges',
      })}
      width={860}
      footer={null}
      destroyOnHidden
      onCancel={importMutation.isPending ? undefined : onClose}
      closable={!importMutation.isPending}
      maskClosable={false}
    >
      {parseError && (
        <Alert className="mb-4" type="error" showIcon title={parseError} />
      )}
      {importMutation.isError && !result && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          title={serverErrorText(importMutation.error)}
        />
      )}

      {result ? (
        <div className="flex flex-col gap-4">
          <Space size="large" wrap>
            <ImportStat
              title={formatMessage(
                {
                  id: 'pages.edge.importCreated',
                  defaultMessage: 'Created {count}',
                },
                { count: result.created },
              )}
              value={result.created}
            />
            <ImportStat
              title={formatMessage(
                {
                  id: 'pages.edge.importUpdated',
                  defaultMessage: 'Updated {count}',
                },
                { count: result.updated },
              )}
              value={result.updated}
            />
            <ImportStat
              danger={result.errors > 0}
              title={formatMessage(
                {
                  id: 'pages.edge.importErrors',
                  defaultMessage: 'Errors {count}',
                },
                { count: result.errors },
              )}
              value={result.errors}
            />
          </Space>
          {result.errorsList.length > 0 && (
            <Card
              size="small"
              title={formatMessage({
                id: 'pages.edge.importErrorsList',
                defaultMessage: 'Error details',
              })}
            >
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap">
                {result.errorsList.join('\n')}
              </pre>
            </Card>
          )}
          <div className="flex justify-end">
            <Button type="primary" onClick={finish}>
              {formatMessage({
                id: 'pages.edge.importFinish',
                defaultMessage: 'Finish',
              })}
            </Button>
          </div>
        </div>
      ) : importMutation.isPending ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <Spin />
          <Typography.Text>
            {formatMessage({
              id: 'pages.edge.importRunning',
              defaultMessage: 'Importing…',
            })}
          </Typography.Text>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Upload.Dragger
            accept=".csv,text/csv"
            maxCount={1}
            showUploadList={!!file}
            fileList={
              file ? [{ uid: 'csv', name: file.name, status: 'done' }] : []
            }
            beforeUpload={async (selected) => {
              const text = await selected.text();
              setFile({ name: selected.name, text });
              return false;
            }}
            onRemove={() => setFile(undefined)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <Typography.Text>
              {formatMessage({
                id: 'pages.edge.importDropHint',
                defaultMessage:
                  'Drop a CSV file or click to select a file to upload.',
              })}
            </Typography.Text>
          </Upload.Dragger>
          {!file && (
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.edge.importNoFile',
                defaultMessage: 'No file selected',
              })}
            </Typography.Text>
          )}
          <Card size="small">
            <Space wrap size="large">
              <div>
                <Typography.Text type="secondary">
                  {formatMessage({
                    id: 'pages.edge.importDelimiter',
                    defaultMessage: 'CSV delimiter',
                  })}
                </Typography.Text>
                <Select
                  className="ml-3 w-24"
                  value={delimiter}
                  onChange={setDelimiter}
                  options={CSV_DELIMITERS}
                />
              </div>
              <Checkbox
                checked={header}
                onChange={(event) => setHeader(event.target.checked)}
              >
                {formatMessage({
                  id: 'pages.edge.importHeader',
                  defaultMessage: 'First line contains column names',
                })}
              </Checkbox>
              <Checkbox
                checked={update}
                onChange={(event) => setUpdate(event.target.checked)}
              >
                {formatMessage({
                  id: 'pages.edge.importUpdate',
                  defaultMessage:
                    'Update existing edges (attributes / telemetry)',
                })}
              </Checkbox>
            </Space>
          </Card>
          {parsed && (
            <Table
              size="small"
              rowKey={(record) => record.header}
              pagination={false}
              dataSource={drafts}
              columns={[
                {
                  title: formatMessage({
                    id: 'pages.edge.importColumnSample',
                    defaultMessage: 'Example value data',
                  }),
                  dataIndex: 'sample',
                  render: (value: string | undefined) => value || '-',
                },
                {
                  title: formatMessage({
                    id: 'pages.edge.importColumnType',
                    defaultMessage: 'Column type',
                  }),
                  dataIndex: 'type',
                  width: 220,
                  render: (_value: EdgeImportColumnType, _record, index) => (
                    <Select
                      style={{ width: '100%' }}
                      value={drafts[index]?.type}
                      options={typeOptions}
                      onChange={(next) => {
                        setDrafts((previous) =>
                          previous.map((draft, draftIndex) =>
                            draftIndex === index
                              ? {
                                  ...draft,
                                  type: next as EdgeImportColumnType,
                                  key: KEYED_TYPES.has(next)
                                    ? (draft.key ?? '')
                                    : undefined,
                                }
                              : draft,
                          ),
                        );
                      }}
                    />
                  ),
                },
                {
                  title: formatMessage({
                    id: 'pages.edge.importColumnKey',
                    defaultMessage: 'Attribute/telemetry key',
                  }),
                  dataIndex: 'key',
                  render: (value: string | undefined, _record, index) =>
                    KEYED_TYPES.has(drafts[index]?.type as string) ? (
                      <Input
                        value={value ?? ''}
                        onChange={(event) => {
                          setDrafts((previous) =>
                            previous.map((draft, draftIndex) =>
                              draftIndex === index
                                ? { ...draft, key: event.target.value }
                                : draft,
                            ),
                          );
                        }}
                      />
                    ) : (
                      '-'
                    ),
                },
              ]}
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <Button onClick={onClose}>
              {formatMessage({
                id: 'pages.edge.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
            <Button
              type="primary"
              disabled={!file || parseOutcome.status !== 'ok'}
              onClick={() => importMutation.mutate()}
            >
              {formatMessage({
                id: 'pages.edge.importStart',
                defaultMessage: 'Import',
              })}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Local stat block (DeviceImportModal parity, avoids StatisticCard). */
function ImportStat({
  title,
  value,
  danger,
}: {
  title: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-6">
      <Typography.Title
        level={3}
        type={danger ? 'danger' : undefined}
        className="mb-0"
      >
        {value}
      </Typography.Title>
      <Typography.Text type="secondary">{title}</Typography.Text>
    </div>
  );
}
