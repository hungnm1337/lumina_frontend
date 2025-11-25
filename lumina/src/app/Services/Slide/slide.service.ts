import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SlideDTO } from '../../Interfaces/slide.interface';


export interface CreateSlideDTO {
  slideUrl: string;
  slideName: string;
  isActive?: boolean;
}

export interface UpdateSlideDTO {
  slideId: number;
  slideUrl: string;
  slideName: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',   
})
export class SlideService {
    private apiUrl = `${environment.apiUrl}/slide`;
    
    constructor(private httpClient: HttpClient) { 
    }

    private getAuthHeaders(): HttpHeaders {
      const token = localStorage.getItem('lumina_token');
      return new HttpHeaders({
        Authorization: token ? `Bearer ${token}` : '',
        accept: 'application/json',
        'Content-Type': 'application/json',
      });
    }

    private getAuthHeadersForFormData(): HttpHeaders {
      const token = localStorage.getItem('lumina_token');
      return new HttpHeaders({
        Authorization: token ? `Bearer ${token}` : '',
      });
      // Note: Don't set Content-Type for FormData - browser will set it automatically with boundary
    }

    /**
     * Get all slides with optional filtering
     * @param keyword - Optional keyword to search for
     * @param isActive - Optional filter by active status
     * @returns Observable of SlideDTO array
     */
    getAllSlides(keyword?: string, isActive?: boolean): Observable<SlideDTO[]> {
      let params: any = {};
      if (keyword) params.keyword = keyword;
      if (isActive !== undefined) params.isActive = isActive.toString();
      
      return this.httpClient.get<SlideDTO[]>(this.apiUrl, { params });
    }

    /**
     * Get slide by ID
     * @param slideId - The slide ID
     * @returns Observable of SlideDTO
     */
    getSlideById(slideId: number): Observable<SlideDTO> {
      return this.httpClient.get<SlideDTO>(`${this.apiUrl}/${slideId}`);
    }

    /**
     * Create a new slide (requires authentication)
     * @param slideData - The slide data to create
     * @returns Observable of the created slide ID
     */
    createSlide(slideData: SlideDTO): Observable<number> {
      return this.httpClient.post<number>(this.apiUrl, slideData, {
        headers: this.getAuthHeaders()
      });
    }

    /**
     * Create a new slide with file upload (requires authentication)
     * @param slideName - The slide name
     * @param isActive - Whether the slide is active
     * @param imageFile - The image file to upload
     * @returns Observable of the created slide ID
     */
    createSlideWithFile(slideName: string, isActive: boolean, imageFile: File): Observable<number> {
      const formData = new FormData();
      formData.append('slideName', slideName);
      formData.append('isActive', isActive.toString());
      formData.append('imageFile', imageFile);

      return this.httpClient.post<number>(this.apiUrl, formData, {
        headers: this.getAuthHeadersForFormData()
      });
    }

    /**
     * Update an existing slide (requires authentication)
     * @param slideId - The slide ID to update
     * @param slideData - The updated slide data
     * @returns Observable of void
     */
    updateSlide(slideId: number, slideData: SlideDTO): Observable<void> {
      return this.httpClient.put<void>(`${this.apiUrl}/${slideId}`, slideData, {
        headers: this.getAuthHeaders()
      });
    }

    /**
     * Update an existing slide with file upload (requires authentication)
     * @param slideId - The slide ID to update
     * @param slideName - The slide name
     * @param isActive - Whether the slide is active
     * @param imageFile - Optional image file to upload (if null, keeps existing image)
     * @returns Observable of void
     */
    updateSlideWithFile(slideId: number, slideName: string, isActive: boolean, imageFile: File | null): Observable<void> {
      const formData = new FormData();
      formData.append('slideName', slideName);
      formData.append('isActive', isActive.toString());
      if (imageFile) {
        formData.append('imageFile', imageFile);
      }

      return this.httpClient.put<void>(`${this.apiUrl}/${slideId}`, formData, {
        headers: this.getAuthHeadersForFormData()
      });
    }

    /**
     * Delete a slide (requires authentication)
     * @param slideId - The slide ID to delete
     * @returns Observable of void
     */
    deleteSlide(slideId: number): Observable<void> {
      return this.httpClient.delete<void>(`${this.apiUrl}/${slideId}`, {
        headers: this.getAuthHeaders()
      });
    }
}

