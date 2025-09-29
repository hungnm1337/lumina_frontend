import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  // URL cơ sở của API backend
  baseUrl = "https://localhost:7162/api";

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); 
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json' 
    });
  }

  getAllRoles(): Observable<any> {
    // Gọi API đến endpoint /Role với header xác thực
    return this.http.get<any>(`${this.baseUrl}/Role`, {
      headers: this.getAuthHeaders()
    });
  }
}