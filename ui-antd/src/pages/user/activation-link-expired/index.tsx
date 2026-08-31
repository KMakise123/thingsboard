import React from 'react';

import { LinkExpired } from '../components/link-expired';

/** /user/activation-link-expired — backend 303 target for expired activations. */
const ActivationLinkExpired: React.FC = () => (
  <LinkExpired variant="activation" />
);

export default ActivationLinkExpired;
