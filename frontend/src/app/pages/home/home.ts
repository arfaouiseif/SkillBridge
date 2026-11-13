import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { Navbar } from '../../shared/navbar/navbar';

@Component({
  imports: [RouterLink, Navbar],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  protected auth = inject(Auth);

  // Illustrative examples, as in the prototype
  protected readonly examples = [
    { name: 'Sara', teaches: 'Figma', learns: 'guitare' },
    { name: 'Yassine', teaches: 'plomberie', learns: 'anglais' },
    { name: 'Amal', teaches: 'Python', learns: 'photo' },
    { name: 'Mehdi', teaches: 'menuiserie', learns: 'Excel' },
  ];

  protected readonly steps = [
    { number: '01', title: 'Crée ton profil', text: 'Ce que tu sais, ce que tu veux apprendre.' },
    { number: '02', title: 'Trouve ton échange', text: 'Une mise en relation réciproque.' },
    { number: '03', title: 'Réserve une session', text: 'Choisis un créneau qui vous convient à tous les deux.' },
  ];
}