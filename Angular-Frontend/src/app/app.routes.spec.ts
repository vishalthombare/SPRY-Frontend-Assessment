import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';

describe('application assessment routes', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: { ensureAuthenticated: () => of(true) } },
      ],
    });
    router = TestBed.inject(Router);
  });

  afterEach(() => sessionStorage.clear());

  it('loads the primary assessment route directly', async () => {
    expect(await router.navigateByUrl('/assessment')).toBe(true);
    expect(router.url).toBe('/assessment');
  });

  it.each(['/dashboard', '/assignment'])('redirects %s to assessment', async (legacyRoute) => {
    expect(await router.navigateByUrl(legacyRoute)).toBe(true);
    expect(router.url).toBe('/assessment');
  });
});
