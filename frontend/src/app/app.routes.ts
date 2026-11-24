import { Routes, UrlMatcher, UrlSegment } from '@angular/router';
import { authGuard } from './core/auth-guard';
import { MainLayout } from './layout/main-layout/main-layout';

// /messages and /messages/:id share one component instance, so switching conversation does not reload the page
const messagesMatcher: UrlMatcher = (segments) => {
  if (segments[0]?.path !== 'messages' || segments.length > 2) return null;
  const posParams: Record<string, UrlSegment> = {};
  const id = segments[1];
  if (id) posParams['id'] = id;
  return { consumed: segments, posParams };
};


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
        path: 'mes-sessions',
        loadComponent: () => import('./pages/my-sessions/my-sessions').then((m) => m.MySessions),
      },
      {
        matcher: messagesMatcher,
        loadComponent: () => import('./pages/messages/messages').then((m) => m.Messages),
      },
      {
        path: 'membres/:id/reserver',
        loadComponent: () => import('./pages/book-session/book-session').then((m) => m.BookSession),
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