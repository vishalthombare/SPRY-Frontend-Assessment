/** Relative FastAPI paths used by frontend data-access services. */
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  tasks: {
    root: '/tasks',
    summary: '/tasks/summary',
    byId: (taskId: number) => `/tasks/${taskId}`,
    complete: (taskId: number) => `/tasks/${taskId}/complete`,
    restore: (taskId: number) => `/tasks/${taskId}/restore`,
  },
} as const;
