import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { CreateSessionRequest, Session } from './models/api.models';

@Service()
export class Sessions {
  private http = inject(HttpClient);

  create(body: CreateSessionRequest) {
    return this.http.post<Session>('/api/sessions', body);
  }
}