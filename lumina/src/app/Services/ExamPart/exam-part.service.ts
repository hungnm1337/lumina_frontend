import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ExamPartService {
  baseUrl = `${environment.apiUrl}/ExamPart`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });
  }

  getExamParts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/parts`, {
      headers: this.getAuthHeaders()
    });
  }
}
