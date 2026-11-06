import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { UserService } from '../../services/user.service';
import { ApiErrorKind, apiErrorMessage, errorKind, isRetryable } from '../../services/http-error';
import { TICKET_PRIORITIES, TICKET_STATUSES, Ticket } from '../../models/ticket.models';
import { AppUser } from '../../models/user.models';
import { eventValue, formatDate, humanize, toneClass } from '../../shared/format';

const UNASSIGNED = '__unassigned';

@Component({
  selector: 'app-tickets',
  imports: [RouterLink],
  templateUrl: './tickets.html',
  styleUrl: './tickets.scss',
})
export class Tickets implements OnInit {
  private readonly tickets = inject(TicketService);
  private readonly users = inject(UserService);
  private readonly router = inject(Router);

  protected readonly statuses = TICKET_STATUSES;
  protected readonly priorities = TICKET_PRIORITIES;
  protected readonly unassigned = UNASSIGNED;
  protected readonly humanize = humanize;
  protected readonly toneClass = toneClass;
  protected readonly formatDate = formatDate;
  protected readonly value = eventValue;
  protected readonly isRetryable = isRetryable;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly errorKind = signal<ApiErrorKind | null>(null);
  protected readonly all = signal<Ticket[]>([]);
  protected readonly userList = signal<AppUser[]>([]);

  protected readonly search = signal('');
  protected readonly status = signal('');
  protected readonly priority = signal('');
  protected readonly assignee = signal('');

  private readonly userNames = computed(
    () => new Map(this.userList().map((u) => [u.userId, u.name || u.email])),
  );

  protected readonly hasFilters = computed(
    () => !!(this.search() || this.status() || this.priority() || this.assignee()),
  );

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.status();
    const priority = this.priority();
    const assignee = this.assignee();

    return this.all()
      .filter((t) => !status || t.status === status)
      .filter((t) => !priority || t.priority === priority)
      .filter((t) =>
        !assignee ? true : assignee === UNASSIGNED ? !t.assignedTo : t.assignedTo === assignee,
      )
      .filter(
        (t) =>
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.ticketId.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          (t.customerId ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  });

  ngOnInit(): void {
    this.load();
    // Assignee names are a nice-to-have; the list still works without them.
    this.users.list().subscribe({ next: (u) => this.userList.set(u), error: () => {} });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tickets.list().subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorKind.set(errorKind(err));
        this.error.set(
          apiErrorMessage(err, {
            forbidden: "You don't have permission to view tickets.",
            notFound: 'The tickets list is not available from the API right now (404).',
            fallback: "Couldn't load tickets.",
          }),
        );
        this.loading.set(false);
      },
    });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.status.set('');
    this.priority.set('');
    this.assignee.set('');
  }

  protected userName(id: string | null): string | null {
    return id ? (this.userNames().get(id) ?? id) : null;
  }

  protected open(t: Ticket): void {
    this.router.navigate(['/tickets', t.ticketId]);
  }
}
