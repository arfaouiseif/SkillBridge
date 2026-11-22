import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { Auth } from '../../core/auth';
import { STATUS_LABELS } from '../../core/labels';
import { ApiError, Session } from '../../core/models/api.models';
import { Sessions } from '../../core/sessions';
import { formatSessionTime } from '../../core/time';

type Tab = 'upcoming' | 'past';
type NewStatus = 'accepted' | 'declined' | 'cancelled' | 'completed';

@Component({
  imports: [RouterLink],
  selector: 'app-my-sessions',
  styleUrl: './my-sessions.css',
  templateUrl: './my-sessions.html',
})
export class MySessions {
  private sessionsApi = inject(Sessions);
  protected auth = inject(Auth);

  protected readonly statusLabels = STATUS_LABELS;

  protected readonly tab = signal<Tab>('upcoming');
  private readonly tick = signal(0);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly sessions = signal<Session[]>([]);
  protected readonly busyId = signal<number | null>(null);
  private readonly nowMs = signal(Date.now());

  protected readonly rows = computed(() => {
    const me = this.auth.user()?.id;
    const now = this.nowMs();
    return this.sessions().map((session) => {
      const iAmTeacher = session.teacher.id === me;
      const started = new Date(session.startAt).getTime() <= now;
      const ended = new Date(session.endAt).getTime() <= now;
      return {
        session,
        iAmTeacher,
        other: iAmTeacher ? session.learner : session.teacher,
        when: formatSessionTime(session.startAt, session.endAt),
        inactive: session.status === 'declined' || session.status === 'cancelled',
        canAnswer: iAmTeacher && session.status === 'pending' && !started,
        canCancel: (session.status === 'pending' || session.status === 'accepted') && !started,
        canComplete: session.status === 'accepted' && ended,
      };
    });
  });

  protected readonly toAnswer = computed(() => this.rows().filter((r) => r.canAnswer).length);

  constructor() {
    const query = computed(() => ({ when: this.tab(), tick: this.tick() }));

    toObservable(query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
          this.actionError.set(null);
        }),
        switchMap(({ when }) =>
          this.sessionsApi.list(when).pipe(
            catchError(() => {
              this.error.set('Impossible de charger tes sessions.');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        this.sessions.set(list ?? []);
        this.nowMs.set(Date.now());
        this.loading.set(false);
      });
  }

  protected setTab(tab: Tab) {
    if (tab !== this.tab()) {
      this.sessions.set([]);
      this.tab.set(tab);
    }
  }

  protected change(row: { session: Session; other: { name: string } }, status: NewStatus) {
    if (status === 'declined' && !confirm(`Refuser la demande de ${row.other.name} ?`)) return;
    if (status === 'cancelled' && !confirm(`Annuler cette session avec ${row.other.name} ?`)) return;

    this.busyId.set(row.session.id);
    this.actionError.set(null);

    this.sessionsApi.updateStatus(row.session.id, status).subscribe({
      next: (updated) => {
        this.sessions.update((list) => list.map((s) => (s.id === updated.id ? updated : s)));
        this.busyId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        const api = err.error as ApiError | null;
        this.actionError.set(api?.message ?? 'Action impossible pour le moment.');
        this.busyId.set(null);
        if (err.status === 409) this.tick.update((t) => t + 1); // refresh: the situation changed
      },
    });
  }
}