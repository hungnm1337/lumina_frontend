import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  baseUrl = "https://localhost:7162/api";

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json'
    });
  }

getNonAdminUsersPaged(pageNumber: number, searchTerm: string = '', role: string = ''): Observable<{ data: any[], totalPages: number }> {
  let url = `${this.baseUrl}/User/non-admin-users?pageNumber=${pageNumber}`;
  if (searchTerm) url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
  if (role && role !== 'Tất cả vai trò') url += `&roleName=${encodeURIComponent(role)}`;
  return this.http.get<{ data: any[], totalPages: number }>(url, { headers: this.getAuthHeaders() });
}




}
