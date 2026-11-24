import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { ConversationSummary, Message } from './models/api.models';

export const MESSAGES_PAGE = 30;

@Service()
export class Chat {
  private http = inject(HttpClient);

  /** Unread messages across all conversations (navbar badge). */
  readonly unread = signal(0);

  start(userId: number) {
    return this.http.post<ConversationSummary>('/api/conversations', { userId });
  }

  list() {
    return this.http.get<ConversationSummary[]>('/api/conversations');
  }

  messages(conversationId: number, before?: number) {
    let params = new HttpParams().set('limit', MESSAGES_PAGE);
    if (before !== undefined) params = params.set('before', before);
    return this.http.get<Message[]>(`/api/conversations/${conversationId}/messages`, { params });
  }

  send(conversationId: number, body: string) {
    return this.http.post<Message>(`/api/conversations/${conversationId}/messages`, { body });
  }

  markRead(conversationId: number) {
    return this.http.post<{ updated: number }>(`/api/conversations/${conversationId}/read`, {});
  }

  refreshUnread() {
    this.http.get<{ count: number }>('/api/conversations/unread-count').subscribe({
      next: (r) => this.unread.set(r.count),
      error: () => {},
    });
  }
}