import { Routes } from '@angular/router';
import { authGuard } from './core/auth-guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'connexion',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'inscription',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'explorer' },
      {
        path: 'explorer',
        loadComponent: () => import('./pages/explorer/explorer').then((m) => m.Explorer),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];