import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  /** True while the Cognito callback code is being exchanged (display only). */
  protected readonly completing = signal(false);

  async ngOnInit(): Promise<void> {
    if (!this.isBrowser) return;

    const params = this.route.snapshot.queryParamMap;
    const code = params.get('code');
    const cognitoError = params.get('error_description') ?? params.get('error');

    if (params.get('reason') === 'expired') {
      this.notice.set('Your session has expired. Please sign in again.');
    }

    if (cognitoError) {
      this.error.set(cognitoError);
      return;
    }

    if (code) {
      this.completing.set(true);
      this.busy.set(true);
      try {
        await this.auth.handleCallback(code, params.get('state'));
        await this.router.navigateByUrl(this.auth.consumeReturnUrl() ?? '/dashboard', { replaceUrl: true });
      } catch (e) {
        this.error.set(e instanceof Error ? e.message : 'Login failed. Please try again.');
        // Drop the used code from the address bar.
        await this.router.navigate([], { replaceUrl: true, queryParams: {} });
      } finally {
        this.busy.set(false);
        this.completing.set(false);
      }
      return;
    }

    if (this.auth.isAuthenticated()) {
      await this.router.navigateByUrl(this.auth.consumeReturnUrl() ?? '/dashboard', { replaceUrl: true });
    }
  }

  protected async signIn(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.login();
    } catch {
      // e.g. the page isn't served over HTTPS/localhost, so Web Crypto is unavailable.
      this.error.set("Couldn't start sign-in in this browser. Please try again.");
      this.busy.set(false);
    }
  }
}
