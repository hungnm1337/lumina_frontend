import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private apiUrl = `${environment.apiUrl}/Question`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
  createPromptWithQuestions(dto: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/prompt-with-questions`, dto, {
      headers: this.getAuthHeaders(),
    });
  }


  importQuestionsExcel(file: File, partId: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload-excel?partId=${partId}`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  getQuestions(params: any = {}): Observable<any> {
    const query = Object.entries(params)
      .map(([key, val]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(val !== undefined && val !== null ? String(val) : '')}`)
      .join('&');
    const url = `${this.apiUrl}/prompt-question-tree-paged?${query}`;
    return this.http.get(url, {
      headers: this.getAuthHeaders()
    });
  }

  editPassage(dto: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/edit-passage`, dto, {
      headers: this.getAuthHeaders()
    });
  }

  addQuestion(dto: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-question`, dto, {
      headers: this.getAuthHeaders()
    });
  }

  editQuestion(dto: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/edit-question`, dto, {
      headers: this.getAuthHeaders()
    });
  }

  deleteQuestion(questionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete-question/${questionId}`, {
      headers: this.getAuthHeaders()
    });
  }
  getStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * ✅ Kiểm tra số lượng slot còn trống trước khi thêm câu hỏi
   * @param partId - ID của ExamPart
   * @param count - Số lượng câu hỏi muốn thêm
   * @returns Observable với { available: number, canAdd: boolean, error?: string }
   */
  checkAvailableSlots(partId: number, count: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/check-available-slots`, {
      params: {
        partId: partId.toString(),
        count: count.toString()
      }
    });
  }

  /**
   * Lưu nhiều Prompt cùng lúc với Questions và Options
   */
  savePromptsWithQuestions(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-prompts`, payload);
  }
  deletePrompt(promptId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/prompt/${promptId}`, {
      headers: this.getAuthHeaders()
    });
  }
}
