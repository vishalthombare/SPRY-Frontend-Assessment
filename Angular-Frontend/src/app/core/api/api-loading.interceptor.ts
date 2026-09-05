import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { ApiLoadingService } from './api-loading.service';

/** Shows the global loader until each intercepted API request has settled. */
export const apiLoadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(ApiLoadingService);
  loading.requestStarted();
  return next(request).pipe(finalize(() => loading.requestFinished()));
};
