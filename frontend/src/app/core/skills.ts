import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Skill } from './models/api.models';

@Service()
export class Skills {
  private http = inject(HttpClient);

  search(q: string) {
    return this.http.get<Skill[]>('/api/skills', { params: new HttpParams().set('q', q) });
  }
}