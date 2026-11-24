import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink , Router } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { LEVEL_LABELS, MODE_LABELS } from '../../core/labels';
import { PublicUser } from '../../core/models/api.models';
import { Users } from '../../core/users';
import { Auth } from '../../core/auth';
import { Chat } from '../../core/chat';

type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

@Component({
  imports: [RouterLink],
  selector: 'app-member-profile',
  styleUrl: './member-profile.css',
  templateUrl: './member-profile.html',
})
export class MemberProfile {
  private route = inject(ActivatedRoute);
  private users = inject(Users);
  private auth = inject(Auth);
  private chat = inject(Chat);
  private router = inject(Router);

  protected readonly levelLabels = LEVEL_LABELS;
  protected readonly modeLabels = MODE_LABELS;

  protected readonly state = signal<LoadState>('loading');
  protected readonly member = signal<PublicUser | null>(null);

  protected readonly messaging = signal(false);
  protected readonly messageError = signal<string | null>(null);

  protected readonly teach = computed(
    () => this.member()?.skills.filter((s) => s.type === 'teach') ?? [],
  );
  protected readonly learn = computed(
    () => this.member()?.skills.filter((s) => s.type === 'learn') ?? [],
  );
  protected readonly meta = computed(() => {
    const m = this.member();
    if (!m) return '';
    return [m.university, m.year ? `Année ${m.year}` : null, m.city].filter(Boolean).join(' · ');
  });
  protected readonly isSelf = computed(()=> this.auth.user()?.id === this.member()?.id );

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        tap(() => this.state.set('loading')),
        switchMap((id) =>
          Number.isInteger(id) && id > 0
            ? this.users.get(id).pipe(
                map((member) => ({ member, state: 'ready' as LoadState })),
                catchError((err) =>
                  of({
                    member: null,
                    state: (err.status === 404 ? 'notfound' : 'error') as LoadState,
                  }),
                ),
              )
            : of({ member: null, state: 'notfound' as LoadState }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ member, state }) => {
        this.member.set(member);
        this.state.set(state);
      });
  }
  protected startChat() {
  const member = this.member();
  if (!member) return;
  this.messaging.set(true);
  this.messageError.set(null);
  this.chat.start(member.id).subscribe({
    next: (conversation) => this.router.navigate(['/messages', conversation.id]),
    error: () => {
      this.messageError.set('Impossible d’ouvrir la conversation.');
      this.messaging.set(false);
    },
  });
  }
}