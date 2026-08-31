import { FormattedMessage } from '@umijs/max';
import { Card, Typography } from 'antd';

/**
 * Temporary home placeholder so the shell stays runnable after the scaffold
 * demo pages were removed. The real landing page (device list per v1 spec)
 * replaces this in the M1 page wave.
 */
const Home: React.FC = () => (
  <Card>
    <Typography.Title level={3}>
      <FormattedMessage
        id="pages.home.placeholder.title"
        defaultMessage="v1 work in progress"
      />
    </Typography.Title>
    <Typography.Paragraph type="secondary">
      <FormattedMessage
        id="pages.home.placeholder.description"
        defaultMessage="Scaffold trimmed to the runnable skeleton. Business pages land with the M1 wave."
      />
    </Typography.Paragraph>
  </Card>
);

export default Home;
