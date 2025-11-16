import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  QuotaCheckResponse,
  SubscriptionStatus,
} from '../../Interfaces/quota.interfaces';

@Injectable({
  providedIn: 'root',
})
export class QuotaService {
  private apiUrl = `${environment.apiUrl}/Quota`;

  constructor(private http: HttpClient) {}

  /**
   * Check if user can access a specific skill
   * @param skill - 'reading', 'listening', 'speaking', or 'writing'
   */
  checkQuota(skill: string): Observable<QuotaCheckResponse> {
    return this.http.get<QuotaCheckResponse>(`${this.apiUrl}/check/${skill}`);
  }

  /**
   * Increment quota after user completes an exam
   * @param skill - 'reading', 'listening', 'speaking', or 'writing'
   */
  incrementQuota(skill: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/increment/${skill}`, {});
  }

  /**
   * Get user's subscription status
   */
  getSubscriptionStatus(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(
      `${environment.apiUrl}/Payment/subscription-status`
    );
  }

  /**
   * Check if user is premium (has active subscription)
   */
  isPremiumUser(): Observable<boolean> {
    return this.getSubscriptionStatus().pipe(
      map((status) => status.subscriptionType === 'PREMIUM'),
      catchError(() => [false])
    );
  }
}
