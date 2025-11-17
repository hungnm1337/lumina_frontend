import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreatePaymentRequest {
  packageId: number;
  amount: number;
}

export interface PaymentLinkResponse {
  checkoutUrl: string;
  qrCode: string;
  orderCode: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/Payment`;

  constructor(private http: HttpClient) {}

  /**
   * Create payment link for package subscription
   */
  createPaymentLink(
    packageId: number,
    amount: number
  ): Observable<PaymentLinkResponse> {
    const request: CreatePaymentRequest = { packageId, amount };
    return this.http.post<PaymentLinkResponse>(
      `${this.apiUrl}/create-link`,
      request
    );
  }

  /**
   * Get user's subscription status
   */
  getSubscriptionStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/subscription-status`);
  }
}
