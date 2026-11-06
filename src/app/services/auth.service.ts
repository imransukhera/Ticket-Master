import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface TokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface StoredSession {
  accessToken: string;
  idToken: string;
  expiresAt: number; // epoch ms
}

const SESSION_KEY = 'sf.session';
const VERIFIER_KEY = 'sf.pkce_verifier';
const STATE_KEY = 'sf.oauth_state';
const RETURN_URL_KEY = 'sf.return_url';

/**
 * Cognito Hosted UI login using Authorization Code + PKCE.
 *
 * Tokens live in memory and in sessionStorage (cleared when the tab closes).
 * The refresh token is not kept, so the user signs in again when the access token expires.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly cfg = environment.cognito;

  /**
   * Where Cognito sends the browser back to: the site's own address (e.g. http://localhost:4200
   * or https://ticketmaster-e8ff2.web.app), so one build works everywhere. Each address must be
   * listed in the app client's callback URLs (and sign-out URLs if useSignOutUrl is on).
   */
  private readonly redirectUri = this.isBrowser ? window.location.origin : environment.cognito.redirectUri;

  private readonly session = signal<StoredSession | null>(this.loadSession());

  readonly isLoggedIn = computed(() => {
    const s = this.session();
    return !!s && s.expiresAt > Date.now();
  });

  readonly userEmail = computed(() => {
    const s = this.session();
    return s ? (decodeJwt(s.idToken)?.['email'] as string | undefined) ?? null : null;
  });

  isAuthenticated(): boolean {
    const s = this.session();
    if (s && s.expiresAt <= Date.now()) {
      this.clearSession();
      return false;
    }
    return !!s;
  }

  getAccessToken(): string | null {
    return this.isAuthenticated() ? this.session()!.accessToken : null;
  }

  /** Redirects the browser to the Cognito Hosted UI sign-in page. */
  async login(): Promise<void> {
    if (!this.isBrowser) return;
    const params = await this.newAuthorizeParams();
    window.location.assign(`${this.cfg.domain}/oauth2/authorize?${params.toString()}`);
  }

  /** Exchanges the authorization code from the callback URL for tokens. */
  async handleCallback(code: string, state: string | null): Promise<void> {
    if (!this.isBrowser) return;

    const expectedState = sessionStorage.getItem(STATE_KEY);
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);

    if (!verifier || !state || state !== expectedState) {
      throw new Error('Login failed: invalid or missing state. Please try again.');
    }

    const body = new HttpParams({
      fromObject: {
        grant_type: 'authorization_code',
        client_id: this.cfg.clientId,
        code,
        redirect_uri: this.redirectUri,
        code_verifier: verifier,
      },
    });

    const tokens = await firstValueFrom(
      this.http.post<TokenResponse>(`${this.cfg.domain}/oauth2/token`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    this.saveSession({
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      // Expire slightly early so we never send a token that is about to lapse.
      expiresAt: Date.now() + (tokens.expires_in - 30) * 1000,
    });
  }

  /**
   * Clears local tokens and ends the Cognito Hosted UI session, so the next sign-in asks for
   * credentials again instead of silently reusing the old session.
   *
   * - useSignOutUrl = true: Cognito returns to the site's address (SupportFlow's login page). Requires
   *   that URL in the app client's "Allowed sign-out URLs", otherwise Cognito shows "Invalid request".
   * - useSignOutUrl = false: Cognito goes straight to its sign-in page and, after signing in,
   *   back to the app. Only needs the callback URL, which is already registered.
   */
  async logout(): Promise<void> {
    this.clearSession();
    this.clearReturnUrl();
    if (!this.isBrowser) return;

    if (this.cfg.useSignOutUrl) {
      const params = new HttpParams({
        fromObject: { client_id: this.cfg.clientId, logout_uri: this.redirectUri },
      });
      window.location.assign(`${this.cfg.domain}/logout?${params.toString()}`);
      return;
    }

    const params = await this.newAuthorizeParams();
    window.location.assign(`${this.cfg.domain}/logout?${params.toString()}`);
  }

  /** Fresh PKCE verifier + state (stored for the callback) and the matching authorize parameters. */
  private async newAuthorizeParams(): Promise<HttpParams> {
    const verifier = randomString(64);
    const state = randomString(32);
    const challenge = base64Url(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
    );

    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);

    return new HttpParams({
      fromObject: {
        response_type: 'code',
        client_id: this.cfg.clientId,
        redirect_uri: this.redirectUri,
        scope: this.cfg.scopes,
        state,
        code_challenge_method: 'S256',
        code_challenge: challenge,
      },
    });
  }

  /** Drops local tokens only (e.g. after the API rejects them), without leaving the app. */
  endSession(): void {
    this.clearSession();
  }

  /** Remembers where a signed-out user was heading, so login can send them back there. */
  setReturnUrl(url: string): void {
    if (this.isBrowser && isSafeAppUrl(url)) sessionStorage.setItem(RETURN_URL_KEY, url);
  }

  /** Returns (and forgets) the remembered URL, or null. */
  consumeReturnUrl(): string | null {
    if (!this.isBrowser) return null;
    const url = sessionStorage.getItem(RETURN_URL_KEY);
    this.clearReturnUrl();
    return url && isSafeAppUrl(url) ? url : null;
  }

  private clearReturnUrl(): void {
    if (this.isBrowser) sessionStorage.removeItem(RETURN_URL_KEY);
  }

  private loadSession(): StoredSession | null {
    if (!this.isBrowser) return null;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  }

  private saveSession(s: StoredSession): void {
    this.session.set(s);
    if (this.isBrowser) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }

  private clearSession(): void {
    this.session.set(null);
    if (this.isBrowser) sessionStorage.removeItem(SESSION_KEY);
  }
}

function randomString(byteLength: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(payload), (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** Only same-app paths like "/tickets/123" — never another site (prevents open redirects). */
function isSafeAppUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login');
}
