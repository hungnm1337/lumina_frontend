import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

/**
 * BaseApiService: Lớp cơ sở xử lý mọi HTTP Request trong dự án Lumina.
 * Tự động gắn tiền tố API URL, chuẩn hóa ApiResponse<T> và bắt lỗi tập trung.
 * Bám sát Mục 2.3 trong Báo cáo đề xuất tái cấu trúc dự án.
 */
@Injectable({
  providedIn: 'root'
})
export abstract class BaseApiService {
  protected http = inject(HttpClient);
  protected baseUrl = environment.apiUrl || 'http://localhost:5000/api';

  /**
   * Tạo đường dẫn API đầy đủ từ endpoint tương đối.
   */
  protected getFullUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const cleanBaseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    return `${cleanBaseUrl}/${cleanEndpoint}`;
  }

  /**
   * HTTP GET chuẩn hóa
   */
  protected get<T>(endpoint: string, params?: any): Observable<ApiResponse<T>> {
    const httpParams = this.buildParams(params);
    return this.http.get<ApiResponse<T>>(this.getFullUrl(endpoint), { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  /**
   * HTTP POST chuẩn hóa
   */
  protected post<T>(endpoint: string, body: any): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.getFullUrl(endpoint), body)
      .pipe(catchError(this.handleError));
  }

  /**
   * HTTP PUT chuẩn hóa
   */
  protected put<T>(endpoint: string, body: any): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(this.getFullUrl(endpoint), body)
      .pipe(catchError(this.handleError));
  }

  /**
   * HTTP DELETE chuẩn hóa
   */
  protected delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(this.getFullUrl(endpoint))
      .pipe(catchError(this.handleError));
  }

  /**
   * Chuyển đổi Object thành HttpParams
   */
  protected buildParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;

    Object.keys(params).forEach(key => {
      const val = params[key];
      if (val !== null && val !== undefined && val !== '') {
        httpParams = httpParams.set(key, val.toString());
      }
    });

    return httpParams;
  }

  /**
   * Xử lý bắt lỗi chung từ Server
   */
  protected handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Đã có lỗi xảy ra từ máy chủ.';
    if (error.error instanceof ErrorEvent) {
      // Lỗi phía Client hoặc Network
      errorMessage = `Lỗi mạng: ${error.error.message}`;
    } else {
      // Lỗi do Server trả về mã lỗi
      if (error.error && typeof error.error === 'object' && error.error.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Mã lỗi ${error.status}: ${error.message}`;
      }
    }
    console.error('[BaseApiService Error]:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
