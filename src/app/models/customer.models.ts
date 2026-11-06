export interface Customer {
  customerId: string;
  /** Set by the backend from the signed-in user. Read-only in the frontend. */
  companyId: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

/** companyId is never sent: the backend derives it from the logged-in user. */
export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone?: string | null;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;
