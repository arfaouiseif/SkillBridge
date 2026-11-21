import { Routes } from '@angular/router';
import { authGuard } from './core/auth-guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
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
      {
        path: 'mon-profil',
        loadComponent: () => import('./pages/my-profile/my-profile').then((m) => m.MyProfile),
      },
            {
        path: 'membres/:id',
        loadComponent: () => import('./pages/member-profile/member-profile').then((m) => m.MemberProfile),
      },
      {
        path: 'explorer',
        loadComponent: () => import('./pages/explorer/explorer').then((m) => m.Explorer),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];