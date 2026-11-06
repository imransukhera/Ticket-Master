import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Like Validators.required, but also rejects whitespace-only text. */
export const requiredText: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  typeof c.value === 'string' && c.value.trim() === '' ? { required: true } : null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Stricter than Validators.email: requires a dot in the domain (rejects "a@b"). Empty is allowed. */
export const emailAddress: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  !c.value || EMAIL.test(String(c.value).trim()) ? null : { email: true };

/** Digits, spaces, +, -, brackets; 6–20 characters with at least 6 digits. Empty is allowed. */
export const phoneNumber: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '').trim();
  if (!v) return null;
  return /^[+()\d\s-]{6,20}$/.test(v) && v.replace(/\D/g, '').length >= 6 ? null : { phone: true };
};
