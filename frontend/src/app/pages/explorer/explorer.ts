import { Component, inject } from '@angular/core';
import { Auth } from '../../core/auth';

@Component({
  selector: 'app-explorer',
  styleUrl: './explorer.css',
  templateUrl: './explorer.html',
})
export class Explorer {
  protected auth = inject(Auth);

  constructor() {
    if (!this.auth.user()) {
      this.auth.loadMe().subscribe();
    }
  }
}