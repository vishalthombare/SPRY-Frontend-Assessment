import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Observable, Subject, throwError } from 'rxjs';
import { AuthUser } from '../../../../core/auth/auth.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { Login } from './login';

class FakeAuthService {
  response: Observable<AuthUser> = throwError(() => new HttpErrorResponse({ status: 500 }));

  login(): Observable<AuthUser> {
    return this.response;
  }
}

describe('Login', () => {
  let component: Login;
  let auth: FakeAuthService;
  let fixture: ComponentFixture<Login>;
  let routeQueryParams: ReturnType<typeof convertToParamMap>;

  beforeEach(() => {
    auth = new FakeAuthService();
    routeQueryParams = convertToParamMap({});
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return routeQueryParams;
              },
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not show validation errors on initial render', () => {
    expect(fixture.nativeElement.querySelectorAll('.field-error')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('[aria-invalid="true"]')).toBeNull();
  });

  it('explains when an expired session requires a new sign-in', () => {
    fixture.destroy();
    routeQueryParams = convertToParamMap({ sessionExpired: 'true' });
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.form-error').textContent.trim()).toBe(
      'Your session has expired. Please sign in again.',
    );
  });

  it('presents one reviewer instruction and positions FastAPI as optional', () => {
    const pageText = fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();

    expect(pageText).toContain(
      'Use the dedicated reviewer credentials included in the submission email or repository README.',
    );
    expect(pageText).toContain('Angular 21 frontend • Optional FastAPI production integration');
    expect(pageText).not.toContain('Vishal Thombare');
  });

  it('shows separate required-field errors after submission', () => {
    component.submit();
    fixture.detectChanges();

    const errors = [...fixture.nativeElement.querySelectorAll('.field-error')].map(
      (element: Element) => element.textContent?.trim(),
    );
    expect(errors).toEqual(['Email address is required.', 'Password is required.']);
  });

  it('does not show invalid email feedback while an edited field remains untouched', () => {
    component.form.controls.email.setValue('invalid-email');
    component.form.controls.email.markAsDirty();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#email');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(fixture.nativeElement.querySelector('#email-error')).toBeNull();
  });

  it('shows invalid email feedback after the email field is touched', () => {
    component.form.controls.email.setValue('invalid-email');
    component.form.controls.email.markAsTouched();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('email-error');
    expect(fixture.nativeElement.querySelector('#email-error').textContent.trim()).toBe(
      'Please enter a valid email address.',
    );
  });

  it('disables duplicate submissions and announces loading while login is pending', () => {
    const pending = new Subject<AuthUser>();
    auth.response = pending;
    component.form.setValue({ email: 'reviewer@example.com', password: 'password123' });

    component.submit();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.sign-in-button');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.textContent).toContain('Signing in…');
    pending.complete();
  });

  it('uses secure accessible attributes for the repository link', () => {
    const link = fixture.nativeElement.querySelector('.repository-note');
    expect(link.href).toBe('https://github.com/vishalthombare/SPRY-Frontend-Assessment/tree/main');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.getAttribute('aria-label')).toContain('repository on GitHub');
  });

  it('updates password visibility and its accessible label', () => {
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.password-field button');
    const password: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    expect(password.type).toBe('password');

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(password.type).toBe('text');
  });

  it('shows backend validation details against the matching field', () => {
    auth.response = throwError(
      () =>
        new HttpErrorResponse({
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
        }),
    );
    component.form.setValue({ email: 'reviewer@example.com', password: 'password123' });

    component.submit();

    expect(component.serverFieldErrors().email).toBe('The email domain must include a period.');
    expect(component.errorMessage()).toBeNull();
  });

  it('falls back to the response message for non-validation API errors', () => {
    auth.response = throwError(
      () =>
        new HttpErrorResponse({
          status: 401,
          error: { message: 'Invalid email or password.', response: null, status: 401 },
        }),
    );
    component.form.setValue({ email: 'reviewer@example.com', password: 'password123' });

    component.submit();

    expect(component.serverFieldErrors()).toEqual({});
    expect(component.errorMessage()).toBe('Invalid email or password.');
  });

  it('preserves the email and clears a stale login error when a field is edited', () => {
    auth.response = throwError(
      () =>
        new HttpErrorResponse({
          status: 401,
          error: { message: 'Invalid email or password.', response: null, status: 401 },
        }),
    );
    component.form.setValue({ email: 'reviewer@example.com', password: 'password123' });

    component.submit();
    expect(component.form.controls.email.value).toBe('reviewer@example.com');
    expect(component.errorMessage()).toBe('Invalid email or password.');

    component.clearServerError('password');
    expect(component.form.controls.email.value).toBe('reviewer@example.com');
    expect(component.errorMessage()).toBeNull();
  });
});
