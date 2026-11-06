import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { UserService } from '../../../services/user.service';
import { ApiErrorKind, apiErrorMessage, errorKind, isRetryable } from '../../../services/http-error';
import { Customer } from '../../../models/customer.models';
import { AppUser } from '../../../models/user.models';
import { AuditEntry } from '../../../models/audit.models';
import { formatDateTime, humanize, initials } from '../../../shared/format';
import { AutofocusDirective } from '../../../shared/autofocus.directive';

const EVENT_LABELS: Record<string, string> = {
  CUSTOMER_CREATED: 'Customer created',
  CUSTOMER_UPDATED: 'Customer updated',
  CUSTOMER_DELETED: 'Customer deleted',
};

@Component({
  selector: 'app-customer-detail',
  imports: [RouterLink, AutofocusDirective],
  templateUrl: './customer-detail.html',
  styleUrl: './customer-detail.scss',
})
export class CustomerDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customers = inject(CustomerService);
  private readonly users = inject(UserService);

  protected readonly id = this.route.snapshot.paramMap.get('id')!;
  protected readonly humanize = humanize;
  protected readonly formatDateTime = formatDateTime;
  protected readonly initials = initials;
  protected readonly isRetryable = isRetryable;

  protected readonly customer = signal<Customer | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly errorKind = signal<ApiErrorKind | null>(null);

  protected readonly audit = signal<AuditEntry[]>([]);
  protected readonly auditLoading = signal(true);
  protected readonly auditError = signal<string | null>(null);
  protected readonly sortedAudit = computed(() =>
    [...this.audit()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  private readonly userList = signal<AppUser[]>([]);
  private readonly userNames = computed(() => new Map(this.userList().map((u) => [u.userId, u.name || u.email])));

  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCustomer();
    this.loadAudit();
    // Only used to show who made each change; the page works without it.
    this.users.list().subscribe({ next: (u) => this.userList.set(u), error: () => {} });
  }

  protected loadCustomer(): void {
    this.loading.set(true);
    this.error.set(null);
    this.customers.get(this.id).subscribe({
      next: (c) => {
        this.customer.set(c);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorKind.set(errorKind(err));
        this.error.set(
          apiErrorMessage(err, {
            notFound: "This customer doesn't exist or has been deleted.",
            forbidden: "You don't have permission to view this customer.",
            fallback: "Couldn't load this customer.",
          }),
        );
        this.loading.set(false);
      },
    });
  }

  protected loadAudit(): void {
    this.auditLoading.set(true);
    this.auditError.set(null);
    this.customers.audit(this.id).subscribe({
      next: (a) => {
        this.audit.set(a);
        this.auditLoading.set(false);
      },
      error: (err) => {
        this.auditError.set(
          apiErrorMessage(err, { forbidden: "You don't have permission to view this history.", fallback: "Couldn't load the history." }),
        );
        this.auditLoading.set(false);
      },
    });
  }

  protected deleteCustomer(): void {
    this.deleting.set(true);
    this.deleteError.set(null);
    this.customers.delete(this.id).subscribe({
      next: () => this.router.navigate(['/customers']),
      error: (err) => {
        this.deleteError.set(
          apiErrorMessage(err, {
            forbidden: "You don't have permission to delete customers. Ask an admin.",
            fallback: "Couldn't delete the customer.",
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

  protected eventLabel(action: string): string {
    return EVENT_LABELS[action] ?? humanize(action);
  }

  /** created / updated / deleted, used to colour the timeline dot. */
  protected eventKind(action: string): string {
    return action.split('_').pop()?.toLowerCase() ?? 'updated';
  }

  protected userName(id: string): string {
    return this.userNames().get(id) ?? id;
  }

  protected formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '(empty)';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
}
