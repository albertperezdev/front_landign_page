import { Component, inject } from '@angular/core';
import { Auth } from '../../core/auth';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
  host: { class: 'flex min-h-dvh flex-col' },
})
export class Inicio {
  protected readonly auth = inject(Auth);
}
