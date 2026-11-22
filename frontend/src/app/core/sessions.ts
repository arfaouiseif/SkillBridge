import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { CreateSessionRequest, Session } from './models/api.models';

@Service()
export class Sessions {
  private http = inject(HttpClient);

  create(body: CreateSessionRequest) {
    return this.http.post<Session>('/api/sessions', body);
  }

  list(when: 'upcoming' | 'past') {
    return this.http.get<Session[]>('/api/sessions', { params: new HttpParams().set('when', when) });
  }

  updateStatus(id: number, status: 'accepted' | 'declined' | 'cancelled' | 'completed') {
    return this.http.patch<Session>(`/api/sessions/${id}/status`, { status });
  }
}