import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { UserReportRequest } from '../../Interfaces/report/UserReportRequest.interface';
import { UserReportResponse } from '../../Interfaces/report/UserReportResponse.interface';
@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      accept: 'application/json'
    });
  }

  /**
   * Create a new report
   */
  createReport(request: UserReportRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, request, { headers: this.getAuthHeaders() });
  }

  /**
   * Get report by ID
   */
  getReportById(id: number): Observable<UserReportResponse> {
    return this.http.get<UserReportResponse>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  /**
   * Get all reports by role (Admin/Manager/Staff)
   */
  getReportsByRole(): Observable<UserReportResponse[]> {
    return this.http.get<UserReportResponse[]>(`${this.apiUrl}/by-role`, { headers: this.getAuthHeaders() });
  }

  /**
   * Get all reports created by current user
   */
  getMyReports(): Observable<UserReportResponse[]> {
    return this.http.get<UserReportResponse[]>(`${this.apiUrl}/my-reports`, { headers: this.getAuthHeaders() });
  }

  /**
   * Reply to a report (Admin/Manager only)
   */
  replyToReport(id: number, request: UserReportRequest): Observable<UserReportResponse> {
    return this.http.put<UserReportResponse>(`${this.apiUrl}/${id}/reply`, request, { headers: this.getAuthHeaders() });
  }
}
