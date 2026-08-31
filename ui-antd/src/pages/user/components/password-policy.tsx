import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useIntl } from '@umijs/max';
import { Progress, Typography } from 'antd';
import type { Rule } from 'antd/es/form';
import { createStyles } from 'antd-style';
import { useMemo } from 'react';
import { getUserPasswordPolicy, type UserPasswordPolicy } from '@/services/tb';

/**
 * Password-policy plumbing shared by the reset / create / reset-expired
 * password pages. Mirrors ui-ngx passwordStrengthValidator (counts via
 * `(?:.*?X){n}` regexes, whitespace disallowed unless allowWhitespaces).
 */

/** Locale key suffix under `pages.password.policy.` + satisfaction probe. */
export interface PolicyRequirement {
  key: string;
  n?: number;
  satisfied: (value: string) => boolean;
}

function countMatches(value: string, pattern: string): number {
  const match = value.match(new RegExp(`(?:.*?[${pattern}])`, 'g'));
  return match ? match.length : 0;
}

export function policyRequirements(
  policy: UserPasswordPolicy,
): PolicyRequirement[] {
  const requirements: PolicyRequirement[] = [];
  if (policy.minimumLength && policy.minimumLength > 0) {
    const minimum = policy.minimumLength;
    requirements.push({
      key: 'minimumLength',
      n: minimum,
      satisfied: (v) => v.length >= minimum,
    });
  }
  if (policy.maximumLength && policy.maximumLength > 0) {
    const maximum = policy.maximumLength;
    requirements.push({
      key: 'maximumLength',
      n: maximum,
      satisfied: (v) => v.length <= maximum,
    });
  }
  if (policy.minimumUppercaseLetters && policy.minimumUppercaseLetters > 0) {
    const minimum = policy.minimumUppercaseLetters;
    requirements.push({
      key: 'minimumUppercaseLetters',
      n: minimum,
      satisfied: (v) => countMatches(v, 'A-Z') >= minimum,
    });
  }
  if (policy.minimumLowercaseLetters && policy.minimumLowercaseLetters > 0) {
    const minimum = policy.minimumLowercaseLetters;
    requirements.push({
      key: 'minimumLowercaseLetters',
      n: minimum,
      satisfied: (v) => countMatches(v, 'a-z') >= minimum,
    });
  }
  if (policy.minimumDigits && policy.minimumDigits > 0) {
    const minimum = policy.minimumDigits;
    requirements.push({
      key: 'minimumDigits',
      n: minimum,
      satisfied: (v) => countMatches(v, '\\d') >= minimum,
    });
  }
  if (policy.minimumSpecialCharacters && policy.minimumSpecialCharacters > 0) {
    const minimum = policy.minimumSpecialCharacters;
    requirements.push({
      key: 'minimumSpecialCharacters',
      n: minimum,
      satisfied: (v) => countMatches(v, '\\W_') >= minimum,
    });
  }
  // ui-ngx parity: whitespace is disallowed unless allowWhitespaces is set.
  if (!policy.allowWhitespaces) {
    requirements.push({
      key: 'noWhitespaces',
      satisfied: (v) => !/\s/.test(v),
    });
  }
  return requirements;
}

/** REST read of the public policy endpoint (react-query cache). */
export function usePasswordPolicy() {
  return useQuery({
    queryKey: ['tb', 'noauth', 'user-password-policy'],
    queryFn: getUserPasswordPolicy,
    staleTime: 10 * 60_000,
  });
}

/** Form rules for the new-password field, driven by the live policy. */
export function newPasswordRules(
  policy: UserPasswordPolicy | undefined,
  formatMessage: (descriptor: {
    id: string;
    values?: Record<string, unknown>;
  }) => string,
): Rule[] {
  const requiredRule: Rule = {
    required: true,
    message: formatMessage({ id: 'pages.password.required' }),
  };
  if (!policy) {
    return [requiredRule];
  }
  const requirements = policyRequirements(policy);
  if (!requirements.length) {
    return [requiredRule];
  }
  return [
    requiredRule,
    {
      validator: (_rule, value: string) => {
        if (!value) {
          return Promise.resolve();
        }
        const unsatisfied = requirements.filter(
          (requirement) => !requirement.satisfied(value),
        );
        if (!unsatisfied.length) {
          return Promise.resolve();
        }
        const summary = unsatisfied
          .map((requirement) =>
            formatMessage({
              id: `pages.password.policy.${requirement.key}`,
              values: { n: requirement.n },
            }),
          )
          .join('; ');
        return Promise.reject(new Error(summary));
      },
    },
  ];
}

/** Crude 0-100 strength heuristic for the live hint (variety + length). */
export function passwordStrength(value: string): number {
  if (!value) {
    return 0;
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[\W_]/].filter((pattern) =>
    pattern.test(value),
  ).length;
  const lengthScore = Math.min(value.length / 12, 1);
  return Math.round(((classes / 4) * 0.7 + lengthScore * 0.3) * 100);
}

const useStyles = createStyles(({ token, css }) => ({
  panel: css`
    margin-bottom: 16px;
    padding: 8px 12px;
    border-radius: ${token.borderRadius}px;
    background-color: ${token.colorFillQuaternary};
  `,
  list: css`
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${token.fontSizeSM}px;
    line-height: 22px;
    color: ${token.colorTextTertiary};
  `,
  itemSatisfied: css`
    color: ${token.colorSuccess};
  `,
  strength: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
  `,
}));

/**
 * Live policy hints: every requirement with a satisfied/unsatisfied marker
 * plus a strength bar. Renders nothing when the policy has no constraints.
 */
export const PasswordPolicyPanel: React.FC<{
  policy?: UserPasswordPolicy;
  value?: string;
}> = ({ policy, value = '' }) => {
  const { formatMessage } = useIntl();
  const { styles } = useStyles();
  const requirements = useMemo(
    () => (policy ? policyRequirements(policy) : []),
    [policy],
  );
  if (!requirements.length) {
    return null;
  }
  const strength = passwordStrength(value);
  const strengthLabel =
    strength >= 80
      ? formatMessage({ id: 'pages.password.strength.strong' })
      : strength >= 50
        ? formatMessage({ id: 'pages.password.strength.medium' })
        : formatMessage({ id: 'pages.password.strength.weak' });
  return (
    <div className={styles.panel}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {formatMessage({ id: 'pages.password.policy.title' })}
      </Typography.Text>
      <ul className={styles.list}>
        {requirements.map((requirement) => {
          const satisfied = requirement.satisfied(value);
          return (
            <li
              key={requirement.key}
              className={`${styles.item} ${satisfied ? styles.itemSatisfied : ''}`}
            >
              {satisfied ? <CheckOutlined /> : <CloseOutlined />}
              {formatMessage({
                id: `pages.password.policy.${requirement.key}`,
                values: { n: requirement.n },
              })}
            </li>
          );
        })}
      </ul>
      {value && (
        <div className={styles.strength}>
          <span>{formatMessage({ id: 'pages.password.strength' })}</span>
          <Progress
            percent={strength}
            showInfo={false}
            size="small"
            style={{ flex: 1, margin: 0 }}
            status={
              strength >= 80
                ? 'success'
                : strength >= 50
                  ? 'normal'
                  : 'exception'
            }
          />
          <span>{strengthLabel}</span>
        </div>
      )}
    </div>
  );
};
