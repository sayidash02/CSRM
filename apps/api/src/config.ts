export type NodeEnvironment = 'development' | 'test' | 'staging' | 'production' | string;

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  healthTimeoutMs: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

function positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) return fallback;
  return parsed;
}

export function getConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const configuredLevel = env.CRMS_LOG_LEVEL;
  const logLevel = configuredLevel === 'debug'
    || configuredLevel === 'info'
    || configuredLevel === 'warn'
    || configuredLevel === 'error'
    ? configuredLevel
    : 'info';

  return {
    nodeEnv: env.NODE_ENV || 'development',
    port: positiveInteger(env.PORT, 3000, 65535),
    healthTimeoutMs: positiveInteger(env.CRMS_HEALTH_TIMEOUT_MS, 1500, 30_000),
    logLevel,
  };
}

export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
  if ((env.NODE_ENV || 'development') !== 'production') return;

  const errors: string[] = [];
  if (!env.DATABASE_URL) errors.push('DATABASE_URL');
  if (!env.CRMS_ALLOWED_ORIGINS) errors.push('CRMS_ALLOWED_ORIGINS');

  if (errors.length > 0) {
    throw new Error(`Missing required production configuration: ${errors.join(', ')}`);
  }
}
