import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { CATEGORY_LABELS, LEVEL_LABELS } from '../../core/labels';
import { PaginatedUsers, Skill, SkillCategory } from '../../core/models/api.models';
import { Skills } from '../../core/skills';
import { Users } from '../../core/users';

const PAGE_SIZE = 10;

@Component({
  imports: [RouterLink],
  selector: 'app-explorer',
  styleUrl: './explorer.css',
  templateUrl: './explorer.html',
})
export class Explorer {
  private users = inject(Users);
  private skills = inject(Skills);

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly tabs: { label: string; value: SkillCategory | null }[] = [
    { label: 'Tout', value: null },
    ...(Object.entries(CATEGORY_LABELS) as [SkillCategory, string][]).map(([value, label]) => ({
      label,
      value,
    })),
  ];

  // What the user is typing (drives the suggestions only)
  protected readonly draft = signal('');
  protected readonly suggestionsOpen = signal(false);
  protected readonly suggestions = signal<Skill[]>([]);

  // Applied filters (drive the member list)
  protected readonly nameFilter = signal('');
  protected readonly selectedSkill = signal<Skill | null>(null);
  protected readonly category = signal<SkillCategory | null>(null);
  protected readonly page = signal(1);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<PaginatedUsers | null>(null);

  protected readonly totalPages = computed(() => {
    const r = this.result();
    return r ? Math.max(1, Math.ceil(r.total / r.pageSize)) : 1;
  });

  protected readonly rows = computed(() =>
    (this.result()?.items ?? []).map((u) => {
      const skillId = this.selectedSkill()?.id;
      const cat = this.category();
      const teach = u.skills.filter((s) => s.type === 'teach');
      const shown =
        teach.find((s) =>
          skillId ? s.skillId === skillId : !cat || s.skill?.category === cat,
        ) ?? teach[0];
      const learn = u.skills.find((s) => s.type === 'learn');
      return {
        id: u.id,
        name: u.name,
        teaches: shown?.skill ? `${shown.skill.name} · ${LEVEL_LABELS[shown.level]}` : null,
        learns: learn?.skill?.name ?? null,
      };
    }),
  );

  constructor() {
    // 1. Skill suggestions while typing
    toObservable(this.draft)
      .pipe(
        map((text) => text.trim()),
        distinctUntilChanged(),
        debounceTime(250),
        switchMap((text) =>
          text.length < 2
            ? of([] as Skill[])
            : this.skills.search(text).pipe(catchError(() => of([] as Skill[]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((list) => this.suggestions.set(list.slice(0, 6)));

    // 2. Member list, refetched whenever a filter changes
    const params = computed(() => ({
      q: this.nameFilter() || undefined,
      skill: this.selectedSkill()?.id,
      category: this.category() ?? undefined,
      page: this.page(),
      pageSize: PAGE_SIZE,
    }));

    toObservable(params)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((p) =>
          this.users.search(p).pipe(
            catchError(() => {
              this.error.set('Impossible de charger les membres.');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (res) this.result.set(res);
      });
  }

  protected onType(value: string) {
    this.draft.set(value);
    this.suggestionsOpen.set(true);
  }

  protected pickSkill(skill: Skill) {
    this.selectedSkill.set(skill);
    this.category.set(null);
    this.resetDraft();
  }

  protected applyName() {
    const text = this.draft().trim();
    if (text.length > 0) {
      this.nameFilter.set(text);
      this.resetDraft();
    }
  }

  protected clearSkill() {
    this.selectedSkill.set(null);
    this.page.set(1);
  }

  protected clearName() {
    this.nameFilter.set('');
    this.page.set(1);
  }

  protected selectCategory(value: SkillCategory | null) {
    this.category.set(value);
    this.selectedSkill.set(null);
    this.page.set(1);
  }

  protected goTo(page: number) {
    if (page >= 1 && page <= this.totalPages()) this.page.set(page);
  }

  private resetDraft() {
    this.draft.set('');
    this.suggestionsOpen.set(false);
    this.page.set(1);
  }
}