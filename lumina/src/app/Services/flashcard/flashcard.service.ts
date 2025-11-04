import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { VocabularyService } from '../Vocabulary/vocabulary.service';

// Định nghĩa cấu trúc cho một thuật ngữ (Term)
export interface Term {
  id: number;
  question: string;
  answer: string;
  options?: string[]; 
  audioUrl?: string; // URL của audio file hoặc undefined nếu không có
  // Dành cho câu hỏi trắc nghiệm
}

// Định nghĩa cấu trúc cho một Học phần (Deck)
export interface Deck {
  id: string;
  title: string;
  termCount: number;
  author: string;
  terms: Term[];
}

@Injectable({
  providedIn: 'root'
})
export class FlashcardService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(
    private http: HttpClient,
    private vocabularyService: VocabularyService
  ) { }

  // Lấy các học phần từ API (vocabulary lists của user hiện tại + folder của staff)
  getDecks(): Observable<Deck[]> {
    return this.vocabularyService.getMyAndStaffVocabularyLists().pipe(
      map(vocabularyLists => 
        vocabularyLists.map(list => ({
          id: list.vocabularyListId.toString(),
          title: list.name,
          author: list.makeByName,
          termCount: list.vocabularyCount,
          terms: [] // Sẽ được load khi cần thiết
        }))
      )
    );
  }

  // Lấy một học phần cụ thể bằng ID (để hiển thị ở trang chi tiết)
  getDeckById(id: string): Observable<Deck | undefined> {
    const listId = parseInt(id);
    if (isNaN(listId)) {
      return of(undefined);
    }

    // Load cả vocabulary words và list info cùng lúc
    return this.vocabularyService.getPublicVocabularyByList(listId).pipe(
      map(vocabularies => {
        if (!vocabularies || vocabularies.length === 0) {
          return undefined;
        }

        // Tạo deck với thông tin cơ bản
        return {
          id: id,
          title: 'Loading...', // Sẽ được cập nhật sau
          author: 'Loading...', // Sẽ được cập nhật sau
          termCount: vocabularies.length,
          terms: vocabularies.map(vocab => ({
            id: vocab.id,
            question: vocab.word,
            answer: vocab.definition,
            options: vocab.example ? [vocab.example] : undefined,
            audioUrl: vocab.audioUrl
          }))
        };
      })
    );
  }

  // Lấy terms cho một deck cụ thể
  getDeckTerms(deckId: string): Observable<Term[]> {
    const listId = parseInt(deckId);
    if (isNaN(listId)) {
      return of([]);
    }

    return this.vocabularyService.getPublicVocabularyByList(listId).pipe(
      map(vocabularies => 
        vocabularies.map(vocab => ({
          id: vocab.id,
          question: vocab.word,
          answer: vocab.definition,
          options: vocab.example ? [vocab.example] : undefined
        }))
      )
    );
  }
}