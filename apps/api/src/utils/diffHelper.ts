function jsonSafe(value: any): any {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  // Prisma Decimal (and other SDK value objects) expose internal fields that
  // are not valid Prisma Json input. Keep only their exact textual value.
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) !== Object.prototype) {
    return typeof value.toString === 'function' ? value.toString() : String(value);
  }
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, jsonSafe(child)]));
  }
  return value;
}

export const generateDiff = (oldData: any, newData: any): any => {
  const diff: Record<string, { old: any; new: any }> = {};
  const ignoredFields = ['id', 'created_at', 'updated_at', 'is_deleted'];

  if (!oldData || !newData) return null;

  for (const key of Object.keys(newData)) {
    if (ignoredFields.includes(key)) continue;
    
    const oldVal = oldData[key] !== undefined && oldData[key] !== null ? oldData[key].toString() : null;
    const newVal = newData[key] !== undefined && newData[key] !== null ? newData[key].toString() : null;

    if (oldVal !== newVal) {
      diff[key] = { old: jsonSafe(oldData[key]), new: jsonSafe(newData[key]) };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
};
