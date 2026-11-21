import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../core/auth';
import { Matches } from '../../core/matches';
import { ApiError, Match, Skill, UpdateProfileRequest, User, UserSkill } from '../../core/models/api.models';
import { SkillEditor } from '../../shared/skill-editor/skill-editor';
import { RouterLink } from '@angular/router';

@Component({
  imports: [ReactiveFormsModule, RouterLink , SkillEditor],
  selector: 'app-my-profile',
  styleUrl: './my-profile.css',
  templateUrl: './my-profile.html',
})
export class MyProfile {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private matchesApi = inject(Matches);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    bio: ['', [Validators.maxLength(500)]],
    university: [''],
    year: [null as number | null],
    city: [''],
  });

  protected readonly teach = signal<UserSkill[]>([]);
  protected readonly learn = signal<UserSkill[]>([]);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly matches = signal<Match[]>([]);
  protected readonly matchesLoading = signal(true);
  protected readonly matchesError = signal<string | null>(null);

  constructor() {
    this.auth.loadMe().subscribe({
      next: (user) => {
        this.fill(user);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger ton profil.');
        this.loading.set(false);
      },
    });
    this.refreshMatches();
  }

  protected save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);

    const v = this.form.getRawValue();
    const body: UpdateProfileRequest = {
      name: v.name.trim(),
      bio: v.bio.trim() || null,
      university: v.university.trim() || null,
      year: v.year,
      city: v.city.trim() || null,
      skills: [...this.teach(), ...this.learn()].map(({ skillId, type, level, mode }) => ({
        skillId,
        type,
        level,
        mode,
      })),
    };

    this.auth.updateProfile(body).subscribe({
      next: (user) => {
        this.fill(user);
        this.saving.set(false);
        this.saved.set(true);
        this.refreshMatches();
      },
      error: (err: HttpErrorResponse) => {
        const api = err.error as ApiError | null;
        const details = api?.details?.map((d) => `${d.field} : ${d.message}`).join(' · ');
        this.error.set(details || api?.message || 'Impossible d’enregistrer pour le moment.');
        this.saving.set(false);
      },
    });
  }

  protected names(skills: Skill[]) {
    return skills.map((s) => s.name).join(', ');
  }

  private fill(user: User) {
    this.form.patchValue({
      name: user.name,
      bio: user.bio ?? '',
      university: user.university ?? '',
      year: user.year ?? null,
      city: user.city ?? '',
    });
    this.teach.set(user.skills.filter((s) => s.type === 'teach'));
    this.learn.set(user.skills.filter((s) => s.type === 'learn'));
  }

  private refreshMatches() {
    this.matchesLoading.set(true);
    this.matchesError.set(null);
    this.matchesApi.list().subscribe({
      next: (list) => {
        this.matches.set(list);
        this.matchesLoading.set(false);
      },
      error: () => {
        this.matchesError.set('Impossible de charger tes correspondances.');
        this.matchesLoading.set(false);
      },
    });
  }
}