import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { UserService } from '../../../services/user.service';
import { CustomerService } from '../../../services/customer.service';
import { ApiErrorKind, apiErrorMessage, errorKind, isRetryable } from '../../../services/http-error';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  Ticket,
  TicketPriority,
  TicketStatus,
  UpdateTicketRequest,
} from '../../../models/ticket.models';
import { AppUser } from '../../../models/user.models';
import { Customer } from '../../../models/customer.models';
import { humanize } from '../../../shared/format';
import { requiredText } from '../../../shared/validators';

/** Create (/tickets/new) and edit (/tickets/:id/edit) form. */
@Component({
  selector: 'app-ticket-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './ticket-form.html',
  styleUrl: './ticket-form.scss',
})
export class TicketForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tickets = inject(TicketService);
  private readonly users = inject(UserService);
  private readonly customers = inject(CustomerService);

  protected readonly statuses = TICKET_STATUSES;
  protected readonly priorities = TICKET_PRIORITIES;
  protected readonly humanize = humanize;
  protected readonly isRetryable = isRetryable;
  protected readonly maxTitle = 200;
  protected readonly maxDescription = 5000;

  protected readonly ticketId = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = !!this.ticketId;

  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal<string | null>(null);
  protected readonly loadErrorKind = signal<ApiErrorKind | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly userList = signal<AppUser[]>([]);

  /** Customer picker; falls back to a plain ID field if customers can't be loaded. */
  protected readonly customerList = signal<Customer[]>([]);
  protected readonly customersLoaded = signal(false);
  protected readonly useCustomerPicker = computed(() => this.customersLoaded() && this.customerList().length > 0);
  protected readonly sortedCustomers = computed(() =>
    [...this.customerList()].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
  );

  private original: Ticket | null = null;

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [requiredText, Validators.maxLength(this.maxTitle)]],
    customerId: ['', requiredText],
    description: ['', [requiredText, Validators.maxLength(this.maxDescription)]],
    priority: ['MEDIUM' as TicketPriority, Validators.required],
    status: ['OPEN' as TicketStatus, Validators.required],
    assignedTo: [''],
  });

  ngOnInit(): void {
    this.users.list().subscribe({ next: (u) => this.userList.set(u), error: () => {} });
    this.customers.list().subscribe({
      next: (c) => {
        this.customerList.set(c);
        this.customersLoaded.set(true);
      },
      error: () => this.customersLoaded.set(false),
    });
    if (this.isEdit) this.loadTicket();
  }

  protected loadTicket(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.tickets.get(this.ticketId!).subscribe({
      next: (t) => {
        this.original = t;
        this.form.reset({
          title: t.title ?? '',
          customerId: t.customerId ?? '',
          description: t.description ?? '',
          priority: t.priority,
          status: t.status,
          assignedTo: t.assignedTo ?? '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loadErrorKind.set(errorKind(err));
        this.loadError.set(
          apiErrorMessage(err, {
            notFound: "This ticket doesn't exist or has been deleted.",
            forbidden: "You don't have permission to edit this ticket.",
            fallback: "Couldn't load this ticket.",
          }),
        );
        this.loading.set(false);
      },
    });
  }

  /** The current customer may not be in the list (e.g. deleted); keep it selectable. */
  protected isKnownCustomer(id: string): boolean {
    return this.customerList().some((c) => c.customerId === id);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const assignedTo = v.assignedTo || null;
    this.saving.set(true);
    this.saveError.set(null);

    const fail = (err: unknown) => {
      this.saveError.set(
        apiErrorMessage(err, {
          forbidden: "You don't have permission to save this ticket.",
          notFound: 'This ticket no longer exists.',
          fallback: "Couldn't save the ticket.",
        }),
      );
      this.saving.set(false);
    };

    const clean = {
      ...v,
      title: v.title.trim(),
      customerId: v.customerId.trim(),
      description: v.description.trim(),
      assignedTo,
    };

    if (this.isEdit) {
      const changes = this.changedFields(clean);
      if (!Object.keys(changes).length) {
        this.router.navigate(['/tickets', this.ticketId]);
        return;
      }
      this.tickets.update(this.ticketId!, changes).subscribe({
        next: () => this.router.navigate(['/tickets', this.ticketId]),
        error: fail,
      });
    } else {
      this.tickets
        .create({
          title: clean.title,
          customerId: clean.customerId,
          description: clean.description,
          priority: clean.priority,
          assignedTo,
        })
        .subscribe({
          next: (t) => this.router.navigate(t?.ticketId ? ['/tickets', t.ticketId] : ['/tickets']),
          error: fail,
        });
    }
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  /** Only send what changed, so PATCH doesn't overwrite fields edited elsewhere. */
  private changedFields(v: Required<UpdateTicketRequest>): UpdateTicketRequest {
    const o = this.original;
    const out: UpdateTicketRequest = {};
    if (!o) return v;
    if (v.title !== o.title) out.title = v.title;
    if (v.customerId !== o.customerId) out.customerId = v.customerId;
    if (v.description !== o.description) out.description = v.description;
    if (v.priority !== o.priority) out.priority = v.priority;
    if (v.status !== o.status) out.status = v.status;
    if ((v.assignedTo ?? null) !== (o.assignedTo || null)) out.assignedTo = v.assignedTo;
    return out;
  }
}
