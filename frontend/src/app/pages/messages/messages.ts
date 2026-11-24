import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Auth } from '../../core/auth';
import { Chat, MESSAGES_PAGE } from '../../core/chat';
import { ApiError, ConversationSummary, Message } from '../../core/models/api.models';
import { Realtime } from '../../core/realtime';
import { formatInstant, tunisDay } from '../../core/time';
import { TypingNotifier } from '../../core/typing';

@Component({
  imports: [RouterLink],
  selector: 'app-messages',
  styleUrl: './messages.css',
  templateUrl: './messages.html',
})
export class Messages {
  private route = inject(ActivatedRoute);
  private chat = inject(Chat);
  private realtime = inject(Realtime);
  private injector = inject(Injector);
  protected auth = inject(Auth);

  private thread = viewChild<ElementRef<HTMLElement>>('thread');
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly notifier = new TypingNotifier((id, isTyping) =>
    this.realtime.emitTyping(id, isTyping),
  );

  protected readonly conversations = signal<ConversationSummary[]>([]);
  protected readonly listLoading = signal(true);
  protected readonly listError = signal<string | null>(null);

  protected readonly activeId = signal<number | null>(null);
  protected readonly messages = signal<Message[]>([]);
  protected readonly threadLoading = signal(false);
  protected readonly threadError = signal<string | null>(null);
  protected readonly hasMore = signal(false);
  protected readonly loadingOlder = signal(false);

  protected readonly draft = signal('');
  protected readonly sending = signal(false);
  protected readonly sendError = signal<string | null>(null);
  protected readonly otherTyping = signal(false);

  protected readonly meId = computed(() => this.auth.user()?.id);
  protected readonly active = computed(
    () => this.conversations().find((c) => c.id === this.activeId()) ?? null,
  );

  protected readonly items = computed(() => {
    const me = this.meId();
    const todayKey = tunisDay(0).iso;
    let previousKey = '';
    return this.messages().map((message) => {
      const t = formatInstant(message.createdAt);
      const day =
        t.dayKey !== previousKey ? (t.dayKey === todayKey ? 'Aujourd’hui' : t.day) : null;
      previousKey = t.dayKey;
      return { message, mine: message.senderId === me, time: t.time, day };
    });
  });

  constructor() {
    this.loadConversations();

    this.route.paramMap
      .pipe(
        map((params) => (params.get('id') ? Number(params.get('id')) : null)),
        takeUntilDestroyed(),
      )
      .subscribe((id) => this.open(id));

    this.realtime.messageNew$.pipe(takeUntilDestroyed()).subscribe((m) => this.onMessageNew(m));
    this.realtime.messagesRead$.pipe(takeUntilDestroyed()).subscribe((e) => {
      const me = this.meId();
      if (e.conversationId === this.activeId() && e.readerId !== me) {
        this.messages.update((list) =>
          list.map((m) => (m.senderId === me && !m.readAt ? { ...m, readAt: e.readAt } : m)),
        );
      }
    });
    this.realtime.typing$.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e.conversationId === this.activeId() && e.userId !== this.meId()) {
        this.setOtherTyping(e.isTyping);
      }
    });
    this.realtime.presence$.pipe(takeUntilDestroyed()).subscribe((e) => {
      this.conversations.update((list) =>
        list.map((c) =>
          c.otherUser.id === e.userId ? { ...c, otherUser: { ...c.otherUser, online: e.online } } : c,
        ),
      );
    });
    this.realtime.reconnected$.pipe(takeUntilDestroyed()).subscribe(() => this.resync());

    inject(DestroyRef).onDestroy(() => {
      this.notifier.stop();
      if (this.typingTimeout) clearTimeout(this.typingTimeout);
    });
  }

  // ---- Template actions ----

  protected onInput(value: string) {
    this.draft.set(value);
    const id = this.activeId();
    if (id === null) return;
    if (value.trim()) this.notifier.keystroke(id);
    else this.notifier.stop();
  }

  protected onEnter(event: Event) {
    if ((event as KeyboardEvent).shiftKey) return; // Shift+Enter = new line
    event.preventDefault();
    this.send();
  }

  protected send() {
    const id = this.activeId();
    const body = this.draft().trim();
    if (id === null || !body || this.sending()) return;

    this.sending.set(true);
    this.sendError.set(null);

    this.chat.send(id, body).subscribe({
      next: (message) => {
        this.notifier.stop();
        this.draft.set('');
        this.sending.set(false);
        this.addMessage(message);
        this.updateConversation(message, false);
      },
      error: (err: HttpErrorResponse) => {
        this.sendError.set((err.error as ApiError | null)?.message ?? 'Message non envoyé.');
        this.sending.set(false);
      },
    });
  }

  protected loadOlder() {
    const id = this.activeId();
    const oldest = this.messages()[0];
    const el = this.thread()?.nativeElement;
    if (id === null || !oldest || this.loadingOlder()) return;

    this.loadingOlder.set(true);
    const previousHeight = el?.scrollHeight ?? 0;

    this.chat.messages(id, oldest.id).subscribe({
      next: (older) => {
        if (this.activeId() !== id) return;
        this.messages.update((list) => this.merge(older, list));
        this.hasMore.set(older.length >= MESSAGES_PAGE);
        this.loadingOlder.set(false);
        // Keep the reader where they were instead of jumping to the top
        afterNextRender(
          () => {
            if (el) el.scrollTop += el.scrollHeight - previousHeight;
          },
          { injector: this.injector },
        );
      },
      error: () => this.loadingOlder.set(false),
    });
  }

  // ---- Loading ----

  private loadConversations() {
    this.chat.list().subscribe({
      next: (list) => {
        this.conversations.set(list);
        this.listLoading.set(false);
        this.listError.set(null);
      },
      error: () => {
        this.listError.set('Impossible de charger tes conversations.');
        this.listLoading.set(false);
      },
    });
  }

  private open(id: number | null) {
    this.notifier.stop();
    this.activeId.set(id);
    this.messages.set([]);
    this.hasMore.set(false);
    this.draft.set('');
    this.sendError.set(null);
    this.threadError.set(null);
    this.setOtherTyping(false);
    if (id === null) return;

    if (!Number.isInteger(id) || id <= 0) {
      this.threadError.set('Conversation introuvable.');
      return;
    }

    this.threadLoading.set(true);
    this.chat.messages(id).subscribe({
      next: (list) => {
        if (this.activeId() !== id) return;
        this.messages.set(list);
        this.hasMore.set(list.length >= MESSAGES_PAGE);
        this.threadLoading.set(false);
        this.scrollToBottom();
        this.markRead(id);
      },
      error: (err: HttpErrorResponse) => {
        if (this.activeId() !== id) return;
        this.threadError.set(
          err.status === 404 ? 'Conversation introuvable.' : 'Impossible de charger les messages.',
        );
        this.threadLoading.set(false);
      },
    });
  }

  /** After a reconnection: missed events are not replayed, so reload everything through REST. */
  private resync() {
    this.loadConversations();
    const id = this.activeId();
    if (id === null) return;
    this.chat.messages(id).subscribe((latest) => {
      if (this.activeId() !== id) return;
      this.messages.update((list) => this.merge(list, latest));
      this.scrollToBottom();
      this.markRead(id);
    });
  }

  // ---- Real-time handlers ----

  private onMessageNew(message: Message) {
    const fromOther = message.senderId !== this.meId();
    const isActive = message.conversationId === this.activeId();

    if (isActive) {
      this.addMessage(message);
      if (fromOther) {
        this.setOtherTyping(false);
        this.markRead(message.conversationId);
      }
    }

    if (!this.conversations().some((c) => c.id === message.conversationId)) {
      this.loadConversations(); // a brand-new conversation started by the other member
      return;
    }
    this.updateConversation(message, fromOther && !isActive);
  }

  // ---- Helpers ----

  /** Adds a message once: it can arrive both from the POST response and from the socket. */
  private addMessage(message: Message) {
    if (message.conversationId !== this.activeId()) return;
    if (this.messages().some((m) => m.id === message.id)) return;
    this.messages.update((list) => [...list, message]);
    this.scrollToBottom();
  }

  private updateConversation(message: Message, countAsUnread: boolean) {
    this.conversations.update((list) =>
      list
        .map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: message,
                updatedAt: message.createdAt,
                unreadCount: countAsUnread ? c.unreadCount + 1 : c.unreadCount,
              }
            : c,
        )
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    );
  }

  private markRead(conversationId: number) {
    this.chat.markRead(conversationId).subscribe({
      next: () => {
        this.conversations.update((list) =>
          list.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
        );
        this.chat.refreshUnread();
      },
      error: () => {},
    });
  }

  private merge(a: Message[], b: Message[]) {
    const byId = new Map<number, Message>();
    for (const m of [...a, ...b]) byId.set(m.id, m);
    return [...byId.values()].sort((x, y) => x.id - y.id);
  }

  private setOtherTyping(isTyping: boolean) {
    this.otherTyping.set(isTyping);
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    // Safety net: if the "stopped typing" event is lost, do not stay stuck on "écrit…"
    if (isTyping) this.typingTimeout = setTimeout(() => this.otherTyping.set(false), 6000);
  }

  private scrollToBottom() {
    afterNextRender(
      () => {
        const el = this.thread()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      },
      { injector: this.injector },
    );
  }
}