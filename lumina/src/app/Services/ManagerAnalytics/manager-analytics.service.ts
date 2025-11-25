import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActiveUsersDTO,
  TopArticleDTO,
  TopVocabularyDTO,
  TopEventDTO,
  TopSlideDTO,
  TopExamDTO,
  ExamCompletionRateDTO,
  ArticleCompletionRateDTO,
  VocabularyCompletionRateDTO,
  EventParticipationRateDTO,
  ManagerAnalyticsOverviewDTO,
  ApiResponse
} from '../../Interfaces/manager-analytics.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ManagerAnalyticsService {
  private baseUrl = `${environment.apiUrl}/ManagerAnalytics`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'accept': 'application/json',
      'Content-Type': 'application/json'
    });
  }

  /**
   * Lấy số người dùng đang hoạt động và thống kê người dùng
   */
  getActiveUsers(days?: number): Observable<ApiResponse<ActiveUsersDTO>> {
    let params = new HttpParams();
    if (days) {
      params = params.set('days', days.toString());
    }
    return this.http.get<ApiResponse<ActiveUsersDTO>>(`${this.baseUrl}/active-users`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Lấy top N bài viết được xem nhiều nhất
   */
  getTopArticles(topN: number = 10, days?: number): Observable<ApiResponse<TopArticleDTO[]>> {
    let params = new HttpParams().set('topN', topN.toString());
    if (days) {
      params = params.set('days', days.toString());
    }
    return this.http.get<ApiResponse<TopArticleDTO[]>>(`${this.baseUrl}/top-articles`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Lấy top N danh sách từ vựng được học nhiều nhất
   */
  getTopVocabulary(topN: number = 10, days?: number): Observable<ApiResponse<TopVocabularyDTO[]>> {
    let params = new HttpParams().set('topN', topN.toString());
    if (days) {
      params = params.set('days', days.toString());
    }
    return this.http.get<ApiResponse<TopVocabularyDTO[]>>(`${this.baseUrl}/top-vocabulary`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Lấy top N sự kiện có nhiều người tham gia nhất
   */
  getTopEvents(topN: number = 10): Observable<ApiResponse<TopEventDTO[]>> {
    const params = new HttpParams().set('topN', topN.toString());
    return this.http.get<ApiResponse<TopEventDTO[]>>(`${this.baseUrl}/top-events`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Lấy top N slide được xem nhiều nhất
   */
  getTopSlides(topN: number = 10, days?: number): Observable<ApiResponse<TopSlideDTO[]>> {
    let params = new HttpParams().set('topN', topN.toString());
    if (days) {
      params = params.set('days', days.toString());
    }
    return this.http.get<ApiResponse<TopSlideDTO[]>>(`${this.baseUrl}/top-slides`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Lấy top N bài thi được làm nhiều nhất
   */
  getTopExams(topN: number = 10, days?: number): Observable<ApiResponse<TopExamDTO[]>> {
    let params = new HttpParams().set('topN', topN.toString());
    if (days) {
      params = params.set('days', days.toString());
    }
    return this.http.get<ApiResponse<TopExamDTO[]>>(`${this.baseUrl}/top-exams`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Lấy tỷ lệ hoàn thành bài thi
   */
  getExamCompletionRates(examId?: number, examType?: string, days?: number): Observable<ApiResponse<ExamCompletionRateDTO[]>> {
    let params = new HttpParams();
    if (examId) {
      params = params.set('examId', examId.toString());
    }
    if (examType) {
      params = params.set('examType', examType);
    }
    if (days) {
      params = params.set('days', days.toString());
    }
    return this.http.get<ApiResponse<ExamCompletionRateDTO[]>>(`${this.baseUrl}/exam-completion-rates`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Lấy tỷ lệ hoàn thành đọc bài viết
   */
  getArticleCompletionRates(articleId?: number, days?: number): Observable<ApiResponse<ArticleCompletionRateDTO[]>> {
    let params = new HttpParams();
    if (articleId) {
      params = params.set('articleId', articleId.toString());
    }
    if (days) {
      params = params.set('days', days.toString());
    }
    return this.http.get<ApiResponse<ArticleCompletionRateDTO[]>>(`${this.baseUrl}/article-completion-rates`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Lấy tỷ lệ hoàn thành học từ vựng
   */
  getVocabularyCompletionRates(vocabularyListId?: number, days?: number): Observable<ApiResponse<VocabularyCompletionRateDTO[]>> {
    let params = new HttpParams();
    if (vocabularyListId) {
      params = params.set('vocabularyListId', vocabularyListId.toString());
    }
    if (days) {
      params = params.set('days', days.toString());
    }
    return this.http.get<ApiResponse<VocabularyCompletionRateDTO[]>>(`${this.baseUrl}/vocabulary-completion-rates`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Lấy tỷ lệ tham gia sự kiện
   */
  getEventParticipationRates(eventId?: number): Observable<ApiResponse<EventParticipationRateDTO[]>> {
    let params = new HttpParams();
    if (eventId) {
      params = params.set('eventId', eventId.toString());
    }
    return this.http.get<ApiResponse<EventParticipationRateDTO[]>>(`${this.baseUrl}/event-participation-rates`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  /**
   * Lấy tổng quan tất cả analytics (overview)
   */
  getOverview(topN: number = 10, days?: number): Observable<ApiResponse<ManagerAnalyticsOverviewDTO>> {
    let params = new HttpParams().set('topN', topN.toString());
    if (days) {
      params = params.set('days', days.toString());
    }
    
    const url = `${this.baseUrl}/overview`;
    console.log('Calling API:', url);
    console.log('Params:', { topN, days });
    console.log('Headers:', this.getAuthHeaders().keys());
    
    return this.http.get<ApiResponse<ManagerAnalyticsOverviewDTO>>(url, {
      headers: this.getAuthHeaders(),
      params
    });
  }
}

