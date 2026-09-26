import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LoginResult, OtpChallengeResponse } from '../../../../core/auth/auth.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorResponse } from '../../../../core/api/api-response.model';
import { EXTERNAL_LINKS } from '../../../../core/constants/external-links.constants';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { VALIDATION_LIMITS } from '../../../../core/constants/validation-patterns.constants';
import { VALIDATION_MESSAGES } from '../../../../core/constants/validation-messages.constants';

type LoginField = 'email' | 'password';

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
  /** A separate form keeps OTP validation from blocking the initial credential request. */
  readonly otpForm = inject(FormBuilder).nonNullable.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  readonly validationMessages = VALIDATION_MESSAGES.auth;
  readonly repositoryUrl = EXTERNAL_LINKS.repository;
  // Signals hold local UI state and update only the template bindings that consume them.
  readonly showPassword = signal(false);
  readonly submitted = signal(false);
  readonly isSubmitting = signal(false);
  readonly isResending = signal(false);
  readonly otpChallenge = signal<OtpChallengeResponse | null>(null);
  readonly otpNotice = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(
    this.route.snapshot.queryParamMap.get('sessionExpired') === 'true'
      ? this.validationMessages.sessionExpired
      : null,
  );
  readonly serverFieldErrors = signal<Partial<Record<LoginField, string>>>({});

  /** Validate credentials, prevent duplicate submits, and navigate only after API success. */
  submit(): void {
    if (this.isSubmitting()) return;

    this.submitted.set(true);
    if (this.form.invalid) {
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
        next: (result) => this.handleLoginResult(result),
        error: (error: HttpErrorResponse) => this.showApiError(error),
      });
  }

  /** Verify the emailed code and navigate only after the backend returns session tokens. */
  verifyOtp(): void {
    const challenge = this.otpChallenge();
    if (!challenge || this.isSubmitting()) return;

    this.submitted.set(true);
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.otpNotice.set(null);
    this.isSubmitting.set(true);
    this.auth
      .verifyOtp({ challenge_id: challenge.challenge_id, otp: this.otpForm.controls.otp.value })
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.navigateAfterAuthentication(),
        error: (error: HttpErrorResponse) => this.showOtpApiError(error),
      });
  }

  /** Request a replacement code and switch to the new challenge returned by the backend. */
  resendOtp(): void {
    const challenge = this.otpChallenge();
    if (!challenge || this.isSubmitting() || this.isResending()) return;

    this.errorMessage.set(null);
    this.otpNotice.set(null);
    this.isResending.set(true);
    this.auth
      .resendOtp({ challenge_id: challenge.challenge_id })
      .pipe(
        finalize(() => this.isResending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (replacement) => {
          this.otpChallenge.set({
            requires_otp: true,
            challenge_id: replacement.challenge_id,
            masked_email: replacement.masked_email,
            expires_in_seconds: replacement.expires_in_seconds,
          });
          this.otpForm.reset();
          this.submitted.set(false);
          this.otpNotice.set('A new verification code was sent.');
        },
        error: (error: HttpErrorResponse) => this.showOtpApiError(error),
      });
  }

  /** Return to credential entry without keeping the password or OTP in memory. */
  backToSignIn(): void {
    this.otpChallenge.set(null);
    this.form.controls.password.reset();
    this.otpForm.reset();
    this.submitted.set(false);
    this.errorMessage.set(null);
    this.otpNotice.set(null);
  }

  /** Keep pasted OTP values numeric and within the six-character API contract. */
  normalizeOtp(): void {
    const normalized = this.otpForm.controls.otp.value.replace(/\D/g, '').slice(0, 6);
    this.otpForm.controls.otp.setValue(normalized, { emitEvent: false });
    this.errorMessage.set(null);
  }

  /** Remove a stale server error as soon as the user corrects that field. */
  clearServerError(field: LoginField): void {
    this.serverFieldErrors.update((errors) => {
      const nextErrors = { ...errors };
      delete nextErrors[field];
      return nextErrors;
    });
    this.errorMessage.set(null);
  }

  /** Return the most useful email error only after interaction or submission. */
  emailError(): string | null {
    const serverError = this.serverFieldErrors().email;
    if (serverError) return serverError;
    const control = this.form.controls.email;
    if (!this.shouldShowError(control.touched)) return null;
    if (control.hasError('required')) return 'Email address is required.';
    if (control.hasError('email')) return this.validationMessages.email;
    return null;
  }

  /** Return distinct required and format/length feedback for the password field. */
  passwordError(): string | null {
    const serverError = this.serverFieldErrors().password;
    if (serverError) return serverError;
    const control = this.form.controls.password;
    if (!this.shouldShowError(control.touched)) return null;
    if (control.hasError('required')) return 'Password is required.';
    if (control.hasError('minlength')) return this.validationMessages.password;
    return null;
  }

  /** Show an OTP error only after interaction or an attempted verification. */
  otpError(): string | null {
    const control = this.otpForm.controls.otp;
    if (!this.shouldShowError(control.touched)) return null;
    if (control.hasError('required')) return 'Verification code is required.';
    if (control.hasError('pattern')) return 'Enter the six-digit verification code.';
    return null;
  }

  /** Move either to OTP verification or to the authenticated destination. */
  private handleLoginResult(result: LoginResult): void {
    if (result.requires_otp) {
      this.otpChallenge.set(result);
      this.form.controls.password.reset();
      this.submitted.set(false);
      return;
    }
    this.navigateAfterAuthentication();
  }

  /** Preserve the original safe return URL behavior after either authentication path. */
  private navigateAfterAuthentication(): void {
    void this.router.navigateByUrl(
      this.route.snapshot.queryParamMap.get('returnUrl') ?? APP_ROUTES.assessment,
    );
  }

  /** Validation feedback stays hidden until the user interacts or submits the form. */
  private shouldShowError(touched: boolean): boolean {
    return touched || this.submitted();
  }

  /** Route standard backend validation details to fields and other errors to the form. */
  private showApiError(error: HttpErrorResponse): void {
    const body = error.error as ApiErrorResponse | undefined;
    const fieldErrors: Partial<Record<LoginField, string>> = {};

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

  /** Keep OTP failures generic so the UI mirrors the backend's non-disclosing response. */
  private showOtpApiError(error: HttpErrorResponse): void {
    const body = error.error as ApiErrorResponse | undefined;
    this.errorMessage.set(
      body?.message ?? 'Verification failed. Request a new code and try again.',
    );
  }
}
