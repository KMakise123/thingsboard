declare module '*.css';
declare module '*.less';
declare module '*.scss';
declare module '*.sass';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.bmp';
declare module '*.tiff';
declare module '*.md' {
  const content: string;
  export default content;
}

// TEMP(auth wave): interim auth shapes kept compiling after the scaffold
// openapi services were removed. The real ThingsBoard user types live in
// src/types/tb and will replace this namespace.
declare namespace API {
  type CurrentUser = {
    name?: string;
    avatar?: string;
    email?: string;
    /** Authority name (SYS_ADMIN / TENANT_ADMIN / CUSTOMER_USER). */
    access?: string;
  };

  type LoginResult = {
    status?: string;
    type?: string;
  };

  type LoginParams = {
    username?: string;
    password?: string;
    type?: string;
  };
}

declare const __APP_VERSION__: string;
declare const __UMI_VERSION__: string;
declare const __UTOO_VERSION__: string;
