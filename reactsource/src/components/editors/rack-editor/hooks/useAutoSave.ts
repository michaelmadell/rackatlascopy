export interface UnsavedChanges {
  isDirty: boolean;
}

export function useAutoSave() {
  return {
    isDirty: false,
    saveNow: async () => true,
  };
}
