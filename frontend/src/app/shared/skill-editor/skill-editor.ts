import { Component, computed, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { CATEGORY_LABELS, LEVEL_LABELS, MODE_LABELS } from '../../core/labels';
import { Skill, SkillLevel, SkillMode, UserSkill } from '../../core/models/api.models';
import { Skills } from '../../core/skills';

@Component({
  selector: 'app-skill-editor',
  styleUrl: './skill-editor.css',
  templateUrl: './skill-editor.html',
})
export class SkillEditor {
  private skillsApi = inject(Skills);

  readonly type = input.required<'teach' | 'learn'>();
  readonly title = input.required<string>();
  readonly hint = input('');
  readonly skills = model.required<UserSkill[]>();

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly levelLabels = LEVEL_LABELS;
  protected readonly modeLabels = MODE_LABELS;
  protected readonly levels = Object.keys(LEVEL_LABELS) as SkillLevel[];
  protected readonly modes = Object.keys(MODE_LABELS) as SkillMode[];

  protected readonly draft = signal('');
  protected readonly open = signal(false);
  protected readonly searching = signal(false);
  private readonly found = signal<Skill[]>([]);

  // Hide skills that are already in the list
  protected readonly suggestions = computed(() => {
    const taken = new Set(this.skills().map((s) => s.skillId));
    return this.found()
      .filter((s) => !taken.has(s.id))
      .slice(0, 6);
  });

  constructor() {
    toObservable(this.draft)
      .pipe(
        map((text) => text.trim()),
        distinctUntilChanged(),
        debounceTime(250),
        tap((text) => this.searching.set(text.length >= 2)),
        switchMap((text) =>
          text.length < 2
            ? of([] as Skill[])
            : this.skillsApi.search(text).pipe(catchError(() => of([] as Skill[]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        this.found.set(list);
        this.searching.set(false);
      });
  }

  protected add(skill: Skill) {
    this.skills.update((list) => [
      ...list,
      { skillId: skill.id, type: this.type(), level: 'beginner', mode: 'both', skill },
    ]);
    this.draft.set('');
    this.open.set(false);
  }

  protected remove(skillId: number) {
    this.skills.update((list) => list.filter((s) => s.skillId !== skillId));
  }

  protected setLevel(skillId: number, level: SkillLevel) {
    this.skills.update((list) => list.map((s) => (s.skillId === skillId ? { ...s, level } : s)));
  }

  protected setMode(skillId: number, mode: SkillMode) {
    this.skills.update((list) => list.map((s) => (s.skillId === skillId ? { ...s, mode } : s)));
  }
}