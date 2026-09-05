import { InjectionToken } from '@angular/core';

/** Injectable base URL keeps services independent of environment implementation details. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
