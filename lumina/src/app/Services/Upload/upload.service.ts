import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class UploadService {

  baseUrl = `${environment.apiUrl}/Upload`;

  constructor(private http: HttpClient) { }

  /**
   * Upload file lên Cloudinary thông qua API backend
   * @param file File cần upload
   * @returns Observable trả về { url, publicId }
   */
  uploadFile(file: File): Observable<{ url: string, publicId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string, publicId: string }>(this.baseUrl, formData);
  }
}
