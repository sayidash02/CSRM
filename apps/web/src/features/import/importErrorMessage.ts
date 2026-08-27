const CONNECTION_ERROR_MESSAGE =
  'Tidak dapat terhubung ke server CRMS. Periksa koneksi dan pastikan API sedang berjalan.';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? value as Record<string, unknown>
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getImportErrorMessage(error: unknown, fallback: string): string {
  const errorRecord = asRecord(error);
  const response = asRecord(errorRecord?.response);
  const responseData = asRecord(response?.data);
  const structuredError = asRecord(responseData?.error);

  const publicMessage =
    nonEmptyString(responseData?.error) ??
    nonEmptyString(structuredError?.message) ??
    nonEmptyString(responseData?.message);

  if (publicMessage) return publicMessage;

  const isNetworkFailure =
    response === null &&
    (errorRecord?.code === 'ERR_NETWORK' || errorRecord?.message === 'Network Error');

  return isNetworkFailure ? CONNECTION_ERROR_MESSAGE : fallback;
}
