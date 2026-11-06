import { AuditChange, AuditEntry } from '../models/audit.models';

/** Identifiers and bookkeeping fields that aren't worth showing in a history timeline. */
const HIDDEN_FIELDS = new Set([
  'ticketId',
  'customerId',
  'userId',
  'companyId',
  'createdAt',
  'updatedAt',
  'PK',
  'SK',
  'entityType',
  'cognitoSub',
]);

/**
 * Normalises one audit record. Old/new values may arrive as whole snapshots
 * ({ oldValue: {...}, newValue: {...} }), a `changes` array or map, or a single field;
 * all become a flat list of changed fields.
 */
export function toAuditEntry(a: Record<string, unknown>, defaultAction: string): AuditEntry {
  const oldRaw = a['oldValue'] ?? a['oldValues'] ?? a['before'];
  const newRaw = a['newValue'] ?? a['newValues'] ?? a['after'];
  const rawChanges = a['changes'];
  let changes: AuditChange[] = [];

  if (Array.isArray(rawChanges)) {
    changes = (rawChanges as Record<string, unknown>[]).map((c) => ({
      field: String(c['field'] ?? ''),
      oldValue: c['oldValue'] ?? c['from'],
      newValue: c['newValue'] ?? c['to'],
    }));
  } else if (isObject(rawChanges)) {
    changes = Object.entries(rawChanges).map(([field, v]) => {
      const o = isObject(v) ? v : { newValue: v };
      return { field, oldValue: o['oldValue'] ?? o['old'] ?? o['from'], newValue: o['newValue'] ?? o['new'] ?? o['to'] };
    });
  } else if (isObject(oldRaw) || isObject(newRaw)) {
    const before = isObject(oldRaw) ? oldRaw : {};
    const after = isObject(newRaw) ? newRaw : {};
    for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (HIDDEN_FIELDS.has(field)) continue;
      const o = isObject(oldRaw) ? before[field] : undefined;
      const n = isObject(newRaw) ? after[field] : undefined;
      if (isObject(oldRaw) && isObject(newRaw) && JSON.stringify(o) === JSON.stringify(n)) continue;
      changes.push({ field, oldValue: o, newValue: n });
    }
  } else if (a['field']) {
    changes = [{ field: String(a['field']), oldValue: oldRaw, newValue: newRaw }];
  }

  const by = a['performedBy'] ?? a['changedBy'] ?? a['actor'] ?? a['createdBy'];
  return {
    auditId: String(a['auditId'] ?? a['id'] ?? ''),
    action: String(a['action'] ?? a['eventType'] ?? defaultAction),
    changes: changes.filter((c) => c.field),
    performedBy: by ? String(by) : null,
    createdAt: String(a['createdAt'] ?? a['timestamp'] ?? ''),
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
