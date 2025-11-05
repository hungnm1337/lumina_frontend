import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Ga4DataService {
  private apiUrl = `${environment.apiUrl}/Analytics`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Lấy key metrics
  getKeyMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/key-metrics`, { headers: this.getHeaders() });
  }

  // Lấy realtime users
  getRealtimeUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/realtime`, { headers: this.getHeaders() });
  }

  // Lấy top pages
  getTopPages(): Observable<any> {
    return this.http.get(`${this.apiUrl}/top-pages`, { headers: this.getHeaders() });
  }

  // Lấy traffic sources
  getTrafficSources(): Observable<any> {
    return this.http.get(`${this.apiUrl}/traffic-sources`, { headers: this.getHeaders() });
  }

  // Lấy device stats
  getDeviceStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/devices`, { headers: this.getHeaders() });
  }

  // Lấy country stats
  getCountryStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/countries`, { headers: this.getHeaders() });
  }

  // Lấy daily traffic
  getDailyTraffic(): Observable<any> {
    return this.http.get(`${this.apiUrl}/daily-traffic`, { headers: this.getHeaders() });
  }

  // Lấy browser stats
  getBrowserStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/browsers`, { headers: this.getHeaders() });
  }
}