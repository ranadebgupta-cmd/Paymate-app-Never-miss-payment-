
// Firebase integration has been removed to simplify the application for end-users.
// This file is kept as a placeholder to prevent import errors in legacy code but performs no actions.

export const firebaseService = {
  initialize: (config: any) => {
    return false;
  },

  syncData: async (userId: string, userEmail: string, bills: any[], tasks: any[]) => {
    return { success: false, error: 'Firebase support disabled' };
  }
};
