import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, Observable, tap, throwError } from 'rxjs';

export interface Usuario {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface RespuestaAuth {
  accessToken: string;
  user: Usuario;
}

interface Sesion extends RespuestaAuth {
  expira: number;
}

const CLAVE_SESION = 'teig.sesion';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sesion = signal<Sesion | null>(leerSesion());

  readonly usuario = computed(() => this.sesion()?.user ?? null);
  readonly token = computed(() => this.sesion()?.accessToken ?? null);

  autenticado() {
    const sesion = this.sesion();
    if (sesion && sesion.expira <= Date.now()) {
      this.limpiar();
      return false;
    }
    return sesion !== null;
  }

  login(email: string, password: string) {
    return this.guardar(this.http.post<RespuestaAuth>('/api/auth/login', { email, password }));
  }

  registrar(name: string, email: string, password: string) {
    return this.guardar(
      this.http.post<RespuestaAuth>('/api/auth/register', { name, email, password }),
    );
  }

  cerrarSesion() {
    this.limpiar();
    this.router.navigateByUrl('/acceso');
  }

  private guardar(peticion: Observable<RespuestaAuth>) {
    return peticion.pipe(
      tap((respuesta) => {
        const sesion: Sesion = { ...respuesta, expira: expiracion(respuesta.accessToken) };
        this.sesion.set(sesion);
        try {
          localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
        } catch {}
      }),
    );
  }

  private limpiar() {
    this.sesion.set(null);
    try {
      localStorage.removeItem(CLAVE_SESION);
    } catch {}
  }
}

function leerSesion(): Sesion | null {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION) ?? 'null') as Sesion | null;
    return sesion && sesion.expira > Date.now() ? sesion : null;
  } catch {
    return null;
  }
}

// Lee el "exp" del JWT; si no se puede leer, la sesión se trata como vencida
function expiracion(token: string) {
  try {
    const carga = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof carga.exp === 'number' ? carga.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

// Traduce los errores del backend a mensajes para la persona usuaria
export function mensajeDeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Ocurrió un error inesperado. Intenta de nuevo.';
  switch (error.status) {
    case 0:
      return 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
    case 401:
      return 'El correo o la contraseña no son correctos.';
    case 409:
      return 'Ya existe una cuenta con ese correo. Inicia sesión.';
    case 429:
      return 'Hiciste demasiados intentos. Espera un minuto e intenta de nuevo.';
    case 400:
      return 'Revisa los datos del formulario e intenta de nuevo.';
    default:
      return 'El servidor tuvo un problema. Intenta de nuevo en unos minutos.';
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = auth.token();
  const peticion =
    token && req.url.startsWith('/api/')
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(peticion).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token) {
        auth.cerrarSesion();
      }
      return throwError(() => error);
    }),
  );
};

export const soloAutenticados: CanActivateFn = () =>
  inject(Auth).autenticado() || inject(Router).createUrlTree(['/acceso']);

export const soloInvitados: CanActivateFn = () =>
  !inject(Auth).autenticado() || inject(Router).createUrlTree(['/inicio']);
