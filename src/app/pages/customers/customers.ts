import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { ApiErrorKind, apiErrorMessage, errorKind, isRetryable } from '../../services/http-error';
import { eventValue, formatDate, initials } from '../../shared/format';
import { Customer } from '../../models/customer.models';

@Component({
  selector: 'app-customers',
  imports: [RouterLink],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
})
export class Customers implements OnInit {
  private readonly customers = inject(CustomerService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly errorKind = signal<ApiErrorKind | null>(null);
  protected readonly isRetryable = isRetryable;
  protected readonly formatDate = formatDate;
  protected readonly initials = initials;
  protected readonly value = eventValue;
  protected readonly all = signal<Customer[]>([]);
  protected readonly search = signal('');

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return this.all()
      .filter(
        (c) =>
          !q ||
          (c.name ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          (c.phone ?? '').toLowerCase().includes(q) ||
          // Lets "0412 345" match "+61412345678".
          (digits.length >= 3 && (c.phone ?? '').replace(/\D/g, '').includes(digits)),
      )
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.customers.list().subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorKind.set(errorKind(err));
        this.error.set(
          apiErrorMessage(err, {
            forbidden: "You don't have permission to view customers.",
            notFound: 'The customers list is not available from the API right now (404).',
            fallback: "Couldn't load customers.",
          }),
        );
        this.loading.set(false);
      },
    });
  }

  protected open(c: Customer): void {
    this.router.navigate(['/customers', c.customerId]);
  }
}
