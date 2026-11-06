import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from './api.service';
import { unwrapItem, unwrapList } from './unwrap';
import { toAuditEntry } from './audit';
import { CreateCustomerRequest, Customer, UpdateCustomerRequest } from '../models/customer.models';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<unknown>('/customers').pipe(map((res) => unwrapList<Customer>(res, 'customers')));
  }

  get(id: string) {
    return this.api.get<unknown>(path(id)).pipe(map((res) => unwrapItem<Customer>(res, 'customer', 'customerId')));
  }

  create(body: CreateCustomerRequest) {
    return this.api
      .post<unknown>('/customers', body)
      .pipe(map((res) => unwrapItem<Customer>(res, 'customer', 'customerId')));
  }

  update(id: string, body: UpdateCustomerRequest) {
    return this.api.patch<unknown>(path(id), body);
  }

  delete(id: string) {
    return this.api.delete<unknown>(path(id));
  }

  audit(id: string) {
    return this.api
      .get<unknown>(`${path(id)}/audit`)
      .pipe(map((res) => unwrapList<Record<string, unknown>>(res, 'audit').map((a) => toAuditEntry(a, 'CUSTOMER_UPDATED'))));
  }
}

function path(id: string): string {
  return `/customers/${encodeURIComponent(id)}`;
}
