import { SelectLang } from '@umijs/max';
import { createStyles } from 'antd-style';
import React from 'react';
import { brand } from '@/theme/brand';

/**
 * Shared shell for the login family (ui-ngx modules/login pages): brand
 * background, centered card, logo/title and the locale switcher. Brand
 * values only come from src/theme/brand (issue #8 single-source rule).
 */
const useStyles = createStyles(({ token, css }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: auto;
    ${
      brand.assets.loginBackground
        ? `background-image: url(${brand.assets.loginBackground});
           background-size: 100% 100%;`
        : `background: linear-gradient(
             150deg,
             ${token.colorPrimaryBg} 0%,
             ${token.colorBgContainer} 55%,
             ${token.colorPrimaryBgHover} 100%
           );`
    }
  `,
  lang: css`
    position: fixed;
    top: 16px;
    right: 16px;
    width: 42px;
    height: 42px;
    line-height: 42px;
    border-radius: ${token.borderRadius}px;
    text-align: center;
    cursor: pointer;
    &:hover {
      background-color: ${token.colorBgTextHover};
    }
  `,
  card: css`
    width: 420px;
    max-width: 92vw;
    margin: auto;
    padding: 32px 32px 24px;
    background-color: ${token.colorBgContainer};
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: ${token.boxShadowTertiary};
  `,
  header: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
  `,
  logo: css`
    height: 44px;
    max-width: 180px;
    object-fit: contain;
  `,
  title: css`
    margin: 0;
    color: ${token.colorTextHeading};
    font-size: ${token.fontSizeHeading4}px;
    font-weight: 600;
  `,
  subTitle: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSize}px;
    text-align: center;
  `,
}));

export interface AuthShellProps {
  /** Line under the brand name (page purpose). */
  subTitle?: React.ReactNode;
  /** Page heading below the brand header (e.g. "Reset password"). */
  title?: React.ReactNode;
  children: React.ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({
  subTitle,
  title,
  children,
}) => {
  const { styles } = useStyles();
  return (
    <div className={styles.container}>
      <div className={styles.lang} data-lang>
        {SelectLang && <SelectLang />}
      </div>
      <div className={styles.card}>
        <div className={styles.header}>
          <img
            className={styles.logo}
            src={brand.assets.logo}
            alt={brand.assets.appName}
          />
          <div className={styles.title}>{brand.assets.appName}</div>
          {subTitle && <div className={styles.subTitle}>{subTitle}</div>}
        </div>
        {title && (
          <div className={styles.subTitle} style={{ marginBottom: 16 }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
