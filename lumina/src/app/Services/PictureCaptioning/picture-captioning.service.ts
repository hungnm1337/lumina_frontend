import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root'
})
export class PictureCaptioningService {
  private apiUrl = environment.apiUrl;

  constructor(private httpClient: HttpClient) { }

  public GetCaptionOfPicture(pictureUrl: string) {
    return this.httpClient.post<{ caption: string }>(`${this.apiUrl}/PictureCaptioning/generate-caption?imageUrl=${encodeURIComponent(pictureUrl)}`, {});
  }
}
