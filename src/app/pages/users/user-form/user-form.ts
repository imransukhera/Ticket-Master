import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { apiErrorMessage, isForbidden } from '../../../services/http-error';
import { emailAddress, requiredText } from '../../../shared/validators';
import { USER_ROLES, UserRole } from '../../../models/user.models';
import { humanize } from '../../../shared/format';

/** Invite form (/users/invite). Role and status edits happen on the user details page. */
@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly users = inject(UserService);

  protected readonly roles = USER_ROLES;
  protected readonly humanize = humanize;

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly forbidden = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [requiredText, Validators.maxLength(120)]],
    email: ['', [requiredText, emailAddress, Validators.maxLength(254)]],
    role: ['AGENT' as UserRole, Validators.required],
  });

  protected readonly roleHelp: Record<UserRole, string> = {
    ADMIN: 'Full access, including managing users.',
    AGENT: 'Works on tickets and customers.',
  };

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.saveError.set(null);
    this.forbidden.set(false);

    this.users.invite({ name: v.name.trim(), email: v.email.trim(), role: v.role }).subscribe({
      next: (u) => this.router.navigate(u?.userId ? ['/users', u.userId] : ['/users']),
      error: (err) => {
        this.forbidden.set(isForbidden(err));
        this.saveError.set(
          apiErrorMessage(err, {
            forbidden: "You don't have permission to invite users. Only admins can invite users.",
            fallback: "Couldn't invite this user.",
          }),
        );
        this.saving.set(false);
      },
    });
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }
}
