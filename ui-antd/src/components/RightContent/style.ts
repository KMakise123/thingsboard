import { createStyles } from 'antd-style';

const useHeaderActionStyles = createStyles(({ token, css }) => ({
  action: css`
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 36px !important;
    min-width: 36px;
    padding-inline: 8px !important;
    padding-block: 0 !important;
    border-radius: ${token.borderRadius}px !important;
  `,
  // Token-driven success color for the current-locale check mark (replaces
  // the scaffold's inline hex).
  active: css`
    color: ${token.colorSuccess};
  `,
}));

export default useHeaderActionStyles;
