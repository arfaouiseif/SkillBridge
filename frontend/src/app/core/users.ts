import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { PaginatedUsers, SkillCategory } from './models/api.models';

export interface UserSearch {
  q?: string;
  category?: SkillCategory;
  page?: number;
  pageSize?: number;
}

@Service()
export class Users {
  private http = inject(HttpClient);

  search(filters: UserSearch) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<PaginatedUsers>('/api/users', { params });
  }
}