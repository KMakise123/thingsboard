import { FormattedMessage } from '@umijs/max';
import { Card, Result } from 'antd';

/**
 * Temporary sys-admin home (M1). SA has no tenant menu and /devices would
 * 403, so login lands here with a notice; the sys-domain pages (tenants,
 * tenant profiles, settings) arrive in M3 and /home disappears from routes.
 */
const Home: React.FC = () => (
  <Card variant="borderless">
    <Result
      status="info"
      title={<FormattedMessage id="pages.home.sysPending.title" />}
      subTitle={<FormattedMessage id="pages.home.sysPending.description" />}
    />
  </Card>
);

export default Home;
