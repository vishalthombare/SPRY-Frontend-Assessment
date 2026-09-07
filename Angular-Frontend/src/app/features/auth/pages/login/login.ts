import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorResponse } from '../../../../core/api/api-response.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { VALIDATION_LIMITS } from '../../../../core/constants/validation-patterns.constants';
import { VALIDATION_MESSAGES } from '../../../../core/constants/validation-messages.constants';

/** Public standalone sign-in page connected to the FastAPI authentication flow. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  // inject() obtains dependencies without constructor boilerplate.
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  /** Reactive form owns validation and produces the typed login request. */
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(VALIDATION_LIMITS.passwordMinLength)],
    ],
  });
  readonly validationMessages = VALIDATION_MESSAGES.auth;
  // Signals hold local UI state and update only the template bindings that consume them.
  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly serverFieldErrors = signal<Partial<Record<'email' | 'password', string>>>({});

  /** Validate credentials, prevent duplicate submits, and navigate only after API success. */
  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.serverFieldErrors.set({});
    this.isSubmitting.set(true);
    this.auth
      .login(this.form.getRawValue())
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () =>
          void this.router.navigateByUrl(
            this.route.snapshot.queryParamMap.get('returnUrl') ?? APP_ROUTES.assessment,
          ),
        error: (error: HttpErrorResponse) => this.showApiError(error),
      });
  }

  /** Remove a stale server error as soon as the user corrects that field. */
  clearServerError(field: 'email' | 'password'): void {
    this.serverFieldErrors.update((errors) => ({ ...errors, [field]: undefined }));
  }

  /** Route standard backend validation details to fields and other errors to the form. */
  private showApiError(error: HttpErrorResponse): void {
    const body = error.error as ApiErrorResponse | undefined;
    const fieldErrors: Partial<Record<'email' | 'password', string>> = {};

    for (const detail of body?.response?.errors ?? []) {
      if (detail.field === 'email' || detail.field === 'password') {
        fieldErrors[detail.field] = detail.message;
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      this.serverFieldErrors.set(fieldErrors);
      return;
    }

    this.errorMessage.set(body?.message ?? 'Sign in failed. Check your details and try again.');
  }
}
