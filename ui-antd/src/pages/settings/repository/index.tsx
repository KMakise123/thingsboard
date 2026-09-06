/**
 * System settings → Repository page (M14 wave-2, spec 6.3-6 前半).
 *
 * The settings-shell mount of the shared RepositorySettingsForm (R22) —
 * the same form backs the /versionControl and /settings/auto-commit
 * gates (waves 3/6), which is why the component lives in the VC domain
 * directory. Delete IS offered here (detailsMode=false).
 */
import RepositorySettingsForm from '@/pages/version-control/components/repository-settings-form';

export default function SettingsRepositoryPage() {
  return (
    <div className="flex flex-col gap-4">
      <RepositorySettingsForm />
    </div>
  );
}
