import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError, tap, switchMap } from 'rxjs';
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
  // Quiz score fields
  bestScore?: number;
  lastScore?: number;
  lastCompletedAt?: string;
  totalAttempts?: number;
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
      console.warn('Invalid deck ID:', id);
      return of(undefined);
    }

    console.log('Loading deck with ID:', listId);

    // Thử load từ public endpoint trước (cho folder đã publish)
    return this.vocabularyService.getPublicVocabularyByList(listId).pipe(
      tap(vocabularies => {
        console.log('Public vocabulary response:', vocabularies);
      }),
      map(vocabularies => {
        // Nếu có vocabulary từ public endpoint, trả về
        if (vocabularies && vocabularies.length > 0) {
          return this.createDeckFromVocabularies(id, vocabularies);
        }
        // Nếu không có, return null để trigger fallback
        return null;
      }),
      switchMap(deck => {
        // Nếu đã có deck từ public endpoint, trả về
        if (deck) {
          return of(deck);
        }
        // Nếu không có, thử load từ student-list endpoint (cho folder của user)
        console.log('Public endpoint returned empty, trying student-list endpoint for list ID:', listId);
        return this.vocabularyService.getVocabularies(listId).pipe(
          tap(vocabularies => {
            console.log('Student-list vocabulary response:', vocabularies);
          }),
          map(vocabularies => {
            if (!vocabularies || vocabularies.length === 0) {
              console.warn('No vocabularies found for list ID:', listId);
              return undefined;
            }
            return this.createDeckFromVocabularies(id, vocabularies);
          }),
          catchError(error => {
            console.error('Error loading from student-list endpoint:', error);
            return of(undefined);
          })
        );
      }),
      catchError(error => {
        console.error('Error in getDeckById (public endpoint):', error);
        // Nếu public endpoint lỗi, thử fallback sang student-list
        console.log('Public endpoint failed, trying student-list endpoint for list ID:', listId);
        return this.vocabularyService.getVocabularies(listId).pipe(
          tap(vocabularies => {
            console.log('Student-list vocabulary response (fallback):', vocabularies);
          }),
          map(vocabularies => {
            if (!vocabularies || vocabularies.length === 0) {
              console.warn('No vocabularies found for list ID:', listId);
              return undefined;
            }
            return this.createDeckFromVocabularies(id, vocabularies);
          }),
          catchError(fallbackError => {
            console.error('Error in getDeckById (fallback):', fallbackError);
            return of(undefined);
          })
        );
      })
    );
  }

  // Helper method để tạo deck từ vocabularies
  private createDeckFromVocabularies(id: string, vocabularies: any[]): Deck {
    return {
      id: id,
      title: 'Loading...', // Sẽ được cập nhật sau
      author: 'Loading...', // Sẽ được cập nhật sau
      termCount: vocabularies.length,
      terms: vocabularies.map(vocab => ({
        id: vocab.id,
        question: vocab.word || '',
        answer: vocab.definition || '',
        options: vocab.example ? [vocab.example] : undefined,
        audioUrl: vocab.audioUrl || undefined
      }))
    };
  }

  // Lấy terms cho một deck cụ thể
  getDeckTerms(deckId: string): Observable<Term[]> {
    const listId = parseInt(deckId);
    if (isNaN(listId)) {
      return of([]);
    }

    // Thử load từ public endpoint trước
    return this.vocabularyService.getPublicVocabularyByList(listId).pipe(
      map(vocabularies => {
        // Nếu có vocabulary, trả về
        if (vocabularies && vocabularies.length > 0) {
          return vocabularies.map(vocab => ({
            id: vocab.id,
            question: vocab.word,
            answer: vocab.definition,
            options: vocab.example ? [vocab.example] : undefined
          }));
        }
        // Nếu không có, return null để trigger fallback
        return null;
      }),
      switchMap(terms => {
        // Nếu đã có terms từ public endpoint, trả về
        if (terms) {
          return of(terms);
        }
        // Nếu không có, thử load từ student-list endpoint
        console.log('Public endpoint returned empty for getDeckTerms, trying student-list');
        return this.vocabularyService.getVocabularies(listId).pipe(
          map(vocabularies => 
            vocabularies.map(vocab => ({
              id: vocab.id,
              question: vocab.word,
              answer: vocab.definition,
              options: vocab.example ? [vocab.example] : undefined
            }))
          ),
          catchError(fallbackError => {
            console.error('Error loading terms from student-list:', fallbackError);
            return of([]);
          })
        );
      }),
      catchError(error => {
        // Nếu public endpoint lỗi, thử fallback sang student-list
        console.log('Public endpoint failed for getDeckTerms, trying student-list');
        return this.vocabularyService.getVocabularies(listId).pipe(
          map(vocabularies => 
            vocabularies.map(vocab => ({
              id: vocab.id,
              question: vocab.word,
              answer: vocab.definition,
              options: vocab.example ? [vocab.example] : undefined
            }))
          ),
          catchError(fallbackError => {
            console.error('Error loading terms:', fallbackError);
            return of([]);
          })
        );
      })
    );
  }
}