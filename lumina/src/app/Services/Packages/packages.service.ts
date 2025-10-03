import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Package {
  packageId: number;
  packageName: string;
  price: number;
  durationInDays: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PackagesService {

  baseUrl = 'https://localhost:7162/api';

  constructor(private http: HttpClient) { }

  // Lấy tất cả gói Pro active
  getActiveProPackages(): Observable<Package[]> {
    return this.http.get<Package[]>(`${this.baseUrl}/Packages/active-pro`);
  }

  // Lấy chi tiết gói theo id
  getPackageById(id: number): Observable<Package> {
    return this.http.get<Package>(`${this.baseUrl}/Packages/${id}`);
  }

  addPackage(pkg: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Packages`, pkg);
  }
  //lấy gói pro theo userid active
    getUserActivePackage(userId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Packages/user-active-package/${userId}`);
  }
  // Cập nhật gói
  updatePackage(id: number, pkg: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/Packages/${id}`, pkg);
  }


  // Đảo ngược status isActive
  togglePackageStatus(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/Packages/${id}/toggle-status`, null);
  }

  // Xóa gói
  deletePackage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Packages/${id}`);
  }

}
