/** Exact shape of GET /dashboard/summary. */
export interface DashboardSummaryResponse {
  companyId: string;
  summary: DashboardSummary;
  recentTickets: RecentTicket[];
  charts: DashboardCharts;
  ticketTrend: TicketTrendPoint[];
  agentWorkload: AgentWorkload[];
}

export interface DashboardSummary {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  highPriorityTickets: number;
  criticalPriorityTickets: number;
  assignedTickets: number;
  unassignedTickets: number;
  totalCustomers: number;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  agentUsers: number;
}

export interface RecentTicket {
  ticketId: string;
  title: string;
  status: string;
  priority: string;
  /** User ID of the assigned agent, or null/empty when unassigned. */
  assignedTo: string | null;
  createdAt: string;
}

export interface DashboardCharts {
  ticketsByStatus: StatusCount[];
  ticketsByPriority: PriorityCount[];
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface PriorityCount {
  priority: string;
  count: number;
}

export interface TicketTrendPoint {
  /** ISO date, e.g. "2026-10-20". */
  date: string;
  count: number;
}

export interface AgentWorkload {
  userId: string;
  name: string;
  email: string;
  status: string;
  assignedTickets: number;
}
