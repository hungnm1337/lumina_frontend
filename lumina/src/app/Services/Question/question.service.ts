import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {

  // URL cơ sở của API backend
  baseUrl = `${environment.apiUrl}/Question`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json'
    });
  }
  createPromptWithQuestions(dto: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/prompt-with-questions`, dto, {
      headers: this.getAuthHeaders(),
    });
  }


  importQuestionsExcel(file: File, partId: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/upload-excel?partId=${partId}`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  getQuestions(params: any = {}): Observable<any> {
    const query = Object.entries(params)
      .map(([key, val]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(val !== undefined && val !== null ? String(val) : '')}`)
      .join('&');
    const url = `${this.baseUrl}/passage-question-tree-paged?${query}`;
    return this.http.get(url, {
      headers: this.getAuthHeaders()
    });
  }

  editPassage(dto: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/edit-passage`, dto, {
      headers: this.getAuthHeaders()
    });
  }

  addQuestion(dto: any): Observable<any> {
  return this.http.post(`${this.baseUrl}/add-question`, dto, {
    headers: this.getAuthHeaders()
  });
}

editQuestion(dto: any): Observable<any> {
  return this.http.put(`${this.baseUrl}/edit-question`, dto, {
    headers: this.getAuthHeaders()
  });
}

deleteQuestion(questionId: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/delete-question/${questionId}`, {
    headers: this.getAuthHeaders()
  });
}
getStatistics(): Observable<any> {
  return this.http.get(`${this.baseUrl}/statistics`, {
    headers: this.getAuthHeaders()
  });
}


}
