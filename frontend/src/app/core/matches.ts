import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Match } from './models/api.models';

@Service()
export class Matches {
  private http = inject(HttpClient);

  list(limit = 10) {
    return this.http.get<Match[]>('/api/matches', {
      params: new HttpParams().set('limit', limit),
    });
  }
}