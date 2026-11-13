import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { CATEGORY_LABELS, LEVEL_LABELS } from '../../core/labels';
import { PaginatedUsers, SkillCategory } from '../../core/models/api.models';
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

  protected readonly tabs: { label: string; value: SkillCategory | null }[] = [
    { label: 'Tout', value: null },
    ...(Object.entries(CATEGORY_LABELS) as [SkillCategory, string][]).map(([value, label]) => ({
      label,
      value,
    })),
  ];

  protected readonly query = signal('');
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
      const cat = this.category();
      const teach = u.skills.filter((s) => s.type === 'teach');
      const shown = teach.find((s) => !cat || s.skill?.category === cat) ?? teach[0];
      const learn = u.skills.find((s) => s.type === 'learn');
      return {
        id: u.id,
        name: u.name,
        city: u.city ?? null,
        teaches: shown?.skill ? `${shown.skill.name} · ${LEVEL_LABELS[shown.level]}` : null,
        learns: learn?.skill?.name ?? null,
      };
    }),
  );

  constructor() {
    const params = computed(() => ({
      q: this.query().trim() || undefined,
      category: this.category() ?? undefined,
      page: this.page(),
      pageSize: PAGE_SIZE,
    }));

    toObservable(params)
      .pipe(
        debounceTime(300),
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

  protected onSearch(value: string) {
    this.query.set(value);
    this.page.set(1);
  }

  protected selectCategory(value: SkillCategory | null) {
    this.category.set(value);
    this.page.set(1);
  }

  protected goTo(page: number) {
    if (page >= 1 && page <= this.totalPages()) this.page.set(page);
  }
}