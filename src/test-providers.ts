import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

/** Providers every component test needs: a router and a fake HttpClient (no real API calls). */
export default [provideHttpClient(), provideHttpClientTesting(), provideRouter([])];
