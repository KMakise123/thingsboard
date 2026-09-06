/**
 * Version control — standalone tenant page (M14 wave-6, R03/R20,
 * spec 6.2-1, ngx /features/vc parity). Two-stage gate on the shared
 * `['vc-repo-info']` query (contract #11): unconfigured → the SHARED
 * RepositorySettingsForm (R22, detailsMode) with a "go to settings" jump
 * (spec 6.2-10); configured → the repository-wide versions table with the
 * complex create / restore panels. The dirty-leave confirm comes from the
 * shared form's own beforeunload guard (react-router 6.3 has no route
 * blocker — established equivalent).
 */
import { useQuery } from '@tanstack/react-query';
import { history } from '@umijs/max';
import { Alert, Button, Spin } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import type { BranchInfo, EntityVersion } from '@/services/tb/version-control';
import {
  getRepositorySettingsInfo,
  listBranches,
} from '@/services/tb/version-control';
import ComplexCreateModal from '../components/complex-create-modal';
import ComplexRestoreModal from '../components/complex-restore-modal';
import RepositorySettingsForm from '../components/repository-settings-form';
import VersionsTable from '../components/versions-table';

export default function VersionControlPage() {
  const { formatMessage } = useIntl();

  // Same query keys the shared form / table use — configure-in-gate flips
  // the stage, commits refresh the branch options everywhere.
  const infoQuery = useQuery({
    queryKey: ['vc-repo-info'],
    queryFn: getRepositorySettingsInfo,
  });
  const branchesQuery = useQuery({
    queryKey: ['vc-branches'],
    queryFn: listBranches,
    enabled: infoQuery.data?.configured === true,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState<EntityVersion | null>(
    null,
  );
  const [currentBranch, setCurrentBranch] = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);

  if (infoQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }
  if (infoQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message={formatMessage({
          id: 'pages.versionControl.loadFailed',
          defaultMessage: 'Version control is unavailable',
        })}
        description={serverErrorText(infoQuery.error)}
      />
    );
  }
  if (!infoQuery.data.configured) {
    return (
      <PageContainer
        title={formatMessage({
          id: 'menu.versionControl',
          defaultMessage: 'Version control',
        })}
      >
        <div className="flex flex-col gap-4">
          <Alert
            type="info"
            showIcon
            message={formatMessage({
              id: 'pages.versionControl.gateHint',
              defaultMessage:
                'Version control needs a Git repository configured for the tenant.',
            })}
            description={
              <Button
                type="link"
                className="!px-0"
                onClick={() => history.push('/settings/repository')}
              >
                {formatMessage({
                  id: 'pages.versionControl.goToSettings',
                  defaultMessage: 'Configure it in the repository settings',
                })}
              </Button>
            }
          />
          <RepositorySettingsForm detailsMode />
        </div>
      </PageContainer>
    );
  }

  const readOnly = infoQuery.data.readOnly === true;
  const branches: Array<BranchInfo> = branchesQuery.data ?? [];

  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.versionControl',
        defaultMessage: 'Version control',
      })}
    >
      <div className="flex flex-col gap-4">
        {readOnly && (
          <Alert
            type="warning"
            showIcon
            message={formatMessage({
              id: 'pages.versionControl.readOnlyBanner',
              defaultMessage:
                'The repository is read-only: creating versions is disabled until the repository settings turn it off.',
            })}
          />
        )}
        <VersionsTable
          readOnly={readOnly}
          onCreateVersion={() => setCreateOpen(true)}
          onRestore={setRestoreVersion}
          onBranchChange={setCurrentBranch}
          refreshSignal={refreshSignal}
        />
      </div>

      <ComplexCreateModal
        open={createOpen}
        branch={currentBranch}
        branches={branches}
        readOnly={readOnly}
        onClose={() => setCreateOpen(false)}
        onCommitted={() => setRefreshSignal((signal) => signal + 1)}
      />

      <ComplexRestoreModal
        open={!!restoreVersion}
        versionId={restoreVersion?.id ?? ''}
        versionName={restoreVersion?.name}
        onClose={() => setRestoreVersion(null)}
        onRestored={() => setRefreshSignal((signal) => signal + 1)}
      />
    </PageContainer>
  );
}
