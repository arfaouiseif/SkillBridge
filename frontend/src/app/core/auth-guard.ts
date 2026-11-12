import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';
import { inject } from '@angular/core';


export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth)
  const router = inject(Router)
  return auth.isLoggedIn() ? true : router.createUrlTree(['/connexion']);
  

};
