/** One field change inside an audit entry. */
export interface AuditChange {
  field: string;
  /** undefined = there was no previous value (e.g. on create). */
  oldValue: unknown;
  /** undefined = there is no new value (e.g. on delete). */
  newValue: unknown;
}

/** Audit history entry shared by tickets, customers and users. */
export interface AuditEntry {
  auditId: string;
  /** e.g. TICKET_UPDATED, CUSTOMER_CREATED, USER_UPDATED */
  action: string;
  changes: AuditChange[];
  performedBy: string | null;
  createdAt: string;
}
