/** settings-domain copy (mirrors ui-ngx locale.constant-en_US.json admin.*). */
export default {
  'pages.settings.common.undo': 'Undo',
  'pages.settings.common.save': 'Save',
  'pages.settings.common.saveFailed': 'Failed to save the settings.',

  'pages.settings.general.generalTitle': 'General settings',
  'pages.settings.general.baseUrl': 'Base URL',
  'pages.settings.general.baseUrlRequired': 'Base URL is required.',
  'pages.settings.general.prohibitDifferentUrl':
    'Prohibit hostname from client request headers',
  'pages.settings.general.prohibitDifferentUrlHint':
    'This setting should be enabled in production. Disabling it may lead to security issues.',
  'pages.settings.general.toastSaved': 'General settings saved.',
  'pages.settings.general.connectivityTitle': 'Device connectivity',
  'pages.settings.general.connectivityHint':
    'If the host or port fields are empty, the default protocol values will be used.',
  'pages.settings.general.toastConnectivitySaved':
    'Device connectivity settings saved.',
  'pages.settings.general.host': 'Host',
  'pages.settings.general.port': 'Port',
  'pages.settings.general.portRange': 'Port should be in the range 1 to 65535.',
  'pages.settings.general.group.http': 'HTTP(s)',
  'pages.settings.general.group.mqtt': 'MQTT(s)',
  'pages.settings.general.group.coap': 'COAP(s)',
  'pages.settings.general.protocol.http': 'HTTP',
  'pages.settings.general.protocol.https': 'HTTPs',
  'pages.settings.general.protocol.mqtt': 'MQTT',
  'pages.settings.general.protocol.mqtts': 'MQTTs',
  'pages.settings.general.protocol.coap': 'COAP',
  'pages.settings.general.protocol.coaps': 'COAPs',

  'pages.settings.mail.title': 'Outgoing mail settings',
  'pages.settings.mail.toastSaved': 'Mail settings saved.',
  'pages.settings.mail.mailFrom': 'Mail From',
  'pages.settings.mail.mailFromRequired': 'Mail From is required.',
  'pages.settings.mail.smtpProvider': 'SMTP provider',
  'pages.settings.mail.customProvider': 'Custom',
  'pages.settings.mail.connectionSettings': 'Connection settings',
  'pages.settings.mail.smtpProtocol': 'SMTP protocol',
  'pages.settings.mail.smtpHost': 'SMTP host',
  'pages.settings.mail.smtpHostRequired': 'SMTP host is required.',
  'pages.settings.mail.smtpPort': 'SMTP port',
  'pages.settings.mail.smtpPortRequired': 'SMTP port is required.',
  'pages.settings.mail.timeout': 'Timeout (msec)',
  'pages.settings.mail.timeoutRequired': 'Timeout is required.',
  'pages.settings.mail.enableTls': 'Enable TLS',
  'pages.settings.mail.tlsVersion': 'TLS version',
  'pages.settings.mail.enableProxy': 'Enable proxy',
  'pages.settings.mail.proxyHost': 'Proxy host',
  'pages.settings.mail.proxyHostRequired': 'Proxy host is required.',
  'pages.settings.mail.proxyPort': 'Proxy port',
  'pages.settings.mail.proxyPortRequired': 'Proxy port is required.',
  'pages.settings.mail.proxyUser': 'Proxy user',
  'pages.settings.mail.proxyPassword': 'Proxy password',
  'pages.settings.mail.authentication': 'Authentication',
  'pages.settings.mail.username': 'Username',
  'pages.settings.mail.authMethod': 'Authentication method',
  'pages.settings.mail.basic': 'Basic',
  'pages.settings.mail.oauth2': 'OAuth 2.0',
  'pages.settings.mail.changePassword': 'Change password',
  'pages.settings.mail.password': 'Password',
  'pages.settings.mail.clientId': 'Client ID',
  'pages.settings.mail.clientIdRequired': 'Client ID is required.',
  'pages.settings.mail.clientSecret': 'Client secret',
  'pages.settings.mail.clientSecretRequired': 'Client secret is required.',
  'pages.settings.mail.microsoftTenantId': 'Directory (tenant) Id',
  'pages.settings.mail.microsoftTenantIdRequired':
    'Directory (tenant) Id is required.',
  'pages.settings.mail.advancedSettings': 'Advanced settings',
  'pages.settings.mail.authUri': 'Authorization URI',
  'pages.settings.mail.uriRequired': 'Authorization URI is required.',
  'pages.settings.mail.tokenUri': 'Token URI',
  'pages.settings.mail.tokenUriRequired': 'Token URI is required.',
  'pages.settings.mail.uriPatternError': 'URI is invalid.',
  'pages.settings.mail.scope': 'Scope',
  'pages.settings.mail.scopeRequired': 'Scope is required.',
  'pages.settings.mail.redirectUri': 'Redirect URI',
  'pages.settings.mail.protocol': 'Protocol',
  'pages.settings.mail.domainName': 'Domain name',
  'pages.settings.mail.domainNameRequired': 'Domain name is required.',
  'pages.settings.mail.domainNameInvalid':
    'Domain name should not contain "/" and ":". For example: thingsboard.io',
  'pages.settings.mail.redirectUriTemplate': 'Redirect URI template',
  'pages.settings.mail.copied': 'Copied to clipboard.',
  'pages.settings.mail.accessTokenStatus': 'Access token status:',
  'pages.settings.mail.tokenStatusGenerated': 'Generated',
  'pages.settings.mail.tokenStatusNotGenerated': 'Not generated',
  'pages.settings.mail.generateAccessToken': 'Generate access token',
  'pages.settings.mail.updateAccessToken': 'Update access token',
  'pages.settings.mail.tokenGenerateFailed': 'Failed to start the OAuth2 flow.',
  'pages.settings.mail.sendTestMail': 'Send test mail',
  'pages.settings.mail.toastTestMailSent': 'Test mail has been sent!',
  'pages.settings.mail.testMailFailed': 'Failed to send the test mail.',

  'pages.settings.twoFa.title': 'Two-factor authentication',
  'pages.settings.twoFa.toastSaved': 'Two-factor auth settings saved.',
  'pages.settings.twoFa.force2fa': 'Enforce two-factor authentication',
  'pages.settings.twoFa.enforceFor': 'Enforce for',
  'pages.settings.twoFa.allUsers': 'All users',
  'pages.settings.twoFa.tenantAdministrators': 'Tenant administrators',
  'pages.settings.twoFa.systemAdministrators': 'System administrators',
  'pages.settings.twoFa.tenants': 'Tenants',
  'pages.settings.twoFa.tenantProfiles': 'Tenant profiles',
  'pages.settings.twoFa.idListHint': 'Leave empty to apply to all.',
  'pages.settings.twoFa.idListPlaceholder': 'Enter UUIDs separated by commas',
  'pages.settings.twoFa.verificationLimitations': 'Verification limitations',
  'pages.settings.twoFa.maxVerificationFailures':
    'Max verification failures before user lockout',
  'pages.settings.twoFa.totalAllowedTime':
    'Total allowed time for verification (sec)',
  'pages.settings.twoFa.totalAllowedTimeRequired':
    'Total allowed time is required.',
  'pages.settings.twoFa.totalAllowedTimeMin':
    'The minimum allowed total time is 60 sec.',
  'pages.settings.twoFa.minSendPeriod':
    'Min verification code send period (sec)',
  'pages.settings.twoFa.minSendPeriodRequired': 'Min send period is required.',
  'pages.settings.twoFa.minSendPeriodMin': 'The minimum period is 5 sec.',
  'pages.settings.twoFa.verificationCodeCheckRateLimit':
    'Verification code check rate limit',
  'pages.settings.twoFa.checkAttempts': 'Number of checking attempts',
  'pages.settings.twoFa.checkAttemptsRequired':
    'Number of checking attempts is required.',
  'pages.settings.twoFa.withinTime': 'Within time (sec)',
  'pages.settings.twoFa.withinTimeRequired': 'Time is required.',
  'pages.settings.twoFa.positiveInteger': 'Must be a non-negative integer.',
  'pages.settings.twoFa.availableProviders': 'Available providers',
  'pages.settings.twoFa.availableProvidersRequired':
    'At least one two-factor auth provider must be configured.',
  'pages.settings.twoFa.provider.TOTP': 'TOTP',
  'pages.settings.twoFa.provider.SMS': 'SMS',
  'pages.settings.twoFa.provider.EMAIL': 'Email',
  'pages.settings.twoFa.provider.BACKUP_CODE': 'Backup codes',
  'pages.settings.twoFa.issuerName': 'Issuer name',
  'pages.settings.twoFa.issuerNameRequired': 'Issuer name is required.',
  'pages.settings.twoFa.verificationMessageTemplate':
    'Verification message template',
  'pages.settings.twoFa.verificationMessageTemplateRequired':
    'Verification message template is required.',
  'pages.settings.twoFa.verificationMessageTemplatePattern': `Verification message needs to contain pattern: ${'$'}{code}.`,
  'pages.settings.twoFa.verificationCodeLifetime':
    'Verification code lifetime (sec)',
  'pages.settings.twoFa.verificationCodeLifetimeRequired':
    'Verification code lifetime is required.',
  'pages.settings.twoFa.numberOfCodes': 'Number of verification codes',
  'pages.settings.twoFa.numberOfCodesRequired':
    'Number of verification codes is required.',
  'pages.settings.oauth2.domains': 'Domains',
  'pages.settings.oauth2.clients': 'OAuth2 clients',
  'pages.settings.oauth2.addDomain': 'Add domain',
  'pages.settings.oauth2.domainDetails': 'Domain details',
  'pages.settings.oauth2.noDomains': 'No domains',
  'pages.settings.oauth2.domainName': 'Domain name',
  'pages.settings.oauth2.domainNameRequired': 'Domain name is required.',
  'pages.settings.oauth2.domainNameInvalid':
    'Domain name should not contain "/" and ":". For example: thingsboard.io',
  'pages.settings.oauth2.redirectUriTemplate': 'Redirect URI template',
  'pages.settings.oauth2.addClientPlaceholder': 'Attach OAuth2 clients',
  'pages.settings.oauth2.oauth2Enabled': 'Enable OAuth2 settings',
  'pages.settings.oauth2.propagateToEdge': 'Propagate to Edge',
  'pages.settings.oauth2.toastDomainSaved': 'Domain saved.',
  'pages.settings.oauth2.toastDomainDeleted': 'Domain deleted.',
  'pages.settings.oauth2.deleteDomainTitle':
    "Are you sure you want to delete domain ''{name}''?",
  'pages.settings.oauth2.deleteDomainText':
    'Be careful, after the confirmation the domain and all related provider data will become unavailable.',
  'pages.settings.oauth2.addClient': 'Add OAuth2 client',
  'pages.settings.oauth2.clientDetails': 'OAuth2 client details',
  'pages.settings.oauth2.noClients': 'No OAuth2 clients',
  'pages.settings.oauth2.clientTitle': 'Title',
  'pages.settings.oauth2.clientTitleRequired': 'Title is required.',
  'pages.settings.oauth2.allowedPlatforms': 'Allowed platforms',
  'pages.settings.oauth2.platformsHint': 'Empty selection means all platforms.',
  'pages.settings.oauth2.allPlatforms': 'All platforms',
  'pages.settings.oauth2.platform.WEB': 'Web',
  'pages.settings.oauth2.platform.ANDROID': 'Android',
  'pages.settings.oauth2.platform.IOS': 'iOS',
  'pages.settings.oauth2.loginProvider': 'Login provider',
  'pages.settings.oauth2.customProvider': 'Custom',
  'pages.settings.oauth2.clientId': 'Client ID',
  'pages.settings.oauth2.clientIdRequired': 'Client ID is required.',
  'pages.settings.oauth2.clientSecret': 'Client secret',
  'pages.settings.oauth2.clientSecretRequired': 'Client secret is required.',
  'pages.settings.oauth2.clientSettings': 'Client settings',
  'pages.settings.oauth2.accessTokenUri': 'Access token URI',
  'pages.settings.oauth2.accessTokenUriRequired':
    'Access token URI is required.',
  'pages.settings.oauth2.authorizationUri': 'Authorization URI',
  'pages.settings.oauth2.authorizationUriRequired':
    'Authorization URI is required.',
  'pages.settings.oauth2.jwkSetUri': 'JSON Web Key URI',
  'pages.settings.oauth2.userInfoUri': 'User info URI',
  'pages.settings.oauth2.clientAuthenticationMethod':
    'Client authentication method',
  'pages.settings.oauth2.loginButtonLabel': 'Provider label',
  'pages.settings.oauth2.loginButtonLabelRequired':
    'Provider label is required.',
  'pages.settings.oauth2.loginButtonIcon': 'Login button icon',
  'pages.settings.oauth2.mapperSettings': 'Mapper settings',
  'pages.settings.oauth2.mapperType': 'Mapper type',
  'pages.settings.oauth2.scope': 'Scope',
  'pages.settings.oauth2.scopeRequired': 'Scope is required.',
  'pages.settings.oauth2.userNameAttributeName': 'User name attribute key',
  'pages.settings.oauth2.userNameAttributeNameRequired':
    'User name attribute key is required.',
  'pages.settings.oauth2.allowUserCreation': 'Allow user creation',
  'pages.settings.oauth2.activateUser': 'Activate user',
  'pages.settings.oauth2.emailAttributeKey': 'Email attribute key',
  'pages.settings.oauth2.emailAttributeKeyRequired':
    'Email attribute key is required.',
  'pages.settings.oauth2.firstNameAttributeKey': 'First name attribute key',
  'pages.settings.oauth2.lastNameAttributeKey': 'Last name attribute key',
  'pages.settings.oauth2.tenantNameStrategy': 'Tenant name strategy',
  'pages.settings.oauth2.tenantNamePattern': 'Tenant name pattern',
  'pages.settings.oauth2.tenantNamePatternRequired':
    'Tenant name pattern is required.',
  'pages.settings.oauth2.customerNamePattern': 'Customer name pattern',
  'pages.settings.oauth2.defaultDashboardName': 'Default dashboard name',
  'pages.settings.oauth2.alwaysFullScreen': 'Always fullscreen',
  'pages.settings.oauth2.customUrl': 'URL',
  'pages.settings.oauth2.customUrlRequired': 'URL is required.',
  'pages.settings.oauth2.customUsername': 'Username',
  'pages.settings.oauth2.customPassword': 'Password',
  'pages.settings.oauth2.sendToken': 'Send Token',
  'pages.settings.oauth2.uriPatternError': 'URI is invalid.',
  'pages.settings.oauth2.toastClientSaved': 'OAuth2 client saved.',
  'pages.settings.oauth2.toastClientDeleted': 'OAuth2 client deleted.',
  'pages.settings.oauth2.deleteClientTitle':
    "Are you sure you want to delete OAuth2 client ''{name}''?",
  'pages.settings.oauth2.deleteClientText':
    'Be careful, after the confirmation the client and all related data will become unrecoverable.',

  'pages.settings.common.createdTime': 'Created time',
  'pages.settings.common.cancel': 'Cancel',
  'pages.settings.auditLogs.title': 'Audit logs',
  'pages.settings.auditLogs.timestamp': 'Timestamp',
  'pages.settings.auditLogs.entityType': 'Entity type',
  'pages.settings.auditLogs.entityName': 'Entity name',
  'pages.settings.auditLogs.user': 'User',
  'pages.settings.auditLogs.actionType': 'Action type',
  'pages.settings.auditLogs.actionStatus': 'Status',
  'pages.settings.auditLogs.details': 'Details',
  'pages.settings.auditLogs.detailsTitle': 'Audit log details',
  'pages.settings.auditLogs.actionData': 'Action data',
  'pages.settings.auditLogs.failureDetails': 'Failure details',
  'pages.settings.auditLogs.anyActionType': 'Any action type',
  'pages.settings.auditLogs.search': 'Search audit logs',
  'pages.settings.auditLogs.refresh': 'Refresh',
  'pages.settings.auditLogs.loadFailed': 'Failed to load audit logs',
  'pages.settings.auditLogs.statusSuccess': 'Success',
  'pages.settings.auditLogs.statusFailure': 'Failure',
  'pages.settings.auditLogs.empty': 'No audit logs',
  'pages.settings.auditLogs.total': '{count} total',

  // ---- M14 wave-2 additions (home / trendz / security-settings) ----
  'pages.settings.home.title': 'Home settings',
  'pages.settings.home.dashboard': 'Home dashboard',
  'pages.settings.home.dashboardPlaceholder': 'Select a dashboard',
  'pages.settings.home.hideToolbar': 'Hide home dashboard toolbar',
  'pages.settings.home.toastSaved': 'Home dashboard settings saved.',

  'pages.settings.trendz.title': 'Trendz settings',
  'pages.settings.trendz.enable': 'Enable Trendz',
  'pages.settings.trendz.url': 'Trendz URL',
  'pages.settings.trendz.urlRequired': 'Trendz URL is required.',
  'pages.settings.trendz.urlPatternError': 'Trendz URL is invalid.',
  'pages.settings.trendz.apiKey': 'Trendz API key',
  'pages.settings.trendz.apiKeyPatternError':
    'Trendz API key must not contain whitespace.',
  'pages.settings.trendz.toastSaved': 'Trendz settings saved.',

  'pages.settings.security.title': 'Security settings',
  'pages.settings.security.toastSaved': 'Security settings saved.',
  'pages.settings.security.generalPolicy': 'General policy',
  'pages.settings.security.maxFailedLoginAttempts':
    'Maximum number of failed login attempts, before account is locked',
  'pages.settings.security.maxFailedLoginAttemptsRange':
    "Maximum number of failed login attempts can't be negative",
  'pages.settings.security.lockoutEmail':
    'In case user account lockout, send notification to email',
  'pages.settings.security.invalidEmailFormat': 'Invalid email format.',
  'pages.settings.security.activationTokenTtl':
    'User activation link TTL in hours',
  'pages.settings.security.activationTokenTtlRange':
    'User activation link TTL must be in range from 1 to 24 hours',
  'pages.settings.security.resetTokenTtl': 'Password reset link TTL in hours',
  'pages.settings.security.resetTokenTtlRange':
    'Password reset link TTL must be in range from 1 to 24 hours',
  'pages.settings.security.mobileSecretKeyLength': 'Mobile secret key length',
  'pages.settings.security.mobileSecretKeyLengthRange':
    'Mobile secret key length must be positive',
  'pages.settings.security.passwordPolicy': 'Password policy',
  'pages.settings.security.minimumPasswordLength': 'Minimum password length',
  'pages.settings.security.minimumPasswordLengthRequired':
    'Minimum password length is required',
  'pages.settings.security.minimumPasswordLengthRange':
    'Minimum password length should be in a range from 6 to 50',
  'pages.settings.security.maximumPasswordLength': 'Maximum password length',
  'pages.settings.security.maximumPasswordLengthMin':
    'Maximum password length should be at least 6',
  'pages.settings.security.maximumPasswordLengthLessMin':
    'Maximum password length should be greater than minimum length',
  'pages.settings.security.minimumUppercaseLetters':
    'Minimum number of uppercase letters',
  'pages.settings.security.minimumUppercaseLettersRange':
    "Minimum number of uppercase letters can't be negative",
  'pages.settings.security.minimumLowercaseLetters':
    'Minimum number of lowercase letters',
  'pages.settings.security.minimumLowercaseLettersRange':
    "Minimum number of lowercase letters can't be negative",
  'pages.settings.security.minimumDigits': 'Minimum number of digits',
  'pages.settings.security.minimumDigitsRange':
    "Minimum number of digits can't be negative",
  'pages.settings.security.minimumSpecialCharacters':
    'Minimum number of special characters',
  'pages.settings.security.minimumSpecialCharactersRange':
    "Minimum number of special characters can't be negative",
  'pages.settings.security.passwordExpirationPeriodDays':
    'Password expiration period in days',
  'pages.settings.security.passwordExpirationPeriodDaysRange':
    "Password expiration period in days can't be negative",
  'pages.settings.security.passwordReuseFrequencyDays':
    'Password reuse frequency in days',
  'pages.settings.security.passwordReuseFrequencyDaysRange':
    "Password reuse frequency in days can't be negative",
  'pages.settings.security.allowWhitespace': 'Allow whitespace',
  'pages.settings.security.forceResetPasswordIfNotValid':
    'Force to reset password if not valid',
  'pages.settings.security.forceResetPasswordIfNotValidHint':
    'Please be careful when enabling this feature: users with a no-longer-valid password will be asked to reset it via email at their next login.',
  'pages.settings.security.jwtTitle': 'JWT security settings',
  'pages.settings.security.jwtSaved': 'JWT settings saved.',
  'pages.settings.security.jwtIssuer': 'Issuer name',
  'pages.settings.security.jwtIssuerRequired': 'Issuer name is required.',
  'pages.settings.security.jwtSigningKey': 'Signing key',
  'pages.settings.security.jwtSigningKeyRequired': 'Signing key is required.',
  'pages.settings.security.jwtSigningKeyBase64':
    'Signing key must be base64 format.',
  'pages.settings.security.jwtSigningKeyMinLength':
    'Signing key must be at least 512 bits of data.',
  'pages.settings.security.jwtGenerateKey': 'Generate key',
  'pages.settings.security.jwtExpirationTime': 'Token expiration time (sec)',
  'pages.settings.security.jwtExpirationTimeRequired':
    'Token expiration time is required.',
  'pages.settings.security.jwtExpirationTimeMin':
    'Minimum time is 60 seconds (1 minute).',
  'pages.settings.security.jwtExpirationTimeMax':
    'Maximum allowed time is 2147483647 seconds(68 years).',
  'pages.settings.security.jwtRefreshExpirationTime':
    'Refresh token expiration time (sec)',
  'pages.settings.security.jwtRefreshExpirationTimeRequired':
    'Refresh token expiration time is required.',
  'pages.settings.security.jwtRefreshExpirationTimeMin':
    'Minimum time is 900 seconds (15 minute).',
  'pages.settings.security.jwtRefreshExpirationTimeMax':
    'Maximum allowed time is 2147483647 seconds (68 years).',
  'pages.settings.security.jwtRefreshExpirationTimeLessToken':
    'Refresh token time must be greater token time.',
  'pages.settings.security.jwtConfirmTitle': 'All users will be re-logged-in',
  'pages.settings.security.jwtConfirmMessage':
    'Change of the JWT Signing Key will cause all issued tokens to be invalid. All users will need to re-login. This will also affect scripts that use Rest API/Websockets.',
  'pages.settings.security.jwtConfirmOk': 'Confirm',
  'pages.settings.security.jwtConfirmCancel': 'Discard changes',

  // ---- M14 wave-3: notifications settings (R25, ngx admin.sms-* parity) ----
  'pages.settings.notifications.smsCardTitle': 'SMS provider settings',
  'pages.settings.notifications.smsToastSaved': 'SMS provider settings saved.',
  'pages.settings.notifications.sendTestSms': 'Send test SMS',
  'pages.settings.notifications.smsProviderType': 'SMS provider type',
  'pages.settings.notifications.smsProviderTypeRequired':
    'SMS provider type is required.',
  'pages.settings.notifications.provider.awsSns': 'Amazon SNS',
  'pages.settings.notifications.provider.twilio': 'Twilio',
  'pages.settings.notifications.provider.smpp': 'SMPP',
  'pages.settings.notifications.aws.accessKeyId': 'AWS Access Key ID',
  'pages.settings.notifications.aws.accessKeyIdRequired':
    'AWS Access Key ID is required',
  'pages.settings.notifications.aws.secretAccessKey': 'AWS Secret Access Key',
  'pages.settings.notifications.aws.secretAccessKeyRequired':
    'AWS Secret Access Key is required',
  'pages.settings.notifications.aws.region': 'AWS Region',
  'pages.settings.notifications.aws.regionRequired': 'AWS Region is required',
  'pages.settings.notifications.twilio.numberFrom': 'Phone Number From',
  'pages.settings.notifications.twilio.numberFromRequired':
    'Phone Number From is required.',
  'pages.settings.notifications.twilio.numberFromHint':
    "Phone Number in E.164 format/Phone Number's SID/Messaging Service SID, ex. +19995550123/PNXXX/MGXXX",
  'pages.settings.notifications.twilio.numberFromPattern':
    "Invalid phone number. Should be in E.164 format/Phone Number's SID/Messaging Service SID, ex. +19995550123/PNXXX/MGXXX.",
  'pages.settings.notifications.twilio.accountSid': 'Twilio Account SID',
  'pages.settings.notifications.twilio.accountSidRequired':
    'Twilio Account SID is required',
  'pages.settings.notifications.twilio.accountToken': 'Twilio Account Token',
  'pages.settings.notifications.twilio.accountTokenRequired':
    'Twilio Account Token is required',
  'pages.settings.notifications.smpp.version': 'SMPP version',
  'pages.settings.notifications.smpp.versionRequired':
    'SMPP version is required',
  'pages.settings.notifications.smpp.host': 'SMPP host',
  'pages.settings.notifications.smpp.hostRequired': 'SMPP host is required',
  'pages.settings.notifications.smpp.port': 'SMPP port',
  'pages.settings.notifications.smpp.portRequired': 'SMPP port is required',
  'pages.settings.notifications.smpp.systemId': 'System ID',
  'pages.settings.notifications.smpp.systemIdRequired': 'System ID is required',
  'pages.settings.notifications.smpp.password': 'Password',
  'pages.settings.notifications.smpp.passwordRequired': 'Password is required',
  'pages.settings.notifications.smpp.systemType': 'System type',
  'pages.settings.notifications.smpp.bindType': 'Bind type',
  'pages.settings.notifications.smpp.serviceType': 'Service type',
  'pages.settings.notifications.smpp.sourceAddress': 'Source address',
  'pages.settings.notifications.smpp.sourceTon': 'Source TON',
  'pages.settings.notifications.smpp.sourceNpi': 'Source NPI',
  'pages.settings.notifications.smpp.destinationTon':
    'Destination TON (Type of Number)',
  'pages.settings.notifications.smpp.destinationNpi':
    'Destination NPI (Numbering Plan Identification)',
  'pages.settings.notifications.smpp.addressRange': 'Address range',
  'pages.settings.notifications.smpp.codingScheme': 'Coding scheme',
  'pages.settings.notifications.smpp.group.typeSettings': 'Type settings',
  'pages.settings.notifications.smpp.group.sourceSettings': 'Source settings',
  'pages.settings.notifications.smpp.group.destinationSettings':
    'Destination settings',
  'pages.settings.notifications.smpp.group.additionalSettings':
    'Additional settings',
  'pages.settings.notifications.smpp.bind.tx': 'Transmitter',
  'pages.settings.notifications.smpp.bind.rx': 'Receiver',
  'pages.settings.notifications.smpp.bind.trx': 'Transciever',
  'pages.settings.notifications.smpp.ton.unknown': 'Unknown',
  'pages.settings.notifications.smpp.ton.international': 'International',
  'pages.settings.notifications.smpp.ton.national': 'National',
  'pages.settings.notifications.smpp.ton.networkSpecific': 'Network Specific',
  'pages.settings.notifications.smpp.ton.subscriberNumber': 'Subscriber Number',
  'pages.settings.notifications.smpp.ton.alphanumeric': 'Alphanumeric',
  'pages.settings.notifications.smpp.ton.abbreviated': 'Abbreviated',
  'pages.settings.notifications.smpp.npi.unknown': '0 - Unknown',
  'pages.settings.notifications.smpp.npi.isdn':
    '1 - ISDN/telephone numbering plan (E163/E164)',
  'pages.settings.notifications.smpp.npi.dataNumberingPlan':
    '3 - Data numbering plan (X.121)',
  'pages.settings.notifications.smpp.npi.telexNumberingPlan':
    '4 - Telex numbering plan (F.69)',
  'pages.settings.notifications.smpp.npi.landMobile': '6 - Land Mobile (E.212)',
  'pages.settings.notifications.smpp.npi.nationalNumberingPlan':
    '8 - National numbering plan',
  'pages.settings.notifications.smpp.npi.privateNumberingPlan':
    '9 - Private numbering plan',
  'pages.settings.notifications.smpp.npi.ermesNumberingPlan':
    '10 - ERMES numbering plan (ETSI DE/PS 3 01-3)',
  'pages.settings.notifications.smpp.npi.internet': '13 - Internet (IP)',
  'pages.settings.notifications.smpp.npi.wapClientId':
    '18 - WAP Client Id (to be defined by WAP Forum)',
  'pages.settings.notifications.smpp.scheme.smsc':
    '0 - SMSC Default Alphabet (ASCII for short and long code and to GSM for toll-free)',
  'pages.settings.notifications.smpp.scheme.ia5':
    '1 - IA5 (ASCII for short and long code, Latin 9 for toll-free (ISO-8859-9))',
  'pages.settings.notifications.smpp.scheme.octetUnspecified2':
    '2 - Octet Unspecified (8-bit binary)',
  'pages.settings.notifications.smpp.scheme.latin1': '3 - Latin 1 (ISO-8859-1)',
  'pages.settings.notifications.smpp.scheme.octetUnspecified4':
    '4 - Octet Unspecified (8-bit binary)',
  'pages.settings.notifications.smpp.scheme.jis': '5 - JIS (X 0208-1990)',
  'pages.settings.notifications.smpp.scheme.cyrillic':
    '6 - Cyrillic (ISO-8859-5)',
  'pages.settings.notifications.smpp.scheme.latinHebrew':
    '7 - Latin/Hebrew (ISO-8859-8)',
  'pages.settings.notifications.smpp.scheme.ucs2Utf16':
    '8 - UCS2/UTF-16 (ISO/IEC-10646)',
  'pages.settings.notifications.smpp.scheme.pictogramEncoding':
    '9 - Pictogram Encoding',
  'pages.settings.notifications.smpp.scheme.musicCodes':
    '10 - Music Codes (ISO-2022-JP)',
  'pages.settings.notifications.smpp.scheme.extendedKanjiJis':
    '13 - Extended Kanji JIS (X 0212-1990)',
  'pages.settings.notifications.smpp.scheme.koreanGraphicCharacterSet':
    '14 - Korean Graphic Character Set (KS C 5601/KS X 1001)',
  'pages.settings.notifications.slackCardTitle': 'Slack settings',
  'pages.settings.notifications.slackApiToken': 'Slack API token',
  'pages.settings.notifications.mobileAppTitle': 'Mobile app settings',
  'pages.settings.notifications.firebaseFile':
    'Firebase service account credentials JSON file',
  'pages.settings.notifications.firebaseSelect': 'Select a file',
  'pages.settings.notifications.toastSaved': 'Notification settings saved.',
  'pages.settings.notifications.testSmsSent': 'Test SMS was successfully sent!',
  'pages.settings.notifications.testSmsNoProvider':
    'SMS provider is not configured yet.',
  'pages.settings.notifications.testSmsNumberTo': 'Phone number to',
  'pages.settings.notifications.testSmsNumberToRequired':
    'Phone number to is required.',
  'pages.settings.notifications.testSmsNumberToPattern':
    'Phone number must be in E.164 format, ex. +19995550123.',
  'pages.settings.notifications.testSmsMessage': 'SMS message',
  'pages.settings.notifications.testSmsMessageRequired':
    'SMS message is required.',
  'pages.settings.notifications.testSmsMessageMaxLength':
    "SMS message can't be longer 1600 characters",
  'pages.settings.notifications.testSmsSend': 'Send',

  // ---- M14 wave-3: queues (R26, ngx queue.* / admin.queues parity) ----
  'pages.settings.queues.name': 'Name',
  'pages.settings.queues.nameRequired': 'Queue name is required!',
  'pages.settings.queues.namePattern':
    "Queue name contains a character other than ASCII alphanumerics, '.', '_' and '-'!",
  'pages.settings.queues.topic': 'Topic',
  'pages.settings.queues.submitSettings': 'Submit settings',
  'pages.settings.queues.processingSettings': 'Retries processing settings',
  'pages.settings.queues.pollingSettings': 'Polling settings',
  'pages.settings.queues.submitStrategy': 'Strategy type',
  'pages.settings.queues.submitStrategyTypeRequired':
    'Submit strategy type is required!',
  'pages.settings.queues.submitStrategyColumn': 'Submit strategy',
  'pages.settings.queues.processingStrategy': 'Processing type',
  'pages.settings.queues.processingStrategyTypeRequired':
    'Processing strategy type is required!',
  'pages.settings.queues.processingStrategyColumn': 'Processing strategy',
  'pages.settings.queues.groupingParameter': 'Grouping parameter',
  'pages.settings.queues.batchSizeRequired': 'Batch size is required!',
  'pages.settings.queues.retries': 'Number of retries (0 – unlimited)',
  'pages.settings.queues.retriesRequired': 'Retries is required!',
  'pages.settings.queues.failurePercentage':
    'Percentage of failed messages to skip retries (%)',
  'pages.settings.queues.failurePercentageRequired':
    'Failure percentage is required!',
  'pages.settings.queues.pauseBetweenRetries': 'Pause between retries (ms)',
  'pages.settings.queues.pauseBetweenRetriesRequired':
    'Pause between retries is required!',
  'pages.settings.queues.maxPauseBetweenRetries':
    'Additional pause between retries (ms)',
  'pages.settings.queues.maxPauseBetweenRetriesRequired':
    'Max pause between retries is required!',
  'pages.settings.queues.maxPauseLessThanPause':
    'The additional pause between retries cannot be smaller than the pause between retries.',
  'pages.settings.queues.pollInterval': 'Polling interval (ms)',
  'pages.settings.queues.pollIntervalRequired': 'Polling interval is required!',
  'pages.settings.queues.partitions': 'Partitions',
  'pages.settings.queues.partitionsRequired': 'Partitions is required!',
  'pages.settings.queues.packProcessingTimeout': 'Pack processing timeout (ms)',
  'pages.settings.queues.packProcessingTimeoutRequired':
    'Pack processing timeout is required!',
  'pages.settings.queues.consumerPerPartition': 'Consumer per partition',
  'pages.settings.queues.duplicateMsgToAllPartitions':
    'Duplicate messages to all partitions',
  'pages.settings.queues.customProperties': 'Custom properties',
  'pages.settings.queues.customPropertiesHint':
    'Semicolon-separated key:value pairs, ex. retention.ms:604800000;retention.bytes:1048576000',
  'pages.settings.queues.description': 'Description',
  'pages.settings.queues.strategies.sequentialByOriginator':
    'Sequential by originator',
  'pages.settings.queues.strategies.sequentialByOriginatorHint':
    'New message for e.g. device A is not submitted until previous message for device A is acknowledged',
  'pages.settings.queues.strategies.sequentialByTenant': 'Sequential by tenant',
  'pages.settings.queues.strategies.sequentialByTenantHint':
    'New message for e.g tenant A is not submitted until previous message for tenant A is acknowledged',
  'pages.settings.queues.strategies.sequential': 'Sequential',
  'pages.settings.queues.strategies.sequentialHint':
    'New message is not submitted until previous message is acknowledged',
  'pages.settings.queues.strategies.burst': 'Burst',
  'pages.settings.queues.strategies.burstHint':
    'All messages are submitted to the rule chains in the order they arrive',
  'pages.settings.queues.strategies.batch': 'Batch',
  'pages.settings.queues.strategies.batchHint':
    'New batch is not submitted until previous batch is acknowledged',
  'pages.settings.queues.strategies.retryFailedAndTimeout':
    'Retry failed and timeout',
  'pages.settings.queues.strategies.retryFailedAndTimeoutHint':
    'Retry all failed and timed-out messages from processing pack',
  'pages.settings.queues.strategies.skipAllFailures': 'Skip all failures',
  'pages.settings.queues.strategies.skipAllFailuresHint': 'Ignore all failures',
  'pages.settings.queues.strategies.skipAllFailuresAndTimeouts':
    'Skip all failures and timeouts',
  'pages.settings.queues.strategies.skipAllFailuresAndTimeoutsHint':
    'Ignore all failures and timeouts',
  'pages.settings.queues.strategies.retryAll': 'Retry all',
  'pages.settings.queues.strategies.retryAllHint':
    'Retry all messages from processing pack',
  'pages.settings.queues.strategies.retryFailed': 'Retry failed',
  'pages.settings.queues.strategies.retryFailedHint':
    'Retry all failed messages from processing pack',
  'pages.settings.queues.strategies.retryTimeout': 'Retry timeout',
  'pages.settings.queues.strategies.retryTimeoutHint':
    'Retry all timed-out messages from processing pack',
  'pages.settings.queues.addQueue': 'Add queue',
  'pages.settings.queues.search': 'Search queues',
  'pages.settings.queues.delete': 'Delete',
  'pages.settings.queues.refresh': 'Refresh',
  'pages.settings.queues.selectedCount': '{count} selected',
  'pages.settings.queues.deleteSelected': 'Delete selected',
  'pages.settings.queues.deleteOneTitle':
    "Are you sure you want to delete the queue '{name}'?",
  'pages.settings.queues.deleteOneText':
    'Be careful, after the confirmation the queue and all related data will become unrecoverable.',
  'pages.settings.queues.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 queue} other {# queues}}?',
  'pages.settings.queues.deleteManyText':
    "After the confirmation all selected queues will be deleted and won't be accessible.",
  'pages.settings.queues.toastSaved': 'Queue saved.',
  'pages.settings.queues.toastDeleted': 'Queue deleted.',
  'pages.settings.queues.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.settings.queues.total': '{count} total',
  'pages.settings.queues.empty': 'No queues found',
  'pages.settings.queues.loadFailed': 'Failed to load queues',

  // ---- M14 wave-3: auto-commit settings (R23, ngx admin.auto-commit parity) ----
  'pages.settings.autoCommit.title': 'Auto-commit settings',
  'pages.settings.autoCommit.gateHint':
    'Configure a version-control repository first to manage auto-commit settings.',
  'pages.settings.autoCommit.entities': 'Auto-commit entities',
  'pages.settings.autoCommit.noEntitiesPrompt':
    'No entities configured for auto-commit',
  'pages.settings.autoCommit.addEntityType': 'Add entity type',
  'pages.settings.autoCommit.removeEntityType': 'Remove',
  'pages.settings.autoCommit.removeAll': 'Remove all',
  'pages.settings.autoCommit.entityTypeLabel': 'Entity type',
  'pages.settings.autoCommit.branch': 'Branch',
  'pages.settings.autoCommit.branchPlaceholder':
    'Default (repository default branch)',
  'pages.settings.autoCommit.saveCredentials': 'Export credentials',
  'pages.settings.autoCommit.saveAttributes': 'Export attributes',
  'pages.settings.autoCommit.saveRelations': 'Export relations',
  'pages.settings.autoCommit.saveCalculatedFields':
    'Export calculated fields and alarm rules',
  'pages.settings.autoCommit.readOnlyHint':
    "Auto-commit feature doesn't work with enabled read-only option in Repository settings.",
  'pages.settings.autoCommit.delete': 'Delete',
  'pages.settings.autoCommit.deleteConfirmTitle':
    'Are you sure you want to delete auto-commit settings?',
  'pages.settings.autoCommit.deleteConfirmText':
    'Be careful, after the confirmation the auto-commit settings will be removed and auto-commit will be disabled for all entities.',
  'pages.settings.autoCommit.toastSaved': 'Auto-commit settings saved.',
  'pages.settings.autoCommit.toastDeleted': 'Auto-commit settings deleted.',
  'pages.settings.autoCommit.entityTypes.ASSET': 'Assets',
  'pages.settings.autoCommit.entityTypes.DEVICE': 'Devices',
  'pages.settings.autoCommit.entityTypes.ENTITY_VIEW': 'Entity views',
  'pages.settings.autoCommit.entityTypes.DASHBOARD': 'Dashboards',
  'pages.settings.autoCommit.entityTypes.CUSTOMER': 'Customers',
  'pages.settings.autoCommit.entityTypes.DEVICE_PROFILE': 'Device profiles',
  'pages.settings.autoCommit.entityTypes.ASSET_PROFILE': 'Asset profiles',
  'pages.settings.autoCommit.entityTypes.RULE_CHAIN': 'Rule chains',
  'pages.settings.autoCommit.entityTypes.WIDGET_TYPE': 'Widget types',
  'pages.settings.autoCommit.entityTypes.WIDGETS_BUNDLE': 'Widgets bundles',
  'pages.settings.autoCommit.entityTypes.TB_RESOURCE': 'Resources library',
  'pages.settings.autoCommit.entityTypes.OTA_PACKAGE': 'OTA packages',
  'pages.settings.autoCommit.entityTypes.NOTIFICATION_TEMPLATE':
    'Notification templates',
  'pages.settings.autoCommit.entityTypes.NOTIFICATION_TARGET':
    'Notification recipients',
  'pages.settings.autoCommit.entityTypes.NOTIFICATION_RULE':
    'Notification rules',
  'pages.settings.autoCommit.entityTypes.AI_MODEL': 'AI models',
};
