/**
 * Profile export (ui-ngx import-export parity): fetch the full profile
 * (with inlined images), strip the server-owned fields, force the default
 * flag off, and download `{name}.json` — exactly prepareProfileExport.
 */

import { getAssetProfileById } from '@/services/tb/asset-profile';
import { getDeviceProfileById } from '@/services/tb/device-profile';
import type { AssetProfile } from '@/types/tb/asset-profile';
import type { DeviceProfile } from '@/types/tb/device-profile';

type Profile = DeviceProfile | AssetProfile;

/** prepareExport: drop identity/audit fields the import flow reassigns. */
function prepareExport(profile: Profile): Profile {
  const clone = JSON.parse(JSON.stringify(profile)) as Profile;
  delete (clone as Partial<Profile>).id;
  delete (clone as Partial<Profile>).tenantId;
  delete (clone as Partial<Profile>).createdTime;
  delete (clone as Partial<Profile>).version;
  delete (clone as Partial<Profile>).externalId;
  return clone;
}

function downloadJson(profile: Profile): void {
  const data = { ...prepareExport(profile), default: false };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${profile.name}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Export a device profile as a portable JSON file. */
export async function exportDeviceProfile(profileId: string): Promise<void> {
  const profile = await getDeviceProfileById(profileId, { inlineImages: true });
  downloadJson(profile);
}

/** Export an asset profile as a portable JSON file. */
export async function exportAssetProfile(profileId: string): Promise<void> {
  const profile = await getAssetProfileById(profileId, { inlineImages: true });
  downloadJson(profile);
}
