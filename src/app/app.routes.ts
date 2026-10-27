import { Routes } from '@angular/router';
import { soloAutenticados, soloInvitados } from './core/auth';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'acceso' },
  {
    path: 'acceso',
    title: 'TEIG · Acceso',
    canActivate: [soloInvitados],
    loadComponent: () => import('./pages/acceso/acceso').then((m) => m.Acceso),
  },
  {
    path: 'inicio',
    title: 'TEIG · Inicio',
    canActivate: [soloAutenticados],
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
  },
  { path: '**', redirectTo: 'acceso' },
];
