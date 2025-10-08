import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { 
  ArticleCreate, 
  ArticleResponse, 
  ArticleCategory,
  Article,
  ArticleSection
} from '../../Interfaces/article.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private apiUrl = `${environment.apiUrl}/articles`;

  constructor(private http: HttpClient) {}

  // Lấy danh sách categories
  getCategories(): Observable<ArticleCategory[]> {
    return this.http.get<ArticleCategory[]>(`${this.apiUrl}/categories`);
  }

  // Tạo article mới
  createArticle(articleData: ArticleCreate): Observable<ArticleResponse> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<ArticleResponse>(this.apiUrl, articleData, { headers });
  }

  // Lấy chi tiết article theo ID
  getArticleById(id: number): Observable<ArticleResponse> {
    return this.http.get<ArticleResponse>(`${this.apiUrl}/${id}`);
  }

  // Lấy danh sách tất cả articles
  getAllArticles(): Observable<ArticleResponse[]> {
    return this.http.get<ArticleResponse[]>(this.apiUrl);
  }

  // Query articles with pagination/sorting/search
  queryArticles(params: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    search?: string;
    categoryId?: number;
    isPublished?: boolean;
    status?: 'draft' | 'pending' | 'published'; 
    }): Observable<{ items: ArticleResponse[]; total: number; page: number; pageSize: number; }> {
    const httpParams: any = {};
    if (params.page) httpParams.page = params.page;
    if (params.pageSize) httpParams.pageSize = params.pageSize;
    if (params.sortBy) httpParams.sortBy = params.sortBy;
    if (params.sortDir) httpParams.sortDir = params.sortDir;
    if (params.search) httpParams.search = params.search;
    if (params.categoryId) httpParams.categoryId = params.categoryId;
    if (typeof params.isPublished === 'boolean') httpParams.isPublished = params.isPublished;
    if (params.status) httpParams.status = params.status;
    return this.http.get<{ items: ArticleResponse[]; total: number; page: number; pageSize: number; }>(`${this.apiUrl}/query`, { params: httpParams });
  }

  // Update article
  updateArticle(id: number, data: { title: string; summary: string; categoryId: number; sections: { sectionTitle: string; sectionContent: string; orderIndex: number; }[] }): Observable<ArticleResponse> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.put<ArticleResponse>(`${this.apiUrl}/${id}`, data, { headers });
  }

 // Gửi yêu cầu phê duyệt
requestApproval(id: number): Observable<any> {
  const token = localStorage.getItem('lumina_token');
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  return this.http.post(`${this.apiUrl}/${id}/request-approval`, {}, { headers });
}
// Duyệt bài viết
reviewArticle(id: number, isApproved: boolean): Observable<any> {
  const token = localStorage.getItem('lumina_token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });
  const body = { isApproved };
  return this.http.post(`${this.apiUrl}/${id}/review`, body, { headers });
}

  // Xóa article
  deleteArticle(id: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.delete(`${this.apiUrl}/${id}`, { headers });
  }

  // Helper method để convert ArticleResponse thành Article (cho UI)
  convertToArticle(response: ArticleResponse): Article {
    return {
      id: response.articleId,
      title: response.title,
      summary: response.summary,
      category: response.categoryName,
      status: response.isPublished ? 'published' : 'draft',
      author: response.authorName,
      authorRole: 'Content Staff', // Default role
      publishDate: new Date(response.createdAt).toLocaleDateString('vi-VN'),
      views: 0, // Default values - có thể thêm vào backend sau
      likes: 0,
      tags: [], // Default - có thể thêm vào backend sau
      sections: response.sections.map(section => ({
        type: this.mapSectionType(section.sectionTitle), // Map từ sectionTitle
        content: section.sectionContent,
        sectionTitle: section.sectionTitle
      }))
    };
  }

  // Helper method để map section title thành type
  private mapSectionType(sectionTitle: string): 'đoạn văn' | 'hình ảnh' | 'video' | 'danh sách' {
    const title = sectionTitle.toLowerCase();
    if (title.includes('hình') || title.includes('ảnh') || title.includes('image')) {
      return 'hình ảnh';
    } else if (title.includes('video') || title.includes('phim')) {
      return 'video';
    } else if (title.includes('danh sách') || title.includes('list')) {
      return 'danh sách';
    }
    return 'đoạn văn'; // Default
  }

  // Helper method để convert Article thành ArticleCreate (cho API)
  convertToArticleCreate(article: Article, categoryId: number): ArticleCreate {
    return {
      title: article.title,
      summary: article.summary,
      categoryId: categoryId,
      publishNow: article.status === 'published',
      sections: article.sections.map((section, index) => ({
        sectionTitle: `Section ${index + 1}`,
        sectionContent: section.content,
        orderIndex: index
      }))
    };
  }
}
