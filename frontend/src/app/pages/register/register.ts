import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { ApiError } from '../../core/models/api.models';
import { AuthShell } from '../../shared/auth-shell/auth-shell';

const passwordsMatch: ValidatorFn = (group) => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password === confirm ? null : { mismatch: true };
};

@Component({
  imports: [ReactiveFormsModule, RouterLink, AuthShell],
  selector: 'app-register',
  templateUrl: './register.html',
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fieldErrors = signal<{ field: string; message: string }[]>([]);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.fieldErrors.set([]);

    const { name, email, password } = this.form.getRawValue();

    this.auth.register({ name, email, password }).subscribe({
      next: () => this.router.navigate(['/mon-profil']),
      error: (err: HttpErrorResponse) => {
        const body = err.error as ApiError | null;
        this.fieldErrors.set(body?.details ?? []);
        this.error.set(body?.message ?? 'Impossible de joindre le serveur.');
        this.loading.set(false);
      },
    });
  }
}