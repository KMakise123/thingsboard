import type { ProLayoutProps } from '@ant-design/pro-components';
import { brand } from '../src/theme/brand/config';

/**
 * ProLayout settings. Brand values (title, logo, primary color, fonts) are
 * read from src/theme/brand — the white-labeling seam. Do not hardcode
 * brand values here.
 */
const Settings: ProLayoutProps & {
  logo?: string;
} = {
  navTheme: 'light',
  colorPrimary: brand.seedTokens.colorPrimary,
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  colorWeak: false,
  title: brand.assets.appName,
  logo: brand.assets.logo,
  iconfontUrl: '',
  token: {
    // ProLayout token entries must derive from src/theme/brand when used.
    // https://procomponents.ant.design/components/layout
  },
};

export default Settings;
