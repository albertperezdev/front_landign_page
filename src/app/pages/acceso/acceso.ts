import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Auth, mensajeDeError } from '../../core/auth';

type Pestana = 'login' | 'registro';

// Mismas reglas que el backend: minúscula, mayúscula y número
const CLAVE_SEGURA = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

@Component({
  selector: 'app-acceso',
  templateUrl: './acceso.html',
  host: { class: 'flex min-h-dvh flex-col' },
})
export class Acceso {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  pestana = signal<Pestana>('login');
  verClaveLogin = signal(false);
  verClaveRegistro = signal(false);
  enviando = signal(false);
  errorLogin = signal('');
  errorRegistro = signal('');

  elegir(pestana: Pestana, enfocar = false) {
    this.pestana.set(pestana);
    if (enfocar) {
      document.getElementById(`tab-${pestana}`)?.focus();
    }
  }

  teclaPestanas(evento: KeyboardEvent) {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) {
      evento.preventDefault();
      const siguiente: Pestana =
        evento.key === 'Home'
          ? 'login'
          : evento.key === 'End'
            ? 'registro'
            : this.pestana() === 'login'
              ? 'registro'
              : 'login';
      this.elegir(siguiente, true);
    }
  }

  protected iniciarSesion(evento: SubmitEvent) {
    evento.preventDefault();
    const datos = new FormData(evento.target as HTMLFormElement);
    this.enviar(
      this.auth.login(String(datos.get('correo')), String(datos.get('clave'))),
      this.errorLogin,
    );
  }

  protected crearCuenta(evento: SubmitEvent) {
    evento.preventDefault();
    const datos = new FormData(evento.target as HTMLFormElement);
    const clave = String(datos.get('clave'));

    if (!CLAVE_SEGURA.test(clave)) {
      this.errorRegistro.set(
        'La contraseña debe tener al menos una minúscula, una mayúscula y un número.',
      );
      return;
    }
    if (clave !== datos.get('confirmar')) {
      this.errorRegistro.set('Las contraseñas no coinciden.');
      return;
    }

    this.enviar(
      this.auth.registrar(String(datos.get('nombre')).trim(), String(datos.get('correo')), clave),
      this.errorRegistro,
    );
  }

  private enviar(peticion: Observable<unknown>, error: typeof this.errorLogin) {
    if (this.enviando()) return;
    this.enviando.set(true);
    error.set('');
    peticion.subscribe({
      next: () => this.router.navigateByUrl('/inicio'),
      error: (e) => {
        error.set(mensajeDeError(e));
        this.enviando.set(false);
      },
    });
  }
}
