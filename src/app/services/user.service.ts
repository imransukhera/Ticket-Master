import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from './api.service';
import { AppUser, InviteUserRequest, UpdateUserRequest } from '../models/user.models';
import { toAuditEntry } from './audit';
import { unwrapItem, unwrapList } from './unwrap';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<unknown>('/users').pipe(map((res) => unwrapList<AppUser>(res, 'users')));
  }

  get(id: string) {
    return this.api.get<unknown>(path(id)).pipe(map((res) => unwrapItem<AppUser>(res, 'user', 'userId')));
  }

  invite(body: InviteUserRequest) {
    return this.api.post<unknown>('/users', body).pipe(map((res) => unwrapItem<AppUser>(res, 'user', 'userId')));
  }

  update(id: string, body: UpdateUserRequest) {
    return this.api.patch<unknown>(path(id), body);
  }

  audit(id: string) {
    return this.api
      .get<unknown>(`${path(id)}/audit`)
      .pipe(map((res) => unwrapList<Record<string, unknown>>(res, 'audit').map((a) => toAuditEntry(a, 'USER_UPDATED'))));
  }
}

function path(id: string): string {
  return `/users/${encodeURIComponent(id)}`;
}
