import { Card, Typography } from 'antd';

/**
 * Placeholder owned by the shell wave (routes must resolve). The devices
 * wave overwrites this file with the real detail page — do not build on it.
 */
const DevicesDetailPlaceholder: React.FC = () => (
  <Card>
    <Typography.Title level={3}>Device detail</Typography.Title>
    <Typography.Paragraph type="secondary">
      Under development by the devices wave (M1). This placeholder only
      anchors the route.
    </Typography.Paragraph>
  </Card>
);

export default DevicesDetailPlaceholder;
