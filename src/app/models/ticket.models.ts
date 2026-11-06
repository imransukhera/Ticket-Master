export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface Ticket {
  ticketId: string;
  customerId: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  /** userId of the assigned agent, or null when unassigned. */
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** companyId is never sent: the backend takes it from the signed-in user's token. */
export interface CreateTicketRequest {
  customerId: string;
  title: string;
  description: string;
  priority: TicketPriority;
  assignedTo?: string | null;
}

export type UpdateTicketRequest = Partial<
  Pick<Ticket, 'customerId' | 'title' | 'description' | 'status' | 'priority' | 'assignedTo'>
>;

export const COMMENT_TYPES = ['PUBLIC_COMMENT', 'INTERNAL_NOTE'] as const;
export type CommentType = (typeof COMMENT_TYPES)[number];

export interface TicketComment {
  commentId: string;
  ticketId: string;
  type: CommentType;
  message: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateCommentRequest {
  type: CommentType;
  message: string;
}
