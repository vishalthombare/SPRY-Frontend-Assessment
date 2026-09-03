import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({ selector: 'app-login', imports: [ReactiveFormsModule], templateUrl: './login.html', styleUrl: './login.scss' })
export class Login {
  readonly form;
  constructor(formBuilder: FormBuilder, private readonly auth: AuthService, private readonly route: ActivatedRoute, private readonly router: Router) {
    this.form = formBuilder.nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(6)]] });
  }
  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.auth.login();
    void this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard');
  }
}
