import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ApiErrorKind, apiErrorMessage, errorKind, isRetryable } from '../../services/http-error';
import { AppUser, USER_ROLES, USER_STATUSES } from '../../models/user.models';
import { eventValue, formatDate, humanize, initials, toneClass } from '../../shared/format';

@Component({
  selector: 'app-users',
  imports: [RouterLink],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly roles = USER_ROLES;
  protected readonly statuses = USER_STATUSES;
  protected readonly humanize = humanize;
  protected readonly toneClass = toneClass;
  protected readonly formatDate = formatDate;
  protected readonly value = eventValue;
  protected readonly isRetryable = isRetryable;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly errorKind = signal<ApiErrorKind | null>(null);
  protected readonly all = signal<AppUser[]>([]);

  protected readonly search = signal('');
  protected readonly role = signal('');
  protected readonly status = signal('');

  protected readonly hasFilters = computed(() => !!(this.search() || this.role() || this.status()));

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const role = this.role();
    const status = this.status();
    return this.all()
      .filter((u) => !role || u.role === role)
      .filter((u) => !status || u.status === status)
      .filter((u) => !q || (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q))
      .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''));
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.users.list().subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorKind.set(errorKind(err));
        this.error.set(
          apiErrorMessage(err, {
            forbidden: 'Only admins can view the user list.',
            notFound: 'The users list is not available from the API right now (404).',
            fallback: "Couldn't load users.",
          }),
        );
        this.loading.set(false);
      },
    });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.role.set('');
    this.status.set('');
  }

  protected isMe(u: AppUser): boolean {
    const me = this.auth.userEmail();
    return !!me && me.toLowerCase() === (u.email ?? '').toLowerCase();
  }

  protected open(u: AppUser): void {
    this.router.navigate(['/users', u.userId]);
  }

  protected initials(u: AppUser): string {
    return initials(u.name || u.email);
  }
}
