import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { ApiError } from '../../core/models/api.models';
import { AuthShell } from '../../shared/auth-shell/auth-shell';

@Component({
  imports: [ReactiveFormsModule, RouterLink, AuthShell],
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/explorer']),
      error: (err: HttpErrorResponse) => {
        const body = err.error as ApiError | null;
        this.error.set(body?.message ?? 'Impossible de joindre le serveur.');
        this.loading.set(false);
      },
    });
  }
}