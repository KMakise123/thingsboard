/**
 * Asset CSV bulk-import wizard (DeviceImportModal shape, asset column set):
 * select file -> configuration + column mapping -> importing -> result.
 *
 * The file is read in the browser (file.text()) and parsed locally to build
 * the column drafts; the RAW CSV text is then posted as JSON
 * (BulkImportRequest.file carries the CSV itself — no multipart) to
 * POST /api/asset/bulk_import. BCR C-3: BulkImportResult.errorsList carries
 * plain strings without row numbers — shown verbatim, no invented structure.
 */
import { InboxOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Modal,
  Select,
  Space,
  Spin,
  Steps,
  Table,
  Typography,
  Upload,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { importAssets } from '@/services/tb/asset';
import type { BulkImportResult, CsvDelimiter } from '@/types/tb';
import {
  ASSET_COLUMN_TYPES,
  type AssetColumnMappingDraft,
  type AssetColumnType,
  buildAssetColumnDrafts,
  CSV_DELIMITERS,
  isKeyedAssetColumnType,
  parseCsv,
  toAssetBulkImportRequest,
} from './csv-import';

const STEP_FILE = 0;
const STEP_CONFIG = 1;
const STEP_IMPORTING = 2;
const STEP_RESULT = 3;

export interface AssetImportModalProps {
  open: boolean;
  onClose: () => void;
  /** Fires when the import finished (list invalidates + toasts). */
  onImported: (result: BulkImportResult) => void;
}

interface SelectedFile {
  name: string;
  text: string;
}

export function AssetImportModal({
  open,
  onClose,
  onImported,
}: AssetImportModalProps) {
  const { formatMessage } = useIntl();
  const [step, setStep] = useState(STEP_FILE);
  const [file, setFile] = useState<SelectedFile>();
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(',');
  const [header, setHeader] = useState(true);
  const [update, setUpdate] = useState(true);
  const [drafts, setDrafts] = useState<Array<AssetColumnMappingDraft>>([]);
  const [result, setResult] = useState<BulkImportResult>();

  useEffect(() => {
    if (open) {
      setStep(STEP_FILE);
      setFile(undefined);
      setDelimiter(',');
      setHeader(true);
      setUpdate(true);
      setDrafts([]);
      setResult(undefined);
    }
  }, [open]);

  // Parsing is derived state: no side effects in render, errors surface
  // as a value the step renders (and blocks progression on).
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
            id: 'pages.assets.import.parseError',
            defaultMessage: 'Could not parse CSV: {message}',
          },
          { message: parseOutcome.message },
        )
      : undefined;
  const parsed = parseOutcome.status === 'ok' ? parseOutcome.parsed : undefined;

  // Rebuild drafts whenever the parse changes (file/delimiter/header).
  useEffect(() => {
    if (parsed) {
      setDrafts(buildAssetColumnDrafts(parsed, header));
    }
  }, [parsed, header]);

  const importMutation = useMutation({
    mutationFn: () =>
      importAssets(
        toAssetBulkImportRequest(file?.text ?? '', drafts, {
          delimiter,
          header,
          update,
        }),
      ),
    onSuccess: (imported) => {
      setResult(imported);
      setStep(STEP_RESULT);
    },
  });

  const gotoConfig = () => {
    if (!file || parseOutcome.status !== 'ok') {
      return;
    }
    setStep(STEP_CONFIG);
  };

  const startImport = () => {
    setStep(STEP_IMPORTING);
    importMutation.mutate();
  };

  const finish = () => {
    if (result) {
      onImported(result);
    }
    onClose();
  };

  const typeOptions = ASSET_COLUMN_TYPES.map((type) => ({
    value: type,
    label: formatMessage({
      id: `pages.assets.import.type.${type}`,
      defaultMessage: type,
    }),
  }));

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.assets.import.title',
        defaultMessage: 'Import assets',
      })}
      width={860}
      footer={null}
      destroyOnHidden
      onCancel={step === STEP_IMPORTING ? undefined : onClose}
      closable={step !== STEP_IMPORTING}
      maskClosable={false}
    >
      <Steps
        size="small"
        className="mb-6"
        current={step}
        items={[
          {
            title: formatMessage({
              id: 'pages.assets.import.stepFile',
              defaultMessage: 'Select a file',
            }),
          },
          {
            title: formatMessage({
              id: 'pages.assets.import.stepConfig',
              defaultMessage: 'Import configuration',
            }),
          },
          {
            title: formatMessage({
              id: 'pages.assets.import.stepColumns',
              defaultMessage: 'Select columns type',
            }),
          },
          {
            title: formatMessage({
              id: 'pages.assets.import.stepResult',
              defaultMessage: 'Import result',
            }),
          },
        ]}
      />
      {parseError && (
        <Alert className="mb-4" type="error" showIcon title={parseError} />
      )}
      {importMutation.isError && step !== STEP_RESULT && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          title={serverErrorText(importMutation.error)}
        />
      )}

      {step === STEP_FILE && (
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
                id: 'pages.assets.import.dropHint',
                defaultMessage:
                  'Drop a CSV file or click to select a file to upload.',
              })}
            </Typography.Text>
          </Upload.Dragger>
          {!file && (
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.assets.import.noFile',
                defaultMessage: 'No file selected',
              })}
            </Typography.Text>
          )}
          <ImportActions
            okText={formatMessage({
              id: 'pages.assets.import.next',
              defaultMessage: 'Next',
            })}
            okDisabled={!file}
            okOnClick={gotoConfig}
            onCancel={onClose}
          />
        </div>
      )}

      {step === STEP_CONFIG && parsed && (
        <div className="flex flex-col gap-4">
          <Card size="small" title={file?.name}>
            <Space wrap size="large">
              <div>
                <Typography.Text type="secondary">
                  {formatMessage({
                    id: 'pages.assets.import.delimiter',
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
                  id: 'pages.assets.import.header',
                  defaultMessage: 'First line contains column names',
                })}
              </Checkbox>
              <Checkbox
                checked={update}
                onChange={(event) => setUpdate(event.target.checked)}
              >
                {formatMessage({
                  id: 'pages.assets.import.update',
                  defaultMessage:
                    'Update existing assets (attributes / telemetry)',
                })}
              </Checkbox>
            </Space>
          </Card>
          <Table
            size="small"
            rowKey={(record) => record.header}
            pagination={false}
            dataSource={drafts}
            columns={[
              {
                title: formatMessage({
                  id: 'pages.assets.import.columnSample',
                  defaultMessage: 'Example value data',
                }),
                dataIndex: 'sample',
                render: (value: string | undefined) => value || '-',
              },
              {
                title: formatMessage({
                  id: 'pages.assets.import.columnType',
                  defaultMessage: 'Column type',
                }),
                dataIndex: 'type',
                width: 220,
                render: (_value: AssetColumnType, record, index) => (
                  <Select
                    style={{ width: '100%' }}
                    value={record.type}
                    options={typeOptions}
                    onChange={(next) => {
                      setDrafts((previous) =>
                        previous.map((draft, draftIndex) =>
                          draftIndex === index
                            ? { ...draft, type: next as AssetColumnType }
                            : draft,
                        ),
                      );
                    }}
                  />
                ),
              },
              {
                title: formatMessage({
                  id: 'pages.assets.import.columnKey',
                  defaultMessage: 'Attribute/telemetry key',
                }),
                dataIndex: 'key',
                render: (value: string | undefined, _record, index) =>
                  isKeyedAssetColumnType(drafts[index]?.type) ? (
                    <ImportKeyInput
                      value={value}
                      onChange={(next) => {
                        setDrafts((previous) =>
                          previous.map((draft, draftIndex) =>
                            draftIndex === index
                              ? { ...draft, key: next }
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
          <ImportActions
            onBack={() => setStep(STEP_FILE)}
            okText={formatMessage({
              id: 'pages.assets.import.start',
              defaultMessage: 'Import',
            })}
            okOnClick={startImport}
            onCancel={onClose}
          />
        </div>
      )}

      {step === STEP_IMPORTING && (
        <div className="flex flex-col items-center gap-4 py-10">
          <Spin />
          <Typography.Text>
            {formatMessage({
              id: 'pages.assets.import.running',
              defaultMessage: 'Importing…',
            })}
          </Typography.Text>
        </div>
      )}

      {step === STEP_RESULT && result && (
        <div className="flex flex-col gap-4">
          <Space size="large" wrap>
            <Statistic
              title={formatMessage(
                {
                  id: 'pages.assets.import.created',
                  defaultMessage: 'Created {count}',
                },
                { count: result.created },
              )}
              value={result.created}
            />
            <Statistic
              title={formatMessage(
                {
                  id: 'pages.assets.import.updated',
                  defaultMessage: 'Updated {count}',
                },
                { count: result.updated },
              )}
              value={result.updated}
            />
            <Statistic
              danger={result.errors > 0}
              title={formatMessage(
                {
                  id: 'pages.assets.import.errors',
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
                id: 'pages.assets.import.errorsList',
                defaultMessage: 'Error details',
              })}
            >
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap">
                {result.errorsList.join('\n')}
              </pre>
            </Card>
          )}
          <ImportActions
            okText={formatMessage({
              id: 'pages.assets.import.finish',
              defaultMessage: 'Finish',
            })}
            okOnClick={finish}
            onCancel={finish}
          />
        </div>
      )}
    </Modal>
  );
}

/** Small controlled input so the key column does not fight Table rendering. */
function ImportKeyInput({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="ant-input"
      style={{ width: '100%' }}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ImportActions({
  onBack,
  okText,
  okDisabled,
  okOnClick,
  onCancel,
}: {
  onBack?: () => void;
  okText: string;
  okDisabled?: boolean;
  okOnClick: () => void;
  onCancel: () => void;
}) {
  const { formatMessage } = useIntl();
  return (
    <div className="flex items-center justify-between gap-2 border-t border-t-solid pt-4">
      <Button onClick={onCancel}>
        {formatMessage({
          id: 'pages.assets.import.cancel',
          defaultMessage: 'Cancel',
        })}
      </Button>
      <div className="flex gap-2">
        {onBack && (
          <Button onClick={onBack}>
            {formatMessage({
              id: 'pages.assets.import.back',
              defaultMessage: 'Back',
            })}
          </Button>
        )}
        <Button type="primary" disabled={okDisabled} onClick={okOnClick}>
          {okText}
        </Button>
      </div>
    </div>
  );
}

/** Local stat block (avoids pulling ProComponents StatisticCard here). */
function Statistic({
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
