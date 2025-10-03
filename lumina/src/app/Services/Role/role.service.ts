import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  // URL cơ sở của API backend
  baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token'); 
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
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