import { z } from 'zod';

const minimumAuthSecretBytes = 32;
const knownAuthSecretPlaceholders = new Set([
  'local-dev-only',
  'change-this-development-secret-before-production',
  'yilink-local-development-only-change-me',
  '请替换为至少 32 字节的随机密钥',
]);

export interface AuthSecretConfig {
  secret?: string;
  nodeEnv?: string;
  nextPhase?: string;
}

/**
 * 在认证模块初始化时拒绝生产环境的弱会话密钥。
 *
 * Next 会在 `next build` 期间加载服务端模块；该阶段必须保留到运行时再校验，
 * 才不会让配置错误掩盖为构建错误，并能在首个请求时返回 500。
 */
export function getAuthSecretError({
  secret,
  nodeEnv,
  nextPhase,
}: AuthSecretConfig): string | null {
  if (nodeEnv !== 'production' || nextPhase === 'phase-production-build') {
    return null;
  }

  const normalizedSecret = secret?.trim();
  if (!normalizedSecret) {
    return 'AUTH_SECRET is required in production.';
  }

  if (knownAuthSecretPlaceholders.has(normalizedSecret.toLowerCase())) {
    return 'AUTH_SECRET must not use a development placeholder in production.';
  }

  if (new TextEncoder().encode(normalizedSecret).byteLength < minimumAuthSecretBytes) {
    return `AUTH_SECRET must be at least ${minimumAuthSecretBytes} bytes in production.`;
  }

  return null;
}

export function assertProductionAuthSecret(config: AuthSecretConfig): void {
  const error = getAuthSecretError(config);
  if (error) {
    throw new Error(error);
  }
}

// auth.ts imports this module before it initializes NextAuth. Do not move this
// check into a request handler: middleware imports auth for every request, so a
// bad production configuration must fail before any auth operation can run.
assertProductionAuthSecret({
  secret: process.env.AUTH_SECRET,
  nodeEnv: process.env.NODE_ENV,
  nextPhase: process.env.NEXT_PHASE,
});

export const emailSchema = z.string().trim().toLowerCase().email();

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
