import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StatisticService {
  private baseUrl = 'https://localhost:7162/api/statistic';

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboard-stats`);
  }

    getFullDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/statistic-packages`);
  }

  getUserProSummary(userId: number): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/user-pro-summary/${userId}`);
}

}
