import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  // Signed-in pages depend on tokens that only exist in the browser.
  { path: '**', renderMode: RenderMode.Client },
];
