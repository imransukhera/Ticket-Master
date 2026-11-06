import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { ApiErrorKind, apiErrorMessage, errorKind, isForbidden, isRetryable } from '../../../services/http-error';
import {
  AppUser,
  USER_ROLES,
  USER_STATUSES,
  UpdateUserRequest,
  UserRole,
  UserStatus,
} from '../../../models/user.models';
import { AuditEntry } from '../../../models/audit.models';
import { eventValue, formatDateTime, humanize, initials, toneClass } from '../../../shared/format';

const EVENT_LABELS: Record<string, string> = {
  USER_CREATED: 'User invited',
  USER_UPDATED: 'User updated',
};

@Component({
  selector: 'app-user-detail',
  imports: [RouterLink],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.scss',
})
export class UserDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);

  protected readonly id = this.route.snapshot.paramMap.get('id')!;
  protected readonly roles = USER_ROLES;
  protected readonly statuses = USER_STATUSES;
  protected readonly humanize = humanize;
  protected readonly toneClass = toneClass;
  protected readonly formatDateTime = formatDateTime;
  protected readonly selectValue = eventValue;
  protected readonly isRetryable = isRetryable;

  protected readonly user = signal<AppUser | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly errorKind = signal<ApiErrorKind | null>(null);

  // Role / status editing
  protected readonly editing = signal(false);
  protected readonly draftRole = signal<UserRole>('AGENT');
  protected readonly draftStatus = signal<UserStatus>('ACTIVE');
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveForbidden = signal(false);
  protected readonly saved = signal(false);

  protected readonly audit = signal<AuditEntry[]>([]);
  protected readonly auditLoading = signal(true);
  protected readonly auditError = signal<string | null>(null);
  protected readonly sortedAudit = computed(() =>
    [...this.audit()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  /** Used to name whoever made each change in the history. */
  private readonly allUsers = signal<AppUser[]>([]);
  private readonly userNames = computed(() => new Map(this.allUsers().map((u) => [u.userId, u.name || u.email])));

  protected readonly isMe = computed(() => {
    const me = this.auth.userEmail();
    return !!me && me.toLowerCase() === (this.user()?.email ?? '').toLowerCase();
  });

  ngOnInit(): void {
    this.loadUser();
    this.loadAudit();
    this.users.list().subscribe({ next: (u) => this.allUsers.set(u), error: () => {} });
  }

  protected loadUser(): void {
    this.loading.set(true);
    this.error.set(null);
    this.users.get(this.id).subscribe({
      next: (u) => {
        this.user.set(u);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorKind.set(errorKind(err));
        this.error.set(
          apiErrorMessage(err, {
            forbidden: 'Only admins can view user details.',
            notFound: "This user doesn't exist or has been removed.",
            fallback: "Couldn't load this user.",
          }),
        );
        this.loading.set(false);
      },
    });
  }

  protected loadAudit(): void {
    this.auditLoading.set(true);
    this.auditError.set(null);
    this.users.audit(this.id).subscribe({
      next: (a) => {
        this.audit.set(a);
        this.auditLoading.set(false);
      },
      error: (err) => {
        this.auditError.set(
          apiErrorMessage(err, { forbidden: 'Only admins can view user history.', fallback: "Couldn't load the history." }),
        );
        this.auditLoading.set(false);
      },
    });
  }

  protected startEdit(): void {
    const u = this.user();
    if (!u) return;
    this.draftRole.set(u.role);
    this.draftStatus.set(u.status);
    this.saveError.set(null);
    this.saved.set(false);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.saveError.set(null);
  }

  protected save(): void {
    const u = this.user();
    if (!u) return;

    const changes: UpdateUserRequest = {};
    if (this.draftRole() !== u.role) changes.role = this.draftRole();
    if (this.draftStatus() !== u.status) changes.status = this.draftStatus();
    if (!Object.keys(changes).length) {
      this.editing.set(false);
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.saveForbidden.set(false);
    this.users.update(this.id, changes).subscribe({
      next: () => {
        this.user.set({ ...u, ...changes });
        this.saving.set(false);
        this.editing.set(false);
        this.saved.set(true);
        // Pick up the server's updatedAt and the new audit entry.
        this.users.get(this.id).subscribe({ next: (fresh) => this.user.set(fresh), error: () => {} });
        this.loadAudit();
      },
      error: (err) => {
        this.saveForbidden.set(isForbidden(err));
        this.saveError.set(
          apiErrorMessage(err, {
            forbidden: "You don't have permission to change roles or status. Only admins can edit users.",
            fallback: "Couldn't save the changes.",
          }),
        );
        this.saving.set(false);
      },
    });
  }

  protected eventLabel(action: string): string {
    return EVENT_LABELS[action] ?? humanize(action);
  }

  protected eventKind(action: string): string {
    return action.split('_').pop()?.toLowerCase() ?? 'updated';
  }

  protected userName(id: string): string {
    return this.userNames().get(id) ?? id;
  }

  protected formatValue(field: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return '(empty)';
    if (field === 'role' || field === 'status') return humanize(String(value));
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  protected initials(u: AppUser): string {
    return initials(u.name || u.email);
  }
}
