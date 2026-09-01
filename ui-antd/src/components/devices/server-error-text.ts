/**
 * One exit for backend errors in device dialogs/toasts (Wave1 rule: errors
 * are ServerError-shaped; pages never destructure raw responses). The
 * human text prefers the server detail; the titleKey is an i18n key that
 * the error-code vocabulary (auth wave) will translate later.
 */
import { ServerErrorError } from '@/core/http/server-error';

export function serverErrorText(error: unknown): string {
  if (error instanceof ServerErrorError) {
    return error.detail || error.titleKey;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
