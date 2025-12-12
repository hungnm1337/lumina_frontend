import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError, tap, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { VocabularyService } from '../Vocabulary/vocabulary.service';


export interface Term {
  id: number;
  question: string;
  answer: string;
  options?: string[]; 
  audioUrl?: string; 
  imageUrl?: string; 
  imageError?: boolean; 

}


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

  getDecks(): Observable<Deck[]> {
    return this.vocabularyService.getMyAndStaffVocabularyLists().pipe(
      map(vocabularyLists => 
        vocabularyLists.map(list => ({
          id: list.vocabularyListId.toString(),
          title: list.name,
          author: list.makeByName,
          termCount: list.vocabularyCount,
          terms: [] 
        }))
      )
    );
  }

  getDeckById(id: string): Observable<Deck | undefined> {
    const listId = parseInt(id);
    if (isNaN(listId)) {
      console.warn('Invalid deck ID:', id);
      return of(undefined);
    }

    console.log('Loading deck with ID:', listId);
    return this.vocabularyService.getPublicVocabularyByList(listId).pipe(
      tap(vocabularies => {
        console.log('Public vocabulary response:', vocabularies);
      }),
      map(vocabularies => {
        if (vocabularies && vocabularies.length > 0) {
          return this.createDeckFromVocabularies(id, vocabularies);
        }
        return null;
      }),
      switchMap(deck => {
        if (deck) {
          return of(deck);
        }
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

  private createDeckFromVocabularies(id: string, vocabularies: any[]): Deck {
    return {
      id: id,
      title: 'Loading...',
      author: 'Loading...',
      termCount: vocabularies.length,
      terms: vocabularies.map(vocab => ({
        id: vocab.id,
        question: vocab.word || '',
        answer: vocab.definition || '',
        options: vocab.example ? [vocab.example] : undefined,
        audioUrl: vocab.audioUrl || undefined,
        imageUrl: vocab.imageUrl || undefined 
      }))
    };
  }

  getDeckTerms(deckId: string): Observable<Term[]> {
    const listId = parseInt(deckId);
    if (isNaN(listId)) {
      return of([]);
    }

    return this.vocabularyService.getPublicVocabularyByList(listId).pipe(
      map(vocabularies => {
        if (vocabularies && vocabularies.length > 0) {
          return vocabularies.map(vocab => ({
            id: vocab.id,
            question: vocab.word,
            answer: vocab.definition,
            options: vocab.example ? [vocab.example] : undefined,
            imageUrl: vocab.imageUrl || undefined // Lấy imageUrl từ API response
          }));
        }
        return null;
      }),
      switchMap(terms => {
        if (terms) {
          return of(terms);
        }
        console.log('Public endpoint returned empty for getDeckTerms, trying student-list');
        return this.vocabularyService.getVocabularies(listId).pipe(
          map(vocabularies => 
            vocabularies.map(vocab => ({
              id: vocab.id,
              question: vocab.word,
              answer: vocab.definition,
              options: vocab.example ? [vocab.example] : undefined,
              imageUrl: vocab.imageUrl || undefined 
            }))
          ),
          catchError(fallbackError => {
            console.error('Error loading terms from student-list:', fallbackError);
            return of([]);
          })
        );
      }),
      catchError(error => {
        console.log('Public endpoint failed for getDeckTerms, trying student-list');
        return this.vocabularyService.getVocabularies(listId).pipe(
          map(vocabularies => 
            vocabularies.map(vocab => ({
              id: vocab.id,
              question: vocab.word,
              answer: vocab.definition,
              options: vocab.example ? [vocab.example] : undefined,
              imageUrl: vocab.imageUrl || undefined 
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