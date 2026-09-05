import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { APP_ROUTES } from '../constants/routes.constants';
import { AuthService } from './auth.service';

/** Protects application routes and preserves the requested URL for login redirection. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureAuthenticated()
    .pipe(
      map((authenticated) =>
        authenticated
          ? true
          : router.createUrlTree([APP_ROUTES.login], { queryParams: { returnUrl: state.url } }),
      ),
    );
};
