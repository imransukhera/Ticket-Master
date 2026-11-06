import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { ApiErrorKind, apiErrorMessage, errorKind, isRetryable } from '../../../services/http-error';
import { emailAddress, phoneNumber, requiredText } from '../../../shared/validators';
import { Customer, UpdateCustomerRequest } from '../../../models/customer.models';

/** Create (/customers/new) and edit (/customers/:id/edit) form. */
@Component({
  selector: 'app-customer-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.scss',
})
export class CustomerForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customers = inject(CustomerService);

  protected readonly customerId = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = !!this.customerId;

  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal<string | null>(null);
  protected readonly loadErrorKind = signal<ApiErrorKind | null>(null);
  protected readonly isRetryable = isRetryable;
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  private original: Customer | null = null;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [requiredText, Validators.maxLength(120)]],
    email: ['', [requiredText, emailAddress, Validators.maxLength(254)]],
    phone: ['', phoneNumber],
  });

  ngOnInit(): void {
    if (this.isEdit) this.loadCustomer();
  }

  protected loadCustomer(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.customers.get(this.customerId!).subscribe({
      next: (c) => {
        this.original = c;
        this.form.reset({ name: c.name ?? '', email: c.email ?? '', phone: c.phone ?? '' });
        this.loading.set(false);
      },
      error: (err) => {
        this.loadErrorKind.set(errorKind(err));
        this.loadError.set(
          apiErrorMessage(err, {
            notFound: "This customer doesn't exist or has been deleted.",
            forbidden: "You don't have permission to edit this customer.",
            fallback: "Couldn't load this customer.",
          }),
        );
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const v = { name: raw.name.trim(), email: raw.email.trim(), phone: raw.phone.trim() || null };
    this.saving.set(true);
    this.saveError.set(null);

    const fail = (err: unknown) => {
      this.saveError.set(
        apiErrorMessage(err, {
          forbidden: "You don't have permission to save customers.",
          notFound: 'This customer no longer exists.',
          fallback: "Couldn't save the customer.",
        }),
      );
      this.saving.set(false);
    };

    if (this.isEdit) {
      const changes = this.changedFields(v);
      if (!Object.keys(changes).length) {
        this.router.navigate(['/customers', this.customerId]);
        return;
      }
      this.customers.update(this.customerId!, changes).subscribe({
        next: () => this.router.navigate(['/customers', this.customerId]),
        error: fail,
      });
    } else {
      this.customers.create(v).subscribe({
        next: (c) => this.router.navigate(c?.customerId ? ['/customers', c.customerId] : ['/customers']),
        error: fail,
      });
    }
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  /** Only send what changed, so PATCH doesn't overwrite fields edited elsewhere. */
  private changedFields(v: { name: string; email: string; phone: string | null }): UpdateCustomerRequest {
    const o = this.original;
    if (!o) return v;
    const out: UpdateCustomerRequest = {};
    if (v.name !== o.name) out.name = v.name;
    if (v.email !== o.email) out.email = v.email;
    if (v.phone !== (o.phone || null)) out.phone = v.phone;
    return out;
  }
}
