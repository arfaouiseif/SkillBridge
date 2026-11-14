import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, User, UpdateProfileRequest } from './models/api.models';

const TOKEN_KEY = 'sb_token';

@Service()
export class Auth {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.token() !== null);

  login(body: LoginRequest) {
    return this.http
      .post<AuthResponse>('/api/auth/login', body)
      .pipe(tap((res) => this.setSession(res)));
  }

  register(body: RegisterRequest) {
    return this.http
      .post<AuthResponse>('/api/auth/register', body)
      .pipe(tap((res) => this.setSession(res)));
  }

  loadMe() {
    return this.http.get<User>('/api/users/me').pipe(tap((u) => this.user.set(u)));
  }
  
  updateProfile(body: UpdateProfileRequest) {
    return this.http.put<User>('/api/users/me', body).pipe(tap((u) => this.user.set(u)));
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/connexion']);
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.token);
    this.token.set(res.token);
    this.user.set(res.user);
  }
}