import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';

describe('application assessment routes', () => {
  let router: Router;

  beforeEach(() => {
    sessionStorage.setItem('spry.authenticated', 'true');
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
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
