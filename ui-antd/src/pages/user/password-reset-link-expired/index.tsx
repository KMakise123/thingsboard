import React from 'react';

import { LinkExpired } from '../components/link-expired';

/** /user/password-reset-link-expired — backend 303 target for expired resets. */
const PasswordResetLinkExpired: React.FC = () => (
  <LinkExpired variant="passwordReset" />
);

export default PasswordResetLinkExpired;
