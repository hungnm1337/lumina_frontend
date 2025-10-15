import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StaffDashboardResponse } from '../../Interfaces/statistic.interfaces';

@Injectable({
  providedIn: 'root'
})
export class StatisticService {
  private baseUrl = `${environment.apiUrl}/statistic`;

  constructor(private http: HttpClient) {}

  // Helper để lấy headers kèm token xác thực
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // API cho Staff Dashboard
  getStaffDashboardStats(): Observable<StaffDashboardResponse> {
    return this.http.get<StaffDashboardResponse>(`${this.baseUrl}/staff-dashboard`, { 
      headers: this.getAuthHeaders() 
    });
  }

  // Các phương thức khác bạn đã có...
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboard-stats`, { headers: this.getAuthHeaders() });
  }

  getFullDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/statistic-packages`, { headers: this.getAuthHeaders() });
  }

  getUserProSummary(userId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/user-pro-summary/${userId}`, { headers: this.getAuthHeaders() });
  }
}