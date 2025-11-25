import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class UploadService {

  baseUrl = `${environment.apiUrl}/Upload`;

  constructor(private http: HttpClient) { }
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }
  /**
   * Upload file lên Cloudinary thông qua API backend
   * @param file File cần upload (ảnh, video, hoặc audio)
   * @returns Observable trả về { url, publicId }
   */
  uploadFile(file: File): Observable<{ url: string, publicId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string, publicId: string }>(
      this.baseUrl, 
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

    /**
   * Upload file từ URL public
   * @param fileUrl URL file public cần upload lại lên Cloudinary hoặc Storage
   * @returns Observable trả về object { url, publicId }
   */
  uploadFromUrl(fileUrl: string): Observable<{ url: string, publicId: string }> {
    return this.http.post<{ url: string, publicId: string }>(
      `${this.baseUrl}/url`,
      { fileUrl },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Tạo audio từ text nhờ Azure TTS
   * @param text Chuỗi text cần tạo audio
   * @returns Observable trả về object { url, publicId, fileName }
   */
  generateAudio(text: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/upload`, { text });
    // Không cần set timeout ở đây, để Promise.race xử lý
  }
}
