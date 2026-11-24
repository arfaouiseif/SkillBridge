import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Realtime } from './core/realtime';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  // Instantiated here so the socket opens at login and closes at logout
  private readonly realtime = inject(Realtime);
}