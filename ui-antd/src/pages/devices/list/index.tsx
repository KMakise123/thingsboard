import { Card, Typography } from 'antd';

/**
 * Placeholder owned by the shell wave (routes must resolve). The devices
 * wave overwrites this file with the real list page — do not build on it.
 */
const DevicesListPlaceholder: React.FC = () => (
  <Card>
    <Typography.Title level={3}>Devices list</Typography.Title>
    <Typography.Paragraph type="secondary">
      Under development by the devices wave (M1). This placeholder only
      anchors the route and the menu entry.
    </Typography.Paragraph>
  </Card>
);

export default DevicesListPlaceholder;
