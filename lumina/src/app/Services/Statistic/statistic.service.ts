import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StatisticService {
  private baseUrl = `${environment.apiUrl}/Statistic`;

  constructor(private http: HttpClient) {}

  // Helper để lấy headers kèm token xác thực
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ==================== CÁC API CŨ ====================

  getStaffDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/staff-dashboard`, { 
      headers: this.getAuthHeaders() 
    });
  }

  getDashboardStatsBasic(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboard-stats-basic`, { 
      headers: this.getAuthHeaders() 
    });
  }

  getFullDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/statistic-packages`, { 
      headers: this.getAuthHeaders() 
    });
  }

  getUserProSummary(userId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/user-pro-summary/${userId}`, { 
      headers: this.getAuthHeaders() 
    });
  }


  /**
   * Lấy 4 key metrics dashboard (Doanh thu, User mới, Chuyển đổi Pro, Tỷ lệ giữ chân)
   */
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboard-stats`, { 
      headers: this.getAuthHeaders() 
    });
  }

  /**
   * Lấy dữ liệu biểu đồ doanh thu theo tháng
   */
  getRevenueChart(year?: number): Observable<any> {
    let params: any = {};
    if (year) {
      params = { year: year.toString() };
    }
    return this.http.get<any>(`${this.baseUrl}/revenue-chart`, { 
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Lấy dữ liệu biểu đồ tăng trưởng người dùng
   */
  getUserGrowthChart(months: number = 6): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/user-growth-chart`, { 
      headers: this.getAuthHeaders(),
      params: { months: months.toString() }
    });
  }

  /**
   * Lấy dữ liệu phân bổ gói dịch vụ
   */
  getPlanDistribution(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/plan-distribution`, { 
      headers: this.getAuthHeaders() 
    });
  }

  /**
   * Lấy dữ liệu phân tích theo ngày
   */
  getDailyAnalytics(days: number = 7): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/daily-analytics`, { 
      headers: this.getAuthHeaders(),
      params: { days: days.toString() }
    });
  }
}