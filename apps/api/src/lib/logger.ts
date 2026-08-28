import { getConfig } from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

const levelRank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const sensitiveKey = /(authorization|cookie|password|passwd|secret|token|api[_-]?key|credential|email|phone|address|body|query|payload|file(name)?|path)/i;
const MAX_STRING_LENGTH = 256;
const MAX_DEPTH = 3;

function safeString(value: string): string {
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
}

function sanitize(value: unknown, key = '', depth = 0): unknown {
  if (sensitiveKey.test(key)) return '[REDACTED]';
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return safeString(value);
  if (value instanceof Error) {
    const code = (value as Error & { code?: unknown }).code;
    return {
      name: value.name,
      message: safeString(value.message),
      ...(typeof code === 'string' ? { code } : {}),
    };
  }
  if (depth >= MAX_DEPTH) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, key, depth + 1));
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      result[childKey] = sanitize(childValue, childKey, depth + 1);
    }
    return result;
  }
  return String(value);
}

function shouldWrite(level: LogLevel): boolean {
  return levelRank[level] >= levelRank[getConfig().logLevel];
}

function write(level: LogLevel, event: string, fields: LogFields = {}): void {
  if (!shouldWrite(level)) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event: safeString(event),
    ...sanitize(fields) as Record<string, unknown>,
  };
  const output = `${JSON.stringify(entry)}\n`;
  if (level === 'error' || level === 'warn') process.stderr.write(output);
  else process.stdout.write(output);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => write('debug', event, fields),
  info: (event: string, fields?: LogFields) => write('info', event, fields),
  warn: (event: string, fields?: LogFields) => write('warn', event, fields),
  error: (event: string, fields?: LogFields) => write('error', event, fields),
};

export function errorFields(error: unknown): LogFields {
  if (error instanceof Error) {
    const code = (error as Error & { code?: unknown }).code;
    return {
      errorName: error.name,
      errorMessage: safeString(error.message),
      ...(typeof code === 'string' ? { errorCode: code } : {}),
      ...(error.stack ? { stack: safeString(error.stack) } : {}),
    };
  }
  return { errorName: 'UnknownError', errorMessage: safeString(String(error)) };
}
