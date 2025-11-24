import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  QuotaCheckResponse,
  SubscriptionStatus,
  QuotaRemainingDto,
} from '../../Interfaces/quota.interfaces';

@Injectable({
  providedIn: 'root',
})
export class QuotaService {
  private apiUrl = `${environment.apiUrl}/Quota`;
  private quotaCache$ = new BehaviorSubject<QuotaRemainingDto | null>(null);

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
    return this.http.post(`${this.apiUrl}/increment/${skill}`, {}).pipe(
      tap(() => {
        // Refresh quota after increment
        this.getRemainingQuota().subscribe();
      })
    );
  }

  /**
   * Get remaining quota for current user
   */
  getRemainingQuota(): Observable<QuotaRemainingDto> {
    return this.http
      .get<QuotaRemainingDto>(`${this.apiUrl}/remaining`)
      .pipe(tap((data) => this.quotaCache$.next(data)));
  }

  /**
   * Get cached quota (for immediate access)
   */
  getCachedQuota(): QuotaRemainingDto | null {
    return this.quotaCache$.value;
  }

  /**
   * Observable for quota changes
   */
  getQuotaObservable(): Observable<QuotaRemainingDto | null> {
    return this.quotaCache$.asObservable();
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
