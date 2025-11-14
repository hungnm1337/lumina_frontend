import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface Package {
  packageId?: number; // Optional cho trường hợp tạo mới
  packageName: string;
  price: number | null;
  durationInDays: number | null;
  isActive: boolean | null;
}

@Injectable({
  providedIn: 'root'
})
export class PackagesService {

  baseUrl = `${environment.apiUrl}/Packages`;
 
  constructor(private http: HttpClient) {}
 
     private getAuthHeaders(): HttpHeaders {
      const token = localStorage.getItem('lumina_token');
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
      });
    }

  // Lấy tất cả gói Pro active - Require Admin role
  getActiveProPackages(): Observable<Package[]> {
    return this.http.get<Package[]>(`${this.baseUrl}/active-pro`, {
      headers: this.getAuthHeaders()
    });
  }

  // Lấy chi tiết gói theo id - Require Admin role
  getPackageById(id: number): Observable<Package> {
    return this.http.get<Package>(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Thêm gói mới - Require Admin role
  addPackage(pkg: Package): Observable<Package> {
    return this.http.post<Package>(`${this.baseUrl}`, pkg, {
      headers: this.getAuthHeaders()
    });
  }

  // Lấy gói pro theo userid active - No authorization required
  getUserActivePackage(userId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/user-active-package/${userId}`);
  }

  // Cập nhật gói - Require Admin role
  updatePackage(id: number, pkg: Package): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, pkg, {
      headers: this.getAuthHeaders()
    });
  }

  // Đảo ngược status isActive - Require Admin role
  togglePackageStatus(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/toggle-status`, null, {
      headers: this.getAuthHeaders()
    });
  }

  // Xóa gói - No authorization required (but should be protected)
  deletePackage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Lấy tất cả gói active (public - không cần auth)
  getActivePackages(): Observable<Package[]> {
    return this.http.get<Package[]>(`${this.baseUrl}/active`);
  }

}
