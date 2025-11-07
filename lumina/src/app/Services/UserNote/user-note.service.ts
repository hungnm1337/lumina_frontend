import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChatRequestDTO,
  ChatResponseDTO,
  ChatConversationResponseDTO,
  UserNoteResponseDTO,
  UserNoteRequestDTO,
} from '../../Interfaces/UserNote/UserNote.interface';

/**
 * Local DTOs that mirror the backend controller's request/response DTOs.
 * These are small, service-local shapes used to call the endpoints.
 */
export interface LessonContentRequestDTO {
  LessonContent: string;
  LessonTitle?: string;
}

export interface ConceptExplanationRequestDTO {
  Concept: string;
  LessonContext: string;
}

export interface QuickAskRequestDTO {
  Question: string;
  Context: string;
  UserId?: number | null;
}

export interface QuickAskResponse {
  answer?: string;
  Answer?: string;
  suggestedQuestions?: string[];
  SuggestedQuestions?: string[];
  success?: boolean;
  Success?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserNoteService {
  // Matches the controller route: [Route("api/[controller]")], controller class is AIChatController
  private apiUrl = `${environment.apiUrl}/UserNoteAIChat`;
  private apiUrlUserNote = `${environment.apiUrl}/UserNote`;

  constructor(private httpClient: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      accept: 'application/json',
      'Content-Type': 'application/json',
    });
  }

  /**
   * Ask a question about the lesson content
   */
  askQuestion(request: ChatRequestDTO): Observable<ChatResponseDTO> {
    return this.httpClient.post<ChatResponseDTO>(
      `${this.apiUrl}/ask-question`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Continue an existing conversation with context/history
   */
  continueConversation(
    request: ChatRequestDTO
  ): Observable<ChatConversationResponseDTO> {
    return this.httpClient.post<ChatConversationResponseDTO>(
      `${this.apiUrl}/continue-conversation`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Generate suggested questions from lesson content
   */
  getSuggestedQuestions(
    request: LessonContentRequestDTO
  ): Observable<ChatResponseDTO> {
    return this.httpClient.post<ChatResponseDTO>(
      `${this.apiUrl}/suggested-questions`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Ask for detailed explanation of a concept given lesson context
   */
  explainConcept(
    request: ConceptExplanationRequestDTO
  ): Observable<ChatResponseDTO> {
    return this.httpClient.post<ChatResponseDTO>(
      `${this.apiUrl}/explain-concept`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Quick ask: simplified single-question endpoint
   */
  quickAsk(request: QuickAskRequestDTO): Observable<QuickAskResponse> {
    return this.httpClient.post<QuickAskResponse>(
      `${this.apiUrl}/quick-ask`,
      request,
      {
        headers: this.getAuthHeaders(),
        observe: 'body'
      }
    );
  }

  public getUserNoteById(userNoteId: number): Observable<UserNoteResponseDTO> {
    return this.httpClient.get<UserNoteResponseDTO>(
      `${this.apiUrlUserNote}/note/${userNoteId}`,
      { headers: this.getAuthHeaders() }
    );

  }

  public getUserNotesByUserId(userId: number): Observable<UserNoteResponseDTO[]> {
    return this.httpClient.get<UserNoteResponseDTO[]>(
      `${this.apiUrlUserNote}/user/${userId}/notes`,
      { headers: this.getAuthHeaders() }
    );
  }

  public GetUserNoteByUserIDAndArticleId(userId: number, articleId: number): Observable<UserNoteResponseDTO> {
    return this.httpClient.get<UserNoteResponseDTO>(
      `${this.apiUrlUserNote}/user/${userId}/article/${articleId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  public UpSertUserNote(noteData: UserNoteRequestDTO): Observable<boolean> {
    return this.httpClient.post<boolean>(
      `${this.apiUrlUserNote}/upsert`,
      noteData,
      { headers: this.getAuthHeaders() }
    );
  }
}
