import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { UserService } from '../../../services/user.service';
import { CustomerService } from '../../../services/customer.service';
import { ApiErrorKind, apiErrorMessage, errorKind, isRetryable } from '../../../services/http-error';
import {
  CommentType,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  Ticket,
  TicketComment,
  UpdateTicketRequest,
} from '../../../models/ticket.models';
import { AppUser } from '../../../models/user.models';
import { Customer } from '../../../models/customer.models';
import { AuditEntry } from '../../../models/audit.models';
import { eventValue, formatDateTime, humanize, toneClass } from '../../../shared/format';
import { AutofocusDirective } from '../../../shared/autofocus.directive';

type Tab = 'comments' | 'history';

@Component({
  selector: 'app-ticket-detail',
  imports: [RouterLink, AutofocusDirective],
  templateUrl: './ticket-detail.html',
  styleUrl: './ticket-detail.scss',
})
export class TicketDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tickets = inject(TicketService);
  private readonly users = inject(UserService);
  private readonly customers = inject(CustomerService);

  protected readonly statuses = TICKET_STATUSES;
  protected readonly priorities = TICKET_PRIORITIES;
  protected readonly humanize = humanize;
  protected readonly toneClass = toneClass;
  protected readonly formatDateTime = formatDateTime;
  protected readonly inputValue = eventValue;
  protected readonly isRetryable = isRetryable;
  protected readonly maxComment = 5000;

  protected readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly ticket = signal<Ticket | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly errorKind = signal<ApiErrorKind | null>(null);

  /** The ticket's customer, for showing a name instead of an ID. */
  protected readonly customer = signal<Customer | null>(null);

  protected readonly userList = signal<AppUser[]>([]);
  private readonly userNames = computed(() => new Map(this.userList().map((u) => [u.userId, u.name || u.email])));

  // Quick updates (status / priority / assignee)
  protected readonly updating = signal<keyof UpdateTicketRequest | null>(null);
  protected readonly updateError = signal<string | null>(null);

  // Comments & notes
  protected readonly tab = signal<Tab>('comments');
  protected readonly comments = signal<TicketComment[]>([]);
  protected readonly commentsLoading = signal(true);
  protected readonly commentsError = signal<string | null>(null);
  protected readonly commentType = signal<CommentType>('PUBLIC_COMMENT');
  protected readonly commentText = signal('');
  protected readonly posting = signal(false);
  protected readonly postError = signal<string | null>(null);

  // Audit history
  protected readonly audit = signal<AuditEntry[]>([]);
  protected readonly auditLoading = signal(true);
  protected readonly auditError = signal<string | null>(null);

  // Delete
  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly sortedComments = computed(() =>
    [...this.comments()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  );
  protected readonly sortedAudit = computed(() =>
    [...this.audit()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  ngOnInit(): void {
    this.loadTicket();
    this.loadComments();
    this.loadAudit();
    this.users.list().subscribe({ next: (u) => this.userList.set(u), error: () => {} });
  }

  protected loadTicket(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tickets.get(this.id).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.loading.set(false);
        this.loadCustomer(t.customerId);
      },
      error: (err) => {
        this.errorKind.set(errorKind(err));
        this.error.set(
          apiErrorMessage(err, {
            notFound: "This ticket doesn't exist or has been deleted.",
            forbidden: "You don't have permission to view this ticket.",
            fallback: "Couldn't load this ticket.",
          }),
        );
        this.loading.set(false);
      },
    });
  }

  protected loadComments(): void {
    this.commentsLoading.set(true);
    this.commentsError.set(null);
    this.tickets.comments(this.id).subscribe({
      next: (c) => {
        this.comments.set(c);
        this.commentsLoading.set(false);
      },
      error: (err) => {
        this.commentsError.set(apiErrorMessage(err, "Couldn't load comments."));
        this.commentsLoading.set(false);
      },
    });
  }

  protected loadAudit(): void {
    this.auditLoading.set(true);
    this.auditError.set(null);
    this.tickets.audit(this.id).subscribe({
      next: (a) => {
        this.audit.set(a);
        this.auditLoading.set(false);
      },
      error: (err) => {
        this.auditError.set(apiErrorMessage(err, "Couldn't load the history."));
        this.auditLoading.set(false);
      },
    });
  }

  /** Status, priority and assignee changes are saved straight away. */
  protected quickUpdate(field: 'status' | 'priority' | 'assignedTo', event: Event): void {
    const t = this.ticket();
    if (!t) return;
    const raw = (event.target as HTMLSelectElement).value;
    const value = field === 'assignedTo' ? raw || null : raw;
    if (value === (t[field] || null)) return;

    this.updating.set(field);
    this.updateError.set(null);
    // Show the change immediately; roll back if the API rejects it.
    this.ticket.set({ ...t, [field]: value } as Ticket);

    this.tickets.update(this.id, { [field]: value } as UpdateTicketRequest).subscribe({
      next: () => {
        this.updating.set(null);
        this.refreshTicketQuietly();
        this.loadAudit();
      },
      error: (err) => {
        this.ticket.set({ ...t });
        this.updateError.set(
          apiErrorMessage(err, {
            forbidden: `You don't have permission to change the ${humanize(field).toLowerCase()}.`,
            fallback: `Couldn't update ${humanize(field).toLowerCase()}.`,
          }),
        );
        this.updating.set(null);
      },
    });
  }

  protected postComment(): void {
    const message = this.commentText().trim();
    if (!message || message.length > this.maxComment || this.posting()) return;

    this.posting.set(true);
    this.postError.set(null);
    this.tickets.addComment(this.id, { type: this.commentType(), message }).subscribe({
      next: () => {
        this.commentText.set('');
        this.posting.set(false);
        this.loadComments();
        this.loadAudit();
      },
      error: (err) => {
        this.postError.set(
          apiErrorMessage(err, {
            forbidden: "You don't have permission to comment on this ticket.",
            fallback: "Couldn't add your comment.",
          }),
        );
        this.posting.set(false);
      },
    });
  }

  protected deleteTicket(): void {
    this.deleting.set(true);
    this.deleteError.set(null);
    this.tickets.delete(this.id).subscribe({
      next: () => this.router.navigate(['/tickets']),
      error: (err) => {
        this.deleteError.set(
          apiErrorMessage(err, {
            forbidden: "You don't have permission to delete tickets. Ask an admin.",
            fallback: "Couldn't delete the ticket.",
          }),
        );
        this.deleting.set(false);
      },
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.confirmingDelete()) this.closeDeleteDialog();
  }

  protected closeDeleteDialog(): void {
    if (this.deleting()) return;
    this.confirmingDelete.set(false);
    this.deleteError.set(null);
  }

  protected isKnownUser(id: string): boolean {
    return this.userNames().has(id);
  }

  protected userName(id: string | null | undefined): string {
    if (!id) return 'Unknown';
    return this.userNames().get(id) ?? id;
  }

  protected formatValue(field: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return field === 'assignedTo' ? 'Unassigned' : '—';
    if (field === 'assignedTo' || field === 'createdBy') return this.userName(String(value));
    if (field === 'status' || field === 'priority') return humanize(String(value));
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  private loadCustomer(id: string): void {
    if (!id || this.customer()?.customerId === id) return;
    this.customers.get(id).subscribe({ next: (c) => this.customer.set(c), error: () => this.customer.set(null) });
  }

  private refreshTicketQuietly(): void {
    this.tickets.get(this.id).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.loadCustomer(t.customerId);
      },
      error: () => {},
    });
  }
}
