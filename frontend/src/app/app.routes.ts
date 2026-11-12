import { Routes } from '@angular/router';
import { authGuard } from './core/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'explorer' },
  {
    path: 'connexion',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'explorer',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/explorer/explorer').then((m) => m.Explorer),
  },
  { path: '**', redirectTo: 'explorer' },
];