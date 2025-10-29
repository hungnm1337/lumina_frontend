import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatRequestDTO, ChatResponseDTO, SaveVocabularyRequestDTO, SaveVocabularyResponseDTO } from '../../Interfaces/Chat/ChatResponseDTO.interface';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl + '/Chat';

  constructor(private http: HttpClient) { }

  askQuestion(request: ChatRequestDTO): Observable<ChatResponseDTO> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });

    return this.http.post<ChatResponseDTO>(`${this.apiUrl}/ask`, request, { headers });
  }

  saveVocabularies(request: SaveVocabularyRequestDTO): Observable<SaveVocabularyResponseDTO> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });

    return this.http.post<SaveVocabularyResponseDTO>(`${this.apiUrl}/save-vocabularies`, request, { headers });
  }

// Trong chat.service.ts
private getToken(): string {
    return localStorage.getItem('lumina_token') || ''; 
}
}
