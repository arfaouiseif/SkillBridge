import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Auth } from '../../core/auth';
import { Navbar } from '../../shared/navbar/navbar';

@Component({
  imports: [RouterOutlet, Navbar],
  selector: 'app-main-layout',
  templateUrl: './main-layout.html',
})
export class MainLayout {
  constructor() {
    const auth = inject(Auth);
    if (!auth.user()) {
      auth.loadMe().subscribe();
    }
  }
}