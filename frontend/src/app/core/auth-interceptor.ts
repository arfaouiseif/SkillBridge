import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Auth } from './auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = auth.token();
  const isApi = req.url.startsWith('/api');
  const isAuthCall = req.url.startsWith('/api/auth');

  const request =
    token && isApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err) => {
      if (err.status === 401 && isApi && !isAuthCall) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};