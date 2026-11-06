import { toAuditEntry } from './audit';

describe('toAuditEntry', () => {
  it('diffs old/new snapshots and hides bookkeeping fields', () => {
    const entry = toAuditEntry(
      {
        auditId: 'a1',
        action: 'CUSTOMER_UPDATED',
        oldValue: { customerId: 'c1', name: 'Ann', email: 'ann@x.com', updatedAt: '1' },
        newValue: { customerId: 'c1', name: 'Anne', email: 'ann@x.com', updatedAt: '2' },
        performedBy: 'u1',
        createdAt: '2026-10-20T10:00:00Z',
      },
      'CUSTOMER_UPDATED',
    );
    expect(entry.changes).toEqual([{ field: 'name', oldValue: 'Ann', newValue: 'Anne' }]);
    expect(entry.performedBy).toBe('u1');
  });

  it('treats a create as new values only', () => {
    const entry = toAuditEntry({ action: 'USER_CREATED', newValue: { name: 'Sam', role: 'AGENT' } }, 'USER_UPDATED');
    expect(entry.action).toBe('USER_CREATED');
    expect(entry.changes).toEqual([
      { field: 'name', oldValue: undefined, newValue: 'Sam' },
      { field: 'role', oldValue: undefined, newValue: 'AGENT' },
    ]);
  });

  it('reads a changes array', () => {
    const entry = toAuditEntry({ changes: [{ field: 'status', from: 'OPEN', to: 'RESOLVED' }] }, 'TICKET_UPDATED');
    expect(entry.action).toBe('TICKET_UPDATED');
    expect(entry.changes).toEqual([{ field: 'status', oldValue: 'OPEN', newValue: 'RESOLVED' }]);
  });
});
