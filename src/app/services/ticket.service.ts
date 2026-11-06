import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from './api.service';
import { unwrapItem, unwrapList } from './unwrap';
import { toAuditEntry } from './audit';
import {
  CreateCommentRequest,
  CreateTicketRequest,
  Ticket,
  TicketComment,
  UpdateTicketRequest,
} from '../models/ticket.models';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<unknown>('/tickets').pipe(map((res) => unwrapList<Ticket>(res, 'tickets')));
  }

  get(id: string) {
    return this.api.get<unknown>(path(id)).pipe(map((res) => unwrapItem<Ticket>(res, 'ticket', 'ticketId')));
  }

  create(body: CreateTicketRequest) {
    return this.api
      .post<unknown>('/tickets', body)
      .pipe(map((res) => unwrapItem<Ticket>(res, 'ticket', 'ticketId')));
  }

  update(id: string, body: UpdateTicketRequest) {
    return this.api.patch<unknown>(path(id), body);
  }

  delete(id: string) {
    return this.api.delete<unknown>(path(id));
  }

  comments(id: string) {
    return this.api
      .get<unknown>(`${path(id)}/comments`)
      .pipe(map((res) => unwrapList<Record<string, unknown>>(res, 'comments').map(toComment)));
  }

  addComment(id: string, body: CreateCommentRequest) {
    return this.api.post<unknown>(`${path(id)}/comments`, body);
  }

  audit(id: string) {
    return this.api
      .get<unknown>(`${path(id)}/audit`)
      .pipe(map((res) => unwrapList<Record<string, unknown>>(res, 'audit').map((a) => toAuditEntry(a, 'TICKET_UPDATED'))));
  }
}

function path(id: string): string {
  return `/tickets/${encodeURIComponent(id)}`;
}

// Comment field names weren't specified, so this reads the likely variants.
function toComment(c: Record<string, unknown>): TicketComment {
  return {
    commentId: String(c['commentId'] ?? c['id'] ?? ''),
    ticketId: String(c['ticketId'] ?? ''),
    type: c['type'] === 'INTERNAL_NOTE' ? 'INTERNAL_NOTE' : 'PUBLIC_COMMENT',
    message: String(c['message'] ?? c['content'] ?? c['body'] ?? c['comment'] ?? ''),
    createdBy: String(c['createdBy'] ?? c['userId'] ?? ''),
    createdAt: String(c['createdAt'] ?? ''),
  };
}
