import { Service, effect, inject, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { Auth } from './auth';
import { Chat } from './chat';
import { Message, PresenceEvent, ReadEvent, TypingEvent } from './models/api.models';

/**
 * One Socket.IO connection for the whole app, opened while a member is signed in.
 * Components subscribe to the event streams below.
 */
@Service()
export class Realtime {
  private auth = inject(Auth);
  private chat = inject(Chat);
  private socket: Socket | null = null;

  readonly connected = signal(false);

  readonly messageNew$ = new Subject<Message>();
  readonly messagesRead$ = new Subject<ReadEvent>();
  readonly typing$ = new Subject<TypingEvent>();
  readonly presence$ = new Subject<PresenceEvent>();
  /** Fires after an automatic reconnection: missed events are not replayed, so reload through REST. */
  readonly reconnected$ = new Subject<void>();

  constructor() {
    effect(() => {
      const token = this.auth.token();
      untracked(() => (token ? this.connect(token) : this.disconnect()));
    });
  }

  emitTyping(conversationId: number, isTyping: boolean) {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  private connect(token: string) {
    this.disconnect();

    const socket = io({ auth: { token } });
    let firstConnection = true;

    socket.on('connect', () => {
      this.connected.set(true);
      this.chat.refreshUnread();
      if (!firstConnection) this.reconnected$.next();
      firstConnection = false;
    });
    socket.on('disconnect', () => this.connected.set(false));
    socket.on('connect_error', (err) => {
      if (err.message === 'unauthorized') this.auth.logout();
    });

    socket.on('message:new', (message: Message) => {
      this.messageNew$.next(message);
      if (message.senderId !== this.auth.user()?.id) this.chat.refreshUnread();
    });
    socket.on('messages:read', (e: ReadEvent) => this.messagesRead$.next(e));
    socket.on('typing', (e: TypingEvent) => this.typing$.next(e));
    socket.on('presence', (e: PresenceEvent) => this.presence$.next(e));

    this.socket = socket;
  }

  private disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.chat.unread.set(0);
  }
}