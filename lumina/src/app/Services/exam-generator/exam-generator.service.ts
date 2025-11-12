import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ExamGeneratorService {

    baseUrl = `${environment.apiUrl}/ExamGenerationAI`;
  
    constructor(private http: HttpClient) {}
  
    private getAuthHeaders(): HttpHeaders {
      const token = localStorage.getItem('token');
      return new HttpHeaders({
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      });
    }
  previewExam(userRequest: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/preview-exam`, { userRequest });
  }

  saveExam(userRequest: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/generate-exam`, { userRequest });
  }

  smartChat(userRequest: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/smart-chat`, { userRequest });
  }

}
