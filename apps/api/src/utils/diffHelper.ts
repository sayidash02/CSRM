export const generateDiff = (oldData: any, newData: any): any => {
  const diff: Record<string, { old: any; new: any }> = {};
  const ignoredFields = ['id', 'created_at', 'updated_at', 'is_deleted'];

  if (!oldData || !newData) return null;

  for (const key of Object.keys(newData)) {
    if (ignoredFields.includes(key)) continue;
    
    const oldVal = oldData[key] !== undefined && oldData[key] !== null ? oldData[key].toString() : null;
    const newVal = newData[key] !== undefined && newData[key] !== null ? newData[key].toString() : null;

    if (oldVal !== newVal) {
      diff[key] = { old: oldData[key], new: newData[key] };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
};
