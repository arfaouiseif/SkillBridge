import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { TeacherAvailability } from './models/api.models';

@Service()
export class Availability {
  private http = inject(HttpClient);

  forUser(id: number) {
    return this.http.get<TeacherAvailability>(`/api/users/${id}/availability`);
  }
}