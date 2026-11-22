import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { Auth } from '../../core/auth';
import { Availability } from '../../core/availability';
import { LEVEL_LABELS, MODE_LABELS } from '../../core/labels';
import { ApiError, PublicUser, Session, TeacherAvailability } from '../../core/models/api.models';
import { Sessions } from '../../core/sessions';
import { BusyRange, DURATIONS, Slot, buildSlots, tunisDay } from '../../core/time';
import { Users } from '../../core/users';

type LoadState = 'loading' | 'ready' | 'notfound' | 'error';
const MAX_WEEKS = 8; // the API returns busy slots for the next 60 days

@Component({
  imports: [RouterLink],
  selector: 'app-book-session',
  styleUrl: './book-session.css',
  templateUrl: './book-session.html',
})
export class BookSession {
  private route = inject(ActivatedRoute);
  private users = inject(Users);
  private availabilityApi = inject(Availability);
  private sessionsApi = inject(Sessions);
  private auth = inject(Auth);

  protected readonly durations = DURATIONS;
  protected readonly levelLabels = LEVEL_LABELS;
  protected readonly modeLabels = MODE_LABELS;

  protected readonly state = signal<LoadState>('loading');
  protected readonly member = signal<PublicUser | null>(null);
  protected readonly availability = signal<TeacherAvailability>({ windows: [], busy: [] });
  protected readonly nowMs = signal(Date.now());

  protected readonly skillId = signal<number | null>(null);
  protected readonly duration = signal<30 | 60 | 90 | 120>(60);
  protected readonly weekOffset = signal(0);
  protected readonly selected = signal<Slot | null>(null);
  protected readonly message = signal('');

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly booked = signal<Session | null>(null);

  protected readonly isSelf = computed(
    () => this.auth.user()?.id === this.member()?.id && this.member() !== null,
  );
  protected readonly teach = computed(
    () => this.member()?.skills.filter((s) => s.type === 'teach') ?? [],
  );
  protected readonly learn = computed(
    () => this.member()?.skills.filter((s) => s.type === 'learn') ?? [],
  );
  protected readonly skill = computed(() => this.teach().find((s) => s.skillId === this.skillId()));
  protected readonly hasWindows = computed(() => this.availability().windows.length > 0);

  private readonly busy = computed<BusyRange[]>(() =>
    this.availability().busy.map((b) => ({
      startMs: new Date(b.startAt).getTime(),
      endMs: new Date(b.endAt).getTime(),
    })),
  );

  protected readonly columns = computed(() => {
    const now = this.nowMs();
    return Array.from({ length: 7 }, (_, i) => {
      const day = tunisDay(this.weekOffset() * 7 + i, now);
      return {
        day,
        slots: buildSlots(day, this.availability().windows, this.duration(), this.busy(), now),
      };
    });
  });

  protected readonly anySlot = computed(() => this.columns().some((c) => c.slots.length > 0));
  protected readonly rangeLabel = computed(() => {
    const cols = this.columns();
    return `${cols[0].day.short} – ${cols[6].day.short}`;
  });
  protected readonly durationLabel = computed(
    () => DURATIONS.find((d) => d.value === this.duration())?.label ?? '',
  );

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        tap(() => this.state.set('loading')),
        switchMap((id) =>
          Number.isInteger(id) && id > 0
            ? forkJoin({
                member: this.users.get(id),
                availability: this.availabilityApi.forUser(id),
              }).pipe(
                map((r) => ({ ...r, state: 'ready' as LoadState })),
                catchError((err) =>
                  of({
                    member: null,
                    availability: null,
                    state: (err.status === 404 ? 'notfound' : 'error') as LoadState,
                  }),
                ),
              )
            : of({ member: null, availability: null, state: 'notfound' as LoadState }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ member, availability, state }) => {
        this.member.set(member);
        this.availability.set(availability ?? { windows: [], busy: [] });
        this.nowMs.set(Date.now());
        this.selected.set(null);
        this.state.set(state);

        // Pre-select the skill from ?skill=, otherwise the first one taught
        const teach = member?.skills.filter((s) => s.type === 'teach') ?? [];
        const wanted = Number(this.route.snapshot.queryParamMap.get('skill'));
        this.skillId.set(teach.find((s) => s.skillId === wanted)?.skillId ?? teach[0]?.skillId ?? null);
      });
  }

  protected setSkill(value: string) {
    this.skillId.set(Number(value));
  }

  protected setDuration(value: string) {
    this.duration.set(Number(value) as 30 | 60 | 90 | 120);
    this.selected.set(null); // the old slot may no longer fit
  }

  protected shiftWeek(delta: number) {
    this.weekOffset.update((w) => Math.min(MAX_WEEKS - 1, Math.max(0, w + delta)));
  }

  protected pick(slot: Slot) {
    this.selected.set(slot);
    this.error.set(null);
  }

  protected submit() {
    const member = this.member();
    const slot = this.selected();
    const skillId = this.skillId();
    if (!member || !slot || skillId === null) return;

    this.submitting.set(true);
    this.error.set(null);

    this.sessionsApi
      .create({
        teacherId: member.id,
        skillId,
        startAt: slot.iso,
        durationMinutes: this.duration(),
        message: this.message().trim() || null,
      })
      .subscribe({
        next: (session) => {
          this.booked.set(session);
          this.submitting.set(false);
        },
        error: (err: HttpErrorResponse) => {
          const api = err.error as ApiError | null;
          this.error.set(
            err.status === 409
              ? 'Ce créneau n’est plus disponible. Choisis-en un autre.'
              : (api?.message ?? 'Impossible d’envoyer la demande pour le moment.'),
          );
          this.submitting.set(false);
          if (err.status === 409) this.reloadAvailability(member.id);
        },
      });
  }

  private reloadAvailability(teacherId: number) {
    this.availabilityApi.forUser(teacherId).subscribe((a) => {
      this.availability.set(a);
      this.nowMs.set(Date.now());
      this.selected.set(null);
    });
  }
}