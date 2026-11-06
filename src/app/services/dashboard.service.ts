import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { DashboardSummaryResponse } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly api = inject(ApiService);

  getSummary() {
    return this.api.get<DashboardSummaryResponse>('/dashboard/summary');
  }
}
