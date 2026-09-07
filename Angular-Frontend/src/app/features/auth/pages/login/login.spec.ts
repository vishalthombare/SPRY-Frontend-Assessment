import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { AuthUser } from '../../../../core/auth/auth.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { Login } from './login';

class FakeAuthService {
  error = new HttpErrorResponse({ status: 500 });

  login(): Observable<AuthUser> {
    return throwError(() => this.error);
  }
}

describe('Login', () => {
  let component: Login;
  let auth: FakeAuthService;

  beforeEach(() => {
    auth = new FakeAuthService();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    component = TestBed.createComponent(Login).componentInstance;
    component.form.setValue({ email: 'reviewer@example.com', password: 'password123' });
  });

  it('shows backend validation details against the matching field', () => {
    auth.error = new HttpErrorResponse({
      status: 422,
      error: {
        message: 'Validation failed.',
        response: {
          errors: [
            {
              field: 'email',
              message: 'The email domain must include a period.',
              code: 'value_error',
            },
          ],
        },
        status: 422,
      },
    });

    component.submit();

    expect(component.serverFieldErrors().email).toBe('The email domain must include a period.');
    expect(component.errorMessage()).toBeNull();
  });

  it('falls back to the response message for non-validation API errors', () => {
    auth.error = new HttpErrorResponse({
      status: 401,
      error: { message: 'Invalid email or password.', response: null, status: 401 },
    });

    component.submit();

    expect(component.serverFieldErrors()).toEqual({});
    expect(component.errorMessage()).toBe('Invalid email or password.');
  });
});
