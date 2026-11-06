import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { ApiErrorKind, apiErrorMessage, errorKind, isRetryable } from '../../services/http-error';
import { DashboardSummaryResponse } from '../../models/dashboard.models';
import { formatDate, humanize, toneClass } from '../../shared/format';

interface MetricCard {
  label: string;
  value: number;
  tone: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboard = inject(DashboardService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly errorKind = signal<ApiErrorKind | null>(null);
  protected readonly isRetryable = isRetryable;
  protected readonly data = signal<DashboardSummaryResponse | null>(null);

  protected readonly humanize = humanize;
  protected readonly toneClass = toneClass;
  protected readonly formatDate = formatDate;
  protected readonly skeletonCards = Array.from({ length: 8 });

  protected readonly cards = computed<MetricCard[]>(() => {
    const s = this.data()?.summary;
    if (!s) return [];
    return [
      { label: 'Total Tickets', value: s.totalTickets, tone: 'accent-primary' },
      { label: 'Open', value: s.openTickets, tone: 'accent-open' },
      { label: 'In Progress', value: s.inProgressTickets, tone: 'accent-progress' },
      { label: 'Resolved', value: s.resolvedTickets, tone: 'accent-resolved' },
      { label: 'Total Customers', value: s.totalCustomers, tone: 'accent-neutral' },
      { label: 'Total Users', value: s.totalUsers, tone: 'accent-neutral' },
      { label: 'Critical Tickets', value: s.criticalPriorityTickets, tone: 'accent-critical' },
      { label: 'Unassigned Tickets', value: s.unassignedTickets, tone: 'accent-warning' },
    ];
  });

  // Largest value in each series, used to scale the CSS bars.
  protected readonly maxStatus = computed(() => maxOf(this.data()?.charts.ticketsByStatus.map((p) => p.count)));
  protected readonly maxPriority = computed(() => maxOf(this.data()?.charts.ticketsByPriority.map((p) => p.count)));
  protected readonly maxTrend = computed(() => maxOf(this.data()?.ticketTrend.map((p) => p.count)));
  protected readonly maxWorkload = computed(() => maxOf(this.data()?.agentWorkload.map((a) => a.assignedTickets)));
  protected readonly trendTotal = computed(() =>
    (this.data()?.ticketTrend ?? []).reduce((sum, p) => sum + p.count, 0),
  );

  /** userId -> agent name, so recent tickets can show who they're assigned to. */
  private readonly agentNames = computed(
    () => new Map((this.data()?.agentWorkload ?? []).map((a) => [a.userId, a.name || a.email])),
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboard.getSummary().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.errorKind.set(errorKind(err));
        this.error.set(
          apiErrorMessage(err, {
            forbidden: "You don't have permission to view the dashboard.",
            notFound: 'The dashboard service is not available right now.',
            fallback: 'Something went wrong while loading the dashboard.',
          }),
        );
        this.loading.set(false);
      },
    });
  }

  protected assigneeName(userId: string | null): string | null {
    if (!userId) return null;
    return this.agentNames().get(userId) ?? userId;
  }

  /** Bar length as a percentage of the series maximum (min 2% so non-zero values stay visible). */
  protected percent(value: number, max: number): number {
    return max > 0 && value > 0 ? Math.max((value / max) * 100, 2) : 0;
  }

  protected formatDay(value: string): string {
    const d = parseDate(value);
    return d ? d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) : value;
  }
}

function maxOf(values: number[] | undefined): number {
  return values?.length ? Math.max(...values) : 0;
}

/** Parses "YYYY-MM-DD" as a local date (new Date() would treat it as UTC and can shift the day). */
function parseDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
