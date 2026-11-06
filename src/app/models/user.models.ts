export const USER_ROLES = ['ADMIN', 'AGENT'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface AppUser {
  userId: string;
  /** Set by the backend from the signed-in admin. Read-only in the frontend. */
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

/** companyId is never sent: the backend derives it from the logged-in admin. */
export interface InviteUserRequest {
  name: string;
  email: string;
  role: UserRole;
}

export type UpdateUserRequest = Partial<{ role: UserRole; status: UserStatus }>;
